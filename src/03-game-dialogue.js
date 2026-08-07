
// ═══ 03 GAME DIALOGUE — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  // ── Marta / Ibbur — interaction entrypoint ────────────────────────
  beginMartaInteraction(ibbur) {
    const ms = gameState.martaState;
    const wasIbbur = ms.lastSeenAs === 'ibbur';
    const wasMarta = ms.lastSeenAs === 'marta';
    const lines = [];

    // Quiet "handover" line if persona has changed since last visit
    if (ibbur && wasMarta) {
      lines.push("(Her shoulders fall slack. Her eyes go half-closed. Someone else is looking out of them.)");
    } else if (!ibbur && wasIbbur) {
      lines.push("(She blinks twice, fast, the way someone surfaces from cold water. Her hands find the herbs again.)");
    }

    if (ibbur) {
      // Ibbur scenes
      if (ms.ibburScene === 0) {
        ms.ibburScene = 1;
        try { addJournalEntry('ibbur_rivka'); } catch (e) {}
        lines.push(
          "Child of the road. The mark on your hand is a door.",
          "We have walked this village before, in another mouth, in another year.",
          "There is a name written under the southern signpost. Do not say it aloud until the bell.",
          "Marta will not remember speaking. Be gentle when she returns."
        );
        if (typeof this.receiveIbburMessage === 'function') this.receiveIbburMessage();
      } else if (ms.ibburScene === 1) {
        ms.ibburScene = 2;
        lines.push(
          "You came back at the hinge of the day. Good.",
          "When the clean-coated one writes your name, do not correct his spelling.",
          "A wrong name is a small hiding place. Use it.",
          "We will be quiet now. The borrowed mouth grows tired."
        );
      } else {
        lines.push(
          "(Her lips move, but only the wind passes through them.)",
          "(The Ibbur is listening, not speaking.)"
        );
      }
    } else {
      // Marta scenes
      if (ms.martaScene === 0) {
        ms.martaScene = 1;
        lines.push(
          "Oh — you. The one with the burnt braid in Baba's parlour.",
          "Don't stand in my light, sit. Sit. The yarrow won't sort itself.",
          "If you came for tea I have none. If you came for warning I have plenty.",
          "There's a Wellness Officer due before the week is out. Brel. Soft voice. Watch his pen, not his face."
        );
      } else if (ms.martaScene === 1) {
        ms.martaScene = 2;
        lines.push(
          "Back already. Good — I was about to forget I'd told you anything.",
          "Listen: if you ever find me sitting like a stone with my eyes half-shut, leave the door open and don't shake me.",
          "It's not a fit. It's a guest. The kind that pays in old news.",
          "Whatever it tells you — it isn't lying. It's just not always speaking to you."
        );
      } else {
        lines.push(
          "(She glances up, gives you a tired half-smile, and goes back to the herbs.)",
          "Mind the doorstep on your way out. The boards remember bare feet."
        );
      }
    }

    ms.lastSeenAs = ibbur ? 'ibbur' : 'marta';
    this.speakMarta(lines, ibbur);
  },
  // ── DIALOGUE SYSTEM (Enhanced with typewriter effect) ──────────────
  // ── DIALOGUE SYSTEM (with choices & per-NPC styling) ────────────────
  // Supports: typewriter text, ">" stage directions, { type:'choice' }
  // branching, and two visual modes — Baba (ornate) vs Zuzka (simple).
  createDialogueUI() {
    const cam = this.cameras.main;

    // Panel background
    this.dialogueBg = this.add.graphics();
    this.dialogueBg.setScrollFactor(0).setDepth(1001).setVisible(false);

    // Folk-art border (used for Baba; hidden for Zuzka)
    this.dialogueBorder = this.add.graphics();
    this.dialogueBorder.setScrollFactor(0).setDepth(1001).setVisible(false);

    // NPC name label
    this.dialogueName = this.add.text(50, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold',
      color: '#ccaa66', stroke: '#0e0e14', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1002).setVisible(false);

    // Main dialogue text — body now 14px (was 16, ~85%) with 1.6× line height
    this.dialogueText = this.add.text(50, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '14px',
      color: '#ddccaa', stroke: '#0e0e14', strokeThickness: 2,
      wordWrap: { width: cam.width - 104 }, lineSpacing: 9,
    }).setScrollFactor(0).setDepth(1002).setVisible(false);

    // [E] Continue / [E] Close prompt — italic, cream, slightly smaller
    // than body, anchored bottom-right of the dialogue box
    this.dialogueContinue = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '12px',
      fontStyle: 'italic', color: '#ddccaa',
      stroke: '#0e0e14', strokeThickness: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(1002).setVisible(false);

    // Choice option texts (up to 3)
    this.choiceTexts = [];
    for (let i = 0; i < 3; i++) {
      const ct = this.add.text(0, 0, '', {
        fontFamily: 'Georgia, serif', fontSize: '13px',
        color: '#99aa88', stroke: '#0e0e14', strokeThickness: 2,
        wordWrap: { width: cam.width - 160 },
      }).setScrollFactor(0).setDepth(1002).setVisible(false);
      this.choiceTexts.push(ct);
    }

    // State
    this.dialogueActive = false;
    this.dialogueLines = [];
    this.dialogueIndex = 0;
    this.dialogueOnClose = null;
    this.dialogueSpeaker = '';      // current NPC name (for styling)
    this.dialogueStyle = 'ornate';  // 'ornate' (Baba) or 'simple' (Zuzka)
    this.typewriterTarget = '';
    this.typewriterPos = 0;
    this.typewriterDone = false;
    this.choiceActive = false;      // is a choice prompt currently shown?
    this.currentChoices = null;     // the choice object if active
  },
  // Open a new conversation. style: 'ornate' or 'simple'.
  openDialogue(name, lines, onClose, style) {
    if (this.dialogueActive) return;
    this.dialogueActive = true;
    try { sfx.play('dialogue_open'); } catch (e) {}
    // Baba's leitmotif rises with her dialogue
    if (typeof music !== 'undefined' && /Baba/.test(name || '')) {
      try { sfx.play('door_baba', { pan: this.babaSprite ? this._panFor(this.babaSprite.x) : 0 }); } catch (e) {}
      music.startBaba();
    }
    // Acting beat — the speaker acknowledges you with a tiny settle
    try {
      const spk = name || '';
      const actor = /Baba/.test(spk) ? this.babaSprite
        : /Zuzka/.test(spk) ? this.zuzkaSprite
        : /Ezra/.test(spk) ? this.ezraSprite
        : /Marta|Ibbur/.test(spk) ? this.martaSprite : null;
      if (actor) {
        this.tweens.add({
          targets: actor, scaleX: 1.04, scaleY: 0.96,
          duration: 130, yoyo: true, ease: 'Sine.easeOut',
        });
      }
      // Zuzka's fireflies notice the conversation
      if (/Zuzka/.test(spk)) this._zuzkaJarFlare = 2200;
    } catch (e) {}
    // Woodcut portrait beside the box (named cast only)
    try { this._showSpeakerPortrait(name || ''); } catch (e) {}
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueOnClose = onClose || null;
    this.dialogueSpeaker = name;
    this.dialogueStyle = style || 'ornate';
    this.choiceActive = false;
    this.currentChoices = null;
    this.showDialogueLine();
  },
  // Render one line (or a choice prompt) at the current index.
  showDialogueLine() {
    const cam = this.cameras.main;
    const entry = this.dialogueLines[this.dialogueIndex];

    // ── CHOICE PROMPT ─────────────────────────────────────────────
    if (entry && typeof entry === 'object' && entry.type === 'choice') {
      this.showChoicePrompt(entry);
      return;
    }

    // ── REGULAR LINE ──────────────────────────────────────────────
    this.choiceActive = false;
    this.hideChoices();

    // Box height +20% (was 95/110 → now 114/132)
    const panelH = this.dialogueStyle === 'simple' ? 114 : 132;
    const panelY = cam.height - panelH - 14;

    // Panel background
    this.dialogueBg.clear();
    this.dialogueBg.fillStyle(0x0e0e18, this.dialogueStyle === 'simple' ? 0.88 : 0.92);
    this.dialogueBg.fillRoundedRect(24, panelY, cam.width - 48, panelH, 4);
    this.dialogueBg.setVisible(true);

    // Border — ornate for Baba, plain line for Zuzka
    this.dialogueBorder.clear();
    const bx = 24, by = panelY, bw = cam.width - 48, bh = panelH;
    if (this.dialogueStyle === 'ornate') {
      this.dialogueBorder.lineStyle(1, PAL.copper, 0.6);
      this.dialogueBorder.beginPath();
      this.dialogueBorder.moveTo(bx + 8, by); this.dialogueBorder.lineTo(bx + bw - 8, by);
      this.dialogueBorder.strokePath();
      this.dialogueBorder.beginPath();
      this.dialogueBorder.moveTo(bx + 8, by + bh); this.dialogueBorder.lineTo(bx + bw - 8, by + bh);
      this.dialogueBorder.strokePath();
      for (let dx = bx + 30; dx < bx + bw - 20; dx += 40) {
        this.dialogueBorder.fillStyle(PAL.copper, 0.4);
        this.dialogueBorder.fillTriangle(dx, by - 3, dx + 4, by + 1, dx - 4, by + 1);
        this.dialogueBorder.fillTriangle(dx, by + 5, dx + 4, by + 1, dx - 4, by + 1);
      }
      for (const [cx, cy] of [[bx+6,by+3],[bx+bw-6,by+3],[bx+6,by+bh-3],[bx+bw-6,by+bh-3]]) {
        this.dialogueBorder.fillStyle(PAL.copper, 0.5);
        this.dialogueBorder.fillCircle(cx, cy, 2);
      }
    } else {
      // Simple — just a thin top line
      this.dialogueBorder.lineStyle(1, PAL.stoneDark, 0.4);
      this.dialogueBorder.beginPath();
      this.dialogueBorder.moveTo(bx + 12, by); this.dialogueBorder.lineTo(bx + bw - 12, by);
      this.dialogueBorder.strokePath();
    }
    this.dialogueBorder.setVisible(true);

    // NPC name — Zuzka: simpler font, no bold
    const nameStyle = this.dialogueStyle === 'simple'
      ? { fontFamily: 'monospace', fontSize: '12px', fontStyle: 'normal', color: '#8899aa' }
      : { fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#ccaa66' };
    Object.entries(nameStyle).forEach(([k, v]) => {
      if (k === 'fontFamily') this.dialogueName.setFontFamily(v);
      else if (k === 'fontSize') this.dialogueName.setFontSize(v);
      else if (k === 'fontStyle') this.dialogueName.setFontStyle(v);
      else if (k === 'color') this.dialogueName.setColor(v);
    });
    this.dialogueName.setText(this.dialogueSpeaker);
    // Name sits in the 16px top padding band, x = box (24) + 28 = 52
    this.dialogueName.setPosition(52, panelY + 8);

    // Body text — 14px base, scaled by the Text Size setting
    const textPx = Math.round(14 * (gameState.textScale || 1));
    this.dialogueText.setFontSize(textPx + 'px');

    // Stage direction vs spoken line
    const rawLine = entry;
    const isStageDirection = typeof rawLine === 'string' && rawLine.startsWith('>');

    if (isStageDirection) {
      this.typewriterTarget = rawLine.substring(1);
      this.dialogueText.setColor('#887766');
      this.dialogueText.setFontStyle('italic');
      this.dialogueName.setVisible(false);
    } else {
      this.typewriterTarget = '"' + rawLine + '"';
      this.dialogueText.setColor(this.dialogueStyle === 'simple' ? '#bbccbb' : '#ddccaa');
      this.dialogueText.setFontStyle('normal');
      this.dialogueName.setVisible(true);
    }

    // Strict text area: 28L / 28R / 16T (+ name band) / 40B padding.
    // box left = 24 → text x = 24 + 28 = 52. wrap width = cam.width - 48 - 56 = cam.width - 104.
    const textX = 52;
    const textY = panelY + 38; // 16 top pad + name(~22) ≈ 38
    this.dialogueText.setWordWrapWidth(cam.width - 104);
    this.dialogueText.setPosition(textX, textY);
    this.dialogueText.setVisible(true);

    // ── PAGINATION ────────────────────────────────────────────────
    // Wrap the full target, then chunk into pages that fit the box.
    const lineHeight = textPx + 9; // fontSize + lineSpacing
    const availH = panelH - 38 - 40; // panelH - top(name+pad) - bottom pad
    const maxLines = Math.max(1, Math.floor(availH / lineHeight));
    const wrapped = this.dialogueText.getWrappedText(this.typewriterTarget);
    this.dialoguePages = [];
    for (let i = 0; i < wrapped.length; i += maxLines) {
      this.dialoguePages.push(wrapped.slice(i, i + maxLines).join('\n'));
    }
    if (this.dialoguePages.length === 0) this.dialoguePages = [''];
    this.dialoguePageIndex = 0;
    this.typewriterTarget = this.dialoguePages[0];

    this.typewriterPos = 0;
    this.typewriterDone = false;
    this.dialogueText.setText('');

    this.dialogueContinue.setVisible(false);

    if (this.typewriterTimer) this.typewriterTimer.remove();
    // Instant Text setting: render the whole page at once
    if (gameState.instantText) {
      this.typewriterPos = this.typewriterTarget.length;
      this.dialogueText.setText(this.typewriterTarget);
      this.typewriterDone = true;
      this._showContinuePrompt();
      return;
    }
    this.typewriterTimer = this.time.addEvent({
      delay: 30, callback: this.tickTypewriter, callbackScope: this, loop: true,
    });
  },
  // ── CHOICE PROMPT ─────────────────────────────────────────────────
  // Shows 2–3 options the player picks with number keys.
  showChoicePrompt(choiceEntry) {
    this.choiceActive = true;
    this.currentChoices = choiceEntry;

    const cam = this.cameras.main;
    const numOpts = choiceEntry.options.length;
    const panelH = 80 + numOpts * 24;
    const panelY = cam.height - panelH - 14;

    // Panel
    this.dialogueBg.clear();
    this.dialogueBg.fillStyle(0x0e0e18, 0.92);
    this.dialogueBg.fillRoundedRect(24, panelY, cam.width - 48, panelH, 4);
    this.dialogueBg.setVisible(true);

    // Simple border
    this.dialogueBorder.clear();
    this.dialogueBorder.lineStyle(1, PAL.stoneDark, 0.4);
    this.dialogueBorder.beginPath();
    this.dialogueBorder.moveTo(36, panelY); this.dialogueBorder.lineTo(cam.width - 36, panelY);
    this.dialogueBorder.strokePath();
    this.dialogueBorder.setVisible(true);

    // Hide regular text
    this.dialogueText.setVisible(false);
    this.dialogueContinue.setVisible(false);
    this.dialogueName.setVisible(false);

    // Show choice header
    if (!this.choiceHeader) {
      this.choiceHeader = this.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#777766',
        stroke: '#0e0e14', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(1002);
    }
    this.choiceHeader.setText('Choose a response:');
    this.choiceHeader.setPosition(50, panelY + 10);
    this.choiceHeader.setVisible(true);

    // Show options
    choiceEntry.options.forEach((opt, i) => {
      if (this.choiceTexts[i]) {
        this.choiceTexts[i].setText(`[${i + 1}]  "${opt.label}"`);
        this.choiceTexts[i].setPosition(60, panelY + 34 + i * 24);
        this.choiceTexts[i].setVisible(true);
      }
    });
    // Hide unused slots
    for (let i = numOpts; i < this.choiceTexts.length; i++) {
      this.choiceTexts[i].setVisible(false);
    }

    // Stop typewriter
    if (this.typewriterTimer) this.typewriterTimer.remove();
    this.typewriterDone = true;
  },
  // Player selected a choice (0-indexed)
  selectChoice(index) {
    if (!this.choiceActive || !this.currentChoices) return;
    const opts = this.currentChoices.options;
    if (index < 0 || index >= opts.length) return;

    const chosen = opts[index];
    try { sfx.play('choice_select'); } catch (e) {}
    this.choiceActive = false;
    this.hideChoices();

    // Splice the response lines into dialogueLines right after this choice
    const insertAt = this.dialogueIndex + 1;
    this.dialogueLines.splice(insertAt, 0, ...chosen.response);

    // Advance past the choice object to the first response line
    this.dialogueIndex++;
    this.showDialogueLine();
  },
  hideChoices() {
    this.choiceTexts.forEach(ct => ct.setVisible(false));
    if (this.choiceHeader) this.choiceHeader.setVisible(false);
    this.currentChoices = null;
  },
  // Typewriter tick — one character at a time
  tickTypewriter() {
    if (this.typewriterDone) return;
    this.typewriterPos++;
    this.dialogueText.setText(this.typewriterTarget.substring(0, this.typewriterPos));

    if (this.typewriterPos >= this.typewriterTarget.length) {
      this.typewriterDone = true;
      if (this.typewriterTimer) this.typewriterTimer.remove();
      this._showContinuePrompt();
    }
  },
  // Show the [E] prompt anchored bottom-right of the dialogue box.
  _showContinuePrompt() {
    const cam = this.cameras.main;
    const panelH = this.dialogueStyle === 'simple' ? 114 : 132;
    const panelY = cam.height - panelH - 14;
    const morePages = this.dialoguePageIndex < (this.dialoguePages?.length || 1) - 1;
    const isLastLine = this.dialogueIndex >= this.dialogueLines.length - 1;
    const label = morePages ? '[E] Continue...' : (isLastLine ? '[E] Close' : '[E] Continue...');
    this.dialogueContinue.setText(label);
    // bottom-right anchor: 24 (box right inset) + 20 (right pad - origin)
    this.dialogueContinue.setPosition(cam.width - 28, panelY + panelH - 14);
    this.dialogueContinue.setVisible(true);
  },
  advanceDialogue() {
    if (!this.dialogueActive) return;

    // If a choice is showing, don't advance with E — need number keys
    if (this.choiceActive) return;
    try { sfx.play('dialogue_advance'); } catch (e) {}

    // If typewriter still going, skip to end of current page
    if (!this.typewriterDone) {
      this.typewriterPos = this.typewriterTarget.length;
      this.dialogueText.setText(this.typewriterTarget);
      this.typewriterDone = true;
      if (this.typewriterTimer) this.typewriterTimer.remove();
      this._showContinuePrompt();
      return;
    }

    // If more pages of the current line remain, advance the page
    if (this.dialoguePages && this.dialoguePageIndex < this.dialoguePages.length - 1) {
      this.dialoguePageIndex++;
      this.typewriterTarget = this.dialoguePages[this.dialoguePageIndex];
      this.typewriterPos = 0;
      this.typewriterDone = false;
      this.dialogueText.setText('');
      this.dialogueContinue.setVisible(false);
      if (this.typewriterTimer) this.typewriterTimer.remove();
      if (gameState.instantText) {
        this.typewriterPos = this.typewriterTarget.length;
        this.dialogueText.setText(this.typewriterTarget);
        this.typewriterDone = true;
        this._showContinuePrompt();
        return;
      }
      this.typewriterTimer = this.time.addEvent({
        delay: 30, callback: this.tickTypewriter, callbackScope: this, loop: true,
      });
      return;
    }

    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      this.closeDialogue();
    } else {
      this.showDialogueLine();
    }
  },
  // ═══════════════════════════════════════════════════════════════════
  //  WOODCUT PORTRAITS — a carved face beside the dialogue box.
  //  Style: bold ink contours + hatched shading on parchment, one accent
  //  colour per character ("folk illustration damaged by rain").
  // ═══════════════════════════════════════════════════════════════════
  _showSpeakerPortrait(name) {
    const key = /Baba/.test(name) ? 'baba'
      : /Zuzka/.test(name) ? 'zuzka'
      : /Ezra/.test(name) ? 'ezra'
      : /Ibbur/.test(name) ? 'ibbur'
      : /Marta/.test(name) ? 'marta'
      : /Dziadek|Józef/.test(name) ? 'dziadek'
      : /Brel|Officer/.test(name) ? 'brel'
      : null;
    if (!key) { if (this._portraitC) this._portraitC.setVisible(false); return; }

    const cam = this.cameras.main;
    const panelH = this.dialogueStyle === 'simple' ? 114 : 132;
    const px = 78, py = cam.height - panelH - 14 - 40; // floats over the box's left corner
    if (!this._portraitC) {
      this._portraitC = this.add.container(0, 0).setScrollFactor(0).setDepth(1002);
      this._portraitG = this.add.graphics();
      this._portraitC.add(this._portraitG);
    }
    this._portraitC.setPosition(px, py);
    this._portraitC.setVisible(true);
    const g = this._portraitG;
    g.clear();

    // ── The carved frame ──
    g.fillStyle(0x000000, 0.5); g.fillRect(-31, -28, 62, 62);       // drop shadow
    g.fillStyle(0x1a0e08, 1);   g.fillRect(-33, -32, 64, 64);       // dark wood
    g.fillStyle(0xd8c8a0, 1);   g.fillRect(-29, -28, 56, 56);       // parchment
    g.lineStyle(1, 0x8a6a3a, 0.9); g.strokeRect(-27, -26, 52, 52);  // inner rule
    // Corner diamonds
    g.fillStyle(0xc8922a, 1);
    [[-33, -32], [29, -32], [-33, 30], [29, 30]].forEach(([cx, cy]) => {
      g.fillTriangle(cx + 2, cy - 2, cx + 5, cy + 1, cx + 2, cy + 4);
      g.fillTriangle(cx + 2, cy - 2, cx - 1, cy + 1, cx + 2, cy + 4);
    });
    // Rain-damage stain on the parchment
    g.fillStyle(0xb8a67e, 0.5); g.fillEllipse(14, -16, 22, 16);

    const INK = 0x241408;
    const hatch = (x0, y0, w, h, gap, alpha) => {
      g.lineStyle(1, INK, alpha === undefined ? 0.35 : alpha);
      for (let d = -h; d < w; d += gap) {
        g.beginPath();
        g.moveTo(x0 + Math.max(0, d), y0 + Math.max(0, -d));
        g.lineTo(x0 + Math.min(w, d + h), y0 + Math.min(h, h - (d + h - w) > h ? h : (w - d)));
        g.strokePath();
      }
    };
    const line = (x0, y0, x1, y1, wdt) => {
      g.lineStyle(wdt || 2, INK, 1);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath();
    };
    const px2 = (x, y, w, h, col, a) => { g.fillStyle(col, a === undefined ? 1 : a); g.fillRect(x, y, w, h); };

    this['_portrait_' + key](g, line, hatch, px2, INK);
  },
  // ── BABA — headscarf, storm brows, the unimpressed mouth ──
  _portrait_baba(g, line, hatch, px2, INK) {
    px2(-14, -20, 30, 12, 0x3a2e50);              // scarf crown (bruised purple)
    px2(-16, -12, 6, 22, 0x3a2e50);               // scarf side fall
    px2(12, -14, 8, 10, 0x4a3a62);                // knot
    line(-14, -20, 16, -20); line(-16, -10, -10, 12); // scarf contours
    line(16, -20, 16, -8);
    // Face block
    px2(-10, -10, 22, 26, 0xd8c8a0, 0);           // (parchment shows through)
    line(-10, -10, -10, 12); line(12, -10, 12, 8);
    line(-10, 12, -2, 18); line(-2, 18, 10, 14); line(10, 14, 12, 8);
    // Storm brows — heavy single strokes
    line(-8, -6, 0, -7, 3); line(3, -7, 11, -6, 3);
    // Eyes: short lids beneath
    line(-6, -2, -1, -2, 2); line(4, -2, 9, -2, 2);
    // Nose — one decisive hook
    line(1, -4, 1, 4, 2); line(1, 4, 4, 5, 2);
    // The mouth: pressed, slightly down at one corner
    line(-3, 10, 7, 9, 2); line(-3, 10, -4, 9, 1);
    // Wrinkle hatching on the cheeks
    hatch(-9, 2, 6, 6, 3, 0.3); hatch(7, 0, 6, 6, 3, 0.3);
    // Grey wisp escaping the scarf
    g.lineStyle(1, 0x8a8274, 1);
    g.beginPath(); g.moveTo(-11, -12); g.lineTo(-14, -4); g.strokePath();
    // Accent: madder-red collar band
    px2(-12, 16, 28, 6, 0x6a2430);
    line(-12, 16, 16, 16, 1);
  },
  // ── ZUZKA — round face, uneven braids, eyes that don't look away ──
  _portrait_zuzka(g, line, hatch, px2, INK) {
    // Hair crown + two braids, left longer
    px2(-12, -20, 26, 8, 0x2a1a0e);
    px2(-15, -14, 6, 26, 0x2a1a0e);               // left braid (long)
    px2(11, -14, 6, 18, 0x2a1a0e);                // right braid (short)
    // Braid ties
    px2(-15, 10, 6, 3, 0x4a5a7a); px2(11, 2, 6, 3, 0x4a5a7a);
    // Braid weave ticks
    line(-13, -8, -10, -6, 1); line(-13, 0, -10, 2, 1);
    line(13, -8, 16, -6, 1); line(13, -2, 16, 0, 1);
    // Face — rounder contour
    line(-9, -13, -9, 10); line(11, -13, 11, 8);
    line(-9, 10, 1, 16); line(1, 16, 11, 8);
    // Big steady eyes — dots with full outlines (she doesn't look away)
    g.lineStyle(2, INK, 1); g.strokeCircle(-3, -2, 3); g.strokeCircle(6, -2, 3);
    g.fillStyle(INK, 1); g.fillCircle(-3, -2, 1.4); g.fillCircle(6, -2, 1.4);
    // Small nose tick + calm mouth
    line(1, 3, 2, 5, 1);
    line(-2, 10, 5, 10, 2);
    // Fringe strokes
    line(-8, -13, -6, -10, 1); line(-2, -14, 0, -11, 1); line(5, -14, 7, -11, 1);
    // Accent: the firefly — one warm dot at her collar
    px2(-10, 14, 24, 6, 0x4a5a7a);                // patched dress collar
    g.fillStyle(0xffb347, 1); g.fillCircle(9, 17, 2.4);
    g.fillStyle(0xffb347, 0.3); g.fillCircle(9, 17, 5.5);
  },
  // ── EZRA — round cap, wire glasses, the gentle beard ──
  _portrait_ezra(g, line, hatch, px2, INK) {
    // Cap
    px2(-12, -22, 26, 8, 0x4a3a2a);
    px2(-14, -15, 30, 3, 0x5c4836);               // brim
    line(-12, -22, 14, -22); line(-14, -13, 16, -13, 1);
    // Face
    line(-9, -12, -9, 8); line(11, -12, 11, 8);
    // Wire glasses — two inked rings and the bridge
    g.lineStyle(2, INK, 1);
    g.strokeCircle(-3, -3, 4.5); g.strokeCircle(7, -3, 4.5);
    g.beginPath(); g.moveTo(1, -3); g.lineTo(3, -3); g.strokePath();
    g.beginPath(); g.moveTo(-8, -4); g.lineTo(-9, -6); g.strokePath();
    // Eyes behind — gentle downward looks
    g.fillStyle(INK, 1); g.fillRect(-4, -3, 2, 1.5); g.fillRect(6, -3, 2, 1.5);
    // Nose
    line(2, 0, 2, 4, 2);
    // Beard — hatched white mass with contour
    px2(-8, 6, 20, 12, 0xe8e2d0);
    line(-8, 6, -9, 14, 1); line(12, 6, 13, 14, 1);
    line(-9, 14, 2, 20, 1); line(2, 20, 13, 14, 1);
    hatch(-6, 8, 16, 8, 3, 0.25);
    // The faint smile inside it
    line(-1, 9, 5, 9, 2);
    // Accent: copper wire coiled at the collar
    g.lineStyle(2, 0xb8742c, 1);
    g.strokeCircle(-10, 18, 3);
    g.beginPath(); g.moveTo(-7, 18); g.lineTo(-2, 20); g.strokePath();
  },
  // ── MARTA — orange-red scarf, sharp knowing eyes ──
  _portrait_marta(g, line, hatch, px2, INK) {
    px2(-13, -20, 28, 11, 0xc05a20);              // scarf (orange-red)
    px2(13, -12, 6, 14, 0xc05a20);                // tail over shoulder
    px2(-13, -10, 4, 8, 0xc05a20);
    line(-13, -20, 15, -20); line(-13, -9, -9, -12, 1);
    px2(14, -14, 5, 4, 0xa04818);                 // knot shadow
    // Face
    line(-9, -11, -9, 10); line(11, -11, 11, 9);
    line(-9, 10, 0, 15); line(0, 15, 11, 9);
    // Sharp eyes — angled lids
    line(-7, -3, -1, -4, 2); line(3, -4, 9, -3, 2);
    g.fillStyle(INK, 1); g.fillRect(-5, -3, 2, 2); g.fillRect(5, -3, 2, 2);
    // Nose + knowing half-smile
    line(1, -1, 1, 4, 2);
    line(-2, 9, 6, 8, 2); line(6, 8, 8, 6, 1);
    // Grey strand
    g.lineStyle(1, 0x9a8a78, 1);
    g.beginPath(); g.moveTo(-8, -10); g.lineTo(-11, -2); g.strokePath();
    // Accent: herb sprig at the collar
    px2(-11, 14, 26, 6, 0x4a2416);
    g.fillStyle(0x5e7032, 1);
    g.fillTriangle(6, 13, 9, 17, 3, 17); g.fillRect(5.5, 17, 1, 3);
  },
  // ── IBBUR — Marta's face, still; lit slits; pale motes ──
  _portrait_ibbur(g, line, hatch, px2, INK) {
    px2(-13, -20, 28, 11, 0x6a6080);              // scarf re-tinted violet-grey
    px2(13, -12, 6, 14, 0x6a6080);
    line(-13, -20, 15, -20);
    line(-9, -11, -9, 10); line(11, -11, 11, 9);
    line(-9, 10, 0, 15); line(0, 15, 11, 9);
    // Half-closed slits, lit from inside
    line(-7, -3, -1, -3, 2); line(3, -3, 9, -3, 2);
    g.fillStyle(0xffd890, 0.85);
    g.fillRect(-6, -2.5, 4, 1.5); g.fillRect(4, -2.5, 4, 1.5);
    // Level mouth — someone else's stillness
    line(-1, 9, 5, 9, 2);
    // Shimmer motes drifting off the borrowed body
    g.fillStyle(0xd8d0f0, 0.8);
    g.fillCircle(-14, -6, 1.2); g.fillCircle(15, -14, 1); g.fillCircle(13, 12, 1);
    g.fillStyle(0xd8d0f0, 0.35);
    g.fillCircle(-12, 8, 2); g.fillCircle(17, -2, 1.6);
    // Accent: none. The Ibbur borrows even the colour.
  },
  // ── DZIADEK — flat cap, long beard, the tear glint ──
  _portrait_dziadek(g, line, hatch, px2, INK) {
    px2(-13, -20, 28, 7, 0x32302a);               // flat cap
    px2(-15, -14, 32, 3, 0x403c34);               // brim
    line(-13, -20, 15, -20); line(-15, -12, 17, -12, 1);
    // Face — narrow, weathered
    line(-8, -11, -8, 6); line(10, -11, 10, 6);
    // Nearly closed eyes — two resting strokes
    line(-6, -3, -1, -3, 2); line(3, -3, 8, -3, 2);
    // Nose
    line(1, -1, 1, 3, 2);
    // The tear glint — one pale drop under the right eye
    g.fillStyle(0xc8d8e8, 0.9); g.fillCircle(6, 1, 1.4);
    // Long beard — hatched, tapering past the frame's heart
    px2(-7, 5, 18, 16, 0xe8e2d0);
    line(-7, 5, -9, 15, 1); line(11, 5, 12, 13, 1);
    line(-9, 15, 2, 24, 1); line(2, 24, 12, 13, 1);
    hatch(-5, 7, 14, 12, 3, 0.25);
    // Accent: navy vest edge + lantern-gold fleck
    px2(-11, 19, 10, 4, 0x2a3a52);
    g.fillStyle(0xffd890, 1); g.fillCircle(13, 20, 1.6);
    g.fillStyle(0xffd890, 0.3); g.fillCircle(13, 20, 4);
  },
  // ── BREL — zinc-grey, precise, the clipboard edge ──
  _portrait_brel(g, line, hatch, px2, INK) {
    // Peaked cap, cold and square
    px2(-12, -22, 26, 7, 0x6a7280);
    px2(-14, -16, 30, 3, 0x8a92a0);
    px2(-4, -21, 10, 3, 0x5a3a70);                // bruised-purple band
    line(-12, -22, 14, -22, 1); line(-14, -14, 16, -14, 1);
    // Face — longer, symmetrical, unweathered
    line(-8, -12, -8, 10); line(10, -12, 10, 10);
    line(-8, 10, 1, 14); line(1, 14, 10, 10);
    // Eyes: perfectly level. That is the unsettling part.
    line(-6, -4, -1, -4, 2); line(3, -4, 8, -4, 2);
    g.fillStyle(INK, 1); g.fillRect(-4, -4, 1.5, 1.5); g.fillRect(5, -4, 1.5, 1.5);
    // Thin nose, thinner mouth — polite, certain
    line(1, -2, 1, 4, 1);
    line(-2, 9, 5, 9, 1);
    // No hatching. Nothing weathered. Clean-shaven jaw line only.
    // Accent: the clipboard edge rising into frame
    px2(6, 14, 14, 10, 0x8a92a0);
    px2(7, 15, 12, 2, 0xe8e8e0);
    line(6, 14, 20, 14, 1);
  },
  closeDialogue() {
    this.dialogueActive = false;
    if (this._portraitC) this._portraitC.setVisible(false);
    this.choiceActive = false;
    if (typeof music !== 'undefined' && /Baba/.test(this.dialogueSpeaker || '')) {
      music.stopBaba();
    }
    this.dialogueBg.setVisible(false);
    this.dialogueBorder.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueText.setVisible(false);
    this.dialogueContinue.setVisible(false);
    this.hideChoices();
    if (this.typewriterTimer) this.typewriterTimer.remove();

    if (this.dialogueOnClose) {
      this.dialogueOnClose();
      this.dialogueOnClose = null;
    }

    this.dialogueLines = [];
    this.dialogueIndex = 0;
  },
  // ── Optional player interaction with Brel ────────────────────────
  tryBrelDialogue() {
    if (!this._brelInteractable || this.dialogueActive) return false;
    const officer = this.officerSprite;
    if (!officer) return false;
    // Distance check
    const px = this.player.x, py = this.player.y;
    const d = Math.hypot(px - officer.x, py - officer.y);
    if (d > 6 * TILE_W) return false;
    this._brelInteractable = false;
    const scene = this;
    const mode = this._brelMode || 'neutral';
    const extra = mode === 'high'
      ? '\n\n"And the marsh road. And the inn door. We do notice."'
      : '';
    this.openDialogue('Officer Brel', [
      'Officer Brel turns. His pen hovers.',
      '"Good afternoon. A moment of your time?"' + extra,
    ], () => {
      this.showDialogueChoices([
        { text: 'Just passing through.', onSelect: () => { adjustAttention(0, 'brel_passing'); } },
        { text: "I haven't noticed anything unusual.", onSelect: () => { adjustAttention(1, 'brel_lie'); } },
        { text: '... (say nothing)', onSelect: () => {
          adjustAttention(-1, 'brel_silence');
          // 4s pause beat
          setTimeout(() => {}, 4000);
        }},
      ]);
    });
    return true;
  },
  tryEzraInteraction() {
    // Indoors after dusk — no one to talk to at the empty stool
    if (!this.ezraSprite || !this.ezraSprite.visible) return false;
    const dx = this.playerCartX - EZRA.cartX;
    const dy = this.playerCartY - EZRA.cartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > EZRA.interactRadius) return false;

    const iso = cartToIso(EZRA.cartX, EZRA.cartY);
    // If holding the codex fragment, offer the special "show" prompt
    const holdingCodex = gameState.inventory.includes('cure_codex_fragment_1');
    const promptLabel = (holdingCodex && !gameState.ezraState.codexShown)
      ? '[E] Show Ezra the Codex page'
      : '[E] Talk to Ezra';
    this.interactPrompt.setText(promptLabel);
    this.interactPrompt.setPosition(
      iso.x + this.worldOffset.x,
      iso.y + this.worldOffset.y - 44
    );
    this.interactPrompt.setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.interactPrompt.setVisible(false);
      const branch = this.getEzraDialogueBranch();
      // Memory callback — he noticed the watcher crow (once, high attention)
      let ezraLines = branch.lines;
      if (gameState.regencyAttention >= 3 && !gameState._cbEzraCrow) {
        gameState._cbEzraCrow = true;
        ezraLines = branch.lines.concat([
          "A crow has been sitting on my roof-beam. They only gather like that when someone interesting is being watched. I'd be careful which forms you sign.",
        ]);
      }
      this.openDialogue('Ezra', ezraLines, branch.onClose, 'simple');
    }
    return true;
  },
  getEzraDialogueBranch() {
    const ez = gameState.ezraState;
    const metOnce = ez.sceneShown !== null;
    // Scene 8 — only if Brel scene has played and not yet acknowledged
    if (this.officerScenePlayed && ez.sceneShown !== '8') {
      return {
        lines: EZRA_DIALOGUE.scene8_postBrel,
        onClose: () => { ez.sceneShown = '8'; },
      };
    }
    // Scene 7 — showing the Codex (one-shot)
    if (gameState.inventory.includes('cure_codex_fragment_1') && !ez.codexShown) {
      return {
        lines: EZRA_DIALOGUE.scene7_showCodex,
        onClose: () => {
          ez.codexShown = true;
          ez.sceneShown = '7';
          try { addJournalEntry('ezra_boots'); } catch (e) {}
          this.showCodexToEzra(); // +1 attention
        },
      };
    }
    // Scene 5 — after fragment received (returning visit, not showing)
    if (gameState.questComplete && gameState.inventory.includes('cure_codex_fragment_1')) {
      return { lines: EZRA_DIALOGUE.scene5, onClose: () => { ez.sceneShown = '5'; } };
    }
    // Scene 4 — all knots placed
    if (gameState.knotsPlaced >= 5) {
      return { lines: EZRA_DIALOGUE.scene4, onClose: () => { ez.sceneShown = '4'; } };
    }
    // Scene 3 — mid-quest, knots 2-3
    if (gameState.knotsPlaced >= 2 && gameState.knotsPlaced <= 3) {
      return { lines: EZRA_DIALOGUE.scene3, onClose: () => { ez.sceneShown = '3'; } };
    }
    // Scene 2 — quest started, no knots placed
    if (gameState.knotsGiven && gameState.knotsPlaced === 0) {
      return { lines: EZRA_DIALOGUE.scene2, onClose: () => { ez.sceneShown = '2'; } };
    }
    // Scene 1B — first meeting AND perimeter walked first
    if (!metOnce && gameState.ritualState.perimeter_walked) {
      return {
        lines: EZRA_DIALOGUE.scene1b,
        onClose: () => {
          ez.sceneShown = '1b';
          if (!ez.copperWireGiven) {
            ez.copperWireGiven = true;
            gameState.inventory.push('copper_wire');
            this.showItemNotification('Received: Copper Wire');
          }
        },
      };
    }
    // Scene 1 — first meeting
    if (!metOnce) {
      return {
        lines: EZRA_DIALOGUE.scene1,
        onClose: () => { ez.sceneShown = '1'; },
      };
    }
    // Default repeat — quiet
    return {
      lines: [
        ">Ezra nods at you without looking up.",
        "Mm. Take your time.",
      ],
      onClose: null,
    };
  },
  // ── DIALOGUE BRANCH SELECTOR ──────────────────────────────────────
  // Returns { lines: [...], onClose: function } based on gameState.
  getBabaDialogueBranch() {

    // ── Act 2+: repeat visits ───────────────────────────────────────
    // Requires the ending to have actually played: the codex onClose
    // sets act=2 immediately, which used to serve Act 2 farewell content
    // in the very next conversation of Act 1.
    if (gameState.act >= 2 && gameState.act1Complete) {
      if (!gameState.hasBurntBraid) {
        return {
          lines: BABA_DIALOGUE.act2_firstReturn,
          onClose: () => {
            gameState.hasBurntBraid = true;
            gameState.inventory.push('burnt_braid');
            this.showItemNotification('Received: Burnt Braid Bracelet');
          },
        };
      }
      return {
        lines: BABA_DIALOGUE.act2_repeat,
        onClose: null,
      };
    }

    // ── Act 1: Quest complete — all 5 knots placed ──────────────────
    // Gate on codexFragmentCollected, NOT questComplete: the vision-end
    // timer sets questComplete seconds after the 5th vision, which made
    // this reveal branch unreachable at walking speed (golden-path lock).
    if (gameState.knotsPlaced >= 5 && !gameState.codexFragmentCollected) {
      return {
        lines: BABA_DIALOGUE.questComplete,
        onClose: () => {
          gameState.questComplete = true;
          gameState.hasGlassCharm = true;
          gameState.inventory.push('cure_codex_fragment_1');
          gameState.inventory.push('glass_charm');
          try { sfx.play('codex_reveal'); } catch (e) {}
          gameState.codexFragmentCollected = true;
          try { addJournalEntry('baba_revelation'); } catch (e) {}
          this.showItemNotification('Received: Cure Codex Fragment · Glass Charm');
          // Advance to Act 2 after this conversation
          gameState.act = 2;
          // ── REGENCY: passive copper-wire bonus + lock in Brel mode ──
          if (gameState.inventory.includes('copper_wire')) {
            adjustAttention(-2, 'copper_wire_passive');
          }
          const a = gameState.regencyAttention;
          if (a <= -4)      gameState.brelMode = 'low';
          else if (a >= 4)  gameState.brelMode = 'high';
          else              gameState.brelMode = 'neutral';
          if (gameState.brelMode === 'low')      gameState.brelArrivalDelay = 90000;
          else if (gameState.brelMode === 'high') gameState.brelArrivalDelay = -11000;
          else                                        gameState.brelArrivalDelay = 0;
          // Save AFTER act/brelMode are locked in — an earlier snapshot
          // silently dropped the earned finale variant on reload
          try { saveGame(); } catch (e) {}
        },
      };
    }

    // ── Act 1: Quest complete already, but still in Act 1 ───────────
    if (gameState.questComplete) {
      return {
        lines: BABA_DIALOGUE.act2_repeat,
        onClose: null,
      };
    }

    // ── Act 1: First meeting — never spoken before ──────────────────
    if (!gameState.babaMetOnce) {
      return {
        lines: BABA_DIALOGUE.firstMeeting,
        onClose: () => {
          gameState.babaMetOnce = true;
          gameState.knotsGiven = true;
          gameState.inventory.push('thread_knots');
          this.showItemNotification('Received: Five Thread Knots');
          // ── Activate the crossroads quest ──
          gameState.questActive = true;
          // Save AFTER all flags are set — an early snapshot could strand
          // a reloaded run with babaMetOnce but no quest
          try { saveGame(); } catch (e) {}
          if (typeof music !== 'undefined') music.startCrossroadsIfIdle();
          this.showThreadKnotHUD();
        },
      };
    }

    // ── Act 1: Mid-quest check-ins ──────────────────────────────────
    if (gameState.knotsPlaced <= 1) {
      return { lines: BABA_DIALOGUE.checkIn_early, onClose: null };
    }
    if (gameState.knotsPlaced <= 3) {
      return { lines: BABA_DIALOGUE.checkIn_mid, onClose: null };
    }
    // 4 knots placed
    return { lines: BABA_DIALOGUE.checkIn_almost, onClose: null };
  },
  // ── ZUZKA DIALOGUE BRANCH SELECTOR ────────────────────────────────
  // Returns { lines: [...], onClose: function } based on gameState.
  getZuzkaDialogueBranch() {

    // Farewell — after quest is complete and hasn't been done yet
    if (gameState.questComplete && !gameState.zuzkaFarewellDone) {
      return {
        lines: ZUZKA_DIALOGUE.farewell,
        _fireflySfx: (() => { try { setTimeout(() => sfx.play('firefly_jar'), 800); } catch (e) {} return true; })(),
        onClose: () => {
          gameState.zuzkaFarewellDone = true;
          gameState.hasFirefly = true;
          gameState.inventory.push('firefly');
          this.showItemNotification('Received: Sleeping Firefly');
        },
      };
    }

    // Post-farewell — quest done, no more unique dialogue
    if (gameState.zuzkaFarewellDone) {
      return {
        lines: ZUZKA_DIALOGUE.quest_done,
        onClose: null,
      };
    }

    // During quest — knots being placed
    if (gameState.knotsGiven && gameState.knotsPlaced >= 3) {
      return { lines: ZUZKA_DIALOGUE.quest_done, onClose: null };
    }
    if (gameState.knotsGiven && gameState.knotsPlaced >= 1) {
      return { lines: ZUZKA_DIALOGUE.quest_mid, onClose: null };
    }
    if (gameState.knotsGiven) {
      return { lines: ZUZKA_DIALOGUE.quest_early, onClose: null };
    }

    // Lingering before visiting Baba — met Zuzka but not Baba yet
    if (gameState.zuzkaMetOnce && !gameState.babaMetOnce) {
      return {
        lines: ZUZKA_DIALOGUE.beforeBaba,
        onClose: () => { gameState.zuzkaSecondTalk = true; },
      };
    }

    // First encounter — never spoken to Zuzka
    if (!gameState.zuzkaMetOnce) {
      return {
        lines: ZUZKA_DIALOGUE.firstEncounter,
        onClose: () => { gameState.zuzkaMetOnce = true; try { saveGame(); } catch (e) {} },
      };
    }

    // Default fallback
    return { lines: ZUZKA_DIALOGUE.beforeBaba, onClose: null };
  },
  // ── DOMOVOI: chimney-voice line delivery ─────────────────────
  // Centered italic text, no dialogue box. Each line: fade in 1s,
  // hold 4s, fade out, with a faint chimney crackle SFX underneath.
  speakDomovoi(lines, onDone) {
    if (!lines || !lines.length) { if (onDone) onDone(); return; }
    this._domovoiSpeaking = true;
    try { sfx.loop('domovoi_crackle', 1, 400); } catch (e) {}
    const scene = this;
    const cam = this.cameras.main;
    let i = 0;
    const playLine = () => {
      if (i >= lines.length) {
        this._domovoiSpeaking = false;
        try { sfx.stopLoop('domovoi_crackle', 600); } catch (e) {}
        if (onDone) onDone();
        return;
      }
      const lineText = lines[i++];
      // Empty string = pause beat
      if (!lineText) { setTimeout(playLine, 1500); return; }
      const t = scene.add.text(cam.width / 2, cam.height / 2, lineText, {
        fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'italic',
        color: '#d8c098', stroke: '#0a0a10', strokeThickness: 2,
        align: 'center', wordWrap: { width: cam.width * 0.7 }, lineSpacing: 6,
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1300).setAlpha(0);
      // Chimney crackle SFX
      scene.playChimneyCrackle();
      scene.tweens.add({ targets: t, alpha: 1, duration: 1000, ease: 'Sine.easeOut' });
      setTimeout(() => {
        scene.tweens.add({
          targets: t, alpha: 0, duration: 800,
          onComplete: () => { t.destroy(); playLine(); },
        });
      }, 5000);
    };
    playLine();
  },
});
