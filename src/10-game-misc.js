
// ═══ 10 GAME MISC — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  makeFilmGrainTexture(key, size) {
    const g = this.make.graphics({ add: false });
    // Neutral grey base so additive grain reads both up and down.
    g.fillStyle(0x808080, 1);
    g.fillRect(0, 0, size, size);
    // Random speckles — black and white pixels at varying density.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = Math.random();
        if (r < 0.18) {
          g.fillStyle(0x000000, Math.random() * 0.7 + 0.3);
          g.fillRect(x, y, 1, 1);
        } else if (r > 0.82) {
          g.fillStyle(0xffffff, Math.random() * 0.7 + 0.3);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    g.generateTexture(key, size, size);
    g.destroy();
  },
  // Helper — fill the iso diamond with the given colour.
  _fillIsoDiamond(g, color, alpha) {
    const w = TILE_W, h = TILE_H;
    g.fillStyle(color, alpha == null ? 1 : alpha);
    g.beginPath();
    g.moveTo(w/2, 0); g.lineTo(w, h/2); g.lineTo(w/2, h); g.lineTo(0, h/2);
    g.closePath(); g.fillPath();
  },
  // Test whether a point lies inside the iso diamond (so blotches don't
  // bleed past tile edges).
  _insideDiamond(x, y) {
    const w = TILE_W, h = TILE_H;
    return Math.abs(x - w/2) / (w/2) + Math.abs(y - h/2) / (h/2) <= 0.95;
  },
  showAwakeningVoice(text) {
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height / 2, text, {
      fontFamily: 'Georgia, serif', fontSize: '20px',
      color: '#e8d8a8', stroke: '#0a0a10', strokeThickness: 2,
      fontStyle: 'italic', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: { from: 0, to: 1 }, duration: 800,
      hold: 2400, yoyo: true, onComplete: () => t.destroy(),
    });
  },
  // ── ABANDONED INN DETAILS ────────────────────────────────────────
  // The Elder house at (6,9) becomes the Domovoi's inn. We overlay
  // decrepit details on top of the base house sprite: boarded window
  // with one fresh plank, a door nailed shut with two crossed planks,
  // a small ceramic offering bowl on the doorstep, and a timer-driven
  // smoke puff emitter above the chimney.
  drawAbandonedInnDetails() {
    // Doorstep position matches _domovoiZone (7, 9)
    const doorIso = cartToIso(7, 9);
    const dx = doorIso.x + this.worldOffset.x;
    const dy = doorIso.y + this.worldOffset.y;

    const g = this.add.graphics();
    // Depth-sorted with the world so players standing at the doorstep
    // render in front of the planks (a fixed depth painted over them)
    g._sortY = dy - 4;
    this.objectLayer.add(g);
    // Darker wash over the Elder house footprint — two tiles (7,9) and (6,9)
    // just lightly dims the near side.
    // ── Nailed-shut door: two crossed planks ─────────────
    const doorX = dx;
    const doorY = dy - 22;
    g.lineStyle(3, 0x3a2414, 1);
    g.beginPath();
    g.moveTo(doorX - 7, doorY - 10);
    g.lineTo(doorX + 7, doorY + 10);
    g.strokePath();
    g.beginPath();
    g.moveTo(doorX - 7, doorY + 10);
    g.lineTo(doorX + 7, doorY - 10);
    g.strokePath();
    // Rusty nails at plank ends
    g.fillStyle(0x6a3a1a, 1);
    g.fillRect(doorX - 8, doorY - 11, 2, 2);
    g.fillRect(doorX + 6, doorY + 9, 2, 2);
    g.fillRect(doorX - 8, doorY + 9, 2, 2);
    g.fillRect(doorX + 6, doorY - 11, 2, 2);

    // ── Boarded window — one board lighter (recently replaced) ──
    const winX = doorX - 18;
    const winY = doorY - 6;
    g.fillStyle(0x2a1810, 1);
    g.fillRect(winX, winY, 10, 10);
    g.fillStyle(0x4a2e18, 1);
    g.fillRect(winX, winY + 1, 10, 2);     // top board
    g.fillRect(winX, winY + 5, 10, 2);     // middle board
    g.fillStyle(0x6a4a28, 1);              // ← fresher board
    g.fillRect(winX, winY + 9, 10, 2);

    // ── Offering bowl on the doorstep ───────────────────
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(doorX, doorY + 16, 10, 3);
    g.fillStyle(0x8a6a4a, 1);
    g.fillEllipse(doorX, doorY + 14, 9, 4);
    g.fillStyle(0x5a3a24, 1);
    g.fillEllipse(doorX, doorY + 13, 7, 2);

    this._innDetailsGfx = g;

    // ── Chimney smoke: slow irregular dark puffs ───────
    // Chimney is roughly above the Elder house roof peak.
    this._innSmoke = [];
    this._innSmokeGfx = this.add.graphics().setDepth(700);
    this._innSmokeNextPuff = 0;
    // Anchor chimney position approx — above the door, offset up & left.
    this._innChimneyX = doorX - 6;
    this._innChimneyY = doorY - 60;
  },
  // ── CHIMNEY SMOKE ─────────────────────────────────────────────────
  updateSmoke() {
    this.smokeEmitters.forEach(em => {
      // Spawn new particle
      if (Math.random() < 0.6) {
        em.particles.push({
          x: em.x + (Math.random()-0.5) * 3,
          y: em.y,
          vx: (Math.random()-0.5) * 0.3 + 0.2, // slight rightward drift (wind)
          vy: -0.4 - Math.random() * 0.3,
          life: 1.0,
          size: 2 + Math.random() * 2,
        });
      }
      // Update existing
      em.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
        p.size += 0.1;
        p.vx += (Math.random()-0.5) * 0.05;
      });
      em.particles = em.particles.filter(p => p.life > 0);
    });

    // Redraw all smoke
    if (!this.smokeGfx) {
      this.smokeGfx = this.add.graphics();
      this.smokeGfx.setDepth(997);
    }
    this.smokeGfx.clear();
    this.smokeEmitters.forEach(em => {
      em.particles.forEach(p => {
        const alpha = p.life * 0.25;
        this.smokeGfx.fillStyle(PAL.smoke, alpha);
        this.smokeGfx.fillCircle(p.x, p.y, p.size);
      });
    });
  },
  // Trigger a shimmer ripple at a world position (called when placing a thread knot)
  spawnShimmerRipple(cartX, cartY) {
    const iso = cartToIso(cartX, cartY);
    this.shimmerRipples.push({
      x: iso.x + this.worldOffset.x,
      y: iso.y + this.worldOffset.y,
      radius: 5,
      life: 1.0,
    });
  },
  // ── PLAYER REACTION ANIMATIONS ──────────────────────────────────
  // Slow 4-frame look-around: left → forward → right → forward.
  startIdleLookAround() {
    if (this.idleAnimActive) return;
    this.idleAnimActive = true;
    const frames = [-2, 0, 2, 0];
    let i = 0;
    const step = () => {
      if (!this.idleAnimActive) return;
      this.idleHeadOffset = frames[i];
      i++;
      if (i >= frames.length) {
        this.idleAnimActive = false;
        this.idleHeadOffset = 0;
        return;
      }
      setTimeout(step, 1000);
    };
    step();
  },
  // Update mark glow proximity boost based on distance to idol/markers.
  updateMarkProximity() {
    if (!this.player) return;
    let near = 0;
    // Distance to idol (CENTER, CENTER+0.5)
    const dx = this.playerCartX - (CENTER - 0.5);
    const dy = this.playerCartY - (CENTER + 0.5);
    const dIdol = Math.sqrt(dx * dx + dy * dy);
    if (dIdol < 4) near = Math.max(near, 1 - dIdol / 4);
    // Distance to any unplaced marker
    if (this.markers) {
      for (const m of this.markers) {
        if (m.placed) continue;
        const mdx = this.playerCartX - m.cartX;
        const mdy = this.playerCartY - m.cartY;
        const d = Math.sqrt(mdx * mdx + mdy * mdy);
        if (d < 3) near = Math.max(near, 1 - d / 3);
      }
    }
    this._markProximityBoost = near;
  },
  // ── KNOT TYING ANIMATION (1.5s, 4 frames) ─────────────────────────
  playKnotTyingAnimation(markerIdx, onComplete) {
    const m = MARKERS[markerIdx];
    const iso = cartToIso(m.x, m.y);
    const px = iso.x + this.worldOffset.x;
    const py = iso.y + this.worldOffset.y;
    const g = this.add.graphics();
    g.setDepth(996);
    let frame = 0;
    const frameMs = 375; // 4 × 375ms = 1500ms
    const draw = () => {
      g.clear();
      // Bright blue intensification under the knot
      g.fillStyle(0x88aaff, 0.45);
      g.fillCircle(px, py - 1, 16);
      g.fillStyle(0xa8c0ff, 0.55);
      g.fillCircle(px, py - 1, 9);
      // 4 frames of thread wrapping
      g.lineStyle(1.4, 0x6e88c8, 1);
      if (frame === 0) {
        // Frame 1 — single loose thread strand
        g.beginPath(); g.moveTo(px - 6, py - 4); g.lineTo(px + 6, py - 1); g.strokePath();
      } else if (frame === 1) {
        // Frame 2 — first wrap
        g.strokeCircle(px, py - 2, 4);
        g.beginPath(); g.moveTo(px + 4, py - 2); g.lineTo(px + 8, py + 1); g.strokePath();
      } else if (frame === 2) {
        // Frame 3 — second wrap, knot forming
        g.strokeCircle(px, py - 2, 4);
        g.strokeCircle(px, py - 2, 5.5);
        g.fillStyle(0x4466aa, 1);
        g.fillCircle(px, py - 2, 2);
      } else {
        // Frame 4 — knot tied tight
        g.fillStyle(0x4466aa, 1);
        g.fillCircle(px, py - 2, 3);
        g.lineStyle(1, 0x88aaff, 0.9);
        g.beginPath(); g.moveTo(px - 3, py - 2); g.lineTo(px, py - 6); g.lineTo(px + 3, py - 2); g.strokePath();
        // Tail strands
        g.lineStyle(1, 0x6e88c8, 0.95);
        g.beginPath(); g.moveTo(px - 2, py + 1); g.lineTo(px - 5, py + 4); g.strokePath();
        g.beginPath(); g.moveTo(px + 2, py + 1); g.lineTo(px + 5, py + 4); g.strokePath();
      }
    };
    draw();
    const interval = setInterval(() => {
      frame++;
      if (frame >= 4) {
        clearInterval(interval);
        setTimeout(() => {
          g.destroy();
          if (onComplete) onComplete();
        }, 100);
      } else {
        draw();
      }
    }, frameMs);
  },
  _zuzkaStartFirstEncounter() {
    this.openDialogue('Zuzka', ZUZKA_DIALOGUE.firstEncounter, () => {
          gameState.zuzkaMetOnce = true;
          gameState.firstVillageEntry = true;
          try { saveGame(); } catch (e) {} // after BOTH flags — else the approach replays on reload
          this._zuzkaApproaching = false;
          // Send her quietly back to the idol base
          if (this.zuzkaSprite && this._zuzkaApproachOrigin) {
            this.tweens.add({
              targets: this.zuzkaSprite,
              x: this._zuzkaApproachOrigin.x,
              y: this._zuzkaApproachOrigin.y,
              duration: 1600,
              ease: 'Sine.easeInOut',
              onUpdate: () => {
                if (this.zuzkaSprite) {
                  this.zuzkaSprite._sortY = this.zuzkaSprite.y;
                  this.zuzkaBaseY = this.zuzkaSprite.y;
                }
              },
            });
          }
        }, 'simple');
  },
  // Internal: time-of-day in hours [0, 24)
  // All three derive from gameState.gameHour — the ONE persisted world
  // clock. There used to be a second scene-local 20-minute clock driving
  // these, which desynced the noon/dusk rituals from the sky, the sun
  // dial, and every reload.
  getHourOfDay() {
    return gameState.gameHour;
  },
  isNoon() {
    return gameState.gameHour >= 12 && gameState.gameHour < 13;
  },
  isAfterDusk() {
    const h = gameState.gameHour;
    return h >= 19 || h < 5;
  },
  playChimneyCrackle() {
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.4 * Math.exp(-i / (d.length * 0.7));
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = 240; f.Q.value = 6;
    const g = ctx.createGain(); g.gain.value = 0.04;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(now);
  },
  receiveIbburMessage() {
    if (gameState.regencyFired.ibbur_message) return;
    gameState.regencyFired.ibbur_message = true;
    adjustAttention(-1, 'ibbur_message');
  },
  playNoonChime() {
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.025, now + 0.15);
    g.gain.linearRampToValueAtTime(0, now + 2.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + 2.6);
  },
});
