// What the vague words in each encounter really mean, and which option to take when. Written by reading each
// file in src/data/mystery-encounters/encounters/ in the PokeRogue source (Oct 2026). The picks are advice.
// key: { fight: what "battle" means there, rewards: what you actually get, pick: [[situation, option]] }
export const ENCOUNTER_NOTES = {
  A_TRAINERS_TEST: {
    fight: 'One of Cheryl, Marley, Mira, Riley or Buck, at a higher level than normal trainers.',
    rewards: 'Win: an Epic egg, a Relic Gold and two Rogue-tier items. Refuse: a full heal and a Rare egg.',
    pick: [['Your lead can win a hard trainer fight', 'Accept: an Epic egg beats a Rare one'], ['Your team is hurt', 'Refuse: the heal and the egg are free']],
  },
  ABSOLUTE_AVARICE: {
    fight: 'A Greedent boss with three health bars (Thrash, Crunch, Body Press, Slack Off) and raised Sp. Def (and Speed after wave 50).',
    rewards: 'Win: your berries back plus its hoard. Reason with it: some berries back and Reviver Seeds. Let it have the food: Greedent joins your team.',
    pick: [['You rely on berries and can take a long fight', 'Battle it'], ['You want a free, bulky Normal type', 'Let it have the food']],
  },
  BERRIES_ABOUND: {
    fight: 'A strong wild Pokémon of the biome, at boosted level and with two or more health bars.',
    rewards: 'Berries to pick from. Racing compares your fastest Pokémon with the guard: faster means berries without a fight, slower means the fight starts with the guard boosted.',
    pick: [['You have a very fast Pokémon', 'Race to the bush'], ['Your team is slow but strong', 'Battle it']],
  },
  CLOWNING_AROUND: {
    fight: 'A Harlequin trainer with a boss Mr. Mime (Teeter Dance, Psychic) and a boss Blacephalon (Mind Blown, Shadow Ball, Hypnosis).',
    rewards: 'Win: one Pokémon gets a random ability from Sturdy, Pickup, Intimidate, Guts, a weather or terrain setter, Magician, Sheer Force or Prankster. Stay calm: your most-equipped Pokémon has its held items rerolled into Ultra and Rogue items. Insult back: your team\'s types get shuffled.',
    pick: [['One Pokémon holds many weak items', 'Remain unprovoked'], ['A key Pokémon has a poor ability', 'Battle the clown'], ['Never, unless types do not matter to you', 'Return the insults']],
  },
  DANCING_LESSONS: {
    fight: 'An Oricorio boss with +1 Attack, Defense, Sp. Atk and Sp. Def. Its style depends on the biome.',
    rewards: 'Win: a Baton. Learn its dance: any Pokémon learns Revelation Dance (its type follows the user). Show a dance: Oricorio joins you.',
    pick: [['Something on your team wants a STAB special move', 'Learn its dance'], ['You want a new team member', 'Show it a dance']],
  },
  DARK_DEAL: {
    fight: 'You hand over a random party Pokémon, then fight a catchable boss of its types: cost 6 (35%), 7 (50%), 8 (10%) or 9 to 10 (5%), holding the lost Pokémon\'s items.',
    rewards: '5 Rogue Balls up front, used to catch that boss.',
    pick: [['You have a weak member you would swap for a legendary-level one', 'Accept'], ['Every party member is essential', 'Refuse']],
  },
  DELIBIRDY: {
    fight: 'No battle.',
    rewards: 'Money gives an Amulet Coin, a berry gives a Candy Jar, a Reviver Seed gives a Berry Pouch, any held item gives a Healing Charm. Already maxed: a Shell Bell instead.',
    pick: [['You have spare money', 'Give money for an Amulet Coin (more money later)'], ['You hold a useless item', 'Give an item for a Healing Charm']],
  },
  DEPARTMENT_STORE_SALE: {
    fight: 'No battle.',
    rewards: 'TM counter: five TMs (common to ultra). Vitamin counter: vitamins and PP Ups. Battle items: X items and Dire Hits. Poké Ball counter: balls up to Rogue Balls.',
    pick: [['A Pokémon is missing a coverage move', 'TM counter'], ['You plan to catch a strong Pokémon soon', 'Poké Ball counter'], ['Otherwise', 'Vitamin counter: permanent stat gains']],
  },
  FIERY_FALLOUT: {
    fight: 'Two Volcarona (not bosses) with +1 Sp. Def and Speed, using Fire Spin and Quiver Dance.',
    rewards: 'Find the source: a held item for your lead plus more items. Hunker down: everyone loses 20% HP and one Pokémon may be burned but can gain Heatproof. A Fire type helping: no fight, a Fire-type booster item and Exp.',
    pick: [['You have a Fire type', 'Your fire-resistant Pokémon helps'], ['You can beat two Volcarona', 'Find the source'], ['Avoid', 'Hunker down']],
  },
  FIGHT_OR_FLIGHT: {
    fight: 'A wild Pokémon of the biome as a boss, at boosted level and with +2 to one random stat.',
    rewards: 'One item, by wave: Great tier up to wave 40, Ultra to 120, Rogue to 160, Master after 160. Stealing with the right move skips the fight.',
    pick: [['Late in the run (Rogue or Master item)', 'Battle, or steal if you can'], ['Early with a weak team', 'Leave']],
  },
  FUN_AND_GAMES: {
    fight: 'A Wobbuffet you hit for 3 turns, trying to leave its HP in a target range.',
    rewards: 'By how close you get: Multi Lens, Scope Lens or Wide Lens.',
    pick: [['You have a weak, precise attacker and spare money', 'Play the game'], ['Money is tight', 'Leave']],
  },
  GLOBAL_TRADE_SYSTEM: {
    fight: 'No battle.',
    rewards: 'Trade offers for a party Pokémon, a Wonder Trade (a random special Pokémon, shiny or hidden-ability chances boosted), or an item traded up to a better one.',
    pick: [['You carry a weak member', 'Wonder Trade or check trade offers'], ['Your team is set', 'Trade an item']],
  },
  LOST_AT_SEA: {
    fight: 'No battle.',
    rewards: 'A Pokémon that can learn Surf or Fly guides you and gains Exp. Otherwise every Pokémon loses 25% HP.',
    pick: [['Anyone can learn Surf or Fly', 'Let it help'], ['No one can', 'Wander (25% HP each)']],
  },
  MYSTERIOUS_CHALLENGERS: {
    fight: 'Standard: a normal trainer. Strong: a trainer with a stronger party, one level step up. Mightiest: an Elite Four-sized party, a level and a half step up.',
    rewards: 'Standard: TM (common), TM (great) and a Memory Mushroom. Strong: two Ultra and two Great items. Mightiest: two Rogue, one Ultra and one Great item.',
    pick: [['Your team is far ahead of the waves', 'The mightiest foe'], ['You need a forgotten move back', 'Standard (Memory Mushroom)'], ['Otherwise', 'The strong foe']],
  },
  MYSTERIOUS_CHEST: {
    fight: 'The trap (30%) is a Gimmighoul boss with Nasty Plot, Shadow Ball, Power Gem and Thief.',
    rewards: '25%: two Common and two Great items. 30%: three Ultra items. 10%: two Rogue items. 5%: one Master item.',
    pick: [['Healthy team that can handle a Ghost boss', 'Open it: 70% of the time it pays'], ['Low on HP', 'Leave']],
  },
  PART_TIMER: {
    fight: 'No battle.',
    rewards: 'Money. Deliveries pay by Speed, warehouse work by HP plus Attack and Defense, sales by knowing the right moves. The worker\'s moves drop to 2 PP each.',
    pick: [['You have a very fast Pokémon', 'Make deliveries'], ['You have a bulky physical attacker', 'Warehouse work']],
  },
  SAFARI_ZONE: {
    fight: 'No battle: three wild Pokémon you try to catch with bait, mud and balls.',
    rewards: 'Possibly rare Pokémon from the safari pool.',
    pick: [['You want to catch and have money', 'Enter'], ['Team is full and set', 'Leave']],
  },
  SHADY_VITAMIN_DEALER: {
    fight: 'No battle.',
    rewards: 'Both deals give one Pokémon two random vitamins. The cheap deal can also randomly change its nature.',
    pick: [['The Pokémon has a bad nature anyway', 'The cheap deal'], ['Its nature matters', 'The pricey deal']],
  },
  SLUMBERING_SNORLAX: {
    fight: 'A boss Snorlax (Body Slam, Crunch, Sleep Talk, Rest) holding Sitrus and Enigma berries and an HP Up.',
    rewards: 'Win or steal: Leftovers. Waiting heals your team but costs time.',
    pick: [['Someone knows a stealing move', 'Steal its item'], ['Team is hurt', 'Wait for it to move'], ['Otherwise', 'Battle it for Leftovers']],
  },
  TELEPORTING_HIJINKS: {
    fight: 'Inspecting the machine starts a fight with a boosted boss Pokémon.',
    rewards: 'Pay or let an Electric or Steel type help: you teleport to a random new biome (that one also gains Exp). Inspect: Magnet and Metal Coat.',
    pick: [['You want out of this biome', 'An Electric or Steel Pokémon helps'], ['You want items', 'Inspect the machine']],
  },
  BUG_TYPE_SUPERFAN: {
    fight: 'A Bug-type trainer whose team grows with the wave.',
    rewards: 'Win: teach any Pokémon a Bug move. Show Bug types: a gift item, better the more you bring. Gift a Bug item: a gift item.',
    pick: [['You carry Bug types', 'Show your Bug types'], ['Otherwise', 'Offer to battle for a Bug move tutor']],
  },
  THE_EXPERT_POKEMON_BREEDER: {
    fight: 'A one-on-one battle with one of your three lowest-friendship Pokémon against the breeder\'s baby Pokémon, evolved by wave (stage 2 from wave 45, final from 75).',
    rewards: 'Win: friendship for that Pokémon and eggs: the weaker it is (lower stat total, cheaper starter), the more eggs, up to 5 Common plus Rare ones. Lose: it loses all friendship.',
    pick: [['Several choices can win', 'Pick the weakest one that still wins: more eggs'], ['None can win alone', 'Pick the strongest to avoid losing friendship']],
  },
  THE_POKEMON_SALESMAN: {
    fight: 'No battle.',
    rewards: 'A Pokémon with its hidden ability (sometimes a shiny Magikarp instead) for up to 4× the base price.',
    pick: [['The offer fills a gap on your team', 'Accept'], ['Money is tight', 'Refuse']],
  },
  THE_STRONG_STUFF: {
    fight: 'A Shuckle boss with five health bars (Infestation, Salt Cure, Gastro Acid, Heal Order), +1 Defense and Sp. Def, holding five berries.',
    rewards: 'Win: a Soul Dew. Approach: one Pokémon\'s strongest stats drop by 15 while the others gain 10.',
    pick: [['You have a reliable special attacker', 'Battle the Shuckle'], ['A Pokémon has uneven stats you want flattened', 'Approach']],
  },
  THE_WINSTRATE_CHALLENGE: {
    fight: 'Five trainers in a row (Victor, Victoria, Vivi, Vicky, Vito) with set teams and held items, no healing between.',
    rewards: 'Win: a Macho Brace (Master tier) and a premium voucher. Refuse: a full heal and a Rarer Candy.',
    pick: [['Strong, healthy team', 'Accept'], ['Team is worn down', 'Refuse']],
  },
  TRAINING_SESSION: {
    fight: 'Your chosen Pokémon fights a copy of itself as a boss with 2 to 5 health bars (more later in the run).',
    rewards: 'Light: two random IVs go up. Moderate: choose a new nature. Heavy: choose a new ability.',
    pick: [['Bad nature', 'Moderate'], ['Bad ability', 'Heavy'], ['Otherwise', 'Light']],
  },
  TRASH_TO_TREASURE: {
    fight: 'A Gigantamax Garbodor boss (Gunk Shot, Stomping Tantrum, Hammer Arm, Payback) holding berries, stat boosters and eggs.',
    rewards: 'Win: Leftovers plus a Rogue, an Ultra and a Great item. Dig: Leftovers and a Shell Bell, but a Black Sludge makes shop items cost 2.5× from then on.',
    pick: [['You can beat the boss', 'Investigate: better rewards, no shop penalty'], ['Rarely', 'Dig: the shop penalty lasts the whole run']],
  },
  UNCOMMON_BREED: {
    fight: 'A catchable boss Pokémon that knows one of its egg moves, with raised defenses (and Speed after wave 150).',
    rewards: 'Feed it four berries or befriend it with a move: it joins with better IVs, no fight.',
    pick: [['You want it on the team', 'Befriend it or give it food'], ['You want Exp and items', 'Battle it']],
  },
  WEIRD_DREAM: {
    fight: 'Show them to me: a fight against stronger versions of your own team.',
    rewards: 'I see them: your team turns into new species, two with about +100 base stat total and the rest about +45. Show them: great rewards. Leave: your Pokémon lose 10% of their levels.',
    pick: [['Your team is weak or unfinished', 'I see them'], ['Your team is built and strong', 'Show them to me']],
  },
};
