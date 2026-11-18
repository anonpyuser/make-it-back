// Small helpers for building low-poly characters out of primitives.
import * as THREE from '../vendor/three.module.min.js';

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const lam = (opts) => new THREE.MeshLambertMaterial(opts);

export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// A limb that pivots at its top (hip / shoulder) and hangs down -y.
export function limb(geo, mat, len, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.add(mesh(geo, mat, 0, -len / 2, 0));
  return pivot;
}
