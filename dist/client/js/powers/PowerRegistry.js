(function () {
  "use strict";
  const OA = window.OrbArena;
  class PowerRegistry {
    static powers = new Map();
    static register(definition) {
      const required = ["id", "name", "category", "type", "rarity", "description", "cooldown", "duration", "powerBudget", "tags", "activate"];
      for (const key of required) if (definition[key] === undefined || definition[key] === null) throw new Error(`Poder sem campo obrigatório: ${key}`);
      if (this.powers.has(definition.id)) throw new Error(`Poder duplicado: ${definition.id}`);
      if (!Number.isFinite(definition.cooldown) || definition.cooldown < OA.CHARACTER_LIMITS.maxCooldownFloor) throw new Error(`Cooldown inválido: ${definition.id}`);
      const power = Object.freeze({ icon: "◇", cost: 0, canActivate: () => true, update: () => false, deactivate: () => false, counters: ["silêncio", "interrupção"], interactions: definition.tags.slice(0,2), unlocked: true, ...definition });
      this.powers.set(power.id, power);
      return power;
    }
    static get(id) { return this.powers.get(id); }
    static all() { return [...this.powers.values()]; }
    static validate() { return this.all().filter((p) => !p.id || !p.name || !Array.isArray(p.tags) || typeof p.activate !== "function").map((p) => p.id); }
  }
  OA.PowerRegistry = PowerRegistry;
  OA.powerById = (id) => PowerRegistry.get(id);
}());
