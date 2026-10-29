import { redactReport, type NandReport } from '../nand/core';

const supportedSizes = new Set([0x1000000, 0x1080000]);
const blockBytes = 0x4000;
const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const hex = (value: number): string => `0x${value.toString(16).toUpperCase().padStart(6, '0')}`;
const bytes = (value: number): string => value >= 1024 * 1024 ? `${Number((value / 1024 / 1024).toFixed(2))} MiB` : value >= 1024 ? `${Number((value / 1024).toFixed(2))} KiB` : `${value} B`;
const blockLabel = (status: string): string => status === 'marked-bad' ? 'Bad-block marker present' : status === 'erased' ? 'Erased bytes' : 'Contains data';

/** Mounts a local-only inspector. Return value removes listeners and discards state. */
export function mountNandAnalyzer(container: HTMLElement, workerSource: string): () => void {
  const query = <T extends HTMLElement>(id: string): T => {
    const element = container.querySelector<T>(`#${id}`);
    if (!element) throw new Error('NAND inspector markup is incomplete.');
    return element;
  };
  const form = query<HTMLFormElement>('nand-form');
  const fileInput = query<HTMLInputElement>('nand-file');
  const cpuKeyInput = query<HTMLInputElement>('nand-key');
  const choose = query<HTMLButtonElement>('nand-choose');
  const analyze = query<HTMLButtonElement>('nand-analyze');
  const demoButton = query<HTMLButtonElement>('nand-demo');
  const cancel = query<HTMLButtonElement>('nand-cancel');
  const drop = query('nand-drop');
  const status = query('nand-status');
  const error = query('nand-error');
  const results = query('nand-results');
  const empty = query('nand-empty');
  const canvas = query<HTMLCanvasElement>('nand-map');
  const blockInput = query<HTMLInputElement>('nand-block-index');
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  let selectedFile: File | null = null;
  let report: NandReport | null = null;
  let worker: Worker | null = null;
  let workerUrl: string | null = null;
  let workerTimeout: ReturnType<typeof setTimeout> | undefined;
  let operation = 0;
  let selectedBlock = 0;
  let mapColumns = 64;
  let busy = false;
  let disposed = false;
  let dragDepth = 0;

  function terminateWorker(): void {
    if (workerTimeout) clearTimeout(workerTimeout);
    workerTimeout = undefined;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }

  function setBusy(value: boolean): void {
    busy = value;
    container.dataset.busy = String(value);
    form.setAttribute('aria-busy', String(value));
    for (const control of [choose, demoButton, cpuKeyInput, fileInput]) control.disabled = value;
    analyze.disabled = value || !selectedFile;
    cancel.hidden = !value;
    query('nand-clear').hidden = !value && !selectedFile && !report;
    query('nand-progress').hidden = !value;
  }

  function showError(message: string): void {
    error.textContent = message;
    error.hidden = false;
  }

  function discardReport(): void {
    report = null;
    selectedBlock = 0;
    query('nand-regions').onclick = null;
    results.hidden = true;
    empty.hidden = false;
    for (const id of ['nand-stats', 'nand-regions', 'nand-region-detail', 'nand-block-detail', 'nand-boot', 'nand-smc', 'nand-kv', 'nand-files', 'nand-warnings']) query(id).replaceChildren();
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function cancelOperation(message = 'Cancelled. No result retained.'): void {
    operation += 1;
    terminateWorker();
    cpuKeyInput.value = '';
    discardReport();
    setBusy(false);
    status.textContent = message;
  }

  function clear(): void {
    cancelOperation('Cleared. No file or result loaded.');
    selectedFile = null;
    fileInput.value = '';
    error.hidden = true;
    query('nand-file-heading').textContent = 'Open a NAND image';
    query('nand-file-summary').textContent = 'Drop a file here, or choose one below.';
    analyze.disabled = true;
    query('nand-clear').hidden = true;
    choose.focus();
  }

  function selectFile(file: File | undefined): void {
    if (busy || !file) return;
    cancelOperation('Ready. No file loaded.');
    selectedFile = null;
    error.hidden = true;
    fileInput.value = '';
    if (!supportedSizes.has(file.size)) {
      query('nand-file-heading').textContent = 'Open a NAND image';
      query('nand-file-summary').textContent = 'Drop a file here, or choose one below.';
      showError('Unsupported image size. Use a 16 MiB data-only image (16,777,216 bytes) or a 16.5 MiB small-block raw image (17,301,504 bytes). Other layouts are not inferred or converted.');
      setBusy(false);
      return;
    }
    selectedFile = file;
    query('nand-file-heading').textContent = `${bytes(file.size)} image selected`;
    query('nand-file-summary').textContent = 'Ready to inspect. Add an optional CPU key below, or continue without one.';
    status.textContent = 'Selected locally. Click Inspect file to read it.';
    setBusy(false);
  }

  async function start(useDemo: boolean): Promise<void> {
    if (busy || (!useDemo && !selectedFile)) return;
    let keyText = cpuKeyInput.value.trim();
    cpuKeyInput.value = '';
    error.hidden = true;
    if (!useDemo && keyText && !/^[\da-fA-F]{32}$/.test(keyText)) {
      keyText = '';
      showError('CPU key must contain exactly 32 hexadecimal characters, or be left empty. The field has been cleared.');
      return;
    }
    const cpuKey = !useDemo && keyText ? Uint8Array.from(keyText.match(/../g)!, (pair) => Number.parseInt(pair, 16)) : undefined;
    keyText = '';
    const id = ++operation;
    terminateWorker();
    discardReport();
    setBusy(true);
    status.textContent = useDemo ? 'Building a synthetic image in the local worker…' : 'Reading your file locally…';
    let buffer: ArrayBuffer | undefined;
    try {
      if (!useDemo) buffer = await selectedFile!.arrayBuffer();
      if (id !== operation || disposed) {
        if (buffer) new Uint8Array(buffer).fill(0);
        cpuKey?.fill(0);
        return;
      }
      workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
      const activeWorker = new Worker(workerUrl);
      worker = activeWorker;
      const fail = (): void => {
        if (id !== operation || disposed) return;
        terminateWorker();
        setBusy(false);
        status.textContent = 'Analysis stopped.';
        showError('The local analyzer could not finish. Check that this browser allows local workers and that your file uses a supported layout.');
      };
      activeWorker.onerror = (event): void => { event.preventDefault(); fail(); };
      activeWorker.onmessageerror = fail;
      activeWorker.onmessage = (event: MessageEvent<{ id: number; report?: NandReport; error?: string }>): void => {
        if (id !== operation || event.data.id !== id || disposed) return;
        terminateWorker();
        setBusy(false);
        if (!event.data.report) {
          status.textContent = 'Analysis stopped.';
          showError('This image could not be analyzed. Check its size and format, then try again.');
          return;
        }
        report = redactReport(event.data.report);
        query('nand-clear').hidden = false;
        renderReport(useDemo);
        status.textContent = useDemo ? 'Synthetic demo loaded. No console data used.' : 'Analysis complete. No data uploaded. Identity fields redacted.';
      };
      workerTimeout = setTimeout(fail, 30_000);
      status.textContent = 'Inspecting structure in a local worker…';
      const transfer: Transferable[] = [];
      if (buffer) transfer.push(buffer);
      if (cpuKey) transfer.push(cpuKey.buffer);
      activeWorker.postMessage({ id, buffer, demo: useDemo, cpuKey }, transfer);
    } catch {
      // Detached buffers have already moved into the worker; never copy them back.
      if (buffer?.byteLength) new Uint8Array(buffer).fill(0);
      if (cpuKey?.byteLength) cpuKey.fill(0);
      if (id !== operation || disposed) return;
      terminateWorker();
      setBusy(false);
      status.textContent = 'Analysis stopped.';
      showError('This file could not be read locally. Re-select the file and try again.');
    }
  }

  function table(headers: string[], rows: string[][]): string {
    return `<div class="nand-table-wrap" tabindex="0" role="region" aria-label="Analysis results"><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderReport(isDemo: boolean): void {
    if (!report) return;
    const current = report;
    empty.hidden = true;
    results.hidden = false;
    query('nand-result-label').textContent = isDemo ? 'SYNTHETIC DEMO / NO CONSOLE DATA' : 'LOCAL IMAGE / REDACTED VIEW';
    query('nand-result-title').textContent = current.input.hasSpare ? 'Small-block raw image' : 'Data-only image';
    const stats = [
      ['Image size', bytes(current.input.sizeBytes), `${bytes(current.input.dataBytes)} data · ${current.input.hasSpare ? 'spare bytes present' : 'no spare bytes'}`],
      ['Blocks', current.input.blockCount.toLocaleString('en'), `${current.input.pageCount.toLocaleString('en')} pages · 16 KiB per data block`],
      ['Contains data', current.blockStats.data.toLocaleString('en'), `${current.blockStats.erased.toLocaleString('en')} erased blocks`],
      ['Marker candidates', current.input.hasSpare ? String(current.blockStats.markedBad) : 'N/A', current.input.hasSpare ? 'Not an ECC or health check' : 'Requires spare-area metadata'],
    ];
    query('nand-stats').innerHTML = stats.map(([label, value, detail]) => `<div class="nand-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`).join('');
    const regionList = [
      { name: 'Header area', range: '0x000000 – 0x003FFF', detail: `Conventional header area. Header magic: ${current.header.magic} (${current.header.valid ? 'recognized' : 'unrecognized'}). SMC: ${hex(current.header.smcOffset)}, ${bytes(current.header.smcLength)}.` },
      { name: 'Keyvault window', range: '0x004000 – 0x007FFF', detail: 'Conventional 16 KiB Keyvault window. Encrypted identity data is not exposed in this view; layout assumptions still need verification.' },
      { name: 'Early data', range: '0x008000 – 0x0FFFFF', detail: 'Early data window where bootloader candidates are commonly found. The analyzer checks bounded headers; this strip is not a validated partition map.' },
      { name: 'Remaining data', range: '0x100000 – 0xFFFFFF', detail: 'Remaining data-space region, which may include filesystem contents and unused space. This analyzer does not follow allocation chains or reconstruct files.' },
    ];
    query('nand-regions').innerHTML = regionList.map((region, index) => `<button class="nand-region" type="button" data-region="${index}" aria-pressed="${index === 0}">${escapeHtml(region.name)}<span>${escapeHtml(region.range)}</span></button>`).join('');
    query('nand-region-detail').textContent = regionList[0].detail;
    query('nand-regions').onclick = (event): void => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-region]');
      if (!target || !query('nand-regions').contains(target)) return;
      const selected = Number(target.dataset.region);
      if (!regionList[selected]) return;
      for (const button of query('nand-regions').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button === target));
      query('nand-region-detail').textContent = regionList[selected].detail;
    };
    query('nand-map-count').textContent = `${current.input.blockCount.toLocaleString('en')} blocks · data offsets`;
    blockInput.max = String(current.blocks.length - 1);
    selectBlock(0);
    query('nand-boot').innerHTML = current.bootloaders.length ? table(['Stage', 'Version', 'Data offset', 'Size'], current.bootloaders.map((loader) => [loader.name, String(loader.version), hex(loader.offset), bytes(loader.size)])) : '<p class="nand-no-data">No supported bootloader header candidates found. Absence of a match does not prove absence of a bootloader.</p>';
    query('nand-smc').innerHTML = `<dl><div><dt>SMC status</dt><dd>${escapeHtml(current.smc.status)}</dd></div><div><dt>Board hint</dt><dd>${escapeHtml(current.smc.boardHint ?? 'Unavailable')}</dd></div><div><dt>Version hint</dt><dd>${escapeHtml(current.smc.version ?? 'Unavailable')}</dd></div><div><dt>Data offset</dt><dd>${escapeHtml(hex(current.smc.offset))}</dd></div><div><dt>Length</dt><dd>${escapeHtml(bytes(current.smc.length))}</dd></div></dl><p class="nand-smc-note">SMC bytes provide a hint, not physical motherboard identification or exploit compatibility.</p>`;
    const kvLabels = { 'not-requested': 'Not requested', plausible: 'Plausible only', implausible: 'Not plausible', unavailable: 'Unavailable' };
    const kvNotes = { 'not-requested': 'No CPU key supplied. The encrypted window was not decoded.', plausible: 'The decoded bytes passed a limited plausibility check. This does not authenticate the Keyvault or prove that the key is correct.', implausible: 'Decoded bytes did not pass the limited plausibility check. No conclusion about console ownership or overall dump health follows.', unavailable: 'The conventional Keyvault window could not be checked.' };
    query('nand-kv').innerHTML = `<div class="nand-kv-heading"><strong>Keyvault</strong><span class="nand-pill">${escapeHtml(kvLabels[current.keyvault.status])}</span></div><p>${escapeHtml(kvNotes[current.keyvault.status])}</p>${current.keyvault.fields ? `<dl>${Object.keys(current.keyvault.fields).map((name) => `<div><dt>${escapeHtml(name)}</dt><dd>Redacted</dd></div>`).join('')}</dl>` : ''}`;
    const fsLabels = { 'metadata-only': 'Metadata candidates', 'not-found': 'No directory candidate', unavailable: 'Not interpreted' };
    query('nand-fs-status').textContent = `${fsLabels[current.fileSystem.status]} · Spare layout: ${current.input.spareLayout}`;
    const entries = current.fileSystem.entries.slice(0, 128);
    query('nand-files').innerHTML = entries.length ? table(['Entry', 'Name', 'Start block', 'Reported length'], entries.map((entry, index) => [String(index + 1).padStart(2, '0'), 'Redacted', String(entry.startBlock), bytes(entry.length)])) + (current.fileSystem.entries.length > entries.length ? `<p class="nand-footnote">Showing ${entries.length} of ${current.fileSystem.entries.length} entries. The redacted JSON export contains the full result.</p>` : '') : `<p class="nand-no-data">${current.input.hasSpare ? 'No directory entries found by the supported metadata parser.' : 'A data-only image has no spare bytes for this directory-root heuristic.'}</p>`;
    query('nand-warnings').innerHTML = current.warnings.length ? current.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('') : '<li>No parser warnings. This is not a validation of signatures, ECC, filesystem integrity or bootability.</li>';
    requestAnimationFrame(drawMap);
  }

  function selectBlock(index: number): void {
    if (!report?.blocks.length) return;
    selectedBlock = Math.max(0, Math.min(report.blocks.length - 1, Math.trunc(index) || 0));
    blockInput.value = String(selectedBlock);
    const block = report.blocks[selectedBlock];
    query('nand-block-detail').innerHTML = `<strong>Block ${block.index}</strong> · ${escapeHtml(blockLabel(block.status))}<br>${escapeHtml(hex(block.index * blockBytes))} – ${escapeHtml(hex((block.index + 1) * blockBytes - 1))} · data-space offsets`;
    query<HTMLButtonElement>('nand-block-prev').disabled = selectedBlock === 0;
    query<HTMLButtonElement>('nand-block-next').disabled = selectedBlock === report.blocks.length - 1;
    canvas.setAttribute('aria-label', `Interactive block map. Block ${block.index} selected: ${blockLabel(block.status)}. Use arrow keys, Home or End to move.`);
    drawMap();
  }

  function drawMap(): void {
    if (!report || disposed || results.hidden) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * scale);
    canvas.height = Math.round(bounds.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const style = getComputedStyle(container);
    const color = (name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback;
    const colors = { data: color('--nand-accent', '#c0f16a'), erased: color('--nand-line', '#30382e'), bad: color('--nand-warn', '#dfad62'), bg: color('--nand-bg', '#121512'), ink: color('--nand-ink', '#f1f3e9') };
    mapColumns = bounds.width >= 540 ? 64 : 32;
    const rows = Math.ceil(report.blocks.length / mapColumns);
    const cellWidth = bounds.width / mapColumns;
    const cellHeight = bounds.height / rows;
    context.clearRect(0, 0, bounds.width, bounds.height);
    for (let index = 0; index < report.blocks.length; index += 1) {
      const block = report.blocks[index];
      const x = (index % mapColumns) * cellWidth;
      const y = Math.floor(index / mapColumns) * cellHeight;
      context.fillStyle = block.status === 'data' ? colors.data : block.status === 'marked-bad' ? colors.bad : colors.erased;
      context.globalAlpha = block.status === 'erased' ? .55 : .78;
      context.fillRect(x + 1.5, y + 1.5, cellWidth - 3, cellHeight - 3);
      context.globalAlpha = 1;
      if (block.status === 'marked-bad') {
        context.strokeStyle = colors.bg;
        context.lineWidth = 1;
        context.beginPath(); context.moveTo(x + 3, y + 3); context.lineTo(x + cellWidth - 3, y + cellHeight - 3); context.moveTo(x + cellWidth - 3, y + 3); context.lineTo(x + 3, y + cellHeight - 3); context.stroke();
      }
      if (index === selectedBlock) {
        context.strokeStyle = colors.ink;
        context.lineWidth = 1.5;
        context.strokeRect(x + .8, y + .8, cellWidth - 1.6, cellHeight - 1.6);
      }
    }
  }

  choose.addEventListener('click', () => fileInput.click(), listenerOptions);
  fileInput.addEventListener('change', () => selectFile(fileInput.files?.[0]), listenerOptions);
  form.addEventListener('submit', (event) => { event.preventDefault(); void start(false); }, listenerOptions);
  demoButton.addEventListener('click', () => void start(true), listenerOptions);
  cancel.addEventListener('click', () => cancelOperation(), listenerOptions);
  query('nand-clear').addEventListener('click', clear, listenerOptions);
  drop.addEventListener('dragenter', (event) => { event.preventDefault(); dragDepth += 1; if (!busy) drop.classList.add('is-dragging'); }, listenerOptions);
  drop.addEventListener('dragover', (event) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }, listenerOptions);
  drop.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) drop.classList.remove('is-dragging'); }, listenerOptions);
  drop.addEventListener('drop', (event) => {
    event.preventDefault(); dragDepth = 0; drop.classList.remove('is-dragging');
    if (busy) return;
    if (event.dataTransfer?.files.length !== 1) { showError('Choose one NAND image at a time.'); return; }
    selectFile(event.dataTransfer.files[0]);
  }, listenerOptions);
  canvas.addEventListener('click', (event) => {
    if (!report) return;
    const bounds = canvas.getBoundingClientRect();
    const columns = mapColumns;
    const rows = Math.ceil(report.blocks.length / columns);
    selectBlock(Math.floor((event.clientY - bounds.top) / bounds.height * rows) * columns + Math.floor((event.clientX - bounds.left) / bounds.width * columns));
  }, listenerOptions);
  canvas.addEventListener('keydown', (event) => {
    if (!report) return;
    const destinations: Record<string, number> = { ArrowLeft: selectedBlock - 1, ArrowRight: selectedBlock + 1, ArrowUp: selectedBlock - mapColumns, ArrowDown: selectedBlock + mapColumns, Home: 0, End: report.blocks.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault(); selectBlock(destinations[event.key]);
  }, listenerOptions);
  blockInput.addEventListener('change', () => selectBlock(Number(blockInput.value)), listenerOptions);
  blockInput.addEventListener('input', () => {
    if (blockInput.value !== '' && Number.isInteger(Number(blockInput.value))) selectBlock(Number(blockInput.value));
  }, listenerOptions);
  query('nand-block-prev').addEventListener('click', () => selectBlock(selectedBlock - 1), listenerOptions);
  query('nand-block-next').addEventListener('click', () => selectBlock(selectedBlock + 1), listenerOptions);
  query('nand-export').addEventListener('click', () => {
    if (!report) return;
    const safeReport = redactReport(report);
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(safeReport, null, 2)}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'x360-analysis.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    status.textContent = 'Redacted report exported. Treat the file as private console data.';
  }, listenerOptions);
  const resizeObserver = new ResizeObserver(drawMap);
  resizeObserver.observe(canvas);
  const themeObserver = new MutationObserver(drawMap);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('pagehide', () => {
    cancelOperation('Cleared. No file or result loaded.');
    selectedFile = null;
    fileInput.value = '';
    setBusy(false);
  }, listenerOptions);
  return () => {
    disposed = true;
    operation += 1;
    terminateWorker();
    abortController.abort();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    cpuKeyInput.value = '';
    selectedFile = null;
    fileInput.value = '';
    discardReport();
  };
}
