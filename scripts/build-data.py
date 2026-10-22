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
    # API calls share endings like "beta?recursive=1", so those are cached under their whole address
    path = CACHE / (re.sub(r"[^\w.-]+", "_", url.split("//", 1)[1]) if "?" in url else url.rsplit("/", 1)[1])
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


# Forms whose PokeAPI name isn't the obvious one.
SPRITE_NAMES = {"PALDEA_TAUROS": "tauros-paldea-combat-breed", "HISUI_BASCULIN": "basculin-white-striped",
                "GALAR_DARMANITAN": "darmanitan-galar-standard", "ETERNAL_FLOETTE": "floette-eternal",
                "BLOODMOON_URSALUNA": "ursaluna-bloodmoon", "BATTLE_BOND_GRENINJA": "greninja-battle-bond"}


def sprite_id(sid, fallback):
    """PokeAPI id for a species key: special names, then regional forms (also matching their first sub-form, like
    tauros-paldea-combat-breed), then the national dex number, then the base species of a special variant."""
    if SPRITE_NAMES.get(sid) in api:
        return api[SPRITE_NAMES[sid]]
    for prefix, suffix in (("ALOLA_", "-alola"), ("GALAR_", "-galar"), ("HISUI_", "-hisui"), ("PALDEA_", "-paldea")):
        if sid.startswith(prefix):
            name = sid[len(prefix):].lower().replace("_", "-") + suffix
            if name in api:
                return api[name]
            forms_of = sorted(n for n in api if n.startswith(name + "-"))
            if forms_of:
                return api[forms_of[0]]
            return species_ids.get(sid[len(prefix):], fallback)
    n = species_ids.get(sid, 99999)
    if n < 2000:
        return n
    base = sid.split("_", 1)[-1]  # e.g. ETERNAL_FLOETTE -> FLOETTE
    return species_ids[base] if species_ids.get(base, 99999) < 2000 else fallback


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
(ROOT / "src/data/game-ids.js").write_text(
    "// Per starter, in STARTERS order: the game's SpeciesId number, the key its save data (starterData, dexData) uses.\n"
    "// Generated by scripts/build-data.py, do not edit by hand.\n"
    f"export const GAME_IDS = {j([species_ids[l[0]] for l in lines])};\n", encoding="utf-8")
(ROOT / "src/data/learnsets.js").write_text(out2, encoding="utf-8")
print(f"Wrote src/data/learnsets.js: {len(form_out)} forms, {len(move_list)} moves, {len(out2) // 1024} KB")
ASSETS = "https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/beta/images/"
_tree = None


def asset_exists(path):
    global _tree
    if _tree is None:
        _tree = {t["path"] for t in json.loads(fetch("https://api.github.com/repos/pagefaultgames/pokerogue-assets/git/trees/beta?recursive=1"))["tree"]}
    return "images/" + path in _tree


def atlas_frame(root, key):
    """[x, y, w, h, sheet w, sheet h] of the first frame in a TexturePacker atlas, or None."""
    if not asset_exists(f"{root}/{key}.json"):
        return None
    d = json.loads(fetch(f"{ASSETS}{root}/{key}.json"))
    tex = d["textures"][0] if "textures" in d else d
    frames = tex["frames"]
    f = frames[0]["frame"] if isinstance(frames, list) else next(iter(frames.values()))["frame"]
    size = tex.get("size") or d["meta"]["size"]
    return [f["x"], f["y"], f["w"], f["h"], size["w"], size["h"]]


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
    art = []
    intro = src.split("withIntroSpriteConfigs(", 1)[1].split("])", 1)[0] if "withIntroSpriteConfigs(" in src else ""
    for it in re.findall(r"\{(.*?)\}", intro, re.S) or []:
        sp = re.search(r"SpeciesId\.(\w+)", it)
        key = re.search(r'spriteKey:\s*"([^"]*)"', it)
        root = re.search(r'fileRoot:\s*"([^"]*)"', it)
        entry = None
        if sp:
            entry = ["mon", sprite_id(sp[1], species_ids.get(sp[1], 0))]
        elif key and root and root[1] in ("mystery-encounters", "trainer"):
            fr = atlas_frame(root[1], key[1])
            entry = fr and ["atlas", f"{root[1]}/{key[1]}.png", fr]
        if entry and entry not in art:
            art.append(entry)
    if not art:  # set at runtime in the game; a stand-in from the same source
        stand_in = {"DANCING_LESSONS": ("mon", "ORICORIO"), "FIERY_FALLOUT": ("mon", "VOLCARONA"),
                    "BERRIES_ABOUND": ("atlas", "mystery-encounters", "berries_abound_bush"),
                    "THE_EXPERT_POKEMON_BREEDER": ("atlas", "trainer", "expert_pokemon_breeder"),
                    "A_TRAINERS_TEST": ("atlas", "trainer", "buck")}.get(etype, ("atlas", "mystery-encounters", "encounter_exclaim"))
        if stand_in[0] == "mon":
            art.append(["mon", species_ids.get(stand_in[1], 0)])
        else:
            fr = atlas_frame(stand_in[1], stand_in[2])
            path = f"{stand_in[1]}/{stand_in[2]}.png"
            art.append(["atlas", path, fr] if fr else ["img", path])
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
        "text": fill(dialogue.get("description", ""), tokens), "options": options, "art": art[:2],
    })
# The game's MysteryEncounterType numbers (enum order), so a live battle's encounter can be looked up.
me_order = re.findall(r"^\s*([A-Z_]+),", fetch(f"{SRC.replace('data/', 'enums/')}mystery-encounter-type.ts"), re.M)
for e in encounters:
    e["id"] = me_order.index(e["key"]) if e["key"] in me_order else -1
encounters.sort(key=lambda e: e["name"])
out3 = (
    "// Mystery Encounters in Classic. From src/data/mystery-encounters/ in the PokeRogue source and the English\n"
    "// dialogue in pokerogue-locales. Names of your own Pokémon and items are filled in by the game; here they read\n"
    "// \"your Pokémon\" or \"an item\". Generated by scripts/build-data.py, do not edit by hand.\n\n"
    "// Spawn: each eligible wave rolls BASE / MAX, and every miss adds INCREMENT until one appears. Tier weights from\n"
    "// src/enums/mystery-encounter-tier.ts.\n"
    "// share: the game's stated target split of encounters by tier, after its pity rules (Common, Great, Ultra, Rogue).\n"
    f"export const ME_RULES = {j({'waves': me_waves, **me_rate, 'weights': tier_weight, 'share': tier_share})};\n\n"
    "// art: up to two pictures from the encounter's intro: [\"mon\", PokeAPI id], [\"atlas\", path under pokerogue-assets\n"
    "// images/, first frame [x, y, w, h, sheet w, sheet h]] or [\"img\", path] for a single image.\n"
    "// biomes: BiomeId keys, or ANY. options: [label, what happens ((+) good, (-) bad, (?) depends), label when you can't pick it]\n"
    f"export const ENCOUNTERS = {j(encounters)};\n"
)
(ROOT / "src/data/encounters.js").write_text(out3, encoding="utf-8")
print(f"Wrote src/data/encounters.js: {len(encounters)} encounters, {len(out3) // 1024} KB")
# --- league.js: the Elite Four and Champion. All five fights share one seed (setSeedOffsetWave), so the run picks one
# index into these lists: one region's whole league. From fixed-battle-configs.ts and trainer-config.ts.
TR = f"{SRC}trainers/"
fixed = fetch(TR + "fixed-battle-configs.ts")
tconf = fetch(TR + "trainer-config.ts")
trainer_names = json.loads(fetch(LOCALES + "trainer-names.json"))


def pool(wave_key):
    body = fixed.split(f"[ClassicFixedBossWaves.{wave_key}]", 1)[1].split("getRandomTrainerFunc([", 1)[1].split("]),", 1)[0]
    out = []
    for m in re.finditer(r"\[([^\]]+)\]|TrainerType\.(\w+)", body):
        out.append(re.findall(r"TrainerType\.(\w+)", m[1]) if m[1] else [m[2]])
    return out


REGIONS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea", "Blueberry Academy"]
cols = [pool(k) for k in ("ELITE_FOUR_1", "ELITE_FOUR_2", "ELITE_FOUR_3", "ELITE_FOUR_4", "CHAMPION")]
assert all(len(c) == len(REGIONS) for c in cols), "league lists changed length; update REGIONS"
league_trainers = {}


def trainer_block(key):
    m = re.search(r"\n  \[TrainerType\." + key + r"\]: new TrainerConfig\((.*?)(?=\n  \[TrainerType\.|\n\};)", tconf, re.S)
    return m[1] if m else ""


for key in sorted({k for c in cols for group in c for k in group}):
    b = trainer_block(key)
    spec = re.search(r"initFor(?:EliteFour|Champion)\([^)]*?PokemonType\.(\w+)", b)
    slots = []
    for sm in re.finditer(r"setPartyMemberFunc\(\s*(\d+),\s*getRandomPartyMemberFunc\(\s*\[([^\]]*)\](.*?)(?=\.setPartyMemberFunc|\.setInstantTera|\.set\w+Bgm|$)", b, re.S):
        names = [display_name(x) for x in re.findall(r"SpeciesId\.(\w+)", sm[2])]
        first = re.search(r"SpeciesId\.(\w+)", sm[2])[1]
        body = sm[3]
        tags = ("B" if "setBoss(true" in body else "") + ("M" if re.search(r"//[^\n]*Mega", body) else "") + \
               ("G" if re.search(r"//[^\n]*G-Max", body) else "")
        tera = re.search(r"//\s*Tera (\w+)", body)
        slots.append([int(sm[1]), names, sprite_id(first, species_ids.get(first, 0)), tags, tera[1].lower() if tera else ""])
    slots = [x[1:] for x in sorted(slots)]
    nm = trainer_names.get(camel(key), key.replace("_ELITE", "").replace("_CHAMPION", "").title())
    league_trainers[key] = {"name": nm if isinstance(nm, str) else key.title(), "type": spec[1].lower() if spec else "",
                            "sprite": next(([f"trainer/{k}.png", atlas_frame("trainer", k)] for k in
                                            (key.lower(), re.sub(r"_(elite|champion)$", "", key.lower()))
                                            if asset_exists(f"trainer/{k}.json")), None), "slots": slots}

league = [{"region": r, "e4": [c[i] for c in cols[:4]], "champion": cols[4][i]} for i, r in enumerate(REGIONS)]
out4 = (
    "// The Elite Four (waves 182, 184, 186, 188) and Champion (190). All five share one random pick, so a run meets one\n"
    "// region's whole league. From src/data/trainers/fixed-battle-configs.ts and trainer-config.ts in the PokeRogue source.\n"
    "// Generated by scripts/build-data.py, do not edit by hand.\n"
    "// e4 / champion: lists of trainer keys (two keys = either one). Slots: [names (game picks one), PokeAPI sprite id,\n"
    "// tags B two health bars / M Mega / G Gigantamax, Tera type or \"\"]. type = their specialty type, \"\" if mixed.\n"
    "// sprite: [path under pokerogue-assets images/, first frame [x, y, w, h, sheet w, sheet h]].\n"
    f"export const LEAGUE = {j(league)};\n\nexport const LEAGUE_TRAINERS = {j(league_trainers)};\n"
)
(ROOT / "src/data/league.js").write_text(out4, encoding="utf-8")
print(f"Wrote src/data/league.js: {len(league)} regions, {len(league_trainers)} trainers")
# --- species-types.js: the types of every species by display name, for matching your team against a boss team.
all_types = {}
for sid, d in forms.items():
    all_types.setdefault(display_name(sid), d["types"])
out5 = ("// Types of every species, by display name. From src/data/balance/species/*.ts. Generated by scripts/build-data.py.\n"
        f"export const SPECIES_TYPES = {j(all_types)};\n")
(ROOT / "src/data/species-types.js").write_text(out5, encoding="utf-8")
print(f"Wrote src/data/species-types.js: {len(all_types)} species, {len(out5) // 1024} KB")
# --- items.js: what each shop tier can offer (src/modifier/init-modifier-pools.ts), with names and descriptions
# from pokerogue-locales. Grouped items (any berry, any TM...) get a plain name written here.
pools_src = fetch(f"{SRC.replace('data/', '')}modifier/init-modifier-pools.ts")
mt_src = fetch(f"{SRC.replace('data/', '')}modifier/modifier-type.ts")
mt_loc = json.loads(fetch(LOCALES + "modifier-type.json"))["ModifierType"]
item_class = dict(re.findall(r"\n\s+(\w+):\s*\(\)\s*=>\s*\n?\s*new (\w+)\(", mt_src))
GROUP_NAMES = {
    "POKEBALL": "Poké Balls", "GREAT_BALL": "Great Balls", "ULTRA_BALL": "Ultra Balls", "ROGUE_BALL": "Rogue Balls",
    "MASTER_BALL": "Master Ball", "TEMP_STAT_STAGE_BOOSTER": "X items (X Attack, X Speed...)", "BERRY": "Berries",
    "TM_COMMON": "TMs, common", "TM_GREAT": "TMs, great", "TM_ULTRA": "TMs, ultra", "SPECIES_STAT_BOOSTER": "Species items (Light Ball, Thick Club...)",
    "EVOLUTION_ITEM": "Evolution items (stones and more)", "RARE_EVOLUTION_ITEM": "Rare evolution items", "BASE_STAT_BOOSTER": "Vitamins (HP Up, Protein...)",
    "TERA_SHARD": "Tera Shards", "VOUCHER": "Voucher", "VOUCHER_PLUS": "Voucher Plus", "VOUCHER_PREMIUM": "Voucher Premium",
    "MINT": "Mints", "FORM_CHANGE_ITEM": "Form change items", "RARE_SPECIES_STAT_BOOSTER": "Rare species items",
    "ATTACK_TYPE_BOOSTER": "Type boosters (Charcoal, Mystic Water...)", "RARE_FORM_CHANGE_ITEM": "Rare form change items (Mega Stones...)",
}
GROUP_TEXT = {
    "POKEBALL": "5 Poké Balls.", "GREAT_BALL": "5 Great Balls.", "ULTRA_BALL": "5 Ultra Balls.", "ROGUE_BALL": "5 Rogue Balls.",
    "MASTER_BALL": "1 Master Ball: always catches.", "TEMP_STAT_STAGE_BOOSTER": "Raises one stat of your whole team for the next few battles.",
    "DIRE_HIT": "Raises your team's critical-hit ratio for the next few battles.",
    "MAX_ETHER": "Fully restores the PP of one move.", "MAX_ELIXIR": "Fully restores the PP of all of one Pokémon's moves.",
    "MAX_POTION": "Fully restores one Pokémon's HP.", "FULL_RESTORE": "Fully restores one Pokémon's HP and heals its status.",
    "RARE_CANDY": "Raises one Pokémon by 1 level (more with Candy Jars).", "RARER_CANDY": "Raises every party member by 1 level (more with Candy Jars).",
    "VOUCHER": "One voucher for the egg gacha.", "VOUCHER_PLUS": "One Voucher Plus for the egg gacha.", "VOUCHER_PREMIUM": "One Voucher Premium for the egg gacha.",
    "BERRY": "A berry to hold; it is eaten when its trigger hits (low HP, a status, a stat drop).",
    "TM_COMMON": "Teaches one move from the common TM pool to a Pokémon that can learn it.",
    "TM_GREAT": "Teaches one move from the great TM pool.", "TM_ULTRA": "Teaches one move from the ultra TM pool.",
    "EVOLUTION_ITEM": "Evolves a Pokémon that needs an item (stones, trade items...).", "RARE_EVOLUTION_ITEM": "Rarer evolution items.",
    "BASE_STAT_BOOSTER": "Raises one base stat of the holder by 10%, stackable.", "MINT": "Changes how a Pokémon's nature affects its stats.",
    "TERA_SHARD": "Sets a Pokémon's Tera type.", "SPECIES_STAT_BOOSTER": "Boosts a stat for one particular Pokémon.",
    "RARE_SPECIES_STAT_BOOSTER": "Rarer species items.", "ATTACK_TYPE_BOOSTER": "Raises the power of one type's moves by 20% for the holder.",
    "FORM_CHANGE_ITEM": "Changes a Pokémon's form.", "RARE_FORM_CHANGE_ITEM": "Mega Stones and other rare form items.",
}


def item_text(key):
    c = item_class.get(key, "")
    d = GROUP_TEXT.get(key) or (mt_loc.get(key) or {}).get("description") or (mt_loc.get(c) or {}).get("description") or ""
    call = re.search(r"\n\s+" + key + r":\s*\(\)\s*=>\s*\n?\s*new \w+\((.*?)\),?\n", mt_src, re.S)
    nums = iter(re.findall(r"(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])", call[1]) if call else [])
    d = re.sub(r"a \{\{moneyMultiplier\}\} amount of money \(₽\{\{moneyAmount\}\}\)", "money", d)
    d = re.sub(r"\{\{\w+\}\}", lambda m: next(nums, "some"), d)  # the constructor's numbers, in order
    return d.replace("\n", " ")


GROUP_ICON = {
    "TEMP_STAT_STAGE_BOOSTER": "x_attack", "BERRY": "sitrus_berry", "TM_COMMON": "tm_normal", "TM_GREAT": "tm_water",
    "TM_ULTRA": "tm_dragon", "DIRE_HIT": "dire_hit", "SPECIES_STAT_BOOSTER": "light_ball", "EVOLUTION_ITEM": "thunder_stone",
    "BASE_STAT_BOOSTER": "hp_up", "TERA_SHARD": "normal_tera_shard", "VOUCHER": "coupon", "VOUCHER_PLUS": "pair_of_tickets",
    "VOUCHER_PREMIUM": "golden_mystic_ticket", "MINT": "mint_atk", "RARE_EVOLUTION_ITEM": "linking_cord",
    "FORM_CHANGE_ITEM": "gracidea", "RARE_SPECIES_STAT_BOOSTER": "thick_club", "ATTACK_TYPE_BOOSTER": "charcoal",
    "RARE_FORM_CHANGE_ITEM": "charizardite_x",
}


def item_icon(key):
    """The item's icon under pokerogue-assets images/items/: the first string argument naming an existing file."""
    call = re.search(r"\n\s+" + key + r":\s*\(\)\s*=>\s*\n?\s*new \w+\(([^)]*)", mt_src)
    names = [x for x in re.findall(r'"([^"]+)"', call[1]) if ":" not in x] if call else []
    icon = next((x for x in names if asset_exists(f"items/{x}.png")), GROUP_ICON.get(key))
    return icon if icon and asset_exists(f"items/{icon}.png") else ""


item_tiers = {}
for tier, fn in (("COMMON", "initCommonModifierPool"), ("GREAT", "initGreatModifierPool"), ("ULTRA", "initUltraModifierPool"),
                 ("ROGUE", "initRogueModifierPool"), ("MASTER", "initMasterModifierPool")):
    body = pools_src.split(f"function {fn}()", 1)[1].split("\nfunction ", 1)[0]
    keys = list(dict.fromkeys(re.findall(r"WeightedModifierType\(\s*modifierTypes\.(\w+)", body)))
    item_tiers[tier] = [[k, GROUP_NAMES.get(k) or (mt_loc.get(k) or {}).get("name") or k.replace("_", " ").title(), item_text(k), item_icon(k)]
                        for k in keys]
out6 = ("// What each reward tier can offer after a battle. From src/modifier/init-modifier-pools.ts (player pool) and\n"
        "// pokerogue-locales modifier-type.json. Grouped items are named by hand in scripts/build-data.py.\n"
        "// Generated by scripts/build-data.py, do not edit by hand. [key, name, what it does, icon under images/items/]\n"
        f"export const ITEM_TIERS = {j(item_tiers)};\n")
(ROOT / "src/data/items.js").write_text(out6, encoding="utf-8")
print(f"Wrote src/data/items.js: {sum(len(v) for v in item_tiers.values())} items, {len(out6) // 1024} KB")
# --- biome-bosses.js: who a biome's boss waves can be. Waves ending in 0 that are not fixed fights pick a boss
# Pokémon from the biome's BOSS tiers (src/field/arena.ts: 44/64 normal, 14/64 rare, 5/64 super rare, 1/64 ultra rare,
# empty tiers fall to the next one down); gym waves (every 30, from 20 or 30) pick a gym leader from its boss trainers.
biome_bosses = {}
tree_paths = {t["path"] for t in json.loads(fetch("https://api.github.com/repos/pagefaultgames/pokerogue/git/trees/beta?recursive=1"))["tree"]}
for path in sorted(p for p in tree_paths if p.startswith("src/data/balance/biomes/") and p.endswith(".ts")):
    bsrc = fetch(SRC.replace("src/data/", "") + path)
    name = path.rsplit("/", 1)[1][:-3].replace("-", " ").title()
    pool = bsrc.split("pokemonPool", 1)[1].split("const trainerPool", 1)[0]
    tiers = {}
    for tier in ("BOSS", "BOSS_RARE", "BOSS_SUPER_RARE", "BOSS_ULTRA_RARE"):
        m = re.search(r"\[BiomePoolTier\." + tier + r"\]: \{(.*?)\n  \},", pool, re.S)
        entries = []
        if m:
            for tod, body in re.findall(r"\[TimeOfDay\.(\w+)\]: \[(.*?)\]", m[1], re.S):
                for sp in re.findall(r"SpeciesId\.(\w+)", body):
                    entries.append([display_name(sp), sprite_id(sp, species_ids.get(sp, 0)), "" if tod == "ALL" else tod.lower()])
        tiers[tier] = entries
    # Wild Pokémon by rarity, as SpeciesId keys (the same keys as learnsets.js FORMS), any time of day.
    wild = {}
    for tier in ("COMMON", "UNCOMMON", "RARE", "SUPER_RARE", "ULTRA_RARE"):
        m = re.search(r"\[BiomePoolTier\." + tier + r"\]: \{(.*?)\n  \},", pool, re.S)
        wild[tier] = sorted({sp for body in re.findall(r"\]: \[(.*?)\]", m[1], re.S) for sp in re.findall(r"SpeciesId\.(\w+)", body)}) if m else []
    tp = bsrc.split("const trainerPool", 1)[1] if "const trainerPool" in bsrc else ""
    gm = re.search(r"\[BiomePoolTier\.BOSS\]: \[(.*?)\]", tp, re.S)
    gyms = []
    for k in re.findall(r"TrainerType\.(\w+)", gm[1] if gm else ""):
        nm = trainer_names.get(camel(k), k.replace("_", " ").title())
        gyms.append([nm if isinstance(nm, str) else k.title(), [f"trainer/{k.lower()}.png", atlas_frame("trainer", k.lower())] if asset_exists(f"trainer/{k.lower()}.json") else None])
    biome_bosses[name] = {"tiers": tiers, "gyms": gyms, "wild": wild}
out7 = ("// Who each biome's boss waves can be. From src/data/balance/biomes/*.ts (boss tiers and boss trainers) and the\n"
        "// odds in src/field/arena.ts. Generated by scripts/build-data.py, do not edit by hand.\n"
        "// tiers: BOSS 44/64, BOSS_RARE 14/64, BOSS_SUPER_RARE 5/64, BOSS_ULTRA_RARE 1/64 (an empty tier falls to the next one down;\n"
        "// luck improves the roll). Entries: [name, PokeAPI sprite id, time of day or \"\" for any time].\n"
        "// gyms: the gym leaders a gym wave in this biome can bring: [name, [sprite path, first frame] or null].\n"
        "// wild: the biome's wild Pokémon by rarity tier (COMMON to ULTRA_RARE), as SpeciesId keys, any time of day.\n"
        f"export const BIOME_BOSSES = {j(biome_bosses)};\n")
(ROOT / "src/data/biome-bosses.js").write_text(out7, encoding="utf-8")
print(f"Wrote src/data/biome-bosses.js: {len(biome_bosses)} biomes, {len(out7) // 1024} KB")
# --- rivals.js: the six rival fights, slot by slot (src/data/trainers/rival-party-config.ts). Each slot draws one
# species from its pool; slots 3 and 4 avoid doubling up the rival team's own types and weaknesses.
rsrc = fetch(TR + "rival-party-config.ts")
pools = {name: re.findall(r"SpeciesId\.(\w+)", body) for name, body in re.findall(r"\nconst (SLOT_\w+) = \[(.*?)\];", rsrc, re.S)}
RIVAL_WAVES = [8, 25, 55, 95, 145, 195]
rivals = []
for n, wave in enumerate(RIVAL_WAVES, 1):
    body = rsrc.split(f"export const RIVAL_{n}_POOL", 1)[1].split("\n];", 1)[0]
    slots = []
    for entry in re.findall(r"\{\s*pool: (SLOT_\w+),(.*?)\n?\s*\}", body, re.S):
        pname, rest = entry
        bars = re.search(r"forceRival\w+\(p, (\d+)", rest)
        note = []
        if pname.startswith("SLOT_1"):
            note.append("Their starter" + (", Terastallizes to its first type" if n >= 4 else ""))  # setInstantTera(0) on RIVAL_4..6
        if pname.startswith("SLOT_2"):
            note.append("Always a bird")
        if "balanceTypes" in rest:
            note.append("picked so their team doesn't double up on types or weaknesses")
        if bars and int(bars[1]):
            note.append(f"{bars[1]} health bars")
        if pname == "SLOT_6_FINAL":
            note.append("shiny, level 129, 3 health bars" if wave == 145 else "Mega, level 200, a boss")
        mega = pname == "SLOT_6_FINAL" and wave == 195
        names = []
        for sp in pools.get(pname, []):
            stats = forms[sp]["stats"] if sp in forms else []
            if mega:  # postProcessSlot6Fight6 sets the Mega form; use its stats from the species file
                fb = re.search(r"formKey: SpeciesFormKey\.MEGA,(.*?)\n\s*\}\)", fetch(f"{SRC}balance/species/generation-03.ts").split(f"[SpeciesId.{sp}]", 1)[1], re.S)
                if fb:
                    stats = [int(re.search(k + r": (\d+)", fb[1])[1]) for k in ("baseHp", "baseAtk", "baseDef", "baseSpatk", "baseSpdef", "baseSpd")]
            names.append([display_name(sp) + (" (Mega)" if mega else ""), sprite_id(sp, species_ids.get(sp, 0)) if not mega else 10079,
                          forms[sp]["types"] if sp in forms else "", stats])
        slots.append({"pool": names, "note": "; ".join(note), "tera": pname.startswith("SLOT_1") and n >= 4})
    rivals.append({"wave": wave, "slots": slots})
out8 = ("// The six rival fights. From src/data/trainers/rival-party-config.ts in the PokeRogue source; each slot is one\n"
        "// species from its pool [name, PokeAPI sprite id, types, base stats]; tera: the starter Terastallizes to its first type. Generated by scripts/build-data.py, do not edit by hand.\n"
        f"export const RIVALS = {j(rivals)};\n")
(ROOT / "src/data/rivals.js").write_text(out8, encoding="utf-8")
print(f"Wrote src/data/rivals.js: {len(rivals)} fights, {len(out8) // 1024} KB")
# --- all-moves.js: every move by its English name, for reading a live party's movesets (the browser extension).
all_moves = {named(k, move_names, "effect")[0]: v[:4] for k, v in move_data.items()}
out9 = ("// Every move by English name: [type, P/S/X, power (0 = status or varies), accuracy]. From src/data/moves/move.ts\n"
        "// and pokerogue-locales. Generated by scripts/build-data.py, do not edit by hand.\n"
        f"export const ALL_MOVES = {j(all_moves)};\n")
(ROOT / "src/data/all-moves.js").write_text(out9, encoding="utf-8")
print(f"Wrote src/data/all-moves.js: {len(all_moves)} moves, {len(out9) // 1024} KB")
# --- megas.js: every Mega, Primal and Gigantamax form with its types, ability and base stats, next to the base form.
special, starter_of = [], {}
for (name, _sprite, _cost, _types), line in zip(guide, lines):
    for f in line:
        starter_of.setdefault(f, name)
KINDS = {"MEGA": "Mega", "MEGA_X": "Mega X", "MEGA_Y": "Mega Y", "MEGA_Z": "Mega Z", "PRIMAL": "Primal",
         "GIGANTAMAX": "Gigantamax", "GIGANTAMAX_SINGLE": "Gigantamax (Single Strike)", "GIGANTAMAX_RAPID": "Gigantamax (Rapid Strike)"}
SUFFIX = {"MEGA": "-mega", "MEGA_X": "-mega-x", "MEGA_Y": "-mega-y", "MEGA_Z": "-mega-z", "PRIMAL": "-primal", "GIGANTAMAX": "-gmax",
          "GIGANTAMAX_SINGLE": "-single-strike-gmax", "GIGANTAMAX_RAPID": "-rapid-strike-gmax"}
STAT_KEYS = ("baseHp", "baseAtk", "baseDef", "baseSpatk", "baseSpdef", "baseSpd")
for g in range(1, 10):
    text = fetch(f"{SRC}balance/species/generation-0{g}.ts")
    for block in re.split(r"\n  generation\w+SpeciesData\[SpeciesId\.", text)[1:]:
        sid = block.split("]", 1)[0]
        for fb in re.findall(r"new PokemonForm\(\{(.*?)\n\s*\}\)", block, re.S):
            key = re.search(r"formKey: SpeciesFormKey\.(\w+)", fb)
            if not key or key[1] not in KINDS:
                continue
            stats = [int(re.search(k + r": (\d+)", fb)[1]) for k in STAT_KEYS]
            types = " ".join(t.lower() for t in re.findall(r"type[12]: PokemonType\.(\w+)", fb))
            ab = re.search(r"ability1: AbilityId\.(\w+)", fb)[1]
            base_name = display_name(sid)
            api_name = re.sub(r"[^a-z0-9-]", "", base_name.lower().replace(" ", "-").replace("é", "e")) + SUFFIX[key[1]]
            special.append({
                "name": base_name, "form": KINDS[key[1]], "kind": "gmax" if "GIGANTAMAX" in key[1] else "mega",
                "types": types, "ability": named(ab, ability_names, "description")[0], "stats": stats,
                "base": forms[sid]["stats"] if sid in forms else None,
                "sprite": api.get(api_name) or sprite_id(sid, species_ids.get(sid, 0)), "baseSprite": sprite_id(sid, species_ids.get(sid, 0)),
                "starter": starter_of.get(sid, ""),
            })
out10 = ("// Every Mega, Primal and Gigantamax form: types, first ability, base stats [HP, Atk, Def, SpA, SpD, Spe], the base\n"
         "// form's stats and the starter whose line it belongs to (\"\" if none). From src/data/balance/species/*.ts.\n"
         "// Generated by scripts/build-data.py, do not edit by hand.\n"
         f"export const SPECIAL_FORMS = {j(special)};\n")
(ROOT / "src/data/megas.js").write_text(out10, encoding="utf-8")
print(f"Wrote src/data/megas.js: {sum(1 for x in special if x['kind'] == 'mega')} Mega/Primal, {sum(1 for x in special if x['kind'] == 'gmax')} Gigantamax")
print(f"Wrote src/data/builds.js: {len(builds)} starters, {len(abilities)} abilities, {len(moves)} moves, {len(out) // 1024} KB")
for p in problems:
    print("CHECK:", p)
sys.exit(1 if problems else 0)
