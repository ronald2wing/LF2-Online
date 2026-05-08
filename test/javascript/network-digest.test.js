// Unit tests for the pure digest comparator (engine/network-digest.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import { deepEqual, compareDigests } from "../../app/javascript/engine/network-digest.js"

function digest(overrides = {}) {
  return {
    t: 10,
    rng: [0.5, 0.25],
    fx: [3, 1],
    live: { e1: [1, 2, 3], e2: [4, 5] },
    ...overrides,
  }
}

// ── deepEqual ──────────────────────────────────────────────────────────────

test("deepEqual matches equal nested objects and arrays", () => {
  assert.equal(deepEqual({ a: [1, { b: 2 }], c: "x" }, { a: [1, { b: 2 }], c: "x" }), true)
  assert.equal(deepEqual([1, [2, [3]]], [1, [2, [3]]]), true)
})

test("deepEqual detects a differing nested value", () => {
  assert.equal(deepEqual({ a: { b: 1 } }, { a: { b: 2 } }), false)
  assert.equal(deepEqual([1, 2, 3], [1, 2, 4]), false)
})

test("deepEqual detects array length mismatch", () => {
  assert.equal(deepEqual([1, 2, 3], [1, 2]), false)
  assert.equal(deepEqual([1, 2], [1, 2, 3]), false)
})

test("deepEqual treats NaN as equal to NaN", () => {
  assert.equal(deepEqual(NaN, NaN), true)
  assert.equal(deepEqual([NaN, 1], [NaN, 1]), true)
  assert.equal(deepEqual({ x: NaN }, { x: NaN }), true)
  assert.equal(deepEqual(NaN, 1), false)
})

test("deepEqual distinguishes missing keys from present values", () => {
  assert.equal(deepEqual({ a: 1 }, {}), false)
  assert.equal(deepEqual({ a: undefined }, {}), false)
  assert.equal(deepEqual(undefined, null), false)
})

// ── compareDigests ─────────────────────────────────────────────────────────

test("compareDigests returns null for identical digests", () => {
  assert.equal(compareDigests(digest(), digest()), null)
})

test("compareDigests reports a time mismatch", () => {
  const d = compareDigests(digest({ t: 10 }), digest({ t: 11 }))
  assert.deepEqual(d, { object: "time", field: "t", mine: 10, theirs: 11 })
})

test("compareDigests reports an rng element mismatch", () => {
  const d = compareDigests(digest({ rng: [0.5, 0.25] }), digest({ rng: [0.5, 0.9] }))
  assert.deepEqual(d, { object: "rng", field: "i1", mine: 0.25, theirs: 0.9 })
})

test("compareDigests reports an fx element mismatch", () => {
  const d = compareDigests(digest({ fx: [3, 1] }), digest({ fx: [3, 2] }))
  assert.deepEqual(d, { object: "fx", field: "i1", mine: 1, theirs: 2 })
})

test("compareDigests reports an entity field mismatch by index", () => {
  const d = compareDigests(digest({ live: { e1: [1, 2, 3] } }), digest({ live: { e1: [1, 2, 9] } }))
  assert.deepEqual(d, { object: "e1", field: "i2", mine: 3, theirs: 9 })
})

test("compareDigests reports an entity present only in a (local-only)", () => {
  const d = compareDigests(digest({ live: { e1: [1, 2, 3] } }), digest({ live: {} }))
  assert.deepEqual(d, { object: "e1", field: "presence", mine: [1, 2, 3], theirs: null })
})

test("compareDigests reports an entity present only in b (remote-only)", () => {
  const d = compareDigests(digest({ live: {} }), digest({ live: { e2: [4, 5] } }))
  assert.deepEqual(d, { object: "e2", field: "presence", mine: null, theirs: [4, 5] })
})

test("compareDigests returns null when both digests are null/undefined", () => {
  assert.equal(compareDigests(null, null), null)
  assert.equal(compareDigests(undefined, undefined), null)
})

test("compareDigests reports a digest-level presence mismatch", () => {
  const a = digest()
  const b = digest()
  assert.deepEqual(compareDigests(a, null), { object: "digest", field: "presence", mine: a, theirs: null })
  assert.deepEqual(compareDigests(null, b), { object: "digest", field: "presence", mine: null, theirs: b })
})
