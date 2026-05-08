/*
 * loader.js
 *
 * Loads a content package using dynamic ESM imports under an importmap-rails
 * prefix (e.g. "engine/pack/"). The pack manifest references files inside
 * that tree by relative path (e.g. "data/davis.js"). We strip the ".js"
 * suffix, prepend the pack root, and dynamic-import() picks up the pin.
 *
 * Returns:
 *   content.data          — datalist with `file:` entries resolved
 *   content.data.load     — lazy-loader for opted-out files
 *   content.resourcemap   — pack resourcemap, if declared
 * The caller adds content.path (module-id prefix) and content.location
 * (URL prefix for runtime assets).
 */

import loaderConfig from "engine/Game/loader-config"
import coreUtil from "engine/core/util"

async function importDefault(root, file) {
  const name = file || ""
  const module = await import(root + (name.endsWith(".js") ? name.slice(0, -3) : name))
  return module.default ?? module
}

function shouldLoadImmediately(folder, entry) {
  const { lazyload } = loaderConfig
  return typeof lazyload !== "function" || !lazyload(folder, entry)
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

async function resolveEntries(pending) {
  // Publish the batch only after every import succeeds.
  const results = await Promise.all(pending.map(job => job.promise))
  pending.forEach((job, index) => { job.entry.data = results[index] })
}

function buildLazyLoader(content, root) {
  return function lazyLoad(sets, ready) {
    const pending = []

    for (const folder in sets) {
      const objects = content.data[folder]
      for (const id of sets[folder]) {
        const entry = objects.find(object => object.id === id)
        if (entry?.file && entry.data === "lazy") {
          pending.push({ entry, promise: importDefault(root, entry.file) })
        }
      }
    }

    const notifyReady = () => {
      try { ready() }
      catch (e) { setTimeout(() => { throw e }, 0) }
    }

    if (pending.length === 0) {
      setTimeout(notifyReady, 1)
      return
    }

    resolveEntries(pending).then(notifyReady, error => {
      setTimeout(() => { throw error }, 0)
    })
  }
}

export async function loadPack(root) {
  if (!root.endsWith("/")) root += "/"

  const manifest = await importDefault(root, "manifest")
  if (!validateSchema({ data: "string", resourcemap: "string!optional" }, manifest)) {
    throw new Error(`loader: manifest.js of ${root} is malformed — expected a string "data" file path ("resourcemap" must be a string when present)`)
  }

  const catalog = await importDefault(root, manifest.data)

  const gameData = coreUtil.extend({}, catalog)
  const pending = []
  for (const folder in catalog) {
    const isList = Array.isArray(catalog[folder])
    const entries = isList ? catalog[folder] : [catalog[folder]]
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
      if (!entry?.file) continue
      const target = isList ? gameData[folder][index] : gameData[folder]
      if (shouldLoadImmediately(folder, entry)) {
        pending.push({ entry: target, promise: importDefault(root, entry.file) })
      } else {
        target.data = "lazy"
      }
    }
  }

  await resolveEntries(pending)

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
