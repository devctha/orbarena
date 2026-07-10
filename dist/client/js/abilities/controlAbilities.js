(function () {
  "use strict";
  const M = window.OrbArena.CharacterMechanics;
  M.register("gravity", {
    update(world, self, target, dt) { const d = window.OrbArena.Vector.normalize(self.x - target.x, self.y - target.y); if (d.length < 260) target.applyForce(d.x * 85 * target.mass, d.y * 85 * target.mass); },
    active(world, self, target, c) { self.mass = self.baseMass * 1.35; c.zone(world, self, target, { kind: "gravity", radius: 140, life: 5, power: 280, color: self.color }); return 8; },
    ultimate(world, self, target, c) { c.zone(world, self, target, { kind: "singularity", radius: 230, life: 6, power: 480, color: self.glowColor }); }
  });
  M.register("repulsor", {
    active(world, self, target, c) { const removed = c.removeProjectiles(self, 150); c.radial(world, self, target, 180, 6, 450, "repulsor-wave"); c.shield(self, 6 + removed * 4); return 6; },
    receive(world, self, attacker, event, c) { if (event.type === "projectile") c.shield(self, 5); },
    ultimate(world, self, target, c) { c.removeProjectiles(self, 500); c.radial(world, self, target, 350, 18, 700, "repulsor-ultimate", true); c.shield(self, 30); }
  });
  M.register("magnet", {
    spawn(world, self) { self.characterState.mode = 0; },
    update(world, self, target, dt) { const d = window.OrbArena.Vector.normalize(target.x - self.x, target.y - self.y); const sign = self.characterState.mode ? -1 : 1; target.applyForce(-d.x * sign * 150 * target.mass, -d.y * sign * 150 * target.mass); },
    active(world, self) { self.characterState.mode ^= 1; return 4.5; },
    ultimate(world, self, target, c) { for (let i = 0; i < 6; i += 1) c.schedule(world, i * 0.55, () => { self.characterState.mode ^= 1; const d = window.OrbArena.Vector.normalize(target.x - self.x, target.y - self.y); target.applyImpulse(d.x * (self.characterState.mode ? -320 : 320), d.y * (self.characterState.mode ? -320 : 320)); }); }
  });
  M.register("chain", {
    active(world, self, target, c) { const d = window.OrbArena.Vector.normalize(self.x - target.x, self.y - target.y); target.applyImpulse(d.x * 370, d.y * 370); target.angularVelocity += 5; return 7; },
    event(world, self, target, event) { if (event.type === "collision") target.setStatus("prison", 0.55, 0.3); },
    ultimate(world, self, target, c) { const d = window.OrbArena.Vector.normalize(self.x - target.x, self.y - target.y); target.applyImpulse(d.x * 520, d.y * 520); target.setStatus("stunned", 0.9); c.zone(world, self, target, { kind: "slow", radius: 85, life: 4, power: 0.36, color: self.color }); }
  });
  M.register("minelayer", {
    active(world, self, target, c) { c.burst(world, self, target, { radial: true, count: 4, kind: "mine", damage: 12, speed: 70, radius: 7, life: 6, knockback: 180, color: self.color }); return 7; },
    event(world, self, target, event, c) { if (event.type === "wall" && c.random.chance(0.35)) c.projectile(world, self, { x: self.x, y: self.y, vx: 0, vy: 0 }, { kind: "mine", damage: 10, speed: 1, radius: 7, life: 5, knockback: 150 }); },
    ultimate(world, self, target, c) { c.burst(world, self, target, { radial: true, count: 12, kind: "mine", damage: 14, speed: 85, radius: 7, life: 8, knockback: 220, color: self.glowColor }); }
  });
  M.register("portal", {
    active(world, self, target, c) { const exitX = 960 - self.x; const exitY = 540 - self.y; c.effect(world, { type: "portal", owner: self, x: self.x, y: self.y, x2: exitX, y2: exitY, life: 5, color: self.color }); c.teleport(world, self, exitX, exitY); return 8; },
    event(world, self, target, event, c) { if (event.type === "projectile" && c.random.chance(0.25)) { const vx = target.vx; target.vx = -target.vy; target.vy = vx; } },
    ultimate(world, self, target, c) { for (let i = 0; i < 3; i += 1) c.schedule(world, i * 0.25, () => c.teleport(world, target, c.random.range(40, 920), c.random.range(40, 500))); target.nextImpactMultiplier = 1.4; }
  });
  M.register("singularity", {
    active(world, self, target, c) { c.zone(world, self, target, { kind: "singularity", radius: 115, life: 4.5, power: 330, color: self.color }); return 9; },
    update(world, self, target, dt) { const d = window.OrbArena.Vector.normalize(480 - self.x, 270 - self.y); self.applyForce(d.x * 20 * self.mass, d.y * 20 * self.mass); },
    ultimate(world, self, target, c) { c.zone(world, self, { x: 480, y: 270 }, { kind: "singularity", x: 480, y: 270, radius: 270, life: 7, power: 560, color: self.glowColor }); }
  });
  M.register("mist", {
    active(world, self, target, c) { c.zone(world, self, self, { kind: "mist", at: "self", radius: 145, life: 6, power: 1, color: self.color }); return 8; },
    update(world, self, target, dt, c) { if (world.characterZones.some((z) => z.owner === self && z.kind === "mist" && Math.hypot(self.x - z.x, self.y - z.y) < z.radius)) self.invulnerability = Math.max(self.invulnerability, 0.02); },
    ultimate(world, self, target, c) { c.zone(world, self, self, { kind: "mist", at: "self", radius: 330, life: 8, power: 1, color: self.glowColor }); for (let i = 0; i < 3; i += 1) c.schedule(world, i * 0.7, () => c.teleport(world, self, self.x + c.random.range(-100, 100), self.y + c.random.range(-100, 100))); }
  });
}());
