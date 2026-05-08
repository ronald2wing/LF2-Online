# WebRTC signaling channel for LF2 Online P2P matchmaking.
# Handles presence, matchmaking, and WebRTC signaling relay between peers.
class GameChannel < ApplicationCable::Channel
  # Per-subscription signaling budget (token bucket). WebRTC signaling is
  # bursty but small: one offer + one answer, a handful of ICE candidates, and
  # a passive peer retrying offer-request at ~2/s. 20 msg/s with a 40-message
  # burst is far above real traffic yet caps a flood.
  MESSAGE_RATE = 20.0
  MESSAGE_BURST = 40

  # WebRTC SDP offers/answers are typically 2-8 KB; ICE candidates are a few
  # hundred bytes. 64 KB is ~8x headroom over a large SDP while bounding the
  # bytes a client can push through relay or broadcast.
  MAX_MESSAGE_BYTES = 64 * 1024

  @rooms = {}
  @rooms_mutex = Mutex.new

  class << self
    attr_reader :rooms

    def rooms_synchronize(&block)
      @rooms_mutex.synchronize(&block)
    end
  end

  def subscribed
    room = params[:room] || "LF2 Online"
    @client_id = params[:client_id] || SecureRandom.hex(4)
    @room = room

    self.class.rooms_synchronize do
      self.class.rooms[room] ||= {}
      self.class.rooms[room][@client_id] = self
    end

    broadcast_peers
    stream_from "game_#{room}"
  end

  def unsubscribed
    self.class.rooms_synchronize do
      if self.class.rooms[@room]
        # The lobby iframe and the WebRTC transport subscribe under the same
        # client_id. When the lobby's connection closes after game_start it
        # must not evict the transport's slot, so only remove the entry if it
        # still maps to this subscriber.
        self.class.rooms[@room].delete(@client_id) if self.class.rooms[@room][@client_id].equal?(self)
        self.class.rooms.delete(@room) if self.class.rooms[@room].empty?
      end
    end
    broadcast_peers
  end

  def receive(payload)
    return unless payload.is_a?(Hash)
    return if message_too_large?(payload)
    return unless allow_message?

    type      = payload["type"]
    target_id = payload["to"]

    case type
    when "presence"
      transmit_peer_list
    when "challenge", "accept", "decline", "cancel"
      relay(type, target_id, payload.slice("from", "role", "peer"))
    when "offer", "answer", "ice-candidate", "offer-request"
      relay_signal(type, target_id, payload)
    when "start_game"
      broadcast_game_start(payload)
    end
  end

  private

  def broadcast_peers
    peers = self.class.rooms[@room]&.keys || []
    ActionCable.server.broadcast("game_#{@room}", {
      type: "peers",
      peers: peers
    })
  end

  # `presence` is a request for the current peer list: reply to the requesting
  # subscriber only. Broadcasting it room-wide would let one client amplify a
  # single message across every connected lobby. Join/leave changes are already
  # announced from subscribed/unsubscribed, so other clients still learn about
  # membership without a client-triggerable broadcast.
  def transmit_peer_list
    peers = self.class.rooms[@room]&.keys || []
    transmit({ type: "peers", peers: peers })
  end

  def message_too_large?(payload)
    JSON.generate(payload).bytesize > MAX_MESSAGE_BYTES
  rescue JSON::GeneratorError
    true
  end

  # Token bucket rate limiter, refilled continuously and capped at the burst
  # size. Drops (returns false) rather than raising once the budget is spent.
  def allow_message?
    now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    @last_refill ||= now
    @tokens ||= MESSAGE_BURST
    @tokens = [ MESSAGE_BURST, @tokens + (now - @last_refill) * MESSAGE_RATE ].min
    @last_refill = now

    return false if @tokens < 1.0
    @tokens -= 1.0
    true
  end

  def relay(type, target_id, data)
    return unless target_id

    self.class.rooms_synchronize do
      peer = self.class.rooms.dig(@room, target_id)
      transmit_to_peer(peer, { type: type, **data, from: @client_id })
    end
  end

  def relay_signal(type, target_id, payload)
    return unless target_id

    self.class.rooms_synchronize do
      peer = self.class.rooms.dig(@room, target_id)
      transmit_to_peer(peer, {
        type: type,
        from: @client_id,
        sdp:      payload["sdp"],
        candidate: payload["candidate"]
      }.compact)
    end
  end

  def transmit_to_peer(peer, data)
    # `transmit` is private in ActionCable (meant for a channel's own
    # subscriber), so we reach it via __send__ to relay to another peer's
    # subscriber. This relies on an internal API — re-check it on every
    # ActionCable/Rails upgrade, as the private method may move or change.
    peer&.__send__(:transmit, data)
  end

  def broadcast_game_start(payload)
    id1 = payload["id1"]
    id2 = payload["id2"]

    unless valid_game_start?(id1, id2)
      Rails.logger.warn(
        "[GameChannel] rejected start_game from #{@client_id.inspect}: id1=#{id1.inspect} id2=#{id2.inspect}"
      )
      return
    end

    role = payload["role"] || "active"
    ActionCable.server.broadcast("game_#{@room}", {
      type: "game_start",
      role: role,
      id1:  id1,
      id2:  id2
    })
  end

  # A game may only be started by one of its two participants, and both named
  # ids must currently be members of this room. This stops a subscriber from
  # forcing unrelated lobbies to leave by naming arbitrary third-party ids.
  def valid_game_start?(id1, id2)
    return false unless id1 && id2

    self.class.rooms_synchronize do
      members = self.class.rooms[@room]&.keys || []
      sender_is_participant = @client_id == id1 || @client_id == id2
      sender_is_participant && members.include?(id1) && members.include?(id2)
    end
  end
end
