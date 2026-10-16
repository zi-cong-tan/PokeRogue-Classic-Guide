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


# --- species: every block, plus the extra fields on starters
species, starters = {}, {}
for g in range(1, 10):
    text = fetch(f"{SRC}balance/species/generation-0{g}.ts")
    for block in re.split(r"\n  generation\w+SpeciesData\[SpeciesId\.", text)[1:]:
        sid = block.split("]", 1)[0]
        head = block.split("forms:", 1)[0]  # top-level abilities, not each form's
        ab = [clean((re.search(k + r": AbilityId\.(\w+)", head) or [None, None])[1])
              for k in ("ability1", "ability2", "abilityHidden")]
        evo = block.split("evolutions: [", 1)[1].split("\n    ],", 1)[0] if "evolutions: [" in block else ""
        species[sid] = {"ab": ab, "evos": list(dict.fromkeys(re.findall(r"speciesId: SpeciesId\.(\w+)", evo)))}

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
    if camel(sid) in pokemon_names:
        return pokemon_names[camel(sid)]
    for prefix, word in (("ALOLA_", "Alolan "), ("GALAR_", "Galarian "), ("HISUI_", "Hisuian "), ("PALDEA_", "Paldean ")):
        if sid.startswith(prefix) and camel(sid[len(prefix):]) in pokemon_names:
            return word + pokemon_names[camel(sid[len(prefix):])]
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
print(f"Wrote src/data/builds.js: {len(builds)} starters, {len(abilities)} abilities, {len(moves)} moves, {len(out) // 1024} KB")
for p in problems:
    print("CHECK:", p)
sys.exit(1 if problems else 0)
