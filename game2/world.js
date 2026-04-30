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
window.TILE_DEFS = {
     0: { name:'grass_healthy', walkable:true,  bloomable:false },
     1: { name:'grass_lush',    walkable:true,  bloomable:false },
     2: { name:'grass_wilted',  walkable:true,  bloomable:true  },
     3: { name:'path_dirt',     walkable:true,  bloomable:false },
     4: { name:'path_stone',    walkable:true,  bloomable:false },
     5: { name:'floor_wood',    walkable:true,  bloomable:false },
     6: { name:'water_deep',    walkable:false, bloomable:false },
     7: { name:'water_shallow', walkable:false, bloomable:false },
     8: { name:'water_edge',    walkable:true,  bloomable:false },
     9: { name:'grass_dark',    walkable:true,  bloomable:false },
    10: { name:'grass_autumn',  walkable:true,  bloomable:true  },
    11: { name:'grass_dry',     walkable:true,  bloomable:true  },
    12: { name:'bloom_ground',  walkable:true,  bloomable:false },
    13: { name:'hemp_sprout',   walkable:true,  bloomable:false },
    14: { name:'grass_healing', walkable:true,  bloomable:false },
    15: { name:'path_dirt2',    walkable:true,  bloomable:false },
    16: { name:'stone_bridge',  walkable:true,  bloomable:false },
    17: { name:'stone_wall',    walkable:false, bloomable:false },
    18: { name:'fence_h',       walkable:false, bloomable:false },
    19: { name:'fence_v',       walkable:false, bloomable:false },
    20: { name:'dirt_dark',     walkable:true,  bloomable:false },
    21: { name:'sand_light',    walkable:true,  bloomable:false },
    22: { name:'grass_shadow',  walkable:true,  bloomable:false },
    23: { name:'empty',         walkable:false, bloomable:false },
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

        // 20×18 tilemap — read left-to-right, top-to-bottom
        // Matches reference: building top-left, river right, path center,
        // fence bottom-center, memorial bottom-right, wilted patches throughout
        tilemap: [
          // row 0 — top edge, mostly dark grass + building roof
          17,17,17,17,17, 9, 9, 9, 2, 2, 2, 9, 9, 9, 9, 9, 6, 6, 6, 6,
          // row 1
          17, 1, 1,17,17, 0, 0, 2, 2,11, 0, 0, 9, 9, 9, 0, 6, 7, 7, 6,
          // row 2 — building interior + path starts
           5, 5, 5, 5,17, 0, 3, 3, 2,11, 0, 0, 0, 9, 9, 0, 8, 7, 7, 8,
          // row 3 — building bottom + path
           5, 5, 5, 5,17, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 8, 7, 7, 8,
          // row 4 — below building, sign area
          17,17,17,17,17, 2, 3, 3, 3, 2, 0, 0, 2, 2, 0, 0, 8, 7,16, 8,
          // row 5 — open area, wilted patches
           9, 9, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 0, 0, 0, 0, 0,16, 0,
          // row 6 — more open, lamp post row
           9, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0, 0, 0, 0, 8, 0,
          // row 7 — Flow spawn row, central path
           0, 0, 2, 0, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0,19, 0, 8, 0,
          // row 8 — mid area
           0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 2, 2, 2, 0,19,19, 0, 0, 0,
          // row 9 — lower mid, fence starts
           0, 2, 2, 0, 0, 3, 3, 3, 3, 0, 0, 2,11,11,19,19, 0, 0, 0, 0,
          // row 10 — fence row
           9, 2, 2, 0, 0, 0, 3, 3, 0, 0,18,18,18,18, 0, 0, 0, 0, 0, 0,
          // row 11 — below fence, history sign
           9, 9, 2, 0, 0, 0, 3, 3, 0, 0, 0, 2,11,11, 0, 0, 0, 0, 0, 0,
          // row 12
           9, 9, 9, 2, 0, 0, 0, 2, 2, 2, 2, 2,11, 0, 0, 0, 0, 0, 0, 0,
          // row 13 — memorial area + fence lower
           9, 9, 9, 2, 2, 2, 2,11,11,11,11, 2, 0, 0,19, 0, 0, 0, 0, 0,
          // row 14
           9, 9, 9, 9, 2, 2, 2,11,11,11,11,11, 0,19,19, 0, 0, 0, 0, 0,
          // row 15 — bottom area
           9, 9, 9, 9, 9, 2, 2, 2,11,11,11, 0,19,19, 0, 0, 0, 0, 0, 0,
          // row 16
           9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          // row 17 — bottom edge
           9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
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
