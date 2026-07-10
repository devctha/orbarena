(function () {
  "use strict";
  const M = window.OrbArena.CharacterMechanics;
  M.register("chronos", {
    update(world, self, target, dt, c) { const distance = Math.hypot(target.x - self.x, target.y - self.y); const factor = Math.max(0.52, 1 - self.characterState.meter * 0.0035); if (distance < 190) { self.characterState.meter = Math.min(100, self.characterState.meter + dt * 9); c.slowFighter(target.team, factor, 0.18, self); c.slowProjectiles(target.team, factor * 0.8, 0.18, self); c.slowAbilities(target.team, Math.max(0.6, factor), 0.18, self); } else self.characterState.meter = Math.max(0, self.characterState.meter - dt * 4); },
    active(world, self, target, c) { c.slowFighter(target.team, 0.42, 3.2, self); c.slowProjectiles(target.team, 0.2, 3.2, self); return 10; },
    ultimate(world, self, target, c) { c.slowFighter(target.team, 0.14, 2.2, self); c.slowProjectiles(target.team, 0.06, 2.2, self); c.slowAbilities(target.team, 0.25, 2.2, self); c.slowGame(0.72, 1.1, self); }
  });
  M.register("rewind", {
    spawn(world, self) { self.characterState.snapshot = { x: self.x, y: self.y, vx: self.vx, vy: self.vy, health: self.health }; self.characterState.data.recordTimer = 0; },
    update(world, self, target, dt) { self.characterState.data.recordTimer -= dt; if (self.characterState.data.recordTimer <= 0) { self.characterState.data.recordTimer = 3.8; self.characterState.snapshot = { x: self.x, y: self.y, vx: self.vx, vy: self.vy, health: self.health }; } },
    active(world, self, target, c) { const s = self.characterState.snapshot; if (s) { c.teleport(world, self, s.x, s.y); self.vx = s.vx; self.vy = s.vy; self.health = Math.min(self.maxHealth, Math.max(self.health, s.health)); c.clearControls(self); } return 11; },
    ultimate(world, self, target, c) { const s = self.characterState.snapshot; if (s) { c.teleport(world, self, s.x, s.y); self.health = Math.min(self.maxHealth, Math.max(self.health, s.health + self.maxHealth * 0.15)); c.clearControls(self); self.invulnerability = 0.65; } }
  });
  M.register("clockwork", {
    update(world, self, target, dt, c) { self.characterState.data.pulse = (self.characterState.data.pulse || 0) - dt; if (self.characterState.data.pulse <= 0) { self.characterState.data.pulse = 2.4; self.characterState.mode ^= 1; if (self.characterState.mode) { self.setStatus("haste", 1.2, 0.2); c.slowProjectiles(self.team, 1.2, 1.2, self); } else { c.slowAbilities(target.team, 0.65, 1.2, self); c.slowProjectiles(target.team, 0.72, 1.2, self); } } },
    active(world, self, target, c) { for (const id of Object.keys(self.abilityCooldowns)) self.abilityCooldowns[id] *= 0.78; c.slowAbilities(target.team, 0.55, 2.5, self); return 8; },
    ultimate(world, self, target, c) { self.setStatus("haste", 5, 0.45); c.slowFighter(target.team, 0.55, 5, self); c.slowProjectiles(target.team, 0.42, 5, self); }
  });
  M.register("stasis", {
    active(world, self, target, c) { c.zone(world, self, target, { kind: "stasis", radius: 130, life: 4.5, power: 0.35, color: self.glowColor }); return 10; },
    receive(world, self, attacker, event, c) { if (event.type === "projectile" && c.random.chance(0.3)) c.slowProjectiles(attacker.team, 0.08, 1.2, self); },
    ultimate(world, self, target, c) { c.zone(world, self, target, { kind: "stasis", radius: 230, life: 4, power: 0.12, color: self.glowColor }); c.slowAbilities(target.team, 0.3, 4, self); }
  });
}());
