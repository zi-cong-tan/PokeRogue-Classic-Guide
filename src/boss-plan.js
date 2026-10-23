// Planning for the last two fights of Classic: Mega Rayquaza (the rival's sixth Pokémon at wave 195) and Eternatus
// (wave 200). Who on a team can beat them, which starters to add, and which wild Pokémon to catch on the way.
// From the PokeRogue source: rival-party-config.ts (Mega Rayquaza, level 200), field/pokemon.ts (Eternatus's fixed
// movesets, and Strong Winds halving moves that are super effective on Flying), init-abilities.ts (Delta Stream).
// ponytail: a scoring model, not a battle simulator. Items, Tera, natures and stat boosts are left out.
import { mult } from './data/types.js';
import { learnable, AWKWARD, NOT_SELF_HEAL, NATURES, suggestNature, bestOwnedNature, abilityRank } from './advice.js';

export const BOSSES = [
  {
    key: 'ray', name: 'Mega Rayquaza', wave: 195, types: ['dragon', 'flying'], winds: true, setup: 'Dragon Dance',
    // Its strongest moves at level 200 are physical (Dragon Ascent, Outrage, Extreme Speed), from Rayquaza's learnset.
    attacks: [['dragon', 'P'], ['flying', 'P'], ['normal', 'P']],
  },
  {
    key: 'eter', name: 'Eternatus', wave: 200, types: ['poison', 'dragon'], setup: 'Cosmic Power',
    // Eternabeam / Dynamax Cannon, Sludge Bomb / Cross Poison, Flamethrower (pokemon.ts, both phases).
    attacks: [['dragon', 'S'], ['poison', 'S'], ['fire', 'S'], ['poison', 'P']],
  },
];

// Delta Stream's Strong Winds: a move that is super effective on Flying does half (pokemon.ts getAttackTypeEffectiveness).
export const hitMult = (boss, type) => mult(type, boss.types) / (boss.winds && mult(type, ['flying']) === 2 ? 2 : 1);

// The abilities that change these two fights. imm: immune to; half / dbl: takes half / double from; se: super
// effective hits do this much; P / S: physical / special hits do this much; first: the first hit at full HP;
// to: Normal moves become this type (+20%); atk: physical attack multiplier; stab: STAB multiplier; unaware: ignores boosts.
const AB = {
  FLASH_FIRE: { imm: ['fire'] }, WELL_BAKED_BODY: { imm: ['fire'] },
  THICK_FAT: { half: ['fire', 'ice'] }, HEATPROOF: { half: ['fire'] }, WATER_BUBBLE: { half: ['fire'] },
  FLUFFY: { P: 0.5, dbl: ['fire'] }, FUR_COAT: { P: 0.5 }, ICE_SCALES: { S: 0.5 },
  FILTER: { se: 0.75 }, SOLID_ROCK: { se: 0.75 }, PRISM_ARMOR: { se: 0.75 },
  MULTISCALE: { first: 0.5 }, SHADOW_SHIELD: { first: 0.5 }, INTIMIDATE: { P: 2 / 3 },
  UNAWARE: { unaware: true },
  REFRIGERATE: { to: 'ice' }, PIXILATE: { to: 'fairy' },
  HUGE_POWER: { atk: 2 }, PURE_POWER: { atk: 2 }, GORILLA_TACTICS: { atk: 1.5 }, ADAPTABILITY: { stab: 2 },
};

// Everything one Pokémon brings to a boss fight: its best attack and how hard the boss hits back.
// form: FORMS key. abilities: ability keys it has (its ability plus its passive). moves: Map of move index -> source.
// Your Pokémon's own stats: each IV moves its stat by about (2 × base + IV) / (2 × base + 31) of a perfect one, and the
// nature raises one stat by 10% and lowers another by 10%. ivs: [6] or null (= perfect 31s); nature: its name or null.
const STAT_AT = { HP: 0, Atk: 1, Def: 2, SpA: 3, SpD: 4, Spe: 5 };
export function ownStats(base, ivs, nature) {
  const n = nature && NATURES.find(x => x[0] === nature);
  return base.map((b, k) => b * (ivs ? (2 * b + ivs[k]) / (2 * b + 31) : 1)
    * (n?.[1] && STAT_AT[n[1]] === k ? 1.1 : n?.[2] && STAT_AT[n[2]] === k ? 0.9 : 1));
}

export function fight(boss, form, abilities, moves, L, ivs = null, nature = null) {
  const [, , typeStr, base] = L.FORMS[form];
  const st = ownStats(base, ivs, nature);
  const types = typeStr.split(' ');
  const mods = abilities.map(a => AB[a]).filter(Boolean);
  const has = k => mods.find(m => m[k]);
  let best = { val: 0 };
  const consider = (type, cat, power, name, egg) => {
    const to = type === 'normal' && has('to')?.to;
    const t = to || type;
    const eff = hitMult(boss, t);
    const stab = types.includes(t) ? has('stab')?.stab || 1.5 : 1;
    const atk = cat === 'P' ? st[1] * (has('atk')?.atk || 1) : st[3];
    const val = eff * stab * Math.min(power, 120) * (to ? 1.2 : 1) / 100 * atk / 100;
    if (val > best.val) best = { val, type: t, eff, name, egg, stab: stab > 1, cat };
  };
  for (const [m, src] of moves) {
    const [name, type, cat, power, acc, risky] = L.MOVE_LIST[m];
    if (power >= 50 && (cat === 'P' || cat === 'S') && !risky && !AWKWARD.has(L.MOVE_KEYS[m])) consider(type, cat, power * (acc > 0 ? acc / 100 : 1), name, src.kind === 'egg');
  }
  // One turn of setup before attacking (Swords Dance, Nasty Plot, Dragon Dance...) pays off over a long boss fight,
  // and a healing move keeps it in. Setup counts only if it boosts the stat its best attack uses.
  let setup = null, heal = null;
  for (const [m] of moves) {
    const [name, , , , , , , job = ''] = L.MOVE_LIST[m];
    if (job.startsWith('setup:')) {
      const [, kind, n] = job.split(':');
      if ((kind === 'M' || kind === best.cat) && (!setup || +n > setup.n)) setup = { name, n: +n };
    }
    if (job === 'heal' && !NOT_SELF_HEAL.has(L.MOVE_KEYS[m])) heal = name;
  }
  if (setup) best = { ...best, val: best.val * (1 + 0.5 * Math.min(setup.n, 2)), setup: setup.name };
  let worst = 0, resists = [], weak = [];
  for (const [type, cat] of boss.attacks) {
    let m = mult(type, types);
    for (const x of mods) {
      if (x.imm?.includes(type)) m = 0;
      if (x.half?.includes(type)) m /= 2;
      if (x.dbl?.includes(type)) m *= 2;
      if (x.se && m > 1) m *= x.se;
      if (x[cat]) m *= x[cat];
    }
    worst = Math.max(worst, m);
    if (m < 1 && !resists.includes(type)) resists.push(type);
    if (m > 1 && !weak.includes(type)) weak.push(type);
  }
  const bulk = st[0] * (boss.attacks.some(a => a[1] === 'P') && !boss.attacks.some(a => a[1] === 'S') ? st[2] : st[4]) / 10000;
  const tough = bulk / Math.max(worst, 0.25) * (has('first') ? 1.3 : 1) * (has('unaware') ? 1.3 : 1) * (heal ? 1.25 : 1);
  return { best, resists, weak, heal, helps: abilities.filter(a => AB[a]), score: best.val + tough * 0.7 };
}

// A starter line's best showing against a boss: each final form, each ability it could have (+ passive).
// slots: which ability slots to try (a party member's chosen one, or all three). Returns the best, with the form and ability.
// ivs: your best IVs for the species (null = perfect). nature: the nature you'd use, or natures: the ones you've caught
// (25 booleans, NATURES order), in which case it picks the suggested nature if you have it, else none.
export function lineVsBoss(boss, i, { slots = [0, 1, 2], passive = true, eggs = null, from, ivs = null, nature = null, natures = null, notes = false } = {}, D) {
  const { FORMS, LINES, BUILDS, EVOS } = D;
  const line = LINES[i];
  const reach = new Set();
  const walk = f => { if (reach.has(f)) return; reach.add(f); FORMS[f][6].forEach(([to]) => line.includes(to) && walk(to)); };
  walk(from && line.includes(from) ? from : line[0]);
  const finals = [...reach].filter(f => !FORMS[f][6].some(([to]) => reach.has(to)));
  const [baseAb, pass, , eggMoves] = BUILDS[i];
  const eggKeys = eggs ? eggMoves.filter((_, k) => eggs[k]) : eggMoves;
  let top = null;
  for (const f of finals) {
    const evo = EVOS[i].find(([n]) => n === FORMS[f][0]);
    const abs = evo ? evo[1] : baseAb;
    const moves = new Map([...learnable(line, f, eggKeys, D)].filter(([, s]) => s.kind !== 'tm'));
    for (const s of slots) {
      const a = abs[s] || abs[0];
      const list = passive && pass ? [a, pass] : [a];
      const want = suggestNature(FORMS[f][3]).nature;
      const nat = nature || (natures ? bestOwned(want, FORMS[f][3], natures) : want);
      const r = fight(boss, f, list, moves, D, ivs, nat);
      // equal for the fight (the ability doesn't matter there): prefer the generally stronger ability
      if (!top || r.score > top.score + 1e-9 || (Math.abs(r.score - top.score) < 1e-9 && abilityRank(a) > abilityRank(top.ability))) top = { ...r, form: f, name: FORMS[f][0], ability: a, slot: abs[s] ? s : 0, passive: passive ? pass : null, ...(notes ? statNotes(r, ivs, nat, natures ? want : null) : {}) };
    }
  }
  return top;
}

// The suggested nature if you've caught it, otherwise the best one you have (bestOwnedNature). null if none.
function bestOwned(want, base, natures) {
  return natures[NATURES.findIndex(n => n[0] === want)] ? want : bestOwnedNature(want, base, natures);
}

const NAT_UP = Object.fromEntries(NATURES.filter(n => n[1]).map(n => [n[0], { Atk: 'Attack', Def: 'Defense', SpA: 'Sp. Atk', SpD: 'Sp. Def', Spe: 'Speed' }[n[1]]]));

// What to say about its own stats: an IV of 10 or less in the stat its best attack uses, and the nature.
function statNotes(r, ivs, nat, wanted) {
  const k = r.best.cat === 'S' ? 3 : 1, stat = k === 3 ? 'Sp. Atk' : 'Attack';
  const ivNote = ivs && ivs[k] <= 10 ? `${stat} IV is only ${ivs[k]}, so it hits a little weaker. A better one from an egg would help.` : null;
  const n = NAT_UP[nat], w = NAT_UP[wanted];
  const natNote = nat ? (n ? `Uses your ${nat} nature (+10% ${n}).` : `Uses your ${nat} nature (no stat change).`)
    : wanted ? `A ${wanted} one (+10% ${w}) would help; you haven't caught that nature yet.` : null;
  return { ivNote, natNote };
}

// How the current team does against each boss: its best answer and who takes double from the boss's attacks.
export function teamVsBosses(party, builds, D) {
  return BOSSES.map(boss => {
    const rows = party.map(i => {
      const b = builds[i] || {};
      return { i, ...lineVsBoss(boss, i, { slots: [b.ability || 0], passive: !!b.passive, eggs: b.egg || [], from: b.form, ivs: b.ivs || null, nature: b.nature && b.nature !== 'Hardy' ? b.nature : null, notes: true }, D) };
    });
    const answer = rows.reduce((a, r) => (!a || r.score > a.score ? r : a), null);
    return { boss, rows, answer, hit: rows.reduce((a, r) => (!a || r.best.val > a.best.val ? r : a), null) };
  });
}

// Extra value a newcomer adds against the bosses: mostly what beats the team's current best answer.
export const bossGain = (now, r) => Math.max(0, r.score - (now?.score || 0)) + r.score * 0.25;

// Wild Pokémon worth catching for the two fights, from every biome's wild pool (biome-bosses.js `wild`).
// Wild catches roll ability 1 or 2 (the hidden one is rare), with no passive and no egg moves. Common beats rare at the same value.
const TIER = { COMMON: [1, 'common'], UNCOMMON: [0.9, 'uncommon'], RARE: [0.75, 'rare'], SUPER_RARE: [0.55, 'super rare'], ULTRA_RARE: [0.4, 'ultra rare'] };
// skip: starter-line indexes to leave out (your party, and the starters you own: you can just pick those).
export function catchList(team, biomes, D, limit = 6, skip = new Set()) {
  const lineOf = {};
  D.LINES.forEach((l, i) => l.forEach(f => { lineOf[f] = i; }));
  const seen = {};
  for (const [biome, { wild }] of Object.entries(biomes)) {
    if (biome === 'End') continue;  // the last biome, no catching before Eternatus
    for (const [tier, list] of Object.entries(wild || {})) {
      for (const sp of list) (seen[sp] ||= []).push({ biome, tier });
    }
  }
  const out = [];
  for (const [sp, where] of Object.entries(seen)) {
    const i = lineOf[sp];
    if (i === undefined || skip.has(i)) continue;
    const vs = BOSSES.map(boss => lineVsBoss(boss, i, { slots: [0, 1], passive: false, eggs: [], from: sp, ivs: [15, 15, 15, 15, 15, 15], natures: [] }, D));  // wild: average IVs, random nature
    const gain = vs.reduce((s, r, k) => s + bossGain(team[k].answer, r), 0);
    const rate = Math.max(...where.map(w => TIER[w.tier][0]));
    out.push({ sp, name: D.FORMS[sp][0], vs, gain: gain * rate, where: where.sort((a, b) => TIER[b.tier][0] - TIER[a.tier][0]) });
  }
  // One entry per evolution line (the easiest-to-find member), best first.
  const byLine = {};
  for (const c of out.sort((a, b) => b.gain - a.gain)) byLine[lineOf[c.sp]] ||= c;
  return Object.values(byLine).sort((a, b) => b.gain - a.gain).slice(0, limit).map(c => ({ ...c, tierName: w => TIER[w.tier][1] }));
}
