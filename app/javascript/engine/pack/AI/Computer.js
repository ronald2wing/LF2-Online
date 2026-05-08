export default (function()
{
	function abs(x) {return x>0?x:-x;}
	function AIscript(self,match,controller)
	{
		let bg_zwidth1 = match.background.zboundary[0],
			bg_zwidth2 = match.background.zboundary[1],
			// match.difficulty: 0=Easy, 1=Normal, 2=Difficult, 3=CRAZY!
			// mapped to the internal scale: -1=CRAZY!, 0=difficult, 1=normal, 2=easy
			difficulty = [2, 1, 0, -1][match.difficulty] ?? 0,
			// Reflex delay between attacks (AI ticks; AI runs every AI_frameskip=3
			// frames, so 10 ticks ≈ 1 second): Easy bots stand around dopily ~1s
			// before punching, Difficult/CRAZY! barely hesitate (wiki Bot_behavior).
			reflex_delay = [10, 5, 2, 0][match.difficulty] ?? 2,
			reflex_timer = 0,
			guard_timer = 0,
			ranged = null;

		let target;
		let game_objects = match.get_living_object();

		function rand(i)
		{
			return Math.floor(match.random()*i);
		}
		function loadTarget(i)
		{
			game_objects = match.get_living_object();
			if( game_objects[i])
			{
				target = game_objects[i];
				return target.AI.type();
			}
			return -1;
		}
		function updateTarget() {
			game_objects = match.get_living_object();
		}
		this.name = 'Computer';

// Computer AI (ported from CRUSHER 1.0 by YinYin, designed for Davis)

// Reactive combat brain: special moves, combos, defense and facing.
function try_special(){
if(rand(22)+1>10*(difficulty)){
 let sfac = 2*(self.AI.facing()?1:0)-1;              //own direction (-1: left, 1: right)
 let bfac = (self.AI.facing()?1:0)+(target.AI.facing()?1:0)-1;//both facing (-1: left, 0: against, 1: right)
 let stxd = self.ps.x-target.ps.x;           //x distance (left > 0 > right)
 let styd = self.ps.y-target.ps.y;          //y distance (above > 0 > below)
 let stzd = abs(self.ps.z-target.ps.z);    //z distance
 let dist = stxd*sfac;              //directional distance
 let tmp = target.health.mp;
 let smp = self.health.mp;

 if(self.health.bdefend>0&&self.state()==7&&range(0,80,dist)&&stzd<=13){controller.keyseq(['def','down','att']);return 1;}
 //no mp combo
 if (dist >= 0 && target.state() == 12 && styd > 60 && styd < 90){
  if (self.state() <= 1){if (stxd > 0){controller.keypress('left');}else {controller.keypress('right');}return 1;}//run
  else if (self.state() == 2){controller.keypress('att');return 1;}                           //attack
 }//grab combo
 if (self.state() == 9 && self.AI.catchTimer() < 50){controller.keyseq(['def','down','att']);}
  //blasts
 if (target.id!=8&&dist >= 300 && stzd <= 40 && self.state() <= 1){dash_forward_attack();}
 else if (self.id === 11 && dist > 700 && stzd <= 40 && self.frame.N >= 240 && self.frame.N <= 264){controller.keypress('att');}
 else if (self.id === 11 && self.frame.N >= 240 && self.frame.N <= 264){return 1;}
 //combo breaker
 if (stzd < 10 && dist < 75 && dist >= -5 && target.ps.y == 0 && (self.state() == 7 || self.state() == 8 || self.state() == 11 || self.state() == 16)){
  if (smp >= 225 && self.state() != 7){controller.keyseq(['def','up','att']);}else if (smp >= 75 && self.state() == 7 && (tmp < 193 || smp >= 293)){controller.keyseq(['def','down','att']);}else if (target.state() == 3 && (smp >= 225 || tmp < 70)){controller.keypress('def');}return 1;
 }//flip
 else if (self.state() == 12){
  if (target.state() == 3){controller.keypress('jump');}
 }//dash, roll
 else if (self.state() == 15 && self.health.bdefend >= 20){
  if (dist > 0 && target.state() == 3){controller.keypress('jump');}else {controller.keypress('def');}
 }
 //facing
 if (bfac != 0 && self.state() == 7 && stzd < 10 && target.ps.y == 0){//defense
  if (sfac < 0){controller.keypress('left');}else {controller.keypress('right');}//turn
 }
 else if (stzd < 10 && dist < 0 && self.state() != 1 && self.state() != 7){//normal
  if (stxd > 0){controller.keypress('left');}else {controller.keypress('right');}//turn
 }
 //defending
 if (stzd < 10 && self.state() != 7 && target.state() == 3 && abs(dist) < 100 && target.ps.y == 0 && (smp >= 225 || tmp < 70)){controller.keypress('def');}//combos
 else if (stzd < 10 && dist < 70 && dist >= -5){
  if (target.health.hp > 0 && target.health.hp <= 114 && smp >= 225 && target.state() != 12 && target.state() != 7){controller.keyseq(['def','up','att']);return 1;}//finisher
  else if (self.id === 11 && self.frame.N == 39 && target.state() == 12){controller.keypress('jump');return 1;}                                                 //super combo
  else if (self.id === 11 && (self.frame.N == 278 || self.frame.N == 279) && tmp >= 225 && target.AI.shake() > 0){controller.keyseq(['def','up','att']);return 1;}           //safe combo
  else if ((target.state() == 16 || target.state() == 8) && smp >= 150 && (tmp < 193 || smp >= 293)){controller.keyseq(['def','down','att']);return 1;} //starter
  else if (target.state() == 16 && self.state() == 0 && tmp >= 225){if (stxd > 0){controller.keypress('left');}else {controller.keypress('right');}return 1;}    //grab
  else if (self.id === 11 && (self.frame.N == 281 || self.frame.N == 282) && target.state() == 12){if (smp >= 450){controller.keyseq(['def','up','att']);return 1;}       //doubleDstart
   else if (smp >= 100){controller.keypress('jump');return 1;}else if (stxd > 0){controller.keypress('left');}else {controller.keypress('right');}return 1;}                          //low mp start
  else if (target.health.hp > 0 && target.state() == 12 && styd > 90 && self.state() == 15 && smp >= 225){controller.keyseq(['def','up','att']);return 1;}  //let dragon
  else if (target.state() == 12 && target.health.hp > 0 && smp >= 225){controller.keyseq(['def','up','att']);return 1;}          //fall dragon
 }
 //opportunities
 if (self.state() == 5 || self.state() == 9 || (self.id === 11 && self.frame.N == 292 && styd < 7)){//dash,grab,leap attack
  if ((target.health.hp <= 138 || self.AI.catchTimer() < 40) && self.state() == 9 && smp >= 300){controller.keyseq(['def','down','att']);}      //finisher
  else if ((target.health.hp <= 114 || self.AI.catchTimer() < 40) && self.state() == 9 && smp >= 225){controller.keyseq(['def','up','att']);}//finisher
  else if (self.AI.catchTimer() < 40 && self.state() == 9 && smp >= 75 && tmp < 225){controller.keyseq(['def','down','att']);return 1;}//end
  else {controller.keypress('att');}return 1;}                                                                  //attack
  else if (self.id === 11 && (self.frame.N == 292 || (self.frame.N >= 85 && self.frame.N <= 109))){return 1;} //wait
 // Drop queued combo inputs that no longer apply, so a stale sequence cannot
 // fire a wrong move (e.g. a leftover Def>Up>Jump).
 if (self.AI.seqcheck(['def','right','att']) >= 2 || self.AI.seqcheck(['def','left','att']) >= 2 || self.AI.seqcheck(['def','up','att']) >= 2 || self.AI.seqcheck(['def','down','att']) >= 2 || self.AI.seqcheck(['def','up','jump']) >= 2){
  if (self.ps.z - target.ps.z < 0){controller.keypress('down');}else {controller.keypress('up');}
 }
}
 return 0;
}
function id(){//main entry point, called once per AI tick
   if(self.uid==-1)return;
   if(self.health.hp<=0)return;
   // Team commands (Come/Stay/Move) from the human player:
   //   Stay = hold position (don't move/attack); Come = follow the leader;
   //   Move = resume normal fighting.
   const cmd = match.team_command;
   if(cmd === 'stay'){ return; }
   if(cmd === 'come'){
      const leader = find_leader();
      if(leader){
         const dx = leader.ps.x - self.ps.x;
         const dz = leader.ps.z - self.ps.z;
         if(abs(dx) > 24){ controller.keypress(dx > 0 ? 'right' : 'left'); }
         if(abs(dz) > 18){ controller.keypress(dz > 0 ? 'down' : 'up'); }
      }
      return;
   }
   if(cmd === 'move'){ match.team_command = null; }
   inputs();
   updateTarget();
   const world = get_objects();
   if(stall(world[0][0]))return;      // world[0] = [object, time, injury, z, zwidth]
   else if(rebound(world[0][0]))return;
   else if(dodge(world[0]))return;

   //grab a nearby bottle/weapon when no opponent is on our z-row
   if(pick_item(world))return;

   //finish the weak: occasionally retarget the lowest-HP opponent when reachable
   let foe = world[1][0];             // closest opponent
   if(world[3][0]!=-1&&world[3][0]!=foe&&rand(4)==0&&square_distance(self.uid,world[3][0])<160000){foe=world[3][0];}

   if(is_opponent(foe)){
      loadTarget(foe);
      if(try_special()==0&&target.health.hp>0){
         if(guard(foe))return;
         approach_opponent(foe);
         // Reflex delay: lower difficulties hesitate before attacking (wiki
         // Bot_behavior: Easy bots stand around dopily ~1s before punching).
         // The timer re-arms after each attack, so the bot hesitates between
         // attacks rather than only once at match start.
         if(reflex_timer > 0){
            reflex_timer--;
         } else if(rand(22)+1>10*(difficulty)){
            act(foe);
            reflex_timer = reflex_delay;
         }
      }
   }
}

function find_leader(){
   // The human-controlled character on the same team (the ally's commander).
   for(const uid in match.character){
      const c = match.character[uid];
      if(c && c.is_human && c.team === self.team && c.health.hp > 0 && c !== self){ return c; }
   }
   return null;
}
function dash_forward_attack(){
   if(xdistance(self.uid,target.uid) > 0){controller.keyseq(['def','right','att']);}
   else{controller.keyseq(['def','left','att']);}
}
function act(opponent){
  if(target.state()!=14&&target.AI.blink()==0){
   if(target.state()!=3&&target.state()!=2&&target.frame.N!=213&&range(100,180+abs(self.ps.vx),abs(xdistance(self.uid,opponent)))&&range(0,40+abs(self.ps.vz),abs(zdistance(self.uid,opponent)))){
	 if(self.state()<=1){run();}
	 else if(self.state()==2){controller.keypress('jump');controller.keypress('att');}
   }
   else if(opponent_close(opponent)){attack();}
  }
}
function opponent_close(opponent){
   //true if opponent is in melee range
   return (loadTarget(opponent)==0&&range(0,80,abs(xdistance(self.uid,target.uid)))&&range(0,15,abs(zdistance(self.uid,target.uid))))?true:false;
}
function attack(){
   //attack towards target
   if(facing_distance(self.uid,target.uid)>0){turn();}
   if(target.state()==16){controller.keyseq(['def','down','att']);}
   else{controller.keypress('att',1,0);}
}
function facing_distance(from,to){
   //positive: target distance to the front
   return xdistance(from,to)*(2*(self.AI.facing()?1:0)-1);
}
function approach_opponent(opponent){
   if(is_opponent(opponent)&&(target.state()==14||target.AI.blink())){
	  if(target.id==4||target.id==5){move_towards(opponent);}
      else{move_away(opponent);}
   }
   else if(is_opponent(opponent)&&is_ranged()&&range(0,75,abs(xdistance(self.uid,opponent)))&&range(0,15,abs(zdistance(self.uid,opponent)))){
	  move_away(opponent);//too close to shoot: back off to re-establish projectile range
   }
   else if(!range(0,5,abs(zdistance(self.uid,opponent)))||!range(0,65,abs(xdistance(self.uid,opponent)))){
      if(self.state()<=1&&!range(0,300,abs(xdistance(self.uid,opponent)))&&facing_towards()){run();}
      else if(self.state()<=1&&!range(0,80,abs(xdistance(self.uid,opponent)))){move_above(opponent);}
	  else{move_towards(opponent);}
   }
}
function run(){
   //run forward
   if(!self.AI.facing()){controller.keypress('right',1,0);}else{controller.keypress('left',1,0);}
}
function move_above(target_id){
   if(!range(0,10+abs(self.ps.vx),abs(xdistance(self.uid,target_id)))){
      if(xdistance(self.uid,target_id)<0){controller.keypress('left',1,1);}else{controller.keypress('right',1,1);}
   }
   if(range(0,30+abs(self.ps.vz),abs(zdistance(self.uid,target_id)))){
      if(zdistance(self.uid,target_id)<0){controller.keypress('down',1,1);}else{controller.keypress('up',1,1);}
   }
}
function move_away(target_id){
   if(xdistance(self.uid,target_id)<0){controller.keypress('right',1,1);}else{controller.keypress('left',1,1);}
   if(zdistance(self.uid,target_id)<0){controller.keypress('down',1,1);}else{controller.keypress('up',1,1);}
}
function move_towards(target_id){
   if(!range(0,60+18*(difficulty-2)+abs(self.ps.vx),abs(xdistance(self.uid,target_id)))){
      if(xdistance(self.uid,target_id)<0){controller.keypress('left',1,1);}else{controller.keypress('right',1,1);}
   }
   if(!range(0,10+abs(self.ps.vz),abs(zdistance(self.uid,target_id)))){
      if(zdistance(self.uid,target_id)<0){controller.keypress('up',1,1);}else{controller.keypress('down',1,1);}
   }
}
function pick_item(world){//grab a nearby bottle/weapon when no opponent threatens on our z-row
   if(world[1][0]!=-1&&range(0,60,abs(zdistance(self.uid,world[1][0]))))return false;//fighting takes priority
   //milk/beer: difficult/crazy bots snatch bottles and run off to drink them
   if(difficulty<=0){
	  const drink=(world[6][0]!=-1)?world[6][0]:world[7][0];
	  if(drink!=-1&&range(0,400,abs(xdistance(self.uid,drink)))&&range(0,80,abs(zdistance(self.uid,drink)))){
		 if(self.hold.obj&&self.hold.obj.type=='drink'){
		    if(world[1][0]!=-1)move_away(world[1][0]);
		    controller.keypress('att',1,0);
		    return true;
		 }
		 move_towards(drink);
		 if(range(0,40,abs(xdistance(self.uid,drink)))&&range(0,15,abs(zdistance(self.uid,drink))))controller.keypress('att',1,0);
		 return true;
	  }
   }
   //weapon lure: empty hands + a ground weapon nearby
   if(world[5][0]!=-1&&!self.hold.obj&&range(0,400,abs(xdistance(self.uid,world[5][0])))&&range(0,80,abs(zdistance(self.uid,world[5][0])))){
	  move_towards(world[5][0]);
	  if(range(0,40,abs(xdistance(self.uid,world[5][0])))&&range(0,15,abs(zdistance(self.uid,world[5][0]))))controller.keypress('att',1,0);
	  return true;
   }
   return false;
}
function range(min,max,i){
   //true if i is between min and max
   //make frame use the same form
   return (i>=min&&i<=max)?true:false;
}
function xdistance(s,t){
   //x distance between s and t
   loadTarget(s);
   let sx=target.ps.x;
   loadTarget(t);
   let tx=target.ps.x;
   return tx-sx;
}
function zdistance(s,t){
   //z distance between s and t
   loadTarget(s);
   let sz=target.ps.z;
   loadTarget(t);
   let tz=target.ps.z;
   return tz-sz;
}

function defend(target_id){//turn against target_id and defend
   if(!facing_against(target_id)){turn();}
   controller.keypress('def',1,0);
}

function guard(opponent){//proactive block: hold def briefly when an opponent closes in to attack
   if(guard_timer>0){controller.keypress('def',1,1);guard_timer--;return true;}
   if(!is_opponent(opponent)||!range(0,15,abs(zdistance(self.uid,opponent))))return false;
   if(!range(0,140,abs(xdistance(self.uid,opponent))))return false;
   if(self.state()!=0&&self.state()!=1&&self.state()!=7)return false;
   if(target.state()!=3&&rand(10)!=0)return false;//only guard attackers, occasionally opportunistically
   if(!facing_against(opponent))turn();
   controller.keypress('def',1,1);
   guard_timer=3;
   return true;
}

function forward(hold){//press forward direction
   if(hold===undefined) hold=1;
   if(self.AI.facing()){controller.keypress('left',1,hold);}else{controller.keypress('right',1,hold);}
}

function towards(target_id,hold){//move towards object target_id
   if(hold===undefined) hold=1;
   if(facing_towards(target_id)){forward(hold);}else{turn();}
   if(self.ps.z<game_objects[target_id].ps.z)controller.keypress('down',1,hold);
   else if(self.ps.z>game_objects[target_id].ps.z)controller.keypress('up',1,hold);
}

function inputs(){//release all held movement/attack keys before deciding new ones
   controller.keypress('up',0,0);controller.keypress('down',0,0);controller.keypress('left',0,0);controller.keypress('right',0,0);controller.keypress('def',0,0);controller.keypress('jump',0,0);controller.keypress('att',0,0);
}

function turn(){//press opposite direction
   if(self.AI.facing()){controller.keypress('right',1,0);}else{controller.keypress('left',1,0);}
}

function dodge(threat){//dodge an incoming attack (threat = get_objects()[0] = [object, time, injury, z, zwidth])
   if(!is_reboundable(threat[0])&&threat[1]>=dodge_time(threat)&&threat[3]!=-1){
      if(is_chase(threat[0])){towards(threat[0],0);return true;}
      if((threat[3]<self.ps.z||threat[3]<=bg_zwidth1+15)&&threat[3]<=bg_zwidth2-15)controller.keypress('down');
      else controller.keypress('up');
	  return true;
   }
   return false;
}

function facing_against(i){//check if facing against i
   if(has_direction(i))return (self.AI.facing()!=game_objects[i].AI.facing())?true:false;
   return facing_towards(i);
}

function facing_towards(i){//true if self faces target (or object i when given)
   if(i===undefined)
      return ((self.AI.facing()?-1:1)*xdistance(self.uid,target.uid)>0)?true:false;
   else
      return ((self.AI.facing()?-1:1)*(self.ps.x-game_objects[i].ps.x)<0)?true:false;
}

function has_direction(i){//true if the object has an attack relevant direction
   if(game_objects[i].caught_throwinjury||game_objects[i].AI.frame(game_objects[i].AI.frame1()).state==18)return false;
   return true;
}

function has_gravity(i){//true if character i is airborne (and therefore falls)
   return is_character(i)&&game_objects[i].ps.y<0;
}

function intersect(a,b){//check if spaces a and b intersect
 if(a[1]<b[0]||
  b[1]<a[0]||
  a[2]>b[3]||
  b[2]>a[3]||
  a[4]>b[5]||
  b[4]>a[5]||
  (a[0]==a[1]&&a[1]==a[2]&&a[2]==a[3]&&a[3]==a[4]&&a[4]==a[5])||
  (b[0]==b[1]&&b[1]==b[2]&&b[2]==b[3]&&b[3]==b[4]&&b[4]==b[5])){return false;}
 return true;
}

function is_character(i){//true if i is a character
   return (is_object(i)&&game_objects[i].AI.type()==0)?true:false;
}

function is_chase(i){//true if i is a projectile that homes in on its target
   if(is_character(i))return false;
   return [1,2,3,4,10,12,14].includes(game_objects[i].AI.frame(game_objects[i].AI.frame1()).hit_Fa);
}

function is_object(i){//true if i is an object
   return game_objects[i];
}

function is_opponent(i){//true if i is a living opponent character
   return (is_character(i)&&game_objects[i].health.hp>0&&game_objects[i].team!=self.team)?true:false;
}

function is_weapon(i){//true if i is a pickupable weapon/drink resting on the ground
   if(!is_object(i)||is_character(i))return false;
   const objectType=game_objects[i].AI.type();
   if(objectType!=1&&objectType!=2&&objectType!=6)return false;//lightweapon/heavyweapon/drink
   if(game_objects[i].ps.y!==0)return false;//must be on the ground, not in flight
   return !(game_objects[i].hold&&game_objects[i].hold.obj);//not held by anyone
}

function is_specialattack(oid){//true if object id is a projectile (specialattack)
   for(const index in match.data.object){
      if(match.data.object[index].id===oid)return match.data.object[index].type==='specialattack';
   }
   return false;
}

function is_ranged(){//true if this character can throw projectiles (cached)
   if(ranged===null){
      ranged=false;
      for(const frameIndex in self.data.frame){
         let ops=self.data.frame[frameIndex].opoint;
         if(!ops)continue;
         if(!(ops instanceof Array))ops=[ops];
         for(let k=0;k<ops.length;k++){
            if(is_specialattack(ops[k].oid)){ranged=true;break;}
         }
         if(ranged)break;
      }
   }
   return ranged;
}

function is_reboundable(i){//true if i is reboundable
   return (is_object(i)&&!is_character(i)&&game_objects[i].AI.frame(game_objects[i].AI.frame1()).state==3000)?true:false;
}

function is_stoppable(i){//true if i can be stopped by a rebound attack
   return (is_object(i)&&!is_character(i)&&game_objects[i].AI.frame(game_objects[i].AI.frame1()).state<=3000&&game_objects[i].AI.frame(game_objects[i].AI.frame1()).state!=1004&&game_objects[i].AI.frame(game_objects[i].AI.frame1()).state!=2004)?true:false;
}

function rebound(i){//stop/rebound a projectile
   //difficulty barrier
   if(rand(difficult2(0))>3)return false;
   //reboundable without risk
   if(is_stoppable(i)&&
   time_till_impact(i, self.uid)>attack_startup(self.uid,self.frame.N)&&
   time_till_impact(self.uid, get_attack_frame(self.uid,self.frame.N), i, -1)<attack_startup(self.uid,self.frame.N)){
      controller.keypress('att');return true;
   }
   return false;
}

function stall(i){//minimize damage from an incoming attack
   //difficulty barrier
   if(rand(difficult2(0))>3)return false;
   //always flip to avoid throwinjury
   if(game_objects[self.uid].throwinjury&&(self.frame.N==182||self.frame.N==188)){controller.keypress('jump');return true;}
   else if(!is_object(i))return false;
   //determine reaction speed
   if(time_till_impact(i, self.uid)<=difficult(1)){
      //defend or roll
      if(self.state()<=2||self.frame.N==215){defend(i);return true;}
	  //flip
      if(self.frame.N==182||self.frame.N==188){controller.keypress('jump');return true;}
   }
   return false;
}

function attack_startup(o,f){//time it takes to perform a basic attack
   let t=0;
   if(get_attack_start(o,f)!=-1){
      for(let i = get_attack_start(o,f); i < 400; i=game_objects[o].AI.frame(i).next){
	     t+=game_objects[o].AI.frame(i).wait;
		 if(game_objects[o].AI.frame(i).itr_count>0&&game_objects[o].AI.frame(i).itrs[0].kind==0){
		    return t;
	     }
	  }
   }
   return 31;
}

function difficult(i){//translate difficulty into values: 0,2,4,6 or 1,3,5,7 or ...
   return 2*difficulty+2+i;
}
function difficult2(i){//translate difficulty into values: 0,4,16,36 or 1,9,25,49 or ...
   return difficult(i)*difficult(i);
}

function dodge_time(i){//returns the time it takes to dodge out of threat i's z range
   let z=game_objects[self.uid].AI.frame(self.frame.N).dvz;
   if(self.state()<2)z=game_objects[self.uid].data.bmp.walking_speedz;
   else if(self.state()==2)z=game_objects[self.uid].data.bmp.running_speedz;
   for(let t = 0; t < 31; ++t){
      if(self.ps.z+z*4*t>i[3]+i[2])return t;
      if(self.ps.z-z*4*t<i[3]-i[2])return t;
   }
   return 31;
}

function get_attack_frame(o,f){//get attack frame for object o in frame f
   if(get_attack_start(o,f)!=-1){
      for(let i = get_attack_start(o,f); i < 400; i=game_objects[o].AI.frame(i).next){
		 if(game_objects[o].AI.frame(i).itr_count>0&&game_objects[o].AI.frame(i).itrs[0].kind==0){
		    return i;
	     }
	  }
   }
   return 0;
}

function get_attack_start(o,f){//get attack start for object o in frame f
//include random frame 65, super punch 70, weapon attacks
   if(game_objects[o].AI.weaponType()==0){
      if(game_objects[o].AI.frame(f).state<=1)return 60;
      else if(game_objects[o].AI.frame(f).state==2)return 85;
      else if(game_objects[o].AI.frame(f).state==4)return 80;
      else if(game_objects[o].AI.frame(f).state==5)return 90;
   }
   return -1;
}

function square_distance(i,o){//returns squared distance between object i and o
   return(
   ((game_objects[i].ps.x-game_objects[o].ps.x)*(game_objects[i].ps.x-game_objects[o].ps.x))
   +((game_objects[i].ps.y-game_objects[o].ps.y)*(game_objects[i].ps.y-game_objects[o].ps.y))/3
   +3*((game_objects[i].ps.z-game_objects[o].ps.z)*(game_objects[i].ps.z-game_objects[o].ps.z)));
}

function time_till_impact(o,fo,x,fx){//returns frames until the attack from o hits x
   // Same scan as get_attack_info, but the caller only needs the time.
   return get_attack_info(o,fo,x,fx)[0];
}

function bdy(o,i,f,t){//get bdy i of object o in frame f at time t from now
   let r=[0,0,0,0,0,0];
   if(game_objects[o].AI.frame(f).bdy_count>i){
      r[game_objects[o].AI.facing()?1:0]= game_objects[o].ps.x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).bdys[i].x -(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).centerx;
      r[game_objects[o].AI.facing()?0:1]= game_objects[o].ps.x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).bdys[i].x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).bdys[i].w -(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).centerx;
      r[0]+=game_objects[o].ps.vx*t;
      r[1]+=game_objects[o].ps.vx*t;
      r[2]=game_objects[o].ps.y+game_objects[o].AI.frame(f).bdys[i].y-game_objects[o].AI.frame(f).centery;
      r[3]=game_objects[o].ps.y+game_objects[o].AI.frame(f).bdys[i].y+game_objects[o].AI.frame(f).bdys[i].h-game_objects[o].AI.frame(f).centery;
      r[2]+=game_objects[o].ps.vy*t+(has_gravity(o)?1.7:0)*t;
      r[3]+=game_objects[o].ps.vy*t+(has_gravity(o)?1.7:0)*t;
      r[4]=game_objects[o].ps.z +game_objects[o].ps.vz*t;
      r[5]=game_objects[o].ps.z +game_objects[o].ps.vz*t;
   }
   return r;
}

function get_attack_info(o,fo,x,fx){
   if( x===undefined && fx===undefined)
   {
      x=fo;
      fo=game_objects[o].AI.frame1();
      fx=game_objects[x].AI.frame1();
   }
   let a=[31,0,-1,14];
   if(fo==-1)fo=game_objects[o].AI.frame1();
   if(fx==-1)fx=game_objects[x].AI.frame1();
   if(is_object(x)&&o!=x&&is_object(o)){
      if(game_objects[x].AI.frame(fx).bdy_count>0&&game_objects[x].itr.vrest[o]==0&&game_objects[x].AI.blink()<=1&&game_objects[o].AI.frame(fo).itr_count>0&&game_objects[o].itr.arest==0){
         for(let i = 0; i < game_objects[o].AI.frame(fo).itr_count; ++i){
	        if((game_objects[o].team!=game_objects[x].team||game_objects[o].AI.frame(fo).state==18||game_objects[o].AI.frame(fo).state==12)&&
			   (self.state()!=12||game_objects[o].AI.frame(fo).itrs[i].fall>=60)&&
			   game_objects[o].AI.frame(fo).itrs[i].kind!=1&&
		       game_objects[o].AI.frame(fo).itrs[i].kind!=2&&
			   (game_objects[o].throwinjury||
			   game_objects[o].AI.frame(fo).itrs[i].kind!=4)&&
			   ((game_objects[o].AI.weaponHolder() && game_objects[game_objects[o].AI.weaponHolder()].AI.frame(game_objects[game_objects[o].AI.weaponHolder()].AI.frame1()).wpoint.attacking)||
			   game_objects[o].AI.frame(fo).itrs[i].kind!=5)&&
		   	   game_objects[o].AI.frame(fo).itrs[i].kind!=6&&
		   	   game_objects[o].AI.frame(fo).itrs[i].kind!=7&&
		   	   game_objects[o].AI.frame(fo).itrs[i].kind!=8&&
		   	   game_objects[o].AI.frame(fo).itrs[i].kind!=14&&
		   	   game_objects[o].AI.frame(fo).itrs[i].effect!=4){
               for(let j = 0; j < game_objects[x].AI.frame(fx).bdy_count; ++j){
                  for(let t = 0; t < 31; ++t){
	                 if(intersect(bdy(x,j,fx,t),itr(o,i,fo,t))){
					    a[0]=t;
						a[1]=game_objects[o].AI.frame(fo).itrs[i].injury;
						a[2]=game_objects[o].ps.z+game_objects[o].ps.vz*t;
						if(game_objects[o].AI.frame(fo).itrs[i].zwidth)a[3]=game_objects[o].AI.frame(fo).itrs[i].zwidth-1;
						return a;
					 }
   			      }
   			   }
            }
         }
      }
   }
   return a;
}

function get_objects(){//scan the arena and collect all objects the AI cares about
   // Returns an array of slots, each [id, distance]:
   //   0: first attack that will hit self — [object, time, injury, z, zwidth]
   //   1: closest opponent         2: second closest opponent
   //   3: weakest opponent         5: closest weapon
   //   6: closest milk (122)       7: closest beer (123)
   // Slot 4 is reserved (was "closest boss" in the original, never populated).
   let o=[
   [-1,31,-1,-1,14],
   [-1,2147483647],
   [-1,2147483647],
   [-1,2147483647],
   [-1,2147483647],
   [-1,2147483647],
   [-1,2147483647],
   [-1,2147483647],
   ];
   let a=[31,-1,-1,14];
   for (let i in game_objects){
      if(is_object(i)){
	     a=get_attack_info(i,self.uid);
         if(a[0]<o[0][1]){o[0][0]=i;o[0][1]=a[0];o[0][2]=a[1];o[0][3]=a[2];o[0][4]=a[3];}
         else if(a[0]==o[0][1]&&a[1]<o[0][2]){o[0][0]=i;o[0][1]=a[0];o[0][2]=a[1];o[0][4]=a[3];}
		 if(is_opponent(i)&&square_distance(self.uid,i)<o[1][1]){o[1][1]=square_distance(self.uid,i);o[2][0]=o[1][0];o[1][0]=i;}
		 else if(is_opponent(i)&&square_distance(self.uid,i)<o[2][1]){o[2][1]=square_distance(self.uid,i);o[2][0]=i;}
		 if(is_opponent(i)&&game_objects[i].health.hp<o[3][1]){o[3][1]=game_objects[i].health.hp;o[3][0]=i;}
		 else if(is_opponent(i)&&game_objects[i].health.hp==o[3][1]){o[3][0]=-1;}
		 if(is_weapon(i)){
		    const d=square_distance(self.uid,i);
		    if(d<o[5][1]){o[5][1]=d;o[5][0]=i;}
		    if(game_objects[i].id==122&&d<o[6][1]){o[6][1]=d;o[6][0]=i;}
		    if(game_objects[i].id==123&&d<o[7][1]){o[7][1]=d;o[7][0]=i;}
		 }
      }
   }
   return o;
}

function itr(o,i,f,t){//get itr i of object o in frame f at time t from now
   let r=[0,0,0,0,0,0];
   if(game_objects[o].AI.frame(f).itr_count>i){
      r[game_objects[o].AI.facing()?1:0]= game_objects[o].ps.x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).itrs[i].x -(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).centerx;
      r[game_objects[o].AI.facing()?0:1]= game_objects[o].ps.x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).itrs[i].x +(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).itrs[i].w -(game_objects[o].AI.facing()?-1:1)*game_objects[o].AI.frame(f).centerx;
      r[0]+=game_objects[o].ps.vx*t;
      r[1]+=game_objects[o].ps.vx*t;
      r[2]=game_objects[o].ps.y+game_objects[o].AI.frame(f).itrs[i].y-game_objects[o].AI.frame(f).centery;
      r[3]=game_objects[o].ps.y+game_objects[o].AI.frame(f).itrs[i].y+game_objects[o].AI.frame(f).itrs[i].h-game_objects[o].AI.frame(f).centery;
      r[2]+=game_objects[o].ps.vy*t+(has_gravity(o)?1.7:0)*t;
      r[3]+=game_objects[o].ps.vy*t+(has_gravity(o)?1.7:0)*t;
      let z=game_objects[o].AI.frame(f).itrs[i].zwidth;
      if(z==0)z=14;
      r[4]=game_objects[o].ps.z-z +game_objects[o].ps.vz*t;
      r[5]=game_objects[o].ps.z+z +game_objects[o].ps.vz*t;
   }
   return r;
}
		this.TU = id;
	}
	AIscript.type = AIscript.prototype.type = 'AIscript';
	return AIscript;
})();