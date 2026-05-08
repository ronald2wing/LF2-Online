// global.js — Game-wide constants for the LF2 fighting game engine.
//
// NOTE: Tweak entries in this file very carefully. Do not add or delete entries.

const G = {}

// -- Viewport / camera --
G.application = {}
const Application = G.application
Application.window = {}
Application.window.width = 794
Application.window.outer_width = 804
Application.window.wide_width = 1000
Application.window.height = 550
Application.window.outer_height = 590
Application.camera = {}
Application.camera.speed_factor = 1 / 18

// -- Combo definitions --
// Input sequences that trigger special moves.
G.combo_list = [
  { name: 'D<A',  seq: ['def', 'left',  'att'],  clear_on_combo: false },
  { name: 'D>A',  seq: ['def', 'right', 'att'],  clear_on_combo: false },
  { name: 'DvA',  seq: ['def', 'down',  'att'] },
  { name: 'D^A',  seq: ['def', 'up',    'att'] },
  { name: 'D<J',  seq: ['def', 'left',  'jump'] },
  { name: 'D>J',  seq: ['def', 'right', 'jump'] },
  { name: 'DvJ',  seq: ['def', 'down',  'jump'] },
  { name: 'D^J',  seq: ['def', 'up',    'jump'] },
  { name: 'DJA',  seq: ['def', 'jump',  'att'] }
]

// Maps combo names to hit-tag names.
G.combo_tag = {
  def:    'hit_d',
  jump:   'hit_j',
  att:    'hit_a',
  'D<A':  'hit_Fa',
  'D>A':  'hit_Fa',
  DvA:    'hit_Da',
  'D^A':  'hit_Ua',
  'D<J':  'hit_Fj',
  'D>J':  'hit_Fj',
  DvJ:    'hit_Dj',
  'D^J':  'hit_Uj',
  DJA:    'hit_ja'
}

// Maps directional combos to their facing direction.
G.combo_dir = {
  'D<A':  'left',
  'D>A':  'right',
  'D<J':  'left',
  'D>J':  'right'
}

// Input priority — higher number takes precedence.
G.combo_priority = {
  up:    0,
  down:  0,
  left:  0,
  right: 0,
  def:   0,
  jump:  0,
  att:   0,
  run:   0,
  'D>A':  1,
  'D<A':  1,
  DvA:   1,
  'D^A':  1,
  DvJ:   1,
  'D^J':  1,
  'D>J':  1,
  'D<J':  1,
  DJA:   1
}

// -- Gameplay constants --
G.gameplay = {}
const Gameplay = G.gameplay
Gameplay.framerate = 30

// Defaults — all can be overridden by data files.
// Any value that cannot be overridden should be moved out of this block.
Gameplay.default = {}
Gameplay.default.health = {}
Gameplay.default.health.hp_full = 500
Gameplay.default.health.mp_full = 500
Gameplay.default.health.mp_start = 200 // mp_start cannot be overridden

Gameplay.default.itr = {}
Gameplay.default.itr.zwidth = 15
Gameplay.default.itr.hit_stop = 3
Gameplay.default.itr.throw_injury = 10

Gameplay.default.cpoint = {}
Gameplay.default.cpoint.hurtable = 0
Gameplay.default.cpoint.cover = 0
Gameplay.default.cpoint.vaction = 135 // frame for being thrown

Gameplay.default.wpoint = {}
Gameplay.default.wpoint.cover = 0

Gameplay.default.effect = {}
Gameplay.default.effect.num = 0

Gameplay.default.fall = {}
Gameplay.default.fall.value = 20
Gameplay.default.fall.dvy = -6.9

Gameplay.default.character = {}
Gameplay.default.character.arest = 7

Gameplay.default.mechanics = {}
Gameplay.default.mechanics.mass = 1 // weight = mass * gravity

// Gameplay core constants — tweak carefully, these affect the entire game.
Gameplay.recover = {}
Gameplay.recover.fall = -0.45
Gameplay.recover.bdefend = -0.5

Gameplay.effect = {}
Gameplay.effect.num_to_id = 900 // offset to convert effect number to sprite id
Gameplay.effect.duration = 3 // default effect duration in TUs
Gameplay.effect.heal_max = 100 // max HP that can be healed
Gameplay.effect.disappear = {
  shadow_blink: 120,
  body_blink:   150,
}

Gameplay.character = {}
Gameplay.character.bounceup = {}
Gameplay.character.bounceup.limit = {}
Gameplay.character.bounceup.limit.xy = 13.4 // speed threshold for bounce-up
Gameplay.character.bounceup.limit.y  = 11   // Y threshold (bounce if either xy or y exceeded)
Gameplay.character.bounceup.y = 4.25 // bounce-up Y speed
Gameplay.character.bounceup.absorb = // dvx absorbed on bounce-up
  { 9: 1, 14: 4, 20: 10, 40: 20, 60: 30 }

Gameplay.defend = {}
Gameplay.defend.injury = {}
Gameplay.defend.injury.factor = 0.1 // fraction of injury taken through an effective defence
Gameplay.defend.break_limit = 40
Gameplay.defend.absorb = // dvx absorbed when defence breaks
  { 5: 0, 15: 5 }

Gameplay.fall = {}
Gameplay.fall.KO = 60
Gameplay.fall.wait180 = // wait on frame 180 depends on effect.dvy (stronger dvy → longer wait)
  { 7: 1, 9: 2, 11: 3, 13: 4, 15: 5, 17: 6 }

Gameplay.friction = {}
Gameplay.friction.fell = // friction on ground contact (speed → friction)
  { 2: 0, 3: 1, 5: 2, 6: 4, 9: 5, 13: 7, 25: 9 }

// Physics
Gameplay.min_speed = 1
Gameplay.gravity = 1.7

Gameplay.weapon = {}
Gameplay.weapon.bounceup = {} // weapon hitting the ground
Gameplay.weapon.bounceup.limit = 8
Gameplay.weapon.bounceup.speed = {}
Gameplay.weapon.bounceup.speed.y = -3.7
Gameplay.weapon.bounceup.speed.x = 3
Gameplay.weapon.bounceup.speed.z = 1.5
Gameplay.weapon.soft_bounceup = {} // heavy weapon hit by a punch
Gameplay.weapon.soft_bounceup.speed = {}
Gameplay.weapon.soft_bounceup.speed.y = -2

Gameplay.weapon.hit = {} // weapon hitting a target
Gameplay.weapon.hit.vx = -3
Gameplay.weapon.hit.vy = 0

Gameplay.weapon.reverse = {} // weapon hit while traveling in the air
Gameplay.weapon.reverse.factor = {}
Gameplay.weapon.reverse.factor.vx = -0.4
Gameplay.weapon.reverse.factor.vy = -2
Gameplay.weapon.reverse.factor.vz = -0.4

Gameplay.combo = {}
Gameplay.combo.timeout = 10 // TUs a combo remains effective after being fired

Gameplay.PROP_UNSET = -842150451 // sentinel for unspecified properties in data files
Gameplay.specialattack_projectiles = [201, 202] // attack IDs that shoot projectiles (for physics)

Gameplay.FRAME = {}
Gameplay.FRAME.RESET = 999   // transition to standing/default state
Gameplay.FRAME.DESTROY = 1000 // destroy the object
Gameplay.FRAME.DISAPPEAR = 1280

// -- Named state constants (replace magic numbers in character-state logic) --
Gameplay.STATE = {
  STANDING: 0,
  WALKING: 1,
  RUNNING: 2,
  ATTACK: 3,
  JUMP: 4,
  DASH: 5,
  ROWING: 6,
  DEFEND: 7,
  BROKEN_DEFEND: 8,
  CATCHING: 9,
  BEING_CAUGHT: 10,
  INJURED: 11,
  FALLING: 12,
  FROZEN: 13,
  LYING: 14,
  CROUCH: 15,
  DANCE_OF_PAIN: 16,
  DRINKING: 17,
  BURNING: 18,
  FIRERUN: 19,
  PROJECTILE_FLYING: 3000,
  PROJECTILE_HITTING: 3001,
  LIGHT_WEAPON_FLYING: 1002,
  LIGHT_WEAPON_GROUND: 1003,
  LIGHT_WEAPON_IDLE: 1004,
  HEAVY_WEAPON_FLYING: 2000,
  HEAVY_WEAPON_IDLE: 2004,
  DEEP_SPECIFIC: 301,
  TELEPORT_NEAREST: 400,
  TELEPORT_FURTHEST: 401,
  RUDOLF_SPECIFIC: 501,
  HEAL: 1700,
}

// Injury transition frames
Gameplay.FRAME_INJURY = {
  DEFEND_EFFECTIVE: 111,
  DEFEND_BROKEN: 112,
  PICK_LIGHT_WEAPON: 115,
  PICK_HEAVY_WEAPON: 116,
  FALL_FRONT: 180,
  RELEASED: 181,
  FALL_BACK: 186,
  FROZEN_FALL: 182,
  ICE_SOLID: 200,
  ICE_MELT: 38,
  BURN_TRANSITION: 203,
  BURN_START: 202,
  FALL_LIGHT: 220,
  FALL_MID: 222,
  FALL_HEAVY: 224,
  FALL_CRITICAL: 226,
}

// ITR (interaction) kinds
Gameplay.ITR_KIND = {
  NORMAL: 0,
  CATCH: 1,
  PICK_WEAPON: 2,
  SUPER_CATCH: 3,
  FALLING: 4,
  WEAPON_SWING: 5,
  PICK_WEAPON_EASY: 7,
  HEAL: 8,
  REFLECT_SHIELD: 9,
  FLUTE: 10,
  FLUTE_VARIANT: 11,
  ICE_COLUMN: 14,
  WHIRLWIND: 15,
  WHIRLWIND_VARIANT: 16,
}

// Effect numbers (applied per-hit)
Gameplay.EFFECT = {
  NORMAL: 0,
  BLOOD: 1,
  FIRE: 2,
  ICE: 3,
  EXPLOSION: 4,
  WEAK_FIRE: 20,
  WEAK_FIRE2: 21,
  WEAK_FIRE3: 22,
  WEAK_FIRE4: 23,
  WEAK_ICE: 30,
}

// Character/object IDs (hard-coded in LF2 logic)
Gameplay.ID = {
  FIREN: 7,
  FREEZE: 8,
  LOUIS: 6,
  LOUIS_EX: 50,
  FIRZEN: 51,
  TRANSFORM: 5,
  RUDOLF: 5,
  DAVIS: 11,
  DEEP: 1,
  FLY_CRASH: 10,
  ARMOR_PIECE_1: 217,
  ARMOR_PIECE_2: 218,
}

// Authority levels for frame transitions
Gameplay.AUTHORITY = {
  NATURAL: 0,
  MOVE: 10,
  SPECIAL: 11,
  ENVIRONMENTAL: 15,
  INTERACTION: 20,
  STRONG: 30,
  INHERIT: 99,
}

export default G
