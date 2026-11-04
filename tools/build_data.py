#!/usr/bin/env python3
"""
Build the Surah Ar-Ra'd (13) dataset used by the web app.

Sources (all fetched from public, machine-readable repositories):
  * Quran text + translation  -> npm package `quran-json` (Tanzil text; Saheeh International translation)
  * Word segmentation + roots -> Quranic Arabic Corpus v0.4 (via mustafa0x/quran-morphology)
  * Root senses + provenance  -> kwanite/quran-roots-dictionary (Macmillan QAC forms, Lane, Mufradat)
  * Tafsir prose              -> spa5k/tafsir_api (Ibn Kathir abridged, Al-Mukhtasar, Muyassar, Al-Muyassar fi al-Gharib)
  * Hadith                    -> curated + individually checked against sunnah.com (see src/data/citations.ts)

This script is retained for provenance. The generated JSON is committed so the app runs offline.
"""
import json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data")

QURAN_JSON = "/tmp/qj/package/dist/chapters/en/13.json"     # quran-json package (English edition)
MORPH = "/tmp/morph/quran-morphology-master/quran-morphology.txt"
ROOTDIR = "/tmp/roots"
ROOTMAP = "/tmp/root_map.json"
TAFSIR = "/tmp/src"
CITATION_DETAILS = os.path.join(ROOT, "tools", "root_notes.json")

BW = {
    'ء': "'", 'آ': '|', 'أ': '>', 'ؤ': '&', 'إ': '<', 'ئ': '}', 'ا': 'A', 'ب': 'b', 'ة': 'p',
    'ت': 't', 'ث': 'v', 'ج': 'j', 'ح': 'H', 'خ': 'x', 'د': 'd', 'ذ': '*', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': '$', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'E', 'غ': 'g', 'ف': 'f',
    'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ى': 'Y', 'ي': 'y',
    'ٱ': 'A',
}


def bw(s):
    return ''.join(BW.get(c, c) for c in s)


def norm_qac(s):
    return bw(s).replace('>', 'A').replace('|', 'A').replace('<', 'A').replace('&', 'w').replace('}', 'y')


def strip_diacritics(s):
    return re.sub(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]", "", s)


def main():
    # ---------------------------------------------------------------- words
    words = {}
    for line in open(MORPH, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line or line.startswith("#"):
            continue
        loc, form, pos, feats = line.split("\t")
        s, a, w, seg = loc.split(":")
        if s != "13":
            continue
        key = (int(a), int(w))
        d = words.setdefault(key, {"segs": [], "feats": [], "pos": []})
        d["segs"].append(form)
        d["feats"].append(feats)
        d["pos"].append(pos)

    # ---------------------------------------------------------------- roots
    rootmap = json.load(open(ROOTMAP))
    roots = {}
    for ar_root, meta in rootmap.items():
        path = os.path.join(ROOTDIR, meta["file"])
        if not os.path.exists(path):
            continue
        raw = json.load(open(path, encoding="utf-8"))
        idea = raw.get("root_idea", {})
        senses = []
        for form in raw.get("quranic_forms", []):
            for sense in form.get("senses", []):
                senses.append({
                    "pos": form.get("public_pos_label", ""),
                    "headword": form.get("headword_arabic", ""),
                    "definition": sense.get("definition", ""),
                    "when": sense.get("usage_conditions", ""),
                })
        roots[ar_root] = {
            "root": ar_root,
            "qac": raw.get("root", ""),
            "arabic": raw.get("arabic", ar_root),
            "summary": idea.get("summary", ""),
            "development": idea.get("development", ""),
            "senses": senses[:6],
            "cautions": raw.get("cautions", [])[:3],
            "sources": [s for s in idea.get("source_refs", [])],
        }

    # ---------------------------------------------------------------- ayat
    quran = json.load(open(QURAN_JSON, encoding="utf-8"))
    by_ayah = defaultdict(list)
    for (a, w), d in sorted(words.items()):
        by_ayah[a].append((w, d))

    def nz(x):
        x = re.sub(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]", "", x)
        return x.replace("\u0649", "\u064A").replace("\u0671", "\u0627")

    ayat = []
    for v in quran["verses"]:
        a = v["id"]
        tanzil = v["text"].split()
        out_words = []
        for w, d in by_ayah[a]:
            feats = " ".join(d["feats"])
            root = ""
            m = re.search(r"ROOT:([^|\s]+)", feats)
            if m:
                root = m.group(1)
            lem = ""
            m = re.search(r"LEM:([^|\s]+)", feats)
            if m:
                lem = m.group(1)
            surface = "".join(d["segs"])
            # prefer the mushaf (Tanzil) spelling when word boundaries agree
            if w - 1 < len(tanzil) and nz(tanzil[w - 1]) == nz(surface):
                surface = tanzil[w - 1]
            out_words.append({
                "ar": surface,
                "root": root if root in roots else "",
                "lem": lem,
                "pos": d["pos"][0] if d["pos"] else "",
            })
        ayat.append({
            "n": a,
            "ar": v["text"],
            "en": v["translation"],
            "tr": v.get("transliteration", ""),
            "words": out_words,
        })

    # ---------------------------------------------------------------- tafsir
    def load(name):
        p = os.path.join(TAFSIR, name)
        if not os.path.exists(p):
            return {}
        d = json.load(open(p, encoding="utf-8"))
        if isinstance(d, dict):
            d = d.get("ayahs", [])
        return {x["ayah"]: x["text"] for x in d}

    ik = load("en-tafisr-ibn-kathir_13.json")
    mk = load("en-tafsir-al-mukhtasar_13.json")
    MY = load("ar-tafsir-muyassar_13.json")

    for a in ayat:
        n = a["n"]
        a["ibnKathir"] = clean_ik(ik.get(n, "")) if n in ik else ""
        a["mukhtasar"] = re.sub(r"\s+", " ", mk.get(n, "")).strip()

    data = {"surah": 13, "ayat": ayat, "roots": roots}
    os.makedirs(OUT, exist_ok=True)
    json.dump(data, open(os.path.join(OUT, "surah.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print("ayat", len(ayat), "roots", len(roots),
          "size", os.path.getsize(os.path.join(OUT, "surah.json")))


def clean_ik(text):
    """Ibn Kathir text arrives with inline Arabic quotations; keep the prose, keep it readable."""
    if not text:
        return ""
    text = text.replace("\n", "\n")
    # drop the trailing "(n. ...)" style ayah boundary markers that repeat the whole passage
    text = re.sub(r"\(\d+\.\s[^)]{0,400}\)\n", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


if __name__ == "__main__":
    main()
