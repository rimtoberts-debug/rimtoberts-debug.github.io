// Worked examples: reveal steps one at a time, then a "your turn" practice item with the same code.
import { h, renderQuestion, practiceFor } from './quiz.js';

export function mountExamples(root, getItems, getAll) {
  const list = () => getItems().filter((i) => i.type === 'worked');
  function render(sel) {
    root.replaceChildren();
    const items = list();
    if (!items.length) { root.append(h('p', {}, 'No worked examples match the current filters.')); return; }
    const picker = h('select', { 'aria-label': 'Choose a worked example', onchange: (e) => render(e.target.value) },
      items.map((i) => h('option', { value: i.id, selected: i.id === sel }, `${i.code}: ${i.prompt.slice(0, 60)}`)));
    const item = items.find((i) => i.id === sel) || items[0];
    root.append(h('p', {}, picker));
    const card = h('div', { class: 'card' },
      h('p', { class: 'meta' }, h('span', { class: 'tag' }, item.code), ' ', item.hl_only ? h('span', { class: 'tag hl' }, 'HL') : ''),
      h('p', { class: 'prompt' }, item.prompt));
    const ol = h('ol', { class: 'steps', 'aria-live': 'polite' });
    const turn = h('div', { class: 'turn' });
    let shown = 0;
    const btn = h('button', { class: 'primary', type: 'button', onclick: () => {
      ol.append(h('li', {}, item.steps[shown++]));
      if (shown >= item.steps.length) {
        btn.hidden = true;
        if (item.explanation) card.append(h('p', { class: 'meta' }, item.explanation));
        showTurn();
      } else btn.textContent = `Reveal next step (${shown + 1} of ${item.steps.length})`;
    } }, `Reveal first step (1 of ${item.steps.length})`);
    function showTurn() {
      const p = practiceFor(item, getItems(), getAll());
      turn.append(h('h3', {}, 'Your turn'));
      if (!p) { turn.append(h('p', {}, 'No practice question with this code yet.')); return; }
      renderQuestion(turn, p);
    }
    card.append(ol, btn, turn);
    root.append(card);
    btn.focus();
  }
  render();
  return { render: () => render() };
}
