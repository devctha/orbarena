(function () {
  "use strict";
  const OA = window.OrbArena;

  class ProjectileSystem {
    constructor(random, combat, particles, audio, capacity = 96) {
      this.random = random;
      this.combat = combat;
      this.particles = particles;
      this.audio = audio;
      this.pool = Array.from({ length: capacity }, () => new OA.Projectile());
      this.cursor = 0;
      this.sequence = 0;
    }

    acquire() {
      for (let offset = 0; offset < this.pool.length; offset += 1) {
        const index = (this.cursor + offset) % this.pool.length;
        if (!this.pool[index].active) { this.cursor = (index + 1) % this.pool.length; return this.pool[index]; }
      }
      const recycled = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      return recycled;
    }

    spawn(options) {
      if (options.kind === "mine") { const mines=this.pool.filter(p=>p.active&&p.kind==="mine"),limit=OA.CHARACTER_LIMITS?.maxMines||16; if(mines.length>=limit)mines[0].active=false; }
      const projectile = this.acquire().reset({ ...options, id: `p-${this.sequence += 1}` });
      projectile.owner.telemetry.projectilesFired += 1;
      return projectile;
    }

    update(world, dt) {
      const bounds = this.getBounds(world);
      for (const projectile of this.pool) {
        if (!projectile.active) continue;
        const projectileDt = dt * (world.timeScales?.projectile[projectile.team] || 1);
        projectile.life -= projectileDt;
        projectile.armTimer = Math.max(0, projectile.armTimer - projectileDt);
        if (projectile.life <= 0) { projectile.active = false; continue; }
        const target = projectile.team === "player" ? world.enemy : world.player;
        if (!target.alive) { projectile.active = false; continue; }

        projectile.previousX = projectile.x;
        projectile.previousY = projectile.y;
        if (projectile.homing > 0 && projectile.armTimer <= 0) this.applyHoming(projectile, target, projectileDt);
        projectile.vx += projectile.ax * projectileDt;
        projectile.vy += projectile.ay * projectileDt;
        const speed = Math.hypot(projectile.vx, projectile.vy);
        const substeps = OA.clamp(Math.ceil(speed * projectileDt / Math.max(2, projectile.radius * 0.7)), 1, 8);
        const step = projectileDt / substeps;
        for (let i = 0; i < substeps && projectile.active; i += 1) {
          const fromX = projectile.x;
          const fromY = projectile.y;
          projectile.x += projectile.vx * step;
          projectile.y += projectile.vy * step;
          if (this.resolveWall(projectile, bounds)) continue;
          if (projectile.armTimer > 0 || projectile.hitTargets.has(target.id)) continue;
          const hit = OA.Collision.segmentCircle(fromX, fromY, projectile.x, projectile.y, target.x, target.y, target.radius + projectile.radius);
          if (hit) this.hit(world, projectile, target, hit);
        }
        projectile.rotation = Math.atan2(projectile.vy, projectile.vx);
      }
    }

    applyHoming(projectile, target, dt) {
      const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x);
      const current = Math.atan2(projectile.vy, projectile.vx);
      const turn = OA.clamp(OA.Vector.angleDifference(current, desired), -projectile.homing * dt, projectile.homing * dt);
      const rotated = OA.Vector.rotate(projectile.vx, projectile.vy, turn);
      projectile.vx = rotated.x;
      projectile.vy = rotated.y;
    }

    resolveWall(projectile, bounds) {
      if (bounds.shape === "circle") {
        const radial = OA.Vector.normalize(projectile.x - bounds.centerX, projectile.y - bounds.centerY);
        const limit = bounds.radius - projectile.radius;
        if (radial.length <= limit) return false;
        projectile.x = bounds.centerX + radial.x * limit; projectile.y = bounds.centerY + radial.y * limit;
        if (projectile.bounces <= 0) { projectile.active = false; return true; }
        const reflected = OA.Vector.reflect(projectile.vx, projectile.vy, -radial.x, -radial.y);
        projectile.vx = reflected.x * 0.96; projectile.vy = reflected.y * 0.96; projectile.bounces -= 1;
        this.particles.emitWallImpact(projectile.x, projectile.y, projectile.color, Math.hypot(projectile.vx, projectile.vy) * 0.5, -radial.x, -radial.y, false);
        return true;
      }
      let nx = 0;
      let ny = 0;
      if (projectile.x - projectile.radius < bounds.left) { projectile.x = bounds.left + projectile.radius; nx = 1; }
      else if (projectile.x + projectile.radius > bounds.right) { projectile.x = bounds.right - projectile.radius; nx = -1; }
      if (projectile.y - projectile.radius < bounds.top) { projectile.y = bounds.top + projectile.radius; ny = 1; }
      else if (projectile.y + projectile.radius > bounds.bottom) { projectile.y = bounds.bottom - projectile.radius; ny = -1; }
      if (!nx && !ny) return false;
      if (projectile.bounces <= 0) { projectile.active = false; return true; }
      const reflected = OA.Vector.reflect(projectile.vx, projectile.vy, nx, ny);
      projectile.vx = reflected.x * 0.96;
      projectile.vy = reflected.y * 0.96;
      projectile.bounces -= 1;
      this.particles.emitWallImpact(projectile.x, projectile.y, projectile.color, Math.hypot(projectile.vx, projectile.vy) * 0.5, nx, ny, false);
      return true;
    }

    hit(world, projectile, target, hit) {
      if (target.status.antiProjectile > 0) { projectile.active = false; this.particles.emitShockwave(hit.x, hit.y, target.color, 0.45); return; }
      if (target.status.reflecting > 0) {
        projectile.team = target.team;
        projectile.owner = target;
        projectile.vx *= -1.08;
        projectile.vy *= -1.08;
        projectile.hitTargets.clear();
        return;
      }
      const dealt = this.combat.dealDamage(world, projectile.owner, target, projectile.damage, { source: projectile.source === "ability" ? "ability" : "projectile", abilityId: projectile.abilityId });
      const direction = OA.Vector.normalize(projectile.vx, projectile.vy);
      const received = target.applyImpulse(direction.x * projectile.knockback * world.physics.knockback, direction.y * projectile.knockback * world.physics.knockback);
      projectile.owner.telemetry.knockbackCaused += received;
      projectile.owner.telemetry.projectilesHit += 1;
      this.particles.emitImpact(hit.x, hit.y, projectile.color, Math.hypot(projectile.vx, projectile.vy) * 0.55, direction.x, direction.y);
      this.audio.projectile(Math.hypot(projectile.vx, projectile.vy), projectile.kind);
      world.events.push({ type: "projectile", fighter: projectile.owner, target, damage: dealt });
      projectile.hitTargets.add(target.id);
      if (projectile.pierce > 0) projectile.pierce -= 1;
      else projectile.active = false;
    }

    getBounds(world) {
      if (world.arena?.shape === "circle") return { shape: "circle", centerX: world.arena.centerX, centerY: world.arena.centerY, radius: world.arena.radius };
      const padding = world.arena?.padding ?? OA.CONFIG.arena.padding;
      return { left: padding, right: OA.CONFIG.arena.width - padding, top: padding, bottom: OA.CONFIG.arena.height - padding };
    }

    get activeCount() { return this.pool.reduce((total, projectile) => total + (projectile.active ? 1 : 0), 0); }
  }

  OA.ProjectileSystem = ProjectileSystem;
}());
