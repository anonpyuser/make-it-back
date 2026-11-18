// The player: Mixamo Aj (skinned GLB) with the original box-kid as a fallback.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as T from './textures.js';
import { box, lam, mesh, limb } from './models.js';
import { ctx } from './core.js';
import { PLAYER_SPEED, PLAYER_X_LIMIT } from './config.js';

const SKIN = lam({ color: 0xe0ac84 });
const CHAR_URL = 'assets/character-mobile.glb';
const CHAR_SCALE = 0.9;

function makeGun() {
  const gunMat = lam({ color: 0x2b2b2e });
  const gun = new THREE.Group();
  gun.name = 'Pistol';
  gun.add(mesh(box(0.08, 0.12, 0.42), gunMat));
  gun.add(mesh(box(0.05, 0.05, 0.25), gunMat, 0, 0.03, -0.3));
  gun.add(mesh(box(0.06, 0.14, 0.07), gunMat, 0, -0.1, 0.1));
  return gun;
}

// Original low-poly kid (orange cap, glasses, grey hoodie, blue backpack).
function makeProceduralKid() {
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

  const legGeo = box(0.17, 0.58, 0.2);
  const legL = limb(legGeo, jeans, 0.58, -0.11, 0.66, 0);
  const legR = limb(legGeo, jeans, 0.58, 0.11, 0.66, 0);
  for (const leg of [legL, legR]) {
    const shoe = mesh(box(0.19, 0.11, 0.3), white, 0, -0.6, -0.04);
    shoe.add(mesh(box(0.2, 0.03, 0.31), sole, 0, -0.05, 0));
    leg.add(shoe);
  }
  g.add(legL, legR);
  g.add(mesh(box(0.4, 0.14, 0.22), jeans, 0, 0.66, 0));
  const torso = mesh(box(0.46, 0.56, 0.28), hoodie, 0, 1.0, 0);
  torso.add(mesh(box(0.14, 0.5, 0.02), shirt, 0, 0.0, -0.145));
  torso.add(mesh(box(0.012, 0.5, 0.025), black, -0.075, 0, -0.146));
  torso.add(mesh(box(0.012, 0.5, 0.025), black, 0.075, 0, -0.146));
  torso.add(mesh(box(0.48, 0.07, 0.3), hoodieDark, 0, -0.27, 0));
  torso.add(mesh(box(0.34, 0.16, 0.12), hoodieDark, 0, 0.27, 0.13));
  g.add(torso);
  const bp = mesh(box(0.4, 0.46, 0.18), pack, 0, 1.02, 0.23);
  bp.add(mesh(box(0.3, 0.18, 0.06), packDark, 0, -0.1, 0.11));
  bp.add(mesh(box(0.32, 0.03, 0.2), packDark, 0, 0.2, 0));
  g.add(bp);
  for (const sx of [-0.15, 0.15]) g.add(mesh(box(0.06, 0.5, 0.31), packDark, sx, 1.02, 0.02));
  const armGeo = box(0.13, 0.48, 0.14);
  const armL = limb(armGeo, hoodie, 0.48, -0.3, 1.24, 0);
  const armR = limb(armGeo, hoodie, 0.48, 0.3, 1.24, 0);
  armL.rotation.set(1.35, 0, 0.35);
  armR.rotation.set(1.45, 0, -0.12);
  for (const a of [armL, armR]) a.add(mesh(box(0.11, 0.1, 0.11), SKIN, 0, -0.52, 0));
  g.add(armL, armR);
  const gun = makeGun();
  gun.position.set(0.1, 1.18, -0.5);
  g.add(gun);
  const head = new THREE.Group();
  head.position.set(0, 1.47, 0);
  head.add(mesh(box(0.13, 0.08, 0.13), SKIN, 0, -0.17, 0));
  head.add(mesh(box(0.34, 0.34, 0.32), SKIN));
  head.add(mesh(box(0.35, 0.12, 0.2), lam({ color: 0x3b2618 }), 0, -0.02, 0.07));
  const capTop = mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.14, 10), cap, 0, 0.2, 0);
  head.add(capTop);
  head.add(mesh(box(0.3, 0.025, 0.2), cap, 0, 0.14, -0.24));
  head.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), cap, 0, 0.28, 0));
  const lens = new THREE.TorusGeometry(0.055, 0.014, 4, 10);
  head.add(mesh(lens, black, -0.075, 0.03, -0.165), mesh(lens, black, 0.075, 0.03, -0.165));
  head.add(mesh(box(0.05, 0.014, 0.014), black, 0, 0.04, -0.165));
  head.add(mesh(box(0.014, 0.014, 0.17), black, -0.17, 0.04, -0.08), mesh(box(0.014, 0.014, 0.17), black, 0.17, 0.04, -0.08));
  head.add(mesh(box(0.035, 0.035, 0.01), black, -0.075, 0.03, -0.162), mesh(box(0.035, 0.035, 0.01), black, 0.075, 0.03, -0.162));
  head.add(mesh(box(0.09, 0.02, 0.01), lam({ color: 0x8a4a3a }), 0, -0.08, -0.162));
  g.add(head);
  g.userData = { legL, legR, armL, armR, head, gun, torso, isProcedural: true };
  return g;
}

function bindKick(ud, gun, rest) {
  ud.gun = gun;
  ud.gunRest = rest.clone();
  ud.kickGun = () => { gun.position.z = ud.gunRest.z + 0.08; };
}

function findBone(root, suffix) {
  let found = null;
  root.traverse((o) => {
    if (found || !o.isBone) return;
    const n = o.name.replace(/^mixamorig:?/i, '');
    if (n === suffix) found = o;
  });
  return found;
}

// Offset each arm bone from its bind pose so he holds a pistol instead of standing in a T-pose.
// Numbers are tuned for Mixamo Aj after a 180° Y flip (game forward is -Z).
const AIM_POSE = {
  Spine:         [0.06, 0, 0],
  Spine1:        [0.04, 0, 0],
  Spine2:        [0.03, 0, 0],
  RightShoulder: [0, 0.05, 0.1],
  RightArm:      [0.2, 0.05, -1.2],
  RightForeArm:  [0.05, 0.1, -1.05],
  RightHand:     [0.1, 0.15, 0],
  LeftShoulder:  [0, -0.05, -0.1],
  LeftArm:       [0.2, -0.05, 1.2],
  LeftForeArm:   [0.05, -0.1, 1.05],
  LeftHand:      [0.1, -0.1, 0],
  Head:          [0.04, 0, 0],
};

function applyAimPose(root) {
  const bones = {};
  for (const [name, xyz] of Object.entries(AIM_POSE)) {
    const b = findBone(root, name);
    if (!b) continue;
    if (!b.userData.bindQ) b.userData.bindQ = b.quaternion.clone();
    const off = new THREE.Quaternion().setFromEuler(new THREE.Euler(xyz[0], xyz[1], xyz[2]));
    b.quaternion.copy(b.userData.bindQ).multiply(off);
    bones[name] = b;
  }
  return bones;
}

function attachSkinned(g, gltf) {
  while (g.children.length) g.remove(g.children[0]);
  const rig = new THREE.Group();
  rig.name = 'AjRig';
  rig.rotation.y = Math.PI;
  rig.scale.setScalar(CHAR_SCALE);
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = false;
    }
  });
  rig.add(model);
  g.add(rig);
  // plant feet on the floor
  rig.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(rig);
  rig.position.y -= bb.min.y;

  const bones = applyAimPose(model);
  const hand = findBone(model, 'RightHand');
  const hips = findBone(model, 'Hips');
  const head = findBone(model, 'Head') || new THREE.Group();
  const gun = makeGun();
  if (hand) {
    hand.add(gun);
    // Local offset in the Mixamo right-hand bone; barrel stays along the gun's -Z.
    gun.position.set(0.06, 0.04, 0.02);
    gun.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  } else {
    gun.position.set(0.15, 1.15, -0.45);
    g.add(gun);
  }
  const ud = g.userData;
  ud.isProcedural = false;
  ud.isSkinned = true;
  ud.rig = rig;
  ud.model = model;
  ud.hips = hips;
  ud.hipsRestY = hips ? hips.position.y : 0;
  ud.head = head;
  ud.bones = bones;
  ud.hand = hand;
  bindKick(ud, gun, gun.position);
  g.userData = ud;
}

function attachProcedural(g) {
  while (g.children.length) g.remove(g.children[0]);
  const kid = makeProceduralKid();
  // re-parent children into g so userData lives on the player group
  while (kid.children.length) g.add(kid.children[0]);
  const ud = kid.userData;
  ud.isProcedural = true;
  ud.isSkinned = false;
  bindKick(ud, ud.gun, ud.gun.position);
  g.userData = ud;
}

export function makePlayer() {
  const g = new THREE.Group();
  // Temporary gun/head so firing and updatePlayer are safe before the model lands.
  const gun = makeGun();
  gun.position.set(0.1, 1.18, -0.5);
  g.add(gun);
  const head = new THREE.Group();
  g.userData = { gun, head, isProcedural: true, ready: false };
  bindKick(g.userData, gun, gun.position);

  const fallbackTimer = setTimeout(() => {
    if (!g.userData.ready) {
      console.warn('character GLB took too long; using procedural kid');
      attachProcedural(g);
      g.userData.ready = true;
    }
  }, 4000);

  const loader = new GLTFLoader();
  loader.load(
    CHAR_URL,
    (gltf) => {
      if (g.userData.ready && g.userData.isProcedural && !g.userData.isSkinned) {
        // already fell back; leave it
        return;
      }
      clearTimeout(fallbackTimer);
      try {
        attachSkinned(g, gltf);
        g.userData.ready = true;
      } catch (err) {
        console.warn('character setup failed, using procedural kid', err);
        attachProcedural(g);
        g.userData.ready = true;
      }
    },
    undefined,
    (err) => {
      clearTimeout(fallbackTimer);
      console.warn('character load failed, using procedural kid', err);
      attachProcedural(g);
      g.userData.ready = true;
    },
  );
  return g;
}

// Movement + idle/walk animation. Called every frame on the title and while playing.
export function updatePlayer(dt) {
  const { G, input, player } = ctx;
  if (!player) return;
  const playing = ctx.state === 'playing';
  const dir = playing ? ((input.right ? 1 : 0) - (input.left ? 1 : 0)) : 0;
  if (playing) {
    G.px = THREE.MathUtils.clamp(G.px + dir * PLAYER_SPEED * dt, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    player.position.x = G.px;
  }
  const ud = player.userData;
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -dir * 0.06, 0.15);

  if (ud.gun && ud.gunRest) {
    ud.gun.position.z = THREE.MathUtils.lerp(ud.gun.position.z, ud.gunRest.z, 0.25);
  }

  if (ud.isSkinned) {
    const t = G.time || 0;
    const bob = Math.sin(t * (dir ? 10 : 1.7)) * (dir ? 0.02 : 0.01);
    if (ud.hips) ud.hips.position.y = ud.hipsRestY + bob;
    if (ud.rig) ud.rig.rotation.z = THREE.MathUtils.lerp(ud.rig.rotation.z, dir * 0.04, 0.15);
    if (ud.head && ud.head.rotation) ud.head.rotation.y = Math.sin(t * 0.7) * 0.05;
    return;
  }

  if (ud.legL && ud.legR) {
    const walk = dir !== 0 ? Math.sin((G.time || 0) * 12) * 0.5 : 0;
    ud.legL.rotation.x = THREE.MathUtils.lerp(ud.legL.rotation.x, walk, 0.3);
    ud.legR.rotation.x = THREE.MathUtils.lerp(ud.legR.rotation.x, -walk, 0.3);
  }
  if (ud.head) ud.head.rotation.y = Math.sin((G.time || 0) * 0.7) * 0.05;
}

export function resetPlayer() {
  const { player } = ctx;
  if (!player) return;
  ctx.G.px = 0; player.position.x = 0; player.rotation.z = 0;
  const ud = player.userData;
  if (ud.hips) ud.hips.position.y = ud.hipsRestY || 0;
  if (ud.rig) ud.rig.rotation.z = 0;
}

// Used by headless tests / debug to retune the aim pose without a reload.
export function debugSetAim(pose) {
  const player = ctx.player;
  if (!player?.userData?.model) return;
  Object.assign(AIM_POSE, pose);
  applyAimPose(player.userData.model);
}
