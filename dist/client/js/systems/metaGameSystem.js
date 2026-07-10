(function () {
  "use strict";
  const OA = window.OrbArena;
  const ACHIEVEMENTS = Object.freeze([
    ["first-win", "Primeira Vitória", "Vença sua primeira partida."], ["wins-10", "Veterano", "Vença 10 partidas."], ["wins-100", "Lenda Orbital", "Vença 100 partidas."],
    ["walls-1000", "Mestre da Parede", "Realize 1.000 ricochetes."], ["first-ultimate", "Núcleo Desperto", "Use sua primeira Ultimate."], ["combo-20", "Cadeia Perfeita", "Alcance combo 20×."],
    ["untouched", "Intocável", "Vença sem sofrer dano."], ["boss-win", "Quebra-Titãs", "Vença Boss Rush."], ["one-v-four", "Impossível", "Vença uma partida 1v4."],
    ["one-health", "Último Pulso", "Vença com 1 de vida."], ["clone-master", "Mestre do Clone", "Crie 100 clones."], ["poison-master", "Mestre do Veneno", "Cause 5.000 de dano de veneno."],
    ["temporal-master", "Mestre Temporal", "Aplique 300 s de lentidão temporal."], ["mvp-10", "Ícone da Arena", "Seja MVP 10 vezes."], ["chaos-win", "Domador do Caos", "Vença no modo Caótico."],
    ["huge-win", "Conquistador", "Vença em arena enorme."], ["replay-10", "Arquivista", "Salve 10 replays."], ["draft-master", "Estrategista", "Salve 20 presets de draft."]
  ].map(([id, name, description]) => Object.freeze({ id, name, description })));
  OA.ACHIEVEMENTS = ACHIEVEMENTS;

  class MetaGameSystem {
    score(fighter, result) {
      const stats = result.roster?.find((item) => item.id === fighter.id) || fighter;
      const survival = fighter.alive ? 140 : Math.max(0, 70 - (fighter.deaths || 0) * 12);
      return (stats.damageDealt || 0) * .55 + (stats.healing || stats.characterTelemetry?.healing || 0) * .72 + (stats.shieldGenerated || stats.characterTelemetry?.shieldGenerated || 0) * .6 + (fighter.kills || 0) * 90 + (fighter.assists || 0) * 46 + (stats.controlApplied || stats.characterTelemetry?.controlApplied || 0) * 16 + (stats.wallBoosts || 0) * 4 + (stats.largestCombo || 0) * 3 + survival;
    }
    enrich(world, result, replay) {
      const fighters = OA.getFighters(world);
      result.roster = fighters.map((fighter) => ({ id: fighter.id, teamId: fighter.teamId, teamName: fighter.teamName, name: fighter.name, characterId: fighter.characterId, color: fighter.color, alive: fighter.alive, kills: fighter.kills || 0, assists: fighter.assists || 0, deaths: fighter.deaths || 0, controlMode: fighter.controlMode, ...world.logger.buildFighterResult(world, fighter) }));
      const ranking = fighters.map((fighter) => ({ fighter, score: this.score(fighter, result) })).sort((a, b) => b.score - a.score);
      result.mvp = ranking[0] ? { id: ranking[0].fighter.id, name: ranking[0].fighter.name, teamId: ranking[0].fighter.teamId, score: Math.round(ranking[0].score) } : null;
      const by = (selector) => ranking.slice().sort((a, b) => selector(b.fighter) - selector(a.fighter))[0]?.fighter;
      result.awards = { offense: by((f) => f.telemetry.damageDealt || 0)?.name || "—", support: by((f) => (f.characterTelemetry?.healing || 0) + (f.telemetry.shieldGenerated || 0))?.name || "—", defense: by((f) => (f.telemetry.damagePrevented || 0) + (f.telemetry.blockedDamage || 0))?.name || "—", mobility: by((f) => f.telemetry.maxSpeed || 0)?.name || "—", control: by((f) => f.characterTelemetry?.controlApplied || 0)?.name || "—" };
      result.killFeed = [...(world.killFeed || [])]; result.replay = replay;
      result.highlights = this.highlights(world, result);
      return result;
    }
    highlights(world, result) {
      const roster = result.roster || [], max = (key) => roster.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
      const entries = world.logger.entries;
      return [
        { type: "impact", label: "Maior impacto", fighter: max("largestImpact")?.name, value: Math.round(max("largestImpact")?.largestImpact || 0) },
        { type: "combo", label: "Maior combo", fighter: max("largestCombo")?.name, value: `${max("largestCombo")?.largestCombo || 0}×` },
        { type: "speed", label: "Maior velocidade", fighter: max("maxSpeed")?.name, value: Math.round(max("maxSpeed")?.maxSpeed || 0) },
        { type: "critical", label: "Maior crítico", fighter: entries.filter((e) => e.critical).sort((a, b) => b.damage - a.damage)[0]?.attacker || "—", value: Math.round(entries.filter((e) => e.critical).sort((a, b) => b.damage - a.damage)[0]?.damage || 0) },
        { type: "turnaround", label: "Melhor virada", fighter: result.mvp?.name || "—", value: result.finalPhase === "suddenDeath" ? "Morte súbita" : "Clímax" }
      ];
    }
    unlocks(data, result) {
      const unlocked = new Set(data.achievements || []), record = data.profile || {};
      const won = result.winnerTeam === "player" || result.winner === "player";
      const player = result.roster?.find((f) => f.teamId === "player") || result.player || {};
      const checks = { "first-win": won, "wins-10": (record.wins || 0) >= 10, "wins-100": (record.wins || 0) >= 100, "walls-1000": (record.wallBounces || 0) >= 1000, "first-ultimate": (record.ultimates || 0) > 0, "combo-20": (player.largestCombo || 0) >= 20, untouched: won && (player.damageTaken || 0) <= 0, "boss-win": won && result.mode === "boss", "one-v-four": won && result.mode === "1v4", "one-health": won && (player.health || 2) <= 1, "mvp-10": (record.mvp || 0) >= 10, "chaos-win": won && result.physicsId === "chaotic", "huge-win": won && result.arenaSize === "huge", "replay-10": (data.replays?.length || 0) >= 10, "draft-master": (data.presets?.drafts?.length || 0) >= 20 };
      const fresh = []; for (const achievement of ACHIEVEMENTS) if (checks[achievement.id] && !unlocked.has(achievement.id)) { unlocked.add(achievement.id); fresh.push(achievement); }
      return { ids: [...unlocked], fresh };
    }
  }
  OA.MetaGameSystem = MetaGameSystem;
}());
