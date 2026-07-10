# Revisão profunda de combate e física — V2

Projeto criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

## Diagnóstico do sistema anterior

O motor original possuía uma boa fundação: loop fixo, separação básica entre física/renderização e colisão circular com impulso. O problema não era a ausência total de física, mas a pequena quantidade de estado e de consequências ligada a ela.

Problemas identificados:

1. A IA alterava velocidade diretamente em vez de acumular forças.
2. Atrito elevado e limites baixos reduziam a energia após poucos segundos.
3. Colisão considerava massa e elasticidade, mas não resistência a knockback, energia do impacto ou repulsão adicional.
4. Paredes apenas invertiam velocidade; não existiam retenção configurável, força mínima ou Wall Boost.
5. O timestep fixo ajudava contra tunneling, porém não havia substeps adaptativos ou CCD explícita.
6. Todo dano vinha de contato entre os dois círculos.
7. Não existiam armas físicas, projéteis, habilidades, eventos reativos ou combos.
8. Partículas usavam praticamente a mesma intensidade para qualquer contato.
9. Telemetria era insuficiente para balancear velocidade, impulso e fontes de dano.
10. IA, física e combate estavam acoplados ao método único `handleCollision`.

## Plano de refatoração aplicado

O menu, LocalStorage, fluxo de telas, loop fixo e identidade visual foram preservados. A refatoração se concentrou nos contratos limitantes:

1. Expandir `Fighter` para representar um corpo físico e seu estado de combate.
2. Separar vetores, colisão, projéteis, armas, habilidades, perks, combos e arena.
3. Transformar dano em uma entrada centralizada por fonte.
4. Usar eventos para reações sem acoplar perks à física.
5. Manter renderização como observadora; deformação e câmera não alteram hitboxes.
6. Adicionar dados declarativos para conteúdo expansível.
7. Aumentar a telemetria e os testes determinísticos.

## Arquivos alterados

- `index.html`: painel físico, loadouts, combos, debug e resultados expandidos.
- `css/menu.css`, `css/battle.css`, `css/responsive.css`: controles e HUD responsivos.
- `js/config.js`: atributos, velocidades e marcos de intensidade.
- `js/entities/fighter.js`: corpo físico, estados, escudo, rotação, deformação e telemetria.
- `js/engine/collision.js`: impulso, correção, segmentos e CCD.
- `js/engine/physics.js`: forças, substeps, IA, paredes e limites de segurança.
- `js/engine/particles.js`, `audio.js`, `renderer.js`: feedback proporcional à energia.
- `js/systems/combatSystem.js`, `battleLogger.js`: dano por fonte e eventos.
- `js/game.js`: nova ordem de sistemas e intensidade progressiva.
- `js/ui/menuUI.js`, `battleUI.js`, `resultsUI.js`, `main.js`: configuração e telemetria.
- `tests/core-smoke.js`: cobertura do motor V2.

## Novos arquivos

- `js/engine/vector.js`
- `js/entities/projectile.js`
- `js/data/physicsPresets.js`
- `js/data/weapons.js`
- `js/data/perks.js`
- `js/data/abilities.js`
- `js/systems/projectileSystem.js`
- `js/systems/weaponSystem.js`
- `js/systems/perkSystem.js`
- `js/systems/comboSystem.js`
- `js/systems/arenaSystem.js`
- `js/systems/abilitySystem.js`

## Fórmulas de movimento

Cada substep segue esta ordem:

```text
forçaTotal = forçaIA + forçaArena + forçaStatus
aceleração = forçaTotal / massa
velocidade = velocidade + aceleração × dt
velocidade = velocidade × exp(−atrito × dt)
velocidade = limitar(velocidade, velocidadeMáximaSegura)
posição = posição + velocidade × dt
```

O arrasto exponencial é independente do FPS. A movimentação normal nunca define diretamente uma nova posição; teleporte é uma habilidade explícita e validada contra os limites da arena.

Existem quatro limites:

- velocidade mínima de combate;
- máxima normal do chassis;
- máxima temporária para dash e Wall Boost;
- máxima absoluta de segurança.

Todo impulso também é limitado pelo teto absoluto antes do próximo frame.

## Colisão entre orbes

Para dois círculos sobrepostos:

```text
normal = normalizar(posiçãoB − posiçãoA)
velocidadeRelativa = velocidadeB − velocidadeA
velocidadeNormal = dot(velocidadeRelativa, normal)
massaEfetiva = 1 / (1/massaA + 1/massaB)
impulso = −(1 + elasticidade) × velocidadeNormal / (1/massaA + 1/massaB)
```

A penetração é corrigida proporcionalmente às massas inversas. Depois do impulso elástico, uma repulsão arcade limitada é aplicada:

```text
energiaImpacto = velocidadeRelativa × massaEfetiva
repulsão = clamp(72 + energiaImpacto × 0,62 × presetRepulsão × knockbackGlobal, 95, 520)
```

Resistência a knockback reduz a mudança de velocidade recebida. Um cooldown de contato de 70 ms permite resolver a posição em todos os substeps sem causar múltiplos danos absurdos.

O dano de colisão usa:

```text
dano = energiaImpacto × multiplicadorDeColisão + danoBase × 0,28
```

Perks, críticos, Wall Boost e habilidades modificam o resultado. O dano normal é limitado a 25% da vida máxima do alvo; impactos preparados podem alcançar 38%.

## Paredes e Wall Boost

A reflexão usa a fórmula vetorial:

```text
velocidadeRefletida = velocidade − 2 × dot(velocidade, normal) × normal
velocidadeFinal = velocidadeRefletida × retenção × multiplicadorDeRicochete
```

A tangente recebe `wallFriction`. A componente refletida nunca cai abaixo da velocidade mínima visível.

Wall Boost é ativado quando a velocidade de entrada supera o threshold do preset e o cooldown da parede está livre. O sistema:

- amplia a velocidade sem ultrapassar o limite absoluto;
- ativa uma trilha dourada;
- carrega o próximo impacto em 1,32×;
- dispara eventos para perks e habilidades;
- registra ricochete, Wall Boost e velocidade.

`PINBALL CHAOS` usa boost `1,20`, retenção `1,025`, elasticidade global `1,08` e ricochete `1,13`.

## Substeps e tunneling

O loop principal continua em 120 Hz. Dentro de cada tick, a física escolhe:

| Velocidade | Substeps |
|---:|---:|
| abaixo de 250 | 1 |
| 250–419 | 2 |
| 420–649 | 4 |
| 650–849 | 6 |
| 850 ou mais | 8 |

Orbes usam swept-circle quando a integração cruza uma colisão sem produzir sobreposição final. Projéteis dividem o deslocamento pelo raio e testam todo o segmento percorrido contra o círculo do alvo. Assim, lasers e mísseis não dependem apenas da posição final.

## IA e ritmo

A IA mistura steering, inércia e decisões discretas. Ela:

- persegue ou recua conforme distância, personalidade e vida;
- orbita para não formar uma linha estática;
- prevê posição em disparos;
- procura paredes quando um Wall Boost é provável;
- detecta projéteis se aproximando e aplica força perpendicular;
- escolhe habilidades por alcance, vida e categoria;
- muda estratégia sob pressão;
- recebe impulso determinístico se permanecer lenta por 280 ms.

Os lutadores começam a aproximadamente 255 px/s e parcialmente alinhados. A contagem regressiva foi reduzida para 1,55 s.

Intensidade:

- 20 s: +10% de intensidade e cooldowns ligeiramente menores.
- 40 s: arena começa a diminuir e intensidade chega a 1,25.
- 60 s: morte súbita, atração central e dano progressivo.

## Armas e projéteis

As seis armas melee usam segmentos físicos com alcance, espessura, ângulo, janela ativa e padrão próprio:

- Espada gira continuamente.
- Adagas atacam nos dois lados.
- Martelo usa arco lento, cabeça larga e forte knockback.
- Lança estende sua hitbox e perfura armadura.
- Foice executa sweep e rouba vida.
- Escudo cria arco ofensivo e redução frontal.
- Corrente varia alcance e usa extremidade física.

As armas de distância geram bolts, spread, mísseis, laser, minas e ricochetes. O pool possui 96 entidades, ou 128 em presets caóticos. Vida útil, bounces e pierce impedem projéteis infinitos.

## Habilidades

O catálogo possui 70 habilidades executáveis:

- **Movimento:** dez variações de dash, teleporte, fase, aceleração e corrida orbital.
- **Impacto:** dez poderes que preparam contato, alteram massa, criam ondas ou devolvem força.
- **Controle:** gravidade, buraco negro, prisão, congelamento, stun, lentidão, silêncio e confusão.
- **Defesa:** escudos, reflexão, invulnerabilidade, armor adaptativa, antiprojetil e ressurreição.
- **Ofensivo:** laser, chuva, mísseis, eletricidade, fogo, espinhos, drones, minas, lâminas e raio orbital.
- **Caos:** trocas de posição/velocidade, clones, duplicação, fragmentos, roubo e arena rotativa.
- **Reativo:** dez habilidades disparadas por parede, crítico, vida baixa, combos, bloqueio ou impacto extremo.

Os efeitos não são apenas modificadores numéricos: criam forças, teletransportes, zonas, projéteis, tarefas temporizadas, estados, clones de mira, entidades orbitais e mudanças na arena.

## Perks e combos

Os 20 perks cinéticos reagem aos mesmos eventos do motor: colisão, parede, bloqueio, velocidade e knockback. O gerador prioriza tags compatíveis com a arma.

Combos mantêm uma janela de 2,25 s. Sequências especiais incluem `PINBALL BREAK`, `POWER CRASH`, `CROSS IMPACT` e `TRIPLE CRASH`. O multiplicador chega a 1,65×; combos longos concedem haste e escudo, mas expiram se o ritmo cair.

## Arena dinâmica

`Câmara de Fluxo` e `Reator Pinball` incluem:

- dois pads de aceleração;
- dois bumpers com trajetória móvel;
- limites que diminuem a partir de 40 s;
- vento rotativo acionável;
- gravidade reversível;
- atração central e dano na morte súbita.

Todos os efeitos aplicam forças ou colisões reais. A geometria visual acompanha o estado usado pela física.

## Valores iniciais recomendados

Para uso geral:

- física: `Arcade`;
- timestep: `1/120`;
- máximo de substeps: `6`;
- retenção: `0,98`;
- elasticidade global: `1,00`;
- ricochete: `1,03`;
- repulsão: `1,15`;
- dano de colisão: `0,034`;
- knockback global: `1,10`;
- velocidade mínima: `135`;
- velocidade máxima: `720`;
- Wall Boost: `1,10` a partir de `275`;
- câmera: `0,75`;
- partículas: `1,00`.

## Presets

| Preset | Retenção | Elasticidade | Repulsão | Vel. mín. | Vel. máx. | Wall Boost |
|---|---:|---:|---:|---:|---:|---:|
| Arcade | 0,980 | 1,00 | 1,15 | 135 | 720 | 1,10 |
| Realista | 0,920 | 0,90 | 0,82 | 95 | 590 | 1,00 |
| Caótico | 1,010 | 1,04 | 1,42 | 170 | 880 | 1,15 |
| Super rápido | 1,000 | 1,02 | 1,22 | 230 | 980 | 1,12 |
| Pesado | 0,940 | 0,88 | 1,55 | 90 | 560 | 1,06 |
| Sem atrito | 1,000 | 1,00 | 1,05 | 150 | 760 | 1,04 |
| PINBALL CHAOS | 1,025 | 1,08 | 1,72 | 205 | 960 | 1,20 |
| Cinemático | 0,980 | 0,99 | 1,34 | 125 | 710 | 1,10 |

## Instruções de teste manual

1. Abra `index.html` e escolha `PINBALL CHAOS`.
2. Expanda configuração manual e altere retenção, repulsão e Wall Boost.
3. Inicie uma batalha e confirme primeiro contato em poucos segundos.
4. Ative hitboxes e debug.
5. Observe vetores amarelos de velocidade, verdes de aceleração e normal magenta.
6. Teste pausa, 0,5×, 2×, 4× e revanche com a mesma seed.
7. Confirme que a revanche repete vencedor, duração e estatísticas.
8. Gere novo inimigo e verifique novo loadout.
9. Redimensione para 390×844 e confira ausência de rolagem horizontal.
10. Execute `node tests/core-smoke.js`.

## Checklist de bugs revisados

- [x] Separação de círculos sobrepostos.
- [x] Cooldown contra dano múltiplo no mesmo contato.
- [x] Normal de canto normalizada.
- [x] Limite absoluto aplicado após impulso e colisão.
- [x] Ricochete preserva energia dentro do preset.
- [x] Wall Boost possui threshold, cooldown e teto.
- [x] Anti-paralisação determinístico.
- [x] CCD para projéteis rápidos.
- [x] Limite e reciclagem de projéteis.
- [x] Estados possuem duração limitada.
- [x] Stun e invulnerabilidade possuem caps temporais.
- [x] Arena reduz sem lançar entidades para fora.
- [x] Seed repete a sequência completa.
- [x] 70 habilidades possuem handler executável.
- [x] Ausência de erros no console durante menu, configuração, batalha e resultado.
- [x] Layout sem overflow horizontal em 390×844.

## Performance

- Loop fixo separado de `requestAnimationFrame`.
- Substeps apenas quando a velocidade exige.
- Pools circulares de partículas e projéteis.
- Máximo de 128 projéteis.
- Limites para textos, ondas, raios e logs.
- DPR limitado a 2.
- Pausa ao ocultar a aba.
- Operações de colisão sem alocações grandes ou busca espacial desnecessária para o duelo 1×1.

Spatial hash só será necessário quando summons e dezenas de combatentes coexistirem; adicioná-lo agora aumentaria complexidade sem benefício mensurável.
