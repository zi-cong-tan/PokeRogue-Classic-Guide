import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '../motion';
import { biomeArt } from '../art';

export default function Footer() {
  const root = useRef(null);

  // The card turns over: its back rises out of the black as you reach the end, tied to the scroll.
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.from('.back', { yPercent: 35, rotate: -2, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 35%', scrub: true } });
    });
  }, { scope: root });

  return (
    <footer className="foot" ref={root}>
      <div className="back">
        <div className="back-msg">
          <h2>See you on wave 200</h2>
          <p>A fan guide by Zi Cong Tan. Numbers checked against the PokeRogue source in October 2026. The game updates often, so if something has changed, tell me and I will fix it.</p>
        </div>
        <div className="back-addr">
          <img className="stamp" src={biomeArt('Space')} alt="The Space biome, as a stamp" width="88" height="117" loading="lazy" />
          <a href="https://github.com/zi-cong-tan/PokeRogue-Guide-Aesthetic">This guide on GitHub</a>
          <a href="https://github.com/zi-cong-tan/PokeRogue-Guide-Aesthetic/issues">Report a change</a>
          <a href="https://github.com/pagefaultgames/pokerogue">PokeRogue source code</a>
          <a href="https://github.com/PokeAPI/sprites">PokeAPI sprites</a>
        </div>
        <p className="imprint">
          Biome and trainer art from <a href="https://github.com/pagefaultgames/pokerogue-assets">pokerogue-assets</a> by Pagefault Games, CC BY-NC-SA 4.0.
          Not affiliated with PokeRogue. Pokemon belongs to Nintendo, Creatures and GAME FREAK.
        </p>
      </div>
    </footer>
  );
}
