// Portrait layout at iPhone 14 and 16 Pro Max sizes: canvas must fill the
// screen, and the AIM stick + FIRE button must be visible overlays.
import { chromium } from 'playwright-core';

const URL_ = process.env.URL || 'http://localhost:8645/';
const out = new URL('../screenshots/', import.meta.url).pathname;
const viewports = [
  { name: 'iphone14', width: 390, height: 844 },
  { name: 'iphone16', width: 430, height: 932 },
];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => __mib.characterState && __mib.characterState().isSkinned, null, { timeout: 20000 });
  await page.tap('#btnNew');
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const stick = document.getElementById('aimStick');
    const fire = document.getElementById('btnFire');
    const cr = canvas.getBoundingClientRect();
    const sr = stick.getBoundingClientRect();
    const fr = fire.getBoundingClientRect();
    const meta = document.querySelector('meta[name="viewport"]')?.content || '';
    return {
      vw: innerWidth, vh: innerHeight,
      canvas: { x: +cr.x.toFixed(1), y: +cr.y.toFixed(1), w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) },
      stick: { w: +sr.width.toFixed(1), h: +sr.height.toFixed(1), x: +sr.x.toFixed(1), y: +sr.y.toFixed(1) },
      fire: { w: +fr.width.toFixed(1), h: +fr.height.toFixed(1), x: +fr.x.toFixed(1), y: +fr.y.toFixed(1), label: fire.textContent.trim() },
      viewportFit: /viewport-fit=cover/.test(meta),
      appleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
      hudTop: getComputedStyle(document.querySelector('.hud-top')).top,
    };
  });
  console.log('layout', vp.name, JSON.stringify(info));
  if (info.canvas.h < vp.height * 0.95 || info.canvas.w < vp.width * 0.95) {
    errors.push(`[${vp.name}] canvas ${info.canvas.w}x${info.canvas.h} does not fill ${vp.width}x${vp.height}`);
  }
  if (Math.abs(info.canvas.y) > 2) errors.push(`[${vp.name}] canvas y is ${info.canvas.y}, expected 0`);
  if (info.stick.w < 80 || info.stick.h < 80) errors.push(`[${vp.name}] AIM stick too small`);
  if (info.fire.w < 90 || info.fire.h < 90 || info.fire.label !== 'FIRE') errors.push(`[${vp.name}] FIRE button missing or too small`);
  if (info.stick.x + info.stick.w / 2 > vp.width / 2) errors.push(`[${vp.name}] AIM stick is not on the left`);
  if (info.fire.x + info.fire.w / 2 < vp.width / 2) errors.push(`[${vp.name}] FIRE button is not on the right`);
  if (!info.viewportFit) errors.push(`[${vp.name}] viewport-fit=cover missing`);
  await page.screenshot({ path: `${out}20-fullscreen-${vp.name}.png` });
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log('ERRORS:', errors.join('\n'));
  process.exit(1);
}
console.log('ERRORS: none');
