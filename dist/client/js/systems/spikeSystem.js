(function () {
  "use strict";
  const OA = window.OrbArena;
  class SpikeSystem {
    constructor(combat, particles) { this.combat = combat; this.particles = particles; }
    activate(fighter, options = {}) {
      fighter.spikes = {
        active: true, count: options.count || 10, size: options.size || 13,
        damage: options.damage || 10, knockback: options.knockback || 120,
        durability: options.durability || 45, maxDurability: options.durability || 45,
        growth: 0, life: options.life || 5, brokenCooldown: 0
      };
      fighter.characterTelemetry.spikesActivated += 1;
    }
    update(fighter, dt) {
      const spikes = fighter.spikes;
      if (!spikes) return;
      spikes.life -= dt;
      spikes.growth += ((spikes.active ? 1 : 0) - spikes.growth) * Math.min(1, dt * 8);
      spikes.brokenCooldown = Math.max(0, spikes.brokenCooldown - dt);
      if (spikes.life <= 0 || spikes.durability <= 0) { spikes.active = false; spikes.brokenCooldown = Math.max(spikes.brokenCooldown, 4); }
    }
    process(world, event) {
      if (event.type !== "collision") return;
      const defender = event.target;
      const spikes = defender.spikes;
      if (!spikes?.active) return;
      const damage = spikes.damage * spikes.growth;
      this.combat.dealDamage(world, defender, event.fighter, damage, { source: "ability", abilityId: "spikes", noRandomCrit: true });
      const direction = OA.Vector.normalize(event.fighter.x - defender.x, event.fighter.y - defender.y);
      event.fighter.applyImpulse(direction.x * spikes.knockback, direction.y * spikes.knockback);
      spikes.durability -= event.damage + event.impact * 0.03;
      this.particles.emitImpact(defender.x, defender.y, defender.color, 140);
    }
  }
  OA.SpikeSystem = SpikeSystem;
}());
