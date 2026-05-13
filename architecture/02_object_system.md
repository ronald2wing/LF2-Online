# Object System

> Source: original LF2 v2.0a `.dat` files, engine entity system in `entity.js`, `global.js`

Every game entity is an object. The engine manages up to **400 objects** in a flat array with an existence bitmap.

## Object States

From `global.js` STATE constants — the state machine governing all object behavior:

| State | Value | Name | Description |
|---|---|---|---|
| STANDING | 0 | Standing | Idle |
| WALKING | 1 | Walking | Horizontal movement |
| RUNNING | 2 | Running | Fast movement |
| HEAVY_ATTACK | 3 | Attack | Normal/special attack frames (weapon attack also uses this) |
| LIGHT_JUMP | 4 | Jump | In air from jump |
| HEAVY_JUMP | 5 | Dash | Aerial dash |
| DASH_ATTACK | 6 | Rowing | Recovery roll / dash attack |
| DEFEND | 7 | Defend | Guarding |
| SPECIAL_ATTACK | 8 | Broken Defend | Guard broken |
| CATCHING | 9 | Catching | Holding another character |
| BEING_CAUGHT | 10 | Caught | Being held |
| — | 11 | Injured 1 | Hit and recoiling (not in global.js) |
| — | 12 | Falling | Knocked airborne/tumbling (not in global.js) |
| FROZEN | 13 | Ice | Frozen solid |
| LYING | 14 | Lying | Knocked down on ground |
| JUMPING | 15 | Transitional | Crouch, throw, weapon pickup, teleport prep, charge |
| DANCE_OF_PAIN | 16 | Injured 2 | "Dance of Pain" — vulnerable to catch |
| DRINKING | 17 | Weapon Drink | Drinking milk/beer |
| BURNING | 18 | Fire | On fire |
| FIRERUN | 19 | Burn Run | Running while on fire |

### Weapon/Projectile States

| State | Value | Name | Description |
|---|---|---|---|
| LIGHT_WEAPON_FLYING | 1002 | Throwing | Light weapon thrown through air |
| LIGHT_WEAPON_GROUND | 1003 | Bouncing | Weapon bouncing on ground |
| LIGHT_WEAPON_IDLE | 1004 | On Ground | Weapon resting on ground (pickable) |
| HEAVY_WEAPON_FLYING | 2000 | In Sky 2 | Heavy weapon airborne |
| HEAVY_WEAPON_IDLE | 2004 | On Ground 2 | Heavy weapon on ground |
| PROJECTILE_FLYING | 3000 | Flying | Special attack projectile traveling |
| PROJECTILE_HITTING | 3001 | Hitting | Projectile impact animation |
| — | 3002 | Hit | Projectile hit reaction |
| — | 3003 | Rebounded | Projectile reflected by forcefield |

Light weapons also use state 1000 (in_the_sky) for falling and 1001 (on_hand) for being held.

## Object Data Structure

Each object references its data file (e.g., `davis.js`, `weapon0.js`). The data file defines:

### `bmp` — Sprite Metadata
- `file[]`: Array of sprite sheet descriptors with `row`, `col`, `w`, `h`
- `name`: Display name
- `head`: Avatar sprite (79×79 px)
- `small`: HP bar icon sprite
- Movement parameters: `walking_frame_rate`, `walking_speed`, `running_speed`, `jump_height`, `dash_distance`, etc.
- Weapon-specific: `weapon_hp`, `weapon_drop_hurt`

### `frame` — Frame Dictionary
Keys are frame numbers (0–399), mapped to frame descriptor objects:
- `pic`: Sprite picture index (grid cell index on the sprite sheet)
- `state`: State machine state
- `wait`: Duration in TU
- `next`: Next frame number (999=reset, 1000=destroy)
- `dvx`/`dvy`/`dvz`: Velocity deltas applied per TU
- `centerx`/`centery`: Sprite center offset (for positioning)
- `hit_a`/`hit_d`/`hit_j`/`hit_Fa`/`hit_Ua`/`hit_Da`/`hit_Fj`/`hit_Uj`/`hit_Dj`/`hit_ja`: Combo-triggered frame transitions
- `mp`: MP cost (positive = cost, negative = recovery)
- `sound`: Sound effect path triggered on frame entry
- `itr`: Attack hitbox (single or array)
- `bdy`: Body/vulnerable hitbox (single or array)
- `opoint`: Object spawn point
- `wpoint`: Weapon attachment point
- `bpoint`: Blood splatter point (x, y offset)
- `cpoint`: Catch point

### `weapon_strength_list` — Weapon Damage Table
For weapons: maps attack type entries to damage values:
```
{ entry: "normal", dvx: 2, fall: 40, vrest: 10, bdefend: 16, injury: 40 }
```

## Object Pool Layout

```
objects[  0 -   3]: Players (P1–P4)
objects[  4 -   9]: Reserved
objects[ 10 -  17]: Computers (C1–C8)
objects[ 18 -  19]: Reserved
objects[ 20 -  49]: Characters / Drinks (30 slots)
objects[ 50 - 399]: Weapons / Attacks / Criminals (350 slots)
```

## Held Object Convention

When a character picks up a weapon:
- Weapon's position/velocity is driven by the holder's `wpoint` offsets
- The `wpoint` on the character's current frame defines where the weapon attaches
- `wpoint.kind: 1` = attach, `wpoint.kind: 2` = auto-throw, `wpoint.kind: 3` = drop/destroy
- Coordinates are mirrored for facing direction
- `weaponact` on the wpoint sets the weapon's frame while held
- `attacking` on the wpoint selects which `weapon_strength_list` entry to use

## Frame Injury Constants

From `global.js` — preset frame numbers used by specific situations:

| Constant | Frame | Description |
|---|---|---|
| `DEFEND_EFFECTIVE` | 111 | Effective block reaction |
| `DEFEND_BROKEN` | 112 | Guard break start |
| `PICK_LIGHT_WEAPON` | 115 | Light weapon pickup |
| `PICK_HEAVY_WEAPON` | 116 | Heavy weapon pickup |
| `FALL_FRONT` | 180 | Fall forward |
| `RELEASED` | 181 | Released from grab |
| `FALL_BACK` | 186 | Fall backward |
| `FROZEN_FALL` | 182 | Frozen then falling |
| `ICE_SOLID` | 200 | Frozen solid |
| `ICE_MELT` | 38 | Unfreezing |
| `BURN_TRANSITION` | 203 | Fire animation start |
| `BURN_START` | 202 | Fire effect start |
| `FALL_LIGHT` | 220 | Light injury |
| `FALL_MID` | 222 | Medium injury |
| `FALL_HEAVY` | 224 | Heavy injury |
| `FALL_CRITICAL` | 226 | Critical injury |

## Object Lifecycle

1. **Spawned**: Created via `opoint` in a parent frame, or by the game mode
2. **Active**: Updates each TU — frame advancement, physics, collision
3. **Destroyed**: Destroyed when `next == 1000` (FRAME.DESTROY) or `next == 1280` (FRAME.DISAPPEAR)

Objects destroyed by combat (projectiles hitting targets) transition through `PROJECTILE_HITTING` (3001) frames before destruction.
