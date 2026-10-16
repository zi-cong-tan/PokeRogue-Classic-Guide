// Sanity check for src/advice.js against the generated data: node scripts/check-advice.mjs
import assert from 'node:assert/strict';
import * as L from '../src/data/learnsets.js';
import { STARTERS } from '../src/data/starters.js';
import { BUILDS } from '../src/data/builds.js';
import { suggestNature, suggestMoves, evolveAdvice, teamReport, learnable } from '../src/advice.js';

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

console.log('Garchomp:', gm.map(x => `${name(x.m)} (${x.label})`).join(', '));
console.log('Ivysaur ->', evo.map(e => `${e.name} by ${e.how}; keep ${e.keep.map(k => name(k.m) + ' @' + k.lvl).join(', ') || 'nothing'}`).join(' | '));
console.log('swap', team.swap);
console.log('ok');
