# Physics & Collision

> Source: `global.js` engine constants, `mechanics.js`, `collision.js`, original LF2 v2.0a behavior

## Coordinate System

- **X**: Horizontal (positive = right, 0 at left of world)
- **Y**: Vertical (0 = ground level, negative = airborne, positive = below ground)
- **Z**: Depth (positive = deeper into screen, used for lane positioning)

The game is a 2D side-scroller with a Z-axis for depth ordering and hit validation proximity.

## Motion Physics (per TU)

From `global.js`:

```
x  += x_velocity
y  += y_velocity
y_velocity += gravity    // gravity = 1.7 px/TU²
z  += z_velocity
```

### Frame Force Application

When transitioning to a new frame, velocity deltas are applied:
```
x_velocity += frame.dvx
y_velocity += frame.dvy
z_velocity += frame.dvz
```

For example, dash frames apply `dvx: 10, dvy: -10` to launch the character forward and upward.

### Minimum Speed Threshold

If `|velocity| < 1 px/TU`, velocity is clamped to 0. This prevents infinite microscopic movement.

## Gravity

- **Characters**: gravity applies normally (`y_velocity += 1.7` each TU)
- **Special attacks (type 3)**: **NO gravity** — projectiles fly in straight lines at constant velocity until destroyed
- **Weapons**: gravity applies when airborne (states 1000/2000)

## Collision Detection

### XY Rectangle Overlap

From `collision.js` — two rectangles intersect if:
```
itr_left   < bdy_left + bdy_w   &&
itr_left   + itr_w > bdy_left   &&
itr_top    < bdy_top + bdy_h    &&
itr_top    + itr_h > bdy_top
```

### Hitbox Position Calculation

Hitbox coordinates are calculated relative to the object's center, accounting for facing direction:

**Facing right (facing = 0):**
```
bx = object.x - frame.centerx + element.x
by = object.y - frame.centery + element.y
```

**Facing left (facing = 1):**
```
bx = object.x + frame.centerx - element.w - element.x
by = object.y - frame.centery + element.y
```

Y offsets are never mirrored. Only X offsets are mirrored.

### Z-Axis Coincidence Check

For a hit to register, objects must be within Z-range:
```
|attacker.z - target.z| < itr.zwidth
```

When `itr.zwidth == 0` (or not specified), the engine uses **15** as default.

### Weapon Distance Calculation

When a weapon is held (`weapon_type < 0 && holder_id != 0`), attack distance is measured from the **holder's position**, not the weapon's:
```
distance = |holder.x - target.x|
```

## Hit Stop

On successful hit, both attacker and target stall for **3 TU**. All movement and frame advancement pauses for both objects.

## Fall & Bdefend Recovery

Each TU:
```
fall    += -0.45    (fall recovers toward 0)
bdefend += -0.5     (bdefend recovers toward 0)
```

If `fall < 0`, it's clamped to 0.

## Defense Mechanics

### Damage Reduction

While defending: only **10%** of incoming injury is applied:
```
actual_injury = itr.injury * 0.1
```

### Defense Break

When `bdefend < 0` after an itr's `bdefend` is subtracted:
- Character enters **broken defend** state (state 8, frame 112)
- dvx absorption based on fall level:
  | fall ≤ | dvx absorbed |
  |---|---|
  | 5 | 0 |
  | 15 | 5 |

Defense break threshold: `bdefend = 40`.

## Fall Accumulation

### Fall Thresholds

| threshold | Effect |
|---|---|
| `fall >= 60` (KO) | Cannot defend or be rescued on ground bounce |
| `fall <= 40` | Falling state (12) immune to these attacks |
| `fall <= 9` | Light fall → 1 dvx absorbed on bounce |
| `fall <= 14` | Medium light → 4 dvx absorbed |
| `fall <= 20` | Medium → 10 dvx absorbed |
| `fall <= 40` | Heavy → 20 dvx absorbed |
| `fall <= 60` | Critical → 30 dvx absorbed |

### Fall Wait Duration

Stronger vertical knockback (dvy) causes longer fall wait times on frame 180:

| dvy | wait on frame 180 |
|---|---|
| 7 | 1 TU |
| 9 | 2 TU |
| 11 | 3 TU |
| 13 | 4 TU |
| 15 | 5 TU |
| 17 | 6 TU |

## Character Bounce Physics

From `global.js`:

| Constant | Value |
|---|---|
| Bounce XY threshold | 13.4 px/TU |
| Bounce Y threshold | 11 px/TU |
| Bounce vertical speed | 4.25 px/TU |

When a character contacts the ground:
- If `|x_velocity| > 13.4` OR `|y_velocity| > 11`: bounce up with `y_velocity = -4.25`
- Fall level determines how much dvx is absorbed (see table above)

## Ground Friction

When a character contacts the ground (not bouncing):

| Speed threshold | Friction reduction |
|---|---|
| ≤ 2 | 0 |
| ≤ 3 | 1 |
| ≤ 5 | 2 |
| ≤ 6 | 4 |
| ≤ 9 | 5 |
| ≤ 13 | 7 |
| ≤ 25 | 9 |

## Weapon Physics

### Weapon Bounce (ground contact)

| Constant | Value |
|---|---|
| Bounce velocity limit | 8 px/TU |
| Bounce Y speed | -3.7 |
| Bounce X speed | 3 |
| Bounce Z speed | 1.5 |

### Weapon Hit (striking a target)

| Constant | Value |
|---|---|
| Absolute X velocity | -3 |
| Absolute Y velocity | 0 |

### Weapon Reverse (hit while airborne)

| Multiplier | Value |
|---|---|
| X velocity factor | -0.4 |
| Y velocity factor | -2.0 |
| Z velocity factor | -0.4 |

### Heavy Weapon Soft Bounce

When a heavy weapon is hit by a punch: `y_velocity = -2`.

## Teleport Mechanics

From original engine behavior:

### Teleport to Enemy (State 400)
- Used by Woody (frame 283, `D^J` combo)
- Finds closest enemy character with `hp > 0`
- Manhattan distance: `|dx| + |dz|`, max range: 10000 units
- Placement: `x = enemy.x ± 120`, `z = enemy.z + 1`, `y = 0`
- All velocities reset to 0

### Teleport to Ally (State 401)
- Used by Woody (frame 298)
- Finds farthest ally character with `hp > 0`
- Placement: `x = ally.x ± 60`, `z = ally.z + 1`, `y = 0`
- All velocities reset to 0

## Special Attack Projectile IDs

From `global.js`: certain attack IDs are flagged for special physics treatment:
```js
specialattack_projectiles = [201, 202]  // henry_arrow1, rudolf_weapon
```

## Viewport / Camera

From `global.js`:

| Constant | Value |
|---|---|
| Window width | 794 px |
| Window outer width | 804 px |
| Wide width | 1000 px |
| Window height | 550 px |
| Outer height | 590 px |
| Viewer height | 400 px |
| Camera speed factor | 1/18 |
