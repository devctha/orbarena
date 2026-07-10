(function () {
  "use strict";
  const M = window.OrbArena.CharacterMechanics;
  M.register("thorn", {
    spawn(w,s,t,c){ c.spikes(s,{count:7,durability:34,damage:7,life:999}); },
    active(w,s,t,c){ c.spikes(s,{count:10,durability:48,damage:10,life:7}); return 7; },
    receive(w,s,a,e,c){ if(a && e.damage && s.spikes?.active) c.damage(w,s,a,Math.min(10,e.damage*.28),"thorn-reflect"); },
    ultimate(w,s,t,c){ c.spikes(s,{count:16,durability:80,damage:15,life:9}); c.radial(w,s,t,190,18,260,"thorn-crown",true); }
  });
  M.register("mirror", {
    active(w,s,t,c){ s.characterState.data.reflect=3.5; c.clone(w,s,{life:4,damageScale:.35}); return 8; },
    update(w,s,t,dt){ s.characterState.data.reflect=Math.max(0,(s.characterState.data.reflect||0)-dt); },
    receive(w,s,a,e,c){ if(a && e.source==="projectile" && s.characterState.data.reflect>0) c.projectile(w,s,a,{damage:Math.min(18,e.damage||8),speed:620,color:s.glowColor}); },
    ultimate(w,s,t,c){ for(let i=0;i<3;i++) c.clone(w,s,{life:7,damageScale:.45}); s.characterState.data.reflect=7; }
  });
  M.register("bastion", {
    spawn(w,s){ s.addShield(24); }, active(w,s,t,c){ c.shield(s,32); c.summon(w,s,{kind:"bastion-wall",behavior:"stationary",health:60,life:7,blockProjectiles:true,scale:.8}); return 8; },
    receive(w,s,a,e){ if(a){ const facing=Math.atan2(s.vy,s.vx), incoming=Math.atan2(a.y-s.y,a.x-s.x); if(Math.cos(incoming-facing)>.25 && e.damage) s.heal(e.damage*.22); } },
    ultimate(w,s,t,c){ c.shield(s,75); for(let i=0;i<3;i++) c.summon(w,s,{kind:"fortress",behavior:"orbit",health:55,life:9,blockProjectiles:true,scale:.65,angle:i*Math.PI*2/3}); }
  });
  M.register("juggernaut", {
    update(w,s){ const q=Math.min(1,s.currentSpeed()/s.maxSpeed); s.mass=s.baseMass*(1+q*.45); s.knockbackResistance=Math.max(s.baseKnockbackResistance,q*.55); },
    active(w,s,t,c){ c.clearControls(s); s.setStatus("ram",4,.8); c.impulse(s,t.x-s.x,t.y-s.y,240); return 8; },
    event(w,s,t,e,c){ if(e.type==="collision"&&t) c.damage(w,s,t,5+s.currentSpeed()*.02,"juggernaut-impact"); },
    ultimate(w,s,t,c){ c.clearControls(s); s.mass=s.baseMass*2; c.impulse(s,t.x-s.x,t.y-s.y,520); c.radial(w,s,t,240,28,520,"unstoppable",true); c.schedule(w,5,()=>s.mass=s.baseMass); }
  });
  M.register("bulwark", {
    receive(w,s,a,e,c){ if(e.damage) c.shield(s,e.damage*.34); },
    active(w,s,t,c){ const power=Math.min(32,s.shield*.45); s.shield=Math.max(0,s.shield-power); c.radial(w,s,t,175,power,340,"shield-detonation"); return 7; },
    ultimate(w,s,t,c){ c.shield(s,90); s.characterState.data.absolute=6; },
    update(w,s,t,dt){ s.characterState.data.absolute=Math.max(0,(s.characterState.data.absolute||0)-dt); if(s.characterState.data.absolute>0) s.damageReduction=Math.max(s.damageReduction,.32); }
  });
  M.register("aegis", {
    spawn(w,s,t,c){ c.summon(w,s,{kind:"aegis",behavior:"orbit",life:999,health:80,blockProjectiles:true,scale:.55}); },
    active(w,s,t,c){ c.shield(s,30); c.clearControls(s); return 7; },
    receive(w,s,a,e,c){ if(e.damage&&s.shield>0) c.heal(s,e.damage*.12); },
    ultimate(w,s,t,c){ c.shield(s,100); c.zone(w,s,s,{kind:"heal",at:"self",radius:125,life:7,power:5,color:s.glowColor}); }
  });
  M.register("crystal", {
    active(w,s,t,c){ c.summon(w,s,{kind:"crystal",behavior:"stationary",life:8,health:44,blockProjectiles:true,explodeOnDeath:14,scale:.55}); c.shield(s,18); return 6.5; },
    receive(w,s,a,e,c){ if(e.damage&&c.random.chance(.22)) c.projectile(w,s,a,{damage:7,bounces:2,color:s.glowColor}); },
    ultimate(w,s,t,c){ for(let i=0;i<7;i++) c.burst(w,s,t,{radial:true,count:7,damage:7,bounces:3,speed:480,color:s.glowColor}); c.shield(s,46); }
  });
  M.register("pulse", {
    active(w,s,t,c){ c.radial(w,s,t,190,8,420,"pulse"); c.removeProjectiles(s,190); return 6; },
    receive(w,s,a,e,c){ if(e.damage&&(s.characterState.data.counter||0)<=0){ c.radial(w,s,a,115,5,210,"counter-pulse"); s.characterState.data.counter=2.5; } },
    update(w,s,t,dt){ s.characterState.data.counter=Math.max(0,(s.characterState.data.counter||0)-dt); },
    ultimate(w,s,t,c){ for(let i=1;i<=4;i++) c.schedule(w,i*.45,()=>c.radial(w,s,t,150+i*35,8+i*2,240+i*70,"pulse-storm",true)); }
  });
  M.register("omega", {
    update(w,s,t,dt,c){ const r=s.healthRatio(); s.damage=s.baseDamage*(1+(1-r)*.35); if(r<.45)c.heal(s,.7*dt); },
    active(w,s,t,c){ c.clearControls(s); c.shield(s,24); c.radial(w,s,t,150,12,180,"omega-adapt"); return 6.5; },
    receive(w,s,a,e){ if(e.damage){ s.characterState.data.last=e.source; s.knockbackResistance=Math.min(.72,s.knockbackResistance+.06); } },
    ultimate(w,s,t,c){ c.heal(s,s.maxHealth*.22); c.shield(s,65); c.radial(w,s,t,300,34,380,"omega-protocol",true); s.setStatus("haste",8,.3); }
  });
}());
