// Node ESM loader hook: resolves "engine/..." importmap aliases to
// app/javascript/engine/... for unit tests. The browser resolves these via
// importmap-rails; Node has no importmap, so this shims them. Registered by
// loader.mjs (run with `node --import ./test/javascript/loader.mjs --test ...`).
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

// test/javascript/engine-resolve.mjs → repo root is two levels up.
const APP_JS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/javascript",
)

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("engine/")) {
    // importmap pins are always `engine/<path>` → `engine/<path>.js`.
    const target = path.join(APP_JS, specifier + ".js")
    if (existsSync(target)) {
      return { url: pathToFileURL(target).href, shortCircuit: true }
    }
  }
  return nextResolve(specifier, context)
}
