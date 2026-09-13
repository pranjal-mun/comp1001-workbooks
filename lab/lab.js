// Full-screen PyLab: a small multi-file Python project that runs in the
// browser on the shared runtime. input() is answered inline in the console.

import { createEditor } from "../runtime/editor.js";
import { Console } from "../runtime/console.js";
import { runner, runInteractive, StoppedError, TimeoutError } from "../runtime/runner.js";
import { initTheme } from "../runtime/theme.js";
import { revealPage } from "../runtime/page.js";
import { decodeBase64 } from "../runtime/components.js";

const STORAGE_KEY = "pylab-workbooks:lab-project";
const LIMITS = { maxFiles: 20, maxFileBytes: 100 * 1024 };
const DEFAULT_PROJECT = { activeFile: "main.py", files: [{ name: "main.py", content: "" }] };

const $ = (selector) => document.querySelector(selector);
const els = {
  status: $("#runtime-status"), run: $("#run"), stop: $("#stop"), theme: $("#theme-toggle"),
  fileList: $("#file-list"), newFile: $("#new-file"), renameFile: $("#rename-file"), deleteFile: $("#delete-file"),
  resetProject: $("#reset-project"), activeName: $("#active-name"), copyFile: $("#copy-file"),
  clearOutput: $("#clear-output"), consolePanel: $(".lab-console-panel"), saveStatus: $("#save-status"),
};

initTheme();
els.theme.addEventListener("click", () => document.dispatchEvent(new CustomEvent("wb:toggle-theme")));

let project = loadProject();
let running = false;
let abort = null;
let saveTimer = null;
const out = new Console($("#console"));
const editor = await createEditor($("#editor"), { value: activeFile().content, minLines: 1, maxLines: null, onChange: onEdit });
editor.cm.setOption("extraKeys", { ...editor.cm.getOption("extraKeys"), "Ctrl-Enter": runProject, "Cmd-Enter": runProject });

loadFromHash();
renderFiles();
updateControls();
revealPage();

runner.onStatus((state, text) => {
  els.status.textContent = state === "ready" ? "Python ready" : text;
  els.status.dataset.state = state;
  updateControls();
});
runner.warmUp();

// ---------------------------------------------------------------- project

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.files) && saved.files.length) return saved;
  } catch { /* fall through */ }
  return structuredClone(DEFAULT_PROJECT);
}

function saveProject() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    els.saveStatus.textContent = "Saved in this browser";
  } catch {
    els.saveStatus.textContent = "Could not save (storage unavailable)";
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  els.saveStatus.textContent = "Saving…";
  saveTimer = setTimeout(saveProject, 400);
}

function activeFile() {
  return project.files.find((file) => file.name === project.activeFile) ?? project.files[0];
}

function onEdit(value) {
  activeFile().content = value;
  scheduleSave();
}

/** Workbook "Open in PyLab" links pass code as #code=<base64>. */
function loadFromHash() {
  const match = location.hash.match(/^#code=(.+)$/);
  if (!match) return;
  let code;
  try { code = decodeBase64(decodeURIComponent(match[1])); } catch { return; }
  history.replaceState(null, "", location.pathname + location.search);
  const main = project.files.find((file) => file.name === "main.py");
  if (main && main.content.trim() && main.content !== code) {
    if (!window.confirm("Replace the code in main.py with the code from the workbook?")) return;
  }
  if (main) main.content = code;
  else project.files.unshift({ name: "main.py", content: code });
  project.activeFile = "main.py";
  editor.setValue(code);
  saveProject();
}

// ------------------------------------------------------------------ files

function renderFiles() {
  els.fileList.replaceChildren(...project.files.map((file) => {
    const item = document.createElement("li");
    item.classList.toggle("is-active", file.name === project.activeFile);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = file.name;
    button.addEventListener("click", () => selectFile(file.name));
    item.append(button);
    return item;
  }));
  els.activeName.textContent = project.activeFile;
  els.deleteFile.disabled = project.files.length <= 1;
}

function selectFile(name) {
  if (name === project.activeFile) return;
  project.activeFile = name;
  editor.setValue(activeFile().content);
  renderFiles();
  saveProject();
  editor.focus();
}

function validateFilename(name, currentName = null) {
  if (!name || name.trim() !== name) return "Filenames cannot be empty or start or end with spaces.";
  if (name.length > 80) return "Filenames must be 80 characters or fewer.";
  if (!/^[A-Za-z0-9_.-]+$/.test(name) || name === "." || name === "..") return "Use only letters, numbers, underscores, hyphens and periods.";
  if (project.files.some((file) => file.name === name && file.name !== currentName)) return "A file with that name already exists.";
  return null;
}

function askFilename(message, initial) {
  for (;;) {
    const name = window.prompt(message, initial);
    if (name == null) return null;
    const error = validateFilename(name.trim(), initial);
    if (!error) return name.trim();
    window.alert(error);
  }
}

els.newFile.addEventListener("click", () => {
  if (project.files.length >= LIMITS.maxFiles) return window.alert(`Projects are limited to ${LIMITS.maxFiles} files.`);
  let number = 1, suggestion = "helpers.py";
  while (project.files.some((file) => file.name === suggestion)) suggestion = `module${++number}.py`;
  const name = askFilename("New file name:", suggestion);
  if (!name) return;
  project.files.push({ name, content: "" });
  project.activeFile = name;
  editor.setValue("");
  renderFiles();
  saveProject();
  editor.focus();
});

els.renameFile.addEventListener("click", () => {
  const file = activeFile();
  const name = askFilename("Rename file to:", file.name);
  if (!name || name === file.name) return;
  file.name = name;
  project.activeFile = name;
  renderFiles();
  saveProject();
});

els.deleteFile.addEventListener("click", () => {
  if (project.files.length <= 1) return;
  const file = activeFile();
  if (!window.confirm(`Delete ${file.name}? This cannot be undone.`)) return;
  project.files = project.files.filter((f) => f !== file);
  project.activeFile = project.files[0].name;
  editor.setValue(activeFile().content);
  renderFiles();
  saveProject();
});

els.resetProject.addEventListener("click", () => {
  if (!window.confirm("Delete every file and start again with an empty main.py?")) return;
  project = structuredClone(DEFAULT_PROJECT);
  editor.setValue("");
  out.clear();
  renderFiles();
  saveProject();
});

els.copyFile.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(editor.getValue());
    els.copyFile.textContent = "Copied";
  } catch {
    els.copyFile.textContent = "Copy failed";
  }
  setTimeout(() => { els.copyFile.textContent = "Copy code"; }, 1200);
});

// -------------------------------------------------------------------- run

function updateControls() {
  const ready = runner.state === "ready";
  els.run.disabled = running || !ready;
  els.stop.disabled = !running;
}

function projectFiles() {
  return project.files.map((file) => ({ name: file.name, content: file.content }));
}

async function runProject() {
  if (running || runner.state !== "ready") return;
  const encoder = new TextEncoder();
  for (const file of project.files) {
    if (encoder.encode(file.content).byteLength > LIMITS.maxFileBytes) return window.alert(`${file.name} is larger than the 100 KB file limit.`);
  }
  const entry = project.files.some((file) => file.name === "main.py") ? "main.py" : project.activeFile;
  if (!entry.endsWith(".py")) return window.alert("Add a main.py, or select a .py file to run.");
  clearTimeout(saveTimer);
  saveProject();

  running = true;
  abort = new AbortController();
  els.consolePanel.classList.add("has-run");
  out.clear();
  editor.clearErrorLine();
  updateControls();
  try {
    const result = await runInteractive({ files: projectFiles(), entry, console: out, signal: abort.signal });
    if (result.status === "error") {
      const line = result.stderr.match(/File "main\.py", line (\d+)/g)?.pop()?.match(/line (\d+)/)?.[1];
      if (line && entry === project.activeFile) editor.markErrorLine(Number(line));
    } else if (out.isEmpty) {
      out.note("(program finished with no output)");
    }
  } catch (error) {
    if (error instanceof StoppedError || error?.name === "AbortError") out.note((out.isEmpty ? "" : "\n") + "■ Stopped.");
    else if (error instanceof TimeoutError) out.error(`\n${error.message}`);
    else out.error(`\n${error.message ?? error}`);
  } finally {
    running = false;
    abort = null;
    updateControls();
  }
}

els.run.addEventListener("click", runProject);
els.stop.addEventListener("click", () => {
  abort?.abort();
  runner.stop();
});
els.clearOutput.addEventListener("click", () => out.clear());
