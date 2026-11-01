//==========================================================================================================================================
//                                                          RESERVOIR TEMPORAL
//==========================================================================================================================================
// 🧩 Initial cosine candidate + motion-reprojected temporal reservoir reuse at the resampling resolution.

#include "CardSampling.slang"
#include "ReservoirRecords.slang"
#include "DiscrepancySequence.slang"
#include "RayTraversal.slang"

[[vk::binding(1, 0)]] Texture2D<float4>                     SurfaceAttributes;
[[vk::binding(2, 0)]] Texture2D<float>                      SurfaceDepth;
[[vk::binding(3, 0)]] Texture2D<float4>                     SurfaceMotion;
[[vk::binding(4, 0)]] Texture2D<float4>                     PriorTraceGuides;
[[vk::binding(5, 0)]] [format("rgba32f")] RWTexture2D<float4> CurrentTraceGuides;
[[vk::binding(6, 0)]] StructuredBuffer<ReservoirRecord>     PriorReservoirs;
[[vk::binding(7, 0)]] RWStructuredBuffer<ReservoirRecord>   TemporalReservoirs;

uint ResolveReservoirIndex(uint2 Pixel)
{
    return Pixel.y * uint(Frame.TraceExtent.x) + Pixel.x;
}

float3 RefreshSampleRadiance(ReservoirRecord Reservoir, float3 ReceiverPosition)
{
    uint Identity = UnpackReservoirIdentity(Reservoir);
    if (Identity == SkyIdentity)
    {
        return SampleSkyRadiance(Reservoir.SamplePosition - ReceiverPosition);
    }
    float3 Normal = UnpackOctahedral(Reservoir.SampleNormal);
    uint   Level  = min(ResolveFinestClip(Reservoir.SamplePosition, 2.0f), Distance.ClipCount - 1u);
    float4 Card   = SampleCardRadiance(Reservoir.SamplePosition, Normal, Identity, ResolveCardTolerance(Level));
    if (Card.w > 0.0f)
    {
        return Card.rgb;
    }
    return UnpackReservoirRadiance(Reservoir);
}

ReservoirRecord CarryReservoirSample(ReservoirRecord Source)
{
    uint Identity = UnpackReservoirIdentity(Source);
    uint OccCount = 0u;
    uint OccStride = 0u;
    Occupants.GetDimensions(OccCount, OccStride);
    if (Identity >= OccCount)
    {
        return Source;
    }
    OccupantRecord Occupant = Occupants[Identity];
    if ((Occupant.Roles & RoleDynamic) == 0u)
    {
        return Source;
    }
    ReservoirRecord Carried = Source;
    float3          Local   = MulMat4Point(Occupant.PreviousWorldToLocal, Source.SamplePosition);
    Carried.SamplePosition  = MulMat4Point(Occupant.LocalToWorld, Local);
    float3 PriorNormal      = UnpackOctahedral(Source.SampleNormal);
    float3 LocalNormal      = MulMat4Vec(Occupant.PreviousWorldToLocal, PriorNormal);
    Carried.SampleNormal    = PackOctahedral(normalize(MulMat4Vec(Occupant.LocalToWorld, LocalNormal)));
    return Carried;
}

[shader("compute")]
[numthreads(8, 8, 1)]
void ResampleTemporal(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 TracePixel = Invocation.xy;
    if (any(float2(TracePixel) >= Frame.TraceExtent))
    {
        return;
    }

    uint   Scale       = Frame.TraceScale;
    uint2  ScreenLimit = uint2(Frame.ScreenExtent) - uint2(1u);
    uint2  ScreenPixel = min(TracePixel * Scale + uint2(Scale / 2u), ScreenLimit);
    float  Depth       = SurfaceDepth.Load(int3(int2(ScreenPixel), 0));
    uint   Slot        = ResolveReservoirIndex(TracePixel);
    if (Depth <= 0.0f)
    {
        CurrentTraceGuides[TracePixel] = float4(0.0f);
        TemporalReservoirs[Slot]       = ConstructEmptyReservoir();
        return;
    }

    float2 ScreenCentre  = float2(ScreenPixel) + 0.5f;
    float3 Position      = ReconstructWorldPosition(ScreenCentre, Depth);
    float4 Attributes    = SurfaceAttributes.Load(int3(int2(ScreenPixel), 0));
    float3 Normal        = DecodeOctahedral(Attributes.xy);
    float  ViewDepth     = ResolveViewDepth(Position);
    float  ExpectedDepth = ResolvePriorViewDepth(Position);
    CurrentTraceGuides[TracePixel] = float4(EncodeOctahedral(Normal), ViewDepth, 1.0f + ExpectedDepth);

    uint   Seed          = ConstructPixelSeed(TracePixel, Frame.FrameIndex, 1u);
    float  Bias          = ResolveSurfaceBias(Position);
    float  WeightSum     = 0.0f;
    float  Tally         = 0.0f;
    float  Selected      = 0.0f;
    float3 ChosenPos     = Position + Normal * SkyReach;
    uint   ChosenNormal  = PackOctahedral(-Normal);
    uint2  ChosenRad     = PackHalfTriple(float3(0.0f), float(SkyIdentity));

    bool UseRayTracing   = FeatureEnabled(Frame, FeatureRayTracing);
    uint CandidateCount  = UseRayTracing ? ResolveInitialCandidates(Frame) : 1u;
    uint MaxBounces      = ResolveMaxBounces(Frame);

    for (uint Cand = 0u; Cand < CandidateCount; Cand++)
    {
        float2 Pair           = SampleDiscrepancyPair(TracePixel, Frame.FrameIndex * CandidateCount + Cand);
        float3 Direction      = TransformLocalToWorld(Normal, ProjectCosineHemisphere(Pair));
        float3 SamplePosition = Position + Direction * SkyReach;
        float3 SampleNormal   = -Direction;
        float3 Radiance       = float3(0.0f);
        uint   Identity       = SkyIdentity;

        if (UseRayTracing)
        {
            TracedPathSample Traced = TraceMultiBouncePath(Position, Normal, Direction, MaxBounces, Seed);
            SamplePosition = Traced.FirstPosition;
            SampleNormal   = Traced.FirstNormal;
            Radiance       = Traced.Radiance;
            Identity       = Traced.FirstIdentity;
        }
        else
        {
            TraversalHit Hit = TraverseSceneDistance(Position + Normal * Bias, Direction, 0.5f * Bias, 260.0f, 0.0f);
            SamplePosition   = Hit.Hit ? Hit.Position : (Position + Direction * SkyReach);
            SampleNormal     = Hit.Hit ? Hit.Normal   : (-Direction);
            Radiance         = ResolveTraversalRadiance(Hit, Direction);
            Identity         = Hit.Identity;
        }

        float SourcePdf       = max(dot(Normal, Direction), 1.0e-4f) * InversePi;
        float CandidateTarget = ResolveReservoirTarget(Position, Normal, SamplePosition, Radiance);
        float CandidateWeight = CandidateTarget / SourcePdf;

        WeightSum += CandidateWeight;
        Tally     += 1.0f;
        if (CandidateWeight > 0.0f && AdvanceUniform(Seed) * WeightSum < CandidateWeight)
        {
            ChosenPos    = SamplePosition;
            ChosenNormal = PackOctahedral(SampleNormal);
            ChosenRad    = PackHalfTriple(Radiance, float(Identity));
            Selected     = CandidateTarget;
        }
    }

    if (Tally > 1.0f)
    {
        WeightSum /= Tally;
        Tally      = 1.0f;
    }

    ReservoirRecord Reservoir;
    Reservoir.SamplePosition = ChosenPos;
    Reservoir.SampleNormal   = ChosenNormal;
    Reservoir.Radiance       = ChosenRad;
    Reservoir.Weight         = WeightSum;
    Reservoir.Tally          = Tally;

    // 2. Temporal reuse: carry the prior frame's reservoir across the surface motion vector
    if (FeatureEnabled(Frame, FeatureTemporalReuse) && !FeatureEnabled(Frame, FeatureTemporalRestart) && Frame.FrameIndex > 0u)
    {
        float2 Velocity   = SurfaceMotion.Load(int3(int2(ScreenPixel), 0)).xy * Frame.ScreenExtent;
        float2 PriorTrace = (ScreenCentre - Velocity) / float(Scale) - 0.5f;
        int2   PriorPixel = int2(round(PriorTrace));
        if (all(PriorPixel >= int2(0)) && all(PriorPixel < int2(Frame.TraceExtent)))
        {
            float4 PriorGuide = PriorTraceGuides.Load(int3(PriorPixel, 0));
            if (PriorGuide.w > 0.0f)
            {
                float3 PriorNormal = DecodeOctahedral(PriorGuide.xy);
                if (dot(Normal, PriorNormal) > 0.85f && ClassifyPriorDepth(PriorGuide.z, ExpectedDepth, ViewDepth))
                {
                    ReservoirRecord Prior = CarryReservoirSample(PriorReservoirs[ResolveReservoirIndex(uint2(PriorPixel))]);
                    float ClampedTally    = min(Prior.Tally, Frame.TemporalTallyLimit);
                    if (ClampedTally > 0.0f && Prior.Weight > 0.0f)
                    {
                        float3 PriorRadiance = UnpackReservoirRadiance(Prior);
                        if (!UseRayTracing && FeatureEnabled(Frame, FeatureRadianceRefresh))
                        {
                            PriorRadiance  = RefreshSampleRadiance(Prior, Position);
                            Prior.Radiance = PackHalfTriple(PriorRadiance, float(UnpackReservoirIdentity(Prior)));
                        }
                        float PriorTarget = ResolveReservoirTarget(Position, Normal, Prior.SamplePosition, PriorRadiance);
                        uint  Phase       = ((TracePixel.x & 1u) + ((TracePixel.y & 1u) << 1u) + Frame.FrameIndex) & 3u;
                        if (PriorTarget > 0.0f && FeatureEnabled(Frame, FeatureVisibilityReuse) && Phase == 0u)
                        {
                            float3 Toward      = Prior.SamplePosition - Position;
                            float  DistanceLen = length(Toward);
                            float3 Dir         = Toward / max(DistanceLen, 1.0e-4f);
                            float  Visible     = 1.0f;
                            if (UseRayTracing)
                            {
                                float MaxReach = (UnpackReservoirIdentity(Prior) == SkyIdentity) ? 260.0f : max(DistanceLen - 0.03f, RayEpsilon);
                                Visible        = TraceSceneVisibility(Position + Normal * RayEpsilon, Dir, RayEpsilon, MaxReach);
                            }
                            else
                            {
                                float Stop = (UnpackReservoirIdentity(Prior) == SkyIdentity) ? 260.0f : max(DistanceLen - 1.5f * Bias, Bias);
                                Visible    = TraverseSceneVisibility(Position + Normal * Bias, Dir, 0.5f * Bias, Stop);
                            }
                            PriorTarget *= Visible;
                        }
                        float StreamWeight = PriorTarget * Prior.Weight * ClampedTally;
                        WeightSum += StreamWeight;
                        Tally     += ClampedTally;
                        if (StreamWeight > 0.0f && AdvanceUniform(Seed) * WeightSum < StreamWeight)
                        {
                            Reservoir.SamplePosition = Prior.SamplePosition;
                            Reservoir.SampleNormal   = Prior.SampleNormal;
                            Reservoir.Radiance       = Prior.Radiance;
                            Selected                 = PriorTarget;
                        }
                    }
                }
            }
        }
    }

    Reservoir.Tally  = Tally;
    Reservoir.Weight = (Selected > 1.0e-6f && Tally > 0.0f) ? (WeightSum / (Tally * Selected)) : 0.0f;
    TemporalReservoirs[Slot] = Reservoir;
}
