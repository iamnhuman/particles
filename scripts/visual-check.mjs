import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.QA_URL || 'http://127.0.0.1:4174/particles/';
const results = [];
try {
  for (const [width, height, prefix] of [[1440,960,'d-final'],[390,844,'m-final'],[320,1248,'narrow-final'],[390,667,'short-final']]) {
    if (process.env.QA_CASE && !prefix.startsWith(process.env.QA_CASE)) continue;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.log('Page error:',error.message); });
    page.on('console', message => { if (['error','warning','warn'].includes(message.type())) console.log(message.type(),message.text()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    try { await page.waitForFunction(() => window.__grain?.audio.analysis && window.__grain?.scene, null, {timeout:45000}); }
    catch(error) { console.log('Boot state', await page.evaluate(() => ({ text: document.body.innerText, hasEngine: !!window.__grain, analysis: !!window.__grain?.audio.analysis, scene: !!window.__grain?.scene, motion: window.__grain?.motion }))); throw error; }
    await page.waitForTimeout(1100);
    const measure = await page.evaluate(async () => {
      const s = window.__grain.scene;
      const h = document.querySelector('.header').getBoundingClientRect();
      const logo = document.querySelector('.wordmark').getBoundingClientRect();
      const actions = document.querySelector('.header-actions').getBoundingClientRect();
      const transport = document.querySelector('.transport').getBoundingClientRect();
      let frames = 0;
      const start = performance.now();
      await new Promise(resolve => { const count = now => { frames++; if (now - start < 1500) requestAnimationFrame(count); else resolve(); }; requestAnimationFrame(count); });
      return { particles: s.particleCount, fps: frames / ((performance.now() - start) / 1000), headerGap: actions.left-logo.right, headerTop: h.top, transportBottom: transport.bottom, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert(measure.headerGap > 8, 'Header controls have space');
    assert(!measure.overflow);
    assert(measure.transportBottom <= height, 'Transport is in the initial viewport');
    assert.equal(errors.length, 0);
    await page.screenshot({ path: `.shots/${prefix}-hero.png` });
    if (width >= 390) {
      await page.locator('#seek').fill('18.5');
      await page.locator('#play').click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `.shots/${prefix}-playing.png` });
      await page.locator('#play').click();
    }
    results.push({ width, height, ...measure, errors });
    console.log(JSON.stringify(results.at(-1)));
    await writeFile('.shots/visual-report.json', JSON.stringify(results, null, 2));
    await page.close();
  }
  await writeFile('.shots/visual-report.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
