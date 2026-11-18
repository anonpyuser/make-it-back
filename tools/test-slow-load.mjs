// Confirms a slow GLB download shows the placeholder, then swaps in Aj.
import { chromium } from 'playwright-core';
const URL_ = process.env.URL || 'http://localhost:8642/';
const out = new URL('../screenshots/', import.meta.url).pathname;
const DELAY_MS = 5000;
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

// Simulate a slow character download (slow 3G over the whole app, including
// dozens of JS modules, exceeded Playwright's 30s navigation timeout).
// Holding just the GLB for 5s is deterministic and still slower than the 1.2s placeholder.
await page.route(/character-mobile\.glb/, async (route) => {
  await new Promise((r) => setTimeout(r, DELAY_MS));
  await route.continue();
});

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__mib && __mib.characterState, null, { timeout: 20000 });
// After the placeholder timer (~1.2s) and before the delayed GLB arrives, we should see the box-kid.
await page.waitForTimeout(1600);
const mid = await page.evaluate(() => __mib.characterState());
console.log('during slow load', JSON.stringify(mid), 'at', Date.now() - t0, 'ms');
if (mid.isSkinned) errors.push('skinned model appeared before the delayed GLB should have arrived');
if (!mid.placeholder && !mid.isProcedural) errors.push('expected a procedural placeholder during the slow load');
await page.screenshot({ path: out + '09-placeholder.png' });

await page.waitForFunction(() => __mib.characterState().isSkinned, null, { timeout: 30000 });
const after = await page.evaluate(() => __mib.characterState());
console.log('after slow load', JSON.stringify(after), 'at', Date.now() - t0, 'ms');
if (!after.isSkinned) errors.push('skinned Aj never replaced the placeholder');
if (after.placeholder) errors.push('placeholder flag still set after the GLB arrived');
await page.waitForFunction(() => __mib.animsReady(), null, { timeout: 15000 }).catch(() => errors.push('anims never became ready'));
await page.waitForTimeout(400);
await page.screenshot({ path: out + '10-after-slow-load.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
