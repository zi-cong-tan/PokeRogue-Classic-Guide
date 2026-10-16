// biomeLinks in src/data/balance/biomes/*.ts; [name, n] = the link opens 1 time in n.
export const BIOMES = {
  Town:[['Plains']], Plains:[['Grass'],['Metropolis'],['Lake']], Grass:[['Tall Grass']], 'Tall Grass':[['Forest'],['Cave']],
  Metropolis:[['Slum']], Forest:[['Jungle'],['Meadow']], Sea:[['Seabed'],['Ice Cave']], Swamp:[['Graveyard'],['Tall Grass']],
  Beach:[['Sea'],['Island',2]], Lake:[['Beach'],['Swamp'],['Construction Site']], Seabed:[['Cave'],['Volcano',3]],
  Mountain:[['Volcano'],['Wasteland',2],['Space',3]], Badlands:[['Desert'],['Mountain']], Cave:[['Badlands'],['Lake'],['Laboratory',2]],
  Desert:[['Ruins'],['Construction Site',2]], 'Ice Cave':[['Snowy Forest']], Meadow:[['Plains'],['Fairy Cave']],
  'Power Plant':[['Factory']], Volcano:[['Beach'],['Ice Cave',3]], Graveyard:[['Abyss']], Dojo:[['Plains'],['Jungle',2],['Temple',2]],
  Factory:[['Plains'],['Laboratory',2]], Ruins:[['Mountain'],['Forest',2]], Wasteland:[['Badlands']], Abyss:[['Cave'],['Space',2],['Wasteland',2]],
  Space:[['Ruins']], 'Construction Site':[['Power Plant'],['Dojo',2]], Jungle:[['Temple']], 'Fairy Cave':[['Ice Cave'],['Space',2]],
  Temple:[['Desert'],['Swamp',2],['Ruins',2]], Slum:[['Construction Site'],['Swamp',2]], 'Snowy Forest':[['Forest'],['Mountain',2],['Lake',2]],
  Island:[['Sea']], Laboratory:[['Construction Site'],['Island']],
};

export const BIOME_NAMES = Object.keys(BIOMES).sort((a, b) => a === 'Town' ? -1 : b === 'Town' ? 1 : a.localeCompare(b));

// Candy costs per starter cost (src/data/balance/starters.ts):
// [cost, passive, 1st cost drop, 2nd cost drop, same-species egg]
export const CANDY = [[1,40,25,60,30],[2,40,25,60,30],[3,35,20,50,25],[4,30,15,40,20],[5,25,12,35,18],[6,20,10,30,15],[7,15,8,20,12],[8,10,5,15,10],[9,10,5,15,10],[10,10,5,15,10]];
