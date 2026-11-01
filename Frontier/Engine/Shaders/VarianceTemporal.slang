//==========================================================================================================================================
//                                                          VARIANCE TEMPORAL
//==========================================================================================================================================
// 🧩 Temporal accumulation of resampled irradiance and its luminance moments (L, L^2), feeding the à-trous wavelet.

#include "FrameDescriptor.slang"
#include "PackingCodec.slang"

[[vk::binding(1, 0)]] Texture2D<float4>                     SurfaceMotion;
[[vk::binding(2, 0)]] Texture2D<float4>                     ResampledIrradiance;
[[vk::binding(3, 0)]] Texture2D<float4>                     PriorTraceGuides;
[[vk::binding(4, 0)]] Texture2D<float4>                     CurrentTraceGuides;
[[vk::binding(5, 0)]] Texture2D<float4>                     PriorFiltered;
[[vk::binding(6, 0)]] Texture2D<float4>                     PriorMoments;
[[vk::binding(7, 0)]] [format("rgba16f")] RWTexture2D<float4> IntegratedSignal;
[[vk::binding(8, 0)]] [format("rgba32f")] RWTexture2D<float4> CurrentMoments;
[[vk::binding(9, 0)]] Texture2D<float4>                     ReflectionSource;

[shader("compute")]
[numthreads(8, 8, 1)]
void IntegrateTemporal(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 TracePixel = Invocation.xy;
    if (any(float2(TracePixel) >= Frame.TraceExtent))
    {
        return;
    }

    float4 Guide = CurrentTraceGuides.Load(int3(int2(TracePixel), 0));
    if (Guide.w <= 0.0f)
    {
        IntegratedSignal[TracePixel] = float4(0.0f);
        CurrentMoments[TracePixel]   = float4(0.0f);
        return;
    }

    float3 Normal        = DecodeOctahedral(Guide.xy);
    float  ViewDepth     = Guide.z;
    float  ExpectedDepth = Guide.w - 1.0f;
    float3 Fresh         = ResampledIrradiance.Load(int3(int2(TracePixel), 0)).rgb;

    uint   Scale        = Frame.TraceScale;
    uint2  ScreenPixel  = min(TracePixel * Scale + uint2(Scale / 2u), uint2(Frame.ScreenExtent) - uint2(1u));
    float2 ScreenCentre = float2(ScreenPixel) + 0.5f;
    float2 Velocity     = SurfaceMotion.Load(int3(int2(ScreenPixel), 0)).xy * Frame.ScreenExtent;
    float4 Reflected    = ReflectionSource.Load(int3(int2(TracePixel), 0));
    if (Reflected.w > 0.0f && Reflected.w < 500.0f && length(Velocity) < 0.5f)
    {
        float3 Position = ReconstructWorldPosition(ScreenCentre, 0.5f);
        float3 ViewRay  = normalize(Position - Frame.CameraPosition);
        float3 Virtual  = Position + ViewRay * Reflected.w;
        float4 CurrClip = mul(Frame.UnjitteredViewProjection, float4(Virtual, 1.0f));
        float4 PrevClip = mul(Frame.PreviousUnjitteredViewProjection, float4(Virtual, 1.0f));
        if (CurrClip.w > 0.0f && PrevClip.w > 0.0f)
        {
            float2 CurrScreen = float2(CurrClip.x / CurrClip.w * 0.5f + 0.5f, 0.5f - CurrClip.y / CurrClip.w * 0.5f) * Frame.ScreenExtent;
            float2 PrevScreen = float2(PrevClip.x / PrevClip.w * 0.5f + 0.5f, 0.5f - PrevClip.y / PrevClip.w * 0.5f) * Frame.ScreenExtent;
            float2 VirtualVel = CurrScreen - PrevScreen;
            if (length(VirtualVel) < 48.0f)
            {
                ScreenCentre = CurrScreen;
                Velocity     = VirtualVel;
            }
        }
    }

    float2 PriorPosition = (ScreenCentre - Velocity) / float(Scale) - 0.5f;
    int2   Base          = int2(floor(PriorPosition));
    float2 Fraction      = PriorPosition - float2(Base);

    float3 AccumulatedSignal  = float3(0.0f);
    float2 AccumulatedMoments = float2(0.0f);
    float  AccumulatedTally   = 0.0f;
    float  WeightSum          = 0.0f;

    if (!FeatureEnabled(Frame, FeatureTemporalRestart) && Frame.FrameIndex > 0u)
    {
        for (uint Tap = 0u; Tap < 4u; Tap++)
        {
            int2 Offset = int2(int(Tap & 1u), int(Tap >> 1u));
            int2 Sample = Base + Offset;
            if (any(Sample < int2(0)) || any(Sample >= int2(Frame.TraceExtent)))
            {
                continue;
            }
            float4 PriorGuide = PriorTraceGuides.Load(int3(Sample, 0));
            if (PriorGuide.w <= 0.0f)
            {
                continue;
            }
            float3 PriorNormal = DecodeOctahedral(PriorGuide.xy);
            if (dot(Normal, PriorNormal) < 0.85f || !ClassifyPriorDepth(PriorGuide.z, ExpectedDepth, ViewDepth))
            {
                continue;
            }
            float  Bx       = (Offset.x == 1) ? Fraction.x : (1.0f - Fraction.x);
            float  By       = (Offset.y == 1) ? Fraction.y : (1.0f - Fraction.y);
            float  Bilinear = Bx * By;
            float3 PriorSig = PriorFiltered.Load(int3(Sample, 0)).rgb;
            float4 PriorMom = PriorMoments.Load(int3(Sample, 0));
            AccumulatedSignal  += PriorSig * Bilinear;
            AccumulatedMoments += PriorMom.xy * Bilinear;
            AccumulatedTally   += PriorMom.z * Bilinear;
            WeightSum          += Bilinear;
        }
    }

    float3 Signal    = Fresh;
    float  Lum       = ResolveLuminance(Fresh);
    float2 Moments   = float2(Lum, Lum * Lum);
    float  Tally     = 1.0f;
    if (WeightSum > 1.0e-3f)
    {
        float3 PriorSig  = AccumulatedSignal / WeightSum;
        float2 PriorMom  = AccumulatedMoments / WeightSum;
        Tally            = min(AccumulatedTally / WeightSum + 1.0f, 32.0f);
        float  Blend     = max(1.0f / Tally, 0.05f);
        Signal           = lerp(PriorSig, Fresh, Blend);
        float  SignalLum = ResolveLuminance(Signal);
        Moments          = lerp(PriorMom, float2(SignalLum, SignalLum * SignalLum), max(Blend, 0.12f));
    }

    float Variance               = max(0.0f, Moments.y - Moments.x * Moments.x);
    float Boost                  = (Tally < 4.0f) ? (4.0f / Tally) : 1.0f;
    IntegratedSignal[TracePixel] = float4(Signal, Variance * Boost);
    CurrentMoments[TracePixel]   = float4(Moments, Tally, 1.0f);
}
