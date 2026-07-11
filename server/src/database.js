import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./schema.js";
import { STARTER_CATALOG, levelRequirement } from "./catalog.js";
import { nowIso, tokenHash } from "./security.js";

const id = () => crypto.randomUUID();
const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const bool = (value) => Boolean(Number(value));

export class OrbDatabase {
  constructor(filename) {
    if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.sqlite = new DatabaseSync(filename);
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    if (filename !== ":memory:") this.sqlite.exec("PRAGMA journal_mode = WAL");
    for (const statement of SCHEMA) this.sqlite.exec(statement);
  }

  close() { this.sqlite.close(); }
  run(sql, ...params) { return this.sqlite.prepare(sql).run(...params); }
  get(sql, ...params) { return this.sqlite.prepare(sql).get(...params); }
  all(sql, ...params) { return this.sqlite.prepare(sql).all(...params); }
  transaction(callback) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try { const value = callback(); this.sqlite.exec("COMMIT"); return value; }
    catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }

  createUser({ username, email, passwordHash, displayName, role = "PLAYER", forcePasswordChange = false }) {
    const userId = id(), at = nowIso(), admin = role === "ADMIN";
    return this.transaction(() => {
      this.run("INSERT INTO users (id,username,email,password_hash,role,force_password_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", userId, username, email, passwordHash, role, forcePasswordChange ? 1 : 0, at, at);
      this.run("INSERT INTO profiles (user_id,display_name,level,xp) VALUES (?,?,?,?)", userId, displayName, admin ? 50 : 1, 0);
      this.run("INSERT INTO user_settings (user_id,control_mode,beginner_mode,updated_at) VALUES (?,?,?,?)", userId, "AUTO", admin ? 0 : 1, at);
      this.run("INSERT INTO wallets (user_id,credits,gems,tickets,infinite_credits,infinite_gacha) VALUES (?,?,?,?,?,?)", userId, admin ? 0 : 1200, admin ? 0 : 45, admin ? 0 : 50, admin ? 1 : 0, admin ? 1 : 0);
      this.run("INSERT INTO tutorial_progress (user_id,updated_at) VALUES (?,?)", userId, at);
      if (admin) this.run("INSERT INTO inventory_items (user_id,item_type,item_id,source,acquired_at) VALUES (?,?,?,?,?)", userId, "entitlement", "all-content", "ADMIN", at);
      else for (const [type, items] of Object.entries(STARTER_CATALOG)) for (const itemId of items) this.run("INSERT INTO inventory_items (user_id,item_type,item_id,source,acquired_at) VALUES (?,?,?,?,?)", userId, type, itemId, "STARTER", at);
      return this.getUserFull(userId);
    });
  }

  findUserByIdentity(identity) { return this.get("SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE", identity, identity); }
  findUserById(userId) { return this.get("SELECT * FROM users WHERE id = ?", userId); }
  usernameExists(username, excluding = "") { return Boolean(this.get("SELECT 1 ok FROM users WHERE username = ? COLLATE NOCASE AND id <> ?", username, excluding)); }
  emailExists(email, excluding = "") { return Boolean(this.get("SELECT 1 ok FROM users WHERE email = ? COLLATE NOCASE AND id <> ?", email, excluding)); }

  getUserFull(userId) {
    const row = this.get(`SELECT u.id,u.username,u.email,u.role,u.status,u.force_password_change,u.created_at,u.updated_at,u.last_login_at,
      p.display_name,p.avatar,p.bio,p.level,p.xp,p.play_time,p.battles,p.wins,p.losses,p.tutorial_step,p.tutorial_completed,
      s.control_mode,s.beginner_mode,s.reduced_motion,s.preferences_json,
      w.credits,w.gems,w.tickets,w.fragments,w.infinite_credits,w.infinite_gacha
      FROM users u JOIN profiles p ON p.user_id=u.id JOIN user_settings s ON s.user_id=u.id JOIN wallets w ON w.user_id=u.id WHERE u.id=?`, userId);
    if (!row) return null;
    return {
      id: row.id, username: row.username, email: row.email, role: row.role, status: row.status,
      forcePasswordChange: bool(row.force_password_change), createdAt: row.created_at, updatedAt: row.updated_at, lastLoginAt: row.last_login_at,
      profile: { displayName: row.display_name, avatar: row.avatar, bio: row.bio, level: row.level, xp: row.xp, nextLevelXp: levelRequirement(row.level), playTime: row.play_time, battles: row.battles, wins: row.wins, losses: row.losses, tutorialStep: row.tutorial_step, tutorialCompleted: bool(row.tutorial_completed) },
      settings: { controlMode: row.control_mode, beginnerMode: bool(row.beginner_mode), reducedMotion: bool(row.reduced_motion), ...parse(row.preferences_json, {}) },
      wallet: { credits: row.infinite_credits ? null : row.credits, gems: row.infinite_gacha ? null : row.gems, tickets: row.infinite_gacha ? null : row.tickets, fragments: row.fragments, hasInfiniteCredits: bool(row.infinite_credits), hasInfiniteGacha: bool(row.infinite_gacha) }
    };
  }

  createSession(userId, rawToken, csrf, { hours, ip, userAgent }) {
    const sessionId = id(), at = nowIso(), expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    this.run("INSERT INTO sessions (id,user_id,token_hash,csrf_hash,created_at,authenticated_at,expires_at,ip,user_agent) VALUES (?,?,?,?,?,?,?,?,?)", sessionId, userId, tokenHash(rawToken), tokenHash(csrf), at, at, expiresAt, ip || null, String(userAgent || "").slice(0, 240));
    return { id: sessionId, expiresAt };
  }

  sessionByToken(rawToken) {
    if (!rawToken) return null;
    return this.get(`SELECT s.*,u.role,u.status,u.force_password_change FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`, tokenHash(rawToken), nowIso());
  }
  revokeSession(rawToken) { if (rawToken) this.run("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL", nowIso(), tokenHash(rawToken)); }
  revokeUserSessions(userId, exceptId = "") { this.run("UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL", nowIso(), userId, exceptId); }
  rotateSession(sessionId, rawToken, csrf, hours) { const expiresAt = new Date(Date.now() + hours * 3600000).toISOString(); this.run("UPDATE sessions SET token_hash=?,csrf_hash=?,expires_at=? WHERE id=?", tokenHash(rawToken), tokenHash(csrf), expiresAt, sessionId); return expiresAt; }

  recordLogin(identity, ip, success) { this.run("INSERT INTO login_attempts (id,identity_hash,ip,success,created_at) VALUES (?,?,?,?,?)", id(), tokenHash(String(identity).toLowerCase()), ip || null, success ? 1 : 0, nowIso()); }
  failedLoginCount(identity, ip, since) { return Number(this.get("SELECT COUNT(*) count FROM login_attempts WHERE identity_hash=? AND COALESCE(ip,'')=COALESCE(?,'') AND success=0 AND created_at>?", tokenHash(String(identity).toLowerCase()), ip || null, since)?.count || 0); }
  markLogin(userId) { this.run("UPDATE users SET last_login_at=?,updated_at=? WHERE id=?", nowIso(), nowIso(), userId); }

  updateProfile(userId, patch) {
    const current = this.getUserFull(userId); if (!current) return null;
    this.run("UPDATE profiles SET display_name=?,avatar=?,bio=? WHERE user_id=?", patch.displayName ?? current.profile.displayName, patch.avatar ?? current.profile.avatar, patch.bio ?? current.profile.bio, userId);
    this.run("UPDATE user_settings SET control_mode=?,beginner_mode=?,reduced_motion=?,preferences_json=?,updated_at=? WHERE user_id=?", patch.controlMode ?? current.settings.controlMode, patch.beginnerMode === undefined ? Number(current.settings.beginnerMode) : Number(Boolean(patch.beginnerMode)), patch.reducedMotion === undefined ? Number(current.settings.reducedMotion) : Number(Boolean(patch.reducedMotion)), JSON.stringify(patch.preferences || {}), nowIso(), userId);
    return this.getUserFull(userId);
  }
  setPassword(userId, passwordHash, forceChange = false) { this.run("UPDATE users SET password_hash=?,force_password_change=?,updated_at=? WHERE id=?", passwordHash, forceChange ? 1 : 0, nowIso(), userId); }

  inventory(userId) { return this.all("SELECT item_type AS type,item_id AS itemId,quantity,source,acquired_at AS acquiredAt FROM inventory_items WHERE user_id=? ORDER BY item_type,item_id", userId); }
  owns(userId, type, itemId) { const user = this.findUserById(userId); return user?.role === "ADMIN" || Boolean(this.get("SELECT 1 ok FROM inventory_items WHERE user_id=? AND ((item_type=? AND item_id=?) OR (item_type='entitlement' AND item_id='all-content'))", userId, type, itemId)); }
  grantItem(userId, type, itemId, source = "ADMIN") { this.run(`INSERT INTO inventory_items (user_id,item_type,item_id,source,acquired_at) VALUES (?,?,?,?,?)
    ON CONFLICT(user_id,item_type,item_id) DO UPDATE SET quantity=inventory_items.quantity+1`, userId, type, itemId, source, nowIso()); }
  revokeItem(userId, type, itemId) { this.run("DELETE FROM inventory_items WHERE user_id=? AND item_type=? AND item_id=?", userId, type, itemId); }

  changeCurrency(userId, currency, amount, source, metadata = {}) {
    if (!new Set(["credits", "gems", "tickets", "fragments"]).has(currency) || !Number.isInteger(amount) || amount === 0) throw new Error("INVALID_CURRENCY_CHANGE");
    return this.transaction(() => {
      const wallet = this.get("SELECT * FROM wallets WHERE user_id=?", userId), infinite = currency === "credits" ? wallet.infinite_credits : (currency === "gems" || currency === "tickets") ? wallet.infinite_gacha : 0;
      const before = Number(wallet[currency]); const after = infinite ? before : before + amount;
      if (after < 0) throw new Error("INSUFFICIENT_FUNDS");
      if (!infinite) this.run(`UPDATE wallets SET ${currency}=? WHERE user_id=?`, after, userId);
      this.run("INSERT INTO currency_transactions (id,user_id,currency,type,amount,balance_before,balance_after,source,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, currency, amount > 0 ? "CREDIT" : "DEBIT", amount, before, after, source, JSON.stringify(metadata), nowIso());
      return { before, after, infinite: bool(infinite) };
    });
  }

  purchaseItem(userId, item) {
    return this.transaction(() => {
      if (this.owns(userId, item.type, item.itemId)) throw new Error("ALREADY_OWNED");
      const wallet = this.get("SELECT * FROM wallets WHERE user_id=?", userId), before = Number(wallet.credits), infinite = bool(wallet.infinite_credits), after = infinite ? before : before - item.price;
      if (after < 0) throw new Error("INSUFFICIENT_FUNDS");
      if (!infinite) this.run("UPDATE wallets SET credits=? WHERE user_id=?", after, userId);
      const purchaseId = id(), at = nowIso();
      this.run("INSERT INTO currency_transactions (id,user_id,currency,type,amount,balance_before,balance_after,source,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, "credits", "DEBIT", -item.price, before, after, "SHOP_PURCHASE", JSON.stringify({ shopItemId: item.id }), at);
      this.run("INSERT INTO inventory_items (user_id,item_type,item_id,source,acquired_at) VALUES (?,?,?,?,?)", userId, item.type, item.itemId, "SHOP", at);
      this.run("INSERT INTO purchases (id,user_id,shop_item_id,price,currency,created_at) VALUES (?,?,?,?,?,?)", purchaseId, userId, item.id, item.price, "credits", at);
      return { purchaseId, balance: infinite ? null : after, hasInfiniteCredits: infinite };
    });
  }

  performGacha(userId, banner, rewards) {
    return this.transaction(() => {
      const count = rewards.length, cost = count === 10 ? banner.tenCost : banner.cost, wallet = this.get("SELECT * FROM wallets WHERE user_id=?", userId), infinite = bool(wallet.infinite_gacha), before = Number(wallet[banner.currency]), after = infinite ? before : before - cost;
      if (after < 0) throw new Error("INSUFFICIENT_FUNDS");
      if (!infinite) this.run(`UPDATE wallets SET ${banner.currency}=? WHERE user_id=?`, after, userId);
      this.run("INSERT INTO currency_transactions (id,user_id,currency,type,amount,balance_before,balance_after,source,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, banner.currency, "DEBIT", -cost, before, after, "GACHA_PULL", JSON.stringify({ bannerId: banner.id, count }), nowIso());
      const compensationByRarity = { common: 40, uncommon: 70, rare: 150, epic: 350, legendary: 900, mythic: 2000 }, output = [];
      let pity = this.pity(userId, banner.id), pullIndex = Number(pity.pulls);
      for (const reward of rewards) {
        pullIndex += 1;
        const duplicate = this.owns(userId, reward.type, reward.id), compensation = duplicate ? compensationByRarity[reward.rarity] || 40 : 0, high = ["legendary", "mythic"].includes(reward.rarity);
        if (duplicate) {
          const creditWallet = this.get("SELECT credits,infinite_credits FROM wallets WHERE user_id=?", userId), creditBefore = Number(creditWallet.credits), creditAfter = creditBefore + compensation;
          if (!creditWallet.infinite_credits) this.run("UPDATE wallets SET credits=? WHERE user_id=?", creditAfter, userId);
          this.run("INSERT INTO currency_transactions (id,user_id,currency,type,amount,balance_before,balance_after,source,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, "credits", "CREDIT", compensation, creditBefore, creditAfter, "GACHA_DUPLICATE", JSON.stringify({ bannerId: banner.id, itemId: reward.id }), nowIso());
        } else this.run("INSERT INTO inventory_items (user_id,item_type,item_id,source,acquired_at) VALUES (?,?,?,?,?)", userId, reward.type, reward.id, `GACHA:${banner.id}`, nowIso());
        this.run("INSERT INTO gacha_pulls (id,user_id,banner_id,item_type,item_id,rarity,duplicate,compensation,pull_index,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, banner.id, reward.type, reward.id, reward.rarity, duplicate ? 1 : 0, compensation, pullIndex, nowIso());
        pity = { ...pity, pulls: pullIndex, sinceHigh: high ? 0 : Number(pity.sinceHigh) + 1 };
        output.push({ ...reward, duplicate, compensation, pullIndex });
      }
      this.run(`INSERT INTO gacha_pity (user_id,banner_id,pulls,since_high,updated_at) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id,banner_id) DO UPDATE SET pulls=excluded.pulls,since_high=excluded.since_high,updated_at=excluded.updated_at`, userId, banner.id, pity.pulls, pity.sinceHigh, nowIso());
      return { rewards: output, balance: infinite ? null : after, pity, cost, currency: banner.currency };
    });
  }

  addXp(userId, amount, source, metadata = {}) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_XP");
    return this.transaction(() => {
      const profile = this.get("SELECT xp,level FROM profiles WHERE user_id=?", userId), beforeXp = Number(profile.xp), beforeLevel = Number(profile.level), afterXp = beforeXp + amount;
      let level = beforeLevel; while (afterXp >= levelRequirement(level) && level < 100) level += 1;
      this.run("UPDATE profiles SET xp=?,level=? WHERE user_id=?", afterXp, level, userId);
      this.run("INSERT INTO xp_transactions (id,user_id,amount,xp_before,xp_after,level_before,level_after,source,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, amount, beforeXp, afterXp, beforeLevel, level, source, JSON.stringify(metadata), nowIso());
      return { xpBefore: beforeXp, xpAfter: afterXp, levelBefore: beforeLevel, levelAfter: level };
    });
  }

  transactions(userId, limit = 50) { return this.all("SELECT id,currency,type,amount,balance_before AS balanceBefore,balance_after AS balanceAfter,source,metadata_json AS metadata,created_at AS createdAt FROM currency_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit).map((row) => ({ ...row, metadata: parse(row.metadata, {}) })); }
  xpTransactions(userId, limit = 25) { return this.all("SELECT * FROM xp_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit); }
  pulls(userId, limit = 100) { return this.all("SELECT id,banner_id AS bannerId,item_type AS type,item_id AS itemId,rarity,duplicate,compensation,pull_index AS pullIndex,created_at AS createdAt FROM gacha_pulls WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit).map((row) => ({ ...row, duplicate: bool(row.duplicate) })); }
  pity(userId, bannerId) { return this.get("SELECT banner_id AS bannerId,pulls,since_high AS sinceHigh,guarantee_featured AS guaranteeFeatured,updated_at AS updatedAt FROM gacha_pity WHERE user_id=? AND banner_id=?", userId, bannerId) || { bannerId, pulls: 0, sinceHigh: 0, guaranteeFeatured: 0, updatedAt: null }; }

  recordPull(userId, bannerId, reward, duplicate, compensation, index, highRarity) {
    this.run("INSERT INTO gacha_pulls (id,user_id,banner_id,item_type,item_id,rarity,duplicate,compensation,pull_index,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, bannerId, reward.type, reward.id, reward.rarity, duplicate ? 1 : 0, compensation, index, nowIso());
    this.run(`INSERT INTO gacha_pity (user_id,banner_id,pulls,since_high,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id,banner_id) DO UPDATE SET pulls=gacha_pity.pulls+1,since_high=?,updated_at=?`, userId, bannerId, 1, highRarity ? 0 : 1, nowIso(), highRarity ? 0 : this.pity(userId, bannerId).sinceHigh + 1, nowIso());
  }

  users({ search = "", role = "", status = "", sort = "created_at", direction = "DESC", limit = 50, offset = 0 }) {
    const sortMap = { username: "u.username", level: "p.level", credits: "w.credits", created_at: "u.created_at", last_login_at: "u.last_login_at" }, column = sortMap[sort] || sortMap.created_at, dir = direction === "ASC" ? "ASC" : "DESC", pattern = `%${search}%`;
    return this.all(`SELECT u.id,u.username,u.email,u.role,u.status,u.created_at AS createdAt,u.last_login_at AS lastLoginAt,p.display_name AS displayName,p.level,p.xp,w.credits,w.infinite_credits AS infiniteCredits
      FROM users u JOIN profiles p ON p.user_id=u.id JOIN wallets w ON w.user_id=u.id
      WHERE (u.username LIKE ? OR u.email LIKE ? OR p.display_name LIKE ?) AND (?='' OR u.role=?) AND (?='' OR u.status=?) ORDER BY ${column} ${dir} LIMIT ? OFFSET ?`, pattern, pattern, pattern, role, role, status, status, limit, offset).map((row) => ({ ...row, infiniteCredits: bool(row.infiniteCredits) }));
  }

  audit(adminUserId, affectedUserId, action, before, after, reason, ip) { this.run("INSERT INTO admin_audit_logs (id,admin_user_id,affected_user_id,action,before_json,after_json,reason,ip,created_at) VALUES (?,?,?,?,?,?,?,?,?)", id(), adminUserId, affectedUserId || null, action, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, reason || null, ip || null, nowIso()); }
  auditLogs(limit = 100) { return this.all("SELECT id,admin_user_id AS adminUserId,affected_user_id AS affectedUserId,action,before_json AS beforeJson,after_json AS afterJson,reason,ip,created_at AS createdAt FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?", limit); }
}
