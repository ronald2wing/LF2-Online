# Character Movement Metrics

> Source: decoded LF2 v2.0a `.dat` file metadata (`bmp` section)

## v2.0a Character Speed Tables

| Character | walk_speed | walk_z | run_speed | run_z | jump_h | jump_d | dash_h | dash_d |
|---|---|---|---|---|---|---|---|---|
| Template | 5 | 2.5 | 10 | 1.6 | -16.3 | 10 | -10 | 18 |
| Davis | 5 | 2.5 | 10 | 1.6 | -16.30 | 10 | -10 | 18 |
| Dennis | 5 | 2.5 | 10 | 1.6 | -16.30 | 10 | -10 | 18 |
| Woody | 5 | 2.5 | 10 | 1.6 | -16.30 | 10 | -10 | 18 |
| Deep | 5 | 2.5 | 10 | 1.6 | -16.30 | 10 | -10 | 18 |
| Louis | 5 | 2.5 | 9 | 1.54 | -18.70 | 10 | -13.8 | 17.5 |
| Bandit | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| John | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Henry | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Rudolf | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Firen | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Freeze | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |
| Hunter | 4 | 2.0 | 8 | 1.3 | -16.3 | 8 | -11 | 15 |

### Speed Tiers

| Tier | Characters | walk | run | jump_dist | dash_dist |
|---|---|---|---|---|---|
| Fast | Davis, Deep, Dennis, Woody | 5 | 10 | 10 | 18 |
| Normal | Bandit, John, Henry, Rudolf, Louis, Firen, Freeze, Hunter | 4 | 8 | 8 | 15 |
| Heavy | Louis | 5* | 9* | 10* | 17.5* |

*Louis has unique movement: faster walk but slower run/dash than Fast tier, with higher jump (-18.7) and dash (-13.8) arcs.

## Universal Default Values

All characters (unless overridden in `.dat` file):

| Parameter | Value |
|---|---|
| `walking_frame_rate` | 3 |
| `running_frame_rate` | 3 |
| `rowing_height` | -2 |
| `rowing_distance` | 5 |
| `heavy_walking_speed` | 3.7 |
| `heavy_walking_speedz` | 1.85 |
| `heavy_running_speed` | 6.2 |
| `heavy_running_speedz` | 1.0 |

## Jump/Dash Z Velocities

| Character | jump_distancez | dash_distancez |
|---|---|---|
| Template | 3.0 | 3.75 |
| Davis/Dennis/Woody | 3.75 | 5.0 |
| Deep | 3.75 | 5.0 |
| Louis | 3.75 | 5.0 |
| Bandit/John/Henry/Rudolf/Firen/Freeze/Hunter | 3.0 | 3.75 |

## Heavy Weapon Speed Comparison

| Speed | Normal (Fast tier) | Heavy | Ratio |
|---|---|---|---|
| Walking X | 5 | 3.7 | 74% |
| Running X | 10 | 6.2 | 62% |
| Walking Z | 2.5 | 1.85 | 74% |
| Running Z | 1.6 | 1.0 | 62.5% |

Heavy weapons reduce carrier speed to ~60-75% of normal. These values apply across all characters — `heavy_*` speeds are the same regardless of base speed tier.

## Universal HP/MP Values

| Parameter | Value |
|---|---|
| HP (full) | 500 |
| MP (full) | 500 |
| MP (start) | 200 |
| HP per rowing recovery roll | 6 |
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

The Template is available as id:01 (using id:0 is a special dummy). Use frame values from `template.dat` for any new character that doesn't define specific frames.
