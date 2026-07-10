# ORB ARENA — Corrective Combat & Stick Arena

Versão `0.7.0-combat-stick-arena`.

## Correções funcionais

A sidebar deixou de ser montada por módulos separados. Os 17 itens e os dois links institucionais agora pertencem a um único painel, na ordem solicitada e divididos em seis grupos. O painel usa altura limitada pela viewport, scroll interno, padding inferior, overflow horizontal bloqueado e indicador ciano restrito ao item ativo. Desktop usa painel sticky; tablet usa painel recolhível; mobile usa drawer de tela inteira com botão de fechar e alvos de toque de 50 px.

O pipeline `DamageSystem` recebe um pacote único com fonte, equipe, habilidade, arma, tipo, dano base/final, crítico, penetração, knockback, posição, direção, timestamp e tags. Ele valida alvo e friendly fire; aplica invulnerabilidade, imunidade por fonte, cooldown do mesmo hit, limite por frame, escudo, armadura, resistência, penetração e redução; limita vida; registra dano; gera feedback; aplica knockback; e processa morte apenas uma vez.

As fontes de colisão, arma, projétil, habilidades, veneno, fogo, zonas, gravidade, invocações e arena usam o mesmo pipeline moderno. Um fallback mantém simuladores legados que carregam apenas parte dos módulos.

## Habilidades e FX

Foram adicionadas 15 skills funcionais: Pulse Break, Venom Trail, Spike Bloom, Time Drag, Gravity Crush, Mirror Clone, Shield Burst, Arc Chain, Frost Lock, Meteor Dash, Void Field, Sonic Ring, Healing Orbit, Chrono Rewind e Wall Detonation.

As skills possuem cooldown e comportamento real, além da apresentação compartilhada de cast, telegraph, impacto, persistência e encerramento. Os novos efeitos incluem ondas sonoras, fantasmas temporais, orbitais de cura, escudo reativo, raios encadeados, trails, gelo, veneno, fogo, distorção gravitacional, afterimages, shockwaves e partículas de contato.

`CombatAuditSystem` gera uma tabela interna para as 175 entradas do catálogo, com personagem, tipo, cooldown, efeito esperado/implementado, dano, status, partículas, som, IA, Auto Cast e estado funcional. A auditoria final não encontrou entrada sem adaptador funcional.

## Stick Arena

`GameMode`, `OrbGameMode` e `StickGameMode` separam física, movimento, combate, renderização, controles, animação, colisão, arena e vitória sem duplicar personagens ou metajogo. Stick Arena reutiliza personagens, builds, armas, perks, skills, progressão, histórico, seeds, resultados e replay.

O modo novo inclui representação corporal modular, plataformas, gravidade, corrida, salto, dash, bloqueio/parry, golpes fraco/médio/forte, knockback, combos com scaling, IA por distância e câmera compartilhada com zoom e impacto. O catálogo contém 38 estados de animação preparados para expansão. Orb Arena permanece como modo padrão e preserva arena retangular e Wall Boost.

## HUD e debug

A barra de vida atualiza imediatamente, muda de cor por faixa, pisca em dano forte e mostra escudo em trilha separada. O HUD mantém vida atual/máxima, Ultimate, skills, cooldown, Auto Cast, status, equipes, K/A/D, combos e kill feed.

O laboratório ganhou ações para dano 10/100, cura, execução, escudo, veneno, fogo, stun, cooldown, skill, Ultimate, clone, projéteis e tempo. O painel mostra vida, escudo, armadura, resistência, último dano, fonte, abilityId, bloqueio, hit registry, status, morte, FPS, partículas, projéteis e colisões.

## Erros encontrados e corrigidos

- Inserções concorrentes colocavam Sandbox e Editor no grupo errado e deixavam o rodapé fora da moldura.
- O dano estava dividido entre `Fighter.applyDamage`, `CombatSystem` e fontes diretas.
- Simuladores isolados não carregavam o novo pipeline; foi criado fallback compatível.
- O limite de hits por frame exigiu reset explícito no teste de efeitos contínuos.
- Respawn do laboratório não limpava os novos estados de morte e hit registry.
- O combo Stick precisava normalizar o contrato usado pelo `ComboSystem` compartilhado.

## Validação executada

Dez suítes passaram, cobrindo física, colisão, armas, projéteis, veneno, fogo, skills, escudo, armadura, resistência, friendly fire, cooldown por fonte, morte única, kill feed, 1v1, 2v2, 4v4, saves V5, 110 personagens, pacing, partículas, arenas e o novo modo Stick.

No navegador, a sidebar apresentou 19 destinos dentro do painel, seis grupos, scroll interno e ordem 01–17. Em 390×844, o drawer ocupou a viewport, manteve 19 itens acessíveis e exibiu Créditos dentro da moldura após scroll. Stick Arena foi iniciada pelo novo seletor e validada visualmente com sticks animados, plataformas, HUD, combos, vida e dano em tempo real.
