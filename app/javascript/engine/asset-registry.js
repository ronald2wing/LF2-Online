// Maps logical pack asset names (e.g. "UI/frontpage.png") to fingerprinted
// Rails asset URLs (e.g. "/assets/engine/pack/UI/frontpage-<digest>.png").
//
// The Stimulus controller seeds the map from a JSON blob built by the view
// using Rails asset helpers, so we get Propshaft fingerprinting without
// teaching the engine about Rails internals.
//
// If a name isn't in the registry, we fall back to "/assets/engine/pack/<name>"
// (non-fingerprinted). That keeps development URLs working and surfaces
// missing manifest entries as broken-image 404s rather than silent fallbacks
// to the wrong origin.

let registry = {}
let fallbackBase = "/assets/engine/pack/"

export function setAssetRegistry(map, base) {
  registry = map || {}
  if (base) fallbackBase = base.endsWith("/") ? base : base + "/"
}

export function resetAssetRegistry() {
  registry = {}
  fallbackBase = "/assets/engine/pack/"
}

export function resolveAsset(name) {
  if (Object.prototype.hasOwnProperty.call(registry, name)) {
    return registry[name]
  }
  return fallbackBase + name
}
