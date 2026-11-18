// Weapons: stats, firing (hitscan), reloading, swapping.
import * as THREE from '../vendor/three.module.min.js';
import { ctx } from './core.js';
import { sfx } from './audio.js';
import { muzzleFlash, addTracer } from './effects.js';
import { damageZombie } from './zombies.js';

export const WEAPONS = {
  pistol:  { name: 'Pistol',  damage: 26, rate: 3.2, mag: 12, reload: 1.1, spread: 0.02, pellets: 1, pierce: 1, infinite: true, maxReserve: 0 },
  shotgun: { name: 'Shotgun', damage: 16, rate: 1.2, mag: 6,  reload: 2.0, spread: 0.13, pellets: 7, pierce: 1, maxReserve: 60 },
  rifle:   { name: 'Rifle',   damage: 75, rate: 1.7, mag: 8,  reload: 1.8, spread: 0.0,  pellets: 1, pierce: 3, maxReserve: 64 },
  smg:     { name: 'SMG',     damage: 15, rate: 11,  mag: 30, reload: 1.6, spread: 0.06, pellets: 1, pierce: 1, maxReserve: 240 },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

export const weapon = () => WEAPONS[ctx.save.current];
export const ammo = () => ctx.save.ammo[ctx.save.current];

const muzzle = new THREE.Vector3(), end = new THREE.Vector3();

// Holding fire shoots at the weapon's fire rate (semi-autos too, for easy touch play).
export function updateWeapons(dt) {
  const { G, input } = ctx;
  G.fireCd -= dt;
  if (G.reloadT > 0) { G.reloadT -= dt; if (G.reloadT <= 0) { G.reloadT = 0; finishReload(); } }
  if (input.fire && G.waveEndT < 0) tryFire();
}

function tryFire() {
  const { G, player, save } = ctx;
  const W = weapon(), A = ammo();
  if (G.reloadT > 0 || G.fireCd > 0) return;
  if (A.mag <= 0) {
    if (W.infinite || A.reserve > 0) startReload();
    else { sfx.empty(); G.fireCd = 0.3; autoSwitchIfEmpty(); }
    return;
  }
  A.mag--;
  G.fireCd = 1 / W.rate;
  sfx.shot(save.current);
  player.userData.gun.getWorldPosition(muzzle);
  muzzle.z -= 0.45; muzzle.y += 0.03;
  muzzleFlash(muzzle);
  player.userData.gun.position.z = -0.42; // recoil kick
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
export function swapWeapon() {
  const { save, G } = ctx;
  if (save.weapons.length < 2) return;
  const owned = WEAPON_ORDER.filter(w => save.weapons.includes(w));
  save.current = owned[(owned.indexOf(save.current) + 1) % owned.length];
  G.reloadT = 0; G.fireCd = 0.25;
  sfx.click();
}
function autoSwitchIfEmpty() {
  const { save, G } = ctx;
  const A = ammo();
  if (A.mag === 0 && A.reserve === 0 && !weapon().infinite) {
    const usable = WEAPON_ORDER.filter(w => save.weapons.includes(w) && (WEAPONS[w].infinite || save.ammo[w].mag + save.ammo[w].reserve > 0));
    if (usable.length) { save.current = usable[usable.length - 1]; G.fireCd = 0.3; }
  }
}
