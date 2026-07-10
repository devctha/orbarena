# CHARACTER BALLS — roster e arquitetura

Projeto criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

Esta versão transforma os combatentes em entidades dirigidas por dados. O registro contém 60 personagens jogáveis; cada entrada declara identidade visual, classe/subclasse, raridade, elemento, dificuldade, personalidade, estatísticas, quatro partes do kit, forças, fraquezas, sinergias, counters, matchups, tags, falas, animações e assinaturas de VFX/SFX.

## Fluxo jogável

- **Jogar** abre o arquivo de personagens com busca, favoritos, filtros por classe, raridade, elemento, estilo e dificuldade, além de oito ordenações.
- A ficha lateral apresenta kit, orçamento de poder, estatísticas históricas e leitura do confronto.
- **Selecionar** leva o personagem ao configurador; **Testar** abre o Character Lab com alvo estacionário, cura, recargas, ultimate, clones, status e escala temporal.
- O inimigo é escolhido por orçamento de poder, dificuldade, histórico recente e matriz de matchups.
- O relatório salva personagem, classe, raridade e telemetria exclusiva do kit para alimentar uso e win rate.

## Segurança e balanceamento

Clones e invocações possuem dono, limite global, limite por kit, vida útil, fade e limpeza; invocações nunca invocam outras entidades. Veneno possui stacks, duração, resistência, redução de cura e limite de poças. Espinhos possuem crescimento, hitbox, durabilidade e quebra. O tempo é separado em escalas de jogo, lutador, projétil, habilidade e visual.

O motor limita controle repetido com resistência temporária, aplica retorno decrescente a escudos e impõe caps globais. O laboratório analítico executa 10, 100, 1.000 ou 17.700 confrontos (todos contra todos) sem renderização.

## Verificação

```powershell
node tests/core-smoke.js
node tests/characters-smoke.js
node tests/kits-smoke.js
```

Os testes cobrem determinismo/física, catálogo de 60 personagens, 60 handlers, contratos completos dos kits, budgets, simulação, limites de clones e ausência de clonagem recursiva.
