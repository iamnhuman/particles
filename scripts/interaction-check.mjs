import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.QA_URL || 'http://127.0.0.1:4174/particles/';
const output = '.shots/interactions-report.json';
const results = { url: base, checks: [], errors: [], warnings: [], requests: [] };
await mkdir('.shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
page.setDefaultTimeout(45000);
page.on('pageerror', (error) => results.errors.push({ source: 'runtime', message: error.message }));
page.on('console', (message) => {
  const entry = { source: 'console', message: message.text() };
  if (message.type() === 'error') results.errors.push(entry);
  else if (message.type() === 'warning') {
    results.warnings.push(entry.message);
    if (/shader.*(?:error|failed)|webgl.*invalid|THREE\.WebGLProgram/i.test(entry.message)) results.errors.push(entry);
  }
});
page.on('requestfailed', (request) => results.requests.push({ url: request.url(), message: request.failure()?.errorText }));

const state = () => page.evaluate(() => ({
  value: window.__grain.zoom.value,
  target: window.__grain.zoom.target,
  camera: window.__grain.scene.camera.position.toArray(),
  baseCameraZ: window.__grain.scene.baseCameraZ,
  time: window.__grain.scene.simUniforms.uTime.value,
  motion: window.__grain.motion,
  playing: window.__grain.audio.playing,
  label: document.querySelector('#zoom-value').textContent,
}));
const settleZoom = () => page.waitForFunction(() => {
  const { zoom, scene } = window.__grain;
  return Math.abs(zoom.value - zoom.target) < .001
    && Math.abs(scene.camera.position.z - scene.baseCameraZ / zoom.value) < .02;
}, null, { timeout: 15000 });
const resetZoom = async () => { await page.locator('#zoom-reset').click(); await settleZoom(); };
const blur = () => page.evaluate(() => document.activeElement?.blur());
const pointAtScene = () => page.mouse.move(1180, 350);
const wheelZoom = async (delta) => {
  const previous = (await state()).target;
  await page.mouse.wheel(0, delta);
  await page.waitForFunction((target) => window.__grain.zoom.target !== target, previous);
  await settleZoom();
};
const counter = () => page.locator('#particle-count').textContent().then((text) => Number(text.replace(/\D/g, '')));
const check = async (name, action) => {
  try {
    const detail = await action();
    results.checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.checks.push({ name, passed: false, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
    await page.screenshot({ path: `.shots/interactions-failure-${results.checks.length}.png` }).catch(() => {});
  }
};

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__grain?.audio.analysis && window.__grain?.scene && window.__grain?.zoom);

  await check('Animation starts immediately, including reduced-motion preference; sound waits for Play', async () => {
    const initial = await page.evaluate(() => ({
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      motion: window.__grain.motion,
      scene: Boolean(window.__grain.scene),
      playing: window.__grain.audio.playing,
      context: window.__grain.audio.context.state,
      time: window.__grain.scene.simUniforms.uTime.value,
      particles: window.__grain.scene.particleCount,
      dust: window.__grain.scene.dust.geometry.getAttribute('position').count,
    }));
    assert.equal(initial.reduced, true);
    assert.equal(initial.motion, true);
    assert.equal(initial.scene, true);
    assert.equal(initial.playing, false);
    assert.equal(initial.context, 'suspended');
    assert.equal(await page.locator('.art-caption').count(), 0);
    assert.equal(await counter(), initial.particles + initial.dust);
    await page.waitForTimeout(350);
    const after = await state();
    assert(after.time > initial.time + .05, `Idle shader clock advances: ${initial.time} → ${after.time}`);
    assert.equal(after.playing, false);
    await page.screenshot({ path: '.shots/interactions-idle.png' });
    return { ...initial, laterTime: after.time, count: await counter() };
  });

  await check('Wheel zoom moves the camera in and out', async () => {
    await resetZoom();
    await pointAtScene();
    const before = await state();
    await wheelZoom(-450);
    const closer = await state();
    assert(closer.value > before.value + .3);
    assert(closer.camera[2] < before.camera[2] - .5);
    assert(Math.abs(closer.camera[2] - closer.baseCameraZ / closer.value) < .02);
    await page.screenshot({ path: '.shots/interactions-zoom-in.png' });
    await wheelZoom(450);
    const farther = await state();
    assert(farther.value < closer.value - .3);
    assert(farther.camera[2] > closer.camera[2] + .5);
    return { before, closer, farther };
  });

  await check('Zoom buttons and reset', async () => {
    await resetZoom();
    await page.locator('#zoom-in').click();
    await settleZoom();
    const plus = await state();
    assert(Math.abs(plus.value - 1.2) < .002);
    await page.locator('#zoom-out').click();
    await settleZoom();
    assert(Math.abs((await state()).value - 1) < .002);
    await page.locator('#zoom-in').click();
    await resetZoom();
    const reset = await state();
    assert(Math.abs(reset.value - 1) < .002);
    assert.equal(reset.label, '100%');
    assert.match(await page.locator('#zoom-reset').getAttribute('aria-label'), /reset.*100%/i);
    return { plus, reset };
  });

  await check('Keyboard +, minus and 0; typing and modified combinations are preserved', async () => {
    await resetZoom();
    await blur();
    await page.keyboard.press('Shift+Equal');
    await settleZoom();
    assert(Math.abs((await state()).value - 1.2) < .002);
    await page.keyboard.press('Minus');
    await settleZoom();
    assert(Math.abs((await state()).value - 1) < .002);
    await page.keyboard.press('Shift+Equal');
    await page.keyboard.press('Digit0');
    await settleZoom();
    assert(Math.abs((await state()).value - 1) < .002);
    const target = (await state()).target;
    await page.keyboard.press('Control+Equal');
    assert.equal((await state()).target, target);
    await page.locator('#play').focus();
    await page.keyboard.press('Shift+Equal');
    assert.equal((await state()).target, target);
    await page.locator('#volume').focus();
    await page.keyboard.press('Minus');
    assert.equal((await state()).target, target);
    await blur();
  });

  await check('Zoom remains within 60–240%', async () => {
    await resetZoom();
    await pointAtScene();
    await wheelZoom(-10000);
    const maximum = await state();
    assert.equal(maximum.target, 2.4);
    assert(Math.abs(maximum.value - 2.4) < .002);
    assert.equal(await page.locator('#zoom-in').isDisabled(), true);
    await wheelZoom(10000);
    const minimum = await state();
    assert.equal(minimum.target, .6);
    assert(Math.abs(minimum.value - .6) < .002);
    assert.equal(await page.locator('#zoom-out').isDisabled(), true);
    await page.screenshot({ path: '.shots/interactions-zoom-out.png' });
    await resetZoom();
    return { maximum, minimum };
  });

  await check('Wheel leaves volume controls and open dialogs alone', async () => {
    await resetZoom();
    const before = (await state()).target;
    await page.locator('#volume').hover();
    await page.mouse.wheel(0, -450);
    await page.waitForTimeout(150);
    assert.equal((await state()).target, before);
    await page.locator('#about-open').click();
    await pointAtScene();
    await page.mouse.wheel(0, -450);
    await page.locator('#experience').dispatchEvent('wheel', { deltaY: -450, deltaMode: 0, bubbles: true, cancelable: true });
    await page.keyboard.press('Shift+Equal');
    assert.equal((await state()).target, before);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#about').evaluate((element) => element.open), false);
  });

  await check('Two-finger pinch scales the scene; a single touch remains available', async () => {
    await resetZoom();
    const touch = await page.evaluate(() => {
      const element = document.querySelector('#experience');
      const makeTouch = (identifier, x) => new Touch({ identifier, target: element, clientX: x, clientY: 200 });
      const send = (type, touches) => {
        const event = new TouchEvent(type, { touches, targetTouches: touches, bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      };
      const singlePrevented = send('touchstart', [makeTouch(1, 100)]);
      const pinchPrevented = send('touchstart', [makeTouch(1, 100), makeTouch(2, 200)]);
      send('touchmove', [makeTouch(1, 100), makeTouch(2, 250)]);
      const target = window.__grain.zoom.target;
      send('touchend', []);
      return { singlePrevented, pinchPrevented, target };
    });
    assert.equal(touch.singlePrevented, false);
    assert.equal(touch.pinchPrevented, true);
    assert(Math.abs(touch.target - 1.5) < .001);
    await settleZoom();
    await resetZoom();
    return touch;
  });

  await check('Motion can be stopped and resumed manually; particle count follows it', async () => {
    const expectedCount = await counter();
    await page.locator('#motion').click();
    assert.equal(await page.evaluate(() => window.__grain.motion), false);
    assert.equal(await page.locator('#motion').getAttribute('aria-pressed'), 'false');
    assert.equal(await counter(), 0);
    const stopped = (await state()).time;
    await page.waitForTimeout(300);
    assert.equal((await state()).time, stopped);
    await page.screenshot({ path: '.shots/interactions-motion-off.png' });
    await page.locator('#motion').click();
    assert.equal(await page.evaluate(() => window.__grain.motion), true);
    assert.equal(await page.locator('#motion').getAttribute('aria-pressed'), 'true');
    assert.equal(await counter(), expectedCount);
    await page.waitForTimeout(350);
    assert((await state()).time > stopped + .05);
    return { stopped, resumed: (await state()).time, expectedCount };
  });

  await check('Real track features release more than 75% of GPU particles from a gathered pose', async () => {
    if (!await page.evaluate(() => window.__grain.motion)) await page.locator('#motion').click();
    await page.locator('#seek').fill('18.5');
    await page.locator('#play').click();
    await page.waitForFunction(() => window.__grain.audio.playing && window.__grain.audio.position() > 18.55);
    await page.screenshot({ path: '.shots/interactions-playing.png' });
    await page.locator('#play').click();
    await page.locator('#seek').fill('18.5');
    assert.equal(await page.evaluate(() => window.__grain.audio.playing), false);
    const response = await page.evaluate(() => {
      const { audio, scene } = window.__grain;
      const frame = audio.sample();
      const features = Float32Array.from(frame.features);
      const spectrum = Uint8Array.from(frame.spectrum);
      const pointer = scene.pointer.clone();
      const smoothedPointer = scene.smoothedPointer.clone();
      const renderComposer = scene.composer.render;
      const readPositions = () => {
        const pixels = new Float32Array(scene.size * scene.size * 4);
        scene.renderer.readRenderTargetPixels(scene.compute.getCurrentRenderTarget(scene.positionVariable), 0, 0, scene.size, scene.size, pixels);
        return pixels;
      };
      scene.pointer.set(0, 0, 0);
      scene.smoothedPointer.set(0, 0, 0);
      // The synchronous evaluation excludes the page ticker. Compute remains active;
      // skip only the expensive display passes during convergence at a fixed time.
      scene.composer.render = () => {};
      let zero, music;
      try {
        // Compare inside a release phrase. Held phrases deliberately stay graceful.
        const common = { time: 15.128, active: 1, delta: 1 / 60, zoom: 1 };
        for (let i = 0; i < 120; i++) scene.render({ ...common, features: new Float32Array(8), spectrum: new Uint8Array(64) });
        zero = readPositions();
        for (let i = 0; i < 120; i++) scene.render({ ...common, features, spectrum });
        music = readPositions();
      } finally {
        scene.composer.render = renderComposer;
        scene.pointer.copy(pointer);
        scene.smoothedPointer.copy(smoothedPointer);
      }
      let moved = 0, finite = true, sum = 0;
      const distances = [];
      for (let i = 0; i < scene.particleCount; i++) {
        const offset = i * 4;
        const distance = Math.hypot(music[offset] - zero[offset], music[offset + 1] - zero[offset + 1], music[offset + 2] - zero[offset + 2]);
        finite &&= Number.isFinite(distance) && Number.isFinite(music[offset + 3]) && Number.isFinite(zero[offset + 3]);
        if (distance > .12) moved++;
        sum += distance;
        distances.push(distance);
      }
      distances.sort((a, b) => a - b);
      return {
        time: frame.time, fixedSimulationTime: 15.128, settleFramesPerInput: 120,
        features: Array.from(features), spectrumMax: Math.max(...spectrum),
        count: scene.particleCount, moved, fraction: moved / scene.particleCount,
        threshold: .12, finite, mean: sum / scene.particleCount,
        minimum: distances[0], median: distances[Math.floor(distances.length * .5)],
        p90: distances[Math.floor(distances.length * .9)], maximum: distances.at(-1),
      };
    });
    results.particleResponse = response;
    assert(Math.abs(response.time - 18.5) < .01);
    assert(response.features.every(Number.isFinite));
    assert(response.features[0] > .01 && response.features.slice(1, 4).some((value) => value > .01), 'Real energy and frequency features are present');
    assert(response.spectrumMax > 0);
    assert.equal(response.finite, true, 'Every GPU coordinate remains finite');
    assert(response.fraction > .75, `Expected >75% moving by >0.12 units; measured ${(response.fraction * 100).toFixed(2)}%`);
    return response;
  });

  await check('No runtime, shader or asset failures', async () => {
    assert.deepEqual(results.errors, []);
    assert.deepEqual(results.requests, []);
  });
  results.passed = results.checks.every((entry) => entry.passed);
} catch (error) {
  results.passed = false;
  results.failure = error.stack;
  await page.screenshot({ path: '.shots/interactions-boot-failure.png' }).catch(() => {});
} finally {
  await writeFile(output, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.passed, checks: results.checks.length, failed: results.checks.filter((entry) => !entry.passed).map((entry) => entry.name), response: results.particleResponse, errors: results.errors, report: output }));
  await browser.close();
  if (!results.passed) process.exitCode = 1;
}
