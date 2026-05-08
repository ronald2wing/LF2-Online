// objects.js — weapon/object management, extracted from match.js.
//
// Weapons are spawned, dropped from the sky, and destroyed here. These were
// originally Match methods; they take the Match instance as their first
// argument because they reach into match.data, match.scene, match.background,
// and the per-type object stores (match.lightweapon, match.heavyweapon, ...).

import factory from "engine/Game/factories"
import select from "engine/Game/select"

// Weapons occupy object id range [100, 200). Louis' armor pieces (217, 218)
// are dropped by the character itself, never randomly — so they are excluded.
export function isDropWeapon(object) {
  return object.id >= 100 && object.id < 200 && object.id !== 217 && object.id !== 218
}

// How many weapons a random drop scatters (F8 and the ~10s sky drop).
const WEAPONS_PER_DROP = 5

export function createWeapon(match, id, pos) {
  const self = match
  const object = select.selectOne(self.data.object, { id: id })
  if (!object) { console.error("create_weapon: no data for id", id); return }
  const type = object.type
  const wea_config = { match: self }
  try {
    const wea = new factory[type](wea_config, object.data, object.id)
    wea.set_pos(pos.x, pos.y, pos.z)
    const uid = self.scene.add(wea)
    self[type][uid] = wea
  } catch(e) {
    console.error("create_weapon failed:", id, type, e.message)
  }
}

export function dropWeapons(match) {
  const self = match
  const weapons = select.selectAll(self.data.object, isDropWeapon)
  for (let i = 0; i < WEAPONS_PER_DROP; i++) {
    const pos = self.background.get_pos(self.random(), self.random())
    pos.y = -800
    createWeapon(self, weapons[Math.floor(weapons.length * self.random())].id, pos)
  }
}

export function destroyWeapons(match) {
  const self = match
  for (const i in self.lightweapon) {
    self.lightweapon[i].health.hp = 0
  }
  for (const i in self.heavyweapon) {
    self.heavyweapon[i].health.hp = 0
  }
}
