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
        const args = [this.E, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          args[i + 2] = this.config.construct()
          args[i + 2].parent = this
        }
        this.pool.splice.apply(this.pool, args)
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
      const oldS = this.S
      if (this.pool[this.S].die)
        this.pool[this.S].die.apply(this.pool[this.S], args)
      if (this.S < this.pool.length - 1) this.S++
      else this.S = 0
      this.full = false
      this.livecount--
      return this.pool[oldS]
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

  callEach(methodName, ...args) {
    if (this.pool[0] && this.pool[0][methodName]) {
      this.forEach(ef => ef[methodName].apply(ef, args))
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
        const args1 = [this.pool.length, 0]
        const args2 = [this.pool.length, 0]
        for (let i = 0; i < this.config.batch_size; i++) {
          args1[i + 2] = this.config.construct()
          args1[i + 2].parent = this
          args2[i + 2] = false
        }
        this.pool.splice.apply(this.pool, args1)
        this.alive.splice.apply(this.alive, args2)
        if (this.S !== 0) this.S += this.config.batch_size
      } else {
        return false
      }
    }
    freeslot = this.alive.indexOf(false)
    const baby = this.pool[freeslot]
    this.alive[freeslot] = true
    this.livecount++
    baby.born.apply(baby, arguments)
    return baby
  }

  die(target, ...args) {
    const e = this.pool.indexOf(target)
    if (e === -1 || !this.alive[e]) {
      console.warn('effects_pool: wrong target passed to die()')
      return false
    }
    target.die.apply(target, args)
    this.alive[e] = false
    this.livecount--
    return target
  }

  forEach(fn) {
    if (this.livecount === 0) return
    for (let i = 0; i < this.pool.length; i++)
      if (this.alive[i] && fn(this.pool[i]) === 'break') break
  }

  callEach(methodName, ...args) {
    if (this.livecount === 0) return
    for (let i = 0; i < this.pool.length; i++) {
      if (this.alive[i] && this.pool[i][methodName])
        this.pool[i][methodName].apply(this.pool[i], args)
    }
  }
}

export default class EffectsPool {
  constructor(config) {
    if (config.circular) return new CircularPool(config)
    return new LinearPool(config)
  }
}
