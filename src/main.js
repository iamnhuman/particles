import './style.css';
import gsap from 'gsap';
import { TrackEngine } from './audio.js';
import { createResponseDriver } from './response.js';
import { createZoomController } from './zoom.js';

const $ = (id) => document.getElementById(id);
const audio = new TrackEngine();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = true;
let scene = null;
let scenePromise = null;
let loadingPlayback = false;
let hasPlayed = false;
let visualTime = 8;
let audioPhase = 8;
let previousUI = 0;
let noticeTimer;
let lastParticleCount = -1;
const state = { active: 0 };
const response = createResponseDriver();
const zoom = createZoomController({ element: $('experience'), onChange(value) {
  document.querySelector('.orbital-svg').style.transform = `scale(${value})`;
  document.querySelector('.fallback-art').style.transform = `scale(${value})`;
} });
const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

function showNotice(message) {
  $('notice').textContent = message;
  $('notice').classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 6000);
}

function updateMotion() {
  document.documentElement.classList.toggle('still', !motion);
  $('motion').setAttribute('aria-pressed', String(motion));
  $('motion-label').textContent = motion ? 'Motion on' : 'Motion off';
  if (motion) initScene();
  updateParticleCount();
  $('randomize').disabled = !motion || !scene;
}

function updateParticleCount() {
  const count = motion && scene ? scene.particleCount + scene.dust.geometry.getAttribute('position').count : 0;
  if (count === lastParticleCount) return;
  $('particle-count').textContent = new Intl.NumberFormat('en-US').format(count);
  lastParticleCount = count;
}

async function initScene() {
  if (scene || scenePromise) return scenePromise;
  scenePromise = import('./scene.js').then(({ GrainScene }) => {
    try {
      scene = new GrainScene($('scene'));
      updateParticleCount();
      $('randomize').disabled = !motion;
      document.documentElement.classList.remove('no-webgl');
    } catch (error) {
      document.documentElement.classList.add('no-webgl');
      console.warn('GRAIN: WebGL unavailable; using SVG artwork.', error.message);
    }
  }).catch(() => {
    document.documentElement.classList.add('no-webgl');
  });
  return scenePromise;
}

function setPlaybackUI() {
  const playing = audio.playing;
  const ended = audio.duration && audio.offset >= audio.duration - .02;
  const action = playing ? 'Pause' : ended ? 'Replay' : 'Play';
  document.documentElement.classList.toggle('playing', playing);
  $('play-label').textContent = `${action} experience`;
  $('play').setAttribute('aria-label', `${action} experience`);
  $('transport-play').setAttribute('aria-label', `${action} track`);
  const path = playing ? 'M7 5h3v14H7ZM14 5h3v14h-3Z' : 'm9 5 10 7-10 7Z';
  $('play-symbol').setAttribute('d', path);
  $('transport-symbol').setAttribute('d', path);
  $('transport-status').textContent = playing ? 'The sound is taking shape' : ended ? 'A moment, to play again' : hasPlayed ? 'Holding this moment' : 'Ready when you are';
  $('play-hint').textContent = playing ? 'Stay a little. Listen closely.' : 'Headphones recommended';
  gsap.to(state, { active: playing ? 1 : 0, duration: playing ? .12 : .7, overwrite: true });
}

async function togglePlayback() {
  if (loadingPlayback) return;
  if (audio.playing) { audio.pause(); return; }
  loadingPlayback = true;
  $('play-label').textContent = audio.analysis ? 'Entering the sound…' : 'Finding the frequencies…';
  $('play').setAttribute('aria-busy', 'true');
  try {
    await audio.play();
    hasPlayed = true;
    setPlaybackUI();
  } catch (error) {
    $('play-label').textContent = 'Try playing again';
    $('play-hint').textContent = 'The sound needs another moment';
    showNotice(error.message);
  } finally { loadingPlayback = false; $('play').removeAttribute('aria-busy'); }
}

function drawWaveform(waveform) {
  let path = '';
  waveform.forEach((value, index) => {
    const x = index / (waveform.length - 1) * 1000;
    const half = 1 + value * 15;
    path += `M${x.toFixed(2)},${(20-half).toFixed(2)}V${(20+half).toFixed(2)}`;
  });
  $('waveform-base').setAttribute('d', path);
  $('waveform-played').setAttribute('d', path);
}
// The resting transport has a quiet placeholder; it is replaced with the actual track envelope.
drawWaveform(Float32Array.from({ length: 420 }, () => .04));

audio.addEventListener('ready', () => {
  drawWaveform(audio.analysis.waveform);
  $('duration').textContent = formatTime(audio.duration);
  $('seek').max = String(audio.duration);
  $('play-hint').textContent = 'Headphones recommended';
});
audio.addEventListener('progress', (e) => {
  if (!audio.analysis) $('play-hint').textContent = `Listening to the details · ${Math.floor(e.detail * 100)}%`;
});
for (const event of ['play', 'pause', 'ended', 'seek']) audio.addEventListener(event, setPlaybackUI);
audio.addEventListener('play', () => {
  const position = audio.position(true);
  audioPhase = visualTime-position;
  if (position < .1) scene?.spatialMotion.reset();
  response.reset();
});
$('play').addEventListener('click', togglePlayback);
$('transport-play').addEventListener('click', togglePlayback);
$('seek').addEventListener('input', (e) => {
  if (!audio.buffer) return;
  seekTrack(Number(e.target.value));
});
function seekTrack(time) { response.reset(); audio.seek(time); updateTransport(audio.position()); }
$('volume').addEventListener('input', (e) => { audio.muted = false; audio.setVolume(Number(e.target.value)); updateMuteUI(); });
function updateMuteUI() {
  const muted = audio.muted || audio.volume === 0;
  const volume = $('volume');
  volume.style.setProperty('--volume-level', `${audio.volume * 100}%`);
  volume.setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)}%`);
  volume.parentElement.dataset.muted = String(muted);
  $('mute').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  $('mute').setAttribute('aria-pressed', String(muted));
  $('sound-waves').setAttribute('d', muted ? 'm15 9 6 6m-6 0 6-6' : 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14');
}
$('mute').addEventListener('click', () => { audio.muted = !audio.muted; audio.updateGain(); updateMuteUI(); });
updateMuteUI();
$('motion').addEventListener('click', () => { motion = !motion; updateMotion(); });
$('randomize').addEventListener('click', () => {
  if (!scene || !motion) return;
  scene.randomize();
  if (!reducedMotion.matches) gsap.fromTo($('randomize').querySelector('svg'), { rotation: -180 }, { rotation: 0, duration: .65, ease: 'power3.out', overwrite: true });
});
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else showNotice('Fullscreen is not available in this browser.');
  } catch { showNotice('Fullscreen is not available here. The experience still fills your window.'); }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
});
const dialog = $('about');
$('about-open').addEventListener('click', () => dialog.showModal());
$('about-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close(); } });
dialog.addEventListener('close', () => $('about-open').focus());
document.addEventListener('keydown', (e) => {
  if (dialog.open || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlayback(); }
  if (e.code === 'ArrowRight' && audio.buffer) { e.preventDefault(); seekTrack(audio.position() + 5); }
  if (e.code === 'ArrowLeft' && audio.buffer) { e.preventDefault(); seekTrack(audio.position() - 5); }
  if (e.code === 'KeyM') { audio.muted = !audio.muted; audio.updateGain(); updateMuteUI(); }
});

function updateTransport(time) {
  const fraction = audio.duration ? Math.max(0, Math.min(1, time / audio.duration)) : 0;
  const progress = fraction * 1000;
  $('play-progress').setAttribute('stroke-dashoffset', String((1 - fraction) * 100));
  $('play-progress').setAttribute('visibility', fraction > 0 ? 'visible' : 'hidden');
  $('current-time').textContent = formatTime(time);
  if (document.activeElement !== $('seek')) $('seek').value = String(time);
  $('seek').setAttribute('aria-valuetext', `${Math.floor(time)} of ${Math.round(audio.duration || 38)} seconds`);
  $('progress-clip').setAttribute('width', String(progress));
  $('playhead').setAttribute('x1', String(progress));
  $('playhead').setAttribute('x2', String(progress));
}

const orbitPaths = [...document.querySelectorAll('.orbit-trace')];
function updateSVG(spectrum, features, time) {
  let wave = 'M0 8';
  for (let i = 1; i <= 60; i++) {
    const signal = spectrum[Math.floor(i / 61 * 64)] / 255;
    const y = 8 + Math.sin(i * .65 + time * 2) * signal * state.active * 6;
    wave += ` L${i * 5} ${y.toFixed(2)}`;
  }
  $('title-wave').setAttribute('d', wave);
  orbitPaths.forEach((path, ring) => {
    let d = '';
    for (let i = 0; i <= 128; i++) {
      const theta = i / 128 * Math.PI * 2;
      const amplitude = spectrum[Math.floor(i / 129 * 64)] / 255;
      const r = 360 + ring * 29 + amplitude * state.active * (12 + ring * 5);
      d += `${i ? 'L' : 'M'}${(500+Math.cos(theta)*r).toFixed(2)} ${(500+Math.sin(theta)*r*.82).toFixed(2)}`;
    }
    path.setAttribute('d', `${d}Z`);
  });
  $('orbit-group').setAttribute('transform', `rotate(${time * 1.5} 500 500)`);
}

function tick(_time, deltaMs) {
  if (document.hidden) return;
  const delta = Math.min(deltaMs / 1000, .05);
  const frame = audio.sample();
  const reactive = response.sample(frame.features, delta, audio.playing ? 1 : 0);
  const zoomValue = zoom.update(delta);
  if (audio.playing) visualTime = audioPhase + frame.time;
  else if (motion) visualTime += delta;
  if (scene && motion) scene.render({ ...frame, playbackTime: frame.time, duration: audio.duration, features: reactive, time: visualTime, active: state.active, delta, zoom: zoomValue });
  if (performance.now() - previousUI > 32) {
    updateTransport(frame.time);
    updateParticleCount();
    $('energy-readout').textContent = (reactive[0] * state.active).toFixed(3);
    if (motion) updateSVG(frame.spectrum, reactive, visualTime);
    previousUI = performance.now();
  }
}
gsap.ticker.add(tick);
updateMotion();
updateSVG(new Uint8Array(64), new Float32Array(8), 8);
if (motion && !reducedMotion.matches) {
  gsap.from('.header', { opacity: 0, y: -10, duration: .9, ease: 'power3.out' });
  gsap.from('.eyebrow, h1, .hero-description, .play-button', { opacity: 0, y: 22, duration: 1.15, stagger: .09, ease: 'power3.out', delay: .12 });
  gsap.from('.transport, .art-note', { opacity: 0, duration: 1.2, delay: .55 });
}
audio.prepare().catch((error) => { $('play-hint').textContent = 'Press Play to load the sound'; showNotice(error.message); });

// Read-only diagnostics for local QA: timeline, analysis and renderer, without extra production UI.
Object.defineProperty(window, '__grain', { value: { get audio() { return audio; }, get scene() { return scene; }, get motion() { return motion; }, get zoom() { return zoom; } }, configurable: true });
window.addEventListener('pagehide', () => { gsap.ticker.remove(tick); zoom.destroy(); audio.destroy(); scene?.destroy(); }, { once: true });
window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
