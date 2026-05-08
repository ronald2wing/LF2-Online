import coreUtil from "engine/core/util"
import spriteRenderer from "engine/core/sprite-canvas"
import network from "engine/network"
import factory from "engine/Game/factories"
import Scene from "engine/Game/scene"
import Background from "engine/Game/background"
import AI from "engine/Game/AI"
import Random from "engine/third_party/random"
import domQuery from "engine/Game/dom-query"
import select from "engine/Game/select"
import Global from "engine/Game/global"
import { createWeapon, destroyWeapons, dropWeapons, isDropWeapon } from "engine/Game/match/objects"
import { createPane, showHp, updateBattleHud } from "engine/Game/match/hud"
import { spawnStageWave } from "engine/Game/match/stage-mode"
import { checkBattleReserves } from "engine/Game/match/battle-mode"

const ID = Global.gameplay.ID

export default class Match {
  constructor(config) {
    const self = this
    self.manager = config.manager
    self.data = config.package.data
    self.sound = config.manager.sound
    self.spec = self.data.properties.data
  }

  _collectLoadIds(players) {
    let objectIds = []
    const aiIds = []
    // Preload ALL character types — any character can appear via opoint/transform at runtime
    for (const index in this.data.object) {
      if (this.data.object[index].type === 'character') {
        objectIds.push(this.data.object[index].id)
      }
    }
    for (let i = 0; i < players.length; i++) {
      objectIds.push(players[i].id)
      const playerObj = select.selectOne(this.data.object, { id: players[i].id })
      if (playerObj && playerObj.pack) {
        objectIds = objectIds.concat(coreUtil.extractArray(playerObj.pack, 'id').id)
      }
      for (const index in this.data.object) {
        if (this.data.object[index].id === players[i].id && this.data.object[index].AI) {
          aiIds.push(this.data.object[index].AI)
        }
      }
      if (players[i].controller.type === 'AIscript') {
        aiIds.push(players[i].controller.id)
      }
    }
    return { objectIds, aiIds }
  }

  create(setting) {
    const self = this
    const { objectIds, aiIds } = this._collectLoadIds(setting.player)
    if (!setting.set) { setting.set = {} }

    self.gameover_state = false
    self.gameover_shown = false
    self._stage_timers = []
    self.randomseed = self.new_randomseed(setting.seed)
    self.onframe = setting.onframe || null
    self.onend = setting.onend || null
    self.create_scenegraph()
    self.control = self.create_controller(setting.control)
    self.functionkey_control = setting.control
    if (self.functionkey_control && self.functionkey_control.restart) {
      self.functionkey_control.restart()
    }
    if (self.manager.panel_layer) {
      self.panel = []
      for (let i = 0; i < 8; i++) self.panel[i] = {}
    }
    self.stage_mode = setting.stage_mode || false
    self.stage_config = setting.stage_config || null
    self.stage_wave = 0
    self.stage_wave_spawning = false
    self.stage_wave_pending = false
    self.stage_lives = setting.stage_lives || 3
    self.stage_index = setting.stage_index || 0
    self.stage_list = setting.stage_list || null
    self.player_team = 1
    self.difficulty = setting.difficulty || 2
    self.stage_cleared = false
    self.survival = !!(self.stage_config && self.stage_config.survival)
    self.battle_mode = setting.battle_mode || false
    self.battle_config = setting.battle_config || null
    self.battle_teams = null
    if (self.battle_mode && self.battle_config) {
      self.battle_teams = {}
      for (const team of [1, 2]) {
        const t = self.battle_config.teams[team]
        self.battle_teams[team] = {
          defense: t.defense,
          units: (t.units || []).map(u => ({ id: u.id, in: u.in, reserve: u.reserve }))
        }
      }
    }
    // Hide the survival counter for non-survival matches (it's re-shown per wave
    // during survival in spawn_stage_wave).
    if (!self.survival) {
      const counter = domQuery.queryUI('stage_counter')
      if (counter) counter.style.display = 'none'
    }

    self.overlay_message('loading')
    self.tasks = [] // pending tasks
    self.AIscript = []
    if (self.manager.summary) {
      self.manager.summary.hide()
    }
    self.manager.canvas.render()

    let already = false
    this.data.load({
      object: objectIds,
      background: setting.background ? [setting.background.id] : [],
      AI: aiIds
    }, function () {  // when all necessary data files are loaded
      self.create_background(setting.background)
      self.create_effects()
      if (setting.player) {
        self.create_characters(setting.player, {pane: true})
      }
      if (setting.set.weapon) {
        dropWeapons(self)
      }

      spriteRenderer.masterconfig_set('onready', onready)
      setTimeout(function () { onready() }, 8000) // assume it is ready after 8 seconds
    })
    function onready() {
      if (!already) { // all loading finished
        already = true
        if (self.manager.overlay_mess) {
          self.manager.overlay_mess.hide()
        }
        if (setting.set.demo_mode) {
          self.demo_mode = true
          self.overlay_message('demo')
        }
        self.create_timer()
      }
    }
  }

  destroy() {
    const self = this
    if (self.destroyed) return  // teardown is idempotent: championship/replay re-enter via onend
    self.destroyed = true
    // self.time is only created by create_timer(), which runs asynchronously after
    // the pack loads. An early exit during that window must still tear down cleanly
    // rather than throwing before the clock is released.
    if (self.time) {
      self.time.paused = true
      network.stopSync(self.time.timer)
    }
    // Cancel any pending stage-mode timeouts (wave spawn / stage advance / retry /
    // victory) so a quit can never spawn a follow-up match after this one is gone.
    if (self._stage_timers) {
      for (const id of self._stage_timers) clearTimeout(id)
      self._stage_timers.length = 0
    }
    if (self.onend) { const cb = self.onend; self.onend = null; cb() }

    // destroy all objects
    self.for_all('destroy')
    if (self.background) self.background.destroy()
    if (self.panel) {
      for (let i = 0; i < self.panel.length; i++) {
        if (self.panel[i].hp) {
          self.panel[i].hp.remove()
          self.panel[i].hp_bound.remove()
          self.panel[i].mp.remove()
          self.panel[i].mp_bound.remove()
          self.panel[i].spic.remove()
        }
      }
    }
  }

  create_non_player_characters(players) {
    const self = this
    self.tasks.push({
      task: 'create_non_player_characters',
      players,
    })
  }

  create_transform_character(player) {
    const self = this
    self.tasks.push({
      task: 'create_transform_character',
      player,
    })
  }

  create_multiple_objects(opoint, parent, number, vz) {
    const self = this
    self.tasks.push({
      task: 'create_multiple_objects',
      number: number,
      parent: parent,
      opoint: opoint,
      team: parent.team,
      pos: parent.mech.make_point(opoint),
      z: parent.ps.z,
      dir: parent.ps.dir,
      dvz: parent.dirv() * 2,
      vz: vz
    })
  }

  create_object(opoint, parent) {
    const self = this
    self.tasks.push({
      task: 'create_object',
      parent: parent,
      opoint: opoint,
      team: parent.team,
      pos: parent.mech.make_point(opoint),
      z: parent.ps.z + (opoint.dz || 0),
      dir: parent.ps.dir,
      dvz: parent.dirv() * 2
    })
  }

  destroy_object(obj) {
    const self = this
    self.tasks.push({
      task: 'destroy_object',
      obj: obj
    })
  }


  create_scenegraph() {
    const self = this
    self.scene = new Scene()
    for (const objecttype in factory) {
      self[objecttype] = {}
    }
  }

  create_timer() {
    const self = this
    if (self.destroyed) return  // match was torn down during load — never start its clock
    self.time =
    {
      t: 0,
      lastFrameMs: 0,
      paused: false,
      F5_mode: false,
      timer: null,
      $fps: domQuery.queryUI('fps')
    }
    if (!self.time.$fps) self.calculate_fps = function () { }
    self.time._startTimer = function () {
      if (self.time.timer) network.stopSync(self.time.timer)
      self.time.timer = network.startSync(
        function () { return self.frame() },
        self.time.F5_mode ? 5 : (1000 / Global.gameplay.framerate)
      )
    }
    self.time._startTimer()
  }

  frame() {
    const self = this
    if (self.control) { self.control.fetch() }
    if (!self.time.paused || self.time.paused === 'F2') {
      for (const i in self.character) {
        self.character[i].con.fetch()
        self.character[i].combodec.frame()
      }
      if (self.destroyed) {
        return
      }
      try {
        self.TU_trans()
      } catch (e) {
        console.error('TU_trans crash:', e.message, e.stack)
      }
      self.time.t++
      if (self.onframe) { self.onframe(self) }
      // Speech bubble (team commands Come/Stay/Move): position above the human
      // character, hide after the timer elapses.
      if (self.speech_timer > 0) {
        self.speech_timer--
        if (self.speech_timer === 0) {
          const bubble = domQuery.queryUI('speech_bubble')
          if (bubble) bubble.style.display = 'none'
        } else {
          const bubble = domQuery.queryUI('speech_bubble')
          if (bubble) {
            for (const i in self.character) {
              const c = self.character[i]
              if (c.is_human && c.health.hp > 0) {
                bubble.style.left = (c.ps.sx - 20) + 'px'
                bubble.style.top = (c.ps.sy + c.ps.sz - 32) + 'px'
                break
              }
            }
          }
        }
      }
      self.update_char_labels()
      // Random weapon drops from sky (LF2: ~every 10s at 30fps = every ~300 frames)
      if (!self.stage_mode && !self.demo_mode && self.time.t % 270 === 0) {
        const dropWeaponList = select.selectAll(self.data.object, isDropWeapon)
        const wid = dropWeaponList[Math.floor(self.random() * dropWeaponList.length)].id
        const pos = self.background.get_pos(self.random(), self.random())
        pos.y = -800
        createWeapon(self, wid, pos)
      }
      self.manager.canvas.render()
      self.calculate_fps()

      if (self.time.paused === 'F2') {
        self.time.paused = true
      }
    } else {
      if (self.time.$fps) {
        self.time.$fps.value = 'paused'
      }
    }
    // The state digest is only consumed by the lockstep verifier when a peer is
    // connected; in offline play the returned value is discarded, so skip the
    // per-frame allocation entirely.
    return network.isConnected() ? self.game_state() : undefined
  }

  // Lockstep state digest: everything the two peers compare to detect a desync.
  // `t` is the tick, `rng` the shared RNG state, `fx` the live effect counts and
  // `live` the per-uid object snapshot.
  game_state() {
    const self = this
    const live = {}
    // scene.live is keyed by monotonically increasing integer uids, so for..in
    // enumerates them in ascending numeric order already — the previous
    // Object.keys(...).sort(...) was a no-op and only added a per-frame
    // allocation + sort.
    for (const id in self.scene.live) {
      const e = self.scene.live[id]
      live[id] = [
        e?.type,
        e?.frame?.N,
        e?.ps?.x, e?.ps?.y, e?.ps?.z,
        e?.ps?.vx, e?.ps?.vy, e?.ps?.vz,
        e?.ps?.dir,
        e?.health?.hp, e?.health?.hp_bound, e?.health?.mp,
        e?.itr?.arest,
      ]
    }
    return {
      t: self.time.t,
      rng: [self.randomseed.x, self.randomseed.y],
      fx: [self.visualeffect?.livecount ?? 0, self.brokeneffect?.livecount ?? 0],
      live,
    }
  }

  show_speech(text) {
    const self = this
    self.speech_text = text
    self.speech_timer = 30  // 1 second at 30fps
    const bubble = domQuery.queryUI('speech_bubble')
    if (bubble) {
      bubble.textContent = text
      bubble.style.display = 'block'
    }
  }

  update_char_labels() {
    // Position each character's name label directly below their feet.
    // ps.sx/ps.sy are WORLD coordinates (the sprite top-left before the camera
    // scroll); the camera is applied at the foreground layer level via
    // background.scroll(cameraX), so the screen X is (sx + centerx - cameraX).
    // frame.D.centerx/centery are the per-character anchor (horizontal center +
    // feet height). Feet (screen) = (sx + centerx - cameraX, sy + sz + centery).
    const self = this
    const camX = self.background.cameraX || 0
    for (const uid in self.character) {
      const ch = self.character[uid]
      if (ch && ch.name_label && ch.ps && ch.health && ch.health.hp > 0 && ch.frame && ch.frame.D) {
        const fD = ch.frame.D
        ch.name_label.style.left = (ch.ps.sx + (fD.centerx || 0) - camX) + 'px'
        ch.name_label.style.top = (ch.ps.sy + ch.ps.sz + (fD.centery || 0)) + 'px'
      }
    }
  }

  TU_trans() {
    const self = this
    // Once the summary is up the match is over: stop advancing the fight, the AI
    // scripts and the sound queue. The clock keeps running so the summary's
    // continue keys (attack/jump, F4, esc) still dispatch through frame()'s
    // per-frame input fetch.
    if (self.gameover_shown) return
    self.emit_event('transit')
    self.process_tasks()
    self.emit_event('TU')
    self.background.TU()
    self.sound.TU()
    showHp(self)
    self.check_gameover()
    self.check_fusions()
    checkBattleReserves(self)
    updateBattleHud(self)
    const AI_frameskip = 3 // AI script runs at a lower framerate, and is still very reactive
    if (self.time.t % AI_frameskip === 0) {
      for (let i = 0; i < self.AIscript.length; i++) {
        self.AIscript[i].TU()
      }
    }
  }

  emit_event(E) {
    this.for_all(E)
  }

  for_all(oper) {
    const self = this
    for (const objecttype in factory) {
      for (const i in self[objecttype]) {
        self[objecttype][i][oper]()
      }
    }
  }

  process_tasks() {
    const self = this
    for (let i = 0; i < self.tasks.length; i++) {
      self.process_task(self.tasks[i])
    }
    self.tasks.length = 0
  }
  process_task(T) {
    const self = this
    switch (T.task) {
      case 'create_object': {
        if (T.opoint.oid) {
          const obj = self._instantiateObject(T)
          if (!obj) break
          if (obj.init) obj.init(T)
          const uid = self.scene.add(obj)
          self[obj.type][uid] = obj
        }
        break
      }
      case 'create_multiple_objects': {
        const max_number = Math.floor(T.number / 2)
        const vz_array = []
        // Sweep symmetric vz offsets around zero for projectile spread. With an
        // even count we skip the zero offset (otherwise two projectiles would
        // stack); with an odd count we keep it.
        const skip_zero = T.number % 2 === 0
        for (let temp1 = -max_number; temp1 <= max_number; temp1++) {
          if (skip_zero && temp1 === 0) continue
          vz_array.push(temp1 * T.vz)
        }
        for (const vz of vz_array) {
          if (T.opoint.oid) {
            const obj = self._instantiateObject(T)
            if (!obj) break
            obj.init(T)
            obj.ps.vz = vz
            obj.ps.vx += T.dir === 'left' ? Math.abs(vz) : -Math.abs(vz)
            const uid = self.scene.add(obj)
            self[obj.type][uid] = obj
          }
        }
        break
      }
      case 'create_non_player_characters':
        self.create_characters(T.players, { pane: false })
        break
      case 'create_transform_character':
        self.create_characters([T.player], { replace: true })
        break
      case 'destroy_object': {
        const obj = T.obj
        obj.destroy()
        const uid = self.scene.remove(obj)
        delete self[obj.type][uid]
        break
      }
    }
  }

  // Shared opoint-spawn tail: resolve the definition and construct the object,
  // or return null on missing data / lazy fallback. init(T) and the vz offset
  // stay at each call site on purpose: create_object guards init (effects have
  // none) while create_multiple_objects calls it unguarded, then applies spread.
  _instantiateObject(T) {
    const self = this
    const OBJ = select.selectOne(self.data.object, { id: T.opoint.oid })
    if (!OBJ) {
      console.error('Object', T.opoint.oid, 'not exists')
      return null
    }
    const config = { match: self, team: T.team }
    const obj = new factory[OBJ.type](config, OBJ.data, T.opoint.oid)
    if (obj.lazy_fallback) return null
    return obj
  }

  calculate_fps() {
    const self = this
    const mul = 10
    if (self.time.t % mul === 0) {
      const ot = self.time.lastFrameMs
      self.time.lastFrameMs = new Date().getTime()
      // First sample has no previous timestamp yet; skip it so diff is never NaN.
      if (!ot) { return }
      const diff = self.time.lastFrameMs - ot
      self.time.$fps.value = Math.round(1000 / diff * mul) + 'fps'
    }
  }

  create_characters(players, option) {
    const self = this
    if (option.pane) {  // initial spawn — clear any stale flags from a previous match
      const flags = domQuery.queryUI('panel_flags')
      if (flags) flags.innerHTML = ''
    }
    const char_config =
    {
      match: self,
      controller: null,
      team: 0
    }
    for (let i = 0; i < players.length; i++) {
      let player = players[i]
      const player_obj = select.selectOne(self.data.object, { id: player.id })
      if (!player_obj) {
        console.error("character data not found for id", player.id)
        continue
      }
      let pdata = player_obj.data
      preload_pack_images(player_obj)
      if (option.replace) {
        player.controller.child.length = 0
      }
      const controller = setup_controller(player)
      // create character
      const char = new factory.character(char_config, pdata, player.id)
      char.is_criminal = !!player.criminal
      char.is_human = controller.type !== 'AIcontroller'
      // name label shown below the character's feet (humans: their name; AI: "Com")
      const labels = domQuery.queryUI('char_labels')
      if (labels) {
        const label = document.createElement('div')
        label.className = 'char_name_label'
        label.textContent = char.is_human ? (player.name || '') : 'Com'
        // 19.gif: name labels are team-colored (Team1 blue, Team2 red)
        label.style.color = player.team === 2 ? '#FE4B48' : '#479AFC'
        labels.appendChild(label)
        char.name_label = label
      }
      if (player.defense_rate) char.defense_rate = player.defense_rate
      if (self.battle_mode) {
        char.leader = !!player.leader
        char.battle_unit = !!player.battle_unit
        if (char.battle_unit) {
          if (!self.battle_teams) self.battle_teams = { 1: { units: [] }, 2: { units: [] } }
          let team = self.battle_teams[player.team]
          if (!team.units.find(u => u.id === player.unit_id)) {
            team.units.push({ id: player.unit_id, in: 0, reserve: 0 })
          }
        }
      }
      if (controller.type === 'AIcontroller') {
        const aiEntry = select.selectOne(self.data.AI, { id: player.controller.id })
        if (aiEntry) {
          self.AIscript.push(new aiEntry.data(char, self, controller))
        }
      }
      // spec
      if (player.spec) {
        for (let I in player.spec) { // assign each spec into character
          assign_character_spec(char, player.spec, I)
        }
      }
      // outside spec
      // positioning
      if (player.pos) {
        char.set_pos(player.pos.x, player.pos.y, player.pos.z)
      } else {
        const pos = self.background.get_pos(self.random(), self.random())
        char.set_pos(pos.x, pos.y, pos.z)
      }
      // option
      let uid
      if (option.replace) {
        uid = self.scene.replace(player.spec.replace_from, char)
        char.uid = uid
        player.spec.replace_from.destroy()
      } else {
        uid = self.scene.add(char)
      }

      self.character[uid] = char
      // pane (battle units skip the HUD panel — only leaders get one; the panel
      // only has 8 slots but battle armies have dozens of units)
      if (self.panel && option.pane && !player.battle_unit) {
        createPane(self, i, pdata, uid, player)
      }
    }
    function preload_pack_images(char) {
      if (!char.pack) return  // items/drinks have no transform pack
      for (let j = 0; j < char.pack.length; j++) {
        const obj = char.pack[j].data
        if (obj.bmp && obj.bmp.file) {
          for (let k = 0; k < obj.bmp.file.length; k++) {
            const file = obj.bmp.file[k]
            for (const m in file) {
              if (typeof file[m] === 'string' && m.indexOf('file') === 0) {
                spriteRenderer.preload_image(file[m])
              }
            }
          }
        }
      }
    }
    function setup_controller(player) {
      let controller
      switch (player.controller.type) {
        case 'AIscript':
          controller = new AI.controller()
          break
        default:
          controller = player.controller
          controller.child.push(self)
      }
      char_config.controller = controller
      char_config.team = player.team
      controller.sync = true
      return controller
    }
    function assign_character_spec(char, spec, index) {
      switch (index) {
        case 'is_npc':
          char.is_npc = spec[index]
          break
        case 'health':
          for (let I in spec[index]) {
            char.health[I] = spec[index][I]
          }
          break
        case 'dir':
          char.switch_dir(spec[index])
          break
        case 'stat':
          for (let J in spec[index]) {
            char.stat[J] = spec[index][J]
          }
          break
        case 'parent':
          char.parent = spec[index]
          break
        case 'transform_character':
          if (!char.transform_character) {
            char.transform_character = {}
          }
          for (let L in spec[index]) {
            char.transform_character[L] = spec[index][L]
          }
          break
      }
    }
  }

  check_fusions() {
    const self = this
    if (self.time.t % 12 !== 0) return  // Check every 12 frames

    let firen = null
    let freeze = null
    for (const uid in self.character) {
      const ch = self.character[uid]
      if (ch.health.hp <= 0) continue
      if (ch.id === ID.FIREN) firen = ch  // Firen
      if (ch.id === ID.FREEZE) freeze = ch  // Freeze
    }

    if (firen && freeze && firen.team === freeze.team) {
      const dx = firen.ps.x - freeze.ps.x
      const dy = firen.ps.y - freeze.ps.y
      const dz = firen.ps.z - freeze.ps.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < 30 && firen.health.hp > 0 && freeze.health.hp > 0) {
        // Both must be under 1/3 HP to fuse, unless the lf2.net cheat lifts the cap.
        const hpOk = self.manager.lf2net ||
          (firen.health.hp < firen.health.hp_full / 3 && freeze.health.hp < freeze.health.hp_full / 3)
        if (!hpOk) return
        // Fuse into Firzen!
        const fx = (firen.ps.x + freeze.ps.x) / 2
        const fy = (firen.ps.y + freeze.ps.y) / 2
        const fz = (firen.ps.z + freeze.ps.z) / 2

        firen.health.hp = 0  // Remove Firen
        freeze.health.hp = 0  // Remove Freeze

        // Create Firzen
        const playerObj = select.selectOne(self.data.object, { id: 51 })  // Firzen
        const charConfig = { match: self, controller: firen.con, team: firen.team }
        const firzen = new factory.character(charConfig, playerObj.data, 51)
        firzen.set_pos(fx, fy, fz)
        const uid = self.scene.add(firzen)
        self.character[uid] = firzen
      }
    }
  }

  // Teams that still have an alive character occupying a panel slot.
  _collectAliveTeams() {
    const self = this
    const teams = {}
    for (let i = 0; i < self.panel.length; i++) {
      if (self.panel[i].uid !== undefined) {
        const ch = self.character[self.panel[i].uid]
        if (ch && ch.health.hp > 0) {
          teams[ch.team] = true
        }
      }
    }
    return teams
  }

  // Stage-mode transitions (wave spawn, stage advance, life-loss retry, victory)
  // are scheduled with setTimeout; tracking the handles lets destroy() cancel
  // them so a quit can never fire a follow-up transition on a dead match.
  _stage_timeout(fn, ms) {
    const self = this
    const id = setTimeout(fn, ms)
    self._stage_timers.push(id)
  }

  // Clear the game-over latch and bring in `wave` after the official 2500ms
  // delay, so the final KO of a cleared wave still plays out. Used both for the
  // next stage wave and for survival mode looping back to its first phase.
  spawn_next_wave(wave) {
    const self = this
    self.stage_wave = wave
    self.gameover_state = false
    self.stage_wave_pending = true
    self._stage_timeout(() => { self.stage_wave_pending = false; spawnStageWave(self) }, 2500)
  }

  check_gameover() {
    const self = this
    if (!self.panel) return

    // Battle mode: keep fighting while a team still has reserves pending.
    if (self.battle_mode && self.battle_teams) {
      for (const team of [1, 2]) {
        const t = self.battle_teams[team]
        for (const unit of t.units) {
          if (unit.reserve > 0) return
        }
      }
    }

    const teams = self._collectAliveTeams()
    for (const uid in self.character) {
      const ch = self.character[uid]
      if (ch.health.hp > 0) {
        teams[ch.team] = true
      }
    }

    if (Object.keys(teams).length < 2) {
      const remainingTeam = Number(Object.keys(teams)[0])
      self.winner_team = remainingTeam  // NaN when double-KO (both teams dead)

      // Stage mode: player cleared a wave
      if (self.stage_mode && remainingTeam === self.player_team && !self.stage_wave_spawning && !self.stage_cleared && !self.stage_wave_pending) {
        const waves = self.stage_config.waves
        if (self.stage_wave + 1 < waves.length) {
          self.spawn_next_wave(self.stage_wave + 1)
          return
        } else {
          // Survival: endless — loop to the official when_clear_goto_phase, no HP heal.
          if (self.survival) {
            self.spawn_next_wave(self.stage_config.loop_to ?? 90)
            return
          }
          // All waves cleared — stage complete!
          self.stage_cleared = true
          self.stage_wave = 0

          if (self.stage_list && self.stage_index + 1 < self.stage_list.length) {
            // Advance to next stage
            self.overlay_message('stage_clear')
            self._stage_timeout(() => {
              self.destroy()
              self.manager.start_stage_match(self.stage_index + 1, self.stage_lives, self.difficulty)
            }, 3000)
          } else {
            // All stages complete — victory!
            self.gameover_state = self.time.t
            self.overlay_message('victory')
            self._stage_timeout(() => { self.F4() }, 5000)
          }
          return
        }
      }

      // Stage mode: player died
      if (self.stage_mode && remainingTeam !== self.player_team) {
        self.stage_lives--
        if (self.stage_lives > 0) {
          // Respawn player with new life
          self.stage_wave = 0 // Reset to first wave
          self.gameover_state = false
          self.overlay_message('life_lost')
          self._stage_timeout(() => {
            // Restart current stage
            self.destroy()
            self.manager.start_stage_match(self.stage_index, self.stage_lives, self.difficulty)
          }, 2000)
          return
        }
        // Game over
        if (!self.gameover_state) {
          self.gameover_state = self.time.t
        }
      }

      // Normal gameover
      if (!self.gameover_state) {
        self.gameover_state = self.time.t
      } else {
        if (self.time.t === self.gameover_state + 30) {
          self.gameover()
        }
      }
    } else {
      if (self.gameover_state) {
        self.gameover_state = false
        self.gameover()
      }
    }
  }

  gameover() {
    const self = this
    if (self.gameover_state) {
      self.gameover_shown = true
      const info = []
      const teams = self._collectAliveTeams()
      for (let i = 0; i < self.panel.length; i++) {
        if (self.panel[i].uid !== undefined) {
          let ch = self.character[self.panel[i].uid]
          if (!ch) continue
          const alive = ch.health.hp > 0
          const win = teams[ch.team]
          // [ Icon, Name, Kill, Attack, HP Lost, MP Usage, Picking, Status ]
          info.push([ch.data.bmp.small, self.panel[i].name, ch.stat.kill, ch.stat.attack, ch.health.hp_lost, ch.health.mp_usage, ch.stat.picking, (win ? 'Win' : 'Lose') + ' (' + (alive ? 'Alive' : 'Dead') + ')'])
        }
      }
      self.manager.summary.setInfo(info)
      const dur = self.time.t / Global.gameplay.framerate
      self.manager.summary.setTime(new Date(dur * 1000).toISOString().substring(14, 19))
      self.manager.summary.show()
      self.manager.sound.play('1/m_end')
    } else {
      self.manager.summary.hide()
    }
  }

  key(K, down) {
    const self = this
    if (self.gameover_state) {
      if (down) {
        if (self.time.t > self.gameover_state + 60) {
          if (K === 'att' || K === 'jump') {
            self.F4()
          }
        }
      }
    }
  }

  create_effects(config) {
    const self = this
    const effects = coreUtil.extractArray(select.selectAll(self.data.object, { type: 'effect' }), ['data', 'id'])
    const broken = select.selectOne(self.data.object, { type: 'broken' })
    self.broken_list = coreUtil.groupBy(broken.data.broken_list, 'id')
    self.visualeffect = self.effect[0] = new factory.effect({ match: self, stage: self.stage }, effects.data, effects.id)
    self.brokeneffect = self.effect[1] = new factory.effect({ match: self, stage: self.stage, broken_list: self.broken_list }, broken.data, broken.id)
  }

  create_background(bg) {
    const self = this
    if (bg) {
      const bgdata = select.selectOne(self.data.background, { id: bg.id }).data
      self.background = new Background({
        layers: self.manager.background_layer,
        scrollbar: self.manager.gameplay,
        camerachase: { character: self.character },
        onscroll: function () { self.manager.canvas.render() }
      }, bgdata, bg.id)
      self.stage = self.background.floor
    } else {
      self.background = new Background(null) // create an empty background
      self.stage = self.manager.canvas
    }
  }

  F4() {
    const self = this
    self.manager._destroy_current_match()
    self.manager.match_end()
  }

  F7() {
    const self = this
    // Full-recover cheat revives everyone, so the frozen gameover summary must
    // unfreeze and let check_gameover() resume the match (original LF2 behavior).
    self.gameover_shown = false
    for (const i in self.character) {
      const ch = self.character[i]
      ch.health.hp = ch.health.hp_full = ch.health.hp_bound = ch.getProperty('hp') || Global.gameplay.default.health.hp_full
      ch.health.mp = ch.health.mp_full
    }
  }

  adjust_volume(delta) {
    const self = this
    const next = Math.max(0, Math.min(1, self.manager.sound.volume + delta))
    self.manager.sound.setVolume(next)
    self.manager.music.setVolume(next)
  }

  new_randomseed(seed) {
    const rand = new Random()
    this.seed = (seed === undefined) ? this.manager.random() : seed
    rand.seed(this.seed)
    return rand
  }

  random() {
    return this.randomseed.next()
  }

  overlay_message(mess) {
    const self = this
    if (self.manager.overlay_mess) {
      self.manager.overlay_mess.show()
      const item = self.data.UI.data.message_overlay[mess]
      self.manager.overlay_mess.set_img_x_y(-item[0], -item[1])
      self.manager.overlay_mess.set_w_h(item[2], item[3])
    }
  }

  create_controller(funcon) {
    const self = this
    function show_pause() {
      if (!self) return
      if (self.time.paused) {
        self.overlay_message('pause')
      }
    }
    if (funcon) {
      funcon.sync = true
      funcon.child.push({
        key: function (I, down) {
          const opaused = self.time.paused // original pause state
          // F6-F9 are disabled in stage mode (original LF2 behavior)
          const cheatsLocked = self._cheatsLocked || self.stage_mode
          if (down) {
            switch (I) {
              case 'F1':
                if (!self.time.paused) { self.time.paused = true } else { self.time.paused = false }
                break

              case 'F2':
                self.time.paused = 'F2'
                break

              case 'F3':
                // Lock/unlock F6-F9 cheat keys (original LF2 behavior)
                self._cheatsLocked = !self._cheatsLocked
                break

              case 'esc':
                // Quit match — go back to frontpage (original LF2: ESC = quit)
                self.manager.match_quit()
                return

              case 'F4':
                self.F4()
                break

              case 'F5':
                if (!cheatsLocked) {
                  // Speed up: disable frame limiter (original LF2: turn off frame control timer)
                  self.time.F5_mode = !self.time.F5_mode
                  self.time._startTimer()
                }
                break

              case 'F6':
                if (!cheatsLocked) {
                  if (!self.infiniteMp) { self.infiniteMp = true } else { self.infiniteMp = false }
                }
                break

              case 'F7':
                if (!cheatsLocked) {
                  self.F7()
                }
                break

              case 'F8':
                if (!cheatsLocked) {
                  dropWeapons(self)
                }
                break

              case 'F9':
                if (!cheatsLocked) {
                  destroyWeapons(self)
                }
                break

              case 'F11':
                // Volume up (original LF2: F11 = audio volume +)
                self.adjust_volume(0.1)
                break

              case 'F12':
                // Volume down (original LF2: F12 = audio volume -)
                self.adjust_volume(-0.1)
                break
            }
            if ((I === 'F1' || I === 'F2') && self.time.paused) {
              self.manager.overlay_mess.hide()
              setTimeout(show_pause, 4) // so that the 'pause' message blinks
            } else if (!self.time.paused) {
              self.manager.overlay_mess.hide()
            }
            if (opaused !== self.time.paused) {  // state change
              if (self.time.paused) {
                if (funcon.paused) {
                  funcon.paused(true)
                }
              } else {
                if (funcon.paused) {
                  funcon.paused(false)
                }
              }
            }
          }
        }
      })
      return funcon
    }
  }

  // Every live object with HP left: all non-characters, plus characters that
  // are not mid-vanish (disappear_count === -1).
  get_living_object() {
    const self = this
    const alive = {}
    for (const uid in self.scene.live) {
      const o = self.scene.live[uid]
      if (o.health.hp <= 0) continue
      if (o.type === 'character' && o.counter.disappear_count !== -1) continue
      alive[uid] = o
    }
    return alive
  }

}
