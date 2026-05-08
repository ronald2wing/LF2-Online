/* LF2 Online — per-object properties (LF2 extended standard format).
 *
 * The engine looks up properties by object id: `match.spec[id].property`.
 * Each id maps to an object of properties for that object type.
 *
 * Merged: LF2_19 character/weapon/special properties + LF2 Online additions.
 */
const ID = {}

// ── Characters ──

// 1: Deep
ID[1] = {
  // hp: 500, mp: 500  // optional, uses engine defaults
}

// 30: Bandit
ID[30] = {
  dash_backattack: false,
  heavy_weapon_dash: false,
  heavy_weapon_jump: false
}

// ── Light weapons (id 100-149) ──

// 100: stick (baseball bat)
ID[100] = {
  mass: 0.3,
  attackable: true,
  run_throw: true,
  jump_throw: true,
  dash_throw: false,
  stand_throw: false,
  just_throw: false,
  no_shadow: false
}

// 101: hoe
ID[101] = {
  mass: 0.7,
  attackable: true,
  run_throw: true,
  jump_throw: true
}

// 120: knife
ID[120] = {
  attackable: true,
  run_throw: true,
  jump_throw: true
}

// 121: baseball
ID[121] = {
  attackable: true,
  run_throw: true,
  jump_throw: true,
  stand_throw: false,
  just_throw: false
}

// 124: boomerang (thrown immediately, flies out and returns)
ID[124] = {
  attackable: true,
  just_throw: true,
  run_throw: true,
  jump_throw: true
}

// ── Heavy weapons (id 150-199) ──

// 150: stone
ID[150] = {
  mass: 0.9
}

// ── Special attacks (id 200-299) ──

// 201: henry_arrow1
ID[201] = {
  mass: 0.3,
  zwidth: 1
}

// 202: rudolf_weapon
ID[202] = {
  mass: 0.3,
  zwidth: 1
}

// 203: deep_ball
ID[203] = {}

// 207: davis_ball
ID[207] = {}

// 212: ice column and whirlwind
ID[212] = {
  no_shadow: true
}

// 122: milk (drink — restores HP)
ID[122] = {
  hp_heal: 150
}

// 123: beer (drink — restores MP)
ID[123] = {
  mp_heal: 250
}

// 213: ice sword
ID[213] = {
  mass: 0.5,
  attackable: true,
  run_throw: true,
  jump_throw: true
}

// ── Effects (id 900-949) ──

// 900: hit
ID[900] = {
  oscillate: 4
}

// 902: fire
ID[902] = {
  oscillate: 3
}

export default ID
