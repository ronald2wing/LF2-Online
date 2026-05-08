// stage_select.js — stage mode stage/difficulty selection UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import { VerticalMenuDialog, dialogKeyNav } from "engine/Game/manager-dialogs"

export function createStageSelect(ctx) {
  const screen = {
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
        onclick: (I) => screen._activate(I)
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
    }
  }
  dialogKeyNav(ctx, screen)
  return screen
}
