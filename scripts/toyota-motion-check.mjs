import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Euler, Quaternion, Vector3 } from 'three';
import { createToyotaTargets, createToyotaSurfaceData, sampleToyotaSurface } from '../src/toyota.js';

// Execute the actual scalar GLSL deformation on the CPU. These checks cover
// geometry and motion; they do not render a browser or measure GPU frame rate.
const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const shader = source('src/shaders/toyota-motion.glsl');
const simulation = source('src/shaders/simulation.glsl');
const scene = source('src/scene.js');
const idleRate = Number(scene.match(/this\.toyotaFlowSpeed = ([.\d]+);/)?.[1]);
assert.equal(idleRate, .75, 'The stronger shared motion must run at the actual scene idle phase rate.');
const body = shader.match(/vec3 toyotaDeform\(vec3 rest, float phase\)\s*\{([\s\S]*?)\n\}/)?.[1];
assert(body, 'The test must execute the production whole-body deformation.');
const deform = new Function('rest', 'phase', body
  .replace(/\bfloat\b/g, 'let')
  .replace(/rest\.([xyz])/g, (_, axis) => `rest[${'xyz'.indexOf(axis)}]`)
  .replace(/\bsin\(/g, 'Math.sin(')
  .replace(/return vec3\(([^()]*)\);/, 'return [$1];'));

// Independent reverse map: returning every moving point to its own material
// coordinate proves that the common deformation cannot merge separate bands.
function inverse(point, phase) {
  let [x, y, z] = point;
  y -= .14 * Math.sin(.70 * x + .30 * z - phase);
  x -= .20 * Math.sin(.65 * y + .35 * z - phase);
  z -= .30 * Math.sin(.85 * x + .55 * y - phase);
  return [x, y, z];
}
const TAU = Math.PI * 2;
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const norm = a => Math.hypot(...a);
const distance = (a, b) => norm(subtract(a, b));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const field = createToyotaSurfaceData(), grains = createToyotaTargets(4096);
const points = Array.from({ length: grains.length / 4 }, (_, i) => Array.from(grains.subarray(i * 4, i * 4 + 3)));
const velocity = (point, phase) => subtract(deform(point, phase + 1e-4), deform(point, phase - 1e-4)).map(value => value / 2e-4 * idleRate);
const apply = (columns, vector) => columns[0].map((_, row) => columns.reduce((sum, column, axis) => sum + column[row] * vector[axis], 0));
function jacobian(point, phase) {
  return [0, 1, 2].map(axis => {
    const lower = [...point], upper = [...point];
    lower[axis] -= 1e-4; upper[axis] += 1e-4;
    return subtract(deform(upper, phase), deform(lower, phase)).map(value => value / 2e-4);
  });
}

let minimumStretch = Infinity, maximumStretch = 0, maximumDeterminantError = 0;
for (const point of points) {
  const surface = sampleToyotaSurface(field, point[0], point[1]);
  const face = point[2] / surface[3];
  const u = [1, 0, surface[1] * face], v = [0, 1, surface[2] * face];
  for (const phase of [0, .7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6]) {
    const moved = deform(point, phase);
    assert(moved.every(Number.isFinite));
    assert(distance(inverse(moved, phase), point) < 1e-12, 'The deformation must preserve each unique material point.');
    const matrix = jacobian(point, phase);
    const determinant = dot(matrix[0], cross(matrix[1], matrix[2]));
    maximumDeterminantError = Math.max(maximumDeterminantError, Math.abs(determinant - 1));
    const stretch = norm(cross(apply(matrix, u), apply(matrix, v))) / norm(cross(u, v));
    minimumStretch = Math.min(minimumStretch, stretch); maximumStretch = Math.max(maximumStretch, stretch);
    assert(distance(deform(point, phase), deform(point, phase + TAU)) < 1e-12, 'The wrapped phase must not teleport particles.');
  }
  assert(distance(velocity(point, 0), velocity(point, TAU)) < 1e-10, 'Velocity must remain continuous at the phase wrap.');
}
assert(maximumDeterminantError < 1e-7, 'The common field must preserve volume without folding or compression.');
assert(minimumStretch > .78 && maximumStretch < 1.32, 'Surface density must not collapse into bright clumps or sparse channels.');

// Adjacent grains must see adjacent velocities everywhere, especially at the
// old route junctions: no branch identity may select a competing current.
let maximumVelocityGradient = 0;
const junctions = [[.36, .13], [-.36, .13], [0, -1.245], [0, 1.2]];
for (const center of [...points.slice(0, 512).map(p => p.slice(0, 2)), ...junctions]) {
  for (const face of [-1, 1]) for (const offset of [[.004, 0], [-.004, 0], [0, .004], [0, -.004]]) {
    const next = center.map((value, i) => value + offset[i]);
    const a = sampleToyotaSurface(field, ...center), b = sampleToyotaSurface(field, ...next);
    if (a[0] >= -.002 || b[0] >= -.002) continue;
    const p = [...center, a[3] * face], q = [...next, b[3] * face];
    for (const phase of [0, 1.5, 3, 4.5, 6]) {
      const ratio = distance(velocity(p, phase), velocity(q, phase)) / distance(p, q);
      maximumVelocityGradient = Math.max(maximumVelocityGradient, ratio);
      assert(ratio < .24, 'Neighbouring surface points must share one smooth velocity field through junctions.');
    }
  }
}

for (const fps of [30, 60, 120]) {
  let moved = 0, maximumSpeed = 0, maximumAcceleration = 0;
  for (const point of points.slice(0, 1024)) {
    let phase = 0, travelled = 0, maximumExcursion = 0;
    let previous = deform(point, phase), previousVelocity;
    const start = previous;
    for (let frame = 0; frame < fps * 4; frame++) {
      phase = (phase + idleRate / fps) % TAU;
      const next = deform(point, phase);
      const speed = subtract(next, previous).map(value => value * fps);
      maximumSpeed = Math.max(maximumSpeed, norm(speed));
      if (previousVelocity) maximumAcceleration = Math.max(maximumAcceleration, distance(speed, previousVelocity) * fps);
      travelled += distance(next, previous);
      maximumExcursion = Math.max(maximumExcursion, distance(next, start));
      previous = next; previousVelocity = speed;
    }
    assert(distance(previous, deform(point, 4 * idleRate)) < 1e-10, 'Whole-body motion must not depend on frame rate.');
    assert(travelled > .25, 'Every part of the body must move during a four-second window.');
    if (maximumExcursion > .25) moved++;
  }
  assert(moved > 1024 * .95, 'The logo must visibly move as a body rather than freeze around moving highlights.');
  assert(maximumSpeed < .35 && maximumAcceleration < .30, 'Motion must have bounded speed and acceleration at all sampled frame rates.');
  console.log(`Toyota whole-body ${fps} FPS: ${(moved / 1024 * 100).toFixed(1)}% moved > .25; speed ${maximumSpeed.toFixed(3)}, acceleration ${maximumAcceleration.toFixed(3)}.`);
}

// Numerically ray-test five open regions under the actual scene orientation.
// The inverse map lets us test the continuous solid, not sparse particle dots.
const orientation = scene.match(/this\.toyotaEuler\.set\(([^;]+)\);/)?.[1];
assert(orientation, 'Use the production rocking angles when checking visible holes.');
const angles = new Function('time', 'Euler', `return new Euler(${orientation.replaceAll('this.toyotaTime', 'time')});`);
// Compare projected travel with the previously subdued version. A stronger
// depth-only displacement can pass a 3D-distance check while still looking
// static front-on, so include the production rocking and perspective here.
function previousDeform(point, phase) {
  let [x, y, z] = point;
  z += .22 * Math.sin(.85 * x + .55 * y - phase);
  x += .12 * Math.sin(.65 * y + .35 * z - phase);
  y += .075 * Math.sin(.70 * x + .30 * z - phase);
  return [x, y, z];
}
const previousAngles = time => new Euler(.24 + Math.sin(time * .23) * .12,
  -.25 + Math.sin(time * .19) * .16, -.08 + Math.sin(time * .16) * .07);
const project = (point, orientation) => {
  const p = new Vector3(...point).applyEuler(orientation);
  return [p.x / (8 - p.z), p.y / (8 - p.z)];
};
let minimumProjectedGain = Infinity;
for (const start of [0, 7, 17, 29, 47]) {
  let previousTravel = 0, currentTravel = 0;
  for (const point of points.slice(0, 256)) {
    let before = project(previousDeform(point, start * .45), previousAngles(start));
    let after = project(deform(point, start * idleRate), angles(start, Euler));
    for (let frame = 1; frame <= 120; frame++) {
      const time = start + frame / 30;
      const p = project(previousDeform(point, time * .45), previousAngles(time));
      const q = project(deform(point, time * idleRate), angles(time, Euler));
      previousTravel += distance(p, before); currentTravel += distance(q, after);
      before = p; after = q;
    }
  }
  const gain = currentTravel / previousTravel;
  minimumProjectedGain = Math.min(minimumProjectedGain, gain);
  assert(gain > 1.5, 'The logo must show substantially more screen-space movement in each sampled four-second window.');
}
console.log(`Projected idle travel: at least ${minimumProjectedGain.toFixed(2)}× the preceding version across five windows.`);

const holes = [[1, -.6], [-1, -.6], [.9, .5], [-.9, .5], [0, .6]];
for (let time = 0; time < 60; time += 3) {
  const phase = time * idleRate;
  const rotation = new Quaternion().setFromEuler(angles(time, Euler)), unrotate = rotation.clone().invert();
  for (const hole of holes) for (const offset of [[0, 0], [.025, 0], [-.025, 0], [0, .025], [0, -.025]]) {
    const materialPoint = [hole[0] + offset[0], hole[1] + offset[1], 0];
    const center = new Vector3(...deform(materialPoint, phase)).applyQuaternion(rotation);
    const ray = center.clone().sub(new Vector3(0, 0, 8)).normalize();
    for (let step = -120; step <= 120; step++) {
      const probe = center.clone().addScaledVector(ray, step / 60).applyQuaternion(unrotate);
      const rest = inverse(probe.toArray(), phase), surface = sampleToyotaSurface(field, rest[0], rest[1]);
      assert(!(surface[0] < -.004 && Math.abs(rest[2]) < surface[3]), 'The rocking solid must leave the sampled logo holes visibly open.');
    }
  }
}

const toyotaBranch = simulation.slice(simulation.indexOf('if (abs(field-8.0)'), simulation.indexOf('  float theta = seed.x', simulation.indexOf('vec4 pose(')));
assert.match(toyotaBranch, /toyotaDeform\(material,uToyotaPhase\)/, 'All Toyota grains must use the same shared deformation after surface motion.');
assert.match(toyotaBranch, /return vec4\([^;]+,1\.0\);/, 'The unified surface must have constant coverage, without moving route opacity.');
assert(!/uToyotaRoute|toyotaTarget|sampleToyotaRoute|createToyotaRoute|toyota-route/.test(shader + simulation + scene), 'The former overlapping circulation routes must be disconnected from rendering.');
assert(!/\bif\s*\(|\bfract\s*\(|\bstep\s*\(/.test(body), 'The body field must not split grains into independently animated branches.');
console.log(`Invertible shared body: area stretch ${minimumStretch.toFixed(3)}–${maximumStretch.toFixed(3)}, det error ${maximumDeterminantError.toExponential(2)}, velocity gradient ${maximumVelocityGradient.toFixed(3)}; phase wrap and five projected holes clear. CPU geometry/source checks only.`);
