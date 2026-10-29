// Recent generations first, then current alternatives and legacy methods.
// Families include later revisions (V2/V3); this is not an exact release calendar.
export const glitchOrder = ['RGH13', 'EXT_PLUS3', 'RGH3', 'RGH12', 'EXT_CLK', 'MUFAS', 'SRGH', 'MUFFIN', 'RJTOP', 'RJTAG', 'RGH2', 'RGH1'];

export const methodStatus = {
  KING_KONG: 'legacy', TIMING_ATTACK: 'legacy', TONY_HAWK: 'legacy',
  RGH1: 'legacy', RGH2: 'legacy', MUFFIN: 'legacy', RJTAG: 'legacy', RJTOP: 'legacy',
  RGH13: 'beta', EXT_PLUS3: 'beta'
};

export function methodKey(file) {
  return file.split('/').at(-1).replace(/\.(?:md|html)$/, '');
}

export function compareGlitchMethods(a, b) {
  const rank = value => {
    const index = glitchOrder.indexOf(methodKey(value));
    return index < 0 ? -1 : index;
  };
  return rank(a) - rank(b);
}
