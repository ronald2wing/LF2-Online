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
import { installDomStubs } from "./support/dom-stubs.js"

installDomStubs({ width: 48 })

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

// ── Gradual recovery ──
//
// The drink must meter its recovery per game tick (state 17's "TU" event), not
// in one hit. Rates and totals are the original's: milk +8 HP / +4 potential
// every 5 ticks and +5 MP every 3 ticks (160 / 80 / 166), beer +6 MP every tick
// (750). So a milk runs ~100 ticks and a beer ~125 — roughly 3.3 s and 4.2 s.

function makeDrinkOf(id, data) {
  const Drink = WeaponDrink()
  return new Drink({ match: makeMatch(id), team: 0 }, data, id)
}

function makeMatch(id) {
  return {
    stage: { attach() {}, remove() {} },
    background: { shadow: { img: {} }, zboundary: [0, 100], width: 794, leaving() { return false } },
    spec: { [id]: { no_shadow: true } },
    scene: {},
    sound: { play() {} },
    destroy_object() {},
  }
}

// Character at 100/100 with the properties from pack/data/properties.js.
function makeCharacter(profile) {
  return {
    health: { hp: 100, hp_bound: 100, hp_full: 500, mp: 100, mp_full: 500 },
    getProperty(_id, key) { return profile[key] || 0 },
  }
}

function drinkFor(id, data, profile) {
  const drink = makeDrinkOf(id, data)
  const character = makeCharacter(profile)
  let ticks = 0
  while (ticks < 1000) {
    ticks++
    if (drink.tick(character)) break
  }
  return { ticks, character }
}

test("milk recovers gradually over ~100 ticks, capped by the potential bar", async () => {
  const milk = (await import("../../app/javascript/engine/pack/data/weapon6.js")).default
  const { ticks, character } = drinkFor(122, milk, { hp_heal: 160, hp_bound_heal: 80, mp_heal: 166 })

  assert.ok(ticks >= 95 && ticks <= 110, `milk should take ~100 ticks, took ${ticks}`)
  assert.equal(character.health.hp_bound, 180, "potential bar raised by 80")
  assert.equal(character.health.hp, 180, "HP capped by the potential bar, not +160")
  assert.equal(character.health.mp, 266, "MP restored by exactly 166")
})

test("beer restores a full MP bar over ~125 ticks", async () => {
  const beer = (await import("../../app/javascript/engine/pack/data/weapon8.js")).default
  const { ticks, character } = drinkFor(123, beer, { mp_heal: 750 })

  assert.ok(ticks >= 120 && ticks <= 130, `beer should take ~125 ticks, took ${ticks}`)
  assert.equal(character.health.mp, 500, "750 MP is more than a bar, so it fills to max")
})

test("the drink always finishes, even for an unknown id", () => {
  const drink = makeDrinkOf(999, {})
  const character = makeCharacter({})
  assert.equal(drink.tick(character), true, "an unknown drink cannot hang the state")
})
