import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';

// Evaluate the scalar GLSL branches with a numerical sweep-frame reference.
// This checks geometry and continuous trajectories, not GPU compilation.
const shader = readFileSync(new URL('../src/shaders/simulation.glsl', import.meta.url), 'utf8');
const vector = (...v) => new Vector3(...v);
const normal = tangent => {
  assert(Math.hypot(tangent.x, tangent.y) > .19, 'The sweep must never switch frame axes or have a singular tangent.');
  return vector(tangent.y, -tangent.x, 0).normalize();
};
const tube = (center, tangent, phase, width) => {
  const n = normal(tangent), b = tangent.clone().normalize().cross(n).normalize();
  return center.add(n.multiplyScalar(Math.cos(phase) * width)).add(b.multiplyScalar(Math.sin(phase) * width));
};
const ribbon = (center, tangent, phase, ratio, width, depth, turn) => {
  const n = normal(tangent), b = tangent.clone().normalize().cross(n).normalize();
  const across = n.clone().multiplyScalar(Math.cos(turn)).addScaledVector(b, Math.sin(turn));
  const face = n.clone().multiplyScalar(-Math.sin(turn)).addScaledVector(b, Math.cos(turn));
  return center.addScaledVector(across, Math.cos(phase) * ratio * width).addScaledVector(face, Math.sin(phase) * ratio * depth);
};
const bodies = [9.5, 10.5, 11.5].map(limit => shader.match(new RegExp(`if \\(field < ${String(limit).replace('.', '\\.')}\\) \\{([\\s\\S]*?)\\n  \\}`))?.[1]);
bodies.push(shader.match(/  \/\/ A closed figure-eight knot[^\n]*\n([\s\S]*?)\n\}/)?.[1]);
const signature = [];
for (let field = 0; field < bodies.length; field++) {
  assert(bodies[field], `New form ${field + 9} must exist.`);
  const evaluate = new Function('theta', 'phi', 'tubeRatio', 'pulse', 'uTime', 'uMid', 'vec3', 'tubePose', 'ribbonPose', 'sin', 'cos', bodies[field].replace(/\bfloat\b/g, 'let'));
  const sample = (theta, phi, time, mid, ratio = 1.03) => evaluate(theta, phi, ratio, .24 * mid, time, mid, vector, tube, ribbon, Math.sin, Math.cos);
  let radius = 0, step = 0, moved = 0;
  for (const time of [0, 17, 38]) for (const mid of [0, 1.5]) for (let i = 0; i < 256; i++) for (let lane = 0; lane < 24; lane++) {
    const theta = i / 256 * Math.PI * 2, phi = lane / 24 * Math.PI * 2;
    const p = sample(theta, phi, time, mid);
    assert(p.toArray().every(Number.isFinite));
    radius = Math.max(radius, p.length());
    assert(p.distanceTo(sample(theta + Math.PI * 2, phi, time, mid)) < 1e-9, 'Every new form must close without a seam.');
    step = Math.max(step, p.distanceTo(sample(theta + .001, phi, time, mid)));
    if (p.distanceTo(sample(theta, phi, time + .5, mid)) > .005) moved++;
  }
  assert(radius < 2.5, 'The new form must fit the existing scene bounds.');
  assert(step < .025, 'Grain trajectories must remain continuous through every bend.');
  assert(moved > 35000, 'Each form must retain visible motion without music.');
  signature.push([.23, .83, 1.7, 3.1].map(theta => sample(theta, 0, 0, 0, 0)));
  console.log(`Form ${field + 9}: closed continuous flow, radius ${radius.toFixed(3)}, maximum local step ${step.toFixed(4)}.`);
}
for (let a = 0; a < signature.length; a++) for (let b = a + 1; b < signature.length; b++) {
  assert(signature[a].reduce((sum, p, i) => sum + p.distanceTo(signature[b][i]), 0) > 1, 'New forms must have different silhouettes.');
}
