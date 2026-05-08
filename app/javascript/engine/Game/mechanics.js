/*
 * mechanics
 *
 * mechanical properties that all living objects should have
 */

import Global from "engine/Game/global"

const Gameplay = Global.gameplay

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
    if (!filter && obj.length === 2) {
      return ([this.volume(obj[0], offset),
      this.volume(obj[1], offset)
      ])
    } else if (!filter && obj.length === 3) {
      return ([this.volume(obj[0], offset),
      this.volume(obj[1], offset),
      this.volume(obj[2], offset)
      ])
    } else {
      const B = []
      for (const i in obj) {
        if (!filter || filter(obj[i])) { B.push(this.volume(obj[i], offset)) }
      }
      return B
    }
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

  body_body(V) {
  const O = this.frame.D.bdy
  const ps = this.ps
  const sp = this.sp

  if (!O) {
    let B = this.vol_body[0]
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
  } else if (O instanceof Array) {
    for (let i = 0; i < O.length; i++) {
      let B = this.vol_body[i]
      let vx = O[i].x
      if (ps.dir === 'left') {
        vx = sp.w - O[i].x - O[i].w
      }
      if (V) {
        B.x = ps.sx + V.x
        B.y = ps.sy + V.y
        B.z = ps.sz + V.z
      } else {
        B.x = ps.sx
        B.y = ps.sy
        B.z = ps.sz
      }
      B.vx = vx
      B.vy = O[i].y
      B.w = O[i].w
      B.h = O[i].h
      B.zwidth = O[i].zwidth ? O[i].zwidth : Gameplay.default.itr.zwidth
      B.data = O[i]
    }
    this.vol_body.length = O.length
  } else {
    let B = this.vol_body[0]
    let vx = O.x
    if (ps.dir === 'left') { vx = sp.w - O.x - O.w }
    if (V) {
      B.x = ps.sx + V.x
      B.y = ps.sy + V.y
      B.z = ps.sz + V.z
    } else {
      B.x = ps.sx
      B.y = ps.sy
      B.z = ps.sz
    }
    B.vx = vx
    B.vy = O.y
    B.w = O.w
    B.h = O.h
    B.zwidth = O.zwidth ? O.zwidth : Gameplay.default.itr.zwidth
    B.data = O
    this.vol_body.length = 1
  }
  return this.vol_body
}

  volume(O, V) {
  const ps = this.ps
  const sp = this.sp

  if (!O) {
    if (!V) {
      return {
        x: ps.sx,
        y: ps.sy,
        z: ps.sz,
        vx: 0,
        vy: 0,
        w: 0,
        h: 0,
        zwidth: 0,
        data: {}
      }
    } else {
      return {
        x: V.x,
        y: V.y,
        z: V.z,
        vx: 0,
        vy: 0,
        w: 0,
        h: 0,
        zwidth: 0,
        data: {}
      }
    }
  }

  let vx = O.x
  if (ps.dir === 'left') {
    vx = sp.w - O.x - O.w
  }

  if (!V) {
    return {
      x: ps.sx,
      y: ps.sy,
      z: ps.sz,
      vx: vx,
      vy: O.y,
      w: O.w,
      h: O.h,
      zwidth: O.zwidth ? O.zwidth : Gameplay.default.itr.zwidth,
      data: O
    }
  } else {
    return {
      x: ps.sx + V.x,
      y: ps.sy + V.y,
      z: ps.sz + V.z,
      vx: vx,
      vy: O.y,
      w: O.w,
      h: O.h,
      zwidth: O.zwidth ? O.zwidth : Gameplay.default.itr.zwidth,
      data: O
    }
  }
}

  make_point(a, prefix) {
  const ps = this.ps
  const sp = this.sp

  if (a && !prefix) {
    if (ps.dir === 'right') {
      return { x: ps.sx + a.x, y: ps.sy + a.y, z: ps.sz + a.y }
    } else {
      return { x: ps.sx + sp.w - a.x, y: ps.sy + a.y, z: ps.sz + a.y }
    }
  } else if (a && prefix) {
    if (ps.dir === 'right') {
      return { x: ps.sx + a[prefix + 'x'], y: ps.sy + a[prefix + 'y'], z: ps.sz + a[prefix + 'y'] }
    } else {
      return { x: ps.sx + sp.w - a[prefix + 'x'], y: ps.sy + a[prefix + 'y'], z: ps.sz + a[prefix + 'y'] }
    }
  } else {
    console.warn('mechanics: make point failed')
    return { x: ps.sx, y: ps.sy, z: ps.sz }
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
  if (ps.z < this.bg.zboundary[0]) {
    ps.z = this.bg.zboundary[0]
  }
  if (ps.z > this.bg.zboundary[1]) {
    ps.z = this.bg.zboundary[1]
  }

  ps.sx = ps.dir === 'right' ? (ps.x - fD.centerx) : (ps.x + fD.centerx - sp.w)
  ps.sy = y - fD.centery
  ps.sz = z
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
  if (ps.z < this.bg.zboundary[0]) {
    ps.z = this.bg.zboundary[0]
  }
  if (ps.z > this.bg.zboundary[1]) {
    ps.z = this.bg.zboundary[1]
  }

  ps.y += ps.vy

  ps.sx = ps.dir === 'right' ? (ps.x - fD.centerx) : (ps.x + fD.centerx - sp.w)
  ps.sy = ps.y - fD.centery
  ps.sz = ps.z

  if (ps.y > 0) {
    ps.y = 0
    ps.sy = ps.y - fD.centery
  }

  if (!sp) return
  sp.set_x_y(Math.floor(ps.sx), Math.floor(ps.sy + ps.sz))
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
  sp.set_x_y(ps.sx, ps.sy + ps.sz)
  sp.set_z(ps.sz + ps.zz)
}

  speed() {
  const ps = this.ps
  return Math.sqrt(ps.vx * ps.vx + ps.vy * ps.vy)
}

}
