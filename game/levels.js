/**
 * FLOW: BLOOMFALL — Level Data
 * ─────────────────────────────────────────────────────────────
 * To add a new level: copy the Level 1 object, change the id,
 * name, objects, platforms, and push into FLOW_LEVELS.
 *
 * Object types:
 *   'grow'  — launches Flow upward, bridges gaps
 *   'water' — screen flash, crosses water sections
 *   'bloom' — final trigger, completes the level
 */

window.FLOW_LEVELS = [

    // ── LEVEL 1: THE AWAKENING ────────────────────────────────
    {
        id:             1,
        name:           'THE AWAKENING',
        subtitle:       'Restore the first bloom',
        worldLength:    2200,
        playerStart:    { x: 80, y: 460 },
        groundY:        460,
        startEnergy:    100,
        bgGradientTop:  '#0a1520',
        bgGradientBot:  '#0d2010',

        // Visual ground tiles
        platforms: [
            { x: 0,    w: 290,  type: 'dead'    },
            { x: 360,  w: 200,  type: 'dead'    },
            { x: 620,  w: 240,  type: 'dead',  elevated: true  },
            { x: 940,  w: 300,  type: 'dead'    },
            { x: 1300, w: 300,  type: 'dead'    },
            { x: 1600, w: 600,  type: 'dead'    },
        ],

        // Interactive objects
        objects: [
            { id: 'g1', x: 280,  y: 455, type: 'grow',  label: '🌱', scoreValue: 100, hint: 'TAP TO GROW!'          },
            { id: 'g2', x: 550,  y: 435, type: 'grow',  label: '🌱', scoreValue: 100, hint: 'USE PLANTS TO CROSS!'  },
            { id: 'w1', x: 855,  y: 455, type: 'water', label: '💧', scoreValue: 150, hint: 'FILL THE WATER!'       },
            { id: 'g3', x: 1235, y: 455, type: 'grow',  label: '🌱', scoreValue: 100, hint: null                    },
            { id: 'w2', x: 1495, y: 455, type: 'water', label: '💧', scoreValue: 150, hint: null                    },
            { id: 'b1', x: 1900, y: 445, type: 'bloom', label: '🌸', scoreValue: 500, hint: 'MAKE EVERYTHING BLOOM!'},
        ],
    },

    // ── LEVEL 2: THE CASCADE (template — uncomment to activate) ─
    // {
    //     id:             2,
    //     name:           'THE CASCADE',
    //     subtitle:       'Follow the water',
    //     worldLength:    2600,
    //     playerStart:    { x: 80, y: 460 },
    //     groundY:        460,
    //     startEnergy:    100,
    //     bgGradientTop:  '#0a1525',
    //     bgGradientBot:  '#0d1530',
    //     platforms: [ ... ],
    //     objects:   [ ... ],
    // },
];
