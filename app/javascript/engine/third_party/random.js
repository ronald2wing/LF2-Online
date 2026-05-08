/**
 * Deterministic, seedable random number generator (Marsaglia MWC).
 *
 * Same seed in -> same sequence out. Lifted from jsgamesoup.net, originally
 * adapted from the v8 engine implementation.
 */

function SeedableRandom () {
  /** Get the next random number in [0, 1) for the current sequence. */
  this.next = function next () {
    // Guard against the degenerate (0, 0) state where the MWC step would
    // produce 0 forever. Upstream had this with `==` instead of `=`, so the
    // guard was silently a no-op since the file was written.
    if (this.x === 0) this.x = -1
    if (this.y === 0) this.y = -1

    this.x = this.nextX()
    this.y = this.nextY()
    return ((this.x << 16) + (this.y & 0xFFFF)) / 0xFFFFFFFF + 0.5
  }

  this.nextX = function () {
    return 36969 * (this.x & 0xFFFF) + (this.x >> 16)
  }

  this.nextY = function () {
    return 18273 * (this.y & 0xFFFF) + (this.y >> 16)
  }

  /** Next integer in [a, b). With no args, returns a full uint32. */
  this.nextInt = function nextInt (a, b) {
    if (!b) {
      a = 0
      b = 0xFFFFFFFF
    }
    return Math.floor(this.next() * (b - a)) + a
  }

  /** Re-seed from a single number. */
  this.seed = function (x) {
    this.x = x * 3253
    this.y = this.nextX()
  }

  /** Re-seed from a 2D coordinate. */
  this.seed2d = function (x, y) {
    this.x = x * 2549 + y * 3571
    this.y = y * 2549 + x * 3571
  }

  /** Re-seed from a 3D coordinate. */
  this.seed3d = function (x, y, z) {
    this.x = x * 2549 + y * 3571 + z * 3253
    this.y = x * 3253 + y * 2549 + z * 3571
  }

  /** Seed by current wall-clock; return the seed used. */
  this.seed_bytime = function () {
    const val = Date.now()
    this.seed(val)
    return val
  }
}
export default SeedableRandom

