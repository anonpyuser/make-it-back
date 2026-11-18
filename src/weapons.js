// Weapons: pistols (with upgrades), limited ammo, firing (hitscan), reloading.
import * as THREE from '../vendor/three.module.min.js';
import { ctx } from './core.js';
import { sfx } from './audio.js';
import { muzzleFlash, addTracer } from './effects.js';
import { damageZombie, shotsToClearTypes } from './zombies.js';
import { PISTOL_UPGRADE_MAX, AMMO_BUFFER } from './config.js';
import { gunAim, laserHitDist, updateLaser, notifyShot } from './player.js';

const PISTOL_BASES = {
  pistol: {
    name: 'Pistol',
    damage: 26, rate: 3.2, mag: 12, reload: 1.1,
    spread: 0.02, pellets: 1, pierce: 1, infinite: false,
  },
  revolver: {
    name: 'Revolver',
    damage: 44, rate: 1.7, mag: 6, reload: 1.45,
    spread: 0.012, pellets: 1, pierce: 1, infinite: false,
  },
  auto: {
    name: 'Auto Pistol',
    damage: 16, rate: 7.2, mag: 20, reload: 1.25,
    spread: 0.04, pellets: 1, pierce: 1, infinite: false,
  },
};

export const UPGRADE_INFO = {
  damage: { label: 'damage', icon: '💥', text: 'Pistol upgrade: more damage' },
  rate:   { label: 'fire rate', icon: '⚡', text: 'Pistol upgrade: faster fire rate' },
  mag:    { label: 'clip size', icon: '🔧', text: 'Pistol upgrade: bigger clip (+4)' },
  reload: { label: 'reload speed', icon: '⏱', text: 'Pistol upgrade: quicker reload' },
};

export const PISTOL_INFO = {
  revolver: { icon: '🔫', text: 'Found a revolver: slower, hits much harder' },
  auto:     { icon: '🔫', text: 'Found an auto pistol: sprays faster, lighter shots' },
};

function levels(save) {
  const u = (save && save.upgrades) || (ctx.save && ctx.save.upgrades) || {};
  return {
    damage: Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.damage | 0)),
    rate:   Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.rate | 0)),
    mag:    Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.mag | 0)),
    reload: Math.max(0, Math.min(PISTOL_UPGRADE_MAX, u.reload | 0)),
  };
}

export function currentId(save) {
  const s = save || ctx.save;
  const id = (s && s.current) || 'pistol';
  return PISTOL_BASES[id] ? id : 'pistol';
}

// Effective pistol stats after upgrades, for the equipped pistol.
export function pistolStats(save) {
  const s = save || ctx.save;
  const base = PISTOL_BASES[currentId(s)];
  const u = levels(s);
  return {
    ...base,
    damage: base.damage + u.damage * 6,
    rate:   base.rate + u.rate * 0.6,
    mag:    base.mag + u.mag * 4,
    reload: Math.max(0.45, base.reload - u.reload * 0.15),
  };
}

export const WEAPONS = PISTOL_BASES;
export const WEAPON_ORDER = ['pistol', 'revolver', 'auto'];

export const weapon = () => pistolStats();
export const ammo = () => ctx.save.ammo.pistol;

export function totalAmmo(save) {
  const s = save || ctx.save;
  const A = (s && s.ammo && s.ammo.pistol) || { mag: 0, reserve: 0 };
  return (A.mag | 0) + (A.reserve | 0);
}

export function waveAllotment(types, hpMul, damage) {
  return shotsToClearTypes(types, hpMul, damage) + AMMO_BUFFER;
}

// Fill the magazine and reserve from a fresh wave allotment plus carried stash.
export function grantWaveAmmo(save, types, cfg) {
  const W = pistolStats(save);
  const need = waveAllotment(types, cfg.hpMul, W.damage);
  const stash = save.stashAmmo | 0;
  save.stashAmmo = 0;
  const total = need + stash;
  if (!save.ammo) save.ammo = {};
  if (!save.ammo.pistol) save.ammo.pistol = { mag: 0, reserve: 0 };
  const A = save.ammo.pistol;
  A.mag = Math.min(W.mag, total);
  A.reserve = total - A.mag;
  return { need, stash, total };
}

export function stashRemainingAmmo(save) {
  const A = save.ammo?.pistol || { mag: 0, reserve: 0 };
  save.stashAmmo = (A.mag | 0) + (A.reserve | 0);
}

const muzzle = new THREE.Vector3(), end = new THREE.Vector3();
const fwd = new THREE.Vector3();
const shootDir = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3();

// Holding fire shoots at the weapon's fire rate (semi-autos too, for easy touch play).
export function updateWeapons(dt) {
  const { G, input } = ctx;
  G.fireCd -= dt;
  if (G.reloadT > 0) { G.reloadT -= dt; if (G.reloadT <= 0) { G.reloadT = 0; finishReload(); } }
  if (input.fire && G.waveEndT < 0) tryFire();
  updateLaser();
}

function tryFire() {
  const { G } = ctx;
  const W = weapon(), A = ammo();
  if (G.reloadT > 0 || G.fireCd > 0) return;
  if (A.mag <= 0) {
    if (A.reserve > 0) startReload();
    else { sfx.empty(); G.fireCd = 0.3; }
    return;
  }
  A.mag--;
  G.fireCd = 1 / W.rate;
  sfx.shot('pistol');
  notifyShot();
  if (!gunAim(muzzle, fwd)) return;
  muzzleFlash(muzzle);
  if (typeof ctx.player.userData.kickGun === 'function') ctx.player.userData.kickGun();
  for (let i = 0; i < W.pellets; i++) {
    shootDir.copy(fwd);
    if (W.spread) {
      right.crossVectors(fwd, up);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      else right.normalize();
      shootDir.addScaledVector(right, (Math.random() - 0.5) * 2 * W.spread);
      shootDir.addScaledVector(up, (Math.random() - 0.5) * 2 * W.spread * 0.5);
      shootDir.normalize();
    }
    shootRay(muzzle, shootDir, W.damage, W.pierce);
  }
  if (A.mag === 0 && A.reserve > 0) startReload();
}

function shootRay(from, dir, dmg, pierce) {
  const hits = [];
  for (const z of ctx.G.zombies) {
    if (z.dead) continue;
    const ox = from.x - z.x, oz = from.z - z.z;
    const dx = dir.x, dz = dir.z;
    const rad = z.radius + 0.18;
    const a = dx * dx + dz * dz;
    const b = ox * dx + oz * dz;
    const c = ox * ox + oz * oz - rad * rad;
    const disc = b * b - a * c;
    if (disc < 0 || a < 1e-8) continue;
    const t = (-b - Math.sqrt(disc)) / a;
    if (t < 0.05) continue;
    const y = from.y + dir.y * t;
    if (y < 0.05 || y > 2.4 * (z.mesh?.scale?.x || 1)) continue;
    hits.push([t, z]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  let endDist = laserHitDist(from, dir, 40);
  for (let i = 0; i < Math.min(pierce, hits.length); i++) {
    damageZombie(hits[i][1], dmg);
    endDist = hits[i][0];
  }
  end.copy(from).addScaledVector(dir, endDist);
  addTracer(from, end);
}

export function startReload() {
  const W = weapon(), A = ammo();
  if (ctx.G.reloadT > 0 || A.mag >= W.mag || A.reserve <= 0) return;
  ctx.G.reloadT = W.reload;
  sfx.reload();
}
function finishReload() {
  const W = weapon(), A = ammo();
  const take = Math.min(W.mag - A.mag, A.reserve);
  A.mag += take;
  A.reserve -= take;
}

export function swapWeapon() {
  const save = ctx.save;
  if (!save) return;
  const owned = (save.weapons || ['pistol']).filter((id) => PISTOL_BASES[id]);
  if (owned.length < 2) return;
  const i = Math.max(0, owned.indexOf(currentId(save)));
  save.current = owned[(i + 1) % owned.length];
  const W = pistolStats(save);
  const A = save.ammo.pistol;
  const total = (A.mag | 0) + (A.reserve | 0);
  A.mag = Math.min(W.mag, total);
  A.reserve = total - A.mag;
}

export function applyPistolUpgrade(save, kind) {
  if (!save.upgrades) save.upgrades = { damage: 0, rate: 0, mag: 0, reload: 0 };
  const info = UPGRADE_INFO[kind];
  if (!info) return null;
  const cur = save.upgrades[kind] | 0;
  if (cur >= PISTOL_UPGRADE_MAX) return { maxed: true, ...info };
  const oldMag = pistolStats(save).mag;
  save.upgrades[kind] = cur + 1;
  if (kind === 'mag') {
    const neu = pistolStats(save).mag;
    const A = save.ammo.pistol;
    if (A && A.mag >= oldMag) A.mag = neu;
  }
  return { maxed: false, ...info, level: save.upgrades[kind] };
}

export function givePistol(save, id) {
  const info = PISTOL_INFO[id];
  if (!info || !PISTOL_BASES[id]) return null;
  if (!save.weapons) save.weapons = ['pistol'];
  if (save.weapons.includes(id)) return { already: true, ...info };
  save.weapons.push(id);
  save.current = id;
  return { already: false, ...info };
}

export function addFoundAmmo(save, amount) {
  const n = Math.max(0, amount | 0);
  save.stashAmmo = (save.stashAmmo | 0) + n;
  return n;
}
