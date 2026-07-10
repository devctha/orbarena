(function () {
  "use strict";
  const OA = window.OrbArena;

  OA.PERKS = Object.freeze([
    { id: "kinetic-memory", name: "Memória Cinética", tags: ["impact"], effects: { speedPerCollision: 0.025 } },
    { id: "dense-core", name: "Núcleo Denso", tags: ["impact", "heavy"], effects: { mass: 0.2, speed: -0.05 } },
    { id: "velocity-edge", name: "Lâmina de Velocidade", tags: ["speed"], effects: { speedDamage: 0.28 } },
    { id: "wall-capacitor", name: "Capacitor de Parede", tags: ["bounce"], effects: { shieldOnWall: 8 } },
    { id: "ricochet-crit", name: "Crítico de Ricochete", tags: ["bounce", "critical"], effects: { wallCrit: true } },
    { id: "collision-nova", name: "Nova de Colisão", tags: ["impact"], effects: { collisionExplosion: 0.35 } },
    { id: "coolant-impact", name: "Refrigeração por Impacto", tags: ["impact"], effects: { collisionCooldown: 0.35 } },
    { id: "expanding-core", name: "Núcleo Expansivo", tags: ["speed"], effects: { sizeAtSpeed: 0.12 } },
    { id: "last-bounce", name: "Último Ricochete", tags: ["defense", "bounce"], effects: { lowHealthElasticity: 0.16 } },
    { id: "perfect-retention", name: "Retenção Perfeita", tags: ["bounce"], effects: { wallRetention: 0.06 } },
    { id: "first-contact", name: "Primeiro Contato", tags: ["impact"], effects: { firstImpactDouble: true } },
    { id: "magnetic-crash", name: "Choque Magnético", tags: ["control"], effects: { pullAfterCollision: 110 } },
    { id: "impact-mines", name: "Minas de Impacto", tags: ["projectile", "impact"], effects: { mineOnCollision: true } },
    { id: "burning-limit", name: "Limite Incandescente", tags: ["speed"], effects: { burnAtMax: true } },
    { id: "pain-converter", name: "Conversor de Recuo", tags: ["defense"], effects: { knockbackToShield: 0.035 } },
    { id: "shield-ram", name: "Aríete Blindado", tags: ["impact", "defense"], effects: { shieldFromKnockback: 0.04 } },
    { id: "third-stun", name: "Terceiro Impacto", tags: ["control", "impact"], effects: { thirdCollisionStun: 0.38 } },
    { id: "long-boost", name: "Wall Boost Estendido", tags: ["bounce"], effects: { wallBoostDuration: 0.7 } },
    { id: "rebound-growth", name: "Crescimento de Ricochete", tags: ["bounce"], effects: { speedPerWall: 0.018 } },
    { id: "emergency-thruster", name: "Propulsor de Emergência", tags: ["speed", "defense"], effects: { lowHealthSpeed: 0.22 } }
  ]);
}());
