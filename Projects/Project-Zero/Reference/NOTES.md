# Reference pin — the celestial implementation this port transcribes

Live console: <https://sultanaladin.github.io/Frontier-/celestial/>

Pinned source: `SultanAladin/Frontier-` @ branch `arena/01a08c57-frontier`
(deployed Pages source: branch `arena/01a08c57-frontier`, path `/docs`),
file `docs/celestial/index.html`
(blob `16e08d8e596342188cb1c306976a44b9570607cf`, 472491 bytes, 3657 lines).

`celestial-fs.glsl` in this folder is the file's `<script id="fs">` fragment
program (497 lines) extracted verbatim — only the header comment was added.
Everything under `../Source/Celestial*` is a line-by-line transcription of
that program plus the uniform-upload seam in the page's module script. No
kernel here is an original implementation; where a fix was required it is
documented below with the reference line it restores.

## Line map (reference `index.html` → port)

| Reference | Port |
|---|---|
| `hue` L940 | `HueOf` (`CelestialIntegrator.cpp`), thunk `KernelHue` |
| `lensFlare` L1113–1126 | `CelestialIntegrator::LensFlare` |
| flare call site L1254–1256 | `CelestialIntegrator::AddLensFlare` |
| `vec2 uv=…` L1139 (aspect NDC) | `CelestialStage.cpp` `ndcU`/`ndcV` |
| sun screen position, JS L3624 | `AddLensFlare` (`cx/cz/tanH`, `InFront = cz>.02`) |
| flare uniforms, JS L3647 | `PostCriteria` (`FlareOn/Variety/Intensity/Ghosts/Halo/Streak/Chroma`) |
| flare type map `FT`, JS L3611 | `FlareVariety`: 0 Cinematic · 1 Anamorphic · 2 Starburst · 3 Halo |
| `cloudLayer` L1083 (2D slab) | `CelestialIntegrator::CloudSlab` |
| `clDensity`/`clLight` L1003–1014 | `CloudDensity` / `CloudLightDepth` |
| `cloudMarch` L1016 (volumetric) | `CelestialIntegrator::CloudMarch` |
| `lcDensity`/`marchLocal` L1042–1055 | `LocalCloudDensity` / `MarchLocalVolumes` |
| sky-branch order L1233–1235 | `SampleSkyRadiance` (slab → march → local) |

## The CPU seam the flare depends on (reference JS, L3624 + L3647)

```js
const cx=dot(sv,right),cy=dot(sv,up),cz=dot(sv,fwd);
const inFront=cz>.02?1:0;
const sunUV=inFront?[cx/cz/tanH,cy/cz/tanH]:[99,99];
// …
f1('uFlareOn',pp&&S.pp_flare?1:0); f1('uFlareInt',S.pp_flareInt);
f1('uGhosts',S.pp_ghosts); f1('uHalo',S.pp_halo); f1('uStreak',S.pp_streak);
f1('uChroma',S.pp_chroma); f1('uFlareType',FT[S.pp_flareType]);
f2('uSunUV',sunUV[0],sunUV[1]); f1('uSunInFront',inFront);
```

Reference call site (L1254–1256):

```glsl
if(uFlareOn>.5 && uSunVisible>.5){
  float inFrame=1.-smoothstep(1.25,2.2,length(uSunUV*vec2(uRes.y/uRes.x,1.)));
  float vis=uSunInFront*sunUp*inFrame*step(0.,elevDeg+.5);
  col+=lensFlare(uv,uSunUV,vis)*uSunIntensity*.09*uSunColor; }
```

## Checked on import, no change needed (2026-09-14)

**Vignette aspect.** The reference computes the vignette radius as
`length(uv*vec2(uRes.y/uRes.x,1.))` (L1264) while `ResolveDisplay` uses the
plain `sqrt(U²+V²)` — but its only shipping caller
(`CelestialStage::ExportPpmImage`) passes height-unit `U = 2u-1`, which is
exactly what the reference's expression reduces to. Algebraically identical;
"fixing" `ResolveDisplay` would double-correct the stage path. The proof
(`Proof/ProofCelestial.cpp`) mirrors both conventions: aspect NDC into
`AddLensFlare` (as the shader's `uv`), height-unit NDC into `ResolveDisplay`
(as the stage export).

**Grain orientation.** The port hashes `(x+0.5, y+0.5)` with top-down `y`
against the reference's bottom-up `gl_FragCoord`; the noise field is
vertically flipped but statistically identical. Immaterial.

## Fix applied on import (2026-09-14)

**Flare in-frame gate, aspect correction.** The imported `AddLensFlare`
measured the gate radius as `sqrt(SunU²+SunV²)`, but the reference measures
`length(uSunUV*vec2(uRes.y/uRes.x,1.))` — the horizontal offset divided by the
viewport aspect. On any non-square frame the port therefore held the flare
visible too far past the left/right edges. Fixed by carrying the aspect in
`ObserverFrame::AspectRatio` (set from the camera in
`CelestialStage::ObserverFrameOf`, default `1.0`) and gating on
`sqrt((SunU/Aspect)²+SunV²)`. The `LensFlare` kernel itself was already an
exact transcription and is untouched.
