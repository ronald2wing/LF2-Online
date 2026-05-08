// effects-pool.js — object pool manager for game effects
//
// Two pool strategies: circular (fixed-lifetime, oldest-dies-first) and linear
// (variable-lifetime, explicit target on die). Both batch-expand on overflow.

class CircularPool {
  constructor(config) {
    this.pool = []
    // The live range is [start, end), wrapping when start >= end.
    this.start = 0
    this.end = 0
    this.full = false
    this.config = config
    this.livecount = 0
    for (let i = 0; i < config.init_size; i++) {
      this.pool[i] = config.construct()
      this.pool[i].parent = this
    }
  }

  create(...args) {
    if (this.full) {
      if (this.pool.length + this.config.batch_size <= this.config.max_size) {
        const spliceArgs = [this.end, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          spliceArgs[i + 2] = this.config.construct()
          spliceArgs[i + 2].parent = this
        }
        this.pool.splice(...spliceArgs)
        if (this.start !== 0) this.start += this.config.batch_size
        this.full = false
      } else {
        return false
      }
    }

    if (this.end < this.pool.length) this.end++
    else this.end = 1

    if (this.end === this.start || (this.start === 0 && this.end === this.pool.length))
      this.full = true

    if (this.pool[this.end - 1].born)
      this.pool[this.end - 1].born(...args)

    this.livecount++
    return this.pool[this.end - 1]
  }

  die(target, ...args) {
    if (this.livecount > 0) {
      const oldStart = this.start
      if (this.pool[this.start].die)
        this.pool[this.start].die(...args)
      if (this.start < this.pool.length - 1) this.start++
      else this.start = 0
      this.full = false
      this.livecount--
      return this.pool[oldStart]
    } else {
      console.warn('effects-pool: cannot release an object from an empty pool')
    }
  }

  forEach(fn) {
    if (this.livecount === 0) return
    if (this.start < this.end) {
      for (let i = this.start; i < this.end; i++)
        if (fn(this.pool[i]) === 'break') break
    } else {
      for (let j = this.start; j < this.pool.length; j++)
        if (fn(this.pool[j]) === 'break') return
      for (let i = 0; i < this.end; i++)
        if (fn(this.pool[i]) === 'break') return
    }
  }
}

class LinearPool {
  constructor(config) {
    this.pool = []
    this.alive = []
    this.config = config
    this.livecount = 0
    for (let i = 0; i < config.init_size; i++) {
      this.pool[i] = config.construct()
      this.pool[i].parent = this
      this.alive[i] = false
    }
  }

  create(...args) {
    let freeSlot = this.alive.indexOf(false)
    if (freeSlot === -1) {
      if (this.pool.length + this.config.batch_size <= this.config.max_size) {
        const poolArgs = [this.pool.length, 0]
        const aliveArgs = [this.pool.length, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          poolArgs[i + 2] = this.config.construct()
          poolArgs[i + 2].parent = this
          aliveArgs[i + 2] = false
        }
        this.pool.splice(...poolArgs)
        this.alive.splice(...aliveArgs)
      } else {
        return false
      }
      freeSlot = this.alive.indexOf(false)
    }
    const element = this.pool[freeSlot]
    this.alive[freeSlot] = true
    this.livecount++
    element.born(...args)
    return element
  }

  die(target, ...args) {
    const index = this.pool.indexOf(target)
    if (index === -1 || !this.alive[index]) {
      console.warn('effects_pool: wrong target passed to die()')
      return false
    }
    target.die(...args)
    this.alive[index] = false
    this.livecount--
    return target
  }

  forEach(fn) {
    if (this.livecount === 0) return
    for (let i = 0; i < this.pool.length; i++)
      if (this.alive[i] && fn(this.pool[i]) === 'break') break
  }
}

// Shared by both pool strategies: invoke a method on every live element. Each
// strategy walks its own live range via forEach.
function callEach(methodName, ...args) {
  this.forEach(effect => {
    if (effect[methodName]) effect[methodName](...args)
  })
}

CircularPool.prototype.callEach = callEach
LinearPool.prototype.callEach = callEach

export default class EffectsPool {
  constructor(config) {
    if (config.circular) return new CircularPool(config)
    return new LinearPool(config)
  }
}
