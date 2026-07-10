(function () {
  "use strict";
  const OA = window.OrbArena;
  OA.CHARACTER_LIMITS = Object.freeze({
    maxClones: 4, maxSummons: 10, maxStun: 1.1, maxSlow: 4.5, minimumSlowFactor: 0.28,
    maxDamagePerHitRatio: 0.34, maxHealingPerSecondRatio: 0.12, maxShieldRatio: 0.6,
    maxLifesteal: 0.35, maxInvulnerability: 1.2, maxPhase: 2.5, maxCooldownReduction: 0.55,
    maxSpeedMultiplier: 1.8, maxDamageMultiplier: 1.7, maxPoisonStacks: 8,
    maxBurnStacks: 6, maxProjectiles: 128, maxControlResistance: 0.72,
    maxMines: 16, maxZones: 20, maxStationaryTime: 0.5, maxPowerEffects: 32,
    maxAccelerationMultiplier: 1.8, maxCooldownFloor: 0.35, maxArenaPortals: 4
  });
  OA.CHARACTER_ARCHETYPES = Object.freeze({
    Assassino: { health: 124, damage: 19, speed: 425, mass: 0.78, radius: 24, armor: 3, acceleration: 650, attackRate: 0.52, elasticity: 1.01, friction: 0.07, minSpeed: 170, absoluteMaxSpeed: 1050, knockbackResistance: 0.04, bounceMultiplier: 1.06, impactMultiplier: 1.08, critChance: 0.15 },
    Tanque: { health: 212, damage: 14, speed: 300, mass: 1.45, radius: 31, armor: 18, acceleration: 415, attackRate: 0.9, elasticity: 0.91, friction: 0.14, minSpeed: 105, absoluteMaxSpeed: 790, knockbackResistance: 0.3, bounceMultiplier: 0.96, impactMultiplier: 1.2, critChance: 0.06 },
    Lutador: { health: 174, damage: 17, speed: 365, mass: 1.1, radius: 28, armor: 10, acceleration: 525, attackRate: 0.68, elasticity: 0.96, friction: 0.1, minSpeed: 135, absoluteMaxSpeed: 900, knockbackResistance: 0.16, bounceMultiplier: 1.01, impactMultiplier: 1.1, critChance: 0.1 },
    Mago: { health: 140, damage: 15, speed: 345, mass: 0.9, radius: 26, armor: 5, acceleration: 505, attackRate: 0.78, elasticity: 0.98, friction: 0.09, minSpeed: 125, absoluteMaxSpeed: 880, knockbackResistance: 0.08, bounceMultiplier: 1.02, impactMultiplier: 0.94, critChance: 0.1 },
    Controlador: { health: 158, damage: 13, speed: 335, mass: 1, radius: 27, armor: 8, acceleration: 490, attackRate: 0.8, elasticity: 0.96, friction: 0.11, minSpeed: 120, absoluteMaxSpeed: 850, knockbackResistance: 0.13, bounceMultiplier: 1, impactMultiplier: 1, critChance: 0.08 },
    Invocador: { health: 150, damage: 13, speed: 335, mass: 0.92, radius: 26, armor: 6, acceleration: 480, attackRate: 0.82, elasticity: 0.98, friction: 0.1, minSpeed: 120, absoluteMaxSpeed: 840, knockbackResistance: 0.09, bounceMultiplier: 1, impactMultiplier: 0.95, critChance: 0.08 },
    Suporte: { health: 166, damage: 11, speed: 340, mass: 0.98, radius: 27, armor: 9, acceleration: 480, attackRate: 0.84, elasticity: 0.97, friction: 0.1, minSpeed: 120, absoluteMaxSpeed: 840, knockbackResistance: 0.12, bounceMultiplier: 1, impactMultiplier: 0.92, critChance: 0.07 },
    Atirador: { health: 136, damage: 16, speed: 325, mass: 0.88, radius: 25, armor: 4, acceleration: 455, attackRate: 0.64, elasticity: 0.98, friction: 0.09, minSpeed: 110, absoluteMaxSpeed: 820, knockbackResistance: 0.07, bounceMultiplier: 1, impactMultiplier: 0.92, critChance: 0.13 },
    Caótico: { health: 154, damage: 15, speed: 370, mass: 0.96, radius: 27, armor: 6, acceleration: 550, attackRate: 0.7, elasticity: 1.03, friction: 0.06, minSpeed: 145, absoluteMaxSpeed: 980, knockbackResistance: 0.1, bounceMultiplier: 1.08, impactMultiplier: 1.02, critChance: 0.11 },
    Parasita: { health: 164, damage: 12, speed: 340, mass: 0.94, radius: 26, armor: 7, acceleration: 485, attackRate: 0.76, elasticity: 0.97, friction: 0.1, minSpeed: 120, absoluteMaxSpeed: 850, knockbackResistance: 0.1, bounceMultiplier: 1, impactMultiplier: 0.96, critChance: 0.08 },
    Temporal: { health: 148, damage: 12, speed: 350, mass: 0.9, radius: 26, armor: 6, acceleration: 505, attackRate: 0.8, elasticity: 0.99, friction: 0.08, minSpeed: 130, absoluteMaxSpeed: 890, knockbackResistance: 0.08, bounceMultiplier: 1.02, impactMultiplier: 0.94, critChance: 0.09 },
    Elemental: { health: 158, damage: 15, speed: 355, mass: 1, radius: 27, armor: 7, acceleration: 510, attackRate: 0.73, elasticity: 0.98, friction: 0.09, minSpeed: 130, absoluteMaxSpeed: 890, knockbackResistance: 0.11, bounceMultiplier: 1.02, impactMultiplier: 1.02, critChance: 0.09 },
    Defensor: { health: 190, damage: 12, speed: 315, mass: 1.23, radius: 29, armor: 15, acceleration: 435, attackRate: 0.86, elasticity: 0.93, friction: 0.13, minSpeed: 110, absoluteMaxSpeed: 800, knockbackResistance: 0.24, bounceMultiplier: 0.98, impactMultiplier: 1.04, critChance: 0.07 },
    Berserker: { health: 172, damage: 18, speed: 375, mass: 1.05, radius: 28, armor: 6, acceleration: 560, attackRate: 0.62, elasticity: 0.99, friction: 0.08, minSpeed: 145, absoluteMaxSpeed: 940, knockbackResistance: 0.12, bounceMultiplier: 1.04, impactMultiplier: 1.14, critChance: 0.12 },
    Híbrido: { health: 165, damage: 15, speed: 355, mass: 1, radius: 27, armor: 9, acceleration: 510, attackRate: 0.72, elasticity: 0.98, friction: 0.09, minSpeed: 130, absoluteMaxSpeed: 890, knockbackResistance: 0.13, bounceMultiplier: 1.02, impactMultiplier: 1.02, critChance: 0.1 }
  });
}());
