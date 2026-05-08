import spriteDOM from "engine/core/sprite-dom"
import coreUtil from "engine/core/util"

export function show(div) {
  div.style.display = ""
}

export function hide(div) {
  div.style.display = "none"
}

export function createTextBox(config) {
  const box = new spriteDOM({
    canvas: config.canvas,
    xywh: config.xywh,
  })
  box.el.classList.add("textbox")
  if (config.color) box.el.style.color = config.color
  box.el.style["line-height"] = config.xywh[3] + "px"
  return box.el
}

function _mouseTrans(el, e) {
  const rect = el.getBoundingClientRect()
  return {
    x: e.clientX - rect.left - el.clientLeft + el.scrollLeft,
    y: e.clientY - rect.top - el.clientTop + el.scrollTop,
  }
}

export class VerticalMenuDialog {
  constructor(config) {
    this.data = config.data
    this.html = !!config.html
    if (this.html) {
      this._buildHtml(config)
      return
    }
    this.dia = new spriteDOM({ canvas: config.canvas, type: "group" })
    this.bg = new spriteDOM({ canvas: this.dia, img: this.data.bg })
    this.menu = new spriteDOM({ canvas: this.dia, img: this.data.pic })
    this.it = new spriteDOM({ canvas: this.dia, img: this.data.pic })
    this.dia.set_x_y(this.data.x, this.data.y)

    for (const part of ["bg", "menu"]) this[part].set_x_y(0, 0)
    for (const part of ["dia", "bg", "menu"]) this[part].set_w_h(this.data.width, this.data.height)

    if (config.mousehover) {
      const self = this
      this.dia.el.onmousemove = (e) => self._mousemove(_mouseTrans(this.dia.el, e).x, _mouseTrans(this.dia.el, e).y)
      this.dia.el.onmouseout = () => self._mousemove(-10, -10)
      this.it.hide()

      if (config.onclick) {
        this.onclick = config.onclick
        this.dia.el.onmousedown = (e) => {
          const pt = _mouseTrans(this.dia.el, e)
          self._mousedown(pt.x, pt.y)
        }
      }
    } else {
      this.activateItem(0)
    }
  }

  _buildHtml(config) {
    const self = this
    this.dia = document.createElement("div")
    this.dia.className = "vmenu_dialog"
    this.dia.style.left = this.data.x + "px"
    this.dia.style.top = this.data.y + "px"
    this.dia.style.width = this.data.width + "px"
    this.dia.style.height = this.data.height + "px"
    config.canvas.appendChild(this.dia)

    // no-op sprite-like object so existing `this.dialog.it.hide()` calls work
    this.it = { hide: function () {}, show: function () {} }

    // value-cycling row support (HTML mode only)
    this.values = []
    this.valueCounts = config.valueCounts || []
    this.valueText = config.valueText || (() => "")

    this.buttons = []
    const labels = this.data.label || []
    for (let i = 0; i < this.data.item.length; i++) {
      const item = this.data.item[i]
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = "vmenu_item"
      btn.style.left = item[0] + "px"
      btn.style.top = item[1] + "px"
      btn.style.width = item[2] + "px"
      btn.style.height = item[3] + "px"
      this.dia.appendChild(btn)
      this.buttons.push(btn)
      this.values[i] = 0
      this._renderItem(i)
      btn.addEventListener("mouseenter", () => self.activateItem(i))
      btn.addEventListener("click", () => {
        if (self.onclick) self.onclick(i)
      })
    }

    if (config.onclick) {
      this.onclick = config.onclick
    }

    this.activateItem(0)
  }

  activateItem(num) {
    this.active_item = num ?? this.active_item
    if (this.html) {
      for (let i = 0; i < this.buttons.length; i++) {
        this.buttons[i].classList.toggle("active", i === this.active_item)
      }
      return
    }
    const item = this.data.item[this.active_item]
    this.it.set_x_y(item[0], item[1])
    this.it.set_img_x_y(-this.data.width - item[0], -item[1])
    this.it.set_w_h(item[2], item[3])
  }

  _renderItem(i) {
    const btn = this.buttons[i]
    const label = this.data.label[i] || ""
    btn.textContent = ""
    btn.appendChild(document.createTextNode(label))
    if (this.valueCounts[i]) {
      btn.appendChild(document.createTextNode(": "))
      const value = document.createElement("span")
      value.className = "vmenu_value"
      value.textContent = this.valueText(i, this.values[i])
      btn.appendChild(value)
    }
  }

  getValue(i) { return this.values[i] }

  setValue(i, v) {
    this.values[i] = v
    this._renderItem(i)
  }

  cycleValue(i, dir) {
    const count = this.valueCounts[i]
    if (!count) return
    this.values[i] = (this.values[i] + dir + count) % count
    this._renderItem(i)
  }

  navUp() {
    this.active_item = this.active_item > 0 ? this.active_item - 1 : this.data.item.length - 1
    this.activateItem()
  }

  navDown() {
    this.active_item = this.active_item < this.data.item.length - 1 ? this.active_item + 1 : 0
    this.activateItem()
  }

  show() {
    if (this.html) { show(this.dia); return }
    this.dia.show()
  }
  hide() {
    if (this.html) { hide(this.dia); return }
    this.dia.hide()
  }

  _mouseTarget(x, y) {
    for (let i = 0; i < this.data.item.length; i++) {
      if (coreUtil.pointInRect(x, y, this.data.item[i])) return i
    }
    return undefined
  }

  _mousemove(x, y) {
    const target = this._mouseTarget(x, y)
    if (coreUtil.defined(target)) {
      this.activateItem(target)
      this.it.show()
    } else {
      this.it.hide()
    }
  }

  _mousedown(x, y) {
    const target = this._mouseTarget(x, y)
    if (this.onclick && coreUtil.defined(target)) this.onclick(target)
  }
}

export class HorizontalNumberDialog {
  constructor(config) {
    this.data = config.data
    this.dia = new spriteDOM({ canvas: config.canvas, type: "group" })
    this.dia.set_x_y(this.data.x, this.data.y)
    this.bg = new spriteDOM({ canvas: this.dia, img: this.data.bg })
    this.bg.set_x_y(0, 0)

    for (const part of ["dia", "bg"]) this[part].set_w_h(this.data.width, this.data.height)

    this.it = []
    this.active_item = 0
    for (let i = 0; i <= 7; i++) {
      const sp = new spriteDOM({ canvas: this.dia })
      sp.set_x_y(this.data.item_x + i * this.data.item_space, this.data.item_y)
      sp.set_w_h(this.data.item_width, this.data.item_height)
      sp.el.classList.add("textbox")
      sp.el.style["line-height"] = this.data.item_height + "px"
      sp.el.innerHTML = String(i)
      this.it[i] = sp
    }
  }

  init(lower, upper) {
    for (let i = 0; i < this.it.length; i++) {
      this.it[i].el.style.color = this.data.inactive_color
    }
    for (let i = lower; i <= upper; i++) {
      this.it[i].el.style.color = this.data.active_color
    }
    this.activateItem(lower)
    this.lower_bound = lower
    this.upper_bound = upper
  }

  activateItem(num) {
    this.it[this.active_item].el.style.border = ""
    this.active_item = num
    this.it[this.active_item].el.style.border = "1px solid white"
  }

  navLeft() {
    this.activateItem(
      this.active_item > this.lower_bound ? this.active_item - 1 : this.upper_bound,
    )
  }

  navRight() {
    this.activateItem(
      this.active_item < this.upper_bound ? this.active_item + 1 : this.lower_bound,
    )
  }

  show() { this.dia.show() }
  hide() { this.dia.hide() }
}

export class SummaryDialog {
  constructor(config) {
    const data = (this.data = config.data)
    this.status_colors = [data.text_color[6], data.text_color[7]]

    this.dialog = new spriteDOM({
      div: config.div,
      type: "group",
      wh: { w: data.width, h: 100 },
    })
    this.hide()

    for (const part of ["head", "foot"]) {
      this[part + "_holder"] = new spriteDOM({ canvas: this.dialog, type: "group" })
      this[part] = new spriteDOM({
        canvas: this[part + "_holder"],
        img: data.pic,
        wh: { w: data.width, h: data[part][3] },
      })
      this[part].set_img_x_y(-data[part][0], -data[part][1])
    }

    this.rows = []
    for (let i = 0; i < 8; i++) {
      const gp = new spriteDOM({ canvas: this.dialog, type: "group" })
      const bg = new spriteDOM({
        canvas: gp,
        img: data.pic,
        wh: { w: data.width, h: data.body[3] },
      })
      bg.set_img_x_y(-data.body[0], -data.body[1])
      const icon = new spriteDOM({ canvas: gp, xywh: data.icon })
      this.rows[i] = { gp, icon, boxes: [] }
      for (let j = 0; j < data.text.length; j++) {
        this.rows[i].boxes.push(
          createTextBox({ canvas: gp, xywh: data.text[j], color: data.text_color[j] }),
        )
      }
      this.rows[i].boxes[0].style["font-size"] = "10px"
      this.rows[i].boxes[6].style["font-size"] = "9px"
    }

    this.time = createTextBox({
      canvas: this.foot_holder,
      xywh: data.time,
      color: data.time_color,
    })
  }

  show() { this.dialog.show() }
  hide() { this.dialog.hide() }

  setRows(num) {
    let y = this.data.head[3]
    for (let i = 0; i < 8; i++) {
      this.rows[i].gp.set_x_y(0, y)
      if (i < num) {
        y += this.data.body[3]
        this.rows[i].gp.show()
      } else {
        this.rows[i].gp.hide()
      }
    }
    this.foot_holder.set_x_y(0, y)
    y += this.data.foot[3]
    this.dialog.set_h(y)
  }

  setInfo(info) {
    this.setRows(info.length)
    for (let i = 0; i < info.length; i++) this.setRowData(i, info[i])
  }

  setTime(time) { this.time.innerHTML = time }

  setRowData(i, data) {
    const row = this.rows[i].boxes
    const icon = this.rows[i].icon
    icon.remove_img("0")
    icon.add_img(data[0], "0")
    for (let j = 1; j < data.length; j++) row[j - 1].innerHTML = data[j]
    row[6].style.color = data[7].indexOf("Win") !== -1
      ? this.status_colors[0]
      : this.status_colors[1]
  }
}
