// Sanity check for extension/src/rate.js: node extension/check-rate.mjs
import assert from 'node:assert/strict';
import { rateItem } from './src/rate.js';

const run = { wave: 12, held: [], party: [
  { name: 'Charmander', types: ['Fire'], currentHP: 30, maxHP: 40, moveset: ['Ember', 'Scratch'], ability: 'Blaze', passiveAbility: '' },
  { name: 'Squirtle', types: ['Water'], currentHP: 42, maxHP: 42, moveset: ['Water Gun'], ability: 'Torrent', passiveAbility: '' } ] };
const offer = [
  { id: 'NUGGET', name: 'Nugget' }, { id: 'GREAT_BALL', name: '5x Great Ball' }, { id: 'TM_COMMON', name: 'TM062 - Protect', tm: true },
  { id: 'POTION', name: 'Potion', shop: true }, { id: 'ETHER', name: 'Ether', shop: true }, { id: 'REVIVE', name: 'Revive', shop: true }];
for (const o of offer) { const r = rateItem(o, run); console.log(r.tier, o.name, '-', r.why); }

assert.equal(rateItem({ id: 'REVIVE' }, run).tier, 'D');                                   // nobody fainted
assert.equal(rateItem({ id: 'REVIVE' }, { ...run, party: [{ ...run.party[0], currentHP: 0 }, run.party[1]] }).tier, 'A');
assert.equal(rateItem({ id: 'GREAT_BALL' }, run).tier, 'B');                               // early, room on the team
assert.equal(rateItem({ moveType: 'fire' }, run).tier, 'A');                                // Charcoal for a Fire team
assert.equal(rateItem({ moveType: 'ice' }, run).tier, 'E');
assert.equal(rateItem({ name: 'Revive', shop: true }, run).why, 'Nobody has fainted.');   // shop items have no id
assert.match(rateItem({ name: 'Potion', shop: true }, run).why, /missing/);
console.log('ok');
