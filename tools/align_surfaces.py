#!/usr/bin/env python3
"""Re-spell each corpus word with the Tanzil (mushaf) spelling when the word
boundaries agree. Corpus orthography is slightly simplified; the mushaf is not.
Roots and lemmas are untouched."""
import json, re, os

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "surah.json")

def nz(x):
    x = re.sub(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]", "", x)
    return x.replace("\u0649", "\u064A").replace("\u0671", "\u0627")

def main():
    d = json.load(open(P, encoding="utf-8"))
    fixed = 0
    for a in d["ayat"]:
        t = a["ar"].split()
        ws = a["words"]
        if len(t) != len(ws):
            continue
        for i, w in enumerate(ws):
            if nz(t[i]) == nz(w["ar"]):
                if w["ar"] != t[i]:
                    fixed += 1
                w["ar"] = t[i]
    json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("re-spelled", fixed, "words; size", os.path.getsize(P))

if __name__ == "__main__":
    main()

# --- second pass: the single āyah where the corpus joins two words (13:37 بَعْدَمَا)
# Split the joined surface so the reader sees both words the mushaf prints.
def split_joined(path=None):
    p = path or P
    d = json.load(open(p, encoding="utf-8"))
    for a in d["ayat"]:
        if a["n"] != 37:
            continue
        ws = a["words"]
        for i, w in enumerate(ws):
            if w["ar"].startswith("بَعْدَمَا") or w["ar"].startswith("بَعْدَمَا"):
                ws[i]["ar"] = "بَعْدَ"
                ws.insert(i + 1, {"ar": "مَا", "root": "", "lem": "ما", "pos": "N"})
                break
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("split 13:37 join; words now", sum(len(a["words"]) for a in d["ayat"]))


# --- third pass: every word is tappable. Particles / pronouns / proper nouns without a
# root get a short gloss from src/data/citations.json -> "particles".
def attach_particles(data_path=None, citations_path=None):
    import os as _os
    base = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    sp = data_path or _os.path.join(base, "src", "data", "surah.json")
    cp = citations_path or _os.path.join(base, "src", "data", "citations.json")
    d = json.load(open(sp, encoding="utf-8"))
    cit = json.load(open(cp, encoding="utf-8"))
    parts = cit.get("particles", {})

    def key(x):
        x = re.sub(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]", "", x)
        return x.replace("\u0671", "\u0627").strip()

    lookup = {key(k): k for k in parts}
    tagged = 0
    for a in d["ayat"]:
        for w in a["words"]:
            if w["root"]:
                continue
            k = key(w["ar"])
            if k in lookup:
                w["p"] = lookup[k]
                tagged += 1
                continue
            # strip a leading conjunction / preposition / article and retry
            for prefix in ("\u0648", "\u0641", "\u0644", "\u0628", "\u0643"):
                if k.startswith(prefix) and key(k[1:]) in lookup:
                    w["p"] = lookup[key(k[1:])]
                    w["pre"] = prefix
                    tagged += 1
                    break
            else:
                if k.startswith("\u0627\u0644") and key(k[2:]) in lookup:
                    w["p"] = lookup[key(k[2:])]
                    tagged += 1
    json.dump(d, open(sp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    total = sum(len(a["words"]) for a in d["ayat"])
    glossed = sum(1 for a in d["ayat"] for w in a["words"] if w["root"] or w.get("p"))
    print(f"particles tagged {tagged}; tappable {glossed}/{total} words")
    return d


# --- fourth pass: drop the small high ornament marks (waqf / hizb symbols) and the
# standalone sajdah sign. They belong to mushaf pagination, not to the running text,
# and Amiri Quran's Latin-subset build has no glyphs for some of them.
def clean_ornaments(data_path=None):
    import os as _os
    sp = data_path or _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "src", "data", "surah.json")
    d = json.load(open(sp, encoding="utf-8"))
    strip = re.compile(r"[\u06D6-\u06DC\u06DE\u06E9\u06E9]")
    n = 0
    for a in d["ayat"]:
        a["ar"] = re.sub(r"\s+", " ", strip.sub("", a["ar"])).strip()
        for w in a["words"]:
            w2 = strip.sub("", w["ar"])
            if w2 != w["ar"]:
                n += 1
            w["ar"] = w2
    json.dump(d, open(sp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("ornaments cleaned on", n, "words")


# --- fifth pass: normalise the two archaic orthographic marks to Hafs forms.
def normalise_marks(data_path=None):
    import os as _os
    sp = data_path or _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "src", "data", "surah.json")
    d = json.load(open(sp, encoding="utf-8"))
    tr = {"\u065E": "\u064B", "\u06E5": "\u064F"}
    def fix(t):
        return "".join(tr.get(c, c) for c in t if c not in "\u06D6\u06DA\u06E9")
    for a in d["ayat"]:
        a["ar"] = fix(a["ar"])
        for w in a["words"]:
            w["ar"] = fix(w["ar"])
    json.dump(d, open(sp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("marks normalised")
