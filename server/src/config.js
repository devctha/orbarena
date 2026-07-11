import path from "node:path";

const number = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function createConfig(overrides = {}) {
  const cwd = overrides.cwd || process.cwd();
  return Object.freeze({
    host: overrides.host || process.env.HOST || "127.0.0.1",
    port: number(overrides.port ?? process.env.PORT, 8788, 1, 65535),
    databasePath: overrides.databasePath || process.env.DATABASE_PATH || path.join(cwd, ".data", "orb-arena.sqlite"),
    origin: overrides.origin || process.env.APP_ORIGIN || "http://127.0.0.1:8080",
    cookieSecure: overrides.cookieSecure ?? process.env.COOKIE_SECURE === "true",
    sessionHours: number(overrides.sessionHours ?? process.env.SESSION_HOURS, 12, 1, 168),
    bcryptRounds: number(overrides.bcryptRounds ?? process.env.BCRYPT_ROUNDS, 12, 10, 14),
    adminUsername: overrides.adminUsername || process.env.ADMIN_USERNAME || "DukeAdmin",
    adminInitialPassword: overrides.adminInitialPassword ?? process.env.ADMIN_INITIAL_PASSWORD ?? "",
    testMode: Boolean(overrides.testMode)
  });
}

