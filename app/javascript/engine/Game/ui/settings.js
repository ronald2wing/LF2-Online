// settings.js — control settings UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import inputController from "engine/core/controller"
import { MUSIC_OPTIONS, musicOptionName } from "engine/Game/music"

export function createSettings(ctx) {
  return {
    create: function () {
      const section = domQuery.queryUI('settings')
      section.classList.add('settings_bg')

      const title = document.createElement('div')
      title.className = 'settings_title'
      title.textContent = ctx.pack.data.UI.data.settings.title
      section.appendChild(title)

      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'settings_ok'
      ok.textContent = ctx.pack.data.UI.data.settings.ok
      ok.addEventListener('click', () => {
        // The original writes the bindings to data/control.txt when you press
        // ok; cancel leaves them unsaved.
        ctx.manager.save_settings()
        ctx.manager.switch_UI('frontpage')
      })
      section.appendChild(ok)

      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.className = 'settings_cancel'
      cancel.textContent = ctx.pack.data.UI.data.settings.cancel
      cancel.addEventListener('click', () => ctx.manager.switch_UI('frontpage'))
      section.appendChild(cancel)

      this.keychanger.call(this)
      this.music_changer.call(this)
    },
    music_changer: function () {
      const existing = domQuery.queryUI('music_changer')
      if (existing) {
        existing.parentNode.removeChild(existing)
      }
      const box = document.createElement('div')
      box.className = 'music_changer'
      const label = document.createElement('span')
      label.textContent = 'Music: '
      box.appendChild(label)
      const value = document.createElement('span')
      value.className = 'music_value'
      box.appendChild(value)
      const hint = document.createElement('div')
      hint.className = 'music_hint'
      hint.textContent = '(Press Left/Right to change)'
      box.appendChild(hint)
      domQuery.queryUI('settings').appendChild(box)
      this.music_value = value
      this._update_music()
    },
    _update_music: function () {
      if (this.music_value) {
        this.music_value.textContent = musicOptionName(ctx.settings.music)
      }
    },
    _cycle_music: function (dir) {
      // Positions: -1 = "Default" (no choice), then 0..N-1 = MUSIC_OPTIONS.
      const current = ctx.settings.music === undefined ? -1 : ctx.settings.music
      const length = MUSIC_OPTIONS.length
      let next = current + dir
      if (next < -1) next = length - 1
      if (next >= length) next = -1
      ctx.settings.music = next === -1 ? undefined : next
      ctx.manager.save_settings()
      this._update_music()
      ctx.manager.sound.play('1/m_cancel')
    },
    keychanger: function () {
      const screen = this
      const existing = domQuery.queryUI('keychanger')
      if (existing) {
        existing.parentNode.removeChild(existing)
      }
      const keychanger = document.createElement('div')
      keychanger.className = 'keychanger'
      domQuery.queryUI('settings').appendChild(keychanger)
      create_at(keychanger, 'br')
      const table = create_at(keychanger, 'table')
      const row = []
      let change_active = false
      const column = this.column = []
      // Display labels for the control config keys, matching the official LF2 panel.
      const control_labels = {
        up: 'Up (上)',
        down: 'Down (下)',
        left: 'Left (左)',
        right: 'Right (右)',
        att: 'Attack (攻)',
        jump: 'Jump (跳)',
        def: 'Defend (守)'
      }

      table.style.display = 'inline-block'
      for (let r = 0; r < 9; r++) {
        row[r] = create_at(table, 'tr')
      }
      let labelRow = 0
      left_cell(row[labelRow++], 'name')
      left_cell(row[labelRow++], 'type')
      for (const control_name in ctx.settings.control[0].config) {
        left_cell(row[labelRow++], control_labels[control_name] || control_name)
      }
      for (let i = 0; i < ctx.session.control.length; i++) {
        column[i] = new Control(i)
      }

      function Control(num) {
        const name = right_cell(row[0], '')
        const type = right_cell(row[1], '')
        const cells = {}
        let i = 2
        for (const I in ctx.settings.control[0].config) {
          cells[I] = add_changer(row[i++], I)
        }
        this.update = update
        update()
        if (ctx.session.control[num].role === undefined) {
          name.onclick = function () {
            const current = name.textContent
            const value = prompt('Enter player name:', current) || current
            ctx.settings.player[num - ctx.session.control.my_offset].name = value
            name.textContent = value
          }
        }
        function add_changer(R, name) {
          const cell = right_cell(R, '')
          let target
          cell.onclick = function () {
            if (ctx.session.control[num].type === 'keyboard') {
              if (!change_active) {
                change_active = true
                screen._changing_key = true
                target = this
                target.style.color = '#FFF'
                target.style.backgroundColor = '#5670C7'
                document.addEventListener('keydown', keydown, true)
              } else {
                if (target) {
                  target.style.color = ''
                  target.style.backgroundColor = ''
                  target = null
                  change_active = false
                  screen._changing_key = false
                }
                document.removeEventListener('keydown', keydown, true)
              }
            }
          }
          function keydown(e) {
            const con = ctx.session.control[num]
            const value = e.keyCode
            cell.innerHTML = inputController.keycode_to_keyname(value)
            con.config[name] = inputController.keycode_to_keyname(value)
            con.keycode[name] = value
            target.style.color = ''
            target.style.backgroundColor = ''
            change_active = false
            screen._changing_key = false
            document.removeEventListener('keydown', keydown, true)
          }
          return cell
        }
        function update() {
          const con = ctx.session.control[num]
          name.textContent = ctx.session.player[num].name
          type.innerHTML = con.role === 'remote' ? 'network' : con.type
          for (const I in cells) {
            // Remote network controllers have no local key mapping (their
            // keys live on the peer's machine), so they carry no `config`.
            cells[I].innerHTML = con.config ? con.config[I] : ''
          }
        }
        if (ctx.session.control[num].role === undefined) {
          type.onclick = function () {
            if (ctx.session.control[num].type === 'keyboard') { // switch to touch
              ctx.settings.control[num].type = 'touch'
              ctx.session.control[num] = ctx.controllers.touch.c
              ctx.session.control.f = ctx.controllers.touch.f
            } else { // switch to keyboard
              ctx.settings.control[num].type = 'keyboard'
              ctx.session.control[num] = ctx.controllers.keyboard['c' + num]
              ctx.session.control.f = ctx.controllers.keyboard.f
            }
            update()
          }
        }
      }

      function create_at(parent, tag, id) {
        const E = document.createElement(tag)
        parent.appendChild(E)
        if (id) {
          E.id = id
        }
        return E
      }

      function add_cell(row, content) {
        const td = create_at(row, 'td')
        td.innerHTML = content
        return td
      }
      function left_cell(A, B) {
        const cell = add_cell(A, B)
        cell.className = 'left_cell'
        return cell
      }
      function right_cell(A, B) {
        const cell = add_cell(A, B)
        cell.style.cursor = 'pointer'
        return cell
      }
    },
    onactive: function () {
      for (let i = 0; i < this.column.length; i++) {
        this.column[i].update()
      }
      ctx.addKeyNav(this, (e) => {
        // Ignore Left/Right while a control cell is being rebound (any key
        // pressed there is captured as the new binding).
        if (this._changing_key) return
        switch (e.key) {
          case 'Escape':
            // The original leaves this screen through its ok/cancel buttons
            // (ESC quits the game there, which is not worth reproducing). This
            // is a deliberate extra hatch so the screen can never trap anyone.
            e.preventDefault()
            ctx.manager.switch_UI('frontpage')
            break
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault()
            this._cycle_music(-1)
            break
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault()
            this._cycle_music(1)
            break
        }
      })
    },
    deactive: function () {
      ctx.removeKeyNav(this)
    }
  }
}
