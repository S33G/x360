const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
themeButton.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('field-guide-theme', root.dataset.theme); } catch { /* Storage is optional. */ }
  renderDiagrams();
});
const menu = document.querySelector('.menu-toggle');
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  document.querySelector('.sidebar').classList.toggle('is-open', expanded);
});
const dialog = document.querySelector('#search-dialog');
const input = document.querySelector('#search-input');
const results = document.querySelector('#search-results');
const status = document.querySelector('#search-status');
let indexPromise;
const openSearch = () => { dialog.showModal(); input.focus(); };
document.querySelector('.search-trigger').addEventListener('click', openSearch);
document.querySelector('#close-search').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog && event.offsetY > dialog.clientHeight) dialog.close(); });
document.addEventListener('keydown', event => {
  if ((event.key === '/' && !/input|textarea|select/i.test(event.target.tagName) && !event.target.isContentEditable) || ((event.metaKey || event.ctrlKey) && event.key === 'k')) {
    event.preventDefault(); if (!dialog.open) openSearch();
  }
});
let queryVersion = 0;
input.addEventListener('input', async () => {
  const version = ++queryVersion;
  const query = input.value.trim().toLowerCase();
  results.replaceChildren();
  if (!query) { status.textContent = 'Search titles and chapter text. Everything stays in your browser.'; return; }
  status.textContent = 'Searching…';
  try {
    indexPromise ||= fetch(document.body.dataset.searchIndex).then(response => { if (!response.ok) throw new Error('Index unavailable'); return response.json(); }).catch(error => { indexPromise = null; throw error; });
    const index = await indexPromise;
    if (version !== queryVersion) return;
    const words = query.split(/\s+/);
    const matches = index.map(page => ({ ...page, score: words.reduce((score, word) => score + (page.title.toLowerCase().includes(word) ? 10 : 0) + (page.text.toLowerCase().includes(word) ? 1 : 0), 0) })).filter(page => words.every(word => `${page.title} ${page.text}`.toLowerCase().includes(word))).sort((a, b) => b.score - a.score).slice(0, 12);
    status.textContent = matches.length ? `${matches.length} matching chapters` : 'No chapters found. Try fewer words or an acronym such as SMC.';
    for (const page of matches) {
      const a = document.createElement('a');
      a.href = `${document.body.dataset.root}${page.url}`;
      const title = document.createElement('strong'); title.textContent = page.title;
      const excerpt = document.createElement('span');
      const position = Math.max(0, page.text.toLowerCase().indexOf(words[0]) - 60);
      excerpt.textContent = `${position ? '…' : ''}${page.text.slice(position, position + 170)}…`;
      a.append(title, excerpt); results.append(a);
    }
  } catch { if (version === queryVersion) status.textContent = 'Search could not load. Use the chapter navigation, or retry.'; }
});
let diagramVersion = 0;
let mermaidPromise;
let renderQueue = Promise.resolve();
async function renderDiagrams() {
  const diagrams = [...document.querySelectorAll('.diagram')];
  if (!diagrams.length) return;
  const version = ++diagramVersion;
  renderQueue = renderQueue.then(async () => {
    const { default: mermaid } = await (mermaidPromise ||= import('mermaid'));
    if (version !== diagramVersion) return;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: root.dataset.theme === 'dark' ? 'dark' : 'default', suppressErrorRendering: true, fontFamily: 'Arial, sans-serif' });
    for (const [index, figure] of diagrams.entries()) {
      const canvas = figure.querySelector('.diagram-canvas');
      try {
        const { svg } = await mermaid.render(`diagram-${version}-${index}`, figure.querySelector('code').textContent);
        if (version !== diagramVersion) return;
        canvas.innerHTML = svg;
        figure.querySelector('details').open = false;
      } catch { canvas.textContent = 'Diagram preview unavailable. The source remains below.'; figure.querySelector('details').open = true; }
    }
  }).catch(() => { /* Source remains readable when the optional renderer fails. */ });
  await renderQueue;
}
renderDiagrams();

if (document.querySelector('.console-model')) {
  import('./console-model.mjs')
    .then(({ mountConsoleModel }) => mountConsoleModel(document.querySelector('.console-model')))
    .catch(() => {
      const model = document.querySelector('.console-model');
      model.dataset.modelState = 'error';
      model.querySelector('.model-status').textContent = '3D preview unavailable. View the model on Sketchfab below.';
    });
}

const picker = document.querySelector('.path-picker');
if (picker) import('./path-picker.mjs').then(({ mountPathPicker }) => mountPathPicker(picker)).catch(() => {
  picker.querySelector('[role=status]').textContent = 'The selector could not load. Use the motherboard table below.';
});
if (matchMedia('(min-width: 701px)').matches) {
  document.querySelector('.sidebar [aria-current=page]')?.scrollIntoView({ block: 'nearest' });
}
