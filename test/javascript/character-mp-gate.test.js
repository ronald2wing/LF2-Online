// Unit tests for the MP gate on character frame transitions (character.js).
//
// F.LF gates special moves at the state transition: entering a frame with a
// positive `mp` cost requires `health.mp >= mp % 1000` (see the reference
// `character.prototype.trans.frame` override in F.LF). This port had no such
// gate — a move could start with zero MP and the deduction simply clamped it
// at 0. The Character constructor now overrides `trans.frame` to refuse an
// unaffordable transition before it is queued.
//
// Firzen's data exercises every branch: frame 240 `mp: 100`, 249 `mp: 250`,
// 265 `mp: 25`, 272 `mp: -14` (drain, never gated), and standing/walking
// frames with no `mp`.
import { test } from "node:test"
import assert from "node:assert/strict"
import Character from "../../app/javascript/engine/Game/character.js"
import firzenData from "../../app/javascript/engine/pack/data/firzen.js"

globalThis.HTMLElement = class HTMLElement {}
globalThis.Image = class Image {
  constructor() { this.naturalWidth = 79; this.naturalHeight = 79 }
  set src(v) { this._src = v }
  get src() { return this._src }
}

// Frame 300 is unused in firzen's data. Add one encoding an HP cost in the
// high digits (300 MP + 40 HP) to prove the gate checks only `mp % 1000`.
firzenData.frame[300] = {
  pic: 0, state: 3, wait: 1, next: 0, dvx: 0, dvy: 0, dvz: 0,
  centerx: 39, centery: 79, hit_a: 0, hit_d: 0, hit_j: 0, mp: 4300,
}

const FIRZEN_ID = 51

function makeCharacter(mp) {
  const match = {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {}, x: 0, y: 0 },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { [FIRZEN_ID]: { no_shadow: true } },
    scene: { query() { return [] } },
    sound: { play() {} },
    destroy_object() {},
  }
  const char = new Character({ match, team: 1 }, firzenData, FIRZEN_ID)
  char.health.mp = mp
  return char
}

test("a move whose MP cost exceeds remaining MP does not execute", () => {
  const char = makeCharacter(50)
  char.trans.frame(240, 11) // cost 100
  assert.equal(char.trans.next(), 999, "unaffordable move must not be queued")
  char.trans.trans()
  assert.equal(char.frame.N, 0, "character must remain in its current frame")
  assert.equal(char.health.mp, 50, "MP must be unchanged")
})

test("a move executes and deducts MP when affordable", () => {
  const char = makeCharacter(200)
  char.trans.frame(240, 11) // cost 100
  assert.equal(char.trans.next(), 240, "affordable move must be queued")
  char.trans.trans()
  assert.equal(char.frame.N, 240, "affordable move must execute")
  assert.equal(char.health.mp, 100, "MP cost (100) must be deducted on entry")
})

test("a move with MP cost exactly equal to remaining MP is allowed", () => {
  const char = makeCharacter(250)
  char.trans.frame(249, 11) // cost 250
  assert.equal(char.trans.next(), 249, "exactly-affordable move must be queued")
  char.trans.trans()
  assert.equal(char.frame.N, 249, "exactly-affordable move must execute")
  assert.equal(char.health.mp, 0, "MP must reach exactly 0")
})

test("frames with no MP cost are never gated", () => {
  const char = makeCharacter(0)
  char.trans.frame(5, 5) // walking frame, no mp
  assert.equal(char.trans.next(), 5, "mp-free frame must always be allowed")
})

test("negative MP (drain) frames are never gated", () => {
  const char = makeCharacter(0)
  char.trans.frame(272, 11) // mp: -14
  assert.equal(char.trans.next(), 272, "negative-mp frame must never be gated")
})

test("MP costs above 1000 gate only the MP portion (mp % 1000)", () => {
  const blocked = makeCharacter(299)
  blocked.trans.frame(300, 11) // mp: 4300 -> 300 MP + 40 HP
  assert.equal(blocked.trans.next(), 999, "299 MP cannot afford the 300 MP portion")

  const allowed = makeCharacter(300)
  allowed.trans.frame(300, 11)
  assert.equal(allowed.trans.next(), 300, "300 MP affords the 300 MP portion")
})
