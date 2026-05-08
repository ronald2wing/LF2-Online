// demo_setup.js — demo mode fighter grouping UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import { VerticalMenuDialog, dialogKeyNav } from "engine/Game/manager-dialogs"

export function createDemoSetup(ctx) {
  const screen = {
    create: function () {
      const section = domQuery.queryUI('demo_setup')
      section.classList.add('stage_select_bg')

      this.dialog = new VerticalMenuDialog({
        canvas: domQuery.queryUI('demo_setup'),
        data: ctx.pack.data.UI.data.demo_setup_dialog,
        mousehover: true,
        html: true,
        valueCounts: [0, ctx.demo_groupings.length, 0],
        valueText: (i, v) => {
          if (i === 1) return ctx.demo_groupings[v].name  // Grouping
          return ""
        },
        onclick: (I) => screen._activate(I)
      })
      this.dialog.setValue(1, 3) // default grouping: 4 vs 4
    },
    _activate: function (I) {
      switch (I) {
        case 0: // Fight!
          ctx.manager.start_demo(true, this.dialog.getValue(1))
          break
        case 1: // Grouping value
          this.dialog.cycleValue(1, 1)
          break
        case 2: // Back
          ctx.manager.switch_UI('frontpage')
          break
      }
    }
  }
  dialogKeyNav(ctx, screen)
  return screen
}
