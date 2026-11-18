// Persistence (localStorage).
import { PLAYER_MAX, BARRICADE_MAX } from './config.js';

const KEY = 'mib_save_v1';
const BEST = 'mib_best';

export function newSave() {
  return {
    wave: 1,
    phase: 'wave',          // 'wave' (about to fight / fighting) or 'search' (daytime)
    hoursLeft: 0,
    health: PLAYER_MAX,
    barricade: BARRICADE_MAX,
    survivors: 0,
    weapons: ['pistol'],
    ammo: { pistol: { mag: 12, reserve: 0 } },
    current: 'pistol',
    kills: 0,
    lastFinds: [],
  };
}
export function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.wave ? s : null; } catch { return null; }
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function bestWave() { try { return +localStorage.getItem(BEST) || 0; } catch { return 0; } }
export function recordBest(w) { try { if (w > bestWave()) localStorage.setItem(BEST, String(w)); } catch { /* ignore */ } }
