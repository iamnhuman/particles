export class TrackEngine extends EventTarget {
  constructor() {
    super();
    this.context = null;
    this.buffer = null;
    this.source = null;
    this.analysis = null;
    this.offset = 0;
    this.startedAt = 0;
    this.playing = false;
    this.volume = 0.8;
    this.muted = false;
    this.features = new Float32Array(8);
    this.spectrum = new Uint8Array(64);
    this.loading = null;
  }
  async prepare() {
    if (this.loading) return this.loading;
    this.loading = this.load();
    try { return await this.loading; } catch (error) { this.loading = null; throw error; }
  }
  async load() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('This browser does not support Web Audio. Try a current browser.');
    this.context ||= new AudioContextClass({ latencyHint: 'interactive' });
    if (!this.gain) { this.gain = this.context.createGain(); this.gain.gain.value = this.volume; this.gain.connect(this.context.destination); }
    const response = await fetch(`${import.meta.env.BASE_URL}audio/track.mp3`);
    if (!response.ok) throw new Error('The track could not be loaded. Press Play to retry.');
    this.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    const mono = new Float32Array(this.buffer.length);
    for (let c = 0; c < this.buffer.numberOfChannels; c++) {
      const channel = this.buffer.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / this.buffer.numberOfChannels;
    }
    const worker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
    try {
      this.analysis = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio analysis took too long. Press Play to retry.')), 45000);
        worker.onmessage = ({ data }) => {
          if (data.type === 'complete') { clearTimeout(timeout); resolve(data); }
          else if (data.type === 'error') { clearTimeout(timeout); reject(new Error(data.message)); }
          else this.dispatchEvent(new CustomEvent('progress', { detail: data.progress }));
        };
        worker.onerror = (error) => { clearTimeout(timeout); reject(new Error(error.message || 'Audio analysis failed.')); };
        worker.postMessage({ samples: mono, sampleRate: this.buffer.sampleRate }, [mono.buffer]);
      });
    } finally { worker.terminate(); }
    this.dispatchEvent(new Event('ready'));
    return this;
  }
  get duration() { return this.buffer?.duration || 0; }
  position(audible = false) {
    if (!this.playing) return this.offset;
    let clock = this.context.currentTime;
    if (audible && this.context.getOutputTimestamp) {
      const timestamp = this.context.getOutputTimestamp();
      if (timestamp.contextTime > 0 && timestamp.performanceTime > 0)
        clock = Math.min(clock, timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000);
    }
    return Math.max(0, Math.min(this.duration, this.offset + clock - this.startedAt));
  }
  async play() {
    // Resume in the actual user gesture, even while the worker is still preparing.
    const ready = this.prepare();
    await this.context?.resume();
    await ready;
    if (this.playing) return;
    if (this.offset >= this.duration - 0.02) this.offset = 0;
    this.startSource();
  }
  startSource() {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.gain);
    this.startedAt = this.context.currentTime;
    this.playing = true;
    const activeSource = this.source;
    this.source.onended = () => {
      if (this.playing && this.source === activeSource) {
        this.offset = this.duration;
        this.playing = false;
        this.source = null;
        activeSource.disconnect();
        this.dispatchEvent(new Event('ended'));
      }
    };
    this.source.start(this.startedAt, this.offset);
    this.dispatchEvent(new Event('play'));
  }
  stopSource() {
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = null; }
  }
  pause() {
    if (!this.playing) return;
    this.offset = this.position();
    this.playing = false;
    this.stopSource();
    this.dispatchEvent(new Event('pause'));
  }
  seek(time) {
    const wasPlaying = this.playing;
    this.stopSource();
    this.playing = false;
    this.offset = Math.max(0, Math.min(this.duration, time));
    if (wasPlaying && this.offset < this.duration) this.startSource();
    else this.dispatchEvent(new Event('seek'));
  }
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateGain();
  }
  updateGain() {
    if (this.gain) this.gain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.025);
  }
  sample() {
    if (!this.analysis) return { features: this.features, spectrum: this.spectrum, time: 0 };
    const { frames, spectra, count, sampleRate, hopSize, stride, bands } = this.analysis;
    const time = this.position(true);
    const cursor = Math.min(count - 1, time * sampleRate / hopSize);
    const a = Math.floor(cursor), b = Math.min(count - 1, a + 1), t = cursor - a;
    for (let i = 0; i < stride; i++) this.features[i] = frames[a * stride + i] * (1 - t) + frames[b * stride + i] * t;
    for (let i = 0; i < bands; i++) this.spectrum[i] = Math.round(255 * (spectra[a * bands + i] * (1 - t) + spectra[b * bands + i] * t));
    return { features: this.features, spectrum: this.spectrum, time };
  }
  destroy() { this.pause(); this.context?.close(); }
}
