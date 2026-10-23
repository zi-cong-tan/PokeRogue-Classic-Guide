// Sanity check for src/live.js (species names to the guide's forms, catch picks): node scripts/check-live.mjs
import assert from 'node:assert/strict';
import { formKey, finalForm, catchHere } from '../src/live.js';
import { FORMS, LINES } from '../src/data/learnsets.js';
import { BIOME_BOSSES } from '../src/data/biome-bosses.js';

assert.equal(formKey({ id: 9, species: 'Blastoise' }, FORMS), 'BLASTOISE');
assert.equal(formKey({ id: 2026, species: 'Alolan Raichu' }, FORMS), 'ALOLA_RAICHU');
assert.equal(formKey({ id: 2670, species: 'Floette' }, FORMS), 'ETERNAL_FLOETTE');
assert.equal(formKey({ id: 1, species: 'Not A Pokemon' }, FORMS), null);
assert.equal(finalForm('SQUIRTLE', FORMS), 'BLASTOISE');

// a team that takes 2x from Ghost and Dark and can't hit Steel: Plains picks should help with that
const holes = { threats: ['ghost', 'dark'], gaps: ['steel'] };
const picks = catchHere(BIOME_BOSSES.Plains.wild, holes, new Set(), { FORMS, LINES });
assert.ok(picks.length > 0 && picks.length <= 3);
for (const p of picks) assert.ok(p.resists.length || p.hits.length, p.sp);
// lines already in the party are skipped
const meowth = LINES.findIndex(l => l.includes('MEOWTH'));
assert.ok(!catchHere(BIOME_BOSSES.Plains.wild, { threats: [], gaps: [] }, new Set([meowth]), { FORMS, LINES }, 99).some(p => p.sp === 'MEOWTH'));
console.log('live ok:', picks.map(p => `${p.sp} (${p.rarity})`).join(', '));
