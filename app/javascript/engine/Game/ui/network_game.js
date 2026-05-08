// network_game.js — network game server connection UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import global from "engine/Game/global"
import inputController from "engine/core/controller"
import { normalizeURL } from "engine/network"

export function createNetworkGame(ctx) {
  return {
    create: function () {
      const menu = domQuery.queryUI('network_game_menu')
      menu.classList.add('network_game_panel')

      const title = document.createElement('h2')
      title.className = 'network_game_title'
      title.textContent = 'Network Game (連線遊戲)'
      menu.appendChild(title)

      // Server list: always offer the official lobby + this (self-hosted) server,
      // plus any custom servers the player has connected to before.
      const servers = { ...global.network.lobbyServers }
      servers['This Server (本伺服器)'] = location.origin || (location.protocol + '//' + location.host)
      for (const name in ctx.settings.server) {
        if (!(name in servers)) servers[name] = ctx.settings.server[name]
      }
      for (const name in servers) {
        const address = servers[name]
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'network_game_server'
        button.textContent = name
        button.onclick = () => this.connectTo(address)
        menu.appendChild(button)
      }

      // Custom server
      const customLabel = document.createElement('label')
      customLabel.className = 'network_game_custom_label'
      customLabel.textContent = 'Custom Server (自訂伺服器)'
      menu.appendChild(customLabel)

      const addressInput = document.createElement('input')
      addressInput.type = 'url'
      addressInput.className = 'network_game_input'
      addressInput.placeholder = 'https://myserver.com'
      addressInput.value = this.lastValue || ''
      menu.appendChild(addressInput)

      const connectButton = document.createElement('button')
      connectButton.type = 'button'
      connectButton.className = 'network_game_connect'
      connectButton.textContent = 'Connect'
      connectButton.onclick = () => this.connectTo(addressInput.value)
      menu.appendChild(connectButton)

      // Back / OK — "Back" until the network session is exchanged, then
      // relabelled "OK" (in create_network_controllers) to enter the game.
      const backButton = document.createElement('button')
      backButton.type = 'button'
      backButton.className = 'network_game_back'
      backButton.textContent = 'Back'
      backButton.onclick = () => {
        if (this.ready) {
          ctx.manager.start_game()
        } else {
          ctx.manager.switch_UI('frontpage')
        }
      }
      menu.appendChild(backButton)

      // Status log
      const log = document.createElement('div')
      log.className = 'network_game_log'
      log.id = 'network_status_log'
      menu.appendChild(log)

      this.statusLog = log
      this.ready = false
      this.lastValue = location.origin || ''
    },
    connectTo: function (address) {
      if (!address) return
      address = normalizeURL(address)
      this.lastValue = address

      if (this.connecting) return
      this.statusLog.textContent = 'Connecting to ' + address + '...'

      const request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return
        this.connecting = false
        if (request.status === 200) {
          ctx.settings.server[address] = address
          this.statusLog.textContent = 'Connected! Opening lobby...'
          ctx.manager.UI_list.lobby.start({ address, library: "network.js" })
          ctx.manager.switch_UI('lobby')
          return
        }
        this.statusLog.textContent = request.status === 0
          ? 'Could not reach ' + address + ' — check the address and your connection.'
          : 'Failed to connect to ' + address + ' (HTTP ' + request.status + ')'
      }
      request.open('GET', address + '/protocol', true)
      request.responseType = 'text'
      request.timeout = 3000
      request.send()
      this.connecting = true
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
