(function () {
  "use strict";
  const OA = window.OrbArena;

  class State {
    constructor() {
      this.screen = "menu";
      this.currentScreen = "menu";
      this.build = null;
      this.currentBuild = null;
      this.selectedCharacter = null;
      this.selectedWeapon = null;
      this.selectedAbilities = {};
      this.selectedPerks = [];
      this.selectedHistoryEntry = null;
      this.selectedBestiaryEntry = null;
      this.filters = Object.create(null);
      this.sort = Object.create(null);
      this.modal = null;
      this.notifications = [];
      this.lastBattle = null;
      this.settings = { audio: true, speed: 1, hitboxes: false, debug: false };
      this.listeners = new Map();
    }

    set(key, value) {
      const previous = this[key];
      this[key] = value;
      this.emit(key, value, previous);
    }

    patch(values) { for (const [key, value] of Object.entries(values)) this.set(key, value); }

    on(event, listener) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(listener);
      return () => this.listeners.get(event)?.delete(listener);
    }

    emit(event, ...payload) {
      this.listeners.get(event)?.forEach((listener) => listener(...payload));
    }
  }

  OA.State = State;
}());
