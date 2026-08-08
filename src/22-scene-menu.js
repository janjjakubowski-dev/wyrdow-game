class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  preload() {
    // ── Loading screen — the music files are the heavy part of the
    // first visit, so show a folk-styled progress thread while they load.
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const cx = W / 2, cy = H / 2;
    const barW = Math.min(W * 0.5, 420);
    const loadTitle = this.add.text(cx, cy - 46, 'W Y R D Ó W', {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#c8922a',
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);
    const loadLabel = this.add.text(cx, cy + 34, 'spooling the thread…', {
      fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#8a7a5a',
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);
    const track = this.add.graphics();
    track.fillStyle(0x2a1f14, 1);
    track.fillRect(cx - barW / 2, cy - 2, barW, 4);
    const fill = this.add.graphics();
    const knot = this.add.graphics(); // little diamond travelling the thread
    this.load.on('progress', (p) => {
      fill.clear();
      fill.fillStyle(0xc8922a, 1);
      fill.fillRect(cx - barW / 2, cy - 2, barW * p, 4);
      knot.clear();
      const kx = cx - barW / 2 + barW * p;
      knot.fillStyle(0xffd97a, 1);
      knot.fillTriangle(kx, cy - 7, kx + 6, cy, kx, cy + 7);
      knot.fillTriangle(kx, cy - 7, kx - 6, cy, kx, cy + 7);
    });
    this.load.on('complete', () => {
      [loadTitle, loadLabel, track, fill, knot].forEach(o => {
        this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
      });
    });
    music.preload(this);
    sfx.preload(this);
  }

  create() {
    music.bind(this);
    sfx.bind(this);
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    cam.setBackgroundColor(0x0d0818);
    this._W = W; this._H = H;

    // Unlock audio on first input
    this.input.keyboard.on('keydown', () => { music.unlock(); sfx.unlock(); }, { once: false });
    this.input.on('pointerdown',     () => { music.unlock(); sfx.unlock(); }, { once: false });

    // ── LAYER 1: SKY ───────────────────────────────────────────────
    const sky = this.add.graphics().setDepth(-20);
    const steps = 48;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      // #0d0818 → #1a1030
      const r = Math.round(13 + t * (26 - 13));
      const g = Math.round(8  + t * (16 - 8));
      const b = Math.round(24 + t * (48 - 24));
      sky.fillStyle((r << 16) | (g << 8) | b, 1);
      sky.fillRect(0, Math.floor(i / steps * H * 0.7), W, Math.ceil(H * 0.7 / steps) + 1);
    }
    // Stars (40–50)
    let seed = 4519;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const starCount = 40 + Math.floor(rnd() * 11);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.floor(rnd() * W);
      const sy = Math.floor(rnd() * rnd() * H * 0.62);
      const r = rnd();
      if (r < 0.18) {
        sky.fillStyle(0xc8d8ff, 0.65); sky.fillRect(sx, sy, 2, 2);
      } else {
        sky.fillStyle(0xeeeeff, 0.30 + rnd() * 0.55); sky.fillRect(sx, sy, 1, 1);
      }
    }
    // Faint aurora streaks at the very top
    for (let i = 0; i < 6; i++) {
      sky.fillStyle(0x3a2858, 0.06);
      sky.fillRect(0, 10 + i * 12, W, 2);
    }

    // ── LAYER 2: FOREST SILHOUETTE ────────────────────────────────
    const forest = this.add.graphics().setDepth(-15);
    const drawTree = (x, baseY, h) => {
      forest.fillStyle(0x0a1208, 1);
      // pyramid-ish irregular pixel tree
      for (let yy = 0; yy < h; yy++) {
        const w = Math.max(2, Math.floor((1 - yy / h) * 14) + Math.floor(rnd() * 3));
        forest.fillRect(x - w, baseY - yy, w * 2, 1);
      }
      // moonlight tip
      forest.fillStyle(0x2a3828, 0.45);
      forest.fillRect(x - 1, baseY - h, 2, 2);
    };
    const treeBaseY = H * 0.68;
    for (let x = 0; x < 220; x += 10 + Math.floor(rnd() * 8)) {
      drawTree(x, treeBaseY + (rnd() * 12 - 6), 22 + Math.floor(rnd() * 30));
    }
    for (let x = W - 220; x < W + 10; x += 10 + Math.floor(rnd() * 8)) {
      drawTree(x, treeBaseY + (rnd() * 12 - 6), 22 + Math.floor(rnd() * 30));
    }

    // ── LAYER 3: GROUND + ROADS ───────────────────────────────────
    const ground = this.add.graphics().setDepth(-12);
    ground.fillStyle(0x1a2a10, 1);
    ground.fillRect(0, H * 0.62, W, H * 0.38);
    // earth dapples
    for (let i = 0; i < 220; i++) {
      const gx = Math.floor(rnd() * W);
      const gy = Math.floor(H * 0.62 + rnd() * H * 0.38);
      const tone = [0x223018, 0x2a3a18, 0x182610][Math.floor(rnd() * 3)];
      ground.fillStyle(tone, 0.7);
      ground.fillRect(gx, gy, 2 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 2));
    }
    // Five roads receding to a central crossroads point
    const cx = W / 2;
    const cy = H * 0.58;
    const drawRoad = (angleDeg, length) => {
      const a = angleDeg * Math.PI / 180;
      for (let s = 0; s < length; s += 1) {
        const t = s / length;
        const w = Math.round(2 + (1 - t) * 14); // narrows away from center
        const x = cx + Math.cos(a) * s;
        const y = cy + Math.sin(a) * s * 0.55; // isometric foreshorten
        // amber tint near center, fading to ochre-brown
        const glow = Math.max(0, 1 - s / 80);
        const base = 0x6b4020;
        ground.fillStyle(base, 0.85);
        ground.fillRect(x - w / 2, y, w, 2);
        if (glow > 0) {
          ground.fillStyle(0xc8922a, glow * 0.25);
          ground.fillRect(x - w / 2, y, w, 2);
        }
      }
    };
    drawRoad(-90, H * 0.5);   // up (perspective)
    drawRoad(90,  H * 0.42);  // down
    drawRoad(165, W * 0.45);  // SW
    drawRoad(15,  W * 0.45);  // SE
    drawRoad(195, W * 0.45);  // NW (back-up)
    drawRoad(-15, W * 0.45);  // NE

    // grass tufts
    for (let i = 0; i < 60; i++) {
      const gx = Math.floor(rnd() * W);
      const gy = Math.floor(H * 0.66 + rnd() * H * 0.32);
      ground.fillStyle(0x3a5a20, 0.6);
      ground.fillRect(gx, gy, 1, 2);
      ground.fillStyle(0x4a7028, 0.5);
      ground.fillRect(gx + 1, gy, 1, 1);
    }

    // ── LAYER 4: VILLAGE HOUSES ───────────────────────────────────
    const houses = this.add.graphics().setDepth(-10);
    const drawHouse = (hx, hy, scale, crooked = false) => {
      const w = Math.round(34 * scale);
      const h = Math.round(22 * scale);
      const skew = crooked ? 4 : 0;
      // wall
      houses.fillStyle(0x2a1c14, 1);
      houses.fillRect(hx, hy, w, h);
      // roof (triangle approximation)
      houses.fillStyle(0x14080a, 1);
      for (let i = 0; i < 12; i++) {
        houses.fillRect(hx - 3 + i, hy - 12 + i, w + 6 - i * 2, 1);
      }
      // crooked tilt
      if (crooked) {
        houses.fillStyle(0x14080a, 1);
        houses.fillRect(hx - skew, hy + h - 2, w + skew * 2, 2);
      }
      // window with warm amber glow
      const wx = hx + Math.round(w * 0.32);
      const wy = hy + Math.round(h * 0.4);
      houses.fillStyle(0xffc878, 1);
      houses.fillRect(wx, wy, 4, 4);
      houses.fillStyle(0xffe0a0, 0.85);
      houses.fillRect(wx + 1, wy + 1, 2, 2);
      // soft glow halo
      houses.fillStyle(0xffc878, 0.18);
      houses.fillRect(wx - 4, wy - 4, 12, 12);
      // second window
      houses.fillStyle(0xffc878, 1);
      houses.fillRect(hx + Math.round(w * 0.62), wy, 4, 4);
      return { wx: hx + w / 2, wy: hy - 12, scale };
    };
    // 5 houses around the edges
    const h1 = drawHouse(W * 0.10, H * 0.55, 1.0);
    const h2 = drawHouse(W * 0.20, H * 0.74, 1.1);
    const h3 = drawHouse(W * 0.78, H * 0.55, 1.0, true); // Baba's — crooked
    const h4 = drawHouse(W * 0.86, H * 0.74, 1.1);
    const h5 = drawHouse(W * 0.44, H * 0.80, 0.9);

    // chimney smoke anchors (will be animated)
    this._smokeSources = [
      { x: h2.wx, y: h2.wy, puffs: [] },
      { x: h3.wx, y: h3.wy, puffs: [] },
    ];
    this._smokeGfx = this.add.graphics().setDepth(-9);

    // ── LAYER 5: THE STRAW IDOL ───────────────────────────────────
    this._idolBaseX = cx;
    this._idolBaseY = cy + 4;
    const idol = this.add.graphics().setDepth(-7);
    this._idolGfx = idol;
    this._drawIdol(0);

    // amber glow halo (animated)
    this._idolGlow = this.add.graphics().setDepth(-8).setAlpha(0.85);
    this._drawIdolGlow(1);

    // candles at base
    idol.fillStyle(0xffc878, 1);
    idol.fillRect(cx - 8, cy + 22, 1, 2);
    idol.fillRect(cx + 7, cy + 22, 1, 2);
    idol.fillStyle(0xffe0a0, 0.6);
    idol.fillRect(cx - 8, cy + 21, 1, 1);
    idol.fillRect(cx + 7, cy + 21, 1, 1);

    // ── CROW on idol — still, watching ────────────────────────────
    const crow = this.add.graphics().setDepth(-6);
    const crowX = cx, crowY = cy - 28;
    crow.fillStyle(0x080808, 1);
    crow.fillRect(crowX - 3, crowY, 6, 4);     // body
    crow.fillRect(crowX - 1, crowY - 3, 3, 3); // head
    crow.fillRect(crowX + 2, crowY - 2, 2, 1); // beak
    crow.fillStyle(0xffaa44, 1);
    crow.fillRect(crowX + 2, crowY - 3, 1, 1); // eye

    // ── LAYER 6: ATMOSPHERE ───────────────────────────────────────
    // Vignette
    const vignette = this.add.graphics().setDepth(900);
    for (let i = 0; i < 5; i++) {
      vignette.lineStyle(40 - i * 6, 0x000000, 0.18);
      vignette.strokeRect(i * 6, i * 6, W - i * 12, H - i * 12);
    }
    // Ground mist
    const mist = this.add.graphics().setDepth(-5);
    mist.fillStyle(0xa090b0, 0.10);
    mist.fillRect(0, H * 0.66, W, 8);
    mist.fillStyle(0xa090b0, 0.06);
    mist.fillRect(0, H * 0.70, W, 12);

    // Fireflies
    this._flies = [];
    this._flyGfx = this.add.graphics().setDepth(-4);
    for (let i = 0; i < 10; i++) {
      this._flies.push({
        x: rnd() * W, y: H * 0.4 + rnd() * H * 0.5,
        vx: (rnd() - 0.5) * 0.15, vy: (rnd() - 0.5) * 0.10,
        phase: rnd() * Math.PI * 2,
      });
    }

    // ── TITLE — WYRDÓW ────────────────────────────────────────────
    // Phaser Text has no letter-spacing API, so we space the glyphs manually.
    const titleY = H * 0.18;
    this.titleText = this.add.text(W / 2, titleY, 'W Y R D Ó W', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '88px', fontStyle: 'normal',
      color: '#c8922a',
      stroke: '#1a0e08', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(950);
    this.titleText.setResolution(window.devicePixelRatio || 1);
    // soft drop shadow text
    this.titleShadow = this.add.text(W / 2 + 2, titleY + 2, 'W Y R D Ó W', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '88px', color: '#1a0e08',
    }).setOrigin(0.5).setAlpha(0).setDepth(949);
    this.titleShadow.setResolution(window.devicePixelRatio || 1);

    // Decorative diamond rule
    this.titleRule = this.add.graphics().setDepth(950).setAlpha(0);
    const ruleY = titleY + 56;
    const ruleHalf = 180;
    this.titleRule.lineStyle(1, 0xc8922a, 0.6);
    this.titleRule.beginPath();
    this.titleRule.moveTo(W / 2 - ruleHalf, ruleY);
    this.titleRule.lineTo(W / 2 + ruleHalf, ruleY);
    this.titleRule.strokePath();
    for (let i = -3; i <= 3; i++) {
      const dx = W / 2 + i * 30;
      this.titleRule.fillStyle(0xc8922a, 0.6);
      this.titleRule.fillTriangle(dx, ruleY - 4, dx + 4, ruleY, dx, ruleY + 4);
      this.titleRule.fillTriangle(dx, ruleY - 4, dx - 4, ruleY, dx, ruleY + 4);
    }

    // Fade in title
    this.tweens.add({ targets: [this.titleText, this.titleShadow, this.titleRule],
      alpha: 1, duration: 2000, ease: 'Sine.easeOut' });

    // ── MENU OPTIONS ──────────────────────────────────────────────
    const menuStartY = H * 0.62;
    const menuSpacing = 44;
    const labels = ['New Game', 'Continue', 'Settings', 'Credits'];
    this.menuItems = [];
    // Decorative rule above the menu
    const menuRule = this.add.graphics().setDepth(950).setAlpha(0);
    const mrY = menuStartY - 28;
    menuRule.lineStyle(1, 0xc8922a, 0.35);
    menuRule.beginPath();
    menuRule.moveTo(W / 2 - 120, mrY);
    menuRule.lineTo(W / 2 + 120, mrY);
    menuRule.strokePath();
    this.tweens.add({ targets: menuRule, alpha: 1, duration: 1500, delay: 1500 });

    labels.forEach((label, i) => {
      const y = menuStartY + i * menuSpacing;
      const isContinue = (label === 'Continue');
      const greyed = isContinue && !gameState.hasSave;
      const baseColor = greyed ? '#6b5a40' : '#e8dfc0';
      const t = this.add.text(W / 2, y, label, {
        fontFamily: 'Georgia, serif', fontSize: '28px',
        color: baseColor, stroke: '#1a0e08', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(951).setAlpha(0).setInteractive({ useHandCursor: !greyed });
      t.setResolution(window.devicePixelRatio || 1);

      // Diamond marker (hidden until selected)
      const marker = this.add.text(W / 2 - 110, y, '◆', {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#c8922a',
      }).setOrigin(0.5).setDepth(951).setAlpha(0);
      marker.setResolution(window.devicePixelRatio || 1);

      const item = { label, text: t, marker, y, greyed };
      this.menuItems.push(item);

      // sequential fade-in: bottom-up — Credits first, New Game last
      const order = (labels.length - 1 - i); // Credits=0, Settings=1, Continue=2, NewGame=3
      const delay = 2200 + order * 300;
      this.tweens.add({ targets: t, alpha: 1, duration: 500, delay });

      t.on('pointerover', () => { if (!item.greyed) this._setSelection(i); });
      t.on('pointerdown', () => { if (!item.greyed) this._activate(i); });
    });

    // Initial selection: New Game (index 0)
    this._selection = 0;
    this._setSelection(0);

    // Keyboard nav
    this.input.keyboard.on('keydown-UP', () => this._move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this._move(+1));
    this.input.keyboard.on('keydown-ENTER', () => this._activate(this._selection));
    this.input.keyboard.on('keydown-E', () => this._activate(this._selection));

    // ── AUDIO ─────────────────────────────────────────────────────
    // Both tracks loop on the menu — theme_awakening loops here only.
    music.startAmbient(); // ambient at its natural target (we set 0.55 below)
    music._ambientNaturalTarget = 0.55;
    music._recomputeAmbient(2000);
    // Force theme_awakening to loop on menu
    music._gated(() => {
      const s = music.sounds.theme_awakening;
      if (s) {
        s.loop = true;
        if (s._desiredBase == null) s._desiredBase = 0;
        if (!s.isPlaying) { try { s.setVolume(0); s.play(); } catch (e) {} }
        music._tweenTo('theme_awakening', 0.40, 2000);
      }
    });

    // "No save" message slot
    this.noSaveMsg = this.add.text(W / 2, menuStartY + 4 * menuSpacing + 16, '', {
      fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic',
      color: '#e8dfc0',
    }).setOrigin(0.5).setDepth(951).setAlpha(0);
    this.noSaveMsg.setResolution(window.devicePixelRatio || 1);

    this._t0 = 0;
  }

  _drawIdol(pulseT) {
    const g = this._idolGfx; const cx = this._idolBaseX; const cy = this._idolBaseY;
    g.clear();
    // candles redrawn after
    // Iron base
    g.fillStyle(0x1a1410, 1); g.fillRect(cx - 6, cy + 18, 12, 4);
    // Straw body
    g.fillStyle(0x6b5230, 1); g.fillRect(cx - 5, cy - 18, 10, 36);
    g.fillStyle(0x8a6a3a, 0.9); g.fillRect(cx - 4, cy - 16, 8, 32);
    // bound rings
    g.fillStyle(0x3a2614, 1);
    g.fillRect(cx - 6, cy - 6, 12, 1);
    g.fillRect(cx - 6, cy + 6, 12, 1);
    // Head
    g.fillStyle(0x4a3820, 1); g.fillRect(cx - 5, cy - 26, 10, 8);
    // EYES — always open on title screen
    g.fillStyle(0xffc878, 1); g.fillRect(cx - 3, cy - 23, 1, 2);
    g.fillRect(cx + 2, cy - 23, 1, 2);
    g.fillStyle(0xffe0a0, 0.9);
    g.fillRect(cx - 3, cy - 23, 1, 1);
    g.fillRect(cx + 2, cy - 23, 1, 1);
    // outstretched arms
    g.fillStyle(0x6b5230, 1);
    g.fillRect(cx - 12, cy - 8, 7, 2);
    g.fillRect(cx + 5, cy - 8, 7, 2);
  }

  _drawIdolGlow(intensity) {
    const g = this._idolGlow; const cx = this._idolBaseX; const cy = this._idolBaseY;
    g.clear();
    for (let r = 80; r > 0; r -= 8) {
      const a = (1 - r / 80) * 0.10 * intensity;
      g.fillStyle(0xffc878, a);
      g.fillEllipse(cx, cy + 8, r * 1.6, r * 0.7);
    }
  }

  _setSelection(i) {
    this._selection = i;
    this.menuItems.forEach((it, idx) => {
      const sel = (idx === i);
      const greyed = it.greyed;
      const color = greyed ? '#6b5a40' : (sel ? '#c8922a' : '#e8dfc0');
      it.text.setColor(color);
      it.text.setScale(sel && !greyed ? 1.05 : 1.0);
      it.marker.setAlpha(sel && !greyed ? 1 : 0);
      it.marker.setPosition(this._W / 2 - it.text.displayWidth / 2 - 22, it.y);
    });
  }

  _move(dir) {
    if (this._settingsOpen || this._creditsOpen || this._activating) return;
    let i = this._selection;
    for (let n = 0; n < this.menuItems.length; n++) {
      i = (i + dir + this.menuItems.length) % this.menuItems.length;
      if (!this.menuItems[i].greyed) break;
    }
    this._setSelection(i);
  }

  _activate(i) {
    if (this._activating) return;
    // E/Enter used to start a New Game underneath an open Settings or
    // Credits overlay, wiping state while the panel stayed on screen
    if (this._settingsOpen || this._creditsOpen) return;
    const item = this.menuItems[i];
    if (!item || item.greyed) {
      if (item && item.label === 'Continue') this._showNoSaveMessage();
      return;
    }
    switch (item.label) {
      case 'New Game':  this._startNewGame(); break;
      case 'Continue':  this._continueGame(); break;
      case 'Settings':  this._openSettings(); break;
      case 'Credits':   this._openCredits();  break;
    }
  }

  _showNoSaveMessage() {
    this.noSaveMsg.setText('No save found.');
    this.noSaveMsg.setAlpha(0);
    this.tweens.add({ targets: this.noSaveMsg, alpha: 1, duration: 400 });
    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: this.noSaveMsg, alpha: 0, duration: 600 });
    });
  }

  _fadeAudioOut(ms = 3000) {
    music._gated(() => {
      music._tweenTo('wyrdow_ambient', 0, ms);
      music._tweenTo('theme_awakening', 0, ms);
    });
  }

  _startNewGame() {
    this._activating = true;
    this._fadeAudioOut(1500);
    // Remove the existing save so a fresh run starts clean
    // (settings remain — they live under a different key)
    try { localStorage.removeItem(SAVE_KEY); gameState.hasSave = false; } catch (e) {}
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Reset ALL runtime state — a partial reset leaked NPC sub-states,
      // item flags, and MARKERS.placed from the previous run
      gameState.act = 1;
      gameState.knotsPlaced = 0; gameState.markersFound = [];
      gameState.questActive = false; gameState.questComplete = false;
      gameState.codexFragmentCollected = false;
      gameState.babaMetOnce = false; gameState.knotsGiven = false;
      gameState.zuzkaMetOnce = false; gameState.firstVillageEntry = false;
      gameState.zuzkaSecondTalk = false; gameState.zuzkaFarewellDone = false;
      gameState.hasFirefly = false; gameState.hasGlassCharm = false;
      gameState.hasBurntBraid = false;
      gameState.inventory = [];
      gameState.worldItemsTaken = [];
      gameState.memoryFragments = [];
      gameState.perimeterHits = [];
      gameState.domovoiSequence = [];
      gameState.observedZones = [];
      gameState.journal = { entries: [], unread: [], selectedEntry: null };
      gameState.ritualState = {
        perimeter_walked: false,
        domovoi_offering_correct: false,
        domovoi_offering_attempted: false,
        noon_silence_kept: false,
        nocnica_found: false,
        wisp_choice: null,
      };
      gameState.ezraState = { sceneShown: null, copperWireGiven: false, codexShown: false };
      gameState.domovoiState = { sceneShown: null, sceneShownAct2: false, signpostFragmentFound: false };
      gameState.dziadekState = { revealed: false, sceneShown: 0, pageGiven: false };
      gameState.martaState = { martaScene: 0, ibburScene: 0, lastSeenAs: null, handoverShown: false };
      gameState.regencyAttention = 0;
      gameState.regencyFired = {};
      gameState.brelSceneFired = false;
      gameState.act1Complete = false;
      gameState.brelMode = 'neutral'; gameState.brelArrivalDelay = 0;
      gameState._noonBellRung = false;
      gameState.currentTown = 'wyrdow';
      gameState.miedznoState = { met: {}, knocksAnswered: [], strokes: { flame: false, breath: false, bread: false } };
      gameState.gameHour = 8.0;
      // MARKERS is a module const — its placed flags survive Return to
      // Menu and made replayed quests unwinnable until page refresh
      try { MARKERS.forEach(m => { m.placed = false; }); } catch (e) {}
      this._showTutorialCard(() => this.scene.start('OpeningScene'));
    });
  }

  // ── Traveller's Guide tutorial card ────────────────────────────
  _showTutorialCard(onDone) {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    // Restore camera from the black fade-out
    cam.fadeIn(600, 0, 0, 0);

    const PANEL_W = 620, PANEL_H = 560;
    const px = Math.round((W - PANEL_W) / 2);
    const py = Math.round((H - PANEL_H) / 2);
    const cx = Math.round(W / 2);

    const container = this.add.container(0, 0);
    container.setAlpha(0);
    container.setDepth(10000);

    // Dim backdrop
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.75);
    dim.fillRect(0, 0, W, H);
    container.add(dim);

    // Parchment panel — same aesthetic as dialogue boxes
    const panel = this.add.graphics();
    // Outer shadow
    panel.fillStyle(0x000000, 0.55);
    panel.fillRoundedRect(px + 4, py + 5, PANEL_W, PANEL_H, 10);
    // Dark backing
    panel.fillStyle(0x1a0e08, 0.96);
    panel.fillRoundedRect(px, py, PANEL_W, PANEL_H, 10);
    // Parchment body
    panel.fillStyle(0x2a1b10, 0.98);
    panel.fillRoundedRect(px + 4, py + 4, PANEL_W - 8, PANEL_H - 8, 8);
    // Inner border
    panel.lineStyle(2, 0x8a6a3a, 0.9);
    panel.strokeRoundedRect(px + 8, py + 8, PANEL_W - 16, PANEL_H - 16, 6);
    panel.lineStyle(1, 0x5a4020, 0.6);
    panel.strokeRoundedRect(px + 12, py + 12, PANEL_W - 24, PANEL_H - 24, 4);
    container.add(panel);

    // Folk-art diamond rule helper
    const drawDiamondRule = (y) => {
      const g = this.add.graphics();
      const ruleW = PANEL_W - 120;
      const left = cx - ruleW / 2;
      const right = cx + ruleW / 2;
      g.lineStyle(1, 0x8a6a3a, 0.75);
      g.beginPath(); g.moveTo(left, y); g.lineTo(cx - 10, y); g.strokePath();
      g.beginPath(); g.moveTo(cx + 10, y); g.lineTo(right, y); g.strokePath();
      g.fillStyle(0xc8922a, 1);
      g.fillTriangle(cx, y - 5, cx + 5, y, cx, y + 5);
      g.fillTriangle(cx, y - 5, cx - 5, y, cx, y + 5);
      container.add(g);
    };

    // Title
    const title = this.add.text(cx, py + 40, 'A  G U I D E   F O R   T H E   T R A V E L L E R', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#c8922a',
      fontStyle: 'normal', letterSpacing: 2,
    }).setOrigin(0.5, 0.5);
    title.setResolution(window.devicePixelRatio || 1);
    container.add(title);

    drawDiamondRule(py + 68);

    // Controls — monospace key labels, serif descriptions
    const controls = [
      ['Arrows · WASD', 'Move your character'],
      ['E',          'Talk · Interact · Advance dialogue'],
      ['1  2  3',    'Choose a dialogue response'],
      ['O  (hold)',  'Observe your surroundings carefully'],
      ['ESC',        'Pause · Return to menu'],
      ['Shift (hold)', 'Walk briskly'],
      ['Q',          'Quiet Step — slow, silent, keen-eyed'],
      ['J',          'Open the Memory Journal'],
      ['M',          'Mute music'],
    ];
    const ctrlY = py + 92;
    const keyX = px + 70;
    const descX = px + 230;
    controls.forEach((row, i) => {
      const y = ctrlY + i * 26;
      const k = this.add.text(keyX, y, row[0], {
        fontFamily: 'Menlo, Monaco, Courier New, monospace',
        fontSize: '13px', color: '#e8d4a8',
      }).setOrigin(0, 0.5);
      k.setResolution(window.devicePixelRatio || 1);
      container.add(k);
      const d = this.add.text(descX, y, row[1], {
        fontFamily: 'Georgia, serif', fontSize: '14px', color: '#ddccaa',
      }).setOrigin(0, 0.5);
      d.setResolution(window.devicePixelRatio || 1);
      container.add(d);
    });

    drawDiamondRule(ctrlY + controls.length * 26 + 10);

    // Tips — italic, smaller
    const tips = [
      'The game saves automatically.',
      'Pay attention to the time of day.',
      'The old folk customs are not decoration.',
      'Standing still is sometimes the right move.',
    ];
    const tipsY = ctrlY + controls.length * 26 + 32;
    tips.forEach((line, i) => {
      const t = this.add.text(cx, tipsY + i * 22, line, {
        fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic',
        color: '#c8b898',
      }).setOrigin(0.5, 0.5);
      t.setResolution(window.devicePixelRatio || 1);
      container.add(t);
    });

    drawDiamondRule(tipsY + tips.length * 22 + 10);

    // Bottom line — poetic italic
    const bottom = this.add.text(cx, tipsY + tips.length * 22 + 32,
      '"The roads remember. So should you."', {
        fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic',
        color: '#c8922a',
    }).setOrigin(0.5, 0.5);
    bottom.setResolution(window.devicePixelRatio || 1);
    container.add(bottom);

    // Dismiss prompt
    const prompt = this.add.text(cx, py + PANEL_H - 28,
      '[E] or [Space] to begin', {
        fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic',
        color: '#a89878',
    }).setOrigin(0.5, 0.5);
    prompt.setResolution(window.devicePixelRatio || 1);
    container.add(prompt);

    // Fade in over 1s
    this.tweens.add({ targets: container, alpha: 1, duration: 1000, ease: 'Sine.easeOut' });

    // Gentle pulse on the prompt
    this.tweens.add({
      targets: prompt, alpha: 0.55, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Dismiss handler
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.input.keyboard.off('keydown-E', dismiss);
      this.input.keyboard.off('keydown-SPACE', dismiss);
      this.tweens.add({
        targets: container, alpha: 0, duration: 1000, ease: 'Sine.easeIn',
        onComplete: () => {
          container.destroy();
          if (onDone) onDone();
        },
      });
    };
    this.input.keyboard.on('keydown-E', dismiss);
    this.input.keyboard.on('keydown-SPACE', dismiss);
  }

  _continueGame() {
    this._activating = true;
    this._fadeAudioOut(1500);
    loadGame();
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { firstVisit: false });
    });
  }

  // ── SETTINGS OVERLAY ──────────────────────────────────────────
  _openSettings() {
    if (this._settingsOpen) return;
    this._settingsOpen = true;
    const W = this._W, H = this._H;
    const layer = this.add.container(0, 0).setDepth(2000);
    // dim
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0);
    layer.add(dim);
    // parchment panel
    const pw = 460, ph = 408;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1410, 0.96); panel.fillRoundedRect(px, py, pw, ph, 6);
    panel.lineStyle(1, 0xc8922a, 0.6); panel.strokeRoundedRect(px, py, pw, ph, 6);
    layer.add(panel);
    const title = this.add.text(W / 2, py + 28, 'Settings', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#c8922a',
    }).setOrigin(0.5);
    layer.add(title);

    const sliders = [
      { label: 'Music',   key: 'musicVolume',
        apply: (v) => { gameState.musicVolume = v; music._applyMaster(); } },
      { label: 'Ambient', key: 'ambientVolume',
        apply: (v) => { gameState.ambientVolume = v;
                        music._ambientNaturalTarget = v;
                        music._recomputeAmbient(200); } },
      { label: 'SFX',     key: 'sfxVolume',
        apply: (v) => { gameState.sfxVolume = v; try { sfx.applyMaster(); } catch (e) {} } },
    ];
    sliders.forEach((sl, idx) => {
      const sy = py + 80 + idx * 56;
      const lbl = this.add.text(px + 30, sy, sl.label, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e8dfc0',
      });
      layer.add(lbl);
      // slider track
      const tx = px + 130, ty = sy + 12, tw = 280;
      const track = this.add.graphics();
      track.fillStyle(0x3a2a18, 1); track.fillRect(tx, ty, tw, 4);
      layer.add(track);
      // knob
      const knob = this.add.circle(tx + tw * gameState[sl.key], ty + 2, 8, 0xc8922a)
        .setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(knob);
      layer.add(knob);
      knob.on('drag', (_p, dx) => {
        const nx = Phaser.Math.Clamp(dx, tx, tx + tw);
        knob.x = nx;
        const v = (nx - tx) / tw;
        sl.apply(v);
        saveSettings();
      });
    });

    // Text options — instant text + text size toggles
    const textToggles = [
      { label: 'Instant text',
        get: () => (gameState.instantText ? 'On' : 'Off'),
        cycle: () => { gameState.instantText = !gameState.instantText; } },
      { label: 'Text size',
        get: () => ((gameState.textScale || 1) > 1 ? 'Large' : 'Normal'),
        cycle: () => { gameState.textScale = (gameState.textScale || 1) > 1 ? 1 : 1.2; } },
    ];
    textToggles.forEach((tgl, tIdx) => {
      const tRowY = py + 248 + tIdx * 36;
      const tLbl = this.add.text(px + 30, tRowY, tgl.label, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e8dfc0',
      });
      layer.add(tLbl);
      const tBtn = this.add.text(px + pw - 130, tRowY, '[ ' + tgl.get() + ' ]', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c8922a',
      }).setInteractive({ useHandCursor: true });
      tBtn.on('pointerdown', () => {
        tgl.cycle();
        tBtn.setText('[ ' + tgl.get() + ' ]');
        saveSettings();
      });
      layer.add(tBtn);
    });

    // Fullscreen toggle
    const fsY = py + ph - 80;
    const fsLabel = this.add.text(px + 30, fsY, 'Fullscreen', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e8dfc0',
    });
    layer.add(fsLabel);
    const fsBtn = this.add.text(px + pw - 100, fsY, '[ Toggle ]', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c8922a',
    }).setInteractive({ useHandCursor: true });
    fsBtn.on('pointerdown', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    layer.add(fsBtn);

    // Close
    const close = this.add.text(W / 2, py + ph - 28, '[ Close ]', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c8922a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    layer.add(close);
    const doClose = () => {
      layer.destroy(); this._settingsOpen = false;
      this.input.keyboard.off('keydown-ESC', doClose);
    };
    close.on('pointerdown', doClose);
    this.input.keyboard.on('keydown-ESC', doClose);
  }

  // ── CREDITS OVERLAY ───────────────────────────────────────────
  _openCredits() {
    if (this._creditsOpen) return;
    this._creditsOpen = true;
    const W = this._W, H = this._H;
    const layer = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0);
    layer.add(dim);
    const pw = 520, ph = 480;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1410, 0.96); panel.fillRoundedRect(px, py, pw, ph, 6);
    panel.lineStyle(1, 0xc8922a, 0.6); panel.strokeRoundedRect(px, py, pw, ph, 6);
    layer.add(panel);
    const lines = [
      { t: 'WYRDÓW', size: 28, color: '#c8922a', gap: 30 },
      { t: '', size: 6 },
      { t: 'Game Design & Story', size: 14, color: '#a89878' },
      { t: '[Your name here]', size: 16, color: '#e8dfc0', gap: 22 },
      { t: '', size: 6 },
      { t: 'Built with Claude Code', size: 14, color: '#a89878' },
      { t: 'Anthropic', size: 16, color: '#e8dfc0', gap: 22 },
      { t: '', size: 6 },
      { t: 'Music generated with Suno', size: 14, color: '#a89878' },
      { t: '', size: 18 },
      { t: 'A world of Slavic and Chasidic folklore',
        size: 13, color: '#c8b878', italic: true },
      { t: 'reimagined after the Collapse.', size: 13, color: '#c8b878', italic: true },
    ];
    let y = py + 40;
    for (const ln of lines) {
      if (ln.t) {
        const txt = this.add.text(W / 2, y, ln.t, {
          fontFamily: 'Georgia, serif', fontSize: ln.size + 'px',
          fontStyle: ln.italic ? 'italic' : 'normal',
          color: ln.color || '#e8dfc0',
        }).setOrigin(0.5);
        layer.add(txt);
      }
      y += (ln.size || 14) + (ln.gap != null ? ln.gap - ln.size : 8);
    }
    const close = this.add.text(W / 2, py + ph - 28, '[ Close — Esc ]', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#c8922a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    layer.add(close);
    const doClose = () => {
      layer.destroy(); this._creditsOpen = false;
      this.input.keyboard.off('keydown-ESC', doClose);
    };
    close.on('pointerdown', doClose);
    this.input.keyboard.on('keydown-ESC', doClose);
  }

  update(time, delta) {
    this._t0 += delta;
    // Idol pulse — 3s cycle, 85% to 100%
    const pulse = 0.925 + 0.075 * Math.sin(this._t0 / 1500 * Math.PI);
    this._drawIdolGlow(pulse);

    // Fireflies
    if (this._flyGfx && this._flies) {
      const g = this._flyGfx; g.clear();
      for (const f of this._flies) {
        f.x += f.vx; f.y += f.vy;
        f.phase += 0.02;
        if (f.x < 0) f.x = this._W; if (f.x > this._W) f.x = 0;
        if (f.y < this._H * 0.35) f.y = this._H * 0.85;
        if (f.y > this._H * 0.92) f.y = this._H * 0.4;
        const a = 0.4 + 0.5 * (Math.sin(f.phase) * 0.5 + 0.5);
        g.fillStyle(0xffc878, a);
        g.fillRect(f.x - 1, f.y - 1, 3, 3);
        g.fillStyle(0xffe0a0, a * 0.6);
        g.fillRect(f.x, f.y, 1, 1);
      }
    }

    // Chimney smoke
    if (this._smokeGfx && this._smokeSources) {
      const g = this._smokeGfx; g.clear();
      for (const src of this._smokeSources) {
        if (Math.random() < 0.04) {
          src.puffs.push({ x: src.x + (Math.random() - 0.5) * 2, y: src.y, life: 0 });
        }
        for (let i = src.puffs.length - 1; i >= 0; i--) {
          const p = src.puffs[i];
          p.life += delta * 0.001;
          p.y -= 0.3;
          p.x += Math.sin(p.life * 2) * 0.15;
          const a = Math.max(0, 0.35 - p.life * 0.12);
          if (a <= 0) { src.puffs.splice(i, 1); continue; }
          g.fillStyle(0x9080a0, a);
          g.fillRect(p.x - 1, p.y - 1, 2 + Math.floor(p.life), 2);
        }
      }
    }
  }
}

