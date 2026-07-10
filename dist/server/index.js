export default {
  async fetch(request, env) {
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("ORB ARENA: CHAOS PROTOCOL — Duke Dandalian", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
