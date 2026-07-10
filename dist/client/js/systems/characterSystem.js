(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterSystem {
    constructor(options) {
      Object.assign(this, options);
      this.context = {
        random: this.random,
        damage: (world, actor, target, amount, id, ultimate = false, meta = {}) => this.damage(world, actor, target, amount, id, ultimate, meta),
        heal: (actor, amount) => this.heal(actor, amount),
        shield: (actor, amount) => this.shield(actor, amount),
        impulse: (actor, x, y, amount) => this.impulse(actor, x, y, amount),
        radial: (world, actor, target, radius, damage, knockback, id, ultimate = false) => this.radial(world, actor, target, radius, damage, knockback, id, ultimate),
        projectile: (world, actor, target, options) => this.projectile(world, actor, target, options),
        burst: (world, actor, target, options) => this.burst(world, actor, target, options),
        zone: (world, actor, target, options) => this.zone(world, actor, target, options),
        summon: (world, actor, options) => this.summons.spawn(world, actor, options),
        clone: (world, actor, options) => this.clones.create(world, actor, options),
        poison: (target, actor, stacks, duration, dps) => this.poison.apply(target, actor, stacks, duration, dps),
        poisonPool: (world, actor, x, y, options) => this.poison.createPool(world, actor, x, y, options),
        spikes: (actor, options) => this.spikes.activate(actor, options),
        slowFighter: (...args) => this.time.slowFighter(...args),
        slowProjectiles: (...args) => this.time.slowProjectiles(...args),
        slowAbilities: (...args) => this.time.slowAbilities(...args),
        slowGame: (...args) => this.time.slowGame(...args),
        slowVisual: (...args) => this.time.slowVisual(...args),
        slowEffect: (...args) => this.time.slowEffect(...args),
        slowAnimation: (...args) => this.time.slowAnimation(...args),
        teleport: (world, actor, x, y) => this.teleport(world, actor, x, y),
        clearControls: (actor) => this.clearControls(actor),
        removeProjectiles: (actor, radius) => this.removeProjectiles(actor, radius),
        addOrbitals: (...args) => this.abilitySystem.addOrbitals(...args),
        schedule: (world, delay, action) => world.scheduled.push({ delay, action }),
        effect: (world, effect) => world.effects.push(effect)
        ,power: (id, world, actor, target, amplified = false) => this.powers.activate(id, world, actor, target, this.context, amplified)
        ,powerUltimate: (id, world, actor, target) => this.powers.ultimate(id, world, actor, target, this.context)
      };
    }
    initialize(world, fighter) {
      const handler = OA.CharacterMechanics.get(fighter.characterId);
      if (!handler) throw new Error(`Mecânica não registrada: ${fighter.characterId}`);
      fighter.characterState.activeCooldown = this.random.range(0.8, 2.2);
      fighter.characterState.activeDecision = this.random.range(0.2, 0.7);
      fighter.characterState.ultimateCharge = this.random.range(0, 8);
      handler.spawn?.(world, fighter, this.opponent(world, fighter), this.context);
    }
    update(world, dt) {
      this.updateZones(world, dt);
      for (const fighter of OA.getFighters(world)) {
        if (!fighter.alive) continue;
        const scale = world.timeScales?.ability[fighter.team] || 1;
        const localDt = dt * scale;
        const state = fighter.characterState;
        state.activeCooldown = Math.max(0, state.activeCooldown - localDt);
        state.ultimateCooldown = Math.max(0, state.ultimateCooldown - localDt);
        state.ultimateCharge = Math.min(100, state.ultimateCharge + localDt * (world.battlePhase==="opening"?2.1:world.battlePhase==="escalation"?3.5:world.battlePhase==="climax"?4.4:5.2));
        state.activeDecision -= localDt;
        const target = this.opponent(world, fighter);
        const handler = OA.CharacterMechanics.get(fighter.characterId);
        if (fighter.character.powerId) this.powers.update(world, fighter, target, localDt, this.context);
        handler.update?.(world, fighter, target, localDt, this.context);
        if (fighter.ai.disabled || fighter.stunTimer > 0 || fighter.status.silenced > 0) continue;
        if (state.ultimateCharge >= 100 && state.ultimateCooldown <= 0 && this.random.chance(0.035 + (fighter.ai.ultimatePriority || fighter.ai.abilityPriority) * 0.03)) this.useUltimate(world, fighter, target, handler);
        if (state.activeCooldown <= 0 && state.activeDecision <= 0) {
          state.activeDecision = this.random.range(0.22, 0.55);
          if (this.random.chance(0.62 * fighter.ai.abilityPriority)) this.useActive(world, fighter, target, handler);
        }
      }
    }
    useActive(world, fighter, target, handler) {
      const equipped = [fighter.buildPowers?.active, fighter.buildPowers?.secondary].find((id) => OA.PowerRegistry.get(id) && (fighter.powerCooldowns[id] || 0) <= 0);
      const result = equipped ? this.powers.activate(equipped, world, fighter, target, this.context) : handler.active?.(world, fighter, target, this.context);
      fighter.characterState.activeCooldown = Math.max(1.5, typeof result === "number" ? result : 7.5);
      fighter.characterState.activeUses += 1;
      fighter.characterTelemetry.activeCasts += 1;
      fighter.characterState.ultimateCharge = Math.min(100, fighter.characterState.ultimateCharge + 8);
      this.particles.emitAbility(fighter.x, fighter.y, fighter.glowColor, fighter.character.class.toLowerCase());
      this.particles.emitText(fighter.x, fighter.y - fighter.radius - 24, fighter.character.kit.active.toUpperCase(), fighter.glowColor, false);
      this.audio.ability(fighter.character.class.toLowerCase(), 22);
    }
    useUltimate(world, fighter, target, handler) {
      if (OA.PowerRegistry.get(fighter.buildPowers?.ultimate)) this.powers.ultimate(fighter.buildPowers.ultimate, world, fighter, target, this.context);
      else handler.ultimate?.(world, fighter, target, this.context);
      fighter.characterState.ultimateCharge = 0;
      fighter.characterState.ultimateCooldown = 18;
      fighter.characterState.ultimateUses += 1;
      fighter.telemetry.ultimatesUsed=(fighter.telemetry.ultimatesUsed||0)+1;
      world.camera.trauma = Math.min(1, world.camera.trauma + 0.55);
      world.timeDilation = { scale: 0.35, timer: 0.14 };
      this.particles.emitShockwave(fighter.x, fighter.y, fighter.glowColor, 1.6);
      this.particles.emitText(fighter.x, fighter.y - fighter.radius - 28, fighter.character.kit.ultimate.toUpperCase(), "#fff2a1", true);
      this.audio.ability("caos", 70);
    }
    processEvents(world, events) {
      for (const event of events) {
        this.spikes.process(world, event);
        const actor = event.fighter;
        const target = event.target;
        if (actor?.characterState) {
          if (event.type === "damage") actor.characterState.ultimateCharge = Math.min(100, actor.characterState.ultimateCharge + event.damage * 0.28);
          OA.CharacterMechanics.get(actor.characterId)?.event?.(world, actor, target || this.opponent(world, actor), event, this.context);
          if (actor.character.powerId) this.powers.event("event", world, actor, target || this.opponent(world, actor), event, this.context);
        }
        if (target?.characterState && target !== actor) {
          target.characterState.ultimateCharge = Math.min(100, target.characterState.ultimateCharge + (event.damage || 0) * 0.18);
          OA.CharacterMechanics.get(target.characterId)?.receive?.(world, target, actor || this.opponent(world, target), event, this.context);
          if (target.character.powerId) this.powers.event("receive", world, target, actor || this.opponent(world, target), event, this.context);
        }
      }
    }
    damage(world, actor, target, amount, id, ultimate, meta = {}) {
      const dealt = this.combat.dealDamage(world, actor, target, amount, { source: "ability", abilityId: `character:${id}`, noRandomCrit: meta.noCrit ?? true, armorPen: meta.armorPen || 0, ignoreArmor: meta.ignoreArmor || false });
      if (ultimate) actor.characterTelemetry.ultimateDamage += dealt;
      else actor.characterTelemetry.activeDamage += dealt;
      if (dealt > 0) actor.characterTelemetry.activeHits += 1;
      return dealt;
    }
    heal(actor, amount) { const healed = actor.heal(Math.min(amount, actor.maxHealth * OA.CHARACTER_LIMITS.maxHealingPerSecondRatio)); actor.characterTelemetry.healing += healed; return healed; }
    shield(actor, amount) { const added = actor.addShield(amount); actor.characterTelemetry.shieldGenerated += added; return added; }
    impulse(actor, x, y, amount) { const direction = OA.Vector.normalize(x, y); return actor.applyImpulse(direction.x * amount * actor.mass, direction.y * amount * actor.mass, { ignoreResistance: true }); }
    radial(world, actor, target, radius, damage, knockback, id, ultimate) {
      const direction = OA.Vector.normalize(target.x - actor.x, target.y - actor.y);
      if (direction.length > radius + target.radius) return 0;
      const falloff = 1 - direction.length / (radius + target.radius) * 0.4;
      const dealt = damage ? this.damage(world, actor, target, damage * falloff, id, ultimate) : 0;
      if (knockback) target.applyImpulse(direction.x * knockback * falloff, direction.y * knockback * falloff);
      this.particles.emitShockwave(actor.x, actor.y, actor.glowColor, radius / 115);
      return dealt;
    }
    projectile(world, actor, target, options = {}) {
      const direction = OA.Vector.normalize((target.x + target.vx * (options.lead || 0.08)) - actor.x, (target.y + target.vy * (options.lead || 0.08)) - actor.y);
      return this.projectiles.spawn({ owner: actor, source: "ability", abilityId: `character:${actor.characterId}`, kind: options.kind || "character", x: options.x ?? actor.x + direction.x * (actor.radius + 7), y: options.y ?? actor.y + direction.y * (actor.radius + 7), vx: direction.x * (options.speed || 540), vy: direction.y * (options.speed || 540), radius: options.radius || 4, damage: options.damage || 10, knockback: options.knockback || 60, life: options.life || 2.5, bounces: options.bounces || 0, pierce: options.pierce || 0, homing: options.homing || 0, color: options.color || actor.glowColor });
    }
    burst(world, actor, target, options = {}) {
      const count = Math.min(18, options.count || 5);
      for (let index = 0; index < count; index += 1) {
        const base = Math.atan2(target.y - actor.y, target.x - actor.x);
        const angle = options.radial ? Math.PI * 2 * index / count : base + (index - (count - 1) / 2) * (options.spread || 0.16);
        const vector = OA.Vector.fromAngle(angle);
        const fakeTarget = { x: actor.x + vector.x * 200, y: actor.y + vector.y * 200, vx: 0, vy: 0 };
        this.projectile(world, actor, fakeTarget, options);
      }
    }
    zone(world, actor, target, options = {}) {
      world.characterZones ||= [];
      if (world.characterZones.length >= OA.CHARACTER_LIMITS.maxZones) world.characterZones.shift();
      const at = options.at === "self" ? actor : target;
      world.characterZones.push({ owner: actor, kind: options.kind, x: options.x ?? at.x, y: options.y ?? at.y, radius: options.radius || 100, life: options.life || 4, maxLife: options.life || 4, tick: 0, power: options.power || 1, color: options.color || actor.glowColor, data: options.data || {} });
    }
    teleport(world, actor, x, y) {
      if (world.arena?.shape === "circle") { const radial = OA.Vector.normalize(x - world.arena.centerX, y - world.arena.centerY), limit = world.arena.radius - actor.radius - 3; if (radial.length > limit) { x = world.arena.centerX + radial.x * limit; y = world.arena.centerY + radial.y * limit; } }
      const padding = world.arena.padding + actor.radius;
      this.particles.emitShockwave(actor.x, actor.y, actor.color, 0.5);
      actor.x = world.arena?.shape === "circle" ? x : OA.clamp(x, padding, OA.CONFIG.arena.width - padding);
      actor.y = world.arena?.shape === "circle" ? y : OA.clamp(y, padding, OA.CONFIG.arena.height - padding);
      actor.previousX = actor.x; actor.previousY = actor.y;
      this.particles.emitShockwave(actor.x, actor.y, actor.glowColor, 0.65);
    }
    clearControls(actor) { for (const name of ["slow", "frozen", "stunned", "silenced", "confused", "prison"]) actor.status[name] = 0; }
    removeProjectiles(actor, radius) { let removed = 0; for (const projectile of this.projectiles.pool) if (projectile.active && projectile.team !== actor.team && Math.hypot(projectile.x - actor.x, projectile.y - actor.y) <= radius) { projectile.active = false; removed += 1; } return removed; }
    updateZones(world, dt) {
      world.characterZones ||= [];
      for (const zone of world.characterZones) {
        zone.life -= dt;
        zone.tick -= dt;
        const target = OA.findTarget(world, zone.owner);
        if (!target) continue;
        const distance = Math.hypot(target.x - zone.x, target.y - zone.y);
        const ownerDistance = Math.hypot(zone.owner.x - zone.x, zone.owner.y - zone.y);
        const inside = distance <= zone.radius + target.radius;
        if (zone.kind === "heal" && ownerDistance <= zone.radius + zone.owner.radius) this.heal(zone.owner, zone.power * dt);
        if (!inside) continue;
        const outward = OA.Vector.normalize(target.x - zone.x, target.y - zone.y);
        if (zone.kind === "gravity" || zone.kind === "singularity") target.applyForce(-outward.x * zone.power * target.mass, -outward.y * zone.power * target.mass);
        if (zone.kind === "vacuum" || zone.kind === "orbit-cage") { target.applyForce(-outward.x * zone.power * target.mass, -outward.y * zone.power * target.mass); if (zone.kind === "orbit-cage") target.applyForce(-outward.y * zone.power * .75 * target.mass, outward.x * zone.power * .75 * target.mass); }
        if (zone.kind === "repulse") target.applyForce(outward.x * zone.power * target.mass, outward.y * zone.power * target.mass);
        if (zone.kind === "tornado") target.applyForce(-outward.y * zone.power * target.mass, outward.x * zone.power * target.mass);
        if (zone.kind === "slow" || zone.kind === "stasis") this.time.slowFighter(target.team, zone.power, 0.16, zone.owner);
        if (zone.kind === "stasis") this.time.slowProjectiles(target.team, Math.max(0.05, zone.power * 0.45), 0.16, zone.owner);
        if (zone.kind === "silence") target.setStatus("silenced", 0.18, 1);
        if (zone.kind === "mist") { target.ai.orbit *= zone.tick <= 0 ? -1 : 1; target.setStatus("confused", 0.18, 1); }
        if (zone.kind === "water") { target.setStatus("slow", 0.18, 0.72); target.elasticity = Math.min(1.12, target.elasticity + dt * 0.04); }
        if (zone.kind === "black-ice" || zone.kind === "crater") target.setStatus("slow", .18, zone.power);
        if (zone.kind === "aurora") { this.heal(zone.owner, zone.power * dt); if (inside) this.damage(world, zone.owner, target, zone.power * dt, "aurora-trail", false); }
        if (zone.kind === "poison") this.poison.apply(target, zone.owner, 1, 2.5, zone.power);
        if (zone.tick <= 0) {
          zone.tick = zone.data.interval || 0.5;
          if (zone.kind === "fire") this.damage(world, zone.owner, target, zone.power, "fire-zone", false);
          if (zone.kind === "acid") { this.damage(world, zone.owner, target, zone.power, "acid-zone", false); target.armor = Math.max(0, target.armor - 1.2); target.shield = Math.max(0, target.shield - zone.power * 0.8); }
          if (zone.kind === "singularity") this.damage(world, zone.owner, target, zone.power * 0.45, "singularity", false);
          if (zone.kind === "blood-beacon") { const dealt=this.damage(world,zone.owner,target,zone.power,"blood-beacon",false);this.heal(zone.owner,dealt*.45); }
          if (zone.kind === "pulse-mine") this.radial(world,zone.owner,target,zone.radius,0,zone.power,"pulse-mine",false);
          if (zone.kind === "static-prison") { this.damage(world,zone.owner,target,zone.power,"static-prison",false);target.setStatus("stunned",.2,1); }
          if (zone.kind === "rift") this.damage(world,zone.owner,target,zone.power,"critical-rift",false,{armorPen:.3});
        }
        if (zone.kind === "vacuum") for (const projectile of this.projectiles.pool) if (projectile.active && projectile.team !== zone.owner.team && Math.hypot(projectile.x-zone.x,projectile.y-zone.y)<zone.radius) { projectile.vx += -outward.x*zone.power*dt; projectile.vy += -outward.y*zone.power*dt; }
      }
      world.characterZones = world.characterZones.filter((zone) => zone.life > 0);
    }
    opponent(world, fighter) { return OA.findTarget(world, fighter); }
  }
  OA.CharacterSystem = CharacterSystem;
}());
