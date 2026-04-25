/**
 * FLOW: BLOOMFALL — Level Data
 * All coordinates in world-pixels. Tile display size = 48px.
 * Canvas: 360w × 640h. FLOOR_Y = 472 (Flow's feet when on ground).
 *
 * Level 1 layout replicates the reference panorama:
 *   • background1 tiles (mountains) far parallax
 *   • background2 tiles (sky/clouds) mid parallax
 *   • cloud tiles floating
 *   • Left ground platform  →  gap  →  floating island (dead plant)
 *   • Waterfall left cliff
 *   • Mid floating island with grow plants
 *   • Water pool with lily pads below
 *   • Elevated island with mushroom
 *   • Right platform with tree trunk, leaves, bloom flowers
 *   • Crystal cluster near end
 *   • Bush + sparkle at finale
 */

var T = 48; // tile display size in pixels

window.FLOW_LEVELS = [
  {
    id:           1,
    name:         'THE AWAKENING',
    worldLength:  2600,
    playerStart:  { x: 80, y: 472 },
    startEnergy:  100,

    // ── BACKGROUND LAYERS ────────────────────────────────────
    // Each layer is drawn by buildBg() using these descriptors.
    bgLayers: [
      // Far sky — background1 (mountains+sky), very slow parallax
      { tile: 'background1', y: 0,   rows: 6, parallax: 0.15, alpha: 1.0 },
      // Mid sky — background2 (lighter sky), slow parallax
      { tile: 'background2', y: 0,   rows: 5, parallax: 0.25, alpha: 0.85 },
    ],

    // ── FLOATING CLOUDS ──────────────────────────────────────
    clouds: [
      { x: 160,  y: 60,  scale: 1.4, parallax: 0.18 },
      { x: 520,  y: 40,  scale: 1.1, parallax: 0.18 },
      { x: 900,  y: 80,  scale: 1.6, parallax: 0.18 },
      { x: 1300, y: 50,  scale: 1.2, parallax: 0.18 },
      { x: 1700, y: 70,  scale: 1.5, parallax: 0.18 },
      { x: 2100, y: 45,  scale: 1.0, parallax: 0.18 },
      { x: 2450, y: 65,  scale: 1.3, parallax: 0.18 },
    ],

    // ── PLATFORMS ─────────────────────────────────────────────
    // type: tile used for top surface   underTile: fill tile below
    // y: top of top-surface tile row    h: how many tile rows of fill below
    platforms: [
      // Opening ground — long left platform
      { x: 0,    y: 432, w: T*7,  type: 'top_grass',   under: 'dead_ground', underRows: 3 },
      // Floating island 1 (mid-left, with dead plant + waterfall beside)
      { x: T*10, y: 380, w: T*5,  type: 'top_grass',   under: 'alive_ground', underRows: 2 },
      // Floating island 2 (centre, over water — grow plants)
      { x: T*17, y: 340, w: T*6,  type: 'top_grass',   under: 'alive_ground', underRows: 2 },
      // Elevated island 3 (mushroom top)
      { x: T*25, y: 300, w: T*4,  type: 'top_grass',   under: 'alive_ground', underRows: 2 },
      // Large right platform (tree trunk, bloom flowers)
      { x: T*31, y: 360, w: T*9,  type: 'top_grass',   under: 'alive_ground', underRows: 3 },
      // Final platform (crystals, bush, end)
      { x: T*42, y: 400, w: T*12, type: 'top_grass',   under: 'alive_ground', underRows: 2 },
    ],

    // ── WATERFALL ─────────────────────────────────────────────
    // Waterfall sits left of island 1, flows into the water pool
    waterfall: [
      // x=T*9 (just left of island 1), top of waterfall at y=300
      { x: T*9,  y: 300, tile: 'waterfall_top' },
      { x: T*9,  y: 348, tile: 'waterfall_mid' },
      { x: T*9,  y: 396, tile: 'waterfall_mid' },
      { x: T*9,  y: 444, tile: 'waterfall_btm' },
    ],

    // ── WATER POOL ────────────────────────────────────────────
    // Sits below island 2, between islands 1 and 3
    waterPool: [
      // Top row: water_flow1, bottom row: water_still — 3 tiles wide
      { x: T*15, y: 440, tile: 'water_flow1' },
      { x: T*16, y: 440, tile: 'water_flow2' },
      { x: T*17, y: 440, tile: 'water_flow1' },
      { x: T*18, y: 440, tile: 'water_still' },
      { x: T*19, y: 440, tile: 'water_still' },
      { x: T*20, y: 440, tile: 'water_flow2' },
      { x: T*15, y: 488, tile: 'water_still' },
      { x: T*16, y: 488, tile: 'water_still' },
      { x: T*17, y: 488, tile: 'water_still' },
      { x: T*18, y: 488, tile: 'water_still' },
      { x: T*19, y: 488, tile: 'water_still' },
      { x: T*20, y: 488, tile: 'water_still' },
    ],

    // ── LILY PADS ─────────────────────────────────────────────
    lilyPads: [
      { x: T*16 + 24, y: 432 },
      { x: T*18 + 24, y: 436 },
    ],

    // ── DECORATIVE TILES ──────────────────────────────────────
    decor: [
      // Dead plant on opening ground
      { x: T*3+24,  y: 410, tile: 'dead_plant',   alpha: 1.0 },
      { x: T*5+24,  y: 412, tile: 'dead_plant',   alpha: 0.85 },
      // Rock on opening ground
      { x: T*2+24,  y: 420, tile: 'rock',          alpha: 0.9 },
      // Vines hanging left side
      { x: T*8+24,  y: 310, tile: 'vines',         alpha: 0.9 },
      // Grow plants on island 2
      { x: T*18+24, y: 316, tile: 'grow_plant2',   alpha: 1.0 },
      { x: T*20+24, y: 318, tile: 'grow_plant1',   alpha: 1.0 },
      // Mushroom on island 3
      { x: T*26+24, y: 272, tile: 'mushroom',      alpha: 1.0 },
      // Tree trunk on right platform
      { x: T*33+24, y: 316, tile: 'tree_trunk',    alpha: 1.0 },
      { x: T*34+24, y: 318, tile: 'tree_trunk',    alpha: 0.9 },
      // Leaves on tree canopy
      { x: T*32+24, y: 276, tile: 'leaves',        alpha: 1.0 },
      { x: T*33+24, y: 270, tile: 'leaves',        alpha: 1.0 },
      { x: T*34+24, y: 272, tile: 'leaves',        alpha: 0.9 },
      { x: T*35+24, y: 278, tile: 'leaves',        alpha: 0.85 },
      // Bush near right platform
      { x: T*38+24, y: 336, tile: 'bush',          alpha: 1.0 },
      // Bloom flowers scattered
      { x: T*36+24, y: 338, tile: 'bloom_flower',  alpha: 1.0 },
      { x: T*29+24, y: 278, tile: 'bloom_flower',  alpha: 1.0 },
      { x: T*13+24, y: 358, tile: 'bloom_flower',  alpha: 0.9 },
      // Crystals near end
      { x: T*44+24, y: 376, tile: 'crystal',       alpha: 1.0 },
      { x: T*46+24, y: 378, tile: 'crystal',       alpha: 0.9 },
      // Sparkle near finale
      { x: T*50+24, y: 380, tile: 'sparkle',       alpha: 0.8 },
    ],

    // ── INTERACTIVE OBJECTS ───────────────────────────────────
    objects: [
      {
        id: 'g1', x: T*6+24, y: 410, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
        label: '🌱', scoreValue: 100,
        hint: 'TAP TO GROW!',
      },
      {
        id: 'g2', x: T*11+24, y: 358, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant1',
        label: '🌱', scoreValue: 100,
        hint: 'USE PLANTS TO CROSS!',
      },
      {
        id: 'w1', x: T*14+24, y: 418, type: 'water',
        tile_dead: 'water_still', tile_alive: 'water_flow1',
        label: '💧', scoreValue: 150,
        hint: 'FILL THE WATER TO FLOW!',
      },
      {
        id: 'g3', x: T*24+24, y: 318, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant2',
        label: '🌱', scoreValue: 100,
        hint: null,
      },
      {
        id: 'w2', x: T*30+24, y: 338, type: 'water',
        tile_dead: 'water_still', tile_alive: 'water_flow2',
        label: '💧', scoreValue: 150,
        hint: null,
      },
      {
        id: 'g4', x: T*41+24, y: 378, type: 'grow',
        tile_dead: 'dead_plant', tile_alive: 'grow_plant1',
        label: '🌱', scoreValue: 100,
        hint: null,
      },
      {
        id: 'bl', x: T*51+24, y: 378, type: 'bloom',
        tile_dead: 'dead_plant', tile_alive: 'bloom_flower',
        label: '🌸', scoreValue: 500,
        hint: 'MAKE EVERYTHING BLOOM!',
      },
    ],
  },
];
