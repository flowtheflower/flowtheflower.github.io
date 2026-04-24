/**
 * FLOW: BLOOMFALL — game.js
 */

var TILE_MAP = {
    dead_ground:   0,  alive_ground:  1,  top_grass:     2,  rock:          3,
    vines:          4,  dead_plant:     5,  grow_plant1:   6,  grow_plant2:   7,
    bloom_flower:  8,  bush:           9,  water_still:   10, water_flow1:   11,
    water_flow2:   12, waterfall_top: 13, waterfall_mid: 14, waterfall_btm: 15,
    lily_pad:      16, mushroom:       17, tree_trunk:    18, leaves:        19,
    background1:   20, background2:    21, cloud:         22, crystal:       23,
};
var ATLAS_COLS = 8;
var TILE_SRC   = 64;  
var TILE_DSP   = 48;  

var FW = 103, FH = 103;
var ANIM_DEFS = [
    { key: 'idle',       start: 0,  end: 3,  rate: 5,  loop: true  },
    { key: 'run',        start: 4,  end: 7,  rate: 9,  loop: true  },
    { key: 'happy',      start: 8,  end: 11, rate: 7,  loop: true  },
    { key: 'low_energy', start: 12, end: 15, rate: 5,  loop: true  },
    { key: 'jump',       start: 16, end: 19, rate: 9,  loop: false },
    { key: 'land',       start: 20, end: 23, rate: 10, loop: false },
];

var PAL = {
    grow:  { dead: 0x1a2e1a, alive: 0x00cc44, glow: 0x00ff66, ptcl: 0x44ff88 },
    water: { dead: 0x0d1a2e, alive: 0x0077cc, glow: 0x00aaff, ptcl: 0x66ccff },
    bloom: { dead: 0x2e0d2e, alive: 0xcc44cc, glow: 0xff66ff, ptcl: 0xff99ff },
};

var PLAYER_SPEED = 90;
var JUMP_VEL     = -360;
var GRAVITY      = 18;  
var GROUND_Y      = 432; 
var ENERGY_COST  = 18;
var P_SCALE      = 2.0; 

// --- FIX 1: Config enhancements for smoothness ---
new Phaser.Game({
    type:            Phaser.AUTO,
    width:           360,
    height:          640,
    backgroundColor: '#050505',
    pixelArt:        true,   // Keeps sprite edges crisp
    roundPixels:     true,   // Snaps rendering to whole pixels to prevent jitter
    physics:         { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene:           [MenuScene, GameScene, UIScene, WinScene],
});

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

    var hero = this.add.sprite(W / 2, H * 0.34, 'flow').setScale(P_SCALE * 1.4);
    hero.play('idle');

    this.tweens.add({
        targets:  hero,
        y:        H * 0.34 - 10,
        duration: 1800,
        ease:      'Sine.easeInOut',
        yoyo:      true,
        repeat:    -1,
    });

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

function GameScene() { Phaser.Scene.call(this, { key: 'GameScene' }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function (data) {
    this.levelIndex = data.levelIndex || 0;
    this.ld = window.FLOW_LEVELS[this.levelIndex] || window.FLOW_LEVELS[0];
};

GameScene.prototype.create = function () {
    var ld = this.ld, W = this.scale.width, H = this.scale.height, self = this;
    this.energy     = ld.startEnergy;
    this.maxEnergy  = 100;
    this.score      = 0;
    this.ended      = false;
    this.velY       = 0; 
    this.onGround   = true;
    this.shownHints = {};
    this.objs       = [];
    this.currentAnim = 'run';

    this.physics.world.setBounds(0, 0, ld.worldLength, H);
    buildScrollBg(this, ld, W, H);
    this.platformGroup = buildTilePlatforms(this, ld, H);
    buildDecor(this, ld);
    this.objs = spawnObjs(this, ld.objects);
    makeDot(this);

    this.player = this.add.sprite(ld.playerStart.x, ld.playerStart.y, 'flow');
    this.player.setScale(P_SCALE).setDepth(20);
    registerAnims(this);
    this.player.play('run');
    this.playerX = ld.playerStart.x;
    this.playerY = ld.playerStart.y;

    this.cameras.main.setBounds(0, 0, ld.worldLength, H);
    this.cameras.main.fadeIn(500);
    this.input.on('pointerdown', function () { self.doActivate(); });
    this.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
};

// --- FIX 2: Rewritten Update Loop for Smoothness ---
GameScene.prototype.update = function (time, delta) {
    if (this.ended) return;
    var dt = delta / 1000; 

    // Horizontal movement: No double-multiplying dt
    this.playerX += PLAYER_SPEED * dt;

    // Manual gravity: Normalized for different frame rates
    this.velY += GRAVITY * 60 * dt;
    this.playerY += this.velY * dt;

    // Ground clamp
    if (this.playerY >= GROUND_Y) {
        if (!this.onGround) {
            this.onGround = true;
            this.velY = 0;
            this.playerY = GROUND_Y;
            this.playAnim('land');
            this.time.delayedCall(180, () => { if(!this.ended) this.syncAnim(); });
        } else {
            this.velY = 0;
            this.playerY = GROUND_Y;
        }
    } else {
        this.onGround = false;
    }

    // Update sprite position with rounding to prevent "shimmer"
    this.player.setPosition(Math.round(this.playerX), Math.round(this.playerY));

    // Smooth Camera follow
    var camTargetX = this.playerX - this.scale.width * 0.25;
    var curScrollX = this.cameras.main.scrollX;
    this.cameras.main.setScrollX(curScrollX + (camTargetX - curScrollX) * 0.05);

    this.energy = Math.min(this.maxEnergy, this.energy + 0.10);

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

// --- FIX 3: Prevent animation restart flicker ---
GameScene.prototype.playAnim = function (key) {
    if (this.player.anims.getName() === key && key !== 'land' && key !== 'jump') return;
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

function UIScene() { Phaser.Scene.call(this, { key: 'UIScene' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W = this.scale.width, self = this;
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
};

UIScene.prototype.showBanner = function (name) {
    var W = this.scale.width, self = this;
    var t = this.add.text(W / 2, 92, 'LEVEL: ' + name, {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ff41'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 380 });
    this.time.delayedCall(2200, function () {
        self.tweens.add({ targets: t, alpha: 0, duration: 450, onComplete: function () { if(t) t.destroy(); } });
    });
};

function WinScene() { Phaser.Scene.call(this, { key: 'WinScene' }); }
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;

WinScene.prototype.init = function (d) {
    this.finalScore = d.score || 0;
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

    this.add.text(W / 2, H * 0.50, 'BLOOM RESTORED!', {
        fontFamily: 'monospace', fontSize: '20px', color: '#00ff41'
    }).setOrigin(0.5);

    var btn = this.add.text(W / 2, H * 0.74, '[ PLAY AGAIN ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#00ff41'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', function () {
        self.scene.start('GameScene', { levelIndex: 0 });
    });
    this.cameras.main.fadeIn(500);
};

// WORLD BUILDERS & UTILITIES
function buildScrollBg(scene, ld, W, H) {
    var LW = ld.worldLength;
    var sky = scene.add.graphics().setDepth(0);
    sky.fillGradientStyle(ld.bgTop, ld.bgTop, ld.bgBot, ld.bgBot, 1);
    sky.fillRect(0, 0, LW, H);
}

function buildTilePlatforms(scene, ld, H) {
    ld.platforms.forEach(function (p) {
        var py = p.y || 450;
        var cols = Math.ceil(p.w / TILE_DSP);
        for (var i = 0; i < cols; i++) {
            var tx = p.x + i * TILE_DSP;
            var frame = TILE_MAP['top_grass'];
            scene.add.image(tx + TILE_DSP / 2, py, 'tiles', frame).setDisplaySize(TILE_DSP, TILE_DSP).setDepth(4);
            scene.add.image(tx + TILE_DSP / 2, py + TILE_DSP, 'tiles', TILE_MAP['dead_ground']).setDisplaySize(TILE_DSP, TILE_DSP).setDepth(3);
        }
    });
}

function buildDecor(scene, ld) {
    if (!ld.decor) return;
    ld.decor.forEach(function (d) {
        var frame = TILE_MAP[d.tile];
        if (frame === undefined) return;
        scene.add.image(d.x, d.y, 'tiles', frame).setDisplaySize(TILE_DSP, TILE_DSP).setScrollFactor(d.scrollFactor || 1).setDepth(5);
    });
}

function spawnObjs(scene, defs) {
    return defs.map(function (def) {
        var dead = scene.add.image(def.x, def.y, 'tiles', TILE_MAP[def.tile_dead]).setDisplaySize(TILE_DSP + 4, TILE_DSP + 4).setDepth(8).setAlpha(0.6);
        var alive = scene.add.image(def.x, def.y, 'tiles', TILE_MAP[def.tile_alive]).setDisplaySize(TILE_DSP + 4, TILE_DSP + 4).setDepth(8).setAlpha(0);
        var ring = scene.add.graphics().setDepth(7);
        ring.lineStyle(1.5, PAL[def.type].glow, 0.14);
        ring.strokeCircle(def.x, def.y, 28);
        var hintText = null;
        if (def.hint) {
            hintText = scene.add.text(def.x, def.y - 44, def.hint, { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000099' }).setOrigin(0.5).setAlpha(0);
        }
        return { id: def.id, x: def.x, y: def.y, type: def.type, scoreValue: def.scoreValue, active: false, dead: dead, alive: alive, ring: ring, hintText: hintText };
    });
}

function activateObj(scene, obj) {
    scene.tweens.add({ targets: obj.dead, alpha: 0, duration: 200 });
    obj.alive.setScale(0);
    scene.tweens.add({ targets: obj.alive, alpha: 0.95, scaleX: 1, scaleY: 1, duration: 200 });
}

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
        g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.75), Phaser.Math.FloatBetween(0.4, 1.3));
    }
}

function registerAnims(scene) {
    ANIM_DEFS.forEach(function (d) {
        if (scene.anims.exists(d.key)) return;
        scene.anims.create({ key: d.key, frames: scene.anims.generateFrameNumbers('flow', { start: d.start, end: d.end }), frameRate: d.rate, repeat: d.loop ? -1 : 0 });
    });
}

function burst(scene, x, y, tint, count) {
    try {
        var e = scene.add.particles(x, y, 'dot', { speed: { min: 45, max: 160 }, scale: { start: 1.0, end: 0 }, lifespan: 520, quantity: count, tint: tint, emitting: false });
        e.explode(count);
    } catch (_) {}
}

function pulseSprite(scene, target, base) {
    scene.tweens.add({ targets: target, scaleX: base * 1.15, scaleY: base * 0.88, duration: 70, yoyo: true });
}

function trySound(scene, key) {
    try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.36 }); } catch (_) {}
}
