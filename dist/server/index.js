export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (!env?.API_ORIGIN) return new Response(JSON.stringify({ error: "API_NOT_CONFIGURED" }), { status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
      const target = new URL(url.pathname.replace(/^\/api/, "") || "/", env.API_ORIGIN); target.search = url.search;
      return fetch(new Request(target, request));
    }
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("ORB ARENA: CHAOS PROTOCOL — Duke Dandalian", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
