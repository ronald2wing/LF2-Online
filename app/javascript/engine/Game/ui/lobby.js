// lobby.js — network game lobby iframe UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"

export function createLobby(ctx) {
  return {
    start: function (server) {
      const iframe = domQuery.queryUI('lobby_window')
      iframe.src = server.address + '/lobby'
      iframe.onload = function () {
        iframe.contentWindow.postMessage({
          init: true,
          protocol: 'LF2 Online 0.1',
          room: 'LF2 Online'
        }, server.address)
      }
      domQuery.queryUI('lobby', 'close_button').onclick = function () {
        ctx.manager.switch_UI('network_game')
      }
      // cross window communication
      window.addEventListener('message', windowMessage, false)
      function windowMessage(event) {
        if (event.origin !== server.address) {
          return
        }
        if (event.data.event === 'start') {
          ctx.create_network_controllers(server, event.data)
          domQuery.queryUI('network_game_connect').onclick = null
          domQuery.queryUI('network_game_connect').innerHTML = '|'
          ctx.manager.switch_UI('network_game')
        }
      }
    }
  }
}
