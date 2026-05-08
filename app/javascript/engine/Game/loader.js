/*
 * loader.js
 *
 * Loads a content package using dynamic ESM imports under an importmap-rails
 * prefix (e.g. "engine/pack/"). The pack manifest references files inside
 * that tree by relative path (e.g. "data/ruby.js"). We strip the ".js"
 * suffix, prepend the pack root, and dynamic-import() picks up the pin.
 *
 * Returns:
 *   content.data          — datalist with `file:` entries resolved
 *   content.data.load     — lazy-loader for opted-out files
 *   content.resourcemap   — pack resourcemap, if declared
 *   content.path          — module-id prefix (set later by manager)
 *   content.location      — URL prefix for runtime assets
 */

import loaderConfig from "engine/Game/loader-config"
import coreUtil from "engine/core/util"

function stripExt(name) {
  if (!name) return ""
  return name.endsWith(".js") ? name.slice(0, -3) : name
}

function resolveModuleId(root, file) {
  return root + stripExt(file)
}

async function importDefault(root, file) {
  const mod = await import(resolveModuleId(root, file))
  return mod.default ?? mod
}

function isLoadable(folder, obj) {
  const { lazyload } = loaderConfig
  return typeof lazyload === "function" ? !lazyload(folder, obj) : true
}

function validateSchema(schema, object) {
  if (!object) return false
  for (const key in schema) {
    const [type, modifier] = schema[key].split("!")
    if (typeof object[key] === type) continue
    if (typeof object[key] === "undefined" && modifier === "optional") continue
    return false
  }
  return true
}

function buildLazyLoader(content, root) {
  return function lazyLoad(sets, ready) {
    const pending = []

    for (const folder in sets) {
      const objects = content.data[folder]
      const ids = sets[folder]
      for (const id of ids) {
        const entry = objects.find(o => o.id === id)
        if (entry?.file && entry.data === "lazy") {
          pending.push({ entry, promise: importDefault(root, entry.file) })
        }
      }
    }

    const fire = () => {
      try { ready() }
      catch (e) { setTimeout(() => { throw e }, 0) }
    }

    if (pending.length === 0) {
      setTimeout(fire, 1)
      return
    }

    Promise.all(pending.map(p => p.promise)).then(results => {
      pending.forEach((p, i) => { p.entry.data = results[i] })
      fire()
    }, err => {
      setTimeout(() => { throw err }, 0)
    })
  }
}

export async function loadPack(root) {
  if (!root.endsWith("/")) root += "/"

  const manifest = await importDefault(root, "manifest")
  if (!validateSchema({ data: "string", resourcemap: "string!optional" }, manifest)) {
    console.error(`loader: manifest.js of ${root} is malformed.`)
  }

  const datalist = await importDefault(root, manifest.data)

  const jobs = []
  for (const key in datalist) {
    const items = Array.isArray(datalist[key]) ? datalist[key] : [datalist[key]]
    for (let j = 0; j < items.length; j++) {
      const obj = items[j]
      if (obj?.file && isLoadable(key, obj)) {
        jobs.push({ key, idx: Array.isArray(datalist[key]) ? j : null, promise: importDefault(root, obj.file) })
      }
    }
  }

  await Promise.all(jobs.map(j => j.promise))
  const gameData = coreUtil.extend({}, datalist)
  for (const job of jobs) {
    const data = await job.promise
    if (job.idx !== null) gameData[job.key][job.idx].data = data
    else gameData[job.key].data = data
  }

  for (const key in datalist) {
    const items = Array.isArray(datalist[key]) ? datalist[key] : [datalist[key]]
    for (let j = 0; j < items.length; j++) {
      if (items[j]?.file && !isLoadable(key, items[j])) {
        const target = Array.isArray(gameData[key]) ? gameData[key][j] : gameData[key]
        target.data = "lazy"
      }
    }
  }

  const content = { data: gameData }

  if (typeof loaderConfig.lazyload === "function") {
    content.data.load = buildLazyLoader(content, root)
  }

  if (manifest.resourcemap) {
    content.resourcemap = await importDefault(root, manifest.resourcemap)
  }

  if (!validateSchema({ data: "object", resourcemap: "object!optional" }, content)) {
    throw new Error(`loader: content for ${root} failed schema validation`)
  }

  return content
}

export default { loadPack }
