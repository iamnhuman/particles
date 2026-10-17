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

**Randomize particles** changes the gathered silhouette and release sequence with a smooth reveal and recall. It works before Play and during playback, preserving the track position, zoom and particle count. The button is disabled while Motion is off or WebGL is unavailable.

**Toyota** is sampled once over the surface area of a single fused, rounded body. Both faces and the curved sides share one material coordinate system. One broad travelling deformation moves the entire sculpture; it uses three invertible volume-preserving shears with a single smoothly driven phase. There are no ellipse routes, junction turnarounds, flow lanes or per-region opacity corrections. The wider, faster shared wave and rocking make the whole logo visibly move while preserving its openings; sampled projected idle travel is at least 2.95 times the preceding version. At high dispersion the grains spread outward from their current surface and gather back into it. The original copper material and sprites are shared with the first sculpture. Fine grains also slide tangentially over the common surface while one copper texture travels across the material. The grain displacement tapers at the silhouette and holes; both faces use the same XY motion and the shared rounded height field. This creates internal movement without separate oval streams. Everything runs in the existing position pass using a target texture and one static surface atlas. Run `node scripts/toyota-grain-check.mjs` to verify internal movement with body motion frozen, edge containment, continuity and the no-fold displacement map. Run `node scripts/toyota-check.mjs` for the fused geometry, surface-area sampling and junction density, and `node scripts/toyota-motion-check.mjs` for deformation invertibility, local stretch, coherent junction motion and continuous movement. These numerical checks do not execute a browser or GPU shader.

## Audio synchronization

- Meyda analyzes overlapping 1,024-sample Hann windows with 256-sample hops in a module worker.
- The provided 44.1 kHz track produces approximately 6,550 windows, 5.8 ms apart. The actual decoded sample rate is used, including browsers that resample audio.
- Each window contains RMS, low/mid/high energy, positive log spectral flux, centroid, flatness and an adaptive onset envelope, plus 64 log-spaced spectral bands.
- Windows are centered on the timeline and normalized against track percentiles; quiet passages retain their dynamics.
- The untouched decoded stereo track is played with AudioBufferSourceNode. Positions use AudioContext.currentTime and getOutputTimestamp where supported; seeking and pausing retain the correct offsets.
- Rendering reads the analyzed frame at the audible playback position. A fast-attack, short-release response driver emphasizes real changes in energy, frequency bands and flux, without a guessed BPM. Idle animation advances before playback and while paused; sound-driven features decay to zero.

Here “grains” means overlapping windows of the waveform. An MP3 does not contain separately recoverable notes or instruments; this performs detailed signal analysis, not stem separation or granular resynthesis.

## Graphics

Only two passages can trigger a screen stretch: 20–35% and 65–80% of the actual track. Each allows one fresh strong musical accent, keeping the 3.6-second smooth opening/return and maximum width multipliers of 2.05 on desktop and 1.4 on mobile. Changes of sculpture never trigger stretching. Pause/resume and seeks preserve spent passages; replay explicitly resets them. The supplied track produces exactly two broad moments in the offline response check (around 10 and 25 seconds), with normal framing for about 83% of playback. Run `node scripts/spatial-motion-check.mjs` for rarity, timeline/seek behavior, continuity and the screen transform.

The original broad bloom, vortex and ribbon releases from `0b6b2c5` are preserved, including spread, curl, impacts and their longer opening phrases. The palette now has thirteen forms. Four additions are a cinquefoil knot, a rounded heart loop, a folded four-petal ribbon and a spatial figure-eight knot. Each new form has one continuous closed spine and a thick cross-section. They join Randomize and the automatic sequence; the cinquefoil appears during the supplied track. The complete long-form cycle lasts 132.4 seconds, so the opening releases retain their screen time. Compact closed forms have their own framing instead of shrinking like broad particle clouds. Run `node scripts/new-forms-check.mjs` for closed seams, nonsingular sweep frames, finite geometry and continuous movement.

Form changes mix only the selected source and destination poses, with a quintic transition and zero blend velocity and acceleration at both ends. Ordinary transitions take 2.2 seconds. Toyota is a brief cameo: 0.9 seconds to appear, 0.65 seconds fully formed and 0.9 seconds to become the next sculpture. Its neighbours use the rest of its phrase, preserving the original release rhythm and full cycle length. Shapes never traverse intermediate numeric IDs. Randomize preserves each grain's original phase and lane; a repeated click queues its latest selection until the current morph ends. The 6.4-second preview starts when that selection actually begins. Toyota follows the same short cameo timing during preview and continues into the next form without reappearing on recall. Framing and logo orientation use the same continuous weights. Run `node scripts/toyota-timing-check.mjs` for short logo passages, queued previews, shuffled slots and timing at 30/60/120 Hz. Run `node scripts/choreography-check.mjs` for target-weight continuity, queued clicks, every selectable form, frame-rate consistency and the supplied MP3, and `node scripts/baseline-check.mjs` for the restored release/material source and single-pass rendering contract.

The Möbius ribbon has a rounded, volumetric cross-section, including the sides exposed by its half-turn. Its 0.19-unit half-depth prevents the broad face from collapsing into a dark slit when seen edge-on. Gathered and opened poses share the spine angle and half-turn frame, so interpolation closes the same seam. Run `node scripts/ribbon-check.mjs` to evaluate the shader's geometry and check seam closure, minimum thickness, projected width, the gathered-ring morph and the central opening across motion phases and audio extremes. This numerical check does not render a browser or execute a GPU shader.

Three.js renders 102,400 simulated particles on desktop, with 14,000 ambient particles and 22 fine filament paths. Initial mobile loads use 36,864 simulated and 3,500 ambient particles. GPGPU position textures use ping-pong render targets, a divergence-free analytic curl field, spectral displacement and sound-driven morphing from a torus into a trefoil structure. Global pressure, flow and radial deformation make the whole cloud respond to the track, with faster motion between passages and before playback. Custom point sprites, bloom, tone mapping, subtle chromatic aberration and film grain complete the scene. Oversized white spark accents are removed; nearby grains have a bounded screen size, and ambient dust stays fine and warm without beat-driven size flashes. SVG contours, heading trace and waveform use the current audio response. One GSAP ticker drives rendering.

Self-hosted Manrope font; no runtime CDNs or third-party network requests. The original root MP3 remains untouched; the served copy is `public/audio/track.mp3`.

## QA

```sh
QA_URL=http://127.0.0.1:4173/particles/ node scripts/qa.mjs
```

Uses installed Google Chrome through Playwright. The original suite covers audio opt-in, analysis, pause/seek/resume, mute/volume, track end/replay, keyboard, the About dialog, seven responsive layouts and the former reduced-motion default. Checks browser/shader errors, missing assets and WCAG accessibility with axe-core. Screenshots and the report are written to ignored `.shots/`. The updated motion, response and zoom behavior requires a fresh verification run.

Local design guidance was read from the community skills [Three.js Shaders](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-shaders), [Three.js Postprocessing](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-postprocessing) and [Awwwards](https://github.com/juliobsz/skills/tree/main/awwwards). These are project design references, not runtime dependencies.
