const clamp = (value, maximum = 1) => Math.min(maximum, Math.max(0, Number.isFinite(value) ? value : 0));
const smoothstep = (start, end, value) => {
  const x = clamp((value - start) / (end - start));
  return x * x * (3 - 2 * x);
};
const mix = (from, to, amount) => from + (to - from) * amount;

// These are long visual phrases, not a beat/BPM estimate. Unequal durations
// give the sculpture time to hold, open, drift, and find another silhouette.
const PHRASES = [9.2, 11.4, 8.6, 12.8];
const FORMS = [0, .88, .3, 1];
const RELEASES = [1, .94, .98, .91];
const PERIOD = PHRASES.reduce((sum, duration) => sum + duration, 0);
const REVEAL_DURATION = 4.8;

export function createChoreographyDriver({ random = Math.random } = {}) {
  const output = { dispersion: .025, style: 0, formation: .25 };
  let dispersion = output.dispersion;
  let lastTime = 0;
  let clockOffset = 0;
  let styles = [0, 1, 2, 3];
  let forms = [...FORMS];
  let randomized = false;
  let revealAge = REVEAL_DURATION;
  let revealStart = dispersion;
  const pick = (values) => values[Math.min(values.length - 1, Math.floor(clamp(random()) * values.length))];
  const reorder = (values, first) => {
    const remaining = values.filter((value) => value !== first);
    for (let index = remaining.length - 1; index > 0; index--) {
      const swap = Math.min(index, Math.floor(clamp(random()) * (index + 1)));
      [remaining[index], remaining[swap]] = [remaining[swap], remaining[index]];
    }
    return [first, ...remaining];
  };

  return {
    sample({ time, features, active = 0, delta = 1 / 60 } = {}) {
      const clock = Number.isFinite(time) ? Math.max(0, time) : lastTime;
      lastTime = clock;
      const dt = Number.isFinite(delta) ? Math.min(.25, Math.max(0, delta)) : 1 / 60;
      const enabled = clamp(active);
      const rms = clamp(features?.[0]);
      const bass = clamp(features?.[1]);
      const mid = clamp(features?.[2]);
      const high = clamp(features?.[3]);
      const flux = clamp(features?.[4]);
      const centroid = clamp(features?.[5]);
      const flatness = clamp(features?.[6]);
      const hit = clamp(features?.[7]);

      const revealing = revealAge < REVEAL_DURATION;
      if (revealing) {
        revealAge = Math.min(REVEAL_DURATION, revealAge + dt);
        // Start a fresh held phrase after the preview. Only the visual phrase
        // is offset: the caller's clock and the audio transport keep running.
        if (revealAge === REVEAL_DURATION) clockOffset = PHRASES[0] * .08 - clock;
      }
      let position = ((clock + clockOffset) % PERIOD + PERIOD) % PERIOD;
      let phrase = 0;
      while (phrase < PHRASES.length - 1 && position >= PHRASES[phrase]) {
        position -= PHRASES[phrase++];
      }
      const phase = position / PHRASES[phrase];
      const next = (phrase + 1) % PHRASES.length;
      const opening = smoothstep(.25, .45, phase);
      const recall = 1 - smoothstep(.63, .88, phase);
      const release = opening * recall * RELEASES[phrase];
      const quiet = .025 + .012 * Math.sin(clock * .31) ** 2;

      // Real spectral energy sculpts the release; transients cannot destroy a
      // held form. Silence also recalls the sculpture while the clock runs.
      const audible = smoothstep(.012, .11, rms) * enabled;
      const energy = rms * .46 + bass * .24 + mid * .18 + high * .12;
      const drive = .72 + Math.sqrt(energy) * .2 + Math.sqrt(flux * .6 + hit * .4) * .08;
      let targetDispersion = mix(quiet, .022 + release * drive, audible);
      if (revealing) {
        const preview = revealAge / REVEAL_DURATION;
        const opening = smoothstep(0, .32, preview);
        const recall = 1 - smoothstep(.55, .92, preview);
        targetDispersion = mix(quiet, mix(revealStart, .8, opening), recall);
      }
      const dispersionBlend = 1 - Math.exp(-dt / (targetDispersion > dispersion ? .38 : .62));
      dispersion += (targetDispersion - dispersion) * dispersionBlend;
      // The transport fades active before it reaches zero. A manual preview
      // may briefly release an idle sculpture, then ease through its recall.
      const previewRecalling = randomized && dispersion > .12;
      output.dispersion = clamp(dispersion, revealing || previewRecalling ? 1 : .12 + enabled * .88);

      // Change the escape field during a flowing release, then let the new
      // shape settle through the recall. Spectral detail adds small variation
      // without flickering between four entirely different trajectories.
      const styleTransition = smoothstep(.58, .94, phase);
      const spectralStyle = ((centroid - .45) * .1 + (flatness - .3) * .08 + (high - bass) * .04) * release * audible;
      const targetStyle = revealing ? styles[0] : clamp(mix(styles[phrase], styles[next], styleTransition) + spectralStyle, 3);
      output.style += (targetStyle - output.style) * (1 - Math.exp(-dt / .85));
      const formTransition = smoothstep(.5, .84, phase);
      const idleFormation = randomized ? clamp(forms[0] + .035 * Math.sin(clock * .065) ** 2) : .25 + .1 * Math.sin(clock * .065) ** 2;
      const musicFormation = clamp(mix(forms[phrase], forms[next], formTransition) + (mid - high) * .06 * release * audible);
      const targetFormation = revealing ? forms[0] : mix(idleFormation, musicFormation, audible);
      output.formation += (targetFormation - output.formation) * (1 - Math.exp(-dt / .9));

      return output;
    },
    randomize() {
      // Pick away from the visible pose, so even repeated clicks produce a
      // meaningful change. Subsequent music phrases still visit every field.
      const nextStyle = pick([0, 1, 2, 3].filter((value) => Math.abs(value - output.style) >= .8));
      const nextForm = pick(FORMS.filter((value) => Math.abs(value - output.formation) >= .45));
      styles = reorder([0, 1, 2, 3], nextStyle);
      forms = reorder(FORMS, nextForm);
      randomized = true;
      revealStart = output.dispersion;
      revealAge = 0;
    },
    reset() {
      output.dispersion = dispersion = .025;
      output.style = 0;
      output.formation = .25;
      lastTime = 0;
      clockOffset = 0;
      styles = [0, 1, 2, 3];
      forms = [...FORMS];
      randomized = false;
      revealAge = REVEAL_DURATION;
      revealStart = dispersion;
    },
  };
}
