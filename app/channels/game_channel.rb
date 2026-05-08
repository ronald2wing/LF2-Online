# WebRTC signaling channel for LF2 Online P2P matchmaking.
# Handles presence, room chat, matchmaking, and WebRTC signaling relay between
# peers, plus the roster's per-peer name and availability state.
class GameChannel < ApplicationCable::Channel
  # Per-subscription signaling budget (token bucket). WebRTC signaling is
  # bursty but small: one offer + one answer, a handful of ICE candidates, and
  # a passive peer retrying offer-request at ~2/s. 20 msg/s with a 40-message
  # burst is far above real traffic yet caps a flood. Chat rides the same
  # bucket.
  MESSAGE_RATE = 20.0
  MESSAGE_BURST = 40

  # WebRTC SDP offers/answers are typically 2-8 KB; ICE candidates are a few
  # hundred bytes. 64 KB is ~8x headroom over a large SDP while bounding the
  # bytes a client can push through relay or broadcast.
  MAX_MESSAGE_BYTES = 64 * 1024

  # Display names are cosmetic and room-scoped; they only need to be short
  # enough to render in a roster row and free of control characters.
  NAME_MAX_LENGTH = 24

  CHAT_TEXT_MAX = 240

  @rooms = {}
  @rooms_mutex = Mutex.new

  class << self
    # room => { client_id => { subscription:, name:, state: } }. An entry whose
    # `subscription` is nil is a departed client that is kept only until the
    # room empties, so a re-subscribe under the same id (the WebRTC transport
    # taking over from the lobby) still finds the name the player picked.
    attr_reader :rooms

    def rooms_synchronize(&block)
      @rooms_mutex.synchronize(&block)
    end
  end

  def subscribed
    room = params[:room] || "LF2 Online"
    @client_id = params[:client_id] || SecureRandom.hex(4)
    @room = room
    @state = params[:state] == "playing" ? "playing" : "idle"

    self.class.rooms_synchronize do
      self.class.rooms[room] ||= {}
      previous = self.class.rooms[room][@client_id]
      @name = sanitize_name(params[:name]) || previous&.dig(:name) || placeholder_name
      self.class.rooms[room][@client_id] = { subscription: self, name: @name, state: @state }
    end

    broadcast_peers
    stream_from "game_#{room}"
  end

  def unsubscribed
    self.class.rooms_synchronize do
      entries = self.class.rooms[@room]
      if entries
        # The lobby iframe and the WebRTC transport subscribe under the same
        # client_id. When the lobby's connection closes after game_start it must
        # not evict the transport's slot, so only clear the entry if it still
        # maps to this subscriber.
        entries[@client_id][:subscription] = nil if entries[@client_id]&.dig(:subscription).equal?(self)
        self.class.rooms.delete(@room) unless entries.any? { |_, entry| entry[:subscription] }
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
    when "chat"
      broadcast_chat(payload)
    when "set_name"
      rename(payload)
    when "challenge", "accept", "decline", "cancel"
      relay(type, target_id, payload.slice("role", "peer"))
    when "offer", "answer", "ice-candidate", "offer-request"
      relay(type, target_id, {
        sdp: payload["sdp"],
        candidate: payload["candidate"]
      }.compact)
    when "start_game"
      broadcast_game_start(payload)
    end
  end

  private

  # The roster as sent to clients: only live subscribers, with the name and
  # availability state the lobby renders per row.
  def peers_payload
    peers = self.class.rooms[@room]&.filter_map do |id, entry|
      next unless entry[:subscription]
      { id: id, name: entry[:name], state: entry[:state] }
    end || []

    { type: "peers", peers: peers }
  end

  def broadcast_peers
    ActionCable.server.broadcast("game_#{@room}", peers_payload)
  end

  # `presence` is a request for the current peer list: reply to the requesting
  # subscriber only. Broadcasting it room-wide would let one client amplify a
  # single message across every connected lobby. Join/leave changes are already
  # announced from subscribed/unsubscribed, so other clients still learn about
  # membership without a client-triggerable broadcast.
  def transmit_peer_list
    transmit(peers_payload)
  end

  # Room-only chat: broadcast to whoever is subscribed right now. No history is
  # kept, so nothing is stored or replayed to later joiners.
  def broadcast_chat(payload)
    text = payload["text"].to_s.strip[0, CHAT_TEXT_MAX]
    return if text.empty?

    ActionCable.server.broadcast("game_#{@room}", {
      type: "chat",
      from: @client_id,
      name: @name,
      text: text
    })
  end

  # Names are display-only, so anything unusable falls back to a placeholder
  # rather than rejecting the subscription.
  def sanitize_name(raw)
    name = raw.to_s.gsub(/[[:cntrl:]]/, "").strip[0, NAME_MAX_LENGTH]
    name.presence
  end

  # A player may rename themselves while in the lobby; re-broadcasting the
  # roster is what makes every other client show the new name immediately.
  def rename(payload)
    name = sanitize_name(payload["name"])
    return unless name

    self.class.rooms_synchronize do
      entry = self.class.rooms.dig(@room, @client_id)
      entry[:name] = name if entry&.dig(:subscription).equal?(self)
    end
    @name = name
    broadcast_peers
  end

  def placeholder_name
    "Player #{@client_id[0, 4]}"
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
      entry = self.class.rooms.dig(@room, target_id)
      return unless entry&.dig(:subscription)
      # A peer already in a match cannot be challenged. The roster marks them
      # "In match" and the lobby hides the button, so this only closes the race
      # between their match starting and our roster updating.
      return if type == "challenge" && entry[:state] == "playing"

      # `transmit` is private in ActionCable, so relaying to another subscriber
      # requires __send__. Re-check this internal API on ActionCable upgrades.
      entry[:subscription].__send__(:transmit, { type: type, **data, from: @client_id })
    end
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

    mark_playing(id1, id2)
    role = payload["role"] || "active"
    ActionCable.server.broadcast("game_#{@room}", {
      type: "game_start",
      role: role,
      id1:  id1,
      id2:  id2
    })
  end

  # Both participants become unavailable the moment the match is announced,
  # without waiting for their transports to subscribe — otherwise the roster
  # would still offer them as challengeable during the handoff.
  def mark_playing(*client_ids)
    self.class.rooms_synchronize do
      entries = self.class.rooms[@room]
      client_ids.each do |id|
        entry = entries&.[](id)
        entry[:state] = "playing" if entry
      end
    end
    broadcast_peers
  end

  # A game may only be started by one of its two participants, and both named
  # ids must currently be members of this room. This stops a subscriber from
  # forcing unrelated lobbies to leave by naming arbitrary third-party ids.
  def valid_game_start?(id1, id2)
    return false unless id1 && id2

    self.class.rooms_synchronize do
      members = self.class.rooms[@room]&.select { |_, entry| entry[:subscription] }&.keys || []
      sender_is_participant = @client_id == id1 || @client_id == id2
      sender_is_participant && members.include?(id1) && members.include?(id2)
    end
  end
end
