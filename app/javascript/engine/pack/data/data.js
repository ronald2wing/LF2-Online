/* LF2 Online content pack — LF2 roster.
 *
 * LF2 characters + weapons + specials brought in from the Project-F/F.LF
 * open-source engine (GPL-3).
 *
 * The vendored engine under app/javascript/engine/ is GPL-3; see its own
 * license and attribution headers for details.
 */
export default {
  object: [
    // ── LF2 characters (ids match original LF2 for behavior hooks) ──
    { id: 0,  name: 'Template', type: 'character', file: 'data/template.js', pic: 'sprite/template/template_f.png' },
    { id: 1,  name: 'Deep',    type: 'character', file: 'data/deep.js',    pic: 'sprite/deep_f.png' },
    { id: 2,  name: 'John',    type: 'character', file: 'data/john.js',    pic: 'sprite/john_f.png' },
    { id: 4,  name: 'Henry',   type: 'character', file: 'data/henry.js',   pic: 'sprite/henry_f.png' },
    { id: 5,  name: 'Rudolf',  type: 'character', file: 'data/rudolf.js',  pic: 'sprite/rudolf_f.png' },
    { id: 6,  name: 'Louis',   type: 'character', file: 'data/louis.js',   pic: 'sprite/louis_f.png' },
    { id: 7,  name: 'Firen',   type: 'character', file: 'data/firen.js',   pic: 'sprite/firen_f.png' },
    { id: 8,  name: 'Freeze',  type: 'character', file: 'data/freeze.js',  pic: 'sprite/freeze_f.png' },
    { id: 9,  name: 'Dennis',  type: 'character', file: 'data/dennis.js',  pic: 'sprite/dennis_f.png' },
    { id: 10, name: 'Woody',   type: 'character', file: 'data/woody.js',   pic: 'sprite/woody_f.png' },
    { id: 11, name: 'Davis',   type: 'character', file: 'data/davis.js',   pic: 'sprite/davis_f.png' },
    { id: 30, name: 'Bandit',  type: 'character', file: 'data/bandit.js',  pic: 'sprite/bandit_f.png' },

    // ── LF2 v2.0 characters ──
    { id: 31, name: 'Hunter',   type: 'character', file: 'data/hunter.js',   pic: 'sprite/hunter_f.png' },
    { id: 32, name: 'Mark',     type: 'character', file: 'data/mark.js',     pic: 'sprite/mark_f.png' },
    { id: 33, name: 'Jack',     type: 'character', file: 'data/jack.js',     pic: 'sprite/jack_f.png' },
    { id: 34, name: 'Sorcerer', type: 'character', file: 'data/sorcerer.js', pic: 'sprite/sorcerer_f.png' },
    { id: 35, name: 'Monk',     type: 'character', file: 'data/monk.js',     pic: 'sprite/monk_f.png' },
    { id: 36, name: 'Jan',      type: 'character', file: 'data/jan.js',      pic: 'sprite/jan_f.png' },
    { id: 37, name: 'Knight',   type: 'character', file: 'data/knight.js',   pic: 'sprite/knight_f.png' },
    { id: 38, name: 'Bat',      type: 'character', file: 'data/bat.js',      pic: 'sprite/bat_f.png' },
    { id: 39, name: 'Justin',   type: 'character', file: 'data/justin.js',   pic: 'sprite/justin_f.png' },
    { id: 50, name: 'LouisEX',  type: 'character', file: 'data/louisEX.js',  pic: 'sprite/louisEX_f.png' },
    { id: 51, name: 'Firzen',   type: 'character', file: 'data/firzen.js',   pic: 'sprite/firzen_f.png' },
    { id: 52, name: 'Julian',   type: 'character', file: 'data/julian.js',   pic: 'sprite/julian_f.png' },

    // ── LF2 light weapons (id 100-149) ──
    { id: 100, type: 'lightweapon', file: 'data/weapon0.js' },  // stick
    { id: 101, type: 'lightweapon', file: 'data/weapon2.js' },  // hoe
    { id: 120, type: 'lightweapon', file: 'data/weapon4.js' },  // knife
    { id: 121, type: 'lightweapon', file: 'data/weapon5.js' },  // baseball
    { id: 213, type: 'lightweapon', file: 'data/weapon7.js' },  // ice_sword

    // ── Drinks (consumed on pickup, restore HP/MP) ──
    { id: 122, type: 'drink', file: 'data/weapon6.js' },  // milk
    { id: 123, type: 'drink', file: 'data/weapon8.js' },  // beer

    // ── LF2 heavy weapons (id 150-199) ──
    { id: 150, type: 'heavyweapon', file: 'data/weapon1.js' },  // stone
    { id: 151, type: 'heavyweapon', file: 'data/weapon3.js' },  // wooden_box

    // ── LF2 misc items ──
    { id: 124, type: 'lightweapon', file: 'data/weapon9.js' },  // boomerang

    // ── Louis armor pieces (heavy weapons) ──
    { id: 217, type: 'heavyweapon', file: 'data/weapon10.js' }, // louis_armour
    { id: 218, type: 'heavyweapon', file: 'data/weapon11.js' }, // louis_armour_waist

    // ── LF2 special attacks (id 200-299) ──
    { id: 200, type: 'specialattack', file: 'data/john_ball.js' },
    { id: 201, type: 'specialattack', file: 'data/henry_arrow1.js' },
    { id: 202, type: 'specialattack', file: 'data/rudolf_weapon.js' },
    { id: 203, type: 'specialattack', file: 'data/deep_ball.js' },
    { id: 204, type: 'specialattack', file: 'data/henry_louis_rudolf_wind.js' },
    { id: 205, type: 'specialattack', file: 'data/dennis_ball.js' },
    { id: 206, type: 'specialattack', file: 'data/woody_ball.js' },
    { id: 207, type: 'specialattack', file: 'data/davis_ball.js' },
    { id: 208, type: 'specialattack', file: 'data/henry_arrow2.js' },
    { id: 209, type: 'specialattack', file: 'data/freeze_ball.js' },
    { id: 210, type: 'specialattack', file: 'data/firen_ball.js' },
    { id: 211, type: 'specialattack', file: 'data/firen_flame.js' },
    { id: 212, type: 'specialattack', file: 'data/freeze_column.js' },
    { id: 214, type: 'specialattack', file: 'data/john_biscuit.js' },
    { id: 215, type: 'specialattack', file: 'data/dennis_chase.js' },

    // ── LF2 v2.0 special attacks ──
    { id: 216, type: 'specialattack', file: 'data/jack_ball.js' },
    { id: 219, type: 'specialattack', file: 'data/jan_chaseh.js' },
    { id: 220, type: 'specialattack', file: 'data/jan_chase.js' },
    { id: 221, type: 'specialattack', file: 'data/firzen_chasef.js' },
    { id: 222, type: 'specialattack', file: 'data/firzen_chasei.js' },
    { id: 223, type: 'specialattack', file: 'data/firzen_ball.js' },
    { id: 224, type: 'specialattack', file: 'data/bat_ball.js' },
    { id: 225, type: 'specialattack', file: 'data/bat_chase.js' },
    { id: 226, type: 'specialattack', file: 'data/justin_ball.js' },
    { id: 228, type: 'specialattack', file: 'data/julian_ball.js' },
    { id: 229, type: 'specialattack', file: 'data/julian_ball2.js' },

    // ── Effects and broken items (ported from original LF2 etc.dat / broken_weapon.dat) ──
    { id: 900, type: 'effect', file: 'data/effect0.js' },
    { id: 901, type: 'effect', file: 'data/effect1.js' },
    { id: 320, type: 'broken', file: 'data/broken.js' },

    // ── LF2 misc objects ──
    { id: 300, type: 'character', file: 'data/criminal.js', pic: 'sprite/bandit_f.png' },  // hostage NPC
    { id: 998, type: 'specialattack', file: 'data/etc.js' },  // etc effects
  ],

  AI: [
    { id: 1, file: 'AI/Computer.js', name: 'Computer' },
  ],

  background: [
    { id: 4,  name: 'HK Coliseum',   file: 'bg/hkc/bg.js' },
    { id: 2,  name: 'Lion Forest',   file: 'bg/lf/bg.js' },
    { id: 3,  name: 'Stanley Prison', file: 'bg/sp/bg.js' },
    { id: 5,  name: 'The Great Wall', file: 'bg/gw/bg.js' },
    { id: 6,  name: "Queen's Island", file: 'bg/qi/bg.js' },
    { id: 7,  name: 'Forbidden Tower', file: 'bg/ft/bg.js' },
    { id: 1,  name: 'CUHK',          file: 'bg/cuhk/bg.js' },
    { id: 0,  name: 'Tai Hom Village', file: 'bg/thv/bg.js' },
    { id: 10, name: 'Template1',      file: 'bg/template/bg.js' },
    { id: 8,  name: 'Brokeback Cliff', file: 'bg/bc/bg.js' },
  ],

  sound: [
    { id: 1, file: 'sound/soundpack.js' },
  ],

  UI: { file: 'UI/UI.js' },

  properties: { file: 'data/properties.js' },

  stage_data: { file: 'data/stages.js' },

  file_editing: {},

  config: ['id: 100~199 drop weapon'],
}
