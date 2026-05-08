// Rectangle overlap tests for the LF2 engine.
//
// The original F.LF collision library ported a broad set of geometry tests
// (rect/tri/circle/line), but the engine only ever uses the flat rectangle
// overlap check for entity body/attack volumes. The unused tests (and the
// core/math module they were the sole consumer of) were removed.

export default {
  // Rectangle-rectangle overlap from pre-flattened coordinates (no object
  // allocation on the per-frame hot path). Returns true if the two
  // axis-aligned boxes overlap.
  rect_flat: function (rect1_left, rect1_top, rect1_right, rect1_bottom,
    rect2_left, rect2_top, rect2_right, rect2_bottom) {
    if (rect1_bottom < rect2_top) return false
    if (rect1_top > rect2_bottom) return false
    if (rect1_right < rect2_left) return false
    if (rect1_left > rect2_right) return false

    return true
  },
}
