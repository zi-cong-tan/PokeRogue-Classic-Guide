// Sanity check for src/advice.js against the generated data: node scripts/check-advice.mjs
import assert from 'node:assert/strict';
import * as L from '../src/data/learnsets.js';
import { STARTERS } from '../src/data/starters.js';
import { BUILDS } from '../src/data/builds.js';
import { suggestNature, suggestMoves, evolveAdvice, teamReport, learnable, bossPrep, fuse, itemOdds, bossOdds, partyLuck, shinyOneIn, TACTICS, tacticStarters, fusionPicks } from '../src/advice.js';

const at = n => STARTERS.findIndex(s => s[0] === n);
const name = m => L.MOVE_LIST[m][0];

assert.equal(suggestNature(L.FORMS.GARCHOMP[3]).nature, 'Jolly');      // fast physical
assert.equal(suggestNature(L.FORMS.VENUSAUR[3]).nature, 'Modest');     // slow special-leaning
assert.equal(suggestNature(L.FORMS.ALAKAZAM[3]).nature, 'Timid');      // fast special

const g = at('Gible'), gm = suggestMoves(L.LINES[g], 'GARCHOMP', BUILDS[g][3], L);
assert.equal(gm.length, 4);
assert.ok(gm.some(x => name(x.m) === 'Earthquake') || gm.some(x => L.MOVE_LIST[x.m][1] === 'ground'), 'Garchomp gets a Ground move');
assert.ok(gm.every(x => !L.MOVE_LIST[x.m][5]), 'no recharge / self-KO moves');
// A pre-evolution's level-up move is offered with its source.
const inherited = L.LINES.flatMap(line => line.slice(1).map(f => [line, f]))
  .filter(([line, f]) => [...learnable(line, f, [], L).values()].some(s => s.label.startsWith('As ')));
assert.ok(inherited.length > 50, 'pre-evolution moves show up for evolved forms');

const evo = evolveAdvice('IVYSAUR', L);
assert.equal(evo[0].name, 'Venusaur');
assert.match(evo[0].how, /level 32/);

const team = teamReport([{ name: 'A', types: ['fire'], moves: ['fire'] }, { name: 'B', types: ['fire'], moves: ['fire'] }, { name: 'C', types: ['rock'], moves: [] }]);
assert.ok(team.threats.includes('water') && team.threats.includes('ground'));
assert.ok(team.swap && team.swap.weakTo.includes('water'));
assert.equal(teamReport([]).swap, null);

const prep = bossPrep([{ name: 'Garchomp', types: ['dragon', 'ground'], moves: ['ground', 'dragon'] }, { name: 'Lapras', types: ['water', 'ice'], moves: ['ice'] }],
  [{ name: 'Dragonite', types: ['dragon', 'flying'] }, { name: 'Machamp', types: ['fighting'] }]);
assert.equal(prep[0].best.mult, 4); assert.equal(prep[0].best.who, 'Lapras');   // Ice on Dragon/Flying
assert.deepEqual(prep[0].threatened, ['Garchomp']);                              // Dragonite's Dragon STAB hits Garchomp 2x
assert.deepEqual(prep[1].threatened, ['Lapras']);                                // Fighting hits Lapras (Ice) 2x

// Fusion: first type from the first, second from the partner's second (or first) type.
assert.deepEqual(fuse({ types: ['dragon', 'ground'], stats: [108, 130, 95, 80, 85, 102] }, { types: ['water', 'ice'], stats: [130, 85, 80, 85, 95, 60] }).types, ['dragon', 'ice']);
assert.deepEqual(fuse({ types: ['water'], stats: [1, 1, 1, 1, 1, 1] }, { types: ['water'], stats: [2, 2, 2, 2, 2, 2] }), { types: ['water'], stats: [2, 2, 2, 2, 2, 2] });
assert.deepEqual(fuse({ types: ['grass', 'poison'], stats: [0, 0, 0, 0, 0, 0] }, { types: ['grass'], stats: [0, 0, 0, 0, 0, 0] }).types, ['grass', 'poison']);

// Luck: no luck means 1 in 32 upgrades and the base odds; the odds always add up to 1.
assert.equal(itemOdds(0).upgradeOneIn, 32);
assert.equal(itemOdds(14).upgradeOneIn, 7);
for (const L of [0, 7, 14]) assert.ok(Math.abs(itemOdds(L).tiers.reduce((a, b) => a + b) - 1) < 1e-9);
assert.ok(itemOdds(14).tiers[3] > itemOdds(0).tiers[3]);
assert.equal(bossOdds(0).ultraRare, 1 / 64);
assert.equal(partyLuck([3, 3, 3, 3, 3, 3]), 14);
assert.equal(shinyOneIn(0), 1024); assert.equal(shinyOneIn(4), 32);

// Tactics: Leech Seed stall finds starters, and every listed one really can learn Leech Seed.
const seed = tacticStarters(TACTICS[0], L, BUILDS.map(b => (b ? b[3] : [])));
assert.ok(seed.length > 10);
assert.ok(seed.every(s => [...learnable(L.LINES[s.i], s.form, BUILDS[s.i][3], L).keys()].some(m => L.MOVE_KEYS[m] === 'LEECH_SEED')));
// Fusion picks: every ordered pair, best first.
const fp = fusionPicks([{ name: 'Garchomp', types: ['dragon', 'ground'], stats: [108, 130, 95, 80, 85, 102] }, { name: 'Lapras', types: ['water', 'ice'], stats: [130, 85, 80, 85, 95, 60] }]);
assert.equal(fp.length, 2);
console.log('Leech Seed top:', seed.slice(0, 5).map(s => L.FORMS[s.form][0]).join(', '));

console.log('Garchomp:', gm.map(x => `${name(x.m)} (${x.label})`).join(', '));
console.log('Ivysaur ->', evo.map(e => `${e.name} by ${e.how}; keep ${e.keep.map(k => name(k.m) + ' @' + k.lvl).join(', ') || 'nothing'}`).join(' | '));
console.log('swap', team.swap);
console.log('ok');
