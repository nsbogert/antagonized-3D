# Antagonized 3D

Current release: **0.0.1**.

**[Play the live game](https://d3o8o23ay95f45.cloudfront.net/)**.

Marin versus the colony: a browser-playable third-person game about taking back
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
2. **The Kitchen** — reclaim the pantry and follow the plumbing trail.
3. **The Bathroom** — seal damp plumbing entry points and trace ants behind the vanity.
4. **Behind the Walls** — explore the colony, collect throwable eggs, and find the queen.
5. **The Royal Chamber** — a three-stage queen battle with breakable armor,
   mounted charges, visible attack warnings, one refill station, and a victory ending.

Choose a chapter from the title screen or visit `/fps/?chapter=5` directly.
Chapter transitions carry unlocked gear and stored ammunition. Progress within
a chapter is not saved; retry begins at its entrance.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Arrow keys | Look around |
| Space | Jump / stomp, mount nearby foamed soldier, dismount |
| Shift | Attack |
| 1 | Spray |
| 2 | Foam |
| 3 | Ant Launcher (hand throw before unlock) |
| Walk up | Collect ammo, seal caches, inspect trails, enter exits, refill at supplies |
| C | Sprint / mounted charge |
| R | Level the view |
| V | Switch third-person / first-person view |
| H | Field guide |
| Escape | Pause |

Walk over carcasses and eggs while using throw/Ant Launcher mode to collect them.
Before collecting the backpack, Marin can only carry and throw one ant. The backpack includes Spray (1), Foam (2), and the three-round Ant Launcher (3), and selects Spray on pickup. Three attacks from a ridden soldier kill another soldier; eggs and thrown ants cannot kill soldiers. Soldiers can never be collected or thrown. Mouse look is optional.

## Tests

```sh
npm test
```

Includes rule/layout/motion checks and an offline Babylon NullEngine integration
check covering pre-battle ant movement, queen combat, projectiles, mounted charges, victory, restart,
refills, music, and the complete queen victory film (pause, skip, replay and restart). The integration check uses Node’s experimental VM-module
flag and may print an experimental-feature notice.

## Files and assets

- `public/fps/` — game, chapter builders, controls, UI, and tests.
- `public/fps/assets/` — Marin concept artwork and supplied music.
- `public/fps/vendor/` — pinned Babylon.js 8.26.0 and its license.
- `server.js` — dependency-free local static server.

The queen battle plays **The Queen Beneath**; Chapter 4 uses **Mid-Spooky**.
The original **Marin vs. the Colony** theme returns for victory.

See [the game notes](public/fps/README.md) for detailed mechanics and implementation.

### Exterminator props

The supplied Meshy backpack, refill cabinet, and egg use reduced game copies in
`public/fps/assets/models/`. Source downloads remain intact; adjacent JSON files
record source hashes, polygon counts, and texture sizes. `tools/optimize-props.py`
rebuilds them using numpy, Pillow, and fast-simplification.

The backpack follows Marin’s torso once she collects the loaded gear and stays
on through weapon switches, chapter carryover, and victory dances. Its fixed
sprayer was extracted into a separate hand prop; fitted straps and a flexible
hose complete the outfit. Stations remain available after collection, and eggs
share the same imported model on the ground, in hand, and when thrown.

Run `npm run test:props` to check actual prop loading and gear pickup in every
chapter, including station-only tank refills and carried fuel at chapter transitions.

## Chapter 03 · The Bathroom

The five-chapter route is Backyard → Kitchen → Bathroom → Behind the Walls → Royal Chamber.
Open `/fps/?chapter=3` or continue after finishing the kitchen. The walls and queen are now
chapters 4 and 5; their named saved loadouts remain compatible with earlier games.

Inspired by Marin's family's real move into an ant-infested home, the bathroom uses three
household entry points: a hole in the sink cabinet, a tile gap beside the toilet, and a crack inside the glass shower. Living workers
block a seal until cleared. Walk up to seal the gap; a cabinet patch or tile caulk seals the gap.
Seal all three, foam and mount a soldier to climb the 3.05 m vanity, dismount at the plumbing trail,
then walk up to the service access panel to continue into the walls.

The room includes physically scaled tile textures and grout, an inset floor border, glazed wall
ceramics, marble and oak vanity, chrome plumbing, silver-tinted mirror, bathtub, folded fabric
curtain, shower, towels, woven mat, frosted window, and three family toothbrushes plus a bath duck.
Warm vanity lamps and cool window lighting keep ants and target markers readable. Static scenery
merges by material; reusable drip/ripple nodes and duck motion add detail without new allocations
per frame. The bathroom plays its own soundtrack, “Trouble in the Tiles” (`assets/trouble-in-the-tiles.mp3`). The tub has a hollow basin: Marin wades below the water surface, with pooled landing splashes and footstep ripples, and can jump back over the taller rim. The shower has clear glass panels and a hinged door that opens on approach. The toilet uses Kenney’s free CC0 Furniture Kit asset; the production bundle includes its license.

The imported Marin, soldier, worker, flyer, backpack and refill cabinet use the existing shared
loaders. The tank remains finite and transfers unchanged; only the visible refill cabinet refills it.
The finale now explicitly celebrates Marin, her husband, and their son's home and rejects more insects.

## Deploy to AWS

Hosting is in AWS account **601253324786**, using the project's pinned `default`
CLI profile and region `us-west-2`. The S3 bucket is
`antagonized-3d-601253324786`; CloudFront serves the game over HTTPS. S3 public
access remains blocked, and its read policy permits only this CloudFront distribution.
The hosting resources are managed by the `antagonized-3d-hosting` CloudFormation stack.

From this repository, update the live game with:

```sh
npm run deploy
```

Requires Node.js 20+ and the AWS CLI with access to the configured account.
The command checks the account before making changes, builds a runtime-only bundle,
uploads changed files, then waits for CloudFront cache invalidation. Models, audio,
and scripts have explicit content types, including JavaScript modules and audio
range requests. Browsers revalidate assets while CloudFront caches large assets;
updates invalidate the CDN so existing filenames receive fresh content.

`npm run deploy:setup` creates or updates the hosting resources and deploys the game.
`npm run build` produces the local `.deploy/site/` bundle without contacting AWS.
`npm run test:deployment` checks bundle completeness and chapter URL routing.
Tests, previews, reference packs, original source meshes, and asset provenance
files are kept in the source repository and excluded from the hosted bundle. Generated build and deployment state are ignored by Git.

To release the next patch:

```sh
npm version patch --no-git-tag-version
npm run deploy
```

The package version is stamped into the published title screen and `release.json`.
`.deploy/last-deployment.json` records the live URL, account, release, and invalidation.
S3 versioning keeps replaced objects; older object versions expire after 30 days.
CloudFormation retains the bucket if the hosting stack is removed.
AWS hosting and bandwidth usage are billed to the selected account.

First-person view uses Marin’s textured right sleeve and glove, sharing the gameplay
skeleton. The generated sprayer serves spray, foam and Ant Launcher modes; shots originate
from its muzzle. The cropped arm pivots about the eye to keep the grip visible while
looking up and down. There is no cannon hopper mesh.

Workers gather around each patch site in chapters 1–4. Every unsealed site produces a new worker every five seconds until patched; the kitchen starts with 36 workers. Chapter 4 eggs auto-load into the launcher exactly like chapter 5 eggs, up to the shared three-round capacity. The queen’s slam and charge each remove 40 health, including hits that knock Marin off a mounted soldier.
