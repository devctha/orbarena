(function () {
  "use strict";
  const OA = window.OrbArena;
  class PoisonSystem {
    constructor(combat, particles) { this.combat = combat; this.particles = particles; }
    apply(target, source, stacks = 1, duration = 5, dps = 1.5) {
      const resistance = OA.clamp(target.poisonResistance || 0, 0, 0.7);
      target.poison ||= { stacks: 0, duration: 0, tick: 0, source, dps: 0, healReduction: 0 };
      target.poison.stacks = Math.min(OA.CHARACTER_LIMITS.maxPoisonStacks, target.poison.stacks + Math.max(1, Math.round(stacks * (1 - resistance))));
      target.poison.duration = Math.max(target.poison.duration, duration * (1 - resistance * 0.5));
      target.poison.source = source;
      target.poison.dps = Math.max(target.poison.dps, dps);
      target.poison.healReduction = Math.min(0.65, target.poison.stacks * 0.07);
      source.characterTelemetry.poisonApplied += stacks;
    }
    createPool(world, owner, x, y, options = {}) {
      world.poisonPools ||= [];
      const owned = world.poisonPools.filter((pool) => pool.owner === owner);
      if (owned.length >= 6) owned[0].life = 0;
      world.poisonPools.push({ owner, x, y, radius: options.radius || 58, life: options.life || 5, maxLife: options.life || 5, tick: 0, stacks: options.stacks || 1, dps: options.dps || 1.5, color: options.color || owner.color });
    }
    update(world, dt) {
      for (const fighter of OA.getFighters(world)) {
        fighter.healingMultiplier = 1;
        const poison = fighter.poison;
        if (!poison || poison.duration <= 0 || poison.stacks <= 0) continue;
        poison.duration -= dt;
        poison.tick -= dt;
        fighter.healingMultiplier = 1 - poison.healReduction;
        if (poison.tick <= 0) {
          poison.tick = 0.5;
          const damage = poison.dps * poison.stacks * 0.5;
          const dealt = this.combat.dealDamage(world, poison.source, fighter, damage, { source: "ability", abilityId: "poison", noRandomCrit: true, dot: true });
          poison.source.characterTelemetry.poisonDamage += dealt;
        }
        if (poison.duration <= 0) poison.stacks = 0;
      }
      world.poisonPools ||= [];
      for (const pool of world.poisonPools) {
        pool.life -= dt; pool.tick -= dt;
        const target = OA.findTarget(world, pool.owner);
        if (!target) continue;
        if (pool.tick <= 0 && Math.hypot(target.x - pool.x, target.y - pool.y) <= pool.radius + target.radius) { pool.tick = 0.65; this.apply(target, pool.owner, pool.stacks, 4, pool.dps); }
      }
      world.poisonPools = world.poisonPools.filter((pool) => pool.life > 0);
    }
  }
  OA.PoisonSystem = PoisonSystem;
}());
