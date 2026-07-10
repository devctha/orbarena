(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterMechanics {
    static handlers = new Map();
    static register(id, handler) {
      if (this.handlers.has(id)) throw new Error(`Mecânica duplicada: ${id}`);
      this.handlers.set(id, Object.freeze(handler));
    }
    static get(id) { return this.handlers.get(id); }
    static validate() {
      return OA.CharacterRegistry.all().filter((character) => !this.handlers.has(character.mechanic)).map((character) => character.id);
    }
  }
  OA.CharacterMechanics = CharacterMechanics;
}());
