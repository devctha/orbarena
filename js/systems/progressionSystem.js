(function () {
  "use strict";
  const OA = window.OrbArena;
  class ProgressionSystem {
    constructor(storage) { this.storage = storage; }
    recordBattle(result, buildId = null) {
      const enemyId = result.enemy?.characterId; if (!enemyId) return;
      const data = this.storage.read(), previous = data.bestiary[enemyId] || { characterId: enemyId, state: "Desconhecido", encounters: 0, wins: 0, losses: 0 };
      const playerWon = result.winner === "player", encounters = previous.encounters + 1, wins = previous.wins + (playerWon ? 1 : 0), losses = previous.losses + (playerWon ? 0 : 1);
      const state = wins >= 5 ? "Dominado" : wins >= 1 ? "Derrotado" : encounters >= 1 ? "Enfrentado" : "Avistado";
      this.storage.updateBestiary(enemyId, { state, encounters, wins, losses, winRate: Math.round(wins / encounters * 100), lastEncounter: result.endedAt, largestDamageTaken: Math.max(previous.largestDamageTaken || 0, result.enemy?.damageTaken || 0), bestBuildId: playerWon ? buildId || previous.bestBuildId : previous.bestBuildId });
      if (buildId) this.storage.mutate((save) => { const build = save.builds.find((item) => item.id === buildId); if (!build) return; build.battles += 1; playerWon ? build.wins += 1 : build.losses += 1; build.winRate = Math.round(build.wins / build.battles * 100); build.updatedAt = new Date().toISOString(); });
    }
    entry(character) { const saved = this.storage.read().bestiary[character.id] || {}; return { character, characterId: character.id, state: saved.state || "Desconhecido", encounters: saved.encounters || 0, wins: saved.wins || 0, losses: saved.losses || 0, winRate: saved.winRate || 0, lastEncounter: saved.lastEncounter || null, bestBuildId: saved.bestBuildId || null, favorite: Boolean(saved.favorite) }; }
    all() { return OA.CharacterRegistry.all().map((character) => this.entry(character)); }
  }
  OA.ProgressionSystem = ProgressionSystem;
}());
