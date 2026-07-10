(function () {
  "use strict";
  const OA = window.OrbArena;
  class ReplaySystem {
    constructor(interval = .25, maxSnapshots = 960) { this.interval = interval; this.maxSnapshots = maxSnapshots; this.reset(); }
    reset() { this.timer = 0; this.snapshots = []; this.markers = []; this.lastEntry = 0; }
    capture(world, dt) {
      this.timer -= dt;
      if (this.timer > 0) return;
      this.timer += this.interval;
      const fighters = OA.getFighters(world).map((fighter) => ({ id: fighter.id, name: fighter.name, teamId: fighter.teamId, color: fighter.color, stroke: fighter.stroke, x: +fighter.x.toFixed(2), y: +fighter.y.toFixed(2), vx: +fighter.vx.toFixed(2), vy: +fighter.vy.toFixed(2), radius: fighter.radius, health: +fighter.health.toFixed(2), maxHealth: fighter.maxHealth, shield: +fighter.shield.toFixed(2), alive: fighter.alive, wallBoost: fighter.wallBoostTimer > 0, ultimate: +(fighter.characterState?.ultimateCharge || 0).toFixed(1), status: Object.keys(fighter.status).filter((id) => fighter.status[id] > 0).slice(0, 6) }));
      this.snapshots.push({ time: +world.time.toFixed(3), phase: world.battlePhase, fighters, projectiles: world.projectilesSnapshot || [] });
      if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
      const entries = world.logger?.entries || [];
      for (; this.lastEntry < entries.length; this.lastEntry += 1) {
        const entry = entries[this.lastEntry];
        if (["elimination", "ultimate", "wallBoost", "collision"].includes(entry.type) || entry.critical) this.markers.push({ ...entry, index: this.snapshots.length - 1 });
      }
      if (this.markers.length > 180) this.markers.splice(0, this.markers.length - 180);
    }
    finalize(world) { return { version: 1, seed: world.seed, mode: world.mode, arenaId: world.arena.id, arena: { width: world.arena.width, height: world.arena.height, padding: world.arena.padding }, duration: world.time, interval: this.interval, snapshots: this.snapshots, markers: this.markers }; }
    static sample(replay, time) {
      if (!replay?.snapshots?.length) return null;
      const index = OA.clamp(Math.floor(time / replay.interval), 0, replay.snapshots.length - 1), a = replay.snapshots[index], b = replay.snapshots[Math.min(index + 1, replay.snapshots.length - 1)], blend = b.time === a.time ? 0 : OA.clamp((time - a.time) / (b.time - a.time), 0, 1);
      return { ...a, time, fighters: a.fighters.map((fighter) => { const next = b.fighters.find((item) => item.id === fighter.id) || fighter; return { ...fighter, x: OA.lerp(fighter.x, next.x, blend), y: OA.lerp(fighter.y, next.y, blend), health: OA.lerp(fighter.health, next.health, blend), shield: OA.lerp(fighter.shield, next.shield, blend), alive: blend < .5 ? fighter.alive : next.alive }; }) };
    }
    dispose() { this.snapshots.length = 0; this.markers.length = 0; }
  }
  OA.ReplaySystem = ReplaySystem;
}());
