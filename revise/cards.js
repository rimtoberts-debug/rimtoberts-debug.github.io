// Leitner flashcards: boxes 1-5 with due dates. Scheduling functions are pure (tested in tests.html).
import { h, lsGet, lsSet } from './quiz.js';

export const DAY = 86400000;
export const INTERVALS = [1, 2, 4, 8, 16]; // days until due, indexed by box - 1
export const MAX_BOX = 5;

export const newCard = (now) => ({ box: 1, due: now });
export const isDue = (card, now) => !card || card.due <= now; // unseen cards are due
/** grade: 'again' -> box 1; 'good' -> next box (capped at 5). */
export function review(card, grade, now) {
  const box = grade === 'again' ? 1 : Math.min(MAX_BOX, (card ? card.box : 1) + 1);
  return { box, due: now + INTERVALS[box - 1] * DAY };
}
/** Due flashcards ordered by lowest box, then earliest due. */
export function dueCards(items, cards, now) {
  return items
    .filter((i) => i.type === 'flashcard' && isDue(cards[i.id], now))
    .sort((a, b) => ((cards[a.id] || { box: 0 }).box - (cards[b.id] || { box: 0 }).box) ||
      ((cards[a.id] || { due: 0 }).due - (cards[b.id] || { due: 0 }).due));
}
export const boxCounts = (items, cards) => {
  const c = [0, 0, 0, 0, 0, 0]; // index 0 = new
  items.filter((i) => i.type === 'flashcard').forEach((i) => { c[cards[i.id] ? cards[i.id].box : 0]++; });
  return c;
};

export function mountCards(root, getItems) {
  let queue = [], flipped = false, cur = null, total = 0, done = 0;
  const cards = () => lsGet('cards', {});
  const api = {
    active: false,
    flip: () => { if (cur && !flipped) { flipped = true; render(); } },
    rate: (grade) => {
      if (!cur || !flipped) return;
      const all = cards();
      all[cur.id] = review(all[cur.id], grade, Date.now());
      lsSet('cards', all);
      if (grade === 'again') queue.push(cur); else done++;
      next();
    },
    reset: () => { queue = dueCards(getItems(), cards(), Date.now()); total = queue.length; done = 0; next(); },
  };
  function next() { cur = queue.shift() || null; flipped = false; render(); }
  function render() {
    root.replaceChildren();
    const counts = boxCounts(getItems(), cards());
    root.append(h('p', { class: 'meta' }, `Boxes: new ${counts[0]} | ` + [1, 2, 3, 4, 5].map((b) => `${b}: ${counts[b]}`).join(' | ')));
    if (!cur) {
      root.append(h('div', { class: 'card' }, h('p', {}, total ? 'Session complete. No more cards are due.' : 'No flashcards are due for the current filters.'),
        h('button', { type: 'button', onclick: api.reset }, 'Check again')));
      return;
    }
    const c = cards()[cur.id];
    const face = h('div', { class: 'card flash' },
      h('p', { class: 'meta' }, h('span', { class: 'tag' }, cur.code), ' ', cur.hl_only ? h('span', { class: 'tag hl' }, 'HL') : '',
        `Box ${c ? c.box : 'new'} | ${done} of ${total} done`),
      h('p', { class: 'prompt' }, cur.prompt));
    if (!flipped) {
      const b = h('button', { class: 'primary', type: 'button', onclick: api.flip }, 'Flip (space)');
      face.append(b);
      root.append(face);
      if (api.active) b.focus();
    } else {
      face.append(h('p', { class: 'answer' }, cur.answer), cur.explanation ? h('p', { class: 'meta' }, cur.explanation) : '',
        h('div', { class: 'row' },
          h('button', { type: 'button', onclick: () => api.rate('again') }, 'Again (1)'),
          h('button', { class: 'primary', type: 'button', onclick: () => api.rate('good') }, 'Good (2)')));
      root.append(face);
    }
  }
  api.reset();
  return api;
}
