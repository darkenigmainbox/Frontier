//==========================================================================================================================================
//                                                          VARIANCE WAVELET
//==========================================================================================================================================
// 🧩 Edge-avoiding à-trous wavelet filter over (irradiance, variance), guided by normal, view depth, and luminance variance.

#include "FrameDescriptor.slang"
#include "PackingCodec.slang"

struct WaveletStepRecord
{
    uint  StepWidth; // [px] 1, 2, 4, 8, ...
    float PhiColor;
    float PhiNormal;
    float PhiDepth;
};

[[vk::binding(1, 0)]] ConstantBuffer<WaveletStepRecord>     Wavelet;
[[vk::binding(2, 0)]] Texture2D<float4>                     CurrentTraceGuides;
[[vk::binding(3, 0)]] Texture2D<float4>                     InputSignal;
[[vk::binding(4, 0)]] [format("rgba16f")] RWTexture2D<float4> OutputSignal;

static const float KernelWeights[5] = { 1.0f / 16.0f, 1.0f / 4.0f, 3.0f / 8.0f, 1.0f / 4.0f, 1.0f / 16.0f };

float ResolvePreconvolvedVariance(int2 Centre, int2 Limit)
{
    static const float G[3] = { 0.25f, 0.50f, 0.25f };
    float Sum = 0.0f;
    for (int Y = -1; Y <= 1; Y++)
    {
        for (int X = -1; X <= 1; X++)
        {
            int2  Sample = clamp(Centre + int2(X, Y), int2(0), Limit);
            float Weight = G[X + 1] * G[Y + 1];
            Sum += max(0.0f, InputSignal.Load(int3(Sample, 0)).w) * Weight;
        }
    }
    return Sum;
}

[shader("compute")]
[numthreads(8, 8, 1)]
void ConvolveWavelet(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 TracePixel = Invocation.xy;
    if (any(float2(TracePixel) >= Frame.TraceExtent))
    {
        return;
    }

    int2   Pixel      = int2(TracePixel);
    float4 CentreVal  = InputSignal.Load(int3(Pixel, 0));
    if (!FeatureEnabled(Frame, FeatureVarianceKernel))
    {
        OutputSignal[TracePixel] = CentreVal;
        return;
    }

    float4 Guide = CurrentTraceGuides.Load(int3(Pixel, 0));
    if (Guide.w <= 0.0f)
    {
        OutputSignal[TracePixel] = float4(0.0f);
        return;
    }

    int2   Limit       = int2(Frame.TraceExtent) - int2(1);
    float3 CentreNorm  = DecodeOctahedral(Guide.xy);
    float  CentreDepth = Guide.z;
    float  CentreLum   = ResolveLuminance(CentreVal.rgb);
    float  FilteredVar = ResolvePreconvolvedVariance(Pixel, Limit);
    float  SigmaLum    = Wavelet.PhiColor * sqrt(max(0.0f, FilteredVar)) + 1.0e-4f;
    int    Step        = int(Wavelet.StepWidth);

    float3 SumSignal   = CentreVal.rgb;
    float  SumVariance = CentreVal.w;
    float  SumWeight   = 1.0f;

    for (int Y = -2; Y <= 2; Y++)
    {
        for (int X = -2; X <= 2; X++)
        {
            if (X == 0 && Y == 0)
            {
                continue;
            }
            int2 Sample = Pixel + int2(X, Y) * Step;
            if (any(Sample < int2(0)) || any(Sample > Limit))
            {
                continue;
            }
            float4 TapGuide = CurrentTraceGuides.Load(int3(Sample, 0));
            if (TapGuide.w <= 0.0f)
            {
                continue;
            }
            float3 TapNorm  = DecodeOctahedral(TapGuide.xy);
            float  NormW    = pow(max(0.0f, dot(CentreNorm, TapNorm)), Wavelet.PhiNormal);
            float  DepthW   = exp(-abs(CentreDepth - TapGuide.z) / max(Wavelet.PhiDepth * CentreDepth * float(Step), 1.0e-4f));

            float4 TapVal   = InputSignal.Load(int3(Sample, 0));
            float  TapLum   = ResolveLuminance(TapVal.rgb);
            float  LumW     = exp(-abs(CentreLum - TapLum) / SigmaLum);

            float  Kernel   = KernelWeights[X + 2] * KernelWeights[Y + 2];
            float  Weight   = Kernel * NormW * DepthW * LumW;
            SumSignal      += TapVal.rgb * Weight;
            SumVariance    += TapVal.w * (Weight * Weight);
            SumWeight      += Weight;
        }
    }

    float InvW = 1.0f / max(SumWeight, 1.0e-5f);
    OutputSignal[TracePixel] = float4(SumSignal * InvW, SumVariance * InvW * InvW);
}
