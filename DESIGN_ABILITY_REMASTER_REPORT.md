# ORB ARENA — Design & Ability Remaster

Versão `0.6.0-design-ability-remaster`.

## Resultado

O remaster foi aplicado sobre o jogo existente, sem reescrever o núcleo nem alterar hitboxes. A Arena Clássica continua retangular e principal; colisões nas quatro paredes, ricochetes, Wall Boost, modos, draft, builds, progressão, replays e saves V5 foram preservados.

O catálogo visual expõe 160 habilidades e poderes com identificadores únicos. Cada entrada possui metadados de apresentação, combate, IA e telemetria: categoria, elemento, tipo, raridade, cooldown, charges, cast time, channeling, alcance, área, duração, custo, alvo, Power Budget, tags, FX, SFX, telegraph, impacto, encerramento, interações, counters, sinergias, Auto Cast e estatísticas.

## Auditoria inicial

- O projeto distribuía estilos por oito folhas CSS, com cores, espaçamentos, glows e estados repetidos.
- A interface possuía 65 declarações visuais rígidas e diversas telas competindo com camadas antigas de estilo.
- As 70 habilidades centrais tinham dados funcionais básicos, mas não compartilhavam contrato completo de apresentação.
- O renderer já possuía pooling, LOD, caches e `OffscreenCanvas`, porém os Orbs ainda compartilhavam uma silhueta visual muito parecida.
- Home, catálogo e HUD eram funcionais, mas não formavam um fluxo comercial coerente nem ofereciam um laboratório visual integrado.

## Design system

`css/design-system.css` concentra tokens semânticos para superfícies, texto, estados, elementos, raridades, espaçamento, raios, sombras, glows, tipografia, duração, foco e alvos de toque. O arquivo também padroniza botões, painéis, badges, tooltips, toasts, skeletons e estados vazio, carregando e erro.

Foram incluídos alto contraste, texto ampliado, redução de movimento, navegação por teclado, foco visível, marcadores que não dependem apenas de cor e dock móvel. A camada nova é carregada após os estilos legados para manter retrocompatibilidade enquanto centraliza a apresentação final.

## Home e navegação

A Home virou uma central de comando com continuar operação, última build, Orb favorita, batalha recente, conquista, arena recomendada e resumo da atualização. Atalhos levam a Draft, Habilidades, Visual Lab e Histórico. No celular, Home, Draft, Skills, Builds e Ajustes ficam em uma barra inferior persistente.

## Identidade dos Orbs

Os cards e previews agora são construídos em camadas — aura, casco, material, runa e satélite — e o renderer usa famílias procedurais distintas para cristal, gelo, prisma, líquido, ácido, sangue, tecnologia, relógio, vazio, singularidade, fogo e eletricidade. Squash/stretch, marcas de dano, cast, congelamento, veneno, fogo e Wall Boost adicionam estado sem modificar raio físico ou hitbox.

## Sistema visual de habilidades

`AbilityPresentationSystem` separa preparação, cast, ativação, impacto, persistência, encerramento e cooldown. Telegraphs suportam linha, seta, cone, círculo e área; hachuras, ticks e formas oferecem leitura independente de cor. O sistema usa limite de efeitos, reaproveita o ParticleManager existente e aciona linguagem de áudio por elemento e fase.

Os ícones são geométricos, procedurais e identificados por habilidade. Manifestos reais ficam em `assets/icons`, `assets/textures` e `assets/ui`; não há dependência externa de imagens.

## Catálogo, HUD e Visual Lab

O catálogo ganhou ícone, raridade, elemento, filtros, paginação, navegação por teclado e detalhe com as sete fases visuais, stats, charges, cast, channeling, custo, telegraph, FX, sinergias e interações.

O HUD apresenta quatro skills e Ultimate, teclas, alvo, cargas, cooldown radial, cast bar, estado bloqueado e Auto Cast individual. O kill feed recebe feedback sonoro controlado.

O Visual Lab permite revisar Orbs, skills, partículas, componentes e fundos; alterna tema, resolução e qualidade; pausa a animação, exibe FPS, hitboxes e captura a prévia. A animação só roda quando a tela está ativa.

## Performance

- Telegraphs simultâneos são limitados a 32.
- Projéteis e partículas fora da viewport são descartados no desenho.
- Orbs usam materiais procedurais sem novas texturas pesadas.
- A renderização mantém caches, pooling, LOD e presets de 300 a 3.000 partículas.
- Cards extensos usam `content-visibility` para reduzir custo fora da tela.
- `prefers-reduced-motion` desativa parallax e animações não essenciais.

## Validação

Nove suítes automatizadas passaram:

- física e combate V2;
- 60 kits originais;
- expansão para 110 personagens;
- modos, modificadores, replays e saves V5;
- simulação headless 4v4;
- pacing curto, padrão e longo;
- módulos V3/V5 retrocompatíveis;
- contrato do Design & Ability Remaster.

O smoke test final registrou 160 habilidades, 10 elementos, quatro famílias mínimas de telegraph e todos os campos obrigatórios presentes. A revisão no navegador cobriu Home desktop, Home em 390×844 sem overflow, catálogo, detalhe de habilidade em sete fases, Visual Lab com 24 skills visíveis e batalha mobile com HUD completo. Não houve erro ou warning de console durante o fluxo validado.

## Principais arquivos

- `css/design-system.css`
- `js/data/abilityVisuals.js`
- `js/systems/abilityPresentationSystem.js`
- `js/ui/homeRemasterUI.js`
- `js/ui/characterRemasterUI.js`
- `js/ui/catalogRemasterUI.js`
- `js/ui/battleRemasterUI.js`
- `js/ui/visualLabUI.js`
- `tests/design-remaster-smoke.js`

O pacote estático de `dist/client` espelha a fonte validada e mantém o worker existente em `dist/server`.
