// Procedural, canvas-generated textures. No image files needed.
import * as THREE from '../vendor/three.module.min.js';

let seed = 1337;
export function rand() {
  // deterministic PRNG so the building looks the same every run
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function speckle(g, w, h, count, colors, maxSize = 3) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(rand() * colors.length) | 0];
    const s = 1 + rand() * maxSize;
    g.fillRect(rand() * w, rand() * h, s, s);
  }
}

function blotches(g, w, h, count, color, minR, maxR, alpha) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h, r = minR + rand() * (maxR - minR);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${color},${alpha})`);
    grd.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function crack(g, x, y, len, width, color) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  let a = rand() * Math.PI * 2;
  for (let i = 0; i < len; i++) {
    a += (rand() - 0.5) * 1.1;
    x += Math.cos(a) * 6; y += Math.sin(a) * 6;
    g.lineTo(x, y);
    if (rand() < 0.08 && width > 0.8) {
      g.stroke();
      crack(g, x, y, (len - i) * 0.5, width * 0.6, color);
      g.beginPath(); g.moveTo(x, y);
      g.strokeStyle = color; g.lineWidth = width;
    }
  }
  g.stroke();
}

function tex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

export function concreteFloor() {
  const [c, g] = canvas(512);
  g.fillStyle = '#6b6862'; g.fillRect(0, 0, 512, 512);
  blotches(g, 512, 512, 40, '40,36,30', 20, 90, 0.35);   // dirt
  blotches(g, 512, 512, 14, '20,18,14', 10, 50, 0.5);    // oil stains
  blotches(g, 512, 512, 10, '120,110,95', 30, 80, 0.2);  // dust
  speckle(g, 512, 512, 5000, ['#5a5751', '#7a766e', '#4a4741', '#827d72'], 2);
  // expansion joints
  g.strokeStyle = 'rgba(25,22,20,0.7)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
  for (let i = 0; i < 9; i++) crack(g, rand() * 512, rand() * 512, 20 + rand() * 30, 1.6, 'rgba(18,16,14,0.85)');
  return tex(c, 2, 12);
}

export function grimyWall() {
  const [c, g] = canvas(512);
  // old paint: sickly green over plaster
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#7d8a72'); grd.addColorStop(0.55, '#6e7b63'); grd.addColorStop(1, '#3f4236');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  // darker lower wainscot band
  g.fillStyle = 'rgba(60,48,36,0.55)'; g.fillRect(0, 330, 512, 182);
  g.fillStyle = 'rgba(30,24,18,0.8)'; g.fillRect(0, 326, 512, 6);
  speckle(g, 512, 512, 3500, ['rgba(40,40,30,0.25)', 'rgba(150,150,130,0.15)'], 2);
  // peeling patches revealing plaster / brick
  for (let i = 0; i < 18; i++) {
    const x = rand() * 512, y = rand() * 512, w = 20 + rand() * 70, h = 15 + rand() * 50;
    g.fillStyle = rand() < 0.5 ? '#b5aa92' : '#8a4a36';
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      g.lineTo(x + Math.cos(a) * w * (0.5 + rand() * 0.5), y + Math.sin(a) * h * (0.5 + rand() * 0.5));
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,30,20,0.5)'; g.lineWidth = 1.5; g.stroke();
  }
  // water streaks / grime running down
  for (let i = 0; i < 40; i++) {
    const x = rand() * 512, y = rand() * 200, len = 100 + rand() * 300;
    const sg = g.createLinearGradient(0, y, 0, y + len);
    sg.addColorStop(0, 'rgba(35,30,20,0.35)'); sg.addColorStop(1, 'rgba(35,30,20,0)');
    g.fillStyle = sg; g.fillRect(x, y, 2 + rand() * 7, len);
  }
  blotches(g, 512, 512, 25, '25,22,15', 20, 80, 0.4);
  for (let i = 0; i < 5; i++) crack(g, rand() * 512, rand() * 512, 15 + rand() * 20, 1.2, 'rgba(20,20,15,0.8)');
  // a bit of graffiti-ish scrawl and a smeared handprint
  g.fillStyle = 'rgba(120,10,10,0.55)';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(400 + i * 9, 250 + rand() * 6, 3, 16, 0.2, 0, 7); g.fill(); }
  g.beginPath(); g.ellipse(420, 280, 18, 14, 0, 0, 7); g.fill();
  return tex(c, 6, 1);
}

export function ceiling() {
  const [c, g] = canvas(256);
  g.fillStyle = '#3a3833'; g.fillRect(0, 0, 256, 256);
  // drop ceiling tiles, some missing
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const missing = rand() < 0.25;
    g.fillStyle = missing ? '#121110' : `rgb(${80 + rand() * 30},${76 + rand() * 25},${64 + rand() * 20})`;
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
  }
  blotches(g, 256, 256, 12, '60,45,20', 8, 30, 0.5); // water stains
  return tex(c, 2, 12);
}

export function woodPlank(tint = [120, 85, 50]) {
  const [c, g] = canvas(256, 64);
  const [r, gg, b] = tint;
  g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${r * 0.5},${gg * 0.5},${b * 0.5},${0.2 + rand() * 0.3})`;
    g.lineWidth = 1 + rand() * 2;
    const y = rand() * 64;
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(80, y + (rand() - 0.5) * 10, 170, y + (rand() - 0.5) * 10, 256, y + (rand() - 0.5) * 6);
    g.stroke();
  }
  // knots, nails, dirt
  g.fillStyle = 'rgba(50,30,15,0.7)';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(rand() * 256, rand() * 64, 6, 3, 0, 0, 7); g.fill(); }
  g.fillStyle = '#2a2a2a';
  g.fillRect(10, 28, 5, 5); g.fillRect(241, 30, 5, 5);
  blotches(g, 256, 64, 6, '30,20,10', 10, 30, 0.4);
  g.strokeStyle = 'rgba(20,12,6,0.9)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 62);
  return tex(c);
}

export function crate() {
  const [c, g] = canvas(128);
  g.fillStyle = '#7a5a33'; g.fillRect(0, 0, 128, 128);
  speckle(g, 128, 128, 600, ['rgba(40,25,10,0.4)', 'rgba(160,120,70,0.3)'], 2);
  g.strokeStyle = '#3e2a14'; g.lineWidth = 10; g.strokeRect(5, 5, 118, 118);
  g.lineWidth = 8; g.beginPath(); g.moveTo(8, 8); g.lineTo(120, 120); g.stroke();
  blotches(g, 128, 128, 5, '20,14,6', 10, 30, 0.45);
  return tex(c);
}

export function metal() {
  const [c, g] = canvas(128);
  g.fillStyle = '#4b4f4f'; g.fillRect(0, 0, 128, 128);
  blotches(g, 128, 128, 14, '110,55,20', 6, 26, 0.6); // rust
  speckle(g, 128, 128, 500, ['rgba(20,20,20,0.4)', 'rgba(150,150,150,0.2)'], 2);
  return tex(c);
}

export function zombieSkin() {
  const [c, g] = canvas(64);
  g.fillStyle = '#7f9a6a'; g.fillRect(0, 0, 64, 64);
  blotches(g, 64, 64, 8, '60,30,40', 3, 10, 0.6);
  blotches(g, 64, 64, 4, '110,10,10', 2, 7, 0.8);
  speckle(g, 64, 64, 200, ['rgba(30,40,20,0.4)'], 1.5);
  return tex(c);
}

export function ragCloth(base) {
  const [c, g] = canvas(64);
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  blotches(g, 64, 64, 6, '20,15,10', 4, 14, 0.6);
  blotches(g, 64, 64, 3, '100,5,5', 3, 9, 0.75); // blood
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(rand() * 60, rand() * 60, 3 + rand() * 5, 2 + rand() * 4); }
  return tex(c);
}

export function denim() {
  const [c, g] = canvas(64);
  g.fillStyle = '#1f2a44'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, i, 64, 1); }
  speckle(g, 64, 64, 200, ['rgba(80,100,140,0.25)'], 1);
  return tex(c);
}

export function hoodieKnit() {
  const [c, g] = canvas(64);
  g.fillStyle = '#7d7f84'; g.fillRect(0, 0, 64, 64);
  speckle(g, 64, 64, 500, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.08)'], 1.5);
  return tex(c);
}

export function bloodSplat() {
  const [c, g] = canvas(64);
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 64, 64);
  blotches(g, 64, 64, 1, '90,0,0', 20, 26, 0.9);
  for (let i = 0; i < 8; i++) {
    const a = rand() * 7, d = 14 + rand() * 14;
    g.fillStyle = 'rgba(80,0,0,0.85)';
    g.beginPath(); g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1 + rand() * 3, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
