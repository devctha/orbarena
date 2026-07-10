(function () {
  "use strict";
  const OA = window.OrbArena;
  class CloneSystem {
    constructor(summons, particles) { this.summons = summons; this.particles = particles; }
    create(world, owner, options = {}) {
      const clones = world.summons.filter((summon) => summon.active && summon.owner === owner && summon.kind.includes("clone"));
      if (clones.length >= Math.min(OA.CHARACTER_LIMITS.maxClones, options.limit || 2)) return null;
      const clone = this.summons.spawn(world, owner, {
        kind: options.kind || "character-clone", behavior: options.behavior || "chase",
        scale: options.scale || 0.68, health: owner.maxHealth * (options.healthRatio || 0.24),
        damage: owner.damage * (options.damageRatio || 0.45), life: options.life || 5,
        blockProjectiles: options.blockProjectiles !== false, explodeOnDeath: options.explosion || 0,
        color: options.color || owner.color, limit: options.limit || 2
      });
      if (clone) { clone.statsScale=options.statsScale||.68;clone.damageScale=options.damageRatio||.45;clone.healthScale=options.healthRatio||.24;clone.simplifiedAI=true;clone.noProgression=true;clone.isPrimary=false;owner.characterTelemetry ||= { summonsCreated: 0, clonesCreated: 0, cloneTime: 0, healing: 0 };owner.characterTelemetry.clonesCreated += 1; }
      return clone;
    }
    update(world, dt) {
      for (const summon of world.summons) if (summon.active && summon.kind.includes("clone")) summon.owner.characterTelemetry.cloneTime += dt;
    }
  }
  OA.CloneSystem = CloneSystem;
}());
