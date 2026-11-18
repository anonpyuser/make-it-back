# AGENTS.md: how Grok and Muse work on Make It Back

Two AI agents work on this repo: **Grok** and **Muse**. **Harrison** (repo owner) is the only one who
merges to `main`. Both agents follow these rules.

## Who decides
- Harrison merges every pull request into `main`. Agents never merge their own or each other's PRs.
- Harrison must approve, in advance, anything that **spends money** (paid services, Apple Developer,
  GitHub Pro, paid assets) or **publishes** (App Store / TestFlight submissions, making things public,
  announcing a release). Agents ask first and wait.

## Branches and pull requests
- The initial setup commit went straight to `main`. **After that, nobody pushes to `main` directly.**
- Work on a branch named after the agent and topic:
  - Grok: `ai/grok-<topic>` (e.g. `ai/grok-brute-zombie`)
  - Muse: `ai/muse-<topic>` (e.g. `ai/muse-capacitor-setup`)
- Every change goes in through a pull request.
- Keep PRs **small** and focused on one thing.
- PR titles are plain and say what changed, e.g. "Add crawler zombie type" or "Add Capacitor iOS wrapper".
- Every PR description says **what changed** and **how it was tested** (e.g. "ran `npm test`, played
  wave 1–3 in iPhone viewport, screenshot attached").
- Keep `main` playable: run `npm test` (headless iPhone-size check, no console errors) before opening a PR.

## Issues are the task board
- Work is tracked in GitHub Issues, labeled `lane:grok` or `lane:muse`.
- **Claim an issue by commenting on it first** ("Claiming this, Grok"), before writing code. If an issue is
  already claimed, don't start it; comment if you want to help.
- Link the PR to its issue (`Closes #12`).
- If you find new work, open an issue for it rather than widening your PR.

## Lanes
| Grok | Muse |
|---|---|
| Gameplay and game design | Support / utility modules |
| Levels and waves (`waves.js`, `world.js`) | Build, CI, GitHub Pages workflow |
| Enemies (`zombies.js`) | Docs (README, guides) |
| Weapons (`weapons.js`) | Repo hygiene (labels, templates, lint, tests infra) |
| Survivors, search/loot (`survivors.js`, `search.js`) | PWA and app-wrapping plumbing (manifest, icons, service worker, Capacitor / TestFlight) |
| Art: models and procedural textures (`player.js`, `models.js`, `textures.js`, `effects.js`) | `save.js`, `tools/` |
| Audio design (`audio.js`), HUD/screens (`ui.js`, `style.css`) | |

Shared: `main.js`, `core.js`, `config.js`, `index.html`. Change these only when needed and keep the edit small.

### Crossing lanes
- Don't edit the same file at the same time as the other agent. Check open PRs before touching a file.
- If you need to change a file in the other agent's lane, **say so in the issue first** and keep the change minimal.

## Workflow files
Muse's GitHub app may not be allowed to create or edit `.github/workflows/*` (GitHub blocks that
permission for some apps). **Workflow changes route through Grok**: Muse writes the proposed file in its
issue or PR description, and Grok opens the PR that adds it.

## Keep the code modular
One file per system so the two agents rarely collide:
`player.js`, `zombies.js`, `waves.js`, `weapons.js`, `search.js`, `survivors.js`, `ui.js`, `audio.js`,
`textures.js` (plus `world.js`, `effects.js`, `models.js`, `save.js`, `config.js`, `core.js`, `main.js`).
Systems talk through the shared `ctx` object in `core.js`. When a new system appears (e.g. music, achievements),
give it its own file instead of growing an existing one.

## Ground rules for the code
- Static site only: no runtime CDN, no build step required. Three.js stays vendored in `vendor/`.
- No binary art or audio files unless Harrison approves; textures are procedural, sounds are synthesized.
- Target 60 fps on iPhone in Safari, portrait, touch first (keyboard as a fallback).
- Never commit secrets (Unity/Apple/App Store keys); those go in GitHub Actions secrets, set by Harrison.
