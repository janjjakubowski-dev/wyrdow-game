
// ═══ 04 GAME JOURNAL UI — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // ── PAUSE MENU (Esc) ─────────────────────────────────────────────
  // Overlay with Resume / Return to Menu / Close Game.
  togglePauseMenu() {
    // Esc shouldn't fight dialogue, visions, cutscenes, or modal overlays
    if (this.dialogueActive || this.visionActive || this._cutsceneActive
      || this._domovoiSelectorOpen || this._regencyDocOpen) return;
    if (this._pauseLayer) { this._closePauseMenu(); return; }
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(3000);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0, 0);
    // Taller panel to fit four comfortably-spaced options
    const pw = 360, ph = 300;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1410, 0.96); panel.fillRoundedRect(px, py, pw, ph, 6);
    panel.lineStyle(1, 0xc8922a, 0.6); panel.strokeRoundedRect(px, py, pw, ph, 6);
    const title = this.add.text(W / 2, py + 30, 'Paused', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#c8922a',
    }).setOrigin(0.5);
    // Three options, 42px spacing
    const makeOpt = (label, y, onClick) => {
      const t = this.add.text(W / 2, y, label, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e8dfc0',
        stroke: '#1a0e08', strokeThickness: 2,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#c8922a'));
      t.on('pointerout',  () => t.setColor('#e8dfc0'));
      t.on('pointerdown', onClick);
      return t;
    };
    const resume    = makeOpt('Resume',         py + 86,  () => this._closePauseMenu());
    const settings  = makeOpt('Settings',       py + 128, () => this._openPauseSettings());
    const ret       = makeOpt('Return to Menu', py + 170, () => this._returnToMenu());
    const closeGame = makeOpt('Close Game',     py + 212, () => this._closeGame());
    // Keyboard nav — a keyboard-first game deserves a keyboard pause menu
    const opts = [
      { t: resume, act: () => this._closePauseMenu() },
      { t: settings, act: () => this._openPauseSettings() },
      { t: ret, act: () => this._returnToMenu() },
      { t: closeGame, act: () => this._closeGame() },
    ];
    let sel = 0;
    const marker = this.add.text(0, 0, '\u25c6', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c8922a',
    }).setOrigin(0.5).setScrollFactor(0);
    const syncSel = () => {
      opts.forEach((o, i) => o.t.setColor(i === sel ? '#c8922a' : '#e8dfc0'));
      const t = opts[sel].t;
      marker.setPosition(t.x - t.displayWidth / 2 - 18, t.y);
    };
    syncSel();
    const pkey = (e) => {
      if (this._pauseSettingsOpen) return;
      const k = e.key;
      if (k === 'ArrowUp' || k === 'Up') { sel = (sel + opts.length - 1) % opts.length; syncSel(); }
      else if (k === 'ArrowDown' || k === 'Down') { sel = (sel + 1) % opts.length; syncSel(); }
      else if (k === 'e' || k === 'E' || k === 'Enter') { opts[sel].act(); }
    };
    this.input.keyboard.on('keydown', pkey);
    this._pauseKeyHandler = pkey;
    const hint = this.add.text(W / 2, py + ph - 22, 'Esc to resume', {
      fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic', color: '#a89878',
    }).setOrigin(0.5);
    // Slot for the "press Alt+F4…" fallback message after Close Game
    this._pauseCloseMsg = this.add.text(W / 2, py + 242, '', {
      fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic',
      color: '#c8b878', wordWrap: { width: pw - 40 }, align: 'center',
    }).setOrigin(0.5);
    layer.add([dim, panel, title, resume, settings, ret, closeGame, hint, marker, this._pauseCloseMsg]);
    this._pauseLayer = layer;
    this.physics && this.physics.world && this.physics.world.pause && this.physics.world.pause();
  },
  // Try to close the browser window/tab. Most modern browsers block
  // window.close() unless the tab was opened via script, so we show
  // the platform-appropriate shortcut as a fallback.
  _closeGame() {
    try { saveGame(); } catch (e) {}
    try { window.close(); } catch (e) {}
    // If the window is still open after a tick, the browser blocked it.
    setTimeout(() => {
      if (!this._pauseCloseMsg) return;
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
      const msg = isMac
        ? 'Press Cmd+Q (Mac) to close, or close this tab.'
        : 'Press Alt+F4 (Windows) to close, or close this tab.';
      this._pauseCloseMsg.setText(msg);
    }, 120);
  },
  _closePauseMenu() {
    if (!this._pauseLayer) return;
    if (this._pauseKeyHandler) {
      this.input.keyboard.off('keydown', this._pauseKeyHandler);
      this._pauseKeyHandler = null;
    }
    this._pauseLayer.destroy(); this._pauseLayer = null;
    this.physics && this.physics.world && this.physics.world.resume && this.physics.world.resume();
  },
  _returnToMenu() {
    try { saveGame(); } catch (e) {}
    if (typeof music !== 'undefined') {
      try { music.stopAmbient(800); music.fadeOutAwakening(800); } catch (e) {}
    }
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._closePauseMenu();
      this.scene.start('MainMenuScene');
    });
  },
  // ── In-game Settings (from the pause menu) ─────────────────────────
  // Same sliders as the main-menu overlay, drawn above the pause layer.
  _openPauseSettings() {
    if (this._pauseSettingsOpen) return;
    this._pauseSettingsOpen = true;
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(3100);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0);
    layer.add(dim);
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
      const tx = px + 130, ty = sy + 12, tw = 280;
      const track = this.add.graphics();
      track.fillStyle(0x3a2a18, 1); track.fillRect(tx, ty, tw, 4);
      layer.add(track);
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
    const close = this.add.text(W / 2, py + ph - 28, '[ Close — Esc ]', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c8922a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    layer.add(close);
    const doClose = () => {
      layer.destroy(); this._pauseSettingsOpen = false;
      this.input.keyboard.off('keydown-ESC', doClose);
    };
    close.on('pointerdown', doClose);
    this.input.keyboard.on('keydown-ESC', doClose);
  },
  // ═══════════════════════════════════════════════════════════════════
  //  MEMORY JOURNAL — open book UI
  // ═══════════════════════════════════════════════════════════════════
  // Small parchment slip, top-right: tells the player the journal grew.
  _showJournalToast() {
    const cam = this.cameras.main;
    // If a toast is already showing, let it finish — entries added in
    // bursts (e.g. quest completion) shouldn't stack five slips.
    if (this._journalToastActive) return;
    this._journalToastActive = true;
    const note = this.add.text(cam.width - 20, 96, '✦  The journal remembers · [J]', {
      fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic',
      color: '#c8922a', stroke: '#0e0e14', strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(1003).setAlpha(0);
    this.tweens.add({
      targets: note,
      alpha: { from: 0, to: 1 },
      x: { from: cam.width + 10, to: cam.width - 20 },
      duration: 600, ease: 'Sine.easeOut',
      hold: 3000, yoyo: true,
      onComplete: () => { note.destroy(); this._journalToastActive = false; },
    });
  },
  toggleJournal() {
    if (this._journalOpen) { this._closeJournal(); return; }
    // Block during dialogue, vision, cutscene, pause, or modal overlays
    if (this.dialogueActive || this.visionActive || this._paused || this._pauseLayer
      || this._cutsceneActive || this._domovoiSelectorOpen || this._regencyDocOpen) return;
    this._openJournal();
  },
  _openJournal() {
    this._journalOpen = true;
    this._paused = true; // freeze gameplay
    try { sfx.play('dialogue_open'); } catch (e) {}
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    const dpr = window.devicePixelRatio || 1;

    const container = this.add.container(0, 0).setDepth(9500).setAlpha(0).setScrollFactor(0);
    this._journalContainer = container;

    // Dim backdrop
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, W, H);
    container.add(dim);

    // Book dimensions
    const BOOK_W = Math.round(W * 0.80);
    const BOOK_H = Math.round(H * 0.75);
    const bx = Math.round((W - BOOK_W) / 2);
    const by = Math.round((H - BOOK_H) / 2);
    const SPINE_X = Math.round(W / 2);
    const PAGE_W = Math.round((BOOK_W - 12) / 2); // 12px spine
    const PAGE_H = BOOK_H - 24; // inset from cover
    const LEFT_X = bx + 6;
    const RIGHT_X = SPINE_X + 6;
    const PAGE_Y = by + 12;

    // Draw book
    const book = this.add.graphics();
    // Leather cover shadow
    book.fillStyle(0x0a0604, 0.6);
    book.fillRoundedRect(bx + 5, by + 6, BOOK_W, BOOK_H, 6);
    // Leather cover
    book.fillStyle(0x2a1a0e, 1);
    book.fillRoundedRect(bx, by, BOOK_W, BOOK_H, 6);
    // Worn leather texture — subtle variation
    book.fillStyle(0x33200f, 0.4);
    book.fillRect(bx + 10, by + 2, BOOK_W - 20, 4);
    book.fillRect(bx + 10, by + BOOK_H - 6, BOOK_W - 20, 4);
    // Spine
    book.fillStyle(0x1e120a, 1);
    book.fillRect(SPINE_X - 6, by, 12, BOOK_H);
    book.lineStyle(1, 0x3a2a1e, 0.5);
    book.strokeRect(SPINE_X - 6, by, 12, BOOK_H);
    // Rune stamp on spine
    const ry = by + Math.round(BOOK_H / 2);
    book.fillStyle(0x3a2a1e, 0.8);
    book.fillCircle(SPINE_X, ry, 8);
    book.lineStyle(1, 0x4a3a2a, 0.6);
    book.strokeCircle(SPINE_X, ry, 8);
    book.strokeCircle(SPINE_X, ry, 5);
    book.fillStyle(0x4a3a2a, 0.7);
    book.fillCircle(SPINE_X, ry, 2);
    // Left page
    book.fillStyle(0xf0e8d0, 1);
    book.fillRect(LEFT_X, PAGE_Y, PAGE_W, PAGE_H);
    // Left page edge wear — darker at edges
    book.fillStyle(0xd8d0b8, 0.35);
    book.fillRect(LEFT_X, PAGE_Y, 8, PAGE_H);
    book.fillRect(LEFT_X, PAGE_Y, PAGE_W, 5);
    book.fillRect(LEFT_X, PAGE_Y + PAGE_H - 5, PAGE_W, 5);
    // Right page
    book.fillStyle(0xf4ecd8, 1);
    book.fillRect(RIGHT_X, PAGE_Y, PAGE_W, PAGE_H);
    // Right page edge wear
    book.fillStyle(0xdcd4bc, 0.35);
    book.fillRect(RIGHT_X + PAGE_W - 8, PAGE_Y, 8, PAGE_H);
    book.fillRect(RIGHT_X, PAGE_Y, PAGE_W, 5);
    book.fillRect(RIGHT_X, PAGE_Y + PAGE_H - 5, PAGE_W, 5);
    // Page fold shadow at spine
    book.fillStyle(0xc0b898, 0.3);
    book.fillRect(LEFT_X + PAGE_W - 6, PAGE_Y, 6, PAGE_H);
    book.fillRect(RIGHT_X, PAGE_Y, 6, PAGE_H);
    container.add(book);

    // ── LEFT PAGE: Header ──
    const lpx = LEFT_X + 24; // left padding
    const lpy = PAGE_Y + 18;
    // Diamond rule at top (per-town section headers render in the list)
    this._journalDrawRule(container, LEFT_X + PAGE_W / 2, lpy, PAGE_W - 60);

    // ── Entry list ──
    // Group entries by town (B5): Wyrdów first, then the road east.
    // Within a town, keep collection order.
    const TOWN_ORDER = ['wyrdow', 'miedzno'];
    const entries = (gameState.journal.entries || [])
      .filter(id => JOURNAL_ENTRIES[id])
      .sort((a, b) => {
        const ta = TOWN_ORDER.indexOf(JOURNAL_ENTRIES[a].town || 'wyrdow');
        const tb = TOWN_ORDER.indexOf(JOURNAL_ENTRIES[b].town || 'wyrdow');
        if (ta !== tb) return ta - tb;
        return gameState.journal.entries.indexOf(a) - gameState.journal.entries.indexOf(b);
      });
    const listTop = lpy + 42;
    const listH = PAGE_H - 190; // bottom of page reserved for the Carried section
    const ROW_H = 28;
    const MAX_VISIBLE = Math.min(Math.floor(listH / ROW_H), 14);
    this._journalEntries = entries;
    this._journalSelection = 0;
    this._journalScrollOffset = 0;
    this._journalMaxVisible = MAX_VISIBLE;
    this._journalListTop = listTop;
    this._journalLeftX = lpx;
    this._journalLeftPageCX = LEFT_X + PAGE_W / 2;
    this._journalLeftPageW = PAGE_W;
    this._journalRightX = RIGHT_X;
    this._journalRightW = PAGE_W;
    this._journalPageY = PAGE_Y;
    this._journalPageH = PAGE_H;
    this._journalRowH = ROW_H;
    this._journalDpr = dpr;

    // Entry list items (will be rebuilt on scroll/selection change)
    this._journalListItems = [];
    this._journalRightItems = [];
    this._journalMarkSelectedRead();
    this._buildJournalList(container);
    this._buildJournalRight(container);
    this._buildJournalCarried(container);

    // Page number bottom-left
    const selTown = entries.length
      ? (JOURNAL_ENTRIES[entries[Math.min(this._journalSelection, entries.length - 1)]].town || 'wyrdow')
      : 'wyrdow';
    const pageNum = this.add.text(LEFT_X + PAGE_W / 2, PAGE_Y + PAGE_H - 14,
      (TOWNS[selTown] && TOWNS[selTown].pageNumeral) || 'I.', {
      fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: '#a08860',
    }).setOrigin(0.5, 0.5).setResolution(dpr);
    container.add(pageNum);
    // Tiny margin note
    const marginNote = this.add.text(LEFT_X + PAGE_W - 16, PAGE_Y + PAGE_H - 8,
      'There are four more towns.', {
        fontFamily: 'Georgia, serif', fontSize: '8px', fontStyle: 'italic', color: '#c0b098',
    }).setOrigin(1, 1).setResolution(dpr);
    container.add(marginNote);

    // Close hint bottom-right of right page
    const closeHint = this.add.text(RIGHT_X + PAGE_W - 16, PAGE_Y + PAGE_H - 10,
      '[J] to close', {
        fontFamily: 'Georgia, serif', fontSize: '9px', fontStyle: 'italic', color: '#b0a080',
    }).setOrigin(1, 1).setResolution(dpr);
    container.add(closeHint);

    // Fade in
    this.tweens.add({ targets: container, alpha: 1, duration: 400, ease: 'Sine.easeOut' });

    // Keyboard: up/down/E/Enter navigate, J/ESC close
    this._journalKeyHandler = (e) => {
      const key = e.key || '';
      if (key === 'ArrowUp' || key === 'Up') {
        this._journalMoveSelection(-1);
      } else if (key === 'ArrowDown' || key === 'Down') {
        this._journalMoveSelection(1);
      } else if (key === 'e' || key === 'E' || key === 'Enter') {
        this._journalSelectEntry();
      }
    };
    this.input.keyboard.on('keydown', this._journalKeyHandler);
  },
  _closeJournal() {
    if (!this._journalOpen) return;
    this._journalOpen = false;
    try { sfx.play('dialogue_open'); } catch (e) {}
    if (this._journalKeyHandler) {
      this.input.keyboard.off('keydown', this._journalKeyHandler);
      this._journalKeyHandler = null;
    }
    const c = this._journalContainer;
    if (c) {
      this.tweens.add({
        targets: c, alpha: 0, duration: 300, ease: 'Sine.easeIn',
        onComplete: () => { c.destroy(); this._journalContainer = null; this._paused = false; },
      });
    } else {
      this._paused = false;
    }
  },
  // Icon helpers — draw 3-4px icons for each entry type
  _journalIcon(type) {
    // Returns { char, color } for a text-based mini icon
    switch (type) {
      case 'vision':   return { ch: '\u25C9', col: '#7a6a50' }; // ◉ eye
      case 'npc':      return { ch: '\u25EC', col: '#7a6a50' }; // ◬ speech
      case 'observe':  return { ch: '\u25CB', col: '#7a6a50' }; // ○ magnifying
      case 'document': return { ch: '\u25A3', col: '#7a6a50' }; // ▣ seal
      case 'ritual':   return { ch: '\u2726', col: '#7a6a50' }; // ✦ knot
      case 'custom':   return { ch: '\u2766', col: '#7a6a50' }; // ❦ floral heart — the old ways
      default:         return { ch: '\u2022', col: '#7a6a50' }; // •
    }
  },
  _journalDrawRule(container, cx, y, width) {
    const g = this.add.graphics();
    const half = width / 2;
    g.lineStyle(1, 0x8a6a40, 0.6);
    g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx - 8, y); g.strokePath();
    g.beginPath(); g.moveTo(cx + 8, y); g.lineTo(cx + half, y); g.strokePath();
    g.fillStyle(0x8a6a40, 0.8);
    g.fillTriangle(cx, y - 4, cx + 4, y, cx, y + 4);
    g.fillTriangle(cx, y - 4, cx - 4, y, cx, y + 4);
    container.add(g);
  },
  _buildJournalList(container) {
    // Destroy previous
    for (const item of this._journalListItems) { try { item.destroy(); } catch (e) {} }
    this._journalListItems = [];
    const entries = this._journalEntries;
    if (!entries.length) {
      const empty = this.add.text(this._journalLeftPageCX, this._journalListTop + 40,
        'No entries yet.', {
          fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#a09070',
      }).setOrigin(0.5, 0).setResolution(this._journalDpr);
      container.add(empty);
      this._journalListItems.push(empty);
      return;
    }
    const offset = this._journalScrollOffset;
    const max = this._journalMaxVisible;
    const visible = entries.slice(offset, offset + max);
    let flowY = this._journalListTop;
    let lastTown = offset > 0
      ? (JOURNAL_ENTRIES[entries[offset - 1]].town || 'wyrdow') : null;
    visible.forEach((id, i) => {
      const def = JOURNAL_ENTRIES[id]; if (!def) return;
      // Town section header whenever the group changes in the flow
      const entryTown = def.town || 'wyrdow';
      if (entryTown !== lastTown) {
        lastTown = entryTown;
        const tDef = TOWNS[entryTown] || {};
        const hdr = this.add.text(this._journalLeftPageCX, flowY + 6,
          tDef.journalHeader || entryTown.toUpperCase(), {
            fontFamily: 'Georgia, serif', fontSize: '12px', color: '#6a5030',
        }).setOrigin(0.5, 0).setResolution(this._journalDpr);
        container.add(hdr);
        this._journalListItems.push(hdr);
        flowY += 26;
      }
      const y = flowY;
      flowY += this._journalRowH;
      const isSelected = (offset + i === this._journalSelection);
      const isUnread = gameState.journal.unread.includes(id);
      // Selection highlight
      if (isSelected) {
        const hl = this.add.graphics();
        hl.fillStyle(0xe8d8b0, 0.45);
        hl.fillRoundedRect(this._journalLeftX - 4, y - 2, this._journalLeftPageW - 48, this._journalRowH - 2, 3);
        container.add(hl);
        this._journalListItems.push(hl);
      }
      // Unread amber dot
      if (isUnread) {
        const dot = this.add.graphics();
        dot.fillStyle(0xc8922a, 1);
        dot.fillCircle(this._journalLeftX - 8, y + 8, 3);
        container.add(dot);
        this._journalListItems.push(dot);
      }
      // Icon
      const icon = this._journalIcon(def.type);
      const iconText = this.add.text(this._journalLeftX + 2, y + 1, icon.ch, {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: icon.col,
      }).setOrigin(0, 0).setResolution(this._journalDpr);
      container.add(iconText);
      this._journalListItems.push(iconText);
      // Title — truncated with an ellipsis if it would run into the spine
      const titleColor = isSelected ? '#3a2a0e' : '#5a4a30';
      const titleText = this.add.text(this._journalLeftX + 22, y + 1, def.title, {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: titleColor,
      }).setOrigin(0, 0).setResolution(this._journalDpr);
      const maxTitleW = this._journalLeftPageW - 48 - 26;
      if (titleText.displayWidth > maxTitleW) {
        let t = def.title;
        while (t.length > 4 && titleText.displayWidth > maxTitleW) {
          t = t.slice(0, -1);
          titleText.setText(t.trimEnd() + '…');
        }
      }
      // Mouse: hover selects, click opens on the right page
      titleText.setInteractive({ useHandCursor: true });
      const rowIndex = offset + i;
      titleText.on('pointerover', () => {
        if (this._journalSelection !== rowIndex) {
          this._journalSelection = rowIndex;
          this._journalRefresh();
        }
      });
      titleText.on('pointerdown', () => {
        this._journalSelection = rowIndex;
        this._journalRefresh();
      });
      container.add(titleText);
      this._journalListItems.push(titleText);
    });
    // Scroll indicators
    if (offset > 0) {
      const up = this.add.text(this._journalLeftPageCX, this._journalListTop - 8, '\u25B2', {
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#a09070',
      }).setOrigin(0.5, 0.5).setResolution(this._journalDpr);
      container.add(up);
      this._journalListItems.push(up);
    }
    if (offset + max < entries.length) {
      const dn = this.add.text(this._journalLeftPageCX,
        this._journalListTop + max * this._journalRowH + 4, '\u25BC', {
          fontFamily: 'Georgia, serif', fontSize: '10px', color: '#a09070',
      }).setOrigin(0.5, 0.5).setResolution(this._journalDpr);
      container.add(dn);
      this._journalListItems.push(dn);
    }
  },
  _buildJournalRight(container) {
    for (const item of this._journalRightItems) { try { item.destroy(); } catch (e) {} }
    this._journalRightItems = [];
    const dpr = this._journalDpr;
    const rx = this._journalRightX + 24;
    const rw = this._journalRightW - 48;
    const ry = this._journalPageY + 24;
    const cx = this._journalRightX + this._journalRightW / 2;

    const entries = this._journalEntries;
    const sel = entries[this._journalSelection];
    const def = sel ? JOURNAL_ENTRIES[sel] : null;

    if (!def) {
      // Empty state — idol illustration + prompt
      const idleIllust = this._drawJournalIllustration(container, cx, ry + 60, 'idle');
      // Prompt
      const prompt = this.add.text(cx, ry + 140, 'Select an entry to read.', {
        fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#a09070',
      }).setOrigin(0.5, 0).setResolution(dpr);
      container.add(prompt);
      this._journalRightItems.push(prompt);
      return;
    }

    // Entry header
    let curY = ry + 6;
    const titleText = this.add.text(cx, curY, def.title, {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a2a0e',
    }).setOrigin(0.5, 0).setResolution(dpr);
    container.add(titleText);
    this._journalRightItems.push(titleText);
    curY += 26;
    // Diamond rule
    this._journalDrawRule(container, cx, curY, rw - 20);
    curY += 10;
    // Category label
    const catText = this.add.text(cx, curY, def.category, {
      fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: '#8a7a5a',
    }).setOrigin(0.5, 0).setResolution(dpr);
    container.add(catText);
    this._journalRightItems.push(catText);
    curY += 22;
    // Illustration
    this._drawJournalIllustration(container, cx, curY + 30, sel);
    curY += 80;
    // Entry text — handwritten style
    const bodyText = this.add.text(cx, curY, def.text, {
      fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic',
      color: '#4a3a20', wordWrap: { width: rw, useAdvancedWrap: true },
      lineSpacing: 10,
    }).setOrigin(0.5, 0).setResolution(dpr);
    container.add(bodyText);
    this._journalRightItems.push(bodyText);
  },
  _drawJournalIllustration(container, cx, cy, entryId) {
    const g = this.add.graphics();
    const px = (x, y, w, h, color, a) => { g.fillStyle(color, a || 1); g.fillRect(cx - 40 + x, cy - 30 + y, w || 2, h || 2); };

    if (entryId === 'idle') {
      // Wyrdów idol with 5 roads
      g.lineStyle(1, 0x5a4a30, 0.7);
      // Five roads radiating
      const angles = [-90, -36, 36, 108, 180];
      for (const a of angles) {
        const rad = a * Math.PI / 180;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(rad) * 28, cy + Math.sin(rad) * 28);
        g.strokePath();
      }
      // Idol body
      g.fillStyle(0x5a4a30, 0.8);
      g.fillRect(cx - 3, cy - 18, 6, 20);
      g.fillRect(cx - 8, cy - 12, 16, 3);
      // Head
      g.fillCircle(cx, cy - 22, 5);
      // Eyes
      g.fillStyle(0xc8922a, 0.9);
      g.fillRect(cx - 3, cy - 23, 2, 1);
      g.fillRect(cx + 1, cy - 23, 2, 1);
    } else if (entryId === 'vision_1') {
      // Two hands, one glowing
      g.lineStyle(1, 0x5a4a30, 0.6);
      // Left hand
      g.beginPath(); g.moveTo(cx - 18, cy); g.lineTo(cx - 18, cy - 14); g.strokePath();
      g.beginPath(); g.moveTo(cx - 22, cy - 8); g.lineTo(cx - 22, cy - 18); g.strokePath();
      g.beginPath(); g.moveTo(cx - 14, cy - 8); g.lineTo(cx - 14, cy - 18); g.strokePath();
      g.fillStyle(0x5a4a30, 0.4);
      g.fillRect(cx - 24, cy - 2, 14, 8);
      // Right hand (glowing)
      g.fillStyle(0xc8922a, 0.2);
      g.fillCircle(cx + 18, cy - 4, 16);
      g.lineStyle(1, 0xc8922a, 0.8);
      g.beginPath(); g.moveTo(cx + 18, cy); g.lineTo(cx + 18, cy - 14); g.strokePath();
      g.beginPath(); g.moveTo(cx + 14, cy - 8); g.lineTo(cx + 14, cy - 18); g.strokePath();
      g.beginPath(); g.moveTo(cx + 22, cy - 8); g.lineTo(cx + 22, cy - 18); g.strokePath();
      g.fillStyle(0xc8922a, 0.4);
      g.fillRect(cx + 12, cy - 2, 14, 8);
      // Glow mark
      g.fillStyle(0xffb347, 0.5);
      g.fillCircle(cx + 18, cy - 4, 4);
    } else if (entryId === 'vision_2') {
      // Door with light underneath, child silhouette
      g.fillStyle(0x5a4a30, 0.6);
      g.fillRect(cx - 12, cy - 24, 24, 40);
      g.fillStyle(0xf0e8d0, 0.7);
      g.fillRect(cx - 10, cy + 12, 20, 4); // light under door
      g.lineStyle(1, 0x3a2a1a, 0.5);
      g.strokeRect(cx - 12, cy - 24, 24, 40);
      // Door handle
      g.fillStyle(0x8a6a40, 0.8);
      g.fillCircle(cx + 8, cy - 2, 2);
      // Child silhouette to the left
      g.fillStyle(0x3a2a1a, 0.5);
      g.fillCircle(cx - 24, cy - 12, 4); // head
      g.fillRect(cx - 26, cy - 8, 4, 14); // body
    } else if (entryId === 'vision_3') {
      // Figure at window, back turned
      g.lineStyle(1, 0x5a4a30, 0.5);
      g.strokeRect(cx - 16, cy - 20, 32, 32); // window frame
      g.fillStyle(0xd8d0b8, 0.3);
      g.fillRect(cx - 14, cy - 18, 28, 28); // window pane
      // Figure silhouette (back turned)
      g.fillStyle(0x3a2a1a, 0.6);
      g.fillCircle(cx, cy - 8, 5); // head
      g.fillRect(cx - 5, cy - 3, 10, 16); // body
    } else if (entryId === 'vision_4') {
      // Three cold lights on dark road
      g.lineStyle(1, 0x5a4a30, 0.4);
      g.beginPath(); g.moveTo(cx - 36, cy + 8); g.lineTo(cx + 36, cy + 8); g.strokePath(); // road
      // Three lights
      g.fillStyle(0x88aacc, 0.6);
      g.fillCircle(cx - 14, cy - 4, 4);
      g.fillCircle(cx, cy - 8, 4);
      g.fillCircle(cx + 14, cy - 4, 4);
      // Glow halos
      g.fillStyle(0x88aacc, 0.15);
      g.fillCircle(cx - 14, cy - 4, 10);
      g.fillCircle(cx, cy - 8, 10);
      g.fillCircle(cx + 14, cy - 4, 10);
    } else if (entryId === 'vision_5') {
      // Musical notation fading to one line
      g.lineStyle(1, 0x5a4a30, 0.5);
      for (let i = 0; i < 5; i++) {
        const a = 0.6 - i * 0.1;
        g.lineStyle(1, 0x5a4a30, a);
        g.beginPath(); g.moveTo(cx - 30, cy - 16 + i * 6); g.lineTo(cx + 30, cy - 16 + i * 6); g.strokePath();
      }
      // Notes fading
      g.fillStyle(0x5a4a30, 0.5);
      g.fillCircle(cx - 18, cy - 13, 2); g.fillCircle(cx - 6, cy - 7, 2);
      g.fillCircle(cx + 8, cy - 1, 2);
      // One strong line at bottom
      g.lineStyle(2, 0x5a4a30, 0.9);
      g.beginPath(); g.moveTo(cx - 30, cy + 14); g.lineTo(cx + 30, cy + 14); g.strokePath();
      g.fillStyle(0x5a4a30, 0.9);
      g.fillCircle(cx + 12, cy + 14, 3);
    } else if (entryId === 'baba_revelation') {
      // Burnt braid over candle flame
      g.lineStyle(1, 0x5a4a30, 0.6);
      // Braid — wavy line
      g.beginPath();
      g.moveTo(cx - 16, cy - 16);
      for (let i = 0; i < 6; i++) g.lineTo(cx - 16 + i * 6, cy - 16 + (i % 2 ? 4 : -4));
      g.strokePath();
      // Burn darkening at end
      g.fillStyle(0x1a0e08, 0.5);
      g.fillCircle(cx + 14, cy - 14, 4);
      // Candle
      g.fillStyle(0xe8dfc0, 0.8);
      g.fillRect(cx - 2, cy, 4, 14); // wax
      g.fillStyle(0xffb347, 0.9);
      g.fillTriangle(cx, cy - 6, cx - 3, cy + 2, cx + 3, cy + 2); // flame
      g.fillStyle(0xffb347, 0.15);
      g.fillCircle(cx, cy - 2, 10); // glow
    } else if (entryId === 'ezra_boots') {
      // Boot with copper wire at heel
      g.lineStyle(1, 0x5a4a30, 0.6);
      g.beginPath();
      g.moveTo(cx - 10, cy - 14); g.lineTo(cx - 10, cy + 6); g.lineTo(cx + 16, cy + 6);
      g.lineTo(cx + 16, cy + 2); g.lineTo(cx + 4, cy + 2); g.lineTo(cx + 4, cy - 14);
      g.closePath(); g.strokePath();
      g.fillStyle(0x3a2a1a, 0.3);
      g.fillRect(cx - 10, cy - 14, 14, 20);
      // Copper wire at heel
      g.lineStyle(1, 0xc8782a, 0.9);
      g.beginPath();
      g.moveTo(cx - 10, cy + 2); g.lineTo(cx - 14, cy + 6); g.lineTo(cx - 10, cy + 6);
      g.strokePath();
    } else if (entryId === 'domovoi_watching') {
      // Chimney smoke forming face
      g.fillStyle(0x5a4a30, 0.5);
      g.fillRect(cx - 4, cy + 4, 8, 18); // chimney
      // Smoke wisps forming face
      g.fillStyle(0x8a7a5a, 0.25);
      g.fillCircle(cx, cy - 6, 8);
      g.fillCircle(cx - 4, cy - 12, 6);
      g.fillCircle(cx + 4, cy - 14, 5);
      // Face in smoke
      g.fillStyle(0x5a4a30, 0.35);
      g.fillCircle(cx - 3, cy - 10, 1.5); // eye
      g.fillCircle(cx + 3, cy - 10, 1.5); // eye
      g.lineStyle(1, 0x5a4a30, 0.25);
      g.beginPath(); g.moveTo(cx - 2, cy - 5); g.lineTo(cx + 2, cy - 5); g.strokePath(); // mouth
    } else if (entryId === 'ibbur_rivka') {
      // Two silhouettes in one body
      g.fillStyle(0x5a4a30, 0.4);
      g.fillCircle(cx - 4, cy - 16, 5); // head 1
      g.fillStyle(0x5a4a30, 0.25);
      g.fillCircle(cx + 4, cy - 16, 5); // head 2 (ghostly)
      g.fillStyle(0x5a4a30, 0.35);
      g.fillRect(cx - 6, cy - 11, 12, 20); // shared body
      // Hands sorting herbs
      g.fillStyle(0x5a7a3a, 0.4);
      g.fillCircle(cx - 10, cy + 4, 3);
      g.fillCircle(cx + 10, cy + 4, 3);
      g.fillCircle(cx - 8, cy + 8, 2);
    } else if (entryId === 'nocnica_cost') {
      // Peripheral shadow, slightly to one side
      g.fillStyle(0x5a4a30, 0.15);
      g.fillCircle(cx + 20, cy - 2, 14); // shadow mass
      g.fillStyle(0x5a4a30, 0.25);
      g.fillCircle(cx + 22, cy - 8, 6); // head shape
      // Watching hand — the mark
      g.lineStyle(1, 0xc8922a, 0.5);
      g.beginPath(); g.moveTo(cx - 10, cy + 6); g.lineTo(cx - 10, cy - 4); g.strokePath();
      g.fillStyle(0xc8922a, 0.3);
      g.fillCircle(cx - 10, cy, 3);
    } else if (entryId === 'observe_idol') {
      // Idol face, eyes open
      g.fillStyle(0x5a4a30, 0.7);
      g.fillRect(cx - 5, cy - 20, 10, 24); // body
      g.fillCircle(cx, cy - 24, 6); // head
      // Eyes open — amber
      g.fillStyle(0xc8922a, 0.9);
      g.fillRect(cx - 4, cy - 25, 3, 2);
      g.fillRect(cx + 1, cy - 25, 3, 2);
    } else if (entryId === 'observe_board') {
      // Window with one new plank
      g.lineStyle(1, 0x5a4a30, 0.5);
      g.strokeRect(cx - 14, cy - 14, 28, 22);
      // Old planks
      g.fillStyle(0x5a4a30, 0.3);
      g.fillRect(cx - 12, cy - 12, 24, 4);
      g.fillRect(cx - 12, cy - 4, 24, 4);
      g.fillRect(cx - 12, cy + 4, 24, 4);
      // One new plank — lighter
      g.fillStyle(0xa08860, 0.5);
      g.fillRect(cx - 12, cy - 4, 24, 4);
    } else if (entryId === 'observe_firefly') {
      // Jar with one brighter dot
      g.lineStyle(1, 0x5a4a30, 0.5);
      g.strokeRect(cx - 8, cy - 16, 16, 26); // jar body
      g.strokeRect(cx - 6, cy - 18, 12, 4); // jar lid
      // Fireflies — dim
      g.fillStyle(0xc8a848, 0.3);
      g.fillCircle(cx - 3, cy - 6, 2);
      g.fillCircle(cx + 4, cy + 2, 2);
      g.fillCircle(cx - 1, cy + 6, 2);
      // One brighter — matches mark
      g.fillStyle(0xffb347, 0.9);
      g.fillCircle(cx + 2, cy - 2, 2);
      g.fillStyle(0xffb347, 0.2);
      g.fillCircle(cx + 2, cy - 2, 6);
    } else if (entryId === 'observe_drawing') {
      // The covered frame — cloth corner lifted, the hand beneath
      g.lineStyle(1, 0x5a4a30, 0.6);
      g.strokeRect(cx - 14, cy - 18, 28, 32);
      g.fillStyle(0xd8d0b0, 0.5);
      g.fillTriangle(cx - 14, cy - 18, cx + 6, cy - 18, cx - 14, cy + 2); // cloth
      // The drawn hand
      g.lineStyle(1, 0x3a2a1a, 0.7);
      g.beginPath(); g.moveTo(cx + 2, cy + 8); g.lineTo(cx + 2, cy - 4); g.strokePath();
      g.beginPath(); g.moveTo(cx - 2, cy + 2); g.lineTo(cx - 2, cy - 6); g.strokePath();
      g.beginPath(); g.moveTo(cx + 6, cy + 2); g.lineTo(cx + 6, cy - 6); g.strokePath();
      // The mark on the palm — the only warm thing in the frame
      g.fillStyle(0xc8922a, 0.9);
      g.fillCircle(cx + 2, cy + 4, 2);
      g.fillStyle(0xc8922a, 0.25);
      g.fillCircle(cx + 2, cy + 4, 5);
    } else if (entryId === 'doc_rivka') {
      // Regency seal, cracked
      g.lineStyle(1, 0x5a4a30, 0.5);
      g.strokeCircle(cx, cy - 4, 14);
      g.strokeCircle(cx, cy - 4, 10);
      // Seal letter
      g.fillStyle(0x5a4a30, 0.6);
      g.fillRect(cx - 3, cy - 10, 6, 12);
      // Crack
      g.lineStyle(1, 0x8a6a40, 0.7);
      g.beginPath();
      g.moveTo(cx - 8, cy - 14); g.lineTo(cx + 2, cy - 4); g.lineTo(cx + 10, cy + 6);
      g.strokePath();
    } else if (entryId === 'ritual_roads') {
      // Five roads straightening, viewed from above
      g.fillStyle(0x5a4a30, 0.4);
      g.fillCircle(cx, cy, 4); // center
      const angles = [-90, -36, 36, 108, 180];
      for (const a of angles) {
        const rad = a * Math.PI / 180;
        g.lineStyle(2, 0x5a4a30, 0.6);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(rad) * 26, cy + Math.sin(rad) * 26);
        g.strokePath();
      }
      // Thread knots at midpoints
      g.fillStyle(0x4a5a7a, 0.7);
      for (const a of angles) {
        const rad = a * Math.PI / 180;
        g.fillCircle(cx + Math.cos(rad) * 13, cy + Math.sin(rad) * 13, 2);
      }
    }

    container.add(g);
    this._journalRightItems.push(g);
    return g;
  },
  // ── "Carried" — the player's possessions, bottom of the left page ──
  _buildJournalCarried(container) {
    const dpr = this._journalDpr;
    const cx = this._journalLeftPageCX;
    const y0 = this._journalPageY + this._journalPageH - 130;
    this._journalDrawRule(container, cx, y0, this._journalLeftPageW - 140);
    const hdr = this.add.text(cx, y0 + 16, 'C A R R I E D', {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#8a6a40',
    }).setOrigin(0.5, 0.5).setResolution(dpr);
    container.add(hdr);

    const inv = [...new Set(gameState.inventory || [])];
    if (!inv.length) {
      const none = this.add.text(cx, y0 + 38, 'Nothing but the mark on your hand.', {
        fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: '#a09070',
      }).setOrigin(0.5, 0).setResolution(dpr);
      container.add(none);
      return;
    }
    // Two columns, up to 4 rows (8 items); overflow noted quietly
    const colW = (this._journalLeftPageW - 80) / 2;
    const shown = inv.slice(0, 8);
    shown.forEach((id, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const t = this.add.text(
        this._journalLeftX + 8 + col * colW, y0 + 32 + row * 17,
        '· ' + itemDisplayName(id), {
          fontFamily: 'Georgia, serif', fontSize: '11px', color: '#5a4a30',
      }).setOrigin(0, 0).setResolution(dpr);
      container.add(t);
    });
    if (inv.length > 8) {
      const more = this.add.text(cx, y0 + 32 + 4 * 17, '…and ' + (inv.length - 8) + ' more', {
        fontFamily: 'Georgia, serif', fontSize: '10px', fontStyle: 'italic', color: '#a09070',
      }).setOrigin(0.5, 0).setResolution(dpr);
      container.add(more);
    }
  },
  _journalMoveSelection(dir) {
    if (!this._journalEntries.length) return;
    this._journalSelection = Math.max(0, Math.min(this._journalEntries.length - 1,
      this._journalSelection + dir));
    // Adjust scroll
    const max = this._journalMaxVisible;
    if (this._journalSelection < this._journalScrollOffset) {
      this._journalScrollOffset = this._journalSelection;
    } else if (this._journalSelection >= this._journalScrollOffset + max) {
      this._journalScrollOffset = this._journalSelection - max + 1;
    }
    this._journalRefresh();
  },
  _journalSelectEntry() {
    const entries = this._journalEntries;
    if (!entries.length) return;
    const id = entries[this._journalSelection];
    if (!id) return;
    // Mark as read
    const idx = gameState.journal.unread.indexOf(id);
    if (idx >= 0) gameState.journal.unread.splice(idx, 1);
    gameState.journal.selectedEntry = id;
    this._journalRefresh();
  },
  _journalRefresh() {
    const c = this._journalContainer;
    if (!c) return;
    this._journalMarkSelectedRead();
    this._buildJournalList(c);
    this._buildJournalRight(c);
  },
  // The right page shows the selected entry, so displaying it IS reading
  // it — clear the amber unread dot for whatever is currently selected.
  _journalMarkSelectedRead() {
    const id = this._journalEntries && this._journalEntries[this._journalSelection];
    if (!id) return;
    const idx = gameState.journal.unread.indexOf(id);
    if (idx >= 0) gameState.journal.unread.splice(idx, 1);
    gameState.journal.selectedEntry = id;
  },
  // ── Stance HUD — a quiet word in the corner, only when it matters ──
  _updateStanceHUD() {
    const cam = this.cameras.main;
    if (!this._stanceText) {
      this._stanceText = this.add.text(16, cam.height - 24, '', {
        fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic',
        color: '#8a9ab8', stroke: '#0e0e14', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(1003);
    }
    this._stanceText.setText(this._stanceQuiet ? '❖ quiet step' : '');
  },
});
