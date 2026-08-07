
// ═══ 06 GAME QUEST — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // ── POST-AWAKENING STATE ──────────────────────────────────────────
  beginPostAwakening() {
    gameState.questStage = 0;
    gameState.knotsPlaced = 0;
    this._awakIdleTimer = 0;
    this._awakMoved = false;
    this._awakVoiceShown = false;
    ambientAudio.fadeOutAwakening();

    const cam = this.cameras.main;
    const prompt = this.add.text(cam.width / 2, cam.height - 80,
      '[ Move toward the village ]', {
        fontFamily: 'Georgia, serif', fontSize: '16px',
        color: '#d8c89a', stroke: '#0a0a10', strokeThickness: 3,
        fontStyle: 'italic',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, duration: 1200 });
    this._awakPrompt = prompt;

    // Folk melody returns on first movement into village
    this._awakMeloStarted = false;
  },
  // ── REGENCY DOCUMENT READER ──────────────────────────────────────
  // Full-screen cold-serif memorandum used for the signpost fragment.
  showRegencyDocument(title, body, onClose) {
    if (this._regencyDocOpen) return;
    this._regencyDocOpen = true;
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;

    const bg = this.add.graphics().setScrollFactor(0).setDepth(1600);
    bg.fillStyle(0x000000, 0.85); bg.fillRect(0, 0, W, H);
    // Paper
    const paperW = Math.min(560, W * 0.78);
    const paperH = Math.min(640, H * 0.82);
    const px = (W - paperW) / 2, py = (H - paperH) / 2;
    bg.fillStyle(0xf4f2ec, 1); bg.fillRect(px, py, paperW, paperH);
    bg.lineStyle(1, 0x888888, 1); bg.strokeRect(px, py, paperW, paperH);
    // Header bar
    bg.fillStyle(0xe4e2dc, 1); bg.fillRect(px, py, paperW, 34);
    bg.lineStyle(1, 0x888888, 1); bg.strokeRect(px, py, paperW, 34);

    const header = this.add.text(px + 16, py + 10, title, {
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '13px',
      color: '#1a1a1a',
      fontStyle: 'normal',
    }).setScrollFactor(0).setDepth(1601);

    const txt = this.add.text(px + 30, py + 60, body, {
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '14px',
      color: '#1a1a1a',
      lineSpacing: 6,
      wordWrap: { width: paperW - 60 },
    }).setScrollFactor(0).setDepth(1601);

    // Observation (italic, amber) beneath the paper
    const obs = this.add.text(W / 2, py + paperH + 18,
      'This copy was not destroyed. Someone kept this deliberately. Someone wanted it found.',
      {
        fontFamily: 'Georgia, serif', fontSize: '14px',
        color: '#e8c88a', fontStyle: 'italic',
        stroke: '#0a0810', strokeThickness: 2,
        align: 'center', wordWrap: { width: W * 0.7 },
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1601);

    const hint = this.add.text(W / 2, H - 26, 'Press ESC or E to close', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#8a8474',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1601);

    // Player's mark pulses hard once
    this._markProximityBoost = 1.0;
    setTimeout(() => { this._markProximityBoost = 0; }, 1200);

    const cleanup = () => {
      bg.destroy(); header.destroy(); txt.destroy(); obs.destroy(); hint.destroy();
      this._regencyDocOpen = false;
      document.removeEventListener('keydown', keyHandler, true);
      if (onClose) onClose();
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        cleanup();
      }
    };
    document.addEventListener('keydown', keyHandler, true);
  },
  // ── THREAD KNOT MARKERS ──────────────────────────────────────────
  // Draws small copper-wrapped stones at each marker location.
  // Unplaced markers pulse faintly; placed ones glow steady with a knot visible.
  drawMarkers() {
    MARKERS.forEach((m, idx) => {
      const iso = cartToIso(m.x, m.y);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;
      const g = this.add.graphics();

      // Base stone
      g.fillStyle(PAL.stoneDark, 0.7);
      g.fillEllipse(px, py + 2, 14, 7);
      g.fillStyle(PAL.stone, 0.6);
      g.fillEllipse(px, py, 10, 5);

      // Copper wire wrapping
      g.lineStyle(1, PAL.copper, 0.5);
      g.strokeEllipse(px, py + 1, 12, 6);

      // Small rune mark
      g.lineStyle(1, PAL.rune, 0.3);
      g.beginPath(); g.moveTo(px - 2, py - 2); g.lineTo(px, py - 5); g.lineTo(px + 2, py - 2); g.strokePath();

      g._sortY = py;
      g._markerIdx = idx;
      g._mx = px;
      g._my = py;
      this.markerGraphics.push(g);
      this.objectLayer.add(g);
    });
  },
  // Redraw a marker after a knot is placed on it
  redrawMarkerPlaced(idx) {
    const mg = this.markerGraphics[idx];
    if (!mg) return;
    const px = mg._mx, py = mg._my;
    mg.clear();

    // Glowing base stone
    mg.fillStyle(PAL.stoneDark, 0.7);
    mg.fillEllipse(px, py + 2, 14, 7);
    mg.fillStyle(PAL.stoneLight, 0.7);
    mg.fillEllipse(px, py, 10, 5);

    // Copper wire — brighter
    mg.lineStyle(1, PAL.copperLight, 0.7);
    mg.strokeEllipse(px, py + 1, 12, 6);

    // Thread knot visible on top
    mg.fillStyle(0x4466aa, 0.7);
    mg.fillCircle(px, py - 2, 3);
    mg.lineStyle(1, 0x5577bb, 0.5);
    mg.beginPath(); mg.moveTo(px - 3, py - 2); mg.lineTo(px, py - 6); mg.lineTo(px + 3, py - 2); mg.strokePath();

    // Rune now glows
    mg.lineStyle(1, PAL.rune, 0.7);
    mg.beginPath(); mg.moveTo(px - 2, py - 2); mg.lineTo(px, py - 5); mg.lineTo(px + 2, py - 2); mg.strokePath();

    // Add a permanent light pool
    this.lightPools.push({ x: px, y: py, radius: 22, intensity: 0.05, color: PAL.shrineGlow });

    // Smoothly transition the marker glow color from blue to warm amber
    this.transitionMarkerGlowToAmber(this.markerGraphics[arguments[0]] || mg);
  },
  // ── BLUE → AMBER GLOW TRANSITION ──────────────────────────────────
  transitionMarkerGlowToAmber(markerG) {
    if (!markerG) return;
    markerG._completed = true;
    markerG._glowProgress = 0;
    this.tweens.add({
      targets: markerG,
      _glowProgress: 1,
      duration: 500,
      ease: 'Sine.easeInOut',
    });
  },
  // ── KNOT PLACEMENT ──────────────────────────────────────────────
  // Called from handleInteraction when player presses E near an unplaced marker
  handleMarkerInteraction() {
    if (!gameState.knotsGiven || this.visionActive || this.dialogueActive) return false;

    for (let i = 0; i < MARKERS.length; i++) {
      if (MARKERS[i].placed) continue;
      const dx = this.playerCartX - MARKERS[i].x;
      const dy = this.playerCartY - MARKERS[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 2.0) {
        const iso = cartToIso(MARKERS[i].x, MARKERS[i].y);
        this.interactPrompt.setText('[E] Place thread knot');
        this.interactPrompt.setPosition(
          iso.x + this.worldOffset.x,
          iso.y + this.worldOffset.y - 28
        );
        this.interactPrompt.setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          MARKERS[i].placed = true;
          gameState.knotsPlaced++;
          try { sfx.play('thread_knot'); } catch (e) {}
          try { saveGame(); } catch (e) {}
          gameState.markersFound.push(MARKERS[i].id);
          if (typeof music !== 'undefined') music.onKnotPlaced(gameState.knotsPlaced);
          this.removeThreadKnotFromHUD();
          // 1.5s thread-tying animation, then vision
          this.playKnotTyingAnimation(i, () => {
            this.redrawMarkerPlaced(i);
            this.spawnShimmerRipple(MARKERS[i].x, MARKERS[i].y);
            this.triggerVision(i);
          });
        }
        return true; // consumed the interaction
      }
    }
    return false;
  },
  // ══════════════════════════════════════════════════════════════════
  //  VISION SYSTEM — five sequences triggered by thread knot placement
  // ══════════════════════════════════════════════════════════════════

  // ── VISION DATA ─────────────────────────────────────────────────
  getVisionData(index) {
    const visions = [
      // ── VISION 1: The Idol's Base ──
      {
        transition: 'white',
        lines: [
          { text: 'It works. It actually works.', delay: 1000 },
          { text: 'The old words and the new numbers —\nthey complete each other.', delay: 4000 },
          { text: '[ A pair of hands covers hers.\nGently. Stopping her. ]', delay: 8000 },
          { text: 'Not yet. It isn\'t time.', delay: 11500, voice: true },
        ],
        closing: 'Someone was close. Someone was stopped.',
        duration: 16000,
        audio: 'writing',
      },
      // ── VISION 2: The Hollow Shrine ──
      {
        transition: 'dim',
        lines: [
          { text: 'They said it was for our protection.', delay: 1500 },
          { text: 'They said the old ways were making us sick.', delay: 4500 },
          { text: 'They had very clean shoes.', delay: 8000 },
          { text: '[ Silence. Then — counting again.\nJeden. Dwa. Trzy. Stopping at three. ]', delay: 11000 },
        ],
        closing: 'Someone counted to three and then stopped. They have not been found.',
        duration: 16000,
        audio: 'counting',
      },
      // ── VISION 3: Behind Baba Elzbieta's house ──
      {
        transition: 'lab',
        lines: [
          { text: 'They\'ll call it superstition.', delay: 1500 },
          { text: 'But I\'ve seen the data.\nThe prayers and the compounds work together.', delay: 4500 },
          { text: 'The belief is the catalyst.\nTake either away and you have nothing.', delay: 8500 },
          { text: '[ They begin to turn.\nThe player almost sees their face.\nThe vision cuts. ]', delay: 12000 },
        ],
        closing: 'Someone understood. Someone was almost seen.',
        duration: 16500,
        audio: 'lab',
      },
      // ── VISION 4: The Marsh Road's Edge ──
      {
        transition: 'shake',
        lines: [
          { text: 'Night. A road.\nThree cold lights moving in formation behind.', delay: 1000 },
          { text: 'They don\'t need to rush.', delay: 4500 },
          { text: '[ The runner looks down.\nA page of the Cure Codex, wrapped in cloth. ]', delay: 7500 },
          { text: 'Five pieces. Five towns.\nThey can\'t search everywhere.', delay: 11000, voice: true },
          { text: 'They can\'t erase everyone.', delay: 14000, voice: true },
        ],
        closing: 'Someone ran. Someone scattered the pieces before they were caught.',
        duration: 17500,
        audio: 'running',
      },
      // ── VISION 5: The Dead Tree ──
      {
        transition: 'none',
        lines: [
          { text: 'We knew this would happen.', delay: 4500 },
          { text: 'We sang anyway.', delay: 7000 },
          { text: 'That\'s what you do with the things that matter.', delay: 9500 },
          { text: 'You sing them until you can\'t.', delay: 12500 },
          { text: 'And then you make sure someone else\nknows the melody.', delay: 15000 },
        ],
        closing: 'Someone sang until the last moment. The melody survived.',
        closing2: 'You are carrying it now.',
        duration: 20000,
        audio: 'singing',
      },
    ];
    return visions[index];
  },
  // ── TRIGGER VISION ──────────────────────────────────────────────
  triggerVision(index) {
    // Player stumble — 2-frame down/up over 0.3s before transition
    this.triggerPlayerStumble();
    try { sfx.play('vision_whoosh'); } catch (e) {}
    this.visionActive = true;
    const v = this.getVisionData(index);
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;

    // Create overlay graphics
    const overlay = this.add.graphics();
    overlay.setDepth(1100); overlay.setScrollFactor(0);

    // Create text container
    const textBox = this.add.graphics();
    textBox.setDepth(1101); textBox.setScrollFactor(0);

    const visionText = this.add.text(w / 2, h / 2, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#e8dcc8',
      stroke: '#0e0e14',
      strokeThickness: 2,
      wordWrap: { width: w * 0.65 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1102).setAlpha(0);

    const closingText = this.add.text(w / 2, h - 60, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#aa9977',
      stroke: '#0e0e14',
      strokeThickness: 2,
      wordWrap: { width: w * 0.6 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1102).setAlpha(0);

    // ── TRANSITION IN ─────────────────────────────────────────────
    if (v.transition === 'white') {
      overlay.fillStyle(0xffffff, 0.65);
      overlay.fillRect(0, 0, w, h);
      overlay.setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 1500, ease: 'Sine.easeIn' });
    } else if (v.transition === 'dim') {
      overlay.fillStyle(0x0e0e14, 0.6);
      overlay.fillRect(0, 0, w, h);
      overlay.setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 1200, ease: 'Sine.easeIn' });
    } else if (v.transition === 'shake') {
      overlay.fillStyle(0x0e0e14, 0.5);
      overlay.fillRect(0, 0, w, h);
      overlay.setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 800 });
      // Camera shake — lurching, urgent
      this.cameras.main.shake(3000, 0.008, false);
    }
    // 'none' — no overlay

    // ── PLAY VISION AUDIO ─────────────────────────────────────────
    this.playVisionAudio(v.audio, v.duration);
    if (typeof music !== 'undefined') music.playVision(index);

    // ── NO DIALOGUE BOX — text appears centered italic on screen ──
    // (textBox graphic kept allocated for clean fade-out cleanup)
    visionText.setFontStyle('italic');

    // ── SCHEDULE TEXT LINES ───────────────────────────────────────
    const scene = this;
    v.lines.forEach(line => {
      setTimeout(() => {
        if (!scene.visionActive) return;
        const isStage = line.text.startsWith('[');
        const isVoice = line.voice;
        visionText.setFontStyle('italic');
        visionText.setColor(isStage ? '#9a8a72' : (isVoice ? '#f0e0b8' : '#e8dcc8'));
        visionText.setFontSize(isStage ? '17px' : (isVoice ? '22px' : '20px'));
        visionText.setText(line.text);
        visionText.setAlpha(0);
        scene.tweens.add({ targets: visionText, alpha: 1, duration: 800 });
      }, line.delay + 1000);
    });

    // ── CLOSING TEXT ──────────────────────────────────────────────
    setTimeout(() => {
      if (!scene.visionActive) return;
      closingText.setText(v.closing);
      scene.tweens.add({ targets: closingText, alpha: 1, duration: 800 });
    }, v.duration - 3500);

    // ── OPTIONAL SECOND CLOSING LINE (Vision 5) ──
    if (v.closing2) {
      setTimeout(() => {
        if (!scene.visionActive) return;
        closingText.setText(v.closing + '\n\n' + v.closing2);
      }, v.duration - 1500);
    }

    // ── HAND PULSE (vision-specific moments) ─────────────────────
    if (index === 0) {
      // Vision 1: hard pulse like a second heartbeat skipping
      setTimeout(() => { scene.cameras.main.shake(200, 0.003); }, 15500);
    } else if (index === 4) {
      // Vision 5: hand glow temporarily goes dark, then returns steady
      setTimeout(() => {
        const savedGlow = scene.handGlowLevel;
        scene.handGlowLevel = -1; // dark
        // Maximum-intensity shake on the player at peak
        scene.triggerPlayerShake();
        setTimeout(() => { scene.handGlowLevel = savedGlow + 1; }, 3500);
      }, 18000);
    }

    // ── TRANSITION OUT & CLEANUP ──────────────────────────────────
    // Note: Phaser tween onComplete is unreliable, so we use setTimeout for cleanup
    setTimeout(() => {
      // Fade everything out
      scene.tweens.add({ targets: [overlay, textBox, visionText, closingText], alpha: 0, duration: 1500, ease: 'Sine.easeOut' });
      // Clean up after fade completes (setTimeout instead of onComplete)
      setTimeout(() => {
        overlay.destroy();
        textBox.destroy();
        visionText.destroy();
        closingText.destroy();
        scene.visionActive = false;
        if (typeof music !== 'undefined') music.stopVision();
        // Journal entry for this vision (index 0-4 → vision_1 through vision_5)
        try { addJournalEntry('vision_' + (index + 1)); } catch (e) {}

        // Increase hand glow
        if (index !== 4) scene.handGlowLevel = index + 1; // vision 5 handles its own

        // After Vision 4 — brief leg-ache wobble (2s)
        if (index === 3) {
          scene.cameras.main.shake(2000, 0.0035, false);
        }

        // After all 5 visions — straighten roads, then Południca
        if (gameState.knotsPlaced >= 5) {
          setTimeout(() => {
            scene.straightenRoads();
            setTimeout(() => {
              gameState.questComplete = true;
              try { sfx.play('quest_complete'); } catch (e) {}
              try { addJournalEntry('ritual_roads'); } catch (e) {}
              scene.triggerPoludnica();
            }, 2200);
          }, 1500);
        }
      }, 1600);
    }, v.duration);
  },
  // ── ROADS STRAIGHTEN ANIMATION ────────────────────────────────────
  // After all 5 knots are placed, the road tiles visibly shift 3–4 px
  // into perfect alignment over ~2s. Subtle but noticeable.
  straightenRoads() {
    // Tween the entire ground layer with a tiny offset wave, then settle.
    if (!this.groundLayer) return;
    const startX = this.groundLayer.x;
    const startY = this.groundLayer.y;
    // Brief shimmer flash across the village
    const cam = this.cameras.main;
    const flash = this.add.graphics();
    flash.setScrollFactor(0).setDepth(900);
    flash.fillStyle(0xfff0c0, 0.18);
    flash.fillRect(0, 0, cam.width, cam.height);
    flash.setAlpha(0);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 600, yoyo: true,
      onComplete: () => flash.destroy(),
    });
    // Subtle ground "click into place" — small offset, then back
    this.tweens.add({
      targets: this.groundLayer,
      x: startX + 3, y: startY - 2,
      duration: 900, ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.groundLayer.x = startX;
        this.groundLayer.y = startY;
      },
    });
    // Soft chime
    if (ambientAudio.ctx) {
      const ctx = ambientAudio.ctx;
      const now = ctx.currentTime;
      [440, 660, 880].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, now + i * 0.15);
        g.gain.linearRampToValueAtTime(0.04, now + i * 0.15 + 0.05);
        g.gain.linearRampToValueAtTime(0, now + i * 0.15 + 1.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.15); o.stop(now + i * 0.15 + 1.3);
      });
    }
  },
  // ── VISION AUDIO ENGINE ─────────────────────────────────────────
  // Each vision has a unique synthesized soundscape using Web Audio API
  playVisionAudio(type, duration) {
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const fadeOut = duration / 1000;

    if (type === 'writing') {
      // Quill scratching (filtered noise bursts) + quiet resonant hum
      const hum = ctx.createOscillator();
      const humGain = ctx.createGain();
      hum.type = 'sine'; hum.frequency.value = 220;
      humGain.gain.setValueAtTime(0, now);
      humGain.gain.linearRampToValueAtTime(0.03, now + 1);
      humGain.gain.linearRampToValueAtTime(0, now + fadeOut);
      hum.connect(humGain); humGain.connect(ctx.destination);
      hum.start(now); hum.stop(now + fadeOut);
      // Scratching
      for (let i = 0; i < 12; i++) {
        const t = now + 1 + Math.random() * (fadeOut - 3);
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 2000 + Math.random() * 3000;
        const g = ctx.createGain(); g.gain.value = 0.015 + Math.random() * 0.01;
        src.connect(filt); filt.connect(g); g.connect(ctx.destination);
        src.start(t);
      }
    } else if (type === 'counting') {
      // Eerie child-tone (high sine pulses) + door creak (low filtered sweep)
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600 + i * 80;
        g.gain.setValueAtTime(0, now + i * 0.8);
        g.gain.linearRampToValueAtTime(0.02, now + i * 0.8 + 0.1);
        g.gain.linearRampToValueAtTime(0, now + i * 0.8 + 0.5);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now + i * 0.8); osc.stop(now + i * 0.8 + 0.6);
      }
      // Door creak at 5s
      const creak = ctx.createOscillator();
      const creakG = ctx.createGain();
      creak.type = 'sawtooth'; creak.frequency.value = 60;
      creak.frequency.linearRampToValueAtTime(120, now + 6.5);
      creakG.gain.setValueAtTime(0, now + 5); creakG.gain.linearRampToValueAtTime(0.02, now + 5.5);
      creakG.gain.linearRampToValueAtTime(0, now + 7);
      const creakF = ctx.createBiquadFilter(); creakF.type = 'bandpass'; creakF.frequency.value = 200;
      creak.connect(creakF); creakF.connect(creakG); creakG.connect(ctx.destination);
      creak.start(now + 5); creak.stop(now + 7);
    } else if (type === 'lab') {
      // Clinical fluorescent hum + glass clink
      const hum = ctx.createOscillator();
      const humG = ctx.createGain();
      hum.type = 'sawtooth'; hum.frequency.value = 100;
      humG.gain.setValueAtTime(0, now);
      humG.gain.linearRampToValueAtTime(0.015, now + 1.5);
      humG.gain.linearRampToValueAtTime(0, now + fadeOut);
      const humF = ctx.createBiquadFilter(); humF.type = 'bandpass'; humF.frequency.value = 120; humF.Q.value = 8;
      hum.connect(humF); humF.connect(humG); humG.connect(ctx.destination);
      hum.start(now); hum.stop(now + fadeOut);
      // Glass clinks
      for (let i = 0; i < 4; i++) {
        const t = now + 3 + Math.random() * 8;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 2000 + Math.random() * 2000;
        g.gain.setValueAtTime(0.03, t); g.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.2);
      }
    } else if (type === 'running') {
      // Heavy footsteps (low thuds) + wind + breathing
      for (let i = 0; i < Math.floor(fadeOut * 2.5); i++) {
        const t = now + 0.5 + i * 0.4;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (d.length * 0.3));
        const src = ctx.createBufferSource(); src.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
        const g = ctx.createGain(); g.gain.value = 0.04;
        src.connect(f); f.connect(g); g.connect(ctx.destination);
        if (t < now + fadeOut - 1) src.start(t);
      }
      // Wind
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * fadeOut, ctx.sampleRate);
      const wd = windBuf.getChannelData(0);
      for (let j = 0; j < wd.length; j++) wd[j] = (Math.random() * 2 - 1);
      const windSrc = ctx.createBufferSource(); windSrc.buffer = windBuf;
      const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 400;
      const wg = ctx.createGain(); wg.gain.setValueAtTime(0, now);
      wg.gain.linearRampToValueAtTime(0.025, now + 2);
      wg.gain.linearRampToValueAtTime(0, now + fadeOut);
      windSrc.connect(wf); wf.connect(wg); wg.connect(ctx.destination);
      windSrc.start(now);
    } else if (type === 'singing') {
      // Layered voices (multiple sine harmonics) fading out one by one
      const voices = [];
      const baseFreqs = [220, 277, 330, 392, 440, 523, 330, 262];
      baseFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        // Each voice fades out at different time
        const voiceEnd = now + 4 + i * 1.5;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.018, now + 1.5);
        g.gain.setValueAtTime(0.018, Math.min(voiceEnd - 1, now + fadeOut - 2));
        g.gain.linearRampToValueAtTime(0, Math.min(voiceEnd, now + fadeOut - 1));
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(Math.min(voiceEnd + 0.5, now + fadeOut));
        voices.push(osc);
      });
    }
  },
  // ══════════════════════════════════════════════════════════════════
  //  POŁUDNICA — The Noonwraith Appearance (after all 5 visions)
  // ══════════════════════════════════════════════════════════════════
  triggerPoludnica() {
    // Cutscene lock — blocks pause/journal/observation/interactions so
    // her single 13s appearance can't be hidden behind an overlay
    this._cutsceneActive = true;
    this.time.delayedCall(16000, () => { this._cutsceneActive = false; });
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    // Południca's theme — single play, ducks all music to ~10%.
    // When it ends, awakening theme Play 2 follows automatically.
    if (typeof music !== 'undefined') {
      music.playPoludnica(() => music.playAwakening(0.50));
    }

    // ── Phase 1: Golden noon light floods the scene ─────────────
    const noonOverlay = this.add.graphics();
    noonOverlay.setDepth(1100); noonOverlay.setScrollFactor(0);
    noonOverlay.fillStyle(0xddcc88, 0.35);
    noonOverlay.fillRect(0, 0, w, h);
    noonOverlay.setAlpha(0);
    this.tweens.add({ targets: noonOverlay, alpha: 1, duration: 2000 });

    // ── Phase 2: All ambient sound stops ────────────────────────
    // (We lower the master gain if audio is running)
    let masterGain = null;
    if (ambientAudio.ctx) {
      masterGain = ambientAudio.ctx.createGain();
      masterGain.gain.setValueAtTime(1, ambientAudio.ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, ambientAudio.ctx.currentTime + 2);
    }

    // ── Phase 3: Południca appears at the idol (3s in) ──────────
    const scene = this;
    setTimeout(() => {
      const iso = cartToIso(CENTER - 0.5, CENTER - 0.5);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;

      // Draw the noonwraith — tall, pale, white linen
      const polud = this.add.graphics();
      polud.setDepth(1050);

      // Tall pale figure
      // Flowing white linen dress
      polud.fillStyle(0xeeeedd, 0.7);
      polud.fillRect(px - 8, py - 70, 16, 55);
      // Dress flows wider at bottom
      polud.fillTriangle(px - 8, py - 15, px + 8, py - 15, px - 14, py - 5);
      polud.fillTriangle(px - 8, py - 15, px + 8, py - 15, px + 14, py - 5);
      // Head — pale, featureless
      polud.fillStyle(0xeeeedd, 0.8);
      polud.fillCircle(px, py - 76, 8);
      // Hair — pale wheat, long
      polud.fillStyle(0xccbb88, 0.5);
      polud.fillRect(px - 7, py - 82, 14, 10);
      polud.lineStyle(1, 0xccbb88, 0.3);
      polud.beginPath(); polud.moveTo(px - 6, py - 72); polud.lineTo(px - 8, py - 50); polud.strokePath();
      polud.beginPath(); polud.moveTo(px + 6, py - 72); polud.lineTo(px + 8, py - 50); polud.strokePath();
      // Eyes — just two faint dots
      polud.fillStyle(0xddddcc, 0.9);
      polud.fillCircle(px - 3, py - 77, 1);
      polud.fillCircle(px + 3, py - 77, 1);
      // Linen moves without wind
      polud.lineStyle(1, 0xddddcc, 0.3);
      polud.beginPath(); polud.moveTo(px - 12, py - 8); polud.lineTo(px - 16, py - 2); polud.strokePath();
      polud.beginPath(); polud.moveTo(px + 12, py - 8); polud.lineTo(px + 16, py - 2); polud.strokePath();

      // Strong noon glow around her
      const polGlow = this.add.graphics();
      polGlow.setDepth(1049);
      polGlow.fillStyle(0xddcc88, 0.15);
      polGlow.fillCircle(px, py - 40, 50);
      polGlow.fillStyle(0xffeedd, 0.08);
      polGlow.fillCircle(px, py - 40, 80);

      polud.setAlpha(0);
      polGlow.setAlpha(0);

      // Fade in
      this.tweens.add({ targets: [polud, polGlow], alpha: 1, duration: 2000 });

      // ── Phase 4: She nods once (at 6s) ──────────────────────
      setTimeout(() => {
        // Subtle nod — move head down then up
        scene.tweens.add({
          targets: polud,
          y: polud.y + 4,
          duration: 600,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      }, 3000);

      // ── Phase 5: She dissolves (at 8s) ──────────────────────
      setTimeout(() => {
        scene.tweens.add({
          targets: [polud, polGlow],
          alpha: 0,
          duration: 3000,
          ease: 'Sine.easeIn',
          onComplete: () => { polud.destroy(); polGlow.destroy(); }
        });
      }, 5000);

      // ── Phase 6: Village sounds return (at 10s) & bells chime ─
      setTimeout(() => {
        // Fade noon overlay out
        scene.tweens.add({
          targets: noonOverlay,
          alpha: 0,
          duration: 3000,
          onComplete: () => noonOverlay.destroy(),
        });

        // Restore ambient audio
        if (masterGain && ambientAudio.ctx) {
          masterGain.gain.linearRampToValueAtTime(1, ambientAudio.ctx.currentTime + 3);
        }

        // Baba's copper bells chime on their own
        scene.babaBellSwing = 8;

        // Play a brief bell-like chime sound
        if (ambientAudio.ctx) {
          const ctx = ambientAudio.ctx;
          const now = ctx.currentTime;
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800 + i * 200;
            g.gain.setValueAtTime(0.04, now + i * 0.3);
            g.gain.linearRampToValueAtTime(0, now + i * 0.3 + 1.5);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now + i * 0.3); osc.stop(now + i * 0.3 + 2);
          }
        }
      }, 7000);
    }, 3000);

    // ── Phase 7 removed: Brel no longer auto-fires here.
    // The new closing scene is triggered by checkBrelTrigger() once the
    // player picks up the Codex AND moves within 3 tiles of the southern
    // exit road. See triggerWellnessOfficer() for the orchestrated scene.
  },
  // ══════════════════════════════════════════════════════════════════
  //  PROXIMITY TRIGGER — fires the closing scene once the player picks
  //  up the Codex AND moves within 3 tiles of the southern exit road.
  // ══════════════════════════════════════════════════════════════════
  checkBrelTrigger() {
    if (gameState.brelSceneFired) return;
    if (!gameState.codexFragmentCollected) return;
    if (this.dialogueActive || this.visionActive || this._paused
      || this._pauseLayer || this._cutsceneActive) return;
    const exit = { x: CENTER - 0.5, y: MAP_SIZE - 1 };
    const d = Math.hypot(this.playerCartX - exit.x, this.playerCartY - exit.y);
    // Radius 1.0 (was 3): the wider ring swallowed the signpost memory
    // fragment and the southern Nocnica zone, which sit 1.0-1.2 away
    if (d > 1.0) return;
    gameState.brelSceneFired = true;
    this.triggerWellnessOfficer();
  },
  // ══════════════════════════════════════════════════════════════════
  //  WELLNESS OFFICER CLOSING SCENE — orchestrated, mode-aware
  // ══════════════════════════════════════════════════════════════════
  triggerWellnessOfficer() {
    // Cutscene lock for the whole closing sequence — released by the
    // title card (showAct1TitleCard), which is its final beat
    this._cutsceneActive = true;
    if (this.officerScenePlayed) return;
    this.officerScenePlayed = true;
    const scene = this;
    const mode = gameState.brelMode || 'neutral';
    this._brelMode = mode;
    this._brelDoorsKnocked = 0;

    // Audio duck — village ambient drops to ~20% over 5s
    if (typeof masterGain !== 'undefined' && masterGain && ambientAudio.ctx) {
      try {
        masterGain.gain.linearRampToValueAtTime(0.2, ambientAudio.ctx.currentTime + 5);
      } catch (e) {}
    }
    // Cold piano drone underneath at low volume — Brel's "theme"
    this.startBrelTheme();

    // ── STEP 1 — Zuzka's closing beat ──
    this.playZuzkaClosingBeat(() => {
      // Per-mode delay before Brel arrives
      const enterDelay = mode === 'high' ? 20000 : (mode === 'low' ? 90000 : 45000);
      setTimeout(() => scene.brelEnter(), enterDelay);
    });
  },
  // ── STEP 2: Brel enters from the northern road, walks to crossroads ──
  brelEnter() {
    const scene = this;
    const mode = this._brelMode || gameState.brelMode || 'neutral';
    // Northern entry road
    const startCart = { x: CENTER - 0.5, y: 0 };
    const iso = cartToIso(startCart.x, startCart.y);
    const ox = iso.x + this.worldOffset.x;
    const oy = iso.y + this.worldOffset.y;
    const officer = this.add.container(ox, oy);
    const g = this.add.graphics();

    // Regency aesthetic — cold, clean, metallic. Grey/steel uniform.
    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(0, 3, 12, 5);

    // Legs — long grey trousers
    g.fillStyle(0x2a3038, 1);
    g.fillRect(-4, -2, 3, 10);
    g.fillRect(1, -2, 3, 10);
    // Polished boots
    g.fillStyle(0x0a0a0e, 1);
    g.fillRect(-4, 6, 4, 3);
    g.fillRect(1, 6, 4, 3);

    // Long grey coat — stiff, immaculate
    g.fillStyle(0x3a4048, 1);
    g.fillRect(-6, -16, 13, 16);
    // Coat lapels
    g.fillStyle(0x2a3038, 1);
    g.fillTriangle(-6, -16, -1, -16, -3, -10);
    g.fillTriangle(6, -16, 1, -16, 3, -10);
    // Row of polished buttons — brass
    g.fillStyle(0xb8a060, 1);
    g.fillCircle(0, -13, 0.8);
    g.fillCircle(0, -10, 0.8);
    g.fillCircle(0, -7, 0.8);
    g.fillCircle(0, -4, 0.8);

    // Arms — holding clipboard
    g.fillStyle(0x3a4048, 1);
    g.fillRect(-7, -14, 2, 10);
    g.fillRect(5, -14, 2, 10);
    // Hands (pale, precise)
    g.fillStyle(0xd8c8b0, 1);
    g.fillRect(-7, -5, 2, 2);
    g.fillRect(5, -5, 2, 2);

    // Clipboard — held at waist, very white paper
    g.fillStyle(0x1a1a20, 1); // board
    g.fillRect(-5, -7, 10, 7);
    g.fillStyle(0xf4f0e8, 1); // paper (unnaturally white against dusk)
    g.fillRect(-4, -6, 8, 5);
    // Thin lines on paper
    g.lineStyle(1, 0x888888, 0.6);
    g.beginPath(); g.moveTo(-3, -5); g.lineTo(3, -5); g.strokePath();
    g.beginPath(); g.moveTo(-3, -4); g.lineTo(3, -4); g.strokePath();
    g.beginPath(); g.moveTo(-3, -3); g.lineTo(3, -3); g.strokePath();

    // Neck — high stiff collar
    g.fillStyle(0x1a1e24, 1);
    g.fillRect(-3, -19, 6, 4);

    // Head — pale, gaunt
    g.fillStyle(0xd8c8b0, 1);
    g.fillCircle(0, -23, 5);

    // Peaked cap — grey with brass badge
    g.fillStyle(0x2a3038, 1);
    g.fillRect(-6, -29, 12, 4);
    g.fillRect(-5, -30, 10, 2);
    // Cap brim
    g.fillStyle(0x0a0a0e, 1);
    g.fillRect(-7, -26, 14, 1);
    // Brass badge
    g.fillStyle(0xb8a060, 1);
    g.fillCircle(0, -28, 1.5);
    g.fillStyle(0x8a7040, 1);
    g.fillCircle(0, -28, 0.8);

    // Eyes — two pale dots, unblinking
    g.fillStyle(0x223340, 1);
    g.fillCircle(-1.8, -23, 0.9);
    g.fillCircle(1.8, -23, 0.9);
    // No gleam — dull

    // Thin mouth — small polite line
    g.lineStyle(1, 0x6a5a4a, 0.8);
    g.beginPath(); g.moveTo(-1.5, -20); g.lineTo(1.5, -20); g.strokePath();

    officer.add(g);
    officer._sortY = oy;
    officer.setAlpha(0);
    this.objectLayer.add(officer);
    this.officerSprite = officer;

    // ── Fade him in as if stepping from a road that wasn't there ────
    this.tweens.add({ targets: officer, alpha: 1, duration: 1800, ease: 'Sine.easeOut' });

    // ── Walk him forward toward the idol ────────────────────────────
    const endCart = { x: CENTER - 0.5, y: CENTER + 2.5 };
    const endIso = cartToIso(endCart.x, endCart.y);
    const endX = endIso.x + this.worldOffset.x;
    const endY = endIso.y + this.worldOffset.y;

    setTimeout(() => {
      scene.tweens.add({
        targets: officer,
        x: endX,
        y: endY,
        duration: 4500,
        ease: 'Linear',
        onUpdate: () => { officer._sortY = officer.y; },
      });
    }, 1200);

    // ── Play a cold arrival sound — flat metallic tone ──────────────
    if (ambientAudio.ctx) {
      const ctx = ambientAudio.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 4);
      og.gain.setValueAtTime(0, now);
      og.gain.linearRampToValueAtTime(0.03, now + 1);
      og.gain.linearRampToValueAtTime(0, now + 5);
      osc.connect(og); og.connect(ctx.destination);
      osc.start(now); osc.stop(now + 5);
    }

    // ── After walk-in, chain into the inspection sequence ──────────
    setTimeout(() => scene.brelInspect(), 6200);
  },
  // ── STEP 3: Brel inspects three points around the crossroads ────
  brelInspect() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer) return;
    const mode = this._brelMode || 'neutral';
    const perLoc = mode === 'low' ? 1000 : (mode === 'high' ? 4000 : 2500);

    const points = [
      { x: CENTER - 0.5, y: CENTER + 1.5 },        // idol
      { x: CENTER + 2.5, y: CENTER - 1.5 },        // nearest shrine
      { x: BABA.cartX + 0.5, y: BABA.cartY + 1 },  // doorframe
    ];
    let i = 0;
    const next = () => {
      if (!scene.officerSprite) return;
      if (i >= points.length) {
        // HIGH: extra inn pause
        if (mode === 'high') {
          const inn = cartToIso(7, 9);
          scene.tweens.add({
            targets: officer, x: inn.x + scene.worldOffset.x, y: inn.y + scene.worldOffset.y,
            duration: 3500, ease: 'Linear',
            onUpdate: () => { officer._sortY = officer.y; },
            onComplete: () => setTimeout(() => scene.brelPinNotice(), 4000),
          });
        } else {
          setTimeout(() => scene.brelPinNotice(), 600);
        }
        return;
      }
      const p = points[i++];
      const t = cartToIso(p.x, p.y);
      scene.tweens.add({
        targets: officer, x: t.x + scene.worldOffset.x, y: t.y + scene.worldOffset.y,
        duration: 2200, ease: 'Linear',
        onUpdate: () => { officer._sortY = officer.y; },
        onComplete: () => {
          // Clipboard write — small nod / tiny y bob
          scene.tweens.add({
            targets: officer, y: officer.y - 1, duration: 150, yoyo: true, repeat: 2,
          });
          setTimeout(next, perLoc);
        },
      });
    };
    next();
  },
  // ── STEP 4: Brel pins a notice to the idol base ─────────────────
  brelPinNotice() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer) return;
    const mode = this._brelMode || 'neutral';

    // Walk to idol base
    const idol = cartToIso(CENTER - 0.5, CENTER + 1.5);
    scene.tweens.add({
      targets: officer, x: idol.x + scene.worldOffset.x, y: idol.y + scene.worldOffset.y,
      duration: 2200, ease: 'Linear',
      onUpdate: () => { officer._sortY = officer.y; },
      onComplete: () => {
        // Pin the on-world notice
        const noticeIso = cartToIso(CENTER - 0.5, CENTER + 1.8);
        const nx = noticeIso.x + scene.worldOffset.x;
        const ny = noticeIso.y + scene.worldOffset.y - 6;
        const notice = scene.add.graphics();
        notice.fillStyle(0xf4f0e8, 1);
        notice.fillRect(-7, -9, 14, 12);
        notice.lineStyle(0.5, 0x2a3038, 1);
        notice.strokeRect(-7, -9, 14, 12);
        notice.fillStyle(0x8a2a2a, 1);
        notice.fillRect(-7, -9, 14, 1);
        const noticeContainer = scene.add.container(nx, ny, [notice]);
        noticeContainer._sortY = ny;
        scene.objectLayer.add(noticeContainer);
        scene.brelNoticeSprite = noticeContainer;
        noticeContainer.setAlpha(0);
        scene.tweens.add({ targets: noticeContainer, alpha: 1, duration: 600 });

        // Show cold-text notice headline above the idol
        const bodies = {
          low:    'ROUTINE ASSESSMENT — area nominal.\nNo further action required.',
          neutral:'WELLNESS ASSESSMENT NOTICE\nReport within 7 days. Voluntary.',
          high:   'PRIORITY ASSESSMENT — Legacy Myth activity.\nReport immediately. Non-attendance noted.',
        };
        scene.showColdCenteredText(bodies[mode] || bodies.neutral, 5000, () => {
          if (mode === 'high') {
            scene.brelHighSecondaryNotice();
          } else {
            setTimeout(() => scene.brelStraightenNotice(), 800);
          }
        });
      },
    });
  },
  // ── STEP 4b: HIGH mode — secondary notice + door knocks at Baba's
  brelHighSecondaryNotice() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer) return;
    const baba = cartToIso(BABA.cartX + 0.5, BABA.cartY + 1);
    scene.tweens.add({
      targets: officer, x: baba.x + scene.worldOffset.x, y: baba.y + scene.worldOffset.y,
      duration: 3000, ease: 'Linear',
      onUpdate: () => { officer._sortY = officer.y; },
      onComplete: () => {
        // 3 measured knocks
        let k = 0;
        const knock = () => {
          if (k >= 3) {
            // Long write, no answer
            scene.tweens.add({ targets: officer, y: officer.y - 1, duration: 200, yoyo: true, repeat: 4 });
            setTimeout(() => scene.brelStraightenNotice(), 4000);
            return;
          }
          k++;
          scene.playKnockSFX();
          scene.tweens.add({ targets: officer, x: officer.x + 1, duration: 120, yoyo: true });
          setTimeout(knock, 1100);
        };
        knock();
      },
    });
  },
  // ── STEP 5: Straighten the notice ────────────────────────────────
  brelStraightenNotice() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer || !scene.brelNoticeSprite) {
      this.brelOldManInteraction();
      return;
    }
    // Tiny precision tween — rotate by a hair, pause, write, tear, pocket
    scene.tweens.add({
      targets: scene.brelNoticeSprite, rotation: 0.02, duration: 600, yoyo: true,
      onComplete: () => {
        scene.tweens.add({ targets: officer, y: officer.y - 1, duration: 150, yoyo: true, repeat: 1 });
        setTimeout(() => scene.brelOldManInteraction(), 1500);
      },
    });
  },
  // ── STEP 6: Old man villager passes by ───────────────────────────
  brelOldManInteraction() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer) { this.brelKnockDoors(); return; }

    const oldMan = scene.spawnOldManVillager();
    // Walk old man across the idol
    const startIso = cartToIso(MAP_SIZE - 1, CENTER - 0.5);
    const endIso = cartToIso(0, CENTER + 0.5);
    oldMan.x = startIso.x + scene.worldOffset.x;
    oldMan.y = startIso.y + scene.worldOffset.y;
    scene.tweens.add({
      targets: oldMan,
      x: endIso.x + scene.worldOffset.x, y: endIso.y + scene.worldOffset.y,
      duration: 9000, ease: 'Linear',
      onUpdate: () => { oldMan._sortY = oldMan.y; },
      onComplete: () => {
        scene.tweens.add({
          targets: oldMan, alpha: 0, duration: 800,
          onComplete: () => oldMan.destroy(),
        });
      },
    });

    // Halfway: Brel turns and speaks
    setTimeout(() => {
      scene.tweens.add({ targets: officer, scaleX: -1, duration: 200 });
      scene.showColdCenteredText(
        'Good afternoon. Beautiful village.\nThe roads are very straight — someone\'s been busy.',
        5000,
        () => {
          scene.tweens.add({ targets: officer, scaleX: 1, duration: 200 });
          setTimeout(() => scene.brelKnockDoors(), 1000);
        }
      );
    }, 4000);

    // Allow optional player interaction during this beat
    scene._brelInteractable = true;
    scene._brelInteractDeadline = Date.now() + 12000;
  },
  // ── STEP 7: Brel knocks on doors ─────────────────────────────────
  brelKnockDoors() {
    const scene = this;
    const officer = this.officerSprite;
    if (!officer) { this.brelClosingWideShot(); return; }
    const mode = this._brelMode || 'neutral';
    scene._brelInteractable = false;

    const houses = [
      { x: BABA.cartX + 0.5, y: BABA.cartY + 1 },
      { x: 7, y: 9 },
      { x: 17, y: 8 },
    ];
    let h = 0;
    const visit = () => {
      if (!scene.officerSprite || h >= houses.length) {
        setTimeout(() => scene.brelClosingWideShot(), 1500);
        return;
      }
      const target = houses[h++];
      const t = cartToIso(target.x, target.y);
      scene.tweens.add({
        targets: officer, x: t.x + scene.worldOffset.x, y: t.y + scene.worldOffset.y,
        duration: 2800, ease: 'Linear',
        onUpdate: () => { officer._sortY = officer.y; },
        onComplete: () => {
          const knockCount = (mode === 'high' && h === 2) ? 5 : 3;
          let k = 0;
          const knock = () => {
            if (k >= knockCount) {
              setTimeout(visit, 800);
              return;
            }
            k++;
            scene.playKnockSFX();
            scene.tweens.add({ targets: officer, y: officer.y - 1, duration: 100, yoyo: true });
            setTimeout(knock, 900);
          };
          knock();
        },
      });
    };
    visit();
  },
  // ── Closing wide shot — idol opens its eyes ──────────────────────
  brelClosingWideShot() {
    const scene = this;
    const cam = this.cameras.main;
    // Zoom out wide
    scene.tweens.add({
      targets: cam, zoom: cam.zoom * 0.7, duration: 3000, ease: 'Sine.easeInOut',
    });
    setTimeout(() => {
      // Idol eyes animation
      scene.drawIdolEyes(true);
      try { sfx.play('idol_eyes'); } catch (e) {}
      scene.playLowBellTone();
      setTimeout(() => {
        scene.drawIdolEyes(false);
        setTimeout(() => scene.showAct1TitleCard(), 1500);
      }, 3000);
    }, 3000);
  },
  // ── HELPERS ──────────────────────────────────────────────────────

  startBrelTheme() {
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 87; // low cold drone
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.025, now + 4);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now);
    this._brelThemeOsc = osc;
    this._brelThemeGain = g;
  },
  playKnockSFX() {
    try { sfx.play('knock_brel'); } catch (e) {}
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 90;
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.13);
  },
  playLowBellTone() {
    if (!ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.4);
    g.gain.linearRampToValueAtTime(0, now + 4);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 4);
  },
  showColdCenteredText(text, duration, onDone) {
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height / 2 - 60, text, {
      fontFamily: 'monospace', fontSize: '13px', color: '#e8e4d8',
      align: 'center', stroke: '#0a0a10', strokeThickness: 2,
      lineSpacing: 4,
    }).setOrigin(0.5, 0.5).setDepth(1250).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 600 });
    setTimeout(() => {
      this.tweens.add({
        targets: t, alpha: 0, duration: 600,
        onComplete: () => { t.destroy(); if (onDone) onDone(); },
      });
    }, duration);
  },
  spawnOldManVillager() {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    // Shadow
    g.fillStyle(0x000000, 0.2); g.fillEllipse(0, 3, 12, 5);
    // Stooped legs
    g.fillStyle(0x4a3a2a, 1);
    g.fillRect(-3, -1, 2, 8); g.fillRect(1, -1, 2, 8);
    // Long brown coat
    g.fillStyle(0x5a4030, 1);
    g.fillRect(-5, -14, 11, 14);
    // Arms — one carrying a basket
    g.fillStyle(0x5a4030, 1);
    g.fillRect(-6, -12, 2, 8);
    g.fillRect(5, -12, 2, 6);
    // Basket
    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(5, -6, 5, 4);
    g.lineStyle(0.5, 0x4a3020, 1); g.strokeRect(5, -6, 5, 4);
    // Hunched neck
    g.fillStyle(0xc8b890, 1); g.fillCircle(0, -17, 3.5);
    // White hair / cap
    g.fillStyle(0xe8e0d0, 1); g.fillRect(-3, -21, 6, 3);
    // Tiny eyes
    g.fillStyle(0x1a1a20, 1);
    g.fillRect(-1.5, -17, 0.8, 0.8); g.fillRect(0.8, -17, 0.8, 0.8);
    c.add(g);
    this.objectLayer.add(c);
    return c;
  },
  drawIdolEyes(open) {
    if (!this.idolEyesGfx) {
      const idolIso = cartToIso(CENTER - 0.5, CENTER + 0.5);
      this.idolEyesGfx = this.add.graphics();
      this.idolEyesGfx.x = idolIso.x + this.worldOffset.x;
      this.idolEyesGfx.y = idolIso.y + this.worldOffset.y - 28;
      this.idolEyesGfx._sortY = this.idolEyesGfx.y + 1000;
      this.objectLayer.add(this.idolEyesGfx);
    }
    const g = this.idolEyesGfx;
    g.clear();
    if (open) {
      g.fillStyle(0xffd060, 1);
      g.fillCircle(-2, 0, 1.2);
      g.fillCircle(2, 0, 1.2);
      g.fillStyle(0xfff0a0, 0.6);
      g.fillCircle(-2, 0, 2.2);
      g.fillCircle(2, 0, 2.2);
    }
  },
  // ── ACT 1 TITLE CARD — "The Unraveling" ──────────────────────────
  showAct1TitleCard() {
    if (this.act1TitleShown) return;
    this.act1TitleShown = true;
    gameState.act = 2;
    // The ending has actually played — persist it. Without this save the
    // whole Brel sequence + title card reverted on tab close and replayed.
    gameState.act1Complete = true;
    try { saveGame(); } catch (e) {}

    // Awakening theme — Play 3: under the title card, begins at +2s, 30%,
    // fades out with the card after the standard 4s hold + 2s fade.
    if (typeof music !== 'undefined') {
      setTimeout(() => music.playAwakening(0.30), 2000);
      setTimeout(() => music.fadeOutAwakening(2000), 2000 + 4000);
    }

    const scene = this;
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    const AMBER = '#ffb050';
    const AMBER_HEX = 0xffb050;

    // ── Black background, fades from black (2s) ──────────────────
    const bg = this.add.graphics().setDepth(1300).setScrollFactor(0);
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, w, h);
    bg.setAlpha(1); // already black from previous scene

    // Faint static dust — single-pixel particles at 10% opacity
    const dust = this.add.graphics().setDepth(1301).setScrollFactor(0).setAlpha(0);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      dust.fillStyle(0xffffff, 0.10);
      dust.fillRect(x, y, 1, 1);
    }
    this.tweens.add({ targets: dust, alpha: 1, duration: 2000, ease: 'Sine.easeOut' });

    // ── Decorative folk-art rule (top) ───────────────────────────
    const ruleW = w * 0.6;
    const drawRule = (yPos) => {
      const r = scene.add.graphics().setDepth(1302).setScrollFactor(0).setAlpha(0);
      const x0 = (w - ruleW) / 2;
      // 1px line
      r.fillStyle(AMBER_HEX, 0.9);
      r.fillRect(x0, yPos, ruleW, 1);
      // small geometric diamonds spaced evenly
      const diamonds = 9;
      const step = ruleW / (diamonds - 1);
      for (let i = 0; i < diamonds; i++) {
        const dx = x0 + i * step;
        // 4-pixel diamond
        r.fillRect(dx,     yPos - 2, 1, 1);
        r.fillRect(dx - 1, yPos - 1, 3, 1);
        r.fillRect(dx - 2, yPos,     5, 1);
        r.fillRect(dx - 1, yPos + 1, 3, 1);
        r.fillRect(dx,     yPos + 2, 1, 1);
      }
      return r;
    };

    const titleY = h / 2 - 20;
    const subtitleY = titleY + 80;
    const topRuleY = titleY - 60;
    const botRuleY = subtitleY + 40;

    const topRule = drawRule(topRuleY);
    this.tweens.add({ targets: topRule, alpha: 1, duration: 1000, ease: 'Sine.easeOut' });

    // ── Title — letter by letter fade ────────────────────────────
    const titleStr = 'The Unraveling';
    const letterObjs = [];
    // Build all letters first to measure total width
    let totalWidth = 0;
    const tmpStyle = {
      fontFamily: 'Georgia, serif', fontSize: '72px', fontStyle: 'italic',
      color: AMBER, stroke: '#000000', strokeThickness: 2,
    };
    // Use a single text to measure
    const measure = this.add.text(0, 0, titleStr, tmpStyle).setVisible(false);
    totalWidth = measure.width;
    measure.destroy();
    let cursor = (w - totalWidth) / 2;
    for (let i = 0; i < titleStr.length; i++) {
      const ch = titleStr[i];
      const t = this.add.text(cursor, titleY, ch, tmpStyle)
        .setOrigin(0, 0.5).setDepth(1303).setScrollFactor(0).setAlpha(0);
      letterObjs.push(t);
      cursor += t.width;
    }

    setTimeout(() => {
      // ~2s total across all letters
      const perLetter = 2000 / titleStr.length;
      letterObjs.forEach((t, i) => {
        scene.tweens.add({
          targets: t, alpha: 1, duration: 600, delay: i * perLetter, ease: 'Sine.easeOut',
        });
      });
    }, 1000);

    // ── Subtitle — appears 1.5s after title completes ────────────
    const titleCompleteAt = 1000 + 2000 + 600; // delay + spread + fade
    const subtitleAt = titleCompleteAt + 1500;
    const subtitle = this.add.text(w / 2, subtitleY, 'Act I', {
      fontFamily: 'Georgia, serif', fontSize: '24px', fontStyle: 'italic',
      color: AMBER,
    }).setOrigin(0.5, 0.5).setDepth(1303).setScrollFactor(0).setAlpha(0);
    setTimeout(() => {
      scene.tweens.add({ targets: subtitle, alpha: 0.6, duration: 1000, ease: 'Sine.easeOut' });
    }, subtitleAt);

    // ── Bottom rule — mirror of top, fades in with subtitle ──────
    const botRule = drawRule(botRuleY);
    setTimeout(() => {
      scene.tweens.add({ targets: botRule, alpha: 1, duration: 1000, ease: 'Sine.easeOut' });
    }, subtitleAt);

    // ── Audio: theme_awakening 2s into the card, very quiet ──────
    setTimeout(() => {
      try {
        if (ambientAudio.startAwakeningAmbience) {
          ambientAudio.startAwakeningAmbience();
        }
        if (typeof masterGain !== 'undefined' && masterGain && ambientAudio.ctx) {
          masterGain.gain.linearRampToValueAtTime(0.08, ambientAudio.ctx.currentTime + 2);
        }
      } catch (e) {}
    }, 2000);

    // ── Hold the complete card 4s after subtitle finishes ───────
    const subtitleDoneAt = subtitleAt + 1000;
    const holdEndAt = subtitleDoneAt + 4000;
    setTimeout(() => {
      const all = [dust, topRule, botRule, subtitle, ...letterObjs];
      scene.tweens.add({ targets: all, alpha: 0, duration: 2000, ease: 'Sine.easeIn' });
      // Audio fade with the card
      try {
        if (typeof masterGain !== 'undefined' && masterGain && ambientAudio.ctx) {
          masterGain.gain.linearRampToValueAtTime(0, ambientAudio.ctx.currentTime + 2);
        }
      } catch (e) {}
      setTimeout(() => {
        // Return player to game world at the village exit
        const exit = cartToIso(CENTER - 0.5, MAP_SIZE - 1);
        scene.playerCartX = CENTER - 0.5;
        scene.playerCartY = MAP_SIZE - 1;
        if (scene.player) {
          scene.player.x = exit.x + scene.worldOffset.x;
          scene.player.y = exit.y + scene.worldOffset.y;
        }
        // Cleanup card layer — the Act 1 ending is over; release the
        // cutscene lock taken in triggerWellnessOfficer
        scene._cutsceneActive = false;
        bg.destroy(); dust.destroy(); topRule.destroy(); botRule.destroy();
        subtitle.destroy();
        letterObjs.forEach(t => t.destroy());
        // Restore master gain for normal play
        try {
          if (typeof masterGain !== 'undefined' && masterGain && ambientAudio.ctx) {
            masterGain.gain.linearRampToValueAtTime(1, ambientAudio.ctx.currentTime + 1.5);
          }
        } catch (e) {}
      }, 2100);
    }, holdEndAt);
  },
  // ── ITEM NOTIFICATION ─────────────────────────────────────────────
  // Shows a brief message at the top of the screen when items are given.
  showItemNotification(text) {
    const cam = this.cameras.main;
    const note = this.add.text(cam.width / 2, 110, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ccaa55',
      stroke: '#0e0e14',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1003).setAlpha(0);

    // Fade in, hold, fade out
    this.tweens.add({
      targets: note,
      alpha: { from: 0, to: 1 },
      y: { from: 120, to: 105 },
      duration: 500,
      ease: 'Sine.easeOut',
      hold: 2500,
      yoyo: true,
      onComplete: () => note.destroy(),
    });
  },
  // ── COMFORT WISP VISION ─────────────────────────────────────────────
  // Wordless warm 15s sequence: amber vignette, golden petals, distant
  // crowd ambience. Closes with theme_awakening at 35% for 20s.
  playComfortVision() {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;

    // Lock state + tag the choice (already 'comfort', but be explicit)
    gameState.ritualState.wisp_choice = 'comfort';
    // Regency Attention: 0 (no adjustAttention call)

    // ── Warm amber vignette (radial-ish, 35% at edges) ──────────────
    const vignette = this.add.graphics().setScrollFactor(0).setDepth(2000).setAlpha(0);
    // Build a soft amber frame: darker rings near the edge
    const amber = 0xffc878;
    const ring = (inset, alpha) => {
      vignette.lineStyle(60 - inset, amber, alpha);
      vignette.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    };
    ring(0,  0.35);
    ring(20, 0.22);
    ring(40, 0.12);
    this.tweens.add({ targets: vignette, alpha: 1, duration: 2000, ease: 'Sine.easeOut' });

    // ── Slight global warm wash on the world camera ─────────────────
    const warmWash = this.add.rectangle(0, 0, W, H, 0xffd9a0, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1999);
    this.tweens.add({ targets: warmWash, alpha: 0.10, duration: 2000 });

    // ── Golden petal / mote particles (8–12) ────────────────────────
    const petals = [];
    const petalCount = 10;
    for (let i = 0; i < petalCount; i++) {
      const px0 = Math.random() * W;
      const py0 = Math.random() * H;
      const p = this.add.graphics().setScrollFactor(0).setDepth(2001).setAlpha(0);
      // tiny golden mote with halo
      p.fillStyle(0xfff0b0, 0.35); p.fillCircle(0, 0, 4);
      p.fillStyle(0xffe070, 0.85); p.fillCircle(0, 0, 1.6);
      p.x = px0; p.y = py0;
      p._vx = 0.20 + Math.random() * 0.25; // slow rightward drift
      p._vy = 0.10 + Math.random() * 0.15; // slow downward drift
      petals.push(p);
      this.tweens.add({ targets: p, alpha: 0.95, duration: 1600, delay: i * 80 });
    }

    // Drive particle drift via a timer event
    let driftTime = 0;
    const driftEvt = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        driftTime += 30;
        for (const p of petals) {
          p.x += p._vx;
          p.y += p._vy + Math.sin((driftTime + p.x) * 0.004) * 0.15;
          if (p.x > W + 10) p.x = -10;
          if (p.y > H + 10) p.y = -10;
        }
      }
    });

    // ── Distant warm crowd ambience (Web Audio, very quiet) ─────────
    let crowdNodes = null;
    try {
      const ctx = (window.ambientAudio && window.ambientAudio.ctx) ||
                  new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0;
      master.connect(ctx.destination);
      // Pink-ish noise = distant chatter bed
      const bufLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastV = 0;
      for (let i = 0; i < bufLen; i++) {
        const w = (Math.random() * 2 - 1) * 0.5;
        lastV = (lastV + w * 0.04) * 0.985;
        data[i] = lastV;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 700;
      noise.connect(lp); lp.connect(master);
      // Hurdy-gurdy-ish drone: detuned sines
      const droneA = ctx.createOscillator(); droneA.type = 'sine'; droneA.frequency.value = 196;
      const droneB = ctx.createOscillator(); droneB.type = 'sine'; droneB.frequency.value = 294;
      const droneG = ctx.createGain(); droneG.gain.value = 0.018;
      droneA.connect(droneG); droneB.connect(droneG); droneG.connect(master);
      noise.start(); droneA.start(); droneB.start();
      master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
      master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 10);
      master.gain.linearRampToValueAtTime(0.0,  ctx.currentTime + 15);
      crowdNodes = { noise, droneA, droneB, ctx };
    } catch (e) { /* audio failed silently */ }

    // ── Wisp dim+fade over 3s, starting at 12s ──────────────────────
    this.time.delayedCall(12000, () => {
      if (this._wispGfx) {
        this.tweens.add({
          targets: this._wispGfx, alpha: 0,
          duration: 3000, ease: 'Sine.easeOut',
        });
      }
    });

    // ── At 10s: begin softening warmth ──────────────────────────────
    this.time.delayedCall(10000, () => {
      this.tweens.add({ targets: vignette, alpha: 0, duration: 5000 });
      this.tweens.add({ targets: warmWash, alpha: 0, duration: 5000 });
      for (const p of petals) {
        p._vx *= 0.4; p._vy *= 0.4;
        this.tweens.add({ targets: p, alpha: 0, duration: 5000 });
      }
    });

    // ── At 15s: cleanup + start awakening theme tail ────────────────
    this.time.delayedCall(15000, () => {
      driftEvt.remove();
      vignette.destroy(); warmWash.destroy();
      petals.forEach(p => p.destroy());
      try {
        if (crowdNodes) {
          crowdNodes.noise.stop();
          crowdNodes.droneA.stop();
          crowdNodes.droneB.stop();
        }
      } catch (e) {}
      // theme_awakening at 35% for 20s, then fade
      if (typeof music !== 'undefined' && music.playAwakening) {
        music.playAwakening(0.35, 4000);
        // Fade out after 20s
        this.time.delayedCall(20000, () => {
          if (music.sounds && music.sounds.theme_awakening) {
            music._tweenTo && music._tweenTo('theme_awakening', 0, 4000);
          }
        });
      }
    });
  },
  // ── Regency hooks for systems that don't yet exist in code, but
  // will be called from future NPC dialogue / item interactions. ───
  showCodexToEzra() {
    if (gameState.regencyFired.codex_shown_ezra) return;
    gameState.regencyFired.codex_shown_ezra = true;
    adjustAttention(+1, 'codex_shown_ezra');
  },
  // ── MARKER GLOW UPDATE ────────────────────────────────────────────
  // Once the quest is active, draw a slow pulsing blue halo around each
  // unplaced marker. Completed markers fade their halo to warm amber.
  updateMarkerGlows(time) {
    if (!gameState.questActive) return;
    if (!this._markerGlowGfx) {
      this._markerGlowGfx = this.add.graphics();
      this._markerGlowGfx.setDepth(450);
    }
    const g = this._markerGlowGfx;
    g.clear();
    MARKERS.forEach((m, idx) => {
      const iso = cartToIso(m.x, m.y);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y;
      const mg = this.markerGraphics[idx];
      const completed = m.placed;
      if (!completed) {
        // Slow pulsing blue (0.5–1.0 alpha)
        const pulse = 0.55 + 0.35 * (Math.sin(time * 0.0022 + idx * 0.7) * 0.5 + 0.5);
        for (let r = 22; r > 4; r -= 4) {
          const a = (1 - r / 22) * 0.18 * pulse;
          g.fillStyle(0x4466cc, a);
          g.fillCircle(px, py - 1, r);
        }
        g.fillStyle(0x88aaff, 0.35 * pulse);
        g.fillCircle(px, py - 2, 4);
      } else {
        // Warm amber halo (with brief blue→amber tween via _glowProgress)
        const t = mg && mg._glowProgress != null ? mg._glowProgress : 1;
        const r1 = Math.round(0x44 + (0xff - 0x44) * t);
        const g1 = Math.round(0x66 + (0xb0 - 0x66) * t);
        const b1 = Math.round(0xcc + (0x40 - 0xcc) * t);
        const col = (r1 << 16) | (g1 << 8) | b1;
        const pulse = 0.7 + 0.2 * Math.sin(time * 0.0015 + idx);
        for (let r = 18; r > 4; r -= 3) {
          const a = (1 - r / 18) * 0.16 * pulse;
          g.fillStyle(col, a);
          g.fillCircle(px, py - 1, r);
        }
      }
    });
  },
  updateAwakeningHooks(delta) {
    if (!this.firstVisit) return;
    const moving = (this.cursors && (this.cursors.up.isDown || this.cursors.down.isDown ||
                                     this.cursors.left.isDown || this.cursors.right.isDown));
    if (moving && !this._awakMoved) {
      this._awakMoved = true;
      if (this._awakPrompt) {
        this.tweens.add({
          targets: this._awakPrompt, alpha: 0, duration: 800,
          onComplete: () => { this._awakPrompt && this._awakPrompt.destroy(); this._awakPrompt = null; },
        });
      }
      if (!this._awakMeloStarted) {
        this._awakMeloStarted = true;
        ambientAudio.playFolkMelody(false);
      }
    }
    if (!moving) {
      this._awakIdleTimer += delta;
      if (this._awakIdleTimer > 30000 && !this._awakVoiceShown) {
        this._awakVoiceShown = true;
        this.showAwakeningVoice("The road brought you here.\nIt doesn't do that for everyone.");
      }
    } else {
      this._awakIdleTimer = 0;
    }
  },
});
