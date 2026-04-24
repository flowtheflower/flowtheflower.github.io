/**
 * FLOW: BLOOMFALL — game.js
 * Requires: Phaser 3.60 | levels.js loaded first
 *
 * Spritesheet assets/flow_game.png — 99×88px per frame, 4 cols × 6 rows
 * All frames bottom-anchored, label-free.
 *   Row 0  0– 3   IDLE
 *   Row 1  4– 7   RUN
 *   Row 2  8–11   HAPPY
 *   Row 3  12–15  LOW_ENERGY
 *   Row 4  16–19  JUMP
 *   Row 5  20–23  LAND
 */

// ── SPRITE ────────────────────────────────────────────────────
var SPR_W  = 99;
var SPR_H  = 88;
var P_SCALE = 1.3;   // 99*1.3 ≈ 129px wide, 88*1.3 ≈ 114px tall — right-sized character

var ANIMS = [
    { key: 'idle',       s: 0,  e: 3,  fps: 6,  loop: true  },
    { key: 'run',        s: 4,  e: 7,  fps: 10, loop: true  },
    { key: 'happy',      s: 8,  e: 11, fps: 8,  loop: true  },
    { key: 'low_energy', s: 12, e: 15, fps: 5,  loop: true  },
    { key: 'jump',       s: 16, e: 19, fps: 10, loop: false },
    { key: 'land',       s: 20, e: 23, fps: 10, loop: false },
];

// ── TILES ─────────────────────────────────────────────────────
var TILE_SRC = 64;
var TILE_DSP = 48;
var TILE = {
    dead_ground:0, alive_ground:1, top_grass:2,   rock:3,
    vines:4,       dead_plant:5,   grow_plant1:6,  grow_plant2:7,
    bloom_flower:8,bush:9,         water_still:10, water_flow1:11,
    water_flow2:12,waterfall_top:13,waterfall_mid:14,waterfall_btm:15,
    lily_pad:16,   mushroom:17,    tree_trunk:18,  leaves:19,
    background1:20,background2:21, cloud:22,       crystal:23,
};

// ── COLOURS ───────────────────────────────────────────────────
var PAL = {
    grow:  { ptcl: 0x44ff88 },
    water: { ptcl: 0x66ccff },
    bloom: { ptcl: 0xff99ff },
};

// ── PHYSICS ───────────────────────────────────────────────────
var SPEED   = 88;    // px/s horizontal
var JUMP    = -400;  // px/s initial vertical
var GRAV    = 860;   // px/s² downward
var FLOOR_Y = 438;   // world Y where Flow's feet rest
var E_COST  = 18;

// ─────────────────────────────────────────────────────────────
new Phaser.Game({
    type:  Phaser.AUTO,
    width: 360, height: 640,
    backgroundColor: '#050505',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [MenuScene, GameScene, UIScene, WinScene],
});

// ═════════════════════════════════════════════════════════════
//  MENU SCENE
// ═════════════════════════════════════════════════════════════
function MenuScene() { Phaser.Scene.call(this, { key: 'MenuScene' }); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);
MenuScene.prototype.constructor = MenuScene;

MenuScene.prototype.preload = function () {
    this.load.spritesheet('flow',  'assets/flow_game.png',   { frameWidth: SPR_W, frameHeight: SPR_H });
    this.load.spritesheet('tiles', 'assets/tiles_atlas.png', { frameWidth: TILE_SRC, frameHeight: TILE_SRC });
    this.load.audio('tap',    'assets/tap.wav');
    this.load.audio('grow',   'assets/grow.wav');
    this.load.audio('finale', 'assets/finale.wav');
};

MenuScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height, self = this;
    makeDot(this);
    registerAnims(this);
    bgGrad(this, W, H, 0x0a1a2e, 0x0d2415);
    stars(this, W, H, 100);

    // ── Hero — centred, Y-float only, scale appropriate ──
    var heroScale = P_SCALE * 1.6;  // slightly bigger on menu = ~145px tall
    var heroY     = H * 0.32;
    var hero      = this.add.sprite(W / 2, heroY, 'flow').setScale(heroScale).setDepth(2);
    hero.play('idle');

    // ONE tween, Y axis only, gentle 8px bob
    this.tweens.add({
        targets: hero,
        y: heroY - 8,
        duration: 1800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });

    // Title
    this.add.text(W / 2, H * 0.60, 'FLOW:', {
        fontFamily: 'monospace', fontSize: '32px',
        color: '#00ff41', stroke: '#002211', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.60 + 42, 'BLOOMFALL', {
        fontFamily: 'monospace', fontSize: '20px',
        color: '#aaffcc', stroke: '#002211', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.73, 'restore the bloom  ·  tap to grow', {
        fontFamily: 'monospace', fontSize: '9px', color: '#446644',
    }).setOrigin(0.5);

    var hint = this.add.text(W / 2, H * 0.82, '— TAP TO BEGIN —', {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ff41',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', function () {
        self.cameras.main.fade(300, 0, 0, 0);
        self.time.delayedCall(320, function () {
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

GameScene.prototype.init = function (d) {
    this.levelIndex = d.levelIndex || 0;
    this.ld = window.FLOW_LEVELS[this.levelIndex] || window.FLOW_LEVELS[0];
};

GameScene.prototype.create = function () {
    var ld = this.ld, W = this.scale.width, H = this.scale.height, self = this;

    this.energy    = ld.startEnergy;
    this.maxEnergy = 100;
    this.score     = 0;
    this.ended     = false;
    this.velY      = 0;
    this.grounded  = true;
    this.hints     = {};
    this.objs      = [];
    this.curAnim   = '';

    this.cameras.main.setBounds(0, 0, ld.worldLength, H);

    // World
    buildBg(this, ld, H);
    buildPlatforms(this, ld);
    buildDecor(this, ld);

    // Objects
    makeDot(this);
    this.objs = spawnObjs(this, ld.objects);

    // Player — plain sprite, manual physics
    this.px = ld.playerStart.x;
    this.py = ld.playerStart.y;
    this.player = this.add.sprite(this.px, this.py, 'flow')
        .setScale(P_SCALE).setDepth(20);
    registerAnims(this);
    this.playAnim('run');

    // Camera: follow a target object, offset so Flow runs at 28% from left
    // This means you can see ahead — standard side-scroller feel
    this.camTarget = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.camTarget, true, 0.10, 0.10);
    this.cameras.main.setFollowOffset(-(W * 0.22), 0);
    this.cameras.main.fadeIn(400);

    this.input.on('pointerdown', function () { self.activate(); });

    // Slight delay so UIScene is ready before first emit
    this.time.delayedCall(80, function () {
        self.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
    });
};

GameScene.prototype.update = function (time, delta) {
    if (this.ended) return;

    var dt = Math.min(delta / 1000, 0.05);

    // Horizontal
    this.px += SPEED * dt;

    // Vertical
    this.velY += GRAV * dt;
    this.py   += this.velY * dt;

    // Floor clamp
    if (this.py >= FLOOR_Y) {
        this.py = FLOOR_Y;
        if (!this.grounded) {
            this.grounded = true;
            this.velY = 0;
            var self = this;
            this.playAnim('land');
            this.time.delayedCall(180, function () { self.syncAnim(); });
        } else {
            this.velY = 0;
        }
    } else {
        this.grounded = false;
    }

    this.player.setPosition(this.px, this.py);
    this.camTarget.x = this.px;
    this.camTarget.y = this.py;

    // Regen
    this.energy = Math.min(this.maxEnergy, this.energy + 0.10);

    // Hints
    var px = this.px, self = this;
    this.objs.forEach(function (o) {
        if (o.active || !o.hintTxt || self.hints[o.id]) return;
        if (Math.abs(o.x - px) < 200) {
            self.hints[o.id] = true;
            self.tweens.add({ targets: o.hintTxt, alpha: 1, duration: 260 });
            self.time.delayedCall(1800, function () {
                if (o.hintTxt && o.hintTxt.active)
                    self.tweens.add({ targets: o.hintTxt, alpha: 0, duration: 300 });
            });
        }
    });

    this.events.emit('stateUpdate', {
        energy: this.energy, maxEnergy: this.maxEnergy, score: this.score,
        done: this.objs.filter(function (o) { return o.active; }).length,
        total: this.objs.length,
    });
};

GameScene.prototype.activate = function () {
    if (this.energy < E_COST || this.ended) return;
    this.energy -= E_COST;

    var self = this;
    this.cameras.main.shake(75, 0.002);
    pulseSpr(this, this.player, P_SCALE);
    trySound(this, 'tap');

    var nearest = null, best = 175;
    this.objs.forEach(function (o) {
        var d = Math.abs(o.x - self.px);
        if (!o.active && d < best) { nearest = o; best = d; }
    });
    if (!nearest) return;

    nearest.active = true;
    this.score += nearest.scoreValue;
    activateObj(this, nearest);

    if (nearest.type === 'grow') {
        this.velY = JUMP;
        this.grounded = false;
        this.playAnim('jump');
        trySound(this, 'grow');
    } else if (nearest.type === 'water') {
        this.cameras.main.flash(200, 0, 70, 150, false);
        trySound(this, 'grow');
    } else if (nearest.type === 'bloom') {
        this.time.delayedCall(200, function () { self.win(); });
    }
};

GameScene.prototype.win = function () {
    var self = this;
    this.ended = true;
    this.playAnim('happy');
    trySound(this, 'finale');
    this.cameras.main.zoomTo(1.15, 900, 'Sine.easeInOut');

    burst(this, this.px, this.py - 16, PAL.bloom.ptcl, 22);
    this.time.delayedCall(280, function () { burst(self, self.px, self.py, PAL.grow.ptcl, 18); });
    this.time.delayedCall(560, function () { burst(self, self.px, self.py - 24, PAL.water.ptcl, 14); });

    this.time.delayedCall(1600, function () {
        self.cameras.main.fade(450, 0, 0, 0);
        self.time.delayedCall(470, function () {
            self.scene.stop('UIScene');
            self.scene.start('WinScene', {
                score: self.score, levelIndex: self.levelIndex, levelName: self.ld.name,
            });
        });
    });
};

GameScene.prototype.playAnim = function (key) {
    if (this.curAnim === key && key !== 'land' && key !== 'jump') return;
    this.curAnim = key;
    this.player.play(key, true);
};

GameScene.prototype.syncAnim = function () {
    if (this.ended) return;
    if      (this.energy < 22) this.playAnim('low_energy');
    else if (this.energy < 50) this.playAnim('idle');
    else                       this.playAnim('run');
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE
// ═════════════════════════════════════════════════════════════
function UIScene() { Phaser.Scene.call(this, { key: 'UIScene' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W = this.scale.width, self = this;

    var bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.52);
    bg.fillRoundedRect(10, 8, 192, 40, 6);

    this.bar = this.add.graphics();
    this.add.text(17, 12, 'ENERGY', { fontFamily: 'monospace', fontSize: '8px', color: '#00ff41' });
    this.scoreTxt = this.add.text(W - 12, 12, 'SCORE: 0', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(1, 0);
    this.flowTxt = this.add.text(W - 12, 26, '🌿 0/0', {
        fontFamily: 'monospace', fontSize: '9px', color: '#aaffcc',
    }).setOrigin(1, 0);

    var tap = this.add.text(W / 2, 624, 'TAP TO FLOW', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(0.5).setAlpha(0.35);
    this.tweens.add({ targets: tap, alpha: 0.08, duration: 1000, yoyo: true, repeat: -1 });

    var game = this.scene.get('GameScene');
    game.events.on('stateUpdate', function (d) {
        self.drawBar(d.energy, d.maxEnergy);
        self.scoreTxt.setText('SCORE: ' + d.score);
        self.flowTxt.setText('🌿 ' + d.done + '/' + d.total);
    });
    game.events.on('levelStart', function (d) { self.banner(d.name); });
};

UIScene.prototype.drawBar = function (nrg, max) {
    var bx = 17, by = 24, bw = 150, bh = 8, r = nrg / max;
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
    var t = this.add.text(W / 2, 88, 'LEVEL: ' + name, {
        fontFamily: 'monospace', fontSize: '12px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 320 });
    this.time.delayedCall(2000, function () {
        self.tweens.add({ targets: t, alpha: 0, duration: 380,
            onComplete: function () { t.destroy(); } });
    });
};

// ═════════════════════════════════════════════════════════════
//  WIN SCENE
// ═════════════════════════════════════════════════════════════
function WinScene() { Phaser.Scene.call(this, { key: 'WinScene' }); }
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;

WinScene.prototype.init = function (d) {
    this.finalScore = d.score || 0;
    this.levelIndex = d.levelIndex || 0;
    this.levelName  = d.levelName || '';
};

WinScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height, self = this;
    makeDot(this);
    bgGrad(this, W, H, 0x050f05, 0x0a2010);
    stars(this, W, H, 80);
    registerAnims(this);

    var heroY = H * 0.27;
    var hero  = this.add.sprite(W / 2, heroY, 'flow').setScale(P_SCALE * 1.6).setDepth(2);
    hero.play('happy');
    this.tweens.add({ targets: hero, y: heroY - 8, duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    this.time.delayedCall(280, function () {
        burst(self, W * 0.3,  H * 0.54, PAL.grow.ptcl,  14);
        burst(self, W * 0.7,  H * 0.46, PAL.water.ptcl, 14);
        burst(self, W * 0.5,  H * 0.64, PAL.bloom.ptcl, 14);
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
    var btn = this.add.text(W / 2, H * 0.74, hasNext ? '[ NEXT LEVEL ]' : '[ PLAY AGAIN ]', {
        fontFamily: 'monospace', fontSize: '14px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, alpha: 0.28, duration: 700, yoyo: true, repeat: -1 });
    btn.on('pointerdown', function () {
        self.cameras.main.fade(300, 0, 0, 0);
        self.time.delayedCall(320, function () {
            self.scene.start('GameScene', { levelIndex: hasNext ? self.levelIndex + 1 : 0 });
            self.scene.launch('UIScene');
        });
    });

    this.add.text(W / 2, H * 0.82, '[ MAIN MENU ]', {
        fontFamily: 'monospace', fontSize: '10px', color: '#446644',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    .on('pointerdown', function () {
        self.cameras.main.fade(300, 0, 0, 0);
        self.time.delayedCall(320, function () { self.scene.start('MenuScene'); });
    });

    this.cameras.main.fadeIn(450);
};

// ═════════════════════════════════════════════════════════════
//  WORLD BUILDERS
// ═════════════════════════════════════════════════════════════

function buildBg(scene, ld, H) {
    var LW = ld.worldLength;
    var sky = scene.add.graphics().setDepth(0);
    sky.fillGradientStyle(ld.bgTop, ld.bgTop, ld.bgBot, ld.bgBot, 1);
    sky.fillRect(0, 0, LW, H);

    // Mountains parallax 0.25
    var mtn = scene.add.graphics().setScrollFactor(0.25).setDepth(1);
    mtn.fillStyle(0x071407, 0.75);
    for (var i = 0; i < Math.ceil(LW / 150) + 2; i++) {
        var mx = i * 155 + Phaser.Math.Between(-12, 12);
        var mh = Phaser.Math.Between(80, 170);
        mtn.fillTriangle(mx, H - 96, mx + 80, H - 96 - mh, mx + 160, H - 96);
    }

    // Hills parallax 0.5
    var hls = scene.add.graphics().setScrollFactor(0.5).setDepth(2);
    hls.fillStyle(0x0c1f0c, 0.6);
    for (var j = 0; j < Math.ceil(LW / 100) + 2; j++) {
        hls.fillEllipse(j * 105 + Phaser.Math.Between(0, 20), H - 90,
                        155, Phaser.Math.Between(50, 95));
    }

    // Ground base
    var g = scene.add.graphics().setDepth(3);
    g.fillStyle(0x060e06, 1);
    g.fillRect(0, 454, LW, H - 454);
    g.fillStyle(0x003311, 1);
    g.fillRect(0, 452, LW, 4);
}

function buildPlatforms(scene, ld) {
    ld.platforms.forEach(function (p) {
        var py   = p.y || 450;
        var cols = Math.ceil(p.w / TILE_DSP);
        for (var i = 0; i < cols; i++) {
            var tx = p.x + i * TILE_DSP;
            scene.add.image(tx + TILE_DSP / 2, py, 'tiles', TILE['top_grass'])
                .setDisplaySize(TILE_DSP, TILE_DSP).setDepth(4).setAlpha(0.92);
            scene.add.image(tx + TILE_DSP / 2, py + TILE_DSP, 'tiles', TILE['dead_ground'])
                .setDisplaySize(TILE_DSP, TILE_DSP).setDepth(3).setAlpha(0.85);
        }
    });
}

function buildDecor(scene, ld) {
    if (!ld.decor) return;
    ld.decor.forEach(function (d) {
        var f = TILE[d.tile];
        if (f === undefined) return;
        scene.add.image(d.x, d.y, 'tiles', f)
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
        var df = TILE[def.tile_dead]  !== undefined ? TILE[def.tile_dead]  : 5;
        var af = TILE[def.tile_alive] !== undefined ? TILE[def.tile_alive] : 6;

        var dead = scene.add.image(def.x, def.y, 'tiles', df)
            .setDisplaySize(TILE_DSP + 6, TILE_DSP + 6).setDepth(8).setAlpha(0.65);
        var alive = scene.add.image(def.x, def.y, 'tiles', af)
            .setDisplaySize(TILE_DSP + 6, TILE_DSP + 6).setDepth(8).setAlpha(0);

        var ring = scene.add.graphics().setDepth(7);
        ring.lineStyle(1.5, 0x00ff88, 0.14);
        ring.strokeCircle(def.x, def.y, 28);

        var hintTxt = null;
        if (def.hint) {
            hintTxt = scene.add.text(def.x, def.y - 44, def.hint, {
                fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
                backgroundColor: '#00000099', padding: { x: 5, y: 3 },
            }).setOrigin(0.5).setAlpha(0).setDepth(16);
        }

        // Y-only bob, gentle
        scene.tweens.add({
            targets: dead, y: def.y - 4,
            duration: 1100 + Phaser.Math.Between(0, 400),
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });

        return {
            id: def.id, x: def.x, y: def.y,
            type: def.type, scoreValue: def.scoreValue,
            active: false, dead: dead, alive: alive,
            ring: ring, hintTxt: hintTxt,
        };
    });
}

function activateObj(scene, obj) {
    scene.tweens.killTweensOf(obj.dead);
    scene.tweens.add({ targets: obj.dead, alpha: 0, duration: 180 });

    obj.alive.setScale(0);
    scene.tweens.add({ targets: obj.alive, alpha: 0.95, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });

    obj.ring.clear();
    obj.ring.lineStyle(2, 0x00ff88, 0.7);
    obj.ring.strokeCircle(obj.x, obj.y, 28);
    scene.tweens.add({ targets: obj.ring, alpha: 0, duration: 480 });

    burst(scene, obj.x, obj.y, (PAL[obj.type] || PAL.grow).ptcl, 10);

    var pop = scene.add.text(obj.x, obj.y - 24, '+' + obj.scoreValue, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(22);
    scene.tweens.add({
        targets: pop, y: obj.y - 55, alpha: 0, duration: 600, ease: 'Quad.Out',
        onComplete: function () { pop.destroy(); },
    });

    scene.tweens.add({
        targets: obj.alive, alpha: 0.65, duration: 1000,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 100,
    });
}

// ═════════════════════════════════════════════════════════════
//  UTILITIES
// ═════════════════════════════════════════════════════════════

function makeDot(scene) {
    if (scene.textures.exists('dot')) return;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5);
    g.generateTexture('dot', 10, 10); g.destroy();
}

function bgGrad(scene, W, H, top, bot) {
    var g = scene.add.graphics();
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, W, H);
}

function stars(scene, W, H, n) {
    var g = scene.add.graphics();
    for (var i = 0; i < n; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.42));
        g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.75),
                     Phaser.Math.FloatBetween(0.4, 1.3));
    }
    for (var t = 0; t < 5; t++) {
        var d = scene.add.graphics();
        d.fillStyle(0xffffff, 0.5);
        d.fillCircle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(10, H * 0.5), 1.2);
        scene.tweens.add({ targets: d, alpha: 0.04, duration: Phaser.Math.Between(900, 2200),
            yoyo: true, repeat: -1, delay: t * 260 });
    }
}

function registerAnims(scene) {
    ANIMS.forEach(function (a) {
        if (scene.anims.exists(a.key)) return;
        scene.anims.create({
            key: a.key,
            frames: scene.anims.generateFrameNumbers('flow', { start: a.s, end: a.e }),
            frameRate: a.fps,
            repeat: a.loop ? -1 : 0,
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

function pulseSpr(scene, spr, base) {
    scene.tweens.add({
        targets: spr, scaleX: base * 1.14, scaleY: base * 0.88,
        duration: 70, yoyo: true, ease: 'Quad.Out',
    });
}

function trySound(scene, key) {
    try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.36 }); }
    catch (_) {}
}
