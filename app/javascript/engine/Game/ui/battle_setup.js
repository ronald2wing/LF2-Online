// battle_setup.js — battle mode army configuration UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import select from "engine/Game/select"
import spriteRenderer from "engine/core/sprite-canvas"
import { bindKeyNav } from "engine/Game/manager-dialogs"

export function createBattleSetup(ctx) {
  const screen = {
    create: function () {
      const section = domQuery.queryUI('battle_setup')
      section.classList.add('battle_setup_bg')
      if (!ctx.manager._battle_config) {
        ctx.manager._battle_config = {
          teams: {
            1: { defense: 0, preset: 2 },  // Team 1: ×1.0, Balanced (M)
            2: { defense: 0, preset: 5 }   // Team 2: ×1.0, Inferior (M)
          },
          selectedTeam: 1
        }
      }
      this._build()
    },
    _unitSprite: function (id) {
      // Follower portraits are mooks (30-39) + items (122/123), which are NOT
      // in char_list (heroes only). Search the full character object list.
      const c = select.selectAll(ctx.pack.data.object, { type: 'character' }).find(ch => ch && ch.id === id)
      return c && c.pic ? spriteRenderer.resolve_resource(c.pic.replace('_f.png', '_s.png')) : ''
    },
    _separator: function () {
      const s = document.createElement('div')
      s.className = 'battle_separator'
      return s
    },
    _build: function () {
      const section = domQuery.queryUI('battle_setup')
      section.innerHTML = ''
      const cfg = ctx.manager._battle_config
      const panel = document.createElement('div')
      panel.className = 'battle_panel'
      section.appendChild(panel)

      const col1 = this._build_team(1, cfg.teams[1], cfg.selectedTeam === 1)
      const col2 = this._build_team(2, cfg.teams[2], cfg.selectedTeam === 2)
      panel.appendChild(col1)
      panel.appendChild(col2)

      const divider = document.createElement('div')
      divider.className = 'battle_divider'
      panel.appendChild(divider)

      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'battle_ok'
      ok.textContent = 'OK! (確定)'
      ok.addEventListener('click', () => this._start())
      panel.appendChild(ok)
    },
    _build_team: function (team, teamConfig, selected) {
      const col = document.createElement('div')
      col.className = 'battle_column' + (selected ? ' selected' : '')
      col.style.left = (team === 1 ? 0 : 351) + 'px'
      // Team-colored accents: Team 1 blue, Team 2 red.
      const teamColor = team === 1 ? '#4A7BD0' : '#E04040'

      // Team header (flag + name)
      const header = document.createElement('div')
      header.className = 'battle_team_header'
      const flag = document.createElement('span')
      flag.className = 'battle_flag'
      flag.style.background = teamColor
      header.appendChild(flag)
      const title = document.createElement('span')
      title.className = 'battle_team_title'
      title.textContent = 'Team ' + team + '（第' + (team === 1 ? '一' : '二') + '組）'
      header.appendChild(title)
      col.appendChild(header)
      col.appendChild(this._separator())

      // Hero section
      const heroLabel = document.createElement('div')
      heroLabel.className = 'battle_label'
      heroLabel.textContent = 'Hero (英雄)'
      col.appendChild(heroLabel)
      const heroRow = document.createElement('div')
      heroRow.className = 'battle_hero_row'
      const leaders = (ctx.manager._battle_leaders || []).filter(leader => leader.team === team)
      for (let i = 0; i < 4; i++) {
        const leader = leaders[i]
        const slot = document.createElement('div')
        slot.className = 'battle_hero_slot'
        if (leader) {
          const hero = (leader.selected >= 0 && ctx.char_list[leader.selected]) ? ctx.char_list[leader.selected] : null
          if (hero && hero.pic) {
            const img = document.createElement('img')
            img.className = 'battle_hero_sprite'
            img.src = spriteRenderer.resolve_resource(hero.pic.replace('_f.png', '_s.png'))
            slot.appendChild(img)
          }
          const letter = document.createElement('div')
          letter.className = 'battle_letter'
          letter.textContent = leader.type === 'human' ? 'I' : 'C'
          // Team-colored hero label (blue for Team 1, red for Team 2).
          letter.style.color = teamColor
          slot.appendChild(letter)
        }
        heroRow.appendChild(slot)
      }
      col.appendChild(heroRow)

      // Defense value
      const defense = document.createElement('div')
      defense.className = 'battle_defense'
      defense.textContent = 'Defense (防守力): '
      const dv = document.createElement('span')
      dv.className = 'battle_value_box'
      dv.textContent = '×' + ctx.battle_defenses[teamConfig.defense]
      defense.appendChild(dv)
      col.appendChild(defense)
      col.appendChild(this._separator())

      // Follower section
      const followerLabel = document.createElement('div')
      followerLabel.className = 'battle_label battle_follower_header'
      followerLabel.innerHTML = '<span>Follower (士兵)</span><span class="battle_diff">' + ctx.battle_presets[teamConfig.preset].name + '</span>'
      col.appendChild(followerLabel)
      const presetUnits = ctx.battle_presets[teamConfig.preset].units
      const unitList = ctx.battle_unit_types.map(type => presetUnits.find(p => p.id === type.id) || { id: type.id, in: 0, reserve: 0 })

      // Follower section: 2 rows of portraits, each with In-Screen + Reserve
      // number bands. Labels 場上/In Screen + 後備/Reserve flank EACH row's
      // numbers (Chinese at front, English at back), matching 18.gif.
      const numBox = (u, isReserve) => {
        // Reserve shows '-' when a unit has no in-screen presence at all.
        const value = isReserve ? (u.in === 0 ? '-' : u.reserve) : u.in
        const isZero = value === 0 || value === '-'
        return '<span class="battle_value_box' + (isZero ? ' battle_zero' : '') + '">' + value + '</span>'
      }
      const countLine = (rowUnits, frontLabel, backLabel, isReserve) => {
        const line = document.createElement('div')
        line.className = 'battle_count_line'
        line.innerHTML = '<span class="battle_count_legend_label">' + frontLabel + '</span>' +
          '<span class="battle_count_grid">' + rowUnits.map(u => numBox(u, isReserve)).join('') + '</span>' +
          '<span class="battle_count_legend_label battle_count_legend_back">' + backLabel + '</span>'
        return line
      }

      const followerWrap = document.createElement('div')
      followerWrap.className = 'battle_follower_wrap'
      for (let row = 0; row < 2; row++) {
        const rowUnits = unitList.slice(row * 6, row * 6 + 6)
        if (rowUnits.length === 0) break
        const rowDiv = document.createElement('div')
        rowDiv.className = 'battle_follower_row'

        const sprites = document.createElement('div')
        sprites.className = 'battle_follower_grid'
        for (const u of rowUnits) {
          const cell = document.createElement('div')
          cell.className = 'battle_follower'
          if (u.id >= 100) {
            // Drink item (Milk 122 / Beer 123): render the weapon sprite's first frame.
            const sheet = u.id === 122 ? 'sprite/weapon6.png' : 'sprite/weapon8.png'
            const box = document.createElement('div')
            box.className = 'battle_follower_sprite battle_follower_drink'
            box.style.backgroundImage = 'url(' + spriteRenderer.resolve_resource(sheet) + ')'
            box.style.backgroundSize = '265px 107px'
            box.style.backgroundPosition = '0 0'
            cell.appendChild(box)
          } else {
            const img = document.createElement('img')
            img.className = 'battle_follower_sprite'
            img.src = this._unitSprite(u.id)
            cell.appendChild(img)
          }
          sprites.appendChild(cell)
        }
        rowDiv.appendChild(sprites)

        rowDiv.appendChild(countLine(rowUnits, '場上', 'In Screen', false))
        rowDiv.appendChild(countLine(rowUnits, '後備', 'Reserve', true))

        followerWrap.appendChild(rowDiv)
      }
      col.appendChild(followerWrap)

      // Use default setting
      const useDefault = document.createElement('button')
      useDefault.type = 'button'
      useDefault.className = 'battle_use_default'
      useDefault.textContent = 'Use default setting (使用預設編排)'
      useDefault.addEventListener('click', () => {
        teamConfig.preset = 2  // Balanced (M)
        teamConfig.defense = 0
        this._build()
      })
      col.appendChild(useDefault)

      return col
    },
    _start: function () {
      ctx.manager.start_battle_match()
    },
    _key: function (e) {
      const cfg = ctx.manager._battle_config
      // Advance the selected team's defense/preset by `delta`, wrapping around.
      const cycle = function (field, delta, count) {
        const team = cfg.teams[cfg.selectedTeam]
        team[field] = (team[field] + delta + count) % count
      }
      switch (e.key) {
        case 'a': case 'A': case 'ArrowLeft':
          e.preventDefault(); cfg.selectedTeam = 1; this._build(); break
        case 'd': case 'D': case 'ArrowRight':
          e.preventDefault(); cfg.selectedTeam = 2; this._build(); break
        case 'w': case 'W': case 'ArrowUp':
          e.preventDefault()
          cycle('defense', 1, ctx.battle_defenses.length)
          this._build()
          break
        case 'x': case 'X': case 'ArrowDown':
          e.preventDefault()
          cycle('defense', -1, ctx.battle_defenses.length)
          this._build()
          break
        case 'q': case 'Q':
          e.preventDefault()
          cycle('preset', 1, ctx.battle_presets.length)
          this._build()
          break
        case 's': case 'S': case 'Enter':
          e.preventDefault(); this._start(); break
        case 'Escape':
          ctx.manager.switch_UI('frontpage'); break
      }
    }
  }
  bindKeyNav(ctx, screen, screen._key)
  return screen
}
