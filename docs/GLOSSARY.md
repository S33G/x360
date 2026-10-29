# Glossary

Use this as a companion to the [boot chain](BOOT_CHAIN.md) and [exploit atlas](XBOX360_MODDING.md). Definitions explain the words; compatibility belongs to the exact upstream project and release.

| Term | Plain-English meaning |
|---|---|
| 1BL | Initial CPU bootloader in ROM |
| CB | An early boot stage; its revision and structure matter to boot attacks |
| CPU key | A console-specific cryptographic secret held in CPU fuse data; distinct from the Keyvault it protects |
| Dashboard | The console's user-facing system software; its build number is one compatibility fact |
| DMA | Direct memory access: hardware moving data without the CPU copying every byte |
| DVD key | Console/optical-drive pairing secret |
| ECC | Error-correcting code; in scene discussions “ECC image” can also refer to a particular boot-image artifact |
| ELF | Executable format used by Linux and many LibXenon applications |
| eMMC | Managed flash storage with its own controller; do not assume a raw small-block NAND layout |
| Entry point | The first controllable foothold into a vulnerable program |
| eFuses | One-time-programmable state in the CPU, used in console security and configuration |
| FATX / XTAF | Names encountered for Xbox-family storage filesystems; distinct from a PC's FAT32 volume |
| Fault injection | Deliberately disturbing hardware execution to make a protected operation misbehave |
| Flash | Non-volatile rewritable storage; NAND is one kind |
| Hypervisor | Highly privileged code enforcing security boundaries below ordinary applications |
| JTAG | A hardware test/debug interface; in this scene also shorthand for the historical SMC/JTAG modification |
| Kernel | Core system software providing services to other programs |
| Keyvault / KV | Console-specific encrypted identity and pairing data |
| LibXenon | Community library/toolchain for bare-metal Xbox 360 homebrew |
| NAND dump | A copy of flash contents, potentially including spare metadata and private console data |
| OOB / spare | Bookkeeping bytes stored alongside a NAND page's data |
| Payload | Code run after an exploit gains the necessary execution capability |
| Persistence | An installed state that can survive reboot and help re-establish modified behavior |
| Privilege escalation | Crossing from a less trusted execution context into a more privileged one |
| RGH | Reset Glitch Hack, a family of hardware fault-injection approaches |
| SMC | System Management Controller, a processor separate from the main CPU |
| Softmod | A modification installed through software; it can still change persistent storage |
| TOCTOU | Time of check to time of use: data changes between validation and use |
| XeLL | Xenon Linux Loader; also used to launch compatible ELF homebrew |
| XEX | Xbox executable format associated with the retail runtime |

For older board labels such as Corona V3/V4 or Winchester, see [Start here](START_HERE.md#know-which-machine-you-mean) and the [ConsoleMods motherboard reference](https://consolemods.org/wiki/Xbox_360:Motherboard_Information).

The [ConsoleMods FAQ definitions](https://consolemods.org/wiki/Xbox_360:Frequently_Asked_Questions_(FAQ)#Definitions) cover more scene vocabulary. Treat them as orientation: the CPU key belongs to CPU fuse data, not the Keyvault, as explained in [NAND explained](NAND_EXPLAINED.md#what-lives-there) and [Free60's fuse reference](https://free60.org/Hardware/Fusesets/#fusesets-03-06).

Acronyms do not establish trust. Read the source linked beside the claim, not just the familiar project name.
