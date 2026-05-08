// Unit tests for the engine's pure collision module (core/collision.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import collision from "../../app/javascript/engine/core/collision.js"

test("rect_flat returns true for overlapping rectangles", () => {
  assert.equal(collision.rect_flat(0, 0, 10, 10, 5, 5, 15, 15), true)
  assert.equal(collision.rect_flat(0, 0, 10, 10, -5, 5, 5, 15), true)
})

test("rect_flat returns false when rect1 is left of rect2", () => {
  assert.equal(collision.rect_flat(0, 0, 10, 10, 20, 0, 30, 10), false)
})

test("rect_flat returns false when rect1 is right of rect2", () => {
  assert.equal(collision.rect_flat(20, 0, 30, 10, 0, 0, 10, 10), false)
})

test("rect_flat returns false when rect1 is above rect2", () => {
  assert.equal(collision.rect_flat(0, 0, 10, 10, 0, 20, 10, 30), false)
})

test("rect_flat returns false when rect1 is below rect2", () => {
  assert.equal(collision.rect_flat(0, 20, 10, 30, 0, 0, 10, 10), false)
})

test("rect_flat treats touching edges as overlapping (inclusive)", () => {
  assert.equal(collision.rect_flat(0, 0, 10, 10, 10, 0, 20, 10), true) // r1 === l2
  assert.equal(collision.rect_flat(0, 0, 10, 10, 0, 10, 10, 20), true) // b1 === t2
})

test("rect_flat returns true when one rect contains the other", () => {
  assert.equal(collision.rect_flat(0, 0, 100, 100, 40, 40, 60, 60), true)
  assert.equal(collision.rect_flat(40, 40, 60, 60, 0, 0, 100, 100), true)
})

test("rect_flat returns true for identical rectangles", () => {
  assert.equal(collision.rect_flat(1, 2, 3, 4, 1, 2, 3, 4), true)
})

test("rect_flat handles zero-width/zero-height (point-on-edge)", () => {
  // A zero-size point exactly on the boundary counts as inside.
  assert.equal(collision.rect_flat(5, 5, 5, 5, 0, 0, 10, 10), true)
  assert.equal(collision.rect_flat(15, 15, 15, 15, 0, 0, 10, 10), false)
})

test("rect_flat supports the scene.js z-overlap usage (z→x, 0/1→y)", () => {
  // a.z=5 zw=3 → [2,0,8,1]; b.z=6 zw=1 → [5,0,7,1]: overlapping z-bands.
  assert.equal(collision.rect_flat(2, 0, 8, 1, 5, 0, 7, 1), true)
  // Disjoint z-bands.
  assert.equal(collision.rect_flat(2, 0, 4, 1, 5, 0, 7, 1), false)
})
