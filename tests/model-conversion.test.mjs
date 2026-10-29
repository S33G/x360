import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { convertModel as convert } from '../scripts/prepare-model.mjs';

function syntheticGlb(edit = () => {}, positions = [0, 0, 0, 2, 0, 0, 0, 2, 0]) {
  const binary = Buffer.alloc(44);
  positions.forEach((value, index) => binary.writeFloatLE(value, index * 4));
  [0, 1, 2].forEach((value, index) => binary.writeUInt16LE(value, 36 + index * 2));
  const source = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 6 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 2, 2] },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
  };
  edit(source);
  const encoded = Buffer.from(JSON.stringify(source));
  const json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 0x20);
  encoded.copy(json);
  const glb = Buffer.alloc(28 + json.length + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + json.length); glb.writeUInt32LE(0x004e4942, 24 + json.length); binary.copy(glb, 28 + json.length);
  return glb;
}

test('conversion strips camera references without discarding the mesh', async () => {
  const data = syntheticGlb(source => {
    source.cameras = [{ type: 'perspective', perspective: { yfov: 0.6, znear: 0.1 } }];
    source.nodes.push({ camera: 0, name: 'Caméra' });
    source.scenes[0].nodes.push(1);
  });
  const original = Buffer.from(data);
  const result = await convert(data);
  assert.equal(result.vertexCount, 3);
  assert.equal(result.triangleCount, 1);
  assert.deepEqual(result.mesh.indices, [0, 1, 2]);
  assert.deepEqual(data, original, 'conversion must not rewrite the input GLB');
  assert.equal(result.sourceSha256, createHash('sha256').update(original).digest('hex'));
});

test('conversion bakes nested world transforms before centering and normalizing height', async () => {
  const data = syntheticGlb(source => {
    source.nodes = [
      { translation: [10, 20, 30], scale: [2, 3, 4], children: [1] },
      { mesh: 0, translation: [1, 2, 3], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] },
    ];
  });
  const { mesh } = await convert(data);
  // World vertices are (12,26,42), (12,32,42), (8,26,42).
  // Their center is (10,29,42); scaling the height 6 to 3 gives:
  assert.deepEqual(mesh.positions, [1, -1.5, 0, 1, 1.5, 0, -1, -1.5, 0]);
  assert.deepEqual(mesh.indices, [0, 1, 2]);
});

test('conversion rejects morph targets instead of silently exporting the base shape', async () => {
  const data = syntheticGlb(source => {
    source.meshes[0].weights = [1];
    source.meshes[0].primitives[0].targets = [{ POSITION: 0 }];
  });
  await assert.rejects(convert(data), /static triangle meshes/);
});

test('conversion rejects external buffers before any network request', async t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  for (const uri of ['https://example.invalid/model.bin', '', 'data:application/octet-stream;base64,AAAA']) {
    const data = syntheticGlb(source => { source.buffers[0].uri = uri; });
    await assert.rejects(convert(data), /external buffers/);
  }
  assert.equal(network.mock.callCount(), 0);
});

test('conversion rejects non-triangle primitives', async () => {
  const data = syntheticGlb(source => { source.meshes[0].primitives[0].mode = 1; });
  await assert.rejects(convert(data), /static triangle meshes/);
});

test('conversion rejects zero-height geometry before normalization', async () => {
  const data = syntheticGlb(undefined, [0, 0, 0, 2, 0, 0, 0, 0, 2]);
  await assert.rejects(convert(data), /nonzero height/);
});
