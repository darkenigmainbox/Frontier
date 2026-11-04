# Ar-Raʿd — a sūrah magazine

A dark, minimal, phone-first reading app for **Sūrah 13, al-Raʿd (The Thunder)**.
Not a textbook. A magazine: index, introduction, context, theme, the full text,
a story, a root lexicon, a conclusion, and a colophon.

Every one of the 854 words of the sūrah is tappable. Words with a root open that
root's attested senses; function words, pronouns, proper nouns and the disjoint
letters open a short lexical gloss instead of being dead text.

## What is actually in it

| Chapter | What it does |
| --- | --- |
| **Index** | Contents, reading order, and how the sourcing works |
| **Introduction** | Short, concise reading of what the sūrah is and how it argues |
| **Context** | The treaty of Ḥudaybiyyah, 6 AH — the occasion behind 13:30, from Ṣaḥīḥ al-Bukhārī 2731–2732 and 4154 |
| **Theme** | 13:17 — the flood, the ore, the foam, and the verdict |
| **Āyah by āyah** | All 43 āyāt. Arabic in the mushaf spelling; every word is tappable — roots open a root panel, function words open a gloss. Per-āyah: a source note (occasion / reading / disputed / caution), plain commentary, Ibn Kathīr (abridged) |
| **Story** | Zayd ibn Thābit and the gathering of the Qur'ān (Musnad Aḥmad 76) |
| **Roots** | All 242 distinct roots of the sūrah, searchable, each opening its attested senses with provenance |
| **Conclusion** | What the sūrah leaves standing, and what to re-read |
| **Colophon** | Every source with a link; every hadith collection, number, narrator and printed grade |

## The sourcing rules this app follows

- **No unlabelled opinion.** Every āyah carries a label saying whether a *specific
  occasion* is reported, whether the note is a *reading of the text*, whether the
  reports *dispute* each other, or whether the famous story is one to *handle with care*.
- **No weak hadith passed off as evidence.** Each hadith number was opened on
  sunnah.com and the printed grade recorded. Where the famous occasion report is weak
  (e.g. the widely circulated ʿUmm ʿAṭāʾ report attached to 13:31), the page says so and
  the report is not used as proof.
- **Tafsir is quoted, not rewritten.** Al-Mukhtaṣar (King Fahd Complex) and the abridged
  Ibn Kathīr are reproduced as quotations with a source chip.
- **Roots carry provenance.** Every root panel shows the Lane / al-Mufradāt references
  the definitions were condensed from.
- The al-Wāḥidī English *Asbāb al-Nuzūl* PDF in circulation has a later mystical
  commentary interleaved into its text. It was **not** used here; the Context chapter
  explains the problem.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static build + pre-render to dist/
npm run preview
```

Deep links: `/tafsir`, `/tafsir/17`, `/context`, `/roots` …

## Data

`src/data/surah.json` is generated (see `tools/`) from:

- **Qur'ān text + translation** — Tanzil Uthmani text / Saheeh International,
  via the `quran-json` npm package.
- **Morphology, lemmas, roots** — Quranic Arabic Corpus v0.4 (Kais Dukes, Leeds),
  Arabic edition by `mustafa0x/quran-morphology`.
- **Root senses** — `kwanite/quran-roots-dictionary`, which condenses Lane's
  *Arabic–English Lexicon* and al-Rāghib al-Iṣfahānī's *al-Mufradāt* with per-root
  source references.
- **Commentary** — `spa5k/tafsir_api` (al-Mukhtaṣar, Ibn Kathīr abridged, Muyassar).

`tools/build_data.py` and `tools/ayah_notes.py` document how the data was assembled;
`tools/align_surfaces.py` re-spells each corpus word with the mushaf spelling so the
reading text is exact.

## Design

Black `#07070a`, one signal red `#ff3b30`, Inter for Latin, Amiri Quran for Arabic,
hairline rules, no boxes, no shadows except where a panel is meant to lift off the
page. Light mode included. Type is 100 % self-hosted (OFL).
