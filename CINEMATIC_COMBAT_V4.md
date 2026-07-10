# Cinematic Combat V4

Projeto criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

## Ritmo e duração

Os presets Curta, Padrão, Longa e Épica controlam abertura, escalada, clímax, morte súbita e limite final. O modo Padrão foi calibrado e medido com média de 75 segundos na amostra defensiva de referência, dentro da faixa-alvo de 50–90 segundos. Matchups ofensivos podem terminar antes.

O combate não multiplica toda a vida. A sobrevivência adicional vem de limites por fonte, diminishing returns, cooldown da mesma fonte, proteção de múltiplos hits, regeneração fora de combate e uma segunda chance contextual.

## Burst Protection

`BurstProtectionSystem` mantém uma janela móvel de um segundo, aplica tetos para colisão, projétil, habilidade e ultimate, reduz hits repetidos e ativa mitigação temporária após uma perda rápida relevante. O modo Caótico ignora sua mitigação. Ativações e dano evitado entram na telemetria.

## Movimento

Quinze perfis controlam distância, ataque, paredes, dash, ultimate, colisão, recuo, zonas, pouca vida e reação a projéteis. A direção combina órbita, espiral, finta, power-ups, evasão e momentum carry.

## Partículas e câmera

`ParticleManager` usa pool fixo, prioridades, LOD e limites por grupo. Capacidades: 300, 700, 1.500 e 3.000. Trinta famílias visuais são suportadas. A performance adaptativa reduz efeitos decorativos antes dos críticos e restaura qualidade gradualmente.

`ScreenShakeManager` limita tremores concorrentes. A câmera aplica zoom out em alta velocidade, impacto, freeze frame curto, slow motion raro e foco visual sem alterar a física.

## Habilidades

As 40 habilidades de sobrevivência, movimento, impacto e controle estão em `cinematicAbilities.js`; sua execução, zonas persistentes e telegraphs ficam em `cinematicAbilitySystem.js`. Todas possuem ativação funcional e feedback visual.

## Segurança de memória

Pools, projéteis, trails, textos, ondas, raios, decals, telegraphs, zonas, marcas de parede e efeitos persistentes têm limites ou limpeza por tempo. O teste de estresse preenche 3.000 partículas e confirma o retorno do contador ativo a zero.
