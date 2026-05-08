/** LF2 character state machine handlers */

import Global from "engine/Game/global"
import coreUtil from "engine/core/util"
import util from "engine/Game/util"

const Gameplay = Global.gameplay
const S = Gameplay.STATE

// Drives the shadow-blink → body-blink → disappear sequence as a defeated
// object's disappear_count climbs toward the effect thresholds.
function updateDisappearCounter(self) {
  switch (true) {
    case self.counter.disappear_count < 0:
      break
    case self.counter.disappear_count >= 0 &&
      self.counter.disappear_count < Gameplay.effect.disappear.shadow_blink:
      self.counter.disappear_count += 1
      break
    case self.counter.disappear_count >= Gameplay.effect.disappear.shadow_blink &&
      self.counter.disappear_count < Gameplay.effect.disappear.body_blink:
      self.counter.disappear_count += 1
      if (Math.floor(self.counter.disappear_count / 2) % 2 == 0) {
        self.shadow.show()
      } else {
        self.shadow.hide()
      }
      break
    case self.counter.disappear_count == Gameplay.effect.disappear.body_blink:
      self.counter.disappear_count += 1
      self.effect.blink = true
      self.effect.timein = 0
      self.effect.timeout = 30
      self.shadow.show()
      self.sp.show()
      self.effect.super = false
      break
    case self.counter.disappear_count > Gameplay.effect.disappear.body_blink:
      self.counter.disappear_count = -1
      break
  }
}

// Blinks a dead body for 30 frames before hiding it and destroying the object.
function updateDeadBlinkCounter(self) {
  switch (true) {
    case self.counter.dead_blink_count < 0:
      break
    case self.counter.dead_blink_count == 0:
      self.effect.blink = true
      self.counter.dead_blink_count += 1
      break
    case self.counter.dead_blink_count > 0 && self.counter.dead_blink_count < 30:
      self.counter.dead_blink_count += 1
      break
    case self.counter.dead_blink_count >= 30:
      self.effect.blink = false
      self.sp.hide()
      self.shadow.hide()
      self.counter.dead_blink_count = -1
      self.match.destroy_object(self)
      break
  }
}

export const states = {
  generic(event, K) {
    const self = this
    switch (event) {
      case "frame":
        // State 80xx: transform into character (criminal/hostage freed)
        if (self.frame.D.state >= 8000 && self.frame.D.state < 8100) {
          const targetId = self.frame.D.state - 8000
          self.match.create_transform_character({
            name: "hostage",
            id: targetId,
            controller: self.con,
            team: self.team,
            pos: { x: self.ps.x, y: self.ps.y, z: self.ps.z },
            spec: {
              dir: self.ps.dir,
              health: self.health,
              stat: self.stat,
              replace_from: self
            }
          })
          break
        }
        // health reduce
        if (self.frame.D.mp) {
          if (self.data.frame[self.frame.PN].next === self.frame.N) {
            if (self.frame.D.mp < 0) {
              if (!self.match.infiniteMp) self.health.mp += self.frame.D.mp
              self.health.mp_usage -= self.frame.D.mp
              if (self.health.mp < 0) {
                self.health.mp = 0
                self.trans.frame(self.frame.D.hit_d)
              }
            }
          } else {
            const dmp = self.frame.D.mp % 1000
            const dhp = Math.floor(self.frame.D.mp / 1000) * 10
            if (!self.match.F6_mode) self.health.mp -= dmp
            self.health.mp_usage += dmp
            self.injury(dhp)
            if (self.health.mp < 0) {
              self.health.mp = 0
              self.trans.frame(self.frame.D.hit_d)
            }
          }
        }
        self.opoint()
        break
      case "TU":
        updateDisappearCounter(self)
        updateDeadBlinkCounter(self)
        if (!self.stateUpdate("post_interaction")) {
          self.post_interaction()
        }

        const ps = self.ps
        if (ps.y === 0 && ps.vy === 0 && self.frame.N === 212 && self.frame.PN !== 211) {
          self.trans.frame(999)
        } else if (ps.y === 0 && ps.vy > 0) {
          const result = self.stateUpdate("fell_onto_ground")
          if (result) {
            self.trans.frame(result, 15)
          } else {
            ps.vy = 0
            self.mech.linear_friction(
              util.lookupTableAbs(Gameplay.friction.fell, ps.vx),
              util.lookupTableAbs(Gameplay.friction.fell, ps.vz)
            )
          }
        } else if (ps.y + ps.vy >= 0 && ps.vy > 0) {
          const result = self.stateUpdate("fall_onto_ground")
          if (result) {
            self.trans.frame(result, 15)
          } else {
            if (self.state() === S.FROZEN) {
              // frozen — do nothing
            } else if (self.frame.N === 212) {
              self.trans.frame(215, 15) // crouch
            } else {
              self.trans.frame(219, 15) // crouch2
            }
          }
        }

        // health and mana recovery
        if (self.match.time.t % 12 === 0) {
          if (self.health.hp >= 0 && self.health.hp < self.health.hp_bound) {
            self.health.hp += 1
          }
        }

        const heal_speed = 8
        if (self.health.hp >= 0 && self.effect.heal && self.effect.heal > 0) {
          if (self.match.time.t % 8 === 0) {
            if (self.health.hp + heal_speed <= self.health.hp_bound) {
              self.health.hp += heal_speed
            }
            self.effect.heal -= heal_speed
          }
        }

        if (self.match.time.t % 3 === 0) {
          if (self.health.mp < self.health.mp_full) {
            self.health.mp +=
              1 +
              Math.floor(
                (self.health.hp_full -
                  (self.health.hp < self.health.hp_full
                    ? self.health.hp
                    : self.health.hp_full)) /
                  100
              )
          }
        }
        // recovery
        if (self.health.fall > 0) self.health.fall += Gameplay.recover.fall
        if (self.health.bdefend > 0) self.health.bdefend += Gameplay.recover.bdefend
        // combo buffer
        self.combo_buffer.timeout -= 1
        if (self.combo_buffer.timeout === 0) {
          switch (self.combo_buffer.combo) {
            case "def":
            case "jump":
            case "att":
            case "left-left":
            case "right-right":
              self.combo_buffer.combo = null
              break
          }
        }
        break
      case "transit":
        self.mech.dynamics()
        self.wpoint()
        break
      case "combo":
        switch (K) {
          case "left":
          case "right":
          case "left-left":
          case "right-right":
            break
          default:
            if (
              K == "DJA" &&
              self.transform_character &&
              self.transform_character.is_rudolf_transform
            ) {
              self.behavior("revert_transform")
            }
            const tag = Global.combo_tag[K]
            if (tag && self.frame.D[tag]) {
              if (!self.behavior("generic_combo", K, tag)) {
                const dir = Global.combo_dir[K]
                if (dir) self.switch_dir(dir)
                self.trans.frame(self.frame.D[tag], 11)
                return 1
              }
            }
            break
        }
      case "post_combo":
        self.pre_interaction()
        break
      case "state_exit":
        switch (self.combo_buffer.combo) {
          case "left-left":
          case "right-right":
            self.combo_buffer.combo = null
            break
        }
        break
    }
  },

  [S.STANDING](event, K) {
    // standing
    const self = this
    switch (event) {
      case "frame":
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          self.trans.frame(12)
        }
        break
      case "combo":
        switch (K) {
          case "left":
          case "right":
          case "up":
          case "down":
          case "jump":
          case null: {
            const dx = self.con.state.left !== self.con.state.right
            const dz = self.con.state.up !== self.con.state.down
            if (dx || dz) {
              if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
                if (dx) self.ps.vx = self.dirh() * self.data.bmp.heavy_walking_speed
                self.ps.vz = self.dirv() * self.data.bmp.heavy_walking_speedz
              } else {
                if (K !== "jump") self.trans.frame(5, 5)
                if (dx) self.ps.vx = self.dirh() * self.data.bmp.walking_speed
                self.ps.vz = self.dirv() * self.data.bmp.walking_speedz
              }
            }
            break
          }
        }
        switch (K) {
          case "left-left":
          case "right-right":
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
              self.trans.frame(16, 10)
            } else {
              self.trans.frame(9, 10)
            }
            return 1
          case "def":
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") return 1
            self.trans.frame(110, 10)
            return 1
          case "jump":
            if (self.ps.y !== 0) return 1
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
              if (!self.getProperty("heavy_weapon_jump")) return 1
              self.trans.frame(self.getProperty("heavy_weapon_jump"), 10)
              return 1
            }
            self.trans.frame(210, 10)
            return 1
          case "att":
            if (self.hold.obj) {
              const dx = self.con.state.left !== self.con.state.right
              if (self.hold.obj.type === "drink") {
                self.trans.frame(55, 10)
                return 1
              }
              if (self.hold.obj.type === "heavyweapon") {
                self.trans.frame(50, 10)
                return 1
              }
              if (self.hold.obj.type === "lightweapon") {
                if (self.getProperty(self.hold.obj.id, "just_throw")) {
                  self.trans.frame(45, 10)
                  return 1
                }
                if (dx && self.getProperty(self.hold.obj.id, "stand_throw")) {
                  self.trans.frame(45, 10)
                  return 1
                }
                if (self.getProperty(self.hold.obj.id, "attackable") !== false) {
                  self.trans.frame(self.match.random() < 0.5 ? 20 : 25, 10)
                  return 1
                }
              }
            }
            const vol = self.mech.volume(
              coreUtil.arrayWrap(
                (self.data.frame[72] && self.data.frame[72].itr) ||
                  (self.data.frame[73] && self.data.frame[73].itr)
              )[0]
            )
            const hit = self.scene.query(vol, self, { tag: "itr:6", not_team: self.team })
            for (const t in hit) {
              self.trans.frame(70, 10)
              return 1
            }
            self.trans.frame(self.match.random() < 0.5 ? 60 : 65, 10)
            return 1
        }
        break
    }
  },

  [S.WALKING](event, K) {
    // walking
    const self = this
    let dx = 0, dz = 0
    if (self.con.state.left) dx -= 1
    if (self.con.state.right) dx += 1
    if (self.con.state.up) dz -= 1
    if (self.con.state.down) dz += 1

    switch (event) {
      case "frame":
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          if (dx || dz) self.frame_ani_oscillate(12, 15)
          else self.trans.setNext(self.frame.N)
        } else {
          self.frame_ani_oscillate(5, 8)
        }
        self.trans.setWait(self.data.bmp.walking_frame_rate - 1)
        break
      case "TU": {
        const xfactor = 1 - (self.dirv() ? 1 : 0) * (2 / 7)
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          if (dx) self.ps.vx = xfactor * self.dirh() * self.data.bmp.heavy_walking_speed
          self.ps.vz = self.dirv() * self.data.bmp.heavy_walking_speedz
        } else {
          if (dx) self.ps.vx = xfactor * self.dirh() * self.data.bmp.walking_speed
          self.ps.vz = self.dirv() * self.data.bmp.walking_speedz
          if (!dx && !dz && self.trans.next() !== 999) {
            self.trans.setNext(999)
            self.trans.setWait(1, 1, 2)
          }
        }
        break
      }
      case "state_entry":
        self.trans.setWait(0)
        break
      case "combo":
        if (dx !== 0 && dx !== self.dirh()) {
          self.switch_dir(self.ps.dir === "right" ? "left" : "right")
        }
        if (!dx && !dz && !self.statemem.released) {
          self.statemem.released = true
          self.mech.unit_friction()
        }
        if (K) return self.states[S.STANDING].call(self, event, K)
        break
    }
  },

  [S.RUNNING](event, K) {
    // running, heavy_obj_run
    const self = this
    switch (event) {
      case "frame":
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          self.frame_ani_oscillate(16, 18)
        } else {
          self.frame_ani_oscillate(9, 11)
        }
        self.trans.setWait(self.data.bmp.running_frame_rate)
        // fall through to TU
      case "TU": {
        const xfactor = 1 - (self.dirv() ? 1 : 0) * (1 / 7)
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          self.ps.vx = xfactor * self.dirh() * self.data.bmp.heavy_running_speed
          self.ps.vz = self.dirv() * self.data.bmp.heavy_running_speedz
        } else {
          self.ps.vx = xfactor * self.dirh() * self.data.bmp.running_speed
          self.ps.vz = self.dirv() * self.data.bmp.running_speedz
        }
        break
      }
      case "combo":
        switch (K) {
          case "left":
          case "right":
          case "left-left":
          case "right-right":
            if (K.split("-")[0] !== self.ps.dir) {
              if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
                self.trans.frame(19, 10)
              } else {
                self.trans.frame(218, 10)
              }
              return 1
            }
            break
          case "def":
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") return 1
            self.trans.frame(102, 10)
            return 1
          case "jump":
            if (self.ps.y !== 0) return 1
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
              if (!self.getProperty("heavy_weapon_dash")) return 1
              self.trans.frame(self.getProperty("heavy_weapon_dash"), 10)
              return 1
            }
            self.trans.frame(213, 10)
            return 1
          case "att":
            if (self.hold.obj) {
              if (self.hold.obj.type === "drink") {
                self.trans.frame(55, 10)
                return 1
              }
              if (self.hold.obj.type === "heavyweapon") {
                self.trans.frame(50, 10)
                return 1
              }
              if (self.hold.obj.type === "lightweapon") {
                const dx = self.con.state.left !== self.con.state.right
                if (dx && self.getProperty(self.hold.obj.id, "run_throw")) {
                  self.trans.frame(45, 10)
                  return 1
                }
                if (self.getProperty(self.hold.obj.id, "attackable") !== false) {
                  self.trans.frame(35, 10)
                  return 1
                }
              }
            }
            self.trans.frame(85, 10)
            return 1
        }
        break
    }
  },

  [S.ATTACK](event, K) {
    // punch, jump_attack, run_attack, ...
    const self = this
    switch (event) {
      case "frame":
        if (self.frame.D.next === 999 && self.ps.y < 0) {
          self.trans.setNext(212) // back to jump
        }
        if (self.frame.N === 253) self.behavior("state3_fly_crash")
        self.behavior("state3_frame")
        break
      case "hit_stop":
        return self.behavior("state3_hit_stop")
      case "frame_force":
        return self.behavior("state3_frame_force")
      case "TU":
        if (self.frame.D.itr) {
          for (const index in self.frame.D.itr) {
            const itr = self.frame.D.itr[index]
            if ((itr.kind == 10 || itr.kind == 11) && self.match.time.t % 2 === 0) {
              for (const I in self.scene.live) {
                const target = self.scene.live[I]
                const z_diff = Math.abs(target.ps.z - self.ps.z)
                const x_diff = Math.abs(target.ps.x - self.ps.x)
                if (x_diff * x_diff + 4 * z_diff * z_diff < 150 * 150) {
                  if (target.uid != self.uid) {
                    if (
                      target.ps.y < 0 ||
                      target.type == "character" ||
                      (target.ps.y >= 0 && self.match.random() < 0.15)
                    ) {
                      if (target.type == "character" && target.hold) {
                        target.drop_weapon(0, 0)
                      }
                      if (self.data.frame[251]) {
                        const attackItr = coreUtil.arrayWrap(self.data.frame[251].itr)[0]
                        const vol = self.mech.volume(attackItr)
                        if (target.attacked(
                          target.hit(attackItr, self, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, vol)
                        )) {
                          target.itr_arest_update(attackItr)
                        }
                      }
                    }
                  }
                }
              }
              break
            }
          }
        }
        break
    }
  },

  [S.JUMP](event, K) {
    // jump
    const self = this
    switch (event) {
      case "frame":
        self.statemem.frameTU = true
        if (self.frame.PN === 80 || self.frame.PN === 81) self.statemem.attlock = 2
        break
      case "TU":
        if (self.statemem.frameTU) {
          self.statemem.frameTU = false
          if (self.frame.N === 212 && self.frame.PN === 211) {
            let dx = 0
            if (self.con.state.left) dx -= 1
            if (self.con.state.right) dx += 1
            self.ps.vx = dx * (self.data.bmp.jump_distance - 1)
            self.ps.vz = self.dirv() * (self.data.bmp.jump_distancez - 1)
            self.ps.vy = self.data.bmp.jump_height
          }
        }
        if (self.statemem.attlock) self.statemem.attlock -= 1
        break
      case "combo":
        if ((K === "att" || self.con.state.att) && !self.statemem.attlock) {
          if (self.frame.N === 212) {
            if (self.hold.obj) {
              const dx = self.con.state.left !== self.con.state.right
              if (dx && self.getProperty(self.hold.obj.id, "jump_throw")) {
                self.trans.frame(52, 10)
              } else if (self.getProperty(self.hold.obj.id, "attackable")) {
                self.trans.frame(30, 10)
              }
            } else {
              self.trans.frame(80, 10)
            }
            return 1
          }
        }
        break
    }
  },

  [S.DASH](event, K) {
    // dash
    const self = this
    switch (event) {
      case "state_entry":
        if (
          (self.frame.PN >= 9 && self.frame.PN <= 11) ||
          self.frame.PN === 215
        ) {
          self.ps.vx =
            self.dirh() *
            (self.data.bmp.dash_distance - 1) *
            (self.frame.N === 213 ? 1 : -1)
          self.ps.vz = self.dirv() * (self.data.bmp.dash_distancez - 1)
          self.ps.vy = self.data.bmp.dash_height
        }
        break
      case "combo":
        if (K === "att" || self.con.state.att) {
          if (
            self.getProperty("dash_backattack") ||
            self.dirh() === (self.ps.vx > 0 ? 1 : -1)
          ) {
            if (self.hold.obj && self.getProperty(self.hold.obj.id, "attackable")) {
              self.trans.frame(40, 10)
            } else {
              self.trans.frame(90, 10)
            }
            self.allow_switch_dir = false
            if (K === "att") return 1
          }
        }
        if (K === "left" || K === "right") {
          if (K != self.ps.dir) {
            if (self.dirh() == (self.ps.vx > 0 ? 1 : -1)) {
              if (self.frame.N === 213) self.trans.frame(214, 0)
              if (self.frame.N === 216) self.trans.frame(217, 0)
              self.switch_dir(K)
            } else {
              if (self.frame.N === 214) self.trans.frame(213, 0)
              if (self.frame.N === 217) self.trans.frame(216, 0)
              self.switch_dir(K)
            }
            return 1
          }
        }
        break
    }
  },

  [S.ROWING](event, K) {
    // rowing
    const self = this
    switch (event) {
      case "TU":
        if (self.frame.N === 100 || self.frame.N === 108) self.ps.vy = 0
        break
      case "frame":
        if (self.frame.N === 100 || self.frame.N === 108) self.trans.setWait(1)
        break
      case "fall_onto_ground":
        if (self.frame.N === 101 || self.frame.N === 109) return 215
        break
    }
  },

  [S.DEFEND](event, K) {
    // defending
    const self = this
    switch (event) {
      case "frame":
        if (self.frame.N === 111) self.trans.incrementWait(4)
        break
    }
  },

  [S.BROKEN_DEFEND](event, K) {
    // broken defend
    const self = this
    switch (event) {
      case "frame_force":
      case "TU_force":
        if (self.frame.D.dvx) {
          if ((self.ps.vx > 0 ? 1 : -1) !== self.dirh()) {
            const avx = self.ps.vx > 0 ? self.ps.vx : -self.ps.vx
            const dirx = 2 * (self.ps.vx > 0 ? 1 : -1)
            if (self.ps.y < 0 || avx < self.frame.D.dvx) {
              self.ps.vx = dirx * self.frame.D.dvx
            }
            if (self.frame.D.dvx < 0) {
              self.ps.vx = self.ps.vx - dirx
            }
          }
        }
        break
    }
  },

  [S.CATCHING](event, K) {
    // catching, throw lying man
    const self = this
    switch (event) {
      case "state_entry":
        self.statemem.stateTU = true
        self.statemem.counter = 43
        self.statemem.attacks = 0
        break
      case "state_exit":
        self.catching = null
        self.ps.zz = 0
        break
      case "frame":
        switch (self.frame.N) {
          case 123:
            self.statemem.attacks += 1
            self.statemem.counter += 3
            self.trans.incrementWait(1)
            break
          case 233:
          case 234:
            self.trans.incrementWait(-1)
            break
          case 240:
            self.behavior("rudolf_transform")
            break
        }
        if (self.catching && self.frame.D.cpoint) {
          self.catching.caught_b(
            self.mech.make_point(self.frame.D.cpoint),
            self.frame.D.cpoint,
            self.ps.dir,
            self.dirv()
          )
        }
        break
      case "TU":
        if (
          self.catching &&
          self.caught_cpointkind() === 1 &&
          self.catching.caught_cpointkind() === 2
        ) {
          if (self.statemem.stateTU) {
            self.statemem.stateTU = false
            if (self.frame.D.cpoint.injury) {
              if (self.attacked(
                self.catching.hit(
                  self.frame.D.cpoint, self, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, null
                )
              )) {
                self.trans.incrementWait(1, 10, 99)
              }
            }
            let cover = self.frame.D.cpoint.cover !== undefined
              ? self.frame.D.cpoint.cover
              : Gameplay.default.cpoint.cover
            self.ps.zz = (cover === 0 || cover === 10) ? 1 : -1
            if (self.frame.D.cpoint.dircontrol === 1) {
              if (self.con.state.left) self.switch_dir("left")
              if (self.con.state.right) self.switch_dir("right")
            }
          }
        }
        break
      case "post_combo":
        if (self.catching) self.statemem.counter -= 1
        if (self.statemem.counter <= 0) {
          if (!(self.frame.N === 122 && self.statemem.attacks === 4)) {
            if (self.frame.N === 121 || self.frame.N === 122) {
              self.catching.caught_release()
              self.trans.frame(999, 15)
            }
          }
        }
        break
      case "combo":
        switch (K) {
          case "att":
            if (self.frame.D.cpoint && (self.frame.D.cpoint.taction || self.frame.D.cpoint.aaction)) {
              const dx = self.con.state.left !== self.con.state.right
              const dy = self.con.state.up !== self.con.state.down
              if ((dx || dy) && self.frame.D.cpoint.taction) {
                const tac = self.frame.D.cpoint.taction
                if (tac < 0) {
                  self.switch_dir(self.ps.dir === "right" ? "left" : "right")
                  self.trans.frame(-tac, 10)
                } else {
                  self.trans.frame(tac, 10)
                }
                self.statemem.counter += 10
              } else if (self.frame.D.cpoint.aaction) {
                self.trans.frame(self.frame.D.cpoint.aaction, 10)
              }
              const nextframe = self.data.frame[self.trans.next()]
              self.catching.caught_throw(nextframe.cpoint, self.dirv())
            }
            return 1
          case "jump":
            if (self.frame.N === 121 && self.frame.D.cpoint.jaction) {
              self.trans.frame(self.frame.D.cpoint.jaction, 10)
              return 1
            }
            break
        }
        break
    }
  },

  [S.BEING_CAUGHT](event, K) {
    // being caught
    const self = this
    switch (event) {
      case "state_exit":
        self.catching = null
        self.caught_b_holdpoint = null
        self.caught_b_cpoint = null
        self.caught_b_adir = null
        self.caught_b_vdir = null
        self.caught_throwz = null
        break
      case "frame":
        self.statemem.frameTU = true
        self.trans.setWait(99, 10, 99)
        break
      case "TU":
        if (self.frame.N === 135) self.ps.vy = 0

        if (
          self.caught_cpointkind() === 2 &&
          self.catching &&
          self.catching.caught_cpointkind() === 1
        ) {
          if (self.statemem.frameTU) {
            self.statemem.frameTU = false

            const holdpoint = self.caught_b_holdpoint
            const cpoint = self.caught_b_cpoint
            const adir = self.caught_b_adir

            if (cpoint.vaction) self.trans.frame(cpoint.vaction, 22)

            if (cpoint.throwvx) {
              const dvx = cpoint.throwvx
              const dvy = cpoint.throwvy
              let dvz = cpoint.throwvz
              if (dvx) self.ps.vx = (adir === "right" ? 1 : -1) * dvx
              if (dvy) self.ps.vy = dvy
              if (dvz === Gameplay.PROP_UNSET) dvz = 0
              if (dvz) self.ps.vz = dvz
              self.ps.vz *=
                self.caught_throwz !== null && self.caught_throwz !== undefined
                  ? self.caught_throwz
                  : self.caught_b_vdir

              self.caught_throwinjury =
                cpoint.throwinjury !== Gameplay.PROP_UNSET
                  ? cpoint.throwinjury
                  : Gameplay.default.itr.throw_injury

              self.mech.set_pos(
                self.ps.x + self.ps.vx * 1,
                self.ps.y + self.ps.vy * 2,
                self.ps.z + self.ps.vz
              )
            } else {
              if (cpoint.dircontrol === undefined) {
                if (cpoint.cover && cpoint.cover >= 10) {
                  self.switch_dir(adir)
                } else {
                  self.switch_dir(adir === "left" ? "right" : "left")
                }
              }
              self.mech.coincideXY(holdpoint, self.mech.make_point(self.frame.D.cpoint))
            }
          }
        } else {
          if (self.catching) self.trans.frame(212, 10)
        }
        break
    }
  },

  [S.INJURED](event, K) {
    // injured
    const self = this
    switch (event) {
      case "state_entry":
        self.trans.incrementWait(0, 20)
        break
      case "frame":
        switch (self.frame.N) {
          case 221:
          case 223:
          case 225:
            self.trans.setNext(999)
            break
          case 220:
          case 222:
          case 224:
          case 226:
            // locked until frame transition
            break
        }
        break
    }
  },

  [S.FALLING](event, K) {
    // falling
    const self = this
    switch (event) {
      case "frame":
        if (self.effect.dvy <= 0) {
          switch (self.frame.N) {
            case 180:
              self.trans.setNext(181)
              self.trans.setWait(util.lookupTableAbs(Gameplay.fall.wait180, self.effect.dvy))
              break
            case 181: {
              self.trans.setNext(182)
              if (self.ps.vy === 0) self.ps.vy = 5 * (self.ps.vy > 0 ? 1 : -1)
              const vy = Math.abs(self.ps.vy)
              if (vy >= 0 && vy <= 4) self.trans.setWait(2)
              else if (vy > 4 && vy < 7) self.trans.setWait(3)
              else if (vy >= 7) self.trans.setWait(4)
              break
            }
            case 182: self.trans.setNext(183); break
            case 186:
              if (self.ps.vy === 0) self.ps.vy = 5 * (self.ps.vy > 0 ? 1 : -1)
              self.trans.setNext(187)
              break
            case 187: self.trans.setNext(188); break
            case 188: self.trans.setNext(189); break
          }
        } else {
          switch (self.frame.N) {
            case 180: self.trans.setNext(185); self.trans.setWait(1); break
            case 186: self.trans.setNext(191); break
          }
        }
        break
      case "fell_onto_ground":
      case "fall_onto_ground":
        if (self.caught_throwinjury > 0) {
          self.injury(self.caught_throwinjury)
          self.caught_throwinjury = null
        }
        self.match.sound.play("1/016")
        const ps = self.ps
        if (
          self.mech.speed() > Gameplay.character.bounceup.limit.xy ||
          ps.vy > Gameplay.character.bounceup.limit.y
        ) {
          self.mech.linear_friction(
            util.lookupTableAbs(Gameplay.character.bounceup.absorb, ps.vx),
            util.lookupTableAbs(Gameplay.character.bounceup.absorb, ps.vz)
          )
          ps.vy = -Gameplay.character.bounceup.y
          if (self.frame.N >= 203 && self.frame.N <= 206) return 185
          if (self.frame.N >= 180 && self.frame.N <= 185) return 185
          if (self.frame.N >= 186 && self.frame.N <= 191) return 191
        } else {
          if (self.frame.N >= 203 && self.frame.N <= 206) return 230
          if (self.frame.N >= 180 && self.frame.N <= 185) return 230
          if (self.frame.N >= 186 && self.frame.N <= 191) return 231
        }
        break
      case "combo":
        if (self.frame.N === 182 || self.frame.N === 188) {
          if (K === "jump") {
            if (self.health.fall < Gameplay.fall.KO && self.health.hp > 0) {
              if (self.frame.N === 182) self.trans.frame(100)
              else self.trans.frame(108)
              if (self.ps.vx) self.ps.vx = 5 * (self.ps.vx > 0 ? 1 : -1)
              if (self.ps.vy == 0) self.ps.vy = 5 * (self.ps.vy > 0 ? 1 : -1)
              if (self.ps.vz) self.ps.vz = 2 * (self.ps.vz > 0 ? 1 : -1)
              return 1
            }
          }
        }
        return 1
    }
  },

  [S.FROZEN](event, K) {
    // frozen
    const self = this
    switch (event) {
      case "state_exit":
        self.brokeneffect_create(212)
        break
    }
  },

  [S.LYING](event, K) {
    // lying
    const self = this
    switch (event) {
      case "state_entry":
        self.health.fall = 0
        self.health.bdefend = 0
        if (self.health.hp <= 0) {
          self.die()
          if (self.is_npc) self.counter.dead_blink_count = 0
        }
        break
      case "state_exit":
        self.effect.timein = 0
        self.effect.timeout = 12
        self.effect.blink = true
        self.effect.super = true
        break
    }
  },

  [S.CROUCH](event, K) {
    // stop_running, crouch, crouch2, dash_attack, light_weapon_thw, heavy_weapon_thw, heavy_stop_run, sky_lgt_wp_thw
    const self = this
    switch (event) {
      case "frame":
        switch (self.frame.N) {
          case 19:
            if (self.hold.obj && self.hold.obj.type === "heavyweapon") self.trans.setNext(12)
            break
          case 215:
            self.trans.incrementWait(-1)
            break
          case 219:
            if (!self.behavior("state15_crouch")) {
              switch (self.frame.PN) {
                case 105: self.mech.unit_friction(); break
                case 216: case 90: case 91: case 92: self.trans.incrementWait(-1); break
              }
            }
            break
          case 54:
            if (self.frame.D.next === 999 && self.ps.y < 0) self.trans.setNext(212)
            break
          case 257:
            self.behavior("state1280_disappear")
            break
        }
        break
      case "combo":
        if (self.frame.N === 215) {
          if (K === "def") {
            self.trans.frame(102, 10)
            return 1
          }
          if (K === "jump") {
            let dx = 0
            if (self.con.state.left) dx -= 1
            if (self.con.state.right) dx += 1
            if (dx) {
              self.trans.frame(213, 10)
              self.switch_dir(dx === 1 ? "right" : "left")
            } else if (self.ps.vx === 0) {
              self.trans.incrementWait(2, 10, 99)
              self.trans.setNext(210, 10)
            } else if ((self.ps.vx > 0 ? 1 : -1) === self.dirh()) {
              self.trans.frame(213, 10)
            } else {
              self.trans.frame(214, 10)
            }
            return 1
          }
        }
        break
    }
  },

  [S.DANCE_OF_PAIN](event, K) {
    // injured 2 (dance of pain)
  },

  [S.DRINKING](event, K) {
    // weapon_drink — drinking milk or beer
    const self = this
    switch (event) {
      case "state_entry":
        self.statemem.drinkAnim = false
        break
      case "frame":
        if (self.frame.N === 58 && self.hold.obj && self.hold.obj.type === "drink") {
          const drink = self.hold.obj
          drink.consume(self)
          self.hold.obj = null
          self.match.destroy_object(drink)
          self.trans.setNext(999, 99)
        }
        break
      case "state_exit":
        if (self.hold.obj && self.hold.obj.type === "drink") {
          self.drop_weapon(0, 0)
        }
        break
      case "combo":
        return 1
    }
  },

  [S.BURNING](event, K) {
    // burning
    const self = this
    switch (event) {
      case "frame":
        self.brokeneffect_create(302, 1)
        break
      case "fall_onto_ground":
        self.brokeneffect_create(302)
      case "fell_onto_ground":
        return self.states[S.FALLING].call(self, event, K)
    }
  },

  [S.FIRERUN](event, K) {
    // firen specific
    const self = this
    switch (event) {
      case "TU":
        self.ps.vz = self.dirv() * self.data.bmp.running_speedz
        break
    }
  },

  [S.DEEP_SPECIFIC](event, K) {
    // deep specific
    const self = this
    switch (event) {
      case "frame_force":
        if (self.frame.N !== 290) return 1
        break
      case "TU":
        self.ps.vz = self.dirv() * self.data.bmp.walking_speedz
        break
      case "hit_stop":
        self.effect_stuck(1, 2)
        self.trans.incrementWait(1)
        return 1
    }
  },

  [S.TELEPORT_NEAREST](event) {
    // teleport to the nearest enemy
    const self = this
    if (event === "frame") {
      const targets = self.match.scene.query(null, self, {
        not_team: self.team,
        type: "character",
        sort: "distance"
      })
      if (targets.length) {
        const en = targets[0]
        self.ps.x = en.ps.x - 120 * self.dirh()
        self.ps.y = 0
        self.ps.z = en.ps.z
      }
    }
  },

  [S.TELEPORT_FURTHEST](event) {
    // teleport to the furthest teammate
    const self = this
    if (event === "frame") {
      const targets = self.match.scene.query(null, self, {
        team: self.team,
        type: "character",
        sort: "distance"
      })
      targets.reverse()
      if (targets.length) {
        const en = targets[0]
        self.ps.x = en.ps.x + 60 * self.dirh()
        self.ps.y = 0
        self.ps.z = en.ps.z
      }
    }
  },

  [S.RUDOLF_SPECIFIC](event) {
    // rudolf transform trigger
    const self = this
    if (event === "frame" && self.frame.N === 298 && self.trans.next() === 999) {
      self.behavior("rudolf_transform")
    }
  },

  [S.HEAL](event) {
    // heal
    if (event === "frame") this.effect.heal = Gameplay.effect.heal_max
  }
}

export const states_switch_dir = {
  [S.STANDING]:       true,
  [S.WALKING]:        true,
  [S.RUNNING]:        false,
  [S.ATTACK]:         false,
  [S.JUMP]:           true,
  [S.DASH]:           false,
  [S.ROWING]:         false,
  [S.DEFEND]:         true,
  [S.BROKEN_DEFEND]:  false,
  [S.CATCHING]:       false,
  [S.BEING_CAUGHT]:   false,
  [S.INJURED]:        false,
  [S.FALLING]:        false,
  [S.FROZEN]:         false,
  [S.LYING]:          false,
  [S.CROUCH]:         false,
  [S.DANCE_OF_PAIN]:  false,
  [S.DRINKING]:       false
}
