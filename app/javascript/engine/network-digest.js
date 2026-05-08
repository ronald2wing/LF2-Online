// Pure digest comparison for lockstep netcode verification.
//
// Extracted from network.js so the comparator is unit-testable in Node
// without pulling in the DOM-dependent engine. This module must load in
// isolation: no imports from engine modules.

// ── deepEqual ──────────────────────────────────────────────────────────────

// Recursive deep equality for JSON-ish values. NaN equals NaN (via Object.is),
// since digests can carry NaN coordinates. Undefined and missing properties
// are treated as plain distinct values.
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== "object" || typeof b !== "object") return false

  const aIsArray = Array.isArray(a)
  if (aIsArray !== Array.isArray(b)) return false

  if (aIsArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  return true
}

// ── compareDigests ─────────────────────────────────────────────────────────

// Compares two frame digests and returns a descriptor of the first mismatch,
// or null when equal.
export function compareDigests(a, b) {
  if (a == null || b == null) {
    if (a == null && b == null) return null
    return { object: "digest", field: "presence", mine: a ?? null, theirs: b ?? null }
  }

  if (a.t !== b.t) {
    return { object: "time", field: "t", mine: a.t, theirs: b.t }
  }

  for (const field of ["rng", "fx"]) {
    const mismatch = compareArray(a[field], b[field], field)
    if (mismatch) return mismatch
  }

  const aLive = a.live || {}
  const bLive = b.live || {}
  const ids = new Set([...Object.keys(aLive), ...Object.keys(bLive)])
  for (const id of ids) {
    const mine = aLive[id] ?? null
    const theirs = bLive[id] ?? null
    if (mine === null || theirs === null) {
      return { object: id, field: "presence", mine, theirs }
    }
    const mismatch = compareArray(mine, theirs, id)
    if (mismatch) return mismatch
  }

  return null
}

// Element-wise comparison of two parallel value arrays. Field names are not
// transmitted, so indices stand in for names: field is "i" + index.
function compareArray(mine, theirs, object) {
  if (mine == null || theirs == null) {
    if (mine == null && theirs == null) return null
    return { object, field: "presence", mine: mine ?? null, theirs: theirs ?? null }
  }
  const length = Math.max(mine.length, theirs.length)
  for (let i = 0; i < length; i++) {
    if (!deepEqual(mine[i], theirs[i])) {
      return { object, field: "i" + i, mine: mine[i], theirs: theirs[i] }
    }
  }
  return null
}
