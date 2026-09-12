//============================================================================================================================================
//                                                 PROJECTZEROSHOWCASE.CPP
//============================================================================================================================================
// 🧩 Project Zero's native Cornell ReSTIR proof — five inspectable CPU executions of the shader estimator plus one GPU feed record.
//
//    WHAT THIS IS: the project's own CelestialSequence (prepare → tick → ApplyTo) driven in GameExecution order,
//    with the exact shipping CornellBox.gltf decoded through ContentCodec. The raster receives the same decoded
//    SceneStructure and the same packed sky state as the production shader. The CPU proof executes the shader's
//    initial RIS reservoir, unbiased W, shadow re-trace and one-bounce GI estimator against those same arrays.
//    The companion frame record also runs the production sky/moon/post packers and ReSTIRIntegrator::BuildDispatch.
//
//    WHAT THIS IS NOT: a GPU render claim. The sandbox has no Vulkan device/display, so RefreshSky/RefreshMoons/
//    RefreshPost and RecordAndPresent are not called here. The PNGs are a CPU execution of the production shader
//    algorithm, not a Vulkan image; the GPU frame-state text remains explicit about that boundary.
//
//    The day frames face the solved sun's azimuth the way a photographer would. The night frames need two dates,
//    and the reason is honest astronomy, verified with the shipping solver: on the gates' date (10 Sep 2026) the
//    real moon is new (illumination 0.00) and below the horizon all night, so the project's linked Luna —
//    Prepare() links roster slot 0 to the solved lunar frame — has nothing to show. The linked-moon frame is
//    therefore dated 26 Sep 2026, when the moon is full (illumination 1.00) and 48 deg up at 22h, and the camera
//    aims at the SOLVED moon direction (a linked slot ignores its Azimuth/Elevation, so aiming at those would
//    frame empty sky — the mistake this showcase made in its first draft). The placed-moon frame stays on
//    10 Sep and drives the roster the way the reference panel does: slot 0 unlinked and put at az 0 / el 25 at
//    2 deg, slot 1 (Ember) at az 14 / el 15 at 3 deg — the MoonRenderProof arrangement, with the stars left on so
//    the frame carries moons and stars together. The fifth frame turns to the parked local volume at 11h, when
//    its patch runs densest (probed 0.76 mean across the day): the enable is flipped — the volume parks off
//    until the scene wants weather somewhere specific — and the camera aims at the box's live centre.

#include "CpuReSTIRReference.h"
#include "GeometricRaster/SceneStructure.h"
#include "ContentInterchange/ContentCodec.h"
#include "DisplayPresentation/CelestialSolver.h"
#include "DisplayPresentation/CelestialTier.h"
#include "DisplayPresentation/FidelityClassifier.h"
#include "DisplayPresentation/MoonConstantRecord.h"
#include "DisplayPresentation/PostConstantRecord.h"
#include "DisplayPresentation/ReSTIRIntegrator.h"
#include "DisplayPresentation/SkyConstantRecord.h"
#include "GeometricRaster/TraversalIndex.h"
#include "Projects/Project-Zero/Source/FlyThroughSolver.h"
#include "Projects/Project-Zero/Source/CelestialSequence.h"
#include "PngWriteShim.h"

#include <cmath>
#include <cstdio>
#include <fstream>
#include <cstring>
#include <cstdint>
#include <string>
#include <vector>

using namespace Frontier;
using namespace Frontier::ProjectZero;
using namespace Frontier::ProjectZeroProof;

namespace {

constexpr uint32_t kWidth  = 960;
constexpr uint32_t kHeight = 540;

// The only scene in this proof is the shipping CornellBox.gltf decoded below. No geometry is constructed here.
// When does the sun stand at the requested elevation inside [FromHour, ToHour]? Solved with the shipping solver,
//    coarse pass plus fine pass — the same approach as the dawn stages in CelestialSkyProof.
float SolveHourForElevation(float Elevation, float FromHour, float ToHour)
{
    CelestialObservation Probe{};
    Probe.Year = 2026; Probe.Month = 9; Probe.Day = 10;
    Probe.UtcOffset = 2.0f; Probe.Latitude = -26.19f; Probe.Longitude = 28.32f;
    float Hour = FromHour, Best = 1e9f;
    for (float H = FromHour; H <= ToHour; H += 0.01f)
    {
        Probe.LocalHours = H;
        const float Residual = std::fabs(CelestialSolver::Solve(Probe).Sun.Elevation - Elevation);
        if (Residual < Best) { Best = Residual; Hour = H; }
    }
    for (float H = Hour - 0.02f; H <= Hour + 0.02f; H += 0.001f)
    {
        Probe.LocalHours = H;
        const float Residual = std::fabs(CelestialSolver::Solve(Probe).Sun.Elevation - Elevation);
        if (Residual < Best) { Best = Residual; Hour = H; }
    }
    return Hour;
}

void WriteFrame(const char* Path, const std::vector<unsigned char>& Rgba)
{
    std::vector<unsigned char> Rgb(static_cast<size_t>(kWidth) * kHeight * 3u);
    for (size_t I = 0; I < static_cast<size_t>(kWidth) * kHeight; ++I)
    {
        Rgb[I * 3u + 0u] = Rgba[I * 4u + 0u];
        Rgb[I * 3u + 1u] = Rgba[I * 4u + 1u];
        Rgb[I * 3u + 2u] = Rgba[I * 4u + 2u];
    }
    PngWriteShim::WritePng(Path, static_cast<int>(kWidth), static_cast<int>(kHeight), 3, Rgb.data(),
                           static_cast<int>(kWidth) * 3);
    double Sum = 0.0;
    for (size_t I = 0; I < static_cast<size_t>(kWidth) * kHeight; ++I)
        Sum += (Rgb[I * 3u + 0u] + Rgb[I * 3u + 1u] + Rgb[I * 3u + 2u]) / 3.0;
    std::printf("  wrote %s (mean lum %.1f)\n", Path, Sum / (static_cast<double>(kWidth) * kHeight));
}

// Aim the camera along a sky direction in full 3D: Right = Forward x world-up (the project's camera convention),
//    Up = Right x Forward. The caller passes a unit direction.
void AimAt(const float* Direction, float Forward[3], float Right[3], float Up[3])
{
    Forward[0] = Direction[0]; Forward[1] = Direction[1]; Forward[2] = Direction[2];
    float Rx = Forward[1], Ry = -Forward[0], Rz = 0.0f;
    const float Rl = std::sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
    Right[0] = Rx / Rl; Right[1] = Ry / Rl; Right[2] = Rz / Rl;
    Up[0] = Right[1] * Forward[2] - Right[2] * Forward[1];
    Up[1] = Right[2] * Forward[0] - Right[0] * Forward[2];
    Up[2] = Right[0] * Forward[1] - Right[1] * Forward[0];
}

uint64_t Fnv1a(const void* Data, size_t Bytes) noexcept
{
    const auto* B = static_cast<const unsigned char*>(Data);
    uint64_t H = 1469598103934665603ull;
    for (size_t I = 0u; I < Bytes; ++I) { H ^= B[I]; H *= 1099511628211ull; }
    return H;
}

// This is the CPU-side proof of the production GPU seam. It intentionally stops before Vulkan: the sandbox has no
// device, so it does not pretend that RefreshSky/RefreshMoons/RefreshPost or the ReSTIR shader executed. The image
// proof below runs CpuReSTIRReference, while this function exercises the same live frame state through the production
// packers and ReSTIRIntegrator::BuildDispatch, then writes the records' hashes and dimensions for inspection. GameExecution.cpp is the device-side continuation of these
// exact values (Surface.Refresh* followed by Surface.RecordAndPresent).
void WriteGpuFrameStateProof(const CelestialSequence& Sky, const SceneStructure& Level,
                             const FidelityCriteria& Criteria, const float Eye[3], const float ViewForward[3])
{
    constexpr uint32_t Width = kWidth, Height = kHeight;
    ProjectZero::FlyThroughSolver Camera;
    Camera.AssignSpatialLocation(Vector3{ Eye[0], Eye[1], Eye[2] });
    const float Pitch = std::asin(std::fmax(-1.0f, std::fmin(1.0f, ViewForward[2])));
    const float Yaw = std::atan2(ViewForward[0], ViewForward[1]);
    Camera.AssignOrientationEuler(Pitch, Yaw, 0.0f);
    Camera.AssignFieldOfView(55.0f);
    Camera.AssignAspectRatio(static_cast<float>(Width) / static_cast<float>(Height));

    ReSTIRIntegratorConfiguration Configuration{};
    Configuration.CandidatesPerPixel = Criteria.ReSTIRCandidateSampleCount;
    Configuration.ExtraCandidateCount = Criteria.ReSTIRExtraCandidateCount;
    Configuration.SpatialTapCount = Criteria.ReSTIRSpatialTapCount;
    Configuration.DenoiseLevelCount = Criteria.DenoiseLevelCount;
    Configuration.Exposure = 1.0f;
    Configuration.AmbientStrength = 0.0f;
    Configuration.GlobalIllumination = true;
    Configuration.AntiAliasing = true;
    ReSTIRIntegrator Integrator(Configuration);
    Integrator.ObserveCamera(Camera, Width, Height);

    TraversalIndex Traversal;
    const bool TraversalReady = Traversal.BuildBottomLevel(Level.QueryFlatTriangles(), false);
    float SunVisibility = 1.0f;
    if (TraversalReady)
    {
        float Distance = 0.0f; uint32_t Primitive = 0u;
        if (Traversal.TraceClosest(Eye, Sky.Frame().Sun.Direction, Distance, Primitive)) SunVisibility = 0.0f;
    }
    const float Forward[3] = { Camera.QueryForwardVector().x, Camera.QueryForwardVector().y, Camera.QueryForwardVector().z };
    const float Right[3]   = { Camera.QueryRightVector().x, Camera.QueryRightVector().y, Camera.QueryRightVector().z };
    const float Up[3]      = { Camera.QueryUpwardVector().x, Camera.QueryUpwardVector().y, Camera.QueryUpwardVector().z };
    const float TanHalf = std::tan(Camera.QueryFieldOfViewRadians() * 0.5f);
    const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
    const MoonConstantRecord MoonRecord = Sky.PackMoonRecord();
    const PostConstantRecord PostRecord = Sky.PackPostRecord(Forward, Right, Up, TanHalf,
                                                              Camera.QueryAspectRatio(), Height, SunVisibility);
    const DispatchConfiguration Dispatch = Integrator.BuildDispatch(
        Camera, Width, Height, 0u, static_cast<uint32_t>(Level.QueryLuminaires().size()));

    std::ofstream Out("Diagnostics/ProjectZero_Cornell_ReSTIR_FrameState.txt", std::ios::trunc);
    Out << "Project Zero native frame-state proof\n"
        << "scene=Projects/Project-Zero/Content/Scenes/CornellBox.gltf\n"
        << "scene_decode=ContentCodec::Decode\n"
        << "celestial=CelestialSequence::Prepare -> Tick -> ApplyTo\n"
        << "gpu_execution=NOT CLAIMED (this environment has no Vulkan device/display)\n"
        << "cpu_estimator=CpuReSTIRReference (initial RIS + unbiased W + shadow re-trace + one-bounce GI)\n"
        << "device_continuation=GameExecution.cpp: RefreshSky -> RefreshMoons -> RefreshPost -> RecordAndPresent\n"
        << "reSTIR_dispatch=ReSTIRIntegrator::BuildDispatch\n"
        << "triangles=" << Level.QueryTriangleCount() << "\n"
        << "luminaires=" << Level.QueryLuminaires().size() << "\n"
        << "sun_visibility=" << SunVisibility << "\n"
        << "sky_bytes=" << sizeof(SkyRecord) << " sky_fnv1a=0x" << std::hex << Fnv1a(&SkyRecord, sizeof(SkyRecord)) << std::dec << "\n"
        << "moon_bytes=" << sizeof(MoonRecord) << " moon_fnv1a=0x" << std::hex << Fnv1a(&MoonRecord, sizeof(MoonRecord)) << std::dec << "\n"
        << "post_bytes=" << sizeof(PostRecord) << " post_fnv1a=0x" << std::hex << Fnv1a(&PostRecord, sizeof(PostRecord)) << std::dec << "\n"
        << "dispatch_bytes=" << sizeof(Dispatch) << " dispatch_fnv1a=0x" << std::hex << Fnv1a(&Dispatch, sizeof(Dispatch)) << std::dec << "\n";
    if (!Out) std::fprintf(stderr, "  could not write GPU frame-state proof\n");
    std::printf("  CPU ReSTIR estimator + packed GPU frame state: sky %zu B, moons %zu B, post %zu B, dispatch %zu B (GPU execution not claimed)\n",
                sizeof(SkyRecord), sizeof(MoonRecord), sizeof(PostRecord), sizeof(Dispatch));
}

} // namespace

int main()
{
    std::printf("\nProject Zero ReSTIR reference: the shader estimator on the shipping Cornell scene, five aimed frames\n");
    for (int I = 0; I < 70; ++I) std::putchar('='); std::printf("\n\n");

    // Load the exact shipping CornellBox.gltf used by GameExecution. There is deliberately no hand-built proof
    // geometry here: this is the same ContentCodec -> SceneStructure path as Project Zero itself.
    SceneStructure Level;
    TextureIndex Textures;
    SceneDecodeConfiguration Decode{};
    Decode.UniformScale = 1.0f;
    Decode.SlabLimit = 1u;
    std::string DecodeError;
    if (!ContentCodec::Decode("Projects/Project-Zero/Content/Scenes/CornellBox.gltf", Level,
                              &Textures, Decode, &DecodeError))
    {
        std::fprintf(stderr, "  CornellBox.gltf decode failed: %s\n", DecodeError.c_str());
        return 2;
    }
    Level.AssignName("CornellBox");
    std::printf("  loaded shipping CornellBox.gltf: %u triangles, %zu instances, %zu placements\n",
                Level.QueryTriangleCount(), Level.QueryInstances().size(), Level.QueryPlacements().size());

    FidelityClassifier Classifier;
    const FidelityCriteria Criteria = Classifier.ConstructCriteria(FidelityCategory::StandardFidelity);
    const CelestialBudget Budget = CelestialTier::BudgetFor(Criteria);

    CelestialSequence Sky;
    Sky.Prepare();
    std::printf("  %u stars catalogued\n", Sky.Stars().QuerySourceCount());
    uint32_t AtlasSlots[kMoonAtlasCount];
    for (uint32_t M = 0u; M < kMoonAtlasCount; ++M)
    {
        char Path[128];
        std::snprintf(Path, sizeof(Path), "%s%s", kMoonTextureDirectory, kMoonAtlas[M].File);
        AtlasSlots[M] = Textures.RegisterPath(Path, /*Linear=*/false);
    }
    std::vector<std::string> AtlasReport;
    if (Textures.Decode(0u, &AtlasReport) != 0u) { std::printf("  moon atlas failed to decode\n"); return 2; }
    Sky.AssignMoonAtlas(AtlasSlots, Textures);
    for (uint32_t E = 0u; E < kCelestialEntityCount; ++E) Sky.Shown[E] = true;

    const float TickOrigin[3] = { 0.0f, 0.0f, 2.0f };
    const float Eye[3]        = { 0.0f, -3.30f, 1.55f };
    constexpr float kHalfFov  = 55.0f * 3.14159265f / 180.0f;
    constexpr float kDeg      = 3.14159265f / 180.0f;

    auto TickTo = [&](float Hour, int Day = 10)
    {
        Sky.Observation.Year = 2026; Sky.Observation.Month = 9; Sky.Observation.Day = Day;
        Sky.Observation.LocalHours = Hour; Sky.Observation.UtcOffset = 2.0f;
        Sky.Observation.Latitude = -26.19f; Sky.Observation.Longitude = 28.32f;
        Sky.Tick(0.0f, TickOrigin, 0.0f);
    };

    // ── 1. Morning: the sun at +10 deg, faced ────────────────────────────────────────────────────
    {
        TickTo(SolveHourForElevation(10.0f, 6.0f, 10.0f));
        float F[3] = { 0.0f, 1.0f, 0.0f };
        {
            const float Hx = Sky.Frame().Sun.Direction[0], Hy = Sky.Frame().Sun.Direction[1];
            const float Hl = std::sqrt(Hx * Hx + Hy * Hy);
            if (Hl > 1e-6f) { F[0] = Hx / Hl; F[1] = Hy / Hl; F[2] = 0.0f; }
        }
        float R[3], U[3];
        AimAt(F, F, R, U);
        // This is the same celestial tick/camera as the morning raster below. The helper proves the native GPU
        // pack/integrator seam and writes no GPU image because this environment has no Vulkan device.
        WriteGpuFrameStateProof(Sky, Level, Criteria, Eye, F);
        const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
        CpuReSTIRReference Restir(Level, SkyRecord, Criteria);
        std::vector<unsigned char> Frame;
        double MeanLuminance = 0.0;
        if (!Restir.Render(Eye, F, R, U, kHalfFov, kWidth, kHeight, Frame, MeanLuminance)) return 2;
        std::printf("  morning: sun el %+.2f az %.1f at %.2fh\n",
                    static_cast<double>(Sky.Frame().Sun.Elevation), static_cast<double>(Sky.Frame().Sun.Azimuth),
                    static_cast<double>(Sky.Observation.LocalHours));
        WriteFrame("Diagnostics/ProjectZero_Cornell_ReSTIR_Cpu_Morning.png", Frame);
    }

    // ── 2. Sunset: the sun at +1.5 deg, faced ────────────────────────────────────────────────────
    {
        TickTo(SolveHourForElevation(1.5f, 15.0f, 19.0f));
        float F[3] = { 0.0f, 1.0f, 0.0f };
        {
            const float Hx = Sky.Frame().Sun.Direction[0], Hy = Sky.Frame().Sun.Direction[1];
            const float Hl = std::sqrt(Hx * Hx + Hy * Hy);
            if (Hl > 1e-6f) { F[0] = Hx / Hl; F[1] = Hy / Hl; F[2] = 0.0f; }
        }
        float R[3], U[3];
        AimAt(F, F, R, U);
        const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
        CpuReSTIRReference Restir(Level, SkyRecord, Criteria);
        std::vector<unsigned char> Frame;
        double MeanLuminance = 0.0;
        if (!Restir.Render(Eye, F, R, U, kHalfFov, kWidth, kHeight, Frame, MeanLuminance)) return 2;
        std::printf("  sunset: sun el %+.2f az %.1f at %.2fh\n",
                    static_cast<double>(Sky.Frame().Sun.Elevation), static_cast<double>(Sky.Frame().Sun.Azimuth),
                    static_cast<double>(Sky.Observation.LocalHours));
        WriteFrame("Diagnostics/ProjectZero_Cornell_ReSTIR_Cpu_Sunset.png", Frame);
    }

    // ── 3. Night, linked: slot 0 as Prepare() leaves it — Luna following the solved lunar frame ──
    {
        // 26 Sep, full moon. The aim reads the SOLVED direction: a linked slot ignores Azimuth/Elevation.
        TickTo(22.0f, 26);
        float F[3], R[3], U[3];
        AimAt(Sky.Frame().Moon.Direction, F, R, U);
        const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
        CpuReSTIRReference Restir(Level, SkyRecord, Criteria);
        std::vector<unsigned char> Frame;
        double MeanLuminance = 0.0;
        if (!Restir.Render(Eye, F, R, U, kHalfFov, kWidth, kHeight, Frame, MeanLuminance)) return 2;
        std::printf("  linked: moon el %+.2f az %.1f illum %.2f at 22h on Sep 26 (slot 0 as Prepare leaves it)\n",
                    static_cast<double>(Sky.Frame().Moon.Elevation),
                    static_cast<double>(Sky.Frame().Moon.Azimuth),
                    static_cast<double>(Sky.Frame().MoonIllumination));
        WriteFrame("Diagnostics/ProjectZero_Cornell_ReSTIR_Cpu_NightLinked.png", Frame);
    }

    // ── 4. Night, placed: the roster driven the way the reference panel drives it ────────────────
    {
        // The MoonRenderProof arrangement, stated plainly: slot 0 unlinked and put at az 0 / el 25 at 2 deg,
        //    slot 1 (Ember) at az 14 / el 15 at 3 deg, slots 2-3 as Prepare parks them (hidden). The stars stay
        //    on — the moon proof hides them to keep its counts honest, but this frame wants moons and stars
        //    together, and the two coexist (verified: the moon draws identically with stars on or off).
        TickTo(22.0f, 10);
        Sky.MoonSlots[0].FollowSky = false;
        Sky.MoonSlots[0].Azimuth = 0.0f; Sky.MoonSlots[0].Elevation = 25.0f;
        Sky.MoonSlots[0].Size = 2.0f; Sky.MoonSlots[0].Phase = 0.5f;
        Sky.MoonSlots[1].Preset = 1u; Sky.MoonSlots[1].Visible = true;
        Sky.MoonSlots[1].FollowSky = false;
        Sky.MoonSlots[1].Azimuth = 14.0f; Sky.MoonSlots[1].Elevation = 15.0f;
        Sky.MoonSlots[1].Size = 3.0f; Sky.MoonSlots[1].Phase = 0.62f;
        const float Az = Sky.MoonSlots[0].Azimuth * kDeg, El = Sky.MoonSlots[0].Elevation * kDeg;
        const float Aim[3] = { std::sin(Az) * std::cos(El), std::cos(Az) * std::cos(El), std::sin(El) };
        float F[3], R[3], U[3];
        AimAt(Aim, F, R, U);
        const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
        CpuReSTIRReference Restir(Level, SkyRecord, Criteria);
        std::vector<unsigned char> Frame;
        double MeanLuminance = 0.0;
        if (!Restir.Render(Eye, F, R, U, kHalfFov, kWidth, kHeight, Frame, MeanLuminance)) return 2;
        std::printf("  placed: Luna 2 deg full + Ember 3 deg gibbous at 22h on Sep 10 (stars on)\n");
        WriteFrame("Diagnostics/ProjectZero_Cornell_ReSTIR_Cpu_NightPlaced.png", Frame);
    }

    // ── 5. Morning, local: the parked volume with its enable flipped ────────────────────────────
    {
        TickTo(11.0f, 10);
        Sky.LocalCloud.Enabled = true;
        float Aim[3] = { Sky.LocalCloud.Centre[0] - Eye[0],
                         Sky.LocalCloud.Centre[1] - Eye[1],
                         Sky.LocalCloud.Centre[2] - Eye[2] };
        {
            const float Al = std::sqrt(Aim[0] * Aim[0] + Aim[1] * Aim[1] + Aim[2] * Aim[2]);
            Aim[0] /= Al; Aim[1] /= Al; Aim[2] /= Al;
        }
        float F[3], R[3], U[3];
        AimAt(Aim, F, R, U);
        const SkyConstantRecord SkyRecord = Sky.PackSkyRecord();
        CpuReSTIRReference Restir(Level, SkyRecord, Criteria);
        std::vector<unsigned char> Frame;
        double MeanLuminance = 0.0;
        if (!Restir.Render(Eye, F, R, U, kHalfFov, kWidth, kHeight, Frame, MeanLuminance)) return 2;
        std::printf("  local: parked volume enabled at 11h on Sep 10 (box centre %.0f %.0f %.0f)\n",
                    (double)Sky.LocalCloud.Centre[0], (double)Sky.LocalCloud.Centre[1],
                    (double)Sky.LocalCloud.Centre[2]);
        WriteFrame("Diagnostics/ProjectZero_Cornell_ReSTIR_Cpu_LocalCloud.png", Frame);
    }

    std::printf("\n  showcase rendered\n");
    return 0;
}
