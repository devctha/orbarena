(function () {
  "use strict";
  const OA = window.OrbArena;

  class ParticleSystem {
    constructor(random, quality = 1) {
      this.random = random;
      this.capacity = Math.round(280 * quality);
      this.particles = Array.from({ length: this.capacity }, () => ({ active: false }));
      this.texts = [];
      this.waves = [];
      this.lightning = [];
      this.cursor = 0;
      this.flash = 0;
      this.shake = 0;
    }

    acquire() {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.capacity;
      particle.active = true;
      return particle;
    }

    emitImpact(x, y, color, intensity, nx = 0, ny = 0) {
      const normalized = OA.clamp(intensity / 520, 0.12, 1.5);
      const count = Math.min(32, Math.round(5 + normalized * 20));
      const baseAngle = Math.atan2(ny, nx);
      for (let i = 0; i < count; i += 1) {
        const directional = nx || ny;
        const angle = directional ? baseAngle + this.random.range(-1.25, 1.25) : this.random.range(0, Math.PI * 2);
        const speed = this.random.range(70, 250) * (0.55 + normalized * 0.7);
        Object.assign(this.acquire(), {
          type: i % 4 === 0 ? "streak" : "spark", x, y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: this.random.range(0.16, 0.52), maxLife: 0.52,
          size: this.random.range(1.2, 4.2) * (0.7 + normalized * 0.35), color
        });
      }
      this.flash = Math.min(1, this.flash + 0.08 + normalized * 0.18);
      this.shake = Math.min(11, this.shake + normalized * 4.5);
    }

    emitWallImpact(x, y, color, speed, nx, ny, boosted) {
      this.emitImpact(x, y, boosted ? "#fff39a" : color, speed * 0.72, nx, ny);
      if (boosted) {
        this.emitShockwave(x, y, "#fff39a", 0.72);
        this.emitText(x, y - 20, "WALL BOOST", "#fff39a", true);
      }
    }

    emitShockwave(x, y, color, scale = 1) {
      this.waves.push({ x, y, color, radius: 5, maxRadius: 62 * scale, life: 0.42, maxLife: 0.42, width: 2 + scale });
      if (this.waves.length > 24) this.waves.shift();
    }

    emitAbility(x, y, color, category) {
      const count = category === "ofensivo" || category === "impacto" ? 18 : 12;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.PI * 2 * i / count + this.random.range(-0.1, 0.1);
        const speed = this.random.range(55, 155);
        Object.assign(this.acquire(), { type: "spark", x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5, maxLife: 0.5, size: this.random.range(1.5, 3.8), color });
      }
      this.emitShockwave(x, y, color, category === "caos" ? 1.2 : 0.8);
    }

    emitLightning(x1, y1, x2, y2, color) {
      const points = [{ x: x1, y: y1 }];
      for (let i = 1; i < 8; i += 1) {
        const t = i / 8;
        points.push({ x: OA.lerp(x1, x2, t) + this.random.range(-12, 12), y: OA.lerp(y1, y2, t) + this.random.range(-12, 12) });
      }
      points.push({ x: x2, y: y2 });
      this.lightning.push({ points, color, life: 0.16, maxLife: 0.16 });
    }

    emitDamage(x, y, amount, critical, color) {
      this.texts.push({ x, y, label: `${critical ? "CRIT " : "−"}${Math.round(amount)}`, critical, color, life: 0.78, maxLife: 0.78 });
      if (this.texts.length > 26) this.texts.shift();
    }

    emitText(x, y, label, color, emphasized = false) {
      this.texts.push({ x, y, label, critical: emphasized, color, life: emphasized ? 1.15 : 0.82, maxLife: emphasized ? 1.15 : 0.82 });
      if (this.texts.length > 26) this.texts.shift();
    }

    emitDeath(x, y, color) {
      for (let i = 0; i < 58; i += 1) {
        const angle = this.random.range(0, Math.PI * 2);
        const speed = this.random.range(80, 340);
        Object.assign(this.acquire(), { type: i % 3 === 0 ? "streak" : "spark", x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: this.random.range(0.45, 1.2), maxLife: 1.2, size: this.random.range(1.5, 6), color });
      }
      this.emitShockwave(x, y, color, 2.2);
      this.flash = 1;
      this.shake = 13;
    }

    update(dt) {
      for (const particle of this.particles) {
        if (!particle.active) continue;
        particle.life -= dt;
        if (particle.life <= 0) { particle.active = false; continue; }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.exp(-5.2 * dt);
        particle.vy *= Math.exp(-5.2 * dt);
      }
      for (const text of this.texts) { text.life -= dt; text.y -= (text.critical ? 42 : 31) * dt; }
      for (const wave of this.waves) { wave.life -= dt; wave.radius += wave.maxRadius / wave.maxLife * dt; }
      for (const bolt of this.lightning) bolt.life -= dt;
      this.texts = this.texts.filter((text) => text.life > 0);
      this.waves = this.waves.filter((wave) => wave.life > 0);
      this.lightning = this.lightning.filter((bolt) => bolt.life > 0);
      this.flash = Math.max(0, this.flash - dt * 4.2);
      this.shake = Math.max(0, this.shake - dt * 18);
    }

    get activeCount() { return this.particles.reduce((sum, particle) => sum + (particle.active ? 1 : 0), 0); }
  }

  OA.ParticleSystem = ParticleSystem;
}());
