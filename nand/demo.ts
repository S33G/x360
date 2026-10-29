/** Synthetic geometry and metadata only. No console image, keys or executable payloads. */
export function createDemoNand(): Uint8Array {
  const data = new Uint8Array(0x1000000).fill(255);
  const view = new DataView(data.buffer);
  data.fill(0, 0, 0x8000);
  data.set([255, 0x4f]);
  view.setUint32(8, 0x8000, false);
  view.setUint32(0x78, 0x3000, false);
  view.setUint32(0x7c, 0x1000, false);
  const smc = new Uint8Array(0x3000);
  smc[0x100] = 0x50;
  smc[0x101] = 3;
  smc[0x102] = 1;
  const state = [0x42, 0x75, 0x4e, 0x79];
  for (let i = 0; i < smc.length; i++) {
    const encrypted = smc[i] ^ state[i % 4];
    data[0x1000 + i] = encrypted;
    state[(i + 1) % 4] = (state[(i + 1) % 4] + encrypted * 0xfb) & 255;
    state[(i + 2) % 4] = (state[(i + 2) % 4] + ((encrypted * 0xfb) >> 8)) & 255;
  }
  for (const [name, at, size, version] of [['CB', 0x8000, 0x1ac0, 9188], ['CB', 0x9ac0, 0x4540, 9188], ['CD', 0xe000, 0x4000, 9452], ['CE', 0x12000, 0x20000, 1888], ['CF', 0x70000, 0x4000, 17559]] as const) {
    data.fill(0, at, at + size);
    data.set([name.charCodeAt(0), name.charCodeAt(1)], at);
    view.setUint16(at + 2, version, false);
    view.setUint32(at + 8, 0, false);
    view.setUint32(at + 12, size, false);
  }
  const root = 0x100;
  data.fill(0, root * 0x4000, (root + 1) * 0x4000);
  for (const [slot, name, start, length] of [[0, 'demo-system.bin', 0x120, 0x8000], [1, 'demo-config.dat', 0x124, 512]] as const) {
    const at = root * 0x4000 + 512 + slot * 32;
    data.set(new TextEncoder().encode(name), at);
    view.setUint16(at + 22, start, false);
    view.setUint32(at + 24, length, false);
    data.fill(0x5a, start * 0x4000, start * 0x4000 + length);
  }
  const raw = new Uint8Array(0x1080000).fill(255);
  for (let page = 0; page < data.length / 512; page++) {
    raw.set(data.subarray(page * 512, (page + 1) * 512), page * 528);
    if (data.subarray(page * 512, (page + 1) * 512).every(byte => byte === 255)) continue;
    const at = page * 528 + 512;
    const block = Math.floor(page / 32);
    raw[at] = block & 255;
    raw[at + 1] = (block >> 8) & 15;
    raw[at + 2] = 0;
    raw[at + 3] = 0;
    raw[at + 4] = 0;
    raw[at + 6] = 0;
    raw[at + 12] = block === root ? 0x30 : 0;
    if (block === root) raw[at + 2] = 7;
  }
  raw[(0x2b0 * 32) * 528 + 512 + 5] = 0;
  data.fill(0); smc.fill(0);
  return raw;
}
