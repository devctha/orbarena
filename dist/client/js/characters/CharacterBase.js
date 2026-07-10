(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterBase {
    constructor(definition) {
      const required = ["id", "name", "title", "description", "personality", "class", "rarity", "stats", "kit", "mechanic"];
      for (const key of required) if (!definition[key]) throw new Error(`Character Ball sem campo obrigatório: ${key}`);
      Object.assign(this, definition);
      this.subclass = definition.subclass || definition.class;
      const roleByClass={Assassino:"Executor",Atirador:"Dano à distância",Berserker:"Pressão",Caótico:"Disrupção",Controlador:"Controle",Defensor:"Proteção",Elemental:"Dano elemental",Híbrido:"Flexível",Invocador:"Invocação",Lutador:"Duelista",Mago:"Poder de área",Parasita:"Sustentação",Suporte:"Suporte",Tanque:"Linha de frente",Temporal:"Manipulação temporal"};
      this.role = definition.role && definition.role !== "Duelista" ? definition.role : (roleByClass[definition.class] || "Duelista");
      this.secondary = definition.secondary || definition.color;
      this.glow = definition.glow || definition.color;
      this.texture = definition.texture || "core";
      this.icon = definition.icon || "●";
      this.element = definition.element || "Cinético";
      this.damageType = definition.damageType || "Físico";
      this.difficulty = definition.difficulty || 2;
      this.strengths = definition.strengths || [];
      this.weaknesses = definition.weaknesses || [];
      this.synergies = definition.synergies || [];
      this.counters = definition.counters || [];
      this.matchups = definition.matchups || { favorable: [], unfavorable: [] };
      this.tags = definition.tags || [];
      this.ai = definition.ai || {};
      this.powerId = definition.powerId || null;
      this.powerIds = definition.powerIds || (this.powerId ? [this.powerId] : []);
      this.limits = definition.limits || {};
      this.cooldowns = definition.cooldowns || { active: 7, ultimate: 18 };
      this.visual = definition.visual || { aura: this.element, ring: this.class, core: this.texture, marks: this.tags.slice(0, 2) };
      this.unlock = definition.unlock || { type: "starter", label: "Disponível" };
      this.quotes = definition.quotes || {
        intro: `${this.name}: ${this.title}. Protocolo iniciado.`,
        active: `${this.kit.active}.`, ultimate: `${this.kit.ultimate}!`,
        victory: `${this.name} permanece em órbita.`
      };
      this.vfx = definition.vfx || { core: this.texture, trail: this.secondary, impact: this.element, ultimate: `${this.texture}-overdrive` };
      this.sfx = definition.sfx || { voice: this.personality, active: `${this.element.toLowerCase()}-pulse`, ultimate: "ultimate-impact" };
      this.animations = definition.animations || { idle: "orb-float", hit: "orb-squash", active: `${this.texture}-cast`, ultimate: "orb-overdrive" };
      this.createdAt = definition.createdAt || 0;
      Object.freeze(this.stats);
      Object.freeze(this.kit);
      Object.freeze(this);
    }
  }
  OA.CharacterBase = CharacterBase;
}());
