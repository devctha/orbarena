(function () {
  "use strict";
  const OA = window.OrbArena;
  const slots = ["active", "secondary", "passive", "reactive", "ultimate"];
  class BuildSystem {
    constructor(storage) { this.storage = storage; this.maxBudget = 145; this.maxPerks = 4; }
    create(seed = {}) { return this.storage.normalizeBuild({ characterId: "echo", weaponId: "arc-cannon", arenaId: "classic", physicsPreset: "pinball", name: "Nova build", ...seed }); }
    budget(build) {
      const character = OA.CharacterRegistry.get(build.characterId), weapon = OA.catalogById("weapons", build.weaponId);
      const abilities = slots.map((slot) => OA.catalogById("abilities", build.abilities?.[slot])).filter(Boolean), perks = (build.perks || []).map((id) => OA.catalogById("perks", id)).filter(Boolean);
      const tags = [...new Set([...(character?.tags || []), ...(weapon?.tags || []), ...abilities.flatMap((item) => item.tags || []), ...perks.flatMap((item) => item.tags || [])])];
      const dimensions = { offense: Math.round((weapon?.damage || 0) + abilities.reduce((sum, item) => sum + item.damage, 0) / 8), defense: perks.filter((item) => item.category === "Defensivo").length * 18 + (character?.stats.armor || 0), mobility: tags.includes("mobilidade") || tags.includes("speed") ? 32 : 14, control: tags.includes("controle") || tags.includes("control") ? 30 : 10, sustain: tags.includes("sustentação") || tags.includes("sustain") ? 28 : 8, summon: tags.includes("invocação") || tags.includes("clone") ? 28 : 4, complexity: Math.min(40, abilities.length * 5 + perks.length * 3 + (character?.difficulty || 1) * 3), risk: Math.min(40, (weapon?.kind === "melee" ? 14 : 7) + perks.filter((item) => item.downside !== "Consome orçamento da build").length * 8) };
      const total = Math.round((weapon?.powerBudget || 0) * .45 + abilities.reduce((sum, item) => sum + item.powerBudget, 0) + perks.reduce((sum, item) => sum + item.powerBudget, 0) + (character ? 18 : 0));
      return { ...dimensions, total, limit: this.maxBudget };
    }
    synergies(build) {
      const all = [OA.catalogById("weapons", build.weaponId), ...(build.perks || []).map((id) => OA.catalogById("perks", id)), ...Object.values(build.abilities || {}).map((id) => OA.catalogById("abilities", id))].filter(Boolean), tags = all.flatMap((item) => item.tags || []), has = (...items) => items.every((tag) => tags.includes(tag));
      const strong = [], medium = [], weaknesses = [], incompatibilities = [];
      if (has("clone", "explosion")) strong.push("Clone + explosão de clone"); if (has("bounce", "critical")) strong.push("Ricochete + crítico"); if (has("projectile", "pierce")) strong.push("Projétil + perfuração"); if (has("defense", "bounce")) strong.push("Escudo + reflexão");
      if (tags.includes("impact")) medium.push("Impacto + Wall Boost"); if (tags.includes("control")) medium.push("Controle de distância"); if (tags.includes("speed")) medium.push("Escala com velocidade");
      if (!tags.includes("defense") && !tags.includes("sustain")) weaknesses.push("Pouca sustentação"); if (all.filter((item) => item.kind === "melee").length) weaknesses.push("Exposição em curta distância");
      for (const perk of all.filter((item) => item.conflicts?.length)) for (const id of perk.conflicts) if (all.some((item) => item.id === id)) incompatibilities.push(`${perk.name} × ${OA.catalogById("perks", id)?.name || id}`);
      return { strong, medium, weaknesses, incompatibilities };
    }
    validate(build) {
      const errors = [], warnings = [], abilityIds = Object.values(build.abilities || {}).filter(Boolean);
      if (!build || !build.characterId) errors.push("A build precisa de um personagem.");
      if (!OA.CharacterRegistry.get(build.characterId)) errors.push("Personagem inexistente.");
      if (!OA.catalogById("weapons", build.weaponId)) errors.push("Arma inexistente.");
      if (!abilityIds.length) errors.push("Equipe ao menos uma habilidade.");
      if ((build.perks || []).length > this.maxPerks) errors.push(`Máximo de ${this.maxPerks} perks.`);
      if (new Set(abilityIds).size !== abilityIds.length) errors.push("Você já equipou esta habilidade em outro tipo.");
      for (const id of abilityIds) if (!OA.catalogById("abilities", id)) errors.push(`Habilidade inexistente: ${id}.`);
      for (const id of build.perks || []) if (!OA.catalogById("perks", id)) errors.push(`Perk inexistente: ${id}.`);
      const budget = this.budget(build), synergy = this.synergies(build); if (budget.total > budget.limit) errors.push("Esta build excede o limite de poder.");
      errors.push(...synergy.incompatibilities.map((item) => `Conflito: ${item}.`));
      const cooldown = abilityIds.map((id) => OA.catalogById("abilities", id)?.cooldown || 0).reduce((sum, value) => sum + value, 0); if (abilityIds.length >= 4 && cooldown / abilityIds.length < 2.5) warnings.push("Cooldown total potencialmente abusivo.");
      if (abilityIds.some((id) => id === "invulnerability") && (build.perks || []).includes("last-bounce")) warnings.push("Defesa e invulnerabilidade elevadas.");
      return { valid: errors.length === 0, errors, warnings, budget, synergy };
    }
    random(mode = "balanced", characterId = null) {
      const characters = OA.CharacterRegistry.all(), character = OA.CharacterRegistry.get(characterId) || characters[Math.floor(Math.random() * characters.length)];
      const desired = mode.includes("defensive") ? "defense" : mode.includes("mobility") ? "speed" : mode.includes("summon") ? "clone" : mode.includes("offensive") ? "impact" : null;
      const pick = (list) => list[Math.floor(Math.random() * list.length)], weapons = desired ? OA.CATALOG.weapons.filter((item) => item.tags.includes(desired)) : OA.CATALOG.weapons;
      for (let attempt = 0; attempt < 60; attempt += 1) { const pool = desired ? OA.CATALOG.abilities.filter((item) => item.tags?.includes(desired) || item.category?.toLowerCase().includes(desired)) : OA.CATALOG.abilities; const selected = [...pool].sort(() => Math.random() - .5).slice(0, 3), build = this.create({ name: `${character.name} / ${mode}`, characterId: character.id, weaponId: pick(weapons.length ? weapons : OA.CATALOG.weapons).id, abilities: Object.fromEntries(slots.map((slot, index) => [slot, selected[index]?.id || null])), perks: [...OA.CATALOG.perks].sort(() => Math.random() - .5).slice(0, 2).map((item) => item.id), tags: [mode] }); const check = this.validate(build); if (check.valid) return { ...build, powerBudget: check.budget.total }; }
      const fallback = this.create({ name: `${character.name} / ${mode}`, characterId: character.id, weaponId: character.preferredWeapon || "arc-cannon", abilities: { active: "dash", secondary: null, passive: null, reactive: null, ultimate: null } });
      return { ...fallback, powerBudget: this.budget(fallback).total };
    }
    export(build) { return JSON.stringify({ ...this.storage.normalizeBuild(build), exportedBy: "Duke Dandalian" }, null, 2); }
    import(text) { let data; try { data = JSON.parse(text); } catch { throw new Error("JSON inválido."); } if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("O arquivo não contém uma build válida."); const build = this.storage.normalizeBuild(data); const validation = this.validate(build); if (!validation.valid) throw new Error(validation.errors.join(" ")); return { ...build, powerBudget: validation.budget.total }; }
  }
  OA.BuildSystem = BuildSystem;
}());
