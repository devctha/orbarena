(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterFactory {
    static create(character, options) {
      if (!character) throw new Error("CharacterFactory recebeu personagem inexistente");
      const scale = options.powerScale || 1;
      const stats = { ...character.stats, health: Math.round(character.stats.health * scale), damage: character.stats.damage * scale, armor: character.stats.armor * scale };
      const fighter = new OA.Fighter({
        id: options.id, team: options.team, name: character.name, color: character.color,
        stroke: character.glow, trailColor: character.secondary,
        x: options.x, y: options.y, vx: options.vx, vy: options.vy,
        ...stats, style: character.personality, aggression: 1,
        orbit: options.orbit, phase: options.phase,
        desiredDistance: OA.CHARACTER_CLASSES[character.class].preferredDistance
      });
      fighter.character = character;
      fighter.characterId = character.id;
      fighter.secondaryColor = character.secondary;
      fighter.glowColor = character.glow;
      fighter.texture = character.texture;
      fighter.characterState = {
        activeCooldown: 0, ultimateCharge: 0, ultimateCooldown: 0,
        activeUses: 0, ultimateUses: 0, meter: 0, stacks: 0,
        transformed: false, mode: 0, snapshot: null, data: Object.create(null)
      };
      fighter.powerCooldowns = Object.create(null);
      fighter.powerEffects = [];
      fighter.lastDamageType = "physical";
      fighter.timeScale = 1;
      fighter.abilityTimeScale = 1;
      fighter.controlResistance = Object.create(null);
      fighter.characterTelemetry = {
        activeDamage: 0, ultimateDamage: 0, clonesCreated: 0, cloneTime: 0,
        summonsCreated: 0, poisonApplied: 0, poisonDamage: 0, spikesActivated: 0,
        timeSlowed: 0, healing: 0, shieldGenerated: 0, controlApplied: 0,
        activeHits: 0, activeCasts: 0
      };
      OA.CharacterAI.apply(fighter, character);
      return fighter;
    }
  }
  OA.CharacterFactory = CharacterFactory;
}());
