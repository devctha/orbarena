(function(){
  "use strict";const OA=window.OrbArena;
  class CinematicAbilitySystem{
    static telegraph(world,actor,target,ability,host,action,delay=.22){if(world.effects.length>=40)world.effects.shift();world.effects.push({type:"telegraph",owner:actor,x:target.x,y:target.y,life:delay,maxLife:delay,radius:ability.range||65,color:ability.color,shape:ability.params.kind.includes("Line")?"line":"circle"});host.schedule(world,delay,()=>{if(actor.alive)action();});}
    static execute(world,a,t,ability,host){const k=ability.params.kind,d=OA.Vector.normalize(t.x-a.x,t.y-a.y),bounds=host.bounds(world,a.radius),tele=(fn,delay)=>this.telegraph(world,a,t,ability,host,fn,delay);switch(k){
      case"lastStand":a.addShield(ability.power);a.setStatus("damageReduction",3,.32);a.setStatus("haste",2,.14);break;
      case"adaptiveRecovery":a.heal(8+(a._damageTypes?.size||1)*4);a._damageTypes?.clear();break;
      case"emergencyWarp":host.teleport(a,OA.clamp(a.x-d.x*ability.power,bounds.left,bounds.right),OA.clamp(a.y-d.y*ability.power,bounds.top,bounds.bottom),bounds);a.invulnerability=.25;break;
      case"deflectionShell":a.setStatus("reflecting",3,ability.power);a.addShield(12);break;
      case"reboundGuard":a.addShield(ability.power);a._primeWall=true;a.setStatus("superBounce",3,1.12);break;
      case"secondPulse":a.resurrectionReady=true;tele(()=>host.radial(world,a,t,ability.range,0,330,ability.id),.16);break;
      case"shieldBloom":a.addShield(ability.power);host.addOrbitals(world,a,4,5,58,2,ability.color,"shield-fragment");break;
      case"reactivePlating":a.setStatus("adaptiveArmor",6,ability.power);a.armor+=ability.power*.4;break;
      case"temporalShelter":world.cinematicZones.push(this.zone(a,a,"timeField",ability));break;
      case"cloneEscape":host.summonSystem?.spawn(world,a,{kind:"clone-escape",behavior:"chase",life:4.5,scale:.58,damage:Math.max(2,a.damage*.18),limit:2,color:a.color});world.effects.push({type:"clone",owner:a,x:a.x,y:a.y,angle:0,life:5,color:a.color});a.setStatus("phased",.8,1);host.impulse(a,{x:-d.y,y:d.x},180);break;
      case"spiralDash":host.impulse(a,{x:d.x-d.y*.72,y:d.y+d.x*.72},ability.power);a.speedTrailTimer=2;break;
      case"wallRunner":{const wall=host.bounds(world,a.radius),edges=[Math.abs(a.x-wall.left),Math.abs(a.x-wall.right),Math.abs(a.y-wall.top),Math.abs(a.y-wall.bottom)],edge=edges.indexOf(Math.min(...edges)),tangent=edge<2?{x:0,y:Math.sign(t.y-a.y)||a.ai.orbit}:{x:Math.sign(t.x-a.x)||a.ai.orbit,y:0};host.impulse(a,tangent,ability.power);a.speedTrailTimer=2;break;}
      case"crossStep":host.impulse(a,{x:d.x-d.y,y:d.y+d.x},ability.power);host.schedule(world,.2,()=>host.impulse(a,{x:d.x+d.y,y:d.y-d.x},ability.power));break;
      case"momentumShift":{const speed=a.currentSpeed();a.vx=-d.y*speed*a.ai.orbit;a.vy=d.x*speed*a.ai.orbit;break;}
      case"orbitalRush":host.impulse(a,{x:-d.y*a.ai.orbit,y:d.x*a.ai.orbit},ability.power);host.schedule(world,.35,()=>host.impulse(a,OA.Vector.normalize(t.x-a.x,t.y-a.y),ability.power));break;
      case"phantomDrift":a.setStatus("phased",.75,1);host.impulse(a,{x:d.x-d.y*.5,y:d.y+d.x*.5},ability.power);break;
      case"rocketRebound":a._primeWall=true;a.wallBoostTimer=Math.max(a.wallBoostTimer,1);host.impulse(a,d,ability.power);break;
      case"kineticLeap":a.invulnerability=.18;host.teleport(a,OA.clamp(a.x+d.x*ability.power,bounds.left,bounds.right),OA.clamp(a.y+d.y*ability.power,bounds.top,bounds.bottom),bounds);break;
      case"gravitySkid":host.impulse(a,{x:-d.y*a.ai.orbit,y:d.x*a.ai.orbit},ability.power);a.setStatus("phased",.3,1);break;
      case"blinkChain":for(let i=0;i<3;i++)host.schedule(world,i*.16,()=>host.teleport(a,OA.clamp(a.x+d.x*75-d.y*this.randomOffset(host),bounds.left,bounds.right),OA.clamp(a.y+d.y*75+d.x*this.randomOffset(host),bounds.top,bounds.bottom),bounds));break;
      case"ruptureHit":a.nextImpactMultiplier=Math.max(a.nextImpactMultiplier,ability.power);host.particles.addDecal(a.x,a.y,"crack",ability.color,65,5);break;
      case"sonicCollision":tele(()=>host.radial(world,a,t,ability.range,ability.power,250,ability.id),.2);break;
      case"shockRing":tele(()=>{if(host.radial(world,a,t,ability.range,ability.power,130,ability.id))t.setStatus("stunned",.35,1);host.particles.emitLightning(a.x,a.y,t.x,t.y,ability.color);},.24);break;
      case"meteorCrash":tele(()=>{host.teleport(a,t.x-d.x*55,t.y-d.y*55,bounds);host.radial(world,a,t,ability.range,ability.power,360,ability.id);host.particles.addDecal(t.x,t.y,"crater",ability.color,80,6);},.38);break;
      case"pressureBurst":tele(()=>host.radial(world,a,t,ability.range,ability.power,330,ability.id),.45);break;
      case"recoilSlam":tele(()=>{host.radial(world,a,t,ability.range,ability.power,320,ability.id);a.applyImpulse(-d.x*180,-d.y*180);},.24);break;
      case"wallbreaker":a._primeWall=true;a.nextImpactMultiplier=Math.max(a.nextImpactMultiplier,ability.power);break;
      case"kineticLance":a._impactArmorPen=.6;a.nextImpactMultiplier=1.42;host.impulse(a,d,Math.min(520,ability.power*16+a.currentSpeed()*.45));break;
      case"compressionStrike":a.deform.amount=.65;tele(()=>host.radial(world,a,t,ability.range,ability.power,280,ability.id),.3);break;
      case"heavyOrbit":a.setStatus("ram",4,ability.power);a.mass=a.baseMass*(1+ability.power);host.impulse(a,{x:-d.y*a.ai.orbit,y:d.x*a.ai.orbit},220);break;
      default:if(world.cinematicZones.length>=12)world.cinematicZones.shift();world.cinematicZones.push(this.zone(a,k.includes("Halo")?a:t,k,ability));break;}}
    static randomOffset(host){return host.random.range(-34,34);}
    static zone(owner,at,kind,ability){return{owner,kind,x:at.x,y:at.y,radius:ability.range,life:ability.params.duration||4,maxLife:ability.params.duration||4,tick:0,history:null,color:ability.color,power:ability.power};}
    static update(world,dt,host){for(const z of world.cinematicZones){z.life-=dt;z.tick-=dt;if(z.kind==="poisonHalo"){z.x=z.owner.x;z.y=z.owner.y;}const target=z.owner===world.player?world.enemy:world.player,dir=OA.Vector.normalize(z.x-target.x,z.y-target.y),inside=dir.length<=z.radius+target.radius;for(const p of host.projectiles.pool){if(!p.active||p.team===z.owner.team)continue;const pdir=OA.Vector.normalize(z.x-p.x,z.y-p.y);if(pdir.length>z.radius)continue;if(z.kind==="frostPulse"||z.kind==="timeField"){p.vx*=.96;p.vy*=.96;}if(z.kind==="gravityNet"||z.kind==="vacuumDome"||z.kind==="magneticLine"){const pull=z.kind==="magneticLine"?z.power*.24:z.power*.42;p.vx+=pdir.x*pull*dt;p.vy+=pdir.y*pull*dt;}if(z.kind==="repulsionGate"){p.vx-=pdir.x*z.power*.55*dt;p.vy-=pdir.y*z.power*.55*dt;}}if(!inside)continue;if(z.kind==="timeField"||z.kind==="lockdownZone")target.setStatus("slow",.18,z.power);if(z.kind==="lockdownZone")target.setStatus("prison",.18,.38);if(z.kind==="gravityNet"||z.kind==="vacuumDome")target.applyForce(dir.x*z.power*target.mass,dir.y*z.power*target.mass);if(z.kind==="magneticLine")target.applyForce(dir.x*z.power*.6*target.mass,dir.y*z.power*.6*target.mass);if(z.kind==="poisonHalo"&&z.tick<=0){z.tick=.45;host.combat.dealDamage(world,z.owner,target,z.power,{source:"ability",abilityId:"poison-halo",dot:true,noRandomCrit:true});}if(z.kind==="staticFog"&&z.tick<=0){z.tick=.55;host.combat.dealDamage(world,z.owner,target,z.power,{source:"ability",abilityId:"static-fog",noRandomCrit:true});host.particles.emitLightning(z.x,z.y,target.x,target.y,z.color);}if(z.kind==="repulsionGate")target.applyForce(-dir.x*z.power*target.mass,-dir.y*z.power*target.mass);if(z.kind==="chronoTrap"){z.history||={x:target.x,y:target.y};if(z.life<1&&z.history){target.x=z.history.x;target.y=z.history.y;z.history=null;}}}world.cinematicZones=world.cinematicZones.filter(z=>z.life>0);}
  }
  OA.CinematicAbilitySystem=CinematicAbilitySystem;
}());
