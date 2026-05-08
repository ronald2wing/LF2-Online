// P2P lockstep networking for LF2 Online.
//
// Transport:   public/network.js (WebRTC, loaded dynamically)
// Signaling:   ActionCable GameChannel
// Data:        WebRTC DataChannel (direct P2P)
//
// Provides lockstep input sync with state digest verification across two peers.

// ── Connection ────────────────────────────────────────────────────────────

const link = {
  open: false,
  time: 0,
  interval: 0,
  lastTick: Date.now(),
  buffer: [],            // incoming frame queue
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
  digest: null,          // current frame's state digest
  prevDigest: null,      // previous frame's digest (compared with peer)
  error: false,          // suppress duplicate desync reports
}

let outgoing = { control: [] }

function startClock(callback, interval) {
  sync.digest = null
  sync.prevDigest = null
  sync.error = false
  outgoing = { control: [] }
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

function onTick() {
  if (!tickFn) return

  if (link.buffer.length > 0) {
    const now = Date.now()
    if (now - link.lastTick > link.interval - 5) {
      const entry = link.buffer[0]
      if (entry.time !== link.time) handler.on("sync_error")
      link.time++
      tickFn(entry.time, entry.data, channels.frame.send)
      link.lastTick = now
      link.buffer.shift()
    }
  } else if (!link.open) {
    // Local mode: no peer connected, run with no-op send
    tickFn(0, null, noop)
    link.lastTick = Date.now()
  }
}

function noop() {}

// Called each frame. Applies remote input, collects local input, sends packet,
// verifies state digests, and advances the game.
function onFrame(time, data, send) {
  if (data && data.control) {
    for (let i = 0; i < remoteInputs.length; i++) {
      remoteInputs[i].applyRemote(data.control[i])
    }
  }

  for (let i = 0; i < localInputs.length; i++) {
    outgoing.control[i] = localInputs[i].collectLocal()
  }

  outgoing.verify = sync.digest
  send(outgoing)
  verifyDigests(sync.prevDigest, data && data.verify)
  sync.prevDigest = sync.digest
  sync.digest = digestFn ? digestFn() : undefined

  for (let i = 0; i < localInputs.length; i++) {
    localInputs[i].swapLocal()
  }

  if (outgoing) outgoing.control.length = 0
}

function verifyDigests(a, b) {
  if (a == null || b == null) return
  for (const key in a) {
    if (!deepEqual(a[key], b[key])) {
      if (!sync.error) {
        handler.on("sync_error")
        console.log("desync:", a, b)
        sync.error = true
      }
    }
  }
}

function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a === "object") {
    for (const k in a) if (a[k] !== b[k]) return false
    return true
  }
  return a === b
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
    send(data) {
      if (peer) peer.send({ f: { t: link.time, d: data } })
    },
    receive(packet) {
      link.buffer.push({ time: packet.t, data: packet.d })
      onTick()
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
// lockstep sync and dual-role (local + remote) operation.

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
      for (const k in control.state) this.state[k] = 0
    }

    if (role === "remote" || role === "dual") {
      remoteInputs.push(this)
      if (role === "remote") {
        for (const k in control) this.state[k] = 0
      }
    }
  }

  wrap(control) {
    this.control = control
    this.type = control.type
    this.config = control.config
    this.keycode = control.keycode

    const skip = { clear_states: 1, flush: 1, pre_fetch: 1, swap_buffer: 1, supply: 1, fetch: 1, key: 1 }

    for (const key in control) {
      if (typeof control[key] === "function" && !skip[key]) {
        this[key] = (function (k) {
          return function () { control[k].apply(control, arguments) }
        })(key)
      }
    }
  }

  clearStates() {}
  flush() {}

  collectLocal() {
    if (this.role === "local" || this.role === "dual") {
      this.control.fetch()
      return this.preBuf
    }
  }

  swapLocal() {
    if (this.role === "local" || this.role === "dual") {
      const hold = this.preBuf
      this.preBuf = this.buf
      this.buf = hold
      this.preBuf.length = 0
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
          channels.frame.send({})
          handler.on("open")
          break
        case "close":
          link.open = false
          peer = null
          handler.on("close")
          break
        case "data":
          for (const ch in channels) {
            const prefix = ch.charAt(0)
            if (data[prefix]) channels[ch].receive(data[prefix])
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

  const transportUrl = normalizeURL(config.server.address) + config.server.library
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
  link.lastTick = Date.now()
  link.buffer = []
  link.transfers = {}
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

export default {
  setup,
  teardown,
  controller: InputProxy,
  startSync,
  stopSync,
  transfer,
}
