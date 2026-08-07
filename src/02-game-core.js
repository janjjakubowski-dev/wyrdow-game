class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  init(data) {
    this.firstVisit = !!(data && data.firstVisit);
    // Door transitions restart the scene with a spawn point override
    this._spawnOverride = (data && data.spawn) || null;
  }
  preload() {
    music.preload(this);
    sfx.preload(this);
    // Generate ground tile variants procedurally — 4 variants each so no
    // two tiles look identical. No strokes/symbols on the diamonds.
    for (let i = 0; i < 4; i++) {
      this.makeGrassTileVariant('tile_grass_' + i, i);
      this.makeDirtTileVariant('tile_dirt_' + i, i);
      this.makeBlendTileVariant('tile_blend_' + i, i);
    }
    // Special tiles (kept for compatibility — used at the crossroads centre,
    // house pads, mud, and eerie road).
    this.makeDirtTileVariant('tile_cross', 0, { warm: true });
    this.makeIsoTileFlat('tile_house', PAL.stoneDark);
    this.makeDirtTileVariant('tile_mud',  0, { dark: true });
    this.makeDirtTileVariant('tile_eerie',0, { eerie: true });
  }
  // ── CREATE ────────────────────────────────────────────────────────
  create() {
    // Phase B world loader seam: interiors are small TownDefinitions
    // with their own compact build/update path (LBA mandate)
    this.town = activeTown();
    this._transitioning = false; // reset on every (re)build — travel/doors set it
    if (this.town.isInterior) { this.createInterior(); return; }

    this.cameras.main.setBackgroundColor(PAL.sky);
    this.worldOffset = { x: 750, y: 80 };

    // Rendering layers (ordered back-to-front)
    this.groundLayer = this.add.container(0, 0);      // floor tiles
    this.lightLayer = this.add.container(0, 0);       // ground light pools
    this.objectLayer = this.add.container(0, 0);      // houses, NPCs, player
    this.particleLayer = this.add.container(0, 0);    // atmospheric particles

    // Track animated grass blades for wind sway
    this.grassBlades = [];
    // Track smoke particles for chimneys
    this.smokeEmitters = [];
    // Track dust particles for footsteps
    this.dustParticles = [];
    // Floating ambient particles (fireflies, ash, pollen)
    this.ambientParticles = [];
    // Light pool graphics for warm glow
    this.lightPools = [];
    // Window positions for curtain animation
    this.windowPositions = [];
    // Idol eye state
    this.idolEyesOpen = 0; // 0 = closed, 1 = fully open
    this.playerIdleTime = 0; // ms spent standing still near idol
    // Baba door bell animation
    this.babaBellSwing = 0; // current swing angle
    // Vision system state
    this.visionActive = false;
    this.handGlowLevel = 0; // 0–5, increases after each vision
    // Marker graphics for placed/unplaced state
    this.markerGraphics = [];
    // Wellness Officer arrival scene state
    this.officerSprite = null;
    this.officerScenePlayed = false;
    this.act1TitleShown = false;

    this.drawGround();
    this.drawAllHouses();
    // ── Wyrdów-specific world: idol, shrines, quest, the whole cast ──
    const isWyrdow = this.town.id === 'wyrdow';
    if (isWyrdow) {
      this.drawStrawIronIdol();
      this.drawWaysideShrines();
      this.drawVillageWell();
      this.drawSignposts();
      this.drawScatterDetails();
      this.drawMarkers();
      this.createBabaElzbieta();
      // FIX 1 — initialise Zuzka auto-approach flags so cold-state checks
      // (e.g. cancelZuzkaApproach, the firstVisit guard) never read undefined.
      this._zuzkaApproaching = false;
      this._zuzkaApproachQueued = false;
      this._zuzkaApproachTween = null;
      this._zuzkaApproachOrigin = null;
      this.createZuzka();
      this.createEzra();
      this.createMarta();
      this.createDziadek();
      this.drawAbandonedInnDetails();
      this.createBackgroundVillagers();
    } else if (this.town.dress) {
      // Non-Wyrdów towns dress themselves (stub scenery until Phase C)
      this.town.dress(this);
    }
    this.createPlayer();
    // Returning from an interior (or travelling): spawn where the door says
    if (this._spawnOverride) {
      this.playerCartX = this._spawnOverride.x;
      this.playerCartY = this._spawnOverride.y;
    }
    this.createLightPools();
    this.initAmbientParticles();
    if (isWyrdow) this.createCreatures();

    this.drawAtmosphere();
    this.createDialogueUI();
    this.sortObjects();
    this._setupUICamera();

    // Controls
    // Arrow keys + WASD both drive movement. Wrap the two key sets in
    // a small proxy so every existing `cursors.X.isDown` check hears both.
    const arrowKeys = this.input.keyboard.createCursorKeys();
    const wasdKeys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    const eitherKey = (a, b) => ({ get isDown() { return a.isDown || b.isDown; } });
    this.cursors = {
      up:    eitherKey(arrowKeys.up,    wasdKeys.up),
      down:  eitherKey(arrowKeys.down,  wasdKeys.down),
      left:  eitherKey(arrowKeys.left,  wasdKeys.left),
      right: eitherKey(arrowKeys.right, wasdKeys.right),
    };
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.observeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    if (isWyrdow) {
      this.setupObservationZones();
      this.setupRituals();
    }
    // Number keys for dialogue choices
    this.choiceKeys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];
    this.moveSpeed = 0.03;
    // Brisk walk — hold Shift for a hurried pace (not a run; the roads
    // deserve respect, but the player's time deserves it too)
    this.briskKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    // ── Quiet Step stance (LBA mandate, B7) ──
    // Q toggles: slow, silent footsteps, keener observation. Groundwork
    // for patrol perception in Act 2 — patrols won't notice a quiet walker.
    this._stanceQuiet = false;
    this.input.keyboard.on('keydown-Q', () => {
      if (this.dialogueActive || this.visionActive || this._paused
        || this._pauseLayer || this._cutsceneActive) return;
      this._stanceQuiet = !this._stanceQuiet;
      this._updateStanceHUD();
    });
    this.playerFacing = 'se'; // current facing direction
    // ESC opens the in-game pause menu (Resume / Return to Menu).
    // If the journal is open, ESC closes it instead.
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._pauseSettingsOpen) return; // settings overlay closes itself
      if (this._journalOpen) { this._closeJournal(); return; }
      this.togglePauseMenu();
    });
    // J toggles the Memory Journal
    this.input.keyboard.on('keydown-J', () => this.toggleJournal());
    this._journalOpen = false;
    this._journalContainer = null;
    this._journalSelection = 0;

    // Start audio on first key press
    this.input.keyboard.on('keydown', () => ambientAudio.init(), { once: false });
    // Music manager — bind to this scene + unlock on first keypress
    music.bind(this);
    sfx.bind(this);
    this.input.keyboard.on('keydown', () => {
      music.unlock();
      sfx.unlock();
      // Begin Wyrdów ambient bed once the player is in the village
      music.startAmbient();
      if (!this._crowEntryFired) {
        this._crowEntryFired = true;
        setTimeout(() => { try { sfx.play('crow_caw'); } catch (e) {} }, 2500);
      }
    }, { once: false });
    // M — global music + sfx mute toggle (does not affect procedural ambience)
    this.input.keyboard.on('keydown-M', () => { music.toggleMute(); sfx.toggleMute(); });
    // Default master multiplier
    if (gameState.musicVolume == null) gameState.musicVolume = 0.8;

    // Timers
    this.time.addEvent({ delay: 160, callback: this.flickerLights, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 80, callback: this.updateSmoke, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 50, callback: this.updateAmbientParticles, callbackScope: this, loop: true });

    // Animation time tracker
    this.animTime = 0;
    this.walkBob = 0;
    this.isWalking = false;

    // HUD — reads the active town (was hardcoded to Wyrdów)
    this.add.text(16, 16, (this.town.journalHeader || this.town.name || '').toUpperCase(), {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '28px', color: '#8a7a50',
      stroke: '#0e0e14', strokeThickness: 5,
    }).setScrollFactor(0).setDepth(1000);
    this.add.text(16, 50, this.town.subtitle || '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px', color: '#6a5a40',
      stroke: '#0e0e14', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1000);
    const controlsHint = this.add.text(16, 74, 'Arrows / WASD to move  ·  E to talk  ·  J journal', {
      fontFamily: 'monospace', fontSize: '11px', color: '#555',
    }).setScrollFactor(0).setDepth(1000);
    // Fade the hint out once the player has had time to read it
    this.time.delayedCall(20000, () => {
      this.tweens.add({ targets: controlsHint, alpha: 0, duration: 2000 });
    });

    // Interact prompt (floating above NPC)
    this.interactPrompt = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '11px',
      color: '#aa9966', stroke: '#111111', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 1).setDepth(998);

    // Thread knot HUD (top right) — created hidden, shown when quest activates
    this.createThreadKnotHUD();

    // ── Continue restore — rebuild visual quest state from the save ──
    // (markers, hand glow, and the knot HUD previously reset on reload)
    if (isWyrdow && !this.firstVisit && gameState.knotsGiven) {
      try {
        MARKERS.forEach((m, i) => {
          m.placed = (gameState.markersFound || []).includes(m.id);
          if (m.placed && this.redrawMarkerPlaced) this.redrawMarkerPlaced(i);
        });
        this.handGlowLevel = Math.min(5, gameState.knotsPlaced || 0);
        if (gameState.knotsPlaced < 5) {
          this.showThreadKnotHUD();
          // Hide icons for knots already placed
          for (let i = 0; i < (gameState.knotsPlaced || 0); i++) this.removeThreadKnotFromHUD();
        }
      } catch (e) {}
    }

    if (this.firstVisit) this.beginPostAwakening();
  }
  // ── GAME LOOP ─────────────────────────────────────────────────────
  update(time, delta) {
    // Interiors run their own compact loop — none of the village systems
    if (this.town && this.town.isInterior) { this.updateInterior(time, delta); return; }
    this.animTime = time;
    const isWyrdow = this.town.id === 'wyrdow';
    if (isWyrdow) {
      this.updateCreatures(time, delta);
      this.updateAwakeningHooks(delta);
      this.updateMarkerGlows(time);
      this.updateObservation(delta);
      this.updateRituals(time, delta);
      this.updateBackgroundVillagers(time, delta);
      this.updateMarkProximity();
    }
    this.updateGameClock(delta);

    // Animate grass sway
    this.updateGrass(time);

    // Animate dust
    this.updateDust();

    // Baba idle — 2-frame breathing (slow, deliberate) + gentle sway.
    // She goes still while she reads you (her own dialogue) — attention.
    // After dusk she is HOME (enter the house to find her) — LBA living-world.
    if (this.babaSprite) {
      const babaIndoors = gameState.gameHour >= 20 || gameState.gameHour < 6;
      if (this.babaSprite.visible === babaIndoors) this.babaSprite.setVisible(!babaIndoors);
      const babaReading = this.dialogueActive && /Baba/.test(this.dialogueSpeaker || '');
      const babaTarget = babaReading ? 0 : (Math.floor(time / 1600) % 2);
      if (babaTarget !== this.babaFrame) {
        this.babaFrame = babaTarget;
        this.drawBabaFrame(babaTarget);
      }
      this.babaSprite.y = this.babaBaseY + Math.sin(time * 0.001) * 1;
      this.babaSprite._sortY = this.babaSprite.y;
    }

    // Zuzka idle — 2-frame breathing loop (~2.4s period). She is almost
    // completely still; frame 1 shifts weight 1px and brightens the jar.
    if (this.zuzkaSprite) {
      // Schedule: children are called in after dusk (unless mid-approach)
      const zuzkaIndoors = (gameState.gameHour >= 20 || gameState.gameHour < 6)
        && !this._zuzkaApproaching && !this._zuzkaApproachQueued;
      if (this.zuzkaSprite.visible === zuzkaIndoors) this.zuzkaSprite.setVisible(!zuzkaIndoors);
      const targetFrame = (Math.floor(time / 1200) % 2);
      if (targetFrame !== this.zuzkaFrame) {
        this.zuzkaFrame = targetFrame;
        this.drawZuzkaFrame(targetFrame);
      }
      this.zuzkaSprite.y = this.zuzkaBaseY + Math.sin(time * 0.0008 + 1.5) * 0.6;
      this.zuzkaSprite._sortY = this.zuzkaSprite.y;
    }

    // ── Curtain sway in windows ─────────────────────────────────────
    if (!this._curtainGfx) {
      this._curtainGfx = this.add.graphics();
      this._curtainGfx.setDepth(994);
    }
    this._curtainGfx.clear();
    // Window light spill — at night each lit window throws a soft warm
    // wash onto the ground below it (strength follows the night factor)
    const spillF = this._nightFactor || 0;
    this.windowPositions.forEach((win, idx) => {
      if (spillF > 0.05) {
        const flick = 0.85 + Math.sin(time * 0.004 + idx * 2.3) * 0.15;
        this._curtainGfx.fillStyle(0xffb347, 0.10 * spillF * flick);
        this._curtainGfx.fillEllipse(win.x, win.y + win.h / 2 + 8, win.w * 3.2, win.w * 1.4);
        this._curtainGfx.fillStyle(0xffd890, 0.06 * spillF * flick);
        this._curtainGfx.fillEllipse(win.x, win.y + win.h / 2 + 8, win.w * 4.5, win.w * 2);
      }
      const sway = Math.sin(time * 0.0012 + idx * 1.7) * 1.5;
      // Left curtain
      this._curtainGfx.lineStyle(1, PAL.deepRed, 0.3);
      this._curtainGfx.beginPath();
      this._curtainGfx.moveTo(win.x - win.w/2 + 1, win.y - win.h/2 + 1);
      this._curtainGfx.lineTo(win.x - win.w/2 + 1 + sway * 0.5, win.y + win.h/2 - 1);
      this._curtainGfx.strokePath();
      // Right curtain
      this._curtainGfx.beginPath();
      this._curtainGfx.moveTo(win.x + win.w/2 - 1, win.y - win.h/2 + 1);
      this._curtainGfx.lineTo(win.x + win.w/2 - 1 - sway * 0.5, win.y + win.h/2 - 1);
      this._curtainGfx.strokePath();
    });

    // ── Idol eyes — closed normally, open after 8s of player standing still nearby ──
    if (this.idolScreenX !== undefined) {
      const idolDx = this.playerCartX - (CENTER - 0.5);
      const idolDy = this.playerCartY - (CENTER - 0.5);
      const idolDist = Math.sqrt(idolDx * idolDx + idolDy * idolDy);
      const nearIdol = idolDist < 4;

      if (nearIdol && !this.isWalking) {
        this.playerIdleTime += delta;
      } else {
        this.playerIdleTime = 0;
      }

      // Eyes open after 8 seconds idle near idol
      const targetOpen = (this.playerIdleTime > 8000 && nearIdol) ? 1 : 0;
      this.idolEyesOpen += (targetOpen - this.idolEyesOpen) * 0.02; // slow transition

      if (this.idolEyesOpen > 0.05) {
        if (!this._idolEyeGfx) {
          this._idolEyeGfx = this.add.graphics();
          this._idolEyeGfx.setDepth(993);
        }
        this._idolEyeGfx.clear();
        const ex = this.idolScreenX;
        const ey = this.idolScreenY - 65;
        const openAmt = this.idolEyesOpen;
        // Eerie glowing eyes
        this._idolEyeGfx.fillStyle(PAL.eerieGlow, 0.7 * openAmt);
        this._idolEyeGfx.fillCircle(ex - 3, ey, 2.5 * openAmt);
        this._idolEyeGfx.fillCircle(ex + 3, ey, 2.5 * openAmt);
        // Bright center
        this._idolEyeGfx.fillStyle(PAL.shrineGlow, 0.9 * openAmt);
        this._idolEyeGfx.fillCircle(ex - 3, ey, 1.2 * openAmt);
        this._idolEyeGfx.fillCircle(ex + 3, ey, 1.2 * openAmt);
        // Glow halo
        this._idolEyeGfx.fillStyle(PAL.eerieGlow, 0.15 * openAmt);
        this._idolEyeGfx.fillCircle(ex, ey, 12 * openAmt);
      } else if (this._idolEyeGfx) {
        this._idolEyeGfx.clear();
      }
    }

    // ── Baba door bells — decay swing ───────────────────────────────
    if (this.babaBellSwing > 0.01) {
      this.babaBellSwing *= 0.96; // decay
      if (!this._bellGfx) {
        this._bellGfx = this.add.graphics();
        this._bellGfx.setDepth(994);
      }
      this._bellGfx.clear();
      // Baba's house is houses[5]
      const bh = houses[5];
      const bcx = bh.x + bh.w / 2, bcy = bh.y + bh.h / 2;
      const biso = cartToIso(bcx, bcy);
      const bsx = biso.x + this.worldOffset.x;
      const bsy = biso.y + this.worldOffset.y;
      const bbw = bh.w * TILE_W * 0.38;
      const doorX = bsx - 3 + bbw/8;
      const doorY = bsy - 14;
      const swing = Math.sin(time * 0.01) * this.babaBellSwing;
      // Two small copper bells
      for (const bx of [-2, 5]) {
        this._bellGfx.lineStyle(1, PAL.copper, 0.6);
        this._bellGfx.beginPath();
        this._bellGfx.moveTo(doorX + bx + 2, doorY - 1);
        this._bellGfx.lineTo(doorX + bx + 2 + swing, doorY + 4);
        this._bellGfx.strokePath();
        this._bellGfx.fillStyle(PAL.copperLight, 0.7);
        this._bellGfx.fillCircle(doorX + bx + 2 + swing, doorY + 5, 2);
      }
    } else if (this._bellGfx) {
      this._bellGfx.clear();
    }

    // Block all input during visions
    if (this.visionActive) {
      this.updateCamera();
      return;
    }

    if (this.dialogueActive) {
      // Choice selection via number keys (1, 2, 3)
      if (this.choiceActive) {
        this.choiceKeys.forEach((key, i) => {
          if (Phaser.Input.Keyboard.JustDown(key)) this.selectChoice(i);
        });
      } else if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceDialogue();
      }
      this.updateCamera();
      return;
    }

    this.handleMovement(delta);
    this.updateFootsteps();
    this.updateViewVeil();
    if (isWyrdow) {
      this.updateNightRoads(time, delta);
      this.updateThreadGuidance(time, delta);
      this.updateRegencyTells();
    }
    this.updatePlayerPosition();
    this.updateEzra(time, delta);
    this.updateMarta(time, delta);
    this.updateDziadek(time, delta);
    this.updateInnSmoke(time, delta);
    if (isWyrdow) {
      this.checkZuzkaAutoApproach();
      this.checkBrelTrigger();
    }
    this.handleInteraction();
    this.updateCamera();
    this.sortObjects();
  }
}
