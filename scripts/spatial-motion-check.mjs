import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Matrix4, Vector3 } from 'three';
import { createSpatialMotionDriver } from '../src/spatial-motion.js';

const signal = (time, hit = 0) => [.8,.7,.4,.3,.2,.5,.3,hit];
const duration = 40;
function run(fps, featureAt, active = 1, driver = createSpatialMotionDriver()) {
  const frames = [];
  for (let frame = 0; frame < fps*duration; frame++) {
    const time = frame/fps;
    frames.push({ ...driver.sample({features: featureAt(time), active, delta: 1/fps, playbackTime: time, duration}) });
  }
  return frames;
}
const pulse = t => signal(t,[2,10,12,18,27,29,35,38].some(start => t >= start && t < start+.2) ? .98 : 0);
const events = frames => frames.reduce((count,frame,index) => count+(frame.amount > .5 && (frames[index-1]?.amount || 0) <= .5 ? 1 : 0),0);
const reference = run(120,pulse);
assert(reference.every(frame => frame.amount >= 0 && frame.amount <= 1 && Number.isFinite(frame.angle)));
assert.equal(events(reference),2, 'Only one accent in each of the two track passages may stretch the screen.');
assert(reference.slice(0,10*120).every(frame => frame.amount === 0), 'Strong accents during the opening must keep normal framing.');
assert(Math.max(...reference.map(frame => frame.amount)) > .95, 'Strong accents must noticeably open the artwork.');
assert(reference.slice(14*120,27*120).every(frame => frame.amount === 0), 'A long quiet visual passage must separate the two gestures, regardless of intervening audio hits.');
assert(reference.slice(31*120).every(frame => frame.amount === 0), 'The closing passage must remain composed even on loud beats.');
assert(reference.filter(frame => frame.amount < .02).length/reference.length > .8, 'More than 80% of the track retains normal framing.');
assert(run(60,() => signal(0)).every(frame => frame.amount === 0), 'A steady sound must not create a synthetic beat clock.');
assert(run(60,pulse,0).every(frame => frame.amount === 0), 'Inactive playback must never trigger stretching.');
assert(run(60,() => []).every(frame => frame.amount === 0), 'Silence must preserve normal framing.');
for (const fps of [30,60,120]) {
  const frames = run(fps,pulse);
  let maxDifference = 0, maxSpeed = 0, maxAcceleration = 0;
  for (let i = 2; i < frames.length; i++) {
    // Compare at the end of each update, including the first accent step.
    const index = (i+1)*120/fps-1;
    maxDifference = Math.max(maxDifference,Math.abs(frames[i].amount-reference[index].amount));
    maxSpeed = Math.max(maxSpeed,Math.abs(frames[i].amount-frames[i-1].amount)*fps);
    maxAcceleration = Math.max(maxAcceleration,Math.abs(frames[i].amount-2*frames[i-1].amount+frames[i-2].amount)*fps*fps);
  }
  assert(maxDifference < .002, 'Long gestures must not change with frame rate.');
  assert(maxSpeed < 2.1 && maxAcceleration < 7.2, 'Stretch has a bounded, gradual onset and return.');
  console.log(`Spatial gesture ${fps}Hz: deviation ${maxDifference.toFixed(5)}, speed ${maxSpeed.toFixed(3)}, acceleration ${maxAcceleration.toFixed(3)}.`);
}
const constantHit = run(60,() => signal(0,1));
assert(constantHit.every(frame => frame.amount === 0), 'Entering a time window with a sustained high value is not a new audible accent.');
const frequentHits = run(60,t => signal(t,t%1 < .2 ? 1 : 0));
assert.equal(events(frequentHits),2, 'A continuous sequence of strong beats still gets only two gestures.');

const replay = createSpatialMotionDriver();
assert.equal(events(run(60,pulse,1,replay)),2);
assert.equal(events(run(60,pulse,1,replay)),0, 'Seeking back through the track must not rearm used passages.');
replay.reset();
assert.equal(events(run(60,pulse,1,replay)),2, 'Explicit replay/reset rearms both passages.');

const paused = createSpatialMotionDriver(), pausedFrames = [];
for (let frame = 0; frame < 40*60; frame++) {
  const time = frame/60;
  if (frame === 12*60) for (let pause = 0; pause < 3*60; pause++) {
    pausedFrames.push({ ...paused.sample({features:signal(time,1),active:0,delta:1/60,playbackTime:time,duration}) });
  }
  pausedFrames.push({ ...paused.sample({features:pulse(time),active:1,delta:1/60,playbackTime:time,duration}) });
}
assert.equal(events(pausedFrames),2, 'Pause/resume retains both the consumed passage and the later unused one.');

const sought = createSpatialMotionDriver();
sought.sample({features:signal(0),active:1,delta:1/60,playbackTime:0,duration});
let afterSeek = sought.sample({features:signal(28,1),active:1,delta:1/60,playbackTime:28,duration});
assert.equal(afterSeek.amount,0, 'A seek into a loud passage must not manufacture an onset.');
for (let frame = 0; frame < 60; frame++) {
  afterSeek = sought.sample({features:signal(28,1),active:1,delta:1/60,playbackTime:28+frame/60,duration});
  assert.equal(afterSeek.amount,0, 'Sustained sound after a seek must wait for a fresh musical accent.');
}
sought.sample({features:signal(39),active:1,delta:1/60,playbackTime:39,duration});
assert.equal(events(run(60,pulse,1,sought)),0, 'Forward-seeking past both windows closes them; backtracking cannot repeat them.');

const invalid = createSpatialMotionDriver();
for (const args of [{}, { features:[NaN,Infinity],active:NaN,delta:NaN }, {features:Array(8).fill(1e6),active:1e6,delta:1e6}]) {
  const frame = invalid.sample(args);
  assert(Object.values(frame).every(Number.isFinite));
}
invalid.reset();
assert.deepEqual(invalid.sample({delta:0}),{amount:0,angle:0});

// Execute the production affine transform with a Three matrix, without a
// browser. Check the actual screen-axis stretch and recentering for both sizes.
const scene = readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
const start = scene.indexOf('    const sx = 1+amount');
const end = scene.indexOf('    this.artwork.matrixWorldNeedsUpdate',start);
assert(start >= 0 && end > start);
const apply = new Function('amount','angle',scene.slice(start,end));
for (const mobile of [false,true]) for (const angle of [-.2,.2]) {
  const context = { mobile, group:{position:new Vector3(2,.28,0)},artwork:{matrix:new Matrix4()} };
  apply.call(context,0,angle);
  assert(context.artwork.matrix.equals(new Matrix4()), 'No accent must leave the whole stage exactly unchanged.');
  apply.call(context,1,angle);
  const matrix = context.artwork.matrix;
  assert(matrix.determinant() > 1, 'The screen transform must remain invertible, including all logo holes.');
  const center = context.group.position.clone().applyMatrix4(matrix);
  assert(center.x < 2 && Math.abs(center.y-.28) < 1e-12, 'The expanded artwork must move toward the screen centre.');
  const axis = new Vector3(Math.cos(angle),Math.sin(angle),0);
  const stretched = context.group.position.clone().add(axis).applyMatrix4(matrix).sub(center).length();
  assert(Math.abs(stretched-(mobile ? 1.4 : 2.05)) < 1e-12, 'Strong accents must materially widen the artwork, with a restrained mobile extent.');
}
console.log('Screen stretch: exactly two separated musical passages, pause/seek/reset checked, smooth return, desktop width 2.05× and mobile 1.4×; CPU/source checks only.');
