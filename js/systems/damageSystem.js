(function(){
  "use strict";
  const OA=window.OrbArena;
  OA.COMBAT_LIMITS=Object.freeze({maxHit:72,maxUltimateHit:96,maxDps:34,maxHitsPerFrame:8,sameSourceHitCooldown:.055,maxSlow:.78,maxStun:1.1,maxPull:620,maxKnockback:720,maxHealRatio:.24,maxShieldRatio:.6,maxInvulnerability:1.25,maxClones:6,maxSummons:10,maxProjectiles:180,maxZones:24,minCooldown:.35});
  class DamageSystem{
    constructor(particles,audio,logger){this.particles=particles;this.audio=audio;this.logger=logger;}
    packet(input={}){
      const base=Number(input.baseDamage??input.finalDamage??0);
      return{sourceId:input.sourceId||input.source?.id||input.ownerId||"arena",ownerId:input.ownerId||input.source?.id||null,teamId:input.teamId||input.source?.teamId||input.source?.team||null,abilityId:input.abilityId||null,weaponId:input.weaponId||null,projectileId:input.projectileId||null,damageType:input.damageType||input.sourceType||"kinetic",sourceType:input.sourceType||"ability",baseDamage:Number.isFinite(base)?Math.max(0,base):0,finalDamage:0,critical:Boolean(input.critical),penetration:OA.clamp(Number(input.penetration??input.armorPen)||0,0,1),knockback:OA.clamp(Number(input.knockback)||0,0,OA.COMBAT_LIMITS.maxKnockback),hitPosition:input.hitPosition||null,hitDirection:input.hitDirection||null,timestamp:Number(input.timestamp)||0,tags:[...new Set(input.tags||[])],dot:Boolean(input.dot),ignoreArmor:Boolean(input.ignoreArmor),ignoreInvulnerability:Boolean(input.ignoreInvulnerability),sameSourceHitCooldown:Number(input.sameSourceHitCooldown??OA.COMBAT_LIMITS.sameSourceHitCooldown)};
    }
    apply(world,target,input={}){
      const packet=this.packet(input),source=input.source||world?.fighters?.find((fighter)=>fighter.id===packet.ownerId||fighter.id===packet.sourceId)||null,result={dealt:0,absorbed:0,blocked:0,immune:false,killed:false,packet};
      if(!world||!target||!target.alive||target.isDead||target.deathHandled)return result;
      if(source&&source!==target&&!world.teamSystem?.isHostile(world,source,target))return this.reject(world,target,source,result,"ALIADO");
      if(!packet.ignoreInvulnerability&&(target.invulnerabilityTimer>0||target.status?.phased>0))return this.reject(world,target,source,result,"IMUNE");
      target.hitsThisFrame=(target.hitsThisFrame||0)+1;if(target.hitsThisFrame>OA.COMBAT_LIMITS.maxHitsPerFrame)return this.reject(world,target,source,result);
      const key=[packet.sourceId,packet.abilityId,packet.weaponId,packet.projectileId,packet.damageType].filter(Boolean).join(":")||"unknown",now=world.time||packet.timestamp||0,last=target.hitRegistry?.get(key);
      if(!packet.dot&&last!==undefined&&now-last<packet.sameSourceHitCooldown)return this.reject(world,target,source,result);
      target.hitRegistry?.set(key,now);for(const [entry,time] of target.hitRegistry||[])if(now-time>8)target.hitRegistry.delete(entry);
      if((target.damageImmunityBySource?.get(key)||0)>now)return this.reject(world,target,source,result,"IMUNE");
      const cap=packet.tags.includes("execute")||packet.sourceId==="debug-ko"?Infinity:packet.tags.includes("ultimate")?OA.COMBAT_LIMITS.maxUltimateHit:OA.COMBAT_LIMITS.maxHit;let damage=Math.min(cap,packet.baseDamage);if(packet.dot)damage=Math.min(damage,OA.COMBAT_LIMITS.maxDps*.5);
      if(target.shield>0){result.absorbed=Math.min(target.shield,damage);target.shield=Math.max(0,target.shield-result.absorbed);damage-=result.absorbed;target.telemetry.blockedDamage=(target.telemetry.blockedDamage||0)+result.absorbed;}
      const armor=packet.ignoreArmor?0:Math.max(0,(target.armor||0)*(1-packet.penetration)),armorReduction=armor/(100+armor),typed=OA.clamp(typeof target.resistance==="object"?(target.resistance[packet.damageType]||0):(target.resistance||0),-.5,.75),reduction=OA.clamp((target.damageReduction||0)+(target.weaponGuard||0),0,.82);
      damage=Math.max(0,damage*(1-armorReduction)*(1-typed)*(1-reduction));packet.finalDamage=damage;result.blocked=Math.max(0,packet.baseDamage-damage-result.absorbed);result.dealt=Math.min(target.currentHealth,damage);
      target.currentHealth-=result.dealt;target.lastDamageTime=now;target.lastDamagePacket={...packet,finalDamage:result.dealt,blocked:result.blocked,absorbed:result.absorbed};target.invulnerabilityTimer=packet.dot?0:.045;target.deform.flash=OA.clamp(result.dealt/22,.18,1);
      if(result.dealt>0){target.telemetry.damageTaken=(target.telemetry.damageTaken||0)+result.dealt;if(source){source.telemetry.damageDealt=(source.telemetry.damageDealt||0)+result.dealt;world.teamSystem?.recordDamage(world,source,target,result.dealt);}this.feedback(world,target,source,result);if(packet.knockback&&packet.hitDirection)target.applyImpulse(packet.hitDirection.x*packet.knockback,packet.hitDirection.y*packet.knockback);}else if(result.absorbed>0)this.feedback(world,target,source,result,"ESCUDO");
      if(target.currentHealth<=0&&target.resurrectionReady&&!target.resurrectionUsed){target.resurrectionUsed=true;target.resurrectionReady=false;target.currentHealth=target.maxHealth*.3;target.invulnerabilityTimer=.8;this.particles?.emitTyped?.("resurrection",target.x,target.y,target.color,22,"heal");return result;}
      if(target.currentHealth<=0){target.currentHealth=0;target.alive=false;target.isDead=true;if(!target.deathHandled){target.deathHandled=true;result.killed=true;this.particles?.emitDeath(target.x,target.y,target.color);this.audio?.impact?.(800,900);world.camera?.shake?.add?.(.9,.45,34,"critical");world.teamSystem?.recordElimination(world,target,source,{abilityId:packet.abilityId,weaponId:packet.weaponId,source:packet.sourceType,critical:packet.critical});world.events.push({type:"death",fighter:source,target,packet});}}
      return result;
    }
    reject(world,target,source,result,label){result.immune=true;if(label)this.feedback(world,target,source,result,label);return result;}
    feedback(world,target,source,result,label){const packet=result.packet;if(label||result.absorbed>0)this.particles?.emitText(target.x,target.y-target.radius-16,label||`ESCUDO ${Math.ceil(result.absorbed)}`,label==="IMUNE"?"#dff8ff":"#75dfff",false);if(result.dealt>0){this.particles?.emitDamage(target.x,target.y-target.radius,result.dealt,packet.critical,source?.color||"#fff");this.particles?.emitTyped?.(packet.dot?"status-tick":packet.critical?"critical":"contact-flash",target.x,target.y,source?.color||"#fff",packet.critical?18:9,packet.damageType);this.audio?.impact?.(Math.max(80,result.dealt*20),result.dealt*12);world.events.push({type:"damage",fighter:source,target,damage:result.dealt,critical:packet.critical,source:packet.sourceType,abilityId:packet.abilityId,packet});this.logger?.logDamage?.(world.time,source||target,target,result.dealt,packet.critical,packet.sourceType,packet.abilityId);}target.deform.amount=Math.max(target.deform.amount,result.dealt>18?.38:.15);}
  }
  OA.DamageSystem=DamageSystem;OA.applyDamage=(world,target,packet)=>world.damageSystem.apply(world,target,packet);
}());
