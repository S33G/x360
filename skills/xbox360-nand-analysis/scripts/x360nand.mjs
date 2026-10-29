#!/usr/bin/env node
// Generated from the TypeScript sources in s33G/x360. AI-assisted educational research.
// Read-only analysis; no affiliation with M$. See docs/NOTICE.md.


// nand/cli.ts
import { constants } from "node:fs";
import { open, stat, writeFile } from "node:fs/promises";

// nand/core.ts
var DATA_BYTES = 16777216;
var RAW_BYTES = 17301504;
var PAGE_BYTES = 512;
var BLOCK_BYTES = 16384;
var BLOCK_COUNT = DATA_BYTES / BLOCK_BYTES;
var REDACTED = "<REDACTED>";
var hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
var ascii = (bytes) => Array.from(bytes, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
var textField = (bytes) => ascii(bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0))).trim();
function decodeSmc(bytes) {
  const state = [66, 117, 78, 121];
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ state[i % 4];
    const change = bytes[i] * 251;
    state[(i + 1) % 4] = state[(i + 1) % 4] + change & 255;
    state[(i + 2) % 4] = state[(i + 2) % 4] + (change >> 8) & 255;
  }
  return result;
}
function rc4(key, bytes) {
  const state = Uint8Array.from({ length: 256 }, (_, i2) => i2);
  let j = 0;
  for (let i2 = 0; i2 < 256; i2++) {
    j = j + state[i2] + key[i2 % key.length] & 255;
    [state[i2], state[j]] = [state[j], state[i2]];
  }
  const output = new Uint8Array(bytes.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < bytes.length; n++) {
    i = i + 1 & 255;
    j = j + state[i] & 255;
    [state[i], state[j]] = [state[j], state[i]];
    output[n] = bytes[n] ^ state[state[i] + state[j] & 255];
  }
  state.fill(0);
  return output;
}
function inferSpareLayout(spare, blocks) {
  let original = 0;
  let newer = 0;
  for (const block of blocks) {
    if (block.index === 0 || block.status !== "data") continue;
    const base = block.index * 32 * 16;
    const oldId = spare[base] | (spare[base + 1] & 15) << 8;
    const newId = spare[base + 1] | (spare[base + 2] & 15) << 8;
    if (oldId === block.index && newId !== block.index) original++;
    if (newId === block.index && oldId !== block.index) newer++;
  }
  if (original >= 2 && original > newer * 2) return "small-block";
  if (newer >= 2 && newer > original * 2) return "big-on-small";
  return "unknown";
}
function inspectFileSystem(data, spare, report, sensitive) {
  if (!report.input.hasSpare || report.input.spareLayout === "unknown" || !report.header.valid) return;
  let root = null;
  let highest = 0;
  let ambiguous = false;
  const lowByte = report.input.spareLayout === "small-block" ? 2 : 0;
  for (const block of report.blocks) {
    if (block.status === "marked-bad") continue;
    for (let page = 0; page < 32; page++) {
      const at = (block.index * 32 + page) * 16;
      if ((spare[at + 12] & 63) !== 48) continue;
      const sequence = spare[at + lowByte] + spare[at + 3] * 256 + spare[at + 4] * 65536 + spare[at + 6] * 16777216;
      if (sequence === 0 || sequence === 4294967295) continue;
      if (sequence > highest) {
        highest = sequence;
        root = block.index;
        ambiguous = false;
      } else if (sequence === highest && root !== block.index) ambiguous = true;
      break;
    }
  }
  report.fileSystem.status = "not-found";
  if (root === null) return;
  if (ambiguous) {
    report.warnings.push("Filesystem root candidates have tied sequence numbers; no root was selected.");
    return;
  }
  report.fileSystem = { status: "metadata-only", rootBlock: root, entries: [] };
  report.warnings.push("Filesystem root is a sequence-number candidate. Wraparound, remapping, allocation chains and file contents are not validated.");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let skipped = 0;
  outer: for (let page = 1; page < 32; page += 2) {
    for (let slot = 0; slot < 16; slot++) {
      const at = root * BLOCK_BYTES + page * PAGE_BYTES + slot * 32;
      const nameBytes = data.subarray(at, at + 22);
      if (nameBytes[0] === 0 || nameBytes.every((byte) => byte === 255)) break outer;
      if (nameBytes[0] === 5) continue;
      const end = nameBytes.indexOf(0);
      const usedName = nameBytes.subarray(0, end < 0 ? 22 : end);
      const length = view.getUint32(at + 24, false);
      const startBlock = view.getUint16(at + 22, false);
      if (!usedName.every((byte) => byte >= 32 && byte <= 126) || startBlock >= BLOCK_COUNT || length > DATA_BYTES) {
        skipped++;
        continue;
      }
      report.fileSystem.entries.push({ name: sensitive ? ascii(usedName) : REDACTED, length, startBlock });
    }
  }
  if (skipped) report.warnings.push(`${skipped} malformed filesystem entries were omitted.`);
}
async function inspectKeyvault(data, cpuKey, report, sensitive) {
  if (!report.header.valid) {
    report.keyvault.status = "unavailable";
    return;
  }
  const declaredOffset = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(108, false);
  if (declaredOffset !== 0 && declaredOffset !== 16384) {
    report.keyvault.status = "unavailable";
    report.warnings.push("The declared Keyvault offset is outside the supported fixed 16 KiB layout at data offset 0x4000. Keyvault inspection was skipped.");
    return;
  }
  if (!globalThis.crypto?.subtle) {
    report.keyvault.status = "unavailable";
    report.warnings.push("Web Crypto is unavailable. Keyvault inspection needs a secure browser context or Node 22+.");
    return;
  }
  report.warnings.push("Keyvault inspection assumes the supported 16 KiB retail layout at data offset 0x4000.");
  const key = new Uint8Array(cpuKey);
  let derived = new Uint8Array(0);
  let clear = new Uint8Array(0);
  try {
    const imported = await globalThis.crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    derived = new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", imported, new Uint8Array(data.subarray(16384, 16400))));
    clear = new Uint8Array(16384);
    clear.set(data.subarray(16384, 16400));
    const body = rc4(derived.subarray(0, 16), data.subarray(16400, 32768));
    clear.set(body, 16);
    body.fill(0);
    const serial = ascii(clear.subarray(176, 188));
    if (!/^\d{12}$/.test(serial)) {
      report.keyvault.status = "implausible";
      return;
    }
    const protect = (value) => sensitive ? value : REDACTED;
    report.keyvault = { status: "plausible", fields: {
      serial: protect(serial),
      consoleId: protect(hex(clear.subarray(2506, 2511))),
      manufactureDate: protect(textField(clear.subarray(2532, 2540))),
      region: protect(hex(clear.subarray(200, 202))),
      opticalDrive: protect(textField(clear.subarray(3218, 3246))),
      dvdKey: protect(hex(clear.subarray(256, 272)))
    } };
  } catch {
    report.keyvault = { status: "unavailable" };
    report.warnings.push("Keyvault cryptography could not complete in this runtime.");
  } finally {
    key.fill(0);
    derived.fill(0);
    clear.fill(0);
    report.warnings.push("Keyvault plausibility checks only a serial-number pattern. It does not authenticate the Keyvault, validate the CPU key, or establish ownership.");
  }
}
async function analyzeNand(input, options = {}) {
  if (!(input instanceof Uint8Array) || input.length !== DATA_BYTES && input.length !== RAW_BYTES) {
    throw new Error("Unsupported image size. Expected exactly 16 MiB data-only or 16.5 MiB small-block raw.");
  }
  if (options.cpuKey !== void 0 && (!(options.cpuKey instanceof Uint8Array) || options.cpuKey.length !== 16)) {
    throw new Error("Invalid CPU key. Expected exactly 16 bytes.");
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
  const smcOffset = view.getUint32(124, false);
  const smcLength = view.getUint32(120, false);
  const report = {
    schemaVersion: "1.0",
    input: { format: hasSpare ? "small-block-raw" : "data-only", sizeBytes: input.length, dataBytes: DATA_BYTES, pageCount: DATA_BYTES / PAGE_BYTES, blockCount: BLOCK_COUNT, hasSpare, spareLayout: hasSpare ? "unknown" : "none" },
    header: { magic, valid: ["ff4f", "0f3f", "0f4f"].includes(magic), smcOffset, smcLength },
    bootloaders: [],
    smc: { status: "absent", boardHint: null, version: null, offset: smcOffset, length: smcLength },
    blocks: [],
    blockStats: { data: 0, erased: 0, markedBad: 0 },
    fileSystem: { status: "unavailable", rootBlock: null, entries: [] },
    keyvault: { status: "not-requested" },
    privacy: { redacted: !sensitive },
    warnings: ["Geometry is selected by exact file size. A recognized header is not an integrity check; ECC, signatures and block remapping are not verified."]
  };
  try {
    for (let index = 0; index < BLOCK_COUNT; index++) {
      const marked = hasSpare && (spare[index * 32 * 16 + 5] !== 255 || spare[(index * 32 + 31) * 16 + 5] !== 255);
      const erased = data.subarray(index * BLOCK_BYTES, (index + 1) * BLOCK_BYTES).every((byte) => byte === 255);
      const status = marked ? "marked-bad" : erased ? "erased" : "data";
      report.blocks.push({ index, status });
      report.blockStats[status === "marked-bad" ? "markedBad" : status]++;
    }
    if (hasSpare) {
      report.input.spareLayout = inferSpareLayout(spare, report.blocks);
      report.warnings.push("Marked-bad means a candidate from spare byte 5 in the first or last page. It does not prove a factory defect or that a remap is missing. Erased means data bytes are all 0xFF.");
      if (report.input.spareLayout === "unknown") report.warnings.push("Spare metadata layout could not be inferred confidently; filesystem inspection was skipped.");
      else report.warnings.push("Spare metadata layout is inferred from block IDs and may be wrong for unusual or remapped images.");
    } else report.warnings.push("No spare bytes: bad-block markers and filesystem root metadata are unavailable.");
    if (!report.header.valid) {
      report.smc.status = "invalid";
      report.warnings.push("Flash header magic is unrecognized; SMC, bootloader and filesystem interpretation was skipped.");
    } else {
      if (smcLength !== 0) {
        if (smcOffset < 128 || smcLength < 259 || smcLength > 65536 || smcOffset > DATA_BYTES - smcLength) {
          report.smc.status = "invalid";
          report.warnings.push("SMC bounds are invalid or outside the supported inspection limit.");
        } else {
          const decoded = decodeSmc(data.subarray(smcOffset, smcOffset + smcLength));
          const boards = [null, "Xenon", "Zephyr", "Falcon / Opus", "Jasper", "Trinity", "Corona", "Winchester"];
          report.smc = { status: "decoded", boardHint: boards[decoded[256] >> 4] ?? null, version: `${decoded[257]}.${String(decoded[258]).padStart(2, "0")}`, offset: smcOffset, length: smcLength };
          decoded.fill(0);
          report.warnings.push("SMC board and version are byte-derived hints. Patched or corrupt firmware can misidentify hardware; no stock-versus-modified conclusion is made.");
        }
      }
      const names = /* @__PURE__ */ new Set(["CB", "CD", "CE", "CF", "CG", "SB", "SC", "SD", "SE", "SF", "SG"]);
      for (let at = 32768; at <= DATA_BYTES - 32; at += 16) {
        const name = String.fromCharCode(data[at], data[at + 1]);
        if (!names.has(name)) continue;
        const version = view.getUint16(at + 2, false);
        const size = view.getUint32(at + 12, false);
        const entry = view.getUint32(at + 8, false);
        if (version === 0 || version === 65535 || size < 32 || size > DATA_BYTES - at || entry >= size || entry % 4 !== 0) continue;
        report.bootloaders.push({ name, offset: at, version, size });
        if (report.bootloaders.length >= 128) {
          report.warnings.push("Boot header scan stopped at 128 candidates.");
          break;
        }
        at += Math.ceil(size / 16) * 16 - 16;
      }
      report.warnings.push("Bootloaders are structural candidates from a 16-byte-aligned scan, not an authenticated boot chain or an exploit compatibility verdict.");
      inspectFileSystem(data, spare, report, sensitive);
    }
    if (options.cpuKey) await inspectKeyvault(data, options.cpuKey, report, sensitive);
    return report;
  } finally {
    data.fill(0);
    spare.fill(0);
  }
}

// nand/cli.ts
var HELP = `Xbox 360 NAND inspector \u2014 read-only, local, Node 22+

Usage: node x360nand.mjs --input FILE [--cpu-key-file FILE] [--json] [--out FILE] [--include-sensitive]

--input FILE         Exactly 16 MiB data-only or 16.5 MiB small-block raw.
--cpu-key-file FILE   Optional UTF-8 text containing one 32-hex-character CPU key.
--json               Print the structured report instead of the human summary.
--out FILE           Create a private report file; never overwrite an existing file.
--include-sensitive  Explicitly reveal parsed filenames and plausible Keyvault fields.
--help               Show this help.

CPU keys and input paths are never printed. No automatic key discovery, network
requests, extraction, ECC repair, flash writes or exploit execution. Reports can
still be sensitive when redacted. Educational inspection only; not an integrity
or compatibility verdict. AI-assisted; unaffiliated with M$; use at your own risk.
`;
async function readBounded(file, validSize) {
  const before = await stat(file);
  if (!before.isFile() || !validSize(before.size)) throw new Error("Invalid input");
  const handle = await open(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || !validSize(opened.size) || opened.size !== before.size || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("Invalid input");
    const bytes = new Uint8Array(opened.size);
    let position = 0;
    while (position < bytes.length) {
      const read = await handle.read(bytes, position, bytes.length - position, position);
      if (read.bytesRead === 0) {
        bytes.fill(0);
        throw new Error("Input changed");
      }
      position += read.bytesRead;
    }
    const extra = await handle.read(new Uint8Array(1), 0, 1, position);
    if (extra.bytesRead !== 0) {
      bytes.fill(0);
      throw new Error("Input changed");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}
function humanSummary(report) {
  const offset = (value) => `0x${value.toString(16)}`;
  const lines = [
    "Xbox 360 NAND inspection",
    `Layout: ${report.input.format} (${report.input.sizeBytes} bytes); spare metadata: ${report.input.spareLayout}`,
    `Header: ${report.header.magic}; recognized: ${report.header.valid ? "yes" : "no"}`,
    `Blocks: ${report.blockStats.data} data, ${report.blockStats.erased} erased, ${report.blockStats.markedBad} marked-bad candidates`,
    `SMC: ${report.smc.status}; board hint: ${report.smc.boardHint ?? "unknown"}; version hint: ${report.smc.version ?? "unknown"}`,
    `Boot header candidates: ${report.bootloaders.length}`,
    ...report.bootloaders.map((item) => `  ${item.name} ${item.version} at ${offset(item.offset)}, ${item.size} bytes`),
    `Filesystem: ${report.fileSystem.status}; entries: ${report.fileSystem.entries.length}`,
    ...report.fileSystem.entries.map((item) => `  ${item.name}: ${item.length} bytes, start block ${offset(item.startBlock)}`),
    `Keyvault: ${report.keyvault.status}`,
    ...Object.entries(report.keyvault.fields ?? {}).map(([name, value]) => `  ${name}: ${value}`),
    `Sensitive fields: ${report.privacy.redacted ? "redacted" : "included by explicit request"}`,
    "",
    "Interpretation limits:",
    ...report.warnings.map((warning) => `- ${warning}`)
  ];
  return `${lines.join("\n")}
`;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(HELP);
    return;
  }
  const values = {};
  const flags = /* @__PURE__ */ new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (["--json", "--include-sensitive"].includes(arg) && !flags.has(arg)) flags.add(arg);
    else if (["--input", "--cpu-key-file", "--out"].includes(arg) && !values[arg] && args[i + 1] && !args[i + 1].startsWith("--")) values[arg] = args[++i];
    else throw new Error("Invalid arguments");
  }
  if (!values["--input"]) throw new Error("Missing input");
  let input = new Uint8Array(0);
  let cpuKey;
  try {
    input = await readBounded(values["--input"], (size) => size === DATA_BYTES || size === RAW_BYTES);
    if (values["--cpu-key-file"]) {
      const rawKey = await readBounded(values["--cpu-key-file"], (size) => size >= 32 && size <= 128);
      try {
        const encoded = new TextDecoder("utf-8", { fatal: true }).decode(rawKey).trim();
        if (!/^[0-9a-fA-F]{32}$/.test(encoded)) throw new Error("Invalid key");
        cpuKey = Uint8Array.from(encoded.match(/../g), (byte) => Number.parseInt(byte, 16));
      } finally {
        rawKey.fill(0);
      }
    }
    const report = await analyzeNand(input, { cpuKey, includeSensitive: flags.has("--include-sensitive") });
    const output = flags.has("--json") ? `${JSON.stringify(report, null, 2)}
` : humanSummary(report);
    if (values["--out"]) {
      await writeFile(values["--out"], output, { flag: "wx", mode: 384 });
      process.stdout.write("Report written to the requested new file. Treat it as private.\n");
    } else process.stdout.write(output);
  } finally {
    input.fill(0);
    cpuKey?.fill(0);
  }
}
main().catch(() => {
  process.stderr.write("Inspection failed. Check arguments, readable regular files, supported sizes, a valid optional key, and a new output path. Existing files are never overwritten. Paths and private values are hidden. Use --help for usage.\n");
  process.exitCode = 1;
});
