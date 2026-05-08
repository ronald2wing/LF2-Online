/**
 * sprite-canvas — canvas-backed sprite renderer. Mostly API-compatible
 * with sprite-dom.
 */
import attachResourceApi, { normalize_xywh } from "engine/core/sprite-resource"

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
  this.scale = 1

  if (config.wh === 'fit') { this.fit_to_img = true } else if (typeof config.wh === 'object') { this.set_wh(config.wh) }
  if (config.xy) { this.set_xy(config.xy) }
  if (config.xywh) {
    this.set_xy(config.xywh)
    this.set_wh(config.xywh)
  }
  if (config.img) { // add the images in config list
    if (typeof config.img === 'object') {
      for (const imgName in config.img) { this.add_img(config.img[imgName], imgName) }
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

Sprite.prototype.set_wh = function (size) {
  this.set_w_h(size.w, size.h)
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
Sprite.prototype.set_xy = function (pos) {
  this.x = pos.x
  this.y = pos.y
}
Sprite.prototype.set_x_y = function (x, y) {
  this.x = x
  this.y = y
}
Sprite.prototype.set_flipx = function (flip) {
  this.x_flipped = flip
}
Sprite.prototype.set_z = function (z) {
  z = Math.round(z)
  this.z = z
}
Sprite.prototype.set_scale = function (scale) {
  this.scale = scale == null ? 1 : scale
}
Sprite.prototype.set_bgcolor = function (color) {
  this.bgcolor = color
}

Sprite.prototype.add_img = function (imgpath, name) {
  return Sprite._load_img(this, imgpath, name)
}
Sprite.prototype.remove_img = function (name) {
  if (this.img[name]) { this.img[name] = undefined }
  if (this.cur_img === name) { this.cur_img = null }
}
Sprite.prototype.switch_img = function (name) {
  this.cur_img = name
  this.w = Math.min(this.ow, this.img[this.cur_img].naturalWidth)
  this.h = Math.min(this.oh, this.img[this.cur_img].naturalHeight)
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
    const scale = this.scale || 1
    ctx.drawImage(this.img[this.cur_img],
      /* source */ -this.img_x, -this.img_y, this.w, this.h,
      /* dest */ this.x_flipped ? -this.x - this.w : this.x, this.y_flipped ? -this.y - this.h : this.y, this.w * scale, this.h * scale)
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
    const xywh = normalize_xywh(config.xywh)
    this.set_xy(xywh)
    this.set_wh(xywh)
  }
}
SpriteGroup.prototype.set_wh = function (size) {
  this.set_w_h(size.w, size.h)
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
SpriteGroup.prototype.set_xy = function (pos) {
  this.x = pos.x
  this.y = pos.y
}
SpriteGroup.prototype.set_x_y = function (x, y) {
  this.x = x
  this.y = y
}
SpriteGroup.prototype.set_flipx = function (flip) {
}
SpriteGroup.prototype.set_z = function (z) {
  z = Math.round(z)
  this.z = z
}
SpriteGroup.prototype.set_bgcolor = function (color) {
  this.bgcolor = color
}
SpriteGroup.prototype.hide = function () {
  this.hidden = true
}
SpriteGroup.prototype.show = function () {
  this.hidden = false
}
SpriteGroup.prototype.attach = function (sprite) {
  this.children.push(sprite)
  sprite.set_z(this.children.length)
}
SpriteGroup.prototype.remove = function (sprite) {
  const index = this.children.indexOf(sprite)
  if (index !== -1) { this.children.splice(index, 1) }
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

  this.children.sort(function (a, b) { return a.z - b.z }) // z ordering
  ctx.translate(this.x, this.y)
  let flipX = 0
  let flipY = 0
  for (let i = 0; i < this.children.length; i++) {
    const sprite = this.children[i]
    flip_to(sprite.x_flipped ? 1 : 0, sprite.y_flipped ? 1 : 0)
    sprite.render(ctx)
  }
  flip_to(0, 0)
  ctx.translate(-this.x, -this.y)
  if (has_opacity) ctx.globalAlpha = saved_globalAlpha

  // Undo the current flip and apply the target one; a matching axis is a no-op.
  function flip_to(targetFlipX, targetFlipY) {
    const sx = flipX !== targetFlipX ? -1 : 1
    const sy = flipY !== targetFlipY ? -1 : 1
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    flipX = targetFlipX
    flipY = targetFlipY
  }
}

export default Sprite

