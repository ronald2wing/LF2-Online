// Unit tests for the match lifecycle teardown invariants (match.js).
//
// A finished/quit match used to keep ticking because match_quit()/match_end()
// never destroyed the Match, and destroy() threw when self.time was still
// undefined (create_timer() runs asynchronously after the pack loads). These
// tests pin three invariants of the centralized teardown:
//   - destroy() is safe (no throw) before create_timer() has run, i.e. when
//     self.time is undefined — an early exit must still tear down cleanly.
//   - destroy() fires onend exactly once and is idempotent, so championship
//     advance and replay teardown can't double-fire the callback.
//   - destroy() cancels pending stage-mode timeouts so a quit can never spawn
//     a follow-up match.
//
// The engine core (support.js, sprite-dom.js, ...) reads `document`/`window` at
// import time, and the sprite stack constructs HTMLElement/Image, so a minimal
// stub is installed *before* match.js is loaded (hence the dynamic import).
// Each test file runs in its own process, so these globals never leak.
import { test } from "node:test"
import assert from "node:assert/strict"
import { installDomStubs } from "./support/dom-stubs.js"

function fakeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {} },
    parentNode: { removeChild() {}, appendChild() {} },
    appendChild() {},
    removeChild() {},
    getElementsByTagName: () => [],
    addEventListener() {},
    removeEventListener() {},
  }
}
installDomStubs()
globalThis.document = {
  createElement: () => fakeEl(),
  getElementsByTagName: () => [fakeEl()],
  getElementById: () => fakeEl(),
  addEventListener() {},
  removeEventListener() {},
  head: fakeEl(),
  body: fakeEl(),
}
globalThis.window = {
  localStorage: undefined,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  addEventListener() {},
}

const { default: Match } = await import("../../app/javascript/engine/Game/match.js")

// A Match constructed but never create()d has no self.time (create_timer() runs
// later) and no create_scenegraph() — exactly the early-exit-during-load window
// the lifecycle defect exposed. destroy() must tolerate all of it.
function makeUncreatedMatch() {
  return new Match({
    manager: { sound: {} },
    'package': { data: { properties: { data: {} } } },
  })
}

test("destroy() is safe before create_timer() runs (self.time undefined)", () => {
  const match = makeUncreatedMatch()
  let ended = 0
  match.onend = () => { ended++ }

  assert.doesNotThrow(() => match.destroy(), "early destroy must not throw when self.time is undefined")
  assert.equal(match.destroyed, true, "destroy() must mark the match destroyed")
  assert.equal(ended, 1, "onend must fire exactly once on destroy")
})

test("destroy() is idempotent and never double-fires onend", () => {
  const match = makeUncreatedMatch()
  let ended = 0
  match.onend = () => { ended++ }

  match.destroy()
  assert.doesNotThrow(() => match.destroy(), "a second destroy must be a no-op")
  assert.equal(ended, 1, "championship/replay onend must not double-fire")
})

test("destroy() cancels pending stage-mode timeouts", async () => {
  const match = makeUncreatedMatch()
  match._stage_timers = [] // create() normally initializes this before any timeout is scheduled
  let fired = false
  match._stage_timeout(() => { fired = true }, 10)

  match.destroy()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(fired, false, "a quit must cancel the stage advance/retry timeout so it never spawns a match")
})
