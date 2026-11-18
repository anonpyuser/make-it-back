// Zombies: models, types, spawning, movement, attacking, taking damage.
import * as THREE from '../vendor/three.module.min.js';
import * as T from './textures.js';
import { box, lam, mesh, limb } from './models.js';
import { ctx } from './core.js';
import { ROOM } from './world.js';
import { SPAWN_Z } from './config.js';
import { sfx } from './audio.js';
import { burst } from './effects.js';

export const ZOMBIE_TYPES = {
  walker: { hp: 60, speed: 1.35, dps: 14, radius: 0.32, reward: 1 },
  runner: { hp: 40, speed: 2.6, dps: 10, radius: 0.3, reward: 1 },
  brute:  { hp: 260, speed: 0.85, dps: 40, radius: 0.48, reward: 3 },
};

const zShared = {
  skin: null, eyes: null, pants: null, shirts: null, geos: null,
};
function initZombieShared() {
  if (zShared.geos) return;
  zShared.skin = lam({ map: T.zombieSkin() });
  zShared.eyes = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  zShared.pants = [lam({ map: T.ragCloth('#3b3a35') }), lam({ map: T.ragCloth('#2c3550') })];
  zShared.shirts = [
    lam({ map: T.ragCloth('#8a7f6a') }), lam({ map: T.ragCloth('#5b6e86') }),
    lam({ map: T.ragCloth('#7a3d32') }), lam({ map: T.ragCloth('#d6d0c0') }),
  ];
  zShared.runnerShirt = lam({ map: T.ragCloth('#a8452a') });
  zShared.bruteShirt = lam({ map: T.ragCloth('#2f2f2f') });
  zShared.geos = {
    torso: box(0.5, 0.62, 0.3),
    head: box(0.32, 0.34, 0.32),
    arm: box(0.13, 0.6, 0.14),
    leg: box(0.18, 0.7, 0.2),
    eye: box(0.06, 0.04, 0.02),
  };
}

export function makeZombie(type) {
  initZombieShared();
  const G = zShared.geos;
  const g = new THREE.Group();
  const shirt = type === 'runner' ? zShared.runnerShirt : type === 'brute' ? zShared.bruteShirt
    : zShared.shirts[(Math.random() * zShared.shirts.length) | 0];
  const pants = zShared.pants[(Math.random() * 2) | 0];
  const body = new THREE.Group(); // leans forward; zombies face +z
  const legL = limb(G.leg, pants, 0.7, -0.12, 0.72, 0);
  const legR = limb(G.leg, pants, 0.7, 0.12, 0.72, 0);
  g.add(legL, legR);
  body.position.y = 0.72;
  body.add(mesh(G.torso, shirt, 0, 0.32, 0));
  const head = mesh(G.head, zShared.skin, 0, 0.82, 0.04);
  head.add(mesh(G.eye, zShared.eyes, -0.07, 0.03, 0.165), mesh(G.eye, zShared.eyes, 0.07, 0.03, 0.165));
  body.add(head);
  const armL = limb(G.arm, zShared.skin, 0.6, -0.32, 0.58, 0);
  const armR = limb(G.arm, zShared.skin, 0.6, 0.32, 0.58, 0);
  armL.rotation.x = -1.4; armR.rotation.x = -1.25;
  body.add(armL, armR);
  body.rotation.x = 0.18;
  g.add(body);
  const s = type === 'brute' ? 1.4 : type === 'runner' ? 0.92 : 0.95 + Math.random() * 0.12;
  g.scale.setScalar(s);
  g.userData = { legL, legR, armL, armR, head, body };
  return g;
}


export function spawnZombie() {
  const { G, scene, save } = ctx;
  const c = G.cfg;
  const r = Math.random();
  const type = r < c.bruteChance ? 'brute' : r < c.bruteChance + c.runnerChance ? 'runner' : 'walker';
  const TY = ZOMBIE_TYPES[type];
  const m = makeZombie(type);
  const x = (Math.random() - 0.5) * 6.6;
  m.position.set(x, 0, SPAWN_Z[0] + Math.random() * (SPAWN_Z[1] - SPAWN_Z[0]));
  scene.add(m);
  G.zombies.push({
    mesh: m, type, x, z: m.position.z, hp: TY.hp * c.hpMul, maxHp: TY.hp * c.hpMul,
    speed: TY.speed * c.speedMul * (0.85 + Math.random() * 0.3), dps: TY.dps * (1 + (save.wave - 1) * 0.05),
    radius: TY.radius * m.scale.x, phase: Math.random() * 6, dead: false, deadT: 0, attacking: false, hitT: 0,
    weave: (Math.random() - 0.5) * 0.6, hitSoundT: 0,
  });
}

export function damageZombie(z, dmg) {
  const { G, world } = ctx;
  z.hp -= dmg; z.hitT = 0.12;
  const s = z.mesh.scale.x;
  burst(z.x, 1.2 * s, z.z + 0.2, 5);
  sfx.hit();
  if (z.hp <= 0 && !z.dead) {
    z.dead = true; z.deadT = 0; G.kills++;
    world.addBlood(z.x, z.z, s);
    burst(z.x, 1.0 * s, z.z, 12);
    sfx.zombieDie();
  } else {
    z.z -= 0.08 / s; // knockback
  }
}

// Moves/animates all zombies, applies their damage. Returns how many are still alive.
export function updateZombies(dt) {
  const { G, scene, world } = ctx;
  const bz = ROOM.barricadeZ;
  let alive = 0;
  for (let i = G.zombies.length - 1; i >= 0; i--) {
    const z = G.zombies[i], m = z.mesh, u = m.userData;
    if (z.dead) {
      z.deadT += dt;
      m.rotation.x = Math.max(-Math.PI / 2, -z.deadT * 5);
      m.position.y = Math.min(0.15, z.deadT * 0.5) * m.scale.x;
      if (z.deadT > 1.6) m.position.y -= (z.deadT - 1.6) * 1.2;
      if (z.deadT > 2.4) { scene.remove(m); G.zombies.splice(i, 1); }
      continue;
    }
    alive++;
    z.phase += dt * z.speed * 5;
    const stopZ = bz - 0.25 - z.radius;
    z.attacking = false;
    if (G.barricade > 0 && z.z >= stopZ) {
      z.z = stopZ; z.attacking = true;
      G.barricade -= z.dps * dt;
      z.hitSoundT -= dt;
      if (z.hitSoundT <= 0) { z.hitSoundT = 0.8 + Math.random() * 0.6; sfx.barricadeHit(); world.barricade.hit(); }
      if (G.barricade <= 0) { G.barricade = 0; G.barricadeJustFell = true; }
    } else if (G.barricade <= 0 && z.z > bz - 1) {
      // barricade broken: go for the kid
      const dx = G.px - z.x, dz = 0 - z.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.55 + z.radius) {
        z.attacking = true;
        G.health -= z.dps * dt;
        G.hurtT = 0.3;
        z.hitSoundT -= dt;
        if (z.hitSoundT <= 0) { z.hitSoundT = 0.7; sfx.playerHurt(); }
      } else {
        z.x += (dx / d) * z.speed * dt; z.z += (dz / d) * z.speed * dt;
      }
    } else {
      z.z += z.speed * dt;
      z.x += Math.sin(z.phase * 0.3) * z.weave * dt;
      z.x = THREE.MathUtils.clamp(z.x, -3.6, 3.6);
    }
    m.position.set(z.x, 0, z.z);
    // shamble animation
    const sw = Math.sin(z.phase);
    if (z.attacking) {
      u.armL.rotation.x = -1.4 + Math.sin(G.time * 9 + z.phase) * 0.5;
      u.armR.rotation.x = -1.3 - Math.sin(G.time * 9 + z.phase) * 0.5;
      u.legL.rotation.x = u.legR.rotation.x = 0;
    } else {
      u.legL.rotation.x = sw * 0.5; u.legR.rotation.x = -sw * 0.5;
      u.armL.rotation.x = -1.4 + sw * 0.15; u.armR.rotation.x = -1.25 - sw * 0.15;
    }
    u.body.rotation.z = Math.sin(z.phase * 0.5) * 0.12;
    u.head.rotation.z = Math.sin(z.phase * 0.7) * 0.25;
    if (z.hitT > 0) { z.hitT -= dt; u.body.rotation.x = 0.18 - 0.35; } else u.body.rotation.x = 0.18;
  }
  // groans
  G.groanT -= dt;
  if (G.groanT <= 0 && alive > 0) { G.groanT = 1.2 + Math.random() * 3 / Math.min(3, alive); sfx.groan(0.8 + Math.random() * 0.5); }
  return alive;
}
