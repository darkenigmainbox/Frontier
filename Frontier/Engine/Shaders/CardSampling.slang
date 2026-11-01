//==========================================================================================================================================
//                                                            CARD SAMPLING
//==========================================================================================================================================
// 🧩 Surface-card lookup — the radiance a distance-field hit point carries, read from its occupant's cards (the surface cache).

#pragma once

#include "FrameDescriptor.slang"
#include "DistanceTraversal.slang"
#include "CardProjection.slang"
#include "PackingCodec.slang"

[[vk::binding(0, 2)]] StructuredBuffer<OccupantRecord> Occupants;
[[vk::binding(1, 2)]] StructuredBuffer<CardRecord>     Cards;
[[vk::binding(2, 2)]] Texture2D<float4>                CardDepth;
[[vk::binding(3, 2)]] Texture2D<float4>                CardFinal;
[[vk::binding(4, 2)]] Texture2D<float4>                SkyView;
[[vk::binding(5, 2)]] SamplerState                     SkySampler;
[[vk::binding(6, 2)]] Texture2DArray<float4>           MoonAtlas;

float2 ProjectSkyCoordinates(float3 Direction)
{
    float Azimuth   = atan2(Direction.y, Direction.x);
    float Elevation = asin(clamp(Direction.z, -1.0f, 1.0f));
    float U         = Azimuth * (0.5f / π) + 0.5f;
    float V         = 0.5f - 0.5f * sign(Elevation) * sqrt(abs(Elevation) / (0.5f * π));
    return float2(U, V);
}

//------------------------------------------------------------------------------------------------------------------------
//                                                     GROUND CARDS
//------------------------------------------------------------------------------------------------------------------------

uint ResolveGroundCard(float2 Planar)
{
    float2 PadMinimum = float2(GroundPadMinimumX, GroundPadMinimumY);
    uint2  TileCount  = uint2(GroundTileCountX, GroundTileCountY);
    float2 PadMaximum = PadMinimum + GroundTileExtent * float2(TileCount);
    if (all(Planar >= PadMinimum) && all(Planar < PadMaximum))
    {
        uint2 Tile = min(uint2((Planar - PadMinimum) / GroundTileExtent), TileCount - uint2(1u));
        return GroundFirstCard + Tile.x * TileCount.y + Tile.y;
    }
    if (Planar.x < PadMinimum.x)
    {
        return GroundStripCard;
    }
    if (Planar.x >= PadMaximum.x)
    {
        return GroundStripCard + 1u;
    }
    if (Planar.y < PadMinimum.y)
    {
        return GroundStripCard + 2u;
    }
    return GroundStripCard + 3u;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                     SKY RADIANCE
//------------------------------------------------------------------------------------------------------------------------

float3 SampleSkyRadiance(float3 Direction)
{
    float2 Coordinates = ProjectSkyCoordinates(normalize(Direction));
    return SkyView.SampleLevel(SkySampler, Coordinates, 0.0f).rgb * Frame.SkyScale + Frame.NightSkyRadiance;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    CARD RADIANCE
//------------------------------------------------------------------------------------------------------------------------

struct CardTaps
{
    float4 Validated;
    float4 Occupied;
};

CardTaps SampleCardTaps(CardRecord Card, float3 Coordinates, float Tolerance)
{
    CardTaps Taps;
    Taps.Validated = float4(0.0f);
    Taps.Occupied  = float4(0.0f);
    int2   Lowest   = int2(Card.TexelOrigin);
    int2   Highest  = int2(Card.TexelOrigin + Card.TexelExtent) - int2(1);
    float2 Position = float2(Card.TexelOrigin) + clamp(Coordinates.xy, float2(0.0f), float2(1.0f)) * float2(Card.TexelExtent) - 0.5f;
    float2 Corner   = floor(Position);
    float2 Fraction = Position - Corner;
    for (uint Tap = 0u; Tap < 4u; Tap++)
    {
        uint2  Offset   = uint2(Tap & 1u, Tap >> 1u);
        int2   Texel    = clamp(int2(Corner) + int2(Offset), Lowest, Highest);
        float  Bx       = (Offset.x == 1u) ? Fraction.x : (1.0f - Fraction.x);
        float  By       = (Offset.y == 1u) ? Fraction.y : (1.0f - Fraction.y);
        float  Bilinear = Bx * By;
        float  Depth    = CardDepth.Load(int3(Texel, 0)).x;
        if (Depth > 1.5f)
        {
            continue;
        }
        float3 Radiance = CardFinal.Load(int3(Texel, 0)).rgb;
        float  Weight   = max(Bilinear, 1.0e-3f);
        Taps.Occupied  += float4(Radiance * Weight, Weight);
        if (abs(Depth - Coordinates.z) <= Tolerance)
        {
            Taps.Validated += float4(Radiance * Weight, Weight);
        }
    }
    return Taps;
}

float3 ResolveFallbackRadiance(OccupantRecord Occupant, float3 Position, float3 Normal)
{
    float3 Albedo     = UnpackUnorm4x8(Occupant.FirstCard).rgb;
    float3 Irradiance = float3(0.0f);
    float  Cosine     = dot(Normal, Frame.SunDirection);
    if (Cosine > 0.0f)
    {
        float Bias  = ResolveSurfaceBias(Position);
        Irradiance += Frame.SunIlluminance * Cosine *
                      TraverseSceneShadow(Position + Normal * Bias, Frame.SunDirection, 0.5f * Bias, 60.0f, 6.0f);
    }
    float3 Upward = normalize(Normal + float3(0.0f, 0.0f, 1.0f));
    Irradiance   += π * SampleSkyRadiance(Upward) * (0.5f + 0.5f * Normal.z);
    return Albedo * InversePi * Irradiance;
}

float4 SampleCardRadiance(float3 Position, float3 Normal, uint Identity, float Tolerance)
{
    if (Identity == GroundIdentity)
    {
        CardRecord Card        = Cards[ResolveGroundCard(Position.xy)];
        float3     Coordinates = ProjectCardCoordinates(Card, float3(Position.xy, Distance.GroundHeight));
        CardTaps   Taps        = SampleCardTaps(Card, Coordinates, 2.0f);
        if (Taps.Occupied.w > 0.0f)
        {
            return float4(Taps.Occupied.rgb / Taps.Occupied.w, 1.0f);
        }
        return float4(0.0f);
    }

    uint OccupantCount = 0u;
    uint OccupantStride = 0u;
    Occupants.GetDimensions(OccupantCount, OccupantStride);
    if (Identity >= OccupantCount)
    {
        return float4(0.0f);
    }

    OccupantRecord Occupant = Occupants[Identity];
    if ((Occupant.Roles & RoleFallback) != 0u)
    {
        return float4(ResolveFallbackRadiance(Occupant, Position, Normal), 1.0f);
    }

    float3 Local       = MulMat4Point(Occupant.WorldToLocal, Position);
    float3 LocalNormal = normalize(MulMat4Vec(Occupant.WorldToLocal, Normal));
    float4 Validated   = float4(0.0f);
    float4 Occupied    = float4(0.0f);
    for (uint Index = 0u; Index < Occupant.CardCount; Index++)
    {
        CardRecord Card   = Cards[Occupant.FirstCard + Index];
        float      Facing = dot(LocalNormal, ResolveCardAxis(Card.Axis));
        if (Facing <= 0.0f)
        {
            continue;
        }
        float3 Coordinates = ProjectCardCoordinates(Card, Local);
        if (any(Coordinates.xy < float2(-0.02f)) || any(Coordinates.xy > float2(1.02f)))
        {
            continue;
        }
        CardTaps Taps       = SampleCardTaps(Card, Coordinates, Tolerance / ResolveCardDepthExtent(Card));
        float    AxisWeight = Facing * Facing;
        Validated += float4(Taps.Validated.rgb, Taps.Validated.w) * AxisWeight;
        Occupied  += float4(Taps.Occupied.rgb, Taps.Occupied.w) * AxisWeight;
    }
    if (Validated.w > 1.0e-4f)
    {
        return float4(Validated.rgb / Validated.w, 1.0f);
    }
    if (Occupied.w > 1.0e-4f)
    {
        return float4(Occupied.rgb / Occupied.w, 0.5f);
    }
    return float4(0.0f);
}

float ResolveCardTolerance(uint Level)
{
    uint Clamped = min(Level, Distance.ClipCount - 1u);
    return max(1.5f * Distance.Clips[Clamped].VoxelExtent, 0.06f);
}

float3 ResolveTraversalRadiance(TraversalHit Hit, float3 Direction)
{
    if (!Hit.Hit)
    {
        return SampleSkyRadiance(Direction);
    }
    float4 Card = SampleCardRadiance(Hit.Position, Hit.Normal, Hit.Identity, ResolveCardTolerance(Hit.Level));
    if (Card.w > 0.0f)
    {
        return Card.rgb;
    }
    return float3(0.0f);
}
