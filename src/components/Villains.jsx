import { useRef, useState } from 'react';
import { useReveal, gsap, MOTION_OK } from '../motion';
import { VILLAINS } from '../data/villains';
import Party from './Party';
import Trainer from './Trainer';

export default function Villains() {
  const root = useReveal();
  const file = useRef(null);
  const tabs = useRef([]);
  const [cur, setCur] = useState(0);
  const v = VILLAINS[cur];

  const open = i => {
    setCur(i);
    if (window.matchMedia(MOTION_OK).matches) gsap.fromTo(file.current, { y: 12, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  };
  // Tabs follow the usual pattern: arrow keys move between them.
  const onKey = e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (cur + step + VILLAINS.length) % VILLAINS.length;
    open(next);
    tabs.current[next].focus();
  };

  return (
    <section className="villains" id="villains" ref={root} aria-labelledby="villains-title">
      <div className="villains-head">
        <h2 id="villains-title" data-reveal>The ten villain teams</h2>
        <p data-reveal>
          The grunt on wave 35 decides which team your run gets, and you keep fighting that team until its boss falls
          on wave 165. Pokemon marked below are the ones to plan for.
        </p>
      </div>

      <div className="folder" data-reveal>
        <div className="tabs" role="tablist" aria-label="Villain teams" onKeyDown={onKey}>
          {VILLAINS.map((t, i) => (
            <button
              key={t.key} type="button" role="tab" ref={el => { tabs.current[i] = el; }}
              id={`tab-${t.key}`} aria-controls="villain-file" aria-selected={i === cur} tabIndex={i === cur ? 0 : -1}
              onClick={() => open(i)}
            >{t.name}</button>
          ))}
        </div>

        <div className="file" id="villain-file" role="tabpanel" aria-labelledby={`tab-${v.key}`} ref={file}>
          <div className="file-side">
            <div className="file-people">
              <Trainer id={v.bossSprite} tall={220} label={`${v.boss}, boss of ${v.name}`} />
              <Trainer id={v.gruntSprite} tall={150} className="who grunt" label={`A ${v.name} grunt`} />
            </div>
            <h3>{v.name}</h3>
            <dl className="file-waves">
              <div><dt>Grunts</dt><dd>Waves 35, 62, 64 and 112</dd></div>
              {new Set(v.admins).size === 1
                ? <div><dt>Admins, waves 66, 114 and 164</dt><dd>{v.admins[0]}</dd></div>
                : [66, 114, 164].map((w, i) => <div key={w}><dt>Admin, wave {w}</dt><dd>{v.admins[i]}</dd></div>)}
              <div><dt>Boss, waves 115 and 165</dt><dd>{v.boss}</dd></div>
            </dl>
          </div>
          <div className="file-teams">
            <Party title={`${v.boss} on wave 115`} slots={v.first} />
            <Party title={`${v.boss} on wave 165, stronger`} slots={v.rematch} />
          </div>
        </div>
      </div>

      <p className="villains-note" data-reveal>
        Two health bars means the Pokemon is a boss: damage stops at the end of each bar, so one big hit will not take it
        down. Where a slot names two or three Pokemon, the game picks one of them.
      </p>
    </section>
  );
}
