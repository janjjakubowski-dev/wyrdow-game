# Wyrdów — Development Guide

## The one rule

**Never edit `index.html` directly.** It is generated. Edit `src/*.js`, then:

```bash
python3 build.py
```

The build concatenates the modules (alphabetical order — the numeric prefixes ARE
the load order), injects them into `build/template.html`, syntax-checks the result
through JavaScriptCore (no node needed), and writes `index.html`. Players and
Vercel still receive a single file, per the game bible.

`python3 build.py --check` verifies `index.html` matches `src/` without writing —
run it if you suspect drift.

## Module map

| Module | Contents |
|---|---|
| `00-data.js` | Palette, map/world data, TOWNS registry, quest state, `gameState`, save v1→v2 system, journal + customs entries, item names, dialogue trees, attention |
| `01-audio.js` | `ambientAudio` (procedural), `MusicManager` (duck stack), `SfxManager` (18 wavs) |
| `02-game-core.js` | `class GameScene` — constructor/init/preload/create/update only |
| `03-game-dialogue.js` | Dialogue UI + flow, choices, typewriter, woodcut portraits, NPC dialogue dispatchers |
| `04-game-journal-ui.js` | Memory journal, pause menu + settings, stance HUD, tutorial card |
| `05-game-interiors.js` | Interior build/update path, door + travel transitions |
| `06-game-quest.js` | Markers, visions, Południca, Brel sequence, title card, notifications |
| `07-game-systems.js` | Rituals, observation, night roads, Regency tells, movement, footsteps, interaction, thread guidance, knot HUD |
| `08-game-npcs.js` | All NPC creation/draw/update, villagers, creatures, player sprite |
| `09-game-world.js` | Ground/houses/props rendering, tiles, camera, clock, weather, view veil, UI camera |
| `10-game-misc.js` | Small helpers awaiting a better home |
| `20/21/22-scene-*.js` | OpeningScene, TravelScene, MainMenuScene |
| `30-boot.js` | Phaser config + game instantiation |

GameScene's non-core methods live as `Object.assign(GameScene.prototype, {...})`
extensions — add new methods to the domain file they belong to (or a new
`NN-game-<domain>.js`; any number between 02 and 20 loads in the right window).

## Conventions

- Single quotes, 2-space indent, comments explain *why* (a non-technical reader
  follows along — bible requirement).
- Every gameplay change gets browser-verified before commit (see
  `.claude/agents/wyrdow-playtester.md` for the harness playbook).
- Commit `index.html` together with the `src/` change that produced it.
- Design canon: `CLAUDE.md` (bible) → `ROADMAP.md` (phases) → `TOWN2_BRIEF.md`
  (Miedźno decisions).
