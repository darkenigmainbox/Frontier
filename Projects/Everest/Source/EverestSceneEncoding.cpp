/*==========================================================================================================================================
                                                     EVEREST SCENE ENCODING
==========================================================================================================================================*/

#include "EverestSceneEncoding.h"
#include "Engine/PlanetaryAtmosphere/FogSpace.h"
#include "Engine/PlanetaryAtmosphere/OpticalLensFlare.h"
#include "Engine/PlanetaryAtmosphere/VolumetricClouds.h"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace Everest
{

using namespace Frontier;

namespace
{

constexpr float Degrees = std::numbers::pi_v<float> / 180.0f;

[[nodiscard]] float Dot3(const std::array<float, 3>& A, const std::array<float, 3>& B) noexcept
{
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

[[nodiscard]] std::array<float, 3> Cross3(const std::array<float, 3>& A, const std::array<float, 3>& B) noexcept
{
    return {
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    };
}

[[nodiscard]] std::array<float, 3> Normalize3(const std::array<float, 3>& V) noexcept
{
    const float L = std::sqrt(Dot3(V, V));
    if (L > 1.0e-7f)
    {
        return {V[0] / L, V[1] / L, V[2] / L};
    }
    return {0.0f, 0.0f, 1.0f};
}

[[nodiscard]] std::array<float, 3> ApplyAcesFilmicLocal(const std::array<float, 3>& X) noexcept
{
    std::array<float, 3> Out{};
    for (size_t C = 0u; C < 3u; ++C)
    {
        const float V = std::max(0.0f, X[C]);
        const float Num = V * (2.51f * V + 0.03f);
        const float Den = V * (2.43f * V + 0.59f) + 0.14f;
        Out[C] = std::clamp(Num / std::max(Den, 1.0e-6f), 0.0f, 1.0f);
    }
    return Out;
}

[[nodiscard]] uint32_t HashDirectionCell(int32_t X, int32_t Y, int32_t Z) noexcept
{
    uint32_t H = static_cast<uint32_t>(X * 73856093) ^ static_cast<uint32_t>(Y * 19349663) ^ static_cast<uint32_t>(Z * 83492791);
    H ^= H >> 16u;
    H *= 0x7feb352du;
    H ^= H >> 15u;
    H *= 0x846ca68bu;
    H ^= H >> 16u;
    return H;
}

[[nodiscard]] std::array<float, 3> EvaluateStarAndPlanetField(const std::array<float, 3>& RayDir,
                                                              const StarConfiguration&    StarCfg,
                                                              float                       DaylightSuppression) noexcept
{
    if (!StarCfg.Enabled || RayDir[2] <= 0.01f || DaylightSuppression >= 0.99f)
    {
        return {0.0f, 0.0f, 0.0f};
    }

    const float Visibility = (1.0f - DaylightSuppression) * std::clamp(RayDir[2] * 3.5f, 0.0f, 1.0f);
    const int32_t CellX    = static_cast<int32_t>(std::floor(RayDir[0] * 140.0f));
    const int32_t CellY    = static_cast<int32_t>(std::floor(RayDir[1] * 140.0f));
    const int32_t CellZ    = static_cast<int32_t>(std::floor(RayDir[2] * 140.0f));
    const uint32_t H       = HashDirectionCell(CellX, CellY, CellZ);

    std::array<float, 3> Out = {0.0f, 0.0f, 0.0f};
    if ((H & 0xFFu) < 4u)
    {
        const float Temp  = static_cast<float>((H >> 8u) & 0xFFu) / 255.0f;
        const float Scint = 1.0f - 0.35f * StarCfg.AtmosphericScintillate * static_cast<float>((H >> 16u) & 0xFFu) / 255.0f;
        const float Lum   = StarCfg.MagnitudeGain * Scint * Visibility * (0.25f + 0.75f * Temp);
        Out[0] += Lum * (0.80f + 0.40f * (1.0f - Temp));
        Out[1] += Lum * 0.92f;
        Out[2] += Lum * (0.75f + 0.45f * Temp);
    }

    if (StarCfg.MilkyWayLuminance > 0.0f)
    {
        const float GalacticPlane = RayDir[0] * 0.45f - RayDir[1] * 0.55f + RayDir[2] * 0.70f;
        const float Band          = std::exp(-GalacticPlane * GalacticPlane * 14.0f) * StarCfg.MilkyWayLuminance * 0.06f * Visibility;
        Out[0] += Band * 0.78f;
        Out[1] += Band * 0.86f;
        Out[2] += Band * 1.12f;
    }

    static constexpr std::array<std::array<float, 3>, 2> PlanetDirs = {{
        {-0.42f,  0.68f, 0.60f},
        { 0.58f, -0.52f, 0.62f}
    }};
    for (size_t P = 0u; P < PlanetDirs.size(); ++P)
    {
        const auto  PDir = Normalize3(PlanetDirs[P]);
        const float CosA = Dot3(RayDir, PDir);
        if (CosA > 0.99975f)
        {
            const float Glow = StarCfg.MagnitudeGain * 1.8f * Visibility;
            Out[0] += Glow * (P == 0u ? 1.10f : 0.95f);
            Out[1] += Glow * (P == 0u ? 0.95f : 0.88f);
            Out[2] += Glow * (P == 0u ? 0.78f : 0.72f);
        }
    }

    return Out;
}

[[nodiscard]] std::array<float, 3> EvaluateMoonDiscs(const std::array<float, 3>& RayDir,
                                                     const std::array<float, 3>& SunDir,
                                                     const MoonConfiguration&    MoonCfg) noexcept
{
    if (!MoonCfg.Enabled || RayDir[2] <= 0.0f)
    {
        return {0.0f, 0.0f, 0.0f};
    }

    std::array<float, 3> Result = {0.0f, 0.0f, 0.0f};

    const float OrbitRad = MoonCfg.PrimaryOrbitDegrees * Degrees;
    const std::array<float, 3> PrimaryDir = Normalize3({
        std::cos(OrbitRad) * 0.78f,
        std::sin(OrbitRad) * 0.78f,
        0.62f
    });
    const float PrimRad      = 0.014f;
    const float CosPrimary   = Dot3(RayDir, PrimaryDir);
    const float AnglePrimary = std::acos(std::clamp(CosPrimary, -1.0f, 1.0f));
    if (AnglePrimary < PrimRad)
    {
        const float Radial  = AnglePrimary / PrimRad;
        const float SphereZ = std::sqrt(std::max(0.0f, 1.0f - Radial * Radial));
        const std::array<float, 3> Normal = Normalize3({
            RayDir[0] - PrimaryDir[0] * (1.0f - SphereZ),
            RayDir[1] - PrimaryDir[1] * (1.0f - SphereZ),
            RayDir[2] - PrimaryDir[2] * (1.0f - SphereZ)
        });
        const float LitDot     = std::max(0.0f, Dot3(Normal, SunDir));
        const float Lommel     = (LitDot > 0.0f) ? (2.0f * LitDot / (LitDot + SphereZ + 0.05f)) : 0.0f;
        const float PhaseLit   = Lommel * MoonCfg.PrimaryPhase * MoonCfg.PrimaryAlbedo * 8.5f;
        const float Earthshine = MoonCfg.EarthshineLuminance * 0.08f * SphereZ;
        const float Total      = PhaseLit + Earthshine;
        Result[0] += Total * 0.96f;
        Result[1] += Total * 0.98f;
        Result[2] += Total * 1.04f;
    }

    if (MoonCfg.SecondaryMoonEnabled)
    {
        const float SecRad = MoonCfg.SecondaryOrbitDegrees * Degrees;
        const std::array<float, 3> SecDir = Normalize3({
            std::cos(SecRad) * 0.84f,
            std::sin(SecRad) * 0.84f,
            0.54f
        });
        const float AngleSec = std::acos(std::clamp(Dot3(RayDir, SecDir), -1.0f, 1.0f));
        if (AngleSec < 0.0085f)
        {
            const float SphereZ = std::sqrt(std::max(0.0f, 1.0f - (AngleSec / 0.0085f) * (AngleSec / 0.0085f)));
            const float Glow    = (0.35f + 0.65f * SphereZ) * MoonCfg.PrimaryAlbedo * 4.5f;
            Result[0] += Glow * 0.88f;
            Result[1] += Glow * 0.92f;
            Result[2] += Glow * 1.06f;
        }
    }

    return Result;
}

} // namespace

EverestSceneEncoding::EverestSceneEncoding()
{
    Course_ = ConstructEverestCourseScene();
    RaySpace_.ConstructResources(Course_.Scene);
    OccupantSdf_.ConstructResources(Course_.Scene);
    WorldSdf_.UpdateCascades(Course_.Scene, {0.8f, 0.0f, 0.8f}, true);
    CardDepot_.ConstructResources(Course_.Scene);
    ClusteredLights_.HeadlightMode = AutomotiveBeamMode::LowBeam;
    ClusteredLights_.Update(
        Course_.Scene.Occupants[Course_.ShowcaseVehicles[0].BodyOccupant].Transform,
        Course_.StreetPoles,
        Course_.PointLamps,
        nullptr);
    AtmosphereParams_ = MakeEarthAtmosphere();
}

void EverestSceneEncoding::ResetAccumulation() noexcept
{
    AccumulatedFrames_ = 0u;
    if (InternalWidth_ > 0u && InternalHeight_ > 0u)
    {
        Illumination_.ConfigureDimensions(InternalWidth_, InternalHeight_, 1u);
    }
}

void EverestSceneEncoding::EnsureAtmosphereBaked(const std::array<float, 3>& SunDirection,
                                                 const std::array<float, 3>& SunRadiance,
                                                 float                       RayleighScale,
                                                 float                       MieTurbidity,
                                                 float                       MieAnisotropyG,
                                                 float                       OzoneScale)
{
    const float DirDelta = std::abs(SunDirection[0] - LastBakedSunDir_[0])
                         + std::abs(SunDirection[1] - LastBakedSunDir_[1])
                         + std::abs(SunDirection[2] - LastBakedSunDir_[2]);
    const bool ParamsChanged = std::abs(MieTurbidity - LastBakedTurbidity_) > 1.0e-3f
                            || std::abs(RayleighScale - LastBakedRayleigh_) > 1.0e-3f;

    if (ParamsChanged || !TransmittanceLut_.Baked())
    {
        AtmosphereParams_ = MakeEarthAtmosphere();
        AtmosphereParams_.RayleighScattering.R *= RayleighScale;
        AtmosphereParams_.RayleighScattering.G *= RayleighScale;
        AtmosphereParams_.RayleighScattering.B *= RayleighScale;
        AtmosphereParams_.MieScattering        *= (MieTurbidity / 2.4);
        AtmosphereParams_.MieAbsorption        *= (MieTurbidity / 2.4);
        AtmosphereParams_.MiePhaseG             = std::clamp(static_cast<double>(MieAnisotropyG), 0.0, 0.95);
        AtmosphereParams_.OzoneAbsorption.R    *= OzoneScale;
        AtmosphereParams_.OzoneAbsorption.G    *= OzoneScale;
        AtmosphereParams_.OzoneAbsorption.B    *= OzoneScale;

        TransmittanceLut_.Bake(AtmosphereParams_, 64u, 16u, 24u);
        MultiScatteringLut_.Bake(AtmosphereParams_, TransmittanceLut_, 16u, 16u, 8u);
        LastBakedTurbidity_ = MieTurbidity;
        LastBakedRayleigh_  = RayleighScale;
    }

    if (ParamsChanged || DirDelta > 1.0e-3f || !SkyViewLut_.Baked())
    {
        AtmosphereSolarSource Solar{};
        Solar.Direction  = {SunDirection[0], SunDirection[1], SunDirection[2]};
        Solar.Irradiance = {
            std::max(0.5, static_cast<double>(SunRadiance[0]) * 4.8),
            std::max(0.5, static_cast<double>(SunRadiance[1]) * 4.8),
            std::max(0.5, static_cast<double>(SunRadiance[2]) * 4.8)
        };
        Solar.TwilightStrength = 1.0;
        const std::array<AtmosphereSolarSource, 1> Suns = {Solar};
        SkyViewLut_.Bake(AtmosphereParams_, TransmittanceLut_, MultiScatteringLut_, 0.05, Suns, 96u, 54u, 16u);
        LastBakedSunDir_ = SunDirection;
    }
}

void EverestSceneEncoding::EncodeFrame(uint32_t                          OutputWidth,
                                       uint32_t                          OutputHeight,
                                       const EverestCameraSpecification& Camera,
                                       const EverestEnvironmentSettings& Environment,
                                       std::vector<uint8_t>&             OutRgba8Pixels)
{
    if (OutputWidth == 0u || OutputHeight == 0u)
    {
        OutRgba8Pixels.clear();
        return;
    }

    const SolarConfiguration&          SolarCfg    = Environment.Solar;
    const AtmosphereConfiguration&     AtmosCfg    = Environment.Atmosphere;
    const CloudConfiguration&          CloudCfg    = Environment.Cloud;
    const FogConfiguration&            FogCfg      = Environment.Fog;
    const OpticalFlareConfiguration&   FlareCfg    = Environment.OpticalFlare;
    const MoonConfiguration&           MoonCfg     = Environment.Moon;
    const StarConfiguration&           StarCfg     = Environment.Star;
    const RenderPipelineConfiguration& PipelineCfg = Environment.Pipeline;

    const float ElevRad = SolarCfg.ElevationDegrees * Degrees;
    const float AzimRad = SolarCfg.AzimuthDegrees * Degrees;
    const std::array<float, 3> SunDirection = Normalize3({
        std::cos(ElevRad) * std::cos(AzimRad),
        std::cos(ElevRad) * std::sin(AzimRad),
        std::sin(ElevRad)
    });

    const float SunFluxScale   = SolarCfg.Enabled ? std::max(0.0f, SolarCfg.IlluminanceKilolux / 42.0f) : 0.0f;
    const float DaylightFactor = std::clamp((SunDirection[2] + 0.08f) / 0.35f, 0.0f, 1.0f);
    std::array<float, 3> SunRadiance = {
        SunFluxScale * (0.85f + 0.25f * DaylightFactor),
        SunFluxScale * (0.62f + 0.36f * DaylightFactor),
        SunFluxScale * (0.38f + 0.56f * DaylightFactor)
    };

    CloudParameters CloudParams{};
    CloudParams.LowerHeightM   = std::max(200.0, static_cast<double>(CloudCfg.BaseAltitudeMetres));
    CloudParams.TopHeightM     = CloudParams.LowerHeightM + std::max(200.0, static_cast<double>(CloudCfg.LayerThicknessMetres));
    CloudParams.Coverage       = std::clamp(static_cast<double>(CloudCfg.Coverage), 0.0, 1.0);
    CloudParams.ExtinctionPerM = 0.025 * std::max(0.1, static_cast<double>(CloudCfg.ExtinctionDensity));
    if (CloudCfg.Enabled && CloudCfg.CastGroundShadows && SunDirection[2] > 0.05f)
    {
        const double ShadowAltitude = 0.5 * (CloudParams.LowerHeightM + CloudParams.TopHeightM);
        const double TCloud         = ShadowAltitude / std::max(0.05, static_cast<double>(SunDirection[2]));
        const SpatialVector SampleP = {
            SunDirection[0] * TCloud,
            SunDirection[1] * TCloud,
            ShadowAltitude
        };
        const double LocalCloudD = CloudDensity(CloudParams, SampleP);
        const float  ShadowTrans = static_cast<float>(std::exp(-LocalCloudD * 1.4));
        for (float& C : SunRadiance)
        {
            C *= (0.35f + 0.65f * ShadowTrans);
        }
    }

    if (AtmosCfg.Enabled)
    {
        EnsureAtmosphereBaked(
            SunDirection,
            SunRadiance,
            AtmosCfg.RayleighScattering,
            AtmosCfg.MieTurbidity,
            AtmosCfg.MieAnisotropyG,
            AtmosCfg.OzoneAbsorptionScale);
    }

    const uint32_t MaxInternalWidth  = (PipelineCfg.QualityTier == 0) ? 256u : ((PipelineCfg.QualityTier == 1) ? 384u : 640u);
    const uint32_t MaxInternalHeight = (PipelineCfg.QualityTier == 0) ? 144u : ((PipelineCfg.QualityTier == 1) ? 216u : 360u);
    const uint32_t TraceWidth        = std::min(OutputWidth, MaxInternalWidth);
    const uint32_t TraceHeight       = std::min(OutputHeight, MaxInternalHeight);

    const uint64_t WorldSig = SolarCfg.Revision
                            ^ (AtmosCfg.Revision << 1)
                            ^ (CloudCfg.Revision << 2)
                            ^ (FogCfg.Revision << 3)
                            ^ (FlareCfg.Revision << 4)
                            ^ (MoonCfg.Revision << 5)
                            ^ (StarCfg.Revision << 6)
                            ^ (PipelineCfg.Revision << 7)
                            ^ static_cast<uint64_t>(PipelineCfg.InspectionModeIndex * 2654435761u);

    const float CamDelta = std::abs(Camera.EyePosition[0] - LastCamera_.EyePosition[0])
                         + std::abs(Camera.EyePosition[1] - LastCamera_.EyePosition[1])
                         + std::abs(Camera.EyePosition[2] - LastCamera_.EyePosition[2])
                         + std::abs(Camera.LookAtTarget[0] - LastCamera_.LookAtTarget[0])
                         + std::abs(Camera.LookAtTarget[1] - LastCamera_.LookAtTarget[1])
                         + std::abs(Camera.LookAtTarget[2] - LastCamera_.LookAtTarget[2])
                         + std::abs(Camera.VerticalFovDegrees - LastCamera_.VerticalFovDegrees);

    if (TraceWidth != InternalWidth_ || TraceHeight != InternalHeight_)
    {
        InternalWidth_     = TraceWidth;
        InternalHeight_    = TraceHeight;
        AccumulatedFrames_ = 0u;
        Illumination_.ConfigureDimensions(InternalWidth_, InternalHeight_, 1u);
        PrimaryGuides_.resize(static_cast<size_t>(InternalWidth_) * InternalHeight_);
        AccumulatedHdr_.assign(static_cast<size_t>(InternalWidth_) * InternalHeight_, {0.0f, 0.0f, 0.0f});
    }
    else if (CamDelta > 1.0e-3f || WorldSig != LastWorldSignature_)
    {
        ResetAccumulation();
    }

    LastCamera_         = Camera;
    LastWorldSignature_ = WorldSig;

    const std::array<float, 3> Forward = Normalize3({
        Camera.LookAtTarget[0] - Camera.EyePosition[0],
        Camera.LookAtTarget[1] - Camera.EyePosition[1],
        Camera.LookAtTarget[2] - Camera.EyePosition[2]
    });
    const std::array<float, 3> WorldUp = {0.0f, 0.0f, 1.0f};
    const std::array<float, 3> Right   = Normalize3(Cross3(Forward, WorldUp));
    const std::array<float, 3> Up      = Normalize3(Cross3(Right, Forward));

    const float Aspect  = static_cast<float>(TraceWidth) / std::max(1.0f, static_cast<float>(TraceHeight));
    const float TanHalf = std::tan(0.5f * Camera.VerticalFovDegrees * Degrees);

    for (uint32_t Y = 0u; Y < TraceHeight; ++Y)
    {
        const float NdcY = 1.0f - 2.0f * (static_cast<float>(Y) + 0.5f) / static_cast<float>(TraceHeight);
        for (uint32_t X = 0u; X < TraceWidth; ++X)
        {
            const float NdcX = 2.0f * (static_cast<float>(X) + 0.5f) / static_cast<float>(TraceWidth) - 1.0f;
            const std::array<float, 3> RayDir = Normalize3({
                Forward[0] + Right[0] * (NdcX * Aspect * TanHalf) + Up[0] * (NdcY * TanHalf),
                Forward[1] + Right[1] * (NdcX * Aspect * TanHalf) + Up[1] * (NdcY * TanHalf),
                Forward[2] + Right[2] * (NdcX * Aspect * TanHalf) + Up[2] * (NdcY * TanHalf)
            });

            TracePixelGuide& Guide = PrimaryGuides_[static_cast<size_t>(Y) * TraceWidth + X];
            const CpuRayIntersection Hit = RaySpace_.TraceRayCpu(Course_.Scene, Camera.EyePosition, RayDir, 0.01f, 320.0f);
            if (!Hit.Hit)
            {
                Guide.ViewDepth     = 0.0f;
                Guide.ExpectedDepth = 0.0f;
                Guide.WorldNormal   = {0.0f, 0.0f, 1.0f};
            }
            else
            {
                Guide.ViewDepth     = Hit.Travel;
                Guide.ExpectedDepth = Hit.Travel;
                Guide.WorldPosition = Hit.Position;
                Guide.WorldNormal   = Hit.Normal;
                Guide.Family        = Hit.Family;
            }
        }
    }

    PathTraceEnvironmentParameters PtEnv{};
    PtEnv.Features = FeatureRayTracing
                   | (PipelineCfg.ScreenSpaceReflections ? FeatureRayTracedReflections : 0u)
                   | (PipelineCfg.TemporalAntiAliasing ? FeatureTemporalAccumulation : 0u)
                   | FeatureSpatialResampling
                   | FeatureVarianceKernel
                   | FeatureSunShadows
                   | FeatureClusteredLights;
    PtEnv.BounceCount        = PipelineCfg.GlobalIllumination ? 2u : 1u;
    PtEnv.SolarDirection     = SunDirection;
    PtEnv.SolarAngularRadius = std::max(0.002f, SolarCfg.AngularDiameterDeg * 0.5f * Degrees);
    PtEnv.SunIlluminance     = {SunRadiance[0] * 1.15f, SunRadiance[1] * 1.15f, SunRadiance[2] * 1.15f};
    PtEnv.SkyZenithRadiance  = AtmosCfg.Enabled
                             ? std::array<float, 3>{0.18f * DaylightFactor + 0.015f, 0.36f * DaylightFactor + 0.025f, 0.72f * DaylightFactor + 0.055f}
                             : std::array<float, 3>{0.16f, 0.24f, 0.42f};
    PtEnv.SkyHorizonRadiance = AtmosCfg.Enabled
                             ? std::array<float, 3>{0.58f * DaylightFactor + 0.04f, 0.52f * DaylightFactor + 0.04f, 0.48f * DaylightFactor + 0.06f}
                             : std::array<float, 3>{0.36f, 0.42f, 0.50f};

    if (AccumulatedFrames_ < 6u)
    {
        Illumination_.StepTemporalAndSpatialReuseCpu(
            Course_.Scene,
            RaySpace_,
            Course_.Materials,
            &ClusteredLights_,
            PtEnv,
            PrimaryGuides_,
            AccumulatedFrames_);
        Illumination_.StepVarianceFilterCpu(PrimaryGuides_, AccumulatedFrames_, true);
        ++AccumulatedFrames_;
    }

    const auto& FilteredIrradiance = Illumination_.FilteredIrradiance();

    FogParameters FogMedium{};
    FogMedium.ReferenceDensity = 0.0025 * std::max(0.0, static_cast<double>(FogCfg.BaseDensity));
    FogMedium.ReferenceHeightM = static_cast<double>(FogCfg.BaseAltitudeMetres);
    FogMedium.FalloffHeightM   = std::max(1.0, 1.0 / std::max(0.001, static_cast<double>(FogCfg.HeightFalloff)));
    FogMedium.Colour           = {
        0.58 * DaylightFactor + 0.05,
        0.66 * DaylightFactor + 0.06,
        0.78 * DaylightFactor + 0.09
    };

    SunDiscProfile SunDisc{};
    SunDisc.AngularRadiusRad = std::max(0.002, static_cast<double>(SolarCfg.AngularDiameterDeg * 0.5f * Degrees));

    const float SunViewDot   = Dot3(Forward, SunDirection);
    const bool  FlareVisible = FlareCfg.Enabled && SolarCfg.Enabled && SunDirection[2] > 0.0f && SunViewDot > 0.25f;
    float       SunNdcX      = 0.0f;
    float       SunNdcY      = 0.0f;
    if (FlareVisible)
    {
        SunNdcX = Dot3(SunDirection, Right) / (SunViewDot * Aspect * TanHalf);
        SunNdcY = Dot3(SunDirection, Up)    / (SunViewDot * TanHalf);
    }

    FlareOpticsProfile FlareProfile{};
    FlareProfile.ApertureBlades    = std::max(3u, FlareCfg.ApertureBladeCount);
    FlareProfile.GhostStrength     = static_cast<double>(FlareCfg.Intensity);
    FlareProfile.StarburstStrength = FlareCfg.DiffractionStarburst ? static_cast<double>(FlareCfg.Intensity) : 0.0;
    FlareProfile.AnamorphicStrength = FlareCfg.AnamorphicStreak ? static_cast<double>(FlareCfg.Intensity * 0.5f) : 0.0;

    for (uint32_t Y = 0u; Y < TraceHeight; ++Y)
    {
        const float NdcY = 1.0f - 2.0f * (static_cast<float>(Y) + 0.5f) / static_cast<float>(TraceHeight);
        for (uint32_t X = 0u; X < TraceWidth; ++X)
        {
            const size_t PixelIndex = static_cast<size_t>(Y) * TraceWidth + X;
            const TracePixelGuide& Guide = PrimaryGuides_[PixelIndex];
            const bool IsSky = (Guide.ViewDepth <= 0.0f);
            const float NdcX = 2.0f * (static_cast<float>(X) + 0.5f) / static_cast<float>(TraceWidth) - 1.0f;
            const std::array<float, 3> RayDir = Normalize3({
                Forward[0] + Right[0] * (NdcX * Aspect * TanHalf) + Up[0] * (NdcY * TanHalf),
                Forward[1] + Right[1] * (NdcX * Aspect * TanHalf) + Up[1] * (NdcY * TanHalf),
                Forward[2] + Right[2] * (NdcX * Aspect * TanHalf) + Up[2] * (NdcY * TanHalf)
            });

            std::array<float, 3> PixelRadiance = {0.0f, 0.0f, 0.0f};

            if (PipelineCfg.InspectionModeIndex > 0)
            {
                if (!IsSky)
                {
                    const SurfaceMaterialSpecification& Surface =
                        Course_.Materials[std::min(static_cast<size_t>(Guide.Family), Course_.Materials.size() - 1u)];
                    switch (PipelineCfg.InspectionModeIndex)
                    {
                        case 1:
                            PixelRadiance = Surface.Albedo;
                            break;
                        case 2:
                            PixelRadiance = {
                                0.5f + 0.5f * Guide.WorldNormal[0],
                                0.5f + 0.5f * Guide.WorldNormal[1],
                                0.5f + 0.5f * Guide.WorldNormal[2]
                            };
                            break;
                        case 3:
                            PixelRadiance = {Surface.Roughness, Surface.Metalness, Surface.CoatWeight};
                            break;
                        case 4:
                        {
                            const float D = std::clamp(Guide.ViewDepth / 80.0f, 0.0f, 1.0f);
                            PixelRadiance = {1.0f - D, 1.0f - D, 1.0f - D};
                            break;
                        }
                        default:
                            PixelRadiance = {
                                FilteredIrradiance[PixelIndex][0],
                                FilteredIrradiance[PixelIndex][1],
                                FilteredIrradiance[PixelIndex][2]
                            };
                            break;
                    }
                }
                AccumulatedHdr_[PixelIndex] = PixelRadiance;
                continue;
            }

            if (IsSky)
            {
                if (AtmosCfg.Enabled && SkyViewLut_.Baked())
                {
                    const SpectrumRgb SkySample = SkyViewLut_.Sample({RayDir[0], RayDir[1], RayDir[2]});
                    const SpectrumRgb Twilight  = EvaluateTwilightArchRadiance(
                        {RayDir[0], RayDir[1], RayDir[2]},
                        {SunDirection[0], SunDirection[1], SunDirection[2]},
                        {SunRadiance[0], SunRadiance[1], SunRadiance[2]},
                        0.25);
                    PixelRadiance = {
                        static_cast<float>(SkySample.R + Twilight.R),
                        static_cast<float>(SkySample.G + Twilight.G),
                        static_cast<float>(SkySample.B + Twilight.B)
                    };
                }
                else
                {
                    const float Zenith = std::clamp(RayDir[2], 0.0f, 1.0f);
                    PixelRadiance = {
                        0.52f * (1.0f - Zenith) + 0.12f * Zenith,
                        0.64f * (1.0f - Zenith) + 0.26f * Zenith,
                        0.82f * (1.0f - Zenith) + 0.58f * Zenith
                    };
                }

                if (SolarCfg.Enabled)
                {
                    const double CosSun = std::clamp(static_cast<double>(Dot3(RayDir, SunDirection)), -1.0, 1.0);
                    const double Theta  = std::acos(CosSun);
                    if (Theta < SunDisc.AngularRadiusRad * 2.4)
                    {
                        const SpectrumRgb Disc = EvaluateSunDiscRadiance(
                            Theta,
                            SunDisc,
                            {SunRadiance[0] * 14.0, SunRadiance[1] * 13.0, SunRadiance[2] * 11.5});
                        PixelRadiance[0] += static_cast<float>(Disc.R);
                        PixelRadiance[1] += static_cast<float>(Disc.G);
                        PixelRadiance[2] += static_cast<float>(Disc.B);
                    }
                }

                const auto MoonRad = EvaluateMoonDiscs(RayDir, SunDirection, MoonCfg);
                const auto StarRad = EvaluateStarAndPlanetField(RayDir, StarCfg, DaylightFactor);
                for (size_t C = 0u; C < 3u; ++C)
                {
                    PixelRadiance[C] += MoonRad[C] + StarRad[C];
                }

                if (CloudCfg.Enabled && RayDir[2] > 0.03f && CloudParams.Coverage > 0.01)
                {
                    const CloudMarchResult CloudRes = MarchClouds(
                        CloudParams,
                        {Camera.EyePosition[0], Camera.EyePosition[1], std::max(1.0f, Camera.EyePosition[2])},
                        {RayDir[0], RayDir[1], RayDir[2]},
                        {SunDirection[0], SunDirection[1], SunDirection[2]},
                        {std::max(0.2f, SunRadiance[0] * 1.4f), std::max(0.2f, SunRadiance[1] * 1.35f), std::max(0.2f, SunRadiance[2] * 1.3f)},
                        16000.0,
                        12u,
                        3u);
                    const float Trans = static_cast<float>(std::clamp(CloudRes.Transmittance, 0.0, 1.0));
                    PixelRadiance[0]  = PixelRadiance[0] * Trans + static_cast<float>(CloudRes.Radiance.R);
                    PixelRadiance[1]  = PixelRadiance[1] * Trans + static_cast<float>(CloudRes.Radiance.G);
                    PixelRadiance[2]  = PixelRadiance[2] * Trans + static_cast<float>(CloudRes.Radiance.B);
                }
            }
            else
            {
                const SurfaceMaterialSpecification& Surface =
                    Course_.Materials[std::min(static_cast<size_t>(Guide.Family), Course_.Materials.size() - 1u)];
                const std::array<float, 3> ViewDir = {-RayDir[0], -RayDir[1], -RayDir[2]};

                std::array<float, 3> DirectSun = {0.0f, 0.0f, 0.0f};
                if (SolarCfg.Enabled && SunDirection[2] > 0.0f && Dot3(Guide.WorldNormal, SunDirection) > 0.0f)
                {
                    const std::array<float, 3> ShadowOrigin = {
                        Guide.WorldPosition[0] + Guide.WorldNormal[0] * 0.02f,
                        Guide.WorldPosition[1] + Guide.WorldNormal[1] * 0.02f,
                        Guide.WorldPosition[2] + Guide.WorldNormal[2] * 0.02f
                    };
                    const bool InShadow = SolarCfg.CastRaytracedShadow &&
                        RaySpace_.TraceRayCpu(Course_.Scene, ShadowOrigin, SunDirection, 0.01f, 300.0f).Hit;
                    if (!InShadow)
                    {
                        const auto Bsdf = EvaluateSurfaceBsdfCpu(Surface, Guide.WorldNormal, ViewDir, SunDirection);
                        for (size_t C = 0u; C < 3u; ++C)
                        {
                            DirectSun[C] = Bsdf[C] * SunRadiance[C] * 2.25f;
                        }
                    }
                }

                std::array<float, 3> SkyRefl = {0.18f, 0.26f, 0.40f};
                const float          NdotV   = std::max(Dot3(Guide.WorldNormal, ViewDir), 0.0f);
                const std::array<float, 3> ReflectDir = Normalize3({
                    RayDir[0] + 2.0f * NdotV * Guide.WorldNormal[0],
                    RayDir[1] + 2.0f * NdotV * Guide.WorldNormal[1],
                    RayDir[2] + 2.0f * NdotV * Guide.WorldNormal[2]
                });
                if (AtmosCfg.Enabled && SkyViewLut_.Baked())
                {
                    const SpectrumRgb EnvSpec = SkyViewLut_.Sample({ReflectDir[0], ReflectDir[1], std::max(0.02f, ReflectDir[2])});
                    SkyRefl = {static_cast<float>(EnvSpec.R), static_cast<float>(EnvSpec.G), static_cast<float>(EnvSpec.B)};
                }

                std::array<float, 3> TracedRefl = SkyRefl;
                if (PipelineCfg.ScreenSpaceReflections && (Surface.CoatWeight > 0.1f || Surface.Metalness > 0.15f))
                {
                    StochasticGenerator ReflGen = ConstructGeneratorCpu(X, Y, AccumulatedFrames_, 17u);
                    const float EffRough = (Surface.CoatWeight > 0.1f) ? Surface.CoatRoughness : Surface.Roughness;
                    const ReflectionTraceSample ReflSample = TraceMultiBounceReflectionCpu(
                        Course_.Scene,
                        RaySpace_,
                        Course_.Materials,
                        &ClusteredLights_,
                        PtEnv,
                        Guide.WorldPosition,
                        Guide.WorldNormal,
                        ReflectDir,
                        EffRough,
                        ReflGen);
                    TracedRefl = {
                        ReflSample.Radiance[0] * 0.55f + SkyRefl[0] * 0.45f,
                        ReflSample.Radiance[1] * 0.55f + SkyRefl[1] * 0.45f,
                        ReflSample.Radiance[2] * 0.55f + SkyRefl[2] * 0.45f
                    };
                }

                std::array<float, 3> SpecF0 = {
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[0] * Surface.Metalness,
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[1] * Surface.Metalness,
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[2] * Surface.Metalness
                };
                if (Surface.FlakeCoverage > 0.0f)
                {
                    for (size_t C = 0u; C < 3u; ++C)
                    {
                        SpecF0[C] = SpecF0[C] * (1.0f - Surface.FlakeCoverage * 0.65f) + Surface.FlakeTint[C] * (Surface.FlakeCoverage * 0.65f);
                    }
                }
                const float Schlick     = std::pow(std::clamp(1.0f - NdotV, 0.0f, 1.0f), 5.0f);
                const float CoatFresnel = (0.04f + 0.96f * Schlick) * Surface.CoatWeight;
                const std::array<float, 3> FlakeFresnel = {
                    SpecF0[0] + (1.0f - SpecF0[0]) * Schlick,
                    SpecF0[1] + (1.0f - SpecF0[1]) * Schlick,
                    SpecF0[2] + (1.0f - SpecF0[2]) * Schlick
                };

                std::array<float, 3> DiffuseAlbedo = {
                    Surface.Albedo[0] * (1.0f - Surface.Metalness * 0.5f),
                    Surface.Albedo[1] * (1.0f - Surface.Metalness * 0.5f),
                    Surface.Albedo[2] * (1.0f - Surface.Metalness * 0.5f)
                };
                if (Surface.FlakeCoverage > 0.0f)
                {
                    for (size_t C = 0u; C < 3u; ++C)
                    {
                        DiffuseAlbedo[C] = DiffuseAlbedo[C] * 0.65f + Surface.FlakeTint[C] * 0.35f;
                    }
                }

                for (size_t C = 0u; C < 3u; ++C)
                {
                    const float ReSTIRTerm = FilteredIrradiance[PixelIndex][C] * DiffuseAlbedo[C] * 0.72f;
                    const float FlakeEnv   = TracedRefl[C] * FlakeFresnel[C] * (Surface.FlakeCoverage > 0.0f ? 0.28f : 0.18f);
                    const float CoatEnv    = TracedRefl[C] * CoatFresnel * 0.38f;
                    PixelRadiance[C]       = Surface.RadiantExitance[C] + DirectSun[C] + ReSTIRTerm + FlakeEnv + CoatEnv;
                }

                if (FogCfg.Enabled && Guide.ViewDepth > FogCfg.StartDistanceMetres)
                {
                    const double FogDist = static_cast<double>(Guide.ViewDepth - FogCfg.StartDistanceMetres);
                    const double FogT    = FogTransmittance(
                        FogMedium,
                        {Camera.EyePosition[0], Camera.EyePosition[1], Camera.EyePosition[2]},
                        {RayDir[0], RayDir[1], RayDir[2]},
                        FogDist);
                    const SpectrumRgb Fogged = ApplyFog(
                        FogMedium,
                        {PixelRadiance[0], PixelRadiance[1], PixelRadiance[2]},
                        FogT);
                    PixelRadiance = {
                        static_cast<float>(Fogged.R),
                        static_cast<float>(Fogged.G),
                        static_cast<float>(Fogged.B)
                    };
                }
            }

            if (FlareVisible)
            {
                const SpectrumRgb FlareRad = EvaluateLensFlareRadiance(
                    NdcX,
                    NdcY,
                    SunNdcX,
                    SunNdcY,
                    {SunRadiance[0] * 0.22, SunRadiance[1] * 0.20, SunRadiance[2] * 0.18},
                    1.0,
                    FlareProfile);
                PixelRadiance[0] += static_cast<float>(FlareRad.R);
                PixelRadiance[1] += static_cast<float>(FlareRad.G);
                PixelRadiance[2] += static_cast<float>(FlareRad.B);
            }

            AccumulatedHdr_[PixelIndex] = PixelRadiance;
        }
    }

    OutRgba8Pixels.resize(static_cast<size_t>(OutputWidth) * OutputHeight * 4u);
    const float Exposure = std::pow(2.0f, PipelineCfg.ExposureCompensationEv);
    for (uint32_t Oy = 0u; Oy < OutputHeight; ++Oy)
    {
        const float   SrcY = ((static_cast<float>(Oy) + 0.5f) / static_cast<float>(OutputHeight)) * static_cast<float>(TraceHeight) - 0.5f;
        const int32_t Y0   = std::clamp(static_cast<int32_t>(std::floor(SrcY)), 0, static_cast<int32_t>(TraceHeight) - 1);
        const int32_t Y1   = std::min(Y0 + 1, static_cast<int32_t>(TraceHeight) - 1);
        const float   Fy   = std::clamp(SrcY - static_cast<float>(Y0), 0.0f, 1.0f);

        for (uint32_t Ox = 0u; Ox < OutputWidth; ++Ox)
        {
            const float   SrcX = ((static_cast<float>(Ox) + 0.5f) / static_cast<float>(OutputWidth)) * static_cast<float>(TraceWidth) - 1.0f * 0.5f;
            const int32_t X0   = std::clamp(static_cast<int32_t>(std::floor(SrcX)), 0, static_cast<int32_t>(TraceWidth) - 1);
            const int32_t X1   = std::min(X0 + 1, static_cast<int32_t>(TraceWidth) - 1);
            const float   Fx   = std::clamp(SrcX - static_cast<float>(X0), 0.0f, 1.0f);

            const auto& C00 = AccumulatedHdr_[static_cast<size_t>(Y0) * TraceWidth + static_cast<size_t>(X0)];
            const auto& C10 = AccumulatedHdr_[static_cast<size_t>(Y0) * TraceWidth + static_cast<size_t>(X1)];
            const auto& C01 = AccumulatedHdr_[static_cast<size_t>(Y1) * TraceWidth + static_cast<size_t>(X0)];
            const auto& C11 = AccumulatedHdr_[static_cast<size_t>(Y1) * TraceWidth + static_cast<size_t>(X1)];

            std::array<float, 3> Sampled{};
            for (size_t C = 0u; C < 3u; ++C)
            {
                const float Top = C00[C] * (1.0f - Fx) + C10[C] * Fx;
                const float Bot = C01[C] * (1.0f - Fx) + C11[C] * Fx;
                Sampled[C]      = (Top * (1.0f - Fy) + Bot * Fy) * Exposure;
            }

            std::array<float, 3> Mapped = Sampled;
            if (PipelineCfg.InspectionModeIndex == 0 && PipelineCfg.AcesFilmicTonemap)
            {
                Mapped = ApplyAcesFilmicLocal(Sampled);
            }

            const size_t OutBase = (static_cast<size_t>(Oy) * OutputWidth + Ox) * 4u;
            for (size_t C = 0u; C < 3u; ++C)
            {
                const float Clamped = std::clamp(Mapped[C], 0.0f, 1.0f);
                const float Srgb    = (PipelineCfg.InspectionModeIndex == 0) ? std::pow(Clamped, 1.0f / 2.2f) : Clamped;
                OutRgba8Pixels[OutBase + C] = static_cast<uint8_t>(std::clamp(std::lround(Srgb * 255.0f), 0L, 255L));
            }
            OutRgba8Pixels[OutBase + 3u] = 255u;
        }
    }
}

} // namespace Everest
