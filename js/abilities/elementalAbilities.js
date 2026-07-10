(function () {
  "use strict";
  const M = window.OrbArena.CharacterMechanics;
  M.register("frost", {
    active(world, self, target, c) { c.zone(world, self, target, { kind: "slow", radius: 115, life: 4, power: 0.48, color: self.color }); target.setStatus("slow", 2.5, 0.55); return 7; },
    event(world, self, target, event, c) { if ((event.type === "damage" || event.type === "collision") && target) { target.elementStacks ||= {}; target.elementStacks.frost = Math.min(5, (target.elementStacks.frost || 0) + 1); if (target.elementStacks.frost >= 5) { target.setStatus("frozen", 0.85); target.elementStacks.frost = 0; self.characterTelemetry.controlApplied += 1; } } },
    receive(world, self, attacker, event, c) { if (self.status.frozen > 0 && event.impact > 300) c.damage(world, attacker, self, 14, "frost-shatter", false); },
    ultimate(world, self, target, c) { target.setStatus("frozen", 1.1); c.zone(world, self, target, { kind: "stasis", radius: 190, life: 5, power: 0.3, color: self.glowColor }); }
  });
  M.register("inferno", {
    update(world, self, target, dt, c) { if (self.currentSpeed() > self.maxSpeed * 0.85) self.nextImpactMultiplier = Math.max(self.nextImpactMultiplier, 1.12); if (self.characterState.data.ultimate > 0) { self.characterState.data.ultimate -= dt; self.applyDamage(0.7 * dt, { source: "ability", dot: true, ignoreArmor: true }); } },
    active(world, self, target, c) { c.zone(world, self, self, { kind: "fire", at: "self", radius: 68, life: 5, power: 3.2, color: self.color }); target.burn = { source: self, timer: 4, tick: 0, damage: 2.2 }; return 7.5; },
    event(world, self, target, event, c) { if (event.type === "damage" && target) { target.burn ||= { source: self, timer: 3, tick: 0, damage: 1.7 }; target.burn.timer = Math.max(target.burn.timer, 3); } },
    ultimate(world, self, target, c) { self.characterState.data.ultimate = 6; c.zone(world, self, target, { kind: "fire", radius: 260, life: 6, power: 4.2, color: self.color }); }
  });
  M.register("volt", {
    update(world, self, target, dt) { self.characterState.meter = Math.max(0, Math.min(100, self.characterState.meter + (self.currentSpeed() / self.maxSpeed - 0.45) * dt * 20)); },
    active(world, self, target, c) { const power = 8 + self.characterState.meter * 0.12; c.damage(world, self, target, power, "volt-discharge"); c.impulse(target, target.x - self.x, target.y - self.y, 90 + self.characterState.meter); self.characterState.meter *= 0.35; return 6.5; },
    event(world, self, target, event, c) { if (event.type === "collision" && self.characterState.meter > 25) { c.damage(world, self, target, 5 + self.characterState.meter * 0.08, "volt-contact"); for (const id of Object.keys(target.abilityCooldowns)) target.abilityCooldowns[id] += 0.18; self.characterState.meter *= 0.6; } },
    ultimate(world, self, target, c) { c.damage(world, self, target, 28 + self.characterState.meter * 0.12, "volt-ultimate", true); c.burst(world, self, target, { radial: true, count: 10, damage: 8, speed: 600, color: self.glowColor, bounces: 1 }); self.characterState.meter = 0; }
  });
  M.register("tempest", {
    update(world, self, target, dt) { self.setStatus("haste", 0.15, 0.16); self.characterState.data.wind = (self.characterState.data.wind || 1) + dt; },
    active(world, self, target, c) { c.zone(world, self, target, { kind: "tornado", radius: 100, life: 5, power: 340, color: self.color }); c.removeProjectiles(self, 90); return 8; },
    receive(world, self, attacker, event, c) { if (event.type === "projectile" && c.random.chance(0.38)) { self.applyImpulse((c.random.next() - 0.5) * 120, (c.random.next() - 0.5) * 120); c.removeProjectiles(self, 55); } },
    ultimate(world, self, target, c) { world.arena.rotationForce = 260 * self.ai.orbit; world.arena.rotationTimer = 7; c.zone(world, self, target, { kind: "tornado", radius: 220, life: 7, power: 420, color: self.glowColor }); }
  });
  M.register("terra", {
    update(world, self, target, dt) { const p = world.arena.padding; const near = Math.min(self.x - p, 960 - p - self.x, self.y - p, 540 - p - self.y) < 70; self.armor += ((near ? self.baseArmor + 14 : self.baseArmor) - self.armor) * Math.min(1, dt * 3); },
    active(world, self, target, c) { c.summon(world, self, { kind: "stone-barrier", behavior: "stationary", life: 7, scale: 0.7, health: 48, blockProjectiles: true, limit: 3, offset: 52 }); return 8; },
    event(world, self, target, event) { if (event.type === "wall") self.addShield(6); },
    ultimate(world, self, target, c) { self.mass = self.baseMass * 1.65; self.setStatus("ram", 5, 0.65); c.radial(world, self, target, 220, 24, 360, "terra-quake", true); }
  });
  M.register("tidal", {
    active(world, self, target, c) { c.radial(world, self, target, 170, 9, 320, "tidal-wave"); c.zone(world, self, target, { kind: "water", radius: 150, life: 5, power: 1, color: self.color }); return 7; },
    update(world, self, target, dt) { self.elasticity = Math.min(1.08, self.elasticity + dt * 0.02); },
    ultimate(world, self, target, c) { c.zone(world, self, target, { kind: "water", radius: 300, life: 8, power: 1, color: self.glowColor }); c.radial(world, self, target, 320, 18, 450, "tidal-flood", true); }
  });
  M.register("acid", {
    active(world, self, target, c) { c.zone(world, self, target, { kind: "acid", radius: 95, life: 6, power: 3, color: self.color }); return 7.5; },
    event(world, self, target, event) { if (event.type === "damage" && target) { target.elementStacks ||= {}; target.elementStacks.acid = Math.min(6, (target.elementStacks.acid || 0) + 1); target.armor = Math.max(0, target.armor - 0.8); target.shield = Math.max(0, target.shield - 2.5); } },
    ultimate(world, self, target, c) { for (let i = 0; i < 5; i += 1) c.zone(world, self, target, { kind: "acid", x: c.random.range(100, 860), y: c.random.range(90, 450), radius: 80, life: 7, power: 3.8, color: self.glowColor }); }
  });
  M.register("sonic", {
    update(world, self) { self.damage = self.baseDamage * (1 + Math.min(0.35, self.currentSpeed() / self.maxSpeed * 0.22)); },
    active(world, self, target, c) { const removed = c.removeProjectiles(self, 130); c.radial(world, self, target, 160, 10 + removed * 1.5, 360, "sonic-cone"); return 6.5; },
    event(world, self, target, event) { if (event.type === "wall") self.nextImpactMultiplier = Math.max(self.nextImpactMultiplier, 1.25); },
    ultimate(world, self, target, c) { c.removeProjectiles(self, 500); c.radial(world, self, target, 330, 30, 560, "sonic-boom", true); }
  });
  M.register("eclipse", {
    spawn(world, self) { self.characterState.mode = 0; },
    update(world, self, target, dt, c) { if (self.characterState.mode === 0) { c.heal(self, 1.3 * dt); if (self.characterState.data.dual) self.addShield(1.2 * dt); } else { self.setStatus("haste", 0.15, 0.2); self.damage = self.baseDamage * 1.2; } },
    active(world, self, target, c) { self.characterState.mode ^= 1; if (self.characterState.mode === 0) c.clearControls(self); else self.nextImpactMultiplier = 1.35; return 5; },
    ultimate(world, self, target, c) { self.characterState.data.dual = true; self.setStatus("haste", 7, 0.28); c.heal(self, self.maxHealth * 0.18); c.schedule(world, 7, () => { self.characterState.data.dual = false; self.damage = self.baseDamage; }); }
  });
}());
