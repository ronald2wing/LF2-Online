// Unit tests for the AI input layer (Game/AI.js): AIController (input
// buffering) + AIInterface (AI helper methods used by Computer.js).
// Requires the engine importmap-alias shim: run with
//   node --import ./test/javascript/loader.mjs --test test/javascript/*.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import AI from "../../app/javascript/engine/Game/AI.js"

const { interface: AIInterface, controller: AIController } = AI

function makeEntity(overrides = {}) {
  const entity = {
    type: "character",
    ps: { dir: "right" },
    hold: { obj: null },
    effect: { blink: false, timeout: 0 },
    catching: false,
    statemem: { counter: 0 },
    frame: { N: 0 },
    combodec: { seq: [] },
    state: () => 0,
    getProperty: () => false,
    ...overrides,
  }
  entity.AI = new AIInterface(entity)
  return entity
}

// --- AIInterface ---

test("AIInterface.type maps entity type strings to numeric codes", () => {
  const cases = {
    character: 0, lightweapon: 1, heavyweapon: 2, specialattack: 3,
    baseball: 4, criminal: 5, drink: 6, unknown: 0,
  }
  for (const [type, expected] of Object.entries(cases)) {
    assert.equal(makeEntity({ type }).AI.type(), expected, `type ${type}`)
  }
})

test("AIInterface.facing is true only when ps.dir is left", () => {
  assert.equal(makeEntity({ ps: { dir: "left" } }).AI.facing(), true)
  assert.equal(makeEntity({ ps: { dir: "right" } }).AI.facing(), false)
})

test("AIInterface.weaponType resolves held-object categories", () => {
  // No held object → 0.
  assert.equal(makeEntity().AI.weaponType(), 0)

  // lightweapon: stand_throw → 101, else 1.
  assert.equal(
    makeEntity({ hold: { obj: { type: "lightweapon", id: 100 } }, getProperty: () => true }).AI.weaponType(),
    101,
  )
  assert.equal(
    makeEntity({ hold: { obj: { type: "lightweapon", id: 100 } }, getProperty: () => false }).AI.weaponType(),
    1,
  )

  // heavyweapon → 2.
  assert.equal(makeEntity({ hold: { obj: { type: "heavyweapon" } } }).AI.weaponType(), 2)

  // held character → negative of the HOLDER's own type (criminal → -5).
  assert.equal(makeEntity({ type: "criminal", hold: { obj: { type: "character", id: 1 } } }).AI.weaponType(), -5)
})

test("AIInterface.weaponHeld returns held uid or -1", () => {
  assert.equal(makeEntity().AI.weaponHeld(), -1)
  assert.equal(makeEntity({ hold: { obj: { uid: 7 } } }).AI.weaponHeld(), 7)
})

test("AIInterface.weaponHolder returns uid only for a weapon-ish self type", () => {
  // self type "lightweapon" → AI.type() 1 → in {1,2,4,6} → uid.
  assert.equal(makeEntity({ type: "lightweapon", hold: { obj: { uid: 42 } } }).AI.weaponHolder(), 42)
  // self type "character" → AI.type() 0 → not in set → undefined.
  assert.equal(makeEntity({ type: "character", hold: { obj: { uid: 42 } } }).AI.weaponHolder(), undefined)
  // No held object → undefined.
  assert.equal(makeEntity({ type: "drink" }).AI.weaponHolder(), undefined)
})

test("AIInterface.blink returns half the timeout when blinking, else 0", () => {
  assert.equal(makeEntity().AI.blink(), 0)
  assert.equal(makeEntity({ effect: { blink: true, timeout: 10 } }).AI.blink(), 5)
})

test("AIInterface.catchTimer is counter*6 only while catching in state 9", () => {
  assert.equal(makeEntity().AI.catchTimer(), 0)
  assert.equal(
    makeEntity({ catching: true, state: () => 9, statemem: { counter: 3 } }).AI.catchTimer(),
    18,
  )
  assert.equal(
    makeEntity({ catching: true, state: () => 3, statemem: { counter: 3 } }).AI.catchTimer(),
    0,
  )
})

test("AIInterface.frame1 returns the current frame number", () => {
  assert.equal(makeEntity({ frame: { N: 42 } }).AI.frame1(), 42)
})

test("AIInterface.seqcheck matches combo-sequence suffixes (1/2/3)", () => {
  assert.equal(makeEntity().AI.seqcheck([]), 0)

  const one = makeEntity({ combodec: { seq: ["def", "left"] } }).AI
  assert.equal(one.seqcheck(["left"]), 1) // last key matches
  assert.equal(one.seqcheck(["def", "left"]), 2) // last two match
  assert.equal(one.seqcheck(["right"]), 0)

  const three = makeEntity({ combodec: { seq: ["def", "left", "att"] } }).AI
  assert.equal(three.seqcheck(["def", "left", "att"]), 3)
})

// --- AIController ---

test("AIController.key buffers [key, down] in sync mode", () => {
  const c = new AIController()
  c.key("att", 1)
  c.key("jump", 0)
  assert.deepEqual(c.buf, [["att", 1], ["jump", 0]])
})

test("AIController.key dispatches immediately in non-sync mode", () => {
  const c = new AIController()
  c.sync = false
  const seen = []
  c.child = [{ key: (k, d) => seen.push([k, d]) }]
  c.key("att", 1)
  assert.deepEqual(seen, [["att", 1]])
  assert.equal(c.state.att, 1)
})

test("AIController.keypress without x/y taps (down then up)", () => {
  const c = new AIController()
  c.keypress("att")
  assert.deepEqual(c.buf, [["att", 1], ["att", 0]])
})

test("AIController.keypress holds (x=1,y=1) and releases (x=0,y=0)", () => {
  const c = new AIController()
  c.keypress("att", 1, 1) // hold
  assert.deepEqual(c.buf, [["att", 1]])
  c.buf.length = 0
  c.state.att = 1
  c.keypress("att", 0, 0) // release
  assert.deepEqual(c.buf, [["att", 0]])
})

test("AIController.keyseq presses each key in sequence", () => {
  const c = new AIController()
  c.keyseq(["def", "down", "att"])
  assert.deepEqual(c.buf, [
    ["def", 1], ["def", 0],
    ["down", 1], ["down", 0],
    ["att", 1], ["att", 0],
  ])
})

test("AIController.fetch drains buf into state and children", () => {
  const c = new AIController()
  const seen = []
  c.child = [{ key: (k, d) => seen.push([k, d]) }]
  c.buf = [["att", 1], ["jump", 1]]
  c.fetch()
  assert.equal(c.state.att, 1)
  assert.equal(c.state.jump, 1)
  assert.deepEqual(seen, [["att", 1], ["jump", 1]])
  assert.deepEqual(c.buf, [])
})

test("AIController.clearStates zeroes state; flush clears buf", () => {
  const c = new AIController()
  c.state = { att: 1, jump: 1 }
  c.buf = [["att", 1]]
  c.clearStates()
  c.flush()
  assert.deepEqual(c.state, { att: 0, jump: 0 })
  assert.deepEqual(c.buf, [])
})
