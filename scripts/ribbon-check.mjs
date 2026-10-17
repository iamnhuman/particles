import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Euler, Matrix4, Vector3 } from 'three';

// Evaluate the actual scalar GLSL branch, without a browser or GPU. Check the
// full surface and its projection, rather than a second copy of the formula.
const shader = readFileSync(new URL('../src/shaders/simulation.glsl', import.meta.url), 'utf8');
const body = shader.match(/if \(field < 5\.5\) \{([\s\S]*?)\n  \}/)?.[1];
assert(body, 'The half-twisted ribbon field must exist.');
const evaluate = new Function('theta', 'phi', 'tubeRatio', 'pulse', 'uTime', 'uMid', 'sin', 'cos', 'vec3',
  body.replace(/\bfloat\b/g, 'let'));
const tau = Math.PI * 2;
const sample = (theta, phi, time, mid, ratio = 1) =>
  new Vector3(...evaluate(theta, phi, ratio, .24 * mid, time, mid, Math.sin, Math.cos, (...v) => v));
const gatheredBody = shader.match(/(float pulse = uBass[\s\S]*?)\n  vec3 knotCenter/)?.[1];
assert(gatheredBody, 'The gathered cross-section must share the ribbon half-turn.');
const smoothstep = (a, b, v) => { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
const evaluateGathered = new Function('theta', 'phi', 'tubeRatio', 'uTime', 'uMid', 'uBass', 'uHit',
  'uActive', 'frequency', 'field', 'sin', 'cos', 'abs', 'smoothstep', 'vec3',
  gatheredBody.replace(/seed\.z/g, 'tubeRatio').replace(/\b(?:float|vec3)\s+(\w+)\s*=/g, 'let $1 =') + '\nreturn ring;');
const gathered = (theta, phi, time, mid, ratio) => evaluateGathered(theta, phi, ratio, time, mid, mid, mid,
  1, 1, 5, Math.sin, Math.cos, Math.abs, smoothstep, (...v) => new Vector3(...v));
const rotation = new Matrix4();
const project = (p) => {
  const v = p.clone().applyMatrix4(rotation).multiplyScalar(1.06 / 1.28);
  v.x += 1.4; v.y += .28;
  assert(v.z < 7.7 && v.z > -27, 'The whole surface must stay between the camera clipping planes.');
  return [v.x / (7.8 - v.z), v.y / (7.8 - v.z)];
};
let minimumWidth = Infinity, minimumMorphWidth = Infinity, minimumSection = Infinity, maximumRadius = 0;
for (const time of [0, 3.7, 9, 17.4, 29, 38, 60, 90, 150, 240]) for (const mid of [0, 1]) {
  rotation.makeRotationFromEuler(new Euler(
    .52 + Math.sin(time * .1) * .16,
    -.35 + Math.sin(time * .08) * .2 + mid * .06,
    -.38 + time * .028 + mid * .03
  ));
  for (let i = 0; i < 128; i++) {
    const theta = i / 128 * tau;
    const center = (angle) => sample(angle, 0, time, mid).add(sample(angle, Math.PI, time, mid)).multiplyScalar(.5);
    const before = project(center(theta - .001)), after = project(center(theta + .001));
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]);
    const normal = [-(after[1] - before[1]) / length, (after[0] - before[0]) / length];
    let lower = Infinity, upper = -Infinity;
    const releases = [0, .25, .5, .75, 1];
    const morphWidths = releases.map(() => [Infinity, -Infinity]);
    for (let j = 0; j < 96; j++) {
      const phi = j / 96 * tau;
      // Use the innermost populated shell, so larger grains cannot hide a pinch.
      const point = sample(theta, phi, time, mid, .91);
      const outer = sample(theta, phi, time, mid, 1.03);
      assert(point.toArray().every(Number.isFinite));
      maximumRadius = Math.max(maximumRadius, outer.length());
      assert(Math.hypot(outer.x, outer.y) > 1.06, 'The intended central opening must remain open.');
      minimumSection = Math.min(minimumSection, point.distanceTo(center(theta)));
      const screen = project(point), distance = screen[0] * normal[0] + screen[1] * normal[1];
      lower = Math.min(lower, distance); upper = Math.max(upper, distance);
      assert(point.distanceTo(sample(theta + tau, phi + Math.PI, time, mid, .91)) < 1e-10,
        'The half-turn seam must join exactly, with the cross-section reversed.');
      assert(point.distanceTo(sample(theta + .001, phi, time, mid, .91)) < .004,
        'The surface must remain continuous as particles move around the ribbon.');
      const home = gathered(theta, phi, time, mid, .91);
      const seamHome = gathered(theta + tau, phi + Math.PI, time, mid, .91);
      assert(home.distanceTo(seamHome) < 1e-10,
        'The gathered pose must close under the same seam mapping, including during a morph.');
      for (let k = 0; k < releases.length; k++) {
        const screen = project(home.clone().lerp(point, releases[k]));
        const distance = screen[0] * normal[0] + screen[1] * normal[1];
        morphWidths[k][0] = Math.min(morphWidths[k][0], distance);
        morphWidths[k][1] = Math.max(morphWidths[k][1], distance);
      }
    }
    minimumWidth = Math.min(minimumWidth, upper - lower);
    for (const [lower, upper] of morphWidths) minimumMorphWidth = Math.min(minimumMorphWidth, upper - lower);
  }
}
assert(minimumSection > .17, 'The ribbon must have real thickness at every cross-section.');
assert(minimumWidth > .03, 'A rotated section must retain visible width instead of collapsing into a slit.');
assert(minimumMorphWidth > .03, 'The gathered-to-ribbon morph must keep a continuous, populated cross-section.');
assert(maximumRadius < 2.25, 'The thicker ribbon must stay inside the existing scene bounds.');
console.log(`Ribbon: closed seam including morph, minimum half-thickness ${minimumSection.toFixed(3)}, minimum projected width ${minimumWidth.toFixed(3)}, minimum morph width ${minimumMorphWidth.toFixed(3)}, maximum radius ${maximumRadius.toFixed(3)}. CPU geometry check; no browser/GPU rendering.`);
