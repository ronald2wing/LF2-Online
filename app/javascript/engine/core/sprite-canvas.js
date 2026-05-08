/**
 * sprite-canvas — canvas-backed sprite renderer. Mostly API-compatible
 * with sprite-dom.
 */
import attachResourceApi from "engine/core/sprite-resource"

attachResourceApi(Sprite)
Sprite.renderer = 'canvas'

function Sprite(config) {
  Sprite._count++

  if (config.canvas instanceof HTMLElement && config.canvas.tagName.toLowerCase() === 'canvas') { return new SpriteGroup(config) }
  if (config.type === 'group') { return new SpriteGroup(config) }

  this.img = {}
  this.cur_img = null
  this.x = 0; this.y = 0; this.z = 0
  this.w = 0; this.h = 0
  this.img_x = 0; this.img_y = 0

  if (config.wh === 'fit') { this.fit_to_img = true } else if (typeof config.wh === 'object') { this.set_wh(config.wh) }
  if (config.xy) { this.set_xy(config.xy) }
  if (config.xywh) {
    this.set_xy(config.xywh)
    this.set_wh(config.xywh)
  }
  if (config.img) { // add the images in config list
    if (typeof config.img === 'object') {
      for (const I in config.img) { this.add_img(config.img[I], I) }
    } else { this.add_img(config.img, '0') }
  }
  if (config.text) {
    this.text = config.text
    this.textcolor = '#000000'
    this.font = '10px monospace'
  }
  if (config.textcolor) { this.textcolor = config.textcolor }
  if (config.font) { this.font = config.font }
  if (config.bgcolor) { this.set_bgcolor(config.bgcolor) }
  if (config.canvas) {
    config.canvas.attach(this)
    this.parent = config.canvas
  }
}

Sprite.prototype.set_wh = function (P) {
  this.set_w_h(P.w, P.h)
}
Sprite.prototype.set_w_h = function (w, h) {
  this.w = this.ow = w
  this.h = this.oh = h
}
Sprite.prototype.set_w = function (w) {
  this.w = this.ow = w
}
Sprite.prototype.set_h = function (h) {
  this.h = this.oh = h
}
Sprite.prototype.clip_to_cur_img = function () {
  this.w = Math.min(this.ow, this.img[this.cur_img].naturalWidth)
  this.h = Math.min(this.oh, this.img[this.cur_img].naturalHeight)
}
Sprite.prototype.set_xy = function (P) {
  this.x = P.x
  this.y = P.y
}
Sprite.prototype.set_x_y = function (x, y) {
  this.x = x
  this.y = y
}
Sprite.prototype.set_flipx = function (flip) {
  this.x_flipped = flip
}
Sprite.prototype.set_flipy = function (flip) {
  this.y_flipped = flip
}
Sprite.prototype.set_z = function (z) {
  z = Math.round(z)
  this.z = z
}
Sprite.prototype.set_bgcolor = function (color) {
  this.bgcolor = color
}
Sprite.prototype.set_alpha = function (a) {
  this.opacity = a
}
Sprite.prototype.set_text = function (text, textcolor, font) {
  if (text) this.text = text
  if (textcolor) this.textcolor = textcolor
  if (font) this.font = font
}

Sprite.prototype.add_img = function (imgpath, name) {
  const This = this
  const img = new Image()
  let retry = 0
  Sprite._loading++
  img.onload = function () {
    if (This.fit_to_img) { This.set_w_h(this.naturalWidth, this.naturalHeight) }
    img.onload = null
    img.onerror = null
    delete This.fit_to_img
    Sprite._loading--
    if (Sprite._loading === 0) {
      if (Sprite._masterconfig.onready) { Sprite._masterconfig.onready() }
    }
  }
  if (Sprite._masterconfig.resourcemap) {
    img.onerror = function () {
      retry++
      const src = Sprite.resolve_resource(imgpath, retry) // fallback
      if (!src) { img.onerror = null } else { img.src = src }
    }
  }
  if (imgpath) {
    img.src = Sprite.resolve_resource(imgpath)
  }

  this.img[name] = img
  this.switch_img(name)
  return img
}
Sprite.prototype.remove_img = function (name) {
  if (this.img[name]) { this.img[name] = undefined }
  if (this.cur_img === name) { this.cur_img = null }
}
Sprite.prototype.switch_img = function (name) {
  this.cur_img = name
  this.clip_to_cur_img()
}
Sprite.prototype.set_img_xy = function (P) {
  this.img_x = P.x
  this.img_y = P.y
}
Sprite.prototype.set_img_x_y = function (x, y) {
  this.img_x = x
  this.img_y = y
}

Sprite.prototype.render = function (ctx) {
  if (this.hidden) return
  if (!ctx) return
  if (this.bgcolor) {
    ctx.fillStyle = this.bgcolor
    ctx.fillRect(this.x, this.y, this.w, this.h)
  }
  const has_opacity = this.opacity !== null && this.opacity !== undefined
  const saved_globalAlpha = has_opacity ? ctx.globalAlpha : 0
  if (has_opacity) ctx.globalAlpha *= this.opacity
  if (this.img[this.cur_img] && this.w && this.h) {
    ctx.drawImage(this.img[this.cur_img],
      /* source */ -this.img_x, -this.img_y, this.w, this.h,
      /* dest */ this.x_flipped ? -this.x - this.w : this.x, this.y_flipped ? -this.y - this.h : this.y, this.w, this.h)
  }
  if (this.text) {
    ctx.font = this.font
    ctx.fillStyle = this.textcolor
    ctx.fillText(this.text, this.x, this.y)
  }
  if (has_opacity) ctx.globalAlpha = saved_globalAlpha
}
Sprite.prototype.hide = function () {
  this.hidden = true
}
Sprite.prototype.show = function () {
  this.hidden = false
}
Sprite.prototype.remove = function () {
  if (!this.removed && this.parent) {
    this.removed = true
    this.parent.remove(this)
  }
}
Sprite.prototype.attach = function () {
  if (this.removed) {
    this.parent.attach(this)
    this.removed = false
  }
}

function SpriteGroup(config) {
  const parent = config.canvas
  if (parent instanceof HTMLElement && parent.tagName.toLowerCase() === 'canvas') {
    this.ctx = parent.getContext('2d')
    this.width = parent.width
    this.height = parent.height
  } else if (parent instanceof SpriteGroup) { parent.attach(this) }
  this.children = []
  this.x = 0; this.y = 0; this.z = 0
  this.w = 0; this.h = 0
  if (config.bgcolor) { this.set_bgcolor(config.bgcolor) }
  if (typeof config.wh === 'object') { this.set_wh(config.wh) }
  if (config.xywh) {
    let xywh = config.xywh
    if (config.xywh instanceof Array) {
      const A = config.xywh
      xywh = { x: A[0], y: A[1], w: A[2], h: A[3] }
    }
    this.set_xy(xywh)
    this.set_wh(xywh)
  }
}
SpriteGroup.prototype.set_wh = function (P) {
  this.set_w_h(P.w, P.h)
}
SpriteGroup.prototype.set_w_h = function (w, h) {
  this.w = w
  this.h = h
}
SpriteGroup.prototype.set_w = function (w) {
  this.w = w
}
SpriteGroup.prototype.set_h = function (h) {
  this.h = h
}
SpriteGroup.prototype.set_xy = function (P) {
  this.x = P.x
  this.y = P.y
}
SpriteGroup.prototype.set_x_y = function (x, y) {
  this.x = x
  this.y = y
}
SpriteGroup.prototype.set_flipx = function (flip) {
}
SpriteGroup.prototype.set_flipy = function (flip) {
}
SpriteGroup.prototype.set_z = function (z) {
  z = Math.round(z)
  this.z = z
}
SpriteGroup.prototype.set_bgcolor = function (color) {
  this.bgcolor = color
}
SpriteGroup.prototype.set_alpha = function (a) {
  this.opacity = a
}
SpriteGroup.prototype.hide = function () {
  this.hidden = true
}
SpriteGroup.prototype.show = function () {
  this.hidden = false
}
SpriteGroup.prototype.attach = function (sp) {
  this.children.push(sp)
  sp.set_z(this.children.length)
}
SpriteGroup.prototype.remove = function (sp) {
  const ii = this.children.indexOf(sp)
  if (ii !== -1) { this.children.splice(ii, 1) }
}
SpriteGroup.prototype.remove_all = function () {
  this.children.length = 0
}
SpriteGroup.prototype.render = function (ctx) {
  if (this.ctx) {
    ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
  }
  if (!ctx && !this.ctx) return
  if (this.hidden) return

  const has_opacity = this.opacity !== null && this.opacity !== undefined
  const saved_globalAlpha = has_opacity ? ctx.globalAlpha : 0
  if (has_opacity) ctx.globalAlpha *= this.opacity
  if (this.bgcolor) {
    ctx.fillStyle = this.bgcolor
    ctx.fillRect(this.x, this.y, this.w, this.h)
  }

  this.children.sort(function (A, B) { return A.z - B.z }) // z ordering
  ctx.translate(this.x, this.y)
  let fx = 0; let fy = 0
  for (let i = 0; i < this.children.length; i++) {
    const sp = this.children[i]
    if (!sp.x_flipped && !sp.y_flipped) { flip_to(0, 0) } else if (sp.x_flipped && !sp.y_flipped) { flip_to(1, 0) } else if (!sp.x_flipped && sp.y_flipped) { flip_to(0, 1) } else if (sp.x_flipped && sp.y_flipped) { flip_to(1, 1) }
    sp.render(ctx)
  }
  flip_to(0, 0)
  ctx.translate(-this.x, -this.y)
  if (has_opacity) ctx.globalAlpha = saved_globalAlpha

  function flip_to(ffx, ffy) {
    if (fx !== ffx && fy !== ffy) { ctx.scale(-1, -1) } else if (fx === ffx && fy !== ffy) { ctx.scale(1, -1) } else if (fx !== ffx && fy === ffy) { ctx.scale(-1, 1) }
    fx = ffx
    fy = ffy
  }
}

export default Sprite

