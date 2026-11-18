// Headless iPhone-viewport smoke test: loads the game, plays, captures screenshots.
import { chromium } from 'playwright-core';
const URL_ = process.env.URL || 'http://localhost:8642/';
const out = new URL('../screenshots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url()));
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForFunction(() => __mib.player && __mib.player.userData && __mib.player.userData.ready, null, { timeout: 15000 });
await page.waitForTimeout(800);
const anims = await page.evaluate(() => __mib.animsReady());
console.log('anims ready on title:', anims);
await page.screenshot({ path: out + '01-title.png' });

await page.tap('#btnNew');
await page.waitForTimeout(500);
const wave1 = await page.evaluate(() => ({
  state: __mib.state,
  allotment: __mib.waveAllotment(),
  ammo: __mib.totalAmmo(),
  hud: document.getElementById('hudAmmo').textContent,
  clip: __mib.clip(),
}));
console.log('wave1 ammo', JSON.stringify(wave1));
if (wave1.ammo !== wave1.allotment) {
  console.log('FAIL: wave 1 ammo should equal allotment (shots-to-clear + 10)');
}
if (wave1.ammo !== wave1.allotment) errors.push(`[test] wave1 ammo ${wave1.ammo} != allotment ${wave1.allotment}`);

const hold = async (sel, ms) => {
  const b = await page.locator(sel).boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.dispatchEvent(sel, 'pointerdown', { pointerType: 'touch', clientX: x, clientY: y });
  await page.waitForTimeout(ms);
  await page.dispatchEvent(sel, 'pointerup', { pointerType: 'touch', clientX: x, clientY: y });
};

// mid-strafe still
await page.dispatchEvent('#btnLeft', 'pointerdown', { pointerType: 'touch' });
await page.waitForTimeout(700);
console.log('strafe clip', await page.evaluate(() => __mib.clip()));
await page.screenshot({ path: out + '07-strafe.png' });
await page.dispatchEvent('#btnLeft', 'pointerup', { pointerType: 'touch' });

// shooting still
await page.dispatchEvent('#btnFire', 'pointerdown', { pointerType: 'touch' });
await page.waitForTimeout(400);
console.log('shoot clip', await page.evaluate(() => __mib.clip()));
await page.screenshot({ path: out + '08-shooting.png' });

// hold fire while moving left/right
await hold('#btnLeft', 1200);
await hold('#btnRight', 2400);
await hold('#btnLeft', 1200);
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('headless fps (software GL):', fps);
// wait until zombies are close enough to see clearly (game time runs slow under software GL)
await page.waitForFunction(() => __mib.G.zombies.some(z => !z.dead && z.z > -16), null, { timeout: 120000 }).catch(() => console.log('no zombie got close in time'));
let st = await page.evaluate(() => ({ state: __mib.state, kills: __mib.G.kills, zombies: __mib.G.zombies.length, px: __mib.G.px, ammo: __mib.save.ammo.pistol, total: __mib.totalAmmo(), bc: __mib.G.barricade }));
console.log('mid-wave', JSON.stringify(st));
await page.screenshot({ path: out + '02-gameplay.png' });
await page.waitForTimeout(6000);
await page.screenshot({ path: out + '03-gameplay-later.png' });
await page.dispatchEvent('#btnFire', 'pointerup', { pointerType: 'touch' });
st = await page.evaluate(() => ({ state: __mib.state, kills: __mib.G.kills, toSpawn: __mib.G.toSpawn, bc: Math.round(__mib.G.barricade), hp: Math.round(__mib.G.health), ammoLeft: __mib.totalAmmo() }));
console.log('later', JSON.stringify(st));
const ammoBeforeClear = await page.evaluate(() => __mib.totalAmmo());
// finish the wave quickly via the test hook, then reach the search screen
await page.evaluate(() => __mib.clearWave());
await page.waitForFunction(() => __mib.state === 'search', null, { timeout: 15000 });
await page.waitForTimeout(400);
const stashAfterWave = await page.evaluate(() => __mib.save.stashAmmo);
console.log('stash after wave (leftover bullets):', stashAfterWave, 'ammo at clear:', ammoBeforeClear);
if (stashAfterWave !== ammoBeforeClear) errors.push(`[test] stash ${stashAfterWave} != leftover ${ammoBeforeClear}`);
await page.tap('.loc >> nth=0');
await page.waitForTimeout(1200);
await page.tap('.loc >> nth=1');
await page.waitForTimeout(1200);
const stashAfterSearch = await page.evaluate(() => __mib.save.stashAmmo);
console.log('stash after two searches:', stashAfterSearch, await page.evaluate(() => (__mib.save.lastFinds || []).map(f => f.text || f)));
await page.screenshot({ path: out + '04-search.png' });
// inject a known ammo find so carry-over can be asserted exactly
await page.evaluate(() => __mib.findAmmo(15));
const stashWithFind = await page.evaluate(() => __mib.save.stashAmmo);
console.log('stash after +15 found:', stashWithFind);
if (stashWithFind !== stashAfterSearch + 15) errors.push(`[test] findAmmo did not add 15 (${stashAfterSearch} -> ${stashWithFind})`);
// reload page -> continue should exist
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const cont = await page.isVisible('#btnContinue');
console.log('continue visible after reload:', cont, await page.textContent('#btnContinue'));
await page.tap('#btnContinue');
await page.waitForTimeout(300);
const stashOnContinue = await page.evaluate(() => __mib.save.stashAmmo);
console.log('stash on continue:', stashOnContinue);
await page.tap('#btnNextWave');
await page.waitForTimeout(2500);
const wave2 = await page.evaluate(() => ({
  state: __mib.state, wave: __mib.save.wave,
  allotment: __mib.waveAllotment(),
  ammo: __mib.totalAmmo(),
  stash: __mib.save.stashAmmo,
  hud: document.getElementById('hudAmmo').textContent,
}));
console.log('wave2', JSON.stringify(wave2));
if (wave2.ammo !== wave2.allotment + stashOnContinue) {
  errors.push(`[test] wave2 ammo ${wave2.ammo} != allotment ${wave2.allotment} + carried ${stashOnContinue}`);
}
await page.evaluate(() => { __mib.G.health = 0; });
await page.waitForTimeout(500);
await page.screenshot({ path: out + '05-gameover.png' });
console.log('final state', await page.evaluate(() => __mib.state));
console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
if (errors.some((e) => e.startsWith('[test]') || e.startsWith('[pageerror]'))) process.exitCode = 1;
await browser.close();
