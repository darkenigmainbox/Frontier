/*==========================================================================================================================================
                                                 RESAMPLING AND VARIANCE SEQUENCE
                                     ------------------------------------------------------------------
                 VehicleHMI 1:1 ReSTIR GI path tracer, multi-bounce glossy reflection tracer, temporal +
                  spatial reservoir reuse with reconnection Jacobian and visibility verification, SVGF
                   temporal moments + 5x5 B3-spline à-trous wavelet + joint bilateral upsample, 4-cascade
                        toroidal SDF + 6-card surface radiosity depot, and display recombination.
==========================================================================================================================================*/

// 🧩 1:1 port of ResamplingSequence.js, VarianceIntegrator.js, RayTraversal.wgsl, ReservoirTemporal/Spatial.wgsl, and Variance*.wgsl.

#pragma once

#include "ClusteredLightingSequence.h"
#include "RayTracingSpace.h"

#include <array>
#include <cstdint>
#include <filesystem>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                           FEATURE BITMASK & BOUNCE PACKING
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t FeatureTemporalAccumulation = 1u << 0u;
inline constexpr uint32_t FeatureSpatialResampling    = 1u << 1u;
inline constexpr uint32_t FeatureVisibilityReuse      = 1u << 2u;
inline constexpr uint32_t FeatureMultiBounceCards     = 1u << 3u;
inline constexpr uint32_t FeatureSunShadows           = 1u << 4u;
inline constexpr uint32_t FeatureVarianceKernel       = 1u << 5u;
inline constexpr uint32_t FeatureReflection           = 1u << 6u;
inline constexpr uint32_t FeatureIndirect             = 1u << 7u;
inline constexpr uint32_t FeaturePostExposure         = 1u << 8u;
inline constexpr uint32_t FeatureTemporalRestart      = 1u << 9u;
inline constexpr uint32_t FeatureRayTracing           = 1u << 10u;
inline constexpr uint32_t FeatureRayTracedReflections = 1u << 11u;
inline constexpr uint32_t FeatureTyreSmoke            = 1u << 12u;
inline constexpr uint32_t FeatureClusteredLights      = 1u << 13u;
inline constexpr uint32_t FeatureCloudShadows         = 1u << 14u;
inline constexpr uint32_t FeatureReflectionFirefly    = 1u << 15u;
inline constexpr uint32_t FeatureBounceCountShift     = 16u;
inline constexpr uint32_t FeatureBounceCountMask      = 0x70000u;

[[nodiscard]] uint32_t EncodeBounceCountBits(uint32_t Bounces) noexcept;
[[nodiscard]] uint32_t ResolveBounceCountCpu(uint32_t FeatureBits) noexcept;
[[nodiscard]] float    EncodeReflectionParametersCpu(float ReflectionScale, float ReflectionRoughness) noexcept;
[[nodiscard]] float    ResolveReflectionScaleCpu(float EncodedCardBounceScale) noexcept;
[[nodiscard]] float    ResolveReflectionRoughnessCpu(float EncodedCardBounceScale) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                        PCG32 & R2 LOW-DISCREPANCY SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

struct StochasticGenerator
{
    uint32_t State = 1u; // [-] - internal PCG word

    [[nodiscard]] uint32_t             Step() noexcept;
    [[nodiscard]] float                SampleUnit() noexcept;
    [[nodiscard]] std::array<float, 2> SamplePair() noexcept;
};

[[nodiscard]] StochasticGenerator  ConstructGeneratorCpu(uint32_t PixelX, uint32_t PixelY, uint32_t StepIndex, uint32_t Salt) noexcept;
[[nodiscard]] std::array<float, 2> EvaluateDiscrepancyPairCpu(uint32_t Index) noexcept;
[[nodiscard]] std::array<float, 3> SampleCosineHemisphereCpu(std::array<float, 2> Random,
                                                             std::array<float, 3> Normal,
                                                             float&               OutPdf) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                       BSDF, NEE, AND MULTI-BOUNCE PATH TRACER
//------------------------------------------------------------------------------------------------------------------------

struct BsdfDirectionSample
{
    std::array<float, 3> Direction  = {0.0f, 0.0f, 1.0f}; // [-] - sampled outgoing direction
    std::array<float, 3> Throughput = {0.0f, 0.0f, 0.0f}; // [-] - f * cos / p
    float                Pdf        = 0.0f;               // [1/sr] - mixture solid-angle PDF
    bool                 Specular   = false;              // [-] - true when specular lobe chosen
};

[[nodiscard]] std::array<float, 3> EvaluateSurfaceBsdfCpu(const SurfaceMaterialSpecification& Surface,
                                                          std::array<float, 3>                Normal,
                                                          std::array<float, 3>                View,
                                                          std::array<float, 3>                Light) noexcept;

[[nodiscard]] float EvaluateSurfaceBsdfPdfCpu(const SurfaceMaterialSpecification& Surface,
                                              std::array<float, 3>                Normal,
                                              std::array<float, 3>                View,
                                              std::array<float, 3>                Light) noexcept;

[[nodiscard]] BsdfDirectionSample SampleSurfaceBsdfCpu(const SurfaceMaterialSpecification& Surface,
                                                       std::array<float, 3>                Normal,
                                                       std::array<float, 3>                View,
                                                       StochasticGenerator&                Generator) noexcept;

struct PathTraceEnvironmentParameters
{
    std::array<float, 3> SolarDirection       = {0.42f, -0.34f, 0.84f}; // [-] - unit direction toward sun
    float                SolarAngularRadius   = 0.00465f;               // [rad] - solar half-angle
    std::array<float, 3> SunIlluminance       = {3.8f, 3.55f, 3.15f};   // [W/m^2] - direct solar irradiance
    std::array<float, 3> SkyZenithRadiance    = {0.35f, 0.52f, 0.88f};  // [W/(m^2*sr)]
    std::array<float, 3> SkyHorizonRadiance   = {0.62f, 0.72f, 0.86f};  // [W/(m^2*sr)]
    float                SkyIntensity         = 1.0f;                   // [-]
    float                EmissionScale        = 1.0f;                   // [-]
    uint32_t             Features             = FeatureRayTracing | FeatureSunShadows | FeatureClusteredLights; // [-]
    uint32_t             BounceCount          = 2u;                     // [-] - 1..6 bounces
    bool                 CabinHmiActive       = false;                  // [-] - true when interior displays emit
    std::array<float, 3> CabinTabletPosition  = {0.58f, 0.0f, 0.85f};   // [m] - world tablet centre
    std::array<float, 3> CabinTabletNormal    = {-0.96f, 0.0f, 0.28f};  // [-] - world tablet normal
    std::array<float, 3> CabinClusterPosition = {0.72f, 0.36f, 0.90f};  // [m] - world cluster centre
    std::array<float, 3> CabinClusterNormal   = {-0.98f, 0.0f, 0.20f};  // [-] - world cluster normal
};

struct FirstBounceGatherSample
{
    std::array<float, 3> Position  = {0.0f, 0.0f, 0.0f}; // [m] - primary bounce hit point (or far sky point)
    std::array<float, 3> Normal    = {0.0f, 0.0f, 1.0f}; // [-] - primary bounce hit normal
    std::array<float, 3> Radiance  = {0.0f, 0.0f, 0.0f}; // [W/(m^2*sr)] - multi-bounce outgoing radiance
    uint32_t             Occupant  = 0xFFFFFFFFu;        // [idx] - hit occupant or 0xFFFFFFFFu for sky
    float                SourcePdf = 1.0f;               // [1/sr] - proposal PDF at primary vertex
};

[[nodiscard]] std::array<float, 3> EvaluateDirectNextEventCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              HitPosition,
    std::array<float, 3>                              HitNormal,
    std::array<float, 3>                              ViewDirection,
    const SurfaceMaterialSpecification&               Surface,
    float                                             NormalOffset,
    StochasticGenerator&                              Generator) noexcept;

[[nodiscard]] FirstBounceGatherSample TraceMultiBouncePathCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const std::vector<SurfaceMaterialSpecification>&  Materials,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              PrimaryPosition,
    std::array<float, 3>                              PrimaryNormal,
    std::array<float, 3>                              RayDirection,
    float                                             ProposalPdf,
    StochasticGenerator&                              Generator) noexcept;

struct ReflectionTraceSample
{
    std::array<float, 3> Radiance  = {0.0f, 0.0f, 0.0f}; // [W/(m^2*sr)]
    float                HitTravel = 500.0f;             // [m] - primary reflection hit distance for virtual reprojection
};

[[nodiscard]] ReflectionTraceSample TraceMultiBounceReflectionCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const std::vector<SurfaceMaterialSpecification>&  Materials,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              PrimaryPosition,
    std::array<float, 3>                              PrimaryNormal,
    std::array<float, 3>                              MirrorDirection,
    float                                             PrimaryRoughness,
    StochasticGenerator&                              Generator) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                         RESERVOIR RECORDS & REUSE OPERATORS
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t SkyOccupantSentinel = 0xFFFFFFFFu;
inline constexpr float    TemporalHistoryCap  = 20.0f;

struct VehicleReservoirRecord
{
    std::array<float, 3> SamplePosition  = {0.0f, 0.0f, 0.0f}; // [m] - world hit point y_s (or far sky point)
    uint32_t             SampleOccupant  = SkyOccupantSentinel;// [idx] - occupant index or SkyOccupantSentinel
    std::array<float, 3> SampleRadiance  = {0.0f, 0.0f, 0.0f}; // [W/(m^2*sr)] - outgoing radiance L(y_s -> x)
    uint32_t             PackedNormal    = 0u;                 // [snorm16x2] - octahedral normal at y_s
    float                WeightSum       = 0.0f;               // [-] - running RIS weight sum w_sum
    float                TargetDensity   = 0.0f;               // [-] - target density p_hat at chosen sample
    float                SampleTally     = 0.0f;               // [-] - effective sample count M
    float                WeightFactor    = 0.0f;               // [-] - unbiased integration weight W
};

[[nodiscard]] float ResolveTargetDensityCpu(std::array<float, 3> ReceiverPosition,
                                            std::array<float, 3> ReceiverNormal,
                                            std::array<float, 3> SamplePosition,
                                            std::array<float, 3> SampleRadiance) noexcept;

[[nodiscard]] float EvaluateReconnectionJacobianCpu(std::array<float, 3> ReceiverPosition,
                                                    std::array<float, 3> NeighbourPosition,
                                                    std::array<float, 3> SamplePosition,
                                                    std::array<float, 3> SampleNormal,
                                                    uint32_t             SampleOccupant) noexcept;

bool CombineVehicleReservoir(VehicleReservoirRecord&       State,
                             std::array<float, 3>          SamplePosition,
                             std::array<float, 3>          SampleNormal,
                             std::array<float, 3>          SampleRadiance,
                             uint32_t                      SampleOccupant,
                             float                         TargetDensity,
                             float                         ResampleWeight,
                             float                         CandidateTally,
                             float                         RandomUnit) noexcept;

void FinalizeVehicleReservoir(VehicleReservoirRecord& State, float NormalizationDenominator) noexcept;

void CarryReservoirSampleCpu(const SceneFacetCollection& Scene,
                             VehicleReservoirRecord&     Reservoir,
                             std::array<float, 3>&       InOutSampleNormal) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                          RESAMPLING & VARIANCE SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

struct TracePixelGuide
{
    std::array<float, 3> WorldPosition = {0.0f, 0.0f, 0.0f}; // [m]
    std::array<float, 3> WorldNormal   = {0.0f, 0.0f, 1.0f}; // [-]
    float                ViewDepth     = 0.0f;               // [m] - <= 0 for sky
    float                ExpectedDepth = 0.0f;               // [m]
    std::array<float, 2> MotionPixels  = {0.0f, 0.0f};       // [px] - screen motion vector
    CourseMaterial       Family        = CourseMaterial::Asphalt;
};

class ResamplingAndVarianceSequence
{
  public:
    void ConfigureDimensions(uint32_t ScreenWidth, uint32_t ScreenHeight, uint32_t TraceScale = 2u);

    void StepTemporalAndSpatialReuseCpu(const SceneFacetCollection&                      Scene,
                                        const RayTracingSpace&                           RaySpace,
                                        const std::vector<SurfaceMaterialSpecification>& Materials,
                                        const ClusteredLightingSequence*                 ClusteredLights,
                                        const PathTraceEnvironmentParameters&            Environment,
                                        const std::vector<TracePixelGuide>&              TraceGuides,
                                        uint32_t                                         StepIndex);

    void StepVarianceFilterCpu(const std::vector<TracePixelGuide>& TraceGuides,
                               uint32_t                            StepIndex,
                               bool                                EnableVarianceKernel = true);

    [[nodiscard]] uint32_t                                   TraceWidth() const noexcept { return TraceWidth_; }
    [[nodiscard]] uint32_t                                   TraceHeight() const noexcept { return TraceHeight_; }
    [[nodiscard]] const std::vector<VehicleReservoirRecord>& SpatialReservoirs() const noexcept { return SpatialReservoirs_; }
    [[nodiscard]] const std::vector<std::array<float, 4>>&   ResampledIrradiance() const noexcept { return ResampledIrradiance_; }
    [[nodiscard]] const std::vector<std::array<float, 4>>&   FilteredIrradiance() const noexcept { return FilteredIrradiance_; }

  private:
    uint32_t                            ScreenWidth_  = 0u;
    uint32_t                            ScreenHeight_ = 0u;
    uint32_t                            TraceScale_   = 2u;
    uint32_t                            TraceWidth_   = 0u;
    uint32_t                            TraceHeight_  = 0u;
    std::vector<TracePixelGuide>        PriorGuides_;
    std::vector<VehicleReservoirRecord> PriorReservoirs_;
    std::vector<VehicleReservoirRecord> TemporalReservoirs_;
    std::vector<VehicleReservoirRecord> SpatialReservoirs_;
    std::vector<std::array<float, 4>>   ResampledIrradiance_;
    std::vector<std::array<float, 4>>   PriorFiltered_;
    std::vector<std::array<float, 4>>   PriorMoments_;
    std::vector<std::array<float, 4>>   CurrentMoments_;
    std::vector<std::array<float, 4>>   FilteredIrradiance_;
    std::vector<std::array<float, 4>>   WaveletScratch_;
};

//------------------------------------------------------------------------------------------------------------------------
//                                           SHADER COMPILATION VALIDATOR
//------------------------------------------------------------------------------------------------------------------------

struct ShaderCompilationSummary
{
    uint32_t                 CompiledCount = 0u;    // [-] - number of shaders compiled to SPIR-V 1.5
    uint32_t                 TotalBytes    = 0u;    // [B] - total SPIR-V byte count
    std::vector<std::string> CompiledEntryPoints;   // [-] - entry point names
};

[[nodiscard]] ShaderCompilationSummary VerifyVehicleHmiShaderSuite(const std::filesystem::path& ShaderDirectory,
                                                                   const std::filesystem::path& SlangCompilerPath);

} // namespace Frontier
