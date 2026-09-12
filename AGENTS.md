# Generating a workbook from source material

This file is for a coding agent (or a human) asked to turn a lecture workbook
into an interactive web page. Read it fully before starting. `IDEA.md`
explains the why; this file is the how.

## Where things are

| Path | What |
|---|---|
| `source_material/lecture-NN/` | The instructor's `.tex` and/or PDF for lecture NN. **Read-only input.** |
| `workbooks/lecture-NN/index.html` | The page: prose, tables, and widget tags. |
| `workbooks/lecture-NN/exercises.json` | Specs for every widget on the page, keyed by id. |
| `workbooks/lecture-NN/build_exercises.py` | Script that generates `exercises.json`. Expected outputs are produced by running the code. |
| `runtime/` | Shared engine. **Do not edit per workbook.** If a lecture needs a new capability, add it to the runtime generically and document it here. |
| `tools/check_workbook.py` | Verifies a workbook's JSON against real Python. Must pass before you are done. |
| `tools/answers.py` | Encode/decode the base64 model answers. |
| `index.html` | Landing page: add a card for the new workbook. |

The site is static and every path is relative. Never write an absolute URL or
a path that starts with `/`; GitHub Pages serves the site from a subfolder.

## The workflow

1. **Read the source** in `source_material/lecture-NN/`. The `.tex` is the
   truth; the PDF shows layout. Keep the lecture's wording, section order,
   tables, and numbering. Do not "improve" the pedagogy.
2. **Copy `workbooks/lecture-04/` as the template.** Its `index.html` shows
   every prose class and widget in use; its `build_exercises.py` shows every
   spec shape.
3. **Write `build_exercises.py`** for the new lecture, then run it to produce
   `exercises.json`. Every example `output` and every coding-exercise
   `expected` must come from running the code (the helper `run()` does
   this). Never type expected output by hand.
4. **Write `index.html`**: prose first, then drop widget tags at the exact
   points where the PDF has code listings, blank answer lines, or fill-in
   tables.
5. **Verify:** `python3 tools/check_workbook.py workbooks/lecture-NN` must
   report `0 failures`. Then serve the repo root
   (`python3 -m http.server 9000`), open the page, and in the browser check:
   every widget rendered (no red "No exercise named…" boxes), a few
   examples run, a wrong answer is rejected with a readable message, the right
   answer passes and awards XP, tables and short answers behave, dark mode
   reads well.
6. **Add the workbook card** to the root `index.html`.
7. Commit in small logical steps (specs, page, landing card).

## Mapping the PDF to widgets

| In the PDF | Tag | Spec type |
|---|---|---|
| Teaching listing (with or without an `Output:` box) | `<wb-example id="…">` | `example` |
| Coding task: starter shell + blank lines + expected-output table | `<wb-exercise id="…">` | `code` |
| Trace / classify table with blank cells | `<wb-table id="…">` wrapping a real `<table>` | `table` |
| "Why…?" / "Explain…" question with answer lines | `<wb-short id="…">` | `short` |
| Learning outcomes, checkpoint boxes, callouts, diagrams | plain HTML with the `wb-*` prose classes | — |

Ids must be unique on the page. Use short, stable, descriptive ids
(`cp3-types`, `ca`, `ex-w07`); they become the localStorage keys, so
renaming one after students have used it loses their saved work.

Every `wb-exercise`, `wb-table` and `wb-short` with a spec counts toward the
progress bar. Examples do not.

## Page skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>COMP 1001 – Lecture NN Workbook</title>
  <link rel="stylesheet" href="../../runtime/workbook.css">
  <script type="module">
    import { initWorkbook } from "../../runtime/workbook.js";
    initWorkbook({ id: "lecture-NN", specs: "./exercises.json" });
  </script>
</head>
<body>
<main>
  <div class="wb-title-block">…</div>
  <section class="wb-outcomes"><h2 id="outcomes">Learning outcomes</h2>…</section>
  <h2 id="s1">1. First section</h2>
  …
</main>
</body>
</html>
```

`initWorkbook` builds the sticky top bar (XP, progress, theme toggle, export /
import menu) and a table of contents from every `main h2[id]`. Give each
section heading an `id`; add `data-toc-title="…"` for a shorter TOC label.

Prose classes available in `runtime/workbook.css`:

- `.wb-title-block` with `.wb-course`, `h1`, `.wb-subtitle`, `.wb-meta`, and an `<img>` for the logo (`../../runtime/img/mun-logo.svg`).
- `.wb-outcomes` for the learning-outcomes section.
- `.wb-checkpoint > .wb-block-title` for checkpoint boxes; `.wb-block` for other framed blocks.
- `.wb-callout.is-good / .is-warn / .is-bad > .wb-callout-title` for tips, cautions and pitfalls.
- `.wb-refers` with `.wb-box` and `.wb-arrow` for the "name refers to value" diagram; add `.wb-stages` and `.wb-arrow.wb-plain` for a left-to-right sequence of boxes.
- `pre.wb-output`, `pre.wb-shell` (`.wb-prompt`, `.wb-typed`), `pre.wb-error` for static transcripts you do not want to be runnable.
- Inline code highlighting spans: `.wb-kw .wb-type .wb-fn .wb-str .wb-cmt .wb-num`.
- Wrap very wide tables in `.wb-table-wrap`.

## `exercises.json`

```json
{
  "id": "lecture-NN",
  "course": "COMP 1001: Introduction to Programming",
  "title": "Lecture NN Workbook",
  "subtitle": "Topic",
  "exercises": { "<id>": { …spec… } }
}
```

Code text is stored with `\n` newlines and **no trailing newline**. Model
answers (`answer`) are base64 so they do not show as plain text in view-source;
`build_exercises.py`'s `b64()` and `tools/answers.py` do the encoding.

### `example`

```json
{ "type": "example", "code": "price = 24.95\nprint(price)", "output": "24.95" }
```

- `output` (optional): shown in the console before the student presses Run; omit it for listings that print nothing or that are meant to raise an error.
- `title`, `files` (`[{name, content}]` extra modules), `maxLines` are optional.
- The widget is read-only until the student clicks *Edit a copy*; *Restore original* undoes.

### `code`

```json
{
  "type": "code", "xp": 5,
  "starter": "first = 3\n# Your code here",
  "cases": [
    { "name": "first = 3", "expected": "4 5" },
    { "name": "first = 0", "rewrite": [["first = 3", "first = 0"]], "expected": "1 2" },
    { "name": "with input", "inputs": ["Ada", "36"], "expected": "Hi Ada 36" }
  ],
  "check": "assert isinstance(booked, int), 'booked should be an int'",
  "answer": "<base64 of the model solution>",
  "answerNote": "Optional one-line remark shown under the model answer",
  "minLines": 4, "maxLines": 16, "files": []
}
```

- **Run** is interactive (`input()` shows an inline field). **Check** runs every case silently with that case's scripted `inputs`, compares stdout line by line (trailing whitespace and trailing blank lines ignored), and shows a diff table for failures.
- `rewrite` is a list of `[from, to]` literal replacements applied to the student's source before the case runs. Use it when the PDF's expected-output table has several rows ("with `first = 0` →…") so the student does not have to edit their code between cases. Tell the student in the prose which line will be rewritten.
- `check` (spec level, applies to every case) and `cases[i].check` are Python scripts executed **after** the student's program in the same namespace, with `__source__` (the code text) and `__stdout__` (what it printed). Report a failure with `raise AssertionError("message shown to the student")` or a plain `assert cond, "message"`. Use checks for non-output requirements: a constant exists and is uppercase, a name is an `int`, the source contains a comment, exactly one `print`, a function returns the right value.
- A case with no `expected` is check-only (useful for open-ended tasks where the student picks the values).
- `xp` weights: 1 trivial, 2 short, 5 a short program with fixed output, 10 a longer or open-ended program.

### `table`

The page keeps the real HTML table; cells with `data-blank="name"` become text inputs. The spec only holds the answer keys:

```html
<wb-table id="cp3-types">
  <table>
    <thead><tr><th>Value</th><th>Type</th></tr></thead>
    <tbody>
      <tr><td><code>18</code></td><td data-blank="t1"></td></tr>
      <tr><td><code>'18'</code></td><td data-blank="t2"></td></tr>
    </tbody>
  </table>
</wb-table>
```

```json
{ "type": "table", "xp": 1,
  "blanks": {
    "t1": { "accept": ["int"] },
    "t2": { "accept": ["str"], "caseSensitive": false, "placeholder": "type", "width": "6rem", "show": "str" }
  } }
```

- `xp` is **per blank**. Each blank is awarded once when it is first correct.
- Matching trims and collapses whitespace, is case-insensitive unless `caseSensitive`, and treats `<class 'int'>` as `int`. List every reasonable spelling in `accept` (e.g. `"'COMP 1001'"`, `"\"COMP 1001\""`, `"COMP 1001"`).
- `show` is what *Show answers* fills in when `accept[0]` is not the nicest form.
- Every `data-blank` name on the page must have a key, and vice versa.

### `short`

```json
{ "type": "short", "xp": 2, "minChars": 20, "rows": 3,
  "placeholder": "Write your answer in your own words…",
  "answer": "<base64 of the model answer; blank line = new paragraph; `code` in backticks>" }
```

The student writes at least `minChars` characters, then *Compare with model
answer* reveals the model answer and they self-report *I got it* (+xp) or *Not
quite*. *Skip and show answer* before attempting costs `xp`. Keep model
answers short and in the lecture's own words.

## Writing good specs

- Run everything. `build_exercises.py` should call `run(code)` for every
  example output and `tools/check_workbook.py` must pass. If the PDF's printed
  output disagrees with real Python, trust Python and tell the instructor.
- Expected output is compared as text: `print(a, b)` gives `4 5`, not `45`.
  Write cases so that common wrong orderings fail.
- Make check messages teach: `"Use the ALL_CAPS convention for the fixed
  capacity (for example MAX_SEATS)."` rather than `"bad name"`.
- Do not depend on `random`, time, or the filesystem in examples: interactive
  `input()` re-runs the program from the top for every answer, so programs
  must be deterministic.
- Programs get 5 seconds per run segment; keep examples fast.
- A widget whose id has no spec renders a visible red "No exercise named …"
  message in its place — the browser check in step 5 catches this.

## Runtime notes (for when a lecture needs something new)

- Python runs in a Web Worker (`runtime/python-worker.js`, Pyodide). Each run
  gets a fresh namespace and a fresh project directory; `files` become real
  modules on the worker's filesystem, so multi-file programs work.
- `runtime/grader.js` is the single grading path used by both the page and
  `tools/check_workbook.py` (which mirrors it in Python). Change both together.
- Progress lives in `localStorage` under `pylab-workbooks:progress:<id>`; XP
  under `pylab-workbooks:xp`. Export/import in the page menu produces a JSON
  file with format `pylab-workbooks-progress/1`.
- Assets load from CDNs (jsdelivr) with the pinned copies in `vendor/` as an
  automatic fallback; `?localAssets=1` forces the local copies for offline
  testing.
