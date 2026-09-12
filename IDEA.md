# PyLab Workbooks — the idea

Turn each COMP 1001 lecture workbook (today a LaTeX → PDF document) into an
**interactive web page** where the notes, checkpoints, and practice problems are
the same as the PDF, but every code exercise has a small Python editor embedded
right where the answer lines used to be. The student types a few lines, presses
**Run**, sees the output, and is told whether they got it right.

The Python runtime is the one already proven in `pylab/`: Pyodide running
entirely in the browser inside a Web Worker. No server, no accounts, no install.
The whole site is static files.

## What the student sees

One long page per lecture, laid out like the PDF (same section order, same
prose, same tables) in the university's brand look, with a dark toggle. The
difference is that the "answer lines" become live widgets:

| In the PDF | On the web |
|---|---|
| Teaching example code + "Output:" box | Read-only code block with a **▶ Run** button. Output appears underneath so students can see that the printed output is real, and can **edit a copy** to experiment. |
| Coding task with starter shell + blank lines + expected-output table | **Exercise editor**: a compact CodeMirror box (starts ~6 lines tall, grows with content, has a "maximize" toggle), a **Run** button, an output pane, and a **Check** result: ✅ *Correct* or ❌ *Expected `4 5`, got `4 6`* with a diff of the expected vs. actual lines. |
| Trace table / classify table (fill-in cells: values, types, valid/invalid) | Same table with **text inputs** in the blank cells and a **Check** button. Each cell is marked right/wrong. Answers are normalized (whitespace, case, `int` vs `<class 'int'>`), and cells can accept several correct spellings. |
| Short-answer "Why…?" / "Explain…" questions | A textarea for the student's own words. Once they have written a real attempt, **Compare with model answer** shows the model answer for free and the student self-checks: *I got it* banks the XP, *Not quite* leaves it open. **Skip and show answer** (before attempting) costs XP instead. |
| Learning outcomes, headings, diagrams | Plain HTML/CSS; small diagrams (the "refers to" boxes) reproduced with inline SVG or simple CSS. |

Extras:

- A **progress bar** per workbook ("9 / 18 checks passed") and a ✓ next to each
  completed checkpoint in a sticky table of contents.
- Work is **autosaved in `localStorage`** per exercise and survives reloads (unlike
  PyLab's per-session wipe — students come back to a workbook over days).
  A **Reset exercise** button restores the starter code; **Reset workbook** wipes all.
- **Export/import progress** as a small JSON file so a student can move between
  machines (no backend needed).
- For bigger programs (future lectures): each exercise editor can be **expanded
  to a full-height view**, supports **multiple files** in the runtime layer
  from day one (PyLab's worker already writes a whole project into the virtual
  filesystem). There is also an **"Open in PyLab"** link that sends the
  current code to the full-screen editor for free-form work.
- **`input()` is interactive, like IDLE or Thonny.** When the program reaches
  `input()`, the prompt text appears in the output pane with a text field on
  the same line; the student types, presses Enter, and the program continues.
  There is no separate "standard input" box to pre-fill (the thing PyLab does
  today). See "Interactive input" below.

## How checking works

Every exercise ships with a small **spec** (see "Content format"). The grader
supports, in order of sophistication:

1. **Expected stdout** — the common case. Run the student's code, compare
   trimmed output line-by-line to the expected text. This covers all of
   Lecture 4's Coding Practices A–D and Practice D.
2. **Multiple cases** — e.g. "with `first = 3` → `4 5`, with `first = 0` → `1 2`".
   A case can supply `input` lines (fed to `input()` automatically — the
   student never types during a **Check**, only during a **Run**), and/or a
   **rewrite rule** (`first = 3` → `first = 0`) applied to the student's code
   before running, so the checker can exercise the other row of the expected-output
   table without asking the student to edit anything.
3. **Python check script** — an optional snippet that runs *after* the student's
   code in the same namespace and can assert anything: `booked` is an `int`,
   a name in ALL_CAPS exists, the source contains at least one comment, a
   function returns the right value, etc. Failures raise `AssertionError("message")`
   and the message is shown to the student as the feedback. This is the hook that
   scales to the larger programs in later lectures (function-level tests,
   randomized inputs, checking types rather than exact text).
4. **Key-based checks** for table cells and short answers — a list of accepted
   answers per cell, normalized before comparison.

**Run vs. Check.** *Run* is the IDE experience: interactive prompts, the
student's own values. *Check* runs the same code silently against every case
with that case's scripted input lines, then shows a per-case pass/fail with a
transcript (prompt, the scripted answer, the output) so a failed case is
readable.

Error handling: a `NameError`/`SyntaxError` is shown as-is (the PDF explicitly
teaches reading error messages), with the line highlighted in the editor.
Runs still get the 5-second time limit; the worker is terminated and restarted
on timeout exactly as PyLab does today.

## Interactive input

Python's `input()` blocks until a line arrives, but the program runs in a Web
Worker and the text field lives on the main thread. We keep this simple and
avoid the cross-origin-isolation / `SharedArrayBuffer` machinery entirely:

- The worker runs the program with a script of the answers given so far
  (initially none). When `input()` is called and the script is exhausted, the
  program stops with a private *NeedInput* signal carrying the prompt text and
  the output produced so far.
- The UI shows that output, then the prompt with a text field on the same
  line. The student types and presses Enter.
- The program is **re-run from the top** with the new answer appended to the
  script; output already shown is not repeated, only the new part appears.
  From the student's point of view it behaves like IDLE or Thonny.

For the deterministic programs in this course the replay is invisible. It
only misbehaves for `random`/time-dependent code, which the workbooks don't
use; if that ever matters we can revisit blocking input then.

The 5-second execution limit applies per run segment, so a student thinking
at a prompt never trips it.

The full-screen PyLab page under `lab/` moves to the same interactive
`input()` and drops its "standard input" panel.

## XP: earning and spending points

Getting an answer right **earns XP**; looking at a model answer **costs XP**.
Every exercise has a weight of **1, 2, 5, or 10 XP** set in its spec, chosen by
length and difficulty:

| Weight | Typical exercise |
|---|---|
| 1 | One table cell / one-line answer (a type, valid/invalid, a traced value) |
| 2 | A short "why" question, or a small table (3–5 cells) checked together |
| 5 | A short coding task with a fixed expected output (Coding Practice A–C) |
| 10 | A longer or open-ended program with several requirements (Coding Practice D, Practice D) |

Rules:

- A correct check awards the full weight **once**; re-running a passed exercise
  never re-awards, and resetting an exercise does not let it be re-earned
  (the XP history remembers). Table exercises award per blank (`xp` in a
  table spec is the weight of one blank), so partial progress still counts.
- **Show answer** costs the same weight it would have paid, is only enabled
  when the balance covers it, and permanently marks that exercise as
  *revealed* (no XP can be earned from it afterwards, but it still counts as
  "done" for the progress bar). A confirm step prevents accidental spending.
- XP balance and history are stored in `localStorage` alongside progress, and
  are included in the export/import file. A header badge shows the balance;
  small "+5 XP" toasts on success.
- Starting balance is 0, so the first answers must be earned. (We can seed a
  few XP per workbook if that feels too harsh in practice — one number in a config.)

Answer keys, model answers, and expected outputs live client-side in the page
data (it is a workbook, not an exam). The XP gate is a nudge, not security:
a determined student can read the JSON. We will store model answers base64-
encoded so they don't appear as plain text in "view source", and leave it at that.

## Architecture

Static site, no build step, same "serve any directory" deploy story as PyLab.

```
pylab_workbooks/
├── IDEA.md                 ← this file
├── README.md               ← how to run / deploy / add a workbook
├── AGENTS.md               ← instructions for a coding agent converting a workbook (see below)
├── index.html              ← landing page listing all workbooks
├── .nojekyll               ← GitHub Pages: serve everything as-is
├── runtime/                ← shared engine, reused by every workbook
│   ├── python-worker.js    ← from pylab (Pyodide in a worker, virtual FS, stdout/stderr capture, limits)
│   ├── runner.js           ← one worker per page, a run queue, timeout/terminate/restart, interactive input bridge
│   ├── grader.js           ← stdout diff, cases/rewrites, check-script harness, cell matching
│   ├── components.js       ← <wb-example>, <wb-exercise>, <wb-table>, <wb-short> web components
│   ├── progress.js         ← localStorage persistence, progress bar, export/import
│   ├── xp.js               ← XP balance, earn/spend rules, reveal gating, toasts
│   ├── editor.js           ← CodeMirror wrapper (compact/expandable), CDN-with-local-fallback loader from pylab/bootstrap.js
│   ├── workbook.css        ← MUN brand theme (light/dark), tokens from BrandStandards_March_2026
│   ├── fonts/              ← Figtree, EB Garamond, JetBrains Mono (self-hosted, OFL)
│   └── img/mun-logo.svg    ← converted from MUN_Logo_CMYK.pdf
├── lab/                    ← the full-screen PyLab editor, kept as a page of the site ("Open in PyLab" target)
├── tools/                  ← authoring helpers: check_workbook.py (verifies every spec by running it), answers.py (base64 codec)
├── vendor/                 ← pinned Pyodide + CodeMirror copies, offline fallback (from pylab/vendor)
├── workbooks/
│   └── lecture-04/
│       ├── index.html      ← the workbook page: prose + tables + component tags
│       ├── exercises.json  ← specs: starter code, expected output, cases, check scripts, answer keys, model answers
│       └── build_exercises.py ← generates exercises.json; expected outputs come from running the code
└── source_material/
    └── lecture-04/         ← the PDF and/or .tex dumped here; the agent reads these to generate workbooks/lecture-04/
```

Key decisions:

- **Web components** (`<wb-exercise id="coding-a">`) keep the workbook HTML
  readable and let an agent author content without touching runtime code. Each
  tag looks up its spec by `id` in `exercises.json`.
- **One Pyodide worker per page**, shared by every widget, with a queue so only
  one run happens at a time (Pyodide is single-threaded anyway). Each run gets a
  fresh namespace and a cleared project directory, exactly like PyLab's
  `runProject`. Pyodide (~10 MB, cached by the browser afterwards) starts
  loading as soon as the page opens, with a "Loading Python…" status in the
  top bar; Run buttons enable when it is ready.
- **Content and engine are separate.** The engine never changes per lecture; a
  new lecture is a new folder under `workbooks/` plus its source material.
- **No framework, no bundler.** Plain ES modules, like PyLab. Anyone can open the
  folder and serve it with `python3 -m http.server`.
- **Hosting: GitHub Pages**, from the repo root (or `docs/`-free — just the
  root). All paths are relative (`./runtime/…`, `../../vendor/…`) so the site
  works at `https://<user>.github.io/<repo>/`, on `localhost`, and from a
  subfolder of a course server alike. A `.nojekyll` file keeps Pages from
  ignoring `vendor/` internals.
- **Theme: the MUN brand standards (March 2026)**, translated into CSS
  tokens in `runtime/workbook.css`. Palette: white paper, brand black
  `#231F20` for text, Cool Grey 10 `#63666A` for quiet text, Cool Grey 7
  `#97999B` for rules, and claret PMS 202 `#862633` used sparingly as the
  single accent (course label, the thin rule above each section heading,
  primary buttons, keywords). Semantic colours come from the secondary
  palette and keep their meaning: teal PMS 3275 `#00B398` = correct /
  progress, amber PMS 1235 `#FFB81C` = careful / running, red PMS 185
  `#E4002B` = wrong — never used for decoration, and never confused with the
  claret accent. Syntax highlighting adds PMS 2736 blue for builtins (the
  brand allows extra colours for infographics). The dark toggle keeps the
  same relationships on a near-black warm ground (`#1A1718` / `#231F20`),
  with the accents lightened for contrast and the logo reversed out in white
  as the brand permits. Type follows the brand's Avenir / Adobe Garamond
  pairing: headings and UI in Avenir Next when installed, else the vendored
  Figtree; body copy in Adobe Garamond Pro when installed, else the vendored
  EB Garamond; code in JetBrains Mono with ligatures off so beginners see
  `!=` and `>=` as typed. The MUN logo is converted from `MUN_Logo_CMYK.pdf`
  to SVG and placed in the page header exactly as on the PDF's title block.

## The authoring loop (how future workbooks get made)

1. Instructor drops `LECTURE_NN_WORKBOOK*.pdf` and/or the `.tex` sources into
   `source_material/lecture-NN/`.
2. Instructor opens the repo in a coding agent (Claude Code, Codex, …) and says
   "generate the web workbook for lecture NN".
3. The agent follows `AGENTS.md`, which will spell out:
   - the mapping from PDF constructs to components (the table above),
   - the `exercises.json` schema with examples,
   - the rule that **every expected output must be produced by actually running
     the reference solution** (the agent runs Python locally and pastes real
     output, never types it by hand),
   - how to write check scripts for non-stdout requirements ("uses a constant",
     "stores as int"),
   - the requirement to keep the workbook's wording and ordering intact,
   - a final verification step: load the page, run every example and every
     reference solution through the widgets, confirm all checks pass.
4. Instructor reviews the generated page locally, then deploys the static folder.

Because Lecture 4's `.tex` already tags listings (`% PY W01`, `% PY SHELL CA`,
`% SOL SCA`) and keeps solutions in `\solution{...}`, the agent has everything it
needs from the source — future lectures written the same way will convert cleanly.

## Scope for the first build (Lecture 4)

- Engine: runner with **interactive `input()`** (replay-based), grader
  (stdout + cases + rewrite + check script), the four components, progress
  persistence, **XP economy**, brand theme + logo.
- Lecture 4 page with all seven checkpoints, Final Review, Additional Practice
  A–D, Putting It All Together, Coding Practice A–D — every one interactive.
- Landing page listing Lecture 4.
- `AGENTS.md` + `README.md` so the next lecture can be generated by an agent
  without this conversation.
- The full PyLab editor preserved under `lab/`.

## Later / nice to have

- Hidden test cases that the student can't see until they pass the visible ones.
- Hints that unlock after N failed attempts.
- "Solutions edition" toggle protected by a passphrase for TAs.
- Optional backend (or LMS export) if progress ever needs to be collected.
- Print stylesheet so the web version can still be printed as a worksheet.
