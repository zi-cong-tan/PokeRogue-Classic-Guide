// The enemy after one hit of d damage. Bosses follow the game's bar rule (utils/damage.ts, calculateBossSegmentDamage):
// a hit always breaks the bar it lands on, but the damage left over breaks 1 more bar at 2 bars' worth, 2 more at 4, 3 at 8
// (doubling each time); the rest is lost and HP stops on a bar line. The Classic final boss's first form stops at 1 HP.
export function hit(e, d) {
  if (!e.boss) return { ...e, hp: Math.max(0, e.hp - d) };
  const seg = e.maxHp / e.bars, i = e.barIndex;
  if (i > 0) {
    const line = seg * i, left = d - (e.hp - Math.round(line));
    const extra = Math.min(Math.max(Math.floor(Math.log2(left / seg)), 0), i - (e.noKo ? 1 : 0));
    if (left > 0) d = Math.max(1, Math.floor(e.hp - line + seg * extra));
  }
  if (e.noKo && i < 1) d = Math.min(d, e.hp - 1);
  const hp = Math.max(0, e.hp - d);
  let bar = 0;   // the game's getBossSegmentIndex
  for (let s = e.bars - 1; s > 0; s--) if (hp > Math.round(seg * s)) { bar = s; break; }
  return { ...e, hp, barIndex: Math.min(i, bar) };
}
// Same-sized hits until it faints (Infinity if it can't be KOed). Leaves out the stat boosts a boss gets per bar.
export function hitsToKo(e, d) {
  for (let n = 1; n <= 99; n++) { e = hit(e, d); if (!e.hp) return n; }
  return Infinity;
}
