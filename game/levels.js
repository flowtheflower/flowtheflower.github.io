/**
 * FLOW: BLOOMFALL — Level Definitions
 * ─────────────────────────────────────────────────────────────
 * Each level is a self-contained object. To add a new level:
 *   1. Copy an existing entry and change the id/name/objects
 *   2. Push it to the LEVELS array
 *
 * Object types:
 *   'grow'  → launches Flow upward, activates platform
 *   'water' → triggers water flow, screen flash, crosses gaps
 *   'bloom' → final trigger, ends the level
 *
 * Platform types (for visual tiles):
 *   'dead'    → dark cracked ground
 *   'alive'   → green living ground
 *   'water'   → water surface
 *   'crystal' → end-zone platform
 */

const LEVELS = [

    // ─── LEVEL 1 — THE AWAKENING ─────────────────────────────
    {
        id: 1,
        name: 'THE AWAKENING',
        subtitle: 'Restore the first bloom',
        worldLength: 2200,     // total pixel width of this level
        playerStart: { x: 80, y: 460 },
        groundY: 460,
        bgColor: '#0d1f2d',
        bgGradientTop: '#0a1520',
        bgGradientBottom: '#1a3020',
        startEnergy: 100,
        music: null,           // future: 'assets/music/level1.mp3'

        // Platforms — visual ground tiles placed in world
        platforms: [
            { x: 0,    y: 480, w: 300,  type: 'dead'  },
            { x: 300,  y: 480, w: 60,   type: 'gap'   },  // gap
            { x: 360,  y: 480, w: 200,  type: 'dead'  },
            { x: 560,  y: 480, w: 60,   type: 'gap'   },  // gap
            { x: 620,  y: 460, w: 240,  type: 'dead',  elevated: true },
            { x: 860,  y: 480, w: 80,   type: 'gap'   },
            { x: 940,  y: 480, w: 300,  type: 'dead'  },
            { x: 1240, y: 480, w: 60,   type: 'gap'   },
            { x: 1300, y: 480, w: 300,  type: 'dead'  },
            { x: 1600, y: 480, w: 600,  type: 'dead'  },
        ],

        // Interactive objects — what the player taps to activate
        objects: [
            {
                id: 'grow_1',
                x: 290, y: 455,
                type: 'grow',
                label: '🌱',
                hint: 'TAP TO GROW!',
                scoreValue: 100,
            },
            {
                id: 'grow_2',
                x: 550, y: 435,
                type: 'grow',
                label: '🌱',
                hint: 'USE PLANTS TO CROSS!',
                scoreValue: 100,
            },
            {
                id: 'water_1',
                x: 850, y: 455,
                type: 'water',
                label: '💧',
                hint: 'FILL THE WATER TO FLOW!',
                scoreValue: 150,
            },
            {
                id: 'grow_3',
                x: 1230, y: 455,
                type: 'grow',
                label: '🌱',
                hint: null,
                scoreValue: 100,
            },
            {
                id: 'water_2',
                x: 1490, y: 455,
                type: 'water',
                label: '💧',
                hint: null,
                scoreValue: 150,
            },
            {
                id: 'bloom_1',
                x: 1900, y: 440,
                type: 'bloom',
                label: '🌸',
                hint: 'MAKE EVERYTHING BLOOM!',
                scoreValue: 500,
            },
        ],

        // Decorative elements (no interaction, just vibe)
        decor: [
            { x: 150,  y: 465, sprite: 'dead_plant'  },
            { x: 400,  y: 465, sprite: 'dead_plant'  },
            { x: 700,  y: 445, sprite: 'dead_plant'  },
            { x: 1050, y: 465, sprite: 'dead_plant'  },
            { x: 1750, y: 465, sprite: 'crystal'     },
            { x: 1850, y: 445, sprite: 'crystal'     },
        ],
    },

    // ─── LEVEL 2 — PLACEHOLDER (add your design here) ────────
    // {
    //     id: 2,
    //     name: 'THE CASCADE',
    //     ...
    // },
];

// Export for use in game.js
// (plain global var — no module bundler needed for GitHub Pages)
window.FLOW_LEVELS = LEVELS;
