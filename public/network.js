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
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }]

  let pc, dc, ws, config, monitor, connected = false

  function setup(cfg, mon) {
    if (connected) return
    config = cfg
    monitor = mon

    const wsUrl = config.server.address.replace(/^http/, "ws") + "/cable"
    const room = "LF2 Online"
    const myId = config.param.role === "active" ? config.param.id1 : config.param.id2
    const peerId = config.param.role === "active" ? config.param.id2 : config.param.id1

    ws = new WebSocket(wsUrl)

    ws.onopen = function () {
      ws.send(JSON.stringify({
        command: "subscribe",
        identifier: JSON.stringify({ channel: "GameChannel", room, client_id: myId })
      }))
      monitor.on("log", "Signaling connected")
    }

    ws.onmessage = function (event) {
      const msg = JSON.parse(event.data)
      if (!msg.message) return
      const data = msg.message

      switch (data.type) {
        case "confirm_subscription":
          // Subscribed — now set up WebRTC
          createPeerConnection()
          if (config.param.role === "active") createOffer()
          break

        case "offer":
          if (config.param.role === "passive") handleOffer(data)
          break

        case "answer":
          if (config.param.role === "active") handleAnswer(data)
          break

        case "ice-candidate":
          handleIceCandidate(data)
          break
      }
    }

    ws.onclose = function () { if (connected) { connected = false; monitor.on("close") } }
    ws.onerror = function () { monitor.on("error", "Signaling error") }
  }

  function createPeerConnection() {
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

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

  function createOffer() {
    dc = pc.createDataChannel("game", { ordered: false, maxRetransmits: 0 })
    setupDataChannel()

    pc.createOffer()
      .then(function (offer) { return pc.setLocalDescription(offer) })
      .then(function () { sendSignal("offer", { sdp: pc.localDescription }) })
      .catch(function (err) { monitor.on("error", "Offer failed: " + err) })
  }

  function handleOffer(data) {
    createPeerConnection()
    pc.ondatachannel = function (event) {
      dc = event.channel
      setupDataChannel()
    }

    pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .then(function () { return pc.createAnswer() })
      .then(function (answer) { return pc.setLocalDescription(answer) })
      .then(function () { sendSignal("answer", { sdp: pc.localDescription }) })
      .catch(function (err) { monitor.on("error", "Answer failed: " + err) })
  }

  function handleAnswer(data) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .catch(function (err) { monitor.on("error", "Remote description failed: " + err) })
  }

  function handleIceCandidate(data) {
    if (!data.candidate) return
    pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      .catch(function (err) { monitor.on("error", "ICE candidate failed: " + err) })
  }

  function setupDataChannel() {
    dc.onopen = function () {
      connected = true
      const conn = {
        send: function (data) {
          if (dc.readyState === "open") dc.send(JSON.stringify(data))
        }
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
      identifier: JSON.stringify({
        channel: "GameChannel",
        room: "LF2 Online",
        client_id: myId
      }),
      data: JSON.stringify({
        type: type,
        to: peerId,
        from: myId,
        ...payload
      })
    }))
  }

  function teardown() {
    if (dc) { dc.close(); dc = null }
    if (pc) { pc.close(); pc = null }
    if (ws) { ws.close(); ws = null }
    connected = false
  }

  window.LF2OnlineTransport = { setup, teardown }
})()
