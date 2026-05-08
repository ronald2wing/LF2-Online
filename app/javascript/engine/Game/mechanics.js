/*
 * mechanics
 *
 * mechanical properties that all living objects should have
 */

import Global from "engine/Game/global"

const Gameplay = Global.gameplay

// Amplitude of the depth size cue at the zboundary extremes. The original LF2
// draws objects larger near the camera and smaller farther away, centred on
// 1.0 at mid-depth: depth `z` increases toward the camera (higher z sits lower
// on the ground line), so a 79px sprite draws ~79px at mid-depth, ~91px at the
// near edge, and ~67px at the far edge. The ±15% spread keeps the cue visible
// without exaggerating it.
const DEPTH_AMP = 0.15

// Size factor for an object at depth `z` within `zboundary` ([back, front]).
// Pure rendering concern: it never touches hitboxes, collision, or physics.
export function depth_scale(z, zboundary) {
  const range = zboundary[1] - zboundary[0]
  if (range <= 0) return 1
  const zhalf = range / 2
  const zmid = zboundary[0] + zhalf
  return 1 + DEPTH_AMP * (z - zmid) / zhalf
}

export default class Mech {
  constructor(parent) {
    const spec = parent.match.spec
    if (spec[parent.id] && spec[parent.id].mass !== undefined && spec[parent.id].mass !== null) {
      this.mass = spec[parent.id].mass
    } else {
      this.mass = Global.gameplay.default.mechanics.mass
    }

    this.sp = parent.sp
    this.frame = parent.frame
    this.parent = parent
    this.vol_body = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, length: 0, empty_data: {}, max: 6 }
    this.vol_itr = { length: 0 }
    this.bg = parent.bg
    this.sha = parent.shadow
  }

  body(obj, filter, offset) {
    if (!obj) {
      obj = this.frame.D.bdy
    }
    if (obj === this.frame.D.bdy && this.parent.effect.super) {
      return this.body_empty()
    }
    if (obj === this.frame.D.bdy && !filter && (!(obj instanceof Array) || obj.length <= this.vol_body.max)) {
      return this.body_body(offset)
    }

    if (obj instanceof Array) {
      const B = []
      for (const i in obj) {
        if (!filter || filter(obj[i])) { B.push(this.volume(obj[i], offset)) }
      }
      return B
    } else {
      if (!filter || filter(obj)) {
        return [this.volume(obj, offset)]
      } else {
        return []
      }
    }
  }

  body_empty() {
    this.vol_body.length = 0
    return this.vol_body
  }

  // Builds the itr volumes of `kind` into the reusable vol_itr buffer instead
  // of allocating a fresh array + object per attack box every frame. Mirrors
  // the filtered path of body(itr, filter), which only vol_itr ever takes.
  body_itr(kind) {
    const O = this.frame.D.itr
    const buf = this.vol_itr
    if (O instanceof Array) {
      let n = 0
      for (const i in O) {
        const obj = O[i]
        if (obj.kind == kind) {
          const B = buf[n] || (buf[n] = {})
          this.volume_into(B, obj)
          n++
        }
      }
      buf.length = n
      return buf
    }
    if (O.kind == kind) {
      const B = buf[0] || (buf[0] = {})
      this.volume_into(B, O)
      buf.length = 1
      return buf
    }
    buf.length = 0
    return buf
  }

  body_body(V) {
    const O = this.frame.D.bdy
    const ps = this.ps
    const sp = this.sp

    if (!O) {
      const B = this.vol_body[0]
      if (V) {
        B.x = V.x
        B.y = V.y
        B.z = V.z
      } else {
        B.x = ps.sx
        B.y = ps.sy
        B.z = ps.sz
      }
      B.vx = 0
      B.vy = 0
      B.w = 0
      B.h = 0
      B.zwidth = 0
      B.data = this.vol_body.empty_data
      this.vol_body.length = 1
      return this.vol_body
    }

    // A single bdy rect is just a one-element list; both fill the same buffer.
    const rects = O instanceof Array ? O : [O]
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
      const B = this.vol_body[i]
      if (V) {
        B.x = ps.sx + V.x
        B.y = ps.sy + V.y
        B.z = ps.sz + V.z
      } else {
        B.x = ps.sx
        B.y = ps.sy
        B.z = ps.sz
      }
      B.vx = ps.dir === 'left' ? sp.w - rect.x - rect.w : rect.x
      B.vy = rect.y
      B.w = rect.w
      B.h = rect.h
      B.zwidth = rect.zwidth ? rect.zwidth : Gameplay.default.itr.zwidth
      B.data = rect
    }
    this.vol_body.length = rects.length
    return this.vol_body
  }

  volume(rect, offset) {
    const ps = this.ps

    if (!rect) {
      // Degenerate point volume. An offset is taken as an absolute position
      // (unlike the rect case below, where it is relative); without one the
      // volume sits on the character's screen position.
      const x = offset ? offset.x : ps.sx
      const y = offset ? offset.y : ps.sy
      const z = offset ? offset.z : ps.sz
      return {
        x: x,
        y: y,
        z: z,
        vx: 0,
        vy: 0,
        w: 0,
        h: 0,
        zwidth: 0,
        data: {}
      }
    }

    const B = {}
    this.volume_into(B, rect)
    if (offset) {
      B.x += offset.x
      B.y += offset.y
      B.z += offset.z
    }
    return B
  }

  volume_into(B, rect) {
    const ps = this.ps
    const sp = this.sp

    let vx = rect.x
    if (ps.dir === 'left') {
      vx = sp.w - rect.x - rect.w
    }

    B.x = ps.sx
    B.y = ps.sy
    B.z = ps.sz
    B.vx = vx
    B.vy = rect.y
    B.w = rect.w
    B.h = rect.h
    B.zwidth = rect.zwidth ? rect.zwidth : Gameplay.default.itr.zwidth
    B.data = rect
  }

  make_point(point, prefix) {
    const ps = this.ps
    const sp = this.sp

    if (!point) {
      console.warn('mechanics: make point failed')
      return { x: ps.sx, y: ps.sy, z: ps.sz }
    }
    const ox = prefix ? point[prefix + 'x'] : point.x
    const oy = prefix ? point[prefix + 'y'] : point.y
    return {
      x: ps.dir === 'right' ? ps.sx + ox : ps.sx + sp.w - ox,
      y: ps.sy + oy,
      z: ps.sz + oy
    }
  }

  coincideXY(a, b) {
    const ps = this.ps
    const sp = this.sp
    const fD = this.frame.D

    const vx = a.x - b.x
    const vy = a.y - b.y
    ps.x += vx
    ps.y += vy
    ps.sx = ps.dir === 'right' ? (ps.x - fD.centerx) : (ps.x + fD.centerx - sp.w)
    ps.sy = ps.y - fD.centery
  }

  create_metric() {
    this.ps = {
      sx: 0,
      sy: 0,
      sz: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      zz: 0,
      dir: 'right',
      fric: 1
    }
    return this.ps
  }

  set_pos(x, y, z) {
    const ps = this.ps
    const sp = this.sp
    const fD = this.frame.D

    ps.x = x; ps.y = y; ps.z = z
    this.clamp_z()

    ps.sx = ps.dir === 'right' ? (ps.x - fD.centerx) : (ps.x + fD.centerx - sp.w)
    ps.sy = y - fD.centery
    ps.sz = z
  }

  // LF2 keeps every entity inside the stage's z (depth) band.
  clamp_z() {
    const ps = this.ps
    const [near, far] = this.bg.zboundary
    if (ps.z < near) ps.z = near
    else if (ps.z > far) ps.z = far
  }

  dynamics() {
    const ps = this.ps
    const sp = this.sp
    const fD = this.frame.D

    if (!this.blocking_xz()) {
      ps.x += ps.vx
      ps.z += ps.vz
    } else {
      ps.x += ps.vx * 0.1
      ps.z += ps.vz * 0.1
    }
    if (this.floor_xbound) {
      if (ps.x < 0) {
        ps.x = 0
      }
      if (ps.x > this.bg.width) {
        ps.x = this.bg.width
      }
    }
    this.clamp_z()

    ps.y += ps.vy

    ps.sx = ps.dir === 'right' ? (ps.x - fD.centerx) : (ps.x + fD.centerx - sp.w)
    ps.sy = ps.y - fD.centery
    ps.sz = ps.z

    if (ps.y > 0) {
      ps.y = 0
      ps.sy = ps.y - fD.centery
    }

    if (!sp) return
    const s = depth_scale(ps.sz, this.bg.zboundary)
    sp.set_scale(s)
    sp.set_x_y(
      Math.floor(ps.sx * s + ps.x * (1 - s)),
      Math.floor((ps.sy + ps.sz) * s + (ps.y + ps.sz) * (1 - s))
    )
    sp.set_z(Math.floor(ps.sz + ps.zz))
    if (this.sha) {
      this.sha.set_x_y(Math.floor(ps.x - this.bg.shadow.x), Math.floor(ps.z - this.bg.shadow.y))
      this.sha.set_z(Math.floor(ps.sz - 1))
    }

    if (ps.y === 0 && this.mass > 0)
    {
      if (ps.vx) { ps.vx += (ps.vx > 0 ? -1 : 1) * ps.fric }
      if (ps.vz) { ps.vz += (ps.vz > 0 ? -1 : 1) * ps.fric }
      if (ps.vx !== 0 && ps.vx > -Gameplay.min_speed && ps.vx < Gameplay.min_speed) { ps.vx = 0 }
      if (ps.vz !== 0 && ps.vz > -Gameplay.min_speed && ps.vz < Gameplay.min_speed) { ps.vz = 0 }
    }

    if (ps.y < 0 && this.parent.type !== 'specialattack') {
      ps.vy += Gameplay.gravity
    }
  }

  unit_friction() {
    const ps = this.ps
    if (ps.y === 0)
    {
      if (ps.vx) { ps.vx += (ps.vx > 0 ? -1 : 1) }
      if (ps.vz) { ps.vz += (ps.vz > 0 ? -1 : 1) }
    }
  }

  linear_friction(x, z) {
    const ps = this.ps
    if (x && ps.vx) { ps.vx += ps.vx > 0 ? -x : x }
    if (z && ps.vz) { ps.vz += ps.vz > 0 ? -z : z }
  }

  blocking_xz() {
    const offset = {
      x: this.ps.vx,
      y: 0,
      z: this.ps.vz
    }

    if (this.parent.type !== 'character') {
      return false
    }

    const body = this.body(null, null, offset)
    for (let i = 0; i < body.length; i++) {
      body[i].zwidth = 0
      const result = this.parent.scene.query(body[i], this.parent, { tag: 'itr:14' })
      if (result.length > 0) {
        return true
      }
    }
  }

  project() {
    const ps = this.ps
    const sp = this.sp
    if (!sp || !sp.sp) return
    const s = depth_scale(ps.sz, this.bg.zboundary)
    sp.set_scale(s)
    sp.set_x_y(ps.sx * s + ps.x * (1 - s), (ps.sy + ps.sz) * s + (ps.y + ps.sz) * (1 - s))
    sp.set_z(ps.sz + ps.zz)
  }

  speed() {
    const ps = this.ps
    return Math.sqrt(ps.vx * ps.vx + ps.vy * ps.vy)
  }

}
