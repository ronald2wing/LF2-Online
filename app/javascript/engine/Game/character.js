/** a LF2 Online character
 */

import LivingObject from "engine/Game/entity";
import Global from "engine/Game/global";
import comboDecoder from "engine/core/combo-decoder";
import coreUtil from "engine/core/util";
import util from "engine/Game/util";
import characterBehaviors from "engine/Game/character-behaviors";
import { states, states_switch_dir } from "engine/Game/character-states";

const Gameplay = Global.gameplay
const S = Gameplay.STATE
const IK = Gameplay.ITR_KIND
const FI = Gameplay.FRAME_INJURY
const EFF = Gameplay.EFFECT

class Character extends LivingObject {
  type = "character";
  states = states;
  states_switch_dir = states_switch_dir;

  constructor(config, data, objectId) {
    super(config, data, objectId);
    if (!config) return;

    const self = this;
    if (typeof characterBehaviors[self.id] === "function") {
      self.behavior = characterBehaviors[self.id];
    } else {
      self.behavior = characterBehaviors.default;
    }
    self.mech.floor_xbound = true;
    self.con = config.controller;
    self.combo_buffer = { combo: null, timeout: 0 };
    if (self.con) {
      function combo_event(kobj) {
        const K = kobj.name;
        switch (K) {
          case "left":
          case "right":
            if (self.allow_switch_dir) self.switch_dir(K);
            break;
        }
        if (
          self.combo_buffer.timeout === Gameplay.combo.timeout &&
          priority[K] < priority[self.combo_buffer.combo]
        ) {
          // combo clash — higher priority wins
        } else {
          self.combo_buffer.combo = K;
          self.combo_buffer.timeout = Gameplay.combo.timeout;
        }
      }
      const dec_con = { clear_on_combo: true, callback: combo_event };
      let combo_list = [
        { name: "left", seq: ["left"], clear_on_combo: false },
        { name: "right", seq: ["right"], clear_on_combo: false },
        { name: "up", seq: ["up"], clear_on_combo: false },
        { name: "down", seq: ["down"], clear_on_combo: false },
        { name: "def", seq: ["def"], clear_on_combo: false },
        { name: "jump", seq: ["jump"], clear_on_combo: false },
        { name: "att", seq: ["att"], clear_on_combo: false },
        { name: "left-left", seq: ["left", "left"], maxtime: 9 },
        { name: "right-right", seq: ["right", "right"], maxtime: 9 },
        {
          name: "jump-att",
          seq: ["jump", "att"],
          maxtime: 0,
          clear_on_combo: false,
        },
      ];
      combo_list = combo_list.concat(Global.combo_list);
      self.combodec = new comboDecoder(self.con, dec_con, combo_list);
      let priority = {};
      for (let i = 0; i < combo_list.length; i++) {
        priority[combo_list[i].name] = i;
      }
    }
    self.hold = { obj: null };
    self.health.bdefend = 0;
    self.health.fall = 0;
    self.health.hp =
      self.health.hp_full =
      self.health.hp_bound =
        self.getProperty("hp") || Gameplay.default.health.hp_full;
    self.health.hp_lost = 0;
    self.defense_rate = 1.0;
    self.health.mp_full = Gameplay.default.health.mp_full;
    self.health.mp = Gameplay.default.health.mp_start;
    self.health.mp_usage = 0;
    self.stat = { attack: 0, picking: 0, kill: 0 };
  }

  destroy() {
    super.destroy();
  }

  // to emit a combo event
  combo_update() {
    const self = this;
    let K = self.combo_buffer.combo;
    if (!K) {
      K = null;
    }
    if (self.combo_buffer.combo === "jump-att") {
      K = "jump";
    }

    const tar1 = self.states[self.frame.D.state];
    let res1
    if (tar1) {
      res1 = tar1.call(self, "combo", K);
    }
    const tar2 = self.states.generic;
    let res2
    if (!res1) {
      if (tar2) {
        res2 = tar2.call(self, "combo", K);
      }
    }
    if (tar1) {
      tar1.call(self, "post_combo");
    }
    if (tar2) {
      try {
        tar2.call(self, "post_combo");
      } catch(e) {
        console.error("[combo] generic post_combo crashed:", e.message, e.stack)
      }
    }
    if (self.combo_buffer.combo === "jump-att") {
      if (res1 || res2) {
        self.combo_buffer.combo = "att"; // degrade
      }
    } else {
      if (
        res1 ||
        res2 || // do not store if returned true
        K === "left" ||
        K === "right" ||
        K === "up" ||
        K === "down"
      ) {
        // dir combos are not persistent
        self.combo_buffer.combo = null;
      }
    }
  }

  /**
  @protocol caller hits callee
  @param ITR the itr object in data
  @param att reference of attacker
  @param attps position of attacker
  @param rect the hit rectangle where visual effects should appear
 */
  hit(ITR, att, attps, rect) {
    const self = this;
    if (!self.itr_vrest_test(att.uid)) {
      return false;
    }

    // BDY kind >= 1000: skip damage, go to frame (kind - 1000) — used for hostages/weapons
    const bdy = self.frame.D.bdy;
    if (bdy) {
      const k = bdy instanceof Array ? bdy[0].kind : bdy.kind;
      if (k >= 1000) {
        self.trans.frame(k - 1000, 20);
        return true;
      }
    }

    let accepthit = false;
    let defended = false;
    let ef_dvx = 0;
    let ef_dvy = 0;
    let inj = 0;
    if (self.state() === S.BEING_CAUGHT) // being caught
    {
      if (self.catching.caught_cpointhurtable()) {
        accepthit = true;
        fall();
      }
      if (
        self.catching.caught_cpointhurtable() === 0 &&
        self.catching !== att
      ) {
        // I am unhurtable as defined by catcher,
        // and I am hit by attacker other than catcher
      } else {
        accepthit = true;
        inj += Math.abs(ITR.injury);
        if (ITR.injury > 0) {
          self.effect_create(0, Gameplay.effect.duration);
          let tar;
          if (ITR.vaction) {
            tar = ITR.vaction;
          } else {
            tar =
              attps.x > self.ps.x === (self.ps.dir === "right")
                ? self.frame.D.cpoint.fronthurtact
                : self.frame.D.cpoint.backhurtact;
          }
          self.trans.frame(tar, 20);
        }
      }
    } else if (self.state() === S.LYING) {
      // lying
    } else if (self.state() === S.FIRERUN && att.state() === S.PROJECTILE_FLYING) {
      return false; // firerun
    } else if (
      ITR.kind === undefined || // default
      ITR.kind === IK.NORMAL || // normal
      ITR.kind === IK.FALLING || // falling
      ITR.kind === IK.REFLECT_SHIELD
    ) // reflective shield
    {
      accepthit = true;
      const compen = self.ps.y === 0 ? 1 : 0; // magic compensation
      const attdir = att.ps.vx === 0 ? att.dirh() : att.ps.vx > 0 ? 1 : -1;
      ef_dvx = ITR.dvx ? attdir * (ITR.dvx - compen) : 0;
      ef_dvy = ITR.dvy ? ITR.dvy : 0;
      const effectnum =
        ITR.effect !== undefined ? ITR.effect : Gameplay.default.effect.num;

      if (self.state() === S.FROZEN && effectnum === EFF.WEAK_ICE) {
        // frozen characters are immune to effect 30 'weak ice'
        return false;
      }

      if (
        (self.state() === S.BURNING || self.state() === S.FIRERUN) &&
        (effectnum === EFF.FIRE || effectnum === EFF.WEAK_FIRE)
      ) {
        // burning and firerun characters are immune to effect 2 (fire) and 20 (burn DoT)
        return false;
      }

      if (
        self.state() === S.DEFEND && // defend
        attps.x > self.ps.x === (self.ps.dir === "right")
      ) // attacked in front
      {
        if (ITR.injury) {
          inj += Gameplay.defend.injury.factor * ITR.injury;
        }
        if (ITR.bdefend) {
          self.health.bdefend += ITR.bdefend;
        }
        if (self.health.bdefend >= Gameplay.defend.break_limit) {
          // broken defence
          self.trans.frame(112, 20);
        } else {
          // an effective defence
          self.trans.frame(111, 20);
        }
        if (ef_dvx) {
          ef_dvx +=
            (ef_dvx > 0 ? -1 : 1) *
            util.lookupTableAbs(Gameplay.defend.absorb, ef_dvx);
        }
        ef_dvy = 0;
        if (self.health.hp - inj <= 0) {
          falldown();
        } else {
          defended = true;
        }
      } else {
        if (self.hold.obj && self.hold.obj.type === "heavyweapon") {
          self.drop_weapon(0, 0);
        }
        if (ITR.injury) {
          inj += ITR.injury;
        } // injury
        if (ITR.bdefend) {
          self.health.bdefend += ITR.bdefend;
        }
        fall();
      }

      // effect
      let vanish = Gameplay.effect.duration - 1;
      switch (self.trans.next()) {
        case FI.DEFEND_EFFECTIVE:
          vanish = 3;
          break;
        case FI.DEFEND_BROKEN:
          vanish = 4;
          break;
      }
      self.effect_create(effectnum, vanish, ef_dvx, ef_dvy);
      posteffect(effectnum);
    } else if (ITR.kind === IK.FLUTE || ITR.kind === IK.FLUTE_VARIANT) {
      self.flute_force();
      if (self.state() === 12) {
        inj = ITR.injury * 2;
        accepthit = true;
      }
    } else if (ITR.kind === IK.WHIRLWIND) {
      self.whirlwind_force(rect);
    } else if (ITR.kind === IK.WHIRLWIND_VARIANT) {
      self.trans.frame(200, 38);
      inj = ITR.injury;
      accepthit = true;
    }
    function fall() {
      if (ITR.fall !== undefined) {
        self.health.fall += ITR.fall;
      } else {
        self.health.fall += Gameplay.default.fall.value;
      }
      const fall = self.health.fall;
      if (self.state() == S.FROZEN) {
        falldown();
      } else if (self.ps.y < 0 || self.ps.vy < 0) {
        falldown();
      } else if (self.health.hp - inj <= 0) {
        falldown();
      } else if (fall > 0 && fall <= 20) {
        self.trans.frame(FI.FALL_LIGHT, 20);
      } else if (fall > 20 && fall <= 30) {
        self.trans.frame(FI.FALL_MID, 20);
      } else if (fall > 30 && fall <= 40) {
        self.trans.frame(FI.FALL_HEAVY, 20);
      } else if (fall > 40 && fall <= 60) {
        self.trans.frame(FI.FALL_CRITICAL, 20);
      } else if (Gameplay.fall.KO < fall) {
        falldown();
      }
    }
    function falldown() {
      if (ITR.dvy === undefined) {
        ef_dvy = Gameplay.default.fall.dvy;
      }
      self.health.fall = 0;
      self.ps.vy = 0;
      const front = attps.x > self.ps.x === (self.ps.dir === "right"); // attacked in front
      if (front && ITR.dvx < 0 && ITR.bdefend >= 60) {
        self.trans.frame(FI.FALL_BACK, 21);
      } else if (front) {
        self.trans.frame(FI.FALL_FRONT, 21);
      } else if (!front) {
        self.trans.frame(FI.FALL_BACK, 21);
      }
    }
    function posteffect(effectnum) {
      if (defended) {
        switch (effectnum) {
          case EFF.NORMAL:
          case EFF.BLOOD:
            self.match.sound.play("1/002");
            break;
        }
        return;
      }
      switch (effectnum) {
        case EFF.NORMAL:
        case EFF.BLOOD:
          switch (self.trans.next()) {
            case FI.FALL_FRONT:
            case FI.FALL_BACK:
              self.drop_weapon(ef_dvx, ef_dvy);
              break;
          }
          self.visualeffect_create(
            effectnum,
            rect,
            attps.x < self.ps.x,
            self.health.fall > 0 ? 0 : 1,
            true,
          );
          break;
        case EFF.FIRE:
        case EFF.WEAK_FIRE2:
        case EFF.WEAK_FIRE3:
        case EFF.WEAK_FIRE4:
          self.drop_weapon(ef_dvx, ef_dvy);
        case EFF.WEAK_FIRE:
          self.trans.frame(FI.BURN_TRANSITION, 36);
          self.match.sound.play("1/070");
          break;
        case EFF.ICE:
        case EFF.WEAK_ICE:
          self.drop_weapon(ef_dvx, ef_dvy);
          if (self.state() !== S.FROZEN) {
            self.trans.frame(FI.ICE_SOLID, FI.ICE_MELT);
          } else {
            self.trans.frame(FI.FROZEN_FALL, 21);
          }
          if (self.state() === S.FROZEN) {
            self.match.sound.play("1/066");
          } else {
            self.match.sound.play("1/065");
          }
          break;
        case EFF.EXPLOSION:
          self.drop_weapon(ef_dvx, ef_dvy);
          break;
      }
    }

    if (accepthit) {
      self.itr.attacker = att;
      self.itr_vrest_update(att.uid, ITR);
    }
    self.injury(inj);
    if (accepthit) {
      return inj;
    } else {
      return false;
    }
  }
  injury(inj) {
    const self = this;
    // Battle Mode defense rate: scale down incoming damage (rate 2.0 = half).
    // Throws keep normal (unscaled) damage per the official Battle Mode.
    const dmg = (self.defense_rate > 1 && !self.throw_damage) ? Math.ceil(inj / self.defense_rate) : inj;
    self.throw_damage = false;
    self.health.hp -= dmg;
    self.health.hp_lost += dmg;
    self.health.hp_bound -= Math.ceil((dmg * 1) / 3);
    if (self.is_npc && self.itr.attacker) {
      self.itr.attacker.offset_attack(dmg);
    }
  }
  heal(amount) {
    this.effect.heal = amount;
    return true;
  }
  attacked(inj) {
    if (inj === true) {
      return true;
    } else if (inj > 0) {
      if (this.is_npc && this.parent) {
        this.parent.stat.attack += inj;
      } else {
        this.stat.attack += inj;
      }
      return true;
    }
  }
  offset_attack(inj) {
    this.stat.attack -= inj;
  }
  killed() {
    if (this.is_npc) {
      this.parent.stat.kill++;
    } else {
      this.stat.kill++;
    }
  }
  die() {
    if (!this.is_npc) {
      this.itr.attacker.killed();
    }
  }

  // pre interaction is based on `itr` of next frame
  pre_interaction() {
    const self = this;
    const nextFrame = self.trans.nextFrameData();
    if (!nextFrame) return;
    const ITR_LIST = coreUtil.arrayWrap(nextFrame.itr);

    for (const i in ITR_LIST) {
      const ITR = ITR_LIST[i]; // the itr tag in data
      // first check for what I have got into intersect with
      const vol = self.mech.volume(ITR);
      vol.zwidth = 0;
      const hit = self.scene.query(vol, self, { tag: "body" });

      if (ITR.kind === IK.PICK_WEAPON) {
      }

      switch (ITR.kind) {
        case IK.CATCH: // catch
        case IK.SUPER_CATCH: // super catch
          for (let t in hit) {
            if (hit[t].team !== self.team) // only catch other teams
            {
              if (hit[t].type === "character") // only catch characters
              {
                if (
                  (ITR.kind === IK.CATCH && hit[t].state() === S.DANCE_OF_PAIN) || // you are in dance of pain
                  ITR.kind === IK.SUPER_CATCH
                ) // super catch
                {
                  if (!self.itr.arest) {
                    const dir = hit[t].caught_a(ITR, self, {
                      x: self.ps.x,
                      y: self.ps.y,
                      z: self.ps.z,
                    });
                    if (dir) {
                      self.itr_arest_update(ITR);
                      if (dir === "front") {
                        self.trans.frame(ITR.catchingact[0], 10);
                      } else {
                        self.trans.frame(ITR.catchingact[1], 10);
                      }
                      self.catching = hit[t];
                      break;
                    }
                  }
                }
              }
            }
          }
          break;

        case IK.PICK_WEAPON_EASY: // pick weapon easy
          if (!self.con.state.att) {
            break; // only if att key is down
          }
        case IK.PICK_WEAPON: // pick weapon
          for (let t in hit) {
            if (self.hold.obj && !self.behavior("pickup_when_holding", hit[t]))
              continue;
            if (
              !(ITR.kind === IK.PICK_WEAPON_EASY && hit[t].type === "heavyweapon")
            ) // kind 7 cannot pick up heavy weapon
            {
              if (hit[t].type === "drink") {
                if (hit[t].pick(self)) {
                  self.stat.picking++;
                  self.itr_arest_update(ITR);
                  if (ITR.kind === IK.PICK_WEAPON) {
                    self.trans.frame(FI.PICK_LIGHT_WEAPON, 10);
                  }
                  self.hold.obj = hit[t];
                }
                break;
              }
              if (
                hit[t].type === "lightweapon" ||
                hit[t].type === "heavyweapon"
              ) {
                if (hit[t].pick(self)) {
                  self.stat.picking++;
                  self.itr_arest_update(ITR);
                  if (ITR.kind === IK.PICK_WEAPON) {
                    if (hit[t].type === "lightweapon") {
                      self.trans.frame(FI.PICK_LIGHT_WEAPON, 10);
                    } else if (hit[t].type === "heavyweapon") {
                      self.trans.frame(FI.PICK_HEAVY_WEAPON, 10);
                    }
                  }
                  self.hold.obj = hit[t];
                  break;
                }
              }
            }
          }
      }
      break;
    }
  }

  // post interaction is based on `itr` of current frame
  post_interaction() {
    const self = this;
    const ITR_LIST = coreUtil.arrayWrap(self.frame.D.itr);

    // TODO
    /* 某葉: 基本上會以先填入的itr為優先， 但在範圍重複、同effect的情況下的2組itr，
  攻擊時，會隨機指定其中一個itr的效果。
  （在範圍有部份重複或是完全重複的部份才有隨機效果。） */

    for (const i in ITR_LIST) {
      const ITR = ITR_LIST[i]; // the itr tag in data
      // first check for what I have got into intersect with
      const vol = self.mech.volume(ITR);
      vol.zwidth = 0;
      const hit = self.scene.query(vol, self, { tag: "body" });

      switch (ITR.kind) {
        case IK.NORMAL: // normal attack
        case IK.FALLING: // falling
          for (const t in hit) {
            let canhit = true;
            switch (ITR.effect) {
              case EFF.NORMAL:
              case EFF.BLOOD:
                if (hit[t].type === "character" && hit[t].team === self.team) {
                  // cannot attack characters of same team
                  canhit = false;
                }
                break;
              case EFF.EXPLOSION:
                // shrafe (effect 4) can only hit non-character objects
                if (hit[t].type === "character") {
                  canhit = false;
                }
                break;
              case EFF.FIRE:
              case EFF.WEAK_FIRE:
                // fire (effect 2) and burn DoT (effect 20) cannot hit non-characters
                if (hit[t].type !== "character") {
                  canhit = false;
                }
                break;
              case EFF.WEAK_FIRE2:
              case EFF.WEAK_FIRE3:
              case EFF.WEAK_FIRE4:
                // flame column (21), explosion (22), soul bomb (23) — team exclusive
                if (self.state() === S.BURNING && hit[t].team === self.team) {
                  // burning characters cannot burn teammates with flame/explosion
                  canhit = false;
                }
                break;
            }
            if (ITR.kind === IK.FALLING) {
              if (
                self.itr.attacker.uid === hit[t].uid || // does not hit who blown you away
                (self.itr.attacker.parent &&
                  self.itr.attacker.parent.uid === hit[t].uid) || // specialattack
                (self.itr.attacker.hold &&
                  self.itr.attacker.hold.pre &&
                  self.itr.attacker.hold.pre.uid === hit[t].uid)
              ) {
                // weapon
                canhit = false;
              }
            }
            if (canhit) {
              if (!self.itr.arest) {
                try {
                  const hitResult = hit[t].hit(
                    ITR,
                    self,
                    { x: self.ps.x, y: self.ps.y, z: self.ps.z },
                    vol,
                  );
                  if (self.attacked(hitResult)) {
                    self.itr_arest_update(ITR);
                    // stalls
                    if (self.stateUpdate("hit_stop")) {
                      // do nothing
                    } else {
                      switch (self.frame.N) {
                        case 86:
                        case 87:
                        case 91:
                          self.effect_stuck(0, 2);
                          self.trans.incrementWait(1);
                          break;
                        default:
                          self.effect_stuck(0, Gameplay.default.itr.hit_stop);
                      }
                    }

                    // attack one enemy only
                    if (ITR.arest) {
                      break;
                    }
                  }
                } catch (e) {
                  console.error("hit crash:", e.message, e.stack);
                }
              }
            }
          }
          break;

        case IK.REFLECT_SHIELD: // force field — reflects projectiles only, does not hit characters
          for (const t in hit) {
            if (hit[t].type !== "specialattack" || hit[t].state() !== S.PROJECTILE_FLYING) continue
            if (hit[t].team === self.team) continue
            if (!self.itr.arest) {
              try {
                const hitResult = hit[t].hit(ITR, self, { x: self.ps.x, y: self.ps.y, z: self.ps.z }, vol)
                if (self.attacked(hitResult)) {
                  self.itr_arest_update(ITR)
                  self.effect_stuck(0, Gameplay.default.itr.hit_stop)
                }
              } catch (e) {
                console.error("force field crash:", e.message, e.stack)
              }
            }
          }
          break;
      }
    }
  }

  wpoint() {
    const self = this;
    if (self.hold.obj) {
      if (self.frame.D.wpoint) {
        if (self.frame.D.wpoint.kind === 1 || self.frame.D.wpoint.kind === 2) {
          const act = self.hold.obj.act(
            self,
            self.frame.D.wpoint,
            self.mech.make_point(self.frame.D.wpoint),
          );
          if (act.thrown) {
            self.hold.obj = null;
          }
          if (act.hit !== null && act.hit !== undefined) {
            self.itr_arest_update(act);
            // stalls
            self.trans.incrementWait(Gameplay.default.itr.hit_stop, 10);
          }
        } else if (self.frame.D.wpoint.kind === 3) {
          self.drop_weapon();
        }
      }
    }
  }

  opoint() {
    const self = this;
    if (self.frame.D.opoint) {
      if (self.frame.D.opoint.oid === 5) {
        // create characters
        let players = [];
        const number_of_character = Math.floor(
          Math.abs(self.frame.D.opoint.facing) / 10,
        );
        for (let i = 0; i < number_of_character; i++) {
          players.push({
            name: "+man",
            controller: { type: "AIscript", id: 4 },
            type: "computer",
            id: self.id,
            team: self.team,
            pos: { x: self.ps.x + 20 * (-1 * i), y: self.ps.y, z: self.ps.z },
            spec: {
              is_npc: true,
              health: {
                hp: 20,
                hp_full: 20,
                hp_bound: 20,
                mp: 100,
                mp_full: 100,
              },
              parent: self,
            },
          });
        }
        if (players.length > 0) {
          self.match.create_non_player_characters(players);
        }
        return;
      }
      const ops = coreUtil.arrayWrap(self.frame.D.opoint);
      for (const i in ops) {
        if (Math.abs(ops[i].facing) > 10) {
          self.match.create_multiple_objects(
            ops[i],
            self,
            Math.floor(ops[i].facing / 10),
            ops[i].dvz || 3,
          );
        } else {
          self.match.create_object(ops[i], self);
        }
      }
    }
  }

  hold_weapon(wea) {
    const self = this;
    self.hold.obj = wea;
  }

  drop_weapon(dvx, dvy) {
    const self = this;
    if (self.hold.obj) {
      self.hold.obj.drop(dvx, dvy);
      self.hold.obj = null;
    }
  }

  /** inter-living objects protocol: catch & throw
  for details see the engine interaction reference documentation
 */
  caught_a(ITR, att, attps) {
    // this is called when the catcher has an ITR with kind: 1 or 3
    const self = this;
    if (
      (ITR.kind === IK.CATCH && self.state() === S.DANCE_OF_PAIN) || // I am in dance of pain
      ITR.kind === IK.SUPER_CATCH
    ) // that is a super catch
    {
      if (attps.x > self.ps.x === (self.ps.dir === "right")) {
        self.trans.frame(ITR.caughtact[0], 22);
      } else {
        self.trans.frame(ITR.caughtact[1], 22);
      }
      self.health.fall = 0;
      self.catching = att;
      self.itr.attacker = att;
      self.drop_weapon();
      return attps.x > self.ps.x === (self.ps.dir === "right")
        ? "front"
        : "back";
    }
  }
  caught_b(holdpoint, cpoint, adir, vdir) {
    // this is called when the catcher has a cpoint with kind: 1
    const self = this;
    self.caught_b_holdpoint = holdpoint;
    self.caught_b_cpoint = cpoint;
    self.caught_b_adir = adir;
    self.caught_b_vdir = vdir;
    // store this info and process it at TU
  }
  caught_cpointkind() {
    const self = this;
    return self.frame.D.cpoint ? self.frame.D.cpoint.kind : 0;
  }
  caught_cpointhurtable() {
    const self = this;
    if (self.frame.D.cpoint && self.frame.D.cpoint.hurtable !== undefined) {
      return self.frame.D.cpoint.hurtable;
    } else {
      return Gameplay.default.cpoint.hurtable;
    }
  }
  caught_throw(cpoint, vdir) {
    // I am being thrown
    const self = this;
    self.throw_damage = true;  // throws bypass the Battle Mode defense rate
    if (cpoint.vaction !== undefined) {
      self.trans.frame(cpoint.vaction, 22);
    } else {
      self.trans.frame(Gameplay.default.cpoint.vaction, 22);
    }
    self.caught_throwz = vdir;
  }
  caught_release() {
    const self = this;
    self.catching = 0;
    self.trans.frame(181, 22);
    self.effect.dvx = 3; // magic number
    self.effect.dvy = -3;
    self.effect.timein = -1;
    self.effect.timeout = 0;
  }
}

export default Character;
