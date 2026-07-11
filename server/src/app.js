import crypto from "node:crypto";
import { OrbDatabase } from "./database.js";
import { BANNERS, RARITY_ORDER, SHOP_ITEMS, STARTER_CATALOG, levelRequirement } from "./catalog.js";
import { SlidingWindowLimiter, cookie, hashPassword, json, normalizeEmail, normalizeUsername, nowIso, parseCookies, randomToken, safeText, tokenHash, validEmail, validPassword, validUsername, verifyPassword } from "./security.js";

const SESSION_COOKIE = "orb_session";
const CSRF_COOKIE = "orb_csrf";
const unsafe = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const route = (method, pattern, handler) => ({ method, pattern, handler });
const matchRoute = (routes, method, pathname) => {
  for (const entry of routes) { if (entry.method !== method) continue; const found = pathname.match(entry.pattern); if (found) return { ...entry, params: found.groups || {} }; }
  return null;
};
const ipOf = (request) => String(request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "local").split(",")[0].trim().slice(0, 64);
const bodyOf = async (request) => { const raw = await request.text(); if (raw.length > 65536) throw new Error("PAYLOAD_TOO_LARGE"); try { return raw ? JSON.parse(raw) : {}; } catch { throw new Error("INVALID_JSON"); } };
const publicUser = (db, userId) => db.getUserFull(userId);
const pickWeighted = (items) => { const total = items.reduce((sum, item) => sum + item.weight, 0), roll = crypto.randomInt(0, 1_000_000) / 1_000_000 * total; let cursor = 0; for (const item of items) { cursor += item.weight; if (roll <= cursor) return item; } return items.at(-1); };
const rarityAtLeast = (rarity, minimum) => RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(minimum);

function corsHeaders(config, request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== config.origin) return {};
  return { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type,x-csrf-token,x-admin-confirm,x-admin-reason", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", vary: "Origin" };
}

function responseCookies(config, token, csrf, maxAge) {
  const headers = new Headers();
  headers.append("set-cookie", cookie(SESSION_COOKIE, token, { maxAge, secure: config.cookieSecure, httpOnly: true }));
  headers.append("set-cookie", cookie(CSRF_COOKIE, csrf, { maxAge, secure: config.cookieSecure, httpOnly: false }));
  return headers;
}

export async function seedAdministrator(db, config) {
  if (!config.adminInitialPassword) return { seeded: false, reason: "ADMIN_INITIAL_PASSWORD_NOT_SET" };
  const existing = db.findUserByIdentity(config.adminUsername);
  if (existing) return { seeded: false, reason: "ALREADY_EXISTS", userId: existing.id };
  if (config.adminInitialPassword.length < 8 || !/[A-Z]/.test(config.adminInitialPassword) || !/[a-z]/.test(config.adminInitialPassword) || !/\d/.test(config.adminInitialPassword)) throw new Error("ADMIN_INITIAL_PASSWORD_WEAK");
  const passwordHash = await hashPassword(config.adminInitialPassword, config.bcryptRounds);
  const syntheticEmail = `${config.adminUsername.toLowerCase()}@admin.orb-arena.internal`;
  const user = db.createUser({ username: config.adminUsername, email: syntheticEmail, passwordHash, displayName: config.adminUsername, role: "ADMIN", forcePasswordChange: true });
  db.audit(user.id, user.id, "ADMIN_SEED_CREATED", null, { role: "ADMIN", forcePasswordChange: true }, "Secure environment seed", "server");
  return { seeded: true, userId: user.id };
}

export function createOrbApp(config) {
  const db = new OrbDatabase(config.databasePath), limiter = new SlidingWindowLimiter();

  const authenticate = (request) => {
    const cookies = parseCookies(request.headers.get("cookie"));
    const session = db.sessionByToken(cookies[SESSION_COOKIE]);
    if (!session || session.status !== "ACTIVE") return null;
    return { session, token: cookies[SESSION_COOKIE], csrf: cookies[CSRF_COOKIE], user: db.getUserFull(session.user_id) };
  };
  const requireAuth = (context) => { const auth = authenticate(context.request); if (!auth) throw Object.assign(new Error("AUTH_REQUIRED"), { status: 401 }); context.auth = auth; return auth; };
  const requireAdmin = (context) => {
    const auth = requireAuth(context); if (auth.user.role !== "ADMIN") throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    if (Date.now() - Date.parse(auth.session.authenticated_at) > 15 * 60000) throw Object.assign(new Error("ADMIN_REAUTH_REQUIRED"), { status: 401 });
    return auth;
  };
  const requireCsrf = (context) => {
    if (!unsafe.has(context.request.method) || ["/auth/login", "/auth/register", "/auth/recover"].includes(context.url.pathname)) return;
    const auth = context.auth || authenticate(context.request), supplied = context.request.headers.get("x-csrf-token");
    if (!auth || !supplied || tokenHash(supplied) !== auth.session.csrf_hash) throw Object.assign(new Error("CSRF_INVALID"), { status: 403 });
  };
  const adminMutation = async (context, action, affectedId, mutate) => {
    const auth = requireAdmin(context); requireCsrf(context);
    if (context.request.headers.get("x-admin-confirm") !== "CONFIRM") throw Object.assign(new Error("ADMIN_CONFIRM_REQUIRED"), { status: 400 });
    const reason = safeText(context.request.headers.get("x-admin-reason"), 240);
    if (!reason) throw Object.assign(new Error("ADMIN_REASON_REQUIRED"), { status: 400 });
    const key = `admin:${auth.user.id}`; if (!limiter.allow(key, 30, 60000)) throw Object.assign(new Error("RATE_LIMITED"), { status: 429 });
    const before = affectedId ? db.getUserFull(affectedId) : null, result = await mutate(auth, before), after = affectedId ? db.getUserFull(affectedId) : result;
    db.audit(auth.user.id, affectedId, action, before, after, reason, ipOf(context.request));
    return result ?? after;
  };

  const routes = [
    route("GET", /^\/health$/, async () => json(200, { ok: true, service: "orb-arena-api", version: "0.8.0" })),
    route("POST", /^\/auth\/register$/, async (context) => {
      const ip = ipOf(context.request); if (!limiter.allow(`register:${ip}`, 5, 15 * 60000)) return json(429, { error: "RATE_LIMITED" });
      const body = await bodyOf(context.request), username = normalizeUsername(body.username), email = normalizeEmail(body.email), displayName = safeText(body.displayName || username, 40);
      if (!body.termsAccepted || !body.privacyAccepted) return json(400, { error: "CONSENT_REQUIRED" });
      if (!validUsername(username)) return json(400, { error: "USERNAME_INVALID" });
      if (!validEmail(email)) return json(400, { error: "EMAIL_INVALID" });
      if (!validPassword(body.password) || body.password !== body.passwordConfirmation) return json(400, { error: "PASSWORD_INVALID" });
      if (db.usernameExists(username) || db.emailExists(email)) return json(409, { error: "ACCOUNT_UNAVAILABLE" });
      const passwordHash = await hashPassword(body.password, config.bcryptRounds), user = db.createUser({ username, email, displayName, passwordHash });
      const token = randomToken(), csrf = randomToken(24), session = db.createSession(user.id, token, csrf, { hours: config.sessionHours, ip, userAgent: context.request.headers.get("user-agent") });
      return json(201, { user: publicUser(db, user.id), csrfToken: csrf, expiresAt: session.expiresAt }, responseCookies(config, token, csrf, config.sessionHours * 3600));
    }),
    route("POST", /^\/auth\/login$/, async (context) => {
      const body = await bodyOf(context.request), identity = String(body.identity || "").trim().slice(0, 160), ip = ipOf(context.request), key = `login:${ip}:${tokenHash(identity.toLowerCase())}`;
      if (!limiter.allow(key, 12, 15 * 60000)) return json(429, { error: "TOO_MANY_ATTEMPTS" });
      if (db.failedLoginCount(identity, ip, new Date(Date.now() - 15 * 60000).toISOString()) >= 8) return json(429, { error: "ACCOUNT_TEMPORARILY_LOCKED" });
      const user = db.findUserByIdentity(identity), valid = user && user.status === "ACTIVE" && await verifyPassword(body.password || "", user.password_hash);
      db.recordLogin(identity, ip, Boolean(valid));
      if (!valid) return json(401, { error: "INVALID_CREDENTIALS", message: "Credenciais inválidas." });
      limiter.clear(key); db.markLogin(user.id);
      const token = randomToken(), csrf = randomToken(24), hours = body.remember ? Math.min(168, config.sessionHours * 7) : config.sessionHours, session = db.createSession(user.id, token, csrf, { hours, ip, userAgent: context.request.headers.get("user-agent") });
      return json(200, { user: publicUser(db, user.id), csrfToken: csrf, expiresAt: session.expiresAt }, responseCookies(config, token, csrf, hours * 3600));
    }),
    route("POST", /^\/auth\/logout$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); db.revokeSession(auth.token); return json(200, { ok: true }, responseCookies(config, "", "", 0)); }),
    route("POST", /^\/auth\/refresh$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const token = randomToken(), csrf = randomToken(24), expiresAt = db.rotateSession(auth.session.id, token, csrf, config.sessionHours); return json(200, { csrfToken: csrf, expiresAt }, responseCookies(config, token, csrf, config.sessionHours * 3600)); }),
    route("POST", /^\/auth\/recover$/, async (context) => { const ip = ipOf(context.request); if (!limiter.allow(`recover:${ip}`, 4, 3600000)) return json(429, { error: "RATE_LIMITED" }); await bodyOf(context.request); return json(202, { ok: true, message: "Se a conta existir, as instruções serão enviadas." }); }),

    route("GET", /^\/me$/, async (context) => { const auth = requireAuth(context); return json(200, { user: publicUser(db, auth.user.id), csrfToken: auth.csrf }); }),
    route("PATCH", /^\/me\/profile$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), updated = db.updateProfile(auth.user.id, { displayName: safeText(body.displayName, 40) || undefined, avatar: safeText(body.avatar, 40) || undefined, bio: safeText(body.bio, 240), controlMode: ["AUTO", "MANUAL"].includes(body.controlMode) ? body.controlMode : undefined, beginnerMode: body.beginnerMode, reducedMotion: body.reducedMotion, preferences: typeof body.preferences === "object" && body.preferences ? body.preferences : {} }); return json(200, { user: updated }); }),
    route("PATCH", /^\/me\/password$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), row = db.findUserById(auth.user.id); if (!await verifyPassword(body.currentPassword || "", row.password_hash)) return json(401, { error: "INVALID_CREDENTIALS" }); if (!validPassword(body.newPassword)) return json(400, { error: "PASSWORD_INVALID" }); db.setPassword(auth.user.id, await hashPassword(body.newPassword, config.bcryptRounds)); db.revokeUserSessions(auth.user.id, auth.session.id); return json(200, { ok: true }); }),
    route("PATCH", /^\/me\/tutorial$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), step = Math.min(15, Math.max(0, Number(body.step) || 0)), completed = step >= 15 || Boolean(body.completed); db.run("UPDATE tutorial_progress SET step=?,completed=?,viewed_json=?,updated_at=? WHERE user_id=?", step, completed ? 1 : 0, JSON.stringify(Array.isArray(body.viewed) ? body.viewed.slice(0, 30) : []), nowIso(), auth.user.id); db.run("UPDATE profiles SET tutorial_step=?,tutorial_completed=? WHERE user_id=?", step, completed ? 1 : 0, auth.user.id); return json(200, { step, completed }); }),
    route("POST", /^\/me\/migrate-save$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), version = Math.min(5, Math.max(1, Number(body.saveVersion) || 1)); if (db.get("SELECT 1 ok FROM migrations WHERE user_id=? AND source_version=?", auth.user.id, version)) return json(409, { error: "SAVE_ALREADY_MIGRATED" }); const builds = Array.isArray(body.builds) ? body.builds.slice(0, 50) : [], history = Array.isArray(body.history) ? body.history.slice(0, 200) : [], identifier = /^[a-z0-9][a-z0-9-]{0,47}$/i; let importedBuilds = 0, importedHistory = 0; db.transaction(() => { for (const build of builds) { if (!identifier.test(build.characterId || "") || !identifier.test(build.weaponId || "")) continue; const buildId = crypto.randomUUID(), name = safeText(build.name || "Build legado", 48); db.run("INSERT OR IGNORE INTO builds (id,user_id,name,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?)", buildId, auth.user.id, name, JSON.stringify({ characterId: build.characterId, weaponId: build.weaponId, abilities: build.abilities || {}, perks: Array.isArray(build.perks) ? build.perks.slice(0, 4) : [] }), nowIso(), nowIso()); importedBuilds += 1; } for (const battle of history) { const duration = Math.min(600, Math.max(0, Number(battle.duration) || 0)); db.run("INSERT INTO battle_history (id,user_id,mode,won,duration,manual,seed,reward_xp,reward_credits,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", crypto.randomUUID(), auth.user.id, safeText(battle.mode || "legacy", 24), battle.winner === "player" ? 1 : 0, duration, 0, safeText(battle.seed, 32), 0, 0, nowIso()); importedHistory += 1; } db.run("INSERT INTO migrations (id,user_id,source_version,summary_json,created_at) VALUES (?,?,?,?,?)", crypto.randomUUID(), auth.user.id, version, JSON.stringify({ importedBuilds, importedHistory }), nowIso()); }); return json(201, { importedBuilds, importedHistory, ignoredAuthorityFields: ["credits", "xp", "role", "wallet"] }); }),

    route("GET", /^\/inventory$/, async (context) => { const auth = requireAuth(context); return json(200, { items: db.inventory(auth.user.id), allContent: db.owns(auth.user.id, "entitlement", "all-content") }); }),
    route("GET", /^\/progression$/, async (context) => { const auth = requireAuth(context), user = db.getUserFull(auth.user.id); return json(200, { ...user.profile, nextLevelXp: levelRequirement(user.profile.level), history: db.xpTransactions(auth.user.id) }); }),
    route("GET", /^\/wallet$/, async (context) => { const auth = requireAuth(context); return json(200, { wallet: db.getUserFull(auth.user.id).wallet }); }),
    route("GET", /^\/transactions$/, async (context) => { const auth = requireAuth(context); return json(200, { transactions: db.transactions(auth.user.id) }); }),
    route("GET", /^\/shop$/, async (context) => { const auth = requireAuth(context), user = db.getUserFull(auth.user.id), owned = new Set(db.inventory(auth.user.id).map((item) => `${item.type}:${item.itemId}`)); return json(200, { items: SHOP_ITEMS.map((item) => ({ ...item, owned: user.role === "ADMIN" || owned.has(`${item.type}:${item.itemId}`), available: user.profile.level >= item.requiredLevel })) }); }),
    route("POST", /^\/shop\/purchase$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), item = SHOP_ITEMS.find((entry) => entry.id === body.shopItemId); if (!item) return json(404, { error: "SHOP_ITEM_NOT_FOUND" }); if (auth.user.profile.level < item.requiredLevel && auth.user.role !== "ADMIN") return json(403, { error: "LEVEL_REQUIRED" }); try { const result = db.purchaseItem(auth.user.id, item); return json(201, { purchase: result, item }); } catch (error) { return json(error.message === "INSUFFICIENT_FUNDS" ? 409 : 400, { error: error.message }); } }),

    route("GET", /^\/banners$/, async (context) => { const auth = requireAuth(context); return json(200, { banners: BANNERS.filter((banner) => banner.enabled).map((banner) => ({ ...banner, pool: undefined, pity: db.pity(auth.user.id, banner.id) })) }); }),
    route("GET", /^\/banners\/(?<id>[a-z0-9-]+)$/, async (context) => { const auth = requireAuth(context), banner = BANNERS.find((entry) => entry.id === context.params.id && entry.enabled); return banner ? json(200, { banner, pity: db.pity(auth.user.id, banner.id), history: db.pulls(auth.user.id, 20).filter((pull) => pull.bannerId === banner.id) }) : json(404, { error: "BANNER_NOT_FOUND" }); }),
    route("POST", /^\/banners\/(?<id>[a-z0-9-]+)\/pull$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const banner = BANNERS.find((entry) => entry.id === context.params.id && entry.enabled), body = await bodyOf(context.request), count = Number(body.count); if (!banner) return json(404, { error: "BANNER_NOT_FOUND" }); if (![1, 10].includes(count)) return json(400, { error: "PULL_COUNT_INVALID" }); const prior = db.pity(auth.user.id, banner.id); if (banner.maxPulls && prior.pulls + count > banner.maxPulls) return json(409, { error: "BANNER_PULL_LIMIT" }); const rewards = []; let sinceHigh = Number(prior.sinceHigh); for (let index = 0; index < count; index += 1) { let pool = banner.pool, hard = sinceHigh + 1 >= banner.pityRules.hard, soft = sinceHigh + 1 >= banner.pityRules.soft && crypto.randomInt(100) < 25; if (hard || soft) pool = pool.filter((item) => rarityAtLeast(item.rarity, "legendary")); let reward = pickWeighted(pool.length ? pool : banner.pool); if (count === 10 && index === 9 && !rewards.some((item) => rarityAtLeast(item.rarity, "rare"))) reward = pickWeighted(banner.pool.filter((item) => rarityAtLeast(item.rarity, "rare"))); if (banner.guaranteeRules.firstTenCharacter && prior.pulls < 10 && count === 10 && index === 9 && !rewards.some((item) => item.type === "character")) reward = pickWeighted(banner.pool.filter((item) => item.type === "character")); rewards.push(reward); sinceHigh = rarityAtLeast(reward.rarity, "legendary") ? 0 : sinceHigh + 1; } try { return json(201, db.performGacha(auth.user.id, banner, rewards)); } catch (error) { return json(409, { error: error.message }); } }),
    route("GET", /^\/gacha\/history$/, async (context) => { const auth = requireAuth(context); return json(200, { pulls: db.pulls(auth.user.id) }); }),
    route("GET", /^\/gacha\/pity$/, async (context) => { const auth = requireAuth(context); return json(200, { pity: BANNERS.map((banner) => ({ ...db.pity(auth.user.id, banner.id), rules: banner.pityRules })) }); }),

    route("POST", /^\/battles\/complete$/, async (context) => { const auth = requireAuth(context); requireCsrf(context); const body = await bodyOf(context.request), duration = Math.min(600, Math.max(0, Number(body.duration) || 0)), won = Boolean(body.won), manual = body.controlMode === "MANUAL", valid = duration >= 5 && /^[A-Za-z0-9_-]{0,32}$/.test(String(body.seed || "")); if (!valid) return json(422, { error: "BATTLE_INVALID" }); const repeats = Number(db.get("SELECT COUNT(*) count FROM battle_history WHERE user_id=? AND seed=? AND created_at>?", auth.user.id, String(body.seed || ""), new Date(Date.now() - 3600000).toISOString())?.count || 0), reduction = repeats >= 3 ? 0.25 : repeats >= 1 ? 0.6 : 1, credits = Math.round((20 + (won ? 45 : 0) + (manual ? 15 : 0)) * reduction), xp = Math.round((35 + (won ? 55 : 0) + (manual ? 20 : 0)) * reduction), battleId = crypto.randomUUID(); db.run("INSERT INTO battle_history (id,user_id,mode,won,duration,manual,seed,reward_xp,reward_credits,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", battleId, auth.user.id, safeText(body.mode || "orb", 24), won ? 1 : 0, duration, manual ? 1 : 0, safeText(body.seed, 32), xp, credits, nowIso()); db.run("UPDATE profiles SET battles=battles+1,wins=wins+?,losses=losses+? WHERE user_id=?", won ? 1 : 0, won ? 0 : 1, auth.user.id); const wallet = db.changeCurrency(auth.user.id, "credits", credits, "BATTLE_REWARD", { battleId }), progression = db.addXp(auth.user.id, xp, "BATTLE_REWARD", { battleId }); return json(201, { battleId, rewards: { credits, xp, reduction }, wallet, progression }); }),

    route("GET", /^\/admin\/users$/, async (context) => { requireAdmin(context); const q = context.url.searchParams; return json(200, { users: db.users({ search: safeText(q.get("search"), 80), role: ["PLAYER", "ADMIN"].includes(q.get("role")) ? q.get("role") : "", status: ["ACTIVE", "SUSPENDED"].includes(q.get("status")) ? q.get("status") : "", sort: q.get("sort"), direction: q.get("direction"), limit: Math.min(100, Math.max(1, Number(q.get("limit")) || 50)), offset: Math.max(0, Number(q.get("offset")) || 0) }) }); }),
    route("GET", /^\/admin\/users\/(?<id>[a-f0-9-]+)$/, async (context) => { requireAdmin(context); const user = db.getUserFull(context.params.id); return user ? json(200, { user, inventory: db.inventory(user.id), transactions: db.transactions(user.id), pulls: db.pulls(user.id), auditLogs: db.all("SELECT * FROM admin_audit_logs WHERE affected_user_id=? ORDER BY created_at DESC LIMIT 50", user.id) }) : json(404, { error: "USER_NOT_FOUND" }); }),
    route("PATCH", /^\/admin\/users\/(?<id>[a-f0-9-]+)$/, async (context) => { const body = await bodyOf(context.request), result = await adminMutation(context, "USER_PROFILE_UPDATED", context.params.id, async (auth, before) => { if (!before) throw Object.assign(new Error("USER_NOT_FOUND"), { status: 404 }); const username = body.username === undefined ? before.username : normalizeUsername(body.username), email = body.email === undefined ? before.email : normalizeEmail(body.email); if (!validUsername(username) || !validEmail(email) || db.usernameExists(username, before.id) || db.emailExists(email, before.id)) throw Object.assign(new Error("ACCOUNT_FIELDS_INVALID"), { status: 400 }); if (before.id === auth.user.id && (body.role === "PLAYER" || body.status === "SUSPENDED")) throw Object.assign(new Error("DANGEROUS_SELF_EDIT"), { status: 400 }); if (before.role === "ADMIN" && body.role === "PLAYER" && Number(db.get("SELECT COUNT(*) count FROM users WHERE role='ADMIN' AND status='ACTIVE'")?.count) <= 1) throw Object.assign(new Error("LAST_ADMIN_PROTECTED"), { status: 409 }); db.run("UPDATE users SET username=?,email=?,role=?,status=?,updated_at=? WHERE id=?", username, email, ["PLAYER", "ADMIN"].includes(body.role) ? body.role : before.role, ["ACTIVE", "SUSPENDED"].includes(body.status) ? body.status : before.status, nowIso(), before.id); db.run("UPDATE profiles SET display_name=?,avatar=?,bio=?,level=?,xp=?,tutorial_step=?,tutorial_completed=? WHERE user_id=?", safeText(body.displayName ?? before.profile.displayName, 40), safeText(body.avatar ?? before.profile.avatar, 40), safeText(body.bio ?? before.profile.bio, 240), Math.min(100, Math.max(1, Number(body.level ?? before.profile.level))), Math.max(0, Number(body.xp ?? before.profile.xp)), Math.min(15, Math.max(0, Number(body.tutorialStep ?? before.profile.tutorialStep))), body.tutorialCompleted === undefined ? Number(before.profile.tutorialCompleted) : Number(Boolean(body.tutorialCompleted)), before.id); return db.getUserFull(before.id); }); return json(200, { user: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/grant$/, async (context) => { const body = await bodyOf(context.request), result = await adminMutation(context, "ITEM_GRANTED", context.params.id, async () => { const type = safeText(body.type, 32), itemId = safeText(body.itemId, 48); if (!type || !itemId) throw Object.assign(new Error("ITEM_INVALID"), { status: 400 }); db.grantItem(context.params.id, type, itemId); return { type, itemId }; }); return json(201, { grant: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/revoke$/, async (context) => { const body = await bodyOf(context.request), result = await adminMutation(context, "ITEM_REVOKED", context.params.id, async () => { db.revokeItem(context.params.id, safeText(body.type, 32), safeText(body.itemId, 48)); return { ok: true }; }); return json(200, result); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/credits$/, async (context) => { const body = await bodyOf(context.request); const result = await adminMutation(context, "CREDITS_CHANGED", context.params.id, async () => { const wallet = db.getUserFull(context.params.id)?.wallet; if (!wallet) throw Object.assign(new Error("USER_NOT_FOUND"), { status: 404 }); const amount = body.mode === "set" ? Math.trunc(Number(body.amount)) - Number(wallet.credits || 0) : Math.trunc(Number(body.amount)); if (!Number.isInteger(amount) || amount === 0) throw Object.assign(new Error("AMOUNT_INVALID"), { status: 400 }); return db.changeCurrency(context.params.id, "credits", amount, "ADMIN_ADJUSTMENT", { mode: body.mode || "add" }); }); return json(200, { transaction: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/xp$/, async (context) => { const body = await bodyOf(context.request), amount = Math.max(1, Math.trunc(Number(body.amount))); const result = await adminMutation(context, "XP_CHANGED", context.params.id, async () => db.addXp(context.params.id, amount, "ADMIN_ADJUSTMENT")); return json(200, { progression: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/suspend$/, async (context) => { const result = await adminMutation(context, "ACCOUNT_SUSPENDED", context.params.id, async (auth, before) => { if (before.id === auth.user.id) throw Object.assign(new Error("DANGEROUS_SELF_EDIT"), { status: 400 }); db.run("UPDATE users SET status='SUSPENDED',updated_at=? WHERE id=?", nowIso(), before.id); db.revokeUserSessions(before.id); }); return json(200, { user: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/reactivate$/, async (context) => { const result = await adminMutation(context, "ACCOUNT_REACTIVATED", context.params.id, async () => { db.run("UPDATE users SET status='ACTIVE',updated_at=? WHERE id=?", nowIso(), context.params.id); }); return json(200, { user: result }); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/reset-password$/, async (context) => { const body = await bodyOf(context.request); const result = await adminMutation(context, "PASSWORD_RESET_BY_ADMIN", context.params.id, async () => { if (!validPassword(body.temporaryPassword)) throw Object.assign(new Error("PASSWORD_INVALID"), { status: 400 }); db.setPassword(context.params.id, await hashPassword(body.temporaryPassword, config.bcryptRounds), true); db.revokeUserSessions(context.params.id); return { forcePasswordChange: true }; }); return json(200, result); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/inventory\/all$/, async (context) => { const result = await adminMutation(context, "ALL_CONTENT_GRANTED", context.params.id, async () => { db.grantItem(context.params.id, "entitlement", "all-content", "ADMIN"); return { allContent: true }; }); return json(200, result); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/inventory\/reset$/, async (context) => { const body = await bodyOf(context.request); const result = await adminMutation(context, "INVENTORY_RESET", context.params.id, async () => { db.transaction(() => { db.run("DELETE FROM inventory_items WHERE user_id=?", context.params.id); if (body.toStarter !== false) for (const [type, items] of Object.entries(STARTER_CATALOG)) for (const itemId of items) db.grantItem(context.params.id, type, itemId, "ADMIN_STARTER_RESET"); }); return { starterRestored: body.toStarter !== false }; }); return json(200, result); }),
    route("POST", /^\/admin\/users\/(?<id>[a-f0-9-]+)\/force-logout$/, async (context) => { await adminMutation(context, "FORCE_LOGOUT", context.params.id, async (auth) => { db.revokeUserSessions(context.params.id, context.params.id === auth.user.id ? auth.session.id : ""); return { ok: true }; }); return json(200, { ok: true }); }),
    route("GET", /^\/admin\/audit-logs$/, async (context) => { requireAdmin(context); return json(200, { auditLogs: db.auditLogs() }); })
  ];

  const fetch = async (request) => {
    const url = new URL(request.url), headers = corsHeaders(config, request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const found = matchRoute(routes, request.method, url.pathname);
    if (!found) return json(404, { error: "NOT_FOUND" }, headers);
    try {
      const response = await found.handler({ request, url, params: found.params, auth: null });
      const merged = new Headers(response.headers); for (const [key, value] of Object.entries(headers)) merged.set(key, value);
      merged.set("x-content-type-options", "nosniff"); merged.set("referrer-policy", "no-referrer"); merged.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
      return new Response(response.body, { status: response.status, headers: merged });
    } catch (error) {
      const status = error.status || ({ INVALID_JSON: 400, PAYLOAD_TOO_LARGE: 413, AUTH_REQUIRED: 401, FORBIDDEN: 403, CSRF_INVALID: 403 }[error.message] || 500);
      if (status >= 500 && !config.testMode) console.error("ORB API error", { type: error.name, code: error.message, path: url.pathname });
      return json(status, { error: status >= 500 ? "INTERNAL_ERROR" : error.message }, headers);
    }
  };
  return { fetch, db, seedAdmin: () => seedAdministrator(db, config), close: () => db.close() };
}
