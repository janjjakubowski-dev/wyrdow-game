

// ═══════════════════════════════════════════════════════════════════════
// OPENING AWAKENING SCENE
// ═══════════════════════════════════════════════════════════════════════
class OpeningScene extends Phaser.Scene {
  constructor() { super('OpeningScene'); }

  preload() {
    music.preload(this);
    sfx.preload(this);
  }

  create() {
    music.bind(this);
    sfx.bind(this);
    this.input.keyboard.on('keydown', () => { music.unlock(); sfx.unlock(); }, { once: false });
    // M — global music + sfx mute toggle (does not affect procedural ambience)
    this.input.keyboard.on('keydown-M', () => { music.toggleMute(); sfx.toggleMute(); });
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    cam.setBackgroundColor(0x000000);

    // Stage 1 — black hold + audio
    ambientAudio.startAwakeningAmbience();

    // ── Rich close-up ground scene ────────────────────────────────
    // Ground occupies bottom ~35% of the screen.
    const groundTop = H * 0.65;
    const groundH = H - groundTop;
    const ground = this.add.graphics().setAlpha(0);

    // Tiny seeded RNG so the ground is the same every play
    let _seed = 9173;
    const rnd = () => { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; };

    // ── SKY: faint vertical gradient + stars + horizon mist ────────
    // The sky sits behind everything else so it's drawn first.
    const sky = this.add.graphics().setDepth(-12);
    // Gradient — pure black at the top, extremely dark blue-black at horizon.
    // We bake it as a series of 1px-tall horizontal slabs.
    const skyTopY = 0;
    const skyBotY = Math.floor(H * 0.65);
    const skySteps = 64;
    for (let i = 0; i < skySteps; i++) {
      const t = i / (skySteps - 1);
      // Lerp from #000000 to #050810
      const r = Math.round(0 + t * 5);
      const gC = Math.round(0 + t * 8);
      const b = Math.round(0 + t * 16);
      const col = (r << 16) | (gC << 8) | b;
      const y0 = Math.floor(skyTopY + t * (skyBotY - skyTopY));
      const y1 = Math.floor(skyTopY + ((i + 1) / (skySteps - 1)) * (skyBotY - skyTopY));
      sky.fillStyle(col, 1);
      sky.fillRect(0, y0, W, Math.max(1, y1 - y0));
    }
    // Stars — 25–35, weighted toward upper portion of sky.
    const starCount = 25 + Math.floor(rnd() * 11);
    for (let i = 0; i < starCount; i++) {
      // Bias upward — square the random value
      const ty = rnd() * rnd();
      const sy = Math.floor(ty * (skyBotY * 0.78));
      const sx = Math.floor(rnd() * W);
      const r = rnd();
      if (r < 0.12) {
        // 2x2 slightly blue-tinted brighter star
        sky.fillStyle(0xc8d8ff, 0.5);
        sky.fillRect(sx, sy, 2, 2);
      } else if (r < 0.30) {
        // brighter single pixel
        sky.fillStyle(0xffffff, 0.7);
        sky.fillRect(sx, sy, 1, 1);
      } else {
        // faint single pixel
        sky.fillStyle(0xffffff, 0.4);
        sky.fillRect(sx, sy, 1, 1);
      }
    }
    // Horizon haze — 3-4 px band of dark green-grey just above the grass line
    sky.fillStyle(0x0a1208, 0.30);
    sky.fillRect(0, skyBotY - 4, W, 4);
    sky.fillStyle(0x0a1208, 0.18);
    sky.fillRect(0, skyBotY - 6, W, 2);
    this._awakeningSky = sky;

    // ── Base earth: 6 brown tones in COMPLETELY irregular organic patches.
    // The base wash is the second-darkest tone so individual patches read
    // either as shadow or highlight against it.
    ground.fillStyle(0x2a1a0e, 1);
    ground.fillRect(0, groundTop, W, groundH);
    // 6 distinct earth tones — near-black soil → pale sandy ochre
    const earthTones = [0x1a1008, 0x2a1a0e, 0x3d2410, 0x4a2e18, 0x6b4020, 0x8b6040];
    // Track the dominant tone of each cell so adjacent patches don't repeat.
    const cellSize = 18;
    const cellsX = Math.ceil(W / cellSize) + 2;
    const cellsY = Math.ceil(groundH / cellSize) + 2;
    const cellTone = new Array(cellsX * cellsY).fill(-1);
    const idx = (cx, cy) => cy * cellsX + cx;
    // ~340 patches — denser, varied size, irregular shapes
    for (let i = 0; i < 340; i++) {
      const px2 = Math.floor(rnd() * W);
      const py2 = Math.floor(groundTop + 4 + rnd() * (groundH - 8));
      // Pick a tone that isn't the same as the cell's previous tone
      const cx = Math.floor(px2 / cellSize);
      const cy = Math.floor((py2 - groundTop) / cellSize);
      let toneIdx;
      let attempts = 0;
      do {
        toneIdx = Math.floor(rnd() * 6);
        attempts++;
      } while (attempts < 4 && cellTone[idx(cx, cy)] === toneIdx);
      cellTone[idx(cx, cy)] = toneIdx;
      const tone = earthTones[toneIdx];
      // Irregular shape: blob with per-row varying widths and random insets
      const pw = 4 + Math.floor(rnd() * 28);   // wider range — some narrow some wide
      const ph = 2 + Math.floor(rnd() * 12);
      const alpha = 0.45 + rnd() * 0.45;
      ground.fillStyle(tone, alpha);
      let curW = pw;
      for (let yy = 0; yy < ph; yy++) {
        // Per-row organic wobble — width drifts up and down each row
        curW += Math.round((rnd() - 0.5) * 3);
        if (curW < 2) curW = 2;
        if (curW > pw + 5) curW = pw + 5;
        const insetL = Math.floor(rnd() * 3);
        const insetR = Math.floor(rnd() * 3);
        ground.fillRect(px2 + insetL, py2 + yy, curW - insetL - insetR, 1);
      }
    }
    // A second sparse pass of the lightest sandy ochre — barely-visible warm flecks
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rnd() * W);
      const y = Math.floor(groundTop + 6 + rnd() * (groundH - 12));
      ground.fillStyle(0x8b6040, 0.35 + rnd() * 0.25);
      ground.fillRect(x, y, 2 + Math.floor(rnd() * 4), 1);
    }
    // Fine soil speckle
    for (let i = 0; i < 520; i++) {
      const x = rnd() * W;
      const y = groundTop + 6 + rnd() * (groundH - 6);
      const t = rnd();
      if (t < 0.5)      ground.fillStyle(0x140c04, 0.85);
      else if (t < 0.8) ground.fillStyle(0x4a3620, 0.7);
      else              ground.fillStyle(0x5a4022, 0.6);
      ground.fillRect(x, y, 1, 1);
    }

    // ── Blurred dirt road edge at the very top of the ground ──────
    // Slightly lighter ochre strip ~18px tall with soft irregular bottom edge.
    const roadBaseY = groundTop;
    const roadH = 18;
    // Per-column height noise for the bottom edge
    const roadEdge = [];
    for (let x = 0; x < W; x++) {
      roadEdge[x] = Math.floor(
        Math.sin(x * 0.035) * 2 + Math.sin(x * 0.11) * 1.4 + rnd() * 2
      );
    }
    for (let x = 0; x < W; x++) {
      const h = roadH + roadEdge[x];
      // road body — slightly lighter ochre
      for (let yy = 0; yy < h; yy++) {
        // gradient: lighter at top, blending into earth at bottom
        const t = yy / h;
        const a = 0.55 - t * 0.4;
        ground.fillStyle(0x7a5a2c, a);
        ground.fillRect(x, roadBaseY - h + yy, 1, 1);
      }
      // soft bleed line just below the bottom edge
      ground.fillStyle(0x5a4220, 0.35);
      ground.fillRect(x, roadBaseY + (roadEdge[x] > 0 ? 0 : 1), 1, 1);
    }
    // Road dust highlight
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W;
      const y = roadBaseY - roadH + 2 + rnd() * (roadH - 6);
      ground.fillStyle(0x9a7a40, 0.5);
      ground.fillRect(x, y, 1 + Math.floor(rnd() * 2), 1);
    }

    // ── Small stones (3x2 grey-brown irregular shapes) ────────────
    for (let i = 0; i < 8; i++) {
      const x = 20 + rnd() * (W - 40);
      const y = groundTop + 10 + rnd() * (groundH - 16);
      ground.fillStyle(0x6a5a44, 0.95);
      ground.fillRect(x, y, 3, 2);
      ground.fillStyle(0x4a3a26, 0.95);
      ground.fillRect(x + 2, y + 1, 1, 1);
      ground.fillStyle(0x8a7a5a, 0.9);
      ground.fillRect(x, y, 1, 1);
    }

    // ── Small lighter pebbles (2x2 grey dots) ─────────────────────
    for (let i = 0; i < 10; i++) {
      const x = rnd() * W;
      const y = groundTop + 8 + rnd() * (groundH - 12);
      ground.fillStyle(0x7a6a50, 0.9);
      ground.fillRect(x, y, 2, 2);
      ground.fillStyle(0x9a8a6c, 0.9);
      ground.fillRect(x, y, 1, 1);
    }

    // ── Soil cracks: thin 1px dark lines, irregular short segments
    for (let i = 0; i < 5; i++) {
      const x0 = rnd() * W;
      const y0 = groundTop + 12 + rnd() * (groundH - 20);
      const len = 6 + Math.floor(rnd() * 14);
      const angle = (rnd() - 0.5) * 1.6;
      ground.fillStyle(0x0a0604, 0.9);
      let cx2 = x0, cy2 = y0;
      for (let s = 0; s < len; s++) {
        ground.fillRect(Math.floor(cx2), Math.floor(cy2), 1, 1);
        cx2 += Math.cos(angle) + (rnd() - 0.5) * 0.4;
        cy2 += Math.sin(angle) + (rnd() - 0.5) * 0.4;
      }
    }

    // ── Bare root fragments: thin dark curved lines ───────────────
    for (let i = 0; i < 3; i++) {
      const x0 = rnd() * W;
      const y0 = groundTop + 4 + rnd() * 8; // near surface
      const len = 14 + Math.floor(rnd() * 10);
      ground.fillStyle(0x1c1208, 1);
      let cx2 = x0, cy2 = y0;
      let dir = (rnd() - 0.5) * 0.8;
      for (let s = 0; s < len; s++) {
        ground.fillRect(Math.floor(cx2), Math.floor(cy2), 1, 1);
        // slight thickness on alternating pixels
        if (s % 3 === 0) ground.fillRect(Math.floor(cx2), Math.floor(cy2) + 1, 1, 1);
        cx2 += 1 + (rnd() - 0.5) * 0.3;
        cy2 += dir;
        dir += (rnd() - 0.5) * 0.25;
        dir = Math.max(-1, Math.min(1, dir));
      }
    }

    // ── Three-layer grass silhouette ───────────────────────────────
    // Layer order: background (dense, short, very dark) → middle (medium,
    // dark, some gaps) → foreground (sparse, taller, lighter, individual).
    // The combined silhouette rises and falls irregularly with grouped
    // clumps and clear gaps between groups.
    const grassBaseY = groundTop;

    // Background — very dark, dense, short blades
    for (let x = 0; x < W; x += 1) {
      if (rnd() > 0.65) continue; // very dense
      const bh = 6 + Math.floor(rnd() * 5); // 6..10
      const lean = (rnd() - 0.5) * 1.5;
      ground.fillStyle(0x1a3010, 1);
      for (let yy = 0; yy < bh; yy++) {
        const t = yy / bh;
        const ox = t * lean;
        ground.fillRect(Math.floor(x + ox), grassBaseY - yy, 1, 1);
      }
    }

    // Middle — medium dark, 10-18 px, slightly less dense, some gaps
    let gap = 0;
    for (let x = 0; x < W; x += 1) {
      if (gap > 0) { gap--; continue; }
      // Occasionally open a clear gap (1-4 px) to expose the background
      if (rnd() < 0.04) { gap = 1 + Math.floor(rnd() * 4); continue; }
      if (rnd() > 0.42) continue;
      const bh = 10 + Math.floor(rnd() * 9); // 10..18
      const lean = (rnd() - 0.5) * 2.4;
      ground.fillStyle(0x2a4a18, 1);
      for (let yy = 0; yy < bh; yy++) {
        const t = yy / bh;
        const ox = t * lean;
        ground.fillRect(Math.floor(x + ox), grassBaseY - yy, 1, 1);
      }
      // Occasional brighter tip
      if (rnd() < 0.25) {
        ground.fillStyle(0x4a7028, 0.75);
        ground.fillRect(Math.floor(x + lean), grassBaseY - bh, 1, 1);
      }
    }

    // Foreground — taller, lighter, sparse, individual blades clearly distinguishable
    for (let x = 0; x < W; x += 1) {
      if (rnd() > 0.18) continue; // sparse
      const bh = 18 + Math.floor(rnd() * 13); // 18..30
      const lean = (rnd() - 0.5) * 4;
      ground.fillStyle(0x3a5a20, 1);
      for (let yy = 0; yy < bh; yy++) {
        const t = yy / bh;
        const ox = t * lean;
        ground.fillRect(Math.floor(x + ox), grassBaseY - yy, 1, 1);
      }
      // Lighter tip on most foreground blades
      ground.fillStyle(0x4a7028, 1);
      ground.fillRect(Math.floor(x + lean), grassBaseY - bh, 1, 1);
      ground.fillStyle(0x4a7028, 0.6);
      ground.fillRect(Math.floor(x + lean), grassBaseY - bh + 1, 1, 1);
    }

    // Grouped foreground clumps — 3-4 blades close together with varied heights
    for (let c = 0; c < 14; c++) {
      const cxg = rnd() * W;
      const blades = 3 + Math.floor(rnd() * 2);
      for (let b = 0; b < blades; b++) {
        const bh = 18 + Math.floor(rnd() * 14);
        const ox0 = b - blades / 2;
        const lean = (rnd() - 0.5) * 2.5;
        ground.fillStyle(0x2a4a18, 1);
        for (let yy = 0; yy < bh; yy++) {
          const t = yy / bh;
          ground.fillRect(Math.floor(cxg + ox0 + t * lean), grassBaseY - yy, 1, 1);
        }
        ground.fillStyle(0x4a7028, 1);
        ground.fillRect(Math.floor(cxg + ox0 + lean), grassBaseY - bh, 1, 1);
      }
    }

    // ── Foreground grass blades (close to camera, larger, soft edges)
    const fgBlades = [
      { x: W * 0.07, h: 22, lean:  3, col: 0x1a2610 },
      { x: W * 0.16, h: 18, lean: -2, col: 0x223018 },
      { x: W * 0.27, h: 25, lean:  4, col: 0x1c2812 },
      { x: W * 0.74, h: 20, lean: -3, col: 0x223018 },
      { x: W * 0.86, h: 24, lean:  2, col: 0x1a2610 },
      { x: W * 0.95, h: 17, lean: -4, col: 0x243218 },
    ];
    fgBlades.forEach(b => {
      const baseY = H - 4;
      for (let yy = 0; yy < b.h; yy++) {
        const t = yy / b.h;
        const ox = t * b.lean;
        // 2px wide at base tapering to 1 at tip
        const w = t < 0.7 ? 2 : 1;
        ground.fillStyle(b.col, 1);
        ground.fillRect(b.x + ox, baseY - yy, w, 1);
        // soft blur edge — faint pixel left/right
        ground.fillStyle(b.col, 0.35);
        ground.fillRect(b.x + ox - 1, baseY - yy, 1, 1);
        ground.fillRect(b.x + ox + w, baseY - yy, 1, 1);
      }
      // tip highlight
      ground.fillStyle(0x3e5a22, 0.85);
      ground.fillRect(b.x + b.lean, baseY - b.h, 1, 1);
    });

    // ── Beetle: 8x5, blue-black sheen, visible legs ───────────────
    this.beetle = this.add.graphics().setAlpha(0);
    this.beetleX = W * 0.30;
    this.beetleY = groundTop + groundH * 0.55;
    this.beetleDir = 1;
    this.beetleLegPhase = 0;
    const drawBeetle = () => {
      const b = this.beetle;
      const bx = this.beetleX, by = this.beetleY, f = this.beetleDir;
      b.clear();
      // Soft shadow
      b.fillStyle(0x000000, 0.6);
      b.fillEllipse(bx, by + 4, 12, 3);
      // Body — 10x6
      b.fillStyle(0x080a14, 1);
      b.fillRect(bx - 5, by - 3, 10, 6);
      // Carapace iridescent sheen — 2-3 lighter blue pixels on wing cases
      b.fillStyle(0x1c2848, 1);
      b.fillRect(bx - 4, by - 3, 8, 1);
      b.fillStyle(0x2c3e6a, 1);
      b.fillRect(bx - 3, by - 2, 2, 1);
      b.fillRect(bx + 1, by - 2, 2, 1);
      b.fillStyle(0x4a5e8a, 1);
      b.fillRect(bx - 2, by - 2, 1, 1);
      b.fillRect(bx + 2, by - 2, 1, 1);
      // Wing seam down the middle
      b.fillStyle(0x000000, 1);
      b.fillRect(bx, by - 3, 1, 6);
      // Head
      b.fillStyle(0x000000, 1);
      b.fillRect(bx + f * 5, by - 2, 2, 4);
      // Tiny antennae
      b.fillStyle(0x1a1a22, 1);
      b.fillRect(bx + f * 6, by - 3, 1, 1);
      b.fillRect(bx + f * 7, by - 4, 1, 1);
      // Legs — 3 pairs, single-pixel lines, alternating step
      const step = Math.sin(this.beetleLegPhase) > 0 ? 1 : 0;
      b.fillStyle(0x000000, 1);
      // top side legs
      b.fillRect(bx - 4, by - 4 - step, 1, 1);
      b.fillRect(bx - 1, by - 4 - (1 - step), 1, 1);
      b.fillRect(bx + 3, by - 4 - step, 1, 1);
      // bottom side legs
      b.fillRect(bx - 4, by + 3 + step, 1, 1);
      b.fillRect(bx - 1, by + 3 + (1 - step), 1, 1);
      b.fillRect(bx + 3, by + 3 + step, 1, 1);
    };
    drawBeetle();
    this._beetleDraw = drawBeetle;

    // ── Subtle ambient dust motes / pollen ────────────────────────
    this.motes = [];
    for (let i = 0; i < 16; i++) {
      this.motes.push({
        x: Math.random() * W,
        y: groundTop + Math.random() * (H - groundTop),
        v: 0.05 + Math.random() * 0.12,
        sway: Math.random() * Math.PI * 2,
        col: Math.random() < 0.5 ? 0xc8b890 : 0xb0a070,
      });
    }
    this.moteGfx = this.add.graphics().setAlpha(0);
    this.moteGfx.setDepth(8);

    // Vignette overlay
    const vign = this.add.graphics();
    vign.fillStyle(0x000000, 0.55);
    vign.fillRect(0, 0, W, H * 0.32);
    vign.fillStyle(0x000000, 0.35);
    vign.fillRect(0, H * 0.32, W, H * 0.08);

    // Distant village silhouette (revealed during rise)
    this.village = this.add.graphics().setAlpha(0);
    this.village.fillStyle(0x1a1422, 1);
    // rolling horizon
    for (let x = 0; x < W; x += 2) {
      const h = 8 + Math.sin(x * 0.012) * 4 + Math.sin(x * 0.04) * 2;
      this.village.fillRect(x, H * 0.42 - h, 2, h + 4);
    }
    // crooked house silhouettes
    const houseSpec = [
      { x: W * 0.30, w: 26, h: 30 }, { x: W * 0.42, w: 22, h: 26 },
      { x: W * 0.52, w: 30, h: 34 }, { x: W * 0.63, w: 24, h: 28 },
      { x: W * 0.74, w: 20, h: 24 },
    ];
    houseSpec.forEach(hs => {
      this.village.fillStyle(0x0e0a14, 1);
      this.village.fillRect(hs.x - hs.w / 2, H * 0.42 - hs.h, hs.w, hs.h);
      // roof
      this.village.fillTriangle(
        hs.x - hs.w / 2 - 2, H * 0.42 - hs.h,
        hs.x + hs.w / 2 + 2, H * 0.42 - hs.h,
        hs.x, H * 0.42 - hs.h - hs.h * 0.45
      );
      // window glow
      this.village.fillStyle(0xd9a14a, 0.7);
      this.village.fillRect(hs.x - 1, H * 0.42 - hs.h * 0.55, 2, 2);
    });
    // central idol speck
    this.village.fillStyle(0xe8b060, 0.9);
    this.village.fillRect(W * 0.5 - 1, H * 0.42 - 16, 2, 4);

    // Hand reveal (built later)
    this.handGfx = this.add.graphics().setAlpha(0).setDepth(10);

    // Press-any-key prompt — sits centred in the upper portion of the
    // ground area (between the grass line and the bottom of the screen)
    // with a soft dark backdrop so it has a place to rest.
    const promptY = H * 0.79;
    this.pressPromptBg = this.add.graphics().setDepth(19).setAlpha(0);
    // Rounded rectangle backdrop ~ text width + padding
    const promptW = 280, promptH = 42;
    this.pressPromptBg.fillStyle(0x000000, 0.40);
    this.pressPromptBg.fillRoundedRect(W / 2 - promptW / 2, promptY - promptH / 2,
                                       promptW, promptH, 10);
    this.pressPrompt = this.add.text(W / 2, promptY,
      '[ Press any key ]', {
        fontFamily: 'Georgia, serif', fontSize: '25px', // 40% larger than 18
        color: '#c8b078', fontStyle: 'italic',
        stroke: '#0a0808', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

    // Sequence
    // Stage 1: 3s black
    this.time.delayedCall(3000, () => {
      // Stage 2: 4s ground rise (light up)
      this.tweens.add({ targets: ground, alpha: 1, duration: 4000 });
      this.tweens.add({ targets: this.beetle, alpha: 1, duration: 4000 });
      this.tweens.add({ targets: this.moteGfx, alpha: 1, duration: 4000 });
      this.time.delayedCall(4000, () => {
        // Stage 3: prompt + backdrop together
        this.tweens.add({ targets: [this.pressPrompt, this.pressPromptBg], alpha: 1, duration: 1200 });
        const onKey = () => {
          this.input.keyboard.off('keydown', onKey);
          this.tweens.add({ targets: [this.pressPrompt, this.pressPromptBg], alpha: 0, duration: 400 });
          this.startStandUp(ground);
        };
        this.input.keyboard.on('keydown', onKey);
      });
    });

    // Beetle crawl animation
    this._beetleTimer = 0;
  }

  startStandUp(ground) {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;

    // Stage 4: 2s rise — pan ground down slightly, reveal village
    this.tweens.add({
      targets: ground, y: H * 0.12, alpha: 0.5, duration: 2000, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.beetle, y: H * 0.12, alpha: 0.5, duration: 2000,
    });
    this.tweens.add({
      targets: this.village, alpha: 1, duration: 2000,
    });

    this.time.delayedCall(2000, () => this.handReveal());
  }

  handReveal() {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    // Same horizon line used when the ground was originally drawn.
    const grassBaseY = H * 0.65;

    // Fade ground/village to dim during hand reveal
    this.tweens.add({ targets: [this.village], alpha: 0.25, duration: 600 });

    // Stage 5: hand reveal — left hand normal, right hand glowing
    const g = this.handGfx;
    g.setAlpha(0);
    // High-detail pixel-art hand renderer (PASS 1 REBUILD).
    // Logical-pixel grid is ~20 wide × 22 tall, scaled by `px`.
    // At px=10 each hand is ~200×220 pixels — fills the lower frame.
    // Origin (cx,cy) = top-left of the bounding box.
    // flip = mirror horizontally so the thumb sits on the outer edge.
    // opts.dirty = soil + diagonal palm scar (left hand)
    // opts.mark  = 0..1 pulse value for amber rune glow (right hand)
    // opts.tilt  = small rotation in radians (~15° natural)
    const drawPxHand = (cx, cy, px, flip, opts) => {
      // 3-tone warm skin
      const skinBase  = 0xc89878;
      const skinHi    = 0xe0b894; // ~20% lighter
      const skinShade = 0x956c4a; // ~25% darker
      const skinEdge  = 0x6e4830;
      const dirt      = 0x2c1c0e;
      const scarColor = 0x8a3a2a;

      // Helpers — flip x around the bounding box center (10)
      const fx = (x) => flip ? (20 - x) : x;
      const dot = (x, y, color, alpha = 1) => {
        g.fillStyle(color, alpha);
        g.fillRect(cx + fx(x) * px, cy + y * px, px, px);
      };
      const rect = (x0, y0, w, h, color, alpha = 1) => {
        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            dot(x0 + xx, y0 + yy, color, alpha);
          }
        }
      };

      // ── Palm: rectangle slightly wider at the knuckles than wrist.
      // Knuckle line at y=8, palm bottom at y=17.
      // Outline columns (4..15), trimmed corners.
      const palmTop = 8, palmBot = 17;
      for (let y = palmTop; y <= palmBot; y++) {
        // taper: wrist (bottom) narrower than knuckles (top)
        const t = (y - palmTop) / (palmBot - palmTop); // 0 at top, 1 at bottom
        const inset = Math.round(t * 1.2);
        for (let x = 4 + inset; x <= 15 - inset; x++) {
          dot(x, y, skinBase);
        }
      }
      // Palm shading — soft highlight in the center, darker at edges
      for (let y = palmTop + 1; y <= palmBot - 1; y++) {
        for (let x = 4; x <= 15; x++) {
          const cxn = (x - 9.5) / 5.5;
          const cyn = (y - 12.5) / 4.5;
          const d2 = cxn * cxn + cyn * cyn;
          if (d2 < 0.25) dot(x, y, skinHi, 0.55);
        }
      }
      // Edge shadow on right side (palm's outer side)
      for (let y = palmTop; y <= palmBot; y++) {
        dot(15 - Math.round((y - palmTop) / 9 * 1.2), y, skinShade, 0.85);
      }
      // Bottom edge shadow into wrist
      for (let x = 5; x <= 14; x++) dot(x, palmBot, skinShade, 0.7);

      // ── Wrist (narrower than palm, fades into darkness)
      const wristTop = 18, wristBot = 21;
      for (let y = wristTop; y <= wristBot; y++) {
        for (let x = 6; x <= 13; x++) {
          dot(x, y, skinBase, 1 - (y - wristTop) * 0.18);
        }
        dot(13, y, skinShade, 0.7);
        dot(6, y, skinShade, 0.5);
      }
      // Wrist crease — single darker line at top of wrist
      for (let x = 6; x <= 13; x++) dot(x, wristTop, skinEdge, 0.6);

      // ── Four fingers above palm (y=0..7), curving slightly inward.
      // index longest, then middle, ring, pinky.
      // Each finger 2 logical px wide with 1 px gap.
      // Columns: index 4-5, middle 7-8, ring 10-11, pinky 13-14
      const fingers = [
        { col: 4,  len: 8, name: 'index'  },
        { col: 7,  len: 7, name: 'middle' },
        { col: 10, len: 6, name: 'ring'   },
        { col: 13, len: 5, name: 'pinky'  },
      ];
      fingers.forEach(f => {
        const top = palmTop - f.len; // y where finger starts
        // very slight inward curve — bend the column toward palm center
        for (let yy = 0; yy < f.len; yy++) {
          const y = palmTop - 1 - yy;
          const curve = Math.round((yy / f.len) * (f.col < 9 ? 0.6 : -0.6));
          const c0 = f.col + curve;
          const c1 = c0 + 1;
          dot(c0, y, skinBase);
          dot(c1, y, skinBase);
          // STRONGER side shading — left edge of each finger 15% darker
          dot(c0, y, skinShade, 0.55);
          // Soft highlight stripe down the center
          if (yy > 0 && yy < f.len - 1) dot(c1, y, skinHi, 0.4);
          // Right edge — light shadow for roundness
          dot(c1, y, skinShade, 0.35);
          // Glow-side warm reflection on right hand (lit from below by the mark)
          if (opts && opts.mark != null) {
            const warm = 0xffd28a;
            dot(c0, y, warm, 0.18 + (1 - yy / f.len) * 0.12);
          }
        }
        // Knuckle joint lines — now 2 pixels WIDE (full finger width) and full alpha
        const k1y = palmTop - 1 - Math.floor(f.len / 3);
        const k2y = palmTop - 1 - Math.floor(f.len * 2 / 3);
        const curve1 = Math.round((Math.floor(f.len/3) / f.len) * (f.col < 9 ? 0.6 : -0.6));
        const curve2 = Math.round((Math.floor(f.len*2/3) / f.len) * (f.col < 9 ? 0.6 : -0.6));
        dot(f.col + curve1, k1y, skinEdge, 1.0);
        dot(f.col + 1 + curve1, k1y, skinEdge, 1.0);
        dot(f.col + curve2, k2y, skinEdge, 1.0);
        dot(f.col + 1 + curve2, k2y, skinEdge, 1.0);
        // Tip rounding
        const tipY = palmTop - f.len;
        dot(f.col + (f.col < 9 ? 1 : -1), tipY, skinShade, 0.6);
      });
      // Top-of-palm knuckle ridge
      for (let x = 4; x <= 15; x++) dot(x, palmTop, skinEdge, 0.55);

      // ── Thumb on the outer (left when not flipped) edge, ~45° outward.
      // Thumb base attaches to palm around y=10..13, x=3
      // Diagonal upward-out
      const thumbCells = [
        [3, 13], [3, 12], [2, 12], [2, 11], [1, 11], [1, 10], [0, 10], [0, 9],
      ];
      thumbCells.forEach(([x, y]) => {
        dot(x, y, skinBase);
        dot(x, y + 1, skinBase);
      });
      // Thumb shading
      thumbCells.forEach(([x, y]) => dot(x, y + 1, skinShade, 0.55));
      // Thumb tip
      dot(0, 9, skinShade, 0.7);
      // Thenar (fleshy base of thumb) — wider, with a clear separating crease
      // so the thumb reads as DISTINCT from the palm.
      rect(2, 10, 3, 5, skinBase);
      dot(2, 10, skinHi, 0.5);
      dot(3, 11, skinHi, 0.45);
      // Crease separating thumb base from palm
      dot(4, 11, skinEdge, 0.95);
      dot(4, 12, skinEdge, 0.95);
      dot(4, 13, skinEdge, 0.85);
      dot(5, 12, skinShade, 0.55);

      // ── Dirt smudges + scar (left hand) — REBUILT
      if (opts && opts.dirty) {
        // Patches on the palm body
        const smudges = [
          [4, 4], [5, 5], [7, 3], [10, 5], [11, 6],
          [5, 16], [6, 17], [13, 16], [14, 15],
          [4, 12], [12, 11],
        ];
        smudges.forEach(([x, y]) => dot(x, y, dirt, 0.9));
        // Single dark pixel under each fingernail (at the very tip of each finger)
        const fingerCols = [4, 7, 10, 13];
        const fingerLens = [8, 7, 6, 5];
        fingerCols.forEach((c, i) => {
          const tipY = 8 - fingerLens[i];
          dot(c, tipY, 0x150a04, 0.95);
          dot(c + 1, tipY, 0x150a04, 0.95);
        });
        // Dirt along the creases between the fingers (vertical thin lines)
        for (let yy = 1; yy < 7; yy++) {
          dot(6, yy, dirt, 0.6);  // crease between index/middle
          dot(9, yy, dirt, 0.5);  // crease between middle/ring
          dot(12, yy, dirt, 0.5); // crease between ring/pinky
        }
        // Diagonal scar from between index/middle (top) down to heel of palm
        // 3 pixels wide at the thickest with a darker red shadow beneath.
        const scarPath = [
          [6, 9], [6, 10], [7, 11], [7, 12], [8, 13], [8, 14], [9, 15], [9, 16],
        ];
        scarPath.forEach(([x, y], i) => {
          // Darker red shadow underneath
          dot(x, y + 1, 0x4a1810, 0.85);
          dot(x + 1, y + 1, 0x4a1810, 0.7);
          // Main scar — full alpha center, softer edges
          dot(x, y, scarColor, 1.0);
          dot(x + 1, y, scarColor, 0.95);
          // Third pixel — gives the thickest part 3px width
          if (i >= 2 && i <= 5) dot(x + 2, y, scarColor, 0.7);
        });
        // Brighter healed-tissue specks along the scar
        dot(7, 10, 0xa04030, 0.8);
        dot(8, 12, 0xa04030, 0.8);
        dot(9, 14, 0xb84838, 0.85);
      }

      // ── Right-hand glowing rune (REBUILT — layered glow + breathing)
      if (opts && opts.mark != null) {
        const pulse = opts.mark; // 0..1
        const alpha = 0.85 + pulse * 0.15;
        const mcx = cx + fx(9.5) * px;
        const mcy = cy + 12.5 * px;

        // ── Layered radial glow with proper falloff stops ────────
        // Pulse breathing: outermost ring extends 25% further at peak.
        const breath = 1.0 + pulse * 0.25;
        const baseR  = 4 * px;
        const ring2R = 8 * px * breath;
        const ring3R = 14 * px * breath;
        const hazeR  = 22 * px * breath;
        // Outermost haze (10%)
        g.fillStyle(0xc06820, 0.10 * alpha);
        g.fillCircle(mcx, mcy, hazeR);
        // Third ring (30%)
        g.fillStyle(0xffb050, 0.30 * alpha);
        g.fillCircle(mcx, mcy, ring3R);
        // Second ring (60%)
        g.fillStyle(0xffd070, 0.60 * alpha);
        g.fillCircle(mcx, mcy, ring2R);
        // Innermost (100%)
        g.fillStyle(0xffe8a8, 1.0 * alpha);
        g.fillCircle(mcx, mcy, baseR);

        // Outer pixel ring of the rune itself
        const ringPts = [
          [9.5, 7.5], [11, 8], [12, 9.5], [12.5, 11], [12.5, 12.5], [12.5, 14],
          [12, 15.5], [11, 16.5], [9.5, 17], [8, 16.5], [7, 15.5], [6.5, 14],
          [6.5, 12.5], [6.5, 11], [7, 9.5], [8, 8],
        ];
        ringPts.forEach(([x, y]) => {
          g.fillStyle(0xffd070, alpha);
          g.fillRect(cx + fx(x) * px, cy + y * px, px, px);
        });

        // Inner ring
        const innerR = 2.2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const ix = 9.5 + Math.cos(a) * innerR;
          const iy = 12.5 + Math.sin(a) * innerR;
          g.fillStyle(0xffe8a8, alpha);
          g.fillRect(cx + fx(ix) * px, cy + iy * px, px, px);
        }

        // 4 cardinal radiating lines
        const radial = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        radial.forEach(([dx, dy]) => {
          for (let s = 3; s <= 4.5; s += 0.6) {
            g.fillStyle(0xfff0c0, alpha);
            g.fillRect(cx + fx(9.5 + dx * s) * px, cy + (12.5 + dy * s) * px, px, px);
          }
        });

        // 4 INTERCARDINAL secondary marks (NE/NW/SE/SW) — compass-rose style
        const inter = [
          [ 0.707, -0.707], [-0.707, -0.707],
          [ 0.707,  0.707], [-0.707,  0.707],
        ];
        inter.forEach(([dx, dy]) => {
          // Short radial dashes between inner and outer ring
          for (let s = 2.6; s <= 3.8; s += 0.6) {
            g.fillStyle(0xffc070, alpha * 0.95);
            g.fillRect(cx + fx(9.5 + dx * s) * px, cy + (12.5 + dy * s) * px, px, px);
          }
          // Tiny secondary mark pixel between cardinal points on the outer ring
          const ox = 9.5 + dx * 4.0;
          const oy = 12.5 + dy * 4.0;
          g.fillStyle(0xffe8a8, alpha);
          g.fillRect(cx + fx(ox) * px, cy + oy * px, px, px);
        });

        // 4 additional small "tick" marks halfway between cardinals (8 total
        // secondary marks per the spec when combined with the 4 above)
        const tickAngles = [Math.PI / 8, 3 * Math.PI / 8, 5 * Math.PI / 8, 7 * Math.PI / 8];
        tickAngles.forEach(a => {
          [a, a + Math.PI].forEach(aa => {
            const tx = 9.5 + Math.cos(aa) * 3.5;
            const ty = 12.5 + Math.sin(aa) * 3.5;
            g.fillStyle(0xffd890, alpha * 0.8);
            g.fillRect(cx + fx(tx) * px, cy + ty * px, px, px);
          });
        });

        // Center point — brightest pixel
        g.fillStyle(0xffffe0, alpha);
        g.fillRect(mcx - px / 2, mcy - px / 2, px, px);
        g.fillStyle(0xffffff, alpha * 0.85);
        g.fillRect(mcx - px / 4, mcy - px / 4, px / 2, px / 2);
      }
    };

    const drawHands = (pulse) => {
      g.clear();
      // PASS 1: ~2.5x larger hands — px went from 4 → 10.
      // Each hand bounding box ≈ 20×22 logical px × 10 = 200×220 actual px.
      // The wrists deliberately fall BELOW the screen edge so the hands
      // appear to be pushing up from the earth.
      const px = 10;
      const handLogicalW = 20 * px;            // 200
      const gap = handLogicalW * 1.0;          // ~one hand-width gap
      const totalW = handLogicalW * 2 + gap;
      const startX = (W - totalW) / 2;
      // Position: wrist (logical y=21) should land just below the bottom of
      // the screen — the hand TOP sits well above the grass line.
      // top-left y = H - (logical 22) * px - small overhang
      const topY = H - 19 * px;
      // Drop shadows beneath each hand on the grass — soft dark ovals
      // (drawn first so the hands sit on top of them).
      const shadowY = grassBaseY - 2;
      g.fillStyle(0x000000, 0.40);
      g.fillEllipse(startX + handLogicalW / 2,                     shadowY, handLogicalW * 0.85, 18);
      g.fillEllipse(startX + handLogicalW + gap + handLogicalW / 2, shadowY, handLogicalW * 0.85, 18);
      g.fillStyle(0x000000, 0.20);
      g.fillEllipse(startX + handLogicalW / 2,                     shadowY + 2, handLogicalW * 1.05, 24);
      g.fillEllipse(startX + handLogicalW + gap + handLogicalW / 2, shadowY + 2, handLogicalW * 1.05, 24);

      // Left hand — slightly raised, dirt + scar
      // (note: tilt is suggested visually by the slight Y offset between hands)
      drawPxHand(startX,                       topY - 4, px, false, { dirty: true });
      // Right hand — glowing rune, slightly forward/closer
      drawPxHand(startX + handLogicalW + gap,  topY,     px, true,  { mark: pulse });
    };
    drawHands(0);

    this.tweens.add({ targets: g, alpha: 1, duration: 800 });

    // Pulse twice over ~3s
    let pulseT = 0;
    const pulseEvent = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        pulseT += 0.016;
        const p = Math.sin(pulseT * 2.1) * 0.5 + 0.5;
        drawHands(p);
      },
    });
    this._handPulse = pulseEvent;

    // Stage 6: voice text after 1.2s
    this.time.delayedCall(1200, () => {
      const voice = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.42,
        "Don't show anyone your hand. Not yet.", {
          fontFamily: 'Georgia, serif', fontSize: '22px',
          color: '#e8d8a8', fontStyle: 'italic',
          stroke: '#0a0810', strokeThickness: 2, align: 'center',
        }).setOrigin(0.5).setAlpha(0).setDepth(30);
      this.tweens.add({
        targets: voice, alpha: 1, duration: 900,
        hold: 2400, yoyo: true,
        onComplete: () => {
          voice.destroy();
          // Awakening theme — Play 1: after the voice line fades, 40%, no loop
          music.playAwakening(0.40);
        },
      });
    });

    // Stage 7: pull back to iso, transition to GameScene
    this.time.delayedCall(5200, () => {
      pulseEvent.remove();
      const fade = this.add.graphics().setDepth(100);
      fade.fillStyle(0x000000, 0).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
      this.tweens.add({
        targets: fade, alpha: 1, duration: 1500,
        onUpdate: (tw) => {
          fade.clear();
          fade.fillStyle(0x000000, tw.getValue());
          fade.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        },
        onComplete: () => {
          this.scene.start('GameScene', { firstVisit: true });
        },
      });
    });
  }

  update(time, delta) {
    this._beetleTimer = (this._beetleTimer || 0) + delta;
    if (this._beetleTimer > 110 && this.beetle && this._beetleDraw) {
      this._beetleTimer = 0;
      this.beetleX += this.beetleDir * 0.9;
      this.beetleLegPhase += 0.9;
      if (this.beetleX > this.cameras.main.width * 0.75) this.beetleDir = -1;
      if (this.beetleX < this.cameras.main.width * 0.25) this.beetleDir = 1;
      this._beetleDraw();
    }
    // Drift dust motes upward, gentle sway
    if (this.motes && this.moteGfx && this.moteGfx.alpha > 0.01) {
      const W = this.cameras.main.width, H = this.cameras.main.height;
      this.moteGfx.clear();
      for (const m of this.motes) {
        m.y -= m.v * (delta / 16);
        m.sway += 0.02;
        const xx = m.x + Math.sin(m.sway) * 0.6;
        if (m.y < H * 0.32) { m.y = H - 8; m.x = Math.random() * W; }
        this.moteGfx.fillStyle(m.col, 0.55);
        this.moteGfx.fillRect(xx, m.y, 1, 1);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// TRAVEL SCENE — the road between towns ("the roads remember")
// A short walking vignette: dark pines drifting past, footsteps, one
// line of text. Arrives with the destination town's namespace loaded.
// ─────────────────────────────────────────────────────────────────────
