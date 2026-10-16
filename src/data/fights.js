// Fixed Classic fights, from src/enums/fixed-boss-waves.ts in the PokeRogue source (Oct 2026).
// Gym leaders: the first lands on wave 20 or 30 at random, then one every 30 waves.
// n = the wave the counter lands on; at = what the itinerary prints.
const gym = (a, b, who, name) => ({
  n: a, at: `${a} or ${b}`, title: 'Gym leader', kind: 'gym', who, shown: `Shown: ${name}. Leaders come from every region at random.`,
  text: `A gym leader on wave ${a} or ${b}, decided by the run. Leaders keep coming every 30 waves after the first.`,
});

const ROCKET = 'Shown: a Team Rocket grunt. Your run may meet a different villain team.';
const RIVAL = 'Shown: Finn. Your rival is Finn or Ivy, depending on the character you play.';

export const RUN = [
  { group: 'Waves 1 to 50', rows: [
    { n: 5, at: '5', title: 'Youngster in Town', who: 'youngster_m', text: 'A fixed trainer to teach the ropes. Your first real check that the team works.' },
    { n: 8, at: '8', title: 'Rival, round 1', who: 'rival_m', shown: RIVAL, text: 'Your rival brings a starter of their own. Easy, but it is your first fixed trainer fight.' },
    gym(20, 30, 'brock', 'Brock'),
    { n: 25, at: '25', title: 'Rival, round 2', who: 'rival_m', shown: RIVAL, text: 'Their team has grown. Usually the first fight that punishes a single carry.' },
    { n: 35, at: '35', title: 'Evil team grunt', who: 'rocket_grunt_m', shown: ROCKET, text: "First brush with the region's villain team. Which team you meet is set by the run's seed." },
    gym(50, 60, 'misty', 'Misty'),
  ] },
  { group: 'Waves 51 to 100', rows: [
    { n: 55, at: '55', title: 'Rival, round 3', who: 'rival_m', shown: RIVAL, text: 'Mid-game rival. Expect evolved Pokemon and coverage moves.' },
    { n: 62, at: '62 to 66', title: 'Evil team hideout', who: 'petrel', shown: 'Shown: Petrel, a Team Rocket admin. ' + ROCKET.slice(ROCKET.indexOf('Your')), text: 'Grunts on waves 62 and 64, then an admin on 66. Three fights in five waves.' },
    gym(80, 90, 'lt_surge', 'Lt. Surge'),
    { n: 95, at: '95', title: 'Rival, round 4', who: 'rival_m', shown: RIVAL, text: 'The halfway point of the run. Their team now covers its weaknesses.' },
  ] },
  { group: 'Waves 101 to 150', rows: [
    gym(110, 120, 'erika', 'Erika'),
    { n: 112, at: '112 to 115', title: 'Evil team, second strike', who: 'rocket_boss_giovanni_1', shown: 'Shown: Giovanni, boss of Team Rocket. ' + ROCKET.slice(ROCKET.indexOf('Your')), text: "Grunt on 112, admin on 114, and the team's boss on 115." },
    gym(140, 150, 'sabrina', 'Sabrina'),
    { n: 145, at: '145', title: 'Rival, round 5', who: 'rival_m', shown: RIVAL, text: 'A full, strong team. Treat it like a gym leader.' },
  ] },
  { group: 'Waves 151 to 199', rows: [
    { n: 164, at: '164 to 165', title: 'Evil boss rematch', who: 'rocket_boss_giovanni_1', shown: 'Shown: Giovanni, boss of Team Rocket. ' + ROCKET.slice(ROCKET.indexOf('Your')), text: 'An admin on 164, then the boss again on 165 with a stronger team.' },
    gym(170, 180, 'blaine', 'Blaine'),
    { n: 182, at: '182 to 188', title: 'Elite Four', who: 'lorelei', shown: 'Shown: Lorelei. The run picks one region, and all four come from its league.', text: 'Elite Four members on waves 182, 184, 186 and 188, all from one region. Spend money here.' },
    { n: 190, at: '190', title: 'Champion', who: 'lance', shown: 'Shown: Lance. The Champion comes from the same region as the Elite Four.', text: 'The Champion, straight after the Elite Four. Heal up first: no biome change in between.' },
    { n: 195, at: '195', title: 'Rival, final round', who: 'rival_m', shown: RIVAL, text: 'The last fight before the end. Their strongest team.' },
  ] },
];

export const FINAL = {
  n: 200, at: '200', title: 'Eternatus', mon: 890,
  text: 'The final boss of Classic. It is Poison and Dragon, so Ground, Psychic, Ice and Dragon moves hit it for double. It is very bulky: bring stat boosts or status.',
};

// Trainer sprites from pokerogue-assets/images/trainer (CC BY-NC-SA 4.0). Each file is an atlas;
// [x, y, w, h] is the first frame, [W, H] the whole sheet.
export const FRAMES = {
  youngster_m: [1, 1, 42, 57, 125, 125],
  rival_m: [0, 0, 41, 69, 69, 69],
  rocket_grunt_m: [0, 0, 42, 65, 65, 65],
  petrel: [0, 0, 80, 80, 80, 80],
  rocket_boss_giovanni_1: [0, 0, 39, 79, 79, 79],
  brock: [132, 1, 30, 60, 164, 164],
  misty: [60, 1, 53, 74, 276, 276],
  lt_surge: [73, 83, 67, 81, 249, 249],
  erika: [50, 1, 46, 73, 222, 222],
  sabrina: [282, 149, 56, 77, 393, 393],
  blaine: [142, 83, 35, 81, 229, 229],
  lorelei: [0, 0, 39, 80, 80, 80],
  lance: [134, 1, 61, 76, 241, 241],
};
