import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createToyotaTargets, createToyotaSurfaceData, sampleToyotaSurface } from '../src/toyota.js';

// Execute the production material-space drift with the actual union atlas.
// The whole-body deformation is deliberately absent: rocking the emblem must
// not count as grain travelling inside its surface. This is not a GPU render.
const shader = readFileSync(new URL('../src/shaders/toyota-motion.glsl', import.meta.url), 'utf8');
const body = shader.match(/vec2 toyotaGrainXY\(vec2 rest,\s*float distance,\s*float time\)\s*\{([\s\S]*?)\n\}/)?.[1];
assert(body, 'Check the actual production material-space grain helper.');
const smoothstep = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
const evaluate = new Function('rest', 'distance', 'time', 'smoothstep', body
  .replace(/\bfloat\b/g, 'let')
  .replace(/rest\.([xy])/g, (_, axis) => `rest[${'xy'.indexOf(axis)}]`)
  .replace(/\bsin\(/g, 'Math.sin(')
  .replace(/return vec2\(([^()]*)\);/, 'return [$1];'));
const surfaceBody = shader.match(/vec3 toyotaSurfaceGrain\(vec3 rest,\s*float time\)\s*\{([\s\S]*?)\n\}/)?.[1];
assert(surfaceBody, 'The production wrapper must put moving grains back on the fused cap.');
const evaluateSurface = new Function('rest', 'time', 'toyotaSurface', 'toyotaGrainXY', surfaceBody
  .replace(/\b(vec[234]|float)\s+(?=\w+\s*=)/g, 'let ')
  .replace(/rest\.xy/g, 'rest.slice(0,2)')
  .replace(/rest\.z/g, 'rest[2]')
  .replace(/surface\.x/g, 'surface[0]')
  .replace(/surface\.w/g, 'surface[3]')
  .replace(/toyotaSurface\(point\)\.w/g, 'toyotaSurface(point)[3]')
  .replace(/\bmax\(/g, 'Math.max(')
  .replace(/return vec3\(point,([\s\S]*?)\);/, 'return [...point,$1];'));
const field = createToyotaSurfaceData();
const grains = createToyotaTargets(4096);
const points = Array.from({ length: grains.length / 4 }, (_, index) => Array.from(grains.subarray(index * 4, index * 4 + 3)));
const magnitude = vector => Math.hypot(...vector);
const difference = (a, b) => a.map((value, i) => value - b[i]);
const separation = (a, b) => magnitude(difference(a, b));
const xyAt = (rest, time) => evaluate(rest, sampleToyotaSurface(field, ...rest)[0], time, smoothstep);
function surfaceAt(rest, face, time) {
  const origin = [...rest, sampleToyotaSurface(field, ...rest)[3] * face];
  return evaluateSurface(origin, time, point => sampleToyotaSurface(field, ...point),
    (point, distance, time) => evaluate(point, distance, time, smoothstep));
}

const simulation = readFileSync(new URL('../src/shaders/simulation.glsl', import.meta.url), 'utf8');
assert.match(simulation, /vec3 material\s*=\s*toyotaSurfaceGrain\(grain\.xyz,\s*uToyotaFlowTime\);/,
  'The renderer must use material-space grain motion with its continuous clock.');
assert.match(simulation, /toyotaDeform\(material,\s*uToyotaPhase\)/,
  'The entire moving material must pass through the common whole-body deformation.');

let minimumClearance = Infinity, minimumJacobian = Infinity, maximumJacobian = 0;
let maximumTravel = 0, movingGrains = 0, broadGrains = 0, movingBroadGrains = 0;
const epsilon = 1e-4;
for (const point of points) {
  const rest = point.slice(0, 2), cap = sampleToyotaSurface(field, ...rest);
  const face = point[2] / cap[3];
  let excursion = 0;
  for (let phase = 0; phase < 32; phase++) {
    const time = phase / 32 * Math.PI * 2;
    const moved = surfaceAt(rest, face, time);
    const current = sampleToyotaSurface(field, moved[0], moved[1]);
    assert(moved.every(Number.isFinite));
    minimumClearance = Math.min(minimumClearance, -current[0]);
    excursion = Math.max(excursion, separation(moved, point));
    const x0 = xyAt([rest[0] - epsilon, rest[1]], time);
    const x1 = xyAt([rest[0] + epsilon, rest[1]], time);
    const y0 = xyAt([rest[0], rest[1] - epsilon], time);
    const y1 = xyAt([rest[0], rest[1] + epsilon], time);
    const determinant = ((x1[0] - x0[0]) * (y1[1] - y0[1]) - (x1[1] - x0[1]) * (y1[0] - y0[0])) / (4 * epsilon * epsilon);
    minimumJacobian = Math.min(minimumJacobian, determinant);
    maximumJacobian = Math.max(maximumJacobian, determinant);
  }
  maximumTravel = Math.max(maximumTravel, excursion);
  if (excursion > .02) movingGrains++;
  if (cap[0] < -.10) {
    broadGrains++;
    if (excursion > .025) movingBroadGrains++;
  }
}
assert(minimumClearance > .0005, 'Tangential grains must stay inside the union, including beside all holes.');
assert(minimumJacobian > .25 && maximumJacobian < 1.75, 'The common drift map must remain unfolded and avoid severe density compression.');
assert(maximumTravel < .065, 'Fine grain motion must not turn into another body-scale deformation.');
assert(broadGrains > 200 && movingBroadGrains / broadGrains > .95, 'The broad material must have actual internal movement with the body frozen.');
assert(movingGrains / points.length > .35, 'Internal motion must affect a substantial part of the sampled surface, not a few highlights.');

// Local material velocities remain continuous through every former oval
// junction. The test has no branch or lane identities to choose a current.
const centers = [[.36, .13], [-.36, .13], [0, -1.245], [0, 1.2], ...points.slice(0, 128).map(point => point.slice(0, 2))];
let maximumVelocityGradient = 0;
const velocityAt = (rest, time) => difference(xyAt(rest, time + epsilon), xyAt(rest, time - epsilon)).map(value => value / (2 * epsilon));
for (const center of centers) for (const offset of [[.002, 0], [-.002, 0], [0, .002], [0, -.002]]) {
  const other = center.map((value, i) => value + offset[i]);
  if (sampleToyotaSurface(field, ...center)[0] >= -.002 || sampleToyotaSurface(field, ...other)[0] >= -.002) continue;
  for (const time of [0, .6, 1.2, 1.8, 2.4, 3]) {
    const gradient = separation(velocityAt(center, time), velocityAt(other, time)) / separation(center, other);
    maximumVelocityGradient = Math.max(maximumVelocityGradient, gradient);
    assert(gradient < 1.5, 'Neighbouring grains must share a continuous velocity through fused junctions.');
  }
}

let maximumSpeed = 0, maximumAcceleration = 0;
for (const fps of [30, 60, 120]) {
  for (const point of points.slice(0, 256)) {
    const rest = point.slice(0, 2), face = point[2] / sampleToyotaSurface(field, ...rest)[3];
    let previous = surfaceAt(rest, face, 0), previousVelocity;
    for (let frame = 1; frame <= fps * 4; frame++) {
      const time = frame / fps;
      const next = surfaceAt(rest, face, time);
      const velocity = difference(next, previous).map(value => value * fps);
      maximumSpeed = Math.max(maximumSpeed, magnitude(velocity));
      if (previousVelocity) maximumAcceleration = Math.max(maximumAcceleration, separation(velocity, previousVelocity) * fps);
      previous = next; previousVelocity = velocity;
    }
    assert(separation(previous, surfaceAt(rest, face, 4)) < 1e-12, 'Material-space motion must have the same result at 30, 60 and 120 FPS.');
    assert(separation(surfaceAt(rest, face, 0), surfaceAt(rest, face, Math.PI * 2)) < 1e-12, 'Grains must remain continuous if the shared phase wraps.');
    const front = surfaceAt(rest, 1, 1.3), back = surfaceAt(rest, -1, 1.3);
    assert(separation(front.slice(0, 2), back.slice(0, 2)) === 0 && Math.abs(front[2] + back[2]) < 1e-12,
      'Both faces must share the same XY flow and the same fused cap height.');
  }
}
assert(maximumSpeed < .16, 'Fine grains must move continuously at a bounded surface speed.');
assert(maximumAcceleration < 5, 'Bilinear cap lookup must not introduce large frame-to-frame jumps.');
console.log(`Toyota internal grain: ${(movingGrains / points.length * 100).toFixed(1)}% move > .02, ${(movingBroadGrains / broadGrains * 100).toFixed(1)}% of broad surface > .025; max displacement ${maximumTravel.toFixed(4)}.`);
console.log(`Union clearance ${minimumClearance.toFixed(6)}, Jacobian ${minimumJacobian.toFixed(3)}–${maximumJacobian.toFixed(3)}, velocity gradient ${maximumVelocityGradient.toFixed(3)}, speed ${maximumSpeed.toFixed(3)}, acceleration ${maximumAcceleration.toFixed(3)}. Body frozen; CPU geometry checks only.`);
