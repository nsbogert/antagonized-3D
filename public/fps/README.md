# Antagonized: Marin’s Home

A playable five-chapter third-person game (with an optional first-person camera) featuring Marin, giant ants, and a queen battle.

## Play

From the project root, run `npm start` and open `http://localhost:3001/`.
The root redirects to `/fps/`. Set `PORT` to use another port.
Use a desktop browser with WebGL and a keyboard/mouse. Click **Take back the yard**
to begin. Arrow keys look in all five directions; WASD moves relative to the view.
The camera follows animated Marin and pulls inward around walls.
V switches back to first person; the pause menu also has a Camera setting.
Escape pauses. Mouse capture is optional in the pause menu; embedded browsers
without Pointer Lock can also drag the yard to look.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Arrow keys / on-screen arrows | Turn left/right, look up/down |
| R | Level the view |
| V | Switch third-person / first-person camera |
| Mouse drag | Optional look control |
| Space | Jump / stomp; mount nearby foamed soldier; dismount while riding |
| Shift | Attack: throw / fire / soldier bite; hold for repeated fire |
| C | Sprint / charge while mounted |
| Walk up | Secure food, collect/refill gear, inspect trails, enter exits |
| Left click / F | Optional alternate attack controls |
| 1 | Spray: sustained short-range damage |
| 2 | Foam: sticky projectile, slowing patch, soldier preparation |
| 3 | Ant Launcher (hand throw before the launcher is unlocked) |
| H | Field guide |
| Escape | Pause, sensitivity, sound, assistance settings |

## Mission and systems

Secure the picnic, compost, and pantry food caches. Living workers within 3.5 m
prevent sealing a cache. Stomp or spray the workers to clear it. Worker AI carries food between
caches and the level exit in every household chapter, including the bathroom. A third
of workers start with a visible food chunk; they drop it at the exit and return for another load.
Royal workers carry no food and attend the queen’s armor instead. Every unsealed cache or household gap produces one worker every five seconds. Each
site has its own timer; sealing it stops its reinforcements immediately. New couriers
leave through the exit after delivering their food. Clearing every enemy is not required.

Stomping workers creates pickup ammunition. In throw/cannon mode, walking over carcasses loads them automatically; with spray/foam equipped they remain on the ground. Initially carry one worker; the cannon
stores three. Collect the cannon at the tool bench after three enemy defeats.
Thrown carcasses damage enemies and can knock flyers down; optional aim assistance
helps compensate for the throwing arc. An intact soldier resists attacks. Foam it,
then get close and press Space to mount it. The mount bites, charges
workers, and climbs low vertical obstacles when walking into them. Its 40-second
struggle timer ends in a dismount. Subdued soldiers recover after a delay.

Spray and foam are available as a physical pickup at the tool bench from the start.
Collecting the kit equips spray and fills the shared tank to 100%.
Only walking up to a refill station replenishes the tank after pickup; stations also restore health.
Each visit refills once: leave its range before returning. Sealing a cache restores one health, but no fuel.
Spray costs 0.7 fuel per pulse; foam costs 8 per shot. An insufficient tank cannot fire that tool.
Waiting, holding attack on empty, chapter transitions, and queen phases never refill it.
The remaining tank carries into the next chapter. Throws use collected ants or eggs instead of fuel.

The ant trail remains on top of the original ivy planter. Jump onto the compost bin,
then jump from the bin onto the planter; the worker-only yard needs no soldier. Once all
three caches are secured and the clue found, the kitchen door completes the chapter.
Completing the backyard offers **Enter the kitchen**, carrying unlocked gear and stored ammo.
The kitchen continues into Chapter 03, The Bathroom, then Chapter 04, Behind the Walls, and Chapter 05, The Royal Chamber.

## Implementation

- `game.mjs`: game state, controls, enemy jobs, combat, objectives, and UI.
- `world.mjs`: procedural 3D backyard, ant models, and first-person equipment.
- `gameplay-marin.mjs`: imported animated Marin, grounded running, jumping, soldier riding, and held tools.
- `camera-core.mjs`: wall-aware shoulder camera and crosshair-to-weapon aiming.
- `look.mjs`: keyboard and pointer-capture-independent looking, click/drag disambiguation.
- `core.mjs`: standalone rules for collisions, stomps, ammo, tank fuel, and progression.
- `vendor/babylon.js`: pinned Babylon.js 8.26.0; license included. No runtime CDN.
- `assets/marin-concept.png`: approved stylized Marin design reference for future character assets.

The current world and first-person equipment are procedural prototype models, not
the finished concept-art assets. Marin and the ants use imported animated rigs. Mid-chapter saves and mobile controls are not implemented.
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
climbing, cache sealing, upgrades, resource costs, and completion.
The controlled scenarios are regression checks, not a substitute for human feel testing.

## Controls and visual pass

The HUD shows numeric health, five health segments, equipment slots, carried-ant
capacity and shared tank level. Empty hands rest outside the view.
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
automatically only in throw/cannon mode (capacity 1/3). Ant pickup is automatic, as are supplies, clear caches, trails and entrances. Space mounts a nearby foamed soldier.
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
chapter selection without a save starts with the loaded exterminator kit and a
loaded three-ant cannon so players who completed older builds need not replay.
Health resets for the chapter; the saved tank level carries over without a top-up. Older saves without tank data default to a loaded kit.

Seal cereal, kibble and recycling caches. The kitchen introduces three soldiers alongside 36 workers, with no flyers. Foam and stagger a soldier, mount it, and climb the
sink counter. Dismount to inspect the elevated pheromone trail after securing all
three caches. Reach the bathroom door beside the fridge to finish Chapter 02.
The supply cart near the entrance replenishes health and tank.

The tile floor, kitchen island, sink, stove, refrigerator, pantry, pendant lights,
window and dripping faucet are built by `kitchen.mjs`. `chapters.mjs` owns chapter
copy, positions and gear transfer; `chapters.test.mjs` checks progression, loadouts
and floor routes against the kitchen's actual collision layout.
Chapter 02 plays the user-supplied `assets/midnight-in-marins-kitchen.mp3`.
Chapter 01 retains “Marin vs. the Colony.” Each chapter loops its own track and
shares the existing music volume, mute and pause behavior.

## Chapter 04 · Behind the Walls

Open `/fps/?chapter=4`, choose Walls on the title screen, or continue from a
bathroom win. Carried gear, fuel and ammo are saved separately under
`antagonized.wallsLoadout`; backyard-to-kitchen progress keeps its original save.
Direct selection without a save includes all current tools and three cannon rounds.

Seal the seed vault, sugar store and fungus farm. Subdue and ride a soldier up the
3.2 m signal mound, dismount, and decode the queen’s signal. Break the royal seal
at the marked gate to complete the chapter and reveal the queen’s silhouette.
The boss fight is not part of this chapter. A tool case near the entry refills
health and tank; the finite shared tank requires station visits, while cannon auto-collection works as before.

`walls.mjs` builds dim wall cavities with wooden studs, copper pipes, earth tunnels,
fungus and resin growth, and the signal mound. Marin carries a short-range work
light. Wide looping routes accommodate soldier mounts. Chapter 04 loops its own
soundtrack, “Mid-Spooky” (`assets/mid-spooky-v2.mp3`), with the shared music controls.

Ant ammunition is collected exclusively by walking over worker carcasses in
throw/cannon mode (within 1.6 m horizontally and 1.2 m vertically). No action key is needed; ammo pickup preserves the selected weapon.

## Soldier foam timing

Direct foam hits and floor-patch contact both hold soldiers still for 14 seconds.
Repeated hits or patch contact refresh the full duration; soldiers cannot bite
while foamed. Workers and flyers retain seven-second foam effects. Floor patches
last ten seconds and settle on the actual surface, including raised platforms.
The crosshair shows foam time remaining. A stomp/carcass hit still subdues the
soldier for a separate 22-second mounting window, also shown in the HUD.

## Colony eggs

Chapter 04 has seven egg clutches (21 eggs) on accessible tunnel floors.
Walk over eggs in throw/cannon mode to collect them automatically. Eggs and
worker carcasses share one handheld slot or three cannon slots, firing in pickup
order. Eggs use the same aim assist and damage as carcasses, splat on impact,
and can subdue a foamed soldier. Full inventory leaves eggs on the ground.
Restart restores clutches; saved chapter loadouts preserve mixed ammo.

## Chapter 05 · The Royal Chamber

Continue from the royal seal in Chapter 04 or open `/fps/?chapter=5`.
The queen begins fighting when Marin crosses into the arena, leaving time to collect eggs
and visit supplies. Workers tend the brood and soldiers patrol before she awakens. No food-cache or elevated-clue objective gates this fight.

- Crown: ants and eggs crack 6 resin armor. Nearby workers make her stop for up to three seconds to repair damaged armor;
  spraying or foaming those workers ends the repair stop. Armor breaks expose the queen for 12 seconds.
- Guard: 9 armor, 14-second openings. A mounted C charge breaks armor in one hit,
  while three cannon hits also work. Two flyers reinforce the guard.
- Last charge: damage only during 8-second openings after attacks or foam interruptions.
  Charges and slams have locked targets, red floor warnings, and generous windups.
- She circles and pursues in every phase. Hits stagger her for 1.35 seconds, with a
  five-second cooldown so sustained spray cannot immobilize her. Attack recovery
  lasts 1.5 seconds; she keeps moving during the rest of the damage window.
- Foam interrupts for 3 seconds with a 10-second cooldown. Spray damages exposed
  health. Both tools share finite fuel supplied only by refill stations.
- 24 eggs across eight clutches share the normal ammo inventory. One proximity supply
  station refills health, tank, and egg clutches indefinitely, once per visit.
- Phase transitions provide six seconds of respite and eight seconds of protection,
  allowing a trip to supplies. They do not restore health, tank fuel, or egg clutches. Workers are replenished slowly, with at most six live workers
  and two live flyers. Soldiers remain reusable mounts.
- Defeating the queen ends the game and reprises the original theme. Retry resets
  the encounter at the chamber entrance, without replaying earlier chapters.

`royal.mjs` builds the arena and queen model. `queen-motion.mjs` drives the
alternating tripod gait, planted feet, articulated knees, and body windups.
Charges accelerate and brake, turns are bounded, and phase changes preserve position. `queen-core.mjs` contains the
independent phase, armor, attack, warning, and vulnerability rules. Chapter 05
uses the supplied “The Queen Beneath” track (`assets/the-queen-beneath.mp3`).

Run `node --experimental-vm-modules public/fps/tests/queen-runtime.cjs` for the
offline Babylon NullEngine integration check: actual scene construction, egg
projectiles, spray through every phase, mounted armor break, victory, restart,
supply refills, and victory music. Attack timing and dodging are also covered
by `queen-core.test.mjs`. The existing Playwright script covers Chapters 01–03.


## Queen finale and Marin character

The queen wears a gold crown throughout the battle. Defeating her starts a
39.5-second in-engine sequence: she rolls over, her crown falls onto its side and rolls along its band, shrinking toward Marin, surviving
ants panic and flee, and Marin walks over, collects the crown, puts it on and
celebrates in her exterminator coveralls. The original theme accompanies the
victory. The illustrated celebration screen appears after the sequence.
Pause/resume or skip the film with its buttons; Escape toggles film pause.
Switching away pauses the film. The ending has a Watch the finale again button.
Retry resets the crown, character, camera, ant cast and normal gameplay.

`queen-finale.mjs` stages the scene; `victory-core.mjs` defines the timeline.
`marin-model.mjs` builds shaped garment meshes, articulated shoulder/elbow/hip/knee
joints, a curved face mesh, a sculpted bob and detailed exterminator gear. The
face uses a projected texture based on the approved character art. This remains
a lightweight procedural character, rather than a production sculpted/skinned
asset. Generated victory and face artwork are in `assets/marin-victory.png` and
`assets/marin-face.png`; built-in image-generation prompts are preserved in
`assets/marin-art-prompts.json`.

The ground slam now has a more pronounced rear-up and an expanding visible
shockwave at the warned target. Leave its red circle or jump at impact.
The combat rules and damage window are unchanged.


### Imported Marin

The supplied Meshy export is bundled at assets/models/marin.glb with its source
manifest beside it. Babylon's matching 8.26.0 GLB loader is bundled locally.
Chapter 5 replaces the procedural finale actor when the model loads successfully;
the procedural actor remains a fallback if loading fails. Earlier chapters do not
fetch the model. Imported clips are sampled on the cinematic clock, so pause,
skip and replay stay deterministic.

The latest supplied export includes 13 clips. The finale uses its bend-and-pick-up
motion and guides the right arm to place the crown. Pose blends ease walking into
the pickup, the hand release into dancing, and the transitions between dances.
Loop seams are softened; all poses remain tied to the cinematic clock.

The celebration cycles through Boom Dance (8 seconds), Love You Pop Dance
(11 seconds), and Breakdance (4 seconds). The film ends after the first full cycle.
marin-preview.html repeats this cycle and also offers each individual animation.
The preview's crown socket follows the rig; its material and textures come from
the supplied file. Gameplay now defaults to a third-person shoulder camera; V switches to first person. The obsolete detached denim legs have been removed.

Use /fps/?chapter=5&preview=finale to expose a preview button on the title screen.
It starts the actual finale without changing a saved campaign.
Run npm run test:marin for the real GLB rig and imported-character finale checks.

### Imported queen rig preview

Open `/fps/queen-preview.html` to inspect the custom rig. The chapter 4 finale now
uses this queen and her extracted crown. Live Chapter 5 combat uses the same imported rig, with Idle, distance-driven Walk, and Threat poses and a crown that follows the head socket. Resin armor, foam, openings, and floor warnings remain part of the boss fight; the procedural queen is a fallback if the model cannot load.

- `assets/models/queen-source.glb` preserves the supplied Meshy export.
- `assets/models/queen-rigged.glb` contains 36 joints, six weighted walking legs,
  Idle/Walk/Threat/Defeat clips, and a separate `DetachableCrown` on `CrownSocket`.
- The malformed rear leg is replaced with a mirrored copy of the intact rear leg.
  Surface-smoothed weights reduce stretching; a shell cap closes the crown opening.
- The asset keeps the original UVs and uses embedded 2048px textures (about 11 MB).
  The finale samples Defeat on its cinematic clock and follows the head socket
  until crown release. Her textured crown rolls, shrinks, and becomes Marin’s
  coronet. The combat controller drives the imported queen as well; resin armor, foam and the exposed weak spot are separate overlays.

Rebuild with Python plus NumPy and Pillow:
```sh
python3 tools/rig-queen.py public/fps/assets/models/queen-source.glb public/fps/assets/models/queen-rigged.glb
npm run test:queen-model
```

The actual Babylon loader test samples all five clips and checks normalized skin
weights, six weighted legs, deforming vertices, loop closure, ground contact during
defeat, removable crown, and a maximum triangle-edge bound to catch skin spikes.

### Imported soldier rig

Open `/fps/soldier-preview.html` for the supplied soldier’s custom rig: six legs,
34 joints, animated antennae and jaws, and Idle/Walk/Bite/Threat/Subdued/Defeat
clips. `assets/models/soldier-source.glb` preserves the source. The export at
`assets/models/soldier-rigged.glb` reduces 899,966 triangles to 74,502, preserving
UV island boundaries and 2048px textures (about 14.6 MB). This is a rig preview;
the live soldier controller uses this rig in every chapter.

Rebuild with Python, NumPy, Pillow, and fast-simplification 0.2.0:
```sh
python3 tools/rig-soldier.py public/fps/assets/models/soldier-source.glb public/fps/assets/models/soldier-rigged.glb
npm run test:soldier-model
```

The queen crown export now removes the red shell spikes from its geometry. Its
own warm-gold texture preserves green emeralds; the finale polishes and brightens
the material during the roll toward Marin and resets that treatment for replay.

### Imported worker rig

Open `/fps/worker-preview.html` to inspect the worker. Its custom rig fits all six
legs in the supplied asymmetric pose, with 34 joints and animated jaws/antennae.
Idle, Walk, Bite, Stomp, Defeat, and Carry clips are embedded in the export.
Stomp and Defeat curl the legs and flatten the body while keeping it above the
floor; Carry holds that corpse pose still for throwable ammunition.

The source is preserved at `assets/models/worker-source.glb`; the rigged export
reduces 476,222 triangles to 46,350 with preserved UV island borders and 2048px
textures. The live worker controller uses this rig in every chapter.

Rebuild with Python, NumPy, Pillow, and fast-simplification 0.2.0:
```sh
python3 tools/rig-worker.py public/fps/assets/models/worker-source.glb public/fps/assets/models/worker-rigged.glb
npm run test:worker-model
```
The loader check validates six weighted legs, normalized weights, mesh deformation,
closed loops, visible stomp compression, ground contact, and bounded skin edges.

### Proximity interactions and mounting

All five chapters use walk-up actions for loaded gear, supplies, clear food caches,
high trails and level exits. Ammo already collects by walking over it in throw or
cannon mode. Supply stations restore health and tank once per
visit; leave their range to refresh again. Height and wall checks prevent actions
through another floor or a wall. Food workers still block cache sealing.

Space mounts a nearby foamed or subdued soldier directly. Walking close alone does
not mount; no additional stomp or carcass hit is needed. Space while riding hops
Marin off even while climbing. The soldier climbs instead of jumping. The E action
binding is removed. Riding deliberately blocks ordinary ant bites; queen hits can
force a dismount and hurt Marin, with the existing damage cooldown unchanged.

Imported worker and soldier Walk clips now have 0.085-unit foot lift and 0.11-unit
stride reach. Live procedural legs also have larger swings and visible lift.
Marin's crown shifts 0.065 units toward her right in preview, placement and dancing.
Run `npm run test:interactions` for actual controller checks across all chapters.

### Imported flyer: rig and live controller

The supplied Meshy flyer now replaces flying ants in chapters 1–4. Chapter 5 does
not fetch it because that level has no flyers. A cached Babylon AssetContainer
loads the model and shared textures once per scene; each flyer clones its own
skeleton and sampled animation groups. If loading fails, the procedural flyer
remains visible and gameplay continues. Old casts are disposed on reset, including
when a reset happens before the asset finishes loading.

`/fps/flyer-preview.html` shows the five clips: Hover, Fly, Dive, Grounded and Defeat.
There is no walking clip. Each wing has a shoulder, flex joint and trailing tip,
with phase-delayed deformation and translucent double-sided membranes. The six
legs tuck in flight; antennae move and jaws open during the diving pose. Foam uses
the grounded pose while the existing controller brings the flyer down. Defeat
folds the wings, curls the legs and rolls while maintaining contact with the floor.
The imported death pose bypasses the procedural squash, avoiding double transforms.

- `assets/models/flyer-source.glb` preserves the supplied source.
- `assets/models/flyer-rigged.glb` contains 40 joints, 76,860 triangles (from
  713,032), embedded 1024px textures, and the five clips; approximately 8.6 MB.
- `flyer-rigged.mjs` creates independently animated actors with shared materials.

Rebuild with Python, NumPy, Pillow and fast-simplification 0.2.0:
```sh
python3 tools/rig-flyer.py public/fps/assets/models/flyer-source.glb public/fps/assets/models/flyer-rigged.glb
npm run test:flyer-model
npm run test:flyer-game
```
The model test samples actual skinned vertices in all five clips, checks wing
weights, closed loops, ground contact, bounded deformation, independent skeletons
and disposal. The actual game test checks cached loading, reset during load,
diving, foam descent, recovery, death and repeated restart cleanup.


### Live worker and soldier models
The supplied rigged workers and soldiers appear in all five chapters, including
reinforcements and the queen finale's fleeing survivors. Each model and its
textures load once per scene, with shared geometry/materials and independent
skeletons. Walk cadence follows distance traveled; stationary ants use Idle.
Foamed/subdued soldiers use Subdued, mounted soldiers walk and bite, and workers
use Stomp/Defeat with grounded carcasses. Carried and thrown workers use Carry.
The existing collision, foam, mounting, climbing and collection rules are kept.
The procedural models remain available if asset loading fails.

`npm run test:ground-ants` checks actual imported actors through all five chapters.


Ground-ant Walk clips use alternating tripods with a 65% planted stance,
0.56 source-unit foot sweep, and 0.17 source-unit lift. IK drives the ankle
through the stride while keeping the toe orientation stable. The worker loop
is 1.2 seconds and the soldier loop is 1.6 seconds; the game advances each loop
from actual distance traveled and its scaled stride length. Imported ground
ants have no procedural vertical bob, use limited-rate turns, and blend pose
changes over 0.16 seconds. Flyers retain their original movement. Model checks
require visible ankle sweep/lift; live checks verify planted feet during travel.


### Floor and wall materials

`surfaces.mjs` generates seamless 512px color and normal maps once per scene.
Patio stone has mineral mottling and pores; the kitchen uses glazed ivory/stone
porcelain, plaster and veined counters. The tunnels and royal chamber use
cracked clay and layered earth, with grained timber and roots. Box UVs use
physical distances rather than stretching one texture across a whole wall.
Maps use mipmaps and anisotropic filtering, share a per-scene cache, and do not
add external asset downloads or rebuild during gameplay/restarts. Existing
merged scenery, ground heights and collisions are unchanged.

## Chapter 03 · The Bathroom

The five-chapter route is Backyard → Kitchen → Bathroom → Behind the Walls → Royal Chamber.
Open `/fps/?chapter=3` or continue after finishing the kitchen. The walls and queen are now
chapters 4 and 5; their named saved loadouts remain compatible with earlier games.

Inspired by Marin's family's real move into an ant-infested home, the bathroom uses three
household entry points: a chipped hole in the sink cabinet, a tile gap beside the toilet,
and a branching crack inside the glass shower. Living workers block a seal until cleared.
Walk up to repair the cabinet or caulk the tile. The shower has glass walls and an automatic hinged door.
The bathtub has taller sides and a longer, narrower basin; its water still makes splashes.
The toilet is the free CC0 Kenney Furniture Kit asset; its license is bundled alongside the GLB.
Seal all three, foam and mount a soldier to climb the 3.05 m vanity, dismount at the plumbing trail,
then walk up to the service access panel to continue into the walls.

The room includes physically scaled tile textures and grout, an inset floor border, glazed wall
ceramics, marble and oak vanity, chrome plumbing, silver-tinted mirror, bathtub, folded fabric
curtain, shower, towels, woven mat, frosted window, and three family toothbrushes plus a bath duck.
Warm vanity lamps and cool window lighting keep ants and target markers readable. Static scenery
merges by material; reusable drip/ripple nodes and duck motion add detail without new allocations
per frame. The bathroom plays its own soundtrack, “Trouble in the Tiles” (`assets/trouble-in-the-tiles.mp3`). The tub has a hollow basin: Marin wades below the water surface, with pooled landing splashes and footstep ripples, and can jump back over the rim.

The imported Marin, soldier, worker, flyer, backpack and refill cabinet use the existing shared
loaders. The tank remains finite and transfers unchanged; only the visible refill cabinet refills it.
The finale now explicitly celebrates Marin, her husband, and their son's home and rejects more insects.

First-person aiming uses Marin’s actual skinned right arm and glove, extracted from the
gameplay mesh and sharing its live skeleton and textures. Spray, foam and cannon all
use the generated sprayer at the same palm socket; there is no separate cannon hopper.

Enemy introductions: Yard has 60 workers only; Kitchen has 36 workers and three soldiers; Bathroom has 36 workers and six flyers; Walls has 36 workers, three soldiers and eight flyers; Royal Chamber starts with six workers, two soldiers and two flyers. The four patch-based chapters produce a worker per unsealed site every five seconds. Couriers leave after delivery, and distant workers are recycled at 96 live workers so every source continues producing during long sessions. Royal repair workers retain their six-worker limit and slower replenishment.

The weapon selector and number keys use Spray **1**, Foam **2**, and Ant Launcher **3**. In chapters 4 and 5, walk over brood eggs with slot 3 selected to auto-load them into the same three-slot inventory as dead workers. A nearby prompt explains when the launcher is full or another tool is selected. Fire with Shift to free space, then walk over the egg again.

The queen’s slam and charge each deal **40 health** (two health segments). Ordinary ant bites still deal 20. Mounted hits force a dismount and apply the same 40 damage; health never drops below zero. The royal chamber has one refill station, near the entrance.
