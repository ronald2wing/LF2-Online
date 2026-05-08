// Shared fixtures for the weapon team-exception tests.
//
// Both the kind-5 swing (weapon-swing-team.test.js) and the kind-0 throw
// (weapon-throw-team.test.js) drive one interaction from a team-1 weapon
// against a single target, then count the hits. The match stub and the target
// body are identical between them; only the weapon class, data and call differ.

// Minimal match satisfying the LivingObject + Weapon constructors without
// touching the DOM or canvas rendering. `weaponId` keys the spec entry that
// suppresses the shadow sprite.
export function makeMatch(scene, weaponId) {
  return {
    stage: { attach() {}, remove() {} },
    background: {
      shadow: { img: {} },
      zboundary: [0, 100],
      width: 794,
      leaving() { return false },
    },
    spec: { [weaponId]: { no_shadow: true } },
    scene,
    sound: { play() {} },
    destroy_object() {},
  }
}

// A target body that fills the whole arena, so it always overlaps the weapon's
// itr volume. `hits` records how many times the interaction reached it.
export function addTarget(scene, { team, type, state }) {
  const target = {
    team,
    type,
    state: () => state,
    hits: 0,
    vol_body() {
      return [{ x: -100000, y: -100000, w: 200000, h: 200000, z: 0, zwidth: 100000, vx: 0, vy: 0 }]
    },
    hit() {
      target.hits++
      return true
    },
  }
  scene.add(target)
  return target
}
