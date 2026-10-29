#!/usr/bin/env node
import { constants } from 'node:fs';
import { open, stat, writeFile } from 'node:fs/promises';
import { analyzeNand, DATA_BYTES, RAW_BYTES, type NandReport } from './core.ts';

const HELP = `Xbox 360 NAND inspector — read-only, local, Node 22+

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

/** A bounded read prevents accidentally loading directories, devices or oversized files. */
async function readBounded(file: string, validSize: (size: number) => boolean): Promise<Uint8Array> {
  const before = await stat(file);
  if (!before.isFile() || !validSize(before.size)) throw new Error('Invalid input');
  // A path can change after stat. Nonblocking open avoids waiting on a substituted
  // FIFO, and descriptor checks below reject changed files before any reads.
  const handle = await open(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || !validSize(opened.size) || opened.size !== before.size || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('Invalid input');
    const bytes = new Uint8Array(opened.size);
    let position = 0;
    while (position < bytes.length) {
      const read = await handle.read(bytes, position, bytes.length - position, position);
      if (read.bytesRead === 0) { bytes.fill(0); throw new Error('Input changed'); }
      position += read.bytesRead;
    }
    const extra = await handle.read(new Uint8Array(1), 0, 1, position);
    if (extra.bytesRead !== 0) { bytes.fill(0); throw new Error('Input changed'); }
    return bytes;
  } finally { await handle.close(); }
}

function humanSummary(report: NandReport): string {
  const offset = (value: number) => `0x${value.toString(16)}`;
  const lines = [
    'Xbox 360 NAND inspection',
    `Layout: ${report.input.format} (${report.input.sizeBytes} bytes); spare metadata: ${report.input.spareLayout}`,
    `Header: ${report.header.magic}; recognized: ${report.header.valid ? 'yes' : 'no'}`,
    `Blocks: ${report.blockStats.data} data, ${report.blockStats.erased} erased, ${report.blockStats.markedBad} marked-bad candidates`,
    `SMC: ${report.smc.status}; board hint: ${report.smc.boardHint ?? 'unknown'}; version hint: ${report.smc.version ?? 'unknown'}`,
    `Boot header candidates: ${report.bootloaders.length}`,
    ...report.bootloaders.map(item => `  ${item.name} ${item.version} at ${offset(item.offset)}, ${item.size} bytes`),
    `Filesystem: ${report.fileSystem.status}; entries: ${report.fileSystem.entries.length}`,
    ...report.fileSystem.entries.map(item => `  ${item.name}: ${item.length} bytes, start block ${offset(item.startBlock)}`),
    `Keyvault: ${report.keyvault.status}`,
    ...Object.entries(report.keyvault.fields ?? {}).map(([name, value]) => `  ${name}: ${value}`),
    `Sensitive fields: ${report.privacy.redacted ? 'redacted' : 'included by explicit request'}`,
    '', 'Interpretation limits:', ...report.warnings.map(warning => `- ${warning}`),
  ];
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(HELP); return; }
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--json', '--include-sensitive'].includes(arg) && !flags.has(arg)) flags.add(arg);
    else if (['--input', '--cpu-key-file', '--out'].includes(arg) && !values[arg] && args[i + 1] && !args[i + 1].startsWith('--')) values[arg] = args[++i];
    else throw new Error('Invalid arguments');
  }
  if (!values['--input']) throw new Error('Missing input');
  let input: Uint8Array = new Uint8Array(0);
  let cpuKey: Uint8Array | undefined;
  try {
    input = await readBounded(values['--input'], size => size === DATA_BYTES || size === RAW_BYTES);
    if (values['--cpu-key-file']) {
      const rawKey = await readBounded(values['--cpu-key-file'], size => size >= 32 && size <= 128);
      try {
        const encoded = new TextDecoder('utf-8', { fatal: true }).decode(rawKey).trim();
        if (!/^[0-9a-fA-F]{32}$/.test(encoded)) throw new Error('Invalid key');
        cpuKey = Uint8Array.from(encoded.match(/../g)!, byte => Number.parseInt(byte, 16));
      } finally { rawKey.fill(0); }
    }
    const report = await analyzeNand(input, { cpuKey, includeSensitive: flags.has('--include-sensitive') });
    const output = flags.has('--json') ? `${JSON.stringify(report, null, 2)}\n` : humanSummary(report);
    if (values['--out']) {
      await writeFile(values['--out'], output, { flag: 'wx', mode: 0o600 });
      process.stdout.write('Report written to the requested new file. Treat it as private.\n');
    } else process.stdout.write(output);
  } finally { input.fill(0); cpuKey?.fill(0); }
}

main().catch(() => {
  process.stderr.write('Inspection failed. Check arguments, readable regular files, supported sizes, a valid optional key, and a new output path. Existing files are never overwritten. Paths and private values are hidden. Use --help for usage.\n');
  process.exitCode = 1;
});
