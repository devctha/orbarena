(function () {
  "use strict";
  const OA = window.OrbArena;

  class Game {
    constructor(canvas, audio, callbacks) {
      this.canvas = canvas;
      this.audio = audio;
      this.callbacks = callbacks;
      this.world = null;
      this.loop = new OA.GameLoop((dt) => this.update(dt), (alpha, realDelta) => this.render(alpha, realDelta));
    }

    start(build, difficultyKey, seed, physicsSettings = OA.getPhysicsPreset("arcade"), options = {}) {
      this.stop();
      this.random = new OA.Random(seed);
      this.logger = new OA.BattleLogger();
      const physics = { ...OA.getPhysicsPreset(physicsSettings.id || "arcade"), ...physicsSettings };
      const qualityScale = { low: 0.35, medium: 0.65, high: 1, ultra: 1.3 }[this.settings?.quality || "high"];
      if (this.settings?.screenShake === false) physics.camera = 0;
      this.particles = new OA.ParticleSystem(this.random, physics.particles * qualityScale * (this.settings?.reducedParticles ? 0.45 : 1));
      this.combat = new OA.CombatSystem(this.random, this.particles, this.audio, this.logger);
      this.projectiles = new OA.ProjectileSystem(this.random, this.combat, this.particles, this.audio, physics.id === "chaotic" || physics.id === "pinball" ? 128 : 96);
      this.arenaSystem = new OA.ArenaSystem(this.random, this.particles, this.audio);
      this.weaponSystem = new OA.WeaponSystem(this.random, this.projectiles, this.combat, this.particles, this.audio);
      this.perkSystem = new OA.PerkSystem(this.random, this.combat, this.projectiles, this.particles);
      this.comboSystem = new OA.ComboSystem(this.particles);
      this.abilitySystem = new OA.AbilitySystem(this.random, this.projectiles, this.combat, this.particles, this.audio, this.logger);
      this.physics = new OA.PhysicsSystem(this.random, this.combat, this.projectiles);
      this.renderer = new OA.Renderer(this.canvas, this.particles, this.projectiles);
      this.renderer.settings = this.settings || {};
      this.balance = new OA.CharacterBalanceSystem();
      this.matchups = new OA.MatchupSystem();
      this.timeSystem = new OA.TimeSystem();
      this.summonSystem = new OA.SummonSystem(this.random, this.combat, this.projectiles, this.particles);
      this.cloneSystem = new OA.CloneSystem(this.summonSystem, this.particles);
      this.poisonSystem = new OA.PoisonSystem(this.combat, this.particles);
      this.spikeSystem = new OA.SpikeSystem(this.combat, this.particles);
      this.powerSystem = new OA.PowerSystem(this.random, this.particles, this.audio);
      this.characterSystem = new OA.CharacterSystem({ random:this.random, combat:this.combat, projectiles:this.projectiles, particles:this.particles, audio:this.audio, abilitySystem:this.abilitySystem, summons:this.summonSystem, clones:this.cloneSystem, poison:this.poisonSystem, spikes:this.spikeSystem, time:this.timeSystem, powers:this.powerSystem });

      const playerCharacter = OA.CharacterRegistry.get(build.characterId) || OA.CharacterRegistry.get("echo");
      const enemyCharacter = OA.CharacterRegistry.get(options.enemyCharacterId) || this.matchups.chooseEnemy(playerCharacter, this.random, this.balance, difficultyKey);
      const difficulty = OA.CONFIG.difficulties[difficultyKey] || OA.CONFIG.difficulties.normal;
      const enemy = OA.CharacterFactory.create(enemyCharacter,{id:"enemy-orb",team:"enemy",x:645,y:270,vx:-this.random.range(230,280),vy:this.random.range(-45,45),orbit:this.random.sign(),phase:this.random.range(0,Math.PI*2),powerScale:difficulty.power});
      const openingAngle = this.random.range(-0.2, 0.2);
      const player = OA.CharacterFactory.create(playerCharacter,{id:"player-orb",team:"player",x:315,y:270,vx:Math.cos(openingAngle)*255,vy:Math.sin(openingAngle)*255,orbit:this.random.sign(),phase:this.random.range(0,Math.PI*2)});
      if(options.mode==="lab") enemy.ai.disabled=true;
      this.world = {
        seed, difficulty: difficultyKey, physics, phase: "countdown", countdownRemaining: OA.CONFIG.battle.countdown,
        time: 0, visualTime: 0, intensity: 1, suddenDeath: false, player, enemy, logger: this.logger,
        arena: this.arenaSystem.create(physics.id, options.arenaId || "classic"), arenaSystem: this.arenaSystem,
        mode: options.mode || "duel", events: [], zones: [], characterZones: [], poisonPools: [], summons: [], effects: [], scheduled: [],
        timeScales: {game:1,visual:1,effect:1,animation:1,fighter:{player:1,enemy:1},projectile:{player:1,enemy:1},ability:{player:1,enemy:1}},
        physicsStats: { substeps: 1, collisions: 0, lastImpact: 0, lastNormal: null },
        camera: { trauma: 0, zoom: 1 }, timeDilation: { scale: 1, timer: 0 },
        finished: false, finishTimer: 0, winner: null, countdownCue: 3
      };

      this.weaponSystem.equip(player, build.weaponId || playerCharacter.preferredWeapon);
      this.weaponSystem.equip(enemy, enemyCharacter.preferredWeapon);
      this.perkSystem.assign(player, player.weapon, build.perks);
      this.perkSystem.assign(enemy, enemy.weapon);
      this.abilitySystem.assign(player, player.weapon, build.abilities);
      this.abilitySystem.assign(enemy, enemy.weapon);
      player.buildPowers = { ...(build.abilities || {}) };
      player.equippedPowerIds = [...new Set(Object.values(player.buildPowers).filter((id) => OA.PowerRegistry.get(id)))];
      enemy.buildPowers = {};
      enemy.equippedPowerIds = [];
      this.comboSystem.initialize(player);
      this.comboSystem.initialize(enemy);
      this.characterSystem.initialize(this.world, player);
      this.characterSystem.initialize(this.world, enemy);
      this.loop.accumulator = 0;
      this.loop.setSpeed(1);
      this.loop.setPaused(false);
      this.loop.start();
      return this.world;
    }

    generateEnemy(difficultyKey) {
      const config = OA.CONFIG;
      const difficulty = config.difficulties[difficultyKey] || config.difficulties.normal;
      const presetName = this.random.pick(Object.keys(config.presets));
      const base = config.presets[presetName];
      const variation = this.random.range(0.96, 1.04);
      const power = difficulty.power * variation;
      const style = this.random.pick(config.enemyStyles);
      const styleAggression = { Agressivo: 1.17, Perseguidor: 1.1, Cauteloso: 0.91, Caótico: 1.04, Tanque: 0.94, Berserker: 1.2 }[style] || 1;
      const color = this.random.pick(config.enemyColors);
      const stats = {
        health: Math.round(base.health * power), damage: base.damage * power,
        speed: base.speed * (0.97 + (power - 1) * 0.38), mass: base.mass,
        radius: base.radius, armor: base.armor * power,
        acceleration: base.acceleration * difficulty.aggression,
        attackRate: base.attackRate / Math.max(0.9, difficulty.aggression),
        elasticity: base.elasticity, friction: base.friction,
        minSpeed: base.minSpeed, absoluteMaxSpeed: base.absoluteMaxSpeed,
        knockbackResistance: base.knockbackResistance, bounceMultiplier: base.bounceMultiplier,
        impactMultiplier: base.impactMultiplier, critChance: base.critChance
      };
      const desiredDistance = style === "Cauteloso" ? 180 : style === "Atirador" ? 260 : style === "Berserker" ? 32 : 54;
      return new OA.Fighter({
        id: "enemy-orb", team: "enemy", name: this.random.pick(config.enemyNames), color, stroke: "#ffd8e7", trailColor: color,
        x: 765, y: 270, vx: -this.random.range(230, 280), vy: this.random.range(-45, 45),
        ...stats, style, aggression: difficulty.aggression * styleAggression,
        orbit: this.random.sign(), phase: this.random.range(0, Math.PI * 2), desiredDistance
      });
    }

    update(dt) {
      const world = this.world;
      if (!world || world.finished) return;
      world.camera.trauma = Math.max(0, world.camera.trauma - dt * 2.8);
      if (world.timeDilation.timer > 0) world.timeDilation.timer -= dt;
      else world.timeDilation.scale = 1;
      this.timeSystem.update(world, dt);
      const simDt = dt * world.timeDilation.scale * world.timeScales.game;

      if (world.phase === "countdown") {
        world.countdownRemaining -= dt;
        const cue = Math.max(0, Math.ceil(world.countdownRemaining));
        if (cue !== world.countdownCue) { world.countdownCue = cue; this.audio.countdown(cue); }
        if (world.countdownRemaining <= 0) world.phase = "active";
        return;
      }

      if (world.phase === "active") {
        world.time += simDt;
        world.intensity = world.time < OA.CONFIG.battle.escalationAt ? 1 : world.time < OA.CONFIG.battle.arenaShiftAt ? 1.1 : world.time < OA.CONFIG.battle.suddenDeathAt ? 1.25 : Math.min(1.7, 1.45 + (world.time - OA.CONFIG.battle.suddenDeathAt) * 0.012);
        world.suddenDeath = world.time >= OA.CONFIG.battle.suddenDeathAt;
        this.arenaSystem.update(world, simDt);
        this.characterSystem.update(world, simDt);
        this.summonSystem.update(world, simDt);
        this.cloneSystem.update(world, simDt);
        this.poisonSystem.update(world, simDt);
        this.spikeSystem.update(world.player, simDt * world.timeScales.fighter.player);
        this.spikeSystem.update(world.enemy, simDt * world.timeScales.fighter.enemy);
        this.abilitySystem.update(world, simDt);
        this.perkSystem.update(world, simDt);
        this.weaponSystem.update(world, simDt);
        this.physics.update(world, simDt);
        this.projectiles.update(world, simDt);
        this.comboSystem.update(world, simDt);
        this.particles.update(simDt * (world.timeScales.effect || 1));

        const events = world.events.splice(0);
        this.perkSystem.process(world, events);
        this.comboSystem.process(world, events);
        this.abilitySystem.processEvents(world, events);
        this.characterSystem.processEvents(world, events);

        if (world.mode === "lab" && (!world.player.alive || !world.enemy.alive)) {
          for (const fighter of [world.player, world.enemy]) if (!fighter.alive) { fighter.alive = true; fighter.health = fighter.maxHealth; fighter.shield = 0; fighter.x = fighter.team === "player" ? 315 : 645; fighter.y = 270; fighter.vx = fighter.vy = 0; }
        } else if (!world.player.alive || !world.enemy.alive) this.beginFinish(world.player.alive ? "player" : "enemy");
        else if (world.mode !== "lab" && world.time >= OA.CONFIG.battle.timeLimit) this.beginFinish(world.player.healthRatio() >= world.enemy.healthRatio() ? "player" : "enemy");
        return;
      }

      if (world.phase === "ending") {
        world.finishTimer -= dt;
        this.particles.update(dt * 0.35);
        if (world.finishTimer <= 0) this.finish();
      }
    }

    beginFinish(winner) {
      if (this.world.phase === "ending") return;
      this.world.phase = "ending";
      this.world.winner = winner;
      this.world.finishTimer = 1.25;
      this.world.timeDilation = { scale: 0.22, timer: 0.8 };
      this.world.camera.trauma = 0.9;
      if (winner === "player") this.audio.victory(); else this.audio.defeat();
    }

    finish() {
      if (this.world.finished) return;
      this.world.finished = true;
      const result = this.logger.buildResult(this.world, this.world.winner);
      this.loop.stop();
      this.callbacks.onComplete(result);
    }

    render(alpha, realDelta) {
      if (!this.world) return;
      this.world.visualTime += realDelta * (this.world.timeScales?.animation || this.world.timeScales?.visual || 1);
      this.renderer.render(this.world, alpha);
      this.callbacks.onFrame(this.world, this.loop, this.particles.activeCount + this.projectiles.activeCount);
    }

    setPaused(paused, source) { this.loop.setPaused(paused, source); }
    togglePause() { this.loop.setPaused(!this.loop.paused); return this.loop.paused; }
    setSpeed(speed) { this.loop.setSpeed(speed); }
    setHitboxes(enabled) { if (this.renderer) this.renderer.hitboxes = enabled; }
    setDebug(enabled) { if (this.renderer) this.renderer.debug = enabled; }
    lab(action){const w=this.world;if(!w||w.mode!=="lab")return;if(action==="heal")w.player.heal(w.player.maxHealth);if(action==="selfDamage")w.player.applyDamage(20,{source:"lab",ignoreArmor:true});if(action==="targetDamage")this.characterSystem.damage(w,w.player,w.enemy,20,"lab",false);if(action==="reset"){for(const id of Object.keys(w.player.abilityCooldowns))w.player.abilityCooldowns[id]=0;w.player.characterState.activeCooldown=0;}if(action==="ultimate"){w.player.characterState.ultimateCharge=100;this.characterSystem.useUltimate(w,w.player,w.enemy,OA.CharacterMechanics.get(w.player.characterId));}if(action==="clone")this.cloneSystem.create(w,w.player,{life:12});if(action==="projectiles")this.characterSystem.burst(w,w.player,w.enemy,{radial:true,count:12,damage:6,bounces:2,color:w.player.glowColor});if(action==="status")this.poisonSystem.apply(w.enemy,w.player,4,8,2);if(action==="time")this.timeSystem.slowFighter("enemy",.25,5,w.player);}
    stop() { this.loop.stop(); }
  }

  OA.Game = Game;
}());
