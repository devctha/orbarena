(function () {
  "use strict";
  const M = window.OrbArena.CharacterMechanics;
  const spawnMany = (world, self, c, count, options) => { for (let i = 0; i < count; i += 1) c.summon(world, self, { ...options, angle: Math.PI * 2 * i / count }); };

  M.register("echo", {
    active(world, self, target, c) { c.clone(world, self, { life: 6, healthRatio: 0.28, damageRatio: 0.48, blockProjectiles: true, explosion: 8 }); return 8; },
    event(world, self, target, event, c) { if (event.type === "criticalTaken" && c.random.chance(0.35)) c.clone(world, self, { life: 3.5, scale: 0.55, limit: 2 }); },
    ultimate(world, self, target, c) { for (let i = 0; i < 3; i += 1) c.clone(world, self, { life: 7, healthRatio: 0.2, damageRatio: 0.38, scale: 0.58, limit: 4, explosion: 10 }); }
  });
  M.register("hydra", {
    spawn(world, self) { self.characterState.data.threshold = 0.78; },
    active(world, self, target, c) { spawnMany(world, self, c, 2, { kind: "hydra-head", life: 6, scale: 0.5, health: self.maxHealth * 0.16, damage: self.damage * 0.38, limit: 4 }); return 9; },
    receive(world, self, attacker, event, c) { if (event.type === "damage" && self.healthRatio() <= self.characterState.data.threshold) { self.characterState.data.threshold -= 0.24; spawnMany(world, self, c, 2, { kind: "hydra-head", life: 5, scale: 0.46, health: self.maxHealth * 0.13, damage: self.damage * 0.34, limit: 4 }); } },
    ultimate(world, self, target, c) { spawnMany(world, self, c, 4, { kind: "hydra-head", life: 8, scale: 0.52, health: self.maxHealth * 0.18, damage: self.damage * 0.42, limit: 4 }); }
  });
  M.register("orbit", {
    active(world, self, target, c) { c.summon(world, self, { kind: "satellite", behavior: "orbit", life: 9, scale: 0.34, health: 22, damage: 7, projectile: { damage: 6, speed: 510, cooldown: 0.8 }, blockProjectiles: true, limit: 5 }); return 7; },
    event(world, self, target, event, c) { if (event.type === "blocked") c.shield(self, 4); },
    ultimate(world, self, target, c) { const current = world.summons.filter((s) => s.active && s.owner === self && s.kind === "satellite").length; spawnMany(world, self, c, Math.max(3, current), { kind: "satellite", behavior: "orbit", life: 7, scale: 0.32, health: 18, projectile: { damage: 7, speed: 560, cooldown: 0.58 }, blockProjectiles: true, limit: 8 }); }
  });
  M.register("swarm", {
    active(world, self, target, c) { spawnMany(world, self, c, 4, { kind: "swarm", life: 5, scale: 0.25, health: 8, damage: 5, speed: 330, limit: 8 }); return 7; },
    receive(world, self, attacker, event, c) { if (event.type === "damage" && c.random.chance(0.2)) c.summon(world, self, { kind: "swarm", behavior: "orbit", life: 3, scale: 0.22, health: 6, blockProjectiles: true, limit: 8 }); },
    ultimate(world, self, target, c) { spawnMany(world, self, c, 8, { kind: "swarm", life: 8, scale: 0.26, health: 10, damage: 6, speed: 360, limit: 10 }); }
  });
  M.register("drone", {
    active(world, self, target, c) { c.summon(world, self, { kind: "attack-drone", behavior: "orbit", life: 9, scale: 0.34, health: 20, projectile: { damage: 7, speed: 530, cooldown: 0.62 }, limit: 5 }); return 7.5; },
    update(world, self, target, dt, c) { if (self.characterState.mode === 1) c.impulse(self, -target.y + self.y, target.x - self.x, dt * 18); },
    ultimate(world, self, target, c) { spawnMany(world, self, c, 5, { kind: "attack-drone", behavior: "orbit", life: 8, scale: 0.36, health: 24, projectile: { damage: 9, speed: 590, cooldown: 0.38 }, limit: 8 }); }
  });
  M.register("necro", {
    active(world, self, target, c) { const gravePower = Math.min(1.4, 0.7 + self.characterState.data.graves * 0.12); c.summon(world, self, { kind: "necro-echo", life: 7, scale: 0.58, health: self.maxHealth * 0.18, damage: self.damage * gravePower * 0.45, limit: 4 }); self.characterState.data.graves = Math.max(0, (self.characterState.data.graves || 0) - 1); return 8.5; },
    event(world, self, target, event) { if ((event.type === "projectile" || event.type === "damage") && event.target && !event.target.alive) self.characterState.data.graves = Math.min(5, (self.characterState.data.graves || 0) + 1); },
    ultimate(world, self, target, c) { spawnMany(world, self, c, 4, { kind: "necro-echo", life: 9, scale: 0.55, health: 28, damage: self.damage * 0.5, limit: 6, linked: false }); }
  });
  M.register("bloom", {
    active(world, self, target, c) { const explosive = self.characterState.mode++ % 3 === 2; c.summon(world, self, { kind: explosive ? "blast-flower" : "healing-flower", behavior: "stationary", x: self.x, y: self.y, life: 8, scale: 0.42, health: 20, healAura: explosive ? 0 : 4.2, explodeOnDeath: explosive ? 18 : 0, limit: 6 }); return 6.5; },
    update(world, self, target, dt, c) { if (world.summons.some((s) => s.active && s.owner === self && s.healAura)) self.characterState.meter = Math.min(100, self.characterState.meter + dt * 4); },
    ultimate(world, self, target, c) { for (let i = 0; i < 6; i += 1) c.summon(world, self, { kind: i % 2 ? "blast-flower" : "healing-flower", behavior: "stationary", angle: Math.PI * 2 * i / 6, offset: 80, life: 10, scale: 0.44, health: 24, healAura: i % 2 ? 0 : 5, explodeOnDeath: i % 2 ? 22 : 0, limit: 8 }); }
  });
}());
