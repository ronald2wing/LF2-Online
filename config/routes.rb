Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # LF2 network game endpoints (URL paths pinned for engine compatibility)
  get "protocol", to: "games#server_info"
  get "lobby",    to: "games#lobby"

  # WebSocket endpoint for P2P signaling
  mount ActionCable.server => "/cable"

  root "games#index"
end
