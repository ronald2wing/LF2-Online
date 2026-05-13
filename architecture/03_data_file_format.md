# Data File Format

> Source: original LF2 v2.0a `data.txt`, decoded `.dat` files

## `data.txt` — Master Index

Located at `data/data.txt` in the LF2 directory. This text file defines all game objects, their IDs, types, and which `.dat` file contains their data.

### Object Entry Format

```
id: <ID>  type: <TYPE>  file: <PATH>
```

Each object is defined on a single line. The file is wrapped in `<object>` ... `<object_end>` tags.

### Section Structure

```
<object>
id:  0  type: 0  file: data\template.dat
id: 11  type: 0  file: data\davis.dat
...
id: 100  type: 1  file: data\weapon0.dat   #stick
...
<object_end>

<file_editing>
data\nothing.txt
<file_editing_end>

<background>
id: 4    file: bg\sys\hkc\bg.dat
...
<background_end>

id: 100~199 drop weapon
```

### Object IDs

Characters (type 0):
```
template = 0     deep    = 1     john    = 2
henry    = 4     rudolf  = 5     louis   = 6
firen    = 7     freeze  = 8     dennis  = 9
woody    = 10    davis   = 11    bandit  = 30
hunter   = 31    mark    = 32    jack    = 33
sorcerer = 34    monk    = 35    jan     = 36
knight   = 37    bat     = 38    justin  = 39
louisEX  = 50    firzen  = 51    julian  = 52
```

Weapons/Items (type 1/2/4/6):
```
stick       = 100 (type 1)    hoe         = 101 (type 1)
knife       = 120 (type 1)    baseball    = 121 (type 4)
milk        = 122 (type 6)    beer        = 123 (type 6)
boomerang   = 124 (type 1)    stone       = 150 (type 2)
wooden_box  = 151 (type 2)    ice_sword   = 213 (type 1)
louis_armor = 217 (type 2)    louis_wrist = 218 (type 2)
```

Special Attacks (type 3):
```
john_ball      = 200    henry_arrow1   = 201
rudolf_weapon  = 202    deep_ball      = 203
henry_wind     = 204    dennis_ball    = 205
woody_ball     = 206    davis_ball     = 207
henry_arrow2   = 208    freeze_ball    = 209
firen_ball     = 210    firen_flame    = 211
freeze_column  = 212    john_biscuit   = 214
dennis_chase   = 215    jack_ball      = 216
jan_chaseh     = 219    jan_chase      = 220
firzen_chasef  = 221    firzen_chasei  = 222
firzen_ball    = 223    bat_ball       = 224
bat_chase      = 225    justin_ball    = 226
julian_ball    = 228    julian_ball2   = 229
```

Other:
```
criminal       = 300 (type 5)
etc            = 998 (type 5)
broken_weapon  = 999 (type 5)
```

### Item Drop Config

```
id: 100~199 drop weapon
```

Objects with IDs 100–199 can drop from the sky (stage mode, F8 key).

## `control.txt` — Key Configuration

Located at `data/control.txt`. Defines keyboard mappings for up to 4 players.

Format:
```
<joystick> <up> <down> <left> <right> <attack> <jump> <defend> <status> <type> <special>
```

- Each line = one player's control config
- Players 2-4 use lines 2-4
- `joystick`: 0 = keyboard, 1-4 = joystick ID
- Key codes: Windows virtual key codes (e.g., 104=up, 98=down, 100=left, 102=right, 101=attack, 96=jump, 107=defend)
- Lines 5+: misc settings

Default controls (from `control.txt`):
```
P1: Up/Down/Left/Right = arrow keys, Attack = Numpad 5, Jump = Numpad 0, Defend = Numpad +
P2: Up/Down/Left/Right = W/S/A/D, Attack = S (second), Jump = Tab, Defend = ~
P3: Up/Down/Left/Right = arrows (alt), Attack = Enter, Jump = Shift, Defend = Ctrl
P4: Up/Down/Left/Right = I/K/J/L, Attack = Space, Jump = . (period), Defend = /
```

## `.dat` File Structure

Each `.dat` file is a **binary** file containing:

1. **Header/metadata**: Character name, sprite dimensions, movement speeds
2. **Frame data**: Up to 400 frames, each defining pic, state, wait, next, velocity deltas, hitboxes, and transitions

The exact binary layout is platform-specific (Windows `.dat` format). Ports to JavaScript/JSON use equivalent key-value structures.

## Decoded Frame Data Format (JS equivalent)

A decoded `.dat` file produces a JS object:

```js
export default {
  bmp: {
    file: [
      { "file(0-69)": "sprite/davis_0.png", w: 79, h: 79, row: 10, col: 7 }
      // ... more sprite sheets
    ],
    name: "Davis",
    head: "sprite/davis_f.png",
    small: "sprite/davis_s.png",
    walking_frame_rate: 3,
    walking_speed: 5,
    walking_speedz: 2.5,
    running_frame_rate: 3,
    running_speed: 10,
    running_speedz: 1.6,
    heavy_walking_speed: 3.7,
    heavy_walking_speedz: 1.85,
    heavy_running_speed: 6.2,
    heavy_running_speedz: 1,
    jump_height: -16.299999,
    jump_distance: 10,
    jump_distancez: 3.75,
    dash_height: -10,
    dash_distance: 18,
    dash_distancez: 5,
    rowing_height: -2,
    rowing_distance: 5
    // ... weapon-specific: weapon_hp, weapon_drop_hurt etc.
  },
  frame: {
    0: { pic: 0, state: 0, wait: 5, next: 1, dvx: 0, dvy: 0, dvz: 0,
          centerx: 39, centery: 79,
          hit_a: 0, hit_d: 0, hit_j: 0, hit_Fa: 240, hit_Ua: 300, ...
          bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 },
          itr: { kind: 0, x: 35, y: 22, w: 34, h: 48, dvx: 2, fall: 20... },
          wpoint: { kind: 1, x: 23, y: 55, weaponact: 23, attacking: 0... },
          opoint: { kind: 1, x: 41, y: 42, action: 0, dvx: 0, dvy: 0, oid: 207, facing: 0 },
          cpoint: { kind: 1, x: 61, y: 39, vaction: 130, aaction: 122... },
          bpoint: { x: 39, y: 34 },
          sound: "1/048" }
    // ... up to 399 more frames
  },
  weapon_strength_list: {  // weapons only
    1: { entry: "normal", dvx: 2, fall: 40, vrest: 10, bdefend: 16, injury: 40 },
    2: { entry: "jump", dvx: 7, fall: 70, vrest: 10, bdefend: 16, injury: 40 },
    3: { entry: "run", dvx: 10, fall: 70, vrest: 10, bdefend: 16, injury: 50 },
    4: { entry: "dash", dvx: 12, fall: 70, vrest: 20, bdefend: 60, injury: 50 }
  }
}
```

### `hit_*` Tag Values

Hit tags can have these special values:
- `0`: No transition (ignored)
- Positive integer: Transition to that frame number
- If multiple hit tags match simultaneously, higher priority combos take precedence

### `opoint` — Object Spawn

| Field | Description |
|---|---|
| `kind` | 1 = spawn |
| `x`, `y` | Offset from parent center |
| `action` | Frame the spawned object starts on |
| `dvx`, `dvy` | Initial velocity |
| `oid` | Object ID to spawn |
| `facing` | 0 = same as parent; non-zero = spread direction |

Special case: `oid: 5` (Rudolf) spawns `|facing| / 10` clones.

### `wpoint` — Weapon Attachment

| Field | Description |
|---|---|
| `kind` | 1 = attach, 2 = auto-throw, 3 = drop/destroy |
| `x`, `y` | Attachment offset from center |
| `weaponact` | Frame the weapon goes to while held |
| `attacking` | Which strength list entry to use (0=none) |
| `cover` | Defense coverage value |
| `dvx`, `dvy`, `dvz` | Throwing velocity (kind 2 only) |

### Frame 399 Convention

Frame 399 is conventionally the **dummy frame** — a no-op fallback frame used when no other frame data exists. It typically has `pic: 0`, `state: 0`, `wait: 0`, `next: 0` and a default bdy.
