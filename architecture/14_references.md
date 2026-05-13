# References

## Primary Source — LF2 v2.0a

The definitive reference is the original **LF2 v2.0a** game distribution (`Little Fighter/` directory). This is the canonical source for all game data, engine behavior, and sprite assets.

### Original Game Files

| File | Description |
|---|---|
| `lf2.exe` | Game executable (Windows, DirectX 7, compiled C++) |
| `data/data.txt` | Master index — all object IDs, types, and file paths |
| `data/control.txt` | Keyboard/joystick configuration |
| `data/readme.txt` | Official readme — special moves, controls, changelog |
| `data/*.dat` | Binary data files — character/weapon frame definitions |
| `data/*.wav` | Sound effects (001.wav through 102.wav) |
| `sprite/sys/*.bmp` | Sprite sheets — characters, weapons, projectiles, effects |
| `bg/sys/*/bg.dat` | Background stages |

### Key Text Files

- **`data/data.txt`**: The master index — lists every `id:type:file` triplet, backgrounds, and config: `id: 100~199 drop weapon`
- **`readme.txt`**: Official documentation. Contains system requirements, function keys (F1-F12), **complete special move list** for every character with input method and MP cost, and update history.

### Official Sites

- `http://littlefighter.com/` / `http://lf2.net` — Official LF2 website
- Authors: Marti Wong and Starsky Wong (1999–2009)
- Version: **v2.0a** (released 11 Jul 2009) — the canonical version

## Engine Reference Implementations

### GemFighter (this project)

The GemFighter engine is a JavaScript port of the LF2 engine running in the browser:

```
app/javascript/engine/
  Game/              Core game engine (entity, character, mechanics, AI, collision)
  core/              Engine libraries (collision, combo-decoder, sprite rendering)
  pack/data/         Decoded LF2 .dat files in JavaScript/JSON format
  pack/AI/           AI scripts
  pack/bg/           Background definitions
  pack/UI/           UI components
  global.js          Game constants and configuration
```

### F.LF / LF2_19

Clean-room HTML5/JS implementations:
- **F.LF**: Game engine in JavaScript (GPL-3)
- **LF2_19**: LF2 game data converted to JSON format

### openlf2

A decompilation of the original LF2 v2.0a C++ source (`github.com/xsoameix/openlf2`). Provides the most detailed view into the original engine's internal struct layouts and algorithms.

## Data File Decoders

- **lf2_codec** (`github.com/azriel91/lf2_codec`): Rust library for encoding/decoding `.dat` files
- **lf2_parse** (`github.com/azriel91/lf2_parse`): Rust library for parsing LF2 data files

## Modding Tools

- **LF2.IDE** (`github.com/ahmetsait/LF2.IDE`): Graphical toolkit for character/weapon modding
- **IDL** (`github.com/ahmetsait/IDL`): Instant Data Loader — hot-reloads modified `.dat` files

## Community Documentation

- **LF-Empire Data Changing Reference**: `lf-empire.de/lf2-empire/data-changing/` — Community-maintained `.dat` format documentation
- **LF-Empire data.txt reference**: Detailed reference for `data.txt` format

## Architecture Files Index

1. [`01_engine_overview.md`](./01_engine_overview.md) — Constants, game loop, file index, combo system
2. [`02_object_system.md`](./02_object_system.md) — States, data structure, object pool, lifecycle
3. [`03_data_file_format.md`](./03_data_file_format.md) — `data.txt` format, object IDs, types, decoded frame data
4. [`04_frame_system.md`](./04_frame_system.md) — Frame fields, transitions, authority system, standard ranges
5. [`05_frame_elements.md`](./05_frame_elements.md) — ITR, BDY, OPoint, WPoint, CPoint, BPoint, weapon strength list
6. [`06_sprite_system.md`](./06_sprite_system.md) — Sprite sheets, BMP format, mirroring, character/weapon metadata
7. [`07_physics.md`](./07_physics.md) — Motion, gravity, collision, bounce, teleport, friction, defense
8. [`08_hit_validation.md`](./08_hit_validation.md) — Hit validation pipeline, team rules, immunities, catch/pickup mechanics
9. [`09_character_metrics.md`](./09_character_metrics.md) — Movement speed tables, HP/MP values, mass values
10. [`10_game_modes_teams.md`](./10_game_modes_teams.md) — Game modes, teams, RNG, stage data, function keys
11. [`11_networking.md`](./11_networking.md) — Lockstep deterministic P2P via DirectPlay/WebSocket
12. [`12_special_moves.md`](./12_special_moves.md) — Complete character special moves from `readme.txt` and frame data
13. [`13_items.md`](./13_items.md) — Light/heavy weapons, drinks, pickup mechanics, file paths
14. [`14_references.md`](./14_references.md) — This file
