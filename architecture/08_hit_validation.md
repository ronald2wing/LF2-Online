# Hit Validation

> Source: `living-object.js`, `mechanics.js`, original LF2 v2.0a hit rules; verified against `collision.js`

This document describes when an attacker's itr (interaction region) successfully hits a target's bdy (body region). The engine iterates all overlapping itr/bdy pairs each TU and applies validation rules.

## Validation Pipeline (per frame)

For each itr ↔ bdy pair between attacker and target:

1. XY rectangle overlap check
2. Z-axis proximity check
3. Kind-specific eligibility rules
4. Team restrictions
5. State/effect immunity checks
6. Rest-timer gates (`arest` on the attacker, `vrest` on the victim)

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
| 6 (COUNTER) | Counter hitbox on broken-defend (state 8) / dance-of-pain (state 16) frames; a punch landing on it forces the attacker into the super punch (frame 70) | Exclusive |
| 7 (PICK_WEAPON_EASY) | Light weapons on ground, requires attack key held | — |
| 8 (HEAL) | Characters only (same team) | Same team |
| 9 (REFLECT_SHIELD) | Projectiles (type 3), reflects in place | Exclusive |
| 10 (FLUTE) | Enemy characters | Exclusive |
| 11 (FLUTE_VARIANT) | Enemy characters (transformation) | Exclusive |
| 14 (ICE_COLUMN) | Characters (blocks movement) | — |
| 15 (WHIRLWIND) | Any target (knockback) | Exclusive |
| 16 (WHIRLWIND_VARIANT) | Any target (freeze) | Exclusive |

## Team Rules

### Team-Exclusive Kinds (cannot hit same team)

Kinds 0, 1, 3, 6, 9, 10, 11, 15, 16 are team-exclusive. BUT these exceptions allow same-team hits:

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

Invincibility is the **absence of a bdy** in the current frame, not a timer:
an object with no overlapping body volume cannot be hit. `vol_body()` returns
an empty volume when the frame has no bdy, and while `effect.super` is set (the
flute) the body is likewise suppressed, so a flute-lifted character is briefly
unhittable (`mechanics.js:51`).

Frames that carry no bdy include lying/getting-up frames (state 14) and
Rudolf's vanish/reappear frames.

HEAL (kind 8) and ICE_COLUMN (kind 14) do not go through bdy overlap: heal
applies directly to a character (`projectile.js:694`), and an ice column's
obstacle box is matched against a moving character's body to block movement
(`mechanics.js:437`).

### Falling State Immunity

State 12 (Falling) carries no blanket `itr.fall <= 40` immunity. The only
state-12 special case is FLUTE (kinds 10/11): a falling character hit by the
flute takes **double** injury (`inj = ITR.injury * 2`, `character.js:306`) and
the hit is forced to succeed.

### On-Ground Weapon Acceptance

A light weapon resting on the ground (state 1004) **accepts** a hit from a thrown
light or heavy weapon rather than being destroyed: the hit bounces it back into
play (`weapon.js:268`). The grounded weapon's horizontal/vertical velocity is
set from the attacker's throw direction via `weapon.bounceup.speed` (no upward
`vy`), so it pops off the ground instead of lying dead.

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

## Attack Rest and Victim Rest

Two per-object cooldowns gate how often an itr can land (`living-object.js`).
Both are decremented once per TU (`living-object.js:356`).

### `arest` — attack rest (on the attacker)

After a successful hit, the **attacker's** `arest` is set to the itr's `arest`
field (default 7 TUs, `global.js:112`). While `arest > 0` the attacker's itrs
are skipped (`character.js:673`), so the same attack cannot land again until the
rest elapses. An itr with a nonzero `arest` also stops scanning further targets
after its first hit (`character.js:682`) — this rest window, not any distance
rule, is what limits a normal attack to a single victim per frame.

### `vrest` — victim rest (on the victim)

When a hit lands, the **victim's** `vrest` is set to the itr's `vrest` field
and keyed to the attacking uid (`character.js:415`). While nonzero, the same
attacker cannot hit the same victim again — `hit()` rejects the pair up front
(`character.js:170`). `vrest` is a re-hit window, not a trigger for target
selection.

Neither field performs distance-based target selection, and hit resolution uses
no RNG: `scene.query` returns every overlapping body in uid order
(`scene.js:30`) and each eligible pair is tested in turn.

## Catch Mechanics

### Catch Injured (Kind 1)

- Target must be a character in **Dance of Pain** (state 16) on the opposing
  team (`character.js:492`)
- Catcher's `arest` must be zero (not already mid-interaction)
- Front vs back is decided by the target's X position relative to the catcher
  (`caught_a`, `character.js:798`) — there is no direction-key requirement
- The catcher enters the `catchingact` frame, the target the `caughtact` frame

### Super Catch (Kind 3)

- Can catch any character in any state (no Dance-of-Pain requirement)
- Team-exclusive
- Catcher enters state 9; caught enters state 10

## Pickup Rules

Pickup runs in `pre_interaction` (`character.js:470`) through two itr kinds:

### Pick Weapon (Kind 2)

- No attack-key requirement — reaching the itr is enough
- Picks up light weapons, heavy weapons, and drinks in range

### Pick Weapon Easy (Kind 7)

- Requires the **attack key to be held** (`self.con.state.att`,
  `character.js:520`) — a level check, not an edge trigger
- Cannot pick up heavy weapons (`character.js:528`)

### Shared conditions

- Target must be a light weapon, heavy weapon, or drink in range
- A character already holding something only picks up if the
  `pickup_when_holding` behavior allows it (`character.js:525`)

## Weapon Strength List (Kind 5)

When a weapon itr (kind 5) hits:
- Damage values come from `weapon_strength_list[holder_wpoint.attacking]`
- The `injury` field on the kind 5 itr is typically a placeholder (e.g., 789)
- The wpoint's `attacking` field on the **holder's current frame** selects the entry:
  - 1 = normal (standing)
  - 2 = jump
  - 3 = run
  - 4 = dash

## Stage Mode Hostage Rescue

Stage-mode criminals (id 300, `data.js:97`) are hostage NPCs: when one is
defeated (HP ≤ 0) it does not die — it reveals its true form and joins the
player (`living-object.js:335`). The engine flips it to `match.player_team`,
restores a third of its full HP, and plays the disguise-off animation, which
ends in a `80xx` state and triggers `create_transform_character` into the
revealed ally (`character-states.js:65`).

A `bdy.kind >= 1000` region is not rescue-specific: it is the generic
"skip damage and jump to frame `kind - 1000`" gate (`character.js:175`), used by
hostage frames to reach their reveal state. `henry_arrow1` (201) and
`rudolf_weapon` (202) are ordinary special-attack projectiles (`data.js:63-64`)
and play no part in the mechanism.

## Forcefield Reflection (Kind 9)

When kind 9 (REFLECT_SHIELD) hits a projectile, the projectile is reflected in
place — no copy is spawned (`projectile.js:537`):
- Reverses the projectile's horizontal velocity (`ps.vx *= -1`)
- Reassigns its team to the forcefield owner's team (`self.team = att.team`)
- Does NOT affect characters

## Flute Effect (Kind 10)

When Henry's flute hits:
- Applies floating effect to all enemies in range
- Target floats upward with `y_velocity = -7.5`
- Oscillates between `y = -140` and `y = -180`
