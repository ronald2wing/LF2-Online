// effects-pool.js — object pool manager for game effects
//
// Two pool strategies: circular (fixed-lifetime, oldest-dies-first) and linear
// (variable-lifetime, explicit target on die). Both batch-expand on overflow.

class CircularPool {
  constructor(config) {
    this.pool = []
    this.S = 0
    this.E = 0
    this.full = false
    this.config = config
    this.livecount = 0
    for (let i = 0; i < config.init_size; i++) {
      this.pool[i] = config.construct()
      this.pool[i].parent = this
    }
  }

  create(/* ...args */) {
    if (this.full) {
      if (this.pool.length + this.config.batch_size <= this.config.max_size) {
        const spliceArgs = [this.E, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          spliceArgs[i + 2] = this.config.construct()
          spliceArgs[i + 2].parent = this
        }
        this.pool.splice.apply(this.pool, spliceArgs)
        if (this.S !== 0) this.S += this.config.batch_size
        this.full = false
      } else {
        return false
      }
    }

    if (this.E < this.pool.length) this.E++
    else this.E = 1

    if (this.E === this.S || (this.S === 0 && this.E === this.pool.length))
      this.full = true

    if (this.pool[this.E - 1].born)
      this.pool[this.E - 1].born.apply(this.pool[this.E - 1], arguments)

    this.livecount++
    return this.pool[this.E - 1]
  }

  die(target, ...args) {
    if (this.livecount > 0) {
      const oldStart = this.S
      if (this.pool[this.S].die)
        this.pool[this.S].die.apply(this.pool[this.S], args)
      if (this.S < this.pool.length - 1) this.S++
      else this.S = 0
      this.full = false
      this.livecount--
      return this.pool[oldStart]
    } else {
      console.warn('die too much!')
    }
  }

  forEach(fn) {
    if (this.livecount === 0) return
    if (this.S < this.E) {
      for (let i = this.S; i < this.E; i++)
        if (fn(this.pool[i]) === 'break') break
    } else {
      for (let j = this.S; j < this.pool.length; j++)
        if (fn(this.pool[j]) === 'break') return
      for (let i = 0; i < this.E; i++)
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

  create(/* ...args */) {
    let freeslot = this.alive.indexOf(false)
    if (freeslot === -1) {
      if (this.pool.length + this.config.batch_size <= this.config.max_size) {
        const poolArgs = [this.pool.length, 0]
        const aliveArgs = [this.pool.length, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          poolArgs[i + 2] = this.config.construct()
          poolArgs[i + 2].parent = this
          aliveArgs[i + 2] = false
        }
        this.pool.splice.apply(this.pool, poolArgs)
        this.alive.splice.apply(this.alive, aliveArgs)
      } else {
        return false
      }
    }
    freeslot = this.alive.indexOf(false)
    const element = this.pool[freeslot]
    this.alive[freeslot] = true
    this.livecount++
    element.born.apply(element, arguments)
    return element
  }

  die(target, ...args) {
    const index = this.pool.indexOf(target)
    if (index === -1 || !this.alive[index]) {
      console.warn('effects_pool: wrong target passed to die()')
      return false
    }
    target.die.apply(target, args)
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
    if (effect[methodName]) effect[methodName].apply(effect, args)
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
