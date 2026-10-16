// Runs inside the PokeRogue page (Chrome's MAIN world). Read-only: it never changes the game.
// Once a second it passes these to the HUD (content.js):
//  - window.gameInfo, which the game itself publishes: mode, biome, wave, luck and your party
//  - the enemies on the field, limited to what the battle screen shows: name, level, HP, types, boss bars
//  - which Mystery Encounter is on screen, if any
//  - the enemy's defences and exact HP, for the damage estimate
//  - on the reward screen, the items offered and where they sit
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
          boss: !!p.isBoss?.(), bars: p.bossSegments || 0, barIndex: p.bossSegmentIndex ?? 0, terastallized: !!p.isTerastallized,
          // for the damage estimate: defences and their stat changes (Stat enum: DEF 2, SPDEF 4)
          def: p.getStat?.(2), spDef: p.getStat?.(4), defStage: p.getStatStage?.(2) ?? 0, spDefStage: p.getStatStage?.(4) ?? 0,
        };
      });
    } catch { return []; }
  }

  // The Mystery Encounter on screen, as the game's MysteryEncounterType number (or null).
  function encounter() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    const t = battle?.currentBattle?.mysteryEncounterType;
    return typeof t === 'number' ? t : null;
  }

  // The reward screen: each offered item (and the shop row under it) with where it sits on the canvas (0 to 1), plus your
  // money and held items, so the HUD can rate each one for this run. Null when the screen isn't open.
  function rewards() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    const h = battle?.ui?.getHandler?.();
    if (!h?.active || !Array.isArray(h.options) || !Array.isArray(h.shopOptionsRows) || !h.options.length) return null;
    const W = scenes.game?.config?.width || 1920, H = scenes.game?.config?.height || 1080;
    const read = (o, shop) => {
      const t = o.modifierTypeOption?.type || {};
      let b = null;
      try { b = o.getBounds?.(); } catch { /* not drawn yet */ }
      return {
        id: t.id, name: t.name, tier: t.tier, cost: o.modifierTypeOption?.cost || 0, shop,
        tm: 'moveId' in t, moveType: typeof t.moveType === 'number' ? TYPES[t.moveType] : null,
        x: b ? b.centerX / W : null, y: b ? b.y / H : null,
      };
    };
    return {
      money: battle.money ?? 0,
      held: (battle.modifiers || []).map(m => m.type?.id).filter(Boolean),
      options: [...h.options.map(o => read(o, false)), ...h.shopOptionsRows.flat().map(o => read(o, true))],
    };
  }

  setInterval(() => {
    hook();
    window.postMessage({ __prgOverlay: 1, info: window.gameInfo || null, enemies: enemies(), encounter: encounter(), rewards: rewards() }, location.origin);
  }, 1000);
})();
