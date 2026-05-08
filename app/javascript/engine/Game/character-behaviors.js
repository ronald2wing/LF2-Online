/*
 * character-behaviors.js
 *
 * Character-type-specific behavior hooks keyed by object ID.
 * Each entry overrides default behavior for engine events fired during
 * frame / state transitions (see character-states.js for call sites).
 */

import Global from "engine/Game/global"

const ID = Global.gameplay.ID

const characterBehaviors = {
  default(event, K, tag) {
    if (event === "revert_transform") {
      const self = this
      self.transform_character.is_rudolf_transform = false
      self.match.create_object(self.transform_character.opoint, self)
      self.match.transform_panel(self.uid)
      self.match.create_transform_character({
        name: "transform",
        id: ID.TRANSFORM,
        controller: self.con,
        team: self.team,
        pos: { x: self.ps.x, y: self.ps.y, z: self.ps.z },
        spec: {
          dir: self.ps.dir,
          health: self.health,
          stat: self.stat,
          transform_character: self.transform_character,
          replace_from: self
        }
      })
    }
  },

  // Deep — downward punch cancel
  [ID.DEEP](event, K, tag) {
    const self = this
    switch (event) {
      case "state3_frame":
        if (self.frame.N === 267) { self.ps.vy += 1; return 1 }
        break
      case "state15_crouch":
        if (self.frame.PN >= 267 && self.frame.PN <= 272) self.trans.incrementWait(-1)
        break
      case "generic_combo":
        if (tag === "hit_Fj") {
          self.switch_dir(K === "D>J" || K === "D>AJ" ? "right" : "left")
        }
        break
    }
  },

  // Rudolf — transform into caught enemy
  [ID.RUDOLF](event) {
    const self = this
    switch (event) {
      case "state3_frame":
        if (self.frame.N >= 273 && self.frame.N <= 276) self.ps.vy = -6.8
        break
      case "rudolf_transform":
        if (self.catching) {
          self.transform_character = {
            id: self.catching.id,
            uid: self.catching.uid,
            opoint: { kind: 1, x: 41, y: 70, action: 70, dvx: 0, dvy: 0, oid: 204, facing: 0 },
            is_rudolf_transform: true
          }
        }
        if (!self.transform_character) break
        self.match.transform_panel(self.uid, self.transform_character.uid)
        self.match.create_transform_character({
          name: "transform",
          id: self.transform_character.id,
          controller: self.con,
          team: self.team,
          pos: { x: self.ps.x, y: self.ps.y, z: self.ps.z },
          spec: {
            dir: self.ps.dir,
            health: self.health,
            stat: self.stat,
            transform_character: self.transform_character,
            replace_from: self
          }
        })
        break
      case "state1280_disappear":
        if (self.frame.N === 257) {
          self.sp.hide()
          self.shadow.hide()
          self.effect.super = true
          self.counter.disappear_count = 0
        }
        break
    }
  },

  // Louis — collect both armor pieces to become LouisEX
  [ID.LOUIS](event, K, tag) {
    const self = this
    switch (event) {
      case "generic_combo":
        if (tag === "hit_ja") return 1
        break
      case "pickup_when_holding":
        if (!self.hold.obj) return false
        const heldId = self.hold.obj.id
        if ((heldId === ID.ARMOR_PIECE_1 || heldId === ID.ARMOR_PIECE_2) &&
            K && (K.id === ID.ARMOR_PIECE_1 || K.id === ID.ARMOR_PIECE_2) &&
            K.id !== heldId) {
          K.pick(self)
          self.match.destroy_object(K)
          self.hold.obj = null
          self.match.create_transform_character({
            name: "LouisEX",
            id: ID.LOUIS_EX,
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
          return true
        }
        return false
    }
  },

  // Fly crash — reset wait on state 3 entry
  [ID.FLY_CRASH](event) {
    if (event === "state3_fly_crash") this.trans.setWait(0)
  },

  // Davis — hit-stop / frame-force for punch combos
  [ID.DAVIS](event) {
    const self = this
    switch (event) {
      case "state3_hit_stop":
        switch (self.frame.N) {
          case 271: case 276: case 280:
            self.effect_stuck(1, 2)
            self.trans.incrementWait(1)
            return 1
          case 273:
            self.effect_stuck(0, 2)
            return 1
        }
        break
      case "state3_frame_force":
        if (self.frame.N === 275 || self.frame.N === 278 || self.frame.N === 279) return 1
        break
    }
  }
}

export default characterBehaviors
