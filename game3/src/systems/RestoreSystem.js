export default class RestoreSystem {
  constructor(scene, ground) {
    this.scene = scene;
    this.ground = ground;
  }

  tryRestore(player) {
    const tile = this.ground.getTileAtWorldXY(player.x, player.y);

    if (!tile) return;

    if (tile.index === 5) {
      tile.index = 6;

      this.scene.flowdex.recordRestore();
      this.scene.questSystem.incrementRestore();
      this.scene.audio.play("restore");
    }
  }
}
