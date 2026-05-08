import coreUtil from "engine/core/util"
import spriteRenderer from "engine/core/sprite-canvas"
import network from "engine/network"
import factory from "engine/Game/factories"
import Scene from "engine/Game/scene"
import Background from "engine/Game/background"
import AI from "engine/Game/AI"
import Random from "engine/third_party/random"
import util from "engine/Game/util"
import Global from "engine/Game/global"

const ID = Global.gameplay.ID

// Battle-mode HUD accents: Team 1 blue, Team 2 red (19.gif).
const TEAM_COLORS = { 1: '#98B0FB', 2: '#FAB0A1' }

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
      const playerObj = util.selectOne(this.data.object, { id: players[i].id })
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
  self.randomseed = self.new_randomseed(setting.seed)
  self.onframe = setting.onframe || null
  self.onend = setting.onend || null
  self.create_scenegraph()
  self.control = self.create_controller(setting.control)
  self.functionkey_control = setting.control
  if (self.functionkey_control &&
    self.functionkey_control.restart) {
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
    const counter = util.queryUI('stage_counter')
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
      self.drop_weapons()
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
  self.time.paused = true
  self.destroyed = true
  network.stopSync(self.time.timer)
  if (self.onend) { const cb = self.onend; self.onend = null; cb() }

  // destroy all objects
  self.for_all('destroy')
  self.background.destroy()
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
    z: parent.ps.z,
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
  self.time =
  {
    t: 0,
    paused: false,
    F5_mode: false,
    timer: null,
    $fps: util.queryUI('fps')
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
        const bubble = util.queryUI('speech_bubble')
        if (bubble) bubble.style.display = 'none'
      } else {
        const bubble = util.queryUI('speech_bubble')
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
      const dropWeapons = util.selectAll(self.data.object, function (o) {
        return o.id >= 100 && o.id < 200 && o.id !== 217 && o.id !== 218 // exclude armor pieces
      })
      const wid = dropWeapons[Math.floor(self.random() * dropWeapons.length)].id
      const pos = self.background.get_pos(self.random(), self.random())
      pos.y = -800
      self.create_weapon(wid, pos)
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
  return self.game_state()
}

  game_state() {
  const self = this
  const d = {}
  d.time = self.time.t
  for (const i in self.character) {
    const c = self.character[i]
    d[i] = [c.ps.x, c.ps.y, c.ps.z, c.health.hp, c.health.mp]
  }
  return d
}

  show_speech(text) {
    const self = this
    self.speech_text = text
    self.speech_timer = 30  // 1 second at 30fps
    const bubble = util.queryUI('speech_bubble')
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
      const c = self.character[uid]
      if (c && c.name_label && c.ps && c.health && c.health.hp > 0 && c.frame && c.frame.D) {
        const fD = c.frame.D
        c.name_label.style.left = (c.ps.sx + (fD.centerx || 0) - camX) + 'px'
        c.name_label.style.top = (c.ps.sy + c.ps.sz + (fD.centery || 0)) + 'px'
      }
    }
  }

  TU_trans() {
  const self = this
  self.emit_event('transit')
  self.process_tasks()
  self.emit_event('TU')
  self.background.TU()
  self.sound.TU()
  self.show_hp()
  self.check_gameover()
  self.check_fusions()
  self.check_battle_reserves()
  self.update_battle_hud()
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
        const OBJ = util.selectOne(self.data.object, { id: T.opoint.oid })
        if (!OBJ) {
          console.error('Object', T.opoint.oid, 'not exists')
          break
        }
        const config = { match: self, team: T.team }
        const obj = new factory[OBJ.type](config, OBJ.data, T.opoint.oid)
        if (obj.lazy_fallback) break
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
          const OBJ = util.selectOne(self.data.object, { id: T.opoint.oid })
          if (!OBJ) {
            console.error('Object', T.opoint.oid, 'not exists')
            break
          }
          const config = { match: self, team: T.team }
          const obj = new factory[OBJ.type](config, OBJ.data, T.opoint.oid)
          if (obj.lazy_fallback) break
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

  calculate_fps() {
  const self = this
  const mul = 10
  if (self.time.t % mul === 0) {
    const ot = self.time.time
    self.time.time = new Date().getTime()
    const diff = self.time.time - ot
    self.time.$fps.value = Math.round(1000 / diff * mul) + 'fps'
  }
}

  transform_panel(from_uid, to_uid) {
  const self = this
  // ==========panel==========
  let from_index = -1
  let to_index = -1
  for (const index in self.panel) {
    if (from_uid) {
      if (self.panel[index].uid === from_uid) {
        from_index = index
      }
    }
    if (to_uid) {
      if (self.panel[index].uid === to_uid) {
        to_index = index
      }
    }
  }
  if (from_index === -1) { return }
  if (to_index != -1) {
    self.panel[from_index].spic.temp_img = {0: self.panel[from_index].spic.img[0]}
    self.panel[from_index].spic.img[0] = self.panel[to_index].spic.img[0]
  } else {
    self.panel[from_index].spic.img = self.panel[from_index].spic.temp_img
  }
}

  create_characters(players, option) {
  const self = this
  if (option.pane) {  // initial spawn — clear any stale flags from a previous match
    const flags = util.queryUI('panel_flags')
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
    const player_obj = util.selectOne(self.data.object, { id: player.id })
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
    const labels = util.queryUI('char_labels')
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
      const aiEntry = util.selectOne(self.data.AI, { id: player.controller.id })
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
      create_pane(i, pdata, uid, player)
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
  function create_pane(i, pdata, uid, player) {
    const X = self.data.UI.data.panel.pane_width * (i % 4)
    const Y = self.data.UI.data.panel.pane_height * Math.floor(i / 4)
    const spic = new spriteRenderer({
      canvas: self.manager.panel_layer,
      img: pdata.bmp.small,
      xy: { x: X + self.data.UI.data.panel.x, y: Y + self.data.UI.data.panel.y },
      wh: 'fit'
    })
    self.panel[i].uid = uid
    self.panel[i].name = player.name
    self.panel[i].spic = spic
    self.panel[i].hp_bound = new spriteRenderer({ canvas: self.manager.panel_layer })
    self.panel[i].hp_bound.set_x_y(X + self.data.UI.data.panel.hpx, Y + self.data.UI.data.panel.hpy)
    self.panel[i].hp_bound.set_w_h(self.data.UI.data.panel.hpw, self.data.UI.data.panel.hph)
    self.panel[i].hp_bound.set_bgcolor(self.data.UI.data.panel.hp_dark)
    self.panel[i].hp = new spriteRenderer({ canvas: self.manager.panel_layer })
    self.panel[i].hp.set_x_y(X + self.data.UI.data.panel.hpx, Y + self.data.UI.data.panel.hpy)
    self.panel[i].hp.set_w_h(self.data.UI.data.panel.hpw, self.data.UI.data.panel.hph)
    self.panel[i].hp.set_bgcolor(self.data.UI.data.panel.hp_bright)
    self.panel[i].mp_bound = new spriteRenderer({ canvas: self.manager.panel_layer })
    self.panel[i].mp_bound.set_x_y(X + self.data.UI.data.panel.mpx, Y + self.data.UI.data.panel.mpy)
    self.panel[i].mp_bound.set_w_h(self.data.UI.data.panel.mpw, self.data.UI.data.panel.mph)
    self.panel[i].mp_bound.set_bgcolor(self.data.UI.data.panel.mp_dark)
    self.panel[i].mp = new spriteRenderer({ canvas: self.manager.panel_layer })
    self.panel[i].mp.set_x_y(X + self.data.UI.data.panel.mpx, Y + self.data.UI.data.panel.mpy)
    self.panel[i].mp.set_w_h(self.data.UI.data.panel.mpw, self.data.UI.data.panel.mph)
    self.panel[i].mp.set_bgcolor(self.data.UI.data.panel.mp_bright)
    // Battle mode: a team flag (blue Team1 / red Team2) sits at the top-left of
    // each leader's status block (19.gif).
    if (player.leader) {
      const flags = util.queryUI('panel_flags')
      if (flags) {
        const flag = document.createElement('div')
        flag.className = 'battle_hud_flag'
        flag.style.background = player.team === 2 ? '#D83A3A' : '#3A6BD8'
        flag.style.left = (X + 5) + 'px'
        flag.style.top = (Y + 4) + 'px'
        flags.appendChild(flag)
      }
    }
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

  show_hp() {
  const self = this
  if (self.panel) {
    for (let i = 0; i < self.panel.length; i++) {
      if (self.panel[i].uid !== undefined) {
        const ch = self.character[self.panel[i].uid]
        if (!ch) continue
        let hp = Math.floor(ch.health.hp / ch.health.hp_full * self.data.UI.data.panel.hpw)
        let hp_bound = Math.floor(ch.health.hp_bound / ch.health.hp_full * self.data.UI.data.panel.hpw)
        if (hp < 0) { hp = 0 }
        if (hp_bound < 0) { hp_bound = 0 }
        self.panel[i].hp.set_w(hp)
        self.panel[i].hp_bound.set_w(hp_bound)
        self.panel[i].mp.set_w(Math.floor(ch.health.mp / ch.health.mp_full * self.data.UI.data.panel.mpw))
        if (ch.effect.heal && ch.effect.heal > 0 && self.time.t % 3 === 0) {
          self.panel[i].hp.set_bgcolor(self.data.UI.data.panel.hp_light)
        } else {
          self.panel[i].hp.set_bgcolor(self.data.UI.data.panel.hp_bright)
        }
      }
    }
  }
}

  check_fusions() {
  const self = this
  if (self.time.t % 12 !== 0) return  // Check every 12 frames

  let firen = null, freeze = null
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
      const playerObj = util.selectOne(self.data.object, { id: 51 })  // Firzen
      const charConfig = { match: self, controller: firen.con, team: firen.team }
      const firzen = new factory.character(charConfig, playerObj.data, 51)
      firzen.set_pos(fx, fy, fz)
      const uid = self.scene.add(firzen)
      self.character[uid] = firzen
    }
  }
}

  spawn_stage_wave() {
  const self = this
  if (!self.stage_mode || !self.stage_config) return
  if (self.stage_wave_spawning) return

  const waves = self.stage_config.waves
  if (self.stage_wave >= waves.length) return

  self.stage_wave_spawning = true
  const wave = waves[self.stage_wave]
  const players = []
  const itemIds = []
  // Enemy HP scales with difficulty (Easy / Normal / Difficult / CRAZY!).
  // The stage data holds the base "Difficult" values.
  // Difficulty HP multipliers (official LF2: Easy 3/4, Normal/Difficult 1x,
  // CRAZY! 3/2 — from lf-empire.de stage.dat docs and the Stage Mode wiki).
  const hpFactor = [0.75, 1.0, 1.0, 1.5][self.difficulty] || 1.0

  for (let i = 0; i < wave.enemies.length; i++) {
    const enemy = wave.enemies[i]
    // "random hero" (id 1000 in official stage.dat) resolves to a random playable hero.
    const HEROES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11]
    const eid = enemy.random ? HEROES[Math.floor(self.random() * HEROES.length)] : enemy.id
    const obj = util.selectOne(self.data.object, { id: eid })
    // Milk/Beer (and other non-character objects) are pickups, not fighters
    if (obj && obj.type !== 'character') {
      itemIds.push(eid)
      continue
    }
    const hp = enemy.hp ? Math.round(enemy.hp * hpFactor) : 0
    players.push({
      name: enemy.name,
      controller: { type: 'AIscript', id: self.data.AI[0].id },
      id: eid,
      team: 2,  // enemy team
      criminal: eid === 300,  // hostage NPC — becomes an ally when defeated
      spec: hp ? { health: { hp: hp, hp_full: hp, hp_bound: hp } } : undefined
    })
  }

  // Collect object IDs for lazy loading (characters + drink items)
  const { objectIds: objIds, aiIds } = self._collectLoadIds(players)
  const loadIds = objIds.concat(itemIds)

  self.data.load({
    object: loadIds,
    AI: aiIds
  }, () => {
    // Survival: enemies spread across the right half (wiki: "far-right"), milk far-left.
    if (self.survival) {
      const count = players.length
      for (let i = 0; i < count; i++) {
        const rx = count === 1 ? 0.75 : 0.55 + (i / (count - 1)) * 0.35
        const rz = 0.35 + ((i % 3) / 2) * 0.3  // slight depth variation so they don't stack
        const pos = self.background.get_pos(rx, rz)
        players[i].pos = { x: pos.x, y: pos.y, z: pos.z }
      }
      const counter = util.queryUI('stage_counter')
      if (counter) {
        counter.style.display = 'block'
        counter.textContent = 'Survival Stage: ' + self.stage_wave
      }
    }
    self.create_characters(players, { pane: false })
    for (let i = 0; i < itemIds.length; i++) {
      const pos = self.survival
        ? self.background.get_pos(0.1, 0.5)   // far-left milk
        : self.background.get_pos(self.random(), self.random())
      pos.y = -800
      self.create_weapon(itemIds[i], pos)
    }
    self.stage_wave_spawning = false
  })
}

  // Battle Mode: respawn a unit from a team's reserve when a battle unit dies.
  check_battle_reserves() {
    const self = this
    if (!self.battle_mode || !self.battle_teams) return
    for (const team of [1, 2]) {
      const t = self.battle_teams[team]
      for (const unit of t.units) {
        let alive = 0
        for (const uid in self.character) {
          const ch = self.character[uid]
          if (ch.team === team && ch.id === unit.id && ch.health.hp > 0) alive++
        }
        while (alive < unit.in && unit.reserve > 0) {
          unit.reserve--
          alive++
          const pos = self.background.get_pos(team === 1 ? 0.15 : 0.85, self.random())
          pos.y = -800
          self.create_characters([{
            name: 'Soldier',
            controller: { type: 'AIscript', id: self.data.AI[0].id },
            id: unit.id,
            team: team,
            defense_rate: t.defense,
            battle_unit: true,
            unit_id: unit.id,
            pos: pos
          }], { pane: false })
        }
      }
    }
  }

  update_battle_hud() {
    const self = this
    const hud = util.queryUI('battle_hud')
    if (!hud) return
    if (!self.battle_mode) { hud.style.display = 'none'; return }
    hud.style.display = 'block'

    const stats = { 1: { man: 0, hp: 0, reserve: 0, die: 0 }, 2: { man: 0, hp: 0, reserve: 0, die: 0 } }
    for (const uid in self.character) {
      const c = self.character[uid]
      if (!c || (c.team !== 1 && c.team !== 2)) continue
      const s = stats[c.team]
      if (c.health.hp > 0) { s.man++; s.hp += Math.floor(c.health.hp) }
      else { s.die++ }
    }
    if (self.battle_teams) {
      for (const team of [1, 2]) {
        const bt = self.battle_teams[team]
        if (!bt) continue
        for (const u of bt.units) stats[team].reserve += u.reserve
      }
    }

    let html = ''
    for (const team of [1, 2]) {
      const s = stats[team]
      const name = self.battle_config?.teams?.[team]?.name || ''
      const color = TEAM_COLORS[team]
      html += '<div class="battle_hud_team battle_hud_team' + team + '">'
        + '<div class="battle_hud_stats" style="color:' + color + '">Man: ' + s.man + '  HP: ' + s.hp + '  Reserve: ' + s.reserve + '  Die: ' + s.die + '</div>'
        + '<div class="battle_hud_diff" style="color:' + color + '">' + name + '</div>'
        + '</div>'
    }
    hud.innerHTML = html
  }

  check_gameover() {
  const self = this
  const teams = {}
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

  for (let i = 0; i < self.panel.length; i++) {
    if (self.panel[i].uid !== undefined) {
      const ch = self.character[self.panel[i].uid]
      if (ch && ch.health.hp > 0) {
        teams[ch.team] = true
      }
    }
  }
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
        self.stage_wave++
        self.gameover_state = false
        self.stage_wave_pending = true
        setTimeout(() => { self.stage_wave_pending = false; self.spawn_stage_wave() }, 2500)
        return
      } else {
        // Survival: endless — loop to the official when_clear_goto_phase, no HP heal.
        if (self.survival) {
          self.stage_wave = self.stage_config.loop_to ?? 90
          self.gameover_state = false
          self.stage_wave_pending = true
          setTimeout(() => { self.stage_wave_pending = false; self.spawn_stage_wave() }, 2500)
          return
        }
        // All waves cleared — stage complete!
        self.stage_cleared = true
        self.stage_wave = 0

        if (self.stage_list && self.stage_index + 1 < self.stage_list.length) {
          // Advance to next stage
          self.overlay_message('stage_clear')
          setTimeout(() => {
            self.destroy()
            self.manager.start_stage_match(self.stage_index + 1, self.stage_lives, self.difficulty)
          }, 3000)
        } else {
          // All stages complete — victory!
          self.gameover_state = self.time.t
          self.overlay_message('victory')
          setTimeout(() => { self.F4() }, 5000)
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
        setTimeout(() => {
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
    const info = []
    const teams = {}
    for (let i = 0; i < self.panel.length; i++) {
      if (self.panel[i].uid !== undefined) {
        let ch = self.character[self.panel[i].uid]
        if (ch && ch.health.hp > 0) {
          teams[ch.team] = true
        }
      }
    }
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
    self.manager.summary.setTime(new Date(dur * 1000).toISOString().substr(14, 5))
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
  const effects = coreUtil.extractArray(util.selectAll(self.data.object, { type: 'effect' }), ['data', 'id'])
  const broken = util.selectOne(self.data.object, { type: 'broken' })
  self.broken_list = coreUtil.groupBy(broken.data.broken_list, 'id')
  self.visualeffect = self.effect[0] = new factory.effect({ match: self, stage: self.stage }, effects.data, effects.id)
  self.brokeneffect = self.effect[1] = new factory.effect({ match: self, stage: self.stage, broken_list: self.broken_list }, broken.data, broken.id)
}

  drop_weapons() {
  const self = this
  const num = 5
  const weapon_list =
    util.selectAll(self.data.object, function (o) {
      return o.id >= 100 && o.id < 200 && o.id !== 217 && o.id !== 218
    })
  for (let i = 0; i < num; i++) {
    const O = self.background.get_pos(self.random(), self.random())
    O.y = -800
    self.create_weapon(weapon_list[Math.floor(weapon_list.length * self.random())].id, O)
  }
}

  destroy_weapons() {
  const self = this
  for (let i in self.lightweapon) {
    self.lightweapon[i].health.hp = 0
  }
  for (let i in self.heavyweapon) {
    self.heavyweapon[i].health.hp = 0
  }
}

  create_weapon(id, pos) {
  const self = this
  const object = util.selectOne(self.data.object, { id: id })
  if (!object) { console.error("create_weapon: no data for id", id); return }
  const type = object.type
  const wea_config = { match: self }
  try {
    const wea = new factory[type](wea_config, object.data, object.id)
    wea.set_pos(pos.x, pos.y, pos.z)
    const uid = self.scene.add(wea)
    self[type][uid] = wea
  } catch(e) {
    console.error("create_weapon failed:", id, type, e.message)
  }
}

  create_background(bg) {
  const self = this
  if (bg) {
    const bgdata = util.selectOne(self.data.background, { id: bg.id }).data
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
  self.destroy()
  self.manager.match_end()
}

  F7() {
  const self = this
  for (const i in self.character) {
    const ch = self.character[i]
    ch.health.hp = ch.health.hp_full = ch.health.hp_bound = ch.getProperty('hp') || Global.gameplay.default.health.hp_full
    ch.health.mp = ch.health.mp_full
  }
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
              self.destroy()
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
                self.drop_weapons()
              }
              break

            case 'F9':
              if (!cheatsLocked) {
                self.destroy_weapons()
              }
              break

            case 'F11':
              // Volume up (original LF2: F11 = audio volume +)
              if (self.manager.sound.volume < 1) {
                self.manager.sound.volume = Math.min(1, self.manager.sound.volume + 0.1)
              }
              break

            case 'F12':
              // Volume down (original LF2: F12 = audio volume -)
              if (self.manager.sound.volume > 0) {
                self.manager.sound.volume = Math.max(0, self.manager.sound.volume - 0.1)
              }
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

  get_living_object() {
  const self = this
  let temp = {}
  for (const a in self.scene.live) {
    if (self.scene.live[a].health.hp > 0) {
      if (self.scene.live[a].type === 'character') {
        if (self.scene.live[a].counter.disappear_count === -1) {
          temp[a] = self.scene.live[a]
        }
      } else {
        temp[a] = self.scene.live[a]
      }
    }
  }
  return temp
}

}
