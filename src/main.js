// Make It Back: bootstraps the renderer and runs the frame loop.
import * as THREE from '../vendor/three.module.min.js';
import { ctx, $ } from './core.js';
import { buildWorld } from './world.js';
import { makePlayer, updatePlayer, debugSetAim } from './player.js';
import { addFoundAmmo, totalAmmo, waveAllotment, pistolStats } from './weapons.js';
import { shotsToClearTypes } from './zombies.js';
import { applyFind } from './search.js';
import { initEffects, updateEffects } from './effects.js';
import { newSave, writeSave } from './save.js';
import { updateWave } from './waves.js';
import { damageZombie } from './zombies.js';
import { initUI, goTitle, updateBanner } from './ui.js';

// ----- renderer / scene -----
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // capped for iPhone performance
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 80);
Object.assign(ctx, { renderer, scene, camera, save: newSave() });
ctx.world = buildWorld(scene);
ctx.player = makePlayer();
scene.add(ctx.player);
initEffects(scene);

function resize() {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  // portrait phones: widen vertical FOV so enough of the room is visible side to side
  const vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(26)) / aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vfov), 55, 80);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

// ----- camera: orbit the kid on the title screen, follow behind him in game -----
function updateCamera(dt) {
  if (ctx.camHold) return;
  if (ctx.state === 'title') {
    const t = performance.now() / 1000;
    camera.position.set(Math.sin(t * 0.35) * 1.6, 1.55, -2.4 + Math.cos(t * 0.35) * 0.2);
    camera.lookAt(0, 1.15, 0);
    return;
  }
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, ctx.G.px * 0.55, Math.min(1, dt * 6));
  camera.position.y = 2.9; camera.position.z = 5.0;
  camera.lookAt(camera.position.x * 0.6, -0.1, -9);
}

// ----- adaptive resolution: drop pixel ratio if frames are slow -----
let perfAcc = 0, perfFrames = 0;
function adaptPerf(dt) {
  perfAcc += dt; perfFrames++;
  if (perfAcc > 2) {
    if (perfAcc / perfFrames > 1 / 45 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight);
    }
    perfAcc = 0; perfFrames = 0;
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (ctx.state === 'playing') updateWave(dt);
  else if (ctx.state === 'title') { ctx.G.time += dt; updatePlayer(dt); }
  ctx.world.update(dt);
  updateCamera(dt);
  updateEffects(dt);
  updateBanner(dt);
  if (ctx.state === 'playing' || ctx.state === 'title') adaptPerf(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// Test/debug hook used by tools/test.mjs (harmless in normal play).
window.__mib = {
  get state() { return ctx.state; },
  get G() { return ctx.G; },
  get save() { return ctx.save; },
  clearWave() { ctx.G.toSpawn = 0; for (const z of ctx.G.zombies) if (!z.dead) damageZombie(z, 1e6); },
  debugSetAim,
  get player() { return ctx.player; },
  get camera() { return ctx.camera; },
  setCamHold(v) { ctx.camHold = !!v; },
  findAmmo(n) { const v = addFoundAmmo(ctx.save, n); writeSave(ctx.save); return v; },
  applyFind(kind, extra) { return applyFind(ctx.save, kind, extra); },
  totalAmmo() { return totalAmmo(ctx.save); },
  waveAllotment() { return ctx.G.waveAllotment; },
  clip() { return ctx.player?.userData?.currentClip || null; },
  setAim(yaw, pitch) { ctx.input.aimYaw = yaw; ctx.input.aimPitch = pitch; },
  animsReady() { return !!(ctx.player?.userData?.animsReady); },
  shotsToClear(types, hpMul, damage) { return shotsToClearTypes(types, hpMul, damage); },
  pistolStats: () => pistolStats(),
};

initUI();
goTitle();
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
