/**
 * sprite-resource — shared resource/static concern for both sprite renderers.
 *
 * sprite-dom and sprite-canvas are deliberately independent render paths
 * (DOM vs canvas, selected at runtime), but they share the same
 * masterconfig/static state, path resolution, and image preloading. This
 * module attaches that shared API to a Sprite constructor; the drawing logic
 * stays in each renderer.
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
}
