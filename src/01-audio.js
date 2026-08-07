const ambientAudio = new AmbientAudio();

// ═══════════════════════════════════════════════════════════════════════
//  MUSIC MANAGER  —  layered MP3 score on top of the procedural ambience
// ═══════════════════════════════════════════════════════════════════════
// Uses Phaser's WebAudio sound manager so we can pitch-shift via setRate
// without breaking the existing AmbientAudio (Web Audio API) drone.
// All tracks are gated behind the player's first keypress (handled by
// GameScene which calls ambientAudio.init() — we piggyback on the same
// gesture by deferring playback until music.unlock() is called).
class MusicManager {
  constructor() {
    this.scene = null;            // last scene that registered the manager
    this.sounds = {};             // key → Phaser sound object
    this.unlocked = false;        // becomes true on first keypress
    this.muted = false;
    this.baseVolumes = {
      wyrdow_ambient:     0.65,
      theme_awakening:    0.40,
      baba_elzbieta_theme:0.75,
      crossroads_quest:   0.10,
      vision_theme:       0.80,
      poludnica_theme:    0.90,
    };
    // Active duck requests (lowest target wins for ambient)
    this._duckRequests = new Set();
    this._ambientNaturalTarget = 0.65;
    // Track which sources have triggered the awakening theme
    this._awakeningPlays = 0;
    // Pending plays queued before the manager is unlocked
    this._queue = [];
  }

  // Called by each scene's preload — keys cached on the global Phaser cache
  // are shared between scenes, so loading once in OpeningScene is enough.
  preload(scene) {
    const base = 'assets/music/';
    const files = [
      'wyrdow_ambient',
      'theme_awakening',
      'baba_elzbieta_theme',
      'crossroads_quest',
      'vision_theme',
      'poludnica_theme',
    ];
    for (const f of files) {
      try { scene.load.audio(f, base + f + '.mp3'); } catch (e) {}
    }
    // NOTE: brel_theme.mp3 is not yet generated. The Wellness Officer
    // scene uses the procedural cold-piano fallback. When the track is
    // created, drop it in assets/music/ and add 'brel_theme' to `files`.
  }

  // Bind to the active scene and instantiate sound objects from cache.
  bind(scene) {
    this.scene = scene;
    for (const key of Object.keys(this.baseVolumes)) {
      if (!this.sounds[key] && scene.cache.audio.exists(key)) {
        try {
          this.sounds[key] = scene.sound.add(key, { volume: 0, loop: false });
        } catch (e) {}
      }
    }
  }

  // ── master volume / mute ────────────────────────────────────────
  _master() {
    if (this.muted) return 0;
    return (gameState && typeof gameState.musicVolume === 'number')
      ? gameState.musicVolume : 0.8;
  }
  _applyMaster() {
    for (const key of Object.keys(this.sounds)) {
      const s = this.sounds[key]; if (!s) continue;
      const target = (s._desiredBase != null ? s._desiredBase : 0) * this._master();
      try { s.setVolume(target); } catch (e) {}
    }
  }
  toggleMute() {
    this.muted = !this.muted;
    this._applyMaster();
    return this.muted;
  }

  // Called once on first keypress (gesture unlock).
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.scene && this.scene.sound && this.scene.sound.unlock) {
      try { this.scene.sound.unlock(); } catch (e) {}
    }
    for (const fn of this._queue) { try { fn(); } catch (e) {} }
    this._queue.length = 0;
  }
  _gated(fn) {
    if (!this.unlocked) { this._queue.push(fn); return; }
    fn();
  }

  // ── set a sound's natural (un-ducked) target volume ─────────────
  // Every legacy caller that used _tweenTo(key, value, ms) to change
  // a track's target volume now goes through _setNatural, which stores
  // the natural target and re-applies the priority-stack duck scalar
  // to every playing sound.
  _tweenTo(key, target, ms) {
    const s = this.sounds[key]; if (!s || !this.scene) return;
    s._natural = target;
    this._applyAll(ms);
  }
  _start(key, { loop = false, base = null } = {}) {
    const s = this.sounds[key]; if (!s) return null;
    s.loop = loop;
    if (!s.isPlaying) {
      s._desiredBase = 0;
      try { s.setVolume(0); s.play(); } catch (e) {}
    }
    return s;
  }
  _stopAfterFade(key, ms) {
    const s = this.sounds[key]; if (!s) return;
    this._tweenTo(key, 0, ms);
    setTimeout(() => { try { if (s.isPlaying) s.stop(); } catch (e) {} }, ms + 60);
  }

  // ── ambient ducking (multi-source, lowest target wins) ──────────
  // NOTE: legacy API kept so older callers still work. New code should
  // use the priority stack via duckAllExcept/restoreAll below.
  _recomputeAmbient(ms) {
    let target = this._ambientNaturalTarget; // 0.65 baseline
    for (const r of this._duckRequests) target = Math.min(target, r);
    // Natural ambient target is the lowest legacy duck request. The
    // priority stack layers on top of this via _applyAll.
    const s = this.sounds['wyrdow_ambient'];
    if (s) s._natural = target;
    this._applyAll(ms);
  }
  _duckAmbient(target, ms) {
    this._duckRequests.add(target);
    this._recomputeAmbient(ms);
  }
  _undoDuck(target, ms) {
    this._duckRequests.delete(target);
    this._recomputeAmbient(ms);
  }

  // ── PRIORITY-BASED DUCK STACK ────────────────────────────────────
  // DUCK_TARGETS from the audio mix spec:
  //   dialogue (NPC themes)     : others → 15% of natural
  //   event    (vision / Poł.)  : others → 20% of natural
  //   quest    (crossroads 1-3) : others → 35% of natural
  // Południca is ceremonial: uses 0.10.
  // wyrdow_ambient and theme_awakening are baseline — they never push
  // onto the stack, they only yield.
  _priorityOf(name) {
    // higher = more authoritative
    if (name === 'poludnica_theme')    return 5;
    if (name === 'baba_elzbieta_theme') return 4;
    if (name === 'vision_theme')       return 3;
    if (name === 'crossroads_quest')   return 2;
    return 0;
  }
  // Set a track's natural (un-ducked) target and re-apply the current
  // duck scalar to every playing sound.
  _setNatural(key, target, ms) {
    const s = this.sounds[key]; if (!s) return;
    s._natural = target;
    this._applyAll(ms);
  }
  // Compute the effective volume for every playing sound based on the
  // top of the priority stack, then tween each over `ms`.
  _applyAll(ms = 1500) {
    const stack = this._stack || (this._stack = []);
    const top = stack.length ? stack[stack.length - 1] : null;
    for (const key of Object.keys(this.sounds)) {
      const s = this.sounds[key]; if (!s) continue;
      if (s._natural == null) s._natural = 0;
      let scalar = 1;
      if (top && key !== top.name) scalar = top.duck;
      const target = s._natural * scalar;
      // Use the existing tween pipeline but bypass natural writeback.
      if (s._desiredBase == null) s._desiredBase = 0;
      const fromBase = s._desiredBase;
      const proxy = { v: fromBase };
      s._desiredBase = target;
      if (!this.scene) continue;
      this.scene.tweens.add({
        targets: proxy, v: target, duration: ms,
        onUpdate: () => { try { s.setVolume(proxy.v * this._master()); } catch (e) {} },
        onComplete: () => { try { s.setVolume(target * this._master()); } catch (e) {} },
      });
    }
  }
  // Push a new focused track onto the duck stack. Non-focused tracks
  // are faded to their natural × duck scalar.
  duckAllExcept(name, duck, ms = 1500) {
    const stack = this._stack || (this._stack = []);
    // Remove any prior entry for the same track so re-entry is idempotent
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) stack.splice(i, 1);
    stack.push({ name, duck, priority: this._priorityOf(name) });
    // Keep stack sorted by priority ascending so the top entry is the
    // highest-priority active focus.
    stack.sort((a, b) => a.priority - b.priority);
    this._applyAll(ms);
  }
  // Remove a track from the stack. If a higher-priority track is still
  // active, its scalar continues to apply. Only when the stack empties
  // do we restore to true natural volumes (over `ms`, default 3000).
  restoreAll(name, ms = 3000) {
    const stack = this._stack || (this._stack = []);
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].name === name) { stack.splice(i, 1); break; }
    }
    this._applyAll(ms);
  }

  // ── trigger API ─────────────────────────────────────────────────
  startAmbient() {
    this._gated(() => {
      const s = this._start('wyrdow_ambient', { loop: true });
      if (s) this._tweenTo('wyrdow_ambient', this._ambientNaturalTarget, 2500);
    });
  }
  stopAmbient(ms = 2000) { this._gated(() => this._stopAfterFade('wyrdow_ambient', ms)); }

  playAwakening(volume = 0.40, fadeOutMs = null) {
    this._gated(() => {
      const s = this._start('theme_awakening', { loop: false });
      if (!s) return;
      this._tweenTo('theme_awakening', volume, 1500);
      if (fadeOutMs != null) {
        setTimeout(() => this._stopAfterFade('theme_awakening', fadeOutMs), 20000);
      }
    });
  }
  fadeOutAwakening(ms = 2000) { this._gated(() => this._stopAfterFade('theme_awakening', ms)); }

  startBaba() {
    this._gated(() => {
      this._start('baba_elzbieta_theme', { loop: true });
      this._tweenTo('baba_elzbieta_theme', 0.75, 1500);
      // LEVEL 1 — focused dialogue: everything else → 15%
      this.duckAllExcept('baba_elzbieta_theme', 0.15, 1500);
    });
  }
  stopBaba() {
    this._gated(() => {
      this.restoreAll('baba_elzbieta_theme', 3000);
      this._stopAfterFade('baba_elzbieta_theme', 2000);
    });
  }

  // Crossroads quest — staged volumes per knot count
  onKnotPlaced(knotsPlaced) {
    this._gated(() => {
      // Lazily start at knot 0 if not already playing
      const s = this.sounds['crossroads_quest'];
      if (s && !s.isPlaying) this._start('crossroads_quest', { loop: true });
      const stages = [
        { base: 0.10, ms: 3000 },
        { base: 0.25, ms: 4000 },
        { base: 0.45, ms: 4000 },
        { base: 0.65, ms: 4000 },
        { base: 0.80, ms: 4000 },
        { base: 1.00, ms: 6000 },
      ];
      const stage = stages[Math.max(0, Math.min(5, knotsPlaced))];
      this._tweenTo('crossroads_quest', stage.base, stage.ms);
      // Push crossroads onto the priority stack. At knots 1-3 it sits
      // at LEVEL 3 (quest, 0.35 duck on ambient); at knots ≥ 4 it
      // escalates to LEVEL 2 (event, 0.20 duck).
      const duckLevel = (knotsPlaced >= 4) ? 0.20 : 0.35;
      this.duckAllExcept('crossroads_quest', duckLevel, stage.ms);
      if (knotsPlaced >= 5) {
        // Hold 10s at full, then fade out 8s
        setTimeout(() => {
          this.restoreAll('crossroads_quest', 8000);
          this._stopAfterFade('crossroads_quest', 8000);
        }, 10000);
      }
    });
  }
  startCrossroadsIfIdle() {
    this._gated(() => {
      const s = this.sounds['crossroads_quest'];
      if (s && !s.isPlaying) this.onKnotPlaced(0);
    });
  }

  playVision(visionIndex /* 0..4 */) {
    this._gated(() => {
      const s = this._start('vision_theme', { loop: false });
      if (!s) return;
      // Pitch shift via setRate: rate = 2^(semitones/12)
      const semis = Math.max(0, Math.min(4, visionIndex));
      try { s.setRate(Math.pow(2, semis / 12)); } catch (e) {}
      this._tweenTo('vision_theme', 0.80, 1200);
      // LEVEL 2 — event track: everything else → 20%
      this.duckAllExcept('vision_theme', 0.20, 1500);
    });
  }
  stopVision() {
    this._gated(() => {
      this.restoreAll('vision_theme', 3000);
      this._stopAfterFade('vision_theme', 1500);
    });
  }

  playPoludnica(onFinished) {
    this._gated(() => {
      const s = this._start('poludnica_theme', { loop: false });
      if (!s) {
        if (onFinished) onFinished();
        return;
      }
      this._tweenTo('poludnica_theme', 0.90, 2000);
      // SACRED MOMENT — everything else ducks to 10% over 2s (ceremonial)
      this.duckAllExcept('poludnica_theme', 0.10, 2000);
      const dur = (s.duration && s.duration > 0) ? s.duration * 1000 : 18000;
      setTimeout(() => {
        this.restoreAll('poludnica_theme', 4000);
        try { s.stop(); } catch (e) {}
        if (onFinished) onFinished();
      }, dur);
    });
  }

  // Comfort wisp aftermath
  playComfortAwakening() {
    this._gated(() => {
      const s = this._start('theme_awakening', { loop: false });
      if (!s) return;
      this._tweenTo('theme_awakening', 0.35, 1200);
      setTimeout(() => this._stopAfterFade('theme_awakening', 4000), 16000);
    });
  }
}
const music = new MusicManager();
window.music = music;

// ═══════════════════════════════════════════════════════════════════════
//  SFX MANAGER — 18 one-shot / looped .wav files
//  Layered on top of existing procedural audio (does not replace
//  ambientAudio drones, the chimney crackle, the bell tone, etc. — it
//  simply adds sampled sounds for specific triggers).
// ═══════════════════════════════════════════════════════════════════════
class SfxManager {
  constructor() {
    this.scene = null;
    this.sounds = {};
    this.unlocked = false;
    this.muted = false;
    this._queue = [];
    // Per-trigger base volumes as specified in the integration brief.
    // These are multiplied by gameState.sfxVolume (master SFX slider).
    this.base = {
      dialogue_advance:   0.70,
      dialogue_open:      0.65,
      choice_select:      0.75,
      thread_knot:        0.85,
      shrine_glow:        0.60,
      door_baba:          0.80,
      knock_brel:         0.85,
      footsteps_dirt:     0.50,
      footsteps_grass:    0.45,
      firefly_jar:        0.80,
      codex_reveal:       0.85,
      quest_complete:     0.90,
      perimeter_complete: 0.55,
      observation_breath: 0.40,
      domovoi_crackle:    0.50,
      vision_whoosh:      0.70,
      idol_eyes:          0.95,
      crow_caw:           0.65,
    };
    this._keys = Object.keys(this.base);
  }
  preload(scene) {
    for (const key of this._keys) {
      try {
        if (!scene.cache.audio.exists(key)) {
          scene.load.audio(key, 'assets/audio/sfx/' + key + '.wav');
        }
      } catch (e) {}
    }
    // Any loaderror is silently ignored (game continues without that SFX).
    scene.load.on('loaderror', (file) => {
      if (file && file.key && this.base[file.key] != null) {
        console.warn('[sfx] failed to load', file.key);
      }
    });
  }
  bind(scene) {
    this.scene = scene;
    for (const key of this._keys) {
      try {
        if (scene.cache.audio.exists(key) && !this.sounds[key]) {
          this.sounds[key] = scene.sound.add(key, { volume: 0, loop: false });
          // Footsteps: nudge the playback rate on every loop cycle so a
          // long walk never settles into a mechanical rhythm.
          if (/^footsteps_/.test(key)) {
            const snd = this.sounds[key];
            snd.on('looped', () => {
              try { snd.setRate(0.94 + Math.random() * 0.12); } catch (e) {}
            });
          }
        }
      } catch (e) {}
    }
  }
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    const q = this._queue.slice(); this._queue.length = 0;
    for (const fn of q) { try { fn(); } catch (e) {} }
  }
  _gated(fn) {
    if (!this.unlocked) { this._queue.push(fn); return; }
    fn();
  }
  _master() {
    if (this.muted) return 0;
    const v = (gameState && typeof gameState.sfxVolume === 'number')
      ? gameState.sfxVolume : 0.85;
    return v;
  }
  // Play a one-shot sample at its base volume × master.
  play(key, opts = {}) {
    this._gated(() => {
      const s = this.sounds[key]; if (!s) return;
      const base = (opts.volume != null ? opts.volume : this.base[key]) || 0.5;
      const vol = base * this._master();
      try {
        if (s.isPlaying && !opts.overlap) s.stop();
        s.setVolume(vol);
        // Positional pan (-1 left .. 1 right); reset when not specified so
        // a reused sound doesn't inherit its previous position
        if (s.setPan) s.setPan(opts.pan != null ? Phaser.Math.Clamp(opts.pan, -1, 1) : 0);
        s.setLoop(false);
        s.play();
      } catch (e) {}
    });
  }
  // Start a looped sample with a fade-in.
  loop(key, targetMul = 1, fadeMs = 250) {
    this._gated(() => {
      const s = this.sounds[key]; if (!s) return;
      const target = this.base[key] * targetMul * this._master();
      try {
        s.setLoop(true);
        if (!s.isPlaying) {
          s.setVolume(0);
          if (/^footsteps_/.test(key)) s.setRate(0.94 + Math.random() * 0.12);
          s.play();
        }
        s._sfxTargetMul = targetMul;
        this._tween(key, target, fadeMs);
      } catch (e) {}
    });
  }
  // Stop a looped sample with a fade-out.
  stopLoop(key, fadeMs = 250) {
    this._gated(() => {
      const s = this.sounds[key]; if (!s || !s.isPlaying) return;
      this._tween(key, 0, fadeMs, () => { try { s.stop(); } catch (e) {} });
    });
  }
  _tween(key, targetVol, ms, onDone) {
    const s = this.sounds[key]; if (!s || !this.scene) return;
    const proxy = { v: s.volume || 0 };
    this.scene.tweens.add({
      targets: proxy, v: targetVol, duration: ms,
      onUpdate: () => { try { s.setVolume(proxy.v); } catch (e) {} },
      onComplete: () => { try { s.setVolume(targetVol); } catch (e) {}
                          if (onDone) onDone(); },
    });
  }
  // Re-apply the master multiplier to any currently playing looped sfx
  // (called when the Settings slider moves or mute toggles).
  applyMaster() {
    for (const key of this._keys) {
      const s = this.sounds[key]; if (!s || !s.isPlaying) continue;
      const mul = s._sfxTargetMul != null ? s._sfxTargetMul : 1;
      const target = this.base[key] * mul * this._master();
      try { s.setVolume(target); } catch (e) {}
    }
  }
  toggleMute() { this.muted = !this.muted; this.applyMaster(); return this.muted; }
}
const sfx = new SfxManager();
window.sfx = sfx;

// ═══════════════════════════════════════════════════════════════════════
//  MAIN GAME SCENE
// ═══════════════════════════════════════════════════════════════════════
