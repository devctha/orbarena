(function () {
  "use strict";
  const OA = window.OrbArena;

  OA.WEAPONS = Object.freeze([
    { id: "spin-blade", name: "Espada de Íons", kind: "melee", pattern: "spin", damage: 17, reach: 62, width: 6, rotationSpeed: 8.4, cooldown: 0.62, activeWindow: 0.34, knockback: 175, color: "#71f4ff", tags: ["impact", "spin"] },
    { id: "twin-daggers", name: "Adagas Gêmeas", kind: "melee", pattern: "twin", damage: 10, reach: 50, width: 5, rotationSpeed: 13, cooldown: 0.32, activeWindow: 0.2, knockback: 90, color: "#a8fff4", tags: ["speed", "critical"] },
    { id: "gravity-hammer", name: "Martelo Gravitacional", kind: "melee", pattern: "smash", damage: 27, reach: 57, width: 13, rotationSpeed: 4.2, cooldown: 1.18, activeWindow: 0.22, knockback: 330, color: "#bc8cff", tags: ["impact", "heavy"] },
    { id: "void-spear", name: "Lança do Vazio", kind: "melee", pattern: "thrust", damage: 21, reach: 82, width: 5, rotationSpeed: 5.5, cooldown: 0.86, activeWindow: 0.28, knockback: 210, color: "#a45cff", tags: ["precision", "pierce"] },
    { id: "blood-scythe", name: "Foice Sanguínea", kind: "melee", pattern: "sweep", damage: 19, reach: 70, width: 8, rotationSpeed: 6.1, cooldown: 0.93, activeWindow: 0.4, knockback: 145, lifesteal: 0.2, color: "#ff5f87", tags: ["sustain", "spin"] },
    { id: "impact-shield", name: "Escudo Cinético", kind: "melee", pattern: "shield", damage: 13, reach: 48, width: 18, rotationSpeed: 3.8, cooldown: 0.74, activeWindow: 0.46, knockback: 285, guard: 0.25, color: "#69a8ff", tags: ["defense", "impact"] },
    { id: "arc-cannon", name: "Canhão de Arco", kind: "projectile", pattern: "single", damage: 18, cooldown: 0.78, projectileSpeed: 690, projectileRadius: 5, knockback: 170, bounces: 1, color: "#67eaff", tags: ["projectile", "bounce"] },
    { id: "nova-shotgun", name: "Escopeta Nova", kind: "projectile", pattern: "spread", pellets: 5, spread: 0.34, damage: 7, cooldown: 0.92, projectileSpeed: 590, projectileRadius: 4, knockback: 76, bounces: 0, color: "#ffb56b", tags: ["projectile", "burst"] },
    { id: "seeker-rack", name: "Rack de Mísseis", kind: "projectile", pattern: "burst", pellets: 3, spread: 0.18, damage: 9, cooldown: 1.22, projectileSpeed: 420, projectileRadius: 6, knockback: 110, homing: 2.4, bounces: 0, color: "#ff6f9c", tags: ["projectile", "homing"] },
    { id: "prism-laser", name: "Laser Prismático", kind: "projectile", pattern: "beam", damage: 12, cooldown: 0.48, projectileSpeed: 1180, projectileRadius: 3, knockback: 45, pierce: 1, bounces: 2, color: "#d7fbff", tags: ["projectile", "precision"] },
    { id: "mine-layer", name: "Semeador de Minas", kind: "projectile", pattern: "mine", damage: 24, cooldown: 1.35, projectileSpeed: 70, projectileRadius: 8, knockback: 260, life: 5, bounces: 0, color: "#ffca65", tags: ["projectile", "control"] },
    { id: "chaos-chain", name: "Corrente do Caos", kind: "melee", pattern: "chain", damage: 16, reach: 92, width: 7, rotationSpeed: 7.3, cooldown: 0.8, activeWindow: 0.5, knockback: 190, color: "#f06cff", tags: ["control", "spin"] }
  ]);

  OA.weaponById = function (id) { return OA.WEAPONS.find((weapon) => weapon.id === id); };
}());
