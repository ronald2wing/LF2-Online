// Unit tests for the DOM-free effect/projectile pool manager (core/effects-pool.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import EffectsPool from "../../app/javascript/engine/core/effects-pool.js"

// Builds a pool config whose `construct` hands out fresh spied objects, and
// records every object it allocates so tests can assert reuse vs. reallocation.
function makeConfig(overrides = {}) {
  const made = []
  const config = {
    circular: true,
    init_size: 3,
    batch_size: 2,
    max_size: 10,
    construct() {
      const obj = {
        bornCalls: [],
        dieCalls: [],
        born(...args) {
          this.bornCalls.push(args)
        },
        die(...args) {
          this.dieCalls.push(args)
        },
      }
      made.push(obj)
      return obj
    },
    ...overrides,
  }
  return { config, made }
}

// Runs `fn` while capturing console.warn output, restoring the original after.
function captureWarn(fn) {
  const warns = []
  const orig = console.warn
  console.warn = (msg) => warns.push(msg)
  try {
    fn()
  } finally {
    console.warn = orig
  }
  return warns
}

// ── Factory / construction ──────────────────────────────────────────────────

test("factory returns a circular pool when circular:true", () => {
  const pool = new EffectsPool(makeConfig({ circular: true }).config)
  assert.equal(pool.alive, undefined)
  assert.ok("full" in pool && "start" in pool && "end" in pool)
})

test("factory returns a linear pool when circular:false", () => {
  const pool = new EffectsPool(makeConfig({ circular: false }).config)
  assert.ok(Array.isArray(pool.alive))
  assert.equal("full" in pool, false)
})

test("construct is called init_size times and links each object to its pool", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 5 })
  const pool = new EffectsPool(config)
  assert.equal(made.length, 5)
  assert.equal(pool.pool.length, 5)
  for (const obj of made) assert.equal(obj.parent, pool)
})

test("linear pool starts with every slot dormant", () => {
  const { config, made } = makeConfig({ circular: false, init_size: 4 })
  const pool = new EffectsPool(config)
  assert.equal(made.length, 4)
  assert.deepEqual(pool.alive, [false, false, false, false])
})

// ── CircularPool behaviour ──────────────────────────────────────────────────

test("circular create returns pooled objects and passes args to born", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 3 })
  const pool = new EffectsPool(config)
  const obj = pool.create("p", 7)
  assert.equal(obj, made[0])
  assert.deepEqual(obj.bornCalls, [["p", 7]])
})

test("circular pool recycles a released object instead of allocating", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 3, batch_size: 2, max_size: 10 })
  const pool = new EffectsPool(config)
  const a = pool.create(1)
  pool.create(2)
  pool.create(3)
  assert.equal(made.length, 3)

  const released = pool.die(a)
  assert.equal(released, a)

  const reused = pool.create(4)
  assert.equal(reused, a)
  assert.equal(made.length, 3)          // no new allocation
  assert.equal(a.bornCalls.length, 2)   // born fired on first allocation and reuse
})

test("circular pool grows by batch_size while under max_size", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 2, batch_size: 2, max_size: 6 })
  const pool = new EffectsPool(config)
  pool.create(1)
  pool.create(2)                        // pool now full
  const obj = pool.create(3)            // triggers a batch expansion
  assert.equal(made.length, 4)
  assert.equal(obj, made[2])
})

test("circular pool returns false when exhausted beyond max_size", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 2, batch_size: 2, max_size: 3 })
  const pool = new EffectsPool(config)
  pool.create(1)
  pool.create(2)                        // full; expansion (2+2 > 3) is refused
  assert.equal(pool.create(3), false)
  assert.equal(made.length, 2)
})

test("circular die releases the oldest object, ignoring the passed target", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 3 })
  const pool = new EffectsPool(config)
  const a = pool.create(1)
  const b = pool.create(2)
  pool.create(3)

  const released = pool.die(b)          // target b is ignored; FIFO releases oldest (a)
  assert.equal(released, a)
  assert.equal(a.dieCalls.length, 1)
  assert.equal(b.dieCalls.length, 0)
})

test("circular die on an empty pool warns and returns undefined", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 2 })
  const pool = new EffectsPool(config)
  const warns = captureWarn(() => pool.die(made[0]))
  assert.deepEqual(warns, ["effects-pool: cannot release an object from an empty pool"])
})

test("circular callEach invokes the method on live items only", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 3, batch_size: 2, max_size: 10 })
  const pool = new EffectsPool(config)
  const a = pool.create(1)
  const b = pool.create(2)
  const c = pool.create(3)
  pool.die(a)                           // release the oldest; live = [b, c]
  const ticked = []
  for (const obj of made) obj.tick = () => ticked.push(obj)
  pool.callEach("tick")
  assert.deepEqual(ticked, [b, c])
})

test("circular forEach stops when the callback returns 'break'", () => {
  const { config, made } = makeConfig({ circular: true, init_size: 3 })
  const pool = new EffectsPool(config)
  pool.create(1)
  pool.create(2)
  pool.create(3)
  const visited = []
  pool.forEach((obj) => {
    visited.push(obj)
    return obj === made[1] ? "break" : undefined
  })
  assert.deepEqual(visited, [made[0], made[1]])
})

test("circular expansion preserves FIFO order after wrapping", () => {
  const { config, made } = makeConfig({ init_size: 3, batch_size: 2, max_size: 5 })
  const pool = new EffectsPool(config)
  pool.create(0)
  pool.create(1)
  pool.create(2)
  pool.die(made[0])
  pool.die(made[1])
  pool.create(3)
  pool.create(4)
  const added = pool.create(5)

  const visited = []
  pool.forEach(obj => visited.push(obj))
  assert.deepEqual(visited, [made[2], made[0], made[1], added])
  assert.equal(added, made[3])
  assert.equal(added.parent, pool)
  assert.equal(pool.livecount, 4)
  for (const obj of visited) assert.equal(pool.die(obj), obj)
  assert.equal(pool.livecount, 0)
})

test("circular iteration can stop in either segment of a wrapped pool", () => {
  const { config, made } = makeConfig({ init_size: 3 })
  const pool = new EffectsPool(config)
  pool.create()
  pool.create()
  pool.create()
  pool.die(made[0])
  pool.die(made[1])
  pool.create()
  pool.create()

  for (const expected of [[made[2]], [made[2], made[0]]]) {
    const visited = []
    pool.forEach(obj => {
      visited.push(obj)
      if (visited.length === expected.length) return "break"
    })
    assert.deepEqual(visited, expected)
  }
})

for (const circular of [true, false]) {
  test(`${circular ? "circular" : "linear"} pool forwards hook arguments with the object as receiver`, () => {
    const { config } = makeConfig({ circular, init_size: 1, batch_size: 1, max_size: 2 })
    const pool = new EffectsPool(config)
    pool.create()
    const payload = { frame: 7 }
    const obj = pool.create(payload, "born")
    assert.deepEqual(obj.bornCalls, [[payload, "born"]])

    obj.tick = function (...args) {
      assert.equal(this, obj)
      assert.deepEqual(args, [payload, "tick"])
    }
    pool.callEach("tick", payload, "tick")
    if (circular) pool.die(pool.pool[0])
    assert.equal(pool.die(obj, payload, "die"), obj)
    assert.deepEqual(obj.dieCalls, [[payload, "die"]])
    assert.equal(obj.parent, pool)
  })
}

// ── LinearPool behaviour ────────────────────────────────────────────────────

test("linear create reuses the first free slot and re-fires born", () => {
  const { config, made } = makeConfig({ circular: false, init_size: 3, batch_size: 2, max_size: 10 })
  const pool = new EffectsPool(config)
  const a = pool.create(1)
  const b = pool.create(2)
  pool.create(3)
  pool.die(b)                           // free slot 1
  const reused = pool.create(4)
  assert.equal(reused, b)
  assert.equal(made.length, 3)
  assert.deepEqual(b.bornCalls, [[2], [4]])
})

test("linear die releases the exact target and rejects a wrong/dead one", () => {
  const { config, made } = makeConfig({ circular: false, init_size: 3 })
  const pool = new EffectsPool(config)
  pool.create(1)
  const b = pool.create(2)
  pool.create(3)

  assert.equal(pool.die(b), b)
  assert.equal(b.dieCalls.length, 1)

  const warns = captureWarn(() => {
    assert.equal(pool.die(b), false)            // already dead
    assert.equal(pool.die({}), false)           // never in the pool
  })
  assert.equal(warns.length, 2)
  assert.ok(warns.every((w) => w.includes("wrong target")))
})

test("linear pool returns false when exhausted beyond max_size", () => {
  const { config, made } = makeConfig({ circular: false, init_size: 2, batch_size: 2, max_size: 3 })
  const pool = new EffectsPool(config)
  pool.create(1)
  pool.create(2)                        // all slots live; expansion (2+2 > 3) refused
  assert.equal(pool.create(3), false)
  assert.equal(made.length, 2)
})

test("linear callEach invokes the method on live items only", () => {
  const { config, made } = makeConfig({ circular: false, init_size: 3, batch_size: 2, max_size: 10 })
  const pool = new EffectsPool(config)
  const a = pool.create(1)
  const b = pool.create(2)
  const c = pool.create(3)
  pool.die(b)
  const ticked = []
  for (const obj of made) obj.tick = () => ticked.push(obj)
  pool.callEach("tick")
  assert.deepEqual(ticked, [a, c])
})
