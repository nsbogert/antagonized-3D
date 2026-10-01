# Antagonized 3D

Marin versus the colony: a browser-playable first-person game about taking back
her home from giant ants. Stomp workers, throw ants and eggs, ride subdued
soldiers, and unlock exterminator gear.

## Play locally

Requires Node.js 20 or newer and a desktop browser with WebGL. There are no npm
packages to install; the game engine and assets are included.

```sh
npm start
```

Open **http://localhost:3001/**. To choose another port:

```sh
PORT=8080 npm start
```

This standalone copy uses port 3001 so it can run alongside the original project.

## Chapters

1. **The Backyard** — cut off food supplies and trace the invasion.
2. **The Kitchen** — reclaim the pantry and follow the trail into the walls.
3. **Behind the Walls** — explore the colony, collect throwable eggs, and find the queen.
4. **The Royal Chamber** — a three-stage queen battle with breakable armor,
   mounted charges, visible attack warnings, refill stations, and a victory ending.

Choose a chapter from the title screen or visit `/fps/?chapter=4` directly.
Chapter transitions carry unlocked gear and stored ammunition. Progress within
a chapter is not saved; retry begins at its entrance.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Arrow keys | Look around |
| Space | Jump / stomp |
| Shift | Attack |
| 1–4 | Throw / cannon, spray, foam, mist |
| E | Interact, mount, dismount, refill at supplies |
| Q | Place bait (carry 1; supplies refill it) |
| C | Sprint / mounted charge |
| R | Level the view |
| H | Field guide |
| Escape | Pause |

Walk over carcasses and eggs while using throw/cannon mode to collect them.
Carry one object by hand or three in the cannon. Mouse look is optional.

## Tests

```sh
npm test
```

Includes 51 rule/layout checks and an offline Babylon NullEngine integration
check covering queen combat, projectiles, mounted charges, victory, restart,
refills, and music. The integration check uses Node’s experimental VM-module
flag and may print an experimental-feature notice.

## Files and assets

- `public/fps/` — game, chapter builders, controls, UI, and tests.
- `public/fps/assets/` — Marin concept artwork and supplied music.
- `public/fps/vendor/` — pinned Babylon.js 8.26.0 and its license.
- `server.js` — dependency-free local static server.

The queen battle temporarily shares Chapter 3’s revised **Mid-Spooky** track.
The original **Marin vs. the Colony** theme returns for victory.

See [the game notes](public/fps/README.md) for detailed mechanics and implementation.
