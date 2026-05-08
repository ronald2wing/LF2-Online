// WebRTC P2P transport with ActionCable signaling.
// Served at /network.js, loaded dynamically by core/network.js.
//
// Transport contract:
//   setup(config, monitor)  — establish WebRTC data channel
//   teardown()              — close connection
//
// config: { server: { address }, param: { role: "active"|"passive", id1, id2 } }
// monitor: { on(event, data) }  — events: open, close, error, log

(function () {
  const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }]

  let pc, dc, ws, config, monitor, connected = false
  let iceServersPromise = null
  let offerSent = false
  let offerReceived = false
  let offerRequestTimer = null

  function setup(cfg, mon) {
    if (connected) return
    config = cfg
    monitor = mon

    // Resolve ICE servers once per setup (STUN always; TURN when the server
    // advertises one via /protocol). Any failure falls back to STUN so the
    // network game never fails to start because of this fetch.
    iceServersPromise = resolveIceServers()

    const wsUrl = config.server.address.replace(/^http/, "ws") + "/cable"
    const room = "LF2 Online"
    const myId = config.param.role === "active" ? config.param.id1 : config.param.id2
    // ActionCable routes a client message by the exact identifier string it
    // subscribed with (Subscriptions#find is a plain hash lookup), so this is
    // built once and reused verbatim for the subscribe and every signal.
    const identifier = JSON.stringify({
      channel: "GameChannel",
      room,
      client_id: myId,
      // The transport takes over the client_id the lobby just released, so it
      // must announce that the player is now in a match: the room's roster
      // reads this state and stops offering them as challengeable.
      state: "playing"
    })

    ws = new WebSocket(wsUrl)

    ws.onopen = function () {
      ws.send(JSON.stringify({ command: "subscribe", identifier: identifier }))
      monitor.on("log", "Signaling connected")
    }

    ws.onmessage = function (event) {
      const msg = JSON.parse(event.data)

      // ActionCable sends "confirm_subscription" at the top level (no `message`
      // field); relayed signaling payloads (offer/answer/ice-candidate) arrive
      // nested under `message`. Handle the confirmation here so the WebRTC
      // setup actually starts.
      if (msg.type === "confirm_subscription") {
        // The passive peer signals readiness (offer-request) the moment its
        // transport is subscribed. The active peer holds its offer until that
        // signal arrives: an offer sent any earlier would be relayed to the
        // peer's client_id while the lobby iframe WebSocket still held that
        // slot (the transport only overwrites it on subscribe), so the lobby
        // would receive the offer and drop it. The passive peer still creates
        // its peer connection in handleOffer — creating one here would produce
        // a second, orphaned RTCPeerConnection that early ICE candidates would
        // be added to (the wrong one).
        if (config.param.role === "passive") {
          signalReady()
        }
        return
      }

      if (!msg.message) return
      const data = msg.message

      switch (data.type) {
        case "offer":
          if (config.param.role === "passive") handleOffer(data)
          break

        case "answer":
          if (config.param.role === "active") handleAnswer(data)
          break

        case "offer-request":
          if (config.param.role === "active") handleOfferRequest()
          break

        case "ice-candidate":
          handleIceCandidate(data)
          break
      }
    }

    ws.onclose = function () { if (connected) { connected = false; monitor.on("close") } }
    ws.onerror = function () { monitor.on("error", "Signaling error") }
  }

  async function resolveIceServers() {
    if (!config.server || !config.server.address) return STUN_SERVERS

    const controller = new AbortController()
    const timeout = setTimeout(function () { controller.abort() }, 3000)

    try {
      const response = await fetch(config.server.address + "/protocol", { signal: controller.signal })
      if (!response.ok) throw new Error("protocol returned " + response.status)
      const data = await response.json()
      if (!data || !Array.isArray(data.ice_servers)) throw new Error("protocol missing ice_servers")
      return data.ice_servers
    } catch (err) {
      return STUN_SERVERS
    } finally {
      clearTimeout(timeout)
    }
  }

  async function createPeerConnection() {
    const iceServers = iceServersPromise ? await iceServersPromise : STUN_SERVERS
    pc = new RTCPeerConnection({ iceServers: iceServers })

    pc.onicecandidate = function (event) {
      if (!event.candidate) return
      sendSignal("ice-candidate", { candidate: event.candidate })
    }

    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        if (connected) { connected = false; monitor.on("close") }
      }
    }
  }

  // The active peer answers the passive peer's readiness signal. Idempotent:
  // the passive may retry offer-request, but the offer is created only once.
  function handleOfferRequest() {
    if (offerSent) return
    offerSent = true
    createPeerConnection()
      .then(function () { createOffer() })
  }

  function createOffer() {
    dc = pc.createDataChannel("game", { ordered: true })
    setupDataChannel()

    pc.createOffer()
      .then(function (offer) { return pc.setLocalDescription(offer) })
      .then(function () { sendSignal("offer", { sdp: pc.localDescription }) })
      .catch(function (err) { monitor.on("error", "Offer failed: " + err) })
  }

  function handleOffer(data) {
    offerReceived = true
    if (offerRequestTimer) {
      clearInterval(offerRequestTimer)
      offerRequestTimer = null
    }
    createPeerConnection()
      .then(function () {
        pc.ondatachannel = function (event) {
          dc = event.channel
          setupDataChannel()
        }

        return pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          .then(function () { return pc.createAnswer() })
          .then(function (answer) { return pc.setLocalDescription(answer) })
          .then(function () { sendSignal("answer", { sdp: pc.localDescription }) })
          .catch(function (err) { monitor.on("error", "Answer failed: " + err) })
      })
  }

  function handleAnswer(data) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .catch(function (err) { monitor.on("error", "Remote description failed: " + err) })
  }

  function handleIceCandidate(data) {
    if (!data.candidate) return
    // The peer connection is created asynchronously (after the ICE config
    // resolves); drop candidates that arrive before it exists. ICE keeps
    // gathering, so later candidates are added normally.
    if (!pc) return
    pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      .catch(function (err) { monitor.on("error", "ICE candidate failed: " + err) })
  }

  function setupDataChannel() {
    dc.onopen = function () {
      connected = true
      const conn = {
        send: function (data) {
          if (dc.readyState === "open") dc.send(JSON.stringify(data))
        },
        getRtt: getRtt
      }
      monitor.on("open", conn)
    }

    dc.onclose = function () {
      if (connected) { connected = false; monitor.on("close") }
    }

    dc.onmessage = function (event) {
      try {
        monitor.on("data", JSON.parse(event.data))
      } catch (e) {
        monitor.on("error", "Failed to parse game data")
      }
    }
  }

  function sendSignal(type, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const peerId = config.param.role === "active" ? config.param.id2 : config.param.id1
    const myId = config.param.role === "active" ? config.param.id1 : config.param.id2

    ws.send(JSON.stringify({
      command: "message",
      identifier: identifier,
      data: JSON.stringify({
        type: type,
        to: peerId,
        from: myId,
        ...payload
      })
    }))
  }

  // Signals the active peer that this (passive) transport is subscribed and
  // ready to receive its offer. Retried briefly in case the active transport
  // subscribed after us and our first request was dropped (relayed to the
  // still-open lobby iframe). Bounded so a vanished peer is not polled forever.
  function signalReady() {
    sendSignal("offer-request", {})
    if (offerRequestTimer) return
    let attempts = 0
    offerRequestTimer = setInterval(function () {
      attempts++
      const done = offerReceived || connected || !ws || ws.readyState !== WebSocket.OPEN
      if (done || attempts > 30) {
        clearInterval(offerRequestTimer)
        offerRequestTimer = null
        return
      }
      sendSignal("offer-request", {})
    }, 500)
  }

  function teardown() {
    if (offerRequestTimer) {
      clearInterval(offerRequestTimer)
      offerRequestTimer = null
    }
    offerSent = false
    offerReceived = false
    if (dc) { dc.close(); dc = null }
    if (pc) { pc.close(); pc = null }
    if (ws) { ws.close(); ws = null }
    connected = false
  }

  // Measures the current round-trip time in milliseconds via WebRTC stats.
  // Returns null when no succeeded candidate-pair (or no pc) is available.
  async function getRtt() {
    if (!pc || typeof pc.getStats !== "function") return null
    try {
      const stats = await pc.getStats()
      let candidate = null
      stats.forEach(function (report) {
        if (report.type !== "candidate-pair" || report.state !== "succeeded") return
        // Prefer the nominated pair; otherwise take the first succeeded pair.
        if (!candidate || (report.nominated === true && candidate.nominated !== true)) {
          candidate = report
        }
      })
      if (candidate && typeof candidate.currentRoundTripTime === "number") {
        return candidate.currentRoundTripTime * 1000
      }
      return null
    } catch (e) {
      return null
    }
  }

  window.LF2OnlineTransport = { setup, teardown }
})()
