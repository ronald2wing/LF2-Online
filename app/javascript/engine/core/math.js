/**
 * math
 * math related functions for the LF2 fighting game engine
 */
const math = {
  inbetween: function (x, L, R) {
    let l, r
    if (L <= R) {
      l = L
      r = R
    } else {
      l = R
      r = L
    }
    return x >= l && x <= r
  },

  round_d2: function (I) {
    return Math.round(I * 100) / 100
  },

  negligible: function (M) {
    return M > -0.00000001 && M < 0.00000001
  },

  bezier2: function (A, C, B, steps) {
    const curve = []
    for (let i = 0; i < steps; i++) {
      curve.push(math.bezier2_step(A, C, B, i, steps))
    }
    curve.push(B)
    return curve
  },

  bezier2_step: function (A, C, B, i, steps) {
    const P = { x: 0, y: 0 }
    P.x = getstep(getstep(A.x, C.x, i, steps), getstep(C.x, B.x, i, steps), i, steps)
    P.y = getstep(getstep(A.y, C.y, i, steps), getstep(C.y, B.y, i, steps), i, steps)
    return P

    function getstep(x1, x2, stepcount, numofsteps) {
      return ((numofsteps - stepcount) * x1 + stepcount * x2) / numofsteps
    }
  },

  add: function (A, B) {
    return { x: A.x + B.x, y: A.y + B.y }
  },

  sub: function (A, B) {
    return { x: A.x - B.x, y: A.y - B.y }
  },

  scale: function (A, t) {
    return { x: A.x * t, y: A.y * t }
  },

  length: function (A) {
    return Math.sqrt(A.x * A.x + A.y * A.y)
  },

  distance: function (p1, p2) {
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y))
  },

  negative: function (A) {
    return { x: -A.x, y: -A.y }
  },

  normalize: function (A) {
    return math.scale(A, 1 / math.length(A))
  },

  perpendicular: function (A) {
    return { x: -A.y, y: A.x }
  },

  signed_area: function (p1, p2, p3) {
    const D = (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
    return D
  },

  intersect: function (P1, P2, P3, P4) {
    let mua, mub
    let denom, numera, numerb

    denom = (P4.y - P3.y) * (P2.x - P1.x) - (P4.x - P3.x) * (P2.y - P1.y)
    numera = (P4.x - P3.x) * (P1.y - P3.y) - (P4.y - P3.y) * (P1.x - P3.x)
    numerb = (P2.x - P1.x) * (P1.y - P3.y) - (P2.y - P1.y) * (P1.x - P3.x)

    if (math.negligible(numera) && math.negligible(numerb) && math.negligible(denom)) {
      return {
        x: (P1.x + P2.x) * 0.5,
        y: (P1.y + P2.y) * 0.5
      }
    }

    if (math.negligible(denom)) {
      return { x: 0, y: 0 }
    }

    mua = numera / denom
    mub = numerb / denom

    return {
      x: P1.x + mua * (P2.x - P1.x),
      y: P1.y + mua * (P2.y - P1.y)
    }
  }
}

export default math
