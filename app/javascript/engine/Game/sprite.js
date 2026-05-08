/*
 * sprite
 *
 * sprite-animator
 */
import spriteRenderer from "engine/core/sprite-canvas"
import animator from "engine/core/animator"

export default class Sprite {
  constructor(bmp, parent) {
  const num_of_images = this.num_of_images = bmp.file.length
  const w = this.w = bmp.file[0].w + 1
  const h = this.h = bmp.file[0].h + 1
  const ani = this.ani = []
  this.dir = 'right'
  this.cur_img = 0

  const sp_con =
  {
    canvas: parent,
    wh: { w: w, h: h },
    img: {}
  }
  const sp = this.sp = new spriteRenderer(sp_con)

  for (let i = 0; i < bmp.file.length; i++) {
    let imgpath = ''
    for (const j in bmp.file[i]) {
      if (typeof bmp.file[i][j] === 'string' &&
        j.indexOf('file') === 0) {
        imgpath = bmp.file[i][j]
      }
    }
    if (imgpath === '') {
      console.warn('cannot find img path in data:\n' + JSON.stringify(bmp.file[i]))
    }
    sp.add_img(imgpath, i)

    const ani_con =
    {
      x: 0,
      y: 0,
      w: bmp.file[i].w + 1,
      h: bmp.file[i].h + 1,
      gx: bmp.file[i].row,
      gy: bmp.file[i].col,
      tar: sp,
      borderleft: 0,
      bordertop: 0,
      borderright: 1,
      borderbottom: 1
    }
    ani.length++
    ani[i] = new animator(ani_con)
  }
}

  destroy() {
  this.sp.remove()
  this.sp = null
  this.ani.length = 0
}

  show_pic(I) {
  if (!this.sp) return
  let slot = 0
  for (let k = 0; k < this.ani.length; k++) {
    const i = I - this.ani[k].config.gx * this.ani[k].config.gy
    if (i >= 0) {
      I = i
      slot++
    } else {
      break
    }
  }
  if (slot >= this.ani.length) {
    slot = this.ani.length - 1
    I = 999
  }
  this.cur_img = slot
  this.sp.switch_img(this.cur_img)
  this.ani[this.cur_img].set_frame(I)
  this.w = this.ani[this.cur_img].config.w
  this.h = this.ani[this.cur_img].config.h
}

  switch_lr(dir) {
  if (dir !== this.dir) {
    this.dir = dir
    this.sp.set_flipx(dir === 'left')
  }
}

  set_x_y(x, y) {
  this.sp.set_x_y(x, y)
}

  set_z(Z) {
  this.sp.set_z(Z)
}

  show() {
  if (this.sp) this.sp.show()
}

  hide() {
  if (this.sp) this.sp.hide()
}

}
