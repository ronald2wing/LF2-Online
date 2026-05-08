/*
 * effect
 *
 * handle visual effects
 * like blood, fire, etc
 */

import Global from "engine/Game/global"
import Sprite from "engine/Game/entity-sprite"
import effectsPool from "engine/core/effects-pool"
import coreUtil from "engine/core/util"
import { depth_scale } from "engine/Game/mechanics"

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

  create(id, position, index, sound, rect) {
    if (this.efs[id]) {
      this.efs[id].create(position, index, sound, rect)
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
    const s = depth_scale(this.ps.sz, this.match.background.zboundary)
    this.sp.set_scale(s)
    this.sp.set_x_y(
      this.ps.sx * s + this.ps.x * (1 - s),
      (this.ps.sy + this.ps.sz) * s + (this.ps.y + this.ps.sz) * (1 - s)
    )
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

  born(position, index, sound, rect) {
    let sf = 0
    if (this.effect_list) {
      if (!index) index = 0
      if (this.effect_list[index]) sf = this.effect_list[index].frame
      this.with_sound = sound
      this.mass = 0
    } else if (this.broken_list) {
      if (this.broken_list[index]) {
        const slot = sound % this.broken_list[index].length
        sf = this.broken_list[index][slot].frame
      }
      this.with_sound = true
      this.mass = index === 302 ? 0 : 1
      if (!rect) rect = { w: 50, h: 50 }
      position.x += this.match.random() * rect.w * 1.2 - this.width
      position.y -= this.match.random() * rect.h
      this.ps.vx = (this.match.random() - 0.5) * rect.w * 0.5
      this.ps.vy = this.match.random() * 2 - 4
    }
    this.frame = sf
    this.frameD = this.dat.frame[this.frame]
    this.state = this.frameD.state
    this.frame_update = true
    this.ps.x = position.x
    this.ps.y = position.y
    this.ps.z = position.z
    this.sp.show()
  }

  die() { this.sp.hide() }
}

export default EffectSet
