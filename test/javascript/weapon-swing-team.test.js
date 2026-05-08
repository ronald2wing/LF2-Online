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
// `HTMLElement` and `Image` at *construction* time, so installDomStubs()
// installs minimal stand-ins before any weapon is instantiated.
import { test } from "node:test"
import assert from "node:assert/strict"
import Weapon from "../../app/javascript/engine/Game/weapon.js"
import Scene from "../../app/javascript/engine/Game/scene.js"
import lightData from "../../app/javascript/engine/pack/data/weapon0.js" // stick
import { installDomStubs } from "./support/dom-stubs.js"
import { makeMatch, addTarget } from "./support/weapon-team-fixture.js"

installDomStubs({ width: 48 })

const WEAPON_ID = 100
const TEAM = 1

// Drive one kind-5 swing from a team-1 holder against a single target of the
// given team/type/state, and report how many times the target was hit.
function swingHits({ team, type, state }) {
  const scene = new Scene()
  const target = addTarget(scene, { team, type, state })

  const LightWeapon = Weapon("lightweapon")
  const weapon = new LightWeapon({ match: makeMatch(scene, WEAPON_ID), team: TEAM }, lightData, WEAPON_ID)

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
