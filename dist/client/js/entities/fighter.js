(function () {
  "use strict";
  const OA = window.OrbArena;

  class Fighter {
    constructor(options) {
      this.id = options.id;
      this.team = options.team;
      this.name = options.name;
      this.color = options.color;
      this.stroke = options.stroke;
      this.trailColor = options.trailColor;
      this.x = options.x;
      this.y = options.y;
      this.previousX = this.x;
      this.previousY = this.y;
      this.vx = options.vx || 0;
      this.vy = options.vy || 0;
      this.ax = 0;
      this.ay = 0;
      this.forceX = 0;
      this.forceY = 0;
      this.directionX = this.vx >= 0 ? 1 : -1;
      this.directionY = 0;
      this.baseRadius = options.radius;
      this.radius = options.radius;
      this.baseMass = options.mass;
      this.mass = options.mass;
      this.elasticity = options.elasticity ?? 0.96;
      this.friction = options.friction ?? 0.1;
      this.baseKnockbackResistance = OA.clamp(options.knockbackResistance || 0, 0, 0.72);
      this.knockbackResistance = this.baseKnockbackResistance;
      this.bounceMultiplier = options.bounceMultiplier || 1;
      this.impactMultiplier = options.impactMultiplier || 1;
      this.maxHealth = options.health;
      this.health = options.health;
      this.baseDamage = options.damage;
      this.damage = options.damage;
      this.baseArmor = options.armor || 0;
      this.armor = this.baseArmor;
      this.baseMaxSpeed = options.speed;
      this.maxSpeed = options.speed;
      this.temporaryMaxSpeed = options.speed * 1.55;
      this.absoluteMaxSpeed = options.absoluteMaxSpeed || options.speed * 2.5;
      this.minSpeed = options.minSpeed || 110;
      this.acceleration = options.acceleration;
      this.attackRate = options.attackRate;
      this.critChance = options.critChance || 0.08;
      this.attackTimer = 0;
      this.invulnerability = 0;
      this.stunTimer = 0;
      this.contactCooldown = 0;
      this.wallCooldown = 0;
      this.wallBoostTimer = 0;
      this.speedTrailTimer = 0;
      this.impactBuffTimer = 0;
      this.nextImpactMultiplier = 1;
      this.shield = 0;
      this.maxShield = this.maxHealth * 0.6;
      this.healingMultiplier = 1;
      this.controlDR = Object.create(null);
      this.damageReduction = 0;
      this.weaponGuard = 0;
      this.alive = true;
      this.resurrectionReady = false;
      this.resurrectionUsed = false;
      this.rotation = options.phase || 0;
      this.angularVelocity = 0;
      this.deform = { amount: 0, nx: 1, ny: 0, flash: 0 };
      this.distance = 0;
      this.timeStill = 0;
      this.abilities = [];
      this.reactiveAbility = null;
      this.abilityCooldowns = Object.create(null);
      this.lastAbility = null;
      this.weapon = null;
      this.weaponState = { angle: 0, cooldown: 0, active: 0, hit: false, extension: 0 };
      this.perks = [];
      this.perkEffects = Object.create(null);
      this.status = {
        haste: 0, slow: 0, frozen: 0, stunned: 0, silenced: 0, confused: 0,
        phased: 0, reflecting: 0, antiProjectile: 0, damageToSpeed: 0,
        impactHeal: 0, adaptiveArmor: 0, contactAura: 0, spikeArmor: 0,
        duplicateShots: 0, superBounce: 0, orbitalRun: 0, burning: 0,
        prison: 0, ram: 0, counterGuard: 0, damageReduction: 0
      };
      this.statusPower = Object.create(null);
      this.ai = {
        style: options.style || "Equilibrado",
        aggression: options.aggression || 1,
        orbit: options.orbit || 1,
        phase: options.phase || 0,
        decisionTimer: 0,
        burstTimer: 0,
        desiredDistance: options.desiredDistance || 72,
        wallIntent: 0,
        evadeTimer: 0
      };
      this.trail = [];
      this.telemetry = {
        collisionsMade: 0, collisionsTaken: 0, wallBounces: 0, wallBoosts: 0,
        maxSpeed: Math.hypot(this.vx, this.vy), largestImpact: 0,
        knockbackCaused: 0, knockbackReceived: 0, collisionDamage: 0,
        weaponDamage: 0, abilityDamage: 0, timeAtMaxSpeed: 0,
        combos: 0, largestCombo: 0, abilitiesUsed: 0, projectilesFired: 0,
        projectilesHit: 0, blockedDamage: 0, healing: 0
      };
    }

    beginFrame() {
      this.previousX = this.x;
      this.previousY = this.y;
      this.forceX = 0;
      this.forceY = 0;
      this.ax = 0;
      this.ay = 0;
    }

    tick(dt, abilityDt = dt) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      this.invulnerability = Math.max(0, this.invulnerability - dt);
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.contactCooldown = Math.max(0, this.contactCooldown - dt);
      this.wallCooldown = Math.max(0, this.wallCooldown - dt);
      this.wallBoostTimer = Math.max(0, this.wallBoostTimer - dt);
      this.speedTrailTimer = Math.max(0, this.speedTrailTimer - dt);
      this.impactBuffTimer = Math.max(0, this.impactBuffTimer - dt);
      this.ai.decisionTimer = Math.max(0, this.ai.decisionTimer - dt);
      this.ai.burstTimer = Math.max(0, this.ai.burstTimer - dt);
      this.ai.evadeTimer = Math.max(0, this.ai.evadeTimer - dt);
      this.weaponState.cooldown = Math.max(0, this.weaponState.cooldown - dt);
      this.weaponState.active = Math.max(0, this.weaponState.active - dt);
      for (const key of Object.keys(this.status)) this.status[key] = Math.max(0, this.status[key] - dt);
      for (const id of Object.keys(this.abilityCooldowns)) this.abilityCooldowns[id] = Math.max(0, this.abilityCooldowns[id] - abilityDt);
      for (const state of Object.values(this.controlDR)) {
        state.timer = Math.max(0, state.timer - dt);
        if (state.timer <= 0) state.stacks = Math.max(0, state.stacks - dt * 0.8);
      }
      if (this.status.adaptiveArmor <= 0) this.armor += (this.baseArmor - this.armor) * Math.min(1, dt * 3);
      if (this.status.ram <= 0) this.mass += (this.baseMass - this.mass) * Math.min(1, dt * 5);
      this.deform.amount = Math.max(0, this.deform.amount - dt * 4.8);
      this.deform.flash = Math.max(0, this.deform.flash - dt * 7);
    }

    applyForce(x, y) {
      this.forceX += x;
      this.forceY += y;
    }

    applyImpulse(x, y, options = {}) {
      const resistance = options.ignoreResistance ? 1 : 1 - this.knockbackResistance;
      const scale = resistance / Math.max(0.2, this.mass);
      this.vx += x * scale;
      this.vy += y * scale;
      const safetySpeed = Math.hypot(this.vx, this.vy);
      if (safetySpeed > this.absoluteMaxSpeed) {
        const safetyScale = this.absoluteMaxSpeed / safetySpeed;
        this.vx *= safetyScale;
        this.vy *= safetyScale;
      }
      const magnitude = Math.hypot(x * scale, y * scale);
      this.telemetry.knockbackReceived += magnitude;
      if (magnitude > 70) {
        const normal = OA.Vector.normalize(x, y);
        this.deform.amount = OA.clamp(magnitude / 520, 0.12, 0.65);
        this.deform.nx = normal.x;
        this.deform.ny = normal.y;
      }
      return magnitude;
    }

    applyDamage(amount, metadata = {}) {
      if (!this.alive || this.invulnerability > 0 || this.status.phased > 0) return 0;
      const armor = metadata.ignoreArmor ? 0 : Math.max(0, this.armor * (1 - (metadata.armorPen || 0)));
      const reduction = armor / (100 + armor);
      let actual = Math.max(0, amount * (1 - reduction) * (1 - OA.clamp(this.damageReduction + this.weaponGuard, 0, 0.78)));
      if (this.status.counterGuard > 0 && metadata.source === "collision") actual *= 0.48;
      if (this.shield > 0) {
        const absorbed = Math.min(this.shield, actual);
        this.shield -= absorbed;
        actual -= absorbed;
        this.telemetry.blockedDamage += absorbed;
        if (actual <= 0) return 0;
      }
      this.health = Math.max(0, this.health - actual);
      this.invulnerability = metadata.dot ? 0 : 0.045;
      this.deform.flash = OA.clamp(actual / 22, 0.18, 1);
      if (this.status.adaptiveArmor > 0) this.armor = Math.min(this.baseArmor + 28, this.armor + actual * 0.18);
      if (this.status.damageToSpeed > 0 && actual > 0) {
        const speed = OA.Vector.normalize(this.vx, this.vy);
        this.applyImpulse(speed.x * actual * 8, speed.y * actual * 8, { ignoreResistance: true });
      }
      if (this.health <= 0) {
        if (this.resurrectionReady && !this.resurrectionUsed) {
          this.resurrectionUsed = true;
          this.resurrectionReady = false;
          this.health = this.maxHealth * 0.3;
          this.invulnerability = 0.8;
          this.alive = true;
        } else {
          this.alive = false;
        }
      }
      return actual;
    }

    heal(amount) {
      if (!this.alive || amount <= 0) return 0;
      const healed = Math.min(amount * (this.healingMultiplier ?? 1), this.maxHealth - this.health);
      this.health += healed;
      this.telemetry.healing += healed;
      return healed;
    }

    addShield(amount) {
      const diminishing = 1 - OA.clamp(this.shield / Math.max(1, this.maxShield), 0, 0.75) * 0.45;
      const added = Math.min(amount * diminishing, this.maxShield - this.shield);
      this.shield += Math.max(0, added);
      return added;
    }

    setStatus(name, duration, power) {
      if (!(name in this.status)) return;
      const controlCaps = { stunned: 1.1, frozen: 1.1, slow: 4.5, silenced: 2.5, prison: 2.8, confused: 3.5 };
      let adjustedDuration = Math.min(duration, controlCaps[name] || duration);
      if (controlCaps[name] && duration >= 0.3) {
        const state = this.controlDR[name] ||= { stacks: 0, timer: 0 };
        const repeated = this.status[name] > 0.05;
        adjustedDuration *= 1 / (1 + state.stacks * 0.55);
        if (!repeated) { state.stacks = Math.min(4, state.stacks + 1); state.timer = 4.5; }
      }
      this.status[name] = Math.max(this.status[name], adjustedDuration);
      if (power !== undefined) this.statusPower[name] = power;
      if (name === "stunned" || name === "frozen") this.stunTimer = Math.max(this.stunTimer, duration);
    }

    currentSpeed() { return Math.hypot(this.vx, this.vy); }

    speedCap(intensity = 1) {
      let cap = this.maxSpeed * intensity;
      if (this.status.haste > 0) cap *= 1 + (this.statusPower.haste || 0.28);
      if (this.status.slow > 0 || this.status.frozen > 0) cap *= this.status.frozen > 0 ? 0.08 : (this.statusPower.slow || 0.5);
      if (this.status.prison > 0) cap *= this.statusPower.prison || 0.22;
      if (this.wallBoostTimer > 0 || this.ai.burstTimer > 0 || this.status.orbitalRun > 0) cap = Math.max(cap, this.temporaryMaxSpeed);
      return Math.min(this.absoluteMaxSpeed, cap);
    }

    pushTrail() {
      const speed = this.currentSpeed();
      const spacing = speed > this.maxSpeed ? 3 : 6;
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(this.x - last.x, this.y - last.y) > spacing) {
        this.trail.push({ x: this.x, y: this.y, speed, boost: this.wallBoostTimer > 0 || this.speedTrailTimer > 0 });
        if (this.trail.length > 22) this.trail.shift();
      }
    }

    healthRatio() { return OA.clamp(this.health / this.maxHealth, 0, 1); }
  }

  OA.Fighter = Fighter;
}());
