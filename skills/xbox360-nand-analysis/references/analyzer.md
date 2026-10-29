<!-- Generated from docs/NAND_ANALYZER.md; edit the canonical chapter and run npm run skills:sync. -->
<!-- Source SHA-256: 7f349f1e5dc50435003c7e7236be80089fe7487309beef87990d9f4aa538fe7d -->

# NAND inspector

Explore a NAND image in your browser, without uploading it. The inspector shows the image layout, candidate bootloader headers, SMC hints, block metadata and a limited filesystem view. The browser tool and downloadable Node program use the same [TypeScript parser](https://github.com/s33G/x360/blob/main/nand/core.ts).

**Experimental, read-only inspection.** A successful parse does not establish that an image is authentic, complete, correctly remapped or safe to flash. This tool does not modify a console, repair an image or run an exploit.

## Try it in the browser

The web edition of this page includes the inspector above. Choose the **synthetic demo** to explore the interface without opening a real console image. Demo values are invented for testing; they are not observations from a console.

To inspect your own image:

1. Choose or drop a supported file into the inspector. Keep the original in private storage outside this repository.
2. Leave the optional CPU key empty for ordinary structural inspection. Keyvault inspection needs your own 32-character hexadecimal CPU key, entered locally in the password field. Do not paste it into chat, an issue or a shared screenshot.
3. Read the summary, then explore the block map and detected structures. Warnings explain missing or uncertain interpretation; green graphics do not certify an image.
4. Download a **redacted JSON report** if needed. Even redacted reports contain image-specific structure and should stay private.
5. Clear the inspector when finished. The key field is cleared when submitted; clearing the tool releases the active image and report references.

Analysis runs locally in a browser worker so parsing does not block the page interface. The inspector does not send image contents or keys over the network, or save them in browser storage. Loading the hosted website still makes ordinary requests for the website's assets. Use the standalone download for offline work.

JavaScript is required for the interactive tool. This chapter and its limitations remain readable without it, including directly on GitHub.

## Supported input

| Format | Exact file size | Interpretation |
|---|---:|---|
| Data-only | 16,777,216 bytes / 16 MiB | 32,768 pages of 512 data bytes; spare metadata unavailable |
| Small-block raw | 17,301,504 bytes / 16.5 MiB | 32,768 pages of 512 data bytes plus 16 spare bytes |

Both interpretations contain 1,024 data blocks with 32 pages per block. File size selects a supported interpretation; it does not prove the physical chip geometry or a valid dump. Other sizes are rejected. Big-block NAND, 4 GB/eMMC storage and partial images are unsupported.

Within the supported raw size, spare bytes may use the original small-block metadata arrangement or the later `big-on-small` arrangement. The parser infers this from block-ID evidence and reports `unknown` when that evidence is insufficient. This metadata label does not mean large-capacity big-block images are supported. Filesystem interpretation is unavailable when the spare arrangement is unknown or the flash header is not recognized.

All reported structure offsets use **data-space bytes**, after spare areas have been removed. They are not offsets into a raw file. For the small-block conversion and storage distinctions, read [NAND explained](nand.md). Its sources include [ConsoleMods' standard NAND reference](https://consolemods.org/wiki/Xbox_360:Standard_NAND), [4 GB reference](https://consolemods.org/wiki/Xbox_360:4GB_NAND) and [Free60's NAND layout](https://free60.org/Hardware/Console/NAND/).

## Read the results

| View | What it establishes | What it does not establish |
|---|---|---|
| Header | The parsed magic, SMC offset and SMC length | Authenticity or correctness of the whole image |
| Bootloader candidates | Recognized names, versions, offsets and bounded declared sizes | A complete boot chain, signatures, exploit eligibility or the active update bank |
| SMC | Whether the bounded region could be decoded, plus version and board hints | A confirmed motherboard, installed exploit or working modification |
| Block map | Erased/data classification and candidate bad-block markers for supported spare data | ECC correctness, a repaired remap table or permission to discard a block |
| Filesystem | Entries from a candidate small-block root, when available | Complete files, resolved block chains, the active root or extractable contents |
| Keyvault | Whether optional decryption produced a plausible serial field | Cryptographic authentication, a verified CPU key or a valid console identity |

The filesystem view is metadata only. It selects a candidate by sequence number, skips marked-bad roots and malformed entries, and declines to select between tied candidates. It does not resolve sequence-number wraparound, extract files, follow every generation or resolve remapped blocks. The inspector does not verify or repair ECC. A data-only image has no spare metadata to inspect for these features.

Optional Keyvault inspection derives an RC4 key with HMAC-SHA1 and checks the decrypted serial's format, using the supported retail layout's 16 KiB region at data offset `0x4000`. **Plausibility is not authentication.** Random, damaged or deliberately constructed data can mislead a heuristic. Identity fields stay redacted in the browser and its report export. Keyvault inspection needs Web Crypto; if the browser does not provide it, the report marks that inspection unavailable. The [parser source](https://github.com/s33G/x360/blob/main/nand/core.ts) is the precise record of the implemented offsets and checks; compare important findings with a maintained parser such as [J-Runner with Extras](https://github.com/J-Runner-With-Extras/J-Runner-with-Extras) for the correct geometry and revision.

## Download and use offline

The web inspector provides these downloads. They are generated build outputs, not files checked into the repository root.

| Download | Use |
|---|---|
| `x360-nand-inspector.html` | Standalone browser tool. Save it, disconnect if desired, and open it locally in a modern browser. No server or package installation is needed. |
| `x360nand.mjs` | Standalone command-line program for Node.js 22 or newer. No runtime dependencies. |
| `x360nand-core.mjs` | The same parser as an importable ESM library for local applications. |
| `SHA256SUMS.txt` | SHA-256 checksums for the downloadable artifacts. |

Compare a downloaded artifact's SHA-256 with the corresponding entry in the checksum file. This detects a mismatch; a checksum downloaded from the same source is not an independent signature or trust guarantee. Keep downloaded programs separate from private console inputs and reports.

From a reviewed source checkout, generate the same artifacts with:

```sh
npm ci --registry=https://registry.npmjs.org
npm run build:nand
```

Find them in `dist/downloads/`. `npm run build` also builds the full field guide. Neither build needs your NAND image or CPU key. Tests use synthetic inputs. The browser interface lives in the site source, while [core.ts](https://github.com/s33G/x360/blob/main/nand/core.ts), [cli.ts](https://github.com/s33G/x360/blob/main/nand/cli.ts) and [demo.ts](https://github.com/s33G/x360/blob/main/nand/demo.ts) define the parser, command-line entry point and synthetic example.

## Run with Node

These examples run the built program from a source checkout. For the standalone download, replace `dist/downloads/x360nand.mjs` with its local path. Replace input and output placeholders with private paths outside this repository.

```sh
node dist/downloads/x360nand.mjs --help
node dist/downloads/x360nand.mjs --input "<private-image>"
node dist/downloads/x360nand.mjs --input "<private-image>" --json --out "<private-report.json>"
```

Keyvault inspection is optional. Put the CPU key in a private UTF-8 text file containing 32 hexadecimal characters, optionally surrounded by whitespace, and pass that file explicitly. Key files larger than 128 bytes are rejected.

```sh
node dist/downloads/x360nand.mjs --input "<private-image>" --cpu-key-file "<private-key-file>" --json --out "<private-report.json>"
```

| Option | Behavior |
|---|---|
| `--input FILE` | Read this image. Required for analysis; no directory scanning. |
| `--cpu-key-file FILE` | Read an optional CPU key from this file. No adjacent-file discovery and no CPU-key argument. |
| `--json` | Produce the structured report instead of the readable summary. |
| `--out FILE` | Write a new output file instead of standard output. Existing files are not overwritten. |
| `--include-sensitive` | Include selected identity fields and filesystem names in a private report. Off by default. |
| `--help` | Show usage without reading an image. |

Leave `--include-sensitive` off for normal use. CPU keys and input paths are not report fields. Errors avoid echoing private file paths. A shell or terminal may still record the arguments you type, and redirected or downloaded output is an ordinary file you must manage yourself.

The browser's worker and Node share parsing logic, but their wrappers differ: the browser always presents and exports a redacted report; the CLI has the explicit sensitive-output option. Neither mode can promise secure erasure from a managed runtime, browser, operating system or crash dump. Clear or close the tool when finished, and follow the [privacy guidance](privacy.md).

## Use the library

The standalone ESM module exports `analyzeNand` and `redactReport`. Give the parser a `Uint8Array`; filesystem access stays in your application. A CPU key, if provided programmatically, is a 16-byte `Uint8Array`.

```js
import { readFile } from 'node:fs/promises';
import { analyzeNand, redactReport } from './x360nand-core.mjs';

const image = new Uint8Array(await readFile(process.argv[2]));
const report = await analyzeNand(image);
const redacted = redactReport(report);
// Keep redacted private too; choose explicitly where your application saves it.
```

The asynchronous API is `analyzeNand(input, options?)`. Options are `cpuKey` and `includeSensitive`; omit both for redacted structural inspection. The report carries `schemaVersion: '1.0'` and these top-level fields:

| Field | Contents |
|---|---|
| `input` | Selected format, byte counts, page/block counts, spare-data availability and inferred `spareLayout` |
| `header` | Magic, header validity check, SMC offset and length |
| `bootloaders` | Candidate name, data offset, version and size |
| `smc` | Decode status, board/version hints, data offset and length |
| `blocks`, `blockStats` | Per-block classifications and totals |
| `fileSystem` | Metadata status, candidate root block and directory entries |
| `keyvault` | Inspection status and optional selected fields |
| `warnings` | Limits or anomalies encountered during this inspection |
| `privacy` | Whether the report is redacted |

Check status fields before reading optional values. For example, `keyvault.status === 'plausible'` means only that a format heuristic passed. Preserve warnings when converting the report into another interface.

## Agent workflow

Install the [NAND analysis skill](https://github.com/s33G/x360/blob/main/skills/xbox360-nand-analysis/SKILL.md) for a portable workflow and bundled Node program, or provide this chapter with the report. See [Agent skills](https://github.com/s33G/x360/blob/main/docs/AGENT_SKILLS.md) for installation.

Use the user's explicit local file and requested scope. A question about a report usually needs interpretation, not another run. When analysis is requested, establish supported geometry, keep inputs and output outside tracked directories, and leave sensitive output disabled. Record the tool revision, geometry assumption and warnings alongside findings.

Separate **observed** fields from **inferences** and **unknowns**. A useful response might say “a bounded CB header candidate was found,” followed by what is still needed to establish the active boot chain. Do not turn a board hint, readable serial or missing marker into proof of a working exploit or a safe flash image. Do not attach a full private report when a short redacted explanation answers the question.

The legacy sample-specific scripts were used as research material, not promoted to general commands. This TypeScript implementation narrows their assumptions, validates bounds and shares one parser between interfaces. Its current verification uses synthetic inputs; that is not validation against the user's private console.

Written with AI assistance for educational research. This project is unaffiliated with M$. Readers are responsible for their actions; s33g takes no responsibility for use of this material. Read the full [educational and responsibility notice](notice.md).
