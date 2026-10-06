# FRONTIER — Automotive Material Studio

A real-time, **100% procedural** automotive material and shader studio. There is not a
single texture in this repository — no bitmaps, no HDRIs, no baked lookups, no
`.png`/`.exr`/`.ktx`. Every surface, every environment light and every library
thumbnail is generated from hash noise on the GPU (or, for the swatches, from a
miniature CPU version of the same model).

```
npm install
npm run dev        # http://localhost:5173
npm test           # asset + preset + UI + GLSL compilation gate
```

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FRONTIER · Automotive Material Studio      [asset rail]      Render Shader│
├───────────────┬──────────────────────────────────────────┬───────────────┤
│               │  Body Panel                              │  Inspector    │
│   MATERIAL    │  Outer Panel · paint · Clear Coat+Flake  │               │
│   LIBRARY     │                                          │  ── hero ──   │
│               │            VIEWPORT                      │  Roughness    │
│  search       │        (live procedural asset)           │  Flake Dens.  │
│  category     │                                          │  Paint Depth  │
│  chips        │                                          │  Coat Intens. │
│               │  fps / tris / draws            ⊕ gizmo   │               │
│  48 presets   │  ─────────────────────────────────────── │  collapsible  │
│  live swatch  │  [env ▾] frame ⟳ grid floor wire shadow 📷│  param groups │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│ drawer:  GLSL  |  Preset JSON  |  Model Notes                            │
├──────────────────────────────────────────────────────────────────────────┤
│ WebGL2 · three r180 · ACES · MSAA×4 │ fps │ tris │ part │ material       │
└──────────────────────────────────────────────────────────────────────────┘
```

* **Left — Material Library.** 48 presets in 8 categories. Each thumbnail is a real
  mini PBR render of a sphere evaluated with that preset's parameters, so moving a
  slider updates the swatch live. Search, category chips, collapsible groups, and a
  custom-preset section persisted to `localStorage`.
* **Centre — Viewport.** Seven procedural assets, each split into named material
  slots. Click any part of the model to target it; hovering shows what you would hit.
* **Right — Inspector.** Auto-generated from the active family's schema. The three
  headline controls the brief asked for — **Flake Density**, **Roughness** and
  **Paint Depth** — are pinned at the top; everything else is grouped below with
  physical read-outs (film build in µm, flake size in µm, lathe pitch in mm, yarn
  count per metre, glass absorption per metre…).
* **Bottom drawer.** The exact GLSL being injected for the current material, with the
  live uniform values annotated, plus a JSON export of the preset.

---

## Shader model

The host is three.js `MeshPhysicalMaterial`, so we inherit a full Unreal-style PBR
stack — Default Lit, **Clear Coat**, **Cloth** (sheen), **Thin Translucent**
(transmission + dispersion), anisotropy, iridescence, PMREM image-based lighting —
and splice four procedural stages into `main()`:

| stage | injection point                              | job                                     |
|-------|----------------------------------------------|-----------------------------------------|
| 1     | after `<metalnessmap_fragment>`              | evaluate the procedural surface         |
| 2     | after `<clearcoat_normal_fragment_maps>`     | perturb the base **and** coat normals   |
| 3     | after `<lights_physical_fragment>`           | override the `PhysicalMaterial` struct  |
| 4     | after `<lights_fragment_end>`                | accumulate extra BRDF lobes             |

Stage 3 is what makes this more than a normal-map demo: it rewrites
`anisotropyT` / `anisotropyB` / `alphaT`, `sheenColor`, `clearcoatF0`, `thickness`
and `attenuationColor` **per pixel**, so a turned brake disc gets a tangential
anisotropy frame and a pane of glass gets Beer-Lambert absorption that follows the
true ray path.

### Families

| family | what it models |
|---|---|
| `paint` | metallic / mica / candy / solid / satin-wrap basecoat under a clear coat, with discrete flake glitter, orange peel, swirl marks, colour flop and stone chips |
| `brake` | cast iron, carbon-ceramic and drilled steel rotors: concentric lathe finish, casting speckle, pad polish band, flash rust, oxide temper colours, blackbody incandescence, shader-cut cross-drilled holes |
| `ceramic` | glaze over body, Worley speckle, F2−F1 crazing network, wrapped diffuse + back transmission |
| `fabric` | plain / 2×2 twill / knit / suede relief, yarn twist, lint slub, Charlie sheen with a brushed nap direction, cloth back-scatter |
| `rubber` | directional block tread with sipes, pebble grain, ribbed seal, dust in the crevices, dark subsurface rim |
| `glass` | Beer-Lambert absorption scaled by `1 / N·V`, dispersion, thin-film AR coating, micro-scratches, wiper arcs, frost |
| `metal` | mirror, brushed, concentric machined, as-cast, bead blasted — each with its own grain, roughness modulation and anisotropy frame |
| `composite` | 2×2 twill and plain carbon with per-filament striations and resin pockets, forged chopped fibre, moulded polymer grain, nappa leather |

### Metallic flake, in detail

Two octaves of Worley cells tile the tangent plane in **world space**, so glitter is
welded to the bodywork instead of swimming when the camera orbits. Each cell owns a
randomly oriented mirror facet; a facet only fires when its own normal lines up with
the half vector:

```glsl
float a2 = alpha * alpha;
float d  = NoH * NoH * ( a2 - 1.0 ) + 1.0;
float D  = a2 / ( d * d );                          // peak-normalised micro lobe
sparkle += L * NoL * D * V_Smith(alpha, VoL, NoV) * F_Schlick(tint, VoL) * mask * fade;
```

**Anti-aliasing is the part most flake demos get wrong.** The projected cell
footprint is measured with `dFdx`/`dFdy`; once a cell drops below roughly one pixel
the discrete sparkle fades out *and* the base lobe roughness returns to its averaged
value, so the paint degrades to a smooth metal in the distance instead of crawling.

**Paint Depth** is not one knob — it drives four coupled effects: parallax travel of
the flake coordinate under the clear, the strength of the face-to-edge colour flop,
absorption between flakes, and the clear-coat Fresnel. Deep film build reads wet; a
thin single-stage wrap reads dry and chalky.

**Cross-drilled holes** are cut with `discard` in the fragment shader rather than in
geometry, so you genuinely see through the friction face into the cooling-vane
channel behind it, with a procedural conical chamfer and soot ring around each hole.

### Lighting

The environment is a procedural HDR rig: a gradient dome plus emissive softbox and
strip panels, rendered into a cube and prefiltered with `PMREMGenerator`, so the
roughness mips behave exactly like a captured HDRI. Seven rigs — Studio Softbox,
Light Tent, Underground Garage, Golden Hour, Overcast, Night City, Neutral Grey.
Bright small emitters matter here: a flake needs a hard highlight to catch.

Post: MSAA ×4 into an HDR half-float target, Unreal-style bloom (sparkle needs it),
a grade pass with vignette / chromatic aberration / procedural animated grain /
saturation / contrast, then a selectable tone mapper (ACES, Neutral, AgX, Cineon,
Reinhard, off) through `OutputPass`.

---

## Viewport assets

All modelled in code — parametric height fields, lathes, extruded annular sectors
and rounded boxes.

| asset | slots |
|---|---|
| **Body Panel** | doubly-curved hood buck with a sharp character line, a shut-line groove and a rolled hem — outer panel, underside, chrome brightwork, hem seal |
| **Brake Assembly** | vented rotor with 12 spiral cooling slots and 38 internal vanes, alloy hat, studs, dust shield, pads + backing plates, monobloc caliper with bleeder and banjo fitting, braided hose |
| **Wheel & Tyre** | 5 twin-spoke alloy with machined lip, hub, lugs, centre cap and valve; tyre split into tread band and two sidewalls so each gets its own compound |
| **Seat** | cushion, insert, bolsters, backrest, headrest, stitch line, back shell, frame and rails |
| **Headlamp** | housing, freeform outer lens, bezel, two parabolic reflector bowls, projector lens + ring, DRL light guide (emissive), finned heatsink |
| **Exhaust & Valance** | rolled-edge tips, inner soot, carbon valance with fins |
| **Shader Ball** | sphere, torus and plinth — the neutral reference for any material |

---

## Project structure

```
src/
  core/
    schema.js        parameter schemas — the single source of truth for uniforms + UI
    library.js       the 48 material presets with real-world values
    glslPreview.js   live shader source view + GLSL highlighter
  shaders/
    frk.glsl.js      procedural library: hashing, value noise, fbm, Worley, footprint
                     fade, tangent frame, bump-from-height, microfacet BRDF, temper ramp
    families.js      the eight families' four-stage GLSL
    createMaterial.js  factory: uniforms, syncBase, onBeforeCompile injection
  render/
    environment.js   procedural HDR rigs + PMREM builder
    assets.js        the seven procedural assets
    viewport.js      renderer, camera, light rig, composer, slot/material manager
  ui/
    dom.js           h(), icons, tooltip, toast
    controls.js      slider (drag / label-scrub / shift-fine / dbl-click reset),
                     colour well, switch, select
    swatch.js        miniature CPU PBR renderer for the library thumbnails
    library.js       left panel
    inspector.js     right panel
  styles/            theme.css (design tokens) · layout.css · components.css · icons.css
tools/
  smoke.mjs          assets, presets, material handles, no-texture guarantee
  ui-smoke.mjs       jsdom: widgets, swatches, both panels, every control driven
  validate-shaders.mjs  reproduces three's shader assembly and lints it
  compile-all.cjs    compiles all 28 shaders with a real glslang front end
```

### Validation

`npm test` runs four gates. The last one is the interesting one: it assembles each
shader exactly the way `WebGLProgram` does (resolve `#include`, substitute light and
clipping counts, unroll loops, apply `onBeforeCompile`), rewrites it into Vulkan
GLSL 4.50, and compiles it with a genuine glslang front end. That is how the
duplicate-varying and reversed-`smoothstep` bugs were caught before they ever reached
a browser.

```
all smoke tests passed
all UI smoke tests passed
all families assembled cleanly
all 28 shaders compile with a real glslang front end
```

### Theming

Every colour, radius and metric lives in `src/styles/theme.css` as a CSS custom
property — swap `--accent`, `--bg-*` and `--line-*` and the whole tool re-skins
without touching a single component.

## Controls

| key | action |
|---|---|
| `1`–`7` | switch asset |
| `F` | frame the asset |
| `T` | turntable |
| `G` / `H` | ground grid / studio floor |
| `W` | wireframe |
| `B` | show the environment dome as the background |
| `E` | cycle lighting rig |
| `P` | save a PNG of the viewport |
| `` ` `` | toggle the shader drawer |
| `/` | focus the library search |

Drag a slider, or **drag its label** to scrub; hold `Shift` for fine; double-click to
reset to the preset default. Click a part in the viewport to retarget the library and
the inspector at it.
