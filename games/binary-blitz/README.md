# Binary Blitz

60-second conversion game for IB CS A1.2.1 (binary/hex integer representation), also valid for GCSE.
Live: https://rimtoberts-debug.github.io/games/binary-blitz/

## What it does
- Rounds: dec→bin, bin→dec, hex→dec, dec→hex, bin→hex; each question is tagged A1.2.1.
- 4/8/16-bit modes; +10 per correct answer, streak multiplier x1/x2/x3 (streak 0-2/3-5/6+); no penalty, wrong answers show the correct one for 1.5 s.
- End screen lists missed questions with worked steps. Best score per mode saved in `localStorage` (`apexib.blitz.best.<bits>`); Export/Import progress as JSON.
- On-screen keypad (0-9, A-F, Backspace, Enter) plus full keyboard. Animations are disabled under `prefers-reduced-motion`.

## Files
`index.html`, `style.css` (imports `../../assets/apexib.css`), `game.js` (UI/timer), `convert.js` (pure logic), `tests.mjs`.

## Test
- Unit tests (all of 0-65535 round-trips, question/answer checks): `node games/binary-blitz/tests.mjs`
- Page: serve the repo root (e.g. `python3 -m http.server 8000`), open `/games/binary-blitz/`; expect zero console errors and no 404s. Verified headlessly at 360px width, including a full 60 s round ending exactly once and the best score persisting.
