// Daytime scavenging: locations, loot tables, and the search screen.
import { ctx, $ } from './core.js';
import { PLAYER_MAX, BARRICADE_MAX, MAX_SURVIVORS } from './config.js';
import { writeSave } from './save.js';
import { sfx } from './audio.js';
import { weapon, applyPistolUpgrade, givePistol, addFoundAmmo } from './weapons.js';
import { show } from './ui.js';

// loot tables: [weight, kind, extra]
// Searching finds pistol upgrades, extra bullets, other pistols, supplies, and survivors.
export const LOCATIONS = [
  { id: 'houses',   name: 'Houses',         icon: '🏚️', hours: 2, desc: 'Quick search. Scraps, a clip of ammo, maybe a survivor.',
    loot: [[3, 'upgrade', 'mag'], [3, 'ammo', 12], [2, 'repair', 60], [2, 'medkit', 25], [2, 'survivor'], [1, 'nothing']] },
  { id: 'gas',      name: 'Gas Station',    icon: '⛽', hours: 2, desc: 'Snacks, tools, loose rounds, sometimes a scared survivor.',
    loot: [[3, 'medkit', 20], [3, 'repair', 70], [3, 'ammo', 16], [2, 'upgrade', 'rate'], [2, 'survivor'], [1, 'nothing']] },
  { id: 'hardware', name: 'Hardware Store', icon: '🔨', hours: 3, desc: 'Lumber and nails: big barricade repairs.',
    loot: [[6, 'repair', 160], [2, 'ammo', 10], [2, 'upgrade', 'reload'], [1, 'survivor'], [1, 'nothing']] },
  { id: 'hospital', name: 'Hospital',       icon: '🏥', hours: 3, desc: 'Med kits and survivors hiding inside.',
    loot: [[5, 'medkit', 50], [3, 'survivor'], [2, 'ammo', 8], [1, 'upgrade', 'reload'], [1, 'nothing']] },
  { id: 'police',   name: 'Police Station', icon: '🚓', hours: 4, desc: 'Dangerous, but full of pistols, upgrades, and ammo.',
    loot: [[3, 'upgrade', 'damage'], [2, 'upgrade', 'rate'], [2, 'upgrade', 'mag'], [2, 'upgrade', 'reload'],
           [3, 'ammo', 20], [2, 'pistol', 'revolver'], [2, 'pistol', 'auto'], [2, 'survivor']] },
];

function pick(table) {
  const total = table.reduce((s, r) => s + r[0], 0);
  let r = Math.random() * total;
  for (const row of table) { r -= row[0]; if (r <= 0) return row; }
  return table[table.length - 1];
}

// Rolls 1-3 finds for a location and applies them to the save. Returns text lines.
export function scavenge(save, loc) {
  const finds = [];
  const rolls = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
  for (let i = 0; i < rolls; i++) {
    const [, kind, extra] = pick(loc.loot);
    finds.push(applyFind(save, kind, extra));
  }
  return finds;
}

export function applyFind(save, kind, extra) {
  switch (kind) {
    case 'upgrade': {
      const res = applyPistolUpgrade(save, extra);
      if (!res) return applyFind(save, 'ammo', 10);
      if (res.maxed) return applyFind(save, 'ammo', 12);
      return { icon: res.icon, text: `${res.text} (${res.level}/5)`, good: true };
    }
    case 'ammo': {
      const amt = Math.max(1, Math.round(extra * (0.8 + Math.random() * 0.4)));
      addFoundAmmo(save, amt);
      return { icon: '🔹', text: `Found ${amt} pistol rounds (carries into the next wave)`, good: true };
    }
    case 'pistol': {
      const res = givePistol(save, extra);
      if (!res) return applyFind(save, 'ammo', 16);
      if (res.already) return applyFind(save, 'ammo', 16);
      return { icon: res.icon, text: res.text, good: true };
    }
    case 'repair': {
      if (save.barricade >= BARRICADE_MAX) return applyFind(save, 'ammo', 8);
      const amt = Math.round(extra * (0.8 + Math.random() * 0.4));
      const before = save.barricade;
      save.barricade = Math.min(BARRICADE_MAX, save.barricade + amt);
      return { icon: '🪵', text: `Boards & nails: barricade +${save.barricade - before}`, good: true };
    }
    case 'medkit': {
      if (save.health >= PLAYER_MAX) return applyFind(save, 'repair', 50);
      const amt = Math.round(extra * (0.8 + Math.random() * 0.4));
      const before = save.health;
      save.health = Math.min(PLAYER_MAX, save.health + amt);
      return { icon: '🩹', text: `Med kit: health +${save.health - before}`, good: true };
    }
    case 'survivor': {
      if (save.survivors < MAX_SURVIVORS) {
        save.survivors++;
        return { icon: '🧍', text: 'A survivor joined you! They will shoot zombies.', good: true };
      }
      return applyFind(save, 'ammo', 12);
    }
    default:
      return { icon: '💨', text: 'Nothing useful here.', good: false };
  }
}


export function openSearch() {
  ctx.state = 'search';
  show('search');
  $('search').scrollTop = 0;
  renderSearch();
}

function renderSearch() {
  const save = ctx.save;
  $('searchTitle').textContent = `Wave ${save.wave - 1} survived`;
  $('hoursLeft').textContent = save.hoursLeft;
  $('sHp').textContent = save.health;
  $('sBc').textContent = save.barricade;
  $('sSurv').textContent = save.survivors;
  if ($('sAmmo')) $('sAmmo').textContent = save.stashAmmo | 0;
  const locs = $('locations');
  locs.innerHTML = '';
  for (const L of LOCATIONS) {
    const b = document.createElement('button');
    b.className = 'loc';
    b.disabled = L.hours > save.hoursLeft;
    b.innerHTML = `<div class="ic">${L.icon}</div><div class="nm">${L.name}</div><div class="hr">${L.hours} hrs</div><div class="ds">${L.desc}</div>`;
    b.addEventListener('click', () => doSearch(L, b));
    locs.appendChild(b);
  }
  $('btnRepair').disabled = save.hoursLeft < 1 || save.barricade >= BARRICADE_MAX;
  const lf = save.lastFinds || [];
  $('finds').innerHTML = lf.length
    ? `<div class="finds-h">${lf[0]}</div>` + lf.slice(1).map(f => `<div class="find ${f.good ? 'good' : 'bad'}">${f.icon} ${f.text}</div>`).join('')
    : '<div class="finds-h dim">Pick a place to search.</div>';
  const W = weapon();
  const u = save.upgrades || { damage: 0, rate: 0, mag: 0, reload: 0 };
  const names = (save.weapons || ['pistol']).map((id) => (
    id === 'revolver' ? 'Revolver' : id === 'auto' ? 'Auto Pistol' : 'Pistol'
  )).join(', ');
  $('arsenal').innerHTML = `<b>Your ${W.name.toLowerCase()}:</b> dmg ${W.damage} · ${W.rate.toFixed(1)}/s · clip ${W.mag} · reload ${W.reload.toFixed(2)}s`
    + `<div class="dim">Upgrades ${u.damage}/5 dmg · ${u.rate}/5 rate · ${u.mag}/5 clip · ${u.reload}/5 reload</div>`
    + `<div class="dim">Pistols: ${names} · Carried rounds: ${save.stashAmmo | 0}</div>`;
  $('btnNextWave').textContent = `Start Wave ${save.wave} ▶`;
}

let searching = false;
function doSearch(L, btn) {
  const save = ctx.save;
  if (searching || L.hours > save.hoursLeft) return;
  searching = true;
  sfx.click();
  btn.classList.add('searching');
  btn.querySelector('.hr').textContent = 'Searching…';
  setTimeout(() => {
    save.hoursLeft -= L.hours;
    const finds = scavenge(save, L);
    save.lastFinds = [`${L.icon} You searched the ${L.name}:`, ...finds];
    writeSave(save);
    searching = false;
    if (finds.some(f => f.good)) sfx.pickup();
    renderSearch();
  }, 700);
}

export function repairBarricade() {
  const save = ctx.save;
  if (save.hoursLeft < 1) return;
  sfx.click();
  save.hoursLeft -= 1;
  const before = save.barricade;
  save.barricade = Math.min(BARRICADE_MAX, save.barricade + 50);
  save.lastFinds = ['🔨 You spent an hour on the barricade:', { icon: '🪵', text: `Barricade +${save.barricade - before}`, good: true }];
  writeSave(save);
  renderSearch();
}
