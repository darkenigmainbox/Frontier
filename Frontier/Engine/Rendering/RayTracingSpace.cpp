/*==========================================================================================================================================
                                                            RAY TRACING SPACE
                                     ------------------------------------------------------------------
                 Two-Level BVH acceleration structure (per-frame 8-bin SAH TLAS over active occupants +
                      12-bin SAH BLAS per facet set) and 77-entry course material specification for
                           the VehicleHMI ReSTIR GI path tracer and multi-bounce reflections.
==========================================================================================================================================*/

// 🧩 Two-Level BVH (TLAS + Binned-SAH BLAS), octahedral normal codec, and material records ported 1:1 from RayTracingSpace.js.

#include "RayTracingSpace.h"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstring>
#include <limits>

namespace Frontier
{

namespace
{

constexpr uint32_t BlasLeafCapacity = 4u;
constexpr uint32_t SahBinCount      = 12u;
constexpr uint32_t TlasBinCount     = 8u;

[[nodiscard]] inline uint32_t FloatToWord(float Value) noexcept
{
    uint32_t Bits = 0u;
    std::memcpy(&Bits, &Value, sizeof(uint32_t));
    return Bits;
}

[[nodiscard]] inline float WordToFloat(uint32_t Bits) noexcept
{
    float Value = 0.0f;
    std::memcpy(&Value, &Bits, sizeof(float));
    return Value;
}

[[nodiscard]] inline std::array<float, 3> NormalizeVector(std::array<float, 3> Vector) noexcept
{
    const float LengthSquared = Vector[0] * Vector[0] + Vector[1] * Vector[1] + Vector[2] * Vector[2];
    if (LengthSquared > 1.0e-18f)
    {
        const float InvLength = 1.0f / std::sqrt(LengthSquared);
        return {Vector[0] * InvLength, Vector[1] * InvLength, Vector[2] * InvLength};
    }
    return {0.0f, 0.0f, 1.0f};
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                                  COURSE MATERIAL PALETTE
//------------------------------------------------------------------------------------------------------------------------

SurfaceMaterialSpecification ConstructAutomotiveFlakePreset(std::array<float, 3> BinderAlbedo,
                                                            std::array<float, 3> FlakeTint,
                                                            std::array<float, 3> CoatAbsorption,
                                                            float                FlakeCoverage) noexcept
{
    MaterialScattering Authored{};
    Authored.Illumination.Configuration[0]          = 2u;
    Authored.Illumination.Strata[0].AlbedoRoughness = {BinderAlbedo[0], BinderAlbedo[1], BinderAlbedo[2], 0.18f};
    Authored.Illumination.Strata[0].Optics          = {0.35f, 1.52f, 1.0f, 0.0f};
    Authored.Illumination.Strata[0].Classification  = {0u, 0u, 0u, 0u};

    Authored.Illumination.Strata[1].AlbedoRoughness     = {1.0f, 1.0f, 1.0f, 0.025f};
    Authored.Illumination.Strata[1].Optics              = {0.0f, 1.52f, 1.0f, 0.0f};
    Authored.Illumination.Strata[1].AbsorptionThickness = {CoatAbsorption[0], CoatAbsorption[1], CoatAbsorption[2], 0.12f};
    Authored.Illumination.Strata[1].Classification      = {1u, 0u, 0u, 0u};

    Authored.Paint.Configuration = {1u, 3u, 2u, 1u};
    Authored.Paint.Distribution  = {FlakeCoverage, 420.0f, 1.0f, 0.65f};
    Authored.Paint.Finish        = {0.10f, 0.24f, 0.86f, 0.98f};
    Authored.Paint.Relief        = {0.22f, 0.50f, 0.14f, 24.0f};
    Authored.Paint.Palette[0]    = {FlakeTint[0], FlakeTint[1], FlakeTint[2], 0.0f};
    Authored.Paint.AverageTint   = {FlakeTint[0], FlakeTint[1], FlakeTint[2], 0.0f};

    return ConvertMaterialScatteringToRestir(Authored);
}

SurfaceMaterialSpecification ConvertMaterialScatteringToRestir(const MaterialScattering& Material) noexcept
{
    SurfaceMaterialSpecification Spec{};
    const uint32_t               StratumCount = std::clamp(Material.Illumination.Configuration[0], 1u, 8u);
    const ScatteringStratum&     Base         = Material.Illumination.Strata[0];

    Spec.Albedo        = {Base.AlbedoRoughness[0], Base.AlbedoRoughness[1], Base.AlbedoRoughness[2]};
    Spec.Roughness     = std::clamp(Base.AlbedoRoughness[3], 0.035f, 1.0f);
    Spec.Metalness     = std::clamp(Base.Optics[0], 0.0f, 1.0f);
    Spec.SpecularLevel = static_cast<float>(EvaluateDielectricReflectance(Base.Optics[1]))
                       * std::clamp(Material.DirectionalOptics[0][3] * 2.0f, 0.2f, 2.0f);

    if (Base.Sheen[3] > 0.0f)
    {
        Spec.SheenTint = {
            Base.Sheen[0] * Base.Sheen[3],
            Base.Sheen[1] * Base.Sheen[3],
            Base.Sheen[2] * Base.Sheen[3]
        };
        Spec.SheenRoughness = std::clamp(Base.SheenFinish[0] > 0.0f ? Base.SheenFinish[0] : 0.5f, 0.05f, 1.0f);
    }

    for (uint32_t Index = 1u; Index < StratumCount; ++Index)
    {
        const ScatteringStratum& Stratum  = Material.Illumination.Strata[Index];
        const float              Coverage = std::clamp(Stratum.Optics[2], 0.0f, 1.0f);
        if (Stratum.Classification[0] == static_cast<uint32_t>(ScatteringCategory::Coating))
        {
            Spec.CoatWeight       = std::max(Spec.CoatWeight, Coverage);
            Spec.CoatRoughness    = std::clamp(Stratum.AlbedoRoughness[3], 0.025f, 1.0f);
            Spec.Absorption       = {Stratum.AbsorptionThickness[0], Stratum.AbsorptionThickness[1], Stratum.AbsorptionThickness[2]};
            Spec.CoatingThickness = Stratum.AbsorptionThickness[3] * Coverage;
        }
        else
        {
            for (size_t C = 0u; C < 3u; ++C)
            {
                Spec.Albedo[C] = Spec.Albedo[C] * (1.0f - Coverage) + Stratum.AlbedoRoughness[C] * Coverage;
            }
            Spec.Roughness = Spec.Roughness * (1.0f - Coverage) + Stratum.AlbedoRoughness[3] * Coverage;
            Spec.Metalness = Spec.Metalness * (1.0f - Coverage) + Stratum.Optics[0] * Coverage;
        }
    }

    if (Material.Paint.Configuration[0] != 0u)
    {
        const float FlakeCov  = std::clamp(Material.Paint.Distribution[0], 0.0f, 1.0f);
        const auto& Tint      = (Material.Paint.AverageTint[0] + Material.Paint.AverageTint[1] + Material.Paint.AverageTint[2] > 0.0f)
                              ? Material.Paint.AverageTint
                              : Material.Paint.Palette[0];
        Spec.FlakeTint        = {Tint[0], Tint[1], Tint[2]};
        Spec.FlakeCoverage    = FlakeCov;
        Spec.CoatWeight       = std::max(Spec.CoatWeight, 1.0f);
        Spec.CoatRoughness    = std::min(Spec.CoatRoughness, 0.028f);
    }

    return Spec;
}

std::vector<SurfaceMaterialSpecification> ConstructDefaultMaterials()
{
    std::vector<SurfaceMaterialSpecification> Materials(static_cast<size_t>(CourseMaterial::Count));
    const auto Set = [&](CourseMaterial Family, SurfaceMaterialSpecification Spec)
    {
        Materials[static_cast<size_t>(Family)] = Spec;
    };

    Set(CourseMaterial::BodyCoat,       ConstructAutomotiveFlakePreset({0.58f, 0.012f, 0.018f}, {0.95f, 0.12f, 0.10f}, {0.08f, 1.40f, 1.80f}, 0.72f));
    Set(CourseMaterial::BodyCoatGreen,  ConstructAutomotiveFlakePreset({0.012f, 0.42f, 0.095f}, {0.14f, 0.88f, 0.30f}, {1.40f, 0.08f, 1.10f}, 0.72f));
    Set(CourseMaterial::BodyCoatYellow, ConstructAutomotiveFlakePreset({0.68f, 0.46f, 0.012f},  {0.98f, 0.78f, 0.10f}, {0.05f, 0.16f, 1.90f}, 0.72f));
    Set(CourseMaterial::BodyCoatBlue,   ConstructAutomotiveFlakePreset({0.014f, 0.10f, 0.58f},  {0.14f, 0.42f, 0.96f}, {1.80f, 0.75f, 0.06f}, 0.72f));
    Set(CourseMaterial::BodyCoatOrange, ConstructAutomotiveFlakePreset({0.68f, 0.14f, 0.010f},  {0.98f, 0.38f, 0.06f}, {0.06f, 0.90f, 2.00f}, 0.72f));
    Set(CourseMaterial::BodyTrim,         {{0.045f, 0.047f, 0.052f}, 0.36f, {0, 0, 0},     0.0f,  0.30f, 0.08f, 0.04f, 0.0f});
    Set(CourseMaterial::VehicleGlass,     {{0.040f, 0.055f, 0.065f}, 0.02f, {0, 0, 0},     0.0f,  1.0f,  0.015f,0.04f, 0.72f});
    Set(CourseMaterial::VehiclePlastic,   {{0.055f, 0.058f, 0.062f}, 0.48f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Tyre,             {{0.035f, 0.036f, 0.039f}, 0.76f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.03f, 0.0f});
    Set(CourseMaterial::RimCarbon,        {{0.105f, 0.108f, 0.116f}, 0.24f, {0, 0, 0},     0.32f, 0.85f, 0.04f, 0.05f, 0.0f});
    Set(CourseMaterial::Hub,              {{0.780f, 0.790f, 0.810f}, 0.18f, {0, 0, 0},     0.92f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Brake,            {{0.720f, 0.045f, 0.040f}, 0.28f, {0, 0, 0},     0.35f, 0.6f,  0.05f, 0.05f, 0.0f});
    Set(CourseMaterial::VehicleTrim,      {{0.065f, 0.070f, 0.078f}, 0.28f, {0, 0, 0},     0.45f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Headlight,        {{0.042f, 0.048f, 0.062f}, 0.04f, {0.0f,  0.0f,  0.0f},  0.25f, 0.85f, 0.02f, 0.05f, 0.0f});
    Set(CourseMaterial::Taillight,        {{0.240f, 0.015f, 0.015f}, 0.06f, {0.35f, 0.02f, 0.02f}, 0.0f,  0.85f, 0.02f, 0.05f, 0.0f});
    Set(CourseMaterial::VehicleDefault,   {{0.085f, 0.090f, 0.100f}, 0.38f, {0, 0, 0},     0.20f, 0.0f,  0.06f, 0.04f, 0.0f});

    Set(CourseMaterial::WallCrimson,      {{0.780f, 0.075f, 0.085f}, 0.68f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::WallViridian,     {{0.085f, 0.680f, 0.240f}, 0.68f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::WallChalk,        {{0.820f, 0.815f, 0.795f}, 0.72f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::WallCobalt,       {{0.095f, 0.240f, 0.760f}, 0.68f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::TunnelConcrete,   {{0.380f, 0.390f, 0.405f}, 0.78f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StressAmber,      {{0.860f, 0.480f, 0.065f}, 0.64f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StressTeal,       {{0.065f, 0.640f, 0.620f}, 0.64f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StressViolet,     {{0.480f, 0.140f, 0.760f}, 0.64f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StressIvory,      {{0.860f, 0.850f, 0.820f}, 0.70f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StressLamp,       {{1.000f, 0.940f, 0.820f}, 0.15f, {24, 21, 16},  0.0f,  0.0f,  0.06f, 0.04f, 0.0f});

    Set(CourseMaterial::Asphalt,          {{0.095f, 0.098f, 0.105f}, 0.82f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.035f,0.0f});
    Set(CourseMaterial::AsphaltPatch,     {{0.072f, 0.075f, 0.082f}, 0.74f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ApronConcrete,    {{0.480f, 0.475f, 0.455f}, 0.76f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::PaintWhite,       {{0.840f, 0.845f, 0.850f}, 0.52f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::PaintYellow,      {{0.880f, 0.680f, 0.080f}, 0.52f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::KerbRed,          {{0.780f, 0.110f, 0.090f}, 0.58f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::TyreRubber,       {{0.055f, 0.056f, 0.060f}, 0.84f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.03f, 0.0f});
    Set(CourseMaterial::Grass,            {{0.140f, 0.280f, 0.095f}, 0.88f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.025f,0.0f});
    Set(CourseMaterial::Gravel,           {{0.360f, 0.340f, 0.305f}, 0.86f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.03f, 0.0f});

    Set(CourseMaterial::Cladding,         {{0.620f, 0.640f, 0.670f}, 0.42f, {0, 0, 0},     0.45f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ContainerOrange,  {{0.820f, 0.280f, 0.065f}, 0.46f, {0, 0, 0},     0.15f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ContainerBlue,    {{0.090f, 0.280f, 0.640f}, 0.46f, {0, 0, 0},     0.15f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ContainerGreen,   {{0.110f, 0.460f, 0.210f}, 0.46f, {0, 0, 0},     0.15f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ContainerWhite,   {{0.820f, 0.830f, 0.840f}, 0.46f, {0, 0, 0},     0.10f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ContainerRed,     {{0.680f, 0.095f, 0.085f}, 0.46f, {0, 0, 0},     0.15f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::SteelDark,        {{0.180f, 0.195f, 0.215f}, 0.36f, {0, 0, 0},     0.78f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::LampWarm,         {{1.000f, 0.880f, 0.680f}, 0.12f, {18, 14, 9},   0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::LampCool,         {{0.880f, 0.940f, 1.000f}, 0.12f, {16, 18, 22},  0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::BarrierConcrete,  {{0.580f, 0.575f, 0.555f}, 0.78f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::SeatBlue,         {{0.120f, 0.320f, 0.680f}, 0.56f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});

    Set(CourseMaterial::Wood,             {{0.520f, 0.350f, 0.185f}, 0.68f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::WoodInterior,     {{0.640f, 0.460f, 0.260f}, 0.76f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Glass,            {{0.026f, 0.028f, 0.032f}, 0.025f,{0, 0, 0},     0.0f,  0.90f, 0.02f, 0.04f, 0.65f});
    Set(CourseMaterial::GlassEdge,        {{0.360f, 0.680f, 0.620f}, 0.14f, {0, 0, 0},     0.0f,  0.60f, 0.04f, 0.04f, 0.35f});
    Set(CourseMaterial::Concrete,         {{0.560f, 0.555f, 0.540f}, 0.78f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ConcreteInterior, {{0.480f, 0.475f, 0.460f}, 0.84f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Stone,            {{0.440f, 0.410f, 0.370f}, 0.74f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::StoneInterior,    {{0.380f, 0.355f, 0.320f}, 0.82f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Plastic,          {{0.160f, 0.480f, 0.780f}, 0.34f, {0, 0, 0},     0.0f,  0.35f, 0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::PlasticInterior,  {{0.140f, 0.420f, 0.680f}, 0.48f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::Tempered,         {{0.680f, 0.840f, 0.880f}, 0.06f, {0, 0, 0},     0.0f,  0.90f, 0.02f, 0.04f, 0.60f});
    Set(CourseMaterial::TemperedEdge,     {{0.320f, 0.640f, 0.580f}, 0.16f, {0, 0, 0},     0.0f,  0.50f, 0.04f, 0.04f, 0.30f});

    Set(CourseMaterial::PaintGreen,       {{0.120f, 0.640f, 0.240f}, 0.52f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::PaintBlue,        {{0.120f, 0.380f, 0.820f}, 0.52f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ConeOrange,       {{0.920f, 0.320f, 0.040f}, 0.44f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::ConeBand,         {{0.920f, 0.930f, 0.950f}, 0.28f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.06f, 0.0f});
    Set(CourseMaterial::ConeBase,         {{0.060f, 0.062f, 0.068f}, 0.78f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.03f, 0.0f});
    Set(CourseMaterial::DerezGlow,        {{0.120f, 0.860f, 1.000f}, 0.12f, {14, 22, 28},  0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::DerezHot,         {{1.000f, 0.420f, 0.080f}, 0.12f, {28, 12, 3},   0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::DerezGlitch,      {{0.950f, 0.150f, 0.850f}, 0.12f, {22, 4, 20},   0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::GateLamp,         {{0.200f, 0.920f, 0.980f}, 0.12f, {6, 18, 22},   0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::GateLampRed,      {{0.980f, 0.160f, 0.120f}, 0.12f, {22, 2.5f, 2}, 0.0f,  0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::SignBoard,        {{0.080f, 0.280f, 0.180f}, 0.42f, {0, 0, 0},     0.15f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::SignLetter,       {{0.920f, 0.940f, 0.960f}, 0.28f, {0.8f, 0.8f, 0.8f}, 0.0f, 0.0f, 0.06f, 0.05f, 0.0f});

    Set(CourseMaterial::CabinLeather,     {{0.068f, 0.065f, 0.064f}, 0.52f, {0, 0, 0},     0.0f,  0.12f, 0.18f, 0.038f,0.0f});
    Set(CourseMaterial::CabinTrim,        {{0.095f, 0.098f, 0.104f}, 0.34f, {0, 0, 0},     0.22f, 0.25f, 0.08f, 0.045f,0.0f});
    Set(CourseMaterial::CabinAccent,      {{0.740f, 0.755f, 0.780f}, 0.22f, {0, 0, 0},     0.88f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::SteeringWheel,    {{0.052f, 0.052f, 0.055f}, 0.56f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.035f,0.0f});
    Set(CourseMaterial::DisplayGlass,     {{0.025f, 0.032f, 0.042f}, 0.04f, {0.35f, 0.52f, 0.72f}, 0.0f, 0.85f, 0.02f, 0.04f, 0.0f});
    Set(CourseMaterial::TabletHousing,    {{0.120f, 0.125f, 0.135f}, 0.26f, {0, 0, 0},     0.65f, 0.0f,  0.06f, 0.04f, 0.0f});
    Set(CourseMaterial::MirrorGlass,      {{0.940f, 0.950f, 0.965f}, 0.02f, {0, 0, 0},     0.98f, 0.0f,  0.02f, 0.04f, 0.0f});
    Set(CourseMaterial::SeatFabric,       {{0.082f, 0.080f, 0.084f}, 0.82f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.025f,0.0f,
                                           {0, 0, 0}, 0.0f, {0.14f, 0.14f, 0.16f}, 0.45f});
    Set(CourseMaterial::CabinCarpet,      {{0.048f, 0.048f, 0.052f}, 0.90f, {0, 0, 0},     0.0f,  0.0f,  0.06f, 0.02f, 0.0f,
                                           {0, 0, 0}, 0.0f, {0.09f, 0.09f, 0.10f}, 0.62f});
    Set(CourseMaterial::MirrorTrim,       {{0.055f, 0.058f, 0.062f}, 0.38f, {0, 0, 0},     0.0f,  0.20f, 0.08f, 0.04f, 0.0f});
    Set(CourseMaterial::RimScrape,        {{0.820f, 0.830f, 0.850f}, 0.26f, {0, 0, 0},     0.92f, 0.0f,  0.06f, 0.04f, 0.0f});

    return Materials;
}

std::vector<float> EncodeMaterialRecords(const std::vector<SurfaceMaterialSpecification>& Materials)
{
    std::vector<float> Words(Materials.size() * 24u, 0.0f);
    for (size_t Index = 0; Index < Materials.size(); ++Index)
    {
        const SurfaceMaterialSpecification& Material = Materials[Index];
        const size_t                        Base     = Index * 24u;
        Words[Base + 0]  = Material.Albedo[0];
        Words[Base + 1]  = Material.Albedo[1];
        Words[Base + 2]  = Material.Albedo[2];
        Words[Base + 3]  = Material.Roughness;
        Words[Base + 4]  = Material.RadiantExitance[0];
        Words[Base + 5]  = Material.RadiantExitance[1];
        Words[Base + 6]  = Material.RadiantExitance[2];
        Words[Base + 7]  = Material.Metalness;
        Words[Base + 8]  = Material.CoatWeight;
        Words[Base + 9]  = Material.CoatRoughness;
        Words[Base + 10] = Material.SpecularLevel;
        Words[Base + 11] = Material.Transmission;
        Words[Base + 12] = Material.Absorption[0];
        Words[Base + 13] = Material.Absorption[1];
        Words[Base + 14] = Material.Absorption[2];
        Words[Base + 15] = Material.CoatingThickness;
        Words[Base + 16] = Material.SheenTint[0];
        Words[Base + 17] = Material.SheenTint[1];
        Words[Base + 18] = Material.SheenTint[2];
        Words[Base + 19] = Material.SheenRoughness;
        Words[Base + 20] = Material.FlakeTint[0];
        Words[Base + 21] = Material.FlakeTint[1];
        Words[Base + 22] = Material.FlakeTint[2];
        Words[Base + 23] = Material.FlakeCoverage;
    }
    return Words;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                 OCTAHEDRAL NORMAL CODEC
//------------------------------------------------------------------------------------------------------------------------

uint32_t PackOctahedralCpu(std::array<float, 3> Normal) noexcept
{
    float Nx = Normal[0];
    float Ny = Normal[1];
    float Nz = Normal[2];
    const float L1 = std::abs(Nx) + std::abs(Ny) + std::abs(Nz);
    if (L1 < 1.0e-9f)
    {
        return 0u;
    }
    float Ox = Nx / L1;
    float Oy = Ny / L1;
    if (Nz < 0.0f)
    {
        const float Tx = (1.0f - std::abs(Oy)) * (Ox >= 0.0f ? 1.0f : -1.0f);
        const float Ty = (1.0f - std::abs(Ox)) * (Oy >= 0.0f ? 1.0f : -1.0f);
        Ox = Tx;
        Oy = Ty;
    }
    const int32_t Qx = std::max(-32767, std::min(32767, static_cast<int32_t>(std::round(Ox * 32767.0f))));
    const int32_t Qy = std::max(-32767, std::min(32767, static_cast<int32_t>(std::round(Oy * 32767.0f))));
    return (static_cast<uint32_t>(Qx) & 0xFFFFu) | ((static_cast<uint32_t>(Qy) & 0xFFFFu) << 16u);
}

std::array<float, 3> UnpackOctahedralCpu(uint32_t Packed) noexcept
{
    int32_t Qx = static_cast<int32_t>(Packed & 0xFFFFu);
    int32_t Qy = static_cast<int32_t>((Packed >> 16u) & 0xFFFFu);
    if (Qx >= 32768)
    {
        Qx -= 65536;
    }
    if (Qy >= 32768)
    {
        Qy -= 65536;
    }
    float Ox = static_cast<float>(Qx) / 32767.0f;
    float Oy = static_cast<float>(Qy) / 32767.0f;
    const float Nz = 1.0f - std::abs(Ox) - std::abs(Oy);
    if (Nz < 0.0f)
    {
        const float Tx = (1.0f - std::abs(Oy)) * (Ox >= 0.0f ? 1.0f : -1.0f);
        const float Ty = (1.0f - std::abs(Ox)) * (Oy >= 0.0f ? 1.0f : -1.0f);
        Ox = Tx;
        Oy = Ty;
    }
    return NormalizeVector({Ox, Oy, Nz});
}

//------------------------------------------------------------------------------------------------------------------------
//                                               SCENE FACETS & OCCUPANTS
//------------------------------------------------------------------------------------------------------------------------

WorldAxisAlignedBounds SceneFacetCollection::QueryWorldBounds(uint32_t OccupantIndex) const noexcept
{
    const SceneOccupantInstance& Occupant = Occupants[OccupantIndex];
    const std::array<float, 3>&  Lo       = Occupant.LocalMinimum;
    const std::array<float, 3>&  Hi       = Occupant.LocalMaximum;
    const std::array<float, 16>& M        = Occupant.Transform;

    const float Cx = 0.5f * (Lo[0] + Hi[0]);
    const float Cy = 0.5f * (Lo[1] + Hi[1]);
    const float Cz = 0.5f * (Lo[2] + Hi[2]);
    const float Ex = 0.5f * (Hi[0] - Lo[0]);
    const float Ey = 0.5f * (Hi[1] - Lo[1]);
    const float Ez = 0.5f * (Hi[2] - Lo[2]);

    const float Wcx = M[0] * Cx + M[4] * Cy + M[8]  * Cz + M[12];
    const float Wcy = M[1] * Cx + M[5] * Cy + M[9]  * Cz + M[13];
    const float Wcz = M[2] * Cx + M[6] * Cy + M[10] * Cz + M[14];

    const float Wex = std::abs(M[0]) * Ex + std::abs(M[4]) * Ey + std::abs(M[8])  * Ez;
    const float Wey = std::abs(M[1]) * Ex + std::abs(M[5]) * Ey + std::abs(M[9])  * Ez;
    const float Wez = std::abs(M[2]) * Ex + std::abs(M[6]) * Ey + std::abs(M[10]) * Ez;

    return {
        {Wcx - Wex, Wcy - Wey, Wcz - Wez},
        {Wcx + Wex, Wcy + Wey, Wcz + Wez}
    };
}

void SceneFacetCollection::AssignOccupantTransform(uint32_t OccupantIndex, const std::array<float, 16>& Matrix) noexcept
{
    Occupants[OccupantIndex].PreviousTransform = Occupants[OccupantIndex].Transform;
    Occupants[OccupantIndex].Transform         = Matrix;
}

std::array<float, 16> ConstructRigidTransform(std::array<float, 3> Translation,
                                              std::array<float, 4> QuaternionXyzw) noexcept
{
    const float X = QuaternionXyzw[0];
    const float Y = QuaternionXyzw[1];
    const float Z = QuaternionXyzw[2];
    const float W = QuaternionXyzw[3];

    const float X2 = X + X;
    const float Y2 = Y + Y;
    const float Z2 = Z + Z;
    const float Xx = X * X2;
    const float Xy = X * Y2;
    const float Xz = X * Z2;
    const float Yy = Y * Y2;
    const float Yz = Y * Z2;
    const float Zz = Z * Z2;
    const float Wx = W * X2;
    const float Wy = W * Y2;
    const float Wz = W * Z2;

    return {
        1.0f - (Yy + Zz), Xy + Wz,          Xz - Wy,          0.0f,
        Xy - Wz,          1.0f - (Xx + Zz), Yz + Wx,          0.0f,
        Xz + Wy,          Yz - Wx,          1.0f - (Xx + Yy), 0.0f,
        Translation[0],   Translation[1],   Translation[2],   1.0f
    };
}

std::array<float, 16> InvertRigidOrAffineTransform(const std::array<float, 16>& Matrix) noexcept
{
    const float A00 = Matrix[0], A01 = Matrix[4], A02 = Matrix[8];
    const float A10 = Matrix[1], A11 = Matrix[5], A12 = Matrix[9];
    const float A20 = Matrix[2], A21 = Matrix[6], A22 = Matrix[10];

    const float B01 =  A22 * A11 - A12 * A21;
    const float B11 = -A22 * A10 + A12 * A20;
    const float B21 =  A21 * A10 - A11 * A20;
    const float Det =  A00 * B01 + A01 * B11 + A02 * B21;
    const float Inv = std::abs(Det) > 1.0e-12f ? 1.0f / Det : 1.0f;

    const float I00 = B01 * Inv;
    const float I01 = (-A22 * A01 + A02 * A21) * Inv;
    const float I02 = ( A12 * A01 - A02 * A11) * Inv;
    const float I10 = B11 * Inv;
    const float I11 = ( A22 * A00 - A02 * A20) * Inv;
    const float I12 = (-A12 * A00 + A02 * A10) * Inv;
    const float I20 = B21 * Inv;
    const float I21 = (-A21 * A00 + A01 * A20) * Inv;
    const float I22 = ( A11 * A00 - A01 * A10) * Inv;

    const float Tx = Matrix[12];
    const float Ty = Matrix[13];
    const float Tz = Matrix[14];

    return {
        I00, I10, I20, 0.0f,
        I01, I11, I21, 0.0f,
        I02, I12, I22, 0.0f,
        -(I00 * Tx + I01 * Ty + I02 * Tz),
        -(I10 * Tx + I11 * Ty + I12 * Tz),
        -(I20 * Tx + I21 * Ty + I22 * Tz),
        1.0f
    };
}

//------------------------------------------------------------------------------------------------------------------------
//                                               BINNED-SAH BLAS BUILDER
//------------------------------------------------------------------------------------------------------------------------

BlasBuildResult ConstructFacetBlas(const std::vector<TriangleFacetRecord>& Facets,
                                   uint32_t                                GlobalCellOffset,
                                   uint32_t                                GlobalTriangleOffset)
{
    const uint32_t Count = static_cast<uint32_t>(Facets.size());
    if (Count == 0u)
    {
        return {GlobalCellOffset, 0u, 0u, {}, {}};
    }

    std::vector<float>    MinX(Count), MinY(Count), MinZ(Count);
    std::vector<float>    MaxX(Count), MaxY(Count), MaxZ(Count);
    std::vector<float>    CentX(Count), CentY(Count), CentZ(Count);
    std::vector<uint32_t> Order(Count);

    for (uint32_t Index = 0u; Index < Count; ++Index)
    {
        const auto& C = Facets[Index].Corners;
        const auto& A = C[0];
        const auto& B = C[1];
        const auto& D = C[2];
        MinX[Index]  = std::min({A[0], B[0], D[0]});
        MinY[Index]  = std::min({A[1], B[1], D[1]});
        MinZ[Index]  = std::min({A[2], B[2], D[2]});
        MaxX[Index]  = std::max({A[0], B[0], D[0]});
        MaxY[Index]  = std::max({A[1], B[1], D[1]});
        MaxZ[Index]  = std::max({A[2], B[2], D[2]});
        CentX[Index] = (A[0] + B[0] + D[0]) * (1.0f / 3.0f);
        CentY[Index] = (A[1] + B[1] + D[1]) * (1.0f / 3.0f);
        CentZ[Index] = (A[2] + B[2] + D[2]) * (1.0f / 3.0f);
        Order[Index] = Index;
    }

    const uint32_t        MaxCells = std::max(2u, 2u * Count);
    std::vector<uint32_t> CellWords(MaxCells * 8u, 0u);
    uint32_t              CellCount = 1u;

    const auto Subdivide = [&](auto& Self, uint32_t CellIndex, uint32_t First, uint32_t Span) -> void
    {
        constexpr float Inf = std::numeric_limits<float>::infinity();
        float BMinX =  Inf, BMinY =  Inf, BMinZ =  Inf;
        float BMaxX = -Inf, BMaxY = -Inf, BMaxZ = -Inf;
        float CMinX =  Inf, CMinY =  Inf, CMinZ =  Inf;
        float CMaxX = -Inf, CMaxY = -Inf, CMaxZ = -Inf;

        for (uint32_t I = First; I < First + Span; ++I)
        {
            const uint32_t K = Order[I];
            BMinX = std::min(BMinX, MinX[K]);
            BMinY = std::min(BMinY, MinY[K]);
            BMinZ = std::min(BMinZ, MinZ[K]);
            BMaxX = std::max(BMaxX, MaxX[K]);
            BMaxY = std::max(BMaxY, MaxY[K]);
            BMaxZ = std::max(BMaxZ, MaxZ[K]);
            CMinX = std::min(CMinX, CentX[K]);
            CMinY = std::min(CMinY, CentY[K]);
            CMinZ = std::min(CMinZ, CentZ[K]);
            CMaxX = std::max(CMaxX, CentX[K]);
            CMaxY = std::max(CMaxY, CentY[K]);
            CMaxZ = std::max(CMaxZ, CentZ[K]);
        }

        const uint32_t Base = CellIndex * 8u;
        CellWords[Base + 0u] = FloatToWord(BMinX);
        CellWords[Base + 1u] = FloatToWord(BMinY);
        CellWords[Base + 2u] = FloatToWord(BMinZ);
        CellWords[Base + 4u] = FloatToWord(BMaxX);
        CellWords[Base + 5u] = FloatToWord(BMaxY);
        CellWords[Base + 6u] = FloatToWord(BMaxZ);

        if (Span <= BlasLeafCapacity)
        {
            CellWords[Base + 3u] = GlobalTriangleOffset + First;
            CellWords[Base + 7u] = Span;
            return;
        }

        const float ExtX = CMaxX - CMinX;
        const float ExtY = CMaxY - CMinY;
        const float ExtZ = CMaxZ - CMinZ;

        const std::vector<float>* CentArr = &CentX;
        float                     Low     = CMinX;
        float                     High    = CMaxX;
        if (ExtY >= ExtX && ExtY >= ExtZ)
        {
            CentArr = &CentY;
            Low     = CMinY;
            High    = CMaxY;
        }
        else if (ExtZ >= ExtX && ExtZ >= ExtY)
        {
            CentArr = &CentZ;
            Low     = CMinZ;
            High    = CMaxZ;
        }

        uint32_t Middle = First + (Span >> 1u);
        if (High - Low > 1.0e-5f)
        {
            std::array<uint32_t, SahBinCount> BinCounts{};
            std::array<float, SahBinCount>    BinMinX, BinMinY, BinMinZ;
            std::array<float, SahBinCount>    BinMaxX, BinMaxY, BinMaxZ;
            BinMinX.fill(Inf);
            BinMinY.fill(Inf);
            BinMinZ.fill(Inf);
            BinMaxX.fill(-Inf);
            BinMaxY.fill(-Inf);
            BinMaxZ.fill(-Inf);

            const float Scale = static_cast<float>(SahBinCount) / (High - Low);
            for (uint32_t I = First; I < First + Span; ++I)
            {
                const uint32_t K = Order[I];
                const int32_t  RawBin = static_cast<int32_t>(std::floor(((*CentArr)[K] - Low) * Scale));
                const uint32_t B      = static_cast<uint32_t>(std::max(0, std::min(static_cast<int32_t>(SahBinCount) - 1, RawBin)));
                BinCounts[B]++;
                BinMinX[B] = std::min(BinMinX[B], MinX[K]);
                BinMinY[B] = std::min(BinMinY[B], MinY[K]);
                BinMinZ[B] = std::min(BinMinZ[B], MinZ[K]);
                BinMaxX[B] = std::max(BinMaxX[B], MaxX[K]);
                BinMaxY[B] = std::max(BinMaxY[B], MaxY[K]);
                BinMaxZ[B] = std::max(BinMaxZ[B], MaxZ[K]);
            }

            float BestCost  = Inf;
            float BestSplit = 0.5f * (Low + High);
            for (uint32_t Split = 1u; Split < SahBinCount; ++Split)
            {
                uint32_t LC = 0u, RC = 0u;
                float LMinX = Inf, LMinY = Inf, LMinZ = Inf, LMaxX = -Inf, LMaxY = -Inf, LMaxZ = -Inf;
                float RMinX = Inf, RMinY = Inf, RMinZ = Inf, RMaxX = -Inf, RMaxY = -Inf, RMaxZ = -Inf;
                for (uint32_t B = 0u; B < SahBinCount; ++B)
                {
                    if (BinCounts[B] == 0u)
                    {
                        continue;
                    }
                    if (B < Split)
                    {
                        LC += BinCounts[B];
                        LMinX = std::min(LMinX, BinMinX[B]);
                        LMinY = std::min(LMinY, BinMinY[B]);
                        LMinZ = std::min(LMinZ, BinMinZ[B]);
                        LMaxX = std::max(LMaxX, BinMaxX[B]);
                        LMaxY = std::max(LMaxY, BinMaxY[B]);
                        LMaxZ = std::max(LMaxZ, BinMaxZ[B]);
                    }
                    else
                    {
                        RC += BinCounts[B];
                        RMinX = std::min(RMinX, BinMinX[B]);
                        RMinY = std::min(RMinY, BinMinY[B]);
                        RMinZ = std::min(RMinZ, BinMinZ[B]);
                        RMaxX = std::max(RMaxX, BinMaxX[B]);
                        RMaxY = std::max(RMaxY, BinMaxY[B]);
                        RMaxZ = std::max(RMaxZ, BinMaxZ[B]);
                    }
                }
                if (LC == 0u || RC == 0u)
                {
                    continue;
                }
                const float Lx   = std::max(0.0f, LMaxX - LMinX);
                const float Ly   = std::max(0.0f, LMaxY - LMinY);
                const float Lz   = std::max(0.0f, LMaxZ - LMinZ);
                const float Rx   = std::max(0.0f, RMaxX - RMinX);
                const float Ry   = std::max(0.0f, RMaxY - RMinY);
                const float Rz   = std::max(0.0f, RMaxZ - RMinZ);
                const float Cost = (Lx * Ly + Ly * Lz + Lz * Lx) * static_cast<float>(LC)
                                 + (Rx * Ry + Ry * Rz + Rz * Rx) * static_cast<float>(RC);
                if (Cost < BestCost)
                {
                    BestCost  = Cost;
                    BestSplit = Low + static_cast<float>(Split) / Scale;
                }
            }

            int32_t Cursor = static_cast<int32_t>(First);
            int32_t Tail   = static_cast<int32_t>(First + Span) - 1;
            while (Cursor <= Tail)
            {
                if ((*CentArr)[Order[static_cast<size_t>(Cursor)]] < BestSplit)
                {
                    ++Cursor;
                }
                else
                {
                    std::swap(Order[static_cast<size_t>(Cursor)], Order[static_cast<size_t>(Tail)]);
                    --Tail;
                }
            }
            if (Cursor > static_cast<int32_t>(First) && Cursor < static_cast<int32_t>(First + Span))
            {
                Middle = static_cast<uint32_t>(Cursor);
            }
        }

        const uint32_t LeftLocal  = CellCount;
        const uint32_t RightLocal = CellCount + 1u;
        CellCount += 2u;

        CellWords[Base + 3u] = GlobalCellOffset + LeftLocal;
        CellWords[Base + 7u] = 0u;

        Self(Self, LeftLocal, First, Middle - First);
        Self(Self, RightLocal, Middle, First + Span - Middle);
    };

    Subdivide(Subdivide, 0u, 0u, Count);

    std::vector<uint32_t> TriangleWords(Count * 16u, 0u);
    for (uint32_t I = 0u; I < Count; ++I)
    {
        const TriangleFacetRecord& F   = Facets[Order[I]];
        const auto&                A   = F.Corners[0];
        const auto&                B   = F.Corners[1];
        const auto&                D   = F.Corners[2];
        const float                E1x = B[0] - A[0], E1y = B[1] - A[1], E1z = B[2] - A[2];
        const float                E2x = D[0] - A[0], E2y = D[1] - A[1], E2z = D[2] - A[2];
        const std::array<float, 3> Ng  = NormalizeVector({
            E1y * E2z - E1z * E2y,
            E1z * E2x - E1x * E2z,
            E1x * E2y - E1y * E2x
        });

        const std::array<float, 3> NA = F.HasCornerNormals ? F.Normals[0] : Ng;
        const std::array<float, 3> NB = F.HasCornerNormals ? F.Normals[1] : Ng;
        const std::array<float, 3> NC = F.HasCornerNormals ? F.Normals[2] : Ng;

        const uint32_t Base = I * 16u;
        TriangleWords[Base + 0u]  = FloatToWord(A[0]);
        TriangleWords[Base + 1u]  = FloatToWord(A[1]);
        TriangleWords[Base + 2u]  = FloatToWord(A[2]);
        TriangleWords[Base + 3u]  = static_cast<uint32_t>(F.Family);
        TriangleWords[Base + 4u]  = FloatToWord(E1x);
        TriangleWords[Base + 5u]  = FloatToWord(E1y);
        TriangleWords[Base + 6u]  = FloatToWord(E1z);
        TriangleWords[Base + 7u]  = PackOctahedralCpu(NA);
        TriangleWords[Base + 8u]  = FloatToWord(E2x);
        TriangleWords[Base + 9u]  = FloatToWord(E2y);
        TriangleWords[Base + 10u] = FloatToWord(E2z);
        TriangleWords[Base + 11u] = PackOctahedralCpu(NB);
        TriangleWords[Base + 12u] = FloatToWord(Ng[0]);
        TriangleWords[Base + 13u] = FloatToWord(Ng[1]);
        TriangleWords[Base + 14u] = FloatToWord(Ng[2]);
        TriangleWords[Base + 15u] = PackOctahedralCpu(NC);
    }

    CellWords.resize(CellCount * 8u);
    return {GlobalCellOffset, CellCount, Count, std::move(CellWords), std::move(TriangleWords)};
}

//------------------------------------------------------------------------------------------------------------------------
//                                               TWO-LEVEL BVH RAY TRACING SPACE
//------------------------------------------------------------------------------------------------------------------------

void RayTracingSpace::ConstructResources(SceneFacetCollection& Scene)
{
    uint32_t GlobalCellOffset = TlasCellCapacity;
    uint32_t GlobalTriOffset  = 0u;

    std::vector<BlasBuildResult> BlasList;
    BlasList.reserve(Scene.FacetSets.size());
    FacetBlasRoots_.assign(Scene.FacetSets.size(), -1);

    for (size_t Index = 0u; Index < Scene.FacetSets.size(); ++Index)
    {
        FacetSetRecord& FacetSet = Scene.FacetSets[Index];
        if (FacetSet.Facets.empty())
        {
            FacetSet.BlasRoot = -1;
            continue;
        }
        BlasBuildResult Blas = ConstructFacetBlas(FacetSet.Facets, GlobalCellOffset, GlobalTriOffset);
        FacetSet.BlasRoot       = static_cast<int32_t>(Blas.RootCell);
        FacetBlasRoots_[Index]  = static_cast<int32_t>(Blas.RootCell);
        GlobalCellOffset       += Blas.CellCount;
        GlobalTriOffset        += Blas.TriangleCount;
        BlasList.push_back(std::move(Blas));
    }

    OccupantBlasRoot_.assign(Scene.Occupants.size(), -1);
    for (size_t Index = 0u; Index < Scene.Occupants.size(); ++Index)
    {
        const SceneOccupantInstance& Occupant = Scene.Occupants[Index];
        OccupantBlasRoot_[Index] = (Occupant.FacetSet < FacetBlasRoots_.size())
                                 ? FacetBlasRoots_[Occupant.FacetSet]
                                 : -1;
    }

    StaticCellCount_   = GlobalCellOffset;
    StaticTriCount_    = GlobalTriOffset;
    DynamicCellOffset_ = StaticCellCount_;
    DynamicTriOffset_  = StaticTriCount_;
    TotalCellCapacity_ = StaticCellCount_ + DynamicBlasCellCapacity;
    TotalTriCapacity_  = StaticTriCount_ + DynamicTriangleCapacity;

    AllCellWords_.assign(TotalCellCapacity_ * 8u, 0u);
    AllTriangleWords_.assign(TotalTriCapacity_ * 16u, 0u);

    for (const BlasBuildResult& Blas : BlasList)
    {
        std::copy(Blas.CellWords.begin(),
                  Blas.CellWords.end(),
                  AllCellWords_.begin() + static_cast<ptrdiff_t>(Blas.RootCell * 8u));
    }

    uint32_t TriCursor = 0u;
    for (const BlasBuildResult& Blas : BlasList)
    {
        std::copy(Blas.TriangleWords.begin(),
                  Blas.TriangleWords.end(),
                  AllTriangleWords_.begin() + static_cast<ptrdiff_t>(TriCursor * 16u));
        TriCursor += Blas.TriangleCount;
    }

    TotalTriangles_ = StaticTriCount_;
    UpdateTlas(Scene, nullptr);
}

void RayTracingSpace::RegisterPropFragments(uint32_t                                  BreakableIndex,
                                            uint32_t                                  PieceFirst,
                                            uint32_t                                  Capacity,
                                            const std::vector<FracturePieceGeometry>& WrittenFragments)
{
    uint32_t CellCursor = DynamicCellOffset_ + BreakableIndex * 36u;
    uint32_t TriCursor  = DynamicTriOffset_  + BreakableIndex * 576u;

    for (uint32_t Slot = 0u; Slot < Capacity; ++Slot)
    {
        const uint32_t OccupantIndex = PieceFirst + Slot;
        if (OccupantIndex >= OccupantBlasRoot_.size())
        {
            break;
        }
        if (Slot >= WrittenFragments.size() || WrittenFragments[Slot].Triangles.empty())
        {
            OccupantBlasRoot_[OccupantIndex] = -1;
            continue;
        }
        const FracturePieceGeometry& Fragment = WrittenFragments[Slot];
        if (CellCursor + 2u * static_cast<uint32_t>(Fragment.Triangles.size()) > TotalCellCapacity_ ||
            TriCursor + static_cast<uint32_t>(Fragment.Triangles.size()) > TotalTriCapacity_)
        {
            OccupantBlasRoot_[OccupantIndex] = -1;
            continue;
        }

        const BlasBuildResult Blas = ConstructFacetBlas(Fragment.Triangles, CellCursor, TriCursor);
        std::copy(Blas.CellWords.begin(),
                  Blas.CellWords.end(),
                  AllCellWords_.begin() + static_cast<ptrdiff_t>(CellCursor * 8u));
        std::copy(Blas.TriangleWords.begin(),
                  Blas.TriangleWords.end(),
                  AllTriangleWords_.begin() + static_cast<ptrdiff_t>(TriCursor * 16u));

        OccupantBlasRoot_[OccupantIndex] = static_cast<int32_t>(Blas.RootCell);
        CellCursor                      += Blas.CellCount;
        TriCursor                       += Blas.TriangleCount;
    }
}

void RayTracingSpace::ClearPropFragments(uint32_t PieceFirst, uint32_t Capacity) noexcept
{
    for (uint32_t Slot = 0u; Slot < Capacity; ++Slot)
    {
        const uint32_t OccupantIndex = PieceFirst + Slot;
        if (OccupantIndex < OccupantBlasRoot_.size())
        {
            OccupantBlasRoot_[OccupantIndex] = -1;
        }
    }
}

void RayTracingSpace::UpdateTlas(SceneFacetCollection& Scene, const std::array<bool, 4>* ShreddedWheels)
{
    if (AllCellWords_.empty())
    {
        return;
    }

    if (ShreddedWheels != nullptr)
    {
        for (size_t W = 0u; W < 4u; ++W)
        {
            const uint32_t WheelIndex = Scene.WheelOccupants[W];
            if (WheelIndex < Scene.Occupants.size())
            {
                if ((*ShreddedWheels)[W])
                {
                    Scene.Occupants[WheelIndex].Assignments |= OccupantAssignmentShredded;
                }
                else
                {
                    Scene.Occupants[WheelIndex].Assignments &= ~OccupantAssignmentShredded;
                }
            }
        }
    }

    const int32_t GroundIndex = Scene.GroundOccupant;
    bool          HasGround   = false;

    std::vector<uint32_t> ActiveIndices;
    std::vector<float>    MinX, MinY, MinZ, MaxX, MaxY, MaxZ, CentX, CentY, CentZ;
    ActiveIndices.reserve(Scene.Occupants.size());

    for (uint32_t Index = 0u; Index < static_cast<uint32_t>(Scene.Occupants.size()); ++Index)
    {
        const SceneOccupantInstance& Occupant = Scene.Occupants[Index];
        if ((Occupant.Assignments & OccupantAssignmentRaster) == 0u || Occupant.Inactive)
        {
            continue;
        }
        const int32_t BlasRoot = (Index < OccupantBlasRoot_.size()) ? OccupantBlasRoot_[Index] : -1;
        if (BlasRoot < 0)
        {
            continue;
        }
        if (static_cast<int32_t>(Index) == GroundIndex)
        {
            HasGround = true;
            continue;
        }

        const WorldAxisAlignedBounds Bounds = Scene.QueryWorldBounds(Index);
        ActiveIndices.push_back(Index);
        MinX.push_back(Bounds.Minimum[0]);
        MinY.push_back(Bounds.Minimum[1]);
        MinZ.push_back(Bounds.Minimum[2]);
        MaxX.push_back(Bounds.Maximum[0]);
        MaxY.push_back(Bounds.Maximum[1]);
        MaxZ.push_back(Bounds.Maximum[2]);
        CentX.push_back(0.5f * (Bounds.Minimum[0] + Bounds.Maximum[0]));
        CentY.push_back(0.5f * (Bounds.Minimum[1] + Bounds.Maximum[1]));
        CentZ.push_back(0.5f * (Bounds.Minimum[2] + Bounds.Maximum[2]));
    }

    const uint32_t ObjectCount = static_cast<uint32_t>(ActiveIndices.size());
    ActiveInstances_ = ObjectCount + (HasGround ? 1u : 0u);

    if (ActiveInstances_ == 0u)
    {
        AllCellWords_[0u] = FloatToWord(0.0f);
        AllCellWords_[1u] = FloatToWord(0.0f);
        AllCellWords_[2u] = FloatToWord(0.0f);
        AllCellWords_[3u] = EmptyTlasSentinel;
        AllCellWords_[4u] = FloatToWord(0.0f);
        AllCellWords_[5u] = FloatToWord(0.0f);
        AllCellWords_[6u] = FloatToWord(0.0f);
        AllCellWords_[7u] = 0u;
        UsedTlasCells_    = 1u;
        return;
    }

    if (HasGround && ObjectCount == 0u)
    {
        const uint32_t               GIndex  = static_cast<uint32_t>(GroundIndex);
        const WorldAxisAlignedBounds GBounds = Scene.QueryWorldBounds(GIndex);
        AllCellWords_[0u] = FloatToWord(GBounds.Minimum[0]);
        AllCellWords_[1u] = FloatToWord(GBounds.Minimum[1]);
        AllCellWords_[2u] = FloatToWord(GBounds.Minimum[2]);
        AllCellWords_[3u] = static_cast<uint32_t>(OccupantBlasRoot_[GIndex]);
        AllCellWords_[4u] = FloatToWord(GBounds.Maximum[0]);
        AllCellWords_[5u] = FloatToWord(GBounds.Maximum[1]);
        AllCellWords_[6u] = FloatToWord(GBounds.Maximum[2]);
        AllCellWords_[7u] = TlasLeafBit | GIndex;
        UsedTlasCells_    = 1u;
        return;
    }

    std::vector<uint32_t> Order(ObjectCount);
    for (uint32_t I = 0u; I < ObjectCount; ++I)
    {
        Order[I] = I;
    }

    uint32_t       NextCell        = HasGround ? 3u : 1u;
    const uint32_t ObjectsRootCell = HasGround ? 2u : 0u;

    if (HasGround)
    {
        const uint32_t               GIndex  = static_cast<uint32_t>(GroundIndex);
        const WorldAxisAlignedBounds GBounds = Scene.QueryWorldBounds(GIndex);
        const uint32_t               GBase   = 1u * 8u;
        AllCellWords_[GBase + 0u] = FloatToWord(GBounds.Minimum[0]);
        AllCellWords_[GBase + 1u] = FloatToWord(GBounds.Minimum[1]);
        AllCellWords_[GBase + 2u] = FloatToWord(GBounds.Minimum[2]);
        AllCellWords_[GBase + 3u] = static_cast<uint32_t>(OccupantBlasRoot_[GIndex]);
        AllCellWords_[GBase + 4u] = FloatToWord(GBounds.Maximum[0]);
        AllCellWords_[GBase + 5u] = FloatToWord(GBounds.Maximum[1]);
        AllCellWords_[GBase + 6u] = FloatToWord(GBounds.Maximum[2]);
        AllCellWords_[GBase + 7u] = TlasLeafBit | GIndex;
    }

    const auto SubdivideObjects = [&](auto& Self, uint32_t CellIndex, uint32_t First, uint32_t Span) -> void
    {
        constexpr float Inf = std::numeric_limits<float>::infinity();
        float BMinX =  Inf, BMinY =  Inf, BMinZ =  Inf;
        float BMaxX = -Inf, BMaxY = -Inf, BMaxZ = -Inf;
        float CMinX =  Inf, CMinY =  Inf, CMinZ =  Inf;
        float CMaxX = -Inf, CMaxY = -Inf, CMaxZ = -Inf;

        for (uint32_t I = First; I < First + Span; ++I)
        {
            const uint32_t K = Order[I];
            BMinX = std::min(BMinX, MinX[K]);
            BMinY = std::min(BMinY, MinY[K]);
            BMinZ = std::min(BMinZ, MinZ[K]);
            BMaxX = std::max(BMaxX, MaxX[K]);
            BMaxY = std::max(BMaxY, MaxY[K]);
            BMaxZ = std::max(BMaxZ, MaxZ[K]);
            CMinX = std::min(CMinX, CentX[K]);
            CMinY = std::min(CMinY, CentY[K]);
            CMinZ = std::min(CMinZ, CentZ[K]);
            CMaxX = std::max(CMaxX, CentX[K]);
            CMaxY = std::max(CMaxY, CentY[K]);
            CMaxZ = std::max(CMaxZ, CentZ[K]);
        }

        const uint32_t Base = CellIndex * 8u;
        AllCellWords_[Base + 0u] = FloatToWord(BMinX);
        AllCellWords_[Base + 1u] = FloatToWord(BMinY);
        AllCellWords_[Base + 2u] = FloatToWord(BMinZ);
        AllCellWords_[Base + 4u] = FloatToWord(BMaxX);
        AllCellWords_[Base + 5u] = FloatToWord(BMaxY);
        AllCellWords_[Base + 6u] = FloatToWord(BMaxZ);

        if (Span == 1u || NextCell + 2u > TlasCellCapacity)
        {
            const uint32_t OccupantIndex = ActiveIndices[Order[First]];
            AllCellWords_[Base + 3u]     = static_cast<uint32_t>(OccupantBlasRoot_[OccupantIndex]);
            AllCellWords_[Base + 7u]     = TlasLeafBit | OccupantIndex;
            return;
        }

        const float SpanX = CMaxX - CMinX;
        const float SpanY = CMaxY - CMinY;
        const float SpanZ = CMaxZ - CMinZ;

        const std::vector<float>* CentArr = &CentX;
        float                     Low     = CMinX;
        float                     High    = CMaxX;
        if (SpanY >= SpanX && SpanY >= SpanZ)
        {
            CentArr = &CentY;
            Low     = CMinY;
            High    = CMaxY;
        }
        else if (SpanZ >= SpanX && SpanZ >= SpanY)
        {
            CentArr = &CentZ;
            Low     = CMinZ;
            High    = CMaxZ;
        }

        uint32_t Middle = First + (Span >> 1u);
        if (High - Low > 1.0e-5f && Span >= 4u)
        {
            std::array<uint32_t, TlasBinCount> BinCounts{};
            std::array<float, TlasBinCount>    BinMinX, BinMinY, BinMinZ;
            std::array<float, TlasBinCount>    BinMaxX, BinMaxY, BinMaxZ;
            BinMinX.fill(Inf);
            BinMinY.fill(Inf);
            BinMinZ.fill(Inf);
            BinMaxX.fill(-Inf);
            BinMaxY.fill(-Inf);
            BinMaxZ.fill(-Inf);

            const float Scale = static_cast<float>(TlasBinCount) / (High - Low);
            for (uint32_t I = First; I < First + Span; ++I)
            {
                const uint32_t K = Order[I];
                const int32_t  RawBin = static_cast<int32_t>(std::floor(((*CentArr)[K] - Low) * Scale));
                const uint32_t B      = static_cast<uint32_t>(std::max(0, std::min(static_cast<int32_t>(TlasBinCount) - 1, RawBin)));
                BinCounts[B]++;
                BinMinX[B] = std::min(BinMinX[B], MinX[K]);
                BinMinY[B] = std::min(BinMinY[B], MinY[K]);
                BinMinZ[B] = std::min(BinMinZ[B], MinZ[K]);
                BinMaxX[B] = std::max(BinMaxX[B], MaxX[K]);
                BinMaxY[B] = std::max(BinMaxY[B], MaxY[K]);
                BinMaxZ[B] = std::max(BinMaxZ[B], MaxZ[K]);
            }

            float BestCost  = Inf;
            float BestSplit = 0.5f * (Low + High);
            for (uint32_t Split = 1u; Split < TlasBinCount; ++Split)
            {
                uint32_t LC = 0u, RC = 0u;
                float LMinX = Inf, LMinY = Inf, LMinZ = Inf, LMaxX = -Inf, LMaxY = -Inf, LMaxZ = -Inf;
                float RMinX = Inf, RMinY = Inf, RMinZ = Inf, RMaxX = -Inf, RMaxY = -Inf, RMaxZ = -Inf;
                for (uint32_t B = 0u; B < TlasBinCount; ++B)
                {
                    if (BinCounts[B] == 0u)
                    {
                        continue;
                    }
                    if (B < Split)
                    {
                        LC += BinCounts[B];
                        LMinX = std::min(LMinX, BinMinX[B]);
                        LMinY = std::min(LMinY, BinMinY[B]);
                        LMinZ = std::min(LMinZ, BinMinZ[B]);
                        LMaxX = std::max(LMaxX, BinMaxX[B]);
                        LMaxY = std::max(LMaxY, BinMaxY[B]);
                        LMaxZ = std::max(LMaxZ, BinMaxZ[B]);
                    }
                    else
                    {
                        RC += BinCounts[B];
                        RMinX = std::min(RMinX, BinMinX[B]);
                        RMinY = std::min(RMinY, BinMinY[B]);
                        RMinZ = std::min(RMinZ, BinMinZ[B]);
                        RMaxX = std::max(RMaxX, BinMaxX[B]);
                        RMaxY = std::max(RMaxY, BinMaxY[B]);
                        RMaxZ = std::max(RMaxZ, BinMaxZ[B]);
                    }
                }
                if (LC == 0u || RC == 0u)
                {
                    continue;
                }
                const float Lx   = std::max(0.0f, LMaxX - LMinX);
                const float Ly   = std::max(0.0f, LMaxY - LMinY);
                const float Lz   = std::max(0.0f, LMaxZ - LMinZ);
                const float Rx   = std::max(0.0f, RMaxX - RMinX);
                const float Ry   = std::max(0.0f, RMaxY - RMinY);
                const float Rz   = std::max(0.0f, RMaxZ - RMinZ);
                const float Cost = (Lx * Ly + Ly * Lz + Lz * Lx) * static_cast<float>(LC)
                                 + (Rx * Ry + Ry * Rz + Rz * Rx) * static_cast<float>(RC);
                if (Cost < BestCost)
                {
                    BestCost  = Cost;
                    BestSplit = Low + static_cast<float>(Split) / Scale;
                }
            }

            int32_t Cursor = static_cast<int32_t>(First);
            int32_t Tail   = static_cast<int32_t>(First + Span) - 1;
            while (Cursor <= Tail)
            {
                if ((*CentArr)[Order[static_cast<size_t>(Cursor)]] < BestSplit)
                {
                    ++Cursor;
                }
                else
                {
                    std::swap(Order[static_cast<size_t>(Cursor)], Order[static_cast<size_t>(Tail)]);
                    --Tail;
                }
            }
            if (Cursor > static_cast<int32_t>(First) && Cursor < static_cast<int32_t>(First + Span))
            {
                Middle = static_cast<uint32_t>(Cursor);
            }
        }
        else if (High - Low > 1.0e-5f)
        {
            const float Pivot  = 0.5f * (Low + High);
            int32_t     Cursor = static_cast<int32_t>(First);
            int32_t     Tail   = static_cast<int32_t>(First + Span) - 1;
            while (Cursor <= Tail)
            {
                if ((*CentArr)[Order[static_cast<size_t>(Cursor)]] < Pivot)
                {
                    ++Cursor;
                }
                else
                {
                    std::swap(Order[static_cast<size_t>(Cursor)], Order[static_cast<size_t>(Tail)]);
                    --Tail;
                }
            }
            if (Cursor > static_cast<int32_t>(First) && Cursor < static_cast<int32_t>(First + Span))
            {
                Middle = static_cast<uint32_t>(Cursor);
            }
        }

        const uint32_t LeftCell  = NextCell;
        const uint32_t RightCell = NextCell + 1u;
        NextCell += 2u;

        AllCellWords_[Base + 3u] = LeftCell;
        AllCellWords_[Base + 7u] = 0u;

        Self(Self, LeftCell, First, Middle - First);
        Self(Self, RightCell, Middle, First + Span - Middle);
    };

    SubdivideObjects(SubdivideObjects, ObjectsRootCell, 0u, ObjectCount);

    if (HasGround)
    {
        AllCellWords_[0u] = FloatToWord(std::min(WordToFloat(AllCellWords_[8u + 0u]), WordToFloat(AllCellWords_[16u + 0u])));
        AllCellWords_[1u] = FloatToWord(std::min(WordToFloat(AllCellWords_[8u + 1u]), WordToFloat(AllCellWords_[16u + 1u])));
        AllCellWords_[2u] = FloatToWord(std::min(WordToFloat(AllCellWords_[8u + 2u]), WordToFloat(AllCellWords_[16u + 2u])));
        AllCellWords_[3u] = 1u;
        AllCellWords_[4u] = FloatToWord(std::max(WordToFloat(AllCellWords_[8u + 4u]), WordToFloat(AllCellWords_[16u + 4u])));
        AllCellWords_[5u] = FloatToWord(std::max(WordToFloat(AllCellWords_[8u + 5u]), WordToFloat(AllCellWords_[16u + 5u])));
        AllCellWords_[6u] = FloatToWord(std::max(WordToFloat(AllCellWords_[8u + 6u]), WordToFloat(AllCellWords_[16u + 6u])));
        AllCellWords_[7u] = 0u;
    }

    UsedTlasCells_ = NextCell;
}

//------------------------------------------------------------------------------------------------------------------------
//                                       CPU REFERENCE RAY-SCENE INTERSECTION
//------------------------------------------------------------------------------------------------------------------------

CpuRayIntersection RayTracingSpace::TraceRayCpu(const SceneFacetCollection& Scene,
                                                std::array<float, 3>        Origin,
                                                std::array<float, 3>        Direction,
                                                float                       MinimumTravel,
                                                float                       MaximumTravel) const noexcept
{
    CpuRayIntersection Result{};
    Result.Travel = MaximumTravel;

    if (AllCellWords_.size() < 8u || AllCellWords_[3u] == EmptyTlasSentinel)
    {
        return Result;
    }

    const auto SafeRecip = [](std::array<float, 3> D) noexcept -> std::array<float, 3>
    {
        return {
            std::abs(D[0]) < 1.0e-9f ? 1.0e9f : 1.0f / D[0],
            std::abs(D[1]) < 1.0e-9f ? 1.0e9f : 1.0f / D[1],
            std::abs(D[2]) < 1.0e-9f ? 1.0e9f : 1.0f / D[2]
        };
    };

    const auto IntersectAabb = [&](std::array<float, 3> Orig,
                                   std::array<float, 3> Recip,
                                   uint32_t             CellBase,
                                   float                Limit) noexcept -> float
    {
        const float Nx = (WordToFloat(AllCellWords_[CellBase + 0u]) - Orig[0]) * Recip[0];
        const float Fx = (WordToFloat(AllCellWords_[CellBase + 4u]) - Orig[0]) * Recip[0];
        const float Ny = (WordToFloat(AllCellWords_[CellBase + 1u]) - Orig[1]) * Recip[1];
        const float Fy = (WordToFloat(AllCellWords_[CellBase + 5u]) - Orig[1]) * Recip[1];
        const float Nz = (WordToFloat(AllCellWords_[CellBase + 2u]) - Orig[2]) * Recip[2];
        const float Fz = (WordToFloat(AllCellWords_[CellBase + 6u]) - Orig[2]) * Recip[2];
        const float Entry = std::max({std::min(Nx, Fx), std::min(Ny, Fy), std::min(Nz, Fz), 0.0f});
        const float Exit  = std::min({std::max(Nx, Fx), std::max(Ny, Fy), std::max(Nz, Fz), Limit});
        return (Entry <= Exit) ? Entry : 1.0e30f;
    };

    const std::array<float, 3> WorldRecip = SafeRecip(Direction);
    std::array<uint32_t, 64>   Stack{};
    uint32_t                   Depth     = 1u;
    Stack[0u]                            = 0u;
    uint32_t                   BlasFloor = 0xFFFFFFFFu;

    float    Nearest    = MaximumTravel;
    int32_t  BestTri    = -1;
    int32_t  BestOcc    = -1;
    float    BestU      = 0.0f;
    float    BestV      = 0.0f;
    uint32_t Steps      = 0u;

    uint32_t             CurrentOcc  = 0u;
    uint32_t             OccAssign   = 0u;
    std::array<float, 3> LocalOrigin = Origin;
    std::array<float, 3> LocalDir    = Direction;
    std::array<float, 3> LocalRecip  = WorldRecip;

    while (Depth > 0u && Steps < 1024u)
    {
        if (Depth <= BlasFloor)
        {
            BlasFloor = 0xFFFFFFFFu;
        }

        const uint32_t CellIdx     = Stack[--Depth];
        const uint32_t CellBase    = CellIdx * 8u;
        const uint32_t LeftOrFirst = AllCellWords_[CellBase + 3u];
        const uint32_t Count       = AllCellWords_[CellBase + 7u];
        ++Steps;

        if (BlasFloor == 0xFFFFFFFFu)
        {
            if (IntersectAabb(Origin, WorldRecip, CellBase, Nearest) >= Nearest)
            {
                continue;
            }
            if ((Count & TlasLeafBit) != 0u)
            {
                CurrentOcc = Count & TlasIndexMask;
                const SceneOccupantInstance& Occ = Scene.Occupants[CurrentOcc];
                OccAssign = Occ.Assignments;
                const std::array<float, 16> Inv = InvertRigidOrAffineTransform(Occ.Transform);
                LocalOrigin = {
                    Inv[0] * Origin[0] + Inv[4] * Origin[1] + Inv[8]  * Origin[2] + Inv[12],
                    Inv[1] * Origin[0] + Inv[5] * Origin[1] + Inv[9]  * Origin[2] + Inv[13],
                    Inv[2] * Origin[0] + Inv[6] * Origin[1] + Inv[10] * Origin[2] + Inv[14]
                };
                LocalDir = {
                    Inv[0] * Direction[0] + Inv[4] * Direction[1] + Inv[8]  * Direction[2],
                    Inv[1] * Direction[0] + Inv[5] * Direction[1] + Inv[9]  * Direction[2],
                    Inv[2] * Direction[0] + Inv[6] * Direction[1] + Inv[10] * Direction[2]
                };
                LocalRecip     = SafeRecip(LocalDir);
                BlasFloor      = Depth;
                Stack[Depth++] = LeftOrFirst;
            }
            else
            {
                const uint32_t Left  = LeftOrFirst;
                const uint32_t Right = LeftOrFirst + 1u;
                const float    LDist = IntersectAabb(Origin, WorldRecip, Left * 8u, Nearest);
                const float    RDist = IntersectAabb(Origin, WorldRecip, Right * 8u, Nearest);
                if (LDist < RDist)
                {
                    if (RDist < Nearest && Depth < 64u) { Stack[Depth++] = Right; }
                    if (LDist < Nearest && Depth < 64u) { Stack[Depth++] = Left; }
                }
                else
                {
                    if (LDist < Nearest && Depth < 64u) { Stack[Depth++] = Left; }
                    if (RDist < Nearest && Depth < 64u) { Stack[Depth++] = Right; }
                }
            }
        }
        else
        {
            if (IntersectAabb(LocalOrigin, LocalRecip, CellBase, Nearest) >= Nearest)
            {
                continue;
            }
            if (Count > 0u)
            {
                for (uint32_t Tri = LeftOrFirst; Tri < LeftOrFirst + Count; ++Tri)
                {
                    const uint32_t       TBase     = Tri * 16u;
                    const CourseMaterial RawFamily = static_cast<CourseMaterial>(AllTriangleWords_[TBase + 3u]);
                    if (RawFamily == CourseMaterial::VehicleGlass)
                    {
                        continue;
                    }
                    if (RawFamily == CourseMaterial::Tyre && (OccAssign & OccupantAssignmentShredded) != 0u)
                    {
                        continue;
                    }

                    const float Ax  = WordToFloat(AllTriangleWords_[TBase + 0u]);
                    const float Ay  = WordToFloat(AllTriangleWords_[TBase + 1u]);
                    const float Az  = WordToFloat(AllTriangleWords_[TBase + 2u]);
                    const float E1x = WordToFloat(AllTriangleWords_[TBase + 4u]);
                    const float E1y = WordToFloat(AllTriangleWords_[TBase + 5u]);
                    const float E1z = WordToFloat(AllTriangleWords_[TBase + 6u]);
                    const float E2x = WordToFloat(AllTriangleWords_[TBase + 8u]);
                    const float E2y = WordToFloat(AllTriangleWords_[TBase + 9u]);
                    const float E2z = WordToFloat(AllTriangleWords_[TBase + 10u]);

                    const float Hx  = LocalDir[1] * E2z - LocalDir[2] * E2y;
                    const float Hy  = LocalDir[2] * E2x - LocalDir[0] * E2z;
                    const float Hz  = LocalDir[0] * E2y - LocalDir[1] * E2x;
                    const float Det = E1x * Hx + E1y * Hy + E1z * Hz;
                    if (std::abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    const float InvDet = 1.0f / Det;
                    const float Sx     = LocalOrigin[0] - Ax;
                    const float Sy     = LocalOrigin[1] - Ay;
                    const float Sz     = LocalOrigin[2] - Az;
                    const float U      = (Sx * Hx + Sy * Hy + Sz * Hz) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    const float Qx = Sy * E1z - Sz * E1y;
                    const float Qy = Sz * E1x - Sx * E1z;
                    const float Qz = Sx * E1y - Sy * E1x;
                    const float V  = (LocalDir[0] * Qx + LocalDir[1] * Qy + LocalDir[2] * Qz) * InvDet;
                    if (V < 0.0f || U + V > 1.0f)
                    {
                        continue;
                    }
                    const float T = (E2x * Qx + E2y * Qy + E2z * Qz) * InvDet;
                    if (T > MinimumTravel && T < Nearest)
                    {
                        Nearest = T;
                        BestTri = static_cast<int32_t>(Tri);
                        BestOcc = static_cast<int32_t>(CurrentOcc);
                        BestU   = U;
                        BestV   = V;
                    }
                }
            }
            else
            {
                const uint32_t Left  = LeftOrFirst;
                const uint32_t Right = LeftOrFirst + 1u;
                const float    LDist = IntersectAabb(LocalOrigin, LocalRecip, Left * 8u, Nearest);
                const float    RDist = IntersectAabb(LocalOrigin, LocalRecip, Right * 8u, Nearest);
                if (LDist < RDist)
                {
                    if (RDist < Nearest && Depth < 64u) { Stack[Depth++] = Right; }
                    if (LDist < Nearest && Depth < 64u) { Stack[Depth++] = Left; }
                }
                else
                {
                    if (LDist < Nearest && Depth < 64u) { Stack[Depth++] = Left; }
                    if (RDist < Nearest && Depth < 64u) { Stack[Depth++] = Right; }
                }
            }
        }
    }

    if (BestTri < 0)
    {
        return Result;
    }

    const uint32_t               TBase = static_cast<uint32_t>(BestTri) * 16u;
    const SceneOccupantInstance& Occ   = Scene.Occupants[static_cast<size_t>(BestOcc)];
    const std::array<float, 3>   NA    = UnpackOctahedralCpu(AllTriangleWords_[TBase + 7u]);
    const std::array<float, 3>   NB    = UnpackOctahedralCpu(AllTriangleWords_[TBase + 11u]);
    const std::array<float, 3>   NC    = UnpackOctahedralCpu(AllTriangleWords_[TBase + 15u]);
    const float                  W     = 1.0f - BestU - BestV;
    const float                  Lx    = NA[0] * W + NB[0] * BestU + NC[0] * BestV;
    const float                  Ly    = NA[1] * W + NB[1] * BestU + NC[1] * BestV;
    const float                  Lz    = NA[2] * W + NB[2] * BestU + NC[2] * BestV;
    const std::array<float, 16>& M     = Occ.Transform;
    std::array<float, 3>         WorldN = NormalizeVector({
        M[0] * Lx + M[4] * Ly + M[8]  * Lz,
        M[1] * Lx + M[5] * Ly + M[9]  * Lz,
        M[2] * Lx + M[6] * Ly + M[10] * Lz
    });
    if (WorldN[0] * Direction[0] + WorldN[1] * Direction[1] + WorldN[2] * Direction[2] > 0.0f)
    {
        WorldN = {-WorldN[0], -WorldN[1], -WorldN[2]};
    }

    CourseMaterial Family = static_cast<CourseMaterial>(AllTriangleWords_[TBase + 3u]);
    if (Occ.MaterialOverride != NoMaterialOverrideSentinel)
    {
        Family = static_cast<CourseMaterial>(Occ.MaterialOverride);
    }

    Result.Hit      = true;
    Result.Travel   = Nearest;
    Result.Position = {
        Origin[0] + Direction[0] * Nearest,
        Origin[1] + Direction[1] * Nearest,
        Origin[2] + Direction[2] * Nearest
    };
    Result.Normal   = WorldN;
    Result.Occupant = static_cast<uint32_t>(BestOcc);
    Result.Family   = Family;
    Result.Triangle = static_cast<uint32_t>(BestTri);
    return Result;
}

float RayTracingSpace::TraceVisibilityCpu(const SceneFacetCollection& Scene,
                                          std::array<float, 3>        Origin,
                                          std::array<float, 3>        Direction,
                                          float                       MinimumTravel,
                                          float                       MaximumTravel) const noexcept
{
    const CpuRayIntersection Hit = TraceRayCpu(Scene, Origin, Direction, MinimumTravel, MaximumTravel);
    return Hit.Hit ? 0.0f : 1.0f;
}

} // namespace Frontier
