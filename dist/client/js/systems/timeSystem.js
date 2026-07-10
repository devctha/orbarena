(function () {
  "use strict";
  const OA = window.OrbArena;
  class TimeSystem {
    constructor() { this.effects = []; }
    slowFighter(team, factor, duration, source) { this.effects.push({ scope: "fighter", team, factor: OA.clamp(factor, 0.12, 1), life: duration, source }); }
    slowProjectiles(team, factor, duration, source) { this.effects.push({ scope: "projectile", team, factor: OA.clamp(factor, 0.05, 1), life: duration, source }); }
    slowAbilities(team, factor, duration, source) { this.effects.push({ scope: "ability", team, factor: OA.clamp(factor, 0.2, 1), life: duration, source }); }
    slowGame(factor, duration, source) { this.effects.push({ scope: "game", team: "all", factor: OA.clamp(factor, 0.2, 1), life: duration, source }); }
    slowVisual(factor, duration, source) { this.effects.push({ scope: "visual", team: "all", factor: OA.clamp(factor, 0.1, 1), life: duration, source }); }
    slowEffect(factor, duration, source) { this.effects.push({ scope: "effect", team: "all", factor: OA.clamp(factor, 0.1, 1), life: duration, source }); }
    slowAnimation(factor, duration, source) { this.effects.push({ scope: "animation", team: "all", factor: OA.clamp(factor, 0.1, 1), life: duration, source }); }
    update(world, dt) {
      world.timeScales = { game: 1, visual: 1, effect: 1, animation: 1, fighter: { player: 1, enemy: 1 }, projectile: { player: 1, enemy: 1 }, ability: { player: 1, enemy: 1 } };
      for (const effect of this.effects) {
        effect.life -= dt;
        if (["game","visual","effect","animation"].includes(effect.scope)) world.timeScales[effect.scope] = Math.min(world.timeScales[effect.scope], effect.factor);
        else world.timeScales[effect.scope][effect.team] = Math.min(world.timeScales[effect.scope][effect.team], effect.factor);
        if (effect.source?.characterTelemetry && effect.factor < 1) effect.source.characterTelemetry.timeSlowed += dt;
      }
      this.effects = this.effects.filter((effect) => effect.life > 0);
    }
  }
  OA.TimeSystem = TimeSystem;
}());
