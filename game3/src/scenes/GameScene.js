import Player from "../entities/Player.js";
import DialogueSystem from "../systems/DialogueSystem.js";
import QuestSystem from "../systems/QuestSystem.js";
import Flowdex from "../systems/Flowdex.js";
import EconomySystem from "../systems/EconomySystem.js";
import RestoreSystem from "../systems/RestoreSystem.js";
import SaveSystem from "../systems/SaveSystem.js";
import UIManager from "../systems/UIManager.js";
import AudioSystem from "../systems/AudioSystem.js";

export default class GameScene extends Phaser.Scene {
  create() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tileset", "tiles");

    this.ground = map.createLayer("Ground", tileset);

    this.player = new Player(this, 200, 200);

    this.dialogueSystem = new DialogueSystem(this);
    this.questSystem = new QuestSystem(this);
    this.flowdex = new Flowdex();
    this.economy = new EconomySystem();
    this.restoreSystem = new RestoreSystem(this, this.ground);
    this.saveSystem = new SaveSystem(this);
    this.ui = new UIManager(this);
    this.audio = new AudioSystem(this);

    this.audio.playMusic();

    this.input.keyboard.on("keydown-SPACE", () => {
      this.restoreSystem.tryRestore(this.player.sprite);
    });

    this.input.keyboard.on("keydown-S", () => this.saveSystem.save());
    this.input.keyboard.on("keydown-L", () => this.saveSystem.load());
    this.input.keyboard.on("keydown-TAB", () => this.ui.toggle());

    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setZoom(3);
  }

  update() {
    this.player.update();
    this.ui.update();
  }
}
