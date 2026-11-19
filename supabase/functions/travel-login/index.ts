const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return respond(405, {});
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || username.length > 128 ||
        typeof password !== "string" || !password || password.length > 1024) return respond(400, {});
    const base = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lookup = await fetch(base + "/rest/v1/rpc/travel_login_email", {
      method: "POST",
      headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" },
      body: JSON.stringify({ supplied_alias: username }),
    });
    if (!lookup.ok) return respond(503, {});
    const email = await lookup.json();
    const result = await fetch(base + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || "unknown@invalid.invalid", password }),
    });
    if (!result.ok || !email) return respond(result.status === 429 ? 429 : 401, {});
    const { access_token, refresh_token } = await result.json();
    return respond(200, { access_token, refresh_token });
  } catch {
    return respond(400, {});
  }
});
