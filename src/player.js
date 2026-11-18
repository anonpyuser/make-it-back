// The player: Mixamo Aj (skinned GLB) with the original box-kid as a fallback.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as T from './textures.js';
import { box, lam, mesh, limb } from './models.js';
import { ctx } from './core.js';
import { PLAYER_SPEED, PLAYER_X_LIMIT } from './config.js';
import { ASSET_VERSION } from './version.js';

const SKIN = lam({ color: 0xe0ac84 });
const CHAR_SCALE = 0.9;
export const CHAR_URL = `assets/character-mobile.glb?v=${ASSET_VERSION}`;
export const ANIM_URL = `assets/animations.glb?v=${ASSET_VERSION}`;
const PLACEHOLDER_MS = 1200; // show the box-kid if the GLB is still downloading

const _preloads = new Map();
export function assetUrl(path) {
  return `${path}?v=${ASSET_VERSION}`;
}
export function preloadCharacterAssets() {
  for (const url of [CHAR_URL, ANIM_URL]) {
    if (_preloads.has(url)) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
    _preloads.set(url, fetch(url).catch((err) => {
      console.warn('preload failed', url, err);
    }));
  }
}


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
  model.traverse((o) => {
    if (o.isBone && o.quaternion) o.userData.restQ = o.quaternion.clone();
  });
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
  ud.gunRestRot = gun.rotation.clone();
  ud.animsReady = false;
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
  ud.gunRestRot = ud.gun.rotation.clone();
  ud.animsReady = false;
  g.userData = ud;
}



function boneKey(name) {
  return String(name || '').replace(/^mixamorig:?/i, '');
}

// q and -q are the same pose; a sign flip mid-track makes nlerp/slerp take the long way around.
function makeQuatContinuous(track) {
  const v = track.values;
  if (!v || v.length < 8) return;
  for (let i = 4; i < v.length; i += 4) {
    const dot = v[i - 4] * v[i] + v[i - 3] * v[i + 1] + v[i - 2] * v[i + 2] + v[i - 1] * v[i + 3];
    if (dot < 0) {
      v[i] = -v[i]; v[i + 1] = -v[i + 1]; v[i + 2] = -v[i + 2]; v[i + 3] = -v[i + 3];
    }
  }
  // Looping clips: keep the last key in the same hemisphere as the first.
  const n = v.length;
  const loopDot = v[0] * v[n - 4] + v[1] * v[n - 3] + v[2] * v[n - 2] + v[3] * v[n - 1];
  if (loopDot < 0) {
    v[n - 4] = -v[n - 4]; v[n - 3] = -v[n - 3]; v[n - 2] = -v[n - 2]; v[n - 1] = -v[n - 1];
  }
}

function isHeadBone(key) {
  return key === 'Head' || key === 'Neck' || key === 'HeadTop_End';
}

function retargetClip(clip, targetRoot, clipName) {
  const name = clipName || clip.name;
  const stripHead = name === 'strafeLeft' || name === 'strafeRight' || name === 'idle';
  const names = new Map();
  targetRoot.traverse((o) => {
    if (o.name) names.set(boneKey(o.name), o.name);
  });
  const tracks = [];
  for (const t of clip.tracks) {
    const dot = t.name.indexOf('.');
    if (dot < 0) continue;
    const node = t.name.slice(0, dot);
    const prop = t.name.slice(dot + 1);
    const key = boneKey(node);
    const mapped = names.get(key);
    if (!mapped) continue;
    // Strafe Head/Neck tracks are the suspect for a 360° spin while moving.
    // Keep the head on the idle aim pose instead (see idleHead in setupAnims).
    if (stripHead && isHeadBone(key)) continue;
    const nt = t.clone();
    nt.name = `${mapped}.${prop}`;
    if ((prop === 'quaternion' || prop === 'rotation') && nt.values && nt.values.length >= 8) {
      makeQuatContinuous(nt);
    }
    // Strip root motion so the game can slide him on X without the clip walking away.
    if (prop === 'position' && key === 'Hips' && nt.values && nt.values.length >= 3) {
      const v = nt.values;
      const x0 = v[0], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) {
        v[i] = x0;
        v[i + 2] = z0;
      }
    }
    tracks.push(nt);
  }
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

function extractHeadClip(clip, targetRoot, newName) {
  const names = new Map();
  targetRoot.traverse((o) => {
    if (o.name) names.set(boneKey(o.name), o.name);
  });
  const tracks = [];
  for (const t of clip.tracks) {
    const dot = t.name.indexOf('.');
    if (dot < 0) continue;
    const node = t.name.slice(0, dot);
    const prop = t.name.slice(dot + 1);
    const key = boneKey(node);
    if (!isHeadBone(key)) continue;
    const mapped = names.get(key);
    if (!mapped) continue;
    const nt = t.clone();
    nt.name = `${mapped}.${prop}`;
    if ((prop === 'quaternion' || prop === 'rotation') && nt.values && nt.values.length >= 8) {
      makeQuatContinuous(nt);
    }
    tracks.push(nt);
  }
  return tracks.length ? new THREE.AnimationClip(newName, clip.duration, tracks) : null;
}

function playAnim(ud, name, fade = 0.12) {
  if (!ud.actions || !ud.actions[name] || name === 'idleHead') return;
  if (ud.currentClip === name && name !== 'shoot') return;
  const next = ud.actions[name];
  const prev = ud.action;
  // The always-on idleHead action must keep running through body crossfades.
  if (prev && prev === ud.actions.idleHead) return;
  if (name === 'shoot') {
    next.reset().setEffectiveWeight(1).fadeIn(0.05).play();
    if (prev && prev !== next) prev.fadeOut(0.05);
    ud.action = next;
    ud.currentClip = name;
    ud.shooting = true;
    return;
  }
  if (prev && prev !== next && prev !== ud.actions.idleHead) prev.fadeOut(fade);
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  ud.action = next;
  ud.currentClip = name;
}

function setupAnims(g, animGltf) {
  const ud = g.userData;
  if (!ud.isSkinned || !ud.model || !animGltf?.animations?.length) return;
  const mixer = new THREE.AnimationMixer(ud.model);
  const actions = {};
  let idleSrc = null;
  for (const clip of animGltf.animations) {
    if (clip.name === 'idle') idleSrc = clip;
    const retargeted = retargetClip(clip, ud.model, clip.name);
    if (!retargeted.tracks.length) continue;
    const action = mixer.clipAction(retargeted);
    if (clip.name === 'shoot') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    actions[clip.name] = action;
  }
  // Always-on head layer from idle, so idle↔strafe body crossfades cannot slerp the head the long way.
  if (idleSrc) {
    const headClip = extractHeadClip(idleSrc, ud.model, 'idleHead');
    if (headClip) {
      const headAct = mixer.clipAction(headClip);
      headAct.setLoop(THREE.LoopRepeat, Infinity);
      headAct.setEffectiveWeight(1).play();
      actions.idleHead = headAct;
    }
  }
  ud.mixer = mixer;
  ud.actions = actions;
  ud.currentClip = null;
  ud.animsReady = !!actions.idle;
  mixer.addEventListener('finished', (e) => {
    if (e.action === actions.shoot) ud.shooting = false;
  });
  playAnim(ud, 'idle', 0);
}

const _beamUp = new THREE.Vector3(0, 1, 0);
const _beamDir = new THREE.Vector3();
function clearLaser(ud) {
  if (!ud?.laser) return;
  const { beam, dot } = ud.laser;
  if (beam?.parent) beam.parent.remove(beam);
  if (dot?.parent) dot.parent.remove(dot);
  beam?.geometry?.dispose();
  dot?.geometry?.dispose();
  ud.laser = null;
}

function attachLaser(ud, force = false) {
  const scene = ctx.scene;
  if (!scene) return;
  if (ud.laser && !force) return;
  if (ud.laser && force) clearLaser(ud);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff1a14, transparent: true, opacity: 0.9, depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 1, 6), mat);
  beam.frustumCulled = false;
  beam.visible = false;
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2a20, depthWrite: false, transparent: true, opacity: 0.95 }),
  );
  dot.frustumCulled = false;
  dot.visible = false;
  scene.add(beam, dot);
  ud.laser = { beam, dot };
}

const _muzzle = new THREE.Vector3();
const _end = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _gunQ = new THREE.Quaternion();
const _side = new THREE.Vector3();

function rayHitZombie(from, dir, z) {
  const ox = from.x - z.x, oz = from.z - z.z;
  const dx = dir.x, dz = dir.z;
  const rad = z.radius + 0.16;
  const a = dx * dx + dz * dz;
  const b = ox * dx + oz * dz;
  const c = ox * ox + oz * oz - rad * rad;
  const disc = b * b - a * c;
  if (disc < 0 || a < 1e-8) return null;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t < 0.05) return null;
  const y = from.y + dir.y * t;
  if (y < 0.05 || y > 2.4 * (z.mesh?.scale?.x || 1)) return null;
  return t;
}

export function laserHitDist(from, dir, maxDist = 28) {
  let dist = maxDist;
  if (dir.y < -1e-4) {
    const t = (0.02 - from.y) / dir.y;
    if (t > 0.05 && t < dist) dist = t;
  }
  const zombies = ctx.G?.zombies || [];
  for (const z of zombies) {
    if (z.dead) continue;
    const t = rayHitZombie(from, dir, z);
    if (t != null && t < dist) dist = t;
  }
  return dist;
}

// Shots and the laser follow this aim, not the gun bone's local -Z
// (Mixamo hand axes don't keep the barrel lined up with -Z).
export function aimDirection(dir) {
  const yaw = ctx.input.aimYaw || 0;
  const pitch = ctx.input.aimPitch || 0;
  dir.set(0, 0, -1);
  dir.applyAxisAngle(_beamUp, yaw);
  _side.set(1, 0, 0).applyAxisAngle(_beamUp, yaw);
  dir.applyAxisAngle(_side, pitch);
  dir.normalize();
  return dir;
}

export function gunAim(from, dir) {
  const player = ctx.player;
  const gun = player?.userData?.gun;
  if (player) player.updateMatrixWorld(true);
  if (gun) gun.getWorldPosition(from);
  else from.set(ctx.G.px || 0, 1.15, 0.15);
  aimDirection(dir);
  from.addScaledVector(dir, 0.25);
  return true;
}

export function updateLaser() {
  const { player, state } = ctx;
  const ud = player?.userData;
  if (!ud) return;
  if (!ud.laser) attachLaser(ud);
  if (!ud.laser) return;
  const show = state === 'playing';
  ud.laser.beam.visible = show;
  ud.laser.dot.visible = show;
  if (!show) return;
  if (!gunAim(_muzzle, _fwd)) return;
  const dist = Math.max(0.2, laserHitDist(_muzzle, _fwd));
  _end.copy(_muzzle).addScaledVector(_fwd, dist);
  const beam = ud.laser.beam;
  beam.position.copy(_muzzle).add(_end).multiplyScalar(0.5);
  _beamDir.copy(_end).sub(_muzzle).normalize();
  beam.quaternion.setFromUnitVectors(_beamUp, _beamDir);
  beam.scale.set(1, dist, 1);
  ud.laser.dot.position.copy(_end);
}

// Aim turns the whole character (root yaw) and the laser / gun. It must never
// write Head, Neck, or Spine bones — that accumulated into a spin on iPhone.
function applyAim(player, ud) {
  const yaw = THREE.MathUtils.clamp(ctx.input.aimYaw || 0, -0.7, 0.7);
  const pitch = THREE.MathUtils.clamp(ctx.input.aimPitch || 0, -0.4, 0.35);
  player.rotation.y = yaw;
  if (ud.gun && ud.gunRestRot) {
    ud.gun.rotation.copy(ud.gunRestRot);
    ud.gun.rotateX(pitch * 0.4);
  }
}

function loadAnimations(g) {
  const loader = new GLTFLoader();
  loader.load(
    ANIM_URL,
    (gltf) => {
      if (!g.userData.isSkinned) return;
      try { setupAnims(g, gltf); }
      catch (err) { console.warn('animation setup failed; using posed idle', err); }
    },
    undefined,
    (err) => { console.warn('animation load failed; using posed idle', err); },
  );
}

function showPlaceholder(g) {
  if (g.userData.isSkinned) return;
  if (g.userData.placeholder) return;
  const prevLaser = g.userData.laser;
  attachProcedural(g);
  g.userData.placeholder = true;
  g.userData.ready = true; // safe to play while the GLB is still coming in
  g.userData.laser = prevLaser;
  attachLaser(g.userData);
}

function attachCharacter(g, gltf) {
  const prevLaser = g.userData.laser;
  clearLaser(g.userData);
  attachSkinned(g, gltf);
  g.userData.placeholder = false;
  g.userData.ready = true;
  g.userData.laser = prevLaser;
  attachLaser(g.userData, true);
  loadAnimations(g);
}

export function makePlayer() {
  const g = new THREE.Group();
  g.userData._loadGen = 0;
  // Temporary gun/head so firing and updatePlayer are safe before the model lands.
  const gun = makeGun();
  gun.position.set(0.1, 1.18, -0.5);
  g.add(gun);
  const head = new THREE.Group();
  g.userData = { gun, head, isProcedural: true, ready: false, animsReady: false, placeholder: false, gunRestRot: gun.rotation.clone(), _loadGen: 0 };
  bindKick(g.userData, gun, gun.position);
  attachLaser(g.userData);

  preloadCharacterAssets();

  const placeholderTimer = setTimeout(() => {
    if (!g.userData.isSkinned) {
      console.info('character GLB still loading; showing placeholder kid');
      showPlaceholder(g);
    }
  }, PLACEHOLDER_MS);

  const loader = new GLTFLoader();
  loader.load(
    CHAR_URL,
    (gltf) => {
      clearTimeout(placeholderTimer);
      try {
        attachCharacter(g, gltf);
      } catch (err) {
        console.warn('character setup failed, using procedural kid', err);
        showPlaceholder(g);
      }
    },
    undefined,
    (err) => {
      clearTimeout(placeholderTimer);
      console.warn('character load failed, using procedural kid', err);
      showPlaceholder(g);
    },
  );
  return g;
}

// Movement + animation. Called every frame on the title and while playing.
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

  if (ud.mixer && ud.animsReady) {
    if (ud.shooting && input.fire) {
      // keep / restart handled by onShot
    } else if (ud.shooting) {
      // let the one-shot finish
    } else if (dir < 0) {
      // After the 180° Y flip, Mixamo +X (strafeRight) reads as world left.
      playAnim(ud, 'strafeRight');
    } else if (dir > 0) {
      playAnim(ud, 'strafeLeft');
    } else {
      playAnim(ud, 'idle');
    }
    ud.mixer.update(dt);
    applyAim(player, ud);
    return;
  }

  if (ud.isSkinned) {
    const t = G.time || 0;
    const bob = Math.sin(t * (dir ? 10 : 1.7)) * (dir ? 0.02 : 0.01);
    if (ud.hips) ud.hips.position.y = ud.hipsRestY + bob;
    if (ud.rig) ud.rig.rotation.z = THREE.MathUtils.lerp(ud.rig.rotation.z, dir * 0.04, 0.15);
    applyAim(player, ud);
    return;
  }

  if (ud.legL && ud.legR) {
    const walk = dir !== 0 ? Math.sin((G.time || 0) * 12) * 0.5 : 0;
    ud.legL.rotation.x = THREE.MathUtils.lerp(ud.legL.rotation.x, walk, 0.3);
    ud.legR.rotation.x = THREE.MathUtils.lerp(ud.legR.rotation.x, -walk, 0.3);
  }
  applyAim(player, ud);
}

export function notifyShot() {
  const ud = ctx.player?.userData;
  if (ud?.animsReady) playAnim(ud, 'shoot');
}

export function resetPlayer() {
  const { player, input } = ctx;
  if (!player) return;
  ctx.G.px = 0; player.position.x = 0; player.rotation.set(0, 0, 0);
  input.aimYaw = 0; input.aimPitch = 0;
  const ud = player.userData;
  if (ud.hips) ud.hips.position.y = ud.hipsRestY || 0;
  if (ud.rig) ud.rig.rotation.z = 0;
  ud.shooting = false;
  if (ud.animsReady) playAnim(ud, 'idle', 0);
}

// Used by headless tests / debug to retune the aim pose without a reload.
export function debugSetAim(pose) {
  const player = ctx.player;
  if (!player?.userData?.model) return;
  Object.assign(AIM_POSE, pose);
  applyAimPose(player.userData.model);
}
