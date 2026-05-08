// Unit tests for data selection, resource paths, and pack loading.
// Run with: node --import ./test/javascript/loader.mjs --test test/javascript/util.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import Util from "../../app/javascript/engine/core/util.js"
import resourcePath from "../../app/javascript/engine/Game/resource-path.js"
import select from "../../app/javascript/engine/Game/select.js"
import { loadPack } from "../../app/javascript/engine/Game/loader.js"
import loaderConfig from "../../app/javascript/engine/Game/loader-config.js"
import packData from "../../app/javascript/engine/pack/data/data.js"

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

test("normalizePath preserves the pack-relative path contract", () => {
  assert.equal(resourcePath.normalizePath(undefined), "")
  assert.equal(resourcePath.normalizePath(""), "")
  assert.equal(resourcePath.normalizePath("/engine/pack"), "engine/pack/")
  assert.equal(resourcePath.normalizePath("engine\\pack\\"), "engine/pack/")
  assert.equal(resourcePath.normalizePath("/"), "")
  assert.equal(resourcePath.normalizePath("//engine/pack/"), "/engine/pack/")
})

test("pack dependencies keep related objects first and deduplicate by id", () => {
  const hero = { id: 1, type: "character", file: "data/hero.js" }
  const other = { id: 2, type: "character", file: "data/other.js" }
  const projectile = { id: 3, type: "specialattack", file: "data/hero_ball.js" }
  const duplicate = { id: "3", type: "specialattack", file: "data/hero_ball_copy.js" }
  const effect = { id: 4, type: "effect", file: "data/spark.js" }
  const broken = { id: 5, type: "broken", file: "data/broken.js" }
  const unrelated = { id: 6, type: "lightweapon", file: "data/stick.js" }
  const missingFile = { id: 7, type: "effect" }
  const objects = [effect, hero, other, projectile, duplicate, broken, unrelated, missingFile]

  resourcePath.organizePackDependencies({ data: { object: objects } })

  assert.deepEqual(hero.pack, [hero, projectile, effect, broken])
  assert.deepEqual(other.pack, [other, effect, projectile, broken])
  assert.equal(hero.pack[1], projectile)
  assert.equal(effect.pack, undefined)
  assert.equal(unrelated.pack, undefined)
})

test("selectAll matches every requested field and preserves array or object order", () => {
  const first = { id: 1, type: "character", team: 1 }
  const second = { id: 2, type: "character", team: 2 }
  const third = { id: 3, type: "character", team: 1 }
  const items = [first, second, third]
  const criteria = { type: "character", team: 1 }

  assert.deepEqual(select.selectAll(items, criteria), [first, third])
  assert.deepEqual(select.selectAll({ first, second, third }, criteria), [first, third])
  assert.equal(select.selectAll(items, { id: 1 })[0], first)
  assert.deepEqual(select.selectAll(items, {}), items)
  assert.deepEqual(select.selectAll([], criteria), [])
})

test("selectAll invokes predicates with only the item, including empty slots", () => {
  const calls = []
  const items = [, { id: 1 }]
  const selected = select.selectAll(items, function (item) {
    calls.push([...arguments])
    return item
  })

  assert.deepEqual(calls, [[undefined], [items[1]]])
  assert.deepEqual(selected, [items[1]])
})

test("selectOne preserves its zero, one, and multiple match results", () => {
  const first = { id: 1, type: "character" }
  const second = { id: 2, type: "character" }
  const items = [first, second]

  assert.equal(select.selectOne(items, { id: 0 }), undefined)
  assert.equal(select.selectOne(items, { id: 1 }), first)
  assert.deepEqual(select.selectOne(items, { type: "character" }), items)
})

test("lookupTableAbs uses inclusive magnitude thresholds and the final fallback", () => {
  const table = { 0: "still", 5: "slow", 10: "fast" }
  assert.equal(select.lookupTableAbs(table, 0), "still")
  assert.equal(select.lookupTableAbs(table, -5), "slow")
  assert.equal(select.lookupTableAbs(table, 5.1), "fast")
  assert.equal(select.lookupTableAbs(table, -100), "fast")
  assert.equal(select.lookupTableAbs(table, NaN), "fast")
  assert.equal(select.lookupTableAbs({}, 1), undefined)
})

test("the loader delays fighters, attacks, backgrounds, and AI but not shared assets", () => {
  for (const type of ["character", "specialattack"]) {
    assert.equal(loaderConfig.lazyload("object", { type }), true)
  }
  for (const type of ["lightweapon", "heavyweapon", "drink", "effect", "broken"]) {
    assert.equal(loaderConfig.lazyload("object", { type }), false)
  }
  assert.equal(loaderConfig.lazyload("background", {}), true)
  assert.equal(loaderConfig.lazyload("AI", {}), true)
  for (const folder of ["UI", "sound", "properties", "stage_data"]) {
    assert.equal(loaderConfig.lazyload(folder, {}), false)
  }
})

test("loadPack handles list and singleton entries without mutating the manifest data", async () => {
  const pack = await loadPack("engine/pack")
  assert.notEqual(pack.data.object, packData.object)
  assert.notEqual(pack.data.object[0], packData.object[0])
  assert.equal(pack.data.object.find(entry => entry.id === 11).data, "lazy")
  assert.equal(pack.data.background[0].data, "lazy")
  assert.equal(pack.data.AI[0].data, "lazy")
  assert.equal(typeof pack.data.object.find(entry => entry.id === 100).data.frame, "object")
  assert.equal(typeof pack.data.UI.data, "object")
  assert.equal(typeof pack.data.properties.data, "object")
  assert.equal(typeof pack.data.sound[0].data, "object")
  assert.deepEqual(pack.data.config, packData.config)
  assert.equal(packData.object[0].data, undefined)
  assert.equal(packData.UI.data, undefined)
})

test("lazy loading fills every requested entry before calling ready", async () => {
  const pack = await loadPack("engine/pack/")
  const fighter = pack.data.object.find(entry => entry.id === 11)
  const background = pack.data.background[0]
  const ai = pack.data.AI[0]
  let returned = false
  await new Promise(resolve => {
    pack.data.load({ object: [11, 11, -1], background: [background.id], AI: [ai.id] }, () => {
      assert.equal(returned, true)
      assert.equal(typeof fighter.data.frame, "object")
      assert.equal(typeof background.data, "object")
      assert.equal(typeof ai.data, "function")
      resolve()
    })
    returned = true
  })

  const loadedFighter = fighter.data
  returned = false
  await new Promise(resolve => {
    pack.data.load({ object: [11] }, () => {
      assert.equal(returned, true)
      assert.equal(fighter.data, loadedFighter)
      resolve()
    })
    returned = true
  })
  assert.equal(pack.data.object.find(entry => entry.id === 1).data, "lazy")
  assert.equal(packData.object.find(entry => entry.id === 11).data, undefined)
})

test("an empty lazy-load request still calls ready asynchronously", async () => {
  const pack = await loadPack("engine/pack")
  let returned = false
  await new Promise(resolve => {
    pack.data.load({}, () => {
      assert.equal(returned, true)
      resolve()
    })
    returned = true
  })
})
