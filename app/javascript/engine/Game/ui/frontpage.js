// frontpage.js — main menu UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import { show, hide } from "engine/Game/manager-dialogs"

export function createFrontpage(ctx) {
  return {
    create: function () {
      const content = domQuery.queryUI('frontpage_content')
      content.classList.add('frontpage_bg')

      const title = document.createElement('div')
      title.className = 'frontpage_title'
      title.textContent = ctx.pack.data.UI.data.frontpage.title
      content.appendChild(title)

      if (ctx.pack.data.UI.data.frontpage.subtitle) {
        const subtitle = document.createElement('span')
        subtitle.className = 'frontpage_subtitle'
        subtitle.textContent = ctx.pack.data.UI.data.frontpage.subtitle
        title.appendChild(subtitle)
      }

      const menu = this._buildMenu('frontpage_menu', 'frontpage_menu_item',
        ctx.pack.data.UI.data.frontpage.menu, (i) => this._onMenuClick(i))
      content.appendChild(menu)
      // default-select the first main menu item on load
      this._setActive(menu.getElementsByClassName('frontpage_menu_item')[0], 'frontpage_menu_item')

      // game start mode menu (shown when "game start" is clicked)
      const modeMenu = this._buildMenu('frontpage_mode_menu', 'frontpage_mode_item',
        ctx.pack.data.UI.data.frontpage.mode_menu, (i) => this._onModeClick(i))
      modeMenu.style.display = 'none'
      content.appendChild(modeMenu)
    },
    _buildMenu: function (menuClass, itemClass, labels, onClick) {
      const menu = document.createElement('div')
      menu.className = menuClass
      for (let i = 0; i < labels.length; i++) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = itemClass
        btn.textContent = labels[i]
        btn.addEventListener('mouseenter', () => this._setActive(btn, itemClass))
        btn.addEventListener('mouseleave', () => this._setActive(null, itemClass))
        btn.addEventListener('click', () => onClick(i))
        menu.appendChild(btn)
      }
      return menu
    },
    _setActive: function (btn, itemClass) {
      const items = domQuery.queryUI('frontpage_content').getElementsByClassName(itemClass)
      for (const el of items) {
        el.classList.toggle('active', el === btn)
      }
    },
    _showMenu: function (menuName) {
      const content = domQuery.queryUI('frontpage_content')
      const showMain = menuName === 'main'
      const mainMenu = content.getElementsByClassName('frontpage_menu')[0]
      const modeMenu = content.getElementsByClassName('frontpage_mode_menu')[0]
      if (mainMenu) mainMenu.style.display = showMain ? '' : 'none'
      if (modeMenu) modeMenu.style.display = showMain ? 'none' : ''
    },
    menuActions: [
      function () { this._showMenu('mode') }, // game start
      function () { // network game
        if (window.location.href.indexOf('http') === 0) {
          ctx.manager.switch_UI('network_game')
        } else {
          ctx.manager.alert('network game must run under http://')
        }
      },
      'settings', // control settings
      function () { ctx.manager.switch_UI('recording') }, // recording info
      function () { window.open('https://lf2.net', '_blank') }, // official website
    ],
    modeActions: [
      function () { ctx.manager.start_game() }, // VS mode
      function () { ctx.manager.start_stage_mode() }, // Stage mode
      function () { ctx.manager.start_championship(2) }, // 1 on 1 Championship
      function () { ctx.manager.start_championship(3) }, // 2 on 2 Championship
      function () { ctx.manager.start_battle_mode() }, // Battle mode
      function () { ctx.manager.switch_UI('demo_setup') }, // Demo
      function () { ctx.manager.playback_recording() }, // Playback Recording
      function () { this._showMenu('main') }, // Quit
    ],
    _onMenuClick: function (index) {
      this._dispatch(this.menuActions[index])
    },
    _onModeClick: function (index) {
      this._dispatch(this.modeActions[index])
    },
    _dispatch: function (action) {
      if (!action) return
      if (typeof action === 'function') {
        action.call(this)
      } else {
        ctx.manager.switch_UI(action)
      }
    },
    onactive: function () {
      this.demax(!ctx.window_state.maximized)
      // reset to the main menu when returning to the frontpage
      this._showMenu('main')
    },
    deactive: function () {
      this.demax(true)
    },
    demax: function (demax) {
      if (!demax) // maximize
      {
        let holder = domQuery.queryUI('frontpage')
        holder.parentNode.removeChild(holder)
        holder.classList.add('maximized')
        domQuery.root.insertBefore(holder, domQuery.root.firstChild)
        hide(domQuery.queryUI('window'))
        const canx = window.innerWidth / 2 - parseInt(window.getComputedStyle(domQuery.queryUI('frontpage_content'), null).getPropertyValue('width')) / 2
        if (canx < 0) {
          domQuery.queryUI('frontpage_content').style.left = canx + 'px'
        }
      } else // demaximize
      {
        let holder = domQuery.queryUI('frontpage')
        holder.parentNode.removeChild(holder)
        holder.classList.remove('maximized')
        domQuery.queryUI('window').insertBefore(holder, domQuery.queryUI('window').firstChild)
        show(domQuery.queryUI('window'))
        domQuery.queryUI('frontpage_content').style.left = ''
      }
    }
  }
}
