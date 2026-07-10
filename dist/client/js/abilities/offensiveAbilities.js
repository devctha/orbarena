(function () {
  "use strict";
  const M=window.OrbArena.CharacterMechanics;
  const simple=(id,opt={})=>M.register(id,{
    active(w,s,t,c){ if(opt.teleport)c.teleport(w,s,t.x-(t.vx||0)*.12,t.y-(t.vy||0)*.12); if(opt.zone)c.zone(w,s,t,{kind:opt.zone,radius:opt.radius||100,life:opt.life||5,power:opt.power||3,color:s.color}); if(opt.burst)c.burst(w,s,t,{count:opt.burst,damage:opt.damage||8,speed:opt.speed||560,spread:.13,color:s.glowColor,pierce:opt.pierce||0,homing:opt.homing||0}); else c.damage(w,s,t,opt.damage||13,id); if(opt.knock)c.impulse(t,t.x-s.x,t.y-s.y,opt.knock); return opt.cd||7;},
    event(w,s,t,e,c){ if(t&&e.type==="damage"&&opt.onHit) opt.onHit(w,s,t,e,c); },
    ultimate(w,s,t,c){ if(opt.teleport)c.teleport(w,s,t.x-35,t.y-35); c.burst(w,s,t,{radial:opt.radial!==false,count:opt.ultCount||12,damage:opt.ultDamage||10,speed:opt.speed||600,bounces:opt.bounces||0,pierce:opt.pierce||0,homing:opt.homing||0,color:s.glowColor}); c.radial(w,s,t,opt.ultRadius||250,opt.ultImpact||20,opt.ultKnock||280,id+"-ultimate",true); }
  });
  M.register("venom",{active(w,s,t,c){c.poison(t,s,3,6,2.4);c.poisonPool(w,s,t.x,t.y,{radius:78,life:7,dps:2.2});return 6.5;},event(w,s,t,e,c){if(t&&e.type==="damage")c.poison(t,s,1,4,1.8);},ultimate(w,s,t,c){c.poison(t,s,8,10,3.2);for(let i=0;i<4;i++)c.poisonPool(w,s,c.random.range(90,870),c.random.range(80,460),{radius:92,life:9,dps:3});}});
  M.register("bloodmoon",{update(w,s,t,dt,c){if(t.healthRatio()<.5)c.heal(s,1.2*dt);},active(w,s,t,c){const d=c.damage(w,s,t,16,"blood-cut");c.heal(s,d*.45);return 7;},ultimate(w,s,t,c){const d=c.damage(w,s,t,35+(1-t.healthRatio())*28,"bloodmoon",true);c.heal(s,d*.6);s.setStatus("haste",6,.3);}});
  M.register("plague",{active(w,s,t,c){c.poison(t,s,2,8,1.7);c.summon(w,s,{kind:"plague-rat",life:7,damage:5,explodeOnDeath:8});return 7;},event(w,s,t,e,c){if(t&&e.type==="damage")c.poison(t,s,1,5,1.4);},ultimate(w,s,t,c){c.poison(t,s,10,12,2.5);for(let i=0;i<4;i++)c.summon(w,s,{kind:"plague-rat",life:9,damage:6,explodeOnDeath:10});}});
  M.register("leech",{active(w,s,t,c){const d=c.damage(w,s,t,15,"drain");c.heal(s,d*.7);return 7;},receive(w,s,a,e,c){if(a&&e.damage)c.damage(w,s,a,Math.min(5,e.damage*.12),"leech-skin");},ultimate(w,s,t,c){const d=c.damage(w,s,t,40,"devour",true);c.heal(s,d);c.shield(s,d*.4);}});
  simple("blink",{teleport:true,damage:14,cd:5.5,ultCount:8,ultDamage:9,ultRadius:180});
  simple("prism",{burst:5,damage:7,pierce:1,cd:6.5,ultCount:18,ultDamage:8,bounces:2});
  simple("void",{zone:"silence",radius:120,life:5,power:1,damage:10,cd:8,ultCount:10,ultDamage:8,ultRadius:280});
  M.register("nova",{update(w,s,t,dt){s.characterState.meter=Math.min(100,s.characterState.meter+dt*8);},active(w,s,t,c){const q=s.characterState.meter;c.radial(w,s,t,120+q,8+q*.16,170+q*2,"nova");s.characterState.meter=0;return 6;},ultimate(w,s,t,c){c.radial(w,s,t,360,42,600,"supernova",true);s.characterState.meter=0;}});
  simple("comet",{teleport:true,damage:18,knock:300,cd:6,ultImpact:34,ultKnock:620,ultRadius:270});
  M.register("phantom",{active(w,s,t,c){s.characterState.data.phase=3;s.nextImpactMultiplier=1.7;c.teleport(w,s,t.x-60,t.y-20);return 7;},update(w,s,t,dt){s.characterState.data.phase=Math.max(0,(s.characterState.data.phase||0)-dt);if(s.characterState.data.phase>0)s.damageReduction=Math.max(s.damageReduction,.55);},ultimate(w,s,t,c){s.characterState.data.phase=7;s.nextImpactMultiplier=2.2;c.damage(w,s,t,30,"absence",true);}});
  M.register("shade",{active(w,s,t,c){const m=c.summon(w,s,{kind:"shadow",behavior:"stationary",life:8,health:20,scale:.4});s.characterState.data.shadow=m;return 5;},receive(w,s,a,e,c){const m=s.characterState.data.shadow;if(m?.active&&e.damage>12)c.teleport(w,s,m.x,m.y);},ultimate(w,s,t,c){for(let i=0;i<4;i++)c.clone(w,s,{life:6,damageScale:.28});c.teleport(w,s,t.x-45,t.y);}});
  simple("razor",{burst:4,damage:8,bounces:1,cd:5.5,ultCount:16,ultDamage:8});
  simple("hammer",{damage:20,knock:420,cd:8,ultImpact:34,ultKnock:650});
  simple("spear",{burst:1,damage:19,pierce:3,speed:760,cd:6.5,ultCount:7,ultDamage:15,radial:false});
  M.register("berserk",{update(w,s){const q=1-s.healthRatio();s.damage=s.baseDamage*(1+q*.65);s.maxSpeed=s.baseMaxSpeed*(1+q*.3);},active(w,s,t,c){s.applyDamage(6,{source:"ability",ignoreArmor:true});s.setStatus("haste",5,.35);s.nextImpactMultiplier=1.5;return 7;},ultimate(w,s,t,c){s.characterState.data.rage=8;c.clearControls(s);s.setStatus("haste",8,.55);c.radial(w,s,t,220,28,420,"terminal-rage",true);}});
  M.register("rampage",{event(w,s,t,e,c){if(e.type==="collision"&&t){s.characterState.stacks=Math.min(12,s.characterState.stacks+1);s.characterState.data.combo=3;c.damage(w,s,t,s.characterState.stacks*.7,"rampage");}},update(w,s,t,dt){s.characterState.data.combo=Math.max(0,(s.characterState.data.combo||0)-dt);if(!s.characterState.data.combo)s.characterState.stacks=Math.max(0,s.characterState.stacks-dt*2);s.damage=s.baseDamage*(1+s.characterState.stacks*.035);},active(w,s,t,c){c.impulse(s,t.x-s.x,t.y-s.y,260);return 5;},ultimate(w,s,t,c){s.characterState.stacks=12;s.characterState.data.combo=9;s.setStatus("haste",9,.45);}});
  simple("sniper",{burst:1,damage:26,pierce:2,speed:880,cd:7.5,ultCount:5,ultDamage:20,radial:false});
  simple("gunner",{burst:8,damage:4,speed:650,cd:5,ultCount:18,ultDamage:5,homing:.05});
  simple("missile",{burst:3,damage:11,speed:420,homing:.14,cd:7,ultCount:12,ultDamage:10,homing:.2});
}());
