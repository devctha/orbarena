(function () {
  "use strict";
  const OA = window.OrbArena;
  class ApiError extends Error { constructor(code, status, payload) { super(code); this.code = code; this.status = status; this.payload = payload; } }
  class ApiClient {
    constructor(base = window.ORB_API_BASE || "/api") { this.base = String(base).replace(/\/$/, ""); this.csrfToken = null; this.user = null; this.available = true; }
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {}); if (options.body !== undefined) headers.set("content-type", "application/json");
      if (this.csrfToken && !["GET", "HEAD"].includes(options.method || "GET")) headers.set("x-csrf-token", this.csrfToken);
      let response; try { response = await fetch(`${this.base}${path}`, { ...options, credentials: "include", headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); }
      catch (error) { this.available = false; throw new ApiError("API_UNAVAILABLE", 0, { cause: error.message }); }
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new ApiError(payload.error || "REQUEST_FAILED", response.status, payload);
      if (payload.csrfToken) this.csrfToken = payload.csrfToken; this.available = true; return payload;
    }
    async restore() { try { const payload = await this.request("/me"); this.user = payload.user; return this.user; } catch (error) { if (error.status === 401) { this.user = null; return null; } throw error; } }
    async login(data) { const payload = await this.request("/auth/login", { method: "POST", body: data }); this.user = payload.user; return payload; }
    async register(data) { const payload = await this.request("/auth/register", { method: "POST", body: data }); this.user = payload.user; return payload; }
    async logout() { await this.request("/auth/logout", { method: "POST", body: {} }); this.user = null; this.csrfToken = null; }
    async patchProfile(data) { const payload = await this.request("/me/profile", { method: "PATCH", body: data }); this.user = payload.user; return payload.user; }
    adminHeaders(reason) { return { "x-admin-confirm": "CONFIRM", "x-admin-reason": reason }; }
  }
  OA.ApiError = ApiError; OA.ApiClient = ApiClient;
}());

