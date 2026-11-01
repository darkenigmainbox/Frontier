//==========================================================================================================================================
//                                                        DISPLAY RECOMBINATION
//==========================================================================================================================================
// 🧩 Recombines direct, indirect diffuse, glossy reflection and emission per pixel, or substitutes an inspection signal.

#include "FrameDescriptor.slang"
#include "SurfaceReflectance.slang"
#include "PackingCodec.slang"

[[vk::binding(1, 0)]]  StructuredBuffer<MaterialRecord> Materials;
[[vk::binding(2, 0)]]  Texture2D<float4>                SurfaceAttributes;
[[vk::binding(3, 0)]]  Texture2D<float>                 SurfaceDepth;
[[vk::binding(4, 0)]]  Texture2D<float4>                DirectRadiance;
[[vk::binding(5, 0)]]  Texture2D<float4>                IndirectIrradiance;
[[vk::binding(6, 0)]]  Texture2D<float4>                ReflectionRadiance;
[[vk::binding(7, 0)]]  Texture2D<float4>                ResampledIrradiance;
[[vk::binding(8, 0)]]  Texture2D<float4>                InspectionRadiance;
[[vk::binding(9, 0)]]  Texture2D<float4>                CardFinal;
[[vk::binding(10, 0)]] [format("rgba16f")] RWTexture2D<float4> RecombinedTarget;
[[vk::binding(11, 0)]] StructuredBuffer<OccupantRecord> Occupants;
[[vk::binding(12, 0)]] Texture2D<float4>                TyrePlume;
[[vk::binding(13, 0)]] SamplerState                     PlumeSampler;

static const float CabinIndirectShare   = 0.05f;
static const uint  InspectionFinal      = 0u;
static const uint  InspectionDirect     = 1u;
static const uint  InspectionDiffuse    = 2u;
static const uint  InspectionIrradiance = 3u;
static const uint  InspectionResampled  = 4u;
static const uint  InspectionReflection = 5u;
static const uint  InspectionDistance   = 6u;
static const uint  InspectionCards      = 7u;
static const uint  InspectionNormal     = 8u;
static const uint  InspectionAlbedo     = 9u;

float ResolveBoxShare(float3 Point, float3 Minimum, float3 Maximum, float Soft)
{
    float3 Inside = min(Point - Minimum, Maximum - Point);
    return clamp(min(min(Inside.x, Inside.y), Inside.z) / Soft, 0.0f, 1.0f);
}

float ResolveCabinShare(float3 BodyLocal)
{
    float Greenhouse = ResolveBoxShare(BodyLocal, float3(-0.95f, -1.04f, -0.12f), float3(1.33f, 1.04f, 1.19f), 0.04f);
    float Tub        = ResolveBoxShare(BodyLocal, float3(-1.85f, -1.02f, -0.12f), float3(1.38f, 1.02f, 0.60f), 0.04f);
    return max(Greenhouse, Tub);
}

float3 FogTransmission(float3 Camera, float3 Position, float Density, float Height, float AerialDensity, float AerialStart, float MieBlend)
{
    float Distance = length(Position - Camera);
    float H        = max(Height, 0.1f);
    float Delta    = (Position.z - Camera.z) / H;
    float Column   = 1.0f;
    if (abs(Delta) > 0.001f)
    {
        Column = (1.0f - exp(clamp(-Delta, -50.0f, 50.0f))) / Delta;
    }
    float HeightOD = Density * Distance * exp(clamp(-Camera.z / H, -50.0f, 20.0f)) * Column;
    float AerialOD = AerialDensity * max(0.0f, Distance - AerialStart);
    return exp(-min(float3(80.0f), float3(HeightOD * HeightOD) + lerp(float3(0.45f, 0.7f, 1.0f), float3(1.0f), MieBlend) * AerialOD));
}

float3 CompositePlume(float3 Colour, int2 Pixel)
{
    if ((Frame.Features & 4096u) == 0u || Frame.InspectionMode != 0u)
    {
        return Colour;
    }
    float4 Sample = TyrePlume.SampleLevel(PlumeSampler, (float2(Pixel) + 0.5f) * Frame.InverseScreenExtent, 0.0f);
    return Colour * Sample.a + Sample.rgb;
}

[shader("compute")]
[numthreads(8, 8, 1)]
void ResolveRecombination(uint3 Invocation : SV_DispatchThreadID)
{
    int2 Pixel = int2(Invocation.xy);
    if (any(float2(Pixel) >= Frame.ScreenExtent))
    {
        return;
    }
    float4 Direct = DirectRadiance.Load(int3(Pixel, 0));
    if (Frame.InspectionMode == InspectionDistance || Frame.InspectionMode >= 10u)
    {
        RecombinedTarget[uint2(Pixel)] = float4(InspectionRadiance.Load(int3(Pixel, 0)).rgb, 1.0f);
        return;
    }
    if (Frame.InspectionMode == InspectionCards)
    {
        uint2 CardDimsU;
        CardFinal.GetDimensions(CardDimsU.x, CardDimsU.y);
        float2 Extent = float2(max(CardDimsU, uint2(1u)));
        float  Scale  = min(Frame.ScreenExtent.x, Frame.ScreenExtent.y) / Extent.x;
        int2   Texel  = int2(float2(Pixel) / Scale);
        float3 Colour = float3(0.04f);
        if (all(Texel < int2(Extent)))
        {
            Colour = CardFinal.Load(int3(Texel, 0)).rgb;
        }
        RecombinedTarget[uint2(Pixel)] = float4(Colour, 1.0f);
        return;
    }
    float Depth = SurfaceDepth.Load(int3(Pixel, 0));
    if (Depth <= 0.0f)
    {
        RecombinedTarget[uint2(Pixel)] = float4(CompositePlume(Direct.rgb, Pixel), 1.0f);
        return;
    }
    float4        Attributes = SurfaceAttributes.Load(int3(Pixel, 0));
    float3        Normal     = DecodeOctahedral(Attributes.xy);
    SurfaceSample Surface    = ProjectSurfaceSample(Materials[uint(Attributes.z + 0.5f)]);
    float3        Position   = ReconstructWorldPosition(float2(Pixel) + 0.5f, Depth);
    float3        View       = normalize(Frame.CameraPosition - Position);
    float         NdotV      = max(dot(Normal, View), 1.0e-3f);

    float  TargetCabinShare = FeatureEnabled(Frame, FeatureRayTracing) ? 0.14f : CabinIndirectShare;
    float  Enclosure        = lerp(1.0f, TargetCabinShare, ResolveCabinShare(MulMat4Point(Occupants[0].WorldToLocal, Position)));
    float3 Irradiance       = float3(0.0f);
    if (FeatureEnabled(Frame, FeatureIndirect))
    {
        Irradiance = IndirectIrradiance.Load(int3(Pixel, 0)).rgb * Frame.IndirectScale * Enclosure;
    }
    float3 Diffuse = ResolveDiffuseAlbedo(Surface) * InversePi * Irradiance;

    float  GlossRoughness   = (Surface.CoatWeight > 0.0f) ? Surface.CoatRoughness : Surface.Roughness;
    float4 Reflection       = ReflectionRadiance.Load(int3(Pixel, 0));
    float3 Glossy           = Irradiance * InversePi;
    bool   UseRtReflections = FeatureEnabled(Frame, FeatureRayTracing) && FeatureEnabled(Frame, FeatureRayTracedReflections);
    float  Cutoff           = UseRtReflections ? ResolveReflectionRoughness(Frame) : 0.50f;
    float  FadeStart        = max(0.05f, Cutoff - 0.18f);
    if (FeatureEnabled(Frame, FeatureReflection))
    {
        float ReflScale = (FeatureEnabled(Frame, FeatureIndirect) ? Frame.IndirectScale : 1.0f) * ResolveReflectionScale(Frame);
        Glossy          = lerp(Reflection.rgb * ReflScale * Enclosure, Glossy, smoothstep(FadeStart, Cutoff, GlossRoughness));
    }
    float2 LayerResponse = ResolveEnvironmentResponse(NdotV, Surface.Roughness);
    float3 LayerGlossy   = (Surface.CoatWeight > 0.0f)
                         ? lerp(Glossy, Irradiance * InversePi, smoothstep(FadeStart - 0.05f, Cutoff, Surface.Roughness))
                         : Glossy;
    float3 Indirect      = Diffuse + LayerGlossy * (ResolveSpecularColour(Surface) * LayerResponse.x + LayerResponse.y);
    float3 Specular      = LayerGlossy * (ResolveSpecularColour(Surface) * LayerResponse.x + LayerResponse.y);
    if (Surface.CoatWeight > 0.0f)
    {
        float2 CoatResponse    = ResolveEnvironmentResponse(NdotV, Surface.CoatRoughness);
        float  CoatReflectance = (0.04f * CoatResponse.x + CoatResponse.y) * Surface.CoatWeight;
        Indirect               = Indirect * (1.0f - CoatReflectance) + Glossy * CoatReflectance;
        Specular               = Specular * (1.0f - CoatReflectance) + Glossy * CoatReflectance;
    }
    float3 Emission = (Surface.Emission + Surface.Albedo * max(Attributes.w - 1.0f, 0.0f)) * Frame.EmissionScale;

    float3 Colour = Direct.rgb + Indirect + Emission;
    if (Frame.InspectionMode == 0u && (Frame.MoonFog.z > 0.0f || Frame.Aerial.y > 0.0f))
    {
        float3 T        = FogTransmission(Frame.CameraPosition, Position, Frame.MoonFog.z, Frame.MoonFog.w, Frame.Aerial.y, Frame.Aerial.z, Frame.FogTint.w);
        float  Forward  = pow(max(0.0f, dot(-View, Frame.SolarDisc.xyz)), 8.0f) * Frame.Aerial.x;
        float3 FogLight = Frame.NightSkyRadiance + Frame.SunIlluminance * (Frame.FogTint.rgb * 0.12f + Forward * 0.04f);
        Colour          = Colour * T + FogLight * (1.0f - T);
    }

    if (Frame.InspectionMode == 1u)      { Colour = Direct.rgb + Emission; }
    else if (Frame.InspectionMode == 2u) { Colour = Diffuse; }
    else if (Frame.InspectionMode == 3u) { Colour = Irradiance * InversePi; }
    else if (Frame.InspectionMode == 4u)
    {
        int2 TracePixel = min(Pixel / int(Frame.TraceScale), int2(Frame.TraceExtent) - int2(1));
        Colour          = ResampledIrradiance.Load(int3(TracePixel, 0)).rgb * InversePi;
    }
    else if (Frame.InspectionMode == 5u) { Colour = Specular; }
    else if (Frame.InspectionMode == 8u) { Colour = Normal * 0.5f + 0.5f; }
    else if (Frame.InspectionMode == 9u) { Colour = Surface.Albedo; }

    RecombinedTarget[uint2(Pixel)] = float4(CompositePlume(Colour, Pixel), 1.0f);
}
