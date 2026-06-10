// 씬 로드 순서
const scripts = [
  'src/systems/MapSystem.js',
  'src/entities/Survivor.js',
  'src/ui/HUD.js',
  'src/scenes/BootScene.js',
  'src/scenes/MenuScene.js',
  'src/scenes/GameScene.js',
];

function loadScripts(paths, callback) {
  let loaded = 0;
  paths.forEach((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      loaded++;
      if (loaded === paths.length) callback();
    };
    document.head.appendChild(script);
  });
}

loadScripts(scripts, () => {
  const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#0a1a2e',
    scene: [BootScene, MenuScene, GameScene],
    parent: document.body,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  new Phaser.Game(config);
});
