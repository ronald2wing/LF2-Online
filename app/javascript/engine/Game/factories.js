/*
 * factories.js — Object constructors keyed by data type.
 *
 * When the engine creates an object it looks up the factory via the type
 * string declared in data.js (e.g. type: "specialattack"). Each factory
 * receives (config, data, objectId) and must return a living object.
 */

import Character from "engine/Game/character"
import Weapon from "engine/Game/weapon"
import Drink     from "engine/Game/weapon-drink"
import Projectile from "engine/Game/projectile"
import Effect from "engine/Game/effect"

export default {
  character:      Character,
  lightweapon:    Weapon("lightweapon"),
  heavyweapon:    Weapon("heavyweapon"),
  drink:          Drink,
  specialattack:  Projectile,
  effect:         Effect,
  broken:         Effect,
}

