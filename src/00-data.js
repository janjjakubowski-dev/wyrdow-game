
// ═══════════════════════════════════════════════════════════════════════
//  WYRDÓW — The Crossroads Village (Enhanced Edition)
//  A post-apocalyptic folk-magic isometric adventure
//
//  Visual style: dark folk — ochre, moss green, ash grey, deep red.
//  Western Slavic aesthetic — wooden longhouses, wayside shrines,
//  dirt paths, copper details. Candlelit and dusk-toned.
// ═══════════════════════════════════════════════════════════════════════

// ─── COLOR PALETTE ──────────────────────────────────────────────────
const PAL = {
  dirt:        0x4a3d2e,  dirtLight:   0x5a4d3a,  dirtDark:    0x352919,
  grass:       0x3a4a2a,  grassDark:   0x2d3a1f,  grassLight:  0x4a5a35,
  grassBright: 0x5a6a40,
  mud:         0x35291d,  mudLight:    0x443828,
  overgrown:   0x3f4f2f,
  wood:        0x5a4030,  woodDark:    0x3e2c1f,  woodLight:   0x6e5540,
  log:         0x553a28,  logDark:     0x3a2518,  logLight:    0x6b4e38,
  thatch:      0x6b5a3a,  thatchDark:  0x544428,  thatchLight: 0x7d6b48,
  straw:       0x8a7a50,  strawDark:   0x6b5a30,  strawLight:  0x9a8a60,
  stone:       0x6a6a6a,  stoneDark:   0x3a3a3a,  stoneLight:  0x7e7e7e,
  iron:        0x555566,  ironDark:    0x333344,  ironLight:   0x6e6e80,
  copper:      0x8a5533,  copperDark:  0x6a3a22,  copperLight: 0xaa7044,
  fog:         0x4a5a4a,  sky:         0x1a1a28,
  dusk:        0x443355,  duskGlow:    0x664433,
  fire:        0xcc6622,  fireGlow:    0x884411,  candleLight: 0xffaa44,
  warmLight:   0xffcc66,  warmLightDim:0xaa7733,
  skin:        0xc4a882,  skinDark:    0xa08060, hair: 0x3a2a1a,
  cloth:       0x4a4a5a,  clothDark:   0x33333f,
  red:         0x884444,  deepRed:     0x772233,
  ribbon:      0xaa5555,  ribbonDark:  0x773333,
  shrineGlow:  0x88aacc,  shrineGlowDim: 0x556677,
  smoke:       0x666677,  smokeDark:   0x444455,
  dust:        0x887755,
  eerie:       0x667788,  eerieGlow:   0x445566,
  rune:        0x99bbdd,
};

// ─── ISOMETRIC MATH ─────────────────────────────────────────────────
const TILE_W = 64;
const TILE_H = 32;
function cartToIso(cx, cy) {
  return { x: (cx - cy) * (TILE_W / 2), y: (cx + cy) * (TILE_H / 2) };
}
function isoToCart(ix, iy) {
  return {
    x: (ix / (TILE_W / 2) + iy / (TILE_H / 2)) / 2,
    y: (iy / (TILE_H / 2) - ix / (TILE_W / 2)) / 2
  };
}

// ─── MAP LAYOUT ─────────────────────────────────────────────────────
// 0=grass, 1=dirt, 2=crossroads center, 3=house, 4=mud, 5=eerie fifth road
const MAP_SIZE = 24;
const CENTER = 12;
const map = [];
for (let y = 0; y < MAP_SIZE; y++) {
  map[y] = [];
  for (let x = 0; x < MAP_SIZE; x++) map[y][x] = 0;
}

function setPath(x, y, type) {
  if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
    if (map[y][x] === 0 || map[y][x] === 4) map[y][x] = type || 1;
  }
}

// Four main roads
for (let x = 0; x < MAP_SIZE; x++) { setPath(x, CENTER); setPath(x, CENTER - 1); }
for (let y = 0; y < MAP_SIZE; y++) { setPath(CENTER, y); setPath(CENTER - 1, y); }

// Fifth road — the uncanny diagonal, visually distinct (type 5)
for (let i = 0; i < 12; i++) {
  setPath(CENTER + i, CENTER - i, 5);
  setPath(CENTER + i + 1, CENTER - i, 5);
  setPath(CENTER + i, CENTER - i - 1, 5);
}
// Override where fifth road meets main roads back to type 1
for (let x = CENTER; x <= CENTER + 2; x++)
  for (let y = CENTER - 2; y <= CENTER; y++)
    if (map[y] && map[y][x] && map[y][x] === 5) map[y][x] = 1;

// Crossroads center
map[CENTER][CENTER] = 2; map[CENTER - 1][CENTER] = 2;
map[CENTER][CENTER - 1] = 2; map[CENTER - 1][CENTER - 1] = 2;

// Mud patches
[[9,11],[14,11],[11,14],[11,9],[14,13],[9,13],[8,12],[15,12],[12,8],[12,15],[7,12],[16,12]]
  .forEach(([x, y]) => { if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE && map[y][x] === 0) map[y][x] = 4; });

// Houses
const houses = [
  { x: 5,  y: 5,  w: 3, h: 2, lean: 0.06,  name: 'Herbalist',      chimney: true },
  { x: 16, y: 5,  w: 2, h: 3, lean: -0.05, name: 'Weaver',         chimney: true },
  { x: 4,  y: 15, w: 2, h: 2, lean: 0.04,  name: 'Healer',         chimney: false },
  { x: 16, y: 15, w: 3, h: 2, lean: -0.13, name: 'Smith',          chimney: true },
  { x: 6,  y: 9,  w: 2, h: 2, lean: 0.05,  name: 'Elder',          chimney: true },
  { x: 16, y: 9,  w: 2, h: 2, lean: -0.09, name: 'Baba Elzbieta',  chimney: true },
];
houses.forEach(h => {
  for (let dy = 0; dy < h.h; dy++)
    for (let dx = 0; dx < h.w; dx++)
      if (map[h.y + dy]) map[h.y + dy][h.x + dx] = 3;
});

// Wayside shrines
const shrines = [{ x:2, y:12 },{ x:12, y:2 },{ x:21, y:12 },{ x:12, y:21 }];

// Signpost positions — at ends of each road
const signposts = [
  { x: 1,  y: CENTER - 0.5, text: '← Żywiec' },
  { x: MAP_SIZE - 2, y: CENTER - 0.5, text: 'Miedźno →' },
  { x: CENTER - 0.5, y: 1, text: '↑ Leszczyny' },
  { x: CENTER - 0.5, y: MAP_SIZE - 2, text: '↓ Moczary' },
  { x: MAP_SIZE - 3, y: 1, text: '⟋ ???' },
];

// Well position
const WELL = { x: CENTER + 3, y: CENTER + 3 };

// ── THREAD KNOT MARKERS — five locations for the crossroads quest ───
// Each corresponds to a vision sequence when the player places a knot.
// Vision 1: Idol's base, 2: Hollow shrine, 3: Symmetrical house,
// 4: Marsh road edge, 5: Dead tree on east road
const MARKERS = [
  { id: 'idol_base',     x: CENTER - 0.5, y: CENTER + 0.5, name: "The Idol's Base",         placed: false },
  { id: 'hollow_shrine', x: 2,            y: 12,           name: 'The Hollow Shrine',       placed: false },
  { id: 'baba_house',    x: 17,           y: 10,           name: "Behind Baba's House",     placed: false },
  { id: 'marsh_edge',    x: CENTER - 0.5, y: MAP_SIZE - 3, name: "The Marsh Road's Edge",   placed: false },
  { id: 'dead_tree',     x: MAP_SIZE - 4, y: 3,            name: 'The Dead Tree',           placed: false },
];

// ── TOWN REGISTRY — Phase B foundation ──────────────────────────────
// A TownDefinition bundles everything the world loader needs to build a
// place. Wyrdów's definition wraps the existing module constants so the
// current game keeps working unchanged; new towns (and INTERIORS, which
// are just small towns entered through a door trigger) add entries here.
// Schema grows as Phase B lands: id, name, size, map, houses, shrines,
// markers, palette, interiors, patrols, checkpoints, charms, zLevels.
const TOWNS = {
  wyrdow: {
    id: 'wyrdow',
    name: 'Wyrdów',
    subtitle: 'The Crossroads Village',
    size: MAP_SIZE,
    map: map,            // tile grid: 0 grass, 1 dirt, 2 center, 3 house, 4 mud, 5 fifth road
    houses: houses,
    shrines: shrines,
    markers: MARKERS,
    journalHeader: 'W Y R D Ó W',
    pageNumeral: 'I.',
    // LBA-mandate fields — deliberately empty in Act 1 (no patrols in
    // Wyrdów; the Regency's arrival on the map IS the story escalation)
    patrols: [],
    checkpoints: [],
    charms: [],
    zLevels: null,       // flat village; Miedźno introduces terraces
    // Doors into interiors: E-prompt when close, gated by story flags
    // Baba stands at (16.5, 11.2) guarding the left of her front face —
    // the doorway is the RIGHT corner, tight radius, so talking to her
    // and entering the house are distinct spots
    doors: [
      { x: 17.4, y: 11.05, radius: 0.6, to: 'baba_house_interior',
        prompt: "[E] Enter Baba's house",
        requires: () => gameState.babaMetOnce },
    ],
    // Roads out — travel triggers (LBA persistent world). The east road
    // opens once Act 1's ending has played.
    travels: [
      { x: 22, y: 11.5, radius: 1.4, to: 'miedzno',
        prompt: '[E] Take the east road to Miedźno',
        spawn: { x: 1.5, y: 11.5 },
        line: 'The road east has been waiting. Roads do that.',
        requires: () => gameState.act1Complete },
    ],
  },

  // ── INTERIOR: Baba Elżbieta's house ────────────────────────────────
  // An interior is just a small TownDefinition (LBA mandate). One room:
  // braids on the wall, jar shelves, the covered drawing Zuzka mentioned.
  baba_house_interior: {
    id: 'baba_house_interior',
    name: "Baba Elżbieta's House",
    subtitle: 'It leans toward what is true',
    isInterior: true,
    size: 10,
    map: (() => {
      // 10x10 grid: ring of wall (3), floor (0) inside, doorway gap south
      const g = [];
      for (let y = 0; y < 10; y++) {
        g[y] = [];
        for (let x = 0; x < 10; x++) {
          g[y][x] = (x === 0 || y === 0 || x === 9 || y === 9) ? 3 : 0;
        }
      }
      g[9][4] = 0; g[9][5] = 0; // doorway
      return g;
    })(),
    entry: { x: 4.5, y: 7.6 },              // spawn just inside the door
    exit: { x: 4.5, y: 8.6, radius: 0.7,    // step back through the door
            to: 'wyrdow', spawn: { x: 16.5, y: 12.0 } },
    // Examine points — LBA's poke-everything density, spoken in the
    // traveller's voice. The covered frame earns a journal entry.
    examine: [
      { x: 7.6, y: 1.9, radius: 1.2, prompt: '[E] The covered frame',
        name: 'The Covered Frame', journal: 'observe_drawing',
        lines: [
          ">You lift the corner of the cloth, the way Zuzka once did.",
          ">A charcoal drawing of a hand. On the palm, drawn with more care than anything else in this careful house, is your mark.",
          ">You put the cloth back exactly as you found it. Almost exactly.",
        ] },
      { x: 5.8, y: 1.9, radius: 1.2, prompt: '[E] The braids',
        name: 'The Braid Wall',
        lines: [
          ">Seven braids hang from the pegs. Each one is someone's fate, read and kept.",
          ">One is burnt short. You decide not to ask which year that was.",
        ] },
      { x: 2.2, y: 1.9, radius: 1.2, prompt: '[E] The stove',
        name: 'The Hearth',
        lines: [
          ">The ember never quite goes out. Baba says the day it does, she'll finally sleep in.",
        ] },
      { x: 5, y: 4.5, radius: 1.1, prompt: '[E] The reading dish',
        name: 'The Reading Dish',
        lines: [
          ">The dish holds fine grey ash. It smells faintly of someone's future.",
        ] },
      { x: 7.8, y: 7, radius: 1.1, prompt: '[E] The quilt',
        name: 'The Quilt',
        lines: [
          ">The quilt is pieced from four different lives. The stitching is furious and precise.",
          ">Stitched Circle work. Nothing wasted, nothing forgotten.",
        ] },
    ],
    babaHomeAtNight: true,   // she sleeps here — village sprite hides after dusk
  },

  // ── MIEDŹNO — the Copper Hill, v1 topology (Phase C per TOWN2_BRIEF) ──
  // The hill is not a hill. NE quadrant: the Sleeper's mass with a
  // switchback terrace path. Town in the crook of its arm. Requisition
  // Office SW. True z-level traversal lands with B8; v1 walks carved
  // paths on a blocked hill mass.
  miedzno: (() => {
    const N = 24;
    const g = [];
    for (let y = 0; y < N; y++) { g[y] = []; for (let x = 0; x < N; x++) g[y][x] = 0; }
    // West road in (rows 11-12) to the town crook
    for (let x = 0; x < 17; x++) { g[11][x] = 1; g[12][x] = 1; }
    // Town lane south from the road
    for (let y = 13; y < 20; y++) { g[y][13] = 1; g[y][14] = 1; }
    // The hill mass — NE quadrant, blocked
    for (let y = 0; y <= 8; y++) for (let x = 13; x < N; x++) g[y][x] = 3;
    // Switchback terrace path carved into the hill (walkable dirt)
    for (let x = 14; x <= 21; x++) g[8][x] = 1;
    for (let y = 6; y <= 8; y++) g[y][21] = 1;
    for (let x = 15; x <= 21; x++) g[6][x] = 1;
    for (let y = 4; y <= 6; y++) g[y][15] = 1;
    for (let x = 15; x <= 20; x++) g[4][x] = 1;
    // Mud around the crucible yard
    g[19][5] = 4; g[18][6] = 4; g[20][7] = 4;
    // House footprints (collision)
    const H = [
      { x: 5,  y: 14, w: 2, h: 2, lean: 0.05,  name: 'Lamp House',  chimney: true },
      { x: 9,  y: 14, w: 3, h: 2, lean: -0.07, name: 'The Ladder',  chimney: true },
      { x: 6,  y: 17, w: 2, h: 2, lean: 0.08,  name: 'Study House', chimney: false },
      { x: 10, y: 17, w: 2, h: 2, lean: -0.04, name: 'Bread Kiln',  chimney: true },
      { x: 3,  y: 20, w: 3, h: 2, lean: 0,     name: 'Requisition Office', chimney: false },
    ];
    H.forEach(h => {
      for (let dy = 0; dy < h.h; dy++)
        for (let dx = 0; dx < h.w; dx++)
          if (g[h.y + dy]) g[h.y + dy][h.x + dx] = 3;
    });

    return {
      id: 'miedzno',
      name: 'Miedźno',
      subtitle: 'The Copper Hill',
      size: N,
      map: g,
      houses: H,
      shrines: [],
      markers: [],
      journalHeader: 'M I E D Ź N O',
      pageNumeral: 'II.',
      // Verdigris grade — oxidized copper over everything; no warm centre
      groundGrade: { r: 0.62, g: 0.86, b: 0.8, warmCenter: false },
      interiors: {}, patrols: [], checkpoints: [], charms: [], zLevels: null,
      doors: [],
      // First voice of the Copper Hill — three examine beats + Srulik
      examines: [
        { x: 7.6, y: 19.4, radius: 1.5, prompt: '[E] Talk to Srulik',
          name: 'Srulik',
          lines: [
            ">The keeper of the study house looks at you the way one reads a difficult ledger: twice.",
            "You have Elżbieta's knots in your walk. She wrote ahead. She always writes ahead.",
            "Yes — the hill. No — not now. The office counts everyone who climbs, and you have been counted once already today.",
            ">He shifts the ledger under his arm. His fingers are inked to the second knuckle.",
            "Lodge at The Ladder. Ask Cyla for the room that isn't rented. Tell her the braid sent you.",
            "And if you must know one thing about the hill tonight, know this: it was built kindly. Whatever they say now. It was built kindly, and it is very tired.",
            ">You sense that, given one more question, he would talk about the golem until winter. You keep the question.",
          ] },
        { x: 18, y: 4.4, radius: 1.6, prompt: '[E] The tear-streak',
          name: 'The Tear-Streak',
          lines: [
            ">The verdigris streak runs from the closed eye, as if the hill has been crying very slowly for a very long time.",
            ">Up close, the eyelid is not rock. It is clay. And it is warm.",
          ] },
        { x: 15.5, y: 9.6, radius: 1.4, prompt: '[E] The offering ledge',
          name: 'The Offering Ledge',
          lines: [
            ">Bread crumbs on a stone ledge by the sealed gate. Someone still tears a crust for the Skarbnik, quota or no quota.",
          ] },
        { x: 6, y: 19.2, radius: 1.5, prompt: '[E] The crucible',
          name: 'The Crucible',
          lines: [
            ">The pot is half full of surrendered charms. Copper remembers hands. Melted copper remembers nothing.",
            ">That is the point of it.",
          ] },
      ],
      travels: [
        { x: 1.5, y: 11.5, radius: 1.4, to: 'wyrdow',
          prompt: '[E] Take the west road home to Wyrdów',
          spawn: { x: 21.5, y: 11.5 },
          line: 'The road west smells of woodsmoke and thread.' },
      ],
      dress(scene) {
        const off = scene.worldOffset;
        const at = (cx, cy) => { const i = cartToIso(cx, cy); return { x: i.x + off.x, y: i.y + off.y }; };

        // ── THE SLEEPER — the hill IS a body. Tile-aligned terrace
        //    bands climb the mass; the clay face in profile crowns it,
        //    gazing SW across the town in the crook of its arm ──
        const s = scene.add.graphics();
        // Terrace bands: three iso strips over the hill rows, each a
        // parallelogram following the tile grid (not smooth mounds)
        const band = (rowY, x0, x1, topCol, faceCol, h) => {
          const a = at(x0, rowY), b = at(x1, rowY);
          // Face (vertical drop)
          s.fillStyle(faceCol, 1);
          s.beginPath();
          s.moveTo(a.x, a.y); s.lineTo(b.x, b.y);
          s.lineTo(b.x, b.y - h); s.lineTo(a.x, a.y - h);
          s.closePath(); s.fillPath();
          // Top lip highlight
          s.fillStyle(topCol, 1);
          s.beginPath();
          s.moveTo(a.x, a.y - h); s.lineTo(b.x, b.y - h);
          s.lineTo(b.x + TILE_W / 2, b.y - h - TILE_H / 2);
          s.lineTo(a.x + TILE_W / 2, a.y - h - TILE_H / 2);
          s.closePath(); s.fillPath();
        };
        band(9, 13, 23.5, 0x5a6a5e, 0x46554c, 26);   // lowest terrace
        band(7, 14.5, 23.5, 0x64746a, 0x4e5f56, 24); // middle
        band(5, 15.5, 23.5, 0x6e7f74, 0x56675e, 22); // upper
        // Copper seams glinting in the terrace faces
        s.fillStyle(0xb8742c, 0.7);
        const seams = [[15, 8.7], [18, 8.8], [21, 8.6], [17, 6.8], [20, 6.7], [18, 4.8]];
        seams.forEach(([sx, sy]) => {
          const p = at(sx, sy);
          s.fillRect(p.x - 1, p.y - 14, 2, 8);
        });

        // The face — one continuous clay PROFILE silhouette resting on
        // the upper terrace, gazing SW. A single polygon reads as a face
        // where bolted-on shapes never did.
        const hd = at(19.5, 2.2);
        const P = [
          [-14, -78],  // crown
          [-44, -66],  // forehead
          [-48, -50],  // brow ridge
          [-44, -46],  // bridge dip
          [-70, -32],  // nose tip
          [-50, -26],  // under-nose
          [-56, -18],  // upper lip
          [-50, -12],  // mouth corner
          [-58, -6],   // lower lip
          [-40, 6],    // chin
          [-10, 14],   // jaw
          [36, 12],    // jaw back
          [58, -14],   // ear line
          [54, -52],   // skull back
          [24, -74],   // crown back
        ];
        s.fillStyle(0x6e7f74, 1);
        s.beginPath();
        s.moveTo(hd.x + P[0][0], hd.y + P[0][1]);
        for (let i = 1; i < P.length; i++) s.lineTo(hd.x + P[i][0], hd.y + P[i][1]);
        s.closePath(); s.fillPath();
        // Cheek/jaw shading (kept INSIDE the silhouette)
        s.fillStyle(0x5c6c62, 0.7);
        s.fillEllipse(hd.x + 22, hd.y - 22, 56, 58);
        s.fillStyle(0x76877c, 0.6);
        s.fillEllipse(hd.x - 26, hd.y - 44, 34, 30); // brow light
        // The closed eye — a long lid at rest for eleven years
        s.fillStyle(0x2e3832, 1); s.fillRect(hd.x - 40, hd.y - 40, 26, 4);
        s.fillStyle(0x232b26, 0.9); s.fillRect(hd.x - 38, hd.y - 36, 22, 2);
        // Verdigris tear-streak from the eye's outer corner down the cheek
        s.fillStyle(0x4aa08a, 0.85);
        s.fillRect(hd.x - 20, hd.y - 36, 5, 28);
        s.fillRect(hd.x - 18, hd.y - 8, 4, 14);
        s.fillStyle(0x5ec0a4, 0.55); s.fillRect(hd.x - 19, hd.y - 34, 2, 24);
        // The scraped forehead — a paler gouge where the truth was
        s.fillStyle(0x8a9a8e, 1); s.fillRect(hd.x - 40, hd.y - 66, 32, 9);
        s.fillStyle(0x9aab9e, 0.6); s.fillRect(hd.x - 37, hd.y - 63, 25, 3);
        s.fillStyle(0x3a463e, 0.5); s.fillRect(hd.x - 40, hd.y - 57, 32, 2);
        scene.groundLayer.add(s);

        // ── Timber headframe on the second terrace ──
        const hf = at(21, 5.2);
        const f = scene.add.graphics();
        f.fillStyle(0x000000, 0.3); f.fillEllipse(hf.x, hf.y + 2, 30, 7);
        f.fillStyle(0x3a2c1c, 1);
        f.fillRect(hf.x - 12, hf.y - 44, 4, 46); f.fillRect(hf.x + 8, hf.y - 44, 4, 46);
        f.fillRect(hf.x - 14, hf.y - 48, 28, 5);
        f.lineStyle(2, 0x2c2014, 1);
        f.beginPath(); f.moveTo(hf.x - 10, hf.y - 40); f.lineTo(hf.x + 10, hf.y - 4); f.strokePath();
        f.beginPath(); f.moveTo(hf.x + 10, hf.y - 40); f.lineTo(hf.x - 10, hf.y - 4); f.strokePath();
        // The great wheel
        f.lineStyle(3, 0x4a3a24, 1); f.strokeCircle(hf.x, hf.y - 52, 9);
        f.lineStyle(1, 0x4a3a24, 1);
        f.beginPath(); f.moveTo(hf.x - 9, hf.y - 52); f.lineTo(hf.x + 9, hf.y - 52); f.strokePath();
        f.beginPath(); f.moveTo(hf.x, hf.y - 61); f.lineTo(hf.x, hf.y - 43); f.strokePath();
        f._sortY = hf.y;
        scene.objectLayer.add(f);

        // ── Sealed mine gate at the hill base + the Skarbnik's ledge ──
        const mg = at(14.5, 9.4);
        const m = scene.add.graphics();
        m.fillStyle(0x000000, 0.3); m.fillEllipse(mg.x, mg.y + 3, 40, 8);
        m.fillStyle(0x3a2c1c, 1); m.fillRect(mg.x - 20, mg.y - 30, 5, 32);
        m.fillRect(mg.x + 15, mg.y - 30, 5, 32);
        m.fillRect(mg.x - 22, mg.y - 34, 44, 6);
        m.fillStyle(0x1a1410, 1); m.fillRect(mg.x - 15, mg.y - 28, 30, 30); // dark mouth
        m.fillStyle(0x4a3a24, 1); // boards
        m.fillRect(mg.x - 16, mg.y - 22, 32, 4); m.fillRect(mg.x - 16, mg.y - 12, 32, 4);
        // Skarbnik shrine ledge with crumbs
        m.fillStyle(0x544430, 1); m.fillRect(mg.x + 22, mg.y - 12, 14, 3);
        m.fillStyle(0xc8a468, 1); m.fillRect(mg.x + 25, mg.y - 15, 4, 3);
        m.fillStyle(0xe8dfc0, 0.6); m.fillRect(mg.x + 30, mg.y - 14, 2, 2);
        m._sortY = mg.y;
        scene.objectLayer.add(m);

        // ── West entry checkpoint — zinc, straight lines, polite ──
        const cp = at(3, 11.5);
        const c = scene.add.graphics();
        c.fillStyle(0x000000, 0.3); c.fillEllipse(cp.x, cp.y + 4, 70, 9);
        // Booth
        c.fillStyle(0x8a92a0, 1); c.fillRect(cp.x - 30, cp.y - 34, 20, 36);
        c.fillStyle(0xa8b0bc, 1); c.fillRect(cp.x - 30, cp.y - 34, 20, 3);
        c.fillStyle(0x2a3040, 0.9); c.fillRect(cp.x - 26, cp.y - 28, 12, 9); // window
        c.fillStyle(0x5a3a70, 0.9); c.fillRect(cp.x - 30, cp.y - 14, 20, 3); // stripe
        // Barrier arm across the road
        c.fillStyle(0x6a7280, 1); c.fillRect(cp.x - 8, cp.y - 16, 4, 18);
        c.fillStyle(0xa8b0bc, 1); c.fillRect(cp.x - 6, cp.y - 16, 46, 4);
        c.fillStyle(0x5a3a70, 0.9);
        c.fillRect(cp.x + 2, cp.y - 16, 6, 4); c.fillRect(cp.x + 16, cp.y - 16, 6, 4); c.fillRect(cp.x + 30, cp.y - 16, 6, 4);
        c._sortY = cp.y;
        scene.objectLayer.add(c);
        const note = scene.add.text(cp.x, cp.y - 44,
          'PRESENT PERMIT ON ENTRY\n(the office is not receiving — Act 2 under construction)', {
          fontFamily: 'monospace', fontSize: '9px', color: '#c8ccd4',
          align: 'center', stroke: '#14141e', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(600);
        note._sortY = cp.y - 1;
        scene.objectLayer.add(note);

        // ── Crucible yard by the Requisition Office — the melting-down ──
        const cr = at(5.5, 18.8);
        const q = scene.add.graphics();
        q.fillStyle(0x000000, 0.3); q.fillEllipse(cr.x, cr.y + 3, 34, 7);
        q.fillStyle(0x4a4a52, 1); q.fillRect(cr.x - 10, cr.y - 16, 20, 18);
        q.fillStyle(0x5a5a64, 1); q.fillRect(cr.x - 10, cr.y - 16, 20, 3);
        q.fillStyle(0xff7b2a, 0.9); q.fillRect(cr.x - 6, cr.y - 12, 12, 4); // melt glow
        q.fillStyle(0xffc878, 0.18); q.fillCircle(cr.x, cr.y - 10, 16);
        // The queue's surrendered charms — a sad little pile
        q.fillStyle(0xb8742c, 0.9);
        q.fillRect(cr.x + 14, cr.y - 4, 3, 2); q.fillRect(cr.x + 18, cr.y - 6, 2, 3);
        q.fillRect(cr.x + 16, cr.y - 2, 4, 2);
        q._sortY = cr.y;
        scene.objectLayer.add(q);

        // ── SRULIK — keeper of the study house, ledger under his arm ──
        const sk = at(7.6, 19.1);
        const sr = scene.add.graphics();
        sr.fillStyle(0x000000, 0.3); sr.fillEllipse(sk.x, sk.y + 3, 16, 5);
        // Long dark coat, narrow shoulders
        sr.fillRect && sr.fillStyle(0x241c2a, 1);
        sr.fillRect(sk.x - 6, sk.y - 20, 12, 22);
        sr.fillStyle(0x2e2436, 1); sr.fillRect(sk.x - 6, sk.y - 20, 12, 2);
        sr.fillStyle(0x18121e, 1); sr.fillRect(sk.x - 6, sk.y - 2, 12, 2);
        // The ledger under the left arm — thick, corner-worn
        sr.fillStyle(0x6a4828, 1); sr.fillRect(sk.x - 11, sk.y - 13, 6, 8);
        sr.fillStyle(0x8a6a3a, 1); sr.fillRect(sk.x - 11, sk.y - 13, 6, 1);
        sr.fillStyle(0xd8c8a0, 1); sr.fillRect(sk.x - 10, sk.y - 11, 4, 1);
        // Head — pale, tired, kind
        sr.fillStyle(0xc0a084, 1); sr.fillRect(sk.x - 4, sk.y - 27, 8, 7);
        sr.fillStyle(0xa88a6e, 1); sr.fillRect(sk.x - 4, sk.y - 21, 8, 1);
        // Dark cap sitting far back
        sr.fillStyle(0x181420, 1); sr.fillRect(sk.x - 4, sk.y - 29, 8, 3);
        // Short white beard + ink-stained fingertips
        sr.fillStyle(0xe0dcc8, 1); sr.fillRect(sk.x - 3, sk.y - 20, 6, 3);
        sr.fillStyle(0x1a1a2e, 1); sr.fillRect(sk.x + 4, sk.y - 8, 2, 2);
        // Eyes — reading you, twice
        sr.fillStyle(0x241c14, 1);
        sr.fillRect(sk.x - 3, sk.y - 25, 2, 1); sr.fillRect(sk.x + 1, sk.y - 25, 2, 1);
        sr._sortY = sk.y;
        scene.objectLayer.add(sr);

        // ── Pines on the west approach ──
        const pg = scene.add.graphics();
        [[4, 8.6], [7, 9.2], [10, 8.4], [4, 14.6], [8, 15.2]].forEach(([px, py]) => {
          const p = at(px, py);
          pg.fillStyle(0x000000, 0.3); pg.fillEllipse(p.x, p.y + 2, 18, 5);
          pg.fillStyle(0x1c2a20, 1);
          pg.fillTriangle(p.x, p.y - 44, p.x - 12, p.y - 6, p.x + 12, p.y - 6);
          pg.fillStyle(0x24342a, 1);
          pg.fillTriangle(p.x, p.y - 46, p.x - 9, p.y - 20, p.x + 9, p.y - 20);
          pg.fillStyle(0x141e12, 1); pg.fillRect(p.x - 2, p.y - 6, 4, 7);
        });
        scene.groundLayer.add(pg);
      },
    };
  })(),
};
function activeTown() {
  return TOWNS[gameState.currentTown || 'wyrdow'] || TOWNS.wyrdow;
}

// ── QUEST STATE ─────────────────────────────────────────────────────
// Global quest object that all game elements read from. Mirrors a few
// fields in gameState so the existing systems (dialogue branches, NPC
// triggers) keep working unchanged.
// questState removed — gameState is the single authoritative source.

// All ritual / regency / observation / Ezra state lives on gameState.
// adjustAttention is the single helper for the hidden Regency meter.
function adjustAttention(amount, reason) {
  gameState.regencyAttention += amount;
  // Quiet by design — uncomment for debugging:
  // console.log('[regency]', reason, amount, '=>', gameState.regencyAttention);
  // Threshold crossings leave one diegetic tell each (GameScene consumes)
  if (gameState.regencyAttention >= 3)       gameState._attnTell = 'high';
  else if (gameState.regencyAttention <= -3) gameState._attnTell = 'low';
}

// ── Baba Elżbieta — NPC position & full dialogue tree ───────────────
// Per the bible: "Prickly matriarch of the Stitched Circle."
// She has five conversation states depending on quest progress.
const BABA = {
  cartX: 16.5,
  cartY: 11.2,
  interactRadius: 2.2,
};

// ── GAME STATE ──────────────────────────────────────────────────────
// Tracks quest progress, items, and which dialogue Baba should deliver.
// This is the single source of truth for Act 1's crossroads quest.
// ── Zuzka — child NPC at the crossroads ─────────────────────────────
// Age ~9. Sits on the idol base. Carries a jar of dead fireflies she
// insists are sleeping. Unnervingly calm. First contact in Wyrdów.
const ZUZKA = {
  cartX: CENTER - 0.5,
  cartY: CENTER - 1.8,
  interactRadius: 2.0,
};

// ── Ezra the Cobbler — eastern edge of the crossroads ───────────────
// He is one of the Lamed-Vavnik. He thinks he is a cobbler.
// He is mending the same pair of boots through all of Act 1.
const EZRA = {
  // Moved north — sits just outside the Weaver's house on the northern row
  // of buildings, well clear of Baba Elżbieta on the eastern side.
  cartX: 6.5,
  cartY: 6.5, // in front of the top-left house, near the road but not on it
  interactRadius: 2.2,
};

// ── Dziadek Józef — the old man at the end of the left wisp path ───
// Found only by following the LEFT wisps (the "truth" branch) past the
// dead tree on the north-eastern edge. He remembers the village from
// before the Regency and carries a half-burnt page of the Cure Codex.
const DZIADEK = {
  cartX: MAP_SIZE - 4.5,
  cartY: 3.5,
  interactRadius: 2.0,
};

// ── Marta the Herbalist / The Ibbur ─────────────────────────────────
// Sits outside her drying-shed on the western lane sorting bundled herbs.
// During the day she IS Marta. At dawn and dusk an Ibbur — a wandering
// righteous soul — speaks through her with eyes half-closed.
const MARTA = {
  cartX: 4.2,
  cartY: 13.5,
  interactRadius: 2.0,
};

// ── GAME STATE ──────────────────────────────────────────────────────
// Single authoritative source of truth for all game state — do not create parallel state objects
// Tracks quest progress, items, and which dialogue NPCs should deliver.
const gameState = {
  act: 1,                 // 1 = Wyrdów quest, 2+ = post-quest
  babaMetOnce: false,     // has the player spoken to Baba at all?
  knotsGiven: false,      // has Baba given the five thread knots?
  knotsPlaced: 0,         // 0–5: how many knots placed at road markers
  markersFound: [],       // ids of markers whose knots have been placed
  questActive: false,     // true once Baba hands over the thread
  questComplete: false,   // true after all 5 knots placed & codex revealed
  codexFragmentCollected: false, // true after Cure Codex fragment received
  hasGlassCharm: false,   // true after quest-complete dialogue
  hasBurntBraid: false,   // true after Act 2 repeat visit
  zuzkaMetOnce: false,    // has the player spoken to Zuzka at all?
  zuzkaSecondTalk: false, // did the player linger and talk again before Baba?
  zuzkaFarewellDone: false,// has the farewell scene (firefly) played?
  hasFirefly: false,       // did the player accept the firefly?
  firstVillageEntry: false, // becomes true after Zuzka's auto-approach has played
  inventory: [],

  // ── Memory Journal ──
  journal: {
    entries: [],        // array of entry IDs in collection order
    unread: [],         // array of unread entry IDs
    selectedEntry: null,// currently selected entry ID
  },

  // ── Observation mechanic ──
  observedZones: [],          // array of zone IDs already observed this session

  // ── Ritual system ──
  ritualState: {
    perimeter_walked: false,
    domovoi_offering_correct: false,
    domovoi_offering_attempted: false,
    noon_silence_kept: false,
    nocnica_found: false,
    wisp_choice: null,        // 'truth' | 'comfort' | 'ignored' | null
  },

  // ── Regency Attention ──
  regencyAttention: 0,        // negative = low visibility, positive = high visibility
  brelMode: 'neutral',        // 'low' | 'neutral' | 'high' — calculated at Codex collection
  brelArrivalDelay: 0,        // ms offset applied to Brel's arrival timer
  brelSceneFired: false,      // closing scene one-shot guard
  act1Complete: false,        // true only after the title card has played
  worldItemsTaken: [],        // ids of picked-up ground items (persisted)
  currentTown: 'wyrdow',      // active TownDefinition id (Phase B)
  regencyFired: {},           // per-trigger dedupe map; keys set true after firing

  // ── Ezra the Cobbler ──
  ezraState: {
    sceneShown: null,         // last scene id played: '1' | '1b' | '2' | '3' | '4' | '5' | '7' | '8'
    copperWireGiven: false,
    codexShown: false,
  },

  // ── Domovoi state ──
  domovoiState: {
    sceneShown: null,         // 0 | 1 (wrong) | 2 (correct first) | 3 (post-fragment) | 4 (post-Brel) | 5 (act2)
    sceneShownAct2: false,
    signpostFragmentFound: false,
  },

  // ── Dziadek Józef ──
  dziadekState: {
    revealed: false,        // becomes true once wisp_choice === 'truth'
    sceneShown: 0,          // 0 not met, 1 met, 2 page given, 3 farewell
    pageGiven: false,
  },

  // ── Marta / The Ibbur ──
  // Marta is a daytime herbalist. At dawn and dusk an ibbur (a benevolent
  // soul-passenger) speaks through her. Tracks which scenes have played
  // for each persona so the dialogue advances naturally.
  martaState: {
    martaScene: 0,            // 0 = not met, 1 = greeted, 2 = warned about Brel
    ibburScene: 0,            // 0 = not met, 1 = first message, 2 = farewell
    lastSeenAs: null,         // 'marta' | 'ibbur' — used to narrate the handover
    handoverShown: false,
  },

  // ── Game clock (real-time advancing) ──
  gameHour: 8.0,              // 0..24 decimal — starts at 8:00 AM on village entry
  wispsVisible: false,        // updated each game-hour
  iburActive: false,          // updated each game-hour
  _noonBellRung: false,       // one-shot guard per in-game day

  // ── Save system & settings ──
  hasSave: false,             // true once any save has been written
  musicVolume: 0.8,           // 0..1 — applied as master multiplier on MusicManager
  ambientVolume: 0.65,        // 0..1 — natural target for procedural ambient bed
  sfxVolume: 0.8,             // 0..1 — reserved for future SFX bus
  instantText: false,         // skip the dialogue typewriter entirely
  textScale: 1,               // 1 = normal, 1.2 = large dialogue text
};

// ── SAVE SYSTEM ─────────────────────────────────────────────────────
// Persists gameState into localStorage under 'wyrdow_save'.
// Settings live in 'wyrdow_settings' so they survive a New Game.
const SAVE_KEY = 'wyrdow_save';
const SETTINGS_KEY = 'wyrdow_settings';

// ── Save v2: town-scoped state namespacing ──────────────────────────
// The flat fields on gameState are the ACTIVE town's working state.
// stashTownState() copies them into gameState.towns[<town>] before a
// save or a journey; loadTownState() restores them on arrival. Interiors
// share their parent town's namespace.
const TOWN_SCOPED_FIELDS = [
  'markersFound', 'observedZones', 'worldItemsTaken', 'perimeterHits',
  'domovoiSequence', 'memoryFragments', 'ritualState', 'ezraState',
  'domovoiState', 'dziadekState', 'martaState', 'knotsPlaced',
  'questActive', 'questComplete', 'codexFragmentCollected', 'babaMetOnce',
  'knotsGiven', 'zuzkaMetOnce', 'zuzkaSecondTalk', 'zuzkaFarewellDone',
  'firstVillageEntry',
];
function townKeyOf(townId) {
  const def = TOWNS[townId || gameState.currentTown || 'wyrdow'];
  if (def && def.isInterior && def.exit) return def.exit.to; // parent town
  return def ? def.id : 'wyrdow';
}
function stashTownState() {
  if (!gameState.towns) gameState.towns = {};
  const key = townKeyOf();
  const bucket = {};
  TOWN_SCOPED_FIELDS.forEach(f => {
    bucket[f] = JSON.parse(JSON.stringify(gameState[f] === undefined ? null : gameState[f]));
  });
  gameState.towns[key] = bucket;
}
function loadTownState(townId) {
  if (!gameState.towns) gameState.towns = {};
  const key = townKeyOf(townId);
  const bucket = gameState.towns[key];
  if (!bucket) return; // fresh town — flat fields keep their defaults
  TOWN_SCOPED_FIELDS.forEach(f => {
    if (bucket[f] !== null && bucket[f] !== undefined) {
      gameState[f] = JSON.parse(JSON.stringify(bucket[f]));
    }
  });
}

function saveGame() {
  try {
    stashTownState(); // keep the active town's namespace current
    const snap = JSON.parse(JSON.stringify(gameState));
    snap.saveVersion = 2;
    snap._savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    gameState.hasSave = true;
    return true;
  } catch (e) { console.warn('saveGame failed', e); return false; }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const snap = JSON.parse(raw);
    Object.assign(gameState, snap);
    // Ensure journal structure for old saves
    if (!gameState.journal) gameState.journal = { entries: [], unread: [], selectedEntry: null };
    if (!gameState.journal.entries) gameState.journal.entries = [];
    if (!gameState.journal.unread) gameState.journal.unread = [];
    if (!gameState.worldItemsTaken) gameState.worldItemsTaken = [];
    // Save v2 migration: v1 saves had no town namespaces — the flat
    // fields ARE Wyrdów's state, so stash them under 'wyrdow'
    if (!snap.saveVersion || !gameState.towns) {
      gameState.towns = gameState.towns || {};
      const wasTown = gameState.currentTown;
      gameState.currentTown = 'wyrdow';
      stashTownState();
      gameState.currentTown = wasTown || 'wyrdow';
    }
    // MARKERS is a module const — rebuild its placed flags from the save
    // (they were previously never restored: knots were re-placeable and
    // visions replayed after every reload)
    try {
      MARKERS.forEach(m => { m.placed = (gameState.markersFound || []).includes(m.id); });
    } catch (e) {}
    // Repair: a save taken mid-Brel-scene has brelSceneFired=true but the
    // ending never finished (act1Complete unset) — let it re-fire so the
    // Act 1 ending isn't permanently lost
    if (gameState.brelSceneFired && !gameState.act1Complete) gameState.brelSceneFired = false;
    gameState.hasSave = true;
    return true;
  } catch (e) { console.warn('loadGame failed', e); return false; }
}
function hasSavedGame() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      musicVolume: gameState.musicVolume,
      ambientVolume: gameState.ambientVolume,
      sfxVolume: gameState.sfxVolume,
      instantText: gameState.instantText,
      textScale: gameState.textScale,
    }));
  } catch (e) {}
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY); if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.musicVolume === 'number') gameState.musicVolume = s.musicVolume;
    if (typeof s.ambientVolume === 'number') gameState.ambientVolume = s.ambientVolume;
    if (typeof s.sfxVolume === 'number') gameState.sfxVolume = s.sfxVolume;
    if (typeof s.instantText === 'boolean') gameState.instantText = s.instantText;
    if (typeof s.textScale === 'number') gameState.textScale = s.textScale;
  } catch (e) {}
}
loadSettings();

// ═══════════════════════════════════════════════════════════════════════
//  MEMORY JOURNAL — entry definitions + helper
// ═══════════════════════════════════════════════════════════════════════
function addJournalEntry(entryId) {
  if (!gameState.journal) gameState.journal = { entries: [], unread: [], selectedEntry: null };
  if (!gameState.journal.entries.includes(entryId)) {
    gameState.journal.entries.push(entryId);
    gameState.journal.unread.push(entryId);
    try { saveGame(); } catch (e) {}
    // Quiet toast so the player knows the journal has something new
    try {
      const gs = game.scene.getScene('GameScene');
      if (gs && gs.scene.isActive() && gs._showJournalToast) gs._showJournalToast();
    } catch (e) {}
  }
}

const JOURNAL_ENTRIES = {
  // ── Visions ──
  vision_1: {
    title: 'The Hands at the Crossroads', type: 'vision', category: 'Vision',
    text: "I looked at my hands and one of them was answering a question I hadn\u2019t asked yet. Someone stopped the woman who was writing. Someone with larger hands and a calm voice. It isn\u2019t time, they said. I am beginning to think it never was, for them.",
  },
  vision_2: {
    title: 'The Counting Child', type: 'vision', category: 'Vision',
    text: "A child counting in three languages, stopping at three. A door with wrong light under it. The counting resumed after the door closed \u2014 quieter, but it resumed. That matters. The counting resumed.",
  },
  vision_3: {
    title: 'The Laboratory Window', type: 'vision', category: 'Vision',
    text: "Someone understood something important and was about to show me their face. The vision ended there. I think that\u2019s deliberate. I think I have to earn the rest.",
  },
  vision_4: {
    title: 'The Runner in the Night', type: 'vision', category: 'Vision',
    text: "Five pieces. Five towns. They can\u2019t search everywhere. The person running knew exactly what they were doing. The cold lights behind them did not need to hurry. That detail stays with me.",
  },
  vision_5: {
    title: 'The Last Song', type: 'vision', category: 'Vision',
    text: "They sang until they couldn\u2019t. Then one voice kept going. Then silence. Then someone said: you are carrying it now. I didn\u2019t choose this. I am choosing to carry it anyway. I think that\u2019s the difference.",
  },
  // ── NPC revelations ──
  baba_revelation: {
    title: 'Baba El\u017Cbieta: The Roads Are Wrong', type: 'npc', category: 'Conversation',
    text: "She read my fate from a burnt braid and told me not to be flattered that the mark chose me. She said it chose someone ordinary enough not to break. I am trying to decide if that\u2019s an insult. I don\u2019t think it is.",
  },
  ezra_boots: {
    title: 'Ezra: The Boots Without an Owner', type: 'npc', category: 'Conversation',
    text: "He has been mending the same boots for eleven years. He says the owner will come back eventually. He says this with complete certainty. The sole pattern matches someone from the third vision. I didn\u2019t tell him. I\u2019m not sure he needs to know.",
  },
  domovoi_watching: {
    title: 'The Domovoi: Eleven Days of Watching', type: 'npc', category: 'Conversation',
    text: "A house spirit, two hundred years old, frightened by a man with a clipboard. Not because he\u2019s cruel, he said. Because he\u2019s certain. I keep thinking about that. Certainty as the thing that doesn\u2019t stop.",
  },
  ibbur_rivka: {
    title: 'The Ibbur: Rivka\u2019s Name', type: 'npc', category: 'Conversation',
    text: "She borrowed someone else\u2019s voice to tell me: the cure worked. The Regency erased it not because it failed but because it required something they couldn\u2019t control. Belief. Community. The old ways working. Her name was Rivka. I will not forget it.",
  },
  nocnica_cost: {
    title: 'Nocnica: What the Mark Costs', type: 'npc', category: 'Conversation',
    text: "She watched my hand the entire time. Not my face. She had seen the mark before, on someone who didn\u2019t reach the end. She said that person made it far enough. I am still deciding what far enough means.",
  },
  // ── Observations ──
  observe_idol: {
    title: 'The Idol\u2019s Eyes', type: 'observe', category: 'Discovery',
    text: "They were closed when I arrived. I am certain of this. They are open now. I have decided not to think too hard about when the change happened.",
  },
  observe_board: {
    title: 'The Board Replaced From Inside', type: 'observe', category: 'Discovery',
    text: "One board on the inn window is newer than the others. It was replaced from the inside. The Domovoi doesn\u2019t touch the ground. Something is maintaining that building carefully. I find this more comforting than I probably should.",
  },
  observe_firefly: {
    title: 'The Firefly That Matches the Mark', type: 'observe', category: 'Discovery',
    text: "Zuzka\u2019s jar contains several fireflies. One pulses in the same rhythm as the mark on my hand. She has been carrying it for some time. I don\u2019t think she knows what it means. I don\u2019t think I do either.",
  },
  observe_drawing: {
    title: 'The Drawing Behind the Cloth', type: 'observe', category: 'Discovery',
    text: "Baba keeps a charcoal drawing behind a cloth on her wall. It is a hand, and on the palm — drawn with more care than anything else in that careful house — is my mark. She was not surprised when I arrived. She had been looking at me for years.",
  },
  // ── Document ──
  doc_rivka: {
    title: 'Project RIVKA \u2014 Internal Memorandum', type: 'document', category: 'Document',
    text: "They knew before the Collapse. They were watching before they had a reason to watch. Which means someone told them. The report says the methodology is more viable than expected. It says this like a warning to itself.",
  },
  // ── Ritual ──
  ritual_roads: {
    title: 'The Roads Remember', type: 'ritual', category: 'Ritual',
    text: "The roads straightened. Not dramatically \u2014 just became more certain about where they go. Po\u0142udnica appeared at noon and looked at my hand and nodded. Baba El\u017Cbieta\u2019s bells rang on their own. I think I did something real today.",
  },
};

// ── CUSTOMS — the folklore appendix (Black Book's most-loved idea) ──
// Unlocked when a ritual completes: what the custom IS, in the world's
// own memory. The traveller records what the locals half-remember.
Object.assign(JOURNAL_ENTRIES, {
  custom_perimeter: {
    title: 'Custom: Walking the Bounds', type: 'custom', category: 'Custom',
    text: "The old villages walked their own edges once a year — obchod granic, the beating of the bounds — sunwise, always sunwise, so the fields would know their keepers and the wards would know their names. The Regency calls it trespass-adjacent perambulation. The wards call it being greeted. I walked it. Something noticed.",
  },
  custom_offering: {
    title: 'Custom: Bread First, Always Bread', type: 'custom', category: 'Custom',
    text: "For the domowik — the house's grandfather-spirit — the order is the courtesy: bread, that the house never hunger; salt, that the friendship never spoil; then one thing that matters to you, so the spirit knows you are not paying a toll but keeping company. Zuzka's grandmother was strict about the order. Now I understand she was being polite to someone.",
  },
  custom_noon: {
    title: 'Custom: The Noon Silence', type: 'custom', category: 'Custom',
    text: "The południca walks the field-roads at midday, and the old rule is not to hide but to REST — to stop the scythe, still the tongue, and let the hour pass through you. Noon is hers the way midnight belongs to others. The village stops. Even the chickens. The custom is not fear. It is manners.",
  },
  custom_nocnica: {
    title: 'Custom: What Watches After Dusk', type: 'custom', category: 'Custom',
    text: "Nocnice come with the dark at the edges of settled places, and the lore is exact: they are drawn to motion and quieted by stillness. The old mothers did not bar the door against them — they sat still by the marsh and let themselves be seen. What watches from the corner of your eye is shy, not cruel. Baba said there was a difference. She was right.",
  },
  custom_wisps: {
    title: 'Custom: The Lights That Ask', type: 'custom', category: 'Custom',
    text: "Błędne ognie — the wandering fires. The rationalists said marsh-gas; the old folk said souls with one errand left. Both agreed on the rule: the lights do not lead you anywhere. They ask you to CHOOSE, and the choosing is the point. Truth's road is longer. It was longer for them too.",
  },
});

// Display names for inventory item ids — shown in the journal's
// "Carried" section on the left page.
const ITEM_NAMES = {
  thread_knots:          'Enchanted Thread Knots',
  cure_codex_fragment_1: 'Cure Codex Fragment',
  glass_charm:           'Glass Charm',
  firefly:               'Sleeping Firefly',
  burnt_braid:           'Burnt Braid',
  copper_wire:           'Copper Wire',
  codex_page_burnt:      'Burnt Codex Page',
  bread:                 'Bread',
  salt:                  'Salt',
  memory_fragment:       'Memory Fragment',
};
function itemDisplayName(id) {
  if (ITEM_NAMES[id]) return ITEM_NAMES[id];
  // Fallback: prettify the raw id
  return String(id).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

gameState.hasSave = hasSavedGame();
window.saveGame = saveGame;
window.loadGame = loadGame;

// ── Game clock constants ───────────────────────────────────────────
// 1 game-hour = 2 real minutes (full day = 48 real minutes)
const GAME_HOUR_MS = 2 * 60 * 1000;
const TIME_WINDOWS = {
  dawn:      { start: 6,  end: 7  },
  morning:   { start: 7,  end: 12 },
  noon:      { start: 12, end: 13 },
  afternoon: { start: 13, end: 19 },
  dusk:      { start: 19, end: 20 },
  night:     { start: 20, end: 24 },
  latenight: { start: 0,  end: 6  },
};
function isTimeWindow(name) {
  const w = TIME_WINDOWS[name];
  if (!w) return false;
  return gameState.gameHour >= w.start && gameState.gameHour < w.end;
}

// ── BABA'S DIALOGUE SCRIPTS ────────────────────────────────────────
// Full dialogue tree from the game script. Each state returns an array
// of lines. Stage directions in [brackets] become italic system text.
// ">" prefix marks a line as a stage direction (rendered differently).

const BABA_DIALOGUE = {

  // ─── SCENE 1: First Meeting ───────────────────────────────────────
  // Triggered when the player approaches for the first time.
  // Baba reads the player's fate, explains the crossroads quest,
  // and gives them five enchanted thread knots.
  firstMeeting: [
    ">The door opens before you knock.",
    "Wipe your feet. Both of them.",
    ">You step inside.",
    "Sit. Don't touch the braids. Don't touch the jars. Don't touch that either — I don't know what that is anymore and neither should you.",
    ">She looks at your hand without being asked.",
    "Yes, I can see it. I'm old, not blind. There's a difference, though my nephew has never understood this.",
    ">She sits. Picks up a braid. Holds it over a candle flame.",
    "Hold still. I'm going to read you. It won't hurt. It might itch. If you smell something burning that isn't the braid, tell me immediately.",
    ">The braid catches. She watches the smoke.",
    "Hmm.",
    ">A long pause.",
    "You didn't come here on purpose, did you. No. The road brought you. The road has been doing that since the Collapse — taking people where they're needed rather than where they're going. Rude, but effective.",
    "The mark on your hand is old. Older than you. Older than this village. It was waiting for someone to be ordinary enough to carry it without breaking. Apparently that's you. Try not to be flattered.",
    "The roads here are wrong. Have been since the Collapse. Five paths, none of them true anymore. Something was cut that should have been knotted. Or knotted that should have been cut. Either way, the paths don't remember where they go, and that means the things that use paths — spirits, memories, the occasional lost cure — can't find their way either.",
    "You're going to fix it. Before you ask why you — don't. The mark chose. I didn't. I would have chosen someone taller.",
    ">She produces five thread knots — blue, faintly damp — and places them on the table one by one.",
    "Five knots. Five markers around the village. You'll know them when you see them — they'll make your hand itch. Place a knot at each one. Don't rush. Południca owns the noon hour and she doesn't like rushing. Or noise. Or questions. You'll do fine.",
    "When you're done, come back. I'll have something for you. I've had it for eleven years. I was beginning to think no one was coming.",
    ">She turns away — conversation over.",
    "Close the door on your way out. The domovoi gets anxious when it's open too long.",
  ],

  // ─── SCENE 3: Mid-Quest Check-ins ────────────────────────────────
  // Triggered when the player returns before placing all five knots.

  // 0–1 knots placed
  checkIn_early: [
    "You're back already? Did you forget something? ...You forgot where to go, didn't you. The markers will itch your hand. Walk slowly. Pay attention. The village will show you.",
    "And when you have a spare evening — walk the village bounds. All the way round, sunwise. The old wards remember who bothers to greet them.",
  ],

  // 2–3 knots placed
  checkIn_mid: [
    "You can feel it, can't you? The roads pulling a little straighter. Like a spine after a long sleep. Good. Keep going. You're doing well. Don't tell anyone I said that.",
    "One more thing. If you're out past dusk near the marsh — the quiet places — stand still a while. What watches from the corner of your eye is shy, not cruel. There's a difference.",
  ],

  // 4 knots placed
  checkIn_almost: [
    "One more. The last one is the hardest to find — not because it's hidden, but because you'll walk past it twice thinking it's just a tree. It isn't just a tree. Nothing in Wyrdów is just anything.",
  ],

  // ─── SCENE 4: Quest Complete ──────────────────────────────────────
  // Triggered when the player returns after placing all five knots.
  // Baba reveals the Cure Codex fragment, gives the glass charm,
  // and points the player toward Miedźno and Pławica.
  questComplete: [
    ">She is standing at the window. She doesn't turn around.",
    "I felt it. The moment the last knot caught. Like a shoulder clicking back into place. The village felt it too — they won't know what changed, but they'll sleep better tonight. They always do when the roads remember themselves.",
    ">She turns. She's holding a woven amulet — small, dense, clearly very old.",
    "I found this eleven years ago in the lining of my mother's coat. She'd sewn it there and never told me. My mother kept secrets the way other women kept recipes — carefully, and with the assumption that someone would eventually need them.",
    ">She holds it out. You take it.",
    "Open it. Carefully. The thread on the left side is load-bearing.",
    ">You open the amulet. Inside: the first Cure Codex fragment — one page, folk art over technical diagrams, both only half-legible.",
    "I don't know what it says. I've spent eleven years not knowing. What I do know is that four more pieces exist, and that they were scattered deliberately, and that whoever scattered them was either very frightened or very careful. Possibly both.",
    "Miedźno has one — the copper hill. Ask for Srulik. Don't let him talk about the golem for more than an hour or you'll be there until winter. Pławica may have another, though getting a straight answer out of anyone on that marsh is its own kind of quest.",
    "The others — I don't know yet. But the roads are straighter now. Things will find their way to you more easily. Including trouble, so be thoughtful.",
    ">She presses a small glass charm into your hand — on a cord, cloudy green, faintly warm.",
    "If you meet a Wellness Officer — and you will — tuck your marked hand into your sleeve and hold this against your palm. It won't fool them indefinitely. But indefinitely isn't what we need. We need enough time. That's all anyone ever needs.",
    ">She sits back down. Picks up a new braid.",
    "Go. The roads are waiting. And eat something before you leave — you look like you've been unconscious in a ditch.",
    ">A beat.",
    "...I made soup. It's on the stove. Don't read anything into it.",
  ],

  // ─── SCENE 5: Act 2+ — First Return ──────────────────────────────
  // Optional callback scene for later acts.
  // Baba gives the burnt braid keepsake.
  act2_firstReturn: [
    "You came back. I didn't think you would. I hoped, but I'm old enough not to confuse hoping with expecting.",
    "Sit down. Tell me what the roads showed you. Leave nothing out — even the parts that don't make sense. Especially those parts.",
    ">After you share your progress.",
    "Hmm. The midpoint twist — yes. I suspected. My mother suspected before me. There's a difference between a cure that fails and a cure that is made to fail. One is tragedy. The other is a choice someone made and hoped you'd never find out about.",
    "You're going to find out about it. That's what the mark is for.",
    ">She stands, slower than before.",
    "I won't be here when you come back next time. Don't make that face — I'm not dying. I'm moving. The Regency has filed a compliance review on the village and I have approximately four days before they send someone who actually knows what they're looking for. I'll be in the forest. The domovoi knows where.",
    "The Stitched Circle will carry on. We always do. That's rather the point of us.",
    ">She presses something small into your hand — a burnt braid, tied into a bracelet.",
    "My mother's. Keep it. When you reach the Tenth City — and I believe you will — burn it at the gate. She always wanted to see what was inside. One of us should get to.",
  ],

  // Subsequent Act 2+ visits after giving the braid
  act2_repeat: [
    "Still alive? Good. I'd hate to have wasted a perfectly good braid on a corpse.",
    "The Stitched Circle sends its regards. We've been strengthening the waystones since you fixed the roads. The village sleeps easier now.",
    "Południca appeared at noon yesterday. Full form, scythe and all. She looked toward the east road and nodded. I think that's approval. With her, it's hard to tell.",
    "Go on, cure-bearer. You don't need my permission. But you have it anyway.",
  ],
};

// ── EZRA'S DIALOGUE SCRIPTS ─────────────────────────────────────────
// Eight conversation states + a Codex-show interaction. Stage directions
// are prefixed with ">". Choice objects offer the player options.
const EZRA_DIALOGUE = {
  // ─── SCENE 1: First Meeting ──────────────────────────────────────
  scene1: [
    ">He doesn't look up from the boots.",
    "Sit down if you like. I don't charge for company.",
    ">He holds the boot up to the light, squints at the sole, sets it back down.",
    "You've got the look of someone who arrived somewhere they didn't intend to. It's in the way you're standing. Like you're not sure the ground is going to stay where you put it.",
    ">He looks up briefly — warm eyes, not unkind, slightly amused.",
    "Let me see your shoes.",
    { type: 'choice', options: [
      { label: 'Hold out your shoes.',
        response: [
          "Mm. Come a long way recently. Not in distance — in circumstance. The heel on the right is worn outward, which means you've been turning away from something repeatedly. Not running. Just... angling away. Like you keep deciding not to decide.",
          ">He sets down his needle.",
          "The left is more worn than the right, which means you lead with doubt and follow with conviction. That's not a bad way to be. Safer than the opposite.",
          ">He picks the needle back up.",
          "You're in the right place, for what it's worth. Which in my experience is quite a lot.",
        ]},
      { label: "I'd rather not.",
        response: [
          "That's fine. Shoes tell the truth and sometimes people aren't ready for that.",
          ">He keeps working.",
          "Come back when you've walked a bit more. The village has a way of giving people things to think about. You'll have more to show me after.",
        ]},
      { label: 'What do shoes tell you?',
        response: [
          "Everything a person won't say out loud. Where they've been, what they were feeling when they went there, whether they were moving toward something or away from it. Fear wears differently than hope. Grief leaves a very specific pattern on the inner sole — people don't realise how much of sadness lives in the feet.",
          ">Small smile.",
          "My wife used to say I paid more attention to shoes than to faces. She wasn't wrong. Faces can lie. Shoes have no reason to.",
        ]},
    ]},
  ],

  // ─── SCENE 1B: First meeting AFTER perimeter walk ────────────────
  scene1b: [
    ">Ezra looks up the moment you approach — before you speak.",
    "You walked the whole boundary. I felt it — the village settles differently when someone takes the time. Like a held breath releasing.",
    ">He sets the boots aside entirely — unusual.",
    "Sit down properly. I have something to tell you and I want to say it right.",
    ">He looks at your shoes for a long moment.",
    "You've been turning away from something — you know that. But underneath the turning-away pattern, there's something else. A very old wear mark. Not from your walking. From someone else's. Which means you're carrying something that was put in motion before you were part of it.",
    ">He reaches into his apron pocket and produces a small piece of copper wire, coiled neatly.",
    "Someone left this with me eleven years ago. Asked me to give it to the next person who walked the whole boundary. Said they'd know what it was for. I've been waiting.",
    ">He holds it out.",
    "I don't know what it does. I'm a cobbler. But they were very specific about the boundary-walking. Very specific.",
    "Good. I always wondered if anyone would come. It gets heavy, holding things for people who might not arrive.",
    ">Small exhale — something released.",
    "The boots I'm mending belong to the same person, I think. They left in a hurry. They'll come back for them, or they won't. Either way the boots will be ready.",
  ],

  // ─── SCENE 2: After Quest Begins, knots_placed = 0 ───────────────
  scene2: [
    "The thread-work. Yes. The roads have needed it for a while — you can feel it in the cobblestones, or you could if we had cobblestones. The dirt knows.",
    ">He doesn't look up.",
    "The markers will find you as much as you find them. That's how the old paths work. Walk slowly. Pay attention to where your feet want to go.",
    ">Beat.",
    "The east road marker is near the dead tree. In case your feet are uncertain.",
  ],

  // ─── SCENE 3: Mid-quest, knots 2-3 ───────────────────────────────
  scene3: [
    "I can feel the roads pulling straighter. It's subtle — like a table with one short leg being shimmed. Most people won't notice. But I notice. The ground notices.",
    ">He holds the boot up to light again.",
    "The visions you're seeing at the markers — don't try to understand them yet. They're not for understanding right now. They're for carrying. Understanding comes later, if you're lucky and patient. Usually in that order.",
    ">He looks up briefly.",
    "Are you eating? You look like someone who forgets to eat when they're thinking. That's an old habit of people who care too much about the wrong things in the right direction.",
  ],

  // ─── SCENE 4: After all knots placed ─────────────────────────────
  scene4: [
    "There. Can you feel that?",
    ">He sets the boots down on the ground beside him — the first time he's not holding them.",
    "The roads remember where they go now. Things will find their way here more easily. Good things and difficult things. The roads don't discriminate. They just connect.",
    ">He looks at your shoes again — longer than usual.",
    "Your shoes look different now. The heel pattern changed. You're not turning away from something anymore. You're turned toward it.",
    ">Small smile — warm, slightly sad.",
    "That's the harder stance, in my experience. Turning toward things. The shoes wear faster. But they wear true.",
    ">He picks the boots back up.",
    "Go see Baba Elżbieta. She's been holding something for eleven years. It would be unkind to make it twelve.",
  ],

  // ─── SCENE 5: After Codex Fragment collected ─────────────────────
  scene5: [
    "You have it. I can tell — not from the shoes this time. From the way you're holding yourself. Like you've picked up something heavier than it looks.",
    ">He keeps working.",
    "The Codex pages were scattered by someone who was running. I think you know that now. What you don't know yet is that running was the right choice — not the brave choice, not the comfortable choice, but the right one. There's a difference.",
    ">He pauses — needle still.",
    "Miedźno will be harder than Wyrdów. The copper hill holds older things. Srulik is a good man but he's been alone with his grief for a long time. Be patient with him.",
    ">He resumes.",
    "And eat something before you go. I'm serious about that.",
  ],

  // ─── SCENE 7: Showing the Codex fragment ─────────────────────────
  scene7_showCodex: [
    ">Ezra looks at the page for a long time without touching it.",
    "I've seen this handwriting before. Not this page — a different page. Someone showed me a different page eleven years ago and asked me if I could read it.",
    ">He looks up.",
    "I couldn't. I'm a cobbler. But I remembered the handwriting because it moved like someone who was writing fast and carefully at the same time. The way you write when you're afraid of running out of time.",
    ">He looks back at the boots in his lap.",
    "She had good shoes. Practical. The soles were reinforced — she'd done it herself, added an extra layer. Someone who planned to walk a long way.",
    ">Beat.",
    "I don't know where she went. I hope the shoes held.",
  ],

  // ─── SCENE 8: Wellness Officer scene (post-Brel) ─────────────────
  scene8_postBrel: [
    ">Ezra doesn't look up from the boots, but he speaks more quietly than usual.",
    "Clean shoes. Not a mark on them. You can tell everything about a person from their shoes.",
    ">Beat.",
    "His soles are completely even. No wear pattern at all. You know what that means?",
    ">He looks up at you.",
    "It means he never hesitates. Never turns away, never turns toward. Just moves in straight lines toward what he's been told to move toward.",
    ">He looks back down.",
    "Very clean shoes. Very.",
  ],
};

// ── ZUZKA'S DIALOGUE SCRIPTS ────────────────────────────────────────
// Lines prefixed with ">" are stage directions (italic, dimmer).
// Objects with type:'choice' present player options (1/2/3 keys).
// Each choice option has a label and response lines that play after.

const ZUZKA_DIALOGUE = {

  // ─── SCENE 1: First Encounter ─────────────────────────────────────
  firstEncounter: [
    "You've got the mark.",
    ">She hops down from the idol and walks closer, studying your hand with scientific interest.",
    "I've seen drawings of it. In Baba Elżbieta's house, on the wall behind the big jar. She covers it with a cloth when visitors come but I looked once when she was asleep.",
    "She said someone with the mark would come eventually. She also said don't bring them to her directly because she'd rather pretend she wasn't expecting anyone.",
    ">She points at the crookedest house without looking at it.",
    "That's her house. The one that leans the most. She says it leans toward what's true. I think it leans because the foundations are bad, but I didn't say that to her.",
    ">She looks back at your hand.",
    "Does it hurt?",
    { type: 'choice', options: [
      { label: 'No. It just pulses.',
        response: [
          "Like a second heartbeat. Yes. That's what the drawings showed. A heartbeat for something that isn't yours yet.",
        ]},
      { label: 'A little.',
        response: [
          "That means it's working. Baba Elżbieta says useful things are usually uncomfortable. She says this about her shoes also.",
        ]},
      { label: "I don't know what it is.",
        response: [
          "Neither does anyone here. But Baba Elżbieta knows what it's for. That's different from knowing what something is. Most important things are like that.",
        ]},
    ]},
  ],

  // ─── SCENE 2: Lingering Before Visiting Baba ─────────────────────
  beforeBaba: [
    "You're still here. Most people with the mark in the drawings were moving faster.",
    ">She shakes her jar of fireflies gently.",
    "These are sleeping. They'll wake up when conditions are right. That's what I've decided.",
    ">Beat.",
    "My mother says I make up reasons for things that don't have reasons. But I think everything has a reason. I think some reasons are just very far away from the thing they belong to.",
    "Like you. You're here for a reason that started somewhere else, a long time ago. I can tell.",
    "Go see Baba Elżbieta. She's been waiting eleven years. It would be rude to make it twelve.",
  ],

  // ─── SCENE 3: During the Crossroads Quest ────────────────────────
  quest_early: [
    "I can feel something changing. Like when a tooth comes loose — you can't see it moving but you can feel it will.",
    "One of the markers is near the dead tree on the east road. I used to climb it before it died. It's still a good tree. Just tired.",
    "Oh — when the noon bell rings, stand still until it stops. Everyone does. Even the chickens. Especially the chickens.",
  ],

  quest_mid: [
    "The roads look different. Not to my eyes — to my feet. They feel more certain about where they're going.",
    ">She looks at her jar.",
    "I think the fireflies felt it too. One of them moved.",
    "My grandmother used to leave food in the bowl by the inn door. For the house-spirit. Bread first — always bread first, then salt, then something that matters to you. She was very strict about the order.",
  ],

  quest_done: [
    "There. Can you feel that?",
    ">She closes her eyes.",
    "My grandmother said the roads used to sing before the Collapse. Not loudly. More like humming. She said if you put your ear to the ground at the crossroads on a still day you could hear them deciding where to go.",
    "I've tried many times. I've never heard it. But I haven't stopped trying. That's the important part, I think.",
  ],

  // ─── SCENE 4: Farewell — Before the Player Leaves ────────────────
  farewell: [
    "You're leaving.",
    ">Not a question.",
    "I thought you would. The mark people never stay. In the drawings they're always moving — never standing still, never sitting. It looks exhausting.",
    ">She holds out the jar of fireflies.",
    "Take one.",
    { type: 'choice', options: [
      { label: "I couldn't.",
        response: [
          "They're sleeping anyway. They won't mind. And you'll need light in places that don't have any.",
          ">She unscrews the jar and carefully places one firefly in your palm. It glows faintly — just once.",
          "See? It knows.",
        ]},
      { label: 'Thank you.',
        response: [
          "Don't thank me. It isn't really a gift. It's more like — a loan. Bring back the light when you're done with it.",
        ]},
      { label: 'Will you be okay here?',
        response: [
          ">Long pause. She looks back at the village.",
          "The roads are straighter now. The village will be safer for a while. And Baba Elżbieta is here.",
          ">Beat.",
          "She pretends not to like children. But she feeds me soup when I knock on her door, and she's never once told me to go away. So.",
        ]},
    ]},
  ],
};

// ═══════════════════════════════════════════════════════════════════════
//  WELLNESS OFFICER — Tomáš Brel
// ═══════════════════════════════════════════════════════════════════════
// The Regency arrives at the end of Act 1. Bureaucratic dread in soft
// voices. Brel is polite, even gentle — which is what makes him terrible.

// Per-mode opening lines, swapped in by triggerWellnessOfficer based on
// gameState.brelMode.
const OFFICER_OPENERS = {
  low: [
    ">A figure steps out of the road that wasn't there a moment ago.",
    ">Grey coat. Clipboard. He glances at the paper, then at you. He almost looks unsure.",
    "Safe travels. The roads here are unusually straight.",
    ">He tips his hat. He does not linger.",
  ],
  high: [
    ">A figure is already standing at the edge of the village. He has been waiting.",
    ">Grey coat. Clipboard. The paper on it is very full.",
    "You've been spending time near the marsh road, I understand. And near the inn. Old building. Interesting place to be curious about.",
    ">He smiles.",
    "I'm sure it's nothing.",
  ],
};

const OFFICER_DIALOGUE = {
  arrival: [
    ">A figure steps out of the road that wasn't there a moment ago.",
    ">Grey coat. Clipboard. Polished buttons.",
    ">He stops. He smiles. He does not blink.",
    "Good evening. Please — stay where you are. This will only take a moment.",
    "My name is Officer Brel. Tomáš Brel. I'm with the Wellness Authority.",
    "I've been asked to conduct a routine check on this settlement. A welfare visit. Nothing more.",
    ">He lifts the clipboard. The paper on it is very white.",
    "I see you have a mark on your hand. May I ask — how long have you had it?",
    { type: 'choice', options: [
      { label: "I don't remember.",
        response: [
          ">Brel writes something down. He nods kindly.",
          "Of course. Memory is such a fragile thing, isn't it. The Authority has programmes for that.",
          "I'll note you down as \"presenting with unexplained dermal luminescence and transient amnesia.\" Don't worry — it's very common.",
          ">He smiles. His pen does not stop moving.",
        ],
      },
      { label: "It's none of your business.",
        response: [
          ">Brel's smile does not move. His pen writes faster.",
          "I understand. Really, I do. Nobody likes paperwork.",
          "But I must tell you — refusal to cooperate is itself a symptom. A mild one. We have a programme for that too.",
          ">He ticks two boxes on the form. You did not see which.",
        ],
      },
      { label: "A woman named Baba Elzbieta read my fate.",
        response: [
          ">Brel's pen stops. For exactly one second. Then it resumes.",
          "Baba Elzbieta. Yes. That name is in my files.",
          "I would strongly advise you not to repeat that sentence to any other Officer. For your own wellness.",
          ">He underlines something on the form. Twice.",
        ],
      },
    ]},
    ">He tears the top sheet from the clipboard and holds it out.",
    "This is a Wellness Assessment Notice. Please read it carefully. It is not a summons. It is an invitation.",
    "You are invited to present yourself at the nearest Regency Wellness Office within seven days. Bring the mark. Bring this paper.",
    "Failure to attend is, of course, entirely your choice. We respect personal autonomy. The Authority simply keeps... records.",
    ">He tips his hat. The brass badge on it catches no light.",
    "Good evening. And — good wellness to you.",
    ">He turns. He walks back down the road that wasn't there.",
    ">The road closes behind him.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════
//  AMBIENT SOUND ENGINE (Web Audio API)
// ═══════════════════════════════════════════════════════════════════════
class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
  }

  // Start audio on first user interaction (browser policy)
  init() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.started = true;
      this.playDrone();
      this.scheduleCrickets();
      this.scheduleWindGusts();
    } catch (e) { /* Audio not supported — fail silently */ }
  }

  // Low continuous drone — eerie village atmosphere
  playDrone() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55; // low A
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();

    // Second harmonic for richness
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 82.5;
    gain2.gain.value = 0.015;
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start();
  }

  // Periodic cricket-like chirps
  scheduleCrickets() {
    if (!this.ctx) return;
    const chirp = () => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 3800 + Math.random() * 1200;
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.015, this.ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    };
    const loop = () => {
      chirp();
      if (Math.random() < 0.4) setTimeout(chirp, 60 + Math.random() * 40);
      setTimeout(loop, 1500 + Math.random() * 4000);
    };
    setTimeout(loop, 2000);
  }

  // Occasional wind gusts — filtered noise bursts
  scheduleWindGusts() {
    if (!this.ctx) return;
    const gust = () => {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300 + Math.random() * 200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 0.8);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.5);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
      source.stop(this.ctx.currentTime + 3);
    };
    const loop = () => {
      gust();
      setTimeout(loop, 6000 + Math.random() * 12000);
    };
    setTimeout(loop, 4000);
  }

  // ── Awakening atmosphere — wind through grass + distant crow ───
  // Used by OpeningScene before the player gains control. Doesn't
  // start the village drone — that begins on first input.
  startAwakeningAmbience() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return; }
    }
    const ctx = this.ctx;
    // Long wind bed — filtered noise that swells and fades
    const bufferSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start();
    this._awakWind = { src, gain };

    // Distant crow caw at ~1.5s
    setTimeout(() => this.crowCall(), 1500);
  }

  crowCall() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.35);
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 800; filt.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.04, t0 + 0.05);
    gain.gain.linearRampToValueAtTime(0, t0 + 0.4);
    osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.5);
  }

  // Slow folk melody — solo "instrument" (sine + soft bandpass)
  // playing an unresolved minor phrase. Returns a stop() function.
  playFolkMelody(loop) {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return () => {}; }
    }
    const ctx = this.ctx;
    // A minor pentatonic-ish phrase, half-remembered, ends unresolved
    const notes = [
      { f: 220.00, d: 0.6 },  // A3
      { f: 261.63, d: 0.5 },  // C4
      { f: 293.66, d: 0.4 },  // D4
      { f: 329.63, d: 0.9 },  // E4
      { f: 261.63, d: 0.5 },  // C4
      { f: 246.94, d: 1.2 },  // B3 — unresolved
    ];
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.05;
    masterGain.connect(ctx.destination);
    const oscs = [];
    let stopped = false;
    const playPhrase = (startAt) => {
      if (stopped) return;
      let t = startAt;
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = n.f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.7, t + 0.06);
        g.gain.linearRampToValueAtTime(0.4, t + n.d * 0.6);
        g.gain.linearRampToValueAtTime(0, t + n.d);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + n.d + 0.05);
        oscs.push(osc);
        t += n.d * 0.95;
      });
      if (loop) setTimeout(() => playPhrase(ctx.currentTime + 0.4), (t - startAt) * 1000 + 800);
    };
    playPhrase(ctx.currentTime + 0.2);
    return () => {
      stopped = true;
      try { masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); } catch (e) {}
    };
  }

  fadeOutAwakening() {
    if (this._awakWind) {
      try {
        this._awakWind.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
      } catch (e) {}
    }
  }
}
