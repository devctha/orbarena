(function () {
  "use strict";
  const OA = window.OrbArena;

  const emptyStats = () => ({
    damageDealt: 0, damageTaken: 0, hits: 0, largestHit: 0, criticals: 0,
    collisionDamage: 0, weaponDamage: 0, abilityDamage: 0, healing: 0,
    abilityUses: Object.create(null), events: 0
  });

  class BattleLogger {
    constructor() { this.reset(); }

    reset() {
      this.entries = [];
      this.stats = Object.create(null);
    }

    team(teamId) { return this.stats[teamId] ||= emptyStats(); }

    logDamage(time, attacker, target, damage, critical, source = "collision", abilityId = null) {
      const attackStats = this.team(attacker.teamId || attacker.team);
      const targetStats = this.team(target.teamId || target.team);
      attackStats.damageDealt += damage;
      attackStats.hits += 1;
      attackStats.largestHit = Math.max(attackStats.largestHit, damage);
      if (critical) attackStats.criticals += 1;
      if (source === "collision") attackStats.collisionDamage += damage;
      else if (source === "weapon") attackStats.weaponDamage += damage;
      else attackStats.abilityDamage += damage;
      targetStats.damageTaken += damage;
      this.entries.push({ type: "damage", time, attacker: attacker.id, target: target.id, damage, critical, source, abilityId });
      if (this.entries.length > 2400) this.entries.shift();
    }

    logAbility(time, fighter, ability) {
      const stats = this.team(fighter.teamId || fighter.team);
      stats.abilityUses[ability.id] = (stats.abilityUses[ability.id] || 0) + 1;
      this.entries.push({ type: "ability", time, fighter: fighter.id, ability: ability.id });
    }

    logEvent(time, fighter, type, value = 0) {
      this.team(fighter.teamId || fighter.team).events += 1;
      this.entries.push({ type, time, fighter: fighter.id, value });
      if (this.entries.length > 2400) this.entries.shift();
    }

    logElimination(time, killer, victim, assists = [], metadata = {}) { this.entries.push({ type: "elimination", time, fighter: killer?.id || null, target: victim.id, assists: assists.map((item) => item.id), source: metadata.source || "arena", abilityId: metadata.abilityId || null, critical: Boolean(metadata.critical) }); if (this.entries.length > 2400) this.entries.shift(); }

    mostUsedAbility(team) {
      const uses = this.team(team).abilityUses;
      const entry = Object.entries(uses).sort((a, b) => b[1] - a[1])[0];
      return entry ? OA.abilityById(entry[0])?.name || entry[0] : "Nenhum";
    }

    buildFighterResult(world, fighter) {
      const stats = this.team(fighter.teamId || fighter.team);
      const powerUse = Object.entries(fighter.characterTelemetry?.powerUses || {}).sort((a,b)=>b[1]-a[1])[0];
      return {
        ...stats,
        ...fighter.telemetry,
        name: fighter.name,
        characterId: fighter.characterId || null,
        characterTitle: fighter.character?.title || null,
        characterClass: fighter.character?.class || null,
        characterRarity: fighter.character?.rarity || null,
        characterTelemetry: fighter.characterTelemetry ? { ...fighter.characterTelemetry } : null,
        color: fighter.color,
        distance: fighter.distance,
        weapon: fighter.weapon?.name || "Sem arma",
        abilities: fighter.abilities.map((ability) => ability.name).concat(fighter.character ? [fighter.character.kit.active, fighter.character.kit.ultimate] : []),
        perks: fighter.perks.map((perk) => perk.name),
        id: fighter.id, teamId: fighter.teamId || fighter.team, health: fighter.health, alive: fighter.alive, kills: fighter.kills || 0, assists: fighter.assists || 0, deaths: fighter.deaths || 0,
        mostUsedAbility: powerUse ? (OA.PowerRegistry.get(powerUse[0])?.name || powerUse[0]) : this.mostUsedAbility(fighter.teamId || fighter.team)
      };
    }

    buildResult(world, winner) {
      return {
        id: `battle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        winner,
        winnerTeam: winner,
        duration: world.time,
        seed: world.seed,
        mode: world.mode || "duel",
        gameModeId: world.gameModeId || "orb",
        durationPreset:world.pacing?.id||"standard",
        finalPhase:world.battlePhase,
        arenaId: world.arena?.id || "classic",
        arenaName: world.arena?.name || "Arena Clássica",
        physicsPreset: world.physics.name,
        physicsId: world.physics.id,
        particlesEmitted:world.player.telemetry.particlesEmitted,
        peakParticles:world.player.telemetry.peakParticles,
        minimumFps:Math.min(world.player.telemetry.minFps||60,world.enemy.telemetry.minFps||60),
        player: this.buildFighterResult(world, world.player),
        enemy: this.buildFighterResult(world, world.enemy),
        roster: OA.getFighters(world).map((fighter) => this.buildFighterResult(world, fighter)),
        matchConfig: world.match ? structuredClone(world.match) : null,
        arenaSize: world.match?.arenaSize || "small",
        difficulty: world.difficulty,
        result: winner === "player" ? "Vitória" : winner === "draw" ? "Empate" : "Derrota",
        endedAt: new Date().toISOString()
      };
    }
  }

  OA.BattleLogger = BattleLogger;
}());
