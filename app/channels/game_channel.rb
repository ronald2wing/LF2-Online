# WebRTC signaling channel for LF2 Online P2P matchmaking.
# Handles presence, matchmaking, and WebRTC signaling relay between peers.
class GameChannel < ApplicationCable::Channel
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
        self.class.rooms[@room].delete(@client_id)
        self.class.rooms.delete(@room) if self.class.rooms[@room].empty?
      end
    end
    broadcast_peers
  end

  def receive(payload)
    type      = payload["type"]
    target_id = payload["to"]

    case type
    when "presence"
      broadcast_peers
    when "challenge", "accept"
      relay(type, target_id, payload.slice("from", "role", "peer"))
    when "offer", "answer", "ice-candidate"
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

  def relay(type, target_id, data)
    return unless target_id

    self.class.rooms_synchronize do
      peer = self.class.rooms.dig(@room, target_id)
      peer&.transmit({ type: type, **data })
    end
  end

  def relay_signal(type, target_id, payload)
    return unless target_id

    self.class.rooms_synchronize do
      peer = self.class.rooms.dig(@room, target_id)
      peer&.transmit({
        type: type,
        from: @client_id,
        sdp:      payload["sdp"],
        candidate: payload["candidate"]
      }.compact)
    end
  end

  def broadcast_game_start(payload)
    role = payload["role"] || "active"
    id1  = payload["id1"]
    id2  = payload["id2"]

    ActionCable.server.broadcast("game_#{@room}", {
      type: "game_start",
      role: role,
      id1:  id1,
      id2:  id2
    })
  end
end
