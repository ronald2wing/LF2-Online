// Unit tests for the pure input-delay helper (engine/network-timing.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import { computeInputDelay } from "../../app/javascript/engine/network-timing.js"

const TICK = 1000 / 30

test("computeInputDelay floors to the minimum delay at zero RTT", () => {
  assert.equal(computeInputDelay(0, TICK), 2)
})

test("computeInputDelay adds one frame of margin at low RTT", () => {
  // rtt=50 -> one-way 25ms; (25 + 8) / 33.3 = 0.99 -> ceil 1 -> +1 = 2.
  assert.equal(computeInputDelay(50, TICK), 2)
})

test("computeInputDelay reaches the ceiling for high-latency links", () => {
  // rtt=400 -> one-way 200ms; (200 + 8) / 33.3 = 6.24 -> ceil 7 -> +1 = 8 -> clamp 6.
  assert.equal(computeInputDelay(400, TICK), 6)
})

test("computeInputDelay never exceeds the maximum", () => {
  assert.equal(computeInputDelay(100000, TICK), 6)
  assert.equal(computeInputDelay(1e9, TICK), 6)
})

test("computeInputDelay treats negative/NaN/non-finite RTT as zero", () => {
  assert.equal(computeInputDelay(-50, TICK), 2)
  assert.equal(computeInputDelay(NaN, TICK), 2)
  assert.equal(computeInputDelay(undefined, TICK), 2)
  assert.equal(computeInputDelay(null, TICK), 2)
})

test("computeInputDelay is non-decreasing in RTT", () => {
  let prev = -1
  for (const rtt of [0, 10, 50, 100, 200, 400, 1000, 10000]) {
    const delay = computeInputDelay(rtt, TICK)
    assert.ok(delay >= prev, `delay ${delay} < ${prev} at RTT ${rtt}`)
    prev = delay
  }
})

test("computeInputDelay guards a non-positive tick interval", () => {
  assert.equal(computeInputDelay(100, 0), 2)
  assert.equal(computeInputDelay(100, -5), 2)
  assert.equal(computeInputDelay(100, NaN), 2)
})
