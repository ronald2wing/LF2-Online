/*
 * touchcontroller.js
 *
 * On-screen touch controls for mobile / tablet.
 * Supports "gamepad" (d-pad + buttons) and "functionkey" (F1–F7) layouts.
 */

import domQuery from "engine/Game/dom-query"
import coreUtil from "engine/core/util"

const controllers = []
let touches = []

function touchHandler(event) {
  if (!TouchController.enabled) return
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

// Glyphs for the action buttons, copied from lf2-port's touch_controls.c
// (sword_icon / jump_icon / shield_icon): crossed swords for attack, a double
// chevron for jump, a shield for defend. Inline SVG so they scale with the
// button and need no image assets. Each is centred on (12,12) in a 24-unit box.
const ACTION_ICONS = {
  att: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
       '<path d="M7.25 7.25 L15.25 15.25"/><path d="M12 15.5 L15.5 12"/>' +
       '<path d="M16.75 7.25 L8.75 15.25"/><path d="M8.5 12 L12 15.5"/>' +
       '</g><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">' +
       '<path d="M15.25 15.25 L16.75 16.75"/><path d="M8.75 15.25 L7.25 16.75"/>' +
       '</g></svg>',
  jump: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M7.75 11.25 L12 7.5 L16.25 11.25"/><path d="M7.75 15.25 L12 11.5 L16.25 15.25"/>' +
        '</g></svg>',
  def:  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7.75 7.5 H16.25 V12.25 L12 17 L7.75 12.25 Z" fill="currentColor" fill-opacity="0.5"/>' +
        '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M7.75 7.5 H16.25 V12.25 L12 17 L7.75 12.25 Z"/><path d="M12 7.5 V17"/><path d="M7.75 9.9 H16.25"/>' +
        '</g></svg>'
}

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
      // `icon` buttons get lf2-port's vector glyph and per-action colour (see
      // the .action_* rules in application.css); the function keys keep letters.
      self.button = {
        def:   { label: "D", icon: "def",  name: "defend" },
        jump:  { label: "J", icon: "jump", name: "jump" },
        att:   { label: "A", icon: "att",  name: "attack" }
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
      domQuery.queryUI("touch_control_holder").appendChild(el)
      el.className = "touch_controller_button action"
      if (self.button[key].icon) {
        el.classList.add("action_" + self.button[key].icon)
        el.setAttribute("aria-label", self.button[key].name)
        el.innerHTML = ACTION_ICONS[self.button[key].icon]
      } else {
        el.innerHTML = "<span>" + self.button[key].label + "</span>"
      }
      self.button[key].el = el
    }

    // single circular joystick-style d-pad disc (gamepad layout only)
    if (config.layout === "gamepad") {
      self.dpad = document.createElement("div")
      self.dpad.className = "touch_dpad"
      domQuery.queryUI("touch_control_holder").appendChild(self.dpad)
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
      const rootRect = domQuery.root ? domQuery.root.getBoundingClientRect() : { left: 0, right: w, bottom: h }
      const canvasLeft = rootRect.left || 0
      const canvasWidth = (rootRect.right || w) - canvasLeft
      const canvasBottom = rootRect.bottom || h

      // Circular joystick-style d-pad disc in the BOTTOM-LEFT corner.
      const cx = canvasLeft + dpad * 0.9
      const cy = centerY
      self.dpad.style.left = (cx - dpad / 2) + "px"
      self.dpad.style.top = (cy - dpad / 2) + "px"
      self.dpad.style.width = dpad + "px"
      self.dpad.style.height = dpad + "px"
      self.dpad.left = cx - dpad / 2
      self.dpad.top = cy - dpad / 2
      self.dpad.right = cx + dpad / 2
      self.dpad.bottom = cy + dpad / 2
      self.dpad.cx = cx
      self.dpad.cy = cy
      self.dpad.radius = dpad / 2

      // recessed center well
      const hubSize = dpad * 0.34
      self.hub.style.left = (dpad / 2 - hubSize / 2) + "px"
      self.hub.style.top = (dpad / 2 - hubSize / 2) + "px"
      self.hub.style.width = hubSize + "px"
      self.hub.style.height = hubSize + "px"
      self.hub.radius = hubSize / 2
      self.hub.cx = cx
      self.hub.cy = cy

      // Action cluster anchored to the BOTTOM-RIGHT corner, exactly as the port
      // places it: `edge` in from the canvas's right and bottom edges, with the
      // triangle (D upper left, J bottom centre, A upper right) laid out in
      // units of the button size. The d-pad keeps its own anchor above.
      const edge = Math.max(16, action * 0.32)
      const clusterLeft = canvasLeft + canvasWidth - edge - action * 3.2
      const clusterTop = canvasBottom - edge - action * 2.65
      self.setButtonPositions({
        def:  [clusterLeft,                clusterTop + action * 0.72, action, action],
        jump: [clusterLeft + action * 1.05, clusterTop + action * 1.62, action, action],
        att:  [clusterLeft + action * 2.10, clusterTop + action * 0.72, action, action]
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
      const size = Math.min(w, h) * 0.08
      let offx = 0
      let offy = 0
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
        // F2/F4/F7 are stacked on F1's spot: only F1 is shown here, so they
        // share the same position.
        const fPos = [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size]
        self.setButtonPositions({
          F1: fPos,
          F2: fPos,
          F4: fPos,
          F7: fPos
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

  setVisible(visible) {
    const self = this
    for (const key in self.button) {
      (visible ? showButton : hideButton)(self.button[key])
      self.button[key].disabled = !visible
    }
    if (self.dpad) self.dpad.style.visibility = visible ? "visible" : "hidden"
    self.hidden = !visible
  }

  hide() {
    this.setVisible(false)
  }

  show() {
    this.setVisible(true)
  }

  restart() {
    if (this.config.layout === "functionkey") this.paused(false)
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
}
