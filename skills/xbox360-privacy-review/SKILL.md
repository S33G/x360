---
name: xbox360-privacy-review
description: Review Xbox 360 research, documentation, generated sites or Git changes for console secrets, identifying data, private artifacts and historical exposure before sharing.
metadata:
  author: s33g
  version: '1.0.0'
---

# Xbox 360 research privacy review

Identify what can safely be shared and what remains unreviewed, without reproducing the sensitive material in the findings.

Read [Privacy](references/privacy.md) for data classes, analyzer-output limitations and the field guide's scanner behavior. Its repository-specific scanner is optional context, not a dependency supplied by this skill; use tools actually present in the target project.

## Define the review surface

Identify the intended publication: selected files, staged changes, a built site, an archive or Git history. Inspect the corresponding source and generated artifacts. Include raw Markdown copies, search indexes, source maps, lockfile registry URLs and metadata when present. A clean source page does not establish a clean exported artifact.

For repository reviews, distinguish working files, the Git index, reachable commits and local reflogs. State which were inspected. Local history does not represent every remote ref, clone, cache, backup or previously shared report.

## Review and remediate

1. Look for CPU/DVD keys, console IDs, serials, decrypted Keyvaults, drive-pairing material, credentials, personal paths, private hostnames and identifying author metadata within scope.
2. Inspect private artifact names and derived reports as well as text. NAND images and analysis output remain sensitive even when identifiers are redacted. Binary or oversized files that were skipped are unreviewed, not clean.
3. Evaluate likely matches in context without echoing their values. Content hashes, public cryptographic constants and placeholders can resemble secrets; validate each exception narrowly rather than exempting entire files or directories.
4. When cleanup is requested, replace examples with explicit placeholders, parameterize private paths and remove private artifacts from the publication surface. Preserve the distinction between synthetic examples and observations from real consoles.
5. Recheck both edited sources and regenerated output. Report historical exposure separately: deleting a file, changing a commit's author or adding an ignore rule does not erase old content.

If historical cleanup is in scope, establish which refs and copies are affected and coordinate any shared history rewrite. Do not imply that rewriting local commits retracts remote copies. Revocable credentials and console-specific hardware identities require different responses; do not promise that CPU/DVD keys can simply be rotated.

## Return

Give each finding as a relative path, line or artifact location, category, and remediation status. Do not include secret values, private absolute paths or identifying excerpts. Summarize inspected surfaces, unresolved findings, skipped material, and limits of the checks. A heuristic scan is evidence of what it detected, not proof of universal absence.

## Example prompts

- “Review these staged research changes and the generated site for private console data before publication.”
- “The working tree is clean. Check what that does and does not establish about earlier commits and lockfile URLs.”

Written with AI assistance for educational research; unaffiliated with M$. See the [educational and responsibility notice](references/notice.md).
