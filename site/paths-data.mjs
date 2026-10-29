// Checked 2026-10-29 against the linked release and board documentation.
// These are reading candidates, not an eligibility test. A board ID cannot
// establish CB version, storage timing, wiring, or application compatibility.
export const boards = [
  { id: 'xenon', name: 'Xenon / Elpis' },
  { id: 'zephyr', name: 'Zephyr' },
  { id: 'falcon', name: 'Falcon / Opus' },
  { id: 'jasper', name: 'Jasper' },
  { id: 'tonasket', name: 'Tonasket (late Jasper)' },
  { id: 'trinity', name: 'Trinity' },
  { id: 'corona', name: 'Corona' },
  { id: 'waitsburg', name: 'Waitsburg (Corona V3/V4)' },
  { id: 'stingray', name: 'Stingray (Corona V5/V6)' },
  { id: 'winchester', name: 'Winchester / Barracuda' }
];

export const methods = [
  {
    id: 'bad-update',
    name: 'Bad Update',
    kind: 'software',
    href: 'exploits/BAD_UPDATE.html',
    summary: 'Temporary hypervisor control on all listed retail boards. FreeMyXe or XeUnshackle supplies the wider homebrew environment.',
    boards: ['xenon', 'zephyr', 'falcon', 'jasper', 'tonasket', 'trinity', 'corona', 'waitsburg', 'stingray', 'winchester'],
    constraints: 'Published for dashboard 17559. Official v1.3 uses Rock Band Blitz; ABadAvatar is a separate entry fork. A successful entry does not establish every payload or application feature.',
    persistence: 'The privileged state ends at reboot or power-off. An automatic entry can run again without making Bad Update persistent.',
    sources: ['https://github.com/grimdoomer/Xbox360BadUpdate', 'https://github.com/grimdoomer/Xbox360BadUpdate/releases/tag/BadUpdate-v1.3']
  },
  {
    id: 'peer-pressure',
    name: 'Peer Pressure',
    kind: 'software',
    href: 'PEER_PRESSURE_GUIDE.html',
    summary: 'Persistent software installation that repeats a disk-based exploit during startup, with its own runtime and recovery modes.',
    boards: ['xenon', 'zephyr', 'falcon', 'jasper', 'tonasket', 'trinity'],
    constraints: 'Current installer uses the 17559 Bad Update path. Requires a compatible internal HDD; mechanical disks are recommended because SSD timing is unreliable. Corona, Waitsburg, Stingray and Winchester are unsupported. Upstream excludes DashLaunch and its plugins.',
    persistence: 'Changes to NAND and HDD survive reboot; the startup exploit runs again. Retail Mode bypasses it but does not uninstall it.',
    sources: ['https://github.com/grimdoomer/Xbox360PeerPressure', 'https://github.com/grimdoomer/Xbox360PeerPressure/wiki/Installation', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart']
  },
  {
    id: 'jtag',
    name: 'JTAG / SMC hack',
    kind: 'hardware',
    href: 'exploits/JTAG.html',
    summary: 'An early boot exploit for consoles that still have a vulnerable CB bootloader.',
    boards: ['xenon', 'zephyr', 'falcon', 'jasper'],
    constraints: 'Dashboard 7371 or earlier is only a clue: the exact CB must also be unpatched. Stock Tonasket and all S/E boards are excluded. Refurbished Xenon/Elpis consoles may have patched CBs. Requires hardware work and a compatible NAND image.',
    persistence: 'An installed hardware and NAND modification enables the homebrew boot path after power-off.',
    sources: ['https://free60.org/Hacks/SMC_Hack/', 'https://consolemods.org/wiki/Xbox_360:Getting_Started', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart']
  },
  {
    id: 'rgh3',
    name: 'RGH3',
    kind: 'hardware',
    href: 'exploits/RGH3.html',
    summary: 'Reset glitching controlled by modified SMC code instead of a separate glitch chip. Still a hardware modification.',
    boards: ['falcon', 'jasper', 'tonasket', 'trinity', 'corona', 'waitsburg', 'stingray'],
    constraints: 'Falcon/Jasper-family boot reliability is less consistent than on Trinity/Corona. Waitsburg/Stingray need POST access restored. The source labels Zephyr unrefined and untested, so it is not a supported candidate here. No Xenon or Winchester route.',
    persistence: 'Installed wiring and a modified NAND image remain after power-off; glitch timing still matters on each boot.',
    sources: ['https://github.com/15432/RGH3', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart', 'https://consolemods.org/wiki/Xbox_360:Getting_Started']
  },
  {
    id: 'rgh12',
    name: 'RGH1.2 / RGH1.2 V2',
    kind: 'hardware',
    href: 'exploits/RGH12.html',
    summary: 'A glitch-chip route used on Falcon/Jasper families; V2 also covers Trinity and Corona families.',
    boards: ['xenon', 'zephyr', 'falcon', 'jasper', 'tonasket', 'trinity', 'corona', 'waitsburg', 'stingray'],
    constraints: 'Xenon/Zephyr results are limited and unreliable; read EXT_CLK first for those boards. Slim coverage requires the appropriate V2 timing and chip. Waitsburg/Stingray require POST access. Winchester is unsupported.',
    persistence: 'Installed chip, wiring and modified NAND enable repeated homebrew boots; it is not a software-only exploit.',
    sources: ['https://github.com/Octal450/Timing-Files/releases', 'https://consolemods.org/wiki/Xbox_360:RGH/RGH1.2', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart']
  },
  {
    id: 'ext-clk',
    name: 'EXT_CLK',
    kind: 'hardware',
    href: 'exploits/EXT_CLK.html',
    summary: 'A modern glitch-chip route using external-clock slowdown for Xenon and Zephyr.',
    boards: ['xenon', 'zephyr'],
    constraints: 'The published timing pack covers Xenon/Zephyr. Reported work on later phats is not a released, established path. Standard glitch chips do not make this a general Slim route; Winchester is unsupported.',
    persistence: 'Installed hardware and a modified NAND image remain; the glitch is repeated at startup.',
    sources: ['https://github.com/Octal450/Timing-Files/releases', 'https://consolemods.org/wiki/Xbox_360:RGH/EXT_CLK', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart']
  },
  {
    id: 'srgh',
    name: 'S-RGH',
    kind: 'hardware',
    href: 'exploits/SRGH.html',
    summary: 'A faster RGH2-derived glitch-chip method, chiefly used on Trinity and Corona families.',
    boards: ['jasper', 'tonasket', 'trinity', 'corona', 'waitsburg', 'stingray'],
    constraints: 'Jasper/Tonasket operation is reported but unreliable. Waitsburg/Stingray need POST access and board-specific preparation. Xenon, Zephyr, Falcon and Winchester are not supported candidates.',
    persistence: 'Installed hardware and modified NAND enable the boot path after power-off.',
    sources: ['https://github.com/Octal450/Timing-Files/releases', 'https://consolemods.org/wiki/Xbox_360:RGH/S-RGH', 'https://consolemods.org/wiki/Xbox_360:Exploit_Chart']
  },
  {
    id: 'rgh13',
    name: 'RGH1.3 (beta)',
    kind: 'experimental',
    href: 'exploits/RGH13.html',
    summary: 'A beta combination of glitch-chip timing, the RGH3 loader chain and more aggressive boot monitoring.',
    boards: ['falcon', 'jasper', 'tonasket'],
    constraints: 'Published for Falcon/Jasper families. The author does not guarantee better boot times or compatibility. Slim support is not implemented; Xenon/Zephyr use the related EXT+3 variant.',
    persistence: 'Hardware, modified SMC and NAND components remain installed; each boot still depends on successful glitching.',
    sources: ['https://github.com/wurthless-elektroniks/RGH1.3/blob/main/readme.md']
  },
  {
    id: 'ext-plus3',
    name: 'EXT+3 (beta)',
    kind: 'experimental',
    href: 'exploits/EXT_PLUS3.html',
    summary: 'The external-clock counterpart to RGH1.3 for Xenon and Zephyr.',
    boards: ['xenon', 'zephyr'],
    constraints: 'Shares the RGH1.3 beta status. Board and CPU revision affect the required configuration; faster or reliable boots are not guaranteed. It is not a Winchester route.',
    persistence: 'Installed hardware and modified NAND remain after shutdown; the exploit is repeated during startup.',
    sources: ['https://github.com/wurthless-elektroniks/RGH1.3/blob/main/readme.md']
  },
  {
    id: 'king-kong',
    name: 'King Kong shader exploit',
    kind: 'historical',
    href: 'exploits/KING_KONG.html',
    summary: 'The early game-based route to hypervisor control and XeLL. Shown with Xenon as historical context, not a complete board compatibility claim.',
    boards: ['xenon'],
    constraints: 'Requires vulnerable kernel 4532 or 4548 and the historical modified-disc entry arrangement. The kernel requirement is decisive; a Xenon label alone does not establish eligibility.',
    persistence: 'The original game-triggered privileged state is temporary.',
    sources: ['https://free60.org/Hacks/King_Kong_Hack/']
  },
  {
    id: 'rgh1',
    name: 'RGH1',
    kind: 'historical',
    href: 'exploits/RGH1.html',
    summary: 'The older PLL-slowdown glitch route for early non-Xenon phat software.',
    boards: ['zephyr', 'falcon', 'jasper', 'tonasket'],
    constraints: 'Requires dashboard 14699 or earlier on the listed phat boards. Zephyr operation is less reliable. Later RGH variants cover more software versions; no Slim or Winchester route.',
    persistence: 'Hardware and modified NAND persist, with a glitch attempted at startup.',
    sources: ['https://consolemods.org/wiki/Xbox_360:RGH/RGH1']
  },
  {
    id: 'rgh2',
    name: 'RGH2',
    kind: 'historical',
    href: 'exploits/RGH2.html',
    summary: 'An older I2C-slowdown method with broad dashboard coverage, superseded for most installations by refined variants.',
    boards: ['zephyr', 'falcon', 'jasper', 'tonasket', 'trinity', 'corona', 'waitsburg', 'stingray'],
    constraints: 'No Xenon or Winchester support. Phat results are especially inconsistent; Slim timing and chip compatibility are also specific. Waitsburg/Stingray need POST access.',
    persistence: 'Hardware and modified NAND persist, with a glitch attempted at startup.',
    sources: ['https://consolemods.org/wiki/Xbox_360:RGH/RGH2']
  },
  {
    id: 'rjtag',
    name: 'R-JTAG / R-JTAG+',
    kind: 'historical',
    href: 'exploits/RJTAG.html',
    summary: 'Uses a reset glitch to reach an older JTAG-vulnerable bootloader on later phat software.',
    boards: ['zephyr', 'falcon', 'jasper', 'tonasket'],
    constraints: 'The dedicated guide specifies non-Xenon phats on dashboard 14719 or later and discontinued specialist hardware. Zephyr has extra reliability limits. S/E boards are excluded.',
    persistence: 'The installed hardware and NAND changes persist across power-off.',
    sources: ['https://consolemods.org/wiki/Xbox_360:R-JTAG']
  },
  {
    id: 'rjtop',
    name: 'R-JTOP',
    kind: 'historical',
    href: 'exploits/RJTOP.html',
    summary: 'An open implementation of the reset-glitch-to-JTAG approach for phat boards.',
    boards: ['xenon', 'falcon', 'jasper', 'tonasket'],
    constraints: 'Requires dashboard 15572 or later and suitable timing files. Xenon results are limited. The dedicated guide does not supply Zephyr timings; this is not an established Zephyr candidate. No S/E support.',
    persistence: 'The installed hardware and NAND changes persist across power-off.',
    sources: ['https://consolemods.org/wiki/Xbox_360:R-JTOP']
  }
];
