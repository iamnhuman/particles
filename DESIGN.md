# GRAIN / sound made matter

## Brief
One screen, one supplied 38-second MP3, explicit Play, immersive audio-reactive particle art.
User requests Three.js, ambitious GLSL, SVG and precise audio synchronization. Work remains in this project.
GRAIN is a concept title, not an inferred title or credit for the unnamed audio.

## Concepts considered
1. Sound made matter: overlapping audio grains become a living copper particle sculpture. Signature: attacks rupture its surface. Emotion: magnetic, physical. Anchor: the actual MP3's spectral texture. O/F/feasibility/portability: 4/5/5/2.
2. An oscillating score: giant SVG notation fractures on transients. Signature: a score writes itself. Emotion: graphic and precise. Anchor: note attacks. Scores: 4/4/4/3.
3. Time microscope: a moving cross-section magnifies milliseconds of sound. Signature: scanning tunnel. Emotion: clinical and curious. Anchor: short audio windows. Scores: 4/4/4/2.
Selected 1: supports a genuinely three-dimensional scene and the user's high particle density without hiding Play.

## Concept card
Idea: sound becomes a living structure of individual particles.
Metaphor: a copper filament under acoustic excitation.
Signature: a toroidal particle sculpture moves immediately; Play lets spectral attacks reshape its whole flow field.
Emotion: quiet tension, then release.
Motion verb: orbit, rupture, gather.
Screenshot: enormous restrained display type at left; an asymmetrical copper filament in deep space at right.

## System
Palette: ground #090a0b; ink #ecebe6; muted #9e9e98; line #30302d; copper #e99c63; ember #e34c24.
Copper derives from the filament metaphor; color primarily lives inside the artwork, not UI accents.
Type: self-hosted Manrope, with system monospace for real time values. Fluid display scale, close tracking, regular UI.
Layout: one 12-column viewport composition. 40px desktop / 20px mobile gutter. Typography on left, sculpture right, transport at bottom.
Shape: circular transport and low-radius utilities. Motion: power3 easing, 0.3s feedback / 1.2s scene handoff.
Single render ticker (GSAP); the Web Audio playback clock synchronizes analysis, shader time and SVG during playback; idle motion continues before playback and while paused.
Motion starts enabled, including with the system reduced-motion preference, at the user's explicit request. Manual Motion off provides static SVG artwork with working audio and progress. Interface transitions retain the system preference.
Smooth scene zoom: 60–240%, with visible minus/reset/plus controls, wheel, two-finger pinch and − / + / 0 keyboard shortcuts.
Mobile: smaller simulation, centered sculpture, smaller headline, accessible 44px controls.

```
GRAIN       Sound made matter                  sound / fullscreen

                 [large flowing particle sculpture]
             .                                    .
      Every sound.                         GRAIN / 001
      A new shape.                        Original signal

      Play     real track waveform / seek       time   volume
```

## Technical
Meyda extracts FFT spectrum, RMS, centroid and flatness for 1024-sample Hann windows with 256-sample hops. Onsets use positive spectral flux and adaptive thresholds. Per-band envelopes drive different spatial effects. Samples are computed in a module worker before playback. Actual audio grains are overlapping windows, not falsely claimed isolated instruments.
AudioBufferSourceNode retains the original audio. Pause and seeking preserve offsets against AudioContext.currentTime. Rendering uses output timestamps when available.
Three.js GPGPU ping-pong position simulation, shader-driven spectral displacement, procedural point sprites, depth layers, custom tone/composite pass and restrained bloom. A transient driver adds fast attacks and short releases from measured energy, band and flux changes. Global pressure, flow and radial deformation move the whole cloud; idle movement is faster. SVG waveform, spectral trace and orbit markings use the same audio response.

## Scope decisions
Only the requested main screen. No scroll pages, marketing sections, fake credits, awards or metrics. No publishing requested. No image assets needed because procedural artwork is the product.

## Verification
Randomize particles now reshuffles the grain seeds, assembled silhouette and release order. A 4.8-second eased preview works before Play, then recalls into a held form; audio position, zoom and particle count are preserved. Node checks cover the idle preview, smooth recall, 600 rapid clicks, reset and continued audio-driven releases. Static integration and 320px control-width review pass; no browser was opened for this revision.

The latest motion revision mixes held torus/trefoil sculptures with four release fields and smooth recall. Node-only checks include the real MP3 decoded through ffmpeg and analyzed with Meyda: about 44% of the track is held below 0.1 dispersion, 33% above 0.6, with the remainder in transition. Bounds, four styles, changing forms, silence, invalid inputs and 30/60/120 FPS equivalence pass. Static GLSL/uniform review found no additional issues; expanded fields now receive smooth framing compensation. No browser was opened for this revision.

Current interaction checks passed after the motion/zoom/counter update: 10 checks cover animation starting before Play even under the system reduced-motion preference, opt-in audio, wheel/pinch/keyboard/button zoom with 60–240% limits, controls/dialog exclusions, manual Motion, the live particle counter and absence of the removed sculpture-status caption. Runtime, shader and asset errors are zero. At the actual track's 18.5-second frame, 101,845 of 102,400 main GPU particles (99.46%) moved more than 0.12 world units compared with the zero-feature response at the same simulation time; mean displacement was 0.536, with all coordinates finite. This measures full-cloud reaction, not frame-to-frame motion or an arbitrary BPM animation.

Historical verification, before the motion, whole-cloud response and zoom update: production build passed. Browser integration checks passed: opt-in audio, 6,550 finite analysis windows, 227 detected attacks, accurate pause/seek/resume, mute and volume, end/replay, keyboard shortcuts, modal focus restoration and the former reduced-motion default. Seven viewport sizes had no horizontal overflow or transport overlap. Axe reported no WCAG A/AA violations; runtime and shader errors and failed requests were zero. The updated behavior awaits a fresh verification run.

Original Chrome viewport measurements: about 58 FPS at 1440×960; 58 FPS at 390×844; 61 FPS at 320×1248; 60 FPS at 390×667. These are desktop Chrome measurements at responsive viewport sizes, not claims about physical phones or throttled hardware.

Two independent screenshot critics reviewed the composition. The second scored 7.72/10 before the last two corrections: a consistently dark background behind the sculpture status and artwork fitting the actual free region between the mobile header and headline. The supplied audio has no title or artist tags, so attribution was not invented. This is a visual QA assessment, not an Awwwards award or certification.
