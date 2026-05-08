// Pure data utilities. No DOM dependency.

const Util = {

  // -- Array helpers --

  /** Wrap non-array in array; return empty for falsy. */
  arrayWrap(target) {
    if (target) {
      return target instanceof Array ? target : [target]
    }
    return []
  },

  // -- Object helpers --

  /** Deep-merge obj2 into obj1 (mutates obj1). */
  extend(obj1, obj2) {
    for (const key in obj2) {
      if (typeof obj2[key] === "object") {
        obj1[key] = Util.extend(
          obj1[key] ?? (obj2[key] instanceof Array ? [] : {}),
          obj2[key],
        )
      } else {
        obj1[key] = obj2[key]
      }
    }
    return obj1
  },

  /** Extract named properties from array of objects into parallel arrays.
   *  [{x:1,y:2}, {x:3,y:4}] with ["x","y"] → {x:[1,3], y:[2,4]}
   */
  extractArray(array, props) {
    const keys = Util.arrayWrap(props)
    const out = {}
    for (const key of keys) out[key] = []

    for (let i = 0; i < array.length; i++) {
      for (const key of keys) {
        out[key].push(array[i]?.[key])
      }
    }
    return out
  },

  /** Group array of objects by a key value. */
  groupBy(array, key) {
    const groups = {}
    for (const item of array) {
      const value = item[key]
      if (value) {
        if (!groups[value]) groups[value] = []
        groups[value].push(item)
      }
    }
    return groups
  },

  /** Call method on each item with extra args. */
  callEach(collection, method, ...args) {
    if (Array.isArray(collection)) {
      for (const item of collection) item[method]?.(...args)
    } else if (collection) {
      for (const key in collection) collection[key][method]?.(...args)
    }
  },

  // -- Predicate / geometry helpers --

  /** True if x is neither null nor undefined. */
  defined(x) {
    return x !== undefined && x !== null
  },

  /** True if x lies within [L, R] (order-agnostic). */
  inbetween(x, L, R) {
    const l = L <= R ? L : R
    const r = L <= R ? R : L
    return x >= l && x <= r
  },

  /** True if (px, py) lies within rect. Accepts either an array [x, y, w, h]
   *  or an object {left, top, right, bottom} (e.g. getBoundingClientRect). */
  pointInRect(px, py, rect) {
    if (Array.isArray(rect)) {
      return Util.inbetween(px, rect[0], rect[0] + rect[2]) &&
        Util.inbetween(py, rect[1], rect[1] + rect[3])
    }
    return Util.inbetween(px, rect.left, rect.right) &&
      Util.inbetween(py, rect.top, rect.bottom)
  },
}

export default Util
