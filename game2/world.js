/**
 * FLOW: GARDEN — world.js
 * All area/map data lives here. Add new areas without touching game2.js.
 *
 * Tile IDs (tiles_garden.png, 6×4 grid, 48×48 each):
 *  0  grass_healthy    6  water_deep      12 bloom_ground   18 fence_h
 *  1  grass_lush       7  water_shallow   13 hemp_sprout    19 fence_v
 *  2  grass_wilted     8  water_edge      14 grass_healing  20 dirt_dark
 *  3  path_dirt        9  grass_dark      15 path_dirt2     21 sand_light
 *  4  path_stone      10  grass_autumn    16 stone_bridge   22 grass_shadow
 *  5  floor_wood      11  grass_dry       17 stone_wall     23 empty
 *
 * Tile properties:
 *   walkable:  true  = Flow can walk on it
 *   bloomable: true  = wilted, can be restored by Flow's bloom power
 */

var T = 48; // tile size in pixels

// ── TILE DEFINITIONS ─────────────────────────────────────────
// tiles_garden.png — 10 cols × 7 rows, 64×64 each
// Frame = row*10 + col
window.TILE_DEFS = {
     0:{ name:'water_stone',  walkable:false, bloomable:false },
     1:{ name:'grass_flowers',walkable:true,  bloomable:false },
     2:{ name:'grass_lush',   walkable:true,  bloomable:false },
     3:{ name:'dirt_tan',     walkable:true,  bloomable:false },
     4:{ name:'dirt_dark',    walkable:true,  bloomable:false },
     5:{ name:'wilted1',      walkable:true,  bloomable:true  },
     6:{ name:'wilted2',      walkable:true,  bloomable:true  },
     7:{ name:'seedling',     walkable:true,  bloomable:true  },
     8:{ name:'flowers',      walkable:true,  bloomable:false },
     9:{ name:'grass_clean',  walkable:true,  bloomable:false },
    10:{ name:'water_full',   walkable:false, bloomable:false },
    11:{ name:'water_grass_l',walkable:false, bloomable:false },
    12:{ name:'water_grass_m',walkable:false, bloomable:false },
    13:{ name:'water_grass_r',walkable:false, bloomable:false },
    14:{ name:'water_mid_l',  walkable:false, bloomable:false },
    15:{ name:'water_mid_m',  walkable:false, bloomable:false },
    16:{ name:'water_isle',   walkable:false, bloomable:false },
    17:{ name:'water_side',   walkable:false, bloomable:false },
    18:{ name:'stone_arch',   walkable:false, bloomable:false },
    19:{ name:'grass_right',  walkable:true,  bloomable:false },
    20:{ name:'wall_left',    walkable:false, bloomable:false },
    21:{ name:'wall_mid1',    walkable:false, bloomable:false },
    22:{ name:'wall_mid2',    walkable:false, bloomable:false },
    23:{ name:'wall_corner',  walkable:false, bloomable:false },
    24:{ name:'wall_open',    walkable:true,  bloomable:false },
    25:{ name:'wall_right',   walkable:false, bloomable:false },
    26:{ name:'wall_cave',    walkable:true,  bloomable:false },
    27:{ name:'stone_wall',   walkable:false, bloomable:false },
    28:{ name:'blank',        walkable:true,  bloomable:false },
    29:{ name:'grass_top',    walkable:true,  bloomable:false },
};

// ── DIALOGUE LIBRARY ─────────────────────────────────────────
window.DIALOGUES = {
    buzzy_intro: {
        speaker:  'Buzzy',
        portrait: 'buzzy',
        pages: [
            "Bzzz! Flow! You've finally arrived! 🐝",
            "I am Buzzy, guardian of Pellet Town garden.",
            "Look around... the plants have withered.\nThe roots still remember, though.",
            "TAP on yourself to release your BLOOM POWER!\nIt will spread life in a radius around you.",
            "Restore all the wilted patches here...\nand new areas of the world will open up!",
            "Now go — the garden is counting on you! Bzzz!",
        ]
    },
    buzzy_reminder: {
        speaker:  'Buzzy',
        portrait: 'buzzy',
        pages: [
            "Bzzz! Keep going Flow!\nRestore all the wilted patches!",
            "Your bloom power recharges over time.\nDon't rush — breathe and bloom. 🌿",
        ]
    },
    buzzy_done: {
        speaker:  'Buzzy',
        portrait: 'buzzy',
        pages: [
            "Bzzzzz! You did it! The garden blooms! 🌸",
            "I knew you could do it, Flow!\nThe Expanded Garden has now opened!",
            "Dr. Leaf is waiting for you there.\nHe has much to teach you. Go! Bzzz!",
        ]
    },
    dr_leaf_intro: {
        speaker:  'Dr. Leaf',
        portrait: 'dr_leaf',
        pages: [
            "Ah, Flow. I've been expecting you.",
            "I am Dr. Leaf. I study the ancient\nconnection between Flow beings and nature.",
            "My laboratory holds the secrets\nof deeper bloom techniques.",
            "Come back when the garden flourishes.\nI will have something for you then.",
        ]
    },
    kronik_intro: {
        speaker:  'Kronik Trip',
        portrait: 'kronik_trip',
        pages: [
            "Woaaah dude... time is just like...\na circle, you know? 🌀",
            "I'm Kronik Trip! I travel through time\nand space... mostly by accident.",
            "I keep appearing here because\nthis place is a NEXUS of pure energy.",
            "Maybe later I'll take you back\nto see where all this began...",
            "...or maybe forward to see what\nthis garden becomes. Far out. ✨",
        ]
    },
    stone_memorial: {
        speaker:  'Stone',
        portrait: null,
        pages: [
            '"Those who planted seeds of change..."',
            "This memorial honours the first growers\nwho restored these lands long ago.",
            "Their roots live on in every plant\nthat blooms here today.",
        ]
    },
    sign_pellet: {
        speaker:  'Sign',
        portrait: null,
        pages: [ "PELLET TOWN\nPopulation: Growing 🌱" ]
    },
    sign_history: {
        speaker:  'Sign',
        portrait: null,
        pages: [
            "HISTORY • ROOTS • GROWTH",
            "The three pillars of the Flow garden.\nLearn them. Live them.",
        ]
    },
};

// ── AREA DEFINITIONS ─────────────────────────────────────────
window.AREAS = {

    // ── AREA 1: PELLET TOWN ──────────────────────────────────
    pellet_town: {
        id:    'pellet_town',
        name:  'Pellet Town',
        cols:  20,
        rows:  18,
        unlockRequires: null,

        // tileId = row*10 + col, maps to tileset_new.png grid
        // Row 0 (y=34):  0=grass_lush 1=grass_flowers 2=grass_tan 3=dirt 4=dirt_dark
        //                5=wilted1    6=wilted2        7=flowers   8=water_edge 9=grass_clean
        // Row 1 (y=154): 10=water 11=water_grass 12=water_isle 13=water_mid 14=water_wide
        //                15=water_rock 16=water_isle2 17=water_side 18=stone_arch 19=grass_r
        // Row 2 (y=301): 20=wall_l 21=wall_mid 22=wall_corner 23=wall_open 24=wall_r
        tilemap: [
          // row 0 — lush grass, water river right
           2, 2, 2, 2, 2, 2, 2, 2, 2,11,12,12,12,12,13, 2, 2, 2, 2, 2,
          // row 1 — building top-left, path starts, water
           2, 2, 2, 2, 2, 2, 3, 3, 2,11,10,10,10,10,13, 2, 2, 2, 2, 2,
          // row 2 — building area
           2, 2, 2, 2, 2, 2, 3, 3, 2,11,10,10,10,10,13, 2, 2, 2, 2, 2,
          // row 3
           2, 2, 2, 2, 2, 2, 3, 3, 3,11,10,10,10,10,13, 2, 2, 2, 2, 2,
          // row 4 — sign area, wilted starts
           2, 2, 2, 2, 5, 5, 3, 3, 3, 3,11,12,12,13, 2, 2, 2, 2, 2, 2,
          // row 5 — buzzy area, wilted patches
           2, 2, 5, 5, 5, 5, 3, 3, 3, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2,
          // row 6 — more wilted
           2, 2, 5, 5, 3, 3, 3, 3, 3, 3, 3, 5, 5, 2, 2, 2, 2, 2, 2, 2,
          // row 7 — Flow spawn, central path
           2, 2, 5, 2, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 2, 2, 2, 2, 2, 2,
          // row 8
           2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 5, 5, 5, 2, 2, 2, 2, 2, 2,
          // row 9
           2, 5, 5, 2, 2, 3, 3, 3, 3, 2, 2, 5, 6, 6, 2, 2, 2, 2, 2, 2,
          // row 10 — stone wall fence
           2, 5, 5, 2, 2, 2, 3, 3, 2, 2,21,21,21,21, 2, 2, 2, 2, 2, 2,
          // row 11
           2, 2, 5, 2, 2, 2, 3, 3, 2, 2, 2, 5, 6, 6, 2, 2, 2, 2, 2, 2,
          // row 12
           2, 2, 2, 5, 2, 2, 2, 5, 5, 5, 5, 5, 6, 2, 2, 2, 2, 2, 2, 2,
          // row 13 — memorial zone
           2, 2, 2, 5, 5, 5, 5, 6, 6, 6, 6, 5, 2, 2, 2, 2, 2, 2, 2, 2,
          // row 14
           2, 2, 2, 2, 5, 5, 5, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2,
          // row 15
           2, 2, 2, 2, 2, 5, 5, 5, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2,
          // row 16
           2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
          // row 17 — bottom edge
           2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        ],

        playerStart: { x:7*T+T/2, y:7*T+T/2 },

        npcs: [
            { id:'buzzy', sprite:'buzzy_ow', x:9*T+T/2, y:5*T+T/2,
              direction:'down', dialogue:'buzzy_intro', repeat:'buzzy_reminder' },
        ],

        objects: [
            { id:'sign_pellet',  x:5*T+24,  y:4*T+12,  sprite:'sign',     dialogue:'sign_pellet'   },
            { id:'sign_history', x:2*T+24,  y:11*T+12, sprite:'sign',     dialogue:'sign_history'  },
            { id:'memorial',     x:11*T+24, y:13*T+12, sprite:'memorial', dialogue:'stone_memorial' },
        ],

        decor: [
            { type:'tree_oak',  x:1*T+24,  y:0*T+32,  size:T*1.8 },
            { type:'tree_pine', x:18*T+24, y:0*T+32,  size:T*1.6 },
            { type:'tree_pine', x:19*T+24, y:3*T+32,  size:T*1.4 },
            { type:'tree_pine', x:0*T+24,  y:5*T+32,  size:T*1.5 },
            { type:'tree_pine', x:0*T+24,  y:10*T+32, size:T*1.4 },
            { type:'lamp',      x:2*T+24,  y:6*T+16,  size:T*0.9 },
            { type:'rock',      x:7*T+10,  y:5*T+20,  size:T*0.7 },
            { type:'rock2',     x:11*T+20, y:3*T+10,  size:T*0.6 },
            { type:'rock2',     x:14*T+10, y:8*T+20,  size:T*0.6 },
            { type:'stump',     x:3*T+24,  y:14*T+20, size:T*0.8 },
            { type:'log',       x:8*T+10,  y:15*T+10, size:T*0.9 },
            { type:'plant',     x:5*T+24,  y:7*T+20,  size:T*0.8 },
            { type:'plant2',    x:12*T+24, y:7*T+20,  size:T*0.7 },
            { type:'flowers',   x:4*T+10,  y:12*T+10, size:T*0.8 },
            { type:'flowers',   x:9*T+24,  y:14*T+20, size:T*0.7 },
            { type:'bush',      x:5*T+10,  y:2*T+20,  size:T*1.0 },
        ],

        exits: [
            { x:8*T, y:17*T, w:4*T, toArea:'expanded_garden',
              toX:8*T+T/2, toY:2*T, requiresBloom:100 },
        ],

        bloomZones: [
            { cx:8*T,  cy:7*T,  r:2*T,   label:'Practice Zone A' },
            { cx:12*T, cy:9*T,  r:2.5*T, label:'Practice Zone B' },
            { cx:8*T,  cy:13*T, r:2*T,   label:'Practice Zone C' },
        ],

        onComplete: 'buzzy_done',
        bgMusic: null,
        ambientColour: 0x2a4a1a,
    },

    // ── AREA 2: EXPANDED GARDEN (template) ───────────────────
    expanded_garden: {
        id:    'expanded_garden',
        name:  'The Expanded Garden',
        cols:  24,
        rows:  20,
        unlockRequires: { area:'pellet_town', bloomPercent:100 },
        playerStart: { x:8*T+T/2, y:2*T+T/2 },

        // Tilemap filled with starting content — expand later
        tilemap: (function(){
            var map = [];
            for (var i=0;i<24*20;i++) map.push(i < 24 ? 17 : (Math.random()<0.3?2:0));
            return map;
        })(),

        npcs: [
            {
                id:       'dr_leaf',
                sprite:   'dr_leaf_ow',
                x:        12*T+T/2,
                y:         8*T+T/2,
                direction:'down',
                dialogue: 'dr_leaf_intro',
                repeat:   'dr_leaf_intro',
            },
            {
                id:       'kronik_trip',
                sprite:   'kronik_trip_ow',
                x:         6*T+T/2,
                y:        14*T+T/2,
                direction:'down',
                dialogue: 'kronik_intro',
                repeat:   'kronik_intro',
            },
        ],
        objects: [],
        decor:   [],
        exits:   [
            { x:8*T, y:0, w:4*T, toArea:'pellet_town', toX:8*T+T/2, toY:16*T },
        ],
        bloomZones: [],
        onComplete: null,
        bgMusic: null,
        ambientColour: 0x1a3a2a,
    },
};