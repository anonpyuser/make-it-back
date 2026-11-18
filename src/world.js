// The rundown abandoned building interior.
import * as THREE from '../vendor/three.module.min.js';
import * as T from './textures.js';
import { rand } from './textures.js';

export const ROOM = { halfW: 4.5, height: 4.4, zNear: 8, zFar: -50, barricadeZ: -2.6 };

export function buildWorld(scene) {
  const { halfW, height, zNear, zFar } = ROOM;
  const len = zNear - zFar, midZ = (zNear + zFar) / 2;
  scene.background = new THREE.Color(0x0a0908);
  scene.fog = new THREE.Fog(0x0a0908, 10, 44);

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, len), new THREE.MeshLambertMaterial({ map: T.concreteFloor() }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = midZ;
  scene.add(floor);
  // ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, len), new THREE.MeshLambertMaterial({ map: T.ceiling() }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, height, midZ);
  scene.add(ceil);
  // side walls
  const wallMat = new THREE.MeshLambertMaterial({ map: T.grimyWall() });
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
    w.rotation.y = side * -Math.PI / 2;
    w.position.set(side * halfW, height / 2, midZ);
    scene.add(w);
  }
  // far wall with a dark doorway the dead shamble out of
  const farMat = wallMat.clone(); farMat.map = wallMat.map.clone(); farMat.map.repeat.set(1, 1); farMat.map.needsUpdate = true;
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(halfW - 1.4, height), farMat);
    w.position.set(side * (1.4 + (halfW - 1.4) / 2), height / 2, zFar);
    scene.add(w);
  }
  const lintel = new THREE.Mesh(new THREE.PlaneGeometry(2.8, height - 2.8), farMat);
  lintel.position.set(0, 2.8 + (height - 2.8) / 2, zFar);
  scene.add(lintel);
  const voidM = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  voidM.position.set(0, 1.4, zFar - 0.5);
  scene.add(voidM);
  // wall behind the player
  const back = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, height), farMat);
  back.rotation.y = Math.PI; back.position.set(0, height / 2, zNear);
  scene.add(back);

  // boarded-up windows on the side walls
  const plankMat = new THREE.MeshLambertMaterial({ map: T.woodPlank() });
  const plankMat2 = new THREE.MeshLambertMaterial({ map: T.woodPlank([95, 70, 45]) });
  const night = new THREE.MeshBasicMaterial({ color: 0x1b2a3c });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x2d241b });
  const plankGeo = new THREE.BoxGeometry(2.0, 0.22, 0.05);
  for (const z of [-7, -18, -29, -40, 3]) {
    for (const side of [-1, 1]) {
      if (z === 3 && side === 1) continue;
      const win = new THREE.Group();
      win.position.set(side * (halfW - 0.02), 2.1, z + (side > 0 ? 4 : 0));
      win.rotation.y = side * -Math.PI / 2;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.4), night);
      win.add(glow);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 0.04), frameMat);
      frame.position.z = -0.03; win.add(frame);
      const n = 3 + ((rand() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(plankGeo, i % 2 ? plankMat : plankMat2);
        p.position.set((rand() - 0.5) * 0.2, -0.55 + i * (1.1 / (n - 1)), 0.05 + i * 0.01);
        p.rotation.z = (rand() - 0.5) * 0.5;
        win.add(p);
      }
      scene.add(win);
    }
  }

  // crates, barrels and a busted shelf along the walls
  const crateMat = new THREE.MeshLambertMaterial({ map: T.crate() });
  const metalMat = new THREE.MeshLambertMaterial({ map: T.metal() });
  const crateGeo = new THREE.BoxGeometry(1, 1, 1);
  const barrelGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.1, 10);
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 4 - i * 3.2 - rand() * 1.5;
    if (Math.abs(z - ROOM.barricadeZ) < 1) continue;
    if (rand() < 0.6) {
      const s = 0.6 + rand() * 0.5;
      const c = new THREE.Mesh(crateGeo, crateMat);
      c.scale.setScalar(s);
      c.position.set(side * (halfW - 0.45 - rand() * 0.2), s / 2, z);
      c.rotation.y = rand() * 0.6;
      scene.add(c);
      if (rand() < 0.4) {
        const c2 = c.clone(); c2.scale.setScalar(s * 0.7);
        c2.position.y = s + s * 0.35; c2.rotation.y = rand(); scene.add(c2);
      }
    } else {
      const b = new THREE.Mesh(barrelGeo, metalMat);
      b.position.set(side * (halfW - 0.5), 0.55, z);
      if (rand() < 0.3) { b.rotation.z = Math.PI / 2; b.position.y = 0.38; b.rotation.y = rand() * 3; }
      scene.add(b);
    }
  }

  // rubble chunks (instanced)
  const rubbleGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const rubble = new THREE.InstancedMesh(rubbleGeo, new THREE.MeshLambertMaterial({ color: 0x77736a }), 160);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 160; i++) {
    const nearWall = rand() < 0.65;
    const x = nearWall ? (rand() < 0.5 ? -1 : 1) * (halfW - 0.2 - rand() * 1.0) : (rand() - 0.5) * halfW * 1.8;
    v.set(x, 0.04, zNear - rand() * len);
    e.set(rand() * 3, rand() * 3, rand() * 3); q.setFromEuler(e);
    const s = 0.4 + rand() * 1.3; sc.set(s, s * 0.6, s);
    m4.compose(v, q, sc); rubble.setMatrixAt(i, m4);
  }
  scene.add(rubble);
  // scattered paper / trash (instanced flat quads)
  const paper = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 0.32), new THREE.MeshLambertMaterial({ color: 0xbdb59c, side: THREE.DoubleSide }), 60);
  for (let i = 0; i < 60; i++) {
    v.set((rand() - 0.5) * halfW * 1.9, 0.01, zNear - rand() * len);
    e.set(-Math.PI / 2, 0, rand() * 6); q.setFromEuler(e); sc.set(1, 1, 1);
    m4.compose(v, q, sc); paper.setMatrixAt(i, m4);
  }
  scene.add(paper);

  // pipes along the ceiling
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 6), metalMat);
  pipe.rotation.x = Math.PI / 2; pipe.position.set(-halfW + 0.5, height - 0.3, midZ); scene.add(pipe);
  const pipe2 = pipe.clone(); pipe2.position.set(halfW - 0.8, height - 0.45, midZ); scene.add(pipe2);

  // lighting: dim ambient + a few warm hanging bulbs, some flicker
  scene.add(new THREE.HemisphereLight(0x8a96a8, 0x2a2018, 0.9));
  const lamps = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const bulbOff = new THREE.MeshBasicMaterial({ color: 0x3a3020 });
  const lampZ = [-1.5, -9, -18, -28, -38];
  lampZ.forEach((z, i) => {
    const light = new THREE.PointLight(i === 1 ? 0xffc27a : 0xffd8a0, 9, 15, 1.4);
    light.position.set(i % 2 ? 1.2 : -1.2, height - 0.7, z);
    scene.add(light);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 3), frameMat);
    cord.position.set(light.position.x, height - 0.25, z); scene.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
    bulb.position.copy(light.position); scene.add(bulb);
    lamps.push({ light, bulb, base: light.intensity, flicker: i === 1 || i === 3, t: 0, on: true });
  });

  // the barricade
  const barricade = buildBarricade(scene, plankMat, plankMat2, metalMat);

  // blood decals on the floor (pooled)
  const bloodTex = T.bloodSplat();
  const bloodMat = new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false, fog: true });
  const decals = [];
  for (let i = 0; i < 40; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bloodMat);
    d.rotation.x = -Math.PI / 2; d.visible = false; d.renderOrder = 1;
    scene.add(d); decals.push(d);
  }
  let decalIdx = 0;
  function addBlood(x, z, s = 1) {
    const d = decals[decalIdx++ % decals.length];
    d.position.set(x, 0.012 + (decalIdx % 10) * 0.0005, z);
    d.rotation.z = Math.random() * 6; d.scale.setScalar(0.7 * s + Math.random() * 0.5);
    d.visible = true;
  }
  function clearBlood() { decals.forEach(d => (d.visible = false)); }

  function update(dt) {
    for (const L of lamps) {
      if (!L.flicker) continue;
      L.t -= dt;
      if (L.t <= 0) {
        L.on = Math.random() < (L.on ? 0.75 : 0.85);
        L.t = L.on ? 0.05 + Math.random() * 1.6 : 0.03 + Math.random() * 0.15;
        L.light.intensity = L.on ? L.base * (0.7 + Math.random() * 0.4) : L.base * 0.05;
        L.bulb.material = L.on ? bulbMat : bulbOff;
      }
    }
  }
  return { update, barricade, addBlood, clearBlood };
}

function buildBarricade(scene, plankMat, plankMat2, metalMat) {
  const g = new THREE.Group();
  g.position.z = ROOM.barricadeZ;
  const postGeo = new THREE.BoxGeometry(0.16, 1.3, 0.16);
  for (const x of [-4.2, -1.4, 1.4, 4.2]) {
    const p = new THREE.Mesh(postGeo, plankMat2); p.position.set(x, 0.65, 0); g.add(p);
  }
  const planks = [];
  const plankGeo = new THREE.BoxGeometry(3.1, 0.24, 0.07);
  // three columns x 4 rows of boards, each slightly crooked
  let k = 0;
  for (let row = 0; row < 4; row++) {
    for (const cx of [-2.85, 0, 2.85]) {
      const p = new THREE.Mesh(plankGeo, (k++ % 2) ? plankMat : plankMat2);
      p.position.set(cx + (Math.random() - 0.5) * 0.2, 0.18 + row * 0.3, -0.1 - (row % 2) * 0.04);
      p.rotation.z = (Math.random() - 0.5) * 0.12;
      p.userData.base = p.position.clone(); p.userData.rot = p.rotation.z;
      g.add(p); planks.push(p);
    }
  }
  // sheet-metal scrap and a tire-ish lump for character
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.03), metalMat);
  sheet.position.set(1.0, 0.45, -0.18); sheet.rotation.set(0.05, 0.1, 0.1); g.add(sheet); planks.push(sheet);
  sheet.userData.base = sheet.position.clone(); sheet.userData.rot = sheet.rotation.z;
  scene.add(g);
  // order planks so damage knocks off a random-looking sequence
  const order = planks.map((p, i) => i).sort(() => Math.random() - 0.5);
  let shakeT = 0;
  return {
    group: g,
    setHealth(frac) {
      const visible = Math.ceil(frac * planks.length);
      order.forEach((idx, i) => { planks[idx].visible = i < visible; });
    },
    hit() { shakeT = 0.15; },
    update(dt) {
      if (shakeT > 0) {
        shakeT -= dt;
        for (const p of planks) p.position.x = p.userData.base.x + (Math.random() - 0.5) * 0.06;
      } else {
        for (const p of planks) p.position.x = p.userData.base.x;
      }
    },
  };
}
