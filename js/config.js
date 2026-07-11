(function () {
  "use strict";

  const OrbArena = window.OrbArena = window.OrbArena || {};

  OrbArena.VERSION = "0.8.0-secure-progression";
  OrbArena.CREDITS = Object.freeze({ creator: "Duke Dandalian", text: "Todos os direitos de criação, design, desenvolvimento e direção atribuídos a Duke Dandalian." });
  OrbArena.CONFIG = Object.freeze({
    arena: Object.freeze({ width: 960, height: 540, padding: 18 }),
    loop: Object.freeze({ fixedStep: 1 / 120, maxFrame: 0.1, maxSteps: 48 }),
    battle: Object.freeze({ countdown: 1.55, timeLimit: 78, escalationAt: 20, arenaShiftAt: 40, suddenDeathAt: 60 }),
    storageKey: "orb-arena-chaos-protocol-v1",
    presets: Object.freeze({
      balanced: Object.freeze({ label: "Vanguarda", health: 155, damage: 15, speed: 360, mass: 1, radius: 27, armor: 8, acceleration: 520, attackRate: 0.7, elasticity: 0.96, friction: 0.1, minSpeed: 135, absoluteMaxSpeed: 920, knockbackResistance: 0.12, bounceMultiplier: 1, impactMultiplier: 1, critChance: 0.1 }),
      striker: Object.freeze({ label: "Vértice", health: 125, damage: 18, speed: 425, mass: 0.8, radius: 24, armor: 3, acceleration: 650, attackRate: 0.52, elasticity: 1.01, friction: 0.075, minSpeed: 165, absoluteMaxSpeed: 1060, knockbackResistance: 0.04, bounceMultiplier: 1.06, impactMultiplier: 1.08, critChance: 0.14 }),
      tank: Object.freeze({ label: "Bastião", health: 205, damage: 14, speed: 305, mass: 1.42, radius: 31, armor: 17, acceleration: 420, attackRate: 0.88, elasticity: 0.91, friction: 0.14, minSpeed: 110, absoluteMaxSpeed: 790, knockbackResistance: 0.28, bounceMultiplier: 0.96, impactMultiplier: 1.18, critChance: 0.07 })
    }),
    difficulties: Object.freeze({
      easy: Object.freeze({ label: "Fácil", power: 0.86, aggression: 0.88 }),
      normal: Object.freeze({ label: "Normal", power: 1, aggression: 1 }),
      hard: Object.freeze({ label: "Difícil", power: 1.14, aggression: 1.12 })
    }),
    enemyNames: Object.freeze(["HEX-PRIME", "VOIDLING", "SABLE-9", "MÖBIUS", "KRAKEN-Ø", "PARALLAX", "ECHO-13", "NEMESIS", "CALIGO", "VECTOR-X", "RIFTBORN", "OBLIVION"]),
    enemyStyles: Object.freeze(["Agressivo", "Perseguidor", "Cauteloso", "Caótico", "Tanque", "Berserker"]),
    enemyColors: Object.freeze(["#ff4f87", "#a767ff", "#ff8b5c", "#d858ff", "#ffcc5c", "#7b61ff"])
  });

  OrbArena.clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  OrbArena.lerp = function (start, end, amount) {
    return start + (end - start) * amount;
  };

  // Compatibilidade para simulações legadas; o TeamSystem substitui estes helpers em partidas modernas.
  OrbArena.getFighters = (world, aliveOnly = false) => (world.fighters || [world.player, world.enemy]).filter((fighter) => fighter && (!aliveOnly || fighter.alive));
  OrbArena.findTarget = (world, fighter) => {
    const candidates = OrbArena.getFighters(world, true).filter((other) => other !== fighter && (world.match?.friendlyFire || (other.teamId || other.team) !== (fighter.teamId || fighter.team)));
    return candidates.sort((a, b) => Math.hypot(a.x - fighter.x, a.y - fighter.y) - Math.hypot(b.x - fighter.x, b.y - fighter.y))[0] || null;
  };
}());
