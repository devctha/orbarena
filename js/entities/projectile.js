(function () {
  "use strict";
  const OA = window.OrbArena;

  class Projectile {
    constructor() { this.active = false; }

    reset(options) {
      this.active = true;
      this.id = options.id;
      this.owner = options.owner;
      this.team = options.owner.team;
      this.source = options.source || "weapon";
      this.abilityId = options.abilityId || null;
      this.kind = options.kind || "bolt";
      this.x = options.x;
      this.y = options.y;
      this.previousX = this.x;
      this.previousY = this.y;
      this.vx = options.vx;
      this.vy = options.vy;
      this.ax = options.ax || 0;
      this.ay = options.ay || 0;
      this.radius = options.radius || 4;
      this.damage = options.damage;
      this.knockback = options.knockback || 0;
      this.life = options.life || 2.5;
      this.bounces = options.bounces || 0;
      this.pierce = options.pierce || 0;
      this.homing = options.homing || 0;
      this.color = options.color || "#ffffff";
      this.armTimer = options.armTimer || 0;
      this.rotation = Math.atan2(this.vy, this.vx);
      this.hitTargets = new Set();
      return this;
    }
  }

  OA.Projectile = Projectile;
}());
