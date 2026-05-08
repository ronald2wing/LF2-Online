// weapon-drink.js — Drink item (milk, beer).
// Inherits light weapon physics for falling/pickup. Carried like a
// light weapon; pressing attack enters the drinking animation (state 17)
// which calls consume() at frame 58. If the character is hit while
// holding a drink, it drops to the ground like a normal light weapon.
//
// Property flags (set in properties.js):
//   hp_heal  – HP restored to character on consumption (milk)
//   mp_heal  – MP restored to character on consumption (beer)

import Weapon from "engine/Game/weapon"

function weaponDrink() {
  const Base = Weapon("lightweapon")

  class Drink extends Base {
    type = "drink"

    constructor(config, data, objectId) {
      super(config, data, objectId)
      this.consumed = false
    }

    // Heals HP/MP when the drink is consumed (called from state 17 frame handler).
    consume(character) {
      if (this.consumed) return false
      this.consumed = true

      const hpHeal  = character.getProperty(this.id, "hp_heal")  || 0
      const mpHeal  = character.getProperty(this.id, "mp_heal")  || 0

      if (hpHeal > 0) {
        character.health.hp = Math.min(
          character.health.hp + hpHeal,
          character.health.hp_bound
        )
      }
      if (mpHeal > 0) {
        character.health.mp = Math.min(
          character.health.mp + mpHeal,
          character.health.mp_full
        )
      }
    }

    // Override: position the drink at the character's hand during
    // drinking animation, but never auto-throw it.
    act(att, wpoint, holdpoint) {
      const self = this

      // Transition to the frame specified by weaponact (visual only)
      if (self.data.frame[wpoint.weaponact]) {
        self.trans.frame(wpoint.weaponact)
        self.trans.trans()
      }

      // Position drink at character's hand
      self.ps.zz = 1
      self.switch_dir(att.ps.dir)
      self.ps.sz = self.ps.z = att.ps.z
      self.mech.coincideXY(holdpoint, self.mech.make_point(self.frame.D.wpoint || { x: 0, y: 0 }))
      self.mech.project()

      return {} // never thrown
    }
  }

  return Drink
}

export default weaponDrink()
