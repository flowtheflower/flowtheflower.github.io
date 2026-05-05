export default class SaveSystem {
  constructor(scene) {
    this.scene = scene;
  }

  save() {
    const data = {
      x: this.scene.player.sprite.x,
      y: this.scene.player.sprite.y
    };
    localStorage.setItem("flow_save", JSON.stringify(data));
  }

  load() {
    const data = JSON.parse(localStorage.getItem("flow_save"));
    if (!data) return;

    this.scene.player.sprite.setPosition(data.x, data.y);
  }
}
