# Items — Weapons, Drinks & Pickup Mechanics

> Source: decoded LF2 v2.0a weapon `.dat` files, `data.txt`, `weapon-drink.js`

## Item Types

From `data.txt`:

| Type ID | Type String | Behavior |
|---|---|---|
| 1 | Light Weapon | Pickable, wieldable as melee weapon, throwable |
| 2 | Heavy Weapon | Liftable (slows carrier), thrown for heavy damage |
| 4 | Throw Weapon | Baseball — immediately thrown on pickup |
| 6 | Drink | Consumed on pickup — restores HP/MP, then destroyed |

## Light Weapons (type 1)

### Stick (id: 100) — `weapon0.dat`
- `weapon_hp`: 200
- `weapon_drop_hurt`: 35
- Sprite: 48×48, 10×10 grid
- Sound: hit=011, drop=011, broken=094
- Mass: 0.3

### Hoe (id: 101) — `weapon2.dat`
- `weapon_hp`: 200
- `weapon_drop_hurt`: 35
- No "normal" (standing) attack entry
- Mass: 0.7

### Knife (id: 120) — `weapon4.dat`
- `weapon_hp`: 200
- `weapon_drop_hurt`: 35

### Baseball (id: 121) — `weapon5.dat`
- Type: **4** (throw weapon — immediately thrown)
- `weapon_hp`: 750
- `weapon_drop_hurt`: 48

### Ice Sword (id: 213) — `weapon7.dat`
- `weapon_hp`: 200
- `weapon_drop_hurt`: 35
- Spawned by Freeze's D^J (DvJ in readme.txt — "Summon Sword")
- Mass: 0.5

### Boomerang (id: 124) — `weapon9.dat`
- `weapon_hp`: 200
- `weapon_drop_hurt`: 35
- `just_throw: true` — thrown immediately on pickup, flies out and returns

## Heavy Weapons (type 2)

### Stone (id: 150) — `weapon1.dat`
- `weapon_hp`: 800
- `weapon_drop_hurt`: 200
- Sprite: 58×58
- Mass: 0.9

### Wooden Box (id: 151) — `weapon3.dat`
- `weapon_hp`: 400
- `weapon_drop_hurt`: 180

### Louis Armor (id: 217) — `weapon10.dat`
- `weapon_hp`: 1200
- `weapon_drop_hurt`: 200
- Chest piece. When held with id:218 (Louis Wrister), allows Louis → LouisEX transformation
- Sprite: `weapon10.bmp`

### Louis Wrister (id: 218) — `weapon11.dat`
- `weapon_hp`: 1200
- `weapon_drop_hurt`: 200
- Wrist piece. When held with id:217 (Louis Armor), allows Louis → LouisEX transformation
- Sprite: `weapon11.bmp`

## Drinks (type 6)

### Milk (id: 122) — `weapon6.dat`
- `weapon_hp`: 450
- `weapon_drop_hurt`: 35
- Restores **150 HP** on consumption
- Sprite: 48×48

### Beer (id: 123) — `weapon8.dat`
- `weapon_hp`: 450
- `weapon_drop_hurt`: 35
- Restores **250 MP** on consumption
- Sprite: 48×48

## Weapon Strength List (Standard)

| Entry | Type | dvx | fall | vrest | bdefend | injury |
|---|---|---|---|---|---|---|
| 1 | normal (standing) | 2 | 40 | 10 | 16 | 40 |
| 2 | jump | 7 | 70 | 10 | 16 | 40 |
| 3 | run | 10 | 70 | 10 | 16 | 50 |
| 4 | dash | 12 | 70 | 20 | 60 | 50 |

### Weapon-Specific Adjustments

**Stick (100)**: Standard values.

**Hoe (101)**: No normal entry. Jump: injury:45, bdefend:60. Run: injury:55, bdefend:60. Dash: injury:55, bdefend:60.

**Knife (120)**: injury 45/45/55/55.

**Baseball (121)**: injury 40/60/85/100.

**Ice Sword (213)**: injury 30/30/40/40.

**Boomerang (124)**: injury 45/45/55/55.

## Light Weapon Frame Structure

| Frames | State | Name | Description |
|---|---|---|---|
| 0–15 | 1000 (in_the_sky) | Falling | Through air. Has bdy for collision. |
| 20–35 | 1001 (on_hand) | Held | wpoint for hand attachment. itr:kind:5 for attack. Each frame defines where the hitbox is. |
| 40–55 | 1002 (throwing) | Throwing | Projectile in air. itr:kind:0 for hit on contact. |
| 60–63 | 1003 (on_ground) | Bouncing | Rolling/bouncing on ground contact. Plays hit sound. |
| 64 | 1004 (idle/resting) | On Ground | Resting on ground, pickable. Has bdy for pickup detection. |
| 70–72 | 1003 (just_on_ground) | Landing | Bounce-to-rest transition. Can still hit targets (itr:kind:0). |

Heavy weapons use the same structure but with 2000-series states (in_the_sky=2000, on_ground=2004).

## Pickup Mechanics

### How Pickup Works

1. Character enters a frame with `itr.kind: 2` (pick weapon) — present in punch frames (60–68) and some standing frames
2. Or holds Attack key with `itr.kind: 7` (rowing pick) while in rowing state (6)
3. Engine checks XY and Z overlap: character itr ↔ weapon/drink bdy
4. If overlapping → item picked up, weapon attached via wpoint

### Pickup Frame Transitions

| Item Type | Transition Frame |
|---|---|
| Light Weapon | Frame 115 (picking_light, state 15) |
| Heavy Weapon | Frame 116 (picking_heavy, state 15) |
| Drink | Frame 55 (weapon_drink, state 17) |

### Drink Consumption Flow

1. Pick up drink → frame 55 (state 17, drinking)
2. Drinking animation plays frames 55–58 with wpoint:kind:1 holding the drink
3. Drink effects applied (HP or MP restore)
4. Drink destroyed (wpoint:kind:3 on frame 58 drops it)
5. Character returns to standing (next: 999 → frame 0)

## WPoint System

When a character holds a weapon, the character's current frame defines a wpoint:

| wpoint kind | Behavior |
|---|---|
| 1 | Weapon follows hand at offset (x, y). `weaponact` sets weapon's frame. `attacking` selects weapon_strength_list entry (0=don't attack). |
| 2 | **Throw**: weapon gains velocity (dvx, dvy, dvz) and flies away independently. Enters state 1002. |
| 3 | **Drop**: weapon is released without velocity. Used for drink consumption (frame 58) and disarm. |

Coordinates are mirrored for facing direction. `cover` provides defense protection when weapon is held in front.

## Weapon Destruction

- `weapon_hp` decreases from being hit by character attacks
- HP reaches 0 → weapon enters destruction animation (next: 1000)
- `weapon_drop_hurt`: self-damage taken when weapon bounces on ground
- Broken sound plays on destruction

## Item Spawning & Sky Drops

From `data.txt`: `id: 100~199 drop weapon`

- Items with IDs 100–199 can fall from the sky:
  - Stage mode: automatic spawns during waves
  - F8 key: drops random weapons from sky
  - Louis armor pieces (217, 218): dropped when Louis is defeated

- Light weapons fall in state 1000 (in_the_sky)
- Heavy weapons fall in state 2000 (in_the_sky)
- Gravity pulls them down at 1.7 px/TU²
- On ground contact: bounce if speed > 8 px/TU (weapons), then rest in state 1004/2004

## Original File Paths

```
data/
  weapon0.dat  → Stick (light, id 100)
  weapon1.dat  → Stone (heavy, id 150)
  weapon2.dat  → Hoe (light, id 101)
  weapon3.dat  → Wooden Box (heavy, id 151)
  weapon4.dat  → Knife (light, id 120)
  weapon5.dat  → Baseball (throw, id 121)
  weapon6.dat  → Milk (drink, id 122)
  weapon7.dat  → Ice Sword (light, id 213)
  weapon8.dat  → Beer (drink, id 123)
  weapon9.dat  → Boomerang (light, id 124)
  weapon10.dat → Louis Armor (heavy, id 217)
  weapon11.dat → Louis Wrister (heavy, id 218)

sprite/sys/
  weapon0.bmp  → Stick sprite (48×48, 10×10)
  weapon1.bmp  → Stone sprite (58×58)
  weapon2.bmp  → Hoe sprite (48×48)
  weapon3.bmp  → Wooden Box sprite
  weapon4.bmp  → Knife sprite (48×48)
  weapon5.bmp  → Baseball sprite
  weapon6.bmp  → Milk sprite (48×48)
  weapon7.bmp  → Ice Sword sprite (48×48)
  weapon8.bmp  → Beer sprite (48×48)
  weapon9.bmp  → Boomerang sprite
  weapon10.bmp → Louis Armor sprite
  weapon11.bmp → Louis Wrister sprite
  broken.bmp   → Broken weapon fragments 1
  broken2.bmp  → Broken weapon fragments 2
```
