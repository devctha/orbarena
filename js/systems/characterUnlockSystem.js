(function () {
  "use strict";
  const OA = window.OrbArena;
  class CharacterUnlockSystem {
    constructor(storage) {
      this.storage = storage;
      const settings = storage.read().settings || {};
      this.favorites = new Set(settings.characterFavorites || []);
      this.rotation = new Set(settings.characterRotation || []);
      this.unlocked = new Set(settings.charactersUnlocked || OA.CharacterRegistry.all().map((character) => character.id));
    }
    isUnlocked(id) { return this.unlocked.has(id); }
    unlock(id) { this.unlocked.add(id); this.persist(); }
    isFavorite(id) { return this.favorites.has(id); }
    toggleFavorite(id) { this.favorites.has(id) ? this.favorites.delete(id) : this.favorites.add(id); this.persist(); return this.favorites.has(id); }
    persist() { this.storage.saveSettings({ characterFavorites: [...this.favorites], characterRotation: [...this.rotation], charactersUnlocked: [...this.unlocked] }); }
  }
  OA.CharacterUnlockSystem = CharacterUnlockSystem;
}());
