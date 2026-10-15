// Fixed Classic fights, from src/enums/fixed-boss-waves.ts in the PokeRogue source (Oct 2026).
export const KINDS = {
  town: { label: 'Town', color: '#B4AEE6' },
  rival: { label: 'Rival', color: '#FFD36B' },
  evil: { label: 'Evil team', color: '#FF8A8A' },
  league: { label: 'Elite Four & Champion', color: '#6EE0B8' },
  final: { label: 'Final boss', color: '#FF6FB5' },
};

export const FIGHTS = [
  { wave: 5, kind: 'town', title: 'Youngster in Town', text: 'A fixed trainer to teach the ropes. Your first real check that the team works.' },
  { wave: 8, kind: 'rival', title: 'Rival, round 1', text: 'Your rival brings a starter of their own. Easy, but it is your first fixed trainer fight.' },
  { wave: 25, kind: 'rival', title: 'Rival, round 2', text: 'Their team has grown. Usually the first fight that punishes a single carry.' },
  { wave: 35, kind: 'evil', title: 'Evil team grunt', text: "First brush with the region's villain team. Which team you meet is set by the run's seed." },
  { wave: 55, kind: 'rival', title: 'Rival, round 3', text: 'Mid-game rival. Expect evolved Pokemon and coverage moves.' },
  { wave: 62, kind: 'evil', range: '62 to 66', title: 'Evil team hideout', text: 'Grunts on waves 62 and 64, then an admin on 66. Three fights in five waves.' },
  { wave: 95, kind: 'rival', title: 'Rival, round 4', text: 'The halfway point of the run. Their team now covers its weaknesses.' },
  { wave: 112, kind: 'evil', range: '112 to 115', title: 'Evil team, second strike', text: "Grunt on 112, admin on 114, and the team's boss on 115." },
  { wave: 145, kind: 'rival', title: 'Rival, round 5', text: 'A full, strong team. Treat it like a gym leader.' },
  { wave: 164, kind: 'evil', range: '164 to 165', title: 'Evil boss rematch', text: 'An admin on 164, then the boss again on 165 with a stronger team.' },
  { wave: 182, kind: 'league', range: '182 to 190', title: 'Elite Four and Champion', text: 'Elite Four on waves 182, 184, 186 and 188, then the Champion on 190. Spend money here.' },
  { wave: 195, kind: 'rival', title: 'Rival, final round', text: 'The last fight before the end. Their strongest team.' },
  { wave: 200, kind: 'final', title: 'Eternatus', text: 'The final boss of Classic. It is Poison and Dragon, so Ground, Psychic, Ice and Dragon moves hit it for double. It is very bulky: bring stat boosts or status.' },
];
