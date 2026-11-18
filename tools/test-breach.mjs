// Checks barricade breach -> zombies hurt the player -> natural game over, plus pistol fire/reload.
import { chromium } from 'playwright-core';
const URL_ = process.env.URL || 'http://localhost:8642/';
const out = new URL('../screenshots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForFunction(() => __mib && __mib.player && __mib.player.userData && __mib.player.userData.ready, null, { timeout: 15000 });
await page.tap('#btnNew');
await page.waitForTimeout(500);
const start = await page.evaluate(() => ({
  weapon: document.getElementById('hudWeapon').textContent,
  hud: document.getElementById('hudAmmo').textContent,
  ammo: { ...__mib.save.ammo.pistol },
  total: __mib.totalAmmo(),
  allotment: __mib.waveAllotment(),
}));
console.log('weapon:', start.weapon, start.hud, JSON.stringify(start));
if (start.total !== start.allotment) errors.push(`wave ammo ${start.total} != allotment ${start.allotment}`);
if (/\u221e|Infinity/.test(start.hud)) errors.push(`HUD still shows infinite ammo: ${start.hud}`);
await page.keyboard.down(' '); await page.waitForTimeout(1500); await page.keyboard.up(' ');
const afterFire = await page.evaluate(() => ({ hud: document.getElementById('hudAmmo').textContent, ammo: { ...__mib.save.ammo.pistol }, total: __mib.totalAmmo() }));
console.log('after firing:', afterFire.hud, JSON.stringify(afterFire.ammo));
if (afterFire.total >= start.total) errors.push(`firing did not spend ammo (${start.total} -> ${afterFire.total})`);
await page.keyboard.press('r'); await page.waitForTimeout(2000);
const afterReload = await page.evaluate(() => ({ hud: document.getElementById('hudAmmo').textContent, ammo: { ...__mib.save.ammo.pistol }, total: __mib.totalAmmo() }));
console.log('after reload:', afterReload.hud, JSON.stringify(afterReload.ammo));
if (afterReload.ammo.mag <= afterFire.ammo.mag) errors.push(`reload did not refill mag (${afterFire.ammo.mag} -> ${afterReload.ammo.mag})`);
if (afterReload.total !== afterFire.total) errors.push(`reload changed total ammo (${afterFire.total} -> ${afterReload.total})`);
// weaken the barricade and push zombies forward
await page.evaluate(() => { __mib.G.barricade = 3; for (const z of __mib.G.zombies) z.z = -4; __mib.G.spawnT = 0; });
await page.waitForFunction(() => __mib.G.health < 100, null, { timeout: 90000 });
console.log('player being hurt, hp =', await page.evaluate(() => Math.round(__mib.G.health)));
await page.screenshot({ path: out + '06-breach.png' });
await page.waitForFunction(() => __mib.state === 'gameover', null, { timeout: 120000 });
console.log('natural game over reached');
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
