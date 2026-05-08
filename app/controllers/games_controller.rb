class GamesController < ApplicationController
  def index
  end

  def protocol
    # Lightweight handshake: the client fetches /protocol to confirm a URL
    # hosts a running LF2 Online server before opening the lobby. The JSON body
    # carries the WebRTC ICE servers the client should use for the P2P link.
    render json: { ice_servers: ice_servers }
  end

  def lobby
    render layout: false
  end

  private

  # ICE servers handed to clients at /protocol. STUN is always advertised; a
  # TURN relay is appended from TURN_URL / TURN_USERNAME / TURN_CREDENTIAL so a
  # deploy can enable TURN without rebuilding the client. TURN_URL may hold a
  # comma-separated list of relay URLs (e.g. turn: and turns: entries).
  def ice_servers
    servers = [ { urls: "stun:stun.l.google.com:19302" } ]

    turn_urls = ENV["TURN_URL"].to_s.split(",").map(&:strip).reject(&:empty?)
    if turn_urls.any?
      turn = { urls: turn_urls.one? ? turn_urls.first : turn_urls }
      turn[:username] = ENV["TURN_USERNAME"] if ENV["TURN_USERNAME"].present?
      turn[:credential] = ENV["TURN_CREDENTIAL"] if ENV["TURN_CREDENTIAL"].present?
      servers << turn
    end

    servers
  end
end
