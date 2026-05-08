// gameplay.js — gameplay canvas/layer setup UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import spriteRenderer from "engine/core/sprite-canvas"
import spriteDOM from "engine/core/sprite-dom"
import global from "engine/Game/global"
import { SummaryDialog } from "engine/Game/manager-dialogs"

export function createGameplay(ctx) {
  return {
    allow_wide: true,
    create: function () {
      if (domQuery.queryUI('pause_message')) {
        const dat = ctx.pack.data.UI.data.message_overlay
        ctx.manager.overlay_mess = new spriteDOM({
          div: domQuery.queryUI('pause_message'),
          img: dat.pic
        })
        ctx.manager.overlay_mess.hide()
      }
      ctx.manager.gameplay = domQuery.queryUI('gameplay')
      ctx.manager.canvas = get_canvas()
      ctx.manager.background_layer = new spriteRenderer({
        canvas: ctx.manager.canvas,
        type: 'group'
      })
      ctx.manager.panel_layer = new spriteRenderer({
        canvas: ctx.manager.canvas,
        type: 'group',
        wh: { w: ctx.pack.data.UI.data.panel.width, h: ctx.pack.data.UI.data.panel.height }
      })
      ctx.manager.summary = new SummaryDialog({
        div: domQuery.queryUI('summary_dialog'),
        data: ctx.pack.data.UI.data.summary
      })

      if (spriteRenderer.renderer === 'DOM') {
        ctx.manager.panel_layer.el.className = 'panel'
        ctx.manager.background_layer.el.className = 'background'
      }
      const panels = []
      for (let i = 0; i < 8; i++) {
        const pane = new spriteRenderer({
          canvas: ctx.manager.panel_layer,
          img: ctx.pack.data.UI.data.panel.pic,
          wh: 'fit'
        })
        pane.set_x_y(ctx.pack.data.UI.data.panel.pane_width * (i % 4), ctx.pack.data.UI.data.panel.pane_height * Math.floor(i / 4))
        panels.push(pane)
      }
      function get_canvas() {
        if (spriteRenderer.renderer === 'DOM') {
          return new spriteRenderer({
            div: domQuery.queryUI('gameplay'),
            type: 'group'
          })
        } else if (spriteRenderer.renderer === 'canvas') {
          const canvas_node = domQuery.queryUI('gameplay').getElementsByClassName('canvas')[0]
          canvas_node.width = global.application.window.width
          canvas_node.height = global.application.window.height
          return new spriteRenderer({
            canvas: canvas_node,
            type: 'group',
            bgcolor: '#676767',
            wh: { w: global.application.window.width, h: global.application.window.height }
          })
        }
      }
    }
  }
}
