(function () {
  "use strict";
  const OA = window.OrbArena;

  class PerkSystem {
    constructor(random, combat, projectiles, particles) {
      this.random = random;
      this.combat = combat;
      this.projectiles = projectiles;
      this.particles = particles;
    }

    assign(fighter, weapon, requestedIds = null) {
      const matching = OA.PERKS.filter((perk) => perk.tags.some((tag) => weapon.tags.includes(tag)));
      const pool = [...matching, ...OA.PERKS.filter((perk) => !matching.includes(perk))];
      const requested = Array.isArray(requestedIds) ? requestedIds.map((id) => OA.PERKS.find((perk) => perk.id === id)).filter(Boolean).slice(0, 4) : [];
      const selected = [...requested];
      while (selected.length < 3 && pool.length) {
        const weightedLimit = Math.max(1, Math.min(pool.length, matching.length + 5));
        const index = this.random.int(0, weightedLimit - 1);
        const [perk] = pool.splice(index, 1);
        if (!selected.some((entry) => entry.id === perk.id)) selected.push(perk);
      }
      fighter.perks = selected;
      fighter.perkEffects = Object.create(null);
      for (const perk of selected) {
        for (const [key, value] of Object.entries(perk.effects)) {
          fighter.perkEffects[key] = typeof value === "number" ? (fighter.perkEffects[key] || 0) + value : value;
        }
      }
      if (fighter.perkEffects.mass) {
        fighter.baseMass *= 1 + fighter.perkEffects.mass;
        fighter.mass = fighter.baseMass;
      }
      if (fighter.perkEffects.speed) fighter.maxSpeed *= 1 + fighter.perkEffects.speed;
      return selected;
    }

    update(world, dt) {
      for (const fighter of OA.getFighters(world)) {
        if (fighter.perkEffects.lowHealthSpeed && fighter.healthRatio() < 0.3) {
          fighter.setStatus("haste", dt * 2, fighter.perkEffects.lowHealthSpeed);
        }
        if (fighter.perkEffects.lowHealthElasticity && fighter.healthRatio() < 0.3) fighter.elasticity = Math.min(1.16, fighter.elasticity + fighter.perkEffects.lowHealthElasticity * dt * 2);
        if (fighter.perkEffects.burnAtMax && fighter.currentSpeed() >= fighter.maxSpeed * 0.97) fighter.setStatus("burning", 0.2, 1);
      }
    }

    process(world, events) {
      for (const event of events) {
        const fighter = event.fighter;
        if (!fighter?.alive) continue;
        const effects = fighter.perkEffects;
        if (event.type === "wall") {
          if (effects.shieldOnWall) fighter.addShield(effects.shieldOnWall);
          if (effects.speedPerWall) fighter.maxSpeed = Math.min(fighter.absoluteMaxSpeed * 0.72, fighter.maxSpeed * (1 + effects.speedPerWall));
          if (effects.wallCrit) fighter.nextImpactMultiplier = Math.max(fighter.nextImpactMultiplier, 1.55);
        }
        if (event.type === "collision") {
          if (effects.speedPerCollision) fighter.maxSpeed = Math.min(fighter.absoluteMaxSpeed * 0.74, fighter.maxSpeed * (1 + effects.speedPerCollision));
          if (effects.collisionCooldown) {
            for (const id of Object.keys(fighter.abilityCooldowns)) fighter.abilityCooldowns[id] *= 1 - effects.collisionCooldown;
          }
          if (effects.thirdCollisionStun && fighter.telemetry.collisionsMade % 3 === 0) event.target.setStatus("stunned", effects.thirdCollisionStun);
          if (effects.pullAfterCollision) {
            const direction = OA.Vector.normalize(fighter.x - event.target.x, fighter.y - event.target.y);
            event.target.applyImpulse(direction.x * effects.pullAfterCollision, direction.y * effects.pullAfterCollision);
          }
          if (effects.collisionExplosion) {
            const damage = fighter.baseDamage * effects.collisionExplosion;
            this.combat.dealDamage(world, fighter, event.target, damage, { source: "ability", noRandomCrit: true });
            this.particles.emitShockwave(event.x, event.y, fighter.color, 0.55);
          }
          if (effects.mineOnCollision) {
            this.projectiles.spawn({ owner: fighter, source: "ability", kind: "mine", x: event.x, y: event.y, vx: 0, vy: 0, radius: 7, damage: 13, knockback: 170, life: 3.5, armTimer: 0.45, color: fighter.color });
          }
          if (effects.shieldFromKnockback) fighter.addShield(event.impact * effects.shieldFromKnockback);
          if (event.target.perkEffects.knockbackToShield) event.target.addShield(event.impact * event.target.perkEffects.knockbackToShield);
        }
      }
    }
  }

  OA.PerkSystem = PerkSystem;
}());
