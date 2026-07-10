(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterRegistry {
    static characters = new Map();
    static register(definition) {
      if (this.characters.has(definition.id)) throw new Error(`Character Ball duplicada: ${definition.id}`);
      const base = OA.CHARACTER_ARCHETYPES[definition.class];
      if (!base) throw new Error(`Classe inválida em ${definition.id}: ${definition.class}`);
      const stats = { ...base, ...(definition.stats || {}) };
      const character = new OA.CharacterBase({ ...definition, stats, createdAt: this.characters.size });
      this.characters.set(character.id, character);
      return character;
    }
    static get(id) { return this.characters.get(id); }
    static all() { return [...this.characters.values()]; }
    static byClass(className) { return this.all().filter((character) => character.class === className); }
    static random(random, filter = () => true) { const pool = this.all().filter(filter); return pool.length ? random.pick(pool) : this.get("echo"); }
  }
  OA.CharacterRegistry = CharacterRegistry;
}());
