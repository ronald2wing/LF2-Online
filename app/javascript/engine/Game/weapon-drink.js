// weapon-drink.js — Drink item (milk, beer).
// Inherits light weapon physics for falling/pickup. Carried like a
// light weapon; pressing attack enters the drinking animation (state 17),
// which recovers the character gradually — one tick per frame — until the
// drink's totals are delivered. If the character is hit while holding a
// drink, it drops to the ground like a normal light weapon.
//
// Totals come from the per-object properties (hp_heal / hp_bound_heal /
// mp_heal); the rates are the original's, per the LF2 reference:
//   milk (122): +8 HP and +4 potential HP every 5 frames, +5 MP every 3 frames
//   beer (123): +6 MP every frame
// so a milk runs ~100 frames and a beer ~125, not an instant heal.

import Weapon from "engine/Game/weapon"

const DRINK_RATE = {
  122: { hpEvery: 5, hpStep: 8, boundStep: 4, mpEvery: 3, mpStep: 5 },
  123: { mpEvery: 1, mpStep: 6 }
}

function WeaponDrink() {
  const Base = Weapon("lightweapon")

  class Drink extends Base {
    type = "drink"

    constructor(config, data, objectId) {
      super(config, data, objectId)
      this.hpDone = 0
      this.mpDone = 0
    }

    // One frame of drinking. Returns true once the drink is finished, which is
    // the signal for the state handler to destroy it and leave the state.
    tick(character) {
      const rate = DRINK_RATE[this.id]
      if (!rate) return true

      const H = character.health
      const hpTotal = character.getProperty(this.id, "hp_heal") || 0
      const mpTotal = character.getProperty(this.id, "mp_heal") || 0

      this.tickN = (this.tickN || 0) + 1

      if (rate.hpStep && this.hpDone < hpTotal && this.tickN % rate.hpEvery === 0) {
        const add = Math.min(rate.hpStep, hpTotal - this.hpDone)
        this.hpDone += add
        H.hp_bound = Math.min(H.hp_bound + rate.boundStep, H.hp_full)
        // the recovered HP is always capped by the potential (dark) bar
        H.hp = Math.min(H.hp + add, H.hp_bound)
      }
      if (rate.mpStep && this.mpDone < mpTotal && this.tickN % rate.mpEvery === 0) {
        const add = Math.min(rate.mpStep, mpTotal - this.mpDone)
        this.mpDone += add
        H.mp = Math.min(H.mp + add, H.mp_full)
      }

      // the bottle empties as it is drunk
      this.health.hp = Math.max(0, (this.health.hp_full || 0) *
        (1 - this.tickN / this.drinkFrames(hpTotal, mpTotal)))

      return this.hpDone >= hpTotal && this.mpDone >= mpTotal
    }

    // How many frames this drink lasts, from whichever total takes longest.
    drinkFrames(hpTotal, mpTotal) {
      const rate = DRINK_RATE[this.id] || {}
      const hpFrames = rate.hpStep && hpTotal ? (hpTotal / rate.hpStep) * rate.hpEvery : 0
      const mpFrames = rate.mpStep && mpTotal ? (mpTotal / rate.mpStep) * rate.mpEvery : 0
      return Math.max(hpFrames, mpFrames, 1)
    }

    // Override: position the drink at the character's hand during
    // drinking animation, but never auto-throw it.
    act(att, wpoint, holdpoint) {
      const self = this

      // Transition to the frame specified by weaponact (visual only)
      if (self.data.frame[wpoint.weaponact]) {
        self.trans.frame(wpoint.weaponact)
        self.trans.trans()
        if (wpoint.kind !== 2) self.trans.setNext(self.frame.N, 99)
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

export default WeaponDrink
