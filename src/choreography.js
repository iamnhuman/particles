const clamp = (value, maximum = 1) => Math.min(maximum, Math.max(0, Number.isFinite(value) ? value : 0));
const smoothstep = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
const smootherstep = value => { const t = clamp(value); return clamp(t * t * t * (t * (t * 6 - 15) + 10)); };
const mix = (a, b, t) => a + (b - a) * t;

export const FORM_IDS = Array.from({ length: 13 }, (_, id) => id);
export const DEFAULT_SEQUENCE = [0, 1, 8, 9, 2, 10, 3, 11, 4, 12, 5, 6, 7];
const PHRASES = [9.2, 11.4, 6.4, 8.6, 12.8, 9.2, 11.4, 8.6, 12.8, 9.2, 11.4, 8.6, 12.8];
const FORMS = [0, .88, .3, 1];
const RELEASES = [1, .94, .96, .98, .91, .96, 1, .93, .98];
export const CYCLE_DURATION = PHRASES.reduce((sum, value) => sum + value, 0);
export const MORPH_DURATION = 2.2;
export const TOYOTA_MORPH_DURATION = .9;
export const TOYOTA_HOLD_DURATION = .65;
const PREVIEW_DURATION = 6.4;
const morphDurationFor = (from, to) => from === 8 || to === 8 ? TOYOTA_MORPH_DURATION : MORPH_DURATION;

export function formWeight(state, id) {
  return (state.fromStyle === id ? 1 - state.morph : 0) + (state.toStyle === id ? state.morph : 0);
}

export function createChoreographyDriver({ random = Math.random } = {}) {
  const output = { dispersion: .025, style: 0, formation: .25, fromStyle: 0, toStyle: 0, morph: 1, toyota: 0 };
  let dispersion = output.dispersion, lastTime = 0, clockOffset = 0;
  let styles = [...DEFAULT_SEQUENCE], forms = [...FORMS];
  let randomized = false, started = false, previewAge = PREVIEW_DURATION, previewStart = dispersion;
  let previewStarted = false;
  let morphAge = MORPH_DURATION, morphDuration = MORPH_DURATION, selected = 0;
  const pick = values => values[Math.min(values.length - 1, Math.floor(clamp(random()) * values.length))];
  const reorder = (values, first) => {
    const rest = values.filter(value => value !== first);
    for (let index = rest.length - 1; index > 0; index--) {
      const other = Math.min(index, Math.floor(clamp(random()) * (index + 1)));
      [rest[index], rest[other]] = [rest[other], rest[index]];
    }
    return [first, ...rest];
  };

  return {
    sample(args = {}) {
      const { time, features, active = 0, delta = 1 / 60 } = args;
      const clock = Number.isFinite(time) ? Math.max(0, time) : lastTime;
      const dt = Number.isFinite(delta) ? Math.min(.25, Math.max(0, delta)) : 1 / 60;
      if (dt > 1 / 120 + 1e-9) {
        const steps = Math.ceil(dt * 120 - 1e-9);
        for (let step = 1; step <= steps; step++) this.sample({
          time: Math.max(0, clock - dt + dt * step / steps), features, active, delta: dt / steps
        });
        return output;
      }
      lastTime = clock;
      const enabled = clamp(active), rms = clamp(features?.[0]);
      const bass = clamp(features?.[1]), mid = clamp(features?.[2]), high = clamp(features?.[3]);
      const flux = clamp(features?.[4]), hit = clamp(features?.[7]);
      const preview = previewAge < PREVIEW_DURATION;
      if (preview && previewStarted && dt > 0) {
        previewAge = Math.min(PREVIEW_DURATION, previewAge + dt);
        // A logo preview has already handed off to the next form. Resume there
        // instead of entering the logo's automatic passage a second time.
        if (previewAge === PREVIEW_DURATION) clockOffset = (styles[0] === 8
          ? PHRASES[0] + PHRASES[1] * .08 : PHRASES[0] * .08) - clock;
      }
      let position = ((clock + clockOffset) % CYCLE_DURATION + CYCLE_DURATION) % CYCLE_DURATION;
      let phrase = 0;
      while (phrase < PHRASES.length - 1 && position >= PHRASES[phrase]) position -= PHRASES[phrase++];
      const phase = position / PHRASES[phrase], next = (phrase + 1) % styles.length;
      let requested;
      if (preview) {
        requested = styles[0] === 8 && previewAge >= TOYOTA_MORPH_DURATION + TOYOTA_HOLD_DURATION ? styles[1] : styles[0];
      } else if (styles[phrase] === 8) {
        // Keep the original release rhythm, but give the logo only a brief
        // cameo near the opening peak. Its neighbours use the remaining time.
        const enter = PHRASES[phrase] * .45 - TOYOTA_MORPH_DURATION;
        requested = position < enter ? styles[(phrase + styles.length - 1) % styles.length]
          : position < enter + TOYOTA_MORPH_DURATION + TOYOTA_HOLD_DURATION ? 8 : styles[next];
      } else {
        requested = phase >= .76 && styles[next] !== 8 ? styles[next] : styles[phrase];
      }
      if (!started && dt > 0) {
        if (!randomized) selected = styles[phrase] === 8 ? requested : styles[phrase];
        output.fromStyle = output.toStyle = selected;
        started = true;
      }
      // Morph directly between two selected targets. A new click queues the
      // latest request until the current morph ends, preserving the visible pose.
      if (morphAge >= morphDuration && requested !== selected && dt > 0) {
        output.fromStyle = selected;
        output.toStyle = requested;
        morphDuration = morphDurationFor(selected, requested);
        morphAge = 0;
      }
      if (preview && output.toStyle === styles[0] && dt > 0) previewStarted = true;
      if (morphAge < morphDuration) {
        morphAge = Math.min(morphDuration, morphAge + dt);
        output.morph = smootherstep(morphAge / morphDuration);
        if (morphAge === morphDuration) {
          selected = output.toStyle;
          output.fromStyle = output.toStyle = selected;
          output.morph = 1;
        }
      }
      output.style = mix(output.fromStyle, output.toStyle, output.morph);
      output.toyota = formWeight(output, 8);

      const release = smoothstep(.25, .45, phase) * (1 - smoothstep(.63, .88, phase)) * RELEASES[phrase % RELEASES.length];
      const quiet = .025 + .012 * Math.sin(clock * .31) ** 2;
      const audible = smoothstep(.012, .11, rms) * enabled;
      const energy = rms * .46 + bass * .24 + mid * .18 + high * .12;
      const drive = .72 + Math.sqrt(energy) * .2 + Math.sqrt(flux * .6 + hit * .4) * .08;
      let targetDispersion = mix(quiet, .022 + release * drive, audible);
      if (preview) {
        const age = previewAge / PREVIEW_DURATION;
        targetDispersion = mix(quiet, mix(previewStart, .8, smoothstep(0, .32, age)), 1 - smoothstep(.66, 1, age));
      }
      dispersion += (targetDispersion - dispersion) * (1 - Math.exp(-dt / (targetDispersion > dispersion ? .38 : .62)));
      const manualRecall = randomized && dispersion > .12;
      output.dispersion = clamp(dispersion, preview || manualRecall ? 1 : .12 + enabled * .88);
      const formTransition = smoothstep(.5, .9, phase);
      const idleFormation = randomized ? clamp(forms[0] + .035 * Math.sin(clock * .065) ** 2) : .25 + .1 * Math.sin(clock * .065) ** 2;
      const musicFormation = clamp(mix(forms[phrase % forms.length], forms[next % forms.length], formTransition) + (mid - high) * .06 * release * audible);
      const targetFormation = preview ? forms[0] : mix(idleFormation, musicFormation, audible);
      output.formation += (targetFormation - output.formation) * (1 - Math.exp(-dt / .9));
      return output;
    },
    randomize() {
      const nextStyle = pick(FORM_IDS.filter(value => value !== output.fromStyle && value !== output.toStyle));
      const nextForm = pick(FORMS.filter(value => Math.abs(value - output.formation) >= .45));
      styles = reorder(FORM_IDS, nextStyle);
      forms = reorder(FORMS, nextForm);
      randomized = true;
      previewStart = output.dispersion;
      previewAge = 0;
      previewStarted = false;
    },
    reset() {
      Object.assign(output, { dispersion: .025, style: 0, formation: .25, fromStyle: 0, toStyle: 0, morph: 1, toyota: 0 });
      dispersion = .025; lastTime = 0; clockOffset = 0;
      styles = [...DEFAULT_SEQUENCE]; forms = [...FORMS];
      randomized = false; started = false; previewAge = PREVIEW_DURATION; previewStart = .025;
      previewStarted = false;
      morphAge = morphDuration = MORPH_DURATION; selected = 0;
    }
  };
}
