/*==========================================================================================================================================
                                                       CLUSTERED LIGHTING SEQUENCE
                                     ------------------------------------------------------------------
                 World-space 16x16x4 clustered light grid (up to 64 omnidirectional, street-lamp, ECE
                     low-beam, high-beam, fog, and floodlight emitters with 64-bit per-cell bitmasks)
                                      ported 1:1 from LightingSystem.js and ClusteredLights.wgsl.
==========================================================================================================================================*/

// 🧩 16x16x4 world-space clustered lighting sequence and ECE beam photometry ported 1:1 from LightingSystem.js.

#include "ClusteredLightingSequence.h"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace Frontier
{

namespace
{

[[nodiscard]] inline uint32_t FloatToWord(float Value) noexcept
{
    uint32_t Bits = 0u;
    std::memcpy(&Bits, &Value, sizeof(uint32_t));
    return Bits;
}

[[nodiscard]] inline float SmoothStepCpu(float Edge0, float Edge1, float X) noexcept
{
    const float T = std::clamp((X - Edge0) / (Edge1 - Edge0), 0.0f, 1.0f);
    return T * T * (3.0f - 2.0f * T);
}

[[nodiscard]] inline std::array<float, 3> NormalizeVector(std::array<float, 3> Vector) noexcept
{
    const float LengthSquared = Vector[0] * Vector[0] + Vector[1] * Vector[1] + Vector[2] * Vector[2];
    if (LengthSquared > 1.0e-18f)
    {
        const float InvLength = 1.0f / std::sqrt(LengthSquared);
        return {Vector[0] * InvLength, Vector[1] * InvLength, Vector[2] * InvLength};
    }
    return {1.0f, 0.0f, 0.0f};
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                            LIGHT WORLD BOUNDS & PHOTOMETRY
//------------------------------------------------------------------------------------------------------------------------

LightWorldBounds ResolveLightWorldBounds(const ClusteredLightEmitter& Light) noexcept
{
    const float Px = Light.Position[0];
    const float Py = Light.Position[1];
    const float Pz = Light.Position[2];
    const float R  = Light.Radius;

    if (Light.Category == LightCategory::Omni)
    {
        return {{Px - R, Py - R, Pz - R}, {Px + R, Py + R, Pz + R}};
    }
    if (Light.Category == LightCategory::StreetLamp)
    {
        return {{Px - R, Py - R, Pz - R}, {Px + R, Py + R, Pz + 0.1f * R}};
    }

    float CosHalf = 0.0f;
    switch (Light.Category)
    {
        case LightCategory::LowBeam:    CosHalf = 0.72f; break;
        case LightCategory::HighBeam:   CosHalf = 0.84f; break;
        case LightCategory::Fog:        CosHalf = 0.50f; break;
        case LightCategory::Floodlight: CosHalf = std::max(0.0f, Light.Parameter); break;
        default:                        CosHalf = 0.0f;  break;
    }

    const float SinHalf = std::sqrt(std::max(0.0f, 1.0f - CosHalf * CosHalf));
    const float Dx      = Light.Direction[0];
    const float Dy      = Light.Direction[1];
    const float Dz      = Light.Direction[2];

    const auto AxisMin = [&](float P, float D) noexcept -> float
    {
        if (-D >= CosHalf)
        {
            return P - R;
        }
        const float SinAxis  = std::sqrt(std::max(0.0f, 1.0f - D * D));
        const float RimMin   = D * CosHalf - SinAxis * SinHalf;
        const float EndReach = std::min(D, RimMin) * R;
        return P + std::min(0.0f, EndReach);
    };

    const auto AxisMax = [&](float P, float D) noexcept -> float
    {
        if (D >= CosHalf)
        {
            return P + R;
        }
        const float SinAxis  = std::sqrt(std::max(0.0f, 1.0f - D * D));
        const float RimMax   = D * CosHalf + SinAxis * SinHalf;
        const float EndReach = std::max(D, RimMax) * R;
        return P + std::max(0.0f, EndReach);
    };

    return {
        {AxisMin(Px, Dx), AxisMin(Py, Dy), AxisMin(Pz, Dz)},
        {AxisMax(Px, Dx), AxisMax(Py, Dy), AxisMax(Pz, Dz)}
    };
}

float EvaluateLightPhotometryCpu(const ClusteredLightEmitter& Light,
                                 std::array<float, 3>         ToPoint) noexcept
{
    if (Light.Category == LightCategory::Omni)
    {
        return 1.0f;
    }
    if (Light.Category == LightCategory::StreetLamp)
    {
        const float Down   = std::max(0.0f, -ToPoint[2]);
        const float Spread = SmoothStepCpu(0.08f, 0.55f, Down);
        return Spread * (0.4f + 0.6f * Down);
    }
    const float Forward = ToPoint[0] * Light.Direction[0]
                        + ToPoint[1] * Light.Direction[1]
                        + ToPoint[2] * Light.Direction[2];
    if (Forward <= 0.0f)
    {
        return 0.0f;
    }
    if (Light.Category == LightCategory::Floodlight)
    {
        const float Cone = SmoothStepCpu(Light.Parameter, std::min(0.995f, Light.Parameter + 0.28f), Forward);
        return Cone * (0.35f + 0.65f * std::pow(Forward, 4.0f));
    }
    const std::array<float, 3> Up = NormalizeVector({
        Light.Right[1] * Light.Direction[2] - Light.Right[2] * Light.Direction[1],
        Light.Right[2] * Light.Direction[0] - Light.Right[0] * Light.Direction[2],
        Light.Right[0] * Light.Direction[1] - Light.Right[1] * Light.Direction[0]
    });
    const float Horiz = (ToPoint[0] * Light.Right[0] + ToPoint[1] * Light.Right[1] + ToPoint[2] * Light.Right[2])
                      / std::max(Forward, 1.0e-3f);
    const float Vert  = (ToPoint[0] * Up[0] + ToPoint[1] * Up[1] + ToPoint[2] * Up[2])
                      / std::max(Forward, 1.0e-3f);

    if (Light.Category == LightCategory::LowBeam)
    {
        const float Asym   = Light.Parameter * SmoothStepCpu(-0.05f, 0.30f, Horiz);
        const float Cutoff = 1.0f - SmoothStepCpu(-0.015f + Asym, 0.020f + Asym, Vert);
        const float VShape = std::exp(-std::pow((Vert + 0.055f) * 9.5f, 2.0f));
        const float HShape = std::exp(-Horiz * Horiz * 2.2f);
        const float Hot    = 1.45f * std::exp(-(Horiz - 0.04f) * (Horiz - 0.04f) * 18.0f
                                              - (Vert + 0.025f) * (Vert + 0.025f) * 140.0f);
        return Cutoff * (VShape * HShape + Hot);
    }
    if (Light.Category == LightCategory::HighBeam)
    {
        const float Core = 2.4f * std::exp(-(Horiz * Horiz * 14.0f + Vert * Vert * 28.0f));
        const float Halo = 0.65f * std::exp(-(Horiz * Horiz * 2.4f + Vert * Vert * 5.0f));
        return Core + Halo;
    }
    const float Cut    = 1.0f - SmoothStepCpu(-0.04f, 0.01f, Vert);
    const float VBand  = std::exp(-std::pow((Vert + 0.14f) * 6.5f, 2.0f));
    const float HSpread = std::exp(-Horiz * Horiz * 0.55f);
    return Cut * VBand * HSpread * 1.15f;
}

std::array<float, 3> EvaluateLightArrivalCpu(const ClusteredLightEmitter& Light,
                                             std::array<float, 3>         Point,
                                             std::array<float, 3>&        OutToLight,
                                             float&                       OutDistance) noexcept
{
    const float Dx     = Light.Position[0] - Point[0];
    const float Dy     = Light.Position[1] - Point[1];
    const float Dz     = Light.Position[2] - Point[2];
    const float DistSq = Dx * Dx + Dy * Dy + Dz * Dz;
    const float RangeSq = Light.Radius * Light.Radius;
    if (DistSq >= RangeSq || DistSq < 1.0e-6f)
    {
        OutToLight  = {0.0f, 0.0f, 1.0f};
        OutDistance = Light.Radius;
        return {0.0f, 0.0f, 0.0f};
    }
    const float Dist = std::sqrt(DistSq);
    OutToLight       = {Dx / Dist, Dy / Dist, Dz / Dist};
    OutDistance      = Dist;
    const float Ratio = DistSq / RangeSq;
    const float Trim  = std::max(0.0f, 1.0f - Ratio * Ratio);
    const float Shape = EvaluateLightPhotometryCpu(Light, {-OutToLight[0], -OutToLight[1], -OutToLight[2]});
    const float Scale = (Trim * Trim) / (DistSq + 0.35f) * Shape;
    return {
        Light.Radiance[0] * Scale,
        Light.Radiance[1] * Scale,
        Light.Radiance[2] * Scale
    };
}

//------------------------------------------------------------------------------------------------------------------------
//                                              CLUSTERED LIGHTING SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

ClusteredLightingSequence::ClusteredLightingSequence()
    : StagingWords_(ClusterBufferWords, 0u)
{
    Lights_.reserve(ClusterCapacity);
}

void ClusteredLightingSequence::PushLight(const ClusteredLightEmitter& Light)
{
    if (ActiveCount_ >= ClusterCapacity)
    {
        return;
    }
    Lights_.push_back(Light);
    const uint32_t Base = ClusterHeaderWords + ActiveCount_ * ClusterLightStride;
    StagingWords_[Base + 0u]  = FloatToWord(Light.Position[0]);
    StagingWords_[Base + 1u]  = FloatToWord(Light.Position[1]);
    StagingWords_[Base + 2u]  = FloatToWord(Light.Position[2]);
    StagingWords_[Base + 3u]  = FloatToWord(Light.Radius);
    StagingWords_[Base + 4u]  = FloatToWord(Light.Radiance[0]);
    StagingWords_[Base + 5u]  = FloatToWord(Light.Radiance[1]);
    StagingWords_[Base + 6u]  = FloatToWord(Light.Radiance[2]);
    StagingWords_[Base + 7u]  = static_cast<uint32_t>(Light.Category);
    StagingWords_[Base + 8u]  = FloatToWord(Light.Direction[0]);
    StagingWords_[Base + 9u]  = FloatToWord(Light.Direction[1]);
    StagingWords_[Base + 10u] = FloatToWord(Light.Direction[2]);
    StagingWords_[Base + 11u] = FloatToWord(Light.Parameter);
    StagingWords_[Base + 12u] = FloatToWord(Light.Right[0]);
    StagingWords_[Base + 13u] = FloatToWord(Light.Right[1]);
    StagingWords_[Base + 14u] = FloatToWord(Light.Right[2]);
    StagingWords_[Base + 15u] = 0u;
    ++ActiveCount_;
}

void ClusteredLightingSequence::Update(const std::array<float, 16>&                 VehicleTransform,
                                       const std::vector<StreetPoleSpecification>&  Poles,
                                       const std::vector<PointLampSpecification>&   PointLamps,
                                       const TransientBurstLight*                   TransientLight)
{
    ActiveCount_ = 0u;
    Lights_.clear();
    std::fill(StagingWords_.begin(), StagingWords_.end(), 0u);

    const auto TransformPoint = [&](float X, float Y, float Z) noexcept -> std::array<float, 3>
    {
        return {
            VehicleTransform[0] * X + VehicleTransform[4] * Y + VehicleTransform[8]  * Z + VehicleTransform[12],
            VehicleTransform[1] * X + VehicleTransform[5] * Y + VehicleTransform[9]  * Z + VehicleTransform[13],
            VehicleTransform[2] * X + VehicleTransform[6] * Y + VehicleTransform[10] * Z + VehicleTransform[14]
        };
    };

    const auto TransformDirection = [&](float X, float Y, float Z) noexcept -> std::array<float, 3>
    {
        return NormalizeVector({
            VehicleTransform[0] * X + VehicleTransform[4] * Y + VehicleTransform[8]  * Z,
            VehicleTransform[1] * X + VehicleTransform[5] * Y + VehicleTransform[9]  * Z,
            VehicleTransform[2] * X + VehicleTransform[6] * Y + VehicleTransform[10] * Z
        });
    };

    const std::array<float, 3> CarRight = TransformDirection(0.0f, -1.0f, 0.0f);

    if (HeadlightMode != AutomotiveBeamMode::Off && HeadlightIntensity > 0.0f)
    {
        const float Scale = HeadlightIntensity;
        if (HeadlightMode == AutomotiveBeamMode::LowBeam)
        {
            const std::array<float, 3> AimL = TransformDirection(0.9990f, -0.015f, -0.042f);
            const std::array<float, 3> AimR = TransformDirection(0.9992f,  0.008f, -0.038f);
            const std::array<float, 3> Col  = {38.0f * Scale, 36.0f * Scale, 32.0f * Scale};
            PushLight({TransformPoint(2.18f,  0.68f, 0.68f), 42.0f, Col, LightCategory::LowBeam, AimL,  0.028f, CarRight});
            PushLight({TransformPoint(2.18f, -0.68f, 0.68f), 42.0f, Col, LightCategory::LowBeam, AimR, -0.008f, CarRight});
        }
        else if (HeadlightMode == AutomotiveBeamMode::HighBeam)
        {
            const std::array<float, 3> Aim = TransformDirection(0.9998f, 0.0f, -0.018f);
            const std::array<float, 3> Col = {72.0f * Scale, 70.0f * Scale, 66.0f * Scale};
            PushLight({TransformPoint(2.18f,  0.62f, 0.68f), 64.0f, Col, LightCategory::HighBeam, Aim, 0.0f, CarRight});
            PushLight({TransformPoint(2.18f, -0.62f, 0.68f), 64.0f, Col, LightCategory::HighBeam, Aim, 0.0f, CarRight});
        }
        else if (HeadlightMode == AutomotiveBeamMode::Fog)
        {
            const std::array<float, 3> Aim = TransformDirection(0.996f, 0.0f, -0.088f);
            const std::array<float, 3> Col = {28.0f * Scale, 23.0f * Scale, 14.0f * Scale};
            PushLight({TransformPoint(2.20f,  0.74f, 0.36f), 26.0f, Col, LightCategory::Fog, Aim, 0.0f, CarRight});
            PushLight({TransformPoint(2.20f, -0.74f, 0.36f), 26.0f, Col, LightCategory::Fog, Aim, 0.0f, CarRight});
        }

        if (RoofMounted)
        {
            const std::array<float, 3> RoofAim = TransformDirection(0.9985f, 0.0f, -0.055f);
            if (RoofCategory == RoofFixtureCategory::RallyPod)
            {
                const std::array<float, 3> PodCol    = {46.0f * Scale, 43.0f * Scale, 36.0f * Scale};
                constexpr std::array<float, 4> Offsets = {-0.42f, -0.14f, 0.14f, 0.42f};
                for (float Y : Offsets)
                {
                    PushLight({TransformPoint(0.22f, Y, 1.46f), 58.0f, PodCol, LightCategory::HighBeam, RoofAim, 0.0f, CarRight});
                }
            }
            else
            {
                const std::array<float, 3> BarCol = {54.0f * Scale, 54.0f * Scale, 56.0f * Scale};
                PushLight({TransformPoint(0.24f,  0.26f, 1.41f), 52.0f, BarCol, LightCategory::HighBeam, RoofAim, 0.0f, CarRight});
                PushLight({TransformPoint(0.24f, -0.26f, 1.41f), 52.0f, BarCol, LightCategory::HighBeam, RoofAim, 0.0f, CarRight});
            }
        }
    }

    if (TaillightsActive || Braking)
    {
        const float                TailStrength = Braking ? 7.5f : 1.6f;
        const float                TailRange    = Braking ? 9.5f : 5.0f;
        const std::array<float, 3> TailCol      = {TailStrength, TailStrength * 0.06f, TailStrength * 0.04f};
        const std::array<float, 3> RearAim      = TransformDirection(-1.0f, 0.0f, -0.15f);
        PushLight({TransformPoint(-2.22f,  0.64f, 0.78f), TailRange, TailCol, LightCategory::Omni, RearAim, 0.0f, CarRight});
        PushLight({TransformPoint(-2.22f, -0.64f, 0.78f), TailRange, TailCol, LightCategory::Omni, RearAim, 0.0f, CarRight});
    }

    if (TransientLight != nullptr && TransientLight->Active && TransientLight->Intensity > 0.01f)
    {
        const float S = TransientLight->Intensity;
        PushLight({
            TransientLight->Position,
            TransientLight->Radius,
            {TransientLight->Colour[0] * S, TransientLight->Colour[1] * S, TransientLight->Colour[2] * S},
            LightCategory::Omni,
            {0.0f, 0.0f, 1.0f},
            0.0f,
            {1.0f, 0.0f, 0.0f}
        });
    }

    if (StreetLampsEnabled && StreetLightScale > 0.0f)
    {
        for (const StreetPoleSpecification& Pole : Poles)
        {
            if (ActiveCount_ >= ClusterCapacity)
            {
                break;
            }
            const float                S   = Pole.Intensity * StreetLightScale;
            const std::array<float, 3> Col = {Pole.Colour[0] * S, Pole.Colour[1] * S, Pole.Colour[2] * S};
            if (Pole.Floodlight)
            {
                PushLight({
                    Pole.BulbPosition,
                    Pole.Radius,
                    Col,
                    LightCategory::Floodlight,
                    Pole.AimDirection,
                    Pole.CosineCutoff,
                    {1.0f, 0.0f, 0.0f}
                });
            }
            else
            {
                PushLight({
                    Pole.BulbPosition,
                    Pole.Radius,
                    Col,
                    LightCategory::StreetLamp,
                    {0.0f, 0.0f, -1.0f},
                    0.0f,
                    {1.0f, 0.0f, 0.0f}
                });
            }
        }
    }

    if (StreetLightScale > 0.0f)
    {
        for (const PointLampSpecification& Lamp : PointLamps)
        {
            if (ActiveCount_ >= ClusterCapacity)
            {
                break;
            }
            const float S = Lamp.Intensity * StreetLightScale;
            PushLight({
                Lamp.Position,
                Lamp.Radius,
                {Lamp.Colour[0] * S, Lamp.Colour[1] * S, Lamp.Colour[2] * S},
                LightCategory::Omni,
                {0.0f, 0.0f, -1.0f},
                0.0f,
                {1.0f, 0.0f, 0.0f}
            });
        }
    }

    const float SpanX     = GridMax[0] - GridMin[0];
    const float SpanY     = GridMax[1] - GridMin[1];
    const float SpanZ     = GridMax[2] - GridMin[2];
    const float InvCellX  = static_cast<float>(ClusterGridDimensions) / SpanX;
    const float InvCellY  = static_cast<float>(ClusterGridDimensions) / SpanY;
    const float InvCellZ  = static_cast<float>(ClusterGridLayers) / SpanZ;

    StagingWords_[0u] = FloatToWord(GridMin[0]);
    StagingWords_[1u] = FloatToWord(GridMin[1]);
    StagingWords_[2u] = FloatToWord(GridMin[2]);
    StagingWords_[3u] = ActiveCount_;
    StagingWords_[4u] = FloatToWord(InvCellX);
    StagingWords_[5u] = FloatToWord(InvCellY);
    StagingWords_[6u] = FloatToWord(InvCellZ);
    StagingWords_[7u] = ClusterGridDimensions;

    const uint32_t MaskOffset = ClusterHeaderWords + ClusterCapacity * ClusterLightStride;
    for (uint32_t LightIdx = 0u; LightIdx < ActiveCount_; ++LightIdx)
    {
        const ClusteredLightEmitter& Light  = Lights_[LightIdx];
        const LightWorldBounds       Bounds = ResolveLightWorldBounds(Light);
        const int32_t X0 = std::max(0, std::min(static_cast<int32_t>(ClusterGridDimensions) - 1, static_cast<int32_t>(std::floor((Bounds.Minimum[0] - GridMin[0]) * InvCellX))));
        const int32_t X1 = std::max(0, std::min(static_cast<int32_t>(ClusterGridDimensions) - 1, static_cast<int32_t>(std::floor((Bounds.Maximum[0] - GridMin[0]) * InvCellX))));
        const int32_t Y0 = std::max(0, std::min(static_cast<int32_t>(ClusterGridDimensions) - 1, static_cast<int32_t>(std::floor((Bounds.Minimum[1] - GridMin[1]) * InvCellY))));
        const int32_t Y1 = std::max(0, std::min(static_cast<int32_t>(ClusterGridDimensions) - 1, static_cast<int32_t>(std::floor((Bounds.Maximum[1] - GridMin[1]) * InvCellY))));
        const int32_t Z0 = std::max(0, std::min(static_cast<int32_t>(ClusterGridLayers) - 1,     static_cast<int32_t>(std::floor((Bounds.Minimum[2] - GridMin[2]) * InvCellZ))));
        const int32_t Z1 = std::max(0, std::min(static_cast<int32_t>(ClusterGridLayers) - 1,     static_cast<int32_t>(std::floor((Bounds.Maximum[2] - GridMin[2]) * InvCellZ))));

        const uint32_t WordSlot = (LightIdx >= 32u) ? 1u : 0u;
        const uint32_t Bit      = 1u << (LightIdx & 31u);

        for (int32_t Z = Z0; Z <= Z1; ++Z)
        {
            for (int32_t Y = Y0; Y <= Y1; ++Y)
            {
                for (int32_t X = X0; X <= X1; ++X)
                {
                    const uint32_t Cell = (static_cast<uint32_t>(Z) * ClusterGridDimensions + static_cast<uint32_t>(Y))
                                        * ClusterGridDimensions + static_cast<uint32_t>(X);
                    StagingWords_[MaskOffset + Cell * 2u + WordSlot] |= Bit;
                }
            }
        }
    }
}

int32_t ClusteredLightingSequence::QueryClusterCellIndexCpu(std::array<float, 3> WorldPosition) const noexcept
{
    const float InvCellX = static_cast<float>(ClusterGridDimensions) / (GridMax[0] - GridMin[0]);
    const float InvCellY = static_cast<float>(ClusterGridDimensions) / (GridMax[1] - GridMin[1]);
    const float InvCellZ = static_cast<float>(ClusterGridLayers)     / (GridMax[2] - GridMin[2]);

    const int32_t X = static_cast<int32_t>(std::floor((WorldPosition[0] - GridMin[0]) * InvCellX));
    const int32_t Y = static_cast<int32_t>(std::floor((WorldPosition[1] - GridMin[1]) * InvCellY));
    const int32_t Z = static_cast<int32_t>(std::floor((WorldPosition[2] - GridMin[2]) * InvCellZ));
    if (X < 0 || Y < 0 || Z < 0 ||
        X >= static_cast<int32_t>(ClusterGridDimensions) ||
        Y >= static_cast<int32_t>(ClusterGridDimensions) ||
        Z >= static_cast<int32_t>(ClusterGridLayers))
    {
        return -1;
    }
    return (Z * static_cast<int32_t>(ClusterGridDimensions) + Y) * static_cast<int32_t>(ClusterGridDimensions) + X;
}

std::array<uint32_t, 2> ClusteredLightingSequence::QueryCellMaskCpu(uint32_t CellIndex) const noexcept
{
    if (CellIndex >= ClusterCellCount)
    {
        return {0u, 0u};
    }
    const uint32_t MaskOffset = ClusterHeaderWords + ClusterCapacity * ClusterLightStride;
    return {
        StagingWords_[MaskOffset + CellIndex * 2u + 0u],
        StagingWords_[MaskOffset + CellIndex * 2u + 1u]
    };
}

} // namespace Frontier
