import { boards, methods } from './paths-data.mjs';
import { compareGlitchMethods } from './method-meta.mjs';

export function getBoardOptions(id) {
  const board = boards.find(item => item.id === id);
  if (!board) return null;
  const matches = methods.filter(method => method.boards.includes(id));
  return {
    board,
    current: matches.filter(method => method.kind === 'software' || method.kind === 'hardware').sort((a, b) => compareGlitchMethods(a.href, b.href)),
    other: matches.filter(method => method.kind === 'historical' || method.kind === 'experimental').sort((a, b) => Number(b.kind === 'experimental') - Number(a.kind === 'experimental') || compareGlitchMethods(a.href, b.href)),
  };
}

export function mountPathPicker(container) {
  const form = container.querySelector('form');
  const select = container.querySelector('select');
  const status = container.querySelector('[role=status]');
  const results = container.querySelector('.path-results');
  const kindNames = { software: 'Software route', hardware: 'Hardware route', historical: 'Legacy method', experimental: 'Beta / experimental' };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const cards = entries => {
    const list = element('div', '', 'path-cards');
    for (const method of entries) {
      const card = element('article', '', 'path-card');
      card.append(element('p', kindNames[method.kind], 'path-kind'));
      const title = element('h3');
      const link = element('a', method.name);
      link.href = method.href;
      title.append(link);
      card.append(title, element('p', method.summary));
      const conditions = element('details');
      conditions.append(element('summary', 'Requirements and persistence'));
      conditions.append(element('p', method.constraints), element('p', method.persistence));
      const source = element('a', 'Source reference ↗');
      source.href = method.sources[0];
      conditions.append(source);
      // Requirements stay visible until a reader deliberately collapses them.
      conditions.open = true;
      card.append(conditions);
      list.append(card);
    }
    return list;
  };
  const update = () => {
    results.replaceChildren();
    const selection = getBoardOptions(select.value);
    if (!selection) {
      status.textContent = select.value === 'unknown'
        ? 'Identify the motherboard first. The case and dashboard number alone are not enough.'
        : 'Choose a motherboard to see documented routes and their requirements.';
      return;
    }
    status.textContent = `${selection.current.length} documented ${selection.current.length === 1 ? 'route' : 'routes'} for ${selection.board.name}. Read the conditions: a board match does not confirm eligibility.`;
    results.append(element('h2', `Options for ${selection.board.name}`), cards(selection.current));
    if (selection.board.id === 'winchester') {
      results.append(element('p', 'Peer Pressure and the documented RGH methods do not support Winchester / Barracuda. Bad Update remains session-based; its entry point and runtime are separate choices.', 'path-note'));
    }
    if (selection.other.length) {
      const more = element('details', '', 'path-alternatives');
      more.append(element('summary', `${selection.other.length} legacy or beta ${selection.other.length === 1 ? 'method' : 'methods'}`), cards(selection.other));
      results.append(more);
    }
    results.append(element('p', 'These are routes to research, not an installation recommendation. Exact bootloader, dashboard, storage and runtime requirements still apply. The comparison below separates exploit access from payload features.', 'path-note'));
  };
  form.addEventListener('submit', event => event.preventDefault());
  select.addEventListener('change', update);
  update();
}
