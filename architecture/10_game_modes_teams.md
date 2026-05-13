# Game Modes, Teams & RNG

> Source: original LF2 v2.0a game modes, `global.js` team constants

## Game Modes

LF2 v2.0a supports the following game modes, accessed from the main menu:

| Mode | Description |
|---|---|
| VS Mode | Free-for-all or team battle (up to 4 human + 4 computer) |
| Stage Mode | Clear waves of enemies (5 stages) |
| Championship 1-on-1 | Single-elimination tournament |
| Championship 2-on-2 | Tag team tournament |
| Battle Mode | Custom battle with team assignment |
| Demo Mode | AI vs AI attract mode (auto-plays when idle at title) |
| Playback Recording | Replay recorded gameplay |

## Team System

Each object in the game has a team assignment. Team determines who can hit whom.

### Team Constants

From the original engine (team IDs used in player/computer assignment):

| Team ID | Description |
|---|---|
| 0 | Independent / no team (weapons, projectiles default) |
| 1 | General team 1 (Battle Mode team) |
| 2 | General team 2 |
| 3 | General team 3 |
| 4 | General team 4 |
| 5 | Stage Mode enemies |
| 10 | Player 1's team |
| 11 | Player 2's team |
| 12 | Player 3's team |
| 13 | Player 4's team |
| 20 | Computer 1's team |
| 21 | Computer 2's team |
| 22 | Computer 3's team |
| 23 | Computer 4's team |
| 24 | Computer 5's team |
| 25 | Computer 6's team |
| 26 | Computer 7's team |
| 27 | Computer 8's team |

The JavaScript port does not use these IDs directly. It assigns
`player_team = 1` (`match.js:83`), battle-mode teams `[1, 2]` (`match.js:91`),
and a default `team: 0` (`match.js:511`); stage-mode enemies are on team 2
(`stage-mode.js:55`).

### Team Interaction Rules

From hit validation:

1. **Team-Exclusive ITRs** (kinds 0, 1, 3, 6, 9, 10, 11, 15, 16):
   - Cannot hit same-team objects
   - Exception: frozen characters (state 13), caught characters (state 10), weapons/drinks (types 1, 2, 4, 6)

2. **Kind 5 (Weapon Swing)**:
   - Uses the weapon **holder's team**, not the weapon's team
   - Cannot hit same team as the holder

3. **Kind 4 (Thrown/Falling)**:
   - Team-neutral — always hits regardless of team

4. **Stage Mode**:
   - Hostage criminals (id 300) join the player's team when defeated (HP ≤ 0) instead of dying
   - Stage mode enemies are on team 5 (original engine)

## Object Pool Allocation by Team (Original C++ Engine)

| Slots | Purpose |
|---|---|
| 0–7 | Players (8 slots) |
| 8–9 | Reserved |
| 10–17 | Computers (C1–C8) |
| 18–19 | Reserved |
| 20–49 | Characters / Drinks (30 slots) |
| 50–399 | Weapons / Attacks / Criminals (350 slots) |

## Player Assignment

Up to 4 human players, each with:
- A keyboard/joystick mapping (from `control.txt`)
- A team assignment
- An `object_t` in slots 0-7
- Individual HP/MP tracking

## Computer AI

Up to 8 computer players (slots 10-17), each with:
- An AI script (from the AI pack)
- Team assignments 20-27

Available AI scripts (from `data.js`):
| ID | Name | Description |
|---|---|---|
| 1 | CRUSHER 1.0 | Aggressive close-combat AI |
| 2 | CHALLANGAR 1.0 | Balanced AI |
| 3 | Rookie | Beginner-level AI |
| 4 | Ninja | Evasive AI (used by Rudolf clones) |
| 5 | Basic AI | Simple AI |

## RNG (Random Number Generator)

LF2 uses a deterministic PRNG for:
- Random weapon drops from the sky (F8 key, periodic auto-drop)
- Random hero enemies in stage mode (`id: 1000` resolves to a random playable hero)
- Random placement positions and visual effect variation

From the engine: `random(0, range)` — returns value in `[0, range)` using a two-table state machine.

## Stage Mode

### Background Stages

Original LF2 v2.0a includes 9 stages plus 3 template stages. The template stages are authoring examples, not selectable stages — they display their own layer filenames (`pic1.bmp`, …) as a guide for level authors:

| ID | Name | File |
|---|---|---|
| 0 | Tai Hom Village | `bg/sys/thv/bg.dat` |
| 1 | CUHK | `bg/sys/cuhk/bg.dat` |
| 2 | Lion Forest | `bg/sys/lf/bg.dat` |
| 3 | Stanley Prison | `bg/sys/sp/bg.dat` |
| 4 | HK Coliseum | `bg/sys/hkc/bg.dat` |
| 5 | The Great Wall | `bg/sys/gw/bg.dat` |
| 6 | Queen's Island | `bg/sys/qi/bg.dat` |
| 7 | Forbidden Tower | `bg/sys/ft/bg.dat` |
| 8 | — | `bg/sys/bc/bg.dat` |
| 10 | Template 1 | `bg/template/1/bg.dat` |
| 11 | Template 2 | `bg/template/2/bg.dat` |
| 12 | Template 3 | `bg/template/3/bg.dat` |

### Stage Data

The original `stage.dat` defines enemy wave compositions for the campaign. Stage data is per-chapter (chapter 1-5, corresponding to the 5 stages).

### Sky Drop Config

From `data.txt`: `id: 100~199 drop weapon` — objects with IDs in this range can drop from the sky in **VS mode**, either automatically during a match or on the F8 key. (F8 is one of the F5–F9 keys, which the readme states are disabled in stage mode.)

## Function Keys

From `readme.txt`:

| Key | Function | Notes |
|---|---|---|
| F1 | Pause | |
| F2 | Pause/Step | Frame-by-frame advance |
| F3 | Lock F6-F9 | |
| F4 | Restart | |
| F5 | Speed up | Disable frame limiter |
| F6 | Unlimited MP | |
| F7 | Recover | Full HP/MP |
| F8 | Drop weapons | Random weapons from sky |
| F9 | Destroy weapons | Remove all items |
| F11 | Volume + | |
| F12 | Volume - | |
| ESC | Quit | |

F5-F9 are disabled in Stage Mode.
