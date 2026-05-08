/**
 * sprite-resource — shared resource/static concern for both sprite renderers.
 *
 * sprite-dom and sprite-canvas are deliberately independent render paths
 * (DOM vs canvas, selected at runtime), but they share the same
 * masterconfig/static state, path resolution, image preloading, and the
 * per-sprite image-load lifecycle (loading counter, onready hook, retry
 * fallback). This module attaches that shared API to a Sprite constructor;
 * the drawing logic stays in each renderer.
 */
import ResourceMap from "engine/core/resourcemap"

export default function attachResourceApi(Sprite) {
  Sprite._masterconfig = {}
  Sprite._count = 0
  Sprite._loading = 0

  Sprite.masterconfig = function (config) {
    if (config) {
      Sprite._masterconfig = config
      Sprite.masterconfig_update()
    } else {
      return Sprite._masterconfig
    }
  }

  Sprite.masterconfig_set = function (key, value) {
    if (key && value) {
      Sprite._masterconfig[key] = value
      Sprite.masterconfig_update()
    }
  }

  Sprite.masterconfig_update = function () {
    if (Sprite._masterconfig.resourcemap &&
        !(Sprite._masterconfig.resourcemap instanceof ResourceMap)) {
      Sprite._masterconfig.resourcemap = new ResourceMap(Sprite._masterconfig.resourcemap)
    }
  }

  Sprite.resolve_resource = function (res, level) {
    if (Sprite._masterconfig.resourcemap) {
      return level
        ? Sprite._masterconfig.resourcemap.fallback(res, level)
        : Sprite._masterconfig.resourcemap.get(res)
    }
    if (Sprite._masterconfig.baseUrl) return Sprite._masterconfig.baseUrl + res
    return res
  }

  Sprite.preload_image = function (imgname) {
    const img = new Image()
    img.src = Sprite.resolve_resource(imgname)
  }

  // Shared image-load lifecycle backing both renderers' add_img. Tracks the
  // global loading counter, fires masterconfig.onready when the last image
  // resolves, and retries through resourcemap fallbacks on error. `opts`
  // carries the renderer's DOM-specific extras; canvas passes none.
  Sprite._load_img = function (sprite, imgpath, name, opts = {}) {
    const img = new Image()
    let retry = 0
    if (opts.className) { img.className = opts.className }
    Sprite._loading++
    img.onload = function () {
      if (opts.fallback_natural_size) {
        if (!this.naturalWidth) this.naturalWidth = this.width
        if (!this.naturalHeight) this.naturalHeight = this.height
      }
      if (sprite.fit_to_img) { sprite.set_w_h(this.naturalWidth, this.naturalHeight) }
      img.onload = null
      img.onerror = null
      delete sprite.fit_to_img
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
    if (opts.appendTo) { opts.appendTo(img) }
    sprite.img[name] = img
    sprite.switch_img(name)
    return img
  }
}

// Normalize an `xywh` config value (object or [x, y, w, h] array) to the
// object form { x, y, w, h }. Shared by the renderers that accept an array.
export function normalize_xywh(xywh) {
  if (xywh instanceof Array) {
    return { x: xywh[0], y: xywh[1], w: xywh[2], h: xywh[3] }
  }
  return xywh
}
