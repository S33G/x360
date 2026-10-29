# Sources and thanks

This guide explains other people's research and software. Credit belongs to the developers, reverse engineers, maintainers and testers who made that work public. Source register checked **29 October 2026**; release and support details remain version-specific.

## Special thanks

- **Grimdoomer** — [Bad Update](https://github.com/grimdoomer/Xbox360BadUpdate) and [Peer Pressure](https://github.com/grimdoomer/Xbox360PeerPressure). Peer Pressure also credits **ihatecompvir** and **InvoxiPlayGames** for the Rock Band Blitz entry point, **Máté** for stage-three improvements, and its alpha/beta testers. [Original acknowledgements](https://github.com/grimdoomer/Xbox360PeerPressure#credits).
- **DarkLimbo / darkkiritov** — direction and hardware testing for [PeerSlop](https://gitlab.com/darkkiritov/peerslop), with substantial AI assistance disclosed by the project. **GitLab is the canonical project link used here.** Its work extends Peer Pressure; it does not replace Grimdoomer's authorship or imply endorsement. [Project account](https://gitlab.com/darkkiritov/peerslop/-/raw/main/README.md).
- **cOz**, **951261**, and **Team XeDev** — respectively DashLaunch, its BadUpdate GUI adaptation, and optional XeXMenu, as credited by PeerSlop. Its component notices also acknowledge the libraries and assets incorporated upstream. [Licenses and attribution](https://gitlab.com/darkkiritov/peerslop/-/raw/main/Licenses-and-Attribution.md).
- **Michael Steil, Felix Domke, GliGli, Tiros, and the Free60 contributors** — original security explanations, early exploit research, RGH development and the preservation of technical references. [24C3 presentation](https://media.ccc.de/v/24c3-2279-en-deconstructing_xbox_360_security), [original RGH account](https://free60.org/Hacks/Reset_Glitch_Hack/).
- **15432, Octal450, DrSchottky, and later glitch-method contributors** — published implementations, timing work and tools. Individual attribution and support boundaries belong to the linked projects below.
- **InvoxiPlayGames and the FreeMyXe contributors, Byrom90, shutterbug2000, bibarub, and Eaton** — entry points, post-exploit environments and storage work represented in the modern-software section below.
- **Free60, XeLL, libxenon and Linux contributors** — the software and documentation that turn research access into independent programs and operating-system experiments.
- **ConsoleMods contributors** — the [Xbox 360 community wiki](https://consolemods.org/wiki/Xbox_360:Xbox_360_Mods_Wiki), including hardware identification, exploit comparisons, NAND guides and homebrew documentation used to cross-check this guide.

## Primary source register

These are starting points for checking claims, not a mirror of their content. The relevant chapter links the specific page supporting each explanation.

| Area | Primary references | Guide chapter |
|---|---|---|
| Architecture and early security | [Steil/Domke presentation](https://media.ccc.de/v/24c3-2279-en-deconstructing_xbox_360_security); [original hypervisor advisory](https://seclists.org/bugtraq/2007/Feb/514); [Free60 boot process](https://free60.org/System-Software/Boot_Process/) | [Boot chain](BOOT_CHAIN.md) |
| NAND structures and tooling | [Free60 NAND reference](https://free60.org/Hardware/Console/NAND/); [J-Runner with Extras source](https://github.com/J-Runner-With-Extras/J-Runner-with-Extras) | [NAND explained](NAND_EXPLAINED.md) |
| King Kong and JTAG/SMC | [Preserved King Kong guide](https://github.com/Free60Project/wiki/blob/master/docs/Hacks/King_Kong_Hack.md); [SMC technical account](https://free60.org/Hacks/SMC_Hack/) | [Modding overview](XBOX360_MODDING.md) |
| RGH and later glitch methods | [GliGli's source](https://github.com/gligli/tools); [15432's RGH2 family](https://github.com/15432/X360ACE_RGH2); [RGH3](https://github.com/15432/RGH3); [Octal450's timings](https://github.com/Octal450/Timing-Files/releases); [R-JTOP](https://github.com/DrSchottky/R-JTOP); [RGH1.3](https://github.com/wurthless-elektroniks/RGH1.3) | [Exploit timeline](EXPLOIT_TIMELINE.md) |
| Modern software entry and runtime | [Bad Update](https://github.com/grimdoomer/Xbox360BadUpdate); [InvoxiPlayGames' project list](https://invoxiplaygames.uk/); [ABadAvatar](https://github.com/shutterbug2000/ABadAvatar); [bibarub's avatar fork](https://github.com/bibarub/Xbox360BadUpdate/releases/tag/avatar-v1.3-beta); [FreeMyXe](https://github.com/FreeMyXe/FreeMyXe); [XeUnshackle](https://github.com/Byrom90/XeUnshackle) | [Modding overview](XBOX360_MODDING.md) |
| Persistent softmods | [Peer Pressure](https://github.com/grimdoomer/Xbox360PeerPressure); [PeerSlop](https://gitlab.com/darkkiritov/peerslop); [PeerSlop build scope](https://gitlab.com/darkkiritov/peerslop/-/raw/main/BUILDING.md) | [Peer Pressure](PEER_PRESSURE_GUIDE.md) |
| Storage | [Eaton's Bad Storage explanation](https://fatxplorer.eaton-works.com/bad-storage/); [Bad Storage source](https://github.com/EatonZ/BadStorage) | [Choosing a path](BETTER_SOFTMOD.md) |
| Independent software and operating systems | [XeLL-Reloaded](https://github.com/Free60Project/xell-reloaded); [libxenon](https://github.com/Free60Project/libxenon); [Free60 Linux patches](https://github.com/Free60Project/linux-kernel-xbox360) | [Firmware and operating systems](CUSTOM_FIRMWARE.md) |

## ConsoleMods reference register

These community guides were checked on **29 October 2026**. They supply explanations and cross-checks alongside the primary sources above; their broad compatibility tables do not replace a project's exact release notes.

| Topic | ConsoleMods references | Guide chapter |
|---|---|---|
| Orientation and hardware names | [Getting started](https://consolemods.org/wiki/Xbox_360:Getting_Started); [motherboard information](https://consolemods.org/wiki/Xbox_360:Motherboard_Information) | [Start here](START_HERE.md) |
| Exploit families and history | [Exploit chart](https://consolemods.org/wiki/Xbox_360:Exploit_Chart); [scene history](https://consolemods.org/wiki/Xbox_360:Scene_History) | [Exploit atlas](XBOX360_MODDING.md); [timeline](EXPLOIT_TIMELINE.md) |
| Boot-time hardware methods | [JTAG](https://consolemods.org/wiki/Xbox_360:JTAG); [RGH](https://consolemods.org/wiki/Xbox_360:RGH) | [Boot chain](BOOT_CHAIN.md) |
| Software methods | [Bad Update](https://consolemods.org/wiki/Xbox_360:Bad_Update); [Peer Pressure](https://consolemods.org/wiki/Xbox_360:Peer_Pressure) | [Choosing a path](BETTER_SOFTMOD.md); [Peer Pressure](PEER_PRESSURE_GUIDE.md) |
| Flash storage | [Standard NAND](https://consolemods.org/wiki/Xbox_360:Standard_NAND); [4 GB NAND](https://consolemods.org/wiki/Xbox_360:4GB_NAND) | [NAND explained](NAND_EXPLAINED.md) |
| Independent software | [XeLL](https://consolemods.org/wiki/Xbox_360:XeLL); [dashboard overview](https://consolemods.org/wiki/Xbox_360:Dashboards_Overview); [homebrew apps](https://consolemods.org/wiki/Xbox_360:Homebrew_Apps_List); [Linux](https://consolemods.org/wiki/Xbox_360:Linux) | [Homebrew, kernels and Linux](CUSTOM_FIRMWARE.md) |
| Scene terminology | [FAQ definitions](https://consolemods.org/wiki/Xbox_360:Frequently_Asked_Questions_(FAQ)#Definitions) | [Glossary](GLOSSARY.md) |

Several limits matter when following these references. The Linux walkthrough uses Ubuntu 10.10 Xenon Beta 5, so it is historical context for newer Linux work. The FAQ's Keyvault definition includes the CPU key, but [Free60's fuse documentation](https://free60.org/Hardware/Fusesets/#fusesets-03-06) places that key in CPU fuse data. This guide preserves that distinction. We also do not adopt the FAQ's claim that dual-NAND makes online play safe: a boot arrangement does not establish acceptance by M$ services.

## How to use the evidence

An author-maintained README establishes what a project claims to support. Source can establish implementation details. Release notes identify changes in one published version. None alone establishes that a particular console has been tested successfully. Historical guides are valuable records, but their dates, names and limitations must remain attached to the claims drawn from them.

Peer Pressure's original implementation is distributed without its full source. PeerSlop combines published modifications with retained binary components. Its [build description](https://gitlab.com/darkkiritov/peerslop/-/raw/main/BUILDING.md) explains that boundary. Preserve it when describing either project.

The original projects retain their licenses and attribution requirements. This guide does not redistribute console dumps, decrypted identities, M$ development tools or copyrighted system packages. Links are references, not an instruction to install or run anything.

## Homepage model

[Classic Xbox 360 — White Edition](https://sketchfab.com/3d-models/classic-xbox-360-white-edition-a88f93403ba64726a4b68611db420a67) by [Anand Stephen](https://sketchfab.com/anandstephen5), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Thank you for making the model available.

The homepage uses a local geometry-only adaptation of this model. Materials, textures, cameras and animations are removed; mesh transforms are applied, duplicate vertices are merged, and the model is centered and scaled for display. Three.js renders crease and boundary lines in the site’s green, with a shaded surface and camera rotation. Triangle divisions on smooth surfaces are omitted. The original mesh remains the work of Anand Stephen. See the [model attribution](../assets/console-model.LICENSE.md).
