// Unit tests for the shared transform payload (character-behaviors.js
// `createTransform`).
//
// Three paths build a replacement-character payload: Rudolf's transform, its
// revert, and Louis' armour pickup into LouisEX. They differ only in the name,
// the target id, and whether `transform_character` carries over — and that key
// must be *absent*, not present-and-undefined, when it does not, because
// match.js's assign_character_spec() would otherwise initialise an empty
// `char.transform_character` from the key's presence alone.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createTransform } from "../../app/javascript/engine/Game/character-behaviors.js"
import { installDomStubs } from "./support/dom-stubs.js"

installDomStubs({ width: 79 })

// A character-shaped stand-in: only the fields createTransform reads, plus a
// match that records what was queued.
function makeSelf(transformCharacter) {
  const self = {
    con: { type: "AIcontroller" },
    team: 2,
    ps: { x: 111, y: 222, z: 33, dir: "left" },
    health: { hp: 40, hp_full: 100 },
    stat: { attack: 7 },
    transform_character: transformCharacter,
    match: { create_transform_character(payload) { self.queued = payload } }
  }
  return self
}

test("createTransform without a transform carry-over omits the key", () => {
  const self = makeSelf(undefined)
  createTransform(self, 5, "LouisEX")

  assert.deepEqual(Object.keys(self.queued), ["name", "id", "controller", "team", "pos", "spec"])
  assert.equal(self.queued.name, "LouisEX")
  assert.equal(self.queued.id, 5)
  assert.equal(self.queued.controller, self.con)
  assert.equal(self.queued.team, 2)
  assert.deepEqual(self.queued.pos, { x: 111, y: 222, z: 33 })

  // The transform key must be absent so assign_character_spec never seeds it.
  assert.deepEqual(Object.keys(self.queued.spec), ["dir", "health", "stat", "replace_from"])
  assert.equal("transform_character" in self.queued.spec, false)
})

test("createTransform carries transform_character through when given", () => {
  const carry = { id: 9, is_rudolf_transform: true }
  const self = makeSelf(carry)
  createTransform(self, 9, "transform", carry)

  assert.deepEqual(
    Object.keys(self.queued.spec),
    ["dir", "health", "stat", "transform_character", "replace_from"],
  )
  assert.equal(self.queued.spec.transform_character, carry)
  assert.equal(self.queued.name, "transform")
})

test("createTransform passes the live character fields by reference", () => {
  const self = makeSelf(undefined)
  createTransform(self, 1, "hostage")

  const spec = self.queued.spec
  assert.equal(spec.dir, "left")
  assert.equal(spec.health, self.health)   // identity, not a copy
  assert.equal(spec.stat, self.stat)
  assert.equal(spec.replace_from, self)
})
