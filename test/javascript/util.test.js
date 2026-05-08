// Unit tests for the engine's pure utility module (core/util.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import Util from "../../app/javascript/engine/core/util.js"

test("arrayWrap wraps non-arrays and returns [] for falsy", () => {
  assert.deepEqual(Util.arrayWrap(1), [1])
  assert.deepEqual(Util.arrayWrap([1, 2]), [1, 2])
  assert.deepEqual(Util.arrayWrap(null), [])
  assert.deepEqual(Util.arrayWrap(undefined), [])
  assert.deepEqual(Util.arrayWrap(0), [])
})

test("defined is true for anything except null/undefined", () => {
  assert.equal(Util.defined(null), false)
  assert.equal(Util.defined(undefined), false)
  assert.equal(Util.defined(0), true)
  assert.equal(Util.defined(""), true)
  assert.equal(Util.defined(false), true)
})

test("inbetween is inclusive and order-agnostic", () => {
  assert.equal(Util.inbetween(5, 1, 10), true)
  assert.equal(Util.inbetween(5, 10, 1), true)
  assert.equal(Util.inbetween(1, 1, 10), true)
  assert.equal(Util.inbetween(10, 1, 10), true)
  assert.equal(Util.inbetween(11, 1, 10), false)
  assert.equal(Util.inbetween(0, 1, 10), false)
})

test("pointInRect accepts array [x, y, w, h]", () => {
  assert.equal(Util.pointInRect(5, 5, [0, 0, 10, 10]), true)
  assert.equal(Util.pointInRect(10, 10, [0, 0, 10, 10]), true)
  assert.equal(Util.pointInRect(15, 5, [0, 0, 10, 10]), false)
  assert.equal(Util.pointInRect(5, 15, [0, 0, 10, 10]), false)
})

test("pointInRect accepts object {left, top, right, bottom}", () => {
  const rect = { left: 0, top: 0, right: 10, bottom: 10 }
  assert.equal(Util.pointInRect(5, 5, rect), true)
  assert.equal(Util.pointInRect(15, 5, rect), false)
  assert.equal(Util.pointInRect(5, 15, rect), false)
})

test("extend deep-merges nested objects", () => {
  const target = { a: 1, b: { x: 1 } }
  Util.extend(target, { b: { y: 2 }, c: 3 })
  assert.deepEqual(target, { a: 1, b: { x: 1, y: 2 }, c: 3 })
})

test("extractArray pulls named props into parallel arrays", () => {
  const out = Util.extractArray(
    [{ x: 1, y: 2 }, { x: 3, y: 4 }],
    ["x", "y"],
  )
  assert.deepEqual(out, { x: [1, 3], y: [2, 4] })
})

test("groupBy groups objects by a key, skipping falsy keys", () => {
  const out = Util.groupBy(
    [{ k: "a", v: 1 }, { k: "b", v: 2 }, { k: "a", v: 3 }, { v: 4 }],
    "k",
  )
  assert.equal(out.a.length, 2)
  assert.equal(out.b.length, 1)
  assert.equal(out.a[1].v, 3)
})

test("callEach calls a method on each item (array)", () => {
  const seen = []
  const items = [{ f: (x) => seen.push(x) }, { f: (x) => seen.push(x) }]
  Util.callEach(items, "f", 1)
  assert.deepEqual(seen, [1, 1])
})

test("callEach calls a method on each value (object)", () => {
  const seen = []
  const items = { a: { f: () => seen.push("a") }, b: { f: () => seen.push("b") } }
  Util.callEach(items, "f")
  assert.deepEqual(seen, ["a", "b"])
})
