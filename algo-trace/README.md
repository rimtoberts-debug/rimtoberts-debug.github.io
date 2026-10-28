# Trace Tables (algo-trace)

Live: https://rimtoberts-debug.github.io/algo-trace/

## Built
- `algorithms.js` – pre-instrumented generators (no interpreter) yielding `{line, vars, array, highlights, ...}` per step, plus static Python/Java text, line maps and Big O data.
- `engine.js` – mode gating, input helpers, snapshot runner, trace-table expectations and checker (1 mark per correct row, reports first wrong cell).
- `index.html`, `app.js`, `style.css` – UI: side-by-side Python/Java panes (single pane + toggle at ≤700px), bar visualiser with compare/swap/found/sorted highlights, step/back/play/speed, call-stack view, "Trace it yourself" table, Big O panel, linear-search flowchart (B1.1.4 symbols, inline SVG), Export/Import progress JSON.
- Algorithms: linear & binary search (B2.4.2), bubble & selection sort (B2.4.3), HL: factorial & sum of list recursion (B2.4.5). GCSE toggle adds insertion & merge sort; they are not listed or reachable in IB mode.
- Storage keys: `apexib.trace.settings`, `apexib.trace.progress` (all in try/catch).
- `package.json` (`{"type":"module"}`) only lets node load the ES modules for `tests.mjs`.

## Test
- `node algo-trace/tests.mjs` – 33 checks: each generator's final state and comparison/swap (merge: write) counts vs independent reference for 20 random inputs; checker accepts a correct table and rejects one wrong cell; IB-mode gating; code line maps.
- `python3 -m http.server 8000` then open `/algo-trace/tests.html` (same checks) and `/algo-trace/`.

## Tested
- node tests: 33/33 pass. Headless Chromium (playwright) at 1000px and 360px: zero console errors, no 404s, no horizontal overflow, all algorithms stepped, trace table checked (correct = full marks, one corrupted cell = one mark lost), tests.html passes.
- Note: selenium isn't installed in the build environment, so playwright was used instead. Dev scripts are not committed.
- Insertion "swaps" = shifts; merge "swaps" = writes (labelled in the UI).
