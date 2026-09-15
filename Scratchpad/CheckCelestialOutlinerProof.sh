#!/usr/bin/env bash
# Headless visual proof for the celestial outliner — compiles the patched vendor plus the celestial editor,
#    drives the host through the engine's tick order over the reference panel's own tree, rasterises four
#    phases with a dependency-free CPU rasteriser, and gates the sheets: the twelve faces, the 84 SVG icons,
#    the 23 registered rows, the glass plate, the standing pips, and the four phases.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
Fail=0
mkdir -p Diagnostics

echo "[CelestialOutlinerProof] seating the vendor patches, as every build does"
if ! python3 Scripts/ApplyImGuiPatches.py >/tmp/CelestialOutlinerProof.patches 2>&1; then
    echo "  PATCH SEATING FAILED"; sed 's/^/    /' /tmp/CelestialOutlinerProof.patches | head -25; exit 1
fi

[ -f "ExternalPackages/imgui/imgui.h" ] || git submodule update --init ExternalPackages/imgui
[ -f "ExternalPackages/stb/stb_image.h" ] || git submodule update --init ExternalPackages/stb
if [ ! -f "ExternalPackages/thorvg/inc/thorvg.h" ]; then
    echo "[CelestialOutlinerProof] fetching ThorVG (the SVG rasteriser)"
    rm -rf ExternalPackages/thorvg
    git clone --depth 1 -q https://github.com/thorvg/thorvg.git ExternalPackages/thorvg || exit 1
fi

echo "[CelestialOutlinerProof] compiling the patched vendor + celestial editor + ThorVG (headless)"
ObjDir="$(mktemp -d /tmp/CelestialOutlinerProof.obj.XXXXXX)"
CfgDir="$(mktemp -d /tmp/CelestialOutlinerProof.cfg.XXXXXX)"
cat > "$CfgDir/config.h" <<'EOF'
#pragma once
#define THORVG_VERSION_STRING "1.0.0"
#define THORVG_CPU_ENGINE_SUPPORT 1
#define THORVG_SVG_LOADER_SUPPORT 1
#define THORVG_THREAD_SUPPORT 1
#define THORVG_FILE_IO_SUPPORT 1
EOF

THORVG_SRC="ExternalPackages/thorvg"
ThorvgSources="$THORVG_SRC/src/common/tvgCompressor.cpp $THORVG_SRC/src/common/tvgMath.cpp $THORVG_SRC/src/common/tvgStr.cpp"
ThorvgSources="$ThorvgSources $THORVG_SRC/src/renderer/tvgAccessor.cpp $THORVG_SRC/src/renderer/tvgAnimation.cpp $THORVG_SRC/src/renderer/tvgCanvas.cpp $THORVG_SRC/src/renderer/tvgFill.cpp $THORVG_SRC/src/renderer/tvgInitializer.cpp $THORVG_SRC/src/renderer/tvgLoaderMgr.cpp $THORVG_SRC/src/renderer/tvgPaint.cpp $THORVG_SRC/src/renderer/tvgPicture.cpp $THORVG_SRC/src/renderer/tvgRender.cpp $THORVG_SRC/src/renderer/tvgSaver.cpp $THORVG_SRC/src/renderer/tvgScene.cpp $THORVG_SRC/src/renderer/tvgShape.cpp $THORVG_SRC/src/renderer/tvgTaskScheduler.cpp $THORVG_SRC/src/renderer/tvgText.cpp"
ThorvgSources="$ThorvgSources $THORVG_SRC/src/renderer/cpu_engine/tvgSwBlendOp.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwFill.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwImage.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwMemPool.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwPostEffect.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwRaster.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwRenderer.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwRle.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwShape.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwStroke.cpp $THORVG_SRC/src/renderer/cpu_engine/tvgSwUtil.cpp"
ThorvgSources="$ThorvgSources $THORVG_SRC/src/loaders/raw/tvgRawLoader.cpp $THORVG_SRC/src/loaders/svg/tvgSvgBuilder.cpp $THORVG_SRC/src/loaders/svg/tvgSvgCssStyle.cpp $THORVG_SRC/src/loaders/svg/tvgSvgLoader.cpp $THORVG_SRC/src/loaders/svg/tvgSvgPath.cpp $THORVG_SRC/src/loaders/svg/tvgSvgUtil.cpp $THORVG_SRC/src/loaders/svg/tvgXmlParser.cpp"

# shellcheck disable=SC2086
echo $ThorvgSources \
    ExternalPackages/imgui/imgui.cpp \
    ExternalPackages/imgui/imgui_draw.cpp \
    ExternalPackages/imgui/imgui_tables.cpp \
    ExternalPackages/imgui/imgui_widgets.cpp \
    Engine/Editor/CelestialIconIndex.cpp \
    Engine/Editor/CelestialOutlinerPanel.cpp \
    Engine/Editor/CelestialEditorHost.cpp \
    Engine/Editor/ControlPanel.cpp \
    Engine/Editor/ViewportPanel.cpp \
    | tr ' ' '\n' > "$ObjDir/srcs.txt"

Jobs="$( (nproc 2>/dev/null || echo 4) )"
BuildOne() {
    Src="$1"
    Name="$(echo "$Src" | md5sum | cut -c1-12).o"
    if echo "$Src" | grep -q '^ExternalPackages/thorvg/'; then
        g++ -std=c++20 -O1 -w -fPIC -DDTVG_STATIC -DDTVG_BUILD -DNOMINMAX \
            -IExternalPackages/thorvg/inc -I"$CfgDir" \
            -IExternalPackages/thorvg/src/common -IExternalPackages/thorvg/src/renderer \
            -IExternalPackages/thorvg/src/renderer/cpu_engine \
            -IExternalPackages/thorvg/src/loaders/svg -IExternalPackages/thorvg/src/loaders/raw \
            -c "$Src" -o "$ObjDir/$Name" || echo "FAIL $Src"
    elif echo "$Src" | grep -q '^ExternalPackages/imgui/'; then
        g++ -std=c++20 -O1 -w -fPIC -c "$Src" -o "$ObjDir/$Name" || echo "FAIL $Src"
    else
        g++ -std=c++20 -O1 -Wall -Wextra -fPIC -DFRONTIER_DEVELOPMENT -DDTVG_STATIC \
            -IExternalPackages/imgui -IEngine/Editor -IExternalPackages/thorvg/inc -I"$CfgDir" \
            -c "$Src" -o "$ObjDir/$Name" || echo "FAIL $Src"
    fi
}
export ObjDir CfgDir
export -f BuildOne
if xargs -a "$ObjDir/srcs.txt" -P "$Jobs" -I{} bash -c 'BuildOne "$@"' _ {} 2>/tmp/CelestialOutlinerProof.build \
    | grep -q FAIL; then
    echo "  COMPILE FAILED"; head -n 25 /tmp/CelestialOutlinerProof.build | sed 's/^/    /'; exit 1
fi
if [ "$(ls "$ObjDir"/*.o 2>/dev/null | wc -l)" != "44" ]; then
    echo "  COMPILE FAILED (missing objects)"; head -n 25 /tmp/CelestialOutlinerProof.build | sed 's/^/    /'; exit 1
fi

Binary="$(mktemp -u /tmp/CelestialOutlinerProof.XXXXXX)"
if ! g++ -std=c++20 -O1 -Wall -Wextra -DFRONTIER_DEVELOPMENT -DDTVG_STATIC \
    -IExternalPackages/imgui -IEngine/Editor -IScratchpad -IExternalPackages/stb -IExternalPackages/thorvg/inc \
    Scratchpad/CelestialOutlinerProof.cpp "$ObjDir"/*.o -o "$Binary" -lpthread 2>/tmp/CelestialOutlinerProof.link; then
    echo "  LINK FAILED"; head -n 25 /tmp/CelestialOutlinerProof.link | sed 's/^/    /'; exit 1
fi
"$Binary" || Fail=1
rm -f "$Binary"
rm -rf "$ObjDir" "$CfgDir"

echo
echo "[CelestialOutlinerProof] engine ⇄ project seam"
# The engine must never learn game semantics. A single include of Projects/ here would make the editor
# unusable by any other project and break CLAUDE.md's seam rule.
if grep -rn '#include.*Projects/' Engine/Editor/WorldEntry.h Engine/Editor/CelestialIconIndex.h \
    Engine/Editor/CelestialIconIndex.cpp Engine/Editor/CelestialOutlinerPanel.h \
    Engine/Editor/CelestialOutlinerPanel.cpp Engine/Editor/CelestialEditorHost.h \
    Engine/Editor/CelestialEditorHost.cpp >/dev/null 2>&1; then
    echo "  the celestial editor includes from Projects/ — the engine must not know game semantics"; Fail=1
fi

echo
echo "[CelestialOutlinerProof] the editor's own vocabulary (CLAUDE.md §3)"
NewFiles="Engine/Editor/WorldEntry.h Engine/Editor/CelestialIconIndex.h Engine/Editor/CelestialIconIndex.cpp Engine/Editor/CelestialOutlinerPanel.h Engine/Editor/CelestialOutlinerPanel.cpp Engine/Editor/CelestialEditorHost.h Engine/Editor/CelestialEditorHost.cpp Scratchpad/CelestialOutlinerProof.cpp"
# shellcheck disable=SC2086
Bad="$(grep -nE '\b(Manager|Handler|Processor|Controller|Service|Utility|Helper|Node|Frame|Module|Core|System|Backend|Pass|Stage|Harness|Shell|Entity|Element|Subsystem|Hierarchy|Data|Info|Object|Item|Thing|Kind|Base|flag|state|value|Parent|Child|Sibling|Table|Map|Block|Digest|Model|Handle|Store|Bridge|Atlas|Substrate|Fabric|Cache|Evaluator|Evaluate|Journal|Resolver|Mesh|Pool|Registry|Catalog|Repository|Directory|Vault|Arena|Inventory|Ledger|Plan|Filter|Grid|Array|Dispatcher|Memory|Buffer|Pipeline|Flow|Composite|Compose|Composition|Allocation|Tier|Nesting|Stratum|Mip|Messenger|Probe|Blend|History|Bake|Stamp|Contract|Outcome|Prelude|Cadence|Binding|Submission|Footprint|Region|Tree|Vacancy|Ordinates|Draft|Draught|Paint|Depot|Ordinal|Actor|Source|API|Kit|kit|kind)\b' \
    $NewFiles | grep -vE 'Im[A-Z]' || true)"
if [[ -n "$Bad" ]]; then
    echo "  forbidden words in the celestial editor's own vocabulary:"; echo "$Bad" | sed 's/^/    /'; Fail=1
fi
KindHit="$(grep -rni 'kind' Engine/Editor/WorldEntry.h Engine/Editor/CelestialIconIndex.h Engine/Editor/CelestialIconIndex.cpp Engine/Editor/CelestialOutlinerPanel.h Engine/Editor/CelestialOutlinerPanel.cpp Engine/Editor/CelestialEditorHost.h Engine/Editor/CelestialEditorHost.cpp Scratchpad/CelestialOutlinerProof.cpp || true)"
if [[ -n "$KindHit" ]]; then
    echo "  'kind' survives somewhere it must not:"; echo "$KindHit" | sed 's/^/    /'; Fail=1
fi
KitHit="$(grep -rni 'kit' Engine/Editor/WorldEntry.h Engine/Editor/CelestialIconIndex.h Engine/Editor/CelestialIconIndex.cpp Engine/Editor/CelestialOutlinerPanel.h Engine/Editor/CelestialOutlinerPanel.cpp Engine/Editor/CelestialEditorHost.h Engine/Editor/CelestialEditorHost.cpp Scratchpad/CelestialOutlinerProof.cpp || true)"
if [[ -n "$KitHit" ]]; then
    echo "  'kit' survives somewhere it must not:"; echo "$KitHit" | sed 's/^/    /'; Fail=1
fi

echo
for Sheet in Full Search Pills Compact Foot; do
    if [[ ! -s Diagnostics/CelestialOutlinerProof_$Sheet.png ]]; then
        echo "  MISSING Diagnostics/CelestialOutlinerProof_$Sheet.png"; Fail=1
    else
        echo "  wrote Diagnostics/CelestialOutlinerProof_$Sheet.png"
    fi
done

if (( Fail )); then echo "  >>> CELESTIAL OUTLINER PROOF FAILED"; else echo "  >>> the outline agrees with its reference"; fi
exit "$Fail"
