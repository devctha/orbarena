# ORB ARENA: CHAOS PROTOCOL

Criado, desenvolvido, projetado, concebido e dirigido por **Duke Dandalian**.

Todos os direitos de criação, design, desenvolvimento e direção atribuídos a Duke Dandalian.

Versão `0.8.0-secure-progression` da plataforma de combate para navegador. Orb Arena preserva a Arena Clássica retangular, ricochetes e Wall Boost; Stick Arena reutiliza o mesmo elenco, builds e progressão em combates de plataforma 2D.

O remaster acrescenta HUD de quatro skills + Ultimate, Auto Cast por habilidade, 20 modos, 24 modificadores, arenas até 1760×990, assistências e kill feed, MVP/highlights, música dinâmica, replay por snapshots, spectator, sandbox, editor de arena, modo foto, perfil, conquistas, coleção, comparador e saves V5 retrocompatíveis. Consulte [COMMERCIAL_REMASTER_V5.md](COMMERCIAL_REMASTER_V5.md) para o diagnóstico e a matriz de validação.

O Design & Ability Overhaul adiciona design system tokenizado, Home operacional, materiais procedurais de Orb, raridades consistentes, atlas de ícones, telegraphs por forma, apresentação em sete fases, FX/SFX por elemento, HUD radial e Visual Lab interno. Consulte [DESIGN_ABILITY_REMASTER_REPORT.md](DESIGN_ABILITY_REMASTER_REPORT.md).

## Conteúdo

- 110 personagens e 50 poderes adicionais.
- Criador de builds com validação, Power Budget e sinergias.
- Builds salvas, variantes, importação e exportação JSON.
- Histórico com seeds, telemetria, revanche e repetição.
- Arsenal, catálogo de perks e catálogo com 175 habilidades e poderes.
- Quatro presets de duração, fases de combate e Burst Protection.
- ParticleManager com LOD, prioridades e pools de 300 a 3.000 partículas.
- 40 habilidades cinematográficas com telegraphing.
- Bestiário com descoberta progressiva.
- Save local versão 5 com migração das versões anteriores.
- Arena retangular padrão; Wall Boost e colisões nas quatro paredes preservados.

## Executar o frontend

Sirva a raiz com qualquer servidor HTTP estático. O combate continua disponível em modo local quando a API não está online. Login, perfil, economia, loja, banners, gacha e administração exigem o backend abaixo.

## Executar o backend seguro

Requer Node.js 22 ou superior.

```powershell
cd server
pnpm install
$env:ADMIN_USERNAME="DukeAdmin"
$env:ADMIN_INITIAL_PASSWORD="defina-no-ambiente-do-servidor"
pnpm run seed:admin
pnpm start
```

O seed é idempotente, armazena apenas hash bcrypt e marca a senha inicial para troca. Nunca coloque a senha real em `.env.example`, código do frontend, logs ou arquivos versionados. A API usa SQLite parametrizado, transações, cookies HttpOnly/SameSite, CSRF, sessões revogáveis, rate limiting, bloqueio temporário, autorização ADMIN e Audit Log.

Em produção, publique a API atrás de HTTPS e configure `COOKIE_SECURE=true`, `APP_ORIGIN` com a origem exata do frontend e armazenamento persistente para `DATABASE_PATH`. O frontend espera `/api`; um proxy reverso deve encaminhar esse prefixo para a API removendo-o.

## Testes

```powershell
node tests/core-smoke.js
node tests/characters-smoke.js
node tests/kits-smoke.js
node tests/expansion-smoke.js
node tests/modules-v3-smoke.js
node tests/pacing-cinematic-smoke.js
node tests/complete-update-smoke.js
node tests/headless-game-v5-smoke.js
node tests/design-remaster-smoke.js
node tests/combat-stick-corrective-smoke.js
node tests/account-animation-smoke.js
cd server
pnpm test
```

A atualização corretiva centraliza dano, vida, escudo e morte, reconstrói a sidebar responsiva e adiciona o modo compartilhado Stick Arena. Consulte [CORRECTIVE_COMBAT_STICK_ARENA_REPORT.md](CORRECTIVE_COMBAT_STICK_ARENA_REPORT.md).

A atualização de progressão segura adiciona contas, starter roster, créditos, XP, loja, banners, pity, painel ADMIN, onboarding, AUTO/MANUAL e animação Stick articulada. Consulte [SECURE_PROGRESSION_V8.md](SECURE_PROGRESSION_V8.md).

Consulte `CINEMATIC_COMBAT_V4.md` para ritmo, proteção de burst, partículas e habilidades cinematográficas.
