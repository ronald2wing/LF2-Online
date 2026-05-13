# Character Movement Metrics

> Source: decoded LF2 v2.0a `.dat` file metadata (`bmp` section)

## v2.0a Character Speed Tables

| Character | walk_speed | walk_z | run_speed | run_z | jump_h | jump_d | dash_h | dash_d |
|---|---|---|---|---|---|---|---|---|
| Template | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Davis | 5 | 2.5 | 10 | 1.6 | -16.3 | 10 | -10 | 18 |
| Dennis | 5 | 2.5 | 10.5 | 1.65 | -16.3 | 10 | -10 | 18 |
| Woody | 5 | 2.5 | 10 | 1.6 | -16.3 | 10 | -10 | 18 |
| Deep | 5 | 2.3 | 8.5 | 1.6 | -16.3 | 9 | -10 | 16 |
| Louis | 5 | 2.5 | 9 | 1.54 | -18.7 | 10 | -13.8 | 17.5 |
| Bandit | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| John | 5 | 2.5 | 11.2 | 1.67 | -16.3 | 10 | -10 | 18 |
| Henry | 5 | 2.5 | 11 | 1.7 | -16.3 | 10 | -11 | 18 |
| Rudolf | 6 | 2.5 | 13 | 1.6 | -16.3 | 10 | -10 | 18 |
| Firen | 5 | 2.5 | 9.6 | 1.58 | -16.3 | 10 | -10 | 18 |
| Freeze | 5 | 2.5 | 9.3 | 1.56 | -16.3 | 10 | -10 | 18 |
| Hunter | 4.2 | 2.1 | 8.4 | 1.5 | -16.3 | 8 | -11 | 15 |

### Speed Profiles

The basic roster has no shared tiers — each `.dat` header declares its own constants. Recurring profiles:

| Profile | Characters | walk | run | jump_dist | dash_dist |
|---|---|---|---|---|---|
| Basic | Template, Bandit | 4 | 8 | 8 | 15 |
| Hunter | Hunter | 4.2 | 8.4 | 8 | 15 |
| Davis-class | Davis, Woody | 5 | 10 | 10 | 18 |
| Dennis | Dennis | 5 | 10.5 | 10 | 18 |
| Deep | Deep | 5 | 8.5 | 9 | 16 |
| Louis | Louis | 5 | 9 | 10 | 17.5 |
| Firen | Firen | 5 | 9.6 | 10 | 18 |
| Freeze | Freeze | 5 | 9.3 | 10 | 18 |
| John | John | 5 | 11.2 | 10 | 18 |
| Henry | Henry | 5 | 11 | 10 | 18 |
| Rudolf | Rudolf | 6 | 13 | 10 | 18 |

Louis has the highest jump (-18.7) and dash (-13.8) arcs of the basic roster; Rudolf is the fastest runner (walk 6, run 13).

## Universal Default Values

The only constants shared by every character's `.dat` header:

| Parameter | Value |
|---|---|
| `walking_frame_rate` | 3 |
| `running_frame_rate` | 3 |
| `rowing_height` | -2 |

`rowing_distance` is 5 for nearly all characters (Sorcerer 4.8, LouisEX/Firzen 6). The `heavy_*` speeds are per-character, not universal — they range from Template/Bandit/Monk's 3.0/1.5/5.0/0.8 up to LouisEX's 5.0/2.5/12.0/1.6.

## Jump/Dash Z Velocities

| Character | jump_distancez | dash_distancez |
|---|---|---|
| Template | 3.0 | 3.75 |
| Davis/Dennis/Woody | 3.75 | 5.0 |
| Deep | 3.75 | 5.0 |
| Louis | 3.75 | 5.0 |
| John/Henry/Rudolf/Firen/Freeze | 3.75 | 5.0 |
| Bandit/Hunter | 3.0 | 3.75 |

## Heavy Weapon Speed Comparison

| Speed | Normal (Davis) | Heavy | Ratio |
|---|---|---|---|
| Walking X | 5 | 3.7 | 74% |
| Running X | 10 | 6.2 | 62% |
| Walking Z | 2.5 | 1.85 | 74% |
| Running Z | 1.6 | 1.0 | 62.5% |

The example uses Davis's constants. Heavy weapons reduce carrier speed, but the `heavy_*` values are per-character — Deep carries at 4.5/2.1/7.5/1.45, Template/Bandit/Monk at 3.0/1.5/5.0/0.8, and LouisEX at 5.0/2.5/12.0/1.6.

## Universal HP/MP Values

| Parameter | Value |
|---|---|
| HP (full) | 500 |
| MP (full) | 500 |
| MP (start) | 200 |
| Passive HP regen | +1 / 12 TU |
| HP per milk drink | 150 |
| MP per beer drink | 250 |

## Per-Object Properties

From `properties.js` — extended attributes for specific object IDs:

### Mass Values

| Object | mass |
|---|---|
| Stick (100) | 0.3 |
| Hoe (101) | 0.7 |
| Ice Sword (213) | 0.5 |
| Stone (150) | 0.9 |
| Henry Arrow (201) | 0.3 |
| Rudolf Weapon (202) | 0.3 |
| Default (all others) | 1.0 |

### Throw Properties

| Weapon | run_throw | jump_throw | dash_throw | stand_throw | just_throw |
|---|---|---|---|---|---|
| Stick (100) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Hoe (101) | ✓ | ✓ | — | — | — |
| Knife (120) | ✓ | ✓ | — | — | — |
| Baseball (121) | ✓ | ✓ | — | ✗ | ✗ |
| Boomerang (124) | ✓ | ✓ | — | — | ✓ |
| Ice Sword (213) | ✓ | ✓ | — | — | — |

### Attackability

All light weapons are `attackable: true` by default.

### Effect Flags

| Object | Flag |
|---|---|
| Freeze Column (212) | `no_shadow: true` |
| Effect Hit (900) | `oscillate: 4` |
| Effect Fire (902) | `oscillate: 3` |

### HP/MP Restore

| Item | Restores |
|---|---|
| Milk (122) | +150 HP (`hp_heal: 150`) |
| Beer (123) | +250 MP (`mp_heal: 250`) |

### Character Flags

| Character | Flag |
|---|---|
| Bandit (30) | `dash_backattack: false`, `heavy_weapon_dash: false`, `heavy_weapon_jump: false` |

## Note on Extended Characters

Characters beyond the basic roster (Mark, Jack, Sorcerer, Monk, Jan, Knight, Bat, Justin, LouisEX, Firzen, Julian) have movement parameters in their respective `.dat` files. They follow the same format as the characters listed above.

### Template Character

The Template is available as id:0 (Deep is id:1). Use frame values from `template.dat` for any new character that doesn't define specific frames.
