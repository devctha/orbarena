(function () {
  "use strict";
  const OA = window.OrbArena;
  class SummonSystem {
    constructor(random, combat, projectiles, particles) {
      this.random = random;
      this.combat = combat;
      this.projectiles = projectiles;
      this.particles = particles;
      this.sequence = 0;
    }
    spawn(world, owner, options = {}) {
      world.summons ||= [];
      const current = world.summons.filter((summon) => summon.owner === owner && summon.active).length;
      const limit = Math.min(OA.CHARACTER_LIMITS.maxSummons, options.limit || OA.CHARACTER_LIMITS.maxSummons);
      if (current >= limit || !owner.alive) return null;
      const angle = options.angle ?? this.random.range(0, Math.PI * 2);
      const offset = options.offset || owner.radius + 18;
      const summon = {
        id: `summon-${this.sequence += 1}`, active: true, owner, ownerId: owner.id, team: owner.team,
        kind: options.kind || "summon", noRecursive: true, x: owner.x + Math.cos(angle) * offset,
        y: owner.y + Math.sin(angle) * offset, vx: owner.vx * 0.25, vy: owner.vy * 0.25,
        radius: options.radius || owner.radius * (options.scale || 0.45), scale: options.scale || 0.45,
        maxHealth: options.health || owner.maxHealth * 0.2, health: options.health || owner.maxHealth * 0.2,
        damage: options.damage || owner.damage * 0.35, life: options.life || 6, maxLife: options.life || 6,
        speed: options.speed || owner.maxSpeed * 0.75, contactCooldown: 0, shotTimer: options.shotDelay || 0.5,
        behavior: options.behavior || "chase", blockProjectiles: Boolean(options.blockProjectiles),
        explodeOnDeath: options.explodeOnDeath || 0, healAura: options.healAura || 0,
        projectile: options.projectile || null, color: options.color || owner.color,
        secondary: options.secondary || owner.secondaryColor, phase: angle, linked: options.linked !== false
      };
      world.summons.push(summon);
      owner.characterTelemetry.summonsCreated += 1;
      this.particles.emitShockwave(summon.x, summon.y, summon.color, 0.38);
      return summon;
    }
    update(world, dt) {
      world.summons ||= [];
      for (const summon of world.summons) {
        if (!summon.active) continue;
        const scaledDt = dt * (world.timeScales?.fighter[summon.team] || 1);
        summon.life -= scaledDt;
        summon.contactCooldown = Math.max(0, summon.contactCooldown - scaledDt);
        summon.shotTimer -= scaledDt;
        if (!summon.owner.alive && summon.linked) summon.life = 0;
        if (summon.life <= 0 || summon.health <= 0) { this.remove(world, summon); continue; }
        const target = summon.team === "player" ? world.enemy : world.player;
        if (!target.alive) continue;
        if (summon.behavior === "orbit") this.orbit(summon, scaledDt);
        else if (summon.behavior === "stationary") this.stationary(world, summon, target, scaledDt);
        else this.chase(world, summon, target, scaledDt);
        if (summon.projectile && summon.shotTimer <= 0) this.fire(summon, target);
        if (summon.blockProjectiles) this.blockShots(summon);
      }
      world.summons = world.summons.filter((summon) => summon.active);
    }
    chase(world, summon, target, dt) {
      const direction = OA.Vector.normalize(target.x - summon.x, target.y - summon.y);
      summon.vx += direction.x * summon.speed * 2.4 * dt;
      summon.vy += direction.y * summon.speed * 2.4 * dt;
      const velocity = OA.Vector.clampLength(summon.vx, summon.vy, summon.speed);
      summon.vx = velocity.x; summon.vy = velocity.y;
      summon.x += summon.vx * dt; summon.y += summon.vy * dt;
      this.keepInArena(world, summon);
      if (direction.length <= target.radius + summon.radius && summon.contactCooldown <= 0) {
        summon.contactCooldown = 0.65;
        this.combat.dealDamage(world, summon.owner, target, summon.damage, { source: "ability", abilityId: summon.kind, noRandomCrit: true });
        target.applyImpulse(direction.x * 80, direction.y * 80);
        this.particles.emitImpact(summon.x, summon.y, summon.color, 110, direction.x, direction.y);
      }
    }
    orbit(summon, dt) {
      summon.phase += dt * 2.8;
      const radius = summon.owner.radius + 28 + summon.scale * 18;
      summon.x = summon.owner.x + Math.cos(summon.phase) * radius;
      summon.y = summon.owner.y + Math.sin(summon.phase) * radius;
    }
    stationary(world, summon, target, dt) {
      if (summon.healAura && Math.hypot(summon.owner.x - summon.x, summon.owner.y - summon.y) < 100) {
        const healed = summon.owner.heal(summon.healAura * dt);
        summon.owner.characterTelemetry.healing += healed;
      }
      if (summon.explodeOnDeath && Math.hypot(target.x - summon.x, target.y - summon.y) < 55) {
        summon.life = 0;
        this.combat.dealDamage(world, summon.owner, target, summon.explodeOnDeath, { source: "ability", abilityId: summon.kind, noRandomCrit: true });
      }
    }
    fire(summon, target) {
      summon.shotTimer = summon.projectile.cooldown || 0.8;
      const direction = OA.Vector.normalize(target.x - summon.x, target.y - summon.y);
      this.projectiles.spawn({ owner: summon.owner, source: "ability", abilityId: summon.kind, kind: "drone", x: summon.x, y: summon.y, vx: direction.x * (summon.projectile.speed || 480), vy: direction.y * (summon.projectile.speed || 480), radius: 3, damage: summon.projectile.damage || summon.damage, knockback: summon.projectile.knockback || 45, life: 2.2, color: summon.color });
    }
    blockShots(summon) {
      for (const projectile of this.projectiles.pool) {
        if (!projectile.active || projectile.team === summon.team) continue;
        if (Math.hypot(projectile.x - summon.x, projectile.y - summon.y) > projectile.radius + summon.radius) continue;
        summon.health -= projectile.damage;
        projectile.active = false;
        this.particles.emitImpact(summon.x, summon.y, summon.color, 90);
      }
    }
    remove(world, summon) {
      if (!summon.active) return;
      summon.active = false;
      if (summon.explodeOnDeath > 0) this.particles.emitShockwave(summon.x, summon.y, summon.color, 0.65);
      else this.particles.emitAbility(summon.x, summon.y, summon.color, "invocação");
      for (const projectile of this.projectiles.pool) if (projectile.active && projectile.owner === summon) projectile.active = false;
      void world;
    }
    keepInArena(world, summon) {
      if (world.arena?.shape === "circle") { const radial = OA.Vector.normalize(summon.x - world.arena.centerX, summon.y - world.arena.centerY); const limit = world.arena.radius - summon.radius; if (radial.length > limit) { summon.x = world.arena.centerX + radial.x * limit; summon.y = world.arena.centerY + radial.y * limit; summon.vx *= -0.55; summon.vy *= -0.55; } return; }
      const padding = world.arena.padding + summon.radius;
      summon.x = OA.clamp(summon.x, padding, OA.CONFIG.arena.width - padding);
      summon.y = OA.clamp(summon.y, padding, OA.CONFIG.arena.height - padding);
    }
  }
  OA.SummonSystem = SummonSystem;
}());
