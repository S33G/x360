---
name: xbox360-nand-analysis
description: Inspect a locally supplied Xbox 360 NAND image or interpret the browser and Node inspector's report, with bounded geometry, evidence and privacy limits.
compatibility: Node.js 22 or newer is required only to run the optional bundled analyzer.
metadata:
  author: s33g
  version: '1.1.0'
---

# Xbox 360 NAND analysis

Produce a bounded interpretation of an image or report. Reading this skill does not require executing its analyzer.

Read [NAND explained](references/nand.md) for structures and [Privacy](references/privacy.md) for private-data handling. The bundled [Node inspector](scripts/x360nand.mjs) shares the browser inspector's TypeScript parser. It is an experimental read-only aid, not a flashing validator.

## Establish scope

Use an existing report when it answers the question. When local analysis is requested, identify the supplied file, preserve the original, and keep inputs, key files and output outside tracked or shared directories. Do not run the analyzer merely because it is installed.

The parser accepts exactly **16,777,216-byte data-only** or **17,301,504-byte small-block raw** images. Other sizes are rejected; big-block and eMMC layouts are unsupported. Matching size selects an interpretation, not proof of geometry. Spare-dependent results are unavailable in a data-only image. An inferred `spareLayout` of `big-on-small` describes a metadata arrangement within the supported size, not large-capacity support; `unknown` prevents filesystem interpretation. Reported structure offsets are in data space, not raw-file space.

## Optional local inspector

With Node.js 22 or newer:

```sh
node "<installed-skill>/scripts/x360nand.mjs" --help
node "<installed-skill>/scripts/x360nand.mjs" --input "<private-image>" --json --out "<private-report.json>"
```

Replace placeholders locally. `--out` creates a new file and refuses an existing destination. Without it, output goes to the terminal. Keep both private. For optional Keyvault inspection, add `--cpu-key-file "<private-key-file>"`; no key is accepted as an argument and adjacent key files are not discovered. Never request or reproduce a real key in chat.

Default output is redacted. Leave `--include-sensitive` off unless the user explicitly needs private identity fields or filenames; never use it for a shared report. Even a redacted report retains image-specific information. The program does not report the CPU key or input path, and performs no network operations. Managed runtimes cannot guarantee secure memory erasure.

## Interpret results

Record `schemaVersion`, tool revision and the `input` geometry assumption. Read `warnings` and each status before interpreting `header`, `bootloaders`, `smc`, `blocks`, `blockStats`, `fileSystem` and `keyvault`. Check `privacy.redacted` before handling the report as redacted; that flag does not make it public-safe.

Bootloaders are bounded header candidates, not a complete or authenticated chain. SMC decoding gives hints, not proof of a motherboard or exploit. The filesystem view selects candidate root metadata; it does not extract files, resolve remaps or establish the active root. Bad-block markers are candidates and ECC is not verified or repaired.

Optional Keyvault decryption uses HMAC-SHA1/RC4 followed by a serial-format plausibility check. `keyvault.status === 'plausible'` is **not cryptographic authentication**. No result verifies a Peer Pressure release, a working console or an image's safety for flashing. Synthetic test success is not private-device validation.

## Return

State the supported interpretation, source revision, observed structures, inferences, unknowns and useful corroboration. Preserve material warnings. Use explicit placeholders such as `<REDACTED_CONSOLE_ID>` and summarize instead of copying a private report into chat.

## Example prompts

- “Interpret this redacted inspector report. Which conclusions are observations and which are heuristics?”
- “Inspect this explicitly supplied local image and save a redacted JSON report outside the repository.”

Image analysis does not authorize flashing, recovery, exploit execution or service access. Written with AI assistance; unaffiliated with M$. See the [educational and responsibility notice](references/notice.md).
