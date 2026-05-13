# Sprite System

> Source: original LF2 v2.0a `sprite/` BMP files, decoded `.dat` file metadata

## Sprite Sheet Format

LF2 v2.0a uses **BMP** sprite sheets organized in grid layouts. Each cell is drawn when a frame's `pic` index selects it.

### Sheet Grid

From decoded `.dat` file `bmp` section:

```js
bmp: {
  file: [
    { "file(0-69)":   "sprite/davis_0.png", w: 79, h: 79, row: 10, col: 7 },
    { "file(70-139)": "sprite/davis_1.png", w: 79, h: 79, row: 10, col: 7 },
    { "file(140-209)": "sprite/davis_2.png", w: 79, h: 79, row: 10, col: 7 }
  ]
}
```

| Attribute | Description |
|---|---|
| `file(N-M)` | Path to sprite sheet, covering pic indices N through M |
| `w` | Width of each frame cell in pixels (drawable area) |
| `h` | Height of each frame cell in pixels (drawable area) |
| `row` | Number of columns (frames per row) |
| `col` | Number of rows (frames per column) |

Frames are numbered 0, 1, 2... left-to-right, top-to-bottom. The `pic` field in each frame descriptor selects which grid cell to render.

### Frame → Sprite Resolution

Given a `pic` index:
1. Find which sprite sheet contains it (each sheet covers a range)
2. Compute row/col position within that sheet: `row = floor(pic_offset / row_count)`, `col = pic_offset % row_count`
3. Render the cell at that grid position

### Character Sprite Dimensions

Character sprites: **79 × 79 px**, typically in 10 × 7 grids (70 frames per sheet).

A character with 3 sheets covers 210 frames. Characters with fewer animation frames may use fewer sheets.

### Weapon/Projectile Sprite Dimensions

| Object Type | Dimensions | Grid |
|---|---|---|
| Light Weapons (stick, hoe, etc.) | 48 × 48 | 10 × 10 |
| Heavy Weapons (stone) | 58 × 58 | 10 × 10 |
| Firen Ball (projectile) | 81 × 82 | 4 × 3 |
| Other projectiles | Varies | Varies |

## Facing Direction and Mirroring

Characters can face **right** (facing = 0) or **left** (facing = 1).

### v2.0a Mirror System

From `readme.txt` (11 Jul 2009 update):

Originally LF2 used DirectDraw's mirror function. This broke on newer GPUs (Geforce 9800). The v2.0a fix pre-renders mirrored sprites:

```
sprite/sys/davis_0.bmp        → standard right-facing
sprite/sys/davis_0_mirror.bmp → pre-rendered left-facing
```

If `*_mirror.bmp` is not provided, the engine falls back to programmatic mirroring (horizontal flip).

### Sprite Files per Character

From the `sprite/sys/` directory, each character has:
- `character_0.bmp` + `character_0_mirror.bmp` — Sheet 1 (pics 0-69)
- `character_1.bmp` + `character_1_mirror.bmp` — Sheet 2 (pics 70-139)
- `character_2.bmp` + `character_2_mirror.bmp` — Sheet 3 (pics 140-209)
- `character_f.bmp` — Face/head avatar (for character select)
- `character_s.bmp` — Small HP bar icon

Some characters have additional sheets:
- `character_0b.bmp` — Alternate palette (Bandit, Hunter, Jack, Mark, Knight, Sorcerer, Justin, Monk)
- `character_3.bmp` — Extra sheet (Jan, John, Rudolf, LouisEX)

### Projectile Sprites

Projectiles have dedicated sprite sheets:
- `firen_ball.bmp` — Firen's fireball (81×82, 4×3)
- `freeze_ball.bmp` — Freeze's ice ball
- `julian_ball.bmp` / `julian_ball2.bmp` — Julian's projectiles
- `henry_arrow1.bmp` / `henry_arrow2.bmp` — Henry's arrows
- `firen_flame.bmp` — Firen's flame effects
- `freeze_col.bmp` — Freeze's ice column
- `firen_exp.bmp` — Firen's explosion
- `julian_exp.bmp` / `julian_col.bmp` / `julian_col2.bmp` — Julian's effects
- `bat_ball.bmp` / `bat_chase.bmp` — Bat projectiles
- `firzen_ball.bmp` / `firzen_chasef.bmp` / `firzen_chasei.bmp` — Firzen effects
- `firzen_up.bmp` / `firzen_up2.bmp` / `firzen_up3.bmp` — Firzen rising effects
- `freeze_ww.bmp` — Freeze's whirlwind
- `davis_ball.bmp` — Davis projectile
- `woody_ball.bmp` — Woody projectile
- `dennis_ball.bmp` / `dennis_chase.bmp` — Dennis projectiles
- `john_ball.bmp` / `john_biscuit.bmp` — John projectiles
- `henry_wind.bmp` — Henry/Louis wind effect
- `rudolf_weapon.bmp` / `rudolf_smoke.bmp` — Rudolf effects

### Weapon Sprites

```
weapon0.bmp  — Stick (48×48, 10×10)
weapon1.bmp  — Stone (58×58)
weapon2.bmp  — Hoe (48×48)
weapon3.bmp  — Wooden Box
weapon4.bmp  — Knife (48×48)
weapon5.bmp  — Baseball
weapon6.bmp  — Milk (drink)
weapon7.bmp  — Ice Sword
weapon8.bmp  — Beer (drink)
weapon9.bmp  — Boomerang
weapon10.bmp — Louis Armor
weapon11.bmp — Louis Wrister
```

### Misc Sprites

```
etc.bmp      — Miscellaneous effects
broken.bmp   — Broken weapon fragments 1
broken2.bmp  — Broken weapon fragments 2
criminal.bmp — Criminal NPC
```

## Head and Small Icons

- `head` / `*_f.bmp`: Face avatar sprite (79 × 79 px), displayed in character select screen
- `small` / `*_s.bmp`: Small HP bar icon, displayed above character in battle

## Render Position

Character position on screen:
```
screen_x = object.x - camera.x + (canvas_width - sprite.w) / 2
screen_y = canvas_height - (object.y - camera.y) - sprite.h
```

The `centerx`/`centery` from each frame determines the sprite's anchor point. Position `(x, y)` maps to the center of the character's feet.

## BMP Metadata in .dat Files

Character `.dat` files contain movement parameters in their header. These are separate from frame data and define per-character physics:

| Parameter | Typical Value | Description |
|---|---|---|
| `walking_frame_rate` | 3 | Animation frames per walking step |
| `walking_speed` | 4–5 | px/TU walking speed |
| `walking_speedz` | 2.0–2.5 | Z-axis walking speed |
| `running_frame_rate` | 3 | Animation frames per running step |
| `running_speed` | 8–10 | px/TU running speed |
| `running_speedz` | 1.3–1.6 | Z-axis running speed |
| `heavy_walking_speed` | 3.7 | Walk speed with heavy weapon |
| `heavy_walking_speedz` | 1.85 | Z walk speed with heavy weapon |
| `heavy_running_speed` | 6.2 | Run speed with heavy weapon |
| `heavy_running_speedz` | 1.0 | Z run speed with heavy weapon |
| `jump_height` | -16.3 to -18.7 | Jump apex Y velocity |
| `jump_distance` | 8–10 | Jump horizontal velocity |
| `jump_distancez` | 3.0–3.75 | Jump Z velocity |
| `dash_height` | -10 to -13.8 | Dash apex Y velocity |
| `dash_distance` | 15–18 | Dash horizontal velocity |
| `dash_distancez` | 3.75–5 | Dash Z velocity |
| `rowing_height` | -2 | Rowing roll Y velocity |
| `rowing_distance` | 5 | Rowing roll X velocity |

Weapons also have:
| Parameter | Description |
|---|---|
| `weapon_hp` | Durability (0 = unbreakable; values: 200, 400, 450, 750, 800, 1200) |
| `weapon_drop_hurt` | Self-damage when weapon bounces on ground |
| `weapon_hit_sound` | Sound on hit (e.g., "1/011") |
| `weapon_drop_sound` | Sound on drop |
| `weapon_broken_sound` | Sound on break |
