(function () {
  "use strict";
  const OA = window.OrbArena;

  class ArenaSystem {
    constructor(random, particles, audio) { this.random = random; this.particles = particles; this.audio = audio; }

    create(presetId, arenaId = "classic", size = OA.ARENA_SIZES?.small) {
      const definition = OA.getArenaDefinition(arenaId);
      const width = size?.width || OA.CONFIG.arena.width, height = size?.height || OA.CONFIG.arena.height, sx = width / OA.CONFIG.arena.width, sy = height / OA.CONFIG.arena.height;
      const circular = definition.shape === "circle";
      const platforms = circular ? Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        return { x: width/2 + Math.cos(angle) * 148 * Math.min(sx,sy), y: height/2 + Math.sin(angle) * 148 * Math.min(sx,sy), radius: index % 2 ? 23 : 28, functional: index % 2 === 0, baseAngle: angle };
      }) : [];
      const bumpers = circular ? platforms.filter((item) => item.functional).map((item, index) => ({ ...item, phase: index * Math.PI * 2 / 3, orbit: 148 })) : [
        { x: 330, y: 190, radius: 25, baseX: 330, baseY: 190, phase: 0 },
        { x: 630, y: 350, radius: 25, baseX: 630, baseY: 350, phase: Math.PI }
      ];
      return {
        ...definition, definition, width, height, name: definition.name, centerX: width/2, centerY: height/2,
        padding: OA.CONFIG.arena.padding, gravitySign: 1, gravityTimer: 0, rotationForce: 0,
        rotationTimer: 0, angle: 0, damageTick: 0, inset:0, borderPulse:0, impactMarks:[], platforms, bumpers,
        powerUps: [0,1,2,3,4,5].map((index) => ({ x: (230 + index * 100)*sx, y: (index % 2 ? 405 : 135)*sy, radius: 10, active: false, kind: ["heal","shield","haste","damage","cooldown","ultimate"][index], respawn: 7 + index * 3 })),
        portals: [], portalCooldown: { player: 0, enemy: 0 },
        speedZones: circular ? [{ x: 370, y: 270, radius: 42, dx: 0, dy: -1 }, { x: 590, y: 270, radius: 42, dx: 0, dy: 1 }] : [{ x: 205, y: 270, radius: 42, dx: 1, dy: 0 }, { x: 755, y: 270, radius: 42, dx: -1, dy: 0 }]
      };
    }

    update(world, dt) {
      const arena = world.arena;
      const pacing=world.pacing||{escalationEnd:40,suddenDeathAt:60};
      this.updateObjective(world, dt);
      arena.borderPulse=Math.max(0,arena.borderPulse-dt*2.2);for(const mark of arena.impactMarks)mark.life-=dt;arena.impactMarks=arena.impactMarks.filter(mark=>mark.life>0);
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
      for (const team of new Set(OA.getFighters(world).map((fighter)=>fighter.team))) arena.portalCooldown[team] = Math.max(0, (arena.portalCooldown[team] || 0) - dt);
      for (const powerUp of arena.powerUps) {
        if (!powerUp.active) { powerUp.respawn -= dt * (world.rules?.powerUps || 1); if (powerUp.respawn <= 0) powerUp.active = true; continue; }
        for (const fighter of OA.getFighters(world)) if (fighter.alive && Math.hypot(fighter.x - powerUp.x, fighter.y - powerUp.y) < fighter.radius + powerUp.radius) {
          if (powerUp.kind === "heal") fighter.heal(18);
          if (powerUp.kind === "haste") fighter.setStatus("haste", 4, 0.3);
          if (powerUp.kind === "shield") fighter.addShield(24);
          if (powerUp.kind === "damage") fighter.nextImpactMultiplier=Math.max(fighter.nextImpactMultiplier,1.3);
          if (powerUp.kind === "cooldown") for(const id of Object.keys(fighter.abilityCooldowns))fighter.abilityCooldowns[id]*=.68;
          if (powerUp.kind === "cleanse") for(const id of ["stunned","frozen","slow","silenced","prison","confused"])fighter.status[id]=0;
          if (powerUp.kind === "clone") world.effects.push({type:"clone",owner:fighter,x:fighter.x,y:fighter.y,angle:0,life:5,color:fighter.color});
          if (powerUp.kind === "bounce") fighter.setStatus("superBounce",5,1.15);
          if (powerUp.kind === "wallBoost") fighter.wallBoostTimer=Math.max(fighter.wallBoostTimer,3);
          if (powerUp.kind === "ultimate" && fighter.characterState) fighter.characterState.ultimateCharge = Math.min(100, fighter.characterState.ultimateCharge + 24);
          fighter.telemetry.powerUpsCollected+=1;this.particles.emitAbility(powerUp.x,powerUp.y,{heal:"#74e69a",shield:"#69c9ff",haste:"#f2cf65",damage:"#ff8a68",cooldown:"#78d8ff",ultimate:"#ba79ef"}[powerUp.kind]||"#c4f4ff","powerUp");powerUp.active=false;powerUp.kind=this.random.pick(["heal","shield","haste","damage","cooldown","ultimate","cleanse","clone","bounce","wallBoost"]);powerUp.respawn=14+this.random.range(0,8);world.events.push({type:"powerUp",fighter,kind:powerUp.kind});
        }
      }
      arena.portals.forEach((portal) => { portal.life -= dt; });
      arena.portals = arena.portals.filter((portal) => portal.life > 0);
      if (arena.shape === "circle" && world.battlePhase === "climax") {
        const progress = OA.clamp((world.time - pacing.escalationEnd) / Math.max(1,pacing.suddenDeathAt-pacing.escalationEnd), 0, 1);
        arena.radius = OA.lerp(arena.definition.radius, arena.definition.radius - 34, progress);
      }
      if(arena.shape!=="circle")arena.inset=world.battlePhase==="climax"?OA.lerp(0,18,OA.clamp((world.time-pacing.escalationEnd)/Math.max(1,pacing.suddenDeathAt-pacing.escalationEnd),0,1)):world.suddenDeath?Math.min(34,18+(world.time-pacing.suddenDeathAt)*.5):0;
      if (world.suddenDeath) {
        arena.damageTick -= dt;
        if (arena.damageTick <= 0) { arena.damageTick = 1; for (const fighter of OA.getFighters(world)) if(fighter.alive) fighter.applyDamage(1.1 + (world.time - pacing.suddenDeathAt) * 0.06, { source: "ability", dot: true, ignoreArmor: true }); }
      }
    }

    updateObjective(world, dt) {
      if (!["score", "objective"].includes(world.match?.victory)) return;
      world.objective ||= { x: world.arena.centerX, y: world.arena.centerY, radius: 105, scores: Object.create(null), contested: false };
      const occupants = OA.getFighters(world, true).filter((fighter)=>Math.hypot(fighter.x-world.objective.x,fighter.y-world.objective.y)<=world.objective.radius+fighter.radius), teams = new Set(occupants.map((fighter)=>fighter.teamId));
      world.objective.contested = teams.size > 1;
      if (teams.size !== 1) return;
      const teamId=[...teams][0], gain=dt*(world.mode==="domination"?1.35:1); world.objective.scores[teamId]=(world.objective.scores[teamId]||0)+gain;
      for(const fighter of occupants)fighter.telemetry.objectives=(fighter.telemetry.objectives||0)+gain;
      if(world.objective.scores[teamId]>=world.match.scoreLimit)world.objectiveWinner=teamId;
    }

    applyForces(world, fighter) {
      const arena = world.arena;
      for (const zone of arena.speedZones) if (Math.hypot(fighter.x - zone.x, fighter.y - zone.y) < zone.radius + fighter.radius) {
        fighter.applyForce(zone.dx * 360 * fighter.mass, zone.dy * 360 * fighter.mass);
        fighter.speedTrailTimer = Math.max(fighter.speedTrailTimer, 0.12);
      }
      if (world.suddenDeath) {
        const toward = OA.Vector.normalize(arena.centerX - fighter.x, arena.centerY - fighter.y);
        const force = (150 + (world.time - (world.pacing?.suddenDeathAt||60)) * 7) * arena.gravitySign;
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
