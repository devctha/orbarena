(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterStatsSystem {
    constructor(storage) { this.storage = storage; }
    forCharacter(id) {
      const battles = this.storage.read().history.filter((battle) => battle.player?.characterId === id || battle.enemy?.characterId === id);
      let wins = 0;
      for (const battle of battles) {
        if (battle.player?.characterId === id && battle.winner === "player") wins += 1;
        if (battle.enemy?.characterId === id && battle.winner === "enemy") wins += 1;
      }
      return { uses: battles.length, wins, winRate: battles.length ? Math.round(wins / battles.length * 100) : null };
    }
    get(id) { const value = this.forCharacter(id); return { ...value, rate: value.winRate }; }
  }
  OA.CharacterStatsSystem = CharacterStatsSystem;
}());
