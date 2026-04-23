const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    backgroundColor: '#0d1f2d',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
};

new Phaser.Game(config);

// --- STATE ---
let player;
let energy = 100, maxEnergy = 100;
let objects = [];
let energyBar, energyText;
let gameEnded = false;
let score = 0;
let scoreText;
let bgStars = [];

// --- PRELOAD ---
function preload() {
    // Sprite sheet — your flow.png in assets/
    this.load.spritesheet('flow', 'assets/flow.png', {
        frameWidth: 32,
        frameHeight: 32
    });

    // Particle image — simple white dot fallback (no external dependency)
    // We generate it procedurally so no file needed
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ff88, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();

    // Optional sounds — gracefully skipped if files missing
    this.load.audio('tap', 'assets/tap.wav');
    this.load.audio('grow', 'assets/grow.wav');
    this.load.audio('finale', 'assets/finale.wav');
}

// --- CREATE ---
function create() {

    const W = this.scale.width;
    const H = this.scale.height;

    // ── BACKGROUND ──────────────────────────────────────────
    this.cameras.main.setBackgroundColor('#0d1f2d');

    // Subtle star field
    const starGfx = this.add.graphics();
    for (let i = 0; i < 60; i++) {
        const x = Phaser.Math.Between(0, W * 8);
        const y = Phaser.Math.Between(0, H);
        const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
        const size = Phaser.Math.FloatBetween(0.5, 1.5);
        starGfx.fillStyle(0xffffff, alpha);
        starGfx.fillCircle(x, y, size);
    }

    // Ground line
    const ground = this.add.graphics();
    ground.fillStyle(0x1a3a2a, 1);
    ground.fillRect(0, 490, W * 8, 30);
    ground.fillStyle(0x00aa44, 1);
    ground.fillRect(0, 488, W * 8, 4);

    // ── PLAYER ──────────────────────────────────────────────
    player = this.physics.add.sprite(80, 460, 'flow');
    player.setCollideWorldBounds(true);
    player.setScale(3); // 32px → ~96px on screen

    // ── ANIMATIONS ──────────────────────────────────────────
    // Guard: only create if flow texture loaded successfully
    if (this.textures.exists('flow')) {
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('flow', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('flow', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'happy',
            frames: this.anims.generateFrameNumbers('flow', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'low_energy',
            frames: this.anims.generateFrameNumbers('flow', { start: 12, end: 15 }),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('flow', { start: 16, end: 19 }),
            frameRate: 8,
            repeat: 0
        });

        player.play('run');
    }

    // ── CAMERA ──────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, W * 8, H);
    this.cameras.main.startFollow(player, true, 0.08, 0.08);

    // ── LEVEL OBJECTS ────────────────────────────────────────
    objects = [
        createObj(this, 280,  460, 'grow'),
        createObj(this, 500,  440, 'grow'),
        createObj(this, 720,  460, 'water'),
        createObj(this, 960,  430, 'grow'),
        createObj(this, 1180, 460, 'water'),
        createObj(this, 1420, 440, 'grow'),
        createObj(this, 1680, 460, 'bloom'),
    ];

    // ── INPUT ────────────────────────────────────────────────
    this.input.on('pointerdown', () => activateFlow(this));

    // ── HUD (fixed to camera) ────────────────────────────────
    // Energy bar background
    energyBar = this.add.graphics().setScrollFactor(0).setDepth(10);

    // Labels
    this.add.text(20, 16, 'ENERGY', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff41',
        alpha: 0.7
    }).setScrollFactor(0).setDepth(10);

    scoreText = this.add.text(W - 20, 16, 'SCORE: 0', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff41',
        alpha: 0.7
    }).setScrollFactor(0).setDepth(10).setOrigin(1, 0);

    // Tap hint at bottom
    const hint = this.add.text(W / 2, H - 30, 'TAP TO FLOW', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#00ff41',
        alpha: 0.5
    }).setScrollFactor(0).setDepth(10).setOrigin(0.5);

    this.tweens.add({
        targets: hint,
        alpha: 0.15,
        duration: 900,
        yoyo: true,
        repeat: -1
    });
}

// ── OBJECT FACTORY ───────────────────────────────────────────
function createObj(scene, x, y, type) {
    const colors = {
        grow:  0x2a4a2a,
        water: 0x1a2a4a,
        bloom: 0x4a2a4a
    };
    const glows = {
        grow:  0x00ff44,
        water: 0x00aaff,
        bloom: 0xff44ff
    };

    // Dead version (dark block)
    const dead = scene.add.rectangle(x, y, 44, 44, colors[type] || 0x333333)
        .setStrokeStyle(1, glows[type] || 0x444444, 0.3);

    // Alive version (hidden until activated)
    const alive = scene.add.rectangle(x, y, 44, 44, glows[type] || 0x00ff44)
        .setAlpha(0)
        .setStrokeStyle(2, 0xffffff, 0.3);

    // Type label
    const labels = { grow: '🌱', water: '💧', bloom: '🌸' };
    const label = scene.add.text(x, y, labels[type] || '?', {
        fontSize: '18px'
    }).setOrigin(0.5).setDepth(2);

    return { x, y, type, active: false, dead, alive, label };
}

// ── FLOW ACTIVATION ──────────────────────────────────────────
function activateFlow(scene) {
    if (energy < 15 || gameEnded) return;

    energy -= 15;

    // Camera shake
    scene.cameras.main.shake(80, 0.003);

    // Player pulse
    scene.tweens.add({
        targets: player,
        scaleX: 3.4, scaleY: 2.6,
        duration: 80,
        yoyo: true
    });

    // Sound
    trySound(scene, 'tap');

    // Find nearest unactivated object
    let nearest = null;
    let minDist = 160;

    objects.forEach(obj => {
        const dist = Math.abs(obj.x - player.x);
        if (!obj.active && dist < minDist) {
            nearest = obj;
            minDist = dist;
        }
    });

    if (!nearest) return;

    nearest.active = true;
    score += 100;

    // Dead → alive transition
    scene.tweens.add({
        targets: nearest.dead,
        alpha: 0,
        duration: 300
    });
    scene.tweens.add({
        targets: nearest.alive,
        alpha: 0.85,
        duration: 400
    });

    // Scale pop on alive tile
    nearest.alive.setScale(0);
    scene.tweens.add({
        targets: nearest.alive,
        scaleX: 1.2, scaleY: 1.2,
        duration: 120,
        ease: 'Back.Out',
        onComplete: () => {
            scene.tweens.add({ targets: nearest.alive, scaleX: 1, scaleY: 1, duration: 80 });
        }
    });

    // Type-specific behaviour
    if (nearest.type === 'grow') {
        player.setVelocityY(-320);
        if (scene.textures.exists('flow')) player.play('jump', true);
        spawnParticles(scene, nearest.x, nearest.y, 0x00ff88, 8);
        trySound(scene, 'grow');
    }

    if (nearest.type === 'water') {
        // Ripple: brief horizontal speed boost
        spawnParticles(scene, nearest.x, nearest.y, 0x00aaff, 10);
        scene.cameras.main.flash(200, 0, 100, 180, false);
        trySound(scene, 'grow');
    }

    if (nearest.type === 'bloom') {
        triggerFinale(scene);
    }
}

// ── PARTICLE BURST (Phaser 3.60 API) ─────────────────────────
function spawnParticles(scene, x, y, color, count) {
    // Tint the generic particle texture per burst
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 40, max: 120 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        quantity: count,
        tint: color,
        emitting: false
    });
    emitter.explode(count);

    // Auto-destroy after particles die
    scene.time.delayedCall(600, () => emitter.destroy());
}

// ── FINALE ───────────────────────────────────────────────────
function triggerFinale(scene) {
    gameEnded = true;

    if (scene.textures.exists('flow')) player.play('happy');

    scene.cameras.main.zoomTo(1.3, 1200, 'Sine.easeInOut');

    trySound(scene, 'finale');

    // Big particle celebration
    spawnParticles(scene, player.x, player.y - 30, 0x00ff88, 25);
    scene.time.delayedCall(300, () => spawnParticles(scene, player.x, player.y, 0xffdd00, 20));
    scene.time.delayedCall(600, () => spawnParticles(scene, player.x, player.y - 20, 0xff44ff, 15));

    // End card
    const W = scene.scale.width;
    const H = scene.scale.height;

    const panel = scene.add.rectangle(W / 2, H / 2, 260, 120, 0x000000, 0.85)
        .setScrollFactor(0)
        .setDepth(20)
        .setStrokeStyle(1, 0x00ff41, 0.6);

    scene.add.text(W / 2, H / 2 - 24, 'BLOOM RESTORED!', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#00ff41',
        align: 'center'
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    scene.add.text(W / 2, H / 2 + 4, 'WELL FLOW\'N 🌿', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#aaffcc',
        align: 'center'
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    scene.add.text(W / 2, H / 2 + 26, `SCORE: ${score}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#00ff41',
        alpha: 0.7
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    // Tap to restart
    const restart = scene.add.text(W / 2, H / 2 + 52, '[ TAP TO REPLAY ]', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff41',
        alpha: 0.5
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    scene.tweens.add({ targets: restart, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });

    scene.input.once('pointerdown', () => {
        scene.cameras.main.zoomTo(1, 300);
        scene.scene.restart();
        // Reset globals
        energy = 100;
        gameEnded = false;
        score = 0;
        objects = [];
    });
}

// ── SOUND HELPER (graceful — won't crash if file missing) ─────
function trySound(scene, key) {
    try {
        if (scene.cache.audio.exists(key)) {
            scene.sound.play(key, { volume: 0.4 });
        }
    } catch (e) { /* silence */ }
}

// ── UPDATE ───────────────────────────────────────────────────
function update() {
    if (!gameEnded) {
        player.setVelocityX(90);
    } else {
        player.setVelocityX(0);
    }

    // Simple ground clamp
    if (player.y >= 460) {
        player.setY(460);
        player.setVelocityY(0);

        // Landing — resume run/idle anim
        if (this.textures && this.textures.exists('flow') && !gameEnded) {
            if (energy < 20) {
                player.play('low_energy', true);
            } else if (energy < 50) {
                player.play('idle', true);
            } else {
                player.play('run', true);
            }
        }
    }

    // Energy regen
    if (energy < maxEnergy) energy += 0.1;

    // Score text update
    if (scoreText) scoreText.setText(`SCORE: ${score}`);

    drawHUD();
}

// ── HUD ──────────────────────────────────────────────────────
function drawHUD() {
    if (!energyBar) return;

    const barX = 20;
    const barY = 28;
    const barW = 140;
    const barH = 6;
    const ratio = energy / maxEnergy;

    energyBar.clear();

    // Track
    energyBar.fillStyle(0x1a1a1a, 1);
    energyBar.fillRoundedRect(barX, barY, barW, barH, 3);

    // Border
    energyBar.lineStyle(1, 0x00ff41, 0.25);
    energyBar.strokeRoundedRect(barX, barY, barW, barH, 3);

    // Fill — color shifts red when low
    const fillColor = ratio < 0.3
        ? Phaser.Display.Color.GetColor(255, Math.floor(ratio * 3 * 180), 0)
        : Phaser.Display.Color.GetColor(0, 220, 80);

    energyBar.fillStyle(fillColor, 1);
    energyBar.fillRoundedRect(barX, barY, barW * ratio, barH, 3);
}
