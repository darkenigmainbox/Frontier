//==========================================================================================================================================
//                                                           DIRECT RADIANCE
//==========================================================================================================================================
// 🧩 Direct sun radiance and clustered lights at every primary surface, cascaded shadow depth, and sky background.

#include "FrameDescriptor.slang"
#include "SurfaceReflectance.slang"
#include "PackingCodec.slang"
#include "FireIllumination.slang"
#include "ClusteredLights.slang"
#include "RayTraversal.slang"

struct CascadeReceiver
{
    float4x4 LightViewProjection[3];
    float4   Splits;     // [m]   xyz far distance of each cascade, w cascade count
    float4   TexelWorld; // [m]   world size of one shadow texel per cascade
};

struct CloudShadowParameters
{
    float4 Map;     // world XY origin on Z=0, span, enabled
    float4 Sun;     // frozen sun direction used to generate the map, strength
    float4 Quality; // softness (m), sample count, global base/top
};

[[vk::binding(1, 0)]]  StructuredBuffer<MaterialRecord>      Materials;
[[vk::binding(2, 0)]]  Texture2D<float4>                     SurfaceAttributes;
[[vk::binding(3, 0)]]  Texture2D<float>                      SurfaceDepth;
[[vk::binding(4, 0)]]  Texture2DArray<float>                 ShadowDepth;
[[vk::binding(5, 0)]]  SamplerComparisonState                ShadowSampler;
[[vk::binding(6, 0)]]  ConstantBuffer<CascadeReceiver>       Receiver;
[[vk::binding(7, 0)]]  Texture2D<float4>                     DirectSkyView;
[[vk::binding(8, 0)]]  SamplerState                          DirectSkySampler;
[[vk::binding(9, 0)]]  [format("rgba16f")] RWTexture2D<float4> DirectTarget;
[[vk::binding(10, 0)]] StructuredBuffer<ClusteredLightBuffer> SceneLights;
[[vk::binding(11, 0)]] ConstantBuffer<CloudShadowParameters> Shadow;
[[vk::binding(12, 0)]] Texture2D<float4>                     CloudShadowMap;
[[vk::binding(13, 0)]] SamplerState                          CloudShadowSampler;

float SampleProjectedCloudShadow(float2 UV, float Z)
{
    float4 Sampled        = CloudShadowMap.SampleLevel(CloudShadowSampler, UV, 0.0f);
    float  GlobalFraction = clamp((Shadow.Quality.w - Z) / max(1.0f, Shadow.Quality.w - Shadow.Quality.z), 0.0f, 1.0f);
    float  LocalFraction  = clamp((Sampled.w - Z) / max(0.01f, Sampled.w - Sampled.z), 0.0f, 1.0f);
    return exp(-Sampled.x * GlobalFraction - Sampled.y * LocalFraction);
}

float CloudGroundTransmission(float3 Position)
{
    if (Shadow.Map.w < 0.5f)
    {
        return 1.0f;
    }
    float2 Ground = Position.xy - Position.z * Shadow.Sun.xy / max(0.03f, Shadow.Sun.z);
    float2 UV     = (Ground - Shadow.Map.xy) / Shadow.Map.z;
    float  Edge   = min(min(UV.x, UV.y), min(1.0f - UV.x, 1.0f - UV.y));
    if (Edge <= 0.0f)
    {
        return 1.0f;
    }
    float Fade   = smoothstep(0.0f, 0.08f, Edge) * smoothstep(0.03f, 0.12f, Shadow.Sun.z) * Shadow.Sun.w;
    float Offset = Shadow.Quality.x / Shadow.Map.z;
    float T      = 0.0f;
    if (Offset < 0.00001f)
    {
        T = SampleProjectedCloudShadow(UV, Position.z);
    }
    else
    {
        T = (SampleProjectedCloudShadow(UV + float2(-Offset, -Offset), Position.z) +
             SampleProjectedCloudShadow(UV + float2( Offset, -Offset), Position.z) +
             SampleProjectedCloudShadow(UV + float2(-Offset,  Offset), Position.z) +
             SampleProjectedCloudShadow(UV + float2( Offset,  Offset), Position.z)) * 0.25f;
    }
    return lerp(1.0f, T, Fade);
}

float ResolveCascadeVisibility(float3 Position, float3 Normal)
{
    float ViewDistance = ResolveViewDepth(Position);
    uint  Count        = uint(Receiver.Splits.w);
    uint  Cascade      = 0u;
    while (Cascade + 1u < Count && ViewDistance > Receiver.Splits[Cascade])
    {
        Cascade++;
    }
    if (ViewDistance > Receiver.Splits[Count - 1u])
    {
        return 1.0f;
    }
    float3 Offset      = Position + Normal * (1.5f * Receiver.TexelWorld[Cascade]);
    float4 Clip        = mul(Receiver.LightViewProjection[Cascade], float4(Offset, 1.0f));
    float3 Ndc         = Clip.xyz / Clip.w;
    float2 Coordinates = float2(Ndc.x * 0.5f + 0.5f, 0.5f - Ndc.y * 0.5f);
    if (any(Coordinates < float2(0.0f)) || any(Coordinates > float2(1.0f)) || Ndc.z > 1.0f)
    {
        return 1.0f;
    }
    uint3 ShadowDims;
    ShadowDepth.GetDimensions(ShadowDims.x, ShadowDims.y, ShadowDims.z);
    float2 Texel = 1.0f / float2(max(ShadowDims.xy, uint2(1u)));
    float  Lit   = 0.0f;
    for (int Y = -1; Y <= 1; Y++)
    {
        for (int X = -1; X <= 1; X++)
        {
            float2 SampleUv = Coordinates + float2(float(X), float(Y)) * Texel;
            Lit += ShadowDepth.SampleCmpLevelZero(ShadowSampler, float3(SampleUv, float(Cascade)), Ndc.z);
        }
    }
    return Lit / 9.0f;
}

float3 ResolveBackgroundRadiance(float3 Direction)
{
    return DirectSkyView.SampleLevel(DirectSkySampler, ProjectSkyCoordinates(Direction), 0.0f).rgb * Frame.SkyScale +
           Frame.NightSkyRadiance;
}

float2 ProjectTemporalPair(uint2 Pixel, uint FrameIndex, uint Salt)
{
    uint Seed = ConstructPixelSeed(Pixel, FrameIndex, Salt);
    float U0  = AdvanceUniform(Seed);
    float U1  = AdvanceUniform(Seed);
    return float2(U0, U1);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void IntegrateDirectRadiance(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 Pixel = Invocation.xy;
    if (any(float2(Pixel) >= Frame.ScreenExtent))
    {
        return;
    }
    float  Depth  = SurfaceDepth.Load(int3(int2(Pixel), 0));
    float2 Centre = float2(Pixel) + 0.5f;
    if (Depth <= 0.0f)
    {
        float3 Far = ReconstructWorldPosition(Centre, 1.0e-6f);
        DirectTarget[Pixel] = float4(ResolveBackgroundRadiance(normalize(Far - Frame.CameraPosition)), 0.0f);
        return;
    }
    float3        Position     = ReconstructWorldPosition(Centre, Depth);
    float4        Attributes   = SurfaceAttributes.Load(int3(int2(Pixel), 0));
    float3        Normal       = DecodeOctahedral(Attributes.xy);
    SurfaceSample Surface      = ProjectSurfaceSample(Materials[uint(Attributes.z + 0.5f)]);
    float3        View         = normalize(Frame.CameraPosition - Position);
    bool          UseRtShadows = FeatureEnabled(Frame, FeatureRayTracing) && FeatureEnabled(Frame, FeatureRayTracedShadows);
    float3        RayOrigin    = Position + Normal * RayEpsilon;

    float  Visibility = 1.0f;
    float3 SunDir     = Frame.SunDirection;
    if (FeatureEnabled(Frame, FeatureDirectShadow))
    {
        if (UseRtShadows)
        {
            SunDir     = SampleSunConeDirection(Frame.SunDirection, ProjectTemporalPair(Pixel, Frame.FrameIndex, 17u));
            Visibility = TraceSceneVisibility(RayOrigin, SunDir, RayEpsilon, 400.0f);
        }
        else
        {
            Visibility = ResolveCascadeVisibility(Position, Normal);
        }
    }
    Visibility     *= CloudGroundTransmission(Position);
    float3 Radiance = Frame.SunIlluminance * Visibility * ResolveDirectReflectance(Surface, Normal, View, SunDir);
    FireArrival Fire = ResolveFireArrival(Position, Normal);
    if (any(Fire.Illuminance > float3(0.0f)))
    {
        Radiance += Fire.Illuminance * ResolveDirectReflectance(Surface, Normal, View, Fire.Direction);
    }

    float2 HmiPair = ProjectTemporalPair(Pixel, Frame.FrameIndex, 43u);
    Radiance += EvaluateHmiAreaLightNee(Position, Normal, View, Surface, HmiPair, UseRtShadows) * InversePi;

    int CellIdx = ResolveClusterCellIndex(SceneLights[0].GridMinimum, SceneLights[0].GridScale, Position);
    if (CellIdx != -1)
    {
        uint4 Pair  = SceneLights[0].CellMasks[uint(max(CellIdx, 0)) >> 1u];
        uint2 Mask2 = ResolveClusterMaskFromPair(CellIdx, Pair, SceneLights[0].GridMinimum.w);
        if ((Mask2.x | Mask2.y) != 0u)
        {
            float3 ClusterRad  = float3(0.0f);
            float3 BestContrib = float3(0.0f);
            float3 BestDir     = float3(0.0f, 0.0f, 1.0f);
            float  BestDist    = 0.0f;
            float  BestLum     = 0.0f;

            for (uint Word = 0u; Word < 2u; Word += 1u)
            {
                uint Mask = (Word == 1u) ? Mask2.y : Mask2.x;
                uint Base = Word * 32u;
                while (Mask != 0u)
                {
                    uint Bit   = firstbitlow(Mask);
                    Mask      &= Mask - 1u;
                    LightRecord Light      = SceneLights[0].Lights[Base + Bit];
                    float3      LightIllum = EvaluateLightArrival(Light, Position, Normal);
                    if (any(LightIllum > float3(0.0f)))
                    {
                        float3 Offset      = Light.PositionType.xyz - Position;
                        float  LightDist   = length(Offset);
                        float3 TowardLight = Offset / max(LightDist, 1.0e-4f);
                        float3 Contrib     = LightIllum * ResolveDirectReflectance(Surface, Normal, View, TowardLight);
                        ClusterRad        += Contrib;
                        float  Lum         = dot(Contrib, float3(0.2126f, 0.7152f, 0.0722f));
                        if (Lum > BestLum)
                        {
                            BestLum     = Lum;
                            BestContrib = Contrib;
                            BestDir     = TowardLight;
                            BestDist    = LightDist;
                        }
                    }
                }
            }

            float SunLum = dot(Frame.SunIlluminance, float3(0.2126f, 0.7152f, 0.0722f));
            if (UseRtShadows && BestLum > 0.04f + 0.015f * SunLum)
            {
                float LightVis = TraceSceneVisibility(RayOrigin, BestDir, RayEpsilon, max(BestDist - 0.65f, RayEpsilon));
                ClusterRad    += BestContrib * (LightVis - 1.0f);
            }
            Radiance += ClusterRad;
        }
    }

    DirectTarget[Pixel] = float4(Radiance, 1.0f);
}
