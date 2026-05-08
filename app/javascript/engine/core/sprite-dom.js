/**
 * sprite-dom — DOM-backed sprite renderer using <div> + <img>.
 *
 * Stylesheet at engine/core/style.css is preloaded by the host layout.
 */
import support from "engine/core/support"
import coreUtil from "engine/core/util"
import attachResourceApi, { normalize_xywh } from "engine/core/sprite-resource"

attachResourceApi(Sprite)
Sprite.renderer = 'DOM'

function Sprite(config) {
  Sprite._count++

  /*
   * Sprite.el
   * Sprite.type
   */
  let classname = 'engine-sprite'
  if (config.type === 'group') {
    classname = 'engine-sprite-group'
    this.type = 'group'
  } else if (config.div) { classname = 'engine-sprite-inline' }
  if (config.div) {
    this.el = config.div
    this.el.classList.add(classname)
    if (window.getComputedStyle(this.el).getPropertyValue('position') === 'static') { this.el.style.position = 'relative' }
  } else {
    this.el = document.createElement('div')
    this.el.className = classname
    if (config.canvas) {
      if (config.canvas instanceof Sprite && config.canvas.type === 'group') { config.canvas.attach(this) } else { config.canvas.appendChild(this.el) }
    }
  }

  this.img = {}
  this.cur_img = null
  this.scale = 1

  if (config.wh === 'fit') { this.fit_to_img = true } else if (typeof config.wh === 'object') { this.set_wh(config.wh) }
  if (config.xy) { this.set_xy(config.xy) }
  if (config.xywh) {
    const xywh = normalize_xywh(config.xywh)
    this.set_xy(xywh)
    this.set_wh(xywh)
  }
  if (config.img) { // add the images in config list
    if (typeof config.img === 'object') {
      for (const imgName in config.img) { this.add_img(config.img[imgName], imgName) }
    } else { this.add_img(config.img, '0') }
  }
  if (config.div && config.type !== 'group') {  // adopt images in `div`
    const img = config.div.getElementsByTagName('img')
    for (let i = 0; i < img.length; i++) {
      const image = img[i]
      const name = image.getAttribute('name')
      if (name) {
        image.classList.add('engine-sprite-img')
        if (!image.naturalWidth) image.naturalWidth = image.width
        if (!image.naturalHeight) image.naturalHeight = image.height
        if (!image.naturalWidth && !image.naturalHeight) { image.addEventListener('load', onload, true) }
        function onload() {
          if (!this.naturalWidth) this.naturalWidth = this.width
          if (!this.naturalHeight) this.naturalHeight = this.height
          image.removeEventListener('load', onload, true)
        }
        this.img[name] = image
        this.switch_img(name)
      }
    }
  }
  if (config.bgcolor) { this.set_bgcolor(config.bgcolor) }

  if (transform_support()) {
    if (!config.div) {
      this.el.style.left = 0 + 'px'
      this.el.style.top = 0 + 'px'
    }
    this.x = 0
    this.y = 0
  }
}

Sprite.prototype.set_wh = function (size) {
  if (coreUtil.defined(size.w) && coreUtil.defined(size.h)) { this.set_w_h(size.w, size.h) } else { console.warn('sprite: wrong set_wh parameters') }
}
Sprite.prototype.set_w_h = function (w, h) {
  this.el.style.width = w + 'px'
  this.el.style.height = h + 'px'
}
Sprite.prototype.set_w = function (w) {
  this.el.style.width = w + 'px'
}
Sprite.prototype.set_h = function (h) {
  this.el.style.height = h + 'px'
}

// Builds the `translate(...)` prefix shared by the 3d/2d transform branches.
function translateStyle(x, y, use3d) {
  return use3d
    ? 'translate3d(' + x + 'px,' + y + 'px, 0px) '
    : 'translate(' + x + 'px,' + y + 'px) '
}

// Uniform depth-scale suffix. Only emitted when non-unit so the UI (which
// always renders at scale 1) keeps its transform string byte-identical.
function scaleStyle(scale) {
  return scale && scale !== 1 ? 'scale(' + scale + ',' + scale + ') ' : ''
}

// The platform's transform property and whether the 3d variant should be used,
// or null when the renderer must fall back to left/top positioning. Both
// installers below and the constructor dispatch on this one decision.
function transform_support() {
  if (support.css3dtransform && !Sprite._masterconfig.disable_css3dtransform) {
    return { property: support.css3dtransform, use3d: true }
  }
  if (support.css2dtransform && !Sprite._masterconfig.disable_css2dtransform) {
    return { property: support.css2dtransform, use3d: false }
  }
  return null
}

// Installs set_xy / set_x_y / set_flipx for the platform's transform property,
// or the left/top fallback when no CSS transform is available.
function installTransformMethods(Sprite) {
  const t = transform_support()
  if (!t) {
    Sprite.prototype.set_xy = function (pos) {
      this.set_x_y(pos.x, pos.y)
    }
    Sprite.prototype.set_x_y = function (x, y) {
      this.x = x
      this.y = y
      this.el.style.left = x + 'px'
      this.el.style.top = y + 'px'
    }
    Sprite.prototype.set_flipx = function () {
      // not supported
    }
    return
  }

  Sprite.prototype.set_xy = function (pos) {
    this.set_x_y(pos.x, pos.y)
  }
  Sprite.prototype.set_x_y = function (x, y) {
    this.x = x
    this.y = y
    this.el.style[t.property] = translateStyle(x, y, t.use3d) +
      (this.x_flipped ? 'scaleX(-1) ' : '') +
      (this.y_flipped ? 'scaleY(-1) ' : '') +
      scaleStyle(this.scale)
  }
  Sprite.prototype.set_flipx = function (flip) {
    this.x_flipped = flip
    this.set_x_y(this.x, this.y)
  }
}

installTransformMethods(Sprite)
Sprite.prototype.set_z = function (z) {
  z = Math.round(z)
  this.el.style.zIndex = z
  this.z = z
}
Sprite.prototype.set_scale = function (scale) {
  this.scale = scale == null ? 1 : scale
  this.set_x_y(this.x, this.y)
}
Sprite.prototype.set_bgcolor = function (color) {
  this.el.style.background = color
}
/* private
 * Sprite.add_img
 [ method ]
 * add new image
 - imgpath (string)
 - name (string)
 = (object) newly created `img` element
 * note that adding images can and should better be done in constructor `config`
 */
Sprite.prototype.add_img = function (imgpath, name) {
  return Sprite._load_img(this, imgpath, name, {
    className: 'engine-sprite-img',
    fallback_natural_size: true,
    appendTo: (img) => { this.el.appendChild(img) },
  })
}
Sprite.prototype.remove_img = function (name) {
  if (this.img[name]) {
    this.img[name].parentNode.removeChild(this.img[name])
    this.img[name] = undefined
  }
  if (this.cur_img === name) { this.cur_img = null }
}
Sprite.prototype.switch_img = function (name) {
  let left, top // store the left, top of the current displayed image
  for (let imgName in this.img) {
    if (this.img[imgName].style.display == '') {
      left = this.img[imgName].style.left
      top = this.img[imgName].style.top
      break
    }
  }
  for (let imgName in this.img) {
    if (imgName == name) {
      this.img[imgName].style.left = left
      this.img[imgName].style.top = top
      this.img[imgName].style.display = ''
    } else {
      this.img[imgName].style.display = 'none'
    }
  }
  this.cur_img = name
}
// Installs set_img_x_y for the platform's transform property, or the left/top
// fallback. No flip flags here: the element itself carries them.
function installImgTransformMethods(Sprite) {
  const t = transform_support()
  if (!t) {
    Sprite.prototype.set_img_x_y = function (x, y) {
      const img = this.img[this.cur_img]
      if (!img) return
      img.style.left = x + 'px'
      img.style.top = y + 'px'
    }
    return
  }

  Sprite.prototype.set_img_x_y = function (x, y) {
    this.x = x
    this.y = y
    const img = this.img[this.cur_img]
    if (img) img.style[t.property] = translateStyle(x, y, t.use3d)
  }
}

installImgTransformMethods(Sprite)

Sprite.prototype.render = function () {
  // do nothing
}
Sprite.prototype.hide = function () {
  this.el.style.display = 'none'
}
Sprite.prototype.show = function () {
  this.el.style.display = ''
}
Sprite.prototype.remove = function (sp) {
  if (this.type === 'group' && sp) {
    this.el.removeChild(sp.el)
  } else {
    if (!this.removed && this.el.parentNode) {
      this.removed = this.el.parentNode
      this.el.parentNode.removeChild(this.el)
    }
  }
}
Sprite.prototype.attach = function (sp) {
  if (this.type === 'group' && sp) {
    this.el.appendChild(sp.el)
  } else {
    if (this.removed) {
      this.removed.appendChild(this.el)
      this.removed = null
    }
  }
}
Sprite.prototype.remove_all = function () {
  if (this.type === 'group') {
    const element = this.el
    while (element.lastChild) { element.removeChild(element.lastChild) }
  }
}

export default Sprite

