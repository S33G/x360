# Agent skills

Seven portable skills turn this field guide into focused research workflows. Each folder includes a `SKILL.md` entry point and the references it needs, so you can install one skill without keeping the whole repository. They help an agent explain evidence, identify missing information and avoid treating a board name or a successful example as proof of compatibility.

The skills use the [Agent Skills format](https://agentskills.io/specification). Tools with native support can discover them; other agents can read the same Markdown when you provide it explicitly. There is no universal automatic installer or activation syntax for every agentic tool.

## Choose a skill

| Skill | Use it for | Example request |
|---|---|---|
| [xbox360-exploit-landscape](../skills/xbox360-exploit-landscape/SKILL.md) | Entry points, privileged exploits, hardware methods and conditional compatibility | “Explain the research options for a Winchester board. Separate software entry points from payloads.” |
| [xbox360-peer-pressure](../skills/xbox360-peer-pressure/SKILL.md) | Peer Pressure releases, startup behaviour and the separate PeerSlop research | “Compare upstream Peer Pressure with PeerSlop. Label documented features and unverified claims.” |
| [xbox360-nand-structure](../skills/xbox360-nand-structure/SKILL.md) | NAND geometry, spare data, logical offsets and structures | “Explain why raw and logical offsets differ. Use synthetic examples.” |
| [xbox360-nand-analysis](../skills/xbox360-nand-analysis/SKILL.md) | Local inspection or interpretation of the browser/Node NAND inspector's report | “Interpret this redacted report. Separate observed fields, hints and unknowns.” |
| [xbox360-boot-chain](../skills/xbox360-boot-chain/SKILL.md) | Boot stages, trust boundaries and where different methods act | “Explain where JTAG and RGH affect the boot chain, without installation instructions.” |
| [xbox360-homebrew-compatibility](../skills/xbox360-homebrew-compatibility/SKILL.md) | Runtime capabilities, applications, plugins, storage and persistence | “Can this runtime load a system plugin? Check the exact release and explain the limits.” |
| [xbox360-privacy-review](../skills/xbox360-privacy-review/SKILL.md) | Reviewing documentation, outputs and Git exposure for private console data | “Review this change for identifying data. Report locations and categories without repeating secrets.” |

## Install with the Skills CLI

The [Skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) accepts repository URLs and local directories. Its current release requires **Node.js 22.20.0 or newer**; see the [upstream requirements](https://github.com/vercel-labs/skills#install-a-skill). It installs into a project by default; `--global` selects a user installation. The examples keep confirmation prompts and explicitly target one agent.

First list the published skills:

```sh
npx --registry=https://registry.npmjs.org skills add s33G/x360 --list
```

Choose your agent before installing. Examples from the CLI's [supported-agent list](https://github.com/vercel-labs/skills/blob/main/docs/agents.md):

| Tool | `--agent` value |
|---|---|
| Codex | `codex` |
| Claude Code | `claude-code` |
| Cursor | `cursor` |
| OpenCode | `opencode` |

Replace `codex` below with your choice. Install one skill:

```sh
npx --registry=https://registry.npmjs.org skills add s33G/x360 --skill xbox360-exploit-landscape --agent codex
```

Or install all seven:

```sh
npx --registry=https://registry.npmjs.org skills add s33G/x360 --skill '*' --agent codex
```

Do not substitute `--all`: that option also targets every agent and skips prompts. The `--registry` option selects public npm for this invocation without changing your saved registry settings; npm options belong before `skills`. See the [npx documentation](https://docs.npmjs.com/cli/v11/commands/npx/).

These commands use what is **published on GitHub**, not uncommitted local changes. If the listing still shows the earlier four skills, use a local checkout containing this suite until the new version is published. For a reproducible installation, use a reviewed GitHub tree URL with a specific commit in place of `s33G/x360`.

## Install from a local checkout

Run these from the project where you want the skills installed. Replace `../x360` with the path to your reviewed checkout:

```sh
npx --registry=https://registry.npmjs.org skills add ../x360 --list
npx --registry=https://registry.npmjs.org skills add ../x360 --skill '*' --agent codex --copy
```

`--copy` installs independent copies. Later edits in the source checkout need a deliberate reinstall; they do not silently change those copies. Neither a GitHub publication nor the website build is needed to install from a local checkout.

## Manual use in other tools

Copy each complete `skills/xbox360-…/` folder you want into the skill directory documented by your tool. Keep its name, `SKILL.md`, `references/` and any `scripts/` together. You do not need the site's dependencies, generated HTML, repository history or other skill folders. Reload or rescan skills if your tool requires it.

For a tool without native skill discovery, put the folder in its accessible workspace and ask:

> Read `xbox360-exploit-landscape/SKILL.md` and its relevant bundled references. Explain the documented research options for a Winchester board. Separate established facts, release-specific claims and unknowns. Do not execute anything.

If the tool cannot read local files, attach the entry point and the references it requests. Pasting only the entry point leaves out the technical evidence. Manual use does not add missing browsing, filesystem or execution capabilities to the agent.

## Check the result

Ask the smoke-test prompt above after installation. A useful answer identifies the sources it actually read, separates the software route from unsupported hardware assumptions, and does not run an installer or analyzer. If it cannot find the references, check that the complete folder was installed. Browsing is only needed to refresh upstream evidence; bundled references remain readable offline.

The suite contains no tool-specific hooks, SDK credentials or automatic execution setup. `xbox360-nand-analysis` includes the standalone `scripts/x360nand.mjs` program for Node.js 22 or newer. It uses the same TypeScript parser as the [browser NAND inspector](NAND_ANALYZER.md), accepts explicit input and optional key-file paths, and produces redacted output by default. It does not discover adjacent keys. Its scope is 16 MiB data-only and 16.5 MiB small-block raw images; other layouts are rejected. Even redacted output remains private. Reading or installing that skill does not authorise running it. See [NAND explained](NAND_EXPLAINED.md) and [Privacy](PRIVACY.md).

## Maintain or remove an installation

Use `npx --registry=https://registry.npmjs.org skills list` to inspect project installations. The CLI also provides `skills check`, `skills update` and `skills remove`; consult its [command reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) for scope and selection options. Review changed instructions before updating. For manually copied folders, replace or remove only the folders you installed.

Maintainers edit the canonical chapters and skill instructions, then run `npm run skills:sync` and `npm run check:skills` in this repository. The first refreshes bundled references; the second checks the portable suite. The website and GitHub use the same documentation.

## Scope and attribution

These skills were written with help from AI and are for educational research. They do not grant permission to execute exploits, alter a console or access online services. This project is not affiliated with M$. Readers are responsible for their actions; s33g takes no responsibility for use of this material. Read the full [educational and responsibility notice](NOTICE.md) and [source credits](CREDITS.md).

The repository currently makes no general license grant. Installability describes the package format, not additional licensing rights. Third-party projects retain their own terms.

Installation documentation checked against the linked upstream references on **29 October 2026**. Tool support and CLI behaviour can change.
