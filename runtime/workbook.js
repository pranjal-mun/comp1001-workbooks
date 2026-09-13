// Page bootstrap for a workbook: loads exercises.json, sets up progress and
// the widgets, and builds the sticky top bar (XP, progress, theme, backup)
// and the table of contents from the page's headings, and enables the
// classroom presentation mode (see present.js).
//
// A workbook page calls:
//   import { initWorkbook } from "../../runtime/workbook.js";
//   initWorkbook({ id: "lecture-04", specs: "./exercises.json" });

import { Progress } from "./progress.js";
import { xp } from "./xp.js";
import { runner } from "./runner.js";
import { defineComponents, toast } from "./components.js";
import { initTheme } from "./theme.js";
import { initPresentation } from "./present.js";

const LOGO_URL = new URL("./img/mun-logo.svg", import.meta.url).href;
const HOME_URL = new URL("../index.html", import.meta.url).href;

export async function initWorkbook({ id, specs: specsUrl = "./exercises.json", title }) {
  initTheme();
  const response = await fetch(specsUrl);
  if (!response.ok) throw new Error(`Could not load ${specsUrl}: ${response.status}`);
  const data = await response.json();
  const specs = data.exercises ?? {};
  const progress = new Progress(id);
  const exerciseIds = [...document.querySelectorAll("wb-exercise[id], wb-table[id], wb-short[id]")].map((el) => el.id).filter((eid) => specs[eid]);

  defineComponents({ workbookId: id, specs, progress });
  buildTopBar({ title: title ?? data.title ?? document.title, subtitle: data.subtitle, progress, exerciseIds });
  buildContents(progress);
  initPresentation();
  runner.warmUp();
  // Widgets grow as they initialise, so a #section link needs a second jump.
  if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 300);
}

// ------------------------------------------------------------- top bar

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.flat().filter(Boolean));
  return node;
}

function buildTopBar({ title, subtitle, progress, exerciseIds }) {
  const xpValue = el("span", { class: "wb-topbar-xp-value" }, "0");
  const xpBadge = el("span", { class: "wb-topbar-xp", title: "XP: earn by answering correctly, spend to see answers" }, xpValue, " XP");
  xp.subscribe((balance, change) => {
    xpValue.textContent = String(balance);
    if (change) {
      xpBadge.classList.remove("is-bump");
      void xpBadge.offsetWidth;
      xpBadge.classList.add("is-bump");
    }
  });

  const bar = el("span", { class: "wb-progress-fill" });
  const label = el("span", { class: "wb-progress-label" });
  const progressBox = el("span", { class: "wb-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(exerciseIds.length) },
    el("span", { class: "wb-progress-track" }, bar), label);
  progress.subscribe((p) => {
    const { done, total } = p.summary(exerciseIds);
    bar.style.width = total ? `${(100 * done) / total}%` : "0%";
    label.textContent = `${done} / ${total} done`;
    progressBox.setAttribute("aria-valuenow", String(done));
  });

  const status = el("span", { class: "wb-topbar-status" });
  runner.onStatus((state, text) => {
    status.textContent = state === "ready" || state === "idle" ? "" : text;
    status.dataset.state = state;
  });

  const menu = el("details", { class: "wb-menu" },
    el("summary", { class: "wb-btn wb-btn-quiet" }, "⋯"),
    el("div", { class: "wb-menu-items" },
      el("button", { type: "button", class: "wb-menu-item", onclick: () => exportProgress(progress) }, "Export progress…"),
      el("button", { type: "button", class: "wb-menu-item", onclick: () => importProgress(progress) }, "Import progress…"),
      el("button", { type: "button", class: "wb-menu-item", onclick: () => window.open(new URL("../lab/index.html", import.meta.url).href, "_blank") }, "Open PyLab (full screen)"),
      el("button", { type: "button", class: "wb-menu-item", onclick: () => document.dispatchEvent(new CustomEvent("wb:present")) }, "Present in class", el("kbd", {}, "F")),
      el("hr"),
      el("button", { type: "button", class: "wb-menu-item is-danger", onclick: () => resetWorkbook(progress) }, "Reset this workbook…"),
    ));
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.open = false; });

  const topbar = el("header", { class: "wb-topbar" },
    el("a", { class: "wb-topbar-brand", href: HOME_URL, title: "All workbooks" }, el("img", { src: LOGO_URL, alt: "Memorial University" })),
    el("div", { class: "wb-topbar-title" }, el("strong", {}, title), subtitle ? el("span", {}, subtitle) : null),
    el("span", { class: "wb-spacer" }),
    status, exerciseIds.length ? progressBox : null, xpBadge,
    el("button", { type: "button", class: "wb-btn wb-btn-quiet wb-theme-toggle", title: "Toggle light / dark", onclick: () => document.dispatchEvent(new CustomEvent("wb:toggle-theme")) }, "◐"),
    menu,
  );
  document.body.prepend(topbar);
}

function exportProgress(progress) {
  const blob = new Blob([progress.exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: `${progress.workbookId}-progress.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgress(progress) {
  const picker = el("input", { type: "file", accept: "application/json,.json" });
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) return;
    try {
      progress.importJSON(await file.text());
      toast("Progress imported. Reloading…", "good");
      setTimeout(() => location.reload(), 800);
    } catch (error) {
      window.alert(`Import failed: ${error.message}`);
    }
  });
  picker.click();
}

function resetWorkbook(progress) {
  if (!window.confirm("Clear all saved work and check marks for this workbook? Your XP balance is kept.")) return;
  progress.resetAll();
  location.reload();
}

// ------------------------------------------------------------ contents

function buildContents(progress) {
  const main = document.querySelector("main");
  if (!main) return;
  const headings = [...main.querySelectorAll("h2[id]")];
  if (!headings.length) return;
  const list = el("ol", { class: "wb-toc-list" });
  const entries = [];
  for (const heading of headings) {
    const ids = sectionExerciseIds(heading);
    const mark = el("span", { class: "wb-toc-mark" });
    const link = el("a", { href: `#${heading.id}` }, mark, heading.dataset.tocTitle ?? heading.textContent);
    list.append(el("li", {}, link));
    entries.push({ heading, ids, mark, link });
  }
  const nav = el("nav", { class: "wb-toc", "aria-label": "Contents" }, el("div", { class: "wb-toc-title" }, "Contents"), list);
  main.parentNode.insertBefore(nav, main);
  document.body.classList.add("wb-has-toc");

  progress.subscribe((p) => {
    for (const entry of entries) {
      if (!entry.ids.length) { entry.mark.textContent = ""; continue; }
      const { done, total } = p.summary(entry.ids);
      entry.mark.textContent = done === total ? "✓" : `${done}/${total}`;
      entry.mark.classList.toggle("is-done", done === total);
    }
  });

  // Highlight the section in view.
  const observer = new IntersectionObserver((records) => {
    for (const record of records) {
      if (!record.isIntersecting) continue;
      for (const entry of entries) entry.link.classList.toggle("is-current", entry.heading === record.target);
    }
  }, { rootMargin: "-10% 0px -80% 0px" });
  for (const entry of entries) observer.observe(entry.heading);
}

/** Exercise ids between this h2 and the next one. */
function sectionExerciseIds(heading) {
  const ids = [];
  let node = heading.nextElementSibling;
  while (node && node.tagName !== "H2") {
    if (node.matches("wb-exercise[id], wb-table[id], wb-short[id]")) ids.push(node.id);
    ids.push(...[...node.querySelectorAll("wb-exercise[id], wb-table[id], wb-short[id]")].map((n) => n.id));
    node = node.nextElementSibling;
  }
  return ids;
}
