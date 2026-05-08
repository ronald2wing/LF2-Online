// demo_setup.js — demo mode fighter grouping UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import inputController from "engine/core/controller"
import { VerticalMenuDialog } from "engine/Game/manager-dialogs"

export function createDemoSetup(ctx) {
  return {
    bgcolor: '#10206c',
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
        onclick: (function (self) {
          return function (I) { self._activate(I) }
        })(this)
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
    },
    onactive: function () {
      inputController.block(false)
      ctx.addKeyNav(this, (e) => {
        switch (e.key) {
          case 'ArrowUp': case 'w': case 'W':
            e.preventDefault(); this.dialog.navUp(); break
          case 'ArrowDown': case 'x': case 'X':
            e.preventDefault(); this.dialog.navDown(); break
          case 'ArrowLeft': case 'a': case 'A':
            e.preventDefault()
            if (this.dialog.valueCounts[this.dialog.active_item]) this.dialog.cycleValue(this.dialog.active_item, -1)
            break
          case 'ArrowRight': case 'd': case 'D':
            e.preventDefault()
            if (this.dialog.valueCounts[this.dialog.active_item]) this.dialog.cycleValue(this.dialog.active_item, 1)
            break
          case 'Enter': case 's': case 'S':
            e.preventDefault(); this._activate(this.dialog.active_item); break
          case 'Escape':
            ctx.manager.switch_UI('frontpage'); break
        }
      })
    },
    deactive: function () {
      inputController.block(true)
      ctx.removeKeyNav(this)
    }
  }
}
