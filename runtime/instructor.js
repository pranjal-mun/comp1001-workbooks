// Instructor mode: a hidden switch for checking questions and answers
// without the student-facing limits. While it is on, locked workbooks open
// and model answers show without spending XP or asking first.
//
// Turn it on or off by typing the word "instructor" on any page (outside a
// text field), or by visiting a page with ?instructor=on or ?instructor=off.
// The setting is kept in localStorage for this browser only.

const KEY = "pylab-workbooks:instructor";
const CODE = "instructor";

export function isInstructor() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setInstructor(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

/**
 * Listen for the cheat code and the URL switch. `onChange(on)` runs after a
 * toggle; the default reloads the page so every lock and price re-evaluates.
 */
export function initInstructor({ onChange = () => location.reload() } = {}) {
  const param = new URLSearchParams(location.search).get("instructor");
  if (param === "on" || param === "off") {
    setInstructor(param === "on");
    const url = new URL(location.href);
    url.searchParams.delete("instructor");
    history.replaceState(null, "", url);
  }

  let typed = "";
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    const t = event.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    typed = (typed + event.key.toLowerCase()).slice(-CODE.length);
    if (typed !== CODE) return;
    typed = "";
    setInstructor(!isInstructor());
    onChange(isInstructor());
  });
}

/** A small badge for the top bar; hidden unless instructor mode is on. Click to turn it off. */
export function instructorBadge() {
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "wb-instructor-badge";
  badge.textContent = "Instructor";
  badge.title = "Instructor mode is on: locks and XP prices are off. Click to turn it off.";
  badge.hidden = !isInstructor();
  badge.addEventListener("click", () => {
    if (!window.confirm("Turn instructor mode off?")) return;
    setInstructor(false);
    location.reload();
  });
  return badge;
}
