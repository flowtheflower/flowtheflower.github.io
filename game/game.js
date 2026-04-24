/**
 * FLOW: BLOOMFALL — game.js
 * Requires: Phaser 3.60  |  levels.js loaded before this file
 *
 * Spritesheet (assets/flow_game.png) — 103×103px per frame, 4 cols × 6 rows:
 *   Row 0  frames  0– 3   IDLE
 *   Row 1  frames  4– 7   RUN
 *   Row 2  frames  8–11   HAPPY
 *   Row 3  frames 12–15   LOW_ENERGY
 *   Row 4  frames 16–19   JUMP
 *   Row 5  frames 20–23   LAND
 *
 * Tile atlas (assets/tiles_atlas.png) — 64×64px per tile, 8 cols × 3 rows:
 *   dead_ground, alive_ground, top_grass, rock, vines, dead_plant, grow_plant1, grow_plant2
 *   bloom_flower, bush, water_still, water_flow1, water_flow2, waterfall_top, waterfall_mid, waterfall_btm
 *   lily_pad, mushroom, tree_trunk, leaves, background1, background2, cloud, crystal
 */

// ── TILE ATLAS MAP ────────────────────────────────────────────
var TILE_MAP = {
    dead_ground:   0,  alive_ground:  1,  top_grass:     2,  rock:          3,
    vines:         4,  dead_plant:    5,  grow_plant1:   6,  grow_plant2:   7,
    bloom_flower:  8,  bush:          9,  water_still:   10, water_flow1:   11,
    water_flow2:   12, waterfall_top: 13, waterfall_mid: 14, waterfall_btm: 15,
    lily_pad:      16, mushroom:      17, tree_trunk:    18, leaves:        19,
    background1:   20, background2:   21, cloud:         22, crystal:       23,
};
var ATLAS_COLS = 8;
var TILE_SRC   = 64;   // source px per tile in atlas
var TILE_DSP   = 48;   // display px per tile on screen

// ── SPRITE SHEET ──────────────────────────────────────────────
var FW = 103, FH = 103;
var ANIM_DEFS = [
    { key: 'idle',       start: 0,  end: 3,  rate: 5,  loop: true  },
    { key: 'run',        start: 4,  end: 7,  rate: 9,  loop: true  },
    { key: 'happy',      start: 8,  end: 11, rate: 7,  loop: true  },
    { key: 'low_energy', start: 12, end: 15, rate: 5,  loop: true  },
    { key: 'jump',       start: 16, end: 19, rate: 9,  loop: false },
    { key: 'land',       start: 20, end: 23, rate: 10, loop: false },
];

// ── PALETTE ───────────────────────────────────────────────────
var PAL = {
    grow:  { dead: 0x1a2e1a, alive: 0x00cc44, glow: 0x00ff66, ptcl: 0x44ff88 },
    water: { dead: 0x0d1a2e, alive: 0x0077cc, glow: 0x00aaff, ptcl: 0x66ccff },
    bloom: { dead: 0x2e0d2e, alive: 0xcc44cc, glow: 0xff66ff, ptcl: 0xff99ff },
};

// ── PHYSICS ───────────────────────────────────────────────────
var PLAYER_SPEED = 90;
var JUMP_VEL     = -360;
var GRAVITY      = 18;       // manual gravity per frame
var GROUND_Y     = 432;      // player feet rest here
var ENERGY_COST  = 18;
var P_SCALE      = 2.0;      // player display scale (smaller = less glitchy)

// ─────────────────────────────────────────────────────────────
new Phaser.Game({
    type:            Phaser.AUTO,
    width:           360,
    height:          640,
    backgroundColor: '#050505',
    physics:         { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene:           [MenuScene, GameScene, UIScene, WinScene],
});

// ═════════════════════════════════════════════════════════════
//  MENU SCENE
// ═════════════════════════════════════════════════════════════
function MenuScene() { Phaser.Scene.call(this, { key: 'MenuScene' }); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);
MenuScene.prototype.constructor = MenuScene;

MenuScene.prototype.preload = function () {
    this.load.spritesheet('flow', 'assets/flow_game.png', { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet('tiles', 'assets/tiles_atlas.png', { frameWidth: TILE_SRC, frameHeight: TILE_SRC });
    this.load.audio('tap',    'assets/tap.wav');
    this.load.audio('grow',   'assets/grow.wav');
    this.load.audio('finale', 'assets/finale.wav');
};

MenuScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height, self = this;
    makeDot(this);
    makeBg(this, W, H, 0x0a1a2e, 0x0d2415);
    makeStars(this, W, H, 100);
    registerAnims(this);

    // Floating hero — smooth vertical only, no horizontal wobble
    var hero = this.add.sprite(W / 2, H * 0.34, 'flow').setScale(P_SCALE * 1.4);
    hero.play('idle');

    // Clean vertical float — ONE tween, one axis only
    this.tweens.add({
        targets:  hero,
        y:        H * 0.34 - 10,
        duration: 1800,
        ease:     'Sine.easeInOut',
        yoyo:     true,
        repeat:   -1,
    });

    // Title
    this.add.text(W / 2, H * 0.58, 'FLOW:', {
        fontFamily: 'monospace', fontSize: '32px', color: '#00ff41',
        stroke: '#002211', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.58 + 42, 'BLOOMFALL', {
        fontFamily: 'monospace', fontSize: '20px', color: '#aaffcc',
        stroke: '#002211', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.72, 'restore the bloom  ·  tap to grow', {
        fontFamily: 'monospace', fontSize: '9px', color: '#446644',
    }).setOrigin(0.5);

    var hint = this.add.text(W / 2, H * 0.81, '— TAP TO BEGIN —', {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ff41',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', function () {
        self.cameras.main.fade(350, 0, 0, 0);
        self.time.delayedCall(360, function () {
            self.scene.start('GameScene', { levelIndex: 0 });
            self.scene.launch('UIScene');
        });
    });
};

// ═════════════════════════════════════════════════════════════
//  GAME SCENE
// ═════════════════════════════════════════════════════════════
function GameScene() { Phaser.Scene.call(this, { key: 'GameScene' }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function (data) {
    this.levelIndex = data.levelIndex || 0;
    this.ld = window.FLOW_LEVELS[this.levelIndex] || window.FLOW_LEVELS[0];
};

GameScene.prototype.create = function () {
    var ld = this.ld, W = this.scale.width, H = this.scale.height, self = this;

    // State
    this.energy     = ld.startEnergy;
    this.maxEnergy  = 100;
    this.score      = 0;
    this.ended      = false;
    this.velY       = 0;          // manual vertical velocity
    this.onGround   = true;
    this.shownHints = {};
    this.objs       = [];
    this.currentAnim = 'run';

    this.physics.world.setBounds(0, 0, ld.worldLength, H);

    // ── Backgrounds ────────────────────────────────────────
    buildScrollBg(this, ld, W, H);

    // ── Tile-based platforms ────────────────────────────────
    this.platformGroup = buildTilePlatforms(this, ld, H);

    // ── Decorative tiles ───────────────────────────────────
    buildDecor(this, ld);

    // ── Interactive objects ────────────────────────────────
    this.objs = spawnObjs(this, ld.objects);

    // ── Particle dot texture ───────────────────────────────
    makeDot(this);

    // ── Player ─────────────────────────────────────────────
    // Use image (not physics sprite) so we fully control vertical movement
    this.player = this.add.sprite(ld.playerStart.x, ld.playerStart.y, 'flow');
    this.player.setScale(P_SCALE).setDepth(20);
    registerAnims(this);
    this.player.play('run');
    this.playerX = ld.playerStart.x;
    this.playerY = ld.playerStart.y;

    // ── Camera ─────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, ld.worldLength, H);
    // Follow player manually via setScrollX in update
    this.cameras.main.fadeIn(500);

    // ── Input ──────────────────────────────────────────────
    this.input.on('pointerdown', function () { self.doActivate(); });

    // ── Notify UI ─────────────────────────────────────────
    this.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
};

GameScene.prototype.update = function (time, delta) {
    if (this.ended) return;
    var dt = delta / 1000;  // seconds

    // Horizontal movement
    this.playerX += PLAYER_SPEED * dt * 60 * dt; // pixel per frame equivalent
    // Cleaner: constant pixels per second
    this.playerX += PLAYER_SPEED * dt;

    // Manual gravity
    this.velY += GRAVITY;
    this.playerY += this.velY * dt;

    // Ground clamp
    if (this.playerY >= GROUND_Y) {
        if (!this.onGround) {
            // Just landed
            this.onGround = true;
            this.velY = 0;
            this.playerY = GROUND_Y;
            var self = this;
            this.playAnim('land');
            this.time.delayedCall(180, function () { self.syncAnim(); });
        } else {
            this.velY = 0;
            this.playerY = GROUND_Y;
        }
    } else {
        this.onGround = false;
    }

    // Update sprite position
    this.player.setPosition(this.playerX, this.playerY);

    // Camera follows player with lerp
    var camTargetX = this.playerX - this.scale.width * 0.25;
    var curScrollX = this.cameras.main.scrollX;
    this.cameras.main.setScrollX(curScrollX + (camTargetX - curScrollX) * 0.08);

    // Energy regen
    this.energy = Math.min(this.maxEnergy, this.energy + 0.10);

    // Proximity hints
    var px = this.playerX, self = this;
    this.objs.forEach(function (obj) {
        if (obj.active || !obj.hintText || self.shownHints[obj.id]) return;
        if (Math.abs(obj.x - px) < 210) {
            self.shownHints[obj.id] = true;
            self.tweens.add({ targets: obj.hintText, alpha: 1, duration: 280 });
            self.time.delayedCall(2000, function () {
                if (obj.hintText && obj.hintText.active)
                    self.tweens.add({ targets: obj.hintText, alpha: 0, duration: 350 });
            });
        }
    });

    // Emit to UI
    this.events.emit('stateUpdate', {
        energy: this.energy, maxEnergy: this.maxEnergy, score: this.score,
        done:   this.objs.filter(function (o) { return o.active; }).length,
        total:  this.objs.length,
    });
};

GameScene.prototype.doActivate = function () {
    if (this.energy < ENERGY_COST || this.ended) return;
    this.energy -= ENERGY_COST;

    var self = this;
    this.cameras.main.shake(80, 0.0025);
    pulseSprite(this, this.player, P_SCALE);
    trySound(this, 'tap');

    var nearest = null, minDist = 180;
    this.objs.forEach(function (obj) {
        var d = Math.abs(obj.x - self.playerX);
        if (!obj.active && d < minDist) { nearest = obj; minDist = d; }
    });
    if (!nearest) return;

    nearest.active = true;
    this.score += nearest.scoreValue;
    activateObj(this, nearest);

    if (nearest.type === 'grow') {
        this.velY = JUMP_VEL;
        this.onGround = false;
        this.playAnim('jump');
        trySound(this, 'grow');
    } else if (nearest.type === 'water') {
        this.cameras.main.flash(240, 0, 80, 160, false);
        trySound(this, 'grow');
    } else if (nearest.type === 'bloom') {
        this.time.delayedCall(220, function () { self.doWin(); });
    }
};

GameScene.prototype.doWin = function () {
    var self = this;
    this.ended = true;
    this.playAnim('happy');
    trySound(this, 'finale');
    this.cameras.main.zoomTo(1.2, 1000, 'Sine.easeInOut');

    burst(this, this.playerX, this.playerY - 20, PAL.bloom.ptcl, 25);
    this.time.delayedCall(300, function () { burst(self, self.playerX, self.playerY,      PAL.grow.ptcl,  20); });
    this.time.delayedCall(600, function () { burst(self, self.playerX, self.playerY - 30, PAL.water.ptcl, 15); });

    this.time.delayedCall(1600, function () {
        self.cameras.main.fade(500, 0, 0, 0);
        self.time.delayedCall(520, function () {
            self.scene.stop('UIScene');
            self.scene.start('WinScene', {
                score: self.score, levelIndex: self.levelIndex, levelName: self.ld.name,
            });
        });
    });
};

GameScene.prototype.playAnim = function (key) {
    if (this.currentAnim === key && key !== 'land' && key !== 'jump') return;
    this.currentAnim = key;
    this.player.play(key, true);
};

GameScene.prototype.syncAnim = function () {
    if (this.ended) return;
    var next;
    if      (this.energy < 22) next = 'low_energy';
    else if (this.energy < 50) next = 'idle';
    else                       next = 'run';
    this.playAnim(next);
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE
// ═════════════════════════════════════════════════════════════
function UIScene() { Phaser.Scene.call(this, { key: 'UIScene' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W = this.scale.width, self = this;

    // HUD panel background
    var hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.55);
    hudBg.fillRoundedRect(12, 10, 186, 36, 6);

    this.bar      = this.add.graphics();
    this.energyLbl = this.add.text(18, 14, 'ENERGY', {
        fontFamily: 'monospace', fontSize: '8px', color: '#00ff41', alpha: 0.7
    });
    this.scoreTxt = this.add.text(W - 14, 14, 'SCORE: 0', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(1, 0);
    this.flowTxt  = this.add.text(W - 14, 28, '🌿 0/0', {
        fontFamily: 'monospace', fontSize: '9px', color: '#aaffcc',
    }).setOrigin(1, 0);

    var tap = this.add.text(W / 2, 622, 'TAP TO FLOW', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(0.5).setAlpha(0.38);
    this.tweens.add({ targets: tap, alpha: 0.1, duration: 950, yoyo: true, repeat: -1 });

    var game = this.scene.get('GameScene');
    game.events.on('stateUpdate', function (d) {
        self.drawBar(d.energy, d.maxEnergy);
        self.scoreTxt.setText('SCORE: ' + d.score);
        self.flowTxt.setText('🌿 ' + d.done + '/' + d.total);
    });
    game.events.on('levelStart', function (d) { self.showBanner(d.name); });
};

UIScene.prototype.drawBar = function (energy, max) {
    var bx = 18, by = 26, bw = 150, bh = 8, r = energy / max;
    this.bar.clear();
    this.bar.fillStyle(0x0a0a0a, 1);
    this.bar.fillRoundedRect(bx, by, bw, bh, 4);
    var col = r < 0.3
        ? Phaser.Display.Color.GetColor(220, Math.floor(r * 3 * 110), 0)
        : Phaser.Display.Color.GetColor(0, 210, 68);
    this.bar.fillStyle(col, 1);
    if (r > 0.01) this.bar.fillRoundedRect(bx, by, Math.max(4, bw * r), bh, 4);
    if (r > 0.88) {
        this.bar.lineStyle(1, 0x00ff41, 0.45);
        this.bar.strokeRoundedRect(bx, by, bw, bh, 4);
    }
};

UIScene.prototype.showBanner = function (name) {
    var W = this.scale.width, self = this;
    var t = this.add.text(W / 2, 92, 'LEVEL: ' + name, {
        fontFamily: 'monospace', fontSize: '12px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 380 });
    this.time.delayedCall(2200, function () {
        self.tweens.add({ targets: t, alpha: 0, duration: 450, onComplete: function () { t.destroy(); } });
    });
};

// ═════════════════════════════════════════════════════════════
//  WIN SCENE
// ═════════════════════════════════════════════════════════════
function WinScene() { Phaser.Scene.call(this, { key: 'WinScene' }); }
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;

WinScene.prototype.init = function (d) {
    this.finalScore = d.score      || 0;
    this.levelIndex = d.levelIndex || 0;
    this.levelName  = d.levelName  || '';
};

WinScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height, self = this;
    makeDot(this);
    makeBg(this, W, H, 0x050f05, 0x0a2010);
    makeStars(this, W, H, 80);
    registerAnims(this);

    var hero = this.add.sprite(W / 2, H * 0.26, 'flow').setScale(P_SCALE * 1.4);
    hero.play('happy');
    this.tweens.add({ targets: hero, y: H * 0.26 - 12, duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    this.time.delayedCall(300, function () {
        burst(self, W * 0.28, H * 0.54, PAL.grow.ptcl,  14);
        burst(self, W * 0.72, H * 0.46, PAL.water.ptcl, 14);
        burst(self, W * 0.50, H * 0.64, PAL.bloom.ptcl, 14);
    });

    this.add.text(W / 2, H * 0.50, 'BLOOM RESTORED!', {
        fontFamily: 'monospace', fontSize: '20px',
        color: '#00ff41', stroke: '#002200', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.50 + 34, "WELL FLOW'N 🌿", {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaffcc',
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.50 + 60, 'SCORE: ' + this.finalScore, {
        fontFamily: 'monospace', fontSize: '11px', color: '#00ff41',
    }).setOrigin(0.5);

    var hasNext  = !!(window.FLOW_LEVELS[this.levelIndex + 1]);
    var nextIdx  = hasNext ? this.levelIndex + 1 : 0;
    var btnLabel = hasNext ? '[ NEXT LEVEL ]' : '[ PLAY AGAIN ]';

    var btn = this.add.text(W / 2, H * 0.74, btnLabel, {
        fontFamily: 'monospace', fontSize: '14px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, alpha: 0.28, duration: 700, yoyo: true, repeat: -1 });
    btn.on('pointerdown', function () {
        self.cameras.main.fade(380, 0, 0, 0);
        self.time.delayedCall(400, function () {
            self.scene.start('GameScene', { levelIndex: nextIdx });
            self.scene.launch('UIScene');
        });
    });

    var menu = this.add.text(W / 2, H * 0.82, '[ MAIN MENU ]', {
        fontFamily: 'monospace', fontSize: '10px', color: '#446644',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerdown', function () {
        self.cameras.main.fade(380, 0, 0, 0);
        self.time.delayedCall(400, function () { self.scene.start('MenuScene'); });
    });

    this.cameras.main.fadeIn(500);
};

// ═════════════════════════════════════════════════════════════
//  WORLD BUILDERS
// ═════════════════════════════════════════════════════════════

function buildScrollBg(scene, ld, W, H) {
    var LW = ld.worldLength;

    // Sky gradient
    var sky = scene.add.graphics().setDepth(0);
    sky.fillGradientStyle(ld.bgTop, ld.bgTop, ld.bgBot, ld.bgBot, 1);
    sky.fillRect(0, 0, LW, H);

    // Far mountains (parallax 0.25)
    var mtn = scene.add.graphics().setDepth(1).setScrollFactor(0.25);
    mtn.fillStyle(0x081408, 0.7);
    var mcount = Math.ceil(W / 150) + 2;
    for (var i = 0; i < mcount * 3; i++) {
        var mx = i * 160 + Phaser.Math.Between(-20, 20);
        var mh = Phaser.Math.Between(70, 160);
        mtn.fillTriangle(mx, H - 100, mx + 90, H - 100 - mh, mx + 180, H - 100);
    }

    // Mid hills (parallax 0.5)
    var hill = scene.add.graphics().setDepth(2).setScrollFactor(0.5);
    hill.fillStyle(0x0d200d, 0.55);
    for (var j = 0; j < mcount * 4; j++) {
        var hx = j * 110 + Phaser.Math.Between(0, 30);
        var hh = Phaser.Math.Between(30, 80);
        hill.fillEllipse(hx, H - 96, 160, hh * 2);
    }

    // Ground base
    var gnd = scene.add.graphics().setDepth(3);
    gnd.fillStyle(0x060e06, 1);
    gnd.fillRect(0, 465, LW, H - 465);
}

function buildTilePlatforms(scene, ld, H) {
    var g = scene.add.graphics().setDepth(4);

    ld.platforms.forEach(function (p) {
        var py   = p.y || 450;
        var cols = Math.ceil(p.w / TILE_DSP);

        for (var i = 0; i < cols; i++) {
            var tx = p.x + i * TILE_DSP;
            // Top grass tile
            var frame = TILE_MAP['top_grass'];
            if (p.type === 'water')   frame = TILE_MAP['water_still'];
            if (p.type === 'crystal') frame = TILE_MAP['crystal'];

            var img = scene.add.image(tx + TILE_DSP / 2, py, 'tiles', frame)
                .setDisplaySize(TILE_DSP, TILE_DSP)
                .setDepth(4)
                .setAlpha(0.9);

            // Dead ground fill below
            var fillFrame = TILE_MAP['dead_ground'];
            var fill = scene.add.image(tx + TILE_DSP / 2, py + TILE_DSP, 'tiles', fillFrame)
                .setDisplaySize(TILE_DSP, TILE_DSP)
                .setDepth(3)
                .setAlpha(0.8);
        }
    });
}

function buildDecor(scene, ld) {
    if (!ld.decor) return;
    ld.decor.forEach(function (d) {
        var frame = TILE_MAP[d.tile];
        if (frame === undefined) return;
        var sf = d.scrollFactor !== undefined ? d.scrollFactor : 1;
        scene.add.image(d.x, d.y, 'tiles', frame)
            .setDisplaySize(TILE_DSP, TILE_DSP)
            .setScrollFactor(sf)
            .setDepth(5)
            .setAlpha(0.85);
    });
}

// ═════════════════════════════════════════════════════════════
//  INTERACTIVE OBJECTS
// ═════════════════════════════════════════════════════════════

function spawnObjs(scene, defs) {
    return defs.map(function (def) {
        var col = PAL[def.type] || PAL.grow;

        // Dead tile image
        var deadFrame = TILE_MAP[def.tile_dead];
        var dead = scene.add.image(def.x, def.y, 'tiles', deadFrame !== undefined ? deadFrame : 5)
            .setDisplaySize(TILE_DSP + 4, TILE_DSP + 4)
            .setDepth(8)
            .setAlpha(0.6);

        // Alive tile image (hidden)
        var aliveFrame = TILE_MAP[def.tile_alive];
        var alive = scene.add.image(def.x, def.y, 'tiles', aliveFrame !== undefined ? aliveFrame : 6)
            .setDisplaySize(TILE_DSP + 4, TILE_DSP + 4)
            .setDepth(8)
            .setAlpha(0);

        // Glow ring
        var ring = scene.add.graphics().setDepth(7);
        ring.lineStyle(1.5, col.glow, 0.14);
        ring.strokeCircle(def.x, def.y, 28);

        // Hint text
        var hintText = null;
        if (def.hint) {
            hintText = scene.add.text(def.x, def.y - 44, def.hint, {
                fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
                backgroundColor: '#00000099', padding: { x: 5, y: 3 },
            }).setOrigin(0.5).setAlpha(0).setDepth(16);
        }

        // Subtle idle bob — only Y, small range
        scene.tweens.add({
            targets:  [dead],
            y:        def.y - 4,
            duration: 1200 + Phaser.Math.Between(0, 400),
            ease:     'Sine.easeInOut',
            yoyo:     true,
            repeat:   -1,
        });

        return {
            id: def.id, x: def.x, y: def.y,
            type: def.type, scoreValue: def.scoreValue, hint: def.hint,
            active: false, dead: dead, alive: alive, ring: ring, hintText: hintText,
        };
    });
}

function activateObj(scene, obj) {
    var col = PAL[obj.type] || PAL.grow;

    scene.tweens.killTweensOf(obj.dead);
    scene.tweens.add({ targets: obj.dead, alpha: 0, duration: 200 });

    obj.alive.setScale(0);
    scene.tweens.add({
        targets: obj.alive, alpha: 0.95, scaleX: 1, scaleY: 1,
        duration: 200, ease: 'Back.Out',
    });

    // Flash ring
    obj.ring.clear();
    obj.ring.lineStyle(2, col.glow, 0.7);
    obj.ring.strokeCircle(obj.x, obj.y, 28);
    scene.tweens.add({ targets: obj.ring, alpha: 0, duration: 500 });

    // Particle burst
    burst(scene, obj.x, obj.y, col.ptcl, 10);

    // Score pop
    var pop = scene.add.text(obj.x, obj.y - 26, '+' + obj.scoreValue, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(22);
    scene.tweens.add({
        targets: pop, y: obj.y - 58, alpha: 0,
        duration: 650, ease: 'Quad.Out',
        onComplete: function () { pop.destroy(); },
    });

    // Alive pulse
    scene.tweens.add({
        targets: obj.alive, alpha: 0.65, duration: 1000,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 150,
    });
}

// ═════════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ═════════════════════════════════════════════════════════════

function makeDot(scene) {
    if (scene.textures.exists('dot')) return;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('dot', 10, 10);
    g.destroy();
}

function makeBg(scene, W, H, top, bot) {
    var g = scene.add.graphics();
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, W, H);
}

function makeStars(scene, W, H, count) {
    var g = scene.add.graphics();
    for (var i = 0; i < count; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.44));
        g.fillCircle(
            Phaser.Math.Between(0, W),
            Phaser.Math.Between(0, H * 0.75),
            Phaser.Math.FloatBetween(0.4, 1.3)
        );
    }
    // Twinkle a few
    for (var t = 0; t < 6; t++) {
        var dot = scene.add.graphics();
        dot.fillStyle(0xffffff, 0.5);
        dot.fillCircle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(10, H * 0.5), 1.2);
        scene.tweens.add({
            targets: dot, alpha: 0.06, duration: Phaser.Math.Between(800, 2000),
            yoyo: true, repeat: -1, delay: t * 250,
        });
    }
}

function registerAnims(scene) {
    ANIM_DEFS.forEach(function (d) {
        if (scene.anims.exists(d.key)) return;
        scene.anims.create({
            key:       d.key,
            frames:    scene.anims.generateFrameNumbers('flow', { start: d.start, end: d.end }),
            frameRate: d.rate,
            repeat:    d.loop ? -1 : 0,
        });
    });
}

function burst(scene, x, y, tint, count) {
    try {
        var e = scene.add.particles(x, y, 'dot', {
            speed:    { min: 45, max: 160 },
            angle:    { min: 0,  max: 360 },
            scale:    { start: 1.0, end: 0 },
            lifespan: 520,
            quantity: count,
            tint:     tint,
            emitting: false,
        });
        e.explode(count);
        scene.time.delayedCall(650, function () { if (e && e.active) e.destroy(); });
    } catch (_) {}
}

function pulseSprite(scene, target, base) {
    scene.tweens.add({
        targets: target, scaleX: base * 1.15, scaleY: base * 0.88,
        duration: 70, yoyo: true, ease: 'Quad.Out',
    });
}

function trySound(scene, key) {
    try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.36 }); }
    catch (_) {}
}
