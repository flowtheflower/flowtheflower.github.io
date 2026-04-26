/**
 * FLOW: BLOOMFALL — game.js
 * Requires: Phaser 3.60 | levels.js loaded first
 *
 * Spritesheet (assets/flow_game.png) — 220×230px per frame, 4 cols × 8 rows:
 *   Row 0  0– 3   IDLE
 *   Row 1  4– 7   RUN
 *   Row 2  8–11   HAPPY
 *   Row 3  12–15  LOW_ENERGY
 *   Row 4  16–19  JUMP
 *   Row 5  20–23  LAND
 *   Row 6  24–27  BLEND (run midpoints A)
 *   Row 7  28–31  NEUTRAL (run midpoints B)
 *
 * Run stride sequence: 4,28,24,5,29,6,28,24,7,29 (10-frame smooth cycle)
 */

// ── SPRITE ────────────────────────────────────────────────────
var SPR_W   = 220;
var SPR_H   = 230;
var P_SCALE = 0.50;  // 220*0.5=110px, 230*0.5=115px on screen

var ANIMS = [
    { key: 'idle',       s: 0,  e: 3,  fps: 5,  loop: true,  type: 'seq',    seq: null },
    { key: 'run',        s: 4,  e: 7,  fps: 12, loop: true,  type: 'seq',    seq: [4,28,24,5,29,6,28,24,7,29] },
    { key: 'happy',      s: 8,  e: 11, fps: 8,  loop: true,  type: 'seq',    seq: null },
    { key: 'low_energy', s: 12, e: 15, fps: 4,  loop: true,  type: 'seq',    seq: null },
    { key: 'jump',       s: 16, e: 19, fps: 9,  loop: false, type: 'seq',    seq: null },
    { key: 'land',       s: 20, e: 23, fps: 10, loop: false, type: 'seq',    seq: null },
    { key: 'exhausted',  s: 12, e: 15, fps: 3,  loop: true,  type: 'seq',    seq: [12,13,12,13,14] },
];

// ── TILES ─────────────────────────────────────────────────────
var TILE_SRC = 64;
var TILE_DSP = 48;
var TILE = {
    dead_ground:0,  alive_ground:1,  top_grass:2,      rock:3,           vines:4,
    dead_plant:5,   grow_plant1:6,   grow_plant2:7,    bloom_flower:8,   bush:9,
    water_still:10, water_flow1:11,  water_flow2:12,   waterfall_top:13, waterfall_mid:14,
    waterfall_btm:15,lily_pad:16,    mushroom:17,      tree_trunk:18,    leaves:19,
    background1:20, background2:21,  cloud:22,         crystal:23,       sparkle:24,
};

// ── PALETTE ───────────────────────────────────────────────────
var PAL = {
    grow:  { ptcl: 0x44ff88 },
    water: { ptcl: 0x66ccff },
    bloom: { ptcl: 0xff99ff },
};

// ── PHYSICS ───────────────────────────────────────────────────
var SPEED           = 160;   // max px/s horizontal (at full 80px drag)
var JUMP_VEL        = -420;  // px/s upward on first jump
var JUMP2_VEL       = -340;  // px/s upward on double jump
var GRAV            = 900;   // px/s² downward
var WORLD_FLOOR     = 472;   // absolute fallback floor Y (feet)
var E_COST          = 22;    // energy drained per object activation
var E_REGEN         = 0.08;  // energy per frame (slow, deliberate)
var EXHAUST_THRESH  = 0;     // energy = 0 → exhausted
var EXHAUST_RECOVER = 35;    // recover to this before moving again
var ACTIVATE_RANGE  = 72;    // px proximity to begin fill timer

// ── BOOT ──────────────────────────────────────────────────────
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

    var heroY  = H * 0.34;
    var hero   = this.add.sprite(W / 2, heroY, 'flow').setScale(P_SCALE * 1.6).setDepth(2);
    hero.play('idle');
    this.tweens.add({ targets: hero, y: heroY - 8, duration: 1800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    this.add.text(W/2, H*0.60, 'FLOW:', {
        fontFamily:'monospace', fontSize:'32px', color:'#00ff41', stroke:'#002211', strokeThickness:5
    }).setOrigin(0.5);
    this.add.text(W/2, H*0.60+42, 'BLOOMFALL', {
        fontFamily:'monospace', fontSize:'20px', color:'#aaffcc', stroke:'#002211', strokeThickness:3
    }).setOrigin(0.5);
    this.add.text(W/2, H*0.73, 'drag to move  ·  tap to jump  ·  restore the bloom', {
        fontFamily:'monospace', fontSize:'9px', color:'#446644'
    }).setOrigin(0.5);

    var hint = this.add.text(W/2, H*0.82, '— TAP TO BEGIN —', {
        fontFamily:'monospace', fontSize:'12px', color:'#00ff41'
    }).setOrigin(0.5);
    this.tweens.add({ targets:hint, alpha:0.15, duration:900, yoyo:true, repeat:-1 });

    this.input.once('pointerdown', function () {
        self.cameras.main.fade(300, 0,0,0);
        self.time.delayedCall(320, function () {
            self.scene.start('GameScene', { levelIndex:0 });
            self.scene.launch('UIScene');
        });
    });
};

// ═════════════════════════════════════════════════════════════
//  GAME SCENE
// ═════════════════════════════════════════════════════════════
function GameScene() { Phaser.Scene.call(this, { key:'GameScene' }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function (d) {
    this.levelIndex = d.levelIndex || 0;
    this.ld = window.FLOW_LEVELS[this.levelIndex] || window.FLOW_LEVELS[0];
};

GameScene.prototype.create = function () {
    var ld = this.ld, W = this.scale.width, H = this.scale.height, self = this;

    // State
    this.energy      = ld.startEnergy;
    this.maxEnergy   = 100;
    this.score       = 0;
    this.ended       = false;
    this.velY        = 0;
    this.grounded    = false;
    this.jumpCount   = 0;       // 0=can jump, 1=can double-jump, 2=no more jumps
    this.exhausted   = false;   // true when energy < EXHAUST_THRESH
    this.hints       = {};
    this.objs        = [];
    this.curAnim     = '';
    this.platforms   = [];      // [{x,y,w,h}] for collision

    this.physics.world.setBounds(0, 0, ld.worldLength, H);

    // Build world
    buildBg(this, ld, H);
    this.platforms = buildPlatforms(this, ld);
    buildDecor(this, ld);
    makeDot(this);
    this.objs = spawnObjs(this, ld.objects);

    // Player sprite — manual physics
    this.px = ld.playerStart.x;
    this.py = ld.playerStart.y;
    this.player = this.add.sprite(this.px, this.py, 'flow')
        .setScale(P_SCALE).setDepth(20);
    registerAnims(this);
    this.playAnim('idle');

    // ── Drag-to-move input state ───────────────────────────────
    this.dragActive   = false;    // pointer is currently held
    this.dragStartX   = 0;        // world X where drag began
    this.dragStartY   = 0;
    this.dragDeltaX   = 0;        // current horizontal drag offset
    this.velX         = 0;        // current horizontal velocity (set by drag)
    this.TAP_THRESHOLD = 12;      // px movement below which = tap (jump)

    // Drag arrow indicator (world-space, above player)
    this.dragArrow = this.add.graphics().setDepth(25);

    this.input.on('pointerdown', function (ptr) {
        self.dragActive = true;
        self.dragStartX = ptr.x;
        self.dragStartY = ptr.y;
        self.dragDeltaX = 0;
    });

    this.input.on('pointermove', function (ptr) {
        if (!self.dragActive) return;
        self.dragDeltaX = ptr.x - self.dragStartX;
    });

    this.input.on('pointerup', function (ptr) {
        if (!self.dragActive) return;
        var totalDrag = Math.abs(ptr.x - self.dragStartX);
        self.dragActive = false;
        self.velX       = 0;
        self.dragArrow.clear();

        // Tap: no significant drag → jump
        if (totalDrag < self.TAP_THRESHOLD) {
            self.doJump();
        }
    });

    // ── Proximity activation state (per object) ───────────────
    // o.fillTimer = ms spent in range, o.fillBar = Graphics
    this.ACTIVATE_TIME = 1500;   // ms to hold proximity before activation

    // Camera: no fixed offset — centers on player (free exploration)
    this.camTarget = { x:this.px, y:this.py };
    this.cameras.main.setBounds(0, 0, ld.worldLength, H);
    this.cameras.main.startFollow(this.camTarget, true, 0.10, 0.10);
    this.cameras.main.fadeIn(400);

    this.time.delayedCall(80, function () {
        self.events.emit('levelStart', { name:ld.name, total:ld.objects.length });
    });
};

GameScene.prototype.update = function (time, delta) {
    if (this.ended) return;
    var dt   = Math.min(delta / 1000, 0.05);
    var self = this;

    // ── Exhaustion check ───────────────────────────────────────
    if (!this.exhausted && this.energy <= EXHAUST_THRESH) {
        this.exhausted = true;
        this.velX = 0;
        this.playAnim('exhausted');
    }
    if (this.exhausted && this.energy >= EXHAUST_RECOVER) {
        this.exhausted = false;
    }

    // ── Horizontal velocity from drag ──────────────────────────
    if (!this.exhausted) {
        if (this.dragActive) {
            // Scale drag distance to speed: 80px drag = max speed
            var raw   = this.dragDeltaX / 80;
            var clamped = Math.max(-1, Math.min(1, raw));
            this.velX = clamped * SPEED;
        } else {
            // Friction: decelerate quickly when drag released
            this.velX *= 0.75;
            if (Math.abs(this.velX) < 1) this.velX = 0;
        }
    } else {
        this.velX = 0;
    }

    // Flip sprite to face movement direction
    if (this.velX > 2)       this.player.setFlipX(false);
    else if (this.velX < -2) this.player.setFlipX(true);

    this.px += this.velX * dt;

    // Clamp to world bounds
    this.px = Math.max(20, Math.min(this.ld.worldLength - 20, this.px));

    // ── Draw drag arrow ────────────────────────────────────────
    this.dragArrow.clear();
    if (this.dragActive && Math.abs(this.dragDeltaX) > this.TAP_THRESHOLD && !this.exhausted) {
        var ax    = this.px;
        var ay    = this.py - 75;
        var len   = Math.min(Math.abs(this.dragDeltaX), 60);
        var dir   = this.dragDeltaX > 0 ? 1 : -1;
        this.dragArrow.lineStyle(3, 0x00ff88, 0.7);
        this.dragArrow.beginPath();
        this.dragArrow.moveTo(ax - dir * len * 0.5, ay);
        this.dragArrow.lineTo(ax + dir * len * 0.5, ay);
        // Arrowhead
        this.dragArrow.lineTo(ax + dir * len * 0.5 - dir * 10, ay - 7);
        this.dragArrow.moveTo(ax + dir * len * 0.5, ay);
        this.dragArrow.lineTo(ax + dir * len * 0.5 - dir * 10, ay + 7);
        this.dragArrow.strokePath();
    }

    // ── Vertical (gravity) ────────────────────────────────────
    this.velY += GRAV * dt;
    this.py   += this.velY * dt;

    // ── Platform collision ─────────────────────────────────────
    var landed = false;
    var floorY = WORLD_FLOOR;

    this.platforms.forEach(function (p) {
        var feetY  = self.py;
        var feetX  = self.px;
        var within = feetX >= p.x && feetX <= p.x + p.w;
        var on     = feetY >= p.y && feetY <= p.y + 20;
        if (within && on && self.velY >= 0) {
            if (p.y < floorY) floorY = p.y;
            landed = true;
        }
    });

    if (this.py >= WORLD_FLOOR) { floorY = WORLD_FLOOR; landed = true; }

    if (landed && this.velY >= 0) {
        this.py        = floorY;
        this.velY      = 0;
        this.jumpCount = 0;
        if (!this.grounded) {
            this.grounded = true;
            if (!this.exhausted) {
                this.playAnim('land');
                this.time.delayedCall(180, function () { self.syncAnim(); });
            }
        }
    } else {
        this.grounded = false;
    }

    // ── Update sprite + camera ─────────────────────────────────
    this.player.setPosition(this.px, this.py);
    this.camTarget.x = this.px;
    this.camTarget.y = this.py;

    // ── Energy regen ──────────────────────────────────────────
    this.energy = Math.min(this.maxEnergy, this.energy + E_REGEN);

    // ── Animation sync ────────────────────────────────────────
    if (!this.ended) {
        if (this.exhausted) {
            if (this.curAnim !== 'exhausted') this.playAnim('exhausted');
        } else if (!this.grounded && this.curAnim !== 'jump') {
            // keep jump anim while airborne
        } else if (this.curAnim !== 'land' && this.curAnim !== 'jump') {
            this.syncAnim();
        }
    }

    // ── Proximity activation ──────────────────────────────────
    this.objs.forEach(function (o) {
        if (o.active) return;
        var dist = Math.abs(o.x - self.px);
        var inRange = dist < ACTIVATE_RANGE;

        if (inRange && !self.exhausted) {
            // Increment fill timer
            o.fillTimer = (o.fillTimer || 0) + delta;

            // Draw fill bar above object (world space)
            if (!o.fillBar) {
                o.fillBar = self.add.graphics().setDepth(18);
            }
            o.fillBar.clear();

            var ratio  = Math.min(o.fillTimer / self.ACTIVATE_TIME, 1);
            var bw     = 44, bh = 5;
            var bx     = o.x - bw / 2;
            var by     = o.y - 46;

            // Background
            o.fillBar.fillStyle(0x111111, 0.8);
            o.fillBar.fillRoundedRect(bx, by, bw, bh, 3);
            // Fill — colour shifts green→white as it fills
            var fillColor = ratio > 0.8 ? 0xffffff : 0x00ff88;
            o.fillBar.fillStyle(fillColor, 1);
            o.fillBar.fillRoundedRect(bx, by, bw * ratio, bh, 3);

            // Pulse the object when almost full
            if (ratio > 0.85 && !o.pulsing) {
                o.pulsing = true;
                self.tweens.add({ targets: o.dead, scaleX: 1.15, scaleY: 1.15,
                    duration: 120, yoyo: true, repeat: -1, id: 'obj_pulse_'+o.id });
            }

            // ACTIVATE when full
            if (o.fillTimer >= self.ACTIVATE_TIME) {
                o.active = true;
                o.fillTimer = 0;
                if (o.fillBar) { o.fillBar.clear(); }
                if (o.pulsing) {
                    self.tweens.killTweensOf(o.dead);
                    o.dead.setScale(1);
                    o.pulsing = false;
                }

                self.energy -= E_COST;
                self.energy  = Math.max(0, self.energy);
                self.score  += o.scoreValue;
                activateObj(self, o);
                self.cameras.main.shake(75, 0.002);
                pulseSpr(self, self.player, P_SCALE);
                trySound(self, 'grow');

                if (o.type === 'grow') {
                    self.velY = JUMP_VEL;
                    self.grounded = false;
                    self.jumpCount = 1;
                    self.playAnim('jump');
                } else if (o.type === 'water') {
                    self.cameras.main.flash(200, 0, 70, 150, false);
                } else if (o.type === 'bloom') {
                    self.time.delayedCall(200, function () { self.doWin(); });
                }
            }

        } else {
            // Out of range — reset timer and bar
            if (o.fillTimer > 0) {
                o.fillTimer = 0;
                if (o.fillBar) o.fillBar.clear();
                if (o.pulsing) {
                    self.tweens.killTweensOf(o.dead);
                    o.dead.setScale(1);
                    o.pulsing = false;
                }
            }
        }

        // Show hint on first approach
        if (inRange && o.hintTxt && !self.hints[o.id]) {
            self.hints[o.id] = true;
            self.tweens.add({ targets:o.hintTxt, alpha:1, duration:260 });
            self.time.delayedCall(1800, function () {
                if (o.hintTxt && o.hintTxt.active)
                    self.tweens.add({ targets:o.hintTxt, alpha:0, duration:300 });
            });
        }
    });

    // ── HUD emit ──────────────────────────────────────────────
    this.events.emit('stateUpdate', {
        energy:    this.energy,
        maxEnergy: this.maxEnergy,
        score:     this.score,
        exhausted: this.exhausted,
        done:      this.objs.filter(function(o){ return o.active; }).length,
        total:     this.objs.length,
    });
};

GameScene.prototype.doJump = function () {
    if (this.ended || this.exhausted) return;
    if (this.jumpCount < 2) {
        this.jumpCount++;
        var vel = this.jumpCount === 1 ? JUMP_VEL : JUMP2_VEL;
        this.velY     = vel;
        this.grounded = false;
        this.playAnim('jump');
        this.cameras.main.shake(55, 0.0016);
        pulseSpr(this, this.player, P_SCALE);
        trySound(this, 'tap');
    }
};

GameScene.prototype.doWin = function () {
    var self = this;
    this.ended = true;
    this.playAnim('happy');
    trySound(this, 'finale');
    this.cameras.main.zoomTo(1.2, 900, 'Sine.easeInOut');

    burst(this, this.px, this.py-16, PAL.bloom.ptcl, 22);
    this.time.delayedCall(280, function () { burst(self, self.px, self.py,    PAL.grow.ptcl,  18); });
    this.time.delayedCall(560, function () { burst(self, self.px, self.py-24, PAL.water.ptcl, 14); });

    this.time.delayedCall(1600, function () {
        self.cameras.main.fade(450, 0,0,0);
        self.time.delayedCall(470, function () {
            self.scene.stop('UIScene');
            self.scene.start('WinScene', { score:self.score, levelIndex:self.levelIndex, levelName:self.ld.name });
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
    if      (this.exhausted)              this.playAnim('exhausted');
    else if (!this.grounded)              { /* keep jump anim */ }
    else if (Math.abs(this.velX) > 8)    this.playAnim('run');
    else if (this.energy < 22)           this.playAnim('low_energy');
    else                                  this.playAnim('idle');
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE
// ═════════════════════════════════════════════════════════════
function UIScene() { Phaser.Scene.call(this, { key:'UIScene' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
    var W = this.scale.width, self = this;

    var bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.52);
    bg.fillRoundedRect(10, 8, 192, 40, 6);

    this.bar = this.add.graphics();
    this.add.text(17, 12, 'ENERGY', { fontFamily:'monospace', fontSize:'8px', color:'#00ff41' });

    this.scoreTxt = this.add.text(W-12, 12, 'SCORE: 0', {
        fontFamily:'monospace', fontSize:'10px', color:'#00ff41'
    }).setOrigin(1,0);
    this.flowTxt = this.add.text(W-12, 26, '🌿 0/0', {
        fontFamily:'monospace', fontSize:'9px', color:'#aaffcc'
    }).setOrigin(1,0);

    // Exhaustion warning text
    this.exhaustTxt = this.add.text(W/2, 580, '😮‍💨  CATCHING BREATH...', {
        fontFamily:'monospace', fontSize:'11px', color:'#ff6644',
        stroke:'#000000', strokeThickness:3
    }).setOrigin(0.5).setAlpha(0).setDepth(30);

    var tap = this.add.text(W/2, 624, 'DRAG TO MOVE  ·  TAP TO JUMP', {
        fontFamily:'monospace', fontSize:'9px', color:'#00ff41'
    }).setOrigin(0.5).setAlpha(0.35);
    this.tweens.add({ targets:tap, alpha:0.08, duration:1000, yoyo:true, repeat:-1 });

    var game = this.scene.get('GameScene');
    game.events.on('stateUpdate', function (d) {
        self.drawBar(d.energy, d.maxEnergy, d.exhausted);
        self.scoreTxt.setText('SCORE: '+d.score);
        self.flowTxt.setText('🌿 '+d.done+'/'+d.total);
        // Show/hide exhaustion warning
        var targetAlpha = d.exhausted ? 1 : 0;
        if (self.exhaustTxt.alpha !== targetAlpha) {
            self.tweens.add({ targets:self.exhaustTxt, alpha:targetAlpha, duration:200 });
        }
    });
    game.events.on('levelStart', function (d) { self.banner(d.name); });
};

UIScene.prototype.drawBar = function (nrg, max, exhausted) {
    var bx=17, by=24, bw=150, bh=8, r=nrg/max;
    this.bar.clear();
    this.bar.fillStyle(0x0a0a0a,1);
    this.bar.fillRoundedRect(bx,by,bw,bh,4);
    // Bar pulses red when exhausted
    var col = exhausted
        ? Phaser.Display.Color.GetColor(220,30,0)
        : r < 0.3
            ? Phaser.Display.Color.GetColor(210, Math.floor(r*3*100), 0)
            : Phaser.Display.Color.GetColor(0,210,68);
    this.bar.fillStyle(col,1);
    if (r>0.01) this.bar.fillRoundedRect(bx,by,Math.max(4,bw*r),bh,4);
};

UIScene.prototype.banner = function (name) {
    var W=this.scale.width, self=this;
    var t = this.add.text(W/2,88,'LEVEL: '+name,{
        fontFamily:'monospace',fontSize:'12px',color:'#00ff41',stroke:'#001100',strokeThickness:3
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets:t, alpha:1, duration:320 });
    this.time.delayedCall(2000,function(){
        self.tweens.add({ targets:t, alpha:0, duration:380, onComplete:function(){ t.destroy(); } });
    });
};

// ═════════════════════════════════════════════════════════════
//  WIN SCENE
// ═════════════════════════════════════════════════════════════
function WinScene() { Phaser.Scene.call(this, { key:'WinScene' }); }
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;

WinScene.prototype.init = function (d) {
    this.finalScore = d.score||0;
    this.levelIndex = d.levelIndex||0;
    this.levelName  = d.levelName||'';
};

WinScene.prototype.create = function () {
    var W=this.scale.width, H=this.scale.height, self=this;
    makeDot(this);
    bgGrad(this,W,H,0x050f05,0x0a2010);
    stars(this,W,H,80);
    registerAnims(this);

    var heroY = H*0.27;
    var hero  = this.add.sprite(W/2,heroY,'flow').setScale(P_SCALE*1.6).setDepth(2);
    hero.play('happy');
    this.tweens.add({ targets:hero, y:heroY-10, duration:1600, ease:'Sine.easeInOut', yoyo:true, repeat:-1 });

    this.time.delayedCall(280,function(){
        burst(self,W*0.3,H*0.54,PAL.grow.ptcl,14);
        burst(self,W*0.7,H*0.46,PAL.water.ptcl,14);
        burst(self,W*0.5,H*0.64,PAL.bloom.ptcl,14);
    });

    this.add.text(W/2,H*0.50,'BLOOM RESTORED!',{
        fontFamily:'monospace',fontSize:'20px',color:'#00ff41',stroke:'#002200',strokeThickness:4
    }).setOrigin(0.5);
    this.add.text(W/2,H*0.50+34,"WELL FLOW'N 🌿",{
        fontFamily:'monospace',fontSize:'13px',color:'#aaffcc'
    }).setOrigin(0.5);
    this.add.text(W/2,H*0.50+58,'SCORE: '+this.finalScore,{
        fontFamily:'monospace',fontSize:'11px',color:'#00ff41'
    }).setOrigin(0.5);

    var hasNext = !!(window.FLOW_LEVELS[this.levelIndex+1]);
    var btn = this.add.text(W/2,H*0.74, hasNext?'[ NEXT LEVEL ]':'[ PLAY AGAIN ]',{
        fontFamily:'monospace',fontSize:'14px',color:'#00ff41',stroke:'#001100',strokeThickness:3
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    this.tweens.add({ targets:btn, alpha:0.28, duration:700, yoyo:true, repeat:-1 });
    btn.on('pointerdown',function(){
        self.cameras.main.fade(300,0,0,0);
        self.time.delayedCall(320,function(){
            self.scene.start('GameScene',{ levelIndex: hasNext?self.levelIndex+1:0 });
            self.scene.launch('UIScene');
        });
    });

    this.add.text(W/2,H*0.82,'[ MAIN MENU ]',{
        fontFamily:'monospace',fontSize:'10px',color:'#446644'
    }).setOrigin(0.5).setInteractive({ useHandCursor:true })
    .on('pointerdown',function(){
        self.cameras.main.fade(300,0,0,0);
        self.time.delayedCall(320,function(){ self.scene.start('MenuScene'); });
    });

    this.cameras.main.fadeIn(450);
};

// ═════════════════════════════════════════════════════════════
//  WORLD BUILDERS
// ═════════════════════════════════════════════════════════════

function buildBg(scene, ld, H) {
    var LW = ld.worldLength;

    // Deep sky
    var sky = scene.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x0a1a3a,0x0a1a3a,0x0d3020,0x0d3020,1);
    sky.fillRect(0,0,LW,H);

    // Background tile layers
    if (ld.bgLayers) {
        ld.bgLayers.forEach(function(layer){
            var f = TILE[layer.tile];
            if (f===undefined) return;
            var tilesX = Math.ceil(LW/TILE_DSP)+2;
            var tilesY = layer.rows||8;
            var yStart = layer.y||0;
            for (var ty=0;ty<tilesY;ty++) {
                for (var tx=0;tx<tilesX;tx++) {
                    scene.add.image(tx*TILE_DSP+TILE_DSP/2, yStart+ty*TILE_DSP+TILE_DSP/2,'tiles',f)
                        .setDisplaySize(TILE_DSP,TILE_DSP)
                        .setScrollFactor(layer.parallax||0.2)
                        .setDepth(1)
                        .setAlpha(layer.alpha||1.0);
                }
            }
        });
    }

    // Clouds
    if (ld.clouds) {
        var cf = TILE['cloud'];
        ld.clouds.forEach(function(c){
            var s=c.scale||1;
            scene.add.image(c.x,c.y,'tiles',cf)
                .setDisplaySize(TILE_DSP*s*1.5,TILE_DSP*s)
                .setScrollFactor(c.parallax||0.18)
                .setDepth(2).setAlpha(0.82);
        });
    }

    // Ground base
    var gnd = scene.add.graphics().setDepth(3);
    gnd.fillStyle(0x2a1508,1);
    gnd.fillRect(0,500,LW,H-500);
}

// Returns array of collision rects [{x, y, w}]
function buildPlatforms(scene, ld) {
    var colliders = [];
    if (!ld.platforms) return colliders;

    ld.platforms.forEach(function(p){
        var py         = p.y;
        var cols       = Math.ceil(p.w/TILE_DSP);
        var topFrame   = TILE[p.type]  !== undefined ? TILE[p.type]  : TILE['top_grass'];
        var underFrame = TILE[p.under] !== undefined ? TILE[p.under] : TILE['dead_ground'];
        var underRows  = p.underRows||2;

        for (var i=0;i<cols;i++) {
            var cx = p.x + i*TILE_DSP + TILE_DSP/2;
            scene.add.image(cx, py+TILE_DSP/2, 'tiles', topFrame)
                .setDisplaySize(TILE_DSP,TILE_DSP).setDepth(6).setAlpha(0.95);
            for (var r=1;r<=underRows;r++) {
                scene.add.image(cx, py+TILE_DSP*r+TILE_DSP/2,'tiles',underFrame)
                    .setDisplaySize(TILE_DSP,TILE_DSP).setDepth(5).setAlpha(0.92);
            }
        }
        // Register collision rect — surface y is top of tile + half tile height
        // Flow's feet collide with surfaceY
        colliders.push({ x:p.x, y:py+TILE_DSP/2, w:p.w });
    });

    // Waterfall
    if (ld.waterfall) {
        ld.waterfall.forEach(function(w){
            var f=TILE[w.tile]; if(f===undefined)return;
            scene.add.image(w.x+TILE_DSP/2,w.y+TILE_DSP/2,'tiles',f)
                .setDisplaySize(TILE_DSP,TILE_DSP).setDepth(5).setAlpha(0.9);
        });
    }

    // Water pool
    if (ld.waterPool) {
        ld.waterPool.forEach(function(w){
            var f=TILE[w.tile]; if(f===undefined)return;
            scene.add.image(w.x+TILE_DSP/2,w.y+TILE_DSP/2,'tiles',f)
                .setDisplaySize(TILE_DSP,TILE_DSP).setDepth(4).setAlpha(0.88);
        });
    }

    // Lily pads
    if (ld.lilyPads) {
        var lf=TILE['lily_pad'];
        ld.lilyPads.forEach(function(lp){
            scene.add.image(lp.x,lp.y,'tiles',lf)
                .setDisplaySize(TILE_DSP*0.9,TILE_DSP*0.9).setDepth(5).setAlpha(0.95);
        });
    }

    return colliders;
}

function buildDecor(scene, ld) {
    if (!ld.decor) return;
    ld.decor.forEach(function(d){
        var f=TILE[d.tile]; if(f===undefined)return;
        var sz=d.size||TILE_DSP;
        scene.add.image(d.x,d.y,'tiles',f)
            .setDisplaySize(sz,sz)
            .setScrollFactor(d.scrollFactor!==undefined?d.scrollFactor:1)
            .setDepth(7)
            .setAlpha(d.alpha!==undefined?d.alpha:0.92);
    });
}

// ═════════════════════════════════════════════════════════════
//  INTERACTIVE OBJECTS
// ═════════════════════════════════════════════════════════════

function spawnObjs(scene, defs) {
    return defs.map(function(def){
        var df = TILE[def.tile_dead]  !== undefined ? TILE[def.tile_dead]  : 5;
        var af = TILE[def.tile_alive] !== undefined ? TILE[def.tile_alive] : 6;

        var dead = scene.add.image(def.x,def.y,'tiles',df)
            .setDisplaySize(TILE_DSP+6,TILE_DSP+6).setDepth(8).setAlpha(0.65);
        var alive = scene.add.image(def.x,def.y,'tiles',af)
            .setDisplaySize(TILE_DSP+6,TILE_DSP+6).setDepth(8).setAlpha(0);

        var ring = scene.add.graphics().setDepth(7);
        ring.lineStyle(1.5,0x00ff88,0.14);
        ring.strokeCircle(def.x,def.y,28);

        var hintTxt = null;
        if (def.hint) {
            hintTxt = scene.add.text(def.x,def.y-44,def.hint,{
                fontFamily:'monospace',fontSize:'9px',color:'#ffffff',
                backgroundColor:'#00000099',padding:{x:5,y:3}
            }).setOrigin(0.5).setAlpha(0).setDepth(16);
        }

        scene.tweens.add({
            targets:dead, y:def.y-4,
            duration:1100+Phaser.Math.Between(0,400),
            ease:'Sine.easeInOut',yoyo:true,repeat:-1
        });

        return { id:def.id, x:def.x, y:def.y, type:def.type,
                 scoreValue:def.scoreValue, active:false,
                 dead:dead, alive:alive, ring:ring, hintTxt:hintTxt };
    });
}

function activateObj(scene, obj) {
    scene.tweens.killTweensOf(obj.dead);
    scene.tweens.add({ targets:obj.dead, alpha:0, duration:180 });

    obj.alive.setScale(0);
    scene.tweens.add({ targets:obj.alive, alpha:0.95, scaleX:1, scaleY:1, duration:200, ease:'Back.Out' });

    obj.ring.clear();
    obj.ring.lineStyle(2,0x00ff88,0.7);
    obj.ring.strokeCircle(obj.x,obj.y,28);
    scene.tweens.add({ targets:obj.ring, alpha:0, duration:480 });

    burst(scene,obj.x,obj.y,(PAL[obj.type]||PAL.grow).ptcl,10);

    var pop = scene.add.text(obj.x,obj.y-24,'+'+obj.scoreValue,{
        fontFamily:'monospace',fontSize:'11px',color:'#ffffff',stroke:'#000000',strokeThickness:2
    }).setOrigin(0.5).setDepth(22);
    scene.tweens.add({
        targets:pop,y:obj.y-55,alpha:0,duration:620,ease:'Quad.Out',
        onComplete:function(){ pop.destroy(); }
    });

    scene.tweens.add({ targets:obj.alive, alpha:0.65, duration:1000,
        ease:'Sine.easeInOut',yoyo:true,repeat:-1,delay:100 });
}

// ═════════════════════════════════════════════════════════════
//  UTILITIES
// ═════════════════════════════════════════════════════════════

function makeDot(scene) {
    if (scene.textures.exists('dot')) return;
    var g=scene.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0xffffff,1); g.fillCircle(5,5,5);
    g.generateTexture('dot',10,10); g.destroy();
}

function bgGrad(scene,W,H,top,bot) {
    var g=scene.add.graphics();
    g.fillGradientStyle(top,top,bot,bot,1);
    g.fillRect(0,0,W,H);
}

function stars(scene,W,H,n) {
    var g=scene.add.graphics();
    for (var i=0;i<n;i++) {
        g.fillStyle(0xffffff,Phaser.Math.FloatBetween(0.06,0.42));
        g.fillCircle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H*0.75),
                     Phaser.Math.FloatBetween(0.4,1.3));
    }
    for (var t=0;t<5;t++) {
        var d=scene.add.graphics();
        d.fillStyle(0xffffff,0.5);
        d.fillCircle(Phaser.Math.Between(10,W-10),Phaser.Math.Between(10,H*0.5),1.2);
        scene.tweens.add({ targets:d,alpha:0.04,duration:Phaser.Math.Between(900,2200),yoyo:true,repeat:-1,delay:t*260 });
    }
}

function registerAnims(scene) {
    ANIMS.forEach(function(a){
        if (scene.anims.exists(a.key)) return;
        var frames;
        if (a.seq) {
            frames = scene.anims.generateFrameNumbers('flow',{ frames:a.seq });
        } else {
            frames = scene.anims.generateFrameNumbers('flow',{ start:a.s, end:a.e });
        }
        scene.anims.create({ key:a.key, frames:frames, frameRate:a.fps, repeat:a.loop?-1:0 });
    });
}

function burst(scene,x,y,tint,count) {
    try {
        var e=scene.add.particles(x,y,'dot',{
            speed:{min:45,max:155},angle:{min:0,max:360},
            scale:{start:1.0,end:0},lifespan:500,
            quantity:count,tint:tint,emitting:false
        });
        e.explode(count);
        scene.time.delayedCall(620,function(){ if(e&&e.active)e.destroy(); });
    } catch(_){}
}

function pulseSpr(scene,spr,base) {
    scene.tweens.add({ targets:spr,scaleX:base*1.14,scaleY:base*0.88,
        duration:70,yoyo:true,ease:'Quad.Out' });
}

function trySound(scene,key) {
    try { if(scene.cache.audio.exists(key)) scene.sound.play(key,{volume:0.36}); }
    catch(_){}
}
