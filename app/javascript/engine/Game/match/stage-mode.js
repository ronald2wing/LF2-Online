// stage-mode.js — single-player stage (arcade) mode logic, extracted from match.js.
//
// spawn_stage_wave was originally a Match method; it takes the Match instance
// as its first argument because it reaches into match.stage_config,
// match.stage_wave, match.data, match.background, and calls back into
// match._collectLoadIds / match.create_characters / match.random.

import select from "engine/Game/select"
import domQuery from "engine/Game/dom-query"
import { createWeapon } from "engine/Game/match/objects"
import { survivalTrack } from "engine/Game/music"

export function spawnStageWave(match) {
  const self = match
  if (!self.stage_mode || !self.stage_config) return
  if (self.stage_wave_spawning) return

  const waves = self.stage_config.waves
  if (self.stage_wave >= waves.length) return

  // Survival music follows the per-wave schedule (boss1/boss2/stage4); the
  // numbered campaign stages keep the single stage-level track started by
  // start_stage_match, so only survival re-triggers music here. A player's
  // music choice (resolved once in start_stage_match) overrides the schedule.
  if (self.survival) {
    self.manager.music.play(self.manager._music_override || survivalTrack(self.stage_wave))
  }

  self.stage_wave_spawning = true
  const wave = waves[self.stage_wave]
  const players = []
  const itemIds = []
  // Enemy HP scales with difficulty (Easy / Normal / Difficult / CRAZY!).
  // The stage data holds the base "Difficult" values.
  // Difficulty HP multipliers (official LF2: Easy 3/4, Normal/Difficult 1x,
  // CRAZY! 3/2 — from lf-empire.de stage.dat docs and the Stage Mode wiki).
  const hpFactor = [0.75, 1.0, 1.0, 1.5][self.difficulty] || 1.0

  for (let i = 0; i < wave.enemies.length; i++) {
    const enemy = wave.enemies[i]
    // "random hero" (id 1000 in official stage.dat) resolves to a random playable hero.
    const HEROES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11]
    const eid = enemy.random ? HEROES[Math.floor(self.random() * HEROES.length)] : enemy.id
    const obj = select.selectOne(self.data.object, { id: eid })
    // Milk/Beer (and other non-character objects) are pickups, not fighters
    if (obj && obj.type !== 'character') {
      itemIds.push(eid)
      continue
    }
    const hp = enemy.hp ? Math.round(enemy.hp * hpFactor) : 0
    players.push({
      name: enemy.name,
      controller: { type: 'AIscript', id: self.data.AI[0].id },
      id: eid,
      team: 2,  // enemy team
      criminal: eid === 300,  // hostage NPC — becomes an ally when defeated
      spec: hp ? { health: { hp: hp, hp_full: hp, hp_bound: hp } } : undefined
    })
  }

  // Collect object IDs for lazy loading (characters + drink items)
  const { objectIds: objIds, aiIds } = self._collectLoadIds(players)
  const loadIds = objIds.concat(itemIds)

  self.data.load({
    object: loadIds,
    AI: aiIds
  }, () => {
    // Survival: enemies spread across the right half (wiki: "far-right"), milk far-left.
    if (self.survival) {
      const count = players.length
      for (let i = 0; i < count; i++) {
        const rx = count === 1 ? 0.75 : 0.55 + (i / (count - 1)) * 0.35
        const rz = 0.35 + ((i % 3) / 2) * 0.3  // slight depth variation so they don't stack
        const pos = self.background.get_pos(rx, rz)
        players[i].pos = { x: pos.x, y: pos.y, z: pos.z }
      }
      const counter = domQuery.queryUI('stage_counter')
      if (counter) {
        counter.style.display = 'block'
        counter.textContent = 'Survival Stage: ' + self.stage_wave
      }
    }
    self.create_characters(players, { pane: false })
    for (let i = 0; i < itemIds.length; i++) {
      const pos = self.survival
        ? self.background.get_pos(0.1, 0.5)   // far-left milk
        : self.background.get_pos(self.random(), self.random())
      pos.y = -800
      createWeapon(self, itemIds[i], pos)
    }
    self.stage_wave_spawning = false
  })
}
