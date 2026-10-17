const clamp = (value, max = 1) => Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0));
const ease = value => { const t = clamp(value); return clamp(t*t*t*(t*(t*6-15)+10)); };
const DURATION = 3.6;
const WINDOWS = [[.20,.35],[.65,.80]];

// Two passages in the actual track can each host one musical accent. Form
// changes, pauses and seeks never replenish that allowance; only replay/reset
// does. The existing long envelope has zero velocity/acceleration at its ends.
export function createSpatialMotionDriver() {
  const output = { amount: 0, angle: 0 };
  let age = DURATION, strength = 0, armed = true;
  let baseline = 0, bassBaseline = 0, initialized = false, direction = 1;
  let previousTime = null, settleAge = .30, lastAccent = -Infinity;
  const spent = WINDOWS.map(() => false);
  return {
    sample({ features, active = 0, delta = 1/60, playbackTime, duration } = {}) {
      const dt = clamp(delta, .1);
      if (!dt) return output;
      const enabled = clamp(active);
      const energy = clamp(features?.[0], 1.5)*enabled;
      const bass = clamp(features?.[1], 1.5)*enabled;
      const flux = clamp(features?.[4], 1.5)*enabled;
      const hit = clamp(features?.[7])*enabled;
      const timeline = Number.isFinite(playbackTime) && playbackTime >= 0 && Number.isFinite(duration) && duration > 0;
      const time = timeline ? Math.min(playbackTime,duration) : 0;
      const advance = timeline && previousTime !== null ? time-previousTime : 0;
      const seek = timeline && previousTime !== null && Math.abs(advance) > Math.max(.20,dt*4);
      if (seek) {
        baseline = energy; bassBaseline = bass; settleAge = 0; armed = false;
      }
      if (timeline) {
        previousTime = time;
        // Crossing an unused window closes it even after a forward seek.
        WINDOWS.forEach((window,index) => { if (time > duration*window[1]) spent[index] = true; });
      }
      settleAge = Math.min(.30,settleAge+dt);
      if (!initialized) { baseline = energy; bassBaseline = bass; initialized = true; }
      const rise = Math.max(0, energy-baseline), bassRise = Math.max(0, bass-bassBaseline);
      const accent = clamp(Math.max(hit, flux*.35+rise*.60, bassRise*.9));
      const blend = 1-Math.exp(-dt/.8);
      baseline += (energy-baseline)*blend;
      bassBaseline += (bass-bassBaseline)*blend;
      if (accent < .40) armed = true;
      const onset = armed && accent > .90;
      if (onset) armed = false;
      const window = timeline ? WINDOWS.findIndex(([start,end],index) => !spent[index] && time >= duration*start && time <= duration*end) : -1;
      const rested = time-lastAccent >= Math.max(DURATION+4,duration*.30);
      if (window >= 0 && !seek && advance > 0 && settleAge >= .30 && rested && onset && age >= DURATION && energy > .10) {
        age = 0;
        spent[window] = true;
        lastAccent = time;
        strength = .72+.28*accent;
        direction *= -1;
        output.angle = direction*(.10+.10*clamp(features?.[5]));
      }
      age = Math.min(DURATION,age+dt);
      output.amount = strength*ease(age/.90)*(1-ease((age-1.25)/(DURATION-1.25)));
      return output;
    },
    reset() {
      output.amount = output.angle = 0;
      age = DURATION; strength = baseline = bassBaseline = 0;
      armed = true; initialized = false; direction = 1;
      previousTime = null; settleAge = .30; lastAccent = -Infinity;
      spent.fill(false);
    }
  };
}
