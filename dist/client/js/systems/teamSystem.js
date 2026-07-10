(function () {
  "use strict";
  const OA = window.OrbArena;

  class TeamSystem {
    fighters(world, aliveOnly = false) {
      const list = world.fighters || [world.player, world.enemy].filter(Boolean);
      return aliveOnly ? list.filter((fighter) => fighter.alive) : list;
    }
    allies(world, fighter, aliveOnly = true) { return this.fighters(world, aliveOnly).filter((other) => other !== fighter && other.teamId === fighter.teamId); }
    enemies(world, fighter, aliveOnly = true) {
      return this.fighters(world, aliveOnly).filter((other) => other !== fighter && other.teamId !== fighter.teamId);
    }
    isHostile(world, a, b) { return Boolean(a && b && a !== b && (world.match?.friendlyFire || a.teamId !== b.teamId)); }
    findTarget(world, fighter, strategy = "nearest") {
      const enemies = this.enemies(world, fighter, true);
      if (!enemies.length) return null;
      if (strategy === "lowHealth") return enemies.sort((a, b) => a.healthRatio() - b.healthRatio())[0];
      if (strategy === "isolated") return enemies.sort((a, b) => this.allies(world, a).length - this.allies(world, b).length)[0];
      if (strategy === "threat") return enemies.sort((a, b) => (b.telemetry.damageDealt || 0) - (a.telemetry.damageDealt || 0))[0];
      return enemies.sort((a, b) => Math.hypot(a.x - fighter.x, a.y - fighter.y) - Math.hypot(b.x - fighter.x, b.y - fighter.y))[0];
    }
    weakestAlly(world, fighter) { return [fighter, ...this.allies(world, fighter)].sort((a, b) => a.healthRatio() - b.healthRatio())[0]; }
    register(world, fighter, team, slot) {
      fighter.teamId = team.id; fighter.team = team.id; fighter.teamColor = team.color; fighter.teamName = team.label;
      fighter.slot = slot; fighter.kills = 0; fighter.assists = 0; fighter.deaths = 0; fighter.score = 0;
      fighter.lastDamagers = new Map(); fighter.controlMode ||= "AUTO"; fighter.autoCast ||= Object.create(null);
      return fighter;
    }
    recordDamage(world, attacker, target, damage) {
      if (!attacker || !target || attacker === target || damage <= 0) return;
      target.lastDamagers ||= new Map(); target.lastDamagers.set(attacker.id, { fighter: attacker, time: world.time, damage: (target.lastDamagers.get(attacker.id)?.damage || 0) + damage });
    }
    recordElimination(world, victim, killer = null, metadata = {}) {
      if (victim._eliminationRecorded) return;
      victim._eliminationRecorded = true; victim.deaths = (victim.deaths || 0) + 1;
      const recent = [...(victim.lastDamagers?.values() || [])].filter((hit) => world.time - hit.time <= 7).sort((a, b) => b.damage - a.damage);
      killer ||= recent[0]?.fighter || null;
      if (killer && killer !== victim) { killer.kills = (killer.kills || 0) + 1; killer.score = (killer.score || 0) + 2; }
      const assists = recent.map((hit) => hit.fighter).filter((fighter) => fighter && fighter !== killer && fighter.teamId === killer?.teamId).slice(0, 3);
      for (const fighter of assists) { fighter.assists = (fighter.assists || 0) + 1; fighter.score = (fighter.score || 0) + 1; }
      const entry = { id: `kill-${world.time.toFixed(3)}-${victim.id}`, time: world.time, killerId: killer?.id || null, killerName: killer?.name || "Arena", victimId: victim.id, victimName: victim.name, teamId: killer?.teamId || null, victimTeamId: victim.teamId, assists: assists.map((fighter) => fighter.name), abilityId: metadata.abilityId || null, source: metadata.source || "arena", critical: Boolean(metadata.critical), wallKill: Boolean(metadata.wallKill), friendlyFire: Boolean(killer && killer.teamId === victim.teamId) };
      world.killFeed ||= []; world.killFeed.unshift(entry); if (world.killFeed.length > 8) world.killFeed.length = 8;
      world.events.push({ type: "elimination", fighter: killer, target: victim, entry });
      world.logger?.logElimination?.(world.time, killer, victim, assists, metadata);
    }
    livingTeams(world) {
      const teams = new Map();
      for (const fighter of this.fighters(world, true)) teams.set(fighter.teamId, (teams.get(fighter.teamId) || 0) + 1);
      return teams;
    }
    winner(world) {
      if (world.objectiveWinner) return world.objectiveWinner;
      if (world.match?.victory === "time" && world.time >= (world.pacing?.timeLimit || Infinity)) return this.fighters(world, true).some((fighter)=>fighter.teamId==="player") ? "player" : this.fighters(world, true)[0]?.teamId || "draw";
      const teams = this.livingTeams(world);
      if (teams.size === 1) return [...teams.keys()][0];
      if (!teams.size) return "draw";
      return null;
    }
    spawn(teamIndex, slot, count, arena) {
      const margin = Math.max(90, arena.width * .12), spacing = Math.min(100, arena.height / (count + 1));
      if (teamIndex === 0) return { x: margin, y: arena.height / 2 + (slot - (count - 1) / 2) * spacing, angle: 0 };
      if (teamIndex === 1) return { x: arena.width - margin, y: arena.height / 2 + (slot - (count - 1) / 2) * spacing, angle: Math.PI };
      if (teamIndex === 2) return { x: arena.width / 2 + (slot - (count - 1) / 2) * spacing, y: margin, angle: Math.PI / 2 };
      return { x: arena.width / 2 + (slot - (count - 1) / 2) * spacing, y: arena.height - margin, angle: -Math.PI / 2 };
    }
  }

  OA.TeamSystem = TeamSystem;
  OA.getFighters = (world, aliveOnly = false) => (world.teamSystem ? world.teamSystem.fighters(world, aliveOnly) : [world.player, world.enemy].filter((fighter) => fighter && (!aliveOnly || fighter.alive)));
  OA.findTarget = (world, fighter, strategy) => world.teamSystem?.findTarget(world, fighter, strategy) || (fighter === world.player ? world.enemy : world.player);
}());
