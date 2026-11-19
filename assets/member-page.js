(() => {
  const { url, anonKey } = window.SUPABASE_CONFIG;
  const client = window.supabase.createClient(url, anonKey);
  const scope = document.currentScript.dataset.trip;
  const current = location.pathname.split("/").pop() || "index.html";
  const login = "login.html?next=" + encodeURIComponent(current);
  window.addEventListener("pageshow", event => {
    if (event.persisted) location.reload();
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.onload = resolve;
      script.onerror = reject;
      script.src = src;
      document.body.append(script);
    });
  }

  async function start() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return location.replace(login);
    client.auth.onAuthStateChange((event, active) => {
      if (event === "SIGNED_OUT" || !active) location.replace(login);
    });
    const { data, error } = await client.from("travel_site_settings")
      .select("details").eq("scope", scope).maybeSingle();
    if (error) throw error;
    if (!data) {
      await client.auth.signOut({ scope: "local" });
      return location.replace(login);
    }
    const details = data.details;
    for (const element of document.querySelectorAll("[data-member-text]")) {
      element.textContent = details[element.dataset.memberText];
    }
    const date = document.querySelector("input[data-trip-range]");
    if (date) {
      date.min = date.value = details.start;
      date.max = details.end;
    }
    const profile = await client.from("travel_members").select("login_alias")
      .eq("user_id", session.user.id).single();
    if (profile.error) throw profile.error;
    window.travelPage = { client, session, details, loginAlias: profile.data.login_alias };
    await loadScript("script.js?v=members-1");
    if (document.querySelector("#world-map")) await loadScript("assets/archive.js");
    document.documentElement.classList.remove("auth-pending");
  }

  start().catch(() => {
    document.documentElement.classList.remove("auth-pending");
    document.body.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "여행 정보를 불러오지 못했습니다.";
    const retry = document.createElement("button");
    retry.textContent = "다시 시도";
    retry.onclick = () => location.reload();
    document.body.append(message, retry);
  });
})();
