// Unit tests for two engine-fidelity fixes in projectile.js.
//
// 1. kind-8 (HEAL) itrs must only heal same-team characters. The original LF2
//    restricts healing to the caster's team; the port healed anyone in range,
//    so John's Heal Team restored enemy HP too.
// 2. When a forcefield (itr kind 9) reflects a 3006 projectile, the projectile
//    must be reassigned to the reflector's team. The port only reversed vx, so
//    the reflected shot still damaged the reflector's side.
//
// Both paths are exercised through real Projectile instances (like
// character-mp-gate.test.js) with `scene.query` stubbed to return fake bodies,
// so no DOM or canvas rendering is involved. The sprite stack
// (sprite-canvas → sprite-resource → animator) touches `HTMLElement` and
// `Image` at construction time, so minimal stubs of both are installed first.
import { test } from "node:test"
import assert from "node:assert/strict"
import Projectile from "../../app/javascript/engine/Game/projectile.js"
import johnBallData from "../../app/javascript/engine/pack/data/john_ball.js"
import henryArrow2Data from "../../app/javascript/engine/pack/data/henry_arrow2.js"

globalThis.HTMLElement = class HTMLElement {}
globalThis.Image = class Image {
  constructor() { this.naturalWidth = 48; this.naturalHeight = 48 }
  set src(v) { this._src = v }
  get src() { return this._src }
}

// Minimal match/config satisfying the LivingObject + Mech + Sprite
// constructors without touching the DOM or canvas rendering.
function makeMatch(objectId) {
  return {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {}, x: 0, y: 0 },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { [objectId]: { no_shadow: true } },
    scene: {},
    sound: { play() {} },
    destroy_object() {},
  }
}

function makeProjectile(data, objectId, team) {
  return new Projectile({ match: makeMatch(objectId), team }, data, objectId)
}

// John's healball (john_ball frame 50) is the kind-8 heal projectile: an itr
// with `kind: 8, injury: 100, dvx: 40`.
const HEALBALL_ID = 200

function healProjectile(team) {
  const proj = makeProjectile(johnBallData, HEALBALL_ID, team)
  proj.frame.D = johnBallData.frame[50]
  return proj
}

function character(team, healSpy) {
  return {
    type: "character",
    team,
    heal(amount) { healSpy.calls++; return true },
  }
}

test("kind-8 heal does not affect a character on the other team", () => {
  const proj = healProjectile(1)
  const spy = { calls: 0 }
  const enemy = character(2, spy)
  proj.scene.query = () => [enemy]

  proj.interaction()

  assert.equal(spy.calls, 0, "heal must not reach an enemy character")
})

test("kind-8 heal affects a same-team character", () => {
  const proj = healProjectile(1)
  const spy = { calls: 0 }
  const ally = character(1, spy)
  proj.scene.query = () => [ally]

  proj.interaction()

  assert.equal(spy.calls, 1, "heal must reach a same-team character")
})

// henry_arrow2 flies in state 3006 and is one of the projectiles a forcefield
// (itr kind 9) reflects.
const ARROW_ID = 208

test("a reflected 3006 projectile takes the reflector's team", () => {
  const proj = makeProjectile(henryArrow2Data, ARROW_ID, 1)
  proj.ps.vx = 22
  const reflector = { type: "specialattack", team: 2, uid: "forcefield" }

  proj.hit({ kind: 9 }, reflector, {}, {})

  assert.equal(proj.team, 2, "reflected projectile must belong to the reflector's team")
  assert.equal(proj.ps.vx, -22, "reflected projectile velocity must be reversed")
})
