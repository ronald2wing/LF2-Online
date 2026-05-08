// hud.js — HUD / status-panel management, extracted from match.js.
//
// These were originally Match methods (plus one private helper nested inside
// create_characters); they take the Match instance as their first argument
// because they reach into match.panel, match.character, match.time,
// match.data.UI.data.panel, match.manager.panel_layer, and the battle-mode
// state (match.battle_mode / match.battle_teams / match.battle_config).

import spriteRenderer from "engine/core/sprite-canvas"
import domQuery from "engine/Game/dom-query"

// Battle-mode HUD accents: Team 1 blue, Team 2 red (19.gif).
const TEAM_COLORS = { 1: '#98B0FB', 2: '#FAB0A1' }

export function showHp(match) {
  const self = match
  if (!self.panel) return
  const P = self.data.UI.data.panel
  for (let i = 0; i < self.panel.length; i++) {
    if (self.panel[i].uid === undefined) continue
    const ch = self.character[self.panel[i].uid]
    if (!ch) continue
    let hp = Math.floor(ch.health.hp / ch.health.hp_full * P.hpw)
    let hp_bound = Math.floor(ch.health.hp_bound / ch.health.hp_full * P.hpw)
    if (hp < 0) { hp = 0 }
    if (hp_bound < 0) { hp_bound = 0 }
    self.panel[i].hp.set_w(hp)
    self.panel[i].hp_bound.set_w(hp_bound)
    self.panel[i].mp.set_w(Math.floor(ch.health.mp / ch.health.mp_full * P.mpw))
    if (ch.effect.heal && ch.effect.heal > 0 && self.time.t % 3 === 0) {
      self.panel[i].hp.set_bgcolor(P.hp_light)
    } else {
      self.panel[i].hp.set_bgcolor(P.hp_bright)
    }
  }
}

export function transformPanel(match, from_uid, to_uid) {
  const self = match
  // ==========panel==========
  let from_index = -1
  let to_index = -1
  for (const index in self.panel) {
    if (from_uid) {
      if (self.panel[index].uid === from_uid) {
        from_index = index
      }
    }
    if (to_uid) {
      if (self.panel[index].uid === to_uid) {
        to_index = index
      }
    }
  }
  if (from_index === -1) { return }
  if (to_index != -1) {
    self.panel[from_index].spic.temp_img = {0: self.panel[from_index].spic.img[0]}
    self.panel[from_index].spic.img[0] = self.panel[to_index].spic.img[0]
  } else {
    self.panel[from_index].spic.img = self.panel[from_index].spic.temp_img
  }
}

export function updateBattleHud(match) {
  const self = match
  const hud = domQuery.queryUI('battle_hud')
  if (!hud) return
  if (!self.battle_mode) { hud.style.display = 'none'; return }
  hud.style.display = 'block'

  const stats = { 1: { man: 0, hp: 0, reserve: 0, die: 0 }, 2: { man: 0, hp: 0, reserve: 0, die: 0 } }
  for (const uid in self.character) {
    const c = self.character[uid]
    if (!c || (c.team !== 1 && c.team !== 2)) continue
    const s = stats[c.team]
    if (c.health.hp > 0) { s.man++; s.hp += Math.floor(c.health.hp) }
    else { s.die++ }
  }
  if (self.battle_teams) {
    for (const team of [1, 2]) {
      const bt = self.battle_teams[team]
      if (!bt) continue
      for (const u of bt.units) stats[team].reserve += u.reserve
    }
  }

  let html = ''
  for (const team of [1, 2]) {
    const s = stats[team]
    const name = self.battle_config?.teams?.[team]?.name || ''
    const color = TEAM_COLORS[team]
    html += '<div class="battle_hud_team battle_hud_team' + team + '">'
      + '<div class="battle_hud_stats" style="color:' + color + '">Man: ' + s.man + '  HP: ' + s.hp + '  Reserve: ' + s.reserve + '  Die: ' + s.die + '</div>'
      + '<div class="battle_hud_diff" style="color:' + color + '">' + name + '</div>'
      + '</div>'
  }
  hud.innerHTML = html
}

export function createPane(match, i, pdata, uid, player) {
  const self = match
  const P = self.data.UI.data.panel
  const pane = self.panel[i]
  const X = P.pane_width * (i % 4)
  const Y = P.pane_height * Math.floor(i / 4)

  const spic = new spriteRenderer({
    canvas: self.manager.panel_layer,
    img: pdata.bmp.small,
    xy: { x: X + P.x, y: Y + P.y },
    wh: 'fit'
  })
  pane.uid = uid
  pane.name = player.name
  pane.spic = spic

  // The four bars are (back, front) pairs sharing a position and size: the
  // bound bar is the dark track, the value bar the bright fill on top.
  const bar = (x, y, w, h, color) => {
    const sp = new spriteRenderer({ canvas: self.manager.panel_layer })
    sp.set_x_y(X + x, Y + y)
    sp.set_w_h(w, h)
    sp.set_bgcolor(color)
    return sp
  }
  pane.hp_bound = bar(P.hpx, P.hpy, P.hpw, P.hph, P.hp_dark)
  pane.hp = bar(P.hpx, P.hpy, P.hpw, P.hph, P.hp_bright)
  pane.mp_bound = bar(P.mpx, P.mpy, P.mpw, P.mph, P.mp_dark)
  pane.mp = bar(P.mpx, P.mpy, P.mpw, P.mph, P.mp_bright)

  // Battle mode: a team flag (blue Team1 / red Team2) sits at the top-left of
  // each leader's status block (19.gif).
  if (player.leader) {
    const flags = domQuery.queryUI('panel_flags')
    if (flags) {
      const flag = document.createElement('div')
      flag.className = 'battle_hud_flag'
      flag.style.background = player.team === 2 ? '#D83A3A' : '#3A6BD8'
      flag.style.left = (X + 5) + 'px'
      flag.style.top = (Y + 4) + 'px'
      flags.appendChild(flag)
    }
  }
}
