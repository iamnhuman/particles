import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Meyda from 'meyda';
import { createChoreographyDriver } from '../src/choreography.js';
import { createResponseDriver } from '../src/response.js';

const duration = 126;
const constantMusic = [.75, .8, .6, .45, .6, .4, .25, .5];
const valid = (frame) => {
  for (const [name, maximum] of [['dispersion', 1], ['style', 3], ['formation', 1]]) {
    assert(Number.isFinite(frame[name]) && frame[name] >= 0 && frame[name] <= maximum, `${name} must remain finite and bounded`);
  }
};
function simulate({ fps = 60, seconds = duration, active = 1, features = () => constantMusic, offset = 0 } = {}) {
  const driver = createChoreographyDriver();
  const frames = [];
  let reused;
  for (let i = 0; i <= Math.floor(seconds * fps); i++) {
    const time = i / fps;
    const frame = driver.sample({ time: time + offset, features: features(time), active, delta: 1 / fps });
    valid(frame);
    if (reused) assert.equal(frame, reused, 'Animation samples must reuse their output object');
    reused = frame;
    frames.push({ ...frame, time });
  }
  return frames;
}
function longestRun(frames, predicate, fps = 60) {
  let longest = 0, run = 0;
  for (const frame of frames) {
    run = predicate(frame) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest / fps;
}
function occupancy(frames) {
  return {
    structured: frames.filter((f) => f.dispersion < .1).length / frames.length,
    dispersed: frames.filter((f) => f.dispersion > .6).length / frames.length,
  };
}

const frames = simulate();
const synthetic = occupancy(frames);
assert(synthetic.structured > .23, `Structured forms need meaningful screen time: ${synthetic.structured}`);
assert(synthetic.dispersed > .2, `Clouds need flowing releases: ${synthetic.dispersed}`);
assert(longestRun(frames, (f) => f.dispersion < .1) > 3, 'Coherent forms must hold for several seconds');
assert(longestRun(frames, (f) => f.dispersion > .6) > 2, 'Dispersal must flow rather than flicker');
assert(Math.max(...frames.map((f) => f.style)) > 2.8, 'All four escape styles must be reached');
assert(Math.min(...frames.map((f) => f.style)) < .1);
assert(Math.max(...frames.map((f) => f.formation)) - Math.min(...frames.map((f) => f.formation)) > .8, 'The assembled silhouette must change');
for (let i = 1; i < frames.length; i++) {
  assert(Math.abs(frames[i].dispersion - frames[i - 1].dispersion) < .012, 'Release and recall must avoid single-frame jumps');
  assert(Math.abs(frames[i].style - frames[i - 1].style) < .03, 'Trajectory changes must remain continuous');
  assert(Math.abs(frames[i].formation - frames[i - 1].formation) < .015, 'Form transitions must remain continuous');
}

for (const [name, options] of [['idle', { active: 0 }], ['silence', { features: () => [] }]]) {
  const resting = simulate(options);
  assert(resting.every((f) => f.dispersion <= .12), `${name} must remain coherent`);
  assert(resting.every((f) => f.formation >= .2 && f.formation <= .4), `${name} must retain the calm torus-like form`);
}
const loud = simulate();
const soft = simulate({ features: () => [.06, .06, .05, .03, .02, .4, .25, 0] });
assert(occupancy(loud).dispersed > occupancy(soft).dispersed + .15, 'Actual audio energy must sculpt dispersal strength');

for (const fps of [30, 120]) {
  const other = simulate({ fps });
  for (let second = 1; second < duration; second++) {
    for (const name of ['dispersion', 'style', 'formation']) {
      assert(Math.abs(other[second * fps][name] - frames[second * 60][name]) < .015, `${name} must behave consistently at ${fps} FPS`);
    }
  }
}
const invalid = createChoreographyDriver();
for (const args of [{}, { time: NaN, delta: NaN, active: NaN, features: [Infinity, NaN] }, { time: Infinity, active: -1, delta: -1 }, { time: 1e9, delta: 5, active: 8, features: Array(8).fill(1e8) }, { time: 3, active: 0, delta: 0 }]) valid(invalid.sample(args));
invalid.reset();
assert.deepEqual(invalid.sample({ delta: 0 }), { dispersion: .025, style: 0, formation: .25 }, 'Reset must restore the initial sculpture');

// Exercise this project's real audio without opening a browser. ffmpeg only
// decodes PCM for this verification; it is not a runtime app dependency.
const sampleRate = 44100;
const hop = 735;
const track = fileURLToPath(new URL('../public/audio/track.mp3', import.meta.url));
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', track, '-f', 'f32le', '-ac', '1', '-ar', String(sampleRate), 'pipe:1'], { maxBuffer: 32 * 1024 * 1024 });
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / Float32Array.BYTES_PER_ELEMENT);
Meyda.bufferSize = 1024;
Meyda.sampleRate = sampleRate;
Meyda.windowingFunction = 'hanning';
const window = new Float32Array(1024);
const analysis = [];
let previous = new Float32Array(512);
for (let start = 0; start < samples.length; start += hop) {
  window.fill(0);
  const from = Math.max(0, start - 512);
  const to = Math.min(samples.length, start + 512);
  window.set(samples.subarray(from, to), from - (start - 512));
  const result = Meyda.extract(['rms', 'amplitudeSpectrum', 'spectralCentroid', 'spectralFlatness'], window);
  const spectrum = result.amplitudeSpectrum;
  let bass = 0, mid = 0, high = 0, flux = 0, bassN = 0, midN = 0, highN = 0;
  for (let bin = 1; bin < spectrum.length; bin++) {
    const hz = bin * sampleRate / 1024;
    if (hz < 220) { bass += spectrum[bin] ** 2; bassN++; }
    else if (hz < 2400) { mid += spectrum[bin] ** 2; midN++; }
    else if (hz < 14000) { high += spectrum[bin] ** 2; highN++; }
    flux += Math.max(0, Math.log1p(spectrum[bin] * 8) - Math.log1p(previous[bin] * 8));
  }
  analysis.push([result.rms, Math.sqrt(bass / bassN), Math.sqrt(mid / midN), Math.sqrt(high / highN), flux, Math.min(1, result.spectralCentroid * sampleRate / 1024 / 9000), result.spectralFlatness || 0, 0]);
  previous = spectrum;
}
const scales = Array.from({ length: 5 }, (_, band) => {
  const sorted = analysis.map((f) => f[band]).sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * .95)] || 1;
});
for (const frame of analysis) for (let band = 0; band < 5; band++) frame[band] = Math.min(1.5, frame[band] / scales[band]);
const response = createResponseDriver();
const realFrames = simulate({
  seconds: (samples.length - 1) / sampleRate,
  offset: 8,
  features: (time) => response.sample(analysis[Math.min(analysis.length - 1, Math.floor(time * sampleRate / hop))], 1 / 60, 1),
});
const real = occupancy(realFrames);
assert(real.structured > .18, `Real track must have sustained assembled passages: ${real.structured}`);
assert(real.dispersed > .16, `Real track must have full releases: ${real.dispersed}`);
assert(longestRun(realFrames, (f) => f.dispersion < .1) > 2, 'Real track must allow the assembled sculpture to settle');
assert(Math.max(...realFrames.map((f) => f.style)) - Math.min(...realFrames.map((f) => f.style)) > 2.6, 'Real track must use diverse escape styles');
console.log(JSON.stringify({ passed: true, synthetic, realTrack: { seconds: samples.length / sampleRate, ...real }, checks: ['held forms', 'flowing releases', 'four styles', 'changing silhouettes', 'smooth transitions', 'audio-dependent strength', 'idle and silence', '30/60/120 FPS', 'invalid input and reset', 'real MP3 envelopes'] }, null, 2));
