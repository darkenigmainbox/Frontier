//==========================================================================================================================================
//                                                            CARD CAPTURE
//==========================================================================================================================================
// 🧩 Orthographic rasterisation of an occupant's facets into its six surface-card tiles.

#include "CardProjection.slang"

[[vk::binding(0, 0)]] StructuredBuffer<CardRecord>     Cards;
[[vk::binding(1, 0)]] StructuredBuffer<OccupantRecord> Occupants;
[[vk::binding(2, 0)]] StructuredBuffer<MaterialRecord> Materials;

struct VertexInput
{
    [[vk::location(0)]] float3 Position  : POSITION;
    [[vk::location(1)]] float3 Normal    : NORMAL;
    [[vk::location(2)]] uint   Material  : BLENDINDICES0;
    uint                       CardIndex : SV_InstanceID;
};

struct VertexOutput
{
    float4 Position : SV_Position;
    float3 Normal   : TEXCOORD0;
    float  Depth    : TEXCOORD1;
    nointerpolation uint CardIndex : TEXCOORD2;
    nointerpolation uint Material  : TEXCOORD3;
};

struct FragmentOutput
{
    float4 Albedo      : SV_Target0;
    float4 Normal      : SV_Target1;
    float4 Emission    : SV_Target2;
    float  LinearDepth : SV_Target3;
};

[shader("vertex")]
VertexOutput CaptureVertex(VertexInput Input)
{
    CardRecord     Card        = Cards[Input.CardIndex];
    OccupantRecord Occupant    = Occupants[Card.Occupant];
    float3         Coordinates = ProjectCardCoordinates(Card, Input.Position);
    uint           Family      = (Occupant.MaterialOverride == NoMaterialOverride) ? Input.Material : Occupant.MaterialOverride;

    VertexOutput Output;
    Output.Position  = float4(Coordinates.x * 2.0f - 1.0f, 1.0f - Coordinates.y * 2.0f, clamp(Coordinates.z, 0.0f, 1.0f), 1.0f);
    Output.Normal    = Input.Normal;
    Output.Depth     = Coordinates.z;
    Output.CardIndex = Input.CardIndex;
    Output.Material  = Family;
    return Output;
}

[shader("fragment")]
FragmentOutput CaptureFragment(VertexOutput Input)
{
    CardRecord     Card     = Cards[Input.CardIndex];
    float3         Normal   = normalize(Input.Normal);
    if (dot(Normal, ResolveCardAxis(Card.Axis)) <= -0.05f)
    {
        discard;
    }
    MaterialRecord Material = Materials[Input.Material];
    float3         Diffuse  = Material.Albedo * (1.0f - Material.Metalness);

    FragmentOutput Output;
    Output.Albedo      = float4(Diffuse, 1.0f);
    Output.Normal      = float4(Normal * 0.5f + 0.5f, 1.0f);
    Output.Emission    = float4(Material.Emission, 1.0f);
    Output.LinearDepth = Input.Depth;
    return Output;
}
