// Persistence (localStorage).
import { PLAYER_MAX, BARRICADE_MAX } from './config.js';

const KEY = 'mib_save_v1';
const BEST = 'mib_best';

function emptyUpgrades() {
  return { damage: 0, rate: 0, mag: 0, reload: 0 };
}

export function newSave() {
  return {
    wave: 1,
    phase: 'wave',          // 'wave' (about to fight / fighting) or 'search' (daytime)
    hoursLeft: 0,
    health: PLAYER_MAX,
    barricade: BARRICADE_MAX,
    survivors: 0,
    weapons: ['pistol'],
    ammo: { pistol: { mag: 0, reserve: 0 } },
    current: 'pistol',
    upgrades: emptyUpgrades(),
    stashAmmo: 0,           // leftover + found rounds carried into the next wave
    kills: 0,
    lastFinds: [],
  };
}

// Older saves could still list other guns or use infinite pistol ammo.
export function migrateSave(s) {
  if (!s || typeof s !== 'object') return null;
  const allowed = new Set(['pistol', 'revolver', 'auto']);
  const owned = Array.isArray(s.weapons) ? s.weapons.filter((id) => allowed.has(id)) : [];
  s.weapons = owned.length ? [...new Set(owned)] : ['pistol'];
  if (!s.weapons.includes('pistol')) s.weapons.unshift('pistol');
  s.current = allowed.has(s.current) && s.weapons.includes(s.current) ? s.current : s.weapons[0];
  const prev = s.ammo && s.ammo.pistol && typeof s.ammo.pistol === 'object' ? s.ammo.pistol : {};
  const mag = typeof prev.mag === 'number' ? prev.mag : 0;
  const reserve = typeof prev.reserve === 'number' ? prev.reserve : 0;
  s.ammo = { pistol: { mag, reserve } };
  s.stashAmmo = Math.max(0, (s.stashAmmo | 0));
  const u = s.upgrades && typeof s.upgrades === 'object' ? s.upgrades : {};
  s.upgrades = emptyUpgrades();
  for (const k of Object.keys(s.upgrades)) {
    const n = +u[k] || 0;
    s.upgrades[k] = Math.max(0, Math.min(5, n | 0));
  }
  if (!Array.isArray(s.lastFinds)) s.lastFinds = [];
  return s;
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.wave ? migrateSave(s) : null;
  } catch { return null; }
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function bestWave() { try { return +localStorage.getItem(BEST) || 0; } catch { return 0; } }
export function recordBest(w) { try { if (w > bestWave()) localStorage.setItem(BEST, String(w)); } catch { /* ignore */ } }
