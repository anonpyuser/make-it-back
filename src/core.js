// Shared game context. Every system reads/writes game state through `ctx`
// so modules stay independent and two people (or agents) rarely edit the same file.
export const ctx = {
  renderer: null,
  scene: null,
  camera: null,
  world: null,      // from world.js
  player: null,     // THREE.Group from player.js
  state: 'title',   // 'title' | 'playing' | 'paused' | 'search' | 'gameover'
  save: null,       // persistent run data (see save.js)
  input: { left: false, right: false, fire: false },
  // per-wave runtime state
  G: {
    px: 0, health: 0, barricade: 0,
    zombies: [], survivors: [], toSpawn: 0, spawnT: 0, cfg: null,
    fireCd: 0, reloadT: 0, groanT: 2, hurtT: 0, waveEndT: -1, kills: 0, time: 0, bannerT: 0,
  },
};
export const $ = (id) => document.getElementById(id);
