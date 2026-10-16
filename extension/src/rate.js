// Rates a reward-screen item S to E for this run. These are rules of thumb, not game data: each rating comes with the
// reason, built from the run (wave, money, held items), your party (HP, fainted, types, moves, abilities) and the item.
import { ALL_MOVES } from '../../src/data/all-moves.js';
import { SPECIAL_FORMS } from '../../src/data/megas.js';

export const TIERS = ['E', 'D', 'C', 'B', 'A', 'S'];
const at = (t, why) => ({ tier: t, why });
const shift = (t, n) => TIERS[Math.max(0, Math.min(5, TIERS.indexOf(t) + n))];

// Held items and charms worth a lot in most runs, with why.
const BASE = {
  LEFTOVERS: ['S', 'Heals every turn; one of the best held items.'], MULTI_LENS: ['S', 'Extra hit on every attack.'],
  MINI_BLACK_HOLE: ['S', 'Steals a held item from the foe every turn.'], SHELL_BELL: ['A', 'Heals from damage dealt.'],
  HEALING_CHARM: ['A', 'Every heal is stronger for the rest of the run.'], LOCK_CAPSULE: ['A', 'Lets you keep good rarities when you reroll.'],
  EXP_SHARE: ['A', 'Levels the whole team, not just who fought.'], SUPER_EXP_CHARM: ['A', 'Much more Exp for everyone.'],
  SHINY_CHARM: ['B', 'More shinies, so more luck.'], EXP_CHARM: ['B', 'More Exp for everyone.'], LUCKY_EGG: ['B', 'More Exp for the holder.'],
  GOLDEN_PUNCH: ['B', 'Turns damage into money.'], SCOPE_LENS: ['B', 'More critical hits.'], KINGS_ROCK: ['B', 'Chance to make the foe flinch.'],
  QUICK_CLAW: ['B', 'Sometimes moves first.'], FOCUS_BAND: ['B', 'Sometimes survives a knockout hit.'], REVIVER_SEED: ['B', 'Revives the holder once.'],
  SOUL_DEW: ['B', 'Strengthens the holder’s nature.'], BERRY_POUCH: ['B', 'Berries are sometimes not used up.'], CANDY_JAR: ['B', 'Rare Candies give more levels.'],
  RARER_CANDY: ['B', 'A level for the whole team.'], TERA_ORB: ['B', 'Lets you Terastallize.'], MAP: ['B', 'Choose your next biome.'],
  DNA_SPLICERS: ['B', 'Fuse two Pokémon (see the fusion tab in the guide).'], BASE_STAT_BOOSTER: ['B', 'Permanent stat boost.'],
  RARE_CANDY: ['C', 'One level for one Pokémon.'], GRIP_CLAW: ['C', 'Sometimes steals the foe’s item.'], WIDE_LENS: ['C', 'Better accuracy.'],
  MEMORY_MUSHROOM: ['C', 'Relearn a forgotten move.'], MINT: ['C', 'Fix a bad nature.'], ABILITY_CHARM: ['C', 'More hidden abilities on wild Pokémon.'],
  CATCHING_CHARM: ['C', 'More critical catches.'], MYSTICAL_ROCK: ['C', 'Longer weather and terrain.'], TERA_SHARD: ['C', 'Changes one Tera type.'],
  VOUCHER: ['C', 'An egg pull after the run.'], VOUCHER_PLUS: ['B', 'A better egg pull after the run.'], VOUCHER_PREMIUM: ['A', 'The best egg pull after the run.'],
  BERRY: ['C', 'A one-time berry.'], SPECIES_STAT_BOOSTER: ['C', 'Only helps one particular Pokémon.'], RARE_SPECIES_STAT_BOOSTER: ['C', 'Only helps one particular Pokémon.'],
  EVOLUTION_ITEM: ['C', 'Good if someone on your team evolves with it.'], RARE_EVOLUTION_ITEM: ['C', 'Good if someone on your team evolves with it.'],
  FORM_CHANGE_ITEM: ['C', 'Good if someone on your team changes form with it.'], EVIOLITE: ['C', 'Strong on Pokémon that can still evolve.'],
  PP_UP: ['D', 'A little more PP for one move.'], PP_MAX: ['D', 'More PP for one move.'], IV_SCANNER: ['D', 'Shows wild Pokémon IVs.'],
  LURE: ['D', 'More double battles.'], SUPER_LURE: ['D', 'More double battles.'], MAX_LURE: ['D', 'More double battles.'],
  DIRE_HIT: ['D', 'More crits for a few battles.'], TEMP_STAT_STAGE_BOOSTER: ['D', 'A boost for a few battles.'], BATON: ['D', 'Only for Baton Pass teams.'],
  ETHER: ['D', 'You rarely run out of PP.'], MAX_ETHER: ['D', 'You rarely run out of PP.'], ELIXIR: ['D', 'You rarely run out of PP.'], MAX_ELIXIR: ['D', 'You rarely run out of PP.'],
};
const STATUS_ORB_ABILITIES = /Guts|Poison Heal|Toxic Boost|Flare Boost|Quick Feet|Marvel Scale/i;
const SETUP = /Swords Dance|Dragon Dance|Nasty Plot|Calm Mind|Quiver Dance|Shell Smash|Bulk Up|Belly Drum|Shift Gear|Coil|Victory Dance/;

export function rateItem(o, run) {
  const party = run.party || [];
  const alive = party.filter(p => p.currentHP > 0);
  const fainted = party.length - alive.length;
  const missing = alive.reduce((s, p) => s + (p.maxHP - p.currentHP), 0) / Math.max(1, alive.reduce((s, p) => s + p.maxHP, 0));
  const statused = alive.some(p => p.status);
  const early = run.wave < 100;
  const types = new Set(party.flatMap(p => (p.types || []).map(t => t.toLowerCase())));
  const id = o.id || '';

  // Healing and revives: worth as much as your team is hurt.
  if (/POTION|FULL_RESTORE/.test(id)) {
    const t = missing > 0.5 ? 'A' : missing > 0.25 ? 'B' : missing > 0.1 ? 'C' : 'E';
    return at(/MAX_POTION|FULL_RESTORE|HYPER/.test(id) && missing > 0.25 ? shift(t, 1) : t, `Your team is missing ${Math.round(missing * 100)}% of its HP.`);
  }
  if (id === 'SACRED_ASH') return at(fainted >= 2 ? 'S' : fainted ? 'A' : 'E', fainted ? `${fainted} fainted: revives them all.` : 'Nobody has fainted.');
  if (/REVIVE/.test(id)) return at(fainted ? (id === 'MAX_REVIVE' ? 'S' : 'A') : 'D', fainted ? `${fainted} of your team fainted.` : 'Nobody has fainted.');
  if (id === 'FULL_HEAL') return at(statused ? 'B' : 'E', statused ? 'Someone has a status.' : 'Nobody has a status.');

  // Poké Balls: most useful while you are still building the team.
  const balls = { POKEBALL: ['C', 'D'], GREAT_BALL: ['B', 'C'], ULTRA_BALL: ['B', 'C'], ROGUE_BALL: ['A', 'B'], MASTER_BALL: ['S', 'A'] };
  if (balls[id]) return at(balls[id][early && party.length < 6 ? 0 : 1], early && party.length < 6 ? 'Your team has room and it is early: good for catching.' : 'Less useful with a full team late on.');

  // Money: buys shop items and rerolls, worth most early.
  const money = { NUGGET: ['C', 'D'], BIG_NUGGET: ['B', 'C'], RELIC_GOLD: ['A', 'B'] };
  if (money[id]) return at(money[id][early ? 0 : 1], early ? 'Money early buys rerolls and shop items.' : 'Money matters less late in the run.');
  if (id === 'AMULET_COIN') return at(early ? 'A' : 'B', 'More money from every battle' + (early ? ', with many battles left.' : '.'));

  // TMs: judged by the move. Whether your team can learn it isn't checked.
  if (o.tm) {
    const name = (o.name || '').split(' - ').slice(1).join(' - ');
    const m = ALL_MOVES[name];
    if (!m) return at('C', 'Check who can learn it.');
    if (m[1] === 'X') return SETUP.test(name) ? at('B', `${name} sets up a sweep.`) : at('D', `${name} is a status move.`);
    const stab = types.has(m[0]);
    const t = m[2] >= 90 ? 'A' : m[2] >= 70 ? 'B' : 'C';
    return at(stab ? t : shift(t, -1), `${name}: ${m[2] || 'varies'} power${stab ? ', same type as one of your Pokémon' : ', a coverage move'}. Check who can learn it.`);
  }

  // Type boosters: great when someone attacks with that type.
  if (o.moveType) {
    const stab = types.has(o.moveType);
    const uses = party.some(p => (p.moveset || []).some(n => ALL_MOVES[n]?.[0] === o.moveType && ALL_MOVES[n]?.[1] !== 'X'));
    return at(stab ? 'A' : uses ? 'B' : 'E', stab ? `Boosts ${o.moveType} moves, a type on your team.` : uses ? `Someone has a ${o.moveType} move.` : `Nobody uses ${o.moveType} moves.`);
  }

  // Mega Bracelet / Dynamax Band: only if your team has the form.
  if (id === 'MEGA_BRACELET' || id === 'DYNAMAX_BAND' || id === 'RARE_FORM_CHANGE_ITEM') {
    const kind = id === 'DYNAMAX_BAND' ? 'gmax' : 'mega';
    const who = party.filter(p => SPECIAL_FORMS.some(f => f.kind === kind && f.name === p.name)).map(p => p.name);
    return at(who.length ? (id === 'RARE_FORM_CHANGE_ITEM' ? 'B' : 'A') : 'E', who.length ? `${who.join(', ')} can ${kind === 'mega' ? 'Mega Evolve' : 'Gigantamax'}.` : `Nobody on your team can ${kind === 'mega' ? 'Mega Evolve' : 'Gigantamax'}.`);
  }
  if (id === 'TOXIC_ORB' || id === 'FLAME_ORB') {
    const who = party.filter(p => STATUS_ORB_ABILITIES.test(`${p.ability} ${p.passiveAbility}`)).map(p => p.name);
    return at(who.length ? 'A' : 'E', who.length ? `${who.join(', ')} gains from being statused.` : 'Hurts the holder unless its ability uses the status.');
  }

  if (BASE[id]) {
    const [t, why] = BASE[id];
    const have = (run.held || []).filter(h => h === id).length;
    return at(have >= 3 ? shift(t, -1) : t, why + (have ? ` You already have ${have}.` : ''));
  }
  return at('C', 'No rule for this one yet.');
}
