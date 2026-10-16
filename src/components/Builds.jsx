import { useEffect, useState } from 'react';
import { useReveal } from '../motion';
import { STARTERS } from '../data/starters';
import { SPECIAL_FORMS } from '../data/megas';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import { sprite } from '../art';
import { TACTICS, tacticStarters, fusionPicks } from '../advice';
import { useTeam, members, useRun } from '../run';

const STAT = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const Chip = ({ t }) => <span className="ty" style={{ '--t': TYPE_COLOR[t], '--ti': typeInk(t) }}>{cap(t)}</span>;
const sum = a => a.reduce((x, y) => x + y, 0);

function Pick({ s, F }) {
  const [, , cost] = STARTERS[s.i];
  return (
    <li>
      <img src={sprite(F[s.form][1])} alt="" width="96" height="96" loading="lazy" />
      <span><strong>{F[s.form][0]}</strong><small>from {STARTERS[s.i][0]}, cost {cost}, total {s.total}</small></span>
    </li>
  );
}

function Tactics({ data }) {
  const [key, setKey] = useState('seed');
  const t = TACTICS.find(x => x.key === key);
  const list = data ? tacticStarters(t, data, data.BUILDS.map(b => (b ? b[3] : []))) : [];
  const cheap = list.filter(s => STARTERS[s.i][2] <= 3);
  return (
    <div className="tactics">
      <div className="tabs" role="group" aria-label="Tactic">
        {TACTICS.map(x => <button key={x.key} type="button" aria-pressed={x.key === key} onClick={() => setKey(x.key)}>{x.name}</button>)}
      </div>
      <p className="tactic-how">{t.how} <span>Items that help: {t.items}.</span></p>
      {!data ? <p className="hint">Loading every starter's moves...</p> : (
        <div className="tactic-lists">
          <div><h4>Strongest that can run it</h4><ol className="picks-list">{list.slice(0, 6).map(s => <Pick key={s.i} s={s} F={data.FORMS} />)}</ol></div>
          <div><h4>Cheap picks (cost 1 to 3)</h4><ol className="picks-list">{cheap.slice(0, 6).map(s => <Pick key={s.i} s={s} F={data.FORMS} />)}</ol></div>
        </div>
      )}
      {data && <p className="hint">{list.length} starters can run this, counting level-up, TM and egg moves of any form in their line. Ranked by base stats; abilities and passives are up to you.</p>}
    </div>
  );
}

function Fusions({ data }) {
  const team = useTeam();
  if (!team.party.length) return <p className="hint">Pick a party in the starter planner and the best DNA Splicer pairs for it show here.</p>;
  if (!data) return <p className="hint">Loading...</p>;
  const ms = members(team.party, team.builds, data).map((m, k) => {
    const i = team.party[k];
    const line = data.LINES[i];
    const form = line.find(f => data.FORMS[f][0] === m.name) || line[0];
    return { ...m, stats: data.FORMS[form][3], id: data.FORMS[form][1] };
  });
  if (ms.length < 2) return <p className="hint">Fusion needs two party members.</p>;
  const picks = fusionPicks(ms).slice(0, 3);
  return (
    <ol className="fusion-picks">
      {picks.map(p => (
        <li key={p.a + p.b}>
          <p><strong>{p.a}</strong> + {p.b}</p>
          <p className="chips">{p.types.map(t => <Chip key={t} t={t} />)}</p>
          <p className="small">Total {p.total}{p.fewerWeak > 0 ? `, ${p.fewerWeak} fewer weaknesses than ${p.a}` : ''}{p.newType ? ', gains a type' : ''}</p>
        </li>
      ))}
    </ol>
  );
}

function SpecialForms({ data }) {
  const team = useTeam();
  const run = useRun();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('mega');
  const [mine, setMine] = useState(false);
  const [all, setAll] = useState(false);
  // Your run's lines: the planner's starters, plus the line of anything you caught (a caught Charmander counts Charizard).
  const caught = run.caught || [];
  const lines = new Set(team.party.map(i => STARTERS[i][0]));
  if (data) data.LINES.forEach((line, i) => { if (line.some(f => caught.includes(data.FORMS[f][0]))) lines.add(STARTERS[i][0]); });
  const words = q.toLowerCase().trim();
  const list = SPECIAL_FORMS.filter(f => f.kind === kind && (!mine || lines.has(f.starter) || caught.includes(f.name)) && (!words || `${f.name} ${f.starter}`.toLowerCase().includes(words))).sort((a, b) => sum(b.stats) - sum(a.stats));
  return (
    <div className="special">
      <div className="special-filters">
        <div className="tabs" role="group" aria-label="Form">
          <button type="button" aria-pressed={kind === 'mega'} onClick={() => setKind('mega')}>Mega and Primal</button>
          <button type="button" aria-pressed={kind === 'gmax'} onClick={() => setKind('gmax')}>Gigantamax</button>
        </div>
        <label className="check-line"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} /> Only my run's Pokémon</label>
        <input type="search" className="special-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search, like Charizard" aria-label="Search forms" />
      </div>
      <p className="hint">{kind === 'mega'
        ? 'Needs the Mega Bracelet (Rogue tier); Mega Stones then turn up as rare form change items. The Pokémon Mega Evolves in battle.'
        : 'Needs the Dynamax Band (Rogue tier); Max Mushrooms then turn up. In PokeRogue Gigantamax forms have their own base stats.'}</p>
      <div className="special-table" role="region" aria-label="Forms and their base stats" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Form</th><th scope="col">Types</th><th scope="col">Ability</th>{STAT.map(s => <th key={s} scope="col">{s}</th>)}<th scope="col">Total</th><th scope="col">Gain</th><th scope="col">Starter</th></tr></thead>
          <tbody>
            {(all ? list : list.slice(0, 12)).map(f => (
              <tr key={f.name + f.form}>
                <th scope="row"><img src={sprite(f.sprite)} alt="" width="96" height="96" loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = sprite(f.baseSprite); }} />{f.name} <small>{f.form}</small></th>
                <td>{f.types.split(' ').map(t => <Chip key={t} t={t} />)}</td>
                <td>{f.ability}</td>
                {f.stats.map((v, i) => <td key={i} className={f.base && v > f.base[i] ? 'up' : undefined}>{v}</td>)}
                <td><strong>{sum(f.stats)}</strong></td>
                <td>{f.base ? `+${sum(f.stats) - sum(f.base)}` : ''}</td>
                <td>{f.starter || 'Not a starter line'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && <p className="hint">{mine ? "None of your run's Pokémon has one. Starters come from the planner; add what you catch in the tracker at the top (Caught this run)." : 'No match.'}</p>}
      {mine && list.length > 0 && <p className="hint">Your starters from the planner, plus what you added under "Caught this run" in the tracker, with their evolution lines.</p>}
      {list.length > 12 && <button type="button" className="text-btn" onClick={() => setAll(v => !v)}>{all ? 'Show the top 12' : `Show all ${list.length}`}</button>}
    </div>
  );
}

export default function Builds() {
  const root = useReveal();
  const [data, setData] = useState(null);
  // The move lists are big: load them when the section comes near the screen.
  useEffect(() => {
    const el = root.current;
    if (!el || data) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        Promise.all([import('../data/learnsets'), import('../data/builds')]).then(([l, b]) => setData({ ...l, ...b }));
      }
    }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [data, root]);

  return (
    <section className="builds" id="builds" ref={root} aria-labelledby="builds-title">
      <div className="builds-head">
        <h2 id="builds-title" data-reveal>Builds, fusions and Megas</h2>
        <p data-reveal>Popular tactics and which starters can really run them, the best DNA Splicer pairs for your party, and every Mega and Gigantamax form with its stats.</p>
      </div>
      <div className="builds-body">
        <div data-reveal><h3>Tactics</h3><Tactics data={data} /></div>
        <aside className="builds-side" data-reveal><h3>DNA Splicers for your party</h3><Fusions data={data} />
          <p className="hint">Scored on the fused base stats, weaknesses it drops and a new type. The first Pokémon keeps its first type; see the fusion calculator in the shop section.</p></aside>
      </div>
      <div data-reveal><h3>Mega Evolution and Gigantamax</h3><SpecialForms data={data} /></div>
    </section>
  );
}
