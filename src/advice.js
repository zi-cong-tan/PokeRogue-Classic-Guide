// Suggestions built from the game data in src/data/learnsets.js: nature, moves, when to evolve, and a team check.
// They are rules of thumb, not the only good answer, and the page says so.
import { TYPES, CHART, mult } from './data/types.js';

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

// Raise what it attacks with (or Speed if it is fast), lower the attack stat it does not use.
// ponytail: stat-only rule; ignores abilities and movepool, so e.g. Trick Room or Body Press users get the usual answer.
export function suggestNature(stats) {
  const [, atk, def, spa, spd, spe] = stats;
  const r = role(stats);
  const fast = spe >= 90 || spe >= Math.max(atk, spa);
  const wall = Math.max(atk, spa) < 65 && Math.max(def, spd) >= 90;
  let up, down, why;
  if (wall) {
    up = def >= spd ? 'Def' : 'SpD'; down = atk <= spa ? 'Atk' : 'SpA';
    why = `Its defenses (${def} / ${spd}) are its strength, so raise ${STAT_NAME[up]} and lower the attack stat it barely uses.`;
  } else {
    const main = r === 'S' ? 'SpA' : 'Atk';
    up = fast ? 'Spe' : main;
    down = r === 'M' ? (def <= spd ? 'Def' : 'SpD') : r === 'P' ? 'SpA' : 'Atk';
    why = (r === 'M' ? `Attack and Sp. Atk are close (${atk} / ${spa}), so keep both and lower ${STAT_NAME[down]}.`
      : `${r === 'P' ? 'Attack' : 'Sp. Atk'} (${r === 'P' ? atk : spa}) is well above ${r === 'P' ? 'Sp. Atk' : 'Attack'} (${r === 'P' ? spa : atk}), so lower the one it does not use.`)
      + (fast ? ` It is fast (Speed ${spe}), so raise Speed to move first.` : ` It is not fast (Speed ${spe}), so raise ${STAT_NAME[up]} for power.`);
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
// TMs, which only show up at random in shops.
export function suggestMoves(line, form, eggKeys, L) {
  const { FORMS: F, MOVE_LIST, MOVE_KEYS } = L;
  const [, , types, stats] = F[form];
  const own = types.split(' ');
  const r = role(stats);
  const src = learnable(line, form, eggKeys, L);
  const score = m => {
    const [, t, cat, power, acc, risky] = MOVE_LIST[m];
    if (cat === 'X' || !power || risky) return 0;
    const fit = r === 'M' || cat === r ? 1 : 0.55;
    return power * (acc < 0 ? 1 : acc / 100) * (own.includes(t) ? 1.5 : 1) * fit * (src.get(m).kind === 'tm' ? 0.9 : 1);
  };
  const attacks = [...src.keys()].filter(m => score(m) > 0).sort((a, b) => score(b) - score(a));
  const pick = [];
  for (const t of own) {
    const best = attacks.find(m => MOVE_LIST[m][1] === t);
    if (best !== undefined) pick.push(best);
  }
  const typesOf = list => list.map(m => MOVE_LIST[m][1]);
  const gain = m => [...hits([MOVE_LIST[m][1]])].filter(t => !hits(typesOf(pick)).has(t)).length;
  let lastGain = 0;
  while (pick.length < 4) {
    const rest = attacks.filter(m => !pick.includes(m) && !typesOf(pick).includes(MOVE_LIST[m][1]));
    if (!rest.length) break;
    const best = rest.reduce((a, b) => (gain(b) > gain(a) || (gain(b) === gain(a) && score(b) > score(a)) ? b : a));
    if (pick.length === 3) lastGain = gain(best);
    pick.push(best);
  }
  const setup = [...src.keys()].find(m => SETUP[MOVE_KEYS[m]] && (SETUP[MOVE_KEYS[m]] === r || SETUP[MOVE_KEYS[m]] === 'M' || r === 'M'));
  if (setup !== undefined && (pick.length < 4 || lastGain <= 1)) pick.splice(3, 1, setup);
  for (const m of attacks) if (pick.length < 4 && !pick.includes(m)) pick.push(m);
  // Short movepools (Wobbuffet, Pyukumuku, Magikarp...): fill with attacks whose power varies, then useful status
  // moves, then the risky attacks, then anything left, so every slot it can fill gets a suggestion.
  const all = [...src.keys()];
  const fillers = [
    all.filter(m => MOVE_LIST[m][2] !== 'X' && !MOVE_LIST[m][3] && !MOVE_LIST[m][5]),
    GOOD_STATUS.map(k => MOVE_KEYS.indexOf(k)).filter(m => src.has(m)),
    all.filter(m => MOVE_LIST[m][2] !== 'X' && MOVE_LIST[m][5]),
    all,
  ];
  for (const list of fillers) for (const m of list) if (pick.length < 4 && !pick.includes(m)) pick.push(m);
  return pick.map(m => ({ m, ...src.get(m) }));
}

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
