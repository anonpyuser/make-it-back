// Wave flow: difficulty curve, starting a wave, spawning, win/lose, moving to daytime search.
import { ctx } from './core.js';
import { BARRICADE_MAX, DAY_HOURS } from './config.js';
import { writeSave, recordBest, bestWave } from './save.js';
import { sfx } from './audio.js';
import { spawnZombie, updateZombies } from './zombies.js';
import { spawnSurvivors, updateSurvivors } from './survivors.js';
import { updatePlayer, resetPlayer } from './player.js';
import { updateWeapons } from './weapons.js';
import { show, showBanner, updateHud, setHurt } from './ui.js';
import { openSearch } from './search.js';

// Difficulty curve for wave n.
export function waveConfig(n) {
  return {
    count: 6 + Math.round(n * 3.2),
    hpMul: 1 + (n - 1) * 0.14,
    speedMul: 1 + Math.min(0.8, (n - 1) * 0.06),
    spawnGap: Math.max(0.45, 2.3 - n * 0.16),
    runnerChance: n < 2 ? 0 : Math.min(0.35, 0.06 * (n - 1)),
    bruteChance: n < 3 ? 0 : Math.min(0.2, 0.04 * (n - 2)),
  };
}

export function clearActors() {
  const { G, scene, world } = ctx;
  for (const z of G.zombies) scene.remove(z.mesh);
  for (const s of G.survivors) scene.remove(s.mesh);
  G.zombies = []; G.survivors = [];
  world.clearBlood();
}

export function startWave() {
  const { G, save, world } = ctx;
  clearActors();
  save.phase = 'wave';
  writeSave(save); // "Retry this wave" restores from here
  G.cfg = waveConfig(save.wave);
  G.toSpawn = G.cfg.count; G.spawnT = 1.5;
  G.health = save.health; G.barricade = save.barricade;
  G.fireCd = 0; G.reloadT = 0; G.waveEndT = -1; G.kills = 0; G.barricadeJustFell = false;
  resetPlayer();
  spawnSurvivors(save.survivors);
  world.barricade.setHealth(G.barricade / BARRICADE_MAX);
  ctx.state = 'playing';
  show('hud');
  showBanner(`WAVE ${save.wave}<small>${G.cfg.count} zombies incoming</small>`, 2.2);
  sfx.waveStart();
}

export function updateWave(dt) {
  const { G, world } = ctx;
  G.time += dt;
  updatePlayer(dt);
  updateWeapons(dt);

  if (G.toSpawn > 0) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      spawnZombie(); G.toSpawn--;
      G.spawnT = G.cfg.spawnGap * (0.4 + Math.random() * 1.1);
      if (Math.random() < 0.15 && G.toSpawn > 0) { spawnZombie(); G.toSpawn--; } // sometimes in pairs
    }
  }
  const alive = updateZombies(dt);
  if (G.barricadeJustFell) { G.barricadeJustFell = false; showBanner('BARRICADE DOWN!', 1.5); }
  world.barricade.setHealth(G.barricade / BARRICADE_MAX);
  world.barricade.update(dt);
  updateSurvivors(dt);

  if (G.hurtT > 0) G.hurtT -= dt;
  setHurt(G.hurtT > 0);

  if (G.health <= 0) { G.health = 0; updateHud(); gameOver('The dead broke through and got you.'); return; }
  if (G.waveEndT < 0 && G.toSpawn === 0 && alive === 0) {
    sfx.waveClear();
    showBanner(`WAVE ${ctx.save.wave} CLEARED<small>You made it through the night</small>`, 2.5);
    G.waveEndT = 2.6;
  }
  if (G.waveEndT > 0) { G.waveEndT -= dt; if (G.waveEndT <= 0) goToSearch(); }
  updateHud();
}

function goToSearch() {
  const { G, save } = ctx;
  save.health = Math.max(1, Math.round(G.health));
  save.barricade = Math.round(G.barricade);
  save.kills += G.kills;
  recordBest(save.wave);
  save.wave += 1;
  save.phase = 'search';
  save.hoursLeft = DAY_HOURS;
  save.lastFinds = [];
  writeSave(save);
  openSearch();
}

function gameOver(reason) {
  const { G, save } = ctx;
  ctx.state = 'gameover';
  sfx.gameOver();
  document.getElementById('goText').innerHTML =
    `${reason}<br>You reached <b>wave ${save.wave}</b> with ${save.kills + G.kills} total kills.` +
    `<br><span class="dim small">Best: survived wave ${bestWave()}</span>`;
  show('gameover');
}

