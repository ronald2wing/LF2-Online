// network_game.js — network game server connection UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import global from "engine/Game/global"
import inputController from "engine/core/controller"
import { normalizeURL } from "engine/network"

export function createNetworkGame(ctx) {
  return {
    create: function () {
      const This = this
      const menu = domQuery.queryUI('network_game_menu')
      menu.classList.add('network_game_panel')

      // Title
      const title = document.createElement('h2')
      title.className = 'network_game_title'
      title.textContent = 'Network Game (連線遊戲)'
      menu.appendChild(title)

      // Server list: always offer the official lobby + this (self-hosted) server,
      // plus any custom servers the player has connected to before.
      const servers = { ...global.network.lobbyServers }
      servers['This Server (本伺服器)'] = location.origin || (location.protocol + '//' + location.host)
      for (const S in ctx.settings.server) {
        if (!(S in servers)) servers[S] = ctx.settings.server[S]
      }
      for (const S in servers) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'network_game_server'
        btn.textContent = S
        btn.onclick = (function (addr) { return function () {
          This.connect_to(addr)
        }})(servers[S])
        menu.appendChild(btn)
      }

      // Custom server
      const customLabel = document.createElement('label')
      customLabel.className = 'network_game_custom_label'
      customLabel.textContent = 'Custom Server (自訂伺服器)'
      menu.appendChild(customLabel)

      const addrInput = document.createElement('input')
      addrInput.type = 'url'
      addrInput.className = 'network_game_input'
      addrInput.placeholder = 'ws://myserver.com:8080'
      addrInput.value = This.last_value || ''
      menu.appendChild(addrInput)

      const connectBtn = document.createElement('button')
      connectBtn.type = 'button'
      connectBtn.className = 'network_game_connect'
      connectBtn.textContent = 'Connect'
      connectBtn.onclick = function () { This.connect_to(addrInput.value) }
      menu.appendChild(connectBtn)

      // Back / OK — "Back" until the network session is exchanged, then
      // relabelled "OK" (in create_network_controllers) to enter the game.
      const backBtn = document.createElement('button')
      backBtn.type = 'button'
      backBtn.className = 'network_game_back'
      backBtn.textContent = 'Back'
      backBtn.onclick = function () {
        if (This.ready) {
          ctx.manager.start_game()
        } else {
          ctx.manager.switch_UI('frontpage')
        }
      }
      menu.appendChild(backBtn)

      // Status log
      const log = document.createElement('div')
      log.className = 'network_game_log'
      log.id = 'network_status_log'
      menu.appendChild(log)

      // Store refs
      this.menu = menu
      this.addrInput = addrInput
      this.connectBtn = connectBtn
      this.statusLog = log
      this.ready = false
      this.last_value = location.origin || ''
    },
    connect_to: function(addr) {
      const This = this
      if (!addr) return
      addr = normalizeURL(addr)
      This.last_value = addr

      if (This.connecting) return
      This.statusLog.textContent = 'Connecting to ' + addr + '...'

      const request = new XMLHttpRequest()
      request.onreadystatechange = function() {
        if (this.readyState === 4) {
          This.connecting = false
          if (this.status === 200) {
            ctx.settings.server[addr] = addr
            This.statusLog.textContent = 'Connected! Opening lobby...'
            ctx.manager.UI_list.lobby.start({ address: addr, library: "network.js" })
            ctx.manager.switch_UI('lobby')
          } else if (this.status === 0) {
            This.statusLog.textContent = 'Could not reach ' + addr + ' — check the address and your connection.'
          } else {
            This.statusLog.textContent = 'Failed to connect to ' + addr + ' (HTTP ' + this.status + ')'
          }
        }
      }
      request.open('GET', addr + '/protocol', true)
      request.responseType = 'text'
      request.timeout = 3000
      request.send()
      This.connecting = true
    },
    onactive: function () {
      inputController.block(false)
      this.ready = false
    },
    deactive: function () {
      inputController.block(true)
    }
  }
}
