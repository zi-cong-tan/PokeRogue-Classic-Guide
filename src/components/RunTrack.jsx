import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { FIGHTS, KINDS } from '../data/fights';

gsap.registerPlugin(useGSAP);

const pos = wave => `${(wave - 0.5) / 2}%`;

export default function RunTrack() {
  const root = useRef(null);
  const waveNum = useRef(null);
  const [sel, setSel] = useState(0);
  const prevWave = useRef(FIGHTS[0].wave);
  const fight = FIGHTS[sel];

  // Entrance: the run unrolls left to right, then each fight drops onto it in wave order.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({
      wide: '(min-width: 701px) and (prefers-reduced-motion: no-preference)',
      phone: '(max-width: 700px) and (prefers-reduced-motion: no-preference)',
    }, ({ conditions: { phone } }) => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.seg', phone
          ? { scaleY: 0, transformOrigin: 'center top', duration: 0.5, stagger: 0.035 }
          : { scaleX: 0, transformOrigin: 'left center', duration: 0.5, stagger: 0.035 })
        .from('.pin', { [phone ? 'x' : 'y']: phone ? 28 : -28, opacity: 0, duration: 0.55, ease: 'back.out(2)', stagger: 0.07 }, '-=0.35')
        .from('.tick, .legend li', { opacity: 0, y: 8, duration: 0.4, stagger: 0.03 }, '-=0.4')
        .from('.detail > *', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, '-=0.3');
    });
  }, { scope: root });

  // On selection: the wave number counts to the new wave and the text rises in.
  useGSAP(() => {
    const counter = { n: prevWave.current };
    prevWave.current = fight.wave;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(counter, {
        n: fight.wave, duration: 0.6, ease: 'power2.out',
        onUpdate: () => { if (waveNum.current) waveNum.current.textContent = Math.round(counter.n); },
      });
      gsap.from('.detail-text > *', { opacity: 0, y: 14, duration: 0.45, stagger: 0.06, ease: 'power2.out' });
    });
  }, { scope: root, dependencies: [sel] });

  const onKey = e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (sel + step + FIGHTS.length) % FIGHTS.length;
    setSel(next);
    root.current.querySelectorAll('.pin')[next].focus();
  };

  return (
    <section className="run" ref={root} aria-labelledby="run-title">
      <div className="run-head">
        <h2 id="run-title">The run, wave by wave</h2>
        <p>Biome changes every 10 waves. Tap a marker, or use the arrow keys.</p>
      </div>

      <div className="track-scroll">
        <div className="track" role="group" aria-label="Fixed fights" onKeyDown={onKey}>
          <div className="segs" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => <i key={i} className={`seg${i === 19 ? ' last' : ''}`} />)}
          </div>
          <div className="ticks" aria-hidden="true">
            {[1, 50, 100, 150, 200].map(w => <span key={w} className="tick" style={{ '--p': pos(w) }}>{w}</span>)}
          </div>
          {FIGHTS.map((f, i) => (
            <button
              key={f.wave}
              type="button"
              className="pin"
              aria-pressed={i === sel}
              aria-label={`Wave ${f.wave}: ${f.title}`}
              tabIndex={i === sel ? 0 : -1}
              style={{ '--p': pos(f.wave), '--c': KINDS[f.kind].color, '--h': `${i % 2 ? 52 : 14}px` }}
              onClick={() => setSel(i)}
            >
              <b />
            </button>
          ))}
        </div>
      </div>

      <div className="detail" style={{ '--c': KINDS[fight.kind].color }} aria-live="polite">
        <div className="wave" ref={waveNum}>{fight.wave}</div>
        <div className="detail-text" key={sel}>
          <h3>{fight.title}{fight.range && <small> waves {fight.range}</small>}</h3>
          <p>{fight.text}</p>
        </div>
      </div>

      <ul className="legend">
        {Object.entries(KINDS).filter(([k]) => k !== 'town').map(([k, v]) => (
          <li key={k} style={{ '--c': v.color }}>{v.label}</li>
        ))}
      </ul>
    </section>
  );
}
