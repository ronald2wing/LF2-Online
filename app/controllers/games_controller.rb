class GamesController < ApplicationController
  def index
  end

  def server_info
    # Lightweight handshake: the client fetches /protocol to confirm a URL
    # hosts a running LF2 Online server before opening the lobby. A 200 with
    # no body is the entire contract.
    head :ok
  end

  def lobby
    render layout: false
  end
end
