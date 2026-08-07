
// ═══ 08 GAME NPCS — GameScene prototype extension ═══
Object.assign(GameScene.prototype, {
  updateInnSmoke(time, delta) {
    if (!this._innSmokeGfx) return;
    this._innSmokeNextPuff -= delta;
    if (this._innSmokeNextPuff <= 0) {
      // Randomised spacing 3–8 seconds, tighter while the domovoi speaks
      const speaking = this._domovoiSpeaking ? 0.4 : 1.0;
      this._innSmokeNextPuff = (3000 + Math.random() * 5000) * speaking;
      this._innSmoke.push({
        x: this._innChimneyX + (Math.random() - 0.5) * 2,
        y: this._innChimneyY,
        vy: -0.015 - Math.random() * 0.01,
        vx: (Math.random() - 0.5) * 0.01,
        r: 2 + Math.random() * 1.5,
        life: 1.0,
      });
    }
    const g = this._innSmokeGfx;
    g.clear();
    for (let i = this._innSmoke.length - 1; i >= 0; i--) {
      const p = this._innSmoke[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.r += 0.003 * delta;
      p.life -= 0.00025 * delta;
      if (p.life <= 0) { this._innSmoke.splice(i, 1); continue; }
      g.fillStyle(0x2a2420, p.life * 0.55);
      g.fillCircle(p.x, p.y, p.r);
    }
  },
  // ── AMBIENT CREATURES ─────────────────────────────────────────────
  // Crow on the idol, wandering black cat, pecking chickens, shrine
  // moths. All drawn each frame in a single graphics object so they
  // remain cheap. Movement uses cartesian coordinates and is converted
  // through cartToIso so creatures sit naturally on the iso plane.
  createCreatures() {
    this.creatureGfx = this.add.graphics();
    this.creatureGfx.setDepth(500); // above ground, below atmosphere

    // ── Crow perched on the idol ──
    this.crow = {
      // Idol cell centre
      cx: CENTER - 0.5,
      cy: CENTER - 0.5,
      breathPhase: Math.random() * Math.PI * 2,
      headTurn: 0,        // 0 = forward, 1 = facing player
      headTarget: 0,
      idleTimer: 0,       // ms player stood still nearby
    };

    // ── Black cat — wanders 4 waypoints near the houses ──
    const wp = [
      { x: 6,  y: 7  },
      { x: 14, y: 6  },
      { x: 15, y: 14 },
      { x: 7,  y: 14 },
    ];
    this.cat = {
      waypoints: wp,
      wpIdx: 0,
      x: wp[0].x, y: wp[0].y,
      state: 'walk',     // 'walk' | 'wash' | 'crossroads'
      stateTimer: 0,
      washTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      facing: 1,          // -1 left, 1 right
      speed: 0.0006,      // cells per ms — unhurried
      crossroadsTimer: (2 + Math.random() * 3) * 60 * 1000, // 2-5 min
      crossroadsPlayed: false,
    };

    // ── Five chickens near the south-side houses ──
    // Each has a small "home zone" they wander randomly inside, with
    // long pauses for pecking and the occasional short waddle.
    const chickenSpawns = [
      { x: 5.5,  y: 16.2 },
      { x: 6.8,  y: 16.8 },
      { x: 7.4,  y: 15.6 },
      { x: 17.4, y: 16.6 },
      { x: 16.2, y: 15.8 },
    ];
    this.chickens = chickenSpawns.map(s => ({
      x: s.x, y: s.y,
      homeX: s.x, homeY: s.y,
      tgtX: s.x, tgtY: s.y,
      state: 'peck',          // 'peck' | 'walk' | 'idle'
      stateT: 0,
      stateDur: 1500 + Math.random() * 2500,
      peckPhase: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      facing: Math.random() < 0.5 ? -1 : 1,
      scatterT: 0, dx: 0, dy: 0,
    }));

    // ── Moths — 3 around each wayside shrine ──
    this.moths = [];
    shrines.forEach(s => {
      for (let i = 0; i < 3; i++) {
        this.moths.push({
          sx: s.x, sy: s.y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0009 + Math.random() * 0.0006,
          rx: 0.7 + Math.random() * 0.4,
          ry: 0.35 + Math.random() * 0.2,
          wing: Math.random() * Math.PI * 2,
          alpha: 1,
        });
      }
    });
  },
  updateCreatures(time, delta) {
    if (!this.creatureGfx) return;
    const g = this.creatureGfx;
    g.clear();

    const px = this.playerCartX, py = this.playerCartY;
    const woX = this.worldOffset.x, woY = this.worldOffset.y;
    const dt = delta || 16;

    // ── Crow ──
    {
      const c = this.crow;
      c.breathPhase += dt * 0.0025;
      const dx = px - c.cx, dy = py - c.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8 && !this.isWalking) c.idleTimer += dt;
      else c.idleTimer = 0;
      c.headTarget = c.idleTimer > 10000 ? 1 : 0;
      c.headTurn += (c.headTarget - c.headTurn) * 0.012;

      const iso = cartToIso(c.cx, c.cy);
      const cx = iso.x + woX;
      const cy = iso.y + woY - 80; // perched on top of straw idol head
      const breath = Math.sin(c.breathPhase) * 0.6;
      // Tail feathers (drawn first, behind body)
      g.fillStyle(0x05050c, 1);
      g.fillTriangle(cx + 4, cy - 1 + breath, cx + 9, cy + 1 + breath, cx + 4, cy + 2 + breath);
      g.fillRect(cx + 4, cy + breath, 5, 1);
      // Body — plump oval
      g.fillStyle(0x0a0a14, 1);
      g.fillEllipse(cx, cy + 1 + breath, 12, 7);
      // Folded wing
      g.fillStyle(0x05050c, 1);
      g.fillEllipse(cx + 1, cy + breath, 9, 4);
      // Blue sheen on wing
      g.fillStyle(0x2a3866, 0.85);
      g.fillEllipse(cx + 1, cy - 0.5 + breath, 7, 2);
      g.fillStyle(0x4a6090, 0.5);
      g.fillRect(cx, cy - 1 + breath, 4, 1);
      // Belly
      g.fillStyle(0x14141e, 0.7);
      g.fillEllipse(cx - 1, cy + 2 + breath, 7, 3);
      // Legs
      g.fillStyle(0x3a2818, 1);
      g.fillRect(cx - 2, cy + 4 + breath, 1, 2);
      g.fillRect(cx + 1, cy + 4 + breath, 1, 2);
      // Head — turns toward player
      const headDir = px > c.cx ? 1 : -1;
      const headOff = c.headTurn * headDir * 2.5;
      const hx = cx - 5 + headOff;
      const hy = cy - 3 + breath;
      g.fillStyle(0x080810, 1);
      g.fillCircle(hx, hy, 3);
      // Beak — long pointed crow beak
      g.fillStyle(0x2a1a0a, 1);
      g.fillTriangle(hx - 1, hy - 0.5, hx - 1, hy + 1, hx - 5 + headOff * 0.4, hy + 0.3);
      g.fillStyle(0x1a0e08, 1);
      g.fillRect(hx - 4, hy + 0.2, 2, 1);
      // Eye — small bright bead
      g.fillStyle(0xffd060, 1);
      g.fillRect(hx - 0.5, hy - 0.8, 1, 1);
      g.fillStyle(0x000000, 1);
      g.fillRect(hx - 0.3, hy - 0.6, 0.5, 0.5);
    }

    // ── Black cat ──
    {
      const cat = this.cat;
      cat.stateTimer += dt;
      cat.walkPhase += dt * 0.008;

      // Crossroads visit (one-time)
      if (!cat.crossroadsPlayed && time > cat.crossroadsTimer && cat.state !== 'crossroads') {
        cat.state = 'crossroads';
        cat.stateTimer = 0;
        cat.target = { x: CENTER - 0.5, y: CENTER - 0.5 };
      }

      if (cat.state === 'walk' || cat.state === 'crossroads') {
        const tgt = cat.state === 'crossroads'
          ? cat.target
          : cat.waypoints[cat.wpIdx];
        const ddx = tgt.x - cat.x, ddy = tgt.y - cat.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        // Lock facing once at the start of a walk segment so the cat
        // never appears to slide backwards.
        if (cat.facingLocked !== true) {
          cat.facing = ddx >= 0 ? 1 : -1;
          cat.facingLocked = true;
        }
        const spd = cat.state === 'crossroads' ? cat.speed * 1.6 : cat.speed;
        // Player slows it
        const pdx = px - cat.x, pdy = py - cat.y;
        const pd = Math.sqrt(pdx * pdx + pdy * pdy);
        const slow = pd < 2 ? 0.3 : 1;
        if (d < 0.15) {
          if (cat.state === 'crossroads') {
            cat.state = 'crossroadsPause';
            cat.stateTimer = 0;
            cat.facingLocked = false;
          } else {
            cat.state = 'wash';
            cat.washTimer = 0;
            cat.stateTimer = 0;
            cat.pauseDur = 4000 + Math.random() * 2000;
            cat.facingLocked = false;
          }
        } else {
          cat.x += (ddx / d) * spd * dt * slow;
          cat.y += (ddy / d) * spd * dt * slow;
        }
      } else if (cat.state === 'wash') {
        cat.washTimer += dt;
        if (cat.stateTimer > cat.pauseDur) {
          cat.state = 'walk';
          cat.wpIdx = (cat.wpIdx + 1) % cat.waypoints.length;
        }
      } else if (cat.state === 'crossroadsPause') {
        if (cat.stateTimer > 3000) {
          cat.state = 'walk';
          cat.crossroadsPlayed = true;
          cat.wpIdx = Math.floor(Math.random() * cat.waypoints.length);
        }
      }

      const iso = cartToIso(cat.x, cat.y);
      const cx = iso.x + woX;
      const cy = iso.y + woY - 4;
      const f = cat.facing;
      const walking = (cat.state === 'walk' || cat.state === 'crossroads');
      const sitting = (cat.state === 'wash' || cat.state === 'crossroadsPause');

      // Soft shadow under cat
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(cx, cy + 5, 14, 3);

      const bob = walking ? Math.sin(cat.walkPhase * 2) * 0.7 : 0;
      // Hip sway
      const sway = walking ? Math.sin(cat.walkPhase) * 0.4 : 0;

      // Hindquarters (rounded rump, slightly higher when sitting)
      const rumpY = sitting ? cy - 2 : cy - 1 + bob;
      g.fillStyle(0x000000, 1);
      g.fillEllipse(cx - f * 5, rumpY, 8, 7);

      // Back / midsection — long oval, dipping in the middle
      g.fillStyle(0x000000, 1);
      g.fillEllipse(cx, cy - 1 + bob, 12, 5);

      // Shoulders / chest (front of body)
      const shY = sitting ? cy - 2 : cy - 1 + bob;
      g.fillEllipse(cx + f * 5, shY, 7, 6);

      // Tail — long, curls when sitting, flicks when walking
      if (sitting) {
        // Curled tail wrapping around the side
        g.lineStyle(2.5, 0x000000, 1);
        g.beginPath();
        g.moveTo(cx - f * 8, rumpY);
        g.lineTo(cx - f * 11, rumpY + 1);
        g.lineTo(cx - f * 12, rumpY - 2);
        g.lineTo(cx - f * 10, rumpY - 4);
        g.strokePath();
      } else {
        // Walking tail — gentle S-curve flick
        const flick = Math.sin(cat.walkPhase * 1.3 + 1) * 1.5;
        g.lineStyle(2, 0x000000, 1);
        g.beginPath();
        g.moveTo(cx - f * 8, rumpY - 1);
        g.lineTo(cx - f * 11, rumpY - 2 + flick);
        g.lineTo(cx - f * 13, rumpY - 4 + flick * 1.4);
        g.strokePath();
      }

      // Front legs — alternating walk cycle
      g.fillStyle(0x000000, 1);
      if (walking) {
        const lStep = Math.sin(cat.walkPhase * 2) * 1.8;
        const rStep = Math.sin(cat.walkPhase * 2 + Math.PI) * 1.8;
        g.fillRect(cx + f * 5 - 1, cy + 2 + Math.max(0, lStep), 1.4, 3 - Math.max(0, lStep) * 0.5);
        g.fillRect(cx + f * 7 - 1, cy + 2 + Math.max(0, rStep), 1.4, 3 - Math.max(0, rStep) * 0.5);
        // Hind legs
        const hlStep = Math.sin(cat.walkPhase * 2 + Math.PI / 2) * 1.5;
        const hrStep = Math.sin(cat.walkPhase * 2 + Math.PI * 1.5) * 1.5;
        g.fillRect(cx - f * 4 - 1, cy + 2 + Math.max(0, hlStep), 1.4, 3 - Math.max(0, hlStep) * 0.5);
        g.fillRect(cx - f * 6 - 1, cy + 2 + Math.max(0, hrStep), 1.4, 3 - Math.max(0, hrStep) * 0.5);
      } else {
        // Sitting — front legs straight down, hindquarters tucked
        g.fillRect(cx + f * 5 - 1, cy + 1, 1.4, 4);
        g.fillRect(cx + f * 7 - 1, cy + 1, 1.4, 4);
        g.fillRect(cx - f * 4 - 1, cy + 2, 2, 3);
      }

      // Head
      const hx = cx + f * 8;
      const hy = sitting ? cy - 4 : cy - 3 + bob * 0.6;
      g.fillStyle(0x000000, 1);
      g.fillCircle(hx, hy, 3.2);
      // Cheek puffs (gives the head a feline shape)
      g.fillEllipse(hx - f * 0.5, hy + 1.5, 5, 2);

      // Pointed triangular ears (taller, more cat-like)
      g.fillTriangle(hx - 2.5, hy - 2, hx - 1, hy - 2, hx - 1.7, hy - 5.5);
      g.fillTriangle(hx + 1, hy - 2, hx + 2.5, hy - 2, hx + 1.7, hy - 5.5);
      // Inner ear hint
      g.fillStyle(0x2a1a1a, 1);
      g.fillTriangle(hx - 2, hy - 2.5, hx - 1.4, hy - 2.5, hx - 1.7, hy - 4.5);
      g.fillTriangle(hx + 1.4, hy - 2.5, hx + 2, hy - 2.5, hx + 1.7, hy - 4.5);

      // Snout / nose
      g.fillStyle(0x4a1a1a, 1);
      g.fillRect(hx + f * 2.5, hy + 0.5, 1, 1);

      // Amber eyes
      g.fillStyle(0xffb030, 1);
      g.fillRect(hx + f * 0.6, hy - 1, 1.2, 1.2);
      g.fillRect(hx + f * 2.2, hy - 1, 1.2, 1.2);
      // Slit pupils
      g.fillStyle(0x000000, 1);
      g.fillRect(hx + f * 1.0, hy - 0.8, 0.4, 1);
      g.fillRect(hx + f * 2.6, hy - 0.8, 0.4, 1);

      // Washing paw motion when sitting
      if (cat.state === 'wash') {
        const pawCycle = Math.sin(cat.washTimer * 0.008);
        const pawY = hy + 1.5 - Math.max(0, pawCycle) * 3;
        const pawX = hx + f * 1.5;
        g.fillStyle(0x000000, 1);
        g.fillRect(pawX - 1, pawY, 2, 3);
        // Tongue flick when paw is up
        if (pawCycle > 0.7) {
          g.fillStyle(0xc83a4a, 0.9);
          g.fillRect(hx + f * 2, hy + 1.2, 1, 0.6);
        }
      }
    }

    // ── Chickens ──
    this.chickens.forEach(ch => {
      ch.stateT += dt;
      ch.peckPhase += dt * 0.005;
      ch.bobPhase += dt * 0.004;

      // Player proximity scatter
      const cdx = px - ch.x, cdy = py - ch.y;
      const cd = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cd < 3 && ch.scatterT <= 0) {
        // Move 2 tiles directly away from the player
        const ang = Math.atan2(-cdy, -cdx) + (Math.random() - 0.5) * 0.8;
        ch.dx = Math.cos(ang);
        ch.dy = Math.sin(ang);
        ch.scatterT = 1200;
        ch.facing = ch.dx >= 0 ? 1 : -1;
        ch.state = 'walk';
      }

      // House-tile collision helper
      const isHouseTile = (wx, wy) => {
        const tx = Math.floor(wx), ty = Math.floor(wy);
        if (ty < 0 || ty >= MAP_SIZE || tx < 0 || tx >= MAP_SIZE) return true;
        return map[ty][tx] === 3;
      };

      if (ch.scatterT > 0) {
        ch.scatterT -= dt;
        const nx = ch.x + ch.dx * dt * 0.0024;
        const ny = ch.y + ch.dy * dt * 0.0024;
        if (!isHouseTile(nx, ch.y)) ch.x = nx;
        else ch.dx = -ch.dx;
        if (!isHouseTile(ch.x, ny)) ch.y = ny;
        else ch.dy = -ch.dy;
      } else if (ch.state === 'walk') {
        // Walk toward target — slower, more natural pace with little hops
        const ddx = ch.tgtX - ch.x, ddy = ch.tgtY - ch.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < 0.08) {
          ch.state = Math.random() < 0.7 ? 'peck' : 'idle';
          ch.stateT = 0;
          ch.stateDur = 1800 + Math.random() * 3500;
        } else {
          // Hop-pace: slight pause cadence based on bobPhase
          const cadence = 0.6 + 0.4 * Math.max(0, Math.sin(ch.bobPhase * 2));
          const step = 0.00065 * cadence;
          const nx = ch.x + (ddx / d) * dt * step;
          const ny = ch.y + (ddy / d) * dt * step;
          if (!isHouseTile(nx, ny)) {
            ch.x = nx; ch.y = ny;
          } else {
            // Pick a new target away from the obstacle
            ch.stateT = ch.stateDur + 1;
          }
          if (Math.abs(ddx) > 0.05) ch.facing = ddx >= 0 ? 1 : -1;
        }
      } else if (ch.stateT > ch.stateDur) {
        // Pick a new random spot inside the home zone, retry until non-house
        let tries = 0, tx, ty;
        do {
          tx = ch.homeX + (Math.random() - 0.5) * 2.6;
          ty = ch.homeY + (Math.random() - 0.5) * 1.8;
          tries++;
        } while (isHouseTile(tx, ty) && tries < 8);
        ch.tgtX = tx; ch.tgtY = ty;
        ch.state = 'walk';
        ch.stateT = 0;
      }

      const iso = cartToIso(ch.x, ch.y);
      const cx = iso.x + woX;
      const cy = iso.y + woY - 3;
      const f = ch.facing;
      const walking = ch.state === 'walk' || ch.scatterT > 0;
      const pecking = ch.state === 'peck';
      const peck = pecking ? Math.max(0, Math.sin(ch.peckPhase)) : 0;
      const bodyBob = walking ? Math.sin(ch.bobPhase * 2) * 0.5 : 0;
      const headBob = walking ? Math.sin(ch.bobPhase * 2 + Math.PI) * 1.2 : 0;

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(cx, cy + 4, 11, 2.5);

      // Tail feathers (drawn behind)
      g.fillStyle(0x5a3812, 1);
      g.fillTriangle(cx - f * 5, cy - 2 + bodyBob, cx - f * 7, cy - 4 + bodyBob, cx - f * 7, cy + bodyBob);
      g.fillStyle(0x7a4a18, 1);
      g.fillTriangle(cx - f * 5, cy - 1 + bodyBob, cx - f * 6.5, cy - 3 + bodyBob, cx - f * 6.5, cy + 1 + bodyBob);

      // Body — plump oval
      g.fillStyle(0xb07a3a, 1);
      g.fillEllipse(cx, cy + bodyBob, 11, 7);
      // Belly highlight
      g.fillStyle(0xc89656, 0.7);
      g.fillEllipse(cx, cy + 1.5 + bodyBob, 8, 4);
      // Wing
      g.fillStyle(0x8a5a22, 1);
      g.fillEllipse(cx - f * 1, cy + bodyBob, 6, 4);
      g.lineStyle(1, 0x5a3812, 0.7);
      g.beginPath();
      g.moveTo(cx - f * 3, cy + bodyBob);
      g.lineTo(cx + f * 1, cy + bodyBob);
      g.strokePath();

      // Neck and head
      const neckX = cx + f * 4;
      const neckY = cy - 1 + bodyBob;
      const headX = neckX + f * 1;
      const headY = neckY - 4 + headBob + peck * 3;
      g.fillStyle(0xb07a3a, 1);
      g.fillRect(neckX - 1, headY + 1, 2, neckY - headY);
      g.fillCircle(headX, headY, 2.2);

      // Comb (red)
      g.fillStyle(0xc02828, 1);
      g.fillRect(headX - 1, headY - 3, 1, 1);
      g.fillRect(headX, headY - 4, 1, 1);
      g.fillRect(headX + 1, headY - 3, 1, 1);
      // Wattle (small red dangle under beak)
      g.fillRect(headX + f * 1.5, headY + 1, 1, 1);

      // Beak
      g.fillStyle(0xe8b040, 1);
      g.fillTriangle(headX + f * 2, headY - 0.5, headX + f * 2, headY + 0.8, headX + f * 3.5, headY + 0.2);

      // Eye
      g.fillStyle(0x000000, 1);
      g.fillRect(headX + f * 0.5, headY - 0.7, 1, 1);
      g.fillStyle(0xfff0c0, 0.9);
      g.fillRect(headX + f * 0.6, headY - 0.6, 0.4, 0.4);

      // Legs — visible when walking, tucked when pecking
      if (!pecking) {
        g.fillStyle(0xc88830, 1);
        const legStep = walking ? Math.sin(ch.bobPhase * 4) * 1 : 0;
        g.fillRect(cx - 1, cy + 3 + bodyBob, 1, 3 + Math.max(0, legStep));
        g.fillRect(cx + 1.5, cy + 3 + bodyBob, 1, 3 + Math.max(0, -legStep));
        // Feet
        g.fillRect(cx - 1.5, cy + 6 + bodyBob + Math.max(0, legStep), 2, 0.6);
        g.fillRect(cx + 1, cy + 6 + bodyBob + Math.max(0, -legStep), 2, 0.6);
      } else {
        g.fillStyle(0xc88830, 1);
        g.fillRect(cx - 1, cy + 3, 1, 2);
        g.fillRect(cx + 1.5, cy + 3, 1, 2);
      }
    });

    // ── Moths around shrines ──
    this.moths.forEach(m => {
      m.phase += dt * m.speed;
      m.wing += dt * 0.012;
      // Distance to player from this shrine
      const sdx = px - m.sx, sdy = py - m.sy;
      const sd = Math.sqrt(sdx * sdx + sdy * sdy);
      const targetA = sd < 4 ? 0 : 1;
      const fadeRate = sd < 4 ? dt / 1000 : dt / 2000;
      m.alpha += Math.sign(targetA - m.alpha) * Math.min(fadeRate, Math.abs(targetA - m.alpha));
      if (m.alpha < 0.02) return;

      const ox = Math.cos(m.phase) * m.rx;
      const oy = Math.sin(m.phase) * m.ry;
      const iso = cartToIso(m.sx + ox, m.sy + oy);
      const mx = iso.x + woX;
      const my = iso.y + woY - 14 + Math.sin(m.phase * 1.7) * 3;
      const wingOpen = (Math.sin(m.wing) * 0.5 + 0.5);
      const ww = 1 + wingOpen * 2;
      // Glow
      g.fillStyle(0xa0c0d8, 0.25 * m.alpha);
      g.fillCircle(mx, my, 3);
      // Wings
      g.fillStyle(0xe0e8f0, 0.85 * m.alpha);
      g.fillEllipse(mx - 1, my, ww, 2);
      g.fillEllipse(mx + 1, my, ww, 2);
      // Body
      g.fillStyle(0x4a4a55, m.alpha);
      g.fillRect(mx, my, 1, 2);
    });
  },
  // ── BABA ELŻBIETA ─────────────────────────────────────────────────
  // Hero-fidelity rebuild: broad, hunched matriarch of the Stitched
  // Circle. Embroidered madder-red coat, bruised-purple headscarf, herb
  // bundle held at the waist, burnt braid at her belt. 2-frame breathing
  // idle — frame 1 lifts the shoulders 1px and sways the herbs.
  createBabaElzbieta() {
    const iso = cartToIso(BABA.cartX, BABA.cartY);
    const bx = iso.x + this.worldOffset.x;
    const by = iso.y + this.worldOffset.y;
    const container = this.add.container(bx, by);
    this.babaGfx = this.add.graphics();
    container.add(this.babaGfx);
    container._sortY = by;
    this.babaSprite = container;
    this.babaBaseY = by;
    this.babaFrame = 0;
    this.objectLayer.add(container);
    this.drawBabaFrame(0);

    this.drawBabaBench();
  },
  drawBabaFrame(frame) {
    const g = this.babaGfx;
    if (!g) return;
    g.clear();
    // Strict palette — older, earthier than the children's colours
    const coat    = 0x6a2430, coatHi  = 0x7e2e3a, coatLo  = 0x561c28;
    const stitch  = 0xc8922a, stitchHi = 0xe0b050;
    const shawl   = 0x8a7a5a, shawlLo = 0x6a5e46;
    const scarf   = 0x3a2e50, scarfHi = 0x4a3a62;
    const skin    = 0xb08056, skinLo  = 0x987048;
    const boot    = 0x2a1810;
    const herb    = 0x5a7a3a, herbHi  = 0x74924a, herbDry = 0x9a8a4a;
    const wisp    = 0xb8b0a0;
    const eye     = 0x1a140c, brow = 0x3a3026, mouth = 0x6a4a3a;
    const px = (x, y, w, h, color, a = 1) => { g.fillStyle(color, a); g.fillRect(x, y, w, h); };

    // Breath: frame 1 lifts torso/head 1px, herbs sway 1px
    const up = frame === 1 ? 1 : 0;
    const sway = frame === 1 ? 1 : 0;

    // Shadow — broad, she plants herself
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(0, 5, 24, 8);

    // Worn boots peeking from the hem
    px(-5, 1, 4, 4, boot); px(2, 1, 4, 4, boot);
    px(-5, 1, 4, 1, 0x3a2418); px(2, 1, 4, 1, 0x3a2418);

    // Coat body — broad, widening to the hem (she is a wall of a woman)
    px(-9, -22 - up, 18, 12, coat);          // chest
    px(-10, -10 - up, 20, 8, coat);          // waist
    px(-11, -2, 22, 3, coat);                // hem flare (fixed to ground)
    px(-9, -22 - up, 18, 2, coatHi);         // shoulder light
    px(-11, -2, 22, 1, coatLo);              // hem shade
    // Front opening — two dark lines with copper hooks
    px(0, -20 - up, 1, 19, coatLo);
    px(-1, -17 - up, 1, 1, stitch); px(-1, -12 - up, 1, 1, stitch); px(-1, -7, 1, 1, stitch);
    // Embroidered hem band — the Stitched Circle's work: alternating
    // copper diamonds and upright stitches
    for (let i = -9; i <= 8; i += 4) {
      px(i, -4, 1, 1, stitch);
      px(i + 1, -5, 1, 1, stitchHi);
      px(i + 1, -3, 1, 1, stitch);
      px(i + 2, -4, 1, 1, stitch);
    }
    // Cuff embroidery
    px(-12, -11 - up, 2, 1, stitch); px(10, -11 - up, 2, 1, stitch);

    // Shawl over the shoulders — broad triangle, fringed
    px(-11, -24 - up, 22, 4, shawl);
    px(-10, -20 - up, 8, 2, shawl);
    px(2, -20 - up, 8, 2, shawl);
    px(-11, -21 - up, 3, 1, shawlLo);
    px(8, -21 - up, 3, 1, shawlLo);
    // Fringe ticks
    for (let i = -10; i <= 9; i += 3) px(i, -19 - up + (Math.abs(i) % 2), 1, 2, shawlLo, 0.8);

    // Arms — curved forward, meeting at the waist (hunched posture)
    px(-12, -19 - up, 3, 8, coat);           // left upper
    px(-11, -12 - up, 3, 4, coatHi);         // left forearm turning in
    px(9, -19 - up, 3, 8, coat);             // right upper
    px(8, -12 - up, 3, 4, coatHi);           // right forearm turning in
    // Hands clasped at the waist around the herb bundle
    px(-8, -9 - up, 3, 3, skinLo);
    px(5, -9 - up, 3, 3, skinLo);
    px(-6, -8 - up, 2, 1, skin);
    px(4, -8 - up, 2, 1, skin);

    // Herb bundle — sage and dried yarrow, tied with thread
    const hx = sway; // sways gently with the breath
    px(-4 + hx, -13 - up, 8, 2, herb);       // green mass
    px(-3 + hx, -15 - up, 6, 2, herbHi);     // fresh tips
    px(-2 + hx, -11 - up, 5, 2, herbDry);    // dried under-layer
    px(-1 + hx, -16 - up, 1, 1, herbHi); px(2 + hx, -16 - up, 1, 1, herb);
    px(0 + hx, -10 - up, 3, 1, stitch);      // thread tie
    // Loose sprig hanging
    px(3 + hx, -9 - up, 1, 2, herbDry);

    // Burnt braid at her belt — her mother's, and her trade
    px(-10, -8, 2, 3, 0x282018);
    px(-11, -5, 2, 4, 0x282018);
    px(-10, -1, 2, 2, 0x141210);             // charred end
    px(-10, -7, 1, 1, 0x3a3026);             // braid weave glint

    // Head — forward-tilted (hunched), sits low between the shoulders
    const hyx = 1;                            // head pushed forward
    px(-5 + hyx, -32 - up, 10, 8, skin);
    px(-5 + hyx, -32 - up, 10, 2, skinLo);   // brow shade under scarf
    px(-5 + hyx, -26 - up, 10, 1, skinLo);   // jaw shade
    // Wrinkles — one line each cheek, earned
    px(-4 + hyx, -27 - up, 2, 1, skinLo);
    px(3 + hyx, -27 - up, 2, 1, skinLo);
    // Grey wisps escaping the scarf
    px(-6 + hyx, -30 - up, 1, 2, wisp);
    px(5 + hyx, -31 - up, 1, 2, wisp, 0.9);

    // Headscarf — bruised purple, knotted at the side, two tails
    px(-6 + hyx, -35 - up, 12, 4, scarf);
    px(-5 + hyx, -36 - up, 10, 1, scarfHi);
    px(-6 + hyx, -32 - up, 2, 1, scarf);
    px(4 + hyx, -32 - up, 2, 1, scarf);
    // Side knot + tails
    px(6 + hyx, -33 - up, 2, 2, scarfHi);
    px(7 + hyx, -31 - up, 2, 4, scarf);
    px(8 + hyx, -27 - up, 1, 3, scarfHi);

    // Face — sharp eyes that read fates; she is not blind, she is old
    px(-3 + hyx, -30 - up, 2, 2, eye);
    px(2 + hyx, -30 - up, 2, 2, eye);
    px(-2 + hyx, -30 - up, 1, 1, 0xd8d0b0);  // catchlight left
    px(3 + hyx, -30 - up, 1, 1, 0xd8d0b0);   // catchlight right
    // Brows — set low. Permanently unimpressed.
    px(-4 + hyx, -31 - up, 3, 1, brow);
    px(2 + hyx, -31 - up, 3, 1, brow);
    // Nose shadow + thin pressed mouth
    px(0 + hyx, -28 - up, 1, 2, skinLo);
    px(-1 + hyx, -25 - up, 4, 1, mouth);
  },
  // ── BABA'S BENCH ──────────────────────────────────────────────────
  // A small wooden bench beside Baba where she sometimes sits.
  drawBabaBench() {
    const benchX = BABA.cartX + 1.0;
    const benchY = BABA.cartY + 0.1;
    const iso = cartToIso(benchX, benchY);
    const bx = iso.x + this.worldOffset.x;
    const by = iso.y + this.worldOffset.y;
    const container = this.add.container(bx, by);
    const g = this.add.graphics();
    // Soft shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(0, 2, 22, 4);
    // Two squat legs (back + front)
    g.fillStyle(0x3a2410, 1);
    g.fillRect(-8, -2, 2, 5);
    g.fillRect( 6, -2, 2, 5);
    // Seat plank — slight iso slant
    g.fillStyle(0x6e4a22, 1);
    g.fillRect(-10, -4, 20, 3);
    // Plank highlight
    g.fillStyle(0x8a5e2a, 1);
    g.fillRect(-10, -4, 20, 1);
    // Wood grain ticks
    g.fillStyle(0x3a2410, 0.7);
    g.fillRect(-6, -3, 1, 1);
    g.fillRect(-1, -3, 1, 1);
    g.fillRect( 4, -3, 1, 1);
    container.add(g);
    container._sortY = by;
    this.objectLayer.add(container);
  },
  // ── ZUZKA — CHILD NPC ──────────────────────────────────────────────
  // A small girl sitting on the idol's stone base, holding a glass jar.
  // She's the only one in the village who doesn't look away from strangers.
  createZuzka() {
    const iso = cartToIso(ZUZKA.cartX, ZUZKA.cartY);
    const zx = iso.x + this.worldOffset.x;
    const zy = iso.y + this.worldOffset.y;
    const container = this.add.container(zx, zy);
    this.zuzkaGfx = this.add.graphics();
    container.add(this.zuzkaGfx);
    container._sortY = zy;
    this.zuzkaSprite = container;
    this.zuzkaBaseY = zy;
    this.zuzkaFrame = 0;
    this.objectLayer.add(container);
    this.drawZuzkaFrame(0);
  },
  // ── ZUZKA — 9yo, patched blue dress, firefly jar, unsettling stillness ──
  // Pixel-art rebuild matching the hero's fidelity: strict palette, 1px
  // detail, 2-frame breathing idle. Frame 0 = neutral; frame 1 = weight
  // shifts +1px, jar glow brightens. She sits dangling on the idol base.
  drawZuzkaFrame(frame) {
    const g = this.zuzkaGfx; if (!g) return;
    g.clear();

    // ── Strict palette ─────────────────────────────────────────────
    const C = {
      dress:     0x4a5a7a,
      dressHi:   0x5a6a8a,
      dressLo:   0x3a4a6a,
      patchA:    0x556680, // slightly greener blue patch
      patchB:    0x3e4e6e, // darker patch
      linen:     0xe8dfc0, // undershirt (yellowed)
      linenLo:   0xc8bfa0,
      stocking:  0x1e1a14,
      stockMend: 0x3a2e20, // single lighter stitch line
      shoe:      0x2a1810,
      shoeHi:    0x3a2418,
      skin:      0xc4845a,
      skinHi:    0xd4946a,
      skinLo:    0xb4744a,
      hair:      0x2a1a0e,
      hairHi:    0x3a2818,
      eye:       0x1a100a,
      mouth:     0x8a5a3a,
      glass:     0xc8e8d0,
      glassHi:   0xe0f4e4,
      lid:       0x6a5a3a,
      lidHi:     0x8a7a4a,
      fly:       0xffb347,
      flyHot:    0xffe070,
    };

    const px = (x, y, w, h, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillRect(Math.round(x), Math.round(y), w, h);
    };

    // Frame 1: weight shifts 1px, glow slightly stronger
    const shift = frame === 1 ? 1 : 0;
    const glowBoost = frame === 1 ? 1.4 : 1.0;

    // ── SHADOW ─────────────────────────────────────────────────────
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(0, 4, 16, 5);

    // ── LEGS (dangling) ────────────────────────────────────────────
    // Dark stockings
    px(-5, -2 + shift, 3, 6, C.stocking);
    px( 2, -2,         3, 6, C.stocking);
    // Single lighter mend stitch on the left knee
    px(-4, 0 + shift, 1, 1, C.stockMend);
    // Shoes — dark brown, slightly oversized
    px(-6, 4 + shift, 5, 2, C.shoe);
    px( 1, 4,         5, 2, C.shoe);
    px(-6, 4 + shift, 5, 1, C.shoeHi, 0.6);
    px( 1, 4,         5, 1, C.shoeHi, 0.6);

    // ── DRESS BODY ─────────────────────────────────────────────────
    // Main body — 11 wide, waisted
    px(-6, -15, 12, 15, C.dress);
    // Highlight down the left torso
    px(-6, -15, 1, 14, C.dressHi);
    px(-5, -15, 1, 2,  C.dressHi);
    // Shadow down the right torso
    px( 5, -14, 1, 14, C.dressLo);
    px( 4, -1,  2, 1,  C.dressLo);
    // Patches — visible repairs in slightly different blues
    px(-4, -10, 3, 3, C.patchA);         // left chest patch
    px(-4, -10, 3, 1, C.dressHi, 0.5);   // top rim highlight
    px( 1, -6, 3, 2, C.patchB);          // right hip patch
    px(-3, -3, 2, 2, C.patchB, 0.85);    // lower-left patch

    // Hem line
    px(-6, 0, 12, 1, C.dressLo);

    // ── UNDERSHIRT (collar + cuffs, yellowed) ──────────────────────
    // Collar V
    px(-2, -16, 4, 1, C.linen);
    px(-1, -15, 2, 1, C.linen);
    px(-1, -14, 2, 1, C.linenLo, 0.7);

    // ── ARMS (holding jar at chest height) ─────────────────────────
    // Upper arms in dress color
    px(-7, -13, 2, 6, C.dress);
    px( 6, -13, 2, 6, C.dress);
    px(-7, -13, 1, 6, C.dressHi);
    px( 7, -13, 1, 6, C.dressLo);
    // Cuffs (linen)
    px(-7, -8, 2, 1, C.linen);
    px( 6, -8, 2, 1, C.linen);
    // Forearms angled in toward the jar
    px(-6, -7, 2, 3, C.skin);
    px( 5, -7, 2, 3, C.skin);
    px(-6, -7, 1, 3, C.skinHi);
    px( 6, -7, 1, 3, C.skinLo);
    // Small hands gripping jar
    px(-4, -6, 2, 2, C.skin);
    px( 3, -6, 2, 2, C.skin);
    px(-4, -6, 1, 1, C.skinHi);
    px( 3, -6, 1, 1, C.skinHi);

    // ── FIREFLY JAR ────────────────────────────────────────────────
    // Soft ambient halo around jar (2-3 px)
    g.fillStyle(C.fly, 0.20 * glowBoost);
    g.fillCircle(0, -8, 9);
    g.fillStyle(C.fly, 0.12 * glowBoost);
    g.fillCircle(0, -8, 12);
    // Glass body
    px(-3, -11, 7, 7, C.glass, 0.60);
    // Glass highlight streak
    px(-2, -10, 1, 5, C.glassHi, 0.55);
    // Glass rim shadow
    px( 3, -10, 1, 5, C.dressLo, 0.35);
    // Metal lid (tarnished)
    px(-3, -12, 7, 1, C.lid);
    px(-3, -13, 7, 1, C.lid);
    px(-3, -13, 7, 1, C.lidHi, 0.5);
    px(-3, -12, 1, 1, 0x000000, 0.3);
    px( 3, -12, 1, 1, 0x000000, 0.3);
    // Fireflies inside — 4 tiny dots, one brighter
    px(-1, -9,  1, 1, C.fly);
    px( 1, -7,  1, 1, C.fly);
    px( 2, -10, 1, 1, C.fly);
    px( 0, -6,  1, 1, C.flyHot); // brightest one
    // Frame 1: hottest firefly also gets a 1px halo
    if (frame === 1) {
      g.fillStyle(C.flyHot, 0.5);
      g.fillCircle(0, -6, 2);
    }

    // ── HEAD ───────────────────────────────────────────────────────
    // Skull outline (square-ish, childlike)
    px(-4, -22, 9, 6, C.skin);
    px(-4, -22, 1, 6, C.skinLo);       // left shadow
    px( 4, -22, 1, 6, C.skinHi, 0.6);  // right cheek highlight
    // Chin rounding
    px(-3, -16, 7, 1, C.skin);
    px(-3, -16, 1, 1, C.skinLo);
    px( 3, -16, 1, 1, C.skinLo);

    // ── HAIR — two uneven braids ───────────────────────────────────
    // Crown
    px(-5, -24, 11, 2, C.hair);
    px(-4, -25, 9, 1, C.hair);
    px(-5, -24, 11, 1, C.hairHi, 0.5);
    // Side fringes
    px(-5, -22, 1, 4, C.hair);
    px( 5, -22, 1, 4, C.hair);
    // Stray strands escaping at temples
    px(-6, -21, 1, 1, C.hair, 0.8);
    px( 6, -22, 1, 1, C.hair, 0.8);
    // Left braid — slightly looser, hangs to collarbone
    px(-6, -17, 2, 1, C.hair);
    px(-7, -16, 2, 1, C.hair);
    px(-7, -15, 2, 1, C.hair);
    px(-7, -14, 2, 1, C.hair);
    px(-7, -13, 2, 1, C.hairHi, 0.6);
    // Right braid — tighter, shorter
    px( 5, -17, 2, 1, C.hair);
    px( 6, -16, 2, 1, C.hair);
    px( 6, -15, 2, 1, C.hair);
    px( 6, -14, 2, 1, C.hairHi, 0.6);

    // ── FACE ───────────────────────────────────────────────────────
    // Eyes — slightly too large, 2px wide, dark, attentive
    px(-3, -20, 2, 2, C.eye);
    px( 2, -20, 2, 2, C.eye);
    // Tiny pinpoint catchlights
    px(-2, -20, 1, 1, C.skinHi, 0.9);
    px( 3, -20, 1, 1, C.skinHi, 0.9);
    // Nose dot
    px( 0, -18, 1, 1, C.skinLo, 0.7);
    // Mouth — small, neutral
    px(-1, -17, 2, 1, C.mouth, 0.7);
  },
  // ── EZRA THE COBBLER ──────────────────────────────────────────────
  // ── BACKGROUND VILLAGERS ────────────────────────────────────────
  // Three ambient villagers that loop their routines forever.
  // They never interact with the player or open dialogue.
  createBackgroundVillagers() {
    this.bgVillagers = [];

    // Shared villager body at hero fidelity: waisted torso with light and
    // shade, linen collar, rope belt, jaw shading, hair fringe, catchlit
    // eyes — the same pixel language as the named NPCs.
    const makeBody = (skin, shirt, pants, hat) => {
      const c = this.add.container(0, 0);
      const g = this.add.graphics();
      const shade = (col, f) => {
        const r = Math.max(0, Math.min(255, Math.round(((col >> 16) & 0xff) * f)));
        const gr = Math.max(0, Math.min(255, Math.round(((col >> 8) & 0xff) * f)));
        const b = Math.max(0, Math.min(255, Math.round((col & 0xff) * f)));
        return (r << 16) | (gr << 8) | b;
      };
      const px = (x, y, w, h, color, a = 1) => { g.fillStyle(color, a); g.fillRect(x, y, w, h); };
      // shadow
      g.fillStyle(0x000000, 0.25); g.fillEllipse(0, 5, 13, 4);
      // legs with inner shading
      px(-3, -1, 2, 8, pants); px(1, -1, 2, 8, pants);
      px(-2, -1, 1, 8, shade(pants, 0.75)); px(2, -1, 1, 8, shade(pants, 0.75));
      // boots with a worn highlight
      px(-3, 6, 3, 2, 0x1a120a); px(1, 6, 3, 2, 0x1a120a);
      px(-3, 6, 3, 1, 0x2c2014, 0.8); px(1, 6, 3, 1, 0x2c2014, 0.8);
      // torso — waisted, lit from the left
      px(-4, -13, 9, 13, shirt);
      px(-4, -13, 1, 12, shade(shirt, 1.25));
      px(4, -12, 1, 12, shade(shirt, 0.72));
      px(-4, -1, 9, 1, shade(shirt, 0.72));
      // rope belt
      px(-4, -5, 9, 1, 0x8a6a3a);
      px(-1, -5, 1, 1, 0xa8834a);
      // linen collar
      px(-2, -13, 5, 1, 0xd0c09a);
      px(-1, -12, 3, 1, 0xb0a07e, 0.8);
      // arms with cuff and shading
      px(-6, -12, 2, 8, shirt); px(4, -12, 2, 8, shirt);
      px(-6, -12, 1, 8, shade(shirt, 1.2)); px(5, -12, 1, 8, shade(shirt, 0.72));
      px(-6, -5, 2, 1, 0xd0c09a, 0.7); px(4, -5, 2, 1, 0xd0c09a, 0.7);
      // hands
      px(-6, -4, 2, 2, skin); px(4, -4, 2, 2, skin);
      // head — squared, with jaw shading
      px(-4, -21, 8, 7, skin);
      px(-4, -21, 8, 1, shade(skin, 0.8));
      px(-4, -15, 8, 1, shade(skin, 0.82));
      px(3, -20, 1, 5, shade(skin, 1.12));   // cheek light
      // hair fringe under the hat line (or bare crown)
      if (hat != null) {
        px(-4, -24, 9, 3, hat);
        px(-3, -25, 7, 1, shade(hat, 1.25)); // crown light
        px(-5, -22, 11, 1, shade(hat, 1.15)); // brim
        px(-4, -21, 8, 1, 0x2a2018, 0.6);    // hair shadow under brim
      } else {
        px(-4, -23, 8, 3, 0x3a2c1c);
        px(-4, -23, 8, 1, 0x4a3a26);
      }
      // eyes with catchlights + a quiet mouth
      px(-2, -19, 1, 2, 0x1a1a20); px(1, -19, 1, 2, 0x1a1a20);
      px(-2, -19, 1, 1, 0xd8d0b8, 0.7); px(1, -19, 1, 1, 0xd8d0b8, 0.7);
      px(-1, -16, 2, 1, shade(skin, 0.7));
      c.add(g);
      c.bodyGfx = g;
      return c;
    };

    // ── 1. SWEEPER — sweeps a doorstep, 3-frame loop, ~4s ───────
    {
      const cart = { x: 7.0, y: 8.5 }; // outside the inn
      const iso = cartToIso(cart.x, cart.y);
      const c = makeBody(0xc8a888, 0x6a4030, 0x2a1c14, 0x4a3020);
      c.x = iso.x + this.worldOffset.x;
      c.y = iso.y + this.worldOffset.y;
      // Broom — small graphics drawn separately so we can rotate it
      const broom = this.add.graphics();
      broom.fillStyle(0x6a4a20, 1);
      broom.fillRect(0, -10, 1, 12); // handle
      broom.fillStyle(0xa88a4a, 1);
      broom.fillRect(-2, 1, 5, 3);   // bristles
      broom.x = 5; broom.y = -4;
      c.add(broom);
      c.broom = broom;
      c._sortY = c.y;
      this.objectLayer.add(c);
      this.bgVillagers.push({ kind: 'sweeper', sprite: c, broom });
    }

    // ── 2. SKY-WATCHER — sits and looks at the sky ──────────────
    {
      const cart = { x: 16.5, y: 15.5 };
      const iso = cartToIso(cart.x, cart.y);
      const c = makeBody(0xb89878, 0x3a4a28, 0x2a2014, null);
      c.x = iso.x + this.worldOffset.x;
      c.y = iso.y + this.worldOffset.y + 2;
      // Compress — sitting pose
      c.scaleY = 0.85;
      // A low rock/stool under
      const stool = this.add.graphics();
      stool.fillStyle(0x4a3a28, 1);
      stool.fillEllipse(0, 4, 10, 3);
      c.addAt(stool, 0);
      c._sortY = c.y;
      this.objectLayer.add(c);
      this.bgVillagers.push({ kind: 'skywatcher', sprite: c, headTimer: 0, headDir: 1 });
    }

    // ── 3. CARRIER — walks slowly between two points ────────────
    {
      const a = { x: 4.5, y: 18.5 };
      const b = { x: 11.5, y: 18.5 };
      const isoA = cartToIso(a.x, a.y);
      const c = makeBody(0xc09078, 0x8a5028, 0x2a1c10, 0x6a4828);
      c.x = isoA.x + this.worldOffset.x;
      c.y = isoA.y + this.worldOffset.y;
      // Bundle on shoulder
      const bundle = this.add.graphics();
      bundle.fillStyle(0x8a6a3a, 1);
      bundle.fillRect(-3, -16, 6, 4);
      bundle.lineStyle(0.5, 0x4a3020, 1);
      bundle.strokeRect(-3, -16, 6, 4);
      c.add(bundle);
      c._sortY = c.y;
      this.objectLayer.add(c);
      this.bgVillagers.push({
        kind: 'carrier', sprite: c,
        a, b, t: 0, dir: 1, speed: 0.00012,
        bobPhase: 0,
      });
    }
  },
  updateBackgroundVillagers(time, delta) {
    if (!this.bgVillagers) return;
    // Schedules: day folk go in after dusk; the sky-watcher comes OUT for
    // the stars — his rock is empty until the first of them shows.
    const villNight = gameState.gameHour >= 20 || gameState.gameHour < 6;
    for (const v of this.bgVillagers) {
      const wantVisible = (v.kind === 'skywatcher')
        ? (villNight || isTimeWindow('dusk')) : !villNight;
      if (v.sprite.visible !== wantVisible) v.sprite.setVisible(wantVisible);
    }
    // Midday silence is sacred — during the noon window every villager
    // stops where they stand. The player learns the custom by watching.
    if (typeof isTimeWindow === 'function' && isTimeWindow('noon')) return;
    for (const v of this.bgVillagers) {
      if (v.kind === 'sweeper') {
        // 3-frame sweep loop every 4s
        const phase = (time % 4000) / 4000;
        // 3 frames: angles -0.6, 0, +0.6 rad
        const frame = Math.floor(phase * 3);
        const ang = frame === 0 ? -0.5 : (frame === 1 ? 0 : 0.5);
        v.broom.rotation = ang;
        // tiny body bob in time with the sweep
        v.sprite.y = v.sprite._baseY = (v.sprite._baseY || v.sprite.y);
        // (no actual y change — keep stable)
      } else if (v.kind === 'skywatcher') {
        // Mostly still, occasional head turn
        v.headTimer += delta;
        if (v.headTimer > 3500) {
          v.headTimer = 0;
          v.headDir *= -1;
          // Tilt body slightly to suggest looking up/around
          this.tweens.add({
            targets: v.sprite, scaleX: v.headDir > 0 ? 1 : -1,
            duration: 600, ease: 'Sine.easeInOut',
          });
        }
        // Subtle breath
        v.sprite.y = (v.sprite._baseY || (v.sprite._baseY = v.sprite.y))
          + Math.sin(time * 0.0015) * 0.3;
      } else if (v.kind === 'carrier') {
        // Slow back-and-forth between a and b
        v.t += delta * v.speed * v.dir;
        if (v.t >= 1) { v.t = 1; v.dir = -1; }
        if (v.t <= 0) { v.t = 0; v.dir = 1; }
        const x = v.a.x + (v.b.x - v.a.x) * v.t;
        const y = v.a.y + (v.b.y - v.a.y) * v.t;
        const iso = cartToIso(x, y);
        v.sprite.x = iso.x + this.worldOffset.x;
        v.bobPhase += delta * 0.006;
        v.sprite.y = iso.y + this.worldOffset.y + Math.sin(v.bobPhase) * 0.6;
        v.sprite.scaleX = v.dir > 0 ? 1 : -1;
      }
      v.sprite._sortY = v.sprite.y;
    }
  },
  // Sits on a low stool, mending boots. Idle 3-frame needle-pull loop.
  createEzra() {
    const iso = cartToIso(EZRA.cartX, EZRA.cartY);
    const ex = iso.x + this.worldOffset.x;
    const ey = iso.y + this.worldOffset.y;

    // Tiny workshop stoop behind him — a single weathered plank doorway.
    // Lives in the objectLayer with a _sortY just north of Ezra so it
    // depth-sorts BEHIND him (a fixed scene depth would paint over his
    // head — and the player's — whenever they stand in front of it).
    const shop = this.add.graphics();
    shop.fillStyle(0x3a2820, 1); shop.fillRect(ex - 14, ey - 38, 28, 22);
    shop.fillStyle(0x2a1a14, 1); shop.fillRect(ex - 14, ey - 16, 28, 4);
    shop.fillStyle(0x1a1014, 1); shop.fillRect(ex - 4, ey - 34, 8, 18); // dark doorway
    shop.fillStyle(0x4a3828, 1); shop.fillRect(ex - 14, ey - 38, 28, 2); // lintel
    // Workbench just to his left
    shop.fillStyle(0x6a4828, 1); shop.fillRect(ex - 22, ey - 6, 10, 4);
    shop.fillStyle(0x3a2818, 1); shop.fillRect(ex - 22, ey - 2, 2, 6);
    shop.fillRect(ex - 14, ey - 2, 2, 6);
    // Slightly-open drawer with a sliver of paper
    shop.fillStyle(0x2a1810, 1); shop.fillRect(ex - 21, ey - 5, 8, 2);
    shop.fillStyle(0xeae2c8, 1); shop.fillRect(ex - 19, ey - 4, 3, 1);
    shop._sortY = ey - 6;
    this.objectLayer.add(shop);

    const container = this.add.container(ex, ey);
    const g = this.add.graphics();
    container.add(g);
    container._sortY = ey;
    this.objectLayer.add(container);
    this.ezraSprite = container;
    this.ezraGfx = g;
    this.ezraFrame = 0;
    this.ezraFrameTimer = 0;

    this.drawEzraFrame(0);
  },
  // Hero-fidelity rebuild: the cobbler at his stool, hunched over the
  // boots that have waited eleven years. Round cap, wire-frame glasses,
  // scuffed leather apron. 3-frame needle-pull (steady hands, always).
  drawEzraFrame(frame) {
    const g = this.ezraGfx;
    if (!g) return;
    g.clear();
    const apron  = 0x6a4828, apronHi = 0x7e5832, apronLo = 0x54381e;
    const shirt  = 0xc8b88c, shirtLo = 0xa89870;
    const trous  = 0x3a3a40, trousHi = 0x4a4a52;
    const boot   = 0x2a1808, bootHi  = 0x4a2818;
    const skin   = 0xc8a184, skinHi  = 0xd8b394, skinLo = 0xb08a6a;
    const cap    = 0x4a3a2a, capHi   = 0x5c4836;
    const beard  = 0xe0dcc8, beardLo = 0xc4c0a8;
    const wire   = 0x8a8a92, lens    = 0xcfe0e0;
    const copper = 0xb8742c;
    const stool  = 0x4a3220, stoolLo = 0x2a1a10;
    const thread = 0xeae2c8;
    const px = (x, y, w, h, color, a = 1) => { g.fillStyle(color, a); g.fillRect(x, y, w, h); };

    // Needle travel: 3 positions, pulled up and out
    const pull = frame * 2;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 5, 20, 6);

    // Stool — low, worn smooth
    px(-7, 1, 14, 3, stool);
    px(-7, 1, 14, 1, 0x5e4028);            // seat sheen
    px(-6, 4, 2, 4, stoolLo); px(4, 4, 2, 4, stoolLo);
    // Awl resting against the stool leg
    px(7, 3, 1, 4, 0x8a8a92); px(7, 2, 1, 1, 0x6a4828);

    // Seated legs
    px(-6, -3, 4, 6, trous); px(2, -3, 4, 6, trous);
    px(-6, -3, 4, 1, trousHi); px(2, -3, 4, 1, trousHi);
    // His own shoes — mended, of course
    px(-7, 2, 5, 2, boot); px(2, 2, 5, 2, boot);
    px(-7, 2, 5, 1, bootHi, 0.6);

    // The boots-in-lap — the never-finished pair, treated like relics
    px(-7, -7, 6, 4, boot);
    px(1, -7, 6, 4, boot);
    px(-7, -8, 6, 1, bootHi);
    px(1, -8, 6, 1, bootHi);
    px(-6, -5, 2, 1, 0x1a0e04);            // sole line left
    px(2, -5, 2, 1, 0x1a0e04);             // sole line right
    // Copper wire wound at the left heel — recent, uncracked
    px(-6, -5, 1, 2, copper);
    px(-7, -4, 1, 1, copper, 0.8);

    // Leather apron — broad bib, strap, scuffs earned over decades
    px(-8, -17, 16, 12, apron);
    px(-8, -17, 16, 1, apronHi);
    px(-8, -6, 16, 1, apronLo);
    // Neck strap
    px(-2, -20, 1, 3, apronLo); px(1, -20, 1, 3, apronLo);
    // Pocket with the wire's old impression worn into the fabric
    px(-5, -11, 10, 4, apronLo, 0.55);
    px(-5, -11, 10, 1, apronHi, 0.5);
    px(2, -10, 2, 2, apronHi, 0.35);       // the impression — eleven years
    // Scuffs
    px(-6, -14, 2, 1, apronHi, 0.4); px(4, -9, 2, 1, apronHi, 0.4);

    // Shirt sleeves + collar peeking around the apron
    px(-3, -20, 6, 3, shirt);
    px(-3, -18, 6, 1, shirtLo);

    // Arms — hunched forward over the work
    px(-9, -15, 3, 7, shirt);              // left upper
    px(-9, -9, 3, 3, shirtLo);             // left forearm
    px(6, -15, 3, 7, shirt);               // right upper
    px(6, -9 - pull, 3, 3, shirtLo);       // right forearm rises with the pull
    // Hands — one steadies the boot, one draws the needle
    px(-8, -6, 3, 2, skin);
    px(6, -6 - pull, 3, 2, skin);
    px(7, -6 - pull, 1, 1, skinHi);

    // Needle + thread — the certainty of someone who never doubted
    const ny = -8 - pull;
    g.lineStyle(1, thread, 0.9);
    g.beginPath(); g.moveTo(4, -5); g.lineTo(8, ny); g.strokePath();
    px(8, ny - 2, 1, 3, 0xf4f0e0);
    px(8, ny - 2, 1, 1, 0xffffff);         // needle glint

    // Head — slightly bowed to the work
    px(-4, -28, 9, 8, skin);
    px(-4, -28, 9, 1, skinLo);
    px(-4, -22, 9, 1, skinLo);             // jaw shade
    px(-3, -27, 7, 1, skinHi);             // brow light

    // Round cap — soft crown, sits back on the head
    px(-5, -31, 11, 3, cap);
    px(-4, -32, 9, 1, capHi);
    px(-5, -28, 2, 1, cap);                // band left
    px(4, -28, 2, 1, cap);                 // band right
    px(0, -33, 1, 1, capHi);               // crown button

    // Wire-frame glasses — two thin rings, a bridge, temple arms
    g.lineStyle(1, wire, 0.95);
    g.strokeCircle(-2, -25, 1.8);
    g.strokeCircle(3, -25, 1.8);
    g.beginPath(); g.moveTo(0, -25); g.lineTo(1, -25); g.strokePath();   // bridge
    g.beginPath(); g.moveTo(-4, -25); g.lineTo(-5, -26); g.strokePath(); // temple
    // Lens glints
    px(-3, -26, 1, 1, lens, 0.8);
    px(2, -26, 1, 1, lens, 0.8);
    // Eyes behind the lenses — down at the work, gentle
    px(-2, -25, 1, 1, 0x2a1a10);
    px(3, -25, 1, 1, 0x2a1a10);

    // White fringe under the cap + short beard
    px(-5, -28, 1, 3, beard); px(5, -28, 1, 3, beard);
    px(-3, -22, 7, 2, beard);
    px(-2, -20, 5, 1, beardLo);
    // Faint smile inside the beard
    px(0, -21, 2, 1, 0x8a6a52);
  },
  updateEzra(time, delta) {
    if (!this.ezraSprite) return;
    // Schedule: he carries the boots inside after dusk
    const ezraIndoors = gameState.gameHour >= 20 || gameState.gameHour < 6;
    if (this.ezraSprite.visible === ezraIndoors) this.ezraSprite.setVisible(!ezraIndoors);
    // The needle rests during the noon silence
    if (typeof isTimeWindow === 'function' && isTimeWindow('noon')) return;
    this.ezraFrameTimer = (this.ezraFrameTimer || 0) + delta;
    // Slow needle pull: ~700ms per frame, 3-frame loop
    if (this.ezraFrameTimer > 700) {
      this.ezraFrameTimer = 0;
      this.ezraFrame = (this.ezraFrame + 1) % 3;
      this.drawEzraFrame(this.ezraFrame);
    }
  },
  // ── MARTA / THE IBBUR ─────────────────────────────────────────────
  // Daytime: Marta the herbalist, sorting bundles by a low table.
  // Dawn / dusk: an Ibbur (a wandering soul) speaks through her —
  // she sits very still, eyes half-closed, palms upturned on her knees.
  createMarta() {
    const iso = cartToIso(MARTA.cartX, MARTA.cartY);
    const mx = iso.x + this.worldOffset.x;
    const my = iso.y + this.worldOffset.y;

    // Drying shed behind her — a small lean-to with hanging herb bundles
    const shed = this.add.graphics();
    shed.fillStyle(0x2a1c14, 1); shed.fillRect(mx - 16, my - 40, 32, 24);
    shed.fillStyle(0x4a3220, 1); shed.fillRect(mx - 16, my - 40, 32, 2);
    shed.fillStyle(0x14100c, 1); shed.fillRect(mx - 16, my - 16, 32, 3);
    // Open front — dark interior
    shed.fillStyle(0x0e0a08, 1); shed.fillRect(mx - 12, my - 36, 24, 18);
    // Herb bundles hanging from a rail
    shed.fillStyle(0x3a4a26, 1);
    shed.fillRect(mx - 10, my - 34, 2, 6);
    shed.fillRect(mx - 4,  my - 34, 2, 7);
    shed.fillRect(mx + 2,  my - 34, 2, 5);
    shed.fillRect(mx + 8,  my - 34, 2, 6);
    // Bundle ties
    shed.fillStyle(0xc8a468, 1);
    shed.fillRect(mx - 10, my - 34, 2, 1);
    shed.fillRect(mx - 4,  my - 34, 2, 1);
    shed.fillRect(mx + 2,  my - 34, 2, 1);
    shed.fillRect(mx + 8,  my - 34, 2, 1);
    // objectLayer + _sortY so it depth-sorts behind Marta instead of
    // painting over her head (fixed scene depths float above everything)
    shed._sortY = my - 6;
    this.objectLayer.add(shed);

    // Low sorting table to her right
    const table = this.add.graphics();
    table.fillStyle(0x000000, 0.3); table.fillEllipse(mx + 14, my + 4, 18, 4);
    table.fillStyle(0x6a4828, 1); table.fillRect(mx + 6, my - 4, 16, 3);
    table.fillStyle(0x3a2818, 1);
    table.fillRect(mx + 7, my - 1, 2, 5);
    table.fillRect(mx + 19, my - 1, 2, 5);
    // Scattered herb bundles on the table
    table.fillStyle(0x4a5a26, 1);
    table.fillRect(mx + 9, my - 6, 4, 2);
    table.fillRect(mx + 14, my - 6, 4, 2);
    table.fillStyle(0xc8a468, 1);
    table.fillRect(mx + 9, my - 6, 4, 1);
    table.fillRect(mx + 14, my - 6, 4, 1);
    table._sortY = my + 4;
    this.objectLayer.add(table);

    const container = this.add.container(mx, my);
    const g = this.add.graphics();
    container.add(g);
    container._sortY = my;
    this.objectLayer.add(container);
    this.martaSprite = container;
    this.martaGfx = g;
    this.martaBreathPhase = 0;

    this.drawMartaFrame('marta', 0);
  },
  // Hero-fidelity rebuild. Daytime Marta: russet dress, orange-red
  // headscarf, hands sorting herbs — one arm rises with the breath.
  // Dawn/dusk Ibbur: the same body re-tinted to bruised silver, utterly
  // still, palms upturned, half-closed eyes lit faintly from inside,
  // with a shimmer of pale motes around the head.
  drawMartaFrame(persona, breath) {
    const g = this.martaGfx;
    if (!g) return;
    g.clear();
    const ib = persona === 'ibbur';
    // Palettes — russet + orange-red / bruised violet + silver
    const skirt   = ib ? 0x2a2036 : 0x6e3a22, skirtHi = ib ? 0x3a2e48 : 0x82462a;
    const skirtLo = ib ? 0x201828 : 0x582e1a;
    const apron   = ib ? 0x9a8aa8 : 0xd0c09a, apronLo = ib ? 0x7a6e8a : 0xb0a07e;
    const bodice  = ib ? 0x1a1422 : 0x4a2416, bodiceHi = ib ? 0x2a2234 : 0x5c2e1c;
    const yoke    = ib ? 0x8a8aa0 : 0xb03818, yokeHi  = ib ? 0xaaaac0 : 0xd04a20;
    const scarf   = ib ? 0x6a6080 : 0xc05a20, scarfHi = ib ? 0x8a80a0 : 0xd86a28;
    const scarfLo = ib ? 0x4a4060 : 0xa04818;
    const skin    = ib ? 0xb89a8a : 0xc4845a, skinLo = ib ? 0x9a8074 : 0xac744e;
    const herb    = 0x4a5a26, herbHi = 0x5e7032, herbDry = 0xc8a468;
    const grey    = 0x9a8a78;
    const px = (x, y, w, h, color, a = 1) => { g.fillStyle(color, a); g.fillRect(x, y, w, h); };
    const b = ib ? 0 : breath; // the Ibbur does not breathe visibly

    // Shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(0, 5, 20, 6);

    // Long seated skirt — folds fall to the ground
    px(-8, -4, 16, 9, skirt);
    px(-9, 3, 18, 3, skirt);
    px(-8, -4, 16, 1, skirtHi);
    px(-9, 5, 18, 1, skirtLo);
    // Fold lines
    px(-4, -2, 1, 7, skirtLo, 0.7); px(2, -2, 1, 7, skirtLo, 0.7);

    // Linen apron over the lap — herb-stained
    px(-6, -11, 12, 10, apron);
    px(-6, -2, 12, 1, apronLo);
    px(-2, -8, 2, 2, herb, 0.25);            // green stain
    px(3, -5, 1, 1, herbDry, 0.4);           // dried fleck
    // Lap cloth with sorted herbs (Marta only — the Ibbur sits empty-handed)
    if (!ib) {
      px(-5, -7, 4, 1, herbHi);
      px(-4, -6, 2, 1, herb);
      px(1, -7, 3, 1, herbDry);
    }

    // Bodice — dark wool, laced front
    px(-7, -18, 14, 8, bodice);
    px(-7, -18, 14, 1, bodiceHi);
    // Lacing
    px(0, -17, 1, 6, bodiceHi);
    px(-1, -16, 1, 1, yoke); px(1, -15, 1, 1, yoke); px(-1, -13, 1, 1, yoke);
    // Embroidered yoke band
    px(-7, -18, 14, 1, yoke);
    for (let i = -6; i <= 6; i += 3) px(i, -16, 1, 1, i % 2 ? yoke : yokeHi);

    // Arms
    if (ib) {
      // Palms upturned on the knees — perfectly symmetric, perfectly still
      px(-8, -16, 3, 8, bodice);
      px(5, -16, 3, 8, bodice);
      px(-8, -8, 3, 2, skin);
      px(5, -8, 3, 2, skin);
      px(-7, -7, 2, 1, skinLo);              // upturned palm shading
      px(6, -7, 2, 1, skinLo);
    } else {
      // Working arms — left steadies the lap, right lifts with the breath
      px(-8, -16, 3, 8, bodice);
      px(-8, -8, 3, 2, skin);
      px(5, -17 + b, 3, 7, bodice);
      px(5, -10 + b, 3, 2, skin);
      // Herb bundle in the lifted hand
      px(7, -12 + b, 4, 3, herb);
      px(7, -13 + b, 3, 1, herbHi);
      px(8, -9 + b, 2, 1, herbDry);
    }

    // Head
    px(-4, -27, 9, 8, skin);
    px(-4, -27, 9, 1, skinLo);
    px(-4, -21, 9, 1, skinLo);               // jaw shade
    // Loose strand of grey hair escaping the scarf
    px(-5, -26, 1, 3, grey);

    // Headscarf — tied behind, one tail over the shoulder
    px(-5, -30, 11, 4, scarf);
    px(-4, -31, 9, 1, scarfHi);
    px(-5, -27, 1, 1, scarf); px(5, -27, 1, 1, scarf);
    // Knot + tail
    px(5, -26, 2, 2, scarfLo);
    px(6, -24, 2, 4, scarf);
    px(6, -20, 1, 2, scarfLo);

    // Face
    if (ib) {
      // Half-closed slits, lit faintly from inside — someone else looking out
      px(-3, -24, 2, 1, 0x14101a);
      px(2, -24, 2, 1, 0x14101a);
      px(-3, -24, 2, 1, 0xffd890, 0.6);
      px(2, -24, 2, 1, 0xffd890, 0.6);
      // Still, level mouth
      px(-1, -21, 2, 1, 0x6a5a52);
      // The shimmer — pale motes drifting off the borrowed body
      g.fillStyle(0xd8d0f0, 0.5);
      g.fillCircle(-7, -29, 1);
      g.fillCircle(7, -26, 1);
      g.fillCircle(-6, -18, 0.8);
      g.fillCircle(8, -31, 0.8);
      g.fillStyle(0xd8d0f0, 0.25);
      g.fillCircle(0, -33, 1.2);
    } else {
      // Sharp dark eyes with catchlights — she misses nothing
      px(-3, -25, 2, 2, 0x14100a);
      px(2, -25, 2, 2, 0x14100a);
      px(-2, -25, 1, 1, 0xe8d8c0);
      px(3, -25, 1, 1, 0xe8d8c0);
      // Slight knowing mouth
      px(-1, -21, 3, 1, 0x8a4a34);
    }
  },
  updateMarta(time, delta) {
    if (!this.martaSprite) return;
    // Her hands still for the noon silence (sorting can wait; the custom can't)
    if (typeof isTimeWindow === 'function' && isTimeWindow('noon')) return;
    const ibbur = (typeof isTimeWindow === 'function')
      && (isTimeWindow('dawn') || isTimeWindow('dusk') || gameState.iburActive);
    const persona = ibbur ? 'ibbur' : 'marta';
    this.martaBreathPhase += delta * 0.0025;
    const breath = Math.floor((Math.sin(this.martaBreathPhase) * 0.5 + 0.5) * 2); // 0..1
    if (this._martaPersona !== persona || this._martaLastBreath !== breath) {
      this._martaPersona = persona;
      this._martaLastBreath = breath;
      this.drawMartaFrame(persona, breath);
    }

    // Proximity prompt + interaction
    const dx = this.playerCartX - MARTA.cartX;
    const dy = this.playerCartY - MARTA.cartY;
    const d = Math.hypot(dx, dy);
    const inRange = d <= MARTA.interactRadius;

    if (inRange && !this.dialogueActive && !this.visionActive
        && !this._domovoiSelectorOpen && !this._domovoiSpeaking
        && !this._martaSpeaking) {
      const iso = cartToIso(MARTA.cartX, MARTA.cartY);
      const px = iso.x + this.worldOffset.x;
      const py = iso.y + this.worldOffset.y - 40;
      this.interactPrompt.setText(ibbur ? '[E] Listen' : '[E] Talk to Marta');
      this.interactPrompt.setPosition(px - this.interactPrompt.width / 2, py);
      this.interactPrompt.setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        this.beginMartaInteraction(ibbur);
      }
    }
  },
  // ── Centred italic line delivery (mirrors speakDomovoi pattern) ───
  speakMarta(lines, ibbur) {
    if (this._martaSpeaking) return;
    this._martaSpeaking = true;
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height * 0.78;
    const colour = ibbur ? '#cfd0e8' : '#f0e6c8';
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        this._martaSpeaking = false;
        return;
      }
      const line = lines[i++];
      if (!line) { setTimeout(next, 1500); return; }
      const txt = this.add.text(cx, cy, line, {
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        fontSize: '18px',
        color: colour,
        align: 'center',
        wordWrap: { width: cam.width * 0.7 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
      this.tweens.add({
        targets: txt, alpha: 1, duration: 900,
        onComplete: () => {
          // Subtle SFX under each line
          if (ibbur) {
            // Ibbur — soft single bowl-tone
            if (ambientAudio.ctx) {
              const ctx = ambientAudio.ctx;
              const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 196;
              const gn = ctx.createGain(); gn.gain.value = 0;
              o.connect(gn); gn.connect(ctx.destination);
              const t = ctx.currentTime;
              gn.gain.linearRampToValueAtTime(0.05, t + 0.4);
              gn.gain.linearRampToValueAtTime(0,   t + 2.8);
              o.start(t); o.stop(t + 3);
            }
          } else if (this.playChimneyCrackle) {
            // Marta — quiet rustle (re-using chimney crackle for now)
            // intentionally skipped — Marta speaks plainly, no SFX
          }
          setTimeout(() => {
            this.tweens.add({
              targets: txt, alpha: 0, duration: 700,
              onComplete: () => { txt.destroy(); next(); }
            });
          }, 3800);
        }
      });
    };
    next();
  },
  // ── DZIADEK JÓZEF ──────────────────────────────────────────────────
  // Hidden until the player follows the LEFT wisp branch (the "truth"
  // path). Lives under a half-fallen dead tree on the north-eastern
  // edge of the map. Tiny lantern, hunched, very old. Carries one
  // burnt page of the Cure Codex.
  createDziadek() {
    const iso = cartToIso(DZIADEK.cartX, DZIADEK.cartY);
    const dx = iso.x + this.worldOffset.x;
    const dy = iso.y + this.worldOffset.y;

    // Dead tree behind him
    const tree = this.add.graphics();
    tree.fillStyle(0x000000, 0.35); tree.fillEllipse(dx + 6, dy + 4, 26, 6);
    tree.fillStyle(0x2a1c14, 1);
    tree.fillRect(dx + 2, dy - 38, 6, 42);
    // Snapped main branch leaning right
    tree.fillStyle(0x1a120c, 1);
    tree.fillRect(dx + 6, dy - 40, 16, 3);
    tree.fillRect(dx + 16, dy - 40, 3, -10);
    // Twigs
    tree.lineStyle(1, 0x1a120c, 1);
    tree.beginPath(); tree.moveTo(dx + 4,  dy - 38); tree.lineTo(dx - 4, dy - 46); tree.strokePath();
    tree.beginPath(); tree.moveTo(dx + 6,  dy - 32); tree.lineTo(dx + 14, dy - 38); tree.strokePath();
    tree.beginPath(); tree.moveTo(dx + 4,  dy - 26); tree.lineTo(dx - 6, dy - 28); tree.strokePath();
    tree._sortY = dy - 8;
    this.objectLayer.add(tree);

    const container = this.add.container(dx, dy);
    const g = this.add.graphics();
    container.add(g);
    container._sortY = dy;
    this.objectLayer.add(container);
    this.dziadekSprite = container;
    this.dziadekGfx = g;
    this.dziadekBreathPhase = 0;
    container.setVisible(false);
    if (tree) tree.setVisible(false);
    this.dziadekTreeGfx = tree;

    this.drawDziadekFrame(0);
  },
  // Hero-fidelity rebuild: the old man under the dead tree. Flat cap,
  // navy vest over an ash coat, long white beard, walking stick planted
  // at his side, lantern breathing in the other hand. He has been
  // standing there longer than anyone asks about.
  drawDziadekFrame(breath) {
    const g = this.dziadekGfx;
    if (!g) return;
    g.clear();
    const coat  = 0x4a4438, coatHi = 0x585244, coatLo = 0x2e2820;
    const vest  = 0x2a3a52, vestHi = 0x364a66, vestLo = 0x1e2c40;
    const cap   = 0x32302a, capHi  = 0x403c34;
    const trous = 0x2a2418, boot   = 0x14100a;
    const skin  = 0xb89878, skinLo = 0x9c7e62;
    const beard = 0xe8e2d0, beardLo = 0xccc6b0;
    const stick = 0x6a4828, stickHi = 0x7e5832;
    const px = (x, y, w, h, color, a = 1) => { g.fillStyle(color, a); g.fillRect(x, y, w, h); };

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 5, 18, 5);

    // Hunched legs in patched trousers, boot tips
    px(-4, -2, 3, 8, trous); px(1, -2, 3, 8, trous);
    px(-3, 2, 1, 2, 0x3a3426, 0.8);          // patch
    px(-4, 5, 3, 2, boot); px(1, 5, 3, 2, boot);

    // Long ash coat, worn to the weather
    px(-8, -17, 16, 16, coat);
    px(-8, -17, 16, 1, coatHi);
    px(-8, -2, 16, 1, coatLo);
    px(-7, -10, 1, 8, coatLo, 0.6);          // hang crease

    // Navy wool vest over the coat front — buttoned once, at the top
    px(-5, -17, 10, 9, vest);
    px(-5, -17, 10, 1, vestHi);
    px(-5, -9, 10, 1, vestLo);
    px(0, -16, 1, 7, vestLo);                // vest opening
    px(-1, -15, 1, 1, 0x9a9a8a);             // the one button he still does up

    // Hunched shoulders — narrower than the coat
    px(-7, -20, 14, 4, coat);
    px(-7, -20, 14, 1, coatHi);

    // Left arm resting on the walking stick, planted wide
    px(-8, -17, 3, 8, coat);
    px(-9, -9, 3, 2, skin);
    // The stick — taller than his bent back, worn smooth at the grip
    px(-10, -12, 2, 18, stick);
    px(-10, -12, 1, 18, stickHi);
    px(-11, -13, 4, 2, stick);               // crook grip
    px(-10, 5, 2, 1, 0x4a3018);              // earth-darkened tip

    // Right arm — lantern hand, rises with the slow breath
    px(6, -17 + breath, 3, 8, coat);
    px(6, -10 + breath, 3, 2, skin);

    // Lantern
    const ly = -7 + breath;
    px(8, ly, 5, 1, stick);                  // top loop bar
    px(8, ly + 1, 5, 7, 0x3a2818);           // frame
    px(9, ly + 2, 3, 5, 0xffd890, 0.95);     // candle glow
    px(9, ly + 2, 1, 1, 0xfff4cc);           // hot spot
    // Halo
    g.fillStyle(0xffd890, 0.18); g.fillCircle(10, ly + 4, 7);
    g.fillStyle(0xffd890, 0.08); g.fillCircle(10, ly + 4, 13);

    // Head — bowed under the cap
    px(-4, -27, 9, 7, skin);
    px(-4, -27, 9, 1, skinLo);
    px(-4, -21, 9, 1, skinLo);

    // Flat cap — low brim shading the eyes
    px(-6, -30, 12, 3, cap);
    px(-5, -31, 10, 1, capHi);
    px(-6, -27, 13, 1, capHi);               // brim, tilted forward
    px(4, -30, 2, 1, capHi, 0.6);            // crown crease

    // Long white hair below the cap + full beard
    px(-5, -26, 1, 5, beard); px(5, -26, 1, 5, beard);
    px(-5, -25, 1, 3, beardLo, 0.8);
    px(-3, -21, 7, 4, beard);                // beard mass
    px(-2, -17, 5, 2, beard);                // beard length
    px(-1, -15, 3, 1, beardLo);              // tapering end
    px(-3, -20, 1, 2, beardLo);              // beard shading

    // Eyes — almost closed, two thin lines under the brim
    px(-3, -24, 2, 1, 0x2a1810);
    px(2, -24, 2, 1, 0x2a1810);
    // The tear-like glint under the right eye — never explained
    px(3, -23, 1, 1, 0xc8d8e8, 0.55);
  },
  updateDziadek(time, delta) {
    if (!this.dziadekSprite) return;
    // Reveal once the player has chosen the "truth" wisp branch
    const ds = gameState.dziadekState;
    if (!ds.revealed && gameState.ritualState
        && gameState.ritualState.wisp_choice === 'truth') {
      ds.revealed = true;
      this.dziadekSprite.setVisible(true);
      this.dziadekSprite.setAlpha(0);
      if (this.dziadekTreeGfx) {
        this.dziadekTreeGfx.setVisible(true);
        this.dziadekTreeGfx.setAlpha(0);
        this.tweens.add({ targets: this.dziadekTreeGfx, alpha: 1, duration: 1800 });
      }
      this.tweens.add({ targets: this.dziadekSprite, alpha: 1, duration: 1800 });
    }
    if (!ds.revealed) return;

    // Slow lantern-arm breath
    this.dziadekBreathPhase += delta * 0.0018;
    const breath = Math.floor((Math.sin(this.dziadekBreathPhase) * 0.5 + 0.5) * 2);
    if (this._dziadekLastBreath !== breath) {
      this._dziadekLastBreath = breath;
      this.drawDziadekFrame(breath);
    }

    // Proximity prompt + interaction
    const px = this.playerCartX, py = this.playerCartY;
    const d = Math.hypot(px - DZIADEK.cartX, py - DZIADEK.cartY);
    if (d <= DZIADEK.interactRadius && !this.dialogueActive && !this.visionActive
        && !this._domovoiSelectorOpen && !this._domovoiSpeaking
        && !this._martaSpeaking && !this._dziadekSpeaking) {
      const iso = cartToIso(DZIADEK.cartX, DZIADEK.cartY);
      const sx = iso.x + this.worldOffset.x;
      const sy = iso.y + this.worldOffset.y - 44;
      this.interactPrompt.setText('[E] Speak with the old man');
      this.interactPrompt.setPosition(sx - this.interactPrompt.width / 2, sy);
      this.interactPrompt.setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactPrompt.setVisible(false);
        this.beginDziadekInteraction();
      }
    }
  },
  beginDziadekInteraction() {
    const ds = gameState.dziadekState;
    const lines = [];
    if (ds.sceneShown === 0) {
      ds.sceneShown = 1;
      lines.push(
        "(He doesn't look up. The lantern doesn't flicker.)",
        "So the lights brought you the long way. Good. The short way is for forgetting.",
        "I'm Józef. Once I taught children to read in this village. Then the Regency taught them to forget what they had read.",
        "I have one page left of a book that doesn't exist. It is half-burnt and entirely true.",
        "Come back when your hand stops trembling. I won't be hard to find — I am the only thing here that hasn't moved in nine years."
      );
    } else if (ds.sceneShown === 1 && !ds.pageGiven) {
      ds.sceneShown = 2;
      ds.pageGiven = true;
      gameState.inventory.push('codex_page_burnt');
      lines.push(
        "Steadier. Good.",
        "Take this. Don't read it where there are walls — walls in Wyrdów have been taught to remember faces.",
        "(He pulls a folded square of brittle paper from his coat. The edge is charcoal.)",
        "It names a thing the Regency renamed. The old name still works. The new name does not.",
        "If the Wellness Officer asks you what you carry, tell him: a recipe for tea. He will write it down and forget it within the hour."
      );
      this.showItemNotification('Picked up: Burnt Codex Page');
      if (!gameState.regencyFired.codex_page_received) {
        gameState.regencyFired.codex_page_received = true;
        if (typeof adjustAttention === 'function') adjustAttention(-2, 'codex_page_received');
      }
    } else {
      ds.sceneShown = 3;
      lines.push(
        "(The lantern dips, just slightly. He is smiling — or the wind is.)",
        "Go on. The path back is easier than the path here. It always is.",
        "And — child — when the bell rings at noon, stand still. Let it find you."
      );
    }
    this.speakDziadek(lines);
  },
  speakDziadek(lines) {
    if (this._dziadekSpeaking) return;
    this._dziadekSpeaking = true;
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height * 0.78;
    let i = 0;
    const next = () => {
      if (i >= lines.length) { this._dziadekSpeaking = false; return; }
      const line = lines[i++];
      if (!line) { setTimeout(next, 1500); return; }
      const txt = this.add.text(cx, cy, line, {
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        fontSize: '18px',
        color: '#f0d8a0',
        align: 'center',
        wordWrap: { width: cam.width * 0.7 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
      // Soft lantern-warm undertone
      if (ambientAudio.ctx) {
        const ctx = ambientAudio.ctx;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 147;
        const gn = ctx.createGain(); gn.gain.value = 0;
        o.connect(gn); gn.connect(ctx.destination);
        const t = ctx.currentTime;
        gn.gain.linearRampToValueAtTime(0.035, t + 0.5);
        gn.gain.linearRampToValueAtTime(0,    t + 3.0);
        o.start(t); o.stop(t + 3.2);
      }
      this.tweens.add({
        targets: txt, alpha: 1, duration: 900,
        onComplete: () => {
          setTimeout(() => {
            this.tweens.add({
              targets: txt, alpha: 0, duration: 700,
              onComplete: () => { txt.destroy(); next(); }
            });
          }, 4000);
        }
      });
    };
    next();
  },
  createPlayer() {
    // Begin at the first tile of the north-western road (a brown dirt tile)
    this.playerCartX = 0.5;
    this.playerCartY = CENTER - 0.5;
    const container = this.add.container(0, 0);

    // We'll redraw the player each frame for animation
    this.playerGfx = this.add.graphics();
    container.add(this.playerGfx);
    this.playerSprite = container;
    this.objectLayer.add(this.playerSprite);

    this.drawPlayerFrame(0, 'se');

    // Idle / reaction animation state
    this.idleTimer = 0;
    this.idleHeadOffset = 0;     // -2..2 horizontal eye offset
    this.idleAnimActive = false;
    this.playerFxOffsetX = 0;
    this.playerFxOffsetY = 0;
  },
  // 2-frame stumble — 3px down then back up over 0.3s
  triggerPlayerStumble() {
    if (!this.playerSprite) return;
    this.tweens.add({
      targets: this, playerFxOffsetY: 3, duration: 150, ease: 'Sine.easeIn',
      yoyo: true,
    });
  },
  // Horizontal shake — 3 left, 3 right, 2 left, center over 0.5s
  triggerPlayerShake() {
    if (!this.playerSprite) return;
    const seq = [
      { x: -3, d: 100 },
      { x:  3, d: 130 },
      { x: -2, d: 130 },
      { x:  0, d: 140 },
    ];
    let i = 0;
    const next = () => {
      if (i >= seq.length) return;
      const s = seq[i++];
      this.tweens.add({
        targets: this, playerFxOffsetX: s.x, duration: s.d, ease: 'Sine.easeInOut',
        onComplete: next,
      });
    };
    next();
  },
  // ── PLAYER SPRITE — folk-influenced wanderer (~24×48 px) ──────
  // Direction mapping (iso): se=south(front), nw=north(back),
  // ne=east(right profile), sw=west(left profile).
  // Walk cycle: 4 frames driven by `bob`. Idle: 2-frame breathing.
  drawPlayerFrame(bob, facing) {
    const g = this.playerGfx;
    g.clear();

    // ── Strict palette ──
    const C = {
      linen:    0xe8dfc0,
      vest:     0x3d2e1e,
      vestHi:   0x4d3a26,  // worn highlight
      vestLo:   0x2a1f14,
      red:      0x8b2020,
      gold:     0xa07830,
      trouser:  0x3d4a2e,
      trouserLo:0x2a3320,
      boot:     0x2a1a0e,
      bootHi:   0x40281a,
      blue:     0x4a6b8a,
      skin:     0xc4845a,
      skinHi:   0xd89a72,
      skinLo:   0x8a5a3a,
      hair:     0x1a0e08,
      bone:     0xc8b888,
      copper:   0xa86838,
      mark:     0xffb347,
      pouch:    0x1c1410,
    };

    // Direction
    const isSouth = facing === 'se';
    const isNorth = facing === 'nw';
    const isEast  = facing === 'ne';
    const isWest  = facing === 'sw';
    const profile = isEast || isWest;
    const flip = isWest ? -1 : 1; // mirror west using negative scale on x

    // Walk frame: 0..3
    const walking = !!this.isWalking;
    const frame = walking ? Math.floor(bob * 6) % 4 : 0;
    // legSwing: -2,0,+2,0 over the cycle
    const legSeq = [-2, 0, 2, 0];
    const legSwing = walking ? legSeq[frame] : 0;
    // Arm swing — left arm swings more than right (right protects the mark)
    const armL = walking ? legSeq[frame] : 0;
    const armR = walking ? legSeq[(frame + 2) % 4] * 0.5 : 0;

    // Idle breathing (2-frame, 3s cycle): tiny chest rise
    let breath = 0;
    if (!walking && this.animTime != null) {
      breath = Math.sin(this.animTime * (2 * Math.PI / 3000)) > 0 ? 0 : -1;
    }

    // Helper for crisp 1px rect
    const px = (x, y, w, h, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillRect(Math.round(x * flip - (flip < 0 ? w : 0)), Math.round(y), w, h);
    };

    // ── SHADOW ─────────────────────────────────────────────────
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 6, 18, 6);

    // ── BOOTS (knee-high, dark brown) ──────────────────────────
    // Left and right boot — apply opposite vertical phase for walk
    const lbY = -2 + Math.max(0, legSwing);  // left foot
    const rbY = -2 - Math.min(0, legSwing);  // right foot
    // Boot shafts (knee-high)
    px(-5, lbY - 12, 4, 14, C.boot);
    px( 1, rbY - 12, 4, 14, C.boot);
    // Boot toe caps
    px(-5, lbY + 1, 4, 2, C.bootHi);
    px( 1, rbY + 1, 4, 2, C.bootHi);
    // Sole
    px(-6, lbY + 3, 5, 1, 0x000000);
    px( 0, rbY + 3, 5, 1, 0x000000);
    // Worn scuff at toe
    px(-2, lbY + 2, 1, 1, 0x1a0a04);
    px( 4, rbY + 2, 1, 1, 0x1a0a04);
    // Blue thread charm — wound twice around the LEFT boot ankle
    // (a single blue pixel line, barely visible but there)
    px(-5, lbY - 3, 4, 1, C.blue);
    px(-5, lbY - 1, 4, 1, C.blue);

    // ── TROUSERS (moss green, tucked into boots) ───────────────
    // Visible portion above boots up to belt at y ~ -14
    const trouserTop = -14;
    const trouserBot = -3;
    px(-5, trouserTop, 4, trouserBot - trouserTop, C.trouser);
    px( 1, trouserTop, 4, trouserBot - trouserTop, C.trouser);
    // Inner shadow
    px(-2, trouserTop, 1, trouserBot - trouserTop, C.trouserLo);
    px( 1, trouserTop, 1, trouserBot - trouserTop, C.trouserLo);

    // ── BELT (thin leather + simple buckle) ────────────────────
    px(-6, -15, 12, 2, 0x1a0e06);
    // Buckle
    px(-1, -15, 2, 2, C.copper);
    px(-1, -15, 1, 1, 0xd89048);

    // ── VEST / JERKIN (charcoal-brown, the carrier of folk detail)
    // Body region: y -28 (top of shoulder) to -14 (top of belt)
    // Width: -7 to +7
    const vestTop = -28 + breath;
    const vestBot = -14;
    const vestL = -7, vestR = 7;
    // Fill body
    for (let y = vestTop; y < vestBot; y++) {
      px(vestL, y, (vestR - vestL), 1, C.vest);
    }
    // Worn highlight at shoulders
    px(-7, vestTop, 3, 1, C.vestHi);
    px( 4, vestTop, 3, 1, C.vestHi);
    // Worn elbow patches (sides)
    px(-7, -22, 1, 3, C.vestHi, 0.7);
    px( 6, -22, 1, 3, C.vestHi, 0.7);
    // Center seam (front/back)
    px(0, vestTop, 1, vestBot - vestTop, C.vestLo);
    // Mended patch on the LEFT shoulder (slightly different fabric)
    if (!isNorth) {
      px(-6, vestTop + 1, 3, 2, 0x4a3a2a);
      px(-5, vestTop + 1, 1, 1, 0x5a4a36);
    } else {
      // From behind, show patch on opposite side
      px(3, vestTop + 1, 3, 2, 0x4a3a2a);
    }

    // ── EMBROIDERED BORDER ─────────────────────────────────────
    // Wycinanki-inspired diamond + cross motifs in red & gold.
    // South: full front border down both edges + collar trim.
    // East/West: leading-edge stripe.
    // North: back collar trim only.
    const drawMotif = (x, y) => {
      // 3-pixel diamond with gold center
      px(x,     y,     1, 1, C.red);
      px(x - 1, y + 1, 3, 1, C.red);
      px(x,     y + 1, 1, 1, C.gold);
      px(x,     y + 2, 1, 1, C.red);
    };
    if (isSouth) {
      // Twin vertical borders down the front edges
      px(-6, vestTop + 1, 1, vestBot - vestTop - 1, C.red);
      px( 5, vestTop + 1, 1, vestBot - vestTop - 1, C.red);
      // Repeating motifs along each border
      [-21, -18].forEach(y => { drawMotif(-6, y); drawMotif(5, y); });
      // Collar trim — single pixel line across the top
      px(-3, vestTop, 6, 1, C.red);
      px( 0, vestTop, 1, 1, C.gold);
    } else if (isNorth) {
      // Back collar trim
      px(-3, vestTop, 6, 1, C.red);
      px( 0, vestTop, 1, 1, C.gold);
      // Faint side hints
      px(-6, vestTop + 1, 1, 4, C.red, 0.7);
      px( 5, vestTop + 1, 1, 4, C.red, 0.7);
    } else {
      // Profile — leading-edge stripe (the side facing the camera-front)
      // (East/West face same way visually due to flip)
      px(-6, vestTop + 1, 1, vestBot - vestTop - 1, C.red);
      drawMotif(-6, -21);
      drawMotif(-6, -18);
      px(-3, vestTop, 4, 1, C.red);
    }

    // ── BUTTONS / TOGGLES (bone or copper) ─────────────────────
    if (isSouth) {
      px(-1, -24, 1, 1, C.bone);
      px(-1, -20, 1, 1, C.copper);
    }

    // ── LINEN SHIRT — visible at collar and cuffs only ─────────
    // Open collar with one missing button
    px(-2, vestTop, 4, 1, C.linen);
    px(-2, vestTop + 1, 1, 1, C.linen);
    if (isSouth) {
      // Tiny gap where the missing button would sit
      px(0, vestTop + 1, 1, 1, C.linen);
    }
    // Rolled cuffs at mid-forearm — drawn with the arms below

    // ── ARMS ───────────────────────────────────────────────────
    // Arm shafts (vest sleeves) end at mid-forearm where the
    // linen cuff is rolled.
    // Left arm
    const lArmX = -10, rArmX = 7;
    const lArmTop = -26 + armL * 0;        // shoulder anchor
    const rArmTop = -26 + armR * 0;
    // Vest sleeve
    px(lArmX, lArmTop, 3, 8 + armL, C.vest);
    px(rArmX, rArmTop, 3, 8 + armR, C.vest);
    // Sleeve shadow
    px(lArmX, lArmTop, 1, 8 + armL, C.vestLo);
    px(rArmX + 2, rArmTop, 1, 8 + armR, C.vestLo);
    // Rolled linen cuff
    px(lArmX, lArmTop + 8 + armL, 3, 1, C.linen);
    px(rArmX, rArmTop + 8 + armR, 3, 1, C.linen);
    // Forearm (skin)
    px(lArmX, lArmTop + 9 + armL, 3, 3, C.skin);
    px(rArmX, rArmTop + 9 + armR, 3, 3, C.skin);
    // Forearm shading
    px(lArmX, lArmTop + 11 + armL, 3, 1, C.skinLo);
    px(rArmX, rArmTop + 11 + armR, 3, 1, C.skinLo);
    // Hands
    const lHandY = lArmTop + 12 + armL;
    const rHandY = rArmTop + 12 + armR + 1; // right hand sits slightly lower
    px(lArmX, lHandY, 3, 2, C.skin);
    px(rArmX, rHandY, 3, 2, C.skin);

    // ── BELT POUCH on the right side ───────────────────────────
    if (!isNorth) {
      px(4, -13, 3, 4, C.pouch);
      px(4, -13, 1, 1, 0x2c241a);
      px(5, -10, 1, 1, 0x2c241a);
    }

    // ── HEAD ───────────────────────────────────────────────────
    const headY = -32 + breath;
    // Skin — slightly squarer than circle for pixel feel
    g.fillStyle(C.skin, 1);
    g.fillRect(-4, headY, 8, 7);
    g.fillRect(-3, headY - 1, 6, 1);
    g.fillRect(-3, headY + 7, 6, 1);
    // Cheek shading
    px(-4, headY + 4, 1, 2, C.skinLo);
    px( 3, headY + 4, 1, 2, C.skinLo);
    // Highlight
    px(-2, headY + 1, 1, 1, C.skinHi);

    // Eyes / face features
    if (isSouth) {
      const eyeOff = (this.idleHeadOffset || 0);
      px(-2 + eyeOff, headY + 3, 1, 1, 0x1a1006);
      px( 1 + eyeOff, headY + 3, 1, 1, 0x1a1006);
      // Mouth — small line
      px(-1, headY + 5, 2, 1, 0x5a3018);
    } else if (isNorth) {
      // No face — back of head
    } else {
      // Profile: one eye visible
      px(1, headY + 3, 1, 1, 0x1a1006);
      px(1, headY + 5, 1, 1, 0x5a3018);
    }

    // ── HAIR — dark, slightly disheveled, longer than neat ─────
    // Top mass
    const hairTopY = headY - 2 + (breath < 0 ? -1 : 0); // 1px shift on top strand
    px(-4, hairTopY, 8, 2, C.hair);
    px(-5, headY - 1, 1, 3, C.hair);
    px( 4, headY - 1, 1, 3, C.hair);
    // Side strands fall slightly below ear
    if (!isNorth) {
      px(-5, headY + 2, 1, 3, C.hair);
      px( 4, headY + 2, 1, 3, C.hair);
    } else {
      // Back of head — fuller hair coverage
      px(-4, headY + 1, 8, 4, C.hair);
    }
    // Stray strand (the one that shifts in idle)
    px(-2, hairTopY - 1, 2, 1, C.hair);

    // ── MARK GLOW on the right hand ────────────────────────────
    // Persistent subtle amber aura, pulses near significant places.
    const gl = this.handGlowLevel || 0;
    // Persistent base after awakening (gl >= 0)
    const baseAlpha = 0.35 + gl * 0.06;
    // Slow pulse using animTime so it works while idle
    const t = (this.animTime || 0) * 0.001;
    const pulse = Math.sin(t * 1.6) * 0.5 + 0.5; // 0..1
    // Proximity boost
    const boost = (this._markProximityBoost || 0); // 0..1
    const alpha = Math.min(1, baseAlpha + pulse * 0.12 + boost * 0.25);
    // Soft 4-5px aura around right hand
    const ghx = (rArmX + 1);
    const ghy = rHandY;
    g.fillStyle(C.mark, alpha * 0.35);
    g.fillCircle(ghx * flip, ghy + 1, 6 + boost * 2);
    g.fillStyle(C.mark, alpha * 0.6);
    g.fillCircle(ghx * flip, ghy + 1, 3.5);
    g.fillStyle(0xfff0c0, alpha * 0.9);
    g.fillRect(ghx * flip, ghy, 1, 1);
  },
  // ── STEP 1: Zuzka closing animation ───────────────────────────────
  playZuzkaClosingBeat(onComplete) {
    const z = this.zuzkaSprite;
    if (!z) { onComplete && onComplete(); return; }
    const scene = this;
    // 1) Slow head-turn toward entry road (NW): tiny x nudge as a stand-in
    this.tweens.add({
      targets: z, x: z.x - 2, duration: 900, ease: 'Sine.easeInOut',
      onComplete: () => {
        // 2) Look at the player — hold 2s (no movement, just a pause)
        setTimeout(() => {
          // 3) Look down at the jar + screw the lid (small dip)
          scene.tweens.add({
            targets: z, y: z.y + 2, duration: 500, yoyo: true, ease: 'Sine.easeInOut',
            onComplete: () => {
              // 4) Walk to Baba's house at 60% speed, no looking back
              const tgt = cartToIso(BABA.cartX - 0.5, BABA.cartY + 0.5);
              const tx = tgt.x + scene.worldOffset.x;
              const ty = tgt.y + scene.worldOffset.y;
              const dist = Math.hypot(tx - z.x, ty - z.y);
              const dur = Math.max(2400, dist * 18); // ~60% of normal
              scene.tweens.add({
                targets: z, x: tx, y: ty, duration: dur, ease: 'Linear',
                onUpdate: () => { z._sortY = z.y; scene.zuzkaBaseY = z.y; },
                onComplete: () => {
                  // She slips inside — fade out
                  scene.tweens.add({
                    targets: z, alpha: 0, duration: 800,
                    onComplete: () => { z.setVisible(false); onComplete && onComplete(); },
                  });
                },
              });
            },
          });
        }, 2000);
      },
    });
  },
  updatePlayerPosition() {
    const iso = cartToIso(this.playerCartX, this.playerCartY);
    this.playerSprite.x = iso.x + this.worldOffset.x + (this.playerFxOffsetX || 0);
    this.playerSprite.y = iso.y + this.worldOffset.y + (this.playerFxOffsetY || 0);
    this.playerSprite._sortY = this.playerSprite.y;
  },
  // ── ZUZKA: auto-approach the player on their first village entry ──
  checkZuzkaAutoApproach() {
    if (gameState.firstVillageEntry) return;
    if (this._zuzkaApproaching || this._zuzkaApproachQueued) return;
    if (!this.zuzkaSprite || this.dialogueActive) return;
    // Don't start walking toward a player who is reading the journal or
    // sitting in the pause menu — the approach used to complete under
    // the overlay and open her dialogue invisibly
    if (this._paused || this._pauseLayer || this._cutsceneActive) return;

    // Trigger threshold: player has crossed inward — within 8 tiles of
    // the idol but not yet inside Zuzka's interact radius.
    const px = this.playerCartX, py = this.playerCartY;
    const distIdol = Math.hypot(px - ZUZKA.cartX, py - ZUZKA.cartY);
    if (distIdol > 8 || distIdol < ZUZKA.interactRadius + 0.2) return;

    this._zuzkaApproachQueued = true;
    this.triggerZuzkaApproach();
  },
  triggerZuzkaApproach() {
    if (this._zuzkaApproaching) return;
    this._zuzkaApproaching = true;

    // Target: a point 2 tiles toward the idol from the player's current
    // position — i.e. she stops 2 tiles in front of where the player is now.
    const px = this.playerCartX, py = this.playerCartY;
    const vx = ZUZKA.cartX - px, vy = ZUZKA.cartY - py;
    const len = Math.max(0.0001, Math.hypot(vx, vy));
    const stopDist = 2.0;
    const tgtCart = {
      x: px + (vx / len) * stopDist,
      y: py + (vy / len) * stopDist,
    };
    const tgtIso = cartToIso(tgtCart.x, tgtCart.y);
    const tx = tgtIso.x + this.worldOffset.x;
    const ty = tgtIso.y + this.worldOffset.y;

    // Remember her base anchor so we can restore the idle bob afterwards.
    this._zuzkaApproachOrigin = { x: this.zuzkaSprite.x, y: this.zuzkaSprite.y };

    this._zuzkaApproachTween = this.tweens.add({
      targets: this.zuzkaSprite,
      x: tx,
      y: ty,
      duration: 2000,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (this.zuzkaSprite) {
          this.zuzkaSprite._sortY = this.zuzkaSprite.y;
          this.zuzkaBaseY = this.zuzkaSprite.y;
        }
      },
      onComplete: () => {
        if (!this._zuzkaApproaching) return;
        // If another dialogue/overlay owns the screen when she arrives,
        // wait for it — openDialogue silently drops swallowed calls,
        // which used to strand her mid-map with flags stuck
        const zuzkaOpenWhenClear = () => {
          if (!this._zuzkaApproaching) return;
          if (this.dialogueActive || this.visionActive || this._paused
            || this._pauseLayer || this._cutsceneActive) {
            this.time.delayedCall(600, zuzkaOpenWhenClear);
            return;
          }
          this._zuzkaStartFirstEncounter();
        };
        zuzkaOpenWhenClear();
      },
    });
  },
  // Called by handleInteraction when the player reaches Zuzka before her
  // approach completes. Cancels the tween and lets the normal E flow run.
  cancelZuzkaApproach() {
    if (!this._zuzkaApproaching && !this._zuzkaApproachQueued) return;
    if (this._zuzkaApproachTween) {
      this._zuzkaApproachTween.stop();
      this._zuzkaApproachTween = null;
    }
    this._zuzkaApproaching = false;
    this._zuzkaApproachQueued = false;
    // Snap her back to the idol base so the player's E press talks to her there
    if (this.zuzkaSprite && this._zuzkaApproachOrigin) {
      this.zuzkaSprite.x = this._zuzkaApproachOrigin.x;
      this.zuzkaSprite.y = this._zuzkaApproachOrigin.y;
      this.zuzkaSprite._sortY = this.zuzkaSprite.y;
      this.zuzkaBaseY = this.zuzkaSprite.y;
    }
  },
  approachMartaLoudly() {
    if (gameState.regencyFired.marta_loud_midday) return;
    if (!this.isNoon || !this.isNoon()) return;
    gameState.regencyFired.marta_loud_midday = true;
    adjustAttention(+1, 'marta_loud_midday');
  },
});
