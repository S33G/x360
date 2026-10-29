---
name: xbox360-homebrew-compatibility
description: Assess Xbox 360 homebrew, dashboard, plugin, XeLL, LibXenon, Linux or storage compatibility against an exact exploit and runtime environment.
metadata:
  author: s33g
  version: '1.0.0'
---

# Xbox 360 homebrew compatibility

Determine whether the requested application or feature has a documented path through the user's actual runtime.

Read [Homebrew, kernels and Linux](references/homebrew.md) for environment differences and [Choosing a path](references/choosing-a-path.md) for versioned feature comparisons. Refresh changing claims from their linked upstream sources; if unavailable, report the bundled snapshot date rather than calling it current.

## Workflow

1. Identify the desired software or capability and its exact version. Distinguish an application, dashboard, plugin, bare-metal ELF program, Linux stack or storage extension.
2. Establish the motherboard and execution path, then the runtime payload and release. “Modded,” “softmod” or a dashboard screenshot does not identify the environment sufficiently.
3. Check the required API and loader. Retail XEX software, XeLL/LibXenon programs and Linux software inhabit different environments; unsigned execution alone does not provide all three.
4. Compare documented support for the specific feature: plugin loader, kernel exports, XAM services, storage preparation, drivers, architecture or userland. A loader's presence does not prove every plugin or application works.
5. Classify the result as documented support, documented exclusion, observed on a specified setup, or unverified. Describe any missing prerequisite that decides the outcome.

For Linux, assess boot path, kernel patches, toolchain and ABI-compatible userland together. A historical walkthrough is not evidence that a current distribution image works. For dashboards, separate the application build from the underlying kernel version. For storage, separate runtime policy patches from drive preparation and physical compatibility.

## Return

Lead with the compatibility conclusion and its scope. Give a short requirement/evidence table when several components matter. Name exact releases, check dates and known limitations; do not convert one successful demonstration into universal support or guarantee performance.

Compare Peer Pressure against its upstream features. Treat PeerSlop additions as an independent extension and label them accordingly.

## Example prompts

- “Does FreeMyXe's plugin loader mean every DashLaunch plugin works?”
- “I want to run a LibXenon ELF and an older dashboard. Explain the different requirements.”

This assesses compatibility without downloading or executing console software, installing payloads or contacting console services. Written with AI assistance; unaffiliated with M$. See the [educational and responsibility notice](references/notice.md).
