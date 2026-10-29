// Explicit inputs keep private research files out of portable skill folders.
export const skillRepository = 'https://github.com/s33G/x360';
export const skillCatalog = [
  { name: 'xbox360-exploit-landscape', references: {
    'exploit-atlas.md': 'docs/XBOX360_MODDING.md',
    'choosing-a-path.md': 'docs/BETTER_SOFTMOD.md',
    'timeline.md': 'docs/EXPLOIT_TIMELINE.md',
  } },
  { name: 'xbox360-peer-pressure', references: {
    'peer-pressure.md': 'docs/PEER_PRESSURE_GUIDE.md',
    'choosing-a-path.md': 'docs/BETTER_SOFTMOD.md',
  } },
  { name: 'xbox360-nand-structure', references: {
    'nand.md': 'docs/NAND_EXPLAINED.md',
    'boot-chain.md': 'docs/BOOT_CHAIN.md',
  } },
  { name: 'xbox360-nand-analysis', references: {
    'nand.md': 'docs/NAND_EXPLAINED.md',
    'privacy.md': 'docs/PRIVACY.md',
    'analyzer.md': 'docs/NAND_ANALYZER.md',
  }, scripts: ['scripts/x360nand.mjs'] },
  { name: 'xbox360-boot-chain', references: { 'boot-chain.md': 'docs/BOOT_CHAIN.md' } },
  { name: 'xbox360-homebrew-compatibility', references: {
    'homebrew.md': 'docs/CUSTOM_FIRMWARE.md',
    'choosing-a-path.md': 'docs/BETTER_SOFTMOD.md',
  } },
  { name: 'xbox360-privacy-review', references: { 'privacy.md': 'docs/PRIVACY.md' } },
].map(skill => ({ ...skill, references: { ...skill.references, 'notice.md': 'docs/NOTICE.md' } }));

export function filesForSkill(skill) {
  return ['SKILL.md', ...Object.keys(skill.references).map(file => `references/${file}`), ...(skill.scripts || [])];
}

export function skillFiles() {
  return skillCatalog.flatMap(skill => filesForSkill(skill).map(file => `skills/${skill.name}/${file}`));
}
