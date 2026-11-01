//==========================================================================================================================================
//                                                          RESERVOIR SPATIAL
//==========================================================================================================================================
// 🧩 Spatial reservoir reuse with solid-angle reconnection Jacobian and visibility validation, writing demodulated irradiance.

#include "CardSampling.slang"
#include "ReservoirRecords.slang"
#include "DiscrepancySequence.slang"
#include "RayTraversal.slang"

[[vk::binding(1, 0)]] Texture2D<float>                      SurfaceDepth;
[[vk::binding(2, 0)]] Texture2D<float4>                     CurrentTraceGuides;
[[vk::binding(3, 0)]] StructuredBuffer<ReservoirRecord>     TemporalReservoirs;
[[vk::binding(4, 0)]] RWStructuredBuffer<ReservoirRecord>   SpatialReservoirs;
[[vk::binding(5, 0)]] [format("rgba16f")] RWTexture2D<float4> ResampledIrradiance;

uint ResolveReservoirIndex(uint2 Pixel)
{
    return Pixel.y * uint(Frame.TraceExtent.x) + Pixel.x;
}

float3 ReconstructTraceWorldPosition(uint2 TracePixel)
{
    uint   Scale       = Frame.TraceScale;
    uint2  ScreenLimit = uint2(Frame.ScreenExtent) - uint2(1u);
    uint2  ScreenPixel = min(TracePixel * Scale + uint2(Scale / 2u), ScreenLimit);
    float  Depth       = SurfaceDepth.Load(int3(int2(ScreenPixel), 0));
    return ReconstructWorldPosition(float2(ScreenPixel) + 0.5f, Depth);
}

// 📝 Reconnection Jacobian |d omega_q / d omega_p| = (cos phi_r / cos phi_q) . (|x_q - x_s|^2 / |x_p - x_s|^2).
float ResolveReconnectionJacobian(float3 ReceiverPosition, float3 NeighbourPosition, ReservoirRecord Sample)
{
    if (UnpackReservoirIdentity(Sample) == SkyIdentity)
    {
        return 1.0f;
    }
    float3 ToReceiver        = ReceiverPosition - Sample.SamplePosition;
    float3 ToNeighbour       = NeighbourPosition - Sample.SamplePosition;
    float  ReceiverSquared   = dot(ToReceiver, ToReceiver);
    float  NeighbourSquared  = dot(ToNeighbour, ToNeighbour);
    if (ReceiverSquared < 1.0e-6f || NeighbourSquared < 1.0e-6f)
    {
        return 0.0f;
    }
    float3 SampleNormal      = UnpackOctahedral(Sample.SampleNormal);
    float  CosineAtReceiver  = max(dot(SampleNormal, ToReceiver * rsqrt(ReceiverSquared)), 0.0f);
    float  CosineAtNeighbour = max(dot(SampleNormal, ToNeighbour * rsqrt(NeighbourSquared)), 0.0f);
    if (CosineAtNeighbour < 1.0e-4f || CosineAtReceiver < 1.0e-4f)
    {
        return 0.0f;
    }
    return (CosineAtReceiver / CosineAtNeighbour) * (NeighbourSquared / ReceiverSquared);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void ResampleSpatial(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 TracePixel = Invocation.xy;
    if (any(float2(TracePixel) >= Frame.TraceExtent))
    {
        return;
    }

    uint   Slot  = ResolveReservoirIndex(TracePixel);
    float4 Guide = CurrentTraceGuides.Load(int3(int2(TracePixel), 0));
    if (Guide.w <= 0.0f)
    {
        SpatialReservoirs[Slot]         = ConstructEmptyReservoir();
        ResampledIrradiance[TracePixel] = float4(0.0f);
        return;
    }

    float3          Normal      = DecodeOctahedral(Guide.xy);
    float           ViewDepth   = Guide.z;
    float3          Position    = ReconstructTraceWorldPosition(TracePixel);
    ReservoirRecord Own         = TemporalReservoirs[Slot];
    float3          OwnRadiance = UnpackReservoirRadiance(Own);
    float           OwnTarget   = ResolveReservoirTarget(Position, Normal, Own.SamplePosition, OwnRadiance);

    ReservoirRecord Combined       = Own;
    float           SelectedTarget = OwnTarget;
    float           WeightSum      = OwnTarget * Own.Weight * Own.Tally;
    float           Tally          = Own.Tally;
    bool            Adopted        = false;

    uint Seed          = ConstructPixelSeed(TracePixel, Frame.FrameIndex, 2u);
    uint Count         = min(Frame.SpatialCount, 8u);
    bool UseRayTracing = FeatureEnabled(Frame, FeatureRayTracing);
    bool UseFirefly    = FeatureEnabled(Frame, FeatureFireflyFilter);
    float MaxJacobian  = UseFirefly ? 5.0f : 8.0f;

    uint2 CandidatePixels[8];
    float CandidateTallies[8];
    for (uint InitIdx = 0u; InitIdx < 8u; InitIdx++)
    {
        CandidatePixels[InitIdx]  = uint2(0u);
        CandidateTallies[InitIdx] = 0.0f;
    }
    uint  AcceptedCount = 0u;

    if (FeatureEnabled(Frame, FeatureSpatialReuse) && Count > 0u)
    {
        for (uint Index = 0u; Index < Count; Index++)
        {
            float  U0     = AdvanceUniform(Seed);
            float  U1     = AdvanceUniform(Seed);
            float2 Disk   = ProjectUniformDisk(float2(U0, U1)) * Frame.SpatialRadius;
            int2   Offset = int2(round(Disk));
            if (Offset.x == 0 && Offset.y == 0)
            {
                continue;
            }
            int2 Neighbour = int2(TracePixel) + Offset;
            if (any(Neighbour < int2(0)) || any(Neighbour >= int2(Frame.TraceExtent)))
            {
                continue;
            }
            float4 NeighbourGuide = CurrentTraceGuides.Load(int3(Neighbour, 0));
            if (NeighbourGuide.w <= 0.0f)
            {
                continue;
            }
            float3 NeighbourNormal = DecodeOctahedral(NeighbourGuide.xy);
            if (dot(Normal, NeighbourNormal) < 0.9f || abs(NeighbourGuide.z - ViewDepth) > 0.1f * ViewDepth)
            {
                continue;
            }
            uint            NeighbourPixel = ResolveReservoirIndex(uint2(Neighbour));
            ReservoirRecord Candidate      = TemporalReservoirs[NeighbourPixel];
            float3          NeighbourPos   = ReconstructTraceWorldPosition(uint2(Neighbour));
            if (abs(dot(Normal, NeighbourPos - Position)) > 0.08f * ViewDepth)
            {
                continue;
            }
            float ClampedTally = min(Candidate.Tally, 10.0f);
            CandidatePixels[AcceptedCount]  = uint2(Neighbour);
            CandidateTallies[AcceptedCount] = ClampedTally;
            AcceptedCount++;
            if (ClampedTally <= 0.0f || Candidate.Weight <= 0.0f)
            {
                continue;
            }
            float Jacobian = ResolveReconnectionJacobian(Position, NeighbourPos, Candidate);
            if (Jacobian <= (1.0f / MaxJacobian) || Jacobian >= MaxJacobian)
            {
                continue;
            }
            float3 CandidateRadiance = UnpackReservoirRadiance(Candidate);
            float  CandidateTarget   = ResolveReservoirTarget(Position, Normal, Candidate.SamplePosition, CandidateRadiance);
            float  StreamWeight      = CandidateTarget * Jacobian * Candidate.Weight * ClampedTally;
            WeightSum += StreamWeight;
            Tally     += ClampedTally;
            if (StreamWeight > 0.0f && AdvanceUniform(Seed) * WeightSum < StreamWeight)
            {
                Combined.SamplePosition = Candidate.SamplePosition;
                Combined.SampleNormal   = Candidate.SampleNormal;
                Combined.Radiance       = Candidate.Radiance;
                SelectedTarget          = CandidateTarget;
                Adopted                 = true;
            }
        }
    }

    float Bias = ResolveSurfaceBias(Position);
    if (Adopted && SelectedTarget > 0.0f && FeatureEnabled(Frame, FeatureVisibilityReuse))
    {
        float3 Toward      = Combined.SamplePosition - Position;
        float  DistanceLen = length(Toward);
        float3 Dir         = Toward / max(DistanceLen, 1.0e-4f);
        float  Visible     = 1.0f;
        if (UseRayTracing)
        {
            float MaxReach = (UnpackReservoirIdentity(Combined) == SkyIdentity) ? 260.0f : max(DistanceLen - 0.03f, RayEpsilon);
            Visible        = TraceSceneVisibility(Position + Normal * RayEpsilon, Dir, RayEpsilon, MaxReach);
        }
        else
        {
            float Stop = (UnpackReservoirIdentity(Combined) == SkyIdentity) ? 260.0f : max(DistanceLen - 1.5f * Bias, Bias);
            Visible    = TraverseSceneVisibility(Position + Normal * Bias, Dir, 0.5f * Bias, Stop);
        }
        if (Visible <= 0.0f)
        {
            Combined       = Own;
            SelectedTarget = OwnTarget;
            WeightSum      = OwnTarget * Own.Weight * Own.Tally;
            Tally          = Own.Tally;
        }
    }

    float Normalization = Own.Tally;
    float3 WinningDirection = normalize(Combined.SamplePosition - Position);
    for (uint Index = 0u; Index < AcceptedCount; Index++)
    {
        float4 NeighbourGuide  = CurrentTraceGuides.Load(int3(int2(CandidatePixels[Index]), 0));
        float3 NeighbourNormal = DecodeOctahedral(NeighbourGuide.xy);
        if (dot(NeighbourNormal, WinningDirection) > 0.0f)
        {
            Normalization += CandidateTallies[Index];
        }
    }

    Combined.Tally  = Tally;
    Combined.Weight = (SelectedTarget > 1.0e-6f && Normalization > 0.0f) ? (WeightSum / (Normalization * SelectedTarget)) : 0.0f;
    if (UseFirefly)
    {
        Combined.Weight = min(Combined.Weight, 10.0f);
    }
    SpatialReservoirs[Slot] = Combined;

    float3 Irradiance = float3(0.0f);
    if (Combined.Weight > 0.0f)
    {
        float3 Radiance  = UnpackReservoirRadiance(Combined);
        float3 Direction = normalize(Combined.SamplePosition - Position);
        float  Cosine    = max(dot(Normal, Direction), 0.0f);
        Irradiance       = Radiance * Cosine * Combined.Weight;
        if (UseFirefly)
        {
            float Lum    = ResolveLuminance(Irradiance);
            float CapLum = 16.0f + 2.0f * ResolveLuminance(Frame.SunIlluminance);
            if (Lum > CapLum)
            {
                Irradiance *= CapLum / max(Lum, 1.0e-4f);
            }
        }
    }
    ResampledIrradiance[TracePixel] = float4(Irradiance, 1.0f);
}
