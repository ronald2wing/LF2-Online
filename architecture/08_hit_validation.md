# Hit Validation

> Source: `entity.js`, `mechanics.js`, original LF2 v2.0a hit rules; verified against `collision.js`

This document describes when an attacker's itr (interaction region) successfully hits a target's bdy (body region). The engine iterates all overlapping itr/bdy pairs each TU and applies validation rules.

## Validation Pipeline (per frame)

For each itr ↔ bdy pair between attacker and target:

1. XY rectangle overlap check
2. Z-axis proximity check
3. Kind-specific eligibility rules
4. Team restrictions
5. State/immunity checks
6. Distance selection (for vrest=0 attacks)
7. Max successful attacks cap (20 per attacker per frame)

## ITR Kind Eligibility

From `global.js` ITR_KIND:

| Kind | Valid Targets | Team |
|---|---|---|
| 0 (NORMAL) | Characters, weapons on ground, projectiles | Exclusive |
| 1 (CATCH) | Characters in Dance of Pain (state 16) | Exclusive |
| 2 (PICK_WEAPON) | Light weapons on ground (state 1004), drinks | — |
| 3 (SUPER_CATCH) | Any character | Exclusive |
| 4 (FALLING) | Any target | Neutral |
| 5 (WEAPON_SWING) | Any target | Holder's team |
| 7 (PICK_WEAPON_EASY) | Light weapons on ground, requires attack key held | — |
| 8 (HEAL) | Characters only (same team) | Same team |
| 9 (REFLECT_SHIELD) | Projectiles (type 3), destroys and reflects | Exclusive |
| 10 (FLUTE) | Enemy characters | Exclusive |
| 11 (FLUTE_VARIANT) | Enemy characters (transformation) | Exclusive |
| 14 (ICE_COLUMN) | Characters (blocks movement) | — |
| 15 (WHIRLWIND) | Any target (knockback) | Exclusive |
| 16 (WHIRLWIND_VARIANT) | Any target (freeze) | Exclusive |

## Team Rules

### Team-Exclusive Kinds (cannot hit same team)

Kinds 0, 1, 3, 9, 10, 11, 15, 16 are team-exclusive. BUT these exceptions allow same-team hits:

1. **Frozen characters** (state 13) — can be hit by own team
2. **Caught characters** (state 10) — can be hit by own team
3. **Weapons and drinks** (type 1, 2, 4, 6) — characters can attack same-team weapons
4. **Opposite-facing projectiles** — if both attacker and target are specialattacks (type 3) and face opposite directions, hits are allowed

### Kind 5 (Weapon Swing)

Uses the **weapon holder's team** for the team check:
- Holder's team vs target's team determines if hit is allowed
- EXCEPT: frozen characters, weapons/drinks, freeze columns are always hittable

### Kind 4 (Thrown/Falling)

Team-**neutral**: always hits regardless of team.

## Immunity Rules

### Invincibility

If `target.invincible_time > 0`: immune to all itrs **except**:
- Kind 8 (HEAL)
- Kind 14 (ICE_COLUMN / obstacle)

Invincibility frames occur during:
- Getting up from lying (frame transitions from state 14)
- Dodge/roll invulnerability frames
- Rudolf's reappear after vanish

### Falling State Immunity

Characters in **state 12 (Falling)** are immune to attacks with `itr.fall <= 40`, except:
- Kind 10 (FLUTE) — bypasses this immunity
- Kind 11 (FLUTE_VARIANT) — bypasses this immunity

### On-Ground Weapon Immunity

Weapons in **state 1004** (resting on ground) cannot be hit by thrown weapons, EXCEPT:
- Kind 2 (PICK_WEAPON)
- Kind 7 (PICK_WEAPON_EASY)
- Kind 10 (FLUTE)

### Fire Effect Immunities

- Fire effect (effect % 10 == 2) cannot hit:
  - Non-character types
  - Characters already in fire state (18)
  - Characters in burn run state (19)
- Burn effect (effect == 20) cannot hit characters already burning or burn-running
- Burn run state (19) characters cannot re-ignite already-burning targets with fire effect

### Freeze Effect Immunities

- Ice column effect (effect == 30) cannot hit characters already in frozen frames (200-202)
- Characters already in freeze state (13) are immune to additional freeze effects

### Shrafe Effect Immunity

- Effect 4 (shrafe/energy beam) cannot hit characters (type 0)
- Shrafe only damages non-character objects (weapons, projectiles, criminals)

### Heal Character-Only

Kind 8 (HEAL) only affects character-type objects.

## vrest=0 Attack Selection (Single Target)

When `itr.vrest == 0` (and kind is NOT catch/pickup):

- Find the **closest** target within `attackable_distance`
- At the exact attackable distance boundary: **66% chance** to hit (RNG-based, roll 0-2, hit on 0)
- Only **ONE target** is selected per frame
- Distance calculation: `|attacker.x - target.x|`
- For held weapons: distance measured from **holder's position** (not weapon position)
- If target IS the holder: forced to 2000 (effectively skipped)

This prevents multi-hit exploits with zero-rest attacks while allowing close-range combos.

## Catch Mechanics

### Catch Injured (Kind 1)

- Target must be in **Dance of Pain** state (state 16)
- Attacker must press direction key **toward** the target:
  - `click_right` when target is to the right
  - `click_left` when target is to the left
- Closest target within `vulnerable_distance` is selected
- At exact vulnerable distance: 66% chance (RNG-based)

### Super Catch (Kind 3)

- Can catch any character in any state
- Team-exclusive
- Catcher enters state 9; caught enters state 10

## Pickup Rules

### Light Weapon Pickup (State 1004)

Requires ALL of:
1. Attacker has `weapon_type == 0` (no weapon currently held)
2. `click_attack == true` AND `holding_attack == false` (attack key edge-triggered)
3. Target frame state is 1004 (on ground, idle)

### Heavy Weapon Pickup (State 2004)

Requires:
1. `click_attack == true` AND `holding_attack == false`
2. Target frame state is 2004

### Rowing Pickup (Kind 7)

Same as light weapon pickup but attacker is in rowing state (state 6) with attack key held.

## Max Successful Attacks Cap

Maximum **20 successful hits** per attacker per frame. Once `successful_attacks >= 20`, further itr/bdy pairs are skipped.

## Thrown Injury

For kind 4 (thrown/falling) itrs:
- Hit is successful if `attacker.thrown_injury != 0`

## Weapon Strength List (Kind 5)

When a weapon itr (kind 5) hits:
- Damage values come from `weapon_strength_list[holder_wpoint.attacking]`
- The `injury` field on the kind 5 itr is typically a placeholder (e.g., 789)
- The wpoint's `attacking` field on the **holder's current frame** selects the entry:
  - 1 = normal (standing)
  - 2 = jump
  - 3 = run
  - 4 = dash

## Stage Mode Criminal Rescue

In stage mode, certain objects can "rescue" criminals:
- Characters, `henry_arrow1` (id 201), and `rudolf_weapon` (id 202) on non-enemy teams
- Weapon holders with character-type holders on non-enemy teams
- Criminals with `bdy.kind >= 1000` block rescue by non-eligible attackers

## Forcefield Reflection (Kind 9)

When kind 9 (REFLECT_SHIELD) hits a projectile:
- Destroys the projectile
- Spawns a reflected copy with velocity reversed
- Reflected projectile's team changes to the forcefield owner's team
- Does NOT affect characters

## Flute Effect (Kind 10)

When Henry's flute hits:
- Applies floating effect to all enemies in range
- Target floats upward with `y_velocity = -7.5`
- Oscillates between `y = -140` and `y = -180`
