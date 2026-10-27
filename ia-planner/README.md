# IA Planner

For the IB CS Internal Assessment (computational solution), first assessed May 2027 onward. Not for the Nov 2026 client-based IA.

Organiser only: it never generates documentation text or code, uses no AI and makes no external network calls (it reads its own `content.json`).

Built: criteria A-E with marks, word budgets, guidance checklists and live word counts (2,000 cap; code fences, `//` and `#` lines and `[diagram: ...]` excluded); success-criteria builder (measurability warning) feeding plan rows, test plan and evaluation table; decomposition with CSS Gantt; code-excerpt register; video checklist; JSON export/import; print outline. Storage key: `apexib.ia.data`.

Test:
- Unit: `node ia-planner/tests/wordcount.test.mjs`
- Browser: from repo root `python3 -m http.server 8000`, open `http://localhost:8000/ia-planner/` (zero console errors, works at 360px).
