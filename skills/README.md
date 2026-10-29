# Xbox 360 agent skills

Seven focused research skills, packaged in the portable [Agent Skills format](https://agentskills.io/specification). Each folder contains its own entry point and bundled references; it can be used without the rest of the repository. See [Agent skills: installation and usage](../docs/AGENT_SKILLS.md) for the Skills CLI, manual installation and tools without native skill discovery.

| Skill | Purpose |
|---|---|
| [xbox360-exploit-landscape](xbox360-exploit-landscape/SKILL.md) | Classify exploit routes and conditional board compatibility |
| [xbox360-peer-pressure](xbox360-peer-pressure/SKILL.md) | Explain upstream Peer Pressure and distinguish PeerSlop research |
| [xbox360-nand-structure](xbox360-nand-structure/SKILL.md) | Interpret geometry, offsets and NAND structures |
| [xbox360-nand-analysis](xbox360-nand-analysis/SKILL.md) | Understand and, when explicitly authorised, use the experimental offline analyzer |
| [xbox360-boot-chain](xbox360-boot-chain/SKILL.md) | Explain boot stages and trust boundaries |
| [xbox360-homebrew-compatibility](xbox360-homebrew-compatibility/SKILL.md) | Compare release-specific runtime, plugin, application and storage capabilities |
| [xbox360-privacy-review](xbox360-privacy-review/SKILL.md) | Review changes and outputs without disclosing private console data |

## Package layout

Each skill has a `SKILL.md` with a name, description and workflow, plus `references/` containing the relevant field-guide chapters. Only `xbox360-nand-analysis` includes executable code: [scripts/x360nand.mjs](xbox360-nand-analysis/scripts/x360nand.mjs). It is tested with Node.js 22 and handles a limited set of small-block NAND formats. Reading or installing a skill does not authorise execution.

No tool-specific hooks, activation configuration, SDK credentials or site dependencies are required. A tool must support Agent Skills discovery or be asked to read the Markdown explicitly. Copy the entire chosen folder so its relative reference links keep working.

## Maintenance

The canonical chapters live in `docs/`. After editing those chapters or the skill entry points, run:

```sh
npm run skills:sync
npm run check:skills
```

The sync command refreshes bundled references; the check validates the portable packages. Do not edit generated reference copies instead of their canonical chapters. Technical claims retain their source links and check dates; a bundled snapshot is not proof of current upstream support.

This suite is AI-assisted educational material. See the [responsibility notice](../docs/NOTICE.md), [privacy guidance](../docs/PRIVACY.md) and [source credits](../docs/CREDITS.md). The repository currently makes no general license grant.
