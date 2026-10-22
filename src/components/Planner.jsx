import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useReveal, countTo } from '../motion';
import { STARTERS, LIMIT, MAX_PARTY, MAX_CUTS, cutCost, fmtPts } from '../data/starters';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import { sprite } from '../art';
import { teamReport } from '../advice';
import { members } from '../run';
import PartyEditor from './PartyEditor';
import CloudTeams from './CloudTeams';

// Party and builds are kept in this browser only; any storage error just means nothing is remembered.
const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

const KEYS = STARTERS.map(([n, , , t]) => `${n} ${t}`.toLowerCase());

// A shared team travels in the link: #team=<base64 of {p: party, b: builds, c: candy cuts}>.
const encodeTeam = (party, builds, cuts) =>
  btoa(unescape(encodeURIComponent(JSON.stringify({
    p: party, b: Object.fromEntries(party.map(i => [i, builds[i]]).filter(([, b]) => b)),
    c: Object.fromEntries(party.map(i => [i, cuts[i]]).filter(([, c]) => c)),
  }))));
function sharedTeam() {
  if (!location.hash.startsWith('#team=')) return null;
  try {
    const { p, b, c } = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(6)))));
    return Array.isArray(p) ? { party: p.filter(i => STARTERS[i]).slice(0, MAX_PARTY), builds: b || {}, cuts: c || {} } : null;
  } catch { return null; }
}

const Chips = ({ list }) => (
  <span className="chips">{list.map(t => <span key={t} className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>)}</span>
);

export default function Planner() {
  const root = useReveal();
  const total = useRef(null);
  const [shared] = useState(sharedTeam);
  const [party, setParty] = useState(() => shared?.party ?? load('prg-party-2', []).filter(i => STARTERS[i]));
  const [builds, setBuilds] = useState(() => (shared ? { ...load('prg-builds-2', {}), ...shared.builds } : load('prg-builds-2', {})));
  // Opening a shared link replaces the saved team, so the old one is kept for Undo.
  // Candy cost cuts you have bought in the game, per starter (0, 1 or 2). They belong to your save, not to one team.
  const [cuts, setCuts] = useState(() => (shared ? { ...load('prg-cuts', {}), ...shared.cuts } : load('prg-cuts', {})));
  const [backup, setBackup] = useState(() => (shared ? { party: load('prg-party-2', []), builds: load('prg-builds-2', {}), cuts: load('prg-cuts', {}) } : null));
  useEffect(() => { if (shared) history.replaceState(null, '', location.pathname + location.search); }, [shared]);
  // "Link copied" stays only while the team is still the one that was copied.
  const [copiedCode, setCopiedCode] = useState(null);
  const code = party.length ? encodeTeam(party, builds, cuts) : '';
  const copied = copiedCode === code;
  const share = () => navigator.clipboard?.writeText(`${location.origin}${location.pathname}#team=${code}`).then(() => setCopiedCode(code), () => {});

  // The move, ability and evolution lists are big, so they only load once a starter is picked.
  const [data, setData] = useState(null);
  useEffect(() => {
    if (party.length && !data) Promise.all([import('../data/builds'), import('../data/learnsets')]).then(([b, l]) => setData({ ...b, ...l }));
  }, [party.length, data]);
  useEffect(() => save('prg-party-2', party), [party]);
  useEffect(() => save('prg-builds-2', builds), [builds]);
  useEffect(() => save('prg-cuts', cuts), [cuts]);
  // Let the run tracker's boss prep follow the team.
  useEffect(() => { window.dispatchEvent(new CustomEvent('prg-team', { detail: { party, builds } })); }, [party, builds]);
  const setBuild = (i, b) => setBuilds(all => ({ ...all, [i]: b }));
  const [q, setQ] = useState('');
  const [fits, setFits] = useState(false);
  const query = useDeferredValue(q);

  const cost = i => cutCost(STARTERS[i][2], cuts[i]);
  const spent = party.reduce((s, i) => s + cost(i), 0);
  const left = LIMIT - spent;
  const prevLeft = useRef(left);
  useEffect(() => { countTo(total.current, prevLeft.current, left, fmtPts); prevLeft.current = left; }, [left]);
  // Cycles 0 → 1 → 2 → 0 cuts. Undoing a cut on a party member that no longer fits takes it out of the party.
  const cut = i => {
    const next = ((cuts[i] || 0) + 1) % (MAX_CUTS + 1);
    setCuts(c => ({ ...c, [i]: next }));
    if (party.includes(i) && spent - cost(i) + cutCost(STARTERS[i][2], next) > LIMIT) setParty(p => p.filter(x => x !== i));
  };

  const blocked = i => !party.includes(i) && (cost(i) > left || party.length >= MAX_PARTY);
  const shown = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return STARTERS.map((_, i) => i).filter(i => words.every(w => KEYS[i].includes(w)) && !(fits && blocked(i)));
    // blocked depends on party and left, both covered by `party`
  }, [query, fits, party, cuts]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = i => setParty(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  const report = teamReport(members(party, builds, data));
  const { threats, gaps, swap } = report;
  const worst = report.rows.filter(r => r.weak > r.resist).sort((a, b) => b.weak - b.resist - (a.weak - a.resist)).slice(0, 5);

  return (
    <section className="planner" id="starters" ref={root} aria-labelledby="starters-title">
      <div className="total-side">
        <div>
          <h2 id="starters-title" data-reveal>Spend your 10 points</h2>
          <p data-reveal>Classic gives you 10 starter points and Endless gives 15. Each starter has a cost, and candy can lower it twice. Pick up to six below. If you have bought a cost cut in the game, tap the cost on that starter to lower it here too.</p>
          <p className="community" data-reveal>
            Player favourites for Classic, from the <a href="https://pokerogue-tierlist.vercel.app/" target="_blank" rel="noreferrer">community tier list</a> (86 players, 11,465 votes, September 2026):
            with no unlocks, Zacian, Miraidon, Kyogre, Yveltal and Koraidon; fully unlocked, Yveltal, Kyogre, Zacian, Miraidon and Rayquaza.
            Opinions, not game data.
          </p>
        </div>
        <div data-reveal>
          <p className="total" ref={total} aria-hidden="true">{fmtPts(left)}</p>
          <p className="total-cap">{left === 1 ? 'point' : 'points'} left to spend</p>
        </div>
      </div>

      <div className="editor-col" data-reveal><PartyEditor party={party} builds={builds} setBuild={setBuild} data={data} /></div>

      <div className="receipt-col" data-reveal>
      <div className="paper zig receipt" aria-live="polite">
        <h3>Your party</h3>
        <ol>
          {party.length ? party.map(i => (
            <li key={i}>
              <button type="button" onClick={() => toggle(i)} aria-label={`Remove ${STARTERS[i][0]}`}>
                <span>{STARTERS[i][0]}{cuts[i] ? <small> candy ×{cuts[i]}</small> : null}</span><b aria-hidden="true" /><span>{cuts[i] ? <s>{STARTERS[i][2]}</s> : null}{fmtPts(cost(i))}</span>
              </button>
            </li>
          )) : <li className="empty">Nobody yet. Three 3-cost starters and a 1-cost is a common opener.</li>}
        </ol>
        {backup && (
          <p className="notice">Showing a shared team. Your own team was replaced.{' '}
            <button type="button" className="text-btn" onClick={() => { setParty(backup.party); setBuilds(backup.builds); setCuts(backup.cuts); setBackup(null); }}>Undo</button>
          </p>
        )}
        {party.length > 0 && <>
          <h3>Watch out for</h3>
          {threats.length ? <><p>Double damage to most of your team, and nobody resists it.</p><Chips list={threats} /></> : <p>No attack type hits most of this team without someone resisting it.</p>}
          {worst.length > 0 && (
            <ol className="tally" aria-label="Attack types the team is weakest to">
              {worst.map(r => <li key={r.type}><span>{cap(r.type)}</span><b aria-hidden="true" /><span>{r.weak} weak, {r.resist} resist</span></li>)}
            </ol>
          )}
          <h3>Your team is not strong against</h3>
          {gaps.length ? <><p>No move on your team hits these for double (or your team's own types, where no moves are picked).</p><Chips list={gaps} /></> : <p>Your team can hit every type for double.</p>}
          {swap && <>
            <h3>Could swap out</h3>
            <p>{swap.name}: weak to {swap.weakTo.map(cap).join(', ')}, which already hit most of the team. A {swap.types.map(cap).join(' or ')} type would cover more.</p>
          </>}
        </>}
        <p className="inverted"><span>Spent</span><span>{fmtPts(spent)} of {LIMIT}</span></p>
        {party.length > 0 && (
          <p className="receipt-actions">
            <button type="button" className="text-btn" onClick={share}>{copied ? 'Link copied' : 'Copy share link'}</button>
            <button type="button" className="text-btn" onClick={() => setParty([])}>Clear party</button>
          </p>
        )}
      </div>

      <CloudTeams party={party} builds={builds} setParty={setParty} setBuilds={setBuilds} />
      </div>

      <div className="picker" data-reveal>
        <div className="find">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search a name or type, like Gible or dragon" aria-label="Search starters" autoComplete="off" />
          <label><input type="checkbox" checked={fits} onChange={e => setFits(e.target.checked)} /> Only show what fits</label>
        </div>
        <p className="count" aria-live="polite">{shown.length ? `Showing ${shown.length} of ${STARTERS.length} starters, cheapest first` : 'No starters match. Try a shorter name or a type like water.'}</p>
        <ul className="mons">
          {shown.map(i => {
            const [n, id, base, t] = STARTERS[i], k = cuts[i] || 0, c = fmtPts(cost(i));
            return (
              <li key={id} className="mon-li">
                <button type="button" className="mon" aria-pressed={party.includes(i)} disabled={blocked(i)} onClick={() => toggle(i)} aria-label={`${n}, costs ${c}${k ? ` after ${k} candy cut${k > 1 ? 's' : ''}` : ''}, ${t} type`}>
                  <img src={sprite(id)} alt="" loading="lazy" width="96" height="96" />
                  <span className="mon-n">{n}</span>
                  <span className="dots">{t.split(' ').map(x => <i key={x} style={{ '--t': TYPE_COLOR[x] }} />)}</span>
                </button>
                {/* the cost is its own button (not inside the tile), so it still works when the starter doesn't fit yet */}
                <button type="button" className={`mon-c${k ? ' cut' : ''}${party.includes(i) ? ' on' : ''}`} onClick={() => cut(i)}
                  title={k < MAX_CUTS ? 'Lower the cost with candy' : 'Back to full cost'}
                  aria-label={`${n} cost ${c}. ${k < MAX_CUTS ? `Apply candy cut ${k + 1} of ${MAX_CUTS}` : 'Remove candy cuts'}`}>
                  {k ? <s>{base}</s> : null}{c}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="note">Tap a cost to apply the candy cuts you have bought: each takes off 1 point, and a 1-cost starter halves instead (½, then ¼). Tap again after two to reset. The team check uses the form and moves set in each build sheet.</p>
      </div>
    </section>
  );
}
