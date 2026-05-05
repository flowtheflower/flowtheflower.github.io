export default class QuestSystem {
  constructor(scene) {
    this.scene = scene;
    this.progress = 0;
  }

  incrementRestore() {
    this.progress++;
  }
}
