//==========================================================================================================================================
//                                                              CARD FINAL
//==========================================================================================================================================
// 🧩 Final card radiance: diffuse albedo over π times direct plus interpolated radiosity irradiance, plus authored emission.

#include "FrameDescriptor.slang"
#include "CardIrradiance.slang"

[[vk::binding(1, 0)]] StructuredBuffer<CardRecord>    Cards;
[[vk::binding(2, 0)]] StructuredBuffer<uint2>         Tiles;
[[vk::binding(3, 0)]] ConstantBuffer<CardWorkRecord>  Work;
[[vk::binding(4, 0)]] Texture2D<float4>               CardAlbedo;
[[vk::binding(5, 0)]] Texture2D<float4>               CardEmission;
[[vk::binding(6, 0)]] Texture2D<float4>               CardDirect;
[[vk::binding(7, 0)]] Texture2D<float4>               CardDepth;
[[vk::binding(8, 0)]] StructuredBuffer<float4>        Sites;
[[vk::binding(9, 0)]] [format("rgba16f")] RWTexture2D<float4> CardFinalTarget;

float3 InterpolateSiteIrradiance(CardRecord Card, uint2 Texel)
{
    float2 Continuous = (float2(Texel) + 0.5f) / 4.0f - 0.5f;
    int2   Corner     = int2(floor(Continuous)) - int2(1);
    int2   Lowest     = int2(Card.TexelOrigin / 4u);
    int2   Highest    = int2((Card.TexelOrigin + Card.TexelExtent) / 4u) - int2(1);
    float4 Sum        = float4(0.0f);
    for (int Y = 0; Y < 4; Y++)
    {
        for (int X = 0; X < 4; X++)
        {
            int2 Site = Corner + int2(X, Y);
            if (any(Site < Lowest) || any(Site > Highest))
            {
                continue;
            }
            float4 Record = Sites[uint(Site.y) * Work.SiteStride + uint(Site.x)];
            if (Record.w <= 0.0f)
            {
                continue;
            }
            float2 Offset = float2(Site) - Continuous;
            float  Weight = exp(-dot(Offset, Offset) / (2.0f * 0.9f * 0.9f));
            Sum += float4(Record.rgb * Weight, Weight);
        }
    }
    return (Sum.w > 1.0e-4f) ? (Sum.rgb / Sum.w) : float3(0.0f);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void IntegrateCardFinal(uint3 Group : SV_GroupID, uint3 Local : SV_GroupThreadID)
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
    if (CardDepth.Load(int3(int2(Texel), 0)).x > 1.5f)
    {
        CardFinalTarget[Texel] = float4(0.0f);
        return;
    }
    float3 Albedo   = CardAlbedo.Load(int3(int2(Texel), 0)).rgb;
    float3 Emission = CardEmission.Load(int3(int2(Texel), 0)).rgb * Frame.EmissionScale;
    float3 Direct   = CardDirect.Load(int3(int2(Texel), 0)).rgb;
    float3 Indirect = float3(0.0f);
    if (FeatureEnabled(Frame, FeatureCardRadiosity))
    {
        Indirect = InterpolateSiteIrradiance(Card, Texel);
    }
    float3 Radiance        = Albedo * InversePi * (Direct + Indirect) + Emission;
    CardFinalTarget[Texel] = float4(Radiance, 1.0f);
}
