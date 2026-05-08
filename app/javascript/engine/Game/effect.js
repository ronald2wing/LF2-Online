/*
 * effect
 *
 * handle visual effects
 * like blood, fire, etc
 */

import Global from "engine/Game/global"
import Sprite from "engine/Game/sprite"
import effectsPool from "engine/core/effects-pool"
import coreUtil from "engine/core/util"

class EffectSet {
  constructor(config, DATA, ID) {
    DATA = coreUtil.arrayWrap(DATA)
    ID = coreUtil.arrayWrap(ID)
    this.efs = {}
    for (let i = 0; i < DATA.length; i++) {
      this.efs[ID[i]] = new effectsPool({
        circular: true,
        init_size: 5,
        batch_size: 5,
        max_size: 200,
        construct: () => new Effect(config, DATA[i], ID[i])
      })
    }
  }

  destroy() {
    for (const i in this.efs) {
      for (let j = 0; j < this.efs[i].pool.length; j++) {
        this.efs[i].pool[j].destroy()
      }
    }
  }

  create(id, A, B, C, D) {
    if (this.efs[id]) {
      this.efs[id].create(A, B, C, D)
    } else {
      console.error('no such effect id ' + id)
    }
  }

  TU() {
    for (const i in this.efs) this.efs[i].callEach('TU')
  }

  transit() {}
}

class Effect {
  constructor(config, data, id) {
    this.dat = data
    this.match = config.match
    this.id = id
    this.sp = new Sprite(this.dat.bmp, config.stage)
    this.sp.hide()
    this.wait = -1
    this.ps = { sx: 0, sy: 0, sz: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }
    if (data.effect_list) this.effect_list = data.effect_list
    if (config.broken_list) this.broken_list = config.broken_list
    this.width = data.bmp.file[0].w
  }

  destroy() { this.sp.destroy() }

  TU() {
    const Gameplay = Global.gameplay
    this.ps.x += this.ps.vx
    this.ps.y += this.ps.vy
    this.ps.z += this.ps.vz
    this.ps.sx = this.ps.x - this.frameD.centerx
    this.ps.sy = this.ps.y - this.frameD.centery
    this.ps.sz = this.ps.z
    this.sp.set_x_y(this.ps.sx, this.ps.sy + this.ps.sz)
    this.sp.set_z(this.ps.sz + 1)
    if (this.ps.y < 0) this.ps.vy += Gameplay.gravity
    if (this.ps.y > 0) this.parent.die(this)

    if (this.frame_update) {
      this.frame_update = false
      this.sp.show_pic(this.frameD.pic)
      this.wait = this.frameD.wait
      this.next = this.frameD.next
      if (this.with_sound && this.frameD.sound) {
        this.match.sound.play(this.frameD.sound)
      }
    }

    if (this.wait === 0 || this.state === 9998) {
      if (this.next === 999) {
        this.next = 0
      } else if (this.next === 1000 || this.state === 9998) {
        this.parent.die(this)
        return
      }
      this.frame = this.next
      this.frameD = this.dat.frame[this.frame]
      this.state = this.frameD.state
      this.frame_update = true
    } else {
      this.wait--
    }
  }

  transit() {}
  set_pos(x, y, z) {}

  born(P, N, S, R) {
    let sf = 0
    if (this.effect_list) {
      if (!N) N = 0
      if (this.effect_list[N]) sf = this.effect_list[N].frame
      this.with_sound = S
      this.mass = 0
    } else if (this.broken_list) {
      if (this.broken_list[N]) {
        const slot = S % this.broken_list[N].length
        sf = this.broken_list[N][slot].frame
      }
      this.with_sound = true
      this.mass = N === 302 ? 0 : 1
      if (!R) R = { w: 50, h: 50 }
      P.x += this.match.random() * R.w * 1.2 - this.width
      P.y -= this.match.random() * R.h
      this.ps.vx = (this.match.random() - 0.5) * R.w * 0.5
      this.ps.vy = this.match.random() * 2 - 4
    }
    this.frame = sf
    this.frameD = this.dat.frame[this.frame]
    this.state = this.frameD.state
    this.frame_update = true
    this.ps.x = P.x
    this.ps.y = P.y
    this.ps.z = P.z
    this.sp.show()
  }

  die() { this.sp.hide() }
}

export default EffectSet
