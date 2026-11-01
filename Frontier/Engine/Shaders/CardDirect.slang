//==========================================================================================================================================
//                                                             CARD DIRECT
//==========================================================================================================================================
// 🧩 Direct sun and clustered light irradiance on every scheduled card texel, feeding the surface cache and indirect GI radiosity.

#include "FrameDescriptor.slang"
#include "DistanceTraversal.slang"
#include "CardProjection.slang"
#include "CardIrradiance.slang"
#include "FireIllumination.slang"
#include "ClusteredLights.slang"

[[vk::binding(1, 0)]] StructuredBuffer<CardRecord>           Cards;
[[vk::binding(2, 0)]] StructuredBuffer<OccupantRecord>       Occupants;
[[vk::binding(3, 0)]] StructuredBuffer<uint2>                Tiles;
[[vk::binding(4, 0)]] ConstantBuffer<CardWorkRecord>         Work;
[[vk::binding(5, 0)]] Texture2D<float4>                      CardNormal;
[[vk::binding(6, 0)]] Texture2D<float4>                      CardDepth;
[[vk::binding(7, 0)]] [format("rgba16f")] RWTexture2D<float4> CardDirectTarget;
[[vk::binding(8, 0)]] StructuredBuffer<ClusteredLightBuffer> SceneLights;

[shader("compute")]
[numthreads(8, 8, 1)]
void IntegrateCardDirect(uint3 Group : SV_GroupID, uint3 Local : SV_GroupThreadID)
{
    uint WorkIndex = ResolveWorkIndex(Group);
    if (WorkIndex >= Work.TileCount)
    {
        return;
    }
    uint2      Assignment = Tiles[WorkIndex];
    CardRecord Card       = Cards[Assignment.x];
    uint2      TileTexel  = ResolveTileTexel(Assignment, Local.xy);
    if (any(TileTexel >= Card.TexelExtent))
    {
        return;
    }
    uint2 Texel = Card.TexelOrigin + TileTexel;
    float Depth = CardDepth.Load(int3(int2(Texel), 0)).x;
    if (Depth > 1.5f)
    {
        CardDirectTarget[Texel] = float4(0.0f);
        return;
    }

    OccupantRecord Occupant    = Occupants[Card.Occupant];
    float3         Coordinates = float3((float2(TileTexel) + 0.5f) / float2(Card.TexelExtent), Depth);
    float3         Position    = MulMat4Point(Occupant.LocalToWorld, ReconstructCardLocal(Card, Coordinates));
    float3         LocalNormal = CardNormal.Load(int3(int2(Texel), 0)).xyz * 2.0f - 1.0f;
    float3         Normal      = normalize(MulMat4Vec(Occupant.LocalToWorld, LocalNormal));

    float  Cosine     = dot(Normal, Frame.SunDirection);
    float3 Irradiance = float3(0.0f);
    if (Cosine > 0.0f)
    {
        float Bias       = ResolveSurfaceBias(Position);
        float Visibility = 1.0f;
        if (FeatureEnabled(Frame, FeatureDirectShadow))
        {
            Visibility = TraverseSceneShadow(Position + Normal * Bias, Frame.SunDirection, 0.5f * Bias, 400.0f, 6.0f);
        }
        Irradiance = Frame.SunIlluminance * Cosine * Visibility;
    }
    FireArrival Fire = ResolveFireArrival(Position, Normal);
    Irradiance += Fire.Illuminance * max(dot(Normal, Fire.Direction), 0.0f);

    int CellIdx = ResolveClusterCellIndex(SceneLights[0].GridMinimum, SceneLights[0].GridScale, Position);
    if (CellIdx != -1)
    {
        uint4 Pair  = SceneLights[0].CellMasks[uint(max(CellIdx, 0)) >> 1u];
        uint2 Mask2 = ResolveClusterMaskFromPair(CellIdx, Pair, SceneLights[0].GridMinimum.w);
        for (uint Word = 0u; Word < 2u; Word += 1u)
        {
            uint Mask = (Word == 1u) ? Mask2.y : Mask2.x;
            uint Base = Word * 32u;
            while (Mask != 0u)
            {
                uint Bit   = firstbitlow(Mask);
                Mask      &= Mask - 1u;
                LightRecord Light = SceneLights[0].Lights[Base + Bit];
                Irradiance += EvaluateLightArrival(Light, Position, Normal);
            }
        }
    }

    CardDirectTarget[Texel] = float4(Irradiance, 1.0f);
}
