import assert from 'node:assert/strict';
import { createToyotaParameters, createToyotaTargets, createToyotaSurfaceData, sampleToyotaSurface } from '../src/toyota.js';

const field = createToyotaSurfaceData();
assert.equal(field.data.length, field.width * field.height * 4);
assert.deepEqual(field, createToyotaSurfaceData(), 'The fused surface must remain deterministic.');
let occupied = 0, first = -1;
const mask = new Uint8Array(field.width * field.height);
for (let i = 0; i < mask.length; i++) {
  const [distance, nx, ny, height] = field.data.subarray(i * 4, i * 4 + 4);
  assert([distance, nx, ny, height].every(Number.isFinite));
  // The atlas stores actual cap derivatives, rather than a unit edge normal.
  assert(Math.hypot(nx, ny) < field.depth * field.width / field.bounds[2]);
  assert(height >= 0 && height <= field.depth + 1e-6);
  if (distance < 0) { mask[i] = 1; occupied++; if (first < 0) first = i; }
}
// The emblem must be one connected piece, with no independent oval layers.
const queue = new Uint32Array(mask.length);
let head = 0, tail = 1;
queue[0] = first; mask[first] = 2;
while (head < tail) {
  const index = queue[head++];
  const x = index % field.width, y = Math.floor(index / field.width);
  for (const next of [x ? index - 1 : -1, x + 1 < field.width ? index + 1 : -1,
    y ? index - field.width : -1, y + 1 < field.height ? index + field.width : -1]) {
    if (next >= 0 && mask[next] === 1) { mask[next] = 2; queue[tail++] = next; }
  }
}
assert.equal(tail, occupied, 'All bands and junctions must belong to one connected union.');
const junctions = [[.36, .13], [-.36, .13], [0, -1.245], [0, 1.2]];
for (const point of junctions) {
  const sample = sampleToyotaSurface(field, ...point);
  assert(sample[0] < -.08, 'Junctions must be inside the common body, not a leftover oval boundary.');
  assert(sample[3] > .30, 'The common inflated cap must fill every junction without an internal trough.');
  for (const offset of [[.004, 0], [-.004, 0], [0, .004], [0, -.004]]) {
    const adjacent = sampleToyotaSurface(field, point[0] + offset[0], point[1] + offset[1]);
    assert(Math.hypot(adjacent[1] - sample[1], adjacent[2] - sample[2]) < .15,
      'The inflated cap must have continuous normals through every junction.');
  }
}
const outerProfile = [0, .02, .04, .06, .08, .10, .12].map(offset => sampleToyotaSurface(field, 2.055 + offset, 0));
assert(outerProfile[0][3] > .25, 'The outer band needs a rounded, substantial volume.');
for (let i = 1; i < outerProfile.length; i++) {
  assert(outerProfile[i][3] < outerProfile[i - 1][3], 'The full band must curve, without a flat face and separate narrow bevel.');
  assert(outerProfile[i][1] < 0, 'Normals must follow the physical cap slope.');
}
assert(outerProfile[0][3] - outerProfile.at(-1)[3] > .10, 'The cross-section needs a visibly rounded profile.');
for (const point of [[1, -.6], [-1, -.6], [.9, .5], [-.9, .5], [0, .6]]) {
  const sample = sampleToyotaSurface(field, ...point);
  assert(sample[0] > 0 && sample[3] === 0, 'The emblem negative spaces must remain open.');
}
for (const [x, y] of [[.36, .13], [1.2, .8], [2, .2], [.8, -.8]]) {
  const a = sampleToyotaSurface(field, x, y), b = sampleToyotaSurface(field, -x, y);
  assert(Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[3] - b[3]) < 1e-6, 'The union must remain horizontally symmetric.');
}
const straight = [[2.055, 0], [-2.055, 0], [1.35, -1.014], [-1.35, -1.014]];
const inPatch = (x, y, points) => points.some(([cx, cy]) => Math.abs(x - cx) < .055 && Math.abs(y - cy) < .055);
let referenceArea = 0, sideArea = 0;
for (let i = 0; i < field.data.length; i += 4) {
  const [distance, gx, gy] = field.data.subarray(i, i + 3);
  if (distance >= -.002) continue;
  const area = Math.hypot(1, gx, gy);
  referenceArea += area;
  if (Math.hypot(gx, gy) > 2) sideArea += area;
}
for (const count of [36864, 102400]) {
  const targets = createToyotaTargets(count), grains = createToyotaParameters(count);
  assert.equal(targets.length, count * 4);
  assert.equal(grains.length, count * 4);
  assert.deepEqual(targets, createToyotaTargets(count));
  assert.deepEqual(grains, createToyotaParameters(count));
  let left = 0, front = 0, minZ = Infinity, maxZ = -Infinity;
  let jointCount = 0, straightCount = 0, sideCount = 0;
  for (let i = 0; i < grains.length; i += 4) {
    const [x, y, face, appearance] = grains.subarray(i, i + 4);
    assert([x, y, face, appearance].every(Number.isFinite));
    assert(Math.abs(x) < 2.2 && Math.abs(y) < 1.5);
    assert(Math.abs(face) >= .95999 && Math.abs(face) <= 1);
    assert(appearance >= 0 && appearance <= 1);
    const sample = sampleToyotaSurface(field, x, y);
    if (Math.hypot(sample[1], sample[2]) > 2) sideCount++;
    assert(sample[0] < -.0019, 'Every grain must belong to the fused surface.');
    assert.equal(targets[i], x); assert.equal(targets[i + 1], y);
    assert(Math.abs(targets[i + 2] - sample[3] * face) < 2e-6, 'All grains must share one surface height.');
    assert.equal(targets[i + 3], appearance);
    minZ = Math.min(minZ, targets[i + 2]); maxZ = Math.max(maxZ, targets[i + 2]);
    if (x < 0) left++;
    if (face > 0) front++;
    if (inPatch(x, y, junctions)) jointCount++;
    if (inPatch(x, y, straight)) straightCount++;
  }
  assert(Math.abs(left / count - .5) < .02);
  assert(front / count > .6 && front / count < .75);
  assert(minZ < -.32 && maxZ > .32, 'The fused emblem needs front-to-back volume.');
  const ratio = jointCount / straightCount;
  assert(ratio > .75 && ratio < 1.3, 'Junction density must match the body; overlapping oval samples would double it.');
  // Account for bilinear interpolation and rejection at boundary cells. Flat
  // XY sampling would put only ~19% here, leaving the rounded sides sparse.
  assert(Math.abs(sideCount / count - sideArea / referenceArea) < .05,
    'Side walls must receive grains in proportion to actual material area.');
  console.log(`Toyota ${count.toLocaleString('en-US')}: one rounded inflated union, smooth junction normals, junction density ${ratio.toFixed(3)}, holes clear, depth ${(maxZ - minZ).toFixed(3)}.`);
}
for (const generate of [createToyotaTargets, createToyotaParameters]) {
  assert.equal(generate(0).length, 0);
  for (const invalid of [-1, 1.5, NaN, Infinity, undefined, null, '5', 1n]) assert.throws(() => generate(invalid), RangeError);
}
