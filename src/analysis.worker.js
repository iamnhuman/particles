import Meyda from 'meyda';

const FRAME_SIZE = 1024;
const HOP_SIZE = 256;
const BANDS = 64;
const STRIDE = 8;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const percentile = (values, p = 0.95) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)] || 1;
};

self.onmessage = ({ data }) => {
  try {
    const { samples, sampleRate } = data;
    Meyda.bufferSize = FRAME_SIZE;
    Meyda.sampleRate = sampleRate;
    Meyda.windowingFunction = 'hanning';
    const count = Math.ceil(samples.length / HOP_SIZE);
    const frames = new Float32Array(count * STRIDE);
    const spectra = new Float32Array(count * BANDS);
    const window = new Float32Array(FRAME_SIZE);
    let previous = new Float32Array(FRAME_SIZE / 2);
    const binHz = sampleRate / FRAME_SIZE;
    const bandBins = Array.from({ length: BANDS + 1 }, (_, i) =>
      clamp(Math.round((30 * Math.pow(16000 / 30, i / BANDS)) / binHz), 1, FRAME_SIZE / 2 - 1));
    for (let f = 0; f < count; f++) {
      // Center each Hann window on its audio timestamp, rather than delaying it by half a window.
      window.fill(0);
      const start = f * HOP_SIZE - FRAME_SIZE / 2;
      for (let j = 0; j < FRAME_SIZE; j++) window[j] = samples[start + j] || 0;
      const feature = Meyda.extract(['rms', 'amplitudeSpectrum', 'spectralCentroid', 'spectralFlatness'], window);
      const spectrum = feature.amplitudeSpectrum;
      let bass = 0, mid = 0, high = 0, flux = 0;
      let bassCount = 0, midCount = 0, highCount = 0;
      for (let k = 1; k < spectrum.length; k++) {
        const hz = k * binHz;
        const energy = spectrum[k] ** 2;
        if (hz < 220) { bass += energy; bassCount++; }
        else if (hz < 2400) { mid += energy; midCount++; }
        else if (hz < 14000) { high += energy; highCount++; }
        flux += Math.max(0, Math.log1p(spectrum[k] * 8) - Math.log1p(previous[k] * 8));
      }
      const offset = f * STRIDE;
      frames[offset] = feature.rms;
      frames[offset + 1] = Math.sqrt(bass / bassCount);
      frames[offset + 2] = Math.sqrt(mid / midCount);
      frames[offset + 3] = Math.sqrt(high / highCount);
      frames[offset + 4] = flux;
      frames[offset + 5] = clamp(feature.spectralCentroid * binHz / 9000);
      frames[offset + 6] = clamp(feature.spectralFlatness || 0);
      for (let b = 0; b < BANDS; b++) {
        let sum = 0;
        const from = bandBins[b], to = Math.max(from + 1, bandBins[b + 1]);
        for (let k = from; k < to; k++) sum += spectrum[k] || 0;
        spectra[f * BANDS + b] = Math.log1p(sum / (to - from) * 12);
      }
      previous = spectrum;
      if (f % 500 === 0) self.postMessage({ type: 'progress', progress: f / count });
    }
    // Normalize using the track itself. Quiet passages keep their relative dynamics.
    const scales = Array.from({ length: 5 }, (_, i) => percentile(Array.from({ length: count }, (_, f) => frames[f * STRIDE + i])));
    const spectralScale = percentile(spectra, 0.98);
    const onsets = [];
    let lastOnset = -1;
    for (let f = 0; f < count; f++) {
      const offset = f * STRIDE;
      for (let i = 0; i < 5; i++) frames[offset + i] = clamp(frames[offset + i] / scales[i], 0, 1.5);
      let mean = 0;
      const from = Math.max(0, f - 32), to = Math.min(count, f + 33);
      for (let j = from; j < to; j++) mean += frames[j * STRIDE + 4] * (j > f ? 1 / scales[4] : 1);
      mean /= to - from;
      const flux = frames[offset + 4];
      const time = f * HOP_SIZE / sampleRate;
      if (flux > Math.max(0.3, mean * 1.55) && time - lastOnset > 0.095 && frames[offset] > 0.1) {
        lastOnset = time;
        onsets.push(time);
      }
      frames[offset + 7] = lastOnset >= 0 ? Math.exp(-(time - lastOnset) * 23) : 0;
    }
    for (let i = 0; i < spectra.length; i++) spectra[i] = clamp(spectra[i] / spectralScale);
    const waveform = new Float32Array(420);
    const step = samples.length / waveform.length;
    for (let i = 0; i < waveform.length; i++) {
      let sum = 0, n = 0;
      for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j += 8) { sum += samples[j] ** 2; n++; }
      waveform[i] = Math.sqrt(sum / n);
    }
    const waveMax = Math.max(...waveform) || 1;
    for (let i = 0; i < waveform.length; i++) waveform[i] = Math.pow(waveform[i] / waveMax, 0.7);
    self.postMessage({ type: 'complete', frames, spectra, waveform, onsets, count, hopSize: HOP_SIZE, frameSize: FRAME_SIZE, stride: STRIDE, bands: BANDS, sampleRate }, [frames.buffer, spectra.buffer, waveform.buffer]);
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
