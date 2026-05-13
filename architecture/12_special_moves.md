# Special Moves

> Source: original LF2 v2.0a `readme.txt`, decoded `.dat` frame data

## Combo Input System

Special moves are triggered by combo key sequences. All combos start with **Defend (D)** held, followed by directional keys and attack/jump.

| Combo | Keys | Tag |
|---|---|---|
| D>A / D<A | Def + Forward/Back + Attack | `hit_Fa` |
| D^A | Def + Up + Attack | `hit_Ua` |
| DvA | Def + Down + Attack | `hit_Da` |
| D>J / D<J | Def + Forward/Back + Jump | `hit_Fj` |
| D^J | Def + Up + Jump | `hit_Uj` |
| DvJ | Def + Down + Jump | `hit_Dj` |
| DJA | Def + Jump + Attack | `hit_ja` |

Combo timeout: **10 TU**. If no matching `hit_*` tag exists on the current frame, the combo input is discarded.

### Input Direction Convention

- `D>A` (Defend + Right + Attack) for facing-right characters = `D<A` for facing-left characters
- The "forward" direction is always relative to the character's facing direction
- `hit_Fa` fires for both D>A and D<A variants

## Command Teammates

From `readme.txt` — AI teammates respond to key sequences (no Defend key needed):

| Command | Input | Combo |
|---|---|---|
| Come | D + J + D + J | 5 characters (no space between) 
| Stay | D + D + D + D | 5 characters
| Move | D + A + D + A | 5 characters

---

## Character Special Moves

### Davis (id: 11)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Energy Blast | D>A | 40 | 240–265 | Fires energy balls (`oid: 207`). `hit_a` on frame 263 loops to 242 for multi-shot. Frame 261 spawns `davis_ball` at `x:90, y:48`. |
| Shrafe (Many Punch) | DvA | 75 | 270–282 | Rapid combo. Frame 271: `itr.injury:45, dvx:12, effect:4`. Frame 280: `dvy:-15` launches target. Second mp:75 on frame 274. |
| Leap Attack | D^A | 25 | 290–294 | Jump uppercut. Frame 290: `dvx:8, dvy:-8`. Frame 293: `itr.injury:50, dvx:22, dvy:15`. Frame 292 `hit_a: 293` chains into the attack. |
| Dragon Punch (Singlong) | D^J | 225 | 300–307 | Rising dragon uppercut. Progressive damage: frame 301 (injury:85), 302 (60), 303 (45), 304 (30). All have `dvx:7`, `bdefend:60`. Frame 304+ have no active itrs — they're recovery. |

### Woody (id: 10)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Tiger Dash | D>A | 125 | 235–245 | Horizontal dash punch |
| Flip Kick | D^A | 200 | 250–257 | Aerial flip kick |
| Turning Kick | DvA | 50 | 260–271 | Sweeping spin kicks |
| Teleport | D^J / DvJ | 50 | 275–303 | Teleport to enemy (D^J, frame 283, state 400) or ally (DvJ, frame 298, state 401) |

### Dennis (id: 9)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Energy Blast | D>A | 40 | 235–262 | Multi-projectile kick. Spawns `oid:205` (dennis_ball) at frames 235, 242, 251, 255. `hit_a` on frame 255 chains back for more. |
| Chase Blast | D^J | 100 | 295–301 | Spawns `oid:215` (dennis_chase) — homing projectile |
| Shrafe (C-Foot) | DvA | 75 | 280–290 | Sliding kick. Frames 286-287: `itr.injury:45, dvx:12, effect:4` |
| Whirlwind Kick | D>J | 75 | — | (not in readme.txt for Davis but listed for Dennis) |

### Deep (id: 1)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Energy Slash | D>A | 75 | 235–250 | Three slashes spawning `oid:203` (deep_ball) at frames 235, 240, 245 |
| Strike | DvA | 75 | — | (from readme.txt) |
| Leap Attack | D^A | 75 | 260–285 | Aerial slash. Frame 268 spawns `deep_ball`. Frames 277–284: `itr.injury:60, dvx:6, dvy:-17` |
| Dashing Strafe | D^J | 150 | 290–311 | Rushing slash. Frame 310 spawns `deep_ball` |
| Leap Attack 2 | D^J+J+A | 75 | — | (from readme.txt) |

### John (id: 2)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Energy Disk | D>A | 75 | 235–243 | Frames 235, 240 spawn `oid:200` (john_ball) |
| Energy Shield | D^J | 100 | 270–280 | itr:kind:9 (forcefield). Destroys and reflects projectiles (type 3, state 3000) |
| Heal Self | DvJ | 350 | 250–256 | Restores HP over duration (max 100 HP) |
| Heal Team | D^A | 350 | 260–266 | itr:kind:8 — heals same-team characters only. Max 100 HP per event |
| Biscuit | DvJ* | 250 | 300–306 | Spawns `oid:214` (john_biscuit) — healing projectile |

*Note: readme.txt lists both Heal (myself) at DvJ and Biscuit — these may be separate frames in the sequence.

### Henry (id: 4)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Arrow Blast | D>A | 150 | 235–245 | Frame 235 spawns `oid:201` (henry_arrow1). Frame 245 spawns `oid:208` (arrow2) |
| Flute (Sonata) | D^J | 350 | 250–255 | itr:kind:10. Affects all enemies within range. Floats targets up. |
| Super Arrow | D^A | 200 | 270–279 | Multi-part arrow attack |
| Quintuple Arrow | DvA* | 150 | 280–287 | Multiple arrows (readme lists 5) with varying angles |
| Critical Shot | D>J | 200 | — | (from readme.txt) |

*readme.txt lists "Multiple Shot" as D+J+A at 30mp and "Critical Shot" as D>J at 40mp.

### Rudolf (id: 5)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Leap Attack | D>J | 0 | 285–298 | Aerial slash |
| Ninja Star | D>A | 100 | 235–248 | Multi-star throw |
| Transform | D>J+A* | 150 | 260–272 | Transforms into caught enemy (from catch/grip state) |
| Hide (Vanish) | D^J | 350 | 250–257 | Turns invisible, reappears with invincibility |
| Clone Army | DvJ | 350 | 260–272 | `opoint.oid: 5`, `facing: N×10`. Spawns N clones with HP:20, MP:100 |

*readme.txt: "Gripping Other + D + J + A" at 30mp

### Louis (id: 6)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Thunder Punch | Run + A | 10 | — | Run attack variant |
| Thunder Punch (air) | Run + J + A | 15 | — | Aerial run punch |
| Thunder Kick | D>J | 10 | — | Forward rushing kick |
| Whirlwind Throw | D^J | 15 | — | Aerial spin throw |
| Phoenix Palm | D>A | 150 | 235–243 | Frame 243 spawns `oid:204` (henry_wind) |
| Thousand Foot | D^A | 50 | 245–258 | Rapid kick combo (14 frames) |
| Transform | D^J* | — | 300–320 | If holding both armor pieces (id:217 + id:218), transforms to LouisEX (id:50) |

*Frame 300 uses `hit_ja` combo trigger on standing frames

### Firen (id: 7)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Fire Ball | D>A | 75 | 235–252 | Frames 235, 241, 247 spawn `oid:210` (firen_ball). Effect:2 (fire) |
| Blaze (Burn Run) | D>J | 75 | 255–261 | State 19. `mp: -10` recovery per tick. itr: injury:45, effect:20. Each tick spawns `oid:211` (firen_flame) |
| Inferno (Flame Column) | DvJ | 150 | 267–275 | Spawns `oid:211` rising upward. `mp: -8` recovery |
| Explosion | D^J | 4300* | 285–293 | Self-destruct. State 18. Effect:22. Massive AoE, team-neutral damage |

*mp:4300 = 300 MP cost + 40 HP cost (mp % 1000 = 300, floor(mp/1000)*10 = 40)

### Freeze (id: 8)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Ice Blast | D>A | 100 | 235–240 | Spawns `oid:209` (freeze_ball). Effect:3 (freeze) |
| Summon Sword | DvJ | 150 | 270–275 | Conjures `oid:213` (ice_sword) as held light weapon |
| Icicle (Whirlwind) | D>J | 150 | 260–268 | Spawns `oid:212` (freeze_column). Effect:30 |
| Whirlwind | D^J | 300 | — | (from readme.txt) |

### Firzen (id: 51)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Overwhelming Disaster | D^A | 20 | 240–247 | Fire + ice combined attack. Frame 246 `hit_a: 240` for multi-cast. Frames 243-244 spawn `oid:221` (firzen_chasef). |
| Arctic Volcano | D^J | 50 | 249–260 | Frame 258 spawns 4 objects simultaneously: firen_flame at (100,79), freeze_column at (-20,79), firen_flame at (-20,79), freeze_column at (44,49). |
| Firzen Cannon | D>J | 5 | 265–280 | Spawns `oid:223` (firzen_ball) at frames 270, 272. Frame 273 loops to 271. Frame 272 `mp: -14` recovers MP. |

### LouisEX (id: 50)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Phoenix Dance | DvA | 100 | 260–264 | Aerial phoenix strike |
| Thunder Punch | Run + A | 6 | — | Run punch variant |
| Thunder Punch (air) | Run + J + A | 8 | — | Aerial run punch |
| Phoenix Palm | D>A | 100 | 240–254 | Multi-hit palm strike. `hit_a` chains additional hits |

### Julian (id: 52)

| Move | Input | MP | Frames | Description |
|---|---|---|---|---|
| Soul Punch | Run + A | 0 | — | Free run punch |
| Uppercut | D^A | 0 | — | Free uppercut |
| Skull Blast | D>A | 100 | 260–276 | Spawns `oid:228` (julian_ball) rapid fire. mp:10 repeated cost |
| Mirror Image | DJA | 25 | — | Clones self |
| Big Bang | D^J | 125 | 280–291 | Spawns `oid:229` (julian_ball2). Big projectile |
| Soul Bomb | D>J | 100 | 310–322 | Effect:23. Explosion |

### Other Characters

**Bandit (30)** and **Hunter (31)**: No special moves. Basic punch/jump/dash/weapon attacks only.

**Mark (32)**:
- Crash Punch: D>A, 0mp. Frame 240-246
- Body Attack: D>J, 0mp

**Jack (33)**:
- Energy Blast: D>A, 50mp. Spawns `oid:216` ×7
- Flash Kick: D^J, 125mp. Dragon punch clone

**Sorcerer (34)**:
- Fire Ball: D>A, 75mp. Spawns `oid:210` (same as Firen)
- Ice Blast: D^J, 125mp. Spawns `oid:209` (same as Freeze)
- Heal (others): D^A, 350mp. Same as John
- Heal (self): DvJ, 350mp. Same as John

**Monk (35)**:
- ShaoLin Palm: D>A, 100mp. From defend state (state 7)

**Jan (36)**:
- Angel Summon: D>A, 200mp. Spawns `oid:220` (jan_chase)
- Devil Summon: DvA, 150mp. Spawns `oid:219` (jan_chaseh)

**Knight (37)**: No special moves listed in readme.txt. Has sword slash D>A in frame data.

**Bat (38)**:
- Speed Punch: D>J, 50mp
- Eye Laser: D>A, 125mp. Spawns `oid:224` (bat_ball)
- Summon Bats: D^J, 200mp. Spawns `oid:225` (bat_chase)

**Justin (39)**:
- Wolf Punch: DvA, 75mp. Multi-hit
- Energy Blast: D>A, 75mp. Spawns `oid:226` (justin_ball)

---

## Hardcoded Special Behaviors

### Teleport (State 400/401)

Woody's teleport uses hardcoded state handling:
- State 400: Find **closest** enemy by Manhattan distance (`|dx| + |dz|`, max 10000). Place behind/in-front: `x = enemy.x ± 120`, `z = enemy.z + 1`, `y = 0`. All velocities reset.
- State 401: Find **farthest** ally by Manhattan distance. Place: `x = ally.x ± 60`, `z = ally.z + 1`, `y = 0`.

### Burn Run (State 19)

- Cannot be hit by special attack projectiles (type 3)
- Movement uses `running_speed` for velocity
- Automatically spawns `oid:211` (firen_flame) each tick via opoint with `action:50`
- `mp` is NEGATIVE (recovered) each tick (-10/tick for Blaze, -8/tick for Inferno)

### Forcefield (Kind 9)

- Destroys type 3 objects (specialattacks) on contact
- Does NOT affect characters
- Reflected projectiles change owner team to forcefield owner's team
- John's Energy Shield (D^J, frames 270–280)

### Heal (Kind 8)

- Characters only (type 0)
- Maximum 100 HP total per heal event
- Rate: approximately 8 HP per 8 TU
- John's heal events use this mechanic

### Flute (Kind 10)

- Affects all enemies within range
- Target floats upward with `y_velocity = -7.5`
- Henry's Sonata of the Death (D^J)

### Rudolf Clone

When `opoint.oid == 5`:
- Spawns `|facing| / 10` copies of Rudolf
- Each clone: HP:20, MP:100
- Clones use AI script id:4 (Ninja)
- Clones match parent's team and character id

### Firzen Volcano

Frame 258 spawns 4 objects simultaneously:
- firen_flame at (100, 79)
- freeze_column at (-20, 79)
- firen_flame at (-20, 79)
- freeze_column at (44, 49)

### Louis → LouisEX Transformation

When Louis (id:6) holds BOTH armor pieces:
- Louis Armor (id:217, weapon10.dat)
- Louis Wrister (id:218, weapon11.dat)
Both are heavy weapons (type 2). Holding both allows transformation via `hit_ja: 300` on standing frames.

### Disappear Effect

From `global.js`:
```js
disappear: { shadow_blink: 120, body_blink: 150 }
```
Rudolf's vanish: shadow blinks at time 120, body blinks at time 150 (in TU units).
