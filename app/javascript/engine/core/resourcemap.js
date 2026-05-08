// ResourceMap — maps canonical resource names (short, readable) to actual URLs (long, ugly)
import coreUtil from "engine/core/util"

export default class ResourceMap {
  constructor(map) {
    this.map = coreUtil.arrayWrap(map)
    for (let i = 0; i < this.map.length; i++) { this.map[i] = new Submap(this.map[i]) }
  }

  update_condition() {
    coreUtil.callEach(this.map, 'update_condition')
  }

  get(resourceName) {
    let url
    for (let i = 0; i < this.map.length; i++) {
      url = this.map[i].get(resourceName)
      if (url) { break }
    }
    return url || resourceName
  }

  fallback(resourceName, level) {
    level += 1
    let candidate, levelAccum = 0
    for (let i = 0; i < this.map.length; i++) {
      candidate = this.map[i].fallback(resourceName, level - levelAccum)
      if (candidate) {
        levelAccum += candidate.l
        if (levelAccum === level) { return candidate.url }
      }
    }
    return undefined
  }
}

class Submap {
  constructor(map) {
    this.map = map
    this.update_condition()
  }

  update_condition() {
    if (this.map.condition) this.enable = this.map.condition() || false
    else this.enable = true
    if (typeof this.map.resource !== 'object' && typeof this.map.get !== 'function')
      this.enable = false
  }

  get(resourceName) {
    if (this.enable) {
      if (this.map.resource && this.map.resource[resourceName]) return this.map.resource[resourceName]
      const url = this.map.get && this.map.get(resourceName)
      if (url) return url
    }
    return null
  }

  fallback(resourceName, level) {
    if (this.enable) {
      if (this.map.resource && this.map.resource[resourceName] && level === 1) {
        return {
          l: 1,
          url: this.map.resource[resourceName]
        }
      } else if (level === 2) {
        const url = this.map.get && this.map.get(resourceName)
        if (url) {
          return {
            l: 2,
            url: url
          }
        }
      }
    }
    return null
  }
}
