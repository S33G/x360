# Local analysis tools

The numbered exploratory probes were retired. They depended on one private
sample and printed raw bytes, derived keys, and other identifying output.

Use the [NAND inspector](../docs/NAND_ANALYZER.md) for local, read-only inspection.
Its browser interface and standalone Node program share the bounded
[TypeScript parser](../nand/core.ts). The browser processes images locally and
offers a synthetic demo; the Node program takes explicit input paths and emits
redacted output by default. Download both from the web inspector, or run
`npm run build:nand` and use the artifacts in `dist/downloads/`.

Only 16 MiB data-only and 16.5 MiB small-block raw images are supported. This is
an experimental aid, not a universal NAND decoder, repair program or flashing
validator. The [analysis skill](../skills/xbox360-nand-analysis/SKILL.md) includes
a portable Node program and agent instructions. The earlier JavaScript tool
is superseded by this shared TypeScript implementation.

Keep input images, extracted files, keys, and generated output outside this
repository. Read the [privacy guidance](../docs/PRIVACY.md) before analysis or
sharing results.
