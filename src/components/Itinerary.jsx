import { useEffect, useRef, useState } from 'react';
import { useReveal, countTo, gsap, MOTION_OK } from '../motion';
import { RUN, FINAL } from '../data/fights';
import { animated } from '../art';
import Trainer from './Trainer';
import { RIVALS } from '../data/rivals';
import { sprite } from '../art';

const ALL = [...RUN.flatMap(g => g.rows), FINAL];
const TALL = 200; // trainers are drawn at whole-pixel scale, about this tall

function Who({ f }) {
  if (f.mon) return <img className="who" src={animated(f.mon)} alt={f.title} width="160" height="160" />;
  return <Trainer id={f.who} tall={TALL} label={f.shown ? f.shown.replace('Shown: ', '').split('.')[0] : f.title} />;
}

// A rival fight's team: each slot is one of the Pokémon shown (rival-party-config.ts in the game).
function RivalTeam({ wave }) {
  const r = RIVALS.find(x => x.wave === wave);
  if (!r) return null;
  return (
    <ol className="rival-team" aria-label="Their team, slot by slot">
      {r.slots.map((s, i) => (
        <li key={i}>
          <span className="rival-slot">{s.pool.length > 1 ? `Slot ${i + 1}, one of ${s.pool.length}` : `Slot ${i + 1}`}</span>
          <span className="rival-mons">
            {s.pool.slice(0, 6).map(([n, id]) => <img key={n} src={sprite(id)} alt={n} title={n} width="96" height="96" loading="lazy" />)}
            {s.pool.length > 6 && <small>+{s.pool.length - 6} more</small>}
          </span>
          {s.pool.length === 1 && <strong>{s.pool[0][0]}</strong>}
          {s.note && <span className="rival-note">{s.note[0].toUpperCase() + s.note.slice(1)}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function Itinerary() {
  const root = useReveal();
  const num = useRef(null);
  const who = useRef(null);
  const prev = useRef(ALL[0].n);
  const [sel, setSel] = useState(ALL[0]);

  // On a new pick the wave counts up and the trainer steps in from the left.
  useEffect(() => {
    countTo(num.current, prev.current, sel.n);
    if (prev.current !== sel.n && window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(who.current, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    }
    prev.current = sel.n;
  }, [sel]);

  const row = (f, final) => (
    <li key={f.title + f.at} className={final ? 'final' : undefined}>
      <button type="button" aria-pressed={sel === f} onClick={() => setSel(f)}>
        <span>{f.title}</span><b aria-hidden="true" /><span>{final ? `wave ${f.at}` : f.at}</span>
      </button>
    </li>
  );

  return (
    <section className="itin" id="run" ref={root} aria-labelledby="run-title">
      <div className="itin-text">
        <h2 id="run-title" data-reveal>The run, wave by wave</h2>
        <p data-reveal>The biome changes every 10 waves and every wave ending in 0 is a boss. Between those, these fights are fixed. Pick one on the schedule.</p>
        <div className="pick" aria-live="polite" data-reveal>
          <div className="pick-who" ref={who}><Who f={sel} /></div>
          <div className="pick-text">
            <p className="pick-wave"><span ref={num}>{sel.n}</span>{sel.at.includes(' ') && <small> {sel.at.replace(String(sel.n), '').trim()}</small>}</p>
            <h3>{sel.title}</h3>
            <p>{sel.text}</p>
            {sel.shown && <p className="pick-shown">{sel.shown}</p>}
            {sel.title.startsWith('Rival') && <RivalTeam wave={sel.n} />}
          </div>
        </div>
      </div>
      <div className="paper zig" data-reveal>
        {RUN.map(g => (
          <div key={g.group}>
            <h3>{g.group}</h3>
            <ol>{g.rows.map(f => row(f))}</ol>
          </div>
        ))}
        <ol>{row(FINAL, true)}</ol>
      </div>
    </section>
  );
}
