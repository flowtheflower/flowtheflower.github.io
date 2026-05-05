export default class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.music = scene.sound.add("music", { loop: true, volume: 0.5 });
    this.restore = scene.sound.add("restore", { volume: 0.4 });
  }

  playMusic() {
    this.music.play();
  }

  play(key) {
    if (key === "restore") this.restore.play();
  }
}
