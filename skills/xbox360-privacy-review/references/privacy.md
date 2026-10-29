<!-- Generated from docs/PRIVACY.md; edit the canonical chapter and run npm run skills:sync. -->
<!-- Source SHA-256: c279120bdebe32e4d1cd320c694b11a6c7c51cd9e19110de188132104f1d8a5b -->

# Console data stays private

This repository contains reusable code and reference material. Keep console
images, extracted files, keys, identifiers, and generated analysis outside the
checkout. Use placeholders such as `<REDACTED_CPU_KEY>`, `<REDACTED_DVD_KEY>`,
`<REDACTED_SERIAL>`, and `<REDACTED_CONSOLE_ID>` when documenting a workflow.

Do not commit NAND images, decrypted Keyvaults, drive pairing data, CPU/DVD keys,
console IDs, serials, account credentials, personal filesystem paths, or reports
derived from private console data. Renaming a file or adding it to `.gitignore`
does not remove its contents from Git history.

## Analyzer output

The [general analyzer](https://github.com/s33G/x360/blob/main/skills/xbox360-nand-analysis/SKILL.md) is experimental,
read-only tooling that accepts exactly 16 MiB data-only or 16.5 MiB small-block
raw images. Other sizes/layouts are rejected. Size-based layout assumptions,
structural checks, and successful synthetic tests do not establish support for
every console or prove that a real image is valid or safe to flash.

Reports omit input paths and freeform header text, and default output redacts
filesystem names and Keyvault identity fields, including the DVD key. The CPU
key is never intentionally printed. Structural results may still describe a particular
console; keep generated output private and review any excerpt before sharing.

The Node program's optional `--include-sensitive` flag reveals selected Keyvault
identity/DVD fields and filesystem names for deliberate local inspection. Input
paths and the CPU key remain hidden. Keep this flag off in shared terminals, CI,
screen recordings and captured reports. The browser always redacts these fields.

Keyvault inspection is optional. The Node program reads a key only from the
explicit `--cpu-key-file FILE` argument; it never discovers adjacent key files or
accepts the key itself on the command line. The browser accepts a key in a local
password field and clears it on submission. Neither interface stores inputs in
browser storage or sends them to a service. Keep images, key files and reports
outside the repository. Read the [NAND inspector guide](https://github.com/s33G/x360/blob/main/docs/NAND_ANALYZER.md) for
offline downloads, usage and the limits of clearing memory.

## Before sharing a change

Run these offline checks from the repository root:

```sh
node scripts/check-secrets.mjs
node scripts/check-secrets.mjs --history
node --test
```

The default check scans working files, including ignored files, while excluding
Git internals, dependencies, and common caches. It does not follow symlinks;
their destination text is still checked for personal paths. The history option
also scans unique file versions reachable from local Git refs and reflogs. It
does not contact a remote, inspect deleted remote refs, or prove removal from
other clones, hosting caches, chat logs, and backups.

Findings report only a repository-relative path, line number, and type. Sensitive
artifact names are masked; line zero means a filename or whole-file finding.
Source lines, matching secret values, and private absolute paths are never
included in reports. Exit codes are `0` for no findings, `1` for findings, and `2`
for an incomplete scan or invalid invocation. Files larger than 8 MiB and binary
files require manual review rather than being silently accepted.

Checks flag key-like hexadecimal literals, identifiers in console field context,
personal home-directory paths, known credential forms, raw image/extract names,
and sample Keyvault bytes. Ordinary 40/64-character content hashes are not
classified as keys merely because they are hexadecimal. This is a heuristic
guard, not a proof that arbitrary encodings or every credential format are absent.

Two exact format/test constants have scoped exceptions: the shared all-zero Xbox
content-directory marker in the Peer Pressure guide, and the published RC4
`Key`/`Plaintext` known-answer vector in the retired probe's history.

Generated Mermaid vendor chunks also contain 28 reviewed public tokens (numeric
constants and a hexadecimal alphabet) plus 98 decimal parser-table sequences
that overlap the broad hex detectors. The scanner stores their fingerprints,
with source locations from the Mermaid 12.2.0 npm distribution. These exceptions
apply only to individual matches
in `dist/assets/vendor/*.js`; they do not exempt entire files, unknown tokens, any
full 32-character key, or other privacy rules. A key injected beside an accepted
constant still fails the scan. Authored source and generated HTML, Markdown,
search data, and the first-party client have no vendor exception.

New exceptions require source review and a narrow file/value/context rule. Never
generate the accepted-token list automatically from a new build or add blanket
exclusions for documents, tests, or generated directories.

If a real secret was committed, stop sharing the affected content. Review its
scope, replace revocable credentials where applicable, and coordinate any
history rewrite with repository owners. A normal deletion or a clean working
tree scan does not erase historical exposure. CPU/DVD keys and hardware identity
may not have an ordinary rotation mechanism.
