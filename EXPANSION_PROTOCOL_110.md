# ORB ARENA — Expansion Protocol 110

Projeto criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

## Conteúdo desta versão

- 110 Character Balls registradas e jogáveis.
- 50 novos poderes no `PowerRegistry`, além das 70 habilidades legadas.
- Arena 2D circular com colisão radial, seis plataformas, núcleo, anel externo, power-ups e portais.
- Seletor paginado, biblioteca de poderes, simulação automática, configurações gráficas e acessibilidade.
- Save versionado como `saveVersion: 2`, com migração não destrutiva.

## Adicionar um personagem

1. Escolha um arquétipo existente em `js/data/characterBalance.js`.
2. Registre a definição em um arquivo de `js/data/characters*.js` usando ID permanente e único.
3. Preencha identidade, classe, subclasse, raridade, dificuldade, paleta, textura, elemento, personalidade, descrição, tags, fraquezas, sinergias, IA, quatro partes do kit, cooldowns e limites.
4. Aponte `powerId` para um poder existente e registre o handler em `CharacterMechanics`.
5. Execute `node tests/expansion-smoke.js`. A validação rejeita IDs, raridades, stats, kits, poderes e handlers inválidos.

## Adicionar um poder

Use `PowerRegistry.register()` em um arquivo temático dentro de `js/powers/`. O contrato obrigatório possui `id`, `name`, `category`, `type`, `rarity`, `description`, `cooldown`, `duration`, `powerBudget`, `tags` e `activate`. Também pode declarar `canActivate`, `update`, `deactivate`, `onEvent`, `onReceive`, `ultimate`, `interactions` e `counters`.

O `PowerSystem` controla recargas, telemetria e ciclo de vida. A lógica deve usar o contexto compartilhado (`damage`, `zone`, `summon`, `clone`, `poison`, `teleport`, escalas temporais etc.) para respeitar caps e cleanup.

## Classes e raridades

- Classes ficam em `js/data/characterClasses.js` e precisam de identidade e distância preferida.
- Arquétipos físicos ficam em `js/data/characterBalance.js`.
- Raridades ficam em `js/data/characterRarities.js` e declaram rank e multiplicador de budget.
- Adicionar uma classe exige os três registros antes de qualquer personagem utilizá-la.

## Visuais de bola

Defina `color`, `secondary`, `glow`, `texture`, `icon`, `visual`, `vfx`, `sfx` e `animations`. O renderer desenha procedimentalmente anéis, runas, rachaduras, ondas, linhas elétricas, auras, núcleo, ultimate pronta, escudos e estados. Prefira novos padrões procedurais a bitmaps grandes.

## Habilidades temporais

Use `TimeSystem` em vez de timers de navegador. Estão separadas as escalas de jogo, lutador, projétil, habilidade, efeito e animação. Toda duração é reduzida por `deltaTime`; tarefas atrasadas usam `world.scheduled`, atualizado pelo loop fixo.

## Clones e invocações

- `CloneSystem.create()` adiciona `ownerId`, lifetime, stats/damage/health scale, IA simplificada, bloqueio de progressão e `noRecursive`.
- `SummonSystem.spawn()` suporta perseguição, órbita e barreira estacionária.
- Nunca crie diretamente em `world.summons`. Use os sistemas para respeitar limites, fade, owner cleanup e remoção de projéteis vinculados.

## Efeitos de arena

Definições ficam em `js/data/arenaDefinitions.js`. A geometria circular usa `centerX`, `centerY` e `radius`. Obstáculos funcionais entram em `bumpers`; decoração usa `platforms`. Portais e power-ups possuem lifetime/respawn e são atualizados por `ArenaSystem`.

Ao adicionar uma arena, preserve a mesma geometria no `PhysicsSystem`, `ProjectileSystem`, `SummonSystem`, teleportes e renderer.

## Simulações

O laboratório aceita 10, 100, 1.000 ou quantidade personalizada, seed fixa ou aleatória, um-contra-um e todos-contra-todos. O relatório JSON inclui win rate, duração, dano, cura, colisões, uso de poderes e problemas de faixa.

O simulador analítico não renderiza efeitos. Para regressões físicas reais, use `tests/core-smoke.js`.

## Power Budget

O cálculo pondera vida, dano, velocidade, defesa, massa, elasticidade, knockback, mobilidade, cura, escudo, controle, clones, invocações, área, projéteis, tempo, negação, dificuldade, fraquezas e o budget do poder. `audit` marca desvios maiores que 22% para revisão; não é um multiplicador direto de dano.

## Migração de saves

`Storage.migrate()` preserva settings e histórico antigos e adiciona defaults para builds, skins, estatísticas de personagem/poder, desbloqueios e log de migração. Nunca altere a chave de storage ou IDs existentes sem uma nova etapa de migração.

## Alterar o layout

- Estrutura semântica: `index.html`.
- Tema base: `css/main.css`.
- Seletor/bibliotecas/configurações: `css/expansion.css`.
- Arena e HUD: `css/battle.css` e `Renderer`.
- Breakpoints atuais: 1200, 900 e 650 px. No celular há duas colunas, filtros em drawer e detalhes em painel dedicado.

## Testes

```powershell
node tests/core-smoke.js
node tests/characters-smoke.js
node tests/kits-smoke.js
node tests/expansion-smoke.js
```

O último teste cobre os 110 personagens, 50 poderes, conteúdo, save, tempo, arena circular, ricochete radial, IA, paginação e CSS responsivo.
