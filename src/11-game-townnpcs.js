
// ═══ TOWN NPC SYSTEM + THE KNOCK — GameScene prototype extension ═══
// Generic, data-driven NPCs for non-Wyrdów towns: a TownDefinition
// declares `npcs: [{ id, x, y, frames, frameMs, draw(scene, g, frame),
// dialogue(scene) -> { lines, onClose }, hideAtNight }]` and the engine
// does the rest — creation, breathing, schedules, prompts, talk.
// Wyrdów's hand-built cast stays as it is; every town after learns this.
Object.assign(GameScene.prototype, {
  createTownNpcs() {
    this._townNpcs = [];
    const defs = (this.town && this.town.npcs) || [];
    for (const def of defs) {
      const iso = cartToIso(def.x, def.y);
      const c = this.add.container(iso.x + this.worldOffset.x, iso.y + this.worldOffset.y);
      const g = this.add.graphics();
      c.add(g);
      c._sortY = c.y;
      this.objectLayer.add(c);
      const npc = { def, sprite: c, gfx: g, frame: 0, frameTimer: 0 };
      def.draw(this, g, 0);
      this._townNpcs.push(npc);
    }
  },

  updateTownNpcs(time, delta) {
    if (!this._townNpcs) return;
    const night = gameState.gameHour >= 20 || gameState.gameHour < 6;
    for (const npc of this._townNpcs) {
      // Schedules — def.when(scene) overrides the simple hideAtNight rule
      // (interior casts use it: Cyla tends the inn at night, Pin files by day)
      const wantVisible = npc.def.when ? !!npc.def.when(this)
        : (npc.def.hideAtNight ? !night : true);
      if (npc.sprite.visible !== wantVisible) npc.sprite.setVisible(wantVisible);
      if (!npc.sprite.visible) continue;
      // Breathing frames
      const frames = npc.def.frames || 2;
      npc.frameTimer += delta;
      if (npc.frameTimer >= (npc.def.frameMs || 1400)) {
        npc.frameTimer = 0;
        npc.frame = (npc.frame + 1) % frames;
        npc.def.draw(this, npc.gfx, npc.frame);
      }
    }
  },

  // Called from handleInteraction before examines. Returns true if an
  // NPC owned the prompt this frame.
  tryTownNpcInteraction() {
    if (!this._townNpcs) return false;
    for (const npc of this._townNpcs) {
      if (!npc.sprite.visible) continue;
      const d = Math.hypot(this.playerCartX - npc.def.x, this.playerCartY - npc.def.y);
      if (d > (npc.def.interactRadius || 1.7)) continue;
      const iso = cartToIso(npc.def.x, npc.def.y);
      this.interactPrompt.setText('[E] Talk to ' + npc.def.name);
      this.interactPrompt.setPosition(
        iso.x + this.worldOffset.x,
        iso.y + this.worldOffset.y - 40
      );
      this.interactPrompt.setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        const branch = npc.def.dialogue(this);
        this.openDialogue(npc.def.name, branch.lines, branch.onClose || null,
          branch.style || 'simple');
      }
      return true;
    }
    return false;
  },

  // ═══ THE HOUR OF KNOCKING — Miedźno's core mechanic (rhythm-lite) ═══
  // The Sleeper's heartbeat is audible from 21:00 to 22:00. At listening
  // posts the hill knocks a short pattern; the player answers by tapping
  // E in loose, forgiving windows. Listen first. Then knock back the
  // same. Not fast. The same.
  isKnockingHour() {
    return gameState.gameHour >= 21 && gameState.gameHour < 22;
  },

  // A soft sub-bass thump with a woody click — the hill's heartbeat.
  playKnockThump(strong) {
    try {
      if (!ambientAudio.ctx) ambientAudio.init();
      const ctx = ambientAudio.ctx;
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(52, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      g.gain.setValueAtTime(strong ? 0.22 : 0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.32);
      // Woody click on top
      const click = ctx.createOscillator();
      const cg = ctx.createGain();
      click.type = 'triangle';
      click.frequency.value = 220;
      cg.gain.setValueAtTime(strong ? 0.08 : 0.04, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      click.connect(cg); cg.connect(ctx.destination);
      click.start(now); click.stop(now + 0.06);
    } catch (e) {}
  },

  // Ambient heartbeat while the hour lasts (Miedźno only, outdoors)
  updateHeartbeatAmbience(time) {
    if (!this.town || this.town.id !== 'miedzno' || !this.isKnockingHour()) return;
    if (!this._lastHeartbeat) this._lastHeartbeat = 0;
    if (time - this._lastHeartbeat > 2800) {
      this._lastHeartbeat = time;
      this.playKnockThump(false);
    }
  },

  // Interaction-chain hook: returns true while a knock post (or an
  // active session) owns the prompt/E-key.
  tryKnockPostInteraction(time) {
    const posts = (this.town && this.town.knockPosts) || [];
    if (!posts.length) return false;
    if (this._knock) return true; // session consumes E via its own update

    for (const post of posts) {
      const d = Math.hypot(this.playerCartX - post.x, this.playerCartY - post.y);
      if (d > 1.3) continue;
      const iso = cartToIso(post.x, post.y);
      const done = (gameState.miedznoState.knocksAnswered || []).includes(post.id);
      const label = !this.isKnockingHour()
        ? '[E] Listen at the ' + post.label
        : (done ? '[E] Knock again' : '[E] Answer the knocking');
      this.interactPrompt.setText(label);
      this.interactPrompt.setPosition(iso.x + this.worldOffset.x,
        iso.y + this.worldOffset.y - 36);
      this.interactPrompt.setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        if (!this.isKnockingHour()) {
          this.openDialogue(post.label, [
            ">Quiet. The metal is colder than the air.",
            ">Mendel said the hill knocks in the hour before the deep of night. Come back when the day is nearly done with itself.",
          ], null, 'simple');
        } else {
          this._startKnockSession(post, time);
        }
      }
      return true;
    }
    return false;
  },

  _startKnockSession(post, time) {
    // Patterns are interval lists in ms from the first beat. Forgiving
    // by design (±380ms) — the feel of rhythm, not a rhythm game.
    const pattern = post.pattern || [0, 620, 1500];
    this._knock = {
      post, pattern,
      phase: 'listen',
      t0: time + 700,
      beatIdx: 0,
      taps: [],
      ghost: [],
    };
    this._knockGfx = this._knockGfx || this.add.graphics().setDepth(996);
    try { music.duckAllExcept && music.duckAllExcept('__knock__', 0.35, 800); } catch (e) {}
  },

  _updateKnockSession(time) {
    const k = this._knock;
    const iso = cartToIso(k.post.x, k.post.y);
    const wx = iso.x + this.worldOffset.x, wy = iso.y + this.worldOffset.y - 10;
    const g = this._knockGfx;
    g.clear();

    if (k.phase === 'listen') {
      // The hill knocks its pattern; rings mark each beat
      while (k.beatIdx < k.pattern.length && time >= k.t0 + k.pattern[k.beatIdx]) {
        this.playKnockThump(true);
        k.ghost.push(time);
        k.beatIdx++;
      }
      for (const gt of k.ghost) {
        const age = time - gt;
        if (age < 900) {
          g.lineStyle(2, 0x5ec0a4, 0.7 * (1 - age / 900));
          g.strokeCircle(wx, wy, 10 + age * 0.05);
        }
      }
      if (k.beatIdx >= k.pattern.length && time >= k.t0 + k.pattern[k.pattern.length - 1] + 1100) {
        k.phase = 'answer';
        k.t0 = time;
        k.ghost = [];
        this.showItemNotification('Now you. The same.');
      }
      return;
    }

    // ── answer phase ──
    // Ghost rings pulse at the expected moments as visual guides
    for (let i = 0; i < k.pattern.length; i++) {
      const at = k.t0 + 400 + k.pattern[i];
      const dt = Math.abs(time - at);
      if (dt < 380) {
        g.lineStyle(1, 0xc8e8d8, 0.35 * (1 - dt / 380));
        g.strokeCircle(wx, wy, 16);
      }
    }
    // Player taps
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      k.taps.push(time);
      this.playKnockThump(false);
      g.lineStyle(2, 0xffc878, 0.8);
      g.strokeCircle(wx, wy, 12);
    }
    for (const tp of k.taps) {
      const age = time - tp;
      if (age < 600) {
        g.lineStyle(2, 0xffc878, 0.6 * (1 - age / 600));
        g.strokeCircle(wx, wy, 10 + age * 0.04);
      }
    }
    // Evaluate when all taps are in, or on timeout
    const lastExpected = k.t0 + 400 + k.pattern[k.pattern.length - 1];
    if (k.taps.length >= k.pattern.length || time > lastExpected + 1600) {
      this._resolveKnockSession(time);
    }
  },

  _resolveKnockSession(time) {
    const k = this._knock;
    this._knock = null;
    this._knockGfx.clear();
    try { music.restoreAll && music.restoreAll('__knock__', 1500); } catch (e) {}

    const ok = k.taps.length === k.pattern.length && k.pattern.every((p, i) =>
      Math.abs((k.taps[i] - k.t0 - 400) - p) <= 380);

    const iso = cartToIso(k.post.x, k.post.y);
    const wx = iso.x + this.worldOffset.x, wy = iso.y + this.worldOffset.y - 10;

    if (!ok) {
      this.showItemNotification('The rhythm scatters. The hill waits. Listen first.');
      return;
    }
    // Answered: the post flares verdigris, and something very large
    // shifts its attention half a degree toward you.
    const flare = this.add.graphics().setDepth(997);
    const proxy = { t: 0 };
    this.tweens.add({
      targets: proxy, t: 1, duration: 2400, ease: 'Sine.easeOut',
      onUpdate: () => {
        flare.clear();
        flare.fillStyle(0x5ec0a4, 0.5 * (1 - proxy.t));
        flare.fillCircle(wx, wy, 8 + proxy.t * 34);
        flare.fillStyle(0xa8e8d0, 0.7 * (1 - proxy.t));
        flare.fillCircle(wx, wy, 4 + proxy.t * 12);
      },
      onComplete: () => flare.destroy(),
    });
    this.playKnockThump(true);
    this.time.delayedCall(650, () => this.playKnockThump(true));

    const ms = gameState.miedznoState;
    if (!ms.knocksAnswered) ms.knocksAnswered = [];
    if (!ms.knocksAnswered.includes(k.post.id)) {
      ms.knocksAnswered.push(k.post.id);
      try { addJournalEntry('knock_first'); } catch (e) {}
      try { saveGame(); } catch (e) {}
      this.showItemNotification('The ' + k.post.label + ' answered back.');
    } else {
      this.showItemNotification('The hill remembers you.');
    }
  },
});
