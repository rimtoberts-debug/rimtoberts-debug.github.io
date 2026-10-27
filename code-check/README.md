# Code Check

In-browser Python practice and marking for IB Computer Science, at `/code-check/`.

## What it does
- Plain-textarea editor with line numbers and Tab support (Esc then Tab leaves the editor).
- Python runs in a Web Worker using Pyodide v0.26.4, loaded from `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js`. Runs have a 5 second timeout; on timeout the worker is terminated and recreated.
- Mark: each test shows pass/fail, marks and total.
- Banned built-ins are detected with Python's `ast` (calls to a banned name, or any banned attribute such as `a.sort`). Hits are reported with line numbers and no marks are awarded.
- Mark points are a self-assessment checklist (not auto-marked). A Java tab shows `java_reference` read-only.
- Last code per task is saved in localStorage (`apexib.check.*`); Export/Import JSON for progress.
- If the CDN cannot be reached, a friendly message is shown instead of an uncaught error.

## Files
`index.html`, `app.js`, `worker.js`, `marker.py` (marking logic shared by browser and tests), `style.css`, `tasks/index.json`, `tasks/*.json`.

Task format: `id, code, hl_only, title, brief, starter, function, tests[{args,expected,marks}], banned[], markpoints[], java_reference`. Add the task to `tasks/index.json` too.

## Testing
Dev-only; `node_modules/` is gitignored and no Pyodide files are committed.

    cd code-check/tests
    npm install
    npm test

Tests run `marker.py` through the npm `pyodide@0.26.4` package in a Node worker thread and prove: a correct bubble sort passes, `sorted()` fails the banned check with the right line number, and an infinite loop is stopped by the 5 s timeout.

Manual: from the repo root `python3 -m http.server 8000`, open `http://localhost:8000/code-check/`.
