# Repository guidance for coding agents

## Scope and collaboration

- Write clearly and concisely. If an important fact is uncertain, ask rather than guess.
- This repository is an educational Xbox 360 field guide. Reading, editing or building it never implies permission to execute exploits, install payloads, modify a console, or contact online services.
- Use M$ in authored prose. Preserve exact external URLs and code identifiers.
- Every commit must include the exact trailer `Co-Author: s33g's Agent`.

## Privacy and sensitive data

- Never add real CPU keys, DVD keys, console IDs, serials, NAND dumps, decrypted Keyvaults, or other console-specific secrets to tracked files.
- Use explicit placeholders such as `<REDACTED_CPU_KEY>` in examples.
- Keep local console data and generated analysis output outside the repository. Treat analyzer output as sensitive even when redacted.
- Before preparing a commit, inspect the diff and run the privacy checks for keys, identifiers, local absolute paths, and dump or extract filenames.
- History rewrites require coordination. A clean working tree does not establish that old commits or remote copies are clean.

## Project structure

- `docs/` contains the canonical Markdown chapters; keep them readable directly on GitHub.
- `skills/` contains reusable research workflows and the experimental offline NAND analyzer.
- `site/` contains presentation and the explicit public-page list. `scripts/` builds and checks the static site.
- `tools/README.md` explains retirement of private-sample experiments.
- `dist/` is generated and ignored. Never publish the repository root as a static-site artifact.

## Editing and verification

- Preserve the distinction between observed results from a particular example, upstream support claims, and facts that apply to all consoles.
- Cite primary sources near technical claims. Record exact releases and check dates when compatibility can change.
- Prefer parameterized input instructions over machine-specific absolute paths. Keep internal documentation links relative.
- Separate entry points, privileged exploits, runtime payloads and persistent installation mechanisms.
- After changes, run `npm run check`, `npm run build`, `npm run check:site`, and `npm run check:privacy`. Use `npm run check:history` for historical exposure.
- Check responsive presentation, local search and Mermaid rendering after website changes. Retain readable content and diagram source when JavaScript is unavailable.
- Use synthetic data for tests. Do not invoke the analyzer on private console files as part of the site build or test suite.
