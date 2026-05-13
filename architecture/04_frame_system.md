# Frame System

> Source: original LF2 v2.0a `.dat` frame data, `entity.js` frame transition engine

Every object is defined by up to **400 frames** (0–399). Each frame describes a single animation snapshot with timing, hitboxes, and transition rules.

## Frame Fields

From decoded `.dat` frame data:

| Field | Type | Description |
|---|---|---|
| `pic` | number | Sprite picture index (which grid cell to render) |
| `state` | number | State machine state (0–19, 1000–3003) |
| `wait` | number | Duration in TU before auto-transition |
| `next` | number | Next frame number (999=reset, 1000=destroy) |
| `dvx` | number | Horizontal velocity delta applied per TU |
| `dvy` | number | Vertical velocity delta applied per TU |
| `dvz` | number | Z-axis velocity delta applied per TU |
| `centerx` | number | Horizontal center offset (pixels from left edge of sprite) |
| `centery` | number | Vertical center offset (pixels from top of sprite) |
| `mp` | number | MP cost (positive=deduct, negative=recover, 0=none) |
| `sound` | string | Sound effect file path ("1/048" = 048.wav) |
| `hit_a` | number | Frame to go to when Attack key pressed |
| `hit_d` | number | Frame to go to when Defend key pressed |
| `hit_j` | number | Frame to go to when Jump key pressed |
| `hit_Fa` | number | Frame for D>A / D<A combo |
| `hit_Ua` | number | Frame for D^A combo |
| `hit_Da` | number | Frame for DvA combo |
| `hit_Fj` | number | Frame for D>J / D<J combo |
| `hit_Uj` | number | Frame for D^J combo |
| `hit_Dj` | number | Frame for DvJ combo |
| `hit_ja` | number | Frame for DJA combo |

### Sub-structures (per frame)

| Field | Description |
|---|---|
| `itr` | Attack hitbox (single object or array) |
| `bdy` | Body/vulnerable hitbox (single object or array) |
| `opoint` | Object spawn point |
| `wpoint` | Weapon attachment point |
| `bpoint` | Blood splatter point |
| `cpoint` | Catch point |

### ITR Fields

| Field | Type | Description |
|---|---|---|
| `kind` | number | ITR kind (0–16) |
| `x`, `y` | number | Offset from center (mirrored for facing) |
| `w`, `h` | number | Width and height of hitbox |
| `zwidth` | number | Z-axis interaction width (0 = engine uses 15) |
| `dvx` | number | Knockback X velocity on target |
| `dvy` | number | Knockback Y velocity on target |
| `fall` | number | Fall value added to target |
| `arest` | number | Attacker rest cooldown (TUs) |
| `vrest` | number | Victim rest/invincibility (TUs) |
| `bdefend` | number | Bdefend subtracted from target |
| `injury` | number | HP damage dealt |
| `effect` | number | Visual/behavioral effect (0=punch, 1=bleed, 2=fire, 3=ice, 4=shrafe) |
| `catchingact` | array[2] | Catcher frames [front approach, back approach] |
| `caughtact` | array[2] | Caught frames [from front, from behind] |

### BDY Fields

| Field | Type | Description |
|---|---|---|
| `kind` | number | 0 = normal body; >= 1000 = stage mode block |
| `x`, `y` | number | Offset from center (mirrored for facing) |
| `w`, `h` | number | Width and height |

### BPoint Fields

| Field | Type | Description |
|---|---|---|
| `x`, `y` | number | Blood splatter offset from center |

## Frame Transition Logic

From `entity.js` — the frame transition state machine:

### `next` Field Semantics

| `next` Value | Behavior |
|---|---|
| 999 (FRAME.RESET) | Loop to frame 0 (restart sequence) |
| 1000 (FRAME.DESTROY) | Destroy object (remove from world) |
| 1280 (FRAME.DISAPPEAR) | Disappear effect |
| Negative | Go to `abs(next)` AND switch facing direction |
| Other positive | Go to that frame number |

### Transition Priority (Authority System)

Frame transitions use an authority level system. Higher authority overrides lower:

| Level | Constant | Used For |
|---|---|---|
| 0 | NATURAL | Default `wait` timer expiry |
| 10 | MOVE | Move, defend, jump inputs |
| 11 | SPECIAL | Combo inputs |
| 15 | ENVIRONMENTAL | Environmental effects |
| 20 | INTERACTION | Hit reactions, throws |
| 30 | STRONG | Knockdown, freeze, fire |
| 99 | INHERIT | Inherits current level |

### Transition Flow

Each TU:
1. `wait` counter decrements by 1
2. If `wait == 0`:
   - Check `next` value → go to that frame or loop/destroy
   - Reset `wait` to new frame's `wait` value
3. If a `hit_*` tag is non-zero and the corresponding input fires:
   - Jump to that frame immediately (interrupting wait)
   - Authority level determines which transition wins when multiple fire
4. When transitioning to a new frame:
   - `wait` is set to the new frame's value
   - Frame forces (`dvx`, `dvy`, `dvz`) are applied as velocity deltas
   - MP cost is deducted
   - `opoint` spawns any objects
   - `sound` is triggered

## MP Cost Logic

From decoded frame data:

- `mp > 0`: MP is consumed when transitioning to this frame
- `mp < 0`: MP is recovered (e.g., Firen's Burn Run: `mp: -10` per tick)
- `mp == 0`: No MP change
- MP cannot go below 0 — if `mp > current_mp`, the move is cancelled
- MP cost is on the first frame of a move; subsequent frames in the sequence have `mp: 0` or the total cost is on a single key frame

Special combo MP convention (from original):
- `mp % 1000` = actual MP cost
- `floor(mp / 1000) * 10` = HP cost
- Example: `mp: 4300` = 300 MP + 40 HP (Firen's Explosion)

## ITR Kinds

From `global.js` ITR_KIND:

| Kind | Name | Description |
|---|---|---|
| 0 | NORMAL | Standard attack hitbox. Team-exclusive. |
| 1 | CATCH | Catches characters in Dance of Pain (state 16). Team-exclusive. |
| 2 | PICK_WEAPON | Picks up items on ground. |
| 3 | SUPER_CATCH | Catches any character. Team-exclusive. |
| 4 | FALLING | Thrown weapon/falling hitbox. Team-neutral. |
| 5 | WEAPON_SWING | Weapon hitbox (uses weapon_strength_list). |
| 7 | PICK_WEAPON_EASY | Pick up weapon while rolling (rowing). |
| 8 | HEAL | Restores HP to target. Characters only. |
| 9 | REFLECT_SHIELD | Destroys/reflects incoming projectiles. |
| 10 | FLUTE | Henry's flute — puts enemies to sleep. |
| 11 | FLUTE_VARIANT | Rudolf's transformation effect. |
| 14 | ICE_COLUMN | Obstacle — blocks character movement. |
| 15 | WHIRLWIND | Knockback effect for thrown objects. |
| 16 | WHIRLWIND_VARIANT | Freeze's ice effect — applies frozen state. |

## ITR Effects

From `global.js` EFFECT:

| Effect | Value | Pattern | Description |
|---|---|---|---|
| NORMAL | 0 | — | Normal punch/weapon hit |
| BLOOD | 1 | — | Blood splatter |
| FIRE | 2 | `%10 == 2` | Basic fire damage |
| ICE | 3 | `%10 == 3` | Basic freeze |
| EXPLOSION | 4 | — | Energy beam (shrafe — Davis's Dragon Punch) |
| WEAK_FIRE | 20 | `%10 == 2` | Burning DoT |
| WEAK_FIRE2 | 21 | `%10 == 2` | Firen's flame column |
| WEAK_FIRE3 | 22 | `%10 == 2` | Firen's self-destruct |
| WEAK_FIRE4 | 23 | `%10 == 2` | Julian's soul bomb |
| WEAK_ICE | 30 | `%10 == 3` | Freeze's ice column |

Effect pattern: effects wrap to 10, so fire effects are those where `% 10 == 2` and ice effects where `% 10 == 3`.

## Standard Character Frame Ranges

Original LF2 v2.0a characters follow these frame conventions (template-based):

```
   0 –   3: Standing            (state 0)
   5 –   8: Walking             (state 1)
   9 –  11: Running             (state 2)
  12 –  15: Heavy Object Walk   (state 1)
  16 –  18: Heavy Object Run    (state 2)
  19:       Heavy Stop Run      (state 15)
  20 –  28: Normal Weapon Attack(state 3)
  30 –  33: Jump Weapon Attack  (state 3)
  35 –  37: Run Weapon Attack   (state 3)
  40 –  43: Dash Weapon Attack  (state 3)
  45 –  47: Light Weapon Throw  (state 3)
  50 –  51: Heavy Weapon Throw  (state 3)
  52 –  54: Sky Light WP Throw  (state 15)
  55 –  58: Weapon Drink        (state 17)
  60 –  68: Punch               (state 3)
  70 –  73: Super Punch         (state 3)
  80 –  81: Jump Attack         (state 3)
  85 –  87: Run Attack          (state 3)
  90 –  91: Dash Attack         (state 3)
  95:       Dash Defend         (state 7)
 100 – 101: Rowing (from fall)  (state 6)
 102 – 109: Rowing (roll)       (state 6)
 110 – 111: Defend              (state 7)
 112 – 114: Broken Defend       (state 8)
 115:       Pick Light Weapon   (state 15)
 116 – 117: Pick Heavy Weapon   (state 15)
 120 – 123: Catching            (state 9)
 130 – 144: Picked Caught       (state 10)
 180 – 191: Falling             (state 12)
 200 – 202: Ice                 (state 13)
 203 – 206: Fire                (state 18)
 207:       Tired               (state 15)
 210 – 212: Jump                (state 4)
 213 – 214: Dash                (state 4)
 215:       Crouch              (state 15)
 218:       Stop Running        (state 15)
 219:       Crouch2             (state 15)
 220 – 229: Injured             (state 11)
 230 – 231: Lying               (state 14)
 232 – 234: Throw Lying Man     (state 9)
 235 – 399: Special Attacks     (character-specific)
```

Note: Exact frame indices vary by character. Some characters skip frames or extend ranges.

## Weapon Frame Ranges

Light weapons:

| Frames | State | Name | Description |
|---|---|---|---|
| 0–15 | 1000 (in_the_sky) | Falling | Through air |
| 20–35 | 1001 (on_hand) | Held | Handheld, itr:kind:5 for attack |
| 40–55 | 1002 (throwing) | Throwing | Projectile, itr:kind:0 for hit |
| 60–63 | 1003 (on_ground) | Bouncing | Ground contact bounce |
| 64 | 1004 (idle) | Resting | Pickable, has bdy for pickup |
| 70–72 | 1003 (just_on_ground) | Landing | Bounce-to-rest transition |

Heavy weapons use 2000-series states with similar structure.

## Projectile Frame Ranges

| State | Name | Description |
|---|---|---|
| 3000 | Flying | Active projectile with itr hitbox |
| 3001 | Hitting | Impact animation |
| 3002 | Hit | Hit reaction |
| 3003 | Rebounded | Reflected by forcefield |

Projectiles ignore gravity — they fly in straight lines at constant velocity.
