// Offline conversion of the licensed GLB into geometry-only data for the website.
// Usage: node scripts/prepare-model.mjs <downloaded-model.glb>
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Conversion has no file or network I/O and leaves the original Buffer unchanged.
export async function convertModel(data) {
  if (!Buffer.isBuffer(data) || data.length < 28 || data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) throw new Error('Expected glTF 2 binary file.');
  const jsonSize = data.readUInt32LE(12);
  if (data.readUInt32LE(16) !== 0x4e4f534a || jsonSize % 4 || 28 + jsonSize > data.length) throw new Error('Invalid GLB JSON chunk.');
  const source = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  const binaryOffset = 20 + jsonSize;
  if (data.readUInt32LE(binaryOffset + 4) !== 0x004e4942 || binaryOffset + 8 + data.readUInt32LE(binaryOffset) !== data.length) throw new Error('Expected one embedded binary chunk.');
  const binary = data.subarray(binaryOffset + 8, binaryOffset + 8 + data.readUInt32LE(binaryOffset));
  // Remove texture/material references before loading. Nothing is fetched remotely.
  for (const name of ['materials', 'textures', 'images', 'samplers', 'animations', 'cameras']) delete source[name];
  for (const node of source.nodes || []) delete node.camera;
  for (const mesh of source.meshes || []) for (const primitive of mesh.primitives) {
    if (primitive.targets?.length || (primitive.mode !== undefined && primitive.mode !== 4)) throw new Error('Only static triangle meshes are supported.');
    delete primitive.material;
  }
  if (source.buffers?.length !== 1 || source.buffers[0].uri !== undefined) throw new Error('Expected one embedded buffer; external buffers are not supported.');
  const encoded = Buffer.from(JSON.stringify(source));
  const json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 0x20);
  encoded.copy(json);
  const rebuilt = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  rebuilt.writeUInt32LE(0x46546c67, 0); rebuilt.writeUInt32LE(2, 4); rebuilt.writeUInt32LE(rebuilt.length, 8);
  rebuilt.writeUInt32LE(json.length, 12); rebuilt.writeUInt32LE(0x4e4f534a, 16); json.copy(rebuilt, 20);
  rebuilt.writeUInt32LE(binary.length, 20 + json.length); rebuilt.writeUInt32LE(0x004e4942, 24 + json.length); binary.copy(rebuilt, 28 + json.length);
  const { scene } = await new GLTFLoader().parseAsync(rebuilt.buffer.slice(rebuilt.byteOffset, rebuilt.byteOffset + rebuilt.length), '');
  scene.updateMatrixWorld(true);
  const parts = [];
  scene.traverse(object => {
    if (!object.isMesh) return;
    if (object.isSkinnedMesh || object.isInstancedMesh) throw new Error('Only static meshes are supported.');
    const position = object.geometry.getAttribute('position');
    const geometry = new BufferGeometry();
    const values = [];
    for (let i = 0; i < position.count; i++) values.push(position.getX(i), position.getY(i), position.getZ(i));
    geometry.setAttribute('position', new Float32BufferAttribute(values, 3));
    if (object.geometry.index) geometry.setIndex(Array.from(object.geometry.index.array));
    else geometry.setIndex(Array.from({ length: position.count }, (_, i) => i));
    geometry.applyMatrix4(object.matrixWorld);
    parts.push(geometry);
  });
  if (!parts.length) throw new Error('No mesh geometry found.');
  const merged = mergeGeometries(parts);
  const geometry = mergeVertices(merged, 0.000001);
  merged.dispose();
  parts.forEach(part => part.dispose());
  try {
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new Vector3());
    const size = geometry.boundingBox.getSize(new Vector3());
    if (![...center, ...size].every(Number.isFinite) || size.y <= 0) throw new Error('Mesh must have finite bounds and nonzero height.');
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(3 / size.y, 3 / size.y, 3 / size.y);
    const positions = Array.from(geometry.getAttribute('position').array, value => Math.round(value * 100000) / 100000 || 0);
    const indices = Array.from(geometry.index.array);
    return {
      mesh: { positions, indices },
      vertexCount: positions.length / 3,
      triangleCount: indices.length / 3,
      sourceSha256: createHash('sha256').update(data).digest('hex'),
    };
  } finally {
    geometry.dispose();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];
  if (!input || process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-model.mjs <downloaded-model.glb>');
  const { mesh: { positions, indices }, vertexCount, triangleCount, sourceSha256 } = await convertModel(await readFile(input));
  const rows = numbers => Array.from({ length: Math.ceil(numbers.length / 24) }, (_, i) => '    ' + numbers.slice(i * 24, (i + 1) * 24).join(', ')).join(',\n');
  await writeFile(new URL('../assets/console-mesh.json', import.meta.url), `{\n  "positions": [\n${rows(positions)}\n  ],\n  "indices": [\n${rows(indices)}\n  ]\n}\n`);
  console.log(`Prepared ${vertexCount} vertices and ${triangleCount} triangles. Original SHA-256: ${sourceSha256}`);
}
