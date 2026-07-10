(function () {
  "use strict";
  const OA = window.OrbArena;

  class AbilitySystem {
    constructor(random, projectiles, combat, particles, audio, logger) {
      this.random = random;
      this.projectiles = projectiles;
      this.combat = combat;
      this.particles = particles;
      this.audio = audio;
      this.logger = logger;
    }

    assign(fighter, weapon, requested = null) {
      const active = OA.ABILITIES.filter((ability) => ability.type === "active");
      const preferred = weapon.kind === "projectile" ? ["ofensivo", "controle", "movimento"] : ["impacto", "movimento", "defesa"];
      const requestedIds = requested && typeof requested === "object" ? [requested.active, requested.secondary, requested.tertiary, requested.quaternary, requested.passive, requested.ultimate].filter(Boolean) : [];
      const selected = requestedIds.map((id) => OA.abilityById(id)).filter((ability) => ability && ability.type === "active").slice(0, 4);
      for (const category of preferred) {
        const pool = active.filter((ability) => ability.category === category && !selected.includes(ability));
        if (pool.length) selected.push(this.random.pick(pool));
      }
      while (selected.length < 4) {
        const ability = this.random.pick(active);
        if (!selected.includes(ability)) selected.push(ability);
      }
      fighter.abilities = selected.slice(0, 4);
      fighter.reactiveAbility = OA.abilityById(requested?.reactive) || this.random.pick(OA.ABILITIES.filter((ability) => ability.type === "reactive"));
      for (const ability of [...fighter.abilities, fighter.reactiveAbility]) fighter.abilityCooldowns[ability.id] = this.random.range(0.5, 2.4);
      fighter.ai.abilityDecision = this.random.range(0.35, 1.1);
      return fighter.abilities;
    }

    update(world, dt) {
      this.updateScheduled(world, dt);
      this.updateZones(world, dt);
      this.updateEffects(world, dt);
      OA.CinematicAbilitySystem?.update(world,dt,this);
      for (const fighter of OA.getFighters(world)) {
        const abilityDt = dt * (world.timeScales?.ability[fighter.team] || 1);
        fighter.damageReduction = fighter.status.damageReduction > 0 ? (fighter.statusPower.damageReduction || 0.5) : 0;
        this.updateBurn(world, fighter, dt);
        if (!fighter.alive || fighter.ai.disabled || fighter.stunTimer > 0 || fighter.status.silenced > 0) continue;
        fighter.ai.abilityDecision -= abilityDt;
        if (fighter.ai.abilityDecision > 0) continue;
        fighter.ai.abilityDecision = this.random.range(0.22, 0.58);
        const target = OA.findTarget(world, fighter);
        if (!target) continue;
        const ready = fighter.abilities.filter((ability) => (!world.controlSystem || world.controlSystem.canAutoCast(fighter, ability)) && (!world.controlSystem || world.controlSystem.available(fighter, ability)) && (fighter.abilityCooldowns[ability.id] || 0) <= 0 && this.isUseful(ability, fighter, target));
        if (ready.length && this.random.chance(0.72)) this.use(world, fighter, target, this.pickByUtility(ready, fighter, target));
      }
    }

    isUseful(ability, fighter, target) {
      const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      if (ability.category === "defesa" && fighter.healthRatio() > 0.78 && !["damage-speed", "impact-heal", "spikes"].includes(ability.id)) return false;
      if (ability.range && distance > ability.range * 1.35 && !["gravity-field", "black-hole", "orbital-beam"].includes(ability.id)) return false;
      if (["radialBlast", "seismic", "radialRepulse", "fireBlast"].includes(ability.effect) && distance > ability.range) return false;
      return true;
    }

    pickByUtility(abilities, fighter, target) {
      const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      const weighted = abilities.map((ability) => {
        let score = this.random.range(0, 1);
        if (fighter.healthRatio() < 0.45 && ability.category === "defesa") score += 2;
        if (distance < 140 && ability.category === "impacto") score += 1.4;
        if (distance > 250 && ability.category === "movimento") score += 1;
        return { ability, score };
      });
      weighted.sort((a, b) => b.score - a.score);
      return weighted[0].ability;
    }

    use(world, actor, target, ability, reactive = false) {
      if (!ability || !actor.alive || (!reactive && actor.status.silenced > 0)) return false;
      if (!reactive && actor.status.prison > 0 && (ability.category === "movimento" || ["dash", "multiDash", "teleportToward", "teleportRandom", "phaseThrough", "ghostDash", "chainTeleport", "swapPosition"].includes(ability.effect))) return false;
      if ((actor.abilityCooldowns[ability.id] || 0) > 0) return false;
      const chargeState = !reactive ? actor.abilityState?.[ability.id] : null;
      if (chargeState && chargeState.charges <= 0) return false;
      const cooldownScale = world.intensity > 1 ? 1 + (world.intensity - 1) * 0.22 : 1;
      actor.abilityCooldowns[ability.id] = chargeState?.maxCharges > 1 && chargeState.charges > 1 ? 0.18 : ability.cooldown / cooldownScale;
      if (chargeState) {
        chargeState.charges = Math.max(0, chargeState.charges - 1);
        if (!chargeState.rechargeTimer) chargeState.rechargeTimer = chargeState.recharge / cooldownScale;
      }
      actor.lastAbility = ability;
      actor.telemetry.abilitiesUsed += 1;
      if(ability.cooldown>=13)actor.telemetry.ultimatesUsed=(actor.telemetry.ultimatesUsed||0)+1;
      this.logger.logAbility(world.time, actor, ability);
      this.audio.ability(ability.category, ability.power);
      this.particles.emitAbility(actor.x, actor.y, ability.color, ability.category);
      this.particles.emitText(actor.x, actor.y - actor.radius - 22, ability.name.toUpperCase(), ability.color, false);
      world.presentationSystem?.activate(world,actor,target,ability);
      this.execute(world, actor, target, ability);
      world.events.push({ type: "ability", fighter: actor, target, ability: ability.id });
      if (ability.cooldown >= 13) world.events.push({ type: "ultimate", fighter: actor, target, ability: ability.id });
      return true;
    }

    execute(world, actor, target, ability) {
      const effect = ability.effect;
      const p = ability.params;
      const direction = OA.Vector.normalize(target.x - actor.x, target.y - actor.y);
      const bounds = this.bounds(world, actor.radius);
      if(effect==="cinematic")return OA.CinematicAbilitySystem.execute(world,actor,target,ability,this);
      switch (effect) {
        case "dash": this.impulse(actor, direction, ability.power); break;
        case "multiDash": for (let i = 0; i < p.count; i += 1) this.schedule(world, i * p.interval, () => this.impulse(actor, OA.Vector.normalize(target.x - actor.x, target.y - actor.y), ability.power)); break;
        case "teleportToward": this.teleport(actor, actor.x + direction.x * ability.power, actor.y + direction.y * ability.power, bounds); break;
        case "teleportRandom": this.teleport(actor, this.random.range(bounds.left, bounds.right), this.random.range(bounds.top, bounds.bottom), bounds); break;
        case "chargedRush": actor.nextImpactMultiplier = 1.7; actor.setStatus("ram", 1.2, p.mass); actor.mass = actor.baseMass * 1.45; this.impulse(actor, direction, ability.power); break;
        case "phaseThrough": this.teleport(actor, target.x + direction.x * ability.power, target.y + direction.y * ability.power, bounds); actor.setStatus("phased", 0.45); break;
        case "progressiveHaste": actor.setStatus("haste", p.duration, ability.power); actor.speedTrailTimer = p.duration; break;
        case "superBounce": actor.setStatus("superBounce", p.duration, ability.power); actor.wallBoostTimer = Math.max(actor.wallBoostTimer, 1); break;
        case "ghostDash": actor.setStatus("phased", 0.7); this.impulse(actor, direction, ability.power); break;
        case "orbitalRun": { const tangent = { x: -direction.y * actor.ai.orbit, y: direction.x * actor.ai.orbit }; actor.setStatus("orbitalRun", 2.8, 1); this.impulse(actor, tangent, ability.power); break; }
        case "radialBlast": this.radial(world, actor, target, ability.range, ability.power, p.knockback, ability.id); break;
        case "seismic": if (this.radial(world, actor, target, ability.range, ability.power, p.knockback, ability.id)) target.setStatus("stunned", p.stun); break;
        case "primeImpact": actor.nextImpactMultiplier = Math.max(actor.nextImpactMultiplier, ability.power); actor._impactExplosion = p.explosion; break;
        case "ram": actor.setStatus("ram", p.duration, p.mass); actor.mass = actor.baseMass * (1 + p.mass); actor.nextImpactMultiplier = 1.5; this.impulse(actor, direction, ability.power); break;
        case "nuclearPrime": actor.nextImpactMultiplier = ability.power; actor._impactExplosion = p.explosion; actor.applyDamage(p.selfDamage, { source: "ability", ignoreArmor: true }); break;
        case "gravityPunch": target.applyImpulse(-direction.x * p.pull, -direction.y * p.pull); this.schedule(world, 0.3, () => this.radial(world, actor, target, ability.range, ability.power, p.knockback, ability.id)); break;
        case "piercingCharge": actor.nextImpactMultiplier = 1.45; actor._impactArmorPen = 0.65; this.impulse(actor, direction, ability.power); break;
        case "contactAura": actor.setStatus("contactAura", p.duration, ability.power); break;
        case "counterGuard": actor.setStatus("counterGuard", 3.5, 1); actor.addShield(14); break;
        case "primeWall": actor._primeWall = true; break;
        case "spawnZone": this.spawnZone(world, actor, target, ability); break;
        case "radialRepulse": this.radial(world, actor, target, ability.range, 0, ability.power, ability.id); break;
        case "directPull": target.applyImpulse(-direction.x * ability.power, -direction.y * ability.power); break;
        case "prison": target.setStatus("prison", p.duration, ability.power); target.vx *= 0.45; target.vy *= 0.45; break;
        case "statusTarget": target.setStatus(p.status, p.duration, ability.power); break;
        case "confuse": target.setStatus("confused", p.duration, 1); target.ai.orbit *= -1; break;
        case "shield": actor.addShield(ability.power); break;
        case "reflect": actor.setStatus("reflecting", p.duration, ability.power); break;
        case "invulnerable": actor.invulnerability = Math.max(actor.invulnerability, p.duration); break;
        case "damageReduction": actor.setStatus("damageReduction", p.duration, ability.power); break;
        case "damageToSpeed": actor.setStatus("damageToSpeed", p.duration, ability.power); break;
        case "impactHeal": actor.setStatus("impactHeal", p.duration, ability.power); break;
        case "adaptiveArmor": actor.setStatus("adaptiveArmor", p.duration, ability.power); actor.armor += ability.power * 0.35; break;
        case "phase": actor.setStatus("phased", p.duration, 1); break;
        case "antiProjectile": actor.setStatus("antiProjectile", p.duration, ability.power); break;
        case "resurrection": actor.resurrectionReady = true; break;
        case "abilityProjectile": this.fireAbilityProjectiles(world, actor, target, ability); break;
        case "projectileRain": this.projectileRain(world, actor, target, ability); break;
        case "chainLightning": { this.combat.dealDamage(world, actor, target, ability.power, { source: "ability", abilityId: ability.id }); target.vx *= 0.72; target.vy *= 0.72; this.particles.emitLightning(actor.x, actor.y, target.x, target.y, ability.color); break; }
        case "fireBlast": if (this.radial(world, actor, target, ability.range, ability.power, 150, ability.id)) target.burn = { source: actor, timer: p.burn, tick: 0, damage: 2.1 }; break;
        case "spikeArmor": actor.setStatus("spikeArmor", p.duration, ability.power); break;
        case "drones": world.effects.push({ type: "drone", owner: actor, life: p.duration, count: p.count, angle: 0, tick: 0, color: ability.color, damage: ability.power }); break;
        case "orbitBlades": this.addOrbitals(world, actor, p.count, p.duration, ability.range, ability.power, ability.color, "blade"); break;
        case "orbitalBeam": { const x = target.x; const y = target.y; world.effects.push({ type: "marker", owner: actor, x, y, life: 0.75, maxLife: 0.75, color: ability.color }); this.schedule(world, 0.75, () => this.blastPoint(world, actor, target, x, y, 72, ability.power, ability.id)); break; }
        case "swapPosition": { const x = actor.x; const y = actor.y; actor.x = target.x; actor.y = target.y; target.x = x; target.y = y; break; }
        case "swapVelocity": { const vx = actor.vx; const vy = actor.vy; actor.vx = target.vx; actor.vy = target.vy; target.vx = vx; target.vy = vy; break; }
        case "clone": world.effects.push({ type: "clone", owner: actor, x: actor.x, y: actor.y, angle: 0, life: p.duration, color: actor.color }); break;
        case "duplicateShots": actor.setStatus("duplicateShots", p.duration, ability.power); break;
        case "splitOrbit": this.addOrbitals(world, actor, p.count, p.duration, ability.range, ability.power, ability.color, "fragment"); break;
        case "stealAbility": { const stolen = this.random.pick(target.abilities.filter((entry) => entry.id !== ability.id)); if (stolen) this.execute(world, actor, target, stolen); break; }
        case "stealSpeed": { const stolen = target.currentSpeed() * ability.power; target.vx *= 1 - ability.power; target.vy *= 1 - ability.power; this.impulse(actor, direction, stolen); break; }
        case "invertGravity": world.arena.gravitySign *= -1; world.arena.gravityTimer = p.duration; break;
        case "rotateArena": world.arena.rotationForce = ability.power * actor.ai.orbit; world.arena.rotationTimer = p.duration; break;
        case "chainTeleport": for (let i = 0; i < p.count; i += 1) this.schedule(world, i * 0.16, () => { const oldX = actor.x; const oldY = actor.y; this.teleport(actor, this.random.range(bounds.left, bounds.right), this.random.range(bounds.top, bounds.bottom), bounds); this.blastPoint(world, actor, target, oldX, oldY, 58, 6, ability.id); }); break;
        case "reactWallDash": this.impulse(actor, direction, ability.power); break;
        case "reactCriticalShield": actor.addShield(ability.power); break;
        case "reactHealthHaste": actor.setStatus("haste", 4, ability.power); break;
        case "reactLastDash": actor.invulnerability = 0.35; this.impulse(actor, direction, ability.power); break;
        case "reactComboNova": this.radial(world, actor, target, ability.range, ability.power, 190, ability.id); break;
        case "reactBounceStorm": this.radialProjectiles(world, actor, 10, ability.power, ability.color, ability.id); break;
        case "reactUnstuck": this.teleport(actor, actor.x + this.random.range(-80, 80), actor.y + this.random.range(-80, 80), bounds); this.impulse(actor, direction, ability.power); break;
        case "reactBlockPulse": this.radial(world, actor, target, ability.range, 0, ability.power, ability.id); break;
        case "reactAbilityEcho": for (const id of Object.keys(actor.abilityCooldowns)) actor.abilityCooldowns[id] *= 1 - ability.power; break;
        case "reactCollisionReset": { const oldest = Object.entries(actor.abilityCooldowns).sort((a, b) => b[1] - a[1])[0]; if (oldest) actor.abilityCooldowns[oldest[0]] = 0; break; }
        case "pulseBreak": this.radial(world,actor,target,ability.range,ability.power,p.knockback,ability.id);for(const projectile of this.projectiles.pool)if(projectile.active&&projectile.team!==actor.team&&Math.hypot(projectile.x-actor.x,projectile.y-actor.y)<ability.range)projectile.active=false;break;
        case "venomTrail": for(let i=0;i<5;i++)this.schedule(world,i*.28,()=>{world.characterZones.push({owner:actor,kind:"poison",x:actor.x,y:actor.y,radius:ability.range,life:p.duration,maxLife:p.duration,tick:0,power:ability.power,color:ability.color,data:{interval:.55}});});break;
        case "spikeBloom": actor.setStatus("spikeArmor",p.duration,ability.power);this.radial(world,actor,target,ability.range,ability.power*.55,260,ability.id);break;
        case "timeDrag": world.zones.push({owner:actor,kind:"timeDrag",x:target.x,y:target.y,radius:ability.range,life:p.duration,maxLife:p.duration,tick:0,power:ability.power,color:ability.color});break;
        case "gravityCrush": world.zones.push({owner:actor,kind:"gravityCrush",x:target.x,y:target.y,radius:ability.range,life:p.duration,maxLife:p.duration,tick:.4,power:340,color:ability.color});this.schedule(world,p.duration,()=>this.blastPoint(world,actor,target,target.x,target.y,ability.range*.7,ability.power,ability.id));break;
        case "mirrorClone": if(!actor._mirrorCloneLock){actor._mirrorCloneLock=p.duration;this.summonSystem?.spawn(world,actor,{kind:"mirror-clone",life:p.duration,health:actor.maxHealth*.22,damage:actor.damage*.55,scale:.72,limit:1});}break;
        case "shieldBurst": actor.addShield(ability.power);world.effects.push({type:"shieldBurst",owner:actor,life:10,maxLife:10,lastShield:actor.shield,damage:p.damage,radius:ability.range,color:ability.color});break;
        case "arcChain": {const enemies=world.teamSystem.enemies(world,actor).slice(0,p.jumps);let previous=actor;enemies.forEach((enemy,index)=>{const amount=ability.power*Math.pow(.72,index);this.combat.dealDamage(world,actor,enemy,amount,{source:"ability",abilityId:ability.id,damageType:"electric"});this.particles.emitLightning(previous.x,previous.y,enemy.x,enemy.y,ability.color);previous=enemy;});break;}
        case "frostLock": target._frostMarks=(target._frostMarks||0)+1;this.combat.dealDamage(world,actor,target,ability.power,{source:"ability",abilityId:ability.id,damageType:"ice",noRandomCrit:true});if(target._frostMarks>=p.marks){target._frostMarks=0;target.setStatus("frozen",.9,1);this.particles.emitTyped?.("ice-shard",target.x,target.y,ability.color,16,"frost");}break;
        case "meteorDash": actor._meteorDash={damage:p.damage,abilityId:ability.id,timer:1.2};actor.setStatus("ram",1.2,.35);actor.nextImpactMultiplier=1.45;this.impulse(actor,direction,ability.power);break;
        case "voidField": world.zones.push({owner:actor,kind:"voidField",x:target.x,y:target.y,radius:ability.range,life:p.duration,maxLife:p.duration,tick:.1,power:ability.power,color:ability.color});break;
        case "sonicRing": this.radial(world,actor,target,ability.range,ability.power,p.knockback,ability.id);world.effects.push({type:"sonicRing",owner:actor,x:actor.x,y:actor.y,life:.75,maxLife:.75,radius:ability.range,color:ability.color});break;
        case "healingOrbit": world.effects.push({type:"healingOrbit",owner:actor,life:p.duration,maxLife:p.duration,count:p.count,tick:0,angle:0,power:ability.power,color:ability.color});break;
        case "chronoRewind": {const snapshot={x:actor.x,y:actor.y,health:actor.health,vx:actor.vx,vy:actor.vy};world.effects.push({type:"chronoGhost",owner:actor,x:snapshot.x,y:snapshot.y,life:p.delay,maxLife:p.delay,color:ability.color});this.schedule(world,p.delay,()=>{if(!actor.alive)return;actor.x=snapshot.x;actor.y=snapshot.y;actor.vx=snapshot.vx;actor.vy=snapshot.vy;actor.heal(Math.min(actor.maxHealth*.22,Math.max(0,snapshot.health-actor.health)));});break;}
        case "wallDetonation": actor._wallDetonation={armed:false,timer:p.duration,damage:ability.power,radius:ability.range};break;
        default: throw new Error(`Efeito de habilidade desconhecido: ${effect}`);
      }
    }

    processEvents(world, events) {
      for (const event of events) {
        const actor = event.fighter;
        if (!actor) continue;
        if (event.type === "collision" && actor._impactExplosion) {
          const damage = actor._impactExplosion;
          actor._impactExplosion = 0;
          this.radial(world, actor, event.target, 135, damage, 280, "impact-explosion");
        }
        if (event.type === "collision" && actor.status.contactAura > 0) this.radial(world, actor, event.target, 105, actor.statusPower.contactAura || 12, 160, "contact-aura");
        if(event.type==="collision"&&actor._meteorDash){this.radial(world,actor,event.target,135,actor._meteorDash.damage,360,actor._meteorDash.abilityId);world.characterZones.push({owner:actor,kind:"fire",x:event.x||actor.x,y:event.y||actor.y,radius:55,life:4,maxLife:4,tick:0,power:2.6,color:"#ff7652",data:{interval:.5}});actor._meteorDash=null;}
        if(event.type==="wall"&&actor._wallDetonation){if(!actor._wallDetonation.armed){actor._wallDetonation.armed=true;actor._wallDetonation.x=actor.x;actor._wallDetonation.y=actor.y;}else{const mark=actor._wallDetonation;this.blastPoint(world,actor,event.target||OA.findTarget(world,actor),mark.x,mark.y,mark.radius,mark.damage,"wall-detonation");actor._wallDetonation=null;}}
        const reactive = actor.reactiveAbility;
        if (reactive?.params.trigger === event.type && (actor.abilityCooldowns[reactive.id] || 0) <= 0) {
          const target = event.target || event.attacker || OA.findTarget(world, actor);
          if (!target) continue;
          this.use(world, actor, target, reactive, true);
        }
      }
    }

    updateScheduled(world, dt) {
      for (const task of world.scheduled) task.delay -= dt;
      const ready = world.scheduled.filter((task) => task.delay <= 0);
      world.scheduled = world.scheduled.filter((task) => task.delay > 0);
      for (const task of ready) if (!world.finished) task.action();
    }

    updateZones(world, dt) {
      for (const zone of world.zones) {
        zone.life -= dt;
        zone.tick -= dt;
        for (const target of OA.getFighters(world).filter((fighter) => world.teamSystem ? world.teamSystem.isHostile(world, zone.owner, fighter) : fighter !== zone.owner)) {
          const direction = OA.Vector.normalize(zone.x - target.x, zone.y - target.y);
          if (direction.length > zone.radius + target.radius) continue;
          if (zone.kind === "gravity" || zone.kind === "blackHole" || zone.kind === "gravityCrush") {
            const force = zone.power * (1 - direction.length / (zone.radius + target.radius) * 0.45);
            target.applyForce(direction.x * force * target.mass, direction.y * force * target.mass);
          }
          if (zone.kind === "blackHole" && zone.tick <= 0) { zone.tick = 0.4; this.combat.dealDamage(world, zone.owner, target, 3.2, { source: "ability", abilityId: "black-hole", noRandomCrit: true }); }
          if(zone.kind==="gravityCrush"&&zone.tick<=0){zone.tick=.4;this.combat.dealDamage(world,zone.owner,target,Math.min(8,2+(zone.maxLife-zone.life)*1.6),{source:"ability",abilityId:"gravity-crush",noRandomCrit:true,damageType:"gravity",dot:true});}
          if(zone.kind==="timeDrag"){target.setStatus("slow",.18,zone.power);target.attackTimer=Math.max(target.attackTimer,.08);for(const projectile of this.projectiles.pool)if(projectile.active&&projectile.team===target.team&&Math.hypot(projectile.x-zone.x,projectile.y-zone.y)<zone.radius){projectile.vx*=.985;projectile.vy*=.985;}}
          if(zone.kind==="voidField"){target.setStatus("silenced",.16,1);if(zone.tick<=0){zone.tick=.6;this.combat.dealDamage(world,zone.owner,target,zone.power,{source:"ability",abilityId:"void-field",noRandomCrit:true,damageType:"void",dot:true});}for(const projectile of this.projectiles.pool)if(projectile.active&&projectile.team!==zone.owner.team&&Math.hypot(projectile.x-zone.x,projectile.y-zone.y)<zone.radius&&projectile.damage<16)projectile.active=false;}
          if (zone.kind === "slow") target.setStatus("slow", 0.15, zone.power);
          if (zone.kind === "silence") target.setStatus("silenced", 0.15, 1);
        }
      }
      world.zones = world.zones.filter((zone) => zone.life > 0);
    }

    updateEffects(world, dt) {
      for (const effect of world.effects) {
        effect.life -= dt;
        effect.angle = (effect.angle || 0) + dt * 3.2;
        if (effect.type === "clone") { effect.x = effect.owner.x + Math.cos(effect.angle * 1.7) * 72; effect.y = effect.owner.y + Math.sin(effect.angle * 2.1) * 52; }
        if(effect.type==="shieldBurst"&&effect.owner.alive){if(effect.lastShield>0&&effect.owner.shield<=0){const target=OA.findTarget(world,effect.owner);if(target)this.radial(world,effect.owner,target,effect.radius,effect.damage,320,"shield-burst");effect.life=0;}effect.lastShield=effect.owner.shield;}
        if(effect.type==="healingOrbit"&&effect.owner.alive){effect.tick-=dt;if(effect.tick<=0&&effect.count>0&&effect.owner.healthRatio()<.82){effect.tick=1.2;effect.owner.heal(effect.power);effect.count-=1;this.particles.emitTyped?.("heal-mote",effect.owner.x,effect.owner.y,effect.color,10,"heal");}}
        if(effect.owner?._mirrorCloneLock)effect.owner._mirrorCloneLock=Math.max(0,effect.owner._mirrorCloneLock-dt);
        if (effect.type === "drone") {
          effect.tick -= dt;
          if (effect.tick <= 0 && effect.owner.alive) {
            effect.tick = 0.62;
            const target = OA.findTarget(world, effect.owner);
            if (!target) continue;
            const direction = OA.Vector.normalize(target.x - effect.owner.x, target.y - effect.owner.y);
            this.projectiles.spawn({ owner: effect.owner, source: "ability", abilityId: "drones", kind: "drone", x: effect.owner.x + direction.y * 34, y: effect.owner.y - direction.x * 34, vx: direction.x * 520, vy: direction.y * 520, radius: 3, damage: effect.damage, knockback: 55, life: 2, color: effect.color });
          }
        }
        if (effect.type === "orbital" && effect.owner.alive) {
          effect.hitCooldown = Math.max(0, effect.hitCooldown - dt);
          effect.x = effect.owner.x + Math.cos(effect.angle + effect.phase) * effect.radius;
          effect.y = effect.owner.y + Math.sin(effect.angle + effect.phase) * effect.radius;
          const target = OA.findTarget(world, effect.owner);
          if (!target) continue;
          if (effect.hitCooldown <= 0 && Math.hypot(target.x - effect.x, target.y - effect.y) < target.radius + 8) {
            effect.hitCooldown = 0.42;
            this.combat.dealDamage(world, effect.owner, target, effect.damage, { source: "ability", abilityId: "orbitals" });
            const direction = OA.Vector.normalize(target.x - effect.x, target.y - effect.y);
            target.applyImpulse(direction.x * 85, direction.y * 85);
          }
        }
      }
      world.effects = world.effects.filter((effect) => effect.life > 0);
    }

    updateBurn(world, fighter, dt) {
      if (!fighter.burn || fighter.burn.timer <= 0) return;
      fighter.burn.timer -= dt;
      fighter.burn.tick -= dt;
      if (fighter.burn.tick <= 0) {
        fighter.burn.tick = 0.5;
        this.combat.dealDamage(world, fighter.burn.source, fighter, fighter.burn.damage, { source: "ability", abilityId: "fire-blast", noRandomCrit: true, dot: true });
      }
    }

    radial(world, actor, target, radius, damage, knockback, abilityId) {
      const direction = OA.Vector.normalize(target.x - actor.x, target.y - actor.y);
      if (direction.length > radius + target.radius) return false;
      const falloff = 1 - OA.clamp(direction.length / (radius + target.radius), 0, 0.75) * 0.45;
      if (damage > 0) this.combat.dealDamage(world, actor, target, damage * falloff, { source: "ability", abilityId, noRandomCrit: true });
      if (knockback > 0) target.applyImpulse(direction.x * knockback * falloff, direction.y * knockback * falloff);
      this.particles.emitShockwave(actor.x, actor.y, actor.color, radius / 120);
      return true;
    }

    spawnZone(world, actor, target, ability) {
      const kind = ability.params.zone;
      const atTarget = kind === "blackHole" || kind === "slow" || kind === "silence";
      world.zones.push({ owner: actor, kind, x: atTarget ? target.x : actor.x, y: atTarget ? target.y : actor.y, radius: ability.range, power: ability.power, life: ability.params.duration, maxLife: ability.params.duration, tick: 0, color: ability.color });
    }

    fireAbilityProjectiles(world, actor, target, ability) {
      const count = ability.params.count * (actor.status.duplicateShots > 0 ? 2 : 1);
      for (let i = 0; i < count; i += 1) {
        const base = Math.atan2(target.y - actor.y, target.x - actor.x);
        const angle = base + (i - (count - 1) / 2) * 0.14;
        const direction = OA.Vector.fromAngle(angle);
        const kind = ability.params.projectile;
        const speed = kind === "laser" ? 1280 : kind === "missile" ? 430 : 65;
        const offset = kind === "mine" ? Math.PI * 2 * i / count : angle;
        const vector = kind === "mine" ? OA.Vector.fromAngle(offset) : direction;
        this.projectiles.spawn({ owner: actor, source: "ability", abilityId: ability.id, kind, x: actor.x + vector.x * (actor.radius + 7), y: actor.y + vector.y * (actor.radius + 7), vx: vector.x * speed, vy: vector.y * speed, radius: kind === "mine" ? 8 : kind === "missile" ? 6 : 3, damage: ability.power, knockback: kind === "mine" ? 240 : kind === "missile" ? 130 : 70, life: kind === "mine" ? 5 : 2.5, bounces: kind === "laser" ? 1 : 0, pierce: kind === "laser" ? 1 : 0, homing: kind === "missile" ? 3 : 0, armTimer: kind === "mine" ? 0.55 : 0, color: ability.color });
      }
    }

    projectileRain(world, actor, target, ability) {
      for (let i = 0; i < ability.params.count; i += 1) {
        this.schedule(world, i * 0.08, () => {
          const x = OA.clamp(target.x + this.random.range(-150, 150), 30, 930);
          const y = 24;
          const direction = OA.Vector.normalize(target.x - x, target.y - y);
          this.projectiles.spawn({ owner: actor, source: "ability", abilityId: ability.id, kind: "rain", x, y, vx: direction.x * 610, vy: direction.y * 610, radius: 4, damage: ability.power, knockback: 65, life: 2, color: ability.color });
        });
      }
    }

    radialProjectiles(world, actor, count, damage, color, abilityId) {
      for (let i = 0; i < count; i += 1) {
        const direction = OA.Vector.fromAngle(Math.PI * 2 * i / count);
        this.projectiles.spawn({ owner: actor, source: "ability", abilityId, kind: "storm", x: actor.x, y: actor.y, vx: direction.x * 520, vy: direction.y * 520, radius: 4, damage, knockback: 65, life: 2.2, bounces: 1, color });
      }
    }

    addOrbitals(world, actor, count, duration, radius, damage, color, kind) {
      for (let i = 0; i < count; i += 1) world.effects.push({ type: "orbital", kind, owner: actor, life: duration, angle: 0, phase: Math.PI * 2 * i / count, radius, damage, color, hitCooldown: 0, x: actor.x, y: actor.y });
    }

    blastPoint(world, actor, target, x, y, radius, damage, abilityId) {
      const distance = Math.hypot(target.x - x, target.y - y);
      this.particles.emitShockwave(x, y, actor.color, radius / 70);
      if (distance <= radius + target.radius) {
        this.combat.dealDamage(world, actor, target, damage, { source: "ability", abilityId, noRandomCrit: true });
        const direction = OA.Vector.normalize(target.x - x, target.y - y);
        target.applyImpulse(direction.x * 220, direction.y * 220);
      }
    }

    impulse(actor, direction, magnitude) {
      actor.applyImpulse(direction.x * magnitude * actor.mass, direction.y * magnitude * actor.mass, { ignoreResistance: true });
      actor.speedTrailTimer = Math.max(actor.speedTrailTimer, 0.5);
    }

    teleport(actor, x, y, bounds) {
      this.particles.emitShockwave(actor.x, actor.y, actor.color, 0.5);
      actor.x = OA.clamp(x, bounds.left, bounds.right);
      actor.y = OA.clamp(y, bounds.top, bounds.bottom);
      actor.previousX = actor.x;
      actor.previousY = actor.y;
      this.particles.emitShockwave(actor.x, actor.y, actor.color, 0.7);
    }

    schedule(world, delay, action) { world.scheduled.push({ delay, action }); }

    bounds(world, radius) {
      const padding = world.arena.padding + radius;
      return { left: padding, right: OA.CONFIG.arena.width - padding, top: padding, bottom: OA.CONFIG.arena.height - padding };
    }
  }

  OA.AbilitySystem = AbilitySystem;
}());
