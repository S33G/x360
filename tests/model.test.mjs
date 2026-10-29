import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../site/console-model.mjs';

const triangle = { positions: [-1, 0, 0, 1, 0, 0, 0, 3, 0], indices: [0, 1, 2] };
const settle = () => new Promise(resolve => setImmediate(resolve));

function fixture(t, { reduced = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const window = new EventTarget(), document = new EventTarget(), motion = new EventTarget();
  Object.assign(document, { hidden: false, baseURI: 'https://example.test/x360/docs/index.html', body: { dataset: { root: '../' } }, head: { append() {} } });
  motion.matches = reduced;
  const button = new EventTarget(), canvas = new EventTarget();
  button.disabled = true;
  button.setAttribute = () => {};
  Object.assign(canvas, { style: {}, setAttribute() {}, remove() {} });
  document.createElement = () => canvas;
  const status = { textContent: 'Loading…' };
  const stage = { clientWidth: 500, clientHeight: 400, prepend() {} };
  const container = { dataset: { modelState: 'loading' }, querySelector: s => ({ '.model-stage': stage, '.model-status': status, '.model-pause': button, iframe: { remove() {} } })[s] };
  const observers = [], frames = new Map(), requests = [];
  let nextFrame = 0, clock = 0, resolveFetch, resolveJson, view;
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.target = undefined; }
    notify(entry) { if (this.target) this.callback([{ target: this.target, ...entry }]); }
  }
  const globals = {
    window, document, matchMedia: () => motion, devicePixelRatio: 1,
    IntersectionObserver: Observer, ResizeObserver: Observer, performance: { now: () => clock },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    fetch(url, options) { requests.push({ url, options }); return new Promise(resolve => { resolveFetch = resolve; }); },
  };
  const restore = [];
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    restore.push(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
  const dispose = model.mountConsoleModel(container, (_canvas, geometry, changed) => {
    view = { rotation: 0, paints: 0, paused: false, disposed: false, size: [],
      render() { this.paints++; }, rotate(delta) { this.rotation += delta; },
      resize(...size) { this.size = size; }, setPaused(enabled) { this.paused = enabled; },
      dispose() { this.disposed = true; geometry.dispose(); }, changed };
    return view;
  });
  t.after(() => { dispose?.(); restore.forEach(undo => undo()); });
  return {
    container, button, status, canvas, stage, requests, get view() { return view; },
    async response({ ok = true, deferredJson = false, data = triangle } = {}) {
      resolveFetch?.({ ok, json: () => deferredJson ? new Promise(resolve => { resolveJson = resolve; }) : Promise.resolve(data) });
      await settle();
    },
    async json() { resolveJson?.(triangle); await settle(); },
    frame() { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); },
    wait(ms) { clock += ms; t.mock.timers.tick(ms); },
    hide(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); },
    intersect(visible) { observers.find(o => o.target === container)?.notify({ isIntersecting: visible }); },
    resize() { observers.find(o => o.target === stage)?.notify({}); },
    page(type) { window.dispatchEvent(Object.assign(new Event(type), { persisted: true })); },
    motion(matches) { motion.matches = matches; motion.dispatchEvent(Object.assign(new Event('change'), { matches })); },
  };
}

test('mesh validation preserves indexed geometry and rejects unsafe or malformed input', () => {
  assert.equal(typeof model.createConsoleGeometry, 'function');
  const geometry = model.createConsoleGeometry(triangle);
  assert.equal(geometry.getAttribute('position').count, 3);
  assert.deepEqual([...geometry.getIndex().array], [0, 1, 2]);
  geometry.dispose();
  for (const bad of [null, { positions: [], indices: [] }, { ...triangle, positions: [NaN, ...triangle.positions.slice(1)] }, { ...triangle, indices: [0, 1, 3] }, { ...triangle, indices: [0, 1, 1.5] }, { ...triangle, indices: [0, 1] }]) {
    assert.throws(() => model.createConsoleGeometry(bad));
  }
});

test('the viewer loads the local mesh beneath a nested deployment path', async t => {
  const f = fixture(t);
  assert.equal(f.requests.length, 1);
  assert.equal(String(f.requests[0].url), 'https://example.test/x360/assets/console-mesh.json');
  await f.response();
  assert.equal(f.container.dataset.modelState, 'ready');
  assert.equal(f.button.disabled, false);
  f.frame(); f.frame();
  assert.ok(f.view.rotation > 0);
  assert.ok(f.view.paints > 0);
});

for (const phase of ['fetch', 'JSON decoding']) {
  test(`timeout remains terminal after late ${phase}`, async t => {
    const f = fixture(t);
    if (phase === 'JSON decoding') await f.response({ deferredJson: true });
    f.wait(45000);
    assert.equal(f.container.dataset.modelState, 'error');
    assert.equal(f.requests[0].options.signal.aborted, true);
    if (phase === 'fetch') await f.response(); else await f.json();
    f.page('pageshow'); f.hide(false); f.frame();
    assert.equal(f.container.dataset.modelState, 'error');
    assert.equal(f.button.disabled, true);
    assert.equal(f.view, undefined);
  });
}

for (const response of [{ ok: false }, { data: { positions: [], indices: [] } }]) {
  test(`invalid local response falls back (${response.ok === false ? 'HTTP error' : 'mesh error'})`, async t => {
    const f = fixture(t);
    await f.response(response);
    assert.equal(f.container.dataset.modelState, 'error');
    assert.match(f.status.textContent, /unavailable/);
    assert.equal(f.view, undefined);
  });
}

test('reduced motion stays paused until explicit rotation', async t => {
  const f = fixture(t, { reduced: true });
  await f.response();
  f.frame(); f.frame();
  assert.equal(f.view.rotation, 0);
  assert.equal(f.view.paused, true);
  const painted = f.view.paints;
  f.view.changed();
  assert.ok(f.view.paints > painted);
  f.button.dispatchEvent(new Event('click'));
  f.frame(); f.frame();
  assert.ok(f.view.rotation > 0);
  assert.equal(f.view.paused, false);
});

test('hidden and offscreen viewers stop work then resume, including after repeated restoration', async t => {
  const f = fixture(t);
  await f.response();
  for (const hide of [value => f.hide(value), value => f.intersect(!value)]) {
    f.frame(); f.frame();
    hide(true);
    const rotation = f.view.rotation, paints = f.view.paints;
    f.frame(); f.frame();
    assert.equal(f.view.rotation, rotation);
    assert.equal(f.view.paints, paints);
    hide(false);
    f.frame(); f.frame();
    assert.ok(f.view.rotation > rotation);
  }
  for (let visit = 0; visit < 2; visit++) {
    f.page('pagehide');
    const rotation = f.view.rotation;
    f.frame();
    assert.equal(f.view.rotation, rotation);
    f.page('pageshow'); f.frame(); f.frame();
    assert.ok(f.view.rotation > rotation);
    f.intersect(false);
    const offscreen = f.view.rotation;
    f.frame(); f.frame();
    assert.equal(f.view.rotation, offscreen);
    f.intersect(true);
  }
});

test('restoration retains a loading deadline and resize updates the viewport', async t => {
  const f = fixture(t);
  f.page('pagehide'); f.wait(60000);
  assert.equal(f.container.dataset.modelState, 'loading');
  f.page('pageshow');
  await f.response();
  f.stage.clientWidth = 320;
  f.resize();
  assert.equal(f.view.size[0], 320);
  f.wait(45000);
  assert.equal(f.container.dataset.modelState, 'ready');
});

test('restored loading eventually fails if the local response never arrives', t => {
  const f = fixture(t);
  f.page('pagehide'); f.wait(60000); f.page('pageshow'); f.wait(45000);
  assert.equal(f.container.dataset.modelState, 'error');
});

test('manual pause survives preference changes and context loss releases the viewer', async t => {
  const f = fixture(t);
  await f.response(); f.frame(); f.frame();
  f.button.dispatchEvent(new Event('click'));
  const rotation = f.view.rotation;
  f.motion(true); f.motion(false); f.frame(); f.frame();
  assert.equal(f.view.rotation, rotation);
  const event = new Event('webglcontextlost', { cancelable: true });
  f.canvas.dispatchEvent(event);
  assert.equal(f.container.dataset.modelState, 'error');
  assert.equal(f.view.disposed, true);
  f.frame();
  assert.equal(f.view.rotation, rotation);
});
