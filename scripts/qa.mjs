import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.QA_URL || 'http://127.0.0.1:4174/particles/';
await mkdir('.shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = { errors: [], requests: [], checks: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
page.setDefaultTimeout(45000);
page.on('pageerror', e => results.errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') results.errors.push(e.text()); });
page.on('requestfailed', r => results.requests.push({ url: r.url(), error: r.failure().errorText }));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__grain?.audio.analysis && window.__grain?.scene, null, { timeout: 45000 });
  await page.waitForTimeout(1500);
  const analysis = await page.evaluate(() => {
    const { audio, scene } = window.__grain;
    const a = audio.analysis;
    return { duration: audio.duration, count: a.count, hopSize: a.hopSize, sampleRate: a.sampleRate, onsets: a.onsets.length, finite: a.frames.every(Number.isFinite), particles: scene.particleCount, drawCalls: scene.renderer.info.render.calls, context: audio.context.state };
  });
  assert(analysis.duration > 37 && analysis.duration < 39);
  assert(analysis.count > 6000 && analysis.finite);
  assert(analysis.onsets > 5);
  assert.equal(analysis.context, 'suspended', 'No autoplay before user action');
  results.analysis = analysis;
  await page.screenshot({ path: '.shots/d-01-hero.png' });
  await page.locator('#play').hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '.shots/h-01-play.png' });
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__grain.audio.playing && window.__grain.audio.position() > 1);
  assert.equal(await page.evaluate(() => window.__grain.audio.context.state), 'running');
  await page.screenshot({ path: '.shots/d-02-playing.png' });
  await page.locator('#play').click();
  const paused = await page.evaluate(() => window.__grain.audio.position());
  await page.waitForTimeout(300);
  assert(Math.abs(await page.evaluate(() => window.__grain.audio.position()) - paused) < .01, 'Pause freezes audio clock');
  results.checks.push('Explicit play and pause');
  await page.locator('#seek').fill('18.5');
  assert(Math.abs(await page.evaluate(() => window.__grain.audio.position()) - 18.5) < .01, 'Seek is precise while paused');
  await page.locator('#transport-play').click();
  await page.waitForTimeout(600);
  assert(await page.evaluate(() => window.__grain.audio.position()) > 18.9, 'Resume starts at selected position');
  results.checks.push('Seek and resume');
  await page.screenshot({ path: '.shots/d-03-middle.png' });
  await page.locator('#mute').click();
  assert(await page.evaluate(() => window.__grain.audio.muted));
  await page.locator('#mute').click();
  await page.locator('#volume').fill('0.4');
  assert.equal(await page.evaluate(() => window.__grain.audio.volume), .4);
  results.checks.push('Mute and volume');
  await page.locator('#transport-play').click();
  await page.locator('#about-open').click();
  assert(await page.locator('#about').evaluate(el => el.open));
  await page.screenshot({ path: '.shots/d-04-about.png' });
  await page.keyboard.press('Escape');
  assert(!await page.locator('#about').evaluate(el => el.open));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'about-open');
  results.checks.push('About dialog, Escape and focus restoration');
  await page.locator('#seek').fill('37.7');
  await page.locator('#transport-play').click();
  await page.waitForFunction(() => !window.__grain.audio.playing, null, { timeout: 5000 });
  assert.match(await page.locator('#play-label').textContent(), /Replay/);
  await page.locator('#play').click();
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.__grain.audio.position()) < 1);
  results.checks.push('Track end and replay');
  await page.locator('#play').click();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.__grain.audio.playing));
  await page.keyboard.press('Space');
  assert(!await page.evaluate(() => window.__grain.audio.playing));
  results.checks.push('Space keyboard shortcut');
  await page.locator('#play').focus();
  await page.screenshot({ path: '.shots/k-01-focus.png' });

  const axeSource = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
  await page.addScriptTag({ content: axeSource });
  results.a11y = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }));
  });

  results.layouts = [];
  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[360,740],[390,667]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const layout = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const transport = document.querySelector('.transport').getBoundingClientRect();
      return { viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, heroBottom: hero.bottom, transportTop: transport.top, height: document.documentElement.scrollHeight, innerHeight };
    });
    assert(!layout.overflow, `No horizontal overflow at ${width}`);
    assert(layout.heroBottom < layout.transportTop, `Hero doesn't overlap transport at ${width}x${height}`);
    results.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `.shots/${width < 761 ? 'm' : 'd'}-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#play').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: '.shots/m-02-playing.png' });
  await page.locator('#play').click();

  const calm = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  calm.on('pageerror', e => results.errors.push(e.message));
  await calm.goto(base, { waitUntil: 'networkidle' });
  await calm.waitForFunction(() => window.__grain?.audio.analysis);
  await calm.waitForFunction(() => window.__grain.scene);
  assert.equal(await calm.evaluate(() => window.__grain.motion), true, 'Visual starts immediately as explicitly requested');
  await calm.locator('#motion').click();
  assert.equal(await calm.evaluate(() => window.__grain.motion), false);
  assert(await calm.locator('html').evaluate(el => el.classList.contains('still')));
  await calm.screenshot({ path: '.shots/r-01-mobile.png' });
  await calm.locator('#play').click();
  await calm.waitForFunction(() => window.__grain.audio.playing);
  await calm.locator('#play').click();
  results.checks.push('Immediate animation, manual Motion off uses static SVG, audio still works');
  await calm.close();
  results.checks.push('Responsive composition at 7 viewport sizes');
  assert.equal(results.errors.length, 0, 'No runtime or shader errors');
  assert.equal(results.requests.length, 0, 'No failed asset requests');
  assert(!results.a11y.some(v => ['serious','critical'].includes(v.impact)), 'No serious or critical accessibility violations');
  results.passed = true;
} catch (error) {
  results.failure = error.stack;
  await page.screenshot({ path: '.shots/failure.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile('.shots/report.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}
