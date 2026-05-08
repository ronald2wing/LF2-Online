/*
 * touchcontroller.js
 *
 * On-screen touch controls for mobile / tablet.
 * Supports "gamepad" (d-pad + buttons) and "functionkey" (F1–F7) layouts.
 */

import util from "engine/Game/util"
import coreUtil from "engine/core/util"

const controllers = []
let touches = []
let eventtype

function touchHandler(event) {
  if (!TouchController.enabled) return
  eventtype = event.type
  touches = event.touches
  for (const controller of controllers) {
    if (!controller.sync) controller.fetch()
  }
  if (TouchController.preventDefault) event.preventDefault()
}

const touchEvents = ["touchstart", "touchmove", "touchenter", "touchend", "touchleave", "touchcancel"]
for (const name of touchEvents) {
  document.addEventListener(name, touchHandler, false)
}

window.addEventListener("resize", () => {
  for (const controller of controllers) controller.resize()
}, false)

function showButton(button) { button.el.style.visibility = "visible" }
function hideButton(button) { button.el.style.visibility = "hidden" }

export default class TouchController {
  static enabled = false
  static preventDefault = false

  static enable(state) { TouchController.enabled = state }

  get type() { return "touch" }

  constructor(config) {
    const self = this
    self.config = config

    if (config.layout === "gamepad") {
      self.state = { up: 0, down: 0, left: 0, right: 0, def: 0, jump: 0, att: 0 }
      self.button = {
        def:   { label: "D" },
        jump:  { label: "J" },
        att:   { label: "A" }
      }
    } else if (config.layout === "functionkey") {
      self.state = { F1: 0, F2: 0, F4: 0, F7: 0 }
      self.button = {
        F1: { label: "F1" },
        F2: { label: "F2" },
        F4: { label: "F4" },
        F7: { label: "F7" }
      }
    }

    self.child = []
    self.sync = true
    self.pause_state = false
    controllers.push(self)

    for (const key in self.button) {
      const el = document.createElement("div")
      util.queryUI("touch_control_holder").appendChild(el)
      el.className = "touch_controller_button action"
      el.innerHTML = "<span>" + self.button[key].label + "</span>"
      self.button[key].el = el
    }

    // single circular joystick-style d-pad disc (gamepad layout only)
    if (config.layout === "gamepad") {
      self.dpad = document.createElement("div")
      self.dpad.className = "touch_dpad"
      util.queryUI("touch_control_holder").appendChild(self.dpad)
      // recessed center well
      self.hub = document.createElement("div")
      self.hub.className = "touch_dpad_hub"
      self.dpad.appendChild(self.hub)
    }
    self.resize()
  }

  resize() {
    const self = this
    const w = window.innerWidth
    const h = window.innerHeight

    if (self.config.layout === "gamepad") {
      // Base unit scales with the smaller viewport dimension, clamped so the
      // pad stays usable on very large screens without dominating the view.
      const unit = Math.min(Math.min(w, h) * 0.15, 110)
      const dpad = unit * 1.1
      const action = unit * 1.0

      // Anchor the pad to the BOTTOM corners where thumbs rest naturally
      // (per mobile gamepad conventions). Portrait sits slightly lower.
      const centerY = h > w ? h * 0.82 : h * 0.78

      // Game canvas bounds (the pad stays over the play area even when the
      // viewport is letterboxed).
      const rootRect = util.root ? util.root.getBoundingClientRect() : { left: 0, right: w }
      const canvasLeft = rootRect.left || 0
      const canvasWidth = (rootRect.right || w) - canvasLeft

      // Circular joystick-style d-pad disc in the BOTTOM-LEFT corner.
      const dpadSize = dpad
      const cx = canvasLeft + dpad * 0.9
      const cy = centerY
      self.dpad.style.left = (cx - dpadSize / 2) + "px"
      self.dpad.style.top = (cy - dpadSize / 2) + "px"
      self.dpad.style.width = dpadSize + "px"
      self.dpad.style.height = dpadSize + "px"
      self.dpad.left = cx - dpadSize / 2
      self.dpad.top = cy - dpadSize / 2
      self.dpad.right = cx + dpadSize / 2
      self.dpad.bottom = cy + dpadSize / 2
      self.dpad.cx = cx
      self.dpad.cy = cy
      self.dpad.radius = dpadSize / 2

      // recessed center well
      const hubSize = dpad * 0.34
      self.hub.style.left = (dpadSize / 2 - hubSize / 2) + "px"
      self.hub.style.top = (dpadSize / 2 - hubSize / 2) + "px"
      self.hub.style.width = hubSize + "px"
      self.hub.style.height = hubSize + "px"
      self.hub.radius = hubSize / 2
      self.hub.cx = cx
      self.hub.cy = cy

      // Action cluster in the BOTTOM-RIGHT corner, hugging the canvas edge.
      // A (attack) is primary, with J (jump) above-left and D (defend)
      // below-left, evenly spaced 120° apart on a circle of radius r around
      // the thumb anchor (ax, ay).
      const ax = canvasLeft + canvasWidth - dpad * 0.9
      const ay = centerY
      const actionR = action * 1.1
      const diag = actionR * Math.SQRT1_2
      self.setButtonPositions({
        att:  [ax - actionR - action / 2, ay - action / 2, action, action],
        jump: [ax - diag - action / 2, ay - diag - action / 2, action, action],
        def:  [ax - diag - action / 2, ay + diag - action / 2, action, action]
      })
    } else if (self.config.layout === "functionkey") {
      self.paused(self.pause_state)
    }
  }

  setButtonPositions(positions) {
    const self = this
    for (const key in positions) {
      const btn = self.button[key]
      const [left, top, width, height] = positions[key]
      btn.left = left
      btn.top = top
      btn.right = left + width
      btn.bottom = top + height
      btn.el.style.left = left + "px"
      btn.el.style.top = top + "px"
      btn.el.style.width = width + "px"
      btn.el.style.height = height + "px"
    }
  }

  paused(pause) {
    const self = this
    const w = window.innerWidth
    const h = window.innerHeight
    self.pause_state = pause
    TouchController.preventDefault = !pause

    if (self.config.layout === "functionkey") {
      const size = 0.08 * (h < w ? h : w)
      let offy = 0, offx = 0
      if (h > w) {
        offx = -w / 10
        offy = h / 2.5
      }

      if (pause) {
        const fLeft = h / 10 - size / 2 + offx
        const fTop = h / 10 - size / 2 + offy
        self.setButtonPositions({
          F1: [fLeft,                  fTop, size, size],
          F2: [fLeft + size * 1.5,     fTop, size, size],
          F4: [fLeft + size * 1.5 * 3, fTop, size, size],
          F7: [fLeft + size * 1.5 * 6, fTop, size, size]
        })
        for (const key of ["F1", "F2", "F4", "F7"]) {
          if (!self.hidden) showButton(self.button[key])
          self.button[key].disabled = 10
        }
      } else {
        self.setButtonPositions({
          F1: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F2: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F4: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F7: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size]
        })
        if (!self.hidden) showButton(self.button.F1)
        self.button.F1.disabled = false
        for (const key of ["F2", "F4", "F7"]) {
          hideButton(self.button[key])
          self.button[key].disabled = true
        }
      }
    }
  }

  hide() {
    const self = this
    for (const key in self.button) {
      hideButton(self.button[key])
      self.button[key].disabled = true
    }
    if (self.dpad) self.dpad.style.visibility = "hidden"
    self.hidden = true
  }

  show() {
    const self = this
    self.hidden = false
    for (const key in self.button) {
      showButton(self.button[key])
      self.button[key].disabled = false
    }
    if (self.dpad) self.dpad.style.visibility = "visible"
  }

  restart() {
    if (this.config.layout === "functionkey") this.paused(false)
  }

  clearStates() {
    for (const key in this.state) this.state[key] = 0
  }

  fetch() {
    const self = this
    // Draggable analog joystick: the center hub follows the touch within the
    // disc, and direction is computed from the hub's offset (with a center
    // dead zone). The hub snaps back to center when the touch lifts.
    if (self.dpad) {
      const dirs = { up: 0, down: 0, left: 0, right: 0 }
      let active = null
      for (const touch of touches) {
        if (coreUtil.pointInRect(touch.clientX, touch.clientY, self.dpad)) {
          active = touch
          break
        }
      }
      if (active) {
        // clamp the hub to the disc radius
        let dx = active.clientX - self.dpad.cx
        let dy = active.clientY - self.dpad.cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxR = self.dpad.radius - self.hub.radius
        if (dist > maxR) {
          dx = dx / dist * maxR
          dy = dy / dist * maxR
        }
        // position the hub relative to the disc's top-left corner
        const discCenter = self.dpad.radius
        self.hub.style.left = (discCenter + dx - self.hub.radius) + "px"
        self.hub.style.top = (discCenter + dy - self.hub.radius) + "px"
        // dead zone in the center so a resting thumb reads as neutral
        const dead = maxR * 0.25
        if (dist > dead) {
          if (Math.abs(dx) > Math.abs(dy)) {
            dirs[dx > 0 ? "right" : "left"] = 1
          } else {
            dirs[dy > 0 ? "down" : "up"] = 1
          }
        }
      } else {
        // no touch on the disc — snap the hub back to center
        self.hub.style.left = (self.dpad.radius - self.hub.radius) + "px"
        self.hub.style.top = (self.dpad.radius - self.hub.radius) + "px"
      }
      for (const key of ["up", "down", "left", "right"]) {
        const down = dirs[key]
        if ((down && !self.state[key]) || (!down && self.state[key])) {
          for (const child of self.child) child.key(key, down)
          self.state[key] = down
        }
      }
    }
    for (const key in self.button) {
      if (self.button[key].disabled) {
        if (typeof self.button[key].disabled === "number") self.button[key].disabled -= 1
        continue
      }
      let down = false
      for (const touch of touches) {
        if (coreUtil.pointInRect(touch.clientX, touch.clientY, self.button[key])) {
          down = true
          break
        }
      }
      if ((down && !self.state[key]) || (!down && self.state[key])) {
        for (const child of self.child) child.key(key, down)
        self.state[key] = down
        self.button[key].el.classList.toggle("pressed", down)
      }
    }
  }

  flush() {}
}
