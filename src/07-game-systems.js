
// ═══ 07 GAME SYSTEMS — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // ── THREAD KNOT INVENTORY HUD ─────────────────────────────────────
  // Five small blue glowing knots in the top-right corner. They disappear
  // one by one as the player places knots at markers.
  createThreadKnotHUD() {
    const cam = this.cameras.main;
    this.knotHudIcons = [];
    const startX = cam.width - 30;
    const y = 30;
    for (let i = 0; i < 5; i++) {
      const g = this.add.graphics();
      g.setScrollFactor(0).setDepth(1003).setVisible(false);
      const x = startX - i * 22;
      // Soft blue glow
      g.fillStyle(0x4466aa, 0.25);
      g.fillCircle(x, y, 9);
      g.fillStyle(0x5577cc, 0.4);
      g.fillCircle(x, y, 6);
      // Knot core
      g.fillStyle(0x3a5598, 1);
      g.fillCircle(x, y, 4);
      // Tiny highlight
      g.fillStyle(0xa8c0ff, 0.9);
      g.fillRect(x - 1, y - 1, 1, 1);
      // Two short thread tails
      g.lineStyle(1, 0x3a5598, 0.95);
      g.beginPath(); g.moveTo(x - 3, y + 3); g.lineTo(x - 5, y + 6); g.strokePath();
      g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 5, y + 6); g.strokePath();
      this.knotHudIcons.push({ g, baseAlpha: 1, phase: i * 0.6 });
    }
  },
  showThreadKnotHUD() {
    if (!this.knotHudIcons) return;
    this.knotHudIcons.forEach(k => { k.g.setVisible(true); k.g.setAlpha(0); });
    this.tweens.add({
      targets: this.knotHudIcons.map(k => k.g),
      alpha: 1, duration: 900,
    });
  },
  removeThreadKnotFromHUD() {
    if (!this.knotHudIcons) return;
    // Remove the rightmost still-visible icon (last in placed order)
    for (let i = this.knotHudIcons.length - 1; i >= 0; i--) {
      const k = this.knotHudIcons[i];
      if (k.g.visible && k.g.alpha > 0.05) {
        this.tweens.add({
          targets: k.g, alpha: 0, duration: 600,
          onComplete: () => k.g.setVisible(false),
        });
        return;
      }
    }
  },
  handleMovement(delta) {
    // Frozen while the journal, pause menu, or a modal overlay is open
    if (this._paused || this._pauseLayer
      || this._domovoiSelectorOpen || this._regencyDocOpen) return;
    let dx = 0, dy = 0;
    if (this.cursors.up.isDown)    { dx -= 1; dy -= 1; }
    if (this.cursors.down.isDown)  { dx += 1; dy += 1; }
    if (this.cursors.left.isDown)  { dx -= 1; dy += 1; }
    if (this.cursors.right.isDown) { dx += 1; dy -= 1; }

    this.isWalking = (dx !== 0 || dy !== 0);

    if (!this.isWalking) {
      // Idle — reset bob smoothly
      this.walkBob *= 0.9;
      // Idle look-around: trigger after 5 seconds of stillness
      this.idleTimer = (this.idleTimer || 0) + delta;
      if (this.idleTimer > 5000 && !this.idleAnimActive) {
        this.startIdleLookAround();
        this.idleTimer = 0; // wait another 5s before next loop
      }
      this.drawPlayerFrame(this.walkBob, this.playerFacing);
      return;
    }
    // Movement cancels idle state
    this.idleTimer = 0;
    this.idleAnimActive = false;
    this.idleHeadOffset = 0;

    // Determine facing direction
    if (dx > 0 && dy < 0) this.playerFacing = 'ne';
    else if (dx > 0 && dy > 0) this.playerFacing = 'se';
    else if (dx < 0 && dy > 0) this.playerFacing = 'sw';
    else if (dx < 0 && dy < 0) this.playerFacing = 'nw';
    else if (dx > 0) this.playerFacing = 'se';
    else if (dx < 0) this.playerFacing = 'nw';
    else if (dy > 0) this.playerFacing = 'se';
    else if (dy < 0) this.playerFacing = 'nw';

    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    // Stance speed: Quiet Step overrides Hurried — you cannot rush quietly
    const stanceMul = this._stanceQuiet ? 0.55
      : (this.briskKey && this.briskKey.isDown ? 1.5 : 1);
    const speed = this.moveSpeed * stanceMul * (delta / 16);
    const newX = this.playerCartX + dx * speed;
    const newY = this.playerCartY + dy * speed;
    const tileX = Math.floor(newX), tileY = Math.floor(newY);

    // Collision reads the ACTIVE town's grid — interiors bring their own
    const grid = (this.town && this.town.map) || map;
    const N = (this.town && this.town.size) || MAP_SIZE;
    if (tileX >= 0 && tileX < N && tileY >= 0 && tileY < N) {
      if (grid[tileY][tileX] !== 3) {
        this.playerCartX = newX; this.playerCartY = newY;
      } else {
        const sx2 = this.playerCartX + dx * speed;
        const sxT = Math.floor(sx2);
        if (sxT >= 0 && sxT < N && grid[Math.floor(this.playerCartY)][sxT] !== 3)
          this.playerCartX = sx2;
        const sy2 = this.playerCartY + dy * speed;
        const syT = Math.floor(sy2);
        if (syT >= 0 && syT < N && grid[syT][Math.floor(this.playerCartX)] !== 3)
          this.playerCartY = sy2;
      }
    }
    this.playerCartX = Phaser.Math.Clamp(this.playerCartX, 0.5, N - 0.5);
    this.playerCartY = Phaser.Math.Clamp(this.playerCartY, 0.5, N - 0.5);

    // Walk animation
    this.walkBob += delta * 0.005;
    this.drawPlayerFrame(this.walkBob, this.playerFacing);

    // Footstep dust (throttled)
    if (Math.random() < 0.3) this.spawnFootDust();
  },
  // Stereo pan for a world-x position relative to the camera view.
  _panFor(worldX) {
    const cam = this.cameras.main;
    const rel = (worldX - cam.midPoint.x) / (cam.width / cam.zoom / 2);
    return Phaser.Math.Clamp(rel, -1, 1) * 0.75;
  },
  // ── REGENCY ATTENTION TELLS ────────────────────────────────────────
  // The meter itself stays invisible, but crossing a threshold leaves
  // one soft diegetic mark: high attention — a crow lands nearby and
  // watches; low attention — the wayside shrines pulse warm for a beat.
  updateRegencyTells() {
    if (!gameState._attnTell || this._attnTellBusy) return;
    if (this.dialogueActive || this.visionActive || this._paused || this._pauseLayer) return;
    const kind = gameState._attnTell;
    gameState._attnTell = null;
    if (kind === 'high' && !this._attnHighShown) {
      this._attnHighShown = true; this._attnTellBusy = true;
      this._showWatcherCrow();
    } else if (kind === 'low' && !this._attnLowShown) {
      this._attnLowShown = true; this._attnTellBusy = true;
      this._showShrineWarmth();
    }
  },
  _showWatcherCrow() {
    // A second crow — not the idol's — lands two tiles from the player,
    // watches for six seconds, and leaves without comment.
    const px = Phaser.Math.Clamp(this.playerCartX + 2, 1, MAP_SIZE - 2);
    const py = Phaser.Math.Clamp(this.playerCartY + 1, 1, MAP_SIZE - 2);
    const iso = cartToIso(px, py);
    const wx = iso.x + this.worldOffset.x, wy = iso.y + this.worldOffset.y;
    const g = this.add.graphics().setDepth(996).setAlpha(0);
    // Small hunched crow, facing the player
    g.fillStyle(0x14121a, 1);
    g.fillEllipse(wx, wy - 4, 9, 6);             // body
    g.fillCircle(wx - 4, wy - 8, 3);             // head
    g.fillTriangle(wx - 7, wy - 8, wx - 10, wy - 7, wx - 7, wy - 6); // beak
    g.fillStyle(0x2a2836, 1);
    g.fillEllipse(wx + 1, wy - 5, 5, 3);         // wing sheen
    g.fillStyle(0xc8922a, 0.9);
    g.fillRect(wx - 5, wy - 9, 1, 1);            // one amber eye — watching
    g.y = -14;
    this.tweens.add({ targets: g, alpha: 1, y: 0, duration: 700, ease: 'Sine.easeOut' });
    try { sfx.play('crow_caw', { volume: 0.35, pan: this._panFor(wx) }); } catch (e) {}
    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: g, alpha: 0, y: -18, duration: 600, ease: 'Sine.easeIn',
        onComplete: () => { g.destroy(); this._attnTellBusy = false; },
      });
    });
  },
  _showShrineWarmth() {
    // All four shrines breathe warm amber, once, together.
    const g = this.add.graphics().setDepth(995);
    try { sfx.play('shrine_glow', { volume: 0.35 }); } catch (e) {}
    const proxy = { t: 0 };
    this.tweens.add({
      targets: proxy, t: Math.PI, duration: 4200, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const a = Math.sin(proxy.t) * 0.35;
        g.clear();
        for (const s of shrines) {
          const iso = cartToIso(s.x, s.y);
          const x = iso.x + this.worldOffset.x, y = iso.y + this.worldOffset.y;
          g.fillStyle(0xffc878, a * 0.4); g.fillCircle(x, y - 14, 22);
          g.fillStyle(0xffe0a0, a);       g.fillCircle(x, y - 14, 9);
        }
      },
      onComplete: () => { g.destroy(); this._attnTellBusy = false; },
    });
  },
  // ── NIGHT ROADS (bible rule, LBA mandate) ──────────────────────────
  // "The roads sometimes rearrange at night unless you carry blue thread
  // soaked in wine." Before Baba's thread is in hand, the village edge
  // turns night wanderers quietly around. Fog creeps first — fair warning.
  updateNightRoads(time, delta) {
    const night = gameState.gameHour >= 20 || gameState.gameHour < 6;
    const protectedByThread = gameState.inventory.includes('thread_knots')
      || gameState.questComplete; // straightened roads no longer wander
    const active = night && !protectedByThread
      && !this.dialogueActive && !this.visionActive
      && !this._paused && !this._pauseLayer && !this._cutsceneActive;

    if (!this._nightFogGfx) {
      this._nightFogGfx = this.add.graphics().setScrollFactor(0).setDepth(1004);
    }
    const cam = this.cameras.main;
    const cx = CENTER - 0.5, cy = CENTER - 0.5;
    const d = Math.hypot(this.playerCartX - cx, this.playerCartY - cy);

    // Creeping edge fog from radius 9 outward
    const fogF = active ? Phaser.Math.Clamp((d - 9) / 2.5, 0, 1) : 0;
    this._nightFogGfx.clear();
    if (fogF > 0.02) {
      const W = cam.width, H = cam.height;
      const a = fogF * 0.55;
      this._nightFogGfx.fillStyle(0x05050c, a);
      const band = Math.round(90 * fogF);
      this._nightFogGfx.fillRect(0, 0, W, band);
      this._nightFogGfx.fillRect(0, H - band, W, band);
      this._nightFogGfx.fillRect(0, 0, band, H);
      this._nightFogGfx.fillRect(W - band, 0, band, H);
      this._nightFogGfx.fillStyle(0x05050c, a * 0.5);
      this._nightFogGfx.fillRect(band, band, W - band * 2, Math.round(band * 0.7));
    }

    // Past radius 11.2 the road turns beneath them
    if (active && d > 11.2 && !this._nightTurnCooldown) {
      this._nightTurnCooldown = true;
      this.time.delayedCall(5000, () => { this._nightTurnCooldown = false; });
      // Pull the player back along their own bearing, facing the village
      const ang = Math.atan2(this.playerCartY - cy, this.playerCartX - cx);
      const fade = this.add.rectangle(0, 0, cam.width, cam.height, 0x05050c, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(4000).setAlpha(0);
      this.tweens.add({
        targets: fade, alpha: 1, duration: 260, yoyo: true, hold: 220,
        onYoyo: () => {
          this.playerCartX = cx + Math.cos(ang) * 7.5;
          this.playerCartY = cy + Math.sin(ang) * 7.5;
          this.updatePlayerPosition();
        },
        onComplete: () => fade.destroy(),
      });
      try { sfx.play('vision_whoosh', { volume: 0.4 }); } catch (e) {}
      this.showItemNotification(this._nightTurnSeen
        ? 'The road has turned beneath you again.'
        : 'The road has turned beneath you. The village is ahead — again.');
      this._nightTurnSeen = true;
    }
  },
  // ── THREAD GUIDANCE SHIMMER ────────────────────────────────────────
  // Baba's blue thread is soaked in wine — it remembers where it wants
  // to go. When the player stands still mid-quest, faint blue motes
  // drift from their hand toward the nearest unplaced marker. Guidance
  // without a minimap.
  updateThreadGuidance(time, delta) {
    const active = gameState.knotsGiven && gameState.knotsPlaced < 5
      && !this.dialogueActive && !this.visionActive
      && !this._paused && !this._pauseLayer;
    const moving = this.cursors && (this.cursors.up.isDown || this.cursors.down.isDown
      || this.cursors.left.isDown || this.cursors.right.isDown);
    if (!active || moving) {
      this._threadStill = 0;
      if (this._threadGfx) this._threadGfx.clear();
      return;
    }
    this._threadStill = (this._threadStill || 0) + delta;
    if (this._threadStill < 1500) return; // begins after a beat of stillness

    // Nearest unplaced marker
    let best = null, bestD = Infinity;
    for (const m of MARKERS) {
      if (m.placed) continue;
      const d = Math.hypot(this.playerCartX - m.x, this.playerCartY - m.y);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best) { if (this._threadGfx) this._threadGfx.clear(); return; }

    if (!this._threadGfx) this._threadGfx = this.add.graphics().setDepth(997);
    const g = this._threadGfx; g.clear();
    const pIso = cartToIso(this.playerCartX, this.playerCartY);
    const mIso = cartToIso(best.x, best.y);
    const sx = pIso.x + this.worldOffset.x;
    const sy = pIso.y + this.worldOffset.y - 20; // from the hand, not the feet
    const ang = Math.atan2(mIso.y - pIso.y, mIso.x - pIso.x);
    // Five motes cycling outward along the direction, with a soft wobble
    const cycle = (time % 2400) / 2400;
    for (let i = 0; i < 5; i++) {
      const f = (cycle + i * 0.2) % 1;
      const dist = 14 + f * 46;
      const wob = Math.sin(time * 0.004 + i * 1.7) * 3;
      const x = sx + Math.cos(ang) * dist - Math.sin(ang) * wob;
      const y = sy + Math.sin(ang) * dist + Math.cos(ang) * wob;
      const a = (1 - f) * 0.55;
      g.fillStyle(0x6688cc, a * 0.5); g.fillCircle(x, y, 3);
      g.fillStyle(0x9ab4ee, a);       g.fillCircle(x, y, 1.5);
    }
  },
  // ── NPC INTERACTION (state-aware) ──────────────────────────────────
  // Selects the correct dialogue branch based on gameState,
  // then fires a callback when the conversation ends to update state.
  handleInteraction() {
    // No world interactions while an overlay, cutscene, or pause owns the
    // input — E presses were opening NPC dialogue UNDER the pause menu
    // and locking ESC out entirely
    if (this._paused || this._pauseLayer || this._cutsceneActive
      || this._domovoiSelectorOpen || this._regencyDocOpen) {
      if (this.interactPrompt) this.interactPrompt.setVisible(false);
      return;
    }
    // ── Interior doors (checked before NPCs so the doorway wins when
    //    the player is pressed right up against it) ──
    const doors = (this.town && this.town.doors) || [];
    for (const door of doors) {
      if (door.requires && !door.requires()) continue;
      const dd = Math.hypot(this.playerCartX - door.x, this.playerCartY - door.y);
      if (dd <= door.radius) {
        const dIso = cartToIso(door.x, door.y);
        this.interactPrompt.setText(door.prompt);
        this.interactPrompt.setPosition(
          dIso.x + this.worldOffset.x,
          dIso.y + this.worldOffset.y - 34
        );
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          this._enterInterior(door.to);
        }
        return;
      }
    }
    // ── Roads out — travel triggers (same pattern as doors) ──
    const travels = (this.town && this.town.travels) || [];
    for (const tr of travels) {
      if (tr.requires && !tr.requires()) continue;
      const td = Math.hypot(this.playerCartX - tr.x, this.playerCartY - tr.y);
      if (td <= tr.radius) {
        const tIso = cartToIso(tr.x, tr.y);
        this.interactPrompt.setText(tr.prompt);
        this.interactPrompt.setPosition(
          tIso.x + this.worldOffset.x,
          tIso.y + this.worldOffset.y - 34
        );
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          this._travelTo(tr);
        }
        return;
      }
    }
    // ── Town examine points (generic; interiors have their own) ──
    const tExamines = (this.town && this.town.examines) || [];
    for (const pt of tExamines) {
      if (pt.requires && !pt.requires()) continue;
      const ed = Math.hypot(this.playerCartX - pt.x, this.playerCartY - pt.y);
      if (ed <= pt.radius) {
        const eIso = cartToIso(pt.x, pt.y);
        this.interactPrompt.setText(pt.prompt);
        this.interactPrompt.setPosition(
          eIso.x + this.worldOffset.x,
          eIso.y + this.worldOffset.y - 40
        );
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          this.openDialogue(pt.name, pt.lines, pt.journal
            ? () => { try { addJournalEntry(pt.journal); } catch (e) {} }
            : null, 'simple');
        }
        return;
      }
    }
    // Beyond doors/travel, everything below is Wyrdów's cast + quest
    if (this.town.id !== 'wyrdow') {
      if (this.interactPrompt) this.interactPrompt.setVisible(false);
      return;
    }
    // Check Baba proximity
    const bdx = this.playerCartX - BABA.cartX;
    const bdy = this.playerCartY - BABA.cartY;
    const babaDist = Math.sqrt(bdx * bdx + bdy * bdy);

    // Check Zuzka proximity
    const zdx = this.playerCartX - ZUZKA.cartX;
    const zdy = this.playerCartY - ZUZKA.cartY;
    const zuzkaDist = Math.sqrt(zdx * zdx + zdy * zdy);

    // An unplaced quest marker in reach outranks small talk — the knot
    // "Behind Baba's House" sits 1.3 tiles from Baba herself
    const markerInReach = gameState.knotsGiven && gameState.knotsPlaced < 5
      && MARKERS.some(mk => !mk.placed
        && Math.hypot(this.playerCartX - mk.x, this.playerCartY - mk.y) <= 2.0);
    if (babaDist <= BABA.interactRadius && !markerInReach
      && this.babaSprite && this.babaSprite.visible) {
      // (after dusk she's indoors — enter the house to find her)
      const iso = cartToIso(BABA.cartX, BABA.cartY);
      this.interactPrompt.setText('[E] Talk to Baba Elżbieta');
      this.interactPrompt.setPosition(
        iso.x + this.worldOffset.x,
        iso.y + this.worldOffset.y - 48
      );
      this.interactPrompt.setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        const branch = this.getBabaDialogueBranch();
        this.babaBellSwing = 6; // trigger copper bell sway
        // Memory callback — she noticed the perimeter walk (once)
        let babaLines = branch.lines;
        if (gameState.ritualState.perimeter_walked && !gameState._cbBabaPerimeter) {
          gameState._cbBabaPerimeter = true;
          babaLines = branch.lines.concat([
            ">She looks at you a moment longer than usual.",
            "You walked the bounds. The wards mentioned it. Don't let it flatter you — they mention everyone. They don't mention everyone approvingly.",
          ]);
        }
        this.openDialogue('Baba Elżbieta', babaLines, branch.onClose, 'ornate');
      }
    } else if (zuzkaDist <= ZUZKA.interactRadius
      && this.zuzkaSprite && this.zuzkaSprite.visible) {
      // (visibility check: during the closing scene she walks into Baba's
      // house — the prompt used to let you talk to an invisible Zuzka)
      // Fallback: player reached Zuzka before her auto-approach completed
      if (this._zuzkaApproaching || this._zuzkaApproachQueued) {
        this.cancelZuzkaApproach();
      }
      const iso = cartToIso(ZUZKA.cartX, ZUZKA.cartY);
      this.interactPrompt.setText('[E] Talk to Zuzka');
      this.interactPrompt.setPosition(
        iso.x + this.worldOffset.x,
        iso.y + this.worldOffset.y - 48
      );
      this.interactPrompt.setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        const branch = this.getZuzkaDialogueBranch();
        // Memory callback — she saw you keep the noon silence (once)
        let zuzkaLines = branch.lines;
        if (gameState.ritualState.noon_silence_kept && !gameState._cbZuzkaNoon) {
          gameState._cbZuzkaNoon = true;
          zuzkaLines = branch.lines.concat([
            "You stood still at the bell. I saw. Even the chickens were impressed, and they are very hard to impress.",
          ]);
        }
        this.openDialogue('Zuzka', zuzkaLines, branch.onClose, 'simple');
      }
    } else if (this.tryEzraInteraction()) {
      // handled
    } else if (!this.handleMarkerInteraction()) {
      this.interactPrompt.setVisible(false);
    }
  },
  // ── OBSERVATION MECHANIC ──────────────────────────────────────────
  // Hold O for 1.5s while still: subtle zoom + golden vignette + a faint
  // breath sound. If standing within an observation zone, that zone's
  // detail line fades in bottom-left for 6s. Each zone fires once per
  // session. Releasing O or moving cancels immediately.
  setupObservationZones() {
    this.observationZones = [
      { id: 'idol',       x: CENTER - 0.5,    y: CENTER - 0.5, r: 3,
        text: "The idol's eyes are closed. You are almost certain they were open a moment ago." },
      { id: 'inn_window', x: 6,               y: 9,            r: 2,
        text: "One of the boards on the window is newer than the others. It was replaced from the inside." },
      { id: 'inn_door',   x: 7,               y: 9,            r: 1.5,
        text: "The offering bowl is empty. There are no animal tracks around it. Whatever takes the food doesn't touch the ground." },
      { id: 'baba_door',  x: BABA.cartX,      y: BABA.cartY,   r: 2,
        text: "The copper bells haven't moved. But they're warm — warmer than the air around them." },
      { id: 'dead_tree',  x: MAP_SIZE - 4,    y: 3,            r: 2,
        text: "The roots go deeper than they should for a dead tree. The earth around them is slightly disturbed — recently, and carefully." },
      { id: 'zuzka',      x: ZUZKA.cartX,     y: ZUZKA.cartY,  r: 2,
        text: "One firefly in the jar is slightly brighter than the others. It pulses in the same rhythm as the mark on your hand." },
      { id: 'marsh_edge', x: CENTER - 0.5,    y: MAP_SIZE - 3, r: 2,
        text: "The grass at the road's edge is flattened in a direction that leads away from the village. Not by wind — by someone moving quickly." },
      { id: 'ezra',          x: EZRA.cartX,       y: EZRA.cartY,     r: 1.6,
        text: "His hands never shake. He has been doing this for a very long time. The needle moves with the certainty of someone who has never once doubted that mending things is worthwhile." },
      { id: 'ezra_boots',    x: EZRA.cartX - 0.3, y: EZRA.cartY + 0.2, r: 1.2,
        text: "The boots have no owner's name. The sole is worn in a pattern you recognise — the same uneven gait as the figure in the third vision. The one who almost turned around.\n\nA small copper wire is wound around the left heel. Recently. The leather around it is still uncracked." },
      { id: 'ezra_workbench', x: EZRA.cartX - 1.2, y: EZRA.cartY,     r: 1.4,
        text: "A small drawer is slightly open. Inside: a folded piece of paper, very old, a single word in careful handwriting. The word is a name. You can't quite read it from here." },
      { id: 'ezra_stool_wire', x: EZRA.cartX,     y: EZRA.cartY + 0.4, r: 1.0,
        text: "The space where the copper wire sat in his apron pocket has a small impression — it's been there a long time. Eleven years. You can see where the wire's shape wore into the fabric.",
        requires: () => gameState.ezraState.copperWireGiven },
    ];
    // observed zones tracked on gameState.observedZones (array)
    this._obsHoldTime = 0;
    this._obsActive = false;
    this._obsPlayerLastX = 0;
    this._obsPlayerLastY = 0;

    const cam = this.cameras.main;
    // Golden vignette overlay (camera-locked, hidden by default)
    this._obsVignette = this.add.graphics();
    this._obsVignette.setScrollFactor(0).setDepth(1080).setAlpha(0);
    const W = cam.width, H = cam.height;
    // Soft warm edge — concentric semitransparent rings hugging the edges
    for (let i = 0; i < 14; i++) {
      const a = 0.025 + i * 0.012;
      const inset = i * 12;
      this._obsVignette.lineStyle(14, 0xc89a48, a);
      this._obsVignette.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    }

    // Detail text — bottom-left, italic, no frame
    this._obsText = this.add.text(28, cam.height - 60, '', {
      fontFamily: 'Georgia, serif', fontSize: '14px',
      color: '#d8c89a', fontStyle: 'italic',
      stroke: '#0a0810', strokeThickness: 2,
      wordWrap: { width: cam.width * 0.48 },
    }).setScrollFactor(0).setDepth(1081).setAlpha(0);
    this._obsTextHoldTimer = 0;
  },
  // ── FOLKLORE RITUAL SYSTEM ────────────────────────────────────────
  // Five optional rituals. None are explained, none block progress, none
  // produce a notification when completed — only the world's reaction.
  setupRituals() {
    // ── Ritual 1: Perimeter Walk ──
    // 8 boundary waypoints around the map. The player must pass within
    // 1.6 tiles of each at least once, in any order.
    const M = MAP_SIZE - 1;
    this._perimeterWaypoints = [
      { x: 1, y: 1, hit: false }, { x: M / 2, y: 1, hit: false }, { x: M - 1, y: 1, hit: false },
      { x: M - 1, y: M / 2, hit: false }, { x: M - 1, y: M - 1, hit: false },
      { x: M / 2, y: M - 1, hit: false }, { x: 1, y: M - 1, hit: false },
      { x: 1, y: M / 2, hit: false },
    ];
    // Restore partial progress — 7/8 waypoints used to reset on reload
    (gameState.perimeterHits || []).forEach(i => {
      if (this._perimeterWaypoints[i]) this._perimeterWaypoints[i].hit = true;
    });

    // ── Ritual 2: Domovoi Offering ──
    // Door zone position (matches inn doorstep observation zone)
    this._domovoiZone = { x: 7, y: 9, r: 1.5 };
    // Sequence of items left at the door — mirrored from the save so a
    // reload mid-ritual doesn't eat the bread and reset the sequence
    this._domovoiSequence = (gameState.domovoiSequence || []).slice();

    // World items to find: bread (market) and salt (near a house door).
    // Stored as collectible spawns; player picks them up by walking onto.
    this._worldItems = [
      { id: 'bread', x: 11, y: 16, taken: false, color: 0xc8a468 },
      { id: 'salt',  x: 16, y: 8,  taken: false, color: 0xeeeae0 },
      // (taken flags are re-synced from gameState.worldItemsTaken below —
      //  without that, every reload respawned the items for duplication)
      // Memory Fragment under the south signpost — only visible after Domovoi Scene 2
      { id: 'memory_fragment',
        x: CENTER - 0.5, y: MAP_SIZE - 2.2,
        taken: false, color: 0xa8884a,
        requires: () => gameState.domovoiState.sceneShown === 2 || gameState.domovoiState.sceneShown >= 2,
        onPickup: () => {
          gameState.domovoiState.signpostFragmentFound = true;
          try { addJournalEntry('doc_rivka'); } catch (e) {}
          gameState.memoryFragments = gameState.memoryFragments || [];
          if (!gameState.memoryFragments.includes('signpost'))
            gameState.memoryFragments.push('signpost');
          this.showItemNotification('Picked up: Memory Fragment (signpost)');
          // Full-screen Regency memorandum
          this.showRegencyDocument(
            'INTERNAL MEMORANDUM\nOffice of Cultural Hygiene — Research Division\nRE: Project RIVKA — Status Update\nDate: [REDACTED]',
            'The research team has been located. Asset retrieval is underway. ' +
            'The primary researcher has dispersed the documentation — confirmed ' +
            '5 fragments, locations unknown. Priority: prevent assembly.\n\n' +
            'Note: The methodology is more viable than initial assessments ' +
            'suggested. Under no circumstances should this reach the general ' +
            'population. The implications for Regency healthcare infrastructure ' +
            'are significant.\n\n' +
            'Authorised for destruction after reading.\n' +
            'This copy was not destroyed.'
          );
        },
      },
    ];
    // Re-sync taken flags from the save so items don't respawn on reload
    this._worldItems.forEach(it => {
      if ((gameState.worldItemsTaken || []).includes(it.id)) it.taken = true;
    });

    // ── Ritual 3: Noon Silence ──
    // Internal day clock — full cycle every 20 real minutes (1,200,000 ms)
    this._dayClockMs = 6 * 60 * 1000; // start at "morning" (~6h in)
    this._dayLengthMs = 20 * 60 * 1000;
    this._noonStartMs = 11.5 * 60 * 1000;
    this._noonEndMs   = 12.5 * 60 * 1000;
    this._noonStillTimer = 0;
    this._noonChimePlayed = false;

    // ── Ritual 4: Stillness of Nocnica ──
    this._nocnicaZones = [
      { x: CENTER - 0.5, y: MAP_SIZE - 2, r: 2.2 }, // southern marsh edge
      { x: MAP_SIZE - 2, y: CENTER - 0.5, r: 2.2 }, // eastern forest edge
    ];
    this._nocnicaTimer = 0;
    this._nocnicaTriggered = false;

    // ── Ritual 5: Wisp Choice ──
    this._wispsSpawned = false;
    this._wispWatchTimer = 0;
    this._wispsSplit = false;
    this._wispsSeen = false;

    // Track previous player position to detect movement deltas
    this._lastInputT = 0;
  },
  // Footstep SFX — crossfade by tile type. Generic across towns.
  updateFootsteps() {
    const moving = this.cursors && (this.cursors.up.isDown || this.cursors.down.isDown
      || this.cursors.left.isDown || this.cursors.right.isDown);
    const fsGrid = (this.town && this.town.map) || map;
    const fsN = (this.town && this.town.size) || MAP_SIZE;
    const tx = Math.max(0, Math.min(fsN - 1, Math.round(this.playerCartX)));
    const ty = Math.max(0, Math.min(fsN - 1, Math.round(this.playerCartY)));
    const tile = (fsGrid[ty] && fsGrid[ty][tx]) || 0;
    const onRoad = (tile === 1 || tile === 2 || tile === 5);
    // Quiet Step makes no footstep sound at all — that's the point
    const canWalk = moving && !this.dialogueActive && !this.visionActive
      && !this._paused && !this._stanceQuiet;
    if (canWalk) {
      if (onRoad) {
        try { sfx.loop('footsteps_dirt', 1, 250); sfx.stopLoop('footsteps_grass', 250); } catch (e) {}
      } else {
        try { sfx.loop('footsteps_grass', 1, 250); sfx.stopLoop('footsteps_dirt', 250); } catch (e) {}
      }
    } else {
      try { sfx.stopLoop('footsteps_dirt', 200); sfx.stopLoop('footsteps_grass', 200); } catch (e) {}
    }
  },
  updateRituals(time, delta) {
    if (!this._perimeterWaypoints) return;

    // Advance the internal day clock
    this._dayClockMs = (this._dayClockMs + delta) % this._dayLengthMs;

    // Detect input/movement this frame
    const moving = this.cursors && (this.cursors.up.isDown || this.cursors.down.isDown
      || this.cursors.left.isDown || this.cursors.right.isDown);
    const anyKey = moving || (this.interactKey && this.interactKey.isDown)
      || (this.observeKey && this.observeKey.isDown);

    const px = this.playerCartX, py = this.playerCartY;

    // ── Shrine glow proximity SFX (once per approach) ──
    if (!this._shrineSfxState) this._shrineSfxState = shrines.map(() => false);
    for (let si = 0; si < shrines.length; si++) {
      const d = Math.hypot(px - shrines[si].x, py - shrines[si].y);
      if (d <= 2.2 && !this._shrineSfxState[si]) {
        this._shrineSfxState[si] = true;
        try {
          const siso = cartToIso(shrines[si].x, shrines[si].y);
          sfx.play('shrine_glow', { pan: this._panFor(siso.x + this.worldOffset.x) });
        } catch (e) {}
      } else if (d > 4) {
        this._shrineSfxState[si] = false;
      }
    }


    // Ritual checks stop here while any overlay/cutscene owns the input.
    // (Footstep handling above must keep running so loops stop cleanly.)
    // Without this, navigating the journal during the noon window counted
    // as "breaking the silence" and cost Regency Attention.
    if (this._paused || this._pauseLayer || this.dialogueActive || this.visionActive
      || this._cutsceneActive || this._domovoiSelectorOpen || this._regencyDocOpen) return;

    // ── Ritual 1: Perimeter waypoints ──
    if (!gameState.ritualState.perimeter_walked) {
      let allHit = true;
      for (let wi = 0; wi < this._perimeterWaypoints.length; wi++) {
        const w = this._perimeterWaypoints[wi];
        if (!w.hit) {
          if (Math.hypot(px - w.x, py - w.y) <= 1.8) {
            w.hit = true;
            // Persist partial progress
            if (!gameState.perimeterHits) gameState.perimeterHits = [];
            if (!gameState.perimeterHits.includes(wi)) gameState.perimeterHits.push(wi);
          }
        }
        if (!w.hit) allHit = false;
      }
      if (allHit) {
        gameState.ritualState.perimeter_walked = true;
        try { sfx.play('perimeter_complete'); } catch (e) {}
        try { addJournalEntry('custom_perimeter'); } catch (e) {}
        if (!gameState.regencyFired.perimeter_walked) {
          gameState.regencyFired.perimeter_walked = true;
          adjustAttention(-1, 'perimeter_walked');
        }
      }
    }

    // ── Crossroads linger (visible mark, no NPCs nearby) ──
    if (!gameState.regencyFired.crossroads_linger) {
      const dCenter = Math.hypot(px - (CENTER - 0.5), py - (CENTER - 0.5));
      const dBaba = Math.hypot(px - BABA.cartX, py - BABA.cartY);
      const dZuzka = (typeof ZUZKA !== 'undefined')
        ? Math.hypot(px - ZUZKA.cartX, py - ZUZKA.cartY) : 999;
      const npcNear = dBaba < 5 || dZuzka < 5;
      if (dCenter < 1.8 && !anyKey && !npcNear) {
        this._crossroadsLingerMs = (this._crossroadsLingerMs || 0) + delta;
        if (this._crossroadsLingerMs >= 30000) {
          gameState.regencyFired.crossroads_linger = true;
          adjustAttention(+1, 'crossroads_linger');
        }
      } else {
        this._crossroadsLingerMs = 0;
      }
    }

    // ── World item pickups (bread + salt + memory fragment) ──
    for (const it of this._worldItems) {
      if (it.taken) continue;
      if (it.requires && !it.requires()) continue;
      if (Math.hypot(px - it.x, py - it.y) <= 0.7) {
        it.taken = true;
        if (!gameState.worldItemsTaken) gameState.worldItemsTaken = [];
        gameState.worldItemsTaken.push(it.id); // persisted — no respawn dupes
        gameState.inventory.push(it.id);
        if (it.onPickup) it.onPickup();
        else this.showItemNotification('Picked up: ' + itemDisplayName(it.id));
        try { saveGame(); } catch (e) {}
      }
    }
    // Draw world item sparkles (lazy graphics)
    if (!this._worldItemGfx) {
      this._worldItemGfx = this.add.graphics();
      this._worldItemGfx.setDepth(480);
    }
    this._worldItemGfx.clear();
    for (const it of this._worldItems) {
      if (it.taken) continue;
      if (it.requires && !it.requires()) continue;
      const iso = cartToIso(it.x, it.y);
      const sx = iso.x + this.worldOffset.x;
      const sy = iso.y + this.worldOffset.y;
      this._worldItemGfx.fillStyle(0x000000, 0.35);
      this._worldItemGfx.fillEllipse(sx, sy + 3, 8, 2);
      this._worldItemGfx.fillStyle(it.color, 1);
      this._worldItemGfx.fillRect(sx - 3, sy - 2, 6, 4);
      this._worldItemGfx.fillStyle(0xffffff, 0.4);
      this._worldItemGfx.fillRect(sx - 2, sy - 2, 4, 1);
    }

    // ── Ritual 2: Domovoi offering interaction ──
    if (Math.hypot(px - this._domovoiZone.x, py - this._domovoiZone.y) <= this._domovoiZone.r
        && !this.dialogueActive && !this.visionActive
        && !this._domovoiSelectorOpen && !this._domovoiSpeaking) {
      const offerable = ['bread', 'salt', 'glass_charm', 'firefly', 'memory_fragment'];
      const heldOfferable = gameState.inventory.find(i => offerable.includes(i));
      // Post-fragment trigger: standing at the doorstep with the signpost fragment
      if (gameState.domovoiState.signpostFragmentFound &&
          gameState.domovoiState.sceneShown !== 3 && !this.officerScenePlayed) {
        const iso = cartToIso(this._domovoiZone.x, this._domovoiZone.y);
        this.interactPrompt.setText('[E] Approach the chimney');
        this.interactPrompt.setPosition(iso.x + this.worldOffset.x, iso.y + this.worldOffset.y - 36);
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.playDomovoiScene(3);
        }
      } else if (this.officerScenePlayed && gameState.domovoiState.sceneShown !== 4) {
        // Scene 4 — after Brel arrives
        const iso = cartToIso(this._domovoiZone.x, this._domovoiZone.y);
        this.interactPrompt.setText('[E] Wait by the chimney');
        this.interactPrompt.setPosition(iso.x + this.worldOffset.x, iso.y + this.worldOffset.y - 36);
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          // 5-second cold wait then Scene 4
          this._domovoiSpeaking = true;
          setTimeout(() => this.playDomovoiScene(4), 5000);
        }
      } else if (heldOfferable) {
        const iso = cartToIso(this._domovoiZone.x, this._domovoiZone.y);
        this.interactPrompt.setText('[E] Leave an offering');
        this.interactPrompt.setPosition(iso.x + this.worldOffset.x, iso.y + this.worldOffset.y - 36);
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.openDomovoiOfferingSelector();
        }
      }
    }

    // ── Ritual 3: Noon silence ──
    if (this.isNoon()) {
      if (!this._noonChimePlayed) {
        this._noonChimePlayed = true;
        this.applyNoonLight(true);
        this.playNoonChime();
      }
      if (!anyKey) {
        this._noonStillTimer += delta;
        // 30s of stillness inside the 2-minute noon hour — the old 60s
        // requirement equalled the entire ritual window (impossible)
        if (this._noonStillTimer >= 30000 && !gameState.ritualState.noon_silence_kept) {
          gameState.ritualState.noon_silence_kept = true;
          try { addJournalEntry('custom_noon'); } catch (e) {}
        }
      } else {
        if (this._noonChimePlayed && !gameState.regencyFired.noon_silence_failed) {
          gameState.regencyFired.noon_silence_failed = true;
          adjustAttention(+1, 'noon_silence_failed');
        }
        this._noonStillTimer = 0;
      }
    } else {
      if (this._noonChimePlayed) {
        this._noonChimePlayed = false;
        this.applyNoonLight(false);
      }
      this._noonStillTimer = 0;
    }

    // ── Ritual 4: Stillness of Nocnica (peripheral encounter) ──
    // After dusk, near the marsh or forest edge, if the player stands
    // perfectly still she begins to appear at the EDGE of the screen
    // — never centered, never approached. Looking away from her zone
    // (turning toward her) erases her. Holding still for ~8s lets her
    // fully manifest and bestow a quiet night-blessing.
    if (!gameState.ritualState.nocnica_found && this.isAfterDusk
        && this.isAfterDusk()) {
      let nearestZone = null;
      let nearestD = 99;
      for (const z of this._nocnicaZones) {
        const d = Math.hypot(px - z.x, py - z.y);
        if (d < nearestD) { nearestD = d; nearestZone = z; }
      }
      const inZone = nearestZone && nearestD <= nearestZone.r;
      if (inZone && !anyKey) {
        this._nocnicaTimer += delta;
        // Phase 1: 1.5s of stillness — peripheral hint appears
        if (this._nocnicaTimer >= 1500 && !this._nocnicaPeripheralActive) {
          this.spawnNocnicaPeripheral(nearestZone);
        }
        // Phase 2: 8s of stillness — full manifestation + blessing
        if (this._nocnicaTimer >= 8000 && !this._nocnicaTriggered) {
          this._nocnicaTriggered = true;
          gameState.ritualState.nocnica_found = true;
          try { addJournalEntry('nocnica_cost'); } catch (e) {}
          try { addJournalEntry('custom_nocnica'); } catch (e) {}
          if (!gameState.regencyFired.nocnica_found) {
            gameState.regencyFired.nocnica_found = true;
            adjustAttention(-3, 'nocnica_found');
          }
          this.hideNocnicaPeripheral();
          this.triggerNocnicaAppearance();
        }
      } else {
        if (this._nocnicaTimer > 0 && this._nocnicaPeripheralActive) {
          this.hideNocnicaPeripheral();
        }
        this._nocnicaTimer = 0;
      }
      // Keep her tracking the screen edge while present
      if (this._nocnicaPeripheralActive) {
        this.updateNocnicaPeripheral(delta);
      }
    }

    // ── Ritual 5: Wisp choice ──
    // Spawn wisps on first dusk visit to the marsh road, lazily.
    if (!this._wispsSpawned && this.isAfterDusk()
        && Math.hypot(px - (CENTER - 0.5), py - (MAP_SIZE - 4)) < 4) {
      this._wispsSpawned = true;
      this.spawnWisps();
    }
    if (this._wispsSpawned && !this._wispsSplit) {
      // Player must be looking at them (within 5 tiles) to "watch"
      const wd = Math.hypot(px - (CENTER - 0.5), py - (MAP_SIZE - 4));
      if (wd < 5) {
        this._wispWatchTimer += delta;
        if (this._wispWatchTimer >= 10000) {
          this._wispsSplit = true;
          this.splitWisps();
        }
      }
    }

    // ── FIX 3 — Comfort wisp vision ─────────────────────────────────
    // Once the player has chosen comfort, standing within 2 tiles of the
    // hidden grove shrine for 10s triggers a wordless 15s warm vision.
    if (gameState.ritualState.wisp_choice === 'comfort' && !this._comfortVisionPlayed) {
      const grove = { x: 18, y: 18 }; // hidden grove shrine = right wisp anchor
      const gd = Math.hypot(px - grove.x, py - grove.y);
      if (gd <= 2) {
        this._comfortVisionDwell = (this._comfortVisionDwell || 0) + delta;
        if (this._comfortVisionDwell >= 10000) {
          this._comfortVisionPlayed = true;
          this.playComfortVision();
        }
      } else {
        this._comfortVisionDwell = 0;
      }
    }
  },
  // ── Domovoi: place an item from the inventory at the doorstep ─────
  placeDomovoiOffering(itemId) {
    gameState.ritualState.domovoi_offering_attempted = true;
    const idx = gameState.inventory.indexOf(itemId);
    if (idx >= 0) gameState.inventory.splice(idx, 1);
    this._domovoiSequence.push(itemId);
    gameState.domovoiSequence = this._domovoiSequence.slice(); // persist mid-ritual
    this.interactPrompt.setVisible(false);

    const personals = ['glass_charm', 'firefly', 'memory_fragment'];
    const wrongFirstAttempt = () => {
      // Return the item
      gameState.inventory.push(itemId);
      if (!gameState.regencyFired.domovoi_first_wrong) {
        gameState.regencyFired.domovoi_first_wrong = true;
        adjustAttention(+1, 'domovoi_first_wrong');
      }
      this.playDomovoiScene(1);
      this._domovoiSequence = [];
      gameState.domovoiSequence = [];
    };

    if (this._domovoiSequence.length === 1) {
      if (itemId !== 'bread') { wrongFirstAttempt(); return; }
      // Bread accepted — wait for salt next
    } else if (this._domovoiSequence.length === 2) {
      if (itemId !== 'salt') {
        // Return all
        gameState.inventory.push(this._domovoiSequence[0]);
        wrongFirstAttempt(); return;
      }
    } else if (this._domovoiSequence.length >= 3) {
      const [a, b, c] = this._domovoiSequence;
      if (a === 'bread' && b === 'salt' && personals.includes(c)) {
        gameState.ritualState.domovoi_offering_correct = true;
        try { addJournalEntry('domovoi_watching'); } catch (e) {}
        try { addJournalEntry('custom_offering'); } catch (e) {}
        if (!gameState.regencyFired.domovoi_correct) {
          gameState.regencyFired.domovoi_correct = true;
          adjustAttention(-2, 'domovoi_correct');
        }
        this.showItemNotification('A door creaks open from the inside.');
        this.playDomovoiScene(2);
      } else {
        // Personal item not valid — return it
        gameState.inventory.push(itemId);
        this.speakDomovoi([
          '"That isn\'t real. I said something real. Not something convenient. Something you\'d miss."',
        ]);
        // Reset to [bread, salt]
        this._domovoiSequence = ['bread', 'salt'];
        gameState.domovoiSequence = ['bread', 'salt'];
      }
    }
  },
  // ── DOMOVOI: inventory selector ──────────────────────────────
  // Opens a small centered list of offerable items in inventory.
  // Player picks one with up/down arrows + Enter (or 1..5 keys).
  openDomovoiOfferingSelector() {
    if (this._domovoiSelectorOpen) return;
    const offerable = ['bread', 'salt', 'glass_charm', 'firefly', 'memory_fragment'];
    const items = gameState.inventory.filter(i => offerable.includes(i));
    if (items.length === 0) return;
    this._domovoiSelectorOpen = true;
    this.interactPrompt.setVisible(false);
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    const panelW = 280, panelH = 40 + items.length * 22;
    const px = (w - panelW) / 2, py = (h - panelH) / 2;
    const labels = {
      bread: 'Bread (a small loaf)',
      salt:  'Salt (a cloth bag)',
      glass_charm:    'Glass Charm — Baba\'s gift',
      firefly:        'Firefly Jar — Zuzka\'s gift',
      memory_fragment:'Memory Fragment',
    };
    const bg = this.add.graphics().setScrollFactor(0).setDepth(2000);
    bg.fillStyle(0x000000, 0.75); bg.fillRect(0, 0, w, h);
    bg.fillStyle(0x1c1812, 1); bg.fillRect(px, py, panelW, panelH);
    bg.lineStyle(1, 0x6a4828, 1); bg.strokeRect(px, py, panelW, panelH);
    const title = this.add.text(px + panelW / 2, py + 14, 'Leave at the doorstep…', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c8a868',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2001);
    const itemTexts = items.map((id, i) => {
      return this.add.text(px + 16, py + 36 + i * 22, '  ' + (i + 1) + '. ' + (labels[id] || id), {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#e0d4a8',
      }).setScrollFactor(0).setDepth(2001);
    });
    let sel = 0;
    const redraw = () => {
      itemTexts.forEach((t, i) => {
        t.setText((i === sel ? '▸ ' : '  ') + (i + 1) + '. ' + (labels[items[i]] || items[i]));
        t.setColor(i === sel ? '#ffd080' : '#e0d4a8');
      });
    };
    redraw();
    const keyHandler = (ev) => {
      if (ev.key === 'ArrowDown') { sel = (sel + 1) % items.length; redraw(); }
      else if (ev.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; redraw(); }
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key.toLowerCase() === 'e') {
        cleanup(); this.placeDomovoiOffering(items[sel]);
      } else if (ev.key === 'Escape') {
        cleanup();
      } else if (/^[1-9]$/.test(ev.key)) {
        const k = parseInt(ev.key, 10) - 1;
        if (k < items.length) { cleanup(); this.placeDomovoiOffering(items[k]); }
      }
    };
    const cleanup = () => {
      this.input.keyboard.off('keydown', keyHandler);
      bg.destroy(); title.destroy(); itemTexts.forEach(t => t.destroy());
      this._domovoiSelectorOpen = false;
    };
    this.input.keyboard.on('keydown', keyHandler);
  },
  // ── DOMOVOI: scene playback ──────────────────────────────────
  playDomovoiScene(idx) {
    const ds = gameState.domovoiState;
    const scenes = {
      1: [
        '"Salt first. You people always do salt first."',
        '',
        '"Bread. Then salt. Then something real. The order is not decorative."',
      ],
      2: [
        '"Hm."',
        '',
        '"You know the order. Someone taught you, or you paid attention. Either way."',
        '',
        '"The village was watched. Before the officer came with his clipboard and his clean shoes. Watched for eleven days."',
        '"Three watchers. They used the north road at night and the east road in daylight. They were careful — not careful enough. I notice everything that moves within sight of this building."',
        '"On the eighth day one of them left something behind. Under the signpost at the south road junction. I watched them leave it. I watched them decide not to go back for it."',
        '',
        '"I am telling you this because you brought bread first. And because the thing you gave me was something you would miss."',
        '"The signpost. South junction. Go before the officer finds it first. He walks that road on Tuesdays."',
      ],
      3: [
        '"You found it."',
        '',
        '"A Regency internal report. Eleven years old. They were watching Wyrdów before the Collapse, not after. Think about what that means."',
        '"It means they knew something was here worth watching. Before they had a reason to watch. Which means someone told them."',
        '',
        '"I don\'t know who. I know what was here worth watching. The woman with the Codex pages passed through eleven years ago. She stayed two nights. She slept in this building."',
        '"She was afraid. I brought her warmth. It\'s what I do."',
        '',
        '"Her name was Rivka. In case no one has told you yet."',
      ],
      4: [
        '"I see him."',
        '',
        '"He knocked on this door. Three times. Even spacing. He wrote something after."',
        '"I\'ve had two hundred years of visitors. None of them frightened me."',
        '"He frightens me. Not because he\'s cruel. Because he\'s certain."',
        '',
        '"Go. Come back when the roads lead somewhere safer. I\'ll be here."',
      ],
      5: [
        '"You came back. I didn\'t expect that."',
        '',
        '"The officer returned. Three more times. He hasn\'t found what he\'s looking for yet. He won\'t find it here — I moved the things that mattered."',
        '"The village is quieter now. People leave offerings less. When people stop leaving offerings it means one of two things — they\'ve stopped believing, or they\'re afraid to be seen believing."',
        '',
        '"What you\'re doing — finding the pieces — matters. I don\'t know how I know that."',
        '"Come back when it\'s done. I\'ll leave the chimney warm."',
      ],
    };
    const lines = scenes[idx];
    if (!lines) return;
    this.speakDomovoi(lines, () => {
      ds.sceneShown = idx;
    });
  },
  domovoiChimneyRasp() {
    // Brief raspy whisper near the inn chimney + a barely visible smoke puff
    if (ambientAudio.ctx) {
      const ctx = ambientAudio.ctx;
      const now = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-Math.abs(i - d.length * 0.4) / (d.length * 0.3));
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 4;
      const g = ctx.createGain(); g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(now);
    }
    this.showItemNotification('A rasp from the chimney…');
  },
  // ── Nocnica appearance (silent, brief) ────────────────────────────
  triggerNocnicaAppearance() {
    const cam = this.cameras.main;
    const overlay = this.add.graphics();
    overlay.setScrollFactor(0).setDepth(1090);
    overlay.fillStyle(0x05060c, 0.7);
    overlay.fillRect(0, 0, cam.width, cam.height);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 1200 });
    const text = this.add.text(cam.width / 2, cam.height / 2,
      'Something steps out of the dark.\nIt does not look at you.\nIt is listening.', {
        fontFamily: 'Georgia, serif', fontSize: '20px',
        color: '#c8c0d8', fontStyle: 'italic',
        stroke: '#0a0810', strokeThickness: 2, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1091).setAlpha(0);
    this.tweens.add({
      targets: text, alpha: 1, duration: 1200,
      hold: 4000, yoyo: true,
      onComplete: () => text.destroy(),
    });
    setTimeout(() => {
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 1500,
        onComplete: () => overlay.destroy(),
      });
    }, 6500);
  },
  // ── Nocnica peripheral silhouette ─────────────────────────────────
  // A tall, thin shadow that appears anchored to one edge of the
  // screen — never the centre. She's always to the side of vision,
  // implied more than seen, drawn in pure black with a faint silver hem.
  spawnNocnicaPeripheral(zone) {
    if (this._nocnicaPeripheralActive) return;
    this._nocnicaPeripheralActive = true;
    this._nocnicaZoneAnchor = zone;
    const cam = this.cameras.main;
    const g = this.add.graphics();
    g.setScrollFactor(0).setDepth(945);
    // She's drawn at the world origin of the graphics object — we
    // reposition the whole graphics each frame in updateNocnicaPeripheral.
    // Body — tall narrow shadow, ~14px wide × 80px tall
    g.fillStyle(0x05060a, 1);
    g.fillRect(-7, -80, 14, 80);
    // Head — slightly bulbous, no features
    g.fillStyle(0x05060a, 1);
    g.fillCircle(0, -84, 8);
    // Faint silver-grey hem along one edge — moonlight catching cloth
    g.fillStyle(0x8a92a8, 0.35);
    g.fillRect(-7, -80, 1, 80);
    g.fillRect(-7, -2, 14, 1);
    // Hint of trailing hair
    g.fillStyle(0x05060a, 0.7);
    g.fillRect(-9, -80, 1, 22);
    g.fillRect(8, -82, 1, 18);
    g.setAlpha(0);
    this._nocnicaGfx = g;
    // Fade in over 4s — slow enough that you doubt she's there
    this.tweens.add({ targets: g, alpha: 0.85, duration: 4000 });

    // Whispered noise SFX, very quiet
    if (ambientAudio.ctx) {
      const ctx = ambientAudio.ctx;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.6;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 180; f.Q.value = 8;
      const gn = ctx.createGain(); gn.gain.value = 0;
      src.connect(f); f.connect(gn); gn.connect(ctx.destination);
      gn.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 4);
      src.start();
      this._nocnicaAudio = { src, gn };
    }
  },
  updateNocnicaPeripheral(delta) {
    if (!this._nocnicaGfx || !this._nocnicaZoneAnchor) return;
    const cam = this.cameras.main;
    const z = this._nocnicaZoneAnchor;
    // Determine which screen edge she should haunt — based on the
    // direction from the player to the zone, but pushed all the way
    // to the screen border so she's always peripheral.
    const dx = z.x - this.playerCartX;
    const dy = z.y - this.playerCartY;
    // Convert to screen-space angle via the iso projection
    const sx = (dx - dy) * (TILE_W / 2);
    const sy = (dx + dy) * (TILE_H / 2);
    const ang = Math.atan2(sy, sx);
    const margin = 60;
    // Place along an ellipse that hugs the screen border
    const rx = cam.width / 2 - margin;
    const ry = cam.height / 2 - margin;
    let tx = cam.width / 2 + Math.cos(ang) * rx;
    let ty = cam.height / 2 + Math.sin(ang) * ry;
    // Lerp toward target so motion is faint, drifting
    this._nocnicaGfx.x += ((tx - this._nocnicaGfx.x) * 0.04);
    this._nocnicaGfx.y += ((ty - this._nocnicaGfx.y) * 0.04);
    // Subtle vertical sway
    this._nocnicaGfx.y += Math.sin((this.animTime || 0) * 0.0009) * 0.15;
  },
  hideNocnicaPeripheral() {
    if (!this._nocnicaPeripheralActive) return;
    this._nocnicaPeripheralActive = false;
    if (this._nocnicaGfx) {
      const g = this._nocnicaGfx;
      this._nocnicaGfx = null;
      this.tweens.add({
        targets: g, alpha: 0, duration: 600,
        onComplete: () => g.destroy(),
      });
    }
    if (this._nocnicaAudio) {
      const a = this._nocnicaAudio;
      this._nocnicaAudio = null;
      try {
        a.gn.gain.linearRampToValueAtTime(0, ambientAudio.ctx.currentTime + 0.6);
        setTimeout(() => { try { a.src.stop(); } catch (e) {} }, 700);
      } catch (e) {}
    }
  },
  // ── Wisps near the marsh road ────────────────────────────────────
  spawnWisps() {
    if (!this._wispGfx) {
      this._wispGfx = this.add.graphics();
      this._wispGfx.setDepth(700);
    }
    const center = { x: CENTER - 0.5, y: MAP_SIZE - 4 };
    this._wisps = [
      { x: center.x - 0.4, y: center.y, vx: 0, vy: 0, branch: null },
      { x: center.x,       y: center.y, vx: 0, vy: 0, branch: null },
      { x: center.x + 0.4, y: center.y, vx: 0, vy: 0, branch: null },
    ];
    if (!this._wispUpdater) {
      this._wispUpdater = setInterval(() => this.drawWisps(), 60);
    }
  },
  splitWisps() {
    // Two paths form: left toward dead tree, right toward hidden grove
    this._wisps[0].branch = 'left';
    this._wisps[1].branch = 'left';
    this._wisps[2].branch = 'right';
    // After 8s of split, lock the player's choice based on which side
    // they were nearest to.
    setTimeout(() => {
      if (gameState.ritualState.wisp_choice != null) return;
      const px = this.playerCartX, py = this.playerCartY;
      const leftAnchor  = { x: MAP_SIZE - 5, y: 4 };
      const rightAnchor = { x: 18, y: 18 };
      const dl = Math.hypot(px - leftAnchor.x,  py - leftAnchor.y);
      const dr = Math.hypot(px - rightAnchor.x, py - rightAnchor.y);
      if (Math.min(dl, dr) > 8) gameState.ritualState.wisp_choice = 'ignored';
      else gameState.ritualState.wisp_choice = (dl < dr) ? 'truth' : 'comfort';
      // Awakening theme — Play 4: after the comfort vision concludes
      if (gameState.ritualState.wisp_choice === 'comfort'
          && typeof music !== 'undefined') {
        setTimeout(() => music.playComfortAwakening(), 4000);
      }
      if (!gameState.regencyFired.wisp_choice) {
        gameState.regencyFired.wisp_choice = true;
        if (gameState.ritualState.wisp_choice === 'truth')        adjustAttention(+2, 'wisp_truth');
        else if (gameState.ritualState.wisp_choice === 'ignored') adjustAttention(-1, 'wisp_ignored');
        // 'comfort' is 0
        // The custom is learned whichever way the lights were answered
        try { addJournalEntry('custom_wisps'); } catch (e) {}
      }
    }, 8000);
  },
  drawWisps() {
    if (!this._wisps || !this._wispGfx) return;
    const g = this._wispGfx;
    g.clear();
    const t = this.animTime || 0;
    for (let i = 0; i < this._wisps.length; i++) {
      const w = this._wisps[i];
      // Drift slowly along their branch
      if (w.branch === 'left')  { w.x -= 0.005; w.y -= 0.003; }
      if (w.branch === 'right') { w.x += 0.005; w.y += 0.004; }
      const iso = cartToIso(w.x, w.y);
      const sx = iso.x + this.worldOffset.x;
      const sy = iso.y + this.worldOffset.y - 14 + Math.sin(t * 0.003 + i) * 2;
      // Soft pale-blue glow
      for (let r = 14; r > 0; r -= 3) {
        const a = (1 - r / 14) * 0.18;
        g.fillStyle(0xa8d4ff, a);
        g.fillCircle(sx, sy, r);
      }
      g.fillStyle(0xe8f4ff, 0.95);
      g.fillCircle(sx, sy, 2);
    }
  },
  startObservation() {
    if (this._obsActive) return;
    this._obsActive = true;
    // Subtle zoom in (20%) over 0.5s
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.2,
      duration: 500,
      ease: 'Sine.easeOut',
    });
    // Vignette fade in
    this.tweens.add({ targets: this._obsVignette, alpha: 1, duration: 500 });
    // Faint held-breath ambience
    this.startObservationBreath();
    try { sfx.loop('observation_breath', 1, 500); } catch (e) {}
    // Trigger any zone the player is currently inside (one-shot per session)
    const px = this.playerCartX, py = this.playerCartY;
    let matched = null;
    for (const z of this.observationZones) {
      if (gameState.observedZones.includes(z.id)) continue;
      if (z.requires && !z.requires()) continue;
      const d = Math.hypot(px - z.x, py - z.y);
      if (d <= z.r) { matched = z; break; }
    }
    if (matched) {
      gameState.observedZones.push(matched.id);
      // Map observation zone IDs to journal entries
      const obsJournalMap = { idol: 'observe_idol', inn_window: 'observe_board', zuzka: 'observe_firefly' };
      if (obsJournalMap[matched.id]) { try { addJournalEntry(obsJournalMap[matched.id]); } catch (e) {} }
      this._obsText.setText(matched.text);
      this._obsText.setAlpha(0);
      this.tweens.add({ targets: this._obsText, alpha: 1, duration: 800 });
      this._obsTextHoldTimer = 6000;
    }
  },
  endObservation() {
    if (!this._obsActive) return;
    this._obsActive = false;
    this.tweens.add({
      targets: this.cameras.main, zoom: 1,
      duration: 300, ease: 'Sine.easeIn',
    });
    this.tweens.add({ targets: this._obsVignette, alpha: 0, duration: 400 });
    // Stop held-breath audio
    this.stopObservationBreath();
    try { sfx.stopLoop('observation_breath', 500); } catch (e) {}
  },
  startObservationBreath() {
    if (!ambientAudio.ctx) {
      try { ambientAudio.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return; }
    }
    if (this._obsBreath) return;
    const ctx = ambientAudio.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 280;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 0.6);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start();
    this._obsBreath = { src, gain };
  },
  stopObservationBreath() {
    if (!this._obsBreath || !ambientAudio.ctx) return;
    const ctx = ambientAudio.ctx;
    try {
      this._obsBreath.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      const src = this._obsBreath.src;
      setTimeout(() => { try { src.stop(); } catch (e) {} }, 400);
    } catch (e) {}
    this._obsBreath = null;
  },
  updateObservation(delta) {
    if (!this.observeKey) return;
    // Never start (and always end) observation under overlays/cutscenes —
    // holding O in the journal used to zoom the camera behind the panel
    if (this._paused || this._pauseLayer || this._cutsceneActive
      || this._domovoiSelectorOpen || this._regencyDocOpen) {
      if (this._obsActive) this.endObservation();
      this._obsHoldTime = 0;
      return;
    }
    const moving = this.cursors && (this.cursors.up.isDown || this.cursors.down.isDown
      || this.cursors.left.isDown || this.cursors.right.isDown);

    if (this._obsActive && (moving || !this.observeKey.isDown)) {
      this.endObservation();
      // Fade text out if visible
      if (this._obsText.alpha > 0) {
        this.tweens.add({ targets: this._obsText, alpha: 0, duration: 400 });
        this._obsTextHoldTimer = 0;
      }
      this._obsHoldTime = 0;
      return;
    }

    if (this.observeKey.isDown && !moving && !this.dialogueActive && !this.visionActive) {
      this._obsHoldTime += delta;
      // Moving through the world quietly, you notice things faster
      const obsThreshold = this._stanceQuiet ? 800 : 1500;
      if (this._obsHoldTime >= obsThreshold && !this._obsActive) {
        this.startObservation();
      }
    } else {
      this._obsHoldTime = 0;
    }

    // Hold the detail text for 6s, then fade out
    if (this._obsTextHoldTimer > 0) {
      this._obsTextHoldTimer -= delta;
      if (this._obsTextHoldTimer <= 0 && this._obsText.alpha > 0) {
        this.tweens.add({ targets: this._obsText, alpha: 0, duration: 800 });
      }
    }
  },
});
