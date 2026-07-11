# Orb Arena — Secure Progression V8

## Arquitetura

A atualização foi integrada à base existente, sem criar outro jogo e sem substituir a Arena retangular, Orb Arena, Stick Arena, builds, Draft, histórico, replays, Bestiário ou saves V5.

O frontend continua modular e pode executar batalhas sem conexão. Dados de autoridade — conta, senha, sessão, role, inventário, créditos, XP, compras, pulls e administração — pertencem ao backend Node. O save local é tratado somente como legado importável e preferências de dispositivo.

O backend utiliza SQLite com queries parametrizadas e transações. A fronteira de repositório permite substituir o arquivo SQLite por PostgreSQL posteriormente sem conceder acesso direto ao banco para o frontend.

## Segurança entregue

- Hash bcrypt configurável e nenhum hash retornado pela API.
- Sessões opacas armazenadas por hash, cookies HttpOnly, SameSite e Secure configurável.
- Token CSRF por sessão para toda mutação autenticada.
- Rate limiting, bloqueio temporário e mensagem genérica de credenciais inválidas.
- Validação, limites de payload, sanitização de campos exibidos e SQL parametrizado.
- Sessões com expiração, rotação, logout, revogação global e recuperação genérica anti-enumeração.
- Autorização ADMIN em toda rota administrativa, confirmação, motivo, sessão recente e Audit Log antes/depois.
- Proteção de autoedição perigosa e do último administrador ativo.
- Seed idempotente; username e senha inicial vêm do ambiente do servidor. A senha solicitada não existe em arquivos versionados.
- ADMIN usa flags `infinite_credits` e `infinite_gacha`, sem saldos numericamente artificiais.

## Progressão e economia

- Perfil, preferências, modo iniciante, tutorial e AUTO como padrão.
- Starter roster: 6 Orbs, 6 versões Stick, 3 armas, 6 habilidades, 6 perks, 2 arenas e 2 builds.
- Carteira com Créditos, Gems, Tickets e Fragmentos; toda alteração gera transação imutável.
- Curva de XP centralizada, level up, histórico de XP e recompensas de batalha validadas no servidor.
- Redução anti-farm para seeds repetidas e bloqueio de partidas curtas/inválidas.
- Loja direta com requisitos, confirmação e deduplicação.
- Beginner Banner e Permanent Banner, taxas públicas, pull único/10, garantia mínima, soft/hard pity, limite iniciante, duplicatas compensadas e histórico.
- O cliente envia apenas intenção de compra/pull; preço, saldo, resultado, pity e recompensa são decididos no servidor.

## Experiência do jogador

- Navegação inicial reduzida a Jogar, Personagens, Coleção, Builds, Loja, Banner, Perfil e Configurações.
- Recursos avançados agrupados em Mais opções; ADMIN só aparece para a role correta.
- Login, cadastro, recuperação genérica, perfil, XP, carteira, coleção, loja, banners, resultado e painel administrativo responsivos.
- Onboarding contextual de 15 etapas, pulável e persistido.
- Importação opcional de saves V1–V5 com limites, deduplicação e rejeição de créditos, XP, wallet ou role vindos do navegador.
- AUTO/MANUAL selecionável no hangar e no Draft; MANUAL preserva movimento automático e permite Auto Cast individual.

## Animação e combate

- Orb: respiração procedural, spawn ease, squash/stretch por velocidade e impacto, núcleo com inércia, runas de cast, reação a stun, shield e materiais reativos. A hitbox circular não muda.
- Stick: 61 estados nomeados, 18 pontos esqueléticos, 16 partes corporais visíveis, joint limits, IK analítico de duas juntas, blending suave, poses procedurais e state transition guards.
- Corrida, sprint, salto, queda, fast fall, dash, socos, chutes, bloqueio, parry, knockback, knockdown, grounded, get up, roll, Ultimate, vitória, derrota e morte possuem poses distintas.
- Impactos usam cabeça, pescoço, tronco, braços, quadril e pernas; golpes fortes ativam ragdoll híbrido amortecido antes da recuperação.
- FX existentes de kinetic lines, afterimages, impacto, freeze frame, shake e áudio procedural por intensidade continuam integrados ao dano central.

## Validação executável

- `server/test/api.test.js`: cadastro, bcrypt, sessão, CSRF, perfil, logout/login, starter roster, economia, compra, XP, transações, gacha, pity, ADMIN, Audit Log, migração e bloqueio por tentativas.
- `tests/account-animation-smoke.js`: estados Stick, juntas finitas, ragdoll, transições, telas, endpoints, tabelas e ausência da senha administrativa solicitada em arquivos do servidor.
- As dez suítes anteriores continuam cobrindo física, 110 personagens, kits, 175 habilidades, saves V5, builds, modos, arenas, replays, dano central e Stick Arena.
