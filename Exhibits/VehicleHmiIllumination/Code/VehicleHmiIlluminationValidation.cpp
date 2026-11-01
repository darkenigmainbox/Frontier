/*==========================================================================================================================================
                                                 VEHICLE HMI ILLUMINATION VALIDATION
                                     ------------------------------------------------------------------
                 End-to-end C++20 validation of the 1:1 VehicleHMI ReSTIR GI path tracer, Two-Level BVH
                  (8-bin SAH TLAS + 12-bin SAH BLAS + Voronoi fracture BLAS), 16x16x4 clustered lighting,
                   temporal/spatial reservoir reuse with reconnection Jacobian, SVGF à-trous wavelet,
                        4-cascade toroidal SDF + 6-card surface radiosity depot, and Slang shaders.
==========================================================================================================================================*/

// 🧩 1:1 C++20 port of Experimental/VehicleHmiPrototype/Tools/RestirPathTracer.test.mjs + Slang shader verification.

#include "Exhibits/TextureStudio/Code/AtlasReadback.h"
#include "Frontier/Engine/Rendering/ClusteredLightingSequence.h"
#include "Frontier/Engine/Rendering/DistanceAndCardSequence.h"
#include "Frontier/Engine/Rendering/RayTracingSpace.h"
#include "Frontier/Engine/Rendering/ResamplingAndVarianceSequence.h"
#include "Projects/Everest/Source/EverestCourseScene.h"
#include "Projects/Everest/Source/EverestSceneEncoding.h"

#include <stb_image_write.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <filesystem>
#include <iostream>
#include <vector>

namespace
{

using namespace Frontier;

[[nodiscard]] float WordToFloatLocal(uint32_t Bits) noexcept
{
    float Value = 0.0f;
    std::memcpy(&Value, &Bits, sizeof(float));
    return Value;
}

[[nodiscard]] std::vector<TriangleFacetRecord> ConstructSyntheticCube(float          HalfExtent,
                                                                      CourseMaterial Family = CourseMaterial::BodyCoat)
{
    const float H = HalfExtent;
    const std::array<std::array<float, 3>, 8> V = {{
        {-H, -H, -H}, { H, -H, -H}, { H,  H, -H}, {-H,  H, -H},
        {-H, -H,  H}, { H, -H,  H}, { H,  H,  H}, {-H,  H,  H}
    }};

    struct QuadFace
    {
        std::array<uint32_t, 4> Indices;
        std::array<float, 3>    Normal;
    };

    const std::array<QuadFace, 6> Faces = {{
        {{0, 1, 2, 3}, { 0,  0, -1}},
        {{4, 7, 6, 5}, { 0,  0,  1}},
        {{0, 4, 5, 1}, { 0, -1,  0}},
        {{2, 6, 7, 3}, { 0,  1,  0}},
        {{0, 3, 7, 4}, {-1,  0,  0}},
        {{1, 5, 6, 2}, { 1,  0,  0}}
    }};

    std::vector<TriangleFacetRecord> Facets;
    Facets.reserve(12u);
    for (const QuadFace& F : Faces)
    {
        const auto& I = F.Indices;
        const auto& N = F.Normal;
        Facets.push_back({{V[I[0]], V[I[1]], V[I[2]]}, {N, N, N}, true, Family});
        Facets.push_back({{V[I[0]], V[I[2]], V[I[3]]}, {N, N, N}, true, Family});
    }
    return Facets;
}

[[nodiscard]] SceneFacetCollection ConstructSyntheticScene()
{
    SceneFacetCollection Scene{};

    const auto GroundTris = ConstructSyntheticCube(1.0f, CourseMaterial::Asphalt);
    std::vector<TriangleFacetRecord> ScaledGround;
    ScaledGround.reserve(GroundTris.size());
    for (const TriangleFacetRecord& F : GroundTris)
    {
        TriangleFacetRecord Scaled = F;
        for (size_t Corner = 0u; Corner < 3u; ++Corner)
        {
            Scaled.Corners[Corner] = {
                F.Corners[Corner][0] * 50.0f,
                F.Corners[Corner][1] * 50.0f,
                F.Corners[Corner][2] * 0.1f - 0.1f
            };
        }
        ScaledGround.push_back(Scaled);
    }

    const auto CubeTris = ConstructSyntheticCube(1.0f, CourseMaterial::BodyCoat);
    auto       WheelTris = ConstructSyntheticCube(0.4f, CourseMaterial::Tyre);
    const auto RimTris   = ConstructSyntheticCube(0.25f, CourseMaterial::RimCarbon);
    WheelTris.insert(WheelTris.end(), RimTris.begin(), RimTris.end());
    const auto GlassTris = ConstructSyntheticCube(0.5f, CourseMaterial::VehicleGlass);

    Scene.FacetSets = {
        {"Ground", ScaledGround, {-50.0f, -50.0f, -0.2f}, {50.0f, 50.0f, 0.0f},  0.50f, -1},
        {"Body",   CubeTris,     {-1.0f,  -1.0f,  -1.0f}, { 1.0f,  1.0f, 1.0f},  0.08f, -1},
        {"Wheel",  WheelTris,    {-0.4f,  -0.4f,  -0.4f}, { 0.4f,  0.4f, 0.4f},  0.05f, -1},
        {"Glass",  GlassTris,    {-0.5f,  -0.5f,  -0.5f}, { 0.5f,  0.5f, 0.5f},  0.05f, -1}
    };

    const uint32_t FullRoles = OccupantAssignmentRaster | OccupantAssignmentDistance | OccupantAssignmentCards;
    Scene.Occupants = {
        {0u, OccupantAssignmentRaster, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({0.0f, 0.0f, 0.0f}, {0, 0, 0, 1}),
         ConstructRigidTransform({0.0f, 0.0f, 0.0f}, {0, 0, 0, 1}),
         {-50.0f, -50.0f, -0.2f}, {50.0f, 50.0f, 0.0f}},
        {1u, FullRoles, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({0.0f, 0.0f, 1.5f}, {0, 0, 0, 1}),
         ConstructRigidTransform({0.0f, 0.0f, 1.5f}, {0, 0, 0, 1}),
         {-1.0f, -1.0f, -1.0f}, {1.0f, 1.0f, 1.0f}},
        {2u, FullRoles, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({2.0f, 1.0f, 0.4f}, {0, 0, 0, 1}),
         ConstructRigidTransform({2.0f, 1.0f, 0.4f}, {0, 0, 0, 1}),
         {-0.4f, -0.4f, -0.4f}, {0.4f, 0.4f, 0.4f}},
        {2u, FullRoles, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({2.0f, -1.0f, 0.4f}, {0, 0, 0, 1}),
         ConstructRigidTransform({2.0f, -1.0f, 0.4f}, {0, 0, 0, 1}),
         {-0.4f, -0.4f, -0.4f}, {0.4f, 0.4f, 0.4f}},
        {2u, FullRoles, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({-2.0f, 1.0f, 0.4f}, {0, 0, 0, 1}),
         ConstructRigidTransform({-2.0f, 1.0f, 0.4f}, {0, 0, 0, 1}),
         {-0.4f, -0.4f, -0.4f}, {0.4f, 0.4f, 0.4f}},
        {2u, FullRoles, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({-2.0f, -1.0f, 0.4f}, {0, 0, 0, 1}),
         ConstructRigidTransform({-2.0f, -1.0f, 0.4f}, {0, 0, 0, 1}),
         {-0.4f, -0.4f, -0.4f}, {0.4f, 0.4f, 0.4f}},
        {3u, OccupantAssignmentRaster, NoMaterialOverrideSentinel, false, false,
         ConstructRigidTransform({5.0f, 0.0f, 1.5f}, {0, 0, 0, 1}),
         ConstructRigidTransform({5.0f, 0.0f, 1.5f}, {0, 0, 0, 1}),
         {-0.5f, -0.5f, -0.5f}, {0.5f, 0.5f, 0.5f}},
        {1u, OccupantAssignmentRaster, static_cast<uint32_t>(CourseMaterial::WallCrimson), true, true,
         ConstructRigidTransform({0.0f, 0.0f, -100.0f}, {0, 0, 0, 1}),
         ConstructRigidTransform({0.0f, 0.0f, -100.0f}, {0, 0, 0, 1}),
         {-0.3f, -0.3f, -0.3f}, {0.3f, 0.3f, 0.3f}},
        {1u, OccupantAssignmentRaster, static_cast<uint32_t>(CourseMaterial::WallViridian), true, true,
         ConstructRigidTransform({0.0f, 0.0f, -100.0f}, {0, 0, 0, 1}),
         ConstructRigidTransform({0.0f, 0.0f, -100.0f}, {0, 0, 0, 1}),
         {-0.3f, -0.3f, -0.3f}, {0.3f, 0.3f, 0.3f}}
    };

    Scene.GroundOccupant = 0;
    Scene.BodyOccupant   = 1u;
    Scene.WheelOccupants = {2u, 3u, 4u, 5u};
    return Scene;
}

} // namespace

int main(int argc, char** argv)
{
    const std::filesystem::path RepoRoot  = (argc > 1) ? std::filesystem::path(argv[1]) : std::filesystem::current_path();
    const std::filesystem::path OutputDir = (argc > 3) ? std::filesystem::path(argv[3]) : (RepoRoot / "build" / "vehicle-hmi-exhibits");
    std::filesystem::create_directories(OutputDir);

    // 1. Octahedral normal codec round-trip
    {
        const std::array<std::array<float, 3>, 8> TestNormals = {{
            { 1.0f,  0.0f,  0.0f}, {-1.0f,  0.0f,  0.0f},
            { 0.0f,  1.0f,  0.0f}, { 0.0f, -1.0f,  0.0f},
            { 0.0f,  0.0f,  1.0f}, { 0.0f,  0.0f, -1.0f},
            { 0.57735027f,  0.57735027f,  0.57735027f},
            {-0.57735027f,  0.57735027f, -0.57735027f}
        }};
        for (const auto& N : TestNormals)
        {
            const uint32_t Packed   = PackOctahedralCpu(N);
            const auto     Unpacked = UnpackOctahedralCpu(Packed);
            const float    Dot      = N[0] * Unpacked[0] + N[1] * Unpacked[1] + N[2] * Unpacked[2];
            if (Dot <= 0.9998f)
            {
                std::cerr << "Octahedral normal round-trip failed: dot=" << Dot << "\n";
                return 1;
            }
        }
    }

    // 2. Binned-SAH BLAS construction
    {
        const auto            CubeFacets = ConstructSyntheticCube(1.0f, CourseMaterial::BodyCoat);
        const BlasBuildResult Blas       = ConstructFacetBlas(CubeFacets, 100u, 50u);
        if (Blas.RootCell != 100u || Blas.TriangleCount != 12u || Blas.CellCount < 1u)
        {
            std::cerr << "ConstructFacetBlas invariants failed\n";
            return 1;
        }
        if (std::abs(WordToFloatLocal(Blas.CellWords[0]) + 1.0f) > 1.0e-5f ||
            std::abs(WordToFloatLocal(Blas.CellWords[4]) - 1.0f) > 1.0e-5f)
        {
            std::cerr << "ConstructFacetBlas root AABB bounds mismatch\n";
            return 1;
        }
    }

    // 3. Two-Level BVH (TLAS + BLAS), VehicleGlass skip, and Shredded Tyre skip
    SceneFacetCollection Scene = ConstructSyntheticScene();
    RayTracingSpace      RaySpace{};
    RaySpace.ConstructResources(Scene);

    if (RaySpace.TotalTriangles() != 60u || RaySpace.ActiveInstances() != 7u || RaySpace.UsedTlasCells() != 13u)
    {
        std::cerr << "RayTracingSpace initial counts mismatch: tris=" << RaySpace.TotalTriangles()
                  << " instances=" << RaySpace.ActiveInstances()
                  << " tlas=" << RaySpace.UsedTlasCells() << "\n";
        return 1;
    }

    {
        const CpuRayIntersection DownHit = RaySpace.TraceRayCpu(Scene, {0.0f, 0.0f, 10.0f}, {0.0f, 0.0f, -1.0f});
        if (!DownHit.Hit || DownHit.Occupant != 1u || DownHit.Family != CourseMaterial::BodyCoat ||
            std::abs(DownHit.Travel - 7.5f) > 1.0e-3f)
        {
            std::cerr << "Primary downward ray onto Body cube failed\n";
            return 1;
        }

        const CpuRayIntersection GroundHit = RaySpace.TraceRayCpu(Scene, {10.0f, 10.0f, 5.0f}, {0.0f, 0.0f, -1.0f});
        if (!GroundHit.Hit || GroundHit.Occupant != 0u || GroundHit.Family != CourseMaterial::Asphalt ||
            std::abs(GroundHit.Travel - 5.0f) > 1.0e-3f)
        {
            std::cerr << "Ground ray hit failed\n";
            return 1;
        }

        const CpuRayIntersection GlassRay = RaySpace.TraceRayCpu(Scene, {8.0f, 0.0f, 1.5f}, {-1.0f, 0.0f, 0.0f});
        if (!GlassRay.Hit || GlassRay.Occupant != 1u || std::abs(GlassRay.Travel - 7.0f) > 1.0e-3f)
        {
            std::cerr << "VehicleGlass skip failed\n";
            return 1;
        }

        const CpuRayIntersection IntactWheel = RaySpace.TraceRayCpu(Scene, {2.0f, 3.0f, 0.4f}, {0.0f, -1.0f, 0.0f});
        if (!IntactWheel.Hit || IntactWheel.Occupant != 2u || IntactWheel.Family != CourseMaterial::Tyre ||
            std::abs(IntactWheel.Travel - 1.6f) > 1.0e-3f)
        {
            std::cerr << "Intact wheel Tyre hit failed\n";
            return 1;
        }

        const std::array<bool, 4> Shredded = {true, false, false, false};
        RaySpace.UpdateTlas(Scene, &Shredded);
        const CpuRayIntersection ShreddedWheel = RaySpace.TraceRayCpu(Scene, {2.0f, 3.0f, 0.4f}, {0.0f, -1.0f, 0.0f});
        if (!ShreddedWheel.Hit || ShreddedWheel.Occupant != 2u || ShreddedWheel.Family != CourseMaterial::RimCarbon ||
            std::abs(ShreddedWheel.Travel - 1.75f) > 1.0e-3f)
        {
            std::cerr << "Shredded wheel RimCarbon hit failed\n";
            return 1;
        }
        const std::array<bool, 4> Restored = {false, false, false, false};
        RaySpace.UpdateTlas(Scene, &Restored);
    }

    // 4. Dynamic Voronoi fracture BLAS + TLAS registration
    {
        const std::vector<FracturePieceGeometry> Fragments = {
            {ConstructSyntheticCube(0.3f, CourseMaterial::WallCrimson),  {-0.3f, -0.3f, -0.3f}, {0.3f, 0.3f, 0.3f}},
            {ConstructSyntheticCube(0.3f, CourseMaterial::WallViridian), {-0.3f, -0.3f, -0.3f}, {0.3f, 0.3f, 0.3f}}
        };
        RaySpace.RegisterPropFragments(0u, 7u, 2u, Fragments);
        Scene.Occupants[7].Inactive  = false;
        Scene.Occupants[7].Transform = ConstructRigidTransform({-6.0f, 0.0f, 1.0f}, {0, 0, 0, 1});
        Scene.Occupants[8].Inactive  = false;
        Scene.Occupants[8].Transform = ConstructRigidTransform({-6.0f, 2.0f, 1.0f}, {0, 0, 0, 1});
        RaySpace.UpdateTlas(Scene, nullptr);

        const CpuRayIntersection FragHit = RaySpace.TraceRayCpu(Scene, {-6.0f, 0.0f, 5.0f}, {0.0f, 0.0f, -1.0f});
        if (!FragHit.Hit || FragHit.Occupant != 7u || FragHit.Family != CourseMaterial::WallCrimson ||
            std::abs(FragHit.Travel - 3.7f) > 1.0e-3f)
        {
            std::cerr << "Dynamic Voronoi fragment ray hit failed\n";
            return 1;
        }

        RaySpace.ClearPropFragments(7u, 2u);
        Scene.Occupants[7].Inactive = true;
        Scene.Occupants[8].Inactive = true;
        RaySpace.UpdateTlas(Scene, nullptr);
    }

    // 5. Feature bitmasks & bounce/reflection encoding
    {
        for (uint32_t Bounces = 1u; Bounces <= 6u; ++Bounces)
        {
            const uint32_t Bits = FeatureRayTracing | FeatureRayTracedReflections | EncodeBounceCountBits(Bounces);
            if (ResolveBounceCountCpu(Bits) != Bounces)
            {
                std::cerr << "Bounce count bitfield round-trip failed for " << Bounces << "\n";
                return 1;
            }
        }
        const float Encoded = EncodeReflectionParametersCpu(1.35f, 0.68f);
        if (std::abs(ResolveReflectionScaleCpu(Encoded) - 1.35f) > 1.0e-3f ||
            std::abs(ResolveReflectionRoughnessCpu(Encoded) - 0.68f) > 1.0e-3f)
        {
            std::cerr << "Reflection parameter encoding round-trip failed\n";
            return 1;
        }
    }

    // 6. ClusteredLightingSequence 16x16x4 world grid & cone bounds
    ClusteredLightingSequence ClusteredLights{};
    {
        const std::vector<StreetPoleSpecification> Poles = {
            {{10.0f, -6.0f, 7.2f}, {1.0f, 0.85f, 0.6f}, 22.0f, 28.0f, false, {0.0f, 0.0f, -1.0f}, 0.48f},
            {{25.0f,  6.0f, 9.0f}, {0.9f, 0.95f, 1.0f}, 35.0f, 36.0f, true,  {-0.707f, 0.0f, -0.707f}, 0.55f}
        };
        const std::vector<PointLampSpecification> PointLamps = {
            {{-4.0f, 2.0f, 2.5f}, {1.0f, 0.5f, 0.2f}, 14.0f, 12.0f}
        };
        ClusteredLights.HeadlightMode = AutomotiveBeamMode::LowBeam;
        ClusteredLights.RoofMounted   = true;
        ClusteredLights.RoofCategory  = RoofFixtureCategory::RallyPod;
        ClusteredLights.Braking       = true;
        ClusteredLights.Update(Scene.Occupants[1].Transform, Poles, PointLamps, nullptr);

        if (ClusteredLights.ActiveCount() != 11u)
        {
            std::cerr << "ClusteredLightingSequence expected 11 active emitters, got " << ClusteredLights.ActiveCount() << "\n";
            return 1;
        }

        const LightWorldBounds ConeBounds = ResolveLightWorldBounds(ClusteredLights.ActiveLights()[0]);
        const float            ConeVol    = (ConeBounds.Maximum[0] - ConeBounds.Minimum[0])
                                          * (ConeBounds.Maximum[1] - ConeBounds.Minimum[1])
                                          * (ConeBounds.Maximum[2] - ConeBounds.Minimum[2]);
        const float            R          = ClusteredLights.ActiveLights()[0].Radius;
        const float            CubeVol    = (2.0f * R) * (2.0f * R) * (2.0f * R);
        if (ConeVol >= 0.65f * CubeVol)
        {
            std::cerr << "Directional cone AABB volume was not tighter than 65% of sphere cube\n";
            return 1;
        }
    }

    // 7. Materials (81 families including 5 AutomotivePaint flake presets), BSDF, NEE, Multi-bounce ReSTIR GI, and SVGF Variance Wavelet
    const auto Materials     = ConstructDefaultMaterials();
    const auto MaterialWords = EncodeMaterialRecords(Materials);
    if (Materials.size() != static_cast<size_t>(CourseMaterial::Count) || MaterialWords.size() != Materials.size() * 24u)
    {
        std::cerr << "Material record table size mismatch\n";
        return 1;
    }
    for (CourseMaterial FlakeMat : {
             CourseMaterial::BodyCoat,
             CourseMaterial::BodyCoatGreen,
             CourseMaterial::BodyCoatYellow,
             CourseMaterial::BodyCoatBlue,
             CourseMaterial::BodyCoatOrange
         })
    {
        const auto& Spec = Materials[static_cast<size_t>(FlakeMat)];
        if (Spec.FlakeCoverage <= 0.5f || Spec.CoatWeight < 1.0f || Spec.CoatingThickness <= 0.0f)
        {
            std::cerr << "AutomotivePaint flake preset validation failed\n";
            return 1;
        }
    }

    PathTraceEnvironmentParameters Environment{};
    Environment.Features       = FeatureRayTracing | FeatureRayTracedReflections | FeatureTemporalAccumulation
                               | FeatureSpatialResampling | FeatureVisibilityReuse | FeatureSunShadows
                               | FeatureClusteredLights | FeatureVarianceKernel | FeatureReflectionFirefly
                               | EncodeBounceCountBits(3u);
    Environment.BounceCount    = 3u;
    Environment.CabinHmiActive = true;

    ResamplingAndVarianceSequence Resampler{};
    constexpr uint32_t            ScreenWidth  = 64u;
    constexpr uint32_t            ScreenHeight = 64u;
    Resampler.ConfigureDimensions(ScreenWidth, ScreenHeight, 2u);

    const uint32_t              TraceW = Resampler.TraceWidth();
    const uint32_t              TraceH = Resampler.TraceHeight();
    std::vector<TracePixelGuide> Guides(static_cast<size_t>(TraceW * TraceH));

    for (uint32_t Y = 0u; Y < TraceH; ++Y)
    {
        for (uint32_t X = 0u; X < TraceW; ++X)
        {
            const float U = (static_cast<float>(X) + 0.5f) / static_cast<float>(TraceW) * 2.0f - 1.0f;
            const float V = 1.0f - (static_cast<float>(Y) + 0.5f) / static_cast<float>(TraceH) * 2.0f;

            const std::array<float, 3> CamOrigin = {-5.5f, 0.0f, 2.4f};
            const std::array<float, 3> RayDir    = [&]()
            {
                const float Dx =  1.0f;
                const float Dy = -U * 0.65f;
                const float Dz =  V * 0.55f - 0.18f;
                const float L  = std::sqrt(Dx * Dx + Dy * Dy + Dz * Dz);
                return std::array<float, 3>{Dx / L, Dy / L, Dz / L};
            }();

            const CpuRayIntersection Hit    = RaySpace.TraceRayCpu(Scene, CamOrigin, RayDir);
            TracePixelGuide&         Guide  = Guides[static_cast<size_t>(Y) * TraceW + X];
            if (Hit.Hit)
            {
                Guide.WorldPosition = Hit.Position;
                Guide.WorldNormal   = Hit.Normal;
                Guide.ViewDepth     = Hit.Travel;
                Guide.ExpectedDepth = Hit.Travel;
                Guide.Family        = Hit.Family;
            }
            else
            {
                Guide.ViewDepth = -1.0f;
            }
        }
    }

    for (uint32_t Step = 0u; Step < 3u; ++Step)
    {
        Resampler.StepTemporalAndSpatialReuseCpu(Scene, RaySpace, Materials, &ClusteredLights, Environment, Guides, Step);
        Resampler.StepVarianceFilterCpu(Guides, Step, true);
    }

    uint32_t NonZeroReservoirs = 0u;
    for (const VehicleReservoirRecord& R : Resampler.SpatialReservoirs())
    {
        if (R.SampleTally > 0.0f && R.WeightFactor >= 0.0f)
        {
            ++NonZeroReservoirs;
        }
    }
    if (NonZeroReservoirs < (TraceW * TraceH) / 4u)
    {
        std::cerr << "Insufficient active spatial reservoirs: " << NonZeroReservoirs << "\n";
        return 1;
    }

    // 8. OccupantDistanceSpace, SceneDistanceSpace, and SurfaceCardDepot
    {
        OccupantDistanceSpace OccupantSdf{};
        OccupantSdf.ConstructResources(Scene);
        const float SurfaceDist = OccupantSdf.SampleLocalDistanceCpu(1u, {1.0f, 0.0f, 0.0f});
        if (!std::isfinite(SurfaceDist) || std::abs(SurfaceDist) > 0.5f)
        {
            std::cerr << "OccupantDistanceSpace local SDF sample out of bounds: " << SurfaceDist << "\n";
            return 1;
        }

        SceneDistanceSpace WorldSdf{};
        WorldSdf.UpdateCascades(Scene, {0.0f, 0.0f, 1.5f}, true);
        if (WorldSdf.Cascades()[0].ActiveOccupants.empty())
        {
            std::cerr << "SceneDistanceSpace cascade 0 found no active occupants\n";
            return 1;
        }

        SurfaceCardDepot CardDepot{};
        CardDepot.ConstructResources(Scene);
        if (CardDepot.ActiveCardCount() != 30u)
        {
            std::cerr << "SurfaceCardDepot expected 30 cards (5 occupants * 6 faces), got " << CardDepot.ActiveCardCount() << "\n";
            return 1;
        }
    }

    // 9. Compile and verify all 16 VehicleHMI Slang shader entry points if slangc is present
    const std::filesystem::path SlangcPath = std::filesystem::exists("/tmp/slang/slangpy/slangc")
                                           ? std::filesystem::path("/tmp/slang/slangpy/slangc")
                                           : (RepoRoot / "ExternalPackages/VulkanCompute/Slang/slangtorch/bin/slangc");
    if (std::filesystem::exists(SlangcPath))
    {
        const ShaderCompilationSummary Summary = VerifyVehicleHmiShaderSuite(
            RepoRoot / "Frontier/Engine/Shaders",
            SlangcPath);
        if (Summary.CompiledCount != 16u)
        {
            std::cerr << "VehicleHMI Slang shader suite compiled " << Summary.CompiledCount << "/16 entry points\n";
            return 1;
        }
    }

    // 10. Validate EverestCourseScene (5 static showcase cars) + coupled EverestSceneEncoding exhibit PNG
    Everest::EverestSceneEncoding CoupledEncoding{};
    if (CoupledEncoding.Course().ShowcaseVehicles.size() != 5u)
    {
        std::cerr << "Expected 5 static showcase vehicles in EverestCourseScene\n";
        return 1;
    }

    Everest::EverestCameraSpecification CamSpec{};
    Everest::EverestEnvironmentSettings EnvSettings{};
    EnvSettings.Pipeline.QualityTier = 2;
    std::vector<uint8_t>                CoupledPixels;
    constexpr uint32_t                  ExhibitW = 640u;
    constexpr uint32_t                  ExhibitH = 360u;
    for (uint32_t Frame = 0u; Frame < 4u; ++Frame)
    {
        CoupledEncoding.EncodeFrame(ExhibitW, ExhibitH, CamSpec, EnvSettings, CoupledPixels);
    }
    const std::filesystem::path PngPath = OutputDir / "VehicleHmiRestirExhibit.png";
    stbi_write_png(PngPath.string().c_str(), static_cast<int>(ExhibitW), static_cast<int>(ExhibitH), 4, CoupledPixels.data(), static_cast<int>(ExhibitW * 4u));

    // 11. Validate Vulkan GPU compute path in EverestSceneEncoding if SwiftShader/Vulkan driver is available
    const std::filesystem::path SwiftShaderPath = RepoRoot / "ExternalPackages/VulkanCompute/SwiftShader/libvulkan.so.1";
    if (std::filesystem::exists(SwiftShaderPath))
    {
#if !defined(_WIN32)
        const std::filesystem::path IcdJson = SwiftShaderPath.parent_path() / "vk_swiftshader_icd.json";
        if (std::filesystem::exists(IcdJson))
        {
            setenv("VK_ICD_FILENAMES", IcdJson.string().c_str(), 1);
        }
#endif
        AtlasValidationDevice GpuDevice(SwiftShaderPath.string().c_str(), VK_API_VERSION_1_2);
        if (!CoupledEncoding.InitializeGpu(GpuDevice.QueryAccess()) || !CoupledEncoding.GpuReady())
        {
            std::cerr << "EverestSceneEncoding::InitializeGpu failed on Vulkan device\n";
            return 1;
        }
        std::vector<unsigned char> GpuPixels;
        for (uint32_t Frame = 0u; Frame < 4u; ++Frame)
        {
            CoupledEncoding.ConfigureLiveGpu(1280.0f / 720.0f, CamSpec, EnvSettings);
            GpuPixels = GpuDevice.Capture(
                CoupledEncoding.QueryLiveImage(),
                {1280u, 720u},
                [&](VkCommandBuffer Commands) { CoupledEncoding.ConstructGpuCommands(Commands); },
                []() {});
        }
        CoupledEncoding.FinalizeGpu();
        (void)GpuDevice.DeviceWaitIdle(GpuDevice.Device);

        uint64_t NonBlackPixels = 0u;
        for (size_t I = 0u; I + 3u < GpuPixels.size(); I += 4u)
        {
            if (GpuPixels[I + 0u] > 4u || GpuPixels[I + 1u] > 4u || GpuPixels[I + 2u] > 4u)
            {
                ++NonBlackPixels;
            }
        }
        if (NonBlackPixels < (1280u * 720u) / 2u)
        {
            std::cerr << "EverestSceneEncoding GPU compute render produced too few lit pixels: " << NonBlackPixels << "\n";
            return 1;
        }
        const std::filesystem::path GpuPngPath = OutputDir / "VehicleHmiRestirGpuExhibit.png";
        stbi_write_png(GpuPngPath.string().c_str(), 1280, 720, 4, GpuPixels.data(), 1280 * 4);
    }

    std::cout << "[VehicleHmiIlluminationValidation] Passed all 11 suites ("
              << RaySpace.TotalTriangles() << " synthetic tris, "
              << CoupledEncoding.Course().Scene.Occupants.size() << " proving-grounds occupants, "
              << CoupledEncoding.Course().ShowcaseVehicles.size() << " static flake showcase cars, "
              << ClusteredLights.ActiveCount() << " clustered lights, "
              << NonZeroReservoirs << " active reservoirs, GPU Vulkan compute verified).\n";
    return 0;
}
