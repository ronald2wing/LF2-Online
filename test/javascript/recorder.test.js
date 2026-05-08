// Unit tests for the replay recording input-mask encoding (recorder.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import { inputMask, maskInput } from "../../app/javascript/engine/Game/recorder.js"

test("inputMask sets bits in INPUT_KEYS order", () => {
  // INPUT_KEYS = [up, down, left, right, att, jump, def]
  assert.equal(inputMask({ up: 1 }), 1)          // bit 0
  assert.equal(inputMask({ right: 1 }), 8)       // bit 3
  assert.equal(inputMask({ def: 1 }), 64)        // bit 6
  assert.equal(inputMask({ up: 1, def: 1 }), 65) // bits 0 + 6
  assert.equal(inputMask({}), 0)
})

test("inputMask is tolerant of undefined state", () => {
  assert.equal(inputMask(undefined), 0)
  assert.equal(inputMask(null), 0)
})

test("maskInput decodes a mask back into a full state object", () => {
  assert.deepEqual(maskInput(65), {
    up: 1, down: 0, left: 0, right: 0, att: 0, jump: 0, def: 1,
  })
  assert.deepEqual(maskInput(0), {
    up: 0, down: 0, left: 0, right: 0, att: 0, jump: 0, def: 0,
  })
})

test("inputMask / maskInput round-trip is lossless", () => {
  const state = { up: 1, down: 0, left: 0, right: 1, att: 1, jump: 0, def: 0 }
  assert.deepEqual(maskInput(inputMask(state)), state)
})
