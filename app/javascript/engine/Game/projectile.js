import LivingObject from "engine/Game/living-object"
import Global from "engine/Game/global"
import coreUtil from "engine/core/util"
import { depth_scale } from "engine/Game/mechanics"

const Gameplay = Global.gameplay

// Deterministic spawn descriptors for Firzen's Arctic Volcano "overwhelming
// disaster" (hit_Fa 11). Every object is a fixed offset from the eruption
// centre and lockstep peers derive identical fields with no RNG.

// The four dominant ice columns — a pair of icebergs on each side of the
// caster. The official capture shows each pair as an inner and an outer column:
// the inner at ≈ −105px / +135px from the caster centre (≈ −3.76W / +4.81W, W ≈
// 28px) and the outer ≈65px farther out and taller, so the pair reads as two
// distinct icebergs, one beside the other. Every column is splayed outward
// (each top tilts away from the caster) with its base ≈50px below the ground
// line (it stands in the foreground, not on it).
//
// opoint.x is the eruption centre's local offset. The eruption ball
// (firzen_chasef pic 50, centrex 42) is spawned facing opposite Firzen, so in
// the capture it faces left and a child's centre lands at (42 − x) px from the
// caster centre (mirrored when Firzen flips). x = 147 ⇒ 42 − 147 = −105px
// (left); x = −93 ⇒ 42 − (−93) = +135px (right).
//
// The freeze_column sprite is only ~109px tall, so the taller columns are built
// by stacking two cells gaplessly. The depth cue scales sprites, so the
// cell-to-cell spacing must track depth_scale — a fixed spacing left a floating
// spike (gap) at back depth and overlap at front depth. The spacing is the
// leaning variant's ice height (cell-y 22..108 → 86px for action 50; 6..108 →
// 102px for action 0) times the depth scale, so the two cells' ice always abuts
// exactly. Both cells share the same dz (a positive offset onto ps.z, which
// shifts the whole stack down into the foreground), so they stay grounded and
// gapless at every depth.
export function firzenIceColumns(self) {
  // Columns sit ~50px below the ground line: dz is a raw depth offset on ps.z,
  // and the ground line for the caster's depth is at screen y = ps.z, so a
  // positive dz draws the base that far below it.
  const dz = 50
  const z = self.ps.z + dz
  const s = depth_scale(z, self.bg.zboundary)
  // Actions 50 and 0 are the outward-leaning variants (their ice tip sits to
  // the right of its base within the cell, mirrored to lean left when flipped);
  // their ice is 86px / 102px tall. Action 70 is the upright icicle the
  // previous "near-upright" look wrongly used. The inner column (action 50) is
  // shorter than the outer (action 0) so each side's pair reads as two icebergs.
  // The parent (eruption ball) faces opposite Firzen, so facing 0 keeps the
  // parent's direction and facing 1 reverses it: the left columns (facing 0)
  // lean left, the right columns (facing 1) lean right — outward on both sides.
  // Each column plays its data growth chain (~12 frames) and then rests on
  // frame 5/55's wait:175 (~5.8s) before the data's own next-chain
  // (frame 6/56 → 40 → 1000) shatters it into the frame-40 burst +
  // brokeneffect shard cloud. That matches the original: the decoded
  // freeze_column frames 5/55/65/75 all carry wait:175, and the official
  // capture's ice is still standing at its end (22,210 px at 3420ms). No melt
  // override — the columns clear on the data's own ~5.8s timing.
  const columns = [
    { x: 147, facing: 0, action: 50, ice: 86 },   // −105px (left inner)
    { x: 212, facing: 0, action: 0, ice: 102 },   // −170px (left outer)
    { x: -93, facing: 1, action: 50, ice: 86 },   // +135px (right inner)
    { x: -158, facing: 1, action: 0, ice: 102 }   // +200px (right outer)
  ]
  const cells = []
  for (const { x, facing, action, ice } of columns) {
    const spacing = ice * s
    cells.push({ kind: 1, x, y: 27, action, dz, dvx: 0, dvy: 0, oid: 212, facing })
    cells.push({ kind: 1, x, y: 27 - spacing, action, dz, dvx: 0, dvy: 0, oid: 212, facing })
  }
  return cells
}

// The airborne ice layer — a low ring of small ice shards around the caster.
// The verified official capture shows the peak as a fragmented field: two large
// columns plus ~28 small pieces at ≈0.75–2.43W (≈21–68px) above the ground
// line, spread on both sides of the caster, not the three large high spheres
// of the promotional render (which sit at the crop top and never appear in
// real gameplay).
//
// Art: the broken-ice shards (broken.js frames 120–138), the smallest ice in
// the pack (27×28 cells, the same pieces a freeze_column scatters when it
// breaks). They are spawned through the match's brokeneffect pool rather than
// create_object — broken items are effects (factory.broken === EffectSet), not
// specialattack projectiles, so they carry no init() and cannot be driven by an
// opoint. The pool hands each shard a seeded-random upward kick (vy −4..−2)
// plus gravity, so a shard rises a few px and falls back to the ground line,
// where the effect dies: a finite lifetime of a handful of frames instead of
// the old balls' indefinite hang. That fall is the whole of a shard's life —
// the effect pool has no other timeout — so the field is kept dense across the
// peak by (a) spawning the 28 shards in staggered waves (see hit_Fa 11) and
// (b) spreading their spawn heights so they fall and die at different frames.
//
// Determinism & symmetry: every shard is a fixed (dx, height) offset from the
// caster centre, mirrored for the far side, so the ring is symmetric under
// Firzen's flip and identical on lockstep peers (the only RNG is the pool's
// seeded upward kick, which does not affect placement). brokeneffect.create
// resolves the slot argument to one of the four shard frame groups
// (120/125/130/135) for variety.
export function firzenIceShards() {
  // Fourteen (dx, y) placements on the near side, mirrored for the far side.
  // dx is px from the caster centre; y is the shard centre's height in the
  // effect's coordinate space (negative = above the ground line). A shard
  // centre renders at ≈(25 − y) px above the ground line (its centery is ≈25),
  // so y −5..−40 lands the centres ≈30..65 px up — inside the 21–68px band.
  // The last four sit a touch higher (≈67..73px) so their slightly longer fall
  // spreads the deaths out, but they stay in the small, around-the-caster ring.
  const side = [
    { dx: 20, y: -5 }, { dx: 34, y: -12 }, { dx: 48, y: -19 },
    { dx: 62, y: -26 }, { dx: 76, y: -33 }, { dx: 88, y: -40 },
    { dx: 26, y: -8 }, { dx: 54, y: -15 }, { dx: 70, y: -22 },
    { dx: 82, y: -29 },
    { dx: 40, y: -42 }, { dx: 60, y: -45 }, { dx: 78, y: -48 },
    { dx: 90, y: -44 },
  ]
  const shards = []
  for (let i = 0; i < side.length; i++) {
    const slot = i % 4
    shards.push({ dx: -side[i].dx, y: side[i].y, slot })
    shards.push({ dx: side[i].dx, y: side[i].y, slot })
  }
  return shards
}

// The base flame under the eruption. The original spawns a single groundfire
// (firen_flame frame 50) at the caster's feet — one spreading flame, not a row
// — so the tall explosion plume above it dominates the effect instead of a
// horizontal line of tongues. The seven-flame set (x 42±90px at 30px spacing)
// read as a ragged line across the caster's feet; a single flame at x 42 (the
// eruption centre, which make_point resolves to the caster centre) keeps the
// fire symmetric and centred under the plume. y 55 drops the flame onto the
// ground line (its sprite centre lands ~28px below the feet, so the flame dips
// ~20px below and reads as grounded, not floating). Action 50 is the looping
// spreading flame — the data's own chain (frame 51 opoints one child, then
// loops 52–59) gives the single groundfire its natural spread with no extra
// spawns.
export function firzenBaseFlames() {
  return [{
    kind: 1, x: 42, y: 55,
    action: 50,
    dvx: 0, dvy: 0, oid: 211, facing: 0
  }]
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
                // Forward fan. Each ball is randomly fire (221) or ice (222)
                // and launches outward with a spread of speeds plus a steep
                // upward kick (dvy −18) so it pops above the fire explosion's
                // ~155px top and reads as a separate projectile before it
                // homes in. The flying frames carry hit_Fa: 7 — LF2's chase
                // tag — so each ball seeks the nearest enemy (chase_target) and
                // detonates on contact, with hit_a: 7 drained per frame to cap
                // the seeking lifetime. Deterministic under lockstep: the chase
                // steers by the targets' shared in-match positions (no RNG),
                // and only the fire/ice split uses the match's seeded random.
                const side = (i % 2 === 0) ? 1 : -1
                const speed = 6 + Math.floor(i / 2) * 4 // 6,6,10,10,14,14,...
                const fire = self.match.random() < 0.5
                self.match.create_object({
                  kind: 1, x: 42, y: -50, action: 0,
                  dvx: side * speed, dvy: -18,
                  oid: fire ? 221 : 222, facing: facing
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
              // The fire explosion anchors near the bottom of its 159px sprite
              // and fills upward ~132px. Measured scale-invariantly against the
              // reference GIF (Firzen body height H ≈ 69px as the ruler), its
              // lower edge sits ~4px below the caster's feet — i.e. on the
              // ground line, not an air burst — so opoint.y = 0 (the caster's
              // depth). The earlier -15px lift left it ~0.2 H too high.
              // noProjectileHit: the explosion ignores other specialattack
              // balls so its full 12-frame data chain plays instead of being
              // destroyed on contact with the move's own ice columns / barrage
              // balls (see state 3000's hit / hit_others guards).
              self.match.create_object({ kind: 1, x: 42, y: 0, action: 109, dvx: 0, dvy: 0, oid: 211, facing: 0, noProjectileHit: true }, self)
              // Several small base flames on the ground line (see
              // firzenBaseFlames above).
              for (const flame of firzenBaseFlames()) {
                self.match.create_object(flame, self)
              }
              // The flanking ice walls, one each side (see firzenIceColumns
              // above).
              for (const column of firzenIceColumns(self)) {
                self.match.create_object(column, self)
              }
              self.match.create_object({ kind: 1, x: 42, y: 27, action: 81, dvx: 0, dvy: 0, oid: 221, facing: 0 }, self)
              // Queue the full shard ring (see firzenIceShards above) so the
              // delayed waves below can release it when the flank columns are
              // finishing growing. Each shard is born at the caster's own depth
              // and centre; the pool's born() shifts each shard's x by −width
              // (27) to centre its sprite, hence the +27 back-offset.
              self.hitFa11_shards = firzenIceShards()
              self.hitFa11_shardIdx = 0
              self.hitFa_spawned++
            }
            // The airborne ice shards in a low ring around the caster. A broken
            // shard dies the frame it falls back to the ground line (≈5–13
            // frames after birth), so releasing all 28 at the disaster ball's
            // first update made the ring a ~2-frame flash that had already
            // fallen out before the flank columns finished growing (~9 frames
            // later). Instead hold the ring until the ball's final updates
            // (hitFa_count 8 and 10, the last two of the five times this case
            // runs across frame 80's wait 10) — the shards land at the same
            // moment the columns reach the peak, and their staggered spawn
            // heights make them fall and die a few frames apart so the field
            // thins gradually rather than vanishing at once.
            if (self.hitFa_count >= 8) {
              for (let i = 0; i < 14 && self.hitFa11_shardIdx < self.hitFa11_shards.length; i++) {
                const s = self.hitFa11_shards[self.hitFa11_shardIdx++]
                self.match.brokeneffect.create(
                  320,
                  { x: self.ps.x + s.dx + 27, y: s.y, z: self.ps.z },
                  212,
                  s.slot,
                  { w: 0, h: 0 }
                )
              }
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
        // straight lines), but a noChase projectile (none currently) launches
        // upward and must arc back down to land, so it gets gravity here.
        // Deterministic (constant gravity), so lockstep peers derive identical
        // trajectories.
        if (self.noChase && self.ps.y < 0) {
          self.ps.vy += Gameplay.gravity
        }
        // hit_a is the chase-ball seek timer (LF2 drains it every frame to
        // cap a chasing ball's lifetime). noChase balls never home, so they
        // must not consume it.
        if (self.frame.D.hit_a && !self.noChase) {
          self.health.hp -= self.frame.D.hit_a
        }
        break

      case 'frame':
        if (self.frame.D.opoint) {
          const op = self.frame.D.opoint
          // A noChase ice ball (firzen_chasei) that lands opoints
          // freeze_column@70 — the upright icicle. The original's columns lean
          // outward, so spawn the leaning variant (action 50) with its tip
          // pointing away from the caster instead. Mirror only the columns that
          // land out on a flank, which keeps the random fire/ice split balanced
          // on both sides. self.parent is the stationary disaster at the
          // eruption centre (the caster's position, the same axis the fixed
          // columns mirror about). noChase excludes Firzen's disaster-move ice
          // ball, which also lands as a column but is a single aimed shot.
          if (self.noChase && op.oid === 212 && op.action === 70 && self.parent?.ps) {
            const axis = self.parent.ps.x
            const colX = self.mech.make_point(op).x
            // action 50's ice tip sits to the right of its base within the
            // cell, mirrored to lean left when the column faces left. facing 0
            // keeps the landed ball's own direction, facing 1 reverses it. The
            // column must lean away from the eruption centre, so its direction
            // is the outward side (left of axis → left, right → right). The
            // landed ball faces the eruption ball, which faces opposite the
            // caster, so derive facing from the ball's actual direction rather
            // than hardcoding a side — that keeps the lean outward whichever
            // way the caster faces.
            const outward = colX < axis ? 'left' : 'right'
            const facing = self.ps.dir === outward ? 0 : 1
            // The original's Arctic Volcano has no ice near the caster — only
            // the two flanking walls. A barrage ice ball that lands within a
            // 90px radius of the eruption centre must not sprout a "middle"
            // column, so suppress the landing entirely (the ball itself still
            // breaks on the ground). The slowest fan ball lands ≈150px out, so
            // every surviving landing is an outboard flank column and mirrors
            // to the other side, keeping the random fire/ice split balanced.
            if (Math.abs(colX - axis) > 90) {
              // The landed column rests on action 50's wait:175 (~5.8s) and
              // shatters on the data's own timing, matching the fixed flank
              // columns.
              self.match.create_object({ ...op, action: 50, facing }, self)
              const mirrorX = 2 * axis - colX
              self.match.create_object(
                { ...op, action: 50, facing: 1 - facing, x: self.frame.D.centerx + self.dirh() * (mirrorX - self.ps.x) },
                self
              )
            }
          } else {
            self.match.create_object(self.frame.D.opoint, self)
          }
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
          if (!self.noChase) self.hitFa_chase = self.frame.D.hit_Fa
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
  self.noChase = opoint.noChase === true
  self.noProjectileHit = opoint.noProjectileHit === true
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

