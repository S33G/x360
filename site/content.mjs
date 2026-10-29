import { methodKey, methodStatus, compareGlitchMethods } from './method-meta.mjs';
export const repository = 'https://github.com/S33G/x360';
export const pages = [
  { file: 'README.md', label: 'Overview', group: 'The field guide', description: 'Xbox 360 hardware, exploits, homebrew and research.' },
  { file: 'docs/START_HERE.md', label: 'Start here', group: 'The field guide', description: 'Key terms, scope and suggested reading order.' },
  { file: 'docs/BETTER_SOFTMOD.md', label: 'Choosing a path', group: 'The field guide', description: 'Choose a motherboard and compare documented routes and software features.' },
  { file: 'docs/BOOT_CHAIN.md', label: 'Inside the boot chain', group: 'The field guide', description: 'Boot stages and trust checks from power-on to the dashboard.' },
  { file: 'docs/XBOX360_MODDING.md', label: 'Exploit atlas', group: 'The exploits', description: 'King Kong, JTAG, RGH and software exploit families.' },
  { file: 'docs/EXPLOIT_TIMELINE.md', label: 'Exploit timeline', group: 'The exploits', description: 'Public exploit releases and developments.' },
  { file: 'docs/PEER_PRESSURE_GUIDE.md', label: 'Peer Pressure', group: 'Software exploits', description: 'Persistent startup exploitation, supported boards and runtime features.' },
  { file: 'docs/exploits/BAD_UPDATE.md', label: 'Bad Update', group: 'Software exploits', description: 'Temporary hypervisor access on dashboard 17559.', detail: true },
  { file: 'docs/exploits/TONY_HAWK.md', label: 'Tony Hawk’s Pro Strcpy', group: 'Software entry points', description: 'The historical game-save entry point for Bad Update.', detail: true },
  { file: 'docs/exploits/DATARREST.md', label: 'DaTArrest', group: 'Software entry points', description: 'Rock Band Blitz scripting entry and payload delivery.', detail: true },
  { file: 'docs/exploits/ABADAVATAR.md', label: 'ABadAvatar', group: 'Software entry points', description: 'An avatar entry point with session-based privileged effects.', detail: true },
  { file: 'docs/exploits/KING_KONG.md', label: 'King Kong', group: 'Early exploits', description: 'The shader entry point and original hypervisor vulnerability.', detail: true },
  { file: 'docs/exploits/TIMING_ATTACK.md', label: 'Timing attack', group: 'Early exploits', description: 'An early bootloader authentication side channel.', detail: true },
  { file: 'docs/exploits/JTAG.md', label: 'JTAG / SMC', group: 'Early exploits', description: 'Repeatable startup exploitation on eligible early phat consoles.', detail: true },
  { file: 'docs/exploits/RGH1.md', label: 'RGH1', group: 'Hardware glitch methods', description: 'The original phat PLL and Glitch1 method.', detail: true },
  { file: 'docs/exploits/RGH2.md', label: 'RGH2', group: 'Hardware glitch methods', description: 'Glitch2 boot chains and later hardware implementations.', detail: true },
  { file: 'docs/exploits/RGH12.md', label: 'RGH1.2 / V2', group: 'Hardware glitch methods', description: 'PLL slowdown and timing refinements for supported boards.', detail: true },
  { file: 'docs/exploits/SRGH.md', label: 'S-RGH', group: 'Hardware glitch methods', description: 'Slim reset timing and acceleration.', detail: true },
  { file: 'docs/exploits/MUFFIN.md', label: 'Muffin', group: 'Hardware glitch methods', description: 'An earlier slim reset-acceleration variant.', detail: true },
  { file: 'docs/exploits/MUFAS.md', label: 'Mufas', group: 'Hardware glitch methods', description: 'The successor to Muffin timing firmware.', detail: true },
  { file: 'docs/exploits/RJTAG.md', label: 'R-JTAG', group: 'Hardware glitch methods', description: 'Glitching combined with the JTAG-style startup route.', detail: true },
  { file: 'docs/exploits/RJTOP.md', label: 'R-JTOP', group: 'Hardware glitch methods', description: 'The open CB fuse-check glitch implementation.', detail: true },
  { file: 'docs/exploits/EXT_CLK.md', label: 'EXT_CLK', group: 'Hardware glitch methods', description: 'External-clock slowdown for Xenon and Zephyr.', detail: true },
  { file: 'docs/exploits/RGH3.md', label: 'RGH3', group: 'Hardware glitch methods', description: 'SMC-controlled glitching without a separate glitch chip.', detail: true },
  { file: 'docs/exploits/RGH13.md', label: 'RGH1.3', group: 'Hardware glitch methods', description: 'A beta hybrid using external hardware and an RGH3-derived loader.', detail: true },
  { file: 'docs/exploits/EXT_PLUS3.md', label: 'EXT+3', group: 'Hardware glitch methods', description: 'The beta external-clock counterpart for early boards.', detail: true },
  { file: 'docs/exploits/FREE_MY_XE.md', label: 'FreeMyXe', group: 'Runtime and storage', description: 'Post-exploit homebrew patches and system-plugin support.', detail: true },
  { file: 'docs/exploits/XEUNSHACKLE.md', label: 'XeUnshackle', group: 'Runtime and storage', description: 'Runtime patches and a DashLaunch-based environment.', detail: true },
  { file: 'docs/exploits/BAD_STORAGE.md', label: 'Bad Storage', group: 'Runtime and storage', description: 'A temporary storage extension after privileged execution.', detail: true },
  { file: 'docs/exploits/DVD_MODS.md', label: 'DVD firmware and ODEs', group: 'Runtime and storage', description: 'Disc-path changes and why they do not unlock CPU execution.', detail: true },
  { file: 'docs/CUSTOM_FIRMWARE.md', label: 'Homebrew and Linux', group: 'The research', description: 'Loaders, alternative dashboards, LibXenon and Linux.' },
  { file: 'docs/NAND_EXPLAINED.md', label: 'NAND explained', group: 'The research', description: 'Flash storage, console identity and limits of analysis.' },
  { file: 'docs/NAND_ANALYZER.md', label: 'NAND inspector', group: 'The research', description: 'Inspect NAND images locally in your browser or Node.js.' },
  { file: 'docs/PRIVACY.md', label: 'Privacy and console data', group: 'The research', description: 'Handling keys, console identifiers, NAND dumps and reports.' },
  { file: 'docs/GLOSSARY.md', label: 'Glossary', group: 'Reference', description: 'Definitions of hardware, security and homebrew terms.' },
  { file: 'docs/CREDITS.md', label: 'Sources & thanks', group: 'Reference', description: 'Original research, software projects and contributors.' },
  { file: 'docs/FOR_AGENTS.md', label: 'For agents', group: 'Reference', description: 'Evidence standards, reading routes and permission boundaries.' },
  { file: 'docs/AGENT_SKILLS.md', label: 'Install agent skills', group: 'Agent skills', description: 'Seven portable skills, installation choices and example prompts.' },
  { file: 'docs/MAINTAINING.md', label: 'Build & contribute', group: 'Reference', description: 'Editing the Markdown chapters and building the website.' },
  { file: 'docs/NOTICE.md', label: 'About this guide', group: 'Reference', description: 'AI assistance, educational purpose and responsibility.' },
  { file: 'skills/README.md', label: 'Research skills', group: 'Agent skills', description: 'Reusable workflows for reading and research.' },
  { file: 'skills/xbox360-exploit-landscape/SKILL.md', label: 'Exploit research skill', group: 'Agent skills' },
  { file: 'skills/xbox360-peer-pressure/SKILL.md', label: 'Peer Pressure skill', group: 'Agent skills' },
  { file: 'skills/xbox360-nand-structure/SKILL.md', label: 'NAND structure skill', group: 'Agent skills' },
  { file: 'skills/xbox360-nand-analysis/SKILL.md', label: 'Offline analysis skill', group: 'Agent skills' },
  { file: 'skills/xbox360-boot-chain/SKILL.md', label: 'Boot-chain skill', group: 'Agent skills' },
  { file: 'skills/xbox360-homebrew-compatibility/SKILL.md', label: 'Homebrew compatibility skill', group: 'Agent skills' },
  { file: 'skills/xbox360-privacy-review/SKILL.md', label: 'Privacy review skill', group: 'Agent skills' },
  { file: 'AGENTS.md', label: 'Repository rules', group: 'Agent skills' },
  { file: 'tools/README.md', label: 'Retired experiments', group: 'Agent skills' }
];
// Keep the chapter list, previous/next links and sidebar in the same order.
const glitchPages = pages.filter(page => page.group === 'Hardware glitch methods').sort((a, b) => compareGlitchMethods(a.file, b.file));
let glitchIndex = 0;
for (let index = 0; index < pages.length; index++) {
  if (pages[index].group === 'Hardware glitch methods') pages[index] = glitchPages[glitchIndex++];
  const page = pages[index];
  page.status = methodStatus[methodKey(page.file)];
  if (page.file === 'docs/exploits/SRGH.md') page.label = 'S-RGH / V3';
}
export const outputFor = file => file === 'README.md' ? 'index.html' : file.replace(/\.md$/, '.html');
