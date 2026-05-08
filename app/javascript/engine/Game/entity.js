// entity.js — Base class for every entity in the game (characters,
// weapons, projectiles, effects). Provides frame/state management, physics,
// collision, and lifecycle hooks.

import Global from "engine/Game/global"
import Sprite from "engine/Game/sprite"
import Mech from "engine/Game/mechanics"
import AI from "engine/Game/AI"
import spriteRenderer from "engine/core/sprite-canvas"

const Gameplay = Global.gameplay
const S = Gameplay.STATE
const AUTH = Gameplay.AUTHORITY
const FR = Gameplay.FRAME

// -- Private: frame transition state machine --
// Authority levels: 0=natural, 10=move/defend/jump, 11=special,
// 15=environmental, 20+=interactions, 30+=strong

class FrameTransition {
  #entity
  #wait = 1
  #next = FR.RESET
  #lock = 0
  #lockout = 1
  #switchDirAfterTrans = false

  constructor(entity) {
    this.#entity = entity
  }

  frame(frameNumber, authority) {
    this.setNext(frameNumber, authority)
    this.setWait(0, authority)
  }

  setWait(value, authority = 0, out = 1) {
    if (authority === AUTH.INHERIT) authority = this.#lock
    if (authority >= this.#lock) {
      this.#lock = authority
      this.#lockout = out
      if (out === AUTH.INHERIT) this.#lockout = this.#wait
      this.#wait = value
      if (this.#wait < 0) this.#wait = 0
    }
  }

  incrementWait(inc, authority = 0, out = 1) {
    if (authority === AUTH.INHERIT) authority = this.#lock
    if (authority >= this.#lock) {
      this.#lock = authority
      this.#lockout = out
      if (out === AUTH.INHERIT) this.#lockout = this.#wait
      this.#wait += inc
      if (this.#wait < 0) this.#wait = 0
    }
  }

  next() { return this.#next }
  wait() { return this.#wait }

  setNext(value, authority = 0, out = 1) {
    if (authority === AUTH.INHERIT) authority = this.#lock
    if (authority >= this.#lock) {
      this.#lock = authority
      this.#lockout = out
      if (out === AUTH.INHERIT) this.#lockout = this.#wait
      if (value < 0) {
        value = -value
        this.#switchDirAfterTrans = true
      }
      this.#next = value
    }
  }

  resetLock(authority = 0) {
    if (authority === AUTH.INHERIT) authority = this.#lock
    if (authority >= this.#lock) this.#lock = 0
  }

  nextFrameData() {
    let n = this.#next
    if (n === FR.RESET || n === FR.DISAPPEAR) n = 0
    return this.#entity.data.frame[n]
  }

  trans() {
    const oldlock = this.#lock
    this.#lockout--
    if (this.#lockout === 0) this.#lock = 0

    if (this.#wait === 0) {
      if (this.#next === FR.DESTROY) {
        this.#entity.stateUpdate("destroy")
        this.#entity.match.destroy_object(this.#entity)
        return
      }
      if (this.#entity.health.hp <= 0 && this.#entity.frame.D.state === S.LYING) return

      if (this.#next === 0 || this.#next === FR.RESET || this.#next === FR.DISAPPEAR) this.#next = 0
      if (!this.#entity.data.frame[this.#next]) this.#next = 0

      this.#entity.frame.PN = this.#entity.frame.N
      this.#entity.frame.N = this.#next
      this.#entity.stateUpdate("frame_exit")

      const isTrans = this.#entity.frame.D.state !== this.#entity.data.frame[this.#next].state
      if (isTrans) this.#entity.stateUpdate("state_exit")

      this.#entity.frame.D = this.#entity.data.frame[this.#next]

      if (isTrans) {
        for (const key in this.#entity.statemem) this.#entity.statemem[key] = undefined

        const oldSwitch = this.#entity.allow_switch_dir
        this.#entity.allow_switch_dir = this.#entity.states_switch_dir?.[this.#entity.frame.D.state] ?? false

        this.#entity.stateUpdate("state_entry")

        if (!this.#switchDirAfterTrans && this.#entity.allow_switch_dir && !oldSwitch) {
          if (this.#entity.con?.state.left) this.#entity.switch_dir("left")
          if (this.#entity.con?.state.right) this.#entity.switch_dir("right")
        }
      }

      if (this.#switchDirAfterTrans) {
        this.#switchDirAfterTrans = false
        this.#entity.switch_dir(this.#entity.ps.dir === "right" ? "left" : "right")
      }

      this.#entity.frameUpdate()

      if (oldlock === AUTH.MOVE || oldlock === AUTH.SPECIAL) {
        if (this.#wait > 0) this.#wait -= 1
      }
    } else {
      this.#wait--
    }
  }
}

// -- LivingObject base class --

export default class LivingObject {
  type = "livingobject"

  constructor(config, data, objectId) {
    if (!config) return

    const self = this

    // identity
    if (typeof data.bmp === "undefined") {
      if (typeof data === "string") {
        console.warn("livingobject: data is still a string for id", objectId)
      }
      data = {
        bmp: { file: [{ w: 10, h: 10, row: 1, col: 1 }], name: "object" },
        frame: { 0: { pic: 0, state: 0, wait: 0, next: 1000 } },
      }
      self.lazy_fallback = true
    }

    self.name = data.bmp.name
    self.uid = -1
    self.id = objectId
    self.data = data
    self.team = config.team
    self.statemem = {}

    self.match = config.match
    self.scene = self.match.scene
    self.bg = self.match.background

    self.sp = new Sprite(data.bmp, self.match.stage)
    self.sp.width = data.bmp.file[0].w

    if (!self.getProperty("no_shadow")) {
      self.shadow = new spriteRenderer({
        canvas: self.match.stage,
        wh: "fit",
        img: self.bg.shadow.img,
      })
    }

    self.health = { hp: 100, mp: 100 }

    self.frame = {
      PN: 0,
      N: 0,
      D: data.frame[0],
      ani: { i: 0, up: true },
    }

    self.mech = new Mech(self)
    self.AI = new AI.interface(self)
    self.ps = self.mech.create_metric()
    self.trans = new FrameTransition(self)

    self.itr = { arest: 0, vrest: {} }

    self.effect = {
      num: -99,
      dvx: 0,
      dvy: 0,
      stuck: false,
      oscillate: 0,
      blink: false,
      super: false,
      timein: 0,
      timeout: 0,
      heal: undefined,
    }

    self.catching = null
    self.allow_switch_dir = true
    self.counter = { disappear_count: -1, dead_blink_count: -1 }
  }

  // -- Lifecycle --

  destroy() {
    this.sp.destroy()
    this.shadow?.remove()
  }

  setup() {
    this.stateUpdate("setup")
  }

  // -- Frame update --

  frameUpdate() {
    const self = this
    self.sp.show_pic(self.frame.D.pic)
    self.ps.fric = 1

    self.stateUpdate("frame_force") || self.frame_force()

    self.trans.setWait(self.frame.D.wait, 99)
    self.trans.setNext(self.frame.D.next, 99)
    self.stateUpdate("frame")

    if (self.frame.D.sound) self.match.sound.play(self.frame.D.sound)
  }

  frame_force() {
    const self = this
    if (self.frame.D.dvx) {
      const avx = Math.abs(self.ps.vx)
      if (self.ps.y < 0 || avx < self.frame.D.dvx) {
        self.ps.vx = self.dirh() * self.frame.D.dvx
      }
      if (self.frame.D.dvx < 0) self.ps.vx = self.ps.vx - self.dirh()
    }
    if (self.frame.D.dvz) self.ps.vz = self.dirv() * self.frame.D.dvz
    if (self.frame.D.dvy) self.ps.vy += self.frame.D.dvy
    // 550 = sentinel: freeze movement on this axis
    if (self.frame.D.dvx === 550) self.ps.vx = 0
    if (self.frame.D.dvy === 550) self.ps.vy = 0
    if (self.frame.D.dvz === 550) self.ps.vz = 0
  }

  whirlwind_force(rect) {
    const self = this
    self.ps.vy -= 2 / self.mech.mass
    const cx = rect.x + rect.vx + rect.w * 0.5
    self.ps.vx -= ((self.ps.x > cx) ? 1 : -1) * 2 / self.mech.mass
    self.ps.vz -= ((self.ps.z > rect.z) ? 1 : -1) * 0.5 / self.mech.mass
  }

  flute_force() {
    const self = this
    self.effect.super = true
    self.ps.vx = 0
    self.ps.vz = 0
    if (self.ps.y > -140) {
      self.ps.vy = self.ps.vy <= 0 ? -7.5 : -self.ps.vy / 2
    } else if (self.ps.y <= -140 && self.ps.y > -160) {
      self.ps.vy -= self.mech.mass / 2
    } else if (self.ps.y <= -160 && self.ps.y > -180) {
      self.ps.vy += self.mech.mass / 2
    }
    const FI = Gameplay.FRAME_INJURY
    switch (self.type) {
      case "lightweapon":
        if (self.frame.N >= 55) self.trans.frame(40, Gameplay.AUTHORITY.INTERACTION)
        break
      case "heavyweapon":
        if (self.frame.N >= 5) self.trans.frame(1, Gameplay.AUTHORITY.INTERACTION)
        break
      case "character":
        self.ps.vy > 0 ? self.trans.frame(FI.RELEASED, Gameplay.AUTHORITY.INTERACTION) : self.trans.frame(FI.FROZEN_FALL, Gameplay.AUTHORITY.INTERACTION)
        break
    }
  }

  // -- TU (Time Unit) update — runs at 30fps --

  TU_update() {
    const self = this

    self.stateUpdate("TU_force") || self.frame_force()

    // effect
    if (self.effect.timein < 0) {
      if (self.effect.oscillate) {
        self.effect.oi = self.effect.oi === 1 ? -1 : 1
        self.sp.set_x_y(self.ps.sx + self.effect.oscillate * self.effect.oi, self.ps.sy + self.ps.sz)
      } else if (self.effect.blink) {
        if (self.effect.bi === undefined) self.effect.bi = 0
        if (self.sp && self.sp.show && self.sp.hide) {
          (self.effect.bi % 4 < 2) ? self.sp.hide() : self.sp.show()
        }
        self.effect.bi++
      }
      if (self.effect.timeout === 0 || self.effect.timeout < -60) {
        self.effect.num = -99
        if (self.effect.stuck) self.effect.stuck = false
        if (self.effect.oscillate) { self.effect.oscillate = 0; self.sp.set_x_y(self.ps.sx, self.ps.sy + self.ps.sz) }
        if (self.effect.blink) { self.effect.blink = false; self.effect.bi = undefined; self.sp.show() }
        if (self.effect.super) self.effect.super = false
      } else if (self.effect.timeout === -1) {
        if (self.effect.dvx) { self.ps.vx = self.effect.dvx; self.effect.dvx = 0 }
        if (self.effect.dvy) { self.ps.vy = self.effect.dvy; self.effect.dvy = 0 }
      }
      self.effect.timeout--
    }

    if (self.effect.timein < 0 && self.effect.stuck) {
      /* stuck */
    } else {
      self.stateUpdate("TU")
    }

    if (self.health.hp <= 0 && !self.dead) {
      if (self.is_criminal && !self.surrendered) {
        // Hostage NPC: when defeated it reveals its true form and joins the
        // player. Flip team and restore a third HP, then play the disguise-off
        // animation (which ends in state 80xx, triggering the generic frame
        // handler's create_transform_character into the revealed ally).
        self.surrendered = true
        self.team = self.match.player_team
        self.health.hp = Math.ceil(self.health.hp_full / 3)
        self.health.hp_bound = self.health.hp_full
        const revealFrame = {
          monk: 3, mark: 13, jack: 23, sorcerer: 33, bandit: 43, hunter: 53, jan: 63
        }[self.frame.D.name] || 3
        self.trans.frame(revealFrame)
      } else {
        self.stateUpdate("die")
        self.dead = true
      }
    }

    if (self.bg.leaving(self)) self.stateUpdate("leaving")

    for (const key in self.itr.vrest) {
      if (self.itr.vrest[key] > 0) self.itr.vrest[key]--
    }
    if (self.itr.arest > 0) self.itr.arest--
  }

  stateUpdate(event, ...args) {
    const self = this
    const res1 = self.states.generic?.apply(self, [event, ...args])
    const res2 = self.states[self.frame.D.state]?.apply(self, [event, ...args])
    return res1 || res2
  }

  TU() {
    this.TU_update()
  }

  transit() {
    const self = this
    if (self.con) self.combo_update()
    if (!(self.effect.timein < 0 && self.effect.stuck)) self.trans.trans()
    self.effect.timein--
    if (!(self.effect.timein < 0 && self.effect.stuck)) self.stateUpdate("transit")
  }

  set_pos(x, y, z) { this.mech.set_pos(x, y, z) }

  // -- Volumes for collision --

  vol_body() { return this.mech.body() }

  vol_itr(kind) {
    const self = this
    if (!self.frame.D.itr) return self.mech.body_empty()
    return self.mech.body(self.frame.D.itr, obj => obj.kind == kind)
  }

  state() { return this.frame.D.state }

  // -- Effects --

  effect_create(num, duration, dvx, dvy) {
    const self = this
    if (num < self.effect.num) return

    const efid = num + Gameplay.effect.num_to_id
    if (self.getProperty(efid, "oscillate")) self.effect.oscillate = self.getProperty(efid, "oscillate")
    self.effect.stuck = true
    if (dvx !== undefined) self.effect.dvx = dvx
    if (dvy !== undefined) self.effect.dvy = dvy

    if (self.effect.num >= 0) {
      if (self.effect.timein > 0) self.effect.timein = 0
      if (duration > self.effect.timeout) self.effect.timeout = duration
    } else {
      self.effect.timein = 0
      self.effect.timeout = typeof duration === "number" ? duration : Gameplay.effect.duration
    }
    self.effect.num = num
  }

  effect_stuck(timein, timeout) {
    const self = this
    if (!self.effect.stuck || self.effect.num <= -1) {
      self.effect.num = -1
      self.effect.stuck = true
      self.effect.timein = typeof timein === "number" ? timein : 0
      self.effect.timeout = typeof timeout === "number" ? timeout : Gameplay.default.itr.hit_stop
    }
  }

  visualeffect_create(num, rect, righttip, variant, withSound) {
    const self = this
    self.match.visualeffect.create(num + Gameplay.effect.num_to_id, {
      x: rect.x + rect.vx + (righttip ? rect.w : 0),
      y: rect.y + rect.vy + rect.h / 2,
      z: rect.z > self.ps.z ? rect.z : self.ps.z,
    }, variant, withSound)
  }

  brokeneffect_create(id, num = 8) {
    const self = this
    const body = self.vol_body()[0]
    for (let i = 0; i < num; i++) {
      self.match.brokeneffect.create(320, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, id, i, body)
    }
  }

  // -- Animation helpers --

  frame_ani_oscillate(a, b) {
    const f = this.frame
    if (f.ani.i < a || f.ani.i > b) { f.ani.up = true; f.ani.i = a + 1 }
    if (f.ani.i < b && f.ani.up) this.trans.setNext(f.ani.i++)
    else if (f.ani.i > a && !f.ani.up) this.trans.setNext(f.ani.i--)
    if (f.ani.i === b) f.ani.up = false
    if (f.ani.i === a) f.ani.up = true
  }

  frame_ani_sequence(a, b) {
    const f = this.frame
    if (f.ani.i < a || f.ani.i > b) f.ani.i = a + 1
    this.trans.setNext(f.ani.i++)
    if (f.ani.i > b) f.ani.i = a
  }

  // -- Interaction rest timers --

  itr_arest_test() { return !this.itr.arest }
  itr_arest_update(ITR) {
    this.itr.arest = ITR?.arest ?? Gameplay.default.character.arest
  }
  itr_vrest_test(uid) { return !this.itr.vrest[uid] }
  itr_vrest_update(attackerUid, ITR) {
    if (ITR?.vrest) this.itr.vrest[attackerUid] = ITR.vrest
  }

  // -- Direction --

  switch_dir(dir) {
    const self = this
    if (self.ps.dir === "left" && dir === "right") { self.ps.dir = "right"; self.sp.switch_lr("right") }
    if (self.ps.dir === "right" && dir === "left") { self.ps.dir = "left"; self.sp.switch_lr("left") }
  }

  dirh() { return this.ps.dir === "left" ? -1 : 1 }
  dirv() {
    const con = this.con
    if (!con) return 0
    return (con.state.up ? -1 : 0) + (con.state.down ? 1 : 0)
  }

  // -- Property lookup (data-driven config) --

  getProperty(id, prop) {
    if (arguments.length === 1) { prop = id; id = this.id }
    return this.match.spec[id]?.[prop]
  }
}
