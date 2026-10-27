# ApexIB Labs — rimtoberts-debug.github.io

Free IB Computer Science (2025 syllabus, first exams May 2027) study tools, served by GitHub Pages from `main` at https://rimtoberts-debug.github.io/.

## Shared rules
- Stack: plain HTML, CSS, vanilla JS (ES modules). No build step, no npm runtime deps, no frameworks.
- One tool per folder: `ia-planner/`, `algo-trace/`, `revise/`, `code-check/`, `games/binary-blitz/`. A session edits ONLY its own folder.
- Frozen (do not edit): `index.html`, `about.html`, `ai.html` (owner's personal pages), `labs.html`, `assets/`, `privacy.html`, this file.
- Each tool page links `../assets/apexib.css` (or `../../assets/apexib.css` for games/) and has a "← ApexIB Labs" link to `labs.html`. Use relative paths only.
- Storage: localStorage only, keys `apexib.<tool>.<name>`, every access in try/catch. Each tool offers Export/Import progress as JSON.
- No accounts, analytics, trackers or external fonts. CDN scripts only from cdn.jsdelivr.net, pinned to an exact version.
- Content keyed to IB guide codes (e.g. `B2.4.3`) with an `hl_only` flag. IB mode never includes insertion or merge sort. No IB pseudocode: show Python and Java. No Paper 3 (removed for 2027).
- Footer on every page: "ApexIB is independent and not affiliated with or endorsed by the International Baccalaureate Organization." Never reproduce IB past papers or markschemes.
- Accessibility: keyboard operable, visible focus, AA contrast, works at 360px, light/dark via prefers-color-scheme.
- Done-check: from the repo root run `python3 -m http.server 8000`, load `http://localhost:8000/<folder>/` headlessly (selenium + preinstalled chromedriver), assert zero console errors and no 404s. Add `<folder>/README.md` saying what was built and how to test it.
- Dev-only tooling stays out of the site: `node_modules/` is gitignored.
