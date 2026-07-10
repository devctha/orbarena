(function () {
  "use strict";
  const OA = window.OrbArena;
  const KEYS = Object.freeze(["q", "w", "e", "r"]);

  class ControlSystem {
    constructor(abilitySystem, characterSystem, audio) { this.abilities = abilitySystem; this.characters = characterSystem; this.audio = audio; this.gamepadLatch = new Set(); }
    initialize(fighter, options = {}) {
      fighter.controlMode = options.controlMode || fighter.controlMode || "AUTO";
      fighter.autoCast = { ...(fighter.autoCast || {}), ...(options.autoCast || {}) };
      fighter.keybinds = { skill1: "q", skill2: "w", skill3: "e", skill4: "r", ultimate: "f", defensive: " ", ...(options.keybinds || {}) };
      fighter.abilityState = Object.create(null);
      fighter.abilities.forEach((ability, index) => {
        const maxCharges = OA.clamp(Number(ability.charges || (ability.category === "movimento" && ability.cooldown <= 8 ? 2 : 1)), 1, 3);
        fighter.abilityState[ability.id] = { charges: maxCharges, maxCharges, recharge: Math.max(.35, ability.recharge || ability.cooldown), rechargeTimer: 0, castTime: Math.max(0, ability.castTime || (ability.cooldown >= 13 ? .28 : .08)), channel: Math.max(0, ability.channeling || 0), energyCost: Math.max(0, ability.cost || 0), targetType: ability.targetType || this.inferTarget(ability), key: KEYS[index] || String(index + 1), casting: 0 };
        if (fighter.autoCast[ability.id] === undefined) fighter.autoCast[ability.id] = fighter.controlMode === "AUTO";
      });
      fighter.globalCooldown = 0; fighter.castQueue = null;
    }
    inferTarget(ability) {
      if (ability.category === "defesa") return "self";
      if (ability.range >= 180) return "projected";
      if (["controle", "gravidade", "tempo", "veneno"].includes(ability.category)) return "area";
      return "nearest";
    }
    update(world, dt) {
      for (const fighter of OA.getFighters(world)) {
        fighter.globalCooldown = Math.max(0, (fighter.globalCooldown || 0) - dt);
        for (const [id, state] of Object.entries(fighter.abilityState || {})) {
          state.casting = Math.max(0, state.casting - dt);
          if (state.charges >= state.maxCharges) { state.rechargeTimer = 0; continue; }
          state.rechargeTimer -= dt;
          if (state.rechargeTimer <= 0) { state.charges += 1; if (state.charges < state.maxCharges) state.rechargeTimer = state.recharge; }
          fighter.abilityCooldowns[id] = Math.max(0, fighter.abilityCooldowns[id] || 0);
        }
        if (fighter.castQueue) {
          fighter.castQueue.delay -= dt;
          if (fighter.castQueue.delay <= 0) { const queued = fighter.castQueue; fighter.castQueue = null; this.commit(world, fighter, queued.ability, queued.target); }
        }
      }
      this.pollGamepad(world);
    }
    canAutoCast(fighter, ability) { return fighter.controlMode === "AUTO" || fighter.controlMode === "MIXED" && fighter.autoCast?.[ability.id] !== false || fighter.controlMode === "PLAYER" && fighter.autoCast?.[ability.id] === true; }
    available(fighter, ability) { const state = fighter.abilityState?.[ability.id]; return (!state || state.charges > 0) && (fighter.abilityCooldowns[ability.id] || 0) <= 0 && (fighter.globalCooldown || 0) <= 0 && !fighter.castQueue; }
    request(world, fighter, slot, targetHint = null) {
      if (!fighter?.alive) return { ok: false, reason: "Orb indisponível" };
      if (slot === "ultimate" || slot === 4) {
        if (world.rules?.ultimates === false) return { ok: false, reason: "Ultimates desativadas" };
        if ((fighter.characterState?.ultimateCharge || 0) < 100) return { ok: false, reason: "Ultimate carregando" };
        const target = this.target(world, fighter, "nearest", targetHint); this.characters.useUltimate(world, fighter, target, OA.CharacterMechanics.get(fighter.characterId)); return { ok: true, ultimate: true };
      }
      const ability = fighter.abilities[Number(slot)];
      if (!ability) return { ok: false, reason: "Slot vazio" };
      if (!this.available(fighter, ability)) return { ok: false, reason: "Habilidade em recarga" };
      const state = fighter.abilityState?.[ability.id], target = this.target(world, fighter, state?.targetType, targetHint);
      if (!target && state?.targetType !== "self") return { ok: false, reason: "Sem alvo válido" };
      if (state?.castTime > 0) { state.casting = state.castTime; fighter.castQueue = { ability, target: target || fighter, delay: state.castTime }; world.events.push({ type: "castStart", fighter, ability: ability.id, duration: state.castTime }); return { ok: true, casting: true }; }
      return { ok: this.commit(world, fighter, ability, target || fighter) };
    }
    commit(world, fighter, ability, target) {
      if (!fighter.alive || !this.available(fighter, ability)) return false;
      const used = this.abilities.use(world, fighter, target, ability, false);
      if (!used) return false;
      fighter.globalCooldown = Math.max(fighter.globalCooldown || 0, .16); return true;
    }
    target(world, fighter, type = "nearest", hint = null) {
      if (type === "self") return fighter;
      if (type === "allyLow") return world.teamSystem?.weakestAlly(world, fighter) || fighter;
      if (hint?.fighter && world.teamSystem?.isHostile(world, fighter, hint.fighter)) return hint.fighter;
      const strategy = type === "lowHealth" ? "lowHealth" : type === "isolated" ? "isolated" : "nearest";
      return OA.findTarget(world, fighter, strategy);
    }
    toggleAutoCast(fighter, abilityId) { fighter.autoCast[abilityId] = !fighter.autoCast[abilityId]; return fighter.autoCast[abilityId]; }
    pollGamepad(world) {
      if (!navigator.getGamepads || !world.controlledFighter) return;
      const pad = [...navigator.getGamepads()].find(Boolean); if (!pad) return;
      const mapping = [[0, 0], [2, 1], [3, 2], [1, 3], [5, "ultimate"]];
      for (const [button, slot] of mapping) { const key = `${pad.index}:${button}`, pressed = Boolean(pad.buttons[button]?.pressed); if (pressed && !this.gamepadLatch.has(key)) this.request(world, world.controlledFighter, slot); pressed ? this.gamepadLatch.add(key) : this.gamepadLatch.delete(key); }
    }
  }
  OA.ControlSystem = ControlSystem;
}());
