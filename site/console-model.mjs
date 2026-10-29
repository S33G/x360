import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createConsoleGeometry(mesh) {
  const { positions, indices } = mesh || {};
  const vertices = positions?.length / 3;
  if (!Array.isArray(positions) || positions.length < 9 || positions.length % 3 ||
      !positions.every(value => Number.isFinite(value) && Number.isFinite(Math.fround(value))) ||
      !Array.isArray(indices) || indices.length < 3 || indices.length % 3 ||
      !indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices)) {
    throw new Error('Invalid console mesh');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  if (!geometry.boundingSphere.radius) {
    geometry.dispose();
    throw new Error('Empty console mesh');
  }
  return geometry;
}

function createThreeViewer(canvas, geometry, changed) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  renderer.setClearColor(0x000000, 0);
  geometry.computeVertexNormals();
  const surfaceMaterial = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide, shininess: 28, polygonOffset: true,
    polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  // Crease and boundary edges retain the ports and controls without drawing
  // every triangulation seam across the smooth shell.
  const edgeGeometry = new THREE.EdgesGeometry(geometry, 24);
  const edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.78, depthWrite: false });
  const outlineMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.24, depthWrite: false });
  const outline = new THREE.Mesh(geometry, outlineMaterial);
  outline.scale.setScalar(1.003);
  scene.add(outline, new THREE.Mesh(geometry, surfaceMaterial), new THREE.LineSegments(edgeGeometry, edgeMaterial));
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(3, 5, 4);
  scene.add(light);
  const updatePalette = () => {
    const style = getComputedStyle(canvas);
    const accent = new THREE.Color(style.getPropertyValue('--lime').trim());
    const background = new THREE.Color(style.getPropertyValue('--bg').trim());
    surfaceMaterial.color.copy(background).lerp(accent, 0.045);
    surfaceMaterial.specular.copy(accent).multiplyScalar(0.22);
    edgeMaterial.color.copy(accent);
    outlineMaterial.color.copy(accent);
    changed();
  };
  const theme = new MutationObserver(updatePalette);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  updatePalette();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const center = geometry.boundingSphere.center;
  camera.position.copy(center).add(new THREE.Vector3(0.65, 0.24, 1).normalize());
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.autoRotateSpeed = 0.8;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.addEventListener('change', () => { if (controls.enabled) changed(); });
  let fitDistance = 1;
  return {
    render() { renderer.render(scene, camera); },
    rotate(seconds) { controls.update(seconds); },
    setPaused(enabled) {
      controls.enabled = false;
      controls.autoRotate = !enabled;
      canvas.style.touchAction = 'pan-y';
      canvas.style.cursor = 'default';
    },
    resize(width, height) {
      camera.aspect = width / height;
      const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfFov = Math.min(halfVertical, Math.atan(Math.tan(halfVertical) * camera.aspect));
      const distance = geometry.boundingSphere.radius * 1.12 / Math.sin(halfFov);
      camera.position.sub(center).multiplyScalar(distance / fitDistance).add(center);
      fitDistance = distance;
      controls.minDistance = distance * 0.65;
      controls.maxDistance = distance * 2;
      camera.far = distance * 10;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      // Keep resize itself still; automatic rotation happens only in the frame loop.
      const autoRotate = controls.autoRotate;
      controls.autoRotate = false;
      controls.update();
      controls.autoRotate = autoRotate;
    },
    dispose() {
      controls.dispose();
      theme.disconnect();
      geometry.dispose(); edgeGeometry.dispose();
      surfaceMaterial.dispose(); outlineMaterial.dispose(); edgeMaterial.dispose();
      renderer.dispose();
    },
  };
}

// The viewer factory keeps WebGL ownership separate from loading and page lifecycle.
export function mountConsoleModel(container, createViewer = createThreeViewer) {
  const stage = container.querySelector('.model-stage');
  const status = container.querySelector('.model-status');
  const button = container.querySelector('.model-pause');
  const canvas = document.createElement('canvas');
  canvas.className = 'model-frame';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rotating Xbox 360 with green contour lines.');
  container.querySelector('iframe')?.remove();
  stage.prepend(canvas);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  const request = new AbortController();
  const events = { signal: lifetime.signal };
  let viewer, frame, timeout, deadline, last = 0;
  let phase = 'loading', visible = true, suspended = false;
  let remaining = 45000, paused = reducedMotion.matches, userPaused = false;
  const active = () => phase === 'ready' && visible && !document.hidden && !suspended;
  const halt = () => { cancelAnimationFrame(frame); frame = undefined; last = 0; };
  const syncButton = () => {
    button.textContent = paused ? 'Rotate model' : 'Pause rotation';
    button.setAttribute('aria-pressed', String(paused));
  };
  const releaseViewer = () => { viewer?.dispose(); viewer = undefined; };
  const fail = () => {
    if (phase === 'error' || phase === 'disposed') return;
    phase = 'error';
    halt(); clearTimeout(timeout); request.abort(); releaseViewer();
    container.dataset.modelState = 'error';
    status.textContent = '3D preview unavailable. Source and attribution are below.';
    button.disabled = true;
  };
  const paint = () => {
    if (!active()) return;
    try { viewer.render(); } catch { fail(); }
  };
  const tick = now => {
    frame = undefined;
    if (!active() || paused) return;
    const elapsed = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    try { viewer.rotate(elapsed); viewer.render(); } catch { fail(); return; }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    halt();
    viewer?.setPaused(active() && paused);
    if (!active()) return;
    paint();
    if (phase === 'ready' && !paused) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    if (phase !== 'ready' || suspended) return;
    try { viewer.resize(Math.max(1, stage.clientWidth), Math.max(1, stage.clientHeight)); } catch { fail(); return; }
    paint();
  };
  const armTimeout = () => {
    clearTimeout(timeout);
    deadline = performance.now() + remaining;
    timeout = setTimeout(fail, remaining);
  };
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const sizes = new ResizeObserver(resize);
  const observe = () => { intersection.observe(container); sizes.observe(stage); };
  const dispose = () => {
    if (phase === 'disposed') return;
    phase = 'disposed';
    halt(); clearTimeout(timeout); request.abort(); lifetime.abort();
    intersection.disconnect(); sizes.disconnect(); releaseViewer(); canvas.remove();
  };
  button.addEventListener('click', () => {
    if (phase !== 'ready') return;
    paused = !paused; userPaused = paused; syncButton(); sync();
  }, events);
  reducedMotion.addEventListener('change', event => { paused = userPaused || event.matches; syncButton(); sync(); }, events);
  document.addEventListener('visibilitychange', sync, events);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); }, events);
  window.addEventListener('pagehide', event => {
    if (event.persisted === false) { dispose(); return; }
    suspended = true; halt(); viewer?.setPaused(false);
    if (phase === 'loading') remaining = Math.max(0, deadline - performance.now());
    clearTimeout(timeout); intersection.disconnect(); sizes.disconnect();
  }, events);
  window.addEventListener('pageshow', () => {
    if (phase === 'disposed') return;
    suspended = false; observe(); resize(); sync();
    if (phase === 'loading') armTimeout();
  }, events);
  syncButton(); observe(); armTimeout();
  const meshUrl = new URL(`${document.body.dataset.root}assets/console-mesh.json`, document.baseURI);
  fetch(meshUrl, { signal: request.signal }).then(async response => {
    if (phase !== 'loading') return;
    if (!response.ok) throw new Error('Console mesh unavailable');
    const mesh = await response.json();
    if (phase !== 'loading') return;
    const geometry = createConsoleGeometry(mesh);
    try { viewer = createViewer(canvas, geometry, paint); } catch (error) { geometry.dispose(); throw error; }
    phase = 'ready'; clearTimeout(timeout);
    container.dataset.modelState = 'ready'; status.textContent = ''; button.disabled = false;
    resize(); sync();
  }).catch(fail);
  return dispose;
}
