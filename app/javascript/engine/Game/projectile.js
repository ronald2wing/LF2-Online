import LivingObject from "engine/Game/entity"
import Global from "engine/Game/global"
import coreUtil from "engine/core/util"

const Gameplay = Global.gameplay

function hitFa_create(self) {
  if (self.frame.D.hit_Fa >= 5 && self.frame.D.hit_Fa !== 10 && self.health.hp > 0) {
    if (!self.hitFa_spawned) self.hitFa_spawned = 0
    if (self.hitFa_spawned < 3) {
      self.hitFa_count = (self.hitFa_count || 0) + 1
      if (self.hitFa_count % 2 === 0) {
        const facing = self.ps.vx >= 0 ? 0 : 1
        switch (self.frame.D.hit_Fa) {
          case 5: // jan_chaseh (angel chase)
            self.match.create_object({ kind: 1, x: 43, y: 45, action: 50, dvx: 0, dvy: 0, oid: 219, facing: -2 }, self)
            self.hitFa_spawned++
            break
          case 6: // jan_chase (demon chase)
            self.match.create_object({ kind: 1, x: 43, y: 45, action: 0, dvx: 0, dvy: 0, oid: 220, facing: -2 }, self)
            self.hitFa_spawned++
            break
          case 8: // bat_chase
            self.match.create_object({ kind: 1, x: 40, y: 40, action: 0, dvx: 0, dvy: 0, oid: 225, facing: facing }, self)
            self.hitFa_spawned++
            break
          case 9: // firzen_chasef + firzen_chasei
            self.match.create_object({ kind: 1, x: 30, y: 40, action: 0, dvx: 10, dvy: 0, oid: 221, facing: facing }, self)
            self.match.create_object({ kind: 1, x: 30, y: 40, action: 0, dvx: -10, dvy: 0, oid: 222, facing: 1 - facing }, self)
            self.hitFa_spawned++
            break
        }
      }
    }
  }
}

const states =
{
  generic: function (event, K) {
    const self = this
    switch (event) {
      case 'TU':
        self.interaction()
        self.mech.dynamics()
        if (self.frame.D.hit_a) {
          self.health.hp -= self.frame.D.hit_a
        }
        break

      case 'frame':
        if (self.frame.D.opoint) {
          self.match.create_object(self.frame.D.opoint, self)
        }
        if (self.frame.D.sound) {
          self.match.sound.play(self.frame.D.sound)
        }
        if (self.frame.N === 15) { // on ground
          self.trans.frame(1000)
        }
        break

      case 'frame_force':
      case 'TU_force':
        if (self.frame.D.hit_j) {
          const dvz = self.frame.D.hit_j - 50
          self.ps.vz = dvz
        }
        break

      case 'leaving':
        if (self.bg.leaving(self, 200)) { // only when leaving far
          self.trans.frame(1000) // destroy
        }
        break

      case 'hit':
      case 'hit_others':
        self.match.sound.play(self.data.bmp.weapon_broken_sound)
        break

      case 'die':
        // LF2 maps hit_d 1-4 → frame groups 10/20/30/40 for projectile (3000) objects
        if (self.frame.D.hit_d >= 1 && self.frame.D.hit_d <= 4) {
          self.trans.frame(self.frame.D.hit_d * 10)
        } else {
          self.trans.frame(self.frame.D.hit_d)
        }
        break
    }
    self.states['300X'].call(self, event, K)
  },

  /*  State 300X - Ball States
    descriptions taken from
    http://lf-empire.de/lf2-empire/data-changing/reference-pages/182-states?showall=&start=29
  */
  '300X': function (event, K) {
    const self = this
    switch (event) {
      case 'TU':
        /*  <zort> chasing ball seeks for 72 frames, not counting just after (quantify?) it's launched or deflected. Internally, LF2 keeps a variable keeping track of how long the ball has left to seek, which starts at 500 and decreases by 7 every frame until it reaches 0. while seeking, its maximum x speed is 14, and its x acceleration is 0.7; it can climb or descend, by 1 px/frame; and its maximum z speed is 2.2, with z acceleration .4. when out of seeking juice, its speed is 17. the -7 in the chasing algorithm comes from hit_a: 7.
      */
        if (self.frame.D.hit_Fa === 1 ||
          self.frame.D.hit_Fa === 2 ||
          self.frame.D.hit_Fa === 4 ||
          self.frame.D.hit_Fa === 7) {
          self.hitFa_chase = self.frame.D.hit_Fa
        }
        if (self.hitFa_chase) {
          if (self.health.hp > 0) {
            self.chase_target()
            const T = self.chasing.target
            if (T) {
              const dx = T.ps.x - self.ps.x
              const dy = T.ps.y - self.ps.y
              const dz = T.ps.z - self.ps.z
              if (self.ps.vx * (dx >= 0 ? 1 : -1) < 14) {
                self.ps.vx += (dx >= 0 ? 1 : -1) * 0.7
              }
              if (self.ps.vz * (dz >= 0 ? 1 : -1) < 2.2) {
                self.ps.vz += (dz >= 0 ? 1 : -1) * 0.4
              }
              // climb or descend by 1 px/frame toward target
              if (dy < 0) {
                self.ps.vy = -1
              } else if (dy > 0) {
                self.ps.vy = 1
              } else {
                self.ps.vy = 0
              }
              self.switch_dir(self.ps.vx >= 0 ? 'right' : 'left')
            }
          }
        }
        if (self.frame.D.hit_Fa === 10) {
          self.ps.vx = (self.ps.vx > 0 ? 1 : -1) * 17
          self.ps.vz = 0
        }
        // hit_Fa object creation — special hardcoded IDs in LF2
        hitFa_create(self)
        break
    }
  },

  // Special Attack Projectiles
  1002: function (event, ITR, att, attps, rect) {
    const self = this
    switch (event) {
      case 'state_entry':
        self.nobounce = self.parent.ps.y === 0 // If the parent is on the ground, projections don't bounce
        break
      case 'hit_others':
        self.ps.vx = 0
        self.trans.frame(10)
        break

      case 'TU':
        let ps = self.ps
        if (!ps) break
        if (ps.y === 0 && ps.vy > 0) // fell onto ground
        {
          if (self.nobounce) self.trans.frame(1000) // destroy
          if (!self.nobounce && this.mech.speed() > Gameplay.weapon.bounceup.limit) {  // bounceup
            self.trans.frame(10)
            ps.vy = Gameplay.weapon.bounceup.speed.y
            if (ps.vx) { ps.vx = (ps.vx > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.x }
            if (ps.vz) { ps.vz = (ps.vz > 0 ? 1 : -1) * Gameplay.weapon.bounceup.speed.z }
          }
        }
        break
    }
  },

  /*  <zort> you know that when you shoot a ball between john shields it eventually goes out the bottom? that's because when a projectile is spawned it's .3 pixels or whatever below its creator and whenever it bounces off a shield it respawns.
  */
  //  State    - Ball Flying is the standard state for attacks.  If the ball hits other attacks with this state, it'll go to the hitting frame (10). If it is hit by another ball or a character, it'll go to the the hit frame (20) or rebounding frame (30).
  3000: function (event, ITR, att, attps, rect) {
    const self = this
    switch (event) {
      case 'hit_others':
        // check if att is ice or fire
        if (ITR.effect === 3 && att.type === 'specialattack' && att.state() === 3000 && att.frame.D.itr && att.frame.D.itr.effect !== 3 && att.frame.D.itr.effect !== 2) {
          // freeze ball hit another non freeze ball
          return
        }
        if (ITR.effect !== 3 && ITR.effect !== 2 && att.type === 'specialattack' && att.frame.D.itr && att.frame.D.itr.effect === 3) { // non freeze or fire ball hit another freeze ball
          self.ps.vx = 0
          self.trans.frame(1000)
          self.match.create_object({ kind: 1, x: 41, y: 50, action: 0, dvx: 0, dvy: 0, oid: 209, facing: 0 }, att)
          return true
        }
        self.ps.vx = 0
        self.trans.frame(10)
        break

      case 'hit': // hit by others
        if (!self.frame.D.itr) return
        if (self.frame.D.itr.kind === 14) // ice column
        {
          self.trans.setWait(0, 20) // go to break frame
          return true
        }
        if (att.team === self.team && att.ps.dir === self.ps.dir) {
          // can only attack objects of same team if head on collide
          return false
        }
        // check if att is ice or fire
        if (self.frame.D.itr && self.frame.D.itr.effect === 3 && att.type === 'specialattack' && att.state() === 3000 && att.frame.D.itr && att.frame.D.itr.effect !== 3 && att.frame.D.itr.effect !== 2) {
          // freeze ball hit by non freeze ball
          return true
        }
        if (att.type === 'specialattack') {
          if (self.frame.D.itr && self.frame.D.itr.effect !== 3 && self.frame.D.itr.effect !== 2 && ITR.effect === 3) { // non freeze or fire ball hit by freeze ball
            self.ps.vx = 0
            self.trans.frame(1000)
            self.match.create_object({ kind: 1, x: 41, y: 50, action: 0, dvx: 0, dvy: 0, oid: 209, facing: 0 }, att)
            return true
          }
          if (ITR.kind === 0) {
            self.ps.vx = 0
            self.trans.frame(20)
            return true
          }
        }
        if (att.state() === 19) // firerun destroys 3000 projectiles
        {
          self.ps.vx = 0
          self.trans.frame(20) // hit
          return true
        }
        if (ITR.kind === 0 ||
          ITR.kind === 9) // itr:kind:9 can deflect all balls
        {
          self.ps.vx = 0
          self.team = att.team
          self.trans.frame(30) // rebound
          self.trans.trans(); self.TU_update(); self.trans.trans(); self.TU_update() // transit and update immediately
          return true
        }
        break

      case 'state_exit':
        // ice column broke
        if (self.match.broken_list[self.id]) {
          self.brokeneffect_create(self.id)
        }
        break
    }
  },

  //  State 3001 - Ball Flying / Hitting is used in the hitting frames, but you can also use this state directly in the flying frames.  If the ball hits a character while it has state 3001, then it won't go to the hitting frame (20).  It's the same for states 3002 through 3004.
  3001: function (event, K) {
    const self = this
    switch (event) {
    }
  },

  3006: function (event, ITR, att, attps, rect) {
    const self = this
    switch (event) {
      case 'hit_others':
        if (att.type === 'specialattack' &&
          (att.state() === 3005 || att.state() === 3006)) // 3006 can only be destroyed by 3005 or 3006
        {
          self.trans.frame(10)
          self.ps.vx = 0
          self.ps.vz = 0
          return true
        }
        break
      case 'hit': // hit by others
        if (ITR.kind === 9) // 3006 can only be reflected by shield
        {
          self.ps.vx *= -1
          self.ps.z += 0.3
          return true
        }
        if (att.type === 'specialattack' &&
          (att.state() === 3005 || att.state() === 3006)) // 3006 can only be destroyed by 3005 or 3006
        {
          self.trans.frame(20)
          self.ps.vx = 0
          self.ps.vz = 0
          return true
        }
        if (att.type === 'specialattack' &&
          att.state() === 3000) {
          self.ps.vx = (self.ps.vx > 0 ? -1 : 1) * 7 // deflect
          return true
        }
        if (ITR.kind === 0) {
          self.ps.vx = (self.ps.vx > 0 ? -1 : 1) * 1 // deflect a little bit
          if (ITR.bdefend && ITR.bdefend > Gameplay.defend.break_limit) {
            self.health.hp = 0
          }
          return true
        }
        break
    }
  },

  15: function (event, K) // whirlwind
  {
    const self = this
    switch (event) {
      case 'TU':
        self.ps.vx = self.dirh() * self.frame.D.dvx
        break
    }
  },
}

// inherit livingobject
 class Projectile extends LivingObject {
  type = "specialattack"
  states = states

  constructor(config, data, objectId) {
    super(config, data, objectId)
    if (!config) return
    const self = this
  // constructor
  self.team = config.team
  self.match = config.match
  self.health.hp = self.getProperty('hp') || Gameplay.default.health.hp_full
  if (Gameplay.specialattack_projectiles.indexOf(objectId) === -1) {
    self.mech.mass = 0
  }
  self.setup()
}

  init(config) {
  const pos = config.pos
  const z = config.z
  const parent_dir = config.dir
  const opoint = config.opoint
  const dvz = config.dvz
  const self = this
  self.parent = config.parent
  self.mech.set_pos(0, 0, z)
  self.mech.coincideXY(pos, self.mech.make_point(self.frame.D, 'center'))
  let dir
  let face = opoint.facing
  if (face >= 20) {
    face = face % 10
  }
  if (face === 0) {
    dir = parent_dir
  } else if (face === 1) {
    dir = (parent_dir === 'right' ? 'left' : 'right')
  } else if (face >= 2 && face <= 10) {
    dir = 'right'
  } else if (face >= 11 && face <= 19) { // adapted standard
    dir = 'left'
  }
  self.switch_dir(dir)

  self.trans.frame(opoint.action === 0 ? 999 : opoint.action)
  self.trans.trans()

  self.ps.vx = self.dirh() * opoint.dvx
  self.ps.vy = opoint.dvy
  self.ps.vz = self.frame.D.dvx ? dvz : 0
}

  interaction() {
  const self = this
  const ITR = coreUtil.arrayWrap(self.frame.D.itr)

  if (self.team !== 0) {
    for (const j in ITR) {  // for each itr tag
      const vol = self.mech.volume(ITR[j])
      if (self.getProperty(self.id, 'zwidth')) {
        vol.zwidth = self.getProperty(self.id, 'zwidth')
      }
      if (!vol.zwidth) {
        vol.zwidth = 0
      }
      const hit = self.scene.query(vol, self, { tag: 'body' })
      for (const k in hit) {  // for each being hit
        if (ITR[j].kind === 0 ||
          ITR[j].kind === 9 || // shield
          ITR[j].kind === 15 || // whirlwind
          ITR[j].kind === 16) // whirlwind
        {
          if (!(hit[k].type === 'character' && hit[k].team === self.team)) // cannot attack characters of same team
          {
            if (!(ITR[j].kind === 0 && hit[k].type !== 'character' && hit[k].team === self.team && hit[k].ps.dir === self.ps.dir)) // kind:0 can only attack objects of same team if head on collide
            {
              if (!self.itr.arest) {
                if (self.attacked(hit[k].hit(ITR[j], self, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, vol))) {  // hit you!
                  self.itr_arest_update(ITR)
                  self.stateUpdate('hit_others', ITR[j], hit[k])
                  if (ITR[j].arest) {
                    break; // attack one enemy only
                  }
                  if (hit[k].type === 'character' && ITR[j].kind === 9) {
                    // hitting a character will cause shield to disintegrate immediately
                    self.health.hp = 0
                  }
                }
              }
            }
          }
        } else if (ITR[j].kind === 8) // heal
        {
          if (hit[k].type === 'character') // only affects character
          {
            if (hit[k].heal(ITR[j].injury)) {
              self.trans.frame(ITR[j].dvx)
            }
          }
        }
      }
    }
  }
}

  hit(ITR, att, attps, rect) {
  const self = this
  if (self.itr.vrest[att.uid]) {
    return false
  }

  if (ITR && ITR.vrest) {
    self.itr.vrest[att.uid] = ITR.vrest
  }
  return self.stateUpdate('hit', ITR, att, attps, rect)
}

  attacked(inj) {
  return this.parent.attacked(inj)
}
  offset_attack(inj) {
  this.parent.offset_attack(inj)
}
  killed() {
  this.parent.killed()
}

  chase_target() {
  // selects a target to chase after
  const self = this
  if (self.chasing === undefined) {
    self.chasing =
    {
      target: null,
      chased: {},
      query:
      {
        type: 'character',
        sort: function (obj) {
          const dx = obj.ps.x - self.ps.x
          const dz = obj.ps.z - self.ps.z
          let score = Math.sqrt(dx * dx + dz * dz)
          if (self.chasing.chased[obj.uid]) {
            score += 500 * self.chasing.chased[obj.uid] // prefer targets that are chased less number of times
          }
          return score
        }
      }
    }
  }
  self.chasing.query.not_team = self.team
  const targets = self.match.scene.query(null, self, self.chasing.query)
  const target = targets[0]
  self.chasing.target = target

  if (self.chasing.chased[target.uid] === undefined) {
    self.chasing.chased[target.uid] = 1
  } else {
    self.chasing.chased[target.uid]++
  }
}

}

export default Projectile

