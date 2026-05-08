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

  test "broadcasts game_start when the sender is a participant" do
    subscribe(room: "LF2 Online", client_id: "aaa")
    sender = subscription
    subscribe(room: "LF2 Online", client_id: "bbb")

    assert_broadcast_on("game_LF2 Online", { type: "game_start", role: "active", id1: "aaa", id2: "bbb" }) do
      sender.receive("type" => "start_game", "id1" => "aaa", "id2" => "bbb")
    end
  end
end
