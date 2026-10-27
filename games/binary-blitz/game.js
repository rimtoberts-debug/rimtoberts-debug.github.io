import { KINDS, LABEL, makeQuestion, check, steps, multiplier } from "./convert.js";

const ROUND_MS = 60000, REVEAL_MS = 1500, PFX = "apexib.blitz.best.";
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const best = (b) => Number(store.get(PFX + b)) || 0;
const show = (id) => ["setup", "play", "end"].forEach((s) => ($(s).hidden = s !== id));
const pulse = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

let st = null; // round state; null when no round is active

function refreshBest() { [4, 8, 16].forEach((b) => ($("best" + b).textContent = `(best ${best(b)})`)); }

function hud() {
  $("score").textContent = st.score;
  $("streak").textContent = st.streak;
  $("mult").textContent = "x" + multiplier(st.streak);
}

function next() {
  const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
  st.q = makeQuestion(kind, st.bits);
  st.input = "";
  st.locked = false;
  $("dir").textContent = `${LABEL[kind][0]} → ${LABEL[kind][1]} (${st.bits}-bit)`;
  $("shown").textContent = st.q.shown;
  $("answer").textContent = "";
  $("fb").textContent = "";
  $("fb").className = "fb";
}

function start() {
  const bits = Number(document.querySelector('input[name="bits"]:checked').value);
  st = { bits, score: 0, streak: 0, right: 0, missed: [], end: performance.now() + ROUND_MS, over: false, timer: null, reveal: null };
  show("play");
  hud();
  next();
  tick();
  st.timer = setInterval(tick, 100);
}

function tick() {
  if (!st || st.over) return;
  const left = st.end - performance.now();
  if (left <= 0) return finish();
  $("secs").textContent = Math.ceil(left / 1000);
  $("barfill").style.transform = `scaleX(${left / ROUND_MS})`;
  $("barfill").classList.toggle("low", left < 10000);
}

function submit() {
  if (!st || st.over || st.locked || !st.input) return;
  st.locked = true;
  if (check(st.q, st.input)) {
    const m = multiplier(st.streak);
    st.score += 10 * m;
    st.streak++;
    st.right++;
    $("fb").textContent = `Correct! +${10 * m}`;
    $("fb").className = "fb ok";
    pulse($("answer"), "pop");
    if (multiplier(st.streak) > m) pulse($("mult"), "streakfx");
    hud();
    st.reveal = setTimeout(next, 250);
  } else {
    st.streak = 0;
    st.missed.push({ q: st.q, given: st.input });
    $("fb").textContent = `Answer: ${st.q.answer}`;
    $("fb").className = "fb bad";
    pulse($("answer"), "shake");
    hud();
    st.reveal = setTimeout(next, REVEAL_MS);
  }
}

function press(k) {
  if (!st || st.over || st.locked) return;
  if (k === "Enter") return submit();
  if (k === "Backspace") st.input = st.input.slice(0, -1);
  else if (st.input.length < 20) st.input += k;
  $("answer").textContent = st.input;
}

function finish() {
  if (!st || st.over) return; // guarantees the round ends exactly once
  st.over = true;
  clearInterval(st.timer);
  clearTimeout(st.reveal);
  const prev = best(st.bits);
  const isBest = st.score > prev;
  if (isBest) store.set(PFX + st.bits, String(st.score));
  $("fscore").textContent = st.score;
  $("fstat").textContent = `${st.right} correct, ${st.missed.length} missed (${st.bits}-bit)`;
  $("fbest").textContent = isBest ? "New best!" : `Best ${prev}`;
  const ol = $("missed");
  ol.replaceChildren();
  if (!st.missed.length) ol.textContent = "None. Nice.";
  for (const { q, given } of st.missed) {
    const li = document.createElement("li");
    li.append(`${LABEL[q.kind][0]} ${q.shown} → ${LABEL[q.kind][1]}: you said "${given}", correct ${q.answer}. `);
    const c = document.createElement("code");
    c.textContent = steps(q);
    li.append(c);
    ol.append(li);
  }
  window.__blitzEnds = (window.__blitzEnds || 0) + 1;
  show("end");
  $("again").focus();
  refreshBest();
}

// keypad
const pad = $("pad");
for (const k of "0123456789ABCDEF") {
  const b = document.createElement("button");
  b.textContent = k; b.type = "button"; b.setAttribute("aria-label", k);
  b.addEventListener("click", () => press(k));
  pad.append(b);
}
for (const [label, key] of [["⌫ Backspace", "Backspace"], ["Enter ⏎", "Enter"]]) {
  const b = document.createElement("button");
  b.textContent = label; b.type = "button"; b.className = "wide" + (key === "Enter" ? " primary" : "");
  b.addEventListener("click", () => press(key));
  pad.append(b);
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (st && !st.over && !$("play").hidden) {
    if (/^[0-9a-f]$/i.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); }
    else if (e.key === "Backspace" || e.key === "Enter") { e.preventDefault(); press(e.key); }
  }
});
$("start").addEventListener("click", start);
$("again").addEventListener("click", () => { show("setup"); $("start").focus(); });

// export / import
$("export").addEventListener("click", () => {
  const data = { tool: "binary-blitz", best: { 4: best(4), 8: best(8), 16: best(16) } };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = "apexib-blitz-progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
$("import").addEventListener("change", async (e) => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    for (const b of [4, 8, 16]) {
      const v = Number(d.best && d.best[b]);
      if (v > best(b)) store.set(PFX + b, String(v));
    }
    $("msg").textContent = "Imported.";
  } catch { $("msg").textContent = "Could not read that file."; }
  e.target.value = "";
  refreshBest();
});

refreshBest();
