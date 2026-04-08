// Quick GLB inspector — reads header + JSON chunk, reports meshes, skins, animations, textures, buffers.
// Usage: node tools/inspect-glb.mjs <path-to-glb>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/inspect-glb.mjs <file.glb>'); process.exit(1); }

const buf = readFileSync(resolve(file));
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// GLB header: magic (u32 = 0x46546C67 "glTF"), version (u32), length (u32)
const magic = view.getUint32(0, true);
if (magic !== 0x46546C67) { console.error('not a GLB file'); process.exit(1); }
const version = view.getUint32(4, true);
const totalLen = view.getUint32(8, true);

// Chunk 0: JSON
const jsonLen = view.getUint32(12, true);
const jsonType = view.getUint32(16, true); // 0x4E4F534A = "JSON"
if (jsonType !== 0x4E4F534A) { console.error('first chunk is not JSON'); process.exit(1); }
const jsonBytes = buf.subarray(20, 20 + jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

// Chunk 1: BIN (optional)
let binLen = 0;
if (20 + jsonLen < buf.byteLength) {
  binLen = view.getUint32(20 + jsonLen, true);
}

const fmt = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB`
              : n > 1024 ? `${(n / 1024).toFixed(1)} KB`
              : `${n} B`;

console.log('==============================================');
console.log(`File:        ${file}`);
console.log(`GLB size:    ${fmt(totalLen)}`);
console.log(`JSON chunk:  ${fmt(jsonLen)}`);
console.log(`BIN chunk:   ${fmt(binLen)}`);
console.log(`GLB version: ${version}`);
console.log('==============================================');

console.log(`\nScenes: ${(gltf.scenes ?? []).length}`);
console.log(`Nodes: ${(gltf.nodes ?? []).length}`);
console.log(`Meshes: ${(gltf.meshes ?? []).length}`);
console.log(`Materials: ${(gltf.materials ?? []).length}`);
console.log(`Textures: ${(gltf.textures ?? []).length}`);
console.log(`Images: ${(gltf.images ?? []).length}`);
console.log(`Samplers: ${(gltf.samplers ?? []).length}`);
console.log(`Skins: ${(gltf.skins ?? []).length}`);
console.log(`Animations: ${(gltf.animations ?? []).length}`);
console.log(`Accessors: ${(gltf.accessors ?? []).length}`);
console.log(`BufferViews: ${(gltf.bufferViews ?? []).length}`);
console.log(`Buffers: ${(gltf.buffers ?? []).length}`);

// Count triangles
let triCount = 0;
let primCount = 0;
for (const mesh of (gltf.meshes ?? [])) {
  for (const prim of (mesh.primitives ?? [])) {
    primCount++;
    if (prim.indices != null) {
      const acc = gltf.accessors[prim.indices];
      triCount += Math.floor(acc.count / 3);
    } else if (prim.attributes?.POSITION != null) {
      const acc = gltf.accessors[prim.attributes.POSITION];
      triCount += Math.floor(acc.count / 3);
    }
  }
}
console.log(`\nTotal primitives: ${primCount}`);
console.log(`Total triangles: ${triCount.toLocaleString()}`);

// Meshes detail
console.log('\n--- Meshes ---');
(gltf.meshes ?? []).forEach((m, i) => {
  const prims = (m.primitives ?? []).length;
  console.log(`  [${i}] "${m.name ?? '(unnamed)'}" — ${prims} primitive(s)`);
});

// Skins detail
console.log('\n--- Skins ---');
(gltf.skins ?? []).forEach((s, i) => {
  const joints = (s.joints ?? []).length;
  console.log(`  [${i}] "${s.name ?? '(unnamed)'}" — ${joints} joints`);
});

// Animations detail (most important for Ninty)
console.log('\n--- Animations ---');
(gltf.animations ?? []).forEach((a, i) => {
  const channels = (a.channels ?? []).length;
  const samplers = (a.samplers ?? []).length;
  // Estimate duration from first sampler input accessor
  let duration = 'n/a';
  if (a.samplers?.[0]?.input != null) {
    const acc = gltf.accessors[a.samplers[0].input];
    if (acc.max?.[0] != null) duration = `${acc.max[0].toFixed(2)}s`;
  }
  console.log(`  [${i}] "${a.name ?? '(unnamed)'}" — ${channels} channels, ${samplers} samplers, dur=${duration}`);
});

// Images detail (likely the culprit for huge file)
console.log('\n--- Images (textures) ---');
(gltf.images ?? []).forEach((img, i) => {
  let size = 'external';
  if (img.bufferView != null) {
    const bv = gltf.bufferViews[img.bufferView];
    size = fmt(bv.byteLength);
  } else if (img.uri) {
    size = `uri:${img.uri.slice(0, 40)}`;
  }
  console.log(`  [${i}] "${img.name ?? '(unnamed)'}" — mime=${img.mimeType ?? '?'}, size=${size}`);
});

// Buffer views summary — biggest contributors
console.log('\n--- Top 10 largest bufferViews ---');
const bvs = (gltf.bufferViews ?? []).map((bv, i) => ({ i, name: bv.name ?? '', len: bv.byteLength }));
bvs.sort((a, b) => b.len - a.len);
bvs.slice(0, 10).forEach(({ i, name, len }) => {
  console.log(`  [${i}] ${fmt(len).padStart(10)}  ${name}`);
});

// Extensions
console.log('\n--- Extensions ---');
console.log(`  Used: ${JSON.stringify(gltf.extensionsUsed ?? [])}`);
console.log(`  Required: ${JSON.stringify(gltf.extensionsRequired ?? [])}`);
