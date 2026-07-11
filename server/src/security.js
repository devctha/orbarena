import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const nowIso = () => new Date().toISOString();
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const tokenHash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
export const hashPassword = (password, rounds = 12) => bcrypt.hash(String(password), rounds);
export const verifyPassword = (password, hash) => bcrypt.compare(String(password), String(hash));
export const normalizeUsername = (value) => String(value || "").trim();
export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
export const safeText = (value, max = 120) => String(value || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);
export const validUsername = (value) => /^[A-Za-z0-9_]{3,24}$/.test(String(value || ""));
export const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")) && String(value).length <= 160;
export const validPassword = (value) => typeof value === "string" && value.length >= 10 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
export const json = (status, body, headers = {}) => {
  const output = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  if (headers instanceof Headers) {
    headers.forEach((value, key) => { if (key !== "set-cookie") output.append(key, value); });
    const setCookies = headers.getSetCookie?.() || []; for (const value of setCookies) output.append("set-cookie", value);
  } else for (const [key, value] of Object.entries(headers)) output.set(key, value);
  return new Response(JSON.stringify(body), { status, headers: output });
};

export function parseCookies(header = "") {
  return Object.fromEntries(String(header).split(";").map((part) => part.trim().split("=")).filter(([key]) => key).map(([key, ...rest]) => [key, decodeURIComponent(rest.join("="))]));
}

export function cookie(name, value, { maxAge, httpOnly = true, secure = false, sameSite = "Lax", path = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join("; ");
}

export class SlidingWindowLimiter {
  constructor() { this.buckets = new Map(); }
  allow(key, limit, windowMs) {
    const now = Date.now();
    const recent = (this.buckets.get(key) || []).filter((time) => now - time < windowMs);
    recent.push(now); this.buckets.set(key, recent);
    return recent.length <= limit;
  }
  clear(key) { this.buckets.delete(key); }
}
