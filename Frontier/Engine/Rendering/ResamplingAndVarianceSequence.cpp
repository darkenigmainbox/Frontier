/*==========================================================================================================================================
                                                 RESAMPLING AND VARIANCE SEQUENCE
                                     ------------------------------------------------------------------
                 VehicleHMI 1:1 ReSTIR GI path tracer, multi-bounce glossy reflection tracer, temporal +
                  spatial reservoir reuse with reconnection Jacobian and visibility verification, SVGF
                   temporal moments + 5x5 B3-spline à-trous wavelet + joint bilateral upsample, 4-cascade
                        toroidal SDF + 6-card surface radiosity depot, and display recombination.
==========================================================================================================================================*/

// 🧩 1:1 port of ResamplingSequence.js, VarianceIntegrator.js, RayTraversal.wgsl, ReservoirTemporal/Spatial.wgsl, and Variance*.wgsl.

#include "ResamplingAndVarianceSequence.h"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <fstream>

namespace Frontier
{

namespace
{

constexpr float π        = 3.14159265358979323846f;
constexpr float Inverseπ = 0.31830988618379067154f;

[[nodiscard]] inline float Dot3(std::array<float, 3> A, std::array<float, 3> B) noexcept
{
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

[[nodiscard]] inline std::array<float, 3> Cross3(std::array<float, 3> A, std::array<float, 3> B) noexcept
{
    return {
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    };
}

[[nodiscard]] inline std::array<float, 3> Normalize3(std::array<float, 3> V) noexcept
{
    const float LenSq = Dot3(V, V);
    if (LenSq > 1.0e-18f)
    {
        const float Inv = 1.0f / std::sqrt(LenSq);
        return {V[0] * Inv, V[1] * Inv, V[2] * Inv};
    }
    return {0.0f, 0.0f, 1.0f};
}

[[nodiscard]] inline float ResolveLuminanceCpu(std::array<float, 3> LinearRgb) noexcept
{
    return 0.2126f * LinearRgb[0] + 0.7152f * LinearRgb[1] + 0.0722f * LinearRgb[2];
}

void ConstructOrthonormalBasisCpu(std::array<float, 3>  Normal,
                                  std::array<float, 3>& OutTangent,
                                  std::array<float, 3>& OutBitangent) noexcept
{
    const float Sign = (Normal[2] >= 0.0f) ? 1.0f : -1.0f;
    const float A    = -1.0f / (Sign + Normal[2]);
    const float B    = Normal[0] * Normal[1] * A;
    OutTangent       = {1.0f + Sign * Normal[0] * Normal[0] * A, Sign * B, -Sign * Normal[0]};
    OutBitangent     = {B, Sign + Normal[1] * Normal[1] * A, -Normal[1]};
}

[[nodiscard]] inline std::array<float, 3> MulMat4PointCpu(const std::array<float, 16>& M,
                                                          std::array<float, 3>         P) noexcept
{
    return {
        M[0] * P[0] + M[4] * P[1] + M[8]  * P[2] + M[12],
        M[1] * P[0] + M[5] * P[1] + M[9]  * P[2] + M[13],
        M[2] * P[0] + M[6] * P[1] + M[10] * P[2] + M[14]
    };
}

[[nodiscard]] inline std::array<float, 3> MulMat3DirCpu(const std::array<float, 16>& M,
                                                        std::array<float, 3>         D) noexcept
{
    return {
        M[0] * D[0] + M[4] * D[1] + M[8]  * D[2],
        M[1] * D[0] + M[5] * D[1] + M[9]  * D[2],
        M[2] * D[0] + M[6] * D[1] + M[10] * D[2]
    };
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                           FEATURE BITMASK & BOUNCE PACKING
//------------------------------------------------------------------------------------------------------------------------

uint32_t EncodeBounceCountBits(uint32_t Bounces) noexcept
{
    const uint32_t Clamped = std::clamp(Bounces, 1u, 6u);
    return (Clamped & 7u) << FeatureBounceCountShift;
}

uint32_t ResolveBounceCountCpu(uint32_t FeatureBits) noexcept
{
    const uint32_t Bounces = (FeatureBits & FeatureBounceCountMask) >> FeatureBounceCountShift;
    return (Bounces > 0u) ? std::min(Bounces, 6u) : 2u;
}

float EncodeReflectionParametersCpu(float ReflectionScale, float ReflectionRoughness) noexcept
{
    const int32_t QuantizedScale = std::max(0, static_cast<int32_t>(std::round(ReflectionScale * 100.0f)));
    const float   ClampedRough   = std::clamp(ReflectionRoughness, 0.05f, 0.95f);
    return static_cast<float>(QuantizedScale) + ClampedRough;
}

float ResolveReflectionScaleCpu(float EncodedCardBounceScale) noexcept
{
    const float Packed = std::floor(EncodedCardBounceScale);
    return (Packed > 0.0f) ? (Packed * 0.01f) : 1.0f;
}

float ResolveReflectionRoughnessCpu(float EncodedCardBounceScale) noexcept
{
    const float Fraction = EncodedCardBounceScale - std::floor(EncodedCardBounceScale);
    return (Fraction > 0.01f) ? std::clamp(Fraction, 0.05f, 0.95f) : 0.72f;
}

//------------------------------------------------------------------------------------------------------------------------
//                                        PCG32 & R2 LOW-DISCREPANCY SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

uint32_t StochasticGenerator::Step() noexcept
{
    const uint32_t Previous = State;
    State                   = Previous * 747796405u + 2891336453u;
    const uint32_t Word     = ((Previous >> ((Previous >> 28u) + 4u)) ^ Previous) * 277803737u;
    return (Word >> 22u) ^ Word;
}

float StochasticGenerator::SampleUnit() noexcept
{
    return static_cast<float>(Step() >> 8u) * (1.0f / 16777216.0f);
}

std::array<float, 2> StochasticGenerator::SamplePair() noexcept
{
    const float U = SampleUnit();
    const float V = SampleUnit();
    return {U, V};
}

StochasticGenerator ConstructGeneratorCpu(uint32_t PixelX, uint32_t PixelY, uint32_t StepIndex, uint32_t Salt) noexcept
{
    const uint32_t Mixed = PixelX * 1973u + PixelY * 9277u + StepIndex * 26699u + Salt * 374761393u + 1013904223u;
    StochasticGenerator Generator{Mixed};
    (void)Generator.Step();
    return Generator;
}

std::array<float, 2> EvaluateDiscrepancyPairCpu(uint32_t Index) noexcept
{
    const float F = static_cast<float>(Index + 1u);
    const float X = F * 0.7548776662466927f;
    const float Y = F * 0.5698402909980532f;
    return {X - std::floor(X), Y - std::floor(Y)};
}

std::array<float, 3> SampleCosineHemisphereCpu(std::array<float, 2> Random,
                                               std::array<float, 3> Normal,
                                               float&               OutPdf) noexcept
{
    const float R     = std::sqrt(Random[0]);
    const float Phi   = 2.0f * π * Random[1];
    const float X     = R * std::cos(Phi);
    const float Y     = R * std::sin(Phi);
    const float Z     = std::sqrt(std::max(0.0f, 1.0f - Random[0]));
    OutPdf            = Z * Inverseπ;

    std::array<float, 3> T{};
    std::array<float, 3> B{};
    ConstructOrthonormalBasisCpu(Normal, T, B);
    return Normalize3({
        T[0] * X + B[0] * Y + Normal[0] * Z,
        T[1] * X + B[1] * Y + Normal[1] * Z,
        T[2] * X + B[2] * Y + Normal[2] * Z
    });
}

//------------------------------------------------------------------------------------------------------------------------
//                                       BSDF, NEE, AND MULTI-BOUNCE PATH TRACER
//------------------------------------------------------------------------------------------------------------------------

namespace
{

[[nodiscard]] inline std::array<float, 3> EvaluateSchlickFresnelCpu(float CosTheta, std::array<float, 3> F0) noexcept
{
    const float Clamped = std::clamp(1.0f - CosTheta, 0.0f, 1.0f);
    const float Factor  = Clamped * Clamped * Clamped * Clamped * Clamped;
    return {
        F0[0] + (1.0f - F0[0]) * Factor,
        F0[1] + (1.0f - F0[1]) * Factor,
        F0[2] + (1.0f - F0[2]) * Factor
    };
}

[[nodiscard]] inline float EvaluateGgxDistributionCpu(float NdotH, float Alpha) noexcept
{
    const float AlphaSq = Alpha * Alpha;
    const float Denom   = NdotH * NdotH * (AlphaSq - 1.0f) + 1.0f;
    return AlphaSq * Inverseπ / std::max(Denom * Denom, 1.0e-7f);
}

[[nodiscard]] inline float EvaluateSmithHeightCorrelatedG2Over4Cpu(float NdotV, float NdotL, float Alpha) noexcept
{
    const float AlphaSq = Alpha * Alpha;
    const float Gv      = NdotL * std::sqrt(NdotV * NdotV * (1.0f - AlphaSq) + AlphaSq);
    const float Gl      = NdotV * std::sqrt(NdotL * NdotL * (1.0f - AlphaSq) + AlphaSq);
    return 0.5f / std::max(Gv + Gl, 1.0e-5f);
}

[[nodiscard]] inline float EvaluateSmithG1Cpu(float NdotV, float Alpha) noexcept
{
    const float AlphaSq = Alpha * Alpha;
    return (2.0f * NdotV) / std::max(NdotV + std::sqrt(AlphaSq + (1.0f - AlphaSq) * NdotV * NdotV), 1.0e-5f);
}

[[nodiscard]] inline std::array<float, 3> ResolveDiffuseAlbedoCpu(const SurfaceMaterialSpecification& S) noexcept
{
    const float Scale = 1.0f - S.Metalness;
    return {S.Albedo[0] * Scale, S.Albedo[1] * Scale, S.Albedo[2] * Scale};
}

[[nodiscard]] inline std::array<float, 3> ResolveSpecularF0Cpu(const SurfaceMaterialSpecification& S) noexcept
{
    return {
        S.SpecularLevel * (1.0f - S.Metalness) + S.Albedo[0] * S.Metalness,
        S.SpecularLevel * (1.0f - S.Metalness) + S.Albedo[1] * S.Metalness,
        S.SpecularLevel * (1.0f - S.Metalness) + S.Albedo[2] * S.Metalness
    };
}

[[nodiscard]] inline float ResolveSpecularSamplingProbabilityCpu(const SurfaceMaterialSpecification& S) noexcept
{
    const float SpecStrength = std::max(S.Metalness, S.CoatWeight * 0.5f);
    const float SmoothWeight = (1.0f - S.Roughness) * 0.45f;
    return std::clamp(0.18f + 0.65f * std::max(SpecStrength, SmoothWeight), 0.15f, 0.88f);
}

[[nodiscard]] std::array<float, 3> SampleGgxHalfVectorVndfCpu(std::array<float, 3> Normal,
                                                              std::array<float, 3> View,
                                                              float                Alpha,
                                                              std::array<float, 2> Random) noexcept
{
    std::array<float, 3> T{};
    std::array<float, 3> B{};
    ConstructOrthonormalBasisCpu(Normal, T, B);
    const std::array<float, 3> Vlocal = {Dot3(View, T), Dot3(View, B), std::max(Dot3(View, Normal), 1.0e-4f)};
    const std::array<float, 3> Vh     = Normalize3({Alpha * Vlocal[0], Alpha * Vlocal[1], Vlocal[2]});

    const float                Lensq = Vh[0] * Vh[0] + Vh[1] * Vh[1];
    const std::array<float, 3> T1    = (Lensq > 1.0e-7f)
                                     ? std::array<float, 3>{-Vh[1] / std::sqrt(Lensq), Vh[0] / std::sqrt(Lensq), 0.0f}
                                     : std::array<float, 3>{1.0f, 0.0f, 0.0f};
    const std::array<float, 3> T2    = Cross3(Vh, T1);

    const float R   = std::sqrt(Random[0]);
    const float Phi = 2.0f * π * Random[1];
    const float P1  = R * std::cos(Phi);
    const float S   = 0.5f * (1.0f + Vh[2]);
    const float P2  = (1.0f - S) * std::sqrt(std::max(0.0f, 1.0f - P1 * P1)) + S * (R * std::sin(Phi));
    const float P3  = std::sqrt(std::max(0.0f, 1.0f - P1 * P1 - P2 * P2));

    const std::array<float, 3> Nh = {
        T1[0] * P1 + T2[0] * P2 + Vh[0] * P3,
        T1[1] * P1 + T2[1] * P2 + Vh[1] * P3,
        T1[2] * P1 + T2[2] * P2 + Vh[2] * P3
    };
    const std::array<float, 3> Hlocal = Normalize3({Alpha * Nh[0], Alpha * Nh[1], std::max(1.0e-5f, Nh[2])});
    return Normalize3({
        T[0] * Hlocal[0] + B[0] * Hlocal[1] + Normal[0] * Hlocal[2],
        T[1] * Hlocal[0] + B[1] * Hlocal[1] + Normal[1] * Hlocal[2],
        T[2] * Hlocal[0] + B[2] * Hlocal[1] + Normal[2] * Hlocal[2]
    });
}

} // namespace

std::array<float, 3> EvaluateSurfaceBsdfCpu(const SurfaceMaterialSpecification& Surface,
                                            std::array<float, 3>                Normal,
                                            std::array<float, 3>                View,
                                            std::array<float, 3>                Light) noexcept
{
    const float NdotV = Dot3(Normal, View);
    const float NdotL = Dot3(Normal, Light);
    if (NdotV <= 0.0f || NdotL <= 0.0f)
    {
        return {0.0f, 0.0f, 0.0f};
    }

    const std::array<float, 3> HalfVector = Normalize3({View[0] + Light[0], View[1] + Light[1], View[2] + Light[2]});
    const float                NdotH      = std::max(Dot3(Normal, HalfVector), 0.0f);
    const float                VdotH      = std::max(Dot3(View, HalfVector), 0.0f);

    const float                FlakeCov  = std::clamp(Surface.FlakeCoverage, 0.0f, 1.0f);
    const float                Roughness = std::clamp(Surface.Roughness, 0.035f, 1.0f);
    const float                Alpha     = Roughness * Roughness;
    const std::array<float, 3> F0        = ResolveSpecularF0Cpu(Surface);
    const std::array<float, 3> Fresnel   = EvaluateSchlickFresnelCpu(VdotH, F0);
    const float                Dist      = EvaluateGgxDistributionCpu(NdotH, Alpha);
    const float                Vis       = EvaluateSmithHeightCorrelatedG2Over4Cpu(NdotV, NdotL, Alpha);
    std::array<float, 3>       Specular  = {Fresnel[0] * Dist * Vis, Fresnel[1] * Dist * Vis, Fresnel[2] * Dist * Vis};

    if (FlakeCov > 0.0f)
    {
        const float                FlakeRough = std::max(0.06f, Roughness * 0.55f);
        const float                FlakeAlpha = FlakeRough * FlakeRough;
        const std::array<float, 3> FlakeF     = EvaluateSchlickFresnelCpu(VdotH, Surface.FlakeTint);
        const float                FlakeD     = EvaluateGgxDistributionCpu(NdotH, FlakeAlpha);
        const float                FlakeVis   = EvaluateSmithHeightCorrelatedG2Over4Cpu(NdotV, NdotL, FlakeAlpha);
        const float                Blend      = FlakeCov * 0.65f;
        Specular[0] = Specular[0] * (1.0f - Blend) + FlakeF[0] * FlakeD * FlakeVis * Blend;
        Specular[1] = Specular[1] * (1.0f - Blend) + FlakeF[1] * FlakeD * FlakeVis * Blend;
        Specular[2] = Specular[2] * (1.0f - Blend) + FlakeF[2] * FlakeD * FlakeVis * Blend;
    }

    const float Fd90  = 0.5f + 2.0f * Roughness * VdotH * VdotH;
    const float Fl    = 1.0f + (Fd90 - 1.0f) * std::pow(std::clamp(1.0f - NdotL, 0.0f, 1.0f), 5.0f);
    const float Fv    = 1.0f + (Fd90 - 1.0f) * std::pow(std::clamp(1.0f - NdotV, 0.0f, 1.0f), 5.0f);
    auto        DiffA = ResolveDiffuseAlbedoCpu(Surface);
    if (FlakeCov > 0.0f)
    {
        const float Binder = std::exp(-0.18f);
        for (size_t C = 0u; C < 3u; ++C)
        {
            DiffA[C] = (DiffA[C] * Binder) * (1.0f - FlakeCov * 0.45f) + Surface.FlakeTint[C] * (FlakeCov * 0.25f);
        }
    }
    std::array<float, 3> Diffuse = {
        DiffA[0] * (1.0f - Fresnel[0]) * (Fl * Fv * Inverseπ),
        DiffA[1] * (1.0f - Fresnel[1]) * (Fl * Fv * Inverseπ),
        DiffA[2] * (1.0f - Fresnel[2]) * (Fl * Fv * Inverseπ)
    };

    if (Surface.SheenTint[0] > 0.0f || Surface.SheenTint[1] > 0.0f || Surface.SheenTint[2] > 0.0f)
    {
        const float SheenTerm = static_cast<float>(
            EvaluateCharlieDistribution(Surface.SheenRoughness, NdotH) *
            EvaluateAshikhminVisibility(NdotV, NdotL));
        Diffuse[0] += Surface.SheenTint[0] * SheenTerm;
        Diffuse[1] += Surface.SheenTint[1] * SheenTerm;
        Diffuse[2] += Surface.SheenTint[2] * SheenTerm;
    }

    std::array<float, 3> Combined = {Diffuse[0] + Specular[0], Diffuse[1] + Specular[1], Diffuse[2] + Specular[2]};
    if (Surface.CoatWeight > 0.0f)
    {
        const float CoatRough = std::clamp(Surface.CoatRoughness, 0.025f, 1.0f);
        const float CoatAlpha = CoatRough * CoatRough;
        const float CoatF     = EvaluateSchlickFresnelCpu(VdotH, {0.04f, 0.04f, 0.04f})[0] * Surface.CoatWeight;
        const float CoatD     = EvaluateGgxDistributionCpu(NdotH, CoatAlpha);
        const float CoatVis   = EvaluateSmithHeightCorrelatedG2Over4Cpu(NdotV, NdotL, CoatAlpha);
        const float CoatSpec  = CoatF * CoatD * CoatVis;

        std::array<float, 3> Absorption = {1.0f, 1.0f, 1.0f};
        if (Surface.CoatingThickness > 0.0f)
        {
            const float PathLen = (1.0f / std::max(0.001f, NdotV)) + (1.0f / std::max(0.001f, NdotL));
            Absorption = {
                std::exp(-Surface.Absorption[0] * Surface.CoatingThickness * PathLen),
                std::exp(-Surface.Absorption[1] * Surface.CoatingThickness * PathLen),
                std::exp(-Surface.Absorption[2] * Surface.CoatingThickness * PathLen)
            };
        }
        Combined = {
            Combined[0] * (1.0f - CoatF) * Absorption[0] + CoatSpec,
            Combined[1] * (1.0f - CoatF) * Absorption[1] + CoatSpec,
            Combined[2] * (1.0f - CoatF) * Absorption[2] + CoatSpec
        };
    }

    return {Combined[0] * NdotL, Combined[1] * NdotL, Combined[2] * NdotL};
}

float EvaluateSurfaceBsdfPdfCpu(const SurfaceMaterialSpecification& Surface,
                                std::array<float, 3>                Normal,
                                std::array<float, 3>                View,
                                std::array<float, 3>                Light) noexcept
{
    const float NdotV = Dot3(Normal, View);
    const float NdotL = Dot3(Normal, Light);
    if (NdotV <= 0.0f || NdotL <= 0.0f)
    {
        return 0.0f;
    }
    const std::array<float, 3> H     = Normalize3({View[0] + Light[0], View[1] + Light[1], View[2] + Light[2]});
    const float                NdotH = std::max(Dot3(Normal, H), 1.0e-5f);
    const float                Rough = (Surface.CoatWeight > 0.5f) ? std::min(Surface.Roughness, Surface.CoatRoughness) : Surface.Roughness;
    const float                Alpha = std::max(0.035f, Rough * Rough);
    const float                D     = EvaluateGgxDistributionCpu(NdotH, Alpha);
    const float                G1    = EvaluateSmithG1Cpu(NdotV, Alpha);
    const float                PdfS  = (D * G1) / std::max(4.0f * NdotV, 1.0e-5f);
    const float                PdfD  = NdotL * Inverseπ;
    const float                ProbS = ResolveSpecularSamplingProbabilityCpu(Surface);
    return ProbS * PdfS + (1.0f - ProbS) * PdfD;
}

BsdfDirectionSample SampleSurfaceBsdfCpu(const SurfaceMaterialSpecification& Surface,
                                         std::array<float, 3>                Normal,
                                         std::array<float, 3>                View,
                                         StochasticGenerator&                Generator) noexcept
{
    BsdfDirectionSample Result{};
    const float         NdotV = Dot3(Normal, View);
    if (NdotV <= 1.0e-4f)
    {
        return Result;
    }

    const float                ProbSpec   = ResolveSpecularSamplingProbabilityCpu(Surface);
    const float                Choice     = Generator.SampleUnit();
    const std::array<float, 2> RandomPair = Generator.SamplePair();
    const float                Rough      = (Surface.CoatWeight > 0.5f) ? std::min(Surface.Roughness, Surface.CoatRoughness) : Surface.Roughness;
    const float                Alpha      = std::max(0.035f, Rough * Rough);

    std::array<float, 3> LightDir{};
    bool                 ChoseSpecular = false;
    if (Choice < ProbSpec)
    {
        const std::array<float, 3> H = SampleGgxHalfVectorVndfCpu(Normal, View, Alpha, RandomPair);
        const float                VdH = Dot3(View, H);
        LightDir      = {2.0f * VdH * H[0] - View[0], 2.0f * VdH * H[1] - View[1], 2.0f * VdH * H[2] - View[2]};
        ChoseSpecular = true;
    }
    else
    {
        float DummyPdf = 0.0f;
        LightDir = SampleCosineHemisphereCpu(RandomPair, Normal, DummyPdf);
    }

    const float NdotL = Dot3(Normal, LightDir);
    if (NdotL <= 1.0e-4f)
    {
        return Result;
    }

    const float Pdf = EvaluateSurfaceBsdfPdfCpu(Surface, Normal, View, LightDir);
    if (Pdf <= 1.0e-5f)
    {
        return Result;
    }

    const std::array<float, 3> BsdfCos = EvaluateSurfaceBsdfCpu(Surface, Normal, View, LightDir);
    Result.Direction                   = LightDir;
    Result.Throughput                  = {BsdfCos[0] / Pdf, BsdfCos[1] / Pdf, BsdfCos[2] / Pdf};
    Result.Pdf                         = Pdf;
    Result.Specular                    = ChoseSpecular;
    return Result;
}

namespace
{

[[nodiscard]] std::array<float, 3> SampleSkyEnvironmentCpu(const PathTraceEnvironmentParameters& Env,
                                                           std::array<float, 3>                  Direction) noexcept
{
    const float Up = std::clamp(Direction[2], 0.0f, 1.0f);
    return {
        (Env.SkyHorizonRadiance[0] * (1.0f - Up) + Env.SkyZenithRadiance[0] * Up) * Env.SkyIntensity,
        (Env.SkyHorizonRadiance[1] * (1.0f - Up) + Env.SkyZenithRadiance[1] * Up) * Env.SkyIntensity,
        (Env.SkyHorizonRadiance[2] * (1.0f - Up) + Env.SkyZenithRadiance[2] * Up) * Env.SkyIntensity
    };
}

} // namespace

std::array<float, 3> EvaluateDirectNextEventCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              HitPosition,
    std::array<float, 3>                              HitNormal,
    std::array<float, 3>                              ViewDirection,
    const SurfaceMaterialSpecification&               Surface,
    float                                             NormalOffset,
    StochasticGenerator&                              Generator) noexcept
{
    std::array<float, 3>       Direct = {0.0f, 0.0f, 0.0f};
    const std::array<float, 3> Origin = {
        HitPosition[0] + HitNormal[0] * NormalOffset,
        HitPosition[1] + HitNormal[1] * NormalOffset,
        HitPosition[2] + HitNormal[2] * NormalOffset
    };

    const float SunPower = Environment.SunIlluminance[0] + Environment.SunIlluminance[1] + Environment.SunIlluminance[2];
    if (SunPower > 1.0e-4f)
    {
        const float                Angular = std::max(Environment.SolarAngularRadius, 0.00465f);
        const std::array<float, 2> DiscU   = Generator.SamplePair();
        const float                R       = std::sqrt(DiscU[0]) * std::sin(Angular);
        const float                Phi     = 2.0f * π * DiscU[1];
        std::array<float, 3>       SunT{}, SunB{};
        ConstructOrthonormalBasisCpu(Environment.SolarDirection, SunT, SunB);
        const float                Cz     = std::sqrt(std::max(0.0f, 1.0f - R * R));
        const std::array<float, 3> SunDir = Normalize3({
            SunT[0] * (R * std::cos(Phi)) + SunB[0] * (R * std::sin(Phi)) + Environment.SolarDirection[0] * Cz,
            SunT[1] * (R * std::cos(Phi)) + SunB[1] * (R * std::sin(Phi)) + Environment.SolarDirection[1] * Cz,
            SunT[2] * (R * std::cos(Phi)) + SunB[2] * (R * std::sin(Phi)) + Environment.SolarDirection[2] * Cz
        });
        const float NdotL = Dot3(HitNormal, SunDir);
        if (NdotL > 0.0f)
        {
            float Vis = 1.0f;
            if ((Environment.Features & FeatureSunShadows) != 0u)
            {
                Vis = RaySpace.TraceVisibilityCpu(Scene, Origin, SunDir, 1.0e-3f, 200.0f);
            }
            if (Vis > 0.0f)
            {
                const std::array<float, 3> Bsdf = EvaluateSurfaceBsdfCpu(Surface, HitNormal, ViewDirection, SunDir);
                Direct[0] += Bsdf[0] * Environment.SunIlluminance[0] * Vis;
                Direct[1] += Bsdf[1] * Environment.SunIlluminance[1] * Vis;
                Direct[2] += Bsdf[2] * Environment.SunIlluminance[2] * Vis;
            }
        }
    }

    if (Environment.CabinHmiActive)
    {
        const auto SampleHmiPanel = [&](std::array<float, 3> PanelCentre,
                                        std::array<float, 3> PanelNormal,
                                        float                HalfWidth,
                                        float                HalfHeight,
                                        std::array<float, 3> PanelRadiance)
        {
            std::array<float, 3> T{}, B{};
            ConstructOrthonormalBasisCpu(PanelNormal, T, B);
            const std::array<float, 2> U         = Generator.SamplePair();
            const float                Ox        = (U[0] * 2.0f - 1.0f) * HalfWidth;
            const float                Oy        = (U[1] * 2.0f - 1.0f) * HalfHeight;
            const std::array<float, 3> SamplePos = {
                PanelCentre[0] + T[0] * Ox + B[0] * Oy,
                PanelCentre[1] + T[1] * Ox + B[1] * Oy,
                PanelCentre[2] + T[2] * Ox + B[2] * Oy
            };
            const std::array<float, 3> ToPanel = {
                SamplePos[0] - HitPosition[0],
                SamplePos[1] - HitPosition[1],
                SamplePos[2] - HitPosition[2]
            };
            const float DistSq = Dot3(ToPanel, ToPanel);
            if (DistSq > 1.0e-5f && DistSq < 6.25f)
            {
                const float                Dist  = std::sqrt(DistSq);
                const std::array<float, 3> L     = {ToPanel[0] / Dist, ToPanel[1] / Dist, ToPanel[2] / Dist};
                const float                NdotL = Dot3(HitNormal, L);
                const float                EmitC = Dot3(PanelNormal, {-L[0], -L[1], -L[2]});
                if (NdotL > 0.0f && EmitC > 0.05f)
                {
                    const float Area     = (2.0f * HalfWidth) * (2.0f * HalfHeight);
                    const float SolidAng = (Area * EmitC) / std::max(DistSq, 1.0e-4f);
                    const float LightPdf = 1.0f / std::max(SolidAng, 1.0e-5f);
                    const float Vis      = RaySpace.TraceVisibilityCpu(Scene, Origin, L, 1.0e-3f, std::max(Dist - 0.008f, 2.0e-3f));
                    if (Vis > 0.0f)
                    {
                        const std::array<float, 3> Bsdf    = EvaluateSurfaceBsdfCpu(Surface, HitNormal, ViewDirection, L);
                        const float                BsdfPdf = EvaluateSurfaceBsdfPdfCpu(Surface, HitNormal, ViewDirection, L);
                        const float                MisW    = (LightPdf * LightPdf) / std::max(LightPdf * LightPdf + BsdfPdf * BsdfPdf, 1.0e-7f);
                        const float                Scale   = SolidAng * Vis * MisW * Environment.EmissionScale;
                        Direct[0] += Bsdf[0] * PanelRadiance[0] * Scale;
                        Direct[1] += Bsdf[1] * PanelRadiance[1] * Scale;
                        Direct[2] += Bsdf[2] * PanelRadiance[2] * Scale;
                    }
                }
            }
        };

        SampleHmiPanel(Environment.CabinTabletPosition,  Environment.CabinTabletNormal,  0.14f, 0.09f, {0.42f, 0.64f, 0.92f});
        SampleHmiPanel(Environment.CabinClusterPosition, Environment.CabinClusterNormal, 0.13f, 0.06f, {0.36f, 0.56f, 0.85f});
    }

    if ((Environment.Features & FeatureClusteredLights) != 0u &&
        ClusteredLights != nullptr &&
        ClusteredLights->ActiveCount() > 0u)
    {
        const int32_t Cell = ClusteredLights->QueryClusterCellIndexCpu(HitPosition);
        if (Cell >= 0)
        {
            const std::array<uint32_t, 2> Mask = ClusteredLights->QueryCellMaskCpu(static_cast<uint32_t>(Cell));
            uint32_t                      ChosenIndex  = 0u;
            std::array<float, 3>          ChosenArrival{};
            std::array<float, 3>          ChosenToLight{};
            float                         ChosenDist   = 0.0f;
            float                         ChosenTarget = 0.0f;
            float                         WeightSum    = 0.0f;
            bool                          HasChosen    = false;

            const auto& Lights = ClusteredLights->ActiveLights();
            for (uint32_t WordIdx = 0u; WordIdx < 2u; ++WordIdx)
            {
                uint32_t Bits = Mask[WordIdx];
                while (Bits != 0u)
                {
                    const uint32_t Bit      = static_cast<uint32_t>(__builtin_ctz(Bits));
                    Bits                   &= (Bits - 1u);
                    const uint32_t LightIdx = WordIdx * 32u + Bit;
                    if (LightIdx >= Lights.size())
                    {
                        break;
                    }

                    std::array<float, 3> ToLight{};
                    float                Dist    = 0.0f;
                    const auto           Arrival = EvaluateLightArrivalCpu(Lights[LightIdx], HitPosition, ToLight, Dist);
                    const float          NdotL   = Dot3(HitNormal, ToLight);
                    if (NdotL <= 0.0f)
                    {
                        continue;
                    }
                    const float Target = ResolveLuminanceCpu(Arrival) * NdotL;
                    if (Target <= 1.0e-5f)
                    {
                        continue;
                    }
                    WeightSum += Target;
                    if (Generator.SampleUnit() * WeightSum < Target)
                    {
                        ChosenIndex   = LightIdx;
                        ChosenArrival = Arrival;
                        ChosenToLight = ToLight;
                        ChosenDist    = Dist;
                        ChosenTarget  = Target;
                        HasChosen     = true;
                    }
                }
            }

            if (HasChosen && ChosenTarget > 1.0e-5f)
            {
                const float Vis = RaySpace.TraceVisibilityCpu(Scene, Origin, ChosenToLight, 1.0e-3f, std::max(ChosenDist - 0.03f, 2.0e-3f));
                if (Vis > 0.0f)
                {
                    const float                RisWeight = WeightSum / ChosenTarget;
                    const std::array<float, 3> Bsdf      = EvaluateSurfaceBsdfCpu(Surface, HitNormal, ViewDirection, ChosenToLight);
                    Direct[0] += Bsdf[0] * ChosenArrival[0] * (RisWeight * Vis);
                    Direct[1] += Bsdf[1] * ChosenArrival[1] * (RisWeight * Vis);
                    Direct[2] += Bsdf[2] * ChosenArrival[2] * (RisWeight * Vis);
                }
            }
        }
    }

    return Direct;
}

FirstBounceGatherSample TraceMultiBouncePathCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const std::vector<SurfaceMaterialSpecification>&  Materials,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              PrimaryPosition,
    std::array<float, 3>                              PrimaryNormal,
    std::array<float, 3>                              RayDirection,
    float                                             ProposalPdf,
    StochasticGenerator&                              Generator) noexcept
{
    FirstBounceGatherSample Result{};
    Result.SourcePdf = std::max(ProposalPdf, 1.0e-4f);

    const std::array<float, 3> RayStart = {
        PrimaryPosition[0] + PrimaryNormal[0] * 0.02f,
        PrimaryPosition[1] + PrimaryNormal[1] * 0.02f,
        PrimaryPosition[2] + PrimaryNormal[2] * 0.02f
    };
    const CpuRayIntersection FirstHit = RaySpace.TraceRayCpu(Scene, RayStart, RayDirection, 1.0e-3f, 200.0f);
    if (!FirstHit.Hit)
    {
        Result.Position = {
            PrimaryPosition[0] + RayDirection[0] * 200.0f,
            PrimaryPosition[1] + RayDirection[1] * 200.0f,
            PrimaryPosition[2] + RayDirection[2] * 200.0f
        };
        Result.Normal   = {-RayDirection[0], -RayDirection[1], -RayDirection[2]};
        Result.Radiance = SampleSkyEnvironmentCpu(Environment, RayDirection);
        Result.Occupant = SkyOccupantSentinel;
        return Result;
    }

    Result.Position = FirstHit.Position;
    Result.Normal   = FirstHit.Normal;
    Result.Occupant = FirstHit.Occupant;

    const uint32_t             MaxBounces  = std::clamp(Environment.BounceCount, 1u, 6u);
    std::array<float, 3>       Radiance    = {0.0f, 0.0f, 0.0f};
    std::array<float, 3>       Throughput  = {1.0f, 1.0f, 1.0f};
    std::array<float, 3>       VertexPos   = FirstHit.Position;
    std::array<float, 3>       VertexNorm  = FirstHit.Normal;
    std::array<float, 3>       IncomingDir = RayDirection;
    CourseMaterial             Family      = FirstHit.Family;

    for (uint32_t Bounce = 0u; Bounce < MaxBounces; ++Bounce)
    {
        const SurfaceMaterialSpecification& Surface = Materials[static_cast<size_t>(Family)];
        const std::array<float, 3>          ViewDir = {-IncomingDir[0], -IncomingDir[1], -IncomingDir[2]};

        if (Bounce == 0u)
        {
            Radiance[0] += Throughput[0] * Surface.RadiantExitance[0] * Environment.EmissionScale;
            Radiance[1] += Throughput[1] * Surface.RadiantExitance[1] * Environment.EmissionScale;
            Radiance[2] += Throughput[2] * Surface.RadiantExitance[2] * Environment.EmissionScale;
        }

        const std::array<float, 3> Direct = EvaluateDirectNextEventCpu(
            Scene,
            RaySpace,
            ClusteredLights,
            Environment,
            VertexPos,
            VertexNorm,
            ViewDir,
            Surface,
            0.025f,
            Generator);

        Radiance[0] += Throughput[0] * Direct[0];
        Radiance[1] += Throughput[1] * Direct[1];
        Radiance[2] += Throughput[2] * Direct[2];

        if (Bounce + 1u >= MaxBounces)
        {
            break;
        }

        const BsdfDirectionSample Sample = SampleSurfaceBsdfCpu(Surface, VertexNorm, ViewDir, Generator);
        if (Sample.Pdf <= 1.0e-5f)
        {
            break;
        }

        Throughput[0] *= Sample.Throughput[0];
        Throughput[1] *= Sample.Throughput[1];
        Throughput[2] *= Sample.Throughput[2];

        if (Bounce >= 1u)
        {
            const float Survival = std::clamp(std::max({Throughput[0], Throughput[1], Throughput[2]}), 0.08f, 0.95f);
            if (Generator.SampleUnit() > Survival)
            {
                break;
            }
            Throughput[0] /= Survival;
            Throughput[1] /= Survival;
            Throughput[2] /= Survival;
        }

        const std::array<float, 3> NextOrigin = {
            VertexPos[0] + VertexNorm[0] * 0.025f,
            VertexPos[1] + VertexNorm[1] * 0.025f,
            VertexPos[2] + VertexNorm[2] * 0.025f
        };
        const CpuRayIntersection NextHit = RaySpace.TraceRayCpu(Scene, NextOrigin, Sample.Direction, 1.0e-3f, 200.0f);
        if (!NextHit.Hit)
        {
            const std::array<float, 3> Sky = SampleSkyEnvironmentCpu(Environment, Sample.Direction);
            Radiance[0] += Throughput[0] * Sky[0];
            Radiance[1] += Throughput[1] * Sky[1];
            Radiance[2] += Throughput[2] * Sky[2];
            break;
        }

        const SurfaceMaterialSpecification& NextSurface = Materials[static_cast<size_t>(NextHit.Family)];
        const float                         NextEmitLum = ResolveLuminanceCpu(NextSurface.RadiantExitance);
        if (NextEmitLum > 1.0e-4f)
        {
            float MisWeight = 1.0f;
            if (!Sample.Specular && NextHit.Family == CourseMaterial::DisplayGlass && Environment.CabinHmiActive)
            {
                const float DistSq   = NextHit.Travel * NextHit.Travel;
                const float EmitCos  = std::max(Dot3(NextHit.Normal, {-Sample.Direction[0], -Sample.Direction[1], -Sample.Direction[2]}), 0.05f);
                const float SolidAng = (0.042f * EmitCos) / std::max(DistSq, 1.0e-4f);
                const float LightPdf = 1.0f / std::max(SolidAng, 1.0e-5f);
                MisWeight            = (Sample.Pdf * Sample.Pdf) / std::max(Sample.Pdf * Sample.Pdf + LightPdf * LightPdf, 1.0e-7f);
            }
            Radiance[0] += Throughput[0] * NextSurface.RadiantExitance[0] * Environment.EmissionScale * MisWeight;
            Radiance[1] += Throughput[1] * NextSurface.RadiantExitance[1] * Environment.EmissionScale * MisWeight;
            Radiance[2] += Throughput[2] * NextSurface.RadiantExitance[2] * Environment.EmissionScale * MisWeight;
        }

        VertexPos   = NextHit.Position;
        VertexNorm  = NextHit.Normal;
        IncomingDir = Sample.Direction;
        Family      = NextHit.Family;
    }

    const float Lum     = ResolveLuminanceCpu(Radiance);
    const float MaxLum  = ((Environment.Features & FeatureReflectionFirefly) != 0u) ? 28.0f : 64.0f;
    if (Lum > MaxLum)
    {
        const float Scale = MaxLum / Lum;
        Radiance = {Radiance[0] * Scale, Radiance[1] * Scale, Radiance[2] * Scale};
    }

    Result.Radiance = Radiance;
    return Result;
}

ReflectionTraceSample TraceMultiBounceReflectionCpu(
    const SceneFacetCollection&                       Scene,
    const RayTracingSpace&                            RaySpace,
    const std::vector<SurfaceMaterialSpecification>&  Materials,
    const ClusteredLightingSequence*                  ClusteredLights,
    const PathTraceEnvironmentParameters&             Environment,
    std::array<float, 3>                              PrimaryPosition,
    std::array<float, 3>                              PrimaryNormal,
    std::array<float, 3>                              MirrorDirection,
    float                                             PrimaryRoughness,
    StochasticGenerator&                              Generator) noexcept
{
    std::array<float, 3> RayDir = MirrorDirection;
    if (PrimaryRoughness > 0.025f)
    {
        const float                Alpha  = PrimaryRoughness * PrimaryRoughness;
        const std::array<float, 2> U      = Generator.SamplePair();
        const std::array<float, 3> Jitter = SampleGgxHalfVectorVndfCpu(MirrorDirection, MirrorDirection, Alpha * 0.65f, U);
        if (Dot3(Jitter, PrimaryNormal) > 0.02f)
        {
            RayDir = Jitter;
        }
    }

    const std::array<float, 3> Start = {
        PrimaryPosition[0] + PrimaryNormal[0] * 0.02f,
        PrimaryPosition[1] + PrimaryNormal[1] * 0.02f,
        PrimaryPosition[2] + PrimaryNormal[2] * 0.02f
    };
    const CpuRayIntersection FirstHit = RaySpace.TraceRayCpu(Scene, Start, RayDir, 1.0e-3f, 200.0f);
    if (!FirstHit.Hit)
    {
        return {SampleSkyEnvironmentCpu(Environment, RayDir), 500.0f};
    }

    const FirstBounceGatherSample Gather = TraceMultiBouncePathCpu(
        Scene,
        RaySpace,
        Materials,
        ClusteredLights,
        Environment,
        PrimaryPosition,
        PrimaryNormal,
        RayDir,
        1.0f,
        Generator);

    return {Gather.Radiance, FirstHit.Travel};
}

//------------------------------------------------------------------------------------------------------------------------
//                                         RESERVOIR RECORDS & REUSE OPERATORS
//------------------------------------------------------------------------------------------------------------------------

float ResolveTargetDensityCpu(std::array<float, 3> ReceiverPosition,
                              std::array<float, 3> ReceiverNormal,
                              std::array<float, 3> SamplePosition,
                              std::array<float, 3> SampleRadiance) noexcept
{
    const std::array<float, 3> Direction = Normalize3({
        SamplePosition[0] - ReceiverPosition[0],
        SamplePosition[1] - ReceiverPosition[1],
        SamplePosition[2] - ReceiverPosition[2]
    });
    const float Cosine = std::max(0.0f, Dot3(ReceiverNormal, Direction));
    return ResolveLuminanceCpu(SampleRadiance) * Cosine;
}

float EvaluateReconnectionJacobianCpu(std::array<float, 3> ReceiverPosition,
                                      std::array<float, 3> NeighbourPosition,
                                      std::array<float, 3> SamplePosition,
                                      std::array<float, 3> SampleNormal,
                                      uint32_t             SampleOccupant) noexcept
{
    if (SampleOccupant == SkyOccupantSentinel)
    {
        return 1.0f;
    }
    const std::array<float, 3> ToReceiver = {
        ReceiverPosition[0] - SamplePosition[0],
        ReceiverPosition[1] - SamplePosition[1],
        ReceiverPosition[2] - SamplePosition[2]
    };
    const std::array<float, 3> ToNeighbour = {
        NeighbourPosition[0] - SamplePosition[0],
        NeighbourPosition[1] - SamplePosition[1],
        NeighbourPosition[2] - SamplePosition[2]
    };
    const float DistSqReceiver  = std::max(Dot3(ToReceiver, ToReceiver), 1.0e-4f);
    const float DistSqNeighbour = std::max(Dot3(ToNeighbour, ToNeighbour), 1.0e-4f);
    const float DistReceiver    = std::sqrt(DistSqReceiver);
    const float DistNeighbour   = std::sqrt(DistSqNeighbour);
    const float CosReceiver     = std::abs(Dot3(SampleNormal, {ToReceiver[0] / DistReceiver, ToReceiver[1] / DistReceiver, ToReceiver[2] / DistReceiver}));
    const float CosNeighbour    = std::max(std::abs(Dot3(SampleNormal, {ToNeighbour[0] / DistNeighbour, ToNeighbour[1] / DistNeighbour, ToNeighbour[2] / DistNeighbour})), 1.0e-4f);
    return std::clamp((CosReceiver * DistSqNeighbour) / (CosNeighbour * DistSqReceiver), 0.0f, 8.0f);
}

bool CombineVehicleReservoir(VehicleReservoirRecord& State,
                             std::array<float, 3>    SamplePosition,
                             std::array<float, 3>    SampleNormal,
                             std::array<float, 3>    SampleRadiance,
                             uint32_t                SampleOccupant,
                             float                   TargetDensity,
                             float                   ResampleWeight,
                             float                   CandidateTally,
                             float                   RandomUnit) noexcept
{
    const float SanitizedWeight = std::max(0.0f, ResampleWeight);
    State.WeightSum            += SanitizedWeight;
    State.SampleTally          += CandidateTally;
    if (State.WeightSum <= 0.0f)
    {
        return false;
    }
    const bool Accept = (RandomUnit * State.WeightSum) < SanitizedWeight;
    if (Accept)
    {
        State.SamplePosition = SamplePosition;
        State.SampleOccupant = SampleOccupant;
        State.SampleRadiance = SampleRadiance;
        State.PackedNormal   = PackOctahedralCpu(SampleNormal);
        State.TargetDensity  = TargetDensity;
    }
    return Accept;
}

void FinalizeVehicleReservoir(VehicleReservoirRecord& State, float NormalizationDenominator) noexcept
{
    const float Denom = State.TargetDensity * NormalizationDenominator;
    State.WeightFactor = (Denom > 1.0e-6f) ? std::min(State.WeightSum / Denom, 10.0f) : 0.0f;
}

void CarryReservoirSampleCpu(const SceneFacetCollection& Scene,
                             VehicleReservoirRecord&     Reservoir,
                             std::array<float, 3>&       InOutSampleNormal) noexcept
{
    if (Reservoir.SampleOccupant == SkyOccupantSentinel ||
        Reservoir.SampleOccupant >= Scene.Occupants.size())
    {
        return;
    }
    const SceneOccupantInstance& Occupant       = Scene.Occupants[Reservoir.SampleOccupant];
    const std::array<float, 16>  PreviousToLocal = InvertRigidOrAffineTransform(Occupant.PreviousTransform);
    const std::array<float, 3>   LocalPosition  = MulMat4PointCpu(PreviousToLocal, Reservoir.SamplePosition);
    const std::array<float, 3>   LocalNormal    = MulMat3DirCpu(PreviousToLocal, InOutSampleNormal);
    Reservoir.SamplePosition                    = MulMat4PointCpu(Occupant.Transform, LocalPosition);
    InOutSampleNormal                           = Normalize3(MulMat3DirCpu(Occupant.Transform, LocalNormal));
    Reservoir.PackedNormal                      = PackOctahedralCpu(InOutSampleNormal);
}

//------------------------------------------------------------------------------------------------------------------------
//                                          RESAMPLING & VARIANCE SEQUENCE
//------------------------------------------------------------------------------------------------------------------------

void ResamplingAndVarianceSequence::ConfigureDimensions(uint32_t ScreenWidth,
                                                        uint32_t ScreenHeight,
                                                        uint32_t TraceScale)
{
    ScreenWidth_  = std::max(1u, ScreenWidth);
    ScreenHeight_ = std::max(1u, ScreenHeight);
    TraceScale_   = std::max(1u, TraceScale);
    TraceWidth_   = std::max(1u, (ScreenWidth_  + TraceScale_ - 1u) / TraceScale_);
    TraceHeight_  = std::max(1u, (ScreenHeight_ + TraceScale_ - 1u) / TraceScale_);

    const size_t Count = static_cast<size_t>(TraceWidth_) * static_cast<size_t>(TraceHeight_);
    PriorGuides_.assign(Count, TracePixelGuide{});
    PriorReservoirs_.assign(Count, VehicleReservoirRecord{});
    TemporalReservoirs_.assign(Count, VehicleReservoirRecord{});
    SpatialReservoirs_.assign(Count, VehicleReservoirRecord{});
    ResampledIrradiance_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
    PriorFiltered_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
    PriorMoments_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
    CurrentMoments_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
    FilteredIrradiance_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
    WaveletScratch_.assign(Count, {0.0f, 0.0f, 0.0f, 0.0f});
}

void ResamplingAndVarianceSequence::StepTemporalAndSpatialReuseCpu(
    const SceneFacetCollection&                      Scene,
    const RayTracingSpace&                           RaySpace,
    const std::vector<SurfaceMaterialSpecification>& Materials,
    const ClusteredLightingSequence*                 ClusteredLights,
    const PathTraceEnvironmentParameters&            Environment,
    const std::vector<TracePixelGuide>&              TraceGuides,
    uint32_t                                         StepIndex)
{
    const uint32_t Width  = TraceWidth_;
    const uint32_t Height = TraceHeight_;
    if (Width == 0u || Height == 0u || TraceGuides.size() < static_cast<size_t>(Width * Height))
    {
        return;
    }

    for (uint32_t Y = 0u; Y < Height; ++Y)
    {
        for (uint32_t X = 0u; X < Width; ++X)
        {
            const size_t           Linear = static_cast<size_t>(Y) * Width + X;
            const TracePixelGuide& Guide  = TraceGuides[Linear];
            if (Guide.ViewDepth <= 0.0f)
            {
                TemporalReservoirs_[Linear] = VehicleReservoirRecord{};
                continue;
            }

            StochasticGenerator        Generator = ConstructGeneratorCpu(X, Y, StepIndex, 17u);
            const std::array<float, 2> Blue      = EvaluateDiscrepancyPairCpu(StepIndex * 131u + X * 17u + Y * 29u);
            const std::array<float, 2> Jitter    = Generator.SamplePair();
            const std::array<float, 2> SampleU   = {
                (Blue[0] + Jitter[0] * 0.25f) - std::floor(Blue[0] + Jitter[0] * 0.25f),
                (Blue[1] + Jitter[1] * 0.25f) - std::floor(Blue[1] + Jitter[1] * 0.25f)
            };

            float                      SourcePdf = 0.0f;
            const std::array<float, 3> RayDir    = SampleCosineHemisphereCpu(SampleU, Guide.WorldNormal, SourcePdf);
            const FirstBounceGatherSample Gather = TraceMultiBouncePathCpu(
                Scene,
                RaySpace,
                Materials,
                ClusteredLights,
                Environment,
                Guide.WorldPosition,
                Guide.WorldNormal,
                RayDir,
                SourcePdf,
                Generator);

            VehicleReservoirRecord Current{};
            const float            FreshTarget = ResolveTargetDensityCpu(
                Guide.WorldPosition,
                Guide.WorldNormal,
                Gather.Position,
                Gather.Radiance);
            const float FreshWeight = FreshTarget / std::max(Gather.SourcePdf, 1.0e-4f);
            CombineVehicleReservoir(
                Current,
                Gather.Position,
                Gather.Normal,
                Gather.Radiance,
                Gather.Occupant,
                FreshTarget,
                FreshWeight,
                1.0f,
                Generator.SampleUnit());

            if ((Environment.Features & FeatureTemporalAccumulation) != 0u &&
                (Environment.Features & FeatureTemporalRestart) == 0u &&
                StepIndex > 0u)
            {
                const int32_t PriorX = static_cast<int32_t>(std::round(static_cast<float>(X) - Guide.MotionPixels[0] / static_cast<float>(TraceScale_)));
                const int32_t PriorY = static_cast<int32_t>(std::round(static_cast<float>(Y) - Guide.MotionPixels[1] / static_cast<float>(TraceScale_)));
                if (PriorX >= 0 && PriorX < static_cast<int32_t>(Width) &&
                    PriorY >= 0 && PriorY < static_cast<int32_t>(Height))
                {
                    const size_t           PriorLinear = static_cast<size_t>(PriorY) * Width + static_cast<size_t>(PriorX);
                    const TracePixelGuide& PriorGuide  = PriorGuides_[PriorLinear];
                    if (PriorGuide.ViewDepth > 0.0f &&
                        Dot3(Guide.WorldNormal, PriorGuide.WorldNormal) > 0.85f &&
                        std::abs(PriorGuide.ViewDepth - Guide.ExpectedDepth) < std::max(0.15f, 0.06f * Guide.ViewDepth))
                    {
                        VehicleReservoirRecord Prior = PriorReservoirs_[PriorLinear];
                        if (Prior.SampleTally > 0.0f)
                        {
                            std::array<float, 3> PriorNormal = UnpackOctahedralCpu(Prior.PackedNormal);
                            CarryReservoirSampleCpu(Scene, Prior, PriorNormal);
                            const float ClampedTally = std::min(Prior.SampleTally, TemporalHistoryCap);
                            float       PriorTarget  = ResolveTargetDensityCpu(
                                Guide.WorldPosition,
                                Guide.WorldNormal,
                                Prior.SamplePosition,
                                Prior.SampleRadiance);

                            if (PriorTarget > 0.0f && ((X + Y + StepIndex) & 3u) == 0u)
                            {
                                const std::array<float, 3> ToSample = {
                                    Prior.SamplePosition[0] - Guide.WorldPosition[0],
                                    Prior.SamplePosition[1] - Guide.WorldPosition[1],
                                    Prior.SamplePosition[2] - Guide.WorldPosition[2]
                                };
                                const float Dist = std::sqrt(Dot3(ToSample, ToSample));
                                if (Dist > 1.0e-3f)
                                {
                                    const std::array<float, 3> Dir = {ToSample[0] / Dist, ToSample[1] / Dist, ToSample[2] / Dist};
                                    const std::array<float, 3> Orig = {
                                        Guide.WorldPosition[0] + Guide.WorldNormal[0] * 0.03f,
                                        Guide.WorldPosition[1] + Guide.WorldNormal[1] * 0.03f,
                                        Guide.WorldPosition[2] + Guide.WorldNormal[2] * 0.03f
                                    };
                                    const float Reach = (Prior.SampleOccupant == SkyOccupantSentinel) ? 160.0f : std::max(0.02f, Dist - 0.05f);
                                    if (RaySpace.TraceVisibilityCpu(Scene, Orig, Dir, 1.0e-3f, Reach) < 0.05f)
                                    {
                                        PriorTarget = 0.0f;
                                    }
                                }
                            }

                            const float PriorWeight = PriorTarget * Prior.WeightFactor * ClampedTally;
                            CombineVehicleReservoir(
                                Current,
                                Prior.SamplePosition,
                                PriorNormal,
                                Prior.SampleRadiance,
                                Prior.SampleOccupant,
                                PriorTarget,
                                PriorWeight,
                                ClampedTally,
                                Generator.SampleUnit());
                        }
                    }
                }
            }

            FinalizeVehicleReservoir(Current, Current.SampleTally);
            TemporalReservoirs_[Linear] = Current;
        }
    }

    constexpr std::array<std::array<float, 2>, 8> SpatialSpiral = {{
        { 1.0f,  0.0f}, {-0.707f,  0.707f}, { 0.0f, -1.0f}, { 0.707f,  0.707f},
        {-1.0f,  0.0f}, { 0.707f, -0.707f}, { 0.0f,  1.0f}, {-0.707f, -0.707f}
    }};

    for (uint32_t Y = 0u; Y < Height; ++Y)
    {
        for (uint32_t X = 0u; X < Width; ++X)
        {
            const size_t           Linear = static_cast<size_t>(Y) * Width + X;
            const TracePixelGuide& Guide  = TraceGuides[Linear];
            if (Guide.ViewDepth <= 0.0f)
            {
                SpatialReservoirs_[Linear]   = VehicleReservoirRecord{};
                ResampledIrradiance_[Linear] = {0.0f, 0.0f, 0.0f, 0.0f};
                continue;
            }

            const VehicleReservoirRecord Self = TemporalReservoirs_[Linear];
            VehicleReservoirRecord       Combined{};
            StochasticGenerator          Generator = ConstructGeneratorCpu(X, Y, StepIndex, 91u);

            const float SelfTarget = ResolveTargetDensityCpu(
                Guide.WorldPosition,
                Guide.WorldNormal,
                Self.SamplePosition,
                Self.SampleRadiance);
            CombineVehicleReservoir(
                Combined,
                Self.SamplePosition,
                UnpackOctahedralCpu(Self.PackedNormal),
                Self.SampleRadiance,
                Self.SampleOccupant,
                SelfTarget,
                SelfTarget * Self.WeightFactor * Self.SampleTally,
                Self.SampleTally,
                Generator.SampleUnit());

            if ((Environment.Features & FeatureSpatialResampling) != 0u)
            {
                const float Radius = (Self.SampleTally < 4.0f) ? 12.0f : 6.0f;
                const float Angle  = Generator.SampleUnit() * 6.28318530718f;
                const float CosA   = std::cos(Angle);
                const float SinA   = std::sin(Angle);

                for (uint32_t Tap = 0u; Tap < 4u; ++Tap)
                {
                    const auto& BaseDir = SpatialSpiral[Tap];
                    const float Rx      = BaseDir[0] * CosA - BaseDir[1] * SinA;
                    const float Ry      = BaseDir[0] * SinA + BaseDir[1] * CosA;
                    const float Scale   = Radius * (0.35f + 0.65f * (static_cast<float>(Tap) + 0.5f) / 4.0f);
                    const int32_t Nx    = static_cast<int32_t>(std::round(static_cast<float>(X) + Rx * Scale));
                    const int32_t Ny    = static_cast<int32_t>(std::round(static_cast<float>(Y) + Ry * Scale));
                    if (Nx < 0 || Nx >= static_cast<int32_t>(Width) ||
                        Ny < 0 || Ny >= static_cast<int32_t>(Height) ||
                        (Nx == static_cast<int32_t>(X) && Ny == static_cast<int32_t>(Y)))
                    {
                        continue;
                    }

                    const size_t           NeighbourLinear = static_cast<size_t>(Ny) * Width + static_cast<size_t>(Nx);
                    const TracePixelGuide& NeighbourGuide  = TraceGuides[NeighbourLinear];
                    if (NeighbourGuide.ViewDepth <= 0.0f)
                    {
                        continue;
                    }
                    if (Dot3(Guide.WorldNormal, NeighbourGuide.WorldNormal) < 0.85f ||
                        std::abs(NeighbourGuide.ViewDepth - Guide.ViewDepth) > 0.1f * Guide.ViewDepth)
                    {
                        continue;
                    }

                    const VehicleReservoirRecord Neighbour = TemporalReservoirs_[NeighbourLinear];
                    if (Neighbour.SampleTally <= 0.0f || Neighbour.WeightFactor <= 0.0f)
                    {
                        continue;
                    }

                    const std::array<float, 3> SampleNormal = UnpackOctahedralCpu(Neighbour.PackedNormal);
                    const float                MaxJacobian  = ((Environment.Features & FeatureReflectionFirefly) != 0u) ? 5.0f : 8.0f;
                    const float                Jacobian     = std::min(
                        EvaluateReconnectionJacobianCpu(
                            Guide.WorldPosition,
                            NeighbourGuide.WorldPosition,
                            Neighbour.SamplePosition,
                            SampleNormal,
                            Neighbour.SampleOccupant),
                        MaxJacobian);
                    if (Jacobian <= 0.0f)
                    {
                        continue;
                    }

                    float ShiftedTarget = ResolveTargetDensityCpu(
                        Guide.WorldPosition,
                        Guide.WorldNormal,
                        Neighbour.SamplePosition,
                        Neighbour.SampleRadiance) * Jacobian;

                    if (ShiftedTarget > 0.0f && (Environment.Features & FeatureVisibilityReuse) != 0u)
                    {
                        const std::array<float, 3> ToSample = {
                            Neighbour.SamplePosition[0] - Guide.WorldPosition[0],
                            Neighbour.SamplePosition[1] - Guide.WorldPosition[1],
                            Neighbour.SamplePosition[2] - Guide.WorldPosition[2]
                        };
                        const float Dist = std::sqrt(Dot3(ToSample, ToSample));
                        if (Dist > 1.0e-3f)
                        {
                            const std::array<float, 3> Dir  = {ToSample[0] / Dist, ToSample[1] / Dist, ToSample[2] / Dist};
                            const std::array<float, 3> Orig = {
                                Guide.WorldPosition[0] + Guide.WorldNormal[0] * 0.03f,
                                Guide.WorldPosition[1] + Guide.WorldNormal[1] * 0.03f,
                                Guide.WorldPosition[2] + Guide.WorldNormal[2] * 0.03f
                            };
                            const float Reach = (Neighbour.SampleOccupant == SkyOccupantSentinel) ? 160.0f : std::max(0.02f, Dist - 0.05f);
                            const float Vis   = RaySpace.TraceVisibilityCpu(Scene, Orig, Dir, 1.0e-3f, Reach);
                            ShiftedTarget *= Vis;
                        }
                    }

                    const float ClampedTally = std::min(Neighbour.SampleTally, 12.0f);
                    CombineVehicleReservoir(
                        Combined,
                        Neighbour.SamplePosition,
                        SampleNormal,
                        Neighbour.SampleRadiance,
                        Neighbour.SampleOccupant,
                        ShiftedTarget,
                        ShiftedTarget * Neighbour.WeightFactor * ClampedTally,
                        ClampedTally,
                        Generator.SampleUnit());
                }
            }

            FinalizeVehicleReservoir(Combined, Combined.SampleTally);
            SpatialReservoirs_[Linear] = Combined;

            std::array<float, 3> Irradiance = {0.0f, 0.0f, 0.0f};
            if (Combined.WeightFactor > 0.0f && Combined.SampleTally > 0.0f)
            {
                const std::array<float, 3> Dir = Normalize3({
                    Combined.SamplePosition[0] - Guide.WorldPosition[0],
                    Combined.SamplePosition[1] - Guide.WorldPosition[1],
                    Combined.SamplePosition[2] - Guide.WorldPosition[2]
                });
                const float Cosine = std::max(0.0f, Dot3(Guide.WorldNormal, Dir));
                Irradiance = {
                    Combined.SampleRadiance[0] * (Cosine * Combined.WeightFactor),
                    Combined.SampleRadiance[1] * (Cosine * Combined.WeightFactor),
                    Combined.SampleRadiance[2] * (Cosine * Combined.WeightFactor)
                };
            }
            ResampledIrradiance_[Linear] = {Irradiance[0], Irradiance[1], Irradiance[2], Combined.SampleTally};
        }
    }

    PriorGuides_     = TraceGuides;
    PriorReservoirs_ = SpatialReservoirs_;
}

void ResamplingAndVarianceSequence::StepVarianceFilterCpu(const std::vector<TracePixelGuide>& TraceGuides,
                                                          uint32_t                            StepIndex,
                                                          bool                                EnableVarianceKernel)
{
    const uint32_t Width  = TraceWidth_;
    const uint32_t Height = TraceHeight_;
    if (Width == 0u || Height == 0u || TraceGuides.size() < static_cast<size_t>(Width * Height))
    {
        return;
    }

    for (uint32_t Y = 0u; Y < Height; ++Y)
    {
        for (uint32_t X = 0u; X < Width; ++X)
        {
            const size_t           Linear = static_cast<size_t>(Y) * Width + X;
            const TracePixelGuide& Guide  = TraceGuides[Linear];
            if (Guide.ViewDepth <= 0.0f)
            {
                FilteredIrradiance_[Linear] = {0.0f, 0.0f, 0.0f, 0.0f};
                CurrentMoments_[Linear]     = {0.0f, 0.0f, 0.0f, 0.0f};
                continue;
            }

            const std::array<float, 3> Fresh = {
                ResampledIrradiance_[Linear][0],
                ResampledIrradiance_[Linear][1],
                ResampledIrradiance_[Linear][2]
            };
            std::array<float, 3> Signal  = Fresh;
            const float          Lum     = ResolveLuminanceCpu(Fresh);
            std::array<float, 2> Moments = {Lum, Lum * Lum};
            float                Tally   = 1.0f;

            if (StepIndex > 0u && PriorMoments_[Linear][2] > 0.0f)
            {
                const std::array<float, 4>& PriorSig = PriorFiltered_[Linear];
                const std::array<float, 4>& PriorMom = PriorMoments_[Linear];
                Tally                                = std::min(PriorMom[2] + 1.0f, 32.0f);
                const float Blend                    = std::max(1.0f / Tally, 0.05f);
                Signal = {
                    PriorSig[0] * (1.0f - Blend) + Fresh[0] * Blend,
                    PriorSig[1] * (1.0f - Blend) + Fresh[1] * Blend,
                    PriorSig[2] * (1.0f - Blend) + Fresh[2] * Blend
                };
                const float SignalLum = ResolveLuminanceCpu(Signal);
                const float MomBlend  = std::max(Blend, 0.12f);
                Moments = {
                    PriorMom[0] * (1.0f - MomBlend) + SignalLum * MomBlend,
                    PriorMom[1] * (1.0f - MomBlend) + (SignalLum * SignalLum) * MomBlend
                };
            }

            const float Variance        = std::max(0.0f, Moments[1] - Moments[0] * Moments[0]);
            const float Boost           = (Tally < 4.0f) ? (4.0f / Tally) : 1.0f;
            FilteredIrradiance_[Linear] = {Signal[0], Signal[1], Signal[2], Variance * Boost};
            CurrentMoments_[Linear]     = {Moments[0], Moments[1], Tally, 1.0f};
        }
    }

    if (EnableVarianceKernel)
    {
        constexpr std::array<float, 5> KernelWeights = {1.0f / 16.0f, 1.0f / 4.0f, 3.0f / 8.0f, 1.0f / 4.0f, 1.0f / 16.0f};
        constexpr std::array<uint32_t, 3> StepWidths = {1u, 2u, 4u};

        for (size_t PassIndex = 0u; PassIndex < StepWidths.size(); ++PassIndex)
        {
            const int32_t Step     = static_cast<int32_t>(StepWidths[PassIndex]);
            const float   PhiColor = (PassIndex == 0u) ? 3.2f : (PassIndex == 1u ? 2.4f : 1.8f);

            for (uint32_t Y = 0u; Y < Height; ++Y)
            {
                for (uint32_t X = 0u; X < Width; ++X)
                {
                    const size_t           Linear    = static_cast<size_t>(Y) * Width + X;
                    const TracePixelGuide& Guide     = TraceGuides[Linear];
                    const auto             CentreVal = FilteredIrradiance_[Linear];
                    if (Guide.ViewDepth <= 0.0f)
                    {
                        WaveletScratch_[Linear] = {0.0f, 0.0f, 0.0f, 0.0f};
                        continue;
                    }

                    const float CentreLum = ResolveLuminanceCpu({CentreVal[0], CentreVal[1], CentreVal[2]});
                    const float SigmaLum  = PhiColor * std::sqrt(std::max(0.0f, CentreVal[3])) + 1.0e-4f;

                    std::array<float, 3> SumSignal   = {CentreVal[0], CentreVal[1], CentreVal[2]};
                    float                SumVariance = CentreVal[3];
                    float                SumWeight   = 1.0f;

                    for (int32_t Ky = -2; Ky <= 2; ++Ky)
                    {
                        for (int32_t Kx = -2; Kx <= 2; ++Kx)
                        {
                            if (Kx == 0 && Ky == 0)
                            {
                                continue;
                            }
                            const int32_t Sx = static_cast<int32_t>(X) + Kx * Step;
                            const int32_t Sy = static_cast<int32_t>(Y) + Ky * Step;
                            if (Sx < 0 || Sx >= static_cast<int32_t>(Width) ||
                                Sy < 0 || Sy >= static_cast<int32_t>(Height))
                            {
                                continue;
                            }
                            const size_t           TapLinear = static_cast<size_t>(Sy) * Width + static_cast<size_t>(Sx);
                            const TracePixelGuide& TapGuide  = TraceGuides[TapLinear];
                            if (TapGuide.ViewDepth <= 0.0f)
                            {
                                continue;
                            }

                            const float NormW  = std::pow(std::max(0.0f, Dot3(Guide.WorldNormal, TapGuide.WorldNormal)), 64.0f);
                            const float DepthW = std::exp(-std::abs(Guide.ViewDepth - TapGuide.ViewDepth)
                                                        / std::max(0.04f * Guide.ViewDepth * static_cast<float>(Step), 1.0e-4f));
                            const auto  TapVal = FilteredIrradiance_[TapLinear];
                            const float TapLum = ResolveLuminanceCpu({TapVal[0], TapVal[1], TapVal[2]});
                            const float LumW   = std::exp(-std::abs(CentreLum - TapLum) / SigmaLum);

                            const float Kernel = KernelWeights[static_cast<size_t>(Kx + 2)] * KernelWeights[static_cast<size_t>(Ky + 2)];
                            const float Weight = Kernel * NormW * DepthW * LumW;

                            SumSignal[0] += TapVal[0] * Weight;
                            SumSignal[1] += TapVal[1] * Weight;
                            SumSignal[2] += TapVal[2] * Weight;
                            SumVariance  += TapVal[3] * (Weight * Weight);
                            SumWeight    += Weight;
                        }
                    }

                    const float InvW = 1.0f / std::max(SumWeight, 1.0e-5f);
                    WaveletScratch_[Linear] = {
                        SumSignal[0] * InvW,
                        SumSignal[1] * InvW,
                        SumSignal[2] * InvW,
                        SumVariance * InvW * InvW
                    };
                }
            }
            FilteredIrradiance_.swap(WaveletScratch_);
            if (PassIndex == 0u)
            {
                PriorFiltered_ = FilteredIrradiance_;
            }
        }
    }
    else
    {
        PriorFiltered_ = FilteredIrradiance_;
    }

    PriorMoments_ = CurrentMoments_;
}

//------------------------------------------------------------------------------------------------------------------------
//                                           SHADER COMPILATION VALIDATOR
//------------------------------------------------------------------------------------------------------------------------

ShaderCompilationSummary VerifyVehicleHmiShaderSuite(const std::filesystem::path& ShaderDirectory,
                                                     const std::filesystem::path& SlangCompilerPath)
{
    struct ShaderSpec
    {
        const char* FileName;
        const char* EntryPoint;
        const char* Stage;
    };

    static constexpr std::array<ShaderSpec, 16> Suite = {{
        {"DistanceTransfer.slang",     "TransferDistance",        "compute"},
        {"FragmentDistance.slang",     "ComputeFragmentDistance", "compute"},
        {"DistanceUnion.slang",        "UniteDistance",           "compute"},
        {"CardCapture.slang",          "CaptureVertex",           "vertex"},
        {"CardCapture.slang",          "CaptureFragment",         "fragment"},
        {"CardDirect.slang",           "IntegrateCardDirect",     "compute"},
        {"CardRadiosity.slang",        "IntegrateCardRadiosity",  "compute"},
        {"CardFinal.slang",            "IntegrateCardFinal",      "compute"},
        {"DirectRadiance.slang",       "IntegrateDirectRadiance", "compute"},
        {"ReservoirTemporal.slang",    "ResampleTemporal",        "compute"},
        {"ReservoirSpatial.slang",     "ResampleSpatial",         "compute"},
        {"ReflectionTraversal.slang",  "TraverseReflection",      "compute"},
        {"VarianceTemporal.slang",     "IntegrateTemporal",       "compute"},
        {"VarianceWavelet.slang",      "ConvolveWavelet",         "compute"},
        {"VarianceUpsample.slang",     "ProjectScreenSignal",     "compute"},
        {"DisplayRecombination.slang", "ResolveRecombination",    "compute"}
    }};

    ShaderCompilationSummary Summary{};
    for (const ShaderSpec& Spec : Suite)
    {
        const std::filesystem::path SourcePath = ShaderDirectory / Spec.FileName;
        const std::filesystem::path OutputPath = std::filesystem::temp_directory_path() / (std::string(Spec.EntryPoint) + ".spv");
        const std::string Command = "\"" + SlangCompilerPath.string() + "\" \"" + SourcePath.string() +
                                    "\" -target spirv -profile spirv_1_5 -I \"" + ShaderDirectory.string() +
                                    "\" -entry " + Spec.EntryPoint + " -stage " + Spec.Stage +
                                    " -o \"" + OutputPath.string() + "\"";
        const int ExitCode = std::system(Command.c_str());
        if (ExitCode == 0 && std::filesystem::exists(OutputPath))
        {
            const auto Size = static_cast<uint32_t>(std::filesystem::file_size(OutputPath));
            if (Size > 0u)
            {
                ++Summary.CompiledCount;
                Summary.TotalBytes += Size;
                Summary.CompiledEntryPoints.emplace_back(Spec.EntryPoint);
            }
            std::filesystem::remove(OutputPath);
        }
    }
    return Summary;
}

} // namespace Frontier
