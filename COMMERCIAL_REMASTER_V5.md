# ORB ARENA — Commercial Remaster V5

Criação, desenvolvimento, design, direção e conceito: **Duke Dandalian**.

## Diagnóstico executado antes da atualização

A base já possuía loop fixo a 120 Hz, física com substeps, arena retangular, Wall Boost, 110 personagens, 120 habilidades catalogadas, partículas com pooling/LOD, áudio procedural e saves V3. As simulações iniciais registraram média de 47,16 s por batalha; a matriz de pacing confirmou 35,01 s (curta), 75 s (padrão) e 120 s (longa). O limite físico observado foi 920 unidades/s.

Os principais riscos encontrados foram o acoplamento binário `player/enemy`, sistemas de alvo e efeitos escritos apenas para duas entidades, HUD fixo de duelo, log curto, previews em animação contínua fora da tela, áudio sem orçamento global de vozes e save sem contratos para draft/replay/perfil. A medição visual direta de FPS não ficou disponível no navegador local desta execução; o comportamento de performance foi validado estruturalmente e por simulação headless, preservando o sistema adaptativo nos limiares 55/45/35/25 FPS.

## Arquitetura final

- `matchModes.js`: 20 modos, tamanhos de arena e 24 modificadores.
- `teamSystem.js`: equipes, hostilidade, alvos, assistências, eliminações e placar.
- `controlSystem.js`: AUTO, PLAYER, MIXED, autocast individual, cargas, cast time, cooldown global, targeting, teclado e gamepad.
- `replaySystem.js`: snapshots limitados, interpolação e marcadores.
- `metaGameSystem.js`: MVP ponderado, prêmios, highlights e 18 conquistas.
- `musicSystem.js`: camadas procedurais por fase da batalha.
- `draftUI.js`: draft funcional em nove etapas, presets e resumo.
- `remasterUI.js`: splash/loading/intro, perfil, coleção, conquistas, comparador, tutorial e player de replay.
- `toolsUI.js`: spectator, sandbox, editor de arena, foto e captura.
- `v5.css`: remaster sci-fi responsivo, HUD de skills, placares e telas novas.

O motor mantém `world.player` e `world.enemy` como aliases de compatibilidade, enquanto os sistemas modernos usam `world.fighters` e `TeamSystem`. O save migra versões antigas para V5 sem alterar a chave local existente.

## Validação

O conjunto automatizado cobre catálogos, 110 personagens, 50 poderes, kits, pacing, burst protection, partículas, migração V5, 4v4, equipes, assistências, controle manual, cargas, replay, draft e execução headless do jogo completo. A simulação headless V5 iniciou oito combatentes em arena 1760×990, executou habilidade PLAYER, produziu MVP e finalizou replay.

Execute todos os testes com:

```powershell
$files = Get-ChildItem tests\*-smoke.js
foreach ($file in $files) { node $file.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```
