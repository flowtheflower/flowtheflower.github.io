/**
 * FLOW: BLOOMFALL — Level Data
 * ─────────────────────────────────────────────────────────────
 * Platform types: 'ground_dead' | 'ground_alive' | 'water' | 'mushroom'
 * Object  types:  'grow' | 'water' | 'bloom'
 *
 * To add a level: copy Level 1 block, paste at end of array, edit.
 */
window.FLOW_LEVELS = [
    {
        id:            1,
        name:          'THE AWAKENING',
        worldLength:   2400,
        playerStart:   { x: 80, y: 432 },
        bgTop:         0x0a1a2e,
        bgBot:         0x0d2415,

        // Platforms — each tile is 48px wide on screen (scaled from 64px asset)
        // type: which tile image to use for the top surface
        // x,y: left edge, top of platform surface in world coords
        // w: width in pixels
        platforms: [
            // Opening ground — dead
            { x: 0,    y: 450, w: 310,  type: 'dead'  },
            // Gap 310-380
            // Second island
            { x: 380,  y: 450, w: 200,  type: 'dead'  },
            // Gap 580-660
            // Elevated section with mushroom
            { x: 660,  y: 420, w: 160,  type: 'dead',  elevated: true },
            // Gap 820-900
            // Water crossing island
            { x: 900,  y: 450, w: 240,  type: 'dead'  },
            // Gap 1140-1220
            // Long mid section
            { x: 1220, y: 450, w: 320,  type: 'dead'  },
            // Gap 1540-1620
            // Final bloom area
            { x: 1620, y: 450, w: 780,  type: 'dead'  },
        ],

        // Decorative tiles placed in world (no interaction)
        decor: [
            // Dead plants on opening ground
            { x: 120,  y: 430, tile: 'dead_plant'  },
            { x: 210,  y: 430, tile: 'dead_plant'  },
            // Rock on second island
            { x: 450,  y: 430, tile: 'rock'        },
            // Vines hanging near mushroom island
            { x: 680,  y: 370, tile: 'vines'       },
            { x: 730,  y: 370, tile: 'vines'       },
            // Tree trunks far ground
            { x: 1280, y: 420, tile: 'tree_trunk'  },
            { x: 1370, y: 420, tile: 'tree_trunk'  },
            // Crystals near bloom
            { x: 1700, y: 428, tile: 'crystal'     },
            { x: 1800, y: 428, tile: 'crystal'     },
            // Clouds in sky (fixed depth)
            { x: 200,  y: 160, tile: 'cloud', scrollFactor: 0.4 },
            { x: 600,  y: 120, tile: 'cloud', scrollFactor: 0.4 },
            { x: 1100, y: 150, tile: 'cloud', scrollFactor: 0.4 },
            { x: 1600, y: 130, tile: 'cloud', scrollFactor: 0.4 },
            { x: 2000, y: 160, tile: 'cloud', scrollFactor: 0.4 },
        ],

        // Interactive objects — what tapping activates
        objects: [
            {
                id: 'g1', x: 295,  y: 428, type: 'grow',
                tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
                label: '🌱', scoreValue: 100,
                hint: 'TAP TO GROW!',
            },
            {
                id: 'g2', x: 570,  y: 428, type: 'grow',
                tile_dead: 'dead_plant', tile_alive: 'grow_plant1',
                label: '🌱', scoreValue: 100,
                hint: 'USE PLANTS TO CROSS!',
            },
            {
                id: 'mu', x: 740,  y: 395, type: 'grow',
                tile_dead: 'mushroom', tile_alive: 'mushroom',
                label: '🍄', scoreValue: 100,
                hint: null,
            },
            {
                id: 'w1', x: 890,  y: 428, type: 'water',
                tile_dead: 'water_still', tile_alive: 'water_flow1',
                label: '💧', scoreValue: 150,
                hint: 'FILL THE WATER TO FLOW!',
            },
            {
                id: 'g3', x: 1210, y: 428, type: 'grow',
                tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
                label: '🌱', scoreValue: 100,
                hint: null,
            },
            {
                id: 'w2', x: 1535, y: 428, type: 'water',
                tile_dead: 'water_still', tile_alive: 'water_flow2',
                label: '💧', scoreValue: 150,
                hint: null,
            },
            {
                id: 'bl', x: 1950, y: 418, type: 'bloom',
                tile_dead: 'dead_plant', tile_alive: 'bloom_flower',
                label: '🌸', scoreValue: 500,
                hint: 'MAKE EVERYTHING BLOOM!',
            },
        ],

        startEnergy: 100,
    },
    // ── LEVEL 2 TEMPLATE ──────────────────────────────────────
    // Uncomment and fill to add a second level:
    // {
    //     id: 2, name: 'THE CASCADE', worldLength: 2800,
    //     playerStart: { x: 80, y: 432 },
    //     bgTop: 0x0a1530, bgBot: 0x0a2030,
    //     platforms: [ ... ],
    //     decor:     [ ... ],
    //     objects:   [ ... ],
    //     startEnergy: 100,
    // },
];
