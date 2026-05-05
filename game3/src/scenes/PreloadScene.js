export default class PreloadScene extends Phaser.Scene {
  preload() {
    this.load.image("tiles", "assets/images/tileset.png");
    this.load.tilemapTiledJSON("map", "assets/maps/tilemap.json");

    this.load.spritesheet("flow", "assets/images/flow.png", {
      frameWidth: 32,
      frameHeight: 32
    });

    this.load.spritesheet("npcs", "assets/images/npcs.png", {
      frameWidth: 32,
      frameHeight: 32
    });

    this.load.audio("restore", "assets/audio/restore.wav");
    this.load.audio("music", "assets/audio/music_loop.mp3");
  }

  create() {
    this.scene.start("GameScene");
  }
}
