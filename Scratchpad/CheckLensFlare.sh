#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
#  CheckLensFlare.sh — four integrated flare elements, style presets, and free combination
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
#  The proof measures SHAPE and COMPOSITION. The requested result is one controlled optical stack: streak, ghosts,
#  aperture diffraction and halo. The gate checks that the halo is explicit and bounded, that the other elements keep
#  their characteristic shapes, and that the four bits can be combined without a hidden preset restriction.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
set -u

Root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$Root" || exit 1

Viewport="Engine/Shaders/ReSTIRViewport.slang"
Structure="Engine/DisplayPresentation/CelestialStructure.h"
Fail=0

echo "[LensFlare] flare proof"
bash Scratchpad/ExtractCelestialPort.sh /tmp/CelestialPort.inc >/dev/null 2>&1 || { echo "  FAIL  extraction failed"; exit 1; }
sed -E 's/\.(xyz|xy|yz|xz)\b([^(])/.\1()\2/g; s/\bout +(vec[234]|float) +/\1\& /g' \
    Engine/Shaders/AtmosphereScatter.slang > /tmp/AtmosphereScatter.port.inc

Binary="$(mktemp -u /tmp/LensFlare.XXXXXX)"
if ! g++ -std=c++20 -O2 -Wall -Wextra -I Scratchpad -I . Scratchpad/LensFlareTest.cpp -o "$Binary" 2>/tmp/LensFlare.build; then
    echo "  harness failed to build:"; sed 's/^/    /' /tmp/LensFlare.build | head -20; exit 1
fi
"$Binary" || Fail=1
rm -f "$Binary"

CheckConstant() {
    local Label="$1" Pattern="$2" File="$3"
    if grep -qE "$Pattern" "$File"; then echo "  OK    $Label"
    else echo "  FAIL  $Label — expected /$Pattern/ in $File"; Fail=1; fi
}

# ── The four-element optical stack ─────────────────────────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] the intended optical stack is present"
# Search actual identifiers rather than comments: this gate must protect halo support now, not reject it.
CheckConstant "the halo is a named element bit"    'LensFlareElementHalo[[:space:]]*=[[:space:]]*1u << 3' "$Structure"
CheckConstant "the shader carries halo parameters"  'vec4 FlareHalo' "$Viewport"
CheckConstant "the halo function is composited"     'CelestialFlareHalo' "$Viewport"
CheckConstant "the shader tests the halo bit"       'kFlareElementHalo' "$Viewport"
CheckConstant "halo intensity is exposed"           'flare.halo.intensity' "$Structure"
CheckConstant "halo radius is exposed"              'flare.halo.radius' "$Structure"
CheckConstant "halo thickness is exposed"           'flare.halo.thickness' "$Structure"
CheckConstant "halo profile is exposed"             'flare.halo.falloff' "$Structure"
CheckConstant "the four-element Full style exists"  'Full *= 4u' "$Structure"
CheckConstant "the Project Zero CLI accepts halo"   'Item == "halo"' "Projects/Project-Zero/Source/GameExecution.cpp"
CheckConstant "the CLI can select the Full style"   'V, "full"' "Projects/Project-Zero/Source/GameExecution.cpp"
CheckConstant "the element mask has four bits"     'LensFlareElementHalo' "$Structure"

# The packed record must remain structurally tied to the shipping shader.
CheckConstant "halo is packed on the CPU"           'Out\.FlareHalo\[0\]' "Engine/DisplayPresentation/CelestialUniform.h"
CheckConstant "the extracted port includes halo"    'CelestialFlareHalo' "Scratchpad/ExtractCelestialPort.sh"

# ── The degenerate case that WAS a halo ──────────────────────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] the dead-centre ghost collapse stays fixed"
# With the camera looking exactly at the sun there is no displacement axis for a ghost chain. The guard keeps the
# reflections from collapsing into the source while the explicit halo owns the annular response.
CheckConstant "ghosts bail out when the sun is dead centre" 'if \(offAxis < 1e-4\) return vec3\(0\.0\)' "$Viewport"
CheckConstant "and ramp in rather than popping"             'centreFade' "$Viewport"

# ── Physical behaviour that is easy to "simplify" wrongly ────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] odd apertures still double their spikes"
CheckConstant "odd blade counts double the spike count" 'mod\(blades, 2\.0\) < 0\.5 \? blades : blades \* 2\.0' "$Viewport"

# ── Styles and combining ──────────────────────────────────────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] styles and free combination"
CheckConstant "the style enum exists"             'LensFlareStyleCategory' "$Structure"
CheckConstant "styles are applied as whole looks"  'ApplyLensFlareStyle' "$Structure"
CheckConstant "the mask overrides the style"      'ElementMask' "$Structure"
# Styles describe complete camera looks; the element mask remains freely combinable.
if grep -q 'LensFlareTierCategory' "$Structure" "$Viewport"; then
    echo "  FAIL  the quality tiers returned; they claimed a cost order the measurements contradict"
    Fail=1
else
    echo "  OK    no quality-tier enum (styles replaced it)"
fi
CheckConstant "the game exposes --flare"          '\-\-flare' "Projects/Project-Zero/Source/GameExecution.cpp"
CheckConstant "and --flare-elements for combining" '\-\-flare-elements' "Projects/Project-Zero/Source/GameExecution.cpp"

# ── Integer properties must use the integer accessor ─────────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] integer settings are written as integers"
# Writing a float bit pattern into an int field turns 6 blades into 1086324736.
CheckConstant "an Integer property kind exists"     'Integer = 2u' "$Structure"
CheckConstant "with its own typed accessor"         'WriteCelestialInteger' "$Structure"
CheckConstant "and the codec dispatches on it"      'CelestialPropertyKind::Integer' "Engine/DisplayPresentation/CelestialSettingsCodec.h"

# ── SPIR-V ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
echo
echo "[LensFlare] the production kernel compiles"
Glslang=""
for Candidate in "${GLSLANG:-}" /home/user/deps/glslang/bin/glslangValidator "$(command -v glslangValidator 2>/dev/null)"; do
    [ -n "$Candidate" ] && [ -x "$Candidate" ] && { Glslang="$Candidate"; break; }
done
if [ -z "$Glslang" ]; then
    echo "  SKIP  no glslangValidator on PATH"
else
    Spv="$(mktemp -u /tmp/LensFlare.XXXXXX.spv)"
    if "$Glslang" -V --target-env vulkan1.2 -S comp -IEngine/Shaders -IEngine -o "$Spv" "$Viewport" >/tmp/LensFlare.spv.log 2>&1; then
        echo "  OK    lowers to SPIR-V ($(stat -c%s "$Spv") bytes)"
    else
        echo "  FAIL  no longer lowers to SPIR-V"; sed 's/^/    /' /tmp/LensFlare.spv.log | head -20; Fail=1
    fi
    rm -f "$Spv"
fi

echo
if [ "$Fail" -eq 0 ]; then echo "[LensFlare] OK"; else echo "[LensFlare] FAILED"; fi
exit "$Fail"
