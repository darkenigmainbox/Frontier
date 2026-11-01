/*==========================================================================================================================================
                                                       CLUSTERED LIGHTING SEQUENCE
                                     ------------------------------------------------------------------
                 World-space 16x16x4 clustered light grid (up to 64 omnidirectional, street-lamp, ECE
                     low-beam, high-beam, fog, and floodlight emitters with 64-bit per-cell bitmasks)
                                      ported 1:1 from LightingSystem.js and ClusteredLights.wgsl.
==========================================================================================================================================*/

// 🧩 16x16x4 world-space clustered lighting sequence and ECE beam photometry ported 1:1 from LightingSystem.js.

#pragma once

#include <array>
#include <cstdint>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                              LIGHT CATEGORIES & BEAM MODES
//------------------------------------------------------------------------------------------------------------------------

enum class LightCategory : uint32_t
{
    Omni       = 0u,
    StreetLamp = 1u,
    LowBeam    = 2u,
    HighBeam   = 3u,
    Fog        = 4u,
    Floodlight = 5u
};

enum class RoofFixtureCategory : uint32_t
{
    SlimLed  = 0u,
    RallyPod = 1u
};

enum class AutomotiveBeamMode : uint32_t
{
    Off      = 0u,
    LowBeam  = 1u,
    HighBeam = 2u,
    Fog      = 3u
};

inline constexpr uint32_t ClusterCapacity       = 64u;
inline constexpr uint32_t ClusterGridDimensions = 16u;
inline constexpr uint32_t ClusterGridLayers     = 4u;
inline constexpr uint32_t ClusterCellCount      = ClusterGridDimensions * ClusterGridDimensions * ClusterGridLayers;
inline constexpr uint32_t ClusterHeaderWords    = 8u;
inline constexpr uint32_t ClusterLightStride    = 16u;
inline constexpr uint32_t ClusterBufferWords    = ClusterHeaderWords
                                                + ClusterCapacity * ClusterLightStride
                                                + ClusterCellCount * 2u;

struct ClusteredLightEmitter
{
    std::array<float, 3> Position  = {0.0f, 0.0f, 0.0f}; // [m] - world emitter origin
    float                Radius    = 10.0f;              // [m] - smooth zero-influence range
    std::array<float, 3> Radiance  = {1.0f, 1.0f, 1.0f}; // [cd] - luminous intensity
    LightCategory        Category  = LightCategory::Omni;// [-] - photometric profile
    std::array<float, 3> Direction = {1.0f, 0.0f, 0.0f}; // [-] - unit beam forward axis
    float                Parameter = 0.0f;               // [-] - asymmetry (+0.028 L / -0.008 R) or cosine cone
    std::array<float, 3> Right     = {0.0f, -1.0f, 0.0f};// [-] - beam right axis
};

struct StreetPoleSpecification
{
    std::array<float, 3> BulbPosition = {0.0f, 0.0f, 7.0f}; // [m] - world lamp housing position
    std::array<float, 3> Colour       = {1.0f, 0.85f, 0.6f};// [-] - lamp chromaticity
    float                Intensity    = 18.0f;              // [cd] - luminous scalar
    float                Radius       = 26.0f;              // [m] - cutoff radius
    bool                 Floodlight   = false;              // [-] - true for stadium floodlight
    std::array<float, 3> AimDirection = {0.0f, 0.0f, -1.0f};// [-] - floodlight aim vector
    float                CosineCutoff = 0.48f;              // [-] - floodlight half-angle cosine
};

struct PointLampSpecification
{
    std::array<float, 3> Position  = {0.0f, 0.0f, 2.0f}; // [m] - world lamp position
    std::array<float, 3> Colour    = {1.0f, 0.9f, 0.7f}; // [-] - lamp chromaticity
    float                Intensity = 12.0f;              // [cd] - luminous scalar
    float                Radius    = 16.0f;              // [m] - cutoff radius
};

struct TransientBurstLight
{
    bool                 Active    = false;              // [-] - true when active
    std::array<float, 3> Position  = {0.0f, 0.0f, 0.0f}; // [m] - burst origin
    std::array<float, 3> Colour    = {1.0f, 0.6f, 0.2f}; // [-] - burst tint
    float                Intensity = 0.0f;               // [cd] - burst intensity
    float                Radius    = 8.0f;               // [m] - burst radius
};

struct LightWorldBounds
{
    std::array<float, 3> Minimum = {0.0f, 0.0f, 0.0f}; // [m]
    std::array<float, 3> Maximum = {0.0f, 0.0f, 0.0f}; // [m]
};

[[nodiscard]] LightWorldBounds ResolveLightWorldBounds(const ClusteredLightEmitter& Light) noexcept;

[[nodiscard]] float EvaluateLightPhotometryCpu(const ClusteredLightEmitter& Light,
                                               std::array<float, 3>         ToPoint) noexcept;

[[nodiscard]] std::array<float, 3> EvaluateLightArrivalCpu(const ClusteredLightEmitter& Light,
                                                           std::array<float, 3>         Point,
                                                           std::array<float, 3>&        OutToLight,
                                                           float&                       OutDistance) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                              CLUSTERED LIGHTING SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

class ClusteredLightingSequence
{
  public:
    ClusteredLightingSequence();

    void Update(const std::array<float, 16>&                 VehicleTransform,
                const std::vector<StreetPoleSpecification>&  Poles,
                const std::vector<PointLampSpecification>&   PointLamps,
                const TransientBurstLight*                   TransientLight = nullptr);

    [[nodiscard]] int32_t QueryClusterCellIndexCpu(std::array<float, 3> WorldPosition) const noexcept;

    [[nodiscard]] std::array<uint32_t, 2> QueryCellMaskCpu(uint32_t CellIndex) const noexcept;

    [[nodiscard]] uint32_t                                    ActiveCount() const noexcept { return ActiveCount_; }
    [[nodiscard]] const std::vector<ClusteredLightEmitter>&   ActiveLights() const noexcept { return Lights_; }
    [[nodiscard]] const std::vector<uint32_t>&                StagingWords() const noexcept { return StagingWords_; }

    AutomotiveBeamMode   HeadlightMode      = AutomotiveBeamMode::LowBeam;
    bool                 RoofMounted        = false;
    RoofFixtureCategory  RoofCategory       = RoofFixtureCategory::SlimLed;
    bool                 TaillightsActive   = true;
    bool                 Braking            = false;
    bool                 StreetLampsEnabled = true;
    float                HeadlightIntensity = 1.0f;
    float                StreetLightScale   = 1.0f;
    std::array<float, 3> GridMin            = {-80.0f, -80.0f, -2.0f};
    std::array<float, 3> GridMax            = {180.0f,  80.0f, 28.0f};

  private:
    void PushLight(const ClusteredLightEmitter& Light);

    uint32_t                           ActiveCount_ = 0u;
    std::vector<ClusteredLightEmitter> Lights_;
    std::vector<uint32_t>              StagingWords_;
};

} // namespace Frontier
