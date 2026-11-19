(() => {
  const { url, anonKey } = window.SUPABASE_CONFIG;
  const client = window.supabase.createClient(url, anonKey);
  const form = document.querySelector("#login-form");
  const message = document.querySelector("#login-error");
  const next = new URLSearchParams(location.search).get("next");
  const target = ["index.html", "schedule.html", "budget.html", "details.html", "records.html"].includes(next) ? next : "index.html";
  client.auth.getSession().then(({ data }) => {
    if (data.session) location.replace(target);
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    message.classList.add("is-hidden");
    try {
      const { data, error } = await client.functions.invoke("travel-login", {
        body: { username: form.elements.username.value.trim(), password: form.elements.password.value }
      });
      if (error) throw error;
      const result = await client.auth.setSession(data);
      if (result.error) throw result.error;
      sessionStorage.setItem("showArrivalFlight", "1");
      location.replace(target);
    } catch {
      message.textContent = "로그인하지 못했습니다. 아이디와 비밀번호를 확인하고 다시 시도해 주세요.";
      message.classList.remove("is-hidden");
    } finally {
      submit.disabled = false;
    }
  });
})();
