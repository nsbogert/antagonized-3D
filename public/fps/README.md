# Antagonized: Marin’s Home

A playable four-chapter first-person game featuring Marin, giant ants, and a queen battle.

## Play

From the project root, run `npm start` and open `http://localhost:3001/`.
The root redirects to `/fps/`. Set `PORT` to use another port.
Use a desktop browser with WebGL and a keyboard/mouse. Click **Take back the yard**
to begin. Arrow keys look in all four directions; WASD moves relative to the view.
Escape pauses. Mouse capture is optional in the pause menu; embedded browsers
without Pointer Lock can also drag the yard to look.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Arrow keys / on-screen arrows | Turn left/right, look up/down |
| R | Level the view |
| Mouse drag | Optional look control |
| Space | Jump; landing on a worker stomps it |
| Shift | Attack: throw / fire / soldier bite; hold for repeated fire |
| C | Sprint / charge while mounted |
| E | Mount/dismount, secure food, collect gear, inspect trail |
| Left click / F | Optional alternate attack controls |
| 1 | Hand throw or ant cannon |
| 2 | Spray: sustained short-range damage |
| 3 | Foam: sticky projectile, slowing patch, soldier preparation |
| 4 | Mist: lingering area damage |
| Q | Drop bait trap |
| H | Field guide |
| Escape | Pause, sensitivity, sound, assistance settings |

## Mission and systems

Secure the picnic, compost, and pantry food caches. Living workers within 3.5 m
prevent sealing a cache. Bait attracts workers from up to 13 m and soldiers from
only 4.5 m; it does not attract flyers. Worker AI normally carries food between
caches and the house. Bait interrupts that job. Secured caches stop producing new
workers. Clearing every enemy is not required.

Stomping workers creates pickup ammunition. In throw/cannon mode, walking over carcasses loads them automatically; with spray/foam/mist equipped they remain on the ground. Initially carry one worker; the cannon
stores three. Collect the cannon at the tool bench after three enemy defeats.
Thrown carcasses damage enemies and can knock flyers down; optional aim assistance
helps compensate for the throwing arc. An intact soldier resists attacks. Foam it,
then land a stomp or carcass hit to subdue it. Mount with E. The mount bites, charges
workers, and climbs low vertical obstacles when walking into them. Its 40-second
struggle timer ends in a dismount. Subdued soldiers recover after a delay.

Spray and foam are available as a physical pickup at the tool bench from the start.
Collecting the kit equips spray and fills the shared tank to 100%. Mist unlocks after two caches.
The bench replenishes tank, bait, and health. Securing a cache also restores one
health and one bait. All tools draw from a shared tank; hand throws use carcasses. A 1.35-second automatic
refill starts when empty, when a shot needs more than remains, or after 1.1 seconds
without firing. No bench trip is needed for tank refills.

Ride a soldier up the ivy planter, dismount, and inspect the ant trail. Once all
three caches are secured and the clue found, the kitchen door completes the chapter.
Completing the backyard offers **Enter the kitchen**, carrying unlocked gear and stored ammo.
The kitchen continues into Chapter 03, Behind the Walls, then Chapter 04, The Royal Chamber.

## Implementation

- `game.mjs`: game state, controls, enemy jobs, combat, objectives, and UI.
- `world.mjs`: procedural 3D backyard, ant models, and first-person equipment.
- `look.mjs`: keyboard and pointer-capture-independent looking, click/drag disambiguation.
- `core.mjs`: standalone rules for collisions, stomps, ammo, bait, and progression.
- `vendor/babylon.js`: pinned Babylon.js 8.26.0; license included. No runtime CDN.
- `assets/marin-concept.png`: approved stylized Marin design reference for future character assets.

The current world and first-person equipment are procedural prototype models, not
the finished concept-art assets. Full character animation, mid-chapter saves, and mobile controls are not implemented.
Chapter transitions preserve equipment and mixed ammunition.

## Validation

Run `node --test public/fps/*.test.mjs` from the project root.

The browser regression script in `tests/browser.cjs` uses Playwright. Set
`PLAYWRIGHT_MODULE` to a resolvable Playwright module path if it is not installed
locally, and optionally `CHROME_PATH` to a Chrome executable. Start the server, then:

```
ANTAGONIZED_URL=http://localhost:3001/fps/index.html node public/fps/tests/browser.cjs
```

It checks real keyboard movement/jumping/pausing, plus controlled scenarios through
the opt-in `?debug=1` hooks for stomps, throwing at flyers, soldier subduing and
climbing, bait attraction, cache sealing, upgrades, resource costs, and completion.
The controlled scenarios are regression checks, not a substitute for human feel testing.

## Controls and visual pass

The HUD shows numeric health, five health segments, equipment slots, carried-ant
capacity, shared tank level, and bait count. Empty hands rest outside the view.
Carrying a carcass or equipping a tool raises the relevant hands; looking down
reveals world-anchored boots and jeans. Environment materials use deterministic
procedural textures. Ant shells, mandibles, articulated legs, and translucent flyer
wings have additional geometry and materials while keeping the original rules.

## Combat feel and soundtrack

Stomp radius is 1.65 m for workers. With assistance enabled, jumping near a worker
within 3.6 m guides the jump toward it, slows its movement, and shows a landing
ring. Sideways/backward input cancels guidance. The rebound is deliberately low.
Dead ants flatten with splayed legs instead of flipping upside down; the carried
and thrown models use the same flattened shape. Nearby worker carcasses load
automatically only in throw/cannon mode (capacity 1/3). Ant pickup never needs E; that key is reserved for interactions and mounting.
Spray uses a wider 8.5 m cone and defeats a worker in three pulses; soldiers still
require foam and a stomp or thrown carcass.

`assets/marin-vs-the-colony.mp3` is the user-supplied SUNO theme. It starts on Play,
loops during play, and pauses with the game, including when the tab loses focus.
The pause menu has separate music enable/volume controls and sound-effects toggle.
Objective labels float and their world beacons pulse/rotate; reduced-motion
preferences disable the motion, and completed objectives hide their beacons.

Cannon collection now equips it immediately. In cannon mode, carcasses within
1.6 m underfoot automatically load up to the three-ant limit; no interaction key is needed.
Dead ants settle on visible paving and raised platforms rather than falling to
world zero. Their thicker flattened pose and raised legs keep them above the surface.

## Chapter 02 · The Kitchen

Open `/fps/?chapter=2` or select Kitchen on the title screen. This is also the
next destination offered after a backyard win. When entering from that win,
unlocked gear and carried ammo transfer through a local browser save. Direct
chapter selection without a save starts with the exterminator kit, mist, and a
loaded three-ant cannon so players who completed older builds need not replay.
Health, bait and the shared tank are refreshed at the start of the chapter.

Seal cereal, kibble and recycling caches. The kitchen has three soldiers, four
flyers and worker food trails. Foam and stagger a soldier, mount it, and climb the
sink counter. Dismount to inspect the elevated pheromone trail after securing all
three caches. Open the marked wall breach beside the fridge to finish Chapter 02.
The supply cart near the entrance replenishes health and bait.

The tile floor, kitchen island, sink, stove, refrigerator, pantry, pendant lights,
window and dripping faucet are built by `kitchen.mjs`. `chapters.mjs` owns chapter
copy, positions and gear transfer; `chapters.test.mjs` checks progression, loadouts
and floor routes against the kitchen's actual collision layout.
Chapter 02 plays the user-supplied `assets/midnight-in-marins-kitchen.mp3`.
Chapter 01 retains “Marin vs. the Colony.” Each chapter loops its own track and
shares the existing music volume, mute and pause behavior.

## Chapter 03 · Behind the Walls

Open `/fps/?chapter=3`, choose Walls on the title screen, or continue from a
kitchen win. Kitchen unlocks and ammo are saved separately under
`antagonized.wallsLoadout`; backyard-to-kitchen progress keeps its original save.
Direct selection without a save includes all current tools and three cannon rounds.

Seal the seed vault, sugar store and fungus farm. Subdue and ride a soldier up the
3.2 m signal mound, dismount, and decode the queen’s signal. Break the royal seal
at the marked gate to complete the chapter and reveal the queen’s silhouette.
The boss fight is not part of this chapter. A tool case near the entry refills
health and bait; shared tank refills and cannon auto-collection work as before.

`walls.mjs` builds dim wall cavities with wooden studs, copper pipes, earth tunnels,
fungus and resin growth, and the signal mound. Marin carries a short-range work
light. Wide looping routes accommodate soldier mounts. Chapter 03 loops its own
soundtrack, “Mid-Spooky” (`assets/mid-spooky-v2.mp3`), with the shared music controls.

Ant ammunition is collected exclusively by walking over worker carcasses in
throw/cannon mode (within 1.6 m horizontally and 1.2 m vertically). No E prompt
is shown, and pressing E cannot pick up or switch weapons for a corpse.

## Soldier foam timing

Direct foam hits and floor-patch contact both hold soldiers still for 14 seconds.
Repeated hits or patch contact refresh the full duration; soldiers cannot bite
while foamed. Workers and flyers retain seven-second foam effects. Floor patches
last ten seconds and settle on the actual surface, including raised platforms.
The crosshair shows foam time remaining. A stomp/carcass hit still subdues the
soldier for a separate 22-second mounting window, also shown in the HUD.

## Colony eggs and bait supplies

Chapter 03 has seven egg clutches (21 eggs) on accessible tunnel floors.
Walk over eggs in throw/cannon mode to collect them automatically. Eggs and
worker carcasses share one handheld slot or three cannon slots, firing in pickup
order. Eggs use the same aim assist and damage as carcasses, splat on impact,
and can subdue a foamed soldier. Full inventory leaves eggs on the ground.
Restart restores clutches; saved chapter loadouts preserve mixed ammo.

Marin carries one bait trap at a time. Each lasts 25 seconds. E at a supply bench
restores the single bait slot; each sealed cache also restores it. Bait never stacks.
The HUD shows current / maximum bait, and the guide explains both refill routes.

## Chapter 04 · The Royal Chamber

Continue from the royal seal in Chapter 03 or open `/fps/?chapter=4`.
The queen waits until Marin crosses into the arena, leaving time to collect eggs
and visit supplies. No food-cache or elevated-clue objective gates this fight.

- Crown: ants and eggs crack 6 resin armor. Workers nearby repair intact armor;
  bait pulls them away. Armor breaks expose the queen for 12 seconds.
- Guard: 9 armor, 14-second openings. A mounted C charge breaks armor in one hit,
  while three cannon hits also work. Two flyers reinforce the guard.
- Last charge: damage only during 8-second recovery windows or foam interruptions.
  Charges and slams have locked targets, red floor warnings, and generous windups.
- Foam interrupts for 3 seconds with a 10-second cooldown. Spray damages exposed
  health; mist handles crowds and can damage the queen in an opening.
- 24 eggs across eight clutches share the normal ammo inventory. Two E supply
  stations refill health, tank, the single bait slot, and egg clutches indefinitely.
- Phase transitions provide six seconds of respite, full health/tank/bait, and
  renewed eggs. Workers are replenished slowly, with at most six live workers
  and two live flyers. Soldiers remain reusable mounts.
- Defeating the queen ends the game and reprises the original theme. Retry resets
  the encounter at the chamber entrance, without replaying earlier chapters.

`royal.mjs` builds the arena and queen model. `queen-core.mjs` contains the
independent phase, armor, attack, warning, and vulnerability rules. Chapter 04
uses the supplied “The Queen Beneath” track (`assets/the-queen-beneath.mp3`).

Run `node --experimental-vm-modules public/fps/tests/queen-runtime.cjs` for the
offline Babylon NullEngine integration check: actual scene construction, egg
projectiles, spray through every phase, mounted armor break, victory, restart,
supply refills, and victory music. Attack timing and dodging are also covered
by `queen-core.test.mjs`. The existing Playwright script covers Chapters 01–03.
