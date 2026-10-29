/** Read-only inspection of the two explicitly supported 16 MiB NAND layouts.
 * Format references: https://free60.org/System-Software/NAND_File_System/
 * Boot headers: https://free60.org/System-Software/CB_Code/
 * SMC/KV fields: https://github.com/Octal450/J-Runner-with-Extras/blob/master/J-Runner/Nand/Nand.cs
 * This parser does not authenticate images, repair ECC, remap blocks or classify exploits.
 */
export type BlockStatus = 'data' | 'erased' | 'marked-bad';
export type SpareLayout = 'small-block' | 'big-on-small' | 'unknown' | 'none';
export interface NandReport {
  schemaVersion: '1.0';
  input: { format: 'small-block-raw' | 'data-only'; sizeBytes: number; dataBytes: number; pageCount: number; blockCount: number; hasSpare: boolean; spareLayout: SpareLayout };
  header: { magic: string; valid: boolean; smcOffset: number; smcLength: number };
  bootloaders: { name: string; offset: number; version: number; size: number }[];
  smc: { status: 'decoded' | 'invalid' | 'absent'; boardHint: string | null; version: string | null; offset: number; length: number };
  blocks: { index: number; status: BlockStatus }[];
  blockStats: { data: number; erased: number; markedBad: number };
  fileSystem: { status: 'metadata-only' | 'not-found' | 'unavailable'; rootBlock: number | null; entries: { name: string; length: number; startBlock: number }[] };
  keyvault: { status: 'not-requested' | 'plausible' | 'implausible' | 'unavailable'; fields?: Record<string, string> };
  privacy: { redacted: boolean };
  warnings: string[];
}
export interface AnalysisOptions { cpuKey?: Uint8Array; includeSensitive?: boolean }

export const DATA_BYTES = 0x1000000;
export const RAW_BYTES = 0x1080000;
const PAGE_BYTES = 0x200;
const BLOCK_BYTES = 0x4000;
const BLOCK_COUNT = DATA_BYTES / BLOCK_BYTES;
const REDACTED = '<REDACTED>';
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const ascii = (bytes: Uint8Array) => Array.from(bytes, byte => byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.').join('');
const textField = (bytes: Uint8Array) => ascii(bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0))).trim();

function decodeSmc(bytes: Uint8Array): Uint8Array {
  const state = [0x42, 0x75, 0x4e, 0x79];
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ state[i % 4];
    const change = bytes[i] * 0xfb;
    state[(i + 1) % 4] = (state[(i + 1) % 4] + change) & 255;
    state[(i + 2) % 4] = (state[(i + 2) % 4] + (change >> 8)) & 255;
  }
  return result;
}

function rc4(key: Uint8Array, bytes: Uint8Array): Uint8Array {
  const state = Uint8Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + state[i] + key[i % key.length]) & 255;
    [state[i], state[j]] = [state[j], state[i]];
  }
  const output = new Uint8Array(bytes.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < bytes.length; n++) {
    i = (i + 1) & 255;
    j = (j + state[i]) & 255;
    [state[i], state[j]] = [state[j], state[i]];
    output[n] = bytes[n] ^ state[(state[i] + state[j]) & 255];
  }
  state.fill(0);
  return output;
}

function inferSpareLayout(spare: Uint8Array, blocks: NandReport['blocks']): SpareLayout {
  let original = 0;
  let newer = 0;
  for (const block of blocks) {
    if (block.index === 0 || block.status !== 'data') continue;
    const base = block.index * 32 * 16;
    const oldId = spare[base] | ((spare[base + 1] & 15) << 8);
    const newId = spare[base + 1] | ((spare[base + 2] & 15) << 8);
    if (oldId === block.index && newId !== block.index) original++;
    if (newId === block.index && oldId !== block.index) newer++;
  }
  if (original >= 2 && original > newer * 2) return 'small-block';
  if (newer >= 2 && newer > original * 2) return 'big-on-small';
  return 'unknown';
}

function inspectFileSystem(data: Uint8Array, spare: Uint8Array, report: NandReport, sensitive: boolean): void {
  if (!report.input.hasSpare || report.input.spareLayout === 'unknown' || !report.header.valid) return;
  let root: number | null = null;
  let highest = 0;
  let ambiguous = false;
  const lowByte = report.input.spareLayout === 'small-block' ? 2 : 0;
  for (const block of report.blocks) {
    if (block.status === 'marked-bad') continue;
    for (let page = 0; page < 32; page++) {
      const at = (block.index * 32 + page) * 16;
      if ((spare[at + 12] & 63) !== 0x30) continue;
      const sequence = spare[at + lowByte] + spare[at + 3] * 256 + spare[at + 4] * 65536 + spare[at + 6] * 16777216;
      if (sequence === 0 || sequence === 0xffffffff) continue;
      if (sequence > highest) { highest = sequence; root = block.index; ambiguous = false; }
      else if (sequence === highest && root !== block.index) ambiguous = true;
      break;
    }
  }
  report.fileSystem.status = 'not-found';
  if (root === null) return;
  if (ambiguous) {
    report.warnings.push('Filesystem root candidates have tied sequence numbers; no root was selected.');
    return;
  }
  report.fileSystem = { status: 'metadata-only', rootBlock: root, entries: [] };
  report.warnings.push('Filesystem root is a sequence-number candidate. Wraparound, remapping, allocation chains and file contents are not validated.');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let skipped = 0;
  outer: for (let page = 1; page < 32; page += 2) {
    for (let slot = 0; slot < 16; slot++) {
      const at = root * BLOCK_BYTES + page * PAGE_BYTES + slot * 32;
      const nameBytes = data.subarray(at, at + 22);
      if (nameBytes[0] === 0 || nameBytes.every(byte => byte === 255)) break outer;
      if (nameBytes[0] === 5) continue; // Deleted entry.
      const end = nameBytes.indexOf(0);
      const usedName = nameBytes.subarray(0, end < 0 ? 22 : end);
      const length = view.getUint32(at + 24, false);
      const startBlock = view.getUint16(at + 22, false);
      if (!usedName.every(byte => byte >= 0x20 && byte <= 0x7e) || startBlock >= BLOCK_COUNT || length > DATA_BYTES) { skipped++; continue; }
      report.fileSystem.entries.push({ name: sensitive ? ascii(usedName) : REDACTED, length, startBlock });
    }
  }
  if (skipped) report.warnings.push(`${skipped} malformed filesystem entries were omitted.`);
}

async function inspectKeyvault(data: Uint8Array, cpuKey: Uint8Array, report: NandReport, sensitive: boolean): Promise<void> {
  if (!report.header.valid) { report.keyvault.status = 'unavailable'; return; }
  const declaredOffset = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0x6c, false);
  if (declaredOffset !== 0 && declaredOffset !== 0x4000) {
    report.keyvault.status = 'unavailable';
    report.warnings.push('The declared Keyvault offset is outside the supported fixed 16 KiB layout at data offset 0x4000. Keyvault inspection was skipped.');
    return;
  }
  if (!globalThis.crypto?.subtle) {
    report.keyvault.status = 'unavailable';
    report.warnings.push('Web Crypto is unavailable. Keyvault inspection needs a secure browser context or Node 22+.');
    return;
  }
  // The supported retail layout has a 16 KiB encrypted KV at data offset 0x4000.
  report.warnings.push('Keyvault inspection assumes the supported 16 KiB retail layout at data offset 0x4000.');
  const key = new Uint8Array(cpuKey);
  let derived = new Uint8Array(0);
  let clear = new Uint8Array(0);
  try {
    const imported = await globalThis.crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    derived = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', imported, new Uint8Array(data.subarray(0x4000, 0x4010))));
    clear = new Uint8Array(0x4000);
    clear.set(data.subarray(0x4000, 0x4010));
    const body = rc4(derived.subarray(0, 16), data.subarray(0x4010, 0x8000));
    clear.set(body, 16);
    body.fill(0);
    const serial = ascii(clear.subarray(0xb0, 0xbc));
    if (!/^\d{12}$/.test(serial)) { report.keyvault.status = 'implausible'; return; }
    const protect = (value: string) => sensitive ? value : REDACTED;
    report.keyvault = { status: 'plausible', fields: {
      serial: protect(serial),
      consoleId: protect(hex(clear.subarray(0x9ca, 0x9cf))),
      manufactureDate: protect(textField(clear.subarray(0x9e4, 0x9ec))),
      region: protect(hex(clear.subarray(0xc8, 0xca))),
      opticalDrive: protect(textField(clear.subarray(0xc92, 0xcae))),
      dvdKey: protect(hex(clear.subarray(0x100, 0x110))),
    } };
  } catch {
    report.keyvault = { status: 'unavailable' };
    report.warnings.push('Keyvault cryptography could not complete in this runtime.');
  } finally {
    key.fill(0); derived.fill(0); clear.fill(0);
    report.warnings.push('Keyvault plausibility checks only a serial-number pattern. It does not authenticate the Keyvault, validate the CPU key, or establish ownership.');
  }
}

/** Input and key are borrowed, never changed or retained. No I/O or network access. */
export async function analyzeNand(input: Uint8Array, options: AnalysisOptions = {}): Promise<NandReport> {
  if (!(input instanceof Uint8Array) || (input.length !== DATA_BYTES && input.length !== RAW_BYTES)) {
    throw new Error('Unsupported image size. Expected exactly 16 MiB data-only or 16.5 MiB small-block raw.');
  }
  if (options.cpuKey !== undefined && (!(options.cpuKey instanceof Uint8Array) || options.cpuKey.length !== 16)) {
    throw new Error('Invalid CPU key. Expected exactly 16 bytes.');
  }
  const sensitive = options.includeSensitive === true;
  const hasSpare = input.length === RAW_BYTES;
  const data = new Uint8Array(DATA_BYTES);
  const spare = new Uint8Array(hasSpare ? DATA_BYTES / PAGE_BYTES * 16 : 0);
  if (hasSpare) {
    for (let page = 0; page < DATA_BYTES / PAGE_BYTES; page++) {
      data.set(input.subarray(page * 528, page * 528 + 512), page * 512);
      spare.set(input.subarray(page * 528 + 512, (page + 1) * 528), page * 16);
    }
  } else data.set(input);
  const view = new DataView(data.buffer);
  const magic = hex(data.subarray(0, 2));
  const smcOffset = view.getUint32(0x7c, false);
  const smcLength = view.getUint32(0x78, false);
  const report: NandReport = {
    schemaVersion: '1.0',
    input: { format: hasSpare ? 'small-block-raw' : 'data-only', sizeBytes: input.length, dataBytes: DATA_BYTES, pageCount: DATA_BYTES / PAGE_BYTES, blockCount: BLOCK_COUNT, hasSpare, spareLayout: hasSpare ? 'unknown' : 'none' },
    header: { magic, valid: ['ff4f', '0f3f', '0f4f'].includes(magic), smcOffset, smcLength },
    bootloaders: [],
    smc: { status: 'absent', boardHint: null, version: null, offset: smcOffset, length: smcLength },
    blocks: [], blockStats: { data: 0, erased: 0, markedBad: 0 },
    fileSystem: { status: 'unavailable', rootBlock: null, entries: [] },
    keyvault: { status: 'not-requested' }, privacy: { redacted: !sensitive },
    warnings: ['Geometry is selected by exact file size. A recognized header is not an integrity check; ECC, signatures and block remapping are not verified.'],
  };
  try {
    for (let index = 0; index < BLOCK_COUNT; index++) {
      const marked = hasSpare && (spare[index * 32 * 16 + 5] !== 255 || spare[(index * 32 + 31) * 16 + 5] !== 255);
      const erased = data.subarray(index * BLOCK_BYTES, (index + 1) * BLOCK_BYTES).every(byte => byte === 255);
      const status: BlockStatus = marked ? 'marked-bad' : erased ? 'erased' : 'data';
      report.blocks.push({ index, status });
      report.blockStats[status === 'marked-bad' ? 'markedBad' : status]++;
    }
    if (hasSpare) {
      report.input.spareLayout = inferSpareLayout(spare, report.blocks);
      report.warnings.push('Marked-bad means a candidate from spare byte 5 in the first or last page. It does not prove a factory defect or that a remap is missing. Erased means data bytes are all 0xFF.');
      if (report.input.spareLayout === 'unknown') report.warnings.push('Spare metadata layout could not be inferred confidently; filesystem inspection was skipped.');
      else report.warnings.push('Spare metadata layout is inferred from block IDs and may be wrong for unusual or remapped images.');
    } else report.warnings.push('No spare bytes: bad-block markers and filesystem root metadata are unavailable.');
    if (!report.header.valid) {
      report.smc.status = 'invalid';
      report.warnings.push('Flash header magic is unrecognized; SMC, bootloader and filesystem interpretation was skipped.');
    } else {
      if (smcLength !== 0) {
        if (smcOffset < 0x80 || smcLength < 0x103 || smcLength > 0x10000 || smcOffset > DATA_BYTES - smcLength) {
          report.smc.status = 'invalid';
          report.warnings.push('SMC bounds are invalid or outside the supported inspection limit.');
        } else {
          const decoded = decodeSmc(data.subarray(smcOffset, smcOffset + smcLength));
          const boards = [null, 'Xenon', 'Zephyr', 'Falcon / Opus', 'Jasper', 'Trinity', 'Corona', 'Winchester'];
          report.smc = { status: 'decoded', boardHint: boards[decoded[0x100] >> 4] ?? null, version: `${decoded[0x101]}.${String(decoded[0x102]).padStart(2, '0')}`, offset: smcOffset, length: smcLength };
          decoded.fill(0);
          report.warnings.push('SMC board and version are byte-derived hints. Patched or corrupt firmware can misidentify hardware; no stock-versus-modified conclusion is made.');
        }
      }
      const names = new Set(['CB', 'CD', 'CE', 'CF', 'CG', 'SB', 'SC', 'SD', 'SE', 'SF', 'SG']);
      for (let at = 0x8000; at <= DATA_BYTES - 32; at += 16) {
        const name = String.fromCharCode(data[at], data[at + 1]);
        if (!names.has(name)) continue;
        const version = view.getUint16(at + 2, false);
        const size = view.getUint32(at + 12, false);
        const entry = view.getUint32(at + 8, false);
        if (version === 0 || version === 0xffff || size < 32 || size > DATA_BYTES - at || entry >= size || entry % 4 !== 0) continue;
        report.bootloaders.push({ name, offset: at, version, size });
        if (report.bootloaders.length >= 128) { report.warnings.push('Boot header scan stopped at 128 candidates.'); break; }
        at += Math.ceil(size / 16) * 16 - 16;
      }
      report.warnings.push('Bootloaders are structural candidates from a 16-byte-aligned scan, not an authenticated boot chain or an exploit compatibility verdict.');
      inspectFileSystem(data, spare, report, sensitive);
    }
    if (options.cpuKey) await inspectKeyvault(data, options.cpuKey, report, sensitive);
    return report;
  } finally { data.fill(0); spare.fill(0); }
}

/** Detached JSON-safe copy with all currently supported sensitive fields suppressed. */
export function redactReport(report: NandReport): NandReport {
  const copy: NandReport = JSON.parse(JSON.stringify(report));
  copy.privacy = { redacted: true };
  for (const entry of copy.fileSystem.entries) entry.name = REDACTED;
  if (copy.keyvault.fields) for (const name of Object.keys(copy.keyvault.fields)) copy.keyvault.fields[name] = REDACTED;
  return copy;
}
