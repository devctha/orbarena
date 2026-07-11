export const STARTER_CATALOG = Object.freeze({
  character: ["echo", "aegis", "volt", "frost", "terra", "lumina"],
  stick: ["echo-stick", "aegis-stick", "volt-stick", "frost-stick", "terra-stick", "lumina-stick"],
  weapon: ["arc-cannon", "pulse-blade", "kinetic-gauntlet"],
  ability: ["dash-strike", "pulse-shield", "gravity-well", "frost-nova", "repair-wave", "ember-shot"],
  perk: ["second-wind", "wall-runner", "steady-core", "quick-charge", "impact-guard", "elemental-sync"],
  arena: ["classic", "reactor"],
  build: ["starter-vanguard", "starter-controller"]
});

export const SHOP_ITEMS = Object.freeze([
  { id: "ability-kinetic-spark", type: "ability", itemId: "kinetic-spark", name: "Kinetic Spark", description: "Skill universal de entrada com impacto legível.", rarity: "uncommon", price: 600, requiredLevel: 1 },
  { id: "char-singularity", type: "character", itemId: "singularity", name: "Singularity", description: "Controle gravitacional de alto risco.", rarity: "mythic", price: 4200, requiredLevel: 12 },
  { id: "char-ember", type: "character", itemId: "ember", name: "Ember", description: "Pressão elemental ofensiva.", rarity: "rare", price: 1600, requiredLevel: 4 },
  { id: "ability-time-shear", type: "ability", itemId: "time-shear", name: "Time Shear", description: "Janela temporal de controle.", rarity: "epic", price: 1900, requiredLevel: 8 },
  { id: "perk-burst-anchor", type: "perk", itemId: "burst-anchor", name: "Burst Anchor", description: "Reduz picos de knockback.", rarity: "rare", price: 1100, requiredLevel: 5 },
  { id: "weapon-void-lance", type: "weapon", itemId: "void-lance", name: "Void Lance", description: "Arma precisa de longo alcance.", rarity: "epic", price: 2300, requiredLevel: 9 },
  { id: "arena-forge", type: "arena", itemId: "forge", name: "Forja Orbital", description: "Arena alternativa com leitura clara.", rarity: "uncommon", price: 900, requiredLevel: 3 }
]);

export const BANNERS = Object.freeze([
  {
    id: "beginner-signal", name: "Sinal Iniciante", description: "Até 20 pulls; personagem garantido no primeiro conjunto de 10.", artwork: "orbital-gate", type: "beginner", cost: 5, tenCost: 45, currency: "tickets", enabled: true, maxPulls: 20,
    pityRules: { soft: 8, hard: 10, carries: false }, guaranteeRules: { tenMinRarity: "rare", firstTenCharacter: true },
    rates: { common: 55, uncommon: 27, rare: 12, epic: 5, legendary: 0.9, mythic: 0.1 },
    pool: [
      { id: "ember", type: "character", rarity: "rare", weight: 8 }, { id: "nova", type: "character", rarity: "epic", weight: 3 },
      { id: "gravity-well", type: "ability", rarity: "rare", weight: 8 }, { id: "pulse-blade", type: "weapon", rarity: "uncommon", weight: 17 },
      { id: "second-wind", type: "perk", rarity: "common", weight: 35 }, { id: "void-lance", type: "weapon", rarity: "legendary", weight: 1 }
    ]
  },
  {
    id: "permanent-orbit", name: "Órbita Permanente", description: "Personagens, habilidades, perks e armas sempre disponíveis.", artwork: "deep-orbit", type: "permanent", cost: 10, tenCost: 90, currency: "gems", enabled: true, maxPulls: null,
    pityRules: { soft: 60, hard: 80, carries: true }, guaranteeRules: { tenMinRarity: "rare", firstTenCharacter: false },
    rates: { common: 52, uncommon: 28, rare: 14, epic: 5, legendary: 0.9, mythic: 0.1 },
    pool: [
      { id: "singularity", type: "character", rarity: "mythic", weight: 0.1 }, { id: "nova", type: "character", rarity: "legendary", weight: 0.9 },
      { id: "time-shear", type: "ability", rarity: "epic", weight: 5 }, { id: "void-lance", type: "weapon", rarity: "rare", weight: 14 },
      { id: "burst-anchor", type: "perk", rarity: "uncommon", weight: 28 }, { id: "steady-core", type: "perk", rarity: "common", weight: 52 }
    ]
  }
]);

export const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
export const levelRequirement = (level) => Math.round(250 * Math.pow(Math.max(1, level), 1.45));
