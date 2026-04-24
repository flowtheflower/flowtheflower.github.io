/**
 * FLOW: BLOOMFALL — game.js
 * Requires: Phaser 3.60, levels.js (loaded first in index.html)
 *
 * Spritesheet (assets/flow_game.png) — 102×102px per frame, 4 cols × 6 rows:
 *   Row 0  frames  0– 3  IDLE
 *   Row 1  frames  4– 7  RUN
 *   Row 2  frames  8–11  HAPPY
 *   Row 3  frames 12–15  LOW_ENERGY
 *   Row 4  frames 16–19  JUMP
 *   Row 5  frames 20–23  LAND
 */

// ── CONSTANTS ─────────────────────────────────────────────────
var FW = 102, FH = 102;

var ANIM_DEFS = [
    { key: 'idle',       start: 0,  end: 3,  rate: 6,  loop: true  },
    { key: 'run',        start: 4,  end: 7,  rate: 10, loop: true  },
    { key: 'happy',      start: 8,  end: 11, rate: 8,  loop: true  },
    { key: 'low_energy', start: 12, end: 15, rate: 6,  loop: true  },
    { key: 'jump',       start: 16, end: 19, rate: 10, loop: false },
    { key: 'land',       start: 20, end: 23, rate: 12, loop: false },
];

var PAL = {
    grow:  { dead: 0x1a2e1a, alive: 0x00cc44, glow: 0x00ff66, ptcl: 0x44ff88 },
    water: { dead: 0x0d1a2e, alive: 0x0077cc, glow: 0x00aaff, ptcl: 0x66ccff },
    bloom: { dead: 0x2e0d2e, alive: 0xcc44cc, glow: 0xff66ff, ptcl: 0xff99ff },
};

var ENERGY_COST  = 18;
var PLAYER_SPEED = 95;
var JUMP_VEL     = -340;
var GROUND_Y     = 460;
var P_SCALE      = 2.8;

// ── BOOT ──────────────────────────────────────────────────────
// No wrapper — Phaser starts immediately, scripts loaded in order by index.html
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
function MenuScene() {
    Phaser.Scene.call(this, { key: 'MenuScene' });
}
MenuScene.prototype = Object.create(Phaser.Scene.prototype);
MenuScene.prototype.constructor = MenuScene;

MenuScene.prototype.preload = function () {
    // Load spritesheet
    this.load.spritesheet('flow', 'assets/flow_game.png', { frameWidth: FW, frameHeight: FH });
    // Sounds optional — missing files are caught silently
    this.load.audio('tap',    'assets/tap.wav');
    this.load.audio('grow',   'assets/grow.wav');
    this.load.audio('finale', 'assets/finale.wav');
};

MenuScene.prototype.create = function () {
    var W = this.scale.width, H = this.scale.height;

    makeBg(this, W, H, 0x0a1520, 0x0d2010);
    makeStars(this, W, H, 90);
    makeDotTexture(this);   // particle dot — generated once here, reused everywhere
    registerAnims(this);

    var hero = this.add.sprite(W / 2, H * 0.36, 'flow').setScale(4);
    hero.play('happy');
    this.tweens.add({ targets: hero, y: H * 0.36 - 14, duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    this.add.text(W / 2, H * 0.60, 'FLOW:', {
        fontFamily: 'monospace', fontSize: '34px', color: '#00ff41',
        stroke: '#002211', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.60 + 44, 'BLOOMFALL', {
        fontFamily: 'monospace', fontSize: '22px', color: '#aaffcc',
        stroke: '#002211', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.74, 'restore the bloom  ·  tap to grow', {
        fontFamily: 'monospace', fontSize: '9px', color: '#446644',
    }).setOrigin(0.5);

    var hint = this.add.text(W / 2, H * 0.83, '— TAP TO BEGIN —', {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ff41',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });

    var scene = this;
    this.input.once('pointerdown', function () {
        scene.cameras.main.fade(400, 0, 0, 0);
        scene.time.delayedCall(410, function () {
            scene.scene.start('GameScene', { levelIndex: 0 });
            scene.scene.launch('UIScene');
        });
    });
};

// ═════════════════════════════════════════════════════════════
//  GAME SCENE
// ═════════════════════════════════════════════════════════════
function GameScene() {
    Phaser.Scene.call(this, { key: 'GameScene' });
}
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function (data) {
    this.levelIndex = data.levelIndex || 0;
    // Safety: fall back to level 0 if index is out of range
    this.ld = window.FLOW_LEVELS[this.levelIndex] || window.FLOW_LEVELS[0];
};

GameScene.prototype.create = function () {
    var ld = this.ld;
    var W  = this.scale.width;
    var H  = this.scale.height;
    var scene = this;

    // ── State ──────────────────────────────────────────────
    this.energy     = ld.startEnergy;
    this.maxEnergy  = 100;
    this.score      = 0;
    this.ended      = false;
    this.airborne   = false;
    this.shownHints = {};
    this.objs       = [];

    // ── World ──────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, ld.worldLength, H);

    // ── Background ─────────────────────────────────────────
    buildScrollBg(this, ld, W, H);

    // ── Platforms ──────────────────────────────────────────
    buildPlatforms(this, ld);

    // ── Objects ────────────────────────────────────────────
    this.objs = spawnObjs(this, ld.objects);

    // ── Player ─────────────────────────────────────────────
    this.player = this.physics.add.sprite(ld.playerStart.x, ld.playerStart.y, 'flow');
    this.player.setScale(P_SCALE).setCollideWorldBounds(true).setDepth(10);
    registerAnims(this);
    this.player.play('run');

    // ── Camera ─────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, ld.worldLength, H);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.fadeIn(500);

    // ── Input ──────────────────────────────────────────────
    this.input.on('pointerdown', function () { scene.doActivate(); });

    // ── Notify UIScene ─────────────────────────────────────
    this.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
};

GameScene.prototype.update = function () {
    var scene = this;

    if (!this.ended) {
        this.player.setVelocityX(PLAYER_SPEED);
    } else {
        this.player.setVelocityX(0);
    }

    // Ground clamp
    if (this.player.y >= GROUND_Y) {
        this.player.setY(GROUND_Y);
        if (this.player.body.velocity.y > 0) this.player.setVelocityY(0);
        if (this.airborne) {
            this.airborne = false;
            this.player.play('land', true);
            this.time.delayedCall(220, function () { scene.syncAnim(); });
        }
    }

    // Energy regen
    if (this.energy < this.maxEnergy) this.energy = Math.min(this.maxEnergy, this.energy + 0.12);

    // Proximity hints
    var px = this.player.x;
    this.objs.forEach(function (obj) {
        if (obj.active || !obj.hintText || scene.shownHints[obj.id]) return;
        if (Math.abs(obj.x - px) < 200) {
            scene.shownHints[obj.id] = true;
            scene.tweens.add({ targets: obj.hintText, alpha: 1, duration: 300 });
            scene.time.delayedCall(2000, function () {
                if (obj.hintText && obj.hintText.active) {
                    scene.tweens.add({ targets: obj.hintText, alpha: 0, duration: 400 });
                }
            });
        }
    });

    // Send state to UIScene every frame
    this.events.emit('stateUpdate', {
        energy:    this.energy,
        maxEnergy: this.maxEnergy,
        score:     this.score,
        done:      this.objs.filter(function (o) { return o.active; }).length,
        total:     this.objs.length,
    });
};

GameScene.prototype.doActivate = function () {
    if (this.energy < ENERGY_COST || this.ended) return;
    this.energy -= ENERGY_COST;

    var scene = this;
    this.cameras.main.shake(85, 0.003);
    pulseTween(this, this.player, P_SCALE);
    trySound(this, 'tap');

    // Find nearest inactive object
    var nearest = null, minDist = 185;
    this.objs.forEach(function (obj) {
        var d = Math.abs(obj.x - scene.player.x);
        if (!obj.active && d < minDist) { nearest = obj; minDist = d; }
    });
    if (!nearest) return;

    nearest.active = true;
    this.score += nearest.scoreValue;
    activateObj(this, nearest);

    if (nearest.type === 'grow') {
        this.player.setVelocityY(JUMP_VEL);
        this.airborne = true;
        this.player.play('jump', true);
        trySound(this, 'grow');
    } else if (nearest.type === 'water') {
        this.cameras.main.flash(260, 0, 80, 160, false);
        trySound(this, 'grow');
    } else if (nearest.type === 'bloom') {
        this.time.delayedCall(250, function () { scene.doWin(); });
    }
};

GameScene.prototype.doWin = function () {
    var scene = this;
    this.ended = true;
    this.player.play('happy');
    trySound(this, 'finale');
    this.cameras.main.zoomTo(1.25, 1200, 'Sine.easeInOut');

    burst(this, this.player.x, this.player.y - 20, PAL.bloom.ptcl, 28);
    this.time.delayedCall(300,  function () { burst(scene, scene.player.x, scene.player.y,      PAL.grow.ptcl,  20); });
    this.time.delayedCall(600,  function () { burst(scene, scene.player.x, scene.player.y - 30, PAL.water.ptcl, 16); });

    this.time.delayedCall(1500, function () {
        scene.cameras.main.fade(600, 0, 0, 0);
        scene.time.delayedCall(620, function () {
            scene.scene.stop('UIScene');
            scene.scene.start('WinScene', {
                score: scene.score, levelIndex: scene.levelIndex, levelName: scene.ld.name,
            });
        });
    });
};

GameScene.prototype.syncAnim = function () {
    if (this.ended || this.airborne) return;
    if      (this.energy < 25) this.player.play('low_energy', true);
    else if (this.energy < 55) this.player.play('idle', true);
    else                       this.player.play('run', true);
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE  (runs in parallel — HUD only)
// ═════════════════════════════════════════════════════════════
function UIScene() {
    Phaser.Scene.call(this, { key: 'UIScene' });
}
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W    = this.scale.width;
    var self = this;

    this.bar       = this.add.graphics();
    this.scoreTxt  = this.add.text(W - 16, 14, 'SCORE: 0', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    }).setOrigin(1, 0);
    this.flowTxt   = this.add.text(16, 14, '', {
        fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
    });

    var tap = this.add.text(W / 2, 616, 'TAP TO FLOW', {
        fontFamily: 'monospace', fontSize: '11px', color: '#00ff41',
    }).setOrigin(0.5).setAlpha(0.4);
    this.tweens.add({ targets: tap, alpha: 0.12, duration: 900, yoyo: true, repeat: -1 });

    var game = this.scene.get('GameScene');

    game.events.on('stateUpdate', function (d) {
        self.drawBar(d.energy, d.maxEnergy);
        self.scoreTxt.setText('SCORE: ' + d.score);
        self.flowTxt.setText('🌿 ' + d.done + '/' + d.total);
    });

    game.events.on('levelStart', function (d) {
        self.showBanner(d.name);
    });
};

UIScene.prototype.drawBar = function (energy, max) {
    var bx = 16, by = 28, bw = 130, bh = 6, ratio = energy / max;
    this.bar.clear();
    this.bar.fillStyle(0x111111, 0.9);
    this.bar.fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 3);
    this.bar.fillStyle(0x1a1a1a, 1);
    this.bar.fillRoundedRect(bx, by, bw, bh, 3);
    var col = ratio < 0.3
        ? Phaser.Display.Color.GetColor(220, Math.floor(ratio * 3 * 120), 0)
        : Phaser.Display.Color.GetColor(0, 200, 65);
    this.bar.fillStyle(col, 1);
    if (ratio > 0.01) this.bar.fillRoundedRect(bx, by, Math.max(1, bw * ratio), bh, 3);
    if (ratio > 0.85) {
        this.bar.lineStyle(1, 0x00ff41, 0.4);
        this.bar.strokeRoundedRect(bx, by, bw, bh, 3);
    }
};

UIScene.prototype.showBanner = function (name) {
    var W    = this.scale.width;
    var self = this;
    var t = this.add.text(W / 2, 88, 'LEVEL: ' + name, {
        fontFamily: 'monospace', fontSize: '13px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 400 });
    this.time.delayedCall(2200, function () {
        self.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: function () { t.destroy(); } });
    });
};

// ═════════════════════════════════════════════════════════════
//  WIN SCENE
// ═════════════════════════════════════════════════════════════
function WinScene() {
    Phaser.Scene.call(this, { key: 'WinScene' });
}
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;

WinScene.prototype.init = function (data) {
    this.finalScore = data.score      || 0;
    this.levelIndex = data.levelIndex || 0;
    this.levelName  = data.levelName  || '';
};

WinScene.prototype.create = function () {
    var W    = this.scale.width, H = this.scale.height;
    var self = this;

    makeBg(this, W, H, 0x050f05, 0x0a200a);
    makeStars(this, W, H, 70);
    makeDotTexture(this);

    var hero = this.add.sprite(W / 2, H * 0.28, 'flow').setScale(4);
    registerAnims(this);
    hero.play('happy');
    this.tweens.add({ targets: hero, y: H * 0.28 - 14, duration: 1200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    this.time.delayedCall(200, function () {
        burst(self, W * 0.28, H * 0.55, PAL.grow.ptcl,  16);
        burst(self, W * 0.72, H * 0.45, PAL.water.ptcl, 16);
        burst(self, W * 0.50, H * 0.65, PAL.bloom.ptcl, 16);
    });

    this.add.text(W / 2, H * 0.50, 'BLOOM RESTORED!', {
        fontFamily: 'monospace', fontSize: '22px',
        color: '#00ff41', stroke: '#002200', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.50 + 38, "WELL FLOW'N 🌿", {
        fontFamily: 'monospace', fontSize: '14px', color: '#aaffcc',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.50 + 66, 'SCORE: ' + this.finalScore, {
        fontFamily: 'monospace', fontSize: '12px', color: '#00ff41',
    }).setOrigin(0.5);

    var hasNext  = !!(window.FLOW_LEVELS[this.levelIndex + 1]);
    var nextIdx  = hasNext ? this.levelIndex + 1 : 0;
    var btnLabel = hasNext ? '[ NEXT LEVEL ]' : '[ PLAY AGAIN ]';

    var btn = this.add.text(W / 2, H * 0.75, btnLabel, {
        fontFamily: 'monospace', fontSize: '14px',
        color: '#00ff41', stroke: '#001100', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    btn.on('pointerdown', function () {
        self.cameras.main.fade(400, 0, 0, 0);
        self.time.delayedCall(420, function () {
            self.scene.start('GameScene', { levelIndex: nextIdx });
            self.scene.launch('UIScene');
        });
    });

    var menu = this.add.text(W / 2, H * 0.83, '[ MAIN MENU ]', {
        fontFamily: 'monospace', fontSize: '10px', color: '#446644',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerdown', function () {
        self.cameras.main.fade(400, 0, 0, 0);
        self.time.delayedCall(420, function () { self.scene.start('MenuScene'); });
    });

    this.cameras.main.fadeIn(600);
};

// ═════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═════════════════════════════════════════════════════════════

function makeBg(scene, W, H, topHex, botHex) {
    var g = scene.add.graphics();
    g.fillGradientStyle(topHex, topHex, botHex, botHex, 1);
    g.fillRect(0, 0, W, H);
}

function makeStars(scene, W, H, count) {
    var g = scene.add.graphics();
    for (var i = 0; i < count; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.08, 0.50));
        g.fillCircle(
            Phaser.Math.Between(0, W),
            Phaser.Math.Between(0, H * 0.72),
            Phaser.Math.FloatBetween(0.4, 1.4)
        );
    }
}

function makeDotTexture(scene) {
    if (scene.textures.exists('dot')) return;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('dot', 10, 10);
    g.destroy();
}

function buildScrollBg(scene, ld, W, H) {
    var LW     = ld.worldLength;
    var topHex = parseInt(ld.bgGradientTop.slice(1), 16);
    var botHex = parseInt(ld.bgGradientBot.slice(1), 16);

    var sky = scene.add.graphics();
    sky.fillGradientStyle(topHex, topHex, botHex, botHex, 1);
    sky.fillRect(0, 0, LW, H);

    // Mountains — parallax 0.3
    var mtn = scene.add.graphics().setScrollFactor(0.3);
    mtn.fillStyle(0x0a1a0a, 0.55);
    var mCount = Math.ceil(LW / 180) + 2;
    for (var i = 0; i < mCount; i++) {
        var mx = i * 180 + Phaser.Math.Between(-20, 20);
        var mh = Phaser.Math.Between(60, 140);
        mtn.fillTriangle(mx, H - 96, mx + 80, H - 96 - mh, mx + 160, H - 96);
    }

    // Clouds — parallax 0.55
    var cld = scene.add.graphics().setScrollFactor(0.55);
    cld.fillStyle(0x1a3a2a, 0.26);
    var cCount = Math.ceil(LW / 260) + 2;
    for (var j = 0; j < cCount; j++) {
        var cx = j * 260 + Phaser.Math.Between(0, 80);
        var cy = Phaser.Math.Between(60, 180);
        cld.fillEllipse(cx, cy, 170, 44);
        cld.fillEllipse(cx + 50, cy - 16, 100, 32);
    }

    // Ground
    var gnd = scene.add.graphics();
    gnd.fillStyle(0x091509, 1);
    gnd.fillRect(0, 476, LW, H - 476);
    gnd.fillStyle(0x003311, 1);
    gnd.fillRect(0, 474, LW, 4);
}

function buildPlatforms(scene, ld) {
    var g = scene.add.graphics().setDepth(2);
    ld.platforms.forEach(function (p) {
        var y   = 480 + (p.elevated ? -20 : 0);
        var col = { dead: 0x181818, water: 0x0d1e38, crystal: 0x180a2c }[p.type] || 0x181818;
        var top = { dead: 0x2e2e2e, water: 0x004488, crystal: 0x551188 }[p.type] || 0x2e2e2e;
        g.fillStyle(col, 1); g.fillRect(p.x, y, p.w, 22);
        g.fillStyle(top, 1); g.fillRect(p.x, y - 3, p.w, 4);
        g.fillStyle(0x000000, 0.3);
        for (var nx = p.x + 18; nx < p.x + p.w - 8; nx += 28) g.fillRect(nx, y, 2, 6);
    });
}

function spawnObjs(scene, defs) {
    return defs.map(function (def) {
        var col = PAL[def.type] || PAL.grow;

        var dead = scene.add.rectangle(def.x, def.y, 46, 46, col.dead)
            .setStrokeStyle(1, col.glow, 0.22).setDepth(5);

        var dIcon = scene.add.text(def.x, def.y, def.label, { fontSize: '18px' })
            .setOrigin(0.5).setAlpha(0.35).setDepth(6);

        var alive = scene.add.rectangle(def.x, def.y, 46, 46, col.alive)
            .setAlpha(0).setStrokeStyle(2, 0xffffff, 0.2).setDepth(5);

        var aIcon = scene.add.text(def.x, def.y, def.label, { fontSize: '20px' })
            .setOrigin(0.5).setAlpha(0).setDepth(7);

        var ring = scene.add.graphics().setDepth(4);
        ring.lineStyle(2, col.glow, 0.16);
        ring.strokeCircle(def.x, def.y, 30);

        var hintText = null;
        if (def.hint) {
            hintText = scene.add.text(def.x, def.y - 44, def.hint, {
                fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
                backgroundColor: '#00000099', padding: { x: 6, y: 3 },
            }).setOrigin(0.5).setAlpha(0).setDepth(15);
        }

        // Idle bob
        scene.tweens.add({
            targets: [dead, dIcon], y: def.y - 5,
            duration: 1100 + Phaser.Math.Between(0, 500),
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });

        return {
            id: def.id, x: def.x, y: def.y, type: def.type,
            scoreValue: def.scoreValue, hint: def.hint,
            active: false, dead: dead, dIcon: dIcon,
            alive: alive, aIcon: aIcon, ring: ring, hintText: hintText,
        };
    });
}

function activateObj(scene, obj) {
    var col = PAL[obj.type] || PAL.grow;

    scene.tweens.killTweensOf([obj.dead, obj.dIcon]);
    scene.tweens.add({ targets: [obj.dead, obj.dIcon], alpha: 0, duration: 220 });

    obj.alive.setScale(0);
    obj.aIcon.setScale(0);
    scene.tweens.add({
        targets: [obj.alive, obj.aIcon],
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 200, ease: 'Back.Out',
    });

    obj.ring.clear();
    obj.ring.lineStyle(2, col.glow, 0.65);
    obj.ring.strokeCircle(obj.x, obj.y, 30);
    scene.tweens.add({ targets: obj.ring, alpha: 0, duration: 550 });

    burst(scene, obj.x, obj.y, col.ptcl, 12);

    var pop = scene.add.text(obj.x, obj.y - 28, '+' + obj.scoreValue, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    scene.tweens.add({
        targets: pop, y: obj.y - 62, alpha: 0, duration: 680, ease: 'Quad.Out',
        onComplete: function () { pop.destroy(); },
    });

    scene.tweens.add({
        targets: obj.alive, alpha: 0.6, duration: 950,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 180,
    });
}

function burst(scene, x, y, tint, count) {
    try {
        var e = scene.add.particles(x, y, 'dot', {
            speed:    { min: 50, max: 170 },
            angle:    { min: 0,  max: 360 },
            scale:    { start: 1.1, end: 0 },
            lifespan: 560,
            quantity: count,
            tint:     tint,
            emitting: false,
        });
        e.explode(count);
        scene.time.delayedCall(700, function () { if (e && e.active) e.destroy(); });
    } catch (err) { /* silent */ }
}

function pulseTween(scene, target, base) {
    scene.tweens.add({
        targets: target, scaleX: base * 1.18, scaleY: base * 0.84,
        duration: 75, yoyo: true, ease: 'Quad.Out',
    });
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

function trySound(scene, key) {
    try {
        if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.38 });
    } catch (e) { /* silent */ }
}
