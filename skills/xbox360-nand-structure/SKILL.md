---
name: xbox360-nand-structure
description: Explain Xbox 360 NAND layouts, raw versus logical offsets, bootloader headers, spare metadata, remapping, or the relationship between CPU keys and Keyvault data.
metadata:
  author: s33g
  version: '1.0.0'
---

# Xbox 360 NAND structure

Make flash structures understandable without treating one console's layout as a universal map.

Read [NAND explained](references/nand.md) for geometry, offset conversion and sensitive structures. Read [Boot chain](references/boot-chain.md) when the question concerns what a stored component does during execution. Follow their parser and architecture sources for exact implementation details.

## Workflow

1. Establish the motherboard, storage arrangement and image format. Capacity labels alone do not identify system-flash geometry.
2. Name the coordinate system before interpreting an offset: raw file bytes including spare areas, logical data bytes, or a decoded structure. Apply a conversion only to the geometry it describes.
3. Read lengths and pointers from the relevant headers and check their bounds. Account for spare metadata, filesystem generations and remapping instead of assuming sequential physical bytes are the active logical content.
4. Explain each relevant component's responsibility: bootloaders, SMC, Keyvault, filesystem or controller metadata. Keep storage location separate from execution order.
5. Classify conclusions as observed, inferred or unknown, and identify which parser revision and geometry support them.

## Important boundaries

- A recognized header is not authenticated content. Plausible decrypted text is not cryptographic verification.
- CPU keys are console-specific and are not fields stored inside the Keyvault. A NAND copy does not itself supply its CPU key.
- A raw bad-block marker does not establish an unrecoverable image; remapping and layout must be understood first.
- A stored update bank, text marker or SMC pattern does not prove the current running software or identify a named exploit by itself.
- Encryption does not make a dump safe to publish. Keep dumps, decrypted structures, identity fields and derived reports private.

## Return

Provide the layout assumption, a diagram or offset explanation where useful, and the evidence for each interpretation. Use synthetic values or explicit redaction placeholders. If the geometry is unknown, explain which fact is needed before calculating offsets.

This is a structural reading workflow. It does not repair or modify an image, validate it for flashing, or require running an analyzer.

## Example prompts

- “Explain raw and data-only offsets for a small-block NAND image using a synthetic example.”
- “Why can a visible bootloader header and a plausible serial still be insufficient validation?”

Written with AI assistance for education; unaffiliated with M$. See the [educational and responsibility notice](references/notice.md).
