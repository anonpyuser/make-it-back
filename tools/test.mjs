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
await page.waitForFunction(() => __mib.characterState && __mib.characterState().isSkinned, null, { timeout: 20000 });
await page.waitForFunction(() => __mib.animsReady(), null, { timeout: 15000 });
await page.waitForTimeout(400);
const anims = await page.evaluate(() => __mib.animsReady());
console.log('anims ready on title:', anims, await page.evaluate(() => __mib.characterState()));
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

// Pointer helpers: movement is a hold on the left/right HALF of the screen,
// well above the aim stick. The stick itself must never start a move.
const ptr = async (type, id, x, y, extra = {}) => {
  await page.evaluate(({ type, id, x, y, extra }) => {
    const ev = new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerType: 'touch',
      pointerId: id, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1,
      isPrimary: id === 1, ...extra,
    });
    const el = document.elementFromPoint(x, y) || window;
    el.dispatchEvent(ev);
  }, { type, id, x, y, extra });
};
const leftMove = { x: 80, y: 420 };
const rightMove = { x: 310, y: 420 };
const holdHalf = async (side, ms, id = 11) => {
  const p = side === 'left' ? leftMove : rightMove;
  await ptr('pointerdown', id, p.x, p.y);
  await page.waitForTimeout(ms);
  await ptr('pointerup', id, p.x, p.y);
};

// --- Aim stick must be visible, and touching it must NEVER move the player ---
const stickVis = await page.evaluate(() => {
  const s = document.getElementById('aimStick');
  if (!s) return { ok: false, reason: 'missing' };
  const r = s.getBoundingClientRect();
  const st = getComputedStyle(s);
  return { ok: true, w: r.width, h: r.height, x: r.x, y: r.y, vis: st.visibility, op: st.opacity, display: st.display };
});
console.log('aim stick', JSON.stringify(stickVis));
if (!stickVis.ok) errors.push('[test] aim stick element missing');
if (stickVis.ok && (stickVis.w < 80 || stickVis.h < 80)) errors.push(`[test] aim stick too small (${stickVis.w}x${stickVis.h})`);
if (stickVis.ok && (stickVis.vis === 'hidden' || stickVis.display === 'none' || +stickVis.op === 0)) {
  errors.push('[test] aim stick is not visible');
}
await page.screenshot({ path: out + '12-joystick.png' });

const layout = await page.evaluate(() => {
  const canvas = document.querySelector('#game canvas');
  const fire = document.getElementById('btnFire');
  const cr = canvas.getBoundingClientRect();
  const fr = fire ? fire.getBoundingClientRect() : null;
  const meta = document.querySelector('meta[name="viewport"]')?.content || '';
  return {
    vw: innerWidth, vh: innerHeight,
    canvas: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
    fire: fr ? { w: fr.width, h: fr.height, x: fr.x, y: fr.y, text: fire.textContent.trim(), vis: getComputedStyle(fire).visibility, display: getComputedStyle(fire).display } : null,
    viewportFit: /viewport-fit=cover/.test(meta),
    hudTop: getComputedStyle(document.querySelector('.hud-top')).top,
    css: document.documentElement.style,
  };
});
console.log('layout', JSON.stringify(layout));
if (layout.canvas.h < layout.vh * 0.95 || layout.canvas.w < layout.vw * 0.95) {
  errors.push(`[test] canvas does not fill the screen (${layout.canvas.w}x${layout.canvas.h} vs ${layout.vw}x${layout.vh})`);
}
if (Math.abs(layout.canvas.y) > 2) errors.push(`[test] canvas does not start at the top (y=${layout.canvas.y})`);
if (!layout.fire) errors.push('[test] FIRE button missing');
if (layout.fire && (layout.fire.w < 90 || layout.fire.h < 90 || layout.fire.vis === 'hidden' || layout.fire.display === 'none')) {
  errors.push(`[test] FIRE button not clearly visible (${JSON.stringify(layout.fire)})`);
}
if (!layout.viewportFit) errors.push('[test] viewport-fit=cover missing from the viewport meta');

const pxBefore = await page.evaluate(() => __mib.G.px);
const stick = await page.evaluate(() => {
  const r = document.getElementById('aimStick').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await ptr('pointerdown', 7, stick.x, stick.y);
await ptr('pointermove', 7, stick.x + 40, stick.y);
await page.waitForTimeout(400);
const afterStick = await page.evaluate(() => __mib.inputState());
console.log('after stick drag', JSON.stringify(afterStick), 'pxBefore', pxBefore);
if (afterStick.left || afterStick.right) errors.push('[test] aim-stick touch started a move (left/right was set)');
if (Math.abs(afterStick.px - pxBefore) > 0.05) errors.push(`[test] aim-stick touch moved the player (px ${pxBefore} -> ${afterStick.px})`);
if (Math.abs(afterStick.aimYaw) < 0.05) errors.push('[test] aim-stick drag did not change aimYaw');
await page.screenshot({ path: out + '13-joystick-aim.png' });
await ptr('pointerup', 7, stick.x + 40, stick.y);
await page.waitForTimeout(100);

const pxBeforeFire = await page.evaluate(() => __mib.G.px);
const firePos = await page.evaluate(() => {
  const r = document.getElementById('btnFire').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const ammoBeforeFire = await page.evaluate(() => __mib.totalAmmo());
await ptr('pointerdown', 9, firePos.x, firePos.y);
await page.waitForTimeout(400);
const afterFire = await page.evaluate(() => ({ ...__mib.inputState(), ammo: __mib.totalAmmo() }));
console.log('after FIRE hold', JSON.stringify(afterFire), 'pxBefore', pxBeforeFire);
if (afterFire.left || afterFire.right) errors.push('[test] FIRE-button touch started a move (left/right was set)');
if (Math.abs(afterFire.px - pxBeforeFire) > 0.05) errors.push(`[test] FIRE-button touch moved the player (px ${pxBeforeFire} -> ${afterFire.px})`);
if (!afterFire.fire) errors.push('[test] FIRE-button hold did not set input.fire');
if (afterFire.ammo >= ammoBeforeFire) errors.push(`[test] FIRE-button hold did not spend ammo (${ammoBeforeFire} -> ${afterFire.ammo})`);
await page.screenshot({ path: out + '14-fire.png' });
await ptr('pointerup', 9, firePos.x, firePos.y);
await page.waitForTimeout(100);

// Head bone samples while strafing LEFT then RIGHT for 5s each.
const sampleHead = async (ms = 5000) => page.evaluate((ms) => new Promise((resolve) => {
  const vals = [];
  const t0 = performance.now();
  const step = () => {
    const p = __mib.headPose();
    if (p) vals.push(p);
    if (performance.now() - t0 < ms) requestAnimationFrame(step);
    else resolve(vals);
  };
  requestAnimationFrame(step);
}), ms);
const unwrap = (angles) => {
  if (!angles.length) return [];
  const out = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let x = angles[i], prev = out[i - 1];
    while (x - prev > Math.PI) x -= Math.PI * 2;
    while (prev - x > Math.PI) x += Math.PI * 2;
    out.push(x);
  }
  return out;
};
const range = (a) => a.length ? Math.max(...a) - Math.min(...a) : 0;
const reportHead = (label, samples) => {
  const wys = unwrap(samples.map((s) => s.wy));
  const lys = unwrap(samples.map((s) => s.ly));
  const rep = { n: samples.length, skinned: samples[0] && samples[0].skinned, wyRange: range(wys), lyRange: range(lys) };
  console.log('head pose', label, JSON.stringify(rep));
  if (!samples.length) errors.push(`[test] no head pose samples (${label})`);
  if (rep.wyRange > 1.5) errors.push(`[test] ${label}: head world yaw range ${rep.wyRange.toFixed(3)} rad — head is spinning`);
  if (rep.lyRange > 1.5) errors.push(`[test] ${label}: head local yaw range ${rep.lyRange.toFixed(3)} rad — head is spinning`);
  return rep;
};
await ptr('pointerdown', 11, leftMove.x, leftMove.y);
reportHead('strafe-left-5s', await sampleHead(5000));
await page.screenshot({ path: out + '07-strafe.png' });
await ptr('pointerup', 11, leftMove.x, leftMove.y);
await page.waitForTimeout(200);
await ptr('pointerdown', 12, rightMove.x, rightMove.y);
reportHead('strafe-right-5s', await sampleHead(5000));
await ptr('pointerup', 12, rightMove.x, rightMove.y);

// 60Hz Head local-quaternion sample: consecutive-frame angle must stay small,
// and accumulated rotation must not look like a continuous 360° spin.
const headQuat = async (dir) => page.evaluate((dir) => __mib.sampleHeadQuat(dir, 3, 60), dir);
for (const dir of ['left', 'right']) {
  const r = await headQuat(dir);
  console.log('head quat 60Hz', dir, JSON.stringify(r));
  if (!r.n) errors.push(`[test] no 60Hz head samples (${dir})`);
  if (r.maxStep > 0.2) errors.push(`[test] ${dir} strafe: head quat jumped ${r.maxStep.toFixed(3)} rad between frames`);
  if (r.acc > 2.0) errors.push(`[test] ${dir} strafe: head accumulated ${r.acc.toFixed(3)} rad over 3s — head is spinning`);
  if (r.flips > 0) errors.push(`[test] ${dir} strafe: ${r.flips} quaternion sign flips between frames`);
}
const trans = await page.evaluate(() => {
  const a = __mib.sampleHeadQuat('idle', 0.3, 60);
  const b = __mib.sampleHeadQuat('left', 0.5, 60);
  const c = __mib.sampleHeadQuat('idle', 0.3, 60);
  return { into: b, out: c, maxStep: Math.max(a.maxStep, b.maxStep, c.maxStep), acc: a.acc + b.acc + c.acc, flips: a.flips + b.flips + c.flips };
});
console.log('head quat idle<->strafe', JSON.stringify(trans));
if (trans.maxStep > 0.35) errors.push(`[test] idle↔strafe crossfade jumped the head ${trans.maxStep.toFixed(3)} rad`);
if (trans.flips > 0) errors.push(`[test] idle↔strafe crossfade had ${trans.flips} quat sign flips`);

// mid-strafe still (already captured 07). Second-finger tap to shoot.
await ptr('pointerdown', 11, leftMove.x, leftMove.y);
await page.waitForTimeout(300);
const ammoBeforeTap = await page.evaluate(() => __mib.totalAmmo());
await ptr('pointerdown', 8, rightMove.x, 500);
await page.waitForTimeout(400);
console.log('shoot clip / input', await page.evaluate(() => ({ clip: __mib.clip(), ...__mib.inputState(), ammo: __mib.totalAmmo() })));
await page.screenshot({ path: out + '08-shooting.png' });
const ammoDuring = await page.evaluate(() => __mib.totalAmmo());
if (ammoDuring >= ammoBeforeTap) errors.push(`[test] second-finger tap did not spend ammo (${ammoBeforeTap} -> ${ammoDuring})`);
await ptr('pointerup', 8, rightMove.x, 500);
await ptr('pointerup', 11, leftMove.x, leftMove.y);

// hold fire (space) while moving left/right
await page.keyboard.down(' ');
await holdHalf('left', 1200, 21);
await holdHalf('right', 2400, 22);
await holdHalf('left', 1200, 21);
await page.keyboard.up(' ');

const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('headless fps (software GL):', fps);
// wait until zombies are close enough to see clearly (game time runs slow under software GL)
await page.waitForFunction(() => __mib.G.zombies.some(z => !z.dead && z.z > -16), null, { timeout: 120000 }).catch(() => console.log('no zombie got close in time'));
let st = await page.evaluate(() => ({ state: __mib.state, kills: __mib.G.kills, zombies: __mib.G.zombies.length, px: __mib.G.px, ammo: __mib.save.ammo.pistol, total: __mib.totalAmmo(), bc: __mib.G.barricade }));
console.log('mid-wave', JSON.stringify(st));
await page.screenshot({ path: out + '02-gameplay.png' });
await page.waitForTimeout(6000);
await page.screenshot({ path: out + '03-gameplay-later.png' });
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
