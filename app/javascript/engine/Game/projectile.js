import LivingObject from "engine/Game/living-object"
import Global from "engine/Game/global"
import coreUtil from "engine/core/util"
import { depth_scale } from "engine/Game/mechanics"

const Gameplay = Global.gameplay

// Deterministic spawn descriptors for Firzen's Arctic Volcano "overwhelming
// disaster" (hit_Fa 11). Every object is a fixed offset from the eruption
// centre and lockstep peers derive identical fields with no RNG.

// Firzen's flanking ice — six columns, three per side, mirrored symmetrically
// about the eruption centre. Each side is ONE lateral position (±140px from the
// caster centre) carrying THREE depth rows stacked behind one another: one
// behind the caster, one at his own depth, one in front. Each row is a 2-cell
// stack (two icebergs gaplessly stacked), so 3 rows × 2 sides × 2 cells = 12
// icebergs (6 per side), the original's three-plane layout.
//
// The three rows are separated in DEPTH, not laterally. Depth is drawn as a
// vertical screen offset (screen y ≈ ps.sy + ps.z), so the rows are pulled
// apart by spreading dz over a wide range: dz −40 / 0 / +40 lifts the back
// row's base ~40px above the caster's ground line, puts the middle row's base
// on it, and drops the front row's base ~40px below — three clearly distinct
// screen heights. depth_scale also sizes each row (~±5% at the zboundary
// extremes: the back row shrinks, the front row grows), reinforcing the three
// separate layers.
//
// opoint.x is the eruption centre's local offset. The eruption ball
// (firzen_chasef pic 50, centrex 42) is spawned facing opposite Firzen, so in
// the capture it faces left and a child's centre lands at (42 − x) px from the
// caster centre (mirrored when Firzen flips). x = 182 ⇒ −140px (left);
// x = −98 ⇒ +140px (right). Both columns sit at |x| = 140 > 90 from the caster
// centre, so the ice frames him without crowding his body.
//
// The freeze_column sprite is only ~109px tall, so the taller columns are built
// by stacking two cells gaplessly. The depth cue scales sprites, so the
// cell-to-cell spacing must track each column's own depth_scale — a fixed
// spacing left a floating spike (gap) at back depth and overlap at front depth.
// The spacing is the leaning variant's ice height (cell-y 22..108 → 86px for
// action 50; 6..108 → 102px for action 0) times that column's depth scale, so
// the two cells' ice always abuts exactly. Both cells share the column's dz, so
// the stack lifts or lowers as one and stays grounded and gapless at its depth.
function firzenIceColumns(self) {
  const columns = [
    { x: 182, facing: 0, action: 50, ice: 86, dz: -40 },   // −140px (left, behind)
    { x: 182, facing: 0, action: 50, ice: 86, dz: 0 },     // −140px (left, caster depth)
    { x: 182, facing: 0, action: 0, ice: 102, dz: 40 },    // −140px (left, front)
    { x: -98, facing: 1, action: 50, ice: 86, dz: -40 },   // +140px (right, behind)
    { x: -98, facing: 1, action: 50, ice: 86, dz: 0 },     // +140px (right, caster depth)
    { x: -98, facing: 1, action: 0, ice: 102, dz: 40 }     // +140px (right, front)
  ]
  // Actions 50 and 0 are the outward-leaning variants (their ice tip sits to
  // the right of its base within the cell, mirrored to lean left when flipped);
  // their ice is 86px / 102px tall. The front row (action 0, ice 102) is taller
  // than the behind/middle rows (action 50, ice 86), so near rows tower above
  // far rows — an extra depth cue on top of the depth_scale sizing.
  // The parent (eruption ball) faces opposite Firzen, so facing 0 keeps the
  // parent's direction and facing 1 reverses it: the left columns (facing 0)
  // lean left, the right columns (facing 1) lean right — outward on both sides.
  // Each column plays its data growth chain (~12 frames) and then rests on
  // frame 5/55's wait:175 (~5.8s) before the data's own next-chain
  // (frame 6/56 → 40 → 1000) shatters it into the frame-40 burst +
  // brokeneffect shard cloud. That matches the original: the decoded
  // freeze_column frames 5/55/65/75 all carry wait:175, and the official
  // capture's ice is still standing at its end. No melt override — the columns
  // clear on the data's own ~5.8s timing.
  const cells = []
  for (const { x, facing, action, ice, dz } of columns) {
    const z = self.ps.z + dz
    const s = depth_scale(z, self.bg.zboundary)
    const spacing = ice * s
    cells.push({ kind: 1, x, y: 27, action, dz, dvx: 0, dvy: 0, oid: 212, facing })
    cells.push({ kind: 1, x, y: 27 - spacing, action, dz, dvx: 0, dvy: 0, oid: 212, facing })
  }
  return cells
}

// The base fire under the eruption. The official capture's ground band is ~six
// overlapping tongues clustered at the caster's feet (a ~50px band), not one
// tongue. A groundfire seed's data chain is only two deep — frame 51 opoints
// one sibling at action 54, which skips frame 51's opoint and so never
// re-opoints — so a single seed yields just two overlapping tongues (the seed
// plus its sibling, which lands ~4px off the seed's centre). To reproduce the
// original's denser ~six-flame band we spawn THREE seeds — one at the caster's
// centre and one ~10px either side — each of which drops its own sibling, for
// six flames across a ~55px band centred on him.
//
// opoint.x lands a child's centre at (42 − x) px from the caster centre
// (mirrored when Firzen flips): x 52 / 42 / 32 ⇒ −10 / 0 / +10 px. y 80 drops
// the tongues low enough that their bodies clear the explosion and the
// flanking ice columns, so the fire reads as grounded. All six flames sit at
// the caster's own depth (no dz): the capture shows a single ~44px-tall ground
// layer with no vertical depth separation, so no per-depth offsets are needed.
function firzenBaseFlames() {
  return [
    { kind: 1, x: 52, y: 80, action: 50, dvx: 0, dvy: 0, oid: 211, facing: 0 }, // −10px (left)
    { kind: 1, x: 42, y: 80, action: 50, dvx: 0, dvy: 0, oid: 211, facing: 0 }, // caster centre
    { kind: 1, x: 32, y: 80, action: 50, dvx: 0, dvy: 0, oid: 211, facing: 0 }  // +10px (right)
  ]
}

function hitFa_create(self) {
  if (self.frame.D.hit_Fa >= 5 && self.frame.D.hit_Fa !== 10 && self.health.hp > 0) {
    if (!self.hitFa_spawned) self.hitFa_spawned = 0
    if (self.hitFa_spawned < 3) {
      self.hitFa_count = (self.hitFa_count || 0) + 1
      if (self.hitFa_count % 2 === 0) {
        const facing = self.ps.vx >= 0 ? 0 : 1
        switch (self.frame.D.hit_Fa) {
          case 5: // jan_chaseh (angel chase)
            // Spawn on the flying frames (action 0), like jan_chase (220) and
            // bat_chase (225) below. Frame 50 is the object's `start` sequence:
            // its pics are out of range (deliberately invisible) and it ends in
            // `next: 1000`, the destroy sentinel — spawning there made the heal
            // bird vanish after three frames instead of flying.
            self.match.create_object({ kind: 1, x: 43, y: 45, action: 0, dvx: 0, dvy: 0, oid: 219, facing: -2 }, self)
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
          case 9: // firzen_chasef + firzen_chasei (Arctic Volcano barrage)
            // LF-Empire hit_Fa reference: "Creates four Ice-/Fire-balls if you
            // are playing against four or less enemies. When playing against
            // more enemies, it activates the balls in a ratio of 1:1 for each
            // additional enemy. Upper limit is 10 balls (the number of fire- or
            // ice-balls may be random, their sum is capped, however)."
            if (!self.hitFa9_spawned) {
              self.hitFa9_spawned = true
              const enemies = Object.values(self.match.character).filter(c =>
                c.team !== 0 && c.team !== self.team && c.health.hp > 0
              ).length
              const ballCount = Math.min(10, Math.max(4, enemies))
              for (let i = 0; i < ballCount; i++) {
                // Forward fan, each ball randomly fire (221) or ice (222),
                // spawned just above the caster's head (y −9) and launched
                // upward. The data value (firzen.js frame 244: dvy −4) only
                // lifts a ball to a ~0.5W apex before gravity pulls it back;
                // the official capture shows the barrage shooting high, so the
                // launch is raised to dvy −21 for a ~5W (~140px) apex. The
                // flying frames carry hit_Fa: 7 (LF2's chase tag), and the 300X
                // chase otherwise OVERWRITES ps.vy every TU with a ±1
                // climb/descend toward the target, which would flatten a launch
                // dvy on the first frame. Flag the barrage balls arcGravity so
                // the chase leaves vy alone and gravity (applied in `generic`)
                // arcs each ball up to the ~5W apex and back down to the ground
                // (~27 frames, well inside the hit_a: 7 drain's ~71-frame
                // budget), where its hiting_ground frame opoints the groundfire
                // / ice column. Deterministic under lockstep: the chase steers
                // by the targets' shared in-match positions (no RNG), and only
                // the fire/ice split uses the match's seeded random.
                const side = (i % 2 === 0) ? 1 : -1
                const speed = 6 + Math.floor(i / 2) * 4 // 6,6,10,10,14,14,...
                const fire = self.match.random() < 0.5
                // noTeamProjectileHit: the balls spawn co-located and in the
                // chase path of the move's own flanking ice columns, so they
                // must ignore same-team specialattack objects (siblings and
                // columns alike) or they burst mid-air at the apex instead of
                // arcing down to land. Enemy characters and enemy projectiles
                // (different team) still collide normally.
                self.match.create_object({
                  kind: 1, x: 42, y: -9, action: 0,
                  dvx: side * speed, dvy: -21, arcGravity: true,
                  oid: fire ? 221 : 222, facing: facing,
                  noTeamProjectileHit: true
                }, self)
              }
              self.hitFa_spawned++
            }
            break

          case 11: // firzen_chasef (Arctic Volcano "overwhelming disaster")
            // LF-Empire hit_Fa reference: "Creates Firzen's Explosion: id211
            // frame 109 (explode) & id211 frame 50 (groundfire), id212 frame
            // 100 (icicles), id 221 frame 81 (overwhelming disaster)."
            if (!self.hitFa11_spawned) {
              self.hitFa11_spawned = true
              // The explosion is parented to the disaster ball (firzen_chasef
              // frame 80: centrex 42, centery 27), which sits at ps.y = Firzen.y + 1,
              // so its sprite top (sy) is Firzen.y − 26. opoint.y is added to the
              // ball's sy, so with Firzen grounded (ps.y = 0), y = −39 lands the fire
              // at ps.y = −65 — its lower edge floats ~65px above the ground line at
              // the caster's torso, matching the official air burst. The sprite is the
              // original's 159×159 firen_exp.png drawn at depth_scale 1.0, so only the
              // vertical anchor needs this nudge.
              // noProjectileHit: the explosion ignores other specialattack balls so
              // its full 12-frame data chain plays instead of being destroyed on
              // contact with the move's own ice columns / barrage balls.
              self.match.create_object({ kind: 1, x: 42, y: -39, action: 109, dvx: 0, dvy: 0, oid: 211, facing: 0, noProjectileHit: true }, self)
              // The flanking ice walls, one each side (see firzenIceColumns
              // above).
              for (const column of firzenIceColumns(self)) {
                self.match.create_object(column, self)
              }
              // The column_mother ("id212 frame 100 (icicles)" in the reference
              // above) is deliberately NOT spawned: its chain drops Freeze's
              // ice-break shards (his Icicle move), not Arctic Volcano ice. The
              // caster-depth row is already covered by firzenIceColumns, so the
              // shards would only clutter the layout. Freeze's Icicle move drives
              // the same column_mother frames directly (freeze.js opoints oid:212
              // action:100), so they stay live for it.
              self.match.create_object({ kind: 1, x: 42, y: 27, action: 81, dvx: 0, dvy: 0, oid: 221, facing: 0 }, self)
              // The ground fire — three seeds (see firzenBaseFlames above),
              // each dropping its own sibling, for the original's ~six-flame
              // band.
              for (const flame of firzenBaseFlames()) {
                self.match.create_object(flame, self)
              }
              self.hitFa_spawned++
            }
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
        // Specialattack projectiles otherwise ignore gravity (they fly in
        // straight lines), but a ball launched upward must arc back down to
        // land, so arcGravity balls get gravity here. Deterministic (constant
        // gravity), so lockstep peers derive identical trajectories.
        if (self.arcGravity && self.ps.y < 0) {
          self.ps.vy += Gameplay.gravity
        }
        // hit_a is the chase-ball seek timer; LF2 drains it every frame to
        // cap a chasing ball's lifetime.
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
              // climb or descend by 1 px/frame toward target. An arcGravity
              // ball keeps its launch dvy (gravity arcs it in `generic`), so
              // leave vy untouched.
              if (!self.arcGravity) {
                if (dy < 0) {
                  self.ps.vy = -1
                } else if (dy > 0) {
                  self.ps.vy = 1
                } else {
                  self.ps.vy = 0
                }
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
      case 'TU':
        // A flying ball that reaches the ground while descending lands in its
        // "hiting_ground" frames (LF2 convention: frame 60). Firzen's fire /
        // ice balls opoint the ground flame (firen_flame@50) or an ice column
        // (freeze_column@70) from there.
        if (self.ps.y === 0 && self.ps.vy > 0 &&
          self.data.frame[60]?.name === 'hiting_ground') {
          self.ps.vy = 0
          self.ps.vx = 0
          self.trans.frame(60)
          }
        break

      case 'hit_others':
        // Firzen's fire explosion ignores other specialattack balls so it is
        // neither destroyed (frame 1000) nor pushed to a hit frame (frame 10)
        // by its own ice columns / barrage balls. Characters still take damage.
        if (self.noProjectileHit && att.type === 'specialattack') {
          return
        }
        // A barrage ball likewise ignores its own move's specialattack objects
        // (siblings, flanking ice columns) but scoped to same team, so enemy
        // projectiles still destroy or deflect it.
        if (self.noTeamProjectileHit && att.type === 'specialattack' && att.team === self.team) {
          return
        }
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
        // Mirror of the hit_others guard: the flagged explosion also ignores
        // being hit by other specialattack balls (no destroy, no hit frame).
        if (self.noProjectileHit && att.type === 'specialattack') {
          return
        }
        // A barrage ball ignores being hit by its own move's specialattack
        // objects (siblings, flanking ice columns) but scoped to same team.
        if (self.noTeamProjectileHit && att.type === 'specialattack' && att.team === self.team) {
          return
        }
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

  /*  State 3005 - Ball Flying / No Shadow
      "Hides the object's shadow. If used in a ball's flying frames, it will
      destroy any other ball attack it hits (stronger than state 3000 and
      3006)." (LF-Empire states reference)
      Collision rules (LF-Empire data-changing reference):
      - 3005 is not destroyed by 3000 or 3006.
      - 3005 destroys other balls it hits (3000, 3006, and others) — the victim
        is destroyed on its own side via its 'hit' handler, so the 3005 ball
        itself keeps flying.
      - 3005 does not go to its hit frame (act 20) when hit by anything except
        another 3005.
  */
  3005: function (event, ITR, att, attps, rect) {
    const self = this
    switch (event) {
      case 'state_entry':
        self.shadow?.hide() // "No Shadow"
        break

      case 'state_exit':
        self.shadow?.show()
        break

      case 'hit': // hit by others
        if (att.type === 'specialattack' && att.state() === 3005) {
          // Only another 3005 can destroy a 3005 ball.
          self.ps.vx = 0
          self.trans.frame(20)
        }
        // Not destroyed by 3000/3006/characters; never rebounds or deflects.
        return true
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
          self.team = att.team
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

  // State 18 - Burning. Firzen's explosion (firen_flame) advances through
  // frames 110-120 which all declare state: 18, so this emits a rising smoke
  // puff on every frame — mirroring the character-side BURNING state's
  // `case "frame": self.brokeneffect_create(302, 1)` in character-states.js.
  18: function (event, K)
  {
    const self = this
    switch (event) {
      case 'frame':
        self.brokeneffect_create(302, 1)
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
    self.noProjectileHit = opoint.noProjectileHit === true
    self.noTeamProjectileHit = opoint.noTeamProjectileHit === true
    self.arcGravity = opoint.arcGravity === true
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
          // Barrage balls ignore the move's own specialattack objects (their
          // co-located siblings and Firzen's flanking ice columns) so they arc
          // down and land instead of bursting mid-air; enemy characters and
          // enemy projectiles (different team) still collide normally.
          if (self.noTeamProjectileHit && hit[k].type === 'specialattack' && hit[k].team === self.team) {
            continue
          }
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
            if (hit[k].type === 'character' && hit[k].team === self.team) // only affects same-team characters
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

