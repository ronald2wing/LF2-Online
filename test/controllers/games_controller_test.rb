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
    end
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
