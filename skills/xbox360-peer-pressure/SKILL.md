---
name: xbox360-peer-pressure
description: Explain Peer Pressure startup, hardware and runtime requirements, interpret its boot modes, or evaluate evidence about its components and source availability.
metadata:
  author: s33g
  version: '1.0.0'
---

# Peer Pressure research

Explain Peer Pressure by Grimdoomer using its documented release boundaries. Treat PeerSlop as a secondary, independent research project, not as upstream Peer Pressure.

## References

Read [Peer Pressure](references/peer-pressure.md) for the mechanism, board aliases, storage dependence, boot modes, source visibility and credits. Use [Choosing a path](references/choosing-a-path.md) when comparing runtime features with other environments.

The bundled guide records checked versions and dates. Refresh release-sensitive claims from its upstream links when possible; otherwise make the snapshot boundary explicit.

## Workflow

1. Identify the exact project and release. Separate upstream behavior from changes advertised by independent extensions.
2. Explain installation-time access, persistent NAND/HDD components, repeated startup exploitation, and resulting runtime patches as distinct stages.
3. Assess motherboard and storage requirements separately from dashboard, plugin and application compatibility. Map board aliases using the reference before drawing a conclusion.
4. For boot-mode questions, describe which stages run and which settings apply. A retail boot mode does not establish removal of persistent changes or online-service safety.
5. For component-identification questions, compare the correct decoded structures with the exact public release. Record the parser, geometry, offsets and selection assumptions. Keep private image contents and identifiers out of the answer.

A matching component establishes a fact about the inspected image. It does not prove the HDD component exists, the console boots, every component has the same version, or recovery will succeed. A missing match does not establish a stock image. A generic SMC heuristic is not release-aware verification.

## Source and attribution

Credit Grimdoomer and the contributors identified by upstream. Mention DarkLimbo's PeerSlop only where relevant: its AI-assisted research helped the field guide's understanding, but reconstructed or added code is not the complete original source, and retained binary modules limit what can be rebuilt.

When discussing the closed-source decision, distinguish the author's stated reasons from the field guide's opinion that incomplete reconstructions may worsen the risks. Neither position establishes a measured outcome.

## Return

State the conclusion, project/release, supporting evidence, documented exclusions, and uncertainty. For image interpretation, separate observed matches, inferences and runtime evidence still missing. For comparisons, label every extension-only feature explicitly.

## Example prompts

- “Explain why Peer Pressure needs both NAND and HDD changes, and what happens again at boot.”
- “Does a PeerSlop plugin feature mean upstream Peer Pressure supports DashLaunch?”

This skill explains and assesses; it does not initiate installation, recovery, flashing or service access. Written with AI assistance; unaffiliated with M$. See the [educational and responsibility notice](references/notice.md).
