/* ================================================================
   Bean x Bosh – Road to the 2026 RBA Finals
   NBA Jam style hoops | Phaser 3
   ================================================================ */

// ── World constants ───────────────────────────────────────────────
const GW       = 800;
const GH       = 450;
const FLOOR    = 355;   // y at player feet
const RIM_Y    = 208;   // y of rim opening
const RIM_L    = 96;    // x of left rim (player team shoots here ← not their basket)
const RIM_R    = 704;   // x of right rim
const BB_L     = 36;    // left backboard x
const BB_R     = 764;   // right backboard x

const GRAV       = 1420;
const JUMP_VY    = -610;
const SPD        = 215;
const TURBO_SPD  = 345;
const DUNK_RANGE = 96;   // max dist from rim to dunk
const THREE_LINE = 220;  // px from rim = 3-pointer

const QUARTER_SECS = 90;
const NUM_QUARTERS = 2;

// CPU team attacks LEFT basket (RIM_L); player team attacks RIGHT basket (RIM_R)
// "player's basket" = RIM_R, "cpu's basket" = RIM_L

const TEAMS = [
  { name: 'STREET HEAT',  c1: 0xff3300, c2: 0xff8800, diff: 0.70 },
  { name: 'COLD BLOODED', c1: 0x0055ff, c2: 0x00ccff, diff: 1.00 },
  { name: 'PURPLE REIGN', c1: 0x8800cc, c2: 0xff44ee, diff: 1.30 },
  { name: 'RBA ELITE',    c1: 0x990000, c2: 0xffdd00, diff: 1.65 },
];

const SHOUTS = [
  { trigger: 'score',    msgs: ['GOOD!', 'NICE SHOT!', 'MONEY!', 'COUNT IT!'] },
  { trigger: 'three',    msgs: ['FROM DOWNTOWN!', 'DEEP!', 'SPLASH!'] },
  { trigger: 'dunk',     msgs: ['BOOM SHAKALAKA!', 'OH BABY!', 'RATTLE AND ROLL!'] },
  { trigger: 'fire',     msgs: ["HE'S ON FIRE!", 'IS IT HOT IN HERE?!', 'BURNIN\'!'] },
  { trigger: 'steal',    msgs: ['STOLEN!', 'PICKPOCKET!', 'NICE HANDS!'] },
  { trigger: 'miss',     msgs: ['NO GOOD!', 'BRICK!', 'AIRBALL!'] },
];

// Shared state across scenes
const GS = {
  round: 0,          // 0-3 tournament round index
  roundWins: 0,
  playerFire: false,
  cpuFire: false,
};

// ================================================================
// ASSET BUILDER
// ================================================================
const Assets = {
  build(scene) {
    this.court(scene);
    this.ball(scene);
    this.hoops(scene);
    this.players(scene);
    this.particles(scene);
    this.uiPieces(scene);
  },

  court(scene) {
    const g = scene.make.graphics({ add: false });

    // Sky / crowd BG
    g.fillGradientStyle(0x1a0033, 0x1a0033, 0x330066, 0x330066, 1);
    g.fillRect(0, 0, GW, 90);

    // Crowd blocks (simple pixel crowd)
    const crowdColors = [0xcc2200, 0x0044cc, 0x228800, 0xcc8800, 0x880088, 0xffffff];
    for (let i = 0; i < 120; i++) {
      const cx2 = (i * 47 + 23) % GW;
      const cy = 10 + (i % 5) * 14;
      const col = crowdColors[i % crowdColors.length];
      g.fillStyle(col, 0.85);
      g.fillRect(cx2, cy, 8, 11);
      g.fillStyle(0xf0c080, 0.9);
      g.fillCircle(cx2 + 4, cy - 3, 4);
    }

    // Floor gradient (wood)
    g.fillGradientStyle(0xd4913a, 0xd4913a, 0xb87030, 0xb87030, 1);
    g.fillRect(0, 88, GW, GH - 88);

    // Wood grain lines
    g.lineStyle(1, 0xa06020, 0.45);
    for (let xi = 0; xi < GW; xi += 28) {
      g.lineBetween(xi, 88, xi, GH);
    }

    // Court lines
    g.lineStyle(3, 0xffffff, 0.92);

    // Boundary
    g.strokeRect(18, 92, GW - 36, GH - 98);

    // Half-court line
    g.lineBetween(GW / 2, 92, GW / 2, GH - 6);

    // Center circle
    g.strokeCircle(GW / 2, (92 + GH) / 2, 56);

    // Left key (paint)
    g.strokeRect(18, (GH / 2) - 66, 130, 132);

    // Right key
    g.strokeRect(GW - 148, (GH / 2) - 66, 130, 132);

    // Left free-throw circle
    g.strokeCircle(148, GH / 2, 56);

    // Right free-throw circle
    g.strokeCircle(GW - 148, GH / 2, 56);

    // Left three-point arc
    g.beginPath();
    g.arc(RIM_L - 4, RIM_Y + 45, THREE_LINE - 10, -1.1, 1.1, false);
    g.strokePath();

    // Right three-point arc
    g.beginPath();
    g.arc(RIM_R + 4, RIM_Y + 45, THREE_LINE - 10, Math.PI - 1.1, Math.PI + 1.1, false);
    g.strokePath();

    // Shadow beneath hoops on floor
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(RIM_L - 20, FLOOR - 2, 80, 18);
    g.fillEllipse(RIM_R + 20, FLOOR - 2, 80, 18);

    g.generateTexture('court', GW, GH);
    g.destroy();
  },

  hoops(scene) {
    // Left hoop (player shoots INTO this from the right)
    this._hoop(scene, 'hoop_l', true);
    this._hoop(scene, 'hoop_r', false);
  },

  _hoop(scene, key, isLeft) {
    const W = 80, H = 120;
    const g = scene.make.graphics({ add: false });

    // Pole
    g.fillStyle(0x888888);
    g.fillRect(isLeft ? 2 : W - 8, H - 100, 6, 100);

    // Backboard
    g.fillStyle(0xeeeeff, 0.9);
    g.fillRect(isLeft ? 0 : W - 14, H - 100, 14, 60);
    g.lineStyle(2, 0x3333ff, 0.8);
    g.strokeRect(isLeft ? 3 : W - 11, H - 85, 8, 22);

    // Rim (orange)
    const rimX = isLeft ? 44 : W - 44;
    g.lineStyle(4, 0xff6600);
    g.beginPath();
    g.arc(rimX, H - 60, 18, 0, Math.PI, false);
    g.strokePath();

    // Rim top line
    g.lineStyle(4, 0xff6600);
    g.lineBetween(rimX - 18, H - 60, rimX + 18, H - 60);

    // Net
    g.lineStyle(1, 0xdddddd, 0.8);
    for (let i = -3; i <= 3; i++) {
      g.lineBetween(rimX + i * 5, H - 60, rimX + i * 3, H - 32);
    }
    for (let yi2 = H - 54; yi2 < H - 32; yi2 += 8) {
      g.lineBetween(rimX - 14, yi2, rimX + 14, yi2);
    }

    g.generateTexture(key, W, H);
    g.destroy();
  },

  ball(scene) {
    const R = 13;
    const g = scene.make.graphics({ add: false });
    // Ball body
    g.fillStyle(0xff7700);
    g.fillCircle(R, R, R);
    // Seams
    g.lineStyle(1.5, 0x993300, 0.9);
    g.strokeCircle(R, R, R);
    g.lineBetween(R, 0, R, R * 2);
    g.beginPath();
    g.arc(R, R, R * 0.6, 0, Math.PI, false);
    g.strokePath();
    g.beginPath();
    g.arc(R, R, R * 0.6, Math.PI, Math.PI * 2, false);
    g.strokePath();
    // Shine
    g.fillStyle(0xffaa44, 0.55);
    g.fillCircle(R - 4, R - 4, 4);
    g.generateTexture('ball', R * 2, R * 2);
    g.destroy();
  },

  players(scene) {
    const cfgs = [
      { key: 'bean', jersey: 0x00bb44, shorts: 0x007722, shoes: 0xff8800, skin: 0xf0c080, num: '0' },
      { key: 'bosh', jersey: 0x0055cc, shorts: 0x003388, shoes: 0xffffff, skin: 0xf0b070, num: '10' },
    ];
    for (const t of TEAMS) {
      cfgs.push({ key: 'cpu1_' + t.name.replace(/ /g, '_'), jersey: t.c1, shorts: t.c2, shoes: 0xeeeeee, skin: 0xf0c080, num: '3' });
      cfgs.push({ key: 'cpu2_' + t.name.replace(/ /g, '_'), jersey: t.c1, shorts: t.c2, shoes: 0xcccccc, skin: 0xe0a060, num: '7' });
    }
    const poses = ['idle', 'run1', 'run2', 'jump', 'shoot', 'dunk', 'celebrate', 'defend'];
    for (const cfg of cfgs) {
      for (const pose of poses) {
        this._player(scene, cfg.key + '_' + pose, cfg, pose);
      }
    }
  },

  _player(scene, key, cfg, pose) {
    const PW = 36, PH = 52;
    const g = scene.make.graphics({ add: false });
    const cx = PW / 2;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, PH - 2, 26, 7);

    // --- pose-specific geometry ---
    let legRaise = 0, armRaise = 0, bodyLift = 0;
    let legSpread = 0, ballHand = false;

    switch (pose) {
      case 'run1':  legRaise = 8;  break;
      case 'run2':  legRaise = -8; break;
      case 'jump':  legRaise = 10; bodyLift = 8; armRaise = 0.3; break;
      case 'shoot': armRaise = 1.1; ballHand = true; break;
      case 'dunk':  bodyLift = 12; armRaise = 1.4; legRaise = 8; break;
      case 'celebrate': armRaise = 1.6; bodyLift = 2; break;
      case 'defend': legSpread = 6; armRaise = 0.4; break;
    }

    const footY  = PH - 5;
    const bodyY  = footY - 16 - bodyLift;
    const headY  = bodyY - 16;
    const shortH = 12;
    const legH   = 14;

    // Shoes
    g.fillStyle(cfg.shoes);
    g.fillRect(cx - 13, footY - 4 + legRaise, 12, 5);
    g.fillRect(cx + 1,  footY - 4 - legRaise, 12, 5);

    // Legs
    g.fillStyle(cfg.shorts);
    g.fillRect(cx - 10, bodyY + shortH, 8, legH - legRaise);
    g.fillRect(cx + 2,  bodyY + shortH, 8, legH + legRaise);

    // Shorts
    g.fillRect(cx - 12 - legSpread, bodyY + 4, 24 + legSpread * 2, shortH);

    // Jersey body
    g.fillStyle(cfg.jersey);
    g.fillRect(cx - 11, bodyY, 22, 16);

    // Jersey stripe
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(cx - 3, bodyY, 6, 14);

    // Arms
    g.fillStyle(cfg.skin);
    const armLen = 10;
    // Left arm
    const laAngle = Math.PI / 2 + armRaise * 0.5;
    g.fillRect(cx - 14, bodyY + 3, 4, armLen - armRaise * 2);
    // Right arm (raised for shoot/dunk)
    if (pose === 'shoot' || pose === 'dunk' || pose === 'celebrate') {
      g.fillRect(cx + 10, bodyY - armRaise * 5, 4, armLen + 2);
    } else {
      g.fillRect(cx + 10, bodyY + 3, 4, armLen);
    }

    // Head (big NBA Jam head)
    g.fillStyle(cfg.skin);
    g.fillCircle(cx, headY, 12);

    // Hair
    g.fillStyle(0x222222);
    g.fillRect(cx - 10, headY - 12, 20, 6);

    // Eyes
    g.fillStyle(0x111111);
    if (pose === 'dunk' || pose === 'celebrate') {
      // Intense eyes
      g.fillRect(cx - 7, headY - 3, 5, 2);
      g.fillRect(cx + 2, headY - 3, 5, 2);
    } else {
      g.fillCircle(cx - 5, headY - 2, 2);
      g.fillCircle(cx + 3, headY - 2, 2);
    }

    // Mouth
    if (pose === 'celebrate') {
      g.fillStyle(0xdd2200);
      g.fillRect(cx - 5, headY + 4, 10, 4);
      g.fillStyle(0xffffff);
      g.fillRect(cx - 4, headY + 5, 8, 2);
    } else if (pose === 'dunk') {
      g.fillStyle(0xdd2200);
      g.fillRect(cx - 4, headY + 3, 8, 4);
    } else {
      g.fillStyle(0x553333);
      g.fillRect(cx - 3, headY + 4, 6, 2);
    }

    // Sweatband
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(cx - 10, headY - 7, 20, 3);

    g.generateTexture(key, PW, PH);
    g.destroy();
  },

  particles(scene) {
    // Fire particle
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xff4400);
    g.fillCircle(6, 6, 5);
    g.fillStyle(0xffcc00);
    g.fillCircle(6, 7, 3);
    g.generateTexture('particle_fire', 12, 12);
    g.destroy();

    // Spark particle
    const g2 = scene.make.graphics({ add: false });
    g2.fillStyle(0xffff00);
    g2.fillRect(0, 2, 8, 4);
    g2.fillStyle(0xffffff);
    g2.fillRect(2, 0, 4, 8);
    g2.generateTexture('particle_star', 8, 8);
    g2.destroy();

    // Sweat particle
    const g3 = scene.make.graphics({ add: false });
    g3.fillStyle(0x88ccff, 0.8);
    g3.fillCircle(4, 4, 3);
    g3.generateTexture('particle_sweat', 8, 8);
    g3.destroy();
  },

  uiPieces(scene) {
    // D-pad base
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x000000, 0.55);
    g.fillCircle(56, 56, 56);
    g.lineStyle(2, 0x888888, 0.5);
    g.strokeCircle(56, 56, 56);
    // Cross arms
    g.fillStyle(0x333333, 0.8);
    g.fillRect(20, 38, 72, 36);
    g.fillRect(38, 20, 36, 72);
    // Arrows
    g.fillStyle(0xcccccc);
    // Left arrow
    g.fillTriangle(24, 56, 36, 46, 36, 66);
    // Right arrow
    g.fillTriangle(88, 56, 76, 46, 76, 66);
    // Up arrow
    g.fillTriangle(56, 24, 46, 36, 66, 36);
    // Down arrow
    g.fillTriangle(56, 88, 46, 76, 66, 76);
    g.generateTexture('dpad', 112, 112);
    g.destroy();

    // Action button A (jump/block) - big
    const ga = scene.make.graphics({ add: false });
    ga.fillStyle(0x004400, 0.65);
    ga.fillCircle(30, 30, 30);
    ga.lineStyle(3, 0x00ff44, 0.7);
    ga.strokeCircle(30, 30, 30);
    ga.fillStyle(0x00ff44, 0.9);
    ga.fillText = () => {}; // placeholder
    ga.generateTexture('btn_a', 60, 60);
    ga.destroy();

    // Action button B (shoot/steal)
    const gb = scene.make.graphics({ add: false });
    gb.fillStyle(0x440000, 0.65);
    gb.fillCircle(24, 24, 24);
    gb.lineStyle(3, 0xff4444, 0.7);
    gb.strokeCircle(24, 24, 24);
    gb.generateTexture('btn_b', 48, 48);
    gb.destroy();

    // Turbo button
    const gt = scene.make.graphics({ add: false });
    gt.fillStyle(0x440044, 0.65);
    gt.fillCircle(20, 20, 20);
    gt.lineStyle(2, 0xff44ff, 0.7);
    gt.strokeCircle(20, 20, 20);
    gt.generateTexture('btn_turbo', 40, 40);
    gt.destroy();
  },
};

// ================================================================
// BOOT SCENE
// ================================================================
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  create() {
    Assets.build(this);
    this.scene.start('Title');
  }
}

// ================================================================
// TITLE SCENE
// ================================================================
class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'Title' }); }

  create() {
    const { width: W, height: H } = this.scale;

    // Background
    this.add.rectangle(0, 0, GW, GH, 0x000033).setOrigin(0);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GW);
      const y = Phaser.Math.Between(0, GH * 0.6);
      const s = this.add.rectangle(x, y, 2, 2, 0xffffff, Phaser.Math.FloatBetween(0.3, 1.0));
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(600, 2000), yoyo: true, repeat: -1 });
    }

    // Court preview at bottom
    this.add.image(GW / 2, GH - 60, 'court').setScale(1, 0.25).setAlpha(0.4);

    // Two player sprites dancing on title
    const beanPoses = ['idle', 'celebrate'];
    const boshPoses = ['idle', 'celebrate'];
    const bean = this.add.image(GW * 0.3, GH * 0.68, 'bean_celebrate').setScale(2.2);
    const bosh = this.add.image(GW * 0.7, GH * 0.68, 'bosh_celebrate').setScale(2.2);
    let poseIdx = 0;
    this.time.addEvent({
      delay: 500, repeat: -1, callback: () => {
        poseIdx = 1 - poseIdx;
        bean.setTexture('bean_' + beanPoses[poseIdx]);
        bosh.setTexture('bosh_' + boshPoses[poseIdx]);
      }
    });

    // Logo shadow
    this.add.text(GW / 2 + 4, GH * 0.18 + 4, 'BEAN × BOSH', {
      fontFamily: 'monospace', fontSize: '52px', fontStyle: 'bold',
      fill: '#000000', stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5).setAlpha(0.6);

    // Logo
    const logo = this.add.text(GW / 2, GH * 0.18, 'BEAN × BOSH', {
      fontFamily: 'monospace', fontSize: '52px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#ff6600', strokeThickness: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GW / 2, GH * 0.33, 'ROAD TO THE 2026 RBA FINALS', {
      fontFamily: 'monospace', fontSize: '17px',
      fill: '#00ffff', stroke: '#004488', strokeThickness: 4,
    }).setOrigin(0.5);

    // Tournament round info
    const roundText = GS.round > 0
      ? `ROUND ${GS.round + 1} OF 4  •  NEXT: ${TEAMS[GS.round].name}`
      : 'TOURNAMENT BEGINS!';

    this.add.text(GW / 2, GH * 0.43, roundText, {
      fontFamily: 'monospace', fontSize: '13px',
      fill: '#ff8800',
    }).setOrigin(0.5);

    // Matchup display
    const opp = TEAMS[GS.round];
    const matchBox = this.add.rectangle(GW / 2, GH * 0.57, 340, 52, 0x001133, 0.85).setOrigin(0.5);
    this.add.text(GW / 2, GH * 0.57, `BEAN & BOSH  vs  ${opp.name}`, {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    // Blink "TAP TO TIP OFF"
    const tapText = this.add.text(GW / 2, GH * 0.84, '▶  TAP TO TIP OFF  ◀', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [tapText],
      alpha: 0.1, duration: 520, yoyo: true, repeat: -1,
    });

    // Logo pulse
    this.tweens.add({
      targets: logo,
      scaleX: 1.04, scaleY: 1.04,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Input
    this.input.once('pointerdown', () => this.scene.start('Game'));
    this.input.keyboard.once('keydown', () => this.scene.start('Game'));
  }
}

// ================================================================
// VIRTUAL CONTROLS
// ================================================================
class VirtualControls {
  constructor(scene) {
    this.scene = scene;
    this.state = { left: false, right: false, up: false, down: false, a: false, b: false, turbo: false };
    this._pointers = {};
    this._build();
  }

  _build() {
    const s = this.scene;
    const sw = GW, sh = GH;

    // D-pad position (bottom-left)
    this.dpadX = 70;
    this.dpadY = sh - 82;
    this.dpadR = 52;

    // Button positions (bottom-right)
    this.btnAX = sw - 66;  this.btnAY = sh - 110; // Jump / Block
    this.btnBX = sw - 116; this.btnBY = sh - 62;  // Shoot / Steal
    this.btnTX = sw - 52;  this.btnTY = sh - 50;  // Turbo

    // Visual overlay (separate container at top of display)
    this.overlay = s.add.container(0, 0).setDepth(100);

    // D-pad graphic
    const dpad = s.add.image(this.dpadX, this.dpadY, 'dpad').setAlpha(0.75).setScale(1.0);
    this.overlay.add(dpad);

    // A button
    const btnA = s.add.image(this.btnAX, this.btnAY, 'btn_a').setAlpha(0.75);
    const lblA = s.add.text(this.btnAX, this.btnAY, 'A\nJUMP', {
      fontFamily: 'monospace', fontSize: '11px', fill: '#00ff44', align: 'center',
    }).setOrigin(0.5).setAlpha(0.9);
    this.overlay.add([btnA, lblA]);
    this.btnAImg = btnA;

    // B button
    const btnB = s.add.image(this.btnBX, this.btnBY, 'btn_b').setAlpha(0.75);
    const lblB = s.add.text(this.btnBX, this.btnBY, 'B\nSHOOT', {
      fontFamily: 'monospace', fontSize: '10px', fill: '#ff4444', align: 'center',
    }).setOrigin(0.5).setAlpha(0.9);
    this.overlay.add([btnB, lblB]);
    this.btnBImg = btnB;

    // Turbo
    const btnT = s.add.image(this.btnTX, this.btnTY, 'btn_turbo').setAlpha(0.75);
    const lblT = s.add.text(this.btnTX, this.btnTY - 0, 'T', {
      fontFamily: 'monospace', fontSize: '10px', fill: '#ff44ff',
    }).setOrigin(0.5).setAlpha(0.9);
    this.overlay.add([btnT, lblT]);

    // Touch events
    s.input.on('pointerdown',  (p) => this._onDown(p));
    s.input.on('pointermove',  (p) => this._onMove(p));
    s.input.on('pointerup',    (p) => this._onUp(p));
    s.input.on('pointercancel',(p) => this._onUp(p));

    // Keyboard fallback
    this.keys = s.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      a:     Phaser.Input.Keyboard.KeyCodes.Z,
      b:     Phaser.Input.Keyboard.KeyCodes.X,
      turbo: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      aAlt:  Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  _pointerToGameXY(p) {
    // Convert screen coords to game coords using camera (scale manager)
    const bounds = this.scene.scale.canvasBounds;
    const scaleX  = GW / bounds.width;
    const scaleY  = GH / bounds.height;
    return {
      x: (p.x - bounds.left) * scaleX,
      y: (p.y - bounds.top)  * scaleY,
    };
  }

  _classifyPoint(gx, gy) {
    // D-pad?
    const dx = gx - this.dpadX, dy = gy - this.dpadY;
    const dr = Math.sqrt(dx * dx + dy * dy);
    if (dr < this.dpadR + 10) {
      return { type: 'dpad', dx, dy };
    }
    // A button?
    if (Math.hypot(gx - this.btnAX, gy - this.btnAY) < 36) return { type: 'a' };
    // B button?
    if (Math.hypot(gx - this.btnBX, gy - this.btnBY) < 30) return { type: 'b' };
    // Turbo?
    if (Math.hypot(gx - this.btnTX, gy - this.btnTY) < 28) return { type: 'turbo' };
    return null;
  }

  _onDown(p) {
    const { x, y } = this._pointerToGameXY(p);
    this._pointers[p.id] = { x, y, classification: this._classifyPoint(x, y) };
    this._updateState();
  }

  _onMove(p) {
    const { x, y } = this._pointerToGameXY(p);
    if (this._pointers[p.id]) {
      this._pointers[p.id] = { x, y, classification: this._classifyPoint(x, y) };
      this._updateState();
    }
  }

  _onUp(p) {
    delete this._pointers[p.id];
    this._updateState();
  }

  _updateState() {
    let left = false, right = false, up = false, down = false, a = false, b = false, turbo = false;
    for (const ptr of Object.values(this._pointers)) {
      const c = ptr.classification;
      if (!c) continue;
      if (c.type === 'dpad') {
        if (c.dx < -14) left  = true;
        if (c.dx >  14) right = true;
        if (c.dy < -14) up    = true;
        if (c.dy >  14) down  = true;
      } else if (c.type === 'a')     a     = true;
      else if (c.type === 'b')       b     = true;
      else if (c.type === 'turbo')   turbo = true;
    }
    this.state.left = left; this.state.right = right;
    this.state.up = up;     this.state.down = down;
    this.state.a = a;       this.state.b = b;
    this.state.turbo = turbo;

    // Button glow feedback
    this.btnAImg.setAlpha(a ? 1.0 : 0.75);
    this.btnBImg.setAlpha(b ? 1.0 : 0.75);
  }

  get() {
    // Merge keyboard + touch
    const k = this.keys;
    return {
      left:  this.state.left  || k.left.isDown,
      right: this.state.right || k.right.isDown,
      up:    this.state.up    || k.up.isDown,
      down:  this.state.down  || k.down.isDown,
      a:     this.state.a     || k.a.isDown || k.aAlt.isDown,
      b:     this.state.b     || k.b.isDown,
      turbo: this.state.turbo || k.turbo.isDown,
    };
  }

  destroy() {
    this.overlay.destroy();
  }
}

// ================================================================
// PLAYER
// ================================================================
class Player {
  constructor(scene, x, y, cfg) {
    this.scene = scene;
    this.cfg = cfg;        // { key, team, isHuman, isPlayerTeam }
    this.x = x;
    this.y = FLOOR;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.hasBall = false;
    this.facingRight = cfg.isPlayerTeam ? true : false;
    this.state = 'idle';   // idle run jump shoot dunk celebrate defend
    this.animTimer = 0;
    this.animFrame = 0;
    this.shootCooldown = 0;
    this.stealCooldown = 0;
    this.fireCount = 0;    // consecutive makes
    this.onFire = false;
    this.fireDuration = 0;
    this.invincible = 0;   // brief after steal attempt
    this.celebrateTimer = 0;
    this.dunkTimer = 0;

    // Sprite
    this.sprite = scene.add.image(x, FLOOR, cfg.key + '_idle').setDepth(10);
    this.sprite.setFlipX(!cfg.isPlayerTeam);

    // Fire effect text
    this.fireLabel = scene.add.text(x, FLOOR - 60, '🔥ON FIRE🔥', {
      fontFamily: 'monospace', fontSize: '11px', fill: '#ff8800',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false).setDepth(15);

    // Name label
    this.nameLabel = scene.add.text(x, FLOOR - 46, cfg.label || '', {
      fontFamily: 'monospace', fontSize: '9px', fill: '#ffffaa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(15);
  }

  update(dt, input, ball, opponents, teammate) {
    if (this.celebrateTimer > 0) {
      this.celebrateTimer -= dt;
      this._setState('celebrate');
      this._updateSprite();
      return;
    }
    if (this.dunkTimer > 0) {
      // locked into dunk animation
      this.dunkTimer -= dt;
      this._setState('dunk');
      this._updateSprite();
      return;
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.stealCooldown > 0) this.stealCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;

    if (this.fireDuration > 0) {
      this.fireDuration -= dt;
      if (this.fireDuration <= 0) this._setFire(false);
    }

    if (this.cfg.isHuman) {
      this._handleHumanInput(dt, input, ball, opponents, teammate);
    } else {
      this._handleAI(dt, ball, opponents, teammate);
    }

    // Physics
    if (!this.onGround) {
      this.vy += GRAV * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Ground clamp
    if (this.y >= FLOOR) {
      this.y = FLOOR;
      this.vy = 0;
      this.onGround = true;
    }

    // World bounds
    this.x = Phaser.Math.Clamp(this.x, 28, GW - 28);

    // Animation frame cycle
    this.animTimer += dt;
    if (this.animTimer > 0.14) {
      this.animTimer = 0;
      this.animFrame = 1 - this.animFrame;
    }

    this._updateState();
    this._updateSprite();
  }

  _handleHumanInput(dt, input, ball, opponents, teammate) {
    const spd = input.turbo || this.onFire ? TURBO_SPD : SPD;

    if (input.left)  { this.vx = -spd; this.facingRight = false; }
    else if (input.right) { this.vx = spd; this.facingRight = true; }
    else this.vx = 0;

    // Jump / Block
    if (input.a && this.onGround) {
      this._jump();
    }
    // Block while airborne near opponent with ball
    if (input.a && !this.onGround) {
      this._tryBlock(opponents);
    }

    // Shoot / Steal
    if (input.b && this.shootCooldown <= 0) {
      if (this.hasBall) {
        this._shoot(ball);
      } else {
        this._trySteal(ball, opponents);
      }
    }
  }

  _handleAI(dt, ball, opponents, teammate) {
    const diff  = TEAMS[GS.round].diff;
    const myBasket   = this.cfg.isPlayerTeam ? RIM_R : RIM_L;
    const theirBasket = this.cfg.isPlayerTeam ? RIM_L : RIM_R;

    if (this.hasBall) {
      // Drive toward opponent's basket
      const targetX = theirBasket + (this.cfg.isPlayerTeam ? -80 : 80);
      const dist = Math.abs(this.x - theirBasket);

      if (dist < DUNK_RANGE && this.onGround) {
        // Jump to dunk
        this._jump();
      }

      const moveSpd = SPD * diff;
      if (this.x < targetX - 10) { this.vx = moveSpd; this.facingRight = true; }
      else if (this.x > targetX + 10) { this.vx = -moveSpd; this.facingRight = false; }
      else { this.vx = 0; }

      // Shoot when in reasonable range
      if (dist < 280 && dist > 60 && this.shootCooldown <= 0 && this.onGround) {
        const shootRoll = Math.random();
        if (shootRoll < 0.018 * diff) {
          this._shoot(ball);
        }
      }
      // Dunk when very close and in air
      if (dist < DUNK_RANGE && !this.onGround) {
        this._dunk(ball, theirBasket);
      }
    } else {
      // No ball: defend or get open
      if (ball.carrier && opponents.some(o => o === ball.carrier)) {
        // Defend: move toward ball carrier
        const tgt = ball.carrier;
        const moveSpd = SPD * 0.9 * diff;
        if (this.x < tgt.x - 20) { this.vx = moveSpd; this.facingRight = true; }
        else if (this.x > tgt.x + 20) { this.vx = -moveSpd; this.facingRight = false; }
        else { this.vx = 0; }

        // Try steal
        if (this.stealCooldown <= 0) {
          const d = Math.abs(this.x - tgt.x);
          if (d < 45 && Math.random() < 0.012 * diff) {
            this._trySteal(ball, opponents);
          }
        }
      } else if (!ball.carrier) {
        // Chase loose ball
        if (this.x < ball.x - 10) { this.vx = SPD * diff; this.facingRight = true; }
        else if (this.x > ball.x + 10) { this.vx = -SPD * diff; this.facingRight = false; }
      } else if (ball.carrier && this.cfg.isPlayerTeam === ball.carrier.cfg.isPlayerTeam) {
        // Teammate has ball - get open near their basket
        const openX = theirBasket + (this.cfg.isPlayerTeam ? -120 : 120);
        if (this.x < openX - 10) { this.vx = SPD * 0.7; this.facingRight = true; }
        else if (this.x > openX + 10) { this.vx = -SPD * 0.7; this.facingRight = false; }
        else this.vx = 0;
      } else {
        this.vx *= 0.8;
      }
    }
  }

  _jump() {
    this.vy = JUMP_VY;
    this.onGround = false;
    this._setState('jump');
  }

  _shoot(ball) {
    if (!this.hasBall) return;
    const targetX = this.cfg.isPlayerTeam ? RIM_R : RIM_L;
    const dist = Math.abs(this.x - targetX);

    // Dunk if close and in air
    if (dist < DUNK_RANGE && !this.onGround) {
      this._dunk(ball, targetX);
      return;
    }

    const isThree = dist > THREE_LINE;
    this.shootCooldown = 0.6;
    this._setState('shoot');

    // Release ball on arc
    this.hasBall = false;
    ball.shoot(this, targetX, RIM_Y, isThree, this.onFire, this.cfg.isPlayerTeam);
    this.scene.onShot(this, isThree);
  }

  _dunk(ball, rimX) {
    if (!this.hasBall) return;
    this.hasBall = false;
    this.dunkTimer = 0.55;
    this._setState('dunk');

    // Instant basket + effects
    ball.dunk(this);
    this.scene.onDunk(this);
  }

  _trySteal(ball, opponents) {
    if (this.stealCooldown > 0 || this.invincible > 0) return;
    const carrier = opponents.find(o => o.hasBall);
    if (!carrier) return;
    const dist = Math.hypot(this.x - carrier.x, this.y - carrier.y);
    if (dist > 50) return;

    this.stealCooldown = 0.9;
    carrier.invincible = 0.4;

    const diff = TEAMS[GS.round].diff;
    const myBonus = this.onFire ? 0.25 : 0;
    const stealChance = 0.38 + myBonus - diff * 0.08;

    if (Math.random() < stealChance) {
      // Successful steal
      carrier.hasBall = false;
      ball.carrier = null;
      ball.state = 'loose';
      ball.vx = (this.facingRight ? 1 : -1) * 180;
      ball.vy = -220;
      this.scene.shout('steal');
    }
  }

  _tryBlock(opponents) {
    // Block shots in air
    const shooter = opponents.find(o => o.state === 'shoot' && Math.abs(this.x - o.x) < 60);
    if (shooter) {
      this.scene.shout('steal');
    }
  }

  _setState(s) { this.state = s; }

  _updateState() {
    if (this.hasBall && !this.onGround) this.state = 'jump';
    else if (!this.onGround) this.state = 'jump';
    else if (Math.abs(this.vx) > 10) {
      this.state = this.animFrame ? 'run1' : 'run2';
    } else if (this.state !== 'shoot') {
      this.state = 'idle';
    }
  }

  _updateSprite() {
    const texKey = this.cfg.key + '_' + this.state;
    if (this.sprite.texture.key !== texKey) {
      this.sprite.setTexture(texKey);
    }
    this.sprite.setPosition(this.x, this.y - 26);
    this.sprite.setFlipX(!this.facingRight);

    this.nameLabel.setPosition(this.x, this.y - 66);

    if (this.onFire) {
      this.fireLabel.setPosition(this.x, this.y - 78);
      this.fireLabel.setVisible(true);
    } else {
      this.fireLabel.setVisible(false);
    }
  }

  pickupBall(ball) {
    this.hasBall = true;
    ball.carrier = this;
    ball.state = 'held';
  }

  celebrate() {
    this.hasBall = false;
    this.celebrateTimer = 1.2;
    this.fireCount++;
    if (this.fireCount >= GS_FIRE_COUNT) this._setFire(true);
  }

  _setFire(val) {
    this.onFire = val;
    if (val) {
      this.fireDuration = 20.0; // 20 seconds on fire
      GS.playerFire = this.cfg.isPlayerTeam;
      this.scene.shout('fire');
      this.scene.cameraShake(200, 0.008);
    }
  }

  missedShot() {
    this.fireCount = 0;
    if (this.onFire) { /* keep fire going */ }
  }

  destroy() {
    this.sprite.destroy();
    this.nameLabel.destroy();
    this.fireLabel.destroy();
  }
}

const GS_FIRE_COUNT = 3;

// ================================================================
// BALL
// ================================================================
class Ball {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'loose';   // held dribble flying loose dunk
    this.carrier = null;
    this.shooterTeamIsPlayer = false;
    this.isThreeAttempt = false;
    this.onFire = false;
    this.trail = [];

    this.sprite = scene.add.image(x, y, 'ball').setDepth(11).setScale(1.0);
    this.shadow = scene.add.ellipse(x, FLOOR - 2, 18, 6, 0x000000, 0.3).setDepth(9);
  }

  update(dt, players) {
    switch (this.state) {
      case 'held':
        if (this.carrier) {
          const offset = this.carrier.facingRight ? 16 : -16;
          this.x = this.carrier.x + offset;
          this.y = this.carrier.y - 20;
          this.sprite.setScale(0.9);
        }
        break;

      case 'dribble':
        if (this.carrier) {
          const offset2 = this.carrier.facingRight ? 14 : -14;
          this.x = this.carrier.x + offset2;
          // Bounce animation
          this.y = this.carrier.y - 8 - Math.abs(Math.sin(this.scene.time.now * 0.01)) * 22;
          this.sprite.setScale(0.85);
        }
        break;

      case 'flying':
        this.vy += GRAV * 0.72 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.sprite.angle += this.vx * dt * 1.8;
        this.sprite.setScale(1.0 + Math.abs(this.vy) * 0.0002);

        // Trail
        this.trail.push({ x: this.x, y: this.y, alpha: 0.6 });
        if (this.trail.length > 8) this.trail.shift();

        this._checkScoring();
        this._checkFloor();
        break;

      case 'loose':
        this.vx *= 0.94;
        this.vy += GRAV * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.sprite.angle += this.vx * dt;

        if (this.y >= FLOOR) {
          this.y = FLOOR;
          this.vy = -this.vy * 0.45;
          this.vx *= 0.78;
          if (Math.abs(this.vy) < 30) { this.vy = 0; }
        }
        this.x = Phaser.Math.Clamp(this.x, 20, GW - 20);

        // Player can pick up loose ball
        for (const p of players) {
          if (!p.hasBall && Math.hypot(p.x - this.x, p.y - this.y) < 42) {
            p.pickupBall(this);
            this.state = 'dribble';
            break;
          }
        }
        break;
    }

    // Update visuals
    this.sprite.setPosition(this.x, this.y);
    const shadowScale = Phaser.Math.Clamp((FLOOR - this.y) / 280, 0.2, 1.0);
    this.shadow.setPosition(this.x, FLOOR - 1);
    this.shadow.setScale(shadowScale, 0.5 * shadowScale);
  }

  shoot(shooter, rimX, rimY, isThree, shooterOnFire, shooterIsPlayer) {
    this.state = 'flying';
    this.carrier = null;
    this.shooterTeamIsPlayer = shooterIsPlayer;
    this.isThreeAttempt = isThree;
    this.onFire = shooterOnFire;

    const dx = rimX - shooter.x;
    const dy = rimY - shooter.y;
    const dist = Math.abs(dx);
    const flightTime = 0.35 + dist * 0.0012;

    // Aim with slight random error (fire = perfect aim)
    const accuracy = shooterOnFire ? 0 : (isThree ? 28 : 18);
    const errX = (Math.random() - 0.5) * accuracy;
    const errY = (Math.random() - 0.5) * accuracy * 0.5;

    const targetX = rimX + errX;
    const targetY = rimY + errY;

    this.vx = (targetX - shooter.x) / flightTime;
    this.vy = ((targetY - shooter.y) - 0.5 * GRAV * 0.72 * flightTime * flightTime) / flightTime;

    this.x = shooter.x;
    this.y = shooter.y - 24;
    this.trail = [];
  }

  dunk(shooter) {
    this.state = 'dunk';
    this.carrier = null;
    // Dunk is automatic score, handled in Player._dunk via scene.onDunk
  }

  _checkScoring() {
    // Left rim scoring (CPU shoots here)
    if (this.y >= RIM_Y - 12 && this.y <= RIM_Y + 12 && this._lastY < RIM_Y) {
      if (Math.abs(this.x - RIM_L) < 20) {
        const scored = this.onFire || Math.random() > 0.08;
        this.scene.onBallPassRim(!this.shooterTeamIsPlayer, this.isThreeAttempt, scored, this.x, this.y);
        return;
      }
    }
    // Right rim scoring (Player shoots here)
    if (this.y >= RIM_Y - 12 && this.y <= RIM_Y + 12 && this._lastY < RIM_Y) {
      if (Math.abs(this.x - RIM_R) < 20) {
        const scored = this.onFire || Math.random() > 0.08;
        this.scene.onBallPassRim(this.shooterTeamIsPlayer, this.isThreeAttempt, scored, this.x, this.y);
        return;
      }
    }
    this._lastY = this.y;
  }

  _checkFloor() {
    if (this.y > FLOOR + 20) {
      this.state = 'loose';
      this.vy = -280;
      this.scene.onShotMiss(this.shooterTeamIsPlayer);
    }
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.state = 'loose';
    this.carrier = null;
    this.trail = [];
    this.sprite.angle = 0;
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

// ================================================================
// GAME SCENE
// ================================================================
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'Game' }); }

  create() {
    this.scorePlayer = 0;
    this.scoreCPU    = 0;
    this.quarter     = 1;
    this.timeLeft    = QUARTER_SECS;
    this.gameRunning = true;
    this.resetTimer  = 0;
    this.lastScoreTeam = null;

    const opp = TEAMS[GS.round];

    // Background court
    this.add.image(GW / 2, GH / 2, 'court');

    // Hoops
    this.add.image(BB_L, RIM_Y - 18, 'hoop_l').setDepth(8);
    this.add.image(BB_R, RIM_Y - 18, 'hoop_r').setDepth(8);

    // Players
    const cpuKey1 = 'cpu1_' + opp.name.replace(/ /g, '_');
    const cpuKey2 = 'cpu2_' + opp.name.replace(/ /g, '_');

    this.players = [
      new Player(this, GW * 0.35, FLOOR, { key: 'bean', isHuman: true,  isPlayerTeam: true,  label: 'BEAN' }),
      new Player(this, GW * 0.55, FLOOR, { key: 'bosh', isHuman: false, isPlayerTeam: true,  label: 'BOSH' }),
      new Player(this, GW * 0.62, FLOOR, { key: cpuKey1, isHuman: false, isPlayerTeam: false, label: opp.name[0] }),
      new Player(this, GW * 0.78, FLOOR, { key: cpuKey2, isHuman: false, isPlayerTeam: false, label: opp.name[1] || opp.name[0] }),
    ];

    this.bean    = this.players[0];
    this.bosh    = this.players[1];
    this.cpuPlayers = [this.players[2], this.players[3]];

    // Initial facing
    this.players[2].facingRight = false;
    this.players[3].facingRight = false;

    // Ball
    this.ball = new Ball(this, GW / 2, GH / 2 - 60);

    // Tip-off: CPU gets ball
    this.time.delayedCall(800, () => {
      this.players[2].pickupBall(this.ball);
      this.ball.state = 'dribble';
    });

    // Controls
    this.controls = new VirtualControls(this);

    // HUD
    this._buildHUD(opp);

    // Announcer overlay
    this.announcer = this.add.text(GW / 2, GH * 0.38, '', {
      fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    // Fire particles emitter
    this.fireEmitter = this.add.particles(0, 0, 'particle_fire', {
      speed: { min: 30, max: 90 },
      angle: { min: 240, max: 300 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 300, max: 600 },
      quantity: 3,
      frequency: 40,
      active: false,
    }).setDepth(20);

    // Score popup pool
    this.scorePopups = [];
  }

  _buildHUD(opp) {
    const depth = 30;

    // Dark header bar
    this.add.rectangle(GW / 2, 18, GW, 36, 0x000000, 0.75).setDepth(depth);

    // Player score box
    this.add.rectangle(90, 18, 160, 30, 0x003300, 0.85).setDepth(depth);
    this.pScoreLabel = this.add.text(90, 18, 'BEAN & BOSH  0', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
      fill: '#00ff44',
    }).setOrigin(0.5).setDepth(depth + 1);

    // CPU score box
    this.add.rectangle(GW - 90, 18, 160, 30, 0x330000, 0.85).setDepth(depth);
    this.cScoreLabel = this.add.text(GW - 90, 18, `0  ${opp.name}`, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
      fill: '#ff4444',
    }).setOrigin(0.5).setDepth(depth + 1);

    // Timer
    this.timerBg = this.add.rectangle(GW / 2, 18, 120, 30, 0x111111, 0.85).setDepth(depth);
    this.timerLabel = this.add.text(GW / 2, 11, '02:00', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5).setDepth(depth + 1);
    this.quarterLabel = this.add.text(GW / 2, 26, `Q${this.quarter}`, {
      fontFamily: 'monospace', fontSize: '11px',
      fill: '#aaaaaa',
    }).setOrigin(0.5).setDepth(depth + 1);

    // ON FIRE indicator
    this.fireBar = this.add.text(GW / 2, GH - 20, '', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      fill: '#ff8800', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
  }

  update(time, delta) {
    if (!this.gameRunning) return;
    const dt = delta / 1000;

    // Timer
    if (this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) this._doReset();
    } else {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        if (this.quarter < NUM_QUARTERS) {
          this.quarter++;
          this.timeLeft = QUARTER_SECS;
          this.quarterLabel.setText(`Q${this.quarter}`);
          this._showAnnouncer('SECOND QUARTER!', '#00ffff');
        } else {
          this._endGame();
          return;
        }
      }
    }

    // Update HUD timer
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    this.timerLabel.setText(`0${mins}:${secs < 10 ? '0' : ''}${secs}`);

    // Timer colour warning
    if (this.timeLeft < 15) {
      this.timerLabel.setFill(this.timeLeft % 0.5 < 0.25 ? '#ff2200' : '#ffffff');
    }

    // Get input
    const input = this.controls.get();

    // Opponents for bean/bosh = cpuPlayers; opponents for cpu = [bean,bosh]
    for (const p of this.players) {
      const opp  = p.cfg.isPlayerTeam ? this.cpuPlayers : [this.bean, this.bosh];
      const mate = p.cfg.isPlayerTeam
        ? (p === this.bean ? this.bosh : this.bean)
        : (p === this.players[2] ? this.players[3] : this.players[2]);
      p.update(dt, p.cfg.isHuman ? input : null, this.ball, opp, mate);
    }

    // Ball
    this.ball.update(dt, this.players);

    // Fire emitter follow on-fire player
    const firePlayer = this.players.find(p => p.onFire);
    if (firePlayer) {
      this.fireEmitter.setPosition(firePlayer.x, firePlayer.y - 30);
      if (!this.fireEmitter.active) this.fireEmitter.start();
    } else {
      if (this.fireEmitter.active) this.fireEmitter.stop();
    }

    // Draw ball trail
    this._drawTrail();

    // Score popups update
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const pop = this.scorePopups[i];
      pop.y -= 60 * dt;
      pop.alpha -= dt * 1.2;
      pop.obj.setPosition(pop.x, pop.y).setAlpha(Math.max(0, pop.alpha));
      if (pop.alpha <= 0) {
        pop.obj.destroy();
        this.scorePopups.splice(i, 1);
      }
    }
  }

  _drawTrail() {
    if (!this.trailGraphics) {
      this.trailGraphics = this.add.graphics().setDepth(10);
    }
    this.trailGraphics.clear();
    const trail = this.ball.trail;
    for (let i = 0; i < trail.length; i++) {
      const a = (i / trail.length) * 0.4;
      this.trailGraphics.fillStyle(0xff8800, a);
      const r = 4 * (i / trail.length);
      this.trailGraphics.fillCircle(trail[i].x, trail[i].y, r);
    }
  }

  // ── Scoring callbacks ─────────────────────────────────────────
  onBallPassRim(scoringTeamIsPlayer, isThree, scored, bx, by) {
    if (scored) {
      const pts = isThree ? 3 : 2;
      if (scoringTeamIsPlayer) {
        this.scorePlayer += pts;
        this.pScoreLabel.setText(`BEAN & BOSH  ${this.scorePlayer}`);
        this.bean.celebrate();
        this.bosh.celebrate();
      } else {
        this.scoreCPU += pts;
        const opp = TEAMS[GS.round];
        this.cScoreLabel.setText(`${this.scoreCPU}  ${opp.name}`);
        this.players[2].celebrate();
        this.players[3].celebrate();
      }

      const msg = isThree ? 'three' : 'score';
      this.shout(isThree ? 'three' : 'score');
      this._spawnScorePopup(bx, by - 20, pts, scoringTeamIsPlayer);
      this.cameraShake(isThree ? 300 : 180, isThree ? 0.012 : 0.007);

      // Schedule reset
      this.resetTimer = 1.6;
      this.lastScoreTeam = scoringTeamIsPlayer ? 'player' : 'cpu';

      // Ball swoosh effect
      this.ball.state = 'loose';
      this.ball.vx = 0; this.ball.vy = 80;
    } else {
      // Miss / rimout
      this.ball.state = 'loose';
      this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 140;
      this.ball.vy = -160;
      this.onShotMiss(scoringTeamIsPlayer);
    }
  }

  onShot(shooter, isThree) {
    // Nothing extra needed here, ball is already flying
  }

  onDunk(shooter) {
    const isPlayer = shooter.cfg.isPlayerTeam;
    const pts = 2;

    if (isPlayer) {
      this.scorePlayer += pts;
      this.pScoreLabel.setText(`BEAN & BOSH  ${this.scorePlayer}`);
      this.bean.celebrate();
      this.bosh.celebrate();
    } else {
      this.scoreCPU += pts;
      this.cScoreLabel.setText(`${this.scoreCPU}  ${TEAMS[GS.round].name}`);
      this.players[2].celebrate();
      this.players[3].celebrate();
    }

    this.shout('dunk');
    this._spawnScorePopup(shooter.x, shooter.y - 60, pts, isPlayer);
    this.cameraShake(400, 0.018);

    this.resetTimer = 1.8;
    this.lastScoreTeam = isPlayer ? 'player' : 'cpu';

    this.ball.state = 'loose';
    this.ball.x = shooter.x;
    this.ball.y = RIM_Y;
    this.ball.vx = (isPlayer ? -1 : 1) * 80;
    this.ball.vy = 100;
  }

  onShotMiss(shooterIsPlayer) {
    // Find shooter and penalize fire count
    const shooter = this.players.find(p => p.cfg.isPlayerTeam === shooterIsPlayer && p.state === 'shoot');
    if (shooter) shooter.missedShot();
    this.shout('miss');
  }

  _doReset() {
    // Give ball to team that was scored on
    const idx = this.lastScoreTeam === 'player' ? 2 : 0;
    const inboundX = this.lastScoreTeam === 'player' ? 140 : GW - 140;

    this.ball.reset(inboundX, FLOOR - 10);
    this.ball.vy = -180;
    this.ball.vx = (Math.random() - 0.5) * 60;

    // Reset player positions loosely
    if (this.lastScoreTeam === 'player') {
      // CPU got scored on, they inbound
      this.players[2].x = inboundX;
      this.players[3].x = inboundX + 80;
    } else {
      this.bean.x = inboundX;
      this.bosh.x = inboundX - 80;
    }
  }

  _spawnScorePopup(x, y, pts, isPlayer) {
    const txt = this.add.text(x, y, `+${pts}`, {
      fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold',
      fill: isPlayer ? '#00ff88' : '#ff4444',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(60);
    this.scorePopups.push({ obj: txt, x, y, alpha: 1.4 });
  }

  shout(trigger) {
    const group = SHOUTS.find(s => s.trigger === trigger);
    if (!group) return;
    const msg = Phaser.Utils.Array.GetRandom(group.msgs);
    this._showAnnouncer(msg, trigger === 'fire' ? '#ff4400' : '#ffdd00');
  }

  _showAnnouncer(msg, color = '#ffdd00') {
    this.announcer.setText(msg).setFill(color).setAlpha(1);
    this.tweens.killTweensOf(this.announcer);
    this.tweens.add({
      targets: this.announcer,
      alpha: 0,
      delay: 1100,
      duration: 400,
    });
  }

  cameraShake(duration, intensity) {
    this.cameras.main.shake(duration, intensity);
  }

  _endGame() {
    this.gameRunning = false;
    this.controls.destroy();
    this.time.delayedCall(600, () => {
      this.scene.start('Result', {
        playerScore: this.scorePlayer,
        cpuScore:    this.scoreCPU,
        oppName:     TEAMS[GS.round].name,
      });
    });
  }

  shutdown() {
    if (this.controls) this.controls.destroy();
    if (this.trailGraphics) this.trailGraphics.destroy();
    for (const pop of this.scorePopups) pop.obj.destroy();
    for (const p of this.players || []) p.destroy();
    if (this.ball) this.ball.destroy();
  }
}

// ================================================================
// RESULT SCENE
// ================================================================
class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'Result' }); }

  init(data) {
    this.data2 = data;
  }

  create() {
    const { playerScore, cpuScore, oppName } = this.data2;
    const won = playerScore > cpuScore;

    if (won) {
      GS.roundWins++;
      GS.round = Math.min(GS.round + 1, TEAMS.length - 1);
    }

    const doneTournament = won && GS.roundWins >= TEAMS.length;

    // BG
    const bgColor = won ? 0x001133 : 0x220000;
    this.add.rectangle(0, 0, GW, GH, bgColor).setOrigin(0);

    // Big result text
    const headline = doneTournament
      ? '🏆  RBA CHAMPIONS!  🏆'
      : won ? 'W  •  YOU WIN!' : 'L  •  GAME OVER';

    this.add.text(GW / 2, GH * 0.2, headline, {
      fontFamily: 'monospace', fontSize: doneTournament ? '36px' : '40px',
      fontStyle: 'bold',
      fill: won ? '#ffdd00' : '#ff3300',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);

    // Score board
    const scoreBox = this.add.rectangle(GW / 2, GH * 0.44, 340, 100, 0x111122, 0.9).setOrigin(0.5);

    this.add.text(GW / 2, GH * 0.36, `BEAN & BOSH   vs   ${oppName}`, {
      fontFamily: 'monospace', fontSize: '13px', fill: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(GW / 2, GH * 0.44, `${playerScore}   –   ${cpuScore}`, {
      fontFamily: 'monospace', fontSize: '48px', fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    // Tournament progress
    if (!doneTournament) {
      const progress = `ROUND ${Math.min(GS.roundWins + 1, 4)} / 4`;
      this.add.text(GW / 2, GH * 0.6, progress, {
        fontFamily: 'monospace', fontSize: '14px', fill: '#888888',
      }).setOrigin(0.5);
    }

    // Sub message
    let sub = '';
    if (doneTournament) {
      sub = 'BEAN & BOSH RULE THE COURT!\nTHE 2026 RBA IS THEIRS!';
    } else if (won) {
      const next = TEAMS[GS.round];
      sub = `NEXT UP: ${next.name}`;
    } else {
      sub = 'TRY AGAIN — YOU GOT THIS';
      GS.round = 0; GS.roundWins = 0; // reset on loss
    }

    this.add.text(GW / 2, GH * 0.68, sub, {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold',
      fill: won ? '#00ffcc' : '#ff8800', align: 'center',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Continue button
    const btnLabel = doneTournament ? 'PLAY AGAIN' : (won ? 'NEXT MATCH  ▶' : 'TRY AGAIN  ▶');
    const btn = this.add.text(GW / 2, GH * 0.84, btnLabel, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      backgroundColor: won ? '#004400' : '#440000',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: btn, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });

    btn.on('pointerdown', () => {
      if (doneTournament) { GS.round = 0; GS.roundWins = 0; }
      this.scene.start('Title');
    });

    this.input.keyboard.once('keydown', () => {
      if (doneTournament) { GS.round = 0; GS.roundWins = 0; }
      this.scene.start('Title');
    });

    // Confetti if won
    if (won) {
      for (let i = 0; i < 40; i++) {
        const cx = Phaser.Math.Between(0, GW);
        const cy = Phaser.Math.Between(-20, GH * 0.5);
        const col = Phaser.Utils.Array.GetRandom([0xff4400, 0xffdd00, 0x00ff88, 0x4488ff, 0xff44ff]);
        const conf = this.add.rectangle(cx, cy, 8, 5, col).setDepth(5);
        this.tweens.add({
          targets: conf,
          y: cy + Phaser.Math.Between(200, 400),
          angle: Phaser.Math.Between(-180, 180),
          alpha: 0,
          duration: Phaser.Math.Between(1800, 3500),
          delay: Phaser.Math.Between(0, 800),
          ease: 'Cubic.easeIn',
          repeat: -1,
          onRepeat: () => { conf.y = Phaser.Math.Between(-20, -5); conf.alpha = 1; }
        });
      }
    }
  }
}

// ================================================================
// PHASER CONFIG
// ================================================================
const config = {
  type: Phaser.AUTO,
  width:  GW,
  height: GH,
  backgroundColor: '#000000',
  parent: document.body,
  scene: [BootScene, TitleScene, GameScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
};

window.addEventListener('load', () => new Phaser.Game(config));
