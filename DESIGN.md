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
Toyota now appears as a short cameo: 0.9 seconds entering, 0.65 seconds fully formed and 0.9 seconds leaving. Only transitions involving Toyota use this faster duration; other pairs retain their 2.2-second easing. The surrounding forms occupy the unused portion of the logo phrase, keeping the original release envelopes and 132.4-second cycle. Randomize uses the same short cameo, waits for any queued morph to finish before starting its preview clock, and resumes on the following form rather than repeating the logo. Numerical timing, existing choreography and real-audio checks cover these changes; visual review remains with the user. No push.

The previous correction separates internal material movement from Toyota body motion. Each grain now drifts along one shared direction on the fused surface, with a smooth boundary taper and a cap-height lookup for both faces; the maximum XY displacement is 0.045 units. A fine advected copper-noise texture adds travelling material glints, without whitening, particle size boosts or separate oval lighting. The unwrapped flow clock avoids texture jumps. The existing smooth whole-body deformation remains. Spatial gestures are limited to one fresh musical accent in each of two actual-track windows (20–35% and 65–80%); pause, seeking and form changes do not replenish them, while replay resets the allowance. The real MP3 check produces exactly two gestures near 10 and 25 seconds, with calm framing for 83% of playback. CPU/source motion tests, production build and local HTTP are checked; browser appearance and GPU rendering are not checked. No push.

Earlier verification entries follow.

Toyota whole-body motion is stronger: shared shear amplitudes are 0.30/0.20/0.14, idle phase speed is 0.75 rad/s, and the whole sculpture rocks more visibly with continuous angles. Source-derived checks measure at least 2.95× the previous projected travel in five windows; surface area stretch remains 0.796–1.286 and five sampled logo holes stay open. The shape retains the fused surface and warm fine grain. A parent affine transform now creates occasional audio-driven screen stretches shared by sculpture, filaments and dust. It widens by up to 2.05× on desktop (1.4× mobile), shifts the composition toward the centre and returns over 3.6 seconds. Each event latches its strength and direction; a 5.2-second cooldown and rearming prevent repetitive beat jitter. The real-track response check finds six broad gestures, roughly 31% of the track in a wide pose and 50% in calm framing. Synthetic 30/60/120Hz checks cover smooth onset/return, silence, steady signals, reset and the actual invertible transform. Production build and HTTP checks passed. No browser/GPU visual check or push.

Large white spark accents were removed after user feedback: no special whitening, beat-driven size boost or star rays. Main grains retain the copper palette and ordinary size variation, with a 3 CSS-pixel diameter cap. Ambient dust uses a warmer copper tint, no hit-driven size boost and a 1.6 CSS-pixel cap, preventing foreground perspective from producing large pale dots. Production build and the updated baseline check passed; no browser check or push.

The original broad bloom/vortex/ribbon formulas and shared particle material remain restored from the last pushed commit, `0b6b2c5`. Four new single-spine forms expand the palette to thirteen: a (2,5) cinquefoil knot, rounded heart loop, folded four-petal ribbon and spatial figure-eight knot. Numerical checks of the actual scalar shader branches find closed seams, nonsingular continuous frames and radii of 1.839, 2.084, 2.241 and 2.130 units. Automatic phrases keep their longer opening durations; the full sequence is 132.4 seconds and the supplied MP3 includes the new cinquefoil. Direct source/destination pose mixing replaces numeric-selector traversal. A 2.2-second quintic blend has zero endpoint velocity and acceleration. Repeated Randomize requests queue rather than interrupt a morph, and particle origins are no longer reseeded on click. Tests cover continuous target weights, all thirteen manual selections, no unintended Toyota during a 0-to-12 morph, frame-rate consistency and the real MP3. Only two target poses are evaluated during a transition, in one position compute pass. Compact forms interpolate their own framing with the same morph. No commit or push was made.

Field 5 now uses a closed elliptical cross-section for the half-twisted ribbon, replacing a nearly flat strip with a global 0.025-unit depth offset. Both cross-section axes rotate together, with a 0.52-unit half-width and 0.19-unit half-depth before audio response. Gathered and opened poses share their spine angle and half-turn frame. The seam closes under a full spine turn and a half cross-section turn, including during interpolation. The numerical check evaluates the actual scalar GLSL branch across ten motion phases and idle/maximum mid-band response: minimum populated half-thickness is 0.173 units, minimum projected section width is 0.033 camera-normalized units for both the complete ribbon and the gathered-ring morph, and maximum radius is 2.232 units. The central opening remains open. No browser or GPU rendering was performed for this check.

Field 3 is now one broad ribbon following a closed (2,3) torus knot, replacing the three-ring chain. The continuous local frame and two strip twists close without a seam; sampled coordinates remain inside the existing scene bounds across five motion phases and maximum sampled audio. It uses the common copper material and grain-size variation, with the shared bloom. The figure-eight tube radius increases from 0.110 to 0.280 world units, and its two central branches are separated by 1.10 units in depth. At maximum sampled audio width their geometric clearance stays above 0.44 units before the shared small deformations.

Toyota's Euler route was rejected after visual feedback: one circuit still revisited junctions with different tangents, creating opposing currents, folds and brightness patches. That mechanism and its route atlas are removed. The renderer now samples the one fused inflated body by material surface area, including its rounded sides. A single long travelling deformation moves the whole body with three sequential invertible shears; all grains use one phase, including the junctions and both faces. The map preserves volume and has no branch IDs, lanes or local opacity compensation. Phase speed follows a smoothed music envelope; moderate global rocking keeps the form moving. Broad scattering starts from each grain's own deformed surface position at high dispersion, then recalls into that same material. The scatter drift is periodic across phase wrap. The original shared particle material is restored exactly, and the renderer retains one compute pass and one static Toyota target texture. Verification uses source-derived numerical geometry/motion tests, the existing choreography and baseline checks, the production build and local HTTP responses. Browser appearance, GPU shader compilation and runtime FPS were not measured. No commit or push was made.

The following entries record earlier revisions and are retained as history.

Toyota is now an automatic ninth form in the same choreography and Randomize palette; its separate button and manual-mode API are removed. The emblem appears early in the normal sequence and keeps the existing opposing particle flows, light packets and audio response. Smooth shape-driven blending also handles its readable orientation, then returns to the other sculptures. Static integration review found no stale UI references or unintended Toyota activation for fields 0–7.

The release vocabulary is doubled from four to eight fields: the existing crown, nested orbits, ribbons and orbiting loops now include a closed double helix, Möbius ribbon, armillary sphere and depth-separated figure-eight. Eight unequal phrases fit a 42.6-second visual cycle; the real MP3 check visibly reaches all eight fields, with about 43% assembled and 29% fully opened. Randomize covers every new field. Expanded fields remain fixed, and the shader evaluates only the selected field or its transition neighbour. Offline previews and a desktop/mobile framing scan found clear silhouettes, finite coordinates and no new fitting issues; Toyota flow is preserved. No browser was opened.

Toyota now uses per-grain oval parameters instead of fixed positions: every grain continuously circulates around a bounded ribbon. Opposing flows, three parallel lanes, shallow waves and traveling light packets keep the emblem alive; audio increases speed and opening, while gentle rocking preserves recognition. Parameter/geometry checks pass for both counts. Offline CPU checks at idle and maximum signal found finite coordinates, open logo gaps and visible motion in every sampled grain; eight sampled frames retain the three-oval silhouette. No browser was opened for this revision.

Expanded passages now keep narrow, connected curve families: petal crown, nested orbits, woven ribbons and orbiting loops. Per-grain radial spread and speed differences were removed, curl/jitter bounded and ambient dust reduced. Fields remain fixed while dispersion is above 0.12; style changes are deferred until recall. The choreography check passes on the real MP3 and asserts stable expanded fields and an assembled opening before Randomize. Toyota remains intact.

The initial Toyota implementation used a button to morph every main grain into a deterministic three-oval emblem, with shallow ribbon depth, a front-facing orientation and restrained audio pulses. Geometry checks passed for desktop/mobile counts, bounds, symmetry, populated bands and negative spaces; the CPU raster was recognizable and the shader/uniform integration review found no blocking issues. It now participates in the automatic palette described above.

Randomize particles now reshuffles the grain seeds, assembled silhouette and release order. A 4.8-second eased preview works before Play, then recalls into a held form; audio position, zoom and particle count are preserved. Node checks cover the idle preview, smooth recall, 600 rapid clicks, reset and continued audio-driven releases. Static integration and 320px control-width review pass; no browser was opened for this revision.

The latest motion revision mixes held torus/trefoil sculptures with four release fields and smooth recall. Node-only checks include the real MP3 decoded through ffmpeg and analyzed with Meyda: about 44% of the track is held below 0.1 dispersion, 33% above 0.6, with the remainder in transition. Bounds, four styles, changing forms, silence, invalid inputs and 30/60/120 FPS equivalence pass. Static GLSL/uniform review found no additional issues; expanded fields now receive smooth framing compensation. No browser was opened for this revision.

Current interaction checks passed after the motion/zoom/counter update: 10 checks cover animation starting before Play even under the system reduced-motion preference, opt-in audio, wheel/pinch/keyboard/button zoom with 60–240% limits, controls/dialog exclusions, manual Motion, the live particle counter and absence of the removed sculpture-status caption. Runtime, shader and asset errors are zero. At the actual track's 18.5-second frame, 101,845 of 102,400 main GPU particles (99.46%) moved more than 0.12 world units compared with the zero-feature response at the same simulation time; mean displacement was 0.536, with all coordinates finite. This measures full-cloud reaction, not frame-to-frame motion or an arbitrary BPM animation.

Historical verification, before the motion, whole-cloud response and zoom update: production build passed. Browser integration checks passed: opt-in audio, 6,550 finite analysis windows, 227 detected attacks, accurate pause/seek/resume, mute and volume, end/replay, keyboard shortcuts, modal focus restoration and the former reduced-motion default. Seven viewport sizes had no horizontal overflow or transport overlap. Axe reported no WCAG A/AA violations; runtime and shader errors and failed requests were zero. The updated behavior awaits a fresh verification run.

Original Chrome viewport measurements: about 58 FPS at 1440×960; 58 FPS at 390×844; 61 FPS at 320×1248; 60 FPS at 390×667. These are desktop Chrome measurements at responsive viewport sizes, not claims about physical phones or throttled hardware.

Two independent screenshot critics reviewed the composition. The second scored 7.72/10 before the last two corrections: a consistently dark background behind the sculpture status and artwork fitting the actual free region between the mobile header and headline. The supplied audio has no title or artist tags, so attribution was not invented. This is a visual QA assessment, not an Awwwards award or certification.
