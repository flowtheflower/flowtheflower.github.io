export default class BootScene extends Phaser.Scene {
  create() {
    this.scene.start("PreloadScene");
  }
}
