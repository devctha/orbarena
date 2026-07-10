# ORB ARENA: CHAOS PROTOCOL

Criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

Todos os direitos de criação, design, desenvolvimento e direção atribuídos a Duke Dandalian.

Versão `0.3.0-duke-archives` do auto battler para navegador. O modo principal utiliza a Arena Clássica retangular, com quatro paredes físicas, ricochetes fortes, Wall Boost e movimentação arcade. As arenas circulares anteriores continuam disponíveis apenas como modos alternativos.

## Conteúdo

- 110 personagens e 50 poderes adicionais.
- Criador de builds com validação, Power Budget e sinergias.
- Builds salvas, variantes, importação e exportação JSON.
- Histórico com seeds, telemetria, revanche e repetição.
- Arsenal, catálogo de perks e catálogo de habilidades.
- Bestiário com descoberta progressiva.
- Save local versão 3 com migração das versões anteriores.
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
```

Consulte `DUKE_ARCHIVES_V3.md` para a arquitetura e os fluxos da atualização.
