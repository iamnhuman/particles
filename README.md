# GRAIN

Live site: [iamnhuman.github.io/particles](https://iamnhuman.github.io/particles/).

An immersive single-screen music visualizer built around the MP3 supplied in this project.

## Run

```sh
npm install
npm run dev
```

Open the printed development URL with `/particles/` (normally `http://localhost:5173/particles/`).

Production build and preview:

```sh
npm run build
npm run preview
```

Preview normally serves at `http://localhost:4173/particles/`.

## GitHub Pages

The Vite base path is `/particles/`; the home link, audio, fonts, favicon, worker and bundled assets all stay under this path. Source lives on `main`. The `gh-pages` branch contains the ready-to-serve `index.html` and assets from `dist`, with no additional build required on GitHub. GitHub Pages publishes the root of `gh-pages`. After source changes, run `npm run build` and publish the resulting `dist` contents to that branch. Dependencies and local QA screenshots are excluded from Git; the deployable audio is `public/audio/track.mp3`.

The particle animation starts immediately; press **Play experience** to enable audio. Audio never autoplays. Space plays/pauses, left/right arrows seek by five seconds, M mutes. The waveform is seekable. Fullscreen, volume and a motion toggle are included.

The description shows the actual number of particles processed by the current scene, including the ambient layer: 116,400 on initial desktop loads and 40,364 on initial mobile loads. Motion off shows 0 active particles. Filament line vertices are excluded.

At the user's request, scene motion starts enabled even when the system prefers reduced motion. Select **Motion off** for static SVG artwork with working audio, playback and seeking. Interface transitions still follow the system preference.

Scene zoom smoothly ranges from 60% to 240%. Use the visible minus / percentage reset / plus controls, the mouse wheel, two-finger pinch, or the **− / + / 0** keys.

## Audio synchronization

- Meyda analyzes overlapping 1,024-sample Hann windows with 256-sample hops in a module worker.
- The provided 44.1 kHz track produces approximately 6,550 windows, 5.8 ms apart. The actual decoded sample rate is used, including browsers that resample audio.
- Each window contains RMS, low/mid/high energy, positive log spectral flux, centroid, flatness and an adaptive onset envelope, plus 64 log-spaced spectral bands.
- Windows are centered on the timeline and normalized against track percentiles; quiet passages retain their dynamics.
- The untouched decoded stereo track is played with AudioBufferSourceNode. Positions use AudioContext.currentTime and getOutputTimestamp where supported; seeking and pausing retain the correct offsets.
- Rendering reads the analyzed frame at the audible playback position. A fast-attack, short-release response driver emphasizes real changes in energy, frequency bands and flux, without a guessed BPM. Idle animation advances before playback and while paused; sound-driven features decay to zero.

Here “grains” means overlapping windows of the waveform. An MP3 does not contain separately recoverable notes or instruments; this performs detailed signal analysis, not stem separation or granular resynthesis.

## Graphics

Three.js renders 102,400 simulated particles on desktop, with 14,000 ambient particles and 22 fine filament paths. Initial mobile loads use 36,864 simulated and 3,500 ambient particles. GPGPU position textures use ping-pong render targets, a divergence-free analytic curl field, spectral displacement and sound-driven morphing from a torus into a trefoil structure. Global pressure, flow and radial deformation make the whole cloud respond to the track, with faster motion between passages and before playback. Custom point sprites, bloom, tone mapping, subtle chromatic aberration and film grain complete the scene. SVG contours, heading trace and waveform use the current audio response. One GSAP ticker drives rendering.

Self-hosted Manrope font; no runtime CDNs or third-party network requests. The original root MP3 remains untouched; the served copy is `public/audio/track.mp3`.

## QA

```sh
QA_URL=http://127.0.0.1:4173/particles/ node scripts/qa.mjs
```

Uses installed Google Chrome through Playwright. The original suite covers audio opt-in, analysis, pause/seek/resume, mute/volume, track end/replay, keyboard, the About dialog, seven responsive layouts and the former reduced-motion default. Checks browser/shader errors, missing assets and WCAG accessibility with axe-core. Screenshots and the report are written to ignored `.shots/`. The updated motion, response and zoom behavior requires a fresh verification run.

Local design guidance was read from the community skills [Three.js Shaders](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-shaders), [Three.js Postprocessing](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-postprocessing) and [Awwwards](https://github.com/juliobsz/skills/tree/main/awwwards). These are project design references, not runtime dependencies.
