// recording.js — recording info UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import inputController from "engine/core/controller"

export function createRecording(ctx) {
  return {
    bgcolor: ctx.pack.data.UI.data.recording.bg_color,
    create: function () {
      const section = domQuery.queryUI('recording')
      section.classList.add('recording_bg')

      const title = document.createElement('div')
      title.className = 'recording_title'
      title.textContent = ctx.pack.data.UI.data.recording.title
      section.appendChild(title)

      const form = document.createElement('div')
      form.className = 'recording_form'
      section.appendChild(form)

      const nameInput = this._field(form, ctx.pack.data.UI.data.recording.name, ctx.settings.recording_name)
      const infoInput = this._field(form, ctx.pack.data.UI.data.recording.info, ctx.settings.recording_info)
      const emailInput = this._field(form, ctx.pack.data.UI.data.recording.email, ctx.settings.recording_email)

      const turnOn = document.createElement('label')
      turnOn.className = 'recording_turn_on'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'recording_checkbox'
      checkbox.checked = ctx.settings.record
      turnOn.appendChild(checkbox)
      turnOn.appendChild(document.createTextNode(' ' + ctx.pack.data.UI.data.recording.turn_on))
      form.appendChild(turnOn)

      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'recording_ok'
      ok.textContent = ctx.pack.data.UI.data.recording.ok
      ok.addEventListener('click', function () {
        ctx.settings.recording_name = nameInput.value
        ctx.settings.recording_info = infoInput.value
        ctx.settings.recording_email = emailInput.value
        ctx.settings.record = checkbox.checked
        ctx.manager.switch_UI('frontpage')
      })
      section.appendChild(ok)
    },
    onactive: function () {
      // Allow typing in the name/info/email fields.
      inputController.block(false)
    },
    deactive: function () {
      inputController.block(true)
    },
    _field: function (form, label, value) {
      const row = document.createElement('label')
      row.className = 'recording_field'
      const text = document.createElement('span')
      text.className = 'recording_label'
      text.textContent = label
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'recording_input'
      input.value = value || ''
      row.appendChild(text)
      row.appendChild(input)
      form.appendChild(row)
      return input
    }
  }
}
