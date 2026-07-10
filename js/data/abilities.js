(function () {
  "use strict";
  const OA = window.OrbArena;
  const abilities = [];
  const add = (id, name, category, effect, cooldown, power, range, color, description, type = "active", params = {}) => abilities.push(Object.freeze({ id, name, category, effect, cooldown, power, range, color, description, type, params: Object.freeze(params) }));

  add("dash", "Dash Frontal", "movimento", "dash", 3.2, 330, 0, "#65f5ff", "Impulso frontal imediato alinhado ao alvo.");
  add("triple-dash", "Dash Triplo", "movimento", "multiDash", 7, 205, 0, "#7efcff", "Executa três impulsos curtos em sequência.", "active", { count: 3, interval: 0.14 });
  add("short-teleport", "Teleporte Curto", "movimento", "teleportToward", 6, 115, 0, "#b889ff", "Salta em direção ao alvo sem atravessar as paredes.");
  add("random-teleport", "Teleporte Instável", "movimento", "teleportRandom", 8, 0, 0, "#d46bff", "Reposiciona o orbe em um ponto seguro aleatório.");
  add("charged-rush", "Investida Carregada", "movimento", "chargedRush", 8.5, 520, 0, "#ffb76b", "Carrega massa e dispara com dano de impacto ampliado.");
  add("dimensional-jump", "Salto Dimensional", "movimento", "phaseThrough", 9, 145, 0, "#966cff", "Atravessa o alvo e reaparece atrás dele.");
  add("progressive-accel", "Aceleração Progressiva", "movimento", "progressiveHaste", 10, 0.65, 0, "#56ffd5", "Acelera continuamente por alguns segundos.", "active", { duration: 4 });
  add("super-bounce", "Super Ricochete", "movimento", "superBounce", 11, 1.35, 0, "#f8e76b", "Amplifica ricochetes e prepara Wall Boosts consecutivos.", "active", { duration: 5 });
  add("ghost-step", "Passo Fantasma", "movimento", "ghostDash", 8, 390, 0, "#d4e5ff", "Fica intangível durante um dash veloz.");
  add("orbital-run", "Corrida Orbital", "movimento", "orbitalRun", 7.5, 300, 0, "#62b7ff", "Ganha impulso tangencial e orbita o alvo.");

  add("shockwave", "Onda de Choque", "impacto", "radialBlast", 6, 18, 145, "#6ef6ff", "Explosão radial que causa dano e repulsão.", "active", { knockback: 310 });
  add("seismic-slam", "Golpe Sísmico", "impacto", "seismic", 9, 24, 175, "#e6b676", "Pulso pesado que atordoa alvos próximos.", "active", { stun: 0.55, knockback: 250 });
  add("explosive-impact", "Impacto Explosivo", "impacto", "primeImpact", 8, 1.65, 0, "#ff8b62", "O próximo contato cria uma explosão adicional.", "active", { explosion: 22 });
  add("ram", "Aríete", "impacto", "ram", 7.5, 480, 0, "#ffca69", "Aumenta massa temporariamente e investe contra o alvo.", "active", { mass: 0.55, duration: 1.4 });
  add("nuclear-collision", "Colisão Nuclear", "impacto", "nuclearPrime", 15, 2.4, 0, "#fff26b", "Prepara um contato devastador, mas causa recuo próprio.", "active", { selfDamage: 8, explosion: 34 });
  add("gravity-punch", "Soco Gravitacional", "impacto", "gravityPunch", 9, 28, 230, "#b982ff", "Puxa o alvo antes de desferir um pulso concentrado.", "active", { pull: 390, knockback: 380 });
  add("piercing-charge", "Investida Perfurante", "impacto", "piercingCharge", 8, 540, 0, "#bfeaff", "Dash alinhado que ignora parte da armadura.");
  add("contact-explosion", "Explosão de Contato", "impacto", "contactAura", 10, 17, 0, "#ff6868", "Durante alguns segundos, contatos detonam ondas menores.", "active", { duration: 4 });
  add("counter-impact", "Contra-impacto", "impacto", "counterGuard", 10, 1, 0, "#7ab8ff", "Bloqueia parte do próximo impacto e devolve o impulso.");
  add("destructive-rebound", "Rebote Destrutivo", "impacto", "primeWall", 8, 1.7, 0, "#ff9a64", "O próximo Wall Boost carrega um impacto crítico.");

  add("gravity-field", "Campo Gravitacional", "controle", "spawnZone", 10, 230, 155, "#956dff", "Campo móvel que puxa o inimigo.", "active", { zone: "gravity", duration: 4.5 });
  add("black-hole", "Buraco Negro", "controle", "spawnZone", 16, 430, 180, "#6a45c7", "Singularidade que puxa e causa dano periódico.", "active", { zone: "blackHole", duration: 4 });
  add("radial-repulsion", "Repulsão Radial", "controle", "radialRepulse", 7, 420, 170, "#68eaff", "Expulsa tudo ao redor sem depender de contato.");
  add("magnetic-pull", "Puxão Magnético", "controle", "directPull", 6.5, 360, 320, "#d38bff", "Arrasta violentamente o alvo para perto.");
  add("energy-prison", "Prisão de Energia", "controle", "prison", 11, 0.2, 400, "#61a6ff", "Limita velocidade e área de movimento do alvo.", "active", { duration: 2.5 });
  add("freeze", "Congelamento", "controle", "statusTarget", 10, 1, 330, "#a7efff", "Congela o alvo brevemente.", "active", { status: "frozen", duration: 1.15 });
  add("slow-field", "Campo de Lentidão", "controle", "spawnZone", 9, 0.48, 150, "#76c9ff", "Zona persistente que reduz aceleração e velocidade.", "active", { zone: "slow", duration: 5 });
  add("stun-pulse", "Pulso Atordoante", "controle", "statusTarget", 9, 1, 180, "#fff08c", "Atordoa o inimigo quando está próximo.", "active", { status: "stunned", duration: 0.72 });
  add("mind-invert", "Inversão Neural", "controle", "confuse", 12, 1, 450, "#f075ff", "Inverte perseguição e órbita da IA inimiga.", "active", { duration: 3 });
  add("silence-zone", "Zona de Silêncio", "controle", "spawnZone", 13, 1, 170, "#b8b7d9", "Impede habilidades dentro da área.", "active", { zone: "silence", duration: 4 });

  add("kinetic-shield", "Escudo Cinético", "defesa", "shield", 8, 32, 0, "#68c8ff", "Absorve dano até quebrar.");
  add("reflector", "Barreira Refletora", "defesa", "reflect", 12, 0.65, 0, "#b7f5ff", "Reflete projéteis e parte do dano recebido.", "active", { duration: 3.5 });
  add("invulnerability", "Invulnerabilidade", "defesa", "invulnerable", 15, 1, 0, "#ffffff", "Ignora dano por um intervalo curto.", "active", { duration: 1.05 });
  add("damage-reduction", "Redução de Dano", "defesa", "damageReduction", 10, 0.5, 0, "#6d9dff", "Reduz pela metade o dano durante alguns segundos.", "active", { duration: 4 });
  add("damage-speed", "Conversão Cinética", "defesa", "damageToSpeed", 11, 0.65, 0, "#65ffd9", "Converte dano recebido em velocidade.", "active", { duration: 5 });
  add("impact-heal", "Cura por Impacto", "defesa", "impactHeal", 12, 0.28, 0, "#67f5a4", "Cura uma fração do dano de colisão causado.", "active", { duration: 5 });
  add("adaptive-armor", "Armadura Adaptativa", "defesa", "adaptiveArmor", 12, 22, 0, "#8aa8ca", "Ganha armadura crescente ao receber golpes.", "active", { duration: 6 });
  add("intangible-phase", "Fase Intangível", "defesa", "phase", 11, 1, 0, "#d0caff", "Atravessa projéteis e reduz colisões por alguns segundos.", "active", { duration: 2.2 });
  add("anti-projectile", "Campo Antiprojetil", "defesa", "antiProjectile", 13, 125, 0, "#75e9ff", "Destrói projéteis hostis próximos.", "active", { duration: 4 });
  add("resurrection", "Ressurreição", "defesa", "resurrection", 30, 0.3, 0, "#f5ecaa", "Prepara uma única volta com parte da vida.", "active");

  add("laser", "Laser", "ofensivo", "abilityProjectile", 5, 19, 900, "#e8ffff", "Disparo luminoso quase instantâneo.", "active", { projectile: "laser", count: 1 });
  add("projectile-rain", "Chuva de Projéteis", "ofensivo", "projectileRain", 10, 8, 0, "#78d8ff", "Projéteis convergem de vários pontos da arena.", "active", { count: 9 });
  add("homing-missiles", "Mísseis Teleguiados", "ofensivo", "abilityProjectile", 9, 11, 700, "#ff738b", "Dispara uma salva de mísseis com homing.", "active", { projectile: "missile", count: 4 });
  add("chain-lightning", "Corrente Elétrica", "ofensivo", "chainLightning", 8, 22, 330, "#8eeaff", "Raio instantâneo que também drena velocidade.");
  add("fire-blast", "Explosão de Fogo", "ofensivo", "fireBlast", 8, 17, 145, "#ff7b4f", "Explosão radial que aplica queimadura.", "active", { burn: 5 });
  add("spikes", "Espinhos", "ofensivo", "spikeArmor", 10, 13, 0, "#e2e9ff", "Espinhos temporários ferem quem colidir.", "active", { duration: 5 });
  add("drones", "Drones", "ofensivo", "drones", 13, 8, 0, "#6df7d0", "Drones orbitais disparam em sequência.", "active", { count: 4, duration: 5 });
  add("mines", "Minas", "ofensivo", "abilityProjectile", 10, 21, 0, "#ffc864", "Espalha minas armadas ao redor.", "active", { projectile: "mine", count: 5 });
  add("orbit-blades", "Lâminas Orbitais", "ofensivo", "orbitBlades", 12, 9, 66, "#d8faff", "Lâminas físicas orbitam e cortam o alvo.", "active", { count: 4, duration: 6 });
  add("orbital-beam", "Raio Orbital", "ofensivo", "orbitalBeam", 14, 31, 0, "#cf8cff", "Marca o alvo e atinge sua posição após um atraso.");

  add("swap-position", "Troca de Posição", "caos", "swapPosition", 9, 1, 0, "#ee6dff", "Troca instantaneamente as posições dos lutadores.");
  add("swap-velocity", "Troca de Velocidade", "caos", "swapVelocity", 8, 1, 0, "#9a77ff", "Troca os vetores de velocidade entre os orbes.");
  add("clone", "Clone Ilusório", "caos", "clone", 11, 1, 0, "#85d6ff", "Cria um chamariz que interfere na mira inimiga.", "active", { duration: 5 });
  add("duplication", "Duplicação", "caos", "duplicateShots", 13, 2, 0, "#d47dff", "Duplica todos os disparos por alguns segundos.", "active", { duration: 5 });
  add("split", "Divisão Temporária", "caos", "splitOrbit", 14, 7, 55, "#ff8fea", "Cria fragmentos orbitais que causam dano físico.", "active", { count: 3, duration: 5 });
  add("steal-ability", "Roubo de Habilidade", "caos", "stealAbility", 16, 1, 0, "#bf74ff", "Copia temporariamente uma habilidade inimiga.");
  add("steal-speed", "Roubo de Velocidade", "caos", "stealSpeed", 9, 0.28, 380, "#66ffd6", "Transfere parte da velocidade do alvo.");
  add("invert-gravity", "Inversão de Gravidade", "caos", "invertGravity", 14, 1, 0, "#8f65d9", "Inverte as forças do centro da arena.", "active", { duration: 5 });
  add("rotating-arena", "Arena Rotativa", "caos", "rotateArena", 15, 160, 0, "#ff7bd7", "Cria vento tangencial que gira toda a luta.", "active", { duration: 6 });
  add("chain-teleport", "Teleporte em Cadeia", "caos", "chainTeleport", 12, 1, 0, "#bd8cff", "Executa saltos rápidos e deixa explosões nos pontos de saída.", "active", { count: 4 });

  add("wall-surge", "Surto de Parede", "reativo", "reactWallDash", 7, 240, 0, "#f7e96d", "Ao bater na parede, dispara na direção do alvo.", "reactive", { trigger: "wall" });
  add("critical-guard", "Guarda Crítica", "reativo", "reactCriticalShield", 12, 20, 0, "#80cfff", "Ao sofrer crítico, recebe escudo.", "reactive", { trigger: "criticalTaken" });
  add("half-life-fury", "Fúria de Meia-vida", "reativo", "reactHealthHaste", 20, 0.28, 0, "#ffad62", "Abaixo de 50% de vida, ganha velocidade.", "reactive", { trigger: "halfHealth" });
  add("last-stand-dash", "Dash de Último Recurso", "reativo", "reactLastDash", 25, 500, 0, "#ff647e", "Abaixo de 20% de vida, atravessa a arena.", "reactive", { trigger: "lowHealth" });
  add("triple-hit-nova", "Nova do Terceiro Golpe", "reativo", "reactComboNova", 8, 15, 130, "#8cf4ff", "A cada terceiro golpe, libera uma onda de choque.", "reactive", { trigger: "threeHits" });
  add("five-bounce-storm", "Tempestade de Ricochete", "reativo", "reactBounceStorm", 12, 7, 0, "#d8f76c", "A cada cinco ricochetes, dispara em todas as direções.", "reactive", { trigger: "fiveWalls" });
  add("anti-stall-jump", "Salto Antiparalisia", "reativo", "reactUnstuck", 6, 350, 0, "#74f0d5", "Ao perder movimento, teleporta e recebe impulso.", "reactive", { trigger: "stalled" });
  add("damage-block-pulse", "Pulso de Bloqueio", "reativo", "reactBlockPulse", 7, 185, 115, "#74b8ff", "Ao bloquear dano, repele o atacante.", "reactive", { trigger: "blocked" });
  add("ultimate-echo", "Eco de Sobrecarga", "reativo", "reactAbilityEcho", 18, 0.55, 0, "#cb83ff", "Após habilidade poderosa, reduz cooldowns restantes.", "reactive", { trigger: "ultimate" });
  add("collision-reset", "Reset de Impacto", "reativo", "reactCollisionReset", 10, 1, 0, "#fff4aa", "Um impacto extremo recarrega a habilidade mais antiga.", "reactive", { trigger: "heavyCollision" });

  OA.ABILITIES = Object.freeze(abilities);
  OA.abilityById = function (id) { return OA.ABILITIES.find((ability) => ability.id === id); };
}());
