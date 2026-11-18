// Screens, HUD, touch + keyboard input.
import { ctx, $ } from './core.js';
import { PLAYER_MAX, BARRICADE_MAX } from './config.js';
import { newSave, loadSave, clearSave, bestWave } from './save.js';
import { sfx, unlockAudio, isMuted, setMuted } from './audio.js';
import { weapon, ammo, startReload, swapWeapon } from './weapons.js';
import { startWave, clearActors } from './waves.js';
import { openSearch, repairBarricade } from './search.js';
import { resetPlayer } from './player.js';

const SCREENS = ['title', 'hud', 'pause', 'search', 'gameover'];
export function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id && !(id === 'pause' && s === 'hud'));
}

// ----- HUD -----
const cache = {};
function setText(id, txt) { if (cache[id] !== txt) { cache[id] = txt; $(id).textContent = txt; } }
function setBar(id, frac) {
  const v = Math.max(0, Math.min(1, frac)).toFixed(3);
  if (cache[id] !== v) { cache[id] = v; $(id).style.transform = `scaleX(${v})`; }
}
export function updateHud() {
  const { G, save } = ctx;
  setText('hudWave', `WAVE ${save.wave}`);
  setText('hudLeft', `🧟 ${G.toSpawn + G.zombies.filter(z => !z.dead).length}`);
  setText('hudSurv', `🧍 ${G.survivors.length}`);
  setBar('barHp', G.health / PLAYER_MAX);
  setBar('barBc', G.barricade / BARRICADE_MAX);
  const W = weapon(), A = ammo();
  setText('hudWeapon', W.name.toUpperCase());
  setText('hudAmmo', `${A.mag} / ${W.infinite ? '∞' : A.reserve}`);
  const rb = $('hudReload');
  if (G.reloadT > 0) { rb.style.visibility = 'visible'; rb.firstElementChild.style.width = `${(1 - G.reloadT / W.reload) * 100}%`; }
  else if (rb.style.visibility !== 'hidden') rb.style.visibility = 'hidden';
}
let bannerT = 0;
export function showBanner(html, secs = 2) { $('banner').innerHTML = html; $('banner').classList.add('show'); bannerT = secs; }
export function updateBanner(dt) { if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); } }
let hurtOn = false;
export function setHurt(on) { if (on !== hurtOn) { hurtOn = on; $('hurt').style.opacity = on ? 0.8 : 0; } }

// ----- title / pause -----
export function goTitle() {
  clearActors();
  ctx.state = 'title';
  resetPlayer();
  ctx.world.barricade.setHealth(1);
  show('title');
  const s = loadSave();
  $('btnContinue').classList.toggle('hidden', !s);
  if (s) $('continueInfo').textContent = s.phase === 'search' ? `(day before wave ${s.wave})` : `(wave ${s.wave})`;
  const b = bestWave();
  $('bestWave').textContent = b ? `Best: survived wave ${b}` : '';
}
function releaseInputs() {
  const { input } = ctx;
  input.left = input.right = input.fire = false;
  document.querySelectorAll('.ctl.pressed').forEach(el => el.classList.remove('pressed'));
}
export function togglePause() {
  if (ctx.state === 'playing') { ctx.state = 'paused'; releaseInputs(); show('pause'); }
  else if (ctx.state === 'paused') { ctx.state = 'playing'; show('hud'); }
}
function refreshMute() { $('btnMute').textContent = isMuted() ? '🔇' : '🔊'; }

// ----- input -----
function bindHold(id, key) {
  const el = $(id);
  const on = (e) => { e.preventDefault(); unlockAudio(); ctx.input[key] = true; el.classList.add('pressed'); };
  const off = (e) => { e.preventDefault(); ctx.input[key] = false; el.classList.remove('pressed'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
const tap = (id, fn) => $(id).addEventListener('click', () => { unlockAudio(); fn(); });

export function initUI() {
  bindHold('btnLeft', 'left');
  bindHold('btnRight', 'right');
  bindHold('btnFire', 'fire');
  $('btnReload').addEventListener('pointerdown', (e) => { e.preventDefault(); startReload(); });
  $('btnSwap').addEventListener('pointerdown', (e) => { e.preventDefault(); swapWeapon(); });

  const input = ctx.input;
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') input.left = true;
    else if (k === 'd' || k === 'arrowright') input.right = true;
    else if (k === ' ') { input.fire = true; e.preventDefault(); }
    else if (k === 'r') startReload();
    else if (k === 'q') swapWeapon();
    else if (k === 'escape' || k === 'p') togglePause();
    unlockAudio();
  });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') input.left = false;
    else if (k === 'd' || k === 'arrowright') input.right = false;
    else if (k === ' ') input.fire = false;
  });
  // no iOS double-tap zoom / pinch on the game
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden && ctx.state === 'playing') togglePause(); });

  tap('btnMute', () => { setMuted(!isMuted()); refreshMute(); });
  tap('btnPause', togglePause);
  tap('btnResume', togglePause);
  tap('btnQuit', goTitle);
  tap('btnNew', () => { sfx.click(); clearSave(); ctx.save = newSave(); startWave(); });
  tap('btnContinue', () => {
    sfx.click();
    const s = loadSave();
    if (!s) return;
    ctx.save = s;
    if (s.phase === 'search') openSearch(); else startWave();
  });
  tap('btnRepair', repairBarricade);
  tap('btnNextWave', () => { sfx.click(); startWave(); });
  tap('btnRetry', () => { sfx.click(); ctx.save = loadSave() || newSave(); startWave(); });
  tap('btnGoTitle', () => { sfx.click(); goTitle(); });
  refreshMute();
}
