import collision from "engine/core/collision"

export default class Scene {
  constructor() {
    this.live = {}
    this.uid = 0
  }

  add(obj) {
    this.uid += 1
    obj.uid = this.uid
    this.live[obj.uid] = obj
    return obj.uid
  }

  replace(target, replacement) {
    delete this.live[target.uid]
    this.live[target.uid] = replacement
    return target.uid
  }

  remove(obj) {
    const uid = obj.uid
    delete this.live[obj.uid]
    obj.uid = -1
    return uid
  }

  /** Query entities intersecting `volume` (or all if null), excluding `exclude`, matching `where`. */
  query(volume, exclude, where = {}) {
    const result = []
    const [tagName, tagValue] = (where.tag || "body").split(":")
    const volKey = "vol_" + tagName

    for (const entity of Object.values(this.live)) {
      if (this.#isExcluded(entity, exclude)) continue
      if (where.team && entity.team !== where.team) continue
      if (where.not_team && entity.team === where.not_team) continue
      if (where.type && entity.type !== where.type) continue
      if (where.not_type && entity.type === where.not_type) continue
      if (where.filter && !where.filter(entity)) continue

      if (volume === null) {
        result.push(entity)
      } else if (entity[volKey]) {
        const volumes = entity[volKey](tagValue)
        // volumes may be a real array or an array-like buffer (vol_body);
        // iterate it safely either way.
        const count = volumes == null ? 0 : volumes.length
        for (let i = 0; i < count; i++) {
          if (this.#intersects(volume, volumes[i])) {
            result.push(entity)
            break
          }
        }
      }
    }

    if (where.sort) {
      if (where.sort === "distance" && !Array.isArray(exclude)) {
        const ref = exclude
        where.sort = (obj) => {
          const dx = obj.ps.x - ref.ps.x
          const dz = obj.ps.z - ref.ps.z
          return Math.sqrt(dx * dx + dz * dz)
        }
      }
      result.sort((a, b) => where.sort(a) - where.sort(b))
    }

    return result
  }

  distance(a, b) {
    const dx = (a.x + a.centerx) - (b.x + b.centerx)
    const dy = a.y - b.y
    const dz = (a.z + a.centery) - (b.z + b.centery)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  #intersects(a, b) {
    const aLeft   = a.x + a.vx
    const aTop    = a.y + a.vy
    const aRight  = a.x + a.vx + a.w
    const aBottom = a.y + a.vy + a.h
    const bLeft   = b.x + b.vx
    const bTop    = b.y + b.vy
    const bRight  = b.x + b.vx + b.w
    const bBottom = b.y + b.vy + b.h

    return (
      collision.rect_flat(aLeft, aTop, aRight, aBottom, bLeft, bTop, bRight, bBottom) &&
      collision.rect_flat(a.z - a.zwidth, 0, a.z + a.zwidth, 1, b.z - b.zwidth, 0, b.z + b.zwidth, 1)
    )
  }

  #isExcluded(entity, exclude) {
    if (!exclude) return false
    if (Array.isArray(exclude)) return exclude.includes(entity)
    return entity === exclude
  }
}
