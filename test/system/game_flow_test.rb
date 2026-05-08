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
    open_mode("Quit（離開遊戲）")

    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_menu')).display")
    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage_mode_menu')).display")
  end

  test "VS mode navigates to character selection" do
    open_mode("VS mode（對決模式）")

    assert_selector ".character_selection", visible: true, wait: 10
  end

  test "VS mode launches a match with two fighters" do
    open_mode("VS mode（對決模式）")
    assert_selector ".character_selection", visible: true, wait: 10

    # Drive player 1 (controller 0, attack = 's') through join → team → done,
    # accept one computer and its team → done (which lands on the VS dialog with
    # "Fight" pre-selected), then start the match. The engine buffers the keys
    # and drains them once per frame in order, so the sequence is deterministic.
    7.times { page.find("body").send_keys("s") }

    # Both fighters spawn asynchronously once the character data finishes
    # loading; their name labels are the signal the match loop is live (the
    # same anchor av_capture_test waits on).
    assert_selector ".char_name_label", minimum: 2, wait: 10

    # The match owns the gameplay region; character selection is hidden.
    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.gameplay')).display")
    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.character_selection')).display")
  end

  test "control settings screen renders" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click

    assert_selector ".settings", visible: true, wait: 10
    assert_selector ".settings_title", text: "control settings（控制設定）"
    assert_selector ".settings_ok", text: "ok（確定）"
    assert_selector ".settings_cancel", text: "cancel（取消）"
  end

  test "control settings ok and cancel buttons are not covered by the control table" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click
    assert_selector ".settings", visible: true, wait: 10

    # The nine-row keychanger table used to grow down over the buttons, so the
    # click landed on a rebindable <td> and the screen could not be left at all.
    # Assert the button itself is what sits under its own centre point.
    [ ".settings_ok", ".settings_cancel" ].each do |selector|
      topmost = evaluate_script(<<~JS)
        (() => {
          const r = document.querySelector('#{selector}').getBoundingClientRect()
          const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return el ? el.className : null
        })()
      JS
      assert_includes topmost, selector.delete_prefix("."),
        "#{selector} is covered by #{topmost.inspect}"
    end
  end

  test "control settings ok button leaves the screen and returns to the frontpage" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click
    assert_selector ".settings", visible: true, wait: 10

    find(".settings_ok", visible: false).click

    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.settings')).display")
    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage')).display")
  end

  test "control settings escape leaves the screen and returns to the frontpage" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click
    assert_selector ".settings", visible: true, wait: 10

    page.find("body").send_keys(:escape)

    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.settings')).display")
    assert_not_equal "none", evaluate_script("getComputedStyle(document.querySelector('.frontpage')).display")
  end

  test "network game screen renders" do
    find(".frontpage_menu_item", visible: false, text: "network game（連線遊戲）").click

    assert_selector ".network_game", visible: true, wait: 10
    assert_selector ".network_game_title", text: "Network Game (連線遊戲)"
  end

  test "custom network server connects through the protocol endpoint and opens the lobby" do
    server = page.current_url.delete_suffix("/")
    find(".frontpage_menu_item", visible: false, text: "network game（連線遊戲）").click
    find(".network_game_input").fill_in(with: server + "/")
    find(".network_game_connect").click

    assert_selector ".lobby", visible: true, wait: 10
    assert_equal server + "/lobby", find(".lobby_window")[:src]
    within_frame(find(".lobby_window")) do
      # Other browser sessions may already occupy the shared lobby.
      assert_selector "#status", text: /Waiting for another player|Pick an opponent/, wait: 10
    end
  end

  test "network server HTTP failure stays on the connection screen" do
    server = page.current_url + "missing-server"
    find(".frontpage_menu_item", visible: false, text: "network game（連線遊戲）").click
    find(".network_game_input").fill_in(with: server)
    find(".network_game_connect").click

    assert_selector ".network_game_log", text: "Failed to connect to #{server} (HTTP 404)", wait: 10
    assert_selector ".network_game", visible: true
  end

  test "touch controls use the port's action buttons and keep our own d-pad" do
    # Switch player 1 to the touch device on the control settings screen.
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click
    assert_selector ".settings", visible: true, wait: 10
    all(".keychanger table tr")[1].all("td")[1].click   # P1's "type" cell
    find(".settings_ok", visible: false).click
    assert_equal "none", evaluate_script("getComputedStyle(document.querySelector('.settings')).display")

    # Character selection shows the touch controls when P1 is on the touch
    # device (character_selection.js), which is where a mobile player joins.
    open_mode("VS mode（對決模式）")
    assert_selector ".character_selection", visible: true, wait: 10

    # Attack / jump / defend are circular, carry a vector glyph, and use the
    # per-action colours taken from lf2-port's touch_controls.c.
    {
      ".touch_controller_button.action_att"  => "rgb(239, 95, 95)",
      ".touch_controller_button.action_jump" => "rgb(79, 209, 197)",
      ".touch_controller_button.action_def"  => "rgb(246, 190, 72)"
    }.each do |selector, colour|
      assert_selector selector, visible: false, wait: 5
      style = evaluate_script("(() => { const s = getComputedStyle(document.querySelector('#{selector}')); return [s.borderRadius, s.borderTopColor, s.visibility] })()")
      assert_equal "50%", style[0], "#{selector} should be circular"
      assert_equal colour, style[1], "#{selector} should use the port's colour"
      assert_equal "visible", style[2], "#{selector} should be shown during a match"
      assert_equal 1, evaluate_script("document.querySelectorAll('#{selector} svg').length")
    end

    # The port's triangle: defend left, attack right, jump below both.
    lefts = evaluate_script("['def','jump','att'].map(k => document.querySelector('.touch_controller_button.action_' + k).getBoundingClientRect().left)")
    tops  = evaluate_script("['def','jump','att'].map(k => document.querySelector('.touch_controller_button.action_' + k).getBoundingClientRect().top)")
    assert_operator lefts[0], :<, lefts[2], "defend should sit left of attack"
    assert_operator tops[1], :>, tops[0], "jump should sit below defend"
    assert_operator tops[1], :>, tops[2], "jump should sit below attack"

    # ...and the whole cluster belongs in the BOTTOM-RIGHT corner, anchored
    # `edge` in from the canvas's right and bottom edges like the port does.
    att_right = evaluate_script("document.querySelector('.touch_controller_button.action_att').getBoundingClientRect().right")
    jump_bottom = evaluate_script("document.querySelector('.touch_controller_button.action_jump').getBoundingClientRect().bottom")
    viewport = evaluate_script("JSON.stringify([innerWidth, innerHeight])")
    width, height = JSON.parse(viewport)
    assert_operator att_right, :>, width * 0.85, "attack should sit against the right edge"
    assert_operator jump_bottom, :>, height * 0.85, "jump should sit against the bottom edge"

    # Our joystick d-pad is deliberately unchanged, and the old lettered labels
    # are gone from the action buttons.
    assert_equal 1, evaluate_script("document.querySelectorAll('.touch_dpad').length")
    assert_equal 1, evaluate_script("document.querySelectorAll('.touch_dpad_hub').length")
    assert_equal 0, evaluate_script("document.querySelectorAll('.touch_controller_button.action_att span, .touch_controller_button.action_jump span, .touch_controller_button.action_def span').length")
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
    open_mode("Stage mode（闖關模式）")

    assert_selector ".character_selection", visible: true, wait: 10
  end

  test "demo mode shows the demo setup screen" do
    open_mode("Demo（遊戲示範）")

    assert_selector ".demo_setup", visible: true, wait: 10
  end

  test "typing lf2.net then navigating past the base roster does not crash" do
    # Each character-selection portrait is a sprite whose image map is built once
    # at startup from the base roster. Toggling lf2.net must re-snapshot it so the
    # unlocked fighters have portraits (otherwise the game throws a TypeError the
    # moment selection steps past the 11th fighter).
    img_before = page.evaluate_script("document.querySelectorAll('.character_selection .engine-sprite-img').length")

    # Toggle the easter egg by typing it on the frontpage (no field focused).
    page.find("body").send_keys("lf2.net")

    img_after = page.evaluate_script("document.querySelectorAll('.character_selection .engine-sprite-img').length")
    assert_operator img_after, :>, img_before,
      "portrait sprite should gain the unlocked fighters after typing lf2.net"

    # Enter VS mode → character selection.
    open_mode("VS mode（對決模式）")
    assert_selector ".character_selection", visible: true, wait: 10

    # Join player 1 (attack = 's') then step right (right = 'd') well past the
    # base 11 heroes into the unlocked fighters (index 19 = "Bat").
    page.find("body").send_keys("s")
    sleep 0.2
    20.times { page.find("body").send_keys("d") }
    sleep 0.5

    name = page.evaluate_script("document.querySelectorAll('.character_selection .textbox')[1] && document.querySelectorAll('.character_selection .textbox')[1].textContent")
    assert_equal "Bat", name
  end

  test "player name containing HTML renders as literal text" do
    find(".frontpage_menu_item", visible: false, text: "control settings（控制設定）").click
    assert_selector ".settings", visible: true, wait: 10

    # P1's name cell is the second cell of the keychanger table's first row.
    # A peer/user-supplied name containing HTML must render as literal text
    # (textContent), never be parsed — otherwise the injected <img> would
    # execute in the page.
    payload = "<img src=x onerror=window.__lf2xss=1>"
    accept_prompt(with: payload) do
      all(".keychanger table tr")[0].all("td")[1].click
    end

    name_cell = all(".keychanger table tr")[0].all("td")[1]
    assert_includes name_cell.text, "<img src=x"
    assert_equal 0, name_cell.all("img").length
  end

  private

  # Open a mode from the main menu: game start → the named mode item.
  # The menu label strings are the engine's contract; keep them intact.
  def open_mode(name)
    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: name).click
  end
end
