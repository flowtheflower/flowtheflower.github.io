export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, "flow", 0);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.speed = 120;

    this.createAnimations();
  }

  createAnimations() {
    const a = this.scene.anims;

    if (!a.exists("walk")) {
      a.create({
        key: "walk",
        frames: a.generateFrameNumbers("flow", { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  update() {
    const b = this.sprite.body;
    b.setVelocity(0);

    if (this.cursors.left.isDown) b.setVelocityX(-this.speed);
    if (this.cursors.right.isDown) b.setVelocityX(this.speed);
    if (this.cursors.up.isDown) b.setVelocityY(-this.speed);
    if (this.cursors.down.isDown) b.setVelocityY(this.speed);

    b.velocity.normalize().scale(this.speed);

    if (b.velocity.length() > 0) {
      this.sprite.play("walk", true);
    } else {
      this.sprite.stop();
    }
  }
}
