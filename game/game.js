/**
 * FLOW: BLOOMFALL — game.js
 * Requires: Phaser 3.60 | levels.js loaded first in index.html
 *
 * Spritesheet (assets/flow_game.png) — 103×96px per frame, 4 cols × 6 rows
 * All frames bottom-anchored so feet never jump between animations.
 *   Row 0  frames  0– 3   IDLE
 *   Row 1  frames  4– 7   RUN
 *   Row 2  frames  8–11   HAPPY
 *   Row 3  frames 12–15   LOW_ENERGY
 *   Row 4  frames 16–19   JUMP
 *   Row 5  frames 20–23   LAND
 *
 * Tile atlas (assets/tiles_atlas.png) — 64×64px per tile, 8 cols × 3 rows
 */

// ── SPRITE CONFIG ─────────────────────────────────────────────
var SPRITE_FW = 103;
var SPRITE_FH = 96;   // unified height, bottom-anchored

var ANIM_DEFS = [
    { key: 'idle',       start: 0,  end: 3,  rate: 5, loop: true  },
    { key: 'run',        start: 4,  end: 7,  rate: 9, loop: true  },
    { key: 'happy',      start: 8,  end: 11, rate: 7, loop: true  },
    { key: 'low_energy', start: 12, end: 15, rate: 5, loop: true  },
    { key: 'jump',       start: 16, end: 19, rate: 9, loop: false },
    { key: 'land',       start: 20, end: 23, rate: 9, loop: false },
];

// ── TILE CONFIG ───────────────────────────────────────────────
var TILE_SRC  = 64;   // source size in atlas
var TILE_DSP  = 48;   // display size on screen
var ATLAS_COLS = 8;
var TILE_MAP  = {
    dead_ground: 0, alive_ground: 1, top_grass: 2,   rock: 3,
    vines: 4,       dead_plant: 5,   grow_plant1: 6,  grow_plant2: 7,
    bloom_flower: 8, bush: 9,        water_still: 10, water_flow1: 11,
    water_flow2: 12, waterfall_top: 13, waterfall_mid: 14, waterfall_btm: 15,
    lily_pad: 16,   mushroom: 17,    tree_trunk: 18,  leaves: 19,
    background1: 20, background2: 21, cloud: 22,      crystal: 23,
};

// ── PALETTE ───────────────────────────────────────────────────
var PAL = {
    grow:  { ptcl: 0x44ff88 },
    water: { ptcl: 0x66ccff },
    bloom: { ptcl: 0xff99ff },
};

// ── GAME CONSTANTS ────────────────────────────────────────────
var PLAYER_SPEED = 90;    // px per second
var JUMP_VEL     = -420;  // px per second upward
var GRAVITY      = 900;   // px per second² downward
var GROUND_Y     = 432;   // Y where player feet rest
var ENERGY_COST  = 18;
var P_SCALE      = 2.0;

// ── BOOT ──────────────────────────────────────────────────────
new Phaser.Game({
    type:            Phaser.AUTO,
    width:           360,
    height:          640,
    backgroundColor: '#050505',
    physics:         { default: 'arcade', arcade: { debug: false } },
    scene:           [MenuScene, GameScene, UIScene, WinScene],
});

// ═════════════════════════════════════════════════════════════
//  MENU SCENE
// ═════════════════════════════════════════════════════════════
function MenuScene() { Phaser.Scene.call(this, { key: 'MenuScene' }); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);
MenuScene.prototype.constructor = MenuScene;

MenuScene.prototype.preload = function () {
    this.load.spritesheet('flow',  'assets/flow_game.png',   { frameWidth: SPRITE_FW, frameHeight: SPRITE_FH });
    this.load.spritesheet('tiles', 'assets/tiles_atlas.png', { frameWidth: TILE_SRC,  frameHeight: TILE_SRC  });
    this.load.audio('tap',    'assets/tap.wav');
    this.load.audio('grow',   'assets/grow.wav');
    this.load.audio('finale', 'assets/finale.wav');
};

MenuScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height, self = this;

    makeDot(this);
    registerAnims(this);
    drawBg(this, W, H, 0x0a1a2e, 0x0d2415);
    drawStars(this, W, H, 100);

    // Hero — single clean Y float, no competing tweens
    var hero = this.add.sprite(W / 2, H * 0.35, 'flow').setScale(P_SCALE * 1.5).setDepth(2);
    hero.play('idle');
    this.tweens.add({
        targets: hero, y: H * 0.35 - 12,
        duration: 1800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });

    this.add.text(W / 2, H * 0.60, 'FLOW:', {
        fontFamily: 'monospace', fontSize: '32px', color: '#00ff41',
        stroke: '#002211', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.60 + 44, 'BLOOMFALL', {
        fontFamily: 'monospace', fontSize: '20px', color: '#aaffcc',
        stroke: '#002211', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.73, 'restore the bloom  ·  tap to grow', {
        fontFamily: 'monospace', fontSize: '9px', color: '#446644',
    }).setOrigin(0.5);

    var hint = this.add.text(W / 2, H * 0.82, '— TAP TO BEGIN —', {
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

    // ── State ──────────────────────────────────────────────
    this.energy      = ld.startEnergy;
    this.maxEnergy   = 100;
    this.score       = 0;
    this.ended       = false;
    this.velY        = 0;
    this.onGround    = true;
    this.shownHints  = {};
    this.objs        = [];
    this.curAnim     = '';

    // ── World ──────────────────────────────────────────────
    // Use Phaser camera bounds — no manual scroll
    this.cameras.main.setBounds(0, 0, ld.worldLength, H);

    // ── Environment ────────────────────────────────────────
    drawScrollBg(this, ld, H);
    buildPlatforms(this, ld);
    buildDecor(this, ld);

    // ── Objects ────────────────────────────────────────────
    makeDot(this);
    this.objs = spawnObjs(this, ld.objects);

    // ── Player — plain sprite, NOT physics ─────────────────
    // We manage physics manually so movement is perfectly smooth
    this.px = ld.playerStart.x;
    this.py = ld.playerStart.y;
    this.player = this.add.sprite(this.px, this.py, 'flow').setScale(P_SCALE).setDepth(20);
    registerAnims(this);
    this.setAnim('run');

    // Camera follows a plain object we update every frame
    this.camTarget = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.camTarget, true, 0.1, 0.1);
    this.cameras.main.fadeIn(500);

    // ── Input ──────────────────────────────────────────────
    this.input.on('pointerdown', function () { self.activate(); });

    // Emit level name to UIScene after a short delay
    // (UIScene may not have finished create() yet if launched simultaneously)
    this.time.delayedCall(100, function () {
        self.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
    });
};

GameScene.prototype.update = function (time, delta) {
    if (this.ended) return;

    var dt = Math.min(delta / 1000, 0.05); // cap at 50ms to prevent tunnelling

    // ── Horizontal ─────────────────────────────────────────
    this.px += PLAYER_SPEED * dt;

    // ── Vertical (manual gravity) ───────────────────────────
    this.velY += GRAVITY * dt;
    this.py   += this.velY * dt;

    // ── Ground clamp ────────────────────────────────────────
    if (this.py >= GROUND_Y) {
        this.py   = GROUND_Y;
        if (!this.onGround && this.velY > 0) {
            // Landing
            this.onGround = true;
            this.velY = 0;
            var self = this;
            this.setAnim('land');
            this.time.delayedCall(200, function () { self.syncAnim(); });
        } else {
            this.onGround = true;
            this.velY = 0;
        }
    } else {
        this.onGround = false;
    }

    // ── Update sprite + camera target ──────────────────────
    this.player.setPosition(this.px, this.py);
    this.camTarget.x = this.px;
    this.camTarget.y = this.py;

    // ── Energy regen ────────────────────────────────────────
    this.energy = Math.min(this.maxEnergy, this.energy + 0.10);

    // ── Proximity hints ─────────────────────────────────────
    var px = this.px, self = this;
    this.objs.forEach(function (obj) {
        if (obj.active || !obj.hintText || self.shownHints[obj.id]) return;
        if (Math.abs(obj.x - px) < 200) {
            self.shownHints[obj.id] = true;
            self.tweens.add({ targets: obj.hintText, alpha: 1, duration: 280 });
            self.time.delayedCall(2000, function () {
                if (obj.hintText && obj.hintText.active)
                    self.tweens.add({ targets: obj.hintText, alpha: 0, duration: 350 });
            });
        }
    });

    // ── Emit state to UIScene ───────────────────────────────
    this.events.emit('stateUpdate', {
        energy:    this.energy,
        maxEnergy: this.maxEnergy,
        score:     this.score,
        done:      this.objs.filter(function (o) { return o.active; }).length,
        total:     this.objs.length,
    });
};

GameScene.prototype.activate = function () {
    if (this.energy < ENERGY_COST || this.ended) return;
    this.energy -= ENERGY_COST;

    var self = this;
    this.cameras.main.shake(80, 0.0022);
    spritePulse(this, this.player, P_SCALE);
    trySound(this, 'tap');

    var nearest = null, minDist = 180;
    this.objs.forEach(function (obj) {
        var d = Math.abs(obj.x - self.px);
        if (!obj.active && d < minDist) { nearest = obj; minDist = d; }
    });
    if (!nearest) return;

    nearest.active = true;
    this.score += nearest.scoreValue;
    activateObj(this, nearest);

    if (nearest.type === 'grow') {
        this.velY = JUMP_VEL;
        this.onGround = false;
        this.setAnim('jump');
        trySound(this, 'grow');
    } else if (nearest.type === 'water') {
        this.cameras.main.flash(220, 0, 70, 150, false);
        trySound(this, 'grow');
    } else if (nearest.type === 'bloom') {
        this.time.delayedCall(200, function () { self.win(); });
    }
};

GameScene.prototype.win = function () {
    var self = this;
    this.ended = true;
    this.setAnim('happy');
    trySound(this, 'finale');
    this.cameras.main.zoomTo(1.2, 1000, 'Sine.easeInOut');

    burst(this, this.px, this.py - 20, PAL.bloom.ptcl, 24);
    this.time.delayedCall(300, function () { burst(self, self.px, self.py,      PAL.grow.ptcl,  18); });
    this.time.delayedCall(600, function () { burst(self, self.px, self.py - 30, PAL.water.ptcl, 14); });

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

GameScene.prototype.setAnim = function (key) {
    if (this.curAnim === key && key !== 'land' && key !== 'jump') return;
    this.curAnim = key;
    this.player.play(key, true);
};

GameScene.prototype.syncAnim = function () {
    if (this.ended) return;
    if      (this.energy < 22) this.setAnim('low_energy');
    else if (this.energy < 50) this.setAnim('idle');
    else                       this.setAnim('run');
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE (HUD — runs parallel to GameScene)
// ═════════════════════════════════════════════════════════════
function UIScene() { Phaser.Scene.call(this, { key: 'UIScene' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W = this.scale.width, self = this;

    // Panel
    var bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(10, 8, 192, 42, 6);

    this.bar = this.add.graphics();
    this.add.text(16, 12, 'ENERGY', { fontFamily: 'monospace', fontSize: '8px', color: '#00ff41', alpha: 0.7 });

    this.scoreTxt = this.add.text(W - 12, 12, 'SCORE: 0', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(1, 0);

    this.flowTxt = this.add.text(W - 12, 26, '🌿 0/0', {
        fontFamily: 'monospace', fontSize: '9px', color: '#aaffcc',
    }).setOrigin(1, 0);

    var tap = this.add.text(W / 2, 624, 'TAP TO FLOW', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(0.5).setAlpha(0.36);
    this.tweens.add({ targets: tap, alpha: 0.09, duration: 950, yoyo: true, repeat: -1 });

    // Listen to GameScene events
    var game = this.scene.get('GameScene');
    game.events.on('stateUpdate', function (d) {
        self.drawBar(d.energy, d.maxEnergy);
        self.scoreTxt.setText('SCORE: ' + d.score);
        self.flowTxt.setText('🌿 ' + d.done + '/' + d.total);
    });
    game.events.on('levelStart', function (d) {
        self.banner(d.name);
    });
};

UIScene.prototype.drawBar = function (energy, max) {
    var bx = 16, by = 24, bw = 152, bh = 8, r = energy / max;
    this.bar.clear();
    this.bar.fillStyle(0x0a0a0a, 1);
    this.bar.fillRoundedRect(bx, by, bw, bh, 4);
    var col = r < 0.3
        ? Phaser.Display.Color.GetColor(210, Math.floor(r * 3 * 100), 0)
        : Phaser.Display.Color.GetColor(0, 210, 68);
    this.bar.fillStyle(col, 1);
    if (r > 0.01) this.bar.fillRoundedRect(bx, by, Math.max(4, bw * r), bh, 4);
};

UIScene.prototype.banner = function (name) {
    var W = this.scale.width, self = this;
    var t = this.add.text(W / 2, 90, 'LEVEL: ' + name, {
        fontFamily: 'monospace', fontSize: '12px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 350 });
    this.time.delayedCall(2200, function () {
        self.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: function () { t.destroy(); } });
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
    drawBg(this, W, H, 0x050f05, 0x0a2010);
    drawStars(this, W, H, 80);
    registerAnims(this);

    var hero = this.add.sprite(W / 2, H * 0.27, 'flow').setScale(P_SCALE * 1.5).setDepth(2);
    hero.play('happy');
    this.tweens.add({
        targets: hero, y: H * 0.27 - 12,
        duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });

    this.time.delayedCall(300, function () {
        burst(self, W * 0.28, H * 0.55, PAL.grow.ptcl,  14);
        burst(self, W * 0.72, H * 0.46, PAL.water.ptcl, 14);
        burst(self, W * 0.50, H * 0.65, PAL.bloom.ptcl, 14);
    });

    this.add.text(W / 2, H * 0.50, 'BLOOM RESTORED!', {
        fontFamily: 'monospace', fontSize: '20px',
        color: '#00ff41', stroke: '#002200', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.50 + 34, "WELL FLOW'N 🌿", {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaffcc',
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.50 + 58, 'SCORE: ' + this.finalScore, {
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
        self.cameras.main.fade(350, 0, 0, 0);
        self.time.delayedCall(370, function () {
            self.scene.start('GameScene', { levelIndex: nextIdx });
            self.scene.launch('UIScene');
        });
    });

    this.add.text(W / 2, H * 0.82, '[ MAIN MENU ]', {
        fontFamily: 'monospace', fontSize: '10px', color: '#446644',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    .on('pointerdown', function () {
        self.cameras.main.fade(350, 0, 0, 0);
        self.time.delayedCall(370, function () { self.scene.start('MenuScene'); });
    });

    this.cameras.main.fadeIn(500);
};

// ═════════════════════════════════════════════════════════════
//  WORLD BUILDERS
// ═════════════════════════════════════════════════════════════

function drawScrollBg(scene, ld, H) {
    var LW = ld.worldLength;

    // Sky gradient across full world width
    var sky = scene.add.graphics().setDepth(0);
    sky.fillGradientStyle(ld.bgTop, ld.bgTop, ld.bgBot, ld.bgBot, 1);
    sky.fillRect(0, 0, LW, H);

    // Mountains — parallax 0.25
    var mtn = scene.add.graphics().setScrollFactor(0.25).setDepth(1);
    mtn.fillStyle(0x071207, 0.75);
    for (var i = 0; i < Math.ceil(LW / 150); i++) {
        var mx = i * 155 + Phaser.Math.Between(-15, 15);
        var mh = Phaser.Math.Between(80, 170);
        mtn.fillTriangle(mx, H - 95, mx + 85, H - 95 - mh, mx + 170, H - 95);
    }

    // Mid foliage hills — parallax 0.5
    var hills = scene.add.graphics().setScrollFactor(0.5).setDepth(2);
    hills.fillStyle(0x0d1f0d, 0.6);
    for (var j = 0; j < Math.ceil(LW / 100); j++) {
        hills.fillEllipse(j * 105 + Phaser.Math.Between(0, 25), H - 90,
                          160, Phaser.Math.Between(50, 100));
    }

    // Ground base
    var gnd = scene.add.graphics().setDepth(3);
    gnd.fillStyle(0x060e06, 1);
    gnd.fillRect(0, 460, LW, H - 460);
    // Top edge stripe
    gnd.fillStyle(0x003311, 1);
    gnd.fillRect(0, 458, LW, 4);
}

function buildPlatforms(scene, ld) {
    var g = scene.add.graphics().setDepth(4);
    ld.platforms.forEach(function (p) {
        var py   = p.y || 450;
        var cols = Math.ceil(p.w / TILE_DSP);
        for (var i = 0; i < cols; i++) {
            var tx = p.x + i * TILE_DSP;
            // Top surface tile
            var topFrame = TILE_MAP['top_grass'];
            scene.add.image(tx + TILE_DSP / 2, py, 'tiles', topFrame)
                .setDisplaySize(TILE_DSP, TILE_DSP).setDepth(4).setAlpha(0.92);
            // Fill tile below
            scene.add.image(tx + TILE_DSP / 2, py + TILE_DSP, 'tiles', TILE_MAP['dead_ground'])
                .setDisplaySize(TILE_DSP, TILE_DSP).setDepth(3).setAlpha(0.85);
        }
    });
}

function buildDecor(scene, ld) {
    if (!ld.decor) return;
    ld.decor.forEach(function (d) {
        var frame = TILE_MAP[d.tile];
        if (frame === undefined) return;
        scene.add.image(d.x, d.y, 'tiles', frame)
            .setDisplaySize(TILE_DSP, TILE_DSP)
            .setScrollFactor(d.scrollFactor !== undefined ? d.scrollFactor : 1)
            .setDepth(5).setAlpha(0.88);
    });
}

// ═════════════════════════════════════════════════════════════
//  INTERACTIVE OBJECTS
// ═════════════════════════════════════════════════════════════

function spawnObjs(scene, defs) {
    return defs.map(function (def) {
        var col = PAL[def.type] || PAL.grow;
        var df  = TILE_MAP[def.tile_dead]  !== undefined ? TILE_MAP[def.tile_dead]  : 5;
        var af  = TILE_MAP[def.tile_alive] !== undefined ? TILE_MAP[def.tile_alive] : 6;

        var dead = scene.add.image(def.x, def.y, 'tiles', df)
            .setDisplaySize(TILE_DSP + 6, TILE_DSP + 6).setDepth(8).setAlpha(0.65);

        var alive = scene.add.image(def.x, def.y, 'tiles', af)
            .setDisplaySize(TILE_DSP + 6, TILE_DSP + 6).setDepth(8).setAlpha(0);

        var ring = scene.add.graphics().setDepth(7);
        ring.lineStyle(1.5, 0x00ff88, 0.15);
        ring.strokeCircle(def.x, def.y, 30);

        var hintText = null;
        if (def.hint) {
            hintText = scene.add.text(def.x, def.y - 46, def.hint, {
                fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
                backgroundColor: '#00000099', padding: { x: 5, y: 3 },
            }).setOrigin(0.5).setAlpha(0).setDepth(16);
        }

        // Subtle idle bob — Y only, gentle
        scene.tweens.add({
            targets: dead, y: def.y - 4,
            duration: 1100 + Phaser.Math.Between(0, 400),
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });

        return {
            id: def.id, x: def.x, y: def.y,
            type: def.type, scoreValue: def.scoreValue,
            active: false, dead: dead, alive: alive,
            ring: ring, hintText: hintText,
        };
    });
}

function activateObj(scene, obj) {
    scene.tweens.killTweensOf(obj.dead);
    scene.tweens.add({ targets: obj.dead, alpha: 0, duration: 180 });

    obj.alive.setScale(0);
    scene.tweens.add({
        targets: obj.alive, alpha: 0.95, scaleX: 1, scaleY: 1,
        duration: 200, ease: 'Back.Out',
    });

    obj.ring.clear();
    obj.ring.lineStyle(2, 0x00ff88, 0.7);
    obj.ring.strokeCircle(obj.x, obj.y, 30);
    scene.tweens.add({ targets: obj.ring, alpha: 0, duration: 500 });

    burst(scene, obj.x, obj.y, (PAL[obj.type] || PAL.grow).ptcl, 10);

    var pop = scene.add.text(obj.x, obj.y - 26, '+' + obj.scoreValue, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(22);
    scene.tweens.add({
        targets: pop, y: obj.y - 58, alpha: 0, duration: 620, ease: 'Quad.Out',
        onComplete: function () { pop.destroy(); },
    });

    scene.tweens.add({
        targets: obj.alive, alpha: 0.65, duration: 1000,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 120,
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

function drawBg(scene, W, H, top, bot) {
    var g = scene.add.graphics();
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, W, H);
}

function drawStars(scene, W, H, count) {
    var g = scene.add.graphics();
    for (var i = 0; i < count; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.44));
        g.fillCircle(
            Phaser.Math.Between(0, W),
            Phaser.Math.Between(0, H * 0.75),
            Phaser.Math.FloatBetween(0.4, 1.3)
        );
    }
    for (var t = 0; t < 5; t++) {
        var dot = scene.add.graphics();
        dot.fillStyle(0xffffff, 0.5);
        dot.fillCircle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(10, H * 0.5), 1.2);
        scene.tweens.add({
            targets: dot, alpha: 0.05,
            duration: Phaser.Math.Between(900, 2200),
            yoyo: true, repeat: -1, delay: t * 280,
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
            speed: { min: 45, max: 155 }, angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 }, lifespan: 500,
            quantity: count, tint: tint, emitting: false,
        });
        e.explode(count);
        scene.time.delayedCall(620, function () { if (e && e.active) e.destroy(); });
    } catch (_) {}
}

function spritePulse(scene, target, base) {
    scene.tweens.add({
        targets: target, scaleX: base * 1.14, scaleY: base * 0.88,
        duration: 70, yoyo: true, ease: 'Quad.Out',
    });
}

function trySound(scene, key) {
    try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.36 }); }
    catch (_) {}
}
