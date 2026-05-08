import LivingObject from "engine/Game/entity"
import Global from "engine/Game/global"
import coreUtil from "engine/core/util"

const Gameplay = Global.gameplay

function Weapon(type) {
  const states =
  {
    generic: function (event, K) {
      const self = this
      switch (event) {
        case 'TU':
          self.interaction()
          self.apply_dynamics()
          self.steer_to_nearest_enemy()
          self.handle_ground_collision()
          break
        case 'die':
          self.trans.frame(1000)
          if (self.data.bmp.weapon_broken_sound) {
            self.match.sound.play(self.data.bmp.weapon_broken_sound)
          }
          self.brokeneffect_create(self.id)
          break
      }
    },

    1003: function (event, K) // light
    {
      const self = this
      switch (event) {
        case 'frame':
          if (self.frame.N === 70) // just_on_ground
          {
            if (!self.frame.D.sound) {
              if (self.data.bmp.weapon_drop_sound) {
                self.match.sound.play(self.data.bmp.weapon_drop_sound)
              }
            }
          }
          break
      }
    },

    1004: function (event, K) // light
    {
      const self = this
      switch (event) {
        case 'frame':
          if (self.frame.N === 64) { // on ground
            self.team = 0 // loses team
          }
          break
      }
    },

    2000: function (event, K) // heavy
    {
      const self = this
      switch (event) {
        case 'frame':
          if (self.frame.N === 21) // just_on_ground
          {
            self.trans.setNext(20)
            if (!self.frame.D.sound) {
              if (self.data.bmp.weapon_drop_sound) {
                self.match.sound.play(self.data.bmp.weapon_drop_sound)
              }
            }
          }
          break
      }
    },

    2004: function (event, K) // heavy
    {
      const self = this
      switch (event) {
        case 'frame':
          if (self.frame.N === 20) { // on_ground
            self.team = 0
          }
          break
      }
    }
  }

  class TypeWeapon extends LivingObject {
    type = type
    light = (type === "lightweapon")
    heavy = (type === "heavyweapon")
    states = states

    constructor(config, data, objectId) {
      super(config, data, objectId)
      const self = this
      for (let i = 0; i < self.sp.ani.length; i++) {
        self.sp.ani[i].config.borderleft = 0
        self.sp.ani[i].config.bordertop = 0
        self.sp.ani[i].config.borderright = 1
        self.sp.ani[i].config.borderbottom = 1
      }
      self.hold = {
        obj: null,  // character currently holding me
        pre: null   // previous holder
      }
      self.health.hp = self.data.bmp.weapon_hp
      self.setup()
    }

    init(T) {
      const self = this
      if (T.opoint.kind === 2) {
        T.parent.hold_weapon(self)
        self.pick(T.parent)
      }
    }

    // ── Physics ──

    apply_dynamics() {
      const self = this
      const state = self.state()
      if (state !== 1001 && state !== 2001) {
        self.mech.dynamics()
      }
    }

    // ── Ground handling ──

    handle_ground_collision() {
      const self = this
      const ps = self.ps

      if (ps.y !== 0 || ps.vy <= 0) return

      if (self.mech.speed() > Gameplay.weapon.bounceup.limit) {
        if (self.light) {
          ps.vy = Gameplay.weapon.bounceup.speed.y
          self.trans.frame(70)
        }
        if (self.heavy) {
          ps.vy = Gameplay.weapon.bounceup.speed.y
        }
        if (ps.vx) ps.vx = (ps.vx > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.x
        if (ps.vz) ps.vz = (ps.vz > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.z
        self.health.hp -= self.data.bmp.weapon_drop_hurt
      } else {
        self.team = 0
        ps.vy = 0
        if (self.light) self.trans.frame(70)
        if (self.heavy) self.trans.frame(21)
      }
      ps.zz = 0
    }

    // ── LF2 hit_Fa chase (boomerang homes toward nearest enemy) ──

    steer_to_nearest_enemy() {
      const self = this

      if (!self.light || !self.hold.pre) return
      if (self.state() !== 1002) return

      const hit_fa = self.frame.D.hit_Fa
      if (!hit_fa) return

      const enemies = Object.values(self.match.character).filter(c =>
        c.team !== 0 && c.team !== self.team && c.health.hp > 0
      )
      if (enemies.length === 0) return

      let nearest = enemies[0]
      let min = Math.abs(nearest.ps.x - self.ps.x) + Math.abs(nearest.ps.y - self.ps.y)
      for (let i = 1; i < enemies.length; i++) {
        const d = Math.abs(enemies[i].ps.x - self.ps.x) + Math.abs(enemies[i].ps.y - self.ps.y)
        if (d < min) { min = d; nearest = enemies[i] }
      }

      const dx = nearest.ps.x - self.ps.x
      const dy = nearest.ps.y - self.ps.y
      if (dx > 0) self.ps.vx += 0.5
      else if (dx < 0) self.ps.vx -= 0.5
      if (dy < 0) self.ps.vy -= 0.3
      else if (dy > 0) self.ps.vy += 0.3
    }

    // ── Throw hit detection (ITR kind 0) ──

    interaction() {
      const self = this
      if (self.team === 0) return
      if (!self.heavy && !(self.light && self.state() === 1002)) return

      const itrs = coreUtil.arrayWrap(self.frame.D.itr)

      for (const j in itrs) {
        const itr = itrs[j]
        if (itr.kind !== 0) continue

        const vol = self.mech.volume(itr)
        const targets = self.scene.query(vol, self, { tag: 'body', not_team: self.team })

        for (const k in targets) {
          if (self.itr.arest) continue

          const target = targets[k]

          if (!self.attacked(target.hit(itr, self, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, vol))) continue

          const ps = self.ps
          if (self.light) {
            const sign = (ps.vx === 0 ? 0 : (ps.vx > 0 ? 1 : -1))
            ps.vx = sign * Gameplay.weapon.hit.vx
            ps.vy = Gameplay.weapon.hit.vy
          }

          self.itr_arest_update(itr)

          const timeout = self.light ? 2 : 4
          self.effect.dvx = 0
          self.effect.dvy = 0
          self.effect_stuck(0, timeout)
        }
      }
    }

    // ── Being hit ──

    hit(ITR, att, attps, rect) {
      const self = this
      if (self.hold.obj) return false
      if (self.itr.vrest[att.uid]) return false

      if (ITR.kind === 15) {
        self.whirlwind_force(rect)
        return true
      }

      if (ITR.kind === 10 || ITR.kind === 11) {
        self.flute_force()
        return true
      }

      let accept = false
      if (self.light) {
        if (self.state() === 1002) {
          accept = true
          if ((att.dirh() > 0) !== (self.ps.vx > 0)) {
            self.ps.vx *= Gameplay.weapon.reverse.factor.vx
          }
          self.ps.vy *= Gameplay.weapon.reverse.factor.vy
          self.ps.vz *= Gameplay.weapon.reverse.factor.vz
          self.team = att.team
        } else if (self.state() === 1004) {
          if (att.type === 'lightweapon' || att.type === 'heavyweapon') {
            accept = true
            self.ps.vx = (att.ps.vx ? (att.ps.vx > 0 ? 1 : -1) : 0) * Gameplay.weapon.bounceup.speed.x
            self.ps.vz = (att.ps.vz ? (att.ps.vz > 0 ? 1 : -1) : 0) * Gameplay.weapon.bounceup.speed.z
          }
        }
      }

      const fall = ITR.fall !== undefined ? ITR.fall : Gameplay.default.fall.value
      if (self.heavy) {
        if (self.state() === 2004) {
          accept = true
          if (fall < 30) {
            self.effect_create(0, Gameplay.effect.duration)
          } else if (fall < Gameplay.fall.KO) {
            self.ps.vy = Gameplay.weapon.soft_bounceup.speed.y
          } else {
            self.ps.vy = Gameplay.weapon.bounceup.speed.y
            if (att.ps.vx) self.ps.vx = (att.ps.vx > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.x
            if (att.ps.vz) self.ps.vz = (att.ps.vz > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.z
            self.trans.frame(999)
          }
        } else if (self.state() === 2000) {
          if (fall >= Gameplay.fall.KO) {
            accept = true
            if ((att.dirh() > 0) !== (self.ps.vx > 0)) self.ps.vx *= Gameplay.weapon.reverse.factor.vx
            self.ps.vy *= Gameplay.weapon.reverse.factor.vy
            self.ps.vz *= Gameplay.weapon.reverse.factor.vz
            self.team = att.team
          }
        }
      }

      if (accept) {
        self.visualeffect_create(0, rect, (attps.x < self.ps.x), (fall < Gameplay.fall.KO ? 1 : 2))
        if (ITR && ITR.vrest) self.itr.vrest[att.uid] = ITR.vrest
        if (ITR && ITR.injury) self.health.hp -= ITR.injury
        if (self.data.bmp.weapon_hit_sound) self.match.sound.play(self.data.bmp.weapon_hit_sound)
      }
      return accept
    }

    // ── Weapon action (held weapon: swing or throw) ──

    act(att, wield, point) {
      const self = this
      const result = {}

      if (self.data.frame[wield.weaponact]) {
        self.trans.frame(wield.weaponact, 99)
        self.trans.trans()
        if (wield.kind !== 2) self.trans.setNext(self.frame.N, 99)
      }

      const fD = self.frame.D
      if (fD.wpoint && fD.wpoint.kind === 2) {
        let throwing = false
        if (wield.dvx) { self.ps.vx = att.dirh() * wield.dvx; throwing = true }
        if (wield.dvz) { self.ps.vz = att.dirv() * wield.dvz; throwing = true }
        if (wield.dvy) { self.ps.vy = wield.dvy; throwing = true }

        if (throwing) {
          const imx = self.light ? 58 : 48
          const imy = self.light ? -15 : -40

          if (self.getProperty(self.id, "just_throw") && self.ps.vy >= -5) {
            self.ps.vy = -18
          }

          self.mech.set_pos(
            att.ps.x + att.dirh() * imx,
            att.ps.y + imy,
            att.ps.z + self.ps.vz
          )
          self.ps.zz = 1
          self.trans.frame(self.light ? 40 : 999, 99)
          self.trans.trans()
          self.hold.obj = null
          self._throwOrigin = { x: self.ps.x, y: self.ps.y }
          result.thrown = true
        }

        if (!result.thrown) {
          const cover = wield.cover !== undefined ? wield.cover : Gameplay.default.wpoint.cover
          self.ps.zz = (cover === 1) ? -1 : 1
          self.switch_dir(att.ps.dir)
          self.ps.sz = self.ps.z = att.ps.z
          self.mech.coincideXY(point, self.mech.make_point(fD.wpoint))
          self.mech.project()
        }
      }

      if (self.light && wield.attacking) {
        const itrs = coreUtil.arrayWrap(fD.itr)

        for (const j in itrs) {
          const itr = itrs[j]
          if (itr.kind !== 5) continue

          const vol = self.mech.volume(itr)
          vol.zwidth = 0
          const targets = self.scene.query(vol, [self, att], { tag: 'body', not_team: self.team })

          for (const k in targets) {
            if (att.itr.arest) continue

            const citr = (self.data.weapon_strength_list && self.data.weapon_strength_list[wield.attacking])
              ? self.data.weapon_strength_list[wield.attacking]
              : itr

            if (!self.attacked(targets[k].hit(citr, att, { x: att.ps.x, y: att.ps.y, z: att.ps.z }, vol))) continue

            if (citr.vrest) result.vrest = citr.vrest
            if (citr.arest) result.arest = citr.arest
            result.hit = targets[k].uid
          }
        }
      }

      if (result.thrown) self.shadow.show()
      return result
    }

    drop(dvx, dvy) {
      const self = this
      self.team = 0
      self.hold.obj = null
      if (dvx) self.ps.vx = dvx * 0.5
      if (dvy) self.ps.vy = dvy * 0.2
      self.ps.zz = 0
      self.trans.frame(999)
      self.shadow.show()
    }

    pick(att) {
      const self = this
      if (!self.hold.obj) {
        self.hold.obj = att
        self.hold.pre = att
        self.team = att.team
        self.shadow.hide()
        return true
      }
      return false
    }

    attacked(inj) {
      const self = this
      if (self.hold.pre) return self.hold.pre.attacked(inj)
      return inj !== false
    }

    offset_attack(inj) {
      const self = this
      if (self.hold.pre) self.hold.pre.offset_attack(inj)
    }

    killed() {
      const self = this
      if (self.hold.pre) return self.hold.pre.killed()
    }
  }

  return TypeWeapon
}

export default Weapon
