// Type colours for chips.
export const TYPE_COLOR = { normal:'#86866A', fire:'#E8743F', water:'#4E8FE0', electric:'#C29410', grass:'#5BAE4C', ice:'#36A2A8', fighting:'#C03A2E', poison:'#9447A8', ground:'#AE8732', flying:'#766FD8', psychic:'#E5577F', bug:'#7F9418', rock:'#9C842C', ghost:'#6655A0', dragon:'#6A3DE8', dark:'#5E4C3E', steel:'#74749C', fairy:'#CC64AA' };

// Attacker: [super effective on, not very effective on, no effect on].
export const CHART = {
  normal:[[],['rock','steel'],['ghost']], fire:[['grass','ice','bug','steel'],['fire','water','rock','dragon'],[]],
  water:[['fire','ground','rock'],['water','grass','dragon'],[]], electric:[['water','flying'],['electric','grass','dragon'],['ground']],
  grass:[['water','ground','rock'],['fire','grass','poison','flying','bug','dragon','steel'],[]], ice:[['grass','ground','flying','dragon'],['fire','water','ice','steel'],[]],
  fighting:[['normal','ice','rock','dark','steel'],['poison','flying','psychic','bug','fairy'],['ghost']], poison:[['grass','fairy'],['poison','ground','rock','ghost'],['steel']],
  ground:[['fire','electric','poison','rock','steel'],['grass','bug'],['flying']], flying:[['grass','fighting','bug'],['electric','rock','steel'],[]],
  psychic:[['fighting','poison'],['psychic','steel'],['dark']], bug:[['grass','psychic','dark'],['fire','fighting','poison','flying','ghost','steel','fairy'],[]],
  rock:[['fire','ice','flying','bug'],['fighting','ground','steel'],[]], ghost:[['psychic','ghost'],['dark'],['normal']],
  dragon:[['dragon'],['steel'],['fairy']], dark:[['psychic','ghost'],['fighting','dark','fairy'],[]],
  steel:[['ice','rock','fairy'],['fire','water','electric','steel'],[]], fairy:[['fighting','dragon','dark'],['fire','poison','steel'],[]],
};

export const TYPES = Object.keys(CHART);
export const cap = t => t[0].toUpperCase() + t.slice(1);

// Damage multiplier of an attack type against a (one or two) type defender.
export const mult = (atk, def) => def.reduce((m, d) =>
  m * (CHART[atk][2].includes(d) ? 0 : CHART[atk][0].includes(d) ? 2 : CHART[atk][1].includes(d) ? 0.5 : 1), 1);

// Chip text colour: dark on the light type colours, white on the dark ones (WCAG relative luminance).
const lum = hex => hex.match(/\w\w/g).map(h => parseInt(h, 16) / 255)
  .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
export const typeInk = t => (1.05 / (lum(TYPE_COLOR[t]) + 0.05) >= 4.5 ? '#fff' : '#0f1f10');
