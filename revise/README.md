# Revision Hub (`revise/`)

Live: https://rimtoberts-debug.github.io/revise/

Quizzes (10-question rounds, MCQ and short answer), Leitner flashcards, worked examples with a "your turn" item, and a progress page with Export/Import JSON. Filters: syllabus code, SL/HL (SL hides HL-only items), IB/GCSE. Plain HTML/CSS/ES modules, no build step. localStorage keys use the prefix `apexib.revise.` (`scores`, `cards`, `filters`).

## Files
- `index.html` - page and wiring; `style.css` - imports `../assets/apexib.css`
- `quiz.js` - storage, schema validation, loader, filters, scoring, progress, quiz UI
- `cards.js` - Leitner scheduling (pure, tested) and flashcard UI
- `examples.js` - worked examples
- `tests.html` - unit tests (open it; the summary should read "0 failed")
- `content/` - `index.json`, `syllabus.json`, and content files

## Adding content (no code change)
1. Create `content/<name>.json` containing `{"items":[ ... ]}` (a bare array also works).
2. Add `"<name>.json"` to the `files` array in `content/index.json`.

## Item schema
```json
{ "id":"A1.2.1-001", "code":"A1.2.1", "hl_only":false, "type":"mcq", "level":"both",
  "prompt":"...", "options":["..."], "answer":0, "accept":["..."], "explanation":"...", "steps":["..."] }
```
| Field | Rule |
|---|---|
| `id` | Unique. `<code>-<number>`, e.g. `B2.4.1-002`. |
| `code` | IB guide code, 1 to 3 levels: `A1`, `A1.2`, `A1.2.1` (prefix `A` or `B`). Filters match by prefix on whole segments. |
| `hl_only` | Boolean. An item is also treated as HL-only if its code sits under an HL-only entry in `syllabus.json`, so SL never shows it. |
| `type` | `mcq`, `short`, `flashcard` or `worked`. |
| `level` | `IB`, `GCSE` or `both`. IB mode shows `IB` and `both`; GCSE mode shows `GCSE` and `both`. |
| `prompt` | Required text (line breaks kept). |
| `options`, `answer` | `mcq`: `options` is 2+ strings, `answer` is the zero-based index of the correct one. |
| `answer`, `accept` | `short`: `answer` is a string; `accept` is optional extra accepted strings. Matching ignores case and extra whitespace. `flashcard`: `answer` is the back of the card (`accept` unused). |
| `steps` | `worked`: non-empty array of strings revealed one at a time. The "your turn" item is the first `mcq`/`short` with the same `code` (not the example itself). Show Python and Java, never IB pseudocode. |
| `explanation` | Optional, shown after answering. |

Rules enforced by the loader: IB and `both` items may not mention insertion sort or merge sort (use `level: "GCSE"`). Invalid items, duplicate ids and unreadable files are skipped with `console.warn`; the page keeps working.

`content/syllabus.json` lists topics and subtopics (`code`, `title`, `hl_only`). HL-only subtopics: A1.4, A3.4, A4.2, A4.3, B3.2 and all of B4. Titles are paraphrased; check them against the official guide.

## Study logic
- Quiz scores are stored per item `code`; progress rolls them up by prefix.
- Leitner: boxes 1 to 5 with intervals of 1, 2, 4, 8 and 16 days. Good moves up one box (max 5), Again returns to box 1 and requeues the card in the session. Unseen cards are due. Keys: space = flip, 1 = again, 2 = good.
- Mastery = mean of quiz accuracy and flashcard box progress (box / 5), whichever exist.

## Testing
From the repo root: `python3 -m http.server 8000`, then open `http://localhost:8000/revise/tests.html` (unit tests) and `http://localhost:8000/revise/` (check the console is clean). Headless done-check: load both pages and assert zero console errors and no 404s.
