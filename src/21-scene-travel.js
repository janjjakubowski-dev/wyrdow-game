class TravelScene extends Phaser.Scene {
  constructor() { super('TravelScene'); }

  init(data) {
    this._to = (data && data.to) || 'wyrdow';
    this._spawn = (data && data.spawn) || null;
    this._line = (data && data.line) || '';
    this._toName = (data && data.toName) || '';
    this._from = (data && data.from) || 'wyrdow';
    this._originSpawn = (data && data.originSpawn) || null;
    // Night roads: without blue thread, the dark road walks strangers in
    // a circle — once per night. The second attempt is respected.
    const night = gameState.gameHour >= 20 || gameState.gameHour < 6;
    const hasThread = gameState.inventory.includes('thread_knots');
    this._turned = night && !hasThread && !gameState._nightTurnDone && !!this._originSpawn;
    if (this._turned) gameState._nightTurnDone = true;
  }

  create() {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    cam.setBackgroundColor(0x0a0a12);
    cam.fadeIn(500, 0, 0, 0);

    // Ground band
    const road = this.add.graphics();
    road.fillStyle(0x241a10, 1); road.fillRect(0, H * 0.72, W, H * 0.28);
    road.fillStyle(0x3a2c1c, 1); road.fillRect(0, H * 0.72, W, 6);
    // Wheel ruts
    road.fillStyle(0x1a120a, 0.8);
    road.fillRect(0, H * 0.80, W, 3);
    road.fillRect(0, H * 0.88, W, 3);

    // Two parallax pine bands (drawn wider than screen, scrolled in update)
    this._bands = [];
    [[0.45, 0x10160e, 0.030], [0.58, 0x182013, 0.055]].forEach(([yF, col, speed]) => {
      const band = this.add.graphics();
      const baseY = H * yF + 40;
      for (let x = -100; x < W + 300; x += 70 + ((x * 37) % 50)) {
        const h = 60 + ((x * 61) % 70);
        band.fillStyle(col, 1);
        band.fillTriangle(x, baseY - h, x - 26, baseY, x + 26, baseY);
        band.fillTriangle(x, baseY - h - 18, x - 18, baseY - h * 0.45, x + 18, baseY - h * 0.45);
      }
      this._bands.push({ g: band, speed, width: W + 400 });
    });

    // The walking traveller — small silhouette with a hand-mark glow
    const px = W * 0.32, py = H * 0.79;
    this._walker = this.add.graphics();
    this._walkerPos = { x: px, y: py };

    // The travel line, italic, centred (the turned road speaks differently)
    if (this._turned) {
      this._line = 'The dark road walks strangers in a circle. It is not unkind about it.';
      this._toName = (TOWNS[this._from] && TOWNS[this._from].name) || this._from;
    }
    if (this._line) {
      const line = this.add.text(W / 2, H * 0.22, this._line, {
        fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'italic',
        color: '#c8b878',
      }).setOrigin(0.5).setAlpha(0);
      line.setResolution(window.devicePixelRatio || 1);
      this.tweens.add({ targets: line, alpha: 0.9, duration: 1200, delay: 800 });
    }
    // Destination whisper
    const dest = this.add.text(W / 2, H * 0.30, '— ' + this._toName + ' —', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#6a5a40',
    }).setOrigin(0.5).setAlpha(0);
    dest.setResolution(window.devicePixelRatio || 1);
    this.tweens.add({ targets: dest, alpha: 0.8, duration: 1200, delay: 1600 });

    // Footsteps on the road
    music.bind(this); sfx.bind(this);
    try { sfx.loop('footsteps_dirt', 0.8, 400); } catch (e) {}

    // Arrival after ~6.5s
    this._elapsed = 0;
    this.time.delayedCall(6500, () => {
      try { sfx.stopLoop('footsteps_dirt', 500); } catch (e) {}
      cam.fadeOut(600, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        const dest = this._turned ? this._from : this._to;
        const spawn = this._turned ? this._originSpawn : this._spawn;
        gameState.currentTown = dest;
        try { loadTownState(dest); saveGame(); } catch (e) {}
        this.scene.start('GameScene', { firstVisit: false, spawn });
      });
    });
  }

  update(time, delta) {
    // Pines drift right-to-left; the walker bobs in place
    for (const b of this._bands) {
      b.g.x -= b.speed * delta;
      if (b.g.x < -400) b.g.x += 400;
    }
    const w = this._walker, p = this._walkerPos;
    if (!w) return;
    const t = (this._elapsed += delta);
    const bob = Math.abs(Math.sin(t * 0.008)) * 3;
    const stride = Math.sin(t * 0.008);
    w.clear();
    // Shadow
    w.fillStyle(0x000000, 0.4); w.fillEllipse(p.x, p.y + 14, 18, 4);
    // Legs mid-stride
    w.fillStyle(0x14141c, 1);
    w.fillRect(p.x - 4 + stride * 3, p.y + 2 - bob, 3, 12 + bob);
    w.fillRect(p.x + 1 - stride * 3, p.y + 2 - bob, 3, 12 + bob);
    // Body + satchel
    w.fillStyle(0x1e1e2a, 1); w.fillRect(p.x - 5, p.y - 14 - bob, 10, 17);
    w.fillStyle(0x2a2438, 1); w.fillRect(p.x + 3, p.y - 8 - bob, 4, 6);
    // Head
    w.fillStyle(0x2a2a38, 1); w.fillRect(p.x - 4, p.y - 22 - bob, 8, 8);
    // The mark — one warm pixel swinging with the free hand
    w.fillStyle(0xffc878, 0.9);
    w.fillRect(p.x - 7 - stride * 2, p.y - 4 - bob, 2, 2);
    w.fillStyle(0xffc878, 0.25);
    w.fillCircle(p.x - 6 - stride * 2, p.y - 3 - bob, 5);
  }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN MENU SCENE — first scene the player sees
// ─────────────────────────────────────────────────────────────────────
