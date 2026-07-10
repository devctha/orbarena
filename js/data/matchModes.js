(function () {
  "use strict";
  const OA = window.OrbArena;

  const mode = (id, label, sides, description, extra = {}) => Object.freeze({ id, label, sides, description, ...extra });
  OA.MATCH_MODES = Object.freeze({
    "1v1": mode("1v1", "1v1", [1, 1], "Duelo clássico de precisão e Wall Boost."),
    "2v2": mode("2v2", "2v2", [2, 2], "Duplas com proteção, foco e assistências."),
    "3v3": mode("3v3", "3v3", [3, 3], "Formações completas em arena grande."),
    "4v4": mode("4v4", "4v4", [4, 4], "Confronto máximo em arena enorme."),
    "1v2": mode("1v2", "1v2", [1, 2], "Desafio assimétrico."),
    "1v3": mode("1v3", "1v3", [1, 3], "Sobrevivência heroica."),
    "1v4": mode("1v4", "1v4", [1, 4], "Chefe improvisado contra um esquadrão."),
    "2v3": mode("2v3", "2v3", [2, 3], "Confronto assimétrico tático."),
    "2v4": mode("2v4", "2v4", [2, 4], "Dupla de elite contra formação completa."),
    "3v4": mode("3v4", "3v4", [3, 4], "Batalha assimétrica avançada."),
    ffa: mode("ffa", "Free For All", [1, 1, 1, 1], "Cada Orb luta por si.", { friendlyFire: true }),
    survival: mode("survival", "Sobrevivência", [1, 4], "Resista até o limite de tempo.", { victory: "time" }),
    boss: mode("boss", "Boss Rush", [1, 4], "Uma Orb reforçada enfrenta a equipe."),
    tournament: mode("tournament", "Torneio", [1, 1], "Série eliminatória com rounds.", { rounds: 3 }),
    domination: mode("domination", "Dominação", [3, 3], "Controle o núcleo central.", { victory: "score" }),
    king: mode("king", "Rei da Arena", [3, 3], "Mantenha presença no centro.", { victory: "score" }),
    core: mode("core", "Proteja o Núcleo", [3, 3], "Defenda o objetivo do seu time.", { victory: "objective" }),
    mirror: mode("mirror", "Espelho", [1, 1], "As duas Orbs usam o mesmo personagem e build."),
    chaos: mode("chaos", "Caótico", [2, 2], "Modificadores extremos e física imprevisível."),
    custom: mode("custom", "Personalizado", [1, 1], "Regras, equipes e orçamento livres.")
  });

  OA.ARENA_SIZES = Object.freeze({
    small: Object.freeze({ id: "small", label: "Pequena", width: 960, height: 540, capacity: 2 }),
    medium: Object.freeze({ id: "medium", label: "Média", width: 1180, height: 660, capacity: 4 }),
    large: Object.freeze({ id: "large", label: "Grande", width: 1440, height: 810, capacity: 6 }),
    huge: Object.freeze({ id: "huge", label: "Enorme", width: 1760, height: 990, capacity: 12 }),
    custom: Object.freeze({ id: "custom", label: "Personalizada", width: 1280, height: 720, capacity: 16 })
  });

  const modifier = (id, label, category, description, values = {}) => Object.freeze({ id, label, category, description, values: Object.freeze(values) });
  OA.MATCH_MODIFIERS = Object.freeze([
    modifier("high-gravity", "Gravidade Alta", "física", "Trajetórias mais pesadas.", { gravity: 1.65 }),
    modifier("low-gravity", "Gravidade Baixa", "física", "Mais tempo em movimento livre.", { gravity: .42 }),
    modifier("no-gravity", "Sem Gravidade", "física", "Remove a força vertical.", { gravity: 0 }),
    modifier("extreme-wall", "Wall Boost Extremo", "arena", "Paredes fornecem impulso adicional.", { wallBoost: 1.55 }),
    modifier("extreme-bounce", "Ricochete Extremo", "arena", "Elasticidade ampliada.", { bounce: 1.22 }),
    modifier("dark-arena", "Arena Escura", "visual", "Leitura baseada em glow.", { dark: true }),
    modifier("no-heal", "Sem Cura", "regras", "Bloqueia recuperação de vida.", { healing: 0 }),
    modifier("double-heal", "Cura Dobrada", "regras", "Amplia efeitos de cura.", { healing: 2 }),
    modifier("fast-cooldown", "Cooldown Reduzido", "habilidades", "Recargas 30% mais rápidas.", { cooldown: .7 }),
    modifier("slow-cooldown", "Cooldown Aumentado", "habilidades", "Recargas 35% mais lentas.", { cooldown: 1.35 }),
    modifier("initial-ultimate", "Ultimate Inicial", "habilidades", "Todos começam com Ultimate pronta.", { ultimate: 100 }),
    modifier("double-powerups", "Power-ups Dobrados", "arena", "Spawns mais frequentes.", { powerUps: 2 }),
    modifier("speed-up", "Velocidade Aumentada", "física", "Velocidade máxima ampliada.", { speed: 1.2 }),
    modifier("pinball", "Modo Pinball", "física", "Wall Boost e ricochete dominam.", { preset: "pinball" }),
    modifier("chaos", "Modo Caos", "regras", "Burst Protection desativada.", { preset: "chaotic" }),
    modifier("hardcore", "Hardcore", "regras", "Sem segunda chance.", { hardcore: true }),
    modifier("bullet-hell", "Bullet Hell", "regras", "Mais projéteis com dano reduzido.", { projectiles: 1.8 }),
    modifier("friendly-fire", "Friendly Fire", "times", "Aliados podem ser atingidos.", { friendlyFire: true }),
    modifier("rapid-sudden", "Morte Súbita Rápida", "tempo", "Clímax antecipado.", { suddenScale: .72 }),
    modifier("slow-time", "Tempo Lento", "tempo", "Combate global desacelerado.", { timeScale: .78 }),
    modifier("extreme-knockback", "Knockback Extremo", "física", "Repulsão muito maior.", { knockback: 1.65 }),
    modifier("random-builds", "Builds Aleatórias", "draft", "Equipamentos definidos pela seed.", { randomBuilds: true }),
    modifier("no-shield", "Sem Escudo", "regras", "Escudos são bloqueados.", { shields: 0 }),
    modifier("no-ultimate", "Sem Ultimate", "regras", "Ultimates ficam indisponíveis.", { ultimates: false })
  ]);

  OA.TEAM_PRESETS = Object.freeze([
    Object.freeze({ id: "player", label: "Time Azul", color: "#55dce8", emblem: "◇" }),
    Object.freeze({ id: "enemy", label: "Time Vermelho", color: "#ff6f89", emblem: "◆" }),
    Object.freeze({ id: "amber", label: "Time Âmbar", color: "#f5b85a", emblem: "⬡" }),
    Object.freeze({ id: "violet", label: "Time Violeta", color: "#ad83ff", emblem: "✦" })
  ]);

  OA.normalizeMatchConfig = (input = {}) => {
    const definition = OA.MATCH_MODES[input.modeId] || OA.MATCH_MODES["1v1"];
    const sides = Array.isArray(input.sides) ? input.sides : definition.sides;
    const teamCount = OA.clamp(Number(input.teamCount) || sides.length, 2, 4);
    const teams = Array.from({ length: teamCount }, (_, index) => {
      const preset = OA.TEAM_PRESETS[index], supplied = input.teams?.[index] || {};
      const size = OA.clamp(Number(supplied.size ?? sides[index] ?? 1), 1, 4);
      return { ...preset, ...supplied, id: preset.id, size, members: Array.isArray(supplied.members) ? supplied.members.slice(0, size) : [] };
    });
    const entityCount = teams.reduce((sum, team) => sum + team.size, 0);
    const sizeId = input.arenaSize || (entityCount <= 2 ? "small" : entityCount <= 4 ? "medium" : entityCount <= 7 ? "large" : "huge");
    return {
      modeId: definition.id, label: definition.label, teams, entityCount,
      arenaId: input.arenaId || "classic", arenaSize: sizeId,
      friendlyFire: Boolean(input.friendlyFire ?? definition.friendlyFire),
      durationPreset: input.durationPreset || "standard", rounds: OA.clamp(Number(input.rounds || definition.rounds || 1), 1, 5),
      lives: OA.clamp(Number(input.lives || 1), 1, 9), respawn: Boolean(input.respawn),
      victory: input.victory || definition.victory || "elimination", scoreLimit: OA.clamp(Number(input.scoreLimit || 10), 1, 100),
      powerBudget: OA.clamp(Number(input.powerBudget || 1800), 100, 9999), modifiers: [...new Set(input.modifiers || [])].slice(0, 12),
      seed: String(input.seed || OA.Random?.createSeed?.() || Date.now())
    };
  };
}());
