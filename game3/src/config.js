export const config = {
  type: Phaser.WEBGL,
  pixelArt: true,
  backgroundColor: "#1a1a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  }
};
