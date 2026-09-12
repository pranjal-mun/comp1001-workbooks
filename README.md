# PyLab Workbooks

Interactive web versions of the COMP 1001 lecture workbooks. Every code
listing runs in the browser, every checkpoint and practice problem is checked
as the student works, and correct answers earn XP that can be spent to reveal
model answers. Python runs locally (Pyodide in a Web Worker); there is no
server and nothing is uploaded.

- `workbooks/lecture-04/` — Lecture 4: variables, types, and assignment
- `lab/` — PyLab, a full-screen editor with files and interactive `input()`
- `index.html` — landing page

## Run locally

Any static file server from the repo root works:

```bash
python3 -m http.server 9000
```

Then open <http://localhost:9000/>. Assets load from jsdelivr with pinned
copies in `vendor/` as a fallback; add `?localAssets=1` to a page URL to force
the local copies (offline testing).

## Deploy

The site is plain static files with relative paths. For GitHub Pages, publish
the repository root (Settings → Pages → Deploy from branch, `/ (root)`).
`.nojekyll` is included so `vendor/` is served untouched. Any other static
host or a subfolder of a course web server works the same way.

## Layout

```
runtime/      shared engine: Pyodide worker, runner, grader, widgets, theme, fonts, logo
workbooks/    one folder per lecture: index.html + exercises.json (+ build_exercises.py)
lab/          full-screen PyLab editor
tools/        check_workbook.py (verify a workbook), answers.py (base64 helper)
vendor/       pinned Pyodide and CodeMirror for the offline fallback
source_material/  the lecture .tex / PDF sources a new workbook is generated from
```

## Adding a workbook

Drop the lecture's `.tex` / PDF into `source_material/lecture-NN/` and follow
`AGENTS.md` — it is written so a coding agent can do the conversion. Verify
with:

```bash
python3 tools/check_workbook.py workbooks/lecture-NN
```

## Student data

Progress and XP are stored in the browser's `localStorage`. The `⋯` menu in a
workbook exports them as a JSON file and imports them on another machine.
