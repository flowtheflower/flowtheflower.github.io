export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    this.text = scene.add.text(10, 10, "", { fontSize: "14px" })
      .setScrollFactor(0);

    this.visible = true;
  }

  toggle() {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
  }

  update() {
    const f = this.scene.flowdex.entries.restored;
    this.text.setText(`Restored: ${f}`);
  }
}
