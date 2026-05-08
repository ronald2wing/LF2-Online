// Unit tests for the kind-0 thrown-weapon team exceptions in weapon.js.
//
// A thrown weapon's interaction() resolves its kind-0 (NORMAL) itrs against
// every overlapping body. The port used to pass `not_team: self.team` to
// scene.query, which excluded every same-team entity. The original LF2 applies
// the normal-hit team exceptions instead: a thrown weapon still lands on a
// same-team target that is frozen (state 13), caught (state 10), or a
// weapon/drink (object types 1/2/4/6 → "lightweapon"/"heavyweapon"/"drink").
//
// The sprite stack (sprite-canvas → sprite-resource → animator) touches
// `HTMLElement` and `Image` at *construction* time, so installDomStubs()
// installs minimal stand-ins before any weapon is instantiated.
import { test } from "node:test"
import assert from "node:assert/strict"
import Weapon from "../../app/javascript/engine/Game/weapon.js"
import Scene from "../../app/javascript/engine/Game/scene.js"
import heavyData from "../../app/javascript/engine/pack/data/weapon1.js" // stone (thrown in state 2000)
import { installDomStubs } from "./support/dom-stubs.js"
import { makeMatch, addTarget } from "./support/weapon-team-fixture.js"

installDomStubs({ width: 58 })

const WEAPON_ID = 150
const TEAM = 1

// Drive one kind-0 thrown-weapon interaction from a team-1 thrower against a
// single target of the given team/type/state, and report how many times the
// target was hit.
function throwHits({ team, type, state }) {
  const scene = new Scene()
  const target = addTarget(scene, { team, type, state })

  const HeavyWeapon = Weapon("heavyweapon")
  const weapon = new HeavyWeapon({ match: makeMatch(scene, WEAPON_ID), team: TEAM }, heavyData, WEAPON_ID)

  weapon.interaction()

  return target.hits
}

test("thrown weapon skips a normal same-team character", () => {
  assert.equal(throwHits({ team: TEAM, type: "character", state: 0 }), 0)
})

test("thrown weapon hits a frozen same-team character", () => {
  assert.equal(throwHits({ team: TEAM, type: "character", state: 13 }), 1) // S.FROZEN
})

test("thrown weapon hits a caught same-team character", () => {
  assert.equal(throwHits({ team: TEAM, type: "character", state: 10 }), 1) // S.BEING_CAUGHT
})

test("thrown weapon hits a same-team light weapon", () => {
  assert.equal(throwHits({ team: TEAM, type: "lightweapon", state: 1004 }), 1)
})

test("thrown weapon hits a same-team heavy weapon", () => {
  assert.equal(throwHits({ team: TEAM, type: "heavyweapon", state: 2004 }), 1)
})

test("thrown weapon hits a same-team drink", () => {
  assert.equal(throwHits({ team: TEAM, type: "drink", state: 1004 }), 1)
})

test("thrown weapon hits an enemy character (sanity)", () => {
  assert.equal(throwHits({ team: TEAM + 1, type: "character", state: 0 }), 1)
})
