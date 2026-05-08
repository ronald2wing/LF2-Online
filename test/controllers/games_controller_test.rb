require "test_helper"

class GamesControllerTest < ActionDispatch::IntegrationTest
  test "GET /protocol advertises STUN by default" do
    get "/protocol"
    assert_response :success
    assert_equal [ { "urls" => "stun:stun.l.google.com:19302" } ], response.parsed_body["ice_servers"]
  end

  test "GET /protocol advertises a TURN relay when TURN_URL is set" do
    with_env(
      "TURN_URL" => "turn:relay.example.com:3478",
      "TURN_USERNAME" => "alice",
      "TURN_CREDENTIAL" => "s3cret"
    ) do
      get "/protocol"
      assert_response :success
      assert_equal(
        [
          { "urls" => "stun:stun.l.google.com:19302" },
          { "urls" => "turn:relay.example.com:3478", "username" => "alice", "credential" => "s3cret" }
        ],
        response.parsed_body["ice_servers"]
      )
    end
  end

  test "GET /protocol supports comma-separated TURN_URLs and omits blank credentials" do
    with_env(
      "TURN_URL" => "turn:a.example.com:3478, turns:b.example.com:5349",
      "TURN_USERNAME" => "",
      "TURN_CREDENTIAL" => nil
    ) do
      get "/protocol"
      assert_response :success
      assert_equal(
        [
          { "urls" => "stun:stun.l.google.com:19302" },
          { "urls" => [ "turn:a.example.com:3478", "turns:b.example.com:5349" ] }
        ],
        response.parsed_body["ice_servers"]
      )
      # Pin the mixed-scheme contract: a turns: URL survives alongside a turn:
      # URL in the same `urls` array (not dropped, and not split into a second
      # ICE server).
      urls = response.parsed_body["ice_servers"].last["urls"]
      assert_includes urls, "turn:a.example.com:3478"
      assert_includes urls, "turns:b.example.com:5349"
    end
  end

  test "GET /lobby renders its own document without the application layout" do
    get "/lobby"
    assert_response :success
    assert_includes response.body, "LF2 Online Lobby"
    # The lobby is a standalone document (layout: false); csrf_meta_tags only
    # appears in the application layout, so its absence proves none was applied.
    assert_not_includes response.body, "csrf-param"
  end

  private

  def with_env(overrides)
    original = overrides.keys.index_with { |key| ENV[key] }
    overrides.each { |key, value| ENV[key] = value }
    yield
  ensure
    overrides.each_key do |key|
      if original[key].nil?
        ENV.delete(key)
      else
        ENV[key] = original[key]
      end
    end
  end
end
