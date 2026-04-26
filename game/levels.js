/**
 * FLOW: BLOOMFALL — Level Data
 * Tile size: T=48px. Canvas: 360x640. FLOOR_Y=472.
 *
 * Coordinates derived by mapping the reference panorama (1200x172 gameplay area)
 * to game world (2600x640) using scale_x=2.167, scale_y=2.744.
 *
 * Platform y values are the TOP of the surface tile.
 * Flow lands when feet reach platform.y (his feet = py + spriteH/2 * scale).
 */

var T = 48;

window.FLOW_LEVELS = [
  {
    id:          1,
    name:        'THE AWAKENING',
    worldLength: 2600,
    playerStart: { x: 80, y: 440 },  // placed on opening ground
    startEnergy: 100,

    // ── BACKGROUND LAYERS ────────────────────────────────────
    bgLayers: [
      { tile: 'background1', y: 0,   rows: 7, parallax: 0.12, alpha: 1.0  },
      { tile: 'background2', y: 0,   rows: 6, parallax: 0.22, alpha: 0.75 },
    ],

    clouds: [
      { x: 200,  y: 55,  scale: 1.5, parallax: 0.16 },
      { x: 550,  y: 35,  scale: 1.1, parallax: 0.16 },
      { x: 950,  y: 65,  scale: 1.8, parallax: 0.16 },
      { x: 1350, y: 42,  scale: 1.2, parallax: 0.16 },
      { x: 1750, y: 72,  scale: 1.6, parallax: 0.16 },
      { x: 2200, y: 48,  scale: 1.0, parallax: 0.16 },
    ],

    // ── PLATFORMS ────────────────────────────────────────────
    // y = top of surface tile (Flow lands when feet = y)
    // physY = the actual y used for physics (= y + T/2 for centre)
    platforms: [
      // Opening ground — wide, at floor level
      // ref x=0-310, y≈ground → world x=0-670, y=424
      { x: 0,    y: 424, w: T*14, type: 'top_grass', under: 'dead_ground', underRows: 4 },

      // Floating island 1 — mid height (the one with waterfall beside it)
      // ref x=220-380, y=110-145 → world x=476-823, y=397
      { x: T*10, y: 348, w: T*7,  type: 'top_grass', under: 'alive_ground', underRows: 2 },

      // Floating island 2 — higher (over the water, grow plants on top)
      // ref x=380-490, y=80-115 → world x=823-1061, y=315 (higher!)
      { x: T*18, y: 300, w: T*5,  type: 'top_grass', under: 'alive_ground', underRows: 2 },

      // Mushroom island — slightly lower than island 2
      // ref x=490-580, y=95-130 → world x=1061-1256, y=356
      { x: T*24, y: 252, w: T*4,  type: 'top_grass', under: 'alive_ground', underRows: 2 },

      // Right platform — tree trunk area
      // ref x=590-770, y=110-145 → world x=1278-1668, y=397
      { x: T*27, y: 300, w: T*8,  type: 'top_grass', under: 'alive_ground', underRows: 3 },

      // Final long platform — bloom area
      // ref x=820-1100, y=120-155 → world x=1776-2383, y=424
      { x: T*38, y: 348, w: T*14, type: 'top_grass', under: 'alive_ground', underRows: 3 },
    ],

    // ── WATERFALL (left cliff, beside island 1) ──────────────
    // ref x=165-220 → world x=357-476, column at x=T*7
    waterfall: [
      { x: T*9,  y: 160, tile: 'waterfall_top' },
      { x: T*9,  y: 208, tile: 'waterfall_mid' },
      { x: T*9,  y: 256, tile: 'waterfall_mid' },
      { x: T*9,  y: 304, tile: 'waterfall_mid' },
      { x: T*9,  y: 352, tile: 'waterfall_btm' },
    ],

    // ── WATER POOL (below islands 1 and 2, between) ──────────
    // ref x=380-530, y=130-172 → world x=823-1148, y=396-472
    waterPool: [
      // Surface row (animated)
      { x: T*17, y: 396, tile: 'water_flow1'  },
      { x: T*18, y: 396, tile: 'water_flow2'  },
      { x: T*19, y: 396, tile: 'water_flow1'  },
      { x: T*20, y: 396, tile: 'water_flow2'  },
      { x: T*21, y: 396, tile: 'water_still'  },
      { x: T*22, y: 396, tile: 'water_flow1'  },
      { x: T*23, y: 396, tile: 'water_flow2'  },
      // Deep water below
      { x: T*17, y: 444, tile: 'water_still'  },
      { x: T*18, y: 444, tile: 'water_still'  },
      { x: T*19, y: 444, tile: 'water_still'  },
      { x: T*20, y: 444, tile: 'water_still'  },
      { x: T*21, y: 444, tile: 'water_still'  },
      { x: T*22, y: 444, tile: 'water_still'  },
      { x: T*23, y: 444, tile: 'water_still'  },
    ],

    lilyPads: [
      { x: T*18+24, y: 388 },
      { x: T*20+24, y: 390 },
      { x: T*22+24, y: 386 },
    ],

    // ── DECORATIVE TILES ─────────────────────────────────────
    decor: [
      // Dead plants on opening ground
      { x: T*2+24,  y: 400, tile: 'dead_plant',  alpha: 1.0 },
      { x: T*4+24,  y: 402, tile: 'dead_plant',  alpha: 0.85 },
      { x: T*6+24,  y: 400, tile: 'dead_plant',  alpha: 0.9 },
      // Rocks on opening ground
      { x: T*3+24,  y: 412, tile: 'rock',         alpha: 0.9 },
      { x: T*8+24,  y: 414, tile: 'rock',         alpha: 0.85 },
      // Vines on cliff above waterfall
      { x: T*8+24,  y: 260, tile: 'vines',        alpha: 0.88 },
      { x: T*9+24,  y: 220, tile: 'vines',        alpha: 0.75 },
      // Grow plants on island 2
      { x: T*19+24, y: 276, tile: 'grow_plant2',  alpha: 1.0 },
      { x: T*21+24, y: 278, tile: 'grow_plant1',  alpha: 1.0 },
      // Mushroom on island 3
      { x: T*25+24, y: 220, tile: 'mushroom',     alpha: 1.0 },
      // Tree trunk on right platform
      { x: T*30+24, y: 220, tile: 'tree_trunk',   alpha: 1.0 },
      { x: T*31+24, y: 222, tile: 'tree_trunk',   alpha: 0.9 },
      // Leaves on tree canopy (layered)
      { x: T*29+24, y: 180, tile: 'leaves',       alpha: 1.0 },
      { x: T*30+24, y: 164, tile: 'leaves',       alpha: 1.0 },
      { x: T*31+24, y: 160, tile: 'leaves',       alpha: 0.95 },
      { x: T*32+24, y: 168, tile: 'leaves',       alpha: 0.9 },
      { x: T*33+24, y: 180, tile: 'leaves',       alpha: 0.85 },
      // Bush on final platform
      { x: T*43+24, y: 324, tile: 'bush',         alpha: 1.0 },
      { x: T*47+24, y: 326, tile: 'bush',         alpha: 0.9 },
      // Bloom flowers scattered
      { x: T*28+24, y: 276, tile: 'bloom_flower', alpha: 1.0 },
      { x: T*34+24, y: 278, tile: 'bloom_flower', alpha: 1.0 },
      { x: T*12+24, y: 326, tile: 'bloom_flower', alpha: 0.9 },
      { x: T*40+24, y: 326, tile: 'bloom_flower', alpha: 1.0 },
      { x: T*46+24, y: 328, tile: 'bloom_flower', alpha: 0.95 },
      // Crystals near end
      { x: T*49+24, y: 320, tile: 'crystal',      alpha: 1.0 },
      { x: T*51+24, y: 322, tile: 'crystal',      alpha: 0.9 },
      { x: T*53+24, y: 318, tile: 'crystal',      alpha: 0.85 },
      // Sparkle finale
      { x: T*50+24, y: 330, tile: 'sparkle',      alpha: 0.9 },
    ],

    // ── INTERACTIVE OBJECTS ───────────────────────────────────
    objects: [
      {
        id: 'g1', x: T*7+24,  y: 324, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
        label: '🌱', scoreValue: 100,
        hint: 'TAP TO GROW!',
      },
      {
        id: 'g2', x: T*13+24, y: 300, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant1',
        label: '🌱', scoreValue: 100,
        hint: 'USE PLANTS TO CROSS!',
      },
      {
        id: 'w1', x: T*16+24, y: 348, type: 'water',
        tile_dead: 'water_still', tile_alive: 'water_flow1',
        label: '💧', scoreValue: 150,
        hint: 'FILL THE WATER TO FLOW!',
      },
      {
        id: 'g3', x: T*23+24, y: 276, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
        label: '🌱', scoreValue: 100,
        hint: null,
      },
      {
        id: 'w2', x: T*26+24, y: 252, type: 'water',
        tile_dead: 'water_still', tile_alive: 'water_flow2',
        label: '💧', scoreValue: 150,
        hint: null,
      },
      {
        id: 'g4', x: T*36+24, y: 300, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant1',
        label: '🌱', scoreValue: 100,
        hint: null,
      },
      {
        id: 'bl', x: T*52+24, y: 296, type: 'bloom',
        tile_dead: 'dead_plant', tile_alive: 'bloom_flower',
        label: '🌸', scoreValue: 500,
        hint: 'MAKE EVERYTHING BLOOM!',
      },
    ],
  },
];
