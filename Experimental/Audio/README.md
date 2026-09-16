# Audio — procedural bank + editor (Experimental)

Game audio for the racing stages: sky, six winds, vegetation, six rolling
surfaces, tyre skids, and impacts. Everything is **synthesised in code**
(`GenerateAudio.py`, seeded — re-running reproduces the same files), so the
bank is royalty-free and retunable. Nothing here is sampled or downloaded.

**Open `Audio.html`.** No build step. Serve this folder over http for the
zero-click path:

```sh
cd Experimental/Audio
python3 -m http.server 8000
# → http://localhost:8000/Audio.html
```

Opened via `file://` instead? The editor will ask you to drop the
`Content/Audio` folder (or the wavs + `audio-bank.json`) into the window —
then everything works without a server.

## Layout

```text
Audio.html                  the editor (SolidArc glass theme, single file)
GenerateAudio.py            the synthesizer — source of truth for every wav
Content/Audio/              the bank — copy this folder into
                            Projects/Project-Zero/Content/ to graduate it
  audio-bank.json           manifest: categories, sounds, default params, scenes
  Ambience/                 CloudDrift (sky bed), DistantThunder
  Wind/                     Breeze, GustyMeadow, Gale, DesertDry, NightCalm,
                            MountainPass, CabinBuffet (in-car speed wind)
  Vegetation/               TreesRustle, GrassSway, GrassShuffle (footsteps)
  Surfaces/                 Tarmac, Gravel, Sand, Dirt, WetAsphalt, Cobble
                            (tyre rolling loops — all speed-linkable)
  Tyres/                    SkidShort, SkidLong (drift loop), GravelSpray
  Impacts/                  CrashHeavy, BodyHit, MetalScrape
```

Format: 44.1 kHz mono 16-bit WAV. Mono on purpose — Project-Zero's mixer
owns panning, spatialisation, and reverb; the bank ships dry centre sources.
All `loop` kinds are seamless (equal-power tail fold, verified by the
generator's self-check: `BAD: 0`).

## The editor

Three glass panels, SolidArc-style:

- **Audio Bank** (left) — search, category chips, per-sound audition.
  `Load all` decodes every file up front; `Folder` re-points the bank.
- **Stage** (centre) — waveform with click-to-seek, transport, a
  **speed simulator** (km/h bends every speed-linked voice, like driving),
  one-tap **surface switching**, layered **scenes** (Desert Rally, Forest
  Stage, Night Town, Coastal Gale, Circuit Hotlap), live voices + master.
- **Inspector** (right) — modular runtime params per sound, all live:
  pitch (±12 st varispeed), gain, pan, low-pass, high-pass, fade in/out,
  loop, reverb send (generated impulse, preview only), speed-link amount —
  plus per-category **buses** (gain + mute) and export.

Keys: `space` play/stop · `L` loop · `S` stop all · `↑↓` browse.

Edits auto-save as drafts in the browser. Per sound you can:

- **Bounce WAV** — render the current params (pitch, filters, fades,
  reverb) to a downloadable stereo WAV via an offline context.
- **Copy TOML / JSON** — engine-ready snippet, e.g.

```toml
[sample."surf_tarmac"]
file       = "Content/Audio/Surfaces/Surface_Tarmac_Roll.wav"
pitch_semi = 0.00
gain_db    = -11.0
pan        = 0.00
lp_hz      = 20000
hp_hz      = 20
loop       = true
fade_in_s  = 0.050
fade_out_s = 0.100
rev_send   = 0.00
speed_link = 1.00
```

- **Save preset** — named snapshots per sound, kept in localStorage.

Runtime param schema (also the `params` object in `audio-bank.json`):

| key          | unit   | range        | meaning                                  |
|--------------|--------|--------------|------------------------------------------|
| `pitch_semi` | st     | −12 … +12    | varispeed playback rate                  |
| `gain_db`    | dB     | −48 … +12    | trim into the category bus               |
| `pan`        | −      | −1 … +1      | preview pan (engine spatialises instead) |
| `lp_hz`      | Hz     | 100 … 20000  | low-pass (20000 ≈ off)                   |
| `hp_hz`      | Hz     | 20 … 4000    | high-pass (20 ≈ off)                     |
| `fade_in_s`  | s      | 0 … 2        | attack ramp on start                     |
| `fade_out_s` | s      | 0 … 3        | release ramp on stop                     |
| `loop`       | bool   |              | seamless loop vs one-shot                |
| `rev_send`   | −      | 0 … 1        | generated-impulse reverb send            |
| `speed_link` | −      | 0 … 1        | how hard speed bends pitch + level       |

## Retuning the bank

```sh
python3 GenerateAudio.py   # needs: numpy (pip install numpy)
```

Each sound is one `s_*` recipe with a fixed seed (`1000 + index`):
deterministic, diffable, and safe to re-run. Tune a recipe, regenerate,
refresh the editor. Suggested starting points:

- wind character → `_wind_base` gust depth/rate + `fm_tone` whistle layers
- surface texture → `_pebbles` density/bands, roll-bed filter corners
- skid bite → `_skid` partials (`f0s`) and vibrato/wander
- crash weight → `s_crash_heavy` partials, sub drop, burst decays

Keep loops' `fold_loop` tail longer than the slowest modulation so the seam
stays inaudible, then re-run the check printed at the end of generation.

## Graduation path (Project-Zero)

1. Copy `Content/Audio/` → `Projects/Project-Zero/Content/Audio/`.
2. Feed `audio-bank.json` (+ exported TOML overrides) to the audio loader;
   the `SignalIntegrator` side (cf. Slate's `AudioExchange`) plays mono
   sources through its own buses — the editor's bus layout
   (Ambience/Wind/Vegetation/Surfaces/Tyres/Impacts) is the suggested map.
3. Speed-link becomes `playbackRate = base · f(rpm|kmh)` per the `speed_link`
   weight; scenes become ambience presets per stage/biome.
