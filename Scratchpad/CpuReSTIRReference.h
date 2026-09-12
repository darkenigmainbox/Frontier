//============================================================================================================================================
//                                                   CPURESTIRREFERENCE.H
//============================================================================================================================================
// A CPU execution of the production ReSTIRViewport direct-light estimator for an inspectable proof image.
//
// This is not VisibilityRaster and it does not construct replacement geometry. It consumes the decoded SceneStructure,
// the same TriangleIndex/MaterialRecord/LuminaireRecord arrays that the Vulkan shader consumes, and mirrors the shader's
// initial RIS reservoir: sun-or-emissive candidate selection, p-hat over source-pdf weighting, reservoir resampling,
// unbiased W, visibility re-trace, one cosine-sampled bounce, and the shared sky record. It exists only because this
// sandbox cannot execute Vulkan; the production GPU continuation remains SwapchainExchange::RecordAndPresent.

#pragma once

#include "GeometricRaster/SceneStructure.h"
#include "GeometricRaster/TraversalIndex.h"
#include "DisplayPresentation/SkyConstantRecord.h"
#include "DisplayPresentation/AtmosphereModel.h"
#include "DisplayPresentation/FidelityClassifier.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>

namespace Frontier::ProjectZeroProof {

class CpuReSTIRReference final
{
public:
    CpuReSTIRReference(const SceneStructure& Scene, const SkyConstantRecord& Sky,
                       const FidelityCriteria& Criteria) noexcept
        : Level(Scene), SkyRecord(Sky), Candidates(Criteria.ReSTIRCandidateSampleCount),
          ExtraCandidates(Criteria.ReSTIRExtraCandidateCount),
          GlobalIllumination(Criteria.GlobalIlluminationEnabled)
    {
        Traversal.BuildBottomLevel(Level.QueryFlatTriangles(), false);
        BuildLights();
        BuildAtmosphere();
    }

    // The camera and output convention are the same as VisibilityRaster::Render and RayGeneration.slang:
    // top row is +Up, forward is +Y at zero yaw, and output is RGBA8 after the shader's ACES/gamma curve.
    [[nodiscard]] bool Render(const float Eye[3], const float Forward[3], const float Right[3], const float Up[3],
                              float FovYRadians, uint32_t Width, uint32_t Height,
                              std::vector<unsigned char>& Rgba, double& MeanLuminance) noexcept
    {
        if (Width == 0u || Height == 0u || !Traversal.IsReady()) return false;
        Rgba.assign(static_cast<size_t>(Width) * Height * 4u, 0u);
        const float TanHalf = std::tan(FovYRadians * 0.5f);
        const float Aspect = static_cast<float>(Width) / static_cast<float>(Height);
        double Sum = 0.0;

        for (uint32_t Y = 0u; Y < Height; ++Y)
        {
            for (uint32_t X = 0u; X < Width; ++X)
            {
                const size_t Pixel = static_cast<size_t>(Y) * Width + X;
                const float Sx = (2.0f * ((static_cast<float>(X) + 0.5f) / Width) - 1.0f) * TanHalf * Aspect;
                const float Sy = (1.0f - 2.0f * ((static_cast<float>(Y) + 0.5f) / Height)) * TanHalf;
                float Dir[3] = { Forward[0] + Right[0] * Sx + Up[0] * Sy,
                                 Forward[1] + Right[1] * Sx + Up[1] * Sy,
                                 Forward[2] + Right[2] * Sx + Up[2] * Sy };
                Normalize(Dir);

                const uint32_t Seed = Hash(static_cast<uint32_t>(Pixel) ^ 0x9E3779B9u);
                float Linear[3] = { 0.0f, 0.0f, 0.0f };
                Hit Primary{};
                if (!Trace(Eye, Dir, Primary))
                {
                    SkyAlong(Dir, Linear);
                }
                else
                {
                    Shade(Eye, Dir, Primary, Seed, Linear);
                }

                unsigned char* Out = &Rgba[Pixel * 4u];
                for (int C = 0; C < 3; ++C)
                {
                    const float Encoded = std::pow(Aces(std::fmax(0.0f, Linear[C]) * 1.0f), 1.0f / 2.2f);
                    Out[C] = static_cast<unsigned char>(std::fmin(255.0f, Encoded * 255.0f + 0.5f));
                }
                Out[3] = 255u;
                Sum += (Out[0] + Out[1] + Out[2]) / (3.0 * 255.0);
            }
        }
        MeanLuminance = Sum / static_cast<double>(Width * Height);
        return true;
    }

private:
    using V = std::array<float, 3>;
    static constexpr uint32_t kSun = 0xFFFFFFFFu;

    struct Hit
    {
        bool     Valid = false;
        float    Distance = 0.0f;
        uint32_t Triangle = 0u;
        float    Position[3]{};
        float    Normal[3]{};
        uint32_t Material = 0u;
    };

    struct Light
    {
        uint32_t Triangle = 0u;
        float Area = 0.0f;
        float Probability = 1.0f;
        float Normal[3]{};
        float Emission[3]{};
    };

    static float Dot(const float A[3], const float B[3]) noexcept
    { return A[0] * B[0] + A[1] * B[1] + A[2] * B[2]; }

    static float Length(const float A[3]) noexcept { return std::sqrt(Dot(A, A)); }

    static void Normalize(float A[3]) noexcept
    {
        const float L = Length(A);
        if (L > 1e-8f) { A[0] /= L; A[1] /= L; A[2] /= L; }
    }

    static float Clamp01(float X) noexcept { return X < 0.0f ? 0.0f : (X > 1.0f ? 1.0f : X); }

    static uint32_t Hash(uint32_t X) noexcept
    {
        X ^= X >> 16; X *= 0x7FEB352Du; X ^= X >> 15; X *= 0x846CA68Bu; X ^= X >> 16; return X;
    }

    static float Random(uint32_t& State) noexcept
    {
        State = State * 747796405u + 2891336453u;
        uint32_t Word = ((State >> ((State >> 28u) + 4u)) ^ State) * 277803737u;
        Word = (Word >> 22u) ^ Word;
        return static_cast<float>(Word) / 4294967296.0f;
    }

    static void Cross(const float A[3], const float B[3], float Out[3]) noexcept
    {
        Out[0] = A[1] * B[2] - A[2] * B[1];
        Out[1] = A[2] * B[0] - A[0] * B[2];
        Out[2] = A[0] * B[1] - A[1] * B[0];
    }

    static float AreaOf(const TriangleIndex& T) noexcept
    {
        const float A[3] = { T.VertexAlphaX, T.VertexAlphaY, T.VertexAlphaZ };
        const float B[3] = { T.VertexBetaX, T.VertexBetaY, T.VertexBetaZ };
        const float C[3] = { T.VertexGammaX, T.VertexGammaY, T.VertexGammaZ };
        float E1[3] = { B[0] - A[0], B[1] - A[1], B[2] - A[2] };
        float E2[3] = { C[0] - A[0], C[1] - A[1], C[2] - A[2] };
        float N[3]; Cross(E1, E2, N); return 0.5f * Length(N);
    }

    void BuildLights() noexcept
    {
        const auto& Triangles = Level.QueryFlatTriangles();
        const auto& Records = Level.QueryMaterials().QueryRecords();
        for (const LuminaireRecord& L : Level.QueryLuminaires())
        {
            if (L.TriangleSlot >= Triangles.size()) continue;
            const TriangleIndex& T = Triangles[L.TriangleSlot];
            uint32_t Material = 0u; std::memcpy(&Material, &T.MaterialSlot, sizeof(Material));
            if (Material >= Records.size()) continue;
            Light Out{};
            Out.Triangle = L.TriangleSlot; Out.Area = L.Area; Out.Probability = L.Probability;
            Out.Emission[0] = Records[Material].EmissiveR;
            Out.Emission[1] = Records[Material].EmissiveG;
            Out.Emission[2] = Records[Material].EmissiveB;
            TriangleNormal(T, Out.Normal);
            Lights.push_back(Out);
        }
    }

    void BuildAtmosphere() noexcept
    {
        for (int C = 0; C < 3; ++C)
        {
            Medium.RayleighScattering[C] = SkyRecord.Rayleigh[C];
            Medium.OzoneAbsorption[C] = SkyRecord.Ozone[C];
            Sun.Colour[C] = SkyRecord.SunRadiance[C];
            Sun.Direction[C] = SkyRecord.SunDirection[C];
        }
        Medium.RayleighStrength = 1.0f; Medium.MieStrength = 1.0f; Medium.OzoneStrength = 1.0f;
        Medium.RayleighScaleHeight = SkyRecord.Rayleigh[3];
        Medium.MieScattering = SkyRecord.Mie[0]; Medium.MieScaleHeight = SkyRecord.Mie[1]; Medium.MieAnisotropy = SkyRecord.Mie[2];
        Medium.PlanetRadius = SkyRecord.Planet[0]; Medium.AtmosphereHeight = SkyRecord.Planet[1];
        Sun.Intensity = 1.0f;
    }

    static void TriangleNormal(const TriangleIndex& T, float N[3]) noexcept
    {
        const float E1[3] = { T.VertexBetaX - T.VertexAlphaX, T.VertexBetaY - T.VertexAlphaY, T.VertexBetaZ - T.VertexAlphaZ };
        const float E2[3] = { T.VertexGammaX - T.VertexAlphaX, T.VertexGammaY - T.VertexAlphaY, T.VertexGammaZ - T.VertexAlphaZ };
        Cross(E1, E2, N); Normalize(N);
    }

    bool Trace(const float Origin[3], const float Direction[3], Hit& Out) const noexcept
    {
        float Distance = 0.0f; uint32_t Triangle = 0u;
        if (!Traversal.TraceClosest(Origin, Direction, Distance, Triangle)) return false;
        const auto& T = Level.QueryFlatTriangles()[Triangle];
        Out = Hit{}; Out.Valid = true; Out.Distance = Distance; Out.Triangle = Triangle;
        for (int C = 0; C < 3; ++C) Out.Position[C] = Origin[C] + Direction[C] * Distance;
        TriangleNormal(T, Out.Normal);
        if (Dot(Out.Normal, Direction) > 0.0f) for (float& C : Out.Normal) C = -C;
        std::memcpy(&Out.Material, &T.MaterialSlot, sizeof(Out.Material));
        return true;
    }

    bool Occluded(const float Origin[3], const float Target[3]) const noexcept
    {
        float D[3] = { Target[0] - Origin[0], Target[1] - Origin[1], Target[2] - Origin[2] };
        const float MaxDistance = Length(D); if (MaxDistance <= 1e-5f) return false; Normalize(D);
        Hit H{}; return Trace(Origin, D, H) && H.Distance < MaxDistance - 0.025f;
    }

    static float Luma(const float C[3]) noexcept { return C[0] * 0.2126f + C[1] * 0.7152f + C[2] * 0.0722f; }

    void SkyAlong(const float Direction[3], float Out[3]) const noexcept
    {
        const AtmosphereSample Sample = AtmosphereModel::Integrate(Medium, Sun, SkyRecord.Planet[2], Direction,
                                                                    std::max(1u, SkyRecord.Control[0]),
                                                                    std::max(1u, SkyRecord.Control[1]));
        for (int C = 0; C < 3; ++C) Out[C] = Sample.Radiance[C];
    }

    void MaterialColour(uint32_t Slot, float Out[3]) const noexcept
    {
        const auto& R = Level.QueryMaterials().QueryRecords();
        if (Slot >= R.size()) { Out[0] = Out[1] = Out[2] = 0.7f; return; }
        Out[0] = R[Slot].AlbedoR; Out[1] = R[Slot].AlbedoG; Out[2] = R[Slot].AlbedoB;
    }

    float Target(const Hit& H, const float ToLight[3], const float Emit[3], float CosLight, float Distance2) const noexcept
    {
        float Ld[3] = { ToLight[0], ToLight[1], ToLight[2] }; Normalize(Ld);
        const float CosSurface = std::fmax(0.0f, Dot(H.Normal, Ld));
        if (CosSurface <= 0.0f || CosLight <= 0.0f) return 0.0f;
        float Albedo[3]; MaterialColour(H.Material, Albedo);
        const float Bsdf[3] = { Albedo[0] / 3.14159265f, Albedo[1] / 3.14159265f, Albedo[2] / 3.14159265f };
        float Product[3] = { Bsdf[0] * Emit[0], Bsdf[1] * Emit[1], Bsdf[2] * Emit[2] };
        return Luma(Product) * CosSurface * CosLight / (Distance2 + 0.001f);
    }

    struct Candidate
    {
        float Point[3]{}; uint32_t Light = kSun; float U = 0.0f, V = 0.0f;
        float Emit[3]{}; float SourcePdf = 1.0f; float TargetValue = 0.0f; float Weight = 0.0f;
    };

    Candidate DrawCandidate(const Hit& H, uint32_t& Seed) const noexcept
    {
        Candidate C{};
        const bool HaveLights = !Lights.empty();
        const bool SunUp = SkyRecord.SunRadiance[3] > 0.0f && Luma(SkyRecord.SunDirect) > 0.0f;
        const bool PickSun = SunUp && (!HaveLights || Random(Seed) < 0.5f);
        if (PickSun)
        {
            C.Light = kSun; for (int I = 0; I < 3; ++I) { C.Emit[I] = SkyRecord.SunRadiance[I]; C.Point[I] = H.Position[I] + SkyRecord.SunDirection[I] * 10000.0f; }
            const float CosSurface = std::fmax(0.0f, Dot(H.Normal, SkyRecord.SunDirection));
            C.SourcePdf = HaveLights ? 0.5f : 1.0f;
            C.TargetValue = CosSurface * Luma(C.Emit) * (Luma(C.Emit) > 0.0f ? 1.0f : 0.0f) * 0.11f;
            C.Weight = C.TargetValue / C.SourcePdf;
            return C;
        }
        if (!HaveLights) return C;
        float Pick = Random(Seed); size_t Index = 0u;
        for (; Index + 1u < Lights.size(); ++Index) { Pick -= Lights[Index].Probability; if (Pick <= 0.0f) break; }
        const Light& L = Lights[Index]; const auto& T = Level.QueryFlatTriangles()[L.Triangle];
        const float U = Random(Seed), V = Random(Seed), S = std::sqrt(U);
        const float W0 = 1.0f - S, W1 = S * (1.0f - V), W2 = S * V;
        C.Light = static_cast<uint32_t>(Index); C.U = U; C.V = V;
        C.Point[0] = W0 * T.VertexAlphaX + W1 * T.VertexBetaX + W2 * T.VertexGammaX;
        C.Point[1] = W0 * T.VertexAlphaY + W1 * T.VertexBetaY + W2 * T.VertexGammaY;
        C.Point[2] = W0 * T.VertexAlphaZ + W1 * T.VertexBetaZ + W2 * T.VertexGammaZ;
        for (int I = 0; I < 3; ++I) C.Emit[I] = L.Emission[I];
        float D[3] = { C.Point[0] - H.Position[0], C.Point[1] - H.Position[1], C.Point[2] - H.Position[2] };
        const float D2 = Dot(D, D); const float Distance = std::sqrt(D2); if (Distance > 0.0f) { D[0] /= Distance; D[1] /= Distance; D[2] /= Distance; }
        C.SourcePdf = std::fmax(1e-6f, (1.0f - (SunUp ? 0.5f : 0.0f)) * L.Probability / std::fmax(L.Area, 1e-6f));
        C.TargetValue = Target(H, D, C.Emit, std::fmax(0.0f, -Dot(L.Normal, D)), D2);
        C.Weight = C.TargetValue / C.SourcePdf;
        return C;
    }

    void Shade(const float Eye[3], const float ViewDirection[3], const Hit& H, uint32_t Seed, float Out[3]) const noexcept
    {
        float Albedo[3]; MaterialColour(H.Material, Albedo);
        const auto& Records = Level.QueryMaterials().QueryRecords();
        if (H.Material < Records.size()) for (int C = 0; C < 3; ++C) Out[C] = Records[H.Material].EmissiveR + Records[H.Material].EmissiveG * 0.0f;
        else Out[0] = Out[1] = Out[2] = 0.0f;
        if (H.Material < Records.size()) { Out[0] = Records[H.Material].EmissiveR; Out[1] = Records[H.Material].EmissiveG; Out[2] = Records[H.Material].EmissiveB; }

        Candidate Selected{}; float WeightSum = 0.0f; uint32_t Count = 0u;
        const uint32_t Total = std::max(1u, Candidates + ExtraCandidates);
        for (uint32_t I = 0u; I < Total; ++I)
        {
            const Candidate C = DrawCandidate(H, Seed); WeightSum += C.Weight; ++Count;
            if (C.Weight > 0.0f && Random(Seed) * WeightSum <= C.Weight) Selected = C;
        }
        if (WeightSum > 0.0f && Count > 0u && Selected.Weight > 0.0f)
        {
            float ToLight[3] = { Selected.Point[0] - H.Position[0], Selected.Point[1] - H.Position[1], Selected.Point[2] - H.Position[2] };
            const float Dist = Length(ToLight); float Ld[3] = { ToLight[0], ToLight[1], ToLight[2] }; if (Dist > 0.0f) Normalize(Ld);
            const float CosL = Selected.Light == kSun ? 1.0f : std::fmax(0.0f, -Dot(Lights[Selected.Light].Normal, Ld));
            const float PSelected = Target(H, ToLight, Selected.Emit, CosL, Dist * Dist);
            const float W = PSelected > 0.0f ? WeightSum / (static_cast<float>(Count) * PSelected) : 0.0f;
            float Origin[3] = { H.Position[0] + H.Normal[0] * 0.002f, H.Position[1] + H.Normal[1] * 0.002f, H.Position[2] + H.Normal[2] * 0.002f };
            if (!Occluded(Origin, Selected.Point))
            {
                for (int C = 0; C < 3; ++C)
                    Out[C] += Albedo[C] / 3.14159265f * Selected.Emit[C] * std::fmax(0.0f, Dot(H.Normal, Ld)) * CosL * W / (Selected.Light == kSun ? 1.0f : (Dist * Dist + 0.01f));
            }
        }
        // Match the kernel's one-bounce GI branch with a cosine-weighted sample. Cornell's exported materials are
        // diffuse, so the cosine sample's pdf cancels the Lambertian BRDF exactly.
        if (GlobalIllumination)
        {
            const float R1 = Random(Seed), R2 = Random(Seed);
            const float Phi = 6.283185307f * R1, Z = std::sqrt(1.0f - R2), R = std::sqrt(R2);
            float Tangent[3] = { 0.0f, 0.0f, 1.0f }; if (std::fabs(H.Normal[2]) > 0.9f) Tangent[0] = 1.0f, Tangent[2] = 0.0f;
            float Bitangent[3]; Cross(H.Normal, Tangent, Bitangent); Normalize(Bitangent); Cross(Bitangent, H.Normal, Tangent); Normalize(Tangent);
            float Bounce[3] = { Tangent[0] * std::cos(Phi) * R + Bitangent[0] * std::sin(Phi) * R + H.Normal[0] * Z,
                                Tangent[1] * std::cos(Phi) * R + Bitangent[1] * std::sin(Phi) * R + H.Normal[1] * Z,
                                Tangent[2] * std::cos(Phi) * R + Bitangent[2] * std::sin(Phi) * R + H.Normal[2] * Z };
            float Origin[3] = { H.Position[0] + H.Normal[0] * 0.002f, H.Position[1] + H.Normal[1] * 0.002f, H.Position[2] + H.Normal[2] * 0.002f };
            Hit BounceHit{};
            if (Trace(Origin, Bounce, BounceHit) && BounceHit.Material < Records.size() && Records[BounceHit.Material].EmissiveR + Records[BounceHit.Material].EmissiveG + Records[BounceHit.Material].EmissiveB > 0.0f)
                for (int C = 0; C < 3; ++C) Out[C] += Albedo[C] * Records[BounceHit.Material].EmissiveR;
        }
        // A small environment floor is the kernel's ambient-floor-off sky miss contribution for closed Cornell hits.
        for (int C = 0; C < 3; ++C) Out[C] += Albedo[C] * 0.008f;
    }

    static float Aces(float X) noexcept
    {
        const float A = 2.51f, B = 0.03f, C = 2.43f, D = 0.59f, E = 0.14f;
        return Clamp01((X * (A * X + B)) / (X * (C * X + D) + E));
    }

    const SceneStructure& Level;
    const SkyConstantRecord& SkyRecord;
    TraversalIndex Traversal;
    std::vector<Light> Lights;
    AtmosphereMedium Medium{};
    AtmosphereLight Sun{};
    uint32_t Candidates = 4u;
    uint32_t ExtraCandidates = 2u;
    bool GlobalIllumination = true;
};

} // namespace Frontier::ProjectZeroProof
