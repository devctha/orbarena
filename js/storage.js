(function () {
  "use strict";
  const OA = window.OrbArena;
  const safeArray = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];

  class Storage {
    constructor(key) { this.key = key; this.saveVersion = 3; this.memoryFallback = this.defaults(); this.lastError = null; }
    defaults() {
      return { saveVersion: 3, credits: OA.CREDITS?.creator || "Duke Dandalian", settings: { buildLimit: 50, historyLimit: 200 }, history: [], builds: [], skins: {}, characterStats: {}, powerStats: {}, unlockedPowers: [], unlockedWeapons: [], unlockedPerks: [], unlockedAbilities: [], favorites: { weapons: [], perks: [], abilities: [], battles: [], bestiary: [] }, bestiary: {}, filters: {}, lastBuildId: null, lastScreen: "menu", migrationLog: [] };
    }
    migrate(input) {
      const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      const migrated = { ...this.defaults(), ...source };
      migrated.settings = { ...this.defaults().settings, ...(source.settings || {}) };
      migrated.history = safeArray(source.history).map((entry) => ({ ...entry, id: entry.id || `battle-${entry.endedAt || Date.now()}-${Math.random().toString(36).slice(2, 7)}`, favorite: Boolean(entry.favorite) }));
      migrated.builds = safeArray(source.builds).map((build) => this.normalizeBuild(build));
      migrated.favorites = { ...this.defaults().favorites, ...(source.favorites || {}) };
      migrated.bestiary = source.bestiary && typeof source.bestiary === "object" && !Array.isArray(source.bestiary) ? source.bestiary : {};
      migrated.filters = source.filters && typeof source.filters === "object" ? source.filters : {};
      if ((source.saveVersion || 1) < 3) migrated.migrationLog = [...safeArray(source.migrationLog), { from: source.saveVersion || 1, to: 3, at: new Date().toISOString() }].slice(-10);
      migrated.saveVersion = 3; migrated.credits = "Duke Dandalian";
      return migrated;
    }
    normalizeBuild(build = {}) {
      const now = new Date().toISOString();
      const battles = Math.max(0, Number(build.battles) || 0), wins = Math.max(0, Number(build.wins) || 0), losses = Math.max(0, Number(build.losses) || Math.max(0, battles - wins));
      return { version: 3, systemVersion: OA.VERSION || "0.3.0", id: String(build.id || `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), name: String(build.name || "Build sem nome").slice(0, 48), description: String(build.description || "").slice(0, 240), characterId: build.characterId || "echo", weaponId: build.weaponId || "arc-cannon", abilities: { active: null, secondary: null, passive: null, reactive: null, ultimate: null, ...(build.abilities || {}) }, perks: Array.isArray(build.perks) ? [...new Set(build.perks.filter((id) => typeof id === "string"))].slice(0, 4) : [], modifiers: Array.isArray(build.modifiers) ? build.modifiers.slice(0, 4) : [], skin: build.skin || build.color || "default", physicsPreset: build.physicsPreset || build.preset || "pinball", arenaId: build.arenaId || "classic", powerBudget: Number(build.powerBudget || build.score) || 0, createdAt: build.createdAt || now, updatedAt: now, battles, wins, losses, winRate: battles ? Math.round(wins / battles * 100) : 0, favorite: Boolean(build.favorite), tags: Array.isArray(build.tags) ? build.tags.slice(0, 8) : [] };
    }
    read() { try { const raw = localStorage.getItem(this.key); return raw ? this.migrate(JSON.parse(raw)) : structuredClone(this.memoryFallback); } catch (error) { this.lastError = error; return structuredClone(this.memoryFallback); } }
    write(data) { const migrated = this.migrate(data); this.memoryFallback = structuredClone(migrated); try { localStorage.setItem(this.key, JSON.stringify(migrated)); this.lastError = null; return true; } catch (error) { this.lastError = error; return false; } }
    mutate(callback) { const data = this.read(); const value = callback(data); return { ok: this.write(data), value, data }; }
    saveSettings(settings) { return this.mutate((data) => { data.settings = { ...data.settings, ...settings }; }).ok; }
    saveUI(screen, filters) { return this.mutate((data) => { data.lastScreen = screen || data.lastScreen; if (filters) data.filters = { ...data.filters, ...filters }; }).ok; }
    listBuilds() { return this.read().builds; }
    saveBuild(build, asNew = false) { return this.mutate((data) => { const normalized = this.normalizeBuild(asNew ? { ...build, id: null, name: `${build.name || "Build"} — Variante` } : build); const index = data.builds.findIndex((item) => item.id === normalized.id); if (index >= 0) data.builds[index] = { ...data.builds[index], ...normalized, createdAt: data.builds[index].createdAt }; else { const limit = Math.min(100, Math.max(1, Number(data.settings.buildLimit) || 50)); if (data.builds.length >= limit) throw new Error(`Limite de ${limit} builds atingido.`); data.builds.unshift(normalized); } data.lastBuildId = normalized.id; return normalized; }); }
    deleteBuild(id) { return this.mutate((data) => { const before = data.builds.length; data.builds = data.builds.filter((item) => item.id !== id); return before !== data.builds.length; }); }
    addBattle(result) { return this.mutate((data) => { const entry = { ...result, id: result.id || `battle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, favorite: Boolean(result.favorite) }; data.history.unshift(entry); const limit = Math.max(20, Number(data.settings.historyLimit) || 200); const favorites = data.history.filter((item) => item.favorite); const others = data.history.filter((item) => !item.favorite).slice(0, Math.max(0, limit - favorites.length)); data.history = [...favorites, ...others].sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt))); return entry; }); }
    deleteBattle(id) { return this.mutate((data) => { data.history = data.history.filter((item) => item.id !== id); }); }
    clearHistory() { return this.mutate((data) => { data.history = data.history.filter((item) => item.favorite); }); }
    toggleFavorite(group, id) { return this.mutate((data) => { const list = new Set(data.favorites[group] || []); list.has(id) ? list.delete(id) : list.add(id); data.favorites[group] = [...list]; return list.has(id); }); }
    updateBestiary(characterId, patch = {}) { return this.mutate((data) => { const current = data.bestiary[characterId] || { characterId, state: "Desconhecido", encounters: 0, wins: 0, losses: 0, favorite: false }; data.bestiary[characterId] = { ...current, ...patch, characterId }; return data.bestiary[characterId]; }); }
    recordPowerUse(powerId, won = null) { return this.mutate((data) => { const stat = data.powerStats[powerId] || { uses: 0, wins: 0 }; stat.uses += 1; if (won === true) stat.wins += 1; data.powerStats[powerId] = stat; }); }
    getRecord() { const history = this.read().history, wins = history.filter((battle) => battle.winner === "player").length; return { battles: history.length, wins, rate: history.length ? Math.round(wins / history.length * 100) : null }; }
  }
  OA.Storage = Storage;
}());
