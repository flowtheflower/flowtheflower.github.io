import { config } from "./config.js";
import BootScene from "./scenes/BootScene.js";
import PreloadScene from "./scenes/PreloadScene.js";
import GameScene from "./scenes/GameScene.js";

config.scene = [BootScene, PreloadScene, GameScene];

new Phaser.Game(config);
