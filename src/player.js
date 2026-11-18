// The player: a kid in an orange cap, black glasses, grey hoodie, blue backpack.
import * as THREE from '../vendor/three.module.min.js';
import * as T from './textures.js';
import { box, lam, mesh, limb } from './models.js';
import { ctx } from './core.js';
import { PLAYER_SPEED, PLAYER_X_LIMIT } from './config.js';

const SKIN = lam({ color: 0xe0ac84 });

export function makePlayer() {
  const g = new THREE.Group();
  const hoodie = lam({ map: T.hoodieKnit(), color: 0xb8bac0 });
  const hoodieDark = lam({ color: 0x5c5e63 });
  const shirt = lam({ color: 0xff7a1a });
  const jeans = lam({ map: T.denim() });
  const white = lam({ color: 0xf2f2f2 });
  const sole = lam({ color: 0x9a9a9a });
  const cap = lam({ color: 0xff6a00 });
  const black = lam({ color: 0x111111 });
  const pack = lam({ color: 0x2a62d8 });
  const packDark = lam({ color: 0x1a3f94 });
  const gunMat = lam({ color: 0x2b2b2e });

  // legs
  const legGeo = box(0.17, 0.58, 0.2);
  const legL = limb(legGeo, jeans, 0.58, -0.11, 0.66, 0);
  const legR = limb(legGeo, jeans, 0.58, 0.11, 0.66, 0);
  for (const leg of [legL, legR]) {
    const shoe = mesh(box(0.19, 0.11, 0.3), white, 0, -0.6, -0.04);
    shoe.add(mesh(box(0.2, 0.03, 0.31), sole, 0, -0.05, 0));
    leg.add(shoe);
  }
  g.add(legL, legR);
  // hips
  g.add(mesh(box(0.4, 0.14, 0.22), jeans, 0, 0.66, 0));
  // torso (hoodie) with open zip showing orange shirt on the front (-z)
  const torso = mesh(box(0.46, 0.56, 0.28), hoodie, 0, 1.0, 0);
  torso.add(mesh(box(0.14, 0.5, 0.02), shirt, 0, 0.0, -0.145));
  torso.add(mesh(box(0.012, 0.5, 0.025), black, -0.075, 0, -0.146));
  torso.add(mesh(box(0.012, 0.5, 0.025), black, 0.075, 0, -0.146));
  torso.add(mesh(box(0.48, 0.07, 0.3), hoodieDark, 0, -0.27, 0)); // waistband
  // hood bunched at back of neck
  torso.add(mesh(box(0.34, 0.16, 0.12), hoodieDark, 0, 0.27, 0.13));
  g.add(torso);
  // backpack on the back (+z), visible from the camera
  const bp = mesh(box(0.4, 0.46, 0.18), pack, 0, 1.02, 0.23);
  bp.add(mesh(box(0.3, 0.18, 0.06), packDark, 0, -0.1, 0.11));
  bp.add(mesh(box(0.32, 0.03, 0.2), packDark, 0, 0.2, 0));
  g.add(bp);
  for (const sx of [-0.15, 0.15]) g.add(mesh(box(0.06, 0.5, 0.31), packDark, sx, 1.02, 0.02)); // straps
  // arms, angled forward holding the gun
  const armGeo = box(0.13, 0.48, 0.14);
  const armL = limb(armGeo, hoodie, 0.48, -0.3, 1.24, 0);
  const armR = limb(armGeo, hoodie, 0.48, 0.3, 1.24, 0);
  armL.rotation.set(1.35, 0, 0.35);
  armR.rotation.set(1.45, 0, -0.12);
  for (const a of [armL, armR]) a.add(mesh(box(0.11, 0.1, 0.11), SKIN, 0, -0.52, 0));
  g.add(armL, armR);
  // gun
  const gun = new THREE.Group();
  gun.position.set(0.1, 1.18, -0.5);
  const gunBody = mesh(box(0.08, 0.12, 0.42), gunMat);
  gun.add(gunBody);
  gun.add(mesh(box(0.05, 0.05, 0.25), gunMat, 0, 0.03, -0.3));
  gun.add(mesh(box(0.06, 0.14, 0.07), gunMat, 0, -0.1, 0.1));
  g.add(gun);
  // head
  const head = new THREE.Group();
  head.position.set(0, 1.47, 0);
  head.add(mesh(box(0.13, 0.08, 0.13), SKIN, 0, -0.17, 0)); // neck
  head.add(mesh(box(0.34, 0.34, 0.32), SKIN));
  head.add(mesh(box(0.35, 0.12, 0.2), lam({ color: 0x3b2618 }), 0, -0.02, 0.07)); // hair under cap
  // cap
  const capTop = mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.14, 10), cap, 0, 0.2, 0);
  head.add(capTop);
  head.add(mesh(box(0.3, 0.025, 0.2), cap, 0, 0.14, -0.24)); // brim forward
  head.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), cap, 0, 0.28, 0));
  // black glasses on the face (-z)
  const lens = new THREE.TorusGeometry(0.055, 0.014, 4, 10);
  head.add(mesh(lens, black, -0.075, 0.03, -0.165), mesh(lens, black, 0.075, 0.03, -0.165));
  head.add(mesh(box(0.05, 0.014, 0.014), black, 0, 0.04, -0.165));
  head.add(mesh(box(0.014, 0.014, 0.17), black, -0.17, 0.04, -0.08), mesh(box(0.014, 0.014, 0.17), black, 0.17, 0.04, -0.08));
  // eyes + mouth
  head.add(mesh(box(0.035, 0.035, 0.01), black, -0.075, 0.03, -0.162), mesh(box(0.035, 0.035, 0.01), black, 0.075, 0.03, -0.162));
  head.add(mesh(box(0.09, 0.02, 0.01), lam({ color: 0x8a4a3a }), 0, -0.08, -0.162));
  g.add(head);

  g.userData = { legL, legR, armL, armR, head, gun, torso };
  return g;
}


// Movement + idle/walk animation. Called every frame while playing.
export function updatePlayer(dt) {
  const { G, input, player } = ctx;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  G.px = THREE.MathUtils.clamp(G.px + dir * PLAYER_SPEED * dt, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
  player.position.x = G.px;
  const ud = player.userData;
  const walk = dir !== 0 ? Math.sin(G.time * 12) * 0.5 : 0;
  ud.legL.rotation.x = THREE.MathUtils.lerp(ud.legL.rotation.x, walk, 0.3);
  ud.legR.rotation.x = THREE.MathUtils.lerp(ud.legR.rotation.x, -walk, 0.3);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -dir * 0.06, 0.15);
  ud.gun.position.z = THREE.MathUtils.lerp(ud.gun.position.z, -0.5, 0.25); // recoil recovery
  ud.head.rotation.y = Math.sin(G.time * 0.7) * 0.05;
}

export function resetPlayer() {
  const { player } = ctx;
  ctx.G.px = 0; player.position.x = 0; player.rotation.z = 0;
}
