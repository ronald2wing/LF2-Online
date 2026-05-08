// Unit tests for the resting (on_ground) frame pin in weapon.js.
//
// A weapon/held item that lands on the ground rests at its `on_ground` frame
// (light/drink frame 64, state 1004; heavy frame 20, state 2004). That frame
// is `wait: 0, next: 0` in the data — and in this engine `wait: 0` means
// "advance on the next tick" — so without the state handler re-pinning it,
// the item cycles 64 → 0 → 1 → 2 … through its falling (`in_the_sky`) frames
// while lying still. The state 1004/2004 handlers must pin `setNext(frame.N)`
// so the resting frame never advances.
//
// The sprite stack (sprite-canvas → sprite-resource → animator) touches
// `HTMLElement` and `Image` at *construction* time, so a minimal stub of both
// is installed before instantiating any weapon. Each test file runs in its
// own process, so these globals never leak into other suites.
import { test } from "node:test"
import assert from "node:assert/strict"
import Weapon from "../../app/javascript/engine/Game/weapon.js"
import WeaponDrink from "../../app/javascript/engine/Game/weapon-drink.js"
import lightData from "../../app/javascript/engine/pack/data/weapon0.js"  // stick
import heavyData from "../../app/javascript/engine/pack/data/weapon1.js"  // stone
import drinkData from "../../app/javascript/engine/pack/data/weapon8.js"  // beer
import { installDomStubs } from "./support/dom-stubs.js"

installDomStubs({ width: 48 })

// Minimal match/config satisfying the LivingObject + Weapon constructors
// without touching the DOM or canvas rendering.
function makeWeapon(WeaponClass, data, id) {
  const match = {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {} },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { [id]: { no_shadow: true } }, // skip shadow sprite
    scene: {},
    sound: { play() {} },
    destroy_object() {},
  }
  return new WeaponClass({ match, team: 1 }, data, id)
}

// Drive the instance into `frame` the same way the engine does (frame +
// immediate transition), leaving it resting on the ground.
function restAt(instance, frame) {
  instance.trans.frame(frame)
  instance.trans.trans()
  return instance.frame.N
}

test("resting light weapon holds its on_ground frame across many ticks", () => {
  const w = makeWeapon(Weapon("lightweapon"), lightData, 100)
  assert.equal(restAt(w, 64), 64, "should enter the resting frame")
  assert.equal(w.frame.D.state, 1004)
  assert.equal(w.team, 0, "resting resets the team on the frame event")

  for (let i = 0; i < 60; i++) {
    w.transit()
    assert.equal(w.frame.N, 64, `tick ${i}: resting frame must not advance`)
  }
})

test("resting heavy weapon holds its on_ground frame across many ticks", () => {
  const w = makeWeapon(Weapon("heavyweapon"), heavyData, 150)
  assert.equal(restAt(w, 20), 20, "should enter the resting frame")
  assert.equal(w.frame.D.state, 2004)
  assert.equal(w.team, 0, "resting resets the team on the frame event")

  for (let i = 0; i < 60; i++) {
    w.transit()
    assert.equal(w.frame.N, 20, `tick ${i}: resting frame must not advance`)
  }
})

test("resting drink holds its on_ground frame across many ticks", () => {
  const d = makeWeapon(WeaponDrink(), drinkData, 123)
  assert.equal(restAt(d, 64), 64, "should enter the resting frame")
  assert.equal(d.frame.D.state, 1004)

  for (let i = 0; i < 60; i++) {
    d.transit()
    assert.equal(d.frame.N, 64, `tick ${i}: resting frame must not advance`)
  }
})

test("landing still plays its fall frames once before resting", () => {
  const w = makeWeapon(Weapon("lightweapon"), lightData, 100)

  // Simulate ground contact: on the ground, still falling, below the bounce
  // threshold → handle_ground_collision sends it through the landing sequence.
  w.ps.y = 0
  w.ps.vy = 1
  w.handle_ground_collision()

  // The landing animation (70 → 71 → 72 → 64) must play out exactly once,
  // then pin at 64.
  const seen = []
  for (let i = 0; i < 30 && w.frame.N !== 64; i++) {
    w.transit()
    seen.push(w.frame.N)
  }
  assert.ok(seen.includes(70), `landing should start at 70, saw ${seen.join("→")}`)
  assert.ok(seen.includes(72), `landing should reach 72, saw ${seen.join("→")}`)
  assert.equal(w.frame.N, 64, "landing must settle on the resting frame")

  for (let i = 0; i < 60; i++) {
    w.transit()
    assert.equal(w.frame.N, 64, `tick ${i}: resting frame must not advance`)
  }
})
