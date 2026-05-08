// Unit tests for the kind-5 weapon swing team exceptions in weapon.js.
//
// A held light weapon's act() resolves its kind-5 (WEAPON_SWING) itrs against
// every overlapping body. The port used to pass `not_team: self.team` to
// scene.query, which excluded every same-team entity. The original LF2 applies
// the normal-hit team exceptions instead: a swing still lands on a same-team
// target that is frozen (state 13), caught (state 10), or a weapon/drink
// (object types 1/2/4/6 → "lightweapon"/"heavyweapon"/"drink" here).
//
// The sprite stack (sprite-canvas → sprite-resource → animator) touches
// `HTMLElement` and `Image` at *construction* time, so minimal stubs of both
// are installed before instantiating a weapon — the same pattern as
// weapon-rest.test.js and weapon-drink.test.js.
import { test } from "node:test"
import assert from "node:assert/strict"
import Weapon from "../../app/javascript/engine/Game/weapon.js"
import Scene from "../../app/javascript/engine/Game/scene.js"
import lightData from "../../app/javascript/engine/pack/data/weapon0.js" // stick

globalThis.HTMLElement = class HTMLElement {}
globalThis.Image = class Image {
  constructor() { this.naturalWidth = 48; this.naturalHeight = 48 }
  set src(v) { this._src = v }
  get src() { return this._src }
}

const WEAPON_ID = 100
const TEAM = 1

// Minimal match satisfying the LivingObject + Weapon constructors without
// touching the DOM or canvas rendering.
function makeMatch(scene) {
  return {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {} },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { [WEAPON_ID]: { no_shadow: true } },
    scene,
    sound: { play() {} },
    destroy_object() {},
  }
}

// A target body that fills the whole arena, so it always overlaps the swing's
// itr volume. `hit` records how many times the swing reached it.
function addTarget(scene, { team, type, state }) {
  const target = {
    team,
    type,
    state: () => state,
    hits: 0,
    vol_body() {
      return [{ x: -100000, y: -100000, w: 200000, h: 200000, z: 0, zwidth: 100000, vx: 0, vy: 0 }]
    },
    hit() {
      target.hits++
      return true
    },
  }
  scene.add(target)
  return target
}

// Drive one kind-5 swing from a team-1 holder against a single target of the
// given team/type/state, and report how many times the target was hit.
function swingHits({ team, type, state }) {
  const scene = new Scene()
  const target = addTarget(scene, { team, type, state })

  const LightWeapon = Weapon("lightweapon")
  const weapon = new LightWeapon({ match: makeMatch(scene), team: TEAM }, lightData, WEAPON_ID)

  const att = { ps: { dir: "right", x: 0, y: 0, z: 50 }, itr: { arest: 0 }, team: TEAM }
  weapon.act(att, { weaponact: 20, attacking: 1, kind: 2 }, { x: 0, y: 0, z: 50 })

  return target.hits
}

test("kind-5 swing skips a normal same-team character", () => {
  assert.equal(swingHits({ team: TEAM, type: "character", state: 0 }), 0)
})

test("kind-5 swing hits a frozen same-team character", () => {
  assert.equal(swingHits({ team: TEAM, type: "character", state: 13 }), 1) // S.FROZEN
})

test("kind-5 swing hits a caught same-team character", () => {
  assert.equal(swingHits({ team: TEAM, type: "character", state: 10 }), 1) // S.BEING_CAUGHT
})

test("kind-5 swing hits a same-team light weapon", () => {
  assert.equal(swingHits({ team: TEAM, type: "lightweapon", state: 1001 }), 1)
})

test("kind-5 swing hits a same-team heavy weapon", () => {
  assert.equal(swingHits({ team: TEAM, type: "heavyweapon", state: 2000 }), 1)
})

test("kind-5 swing hits a same-team drink", () => {
  assert.equal(swingHits({ team: TEAM, type: "drink", state: 1001 }), 1)
})

test("kind-5 swing hits an enemy character (sanity)", () => {
  assert.equal(swingHits({ team: TEAM + 1, type: "character", state: 0 }), 1)
})
