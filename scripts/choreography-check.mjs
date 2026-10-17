import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Meyda from 'meyda';
import { createChoreographyDriver, FORM_IDS, CYCLE_DURATION, MORPH_DURATION, TOYOTA_MORPH_DURATION, TOYOTA_HOLD_DURATION, formWeight } from '../src/choreography.js';
import { createResponseDriver } from '../src/response.js';
import { createSpatialMotionDriver } from '../src/spatial-motion.js';

const duration = CYCLE_DURATION + 30;
const constantMusic = [.75, .8, .6, .45, .6, .4, .25, .5];
const weights = state => FORM_IDS.map(id => formWeight(state, id));
const difference = (a, b) => weights(a).reduce((sum, value, i) => sum + Math.abs(value - weights(b)[i]), 0);
const continuous = (a, b, dt) => {
  const logoTransition = [a, b].some(f => f.fromStyle !== f.toStyle && (f.fromStyle === 8 || f.toStyle === 8));
  // The quintic blend's maximum derivative is 1.875; two complementary
  // weights change together. Faster logo morphs still obey this smooth bound.
  const maximum = 3.75 * dt / (logoTransition ? TOYOTA_MORPH_DURATION : MORPH_DURATION);
  assert(difference(a, b) <= maximum + 1e-8, 'Target weights must follow the continuous eased transition.');
};
const valid = frame => {
  for (const [name, maximum] of [['dispersion', 1], ['style', 12], ['formation', 1], ['morph', 1], ['toyota', 1]]) {
    assert(Number.isFinite(frame[name]) && frame[name] >= 0 && frame[name] <= maximum, `${name} must remain finite and bounded`);
  }
  assert(FORM_IDS.includes(frame.fromStyle) && FORM_IDS.includes(frame.toStyle));
  assert(Math.abs(weights(frame).reduce((a, b) => a + b, 0) - 1) < 1e-10);
  assert.equal(frame.toyota, formWeight(frame, 8));
  assert(weights(frame).filter(weight => weight > 0).length <= 2, 'A morph may only contain its two selected targets.');
};
function simulate({ fps = 60, seconds = duration, active = 1, features = () => constantMusic, offset = 0 } = {}) {
  const driver = createChoreographyDriver(), frames = [];
  let reused;
  for (let i = 0; i <= Math.floor(seconds * fps); i++) {
    const time = i / fps;
    const frame = driver.sample({ time: time + offset, features: features(time), active, delta: 1 / fps });
    valid(frame);
    if (reused) assert.equal(frame, reused);
    reused = frame; frames.push({ ...frame, time });
  }
  return frames;
}
function longestRun(frames, predicate, fps = 60) {
  let longest = 0, run = 0;
  for (const frame of frames) { run = predicate(frame) ? run + 1 : 0; longest = Math.max(longest, run); }
  return longest / fps;
}
const occupancy = frames => ({
  structured: frames.filter(f => f.dispersion < .1).length / frames.length,
  dispersed: frames.filter(f => f.dispersion > .6).length / frames.length
});
// Unlike the other fields, Toyota's silhouette is also present at low dispersion.
const visible = (frame, id) => (id === 8 || frame.dispersion > .6) && formWeight(frame, id) > .98;
const visibleStyles = frames => FORM_IDS.filter(id => frames.some(f => visible(f, id)));
const visibleStyleSeconds = frames => FORM_IDS.map(id => frames.filter(f => visible(f, id)).length / 60);
const frames = simulate(), synthetic = occupancy(frames);
assert(synthetic.structured > .2 && synthetic.dispersed > .2);
assert(longestRun(frames, f => f.dispersion < .1) > 2);
assert(longestRun(frames, f => f.dispersion > .6) > 1.5);
assert.deepEqual(visibleStyles(frames.filter(f => f.time < CYCLE_DURATION)), FORM_IDS);
assert(visibleStyleSeconds(frames.filter(f => f.time < CYCLE_DURATION)).every((seconds, id) => id === 8 ? seconds > .6 && seconds < 1.1 : seconds > 1.3));
assert(visibleStyleSeconds(frames.filter(f => f.time < 20))[0] > 3, 'Preserve the long original opening release.');
for (let i = 1; i < frames.length; i++) {
  assert(Math.abs(frames[i].dispersion - frames[i - 1].dispersion) < .021);
  continuous(frames[i], frames[i - 1], 1 / 60);
  if (frames[i].morph > .001 && frames[i].morph < .999 && frames[i - 1].morph > .001 && frames[i - 1].morph < .999) {
    assert.equal(frames[i].fromStyle, frames[i - 1].fromStyle);
    assert.equal(frames[i].toStyle, frames[i - 1].toStyle);
  }
}
for (const options of [{ active: 0 }, { features: () => [] }]) assert(simulate(options).every(f => f.dispersion <= .12));
assert(synthetic.dispersed > occupancy(simulate({ features: () => [.06, .06, .05, .03, .02, .4, .25, 0] })).dispersed + .15);
for (const fps of [30, 120]) {
  const other = simulate({ fps });
  for (let second = 1; second < duration; second++) {
    assert(difference(other[second * fps], frames[second * 60]) < .025, `Direct target weights must match at ${fps} FPS.`);
    for (const name of ['dispersion', 'formation']) assert(Math.abs(other[second * fps][name] - frames[second * 60][name]) < .02);
  }
}
const resetPose = { dispersion: .025, style: 0, formation: .25, fromStyle: 0, toStyle: 0, morph: 1, toyota: 0 };
const invalid = createChoreographyDriver();
for (const args of [{}, { time: NaN, delta: NaN, active: NaN, features: [Infinity, NaN] }, { time: Infinity, active: -1, delta: -1 }, { time: 1e9, delta: 5, active: 8, features: Array(8).fill(1e8) }]) valid(invalid.sample(args));
invalid.reset(); assert.deepEqual(invalid.sample({ delta: 0 }), resetPose);

// Explicit 0 -> 12 morph: passing the numeric index 8 must never show Toyota.
const direct = createChoreographyDriver({ random: () => .999 });
direct.sample({ time: 0, delta: 0 }); direct.randomize();
assert.deepEqual(direct.sample({ time: 0, delta: 0 }), resetPose, 'A click must preserve the exact current pose.');
let reached = false;
for (let i = 1; i <= (MORPH_DURATION + .1) * 60; i++) {
  const frame = direct.sample({ time: i / 60, active: 0, delta: 1 / 60 });
  assert.equal(frame.toyota, 0, 'A direct non-Toyota morph cannot flash the logo.');
  assert(frame.fromStyle === 0 || frame.fromStyle === 12);
  assert.equal(frame.toStyle, 12);
  if (formWeight(frame, 12) === 1) reached = true;
}
assert(reached, 'The selected target must settle within the continuous morph duration.');

const selections = new Set();
for (let choice = 0; choice < FORM_IDS.length; choice++) {
  const driver = createChoreographyDriver({ random: () => choice === 12 ? 0 : (choice + .5) / 12 });
  if (choice === 12) driver.sample({ time: 12, active: 0, delta: 1 / 60 });
  driver.randomize();
  const preview = [];
  for (let i = 0; i < 9 * 60; i++) preview.push({ ...driver.sample({ time: i / 60, active: 0, delta: 1 / 60 }) });
  const shown = visibleStyles(preview);
  const selected = preview[0].toStyle;
  assert(shown.includes(selected), 'An idle preview must show its requested form.');
  if (selected === 8) {
    assert(preview.slice(3 * 60).every(f => f.toyota === 0), 'A Toyota preview must leave promptly and never restart the logo after recall.');
  } else assert.equal(shown.length, 1, 'Ordinary previews retain their longer single-form passage.');
  assert(preview.at(-1).dispersion < .12);
  selections.add(selected);
}
assert.deepEqual([...selections].sort((a, b) => a - b), FORM_IDS);
const rapid = createChoreographyDriver();
let previousPose = { ...rapid.sample({ time: 0, delta: 0 }) };
for (let i = 1; i <= 1200; i++) {
  rapid.randomize();
  assert.deepEqual(rapid.sample({ time: i / 120, delta: 0 }), previousPose, 'Repeated clicks must not interrupt the current pose.');
  const pose = { ...rapid.sample({ time: i / 120, delta: 1 / 120, active: 1, features: constantMusic }) };
  valid(pose); continuous(pose, previousPose, 1 / 120);
  previousPose = pose;
}
rapid.reset(); assert.deepEqual(rapid.sample({ delta: 0 }), resetPose);

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
const spatial = createSpatialMotionDriver(), spatialFrames = [];
const realFrames = simulate({
  seconds: (samples.length - 1) / sampleRate,
  offset: 8,
  features: (time) => {
    const features = response.sample(analysis[Math.min(analysis.length - 1, Math.floor(time * sampleRate / hop))], 1 / 60, 1);
    spatialFrames.push({ time, ...spatial.sample({ features, active: 1, delta: 1/60, playbackTime: time, duration: samples.length/sampleRate }) });
    return features;
  },
});
const accentTimes = spatialFrames.filter((frame, i) => frame.amount > .5 && (spatialFrames[i-1]?.amount || 0) <= .5).map(frame => Number(frame.time.toFixed(2)));
const broadShare = spatialFrames.filter(frame => frame.amount > .5).length/spatialFrames.length;
const calmShare = spatialFrames.filter(frame => frame.amount < .02).length/spatialFrames.length;
assert.equal(accentTimes.length, 2, 'The real track gets exactly two broad screen gestures.');
assert(accentTimes[0] > samples.length/sampleRate*.20 && accentTimes[1] > samples.length/sampleRate*.65, 'Gestures belong to two separate musical passages.');
assert(accentTimes[1]-accentTimes[0] > samples.length/sampleRate*.30, 'The two broad gestures need a long composed passage between them.');
assert(broadShare > .05 && broadShare < .15 && calmShare > .80, 'Most of the track must retain its normal framing.');
console.log('Real-track screen stretches:', JSON.stringify({ accentTimes, broadShare, calmShare }));
const real = occupancy(realFrames);
assert(real.structured > .18, `Real track must have sustained assembled passages: ${real.structured}`);
assert(real.dispersed > .16, `Real track must have full releases: ${real.dispersed}`);
assert(longestRun(realFrames, (f) => f.dispersion < .1) > 1.7, 'Real track must allow the assembled sculpture to settle');
const realStyles = visibleStyles(realFrames);
const realStyleDurations = visibleStyleSeconds(realFrames);
assert(realStyles.includes(8), 'Toyota must appear automatically during the supplied track');
assert(realStyleDurations[8] > .75, `The automatic Toyota passage must visibly hold: ${realStyleDurations[8]}`);
assert(realStyles.includes(9), 'A new form must appear automatically during the supplied track.');
assert(realStyles.length >= 4, 'The track must retain several sustained silhouettes.');
assert(realStyles.every((style) => realStyleDurations[style] > .25), `Every visible real-track field must remain for a sustained passage: ${realStyleDurations}`);
console.log(JSON.stringify({ passed: true, synthetic, realTrack: { seconds: samples.length / sampleRate, ...real, visibleStyles: visibleStyles(realFrames), visibleStyleSeconds: visibleStyleSeconds(realFrames) }, checks: ['held forms', 'flowing releases', 'direct two-target morphs', 'queued randomize without reseeding', 'thirteen forms in one cycle', 'sustained visible silhouettes', 'changing silhouettes', 'smooth transitions', 'audio-dependent strength', 'idle and silence', '30/60/120 FPS', 'invalid input and reset', 'randomize before Play', 'all thirteen forms manually selectable', 'direct preview morph', 'smooth preview and recall', 'queued retarget during a morph', 'rapid randomize and reset', 'real MP3 envelopes and automatic Toyota'] }, null, 2));
