import test from "node:test";
import assert from "node:assert/strict";
import { createConfig } from "../src/config.js";
import { createOrbApp } from "../src/app.js";
import { verifyPassword } from "../src/security.js";

const PASSWORD = "TestPilot42";
const ADMIN_PASSWORD = "AdminTest42";

class TestClient {
  constructor(app) { this.app = app; this.cookies = new Map(); this.csrf = null; }
  async request(path, { method = "GET", body, headers = {} } = {}) {
    const requestHeaders = new Headers({ origin: "http://test", ...headers });
    if (this.cookies.size) requestHeaders.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    if (body !== undefined) requestHeaders.set("content-type", "application/json");
    if (this.csrf && method !== "GET") requestHeaders.set("x-csrf-token", this.csrf);
    const response = await this.app.fetch(new Request(`http://test${path}`, { method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body) }));
    const setCookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
    for (const value of setCookies.flatMap((entry) => String(entry).split(/,(?=\s*orb_)/))) { const [pair] = value.split(";"), [key, cookieValue] = pair.trim().split("="); this.cookies.set(key, decodeURIComponent(cookieValue || "")); }
    const payload = await response.json(); if (payload.csrfToken) this.csrf = payload.csrfToken;
    return { status: response.status, payload };
  }
}

const setup = async () => {
  const app = createOrbApp(createConfig({ databasePath: ":memory:", testMode: true, bcryptRounds: 10, origin: "http://test", adminUsername: "TestAdmin", adminInitialPassword: ADMIN_PASSWORD }));
  await app.seedAdmin(); return app;
};

test("cadastro cria perfil, wallet, starter roster e hash bcrypt", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    const result = await client.request("/auth/register", { method: "POST", body: { username: "PilotOne", displayName: "Pilot One", email: "pilot@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    assert.equal(result.status, 201); assert.equal(result.payload.user.profile.level, 1); assert.equal(result.payload.user.settings.controlMode, "AUTO"); assert.equal(result.payload.user.wallet.credits, 1200);
    const stored = app.db.findUserByIdentity("PilotOne"); assert.notEqual(stored.password_hash, PASSWORD); assert.equal(await verifyPassword(PASSWORD, stored.password_hash), true);
    const inventory = await client.request("/inventory"); assert.equal(inventory.payload.items.length, 31); assert(inventory.payload.items.some((item) => item.itemId === "echo"));
  } finally { app.close(); }
});

test("login, sessão, CSRF, atualização de perfil e logout", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    await client.request("/auth/register", { method: "POST", body: { username: "PilotTwo", displayName: "Pilot Two", email: "two@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    const profile = await client.request("/me/profile", { method: "PATCH", body: { displayName: "Nova Pilota", controlMode: "MANUAL", beginnerMode: false } }); assert.equal(profile.status, 200); assert.equal(profile.payload.user.settings.controlMode, "MANUAL");
    const attacker = new TestClient(app); attacker.cookies = new Map(client.cookies); const blocked = await attacker.request("/me/profile", { method: "PATCH", body: { displayName: "Ataque" } }); assert.equal(blocked.status, 403); assert.equal(blocked.payload.error, "CSRF_INVALID");
    const logout = await client.request("/auth/logout", { method: "POST", body: {} }); assert.equal(logout.status, 200); assert.equal((await client.request("/me")).status, 401);
    const login = await client.request("/auth/login", { method: "POST", body: { identity: "two@example.test", password: PASSWORD } }); assert.equal(login.status, 200);
  } finally { app.close(); }
});

test("economia, loja, batalha, XP e transações são calculados no servidor", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    await client.request("/auth/register", { method: "POST", body: { username: "Economy", displayName: "Economy", email: "economy@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    const purchase = await client.request("/shop/purchase", { method: "POST", body: { shopItemId: "ability-kinetic-spark", price: 1 } }); assert.equal(purchase.status, 201); assert.equal(purchase.payload.purchase.balance, 600);
    const duplicate = await client.request("/shop/purchase", { method: "POST", body: { shopItemId: "ability-kinetic-spark" } }); assert.equal(duplicate.status, 400); assert.equal(duplicate.payload.error, "ALREADY_OWNED");
    const battle = await client.request("/battles/complete", { method: "POST", body: { mode: "orb", won: true, duration: 48, controlMode: "MANUAL", seed: "TEST-SEED" } }); assert.equal(battle.status, 201); assert(battle.payload.rewards.xp > 0); assert(battle.payload.rewards.credits > 0);
    const progression = await client.request("/progression"); assert(progression.payload.xp > 0); const transactions = await client.request("/transactions"); assert(transactions.payload.transactions.some((entry) => entry.source === "SHOP_PURCHASE"));
  } finally { app.close(); }
});

test("gacha decide no servidor, aplica pity, duplicatas e histórico", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    await client.request("/auth/register", { method: "POST", body: { username: "GachaPilot", displayName: "Gacha", email: "gacha@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    const pull = await client.request("/banners/beginner-signal/pull", { method: "POST", body: { count: 10, forcedReward: "singularity" } }); assert.equal(pull.status, 201); assert.equal(pull.payload.rewards.length, 10); assert(pull.payload.rewards.some((reward) => reward.type === "character")); assert(pull.payload.rewards.some((reward) => ["rare", "epic", "legendary", "mythic"].includes(reward.rarity)));
    const history = await client.request("/gacha/history"); assert.equal(history.payload.pulls.length, 10); const pity = await client.request("/gacha/pity"); assert.equal(pity.payload.pity.find((item) => item.bannerId === "beginner-signal").pulls, 10);
  } finally { app.close(); }
});

test("ADMIN é idempotente, infinito por flag, protegido e auditado", async () => {
  const app = await setup(), admin = new TestClient(app), player = new TestClient(app);
  try {
    const secondSeed = await app.seedAdmin(); assert.equal(secondSeed.seeded, false); assert.equal(secondSeed.reason, "ALREADY_EXISTS");
    const login = await admin.request("/auth/login", { method: "POST", body: { identity: "TestAdmin", password: ADMIN_PASSWORD } }); assert.equal(login.status, 200); assert.equal(login.payload.user.wallet.hasInfiniteCredits, true); assert.equal(login.payload.user.wallet.credits, null);
    await player.request("/auth/register", { method: "POST", body: { username: "Managed", displayName: "Managed", email: "managed@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    const targetId = player.payload?.user?.id || app.db.findUserByIdentity("Managed").id;
    const forbidden = await player.request("/admin/users"); assert.equal(forbidden.status, 403);
    const granted = await admin.request(`/admin/users/${targetId}/grant`, { method: "POST", headers: { "x-admin-confirm": "CONFIRM", "x-admin-reason": "Teste automatizado" }, body: { type: "weapon", itemId: "audit-blade" } }); assert.equal(granted.status, 201);
    const detail = await admin.request(`/admin/users/${targetId}`); assert(detail.payload.inventory.some((item) => item.itemId === "audit-blade")); assert(detail.payload.auditLogs.some((log) => log.action === "ITEM_GRANTED"));
    const selfSuspend = await admin.request(`/admin/users/${login.payload.user.id}/suspend`, { method: "POST", headers: { "x-admin-confirm": "CONFIRM", "x-admin-reason": "Teste" }, body: {} }); assert.equal(selfSuspend.status, 400); assert.equal(selfSuspend.payload.error, "DANGEROUS_SELF_EDIT");
  } finally { app.close(); }
});

test("migração limita campos de autoridade e é idempotente", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    await client.request("/auth/register", { method: "POST", body: { username: "Legacy", displayName: "Legacy", email: "legacy@example.test", password: PASSWORD, passwordConfirmation: PASSWORD, termsAccepted: true, privacyAccepted: true } });
    const save = { saveVersion: 5, credits: 99999999, xp: 99999999, role: "ADMIN", builds: [{ name: "Legado", characterId: "echo", weaponId: "arc-cannon", perks: ["second-wind"] }], history: [{ mode: "duel", winner: "player", duration: 42, seed: "LEGACY" }] };
    const migrated = await client.request("/me/migrate-save", { method: "POST", body: save }); assert.equal(migrated.status, 201); assert.deepEqual(migrated.payload.ignoredAuthorityFields, ["credits", "xp", "role", "wallet"]);
    const me = await client.request("/me"); assert.equal(me.payload.user.role, "PLAYER"); assert.equal(me.payload.user.wallet.credits, 1200); assert.equal((await client.request("/me/migrate-save", { method: "POST", body: save })).status, 409);
  } finally { app.close(); }
});

test("tentativas excessivas bloqueiam temporariamente sem enumerar conta", async () => {
  const app = await setup(), client = new TestClient(app);
  try {
    for (let index = 0; index < 8; index += 1) { const result = await client.request("/auth/login", { method: "POST", body: { identity: "missing", password: "wrong" } }); assert.equal(result.payload.error, "INVALID_CREDENTIALS"); }
    const blocked = await client.request("/auth/login", { method: "POST", body: { identity: "missing", password: "wrong" } }); assert.equal(blocked.status, 429); assert.equal(blocked.payload.error, "ACCOUNT_TEMPORARILY_LOCKED");
  } finally { app.close(); }
});

