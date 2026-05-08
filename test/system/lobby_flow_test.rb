require "application_system_test_case"

# The lobby is a standalone page that talks to GameChannel over ActionCable, so
# its behaviour (roster, names, chat) is only observable with two live clients.
class LobbyFlowTest < ApplicationSystemTestCase
  test "two players see each other, rename themselves and chat" do
    using_session(:alice) do
      visit "/lobby"
      assert_selector ".roster", wait: 5
      # The page must actually reach the room before anything else is meaningful.
      assert_selector "#status", text: "Waiting for another player", wait: 10
      find("#nameInput").fill_in(with: "Alice")
      find("#nameInput").send_keys(:tab)   # commit the rename (change event)
    end

    using_session(:bob) do
      visit "/lobby"
      assert_selector ".roster", wait: 5
      # Seeing a challengeable opponent is the proof Bob reached the room and
      # received a roster that already contained Alice.
      assert_selector "#status", text: "Pick an opponent", wait: 10
      find("#nameInput").fill_in(with: "Bob")
      find("#nameInput").send_keys(:tab)
      assert_selector ".row", text: "Alice", wait: 10
    end

    using_session(:alice) do
      assert_selector ".row", text: "Bob", wait: 10
      find("#chatInput").fill_in(with: "hello")
      click_button "Send"
      assert_selector ".feed .line", text: "hello", wait: 10
    end

    using_session(:bob) do
      assert_selector ".feed .line", text: "hello", wait: 10
    end
  end
end
