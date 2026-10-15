const clamp = (value, max = 1.5) => Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0));

// The worker already normalizes to this track. Keep its relative dynamics,
// then emphasize actual rises instead of introducing a synthetic beat clock.
export function createResponseDriver() {
  const output = new Float32Array(8);
  const previous = new Float32Array(8);
  const baseline = new Float32Array(8);
  let initialized = false;

  return {
    sample(features, delta, active) {
      const dt = Math.min(.1, Math.max(1 / 240, Number.isFinite(delta) ? delta : 1 / 60));
      const enabled = clamp(active, 1);
      const baselineBlend = 1 - Math.exp(-dt / .32);
      let energyRise = 0, bassRise = 0, fluxLift = 0;
      const audible = enabled > 0 && clamp(features?.[0]) > .0001;

      for (let i = 0; i < 8; i++) {
        const raw = audible ? clamp(features?.[i], i >= 5 ? 1 : 1.5) : 0;
        const rise = initialized && audible ? Math.max(0, raw - previous[i]) / dt : 0;
        const contrast = Math.max(0, raw - baseline[i]);
        let target = raw;

        if (i < 4) target = clamp(raw * 1.12 + contrast * .5 + rise * .028);
        if (i === 4) target = clamp(raw * .85 + contrast * .65 + rise * .02);
        if (i === 0) energyRise = rise;
        if (i === 1) bassRise = rise;
        if (i === 4) fluxLift = contrast;
        if (i === 7) {
          target = clamp(Math.max(raw, energyRise * .045, bassRise * .035, fluxLift * .95), 1);
        }

        target *= enabled;
        // Impacts arrive within a frame; the short release leaves space for
        // the next grain. Centroid and flatness retain their spectral roles.
        const release = i === 7 ? .095 : i >= 5 ? .06 : .085;
        const blend = 1 - Math.exp(-dt / (target > output[i] ? .012 : release));
        output[i] += (target - output[i]) * blend;
        if (output[i] < .00001) output[i] = 0;
        previous[i] = raw;
        baseline[i] += (raw - baseline[i]) * baselineBlend;
      }

      initialized = audible;
      return output;
    },
    reset() {
      output.fill(0);
      previous.fill(0);
      baseline.fill(0);
      initialized = false;
    },
  };
}
