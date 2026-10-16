import { useState } from 'react';
import { useReveal } from '../motion';
import { ITEM_TIERS } from '../data/items';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import { sprite, itemArt } from '../art';
import { fuse } from '../advice';

const TIERS = ['COMMON', 'GREAT', 'ULTRA', 'ROGUE', 'MASTER'];
const STAT = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;

function FusionCalc() {
  const [forms, setForms] = useState(null);
  const [a, setA] = useState('Garchomp');
  const [b, setB] = useState('Lapras');
  // The form list is big, so it loads the first time someone reaches for the calculator.
  const load = () => {
    if (forms) return;
    import('../data/learnsets').then(({ FORMS }) => {
      const byName = {};
      for (const [, name, id, types, stats] of Object.entries(FORMS).map(([k, v]) => [k, ...v])) byName[name] ??= { name, id, types: types.split(' '), stats };
      setForms(byName);
    });
  };
  const A = forms?.[a];
  const B = forms?.[b];
  const out = A && B ? fuse(A, B) : null;

  return (
    <div className="fuse" onPointerEnter={load} onFocus={load}>
      <div className="fuse-pick">
        <label>First Pokémon (gives its first type)
          <input list="fuse-names" value={a} onChange={e => setA(e.target.value)} />
        </label>
        <label>Partner (gives a second type)
          <input list="fuse-names" value={b} onChange={e => setB(e.target.value)} />
        </label>
        <datalist id="fuse-names">{forms && Object.keys(forms).sort().map(n => <option key={n} value={n} />)}</datalist>
      </div>
      {!forms ? <p className="hint">Point at or tap the boxes to load every Pokémon.</p>
        : !out ? <p className="hint">Pick two Pokémon from the list.</p> : (
          <div className="fuse-out">
            <div className="fuse-mons">
              <img src={sprite(A.id)} alt={A.name} width="96" height="96" />
              <span aria-hidden="true">+</span>
              <img src={sprite(B.id)} alt={B.name} width="96" height="96" />
            </div>
            <p className="chips">{out.types.map(t => <Chip key={t} t={t} />)}</p>
            <table className="fuse-stats">
              <thead><tr><th scope="col">Stat</th><th scope="col">{A.name}</th><th scope="col">{B.name}</th><th scope="col">Fused</th></tr></thead>
              <tbody>
                {STAT.map((s, i) => <tr key={s}><th scope="row">{s}</th><td>{A.stats[i]}</td><td>{B.stats[i]}</td><td>{out.stats[i]}</td></tr>)}
                <tr className="sum"><th scope="row">Total</th><td>{A.stats.reduce((x, y) => x + y)}</td><td>{B.stats.reduce((x, y) => x + y)}</td><td>{out.stats.reduce((x, y) => x + y)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export default function Shop() {
  const root = useReveal();
  const [tier, setTier] = useState('ROGUE');

  return (
    <section className="shop" id="shop" ref={root} aria-labelledby="shop-title">
      <div className="shop-head">
        <h2 id="shop-title" data-reveal>What the shop can give</h2>
        <p data-reveal>After each win you choose a reward. Every item the game can offer, by tier, with what it does. Rarer tiers come up less often.</p>
      </div>

      <div className="shop-body" data-reveal>
        <div>
          <div className="tabs" role="group" aria-label="Reward tier">
            {TIERS.map(t => <button key={t} type="button" aria-pressed={t === tier} onClick={() => setTier(t)}>{cap(t.toLowerCase())}</button>)}
          </div>
          <dl className="items">
            {ITEM_TIERS[tier].map(([k, name, text, icon]) => (
              <div key={k}>
                {icon && <img className="item-icon" src={itemArt(icon)} alt="" width="32" height="32" loading="lazy" />}
                <dt>{name}</dt><dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="shop-side">
          <h3>Pokérus</h3>
          <ul>
            <li>Five starters have it each day, the same five for everyone (picked from the date). They are marked on the starter screen.</li>
            <li>A Pokémon with Pokérus earns 1.5× Exp.</li>
            <li>After each wave it has a 1 in 10 chance to spread to the Pokémon on either side of it in your party order. Put it next to the Pokémon you most want to level.</li>
          </ul>

          <h3>Fusion</h3>
          <p>In Classic, DNA Splicers are a Master-tier reward (Great tier only during fusion events), and only once two or more of your Pokémon are unfused. They fuse two Pokémon; in the game's words, the fusion transfers the ability, splits base stats and types, and shares the move pool.</p>
          <FusionCalc />
        </aside>
      </div>
      <p className="note">From the game's source: the reward pools, the Pokérus spread and the fusion maths. Item text from the game's English files.</p>
    </section>
  );
}
