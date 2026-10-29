# Start here

Homebrew means software made outside the platform holder's normal release process. On an Xbox 360, the interesting question is how that software gets permission to run. This guide explains the answers without turning them into installation instructions.

## Five things that are easy to confuse

1. **Entry point:** a place where specially shaped input first changes program behavior, such as a vulnerable game save parser.
2. **Exploit:** the technique that crosses a security boundary. Control inside a game is not automatically control of the hypervisor.
3. **Payload:** the software that runs after that boundary is crossed. A loader or patcher is not necessarily another exploit.
4. **Persistence:** the ability to return to a modified state after reboot. A temporary exploit and a persistent installation are different promises.
5. **Homebrew:** what you wanted to run in the first place. Emulators, original games, diagnostic tools, Linux experiments and media software live here.

Think of a building: a game entry point opens one room, a privilege escalation reaches a restricted floor, and persistence changes how you get back in next time. This is only an analogy; the [boot-chain chapter](BOOT_CHAIN.md) names the actual components.

## Choose a reading route

| Reader | Suggested route | What you should leave knowing |
|---|---|---|
| New reader | Boot chain → exploit atlas → Peer Pressure | Why the approaches differ |
| Console owner researching options | Choosing a path → privacy → exact upstream release | Which facts still need checking |
| Developer | Boot chain → homebrew → NAND | The difference between runtime environments and storage formats |
| Agent | Agent guide → relevant chapter → primary source | What is known, what is inferred, and what needs permission |

## Know which machine you mean

Xbox 360 hardware changed over its lifetime. A case shape, HDMI port or “Slim” label is only a clue. Motherboard revision, bootloader revision, dashboard build, storage hardware and prior modifications can all matter. A dashboard number alone does not prove eligibility for every technique. See the [exploit atlas](XBOX360_MODDING.md) for the conditions attached to each family.

The [ConsoleMods getting-started guide](https://consolemods.org/wiki/Xbox_360:Getting_Started) and [motherboard reference](https://consolemods.org/wiki/Xbox_360:Motherboard_Information) help connect case families with board names. Names in older guides can differ: Waitsburg is often called Corona V3/V4, Stingray Corona V5/V6, and Barracuda Winchester. Winchester remains a software-family name used by tools and projects. Keep the upstream project's terminology when checking its support list, and use the [glossary](GLOSSARY.md) when comparing labels.

Use a private research note with non-secret facts: board family if independently identified, software build, storage type, intended use, and the upstream release you checked. Do not publish a console's CPU key, DVD key, serial, console ID or backup image to ask for advice.

## What this guide promises

We explain the major documented approaches, give sources, and separate historical facts from current project claims. We do not declare a particular console safe to modify from a photograph or a forum nickname. Reading or building this guide does not run an exploit or modify a console.

A useful claim looks like: “the upstream README for this release lists these board families.” A weak claim looks like: “it worked on one Trinity, so every Slim is supported.” That distinction matters throughout the guide.

Continue with [Inside the boot chain](BOOT_CHAIN.md), or jump to [Choosing a homebrew path](BETTER_SOFTMOD.md). The [educational and responsibility notice](NOTICE.md) applies throughout.
