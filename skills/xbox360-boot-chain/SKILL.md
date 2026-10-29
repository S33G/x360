---
name: xbox360-boot-chain
description: Explain Xbox 360 startup trust boundaries, the roles of SMC, bootloaders, hypervisor and kernel, or where a homebrew technique changes the execution chain.
metadata:
  author: s33g
  version: '1.0.0'
---

# Xbox 360 boot chain

Explain which component trusts which input, and where the technique under discussion changes that trust decision.

Read [Boot chain](references/boot-chain.md). Its diagram is conceptual: exact stage splits, revision dependencies and update layouts require the linked architecture or implementation sources.

## Workflow

1. Start with the user's question: normal startup, an exploit boundary, runtime behavior, or a confusing component name.
2. Explain the relevant path from CPU ROM and later boot stages to hypervisor/kernel, XAM/dashboard and applications. Show the SMC as a separate controller participating in startup, not simply another CPU bootloader.
3. Locate the security boundary. Distinguish post-startup software exploitation, an early boot decision, fault injection, and a DMA-capable hardware participant.
4. State the mechanism's prerequisites without turning the explanation into a wiring, payload or installation procedure. Verify exact version dependencies in the cited source when they matter.
5. Separate persistent stored changes from privileged state recreated during execution. Explain which later capabilities depend on the resulting runtime patch set.

## Keep these distinctions visible

- Encryption hides content; authentication establishes whether content should be trusted. Decrypting a console-specific structure does not grant authority to sign new software.
- A custom dashboard is an application, not proof of a particular exploit or kernel.
- A console-specific CPU key is not a universal signing or unlock key.
- Persistent modifications can still depend on intact flash data, compatible storage, timing and software. A retail boot mode does not establish online-service safety.

## Return

Give a concise explanation centered on the relevant trust boundary. When a diagram helps, keep it small, label conceptual assumptions, and include a plain-text explanation so the answer works without Mermaid rendering. Attach source links to implementation-specific claims and distinguish inference from documented behavior.

## Example prompts

- “Show where Bad Update and RGH affect the boot/runtime chain, without operational steps.”
- “Explain why a CPU key and a custom dashboard do not imply the console can sign arbitrary software.”

Written with AI assistance for education; unaffiliated with M$. Reading this skill does not authorize console modification. See the [educational and responsibility notice](references/notice.md).
