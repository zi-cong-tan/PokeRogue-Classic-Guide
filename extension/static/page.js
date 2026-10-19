// Runs inside the PokeRogue page (Chrome's MAIN world). Read-only: it never changes the game.
// Once a second it passes these to the HUD (content.js):
//  - window.gameInfo, which the game itself publishes: mode, biome, wave, luck and your party
//  - the enemies on the field, limited to what the battle screen shows: name, level, HP, types, boss bars
//  - which Mystery Encounter is on screen, if any
//  - the enemy's defences and exact HP, and your moves' damage from the game's own damage calculation
//  - on the reward screen, the items offered and where they sit
//  - when the ball menu is open, where each ball sits; when the fight menu is open, where each move name sits
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

  // Stacks of a held item on an enemy (0 if none). Enemy items live in their own list, apart from yours.
  function held(battle, p, kind) {
    try { return (battle.enemyModifiers || []).filter(m => m.pokemonId === p.id && m.is?.(kind)).reduce((n, m) => n + (m.stackCount || 1), 0); }
    catch { return 0; }
  }

  function enemies() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    if (!battle?.currentBattle) return [];
    try {
      const field = battle.getEnemyField().filter(p => p && !p.isFainted?.());
      return field.map(p => {
        let types;
        try { types = typeNames(p.getTypes({ includeTeraType: true })); } catch { types = typeNames(p.getTypes?.()); }
        return {
          name: p.name, species: p.species?.name, level: p.level, hp: p.hp, maxHp: p.getMaxHp?.(), types,
          boss: !!p.isBoss?.(), bars: p.bossSegments || 0, barIndex: p.bossSegmentIndex ?? 0, terastallized: !!p.isTerastallized,
          // for the damage estimate: defences and their stat changes (Stat enum: DEF 2, SPDEF 4)
          catch: catchOdds(battle, p, field.length),
          // held items that undo a KO: Focus Band (each stack 1 in 10 to hang on at 1 HP, up to 5) and Reviver Seed (back at half HP)
          band: held(battle, p, 'SurviveDamageModifier'), seed: held(battle, p, 'PokemonInstantReviveModifier'),
          def: p.getStat?.(2), spDef: p.getStat?.(4), defStage: p.getStatStage?.(2) ?? 0, spDefStage: p.getStatStage?.(4) ?? 0,
        };
      });
    } catch { return []; }
  }

  // Catch odds for each ball, by the game's own formula (phases/attempt-capture-phase.ts, data/pokeball.ts):
  // rate = round((3·maxHP − 2·HP)·catchRate·ball / (3·maxHP) · status); each of 3 shakes passes with
  // round(65536 / (255/rate)^0.1875) / 65536; a critical capture (by Pokédex size and Catching Charm) needs one shake.
  // Also the game's rules for when no ball can be thrown. Shinies catch at 2x (SHINY_CATCH_RATE_MULTIPLIER); events can
  // raise that, which the game keeps out of reach here, so during one the real odds are a little better than shown.
  const BALLS = [['Poké Ball', 1], ['Great Ball', 1.5], ['Ultra Ball', 2], ['Rogue Ball', 3], ['Master Ball', -1]];
  const STATUS_CATCH = [1, 1.5, 1.5, 1.5, 2.5, 2.5, 1.5];   // StatusEffect: none, poison, toxic, paralysis, sleep, freeze, burn
  // Optional, off by default and never in Daily runs: whether this turn's throw will land. Each turn the game re-seeds its
  // battle dice from the wave's seed and the turn number, and draws them in order. Before your throw, only the enemy's
  // move choice draws (EnemyCommandPhase -> getNextMove), so this replays that choice, then draws the capture rolls
  // (one critical-capture roll out of 256, then up to three shake rolls out of 65536), then puts every bit of state
  // back. Once per turn, while you pick a command. Quick Claw or Quick Draw can draw first, so then it's flagged unsure.
  let predict = false, rolled = null;
  addEventListener('message', e => { if (e.source === window && e.data?.__prgOverlayCmd) predict = !!e.data.predict; });
  function throwRolls(battle) {
    const b = battle.currentBattle;
    if (!predict || battle.gameMode?.isDaily) return null;
    const phase = battle.phaseManager?.getCurrentPhase?.()?.phaseName;
    if (rolled?.wave === b.waveIndex && rolled.turn === b.turn) return rolled;
    if (phase && phase !== 'CommandPhase') return null;
    const foes = battle.getEnemyField().filter(p => p && !p.isFainted?.());
    const saved = b.battleSeedState, queues = foes.map(e => e.summonData?.moveQueue?.slice());
    try {
      foes.forEach(e => e.getNextMove());
      const draws = [battle.randBattleSeedInt(256), battle.randBattleSeedInt(65536), battle.randBattleSeedInt(65536), battle.randBattleSeedInt(65536)];
      const quick = [...battle.getPlayerField(), ...foes].some(p => p && !p.isFainted?.() && (
        (p.getHeldItems?.() || []).some(m => m.type?.id === 'QUICK_CLAW') || [p.getAbility?.()?.name, p.getPassiveAbility?.()?.name].includes('Quick Draw')));
      rolled = { wave: b.waveIndex, turn: b.turn, draws, unsure: quick };
      return rolled;
    } catch { return null; } finally {
      b.battleSeedState = saved;
      foes.forEach((e, i) => { if (e.summonData && queues[i]) e.summonData.moveQueue = queues[i]; });
    }
  }

  function catchOdds(battle, p, onField) {
    try {
      const b = battle.currentBattle;
      if (b.battleType === 1) return { blocked: 'Trainer Pokémon can’t be caught.' };   // BattleType.TRAINER
      if (b.isBattleMysteryEncounter?.() && !b.mysteryEncounter?.catchAllowed) return { blocked: 'This encounter can’t be caught.' };
      if (onField > 1) return { blocked: 'Knock out the other one first: balls need a single target.' };
      const strong = p.isBoss?.() && p.bossSegmentIndex >= 1;
      const dex = battle.gameData?.getSpeciesCount?.(d => !!d.caughtAttr) || 0;
      const charm = { value: 1 };
      battle.findModifier?.(m => m.is?.('CriticalCatchChanceBoosterModifier'))?.apply(charm);
      const dexMult = battle.gameMode?.isFreshStartChallenge?.() ? 0 : battle.gameMode?.isDaily || dex > 800 ? 2.5 : dex > 600 ? 2 : dex > 400 ? 1.5 : dex > 200 ? 1 : dex > 100 ? 0.5 : 0;
      const m3 = 3 * p.getMaxHp(), h2 = 2 * p.hp, status = STATUS_CATCH[p.status?.effect || 0] || 1, shiny = p.isShiny?.() ? 2 : 1;
      const counts = battle.pokeballCounts || {};
      const r = strong ? null : throwRolls(battle);
      const lands = (rate, shake, crit) => {
        if (!r) return undefined;
        const [c, s1, s2, s3] = r.draws;
        if (rate >= 255) return true;
        return c < crit ? s1 < shake : s1 < shake && s2 < shake && s3 < shake;
      };
      return {
        strong, shiny: shiny > 1, predicted: !!r, unsure: !!r?.unsure, daily: predict && !!battle.gameMode?.isDaily,
        balls: BALLS.map(([name, mult], i) => {
          if (mult === -1) return { name, odds: 1, have: counts[i] || 0, lands: r ? true : undefined };
          if (strong) return { name, odds: null, have: counts[i] || 0 };
          const rate = Math.round(((m3 - h2) * p.species.catchRate * mult / m3) * status * shiny);
          const shakeN = Math.round(65536 / Math.pow(255 / rate, 0.1875)), critN = Math.floor((charm.value * dexMult * Math.min(255, rate)) / 6);
          const shake = shakeN / 65536, crit = critN / 256;
          return { name, odds: rate >= 255 ? 1 : Math.min(1, crit * shake + (1 - crit) * shake ** 3), have: counts[i] || 0, lands: lands(rate, shakeN, critN) };
        }),
      };
    } catch { return null; }
  }

  const WEATHER = ['', 'Sun', 'Rain', 'Sandstorm', 'Hail', 'Snow', 'Fog', 'Heavy rain', 'Harsh sun', 'Strong winds'];
  const TERRAIN = ['', 'Misty Terrain', 'Electric Terrain', 'Grassy Terrain', 'Psychic Terrain'];

  // Damage from the game itself: each move of your Pokémon on the field against each enemy, through the game's own
  // getAttackDamage in simulated mode (no random roll, nothing changes): abilities, held items, weather, terrain, Tera
  // and each move's special rules are all applied. Once normally and once as a critical hit.
  // In doubles both of yours are worked out; `active` is the one choosing a move now (the command and fight menus keep
  // its field index), remembered between menus.
  let active = 0;
  function damageCalc() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    if (!battle?.currentBattle) return null;
    try {
      const h = battle.ui?.getHandler?.();
      if (typeof h?.fieldIndex === 'number' && h.active) active = h.fieldIndex;
      const field = battle.getPlayerField?.() || [];
      const foes = battle.getEnemyField().filter(p => p && !p.isFainted?.());
      const attackers = field.map(me => !me || me.isFainted?.() ? null : {
        name: me.name,
        foes: foes.map(e => (me.getMoveset?.().filter(Boolean) || []).map(pm => {
          const mv = pm.getMove();
          if (mv.category === 2) return { name: mv.name, status: true };   // MoveCategory.STATUS
          try {
            const hit = e.getAttackDamage({ source: me, move: mv, simulated: true });
            const crit = e.getAttackDamage({ source: me, move: mv, isCritical: true, simulated: true });
            return { name: mv.name, max: hit.damage, crit: crit.damage, multi: !!mv.hasAttr?.('MultiHitAttr') };
          } catch { return { name: mv.name, error: true }; }
        })),
      });
      const me = attackers[active] || attackers.find(Boolean);
      if (!me) return null;
      return {
        attacker: me.name, foes: me.foes,
        weather: WEATHER[battle.arena?.weatherType] || '',
        terrain: TERRAIN[battle.arena?.terrainType] || '',
      };
    } catch { return null; }
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
      // The item's own point on the screen (its world position), not its bounding box, which spans more than the icon.
      let p = null;
      try { const m = o.getWorldTransformMatrix?.(); if (m) p = { x: m.tx, y: m.ty }; } catch { /* not drawn yet */ }
      return {
        id: t.id, name: t.name, tier: t.tier, cost: o.modifierTypeOption?.cost || 0, shop,
        tm: 'moveId' in t, moveType: typeof t.moveType === 'number' ? TYPES[t.moveType] : null,
        x: p ? p.x / W : null, y: p ? p.y / H : null,
      };
    };
    return {
      money: battle.money ?? 0,
      held: (battle.modifiers || []).map(m => m.type?.id).filter(Boolean),
      options: [...h.options.map(o => read(o, false)), ...h.shopOptionsRows.flat().map(o => read(o, true))],
    };
  }

  // The ball menu (BallUiHandler): each ball row's point on the canvas (0 to 1) and the menu's left edge, so the HUD
  // can put each ball's catch odds beside it. Null when the menu isn't open.
  function ballMenu() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    const h = battle?.ui?.getHandler?.();
    if (!h?.active || !h.pokeballSelectBg || !h.countsText) return null;
    const W = scenes.game?.config?.width || 1920, H = scenes.game?.config?.height || 1080;
    try {
      const left = h.pokeballSelectBg.getBounds().x / W;
      // beta draws ball icons; the live game only has the "×97" counts column, one line per ball
      if (Array.isArray(h.pokeballImages)) return { left, ys: h.pokeballImages.map(b => b.getWorldTransformMatrix().ty / H) };
      const b = h.countsText.getBounds(), n = h.countsText.text.split('\n').length;
      return { left, ys: Array.from({ length: n }, (_, i) => (b.y + (i + 0.5) * b.height / n) / H) };
    } catch { return null; }
  }

  // The fight menu (FightUiHandler): each move name's box on the canvas (0 to 1), so the HUD can put its damage beside
  // it. Null when the menu isn't open or the move info overlay is covering the names.
  function fightMenu() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    const h = battle?.ui?.getHandler?.();
    if (!h?.active || !h.movesContainer?.visible || !Array.isArray(h.movesContainer.list)) return null;
    const W = scenes.game?.config?.width || 1920, H = scenes.game?.config?.height || 1080;
    try {
      return h.movesContainer.list.slice(0, 4).map(t => {
        const b = t.getBounds();
        return { right: (b.x + b.width) / W, y: (b.y + b.height / 2) / H };
      });
    } catch { return null; }
  }

  // The starter-select screen: the starter under the cursor, the ability slot it is set to (0, 1, hidden 2; the game's
  // default is the first unlocked one) and which slots and the passive are unlocked. Null on any other screen.
  function starterPick() {
    const battle = scenes?.scenes?.find(s => typeof s.getEnemyField === 'function');
    const h = battle?.ui?.getHandler?.();
    if (!h?.active || !Array.isArray(h.starterContainers) || h.lastStarterId == null) return null;
    try {
      const sp = h.starterContainers.find(c => c.species?.speciesId === h.lastStarterId)?.species;
      if (!sp) return null;
      const data = battle.gameData?.starterData?.[h.lastStarterId] || {}, attr = data.abilityAttr || 0;
      const pref = h.starterPreferences?.[h.lastStarterId]?.abilityIndex;
      const index = pref ?? (attr & 1 ? 0 : !sp.ability2 || attr & 2 ? 1 : 2);   // getStarterDefaultAbilityIndex
      return { id: sp.speciesId, name: sp.name, index, unlocked: [!!(attr & 1), !!(attr & 2), !!(attr & 4)], passive: !!((data.passiveAttr || 0) & 1) };
    } catch { return null; }
  }
  // Cycling the ability (E) should show at once, so this one is read four times a second, sent only when it changes.
  let lastPick = '';
  setInterval(() => {
    hook();
    const pick = starterPick(), key = JSON.stringify(pick);
    if (key !== lastPick) { lastPick = key; window.postMessage({ __prgStarter: 1, pick }, location.origin); }
  }, 250);

  setInterval(() => {
    hook();
    window.postMessage({ __prgOverlay: 1, info: window.gameInfo || null, enemies: enemies(), encounter: encounter(), rewards: rewards(), balls: ballMenu(), moves: fightMenu(), calc: damageCalc() }, location.origin);
  }, 1000);
})();
