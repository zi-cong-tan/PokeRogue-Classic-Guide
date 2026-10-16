import { useRef, useState } from 'react';
import { useReveal, gsap, MOTION_OK } from '../motion';
import { useRun } from '../run';
import { LEAGUE, LEAGUE_TRAINERS } from '../data/league';
import { TYPE_COLOR, cap, typeInk } from '../data/types';
import Party from './Party';
import { Sheet } from './Trainer';

const ASSETS = 'https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue-assets@beta/images/';
const WAVES = [182, 184, 186, 188, 190];

// One rung of the ladder: the wave, the trainer (or the two the game picks between) and their team.
function Rung({ wave, keys, champion }) {
  return (
    <li className={champion ? 'rung champ' : 'rung'}>
      <p className="rung-wave"><span>Wave</span> {wave}</p>
      <div className="rung-who">
        {keys.map((k, i) => {
          const t = LEAGUE_TRAINERS[k];
          return (
            <div key={k} className="rung-trainer">
              {i > 0 && <p className="rung-or">or</p>}
              <div className="rung-id">
                {t.sprite && <Sheet src={ASSETS + t.sprite[0]} frame={t.sprite[1]} label={t.name} tall={110} className="rung-sprite" />}
                <div>
                  <h3>{t.name}</h3>
                  {t.type
                    ? <span className="ty" style={{ '--t': TYPE_COLOR[t.type], '--ti': typeInk(t.type) }}>{cap(t.type)}</span>
                    : <span className="rung-mixed">Mixed types</span>}
                </div>
              </div>
              <Party title={`${t.name}'s team`} slots={t.slots} />
            </div>
          );
        })}
      </div>
    </li>
  );
}

export default function League() {
  const root = useReveal();
  const ladder = useRef(null);
  const run = useRun();
  const [cur, setCur] = useState(run.region >= 0 ? run.region : 0);
  // Opens on your run's pick once you set it in the tracker.
  const [seen, setSeen] = useState(run.region);
  if (run.region !== seen) { setSeen(run.region); if (run.region >= 0) setCur(run.region); }
  const r = LEAGUE[cur];
  const pick = i => {
    setCur(i);
    if (window.matchMedia(MOTION_OK).matches) gsap.fromTo(ladder.current.children, { y: 18, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' });
  };

  return (
    <section className="league" id="league" ref={root} aria-labelledby="league-title">
      <div className="league-head">
        <h2 id="league-title" data-reveal>The last five fights</h2>
        <p data-reveal>
          Waves 182 to 188 bring the Elite Four, and 190 the Champion. They share one random pick, so the run chooses a
          region and you face that region's whole league. Each one's last Pokémon has two health bars, and most bring a Pokémon that Terastallizes.
        </p>
      </div>

      <div className="regions" role="group" aria-label="Which region's league" data-reveal>
        {LEAGUE.map((x, i) => <button key={x.region} type="button" aria-pressed={i === cur} onClick={() => pick(i)}>{x.region}</button>)}
      </div>

      <ol className="ladder" ref={ladder} aria-live="polite">
        {r.e4.map((keys, i) => <Rung key={`${r.region}-${i}`} wave={WAVES[i]} keys={keys} />)}
        <Rung key={`${r.region}-c`} wave={190} keys={r.champion} champion />
      </ol>
      <p className="note">From the game's source. Where a slot names two or three Pokémon, or a rung names two trainers, the game picks one.</p>
    </section>
  );
}
