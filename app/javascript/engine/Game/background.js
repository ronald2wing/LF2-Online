import coreUtil from "engine/core/util"
import spriteRenderer from "engine/core/sprite-canvas"
import browserSupport from "engine/core/support"
import global from "engine/Game/global"

const Application = global.application

function decodeColor(rect) {
  if (typeof rect === 'string') {
    return rect // extended standard: CSS color format allowed
  } else if (typeof rect === 'number') {
    let lookup, computed
    switch (rect) {
      case 4706:  lookup = 'rgb(16,79,16)';       break // lion forest
      case 40179: lookup = 'rgb(159,163,159)';    break // HK Coliseum
      case 29582: lookup = 'rgb(119,119,119)';    break
      case 37773: lookup = 'rgb(151,119,111)';    break
      case 33580: lookup = 'rgb(135,107,103)';    break
      case 25356: lookup = 'rgb(103,103,103)';    break
      case 21096: lookup = 'rgb(90,78,75)';       break // Stanley Prison
      case 37770: lookup = 'rgb(154,110,90)';     break // The Great Wall
      case 16835: lookup = 'rgb(66,56,24)';       break // Queen's Island
      case 34816: lookup = 'rgb(143,7,7)';        break // Forbidden Tower
    }
    const r = (rect >> 11 << 3)
    const g = (rect >> 6 & 31) << 3
    const b = ((rect & 31) << 3)
    computed = 'rgb(' +
      (r + (r > 64 || r === 0 ? 7 : 0)) + ',' +
      (g + (g > 64 || g === 0 ? 7 : 0) + ((rect >> 5 & 1) && g > 80 ? 4 : 0)) + ',' +
      (b + (b > 64 || b === 0 ? 7 : 0)) +
      ')'
    return lookup || computed
  }
}

let backgroundTimer
const backgroundTimerTargets = []

function startBackgroundTimer(child) {
  backgroundTimerTargets.push(child)
  if (!backgroundTimer) {
    backgroundTimer = setInterval(function () {
      for (let index = 0; index < backgroundTimerTargets.length; index++) {
        backgroundTimerTargets[index].TU()
      }
    }, 1000 / 30) // 30 fps
  }
}

const screenWidth = Application.window.width
const halfWidth = Application.window.width / 2

export default class Background {
  constructor(config, data, id) {
    const self = this
    if (!config) {
      self.id = -1
      self.name = 'empty background'
      self.width = 1500
      self.zboundary = [0, 300]
      self.height = self.zboundary[1] - self.zboundary[0]
      self.shadow = { x: 0, y: 0, img: '' }
      return
    }
    self.spriteLayer = config.layers
    self.layers = []
    self.timedLayers = []
    self.timer = 0
    self.data = data
    self.name = data.name.replace(/_/g, ' ')
    self.id = id

    self.zboundary = data.zboundary
    self.width = data.width
    self.height = self.zboundary[1] - self.zboundary[0]
    self.shadow = {
      x: 0,
      y: 0, // offset x,y
      img: data.shadow
    }
    if (spriteRenderer.renderer === 'DOM' && !browserSupport.css3dtransform) {
      self.dropFrame = 1
    } else {
      self.dropFrame = 0
    }

    ;(function () {
      const sp = new spriteRenderer({ img: data.shadow })
      sp.img[0].addEventListener('load', onload, true)
      function onload() {
        self.shadow.x = (this.naturalWidth || this.width) / 2
        self.shadow.y = (this.naturalHeight || this.height) / 2
        sp.img[0].removeEventListener('load', onload, true)
      }
    }())

    if (config.scrollbar) {
      const sc = document.createElement('div')
      self.scrollbar = sc
      sc.className = 'backgroundScroll'
      const child = document.createElement('div')
      child.style.width = self.width + 'px'
      child.className = 'backgroundScrollChild'
      sc.appendChild(child)
      config.scrollbar.appendChild(sc)
      sc.onscroll = function () {
        if (self.cameraLocked) {
          self.cameraX = sc.scrollLeft
          self.scroll(sc.scrollLeft)
          if (config.onscroll) { config.onscroll() }
        }
      }
      sc.onmousedown = function () {
        self.cameraLocked = true
      }
      sc.onmouseup = function () {
        self.cameraLocked = false
      }
    }

    if (config.camerachase) {
      self.char = config.camerachase.character
      self.cameraX = self.width / 2
      self.cameraIndex = 0
    } else {
      self.cameraLocked = true
    }

    // create layers
    self.layers.push({
      sp: new spriteRenderer({ canvas: config.layers, type: 'group' }),
      ratio: 1
    })
    self.layers[0].sp.set_w(self.width)
    self.layers[0].sp.set_z(3000)
    self.floor = self.layers[0].sp
    const groupedLayers = coreUtil.groupBy(data.layer, 'width')
    for (const layerWidth in groupedLayers) {
      const lay =
      {
        sp: new spriteRenderer({ canvas: config.layers, type: 'group' }),
        ratio: (parseInt(layerWidth) - Application.window.width) / (self.width - Application.window.width)
      }
      lay.sp.set_z(-1000 + parseInt(layerWidth))
      self.layers.push(lay)
      for (let itemIndex = 0; itemIndex < groupedLayers[layerWidth].length; itemIndex++) {
        const dlay = groupedLayers[layerWidth][itemIndex] // layer data
        let spConfig
        if (dlay.rect) {
          // if `rect` is defined, `pic` will only be a dummy
          spConfig =
          {
            canvas: lay.sp,
            wh: { w: dlay.width, h: dlay.height }
          }
        } else if (dlay.pic) {
          spConfig =
          {
            canvas: lay.sp,
            wh: 'fit',
            img: dlay.pic
          }
        }
        let sp
        if (!dlay.loop && !dlay.tile) {	// single item
          sp = new spriteRenderer(spConfig)
          sp.set_x_y(dlay.x, correctY(dlay))
          sp.set_z(data.layer.indexOf(dlay))
          if (dlay.rect) { sp.set_bgcolor(decodeColor(dlay.rect)) }
        } else {	// a horizontal array
          sp = new spriteRenderer({ canvas: lay.sp, type: 'group' }) // holder
          spConfig.canvas = sp
          sp.set_x_y(0, 0)
          sp.set_z(data.layer.indexOf(dlay))
          let left, right, interval
          if (dlay.loop) {
            left = dlay.x
            right = dlay.width
            interval = dlay.loop
          } else if (dlay.tile) {
            left = dlay.x - dlay.width * Math.abs(dlay.tile)
            right = dlay.width + dlay.width * Math.abs(dlay.tile)
            interval = dlay.width
          }
          for (let tileIndex = -1, xx = left; xx < right; xx += interval, tileIndex++) {
            const spi = new spriteRenderer(spConfig)
            spi.set_x_y(xx, dlay.y)
            if (dlay.rect) { spi.set_bgcolor(decodeColor(dlay.rect)) }
            if (dlay.tile < 0) { spi.set_flipx(!(tileIndex % 2 === 0)) }
          }
        }
        if (dlay.cc) {
          self.timedLayers.push({
            sp: sp,
            cc: dlay.cc,
            c1: dlay.c1,
            c2: dlay.c2
          })
        }
      }
    }

    if (config.standalone) {
      startBackgroundTimer(this)
      self.carousel = {
        type: config.standalone.carousel,
        dir: 1,
        speed: 5
      }
      self.cameraLocked = false
      self.standalone = config.standalone
    }

    // a very strange bug for the scene 'HK Coliseum' must be solved by hard coding
    function correctY(dlay) {
      if (data.name === 'HK Coliseum') {
        if (dlay.pic.indexOf('back1') === -1) {
          return dlay.y - 8
        } else {
          return dlay.y
        }
      } else {
        return dlay.y
      }
    }
  }

  destroy() {
    const self = this
    if (self.name === 'empty background') { return }
    if (self.layers) {
      for (let layerIndex = 0; layerIndex < self.layers.length; layerIndex++) {
        self.layers[layerIndex].sp.remove()
      }
    }
    if (self.timedLayers) {
      for (let layerIndex = 0; layerIndex < self.timedLayers.length; layerIndex++) {
        self.timedLayers[layerIndex].sp.remove()
      }
    }
    if (self.scrollbar) {
      self.scrollbar.parentNode.removeChild(self.scrollbar)
    }
    if (self.spriteLayer) {
      self.spriteLayer.remove_all()
    }
  }

  // return true if the moving object is leaving the scene
  leaving(o, xt) {
    const self = this
    if (!xt) {
      xt = 0
    }
    const nextX = o.ps.sx + o.ps.vx
    const nextY = o.ps.sy + o.ps.vy
    return (nextX + o.sp.width < 0 - xt || nextX > self.width + xt || nextY < -600 || nextY > 100)
  }

  // get an absolute position using a ratio, e.g. get_pos(0.5,0.5) is exactly the mid point
  get_pos(rx, rz) {
    const self = this
    return { x: self.width * rx, y: 0, z: self.zboundary[0] + self.height * rz }
  }

  scroll(X) {
    const self = this
    for (let layerIndex = 0; layerIndex < self.layers.length; layerIndex++) {
      // The foreground layer (layerIndex === 0) gets pixel-snapped so the parallax
      // doesn't shimmer; subsequent layers move at fractional offsets.
      const offset = -(X * self.layers[layerIndex].ratio)
      self.layers[layerIndex].sp.set_x_y(layerIndex === 0 ? offset | 0 : offset, 0)
    }
  }

  TU() {
    const self = this
    // camera movement
    if (!self.cameraLocked) {
      if (!self.carousel) {	// camera chase
        if (self.cameraIndex++ % (self.dropFrame + 1) !== 0) {
          return
        }
        // algorithm by Azriel
        // http://www.lf-empire.de/forum/archive/index.php/thread-4597.html
        let avgX = 0
        let facing = 0
        let numPlayers = 0
        for (let playerKey in self.char) {
          avgX += self.char[playerKey].ps.x
          facing += self.char[playerKey].dirh()
          numPlayers++
        }
        if (numPlayers > 0) {
          avgX /= numPlayers
        }
        // his original equation has one error, it should be 24 regardless of number of players
        let scrollLimit = (facing * screenWidth / 24) + (avgX - halfWidth)
        if (scrollLimit < 0) scrollLimit = 0
        if (scrollLimit > self.width - screenWidth) scrollLimit = self.width - screenWidth
        const speedX = (scrollLimit - self.cameraX) * Application.camera.speed_factor * (self.dropFrame + 1)
        if (speedX !== 0) {
          if (speedX > -0.05 && speedX < 0.05) {
            self.cameraX = scrollLimit
          } else {
            self.cameraX = self.cameraX + speedX
          }
          self.scroll(self.cameraX)
          if (self.scrollbar) {
            self.scrollbar.scrollLeft = Math.round(self.cameraX)
          }
        }
      } else if (self.carousel.type === 'linear') {
        const lastScroll = self.scrollbar.scrollLeft
        self.scrollbar.scrollLeft += self.carousel.speed * self.carousel.dir
        if (lastScroll === self.scrollbar.scrollLeft) {
          self.carousel.dir *= -1
        }
        self.scroll(self.scrollbar.scrollLeft)
      }
    }
    // layers animation
    for (let layerIndex = 0; layerIndex < self.timedLayers.length; layerIndex++) {
      const timedLayer = self.timedLayers[layerIndex]
      const frame = self.timer % timedLayer.cc
      if (frame >= timedLayer.c1 && frame <= timedLayer.c2) {
        timedLayer.sp.show()
      } else {
        timedLayer.sp.hide()
      }
    }
    if (self.standalone) {
      self.standalone.canvas.render()
    }
    self.timer++
  }

}
