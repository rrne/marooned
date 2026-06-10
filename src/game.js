const scripts = [
  'src/systems/MapSystem.js',
  'src/systems/BuildingSystem.js',
  'src/systems/EventSystem.js',
  'src/entities/Survivor.js',
  'src/ui/HUD.js',
  'src/scenes/BootScene.js',
  'src/scenes/MenuScene.js',
  'src/scenes/GameScene.js',
  'src/scenes/WinScene.js',
  'src/scenes/GameOverScene.js',
];

function loadScripts(paths, callback) {
  let loaded = 0;
  paths.forEach((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { if (++loaded === paths.length) callback(); };
    script.onerror = (e) => console.error('Script load failed:', src, e);
    document.head.appendChild(script);
  });
}

loadScripts(scripts, () => {
  const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#0a1a2e',
    scene: [BootScene, MenuScene, GameScene, WinScene, GameOverScene],
    parent: document.body,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  new Phaser.Game(config);
});
