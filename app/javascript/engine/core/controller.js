// Keyboard input controller for the LF2 fighting game engine.
// Supports multiple players, key state tracking, buffered input, and child controller dispatch.
// See: http://project--f.blogspot.hk/2012/11/keyboard-controller.html

document.addEventListener('keydown', keydown, true)
document.addEventListener('keyup', keyup, true)
function keydown(event) { return keyboardMaster.key(event, 1) }
function keyup(event) { return keyboardMaster.key(event, 0) }

const keyboardMaster = {
  block: true,
  child: [],
  key(event, down) {
    for (const child of this.child) {
      if (child.key(event.keyCode, down)) break
    }
    if (keyboardMaster.block) {
      event.preventDefault()
      return false
    }
  }
}

export default class Controller {
  constructor(config) {
    this.state = {}
    this.config = config || {}
    this.buf = []
    this.keycode = {}
    this.child = []

    keyboardMaster.child.push(this)
    this.clear_states()
    Object.keys(this.config).forEach(key => {
      this.keycode[key] = Controller.keyname_to_keycode(this.config[key])
    })
  }

  destroy() {
    const idx = keyboardMaster.child.indexOf(this)
    if (idx !== -1) { keyboardMaster.child.splice(idx, 1) }
  }

  type = 'keyboard'

  static block(bool) {
    keyboardMaster.block = bool
  }

  key(keyCode, down) {
    let caught = 0
    for (const key of Object.keys(this.config)) {
      if (this.keycode[key] === keyCode) {
        if (this.sync === false) {
          if (this.child) {
            for (const child of this.child) { child.key(key, down) }
          }
          this.state[key] = down
        } else {
          this.buf.push([key, down])
        }
        caught = 1
        break
      }
    }
    return caught
  }

  clear_states() {
    Object.keys(this.config).forEach(key => { this.state[key] = 0 })
  }

  fetch() {
    for (let i = 0; i < this.buf.length; i++) {
      const key = this.buf[i][0]
      const down = this.buf[i][1]
      if (this.child) {
        for (const child of this.child) { child.key(key, down) }
      }
      this.state[key] = down
    }
    this.buf.length = 0
  }

  flush() {
    this.buf = []
  }

  static keyname_to_keycode(keyname) {
    if (typeof keyname === 'number') { return keyname }
    let code
    if (keyname.length === 1) {
      const a = keyname.charCodeAt(0)
      if ((a >= 'a'.charCodeAt(0) && a <= 'z'.charCodeAt(0)) || (a >= 'A'.charCodeAt(0) && a <= 'Z'.charCodeAt(0))) {
        keyname = keyname.toUpperCase()
        code = keyname.charCodeAt(0)
      } else if (a >= '0'.charCodeAt(0) && a <= '9'.charCodeAt(0)) {
        code = keyname.charCodeAt(0)
      } else {
        switch (keyname) {
          case '`': code = 192; break
          case '-': code = 189; break
          case '=': code = 187; break
          case '[': code = 219; break
          case ']': code = 221; break
          case '\\': code = 220; break
          case ';': code = 186; break
          case "'": code = 222; break
          case ',': code = 188; break
          case '.': code = 190; break
          case '/': code = 191; break
          case ' ': code = 32; break
        }
      }
    } else {
      switch (keyname) {
        case 'ctrl': code = 17; break
        case 'shift': code = 16; break
        case 'enter': code = 13; break
        case 'up': code = 38; break
        case 'down': code = 40; break
        case 'left': code = 37; break
        case 'right': code = 39; break
        case 'space': code = 32; break
        case 'esc': code = 27; break
      }
    }
    if (keyname.length === 2) {
      if (keyname.charAt(0) === 'F') {
        code = 111 + parseInt(keyname.slice(1))
      }
    }
    return code
  }

  static keycode_to_keyname(code) {
    if ((code >= 'A'.charCodeAt(0) && code <= 'Z'.charCodeAt(0)) ||
      (code >= '0'.charCodeAt(0) && code <= '9'.charCodeAt(0))) {
      return String.fromCharCode(code).toLowerCase()
    } else if (code >= 112 && code <= 123) {
      return 'F' + (code - 111)
    } else {
      let nam = code
      switch (code) {
        case 16: nam = 'shift'; break
        case 13: nam = 'enter'; break
        case 38: nam = 'up'; break
        case 40: nam = 'down'; break
        case 37: nam = 'left'; break
        case 39: nam = 'right'; break
        case 32: nam = 'space'; break
        case 27: nam = 'esc'; break
      }
      return nam
    }
  }
}
