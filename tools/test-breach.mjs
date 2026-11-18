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
await page.tap('#btnNew');
await page.waitForTimeout(500);
console.log('weapon:', await page.textContent('#hudWeapon'), await page.textContent('#hudAmmo'));
await page.dispatchEvent('#btnFire', 'pointerdown'); await page.waitForTimeout(1500); await page.dispatchEvent('#btnFire', 'pointerup');
console.log('after firing:', await page.textContent('#hudWeapon'), await page.textContent('#hudAmmo'));
await page.tap('#btnReload'); await page.waitForTimeout(2000);
console.log('after reload:', await page.textContent('#hudAmmo'));
// weaken the barricade and push zombies forward
await page.evaluate(() => { __mib.G.barricade = 3; for (const z of __mib.G.zombies) z.z = -4; __mib.G.spawnT = 0; });
await page.waitForFunction(() => __mib.G.health < 100, null, { timeout: 90000 });
console.log('player being hurt, hp =', await page.evaluate(() => Math.round(__mib.G.health)));
await page.screenshot({ path: out + '06-breach.png' });
await page.waitForFunction(() => __mib.state === 'gameover', null, { timeout: 120000 });
console.log('natural game over reached');
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
