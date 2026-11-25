export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    service: "muledealer-api",
    databaseConfigured: Boolean(env.DB),
    turnstileConfigured: Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
