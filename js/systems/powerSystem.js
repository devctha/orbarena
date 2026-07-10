(function () {
  "use strict";
  const OA = window.OrbArena;
  class PowerSystem {
    constructor(random, particles, audio) { this.random = random; this.particles = particles; this.audio = audio; }
    activate(id, world, actor, target, context, amplified = false) {
      const power = OA.PowerRegistry.get(id);
      if (!power || !actor.alive || !power.canActivate({ world, actor, target, context })) return power?.cooldown || 7;
      const current = actor.powerCooldowns[id] || 0;
      if (!amplified && current > 0) return Math.max(1, current);
      const payload = { world, actor, target, context, random: this.random, amplified, power };
      power.activate(payload);
      actor.powerCooldowns[id] = amplified ? power.cooldown * 0.45 : power.cooldown;
      actor.characterTelemetry.powerCasts = (actor.characterTelemetry.powerCasts || 0) + 1;
      actor.characterTelemetry.powerUses ||= Object.create(null);
      actor.characterTelemetry.powerUses[id] = (actor.characterTelemetry.powerUses[id] || 0) + 1;
      this.particles.emitAbility(actor.x, actor.y, actor.glowColor, power.category);
      this.audio.ability(power.category, amplified ? 70 : 28);
      return power.cooldown;
    }
    update(world, actor, target, dt, context) {
      for (const id of Object.keys(actor.powerCooldowns)) actor.powerCooldowns[id] = Math.max(0, actor.powerCooldowns[id] - dt);
      const ids = [...new Set([actor.character?.powerId, ...(actor.equippedPowerIds || [])].filter(Boolean))];
      for (const id of ids) { const power = OA.PowerRegistry.get(id); power?.update({ world, actor, target, context, random: this.random, dt, power }); }
      actor.powerEffects = (actor.powerEffects || []).filter((effect) => { effect.life -= dt; if (effect.life <= 0) effect.onEnd?.(); return effect.life > 0; });
    }
    event(kind, world, actor, target, event, context) {
      const ids = [...new Set([actor.character?.powerId, ...(actor.equippedPowerIds || [])].filter(Boolean))];
      for (const id of ids) { const power = OA.PowerRegistry.get(id); const handler = kind === "receive" ? power?.onReceive : power?.onEvent; handler?.({ world, actor, target, event, context, random: this.random, power }); }
    }
    ultimate(id, world, actor, target, context) {
      const power = OA.PowerRegistry.get(id);
      if (!power) return;
      if (power.ultimate) power.ultimate({ world, actor, target, context, random: this.random, power });
      else { this.activate(id, world, actor, target, context, true); context.radial(world, actor, target, 230, 18, 320, `${id}-ultimate`, true); }
    }
  }
  OA.PowerSystem = PowerSystem;
}());
