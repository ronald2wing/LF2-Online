import { compareDigests } from "engine/network-digest"
import { computeInputDelay } from "engine/network-timing"

// P2P lockstep networking for LF2 Online.
//
// Transport:   public/network.js (WebRTC, loaded dynamically)
// Signaling:   ActionCable GameChannel
// Data:        WebRTC DataChannel (direct P2P)
//
// Provides delay-based lockstep input sync with state digest verification
// across two peers. Both peers run a free-running 30fps clock; each player's
// input is delayed by a measured number of frames so the simulation can run
// ahead of the network instead of stalling on every round trip.

// ── Connection ────────────────────────────────────────────────────────────

const link = {
  open: false,
  time: 0,
  interval: 0,
  transfers: {},         // pending one-shot transfers
}

let peer = null          // transport connection object
let handler = null       // { on(event, data) }

// ── Game clock ────────────────────────────────────────────────────────────

let clockId = null       // browser setInterval handle
let tickFn = null        // (time, data, send) => void  — called each tick
let digestFn = null      // () => stateDigest — advances game, returns digest

// ── Lockstep sync ─────────────────────────────────────────────────────────

const localInputs = []   // InputProxy instances sending local input
const remoteInputs = []  // InputProxy instances receiving remote input

const sync = {
  role: null,            // "active" (host) | "passive" (joiner) | null (local)
  inputDelay: 2,         // base delay in frames; host applies 1x, joiner 2x
  error: false,          // suppress duplicate desync reports
  halted: false,         // freeze the match after a desync
  lastRttPoll: 0,        // Date.now() of the last RTT poll
}

// Frame-indexed buffers, pruned to a bounded window each tick.
const remoteBuffer = {}  // frame -> control[] (peer input keyed by apply-frame)
const localHistory = {}  // frame -> control[] (local input captured that frame)
const digestHistory = {} // frame -> digest   (local digest after that frame)
const peerDigests = {}   // frame -> digest   (peer digest awaiting our history)

// How often to re-measure the link RTT.
const RTT_POLL_MS = 500

// How many consecutive ticks we wait for a missing peer frame before declaring
// a pacing failure and halting the match. Sized as a small multiple of the
// history window (2·inputDelay + 4, at most 16 frames) so a genuinely late
// packet — which the input delay exists to absorb — has time to arrive, while
// a silent or stalled peer is caught within roughly a second at 30 fps.
const STALL_TICKS = 32

// First apply-frame the peer will ever send. Its stream starts at its own
// input delay, so frames below this floor have genuinely empty remote input
// and must not stall the loop. Unknown (null) until the first frame packet.
let remoteFloor = null

// Consecutive ticks the loop has spent waiting for a missing peer frame.
let stallTicks = 0

function startClock(callback, interval) {
  sync.error = false
  sync.halted = false
  sync.inputDelay = computeInputDelay(null, interval)
  sync.lastRttPoll = 0
  clearHistories()
  stallTicks = 0
  tickFn = callback
  clockId = setInterval(onTick, link.interval = interval)
  return clockId
}

function stopClock(id) {
  if (!clockId || clockId !== id) {
    console.error("wrong timer id " + id)
    return
  }
  clearInterval(clockId)
  clockId = null
  tickFn = null
  digestFn = null
}

// The number of frames we hold local input before applying it.
function effectiveDelay() {
  return sync.role === "passive" ? 2 * sync.inputDelay : sync.inputDelay
}

// Bound for every frame-indexed history. Covers the joiner's 2x delay plus
// room for clock skew and a digest in flight.
function historyWindow() {
  return 2 * sync.inputDelay + 4
}

function clearHistories() {
  for (const key in remoteBuffer) delete remoteBuffer[key]
  for (const key in localHistory) delete localHistory[key]
  for (const key in digestHistory) delete digestHistory[key]
  for (const key in peerDigests) delete peerDigests[key]
  remoteFloor = null
}

function pruneHistories(time) {
  const cutoff = time - historyWindow()
  for (const key in localHistory) if (Number(key) < cutoff) delete localHistory[key]
  for (const key in digestHistory) if (Number(key) < cutoff) delete digestHistory[key]
  for (const key in peerDigests) if (Number(key) < cutoff) delete peerDigests[key]
  for (const key in remoteBuffer) if (Number(key) < cutoff) delete remoteBuffer[key]
}

// Re-measures the link RTT and recomputes the input delay. Runs fire-and-
// forget; when the stats report is unavailable the previous delay is kept.
function pollRtt() {
  if (!peer || typeof peer.getRtt !== "function") return
  const now = Date.now()
  if (now - sync.lastRttPoll < RTT_POLL_MS) return
  sync.lastRttPoll = now
  Promise.resolve(peer.getRtt()).then(function (rtt) {
    if (rtt == null) return
    sync.inputDelay = computeInputDelay(rtt, link.interval)
  }).catch(function () {
    // Ignore — keep the current delay on a failed stats read.
  })
}

function onTick() {
  if (sync.halted) return
  if (!tickFn) return

  if (!link.open) {
    // Local mode: no peer connected, run with no-op send.
    tickFn(0, null, noop)
    return
  }

  // Networked lockstep: a frame may only advance once the peer's input for it
  // has arrived. Frames below the peer's first apply-frame (its own delay) have
  // genuinely empty remote input and run immediately; at or past that floor we
  // wait for the packet rather than guessing with empty input, which would
  // diverge the two sims and trip the digest check on the next frame.
  pollRtt()
  const frame = link.time
  const remote = remoteBuffer[frame]

  if (remote === undefined) {
    if (remoteFloor === null || frame < remoteFloor) {
      // Warm-up: the peer has not started sending yet (or never sends this
      // frame) — advance with empty input.
      advanceFrame(frame, null)
      return
    }

    // The peer has sent this frame but it has not arrived. Wait for it: do not
    // advance and do not run the digest. Bounded by STALL_TICKS below.
    stallTicks++
    if (stallTicks >= STALL_TICKS) {
      console.error("sync stall: no peer input for frame " + frame + " after " + stallTicks + " ticks")
      sync.error = true
      sync.halted = true
      handler.on("sync_error", { object: "pacing", field: "stall", mine: stallTicks, theirs: null })
    }
    return
  }

  advanceFrame(frame, remote)
}

function advanceFrame(frame, remote) {
  delete remoteBuffer[frame]
  link.time++
  stallTicks = 0
  tickFn(frame, remote, channels.frame.send)
}

function noop() {}

// Called each frame. Applies this frame's inputs (peer + our own delayed
// input), captures and sends our own input, verifies state digests, and
// advances the game.
function onFrame(time, data, send) {
  if (!link.open) {
    // Local mode runs a bare frame loop: no input exchange, no digests.
    if (digestFn) digestFn()
    return
  }

  const delay = effectiveDelay()

  // Apply the peer's input for this frame.
  if (data) {
    for (let i = 0; i < remoteInputs.length; i++) {
      remoteInputs[i].applyRemote(data[i])
    }
  }

  // Apply our own input captured `delay` frames ago. Holding it back lets the
  // sim run ahead without waiting for the peer.
  const held = localHistory[time - delay]
  for (let i = 0; i < localInputs.length; i++) {
    localInputs[i].applyLocal(held ? held[i] : null)
  }

  // Capture this frame's local input and remember it for future frames.
  const control = new Array(localInputs.length)
  for (let i = 0; i < localInputs.length; i++) {
    control[i] = localInputs[i].collectLocal()
  }
  localHistory[time] = control

  // Send this frame's input tagged with the frame it will be applied at,
  // plus the digest of the previous frame for verification.
  send({
    time: time + delay,
    control: control,
    verify: digestHistory[time - 1] ?? null,
    verifyTime: time - 1,
  })

  // digestFn advances the game and returns the digest; it must run every
  // frame. Store the digest keyed by frame and check any peer digest that is
  // now verifiable.
  const state = digestFn ? digestFn() : undefined
  const digest = link.open ? state : undefined
  if (digest !== undefined) {
    digestHistory[time] = digest
    verifyPeerDigest(time)
  }

  pruneHistories(time)
}

// Compares our digest for `frame` against the peer's, once both are present.
function verifyPeerDigest(frame) {
  const local = digestHistory[frame]
  const remote = peerDigests[frame]
  if (local == null || remote == null) return
  delete peerDigests[frame]
  const mismatch = compareDigests(local, remote)
  if (mismatch) {
    console.error("desync:", mismatch, { local, remote })
    sync.error = true
    sync.halted = true
    handler.on("sync_error", mismatch)
  }
}

// Handles an incoming frame packet from the peer.
function onRemoteFrame(packet) {
  // Buffer the peer's input keyed by the frame it was produced for.
  remoteBuffer[packet.time] = packet.control

  // Track the peer stream's first apply-frame so the tick loop can tell "never
  // sent" (warm-up, advance empty) apart from "sent but not yet arrived"
  // (wait).
  if (remoteFloor === null || packet.time < remoteFloor) remoteFloor = packet.time

  // Remember the peer's digest and compare once our history reaches it.
  if (packet.verify != null && packet.verifyTime != null) {
    peerDigests[packet.verifyTime] = packet.verify
    verifyPeerDigest(packet.verifyTime)
  }

  checkPacing(packet.time)
}

// A frame far outside the delay window means the peers' clocks have diverged
// (pacing error) rather than a merely late packet, which the tick loop now
// absorbs by waiting.
function checkPacing(frame) {
  const window = historyWindow()
  if (frame < link.time - window || frame > link.time + window) {
    console.error("pacing error: peer frame " + frame + " vs local frame " + link.time)
    sync.error = true
    sync.halted = true
    handler.on("sync_error", { object: "frame", field: "t", mine: link.time, theirs: frame })
  }
}

// ── Channel routing ───────────────────────────────────────────────────────

// Builds a send function that wraps data with a channel prefix key.
function makeSender(prefix) {
  const key = prefix.charAt(0)
  return function (data) {
    if (peer) peer.send({ [key]: data })
  }
}

const channels = {
  frame: {
    send(packet) {
      if (peer) peer.send({ f: packet })
    },
    receive(packet) {
      onRemoteFrame(packet)
    },
  },
  transfer: {
    send: makeSender("t"),
    receive(packet) {
      const { name, data } = packet
      const receiver = link.transfers[name]
      if (!receiver) {
        console.error("no receiver for transfer: " + name)
        return
      }
      receiver(data)
      delete link.transfers[name]
    },
  },
}

// ── InputProxy ────────────────────────────────────────────────────────────
// Wraps a keyboard/touch controller for network play. Buffers inputs for
// delay-based lockstep sync and dual-role (local + remote) operation.

class InputProxy {
  constructor(role, control) {
    this.state = {}
    this.child = []
    this.buf = []
    this.preBuf = []
    this.sync = true
    this.role = role

    if (role === "local" || role === "dual") {
      localInputs.push(this)
      this.wrap(control)
      control.child.push(this)
      control.sync = true
      for (const key in control.state) this.state[key] = 0
    }

    if (role === "remote" || role === "dual") {
      remoteInputs.push(this)
      if (role === "remote") {
        for (const key in control) this.state[key] = 0
      }
    }
  }

  wrap(control) {
    this.control = control
    this.type = control.type
    this.config = control.config
    this.keycode = control.keycode

    const skip = { clear_states: 1, flush: 1, fetch: 1, key: 1 }

    for (const key in control) {
      if (typeof control[key] === "function" && !skip[key]) {
        this[key] = (function (methodName) {
          return function () { control[methodName].apply(control, arguments) }
        })(key)
      }
    }
  }

  collectLocal() {
    if (this.role === "local" || this.role === "dual") {
      this.control.fetch()
      const out = this.preBuf
      this.preBuf = []
      return out
    }
  }

  applyLocal(buf) {
    if ((this.role === "local" || this.role === "dual") && buf && buf.length) {
      this.buf = this.buf.concat(buf)
    }
  }

  applyRemote(buf) {
    if ((this.role === "remote" || this.role === "dual") && buf && buf.length) {
      this.buf = this.buf.concat(buf)
    }
  }

  fetch() {
    for (const [key, down] of this.buf) {
      for (const child of this.child) child.key(key, down)
      this.state[key] = down
    }
    this.buf.length = 0
  }

  key(key, down) {
    this.preBuf.push([key, down])
  }
}

// ── Public API ────────────────────────────────────────────────────────────

function setup(config, appHandler) {
  if (link.open) {
    console.error("already connected")
    return
  }

  handler = appHandler
  sync.role = config.param && config.param.role ? config.param.role : null

  const transportConfig = {
    server: { address: config.server.address },
    param: config.param,
  }

  const transportHandler = {
    on(event, data) {
      switch (event) {
        case "open":
          peer = data
          link.open = true
          handler.on("open")
          break
        case "close":
          link.open = false
          peer = null
          handler.on("close")
          break
        case "data":
          for (const channel in channels) {
            const prefix = channel.charAt(0)
            if (data[prefix]) channels[channel].receive(data[prefix])
          }
          break
        case "error":
          handler.on("error", data)
          break
        case "log":
          handler.on("log", data)
          break
      }
    },
  }

  const transportUrl = normalizeURL(config.server.address) + (config.server.library || "network.js")
  const script = document.createElement("script")
  script.src = transportUrl
  script.onload = function () {
    const transport = window.LF2OnlineTransport
    if (!transport) {
      handler.on("error", "Transport failed to load")
      return
    }
    transport.setup(transportConfig, transportHandler)
  }
  script.onerror = function () {
    handler.on("error", "Transport script failed to load")
  }
  document.head.appendChild(script)
}

function teardown() {
  if (clockId) stopClock(clockId)
  if (link.open) {
    const transport = window.LF2OnlineTransport
    if (transport) transport.teardown()
  }
  link.open = false
  peer = null
  link.time = 0
  link.transfers = {}
  sync.role = null
  sync.inputDelay = 2
  sync.error = false
  sync.halted = false
  clearHistories()
  localInputs.length = 0
  remoteInputs.length = 0
}

function transfer(name, sendFn, receiveFn) {
  if (link.transfers[name]) {
    console.error("transfer name in use: " + name)
    return
  }
  link.transfers[name] = receiveFn
  channels.transfer.send({ name, data: sendFn() })
}

function normalizeURL(url) {
  // A bare host (e.g. "lf2.net") would resolve as a relative path on this
  // origin; prefix https so it becomes an absolute URL. Already-schemed
  // values (http/https/ws/wss) are left untouched.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
    url = 'https://' + url
  }
  return url.endsWith("/") ? url : url + "/"
}

function startSync(digestCallback, interval) {
  if (clockId) {
    console.error("only one timer active")
    return
  }
  digestFn = digestCallback
  clockId = startClock(onFrame, interval)
  return clockId
}

function stopSync(timer) {
  if (!clockId || clockId !== timer) {
    console.error("wrong timer id " + timer)
    return
  }
  stopClock(timer)
  clockId = null
}

// True while a peer transport is connected. The match uses this to skip
// building the state digest in offline (local) play, where nothing consumes it.
function isConnected() {
  return link.open
}

export default {
  setup,
  teardown,
  controller: InputProxy,
  startSync,
  stopSync,
  transfer,
  isConnected,
}
