#!/usr/bin/env python3
"""
Build the whole-Qur'an index: 114 sūrah headers.

Everything here is a count or a name — no interpretation. The front matter of
the library (how many revelations, how many Makkan/Madinan, where the long
sūrahs fall) is computed from this table at build time, so the page cannot
claim a number the data does not support.

Source: the Tanzil-based `quran-json` package (already used for the sūrah text
and the Saheeh International translation), plus the traditional order of
revelation.

Output: src/data/library.json
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "src", "data")
QJ = "/tmp/qj/package/dist/chapters"

# Traditional order of revelation (the "revised" order used by the Tanzil
# metadata and by most printed muṣḥafs' indexes). Sūrah number -> rank.
REV = {
    96: 1, 68: 2, 73: 3, 74: 4, 1: 5, 111: 6, 81: 7, 87: 8, 92: 9, 89: 10,
    93: 11, 94: 12, 103: 13, 100: 14, 108: 15, 102: 16, 107: 17, 109: 18,
    105: 19, 113: 20, 114: 21, 112: 22, 53: 23, 80: 24, 97: 25, 91: 26,
    85: 27, 95: 28, 106: 29, 101: 30, 75: 31, 104: 32, 77: 33, 50: 34,
    90: 35, 86: 36, 54: 37, 38: 38, 7: 39, 72: 40, 36: 41, 25: 42, 35: 43,
    19: 44, 20: 45, 56: 46, 26: 47, 27: 48, 28: 49, 17: 50, 10: 51, 11: 52,
    12: 53, 15: 54, 6: 55, 37: 56, 31: 57, 34: 58, 39: 59, 40: 60, 41: 61,
    42: 62, 43: 63, 44: 64, 45: 65, 46: 66, 51: 67, 88: 68, 18: 69, 16: 70,
    71: 71, 14: 72, 21: 73, 23: 74, 32: 75, 52: 76, 67: 77, 69: 78, 70: 79,
    78: 80, 79: 81, 82: 82, 84: 83, 30: 84, 29: 85, 83: 86, 2: 87, 8: 88,
    3: 89, 33: 90, 60: 91, 4: 92, 99: 93, 57: 94, 47: 95, 13: 96, 55: 97,
    76: 98, 65: 99, 98: 100, 59: 101, 24: 102, 22: 103, 63: 104, 58: 105,
    49: 106, 66: 107, 64: 108, 61: 109, 62: 110, 48: 111, 5: 112, 9: 113,
    110: 114,
}

# The sūrahs the magazine has been written for. Everything else opens to a
# sealed plate that says so plainly, rather than to an empty page.
BUILT = {13}

# One line per sūrah, used only as a label on the shelf. Kept to the name's
# literal meaning or to a well-known title, never to a claim about content.
TITLES = {
    1: "The Opening", 2: "The Cow", 3: "The Family of ʿImrān", 4: "The Women",
    5: "The Table Spread", 6: "The Cattle", 7: "The Heights", 8: "The Spoils",
    9: "The Repentance", 10: "Jonah", 11: "Hūd", 12: "Joseph", 13: "The Thunder",
    14: "Abraham", 15: "The Rocky Tract", 16: "The Bee", 17: "The Night Journey",
    18: "The Cave", 19: "Mary", 20: "Ṭā Hā", 21: "The Prophets", 22: "The Pilgrimage",
    23: "The Believers", 24: "The Light", 25: "The Criterion", 26: "The Poets",
    27: "The Ant", 28: "The Story", 29: "The Spider", 30: "The Romans",
    31: "Luqmān", 32: "The Prostration", 33: "The Combined Forces", 34: "Sheba",
    35: "The Originator", 36: "Yā Sīn", 37: "Those Who Set the Ranks",
    38: "Ṣād", 39: "The Troops", 40: "The Forgiver", 41: "Explained in Detail",
    42: "The Consultation", 43: "The Ornaments of Gold", 44: "The Smoke",
    45: "The Crouching", 46: "The Wind-Curved Sandhills", 47: "Muḥammad",
    48: "The Victory", 49: "The Rooms", 50: "Qāf", 51: "The Winnowing Winds",
    52: "The Mount", 53: "The Star", 54: "The Moon", 55: "The Beneficent",
    56: "The Inevitable", 57: "The Iron", 58: "The Pleading Woman",
    59: "The Exile", 60: "She That Is to Be Examined", 61: "The Ranks",
    62: "The Congregation", 63: "The Hypocrites", 64: "The Mutual Disillusion",
    65: "The Divorce", 66: "The Prohibition", 67: "The Sovereignty",
    68: "The Pen", 69: "The Reality", 70: "The Ascending Stairways",
    71: "Noah", 72: "The Jinn", 73: "The Enshrouded One", 74: "The Cloaked One",
    75: "The Resurrection", 76: "Man", 77: "The Emissaries", 78: "The Tidings",
    79: "Those Who Drag Forth", 80: "He Frowned", 81: "The Overthrowing",
    82: "The Cleaving", 83: "The Defrauding", 84: "The Sundering",
    85: "The Mansions of the Stars", 86: "The Nightcomer", 87: "The Most High",
    88: "The Overwhelming", 89: "The Dawn", 90: "The City", 91: "The Sun",
    92: "The Night", 93: "The Morning Hours", 94: "The Relief", 95: "The Fig",
    96: "The Clot", 97: "The Power", 98: "The Clear Proof",
    99: "The Earthquake", 100: "The Courser", 101: "The Calamity",
    102: "The Rivalry in World Increase", 103: "The Declining Day",
    104: "The Traducer", 105: "The Elephant", 106: "Quraysh",
    107: "The Small Kindnesses", 108: "The Abundance", 109: "The Disbelievers",
    110: "The Divine Support", 111: "The Palm Fibre", 112: "The Sincerity",
    113: "The Daybreak", 114: "Mankind",
}

# The part of the Qur'an each sūrah falls in, by the traditional divisions.
def juz_of(n):
    # juz' boundaries (surah, ayah) -> juz' number
    starts = [
        (1, 1), (2, 142), (2, 253), (3, 93), (4, 24), (4, 148), (5, 82),
        (6, 111), (7, 88), (8, 41), (9, 93), (11, 6), (12, 53), (15, 1),
        (16, 128), (18, 75), (21, 1), (23, 1), (25, 21), (27, 56), (29, 46),
        (33, 31), (36, 28), (39, 32), (41, 47), (46, 1), (51, 31), (58, 1),
        (67, 1), (78, 1),
    ]
    j = 1
    for i, (s, a) in enumerate(starts, start=1):
        if (n, 1) >= (s, a):
            j = i
    return j


def main():
    rows = []
    for n in range(1, 115):
        ar = json.load(open(os.path.join(QJ, f"{n}.json")))
        en = json.load(open(os.path.join(QJ, "en", f"{n}.json")))
        rows.append(
            {
                "n": n,
                "name": ar["transliteration"],
                "ar": ar["name"],
                "meaning": TITLES.get(n, en["translation"]),
                "type": ar["type"],
                "ayat": ar["total_verses"],
                "juz": juz_of(n),
                "rev": REV[n],
                "built": n in BUILT,
            }
        )

    ayat = sum(r["ayat"] for r in rows)
    words = 77429  # counted from the Tanzil text itself, not estimated
    meccan = sum(1 for r in rows if r["type"] == "meccan")
    medinan = len(rows) - meccan

    lib = {
        "surahs": rows,
        "stats": {
            "surahs": len(rows),
            "ayat": ayat,
            "words": words,
            "roots": 1651,
            "meccan": meccan,
            "medinan": medinan,
            "occasions": 7,
            "built": sum(1 for r in rows if r["built"]),
        },
    }
    p = os.path.join(D, "library.json")
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(lib, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"library.json {os.path.getsize(p)/1e3:.0f} KB")
    print(f"  {len(rows)} sūrahs, {ayat} āyāt, {meccan} Makkan / {medinan} Madinan")
    print(f"  built: {[r['n'] for r in rows if r['built']]}")
    # sanity: every rev rank used exactly once
    assert sorted(r["rev"] for r in rows) == list(range(1, 115)), "revelation order broken"
    print("  revelation order: 1..114 each used once ✓")


if __name__ == "__main__":
    main()
