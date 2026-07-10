# Plano técnico — ORB ARENA: CHAOS PROTOCOL

Projeto criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

> Estado em `0.2.0`: a fundação e a revisão profunda de física/combate estão entregues. O projeto já possui 12 armas, 70 habilidades, 20 perks, combos, projéteis e arena dinâmica. Consulte `COMBAT_PHYSICS_V2.md` para a implementação atual; as seções abaixo continuam como arquitetura-alvo do jogo completo.

## 1. Resumo técnico

O projeto é um auto battler 2D local-first. O jogador monta uma build e o motor executa uma luta reproduzível entre duas entidades circulares. A arquitetura separa definição de conteúdo, regras de simulação, entidades, renderização e interface. Essa divisão permite adicionar armas, perks, habilidades, efeitos e arenas sem inserir condicionais gigantes no loop principal.

A Etapa 1 já usa os mesmos limites arquiteturais previstos para o jogo final:

1. A camada de dados descreve conteúdo.
2. Entidades guardam apenas estado próprio.
3. Sistemas processam grupos de entidades.
4. O motor controla tempo, física, áudio e renderização.
5. A UI observa o estado, mas não decide o resultado da luta.
6. O orquestrador `Game` compõe uma partida e produz um resultado imutável.

## 2. Decisões de tecnologia

- **HTML5 sem framework:** reduz custo de inicialização e permite abrir `index.html` diretamente.
- **CSS modular:** tokens globais, menu/configuração, batalha e responsividade ficam isolados.
- **JavaScript moderno encapsulado:** scripts clássicos em ordem explícita e namespace único conciliam modularidade com suporte a `file://`. Uma migração futura para ES Modules exige apenas trocar exportações/importações e usar servidor local.
- **Canvas 2D:** adequado para centenas de partículas, projéteis e formas geométricas com boa performance em desktop e mobile.
- **Web Audio API:** produz placeholders procedurais sem depender de arquivos binários. Na etapa de polimento, o mesmo contrato aceitará buffers de áudio.
- **LocalStorage:** guarda preferências e até 50 relatórios recentes. Builds, unlocks e save completo entram na Etapa 5 sobre a mesma camada.
- **Zero bibliotecas JavaScript:** não há instalação, bundler, runtime externo ou dependência obscura.

## 3. Física

O game loop usa timestep fixo de `1/120 s`. Uma taxa física maior que a taxa visual de 60 FPS reduz atravessamento em velocidades altas e mantém o resultado estável entre máquinas. O loop acumula tempo real, executa quantos passos fixos forem necessários e interpola posições apenas na renderização.

O pipeline por substep é:

1. Atualizar cooldowns e timers.
2. Calcular steering da IA.
3. Aplicar aceleração, atrito exponencial e limite de velocidade.
4. Integrar posição.
5. Detectar sobreposição entre círculos.
6. Corrigir penetração proporcionalmente à massa.
7. Calcular impulso normal com elasticidade.
8. Converter impacto válido em dano e feedback.
9. Resolver limites da arena e aplicar impulso tangencial anti-canto.

Projéteis futuros usarão swept-circle contra segmentos e substeps adaptativos. Obstáculos terão shapes simples (círculo/AABB/cápsula) e broad phase em spatial hash. O motor só fará CCD onde velocidade × timestep puder superar o menor diâmetro de colisão.

## 4. Inteligência artificial

A IA é híbrida: decisão discreta + steering contínuo + física. Cada agente recebe personalidade, agressividade, distância desejada, direção orbital e fase de oscilação.

- A camada de decisão agenda rajadas, alterna órbita e reage à vida.
- A camada de steering combina perseguir/fugir, movimento tangencial e pequena oscilação.
- A física limita aceleração e velocidade, então decisões não teleportam a entidade.
- O anti-travamento mede tempo quase parado e aplica um vetor determinístico de escape.

Nas próximas etapas, a IA avaliará utilidade de ataques e habilidades por alcance, risco, cooldown, energia e perfil. Cada ação implementará `canUse(context)` e `score(context)`, permitindo seleção por utilidade sem acoplar a IA a itens específicos.

## 5. Randomização, balanceamento e seed

`Random` converte texto em estado de 32 bits com FNV-1a e gera a sequência com Mulberry32. Toda decisão que influencia a luta consome essa instância: inimigo, atributos, personalidade, direção inicial, decisões e críticos. A renderização não altera o RNG de gameplay.

Reproduzir uma partida exige:

- mesma seed;
- mesma versão das regras;
- mesma build e dificuldade;
- mesma ordem de sistemas.

O timestep fixo evita que FPS mude a quantidade de decisões. Quando conteúdo procedural for ampliado, a seed principal será dividida em streams nomeadas (`enemy`, `battle`, `loot`, `vfx`) para que adicionar uma partícula não mude o inimigo gerado.

O Battle Score atual pondera vida, dano, velocidade, massa e armadura. Na Etapa 3, cada item exporá custo de poder e tags. O gerador terá orçamento por dificuldade, limites por raridade, filtros de incompatibilidade e bônus de sinergia. Randomização equilibrada maximiza aderência ao orçamento; caótica permite desvios e itens corrompidos.

## 6. Estrutura-alvo completa

```text
orb-arena-chaos-protocol/
├── index.html
├── README.md
├── PROJECT_PLAN.md
├── css/
│   ├── main.css
│   ├── menu.css
│   ├── battle.css
│   └── responsive.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── config.js
│   ├── state.js
│   ├── storage.js
│   ├── engine/
│   │   ├── gameLoop.js
│   │   ├── physics.js
│   │   ├── collision.js
│   │   ├── renderer.js
│   │   ├── camera.js
│   │   ├── particles.js
│   │   ├── audio.js
│   │   └── random.js
│   ├── entities/
│   │   ├── fighter.js
│   │   ├── projectile.js
│   │   ├── obstacle.js
│   │   ├── pickup.js
│   │   └── summon.js
│   ├── systems/
│   │   ├── combatSystem.js
│   │   ├── weaponSystem.js
│   │   ├── abilitySystem.js
│   │   ├── perkSystem.js
│   │   ├── enemyGenerator.js
│   │   ├── aiSystem.js
│   │   ├── statusEffectSystem.js
│   │   ├── progressionSystem.js
│   │   ├── tournamentSystem.js
│   │   ├── survivalSystem.js
│   │   └── battleLogger.js
│   ├── data/
│   │   ├── weapons.js
│   │   ├── abilities.js
│   │   ├── perks.js
│   │   ├── enemies.js
│   │   ├── arenas.js
│   │   ├── statusEffects.js
│   │   ├── elements.js
│   │   └── rarities.js
│   └── ui/
│       ├── menuUI.js
│       ├── buildUI.js
│       ├── battleUI.js
│       ├── resultsUI.js
│       ├── compendiumUI.js
│       ├── tournamentUI.js
│       ├── tooltipUI.js
│       └── settingsUI.js
└── assets/
    ├── sounds/
    ├── icons/
    └── backgrounds/
```

Pastas futuras não são criadas vazias nesta etapa. Elas entram junto com implementações completas, evitando placeholders e funções sem comportamento.

## 7. Plano de desenvolvimento

### Etapa 1 — fundação entregue

- Arquitetura modular e documentação.
- Menu principal com mapa visual das funcionalidades futuras.
- Navegação menu → configuração → batalha → resultado.
- Canvas responsivo e loop fixo.
- Duas entidades, steering, massa, aceleração, atrito e ricochete.
- Colisão circular, dano, vida, morte, vitória, derrota e limite de tempo.
- Seed, histórico local mínimo, áudio procedural e diagnóstico.

### Etapa 2 — armas e expressão de combate

- Contrato `WeaponDefinition` e instâncias por combatente.
- Cinco armas completas: espada giratória, martelo, arco automático, escopeta e orbe mágico.
- Pools de projéteis e hitboxes temporais para melee.
- Cooldowns, críticos por ataque, knockback por arma e telemetria por fonte.
- HUD de arma, partículas e sons específicos.
- Catálogo preparado para crescer até as 20 armas solicitadas.

### Etapa 3 — builds, perks e habilidades

- 30 habilidades e 40 perks data-driven, com executores de efeitos reutilizáveis.
- Slots ativa, secundária e passiva; ultimates e gatilhos reativos.
- Raridades, tags, sinergias, incompatibilidades e itens corrompidos.
- Gerador de inimigos por orçamento de Battle Score.
- Manual, 1 ou 3 escolhas aleatórias, build total, equilibrada e caótica.
- Rerolls e salvamento temporário da build ativa.

### Etapa 4 — mundo e modos centrais

- 10 arenas com layouts e modificadores próprios.
- 17 status e 10 elementos com interações declarativas.
- IA de utilidade para distância, fuga, habilidade, ultimate e sobrevivência.
- Melhor de 3/5, chefe, escalada, infinito, espelho e drafts.
- Resultado expandido com fonte de dano, habilidades e impacto de perks.

### Etapa 5 — metajogo

- Torneios de 8/16 participantes e simulação rápida.
- Sobrevivência com escolhas entre rodadas e chefes periódicos.
- Conta local, XP, moedas, unlocks e conquistas.
- CRUD, comparação, importação e exportação de builds.
- Compêndio, busca, filtros, favoritos e descobertas.
- Save JSON versionado, importação, exportação e migrações.

### Etapa 6 — produção

- Áudio e mixagem completos, temas e controles de acessibilidade.
- Qualidade visual, limites dinâmicos e redução de movimento.
- QA mobile/tablet/desktop, revisão de contraste e navegação por teclado.
- Spatial hash, pools finais, profiling e orçamento de frame.
- Documentação de extensão para armas, perks, habilidades, arenas, inimigos e status.

## 8. Riscos técnicos e mitigação

- **Determinismo em engines JavaScript:** operações de ponto flutuante são estáveis nos navegadores modernos, mas não garantidas entre engines futuras. Relatórios guardam versão; replays incompatíveis podem ser marcados.
- **Tunneling de projéteis:** timestep alto sozinho não basta. Projéteis rápidos usarão CCD e raycast segmentado.
- **Explosão combinatória de efeitos:** perks e habilidades serão compostos por eventos tipados, prioridade e limites de recursão; interações incompatíveis serão filtradas na geração.
- **Power creep:** cada conteúdo terá custo, curva de raridade, caps e testes estatísticos por lotes de seeds.
- **CPU em torneios:** simulação sem render usará o mesmo step, com partículas/áudio desativados e limite de tempo.
- **LocalStorage limitado:** saves permanecem compactos e versionados; histórico tem retenção. Exportação JSON evita aprisionamento dos dados.
- **Canvas em mobile:** resolução interna é limitada a devicePixelRatio 2; quantidade de partículas seguirá preset de qualidade.

## 9. Estratégia de performance

- Simulação fixa; render independente com `requestAnimationFrame`.
- Máximo de catch-up steps por frame para evitar spiral of death.
- Pool circular de partículas já presente; projéteis e números flutuantes adotarão pools na Etapa 2.
- Limites de partículas e de logs.
- Ausência de alocações grandes dentro da física.
- Canvas em uma única camada; HUD permanece em DOM por acessibilidade.
- Pausa automática quando a aba fica oculta.
- Futuro spatial hash para muitos projéteis, summons e obstáculos.
- Presets de qualidade e DPR máximo no mobile.

## 10. Estratégia de testes

### Automatizados

- Sintaxe de todos os arquivos JavaScript.
- Carregamento de todos os scripts e ausência de erros no console.
- Testes unitários futuros para RNG, dano, armor, colisão, seed e serialização.
- Simulações headless por lotes para medir win rate, duração, timeout e outliers.

### Integração

- Menu → configuração → início → pausa → velocidades → resultado → revanche.
- Mesma seed/build produz mesmo vencedor e números de combate.
- Histórico incrementa e persiste após reload.
- Saída da batalha encerra o loop anterior.
- Aba oculta pausa a simulação.

### Visual e acessibilidade

- Viewports de desktop, tablet e celular.
- Canvas preserva 16:9 e controles continuam tocáveis.
- Teclado, foco visível, labels, contraste e `prefers-reduced-motion`.
- Partículas e números permanecem legíveis sem cobrir o estado essencial.
