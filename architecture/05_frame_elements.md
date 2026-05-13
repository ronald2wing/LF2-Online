# Frame Elements — ITR, BDY, OPoint, WPoint, CPoint, BPoint

> Source: decoded LF2 v2.0a `.dat` frame data, verified in `mechanics.js` and `entity.js`

## ITR — Interaction Region (Attack Hitbox)

An itr defines where an object can interact with other objects. Frames can have a single itr or an array of itrs. The engine checks all itrs against all bdys of every other object each frame.

### ITR Structure

```js
itr: {
  kind: 0,           // ITR kind (0–16)
  x: 35, y: 22,      // Offset from center (mirrored for facing)
  w: 34, h: 48,      // Width and height
  zwidth: 3,         // Z-axis width (0 = engine default 15)
  dvx: 2,            // Knockback X velocity on target
  dvy: 0,            // Knockback Y velocity on target (0 = no vertical knockback)
  fall: 20,          // Fall value added to target
  arest: 7,          // Attacker rest cooldown in TU (default: 7)
  vrest: 7,          // Victim invincibility in TU (0 = closest-target single-hit)
  bdefend: 16,       // Bdefend subtracted from target's defense
  injury: 25,        // HP damage dealt
  effect: 0          // Visual/behavioral effect (0=punch, 1=bleed, 2=fire, 3=ice, 4=shrafe)
}
```

### ITR Kinds

| Kind | Name | Description | Team |
|---|---|---|---|
| 0 | Normal Attack | Standard hitbox | Exclusive |
| 1 | Catch Injured | Catches characters in Dance of Pain (state 16) | Exclusive |
| 2 | Pick Up Weapon | Picks up ground items | — |
| 3 | Super Catch | Catches any character | Exclusive |
| 4 | Falling / Thrown | Thrown weapon hitbox | Neutral |
| 5 | Weapon Swing | Weapon hitbox (uses weapon_strength_list) | Holder's team |
| 7 | Rowing Pick | Pick up weapon while rolling | — |
| 8 | Heal | Restores HP to target (characters only) | Same team |
| 9 | Reflect Shield | Destroys/reflects projectiles | Exclusive |
| 10 | Flute | Henry's sleep effect | Exclusive |
| 11 | Float / Variant | Rudolf's transformation | Exclusive |
| 14 | Obstacle / Ice Column | Blocks character movement | — |
| 15 | Whirlwind | Knockback for thrown objects | — |
| 16 | Freeze Variant | Applies frozen state | — |

### ITR Effect Values

| Effect | Value | Mod 10 | Pattern |
|---|---|---|---|
| Normal punch hit | 0 | 0 | `effect == 0` |
| Blood splatter | 1 | 1 | `effect == 1` |
| Basic fire | 2 | 2 | `effect % 10 == 2` |
| Burning DoT | 20 | 2 | `effect % 10 == 2` |
| Firen's flame column | 21 | 2 | `effect % 10 == 2` |
| Firen's self-destruct | 22 | 2 | `effect % 10 == 2` |
| Julian's soul bomb | 23 | 2 | `effect % 10 == 2` |
| Basic freeze | 3 | 3 | `effect % 10 == 3` |
| Freeze's ice column | 30 | 3 | `effect % 10 == 3` |
| Shrafe (energy beam) | 4 | 4 | `effect == 4` |

### Z-Width Default

When an itr's `zwidth` is 0 (or not specified), the engine uses **15** as the interaction depth. Characters typically don't specify `zwidth` and thus use the default of 15.

### Catch ITR Conventions

For kind 1 (catch injured) and kind 3 (super catch):
```js
catchingact: [120, 120],  // Catcher frames [approach from front, approach from behind]
caughtact: [130, 130]      // Caught frames [caught from front, caught from behind]
```

### Weapon ITR (Kind 5)

Weapon kind 5 uses `weapon_strength_list` for actual damage values. The `injury` field on a kind 5 itr is typically a placeholder (e.g., 789) — the actual damage comes from the strength list entry selected by the holder's wpoint `attacking` field.

### vrest = 0 Behavior

When `itr.vrest == 0` (not a catch/pickup kind):
- Only the **single closest** overlapping target is hit per frame
- Uses `attackable_distance` to determine closest target
- At exact same distance: 66% chance to hit (RNG-based tiebreaker)
- Prevents multi-hit exploits

## BDY — Body Region (Vulnerable Hitbox)

The bdy is where an object can be hit. Objects without a bdy cannot be hit.

```js
bdy: {
  kind: 0,             // 0 = normal; >= 1000 = stage mode criminal block
  x: 21, y: 18,       // Offset from center (mirrored for facing)
  w: 43, h: 62        // Width and height
}
```

- Offset `x` and `w` are mirrored when facing left
- `kind >= 1000`: in stage mode, prevents criminals from being rescued
- A frame can have multiple bdys as an array
- Standing characters typically have `bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 }`
- Defending characters have a smaller bdy: `{ kind: 0, x: 21, y: 8, w: 38, h: 58 }`
- Crouching characters have a lower bdy: `{ kind: 0, x: 21, y: 28, w: 43, h: 52 }`

## OPoint — Object Point (Spawn)

Spawns a new object at a position relative to the parent.

```js
opoint: {
  kind: 1,            // 1 = spawn object
  x: 90, y: 48,       // Offset from parent center
  action: 50,         // Frame the spawned object starts on
  dvx: 0, dvy: 0,     // Initial velocity
  oid: 207,           // Object ID to spawn (207 = davis_ball)
  facing: 0           // 0 = same as parent; non-zero = spread direction
}
```

### Facing Field for Clones

Rudolf's clone army uses `opoint` with `oid: 5`:
- `facing: N * 10` spawns N clones
- Each clone gets HP: 20, MP: 100
- Clones use AI script id: 4 and match parent's team/id

### Multi-Spawn

Firen's volcano (frame 258) spawns 4 objects simultaneously from a single frame using multiple opoint entries.

## WPoint — Weapon Point

Controls weapon attachment, throwing, and attack behavior.

```js
wpoint: {
  kind: 1,            // 1 = attach, 2 = auto-throw, 3 = drop/destroy
  x: 23, y: 55,       // Attachment offset from center (mirrored for facing)
  weaponact: 23,      // Frame the weapon goes to while held
  attacking: 0,       // Which weapon_strength_list entry (0=none, 1=normal, 2=jump, 3=run, 4=dash)
  cover: 0,           // Defense coverage value (0 = no cover)
  dvx: 0, dvy: 0,    // Throwing velocity (kind 2 only)
  dvz: 0              // Throwing Z velocity (kind 2 only)
}
```

### WPoint Kind Behaviors

| kind | Name | Behavior |
|---|---|---|
| 1 | Attach | Weapon follows character at offset. `weaponact` sets weapon's frame. |
| 2 | Throw | Weapon is released with velocity (dvx, dvy, dvz) from the offset point. |
| 3 | Drop | Weapon is released without velocity. Used for drink consumption. |

### Character Weapon Positions

For standing frames, wpoints are typically defined on frames 0–3:
- Standing: `{ x: 23, y: 55, weaponact: 23 }`
- Walking: `{ x: 23, y: 55, weaponact: 23 }`
- Frame numbers vary by character

When `attacking: 0`, the weapon's itr uses the default weapon damage. When `attacking: 1-4`, it uses the corresponding `weapon_strength_list` entry.

## CPoint — Catch Point

Defines catching and being-caught behavior.

### Kind 1: Catching
```js
cpoint: {
  kind: 1,
  x: 61, y: 39,           // Catch position offset
  vaction: 130,           // Frame caught character enters on throw (default: 135)
  aaction: 122,           // Frame catcher enters for catching
  taction: -232,          // Frame for transition (negative = flip facing)
  hurtable: 1,            // Whether caught character can take damage (0/1)
  decrease: -7,           // HP drain while held (negative = healing)
  injury: 0,              // Damage per tick (not always present)
  throwx: 0, throwy: 0,   // Throw velocity (not always present)
  cover: 0,               // Defense from caught character (default: 0)
  dicontrol: 0,           // Directional control during throw
  throwinjury: 0,         // Damage applied on throw
  throwz: 0               // Throw Z velocity
}
```

### Kind 2: Being Caught
```js
cpoint: {
  kind: 2,
  x: 41, y: 39,
  fronthurtact: 132,      // Frame when caught from front
  backhurtact: 132        // Frame when caught from behind
}
```

## BPoint — Blood Point

Defines where blood splatter appears on hit.

```js
bpoint: {
  x: 39, y: 34    // Blood splatter offset from center
}
```

## Weapon Strength List

Each weapon `.dat` file defines a `weapon_strength_list`:

```js
weapon_strength_list: {
  1: { entry: "normal", dvx: 2,  fall: 40, vrest: 10, bdefend: 16, injury: 40 },
  2: { entry: "jump",   dvx: 7,  fall: 70, vrest: 10, bdefend: 16, injury: 40 },
  3: { entry: "run",    dvx: 10, fall: 70, vrest: 10, bdefend: 16, injury: 50 },
  4: { entry: "dash",   dvx: 12, fall: 70, vrest: 20, bdefend: 60, injury: 50 }
}
```

### Weapon-Specific Overrides

| Weapon | normal | jump | run | dash |
|---|---|---|---|---|
| Stick (100) | 40 | 40 | 50 | 50 |
| Hoe (101) | — | 45 (bdefend:60) | 55 (bdefend:60) | 55 (bdefend:60) |
| Knife (120) | 45 | 45 | 55 | 55 |
| Baseball (121) | 40 | 60 | 85 | 100 |
| Ice Sword (213) | 30 | 30 | 40 | 40 |
| Boomerang (124) | 45 | 45 | 55 | 55 |

The `entry` field determines which wpoint `attacking` value maps to this entry.

## Frame Element Facing Mirroring

All X offsets in itr, bdy, wpoint, opoint, and cpoint are mirrored when `facing == left`:
```
mirrored_x = sprite_width - original_x - element_width
```
This ensures hitboxes stay on the correct side relative to the character's facing direction.
