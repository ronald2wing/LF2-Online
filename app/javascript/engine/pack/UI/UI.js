//extended standard
export default {
  frontpage: {
    bg_color: "#10206c",
    title: "Little Fighter 2",
    subtitle: "小朋友齊打交（二）ver 2.0a",
    menu: [
      "game start（開始遊戲）",
      "network game（連線遊戲）",
      "control settings（控制設定）",
      "recording info（錄影資料）",
      "official website（官方網站）",
    ],
    mode_menu: [
      "VS mode（對決模式）",
      "Stage mode（闖關模式）",
      "1 on 1 Championship（淘汰賽）",
      "2 on 2 Championship（淘汰賽）",
      "Battle mode（戰爭模式）",
      "Demo（遊戲示範）",
      "Playback Recording（錄影重播）",
      "Quit（離開遊戲）",
    ],
  },
  settings: {
    bg_color: "#10206c",
    title: "control settings（控制設定）",
    ok: "ok（確定）",
    cancel: "cancel（取消）",
  },
  recording: {
    bg_color: "#10206c",
    title: "recording info（錄影資料）",
    name: "your name（姓名）",
    info: "more info（資料）",
    email: "e-mail（電郵）",
    turn_on: "turn on recording（開啟錄影）",
    ok: "ok（確定）",
  },
  network_game: {
    bg_color: "#10206c",
  },
  panel: {
    pic: "UI/panel.png",
    x: 5,
    y: 6,
    hpx: 57,
    hpy: 16,
    hpw: 125,
    hph: 10,
    mpx: 57,
    mpy: 36,
    mpw: 125,
    mph: 10,
    hp_light: "#FF8888",
    hp_bright: "#FF0000",
    hp_dark: "#6f081f",
    mp_bright: "#0000FF",
    mp_dark: "#1f086f",
    pane_width: 198,
    pane_height: 53,
    width: 794,
    height: 128,
  },
  message_overlay: {
    pic: "UI/message_overlay.png",
    //      x, y, w, h
    pause: [0, 0, 82, 21],
    demo: [82, 0, 70, 21],
    loading: [152, 0, 125, 21],
  },
  character_selection: {
    pic: "UI/character_selection.png",
    bg_color: "#000",
    box_width: 120,
    box_height: 116,
    posx: [147, 300, 453, 606],
    posy: [93, 213, 234, 256, 299, 420, 441, 463],
    waiting: { pic: "UI/press_attack_to_join.png" },
    random: { pic: "UI/random.png" },
    numbers: { pic: "UI/12345.png" },
    text: {
      //      blink1    blink2    static    computer
      color: ["#afdcff", "#1946ff", "#ffffff", "#ff9b9b"],
      box_width: 120,
      box_height: 18,
    },
  },
  how_many_computer_players: {
    bg: "UI/how_many_computer_players.png",
    x: 218,
    y: 213,
    width: 365,
    height: 111,
    item_x: 68,
    item_y: 69,
    item_space: 30,
    item_width: 19,
    item_height: 19,
    active_color: "#FFFFFF",
    inactive_color: "#5068c0",
  },
  vs_mode_dialog: {
    bg: "UI/dialog1.png",
    pic: "UI/vs_mode_dialog.png",
    x: 3, y: 3, width: 304, height: 165,
    label: ["Fight! (開始)", "Reset All (重新選擇角色)", "Reset Random (更新隨機角色)", "Background (背景)", "Difficulty (難度)", "Exit (離開)"],
    item: [
      [89, 13, 126, 21],   // Fight!
      [61, 35, 186, 21],   // Reset All
      [61, 56, 186, 21],   // Reset Random
      [37, 77, 235, 21],   // Background (value row)
      [34, 100, 228, 22],  // Difficulty (value row)
      [98, 125, 111, 18],  // Exit
    ],
  },
  stage_mode_dialog: {
    bg: "UI/dialog1.png",
    pic: "UI/stage_mode_dialog.png",
    x: 3, y: 3, width: 304, height: 165,
    label: ["Fight! (開始)", "Reset All (重新選擇角色)", "Reset Random (更新隨機角色)", "Stage (關)", "Difficulty (難度)", "Exit (離開)"],
    item: [
      [89, 13, 126, 21],   // Fight!
      [61, 35, 186, 21],   // Reset All
      [61, 56, 186, 21],   // Reset Random
      [37, 77, 235, 21],   // Stage (value row)
      [34, 100, 228, 22],  // Difficulty (value row)
      [98, 125, 111, 18],  // Exit
    ],
  },
  battle_setup_dialog: {
    bg: "UI/dialog1.png",
    pic: "UI/stage_mode_dialog.png",
    x: 3, y: 3, width: 304, height: 165,
    label: ["Fight! (開始)", "Defense (防禦)", "Army (軍隊)", "Back (返回)"],
    item: [
      [89, 13, 126, 21],   // Fight!
      [61, 35, 186, 21],   // Defense (value row)
      [61, 56, 186, 21],   // Army (value row)
      [61, 77, 186, 21],   // Back
    ],
  },
  demo_setup_dialog: {
    bg: "UI/dialog1.png",
    pic: "UI/stage_mode_dialog.png",
    x: 3, y: 3, width: 304, height: 165,
    label: ["Fight! (開始)", "Grouping (分組)", "Back (返回)"],
    item: [
      [89, 13, 126, 21],   // Fight!
      [61, 35, 186, 21],   // Grouping (value row)
      [61, 56, 186, 21],   // Back
    ],
  },
  summary: {
    width: 490,
    pic: "UI/summary.png",
    //     x,  y,  w, h
    head: [0, 0, 490, 59],
    body: [0, 59, 490, 46],
    foot: [0, 105, 490, 31],
    icon: [12, 0, 40, 45],
    time: [427, 4, 50, 18],
    time_color: "#ffffff",
    //                Name         Kill         Attack         HP Lost        MP Usage       Picking        Status  (lose)
    text: [
      [45, 0, 50, 46],
      [97, 10, 59, 24],
      [161, 10, 59, 24],
      [225, 10, 59, 24],
      [289, 10, 59, 24],
      [353, 10, 59, 24],
      [417, 10, 59, 24],
    ],
    text_color: [
      "#ffffff",
      "#ffaaaa",
      "#ffaaaa",
      "#f0f0aa",
      "#f0f0aa",
      "#aaf5aa",
      "#85ff85",
      "#ff9898",
    ],
  },
};
