// Unit tests for the InputProxy lockstep input buffer in engine/network.js.
// InputProxy is constructible without a WebSocket/transport, so its wrap /
// buffer / apply / fetch logic is exercised directly.
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import network from "../../app/javascript/engine/network.js"

// A minimal stand-in for the keyboard/touch controller a "local" InputProxy
// wraps. Real controllers expose state/fetch/key plus type/config/keycode.
function makeControl(state = { left: 0, right: 0 }) {
  return {
    type: "keyboard",
    config: { keys: 1 },
    keycode: { left: 37, right: 39 },
    state,
    child: [],
    fetchCount: 0,
    moved: false,
    fetch() {
      this.fetchCount++
    },
    flush() {},
    clearStates() {},
    key() {},
    moveLeft() {
      this.moved = true
    },
  }
}

test("wrap delegates non-reserved methods and skips the reserved ones", () => {
  const control = makeControl()
  const proxy = new network.controller("local", control)

  // Non-reserved methods are copied and delegate back to the control.
  assert.equal(typeof proxy.moveLeft, "function")
  assert.notEqual(proxy.moveLeft, control.moveLeft)
  proxy.moveLeft()
  assert.equal(control.moved, true)

  // Reserved methods (clearStates/flush) are skipped; the proxy's own
  // fetch/key methods (from the InputProxy class) are left in place.
  assert.equal(proxy.clearStates, undefined)
  assert.equal(proxy.flush, undefined)
  assert.equal(typeof proxy.fetch, "function")
  assert.notEqual(proxy.fetch, control.fetch)
})

test("local proxy zero-initialises its state from the control's keys", () => {
  const control = makeControl({ left: 1, right: 1 })
  const proxy = new network.controller("local", control)
  assert.deepEqual(proxy.state, { left: 0, right: 0 })
})

test("key buffers into preBuf and collectLocal flushes it via control.fetch", () => {
  const control = makeControl({ left: 0 })
  const proxy = new network.controller("local", control)

  proxy.key("left", true)
  proxy.key("left", false)

  const buf = proxy.collectLocal()
  assert.deepEqual(buf, [["left", true], ["left", false]])
  assert.equal(control.fetchCount, 1)
  assert.deepEqual(proxy.collectLocal(), [])   // preBuf was drained
})

test("applyLocal concatenates input and fetch applies it to state", () => {
  const control = makeControl({ left: 0, right: 0 })
  const proxy = new network.controller("local", control)

  proxy.applyLocal([["left", true]])
  proxy.applyLocal([["right", true]])
  proxy.fetch()

  assert.equal(proxy.state.left, true)
  assert.equal(proxy.state.right, true)
})

test("remote proxy buffers via applyRemote and has no local collect", () => {
  const config = { up: "w", left: "a" }
  const proxy = new network.controller("remote", config)

  assert.deepEqual(proxy.state, { up: 0, left: 0 })
  assert.equal(proxy.collectLocal(), undefined)

  proxy.applyRemote([["up", true]])
  proxy.fetch()
  assert.equal(proxy.state.up, true)
})

test("dual proxy receives inputs the wrapped control applies (child propagation)", () => {
  const control = makeControl({ left: 0 })
  const local = new network.controller("local", control)
  const dual = new network.controller("dual", local)

  // local.key → preBuf → collectLocal returns it → applyLocal queues it → fetch
  // applies it to local.state and forwards it to the dual proxy's preBuf.
  local.key("left", true)
  const held = local.collectLocal()
  local.applyLocal(held)
  local.fetch()

  assert.equal(local.state.left, true)
  assert.deepEqual(dual.preBuf, [["left", true]])
})
