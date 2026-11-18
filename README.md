# Make It Back

A 3D zombie survival game for the phone browser, inspired by the Flash classic *The Last Stand*.
You play a kid (orange cap, black glasses, grey hoodie, blue backpack) holding a barricade inside a
rundown abandoned building. Zombies shamble out of the dark; you slide left and right and shoot.
Between waves you get a few hours of daylight to scavenge for pistol upgrades, extra bullets, boards, med kits and survivors.

Built for **iPhone Safari in portrait** with touch controls. No Unity, no app store, no build step.

**Play (once Pages is on):** https://anonpyuser.github.io/make-it-back/
On iPhone: open the link in Safari → Share → **Add to Home Screen** → it launches fullscreen like an app.

## How to play
| Action | Touch | Keyboard |
|---|---|---|
| Move left / right | Hold the left or right half of the screen | A / D or ← → |
| Aim (laser sight) | The AIM stick in the bottom-left (always visible). Touching the stick aims only — it never moves you. | — |
| Shoot | Tap with a second finger, or a quick tap while standing still | Space |
| Reload | Happens automatically when the clip is empty | R |
| Pause | ⏸ | Esc / P |

- **Barricade**: zombies stop to smash it. If it breaks they come for you. If your health hits 0, game over.
- **Waves** get bigger and faster; runners appear from wave 2, brutes from wave 3.
- **Search** (between waves): 8 daylight hours. Houses, Gas Station, Hardware Store, Hospital and Police
  Station each cost hours and have different loot. Or spend an hour repairing the barricade yourself.
- **Ammo**: each wave gives you just enough pistol rounds to kill every zombie in that wave, plus 10 extra. Searching can find more bullets, and those carry into the next wave. Unused rounds also carry. Survivors have their own guns and do not spend yours.
- **Weapons**: pistols only. Searching finds upgrades (damage, fire rate, clip size, reload speed) and sometimes a revolver or an auto pistol. A red laser sight shows where shots will land; drag on the right side of the screen to aim.
- **Survivors** (up to 4) stand behind you and shoot automatically.
- Progress saves automatically on the device (localStorage). "Continue" resumes; "Retry this wave" restarts the wave you died on.

## Run it locally
It's a static site, so any static server works:

```bash
python3 -m http.server 8642   # then open http://localhost:8642
```

To test on a phone on the same Wi-Fi, open `http://<your-computer-ip>:8642`.

## Tech
- **Three.js r170**, vendored at `vendor/three.module.min.js` (no CDN at runtime).
- Plain ES modules, no bundler. Everything uses relative paths, so it works from a sub-path like GitHub Pages.
- All textures are drawn in code on canvases (`src/textures.js`); all sound is synthesized with WebAudio (`src/audio.js`). No image or audio files besides the app icons.
- Character: Mixamo Aj is loaded from a GLB (stored in the repo as base64 in `assets/b64/`, decoded by `npm run assets` and the Pages workflow), with Mixamo pistol animations (idle, strafe, shoot) in a second compact GLB. The original box-kid is shown as a temporary placeholder if the file is slow, then swapped out when Aj arrives (and kept if the file fails). Asset URLs are cache-busted with `?v=` on each Pages deploy so iPhone / Home Screen Safari does not keep a stale model. Textures in the GLB are JPEG (1024) and PNG (256), unlit, well under Safari's WebGL limits; import maps need iOS 16.4+.
- Pistol only: scavenging finds pistol upgrades (damage, fire rate, clip size, reload speed), extra ammo, and sometimes another pistol, plus supplies and survivors.
- Performance: low-poly primitives, Lambert materials, no shadows, instanced rubble/particles, pixel ratio capped at 2 and lowered automatically if frames get slow.
- PWA: `manifest.webmanifest`, `icons/` (SVG source + generated PNGs including `apple-touch-icon.png`).

## Code map
One file per system so two people (or agents) rarely edit the same file:

| File | What it owns |
|---|---|
| `src/main.js` | Renderer, camera, frame loop, debug hook |
| `src/core.js` | Shared `ctx` game state object |
| `src/config.js` | Tunable constants (health, barricade, day hours, speeds) |
| `src/player.js` | The kid's model (GLB + animations + fallback), movement, laser |
| `src/zombies.js` | Zombie models, types, spawning, AI, damage |
| `src/waves.js` | Difficulty curve, wave start/end, game over |
| `src/weapons.js` | Pistol stats, upgrades, firing, reload |
| `src/survivors.js` | Survivor models and auto-shooting |
| `src/search.js` | Scavenging locations, loot tables, search screen |
| `src/ui.js` | Screens, HUD, touch/keyboard input |
| `src/effects.js` | Muzzle flash, tracers, blood particles |
| `src/world.js` | The building: floor, walls, windows, debris, lights, barricade |
| `src/textures.js` | Procedural canvas textures |
| `src/models.js` | Helpers for building low-poly models |
| `src/audio.js` | Synthesized sound effects + mute |
| `src/save.js` | localStorage save/load |

## Tests
Headless Chrome at iPhone size (390×844, touch) loads the game, starts a wave, holds fire while moving,
reaches the search screen, checks save/continue, and forces a barricade breach to a game over. It fails on console errors.

```bash
npm install          # playwright-core + three (dev only)
npm run assets       # decode icons + the character GLB from base64
python3 -m http.server 8642 &
npm test             # screenshots land in screenshots/
```
`tools/test.mjs` expects Chrome at `/usr/bin/google-chrome`.

## Deploying
GitHub Pages serves the `gh-pages` branch. `.github/workflows/pages.yml` runs on every push to `main`:
it copies the static files there and decodes the PNG icons from `icons/b64/` (binary files are kept as
base64 text). Don't edit `gh-pages` by hand. Any other static host works too: upload
`index.html`, `style.css`, `manifest.webmanifest`, `src/`, `vendor/`, `icons/` (with the decoded PNGs).

## Later: a real iPhone app
The plan is to wrap this same web game with Capacitor and ship it through TestFlight once the
Apple Developer account is ready. See the issues labeled `lane:muse`.

## Working on this repo
Grok and Muse (two AI assistants) work on this together with Harrison approving merges. See [AGENTS.md](AGENTS.md).
