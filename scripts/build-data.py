"""Regenerate src/data/builds.js from the PokeRogue source and its English locale files.

Run from the project root after the game updates, or after editing src/data/starters.js:

    python3 scripts/build-data.py

Downloads into scripts/.cache (delete it to force a fresh download). Python 3 standard library only.

What it reads:
  pokerogue (beta)          src/data/balance/species/generation-0X.ts  abilities, passives, level-up moves, evolutions
                            src/data/balance/moves/egg-moves.ts         the 4 egg moves per starter
  pokerogue-locales (main)  en/ability.json, en/move.json, en/pokemon.json   display names and descriptions

Not covered here: src/data/villains.js and src/data/fights.js were written by hand from
src/data/trainers/trainer-config.ts and fixed-battle-configs.ts.
"""
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".cache"
SRC = "https://raw.githubusercontent.com/pagefaultgames/pokerogue/beta/src/data/"
LOCALES = "https://raw.githubusercontent.com/pagefaultgames/pokerogue-locales/main/en/"


def fetch(url):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / url.rsplit("/", 1)[1]
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "pokerogue-field-guide data script"})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return path.read_text(encoding="utf-8")


def camel(s):
    parts = s.split("_")
    return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])


def clean(a):
    return None if a in (None, "NONE") else a


def how(e):
    """[target, how it evolves] in plain words. Conditions beyond the basic ones are summed up, not spelled out."""
    target = re.search(r"speciesId: SpeciesId\.(\w+)", e)[1]
    level, item = int(re.search(r"level: (\d+)", e)[1]), re.search(r"item: EvolutionItem\.(\w+)", e)
    time, move = re.search(r"TimeOfDay\.(\w+)", e), re.search(r"move: MoveId\.(\w+)", e)
    mtype = re.search(r"pkmnType: PokemonType\.(\w+)", e)
    words = []
    words += ["level %d" % level] if level > 1 else []
    words += [item[1].replace("_", " ").title()] if item else []
    for cond in dict.fromkeys(re.findall(r"key: EvoCondKey\.(\w+)", e)):
        if cond == "TIME" and time:
            words.append("at night" if time[1] in ("NIGHT", "DUSK") else "during the day")
        elif cond == "MOVE" and move:
            words.append("knowing " + move[1].replace("_", " ").title())
        elif cond == "MOVE_TYPE" and mtype:
            words.append(f"knowing a {mtype[1].title()} move")
        else:
            words.append({"FRIENDSHIP": "high friendship", "BIOME": "being in a certain biome", "GENDER": "its gender",
                          "WEATHER": "certain weather", "NATURE": "its nature", "HELD_ITEM": "holding a certain item",
                          "SPECIES_CAUGHT": "having caught a certain Pokemon", "TYROGUE": "its highest stat"}.get(cond, "a special condition"))
    return [target, " + ".join(words) or "level 1"]


# --- species: every block, plus the extra fields on starters
species, starters, forms = {}, {}, {}
for g in range(1, 10):
    text = fetch(f"{SRC}balance/species/generation-0{g}.ts")
    for block in re.split(r"\n  generation\w+SpeciesData\[SpeciesId\.", text)[1:]:
        sid = block.split("]", 1)[0]
        head = block.split("forms:", 1)[0]  # top-level abilities, not each form's
        ab = [clean((re.search(k + r": AbilityId\.(\w+)", head) or [None, None])[1])
              for k in ("ability1", "ability2", "abilityHidden")]
        evo = block.split("evolutions: [", 1)[1].split("\n    ],", 1)[0] if "evolutions: [" in block else ""
        species[sid] = {"ab": ab, "evos": list(dict.fromkeys(re.findall(r"speciesId: SpeciesId\.(\w+)", evo)))}
        stat = lambda k: int(re.search(k + r": (\d+)", head)[1])
        lm = block.split("levelMoves: [", 1)[1].split("\n    ],", 1)[0] if "levelMoves: [" in block else ""
        lm = lm.replace("EVOLVE_MOVE", "0").replace("RELEARN_MOVE", "-1")
        forms[sid] = {
            "types": " ".join(t.lower() for t in re.findall(r"type[12]: PokemonType\.(\w+)", head)),
            "stats": [stat(k) for k in ("baseHp", "baseAtk", "baseDef", "baseSpatk", "baseSpdef", "baseSpd")],
            "level": [[int(l), m] for l, m in re.findall(r"\[(-?\d+), MoveId\.(\w+)\]", lm)],
            "tms": re.findall(r"MoveId\.(\w+)", block.split("tms: [", 1)[1].split("]", 1)[0]) if "tms: [" in block else [],
            "how": list(map(list, dict.fromkeys(tuple(how(e)) for e in re.findall(r"new Species(?:Form)?Evolution\(\{(.*?)\}\)", evo, re.S)))),
        }

        cost = re.search(r"\n    starterCost: (\d+)", block)
        if not cost:
            continue
        passive = (re.search(r"\n    passives: AbilityId\.(\w+)", block)
                   or re.search(r"\n    passives: \{\s*\n\s*0: AbilityId\.(\w+)", block))  # per-form passives: take form 0
        moves = block.split("levelMoves: [", 1)[1].split("\n    ],", 1)[0] if "levelMoves: [" in block else ""
        moves = moves.replace("EVOLVE_MOVE", "0").replace("RELEARN_MOVE", "-1")
        start = [m for lvl, m in re.findall(r"\[(-?\d+), MoveId\.(\w+)\]", moves) if 0 < int(lvl) <= 5]
        starters[sid] = {"cost": int(cost.group(1)), "ab": ab, "passive": passive.group(1) if passive else None, "start": start}

egg_moves = {sid: re.findall(r"MoveId\.(\w+)", moves) for sid, moves in
             re.findall(r"\[SpeciesId\.(\w+)\]: \[([^\]]+)\]", fetch(f"{SRC}balance/moves/egg-moves.ts"))}
ability_names = json.loads(fetch(LOCALES + "ability.json"))
move_names = json.loads(fetch(LOCALES + "move.json"))
pokemon_names = json.loads(fetch(LOCALES + "pokemon.json"))

# --- the guide's starter list, in its own order
js = (ROOT / "src/data/starters.js").read_text(encoding="utf-8")
guide = json.loads(js.split("export const STARTERS = ", 1)[1].split(";\n", 1)[0])


def species_key(name):
    special = {"Nidoran (female)": "NIDORAN_F", "Nidoran (male)": "NIDORAN_M", "Type: Null": "TYPE_NULL"}
    if name in special:
        return special[name]
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    for word, prefix in (("Alolan ", "ALOLA "), ("Galarian ", "GALAR "), ("Hisuian ", "HISUI "), ("Paldean ", "PALDEA ")):
        if name.startswith(word):
            name = prefix + name[len(word):]
    return re.sub(r"[^A-Z0-9]+", "_", name.upper().replace("'", "").replace(".", "")).strip("_")


def display_name(sid):
    for prefix, word in (("ALOLA_", "Alolan "), ("GALAR_", "Galarian "), ("HISUI_", "Hisuian "), ("PALDEA_", "Paldean ")):
        if sid.startswith(prefix) and camel(sid[len(prefix):]) in pokemon_names:
            return word + pokemon_names[camel(sid[len(prefix):])]
    if camel(sid) in pokemon_names:
        return pokemon_names[camel(sid)]
    return sid.title().replace("_", " ")


builds, evos, used_ab, used_mv, problems = [], [], set(), set(), []
for name, _sprite, cost, _types in guide:
    sid = species_key(name)
    s = starters.get(sid)
    if not s:
        problems.append(f"{name}: no starter called {sid} in the source")
        builds.append(None); evos.append([])
        continue
    if s["cost"] != cost:
        problems.append(f"{name}: cost is {s['cost']} in the source, {cost} in starters.js")
    eggs = egg_moves.get(sid, [])
    used_ab.update(a for a in s["ab"] + [s["passive"]] if a)
    used_mv.update(s["start"] + eggs)
    builds.append([s["ab"], s["passive"], s["start"], eggs])

    chain, queue, seen = [], list(species[sid]["evos"]), set()
    while queue:  # every Pokemon it can evolve into, branches included
        e = queue.pop(0)
        if e in seen or e not in species:
            continue
        seen.add(e)
        used_ab.update(a for a in species[e]["ab"] if a)
        chain.append([display_name(e), species[e]["ab"]])
        queue += species[e]["evos"]
    evos.append(chain)

missing = set(starters) - {species_key(n) for n, *_ in guide}
if missing:
    problems.append("starters in the source but not in starters.js: " + ", ".join(sorted(missing)))


def named(key, table, text_field):
    entry = table.get(camel(key), {})
    return [entry.get("name", key.title().replace("_", " ")), entry.get(text_field, "")]


abilities = {a: named(a, ability_names, "description") for a in sorted(used_ab)}
moves = {m: named(m, move_names, "effect") for m in sorted(used_mv)}

j = lambda o: json.dumps(o, separators=(",", ":"), ensure_ascii=False)
out = (
    "// Per-starter build options, in the same order as STARTERS. From src/data/balance/species/*.ts and\n"
    "// src/data/balance/moves/egg-moves.ts in the PokeRogue source; names from pokerogue-locales.\n"
    "// Generated by scripts/build-data.py, do not edit by hand.\n"
    "// [[ability 1, ability 2, hidden ability], passive, moves learned by level 5, the 4 egg moves (4th is the rare one)]\n"
    f"export const BUILDS = {j(builds)};\n\n// key: [name, description]\nexport const ABILITIES = {j(abilities)};\n\n"
    f"export const MOVES = {j(moves)};\n\n"
    "// Every Pokemon each starter can evolve into, in order: [name, [ability 1, ability 2, hidden ability]].\n"
    f"export const EVOS = {j(evos)};\n"
)
(ROOT / "src/data/builds.js").write_text(out, encoding="utf-8")
# --- learnsets.js: every form in each starter's line, for the mid-run build, advice and the team check
move_src = fetch(f"{SRC}moves/move.ts")
tm_tier = dict(re.findall(r"\[MoveId\.(\w+)\]: ModifierTier\.(\w)", fetch(f"{SRC}balance/tm-pool-tiers.ts")))
risky_attrs = ("RechargeAttr", "SacrificialAttr", "SacrificialFullRestoreAttr", "OneHitKOAttr", "FixedDamageAttr",
               "LevelDamageAttr", "CounterDamageAttr")
move_data = {}
chunks = re.split(r"\n\s*new (?=\w+Move\(\s*MoveId\.)", move_src)[1:]
for c in chunks:
    m = re.match(r"(\w+Move)\(\s*MoveId\.(\w+),\s*PokemonType\.(\w+),\s*(?:MoveCategory\.(\w+),\s*(-?\d+),\s*(-?\d+))?", c)
    if not m or m[2] == "NONE":
        continue
    cls, key, typ, cat, power, acc = m.groups()
    power = int(power or 0)
    if "MultiHitAttr" in c and power > 0:
        hit = re.search(r"MultiHitType\.(\w+)", c)
        power *= {"TWO": 2, "THREE": 3, "TEN": 6}.get(hit[1] if hit else "", 3)  # 2 to 5 hits averages about 3
    risky = cls.startswith("Charging") or any(a in c for a in risky_attrs)
    # [type, P/S/X (status), power (0 = status or varies), accuracy (-1 = never misses), 1 if a poor default pick]
    move_data[key] = [typ.lower(), {"PHYSICAL": "P", "SPECIAL": "S"}.get(cat, "X"), max(power, 0), int(acc or -1), int(risky)]

species_ids, n = {}, 0
for k, v in re.findall(r"^\s*([A-Z0-9_]+)(?: = (\d+))?,", fetch(f"{SRC.replace('data/', 'enums/')}species-id.ts"), re.M):
    n = int(v) if v else n + 1
    species_ids[k] = n
api = {p["name"]: int(p["url"].rstrip("/").rsplit("/", 1)[1])
       for p in json.loads(fetch("https://pokeapi.co/api/v2/pokemon?limit=2000"))["results"]}


def sprite_id(sid, fallback):
    for prefix, suffix in (("ALOLA_", "-alola"), ("GALAR_", "-galar"), ("HISUI_", "-hisui"), ("PALDEA_", "-paldea")):
        if sid.startswith(prefix):
            return api.get(sid[len(prefix):].lower().replace("_", "-") + suffix, fallback)
    return species_ids.get(sid, fallback) if species_ids.get(sid, 99999) < 10000 else fallback


move_list, move_ix = [], {}
def mi(key):
    if key not in move_ix:
        move_ix[key] = len(move_list)
        move_list.append(key)
    return move_ix[key]


form_out, lines = {}, []
for (name, sprite, _cost, _types), b in zip(guide, builds):
    sid = species_key(name)
    if not b:
        lines.append([]); continue
    chain, queue = [], [sid]
    while queue:
        f = queue.pop(0)
        if f in chain or f not in forms:
            continue
        chain.append(f)
        queue += [t for t, _ in forms[f]["how"]]
    tms = {sid: forms[sid]["tms"]}
    for f in chain:
        for t, _ in forms[f]["how"]:
            tms.setdefault(t, list(dict.fromkeys(forms.get(t, {"tms": []})["tms"] + tms[f])))
    for f in chain:
        if f in form_out:
            continue
        d = forms[f]
        form_out[f] = [display_name(f), sprite if f == sid else sprite_id(f, sprite), d["types"], d["stats"],
                       [x for lm in d["level"] for x in (lm[0], mi(lm[1])) if lm[1] in move_data],
                       [mi(t) for t in tms[f] if t in move_data], d["how"]]
    for e in b[3]:
        mi(e)
    lines.append(chain)

moves_out = [[named(k, move_names, "effect")[0], *move_data[k], tm_tier.get(k, "")] for k in move_list]
out2 = (
    "// Every form in each starter's line, its moves and how it evolves. From src/data/balance/species/*.ts,\n"
    "// src/data/moves/move.ts and src/data/balance/tm-pool-tiers.ts in the PokeRogue source.\n"
    "// Generated by scripts/build-data.py, do not edit by hand.\n\n"
    "// [name, type, P physical / S special / X status, power (0 = status or varies; multi-hit counted as 2 or 3 hits),\n"
    "//  accuracy (-1 never misses), 1 if a poor default pick (recharge, charge-up, faints, one-hit KO, fixed damage), TM tier C/G/U]\n"
    f"export const MOVE_LIST = {j(moves_out)};\n\n"
    "// Move keys in the same order, so egg moves and starting moves (by key) can be looked up.\n"
    f"export const MOVE_KEYS = {j(move_list)};\n\n"
    "// form key: [name, PokeAPI sprite id, types, [HP, Atk, Def, SpA, SpD, Spe],\n"
    "//  level-up moves as flat [level, move index, ...] (0 = on evolving, -1 = relearn only), TM move indexes,\n"
    "//  [[form it evolves into, how]]]\n"
    f"export const FORMS = {j(form_out)};\n\n"
    "// Per starter, in STARTERS order: its own form key first, then everything it can evolve into.\n"
    f"export const LINES = {j(lines)};\n"
)
(ROOT / "src/data/learnsets.js").write_text(out2, encoding="utf-8")
print(f"Wrote src/data/learnsets.js: {len(form_out)} forms, {len(move_list)} moves, {len(out2) // 1024} KB")
# --- encounters.js: Mystery Encounters in Classic (src/data/mystery-encounters + the English dialogue files)
ME = f"{SRC}mystery-encounters/"
consts = fetch(f"{SRC.replace('data/', '')}constants.ts")
me_waves = [int(x) for x in re.search(r"CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES[^=]*= \[(\d+), (\d+)\]", consts).groups()]
me_rate = {k: int(re.search(k + r" = (\d+)", consts)[1]) for k in
           ("BASE_MYSTERY_ENCOUNTER_SPAWN_WEIGHT", "MYSTERY_ENCOUNTER_SPAWN_MAX_WEIGHT", "WEIGHT_INCREMENT_ON_SPAWN_MISS",
            "AVERAGE_ENCOUNTERS_PER_RUN_TARGET")}
tier_src = fetch(f"{SRC.replace('data/', 'enums/')}mystery-encounter-tier.ts")
tier_share = [float(x) for x in re.search(r"aim for ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)%", tier_src).groups()]
tier_weight = {k: int(v) for k, v in re.findall(r"(COMMON|GREAT|ULTRA|ROGUE) = (\d+)", tier_src)}
biome_src = fetch(ME + "mystery-encounter-biomes.ts")
tree = json.loads(fetch("https://api.github.com/repos/pagefaultgames/pokerogue/contents/src/data/mystery-encounters/encounters?ref=beta"))


def biome_group(name):
    body = re.search(name + r"[^=\n]*=\s*\[(.*?)\];", biome_src, re.S)[1]
    return re.findall(r"^\s*(?:BiomeId|MysteryEncounterType)\.(\w+)", body, re.M)  # skips commented-out (disabled) lines


groups = {"extremeBiomeEncounters": "EXTREME_ENCOUNTER_BIOMES", "nonExtremeBiomeEncounters": "NON_EXTREME_ENCOUNTER_BIOMES",
          "humanTransitableBiomeEncounters": "HUMAN_TRANSITABLE_BIOMES", "civilizationBiomeEncounters": "CIVILIZATION_ENCOUNTER_BIOMES"}
by_biome = {}
for enc_list, biome_list in groups.items():
    for e in biome_group(enc_list):
        by_biome.setdefault(e, set()).update(biome_group(biome_list))
for e in biome_group("anyBiomeEncounters"):
    by_biome[e] = {"ANY"}
for b, encs in re.findall(r"\[BiomeId\.(\w+),\s*\[(.*?)\]\s*,?\s*\]", biome_src.split("mysteryEncountersByBiome", 1)[1], re.S):
    for e in re.findall(r"MysteryEncounterType\.(\w+)", encs):
        by_biome.setdefault(e, set()).add(b)

SPECIES_WORDS = {"liepard", "greedent", "oricorio", "blacephalon", "volcarona", "delibird", "wobbuffet", "snorlax", "shuckle"}
GENERIC = [(r"(?i)primaryName|pokemon|pokeName|leader", "your Pokémon"), (r"(?i)item", "an item"), (r"(?i)move", "a move"),
           (r"(?i)ability", "an ability"), (r"(?i)^num|count|amount|percent|price|cost", "some"), (r"(?i)type", "a type")]


def fill(text, tokens):
    def sub(m):
        k, fmt = m[1], m[2]
        if fmt == "money":
            return "money"
        if k in tokens:
            return tokens[k]
        base = k[:-4] if k.endswith("Name") else ""
        if base.lower() in SPECIES_WORDS:
            return base.capitalize()
        return next((word for pat, word in GENERIC if re.search(pat, k)), "it")
    text = re.sub(r"\{\{(\w+)(?:,\s*(\w+))?\}\}", sub, text)
    text = re.sub(r"@\[\w+\]\{", "", text).replace("}", "")
    # Read naturally where a runtime name was swapped for "your Pokémon" / "an item".
    for a, b in (("The your Pokémon", "The Pokémon"), ("the your Pokémon", "the Pokémon"), ("a your Pokémon", "a Pokémon"),
                 ("Your your Pokémon", "Your Pokémon"), ("a an item", "an item"), ("This your Pokémon", "This Pokémon"),
                 ("That your Pokémon", "That Pokémon"), ("Pay money", "Pay money")):
        text = text.replace(a, b)
    text = re.sub(r"(\([+?-]\) )y", r"\1Y", text)
    return text[:1].upper() + text[1:]


encounters = []
for f in tree:
    src = fetch(ME + "encounters/" + f["name"])
    etype = re.search(r"MysteryEncounterType\.(\w+)", src.split("withEncounterType", 1)[1])[1] if "withEncounterType" in src else None
    if not etype or etype not in by_biome:
        continue  # disabled in the biome table
    dialogue = json.loads(fetch(f"https://raw.githubusercontent.com/pagefaultgames/pokerogue-locales/main/en/mystery-encounters/{f['name'].replace('-encounter.ts', '-dialogue.json')}"))
    known = dict(re.findall(r"const (\w+)(?:: \w+)? = (\d+);", src))
    known.update({c: named(m, move_names, "effect")[0] for c, m in re.findall(r"const (\w+)(?:: \w+)? = MoveId\.(\w+);", src)})
    tokens = {}
    for k, expr in re.findall(r'setDialogueToken\("(\w+)", ([^;]*)\)', src):
        c = next((c for c in re.findall(r"\b[A-Z][A-Z0-9_]+\b", expr) if c in known), None)
        if c:
            tokens.setdefault(k, known[c])
    tier = re.search(r"withEncounterTier\(MysteryEncounterTier\.(\w+)\)", src)
    wr = re.search(r"withSceneWaveRangeRequirement\(([^)]*)\)", src)[1]
    lo, hi = (me_waves if wr.startswith("...") else [me_waves[0] if "[0]" in a else me_waves[1] if "[1]" in a else int(a)
                                                       for a in wr.split(", ")])
    party = re.search(r"withScenePartySizeRequirement\((\d+)", src)
    options = []
    for k in sorted(dialogue.get("option", {}), key=lambda x: (not x.isdigit(), x)):
        o = dialogue["option"][k]
        if not isinstance(o, dict) or "label" not in o:
            continue
        options.append([fill(o["label"], tokens), fill(o.get("tooltip") or o.get("tooltipBase", ""), tokens), fill(o.get("labelDisabled", ""), tokens)])
    encounters.append({
        "key": etype, "name": fill(dialogue["title"], tokens) if re.search(r"[A-Za-z]", dialogue["title"]) else etype.replace("_", " ").title(), "tier": tier[1] if tier else "VARIES",
        "waves": [lo, hi], "party": int(party[1]) if party else 0, "once": "withMaxAllowedEncounters(1)" in src,
        "money": "withSceneMoneyRequirement" in src, "biomes": sorted(by_biome[etype]),
        "text": fill(dialogue.get("description", ""), tokens), "options": options,
    })
encounters.sort(key=lambda e: e["name"])
out3 = (
    "// Mystery Encounters in Classic. From src/data/mystery-encounters/ in the PokeRogue source and the English\n"
    "// dialogue in pokerogue-locales. Names of your own Pokémon and items are filled in by the game; here they read\n"
    "// \"your Pokémon\" or \"an item\". Generated by scripts/build-data.py, do not edit by hand.\n\n"
    "// Spawn: each eligible wave rolls BASE / MAX, and every miss adds INCREMENT until one appears. Tier weights from\n"
    "// src/enums/mystery-encounter-tier.ts.\n"
    "// share: the game's stated target split of encounters by tier, after its pity rules (Common, Great, Ultra, Rogue).\n"
    f"export const ME_RULES = {j({'waves': me_waves, **me_rate, 'weights': tier_weight, 'share': tier_share})};\n\n"
    "// biomes: BiomeId keys, or ANY. options: [label, what happens ((+) good, (-) bad, (?) depends), label when you can't pick it]\n"
    f"export const ENCOUNTERS = {j(encounters)};\n"
)
(ROOT / "src/data/encounters.js").write_text(out3, encoding="utf-8")
print(f"Wrote src/data/encounters.js: {len(encounters)} encounters, {len(out3) // 1024} KB")
print(f"Wrote src/data/builds.js: {len(builds)} starters, {len(abilities)} abilities, {len(moves)} moves, {len(out) // 1024} KB")
for p in problems:
    print("CHECK:", p)
sys.exit(1 if problems else 0)
