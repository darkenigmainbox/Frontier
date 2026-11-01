//==========================================================================================================================================
//                                                          VARIANCE UPSAMPLE
//==========================================================================================================================================
// 🧩 Joint bilateral upsampling of filtered trace-resolution signals (irradiance or reflection) to full screen resolution.

#include "FrameDescriptor.slang"
#include "PackingCodec.slang"

[[vk::binding(1, 0)]] Texture2D<float4>                     SurfaceAttributes;
[[vk::binding(2, 0)]] Texture2D<float>                      SurfaceDepth;
[[vk::binding(3, 0)]] Texture2D<float4>                     CurrentTraceGuides;
[[vk::binding(4, 0)]] Texture2D<float4>                     FilteredTraceSignal;
[[vk::binding(5, 0)]] [format("rgba16f")] RWTexture2D<float4> ScreenSignalTarget;

[shader("compute")]
[numthreads(8, 8, 1)]
void ProjectScreenSignal(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 ScreenPixel = Invocation.xy;
    if (any(float2(ScreenPixel) >= Frame.ScreenExtent))
    {
        return;
    }

    float Depth = SurfaceDepth.Load(int3(int2(ScreenPixel), 0));
    if (Depth <= 0.0f)
    {
        ScreenSignalTarget[ScreenPixel] = float4(0.0f);
        return;
    }

    float4 Attributes  = SurfaceAttributes.Load(int3(int2(ScreenPixel), 0));
    float3 Normal      = DecodeOctahedral(Attributes.xy);
    float3 Position    = ReconstructWorldPosition(float2(ScreenPixel) + 0.5f, Depth);
    float  ViewDepth   = ResolveViewDepth(Position);

    float2 TraceCoord  = (float2(ScreenPixel) + 0.5f) / float(Frame.TraceScale) - 0.5f;
    int2   Base        = int2(floor(TraceCoord));
    float2 Fraction    = TraceCoord - float2(Base);
    int2   TraceLimit  = int2(Frame.TraceExtent) - int2(1);

    float3 SumSignal   = float3(0.0f);
    float  SumWeight   = 0.0f;

    for (uint Tap = 0u; Tap < 4u; Tap++)
    {
        int2 Offset = int2(int(Tap & 1u), int(Tap >> 1u));
        int2 Sample = clamp(Base + Offset, int2(0), TraceLimit);
        float4 Guide = CurrentTraceGuides.Load(int3(Sample, 0));
        if (Guide.w <= 0.0f)
        {
            continue;
        }
        float3 TapNormal = DecodeOctahedral(Guide.xy);
        float  NormW     = pow(max(0.0f, dot(Normal, TapNormal)), 32.0f);
        float  DepthW    = exp(-abs(ViewDepth - Guide.z) / max(0.06f * ViewDepth, 1.0e-3f));
        float  Bx        = (Offset.x == 1) ? Fraction.x : (1.0f - Fraction.x);
        float  By        = (Offset.y == 1) ? Fraction.y : (1.0f - Fraction.y);
        float  Weight    = max(Bx * By, 1.0e-3f) * NormW * DepthW;
        SumSignal       += FilteredTraceSignal.Load(int3(Sample, 0)).rgb * Weight;
        SumWeight       += Weight;
    }

    if (SumWeight <= 1.0e-5f)
    {
        int2 Fallback = clamp(int2(round(TraceCoord)), int2(0), TraceLimit);
        ScreenSignalTarget[ScreenPixel] = float4(FilteredTraceSignal.Load(int3(Fallback, 0)).rgb, 1.0f);
        return;
    }

    ScreenSignalTarget[ScreenPixel] = float4(SumSignal / SumWeight, 1.0f);
}
