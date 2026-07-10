(function () {
  "use strict";
  const OA = window.OrbArena, limits = () => OA.DAMAGE_LIMITS;
  class BurstProtectionSystem {
    initialize(fighter) {
      fighter.burstProtection = { active:0, cooldown:0, window:[], lastSource:Object.create(null), sameFrameTime:-1, sameFrameHits:0, lastDamageAt:-99, secondChance:false };
      Object.assign(fighter.telemetry, { burstProtectionActivations:0, damagePrevented:0, shieldGenerated:0, recoveryHealing:0, minFps:60, powerUpsCollected:0, particlesEmitted:0, peakParticles:0, suddenDeathTime:0 });
    }
    phaseScale(world) { if (world.suddenDeath) return Math.min(1.32,1.04+(world.time-world.pacing.suddenDeathAt)*.008); if(world.battlePhase==="opening") return .78; if(world.battlePhase==="escalation") return .9; return 1; }
    limit(world, attacker, target, raw, meta = {}) {
      const config=limits(), state=target.burstProtection; if(!state) return raw;
      const now=world.time, source=meta.source||"ability", id=`${attacker?.id||"env"}:${meta.abilityId||source}`; meta._sourceKey=id;
      state.window=state.window.filter((hit)=>now-hit.time<=config.burstWindow);
      if(state.sameFrameTime===now) state.sameFrameHits+=1; else { state.sameFrameTime=now; state.sameFrameHits=1; }
      let cap=target.maxHealth*config.maxSingleHitPercent;
      if(source==="collision") cap=Math.min(cap,target.maxHealth*config.collisionDamageCap);
      if(source==="projectile"||source==="weapon") cap=Math.min(cap,target.maxHealth*config.projectileDamageCap);
      if(source==="ability") cap=Math.min(cap,target.maxHealth*(meta.ultimate?config.ultimateDamageCap:config.abilityDamageCap));
      let damage=Math.min(raw,cap)*this.phaseScale(world)*(world.pacing?.damageScale||1);
      const last=state.lastSource[id], repeat=state.window.filter((hit)=>hit.id===id).length;
      if(last!==undefined&&now-last<config.sameSourceHitCooldown) damage*=config.repeatedHitReduction;
      if(repeat) damage*=Math.pow(config.repeatedHitReduction,Math.min(4,repeat));
      if(state.sameFrameHits>1) damage*=Math.pow(.72,state.sameFrameHits-1);
      if(attacker?.combo?.count>3) damage*=Math.max(.62,1-(attacker.combo.count-3)*config.comboDamageDecay);
      const recent=state.window.reduce((sum,hit)=>sum+hit.damage,0), burstCap=target.maxHealth*config.maxBurstWindowPercent;
      if(recent+damage>burstCap) damage=Math.max(damage*.35,burstCap-recent);
      if(state.active>0&&world.physics.id!=="chaotic") damage*=1-config.burstReduction;
      target.telemetry.damagePrevented+=Math.max(0,raw-damage); state.lastSource[id]=now; return Math.max(0,damage);
    }
    record(world,target,damage,meta={}) {
      const state=target.burstProtection; if(!state||damage<=0) return; state.lastDamageAt=world.time;
      state.window.push({time:world.time,damage,id:meta._sourceKey||meta.abilityId||meta.source||"damage"});
      const total=state.window.reduce((sum,hit)=>sum+hit.damage,0);
      if(world.physics.id!=="chaotic"&&total>=target.maxHealth*.25&&state.cooldown<=0){state.active=limits().burstDuration;state.cooldown=limits().burstCooldown;target.telemetry.burstProtectionActivations+=1;target.deform.flash=1;world.events.push({type:"burstProtection",fighter:target});}
    }
    update(world,dt) {
      for(const fighter of OA.getFighters(world)) {
        const state=fighter.burstProtection; if(!state) continue;
        state.active=Math.max(0,state.active-dt); state.cooldown=Math.max(0,state.cooldown-dt); state.window=state.window.filter((hit)=>world.time-hit.time<=limits().burstWindow);
        if(fighter.alive&&world.time-state.lastDamageAt>5&&fighter.healthRatio()<.7){const recovered=fighter.heal(fighter.maxHealth*.0075*dt);fighter.telemetry.recoveryHealing+=recovered;}
        if(fighter.alive&&fighter.healthRatio()<=.2&&!state.secondChance&&!world.rules?.hardcore){
          state.secondChance=true; const profile=fighter.ai.profile||"Estratégico";
          if(["Tanque","Defensivo","Cauteloso"].includes(profile)){const shield=fighter.addShield(fighter.maxHealth*.16);fighter.telemetry.shieldGenerated+=shield;}
          else if(["Assassino","Fugitivo","Oportunista"].includes(profile)){fighter.invulnerability=Math.max(fighter.invulnerability,.3);const target=OA.findTarget(world,fighter),away=OA.Vector.normalize(fighter.x-(target?.x||world.arena.centerX),fighter.y-(target?.y||world.arena.centerY));fighter.applyImpulse(away.x*360,away.y*360,{ignoreResistance:true});}
          else {for(const id of Object.keys(fighter.abilityCooldowns)) fighter.abilityCooldowns[id]*=.72; fighter.heal(fighter.maxHealth*.07);}
          for(const status of ["stunned","frozen","silenced","prison","confused"]) fighter.status[status]=0;
          world.events.push({type:"secondChance",fighter});
        }
        if(world.suddenDeath) fighter.telemetry.suddenDeathTime+=dt;
      }
    }
  }
  OA.BurstProtectionSystem=BurstProtectionSystem;
}());
