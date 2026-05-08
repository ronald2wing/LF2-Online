require "test_helper"

class GameChannelTest < ActionCable::Channel::TestCase
  tests GameChannel

  setup do
    GameChannel.rooms.clear
  end

  test "relay delivers the sender's client_id as from" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    challenger = subscription

    subscribe(room: "LF2 Online", client_id: "bbb")
    _challenged = subscription

    # A caller-supplied "from" must not clobber the injected sender id.
    challenger.receive({ "type" => "challenge", "to" => "bbb", "from" => "spoofed" })

    delivered = transmissions.last
    assert_equal "challenge", delivered["type"]
    assert_equal "aaa", delivered["from"]
  end

  test "rate limits a flood of presence messages" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    subscriber = subscription

    # The first MESSAGE_BURST messages pass and are answered; the rest are
    # silently dropped once the token bucket is drained.
    (GameChannel::MESSAGE_BURST + 100).times { subscriber.receive("type" => "presence") }

    assert_equal GameChannel::MESSAGE_BURST, transmissions.size
  end

  test "rejects start_game naming non-members" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "bbb")

    assert_no_broadcasts("game_LF2 Online") do
      # "zzz" is not a room member.
      sender.receive("type" => "start_game", "id1" => "aaa", "id2" => "zzz")
    end

    assert_no_broadcasts("game_LF2 Online") do
      # The sender "aaa" is not one of the named participants.
      sender.receive("type" => "start_game", "id1" => "bbb", "id2" => "ccc")
    end
  end

  test "unsubscribing a stale lobby does not evict the transport sharing its client_id" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    lobby = subscription

    # The WebRTC transport subscribes under the same client_id and overwrites
    # the room slot; tearing down the lobby must leave that slot intact.
    subscribe(room: "LF2 Online", client_id: "aaa")
    transport = subscription

    lobby.unsubscribe_from_channel
    assert_same transport, GameChannel.rooms["LF2 Online"]["aaa"][:subscription]

    subscribe(room: "LF2 Online", client_id: "bbb")
    sender = subscription
    sender.receive("type" => "challenge", "to" => "aaa")

    delivered = transmissions.last
    assert_equal "challenge", delivered["type"]
    assert_equal "bbb", delivered["from"]
  end

  test "broadcasts game_start when the sender is a participant" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "bbb")

    assert_broadcast_on("game_LF2 Online", { type: "game_start", role: "active", id1: "aaa", id2: "bbb" }) do
      sender.receive("type" => "start_game", "id1" => "aaa", "id2" => "bbb")
    end
  end

  test "presence carries each peer's name and state" do
    assert_broadcast_on("game_LF2 Online", {
      type: "peers",
      peers: [ { id: "aaa", name: "Davis", state: "idle" } ]
    }) do
      subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    end
  end

  test "a transport subscription keeps the name and marks the peer as playing" do
    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")

    # The WebRTC transport re-subscribes under the same client_id once the match
    # starts. It sends the playing state but no name, so the name must survive.
    assert_broadcast_on("game_LF2 Online", {
      type: "peers",
      peers: [ { id: "aaa", name: "Davis", state: "playing" } ]
    }) do
      subscribe(room: "LF2 Online", client_id: "aaa", state: "playing")
    end
  end

  test "chat is broadcast to the room with the sender's name" do
    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    sender = subscription

    assert_broadcast_on("game_LF2 Online", {
      type: "chat", from: "aaa", name: "Davis", text: "gg"
    }) do
      sender.receive("type" => "chat", "text" => "  gg  ")
    end
  end

  test "empty chat is dropped" do
    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    sender = subscription

    assert_no_broadcasts("game_LF2 Online") do
      sender.receive("type" => "chat", "text" => "   ")
    end
  end

  test "set_name renames the peer for the whole room" do
    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    sender = subscription

    assert_broadcast_on("game_LF2 Online", {
      type: "peers",
      peers: [ { id: "aaa", name: "Firen", state: "idle" } ]
    }) do
      sender.receive("type" => "set_name", "name" => "  Firen  ")
    end
  end

  test "set_name ignores an unusable name" do
    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    sender = subscription

    assert_no_broadcasts("game_LF2 Online") do
      sender.receive("type" => "set_name", "name" => "   ")
    end
  end

  test "a challenge to a peer already in a match is not relayed" do
    subscribe(room: "LF2 Online", client_id: "bbb", name: "Firen")
    challenger = subscription

    subscribe(room: "LF2 Online", client_id: "aaa", name: "Davis")
    subscribe(room: "LF2 Online", client_id: "aaa", state: "playing")

    challenger.receive("type" => "challenge", "to" => "aaa")
    assert_empty transmissions
  end

  test "matchmaking relays only its allowed fields and keeps the real sender" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "bbb")

    %w[challenge accept decline cancel].each do |type|
      sender.receive(
        "type" => type, "to" => "bbb", "from" => "spoofed",
        "role" => "passive", "peer" => nil, "sdp" => "not a matchmaking field"
      )

      assert_equal({ "type" => type, "from" => "aaa", "role" => "passive", "peer" => nil }, transmissions.last)
    end
    assert_equal 4, transmissions.size
  end

  test "signaling reaches playing peers with only non-nil signal fields" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "bbb", state: "playing")

    {
      "offer" => { "sdp" => { "type" => "offer", "sdp" => "offer-sdp" } },
      "answer" => { "sdp" => { "type" => "answer", "sdp" => "answer-sdp" } },
      "ice-candidate" => { "candidate" => { "candidate" => "candidate-data" } },
      "offer-request" => {}
    }.each do |type, fields|
      sender.receive({
        "type" => type, "to" => "bbb", "from" => "spoofed",
        "role" => "active", "peer" => "unexpected", "sdp" => nil, "candidate" => nil
      }.merge(fields))

      assert_equal({ "type" => type, "from" => "aaa" }.merge(fields), transmissions.last)
    end
    assert_equal 4, transmissions.size
  end

  test "relays ignore missing departed and other-room targets" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "departed")
    subscription.unsubscribe_from_channel
    subscribe(room: "Another room", client_id: "foreign")

    [ nil, "missing", "departed", "foreign" ].each do |target|
      %w[challenge accept decline cancel offer answer ice-candidate offer-request].each do |type|
        sender.receive("type" => type, "to" => target, "sdp" => "ignored")
      end
    end

    assert_empty transmissions
  end

  test "an unnamed subscriber gets a placeholder and names are capped" do
    assert_broadcast_on("game_LF2 Online", {
      type: "peers",
      peers: [ { id: "abcd1234", name: "Player abcd", state: "idle" } ]
    }) do
      subscribe(room: "LF2 Online", client_id: "abcd1234")
    end

    assert_broadcast_on("game_LF2 Online", {
      type: "peers",
      peers: [
        { id: "abcd1234", name: "Player abcd", state: "idle" },
        { id: "eeee", name: "x" * GameChannel::NAME_MAX_LENGTH, state: "idle" }
      ]
    }) do
      subscribe(room: "LF2 Online", client_id: "eeee", name: "  #{'x' * 100}\n")
    end
  end
end
