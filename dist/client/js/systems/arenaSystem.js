(function () {
  "use strict";
  const OA = window.OrbArena;

  class ArenaSystem {
    constructor(random, particles, audio) { this.random = random; this.particles = particles; this.audio = audio; }

    create(presetId, arenaId = "classic") {
      const definition = OA.getArenaDefinition(arenaId);
      const circular = definition.shape === "circle";
      const platforms = circular ? Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        return { x: 480 + Math.cos(angle) * 148, y: 270 + Math.sin(angle) * 148, radius: index % 2 ? 23 : 28, functional: index % 2 === 0, baseAngle: angle };
      }) : [];
      const bumpers = circular ? platforms.filter((item) => item.functional).map((item, index) => ({ ...item, phase: index * Math.PI * 2 / 3, orbit: 148 })) : [
        { x: 330, y: 190, radius: 25, baseX: 330, baseY: 190, phase: 0 },
        { x: 630, y: 350, radius: 25, baseX: 630, baseY: 350, phase: Math.PI }
      ];
      return {
        ...definition, definition, name: definition.name, centerX: 480, centerY: 270,
        padding: OA.CONFIG.arena.padding, gravitySign: 1, gravityTimer: 0, rotationForce: 0,
        rotationTimer: 0, angle: 0, damageTick: 0, platforms, bumpers,
        powerUps: [0, 1, 2, 3].map((index) => ({ x: 300 + index * 120, y: index % 2 ? 390 : 150, radius: 10, active: false, kind: ["heal", "haste", "shield", "ultimate"][index], respawn: 5 + index * 2 })),
        portals: [], portalCooldown: { player: 0, enemy: 0 },
        speedZones: circular ? [{ x: 370, y: 270, radius: 42, dx: 0, dy: -1 }, { x: 590, y: 270, radius: 42, dx: 0, dy: 1 }] : [{ x: 205, y: 270, radius: 42, dx: 1, dy: 0 }, { x: 755, y: 270, radius: 42, dx: -1, dy: 0 }]
      };
    }

    update(world, dt) {
      const arena = world.arena;
      arena.angle += dt * (world.physics.id === "pinball" ? 1.25 : 0.72);
      arena.gravityTimer = Math.max(0, arena.gravityTimer - dt);
      arena.rotationTimer = Math.max(0, arena.rotationTimer - dt);
      if (arena.gravityTimer <= 0) arena.gravitySign = 1;
      if (arena.rotationTimer <= 0) arena.rotationForce += (0 - arena.rotationForce) * Math.min(1, dt * 2);
      arena.bumpers.forEach((bumper, index) => {
        if (arena.shape === "circle") {
          bumper.x = arena.centerX + Math.cos(bumper.baseAngle + arena.angle * 0.12) * bumper.orbit;
          bumper.y = arena.centerY + Math.sin(bumper.baseAngle + arena.angle * 0.12) * bumper.orbit;
        } else {
          bumper.x = bumper.baseX + Math.cos(arena.angle * 0.35 + index * Math.PI) * 35;
          bumper.y = bumper.baseY + Math.sin(arena.angle * 0.28 + index * Math.PI) * 28;
        }
      });
      for (const team of ["player", "enemy"]) arena.portalCooldown[team] = Math.max(0, arena.portalCooldown[team] - dt);
      for (const powerUp of arena.powerUps) {
        if (!powerUp.active) { powerUp.respawn -= dt; if (powerUp.respawn <= 0) powerUp.active = true; continue; }
        for (const fighter of [world.player, world.enemy]) if (Math.hypot(fighter.x - powerUp.x, fighter.y - powerUp.y) < fighter.radius + powerUp.radius) {
          if (powerUp.kind === "heal") fighter.heal(18);
          if (powerUp.kind === "haste") fighter.setStatus("haste", 4, 0.3);
          if (powerUp.kind === "shield") fighter.addShield(24);
          if (powerUp.kind === "ultimate" && fighter.characterState) fighter.characterState.ultimateCharge = Math.min(100, fighter.characterState.ultimateCharge + 24);
          powerUp.active = false; powerUp.respawn = 12; world.events.push({ type: "powerUp", fighter, kind: powerUp.kind });
        }
      }
      arena.portals.forEach((portal) => { portal.life -= dt; });
      arena.portals = arena.portals.filter((portal) => portal.life > 0);
      if (arena.shape === "circle" && world.time >= OA.CONFIG.battle.arenaShiftAt) {
        const progress = OA.clamp((world.time - OA.CONFIG.battle.arenaShiftAt) / 22, 0, 1);
        arena.radius = OA.lerp(arena.definition.radius, arena.definition.radius - 34, progress);
      }
      if (world.suddenDeath) {
        arena.damageTick -= dt;
        if (arena.damageTick <= 0) { arena.damageTick = 1; for (const fighter of [world.player, world.enemy]) fighter.applyDamage(1.4 + (world.time - OA.CONFIG.battle.suddenDeathAt) * 0.09, { source: "ability", dot: true, ignoreArmor: true }); }
      }
    }

    applyForces(world, fighter) {
      const arena = world.arena;
      for (const zone of arena.speedZones) if (Math.hypot(fighter.x - zone.x, fighter.y - zone.y) < zone.radius + fighter.radius) {
        fighter.applyForce(zone.dx * 360 * fighter.mass, zone.dy * 360 * fighter.mass);
        fighter.speedTrailTimer = Math.max(fighter.speedTrailTimer, 0.12);
      }
      if (world.suddenDeath) {
        const toward = OA.Vector.normalize(arena.centerX - fighter.x, arena.centerY - fighter.y);
        const force = (160 + (world.time - OA.CONFIG.battle.suddenDeathAt) * 9) * arena.gravitySign;
        fighter.applyForce(toward.x * force * fighter.mass, toward.y * force * fighter.mass);
      }
      if (arena.rotationForce) {
        const radial = OA.Vector.normalize(fighter.x - arena.centerX, fighter.y - arena.centerY);
        fighter.applyForce(-radial.y * arena.rotationForce * fighter.mass, radial.x * arena.rotationForce * fighter.mass);
      }
    }

    resolveObstacles(world, fighter) {
      for (const bumper of world.arena.bumpers) {
        const contact = OA.Collision.circleStatic(fighter, bumper); if (!contact) continue;
        const impact = OA.Collision.resolveStatic(fighter, contact, 1.08 * world.physics.globalElasticity);
        if (impact > 22 && fighter.wallCooldown <= 0) {
          fighter.wallCooldown = 0.06; fighter.angularVelocity += impact / 60; fighter.telemetry.wallBounces += 1;
          this.particles.emitImpact(fighter.x - contact.nx * fighter.radius, fighter.y - contact.ny * fighter.radius, fighter.color, impact, contact.nx, contact.ny);
          this.audio.wall(impact, false); world.events.push({ type: "wall", fighter, speed: impact, boosted: false, normal: { x: contact.nx, y: contact.ny } });
        }
      }
    }
  }
  OA.ArenaSystem = ArenaSystem;
}());
