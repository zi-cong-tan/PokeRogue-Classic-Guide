// Sanity check for extension/src/boss.js against the game's boss-bar rule: node extension/check-boss.mjs
import assert from 'node:assert/strict';
import { hit, hitsToKo } from './src/boss.js';

const boss = (bars, hp = 300) => ({ boss: true, bars, barIndex: bars - 1, hp, maxHp: 300 });
// 2 bars of 150: the leftover must reach two bars' worth (300) to break the last bar too
assert.equal(hit(boss(2), 299).hp, 150);   // 149 left over: stops on the line
assert.equal(hit(boss(2), 449).hp, 150);   // 299 left over: still stops
assert.equal(hit(boss(2), 450).hp, 0);     // 1.5x max HP: one-hit KO
// 3 bars of 100: 1 extra bar at 200 left over (300 total), 2 extra at 400 (500 total, 1.67x)
assert.deepEqual([hit(boss(3), 299).hp, hit(boss(3), 299).barIndex], [200, 1]);
assert.deepEqual([hit(boss(3), 300).hp, hit(boss(3), 300).barIndex], [100, 0]);
assert.equal(hit(boss(3), 499).hp, 100);
assert.equal(hit(boss(3), 500).hp, 0);
// on the last bar it's a plain hit
assert.equal(hit({ ...boss(3), hp: 90, barIndex: 0 }, 50).hp, 40);
// Classic final boss, first form: never faints
const final = { ...boss(3), noKo: true };
assert.equal(hit(final, 9999).hp, 100);
assert.equal(hit({ ...final, hp: 50, barIndex: 0 }, 9999).hp, 1);
assert.equal(hitsToKo(final, 9999), Infinity);
// not a boss: plain subtraction
assert.equal(hitsToKo({ boss: false, hp: 100, maxHp: 100 }, 30), 4);
assert.equal(hitsToKo(boss(3), 120), 3);   // each hit stops at a line: 300 -> 200 -> 100 -> KO
console.log('boss bars ok');
