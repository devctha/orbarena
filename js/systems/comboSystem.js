(function () {
  "use strict";
  const OA = window.OrbArena;

  class ComboSystem {
    constructor(particles) { this.particles = particles; }

    initialize(fighter) {
      fighter.combo = { count: 0, multiplier: 1, timer: 0, sequence: [], label: "" };
      fighter.comboMultiplier = 1;
    }

    update(world, dt) {
      for (const fighter of [world.player, world.enemy]) {
        fighter.combo.timer = Math.max(0, fighter.combo.timer - dt);
        if (fighter.combo.timer <= 0 && fighter.combo.count > 0) {
          fighter.combo.count = 0;
          fighter.combo.multiplier = 1;
          fighter.comboMultiplier = 1;
          fighter.combo.label = "";
          fighter.combo.sequence = [];
        }
      }
    }

    process(world, events) {
      const valid = new Set(["wall", "collision", "weapon", "projectile", "ability"]);
      for (const event of events) {
        if (!valid.has(event.type) || !event.fighter?.alive) continue;
        const fighter = event.fighter;
        const combo = fighter.combo;
        combo.sequence.push({ type: event.type, time: world.time });
        combo.sequence = combo.sequence.filter((entry) => world.time - entry.time <= 3.2).slice(-7);
        combo.count = combo.timer > 0 ? combo.count + 1 : 1;
        combo.timer = 2.25;
        combo.multiplier = Math.min(1.65, 1 + Math.max(0, combo.count - 1) * 0.075);
        fighter.comboMultiplier = combo.multiplier;

        const types = combo.sequence.map((entry) => entry.type);
        let label = combo.count >= 3 ? `${combo.count}× CADEIA` : "";
        if (types.slice(-3).join("-") === "wall-collision-wall") label = "PINBALL BREAK";
        else if (types.slice(-2).join("-") === "ability-collision") label = "POWER CRASH";
        else if (types.slice(-2).join("-") === "projectile-collision") label = "CROSS IMPACT";
        else if (types.slice(-3).every((type) => type === "collision")) label = "TRIPLE CRASH";
        if (label && label !== combo.label) {
          combo.label = label;
          fighter.telemetry.combos += 1;
          fighter.telemetry.largestCombo = Math.max(fighter.telemetry.largestCombo, combo.count);
          fighter.setStatus("haste", 1.2, 0.08 + combo.count * 0.012);
          if (combo.count >= 5) fighter.addShield(5 + combo.count);
          this.particles.emitText(fighter.x, fighter.y - fighter.radius - 18, label, fighter.color, true);
        }
      }
    }
  }

  OA.ComboSystem = ComboSystem;
}());
