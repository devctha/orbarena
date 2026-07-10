(function () {
  "use strict";
  const OA = window.OrbArena;

  class WeaponSystem {
    constructor(random, projectileSystem, combat, particles, audio) {
      this.random = random;
      this.projectiles = projectileSystem;
      this.combat = combat;
      this.particles = particles;
      this.audio = audio;
    }

    equip(fighter, weaponId) {
      fighter.weapon = weaponId ? OA.weaponById(weaponId) : this.random.pick(OA.WEAPONS);
      fighter.weaponState.angle = Math.atan2(fighter.directionY, fighter.directionX);
      return fighter.weapon;
    }

    update(world, dt) {
      this.updateFighter(world, world.player, world.enemy, dt);
      this.updateFighter(world, world.enemy, world.player, dt);
    }

    updateFighter(world, fighter, target, dt) {
      const weapon = fighter.weapon;
      if (!weapon || !fighter.alive || fighter.ai.disabled) return;
      fighter.weaponGuard = 0;
      const state = fighter.weaponState;
      const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      const lead = weapon.kind === "projectile" ? Math.min(0.42, distance / Math.max(1, weapon.projectileSpeed)) : 0.04;
      const aim = Math.atan2(target.y + target.vy * lead - fighter.y, target.x + target.vx * lead - fighter.x);
      const difference = OA.Vector.angleDifference(state.angle, aim);
      const turnRate = weapon.pattern === "spin" || weapon.pattern === "twin" ? weapon.rotationSpeed : 7;
      state.angle += OA.clamp(difference, -turnRate * dt, turnRate * dt);

      if (weapon.kind === "melee") this.updateMelee(world, fighter, target, weapon, distance, dt);
      else this.updateRanged(world, fighter, target, weapon, distance, difference);
    }

    updateMelee(world, fighter, target, weapon, distance, dt) {
      const state = fighter.weaponState;
      const attackRange = weapon.reach + target.radius + fighter.radius * 0.3;
      if (state.cooldown <= 0 && distance <= attackRange * 1.22 && fighter.stunTimer <= 0) {
        state.active = weapon.activeWindow;
        state.cooldown = weapon.cooldown / (world.intensity > 1 ? 1 + (world.intensity - 1) * 0.15 : 1);
        state.hit = false;
      }
      if (state.active <= 0) { state.extension += (0.25 - state.extension) * Math.min(1, dt * 12); return; }

      const progress = 1 - state.active / weapon.activeWindow;
      if (["spin", "twin", "sweep", "chain"].includes(weapon.pattern)) state.angle += weapon.rotationSpeed * dt * (fighter.ai.orbit || 1);
      if (weapon.pattern === "smash") state.angle += Math.sin(progress * Math.PI) * weapon.rotationSpeed * dt * 1.8;
      state.extension = weapon.pattern === "thrust" ? 0.35 + Math.sin(progress * Math.PI) * 0.75 : weapon.pattern === "chain" ? 0.7 + Math.sin(progress * Math.PI * 2) * 0.3 : 1;
      if (weapon.pattern === "shield") fighter.weaponGuard = weapon.guard || 0.2;
      if (state.hit) return;

      const startDistance = fighter.radius * 0.55;
      const reach = weapon.reach * state.extension;
      const direction = OA.Vector.fromAngle(state.angle);
      const startX = fighter.x + direction.x * startDistance;
      const startY = fighter.y + direction.y * startDistance;
      const endX = fighter.x + direction.x * reach;
      const endY = fighter.y + direction.y * reach;
      const hit = OA.Collision.segmentCircle(startX, startY, endX, endY, target.x, target.y, target.radius + weapon.width);
      if (!hit) return;

      const speedBonus = fighter.currentSpeed() / Math.max(1, fighter.maxSpeed) * 0.28;
      const patternMultiplier = weapon.pattern === "smash" ? 1.3 : weapon.pattern === "thrust" ? 1.14 : 1;
      const damage = weapon.damage * (1 + speedBonus) * patternMultiplier * (fighter.comboMultiplier || 1);
      const dealt = this.combat.dealDamage(world, fighter, target, damage, { source: "weapon", armorPen: weapon.pattern === "thrust" ? 0.32 : 0 });
      const knockback = weapon.knockback * world.physics.knockback;
      const received = target.applyImpulse(direction.x * knockback, direction.y * knockback);
      fighter.telemetry.knockbackCaused += received;
      fighter.angularVelocity -= (fighter.ai.orbit || 1) * weapon.knockback / 120;
      target.deform.amount = OA.clamp(weapon.knockback / 420, 0.18, 0.68);
      target.deform.nx = direction.x;
      target.deform.ny = direction.y;
      if (weapon.lifesteal) fighter.heal(dealt * weapon.lifesteal);
      this.particles.emitImpact(hit.x, hit.y, weapon.color, weapon.knockback * 0.8, direction.x, direction.y);
      this.audio.weapon(weapon.pattern, weapon.damage);
      state.hit = true;
      world.events.push({ type: "weapon", fighter, target, damage: dealt, weapon: weapon.id });
    }

    updateRanged(world, fighter, target, weapon, distance, angleDifference) {
      const state = fighter.weaponState;
      if (state.cooldown > 0 || fighter.stunTimer > 0 || fighter.status.silenced > 0 || Math.abs(angleDifference) > 0.5 || distance > 880) return;
      state.cooldown = weapon.cooldown / (world.intensity > 1 ? 1 + (world.intensity - 1) * 0.12 : 1);
      const baseCount = weapon.pellets || 1;
      const count = fighter.status.duplicateShots > 0 ? baseCount * 2 : baseCount;
      const baseAngle = state.angle;
      for (let index = 0; index < count; index += 1) {
        const normalized = count === 1 ? 0 : index / (count - 1) - 0.5;
        const angle = baseAngle + normalized * (weapon.spread || 0.06) + this.random.range(-0.018, 0.018);
        const direction = OA.Vector.fromAngle(angle);
        this.projectiles.spawn({
          owner: fighter, source: "weapon", kind: weapon.pattern === "mine" ? "mine" : weapon.pattern === "beam" ? "laser" : weapon.pattern === "burst" ? "missile" : "bolt",
          x: fighter.x + direction.x * (fighter.radius + 6), y: fighter.y + direction.y * (fighter.radius + 6),
          vx: direction.x * weapon.projectileSpeed + fighter.vx * 0.22, vy: direction.y * weapon.projectileSpeed + fighter.vy * 0.22,
          radius: weapon.projectileRadius, damage: weapon.damage, knockback: weapon.knockback,
          life: weapon.life || 2.6, bounces: weapon.bounces, pierce: weapon.pierce, homing: weapon.homing,
          armTimer: weapon.pattern === "mine" ? 0.55 : 0, color: weapon.color
        });
      }
      const recoil = weapon.pattern === "spread" ? 58 : weapon.pattern === "single" ? 34 : 18;
      const backward = OA.Vector.fromAngle(baseAngle + Math.PI, recoil);
      fighter.applyImpulse(backward.x, backward.y, { ignoreResistance: true });
      this.audio.weapon(weapon.pattern, weapon.damage);
    }
  }

  OA.WeaponSystem = WeaponSystem;
}());
