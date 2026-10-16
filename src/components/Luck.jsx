import { useState } from 'react';
import { useReveal } from '../motion';
import { LUCK_GRADES, partyLuck, itemOdds, bossOdds, shinyOneIn } from '../advice';

const SHINY = [['Not shiny', 0], ['Shiny (+1)', 1], ['Rare shiny (+2)', 2], ['Epic shiny (+3)', 3]];
const TIER_NAMES = ['Common', 'Great', 'Ultra', 'Rogue', 'Master'];
const pct = x => (x >= 0.1 ? `${(x * 100).toFixed(1)}%` : `${(x * 100).toFixed(2)}%`);
const oneIn = x => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
const save = v => { try { localStorage.setItem('prg-luck-1', JSON.stringify(v)); } catch { /* private mode */ } };
const load = () => { try { return JSON.parse(localStorage.getItem('prg-luck-1')); } catch { return null; } };

export default function Luck() {
  const root = useReveal();
  const [state, setState] = useState(() => load() || { slots: [0, 0, 0, 0, 0, 0], charms: 0 });
  const set = patch => setState(s => { const n = { ...s, ...patch }; save(n); return n; });
  const luck = partyLuck(state.slots);
  const items = itemOdds(luck);
  const base = itemOdds(0);
  const boss = bossOdds(luck);

  return (
    <section className="luck" id="luck" ref={root} aria-labelledby="luck-title">
      <div className="luck-head">
        <h2 id="luck-title" data-reveal>Shinies and luck</h2>
        <p data-reveal>
          Shinies come in three tiers. Each shiny in your party adds luck: 1 for a standard shiny, 2 for a rare one, 3 for an epic one,
          up to 14. Luck makes reward items jump up a tier more often and rare bosses a little more likely. Set your party below.
        </p>
      </div>

      <div className="luck-body" data-reveal>
        <div className="luck-set">
          <div className="luck-slots">
            {state.slots.map((v, i) => (
              <label key={i}>Party slot {i + 1}
                <select value={v} onChange={e => set({ slots: state.slots.map((x, k) => (k === i ? Number(e.target.value) : x)) })}>
                  {SHINY.map(([t, n]) => <option key={n} value={n}>{t}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label className="luck-charms">Shiny Charms
            <select value={state.charms} onChange={e => set({ charms: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <dl className="shiny-tiers">
            <div><dt>Standard shiny</dt><dd>6 in 10 shinies, +1 luck</dd></div>
            <div><dt>Rare shiny</dt><dd>3 in 10, +2 luck</dd></div>
            <div><dt>Epic shiny</dt><dd>1 in 10, +3 luck</dd></div>
          </dl>
          <p className="hint">Only Pokémon with extra shiny colours can be rare or epic; the rest are always standard. A fused Pokémon counts the shiny luck of both halves. Fainted Pokémon add none.</p>
        </div>

        <div className="paper zig luck-sheet" aria-live="polite">
          <p className="luck-score"><span>{luck}</span> luck, grade {LUCK_GRADES[luck]}</p>
          <ol>
            <li><span>An item jumps up a tier</span><b aria-hidden="true" /><span>1 in {oneIn(items.upgradeOneIn)}{luck ? ` (1 in ${base.upgradeOneIn} with no luck)` : ''}</span></li>
            <li><span>And can jump again</span><b aria-hidden="true" /><span>same odds each time</span></li>
            <li><span>Wild shiny</span><b aria-hidden="true" /><span>1 in {shinyOneIn(state.charms)}</span></li>
            <li><span>Ultra rare biome boss</span><b aria-hidden="true" /><span>1 in {oneIn(1 / boss.ultraRare)}</span></li>
          </ol>
          <h3>Each reward item, by tier</h3>
          <table className="tier-odds">
            <thead><tr><th scope="col">Tier</th><th scope="col">No luck</th><th scope="col">Yours</th></tr></thead>
            <tbody>
              {TIER_NAMES.map((t, i) => <tr key={t}><th scope="row">{t}</th><td>{pct(base.tiers[i])}</td><td>{pct(items.tiers[i])}</td></tr>)}
            </tbody>
          </table>
          <p className="hint">Items rolled for a set tier (shop slots, some encounter rewards) can climb the same way.</p>
        </div>
      </div>
      <p className="note">From the game's source: getPartyLuckValue and the item roll in src/modifier/modifier-type.ts, the shiny variant roll in src/field/pokemon.ts, the boss roll in src/field/arena.ts.</p>
    </section>
  );
}
