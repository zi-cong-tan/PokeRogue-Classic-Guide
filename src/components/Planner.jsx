import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useReveal, countTo } from '../motion';
import { STARTERS, LIMIT, MAX_PARTY } from '../data/starters';
import { TYPES, TYPE_COLOR, CHART, cap, mult, typeInk } from '../data/types';
import { sprite } from '../art';
import PartyEditor from './PartyEditor';

// Party and builds are kept in this browser only; any storage error just means nothing is remembered.
const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

const KEYS = STARTERS.map(([n, , , t]) => `${n} ${t}`.toLowerCase());

// Attack types that hit most of the team for double with nobody resisting,
// and types none of the team's own types hit for double.
function teamCheck(party) {
  const team = party.map(i => STARTERS[i][3].split(' '));
  const threats = TYPES.filter(a => {
    const m = team.map(d => mult(a, d));
    return m.filter(x => x > 1).length >= Math.max(2, Math.ceil(team.length / 2)) && !m.some(x => x < 1);
  });
  const own = new Set(team.flat());
  const gaps = TYPES.filter(d => ![...own].some(a => CHART[a][0].includes(d)));
  return { threats, gaps };
}

const Chips = ({ list }) => (
  <span className="chips">{list.map(t => <span key={t} className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>)}</span>
);

export default function Planner() {
  const root = useReveal();
  const total = useRef(null);
  const [party, setParty] = useState(() => load('prg-party-2', []).filter(i => STARTERS[i]));
  const [builds, setBuilds] = useState(() => load('prg-builds-2', {}));
  useEffect(() => save('prg-party-2', party), [party]);
  useEffect(() => save('prg-builds-2', builds), [builds]);
  const setBuild = (i, b) => setBuilds(all => ({ ...all, [i]: b }));
  const [q, setQ] = useState('');
  const [fits, setFits] = useState(false);
  const query = useDeferredValue(q);

  const spent = party.reduce((s, i) => s + STARTERS[i][2], 0);
  const left = LIMIT - spent;
  const prevLeft = useRef(left);
  useEffect(() => { countTo(total.current, prevLeft.current, left); prevLeft.current = left; }, [left]);

  const blocked = i => !party.includes(i) && (STARTERS[i][2] > left || party.length >= MAX_PARTY);
  const shown = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return STARTERS.map((_, i) => i).filter(i => words.every(w => KEYS[i].includes(w)) && !(fits && blocked(i)));
    // blocked depends on party and left, both covered by `party`
  }, [query, fits, party]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = i => setParty(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  const { threats, gaps } = party.length ? teamCheck(party) : { threats: [], gaps: [] };

  return (
    <section className="planner" id="starters" ref={root} aria-labelledby="starters-title">
      <div className="total-side">
        <div>
          <h2 id="starters-title" data-reveal>Spend your 10 points</h2>
          <p data-reveal>Classic gives you 10 starter points and Endless gives 15. Each starter has a cost, and candy can lower it twice. Pick up to six below.</p>
        </div>
        <div data-reveal>
          <p className="total" ref={total} aria-hidden="true">{left}</p>
          <p className="total-cap">{left === 1 ? 'point' : 'points'} left to spend</p>
        </div>
      </div>

      <div className="editor-col" data-reveal><PartyEditor party={party} builds={builds} setBuild={setBuild} /></div>

      <div className="paper zig receipt" aria-live="polite" data-reveal>
        <h3>Your party</h3>
        <ol>
          {party.length ? party.map(i => (
            <li key={i}>
              <button type="button" onClick={() => toggle(i)} aria-label={`Remove ${STARTERS[i][0]}`}>
                <span>{STARTERS[i][0]}</span><b aria-hidden="true" /><span>{STARTERS[i][2]}</span>
              </button>
            </li>
          )) : <li className="empty">Nobody yet. Three 3-cost starters and a 1-cost is a common opener.</li>}
        </ol>
        {party.length > 0 && <>
          <h3>Watch out for</h3>
          {threats.length ? <><p>Double damage to most of your team, and nobody resists it.</p><Chips list={threats} /></> : <p>No attack type hits most of this team without someone resisting it.</p>}
          <h3>Your team is not strong against</h3>
          {gaps.length ? <><p>None of your team's own types hit these for double. Teach a move of another type.</p><Chips list={gaps} /></> : <p>Your team's own types hit every type for double.</p>}
        </>}
        <p className="inverted"><span>Spent</span><span>{spent} of {LIMIT}</span></p>
        {party.length > 0 && <button type="button" className="text-btn" onClick={() => setParty([])}>Clear party</button>}
      </div>

      <div className="picker" data-reveal>
        <div className="find">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search a name or type, like Gible or dragon" aria-label="Search starters" autoComplete="off" />
          <label><input type="checkbox" checked={fits} onChange={e => setFits(e.target.checked)} /> Only show what fits</label>
        </div>
        <p className="count" aria-live="polite">{shown.length ? `Showing ${shown.length} of ${STARTERS.length} starters, cheapest first` : 'No starters match. Try a shorter name or a type like water.'}</p>
        <ul className="mons">
          {shown.map(i => {
            const [n, id, c, t] = STARTERS[i];
            return (
              <li key={id}>
                <button type="button" className="mon" aria-pressed={party.includes(i)} disabled={blocked(i)} onClick={() => toggle(i)} aria-label={`${n}, costs ${c}, ${t} type`}>
                  <span className="mon-c">{c}</span>
                  <img src={sprite(id)} alt="" loading="lazy" width="96" height="96" />
                  <span className="mon-n">{n}</span>
                  <span className="dots">{t.split(' ').map(x => <i key={x} style={{ '--t': TYPE_COLOR[x] }} />)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="note">Costs are before candy discounts. The team check uses each starter's first-stage types; evolving can change them.</p>
      </div>
    </section>
  );
}
