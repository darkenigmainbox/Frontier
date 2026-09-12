#!/usr/bin/env bash
#============================================================================================================================================
# 📦 Scratchpad/RenderProjectZeroShowcase.sh — Project Zero's sky, sun, moon and stars as the game renders them
#============================================================================================================================================
# Headless, like the gates — no Vulkan, no GLFW, no window. Builds ProjectZeroShowcase.cpp, which loads the
# shipping CornellBox.gltf through ContentCodec, drives CelestialSequence through ApplyTo, writes five CPU raster
# images, and writes a separate native GPU-feed record. The GPU record is not a GPU execution claim.
#
# Dependency roots follow CheckCelestialSky so the showcase stays runnable in the same environment.
set -u
cd "$(dirname "$0")/.."
Cg="${CGLTF:-/tmp/cg}"; Ufbx="${UFBX:-/tmp/ufbxsrc}"; Stb="${STB:-/tmp/stbsrc}"; FastObj="${FAST_OBJ:-/tmp/fast_obj}"
Bvh="${TINYBVH:-/tmp/tinybvh}"; Vkh="${VKH:-/tmp/vkh/include}"
[ -d "$Vkh" ] || Vkh="/tmp/sws/include"
# The proof deliberately compiles the shipping ContentCodec, so make its small header-only inputs explicit instead
# of silently falling back to an alternate scene loader. Callers may still provide pinned/local roots through env.
[ -f "$Cg/cgltf.h" ] || git clone --depth 1 -q https://github.com/jkuhlmann/cgltf.git "$Cg"
[ -f "$Ufbx/ufbx.h" ] || git clone --depth 1 -q https://github.com/ufbx/ufbx.git "$Ufbx"
[ -f "$Stb/stb_image.h" ] || git clone --depth 1 -q https://github.com/nothings/stb.git "$Stb"
[ -f "$FastObj/fast_obj.h" ] || git clone --depth 1 -q https://github.com/thisistherk/fast_obj.git "$FastObj"
[ -f "$Bvh/tiny_bvh.h" ] || git clone --depth 1 -q https://github.com/jbikker/tinybvh.git "$Bvh"

echo "[Showcase] Project Zero's sky through the game's own sequence"
Show="$(mktemp -u /tmp/ProjectZeroShowcase.XXXXXX)"
if ! g++ -std=c++20 -O2 -msse4.2 -I . -I Engine -I Scratchpad \
     -I "$Cg" -I "$Ufbx" -I "$Stb" -I "$FastObj" -I "$Bvh" -I "$Vkh" -o "$Show" \
     Scratchpad/ProjectZeroShowcase.cpp \
     Projects/Project-Zero/Source/CelestialSequence.cpp \
     Engine/GeometricRaster/VisibilityRaster.cpp \
     Engine/GeometricRaster/StarCatalogueIndex.cpp \
     Engine/GeometricRaster/SceneStructure.cpp \
     Engine/GeometricRaster/GeometryStructure.cpp \
     Engine/GeometricRaster/TraversalIndex.cpp \
     Engine/DisplayPresentation/CelestialSolver.cpp \
     Engine/DisplayPresentation/FidelityClassifier.cpp \
     Engine/DisplayPresentation/ReSTIRIntegrator.cpp \
     Engine/DisplayPresentation/ExposureIntegrator.cpp \
     Engine/GeometricRaster/CameraProjection.cpp \
     Engine/ContentInterchange/ContentCodec.cpp \
     Engine/ContentInterchange/FbxCodec.cpp \
     Engine/ContentInterchange/ObjCodec.cpp \
     "$Ufbx/ufbx.c" \
     Engine/ContentInterchange/SceneCodec.cpp \
     Engine/ContentInterchange/MaterialCodec.cpp \
     Engine/ContentInterchange/MaterialIndex.cpp \
     Engine/ContentInterchange/TextureIndex.cpp \
     Engine/DeviceExchange/OrientationClassifier.cpp \
     Engine/DeviceExchange/InputExchange.cpp \
     Projects/Project-Zero/Source/FlyThroughSolver.cpp \
     2>/tmp/ProjectZeroShowcase.build; then
    echo "  SHOWCASE FAILED TO BUILD"; sed 's/^/    /' /tmp/ProjectZeroShowcase.build | head -20; exit 1
fi
"$Show" || exit 1
rm -f "$Show"
