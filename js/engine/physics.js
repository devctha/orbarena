(function () {
  "use strict";
  const OA = window.OrbArena;

  class PhysicsSystem {
    constructor(random, combat, projectiles) {
      this.random = random;
      this.combat = combat;
      this.projectiles = projectiles;
      this.bounds = OA.CONFIG.arena;
    }

    update(world, dt) {
      const fighters = [world.player, world.enemy];
      for (const fighter of fighters) {
        const fighterScale = world.timeScales?.fighter[fighter.team] || 1;
        const abilityScale = world.timeScales?.ability[fighter.team] || 1;
        fighter.beginFrame();
        fighter.tick(dt * fighterScale, dt * abilityScale);
      }
      const peakSpeed = Math.max(...fighters.map((fighter) => fighter.currentSpeed()));
      const substeps = this.chooseSubsteps(peakSpeed, world.physics.maxSubsteps);
      world.physicsStats.substeps = substeps;
      const step = dt / substeps;

      for (let index = 0; index < substeps; index += 1) {
        for (const fighter of fighters) {
          const fighterStep = step * (world.timeScales?.fighter[fighter.team] || 1);
          fighter.forceX = 0;
          fighter.forceY = 0;
          if (world.phase === "active") this.steer(world, fighter, fighter === world.player ? world.enemy : world.player, fighterStep);
          this.applyEnvironment(world, fighter);
          this.integrate(world, fighter, fighterStep);
        }
        this.resolveFighterCollision(world);
        for (const fighter of fighters) {
          this.resolveWalls(world, fighter);
          world.arenaSystem?.resolveObstacles(world, fighter);
          this.limitSafety(world, fighter);
        }
      }

      for (const fighter of fighters) {
        const speed = fighter.currentSpeed();
        fighter.telemetry.maxSpeed = Math.max(fighter.telemetry.maxSpeed, speed);
        if (speed >= fighter.maxSpeed * 0.96) fighter.telemetry.timeAtMaxSpeed += dt;
        fighter.angularVelocity *= Math.pow(0.16, dt);
        fighter.rotation += (fighter.angularVelocity + speed / Math.max(18, fighter.radius) * 0.34) * dt;
        fighter.distance += Math.hypot(fighter.x - fighter.previousX, fighter.y - fighter.previousY);
        if (fighter.perkEffects.sizeAtSpeed) fighter.radius = fighter.baseRadius * (1 + OA.clamp(speed / fighter.maxSpeed - 0.6, 0, 1) * fighter.perkEffects.sizeAtSpeed);
        else fighter.radius += (fighter.baseRadius - fighter.radius) * Math.min(1, dt * 6);
        fighter.pushTrail();
      }
    }

    chooseSubsteps(speed, maximum) {
      const desired = speed < 250 ? 1 : speed < 420 ? 2 : speed < 650 ? 4 : speed < 850 ? 6 : 8;
      return OA.clamp(desired, 1, maximum || 8);
    }

    steer(world, fighter, target, dt) {
      if (fighter.ai.disabled) return;
      if (!fighter.alive || fighter.stunTimer > 0 || fighter.status.frozen > 0) return;
      const decoy = world.effects?.find((effect) => effect.type === "clone" && effect.owner.team === target.team && effect.life > 0);
      const aimX = decoy && this.random.chance(0.35) ? decoy.x : target.x;
      const aimY = decoy && this.random.chance(0.35) ? decoy.y : target.y;
      const toTarget = OA.Vector.normalize(aimX - fighter.x, aimY - fighter.y);
      const distance = toTarget.length;

      if (fighter.ai.decisionTimer <= 0) {
        fighter.ai.decisionTimer = this.random.range(0.22, 0.68);
        if (this.random.chance(0.28)) fighter.ai.orbit *= -1;
        if (this.random.chance(0.56 * fighter.ai.aggression)) fighter.ai.burstTimer = this.random.range(0.16, 0.42);
        fighter.ai.wallIntent = this.random.chance(0.12 * (fighter.ai.wallPreference || 1)) && fighter.currentSpeed() > world.physics.wallBoostThreshold * 0.62 ? this.random.range(0.25, 0.7) : 0;
        fighter.ai.faintTimer=this.random.chance(.18*(fighter.ai.dashPriority||1))?this.random.range(.18,.5):0;
      }
      fighter.ai.wallIntent = Math.max(0, fighter.ai.wallIntent - dt);
      fighter.ai.faintTimer=Math.max(0,(fighter.ai.faintTimer||0)-dt);

      const healthPressure = 1 - fighter.healthRatio();
      let pursuit = distance > fighter.ai.desiredDistance ? 1 : -0.2;
      pursuit -= healthPressure * (fighter.ai.fleeWeight || 0) * 0.72;
      if (target.healthRatio() < 0.28) pursuit += 0.55 * (1 + fighter.ai.risk);
      let orbit = 0.42;
      if (fighter.ai.style === "Agressivo" || fighter.ai.style === "Berserker") { pursuit += 0.48; orbit = 0.2; }
      if (fighter.ai.style === "Cauteloso" && healthPressure > 0.35) { pursuit -= healthPressure * 1.25; orbit = 0.7; }
      if (fighter.ai.style === "Caótico") orbit = 0.68 + Math.sin(world.time * 3 + fighter.ai.phase) * 0.32;
      if (fighter.ai.burstTimer > 0) pursuit += 1.4;
      if (fighter.status.confused > 0) pursuit *= -0.75;

      let desiredX = toTarget.x * pursuit - toTarget.y * fighter.ai.orbit * orbit;
      let desiredY = toTarget.y * pursuit + toTarget.x * fighter.ai.orbit * orbit;
      if(fighter.ai.faintTimer>0){const sign=Math.sin(world.time*12+fighter.ai.faintPhase)>0?1:-1;desiredX+=-toTarget.y*sign*1.35;desiredY+=toTarget.x*sign*1.35;}
      const usefulPowerUp=(world.arena.powerUps||[]).filter(item=>item.active).sort((a,b)=>Math.hypot(a.x-fighter.x,a.y-fighter.y)-Math.hypot(b.x-fighter.x,b.y-fighter.y))[0];
      if(usefulPowerUp&&(fighter.healthRatio()<.58||fighter.characterState?.ultimateCharge<45)){const seek=OA.Vector.normalize(usefulPowerUp.x-fighter.x,usefulPowerUp.y-fighter.y),weight=fighter.healthRatio()<.3?1.35:.55;desiredX+=seek.x*weight;desiredY+=seek.y*weight;}
      const threat = this.findProjectileThreat(fighter);
      if (threat) {
        const projectileDirection = OA.Vector.normalize(threat.vx, threat.vy);
        const evadeSign = OA.Vector.cross(projectileDirection.x, projectileDirection.y, fighter.x - threat.x, fighter.y - threat.y) >= 0 ? 1 : -1;
        desiredX += -projectileDirection.y * evadeSign * 1.5 * (fighter.ai.projectileResponse || 1);
        desiredY += projectileDirection.x * evadeSign * 1.5 * (fighter.ai.projectileResponse || 1);
        fighter.ai.evadeTimer = 0.25;
      }
      if (fighter.ai.wallIntent > 0) {
        const wall = this.nearestWallDirection(world, fighter);
        desiredX += wall.x * 0.85;
        desiredY += wall.y * 0.85;
      }
      if (world.arena?.shape === "circle" && fighter.ai.centerPriority > 0) { const center=OA.Vector.normalize(world.arena.centerX-fighter.x,world.arena.centerY-fighter.y); desiredX+=center.x*fighter.ai.centerPriority*.25;desiredY+=center.y*fighter.ai.centerPriority*.25; }
      const danger=(world.characterZones||[]).find(z=>z.owner.team!==fighter.team&&Math.hypot(fighter.x-z.x,fighter.y-z.y)<z.radius+45);if(danger){const away=OA.Vector.normalize(fighter.x-danger.x,fighter.y-danger.y);desiredX+=away.x*(1.2-fighter.ai.risk*.5);desiredY+=away.y*(1.2-fighter.ai.risk*.5);}
      const wobble = Math.sin(world.time * 2.5 + fighter.ai.phase) * 0.12;
      desiredX += Math.cos(world.time + fighter.ai.phase) * wobble;
      desiredY += Math.sin(world.time * 1.2 + fighter.ai.phase) * wobble;
      const spiral=Math.sin(world.time*(1.4+fighter.ai.risk)+fighter.ai.phase)*.18;desiredX+=-toTarget.y*spiral;desiredY+=toTarget.x*spiral;
      const desired = OA.Vector.normalize(desiredX, desiredY);
      fighter.directionX += (desired.x - fighter.directionX) * Math.min(1, dt * 10);
      fighter.directionY += (desired.y - fighter.directionY) * Math.min(1, dt * 10);

      const statusScale = fighter.status.slow > 0 ? (fighter.statusPower.slow || 0.5) : 1;
      const burstScale = fighter.ai.burstTimer > 0 ? 1.34 : 1;
      const acceleration = fighter.acceleration * world.physics.acceleration * fighter.ai.aggression * statusScale * burstScale;
      fighter.applyForce(desired.x * acceleration * fighter.mass, desired.y * acceleration * fighter.mass);
    }

    findProjectileThreat(fighter) {
      let nearest = null;
      let distance = 150;
      for (const projectile of this.projectiles.pool) {
        if (!projectile.active || projectile.team === fighter.team) continue;
        const current = Math.hypot(projectile.x - fighter.x, projectile.y - fighter.y);
        if (current >= distance) continue;
        const toward = (fighter.x - projectile.x) * projectile.vx + (fighter.y - projectile.y) * projectile.vy;
        if (toward <= 0) continue;
        nearest = projectile;
        distance = current;
      }
      return nearest;
    }

    nearestWallDirection(world, fighter) {
      if (world.arena?.shape === "circle") return OA.Vector.normalize(fighter.x - world.arena.centerX, fighter.y - world.arena.centerY);
      const padding = (world.arena?.padding || this.bounds.padding)+(world.arena?.inset||0);
      const distances = [
        { distance: fighter.x - padding, x: -1, y: 0 },
        { distance: this.bounds.width - padding - fighter.x, x: 1, y: 0 },
        { distance: fighter.y - padding, x: 0, y: -1 },
        { distance: this.bounds.height - padding - fighter.y, x: 0, y: 1 }
      ];
      return distances.sort((a, b) => a.distance - b.distance)[0];
    }

    applyEnvironment(world, fighter) {
      if (!fighter.alive) return;
      fighter.applyForce(0, world.physics.gravity * fighter.mass * (world.arena?.gravitySign || 1));
      world.arenaSystem?.applyForces(world, fighter);
    }

    integrate(world, fighter, dt) {
      if (!fighter.alive) return;
      fighter.ax = fighter.forceX / Math.max(0.2, fighter.mass);
      fighter.ay = fighter.forceY / Math.max(0.2, fighter.mass);
      fighter.vx += fighter.ax * dt;
      fighter.vy += fighter.ay * dt;
      const drag = Math.exp(-(fighter.friction + world.physics.friction) * dt);
      fighter.vx *= drag;
      fighter.vy *= drag;

      let speed = fighter.currentSpeed();
      const intensityCap = world.intensity > 1 ? 1 + (world.intensity - 1) * 0.45 : 1;
      const cap = Math.min(world.physics.maxSpeed, fighter.speedCap(intensityCap), fighter.absoluteMaxSpeed);
      if (speed > cap) {
        const scale = cap / speed;
        fighter.vx *= scale;
        fighter.vy *= scale;
        speed = cap;
      }

      const minimum = Math.min(fighter.maxSpeed * 0.68, world.physics.minSpeed) * (world.intensity > 1.2 ? 1.12 : 1);
      if (speed < minimum) fighter.timeStill += dt; else fighter.timeStill = Math.max(0, fighter.timeStill - dt * 2.5);
      if (fighter.timeStill > 0.28) {
        const fallback = OA.Vector.normalize(fighter.directionX || Math.cos(fighter.ai.phase), fighter.directionY || Math.sin(fighter.ai.phase));
        fighter.applyImpulse(fallback.x * minimum * 0.72, fallback.y * minimum * 0.72, { ignoreResistance: true });
        fighter.timeStill = 0;
        world.events.push({ type: "stalled", fighter });
      }

      fighter.x += fighter.vx * dt;
      fighter.y += fighter.vy * dt;
    }

    resolveFighterCollision(world) {
      const a = world.player;
      const b = world.enemy;
      let contact = OA.Collision.circles(a, b);
      if (!contact) {
        const swept = OA.Collision.sweptCircles(a, b);
        if (swept && swept.t > 0 && swept.t < 1) {
          a.x = OA.lerp(a.previousX, a.x, swept.t);
          a.y = OA.lerp(a.previousY, a.y, swept.t);
          b.x = OA.lerp(b.previousX, b.x, swept.t);
          b.y = OA.lerp(b.previousY, b.y, swept.t);
          contact = OA.Collision.circles(a, b);
        }
      }
      if (!contact || a.status.phased > 0 || b.status.phased > 0) return;
      const driveA = Math.max(0, a.vx * contact.nx + a.vy * contact.ny);
      const driveB = Math.max(0, -(b.vx * contact.nx + b.vy * contact.ny));
      const impact = OA.Collision.resolveCircles(a, b, contact, world.physics.globalElasticity);
      impact.driveA = driveA;
      impact.driveB = driveB;
      this.combat.handleCollision(world, a, b, contact, impact);
      world.physicsStats.collisions += 1;
    }

    resolveWalls(world, fighter) {
      if (world.arena?.shape === "circle") return this.resolveCircularWall(world, fighter);
      const padding = (world.arena?.padding ?? this.bounds.padding)+(world.arena?.inset||0);
      const minX = padding + fighter.radius;
      const maxX = this.bounds.width - padding - fighter.radius;
      const minY = padding + fighter.radius;
      const maxY = this.bounds.height - padding - fighter.radius;
      let nx = 0;
      let ny = 0;
      if (fighter.x < minX) { fighter.x = minX; nx = 1; }
      else if (fighter.x > maxX) { fighter.x = maxX; nx = -1; }
      if (fighter.y < minY) { fighter.y = minY; ny = 1; }
      else if (fighter.y > maxY) { fighter.y = maxY; ny = -1; }
      if (!nx && !ny) return;

      const incomingSpeed = fighter.currentSpeed();
      const wallNormal = OA.Vector.normalize(nx, ny);
      nx = wallNormal.x;
      ny = wallNormal.y;
      const reflected = OA.Vector.reflect(fighter.vx, fighter.vy, nx, ny);
      const retentionBonus = fighter.perkEffects.wallRetention || 0;
      const retention = OA.clamp(world.physics.energyRetention + retentionBonus, 0.82, 1.08);
      const bounce = world.physics.bounceMultiplier * fighter.bounceMultiplier * (fighter.status.superBounce > 0 ? 1.14 : 1);
      fighter.vx = reflected.x * retention * bounce;
      fighter.vy = reflected.y * retention * bounce;
      if (nx) fighter.vy *= world.physics.wallFriction;
      if (ny) fighter.vx *= world.physics.wallFriction;
      const newDirection = OA.Vector.normalize(fighter.vx, fighter.vy);
      const minimumBounce = Math.min(world.physics.maxSpeed, Math.max(world.physics.minSpeed, fighter.minSpeed) * 1.08);
      let speed = fighter.currentSpeed();
      if (speed < minimumBounce) { fighter.vx = newDirection.x * minimumBounce; fighter.vy = newDirection.y * minimumBounce; speed = minimumBounce; }

      const canBoost = incomingSpeed >= world.physics.wallBoostThreshold && fighter.wallCooldown <= 0;
      if (canBoost) {
        const boostedSpeed = Math.min(fighter.absoluteMaxSpeed, world.physics.maxSpeed, speed * world.physics.wallBoost);
        fighter.vx = newDirection.x * boostedSpeed;
        fighter.vy = newDirection.y * boostedSpeed;
        fighter.wallBoostTimer = 0.85 + (fighter.perkEffects.wallBoostDuration || 0);
        fighter.speedTrailTimer = fighter.wallBoostTimer;
        fighter.nextImpactMultiplier = Math.max(fighter.nextImpactMultiplier, fighter._primeWall ? 1.72 : 1.32);
        fighter._primeWall = false;
      }
      fighter.wallCooldown = 0.075;
      fighter.angularVelocity += (nx ? fighter.vy : -fighter.vx) / 90;
      this.combat.handleWallImpact(world, fighter, incomingSpeed, { x: nx, y: ny }, canBoost);
    }

    resolveCircularWall(world, fighter) {
      const arena = world.arena;
      const radial = OA.Vector.normalize(fighter.x - arena.centerX, fighter.y - arena.centerY);
      const limit = arena.radius - fighter.radius;
      if (radial.length <= limit) return;
      fighter.x = arena.centerX + radial.x * limit;
      fighter.y = arena.centerY + radial.y * limit;
      const incomingSpeed = fighter.currentSpeed();
      const nx = -radial.x; const ny = -radial.y;
      const reflected = OA.Vector.reflect(fighter.vx, fighter.vy, nx, ny);
      const retention = OA.clamp(world.physics.energyRetention + (fighter.perkEffects.wallRetention || 0), 0.82, 1.08);
      const bounce = world.physics.bounceMultiplier * fighter.bounceMultiplier * (fighter.status.superBounce > 0 ? 1.14 : 1);
      fighter.vx = reflected.x * retention * bounce; fighter.vy = reflected.y * retention * bounce;
      let speed = fighter.currentSpeed(); const direction = OA.Vector.normalize(fighter.vx, fighter.vy);
      const minimum = Math.min(world.physics.maxSpeed, Math.max(world.physics.minSpeed, fighter.minSpeed) * 1.08);
      if (speed < minimum) { fighter.vx = direction.x * minimum; fighter.vy = direction.y * minimum; speed = minimum; }
      const canBoost = incomingSpeed >= world.physics.wallBoostThreshold && fighter.wallCooldown <= 0;
      if (canBoost) { const boosted = Math.min(fighter.absoluteMaxSpeed, world.physics.maxSpeed, speed * world.physics.wallBoost); fighter.vx = direction.x * boosted; fighter.vy = direction.y * boosted; fighter.wallBoostTimer = 0.85 + (fighter.perkEffects.wallBoostDuration || 0); fighter.speedTrailTimer = fighter.wallBoostTimer; fighter.nextImpactMultiplier = Math.max(fighter.nextImpactMultiplier, fighter._primeWall ? 1.72 : 1.32); fighter._primeWall = false; }
      fighter.wallCooldown = 0.075; fighter.angularVelocity += (nx * fighter.vy - ny * fighter.vx) / 90;
      this.combat.handleWallImpact(world, fighter, incomingSpeed, { x: nx, y: ny }, canBoost);
    }

    limitSafety(world, fighter) {
      const speed = fighter.currentSpeed();
      const limit = Math.min(fighter.absoluteMaxSpeed, world.physics.maxSpeed);
      if (speed <= limit || speed === 0) return;
      const scale = limit / speed;
      fighter.vx *= scale;
      fighter.vy *= scale;
    }
  }

  OA.PhysicsSystem = PhysicsSystem;
}());
