# ORB ARENA: CHAOS PROTOCOL

Criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

Todos os direitos de criação, design, desenvolvimento e direção atribuídos a Duke Dandalian.

Versão `0.6.0-design-ability-remaster` do auto battler para navegador. O modo principal utiliza a Arena Clássica retangular, com quatro paredes físicas, ricochetes fortes, Wall Boost, draft em nove etapas, equipes até 4v4, controle manual/misto, replays e progressão local. As arenas circulares anteriores continuam disponíveis apenas como modos alternativos.

O remaster acrescenta HUD de quatro skills + Ultimate, Auto Cast por habilidade, 20 modos, 24 modificadores, arenas até 1760×990, assistências e kill feed, MVP/highlights, música dinâmica, replay por snapshots, spectator, sandbox, editor de arena, modo foto, perfil, conquistas, coleção, comparador e saves V5 retrocompatíveis. Consulte [COMMERCIAL_REMASTER_V5.md](COMMERCIAL_REMASTER_V5.md) para o diagnóstico e a matriz de validação.

O Design & Ability Overhaul adiciona design system tokenizado, Home operacional, materiais procedurais de Orb, raridades consistentes, atlas de ícones, telegraphs por forma, apresentação em sete fases, FX/SFX por elemento, HUD radial e Visual Lab interno. Consulte [DESIGN_ABILITY_REMASTER_REPORT.md](DESIGN_ABILITY_REMASTER_REPORT.md).

## Conteúdo

- 110 personagens e 50 poderes adicionais.
- Criador de builds com validação, Power Budget e sinergias.
- Builds salvas, variantes, importação e exportação JSON.
- Histórico com seeds, telemetria, revanche e repetição.
- Arsenal, catálogo de perks e catálogo com 160 habilidades e poderes.
- Quatro presets de duração, fases de combate e Burst Protection.
- ParticleManager com LOD, prioridades e pools de 300 a 3.000 partículas.
- 40 habilidades cinematográficas com telegraphing.
- Bestiário com descoberta progressiva.
- Save local versão 5 com migração das versões anteriores.
- Arena retangular padrão; Wall Boost e colisões nas quatro paredes preservados.

## Executar

Abra `index.html` em um navegador moderno. O jogo não exige backend nem dependências externas obrigatórias.

## Testes

```powershell
node tests/core-smoke.js
node tests/characters-smoke.js
node tests/kits-smoke.js
node tests/expansion-smoke.js
node tests/modules-v3-smoke.js
node tests/pacing-cinematic-smoke.js
node tests/complete-update-smoke.js
node tests/headless-game-v5-smoke.js
node tests/design-remaster-smoke.js
```

Consulte `CINEMATIC_COMBAT_V4.md` para ritmo, proteção de burst, partículas e habilidades cinematográficas.
