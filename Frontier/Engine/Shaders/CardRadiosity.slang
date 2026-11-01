//==========================================================================================================================================
//                                                            CARD RADIOSITY
//==========================================================================================================================================
// 🧩 Hemispherical gather for card radiosity sites: 16 stratified cosine rays per site, hits read last frame's card radiance.

#include "CardSampling.slang"
#include "CardIrradiance.slang"
#include "DiscrepancySequence.slang"

[[vk::binding(1, 0)]] StructuredBuffer<uint2>    Tiles;
[[vk::binding(2, 0)]] ConstantBuffer<CardWorkRecord> Work;
[[vk::binding(3, 0)]] Texture2D<float4>          CardNormal;
[[vk::binding(4, 0)]] RWStructuredBuffer<float4> Sites;

groupshared uint   SiteKeys[4];
groupshared float3 LaneRadiance[64];

[shader("compute")]
[numthreads(64, 1, 1)]
void IntegrateCardRadiosity(uint3 Group : SV_GroupID, uint Lane : SV_GroupIndex)
{
    uint WorkIndex = ResolveWorkIndex(Group);
    if (WorkIndex >= Work.TileCount)
    {
        return;
    }
    uint Site = Lane >> 4u;
    uint Ray  = Lane & 15u;
    if (Lane < 4u)
    {
        SiteKeys[Lane] = 0xFFFFFFFFu;
    }
    GroupMemoryBarrierWithGroupSync();

    uint2      Assignment    = Tiles[WorkIndex];
    CardRecord Card          = Cards[Assignment.x];
    uint2      SiteOrigin    = ResolveTileTexel(Assignment, uint2(Site & 1u, Site >> 1u) * 4u);
    uint2      CandidateTile = SiteOrigin + uint2(Ray & 3u, Ray >> 2u);

    // 1. Elect the occupied texel nearest the block centre
    if (all(CandidateTile < Card.TexelExtent))
    {
        float Depth = CardDepth.Load(int3(int2(Card.TexelOrigin + CandidateTile), 0)).x;
        if (Depth <= 1.5f)
        {
            float2 Offset = float2(float(Ray & 3u), float(Ray >> 2u)) - float2(1.5f);
            uint   Key    = (uint(dot(Offset, Offset) * 4.0f) << 4u) | Ray;
            InterlockedMin(SiteKeys[Site], Key);
        }
    }
    GroupMemoryBarrierWithGroupSync();
    uint Elected = SiteKeys[Site];

    float3 Radiance = float3(0.0f);
    if (Elected != 0xFFFFFFFFu)
    {
        uint           ElectedRay  = Elected & 15u;
        uint2          TileTexel   = SiteOrigin + uint2(ElectedRay & 3u, ElectedRay >> 2u);
        int2           Texel       = int2(Card.TexelOrigin + TileTexel);
        float          Depth       = CardDepth.Load(int3(Texel, 0)).x;
        OccupantRecord Occupant    = Occupants[Card.Occupant];
        float3         Coordinates = float3((float2(TileTexel) + 0.5f) / float2(Card.TexelExtent), Depth);
        float3         Position    = MulMat4Point(Occupant.LocalToWorld, ReconstructCardLocal(Card, Coordinates));
        float3         LocalNormal = CardNormal.Load(int3(Texel, 0)).xyz * 2.0f - 1.0f;
        float3         Normal      = normalize(MulMat4Vec(Occupant.LocalToWorld, LocalNormal));

        // 2. One stratum of a jittered 4x4 cosine hemisphere per lane
        uint         Seed      = ConstructPixelSeed(uint2(Texel), Frame.FrameIndex, Ray);
        float        U0        = AdvanceUniform(Seed);
        float        U1        = AdvanceUniform(Seed);
        float2       Pair      = (float2(float(Ray & 3u), float(Ray >> 2u)) + float2(U0, U1)) * 0.25f;
        float3       Direction = TransformLocalToWorld(Normal, ProjectCosineHemisphere(Pair));
        float        Bias      = ResolveSurfaceBias(Position);
        TraversalHit Hit       = TraverseSceneDistance(Position + Normal * Bias, Direction, 0.5f * Bias, 120.0f, 0.02f);
        Radiance               = ResolveTraversalRadiance(Hit, Direction);
    }
    LaneRadiance[Lane] = Radiance;
    GroupMemoryBarrierWithGroupSync();

    // 3. Fold E = pi . mean(L) into the site estimate
    if (Ray == 0u)
    {
        uint2 SiteTexel = Card.TexelOrigin + SiteOrigin;
        uint  SiteIndex = (SiteTexel.y / 4u) * Work.SiteStride + SiteTexel.x / 4u;
        if (Elected == 0xFFFFFFFFu)
        {
            Sites[SiteIndex] = float4(0.0f);
            return;
        }
        float3 Sum = float3(0.0f);
        for (uint Index = 0u; Index < 16u; Index++)
        {
            Sum += LaneRadiance[Site * 16u + Index];
        }
        float3 Estimate = π * Sum / 16.0f;
        float4 Prior    = Sites[SiteIndex];
        bool   Dynamic  = (Occupants[Card.Occupant].Roles & RoleDynamic) != 0u;
        float  Floor    = Dynamic ? Work.DynamicWeight : Work.StaticWeight;
        float  Fraction = max(1.0f / (Prior.w + 1.0f), Floor);
        Sites[SiteIndex] = float4(lerp(Prior.rgb, Estimate, Fraction), min(Prior.w + 1.0f, 64.0f));
    }
}
