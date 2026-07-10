(function () {
  "use strict";
  const OA = window.OrbArena;

  class CombatSystem {
    constructor(random, particles, audio, logger, burstProtection = null) {
      this.random = random;
      this.particles = particles;
      this.audio = audio;
      this.logger = logger;
      this.burstProtection = burstProtection;
    }

    dealDamage(world, attacker, target, rawDamage, metadata = {}) {
      if (!attacker?.alive || !target?.alive) return 0;
      const source = metadata.source || "ability";
      let critical = Boolean(metadata.critical);
      if (!metadata.noRandomCrit && !critical) critical = this.random.chance(attacker.critChance);
      if (attacker.perkEffects.wallCrit && attacker.wallBoostTimer > 0) critical = true;
      let damage = rawDamage * (critical ? (OA.DAMAGE_LIMITS?.criticalDamageCap||1.42) : 1);
      if (attacker.perkEffects.speedDamage) damage *= 1 + Math.min(0.55, attacker.currentSpeed() / attacker.maxSpeed * attacker.perkEffects.speedDamage);
      if (attacker.status.burning > 0 && attacker.perkEffects.burnAtMax) damage *= 1.12;

      if (target.status.reflecting > 0 && (source === "projectile" || source === "ability")) {
        const reflected = Math.min(rawDamage * 0.55, attacker.maxHealth * 0.18);
        attacker.applyDamage(reflected, { source: "ability", ignoreArmor: false });
        damage *= 0.35;
      }
      damage = this.burstProtection ? this.burstProtection.limit(world, attacker, target, damage, metadata) : damage;
      const blockedBefore = target.telemetry.blockedDamage;
      const dealt = target.applyDamage(damage, metadata);
      if (dealt <= 0) {
        if (target.telemetry.blockedDamage > blockedBefore) world.events.push({ type: "blocked", fighter: target, attacker });
        return 0;
      }
      target._damageTypes||=new Set();target._damageTypes.add(source);
      this.burstProtection?.record(world, target, dealt, metadata);
      attacker.telemetry.damageDealt = (attacker.telemetry.damageDealt || 0) + dealt;
      target.telemetry.damageTaken = (target.telemetry.damageTaken || 0) + dealt;
      world.teamSystem?.recordDamage(world, attacker, target, dealt);

      attacker.telemetry[`${source === "projectile" ? "weapon" : source}Damage`] = (attacker.telemetry[`${source === "projectile" ? "weapon" : source}Damage`] || 0) + dealt;
      this.logger.logDamage(world.time, attacker, target, dealt, critical, source === "projectile" ? "weapon" : source, metadata.abilityId);
      this.particles.emitDamage(target.x, target.y - target.radius, dealt, critical, attacker.color);
      if(metadata.abilityId)world.presentationSystem?.impact(world,attacker,target,metadata.abilityId,critical);
      world.events.push({ type: "damage", fighter: attacker, target, damage: dealt, critical, source, abilityId: metadata.abilityId });
      if (critical) world.events.push({ type: "criticalTaken", fighter: target, attacker, damage: dealt });
      if (critical) this.particles.emitTyped?.("critical", target.x, target.y, attacker.color, 18, "critical");
      if (target.healthRatio() <= 0.5 && !target._halfTriggered) { target._halfTriggered = true; world.events.push({ type: "halfHealth", fighter: target, attacker }); }
      if (target.healthRatio() <= 0.2 && !target._lowTriggered) { target._lowTriggered = true; world.events.push({ type: "lowHealth", fighter: target, attacker }); }
      if (!target.alive) { this.particles.emitDeath(target.x, target.y, target.color); world.camera.shake?.add(.9,.45,34,"critical"); world.teamSystem?.recordElimination(world, target, attacker, { ...metadata, source, critical }); }
      return dealt;
    }

    handleCollision(world, a, b, contact, impact) {
      if (!a.alive || !b.alive || impact.relativeSpeed < 18) return;
      const effectiveMass = impact.effectiveMass;
      const impactEnergy = impact.relativeSpeed * effectiveMass;
      const driveA = impact.driveA || 0;
      const driveB = impact.driveB || 0;
      const attacker = driveA >= driveB ? a : b;
      const target = attacker === a ? b : a;
      const direction = attacker === a ? 1 : -1;
      const settings = world.physics;
      const alreadyHandled = a.contactCooldown > 0 || b.contactCooldown > 0;

      const repulsion = OA.clamp(72 + impactEnergy * 0.62 * settings.repulsion * settings.knockback, 95, 520);
      const impulseAX = -contact.nx * repulsion;
      const impulseAY = -contact.ny * repulsion;
      const impulseBX = contact.nx * repulsion;
      const impulseBY = contact.ny * repulsion;
      const receivedA = a.applyImpulse(impulseAX, impulseAY);
      const receivedB = b.applyImpulse(impulseBX, impulseBY);
      a.telemetry.knockbackCaused += receivedB;
      b.telemetry.knockbackCaused += receivedA;
      a.angularVelocity -= direction * OA.clamp(impact.relativeSpeed / 95, 0.8, 7);
      b.angularVelocity += direction * OA.clamp(impact.relativeSpeed / 95, 0.8, 7);

      if (alreadyHandled) return;
      a.contactCooldown = 0.07;
      b.contactCooldown = 0.07;
      if (world.teamSystem && !world.teamSystem.isHostile(world, a, b)) {
        const hitX = a.x + contact.nx * a.radius, hitY = a.y + contact.ny * a.radius;
        this.particles.emitImpact(hitX, hitY, a.teamColor || a.color, impact.relativeSpeed * .55, contact.nx, contact.ny);
        world.events.push({ type: "allyCollision", fighter: a, target: b, impact: impactEnergy });
        return;
      }
      const intensity = world.intensity || 1;
      let multiplier = attacker.impactMultiplier * attacker.nextImpactMultiplier;
      if (attacker.perkEffects.firstImpactDouble && !attacker._firstImpactUsed) { multiplier *= 2; attacker._firstImpactUsed = true; }
      const rawDamage = OA.clamp((impactEnergy * settings.collisionDamage + attacker.baseDamage * 0.28) * multiplier * intensity, 2, target.maxHealth * (OA.DAMAGE_LIMITS?.collisionDamageCap||.22));
      const critical = attacker.nextImpactMultiplier > 1.35 || (attacker.wallBoostTimer > 0 && attacker.perkEffects.wallCrit);
      const dealt = this.dealDamage(world, attacker, target, rawDamage, { source: "collision", critical, noRandomCrit: false, armorPen: attacker._impactArmorPen || 0 });
      attacker.nextImpactMultiplier = 1;
      attacker._impactArmorPen = 0;
      attacker.telemetry.collisionsMade += 1;
      target.telemetry.collisionsTaken += 1;
      attacker.telemetry.largestImpact = Math.max(attacker.telemetry.largestImpact, impactEnergy);
      target.telemetry.largestImpact = Math.max(target.telemetry.largestImpact, impactEnergy);
      const hitX = a.x + contact.nx * a.radius;
      const hitY = a.y + contact.ny * a.radius;
      this.particles.emitImpact(hitX, hitY, attacker.color, impact.relativeSpeed, contact.nx, contact.ny);
      this.particles.emitShockwave(hitX, hitY, attacker.color, OA.clamp(impactEnergy / 180, 0.4, 1.8));
      this.audio.impact(impact.relativeSpeed, impactEnergy);
      world.camera.trauma = Math.min(1, world.camera.trauma + impactEnergy / 950);
      world.camera.shake?.add(OA.clamp(impactEnergy/700,.08,.7),.18,28,impactEnergy>420?"high":"medium",contact.nx,contact.ny);
      if(critical&&world.settings?.slowMotion!==false&&!world.settings?.reducedMotion)world.timeDilation={scale:.42,timer:.075};else if(impactEnergy>520&&world.settings?.freezeFrame!==false&&!world.settings?.reducedMotion)world.timeDilation={scale:.18,timer:.04};
      world.physicsStats.lastImpact = impactEnergy;
      world.physicsStats.lastNormal = { x: contact.nx, y: contact.ny, atX: hitX, atY: hitY };
      this.logger.logEvent(world.time, attacker, "collision", impactEnergy);
      world.events.push({ type: "collision", fighter: attacker, target, damage: dealt, impact: impactEnergy, x: hitX, y: hitY });
      if (impactEnergy > 430) world.events.push({ type: "heavyCollision", fighter: attacker, target, impact: impactEnergy });
      if (attacker.telemetry.collisionsMade % 3 === 0) world.events.push({ type: "threeHits", fighter: attacker, target });

      if (attacker.status.impactHeal > 0) attacker.heal(dealt * (attacker.statusPower.impactHeal || 0.25));
      if (target.status.spikeArmor > 0) this.dealDamage(world, target, attacker, target.statusPower.spikeArmor || 10, { source: "ability", noRandomCrit: true });
      if (target.status.counterGuard > 0) attacker.applyImpulse(-contact.nx * 240, -contact.ny * 240);
    }

    handleWallImpact(world, fighter, speed, normal, boosted) {
      this.particles.emitWallImpact(fighter.x, fighter.y, fighter.color, speed, normal.x, normal.y, boosted);
      this.audio.wall(speed, boosted);
      world.arena.borderPulse=Math.min(1,(world.arena.borderPulse||0)+speed/900);world.arena.impactMarks||=[];world.arena.impactMarks.push({x:fighter.x,y:fighter.y,nx:normal.x,ny:normal.y,color:boosted?"#fff39a":fighter.color,life:2.8,maxLife:2.8});if(world.arena.impactMarks.length>28)world.arena.impactMarks.shift();this.particles.addDecal?.(fighter.x,fighter.y,"wall-crack",boosted?"#fff39a":fighter.color,boosted?48:30,3.5);
      world.camera.trauma = Math.min(1, world.camera.trauma + speed / 1900);
      world.camera.shake?.add(OA.clamp(speed/1500,.04,.42),.12,32,boosted?"high":"low",normal.x,normal.y);
      fighter.telemetry.wallBounces += 1;
      if (boosted) fighter.telemetry.wallBoosts += 1;
      this.logger.logEvent(world.time, fighter, boosted ? "wallBoost" : "wall", speed);
      world.events.push({ type: "wall", fighter, speed, boosted, normal });
      if (fighter.telemetry.wallBounces % 5 === 0) world.events.push({ type: "fiveWalls", fighter });
    }
  }

  OA.CombatSystem = CombatSystem;
}());
