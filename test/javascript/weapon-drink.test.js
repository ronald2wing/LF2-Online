// Unit tests for the drink weapon (weapon-drink.js) held-frame pin.
//
// The drink's act() must pin its frame to the character's `weaponact` so the
// drink's own per-frame transit() doesn't advance the held frame back to
// in_the_sky (pic 0, upright box). The pin mirrors weapon.js's held path.
//
// The sprite stack (sprite-canvas → sprite-resource → animator) touches
// `HTMLElement` and `Image` at *construction* time, so a minimal stub of both
// is installed before instantiating a Drink. Each test file runs in its own
// process, so these globals never leak into other suites.
import { test } from "node:test"
import assert from "node:assert/strict"
import WeaponDrink from "../../app/javascript/engine/Game/weapon-drink.js"
import drinkData from "../../app/javascript/engine/pack/data/weapon8.js"

globalThis.HTMLElement = class HTMLElement {}
globalThis.Image = class Image {
  constructor() { this.naturalWidth = 48; this.naturalHeight = 48 }
  set src(v) { this._src = v }
  get src() { return this._src }
}

// Minimal match/config satisfying the LivingObject + Weapon + Drink
// constructors without touching the DOM or canvas rendering.
function makeDrink() {
  const match = {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {} },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { 123: { no_shadow: true } }, // beer id; skip shadow sprite
    scene: {},
    sound: { play() {} },
    destroy_object() {},
  }
  const Drink = WeaponDrink()
  return new Drink({ match, team: 0 }, drinkData, 123)
}

// Fake character + wpoint that would drive act() during the drink animation
// (state 17). firen frames 55–58 hold a constant weaponact:31, kind:1.
function drinkingWpoint() {
  return {
    kind: 1,
    weaponact: 31,
  }
}

test("held drink stays at the weaponact frame after its own transit", () => {
  const drink = makeDrink()
  const char = { ps: { dir: "right", z: 50 } }
  const holdpoint = { x: 100, y: 100, z: 50 }

  drink.act(char, drinkingWpoint(), holdpoint)
  assert.equal(drink.frame.N, 31, "act() should switch to the held sprite frame")

  drink.transit()
  assert.equal(drink.frame.N, 31, "drink's own transit must not clobber the held frame")
})

test("held drink frame survives repeated act/transit cycles", () => {
  const drink = makeDrink()
  const char = { ps: { dir: "right", z: 50 } }
  const holdpoint = { x: 100, y: 100, z: 50 }

  for (let i = 0; i < 5; i++) {
    drink.act(char, drinkingWpoint(), holdpoint)
    drink.transit()
  }
  assert.equal(drink.frame.N, 31, "frame must stay pinned across the drinking animation")
})
