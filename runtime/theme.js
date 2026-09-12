// Light / dark theme: follows the OS until the student picks one, then the
// choice is remembered for every page on the site.

const KEY = "pylab-workbooks:theme";

export function initTheme() {
  apply(saved() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!saved()) apply(e.matches ? "dark" : "light");
  });
  document.addEventListener("wb:toggle-theme", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    apply(next);
  });
}

function saved() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}
