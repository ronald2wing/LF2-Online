require "application_system_test_case"

# End-to-end tests for the LF2 game's menu flow. These run in a real browser
# (Selenium + headless Chrome) and cover the regressions we've hit: menu
# rendering, mode selection, screen navigation, and the always-expanded layout.
#
# The frontpage is CSS-transformed (scaled) when expanded, which Capybara's
# visibility detection can't see through, so frontpage assertions check
# existence (visible: false) rather than visibility.
class GameFlowTest < ApplicationSystemTestCase
  setup do
    visit "/"
    # The engine loads the game pack asynchronously; wait for the title to render.
    assert_selector ".frontpage_title", visible: false, wait: 15
  end

  test "main menu renders the five official items with game start selected" do
    items = all(".frontpage_menu_item", visible: false)
    assert_equal 5, items.length
    assert_equal "game start（開始遊戲）", items[0].text
    assert_equal "network game（連線遊戲）", items[1].text
    assert_equal "control settings（控制設定）", items[2].text
    assert_equal "recording info（錄影資料）", items[3].text
    assert_equal "official website（官方網站）", items[4].text

    # game start is selected by default
    assert items[0][:class].include?("active")
  end

  test "clicking game start shows the mode menu" do
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click

    # The main menu is hidden and the mode menu is shown (both stay in the DOM,
    # toggled via display, so check the display style).
    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_menu')).display")
    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_mode_menu')).display")

    modes = all(".frontpage_mode_item", visible: false)
    assert_equal 8, modes.length
    assert_equal "VS mode（對決模式）", modes[0].text
    assert_equal "Stage mode（闖關模式）", modes[1].text
    assert_equal "Quit（離開遊戲）", modes[7].text
  end

  test "quit returns from the mode menu to the main menu" do
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: "Quit（離開遊戲）").click

    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_menu')).display")
    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_mode_menu')).display")
  end

  test "VS mode navigates to character selection" do
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: "VS mode（對決模式）").click

    assert_selector ".character_selection", visible: true, wait: 10
  end

  test "control settings screen renders" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click

    assert_selector ".settings", visible: true, wait: 10
    assert_selector ".settings_title", text: "control settings（控制設定）"
    assert_selector ".settings_ok", text: "ok（確定）"
    assert_selector ".settings_cancel", text: "cancel（取消）"
  end

  test "network game screen renders" do
    find(".frontpage_menu_item", visible: false, text: "network game（連線遊戲）").click

    assert_selector ".network_game", visible: true, wait: 10
    assert_selector ".network_game_title", text: "Network Game (連線遊戲)"
  end

  test "the game is expanded by default and scales without stretching" do
    # The game starts maximized: the container has the maximized class and is
    # contain-fit scaled (transform != none), but the window stays at native
    # 794x550 (no wideWindow), so nothing is stretched.
    assert_selector ".game-root .container.maximized", wait: 5
    transform = evaluate_script("getComputedStyle(document.querySelector('.game-root .container')).transform")
    assert_not_equal "none", transform
    assert_equal false, evaluate_script("document.querySelector('.game-root .container').classList.contains('wideWindow')")
  end

  test "recording info navigates to the recording screen" do
    find(".frontpage_menu_item", visible: false, text: "recording info（錄影資料）").click

    assert_selector ".recording", visible: true, wait: 10
    assert_selector ".recording_title", text: "recording info（錄影資料）"
  end

  test "stage mode navigates to character selection" do
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: "Stage mode（闖關模式）").click

    assert_selector ".character_selection", visible: true, wait: 10
  end

  test "demo mode shows the demo setup screen" do
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: "Demo（遊戲示範）").click

    assert_selector ".demo_setup", visible: true, wait: 10
  end
end
