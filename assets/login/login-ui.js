const passwordField = document.getElementById("password");
const visibilityButton = document.getElementById("toggle-password");
visibilityButton.addEventListener("click", () => {
  const show = passwordField.type === "password";
  passwordField.type = show ? "text" : "password";
  visibilityButton.setAttribute("aria-pressed", String(show));
});
