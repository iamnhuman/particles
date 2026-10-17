import assert from 'node:assert/strict';
import {
  createChoreographyDriver, CYCLE_DURATION, MORPH_DURATION,
  TOYOTA_MORPH_DURATION, TOYOTA_HOLD_DURATION, formWeight,
} from '../src/choreography.js';

const features = [.75, .8, .6, .45, .6, .4, .25, .5];
const sample = (driver, time, delta) => ({ ...driver.sample({ time, delta, active: 1, features }), time });
function run(driver, seconds, fps = 60, start = 0) {
  return Array.from({ length: Math.round(seconds * fps) }, (_, i) => sample(driver, start + (i + 1) / fps, 1 / fps));
}
const close = (actual, expected, tolerance, label) => assert(Math.abs(actual - expected) <= tolerance,
  `${label}: expected ${expected}s, got ${actual}s`);
function episodes(frames, fps = 60) {
  const found = []; let current;
  for (const frame of frames) {
    const weight = formWeight(frame, 8);
    if (!current && weight > 0) current = { enter: frame.time - 1 / fps };
    if (!current) continue;
    if (weight === 1 && current.settled === undefined) current.settled = frame.time;
    if (current.settled !== undefined && weight < 1 && current.leave === undefined) current.leave = frame.time - 1 / fps;
    if (weight === 0) { found.push({ ...current, end: frame.time }); current = undefined; }
  }
  return found;
}
function checkCameo(episode, fps = 60) {
  assert(episode && episode.settled !== undefined && episode.leave !== undefined, 'Toyota must fully assemble before leaving.');
  const tolerance = 2 / fps + 1e-8;
  close(episode.settled - episode.enter, TOYOTA_MORPH_DURATION, tolerance, 'Toyota entrance');
  close(episode.leave - episode.settled, TOYOTA_HOLD_DURATION, tolerance, 'Toyota hold');
  close(episode.end - episode.leave, TOYOTA_MORPH_DURATION, tolerance, 'Toyota exit');
}
function transitions(frames, fps = 60) {
  const found = []; let current;
  for (const frame of frames) {
    if (current && (frame.fromStyle !== current.from || frame.toStyle !== current.to)) {
      found.push({ ...current, duration: frame.time - current.start }); current = undefined;
    }
    if (!current && frame.fromStyle !== frame.toStyle) current = { from: frame.fromStyle, to: frame.toStyle, start: frame.time - 1 / fps };
  }
  return found;
}

const automatic = new Map();
for (const fps of [30, 60, 120]) {
  const frames = run(createChoreographyDriver(), CYCLE_DURATION + 4, fps);
  const cameos = episodes(frames, fps);
  assert.equal(cameos.length, 1, 'Exactly one Toyota cameo belongs to each default cycle.');
  checkCameo(cameos[0], fps);
  const normal = transitions(frames, fps).filter(pair => pair.from !== 8 && pair.to !== 8);
  assert(normal.length > 8);
  for (const pair of normal) close(pair.duration, MORPH_DURATION, 2 / fps, 'Unchanged non-Toyota morph');
  automatic.set(fps, frames);
}
for (const fps of [30, 120]) for (let tick = 1; tick < CYCLE_DURATION * 2; tick++) {
  const time = tick / 2;
  const a = automatic.get(fps)[Math.round(time * fps) - 1];
  const b = automatic.get(60)[Math.round(time * 60) - 1];
  assert(Math.abs(a.toyota - b.toyota) < .02, `Toyota timing must agree at ${fps} FPS, time ${time}.`);
}
for (const time of [21, 26]) {
  const frame = sample(createChoreographyDriver(), time, 1 / 60);
  assert.equal(frame.toyota, 0, 'Loading inside the Toyota slot outside its cameo must not flash the logo.');
}

const preview = createChoreographyDriver({ random: () => 7.5 / 12 });
preview.randomize();
const previewFrames = run(preview, 20);
const previewCameos = episodes(previewFrames);
assert.equal(previewCameos.length, 1, 'The Toyota preview must not repeat when automatic playback resumes.');
checkCameo(previewCameos[0]);
assert(previewCameos[0].enter < .02 && previewCameos[0].end < 2.6);
assert(previewFrames.filter(frame => frame.time > 3).every(frame => frame.toyota === 0));

let choice = .999;
const queued = createChoreographyDriver({ random: () => choice });
queued.randomize();
const before = run(queued, .5);
choice = 7.5 / 11; // The active pair 0 -> 12 leaves IDs 1..11 selectable.
queued.randomize();
assert.deepEqual(sample(queued, .5, 0), before.at(-1), 'A queued Toyota request must preserve the current pose.');
const queuedFrames = [...before, ...run(queued, 20, 60, .5)];
const queuedCameos = episodes(queuedFrames);
assert.equal(queuedCameos.length, 1);
checkCameo(queuedCameos[0]);
assert(queuedCameos[0].enter >= MORPH_DURATION - 1 / 60, 'Toyota must wait for the active morph to finish.');
const initialPair = transitions(queuedFrames)[0];
assert.equal(initialPair.to, 12);
close(initialPair.duration, MORPH_DURATION, 2 / 60, 'Queued request preserves the active morph duration');

const shuffledEntries = new Set();
for (let seed = 1; seed <= 8; seed++) {
  let state = seed, calls = 0;
  const random = () => {
    if (calls++ === 0) return 0; // Begin with a non-Toyota preview, then shuffle.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const driver = createChoreographyDriver({ random }); driver.randomize();
  const frames = run(driver, CYCLE_DURATION + 7);
  const cameos = episodes(frames);
  assert.equal(cameos.length, 1, 'A shuffled cycle must contain one short Toyota appearance.');
  checkCameo(cameos[0]);
  shuffledEntries.add(Math.round(cameos[0].enter));
}
assert(shuffledEntries.size >= 4, 'Exercise Toyota in multiple shuffled phrase slots.');

preview.reset();
const fresh = createChoreographyDriver();
assert.deepEqual(sample(preview, 0, 0), sample(fresh, 0, 0));
assert.deepEqual(run(preview, 30), run(fresh, 30), 'Reset must clear all cameo and preview timers.');
console.log(JSON.stringify({ passed: true, automatic: episodes(automatic.get(60))[0], preview: previewCameos[0], queued: queuedCameos[0], shuffledSlotsChecked: shuffledEntries.size }));
