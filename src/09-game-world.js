
// ═══ 09 GAME WORLD — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // Plain flat-fill diamond (used for house pads only).
  makeIsoTileFlat(key, color) {
    const g = this.make.graphics({ add: false });
    const w = TILE_W, h = TILE_H;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(w/2, 0); g.lineTo(w, h/2); g.lineTo(w/2, h); g.lineTo(0, h/2);
    g.closePath(); g.fillPath();
    g.generateTexture(key, w, h);
    g.destroy();
  },
  // ── GRASS TILE VARIANT ────────────────────────────────────────────
  // A richer ground texture: deep moss base, mottled with earthy brown
  // and muted ochre patches. Each of the 4 variants has slightly
  // different base hue and patch placement so no two tiles look alike.
  makeGrassTileVariant(key, variant) {
    const g = this.make.graphics({ add: false });
    const w = TILE_W, h = TILE_H;

    // Slightly different base hue per variant — all moss-green family.
    const bases = [0x35421f, 0x3d4a25, 0x2f3d1c, 0x42502b];
    this._fillIsoDiamond(g, bases[variant % 4], 1);

    // A second moss layer — irregular cluster of small blobs instead of
    // one big ellipse, so tiles don't all share the same polka-dot.
    const moss2 = [0x445428, 0x394722, 0x4a5a30, 0x35411e][variant % 4];
    const blobSets = [
      [[20, 14, 6, 3], [28, 18, 5, 2], [38, 13, 7, 3], [16, 19, 4, 2]],
      [[24, 12, 5, 2], [34, 16, 6, 3], [42, 20, 4, 2], [18, 16, 5, 2]],
      [[22, 18, 7, 3], [32, 13, 5, 2], [40, 17, 6, 2], [14, 14, 4, 2]],
      [[26, 16, 6, 3], [36, 19, 4, 2], [44, 14, 5, 2], [20, 12, 5, 2]],
    ];
    g.fillStyle(moss2, 0.4);
    blobSets[variant % 4].forEach(([bx, by, bw, bh]) => {
      if (this._insideDiamond(bx, by)) g.fillEllipse(bx, by, bw, bh);
    });

    // Earth-brown patches — visible bare-soil bites through the grass.
    const earth = [0x4a3826, 0x3e2e1d, 0x55402a, 0x44321f][variant % 4];
    const earthSpots = [
      [w/2 - 14, h/2 - 4, 6, 3],
      [w/2 + 12, h/2 + 5, 7, 3],
      [w/2 + 2,  h/2 + 8, 5, 2],
    ];
    earthSpots.forEach(([ex, ey, ew, eh], i) => {
      // Rotate which spots show per variant
      if ((i + variant) % 4 === 3) return;
      if (this._insideDiamond(ex, ey)) {
        g.fillStyle(earth, 0.55);
        g.fillEllipse(ex, ey, ew, eh);
      }
    });

    // Muted ochre patches — sun-dried grass clumps.
    const ochre = [0x6a5a30, 0x7a6838, 0x5e4f2a, 0x685628][variant % 4];
    const ochreSpots = [
      [w/2 + 9,  h/2 - 5, 4, 2],
      [w/2 - 10, h/2 + 6, 5, 2],
      [w/2 - 4,  h/2 - 7, 3, 2],
    ];
    ochreSpots.forEach(([ox, oy, ow, oh], i) => {
      if ((i + variant) % 3 === 2) return;
      if (this._insideDiamond(ox, oy)) {
        g.fillStyle(ochre, 0.5);
        g.fillEllipse(ox, oy, ow, oh);
      }
    });

    // Tiny darker speckles — tonal noise so the surface reads as organic.
    g.fillStyle(0x1f2810, 0.35);
    const speckCount = 5 + variant;
    for (let i = 0; i < speckCount; i++) {
      // Deterministic per variant — pseudo-random from index.
      const sx = ((i * 17 + variant * 7) % 50) + 6;
      const sy = ((i * 11 + variant * 13) % 22) + 4;
      if (this._insideDiamond(sx, sy)) g.fillRect(sx, sy, 1, 1);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  },
  // ── DIRT ROAD TILE VARIANT ────────────────────────────────────────
  // Deep ochre-brown packed earth. Mottled with darker ruts and a faint
  // lighter highlight along the centre suggesting a worn footpath.
  makeDirtTileVariant(key, variant, opts) {
    opts = opts || {};
    const g = this.make.graphics({ add: false });
    const w = TILE_W, h = TILE_H;

    // Base packed-earth ochre (warm for crossroads, dark for mud, blue
    // for the eerie road).
    let base = [0x5a4128, 0x4f3822, 0x624a2c, 0x533c25][variant % 4];
    if (opts.warm)  base = 0x6e5030;
    if (opts.dark)  base = 0x352519;
    if (opts.eerie) base = 0x3a4452;
    this._fillIsoDiamond(g, base, 1);

    // Subtle worn path texture — a slightly lighter band along the
    // diamond's long axis suggesting countless footfalls.
    const wear = opts.eerie ? 0x556678
               : opts.dark  ? 0x443223
               : 0x7a5a36;
    g.fillStyle(wear, 0.35);
    g.fillEllipse(w/2, h/2, 30, 6);
    g.fillStyle(wear, 0.22);
    g.fillEllipse(w/2, h/2, 44, 4);

    // Dark ruts — small irregular patches.
    const rut = opts.eerie ? 0x222a36
              : opts.dark  ? 0x1f1610
              : 0x3a2818;
    const ruts = [
      [w/2 - 12, h/2 + 2, 6, 2],
      [w/2 + 10, h/2 - 3, 5, 2],
      [w/2 + 4,  h/2 + 6, 4, 2],
    ];
    ruts.forEach(([rx, ry, rw, rh], i) => {
      if ((i + variant) % 4 === 3) return;
      if (this._insideDiamond(rx, ry)) {
        g.fillStyle(rut, 0.5);
        g.fillEllipse(rx, ry, rw, rh);
      }
    });

    // Pebble specks — tiny lighter dots.
    const pebble = opts.eerie ? 0x8899aa : 0x8a7050;
    for (let i = 0; i < 4 + variant; i++) {
      const sx = ((i * 13 + variant * 5) % 50) + 6;
      const sy = ((i * 9 + variant * 11) % 22) + 4;
      if (this._insideDiamond(sx, sy)) {
        g.fillStyle(pebble, 0.4);
        g.fillRect(sx, sy, 1, 1);
      }
    }

    g.generateTexture(key, w, h);
    g.destroy();
  },
  // ── BLEND TILE VARIANT ────────────────────────────────────────────
  // A transition tile — half mossy grass, half packed earth — used to
  // soften the boundary between green and brown patches and to break
  // the checkerboard feel when sprinkled randomly through grass.
  makeBlendTileVariant(key, variant) {
    const g = this.make.graphics({ add: false });
    const w = TILE_W, h = TILE_H;

    // Mid base — slightly desaturated, between grass and earth so the
    // contrast feels softer.
    const bases = [0x3e3a20, 0x423c22, 0x39351c, 0x453f24];
    this._fillIsoDiamond(g, bases[variant % 4], 1);

    // Patches of mossy green
    const moss = [0x445428, 0x394722, 0x4a5a30, 0x3c4922][variant % 4];
    g.fillStyle(moss, 0.55);
    const mossSpots = [
      [w/2 - 10, h/2 - 3, 8, 4],
      [w/2 + 8,  h/2 + 4, 7, 3],
      [w/2 - 2,  h/2 - 6, 5, 2],
    ];
    mossSpots.forEach(([x, y, ww, hh]) => {
      if (this._insideDiamond(x, y)) g.fillEllipse(x, y, ww, hh);
    });

    // Patches of bare earth
    const earth = [0x4a3826, 0x3e2e1d, 0x55402a, 0x44321f][variant % 4];
    g.fillStyle(earth, 0.55);
    const earthSpots = [
      [w/2 + 12, h/2 - 2, 7, 3],
      [w/2 - 12, h/2 + 6, 6, 3],
      [w/2 + 4,  h/2 + 7, 5, 2],
    ];
    earthSpots.forEach(([x, y, ww, hh]) => {
      if (this._insideDiamond(x, y)) g.fillEllipse(x, y, ww, hh);
    });

    // Pixel speckles
    g.fillStyle(0x1f2810, 0.35);
    for (let i = 0; i < 6; i++) {
      const sx = ((i * 17 + variant * 7) % 50) + 6;
      const sy = ((i * 11 + variant * 13) % 22) + 4;
      if (this._insideDiamond(sx, sy)) g.fillRect(sx, sy, 1, 1);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  },
  // ── GROUND TILES ──────────────────────────────────────────────────
  drawGround() {
    // Pick a tile texture key for a given map cell — randomises grass and
    // dirt across the 4 procedural variants so no two tiles look the same.
    const pickKey = (cellType, x, y) => {
      // Deterministic per-tile hash so variants don't reshuffle on
      // re-renders. We derive two independent values: one for the
      // weighted pool roll, one for the variant index.
      const v = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const roll = (v % 1000) / 1000;     // 0..1
      const idx  = (v >>> 8) % 4;         // 0..3
      switch (cellType) {
        case 0: {
          // Grass cells: 70% pure grass, 20% blend transition,
          // 10% bare-earth — genuine random distribution, no
          // alternation, breaks the checkerboard.
          if (roll < 0.70) return 'tile_grass_' + idx;
          if (roll < 0.90) return 'tile_blend_' + idx;
          return 'tile_dirt_' + idx;
        }
        case 1: return 'tile_dirt_'  + idx;
        case 2: return 'tile_cross';
        case 3: return 'tile_house';
        case 4: return 'tile_mud';
        case 5: return 'tile_eerie';
        default: return 'tile_grass_0';
      }
    };

    // Map centre (in cells) used for radial darkening.
    const grid = (this.town && this.town.map) || map;
    const N = (this.town && this.town.size) || MAP_SIZE;
    const cxCell = N / 2, cyCell = N / 2;
    const maxDist = Math.sqrt(2) * (N * 0.5);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const iso = cartToIso(x, y);
        const px = iso.x + this.worldOffset.x;
        const py = iso.y + this.worldOffset.y;
        const cell = grid[y][x];
        const key = pickKey(cell, x, y);
        const tile = this.add.image(px, py, key).setOrigin(0.5, 0.5);
        // Radial darkening: tiles further from the idol read ~20%
        // darker so the centre feels like the focal hot-spot.
        // Within ~3 tiles of the idol, leave fully bright.
        const dCell = Math.sqrt((x - cxCell) * (x - cxCell) + (y - cyCell) * (y - cyCell));
        // Per-town colour grade (B2): each town multiplies its own hue
        // into the ground — Wyrdów stays warm, Miedźno reads verdigris.
        const grade = this.town.groundGrade || { r: 1, g: 1, b: 1, warmCenter: true };
        let mR = 1, mG = 1, mB = 1;
        if (dCell > 3) {
          const t = Math.min(1, (dCell - 3) / (maxDist - 3));
          const dark = 1 - t * 0.20;
          mR = dark; mG = dark; mB = dark;
        } else if (grade.warmCenter) {
          // Inside the warm ring — slight amber tint for extra warmth.
          mR = 1; mG = 0.94; mB = 0.85;
        }
        const cr = Math.min(255, Math.round(mR * grade.r * 255));
        const cg = Math.min(255, Math.round(mG * grade.g * 255));
        const cb = Math.min(255, Math.round(mB * grade.b * 255));
        tile.setTint((cr << 16) | (cg << 8) | cb);
        this.groundLayer.add(tile);

        // ── Worn edges where dirt road meets grass ─────────────────
        // Draw a small ragged ochre lip on the grass-side of road tiles
        // so the path looks trodden and broken at the verge.
        if (cell === 1 || cell === 2 || cell === 5) {
          const adj = [[0,-1],[0,1],[-1,0],[1,0]];
          adj.forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return;
            if (map[ny][nx] !== 0) return;
            const niso = cartToIso(x + dx * 0.42, y + dy * 0.42);
            const ex = niso.x + this.worldOffset.x;
            const ey = niso.y + this.worldOffset.y;
            const edge = this.add.graphics();
            edge.fillStyle(0x4a3520, 0.5);
            edge.fillEllipse(ex, ey, 9, 4);
            edge.fillStyle(0x6a4a28, 0.35);
            edge.fillEllipse(ex + 1, ey - 1, 6, 3);
            this.groundLayer.add(edge);
          });
        }

        // ── Scatter details (~1 in 8 grass tiles) ──────────────────
        // Dried leaf, small stone, or darker grass tuft. Variety keeps
        // the ground feeling natural without becoming busy.
        if (cell === 0 && Math.random() < 0.125) {
          this.drawScatterDetail(px, py);
        }

        // Animated grass on grass tiles
        if (cell === 0 && Math.random() < 0.4) {
          this.drawAnimatedGrass(px, py - 2);
        }
        // Overgrown edges on paths next to grass
        if (map[y][x] === 1 || map[y][x] === 5) {
          const adj = [[0,-1],[0,1],[-1,0],[1,0]];
          const nearGrass = adj.some(([dx,dy]) => {
            const nx = x+dx, ny = y+dy;
            return nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE && map[ny][nx] === 0;
          });
          if (nearGrass && Math.random() < 0.45) {
            this.drawAnimatedGrass(px + (Math.random()-0.5)*20, py - 1);
          }
        }
        // Eerie glow spots along fifth road
        if (map[y][x] === 5 && Math.random() < 0.15) {
          const glow = this.add.graphics();
          glow.fillStyle(PAL.eerieGlow, 0.08);
          glow.fillCircle(px, py, 10 + Math.random() * 8);
          this.groundLayer.add(glow);
        }
      }
    }
  },
  // Animated grass blade that sways with wind
  drawAnimatedGrass(x, y) {
    const g = this.add.graphics();
    const ox = (Math.random() - 0.5) * 14;
    const oy = (Math.random() - 0.5) * 5;
    const blades = [];
    const numBlades = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numBlades; i++) {
      blades.push({
        bx: ox + i * 2.5 + (Math.random()-0.5)*2,
        height: 4 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.6,
      });
    }
    this.grassBlades.push({ g, x, y, blades, color: Math.random() < 0.3 ? PAL.grassBright : PAL.grassLight });
    this.groundLayer.add(g);
  },
  // ── SCATTER DETAILS ───────────────────────────────────────────────
  // Tiny ground objects sprinkled occasionally on grass tiles to break
  // texture monotony — a dried leaf, a stone, or a darker grass tuft.
  drawScatterDetail(px, py) {
    const g = this.add.graphics();
    const ox = (Math.random() - 0.5) * 14;
    const oy = (Math.random() - 0.5) * 4 + 2;
    const kind = Math.floor(Math.random() * 3);

    if (kind === 0) {
      // Dried leaf — small ochre/copper crescent
      const leafCol = [0x6a4a22, 0x7a5028, 0x8a5a30][Math.floor(Math.random() * 3)];
      g.fillStyle(leafCol, 0.8);
      g.fillEllipse(px + ox, py + oy, 4, 2);
      g.lineStyle(1, 0x3a2a12, 0.6);
      g.beginPath();
      g.moveTo(px + ox - 2, py + oy);
      g.lineTo(px + ox + 2, py + oy);
      g.strokePath();
    } else if (kind === 1) {
      // Small stone — grey ellipse with a darker base
      g.fillStyle(0x2a2a2e, 0.5);
      g.fillEllipse(px + ox, py + oy + 1, 4, 2); // shadow
      g.fillStyle(0x6a6a6a, 1);
      g.fillEllipse(px + ox, py + oy, 3, 2);
      g.fillStyle(0x8a8a8a, 0.7);
      g.fillEllipse(px + ox - 0.5, py + oy - 0.5, 2, 1);
    } else {
      // Tuft of darker grass — a few short dark blades
      g.fillStyle(0x1f2810, 0.7);
      g.fillEllipse(px + ox, py + oy + 0.5, 5, 1.5);
      g.lineStyle(1, 0x2f3a18, 0.8);
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(px + ox + i, py + oy);
        g.lineTo(px + ox + i + (Math.random() - 0.5), py + oy - 2 - Math.random());
        g.strokePath();
      }
    }

    this.groundLayer.add(g);
  },
  // Redraw all grass blades with current wind sway
  updateGrass(time) {
    // Gusts bend every blade together — that synchrony is what reads as WEATHER
    const gust = this._gustMul || 1;
    const windBase = Math.sin(time * 0.0008) * 2 * gust;
    this.grassBlades.forEach(gb => {
      gb.g.clear();
      gb.g.lineStyle(1, gb.color, 0.55);
      gb.blades.forEach(b => {
        const sway = (Math.sin(time * 0.001 * b.speed + b.phase) * 2.5 + windBase) * (gust > 1 ? 1.3 : 1);
        gb.g.beginPath();
        gb.g.moveTo(gb.x + b.bx, gb.y);
        gb.g.lineTo(gb.x + b.bx + sway, gb.y - b.height);
        gb.g.strokePath();
      });
    });
  },
  // ── HOUSES (Enhanced) ─────────────────────────────────────────────
  drawAllHouses() { ((this.town && this.town.houses) || houses).forEach(h => this.drawHouse(h)); },
  drawHouse(h) {
    const g = this.add.graphics();
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    const iso = cartToIso(cx, cy);
    const sx = iso.x + this.worldOffset.x;
    const sy = iso.y + this.worldOffset.y;
    const bw = h.w * TILE_W * 0.38;
    const bh = h.h * TILE_H * 0.8;
    const wallH = 34 + Math.random() * 6;
    const roofPeak = wallH + 31; // +30% steeper for stronger silhouette
    const lean = h.lean || 0;
    const leanPx = lean * wallH;

    // ── Soft drop shadow ────────────────────────────────────────────
    // Two layered ellipses — wider/softer outer + tighter darker inner.
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(sx + 10, sy + 7, bw * 1.7, bh * 0.7);
    g.fillStyle(0x000000, 0.32);
    g.fillEllipse(sx + 8, sy + 5, bw * 1.35, bh * 0.55);

    // ── Foundation stones ───────────────────────────────────────────
    g.fillStyle(PAL.stoneDark, 0.7);
    g.beginPath();
    g.moveTo(sx - bw/2 - 2, sy + 2); g.lineTo(sx, sy - bh/4 + 2);
    g.lineTo(sx + bw/2 + 2, sy + 2); g.lineTo(sx, sy + bh/4 + 2);
    g.closePath(); g.fillPath();

    // ── Left wall — log cabin texture ───────────────────────────────
    g.fillStyle(PAL.woodDark, 1);
    g.beginPath();
    g.moveTo(sx - bw/2, sy);
    g.lineTo(sx - bw/2 + leanPx, sy - wallH);
    g.lineTo(sx + leanPx, sy - wallH - bh/4);
    g.lineTo(sx, sy - bh/4);
    g.closePath(); g.fillPath();

    // Log lines on left wall — slight per-line variation so the timber
    // reads as rough-hewn rather than machine-cut.
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const wobble = Math.sin(i * 1.7 + h.x * 0.3) * 0.6;
      const ly = sy - wallH * t + wobble;
      const lx = leanPx * t;
      const col = (i % 2 === 0) ? PAL.logLight : PAL.logDark;
      const a = 0.35 + (i % 3) * 0.08;
      g.lineStyle(1, col, a);
      g.beginPath();
      g.moveTo(sx - bw/2 + lx, ly);
      g.lineTo(sx + lx, ly - bh/4);
      g.strokePath();
      // Tiny knothole on every third line
      if (i % 3 === 0) {
        g.fillStyle(PAL.logDark, 0.6);
        g.fillCircle(sx - bw/3 + lx, ly - bh/8, 0.8);
      }
    }

    // ── Right wall ──────────────────────────────────────────────────
    g.fillStyle(PAL.wood, 1);
    g.beginPath();
    g.moveTo(sx + bw/2, sy);
    g.lineTo(sx + bw/2 + leanPx, sy - wallH);
    g.lineTo(sx + leanPx, sy - wallH - bh/4);
    g.lineTo(sx, sy - bh/4);
    g.closePath(); g.fillPath();

    // Log lines on right wall — same slight wobble for rough-hewn feel.
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const wobble = Math.sin(i * 1.3 + h.y * 0.3) * 0.6;
      const ly = sy - wallH * t + wobble;
      const lx = leanPx * t;
      const col = (i % 2 === 0) ? PAL.logDark : PAL.logLight;
      const a = 0.3 + (i % 3) * 0.08;
      g.lineStyle(1, col, a);
      g.beginPath();
      g.moveTo(sx + bw/2 + lx, ly);
      g.lineTo(sx + lx, ly - bh/4);
      g.strokePath();
      if (i % 3 === 0) {
        g.fillStyle(PAL.logDark, 0.5);
        g.fillCircle(sx + bw/3 + lx, ly - bh/8, 0.8);
      }
    }

    // ── Log ends protruding at corners ──────────────────────────────
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const ly = sy - wallH * t;
      g.fillStyle(PAL.log, 0.8);
      g.fillCircle(sx - bw/2 + leanPx * t - 2, ly, 2);
      g.fillCircle(sx + bw/2 + leanPx * t + 2, ly, 2);
    }

    // ── Windows — equal on both sides, with warm glow ───────────────
    const winY = sy - wallH * 0.55;
    const winW = 6, winH = 7;
    for (const wx of [-bw/3, bw/3]) {
      // Window frame
      g.fillStyle(PAL.woodDark, 1);
      g.fillRect(sx + wx + leanPx*0.55 - winW/2 - 1, winY - winH/2 - 1, winW + 2, winH + 2);
      // Glass (dark)
      g.fillStyle(PAL.dusk, 0.7);
      g.fillRect(sx + wx + leanPx*0.55 - winW/2, winY - winH/2, winW, winH);
      // Warm candlelight glow from inside — bumped brighter
      g.fillStyle(PAL.candleLight, 0.55);
      g.fillRect(sx + wx + leanPx*0.55 - winW/2 + 1, winY - winH/2 + 1, winW - 2, winH - 2);
      // Brighter inner core suggesting candle flame
      g.fillStyle(0xffe0a0, 0.5);
      g.fillRect(sx + wx + leanPx*0.55 - winW/2 + 2, winY - winH/2 + 2, winW - 4, winH - 4);
      // Window cross-bar
      g.lineStyle(1, PAL.woodDark, 0.6);
      g.beginPath(); g.moveTo(sx + wx + leanPx*0.55, winY - winH/2); g.lineTo(sx + wx + leanPx*0.55, winY + winH/2); g.strokePath();

      // Store window position for light pool and curtain animation
      const winPx = sx + wx + leanPx*0.55;
      this.windowPositions.push({ x: winPx, y: winY, w: winW, h: winH });
      this.lightPools.push({
        x: winPx,
        y: sy + 4,
        radius: 20,
        intensity: 0.06,
        color: PAL.warmLight,
      });
    }

    // ── Door — wooden planks with visible grain & iron hinges ───────
    const doorX = sx - 3 + bw/8;
    const doorY = sy - 14;
    const doorW = 7, doorH = 13;
    // Door body — slightly varied dark wood
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(doorX, doorY, doorW, doorH);
    g.fillStyle(PAL.logDark, 0.35);
    g.fillRect(doorX, doorY, doorW, doorH);
    // Three vertical planks with seams
    g.lineStyle(1, 0x1a1006, 0.7);
    g.beginPath(); g.moveTo(doorX + 2.3, doorY); g.lineTo(doorX + 2.3, doorY + doorH); g.strokePath();
    g.beginPath(); g.moveTo(doorX + 4.6, doorY); g.lineTo(doorX + 4.6, doorY + doorH); g.strokePath();
    // Wood grain — short irregular streaks down each plank
    g.lineStyle(1, PAL.logLight, 0.18);
    for (let i = 0; i < 3; i++) {
      const px = doorX + 1.1 + i * 2.3;
      g.beginPath(); g.moveTo(px, doorY + 1); g.lineTo(px + 0.3, doorY + 5);  g.strokePath();
      g.beginPath(); g.moveTo(px - 0.2, doorY + 6); g.lineTo(px + 0.2, doorY + 11); g.strokePath();
    }
    // Iron hinges — top and bottom strap hinges
    g.fillStyle(0x2a2a30, 1);
    g.fillRect(doorX, doorY + 1, doorW, 1.4);
    g.fillRect(doorX, doorY + doorH - 2.4, doorW, 1.4);
    // Hinge bolts (small dots at strap ends)
    g.fillStyle(0x111114, 1);
    g.fillCircle(doorX + 0.6, doorY + 1.7, 0.6);
    g.fillCircle(doorX + doorW - 0.6, doorY + 1.7, 0.6);
    g.fillCircle(doorX + 0.6, doorY + doorH - 1.7, 0.6);
    g.fillCircle(doorX + doorW - 0.6, doorY + doorH - 1.7, 0.6);
    // Highlight catching dusk light on the iron
    g.fillStyle(0x6a6a72, 0.5);
    g.fillRect(doorX, doorY + 1, doorW, 0.4);
    // Copper door handle
    g.fillStyle(PAL.copper, 1);
    g.fillCircle(sx + bw/8 + 3, sy - 8, 1.3);
    g.fillStyle(PAL.copperLight, 0.7);
    g.fillCircle(sx + bw/8 + 2.7, sy - 8.3, 0.6);

    // ── Thatched roof ───────────────────────────────────────────────
    const roofOverhang = 10;
    // Left slope
    g.fillStyle(PAL.thatch, 1);
    g.beginPath();
    g.moveTo(sx - bw/2 - roofOverhang + leanPx, sy - wallH + 2);
    g.lineTo(sx + leanPx, sy - roofPeak - bh/4);
    g.lineTo(sx + leanPx, sy - wallH - bh/4);
    g.closePath(); g.fillPath();
    // Right slope
    g.fillStyle(PAL.thatchDark, 1);
    g.beginPath();
    g.moveTo(sx + bw/2 + roofOverhang + leanPx, sy - wallH + 2);
    g.lineTo(sx + leanPx, sy - roofPeak - bh/4);
    g.lineTo(sx + leanPx, sy - wallH - bh/4);
    g.closePath(); g.fillPath();

    // Thatch texture — many horizontal lines
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const col = (i % 2 === 0) ? PAL.thatchLight : PAL.strawDark;
      g.lineStyle(1, col, 0.2);
      const topY = Phaser.Math.Linear(sy - wallH - bh/4, sy - roofPeak - bh/4, t);
      const lx = Phaser.Math.Linear(sx - bw/2 - roofOverhang + leanPx, sx + leanPx, t);
      const rx = Phaser.Math.Linear(sx + bw/2 + roofOverhang + leanPx, sx + leanPx, t);
      g.beginPath(); g.moveTo(lx, Phaser.Math.Linear(sy - wallH + 2, sy - roofPeak - bh/4, t)); g.lineTo(sx + leanPx, topY); g.strokePath();
      g.beginPath(); g.moveTo(rx, Phaser.Math.Linear(sy - wallH + 2, sy - roofPeak - bh/4, t)); g.lineTo(sx + leanPx, topY); g.strokePath();
    }

    // Ridge line
    g.lineStyle(2, PAL.thatchDark, 0.5);
    g.beginPath();
    g.moveTo(sx + leanPx, sy - roofPeak - bh/4);
    g.lineTo(sx + leanPx, sy - wallH - bh/4);
    g.strokePath();

    // Dark outline along the top edges of both roof slopes —
    // gives the silhouette definition against the sky.
    g.lineStyle(2, 0x14100a, 0.95);
    g.beginPath();
    g.moveTo(sx - bw/2 - roofOverhang + leanPx, sy - wallH + 2);
    g.lineTo(sx + leanPx, sy - roofPeak - bh/4);
    g.lineTo(sx + bw/2 + roofOverhang + leanPx, sy - wallH + 2);
    g.strokePath();

    // ── Chimney with smoke ──────────────────────────────────────────
    if (h.chimney) {
      const chimX = sx + bw/4 + leanPx;
      const chimY = sy - roofPeak - bh/4 + 8;
      // Stone chimney
      g.fillStyle(PAL.stone, 0.9);
      g.fillRect(chimX - 3, chimY - 10, 7, 12);
      g.fillStyle(PAL.stoneDark, 0.7);
      g.fillRect(chimX - 4, chimY - 12, 9, 3);
      // Chimney cap
      g.fillStyle(PAL.iron, 0.6);
      g.fillRect(chimX - 4, chimY - 13, 9, 2);

      // Register smoke emitter
      this.smokeEmitters.push({
        x: chimX, y: chimY - 14,
        particles: [],
      });
    }

    // ── Blue thread soaked in wine — tied to 3 doorframes ─────────
    // Folk protection against the rearranging roads. Visible as a thin
    // blue-grey pixel line tied across the door lintel.
    const threadHouseIdx = houses.indexOf(h);
    if (threadHouseIdx === 0 || threadHouseIdx === 3 || threadHouseIdx === 5) {
      g.lineStyle(1, 0x6e84a8, 0.95);
      g.beginPath();
      g.moveTo(doorX - 1, doorY - 1);
      g.lineTo(doorX + doorW + 1, doorY - 1);
      g.strokePath();
      // Tied knot dots at each end
      g.fillStyle(0x4a5e7a, 1);
      g.fillCircle(doorX - 1, doorY - 1, 0.9);
      g.fillCircle(doorX + doorW + 1, doorY - 1, 0.9);
      // A short tail dangling
      g.lineStyle(1, 0x6e84a8, 0.7);
      g.beginPath();
      g.moveTo(doorX + doorW + 1, doorY - 1);
      g.lineTo(doorX + doorW + 2, doorY + 2);
      g.strokePath();
    }

    // ── Charm of broken glass & poppy seeds ─────────────────────────
    g.lineStyle(1, PAL.stoneDark, 0.6);
    g.beginPath(); g.moveTo(sx + bw/8 + 8, sy - wallH * 0.65); g.lineTo(sx + bw/8 + 8, sy - wallH * 0.65 + 9); g.strokePath();
    g.fillStyle(PAL.shrineGlow, 0.35);
    g.fillTriangle(sx + bw/8 + 6, sy - wallH*0.65 + 9, sx + bw/8 + 10, sy - wallH*0.65 + 9, sx + bw/8 + 8, sy - wallH*0.65 + 14);
    g.fillStyle(PAL.deepRed, 0.6);
    g.fillCircle(sx + bw/8 + 5, sy - wallH*0.65 + 11, 1);
    g.fillCircle(sx + bw/8 + 11, sy - wallH*0.65 + 11, 1);

    // ── Wycinanki folk-art patterns on right wall ──────────────────
    // Only on a few selected houses — Weaver, Healer, Elder — so the
    // motif feels precious rather than universal. Painted in faded
    // deep-red and ash-white.
    const houseIdxForArt = houses.indexOf(h);
    if (houseIdxForArt === 1 || houseIdxForArt === 2 || houseIdxForArt === 4) {
      const wcX = sx + bw/4 + leanPx * 0.45;
      const wcY = sy - wallH * 0.38;
      // Pick paint colour per house — Weaver: white, Healer/Elder: red
      const paint = (houseIdxForArt === 1) ? 0xd8c8a8 : PAL.deepRed;
      const paintAlpha = (houseIdxForArt === 1) ? 0.4 : 0.45;
      // Central rosette diamond
      g.fillStyle(paint, paintAlpha);
      g.fillTriangle(wcX, wcY - 7, wcX - 6, wcY, wcX + 6, wcY);
      g.fillTriangle(wcX, wcY + 7, wcX - 6, wcY, wcX + 6, wcY);
      // Smaller flanking diamonds
      for (const side of [-9, 9]) {
        g.fillStyle(paint, paintAlpha * 0.7);
        g.fillTriangle(wcX + side, wcY - 4, wcX + side - 3, wcY, wcX + side + 3, wcY);
        g.fillTriangle(wcX + side, wcY + 4, wcX + side - 3, wcY, wcX + side + 3, wcY);
      }
      // Floral dot accents — characteristic of wycinanki
      g.fillStyle(paint, paintAlpha);
      g.fillCircle(wcX, wcY, 1.2);
      g.fillCircle(wcX - 9, wcY, 0.9);
      g.fillCircle(wcX + 9, wcY, 0.9);
      g.fillCircle(wcX - 4, wcY - 4, 0.6);
      g.fillCircle(wcX + 4, wcY - 4, 0.6);
      g.fillCircle(wcX - 4, wcY + 4, 0.6);
      g.fillCircle(wcX + 4, wcY + 4, 0.6);
      // Faint outline so the paint reads as worn pigment, not a sticker
      g.lineStyle(1, 0x110008, 0.2);
      g.beginPath();
      g.moveTo(wcX, wcY - 7); g.lineTo(wcX - 6, wcY); g.lineTo(wcX, wcY + 7); g.lineTo(wcX + 6, wcY); g.closePath();
      g.strokePath();
    }

    // ── Baba Elzbieta's house — hanging dried herbs & copper bells ──
    if (h.name === 'Baba Elzbieta') {
      // A wooden lintel beam above the door
      const lintelX = doorX - 2;
      const lintelY = doorY - 3;
      g.fillStyle(PAL.logDark, 1);
      g.fillRect(lintelX, lintelY, doorW + 4, 2);
      g.lineStyle(1, PAL.logLight, 0.4);
      g.beginPath(); g.moveTo(lintelX, lintelY + 0.5); g.lineTo(lintelX + doorW + 4, lintelY + 0.5); g.strokePath();

      // Three bunches of dried herbs hanging upside-down by twine
      const bunchXs = [lintelX + 1.5, lintelX + 5.5, lintelX + 9.5];
      bunchXs.forEach((bx, i) => {
        // Twine
        g.lineStyle(1, 0xa89060, 0.7);
        g.beginPath(); g.moveTo(bx, lintelY + 2); g.lineTo(bx, lintelY + 4); g.strokePath();
        // Herb stems — short ochre/sage lines fanning down
        const stemCol = i === 1 ? 0x5a6a3a : 0x4a5028;
        g.lineStyle(1, stemCol, 0.85);
        for (let j = -2; j <= 2; j++) {
          g.beginPath();
          g.moveTo(bx, lintelY + 4);
          g.lineTo(bx + j * 0.7, lintelY + 4 + 4 + Math.abs(j) * 0.3);
          g.strokePath();
        }
        // Tiny dried leaves/flower heads at the tips
        g.fillStyle(i === 1 ? 0x8a5530 : 0x6a4a22, 0.85);
        g.fillCircle(bx, lintelY + 8.5, 0.9);
        g.fillCircle(bx - 1.4, lintelY + 8.2, 0.7);
        g.fillCircle(bx + 1.4, lintelY + 8.2, 0.7);
      });

      // Two copper bells hanging from the lintel ends
      // Track them for the babaBellSwing animation already in update()
      this._babaBellGfx = g;
      const bellLY = lintelY + 2;
      for (const bxOff of [-1, doorW + 5]) {
        const bbx = lintelX + bxOff;
        // Hanging wire
        g.lineStyle(1, 0x5a4028, 0.7);
        g.beginPath(); g.moveTo(bbx, bellLY); g.lineTo(bbx, bellLY + 3); g.strokePath();
        // Bell body — small copper trapezoid
        g.fillStyle(PAL.copper, 1);
        g.fillTriangle(bbx - 1.6, bellLY + 6, bbx + 1.6, bellLY + 6, bbx, bellLY + 3);
        g.fillRect(bbx - 1.6, bellLY + 5.5, 3.2, 1);
        // Bell highlight
        g.fillStyle(PAL.copperLight, 0.7);
        g.fillRect(bbx - 1.2, bellLY + 4, 0.6, 2);
        // Clapper
        g.fillStyle(0x2a1a10, 0.9);
        g.fillCircle(bbx, bellLY + 6.5, 0.6);
      }
    }

    // ── Blue thread on doorframe (on some houses) ──────────────────
    const houseIdx = houses.indexOf(h);
    if (houseIdx === 0 || houseIdx === 2 || houseIdx === 5) {
      // Blue thread draped around door frame
      const dx = sx - 3 + bw/8;
      const dy = sy - 14;
      g.lineStyle(1, 0x4466aa, 0.45);
      // Left side
      g.beginPath(); g.moveTo(dx - 1, dy); g.lineTo(dx - 1, dy + 13); g.strokePath();
      // Top
      g.beginPath(); g.moveTo(dx - 1, dy); g.lineTo(dx + 8, dy); g.strokePath();
      // Right side
      g.beginPath(); g.moveTo(dx + 8, dy); g.lineTo(dx + 8, dy + 13); g.strokePath();
      // Small knot at top-left corner
      g.fillStyle(0x4466aa, 0.5);
      g.fillCircle(dx - 1, dy, 1.5);
      // Dangling end
      g.lineStyle(1, 0x4466aa, 0.3);
      g.beginPath(); g.moveTo(dx - 1, dy); g.lineTo(dx - 3, dy + 5); g.strokePath();
    }

    g._sortY = sy;
    this.objectLayer.add(g);
  },
  // ── STRAW-AND-IRON IDOL ───────────────────────────────────────────
  drawStrawIronIdol() {
    const iso = cartToIso(CENTER - 0.5, CENTER - 0.5);
    const sx = iso.x + this.worldOffset.x;
    const sy = iso.y + this.worldOffset.y;
    const g = this.add.graphics();

    // Stone base
    g.fillStyle(PAL.stoneLight, 1);
    g.fillEllipse(sx, sy + 4, 50, 19);
    g.fillStyle(PAL.stoneDark, 1);
    g.fillEllipse(sx, sy + 4, 40, 15);
    g.lineStyle(1, PAL.copper, 0.4);
    g.strokeEllipse(sx, sy + 4, 46, 17);

    // Iron-banded straw pole
    g.fillStyle(PAL.straw, 1);
    g.fillRect(sx - 3, sy - 58, 6, 60);
    g.fillStyle(PAL.iron, 0.8);
    for (const by of [-53, -38, -23]) {
      g.fillRect(sx - 4, sy + by, 8, 3);
      g.lineStyle(1, PAL.ironLight, 0.3);
      g.beginPath(); g.moveTo(sx - 4, sy + by + 1); g.lineTo(sx + 4, sy + by + 1); g.strokePath();
    }

    // Cross-beam arms with iron caps
    g.fillStyle(PAL.straw, 1);
    g.fillRect(sx - 22, sy - 47, 44, 5);
    g.fillStyle(PAL.iron, 0.9);
    g.fillRect(sx - 24, sy - 48, 4, 7);
    g.fillRect(sx + 20, sy - 48, 4, 7);

    // Head with iron crown
    g.fillStyle(PAL.strawLight, 1);
    g.fillCircle(sx, sy - 64, 10);
    g.fillStyle(PAL.strawDark, 1);
    g.fillCircle(sx, sy - 64, 7);
    g.lineStyle(2, PAL.iron, 0.8);
    g.beginPath(); g.arc(sx, sy - 66, 13, Math.PI * 1.12, Math.PI * 1.88); g.strokePath();
    for (const angle of [-0.3, 0, 0.3]) {
      const px = sx + Math.sin(angle) * 13;
      const py = sy - 66 - Math.cos(angle) * 13;
      g.fillStyle(PAL.iron, 0.8);
      g.fillTriangle(px - 2, py + 2, px + 2, py + 2, px, py - 4);
    }

    // Eyes
    g.fillStyle(0x220011, 1);
    g.fillCircle(sx - 3, sy - 65, 1.5);
    g.fillCircle(sx + 3, sy - 65, 1.5);
    g.fillStyle(PAL.deepRed, 0.3);
    g.fillCircle(sx - 3, sy - 65, 3);
    g.fillCircle(sx + 3, sy - 65, 3);

    // Ribbons
    g.lineStyle(1, PAL.ribbon, 0.7);
    for (const dx of [-20, -13, 13, 20]) {
      g.beginPath(); g.moveTo(sx + dx, sy - 43);
      const sw = Math.sin(dx * 0.5) * 3;
      g.lineTo(sx + dx + sw, sy - 30); g.lineTo(sx + dx + sw * 0.6, sy - 18);
      g.strokePath();
    }
    g.lineStyle(2, PAL.deepRed, 0.8);
    g.beginPath(); g.moveTo(sx, sy - 43); g.lineTo(sx + 2, sy - 28); g.lineTo(sx - 1, sy - 14); g.strokePath();

    // Straw skirt
    g.lineStyle(1, PAL.straw, 0.5);
    for (let i = -10; i <= 10; i += 2) {
      g.beginPath(); g.moveTo(sx + i, sy - 2);
      g.lineTo(sx + i + (Math.random()-0.5)*4, sy + 5); g.strokePath();
    }

    // ── Copper wire details around the stone base ──────────────────
    // Wrapped wire bands
    g.lineStyle(1, PAL.copper, 0.5);
    g.strokeEllipse(sx, sy + 4, 44, 16);
    g.lineStyle(1, PAL.copperLight, 0.3);
    g.strokeEllipse(sx, sy + 2, 38, 14);
    // Twisted wire spirals at base corners
    for (const side of [-18, 18]) {
      g.lineStyle(1, PAL.copper, 0.4);
      g.beginPath();
      g.arc(sx + side, sy + 3, 3, 0, Math.PI * 1.5);
      g.strokePath();
      // Tiny copper knot
      g.fillStyle(PAL.copperLight, 0.5);
      g.fillCircle(sx + side, sy + 3, 1.2);
    }
    // Vertical wire wrapping up the pole at intervals
    g.lineStyle(1, PAL.copper, 0.25);
    for (const wy of [-8, -18, -28]) {
      g.beginPath(); g.moveTo(sx - 4, sy + wy); g.lineTo(sx + 4, sy + wy - 2); g.strokePath();
    }

    g._sortY = sy;
    this.objectLayer.add(g);

    // Braziers with light pools
    this.fireGraphics = [];
    for (const side of [-28, 28]) {
      const fg = this.add.graphics();
      fg.fillStyle(PAL.copperDark, 1);
      fg.fillEllipse(sx + side, sy + 3, 13, 7);
      fg.fillStyle(PAL.copper, 1);
      fg.fillEllipse(sx + side, sy + 2, 11, 5);
      fg.fillStyle(PAL.iron, 0.7);
      fg.fillRect(sx + side - 1, sy + 3, 3, 6);
      fg._fireX = sx + side;
      fg._fireY = sy - 3;
      fg._sortY = sy + 5;
      this.fireGraphics.push(fg);
      this.objectLayer.add(fg);
      // Light pool
      this.lightPools.push({ x: sx + side, y: sy + 6, radius: 35, intensity: 0.10, color: PAL.warmLight });
    }
    // Central idol glow — breathing light pool (pulsed in update loop)
    this.idolLightPool = { x: sx, y: sy + 4, radius: 50, intensity: 0.05, color: PAL.warmLightDim };
    this.lightPools.push(this.idolLightPool);
    this.idolScreenX = sx;
    this.idolScreenY = sy;
  },
  // ── WAYSIDE SHRINES ───────────────────────────────────────────────
  drawWaysideShrines() {
    this.shrineGraphics = [];
    shrines.forEach(s => {
      const iso = cartToIso(s.x, s.y);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;
      const g = this.add.graphics();

      // Mossy stone base
      g.fillStyle(PAL.stoneDark, 0.8);
      g.fillEllipse(px, py + 2, 18, 8);
      g.fillStyle(PAL.grassDark, 0.3);
      g.fillEllipse(px + 2, py + 1, 8, 4);

      // Stone pillar with weathered texture
      g.fillStyle(PAL.stone, 0.9);
      g.fillRect(px - 5, py - 26, 10, 28);
      g.fillStyle(PAL.stoneLight, 0.4);
      g.fillRect(px - 4, py - 26, 2, 28);
      // Cracks
      g.lineStyle(1, PAL.stoneDark, 0.3);
      g.beginPath(); g.moveTo(px + 1, py - 20); g.lineTo(px + 3, py - 14); g.lineTo(px + 1, py - 8); g.strokePath();

      // Peaked roof
      g.fillStyle(PAL.stone, 1);
      g.fillTriangle(px - 7, py - 26, px + 7, py - 26, px, py - 34);

      // Carved figure niche — a tiny folk figure
      g.fillStyle(PAL.stoneDark, 0.5);
      g.fillRect(px - 3, py - 20, 6, 8);
      // Tiny carved figure
      g.fillStyle(PAL.stoneLight, 0.6);
      g.fillCircle(px, py - 18, 2); // head
      g.fillRect(px - 1, py - 16, 3, 5); // body

      // Small offering bowl at base
      g.fillStyle(PAL.copperDark, 0.6);
      g.fillEllipse(px, py - 1, 8, 3);
      // Dried flowers in offering
      g.fillStyle(PAL.deepRed, 0.4);
      g.fillCircle(px - 1, py - 2, 1.5);
      g.fillStyle(PAL.straw, 0.4);
      g.fillCircle(px + 2, py - 2, 1);

      // Copper nail at top
      g.fillStyle(PAL.copper, 0.7);
      g.fillCircle(px, py - 30, 1.5);

      g._sortY = py;
      g._glowX = px;
      g._glowY = py - 18;
      this.shrineGraphics.push(g);
      this.objectLayer.add(g);
      // Shrine light pool
      this.lightPools.push({ x: px, y: py, radius: 28, intensity: 0.04, color: PAL.shrineGlow });
    });
  },
  // ── VILLAGE WELL ──────────────────────────────────────────────────
  drawVillageWell() {
    const iso = cartToIso(WELL.x, WELL.y);
    const px = iso.x + this.worldOffset.x;
    const py = iso.y + this.worldOffset.y;
    const g = this.add.graphics();

    // Stone ring base
    g.fillStyle(PAL.stone, 0.9);
    g.fillEllipse(px, py + 2, 24, 12);
    g.fillStyle(PAL.stoneDark, 0.8);
    g.fillEllipse(px, py, 20, 10);
    // Dark water inside
    g.fillStyle(0x111122, 0.8);
    g.fillEllipse(px, py - 1, 14, 6);

    // Stone wall height
    g.fillStyle(PAL.stone, 0.8);
    g.fillRect(px - 12, py - 8, 24, 4);
    g.lineStyle(1, PAL.stoneDark, 0.4);
    g.beginPath(); g.moveTo(px - 12, py - 6); g.lineTo(px + 12, py - 6); g.strokePath();

    // Wooden frame — two posts and crossbar
    g.fillStyle(PAL.wood, 0.9);
    g.fillRect(px - 10, py - 28, 3, 22);
    g.fillRect(px + 7, py - 28, 3, 22);
    // Crossbar
    g.fillRect(px - 11, py - 30, 22, 3);

    // Roof over well
    g.fillStyle(PAL.thatch, 0.8);
    g.fillTriangle(px - 14, py - 30, px + 14, py - 30, px, py - 40);
    g.fillStyle(PAL.thatchDark, 0.7);
    g.fillTriangle(px, py - 40, px + 14, py - 30, px + 2, py - 30);

    // Bucket on rope
    g.lineStyle(1, PAL.woodDark, 0.6);
    g.beginPath(); g.moveTo(px, py - 28); g.lineTo(px, py - 12); g.strokePath();
    // Bucket
    g.fillStyle(PAL.woodDark, 0.8);
    g.fillRect(px - 3, py - 14, 6, 5);
    g.fillStyle(PAL.iron, 0.5);
    g.fillRect(px - 3, py - 14, 6, 1);

    g._sortY = py;
    this.objectLayer.add(g);
  },
  // ── SIGNPOSTS ─────────────────────────────────────────────────────
  drawSignposts() {
    signposts.forEach(sp => {
      const iso = cartToIso(sp.x, sp.y);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;
      const g = this.add.graphics();

      // Post
      g.fillStyle(PAL.wood, 0.85);
      g.fillRect(px - 2, py - 24, 4, 26);

      // Sign plank
      g.fillStyle(PAL.woodLight, 0.8);
      g.fillRect(px - 16, py - 22, 32, 10);
      g.fillStyle(PAL.woodDark, 0.3);
      g.fillRect(px - 16, py - 22, 32, 1);
      g.fillRect(px - 16, py - 13, 32, 1);

      g._sortY = py;
      this.objectLayer.add(g);

      // Sign text — folk/runic style
      const txt = this.add.text(px, py - 17, sp.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: '#3a2a1a',
        stroke: '#6e5540',
        strokeThickness: 0.5,
        align: 'center',
      }).setOrigin(0.5, 0.5);
      txt._sortY = py;
      this.objectLayer.add(txt);
    });
  },
  // ── SCATTER DETAILS ───────────────────────────────────────────────
  drawScatterDetails() {
    // Fences
    const fencePairs = [
      [[4,7],[5,7],[6,7]], [[18,9],[18,10]], [[4,14],[5,14]], [[15,17],[16,17],[17,17]],
    ];
    fencePairs.forEach(posts => {
      posts.forEach(([fx, fy]) => {
        if (map[fy] && map[fy][fx] === 0) {
          const iso = cartToIso(fx, fy);
          const g = this.add.graphics();
          const px = iso.x + this.worldOffset.x;
          const py = iso.y + this.worldOffset.y;
          g.fillStyle(PAL.woodDark, 0.8);
          g.fillRect(px - 1, py - 14, 3, 16);
          g.fillRect(px + 8, py - 12, 3, 14);
          g.lineStyle(1, PAL.wood, 0.5);
          g.beginPath(); g.moveTo(px, py - 10); g.lineTo(px + 9, py - 8); g.strokePath();
          g.beginPath(); g.moveTo(px, py - 5); g.lineTo(px + 9, py - 3); g.strokePath();
          g._sortY = py;
          this.objectLayer.add(g);
        }
      });
    });

    // Rocks
    for (let i = 0; i < 18; i++) {
      const rx = Math.floor(Math.random() * MAP_SIZE);
      const ry = Math.floor(Math.random() * MAP_SIZE);
      if (map[ry][rx] === 0) {
        const iso = cartToIso(rx + Math.random() * 0.6, ry + Math.random() * 0.6);
        const g = this.add.graphics();
        const px = iso.x + this.worldOffset.x;
        const py = iso.y + this.worldOffset.y;
        const size = 2 + Math.random() * 4;
        g.fillStyle(PAL.stoneDark, 0.4 + Math.random() * 0.2);
        g.fillEllipse(px, py, size, size * 0.5);
        // Slight 3D highlight
        g.fillStyle(PAL.stoneLight, 0.15);
        g.fillEllipse(px - 1, py - 1, size * 0.5, size * 0.25);
        this.groundLayer.add(g);
      }
    }

    // Dead trees
    [[1,3],[21,4],[2,20],[22,19],[0,10]].forEach(([tx, ty]) => {
      const iso = cartToIso(tx, ty);
      const g = this.add.graphics();
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;
      // Shadow
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(px + 4, py + 3, 14, 5);
      // Trunk with bark texture
      g.fillStyle(PAL.woodDark, 0.85);
      g.fillRect(px - 4, py - 32, 8, 34);
      g.lineStyle(1, PAL.wood, 0.25);
      g.beginPath(); g.moveTo(px - 2, py - 32); g.lineTo(px - 2, py); g.strokePath();
      g.beginPath(); g.moveTo(px + 2, py - 32); g.lineTo(px + 2, py); g.strokePath();
      // Branches
      g.lineStyle(2, PAL.woodDark, 0.6);
      g.beginPath(); g.moveTo(px, py - 28); g.lineTo(px - 14, py - 40); g.strokePath();
      g.beginPath(); g.moveTo(px + 2, py - 22); g.lineTo(px + 12, py - 34); g.strokePath();
      g.lineStyle(1, PAL.woodDark, 0.35);
      g.beginPath(); g.moveTo(px + 12, py - 34); g.lineTo(px + 18, py - 37); g.strokePath();
      g.beginPath(); g.moveTo(px - 14, py - 40); g.lineTo(px - 18, py - 38); g.strokePath();
      g.beginPath(); g.moveTo(px - 14, py - 40); g.lineTo(px - 12, py - 46); g.strokePath();
      g._sortY = py;
      this.objectLayer.add(g);
    });

    // ── Pixel wildflowers along grass edges that border roads ─────
    // Tiny dots of muted red and white scattered just inside the
    // grass at road verges — adds a small folk-art bloom.
    for (let yy = 0; yy < MAP_SIZE; yy++) {
      for (let xx = 0; xx < MAP_SIZE; xx++) {
        if (map[yy][xx] !== 0) continue;
        const adj = [[0,-1],[0,1],[-1,0],[1,0]];
        const nearRoad = adj.some(([dx,dy]) => {
          const nx = xx+dx, ny = yy+dy;
          return nx>=0 && nx<MAP_SIZE && ny>=0 && ny<MAP_SIZE &&
                 (map[ny][nx] === 1 || map[ny][nx] === 2);
        });
        if (!nearRoad) continue;
        if (Math.random() > 0.35) continue;
        const iso = cartToIso(xx + Math.random()*0.6, yy + Math.random()*0.6);
        const fpx = iso.x + this.worldOffset.x;
        const fpy = iso.y + this.worldOffset.y;
        const fg = this.add.graphics();
        // 2-3 flower petals
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          const ox = (Math.random()-0.5) * 5;
          const oy = (Math.random()-0.5) * 3;
          const col = Math.random() < 0.55 ? 0x9a3a3a : 0xe8dcc0;
          fg.fillStyle(col, 0.9);
          fg.fillRect(fpx + ox, fpy + oy, 1, 1);
          // Tiny green stem
          fg.fillStyle(0x3a5028, 0.7);
          fg.fillRect(fpx + ox, fpy + oy + 1, 1, 1);
        }
        this.groundLayer.add(fg);
      }
    }

    // Herb patches
    [[7,6],[8,14],[17,7],[15,16]].forEach(([hx, hy]) => {
      if (map[hy][hx] === 0) {
        const iso = cartToIso(hx, hy);
        const g = this.add.graphics();
        const px = iso.x + this.worldOffset.x;
        const py = iso.y + this.worldOffset.y;
        for (let i = 0; i < 6; i++) {
          const ox = (Math.random()-0.5) * 16;
          const oy = (Math.random()-0.5) * 6;
          g.fillStyle(PAL.grassLight, 0.6);
          g.fillCircle(px + ox, py + oy - 2, 2.5);
          g.lineStyle(1, PAL.grassDark, 0.5);
          g.beginPath(); g.moveTo(px + ox, py + oy); g.lineTo(px + ox, py + oy - 5); g.strokePath();
        }
        g.fillStyle(PAL.deepRed, 0.7);
        g.fillCircle(px + 3, py - 5, 2.5);
        g.fillCircle(px - 4, py - 3, 2);
        this.groundLayer.add(g);
      }
    });
  },
  // ── LIGHT POOLS ───────────────────────────────────────────────────
  // Warm ground glow beneath fires, windows, and shrines
  createLightPools() {
    this.lightPoolGfx = this.add.graphics();
    this.lightLayer.add(this.lightPoolGfx);

    // Player light — follows the player, rendered on its own graphics
    this.playerLightGfx = this.add.graphics();
    this.lightLayer.add(this.playerLightGfx);

    this.redrawLightPools();
  },
  redrawLightPools(flicker) {
    this.lightPoolGfx.clear();

    // Idol breathing glow — slow sine pulse. The idol is the warmest,
    // brightest point on screen, so its intensity is well above any
    // other light pool and it carries the warmest hue.
    if (this.idolLightPool) {
      const breath = 0.5 + Math.sin(Date.now() * 0.0008) * 0.5; // 0..1, ~8s cycle
      this.idolLightPool.intensity = 0.10 + breath * 0.14;
      this.idolLightPool.radius   = 70 + breath * 24;
      this.idolLightPool.color    = PAL.warmLight;
    }

    // Night boost — every light source matters more in the dark.
    // 0 by day → 1 deep night, ramping through dusk/dawn.
    const hr = gameState.gameHour;
    let nightF = 0;
    if (hr >= 20 || hr < 6) nightF = 1;
    else if (hr >= 19) nightF = hr - 19;        // dusk ramp up
    else if (hr < 7) nightF = 7 - hr;           // dawn ramp down
    this._nightFactor = nightF;
    const nb = 1 + nightF * 0.7;                 // intensity boost
    const nr = 1 + nightF * 0.25;                // radius boost

    this.lightPools.forEach(lp => {
      const f = flicker ? (0.9 + Math.random() * 0.2) : 1.0;
      // Outer glow
      this.lightPoolGfx.fillStyle(lp.color, Math.min(0.6, lp.intensity * 0.4 * f * nb));
      this.lightPoolGfx.fillEllipse(lp.x, lp.y, lp.radius * 1.6 * nr, lp.radius * 0.8 * nr);
      // Inner glow
      this.lightPoolGfx.fillStyle(lp.color, Math.min(0.8, lp.intensity * f * nb));
      this.lightPoolGfx.fillEllipse(lp.x, lp.y, lp.radius * nr, lp.radius * 0.5 * nr);
    });

    // Player warm light — follows the player character
    if (this.playerSprite) {
      this.playerLightGfx.clear();
      const px = this.playerSprite.x;
      const py = this.playerSprite.y;
      const pf = flicker ? (0.92 + Math.random() * 0.16) : 1.0;
      // Outer soft glow
      this.playerLightGfx.fillStyle(PAL.warmLightDim, 0.025 * pf);
      this.playerLightGfx.fillEllipse(px, py + 4, 80, 40);
      // Mid glow
      this.playerLightGfx.fillStyle(PAL.warmLight, 0.03 * pf);
      this.playerLightGfx.fillEllipse(px, py + 4, 48, 24);
      // Inner bright spot
      this.playerLightGfx.fillStyle(PAL.warmLight, 0.045 * pf);
      this.playerLightGfx.fillEllipse(px, py + 2, 24, 12);
    }
  },
  // ── AMBIENT PARTICLES ─────────────────────────────────────────────
  // Fireflies, drifting ash, pollen — make the air feel alive
  initAmbientParticles() {
    this.ambientGfx = this.add.graphics();
    this.ambientGfx.setDepth(996);

    // Spawn initial particles spread across the map
    for (let i = 0; i < 40; i++) {
      const cartX = Math.random() * MAP_SIZE;
      const cartY = Math.random() * MAP_SIZE;
      const iso = cartToIso(cartX, cartY);
      const r = Math.random();
      const type = r < 0.2 ? 'firefly' : r < 0.4 ? 'ash' : r < 0.7 ? 'pollen' : r < 0.9 ? 'dustmote' : 'leaf';
      this.ambientParticles.push({
        x: iso.x + this.worldOffset.x + (Math.random()-0.5)*40,
        y: iso.y + this.worldOffset.y + (Math.random()-0.5)*40 - Math.random() * 60,
        vx: type === 'leaf' ? 0.3 + Math.random() * 0.4 : type === 'dustmote' ? (Math.random()-0.5) * 0.1 : (Math.random()-0.5) * 0.4,
        vy: type === 'ash' ? -0.2 - Math.random() * 0.3 : type === 'dustmote' ? -0.02 - Math.random() * 0.03 : type === 'leaf' ? 0.05 + Math.random() * 0.1 : (Math.random()-0.5) * 0.2,
        type,
        phase: Math.random() * Math.PI * 2,
        life: 0.5 + Math.random() * 0.5,
        size: type === 'firefly' ? 1.5 + Math.random() : type === 'leaf' ? 2.5 + Math.random() * 2 : type === 'dustmote' ? 0.6 + Math.random() * 0.8 : 1 + Math.random() * 1.5,
        rot: Math.random() * Math.PI * 2, // for leaves
      });
    }

    // Shimmer ripple storage (triggered by thread knot placement)
    this.shimmerRipples = [];
  },
  updateAmbientParticles() {
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    const camW = this.cameras.main.width;
    const camH = this.cameras.main.height;

    this.ambientParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += 0.03;

      if (p.type === 'firefly') {
        p.vx += (Math.random()-0.5) * 0.1;
        p.vy += (Math.random()-0.5) * 0.08;
        p.vx *= 0.95; p.vy *= 0.95;
      } else if (p.type === 'leaf') {
        // Tumbling drift — sinusoidal sideways wobble
        p.vx += Math.sin(p.phase * 1.5) * 0.02;
        p.rot += 0.04;
      } else if (p.type === 'dustmote') {
        // Very slow wandering drift
        p.vx += (Math.random()-0.5) * 0.005;
        p.vy += (Math.random()-0.5) * 0.003;
        p.vx *= 0.98; p.vy *= 0.98;
      }

      // Respawn if off screen
      if (p.x < camX - 100 || p.x > camX + camW + 100 ||
          p.y < camY - 100 || p.y > camY + camH + 100) {
        p.x = camX + (p.type === 'leaf' ? -30 : Math.random() * camW);
        p.y = camY + (p.type === 'leaf' ? Math.random() * camH : (Math.random() < 0.5 ? -20 : camH + 20));
        p.life = 0.5 + Math.random() * 0.5;
      }
    });

    // Redraw
    this.ambientGfx.clear();
    this.ambientParticles.forEach(p => {
      if (p.type === 'firefly') {
        const glow = 0.3 + Math.sin(p.phase * 2) * 0.3;
        this.ambientGfx.fillStyle(PAL.candleLight, glow);
        this.ambientGfx.fillCircle(p.x, p.y, p.size);
        this.ambientGfx.fillStyle(PAL.warmLight, glow * 0.3);
        this.ambientGfx.fillCircle(p.x, p.y, p.size * 3);
      } else if (p.type === 'ash') {
        this.ambientGfx.fillStyle(PAL.smoke, 0.2 + Math.sin(p.phase) * 0.1);
        this.ambientGfx.fillCircle(p.x, p.y, p.size);
      } else if (p.type === 'dustmote') {
        // Barely visible, slow-drifting motes
        this.ambientGfx.fillStyle(PAL.straw, 0.06 + Math.sin(p.phase * 0.7) * 0.03);
        this.ambientGfx.fillCircle(p.x, p.y, p.size);
      } else if (p.type === 'leaf') {
        // Tumbling leaf — drawn as a small rotated shape
        const lx = p.x, ly = p.y;
        const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
        const hw = p.size, hh = p.size * 0.4;
        this.ambientGfx.fillStyle(0x4a3a20, 0.25 + Math.sin(p.phase) * 0.08);
        this.ambientGfx.fillTriangle(
          lx + cr*hw, ly + sr*hw,
          lx - cr*hw, ly - sr*hw,
          lx - sr*hh, ly + cr*hh
        );
      } else {
        this.ambientGfx.fillStyle(PAL.straw, 0.15 + Math.sin(p.phase) * 0.05);
        this.ambientGfx.fillCircle(p.x, p.y, p.size * 0.8);
      }
    });

    // Draw shimmer ripples (from thread knot placement)
    this.shimmerRipples.forEach(r => {
      r.radius += 1.5;
      r.life -= 0.015;
      const alpha = r.life * 0.4;
      this.ambientGfx.lineStyle(2, PAL.shrineGlow, alpha);
      this.ambientGfx.strokeCircle(r.x, r.y, r.radius);
      this.ambientGfx.lineStyle(1, PAL.warmLight, alpha * 0.5);
      this.ambientGfx.strokeCircle(r.x, r.y, r.radius * 0.6);
    });
    this.shimmerRipples = this.shimmerRipples.filter(r => r.life > 0);
  },
  // ── FOOTSTEP DUST ─────────────────────────────────────────────────
  spawnFootDust() {
    const iso = cartToIso(this.playerCartX, this.playerCartY);
    const px = iso.x + this.worldOffset.x;
    const py = iso.y + this.worldOffset.y;
    // Check if on dirt
    const tx = Math.floor(this.playerCartX);
    const ty = Math.floor(this.playerCartY);
    if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
      const tile = map[ty][tx];
      if (tile === 1 || tile === 2 || tile === 4 || tile === 5) {
        for (let i = 0; i < 2; i++) {
          this.dustParticles.push({
            x: px + (Math.random()-0.5) * 8,
            y: py + 2 + Math.random() * 3,
            vx: (Math.random()-0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.2,
            life: 1.0,
            size: 1.5 + Math.random() * 1.5,
          });
        }
      }
    }
  },
  updateDust() {
    this.dustParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.04;
      p.size += 0.05;
    });
    this.dustParticles = this.dustParticles.filter(p => p.life > 0);

    if (!this.dustGfx) {
      this.dustGfx = this.add.graphics();
      this.dustGfx.setDepth(995);
    }
    this.dustGfx.clear();
    this.dustParticles.forEach(p => {
      this.dustGfx.fillStyle(PAL.dust, p.life * 0.2);
      this.dustGfx.fillCircle(p.x, p.y, p.size);
    });
  },
  // ── FLICKERING LIGHTS ─────────────────────────────────────────────
  flickerLights() {
    if (this.fireGraphics) {
      this.fireGraphics.forEach(fg => {
        fg.clear();
        fg.fillStyle(PAL.copperDark, 1);
        fg.fillEllipse(fg._fireX, fg._fireY + 6, 13, 7);
        fg.fillStyle(PAL.copper, 1);
        fg.fillEllipse(fg._fireX, fg._fireY + 5, 11, 5);
        fg.fillStyle(PAL.iron, 0.7);
        fg.fillRect(fg._fireX - 1, fg._fireY + 6, 3, 6);
        // Flame
        const size = 3.5 + Math.random() * 3;
        fg.fillStyle(Math.random() > 0.5 ? PAL.fire : PAL.fireGlow, 0.8 + Math.random() * 0.2);
        fg.fillCircle(fg._fireX, fg._fireY, size);
        fg.fillStyle(PAL.candleLight, 0.4 + Math.random() * 0.3);
        fg.fillCircle(fg._fireX + (Math.random()-0.5)*3, fg._fireY - 3 - Math.random()*4, 2);
        // Occasional spark
        if (Math.random() < 0.3) {
          fg.fillStyle(PAL.candleLight, 0.6);
          fg.fillCircle(fg._fireX + (Math.random()-0.5)*6, fg._fireY - 6 - Math.random()*5, 1);
        }
      });
    }

    // Shrine glow
    if (this.shrineGraphics) {
      this.shrineGraphics.forEach(sg => {
        const pulse = 0.08 + Math.sin(Date.now() * 0.0006 + sg._glowX * 0.1) * 0.06;
        if (!sg._glowGfx) {
          sg._glowGfx = this.add.graphics();
          sg._glowGfx._sortY = sg._sortY - 1;
          this.objectLayer.add(sg._glowGfx);
        }
        sg._glowGfx.clear();
        sg._glowGfx.fillStyle(PAL.shrineGlow, pulse);
        sg._glowGfx.fillCircle(sg._glowX, sg._glowY, 16);
        sg._glowGfx.fillStyle(PAL.shrineGlowDim, pulse * 0.4);
        sg._glowGfx.fillCircle(sg._glowX, sg._glowY, 26);
      });
    }

    // Zuzka's firefly jar glow — flickers independently
    if (this.zuzkaSprite) {
      if (!this._zuzkaJarGfx) {
        this._zuzkaJarGfx = this.add.graphics();
        this._zuzkaJarGfx.setDepth(997);
      }
      this._zuzkaJarGfx.clear();
      const jx = this.zuzkaSprite.x;
      const jy = this.zuzkaSprite.y - 6; // jar position relative to sprite
      // Flare briefly when Zuzka is spoken to (acting beat)
      if (this._zuzkaJarFlare > 0) this._zuzkaJarFlare -= 16;
      const flareBoost = this._zuzkaJarFlare > 0 ? 1.8 : 1;
      const flick = (0.12 + Math.sin(Date.now() * 0.003) * 0.06 + Math.random() * 0.04) * flareBoost;
      this._zuzkaJarGfx.fillStyle(PAL.candleLight, flick);
      this._zuzkaJarGfx.fillCircle(jx, jy, 4);
      this._zuzkaJarGfx.fillStyle(PAL.warmLight, flick * 0.3);
      this._zuzkaJarGfx.fillCircle(jx, jy, 10);
    }

    // Flicker light pools
    this.redrawLightPools(true);
  },
  // ── GAME CLOCK ──────────────────────────────────────────────────
  // Advances gameState.gameHour in real time and crossfades a sky
  // tint overlay between time windows. Drives Marta/Ibbur/Wisps gates.
  updateGameClock(delta) {
    // Lazy-create the tint overlay (full-screen, multiplicative-feeling)
    if (!this.skyTint) {
      const cam = this.cameras.main;
      this.skyTint = this.add.graphics().setScrollFactor(0).setDepth(-8);
      this.skyTint.fillStyle(0x000000, 0);
      this.skyTint.fillRect(0, 0, cam.width, cam.height);
      this._skyTintCol = 0x000000;
      this._skyTintAlpha = 0;
      this._skyW = cam.width; this._skyH = cam.height;
    }
    // Advance the clock
    const prev = gameState.gameHour;
    gameState.gameHour += (delta / GAME_HOUR_MS);
    const prevHour = prev;
    if (gameState.gameHour >= 24) {
      gameState.gameHour -= 24;
      gameState._noonBellRung = false; // reset for new day
    }
    // Dawn releases the night roads — the circle may be walked again —
    // and deals the day's weather
    if (prevHour < 6 && gameState.gameHour >= 6) {
      gameState._nightTurnDone = false;
      this._rollWeather();
    }
    if (!gameState.weatherToday) this._rollWeather();
    this.updateWeather(delta);
    // Refresh the gates (cheap — just two boolean checks)
    gameState.wispsVisible = isTimeWindow('dusk') || isTimeWindow('night') || isTimeWindow('latenight');
    gameState.iburActive  = isTimeWindow('dawn') || isTimeWindow('dusk');

    // Noon bell — fires once when crossing 12:00
    if (!gameState._noonBellRung && prev < 12 && gameState.gameHour >= 12) {
      gameState._noonBellRung = true;
      if (this.playLowBellTone) this.playLowBellTone();
    }

    // ── Sky tint per window — picked by hour, crossfaded smoothly ─
    // Each window's target color + alpha (overlay sits in front of base sky)
    const target = this.getSkyTintForHour(gameState.gameHour);
    // Smoothly approach the target each frame
    const k = Math.min(1, delta / 800);
    this._skyTintAlpha += (target.a - this._skyTintAlpha) * k;
    // Lerp color channels
    const cur = this._skyTintCol;
    const cr = (cur >> 16) & 0xff, cg = (cur >> 8) & 0xff, cb = cur & 0xff;
    const tr = (target.col >> 16) & 0xff, tg = (target.col >> 8) & 0xff, tb = target.col & 0xff;
    const nr = Math.round(cr + (tr - cr) * k);
    const ng = Math.round(cg + (tg - cg) * k);
    const nb = Math.round(cb + (tb - cb) * k);
    this._skyTintCol = (nr << 16) | (ng << 8) | nb;
    this.skyTint.clear();
    this.skyTint.fillStyle(this._skyTintCol, this._skyTintAlpha);
    this.skyTint.fillRect(0, 0, this._skyW, this._skyH);

    // ── Time-of-day indicator ─────────────────────────────────────
    // A small folk horizon in the top-right, under the knot HUD: the sun
    // (amber) or moon (pale crescent) travels a shallow arc. Diegetic
    // answer to "pay attention to the time of day".
    if (!this._todGfx) {
      this._todGfx = this.add.graphics().setScrollFactor(0).setDepth(1002).setAlpha(0.9);
    }
    const todG = this._todGfx; todG.clear();
    const tcx = this._skyW - 62, tcy = 66, trw = 30, trh = 15;
    const hr = gameState.gameHour;
    const isDay = hr >= 6 && hr < 18;
    const frac = isDay ? (hr - 6) / 12 : ((hr >= 18 ? hr - 18 : hr + 6) / 12);
    const ang = Math.PI * (1 - frac);
    const bx = tcx + Math.cos(ang) * trw;
    const by = tcy - Math.sin(ang) * trh;
    // Horizon line with a small centre diamond
    todG.lineStyle(1, 0x8a7a5a, 0.45);
    todG.beginPath(); todG.moveTo(tcx - trw - 4, tcy); todG.lineTo(tcx - 4, tcy); todG.strokePath();
    todG.beginPath(); todG.moveTo(tcx + 4, tcy); todG.lineTo(tcx + trw + 4, tcy); todG.strokePath();
    todG.fillStyle(0x8a7a5a, 0.55);
    todG.fillTriangle(tcx, tcy - 3, tcx + 3, tcy, tcx, tcy + 3);
    todG.fillTriangle(tcx, tcy - 3, tcx - 3, tcy, tcx, tcy + 3);
    if (isDay) {
      todG.fillStyle(0xffc84a, 0.22); todG.fillCircle(bx, by, 7);
      todG.fillStyle(0xffc84a, 1);    todG.fillCircle(bx, by, 3.5);
    } else {
      todG.fillStyle(0xcfd6e8, 0.9);  todG.fillCircle(bx, by, 3.5);
      todG.fillStyle(0x14141e, 0.9);  todG.fillCircle(bx + 1.6, by - 1.1, 2.6);
    }
  },
  // ── WEATHER — one state per day: clear, mist, drizzle, or gusts ────
  _rollWeather() {
    const r = Math.random();
    gameState.weatherToday = r < 0.45 ? 'clear' : r < 0.65 ? 'mist' : r < 0.85 ? 'gusts' : 'drizzle';
  },
  updateWeather(delta) {
    const w = gameState.weatherToday;
    const cam = this.cameras.main;
    if (!this._weatherGfx) {
      this._weatherGfx = this.add.graphics().setScrollFactor(0).setDepth(998);
      this._mistShift = 0;
      this._drops = [];
      this._gustMul = 1;
      this._gustTimer = 4000 + Math.random() * 8000;
    }
    const g = this._weatherGfx;
    g.clear();
    if (this.town && this.town.isInterior) return; // weather stays outside

    if (w === 'mist') {
      // Two soft bands drifting across the screen, wrapping
      this._mistShift = (this._mistShift + delta * 0.008) % (cam.width + 600);
      const bands = [
        { y: cam.height * 0.38, h: 60, a: 0.07, off: 0 },
        { y: cam.height * 0.62, h: 90, a: 0.10, off: cam.width * 0.55 },
      ];
      for (const b of bands) {
        const x = ((this._mistShift + b.off) % (cam.width + 600)) - 300;
        g.fillStyle(0xc8ccd4, b.a);
        g.fillEllipse(x, b.y, 700, b.h);
        g.fillEllipse(x + 420, b.y + 24, 520, b.h * 0.7);
        g.fillStyle(0xc8ccd4, b.a * 0.6);
        g.fillEllipse(x - 380, b.y - 16, 480, b.h * 0.8);
      }
    } else if (w === 'drizzle') {
      // Fine rain, drifting slightly with the world's wind
      if (this._drops.length === 0) {
        for (let i = 0; i < 54; i++) {
          this._drops.push({ x: Math.random() * cam.width, y: Math.random() * cam.height,
            s: 5 + Math.random() * 4 });
        }
      }
      g.lineStyle(1, 0x9aa4b8, 0.35);
      for (const d of this._drops) {
        d.y += d.s * delta * 0.06;
        d.x -= delta * 0.012;
        if (d.y > cam.height) { d.y = -8; d.x = Math.random() * cam.width; }
        if (d.x < 0) d.x += cam.width;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - 1.5, d.y + 7);
        g.strokePath();
      }
    } else if (w === 'gusts') {
      // Envelope only — the grass and smoke do the showing
      this._gustTimer -= delta;
      if (this._gustTimer <= 0) {
        this._gustTimer = 6000 + Math.random() * 8000;
        this._gustAt = 0;
      }
      if (this._gustAt !== undefined && this._gustAt < 1600) {
        this._gustAt += delta;
        const p = this._gustAt / 1600;
        this._gustMul = 1 + Math.sin(p * Math.PI) * 2.2;
      } else {
        this._gustMul = 1;
      }
    } else {
      this._gustMul = 1;
    }
  },
  getSkyTintForHour(hour) {
    // Returns { col, a } overlay for the given hour. Hard-coded per window.
    if (hour >= 6 && hour < 7)        return { col: 0xe88a4a, a: 0.20 }; // dawn — pink-ochre
    if (hour >= 7 && hour < 12)       return { col: 0x5060_70 & 0xffffff, a: 0.10 }; // morning — muted blue-grey
    if (hour >= 12 && hour < 13)      return { col: 0xfff0c8, a: 0.18 }; // noon — flat bright
    if (hour >= 13 && hour < 19)      return { col: 0xc88040, a: 0.15 }; // afternoon — amber-gold
    if (hour >= 19 && hour < 20)      return { col: 0x6a3a70, a: 0.30 }; // dusk — bruised purple-gold
    if (hour >= 20 && hour < 24)      return { col: 0x0a0e22, a: 0.55 }; // night — deep blue-black
    return { col: 0x080820, a: 0.60 };                                   // latenight — darker
  },
  // ── ATMOSPHERE ────────────────────────────────────────────────────
  drawAtmosphere() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    const cx = w / 2, cy = h / 2;

    // Full-screen dusk sky gradient — bruised purple-blue at the very
    // top fading to warm ochre at the horizon. Covers the entire canvas
    // so there is never a black corner; the world feels like it
    // continues beyond the iso playfield.
    const sky = this.add.graphics();
    sky.setDepth(-10); sky.setScrollFactor(0);
    const skyBands = 40;
    for (let i = 0; i < skyBands; i++) {
      const t = i / (skyBands - 1);
      const bandH = Math.ceil(h / skyBands) + 1;
      // Top: deep bruised purple-blue.  Bottom: warm ochre horizon.
      const r = Math.round(0x18 + (0x6e - 0x18) * t);
      const g = Math.round(0x16 + (0x4a - 0x16) * t);
      const b = Math.round(0x2e + (0x22 - 0x2e) * t);
      sky.fillStyle((r << 16) | (g << 8) | b, 1);
      sky.fillRect(0, i * bandH, w, bandH);
    }

    // Sparse pixel stars in the upper third of the sky.
    const stars = this.add.graphics();
    stars.setDepth(-9); stars.setScrollFactor(0);
    for (let i = 0; i < 60; i++) {
      const sxs = Math.floor(Math.random() * w);
      const sys = Math.floor(Math.random() * (h * 0.45));
      const bright = Math.random();
      if (bright > 0.85) {
        stars.fillStyle(0xfff0d0, 0.95);
        stars.fillRect(sxs, sys, 2, 2);
      } else {
        stars.fillStyle(0xd8d0b0, 0.55 + Math.random() * 0.4);
        stars.fillRect(sxs, sys, 1, 1);
      }
    }

    // Soft warm radial firelight from the idol — radius bumped 40%,
    // brightness boosted so the idol pulls the eye immediately.
    const ix = (this.idolScreenX != null) ? this.idolScreenX : cx;
    const iy = (this.idolScreenY != null) ? this.idolScreenY : cy;
    const warm = this.add.graphics();
    warm.setDepth(998).setScrollFactor(0);
    const warmRings = [
      { col: 0xffcc66, a: 0.10,  rw: w * 0.42, rh: h * 0.42 },
      { col: 0xffaa44, a: 0.08,  rw: w * 0.63, rh: h * 0.59 },
      { col: 0xff9933, a: 0.05,  rw: w * 0.84, rh: h * 0.77 },
    ];
    warmRings.forEach(r => {
      warm.fillStyle(r.col, r.a);
      warm.fillEllipse(ix, iy, r.rw, r.rh);
    });

    // Light vignette — pushes the corners 20% darker without
    // touching the warm idol bloom.
    const fog = this.add.graphics();
    fog.setDepth(999); fog.setScrollFactor(0);
    const rings = 14;
    for (let i = rings; i >= 1; i--) {
      const t = i / rings;
      const rw = w * (0.5 + t * 0.7);
      const rh = h * (0.5 + t * 0.7);
      fog.fillStyle(0x0a0a14, (t * t * 0.6) / rings);
      fog.fillEllipse(ix, iy, rw, rh);
    }
  },
  // ── DEPTH SORTING ─────────────────────────────────────────────────
  sortObjects() {
    this.objectLayer.sort('y', (a, b) => {
      const ay = a._sortY !== undefined ? a._sortY : a.y;
      const by = b._sortY !== undefined ? b._sortY : b.y;
      return ay - by;
    });
  },
  // ── Noon light shift ──
  applyNoonLight(on) {
    if (on) {
      if (!this._noonOverlay) {
        this._noonOverlay = this.add.graphics();
        this._noonOverlay.setScrollFactor(0).setDepth(890);
      }
      const cam = this.cameras.main;
      this._noonOverlay.clear();
      this._noonOverlay.fillStyle(0xddcc88, 0.18);
      this._noonOverlay.fillRect(0, 0, cam.width, cam.height);
      this._noonOverlay.setAlpha(0);
      this.tweens.add({ targets: this._noonOverlay, alpha: 1, duration: 1500 });
    } else if (this._noonOverlay) {
      this.tweens.add({ targets: this._noonOverlay, alpha: 0, duration: 2000 });
    }
  },
  updateCamera() {
    const cam = this.cameras.main;
    // Gameplay zoom: frame ~15 tiles across, whatever the window size —
    // the whole village visible at once killed all sense of discovery.
    // Cutscenes may drive zoom themselves; don't fight them.
    if (!this._cutsceneActive && !this.visionActive) {
      const targetZoom = Phaser.Math.Clamp(cam.width / (15.5 * TILE_W), 1.3, 2.1);
      cam.zoom += (targetZoom - cam.zoom) * 0.06;
    }
    const iso = cartToIso(this.playerCartX, this.playerCartY);
    const targetX = iso.x + this.worldOffset.x - cam.width / 2;
    const targetY = iso.y + this.worldOffset.y - cam.height / 2;
    cam.scrollX += (targetX - cam.scrollX) * 0.08;
    cam.scrollY += (targetY - cam.scrollY) * 0.08;
  },
  // ── UI CAMERA ──────────────────────────────────────────────────────
  // The gameplay camera zooms (1.3-2.1 outside, 2.1 in interiors), which
  // dragged every fixed-position element — dialogue box, HUD, journal,
  // pause menu — off the screen edges. UI now renders through its own
  // unzoomed camera: the main camera ignores UI, the UI camera ignores
  // the world. Register late-created UI via _registerUI().
  _setupUICamera() {
    if (this._uiCam) return;
    // Anything created later with scrollFactor 0 is UI by definition —
    // catch it at creation so journal/pause/portraits/toasts need no
    // per-call bookkeeping.
    this.children.addCallback = (obj) => {
      if (!this._uiCam) return;
      if (obj.scrollFactorX === 0 && obj.scrollFactorY === 0) this._registerUI(obj);
      else { try { this._uiCam.ignore(obj); } catch (e) {} }
    };
    const cam = this.cameras.main;
    this._uiCam = this.cameras.add(0, 0, cam.width || 1280, cam.height || 720);
    this._uiCam.setScroll(0, 0);
    this._uiCam.transparent = true;
    this._uiObjects = [];
    // Keep the UI camera the size of the window (Scale.RESIZE mode)
    this.scale.on('resize', (size) => {
      if (this._uiCam) this._uiCam.setSize(size.width, size.height);
    });
    // Everything currently in the display list is world; UI opts in later
    this.children.list.forEach(o => {
      if (o.scrollFactorX === 0 && o.scrollFactorY === 0) this._registerUI(o);
      else { try { this._uiCam.ignore(o); } catch (e) {} }
    });
    // Layer containers are always world
    [this.groundLayer, this.lightLayer, this.objectLayer, this.particleLayer]
      .forEach(l => { if (l) { try { this._uiCam.ignore(l); } catch (e) {} } });
  },
  // Route a UI object to the UI camera (hidden from the world camera).
  _registerUI(obj) {
    if (!obj || !this._uiCam) return obj;
    try {
      this.cameras.main.ignore(obj);
      if (!this._uiObjects.includes(obj)) this._uiObjects.push(obj);
    } catch (e) {}
    return obj;
  },
  // ── VIEW VEIL — the lantern-radius of knowing ─────────────────────
  // The world is clear near the traveller and falls into a soft dark
  // beyond — tighter after dusk. Discovery means walking toward things.
  // Cutscenes and dialogue lift it so directed moments stay readable.
  updateViewVeil() {
    // World-space veil: the gradient rides the PLAYER's world position
    // and the camera transforms it like everything else — no screen math.
    if (!this._veilGfx) {
      this._veilGfx = this.add.graphics().setDepth(999); // above world, below HUD
    }
    const g = this._veilGfx;
    g.clear();
    if (this._cutsceneActive || this.visionActive || this.dialogueActive
      || this._paused || this._pauseLayer) {
      if (this._veilImg) this._veilImg.setVisible(false);
      return;
    }
    const cam = this.cameras.main;
    const iso = cartToIso(this.playerCartX, this.playerCartY);
    const wx = iso.x + this.worldOffset.x;
    const wy = iso.y + this.worldOffset.y - 14;
    const night = gameState.gameHour >= 20 || gameState.gameHour < 6;
    const clearR = (night ? 4.0 : 5.0) * (TILE_W / 2); // WORLD px of full clarity
    const maxA = night ? 0.78 : 0.62;
    // One-time smooth radial gradient texture (no ring banding)
    if (!this.textures.exists('veil_grad')) {
      const size = 512;
      const cnv = this.textures.createCanvas('veil_grad', size, size);
      const ctx = cnv.getContext();
      const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.5);
      grd.addColorStop(0, 'rgba(6,6,16,0)');
      grd.addColorStop(0.55, 'rgba(6,6,16,0.62)');
      grd.addColorStop(1, 'rgba(6,6,16,1)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);
      cnv.refresh();
    }
    if (!this._veilImg) {
      this._veilImg = this.add.image(0, 0, 'veil_grad').setDepth(999);
    }
    const scale = clearR / 113; // texture clear-radius ≈ 113px
    this._veilImg.setVisible(true).setPosition(wx, wy).setScale(scale).setAlpha(maxA);
    // Solid dark beyond the gradient's edge out to the camera's world view
    const rOut = 256 * scale - 2;
    const wv = cam.worldView;
    const pad = 40;
    g.fillStyle(0x060610, maxA);
    const bx = wx - rOut, by = wy - rOut, bs = rOut * 2;
    const L = wv.x - pad, T = wv.y - pad, R = wv.right + pad, B = wv.bottom + pad;
    if (by > T) g.fillRect(L, T, R - L, by - T);
    if (B > by + bs) g.fillRect(L, by + bs, R - L, B - (by + bs));
    if (bx > L) g.fillRect(L, by, bx - L, bs);
    if (R > bx + bs) g.fillRect(bx + bs, by, R - (bx + bs), bs);
  },
});
