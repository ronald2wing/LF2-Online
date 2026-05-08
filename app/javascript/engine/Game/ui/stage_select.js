// stage_select.js — stage mode stage/difficulty selection UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import inputController from "engine/core/controller"
import { VerticalMenuDialog } from "engine/Game/manager-dialogs"

export function createStageSelect(ctx) {
  return {
    bgcolor: '#10206c',
    create: function () {
      const section = domQuery.queryUI('stage_select')
      section.classList.add('stage_select_bg')

      this.dialog = new VerticalMenuDialog({
        canvas: domQuery.queryUI('stage_select'),
        data: ctx.pack.data.UI.data.stage_mode_dialog,
        mousehover: true,
        html: true,
        valueCounts: [0, 0, 0, 6, ctx.diff_list.length, 0],
        valueText: (i, v) => {
          if (i === 3) return v === 5 ? "Survival" : String(v + 1)  // Stage 1-5, Survival
          if (i === 4) return ctx.diff_list[v]     // Difficulty
          return ""
        },
        onclick: (function (self) {
          return function (I) { self._activate(I) }
        })(this)
      })
      this.dialog.setValue(4, 2) // default difficulty: Difficult
    },
    _activate: function (I) {
      switch (I) {
        case 0: // Fight!
          ctx.manager.start_stage_match(this.dialog.getValue(3) * 5, 3, this.dialog.getValue(4))
          break
        case 1: // Reset All -> re-pick character
          ctx.manager.switch_UI('character_selection')
          break
        case 2: // Reset Random (not applicable in stage mode)
          ctx.manager.alert('reset random is not available in stage mode')
          break
        case 3: // Stage value
          this.dialog.cycleValue(3, 1)
          break
        case 4: // Difficulty value
          this.dialog.cycleValue(4, 1)
          break
        case 5: // Exit
          ctx.manager.switch_UI('frontpage')
          break
      }
    },
    onactive: function () {
      inputController.block(false)
      ctx.addKeyNav(this, (e) => {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            e.preventDefault()
            this.dialog.navUp()
            break
          case 'ArrowDown':
          case 'x':
          case 'X':
            e.preventDefault()
            this.dialog.navDown()
            break
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault()
            if (this.dialog.valueCounts[this.dialog.active_item]) {
              this.dialog.cycleValue(this.dialog.active_item, -1)
            }
            break
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault()
            if (this.dialog.valueCounts[this.dialog.active_item]) {
              this.dialog.cycleValue(this.dialog.active_item, 1)
            }
            break
          case 'Enter':
          case 's':
          case 'S':
            e.preventDefault()
            this._activate(this.dialog.active_item)
            break
          case 'Escape':
            ctx.manager.switch_UI('frontpage')
            break
        }
      })
    },
    deactive: function () {
      inputController.block(true)
      ctx.removeKeyNav(this)
    }
  }
}
