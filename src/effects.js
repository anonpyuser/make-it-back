// Visual effects: muzzle flash, bullet tracers, blood particles.
import * as THREE from '../vendor/three.module.min.js';
import { ctx } from './core.js';

let flashLight, flash, particles;
const tracers = [];
let tracerIdx = 0;
const PCOUNT = 120;
const pdata = Array.from({ length: PCOUNT }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
let pIdx = 0;
const tmpM = new THREE.Matrix4(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);

export function initEffects(scene) {
  // The flash light always exists (intensity 0 when idle) so shaders never recompile mid-game.
  flashLight = new THREE.PointLight(0xffb060, 0, 8, 1.5);
  scene.add(flashLight);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  flash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), flashMat);
  flash.visible = false;
  scene.add(flash);

  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 24; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geo, tracerMat);
    line.visible = false; line.frustumCulled = false; line.userData.t = 0;
    scene.add(line); tracers.push(line);
  }

  particles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x7a0a0a }), PCOUNT);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particles.frustumCulled = false;
  for (let i = 0; i < PCOUNT; i++) particles.setMatrixAt(i, hidden);
  scene.add(particles);
}

export function muzzleFlash(pos) {
  flash.position.copy(pos); flash.visible = true; flash.rotation.z = Math.random() * 3;
  flashLight.position.copy(pos); flashLight.intensity = 6;
}

export function addTracer(from, to) {
  const l = tracers[tracerIdx++ % tracers.length];
  const p = l.geometry.attributes.position;
  p.setXYZ(0, from.x, from.y, from.z); p.setXYZ(1, to.x, to.y, to.z); p.needsUpdate = true;
  l.visible = true; l.userData.t = 0.05;
}

export function burst(x, y, z, n = 8) {
  for (let i = 0; i < n; i++) {
    const d = pdata[pIdx++ % PCOUNT];
    d.life = 0.5 + Math.random() * 0.4;
    d.p.set(x, y, z);
    d.v.set((Math.random() - 0.5) * 3, Math.random() * 3, -Math.random() * 2.5);
  }
}

export function updateEffects(dt) {
  if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 80);
  if (flash.visible && flashLight.intensity <= 0.5) flash.visible = false;
  if (flash.visible) flash.lookAt(ctx.camera.position);
  for (const l of tracers) if (l.visible) { l.userData.t -= dt; if (l.userData.t <= 0) l.visible = false; }
  let any = false;
  for (let i = 0; i < PCOUNT; i++) {
    const d = pdata[i];
    if (d.life <= 0) continue;
    d.life -= dt; any = true;
    d.v.y -= 9 * dt; d.p.addScaledVector(d.v, dt);
    if (d.p.y < 0.02) { d.p.y = 0.02; d.v.set(0, 0, 0); }
    tmpM.makeTranslation(d.p.x, d.p.y, d.p.z);
    particles.setMatrixAt(i, d.life > 0 ? tmpM : hidden);
  }
  if (any || particles.userData.dirty) { particles.instanceMatrix.needsUpdate = true; particles.userData.dirty = any; }
}
