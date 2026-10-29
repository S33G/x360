<!-- Generated from docs/BETTER_SOFTMOD.md; edit the canonical chapter and run npm run skills:sync. -->
<!-- Source SHA-256: bda21275b38b1da21ba9351c09f5585bcef7d2d5c936ee0d952959a88f307a54 -->

# Choosing a path

Start with the motherboard, then compare the features needed from the software running on it. **A matching board is a starting point, not proof that a particular console is eligible.** Bootloader version, dashboard, storage and installation details still matter.

Checked **29 October 2026** against [ConsoleMods' Exploit Chart][chart], [Getting Started][start] and the project sources below. This is a reading guide, not an installation procedure.

## Board compatibility

The table lists current software paths and commonly used hardware paths. **BU** means [Bad Update](https://github.com/s33G/x360/blob/main/docs/exploits/BAD_UPDATE.md), published for dashboard **17559**. **PP** means [Peer Pressure](https://github.com/s33G/x360/blob/main/docs/PEER_PRESSURE_GUIDE.md), whose current installation path also uses 17559. “Possible” JTAG support always requires an unpatched CB bootloader.

| Motherboard | Software candidates | Hardware candidates | JTAG / SMC hack |
|---|---|---|---|
| Xenon / Elpis | BU, PP | EXT_CLK; RGH1.2 has limited results | Possible; refurbished units need particular care |
| Zephyr | BU, PP | EXT_CLK; RGH1.2 has limited results | Possible |
| Falcon / Opus | BU, PP | RGH1.2; RGH3 with reliability caveats | Possible |
| Jasper | BU, PP | RGH1.2; RGH3 with reliability caveats | Possible |
| Tonasket | BU, PP | RGH1.2; RGH3 with reliability caveats | No stock vulnerable CB |
| Trinity | BU, PP | RGH3, RGH1.2 V2, S-RGH | No |
| Corona | BU | RGH3, RGH1.2 V2, S-RGH | No |
| Waitsburg | BU | Same Corona-family methods; POST access required | No |
| Stingray | BU | Same Corona-family methods; POST access required | No |
| Winchester / Barracuda | BU | No established RGH path | No |

The board families and exceptions come from the [chart][chart] and [board guide][start]. The [published timing packs][timings] cover EXT_CLK for Xenon/Zephyr, RGH1.2 V2 for Falcon/Jasper/Trinity/Corona, and S-RGH V3 for Trinity/Corona. Early-phat RGH1.2 and Jasper-family S-RGH have poorer results; they are not equivalent alternatives. [RGH1.2 limits][rgh12] · [S-RGH limits][srgh]

[JTAG](https://github.com/s33G/x360/blob/main/docs/exploits/JTAG.md) needs both a suitable early dashboard and an unpatched CB; “7371 or older” alone is insufficient. Stock Tonasket is excluded. [RGH3](https://github.com/s33G/x360/blob/main/docs/exploits/RGH3.md) still needs hardware work: its original source warns about Falcon/Jasper boot retries and unfinished Zephyr support. This table does not promote the unrefined Zephyr code to an established route. [JTAG limits][start] · [RGH3 source][rgh3]

Names can hide important differences. **Elpis** is a refurbished Xenon, **Opus** is a Falcon-derived service board, **Waitsburg** is often called Corona V3/V4, and **Stingray** Corona V5/V6. Winchester is also called **Barracuda**. Use the [motherboard identification reference][boards] when the revision is uncertain; the case shape alone is insufficient.

[RGH1](https://github.com/s33G/x360/blob/main/docs/exploits/RGH1.md), [RGH2](https://github.com/s33G/x360/blob/main/docs/exploits/RGH2.md), [R-JTAG](https://github.com/s33G/x360/blob/main/docs/exploits/RJTAG.md), [R-JTOP](https://github.com/s33G/x360/blob/main/docs/exploits/RJTOP.md) and [King Kong](https://github.com/s33G/x360/blob/main/docs/exploits/KING_KONG.md) have separate historical constraints. The newer [RGH1.3](https://github.com/s33G/x360/blob/main/docs/exploits/RGH13.md) and [EXT+3](https://github.com/s33G/x360/blob/main/docs/exploits/EXT_PLUS3.md) are **beta** work: Falcon/Jasper-family and Xenon/Zephyr respectively, without a guaranteed boot-time improvement. [RGH1.3 project][rgh13]

## Compare the software environments

These names describe different layers:

1. **Bad Update** gains temporary hypervisor control and launches a prepared executable. Rock Band Blitz / [DaTArrest](https://github.com/s33G/x360/blob/main/docs/exploits/DATARREST.md) and [ABadAvatar](https://github.com/s33G/x360/blob/main/docs/exploits/ABADAVATAR.md) are entry routes, not replacement runtime environments.
2. **FreeMyXe** and **XeUnshackle** are payloads launched after Bad Update. They add patches and launch features to that session.
3. **Peer Pressure** installs a separate startup exploit and runtime. Its installer uses temporary execution, but its NAND and HDD changes survive power-off.

The comparison uses [Bad Update v1.3][bu-release], [FreeMyXe 1.2.1][fm-release], [XeUnshackle BETA v1.03][xu-release] and [Peer Pressure v1.0.477][pp-release]. “Not included” means another component is needed. “Unverified” means the cited project material does not establish that feature; it does not prove impossibility. Support claims are upstream documentation, not results from testing consoles for this guide.

### Boot and persistence

| Feature | Bad Update alone | + FreeMyXe | + XeUnshackle | Peer Pressure |
|---|---|---|---|---|
| Role | Temporary exploit | Runtime patcher / launcher | Runtime patcher + DashLaunch | Persistent exploit + own runtime |
| Normal entry | Rock Band Blitz in v1.3 | After Bad Update | After Bad Update | Startup, after installation |
| Hacked state survives reboot | No | No | No | Restored by repeating startup exploit |
| Automatic start | Entry-dependent; see ABadAvatar below | Automatic patch / XeLL choices | Entry plus DashLaunch configuration | Normal boot; configurable dashboard |
| Board coverage | All listed boards, 17559 | Inherits entry limits; app support varies | Inherits entry limits; app support varies | Phats and Trinity; excludes later families |
| Soldering for normal path | Not required | Not required | Not required | Not required; recovery can require hardware |

Sources: [Bad Update scope][bu], [FreeMyXe automatic choices][fm-auto], [XeUnshackle lifecycle][xu], [Peer Pressure boot modes][pp-boot] and [installation requirements][pp-install].

**Automatic entry is not persistent privilege.** The ABadAvatar v1.3-beta fork can trigger at the profile-selection screen with automatic sign-in disabled. Its files can remain on HDD, memory unit or USB, but it recreates the privileged session each boot. The release reports incomplete reliability and a Kinect-related reduction in success. [ABadAvatar release][avatar]

Temporary patches also do not undo files written by an application. That distinction matters for every payload launched after Bad Update.

### Applications, dashboards and plugins

| Feature | Bad Update alone | + FreeMyXe | + XeUnshackle | Peer Pressure |
|---|---|---|---|---|
| Homebrew XEX launch | Prepared retail-format XEX; restrictions must already be removed | Yes | Yes | Yes |
| Devkit-signed / encrypted XEX | Not the documented input format | Yes | Yes | Yes |
| Content, media and region checks | Not a complete runtime patch set | Selected xeBuild patches; title support varies | Claims xeBuild kernel / HV patch set | Documented executable, content and region patches |
| Homebrew dashboards | Requires a suitable payload | Auto-launch supported | Via DashLaunch | Built-in default-dashboard setting and Guide shortcuts |
| DashLaunch | Not included | Not included | Modified runtime included | Explicitly unsupported upstream |
| System plugins | Not included | **Limited subset**, added in 1.2; loader fix in 1.2.1 | Supported through DashLaunch; testing limited | DashLaunch plugins unsupported |
| Title-specific DLLs | Payload-dependent | No general sideload promise | Plugin / title compatibility varies | Explicit DLL sideload support, e.g. RB3Enhanced |
| Old M$ dashboard apps | Payload-dependent | Unverified per version | Unverified per version / plugin | 4548 launch tested by author, not fully functional |
| Older kernel installation | Not provided | Not provided | Not provided | Not supported; old dashboard apps are separate |
| Global multi-disc auto-swap | Not included | No global feature claim | DashLaunch provides it | Not built in; Aurora / FSD can provide their own |

Sources: [Bad Update input requirements][bu], [FreeMyXe features][fm], [FreeMyXe 1.2.1 changes][fm-release], [XeUnshackle features][xu], [its testing limits][xu-release], [Peer Pressure patches][pp-features] and [plugin policy][pp]. For older dashboards see the author's [4548 qualification][pp-old-dash] and [older-kernel decision][pp-old-kernel]. Auto-swap is cross-checked with [ConsoleMods][start] and the [upstream Peer Pressure roadmap][pp-roadmap].

FreeMyXe's general README still points plugin users toward XeUnshackle; the newer release notes explicitly add a limited plugin loader. Conversely, XeUnshackle's broad compatibility language is **not** evidence that every plugin works: BETA v1.03 documents Neighborhood/JRPC2 setup and says no further plugin tests were performed.

### Alternate software and runtime patches

| Feature | Bad Update alone | + FreeMyXe | + XeUnshackle | Peer Pressure |
|---|---|---|---|---|
| XeLL / LibXenon launch | Requires another payload | Explicitly supported | No integrated XeLL launcher documented | XeLL / OtherOS startup target |
| Linux | Not bundled | Via compatible XeLL / Linux stack | Separate compatible loader / stack needed | Via OtherOS; Linux support remains separate |
| Original Xbox emulation | No compatibility patch promise | Explicit support since 1.2 | Not separately verified here | Not separately verified here |
| Memory protections / HV access | Initial privileged execution | Runtime access patches | Kernel / HV patch set, PeekPoke and Syscall0 access | Page-protection and executable-check patches |
| System Link latency limit | No runtime feature promise | Removed | Part of broader patch-set claim | Removed |
| Extra USB controllers | Not included | Authentication patch for compatible devices | Usbdsec patch | Not a published general controller feature |
| Ring of Light / controller sync repair after entry | Not included as a runtime feature | Yes | Yes | Separate startup path |
| PC debug tools | Requires a payload | Per-plugin compatibility unverified | Neighborhood / JRPC2 configuration documented | No built-in XBDM feature promised in this release |
| Console information tools | Payload-dependent | Key display | Key display, 1BL and MAC readout features | Settings and installer backup tools |

Sources: [FreeMyXe features][fm] and [1.2 changes][fm-release], [XeUnshackle features][xu] and [release limits][xu-release], [Peer Pressure patches][pp-features], [settings][pp-settings] and [current versus proposed features][pp]. **XeLL support does not establish a working modern Linux distribution on every board.** See [Homebrew and Linux](homebrew.md). Console-specific outputs belong in private storage, not the guide or a public issue.

### Storage

| Feature | Bad Update alone | + FreeMyXe | + XeUnshackle | Peer Pressure |
|---|---|---|---|---|
| HDD / USB application storage | Entry and payload determine access | Supported within retail / Bad Storage limits | Supported within retail / Bad Storage limits | Internal HDD required for startup; homebrew can use USB |
| Larger internal disks | No capacity patch itself | Includes Bad Storage | Includes Bad Storage in v1.03 | Installer formats up to 2 TB |
| Arbitrary unauthenticated internal disk | Not provided | Not with original Bad Storage alone | Not with original Bad Storage alone | HDD authentication checks removed |
| SSDs | Entry storage-dependent | Bad Storage supports specified prepared drives | Same Bad Storage constraints | Some work; mechanical HDD recommended for timing |
| Secondary internal HDD / over 2 TB | No feature claim | Unverified here | Unverified here | Secondary HDD is roadmap work; over 2 TB not established |
| Storage caveats | No general patch-layer guarantee | Bad Storage caveats apply | Bad Storage caveats apply | Disk timing and partition size affect startup |

**Capacity, authentication and startup timing are separate questions.** Original [Bad Storage][storage] expands a supported disk to at most 2 TB **after** retail authentication; it does not make any unprepared drive acceptable. Its effects end at cold reboot or shutdown. The published page also records Kinect-before-patching errors and title-update issues. Those limits belong to that implementation, not every later fork. [Bad Storage lifecycle][storage-code]

Peer Pressure instead uses the disk during its startup exploit. Its [installation documentation][pp-install] and [HDD/SSD explanation][pp] distinguish capacity from reliable exploit timing. Its [roadmap][pp-roadmap] is not evidence that secondary-HDD support has shipped.

### Recovery, source and network limits

| Feature | Bad Update alone | + FreeMyXe | + XeUnshackle | Peer Pressure |
|---|---|---|---|---|
| Persistent NAND installation | No | No | No | Yes, plus HDD changes |
| NAND protection | Not a recovery guarantee | Does not make NAND-writing apps safe | Does not make NAND-writing apps safe | Built-in write guard, with configuration exceptions |
| Recovery facilities | v1.3 boot-animation repair for a specific failure | Entry's recovery; no full recovery system | Entry's recovery; no full recovery system | Safe / Retail modes; installer startup repair and uninstall |
| Public source | Yes; v1.3 branch does not build unchanged | Source and build notes published | Source published; runtime components also matter | Original full source not released |
| M$ Xbox Live safety | Not established | Live blocking; upstream still warns about bans | Stealth compatibility is not a safety guarantee | Retail Mode is not proof of Live safety |
| Updates / configuration | Release files | INI configuration | DashLaunch configuration | Settings app with update checks |

Sources: [Bad Update v1.3 recovery and build caveat][bu-release], [FreeMyXe warnings][fm] and [build notes][fm-build], [XeUnshackle warnings][xu], [Peer Pressure source policy][pp], [boot modes][pp-boot], [settings and NAND limits][pp-settings] and [installer repair][pp-install]. A damaged boot chain can defeat software recovery. Peer Pressure's Retail Mode bypasses its exploit; it does not remove the installation.

## PeerSlop: a separate research branch

[PeerSlop](https://github.com/s33G/x360/blob/main/docs/PEER_PRESSURE_GUIDE.md#research-note-peerslop) extends Peer Pressure and deserves separate evaluation. **DarkLimbo directs and hardware-tests it, with substantial AI assistance in coding, debugging and documentation.** That published research also helped this guide's understanding of the runtime and release structure. The following are v1.0.477-4 claims, not upstream Peer Pressure support or proof of safe Live access. [Project description and release scope][ps]

| Difference | Upstream Peer Pressure | PeerSlop v1.0.477-4 |
|---|---|---|
| DashLaunch / plugins | Unsupported | Adapted runtime and configuration UI; bundled version required |
| Live policy | Retail-mode safety remains unestablished | Claims access in softmod mode; safety remains unestablished |
| Animation UI | Integrated settings; Blades theme editor | Combined Blades / Kinect editor |
| Updates / recovery | Settings updater; Safe / Retail modes and startup repair | Adds offline USB updates; recovery skips plugin configuration |
| Source / rebuild scope | Original full source not public | Modified source and pinned inputs; retained binary modules |

Sources: [upstream policy][pp], [upstream settings][pp-settings], [PeerSlop features][ps] and [build scope][ps-build].

The public repository is useful for studying its modifications and release assembly. It is **not the complete original Peer Pressure source**: the build retains installer, editor, renderer and other binary modules that it does not recompile. Its author also distinguishes assembling tested components from newly compiled binaries needing hardware validation. [Build scope][ps-build]

Read the board constraints first, choose the required runtime features second, then check the exact release and application's documentation. The [exploit atlas](https://github.com/s33G/x360/blob/main/docs/XBOX360_MODDING.md) explains how these methods relate; the [Peer Pressure guide](https://github.com/s33G/x360/blob/main/docs/PEER_PRESSURE_GUIDE.md) covers its modes and upstream/fork distinction in more detail.

[chart]: https://consolemods.org/wiki/Xbox_360:Exploit_Chart
[start]: https://consolemods.org/wiki/Xbox_360:Getting_Started
[boards]: https://consolemods.org/wiki/Xbox_360:Motherboard_Information
[timings]: https://github.com/Octal450/Timing-Files/releases
[rgh12]: https://consolemods.org/wiki/Xbox_360:RGH/RGH1.2
[srgh]: https://consolemods.org/wiki/Xbox_360:RGH/S-RGH
[rgh3]: https://github.com/15432/RGH3
[rgh13]: https://github.com/wurthless-elektroniks/RGH1.3/blob/main/readme.md
[bu]: https://github.com/grimdoomer/Xbox360BadUpdate
[bu-release]: https://github.com/grimdoomer/Xbox360BadUpdate/releases/tag/BadUpdate-v1.3
[avatar]: https://github.com/bibarub/Xbox360BadUpdate/releases/tag/avatar-v1.3-beta
[fm]: https://github.com/FreeMyXe/FreeMyXe
[fm-release]: https://github.com/FreeMyXe/FreeMyXe/releases/tag/1.2.1
[fm-auto]: https://github.com/FreeMyXe/FreeMyXe/wiki/Automatic-Patching
[fm-build]: https://github.com/FreeMyXe/FreeMyXe/blob/master/BUILDING.md
[xu]: https://github.com/Byrom90/XeUnshackle
[xu-release]: https://github.com/Byrom90/XeUnshackle/releases/tag/v1.03
[pp]: https://github.com/grimdoomer/Xbox360PeerPressure
[pp-release]: https://github.com/grimdoomer/Xbox360PeerPressure/releases/tag/v1.0.477
[pp-features]: https://github.com/grimdoomer/Xbox360PeerPressure/wiki/Softmod-Features
[pp-settings]: https://github.com/grimdoomer/Xbox360PeerPressure/wiki/Softmod-Settings
[pp-boot]: https://github.com/grimdoomer/Xbox360PeerPressure/wiki/Booting-Your-Console
[pp-install]: https://github.com/grimdoomer/Xbox360PeerPressure/wiki/Installation
[pp-old-dash]: https://github.com/grimdoomer/Xbox360PeerPressure/issues/7
[pp-old-kernel]: https://github.com/grimdoomer/Xbox360PeerPressure/issues/24
[pp-roadmap]: https://github.com/grimdoomer/Xbox360PeerPressure/issues/1
[storage]: https://fatxplorer.eaton-works.com/bad-storage/
[storage-code]: https://github.com/EatonZ/BadStorage
[ps]: https://gitlab.com/darkkiritov/peerslop/-/raw/main/README.md
[ps-build]: https://gitlab.com/darkkiritov/peerslop/-/raw/main/BUILDING.md
