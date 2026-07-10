(function () {
  "use strict";
  const OA = window.OrbArena;
  const profiles = {
    Agressiva: { aggression: 1.25, risk: 0.75, ability: 1.05, flee: 0.1, wall: 0.7 },
    Cautelosa: { aggression: 0.76, risk: 0.24, ability: 0.92, flee: 0.9, wall: 0.35 },
    Covarde: { aggression: 0.62, risk: 0.12, ability: 0.82, flee: 1.3, wall: 0.18 },
    Calculista: { aggression: 0.88, risk: 0.34, ability: 1.15, flee: 0.55, wall: 0.55 },
    Caótica: { aggression: 1.06, risk: 0.92, ability: 1.25, flee: 0.2, wall: 1 },
    Impulsiva: { aggression: 1.28, risk: 0.86, ability: 1.08, flee: 0.05, wall: 0.9 },
    Predadora: { aggression: 1.18, risk: 0.66, ability: 1.08, flee: 0.18, wall: 0.65 },
    Defensiva: { aggression: 0.72, risk: 0.18, ability: 0.96, flee: 0.8, wall: 0.75 },
    Estratégica: { aggression: 0.9, risk: 0.38, ability: 1.18, flee: 0.48, wall: 0.7 },
    Territorial: { aggression: 0.92, risk: 0.44, ability: 1.08, flee: 0.35, wall: 1.2 },
    Curiosa: { aggression: 0.98, risk: 0.55, ability: 1.1, flee: 0.32, wall: 0.65 },
    Vingativa: { aggression: 1.15, risk: 0.65, ability: 1.12, flee: 0.12, wall: 0.65 },
    Oportunista: { aggression: 1.02, risk: 0.48, ability: 1.2, flee: 0.4, wall: 0.6 },
    Persistente: { aggression: 1.12, risk: 0.6, ability: 1, flee: 0.12, wall: 0.78 },
    Arrogante: { aggression: 1.08, risk: 0.72, ability: 1.16, flee: 0.05, wall: 0.65 }
  };
  class CharacterAI {
    static apply(fighter, character) {
      const profile = profiles[character.personality] || profiles.Estratégica;
      fighter.ai.aggression = profile.aggression * (character.ai.aggression || 1);
      fighter.ai.risk = character.ai.risk ?? profile.risk;
      fighter.ai.abilityPriority = character.ai.abilityPriority || profile.ability;
      fighter.ai.fleeWeight = profile.flee;
      fighter.ai.wallPreference = character.ai.wallUse || profile.wall;
      fighter.ai.summonPriority = character.ai.summonPriority || 0.6;
      fighter.ai.zonePriority = character.ai.zonePriority || 0.6;
      fighter.ai.centerPriority = character.ai.centerPriority || 0.35;
      fighter.ai.healPriority = character.ai.healPriority || 0.7;
      fighter.ai.projectileResponse = character.ai.projectileResponse || 0.8;
      fighter.ai.ultimatePriority = character.ai.ultimatePriority || profile.ability;
      fighter.ai.desiredDistance = character.ai.preferredDistance || fighter.ai.desiredDistance;
      fighter.ai.personality = character.personality;
    }
  }
  OA.CharacterAI = CharacterAI;
}());
