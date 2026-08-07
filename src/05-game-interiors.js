
// ═══ 05 GAME INTERIORS — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // ── PLAYER (Enhanced) ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  //  INTERIORS — compact build/update path (LBA mandate, Phase B)
  //  An interior is a small TownDefinition; the village systems (rituals,
  //  NPCs, quests, weather) simply don't exist in here.
  // ═══════════════════════════════════════════════════════════════════
  // Leave town by road — stash this town's state, play the walking
  // vignette, arrive with the destination's namespace loaded.
  _travelTo(tr) {
    if (this._transitioning) return;
    this._transitioning = true;
    try { stashTownState(); saveGame(); } catch (e) {}
    if (typeof music !== 'undefined') {
      try { music.stopAmbient(600); } catch (e) {}
    }
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TravelScene', {
        to: tr.to, spawn: tr.spawn, line: tr.line || '',
        toName: (TOWNS[tr.to] && TOWNS[tr.to].name) || tr.to,
        from: this.town.id,
        originSpawn: { x: Math.round(this.playerCartX * 2) / 2,
                       y: Math.round(this.playerCartY * 2) / 2 },
      });
    });
  },
  _enterInterior(townId) {
    if (this._transitioning) return;
    this._transitioning = true;
    try { sfx.play('door_baba', { volume: 0.5 }); } catch (e) {}
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      gameState.currentTown = townId;
      const def = TOWNS[townId];
      this.scene.restart({ firstVisit: false, spawn: def.entry });
    });
  },
  _exitInterior() {
    if (this._transitioning) return;
    this._transitioning = true;
    try { sfx.play('door_baba', { volume: 0.4 }); } catch (e) {}
    const exit = this.town.exit;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      gameState.currentTown = exit.to;
      this.scene.restart({ firstVisit: false, spawn: exit.spawn });
    });
  },
  createInterior() {
    const T = this.town;
    this._transitioning = false;
    this.cameras.main.setBackgroundColor(0x0a0806);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.worldOffset = { x: 750, y: 200 };

    // Layers (player depth-sorts against props via _sortY)
    this.groundLayer = this.add.container(0, 0);
    this.objectLayer = this.add.container(0, 0);
    this.dustParticles = [];

    // ── Wood plank floor — hand-lit diamonds, warmer near the stove ──
    const floor = this.add.graphics();
    for (let y = 1; y < T.size - 1; y++) {
      for (let x = 1; x < T.size - 1; x++) {
        if (T.map[y][x] === 3) continue;
        const iso = cartToIso(x, y);
        const fx = iso.x + this.worldOffset.x, fy = iso.y + this.worldOffset.y;
        const shade = ((x + y) % 2 === 0) ? 0x4a3420 : 0x423020;
        floor.fillStyle(shade, 1);
        floor.beginPath();
        floor.moveTo(fx, fy - TILE_H / 2);
        floor.lineTo(fx + TILE_W / 2, fy);
        floor.lineTo(fx, fy + TILE_H / 2);
        floor.lineTo(fx - TILE_W / 2, fy);
        floor.closePath(); floor.fillPath();
        // plank grain tick
        if ((x * 7 + y * 13) % 5 === 0) {
          floor.fillStyle(0x352414, 0.7);
          floor.fillRect(fx - 6, fy - 1, 12, 1);
        }
      }
    }
    this.groundLayer.add(floor);

    // ── Walls along the north and west edges ──
    const walls = this.add.graphics();
    const wallH = 52;
    for (let x = 1; x < T.size - 1; x++) {
      const iso = cartToIso(x, 0.5);
      const wx = iso.x + this.worldOffset.x, wy = iso.y + this.worldOffset.y;
      walls.fillStyle(0x33231a, 1);
      walls.fillRect(wx - TILE_W / 2, wy - wallH, TILE_W, wallH);
      walls.fillStyle(0x2a1c14, 1);
      walls.fillRect(wx - TILE_W / 2, wy - wallH, TILE_W, 3);
      walls.fillStyle(0x3e2a1e, 0.5);
      walls.fillRect(wx - TILE_W / 2, wy - wallH + 14, TILE_W, 1);
      walls.fillRect(wx - TILE_W / 2, wy - wallH + 30, TILE_W, 1);
    }
    for (let y = 1; y < T.size - 1; y++) {
      const iso = cartToIso(0.5, y);
      const wx = iso.x + this.worldOffset.x, wy = iso.y + this.worldOffset.y;
      walls.fillStyle(0x2d1f16, 1);
      walls.fillRect(wx - TILE_W / 2, wy - wallH, TILE_W, wallH);
      walls.fillStyle(0x241811, 1);
      walls.fillRect(wx - TILE_W / 2, wy - wallH, TILE_W, 3);
    }
    this.groundLayer.add(walls);

    // ── Baba's room, if this is her house ──
    if (T.id === 'baba_house_interior') this._furnishBabaHouse();

    // ── Player ──
    this.createPlayer();
    const spawn = this._spawnOverride || T.entry;
    this.playerCartX = spawn.x; this.playerCartY = spawn.y;

    // ── Fixed cosy camera — target stored; pinned every frame in
    //    updateInterior (cam.width can be 0 during a background create,
    //    so a one-shot scroll set is not reliable) ──
    const c = cartToIso(T.size / 2, T.size / 2);
    this._interiorCamTarget = {
      x: c.x + this.worldOffset.x,
      y: c.y + this.worldOffset.y - 20,
    };
    this.cameras.main.setZoom(2.1);

    // ── Input (mirrors the village bindings; unified in loader cleanup) ──
    const arrowKeys = this.input.keyboard.createCursorKeys();
    const wasdKeys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    const eitherKey = (a, b) => ({ get isDown() { return a.isDown || b.isDown; } });
    this.cursors = {
      up: eitherKey(arrowKeys.up, wasdKeys.up), down: eitherKey(arrowKeys.down, wasdKeys.down),
      left: eitherKey(arrowKeys.left, wasdKeys.left), right: eitherKey(arrowKeys.right, wasdKeys.right),
    };
    this.briskKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.moveSpeed = 0.03;
    this.playerFacing = 'se';
    this._stanceQuiet = false;
    this.input.keyboard.on('keydown-Q', () => {
      if (this.dialogueActive || this._paused || this._pauseLayer) return;
      this._stanceQuiet = !this._stanceQuiet;
      this._updateStanceHUD();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._journalOpen) { this._closeJournal(); return; }
      this.togglePauseMenu();
    });
    this.input.keyboard.on('keydown-J', () => this.toggleJournal());
    this.input.keyboard.on('keydown-M', () => { music.toggleMute(); sfx.toggleMute(); });
    music.bind(this); sfx.bind(this);
    this.input.keyboard.on('keydown', () => { music.unlock(); sfx.unlock(); ambientAudio.init(); }, { once: false });

    // Dialogue UI (room ambience lines + future indoor conversations)
    this.createDialogueUI();

    // Interact prompt for examine points / indoor conversations
    this.interactPrompt = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '11px',
      color: '#aa9966', stroke: '#111111', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 1).setDepth(998).setVisible(false);
    this._examinePoints = T.examine || [];

    // ── Baba is home after dusk — asleep-adjacent, but never surprised ──
    const nightNow = gameState.gameHour >= 20 || gameState.gameHour < 6;
    if (T.babaHomeAtNight && nightNow) {
      const bIso = cartToIso(3.2, 3.4);
      const bc = this.add.container(bIso.x + this.worldOffset.x, bIso.y + this.worldOffset.y);
      this.babaGfx = this.add.graphics();
      bc.add(this.babaGfx);
      bc._sortY = bc.y;
      this.objectLayer.add(bc);
      this.babaSprite = bc;
      this.babaFrame = 0;
      this.drawBabaFrame(0);
      this._interiorBaba = { x: 3.2, y: 3.4 };
    }

    this._setupUICamera();

    // Room name whisper, top-left
    const label = this.add.text(16, 22, T.name, {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c8a86a',
      stroke: '#0e0e14', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1000);
    const sub = this.add.text(16, 44, T.subtitle || '', {
      fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: '#6a5a40',
      stroke: '#0e0e14', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(1000);
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: [label, sub], alpha: 0, duration: 1500 });
    });
  },
  _furnishBabaHouse() {
    const off = this.worldOffset;
    const at = (cx, cy) => { const i = cartToIso(cx, cy); return { x: i.x + off.x, y: i.y + off.y }; };
    const g = this.add.graphics();

    // Hearth stove, north wall — ember glow breathing is drawn in update
    const st = at(2.2, 1.1);
    g.fillStyle(0x3a3a40, 1); g.fillRect(st.x - 12, st.y - 46, 24, 34);
    g.fillStyle(0x2a2a30, 1); g.fillRect(st.x - 12, st.y - 46, 24, 4);
    g.fillStyle(0x1a1a20, 1); g.fillRect(st.x - 7, st.y - 30, 14, 10);
    g.fillStyle(0xff7b2a, 0.9); g.fillRect(st.x - 5, st.y - 27, 10, 5);
    g.fillStyle(0xffc878, 0.25); g.fillCircle(st.x, st.y - 24, 18);
    this._interiorEmber = { x: st.x, y: st.y - 24 };

    // Braid wall, north — seven hanging braids, one burnt short
    for (let i = 0; i < 7; i++) {
      const b = at(4 + i * 0.6, 1.05);
      const len = i === 4 ? 10 : 18 + ((i * 5) % 7);
      g.fillStyle(i === 4 ? 0x282018 : 0x6a4a2a, 1);
      g.fillRect(b.x - 1, b.y - 44, 3, len);
      g.fillStyle(0x8a6a3a, 1); g.fillRect(b.x - 2, b.y - 46, 5, 2);
      if (i === 4) { g.fillStyle(0x141210, 1); g.fillRect(b.x - 1, b.y - 34, 3, 2); }
    }

    // Jar shelves, west wall — glass catching the ember light
    for (let s = 0; s < 2; s++) {
      const sh = at(1.08, 3 + s * 1.6);
      g.fillStyle(0x4a3420, 1); g.fillRect(sh.x - 4, sh.y - 34 + s * 6, 40, 3);
      for (let j = 0; j < 4; j++) {
        const jarCol = [0x7a9a8a, 0x9a8a5a, 0x8a7a9a, 0x6a8a6a][(j + s) % 4];
        g.fillStyle(jarCol, 0.75);
        g.fillRect(sh.x + j * 9, sh.y - 43 + s * 6, 6, 8);
        g.fillStyle(0xd8d8c8, 0.5);
        g.fillRect(sh.x + j * 9 + 1, sh.y - 42 + s * 6, 1, 6);
        g.fillStyle(0x3a2a18, 1);
        g.fillRect(sh.x + j * 9, sh.y - 44 + s * 6, 6, 2);
      }
    }

    // The covered frame — the drawing Zuzka peeked at, cloth over it
    const fr = at(7.6, 1.08);
    g.fillStyle(0x4a3420, 1); g.fillRect(fr.x - 12, fr.y - 42, 24, 20);
    g.fillStyle(0xd0c09a, 0.95); g.fillRect(fr.x - 10, fr.y - 40, 20, 17);
    g.fillStyle(0xb8a882, 0.9); g.fillTriangle(fr.x - 10, fr.y - 40, fr.x + 3, fr.y - 40, fr.x - 5, fr.y - 24);
    this.groundLayer.add(g);

    // Big table with candle + reading dish (depth-sorted object)
    const tb = at(5, 4.5);
    const table = this.add.graphics();
    table.fillStyle(0x000000, 0.3); table.fillEllipse(tb.x, tb.y + 4, 46, 10);
    table.fillStyle(0x5a3e24, 1); table.fillRect(tb.x - 24, tb.y - 14, 48, 6);
    table.fillStyle(0x6e4c2c, 1); table.fillRect(tb.x - 24, tb.y - 14, 48, 2);
    table.fillStyle(0x3a2818, 1);
    table.fillRect(tb.x - 20, tb.y - 8, 3, 12); table.fillRect(tb.x + 17, tb.y - 8, 3, 12);
    // candle
    table.fillStyle(0xe8dfc0, 1); table.fillRect(tb.x - 10, tb.y - 22, 3, 8);
    table.fillStyle(0xffb347, 1); table.fillTriangle(tb.x - 8.5, tb.y - 26, tb.x - 10.5, tb.y - 22, tb.x - 6.5, tb.y - 22);
    table.fillStyle(0xffc878, 0.2); table.fillCircle(tb.x - 8.5, tb.y - 23, 12);
    // reading dish with ash
    table.fillStyle(0x8a8a92, 1); table.fillEllipse(tb.x + 8, tb.y - 15, 14, 5);
    table.fillStyle(0x2a2a2e, 1); table.fillEllipse(tb.x + 8, tb.y - 15.5, 10, 3);
    table._sortY = tb.y;
    this.objectLayer.add(table);

    // Bed, east side — quilt of patches (Stitched Circle work)
    const bd = at(7.8, 7);
    const bed = this.add.graphics();
    bed.fillStyle(0x000000, 0.3); bed.fillEllipse(bd.x, bd.y + 3, 44, 9);
    bed.fillStyle(0x4a3420, 1); bed.fillRect(bd.x - 22, bd.y - 10, 44, 12);
    bed.fillStyle(0x6a2430, 1); bed.fillRect(bd.x - 20, bd.y - 14, 40, 8);
    bed.fillStyle(0x4a5a7a, 1); bed.fillRect(bd.x - 14, bd.y - 13, 8, 4);
    bed.fillStyle(0x8a7a5a, 1); bed.fillRect(bd.x + 2, bd.y - 12, 9, 5);
    bed.fillStyle(0xe8dfc0, 1); bed.fillRect(bd.x - 20, bd.y - 16, 12, 5);
    bed._sortY = bd.y;
    this.objectLayer.add(bed);

    // Herbs drying from the ceiling — three bundles at head height
    const hb = this.add.graphics();
    [[3.4, 3], [4.4, 2.6], [6.4, 3.2]].forEach(([hx, hy], i) => {
      const h = at(hx, hy);
      hb.fillStyle(0x8a6a3a, 1); hb.fillRect(h.x, h.y - 66, 1, 14);
      hb.fillStyle(i === 1 ? 0x9a8a4a : 0x4a5a26, 1);
      hb.fillRect(h.x - 3, h.y - 52, 7, 9);
      hb.fillStyle(0x3a4a1e, 0.8); hb.fillRect(h.x - 2, h.y - 45, 5, 3);
    });
    this.groundLayer.add(hb);
  },
  updateInterior(time, delta) {
    if (this._transitioning) return;
    this.animTime = time;
    // Pin the cosy camera (view centre = scroll + viewport/2, zoom-independent)
    if (this._interiorCamTarget) {
      const cam = this.cameras.main;
      cam.scrollX = this._interiorCamTarget.x - cam.width / 2;
      cam.scrollY = this._interiorCamTarget.y - cam.height / 2;
    }
    // Dialogue freezes movement, same contract as the village
    if (this.dialogueActive) {
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.advanceDialogue();
      return;
    }
    this.handleMovement(delta);
    this.updatePlayerPosition();
    this.sortObjects();
    // Ember breathing
    if (this._interiorEmber) {
      if (!this._emberGfx) { this._emberGfx = this.add.graphics(); this._emberGfx.setDepth(996); }
      this._emberGfx.clear();
      const breath = 0.14 + Math.sin(time * 0.002) * 0.06 + Math.random() * 0.03;
      this._emberGfx.fillStyle(0xff9b4a, breath);
      this._emberGfx.fillCircle(this._interiorEmber.x, this._interiorEmber.y, 22);
    }
    // ── Indoor interactions: Baba (if home), then examine points ──
    let promptShown = false;
    if (this._interiorBaba && !promptShown) {
      const bd = Math.hypot(this.playerCartX - this._interiorBaba.x,
                            this.playerCartY - this._interiorBaba.y);
      if (bd <= 1.7) {
        promptShown = true;
        const iso = cartToIso(this._interiorBaba.x, this._interiorBaba.y);
        this.interactPrompt.setText('[E] Talk to Baba Elżbieta');
        this.interactPrompt.setPosition(iso.x + this.worldOffset.x,
                                        iso.y + this.worldOffset.y - 44);
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          const branch = this.getBabaDialogueBranch();
          this.openDialogue('Baba Elżbieta', branch.lines, branch.onClose, 'ornate');
        }
      }
      // Slow indoor breathing
      const bt = Math.floor(time / 1600) % 2;
      if (bt !== this.babaFrame) { this.babaFrame = bt; this.drawBabaFrame(bt); }
    }
    if (!promptShown) {
      for (const pt of this._examinePoints || []) {
        const pd = Math.hypot(this.playerCartX - pt.x, this.playerCartY - pt.y);
        if (pd > pt.radius) continue;
        promptShown = true;
        const iso = cartToIso(pt.x, pt.y);
        this.interactPrompt.setText(pt.prompt);
        this.interactPrompt.setPosition(iso.x + this.worldOffset.x,
                                        iso.y + this.worldOffset.y - 40);
        this.interactPrompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.interactPrompt.setVisible(false);
          this.openDialogue(pt.name, pt.lines, pt.journal
            ? () => { try { addJournalEntry(pt.journal); } catch (e) {} }
            : null, 'simple');
        }
        break;
      }
    }
    if (!promptShown && this.interactPrompt) this.interactPrompt.setVisible(false);

    // Exit — step back through the door
    const ex = this.town.exit;
    if (ex && Math.hypot(this.playerCartX - ex.x, this.playerCartY - ex.y) <= ex.radius) {
      this._exitInterior();
    }
  },
});
