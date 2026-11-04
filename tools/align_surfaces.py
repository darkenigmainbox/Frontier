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
