// Weapons: pistol stats (with upgrades), firing (hitscan), reloading.
import * as THREE from '../vendor/three.module.min.js';
import { ctx } from './core.js';
import { sfx } from './audio.js';
import { muzzleFlash, addTracer } from './effects.js';
import { damageZombie } from './zombies.js';
import { PISTOL_UPGRADE_MAX } from './config.js';

const PISTOL_BASE = {
  name: 'Pistol',
  damage: 26,
  rate: 3.2,
  mag: 12,
  reload: 1.1,
  spread: 0.02,
  pellets: 1,
  pierce: 1,
  infinite: true,
  maxReserve: 0,
};

export const UPGRADE_INFO = {
  damage: { label: 'damage', icon: '💥', text: 'Pistol upgrade: more damage' },
  rate:   { label: 'fire rate', icon: '⚡', text: 'Pistol upgrade: faster fire rate' },
  mag:    { label: 'clip size', icon: '🔧', text: 'Pistol upgrade: bigger clip (+4)' },
  reload: { label: 'reload speed', icon: '⏱', text: 'Pistol upgrade: quicker reload' },
};

function levels() {
  const u = (ctx.save && ctx.save.upgrades) || {};
  return {
    damage: Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.damage | 0)),
    rate:   Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.rate | 0)),
    mag:    Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.mag | 0)),
    reload: Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.reload | 0)),
  };
}

// Effective pistol stats after upgrades. Other guns were removed.
export function pistolStats(upgrades) {
  const u = upgrades || levels();
  return {
    ...PISTOL_BASE,
    damage: PISTOL_BASE.damage + u.damage * 6,
    rate:   PISTOL_BASE.rate + u.rate * 0.6,
    mag:    PISTOL_BASE.mag + u.mag * 4,
    reload: Math.max(0.45, PISTOL_BASE.reload - u.reload * 0.15),
  };
}

export const WEAPONS = { pistol: PISTOL_BASE };
export const WEAPON_ORDER = ['pistol'];

export const weapon = () => pistolStats();
export const ammo = () => ctx.save.ammo.pistol;

const muzzle = new THREE.Vector3(), end = new THREE.Vector3();
const fwd = new THREE.Vector3();
const gunQ = new THREE.Quaternion();

// Holding fire shoots at the weapon's fire rate (semi-autos too, for easy touch play).
export function updateWeapons(dt) {
  const { G, input } = ctx;
  G.fireCd -= dt;
  if (G.reloadT > 0) { G.reloadT -= dt; if (G.reloadT <= 0) { G.reloadT = 0; finishReload(); } }
  if (input.fire && G.waveEndT < 0) tryFire();
}

function tryFire() {
  const { G, player } = ctx;
  const W = weapon(), A = ammo();
  if (G.reloadT > 0 || G.fireCd > 0) return;
  if (A.mag <= 0) {
    if (W.infinite || A.reserve > 0) startReload();
    else { sfx.empty(); G.fireCd = 0.3; }
    return;
  }
  A.mag--;
  G.fireCd = 1 / W.rate;
  sfx.shot('pistol');
  const gun = player.userData.gun;
  gun.getWorldPosition(muzzle);
  gun.getWorldQuaternion(gunQ);
  fwd.set(0, 0, -1).applyQuaternion(gunQ);
  muzzle.addScaledVector(fwd, 0.45);
  muzzleFlash(muzzle);
  if (typeof player.userData.kickGun === 'function') player.userData.kickGun();
  for (let i = 0; i < W.pellets; i++) shootRay(muzzle, (Math.random() - 0.5) * 2 * W.spread, W.damage, W.pierce);
  if (A.mag === 0 && (W.infinite || A.reserve > 0)) startReload();
}

// A shot travels along -z from the muzzle, drifting sideways by its spread angle.
// It hits the nearest `pierce` zombies in its path.
function shootRay(from, ang, dmg, pierce) {
  const tan = Math.tan(ang);
  const hits = [];
  for (const z of ctx.G.zombies) {
    if (z.dead) continue;
    const dist = from.z - z.z;
    if (dist < 0) continue;
    const xAt = from.x + tan * dist;
    if (Math.abs(xAt - z.x) < z.radius + 0.18) hits.push([dist, z]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  let endDist = 40;
  for (let i = 0; i < Math.min(pierce, hits.length); i++) { damageZombie(hits[i][1], dmg); endDist = hits[i][0]; }
  end.set(from.x + tan * endDist, from.y - Math.min(endDist, 30) * 0.004, from.z - endDist);
  addTracer(from, end);
}

export function startReload() {
  const W = weapon(), A = ammo();
  if (ctx.G.reloadT > 0 || A.mag >= W.mag || (!W.infinite && A.reserve <= 0)) return;
  ctx.G.reloadT = W.reload;
  sfx.reload();
}
function finishReload() {
  const W = weapon(), A = ammo();
  const take = W.infinite ? W.mag - A.mag : Math.min(W.mag - A.mag, A.reserve);
  A.mag += take; if (!W.infinite) A.reserve -= take;
}

// Kept so leftover keyboard/UI hooks don't crash. The swap button is hidden.
export function swapWeapon() { /* pistol only */ }

export function applyPistolUpgrade(save, kind) {
  if (!save.upgrades) save.upgrades = { damage: 0, rate: 0, mag: 0, reload: 0 };
  const info = UPGRADE_INFO[kind];
  if (!info) return null;
  const cur = save.upgrades[kind] | 0;
  if (cur >= PISTOL_UPGRADE_MAX) return { maxed: true, ...info };
  const oldMag = pistolStats(save.upgrades).mag;
  save.upgrades[kind] = cur + 1;
  if (kind === 'mag') {
    const neu = pistolStats(save.upgrades).mag;
    const A = save.ammo.pistol;
    if (A && A.mag >= oldMag) A.mag = neu;
  }
  return { maxed: false, ...info, level: save.upgrades[kind] };
}
