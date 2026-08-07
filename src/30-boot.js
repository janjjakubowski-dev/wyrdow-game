const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
  scene: [MainMenuScene, OpeningScene, GameScene, TravelScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
};
const game = new Phaser.Game(config);
window.game = game; // exposed for debugging/testing
window._game = game; // debug access
// Phaser's Scale.RESIZE handles resizing — no manual listener needed.
