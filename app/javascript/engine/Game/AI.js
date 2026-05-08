import coreUtil from "engine/core/util"

class AIInterface {
  constructor(self) { this.self = self }

  facing() { return this.self.ps.dir === "left" }

  type() {
    switch (this.self.type) {
      case "character":     return 0
      case "lightweapon":   return 1
      case "heavyweapon":   return 2
      case "specialattack": return 3
      case "baseball":      return 4
      case "criminal":      return 5
      case "drink":         return 6
      default:              return 0
    }
  }

  weaponType() {
    if (this.self.hold.obj) {
      switch (this.self.hold.obj.type) {
        case "lightweapon":
          return this.self.getProperty(this.self.hold.obj.id, "stand_throw") ? 101 : 1
        case "heavyweapon":
          return 2
        case "character":
          return -1 * this.self.AI.type()
      }
    }
    return 0
  }

  weaponHeld() { return this.self.hold.obj ? this.self.hold.obj.uid : -1 }

  weaponHolder() {
    if (this.self.hold?.obj) {
      switch (this.self.AI.type()) {
        case 1: case 2: case 4: case 6:
          return this.self.hold.obj.uid
      }
    }
    return undefined
  }

  blink() {
    return this.self.effect.blink ? Math.round(this.self.effect.timeout / 2) : 0
  }

  shake() {
    if (this.self.effect.oscillate) {
      return this.self.effect.timeout * (this.self.effect.dvx || this.self.effect.dvy ? 1 : -1)
    }
    return 0
  }

  catchTimer() {
    if (this.self.catching && this.self.state() === 9) {
      return this.self.statemem.counter * 6
    }
    return 0
  }

  seqcheck(qe) {
    if (!this.self.combodec) return 0
    const seq = this.self.combodec.seq
    if (seq.length < 1 || qe.length < 1) return 0
    if (seq[seq.length - 1] === qe[0]) return 1
    if (seq.length < 2 || qe.length < 2) return 0
    if (seq[seq.length - 2] === qe[0] && seq[seq.length - 1] === qe[1]) return 2
    if (seq.length < 3 || qe.length < 3) return 0
    if (seq[seq.length - 3] === qe[0] && seq[seq.length - 2] === qe[1] && seq[seq.length - 1] === qe[2]) return 3
    return 0
  }

  frame1() { return this.self.frame.N }

  frame(N) {
    const tags = { bdy: "make_array", itr: "make_array", wpoint: "object" }
    if (!this.cache) this.cache = { O: {} }
    if (this.cache.N === N) return this.cache.O

    this.cache.N = N
    const O = this.cache.O = {}
    if (this.self.data.frame[N]) {
      for (const key in this.self.data.frame[N]) {
        if (typeof this.self.data.frame[N][key] === "object") {
          if (tags[key] === "make_array") {
            const arr = coreUtil.arrayWrap(this.self.data.frame[N][key])
            O[key + "_count"] = arr.length
            O[key + "s"] = arr
          } else if (tags[key] === "object") {
            O[key] = this.self.data.frame[N][key]
          }
        } else {
          O[key] = this.self.data.frame[N][key]
        }
      }
    } else {
      for (const t in tags) {
        if (tags[t] === "make_array") O[t + "_count"] = 0
      }
    }
    return O
  }
}

class AIController {
  type = "AIcontroller"

  constructor() {
    this.state = {}
    this.child = []
    this.sync = true
    this.buf = []
  }

  key(key, down) {
    if (this.sync) {
      this.buf.push([key, down])
    } else {
      if (this.child) this.child.forEach(c => c.key(key, down))
      this.state[key] = down
    }
  }

  keypress(key, x, y) {
    const hold = !!this.state[key]
    if ((x === undefined && y === undefined) || (x === 1 && y === 0)) {
      if (hold) this.key(key, 0)
      this.key(key, 1)
      this.key(key, 0)
    } else if (x === 1 && y === 1) {
      if (!hold) this.key(key, 1)
    } else if (x === 0 && y === 0) {
      if (hold) this.key(key, 0)
    }
  }

  keyseq(seq) {
    for (const s of seq) this.keypress(s)
  }

  clearStates() {
    for (const key in this.state) this.state[key] = 0
  }

  fetch() {
    for (const [key, down] of this.buf) {
      if (this.child) this.child.forEach(c => c.key(key, down))
      this.state[key] = down
    }
    this.buf.length = 0
  }

  flush() { this.buf.length = 0 }
}

export default {
  interface: AIInterface,
  controller: AIController
}
