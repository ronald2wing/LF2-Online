// Unit tests for the engine's game-wide constants (global.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import G from "../../app/javascript/engine/Game/global.js"

test("native viewport is the LF2 794x550 window", () => {
  assert.equal(G.application.window.width, 794)
  assert.equal(G.application.window.height, 550)
  assert.equal(G.application.window.outer_width, 804)
  assert.equal(G.application.window.outer_height, 590)
})

test("wide window dimensions are distinct from native", () => {
  assert.equal(G.application.window.wide_width, 1000)
  assert.notEqual(G.application.window.wide_width, G.application.window.width)
})

test("combo list covers the 9 special-move input sequences", () => {
  assert.equal(G.combo_list.length, 9)
  assert.deepEqual(G.combo_list[0].seq, ["def", "left", "att"])
  assert.equal(G.combo_list[0].name, "D<A")
  assert.deepEqual(G.combo_list[8].seq, ["def", "jump", "att"])
})
