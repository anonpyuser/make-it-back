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
  setText('hudAmmo', `${A.mag} / ${A.reserve}`);
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
  input.aimYaw = 0; input.aimPitch = 0;
  playPointers.clear();
  resetStickKnob();
}
export function togglePause() {
  if (ctx.state === 'playing') { ctx.state = 'paused'; releaseInputs(); show('pause'); }
  else if (ctx.state === 'paused') { ctx.state = 'playing'; show('hud'); }
}
function refreshMute() { $('btnMute').textContent = isMuted() ? '🔇' : '🔊'; }

// ----- input -----
const tap = (id, fn) => $(id).addEventListener('click', () => { unlockAudio(); fn(); });

// ----- play controls: always-visible aim stick (bottom left), half-screen hold to move,
// second-finger or quick tap to fire. A touch that starts on the stick never moves him.
const AIM_YAW_MAX = 0.7;
const AIM_PITCH_MAX = 0.4;
const TAP_MS = 220;
const TAP_MOVE_PX = 18;
const KNOB_TRAVEL = 36;
const playPointers = new Map();
let tapFireUntil = 0;

function resetStickKnob() {
  const knob = $('aimKnob');
  const stick = $('aimStick');
  if (knob) knob.style.transform = 'translate(0px, 0px)';
  if (stick) stick.classList.remove('active');
}

function isHudChrome(el) {
  return !!(el && el.closest && el.closest('.icon-btn, #btnPause, #btnMute, #pause, #search, #gameover, #title, .btn'));
}

// Hit-test the visible stick (plus a little padding) in screen space.
function isOnAimStick(el, x, y) {
  const stick = $('aimStick');
  if (!stick || stick.closest('.hidden')) return false;
  if (el && el.closest && el.closest('#aimStick')) return true;
  const r = stick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const rad = Math.max(r.width, r.height) / 2 + 10;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= rad * rad;
}

function stickCenter() {
  const r = $('aimStick').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rad: Math.max(r.width, r.height) / 2 };
}

function applyStick(x, y) {
  const { x: cx, y: cy, rad } = stickCenter();
  let dx = x - cx, dy = y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const used = Math.min(len, rad);
  dx = (dx / len) * used;
  dy = (dy / len) * used;
  const nx = dx / rad, ny = dy / rad;
  const knob = $('aimKnob');
  if (knob) knob.style.transform = `translate(${nx * KNOB_TRAVEL}px, ${ny * KNOB_TRAVEL}px)`;
  // Stick right aims right (negative yaw: character faces -Z). Stick up aims up.
  ctx.input.aimYaw = Math.max(-AIM_YAW_MAX, Math.min(AIM_YAW_MAX, -nx * AIM_YAW_MAX));
  ctx.input.aimPitch = Math.max(-AIM_PITCH_MAX, Math.min(0.35, -ny * AIM_PITCH_MAX));
}

function syncMoveFire() {
  const input = ctx.input;
  let left = false, right = false, fire = false;
  for (const p of playPointers.values()) {
    if (p.kind === 'moveLeft') left = true;
    if (p.kind === 'moveRight') right = true;
    if (p.kind === 'fire') fire = true;
  }
  if (performance.now() < tapFireUntil) fire = true;
  input.left = left;
  input.right = right;
  input.fire = fire;
}

function pulseFire() {
  tapFireUntil = performance.now() + 90;
  ctx.input.fire = true;
  setTimeout(syncMoveFire, 100);
}

function initPlayControls(input) {
  const onDown = (e) => {
    if (ctx.state !== 'playing') return;
    if (isHudChrome(e.target)) return;
    const x = e.clientX, y = e.clientY;
    if (x == null || y == null) return;
    e.preventDefault();
    unlockAudio();
    if (isOnAimStick(e.target, x, y)) {
      playPointers.set(e.pointerId, { kind: 'aim', t0: performance.now() });
      $('aimStick')?.classList.add('active');
      applyStick(x, y);
      return;
    }
    const busy = [...playPointers.values()].some((p) => p.kind === 'moveLeft' || p.kind === 'moveRight' || p.kind === 'aim');
    if (busy) {
      playPointers.set(e.pointerId, { kind: 'fire', t0: performance.now() });
      syncMoveFire();
      return;
    }
    const kind = x < innerWidth / 2 ? 'moveLeft' : 'moveRight';
    playPointers.set(e.pointerId, { kind, startX: x, startY: y, t0: performance.now(), maybeTap: true });
    syncMoveFire();
  };
  const onMove = (e) => {
    const p = playPointers.get(e.pointerId);
    if (!p || ctx.state !== 'playing') return;
    if (p.kind === 'aim') {
      e.preventDefault();
      applyStick(e.clientX, e.clientY);
      return;
    }
    if (p.maybeTap) {
      const dx = e.clientX - p.startX, dy = e.clientY - p.startY;
      if (Math.hypot(dx, dy) > TAP_MOVE_PX) p.maybeTap = false;
    }
  };
  const onUp = (e) => {
    const p = playPointers.get(e.pointerId);
    if (!p) return;
    const held = performance.now() - p.t0;
    if (p.kind === 'aim') {
      resetStickKnob();
      input.aimYaw = 0;
      input.aimPitch = 0;
    } else if (p.maybeTap && held <= TAP_MS && (p.kind === 'moveLeft' || p.kind === 'moveRight')) {
      playPointers.delete(e.pointerId);
      syncMoveFire();
      pulseFire();
      return;
    }
    playPointers.delete(e.pointerId);
    syncMoveFire();
  };
  addEventListener('pointerdown', onDown, { passive: false });
  addEventListener('pointermove', onMove, { passive: false });
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
}


export function initUI() {
  const input = ctx.input;
  initPlayControls(input);

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
