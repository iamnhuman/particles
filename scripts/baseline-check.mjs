import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Compare with the last pushed source, without fetching, resetting or pushing.
const revision = '0b6b2c5';
const previous = file => execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
const current = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const compact = text => text.replace(/\s+/g, '');
const oldSimulation = previous('src/shaders/simulation.glsl');
const simulation = current('src/shaders/simulation.glsl');
const release = source => {
  const start = source.indexOf('vec3 bloom =');
  const last = '(.65+.35*sin(theta*4.0+uTime));';
  return source.slice(start, source.indexOf(last, start) + last.length).replace('vec3 scattered =', 'scattered =').replace('vec4(field)', 'vec4(uStyle)');
};
assert.equal(compact(release(simulation)), compact(release(oldSimulation)),
  'The original broad release paths, spread, curl and impact strengths must be restored exactly.');
const vertex = current('src/shaders/particles.vert.glsl');
const oldVertex = previous('src/shaders/particles.vert.glsl');
const palette = source => source.slice(source.indexOf('  float warmLight'), source.indexOf('\n', source.indexOf('  vColor *=')));
const opacity = source => source.slice(source.indexOf('  vAlpha ='));
assert.equal(palette(vertex), palette(oldVertex), 'All forms must retain the original copper palette.');
assert.equal(opacity(vertex), opacity(oldVertex), 'The ordinary grain opacity must remain intact.');
assert(!/vSpark/.test(vertex + current('src/shaders/particles.frag.glsl')),
  'Oversized white spark accents were explicitly removed at the user’s request.');
const scene = current('src/scene.js');
assert.equal((scene.match(/\.addVariable\(/g) || []).length, 1,
  'The renderer must use one position compute pass, with no additional Toyota pass.');
assert(!scene.includes('toyotaFlowVariable'));
assert(scene.includes('createToyotaTargets(this.particleCount)'), 'The logo must use one sample of the fused body.');
assert(simulation.includes('toyotaSurfaceGrain(grain.xyz,uToyotaFlowTime)') && simulation.includes('toyotaDeform(material,uToyotaPhase)'), 'All logo particles must slide on the fused surface before the shared body deformation.');
assert(!/createToyotaRoute|uToyotaRoute|toyota-route/.test(scene + simulation),
  'The logo must not use overlapping route strips or independent oval currents.');
assert(!scene.includes('const toyotaScale ='), 'The logo must not breathe or pulse in scale.');
assert(!scene.slice(scene.indexOf('  randomize() {'), scene.indexOf('  resize() {')).includes('originTexture'),
  'Randomize must not instantly reseed particle trajectories.');
assert(simulation.includes('pose(uFromStyle') && simulation.includes('pose(uToStyle'), 'Shapes must morph directly between two targets.');
console.log(`Compared with ${revision}: original broad release, copper palette and grain opacity retained; white spark accents removed; one compute pass and one fused Toyota body. Source/numerical checks only, no browser/GPU measurement.`);
