// battle-mode.js — battle (army/reserve) mode logic, extracted from match.js.
//
// check_battle_reserves was originally a Match method; it takes the Match
// instance as its first argument because it reaches into match.battle_teams,
// match.character, match.background, match.data, and calls back into
// match.create_characters / match.random.

// Battle Mode: respawn a unit from a team's reserve when a battle unit dies.
export function checkBattleReserves(match) {
  const self = match
  if (!self.battle_mode || !self.battle_teams) return
  for (const team of [1, 2]) {
    const t = self.battle_teams[team]
    for (const unit of t.units) {
      let alive = 0
      for (const uid in self.character) {
        const ch = self.character[uid]
        if (ch.team === team && ch.id === unit.id && ch.health.hp > 0) alive++
      }
      while (alive < unit.in && unit.reserve > 0) {
        unit.reserve--
        alive++
        const pos = self.background.get_pos(team === 1 ? 0.15 : 0.85, self.random())
        pos.y = -800
        self.create_characters([{
          name: 'Soldier',
          controller: { type: 'AIscript', id: self.data.AI[0].id },
          id: unit.id,
          team: team,
          defense_rate: t.defense,
          battle_unit: true,
          unit_id: unit.id,
          pos: pos
        }], { pane: false })
      }
    }
  }
}
