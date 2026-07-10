(function () {
  "use strict";
  const OA = window.OrbArena;

  class Random {
    constructor(seed) {
      this.seed = String(seed || Random.createSeed());
      this.state = Random.hash(this.seed) || 0x9e3779b9;
    }

    static hash(text) {
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    static createSeed() {
      const part = Date.now().toString(36).toUpperCase();
      const entropy = Math.floor(Math.random() * 0xffffff).toString(36).toUpperCase().padStart(5, "0");
      return `CP-${part.slice(-6)}-${entropy}`;
    }

    next() {
      let value = this.state += 0x6d2b79f5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }

    range(min, max) { return min + (max - min) * this.next(); }
    int(min, max) { return Math.floor(this.range(min, max + 1)); }
    pick(list) { return list[Math.floor(this.next() * list.length)]; }
    chance(probability) { return this.next() < probability; }
    sign() { return this.chance(0.5) ? 1 : -1; }
  }

  OA.Random = Random;
}());
