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

export function createChoreographyDriver() {
  const output = { dispersion: .025, style: 0, formation: .25 };
  let dispersion = output.dispersion;
  let lastTime = 0;

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

      let position = clock % PERIOD;
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
      const targetDispersion = mix(quiet, .022 + release * drive, audible);
      const dispersionBlend = 1 - Math.exp(-dt / (targetDispersion > dispersion ? .38 : .62));
      dispersion += (targetDispersion - dispersion) * dispersionBlend;
      // The transport fades active before it reaches zero. This final bound
      // also keeps a directly paused/idle caller in a coherent sculpture.
      output.dispersion = clamp(dispersion, .12 + enabled * .88);

      // Change the escape field during a flowing release, then let the new
      // shape settle through the recall. Spectral detail adds small variation
      // without flickering between four entirely different trajectories.
      const styleTransition = smoothstep(.58, .94, phase);
      const spectralStyle = ((centroid - .45) * .1 + (flatness - .3) * .08 + (high - bass) * .04) * release * audible;
      const targetStyle = clamp(mix(phrase, next, styleTransition) + spectralStyle, 3);
      output.style += (targetStyle - output.style) * (1 - Math.exp(-dt / .85));
      const formTransition = smoothstep(.5, .84, phase);
      const idleFormation = .25 + .1 * Math.sin(clock * .065) ** 2;
      const musicFormation = clamp(mix(FORMS[phrase], FORMS[next], formTransition) + (mid - high) * .06 * release * audible);
      const targetFormation = mix(idleFormation, musicFormation, audible);
      output.formation += (targetFormation - output.formation) * (1 - Math.exp(-dt / .9));

      return output;
    },
    reset() {
      output.dispersion = dispersion = .025;
      output.style = 0;
      output.formation = .25;
      lastTime = 0;
    },
  };
}
