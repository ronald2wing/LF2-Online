// manager.js — Game bootstrap and UI orchestrator.
//
// Owns the game loop, window management, settings, character/background
// selection, match creation, and tear-down.  Acts as the bridge between
// the Stimulus controller and the engine core.

import global from "engine/Game/global"
import network from "engine/network"
import Soundpack from "engine/Game/soundpack"
import Match from "engine/Game/match"
import util from "engine/Game/util"
import Random from "engine/third_party/random"

import coreUtil from "engine/core/util"
import spriteRenderer from "engine/core/sprite-canvas"
import spriteDOM from "engine/core/sprite-dom"
import { show, hide, createTextBox, VerticalMenuDialog, HorizontalNumberDialog, SummaryDialog } from "engine/Game/manager-dialogs"
import animator from "engine/core/animator"
import inputController from "engine/core/controller"
import TouchController from "engine/Game/touchcontroller"
import { Recorder, ReplayController, downloadRecording } from "engine/Game/recorder"
import ResourceMap from "engine/core/resourcemap"
import browserSupport from "engine/core/support"

class GameManager {
  constructor(pack) {
  const param = util.parseLocationParams()
  const { character_selection: sel } = pack.data.UI.data

  let char_list, img_list, AI_list, bg_list, diff_list, battle_defenses, battle_unit_types, battle_presets, demo_groupings,
      timer, randomseed, resourcemap,
      settings, session, controllers,
      window_state

  const manager = this

  this.create = function () {
    // Pack UI CSS is preloaded by the host page via <link rel="stylesheet">.

    // window sizing
    window_state =
    {
      maximized: true,
      wide: false,
      allow_wide: false
    }
    // The game is always expanded, so mark the container as maximized from the
    // start (the CSS for the maximized state keys off this class).
    util.queryUI('window') // ensure util.container is resolved
    util.container.classList.add('maximized')
    util.queryUI('extra_UI').classList.add('maximized')
    function onresize() {
      resizer()
    }
    function getFeature(from, feature) {
      function cap(a) {
        return a.charAt(0).toUpperCase() + a.substr(1)
      }
      const val = from[feature] || from[browserSupport.prefix_js + cap(feature)]
      if (typeof val === 'function') {
        return val.bind(from)
      }
      return val
    }
    util.queryUI('alert_box_ok').onclick = function () {
      hide(util.queryUI('alert_box'))
    }
    manager.alert = function (mess) {
      console.error(mess)
      util.queryUI('alert_message').innerHTML = mess
      show(util.queryUI('alert_box'))
    }
    hide(util.queryUI('alert_box'))

    session =
    {
      network: false,
      control: null,
      player: []
    }

    const settings_format_version = 1.00003
    settings =
    {
      version: settings_format_version,
      record: false,
      recording_name: '',
      recording_info: '',
      recording_email: '',
      lf2net: false,
      control:
        [
          {
            type: 'keyboard',
            config: { up: 'w', down: 'x', left: 'a', right: 'd', att: 's', jump: 'q', def: 'z' }
          },
          {
            type: 'keyboard',
            config: { up: 'u', down: 'm', left: 'h', right: 'k', att: 'j', jump: 'i', def: ',' }
          },
          {
            type: 'keyboard',
            config: { up: 'up', down: 'down', left: 'left', right: 'right', att: 'enter', jump: 'shift', def: 'ctrl' }
          },
          {
            type: 'keyboard',
            config: { up: 'i', down: ',', left: 'j', right: 'l', att: 'k', jump: 'space', def: '.' }
          }
        ],
      player:
        [
          { name: 'player1' }, { name: 'player2' }, { name: 'player3' }, { name: 'player4' }
        ],
      server:
      {
        'LF2 Online Lobby': 'https://lf2.online'
      }
    }
    if (browserSupport.localStorage) {
      if (browserSupport.localStorage.getItem('F.Game/settings')) {
        const obj = JSON.parse(browserSupport.localStorage.getItem('F.Game/settings'))
        if (obj.version === settings_format_version) {
          settings = obj
        }
      }
    }
    for (let i = 0; i < settings.player.length; i++) {
      session.player[i] = settings.player[i]
    }
    // expose the lf2.net cheat state to the match (for fusion/transform HP caps)
    Object.defineProperty(manager, 'lf2net', { get: () => settings.lf2net })

    // control
    const functionkey_config = { esc: 'esc', F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12' }
    controllers =
    {
      keyboard:
      {
        c0: new inputController(settings.control[0].config),
        c1: new inputController(settings.control[1].config),
        c2: new inputController(settings.control[2].config),
        c3: new inputController(settings.control[3].config),
        f: new inputController(functionkey_config)
      },
      touch:
      {
        c: new TouchController({ layout: 'gamepad' }),
        f: new TouchController({ layout: 'functionkey' })
      }
    }
    controllers.touch.c.hide()
    controllers.touch.f.hide()
    // first touch switches player 1 to the on-screen touch controls
    document.addEventListener('touchstart', ontouch, false)
    function ontouch() {
      settings.control[0].type = 'touch'
      session.control[0] = controllers.touch.c
      session.control.f = controllers.touch.f
      document.removeEventListener('touchstart', ontouch, false)
    }
    // lf2.net cheat: typing it toggles CRAZY! + mooks/bosses + lifted transform HP caps
    let cheatBuffer = ''
    document.addEventListener('keydown', function (e) {
      if (e.key && e.key.length === 1) {
        cheatBuffer = (cheatBuffer + e.key.toLowerCase()).slice(-7)
        if (cheatBuffer === 'lf2.net') {
          settings.lf2net = !settings.lf2net
          applyLf2netCheat()
          cheatBuffer = ''
          manager.sound.play('1/m_ok')
        }
      }
    }, false)
    session.control =
    {
      f: controllers.keyboard.f,
      length: 4,
      my_offset: 0
    }
    for (let i = 0; i < session.control.length; i++) {
      switch (settings.control[i].type) {
        case 'keyboard':
          session.control[i] = controllers.keyboard['c' + i]
          break
        case 'touch':
          session.control[i] = controllers.touch.c
          session.control.f = controllers.touch.f
          break
      }
    }

    // setup resource map
    util.organizePackDependencies(pack)
    resourcemap = new ResourceMap(util.setupResourceMap(pack))
    spriteRenderer.masterconfig_set('resourcemap', resourcemap)
    spriteDOM.masterconfig_set('resourcemap', resourcemap)

    // icon
    if (pack.data.icon) {
      const icon = document.createElement('link')
      icon.rel = 'icon'
      icon.href = spriteRenderer.resolve_resource(pack.data.icon)
      document.head.appendChild(icon)
    }

    // sound — initialize immediately; the Soundpack constructor returns a
    // no-op if the browser lacks audio support. Playback is gated by the
    // browser's autoplay policy, so sounds start after the first interaction.
    manager.sound = new Soundpack({
      packs: pack.data.sound,
      resourcemap: resourcemap
    })

    // rand
    manager.random = function () {
      return randomseed.next()
    }
    randomseed = new Random()
    randomseed.seed_bytime()

    // prepare — playable list excludes NPC/hostage (id >= 300); mooks (30-39) and
    // bosses (50-52) are locked until the lf2.net cheat is typed.
    function applyLf2netCheat() {
      char_list = util.selectAll(pack.data.object, { type: 'character' })
        .filter(c => settings.lf2net ? c.id < 300 : c.id < 30)
      char_list[-1] = { name: 'Random' }
      img_list = coreUtil.extractArray(char_list, 'pic').pic
      img_list.waiting = sel.waiting.pic
      img_list[-1] = pack.data.UI.data.character_selection.random.pic
      diff_list = settings.lf2net
        ? ['Easy', 'Normal', 'Difficult', 'CRAZY!']
        : ['Easy', 'Normal', 'Difficult']
    }
    applyLf2netCheat()
    AI_list = pack.data.AI.slice(0)
    bg_list = pack.data.background.slice(0)
    bg_list[-1] = { name: 'Random' }
    battle_defenses = ['1.0', '1.5', '2.0', '2.5', '3.0'],
    battle_unit_types = [
      { id: 30 }, { id: 31 }, { id: 32 }, { id: 33 }, { id: 34 }, { id: 35 },
      { id: 36 }, { id: 37 }, { id: 39 }, { id: 122 }, { id: 123 }
    ],
    battle_presets = [
      { name: 'Zero', units: [] },
      { name: 'Balanced (S)', units: [
        { id: 30, in: 2, reserve: 4 }, { id: 31, in: 2, reserve: 4 }, { id: 33, in: 1, reserve: 1 }, { id: 34, in: 1, reserve: 1 },
        { id: 39, in: 1, reserve: 1 }, { id: 36, in: 1, reserve: 0 }, { id: 122, in: 1, reserve: 2 }, { id: 123, in: 1, reserve: 2 } ] },
      { name: 'Balanced (M)', units: [
        { id: 30, in: 4, reserve: 9 }, { id: 31, in: 4, reserve: 9 }, { id: 33, in: 2, reserve: 3 }, { id: 34, in: 2, reserve: 3 },
        { id: 39, in: 2, reserve: 3 }, { id: 32, in: 1, reserve: 0 }, { id: 35, in: 1, reserve: 0 }, { id: 36, in: 1, reserve: 1 },
        { id: 37, in: 1, reserve: 0 }, { id: 122, in: 2, reserve: 4 }, { id: 123, in: 2, reserve: 4 } ] },
      { name: 'Balanced (L)', units: [
        { id: 30, in: 7, reserve: 13 }, { id: 31, in: 7, reserve: 13 }, { id: 33, in: 4, reserve: 4 }, { id: 34, in: 4, reserve: 4 },
        { id: 39, in: 4, reserve: 4 }, { id: 32, in: 1, reserve: 1 }, { id: 35, in: 1, reserve: 1 }, { id: 36, in: 1, reserve: 2 },
        { id: 37, in: 1, reserve: 1 }, { id: 122, in: 3, reserve: 7 }, { id: 123, in: 3, reserve: 7 } ] },
      { name: 'Inferior (S)', units: [
        { id: 30, in: 6, reserve: 8 }, { id: 31, in: 6, reserve: 8 }, { id: 34, in: 1, reserve: 1 }, { id: 36, in: 1, reserve: 0 },
        { id: 122, in: 1, reserve: 2 }, { id: 123, in: 1, reserve: 2 } ] },
      { name: 'Inferior (M)', units: [
        { id: 30, in: 13, reserve: 15 }, { id: 31, in: 13, reserve: 15 }, { id: 33, in: 1, reserve: 0 }, { id: 34, in: 2, reserve: 3 },
        { id: 36, in: 1, reserve: 1 }, { id: 122, in: 2, reserve: 4 }, { id: 123, in: 2, reserve: 4 } ] },
      { name: 'Inferior (L)', units: [
        { id: 30, in: 20, reserve: 22 }, { id: 31, in: 20, reserve: 22 }, { id: 33, in: 1, reserve: 1 }, { id: 34, in: 4, reserve: 4 },
        { id: 36, in: 1, reserve: 2 }, { id: 122, in: 3, reserve: 7 }, { id: 123, in: 3, reserve: 7 } ] },
      { name: 'Ranged (S)', units: [
        { id: 31, in: 3, reserve: 3 }, { id: 33, in: 2, reserve: 2 }, { id: 34, in: 2, reserve: 2 }, { id: 35, in: 1, reserve: 1 },
        { id: 36, in: 1, reserve: 0 }, { id: 122, in: 1, reserve: 2 }, { id: 123, in: 1, reserve: 2 } ] },
      { name: 'Ranged (M)', units: [
        { id: 31, in: 6, reserve: 7 }, { id: 33, in: 4, reserve: 4 }, { id: 34, in: 4, reserve: 4 }, { id: 35, in: 2, reserve: 3 },
        { id: 36, in: 1, reserve: 1 }, { id: 122, in: 2, reserve: 4 }, { id: 123, in: 2, reserve: 4 } ] },
      { name: 'Ranged (L)', units: [
        { id: 31, in: 10, reserve: 10 }, { id: 33, in: 6, reserve: 6 }, { id: 34, in: 6, reserve: 6 }, { id: 35, in: 4, reserve: 4 },
        { id: 36, in: 1, reserve: 2 }, { id: 122, in: 3, reserve: 7 }, { id: 123, in: 3, reserve: 7 } ] },
      { name: 'Melee (S)', units: [
        { id: 30, in: 3, reserve: 3 }, { id: 33, in: 1, reserve: 0 }, { id: 39, in: 1, reserve: 2 }, { id: 32, in: 1, reserve: 1 },
        { id: 36, in: 1, reserve: 0 }, { id: 37, in: 1, reserve: 1 }, { id: 122, in: 1, reserve: 2 }, { id: 123, in: 1, reserve: 2 } ] },
      { name: 'Melee (M)', units: [
        { id: 30, in: 6, reserve: 7 }, { id: 33, in: 1, reserve: 1 }, { id: 39, in: 3, reserve: 3 }, { id: 32, in: 2, reserve: 3 },
        { id: 36, in: 1, reserve: 1 }, { id: 37, in: 2, reserve: 2 }, { id: 122, in: 2, reserve: 4 }, { id: 123, in: 2, reserve: 4 } ] },
      { name: 'Melee (L)', units: [
        { id: 30, in: 10, reserve: 10 }, { id: 33, in: 2, reserve: 2 }, { id: 39, in: 5, reserve: 5 }, { id: 32, in: 4, reserve: 4 },
        { id: 36, in: 1, reserve: 2 }, { id: 37, in: 3, reserve: 3 }, { id: 122, in: 3, reserve: 7 }, { id: 123, in: 3, reserve: 7 } ] },
      { name: 'Giant (S)', units: [
        { id: 32, in: 2, reserve: 1 }, { id: 35, in: 1, reserve: 1 }, { id: 36, in: 1, reserve: 0 }, { id: 37, in: 1, reserve: 1 },
        { id: 122, in: 1, reserve: 2 }, { id: 123, in: 1, reserve: 2 } ] },
      { name: 'Giant (M)', units: [
        { id: 32, in: 4, reserve: 2 }, { id: 35, in: 2, reserve: 3 }, { id: 36, in: 1, reserve: 1 }, { id: 37, in: 2, reserve: 3 },
        { id: 122, in: 2, reserve: 4 }, { id: 123, in: 2, reserve: 4 } ] },
      { name: 'Giant (L)', units: [
        { id: 32, in: 6, reserve: 3 }, { id: 35, in: 4, reserve: 4 }, { id: 36, in: 1, reserve: 2 }, { id: 37, in: 4, reserve: 4 },
        { id: 122, in: 3, reserve: 7 }, { id: 123, in: 3, reserve: 7 } ] },
      { name: 'Full', units: [
        { id: 30, in: 2, reserve: 30 }, { id: 31, in: 2, reserve: 30 }, { id: 32, in: 2, reserve: 30 }, { id: 33, in: 2, reserve: 30 },
        { id: 34, in: 2, reserve: 30 }, { id: 35, in: 2, reserve: 30 }, { id: 36, in: 1, reserve: 15 }, { id: 37, in: 2, reserve: 30 },
        { id: 39, in: 2, reserve: 30 }, { id: 122, in: 3, reserve: 30 }, { id: 123, in: 3, reserve: 30 } ] },
    ]
    // Demo mode groupings (official: 2-8 fighters in configurable teams).
    // Each entry: { name, teams: [teamSize, ...] } — total fighters = sum.
    demo_groupings = [
      { name: '1 vs 1', teams: [1, 1] },
      { name: '2 vs 2', teams: [2, 2] },
      { name: '3 vs 3', teams: [3, 3] },
      { name: '4 vs 4', teams: [4, 4] },
      { name: '2v2v2v2', teams: [2, 2, 2, 2] },
      { name: '3v3v2', teams: [3, 3, 2] },
      { name: 'Independent 8', teams: [1, 1, 1, 1, 1, 1, 1, 1] },
    ]

    this.create_UI()
    this.switch_UI('frontpage')

    window.addEventListener('resize', onresize, false)
    onresize()
  }
  function create_network_controllers(server, param) {
    const handler = {
      on: function (event, mess) {
        switch (event) {
          case 'open':
            let controller_config = { up: 'w', down: 'x', left: 'a', right: 'd', def: 'z', jump: 'q', att: 's' }
            if (param.role === 'active') {
              session.control[0] = new network.controller('local', session.control[0])
              session.control[1] = new network.controller('local', session.control[1])
              session.control[2] = new network.controller('remote', controller_config)
              session.control[3] = new network.controller('remote', controller_config)
              session.control.length = 4
              session.control.f = new network.controller('dual', session.control.f)
            } else if (param.role === 'passive') {
              const hold0 = session.control[0]
              const hold1 = session.control[1]
              session.control[2] = new network.controller('local', hold0)
              session.control[3] = new network.controller('local', hold1)
              session.control[0] = new network.controller('remote', controller_config)
              session.control[1] = new network.controller('remote', controller_config)
              session.control.my_offset = 2
              session.control.length = 4
              session.control.f = new network.controller('dual', session.control.f)
            }
            network.transfer(
              'session', // name
              function () { // send
                return {
                  player: settings.player
                }
              },
              function (info) { // receive
                if (param.role === 'active') {
                  session.player[0] = settings.player[0]
                  session.player[1] = settings.player[1]
                  session.player[2] = info.player[0]
                  session.player[3] = info.player[1]
                } else if (param.role === 'passive') {
                  session.player[0] = info.player[0]
                  session.player[1] = info.player[1]
                  session.player[2] = settings.player[0]
                  session.player[3] = settings.player[1]
                }
                manager.UI_list.settings.keychanger.call(manager.UI_list.settings)
                util.queryUI('network_game_back').innerHTML = 'OK'
              })
            break
          case 'close':
            manager.alert('peer disconnected')
            break
          case 'log':
            console.log(mess)
            util.queryUI('network_status_log').textContent += mess + '\n'
            break
          case 'error':
            manager.alert(mess)
            break
          case 'sync_error':
            manager.alert('FATAL: synchronization error')
            break
        }
      }
    }
    network.setup({
      server: server,
      param: param
    }, handler)
  }
  this.UI_list =
  {
    frontpage:
    {
      bgcolor: pack.data.UI.data.frontpage.bg_color,
      create: function () {
        const content = util.queryUI('frontpage_content')
        content.classList.add('frontpage_bg')

        const title = document.createElement('div')
        title.className = 'frontpage_title'
        title.textContent = pack.data.UI.data.frontpage.title
        content.appendChild(title)

        if (pack.data.UI.data.frontpage.subtitle) {
          const subtitle = document.createElement('span')
          subtitle.className = 'frontpage_subtitle'
          subtitle.textContent = pack.data.UI.data.frontpage.subtitle
          title.appendChild(subtitle)
        }

        const menu = this._buildMenu('frontpage_menu', 'frontpage_menu_item',
          pack.data.UI.data.frontpage.menu, (i) => this._onMenuClick(i))
        content.appendChild(menu)
        // default-select the first main menu item on load
        this._setActive(menu.getElementsByClassName('frontpage_menu_item')[0], 'frontpage_menu_item')

        // game start mode menu (shown when "game start" is clicked)
        const modeMenu = this._buildMenu('frontpage_mode_menu', 'frontpage_mode_item',
          pack.data.UI.data.frontpage.mode_menu, (i) => this._onModeClick(i))
        modeMenu.style.display = 'none'
        content.appendChild(modeMenu)
      },
      _buildMenu: function (menuClass, itemClass, labels, onClick) {
        const menu = document.createElement('div')
        menu.className = menuClass
        for (let i = 0; i < labels.length; i++) {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = itemClass
          btn.textContent = labels[i]
          btn.addEventListener('mouseenter', () => this._setActive(btn, itemClass))
          btn.addEventListener('mouseleave', () => this._setActive(null, itemClass))
          btn.addEventListener('click', () => onClick(i))
          menu.appendChild(btn)
        }
        return menu
      },
      _setActive: function (btn, itemClass) {
        const items = util.queryUI('frontpage_content').getElementsByClassName(itemClass)
        for (const el of items) {
          el.classList.toggle('active', el === btn)
        }
      },
      _showMenu: function (menuName) {
        const content = util.queryUI('frontpage_content')
        const showMain = menuName === 'main'
        const mainMenu = content.getElementsByClassName('frontpage_menu')[0]
        const modeMenu = content.getElementsByClassName('frontpage_mode_menu')[0]
        if (mainMenu) mainMenu.style.display = showMain ? '' : 'none'
        if (modeMenu) modeMenu.style.display = showMain ? 'none' : ''
      },
      menuActions: [
        function () { this._showMenu('mode') }, // game start
        function () { // network game
          if (window.location.href.indexOf('http') === 0) {
            manager.switch_UI('network_game')
          } else {
            manager.alert('network game must run under http://')
          }
        },
        'settings', // control settings
        function () { manager.switch_UI('recording') }, // recording info
        function () { window.open('https://lf2.net', '_blank') }, // official website
      ],
      modeActions: [
        function () { manager.start_game() }, // VS mode
        function () { manager.start_stage_mode() }, // Stage mode
        function () { manager.start_championship(2) }, // 1 on 1 Championship
        function () { manager.start_championship(3) }, // 2 on 2 Championship
        function () { manager.start_battle_mode() }, // Battle mode
        function () { manager.switch_UI('demo_setup') }, // Demo
        function () { manager.playback_recording() }, // Playback Recording
        function () { this._showMenu('main') }, // Quit
      ],
      _onMenuClick: function (index) {
        this._dispatch(this.menuActions[index])
      },
      _onModeClick: function (index) {
        this._dispatch(this.modeActions[index])
      },
      _dispatch: function (action) {
        if (!action) return
        if (typeof action === 'function') {
          action.call(this)
        } else {
          manager.switch_UI(action)
        }
      },
      onactive: function () {
        this.demax(!window_state.maximized)
        // reset to the main menu when returning to the frontpage
        this._showMenu('main')
      },
      deactive: function () {
        this.demax(true)
      },
      demax: function (demax) {
        if (!demax) // maximize
        {
          let holder = util.queryUI('frontpage')
          holder.parentNode.removeChild(holder)
          holder.classList.add('maximized')
          util.root.insertBefore(holder, util.root.firstChild)
          hide(util.queryUI('window'))
          const canx = window.innerWidth / 2 - parseInt(window.getComputedStyle(util.queryUI('frontpage_content'), null).getPropertyValue('width')) / 2
          if (canx < 0) {
            util.queryUI('frontpage_content').style.left = canx + 'px'
          }
        } else // demaximize
        {
          let holder = util.queryUI('frontpage')
          holder.parentNode.removeChild(holder)
          holder.classList.remove('maximized')
          util.queryUI('window').insertBefore(holder, util.queryUI('window').firstChild)
          show(util.queryUI('window'))
          util.queryUI('frontpage_content').style.left = ''
        }
      }
    },
    settings:
    {
      bgcolor: pack.data.UI.data.settings.bg_color,
      create: function () {
        const section = util.queryUI('settings')
        section.classList.add('settings_bg')

        const title = document.createElement('div')
        title.className = 'settings_title'
        title.textContent = pack.data.UI.data.settings.title
        section.appendChild(title)

        const ok = document.createElement('button')
        ok.type = 'button'
        ok.className = 'settings_ok'
        ok.textContent = pack.data.UI.data.settings.ok
        ok.addEventListener('click', () => manager.switch_UI('frontpage'))
        section.appendChild(ok)

        const cancel = document.createElement('button')
        cancel.type = 'button'
        cancel.className = 'settings_cancel'
        cancel.textContent = pack.data.UI.data.settings.cancel
        cancel.addEventListener('click', () => manager.switch_UI('frontpage'))
        section.appendChild(cancel)

        this.keychanger.call(this)
      },
      keychanger: function () {
        const existing = util.queryUI('keychanger')
        if (existing) {
          existing.parentNode.removeChild(existing)
        }
        const keychanger = document.createElement('div')
        keychanger.className = 'keychanger'
        util.queryUI('settings').appendChild(keychanger)
        const brbr = create_at(keychanger, 'br')
        const table = create_at(keychanger, 'table')
        const row = []
        let change_active = false
        const column = this.column = []
        // Display labels for the control config keys, matching the official LF2 panel.
        const control_labels = {
          up: 'Up (上)',
          down: 'Down (下)',
          left: 'Left (左)',
          right: 'Right (右)',
          att: 'Attack (攻)',
          jump: 'Jump (跳)',
          def: 'Defend (守)'
        }

        table.style.display = 'inline-block'
        for (let r = 0; r < 9; r++) {
          row[r] = create_at(table, 'tr')
        }
        let labelRow = 0
        left_cell(row[labelRow++], 'name')
        left_cell(row[labelRow++], 'type')
        for (const control_name in settings.control[0].config) {
          left_cell(row[labelRow++], control_labels[control_name] || control_name)
        }
        for (let i = 0; i < session.control.length; i++) {
          column[i] = new Control(i)
        }

        function Control(num) {
          const This = this
          const name = right_cell(row[0], '')
          const type = right_cell(row[1], '')
          const cells = {}
          let i = 2
          for (const I in settings.control[0].config) {
            cells[I] = add_changer(row[i++], I)
          }
          this.update = update
          update()
          if (session.control[num].role === undefined) {
            name.onclick = function () {
              name.innerHTML = settings.player[num - session.control.my_offset].name = (prompt('Enter player name:', name.innerHTML) || name.innerHTML)
            }
          }
          function add_changer(R, name) {
            const cell = right_cell(R, '')
            let target
            cell.onclick = function () {
              if (session.control[num].type === 'keyboard') {
                if (!change_active) {
                  change_active = true
                  target = this
                  target.style.color = '#FFF'
                  target.style.backgroundColor = '#5670C7'
                  document.addEventListener('keydown', keydown, true)
                } else {
                  if (target) {
                    target.style.color = ''
                    target.style.backgroundColor = ''
                    target = null
                    change_active = false
                  }
                  document.removeEventListener('keydown', keydown, true)
                }
              }
            }
            function keydown(e) {
              const con = session.control[num]
              const value = e.keyCode
              cell.innerHTML = inputController.keycode_to_keyname(value)
              con.config[name] = inputController.keycode_to_keyname(value)
              con.keycode[name] = value
              target.style.color = ''
              target.style.backgroundColor = ''
              change_active = false
              document.removeEventListener('keydown', keydown, true)
            }
            return cell
          }
          function update() {
            const con = session.control[num]
            name.innerHTML = session.player[num].name
            type.innerHTML = con.role === 'remote' ? 'network' : con.type
            for (const I in cells) {
              cells[I].innerHTML = con.config[I]
            }
          }
          if (session.control[num].role === undefined) {
            type.onclick = function () {
              if (session.control[num].type === 'keyboard') { // switch to touch
                settings.control[num].type = 'touch'
                session.control[num] = controllers.touch.c
                session.control.f = controllers.touch.f
              } else { // switch to keyboard
                settings.control[num].type = 'keyboard'
                session.control[num] = controllers.keyboard['c' + num]
                session.control.f = controllers.keyboard.f
              }
              update()
            }
          }
        }

        function create_at(parent, tag, id) {
          const E = document.createElement(tag)
          parent.appendChild(E)
          if (id) {
            E.id = id
          }
          return E
        }

        function add_cell(row, content) {
          const td = create_at(row, 'td')
          td.innerHTML = content
          return td
        }
        function left_cell(A, B) {
          const cell = add_cell(A, B)
          cell.className = 'left_cell'
          return cell
        }
        function right_cell(A, B) {
          const cell = add_cell(A, B)
          cell.style.cursor = 'pointer'
          return cell
        }
      },
      onactive: function () {
        for (let i = 0; i < this.column.length; i++) {
          this.column[i].update()
        }
      }
    },
    recording:
    {
      bgcolor: pack.data.UI.data.recording.bg_color,
      create: function () {
        const section = util.queryUI('recording')
        section.classList.add('recording_bg')

        const title = document.createElement('div')
        title.className = 'recording_title'
        title.textContent = pack.data.UI.data.recording.title
        section.appendChild(title)

        const form = document.createElement('div')
        form.className = 'recording_form'
        section.appendChild(form)

        const nameInput = this._field(form, pack.data.UI.data.recording.name, settings.recording_name)
        const infoInput = this._field(form, pack.data.UI.data.recording.info, settings.recording_info)
        const emailInput = this._field(form, pack.data.UI.data.recording.email, settings.recording_email)

        const turnOn = document.createElement('label')
        turnOn.className = 'recording_turn_on'
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'recording_checkbox'
        checkbox.checked = settings.record
        turnOn.appendChild(checkbox)
        turnOn.appendChild(document.createTextNode(' ' + pack.data.UI.data.recording.turn_on))
        form.appendChild(turnOn)

        const ok = document.createElement('button')
        ok.type = 'button'
        ok.className = 'recording_ok'
        ok.textContent = pack.data.UI.data.recording.ok
        ok.addEventListener('click', function () {
          settings.recording_name = nameInput.value
          settings.recording_info = infoInput.value
          settings.recording_email = emailInput.value
          settings.record = checkbox.checked
          manager.switch_UI('frontpage')
        })
        section.appendChild(ok)
      },
      onactive: function () {
        // Allow typing in the name/info/email fields.
        inputController.block(false)
      },
      deactive: function () {
        inputController.block(true)
      },
      _field: function (form, label, value) {
        const row = document.createElement('label')
        row.className = 'recording_field'
        const text = document.createElement('span')
        text.className = 'recording_label'
        text.textContent = label
        const input = document.createElement('input')
        input.type = 'text'
        input.className = 'recording_input'
        input.value = value || ''
        row.appendChild(text)
        row.appendChild(input)
        form.appendChild(row)
        return input
      }
    },
    network_game:
    {
      bgcolor: pack.data.UI.data.network_game.bg_color,
      create: function () {
        const This = this
        const menu = util.queryUI('network_game_menu')
        menu.classList.add('network_game_panel')

        // Title
        const title = document.createElement('h2')
        title.className = 'network_game_title'
        title.textContent = 'Network Game (連線遊戲)'
        menu.appendChild(title)

        // Predefined servers
        for (const S in settings.server) {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'network_game_server'
          btn.textContent = S
          btn.onclick = (function (addr) { return function () {
            This.connect_to(addr)
          }})(settings.server[S])
          menu.appendChild(btn)
        }

        // Custom server
        const customLabel = document.createElement('label')
        customLabel.className = 'network_game_custom_label'
        customLabel.textContent = 'Custom Server (自訂伺服器)'
        menu.appendChild(customLabel)

        const addrInput = document.createElement('input')
        addrInput.type = 'url'
        addrInput.className = 'network_game_input'
        addrInput.placeholder = 'ws://myserver.com:8080'
        addrInput.value = This.last_value || ''
        menu.appendChild(addrInput)

        const connectBtn = document.createElement('button')
        connectBtn.type = 'button'
        connectBtn.className = 'network_game_connect'
        connectBtn.textContent = 'Connect'
        connectBtn.onclick = function () { This.connect_to(addrInput.value) }
        menu.appendChild(connectBtn)

        // Back
        const backBtn = document.createElement('button')
        backBtn.type = 'button'
        backBtn.className = 'network_game_back'
        backBtn.textContent = 'Back'
        backBtn.onclick = function () { manager.switch_UI('frontpage') }
        menu.appendChild(backBtn)

        // Status log
        const log = document.createElement('div')
        log.className = 'network_game_log'
        log.id = 'network_status_log'
        menu.appendChild(log)

        // Store refs
        this.menu = menu
        this.addrInput = addrInput
        this.connectBtn = connectBtn
        this.statusLog = log
        this.last_value = 'ws://localhost:8080'
      },
      connect_to: function(addr) {
        const This = this
        if (!addr) return
        addr = addr.replace(/\/$/, '')
        This.last_value = addr
        
        if (This.connecting) return
        This.statusLog.textContent = 'Connecting to ' + addr + '...'
        
        const request = new XMLHttpRequest()
        request.onreadystatechange = function() {
          if (this.readyState === 4) {
            This.connecting = false
            if (this.status === 200) {
              settings.server[addr] = addr
              This.statusLog.textContent = 'Connected! Opening lobby...'
              manager.UI_list.lobby.start({ address: addr })
              manager.switch_UI('lobby')
            } else {
              This.statusLog.textContent = '[' + this.status + '] Failed to connect'
            }
          }
        }
        request.open('GET', addr + '/protocol', true)
        request.responseType = 'text'
        request.timeout = 3000
        request.send()
        This.connecting = true
      },
      onactive: function () {
        inputController.block(false)
      },
      deactive: function () {
        inputController.block(true)
      }
    },
    lobby:
    {
      start: function (server) {
        const iframe = util.queryUI('lobby_window')
        iframe.src = server.address + '/lobby'
        iframe.onload = function () {
          iframe.contentWindow.postMessage({
            init: true,
            protocol: 'LF2 Online 0.1',
            room: 'LF2 Online'
          }, server.address)
        }
        util.queryUI('lobby', 'close_button').onclick = function () {
          manager.switch_UI('network_game')
        }
        // cross window communication
        window.addEventListener('message', windowMessage, false)
        function windowMessage(event) {
          if (event.origin !== server.address) {
            return
          }
          if (event.data.event === 'start') {
            create_network_controllers(server, event.data)
            util.queryUI('network_game_connect').onclick = null
            util.queryUI('network_game_connect').innerHTML = '|'
            manager.switch_UI('network_game')
          }
        }
      }
    },
    character_selection:
    {
      bgcolor: pack.data.UI.data.character_selection.bg_color,
      onactive: function () {
        if (session.control.f.paused) {
          session.control.f.paused(true)
        }
        // show the on-screen touch controls only on touch devices (P1 is
        // switched to touch by the first touchstart), so the d-pad is usable
        // during character selection without appearing on desktop
        if (settings.control[0].type === 'touch') {
          controllers.touch.c.show()
          TouchController.enable(true)
        }
      },
      deactive: function () {
        if (session.control.f.paused) {
          session.control.f.paused(false)
        }
      },
      create: function () {
        this.state =
        {
          t: 0,
          step: 0,
          setting_computer: -1
        }

        const bg = new spriteDOM({
          canvas: util.queryUI('character_selection'),
          img: pack.data.UI.data.character_selection.pic,
          wh: 'fit'
        })

        const players = this.players = []
        for (let i = 0; i < 8; i++) {
          // sprite & animator
          const sp = new spriteDOM({
            canvas: util.queryUI('character_selection'),
            img: img_list,
            xywh: {
              x: sel.posx[i % 4],
              y: sel.posy[i - i % 4],
              w: sel.box_width,
              h: sel.box_height
            }
          })
          const ani_config =
          {
            x: 0,
            y: 0, // top left margin of the frames
            w: sel.box_width,
            h: sel.box_height, // width, height of a frame
            gx: 10,
            gy: 1, // define a gx*gy grid of frames
            tar: sp // target sprite
          }
          const ani = new animator(ani_config)
          // text boxes
          const textbox = []
          for (let j = 0; j < 3; j++) {
            textbox.push(createTextBox({
              canvas: util.queryUI('character_selection'),
              xywh: {
                x: sel.posx[i % 4],
                y: sel.posy[i - i % 4 + j + 1],
                w: sel.text.box_width,
                h: sel.text.box_height
              }
            }))
          }
          //
          this.players.push({
            sp: sp,
            ani: ani,
            textbox: textbox
          })
        }

        this.dialog = new VerticalMenuDialog({
          canvas: util.queryUI('character_selection'),
          data: pack.data.UI.data.vs_mode_dialog,
          html: true,
          valueCounts: [0, 0, 0, bg_list.length, diff_list.length, 0],
          valueText: (i, v) => {
            if (i === 3) return bg_list[v - 1].name   // background: v=0 → bg_list[-1] "Random"
            if (i === 4) return diff_list[v]          // difficulty
            return ""
          }
        })
        this.how_many = new HorizontalNumberDialog({
          canvas: util.queryUI('character_selection'),
          data: pack.data.UI.data.how_many_computer_players
        })
        this.options = {}

        this.steps = [
          { // step 0
            // human players select characters
            key: function (i, key) {
              switch (key) {
                case 'att':
                  if (manager._championship_pending && i !== 0) return  // championship: only P1 joins
                  players[i].use = true
                  players[i].type = 'human'
                  players[i].name = session.player[i] ? session.player[i].name : ''
                  players[i].step < 3 ? players[i].step++ : null
                  let finished = true
                  for (let k = 0; k < players.length; k++) {
                    finished = finished && (players[k].use ? players[k].step === 3 : true)
                  }
                  if (finished) {
                    if (manager._stage_mode_pending || manager._battle_mode_pending || manager._championship_pending) {
                      this.set_step(3) // skip computer setup, go to stage/battle/championship setup
                    } else {
                      this.set_step(1)
                    }
                  }
                  manager.sound.play('1/m_join')
                  break
                case 'jump':
                  if (players[i].step > 0) {
                    players[i].step--
                    if (players[i].step === 0) {
                      players[i].use = false
                    }
                  }
                  manager.sound.play('1/m_cancel')
                  break
                case 'right':
                  if (players[i].step === 1) {
                    players[i].selected++
                    if (players[i].selected >= char_list.length) {
                      players[i].selected = -1
                    }
                  }
                  if (players[i].step === 2) {
                    players[i].team++
                    if (manager._battle_mode_pending) {
                      if (players[i].team > 2) players[i].team = 1
                    } else if (players[i].team > 4) {
                      players[i].team = 0
                    }
                  }
                  break
                case 'left':
                  if (players[i].step === 1) {
                    players[i].selected--
                    if (players[i].selected < -1) {
                      players[i].selected = char_list.length - 1
                    }
                  }
                  if (players[i].step === 2) {
                    players[i].team--
                    if (manager._battle_mode_pending) {
                      if (players[i].team < 1) players[i].team = 2
                    } else if (players[i].team < 0) {
                      players[i].team = 4
                    }
                  }
                  break
              }
            },
            show: function () {
              for (let i = 0; i < players.length; i++) {
                switch (players[i].step) {
                  case 0:
                    players[i].textbox[0].innerHTML = 'Join?'
                    players[i].textbox[1].innerHTML = ''
                    players[i].textbox[2].innerHTML = ''
                    players[i].sp.switch_img('waiting')
                    break
                  case 1:
                    players[i].textbox[0].style.color = static_color(i)
                    players[i].textbox[0].innerHTML = players[i].name
                    players[i].textbox[1].innerHTML = char_list[players[i].selected].name
                    players[i].textbox[2].innerHTML = ''
                    players[i].ani.rewind()
                    players[i].sp.switch_img(players[i].selected)
                    break
                  case 2:
                    players[i].textbox[1].style.color = static_color(i)
                    players[i].textbox[2].innerHTML = players[i].team === 0 ? 'Independent' : 'Team ' + players[i].team
                    break
                  case 3:
                    players[i].textbox[2].style.color = static_color(i)
                    break
                }
              }
            },
            enter: function () {
              for (let i = 0; i < players.length; i++) {
                players[i].sp.show()
                for (let j = 0; j < players[i].textbox.length; j++) {
                  show(players[i].textbox[j])
                }
              }
            },
            leave: function () {
              for (let i = 0; i < players.length; i++) {
                if (!players[i].use) {
                  players[i].sp.hide()
                  for (let j = 0; j < players[i].textbox.length; j++) {
                    hide(players[i].textbox[j])
                  }
                } else {
                  players[i].textbox[players[i].textbox.length - 1].style.color = static_color(i)
                }
              }
            }
          },
          {
            // step 1
            // how many computers
            key: function (i, key) {
              switch (key) {
                case 'att':
                  this.state.num_of_computers = parseInt(this.how_many.active_item)
                  this.set_step(2)
                  break
                case 'left':
                  this.how_many.navLeft()
                  break
                case 'right':
                  this.how_many.navRight()
                  break
              }
            },
            show: function () {
            },
            enter: function () {
              let low = 0; let high
              let used = 0
              for (let i = 0; i < players.length; i++) {
                if (players[i].use) {
                  used++
                }
              }
              high = players.length - used
              let same_team = true
              let last_item
              for (let i = 0; i < players.length; i++) {
                if (players[i].use) {
                  if (last_item === undefined) {
                    last_item = i
                  } else {
                    same_team = same_team && players[i].team === players[last_item].team && players[i].team !== 0
                  }
                }
              }
              if (same_team) {
                low = 1
              }
              this.how_many.init(low, high)
              this.how_many.show()
            },
            leave: function () {
              this.how_many.hide()
            }
          },
          { // step 2
            // select computers
            key: function step1_key(i, key) {
              switch (key) {
                case 'att':
                  i = this.state.setting_computer
                  players[i].step++
                  if (players[i].step === 3) {
                    this.state.already_set_computer++
                    this.steps[this.state.step].next_computer_slot.call(this)
                  }
                  manager.sound.play('1/m_join')
                  break
                case 'jump':
                  i = this.state.setting_computer
                  if (players[i].step > 0) {
                    players[i].step--
                  }
                  manager.sound.play('1/m_cancel')
                  break
                case 'right':
                  i = this.state.setting_computer
                  if (players[i].step === 1) {
                    players[i].selected++
                    if (players[i].selected >= char_list.length) {
                      players[i].selected = 0
                    }
                  }
                  if (players[i].step === 2) {
                    players[i].team++
                    if (players[i].team > 4) {
                      players[i].team = 0
                    }
                  }
                  break
                case 'left':
                  i = this.state.setting_computer
                  if (players[i].step === 1) {
                    players[i].selected--
                    if (players[i].selected < 0) {
                      players[i].selected = char_list.length - 1
                    }
                  }
                  if (players[i].step === 2) {
                    players[i].team--
                    if (players[i].team < 0) {
                      players[i].team = 4
                    }
                  }
                  break
              }
            },
            show: function () {
              for (let i = 0; i < players.length; i++) {
                switch (players[i].step) {
                  case 0:
                    players[i].name = AI_list[0].name
                    players[i].textbox[0].innerHTML = players[i].name
                    players[i].textbox[1].innerHTML = char_list[players[i].selected].name
                    players[i].textbox[2].innerHTML = ''
                    players[i].ani.rewind()
                    players[i].sp.switch_img(players[i].selected)
                    break
                  case 1:
                    players[i].textbox[0].style.color = static_color(i)
                    players[i].textbox[1].innerHTML = char_list[players[i].selected].name
                    players[i].textbox[2].innerHTML = ''
                    players[i].sp.switch_img(players[i].selected)
                    break
                  case 2:
                    players[i].textbox[1].style.color = static_color(i)
                    players[i].textbox[2].innerHTML = players[i].team === 0 ? 'Independent' : 'Team ' + players[i].team
                    break
                  case 3:
                    players[i].textbox[2].style.color = static_color(i)
                    break
                }
              }
            },
            enter: function () {
              this.state.already_set_computer = 0
              this.steps[this.state.step].next_computer_slot.call(this)
            },
            next_computer_slot: function () {
              if (this.state.num_of_computers === this.state.already_set_computer) {
                this.set_step(3)
                return
              }
              let next
              for (let i = 0; i < players.length; i++) {
                if (!players[i].use) {
                  next = i
                  break
                }
              }
              if (next !== undefined) {
                let i = this.state.setting_computer = next
                players[i].use = true
                players[i].step = 1 // skip the AI picker — "Computer" is the only AI
                players[i].selected_AI = 0
                players[i].type = 'computer'
                players[i].sp.show()
                for (let j = 0; j < players[i].textbox.length; j++) {
                  show(players[i].textbox[j])
                }
              }
            }
          },
          { // step 3
            // dialog menu
            key: function step2_key(i, key) {
              switch (key) {
                case 'att':
                  manager.sound.play('1/m_ok')
                  const active = this.dialog.active_item
                  if (active === 3) { this.dialog.cycleValue(3, 1); this._syncOptions(); return } // Background
                  if (active === 4) { this.dialog.cycleValue(4, 1); this._syncOptions(); return } // Difficulty
                  switch (active) {
                    case 0: manager.start_match({ players: this.players, options: this.options }); return // Fight!
                    case 1: this.reset(); return          // Reset All
                    case 2: this._resetRandom(); return   // Reset Random
                    case 5: manager.switch_UI('frontpage'); return // Exit
                  }
                case 'jump':
                  // cannot go back
                  break
                case 'up':
                  this.dialog.navUp()
                  break
                case 'down':
                  this.dialog.navDown()
                  break
                case 'left':
                  if (this.dialog.valueCounts[this.dialog.active_item]) {
                    this.dialog.cycleValue(this.dialog.active_item, -1)
                    this._syncOptions()
                  }
                  break
                case 'right':
                  if (this.dialog.valueCounts[this.dialog.active_item]) {
                    this.dialog.cycleValue(this.dialog.active_item, 1)
                    this._syncOptions()
                  }
                  break
              }
            },
            show: function () {
              this.dialog.show()
              for (let i = 0; i < players.length; i++) {
                switch (players[i].step) {
                  case 3:
                    players[i].textbox[2].style.color = static_color(i)
                    break
                }
              }
            },
            enter: function () {
              if (manager._championship_pending) {
                // Championship: skip VS dialog, auto-fill the bracket, go to shuffle screen
                manager._championship_pending = false
                manager._build_championship(players[0].selected)
                manager.switch_UI('championship')
                return
              }
              if (manager._battle_mode_pending) {
                // Battle mode: skip VS dialog, capture leaders, go to battle setup
                manager._battle_mode_pending = false
                manager._battle_leaders = players.filter(p => p.use).map(p => ({
                  name: p.name, type: p.type, selected: p.selected, team: p.team
                }))
                // Auto-fill the opponent team's leader (a random computer hero) so
                // both teams have a leader (official: "each team needs ≥1 hero").
                for (const team of [1, 2]) {
                  if (!manager._battle_leaders.some(L => L.team === team)) {
                    const idx = Math.floor(randomseed.next() * char_list.length)
                    manager._battle_leaders.push({ name: 'Computer', type: 'computer', selected: idx, team: team })
                  }
                }
                manager.switch_UI('battle_setup')
                return
              }
              if (manager._stage_mode_pending) {
                // In stage mode, skip VS dialog and go to stage select
                manager._stage_mode_pending = false
                // Store selected character info for stage use
                manager._stage_char_selected = players[0].selected
                manager._stage_char_name = players[0].name
                manager.switch_UI('stage_select')
                return
              }
              this.state.random_slot = {}
              for (let i = 0; i < players.length; i++) {
                if (players[i].selected === -1) {
                  this.state.random_slot[i] = true
                }
              }
              this.steps[this.state.step].update_random.call(this)
            },
            update_random: function () {
              for (let i in this.state.random_slot) {
                players[i].selected = Math.floor(randomseed.next() * char_list.length)
                players[i].textbox[1].innerHTML = char_list[players[i].selected].name
                players[i].sp.switch_img(players[i].selected)
              }
            }
          }
        ]

        this.reset()

        function static_color(i) {
          return players[i].type === 'human' ? sel.text.color[2] : sel.text.color[3]
        }
      },
      reset: function () {
        const players = this.players
        this.state.step = 0
        this.dialog.hide()
        this.dialog.activateItem(0)
        this.how_many.hide()
        for (let i = 0; i < players.length; i++) {
          players[i].use = false
          players[i].step = 0
          players[i].type = 'human'
          players[i].name = ''
          players[i].team = 0
          players[i].selected = -1
          players[i].selected_AI = 0
        }
        this.options.background = -1
        this.options.difficulty = 2
        this.dialog.setValue(3, 0) // background → Random (-1)
        this.dialog.setValue(4, 2) // difficulty → Difficult
        this.steps[this.state.step].show.call(this)
      },
      _syncOptions: function () {
        this.options.background = this.dialog.getValue(3) - 1 // value 0 → -1 (Random)
        this.options.difficulty = this.dialog.getValue(4)
      },

      _resetRandom: function () {
        this.state.random_slot = {}
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].selected === -1) this.state.random_slot[i] = true
        }
        this.steps[this.state.step].update_random.call(this)
      },
      key: function (controller_num, key) {
        const players = this.players
        const i = controller_num
        if (this.state.step > 0 && players[i].type !== 'human') {
          return
        }
        this.steps[this.state.step].key.call(this, i, key)
        this.steps[this.state.step].show.call(this)
      },
      set_step: function (newstep) {
        if (this.steps[this.state.step].leave) {
          this.steps[this.state.step].leave.call(this)
        }
        this.state.step = newstep
        if (this.steps[this.state.step].enter) {
          this.steps[this.state.step].enter.call(this)
        }
      },
      frame: function () {
        const players = this.players
        const t = this.state.t
        for (let i in players) {
          switch (players[i].step) {
            case 0:
              if (this.state.step === 0) {
                players[i].ani.set_frame(t % 2)
              }
              players[i].textbox[0].style.color = sel.text.color[t % 2]
              break
            case 1:
              players[i].textbox[1].style.color = sel.text.color[t % 2]
              break
            case 2:
              players[i].textbox[2].style.color = sel.text.color[t % 2]
              break
          }
        }
        for (let i = 0; i < session.control.length; i++) {
          session.control[i].fetch()
        }
        manager.sound.TU()
        this.state.t++
      }
    },
      stage_select:
      {
        bgcolor: '#10206c',
        create: function () {
          const section = util.queryUI('stage_select')
          section.classList.add('stage_select_bg')

          this.dialog = new VerticalMenuDialog({
            canvas: util.queryUI('stage_select'),
            data: pack.data.UI.data.stage_mode_dialog,
            mousehover: true,
            html: true,
            valueCounts: [0, 0, 0, 6, diff_list.length, 0],
            valueText: (i, v) => {
              if (i === 3) return v === 5 ? "Survival" : String(v + 1)  // Stage 1-5, Survival
              if (i === 4) return diff_list[v]     // Difficulty
              return ""
            },
            onclick: (function (self) {
              return function (I) { self._activate(I) }
            })(this)
          })
          this.dialog.setValue(4, 2) // default difficulty: Difficult
        },
        _activate: function (I) {
          switch (I) {
            case 0: // Fight!
              manager.start_stage_match(this.dialog.getValue(3) * 5, 3, this.dialog.getValue(4))
              break
            case 1: // Reset All -> re-pick character
              manager.switch_UI('character_selection')
              break
            case 2: // Reset Random (not applicable in stage mode)
              manager.alert('reset random is not available in stage mode')
              break
            case 3: // Stage value
              this.dialog.cycleValue(3, 1)
              break
            case 4: // Difficulty value
              this.dialog.cycleValue(4, 1)
              break
            case 5: // Exit
              manager.switch_UI('frontpage')
              break
          }
        },
        onactive: function () {
          inputController.block(false)
          this._keyHandler = (e) => {
            switch (e.key) {
              case 'ArrowUp':
              case 'w':
              case 'W':
                e.preventDefault()
                this.dialog.navUp()
                break
              case 'ArrowDown':
              case 'x':
              case 'X':
                e.preventDefault()
                this.dialog.navDown()
                break
              case 'ArrowLeft':
              case 'a':
              case 'A':
                e.preventDefault()
                if (this.dialog.valueCounts[this.dialog.active_item]) {
                  this.dialog.cycleValue(this.dialog.active_item, -1)
                }
                break
              case 'ArrowRight':
              case 'd':
              case 'D':
                e.preventDefault()
                if (this.dialog.valueCounts[this.dialog.active_item]) {
                  this.dialog.cycleValue(this.dialog.active_item, 1)
                }
                break
              case 'Enter':
              case 's':
              case 'S':
                e.preventDefault()
                this._activate(this.dialog.active_item)
                break
              case 'Escape':
                manager.switch_UI('frontpage')
                break
            }
          }
          document.addEventListener('keydown', this._keyHandler)
        },
        deactive: function () {
          inputController.block(true)
          if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler)
        }
      },
      battle_setup:
      {
        bgcolor: '#000000',
        create: function () {
          const section = util.queryUI('battle_setup')
          section.classList.add('battle_setup_bg')
          if (!manager._battle_config) {
            manager._battle_config = {
              teams: {
                1: { defense: 0, preset: 2 },  // Team 1: ×1.0, Balanced (M)
                2: { defense: 0, preset: 5 }   // Team 2: ×1.0, Inferior (M)
              },
              selectedTeam: 1
            }
          }
          this._build()
        },
        _unitSprite: function (id) {
          // Follower portraits are mooks (30-39) + items (122/123), which are NOT
          // in char_list (heroes only). Search the full character object list.
          const c = util.selectAll(pack.data.object, { type: 'character' }).find(ch => ch && ch.id === id)
          return c && c.pic ? spriteRenderer.resolve_resource(c.pic.replace('_f.png', '_s.png')) : ''
        },
        _build: function () {
          const section = util.queryUI('battle_setup')
          section.innerHTML = ''
          const cfg = manager._battle_config
          const panel = document.createElement('div')
          panel.className = 'battle_panel'
          section.appendChild(panel)

          const col1 = this._build_team(1, cfg.teams[1], cfg.selectedTeam === 1)
          const col2 = this._build_team(2, cfg.teams[2], cfg.selectedTeam === 2)
          panel.appendChild(col1)
          panel.appendChild(col2)

          const divider = document.createElement('div')
          divider.className = 'battle_divider'
          panel.appendChild(divider)

          const ok = document.createElement('button')
          ok.type = 'button'
          ok.className = 'battle_ok'
          ok.textContent = 'OK! (確定)'
          ok.addEventListener('click', () => this._start())
          panel.appendChild(ok)
        },
        _build_team: function (team, t, selected) {
          const col = document.createElement('div')
          col.className = 'battle_column' + (selected ? ' selected' : '')
          col.style.left = (team === 1 ? 0 : 351) + 'px'

          // Team header (flag + name)
          const header = document.createElement('div')
          header.className = 'battle_team_header'
          const flag = document.createElement('span')
          flag.className = 'battle_flag'
          flag.style.background = team === 1 ? '#4A7BD0' : '#E04040'
          header.appendChild(flag)
          const title = document.createElement('span')
          title.className = 'battle_team_title'
          title.textContent = 'Team ' + team + '（第' + (team === 1 ? '一' : '二') + '組）'
          header.appendChild(title)
          col.appendChild(header)

          // Hero section
          const heroLabel = document.createElement('div')
          heroLabel.className = 'battle_label'
          heroLabel.textContent = 'Hero (英雄)'
          col.appendChild(heroLabel)
          const heroRow = document.createElement('div')
          heroRow.className = 'battle_hero_row'
          const leaders = (manager._battle_leaders || []).filter(L => L.team === team)
          for (let i = 0; i < 4; i++) {
            const L = leaders[i]
            const slot = document.createElement('div')
            slot.className = 'battle_hero_slot'
            if (L) {
              const sel = (L.selected >= 0 && char_list[L.selected]) ? char_list[L.selected] : null
              if (sel && sel.pic) {
                const img = document.createElement('img')
                img.className = 'battle_hero_sprite'
                img.src = spriteRenderer.resolve_resource(sel.pic.replace('_f.png', '_s.png'))
                slot.appendChild(img)
              }
              const letter = document.createElement('div')
              letter.className = 'battle_letter'
              letter.textContent = L.type === 'human' ? 'I' : 'C'
              slot.appendChild(letter)
            }
            heroRow.appendChild(slot)
          }
          col.appendChild(heroRow)

          // Defense value
          const defense = document.createElement('div')
          defense.className = 'battle_defense'
          defense.textContent = 'Defense (防守力): '
          const dv = document.createElement('span')
          dv.className = 'battle_value_box'
          dv.textContent = '×' + battle_defenses[t.defense]
          defense.appendChild(dv)
          col.appendChild(defense)

          // Follower section
          const followerLabel = document.createElement('div')
          followerLabel.className = 'battle_label'
          followerLabel.textContent = 'Follower (士兵)'
          const diff = document.createElement('span')
          diff.className = 'battle_diff'
          diff.textContent = battle_presets[t.preset].name
          followerLabel.appendChild(diff)
          col.appendChild(followerLabel)
          const grid = document.createElement('div')
          grid.className = 'battle_follower_grid'
          const presetUnits = battle_presets[t.preset].units
          for (const type of battle_unit_types) {
            const u = presetUnits.find(p => p.id === type.id) || { id: type.id, in: 0, reserve: 0 }
            const cell = document.createElement('div')
            cell.className = 'battle_follower'
            if (type.id >= 100) {
              // Drink item (Milk 122 / Beer 123): render the weapon sprite's first frame.
              const sheet = type.id === 122 ? 'sprite/weapon6.png' : 'sprite/weapon8.png'
              const box = document.createElement('div')
              box.className = 'battle_follower_sprite battle_follower_drink'
              box.style.backgroundImage = 'url(' + spriteRenderer.resolve_resource(sheet) + ')'
              box.style.backgroundSize = '490px 198px'
              box.style.backgroundPosition = '0 0'
              cell.appendChild(box)
            } else {
              const img = document.createElement('img')
              img.className = 'battle_follower_sprite'
              img.src = this._unitSprite(type.id)
              cell.appendChild(img)
            }
            const counts = document.createElement('div')
            counts.className = 'battle_follower_counts'
            const top = document.createElement('span')
            top.className = 'battle_value_box'
            top.textContent = u.in
            counts.appendChild(top)
            const bottom = document.createElement('span')
            bottom.className = 'battle_value_box'
            bottom.textContent = u.reserve
            counts.appendChild(bottom)
            cell.appendChild(counts)
            grid.appendChild(cell)
          }
          col.appendChild(grid)

          // Use default setting
          const useDefault = document.createElement('button')
          useDefault.type = 'button'
          useDefault.className = 'battle_use_default'
          useDefault.textContent = 'Use default setting (使用預設編排)'
          useDefault.addEventListener('click', () => {
            t.preset = 2  // Balanced (M)
            t.defense = 0
            this._build()
          })
          col.appendChild(useDefault)

          return col
        },
        _start: function () {
          manager.start_battle_match()
        },
        onactive: function () {
          inputController.block(false)
          this._build()
          this._keyHandler = (e) => {
            const cfg = manager._battle_config
            switch (e.key) {
              case 'a': case 'A': case 'ArrowLeft':
                e.preventDefault(); cfg.selectedTeam = 1; this._build(); break
              case 'd': case 'D': case 'ArrowRight':
                e.preventDefault(); cfg.selectedTeam = 2; this._build(); break
              case 'w': case 'W': case 'ArrowUp':
                e.preventDefault()
                cfg.teams[cfg.selectedTeam].defense = (cfg.teams[cfg.selectedTeam].defense + 1) % battle_defenses.length
                this._build()
                break
              case 'x': case 'X': case 'ArrowDown':
                e.preventDefault()
                cfg.teams[cfg.selectedTeam].defense = (cfg.teams[cfg.selectedTeam].defense + battle_defenses.length - 1) % battle_defenses.length
                this._build()
                break
              case 'q': case 'Q':
                e.preventDefault()
                cfg.teams[cfg.selectedTeam].preset = (cfg.teams[cfg.selectedTeam].preset + 1) % battle_presets.length
                this._build()
                break
              case 's': case 'S': case 'Enter':
                e.preventDefault(); this._start(); break
              case 'Escape':
                manager.switch_UI('frontpage'); break
            }
          }
          document.addEventListener('keydown', this._keyHandler)
        },
        deactive: function () {
          inputController.block(true)
          if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler)
        }
      },
      championship:
      {
        bgcolor: '#000000',
        create: function () {
          const section = util.queryUI('championship')
          section.classList.add('stage_select_bg')
          this._build()
        },
        _build: function () {
          const section = util.queryUI('championship')
          section.innerHTML = ''
          const ch = manager._championship
          if (!ch) return

          const panel = document.createElement('div')
          panel.className = 'championship_panel'

          const title = document.createElement('div')
          title.className = 'championship_title'
          title.textContent = ch.mode === 2 ? '1 on 1 Championship（淘汰賽）' : '2 on 2 Championship（淘汰賽）'
          panel.appendChild(title)

          panel.appendChild(this._build_bracket_svg(ch))

          const ents = document.createElement('div')
          ents.className = 'championship_entrants'
          for (let i = 0; i < ch.entrants.length; i++) {
            const e = ch.entrants[i]
            const entry = document.createElement('div')
            entry.className = 'championship_entrant'
            const members = e.members || [e]
            if (e.members && e.label) {
              // 2on2: team label, colored (blue/red/green/yellow).
              const label = document.createElement('div')
              label.className = 'championship_team_label'
              label.style.color = e.color
              label.textContent = e.label
              entry.appendChild(label)
            }
            const spritesRow = document.createElement('div')
            spritesRow.className = 'championship_sprites_row'
            for (const m of members) {
              const img = document.createElement('img')
              img.className = 'championship_sprite'
              if (m.small) img.src = spriteRenderer.resolve_resource(m.small)
              spritesRow.appendChild(img)
            }
            entry.appendChild(spritesRow)
            const letter = document.createElement('div')
            letter.className = 'championship_letter'
            letter.textContent = members.map(m => (m.isHuman ? 'I' : 'C')).join(' ')
            // Letter color: team color for 2on2, light blue for 1on1.
            letter.style.color = e.color || '#6C86D5'
            entry.appendChild(letter)
            ents.appendChild(entry)
          }
          panel.appendChild(ents)

          // Winner panel (post-match): champion portrait + "Winner/優勝者".
          if (ch.winner) {
            const wp = document.createElement('div')
            wp.className = 'championship_winner_panel'
            const wname = document.createElement('div')
            wname.className = 'championship_winner_name'
            wname.textContent = this._champ_name(ch.winner)
            wp.appendChild(wname)
            const members = ch.winner.members ? ch.winner.members : [ch.winner]
            for (const m of members) {
              const img = document.createElement('img')
              img.className = 'championship_winner_portrait'
              if (m.head) img.src = spriteRenderer.resolve_resource(m.head)
              wp.appendChild(img)
            }
            const wlabel = document.createElement('div')
            wlabel.className = 'championship_winner_label'
            wlabel.textContent = 'Winner 優勝者'
            wp.appendChild(wlabel)
            section.appendChild(wp)
          }

          section.appendChild(panel)
        },
        _build_bracket_svg: function (ch) {
          const SVG_NS = 'http://www.w3.org/2000/svg'
          const svg = document.createElementNS(SVG_NS, 'svg')
          svg.setAttribute('class', 'championship_bracket')
          svg.setAttribute('viewBox', '0 0 530 330')

          const X0 = 20, X1 = 510
          const n = ch.entrants.length
          const span = (X1 - X0) / n
          const LEAF_Y = 215
          const WINNER_Y = 77
          const rounds = Math.log2(n)
          const roundHeight = (LEAF_Y - WINNER_Y) / rounds

          const leafX = []
          for (let i = 0; i < n; i++) leafX.push(X0 + (i + 0.5) * span)

          const winnerText = document.createElementNS(SVG_NS, 'text')
          winnerText.setAttribute('x', String((X0 + X1) / 2))
          winnerText.setAttribute('y', String(WINNER_Y - 12))
          winnerText.setAttribute('text-anchor', 'middle')
          winnerText.setAttribute('class', 'championship_bracket_text')
          // "Winner" color: lavender in 2on2, light blue in 1on1 (sampled from 17.gif/16.gif).
          winnerText.setAttribute('fill', ch.mode === 3 ? '#817FB7' : '#6C86D5')
          winnerText.textContent = 'Winner'
          svg.appendChild(winnerText)

          // Single-elimination tree: leaves at the bottom, converge up to the winner.
          let level = leafX.slice()
          let y = LEAF_Y
          while (level.length > 1) {
            const nextY = y - roundHeight
            for (const x of level) svg.appendChild(this._line(SVG_NS, x, y, x, nextY))
            const next = []
            for (let i = 0; i < level.length; i += 2) {
              const a = level[i], b = level[i + 1]
              svg.appendChild(this._line(SVG_NS, a, nextY, b, nextY))
              next.push((a + b) / 2)
            }
            level = next
            y = nextY
          }
          // Champion → winner label
          svg.appendChild(this._line(SVG_NS, level[0], y, level[0], WINNER_Y - 4))
          // Winner path (post-match): highlight the champion's leaf in the champion
          // team's color (2on2) or light blue (1on1).
          if (ch.winner) {
            const wi = ch.entrants.indexOf(ch.winner)
            if (wi >= 0) {
              const wp = this._line(SVG_NS, leafX[wi], LEAF_Y, leafX[wi], WINNER_Y - 4)
              wp.setAttribute('stroke', ch.winner.color || '#425DAD')
              wp.setAttribute('stroke-width', '3')
              svg.appendChild(wp)
            }
          }
          return svg
        },
        _line: function (SVG_NS, x1, y1, x2, y2) {
          const l = document.createElementNS(SVG_NS, 'line')
          l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1))
          l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2))
          l.setAttribute('class', 'championship_bracket_line')
          return l
        },
        onactive: function () {
          inputController.block(false)
          this._build()
          this._keyHandler = (e) => {
            const ch = manager._championship
            if (!ch) return
            // Winner shown (post-match): Escape → main menu.
            if (ch.winner) {
              if (e.key === 'Escape') {
                manager._championship = null
                manager.switch_UI('frontpage')
              }
              return
            }
            // Waiting for the human to confirm their match ("press Attack to join").
            if (ch.waiting) {
              if (e.key === 's' || e.key === 'S') {
                e.preventDefault()
                ch.waiting = false
                manager._launch_championship_match(ch.bracket[ch.round])
              }
              return
            }
            switch (e.key) {
              case 'd':
              case 'D':
                e.preventDefault()
                manager._shuffle_championship()
                this._build()
                break
              case 'a':
              case 'A':
              case 'Enter':
                e.preventDefault()
                manager._start_championship_match()
                break
              case 'Escape':
                manager._championship = null
                manager.switch_UI('frontpage')
                break
            }
          }
          document.addEventListener('keydown', this._keyHandler)
        },
        deactive: function () {
          inputController.block(true)
          if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler)
        }
      },
      demo_setup:
      {
        bgcolor: '#10206c',
        create: function () {
          const section = util.queryUI('demo_setup')
          section.classList.add('stage_select_bg')

          this.dialog = new VerticalMenuDialog({
            canvas: util.queryUI('demo_setup'),
            data: pack.data.UI.data.demo_setup_dialog,
            mousehover: true,
            html: true,
            valueCounts: [0, demo_groupings.length, 0],
            valueText: (i, v) => {
              if (i === 1) return demo_groupings[v].name  // Grouping
              return ""
            },
            onclick: (function (self) {
              return function (I) { self._activate(I) }
            })(this)
          })
          this.dialog.setValue(1, 3) // default grouping: 4 vs 4
        },
        _activate: function (I) {
          switch (I) {
            case 0: // Fight!
              manager.start_demo(true, this.dialog.getValue(1))
              break
            case 1: // Grouping value
              this.dialog.cycleValue(1, 1)
              break
            case 2: // Back
              manager.switch_UI('frontpage')
              break
          }
        },
        onactive: function () {
          inputController.block(false)
          this._keyHandler = (e) => {
            switch (e.key) {
              case 'ArrowUp': case 'w': case 'W':
                e.preventDefault(); this.dialog.navUp(); break
              case 'ArrowDown': case 'x': case 'X':
                e.preventDefault(); this.dialog.navDown(); break
              case 'ArrowLeft': case 'a': case 'A':
                e.preventDefault()
                if (this.dialog.valueCounts[this.dialog.active_item]) this.dialog.cycleValue(this.dialog.active_item, -1)
                break
              case 'ArrowRight': case 'd': case 'D':
                e.preventDefault()
                if (this.dialog.valueCounts[this.dialog.active_item]) this.dialog.cycleValue(this.dialog.active_item, 1)
                break
              case 'Enter': case 's': case 'S':
                e.preventDefault(); this._activate(this.dialog.active_item); break
              case 'Escape':
                manager.switch_UI('frontpage'); break
            }
          }
          document.addEventListener('keydown', this._keyHandler)
        },
        deactive: function () {
          inputController.block(true)
          if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler)
        }
      },
    gameplay:
    {
      allow_wide: true,
      create: function () {
        if (util.queryUI('pause_message')) {
          const dat = pack.data.UI.data.message_overlay
          manager.overlay_mess = new spriteDOM({
            div: util.queryUI('pause_message'),
            img: dat.pic
          })
          manager.overlay_mess.hide()
        }
        manager.gameplay = util.queryUI('gameplay')
        manager.canvas = get_canvas()
        manager.background_layer = new spriteRenderer({
          canvas: manager.canvas,
          type: 'group'
        })
        manager.panel_layer = new spriteRenderer({
          canvas: manager.canvas,
          type: 'group',
          wh: { w: pack.data.UI.data.panel.width, h: pack.data.UI.data.panel.height }
        })
        manager.summary = new SummaryDialog({
          div: util.queryUI('summary_dialog'),
          data: pack.data.UI.data.summary
        })

        if (spriteRenderer.renderer === 'DOM') {
          manager.panel_layer.el.className = 'panel'
          manager.background_layer.el.className = 'background'
        }
        const panels = []
        for (let i = 0; i < 8; i++) {
          const pane = new spriteRenderer({
            canvas: manager.panel_layer,
            img: pack.data.UI.data.panel.pic,
            wh: 'fit'
          })
          pane.set_x_y(pack.data.UI.data.panel.pane_width * (i % 4), pack.data.UI.data.panel.pane_height * Math.floor(i / 4))
          panels.push(pane)
        }
        function get_canvas() {
          if (spriteRenderer.renderer === 'DOM') {
            return new spriteRenderer({
              div: util.queryUI('gameplay'),
              type: 'group'
            })
          } else if (spriteRenderer.renderer === 'canvas') {
            const canvas_node = util.queryUI('gameplay').getElementsByClassName('canvas')[0]
            canvas_node.width = global.application.window.width
            canvas_node.height = global.application.window.height
            return new spriteRenderer({
              canvas: canvas_node,
              type: 'group',
              bgcolor: '#676767',
              wh: { w: global.application.window.width, h: global.application.window.height }
            })
          }
        }
      }
    }
  }
  function resizer(ratio) {
    if (window_state.maximized) {
      // Wide-window mode is disabled: the game always renders at its native
      // 794x550 aspect ratio and is contain-fit scaled with letterboxing.
      // (Previously .wideWindow switched the window to 1000x422, which
      // stretched the HUD panel and background horizontally.)
      const win = util.queryUI('window')
      const cw = win.offsetWidth
      const ch = win.offsetHeight
      if (typeof ratio !== 'number') {
        const ratioh = window.innerHeight / ch
        const ratiow = window.innerWidth / cw
        ratio = ratioh < ratiow ? ratioh : ratiow
        ratio = Math.floor(ratio * 100) / 100
      }
      if (manager.active_UI === 'frontpage') {
        manager.UI_list.frontpage.demax(false)
      }
      if (!ratio) { return }
      const canx = window.innerWidth / 2 - cw / 2 * ratio
      const cany = window.innerHeight / 2 - ch / 2 * ratio
      if (browserSupport.css3dtransform) {
        util.container.style[browserSupport.css3dtransform + 'Origin'] = '0 0'
        util.container.style[browserSupport.css3dtransform] =
          'translate3d(' + canx + 'px,' + cany + 'px,0) ' +
          'scale3d(' + ratio + ',' + ratio + ',1.0)'
      } else if (browserSupport.css2dtransform) {
        util.container.style[browserSupport.css2dtransform + 'Origin'] = '0 0'
        util.container.style[browserSupport.css2dtransform] =
          'translate(' + canx + 'px,0) ' +
          'scale(' + ratio + ',' + ratio + ')'
      }
      // The frontpage is moved out of the container when maximized (demax),
      // so the container scale above never reaches it. Scale it directly to
      // match the contain-fit the gameplay uses.
      if (manager.active_UI === 'frontpage') {
        const fp = util.queryUI('frontpage_content')
        const transform = browserSupport.css3dtransform || browserSupport.css2dtransform
        const fratioh = window.innerHeight / 550
        const fratiow = window.innerWidth / 794
        const fratio = fratioh < fratiow ? fratioh : fratiow
        fp.style[transform + 'Origin'] = 'center center'
        fp.style[transform] =
          browserSupport.css3dtransform
            ? 'scale3d(' + fratio + ',' + fratio + ',1.0)'
            : 'scale(' + fratio + ',' + fratio + ')'
      }
    }
  }
  this.frame = function () {
    this.dispatch_event('frame')
  }
  this.key = function () {
    this.dispatch_event('key', arguments)
  }
  this.dispatch_event = function (event, args) {
    const active = this.UI_list[this.active_UI]
    if (active && active[event]) {
      active[event].apply(active, args)
    }
  }
  this.create_UI = function () {
    for (const I in this.UI_list) {
      if (this.UI_list[I].create) {
        this.UI_list[I].create.call(this.UI_list[I])
      }
    }
  }
  this.switch_UI = function (page) {
    this.dispatch_event('deactive')
    this.active_UI = page
    for (const P in this.UI_list) {
      // The stage/battle dialogs overlay the character selection (so the
      // selected fighter stays visible behind them), unlike other screens.
      if (page === 'stage_select' && P === 'character_selection') continue
      util.queryUI(P).style.display = page === P ? '' : 'none'
    }
    if (window_state.allow_wide !== this.UI_list[page].allow_wide) {
      window_state.allow_wide = this.UI_list[page].allow_wide
      if (window_state.maximized && window_state.wide !== window_state.allow_wide) {
        resizer()
      }
    }
    util.queryUI('window').style.background = this.UI_list[page].bgcolor || ''
    if (window_state.maximized) {
      document.body.style.background = this.UI_list[page].bgcolor || '#676767'
    }
    this.dispatch_event('onactive')
  }
  this.match_end = function (event) {
    if (this.replaying) { this.end_replay(); return }
    if (this._championship) {
      if (this._championship.finished) {
        this.sound.play('1/m_ok')  // champion fanfare
        // Show the championship screen again with the winner panel overlaid.
        this.switch_UI('championship')
      }
      return  // championship drives its own flow (match.onend)
    }
    this.switch_UI('character_selection')

    // create timer
    const This = this
    if (timer) network.stopSync(timer)
    timer = network.startSync(function () { This.frame() }, 1000 / 12)
    // create controller listener
    for (let i = 0; i < session.control.length; i++) {
      (function (i) {
        session.control[i].child = [{
          key: function (K, D) { if (D) This.key(i, K) }
        }]
      }(i))
    }
    session.control.f.child = []
    if (session.control.f.hide) {
      session.control.f.hide()
    }
  }
  this.match_quit = function () {
    // ESC quit — go back to frontpage (original LF2 ESC behavior)
    if (this.replaying) { this.end_replay(); return }
    this.switch_UI('frontpage')
    if (timer) network.stopSync(timer)
    session.control.f.child = []
    if (session.control.f.hide) {
      session.control.f.hide()
    }
  }
  this.start_stage_mode = function () {
    // LF2: Stage Mode → Character Selection first, then → Stage Select
    if (browserSupport.localStorage) {
      browserSupport.localStorage.setItem('F.Game/settings', JSON.stringify(settings))
    }
    for (let i = 0; i < session.control.length; i++) {
      session.control[i].sync = true
    }
    session.control.f.sync = true
    manager.sound.play('1/m_ok')
    
    // Mark that we're entering stage mode (used by character select to show stage dialog)
    manager._stage_mode_pending = true
    manager.match_end()
    manager.switch_UI('character_selection')
  }

  this.start_battle_mode = function () {
    // LF2: Battle Mode → Character Selection (2 teams) → Battle Setup → Battle
    if (browserSupport.localStorage) {
      browserSupport.localStorage.setItem('F.Game/settings', JSON.stringify(settings))
    }
    for (let i = 0; i < session.control.length; i++) {
      session.control[i].sync = true
    }
    session.control.f.sync = true
    manager.sound.play('1/m_ok')

    manager._battle_mode_pending = true
    manager.match_end()
    manager.switch_UI('character_selection')
  }

  this.start_stage_match = function (stageIndex, lives, difficulty) {
    const stageData = pack.data.stage_data.data
    if (stageIndex >= stageData.stages.length) {
      manager.switch_UI('frontpage')
      return
    }
    const stage = stageData.stages[stageIndex]

    // Use character selected in character select, or default to Davis
    let playerId = stage.player.id
    let playerName = stage.player.name
    if (manager._stage_char_selected !== undefined) {
      const charList = util.selectOne(pack.data.object, { type: 'character' })
      if (charList[manager._stage_char_selected]) {
        playerId = charList[manager._stage_char_selected].id
        playerName = manager._stage_char_name || charList[manager._stage_char_selected].name
      }
      manager._stage_char_selected = undefined
      manager._stage_char_name = undefined
    }

    if (timer) {
      network.stopSync(timer)
      timer = null
    }

    for (let i = 0; i < session.control.length; i++) {
      session.control[i].child = []
      session.control[i].sync = true
    }
    session.control.f.child = []
    session.control.f.sync = true
    if (session.control.f.show) session.control.f.show()

    manager.switch_UI('gameplay')

    const match = new Match({ manager: manager, 'package': pack })
    match.create({
      control: session.control.f,
      player: [{
        name: playerName,
        controller: session.control[0],
        id: playerId,
        team: 1
      }],
      background: { id: stage.bg },
      stage_mode: true,
      stage_config: stage,
      stage_lives: lives !== undefined ? lives : 3,
      stage_index: stageIndex,
      // Numbered stages advance 0-24 then victory; survival loops internally (stage_list null).
      stage_list: stage.survival ? null : stageData.stages.slice(0, 25),
      difficulty: difficulty !== undefined ? difficulty : 2,
      set: { weapon: true }
    })
    this._add_team_command_spy(match)
  }

  this.start_battle_match = function () {
    const leaders = manager._battle_leaders || []
    const cfg = manager._battle_config || { teams: { 1: { defense: 0, preset: 2 }, 2: { defense: 0, preset: 5 } } }
    manager._battle_leaders = undefined
    manager._battle_config = undefined

    if (timer) {
      network.stopSync(timer)
      timer = null
    }

    for (let i = 0; i < session.control.length; i++) {
      session.control[i].child = []
      session.control[i].sync = true
    }
    session.control.f.child = []
    session.control.f.sync = true
    if (session.control.f.show) session.control.f.show()

    manager.switch_UI('gameplay')

    const players = []
    // Leaders (from character select), each a hero on their team.
    for (const L of leaders) {
      let selected = L.selected
      if (selected < 0 || !char_list[selected] || !char_list[selected].id) {
        selected = char_list[Math.floor(randomseed.next() * char_list.length)].id
      } else {
        selected = char_list[selected].id
      }
      players.push({
        name: L.name,
        controller: L.type === 'human' ? session.control[0] : { type: 'AIscript', id: AI_list[0].id },
        id: selected,
        team: L.team,
        leader: true
      })
    }
    // Army units (in-screen) for each team, from the per-team preset + defense.
    for (const team of [1, 2]) {
      const t = cfg.teams[team]
      const preset = battle_presets[t.preset] || battle_presets[0]
      const defense = parseFloat(battle_defenses[t.defense] || '1.0')
      t.name = preset.name  // for the in-battle HUD difficulty label
      t.units = preset.units.filter(u => u.id < 100)  // exclude Milk (122)/Beer (123) — items, not respawnable soldiers
      for (const u of preset.units) {
        if (u.id >= 100) continue  // Milk (122)/Beer (123) are items, not soldiers (spawned separately)
        for (let n = 0; n < u.in; n++) {
          players.push({
            name: 'Soldier',
            controller: { type: 'AIscript', id: AI_list[0].id },
            id: u.id,
            team: team,
            defense_rate: defense,
            battle_unit: true,
            unit_id: u.id
          })
        }
      }
    }

    const match = new Match({ manager: manager, 'package': pack })
    match.create({
      control: session.control.f,
      player: players,
      background: { id: bg_list[Math.floor(randomseed.next() * bg_list.length)].id },
      difficulty: 2, // battle uses normal difficulty, no CRAZY!
      battle_mode: true,
      battle_config: cfg,
      set: { weapon: true }
    })
    return match
  }

  this.start_game = function () {
    // save settings
    if (browserSupport.localStorage) {
      browserSupport.localStorage.setItem('F.Game/settings', JSON.stringify(settings))
    }

    // controller
    for (let i = 0; i < session.control.length; i++) {
      session.control[i].sync = true
    }
    session.control.f.sync = true
    if (session.control.f.show) {
      session.control.f.show()
    }
    // show on-screen touch controls for any player set to touch
    for (let i = 0; i < session.control.length; i++) {
      if (session.control[i].type === 'touch') {
        session.control[i].show()
        TouchController.enable(true)
      }
    }

    // start
    manager.sound.play('1/m_ok')
    manager.match_end()
    manager.switch_UI('character_selection')
  }
  this.start_championship = function (mode) {
    // mode: 2 = 1on1, 3 = 2on2
    if (browserSupport.localStorage) {
      browserSupport.localStorage.setItem('F.Game/settings', JSON.stringify(settings))
    }
    for (let i = 0; i < session.control.length; i++) {
      session.control[i].sync = true
    }
    session.control.f.sync = true

    manager._championship_pending = true
    manager.sound.play('1/m_ok')
    manager.match_end()  // full reset (timer + controllers + switch to char select)
    manager._championship = {
      mode: mode,
      // Championship pool = the selectable characters (char_list respects the lf2.net cheat).
      pool: char_list.filter(c => c && c.id > 0),
      entrants: [],
      bracket: [],
      round: 0,
      winners: [],
      lastWinner: null,
      finished: false
    }
  }
  this._build_championship = function (humanSelected) {
    const ch = manager._championship
    // `pic` is the full portrait ("sprite/<name>_f.png"); the small standing
    // sprite is the same path with "_s.png" (both live in pack.data.object).
    const smallOf = c => (c && c.pic) ? c.pic.replace('_f.png', '_s.png') : null
    const pool = ch.pool.map(c => ({ name: c.name, id: c.id, small: smallOf(c), head: c.pic }))
    let humanId = char_list[humanSelected] ? char_list[humanSelected].id : undefined
    if (humanId === undefined) {
      // "Random" picked: resolve to a random hero (the Random option has no id/pic).
      const heroes = pool.filter(p => p.id > 0 && p.id < 30)
      humanId = heroes[Math.floor(randomseed.next() * heroes.length)].id
    }
    const hidx = pool.findIndex(p => p.id === humanId)
    const humanPool = hidx >= 0 ? pool[hidx] : pool[0]
    const humanEntrant = { name: (session.player[0] && session.player[0].name) || humanPool.name, id: humanId, small: humanPool.small, head: humanPool.head, isHuman: true }
    if (hidx >= 0) pool.splice(hidx, 1)

    if (ch.mode === 2) {
      // 1on1: 8 competitors (human + 7 random) — quarter → semi → final.
      const computers = []
      for (let i = 0; i < 7; i++) {
        computers.push(pool.splice(Math.floor(randomseed.next() * pool.length), 1)[0])
      }
      ch.entrants = [humanEntrant].concat(computers)
    } else {
      // 2on2: 4 teams of 2 (human team + 3 computer teams) — semi → final.
      // Team colors + Chinese group labels (official: blue/red/green/yellow).
      const TEAM_COLORS = ['#5A90EB', '#FF4D4A', '#39AE08', '#FFD34A']
      const TEAM_CN = ['第一組', '第二組', '第三組', '第四組']
      const partner = pool[Math.floor(randomseed.next() * pool.length)]
      const teams = [{ members: [humanEntrant, { name: partner.name, id: partner.id, small: partner.small, head: partner.head }], color: TEAM_COLORS[0], label: 'Team 1（' + TEAM_CN[0] + '）' }]
      for (let t = 0; t < 3; t++) {
        const m1 = pool[Math.floor(randomseed.next() * pool.length)]
        const m2 = pool[Math.floor(randomseed.next() * pool.length)]
        teams.push({ members: [{ name: m1.name, id: m1.id, small: m1.small, head: m1.head }, { name: m2.name, id: m2.id, small: m2.small, head: m2.head }], color: TEAM_COLORS[t + 1], label: 'Team ' + (t + 2) + '（' + TEAM_CN[t + 1] + '）' })
      }
      ch.entrants = teams
    }
    manager._shuffle_championship()
  }
  this._shuffle_championship = function () {
    const ch = manager._championship
    for (let i = ch.entrants.length - 1; i > 0; i--) {
      const j = Math.floor(randomseed.next() * (i + 1))
      const tmp = ch.entrants[i]
      ch.entrants[i] = ch.entrants[j]
      ch.entrants[j] = tmp
    }
    ch.bracket = []
    for (let i = 0; i < ch.entrants.length; i += 2) {
      ch.bracket.push({ a: ch.entrants[i], b: ch.entrants[i + 1] })
    }
    ch.round = 0
    ch.winners = []
    ch.finished = false
  }
  this._champ_name = function (entrant) {
    if (!entrant) return ''
    return entrant.members ? entrant.members.map(m => m.name).join(' & ') : entrant.name
  }
  this._champ_player = function (entrant, team) {
    const isHuman = !!entrant.isHuman
    const player = {
      name: entrant.name,
      controller: isHuman ? session.control[0] : { type: 'AIscript', id: AI_list[0].id },
      id: entrant.id,
      team: team
    }
    // HP carry-over: a winner starts the next round with HP carried from the previous match.
    if (entrant.hp > 0) {
      player.spec = { health: { hp: entrant.hp, hp_full: entrant.hp_full, hp_bound: entrant.hp_bound } }
    }
    return player
  }
  this._start_championship_match = function () {
    const ch = manager._championship
    if (!ch) return
    const pair = ch.bracket[ch.round]
    if (!pair) return

    const hasHuman = ch.mode === 2
      ? (pair.a.isHuman || pair.b.isHuman)
      : (pair.a.members.some(m => m.isHuman) || pair.b.members.some(m => m.isHuman))

    if (hasHuman) {
      // Official "press Attack to join" flow: wait for the human to confirm.
      ch.waiting = true
      manager.switch_UI('championship')
      manager.UI_list.championship._build()
      return
    }
    // CPU-vs-CPU: auto-run (official lets you skip; here it just plays out).
    manager._launch_championship_match(pair)
  }
  this._launch_championship_match = function (pair) {
    const ch = manager._championship
    const players = []
    if (ch.mode === 2) {
      players.push(manager._champ_player(pair.a, 1))
      players.push(manager._champ_player(pair.b, 2))
    } else {
      players.push(manager._champ_player(pair.a.members[0], 1))
      players.push(manager._champ_player(pair.a.members[1], 1))
      players.push(manager._champ_player(pair.b.members[0], 2))
      players.push(manager._champ_player(pair.b.members[1], 2))
    }

    const match = manager.start_match({
      players: [],
      resolvedPlayers: players,
      options: { background: -1, difficulty: 2 }
    })
    match.onend = function () { manager._championship_match_end(match) }
  }
  this._championship_match_end = function (match) {
    const ch = manager._championship
    if (!ch) return
    const pair = ch.bracket[ch.round]
    if (!pair) return
    const wt = match.winner_team

    let winner
    if (wt === 1) winner = pair.a
    else if (wt === 2) winner = pair.b
    else winner = randomseed.next() < 0.5 ? pair.a : pair.b  // double-KO tie-break

    // HP carry-over (official): the winner keeps their HP into the next round,
    // with max HP set to their remaining potential ("Dark HP").
    if (match.character) {
      const teamChars = Object.values(match.character).filter(c => c.team === wt && c.health.hp > 0)
      const members = winner.members ? winner.members : [winner]
      for (const m of members) {
        const wc = teamChars.find(c => c.id === m.id) || teamChars[0]
        if (wc) {
          m.hp = wc.health.hp_bound
          m.hp_full = wc.health.hp_bound
          m.hp_bound = wc.health.hp_bound
        }
      }
    }

    ch.winners.push(winner)
    ch.lastWinner = winner

    if (ch.winners.length === ch.bracket.length) {
      ch.round++
      ch.bracket = []
      for (let i = 0; i < ch.winners.length; i += 2) {
        ch.bracket.push({ a: ch.winners[i], b: ch.winners[i + 1] })
      }
      ch.winners = []
      if (ch.bracket.length === 0) {
        ch.finished = true
        ch.winner = winner  // champion — drives the winner panel/path
        return
      }
    }
    manager._start_championship_match()
  }
  this._add_team_command_spy = function (match) {
    // Team commands (Come/Stay/Move): detect the input sequences on any human
    // player's controller and set the match-level command for AI allies.
    //   Come  = D+J+D+J (defend+jump+defend+jump)
    //   Stay  = D+D+D+D (defend x4)
    //   Move  = D+A+D+A (defend+attack+defend+attack)
    match.team_command = null
    match._cmd_seq = []
    const spy = {
      key: function (key, down) {
        if (!down) return
        const seq = match._cmd_seq
        if (key === 'def') seq.push('D')
        else if (key === 'jump') seq.push('J')
        else if (key === 'att') seq.push('A')
        else { seq.length = 0; return }
        if (seq.length > 4) seq.shift()
        const s = seq.join('')
        if (s === 'DJDJ') { match.team_command = 'come'; match.show_speech('Come'); seq.length = 0 }
        else if (s === 'DDDD') { match.team_command = 'stay'; match.show_speech('Stay'); seq.length = 0 }
        else if (s === 'DADA') { match.team_command = 'move'; match.show_speech('Move'); seq.length = 0 }
      }
    }
    for (let i = 0; i < session.control.length; i++) {
      if (session.control[i].child) session.control[i].child.push(spy)
    }
  }
  this.start_match = function (config) {
    this.switch_UI('gameplay')

    if (timer) {
      network.stopSync(timer)
      timer = null
    }

    for (let i = 0; i < session.control.length; i++) {
      session.control[i].child = []
    }
    if (!config.demo_mode) {
      session.control.f.child = []
      if (session.control.f.show) {
        session.control.f.show()
      }
    }

    const resolvedPlayers = config.replay ? build_replay_players(config.replay) : (config.resolvedPlayers || get_players())
    const resolvedBackground = config.replay ? config.replay.background : get_background()

    const match = new Match
      ({
        manager: this,
        'package': pack
      })
    match.create
      ({
        control: config.demo_mode ? null : session.control.f,
        player: resolvedPlayers,
        background: { id: resolvedBackground },
        seed: config.replay ? config.replay.seed : config.seed,
        difficulty: config.options ? config.options.difficulty : 2,
        set: {
          weapon: true,
          demo_mode: config.demo_mode
        }
      })
    this._add_team_command_spy(match)

    // Record local matches when recording is enabled (replays and demos are
    // never recorded). The seed is read from the match after create() seeds it.
    if (!config.replay && !config.demo_mode && settings.record) {
      const recorder = new Recorder({
        seed: match.seed,
        players: resolvedPlayers.map(function (p) {
          const isAI = p.controller && p.controller.type === 'AIscript'
          return {
            name: p.name,
            id: p.id,
            team: p.team,
            type: isAI ? 'computer' : 'human',
            aiId: isAI ? p.controller.id : null,
            controlIndex: p.controlIndex
          }
        }),
        background: resolvedBackground,
        difficulty: config.options ? config.options.difficulty : 2,
        mode: config.stage_mode ? 'stage' : 'vs',
        name: settings.recording_name || '',
        info: settings.recording_info || ''
      })
      match.onframe = function () { recorder.frame(session.control) }
      match.onend = function () {
        downloadRecording(recorder.toJSON(), 'lf2-recording-' + Date.now() + '.json')
      }
    }

    return match

    function get_players() {
      const players = config.players
      const arr = []
      for (let i = 0; i < players.length; i++) {
        if (players[i].use) {
          let selected = players[i].selected
          // Resolve "Random" (-1) or invalid selection to a real character
          if (selected < 0 || selected >= char_list.length || !char_list[selected] || !char_list[selected].id) {
            // Pick random from valid characters (skip index -1 which is "Random" label)
            const validIds = []
            for (let j = 0; j < char_list.length; j++) {
              if (char_list[j] && char_list[j].id) validIds.push(j)
            }
            selected = validIds[Math.floor(randomseed.next() * validIds.length)]
          }
          let aiSelected = players[i].selected_AI
          if (aiSelected < 0 || aiSelected >= AI_list.length || !AI_list[aiSelected]) {
            aiSelected = 0
          }
          arr.push({
            name: players[i].name,
            controller: players[i].type === 'human' ? session.control[i] : { type: 'AIscript', id: AI_list[aiSelected].id },
            id: char_list[selected].id,
            team: players[i].team === 0 ? 10 + i : players[i].team,
            controlIndex: i
          })
        }
      }
      return arr
    }
    function get_background() {
      const options = config.options
      if (options.background === -1) {
        return bg_list[Math.floor(randomseed.next() * bg_list.length)].id
      } else {
        return bg_list[options.background].id
      }
    }
    function build_replay_players(recording) {
      return recording.players.map(function (p) {
        return {
          name: p.name,
          id: p.id,
          team: p.team,
          controller: p.type === 'human'
            ? new ReplayController(recording.frames, p.controlIndex)
            : { type: 'AIscript', id: p.aiId }
        }
      })
    }
  }
  this.network_debug = function (role) {
    create_network_controllers({
      address: 'http://localhost:8001',
      library: 'network.js',
      path: '/peer'
    }, {
      id1: role === 'active' ? 'a' : 'b',
      id2: role === 'active' ? 'b' : 'a',
      role: role
    })
  }
  this.start_debug = function () {
    const match = this.start_match({
      players: [
        {
          use: true,
          name: 'Player1',
          type: 'human',
          selected: 22, // Julian
          team: 1
        },
        {
          use: true,
          name: 'Player2',
          type: 'human',
          selected: 0, // Deep
          team: 2
        }
      ],
      options: {
        background: -1, // random
        difficulty: 2 // difficult
      }
    })
  }
  this.playback_recording = function () {
    const input = document.getElementById('recording_file')
    if (!input) {
      manager.alert('recording file input missing')
      return
    }
    input.onchange = function () {
      const file = input.files && input.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = function () {
        try {
          manager.replay_recording(JSON.parse(reader.result))
        } catch (e) {
          manager.alert('invalid recording file')
        }
      }
      reader.readAsText(file)
      input.value = ''
    }
    input.click()
  }
  this.replay_recording = function (recording) {
    this.replaying = true
    const match = this.start_match({
      replay: recording,
      options: { background: -1, difficulty: recording.difficulty || 2 }
    })

    const overlay = util.queryUI('playback_overlay')
    if (overlay) {
      overlay.style.display = ''
      overlay.innerHTML =
        '<div class="playback_title">Playback（錄影重播）</div>' +
        (recording.name ? '<div class="playback_author">by ' + recording.name + '</div>' : '') +
        (recording.info ? '<div class="playback_info">' + recording.info + '</div>' : '') +
        '<div class="playback_meta">' + (recording.mode === 'stage' ? 'Stage mode' : 'VS mode') +
        ' · ' + (diff_list[recording.difficulty] || '') + '</div>' +
        '<div class="playback_time" id="playback_time"></div>' +
        '<div class="playback_controls">F1 pause · F5 fast-forward · F4 quit</div>'
    }

    // Update the live game time each frame, and stop the replay once the
    // recorded frames run out (the recorded match ended here — whether by
    // gameover or an early quit).
    match.onframe = function (m) {
      const t = util.queryUI('playback_time')
      if (t) {
        const secs = Math.floor(m.time.t / global.gameplay.framerate)
        const mm = String(Math.floor(secs / 60)).padStart(2, '0')
        const ss = String(secs % 60).padStart(2, '0')
        t.textContent = 'time ' + mm + ':' + ss
      }
      if (m.time.t >= recording.frames.length) {
        m.destroy()
        manager.end_replay()
      }
    }
    // Hide the overlay when the replay ends.
    match.onend = function () {
      if (overlay) overlay.style.display = 'none'
    }
  }
  // Return to the mode menu after a replay finishes or is quit.
  this.end_replay = function () {
    this.replaying = false
    this.switch_UI('frontpage')
    this.UI_list.frontpage._showMenu('mode')
  }
  this.start_demo = function (playable, groupingIndex) {
    const This = this
    if (playable) {
      util.queryUI('top_status').innerHTML = "LF2 Online is running in Demo mode, press `Esc` or click <button class='here_button' style='width:100px;letter-spacing:3px;'>here</button> to start game."
      util.queryUI('top_status').style.zIndex = 1000
      util.queryUI('here_button').onclick = start_game

      session.control.f.child = [{
        key: function (K, D) { if (K === 'esc' && D) { start_game() } }
      }]
      session.control.f.sync = false
    }
    function start_game() {
      match.destroy()
      util.queryUI('top_status').innerHTML = ''
      util.queryUI('top_status').style.zIndex = undefined
      This.switch_UI('frontpage')
    }
    // Build the demo fighters from the chosen grouping (random heroes per team).
    const grouping = demo_groupings[groupingIndex] || demo_groupings[0]
    const heroes = char_list.filter(c => c && c.id > 0)
    const players = []
    let teamNum = 1
    for (const size of grouping.teams) {
      for (let n = 0; n < size; n++) {
        const hero = heroes[Math.floor(randomseed.next() * heroes.length)]
        players.push({
          use: true,
          name: 'Computer',
          type: 'computer',
          selected: char_list.indexOf(hero),
          selected_AI: 0, // Computer AI
          team: teamNum
        })
      }
      teamNum++
    }
    let match = this.start_match({
      demo_mode: true,
      players: players,
      options: {
        background: -1, // random
        difficulty: 2 // difficult
      }
    })
  }
  this.destroy = function () {
    if (timer) {
      network.stopSync(timer)
      timer = null
    }
    session = null
    settings = null
    controllers = null
  }
  this.create()
  }
}

export default GameManager

