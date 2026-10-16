// Runs inside the PokeRogue page (Chrome's MAIN world). Read-only: it never changes the game.
// Once a second it passes two things to the overlay (content.js):
//  - window.gameInfo, which the game itself publishes: mode, biome, wave, luck and your party
//  - the enemies on the field, limited to what the battle screen shows: name, level, HP, types, boss bars
(() => {
  const TYPES = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass',
    'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy']; // PokemonType enum order in the game
  let scenes = null;

  // The game is not on window, but Phaser is. Its scene manager runs every frame, so wrapping its update once hands us
  // the scene list; the wrapper removes itself on the first call.
  function hook() {
    const SM = window.Phaser?.Scenes?.SceneManager?.prototype;
    if (scenes || !SM || SM.update.__prg) return;
    const orig = SM.update;
    const once = function (...args) { scenes = this; SM.update = orig; return orig.apply(this, args); };
    once.__prg = true;
    SM.update = once;
  }

  const typeNames = list => (list || []).map(t => TYPES[t]).filter(Boolean);

  function enemies() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    if (!battle?.currentBattle) return [];
    try {
      return battle.getEnemyField().filter(p => p && !p.isFainted?.()).map(p => {
        let types;
        try { types = typeNames(p.getTypes({ includeTeraType: true })); } catch { types = typeNames(p.getTypes?.()); }
        return {
          name: p.name, species: p.species?.name, level: p.level, hp: p.hp, maxHp: p.getMaxHp?.(), types,
          boss: !!p.isBoss?.(), bars: p.bossSegments || 0, terastallized: !!p.isTerastallized,
        };
      });
    } catch { return []; }
  }

  setInterval(() => {
    hook();
    window.postMessage({ __prgOverlay: 1, info: window.gameInfo || null, enemies: enemies() }, location.origin);
  }, 1000);
})();
