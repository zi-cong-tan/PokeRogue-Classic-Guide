import { useReveal } from '../motion';

const TIPS = [
  ['When do bosses show up?', 'Every wave that ends in 0. A boss closes out each biome, and your team is fully healed when the biome changes, so spend healing items freely just before a 0 wave.'],
  ['When are the gym leaders?', 'The first is on wave 20 or 30, decided by the run, then one every 30 waves. Normal trainers never spawn within two waves of a fixed fight.'],
  ['What should I save money for?', 'Waves 182 to 200: four Elite Four members, the Champion, your rival and Eternatus, nearly back to back. You will buy more healing there than in the rest of the run.'],
  ['Is the Map worth taking?', 'Yes, early. Without one the next biome is random. With one you choose between the open links and can route toward the Pokemon you still need.'],
  ['What makes a run worth it?', 'New species, not wins. Each new line becomes a starter and pays candy. A run that ends on wave 60 with eight new lines still moved your account forward.'],
  ['How do I beat Eternatus?', 'It is Poison and Dragon, so Ground, Psychic, Ice and Dragon moves hit it for double. It is very bulky: bring stat boosts or status, not just raw power.'],
  ['How is Endless different?', 'You get 15 starter points instead of 10, bosses come every 50 waves, and Eternatus returns every 250th wave.'],
  ['Why do cheap starters level so slowly?', 'Candy prices run the other way: a 1-cost starter needs 40 candy for its passive, a 9-cost one only 10. Catch plenty of the cheap lines you like.'],
  ['Which types does the team check use?', "Each starter's first-stage types. A starter that evolves can change type, so check again once your team is built out."],
];

export default function Tips() {
  const root = useReveal();
  return (
    <section className="tips" id="tips" ref={root} aria-labelledby="tips-title">
      <h2 id="tips-title" data-reveal>Things worth knowing</h2>
      <div className="tips-text">
        {TIPS.map(([q, a]) => <p key={q} data-reveal><strong>{q}</strong> {a}</p>)}
      </div>
    </section>
  );
}
