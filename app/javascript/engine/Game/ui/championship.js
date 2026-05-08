// championship.js — championship bracket UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import spriteRenderer from "engine/core/sprite-canvas"
import { bindKeyNav } from "engine/Game/manager-dialogs"

const SVG_NS = 'http://www.w3.org/2000/svg'

export function createChampionship(ctx) {
  const screen = {
    create: function () {
      const section = domQuery.queryUI('championship')
      section.classList.add('stage_select_bg')
      this._build()
    },
    _build: function () {
      const section = domQuery.queryUI('championship')
      section.innerHTML = ''
      const ch = ctx.manager._championship
      if (!ch) return

      const panel = document.createElement('div')
      panel.className = 'championship_panel'

      const title = document.createElement('div')
      title.className = 'championship_title'
      title.textContent = ch.mode === 2 ? '1 on 1 Championship（淘汰賽）' : '2 on 2 Championship（淘汰賽）'
      panel.appendChild(title)

      panel.appendChild(this._build_bracket_svg(ch))

      const ents = document.createElement('div')
      ents.className = 'championship_entrants'
      for (let i = 0; i < ch.entrants.length; i++) {
        const e = ch.entrants[i]
        const entry = document.createElement('div')
        entry.className = 'championship_entrant'
        const members = e.members || [e]
        if (e.members && e.label) {
          // 2on2: team label, colored (blue/red/green/yellow).
          const label = document.createElement('div')
          label.className = 'championship_team_label'
          label.style.color = e.color
          label.textContent = e.label
          entry.appendChild(label)
        }
        const spritesRow = document.createElement('div')
        spritesRow.className = 'championship_sprites_row'
        for (const m of members) {
          const img = document.createElement('img')
          img.className = 'championship_sprite'
          if (m.small) img.src = spriteRenderer.resolve_resource(m.small)
          spritesRow.appendChild(img)
        }
        entry.appendChild(spritesRow)
        const letter = document.createElement('div')
        letter.className = 'championship_letter'
        letter.textContent = members.map(m => (m.isHuman ? 'I' : 'C')).join(' ')
        // Letter color: team color for 2on2, light blue for 1on1.
        letter.style.color = e.color || '#6C86D5'
        entry.appendChild(letter)
        ents.appendChild(entry)
      }
      panel.appendChild(ents)

      // Winner panel (post-match): champion portrait + "Winner/優勝者".
      if (ch.winner) {
        const wp = document.createElement('div')
        wp.className = 'championship_winner_panel'
        const wname = document.createElement('div')
        wname.className = 'championship_winner_name'
        wname.textContent = this._champ_name(ch.winner)
        wp.appendChild(wname)
        const members = ch.winner.members ? ch.winner.members : [ch.winner]
        for (const m of members) {
          const img = document.createElement('img')
          img.className = 'championship_winner_portrait'
          if (m.head) img.src = spriteRenderer.resolve_resource(m.head)
          wp.appendChild(img)
        }
        const wlabel = document.createElement('div')
        wlabel.className = 'championship_winner_label'
        wlabel.textContent = 'Winner 優勝者'
        wp.appendChild(wlabel)
        section.appendChild(wp)
      }

      section.appendChild(panel)
    },
    _build_bracket_svg: function (ch) {
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('class', 'championship_bracket')
      svg.setAttribute('viewBox', '0 0 530 330')

      const X0 = 20
      const X1 = 510
      const n = ch.entrants.length
      const span = (X1 - X0) / n
      const LEAF_Y = 215
      const WINNER_Y = 77
      const rounds = Math.log2(n)
      const roundHeight = (LEAF_Y - WINNER_Y) / rounds

      const leafX = []
      for (let i = 0; i < n; i++) leafX.push(X0 + (i + 0.5) * span)

      const winnerText = document.createElementNS(SVG_NS, 'text')
      winnerText.setAttribute('x', String((X0 + X1) / 2))
      winnerText.setAttribute('y', String(WINNER_Y - 12))
      winnerText.setAttribute('text-anchor', 'middle')
      winnerText.setAttribute('class', 'championship_bracket_text')
      // "Winner" color: lavender in 2on2, light blue in 1on1 (sampled from 17.gif/16.gif).
      winnerText.setAttribute('fill', ch.mode === 3 ? '#817FB7' : '#6C86D5')
      winnerText.textContent = 'Winner'
      svg.appendChild(winnerText)

      // Single-elimination tree: leaves at the bottom, converge up to the winner.
      let level = leafX.slice()
      let y = LEAF_Y
      while (level.length > 1) {
        const nextY = y - roundHeight
        for (const x of level) svg.appendChild(this._line(x, y, x, nextY))
        const next = []
        for (let i = 0; i < level.length; i += 2) {
          const a = level[i]
          const b = level[i + 1]
          svg.appendChild(this._line(a, nextY, b, nextY))
          next.push((a + b) / 2)
        }
        level = next
        y = nextY
      }
      // Champion → winner label
      svg.appendChild(this._line(level[0], y, level[0], WINNER_Y - 4))
      // Winner path (post-match): highlight the champion's leaf in the champion
      // team's color (2on2) or light blue (1on1).
      if (ch.winner) {
        const wi = ch.entrants.indexOf(ch.winner)
        if (wi >= 0) {
          const wp = this._line(leafX[wi], LEAF_Y, leafX[wi], WINNER_Y - 4)
          wp.setAttribute('stroke', ch.winner.color || '#425DAD')
          wp.setAttribute('stroke-width', '3')
          svg.appendChild(wp)
        }
      }
      return svg
    },
    _line: function (x1, y1, x2, y2) {
      const l = document.createElementNS(SVG_NS, 'line')
      l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1))
      l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2))
      l.setAttribute('class', 'championship_bracket_line')
      return l
    },
    // Drop the championship state and return to the main menu.
    _leave: function () {
      ctx.manager._championship = null
      ctx.manager.switch_UI('frontpage')
    },
    _key: function (e) {
      const ch = ctx.manager._championship
      if (!ch) return
      // Winner shown (post-match): Escape → main menu.
      if (ch.winner) {
        if (e.key === 'Escape') this._leave()
        return
      }
      // Waiting for the human to confirm their match ("press Attack to join").
      if (ch.waiting) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          ch.waiting = false
          ctx.manager._launch_championship_match(ch.bracket[ch.round])
        }
        return
      }
      switch (e.key) {
        case 'd':
        case 'D':
          e.preventDefault()
          ctx.manager._shuffle_championship()
          this._build()
          break
        case 'a':
        case 'A':
        case 'Enter':
          e.preventDefault()
          ctx.manager._start_championship_match()
          break
        case 'Escape':
          this._leave()
          break
      }
    }
  }
  bindKeyNav(ctx, screen, screen._key)
  return screen
}
