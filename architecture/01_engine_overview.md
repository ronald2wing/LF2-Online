# LF2 Engine Overview

> Source: original LF2 v2.0a game files (`data.txt`, `control.txt`, `.dat` files), engine constants verified in `global.js`

LF2 is a **deterministic 2D fighting game** running at **30 logical frames per second** (TU = time unit = ~33.3ms). Every object in the world updates its state each TU:

```
Input → Combo Detection → Frame Transition → Physics Step → Collision Detection → Hit Validation → Render
```

## Engine Constants

From `global.js` and original LF2 v2.0a behavior:

| Constant | Value | Description |
|---|---|---|
| `framerate` | 30 fps | Fixed tick rate |
| `gravity` | 1.7 px/TU² | Vertical acceleration per frame |
| `min_speed` | 1 px/TU | Below this, velocity clamped to 0 |
| `default_itr_zwidth` | 15 | When an itr's zwidth is 0 |
| `hit_stop` | 3 TU | Both attacker/target stall on successful hit |
| `default_throw_injury` | 10 | Default damage on throw |
| `hp_full` | 500 | Max HP for characters |
| `mp_full` | 500 | Max MP for characters |
| `mp_start` | 200 | Starting MP |
| `default_arest` | 7 TU | Character attack rest cooldown |
| `default_vrest` | 9 TU | Weapon victim rest |
| `defend_break_limit` | 40 | Bdefend threshold for guard break |
| `fall_KO` | 60 | Fall threshold for KO (cannot be rescued) |
| `default_fall` | 20 | Default fall value applied by itrs |
| `default_fall_dvy` | -6.9 | Default dvy for fall frames |
| `combo_timeout` | 10 TU | Combo input buffer window |
| `default_mass` | 1.0 | Default object mass |
| `fall_recovery` | -0.45/TU | Fall recovers toward 0 each frame |
| `bdefend_recovery` | -0.5/TU | Bdefend recovers toward 0 each frame |
| `defend_injury_factor` | 0.1 | Only 10% damage when defending |
| `heal_max` | 100 | Max HP restored per heal event |

## Game Loop (per TU)

1. Read player inputs (hold/click key arrays on each object)
2. Detect combo sequences (10 TU input window, defined in `combo_list`)
3. Evaluate frame transitions: `wait` timer ticks down → advance to `next` frame; `hit_*` tags trigger immediate jumps
4. Apply frame forces (`dvx`, `dvy`, `dvz` from current frame)
5. Step physics: `position += velocity`; `y_velocity += gravity`
6. Run collision detection (XY rectangle overlap + z-axis proximity)
7. Validate hits with team, invincibility, immunity, and distance rules
8. Resolve hit effects, damage, knockback, state changes
9. Render sprites at world positions

## Coordinate System

- **X**: Horizontal (positive = right)
- **Y**: Vertical (0 = ground, negative = airborne, positive = below ground)
- **Z**: Depth (positive = deeper into screen)
- Units: pixels

## Global Object Pool

From the original engine: flat array of 400 objects with an existence bitmap.

Index ranges:
| Range | Purpose |
|---|---|
| 0–3 | Players (P1–P4) |
| 4–9 | Reserved |
| 10–17 | Computers (C1–C8) |
| 18–19 | Reserved |
| 20–49 | Characters / Drinks (30 slots) |
| 50–399 | Weapons / Attacks / Criminals (350 slots) |

## FRAME Constants

From `global.js`:

| Constant | Value | Meaning |
|---|---|---|
| `FRAME.RESET` | 999 | Loop back to frame 0 |
| `FRAME.DESTROY` | 1000 | Destroy object |
| `FRAME.DISAPPEAR` | 1280 | Disappear effect |

## Combo System

From `global.js` combo list — input sequences that trigger special moves:

| Combo | Keys | Tag | Priority |
|---|---|---|---|
| D>A / D<A | Def + Forward/Back + Attack | `hit_Fa` | 1 |
| D^A | Def + Up + Attack | `hit_Ua` | 1 |
| DvA | Def + Down + Attack | `hit_Da` | 1 |
| D>J / D<J | Def + Forward/Back + Jump | `hit_Fj` | 1 |
| D^J | Def + Up + Jump | `hit_Uj` | 1 |
| DvJ | Def + Down + Jump | `hit_Dj` | 1 |
| D>AJ / D<AJ | Def + Fwd/Back + Attack + Jump | `hit_Fj` | 1 |
| DJA | Def + Jump + Attack | `hit_ja` | 1 |
| A | Attack | `hit_a` | 0 |
| D | Defend | `hit_d` | 0 |
| J | Jump | `hit_j` | 0 |

D>A and D<A combos are directional: the forward direction is relative to the character's facing direction.

## Data File Index

From original `data.txt` — the master index linking object IDs to `.dat` files:

| ID | Type | File | Name |
|---|---|---|---|
| 0 | 0 (character) | template.dat | Template |
| 1 | 0 | deep.dat | Deep |
| 2 | 0 | john.dat | John |
| 4 | 0 | henry.dat | Henry |
| 5 | 0 | rudolf.dat | Rudolf |
| 6 | 0 | louis.dat | Louis |
| 7 | 0 | firen.dat | Firen |
| 8 | 0 | freeze.dat | Freeze |
| 9 | 0 | dennis.dat | Dennis |
| 10 | 0 | woody.dat | Woody |
| 11 | 0 | davis.dat | Davis |
| 30 | 0 | bandit.dat | Bandit |
| 31 | 0 | hunter.dat | Hunter |
| 32 | 0 | mark.dat | Mark |
| 33 | 0 | jack.dat | Jack |
| 34 | 0 | sorcerer.dat | Sorcerer |
| 35 | 0 | monk.dat | Monk |
| 36 | 0 | jan.dat | Jan |
| 37 | 0 | knight.dat | Knight |
| 38 | 0 | bat.dat | Bat |
| 39 | 0 | justin.dat | Justin |
| 50 | 0 | louisEX.dat | LouisEX |
| 51 | 0 | firzen.dat | Firzen |
| 52 | 0 | julian.dat | Julian |

| ID | Type | File | Name |
|---|---|---|---|
| 100 | 1 (lightweapon) | weapon0.dat | Stick |
| 101 | 1 | weapon2.dat | Hoe |
| 120 | 1 | weapon4.dat | Knife |
| 121 | 4 (throwweapon) | weapon5.dat | Baseball |
| 122 | 6 (drink) | weapon6.dat | Milk |
| 123 | 6 | weapon8.dat | Beer |
| 124 | 1 | weapon9.dat | Boomerang |
| 150 | 2 (heavyweapon) | weapon1.dat | Stone |
| 151 | 2 | weapon3.dat | Wooden Box |
| 213 | 1 | weapon7.dat | Ice Sword |
| 217 | 2 | weapon10.dat | Louis Armor |
| 218 | 2 | weapon11.dat | Louis Wrister |

| ID | Type | File | Name |
|---|---|---|---|
| 200 | 3 (specialattack) | john_ball.dat | John Ball |
| 201 | 1 | henry_arrow1.dat | Henry Arrow |
| 202 | 1 | rudolf_weapon.dat | Rudolf Weapon |
| 203 | 3 | deep_ball.dat | Deep Ball |
| 204 | 3 | henry_wind.dat | Henry Wind |
| 205 | 3 | dennis_ball.dat | Dennis Ball |
| 206 | 3 | woody_ball.dat | Woody Ball |
| 207 | 3 | davis_ball.dat | Davis Ball |
| 208 | 3 | henry_arrow2.dat | Henry Arrow 2 |
| 209 | 3 | freeze_ball.dat | Freeze Ball |
| 210 | 3 | firen_ball.dat | Firen Ball |
| 211 | 3 | firen_flame.dat | Firen Flame |
| 212 | 3 | freeze_column.dat | Freeze Column |
| 214 | 3 | john_biscuit.dat | John Biscuit |
| 215 | 3 | dennis_chase.dat | Dennis Chase |
| 216 | 3 | jack_ball.dat | Jack Ball |
| 219 | 3 | jan_chaseh.dat | Jan ChaseH |
| 220 | 3 | jan_chase.dat | Jan Chase |
| 221 | 3 | firzen_chasef.dat | Firzen ChaseF |
| 222 | 3 | firzen_chasei.dat | Firzen ChaseI |
| 223 | 3 | firzen_ball.dat | Firzen Ball |
| 224 | 3 | bat_ball.dat | Bat Ball |
| 225 | 3 | bat_chase.dat | Bat Chase |
| 226 | 3 | justin_ball.dat | Justin Ball |
| 228 | 3 | julian_ball.dat | Julian Ball |
| 229 | 3 | julian_ball2.dat | Julian Ball 2 |

| ID | Type | File | Name |
|---|---|---|---|
| 300 | 5 (criminal) | criminal.dat | Criminal |
| 998 | 5 | etc.dat | Misc |
| 999 | 5 | broken_weapon.dat | Broken Weapon |

Note: In `data.txt`, `henry_arrow1` and `rudolf_weapon` are type 1 (lightweapon), not type 3. The `data.txt` file configures `id: 100~199 drop weapon` for sky drops.

## Object Types

From `data.txt` type field:

| Type | Value | Description |
|---|---|---|
| Character | 0 | Full movement, displayed in character select |
| Light Weapon | 1 | Pickable, wieldable, throwable |
| Heavy Weapon | 2 | Liftable (reduces carrier speed) |
| Special Attack | 3 | Projectiles and attack effects |
| Throw Weapon | 4 | Baseball — influences holder behavior |
| Criminal | 5 | Stage mode enemies |
| Drink | 6 | Milk/beer — consumed on pickup |

## ID Range Semantics

From `data.txt` conventions:
- `id: 0–99` → Characters (shown in character selection)
- `id: 100–199` → Items that fall from sky (`id: 100~199 drop weapon` in `data.txt`)
- `id: 200–299` → Special attacks (projectiles)
- `id: 300–349` → Stage mode entities
- `id: 998` → Misc (etc)
- `id: 999` → Broken weapon

## Authority Levels

From `global.js` — frame transitions respect authority hierarchy:

| Level | Constant | Description |
|---|---|---|
| 0 | `NATURAL` | Default frame advancement |
| 10 | `MOVE` | Movement, defend, jump inputs |
| 11 | `SPECIAL` | Special move inputs |
| 15 | `ENVIRONMENTAL` | Environmental effects |
| 20 | `INTERACTION` | Hit reactions, throws |
| 30 | `STRONG` | Knockdown, freeze, fire |
| 99 | `INHERIT` | Inherit current authority |
