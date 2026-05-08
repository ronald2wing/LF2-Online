// manager.js — Game bootstrap and UI orchestrator.
//
// Owns the game loop, window management, settings, character/background
// selection, match creation, and tear-down.  Acts as the bridge between
// the Stimulus controller and the engine core.

import global from "engine/Game/global"
import network from "engine/network"
import Soundpack from "engine/Game/soundpack"
import Music, { matchMusicOverride } from "engine/Game/music"
import Match from "engine/Game/match"
import domQuery from "engine/Game/dom-query"
import select from "engine/Game/select"
import resourcePath from "engine/Game/resource-path"
import Random from "engine/third_party/random"

import coreUtil from "engine/core/util"
import spriteRenderer from "engine/core/sprite-canvas"
import spriteDOM from "engine/core/sprite-dom"
import { show, hide } from "engine/Game/manager-dialogs"
import inputController from "engine/core/controller"
import TouchController from "engine/Game/touchcontroller"
import { Recorder, ReplayController, downloadRecording } from "engine/Game/recorder"
import ResourceMap from "engine/core/resourcemap"
import browserSupport from "engine/core/support"

import { createFrontpage } from "engine/Game/ui/frontpage"
import { createSettings } from "engine/Game/ui/settings"
import { createRecording } from "engine/Game/ui/recording"
import { createCharacterSelection } from "engine/Game/ui/character_selection"
import { createStageSelect } from "engine/Game/ui/stage_select"
import { createBattleSetup } from "engine/Game/ui/battle_setup"
import { createChampionship } from "engine/Game/ui/championship"
import { createNetworkGame } from "engine/Game/ui/network_game"
import { createLobby } from "engine/Game/ui/lobby"
import { createDemoSetup } from "engine/Game/ui/demo_setup"
import { createGameplay } from "engine/Game/ui/gameplay"

class GameManager {
  constructor(pack) {
    const param = resourcePath.parseLocationParams()
    const { character_selection: sel } = pack.data.UI.data

    let char_list, img_list, AI_list, bg_list, diff_list, battle_defenses, battle_unit_types, battle_presets, demo_groupings,
        timer, randomseed, resourcemap,
        settings, session, controllers,
        window_state

    const manager = this

    // The sync loop is started by every mode (lobby, matchmaking, match), so
    // every teardown path stops it and forgets the handle through here.
    function clearTimer() {
      if (!timer) return
      network.stopSync(timer)
      timer = null
    }

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
      domQuery.queryUI('window') // ensure domQuery.container is resolved
      domQuery.container.classList.add('maximized')
      domQuery.queryUI('extra_UI').classList.add('maximized')
      function onresize() {
        resizer()
      }
      domQuery.queryUI('alert_box_ok').onclick = function () {
        hide(domQuery.queryUI('alert_box'))
      }
      manager.alert = function (mess) {
        console.error(mess)
        domQuery.queryUI('alert_message').innerHTML = mess
        show(domQuery.queryUI('alert_box'))
      }
      hide(domQuery.queryUI('alert_box'))

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
        match_seed: 0,
        lf2net: false,
        // Music selector: undefined = follow each stage's own track (the
        // default); an index into MUSIC_OPTIONS forces that track; the "Random"
        // option resolves per match. Persisted with the rest of the settings.
        music: undefined,
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
          ...global.network.lobbyServers
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
        // Ignore keystrokes originating from form fields (server address input,
        // player-name fields, etc.) so typing those never toggles the cheat.
        const target = e.target
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
        if (e.key && e.key.length === 1) {
          cheatBuffer = (cheatBuffer + e.key.toLowerCase()).slice(-7)
          if (cheatBuffer === 'lf2.net') {
            settings.lf2net = !settings.lf2net
            applyLf2netCheat()
            // The character-selection portraits snapshot img_list once at startup;
            // re-sync them so fighters unlocked by the cheat get their portrait.
            if (manager.UI_list.character_selection.refreshPortraits) {
              manager.UI_list.character_selection.refreshPortraits()
            }
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
      resourcePath.organizePackDependencies(pack)
      resourcemap = new ResourceMap(resourcePath.setupResourceMap(pack))
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

      // Background music channel — a dedicated looping <audio> element (the SFX
      // soundpack can't loop a 2-3 minute track). Playback is gated by the
      // browser's autoplay policy, so tracks start after the first interaction.
      manager.music = new Music()

      // rand
      manager.random = function () {
        return randomseed.next()
      }
      randomseed = new Random()
      randomseed.seed_bytime()

      // prepare — playable list excludes NPC/hostage (id >= 300); mooks (30-39) and
      // bosses (50-52) are locked until the lf2.net cheat is typed.
      function applyLf2netCheat() {
        char_list = select.selectAll(pack.data.object, { type: 'character' })
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
      battle_defenses = ['1.0', '1.5', '2.0', '2.5', '3.0']
      battle_unit_types = [
        { id: 30 }, { id: 31 }, { id: 32 }, { id: 33 }, { id: 34 }, { id: 35 },
        { id: 36 }, { id: 37 }, { id: 39 }, { id: 122 }, { id: 123 }
      ]
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
                // Host generates the shared match RNG seed and seeds its own RNG
                // before the transfer so both peers derive identical spawn positions.
                settings.match_seed = (Math.random() * 0x7fffffff) | 0
                randomseed.seed(settings.match_seed)
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
                    player: settings.player,
                    seed: settings.match_seed
                  }
                },
                function (info) { // receive
                  if (param.role === 'active') {
                    session.player[0] = settings.player[0]
                    session.player[1] = settings.player[1]
                    session.player[2] = info.player[0]
                    session.player[3] = info.player[1]
                  } else if (param.role === 'passive') {
                    // Joiner adopts the host's seed for deterministic lockstep.
                    settings.match_seed = info.seed
                    randomseed.seed(info.seed)
                    session.player[0] = info.player[0]
                    session.player[1] = info.player[1]
                    session.player[2] = settings.player[0]
                    session.player[3] = settings.player[1]
                  }
                  manager.UI_list.settings.keychanger.call(manager.UI_list.settings)
                  domQuery.queryUI('network_game_back').innerHTML = 'OK'
                  manager.UI_list.network_game.ready = true
                  if (param.role === 'passive') {
                    manager.start_game()
                  }
                })
              if (param.role === 'active') {
                manager.start_game()
              }
              break
            case 'close':
              manager.alert('peer disconnected')
              manager.match_quit()
              break
            case 'log':
              // `network_status_log` is the element's id, not a class name, so
              // queryUI (which matches by class) can't find it. Use the stored
              // reference from the network_game UI object instead.
              manager.UI_list.network_game.statusLog.textContent += mess + '\n'
              break
            case 'error':
              manager.alert(mess)
              break
            case 'sync_error':
              manager.alert('FATAL: synchronization error — match halted')
              break
          }
        }
      }
      network.setup({
        server: server,
        param: param
      }, handler)
    }
    // Every menu screen binds a document keydown handler on activate and removes
    // it on deactivate; these two helpers centralize that lifecycle.
    function addKeyNav(target, handler) {
      target._keyHandler = handler
      document.addEventListener('keydown', handler)
    }
    function removeKeyNav(target) {
      if (target._keyHandler) document.removeEventListener('keydown', target._keyHandler)
    }
    // A screen's window/body background resolves once, from the pack's per-screen
    // `bg_color`. Screens without one (lobby iframe, gameplay canvas) stay
    // transparent rather than getting a default.
    function bgcolor(page) {
      const data = pack.data.UI.data[page]
      return data && data.bg_color ? data.bg_color : ''
    }
    // `ctx` is handed to the extracted UI factories before `create()` runs, so the
    // mutable variables must be read through getters (late-binding); a plain object
    // literal would snapshot them as `undefined` and never see the assignments below.
    const ctx =
    {
      manager,
      pack,
      sel,
      addKeyNav,
      removeKeyNav,
      get settings() { return settings },
      get session() { return session },
      get controllers() { return controllers },
      get window_state() { return window_state },
      get char_list() { return char_list },
      get img_list() { return img_list },
      get AI_list() { return AI_list },
      get bg_list() { return bg_list },
      get diff_list() { return diff_list },
      get battle_defenses() { return battle_defenses },
      get battle_unit_types() { return battle_unit_types },
      get battle_presets() { return battle_presets },
      get randomseed() { return randomseed },
      get demo_groupings() { return demo_groupings },
      create_network_controllers
    }
    this.UI_list =
    {
      frontpage: createFrontpage(ctx),
      settings: createSettings(ctx),
      recording: createRecording(ctx),
      network_game: createNetworkGame(ctx),
      lobby: createLobby(ctx),
      character_selection: createCharacterSelection(ctx),
      stage_select: createStageSelect(ctx),
      battle_setup: createBattleSetup(ctx),
      championship: createChampionship(ctx),
      demo_setup: createDemoSetup(ctx),
      gameplay: createGameplay(ctx)
    }
    function resizer(ratio) {
      if (window_state.maximized) {
        // Wide-window mode is disabled: the game always renders at its native
        // 794x550 aspect ratio and is contain-fit scaled with letterboxing.
        // (Previously .wideWindow switched the window to 1000x422, which
        // stretched the HUD panel and background horizontally.)
        const win = domQuery.queryUI('window')
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
          domQuery.container.style[browserSupport.css3dtransform + 'Origin'] = '0 0'
          domQuery.container.style[browserSupport.css3dtransform] =
            'translate3d(' + canx + 'px,' + cany + 'px,0) ' +
            'scale3d(' + ratio + ',' + ratio + ',1.0)'
        } else if (browserSupport.css2dtransform) {
          domQuery.container.style[browserSupport.css2dtransform + 'Origin'] = '0 0'
          domQuery.container.style[browserSupport.css2dtransform] =
            'translate(' + canx + 'px,0) ' +
            'scale(' + ratio + ',' + ratio + ')'
        }
        // The frontpage is moved out of the container when maximized (demax),
        // so the container scale above never reaches it. Scale it directly to
        // match the contain-fit the gameplay uses.
        if (manager.active_UI === 'frontpage') {
          const fp = domQuery.queryUI('frontpage_content')
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
      for (const screen in this.UI_list) {
        if (this.UI_list[screen].create) {
          this.UI_list[screen].create.call(this.UI_list[screen])
        }
      }
    }
    this.switch_UI = function (page) {
      this.dispatch_event('deactive')
      this.active_UI = page
      for (const screen in this.UI_list) {
        // The stage/battle dialogs overlay the character selection (so the
        // selected fighter stays visible behind them), unlike other screens.
        if (page === 'stage_select' && screen === 'character_selection') continue
        domQuery.queryUI(screen).style.display = page === screen ? '' : 'none'
      }
      if (window_state.allow_wide !== this.UI_list[page].allow_wide) {
        window_state.allow_wide = this.UI_list[page].allow_wide
        if (window_state.maximized && window_state.wide !== window_state.allow_wide) {
          resizer()
        }
      }
      const bg = bgcolor(page)
      domQuery.queryUI('window').style.background = bg
      if (window_state.maximized) {
        document.body.style.background = bg || '#676767'
      }
      this.dispatch_event('onactive')

      // Background music follows the active screen: the menu plays `main`; every
      // other screen is silent. Stage-mode music is started separately by
      // start_stage_match (which switches to gameplay *before* it knows the
      // stage's track), so gameplay itself is not special-cased here.
      if (page === 'frontpage') {
        manager.music.play('main')
      } else {
        manager.music.stop()
      }
    }
    // Centralized match teardown: destroys any live match and clears the handle.
    // Match.destroy() is idempotent (it clears onend before firing), so calling
    // this from multiple exit paths never double-fires the championship/replay
    // onend callback.
    this._destroy_current_match = function () {
      const match = this._current_match
      if (!match) return
      this._current_match = null
      match.destroy()
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
      this._destroy_current_match()
      this.switch_UI('character_selection')

      // create timer
      const self = this
      clearTimer()
      timer = network.startSync(function () { self.frame() }, 1000 / 12)
      // create controller listener — `i` is block-scoped, so each handler
      // closes over its own player index
      for (let i = 0; i < session.control.length; i++) {
        session.control[i].child = [{
          key: function (key, down) { if (down) self.key(i, key) }
        }]
      }
      session.control.f.child = []
      if (session.control.f.hide) {
        session.control.f.hide()
      }
    }
    this.match_quit = function () {
      // ESC quit — go back to frontpage (original LF2 ESC behavior)
      this._destroy_current_match()
      if (this.replaying) { this.end_replay(); return }
      this.switch_UI('frontpage')
      clearTimer()
      session.control.f.child = []
      if (session.control.f.hide) {
        session.control.f.hide()
      }
    }
    this.save_settings = function () {
      if (browserSupport.localStorage) {
        browserSupport.localStorage.setItem('F.Game/settings', JSON.stringify(settings))
      }
      for (let i = 0; i < session.control.length; i++) {
        session.control[i].sync = true
      }
      session.control.f.sync = true
    }
    function startMode(flag) {
      manager.save_settings()
      manager.sound.play('1/m_ok')
      manager[flag] = true
      manager.match_end()
      manager.switch_UI('character_selection')
    }

    this.start_stage_mode = function () {
      // LF2: Stage Mode → Character Selection first, then → Stage Select
      startMode('_stage_mode_pending')
    }

    this.start_battle_mode = function () {
      // LF2: Battle Mode → Character Selection (2 teams) → Battle Setup → Battle
      startMode('_battle_mode_pending')
    }

    function resetControls() {
      clearTimer()
      for (let i = 0; i < session.control.length; i++) {
        session.control[i].child = []
        session.control[i].sync = true
      }
      session.control.f.child = []
      session.control.f.sync = true
      if (session.control.f.show) session.control.f.show()
      manager.switch_UI('gameplay')
    }

    this.start_stage_match = function (stageIndex, lives, difficulty) {
      this._destroy_current_match()
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
        const charList = select.selectOne(pack.data.object, { type: 'character' })
        if (charList[manager._stage_char_selected]) {
          playerId = charList[manager._stage_char_selected].id
          playerName = manager._stage_char_name || charList[manager._stage_char_selected].name
        }
        manager._stage_char_selected = undefined
        manager._stage_char_name = undefined
      }

      resetControls()

      // Stage music: the stage object carries the chapter track (or the boss
      // track for boss stages; survival starts on stage4 and swaps per wave).
      // A player's music choice overrides the stage's own track; null keeps the
      // default wiring. Resolved once here (Math.random, not the lockstep RNG)
      // so "Random" picks a single track for this match and survival's per-wave
      // schedule is replaced only when a track is actually chosen.
      manager._music_override = matchMusicOverride(settings.music, Math.random)
      manager.music.play(manager._music_override || stage.music)

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
      this._current_match = match
      return match
    }

    this.start_battle_match = function () {
      this._destroy_current_match()
      const leaders = manager._battle_leaders || []
      const cfg = manager._battle_config || { teams: { 1: { defense: 0, preset: 2 }, 2: { defense: 0, preset: 5 } } }
      manager._battle_leaders = undefined
      manager._battle_config = undefined

      resetControls()

      const players = []
      // Leaders (from character select), each a hero on their team.
      for (const leader of leaders) {
        let selected = leader.selected
        if (selected < 0 || !char_list[selected] || !char_list[selected].id) {
          selected = char_list[Math.floor(randomseed.next() * char_list.length)].id
        } else {
          selected = char_list[selected].id
        }
        players.push({
          name: leader.name,
          controller: leader.type === 'human' ? session.control[0] : { type: 'AIscript', id: AI_list[0].id },
          id: selected,
          team: leader.team,
          leader: true
        })
      }
      // Army units (in-screen) for each team, from the per-team preset + defense.
      for (const team of [1, 2]) {
        const teamCfg = cfg.teams[team]
        const preset = battle_presets[teamCfg.preset] || battle_presets[0]
        const defense = parseFloat(battle_defenses[teamCfg.defense] || '1.0')
        teamCfg.name = preset.name  // for the in-battle HUD difficulty label
        teamCfg.units = preset.units.filter(unit => unit.id < 100)  // exclude Milk (122)/Beer (123) — items, not respawnable soldiers
        for (const unit of preset.units) {
          if (unit.id >= 100) continue  // Milk (122)/Beer (123) are items, not soldiers (spawned separately)
          for (let n = 0; n < unit.in; n++) {
            players.push({
              name: 'Soldier',
              controller: { type: 'AIscript', id: AI_list[0].id },
              id: unit.id,
              team: team,
              defense_rate: defense,
              battle_unit: true,
              unit_id: unit.id
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
      this._current_match = match
      return match
    }

    this.start_game = function () {
      // save settings + sync controllers
      this.save_settings()
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
      this.save_settings()

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
      this._destroy_current_match()
      this.switch_UI('gameplay')

      clearTimer()

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
      this._current_match = match

      // Record local matches when recording is enabled (replays and demos are
      // never recorded). The seed is read from the match after create() seeds it.
      if (!config.replay && !config.demo_mode && settings.record) {
        const recorder = new Recorder({
          seed: match.seed,
          players: resolvedPlayers.map(function (player) {
            const isAI = player.controller && player.controller.type === 'AIscript'
            return {
              name: player.name,
              id: player.id,
              team: player.team,
              type: isAI ? 'computer' : 'human',
              aiId: isAI ? player.controller.id : null,
              controlIndex: player.controlIndex
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
        return recording.players.map(function (player) {
          return {
            name: player.name,
            id: player.id,
            team: player.team,
            controller: player.type === 'human'
              ? new ReplayController(recording.frames, player.controlIndex)
              : { type: 'AIscript', id: player.aiId }
          }
        })
      }
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

      const overlay = domQuery.queryUI('playback_overlay')
      if (overlay) {
        overlay.style.display = ''
        // Build the overlay with DOM nodes (textContent) rather than string
        // concatenation so a crafted recording's name/info render as literal text
        // instead of HTML. Recordings are shareable, so these fields are untrusted.
        overlay.textContent = ''
        const child = (tag, className, text) => {
          const el = document.createElement(tag)
          if (className) el.className = className
          if (text !== undefined) el.textContent = text
          overlay.appendChild(el)
          return el
        }
        child('div', 'playback_title', 'Playback（錄影重播）')
        if (recording.name) child('div', 'playback_author', 'by ' + recording.name)
        if (recording.info) child('div', 'playback_info', recording.info)
        child('div', 'playback_meta', (recording.mode === 'stage' ? 'Stage mode' : 'VS mode') + ' · ' + (diff_list[recording.difficulty] || ''))
        child('div', 'playback_time').id = 'playback_time'
        child('div', 'playback_controls', 'F1 pause · F5 fast-forward · F4 quit')
      }

      // Update the live game time each frame, and stop the replay once the
      // recorded frames run out (the recorded match ended here — whether by
      // gameover or an early quit).
      match.onframe = function (m) {
        const timeEl = domQuery.queryUI('playback_time')
        if (timeEl) {
          const secs = Math.floor(m.time.t / global.gameplay.framerate)
          const mm = String(Math.floor(secs / 60)).padStart(2, '0')
          const ss = String(secs % 60).padStart(2, '0')
          timeEl.textContent = 'time ' + mm + ':' + ss
        }
        if (m.time.t >= recording.frames.length) {
          manager._destroy_current_match()
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
      const self = this
      if (playable) {
        domQuery.queryUI('top_status').innerHTML = "LF2 Online is running in Demo mode, press `Esc` or click <button class='here_button' style='width:100px;letter-spacing:3px;'>here</button> to start game."
        domQuery.queryUI('top_status').style.zIndex = 1000
        domQuery.queryUI('here_button').onclick = start_game

        session.control.f.child = [{
          key: function (key, down) { if (key === 'esc' && down) { start_game() } }
        }]
        session.control.f.sync = false
      }
      function start_game() {
        self._destroy_current_match()
        domQuery.queryUI('top_status').innerHTML = ''
        domQuery.queryUI('top_status').style.zIndex = undefined
        self.switch_UI('frontpage')
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
      this.start_match({
        demo_mode: true,
        players: players,
        options: {
          background: -1, // random
          difficulty: 2 // difficult
        }
      })
    }
    this.destroy = function () {
      this._destroy_current_match()
      clearTimer()
      session = null
      settings = null
      controllers = null
    }
    this.create()
  }
}

export default GameManager

