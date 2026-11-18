// Survivors you rescue while scavenging. They stand behind you and auto-shoot.
import * as THREE from '../vendor/three.module.min.js';
import * as T from './textures.js';
import { box, lam, mesh, limb } from './models.js';
import { ctx } from './core.js';
import { ROOM } from './world.js';
import { sfx } from './audio.js';
import { addTracer } from './effects.js';
import { damageZombie } from './zombies.js';

const SURVIVOR_LOOKS = [
  { shirt: 0x3d6b3a, pants: 0x3a3226, hair: 0x1a1a1a, skin: 0x8d5a3b },
  { shirt: 0x8b2b2b, pants: 0x22263a, hair: 0xc9a040, skin: 0xf0c8a0 },
  { shirt: 0x2f4f6f, pants: 0x4a4a4a, hair: 0x5a3a20, skin: 0xd09a70 },
  { shirt: 0x6a5acd, pants: 0x2a2a2a, hair: 0x101010, skin: 0xb07850 },
];
export function makeSurvivor(i) {
  const L = SURVIVOR_LOOKS[i % SURVIVOR_LOOKS.length];
  const g = new THREE.Group();
  const shirt = lam({ color: L.shirt }), pants = lam({ color: L.pants }), skin = lam({ color: L.skin });
  const legGeo = box(0.19, 0.75, 0.22);
  g.add(limb(legGeo, pants, 0.75, -0.12, 0.78, 0), limb(legGeo, pants, 0.75, 0.12, 0.78, 0));
  g.add(mesh(box(0.52, 0.66, 0.3), shirt, 0, 1.12, 0));
  const head = mesh(box(0.32, 0.34, 0.32), skin, 0, 1.64, 0);
  head.add(mesh(box(0.34, 0.12, 0.34), lam({ color: L.hair }), 0, 0.15, 0));
  g.add(head);
  const armGeo = box(0.14, 0.6, 0.15);
  const aL = limb(armGeo, shirt, 0.6, -0.33, 1.4, 0), aR = limb(armGeo, shirt, 0.6, 0.33, 1.4, 0);
  aL.rotation.set(1.4, 0, 0.3); aR.rotation.set(1.5, 0, -0.1);
  g.add(aL, aR);
  const gun = mesh(box(0.08, 0.12, 0.5), lam({ color: 0x252525 }), 0.08, 1.32, -0.55);
  g.add(gun);
  g.userData = { gun };
  return g;
}

const SURV_POS = [[-3.5, 1.2], [3.5, 1.2], [-2.6, 2.4], [2.6, 2.4]];
export function spawnSurvivors(n) {
  const { G, scene } = ctx;
  for (let i = 0; i < n; i++) {
    const m = makeSurvivor(i);
    m.position.set(SURV_POS[i][0], 0, SURV_POS[i][1]);
    scene.add(m);
    G.survivors.push({ mesh: m, cd: 0.5 + Math.random() });
  }
}

const from = new THREE.Vector3(), to = new THREE.Vector3();
export function updateSurvivors(dt) {
  const { G, save } = ctx;
  for (const s of G.survivors) {
    s.cd -= dt;
    // target the zombie closest to the barricade
    let target = null, best = -1e9;
    for (const z of G.zombies) if (!z.dead && z.z > ROOM.zFar + 6 && z.z > best) { best = z.z; target = z; }
    if (!target) continue;
    const want = Math.atan2(-(target.x - s.mesh.position.x), -(target.z - s.mesh.position.z));
    s.mesh.rotation.y = THREE.MathUtils.lerp(s.mesh.rotation.y, want, 0.2);
    if (s.cd <= 0) {
      s.cd = 0.9 + Math.random() * 0.5;
      s.mesh.userData.gun.getWorldPosition(from);
      if (Math.random() < 0.8) { damageZombie(target, 24 + save.wave); to.set(target.x, 1.1, target.z); }
      else to.set(target.x + (Math.random() - 0.5) * 2, 1.4, target.z - 3);
      addTracer(from, to);
      sfx.survivorShot();
    }
  }
}
