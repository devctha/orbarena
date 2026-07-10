(function () {
  "use strict";
  const OA = window.OrbArena;
  class MatchupSystem {
    score(attacker, defender) {
      let score = 0;
      if (attacker.matchups.favorable.includes(defender.id)) score += 1;
      if (attacker.matchups.unfavorable.includes(defender.id)) score -= 1;
      if (defender.matchups.favorable.includes(attacker.id)) score -= 0.6;
      if (defender.matchups.unfavorable.includes(attacker.id)) score += 0.6;
      return OA.clamp(score, -1.5, 1.5);
    }
    reason(attacker, defender) {
      const value = this.score(attacker, defender);
      if (value > 0.5) return `${attacker.name} explora ${defender.weaknesses[0] || "a fraqueza do alvo"}.`;
      if (value < -0.5) return `${defender.name} responde com ${defender.strengths[0] || "vantagem tática"}.`;
      return "Confronto flexível decidido por execução e física.";
    }
    chooseEnemy(playerCharacter, random, balance, difficulty, recent = []) {
      const target = balance.get(playerCharacter.id) * ({ easy: 0.94, normal: 1, hard: 1.07 }[difficulty] || 1);
      let pool = OA.CharacterRegistry.all().filter((character) => character.id !== playerCharacter.id && !recent.slice(0, 3).includes(character.id));
      if (!pool.length) pool = OA.CharacterRegistry.all().filter((character) => character.id !== playerCharacter.id);
      const nearest = balance.nearest(target, pool).slice(0, 14);
      const safe = difficulty === "normal" ? nearest.filter((character) => this.score(character, playerCharacter) < 1.25) : nearest;
      return random.pick(safe.length ? safe : nearest);
    }
  }
  OA.MatchupSystem = MatchupSystem;
}());
