/**
 * FLOW: BLOOMFALL — game.js
 * ─────────────────────────────────────────────────────────────
 * Architecture:
 *   MenuScene  — title screen
 *   GameScene  — main gameplay (reads from FLOW_LEVELS in levels.js)
 *   UIScene    — HUD overlay running parallel to GameScene
 *   WinScene   — level complete screen
 *
 * Spritesheet (flow_game.png) — 102×102 per frame, 4 cols × 6 rows:
 *   Row 0  frames  0– 3  IDLE
 *   Row 1  frames  4– 7  RUN
 *   Row 2  frames  8–11  HAPPY
 *   Row 3  frames 12–15  LOW_ENERGY
 *   Row 4  frames 16–19  JUMP
 *   Row 5  frames 20–23  LAND
 */

'use strict';

// ── CONSTANTS ─────────────────────────────────────────────────
const FRAME_W    = 102;
const FRAME_H    = 102;

const ANIM_DEFS = {
    idle:       { start: 0,  end: 3,  rate: 6,  loop: true  },
    run:        { start: 4,  end: 7,  rate: 10, loop: true  },
    happy:      { start: 8,  end: 11, rate: 8,  loop: true  },
    low_energy: { start: 12, end: 15, rate: 6,  loop: true  },
    jump:       { start: 16, end: 19, rate: 10, loop: false },
    land:       { start: 20, end: 23, rate: 12, loop: false },
};

const C = {
    grow:  { dead: 0x1a2e1a, alive: 0x00cc44, glow: 0x00ff66, particle: 0x44ff88 },
    water: { dead: 0x0d1a2e, alive: 0x0077cc, glow: 0x00aaff, particle: 0x66ccff },
    bloom: { dead: 0x2e0d2e, alive: 0xcc44cc, glow: 0xff66ff, particle: 0xff99ff },
};

const ENERGY_COST   = 18;
const PLAYER_SPEED  = 95;
const JUMP_VEL      = -340;
const GROUND_Y      = 460;
const PLAYER_SCALE  = 2.8;

// ── PHASER BOOT ───────────────────────────────────────────────
window.addEventListener('load', () => {
    new Phaser.Game({
        type:            Phaser.AUTO,
        width:           360,
        height:          640,
        backgroundColor: '#050505',
        physics:         { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        scene:           [MenuScene, GameScene, UIScene, WinScene],
    });
});

// ═════════════════════════════════════════════════════════════
//  MENU SCENE
// ═════════════════════════════════════════════════════════════
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    preload() {
        this.load.spritesheet('flow', 'assets/flow_game.png', {
            frameWidth: FRAME_W, frameHeight: FRAME_H,
        });
        // Sounds are optional — game works without them
        this.load.audio('tap',    'assets/tap.wav');
        this.load.audio('grow',   'assets/grow.wav');
        this.load.audio('finale', 'assets/finale.wav');
    }

    create() {
        const W = this.scale.width, H = this.scale.height;
        buildBg(this, W, H, 0x0a1520, 0x0d2010);
        drawStars(this, W, H, 90);

        // Hero
        const hero = this.add.sprite(W / 2, H * 0.36, 'flow').setScale(4);
        registerAnims(this);
        hero.play('happy');
        this.tweens.add({ targets: hero, y: H * 0.36 - 14, duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        // Title
        this.add.text(W / 2, H * 0.60, 'FLOW:', {
            fontFamily: 'monospace', fontSize: '34px', color: '#00ff41',
            stroke: '#002211', strokeThickness: 5,
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.60 + 44, 'BLOOMFALL', {
            fontFamily: 'monospace', fontSize: '22px', color: '#aaffcc',
            stroke: '#002211', strokeThickness: 3,
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.74, 'restore the bloom · tap to grow', {
            fontFamily: 'monospace', fontSize: '9px', color: '#446644',
        }).setOrigin(0.5);

        const hint = this.add.text(W / 2, H * 0.84, '— TAP TO BEGIN —', {
            fontFamily: 'monospace', fontSize: '12px', color: '#00ff41',
        }).setOrigin(0.5);
        this.tweens.add({ targets: hint, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });

        this.input.once('pointerdown', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene', { levelIndex: 0 });
                this.scene.launch('UIScene');
            });
        });
    }
}

// ═════════════════════════════════════════════════════════════
//  GAME SCENE
// ═════════════════════════════════════════════════════════════
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    init(data) {
        this.levelIndex = data.levelIndex || 0;
        this.ld         = window.FLOW_LEVELS[this.levelIndex];
    }

    create() {
        const ld = this.ld;
        const W  = this.scale.width;
        const H  = this.scale.height;

        // ── State ──────────────────────────────────────────────
        this.energy    = ld.startEnergy;
        this.maxEnergy = 100;
        this.score     = 0;
        this.ended     = false;
        this.airborne  = false;
        this.shownHints = new Set();
        this.objects   = [];

        // ── World ──────────────────────────────────────────────
        this.physics.world.setBounds(0, 0, ld.worldLength, H);

        // ── Environment ────────────────────────────────────────
        buildScrollingBg(this, ld, W, H);
        buildPlatformGfx(this, ld);

        // ── Objects ────────────────────────────────────────────
        this.objects = spawnObjects(this, ld.objects);

        // ── Particle texture (generated, no file needed) ───────
        const pg = this.make.graphics({ x: 0, y: 0, add: false });
        pg.fillStyle(0xffffff, 1);
        pg.fillCircle(5, 5, 5);
        pg.generateTexture('dot', 10, 10);
        pg.destroy();

        // ── Player ─────────────────────────────────────────────
        this.player = this.physics.add.sprite(ld.playerStart.x, ld.playerStart.y, 'flow');
        this.player.setScale(PLAYER_SCALE).setCollideWorldBounds(true).setDepth(10);
        registerAnims(this);
        this.player.play('run');

        // ── Camera ─────────────────────────────────────────────
        this.cameras.main.setBounds(0, 0, ld.worldLength, H);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.fadeIn(500);

        // ── Input ──────────────────────────────────────────────
        this.input.on('pointerdown', () => this._activate());

        // ── Notify UI ─────────────────────────────────────────
        this.events.emit('levelStart', { name: ld.name, total: ld.objects.length });
    }

    update() {
        if (!this.ended) {
            this.player.setVelocityX(PLAYER_SPEED);
        } else {
            this.player.setVelocityX(0);
        }

        // Ground clamp + landing
        if (this.player.y >= GROUND_Y) {
            this.player.setY(GROUND_Y);
            if (this.player.body.velocity.y > 0) this.player.setVelocityY(0);
            if (this.airborne) {
                this.airborne = false;
                this.player.play('land', true);
                this.time.delayedCall(220, () => this._syncAnim());
            }
        }

        // Regen
        if (this.energy < this.maxEnergy) this.energy = Math.min(this.maxEnergy, this.energy + 0.12);

        // Proximity hints
        this.objects.forEach(obj => {
            if (obj.active || !obj.hintText || this.shownHints.has(obj.id)) return;
            if (Math.abs(obj.x - this.player.x) < 210) {
                this.shownHints.add(obj.id);
                this.tweens.add({ targets: obj.hintText, alpha: 1, duration: 300 });
                this.time.delayedCall(2200, () => {
                    if (obj.hintText?.active) this.tweens.add({ targets: obj.hintText, alpha: 0, duration: 400 });
                });
            }
        });

        // Emit to UIScene
        this.events.emit('stateUpdate', {
            energy:    this.energy,
            maxEnergy: this.maxEnergy,
            score:     this.score,
            done:      this.objects.filter(o => o.active).length,
            total:     this.objects.length,
        });
    }

    _activate() {
        if (this.energy < ENERGY_COST || this.ended) return;
        this.energy -= ENERGY_COST;

        this.cameras.main.shake(85, 0.003);
        playerPulse(this, this.player, PLAYER_SCALE);
        trySound(this, 'tap');

        // Find nearest inactive object within range
        let nearest = null, minDist = 185;
        this.objects.forEach(obj => {
            const d = Math.abs(obj.x - this.player.x);
            if (!obj.active && d < minDist) { nearest = obj; minDist = d; }
        });
        if (!nearest) return;

        nearest.active = true;
        this.score += nearest.scoreValue;
        activateObj(this, nearest);

        switch (nearest.type) {
            case 'grow':
                this.player.setVelocityY(JUMP_VEL);
                this.airborne = true;
                this.player.play('jump', true);
                trySound(this, 'grow');
                break;
            case 'water':
                this.cameras.main.flash(260, 0, 80, 160, false);
                trySound(this, 'grow');
                break;
            case 'bloom':
                this.time.delayedCall(250, () => this._win());
                break;
        }
    }

    _win() {
        this.ended = true;
        this.player.play('happy');
        trySound(this, 'finale');
        this.cameras.main.zoomTo(1.25, 1200, 'Sine.easeInOut');

        burst(this, this.player.x, this.player.y - 20, C.bloom.particle, 28);
        this.time.delayedCall(300, () => burst(this, this.player.x, this.player.y, C.grow.particle, 20));
        this.time.delayedCall(600, () => burst(this, this.player.x, this.player.y - 30, C.water.particle, 16));

        this.time.delayedCall(1500, () => {
            this.cameras.main.fade(600, 0, 0, 0);
            this.time.delayedCall(600, () => {
                this.scene.stop('UIScene');
                this.scene.start('WinScene', {
                    score: this.score, levelIndex: this.levelIndex, levelName: this.ld.name,
                });
            });
        });
    }

    _syncAnim() {
        if (this.ended || this.airborne) return;
        if      (this.energy < 25) this.player.play('low_energy', true);
        else if (this.energy < 55) this.player.play('idle', true);
        else                       this.player.play('run', true);
    }
}

// ═════════════════════════════════════════════════════════════
//  UI SCENE  (parallel HUD — launched alongside GameScene)
// ═════════════════════════════════════════════════════════════
class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene' }); }

    create() {
        const W = this.scale.width;

        this.bar       = this.add.graphics();
        this.scoreText = this.add.text(W - 16, 14, 'SCORE: 0', {
            fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
        }).setOrigin(1, 0);
        this.flowText  = this.add.text(16, 14, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#00ff41',
        });

        const tap = this.add.text(W / 2, 616, 'TAP TO FLOW', {
            fontFamily: 'monospace', fontSize: '11px', color: '#00ff41',
        }).setOrigin(0.5).setAlpha(0.4);
        this.tweens.add({ targets: tap, alpha: 0.12, duration: 900, yoyo: true, repeat: -1 });

        const game = this.scene.get('GameScene');
        game.events.on('stateUpdate', d => {
            this._drawBar(d.energy, d.maxEnergy);
            this.scoreText.setText(`SCORE: ${d.score}`);
            this.flowText.setText(`🌿 ${d.done}/${d.total}`);
        });
        game.events.on('levelStart', d => this._banner(d.name));
    }

    _drawBar(energy, max) {
        const bx = 16, by = 28, bw = 130, bh = 6, ratio = energy / max;
        this.bar.clear();
        this.bar.fillStyle(0x111111, 0.9);
        this.bar.fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 3);
        this.bar.fillStyle(0x1a1a1a, 1);
        this.bar.fillRoundedRect(bx, by, bw, bh, 3);
        const col = ratio < 0.3
            ? Phaser.Display.Color.GetColor(220, Math.floor(ratio * 3 * 120), 0)
            : Phaser.Display.Color.GetColor(0, 200, 65);
        this.bar.fillStyle(col, 1);
        if (ratio > 0.01) this.bar.fillRoundedRect(bx, by, bw * ratio, bh, 3);
        if (ratio > 0.85) {
            this.bar.lineStyle(1, 0x00ff41, 0.4);
            this.bar.strokeRoundedRect(bx, by, bw, bh, 3);
        }
    }

    _banner(name) {
        const W = this.scale.width;
        const t = this.add.text(W / 2, 88, `LEVEL: ${name}`, {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#00ff41', stroke: '#001100', strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 400 });
        this.time.delayedCall(2200, () => {
            this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() });
        });
    }
}

// ═════════════════════════════════════════════════════════════
//  WIN SCENE
// ═════════════════════════════════════════════════════════════
class WinScene extends Phaser.Scene {
    constructor() { super({ key: 'WinScene' }); }

    init(data) {
        this.finalScore  = data.score      || 0;
        this.levelIndex  = data.levelIndex || 0;
        this.levelName   = data.levelName  || '';
    }

    create() {
        const W = this.scale.width, H = this.scale.height;
        buildBg(this, W, H, 0x050f05, 0x0a200a);
        drawStars(this, W, H, 70);

        // Particle texture
        const pg = this.make.graphics({ x: 0, y: 0, add: false });
        pg.fillStyle(0xffffff, 1);
        pg.fillCircle(5, 5, 5);
        pg.generateTexture('dot', 10, 10);
        pg.destroy();

        const hero = this.add.sprite(W / 2, H * 0.28, 'flow').setScale(4);
        registerAnims(this);
        hero.play('happy');
        this.tweens.add({ targets: hero, y: H * 0.28 - 14, duration: 1200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        this.time.delayedCall(200, () => {
            burst(this, W * 0.28, H * 0.55, C.grow.particle,  16);
            burst(this, W * 0.72, H * 0.45, C.water.particle, 16);
            burst(this, W * 0.50, H * 0.65, C.bloom.particle, 16);
        });

        this.add.text(W / 2, H * 0.50, 'BLOOM RESTORED!', {
            fontFamily: 'monospace', fontSize: '22px',
            color: '#00ff41', stroke: '#002200', strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.50 + 38, "WELL FLOW'N 🌿", {
            fontFamily: 'monospace', fontSize: '14px', color: '#aaffcc',
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.50 + 66, `SCORE: ${this.finalScore}`, {
            fontFamily: 'monospace', fontSize: '12px', color: '#00ff41', alpha: 0.8,
        }).setOrigin(0.5);

        const hasNext  = Boolean(window.FLOW_LEVELS[this.levelIndex + 1]);
        const nextIdx  = hasNext ? this.levelIndex + 1 : 0;
        const btnLabel = hasNext ? '[ NEXT LEVEL ]' : '[ PLAY AGAIN ]';

        const btn = this.add.text(W / 2, H * 0.76, btnLabel, {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#00ff41', stroke: '#001100', strokeThickness: 3,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: btn, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
        btn.on('pointerdown', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene', { levelIndex: nextIdx });
                this.scene.launch('UIScene');
            });
        });

        const menu = this.add.text(W / 2, H * 0.83, '[ MAIN MENU ]', {
            fontFamily: 'monospace', fontSize: '10px', color: '#446644',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menu.on('pointerdown', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('MenuScene'));
        });

        this.cameras.main.fadeIn(600);
    }
}

// ═════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═════════════════════════════════════════════════════════════

function buildBg(scene, W, H, topHex, botHex) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(topHex, topHex, botHex, botHex, 1);
    bg.fillRect(0, 0, W, H);
}

function drawStars(scene, W, H, count) {
    const g = scene.add.graphics();
    for (let i = 0; i < count; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.08, 0.50));
        g.fillCircle(
            Phaser.Math.Between(0, W),
            Phaser.Math.Between(0, H * 0.72),
            Phaser.Math.FloatBetween(0.4, 1.4)
        );
    }
    // Twinkle a handful
    const spots = Array.from({ length: 7 }, () => {
        const d = scene.add.graphics();
        d.fillStyle(0xffffff, 0.55);
        d.fillCircle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(10, H * 0.55), 1.3);
        return d;
    });
    scene.tweens.add({
        targets: spots, alpha: 0.08,
        duration: Phaser.Math.Between(900, 2200),
        yoyo: true, repeat: -1,
        delay: (_, i) => i * 280,
    });
}

function buildScrollingBg(scene, ld, W, H) {
    const LW = ld.worldLength;
    const topCol = parseInt(ld.bgGradientTop.slice(1), 16);
    const botCol = parseInt(ld.bgGradientBottom.slice(1), 16);

    // Sky
    const sky = scene.add.graphics();
    sky.fillGradientStyle(topCol, topCol, botCol, botCol, 1);
    sky.fillRect(0, 0, LW, H);

    // Distant mountains — parallax 0.3
    const mtn = scene.add.graphics().setScrollFactor(0.3);
    mtn.fillStyle(0x0a1a0a, 0.55);
    for (let i = 0; i < Math.ceil(LW / 200) + 2; i++) {
        const mx = i * 200 + Phaser.Math.Between(-20, 20);
        const mh = Phaser.Math.Between(70, 150);
        mtn.fillTriangle(mx, H - 96, mx + 88, H - 96 - mh, mx + 176, H - 96);
    }

    // Mid clouds — parallax 0.55
    const cld = scene.add.graphics().setScrollFactor(0.55);
    cld.fillStyle(0x1a3a2a, 0.28);
    for (let i = 0; i < Math.ceil(LW / 280) + 2; i++) {
        const cx = i * 280 + Phaser.Math.Between(0, 80);
        const cy = Phaser.Math.Between(70, 190);
        cld.fillEllipse(cx, cy, 180, 48);
        cld.fillEllipse(cx + 55, cy - 18, 110, 36);
    }

    // Ground base
    const gnd = scene.add.graphics();
    gnd.fillStyle(0x091509, 1);
    gnd.fillRect(0, 478, LW, H - 478);
    gnd.fillStyle(0x003311, 1);
    gnd.fillRect(0, 476, LW, 4);

    // Background stars (fixed to camera)
    drawStars(scene, W, H * 0.5, 55);
}

function buildPlatformGfx(scene, ld) {
    const g = scene.add.graphics().setDepth(2);

    ld.platforms.forEach(p => {
        if (p.type === 'gap') return;
        const y   = (p.y || 480) + (p.elevated ? -20 : 0);
        const col = { dead: 0x181818, water: 0x0d1e38, crystal: 0x180a2c }[p.type] || 0x181818;
        const top = { dead: 0x2e2e2e, water: 0x004488, crystal: 0x551188 }[p.type] || 0x2e2e2e;

        g.fillStyle(col, 1);  g.fillRect(p.x, y, p.w, 22);
        g.fillStyle(top, 1);  g.fillRect(p.x, y - 3, p.w, 4);

        // Pixel notches
        g.fillStyle(0x000000, 0.35);
        for (let nx = p.x + 18; nx < p.x + p.w - 8; nx += 30) g.fillRect(nx, y, 2, 7);
    });
}

function spawnObjects(scene, defs) {
    return defs.map(def => {
        const col = C[def.type] || C.grow;

        const dead = scene.add.rectangle(def.x, def.y, 46, 46, col.dead)
            .setStrokeStyle(1, col.glow, 0.22).setDepth(5);

        const deadIcon = scene.add.text(def.x, def.y, def.label, { fontSize: '18px', alpha: 0.3 })
            .setOrigin(0.5).setDepth(6);

        const alive = scene.add.rectangle(def.x, def.y, 46, 46, col.alive)
            .setAlpha(0).setStrokeStyle(2, 0xffffff, 0.2).setDepth(5);

        const aliveIcon = scene.add.text(def.x, def.y, def.label, { fontSize: '20px' })
            .setOrigin(0.5).setAlpha(0).setDepth(7);

        const ring = scene.add.graphics().setDepth(4);
        ring.lineStyle(2, col.glow, 0.16);
        ring.strokeCircle(def.x, def.y, 30);

        let hintText = null;
        if (def.hint) {
            hintText = scene.add.text(def.x, def.y - 44, def.hint, {
                fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
                backgroundColor: '#00000099', padding: { x: 6, y: 3 },
            }).setOrigin(0.5).setAlpha(0).setDepth(15);
        }

        // Idle bob
        scene.tweens.add({
            targets: [dead, deadIcon], y: def.y - 5,
            duration: 1100 + Phaser.Math.Between(0, 500),
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });

        return { ...def, active: false, dead, deadIcon, alive, aliveIcon, ring, hintText, hintVisible: false };
    });
}

function activateObj(scene, obj) {
    const col = C[obj.type] || C.grow;

    scene.tweens.killTweensOf([obj.dead, obj.deadIcon]);
    scene.tweens.add({ targets: [obj.dead, obj.deadIcon], alpha: 0, duration: 220 });

    obj.alive.setScale(0);
    obj.aliveIcon.setScale(0);
    scene.tweens.add({
        targets: [obj.alive, obj.aliveIcon],
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 200, ease: 'Back.Out',
    });

    obj.ring.clear();
    obj.ring.lineStyle(2, col.glow, 0.65);
    obj.ring.strokeCircle(obj.x, obj.y, 30);
    scene.tweens.add({ targets: obj.ring, alpha: 0, duration: 550 });

    burst(scene, obj.x, obj.y, col.particle, 12);

    // Score pop
    const pop = scene.add.text(obj.x, obj.y - 28, `+${obj.scoreValue}`, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    scene.tweens.add({
        targets: pop, y: obj.y - 62, alpha: 0, duration: 680, ease: 'Quad.Out',
        onComplete: () => pop.destroy(),
    });

    // Alive pulse
    scene.tweens.add({
        targets: obj.alive, alpha: 0.6, duration: 950,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 180,
    });
}

/** Particle burst — Phaser 3.60 API */
function burst(scene, x, y, tint, count) {
    const key = scene.textures.exists('dot') ? 'dot' : 'particle';
    try {
        const e = scene.add.particles(x, y, key, {
            speed: { min: 50, max: 170 }, angle: { min: 0, max: 360 },
            scale: { start: 1.1, end: 0 }, lifespan: 560,
            quantity: count, tint, emitting: false,
        });
        e.explode(count);
        scene.time.delayedCall(700, () => { if (e?.active) e.destroy(); });
    } catch (_) { /* graceful */ }
}

function playerPulse(scene, player, base) {
    scene.tweens.add({
        targets: player, scaleX: base * 1.18, scaleY: base * 0.84,
        duration: 75, yoyo: true, ease: 'Quad.Out',
    });
}

function registerAnims(scene) {
    Object.entries(ANIM_DEFS).forEach(([key, d]) => {
        if (scene.anims.exists(key)) return;
        scene.anims.create({
            key,
            frames:    scene.anims.generateFrameNumbers('flow', { start: d.start, end: d.end }),
            frameRate: d.rate,
            repeat:    d.loop ? -1 : 0,
        });
    });
}

function trySound(scene, key) {
    try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.38 }); }
    catch (_) { /* silent */ }
}
