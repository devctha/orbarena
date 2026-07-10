(function () {
  "use strict";
  const OA = window.OrbArena;

  OA.PHYSICS_PRESETS = Object.freeze({
    arcade: Object.freeze({ id: "arcade", name: "Arcade", gravity: 0, friction: 0.1, globalElasticity: 1, energyRetention: 0.98, bounceMultiplier: 1.03, repulsion: 1.15, collisionDamage: 0.034, knockback: 1.1, minSpeed: 135, maxSpeed: 720, acceleration: 1, maxSubsteps: 6, wallBoost: 1.1, wallBoostThreshold: 275, wallFriction: 0.985, camera: 0.75, particles: 1 }),
    realistic: Object.freeze({ id: "realistic", name: "Realista", gravity: 0, friction: 0.22, globalElasticity: 0.9, energyRetention: 0.92, bounceMultiplier: 0.96, repulsion: 0.82, collisionDamage: 0.029, knockback: 0.9, minSpeed: 95, maxSpeed: 590, acceleration: 0.9, maxSubsteps: 6, wallBoost: 1, wallBoostThreshold: 340, wallFriction: 0.95, camera: 0.5, particles: 0.75 }),
    chaotic: Object.freeze({ id: "chaotic", name: "Caótico", gravity: 18, friction: 0.055, globalElasticity: 1.04, energyRetention: 1.01, bounceMultiplier: 1.08, repulsion: 1.42, collisionDamage: 0.041, knockback: 1.42, minSpeed: 170, maxSpeed: 880, acceleration: 1.2, maxSubsteps: 8, wallBoost: 1.15, wallBoostThreshold: 240, wallFriction: 0.995, camera: 1, particles: 1.25 }),
    superfast: Object.freeze({ id: "superfast", name: "Super rápido", gravity: 0, friction: 0.04, globalElasticity: 1.02, energyRetention: 1, bounceMultiplier: 1.07, repulsion: 1.22, collisionDamage: 0.027, knockback: 1.18, minSpeed: 230, maxSpeed: 980, acceleration: 1.42, maxSubsteps: 8, wallBoost: 1.12, wallBoostThreshold: 300, wallFriction: 0.996, camera: 0.7, particles: 0.9 }),
    heavy: Object.freeze({ id: "heavy", name: "Pesado", gravity: 0, friction: 0.18, globalElasticity: 0.88, energyRetention: 0.94, bounceMultiplier: 0.98, repulsion: 1.55, collisionDamage: 0.052, knockback: 1.3, minSpeed: 90, maxSpeed: 560, acceleration: 0.78, maxSubsteps: 6, wallBoost: 1.06, wallBoostThreshold: 260, wallFriction: 0.96, camera: 1, particles: 1.15 }),
    frictionless: Object.freeze({ id: "frictionless", name: "Sem atrito", gravity: 0, friction: 0.008, globalElasticity: 1, energyRetention: 1, bounceMultiplier: 1.01, repulsion: 1.05, collisionDamage: 0.031, knockback: 1.08, minSpeed: 150, maxSpeed: 760, acceleration: 0.7, maxSubsteps: 8, wallBoost: 1.04, wallBoostThreshold: 320, wallFriction: 1, camera: 0.55, particles: 0.8 }),
    pinball: Object.freeze({ id: "pinball", name: "PINBALL CHAOS", gravity: 0, friction: 0.018, globalElasticity: 1.08, energyRetention: 1.025, bounceMultiplier: 1.13, repulsion: 1.72, collisionDamage: 0.046, knockback: 1.62, minSpeed: 205, maxSpeed: 960, acceleration: 1.2, maxSubsteps: 8, wallBoost: 1.2, wallBoostThreshold: 210, wallFriction: 1, camera: 1, particles: 1.45 }),
    cinematic: Object.freeze({ id: "cinematic", name: "Cinemático", gravity: 0, friction: 0.09, globalElasticity: 0.99, energyRetention: 0.98, bounceMultiplier: 1.04, repulsion: 1.34, collisionDamage: 0.038, knockback: 1.32, minSpeed: 125, maxSpeed: 710, acceleration: 0.95, maxSubsteps: 8, wallBoost: 1.1, wallBoostThreshold: 265, wallFriction: 0.985, camera: 1.2, particles: 1.5 })
  });

  OA.getPhysicsPreset = function (id) {
    return { ...(OA.PHYSICS_PRESETS[id] || OA.PHYSICS_PRESETS.arcade) };
  };
}());
