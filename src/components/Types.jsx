import { useState } from 'react';
import { useReveal } from '../motion';
import { TYPES, TYPE_COLOR, CHART, cap, mult, typeInk } from '../data/types';

const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;

function Row({ label, list }) {
  if (!list.length) return null;
  return (
    <div className="tline">
      <dt>{label}</dt>
      <dd>{list.map(t => <Chip key={t} t={t} />)}</dd>
    </div>
  );
}

export default function Types() {
  const root = useReveal();
  const [picked, setPicked] = useState(['fire']);

  // Up to two types, like a real Pokemon. Picking a third drops the oldest.
  const toggle = t => setPicked(p => p.includes(t) ? (p.length > 1 ? p.filter(x => x !== t) : p) : [...p, t].slice(-2));

  const taken = m => TYPES.filter(a => mult(a, picked) === m);
  const name = picked.map(cap).join(' and ');

  return (
    <section className="types" id="types" ref={root} aria-labelledby="types-title">
      <div className="types-col">
        <h2 id="types-title" className="giant" data-reveal>Types</h2>
        <p className="types-lede" data-reveal>Tap a type, or two for a dual-type Pokemon, to see what it hits hard and what hits it hard.</p>

        <div className="type-grid" role="group" aria-label="Pick up to two types" data-reveal>
          {TYPES.map(t => (
            <button key={t} type="button" className="ty-btn" aria-pressed={picked.includes(t)} onClick={() => toggle(t)}
              style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</button>
          ))}
        </div>

        <div className="type-result" aria-live="polite" data-reveal>
          <div className="type-half">
            <h3>When a {name} Pokemon is hit</h3>
            <dl>
              <Row label="Takes 4x from" list={taken(4)} />
              <Row label="Takes 2x from" list={taken(2)} />
              <Row label="Takes half from" list={taken(0.5)} />
              <Row label="Takes a quarter from" list={taken(0.25)} />
              <Row label="Immune to" list={taken(0)} />
            </dl>
          </div>
          {picked.map(t => (
            <div className="type-half" key={t}>
              <h3>When it attacks with a {cap(t)} move</h3>
              <dl>
                <Row label="Double damage to" list={CHART[t][0]} />
                <Row label="Half damage to" list={CHART[t][1]} />
                <Row label="No effect on" list={CHART[t][2]} />
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
