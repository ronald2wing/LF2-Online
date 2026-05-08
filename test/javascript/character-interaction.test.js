// Regression tests for character.js `post_interaction` fidelity:
//
//   1. Same-team hits must still land on characters that are frozen
//      (S.FROZEN) or being caught (S.BEING_CAUGHT).
//   2. When several itrs overlap one target, exactly one itr may win — the
//      original picks the closest itr and breaks equal distances with a seeded
//      50/50 (openlf2 func_417400_does_attack_success). In practice all itrs
//      touching a target share the same distance, so the first itr wins and
//      each later overlapping itr has a 50% chance to replace it.
import { test } from "node:test"
import assert from "node:assert/strict"
import Character from "../../app/javascript/engine/Game/character.js"
import SeedableRandom from "../../app/javascript/engine/third_party/random.js"
import firzenData from "../../app/javascript/engine/pack/data/firzen.js"

globalThis.HTMLElement = class HTMLElement {}
globalThis.Image = class Image {
  constructor() { this.naturalWidth = 79; this.naturalHeight = 79 }
  set src(v) { this._src = v }
  get src() { return this._src }
}

const FIRZEN_ID = 51
const FROZEN = 13
const BEING_CAUGHT = 10

// Build a Character with its interaction plumbing stubbed and a controllable
// RNG. The character attacks as team 1.
function makeCharacter(rand = () => 0.9) {
  const match = {
    stage: { attach() {}, remove() {} },
    background: { shadow: { img: {}, x: 0, y: 0 }, zboundary: [0, 100], width: 794, leaving() { return false } },
    spec: { [FIRZEN_ID]: { no_shadow: true } },
    scene: { query() { return [] } },
    sound: { play() {} },
    destroy_object() {},
    random: rand,
  }
  const char = new Character({ match, team: 1 }, firzenData, FIRZEN_ID)
  char.mech.volume = () => ({ zwidth: 0 })
  char.stateUpdate = () => false
  return char
}

function makeTarget(uid, { team = 2, type = "character", state = 0 } = {}) {
  const target = {
    uid,
    team,
    type,
    hits: [],
    state() { return state },
    hit(ITR) { this.hits.push(ITR); return 1 },
  }
  return target
}

function itr(overrides = {}) {
  return { kind: 0, effect: 0, arest: 15, injury: 10, ...overrides }
}

test("same-team frozen character is still hit", () => {
  const char = makeCharacter()
  const target = makeTarget(100, { team: 1, state: FROZEN })
  char.frame.D = { state: 3, itr: [itr()] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 1, "frozen teammate must still be hit")
})

test("same-team caught character is still hit", () => {
  const char = makeCharacter()
  const target = makeTarget(100, { team: 1, state: BEING_CAUGHT })
  char.frame.D = { state: 3, itr: [itr()] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 1, "caught teammate must still be hit")
})

test("same-team standing character is not hit", () => {
  const char = makeCharacter()
  const target = makeTarget(100, { team: 1, state: 0 })
  char.frame.D = { state: 3, itr: [itr()] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 0, "same-team standing character must be skipped")
})

test("overlapping itrs hit a target exactly once — first itr wins", () => {
  const char = makeCharacter(() => 0.9) // tie-break keeps the first itr
  const itr1 = itr({ injury: 10 })
  const itr2 = itr({ injury: 20 })
  const target = makeTarget(100)
  char.frame.D = { state: 3, itr: [itr1, itr2] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 1, "target must be hit exactly once")
  assert.equal(target.hits[0], itr1, "first itr wins when the tie-break keeps it")
})

test("later overlapping itr can replace the winner on a 50% roll", () => {
  const char = makeCharacter(() => 0.1) // tie-break replaces the first itr
  const itr1 = itr({ injury: 10 })
  const itr2 = itr({ injury: 20 })
  const target = makeTarget(100)
  char.frame.D = { state: 3, itr: [itr1, itr2] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 1, "target must be hit exactly once")
  assert.equal(target.hits[0], itr2, "later itr replaces the winner when the roll allows it")
})

test("winner selection is deterministic for a fixed seed", () => {
  const run = () => {
    const rand = new SeedableRandom()
    rand.seed(42)
    const char = makeCharacter(() => rand.next())
    const target = makeTarget(100)
    char.frame.D = { state: 3, itr: [itr({ injury: 10 }), itr({ injury: 20 })] }
    char.scene.query = () => [target]
    char.post_interaction()
    return target.hits[0].injury
  }
  assert.equal(run(), run(), "same seed must produce the same winner")
})

test("no RNG draw when only one itr overlaps a target", () => {
  let draws = 0
  const char = makeCharacter(() => { draws++; return 0.9 })
  const target = makeTarget(100)
  char.frame.D = { state: 3, itr: [itr()] }
  char.scene.query = () => [target]
  char.post_interaction()
  assert.equal(target.hits.length, 1)
  assert.equal(draws, 0, "single overlapping itr must not consume RNG")
})
