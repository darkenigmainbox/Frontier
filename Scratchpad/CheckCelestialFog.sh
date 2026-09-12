#!/usr/bin/env bash
#============================================================================================================================================
# 📦 Scratchpad/CheckCelestialFog.sh — Height Fog and Atmospheric Fog are wired through Project Zero
#============================================================================================================================================
# The browser panel has two global fog entities in addition to local fog volumes. This gate prevents them from
# becoming inspector-only controls: the native sequence, CPU raster and ReSTIR sky record must all carry the same
# finite-segment settings.
set -u
cd "$(dirname "$0")/.."
Fail=0
Report() { if [ "$1" = "0" ]; then printf '  %-70s PASS\n' "$2"; else printf '  %-70s FAIL\n' "$2"; Fail=1; fi; }

Sequence=Projects/Project-Zero/Source/CelestialSequence.cpp
Raster=Engine/GeometricRaster/VisibilityRaster.cpp
Record=Engine/DisplayPresentation/SkyConstantRecord.h
Shader=Engine/Shaders/SkyRecords.slang
Panel=Projects/Project-Zero/Content/Celestial/CelestialPanel.html

[ -f "$Panel" ]
Report $? "the reference panel is inside Project Zero content"
grep -q '  fog:{name:' "$Panel" && grep -q '  afog:{name:' "$Panel"
Report $? "the two global fog entities remain in the reference registry"
grep -q 'Settings.Fog = Fog' "$Sequence"
Report $? "the sequence lends fog settings to the CPU raster"
grep -q 'PackSkyFog' "$Sequence"
Report $? "the same sequence packs fog for the GPU"
grep -q 'HeightFogOpticalDepth' "$Raster"
Report $? "the CPU raster uses the closed-form height integral"
grep -q 'AnalyticFogAlong(CameraOrigin, surface.xyz, accumulatedRadiance)' Engine/Shaders/ReSTIRViewport.slang
Report $? "the ReSTIR surface path applies finite-segment fog"
grep -q 'static_assert(sizeof(SkyConstantRecord) == 368u' "$Record"
Report $? "the sky record includes the three fog rows"
grep -q 'SkyFogHeight' "$Shader" && grep -q 'SkyFogAerial' "$Shader"
Report $? "the shader declares both fog lanes"

grep -q "const TEXDIR='../../../EngineContent/CelestialTextures/'" "$Panel"
Report $? "the browser panel reuses the native moon atlas"

if [ "$Fail" != "0" ]; then echo "[CelestialFog] FAILED"; exit 1; fi
echo "[CelestialFog] OK"
