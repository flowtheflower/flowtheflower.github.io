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
// tiles_garden.png — 6 cols × 4 rows, 48×48 each
// Row 0: grass variants (healthy ground)
// Row 1: grass with flowers + wilted plants (start)
// Row 2: more wilted + water tiles start
// Row 3: water tiles
window.TILE_DEFS = {
     0: { name:'grass_0',    walkable:true,  bloomable:false },
     1: { name:'grass_1',    walkable:true,  bloomable:false },
     2: { name:'grass_2',    walkable:true,  bloomable:false },
     3: { name:'grass_3',    walkable:true,  bloomable:false },
     4: { name:'grass_f0',   walkable:true,  bloomable:false },
     5: { name:'grass_f1',   walkable:true,  bloomable:false },
     6: { name:'grass_f2',   walkable:true,  bloomable:false },
     7: { name:'grass_f3',   walkable:true,  bloomable:false },
     8: { name:'wilted_0',   walkable:true,  bloomable:true  },
     9: { name:'wilted_1',   walkable:true,  bloomable:true  },
    10: { name:'wilted_2',   walkable:true,  bloomable:true  },
    11: { name:'wilted_3',   walkable:true,  bloomable:true  },
    12: { name:'wilted2_0',  walkable:true,  bloomable:true  },
    13: { name:'wilted2_1',  walkable:true,  bloomable:true  },
    14: { name:'wilted2_2',  walkable:true,  bloomable:true  },
    15: { name:'wilted2_3',  walkable:true,  bloomable:true  },
    16: { name:'water_0',    walkable:false, bloomable:false },
    17: { name:'water_1',    walkable:false, bloomable:false },
    18: { name:'water_2',    walkable:false, bloomable:false },
    19: { name:'water_3',    walkable:false, bloomable:false },
    20: { name:'water2_0',   walkable:false, bloomable:false },
    21: { name:'water2_1',   walkable:false, bloomable:false },
    22: { name:'water2_2',   walkable:false, bloomable:false },
    23: { name:'water2_3',   walkable:false, bloomable:false },
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
        unlockRequires: null,  // always open

        // 20×18 tilemap — new tile IDs matching extracted atlas
        // 0-3=grass healthy, 4-7=grass flowers, 8-11=wilted,
        // 12-15=wilted2, 16-19=water, 20-23=water2
        tilemap: [
          // row 0 — top border, dark grass
          1,1,1,1,1, 0, 0, 0, 8, 8, 8, 0, 0, 0, 0, 0,16,16,16,16,
          // row 1
          1, 0, 0,1,1, 0, 0, 8, 8,10, 0, 0, 0, 0, 0, 0,16,17,17,16,
          // row 2 — building interior
          2, 2, 2, 2,1, 0, 3, 3, 8,10, 0, 0, 0, 0, 0, 0,18,17,17,18,
          // row 3
          2, 2, 2, 2,1, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0,18,17,16,18,
          // row 4
          1,1,1,1,1, 8, 3, 3, 3, 8, 0, 0, 8, 8, 0, 0,18,17,16,18,
          // row 5
          0, 0, 8, 8, 8, 8, 3, 3, 3, 8, 8, 8, 8, 0, 0, 0, 0, 0,18, 0,
          // row 6
          0, 0, 8, 8, 3, 3, 3, 3, 3, 3, 3, 8, 8, 0, 0, 0, 0, 0,18, 0,
          // row 7 — Flow spawn
          0, 0, 8, 0, 3, 3, 3, 3, 3, 3, 3, 3, 8, 8, 0, 0, 1, 0,18, 0,
          // row 8
          0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 8, 8, 8, 0, 1, 1, 0, 0, 0,
          // row 9
          0, 8, 8, 0, 0, 3, 3, 3, 3, 0, 0, 8,10,10, 1, 1, 0, 0, 0, 0,
          // row 10
          0, 8, 8, 0, 0, 0, 3, 3, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
          // row 11
          0, 0, 8, 0, 0, 0, 3, 3, 0, 0, 0, 8,10,10, 0, 0, 0, 0, 0, 0,
          // row 12
          0, 0, 0, 8, 0, 0, 0, 8, 8, 8, 8, 8,10, 0, 0, 0, 0, 0, 0, 0,
          // row 13
          0, 0, 0, 8, 8, 8, 8,10,10,10,10, 8, 0, 0, 1, 0, 0, 0, 0, 0,
          // row 14
          0, 0, 0, 0, 8, 8, 8,10,10,10,10,10, 0, 1, 1, 0, 0, 0, 0, 0,
          // row 15
          0, 0, 0, 0, 0, 8, 8, 8,10,10,10, 0, 1, 1, 0, 0, 0, 0, 0, 0,
          // row 16
          0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          // row 17 — bottom edge
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],

        // Player starting position (pixel coords)
        playerStart: { x: 7*T + T/2, y: 7*T + T/2 },

        // NPCs
        npcs: [
            {
                id:        'buzzy',
                sprite:    'buzzy_ow',
                x:         9*T + T/2,
                y:         5*T + T/2,
                direction: 'down',
                dialogue:  'buzzy_intro',
                repeat:    'buzzy_reminder',
            },
        ],

        // Interactable objects (non-NPC)
        objects: [
            { id:'sign_pellet',   x: 5*T+24, y: 4*T+12, sprite:'sign',     dialogue:'sign_pellet'   },
            { id:'sign_history',  x: 2*T+24, y:11*T+12, sprite:'sign',     dialogue:'sign_history'  },
            { id:'memorial',      x:12*T+24, y:13*T+12, sprite:'memorial', dialogue:'stone_memorial' },
        ],

        // Decorative objects (lamp post, rocks, trees — no interaction)
        decor: [
            { type:'lamp',   x: 2*T+24, y: 6*T+8  },
            { type:'rock',   x: 7*T+10, y: 5*T+20 },
            { type:'rock',   x:11*T+20, y: 3*T+10 },
            { type:'willow', x:18*T+16, y: 1*T+8  },
            { type:'willow', x: 0*T+20, y: 5*T+8  },
            { type:'willow', x: 1*T+10, y:10*T+8  },
        ],

        // Exits to other areas
        exits: [
            // Bottom edge: walk off → expanded garden (locked until 100% bloom)
            { x:8*T, y:17*T, w:4*T, toArea:'expanded_garden', toX:8*T+T/2, toY:2*T, requiresBloom:100 },
        ],

        // Bloom zones: circles of bloomable tiles the player must restore
        // These are visual guide rings, actual blooming is per-tile
        bloomZones: [
            { cx: 8*T,  cy: 7*T,  r: 2*T, label:'Practice Zone A' },
            { cx:12*T,  cy: 9*T,  r:2.5*T, label:'Practice Zone B' },
            { cx: 8*T,  cy:13*T,  r: 2*T, label:'Practice Zone C' },
        ],

        // On-complete dialogue (when all bloomable tiles restored)
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
