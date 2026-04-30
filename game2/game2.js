/**
 * FLOW: GARDEN — game2.js
 * Requires: Phaser 3.60 | world.js loaded first
 *
 * Scenes:
 *   BootScene      — asset loading
 *   TitleScene     — title card
 *   WorldScene     — main gameplay (runs always)
 *   DialogueScene  — launched OVER WorldScene, Pokémon-style text box
 *   UIScene        — HUD always on top
 *
 * Tile sheet: assets/tiles_garden.png — 6 cols × 4 rows, 48×48 each
 * Flow sheet: assets/flow_td.png      — 4 cols × 4 rows, 48×48 each
 *   Row 0: face DOWN  (cols 0-2=walk, col 3=idle)
 *   Row 1: face LEFT  (cols 0-2=walk, col 3=idle)
 *   Row 2: face RIGHT (cols 0-2=walk, col 3=idle)
 *   Row 3: face UP    (cols 0-2=walk, col 3=idle)
 */

// ── CONSTANTS ────────────────────────────────────────────────
var T           = 48;    // tile size px
var MOVE_SPEED  = 120;   // Flow movement px/s
var BLOOM_RANGE = T * 2.5;  // bloom radius in px
var BLOOM_COST  = 25;       // energy cost per bloom use
var BLOOM_COOLDOWN = 3000;  // ms cooldown between blooms
var BLOOM_DURATION = 2200;  // ms for full bloom animation
var HEMP_PHASE     = 900;   // ms hemp grows before dying back
var ENERGY_MAX  = 100;
var ENERGY_REGEN = 4;       // per second
var EXHAUST_THRESH = 0;
var EXHAUST_RECOVER = 40;
var INTERACT_RANGE = T * 1.2;  // px to trigger NPC dialogue

var FONT = { fontFamily:"'Press Start 2P', monospace" };

// Tile atlas layout
var TILE_COLS = 6;
var TILE_ROWS = 4;

// ── BOOT ─────────────────────────────────────────────────────
new Phaser.Game({
    type:   Phaser.AUTO,
    width:  360,
    height: 640,
    backgroundColor: '#1a2e1a',
    physics: { default:'arcade', arcade:{ debug:false } },
    scene:  [BootScene, TitleScene, WorldScene, DialogueScene, UIScene],
    scale: {
        mode:        Phaser.Scale.FIT,
        autoCenter:  Phaser.Scale.CENTER_BOTH,
        width:       360,
        height:      640,
        parent:      document.body,
    },
});

// ═════════════════════════════════════════════════════════════
//  BOOT SCENE
// ═════════════════════════════════════════════════════════════
function BootScene(){ Phaser.Scene.call(this,{key:'BootScene'}); }
BootScene.prototype = Object.create(Phaser.Scene.prototype);
BootScene.prototype.constructor = BootScene;

BootScene.prototype.preload = function(){
    var W=this.scale.width, H=this.scale.height;
    // Loading bar
    var bar = this.add.graphics();
    var bg  = this.add.graphics();
    bg.fillStyle(0x1a2e1a,1); bg.fillRect(0,0,W,H);
    bg.fillStyle(0x2a4a2a,1); bg.fillRoundedRect(W/2-120,H/2-8,240,16,8);
    this.load.on('progress', function(v){
        bar.clear();
        bar.fillStyle(0x5ab030,1);
        bar.fillRoundedRect(W/2-118,H/2-6,236*v,12,6);
    });
    this.add.text(W/2,H/2+32,'LOADING...',
        Object.assign({},FONT,{fontSize:'8px',color:'#5ab030'})).setOrigin(0.5);

    this.load.spritesheet('flow_td',   'assets/flow_td.png',
        { frameWidth:48, frameHeight:48 });
    this.load.spritesheet('tiles',     'assets/tiles_garden.png',
        { frameWidth:48, frameHeight:48 });
    this.load.image('buzzy_ow',        'assets/buzzy_ow.png');
    this.load.image('kronik_trip_ow',  'assets/kronik_trip_ow.png');
    this.load.image('dr_leaf_ow',      'assets/dr_leaf_ow.png');
    this.load.image('buzzy_portrait',  'assets/buzzy_portrait.png');
    this.load.image('kronik_trip_portrait','assets/kronik_trip_portrait.png');
    this.load.image('dr_leaf_portrait','assets/dr_leaf_portrait.png');
};

BootScene.prototype.create = function(){
    this.scene.start('TitleScene');
};

// ═════════════════════════════════════════════════════════════
//  TITLE SCENE
// ═════════════════════════════════════════════════════════════
function TitleScene(){ Phaser.Scene.call(this,{key:'TitleScene'}); }
TitleScene.prototype = Object.create(Phaser.Scene.prototype);
TitleScene.prototype.constructor = TitleScene;

TitleScene.prototype.create = function(){
    var W=this.scale.width, H=this.scale.height, self=this;

    // Background gradient
    var bg=this.add.graphics();
    bg.fillGradientStyle(0x1a2e1a,0x1a2e1a,0x0e1e0e,0x0e1e0e,1);
    bg.fillRect(0,0,W,H);

    // Animated tile border using grass
    for(var tx=0;tx<Math.ceil(W/T)+1;tx++){
        this.add.image(tx*T+T/2, T/2,       'tiles',0).setDisplaySize(T,T).setAlpha(0.6);
        this.add.image(tx*T+T/2, H-T/2,     'tiles',0).setDisplaySize(T,T).setAlpha(0.6);
    }

    // Flow character animated
    registerFlowAnims(this);
    var hero=this.add.sprite(W/2,H*0.38,'flow_td').setScale(2.5);
    hero.play('flow_idle_down');
    this.tweens.add({targets:hero,y:H*0.38-6,duration:1400,ease:'Sine.easeInOut',yoyo:true,repeat:-1});

    // Title
    this.add.text(W/2, H*0.58, 'FLOW:', Object.assign({},FONT,{
        fontSize:'22px', color:'#a8d870', stroke:'#1a3a0a', strokeThickness:4
    })).setOrigin(0.5);
    this.add.text(W/2, H*0.58+38, 'GARDEN', Object.assign({},FONT,{
        fontSize:'14px', color:'#d4f088', stroke:'#1a3a0a', strokeThickness:3
    })).setOrigin(0.5);
    this.add.text(W/2, H*0.74, 'restore · explore · bloom', Object.assign({},FONT,{
        fontSize:'6px', color:'#5a8a3a'
    })).setOrigin(0.5);

    var hint=this.add.text(W/2, H*0.84, '— TAP TO BEGIN —', Object.assign({},FONT,{
        fontSize:'8px', color:'#a8d870'
    })).setOrigin(0.5);
    this.tweens.add({targets:hint,alpha:0.2,duration:800,yoyo:true,repeat:-1});

    this.input.once('pointerdown',function(){
        self.cameras.main.fade(400,0,0,0);
        self.time.delayedCall(420,function(){
            self.scene.start('WorldScene',{areaId:'pellet_town'});
            self.scene.launch('UIScene');
        });
    });
};

// ═════════════════════════════════════════════════════════════
//  WORLD SCENE
// ═════════════════════════════════════════════════════════════
function WorldScene(){ Phaser.Scene.call(this,{key:'WorldScene'}); }
WorldScene.prototype = Object.create(Phaser.Scene.prototype);
WorldScene.prototype.constructor = WorldScene;

WorldScene.prototype.init = function(data){
    this.areaId     = data.areaId || 'pellet_town';
    this.entryX     = data.entryX || null;
    this.entryY     = data.entryY || null;
};

WorldScene.prototype.create = function(){
    var area  = window.AREAS[this.areaId];
    var W=this.scale.width, H=this.scale.height, self=this;

    // ── State ──────────────────────────────────────────────
    this.area         = area;
    this.energy       = ENERGY_MAX;
    this.exhausted    = false;
    this.bloomReady   = true;
    this.bloomCooldownTimer = 0;
    this.tileState    = area.tilemap.slice();  // mutable copy
    this.npcSprites   = {};
    this.objectSprites= {};
    this.dialogueLock = false;
    this.dialogueCooldown = 0;  // ms remaining before NPC proximity can re-trigger
    this.bloomCount   = 0;

    // Calculate total bloomable tiles
    this.totalBloomable = this.tileState.filter(function(id){
        return window.TILE_DEFS[id] && window.TILE_DEFS[id].bloomable;
    }).length;
    this.bloomedTiles = 0;

    // ── World bounds ───────────────────────────────────────
    var worldW = area.cols * T;
    var worldH = area.rows * T;
    this.physics.world.setBounds(0,0,worldW,worldH);

    // ── Ground layer ───────────────────────────────────────
    this.groundLayer = this.add.layer();
    this.buildTilemap();

    // ── Decor layer ────────────────────────────────────────
    this.decorLayer = this.add.layer();
    this.buildDecor();

    // ── Objects layer ──────────────────────────────────────
    this.objLayer = this.add.layer();
    this.buildObjects();

    // ── NPCs ───────────────────────────────────────────────
    this.npcLayer = this.add.layer();
    this.buildNPCs();

    // ── Flow (player) ──────────────────────────────────────
    var startX = this.entryX !== null ? this.entryX : area.playerStart.x;
    var startY = this.entryY !== null ? this.entryY : area.playerStart.y;

    registerFlowAnims(this);
    this.player = this.physics.add.sprite(startX, startY, 'flow_td');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(50);
    this.player.play('flow_idle_down');
    this.facing    = 'down';
    this.moving    = false;
    this.targetX   = startX;
    this.targetY   = startY;

    // Player name label
    this.nameLabel = this.add.text(startX, startY-32, 'Flow',
        Object.assign({},FONT,{fontSize:'6px',color:'#e8f4c8',
        backgroundColor:'#1a2e1a88',padding:{x:5,y:2}}))
        .setOrigin(0.5).setDepth(55);

    // ── Camera ─────────────────────────────────────────────
    this.cameras.main.setBounds(0,0,worldW,worldH);
    this.cameras.main.startFollow(this.player,true,0.12,0.12);
    this.cameras.main.fadeIn(500);

    // ── Bloom effect container ─────────────────────────────
    this.bloomEffects = this.add.layer().setDepth(40);

    // ── Input ──────────────────────────────────────────────
    this.input.on('pointerdown',function(ptr){
        if(self.dialogueLock) return;
        // Convert screen tap to world coords
        var wx = ptr.worldX;
        var wy = ptr.worldY;
        // Check if tapping Flow himself → bloom
        var dx=wx-self.player.x, dy=wy-self.player.y;
        if(Math.sqrt(dx*dx+dy*dy) < 40){
            self.tryBloom();
        } else {
            // Move to tapped position
            self.setMoveTarget(wx, wy);
        }
    });

    // ── Notify UIScene ─────────────────────────────────────
    this.time.delayedCall(80,function(){
        self.events.emit('areaEnter',{name:area.name, bloomable:self.totalBloomable});
    });
};

WorldScene.prototype.buildTilemap = function(){
    var area = this.area;
    for(var row=0;row<area.rows;row++){
        for(var col=0;col<area.cols;col++){
            var tileId = this.tileState[row*area.cols+col];
            var img = this.add.image(
                col*T+T/2, row*T+T/2, 'tiles', tileId
            ).setDisplaySize(T,T).setDepth(0);
            this.groundLayer.add(img);
        }
    }
};

WorldScene.prototype.buildDecor = function(){
    var self=this;
    (this.area.decor||[]).forEach(function(d){
        var col=0xffd080, sz=T;
        switch(d.type){
            case 'lamp':   col=0xd4a840; sz=T*0.6; break;
            case 'rock':   col=0x808070; sz=T*0.7; break;
            case 'willow': col=0x4a6830; sz=T*1.2; break;
        }
        var g=self.add.graphics().setDepth(10);
        if(d.type==='lamp'){
            g.fillStyle(0x5a4020,1); g.fillRect(d.x-4,d.y,8,T);
            g.fillStyle(0xd4a840,0.9); g.fillCircle(d.x,d.y,10);
        } else if(d.type==='willow'){
            g.fillStyle(0x2a4015,0.85); g.fillEllipse(d.x,d.y,T,T*1.3);
            g.fillStyle(0x3a5520,0.7);  g.fillEllipse(d.x+8,d.y+12,T*0.6,T*0.8);
        } else if(d.type==='rock'){
            g.fillStyle(0x706860,1); g.fillEllipse(d.x,d.y,T*0.65,T*0.4);
            g.fillStyle(0x908878,1); g.fillEllipse(d.x-4,d.y-4,T*0.35,T*0.25);
        }
        self.decorLayer.add(g);
    });
};

WorldScene.prototype.buildObjects = function(){
    var self=this;
    (this.area.objects||[]).forEach(function(obj){
        var g=self.add.graphics().setDepth(15);
        if(obj.sprite==='sign'){
            // Wooden sign
            g.fillStyle(0x6a4218,1); g.fillRect(obj.x-18,obj.y+4,6,24);
            g.fillStyle(0x8a5828,1); g.fillRoundedRect(obj.x-22,obj.y-14,44,22,3);
            g.lineStyle(2,0x4a2808,1); g.strokeRoundedRect(obj.x-22,obj.y-14,44,22,3);
        } else if(obj.sprite==='memorial'){
            // Stone memorial
            g.fillStyle(0x6a6a60,1); g.fillRoundedRect(obj.x-20,obj.y-28,40,42,4);
            g.fillStyle(0x1a1a18,0.5); g.fillRect(obj.x-14,obj.y-22,28,30);
            // Leaf symbol
            g.fillStyle(0x3a5a28,0.8); g.fillEllipse(obj.x,obj.y-8,16,20);
        }
        self.objectSprites[obj.id] = g;
        self.objLayer.add(g);
    });
};

WorldScene.prototype.buildNPCs = function(){
    var self=this;
    (this.area.npcs||[]).forEach(function(npc){
        var spr = self.physics.add.image(npc.x, npc.y, npc.sprite)
            .setDisplaySize(T,T).setDepth(45).setImmovable(true);
        // Name tag
        var label = self.add.text(npc.x, npc.y-32, npc.id.replace('_',' '),
            Object.assign({},FONT,{fontSize:'5px',color:'#e8f4c8',
            backgroundColor:'#1a2e1a88',padding:{x:4,y:2}}))
            .setOrigin(0.5).setDepth(55);
        // Idle bob
        self.tweens.add({targets:spr,y:npc.y-4,duration:1200+Math.random()*400,
            ease:'Sine.easeInOut',yoyo:true,repeat:-1});
        self.npcSprites[npc.id]={sprite:spr,label:label,data:npc,talked:false};
        self.npcLayer.add(spr);
    });
};

WorldScene.prototype.update = function(time, delta){
    if(this.dialogueLock) return;
    var dt=Math.min(delta/1000,0.05), self=this;

    // Tick dialogue re-trigger cooldown
    if(this.dialogueCooldown > 0) {
        this.dialogueCooldown -= delta;
    }

    // ── Exhaustion ────────────────────────────────────────
    if(!this.exhausted && this.energy <= EXHAUST_THRESH){
        this.exhausted=true;
        this.events.emit('stateUpdate',{energy:0,maxEnergy:ENERGY_MAX,exhausted:true,
            bloomReady:false,bloomPct:this.getBloomPct()});
    }
    if(this.exhausted && this.energy >= EXHAUST_RECOVER){
        this.exhausted=false;
    }

    // ── Energy regen ──────────────────────────────────────
    this.energy=Math.min(ENERGY_MAX, this.energy+ENERGY_REGEN*dt);

    // ── Bloom cooldown ────────────────────────────────────
    if(!this.bloomReady){
        this.bloomCooldownTimer-=delta;
        if(this.bloomCooldownTimer<=0) this.bloomReady=true;
    }

    // ── Movement ──────────────────────────────────────────
    if(!this.exhausted && this.moving){
        var dx=this.targetX-this.player.x;
        var dy=this.targetY-this.player.y;
        var dist=Math.sqrt(dx*dx+dy*dy);

        if(dist < 4){
            this.player.setVelocity(0,0);
            this.player.x=this.targetX;
            this.player.y=this.targetY;
            this.moving=false;
            this.player.play('flow_idle_'+this.facing,true);
        } else {
            var speed=MOVE_SPEED;
            var vx=(dx/dist)*speed, vy=(dy/dist)*speed;
            this.player.setVelocity(vx,vy);

            // Determine facing direction
            var newFace=this.facing;
            if(Math.abs(dx)>Math.abs(dy)) newFace = dx>0?'right':'left';
            else                           newFace = dy>0?'down':'up';

            if(newFace!==this.facing){
                this.facing=newFace;
                this.player.play('flow_walk_'+this.facing,true);
            }

            // Check walkability of next position
            var nextTileCol=Math.floor((this.player.x+vx*dt*2)/T);
            var nextTileRow=Math.floor((this.player.y+vy*dt*2)/T);
            var nextIdx=nextTileRow*this.area.cols+nextTileCol;
            var nextDef=window.TILE_DEFS[this.tileState[nextIdx]];
            if(nextDef && !nextDef.walkable){
                this.player.setVelocity(0,0);
                this.moving=false;
                this.player.play('flow_idle_'+this.facing,true);
            }
        }
    } else if(!this.exhausted && !this.moving){
        this.player.setVelocity(0,0);
    } else if(this.exhausted){
        this.player.setVelocity(0,0);
        this.player.play('flow_idle_down',true);
    }

    // ── NPC label follow ──────────────────────────────────
    Object.values(this.npcSprites).forEach(function(n){
        n.label.setPosition(n.sprite.x, n.sprite.y-32);
    });

    // ── Player name label ─────────────────────────────────
    this.nameLabel.setPosition(this.player.x, this.player.y-32);

    // ── NPC proximity check ───────────────────────────────
    if(!this.exhausted && this.dialogueCooldown <= 0){
        Object.values(this.npcSprites).forEach(function(n){
            var dx=n.sprite.x-self.player.x, dy=n.sprite.y-self.player.y;
            if(Math.sqrt(dx*dx+dy*dy)<INTERACT_RANGE && !self.dialogueLock){
                self.startDialogue(n.data);
            }
        });
        // Object proximity
        (self.area.objects||[]).forEach(function(obj){
            var dx=obj.x-self.player.x, dy=obj.y-self.player.y;
            if(Math.sqrt(dx*dx+dy*dy)<INTERACT_RANGE && !self.dialogueLock){
                self.startDialogue(obj);
            }
        });
    }

    // ── Exit check ────────────────────────────────────────
    (this.area.exits||[]).forEach(function(exit){
        if(self.player.x>exit.x && self.player.x<exit.x+exit.w &&
           self.player.y>exit.y && self.player.y<exit.y+20){
            var pct=self.getBloomPct();
            if(!exit.requiresBloom || pct>=exit.requiresBloom){
                self.changeArea(exit);
            } else {
                // Show "area locked" message
                self.events.emit('showMessage',
                    'Restore '+exit.requiresBloom+'% of this area first!');
            }
        }
    });

    // ── HUD emit ──────────────────────────────────────────
    this.events.emit('stateUpdate',{
        energy:     this.energy,
        maxEnergy:  ENERGY_MAX,
        exhausted:  this.exhausted,
        bloomReady: this.bloomReady && this.energy >= BLOOM_COST,
        bloomPct:   this.getBloomPct(),
        cooldown:   this.bloomReady ? 0 : this.bloomCooldownTimer/BLOOM_COOLDOWN,
    });
};

WorldScene.prototype.setMoveTarget = function(wx, wy){
    // Clamp to world bounds
    var worldW=this.area.cols*T, worldH=this.area.rows*T;
    this.targetX=Math.max(T/2,Math.min(worldW-T/2,wx));
    this.targetY=Math.max(T/2,Math.min(worldH-T/2,wy));
    this.moving=true;
    this.player.play('flow_walk_'+this.facing,true);
};

WorldScene.prototype.tryBloom = function(){
    if(!this.bloomReady || this.energy<BLOOM_COST || this.exhausted) return;
    this.energy     -= BLOOM_COST;
    this.bloomReady  = false;
    this.bloomCooldownTimer = BLOOM_COOLDOWN;

    var px=this.player.x, py=this.player.y, self=this;
    var affected=[];

    // Find all bloomable tiles within range
    for(var row=0;row<this.area.rows;row++){
        for(var col=0;col<this.area.cols;col++){
            var idx=row*this.area.cols+col;
            var tid=this.tileState[idx];
            if(!window.TILE_DEFS[tid] || !window.TILE_DEFS[tid].bloomable) continue;
            var tx=col*T+T/2, ty=row*T+T/2;
            var dx=tx-px, dy=ty-py;
            if(Math.sqrt(dx*dx+dy*dy)<=BLOOM_RANGE){
                affected.push({idx:idx,col:col,row:row,tx:tx,ty:ty});
            }
        }
    }

    if(affected.length===0) return;

    // ── Bloom animation sequence ─────────────────────────
    // Phase 1: hemp sprouts
    affected.forEach(function(tile,i){
        self.time.delayedCall(i*60, function(){
            self.setTile(tile.idx, 13); // hemp_sprout
            spawnParticle(self, tile.tx, tile.ty, 0x4aaa28, 4);
        });
    });

    // Phase 2: hemp dies back (HEMP_PHASE ms)
    affected.forEach(function(tile,i){
        self.time.delayedCall(HEMP_PHASE+i*30, function(){
            self.setTile(tile.idx, 14); // grass_healing
            spawnParticle(self, tile.tx, tile.ty, 0x8acc48, 3);
        });
    });

    // Phase 3: full bloom
    affected.forEach(function(tile,i){
        self.time.delayedCall(BLOOM_DURATION-200+i*20, function(){
            self.setTile(tile.idx, 12); // bloom_ground
            spawnParticle(self, tile.tx, tile.ty, 0xc8e870, 6);
            self.bloomedTiles++;
        });
    });

    // Bloom ripple visual
    var ripple=this.bloomEffects.scene.add.graphics();
    ripple.lineStyle(3,0xa8d870,0.8);
    ripple.strokeCircle(px,py,BLOOM_RANGE);
    ripple.setDepth(38);
    this.tweens.add({targets:ripple,alpha:0,scaleX:1.3,scaleY:1.3,
        duration:600,ease:'Quad.Out',onComplete:function(){ripple.destroy();}});

    // Camera shake
    this.cameras.main.shake(80,0.002);

    // Check completion after last tile resolves
    this.time.delayedCall(BLOOM_DURATION+affected.length*60+200, function(){
        self.checkCompletion();
    });
};

WorldScene.prototype.setTile = function(idx, newId){
    // Update state
    this.tileState[idx]=newId;
    // Update visual — rebuild the single tile image
    var col=idx % this.area.cols;
    var row=Math.floor(idx/this.area.cols);
    // Find existing image by depth+position and update frame
    // Simplest approach: destroy and recreate
    var existing=this.groundLayer.getAll().find(function(obj){
        return Math.abs(obj.x-(col*T+T/2))<2 && Math.abs(obj.y-(row*T+T/2))<2;
    });
    if(existing) existing.setFrame(newId);
};

WorldScene.prototype.getBloomPct = function(){
    if(this.totalBloomable===0) return 100;
    // Count remaining bloomable tiles
    var remaining=this.tileState.filter(function(id){
        return window.TILE_DEFS[id]&&window.TILE_DEFS[id].bloomable;
    }).length;
    return Math.round((1-remaining/this.totalBloomable)*100);
};

WorldScene.prototype.checkCompletion = function(){
    if(this.getBloomPct()>=100 && this.area.onComplete){
        var dlg=window.DIALOGUES[this.area.onComplete];
        if(dlg) this.startDialogueData(dlg);
    }
};

WorldScene.prototype.startDialogue = function(npcOrObj){
    if(this.dialogueLock) return;
    var npcState=this.npcSprites[npcOrObj.id];
    var dlgKey = (npcState && npcState.talked) ? npcOrObj.repeat : npcOrObj.dialogue;
    if(!dlgKey) return;
    var dlg=window.DIALOGUES[dlgKey];
    if(!dlg) return;
    if(npcState) npcState.talked=true;
    this.startDialogueData(dlg);
};

WorldScene.prototype.startDialogueData = function(dlg){
    if(this.dialogueLock) return;
    this.dialogueLock=true;
    this.player.setVelocity(0,0);
    this.moving=false;
    this.player.play('flow_idle_'+this.facing,true);

    var self=this;

    // Use Phaser's scene events bus (not the DialogueScene instance events)
    // to avoid race conditions with scene launch timing
    this.game.events.once('dialogueDone', function(){
        self.dialogueLock=false;
        // Prevent immediate re-trigger by moving Flow slightly away
        // and adding a short cooldown
        self.dialogueCooldown=2000;
    });

    this.scene.launch('DialogueScene',{dialogue:dlg});
};

WorldScene.prototype.changeArea = function(exit){
    var self=this;
    this.cameras.main.fade(400,0,0,0);
    this.time.delayedCall(420,function(){
        self.scene.restart({areaId:exit.toArea,entryX:exit.toX,entryY:exit.toY});
    });
};

// ═════════════════════════════════════════════════════════════
//  DIALOGUE SCENE
// ═════════════════════════════════════════════════════════════
function DialogueScene(){ Phaser.Scene.call(this,{key:'DialogueScene'}); }
DialogueScene.prototype = Object.create(Phaser.Scene.prototype);
DialogueScene.prototype.constructor = DialogueScene;

DialogueScene.prototype.init = function(data){
    this.dlg       = data.dialogue;
    this.pageIndex = 0;
    this.typing    = false;
    this.fullText  = '';
    this.displayed = '';
};

DialogueScene.prototype.create = function(){
    var W=this.scale.width, H=this.scale.height, self=this;

    // Dark overlay
    this.overlay=this.add.graphics();
    this.overlay.fillStyle(0x000000,0.35);
    this.overlay.fillRect(0,0,W,H);

    // Dialogue box — Pokémon style, bottom of screen
    var boxH=160, boxY=H-boxH-8, pad=14;
    var box=this.add.graphics();
    box.fillStyle(0x1a2e12,0.96);
    box.fillRoundedRect(8,boxY,W-16,boxH,8);
    box.lineStyle(3,0x5ab030,1);
    box.strokeRoundedRect(8,boxY,W-16,boxH,8);
    // Inner border accent
    box.lineStyle(1,0x3a7020,0.6);
    box.strokeRoundedRect(12,boxY+4,W-24,boxH-8,6);

    // Portrait
    this.portraitImg=null;
    if(this.dlg.portrait){
        var pkey=this.dlg.portrait+'_portrait';
        this.portraitImg=this.add.image(8+pad+36, boxY+pad+36, pkey)
            .setDisplaySize(72,72).setDepth(5);
        // Portrait frame
        var pf=this.add.graphics().setDepth(4);
        pf.lineStyle(2,0x5ab030,1);
        pf.strokeRoundedRect(8+pad-2,boxY+pad-2,76,76,4);
    }

    // Speaker name
    var nameX = this.dlg.portrait ? 8+pad+82 : 8+pad;
    this.add.text(nameX, boxY+pad+4, this.dlg.speaker||'',
        Object.assign({},FONT,{fontSize:'8px',color:'#a8d870'})).setDepth(5);

    // Text area
    this.textX = nameX;
    this.textY = boxY+pad+22;
    this.textMaxW= W-16-pad - (this.dlg.portrait ? 82 : 0) - 10;

    this.textObj=this.add.text(this.textX, this.textY, '',
        Object.assign({},FONT,{fontSize:'7px',color:'#d8f0a8',
        wordWrap:{width:this.textMaxW},lineSpacing:6})).setDepth(5);

    // Arrow indicator
    this.arrow=this.add.triangle(W-26, H-22, 0,0, 12,0, 6,8,0xd8f0a8)
        .setDepth(5).setAlpha(0);
    this.tweens.add({targets:this.arrow,alpha:1,duration:400,yoyo:true,repeat:-1});

    // Page counter
    this.pageCounter=this.add.text(W-26,boxY+10,
        '1/'+this.dlg.pages.length,
        Object.assign({},FONT,{fontSize:'5px',color:'#5a8a3a'}))
        .setOrigin(1,0).setDepth(5);

    // Start first page
    this.showPage(0);

    // Tap to advance
    this.input.on('pointerdown',function(){
        if(self.typing){
            // Skip to full text
            self.typing=false;
            if(self.typeTimer) self.typeTimer.remove();
            self.textObj.setText(self.fullText);
            self.arrow.setAlpha(1);
        } else {
            self.nextPage();
        }
    });
};

DialogueScene.prototype.showPage = function(idx){
    this.pageIndex=idx;
    this.fullText=this.dlg.pages[idx];
    this.displayed='';
    this.typing=true;
    this.arrow.setAlpha(0);
    this.pageCounter.setText((idx+1)+'/'+this.dlg.pages.length);
    this.typeText();
};

DialogueScene.prototype.typeText = function(){
    var self=this, chars=this.fullText.split('');
    var i=0;
    this.typeTimer=this.time.addEvent({
        delay:28, repeat:chars.length-1,
        callback:function(){
            self.displayed+=chars[i];
            self.textObj.setText(self.displayed);
            i++;
            if(i>=chars.length){
                self.typing=false;
                self.arrow.setAlpha(1);
            }
        }
    });
};

DialogueScene.prototype.nextPage = function(){
    if(this.pageIndex<this.dlg.pages.length-1){
        this.showPage(this.pageIndex+1);
    } else {
        // Emit on the global game events bus so WorldScene always receives it
        this.game.events.emit('dialogueDone');
        this.scene.stop();
    }
};

// ═════════════════════════════════════════════════════════════
//  UI SCENE
// ═════════════════════════════════════════════════════════════
function UIScene(){ Phaser.Scene.call(this,{key:'UIScene'}); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function(){
    var W=this.scale.width, self=this;

    // ── Top-left panel: Flow status ────────────────────────
    var panel=this.add.graphics();
    panel.fillStyle(0x0e1e0e,0.88);
    panel.fillRoundedRect(6,6,150,52,6);
    panel.lineStyle(2,0x3a6020,1);
    panel.strokeRoundedRect(6,6,150,52,6);

    // Flow portrait (small)
    this.flowThumb=this.add.image(28,32,'flow_td',3)
        .setDisplaySize(36,36).setDepth(12);

    this.areaNameTxt=this.add.text(50,12,'PELLET TOWN',
        Object.assign({},FONT,{fontSize:'5px',color:'#a8d870'})).setDepth(12);
    this.add.text(50,22,'ENERGY',
        Object.assign({},FONT,{fontSize:'5px',color:'#5a8a3a'})).setDepth(12);

    // Energy bar
    this.energyBg=this.add.graphics().setDepth(12);
    this.energyBar=this.add.graphics().setDepth(13);
    this.drawEnergyBar(ENERGY_MAX,ENERGY_MAX);

    // Bloom % 
    this.bloomPctTxt=this.add.text(50,42,'BLOOM 0%',
        Object.assign({},FONT,{fontSize:'5px',color:'#a8d870'})).setDepth(12);

    // ── Top-right: area name + time ────────────────────────
    var rpanel=this.add.graphics();
    rpanel.fillStyle(0x0e1e0e,0.88);
    rpanel.fillRoundedRect(W-108,6,102,32,6);
    rpanel.lineStyle(2,0x3a6020,1);
    rpanel.strokeRoundedRect(W-108,6,102,32,6);
    this.dayTxt=this.add.text(W-56,14,'PELLET TOWN',
        Object.assign({},FONT,{fontSize:'5px',color:'#a8d870'})).setOrigin(0.5).setDepth(12);
    this.timeTxt=this.add.text(W-56,24,'',
        Object.assign({},FONT,{fontSize:'5px',color:'#5a8a3a'})).setOrigin(0.5).setDepth(12);

    // ── Bloom power button hint ────────────────────────────
    this.bloomHint=this.add.text(W/2,76,'TAP FLOW TO BLOOM',
        Object.assign({},FONT,{fontSize:'6px',color:'#c8e870',
        backgroundColor:'#0e1e0e99',padding:{x:8,y:4}}))
        .setOrigin(0.5).setAlpha(0.7).setDepth(12);
    this.tweens.add({targets:this.bloomHint,alpha:0.2,duration:1200,yoyo:true,repeat:-1});

    // ── Bloom cooldown ring ────────────────────────────────
    this.cdRing=this.add.graphics().setDepth(12);

    // ── Exhaustion message ────────────────────────────────
    this.exhaustMsg=this.add.text(W/2,590,'😮‍💨 CATCHING BREATH...',
        Object.assign({},FONT,{fontSize:'6px',color:'#e87040',
        backgroundColor:'#0e1e0e99',padding:{x:8,y:4}}))
        .setOrigin(0.5).setAlpha(0).setDepth(12);

    // ── Flash message ─────────────────────────────────────
    this.flashMsg=this.add.text(W/2,540,'',
        Object.assign({},FONT,{fontSize:'6px',color:'#d8f0a8',
        backgroundColor:'#0e1e0e99',padding:{x:8,y:4}}))
        .setOrigin(0.5).setAlpha(0).setDepth(12);

    // Clock timer
    this.gameMinutes=0;
    this.time.addEvent({delay:10000,callback:function(){
        self.gameMinutes=(self.gameMinutes+1)%60;
    },loop:true});

    // Listen to WorldScene
    var world=this.scene.get('WorldScene');
    world.events.on('stateUpdate',function(d){
        self.drawEnergyBar(d.energy,d.maxEnergy);
        self.bloomPctTxt.setText('BLOOM '+Math.round(d.bloomPct)+'%');
        var exA = d.exhausted?1:0;
        if(self.exhaustMsg.alpha!==exA)
            self.tweens.add({targets:self.exhaustMsg,alpha:exA,duration:200});
        self.drawCooldownRing(d.cooldown);
    });
    world.events.on('areaEnter',function(d){
        self.areaNameTxt.setText(d.name.toUpperCase().slice(0,14));
        self.dayTxt.setText(d.name.toUpperCase().slice(0,10));
    });
    world.events.on('showMessage',function(msg){
        self.showFlash(msg);
    });

    // Live clock display
    this.time.addEvent({delay:1000,callback:function(){
        var now=new Date();
        var h=now.getHours(), m=now.getMinutes();
        self.timeTxt.setText((h>12?h-12:h)+':'+(m<10?'0':'')+m+(h>=12?' PM':' AM'));
    },loop:true,callbackScope:this});
};

UIScene.prototype.drawEnergyBar = function(e,max){
    var bx=50,by=30,bw=96,bh=6,r=e/max;
    this.energyBg.clear();
    this.energyBg.fillStyle(0x1a2a1a,1);
    this.energyBg.fillRoundedRect(bx,by,bw,bh,3);
    this.energyBar.clear();
    var col = r<0.3
        ? Phaser.Display.Color.GetColor(200,80,30)
        : Phaser.Display.Color.GetColor(80,190,40);
    this.energyBar.fillStyle(col,1);
    if(r>0.01) this.energyBar.fillRoundedRect(bx,by,Math.max(3,bw*r),bh,3);
};

UIScene.prototype.drawCooldownRing = function(progress){
    // Progress: 1=full cooldown, 0=ready
    this.cdRing.clear();
    if(progress<=0) return;
    var cx=28,cy=32,rad=20;
    this.cdRing.lineStyle(3,0xe87040,0.7);
    this.cdRing.beginPath();
    this.cdRing.arc(cx,cy,rad,-Math.PI/2,-Math.PI/2+(2*Math.PI*(1-progress)),false);
    this.cdRing.strokePath();
};

UIScene.prototype.showFlash = function(msg){
    var self=this;
    this.flashMsg.setText(msg);
    this.tweens.add({targets:this.flashMsg,alpha:1,duration:200});
    this.time.delayedCall(2200,function(){
        self.tweens.add({targets:self.flashMsg,alpha:0,duration:400});
    });
};

// ═════════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ═════════════════════════════════════════════════════════════

function registerFlowAnims(scene){
    var dirs=[
        {key:'down', row:0},
        {key:'left', row:1},
        {key:'right',row:2},
        {key:'up',   row:3},
    ];
    dirs.forEach(function(d){
        var base=d.row*4;
        if(!scene.anims.exists('flow_walk_'+d.key)){
            scene.anims.create({
                key:'flow_walk_'+d.key,
                frames:scene.anims.generateFrameNumbers('flow_td',{frames:[base,base+1,base+2,base+1]}),
                frameRate:8, repeat:-1
            });
        }
        if(!scene.anims.exists('flow_idle_'+d.key)){
            scene.anims.create({
                key:'flow_idle_'+d.key,
                frames:scene.anims.generateFrameNumbers('flow_td',{frames:[base+3]}),
                frameRate:4, repeat:-1
            });
        }
    });
}

function spawnParticle(scene,x,y,tint,count){
    try{
        var e=scene.add.particles(x,y,'tiles',{
            frame:12, speed:{min:20,max:60},
            angle:{min:0,max:360},
            scale:{start:0.4,end:0},
            lifespan:400,quantity:count,
            tint:tint,emitting:false
        });
        e.explode(count);
        scene.time.delayedCall(500,function(){if(e&&e.active)e.destroy();});
    } catch(_){}
}
