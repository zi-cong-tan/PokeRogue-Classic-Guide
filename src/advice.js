// Suggestions built from the game data in src/data/learnsets.js: nature, moves, when to evolve, and a team check.
// They are rules of thumb, not the only good answer, and the page says so.
import { TYPES, CHART, mult, cap } from './data/types.js';

export const NATURES = [
  ['Hardy'], ['Lonely', 'Atk', 'Def'], ['Brave', 'Atk', 'Spe'], ['Adamant', 'Atk', 'SpA'], ['Naughty', 'Atk', 'SpD'],
  ['Bold', 'Def', 'Atk'], ['Docile'], ['Relaxed', 'Def', 'Spe'], ['Impish', 'Def', 'SpA'], ['Lax', 'Def', 'SpD'],
  ['Timid', 'Spe', 'Atk'], ['Hasty', 'Spe', 'Def'], ['Serious'], ['Jolly', 'Spe', 'SpA'], ['Naive', 'Spe', 'SpD'],
  ['Modest', 'SpA', 'Atk'], ['Mild', 'SpA', 'Def'], ['Quiet', 'SpA', 'Spe'], ['Bashful'], ['Rash', 'SpA', 'SpD'],
  ['Calm', 'SpD', 'Atk'], ['Gentle', 'SpD', 'Def'], ['Sassy', 'SpD', 'Spe'], ['Careful', 'SpD', 'SpA'], ['Quirky'],
];
export const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const STAT_NAME = { Atk: 'Attack', Def: 'Defense', SpA: 'Sp. Atk', SpD: 'Sp. Def', Spe: 'Speed' };

// Physical or special: whichever attack stat is clearly higher (10%); close calls count as mixed.
export function role([, atk, , spa]) {
  return atk >= spa * 1.1 ? 'P' : spa >= atk * 1.1 ? 'S' : 'M';
}

// Moves that raise its own Speed: with one, a mid-speed attacker wants the Speed nature (one boost then outruns most).
const SPEED_SETUP = new Set(['Dragon Dance', 'Shift Gear', 'Quiver Dance', 'Agility', 'Rock Polish', 'Autotomize', 'Shell Smash', 'Flame Charge', 'Trailblaze', 'Victory Dance']);

// Raise what it attacks with (or Speed if it is fast), lower the attack stat it does not use.
// moves (optional, MOVE_LIST rows of the set it runs): physical or special by its attacks, and Speed setup.
// ponytail: ignores abilities, so e.g. Trick Room or Body Press users get the usual answer.
export function suggestNature(stats, moves) {
  const [, atk, def, spa, spd, spe] = stats;
  const p = (moves || []).filter(m => m[2] === 'P').length, sp = (moves || []).filter(m => m[2] === 'S').length;
  const r = p > sp ? 'P' : sp > p ? 'S' : role(stats);
  const setup = (moves || []).find(m => SPEED_SETUP.has(m[0]))?.[0];
  const fast = spe >= 90 || spe >= Math.max(atk, spa) || (!!setup && spe >= 70);
  const wall = Math.max(atk, spa) < 65 && Math.max(def, spd) >= 90;
  let up, down, why;
  if (wall) {
    up = def >= spd ? 'Def' : 'SpD'; down = atk <= spa ? 'Atk' : 'SpA';
    why = `Its defenses (${def} / ${spd}) are its strength, so raise ${STAT_NAME[up]} and lower the attack stat it barely uses.`;
  } else {
    const main = r === 'S' ? 'SpA' : 'Atk';
    up = fast ? 'Spe' : main;
    down = r === 'M' ? (def <= spd ? 'Def' : 'SpD') : r === 'P' ? 'SpA' : 'Atk';
    why = (p !== sp && moves ? `Its attacks are mostly ${r === 'P' ? 'physical' : 'special'}, so lower the attack stat it does not use.`
      : r === 'M' ? `Attack and Sp. Atk are close (${atk} / ${spa}), so keep both and lower ${STAT_NAME[down]}.`
      : `${r === 'P' ? 'Attack' : 'Sp. Atk'} (${r === 'P' ? atk : spa}) is well above ${r === 'P' ? 'Sp. Atk' : 'Attack'} (${r === 'P' ? spa : atk}), so lower the one it does not use.`)
      + (fast && setup && spe < 90 ? ` With ${setup}, raise Speed: after one boost it outruns most foes.`
        : fast ? ` It is fast (Speed ${spe}), so raise Speed to move first.` : ` It is not fast (Speed ${spe}), so raise ${STAT_NAME[up]} for power.`);
  }
  return { nature: NATURES.find(n => n[1] === up && n[2] === down)[0], why };
}

// Forms that come before `form` in this line, nearest first.
function ancestors(line, form, F) {
  const out = [];
  for (let cur = form, parent; (parent = line.find(f => F[f][6].some(([t]) => t === cur))); cur = parent) out.push(parent);
  return out;
}

// Every move a form can use mid-run, with where it comes from. Pre-evolutions' level-up moves count:
// learned before evolving, they are kept. Egg moves only if unlocked. Map of move index -> source label.
export function learnable(line, form, eggKeys, L) {
  const { FORMS: F, MOVE_KEYS } = L;
  const src = new Map();
  const addLevels = (f, prefix) => {
    const lv = F[f][4];
    for (let k = 0; k < lv.length; k += 2) {
      const [lvl, m] = [lv[k], lv[k + 1]];
      if (src.has(m)) continue;
      const when = lvl === 0 ? 'on evolving' : lvl === -1 ? 'Memory Mushroom only' : `level ${lvl}`;
      src.set(m, { kind: 'level', lvl, label: prefix ? `As ${F[f][0]}, ${when}` : when[0].toUpperCase() + when.slice(1) });
    }
  };
  addLevels(form, false);
  ancestors(line, form, F).forEach(f => addLevels(f, true));
  for (const k of eggKeys) {
    const m = MOVE_KEYS.indexOf(k);
    if (m > -1 && !src.has(m)) src.set(m, { kind: 'egg', label: 'Egg move' });
  }
  for (const m of F[form][5]) {
    if (src.has(m)) continue;
    const tier = { C: 'common', G: 'great', U: 'ultra' }[L.MOVE_LIST[m][6]];
    src.set(m, { kind: 'tm', label: tier ? `TM, ${tier} tier` : 'TM' });
  }
  return src;
}

const SETUP = { SWORDS_DANCE: 'P', DRAGON_DANCE: 'P', BULK_UP: 'P', SHIFT_GEAR: 'P', COIL: 'P', VICTORY_DANCE: 'P', NO_RETREAT: 'M',
  NASTY_PLOT: 'S', CALM_MIND: 'S', QUIVER_DANCE: 'S', TAIL_GLOW: 'S', TAKE_HEART: 'S', SHELL_SMASH: 'M', CLANGOROUS_SOUL: 'M', TIDY_UP: 'P' };

const hits = types => new Set(types.flatMap(t => CHART[t][0]));

// Status moves worth a slot when there is room, best first: recovery, setup-adjacent support, status that wins fights.
const GOOD_STATUS = ['RECOVER', 'ROOST', 'SLACK_OFF', 'SOFT_BOILED', 'MILK_DRINK', 'SYNTHESIS', 'MOONLIGHT', 'MORNING_SUN', 'SHORE_UP',
  'SPORE', 'SLEEP_POWDER', 'YAWN', 'WILL_O_WISP', 'THUNDER_WAVE', 'TOXIC', 'GLARE', 'STUN_SPORE', 'LEECH_SEED', 'PROTECT', 'DETECT',
  'SUBSTITUTE', 'ENCORE', 'TAUNT', 'REST', 'WISH', 'HAZE', 'MEMENTO', 'SAFEGUARD', 'REFLECT', 'LIGHT_SCREEN', 'AGILITY', 'CURSE'];

// Two moves of its own types, then the moves that hit the most new types for double, with a stat-boosting move
// in the last slot when one fits and a fourth attack would add little. Level-up and egg moves are preferred over
// TMs, which only show up at random in shops. allow (optional): only consider the moves it passes, e.g. what a
// Pokémon mid-run actually has or will still learn.
export function suggestMoves(line, form, eggKeys, L, allow) {
  const { FORMS: F, MOVE_LIST, MOVE_KEYS } = L;
  const [, , types, stats] = F[form];
  const own = types.split(' ');
  const r = role(stats);
  const src = learnable(line, form, eggKeys, L);
  if (allow) for (const [m, s] of src) if (!allow(m, s)) src.delete(m);
  const job = m => MOVE_LIST[m][7] || '';
  const notTm = m => src.get(m).kind !== 'tm';
  const score = m => {
    const [, t, cat, power, acc, risky] = MOVE_LIST[m];
    if (cat === 'X' || !power || risky || AWKWARD.has(MOVE_KEYS[m])) return 0;
    const fit = r === 'M' || cat === r ? 1 : 0.55;
    return power * (acc < 0 ? 1 : acc / 100) * (own.includes(t) ? 1.5 : 1) * fit * (notTm(m) ? 1 : 0.9);
  };
  const all = [...src.keys()];
  const attacks = all.filter(m => score(m) > 0).sort((a, b) => score(b) - score(a));
  const pick = [], why = new Map();
  const add = (m, reason) => { if (m !== undefined && !pick.includes(m) && pick.length < 4) { pick.push(m); if (reason) why.set(m, reason); } };

  // 1. The best attack of each of its own types (STAB).
  for (const t of own) add(attacks.find(m => MOVE_LIST[m][1] === t), `Its own type (${cap(t)}), so 1.5× power.`);

  // 2. Up to two jobs besides damage, most useful first. A money move it learns by level or egg always makes it:
  // more money means more shop items over the whole run (Pay Day on Meowth, Make It Rain on Gholdengo).
  const [hp, atk, def, spa, spd] = stats;
  const bulky = (hp + def + spd) / 3 >= 85;
  const weak = Math.max(atk, spa) < 85;
  const jobs = [];
  const money = all.filter(m => job(m) === 'money').sort((a, b) => score(b) - score(a))[0];
  if (money !== undefined && (notTm(money) || score(money) >= score(pick[0] ?? money))) jobs.push([money, JOB_WHY.money]);
  const setups = all.filter(m => job(m).startsWith('setup:') && (r === 'M' || ['M', r].includes(job(m)[6])))
    .sort((a, b) => +job(b).split(':')[2] - +job(a).split(':')[2] || notTm(b) - notTm(a));
  if (setups.length && !weak) jobs.push([setups[0], setupWhy(job(setups[0]))]);
  const heal = all.filter(m => job(m) === 'heal' && !MOVE_LIST[m][5] && !NOT_SELF_HEAL.has(MOVE_KEYS[m]))[0];
  if (heal !== undefined && (bulky || setups.length)) jobs.push([heal, JOB_WHY.heal]);
  if (weak) {
    // A weak attacker earns its slot as the team's catcher: sleep (2.5× catch odds), False Swipe (stops at 1 HP), paralysis.
    for (const k of ['sleep', 'swipe', 'para']) {
      const m = all.filter(x => job(x) === k).sort((a, b) => (MOVE_LIST[b][4] < 0 ? 101 : MOVE_LIST[b][4]) - (MOVE_LIST[a][4] < 0 ? 101 : MOVE_LIST[a][4]))[0];
      if (m !== undefined) jobs.push([m, JOB_WHY[k]]);
    }
  }
  const knock = all.find(m => MOVE_KEYS[m] === 'KNOCK_OFF');
  if (knock !== undefined) jobs.push([knock, JOB_WHY.knock]);
  let used = 0;
  for (const [m, reason] of jobs) {
    if (used >= 2 || pick.length >= 4) break;
    if (pick.includes(m)) { why.set(m, `${why.get(m)} ${reason}`); continue; }
    add(m, reason); used++;
  }

  // 3. Fill up with attacks that hit the most other types hard.
  const typesOf = list => list.filter(m => MOVE_LIST[m][2] !== 'X').map(m => MOVE_LIST[m][1]);
  const gain = m => [...hits([MOVE_LIST[m][1]])].filter(t => !hits(typesOf(pick)).has(t)).length;
  while (pick.length < 4) {
    const rest = attacks.filter(m => !pick.includes(m) && !typesOf(pick).includes(MOVE_LIST[m][1]));
    if (!rest.length) break;
    const best = rest.reduce((a, b) => (gain(b) > gain(a) || (gain(b) === gain(a) && score(b) > score(a)) ? b : a));
    const newTypes = [...hits([MOVE_LIST[best][1]])].filter(t => !hits(typesOf(pick)).has(t));
    add(best, newTypes.length ? `Coverage: hits ${newTypes.map(cap).join(', ')} for double.` : 'Another strong attack.');
  }
  for (const m of attacks) add(m, 'Another strong attack.');
  // Short movepools (Wobbuffet, Pyukumuku, Magikarp...): fill with attacks whose power varies, then useful status
  // moves, then the risky attacks, then anything left, so every slot it can fill gets a suggestion.
  const fillers = [
    all.filter(m => MOVE_LIST[m][2] !== 'X' && !MOVE_LIST[m][3] && !MOVE_LIST[m][5]),
    GOOD_STATUS.map(k => MOVE_KEYS.indexOf(k)).filter(m => src.has(m)),
    all.filter(m => MOVE_LIST[m][2] !== 'X' && MOVE_LIST[m][5]),
    all,
  ];
  for (const list of fillers) for (const m of list) add(m, '');
  return pick.map(m => ({ m, ...src.get(m), why: why.get(m) || '' }));
}

// Why a move that isn't about damage earns a slot. From what each move does in the game's move.ts.
const JOB_WHY = {
  money: 'Money: every use scatters coins worth 20% of the wave\'s prize money, so more to spend in the shop all run.',
  heal: 'Heals half its HP, so it lasts through long boss fights.',
  sleep: 'Sleep: the best status for catching (2.5× catch odds), and the target loses turns.',
  swipe: 'Never knocks out: leaves the target at 1 HP, the safest way to weaken one you want to catch.',
  para: 'Paralysis: 1.5× catch odds, and the target is slowed and sometimes can\'t move.',
  knock: 'Knocks off the target\'s held item, and hits harder while it still has one.',
};
const setupWhy = j => {
  const [, kind, n] = j.split(':');
  const stat = { P: 'Attack', S: 'Sp. Atk', M: 'Attack and Sp. Atk' }[kind];
  return n === '6' ? `Setup: maxes ${stat} in one turn (costs HP). Use it on a turn the foe can't hurt it much.`
    : `Setup: raises ${stat}${+n >= 2 ? ' sharply' : ''}. One boost early in a boss fight pays off every turn after.`;
};
// Attacks that look strong on paper but are poor picks in a run: delayed, need setup, or only work asleep.
export const AWKWARD = new Set(['FUTURE_SIGHT', 'DOOM_DESIRE', 'LAST_RESORT', 'FOCUS_PUNCH', 'DREAM_EATER', 'BELCH', 'SNORE', 'SLEEP_TALK']);
// Heal moves that don't reliably heal the user itself.
export const NOT_SELF_HEAL = new Set(['REST', 'WISH', 'REVIVAL_BLESSING', 'PURIFY', 'FLORAL_HEALING', 'SWALLOW', 'HEALING_WISH', 'LUNAR_DANCE', 'LIFE_DEW', 'JUNGLE_HEALING', 'LUNAR_BLESSING']);

// For each way this form evolves: how, and the good level-up moves it would lose for good by evolving
// (the next form can't learn them by level or TM). Only moves you can reach first are listed.
export function evolveAdvice(form, L) {
  const { FORMS: F, MOVE_LIST } = L;
  const lv = F[form][4];
  return F[form][6].map(([to, how]) => {
    const target = F[to];
    const evoLevel = +(how.match(/^level (\d+)/) || [0, 0])[1];
    const theirs = new Set([...target[5], ...target[4].filter((_, k) => k % 2)]);
    const keep = [];
    for (let k = 0; k < lv.length; k += 2) {
      const [lvl, m] = [lv[k], lv[k + 1]];
      const [, , cat, power, , risky] = MOVE_LIST[m];
      const good = cat === 'X' ? SETUP[L.MOVE_KEYS[m]] : power >= 60 && !risky;
      if (lvl > 0 && good && !theirs.has(m) && !keep.some(x => x.m === m)) keep.push({ m, lvl, late: lvl > evoLevel });
    }
    return { to, name: target ? target[0] : to, how, keep };
  }).filter(e => F[e.to]);
}

// What hits the team hard, what the team's moves can't hit hard, and who to swap out.
// members: [{ name, types: ['fire'], moves: [type of each damaging move] }]
export function teamReport(members) {
  if (!members.length) return { threats: [], gaps: [], swap: null, rows: [] };
  const rows = TYPES.map(a => {
    const m = members.map(p => mult(a, p.types));
    return { type: a, weak: m.filter(x => x > 1).length, resist: m.filter(x => x < 1).length };
  });
  const threats = rows.filter(r => r.weak >= Math.max(2, Math.ceil(members.length / 2)) && !r.resist).map(r => r.type);
  const attackTypes = members.flatMap(p => (p.moves.length ? p.moves : p.types));
  const covered = hits(attackTypes);
  const gaps = TYPES.filter(t => !covered.has(t));
  let swap = null;
  if (members.length > 1 && (threats.length || gaps.length)) {
    const weakTo = p => threats.filter(t => mult(t, p.types) > 1);
    const out = members.reduce((a, b) => (weakTo(b).length > weakTo(a).length ? b : a));
    const fits = TYPES.map(t => ({
      t, s: threats.filter(a => mult(a, [t]) < 1).length * 2 + gaps.filter(g => CHART[t][0].includes(g)).length - threats.filter(a => mult(a, [t]) > 1).length * 2,
    })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.t);
    if (weakTo(out).length && fits.length) swap = { name: out.name, weakTo: weakTo(out), types: fits };
  }
  return { threats, gaps, swap, rows };
}

// Your team against a boss team, Pokémon by Pokémon: your best hit on it and who it threatens with its own types.
// members: as for teamReport. enemy: [{ name, types }]. A 2x+ hit is "covered"; 1x or less leaves it as a problem.
export function bossPrep(members, enemy) {
  return enemy.map(e => {
    let best = { mult: 0, who: null, type: null };
    for (const p of members) {
      for (const t of p.moves.length ? p.moves : p.types) {
        const m = mult(t, e.types);
        if (m > best.mult) best = { mult: m, who: p.name, type: t };
      }
    }
    const threatened = members.filter(p => e.types.some(t => mult(t, p.types) > 1)).map(p => p.name);
    return { ...e, best, threatened };
  });
}

// Fusion as the game does it (calculateBaseStats and getTypes in src/field/pokemon.ts): each base stat is the
// average of the two, rounded up; the types are the first Pokémon's first type plus the partner's second type,
// or the partner's first type when it has no different second one.
export function fuse(a, b) {
  const [a1] = a.types;
  const [b1, b2] = b.types;
  // When the partner adds nothing new, the first Pokémon keeps its own second type (getTypes in pokemon.ts).
  const second = b2 && b2 !== a1 ? b2 : b1 !== a1 ? b1 : a.types[1];
  return { types: [a1, second].filter(Boolean), stats: a.stats.map((s, i) => Math.ceil((s + b.stats[i]) / 2)) };
}

// Luck, as the game counts it (getPartyLuckValue in src/modifier/modifier-type.ts): each shiny party member adds
// 1, 2 or 3 for a standard, rare or epic shiny (a shiny fusion partner adds its own too), capped at 14.
export const LUCK_GRADES = ['D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'A++', 'S', 'S+', 'SS', 'SS+', 'SSS'];
export const partyLuck = tiers => Math.min(14, tiers.reduce((s, t) => s + t, 0));

// Each reward item: a tier rolled out of 1024, then while randInt(floor(128 / ((luck + 4) / 4))) < 4 it moves up a tier.
const ITEM_BASE = [768, 195, 48, 12, 1]; // Common, Great, Ultra, Rogue, Master, out of 1024
export function itemOdds(luck) {
  const odds = Math.floor(128 / ((luck + 4) / 4));
  const p = 4 / odds;
  const out = [0, 0, 0, 0, 0];
  ITEM_BASE.forEach((w, b) => {
    if (b === 4) { out[4] += w / 1024; return; } // a Master roll never upgrades
    for (let t = b; t < 4; t++) out[t] += (w / 1024) * (1 - p) * p ** (t - b);
    out[4] += (w / 1024) * p ** (4 - b);
  });
  return { upgradeOneIn: odds / 4, tiers: out };
}

// A boss wave's rarity: randInt(64 - luck / 2); 0 is ultra rare, 1 to 5 super rare, 6 to 19 rare (src/field/arena.ts).
export function bossOdds(luck) {
  const m = 64 - luck * 0.5;
  return { usual: (m - 20) / m, rare: 14 / m, superRare: 5 / m, ultraRare: 1 / m };
}

// Wild shiny chance: 64 / 65536 (1 in 1024), doubled 1 + n times by n Shiny Charms (up to 4).
export const shinyOneIn = charms => 1024 / (charms ? 2 ** (1 + charms) : 1);

// Popular tactics and which starters can run them. A starter qualifies when some form in its line can learn (level-up,
// TM or egg move) one move from every group; ranked by that form's base stat total, cheapest first on ties.
export const TACTICS = [
  { key: 'seed', name: 'Leech Seed stall', how: 'Seed the foe, then Protect or Substitute while the seed and Leftovers heal you.',
    needs: [['LEECH_SEED'], ['PROTECT', 'DETECT', 'SUBSTITUTE']], items: 'Leftovers, Shell Bell' },
  { key: 'toxic', name: 'Toxic stall', how: 'Badly poison the foe and outlast it with protection and recovery.',
    needs: [['TOXIC'], ['PROTECT', 'DETECT', 'SUBSTITUTE'], ['RECOVER', 'ROOST', 'SLACK_OFF', 'SOFT_BOILED', 'MOONLIGHT', 'SYNTHESIS', 'MORNING_SUN', 'WISH', 'SHORE_UP', 'MILK_DRINK']], items: 'Leftovers' },
  { key: 'phys', name: 'Physical setup sweep', how: 'Boost Attack (and Speed) once or twice, then sweep with strong same-type attacks.',
    needs: [['DRAGON_DANCE', 'SWORDS_DANCE', 'SHELL_SMASH', 'BULK_UP', 'VICTORY_DANCE', 'SHIFT_GEAR', 'COIL', 'NO_RETREAT']], items: 'White Herb (with Shell Smash), Focus Band, Reviver Seed', stat: 1 },
  { key: 'spec', name: 'Special setup sweep', how: 'Boost Sp. Atk, then sweep.',
    needs: [['NASTY_PLOT', 'QUIVER_DANCE', 'CALM_MIND', 'TAIL_GLOW', 'TAKE_HEART', 'GEOMANCY']], items: 'Soul Dew (with a Sp. Atk nature), Leftovers', stat: 3 },
  { key: 'sleep', name: 'Sleep, then hit', how: 'Put the foe to sleep and attack freely; strong against single bosses.',
    needs: [['SPORE', 'SLEEP_POWDER', 'HYPNOSIS', 'LOVELY_KISS', 'SING', 'YAWN', 'DARK_VOID']], items: 'Quick Claw, Wide Lens (for inaccurate sleep moves)' },
  { key: 'drum', name: 'Belly Drum', how: 'Max Attack in one turn at half HP, ideally with a priority move.',
    needs: [['BELLY_DRUM']], items: 'Sitrus Berry, Leftovers', stat: 1 },
  { key: 'baton', name: 'Baton Pass chain', how: 'Set up boosts on one Pokémon, then pass them to a sweeper.',
    needs: [['BATON_PASS'], ['SWORDS_DANCE', 'NASTY_PLOT', 'CALM_MIND', 'DRAGON_DANCE', 'QUIVER_DANCE', 'BULK_UP', 'IRON_DEFENSE', 'AMNESIA', 'AGILITY', 'SHELL_SMASH']], items: 'Baton (the item lets boosts pass on any switch)' },
];

// Truant and Slow Start make a set-up sweep impractical, whatever the stats say.
const POOR_SWEEPERS = new Set(['Slaking', 'Regigigas', 'Slakoth', 'Vigoroth']);

export function tacticStarters(tactic, L, eggs) {
  const { FORMS: F, LINES, MOVE_KEYS } = L;
  const out = [];
  LINES.forEach((line, i) => {
    let best = null;
    for (const form of line) {
      const can = learnable(line, form, eggs[i] || [], L);
      const keys = new Set([...can.keys()].map(m => MOVE_KEYS[m]));
      if (!tactic.needs.every(group => group.some(k => keys.has(k)))) continue;
      if (tactic.stat && POOR_SWEEPERS.has(F[form][0])) continue;
      const stats = F[form][3];
      const score = tactic.stat ? stats[tactic.stat] * 2 + stats.reduce((a, b) => a + b) : stats.reduce((a, b) => a + b);
      if (!best || score > best.score) best = { i, form, score, total: stats.reduce((a, b) => a + b) };
    }
    if (best) out.push(best);
  });
  return out.sort((a, b) => b.score - a.score);
}

// Which two of your party to fuse with DNA Splicers: every ordered pair, scored on the fused stat total, the
// weaknesses it removes compared with the first Pokémon alone, and the new type it brings.
export function fusionPicks(members) {
  const weak = types => TYPES.filter(a => mult(a, types) > 1).length;
  const picks = [];
  for (const a of members) for (const b of members) {
    if (a === b) continue;
    const f = fuse(a, b);
    const total = f.stats.reduce((x, y) => x + y);
    const fewerWeak = weak(a.types) - weak(f.types);
    const newType = f.types.some(t => !a.types.includes(t));
    picks.push({ a: a.name, b: b.name, types: f.types, stats: f.stats, total, fewerWeak, newType, score: total + fewerWeak * 25 + (newType ? 10 : 0) });
  }
  return picks.sort((x, y) => y.score - x.score);
}

// Building around a starter: rank the starters you can still afford by how well they patch the team's holes.
// Covering a shared weakness counts most, then hitting a type nobody can hit for double, then not doubling up on types.
// Stronger (costlier) starters break ties, so the points get spent. candidates: [{ i, name, types, cost }].
// ponytail: uses each starter's first-stage types; evolutions that change type (Charmander -> Charizard) are judged as the first stage.
export function teammates(team, candidates) {
  const { rows, gaps } = teamReport(team);
  const holes = rows.filter(r => r.weak > r.resist);
  const have = new Set(team.flatMap(p => p.types));
  return candidates.map(c => {
    const covers = holes.filter(r => mult(r.type, c.types) < 1).map(r => r.type);
    const adds = holes.filter(r => mult(r.type, c.types) > 1).map(r => r.type);
    const hitsGaps = gaps.filter(g => c.types.some(t => CHART[t][0].includes(g)));
    const score = holes.reduce((s, r) => s + (covers.includes(r.type) ? 2 : adds.includes(r.type) ? -2 : 0) * (r.weak - r.resist), 0)
      + hitsGaps.length - c.types.filter(t => have.has(t)).length * 2 + c.cost * 0.5;
    return { ...c, score, covers, hitsGaps };
  }).sort((a, b) => b.score - a.score);
}

// Which ability to pick. A rule-of-thumb rank of abilities that matter in a run (higher is better, negative is a
// drawback), each with the reason shown in the build sheet. Abilities not listed count as 0.
// ponytail: general community consensus, not run-specific; context like weather teams or Technician movepools is not checked.
const ABILITY_RANK = {
  HUGE_POWER: [5, 'Doubles its Attack, the strongest ability in the game for a physical attacker.'],
  PURE_POWER: [5, 'Doubles its Attack, the strongest ability in the game for a physical attacker.'],
  SPEED_BOOST: [5, 'Gets faster every turn, so it soon moves first against everything.'],
  PARENTAL_BOND: [5, 'Every attack hits twice.'],
  WONDER_GUARD: [4, 'Only super effective hits can touch it. Watch out for status and weather.'],
  PROTEAN: [4, 'Turns into the type of the move it uses, so every attack gets the 1.5× own-type boost.'],
  LIBERO: [4, 'Turns into the type of the move it uses, so every attack gets the 1.5× own-type boost.'],
  MAGIC_GUARD: [4, 'Only attacks hurt it: no poison, burn, weather or recoil damage.'],
  MULTISCALE: [4, 'Takes half damage at full HP, so it survives the hit it needs to set up.'],
  SHADOW_SHIELD: [4, 'Takes half damage at full HP, so it survives the hit it needs to set up.'],
  ADAPTABILITY: [4, 'Its own-type attacks get 2× instead of 1.5×.'],
  BEAST_BOOST: [4, 'Each knockout raises its best stat.'],
  MOXIE: [4, 'Each knockout raises its Attack: it snowballs through trainer teams.'],
  REGENERATOR: [3, 'Heals a third of its HP every time it switches out.'],
  INTIMIDATE: [3, 'Lowers the foe\'s Attack when it comes in.'],
  UNAWARE: [4, 'Ignores the foe\'s stat boosts, so set-up bosses don\'t snowball.'],
  TOUGH_CLAWS: [3, 'Contact moves do 30% more.'],
  SHEER_FORCE: [3, 'Moves with side effects do 30% more.'],
  TECHNICIAN: [3, 'Moves of 60 power or less do 50% more.'],
  SKILL_LINK: [3, 'Multi-hit moves always hit 5 times.'],
  SERENE_GRACE: [3, 'Doubles the chance of moves\' side effects.'],
  GUTS: [3, 'Attack 1.5× while it has a status.'],
  GORILLA_TACTICS: [3, 'Attack 1.5×, but locked into one move.'],
  AERILATE: [3, 'Normal moves become Flying and do 20% more.'],
  PIXILATE: [3, 'Normal moves become Fairy and do 20% more.'],
  REFRIGERATE: [3, 'Normal moves become Ice and do 20% more.'],
  GALVANIZE: [3, 'Normal moves become Electric and do 20% more.'],
  STRONG_JAW: [3, 'Biting moves do 50% more.'],
  IRON_FIST: [2, 'Punching moves do 20% more.'],
  MEGA_LAUNCHER: [3, 'Pulse and aura moves do 50% more.'],
  SHARPNESS: [3, 'Slicing moves do 50% more.'],
  DROUGHT: [3, 'Sets sun: Fire moves 1.5×, Water moves halved.'],
  DRIZZLE: [3, 'Sets rain: Water moves 1.5×, Fire moves halved.'],
  SAND_STREAM: [2, 'Sets a sandstorm.'],
  SNOW_WARNING: [2, 'Sets snow.'],
  PROTOSYNTHESIS: [2, 'Its best stat rises in sun.'],
  QUARK_DRIVE: [2, 'Its best stat rises on Electric Terrain.'],
  DOWNLOAD: [2, 'Raises Attack or Sp. Atk on entry.'],
  PRANKSTER: [2, 'Status moves go first.'],
  POISON_HEAL: [3, 'Heals every turn while poisoned (pair with a Toxic Orb).'],
  THICK_FAT: [3, 'Takes half from Fire and Ice.'],
  LEVITATE: [3, 'Immune to Ground moves.'],
  STURDY: [2, 'Survives any one hit from full HP.'],
  FUR_COAT: [3, 'Takes half from physical hits.'],
  ICE_SCALES: [3, 'Takes half from special hits.'],
  FLUFFY: [2, 'Takes half from contact moves, but double from Fire.'],
  FILTER: [2, 'Super effective hits do 25% less.'],
  SOLID_ROCK: [2, 'Super effective hits do 25% less.'],
  PRISM_ARMOR: [2, 'Super effective hits do 25% less.'],
  COMPOUND_EYES: [2, 'Moves are 30% more accurate (great with sleep moves).'],
  NO_GUARD: [2, 'Every move hits.'],
  MOLD_BREAKER: [2, 'Ignores abilities like Sturdy and Levitate.'],
  INTREPID_SWORD: [3, 'Attack +1 when it comes in.'],
  DAUNTLESS_SHIELD: [3, 'Defense +1 when it comes in.'],
  GOOD_AS_GOLD: [2, 'Immune to status moves.'],
  PURIFYING_SALT: [3, 'Can\'t get a status, and takes half from Ghost.'],
  WELL_BAKED_BODY: [2, 'Immune to Fire.'],
  EARTH_EATER: [2, 'Immune to Ground.'],
  SUPREME_OVERLORD: [2, 'Stronger for each fainted teammate.'],
  ORICHALCUM_PULSE: [3, 'Sets sun and boosts its Attack in it.'],
  HADRON_ENGINE: [3, 'Sets Electric Terrain and boosts its Sp. Atk on it.'],
  CONTRARY: [2, 'Stat drops become boosts (great with Leaf Storm or Overheat).'],
  PICKUP: [1, 'Can pick up an item after battle.'],
  FLASH_FIRE: [2, 'Immune to Fire, and its own Fire moves get stronger after it absorbs one.'],
  HEATPROOF: [1, 'Takes half from Fire.'],
  WATER_BUBBLE: [3, 'Takes half from Fire, its Water moves do double, and it can\'t be burned.'],
  TRUANT: [-4, 'Only acts every other turn.'],
  SLOW_START: [-3, 'Half Attack and Speed for its first five turns in.'],
  DEFEATIST: [-2, 'Attack and Sp. Atk halve below half HP.'],
  STALL: [-1, 'Always moves last.'],
  KLUTZ: [-1, 'Can\'t use held items.'],
};
// The rest of the abilities starters have, rank only: the build sheet shows the game's own description as the reason.
// 0 = barely matters in a run (flavour, double battles only, or needs a teammate).
const MORE_RANK = {
  TINTED_LENS: 3, SIMPLE: 3, MAGIC_BOUNCE: 3, NEUROFORCE: 3, DRAGONS_MAW: 3, STEELWORKER: 3, ROCKY_PAYLOAD: 3, TRANSISTOR: 3,
  FIRE_MANE: 3, SWORD_OF_RUIN: 3, BEADS_OF_RUIN: 3, TABLETS_OF_RUIN: 3, VESSEL_OF_RUIN: 3, BATTLE_BOND: 3, DELTA_STREAM: 3,
  PRIMORDIAL_SEA: 3, GALE_WINGS: 2, DISGUISE: 3, ICE_FACE: 2, SCHOOLING: 3, STANCE_CHANGE: 3, ZERO_TO_HERO: 3, TERA_SHIFT: 3,
  DRAGONIZE: 3, HUSTLE: 1, SOLAR_POWER: 1, SNIPER: 1, SUPER_LUCK: 1, ANALYTIC: 2, RECKLESS: 2, ROCK_HEAD: 2, SAND_FORCE: 1,
  PUNK_ROCK: 2, STAKEOUT: 1, TOXIC_BOOST: 2, FLARE_BOOST: 2, QUICK_FEET: 2, MARVEL_SCALE: 2, UNBURDEN: 2, DEFIANT: 2,
  COMPETITIVE: 2, BERSERK: 1, ANGER_SHELL: 2, STAMINA: 2, WEAK_ARMOR: 0, JUSTIFIED: 1, SAP_SIPPER: 2, MOTOR_DRIVE: 2,
  VOLT_ABSORB: 2, WATER_ABSORB: 2, STORM_DRAIN: 2, LIGHTNING_ROD: 2, DRY_SKIN: 1, THERMAL_EXCHANGE: 1, STEAM_ENGINE: 1,
  WATER_COMPACTION: 1, ICE_BODY: 1, RAIN_DISH: 1, CHLOROPHYLL: 1, SWIFT_SWIM: 1, SAND_RUSH: 1, SLUSH_RUSH: 1, SURGE_SURFER: 1,
  SOUL_HEART: 2, CHILLING_NEIGH: 3, GRIM_NEIGH: 3, ELECTRIC_SURGE: 2, PSYCHIC_SURGE: 2, GRASSY_SURGE: 2, MISTY_SURGE: 1,
  TERAVOLT: 2, TURBOBLAZE: 2, STALWART: 0, PROPELLER_TAIL: 0, MERCILESS: 1, CORROSION: 1, POISON_PUPPETEER: 1, TOXIC_CHAIN: 2,
  TOXIC_DEBRIS: 1, SPICY_SPRAY: 2, IRON_BARBS: 1, ROUGH_SKIN: 1, FLAME_BODY: 1, STATIC: 1, POISON_POINT: 1, EFFECT_SPORE: 1,
  CURSED_BODY: 1, POISON_TOUCH: 1, MAGICIAN: 2, PICKPOCKET: 1, HONEY_GATHER: 1, BALL_FETCH: 1, HARVEST: 1, CHEEK_POUCH: 1,
  CUD_CHEW: 1, RIPEN: 1, GLUTTONY: 0, NATURAL_CURE: 1, SHED_SKIN: 1, HYDRATION: 0, LEAF_GUARD: 0, TRIAGE: 2, CLEAR_BODY: 1,
  FULL_METAL_BODY: 1, WHITE_SMOKE: 1, MIRROR_ARMOR: 1, HYPER_CUTTER: 0, BIG_PECKS: 0, KEEN_EYE: 0, MINDS_EYE: 1, SCRAPPY: 1,
  INFILTRATOR: 1, UNSEEN_FIST: 1, LONG_REACH: 1, BULLETPROOF: 1, SOUNDPROOF: 1, OVERCOAT: 1, INSOMNIA: 1, VITAL_SPIRIT: 1,
  SWEET_VEIL: 1, IMMUNITY: 1, LIMBER: 1, WATER_VEIL: 1, MAGMA_ARMOR: 0, PASTEL_VEIL: 1, SHIELDS_DOWN: 1, COMATOSE: 2,
  BATTLE_ARMOR: 1, SHELL_ARMOR: 1, SHIELD_DUST: 1, WONDER_SKIN: 1, QUEENLY_MAJESTY: 1, DAZZLING: 1, ARMOR_TAIL: 1,
  QUICK_DRAW: 2, GUARD_DOG: 2, INNER_FOCUS: 1, OWN_TEMPO: 0, OBLIVIOUS: 0, MOODY: 2, OPPORTUNIST: 1, LIQUID_VOICE: 1,
  NORMALIZE: 0, WIND_RIDER: 1, WIND_POWER: 1, ELECTROMORPHOSIS: 1, ILLUSION: 1, IMPOSTER: 2, TRACE: 1, PRESSURE: 0,
  UNNERVE: 0, MYCELIUM_MIGHT: 0, EARTH_EATER: 2, SEED_SOWER: 1, SAND_SPIT: 0, COTTON_DOWN: 0, GOOEY: 1, TANGLING_HAIR: 1,
  AURA_GUARD: 2, GRASS_PELT: 1, FLOWER_GIFT: 1, STEELY_SPIRIT: 2, ARENA_TRAP: 0, SHADOW_TAG: 0, MAGNET_PULL: 0,
  RIVALRY: 0, STENCH: 0, AFTERMATH: 0, INNARDS_OUT: 1, BAD_DREAMS: 1, LIQUID_OOZE: 0, MUMMY: 0, LINGERING_AROMA: 0,
  WANDERING_SPIRIT: 0, PERISH_BODY: -1, NEUTRALIZING_GAS: 0, CURIOUS_MEDICINE: 0, SCREEN_CLEANER: 0, TERAFORM_ZERO: 1,
  FAIRY_AURA: 2, DARK_AURA: 2, AURA_BREAK: 0, AIR_LOCK: 0, CLOUD_NINE: 0, EMERGENCY_EXIT: -1, WIMP_OUT: -1, RATTLED: 0,
  ANGER_POINT: 1, STEADFAST: 0, TANGLED_FEET: 0, SAND_VEIL: 0, SNOW_CLOAK: 0, SNOW_WARNING: 2, BLAZE: 1, TORRENT: 1, OVERGROW: 1,
  SWARM: 1, GULP_MISSILE: 1, ZEN_MODE: 1, HUNGER_SWITCH: 0, FORECAST: 1, MIMICRY: 0, COLOR_CHANGE: 0, MULTITYPE: 1,
  RKS_SYSTEM: 1, POWER_OF_ALCHEMY: 0, RECEIVER: 0, COMMANDER: 0, COSTAR: 0, DANCER: 1, HOSPITALITY: 0, HEALER: 0, BATTERY: 0,
  POWER_SPOT: 0, FRIEND_GUARD: 0, PLUS: 0, MINUS: 0, SYMBIOSIS: 0, TELEPATHY: 0, VICTORY_STAR: 1, FLOWER_VEIL: 0,
  AROMA_VEIL: 0, SUPERSWEET_SYRUP: 0, ANTICIPATION: 0, FOREWARN: 0, FRISK: 0, ILLUMINATE: 0, EARLY_BIRD: 0, RUN_AWAY: 0,
  HEAVY_METAL: 0, LIGHT_METAL: 0, SUCTION_CUPS: 0, STICKY_HOLD: 0, DAMP: 0, SYNCHRONIZE: 0, CUTE_CHARM: 0,
};
for (const [a, r] of Object.entries(MORE_RANK)) if (!ABILITY_RANK[a]) ABILITY_RANK[a] = [r, ''];

// The best ability slot of `abilities` (ability 1, 2, hidden) that is unlocked (all, without a synced save).
// later (optional): [name, abilities] of the form it ends up as; the slot carries over, so a slot counts for the better
// of its two abilities and `as` names the later form when that one decides it. tie: every slot ranks the same.
export function suggestAbility(abilities, unlocked, later) {
  let best = null;
  const ranks = [];
  abilities.forEach((a, n) => {
    if (!a || (unlocked && !unlocked[n])) return;
    const then = later && (later[1][n] || later[1][0]);
    const useLater = then && then !== a && abilityRank(then) > abilityRank(a);
    const key = useLater ? then : a;
    const [rank, why] = ABILITY_RANK[key] || [0, ''];
    ranks.push(rank);
    if (!best || rank > best.rank) best = { slot: n, key, rank, why, as: useLater ? later[0] : null };
  });
  if (best) best.tie = ranks.length > 1 && ranks.every(r => r === best.rank);
  return best;
}

// Which starter-screen form to pick (STARTER_FORMS rows). One that can evolve is judged by what it ends up as, so
// Partner Pikachu (evolves into Raichu) beats the cosplay forms that stay Pikachu. Ties: stronger start, then the
// better passive, then fewer weaknesses. Returns the row index and the numbers the reason is built from.
export function suggestForm(forms, line, F) {
  const bst = s => s.reduce((a, b) => a + b, 0);
  const end = F[finalForm(line[0], F)];
  const weak = types => TYPES.filter(t => mult(t, types.split(' ')) > 1).length;
  const score = f => [f[6] && end ? bst(end[3]) : bst(f[2]), bst(f[2]), abilityRank(f[4]), -weak(f[1])];
  let best = 0;
  forms.forEach((f, n) => {
    const a = score(f), b = score(forms[best]);
    const k = a.findIndex((x, j) => x !== b[j]);
    if (k > -1 && a[k] > b[k]) best = n;
  });
  return { best, endName: forms[best][6] && end ? end[0] : null, bst: bst(forms[best][2]) };
}

// The form a line ends up as from `form`. With split evolutions (Pikachu: Raichu or Alolan Raichu) it follows `target`
// when that is a branch, else the best branch: highest base stat total, then fewest weaknesses.
export function finalForm(form, F, target) {
  const next = F[form][6].map(([to]) => to).filter(to => F[to]);
  if (!next.length) return form;
  const ends = next.map(to => finalForm(to, F, target));
  const hit = ends.findIndex((e, k) => e === target || next[k] === target);
  if (hit > -1) return ends[hit];
  const bst = f => F[f][3].reduce((a, b) => a + b, 0);
  const weak = f => TYPES.filter(t => mult(t, F[f][2].split(' ')) > 1).length;
  return ends.reduce((a, b) => (bst(b) > bst(a) || (bst(b) === bst(a) && weak(b) < weak(a)) ? b : a));
}
export const abilityRank = a => (ABILITY_RANK[a] || [0])[0];
export const abilityWhy = a => (ABILITY_RANK[a] || [])[1] || '';

// The best nature you've caught when the suggested one isn't among them. owned: 25 booleans in NATURES order.
// Raising the stat the suggestion raises scores most, then its main attack stat (or Speed if it's fast); lowering a
// stat it relies on costs a lot; a neutral nature beats one that hurts it. null if you have none.
export function bestOwnedNature(suggested, stats, owned) {
  const [up, down] = NATURES.find(n => n[0] === suggested)?.slice(1) || [];
  const [, atk, , spa, , spe] = stats;
  const main = atk >= spa ? 'Atk' : 'SpA', other = main === 'Atk' ? 'SpA' : 'Atk';
  const needs = new Set([main, ...(Math.abs(atk - spa) < atk * 0.1 ? [other] : []), ...(spe >= 90 ? ['Spe'] : [])]);
  let best = null, top = -Infinity;
  NATURES.forEach(([name, u, d], k) => {
    if (!owned[k]) return;
    const score = !u ? 0.5 : (u === up ? 3 : needs.has(u) ? 2 : 0) + (d === down ? 1 : needs.has(d) ? -3 : 0);
    if (score > top) { top = score; best = name; }
  });
  return best;
}
