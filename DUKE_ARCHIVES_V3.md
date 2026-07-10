# Duke Archives — versão 3

Criação, desenvolvimento, design, direção e conceito: **Duke Dandalian**.

Todos os direitos de criação, design, desenvolvimento e direção atribuídos a Duke Dandalian.

## Arquitetura

- `BuildSystem`: normalização, validação, orçamento, sinergias, randomização e importação segura de JSON.
- `ProgressionSystem`: descoberta do Bestiário e atualização de estatísticas por encontro.
- `Storage`: migração para save v3, limites configuráveis, CRUD de builds, histórico e favoritos.
- `BuildUI`: editor integrado e teste temporário sem alterar estatísticas permanentes.
- `ArchiveUI`: builds salvas e histórico de batalhas.
- `CatalogUI`: Arsenal, Perks e Habilidades com busca, filtros, paginação e comparação.
- `BestiaryUI`: descoberta progressiva e integração com batalha, personagens e histórico.

## Arena principal

`classic` é a definição padrão. Ela é retangular e usa os limites de `CONFIG.arena`, mantendo resolução independente para esquerda, direita, teto e piso. O cálculo existente de retenção, multiplicador de ricochete, velocidade mínima e Wall Boost continua em `PhysicsSystem.resolveWalls`.

As definições circulares permanecem selecionáveis como alternativas, sem substituir a Arena Clássica.

## Save v3

A migração preserva configurações, histórico, builds, estatísticas, desbloqueios e favoritos. Campos ausentes recebem padrões seguros. Imports de build usam somente `JSON.parse`, normalização e validação de IDs; nenhum conteúdo importado é executado.

Limites padrão:

- 50 builds, configurável até 100.
- 200 batalhas; registros favoritos não são removidos automaticamente.

## Testes

`tests/modules-v3-smoke.js` verifica migração, créditos, catálogos, builds, importação, Bestiário, arena retangular, ricochete, Wall Boost, responsividade, quota de LocalStorage e dados inválidos.
