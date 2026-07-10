# Wyrdów — Full Game Roadmap

*Prepared 2026-07-05. Governs development from Act 1 completion through release.*

---

## Where we are

**Act 1 (Wyrdów) is feature-complete and deployed.** Full quest chain (5 knots → 5 visions →
Południca → Codex fragment → Brel scene → title card), 15-entry Memory Journal, 5 hidden
rituals, invisible Regency Attention with diegetic tells, 18 SFX + priority-ducked music,
all six NPCs + villagers at hero-fidelity pixel art, save/load with auto-save, main menu /
pause / settings, tutorial card, WASD + touch controls, loading screen, time-of-day dial,
thread-shimmer quest guidance. Live on Vercel.

## The design frame (from the game bible + hooks already in code)

- **Five towns, five Cure Codex fragments.** (Vision 4: *"Five pieces. Five towns."*)
- **The Regency** as bureaucratic dread — escalating presence act by act, never a cartoon villain.
- **Act 2 hooks already planted in shipped dialogue:**
  - Baba is relocating to the **forest** — "the domovoi knows where" — ahead of a compliance
    review (~4 in-world days).
  - The player **returns to Wyrdów** in Act 2 (`act2_firstReturn` / `act2_repeat` branches,
    burnt-braid keepsake).
  - The **Tenth City** is the endgame destination — "burn it at the gate."
  - Open threads to pay off: the face in Vision 3, Ezra's boot-owner, Rivka's full story,
    the firefly that matches the mark.

---

## Phase A — Act 1 hardening *(1–2 sessions)*

| # | Task | Notes |
|---|------|-------|
| A1 | **Human playtest** end-to-end | You + a friend on the live link. Collect pacing/feel/confusion notes. Highest-value single step. |
| A2 | Balance pass from findings | Candidates: 60s noon silence, 48-min day length, walk speed, typewriter speed |
| A3 | Browser matrix | Safari + Firefox sanity pass (dev testing has been Chrome-based) |
| A4 | Performance pass | 12k-line file, per-frame Graphics redraws — profile on a weaker machine |
| A5 | Generate `brel_theme.mp3` (Suno) and wire it | Loader slot is documented in code |
| A6 | Absolute og:image URL | Once the final domain is settled |

## Design north star — the LBA mandate *(blessed 2026-07-12)*

Wyrdów aims for **Little Big Adventure's feel and fun factor**, adapted to the bible's
nonviolent folk world. The seven properties we build toward, and their Wyrdów forms:

1. **Embodied oppression** — from Act 2, the Regency is ON the map: patrolling
   Enumerators with visible routes, permit checkpoints, and a caught-consequence loop
   (escorted to the Records Office, signed out in triplicate — the prison-escape analog,
   played for dread-comedy). Act 1 stays patrol-free by design; escalation IS the story.
2. **Enterable interiors** — an interior is just a small TownDefinition entered by a door
   trigger. First three: Baba's house, The Ladder's common room, the Records Office.
3. **Stances, adapted** — Open / Hurried (Shift) / **Quiet Step** (toggle): slow, silent
   footsteps, patrols don't notice, needed for eavesdropping and night rituals. No
   Aggressive mode ever — our verbs are charms, rituals, misdirection.
4. **Kinetic traversal** — tile z-levels, ladders/steps, a small hop. Debuts on
   Miedźno's three terraces.
5. **Bureaucratic item-gating** — travel permits, stamped forms, IDs. Comedy and dread
   share the same paperwork.
6. **Persistent open world** — every visited town and road stays revisitable with
   act-based state changes. Never a one-way corridor.
7. **Curiosity economy** — hidden poppy-seed charms (barter, not coins), flavor lines on
   every prop via the observation system.

**Not taken from LBA:** combat and death. Failure currency stays Regency Attention,
confiscation, and lost time — consequences without a game-over screen.

## Phase B — Multi-town engine foundations *(3–5 sessions, expanded for LBA mandate)*

The current engine hardwires one 24×24 map in globals (`map[]`, `houses`, `shrines`,
`MARKERS`, NPC constants). Towns must become **data** before town 2 can exist.

| # | Task | Notes |
|---|------|-------|
| B1 | `TownDefinition` schema | Map layout, palette, houses, shrines, NPC registry, markers, ambient set, time-window events — all as data inside the single HTML file. **Schema includes: interiors (small TownDefinitions + door triggers), tile z-levels, patrol routes, checkpoint/permit gates, charm spawns** |
| B2 | World loader | GameScene builds from the active TownDefinition; clean teardown on travel; door transitions for interiors |
| B3 | Travel interstitial | Road-walking vignette between towns — "the roads remember" motif |
| B4 | Save format v2 + migration | Per-town state namespaces; never break existing saves |
| B5 | Journal town sections | Section headers + roman-numeral pages II–V (already anticipated in UI) |
| B6 | Cross-town Regency | Attention persists; Enumerators recur with escalating paperwork |
| B7 | Stance system | Open / Hurried / Quiet Step; patrol-perception groundwork *(Quiet Step shipped early — retrofits Act 1 rituals)* |
| B8 | Elevation + hop traversal | z-level tiles, step/ladder tiles; debuts on Miedźno terraces |
| B9 | Charm economy | Poppy-seed charm collectibles + barter hooks; observation flavor-line sweep |

## Phase C — Act 2 *(3–5 sessions)*

**Design first, then build.** Leading candidate consistent with planted hooks: a **forest
settlement** where the Stitched Circle regroups around Baba; patron spirit from Slavic
canon (Leshy as forest keeper, or Rusalka if we run water through it) — settled by the
design panel (see multi-agent plan).

| # | Task |
|---|------|
| C1 | Town 2 design brief (multi-agent judge panel → your approval) |
| C2 | Map + architecture set: new tiles, tree density, palette shift, landmark |
| C3 | 4–6 new NPCs: hero-fidelity sprites, dialogue trees, idle animations |
| C4 | Fragment 2 quest line + 2–3 new rituals + new vision set |
| C5 | Wyrdów return content (Baba gone, braid handover, village state changes) |
| C6 | New music (Suno) + SFX additions; journal entries + illustrations |
| C7 | Full multi-agent audit + human playtest |

## Phase D — Acts 3 & 4 *(3–4 sessions each)*

Repeat the Phase C pattern. Theme candidates to feed the design panels (unconfirmed —
panels + you decide): a salt-mine town with the **Skarbnik**, a shtetl with a clay-guardian
(golem) tradition, a lakeside town with the **Topielec**, a plains town tied to Południca's
kin. Mid-game arc payoffs land here: Vision 3's face earned, the boot-owner thread, Rivka
deepening, Regency escalation from clipboards to disappearances.

## Phase E — Act 5: the Tenth City + endings *(4–6 sessions)*

- Regency capital — the aesthetic inversion: cold, clean, metallic against four towns of ember and straw
- Cure assembly from the five fragments; the cure's engine is belief/community, per the Ibbur
- The braid burned at the gate (promised beat)
- **Ending branches** driven by accumulated state: wisp choice, Regency Attention, rituals
  completed, community bonds formed across all towns
- Finale music, closing credits

## Phase F — Release polish *(1–2 sessions)*

Save slots · landing/share page · itch.io mirror · trailer GIFs · (stretch) Polish localization

**Rough total: ~15–22 working sessions to full game.**

---

# Multi-agent work plan (Fable)

How we use Fable's orchestration per phase. Parallel agents **generate**; integration into
the single HTML file stays **serial** (concurrent edits to one 12k-line file would conflict).

### 1. Town design — judge panel *(Phase C/D kickoff)*
Five concept agents, each with a distinct lens: folklore authenticity · quest mechanics ·
narrative continuity with planted hooks · visual identity · ritual/mystery design. Three
judge agents score every concept against the game bible. Synthesis grafts the best ideas
from runners-up onto the winner. **Deliverable: a town design brief for your approval.**

### 2. Content drafting — parallel generation, serial integration
Fan out one agent per artifact — dialogue trees (as JS data), `drawXxxFrame` functions from
written sprite specs, map arrays, journal entries — each writing to the scratchpad. I
integrate them into index.html one at a time, verifying each in the browser preview before
the next. This respects the single-file constraint while parallelizing the slow part.

### 3. Adversarial content audit *(end of every act)*
Parallel reviewers per dimension: lore-vs-bible consistency · dialogue voice/tone · quest
state-machine dead ends · save/load integrity at every beat · audio trigger coverage.
Every finding then goes to independent skeptic agents prompted to **refute** it; only
majority-confirmed findings reach the fix list. (The Act 1 audit was the mild version of
this; the adversarial pass is what catches plausible-but-wrong findings.)

### 4. Simulated playthrough tracing
Agents walk the quest state machine in hostile orders — rituals before quest, dialogue in
reverse, save/reload between every beat, journal opened mid-cutscene — hunting soft-locks
that a linear playtest never touches.

### 5. Sprite pipeline with visual review
Per NPC: spec → one agent drafts the draw function → I integrate + screenshot in preview →
a reviewer agent compares the screenshot against the spec and the established pixel
language. Generation runs in parallel across NPCs; integration stays serial.

### 6. Standing pre-deploy audit
A saved, named workflow (`wyrdow-audit`) that runs pattern #3's cheap tier before every
push once content volume grows.

**Cost note:** these workflows spawn many agents and are token-heavy. Each runs on your
explicit go, phase by phase — say "run the design panel" / "run the audit" when ready.

---

## Design backlog (from genre research — best-of-class comparables & fan feedback)

**Cheap tier (Phase A/B):**
- [x] Window light spill + night-boosted light pools *(Eastward: lighting carried reception)*
- [x] NPC dialogue "acting" beats — acknowledgment squash, Zuzka jar flare, Baba stillness *(Night in the Woods)*
- [x] Villagers observe the noon silence — the custom taught by watching *(Black Book: world-rule consistency)*
- [x] NPC memory callbacks — one conditional line per major flag *(Undertale/NitW)*
- [x] Brisk-walk toggle (hold Shift) *(top genre complaint: slow backtracking)*
- [x] Positional SFX pan *(headphone players & reviewers notice)*

**Structural tier (Phase B/C):**
- [ ] NPC daily schedules — 2-3 waypoints per NPC by time of day *(Stardew/Majora's Mask)*
- [ ] Weather states — mist, drizzle, synchronized wind gusts *(Hob's Barrow/Mundaun)*
- [ ] Night roads rearrange without blue thread — bible rule enforced as mechanic *(Year Walk/Outer Wilds)*
- [ ] Kindness ledger — hidden community counter mirroring Regency Attention, drives Act 5 endings *(Disco Elysium)*

**Flagship bets:**
- [ ] Woodcut dialogue portraits, 48×48, two-tone carved style *(Eastward/CrossCode; screenshot signature)*
- [ ] "Customs" codex — real folklore appendix per completed ritual *(Black Book's most-praised feature)*
- [ ] Foreground occlusion layers — grass tufts, branches at 70% alpha *(Sword & Sworcery depth)*

## Immediate next step

**Phase A1: play the game.** One full playthrough by you, one by your friend on the live
link. Bring back everything that felt off — that list drives A2, and then we start Phase B.
