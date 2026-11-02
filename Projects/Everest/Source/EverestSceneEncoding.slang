//==========================================================================================================================================
//                                                    EVEREST SCENE ENCODING SLANG
//                                     ------------------------------------------------------------------
//                 Real-time GPU Vulkan compute encoder for Project Everest combining:
//                   1. VehicleHMI Two-Level BVH Ray-Tracing + ReSTIR GI + Motion-Reprojected Temporal Reuse
//                   2. VehicleHMI SVGF 5x5 Edge-Stopping À-Trous Spatial Wavelet Denoiser (zero checker / zero fireflies)
//                   3. VehicleHMI Emissive Headlights (48.7), Taillights (6.5), Dual Low-Beam Spotlights, & Windshield Glass
//                   4. PlanetaryAtmosphere (arena/5ec53579-frontier) 3D Worley-Perlin Volumetric Clouds (CloudSynthesis),
//                      Sky-View LUT, Limb-Darkened Sun, 3D Lommel-Seeliger Moon + Ringed Planet, Milky Way + Stars,
//                      Exponential Height Fog + Aerial Perspective, and Chromatic Optical Lens Flare.
//==========================================================================================================================================

#include "SceneRecords.slang"
#include "PackingCodec.slang"
#include "DiscrepancySequence.slang"
#include "SurfaceReflectance.slang"

struct EverestBvhNode
{
    float3 Minimum;
    uint   LeftOrFirst;
    float3 Maximum;
    uint   CountOrInstance;
};

struct EverestOccupant
{
    float4 Transform0;
    float4 Transform1;
    float4 Transform2;
    float4 Transform3;
    float4 Inverse0;
    float4 Inverse1;
    float4 Inverse2;
    float4 Inverse3;
    uint4  Meta;
};

[[vk::binding(0, 0)]] StructuredBuffer<EverestBvhNode> BvhNodes;
[[vk::binding(1, 0)]] StructuredBuffer<float4>         BlasTriangles;
[[vk::binding(2, 0)]] StructuredBuffer<EverestOccupant> Occupants;
[[vk::binding(3, 0)]] StructuredBuffer<MaterialRecord> Materials;
[[vk::binding(4, 0)]] StructuredBuffer<float4>         UniformsAndLights;
[[vk::binding(5, 0)]] StructuredBuffer<float4>         SkyLutBuffer;
[[vk::binding(6, 0)]] RWStructuredBuffer<float4>       ReservoirBuffer;
[[vk::binding(7, 0)]] RWStructuredBuffer<float4>       AccumulationBuffer;
[[vk::binding(8, 0)]] [format("rgba8")] RWTexture2D<float4> OutputTexture;

static const uint TlasLeafBit        = 0x80000000u;
static const uint EmptyTlasSentinel  = 0x7FFFFFFFu;
static const uint VehicleGlassFamily = 2u;
static const uint HeadlightFamily    = 9u;
static const uint TaillightFamily    = 10u;

float3 MulPoint(float4 C0, float4 C1, float4 C2, float4 C3, float3 P)
{
    return C0.xyz * P.x + C1.xyz * P.y + C2.xyz * P.z + C3.xyz;
}

float3 MulDirection(float4 C0, float4 C1, float4 C2, float3 D)
{
    return C0.xyz * D.x + C1.xyz * D.y + C2.xyz * D.z;
}

float3 MulTransposeDirection(float4 C0, float4 C1, float4 C2, float3 N)
{
    return float3(dot(C0.xyz, N), dot(C1.xyz, N), dot(C2.xyz, N));
}

float3 SafeInvDir(float3 D)
{
    float3 S = select(D >= float3(0.0f), float3(1.0f), float3(-1.0f));
    return 1.0f / select(abs(D) < float3(1.0e-8f), S * 1.0e-8f, D);
}

float2 SlabTest(float3 Origin, float3 InvDir, float3 BoxMin, float3 BoxMax, float MaxT)
{
    float3 T0   = (BoxMin - Origin) * InvDir;
    float3 T1   = (BoxMax - Origin) * InvDir;
    float3 Near = min(T0, T1);
    float3 Far  = max(T0, T1);
    float  TMin = max(max(Near.x, Near.y), max(Near.z, 0.0f));
    float  TMax = min(min(Far.x, Far.y), min(Far.z, MaxT));
    return float2(TMin, TMax);
}

struct EverestRayHit
{
    float3 Position;
    float  Travel;
    float3 Normal;
    uint   OccupantId;
    uint   MaterialId;
    bool   Hit;
    float3 GlassTint;
    float3 GlassReflectionOrigin;
    float3 GlassReflectionDir;
    float  GlassFresnel;
};

EverestRayHit TracePrimaryRay(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    EverestRayHit Best;
    Best.Position              = Origin + Direction * MaxT;
    Best.Travel                = MaxT;
    Best.Normal                = -Direction;
    Best.OccupantId            = 0xFFFFFFFFu;
    Best.MaterialId            = 0u;
    Best.Hit                   = false;
    Best.GlassTint             = float3(1.0f);
    Best.GlassReflectionOrigin = Origin;
    Best.GlassReflectionDir    = Direction;
    Best.GlassFresnel          = 0.0f;

    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return Best;
    }

    float3 WorldInvDir = SafeInvDir(Direction);
    uint   Stack[32];
    uint   StackPtr = 0u;
    Stack[0]        = 0u;
    StackPtr        = 1u;

    bool   InBlas          = false;
    uint   CurrentOccupant = 0u;
    uint   CurrentOverride = 0xFFFFFFFFu;
    float3 ActiveOrigin    = Origin;
    float3 ActiveDir       = Direction;
    float3 ActiveInvDir    = WorldInvDir;
    float4 Inv0 = float4(0.0f), Inv1 = float4(0.0f), Inv2 = float4(0.0f);

    while (StackPtr > 0u)
    {
        StackPtr -= 1u;
        uint NodeIndex = Stack[StackPtr];
        if (NodeIndex == 0xFFFFFFFFu)
        {
            InBlas       = false;
            ActiveOrigin = Origin;
            ActiveDir    = Direction;
            ActiveInvDir = WorldInvDir;
            continue;
        }

        EverestBvhNode Node = BvhNodes[NodeIndex];
        float2         Span = SlabTest(ActiveOrigin, ActiveInvDir, Node.Minimum, Node.Maximum, Best.Travel);
        if (Span.x > Span.y)
        {
            continue;
        }

        uint CountField = Node.CountOrInstance;
        if (!InBlas)
        {
            if ((CountField & TlasLeafBit) != 0u)
            {
                CurrentOccupant     = CountField & (~TlasLeafBit);
                EverestOccupant Occ = Occupants[CurrentOccupant];
                CurrentOverride     = Occ.Meta.y;
                Inv0                = Occ.Inverse0;
                Inv1                = Occ.Inverse1;
                Inv2                = Occ.Inverse2;
                ActiveOrigin        = MulPoint(Occ.Inverse0, Occ.Inverse1, Occ.Inverse2, Occ.Inverse3, Origin);
                ActiveDir           = MulDirection(Occ.Inverse0, Occ.Inverse1, Occ.Inverse2, Direction);
                ActiveInvDir        = SafeInvDir(ActiveDir);
                InBlas              = true;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = 0xFFFFFFFFu;
                    StackPtr += 1u;
                    Stack[StackPtr] = Node.LeftOrFirst;
                    StackPtr += 1u;
                }
            }
            else
            {
                uint Left  = Node.LeftOrFirst;
                uint Right = Left + 1u;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = Right;
                    StackPtr += 1u;
                    Stack[StackPtr] = Left;
                    StackPtr += 1u;
                }
            }
        }
        else
        {
            if (CountField > 0u)
            {
                uint FirstTri = Node.LeftOrFirst;
                for (uint I = 0u; I < CountField; ++I)
                {
                    uint   Base = (FirstTri + I) * 4u;
                    float4 T0   = BlasTriangles[Base + 0u];
                    float4 T1   = BlasTriangles[Base + 1u];
                    float4 T2   = BlasTriangles[Base + 2u];
                    float4 T3   = BlasTriangles[Base + 3u];

                    uint TriFamily = asuint(T0.w);
                    uint Family    = (CurrentOverride != 0xFFFFFFFFu) ? CurrentOverride : TriFamily;

                    float3 Edge1 = T1.xyz;
                    float3 Edge2 = T2.xyz;
                    float3 PVec  = cross(ActiveDir, Edge2);
                    float  Det   = dot(Edge1, PVec);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 TVec   = ActiveOrigin - T0.xyz;
                    float  U      = dot(TVec, PVec) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 QVec = cross(TVec, Edge1);
                    float  V    = dot(ActiveDir, QVec) * InvDet;
                    if (V < 0.0f || (U + V) > 1.0f)
                    {
                        continue;
                    }
                    float T = dot(Edge2, QVec) * InvDet;
                    if (T <= MinT || T >= Best.Travel)
                    {
                        continue;
                    }

                    float  W      = 1.0f - U - V;
                    float3 N0     = UnpackOctahedral(asuint(T1.w));
                    float3 N1     = UnpackOctahedral(asuint(T2.w));
                    float3 N2     = UnpackOctahedral(asuint(T3.w));
                    float3 LocalN = normalize(N0 * W + N1 * U + N2 * V);
                    float3 WorldN = normalize(MulTransposeDirection(Inv0, Inv1, Inv2, LocalN));
                    if (dot(WorldN, Direction) > 0.0f)
                    {
                        WorldN = -WorldN;
                    }

                    // Dielectric VehicleGlass (Family == 2u): record specular reflection + tint and continue into cabin interior
                    if (Family == VehicleGlassFamily)
                    {
                        if (Best.GlassFresnel <= 0.0f)
                        {
                            float CosTheta             = saturate(dot(-Direction, WorldN));
                            Best.GlassFresnel          = clamp(0.08f + 0.76f * pow(1.0f - CosTheta, 4.0f), 0.08f, 0.84f);
                            Best.GlassReflectionOrigin = Origin + Direction * T + WorldN * 0.004f;
                            Best.GlassReflectionDir    = reflect(Direction, WorldN);
                            Best.GlassTint             = float3(0.45f, 0.50f, 0.56f);
                        }
                        continue;
                    }

                    Best.Travel     = T;
                    Best.Position   = Origin + Direction * T;
                    Best.Normal     = WorldN;
                    Best.OccupantId = CurrentOccupant;
                    Best.MaterialId = min(Family, 80u);
                    Best.Hit        = true;
                }
            }
            else
            {
                uint Left  = Node.LeftOrFirst;
                uint Right = Left + 1u;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = Right;
                    StackPtr += 1u;
                    Stack[StackPtr] = Left;
                    StackPtr += 1u;
                }
            }
        }
    }
    return Best;
}

bool TraceShadowRay(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return true;
    }

    float3 WorldInvDir = SafeInvDir(Direction);
    uint   Stack[32];
    uint   StackPtr = 0u;
    Stack[0]        = 0u;
    StackPtr        = 1u;

    bool   InBlas          = false;
    uint   CurrentOverride = 0xFFFFFFFFu;
    float3 ActiveOrigin    = Origin;
    float3 ActiveDir       = Direction;
    float3 ActiveInvDir    = WorldInvDir;

    while (StackPtr > 0u)
    {
        StackPtr -= 1u;
        uint NodeIndex = Stack[StackPtr];
        if (NodeIndex == 0xFFFFFFFFu)
        {
            InBlas       = false;
            ActiveOrigin = Origin;
            ActiveDir    = Direction;
            ActiveInvDir = WorldInvDir;
            continue;
        }

        EverestBvhNode Node = BvhNodes[NodeIndex];
        float2         Span = SlabTest(ActiveOrigin, ActiveInvDir, Node.Minimum, Node.Maximum, MaxT);
        if (Span.x > Span.y)
        {
            continue;
        }

        uint CountField = Node.CountOrInstance;
        if (!InBlas)
        {
            if ((CountField & TlasLeafBit) != 0u)
            {
                uint            OccIdx = CountField & (~TlasLeafBit);
                EverestOccupant Occ    = Occupants[OccIdx];
                CurrentOverride        = Occ.Meta.y;
                ActiveOrigin           = MulPoint(Occ.Inverse0, Occ.Inverse1, Occ.Inverse2, Occ.Inverse3, Origin);
                ActiveDir              = MulDirection(Occ.Inverse0, Occ.Inverse1, Occ.Inverse2, Direction);
                ActiveInvDir           = SafeInvDir(ActiveDir);
                InBlas                 = true;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = 0xFFFFFFFFu;
                    StackPtr += 1u;
                    Stack[StackPtr] = Node.LeftOrFirst;
                    StackPtr += 1u;
                }
            }
            else
            {
                uint Left  = Node.LeftOrFirst;
                uint Right = Left + 1u;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = Right;
                    StackPtr += 1u;
                    Stack[StackPtr] = Left;
                    StackPtr += 1u;
                }
            }
        }
        else
        {
            if (CountField > 0u)
            {
                uint FirstTri = Node.LeftOrFirst;
                for (uint I = 0u; I < CountField; ++I)
                {
                    uint   Base      = (FirstTri + I) * 4u;
                    float4 T0        = BlasTriangles[Base + 0u];
                    uint   TriFamily = asuint(T0.w);
                    uint   Family    = (CurrentOverride != 0xFFFFFFFFu) ? CurrentOverride : TriFamily;
                    if (Family == VehicleGlassFamily)
                    {
                        continue;
                    }
                    float3 Edge1 = BlasTriangles[Base + 1u].xyz;
                    float3 Edge2 = BlasTriangles[Base + 2u].xyz;
                    float3 PVec  = cross(ActiveDir, Edge2);
                    float  Det   = dot(Edge1, PVec);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 TVec   = ActiveOrigin - T0.xyz;
                    float  U      = dot(TVec, PVec) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 QVec = cross(TVec, Edge1);
                    float  V    = dot(ActiveDir, QVec) * InvDet;
                    if (V < 0.0f || (U + V) > 1.0f)
                    {
                        continue;
                    }
                    float T = dot(Edge2, QVec) * InvDet;
                    if (T > MinT && T < MaxT)
                    {
                        return false;
                    }
                }
            }
            else
            {
                uint Left  = Node.LeftOrFirst;
                uint Right = Left + 1u;
                if (StackPtr + 2u <= 32u)
                {
                    Stack[StackPtr] = Right;
                    StackPtr += 1u;
                    Stack[StackPtr] = Left;
                    StackPtr += 1u;
                }
            }
        }
    }
    return true;
}

//------------------------------------------------------------------------------------------------------------------------
//      MATERIAL WORKSPACE AUTOMOTIVE PAINT WITH FLAKES (Engine/Render/Shader/AutomotivePaint.slang)
//        Exact 3-layer rotated cellular Voronoi flake evaluator + 5-stop palette per showcase car
//------------------------------------------------------------------------------------------------------------------------

static const uint BodyCoatFamily       = 6u;
static const uint BodyCoatGreenFamily  = 73u;
static const uint BodyCoatYellowFamily = 74u;
static const uint BodyCoatBlueFamily   = 75u;
static const uint BodyCoatOrangeFamily = 76u;

struct AutomotivePaint
{
    uint4  Configuration;
    float4 Distribution;
    float4 Finish;
    float4 Relief;
    float4 Palette[5];
    float4 AverageTint;
};

struct PaintSurface
{
    float3 Albedo;
    float  Roughness;
    float  Metallic;
    float  Coverage;
    float  Random;
    float  Resolved;
    float  PeelHeight;
};

float HashPaintCell(float3 Position)
{
    Position  = frac(Position * 0.1031f);
    Position += dot(Position, Position.yzx + 33.33f);
    return frac((Position.x + Position.y) * Position.z);
}

float EvaluatePaintNoise(float3 Position)
{
    float3 Cell  = floor(Position);
    float3 Blend = frac(Position);
    Blend        = Blend * Blend * (3.0f - 2.0f * Blend);
    return lerp(
        lerp(lerp(HashPaintCell(Cell), HashPaintCell(Cell + float3(1.0f, 0.0f, 0.0f)), Blend.x),
             lerp(HashPaintCell(Cell + float3(0.0f, 1.0f, 0.0f)), HashPaintCell(Cell + float3(1.0f, 1.0f, 0.0f)), Blend.x), Blend.y),
        lerp(lerp(HashPaintCell(Cell + float3(0.0f, 0.0f, 1.0f)), HashPaintCell(Cell + float3(1.0f, 0.0f, 1.0f)), Blend.x),
             lerp(HashPaintCell(Cell + float3(0.0f, 1.0f, 1.0f)), HashPaintCell(Cell + float3(1.0f, 1.0f, 1.0f)), Blend.x), Blend.y),
        Blend.z);
}

float4 EvaluatePaintCell(float3 Position, float Seed)
{
    float3 Cell    = floor(Position);
    float3 Local   = frac(Position);
    float3 Nearest = float3(0.0f);
    float  First   = 1.0e8f;
    float  Second  = 1.0e8f;
    for (int Z = -1; Z <= 1; ++Z)
    {
        for (int Y = -1; Y <= 1; ++Y)
        {
            for (int X = -1; X <= 1; ++X)
            {
                float3 Offset   = float3(float(X), float(Y), float(Z));
                float3 Id       = Cell + Offset;
                float3 Site     = 0.08f + 0.84f * float3(
                    HashPaintCell(Id + Seed),
                    HashPaintCell(Id + Seed + 17.31f),
                    HashPaintCell(Id + Seed + 43.97f));
                float3 Delta    = Offset + Site - Local;
                float  Distance = dot(Delta, Delta);
                if (Distance < First)
                {
                    Second  = First;
                    First   = Distance;
                    Nearest = Id;
                }
                else if (Distance < Second)
                {
                    Second = Distance;
                }
            }
        }
    }
    return float4(
        max(0.0f, sqrt(Second) - sqrt(First)),
        HashPaintCell(Nearest + Seed + 61.7f),
        HashPaintCell(Nearest + Seed + 127.3f),
        HashPaintCell(Nearest + Seed + 223.1f));
}

float3 SelectPaintTint(AutomotivePaint Paint, float Position)
{
    uint Idx = min(4u, uint(clamp(Position, 0.0f, 0.999f) * 5.0f));
    return Paint.Palette[Idx].rgb;
}

PaintSurface EvaluatePaintSurface(AutomotivePaint Paint,
                                  float3          Position,
                                  float3          Albedo,
                                  float           Roughness,
                                  float           Metallic,
                                  float           PixelFootprint)
{
    PaintSurface Surface;
    float3 Base      = Albedo * exp(-Paint.Distribution.w * 0.28f);
    float3 Blended   = Base;
    float  Mask      = 0.0f;
    float  Random    = 0.0f;
    float  Frequency = min(1.0e7f, (52000.0f / max(0.001f, Paint.Distribution.y)) * Paint.Distribution.z);
    float3 Domain    = Position * Frequency;
    float  Footprint = PixelFootprint * Frequency * 0.28f;
    float  Detail    = 1.0f - smoothstep(0.65f, 3.40f, Footprint);

    float3 Warp = float3(
        EvaluatePaintNoise(Domain * 0.31f),
        EvaluatePaintNoise(Domain * 0.31f + 11.7f),
        EvaluatePaintNoise(Domain * 0.31f + 37.4f)) - 0.5f;

    for (uint Layer = 0u; Layer < Paint.Configuration.y; ++Layer)
    {
        float  Level = float(Layer);
        float  Depth = float(Paint.Configuration.y - 1u - Layer) / max(float(Paint.Configuration.y - 1u), 1.0f);
        float3 Point = Domain * (0.71f + Level * 0.37f) + Warp * 0.7f + float3(Level * 27.17f, Level * 51.73f, Level * 19.43f);
        Point        = mul(float3x3(0.80f, -0.60f, 0.0f, 0.36f, 0.48f, 0.80f, -0.48f, -0.64f, 0.60f), Point);
        float4 Cell  = EvaluatePaintCell(Point, Level * 97.3f + 4.1f);

        float  Antialias = clamp(Footprint * 0.45f, 0.009f, 0.12f);
        float  Inset     = 0.018f + Cell.w * 0.07f;
        float  Opacity   = smoothstep(Inset - Antialias, Inset + Antialias, Cell.x) * step(1.0f - Paint.Distribution.x * 0.55f, Cell.y);
        float3 Tint      = lerp(SelectPaintTint(Paint, Cell.z), Base, Depth * Paint.Relief.y * 0.62f);
        Blended          = lerp(Blended, Tint, Opacity);
        Random           = lerp(Random, Cell.w, Opacity);
        Mask             = Opacity + Mask * (1.0f - Opacity);
    }

    float MeanMask     = 1.0f - pow(1.0f - Paint.Distribution.x * 0.31f, float(Paint.Configuration.y));
    Surface.Albedo     = lerp(lerp(Base, lerp(Paint.AverageTint.rgb, Base, Paint.Relief.y * 0.26f), MeanMask), Blended, Detail);
    Surface.Coverage   = lerp(MeanMask, Mask, Detail);
    Surface.Random     = lerp(0.5f, Random, Detail);
    Surface.Resolved   = Detail;
    Surface.Roughness  = clamp(lerp(Roughness, lerp(Paint.Finish.x, Paint.Finish.y, Surface.Random), Surface.Coverage), 0.045f, 1.0f);
    Surface.Metallic   = lerp(Metallic, lerp(Paint.Finish.z, Paint.Finish.w, Surface.Random), Surface.Coverage);
    Surface.PeelHeight = (EvaluatePaintNoise(Position * Paint.Relief.w) + 0.35f * EvaluatePaintNoise(Position * Paint.Relief.w * 2.1f))
                       * Paint.Relief.z * 0.003f;
    return Surface;
}

bool IsAutomotivePaintMaterial(uint MaterialId)
{
    return (MaterialId == BodyCoatFamily)
        || (MaterialId == BodyCoatGreenFamily)
        || (MaterialId == BodyCoatYellowFamily)
        || (MaterialId == BodyCoatBlueFamily)
        || (MaterialId == BodyCoatOrangeFamily);
}

AutomotivePaint BuildMaterialWorkspacePaint(uint MaterialId, out float3 OutBaseAlbedo, out float OutCoatRoughness)
{
    AutomotivePaint Paint = (AutomotivePaint)0;
    Paint.Configuration   = uint4(1u, 3u, 0u, 5u);
    Paint.Distribution    = float4(0.68f, 950.0f, 1.0f, 0.55f);
    Paint.Finish          = float4(0.10f, 0.24f, 0.42f, 0.68f);
    Paint.Relief          = float4(0.22f, 0.45f, 0.18f, 24.0f);
    OutCoatRoughness      = 0.04f;

    if (MaterialId == BodyCoatGreenFamily)
    {
        // Material Workspace Racing Green Metallic Flake (racing-green.material parameterized with emerald/gold/viridian flakes)
        OutBaseAlbedo    = float3(0.045f, 0.420f, 0.165f);
        OutCoatRoughness = 0.04f;
        Paint.Palette[0] = float4(0.56471f, 0.70838f, 0.25016f, 0.00f);
        Paint.Palette[1] = float4(0.09990f, 0.68492f, 0.36625f, 0.25f);
        Paint.Palette[2] = float4(0.18000f, 0.82000f, 0.42000f, 0.50f);
        Paint.Palette[3] = float4(0.32000f, 0.76000f, 0.22000f, 0.75f);
        Paint.Palette[4] = float4(0.12000f, 0.58000f, 0.48000f, 1.00f);
        Paint.AverageTint = float4(0.2200f, 0.7200f, 0.3400f, 0.0f);
    }
    else if (MaterialId == BodyCoatFamily)
    {
        // Material Workspace Candy Crimson Metallic Flake (candy-crimson.material parameterized with ruby/scarlet/gold-crimson flakes)
        OutBaseAlbedo    = float3(0.680f, 0.035f, 0.055f);
        OutCoatRoughness = 0.035f;
        Paint.Palette[0] = float4(0.9600f, 0.1400f, 0.1200f, 0.00f);
        Paint.Palette[1] = float4(0.9200f, 0.3800f, 0.1400f, 0.25f);
        Paint.Palette[2] = float4(0.8400f, 0.0800f, 0.1800f, 0.50f);
        Paint.Palette[3] = float4(0.9800f, 0.2400f, 0.1600f, 0.75f);
        Paint.Palette[4] = float4(0.7600f, 0.0600f, 0.1200f, 1.00f);
        Paint.AverageTint = float4(0.8920f, 0.1800f, 0.1440f, 0.0f);
    }
    else if (MaterialId == BodyCoatYellowFamily)
    {
        // Material Workspace Solar Gold Yellow Metallic Flake
        OutBaseAlbedo    = float3(0.780f, 0.560f, 0.030f);
        OutCoatRoughness = 0.04f;
        Paint.Palette[0] = float4(0.9800f, 0.8400f, 0.1800f, 0.00f);
        Paint.Palette[1] = float4(0.9600f, 0.6200f, 0.0800f, 0.25f);
        Paint.Palette[2] = float4(0.8800f, 0.8800f, 0.2200f, 0.50f);
        Paint.Palette[3] = float4(1.0000f, 0.9000f, 0.3600f, 0.75f);
        Paint.Palette[4] = float4(0.9200f, 0.7000f, 0.1000f, 1.00f);
        Paint.AverageTint = float4(0.9480f, 0.7880f, 0.1880f, 0.0f);
    }
    else if (MaterialId == BodyCoatBlueFamily)
    {
        // Material Workspace Cobalt Sapphire Metallic Flake
        OutBaseAlbedo    = float3(0.035f, 0.185f, 0.680f);
        OutCoatRoughness = 0.04f;
        Paint.Palette[0] = float4(0.1600f, 0.6400f, 0.9800f, 0.00f);
        Paint.Palette[1] = float4(0.2800f, 0.3600f, 0.9600f, 0.25f);
        Paint.Palette[2] = float4(0.1000f, 0.7600f, 0.8800f, 0.50f);
        Paint.Palette[3] = float4(0.3800f, 0.6800f, 1.0000f, 0.75f);
        Paint.Palette[4] = float4(0.1400f, 0.4400f, 0.9500f, 1.00f);
        Paint.AverageTint = float4(0.2120f, 0.5760f, 0.9540f, 0.0f);
    }
    else
    {
        // Material Workspace Tangerine Copper Metallic Flake
        OutBaseAlbedo    = float3(0.820f, 0.220f, 0.025f);
        OutCoatRoughness = 0.04f;
        Paint.Palette[0] = float4(0.9800f, 0.4600f, 0.0800f, 0.00f);
        Paint.Palette[1] = float4(0.9800f, 0.6800f, 0.1600f, 0.25f);
        Paint.Palette[2] = float4(0.9200f, 0.2800f, 0.0800f, 0.50f);
        Paint.Palette[3] = float4(1.0000f, 0.5600f, 0.1400f, 0.75f);
        Paint.Palette[4] = float4(0.8800f, 0.3400f, 0.1000f, 1.00f);
        Paint.AverageTint = float4(0.9520f, 0.4640f, 0.1120f, 0.0f);
    }
    return Paint;
}

void ApplyMaterialWorkspaceAutomotivePaint(uint               MaterialId,
                                           float3             WorldPos,
                                           float3             EyePos,
                                           float              TanHalfFov,
                                           float              ScreenHeight,
                                           float3             ViewDir,
                                           inout SurfaceSample Surf,
                                           out float3         OutFlakeNormal)
{
    OutFlakeNormal = float3(0.0f, 0.0f, 1.0f);
    if (!IsAutomotivePaintMaterial(MaterialId))
    {
        return;
    }
    float3          BaseAlbedo    = Surf.Albedo;
    float           CoatRoughness = 0.04f;
    AutomotivePaint Paint         = BuildMaterialWorkspacePaint(MaterialId, BaseAlbedo, CoatRoughness);
    float           Dist          = length(WorldPos - EyePos);
    float           Footprint     = 0.75f * Dist * TanHalfFov / max(ScreenHeight, 64.0f);
    PaintSurface    Flakes        = EvaluatePaintSurface(Paint, WorldPos, BaseAlbedo, 0.18f, 0.36f, Footprint);

    Surf.Albedo           = lerp(BaseAlbedo, Flakes.Albedo, 0.72f);
    Surf.Roughness        = Flakes.Roughness;
    Surf.Metalness        = clamp(Flakes.Metallic, 0.32f, 0.56f);
    Surf.CoatWeight       = 0.94f;
    Surf.CoatRoughness    = CoatRoughness;
    Surf.FlakeTint        = Flakes.Albedo;
    Surf.FlakeCoverage    = 0.0f;
    Surf.CoatingThickness = 0.0f;

    float Angle    = Flakes.Random * 6.2831853f;
    OutFlakeNormal = float3(cos(Angle), sin(Angle), Paint.Relief.x * Flakes.Coverage * Flakes.Resolved);
}

float3 PerturbNormalByFlake(float3 GeometricNormal, float3 FlakeTiltData)
{
    if (FlakeTiltData.z <= 1.0e-5f)
    {
        return GeometricNormal;
    }
    float3 T = normalize(cross(abs(GeometricNormal.z) < 0.95f ? float3(0.0f, 0.0f, 1.0f) : float3(0.0f, 1.0f, 0.0f), GeometricNormal));
    float3 B = cross(GeometricNormal, T);
    return normalize(GeometricNormal + (T * FlakeTiltData.x + B * FlakeTiltData.y) * FlakeTiltData.z);
}

//------------------------------------------------------------------------------------------------------------------------
//                      PLANETARY ATMOSPHERE, 3D VOLUMETRIC CLOUDS, SOLAR OPTICS & SELENOGRAPHIC MOON
//                Exact port from streamlinkinbox/Frontier (arena/5ec53579-frontier, commit 56059b39)
//            (LightInfluence.slang, SolarOptics.slang, CloudField.h, LunarDiscProjection.h, CelestialModel.h)
//------------------------------------------------------------------------------------------------------------------------

uint HashU32(uint X)
{
    X ^= X >> 16u;
    X *= 0x7FEB352Du;
    X ^= X >> 15u;
    X *= 0x846CA68Bu;
    X ^= X >> 16u;
    return X;
}

float HashFloat3(int3 Cell, uint Seed)
{
    uint H = HashU32(uint(Cell.x) * 73856093u ^ uint(Cell.y) * 19349663u ^ uint(Cell.z) * 83492791u ^ (Seed * 2654435761u));
    return float(H & 0x00FFFFFFu) * (1.0f / 16777216.0f);
}

float ValueNoise3D(float3 P, uint Seed)
{
    int3   I = int3(floor(P));
    float3 F = frac(P);
    float3 U = F * F * (3.0f - 2.0f * F);

    float N000 = HashFloat3(I + int3(0, 0, 0), Seed);
    float N100 = HashFloat3(I + int3(1, 0, 0), Seed);
    float N010 = HashFloat3(I + int3(0, 1, 0), Seed);
    float N110 = HashFloat3(I + int3(1, 1, 0), Seed);
    float N001 = HashFloat3(I + int3(0, 0, 1), Seed);
    float N101 = HashFloat3(I + int3(1, 0, 1), Seed);
    float N011 = HashFloat3(I + int3(0, 1, 1), Seed);
    float N111 = HashFloat3(I + int3(1, 1, 1), Seed);

    return lerp(
        lerp(lerp(N000, N100, U.x), lerp(N010, N110, U.x), U.y),
        lerp(lerp(N001, N101, U.x), lerp(N011, N111, U.x), U.y),
        U.z);
}

float3 RotateOctave3D(float3 P)
{
    return float3(
         0.80f * P.x + 0.48f * P.y - 0.36f * P.z,
        -0.48f * P.x + 0.80f * P.y + 0.36f * P.z,
         0.36f * P.x + 0.36f * P.y + 0.86f * P.z);
}

float FbmRotated3D(float3 P, int Octaves, uint Seed)
{
    float  Sum  = 0.0f;
    float  Amp  = 0.5f;
    float  Norm = 0.0f;
    float3 Q    = P;
    for (int I = 0; I < Octaves; ++I)
    {
        Sum  += Amp * ValueNoise3D(Q, Seed + uint(I) * 97u);
        Norm += Amp;
        Q     = RotateOctave3D(Q) * 2.03f + float3(13.7f, 29.3f, 7.1f);
        Amp  *= 0.5f;
    }
    return (Norm > 0.0f) ? (Sum / Norm) : 0.0f;
}

// --- Exact 64-bit Emulated Cloud Lattice & CloudField from 56059b39:LightInfluence.slang ---

uint2 CloudAdd64(uint2 A, uint2 B)
{
    uint Low = A.x + B.x;
    return uint2(Low, A.y + B.y + (Low < A.x ? 1u : 0u));
}

uint2 CloudProduct32(uint A, uint B)
{
    uint Al = A & 0xFFFFu, Ah = A >> 16u;
    uint Bl = B & 0xFFFFu, Bh = B >> 16u;
    uint P0 = Al * Bl;
    uint P1 = Al * Bh;
    uint P2 = Ah * Bl;
    uint P3 = Ah * Bh;
    uint Middle = (P0 >> 16u) + (P1 & 0xFFFFu) + (P2 & 0xFFFFu);
    return uint2((P0 & 0xFFFFu) | (Middle << 16u), P3 + (P1 >> 16u) + (P2 >> 16u) + (Middle >> 16u));
}

uint2 CloudMultiply64(uint2 A, uint2 B)
{
    uint2 Base = CloudProduct32(A.x, B.x);
    Base.y += A.x * B.y + A.y * B.x;
    return Base;
}

float CloudLattice(int X, int Y, int Z, uint2 Seed)
{
    uint2 H = Seed;
    H = CloudAdd64(H, CloudMultiply64(uint2(uint(X), X < 0 ? 0xFFFFFFFFu : 0u), uint2(0x1B873593u, 0x9E3779B1u)));
    H = CloudAdd64(H, CloudMultiply64(uint2(uint(Y), Y < 0 ? 0xFFFFFFFFu : 0u), uint2(0x94D049BBu, 0x85EBCA77u)));
    H = CloudAdd64(H, CloudMultiply64(uint2(uint(Z), Z < 0 ? 0xFFFFFFFFu : 0u), uint2(0x6C50B47Cu, 0xC2B2AE3Du)));
    H ^= H >> 30u;
    H = CloudMultiply64(H, uint2(0x1CE4E5B9u, 0xBF58476Du));
    H ^= uint2((H.x >> 27u) | (H.y << 5u), H.y >> 27u);
    H = CloudMultiply64(H, uint2(0x133111EBu, 0x94D049BBu));
    H ^= uint2((H.x >> 31u) | (H.y << 1u), H.y >> 31u);
    uint2 Top = uint2((H.x >> 11u) | (H.y << 21u), H.y >> 11u);
    return (float(Top.y) * 4294967296.0f + float(Top.x)) * (1.0f / 9007199254740992.0f);
}

float CloudSmooth(float T)
{
    return T * T * (3.0f - 2.0f * T);
}

float CloudNoise(float3 P, uint2 Seed)
{
    int   X0 = int(floor(P.x)), Y0 = int(floor(P.y)), Z0 = int(floor(P.z));
    float Fx = CloudSmooth(P.x - floor(P.x));
    float Fy = CloudSmooth(P.y - floor(P.y));
    float Fz = CloudSmooth(P.z - floor(P.z));
    float C000 = CloudLattice(X0,     Y0,     Z0,     Seed);
    float C100 = CloudLattice(X0 + 1, Y0,     Z0,     Seed);
    float C010 = CloudLattice(X0,     Y0 + 1, Z0,     Seed);
    float C110 = CloudLattice(X0 + 1, Y0 + 1, Z0,     Seed);
    float C001 = CloudLattice(X0,     Y0,     Z0 + 1, Seed);
    float C101 = CloudLattice(X0 + 1, Y0,     Z0 + 1, Seed);
    float C011 = CloudLattice(X0,     Y0 + 1, Z0 + 1, Seed);
    float C111 = CloudLattice(X0 + 1, Y0 + 1, Z0 + 1, Seed);
    float C00 = lerp(C000, C100, Fx);
    float C10 = lerp(C010, C110, Fx);
    float C01 = lerp(C001, C101, Fx);
    float C11 = lerp(C011, C111, Fx);
    float C0  = lerp(C00,  C10,  Fy);
    float C1  = lerp(C01,  C11,  Fy);
    return lerp(C0, C1, Fz);
}

float HenyeyGreensteinPhase(float CosTheta, float G)
{
    float G2    = G * G;
    float Denom = max(1.0f + G2 - 2.0f * G * CosTheta, 1.0e-4f);
    return (1.0f - G2) / (4.0f * π * Denom * sqrt(Denom));
}

float EvaluateCloudDensity5605(float3 P, float BaseM, float TopM, float Coverage, float2 WindMps, float TimeSec)
{
    if (P.z <= BaseM || P.z >= TopM || Coverage <= 0.0f)
    {
        return 0.0f;
    }
    float H       = (P.z - BaseM) / max(TopM - BaseM, 1.0f);
    float Profile = saturate(min(H * 4.0f, 1.0f) * (1.0f - max(H - 0.65f, 0.0f) / 0.35f * 0.85f));
    if (Profile <= 1.0e-4f)
    {
        return 0.0f;
    }

    float3 Q = float3(
        (P.x + WindMps.x * TimeSec) / 1400.0f,
        (P.y + WindMps.y * TimeSec) / 1400.0f,
        P.z / 700.0f);
    float Sum       = 0.0f;
    float Amplitude = 0.5f;
    float Total     = 0.0f;
    uint2 Seed      = uint2(0x000C10D5u, 0u);
    for (uint I = 0u; I < 4u; ++I)
    {
        Sum       += Amplitude * CloudNoise(Q, CloudAdd64(Seed, uint2(I * 131u, 0u)));
        Total     += Amplitude;
        Q          = Q * 2.03f + float3(11.3f, 7.7f, 5.1f);
        Amplitude *= 0.5f;
    }
    float Base      = Sum / max(Total, 1.0e-5f);
    float Cov       = saturate(Coverage);
    float Threshold = 1.0f - Cov;
    float Shaped    = clamp((Base - Threshold) / max(Cov, 0.001f), 0.0f, 1.5f);
    return Shaped * Profile;
}

float SampleCloudGroundShadow(float3 WorldPos, float3 SunDir, uint Flags)
{
    if ((Flags & (1u << 3u)) == 0u || (Flags & (1u << 15u)) == 0u || SunDir.z <= 0.05f)
    {
        return 1.0f;
    }
    float4 CloudU = UniformsAndLights[8];
    if (CloudU.x <= 0.01f)
    {
        return 1.0f;
    }
    float  WindSpd = UniformsAndLights[10].z;
    float  TimeSec = UniformsAndLights[15].x * 0.016f;
    float2 Wind    = float2(WindSpd * 0.7071f, WindSpd * 0.7071f);
    float  T       = (CloudU.y + 0.35f * (CloudU.z - CloudU.y) - WorldPos.z) / max(SunDir.z, 0.05f);
    float3 CloudPt = WorldPos + SunDir * T;
    float  Density = EvaluateCloudDensity5605(CloudPt, CloudU.y, CloudU.z, CloudU.x, Wind, TimeSec);
    return exp(-Density * CloudU.w * 110.0f);
}

// --- Exact Solar Disc & Polygonal Chromatic Lens Flare from 56059b39:SolarOptics.slang ---

float SolarErf(float X)
{
    float Sign = X < 0.0f ? -1.0f : 1.0f;
    float A    = abs(X);
    float T    = 1.0f / (1.0f + 0.3275911f * A);
    float Poly = (((((1.061405429f * T - 1.453152027f) * T) + 1.421413741f) * T - 0.284496736f) * T + 0.254829592f) * T;
    return Sign * (1.0f - Poly * exp(-A * A));
}

float3 SolarLimbDarkening(float Mu)
{
    if (Mu <= 0.0f) return float3(0.0f);
    float  OneMinusMu = 1.0f - Mu;
    float  Weight     = max(0.0f, 1.0f - 0.38f * OneMinusMu - 0.24f * OneMinusMu * OneMinusMu);
    float3 Tint       = float3(
        pow(Mu, 0.18f),
        pow(Mu, 0.30f),
        pow(Mu, 0.48f));
    return Tint * Weight;
}

float3 SolarDiscIntensity(float AngleRad, float RadiusRad, float BlurSigmaRad)
{
    float Sigma = max(BlurSigmaRad, RadiusRad * 0.01f);
    float Edge  = 0.5f * (1.0f - SolarErf((AngleRad - RadiusRad) / (1.41421356f * Sigma)));
    if (Edge <= 1.0e-6f) return float3(0.0f);
    float ClampedRatio = min(AngleRad / max(RadiusRad, 1.0e-5f), 0.9995f);
    float Mu           = sqrt(max(0.0f, 1.0f - ClampedRatio * ClampedRatio));
    float3 Limb        = SolarLimbDarkening(Mu);
    float  Skirt       = (AngleRad > RadiusRad)
                       ? exp(-0.5f * pow((AngleRad - RadiusRad) / Sigma, 2.0f)) * 0.15f
                       : 0.0f;
    return (Limb + float3(Skirt, Skirt * 0.85f, Skirt * 0.65f)) * Edge;
}

float3 SolarResolvedRadiance(float3 RayDir, float3 SunDir, float PixelFootprintRad, float AngularRadiusRad, float3 ZenithTransmittance)
{
    float CosTheta  = clamp(dot(RayDir, SunDir), -1.0f, 1.0f);
    float CentreAng = acos(CosTheta);
    float BlurSigma = max(AngularRadiusRad * 0.035f, PixelFootprintRad * 0.55f);
    float Cutoff    = AngularRadiusRad + 6.0f * BlurSigma + PixelFootprintRad;
    if (CentreAng > Cutoff) return float3(0.0f);

    float3 Reference = abs(SunDir.z) < 0.9f ? float3(0.0f, 0.0f, 1.0f) : float3(1.0f, 0.0f, 0.0f);
    float3 TangentU  = normalize(cross(Reference, SunDir));
    float3 TangentV  = cross(SunDir, TangentU);
    float  U0        = dot(RayDir, TangentU);
    float  V0        = dot(RayDir, TangentV);

    float3 Accum = float3(0.0f);
    for (int Sy = 0; Sy < 4; ++Sy)
    {
        for (int Sx = 0; Sx < 4; ++Sx)
        {
            float Ox  = ((float(Sx) + 0.5f) / 4.0f - 0.5f) * PixelFootprintRad;
            float Oy  = ((float(Sy) + 0.5f) / 4.0f - 0.5f) * PixelFootprintRad;
            float Ang = sqrt((U0 + Ox) * (U0 + Ox) + (V0 + Oy) * (V0 + Oy));
            Accum    += SolarDiscIntensity(Ang, AngularRadiusRad, BlurSigma);
        }
    }
    Accum *= (1.0f / 16.0f);

    float EffectiveR = sqrt(AngularRadiusRad * AngularRadiusRad + BlurSigma * BlurSigma);
    float CellArea   = max(PixelFootprintRad * PixelFootprintRad, 1.0e-8f);
    float DiscArea   = π * EffectiveR * EffectiveR;
    float MassWeight = (DiscArea / CellArea) * exp(-0.5f * (U0 * U0 + V0 * V0) / max(EffectiveR * EffectiveR + 0.08f * CellArea, 1.0e-8f));
    float3 Unresolved = SolarLimbDarkening(0.7f) * MassWeight;
    float  Blend      = saturate(PixelFootprintRad / max(AngularRadiusRad * 1.5f, 1.0e-6f));
    float3 Combined   = lerp(Accum, Unresolved, Blend);
    return ZenithTransmittance * Combined * 28.0f;
}

float SolarPolygonEdge(float Angle, float Radius, float Blades, float Rotation)
{
    float Count  = max(Blades, 3.0f);
    float Sector = 2.0f * π / Count;
    float Diff   = Angle - Rotation;
    float Local  = Diff - Sector * floor(Diff / Sector + 0.5f);
    return Radius * cos(π / Count) / max(cos(Local), 0.2f);
}

float3 EvaluateSolarLensFlare5605(float2 PixelUv, float2 SunUv, float Aspect, uint Flags)
{
    if ((Flags & (1u << 5u)) == 0u)
    {
        return float3(0.0f);
    }
    float4 Flare0    = UniformsAndLights[10];
    float4 Flare1    = UniformsAndLights[11];
    float4 SunRadDay = UniformsAndLights[5];
    float  HaloScale = clamp(Flare0.x / 0.42f, 0.25f, 2.5f);
    float  DispScale = clamp(Flare0.y / 0.18f, 0.0f, 3.0f);
    float  Intensity = Flare0.w;
    float  Blades    = max(3.0f, Flare1.z);
    if (Intensity <= 1.0e-4f)
    {
        return float3(0.0f);
    }

    // Screen and ScreenSun in height-normalised NDC (half frame height = 1), matching 56059b39:SolarOptics.slang
    float2 Pixel   = float2((2.0f * PixelUv.x - 1.0f) * Aspect, 1.0f - 2.0f * PixelUv.y);
    float2 Sun     = float2((2.0f * SunUv.x - 1.0f) * Aspect,   1.0f - 2.0f * SunUv.y);
    float  SunDist = length(Sun);
    float  EdgeVig = saturate(1.0f - max(0.0f, SunDist - 1.05f) / 0.65f);
    if (EdgeVig <= 0.0f)
    {
        return float3(0.0f);
    }

    // Disc-integrated solar irradiance at the lens (56059b39:SolarOptics.slang)
    float3 Flux   = max(SunRadDay.xyz, float3(0.65f, 0.55f, 0.42f)) * (0.14f * Intensity * EdgeVig);
    float3 Result = float3(0.0f);

    static const float3 GhostGeometry[6] = {
        float3(0.25f, 0.06f, 0.50f), float3(0.55f, 0.13f, 0.30f), float3(0.90f, 0.04f, 0.65f),
        float3(1.25f, 0.20f, 0.18f), float3(1.70f, 0.08f, 0.40f), float3(2.30f, 0.30f, 0.10f)
    };
    static const float4 GhostAppearance[6] = {
        float4(1.00f, 0.74f, 0.48f, 0.00f), float4(0.46f, 0.96f, 0.62f, 0.82f), float4(0.56f, 0.66f, 1.00f, 0.00f),
        float4(1.00f, 0.52f, 0.58f, 0.00f), float4(0.86f, 0.96f, 0.52f, 0.78f), float4(0.52f, 0.90f, 1.00f, 0.00f)
    };

    float ChromaticShift = 0.012f * DispScale;
    float3 ChannelScale  = float3(1.0f + ChromaticShift, 1.0f, 1.0f - ChromaticShift);

    for (uint Index = 0u; Index < 6u; ++Index)
    {
        float3 Geometry   = GhostGeometry[Index];
        float4 Appearance = GhostAppearance[Index];
        float  GhostR     = Geometry.y * HaloScale;
        float2 Offset     = Pixel + Sun * Geometry.x;
        float  Radius     = length(Offset);
        if (Radius > GhostR * 1.15f)
        {
            continue;
        }
        float  Angle = atan2(Offset.y, Offset.x);
        float3 Form  = float3(0.0f);
        for (uint Channel = 0u; Channel < 3u; ++Channel)
        {
            float Edge     = SolarPolygonEdge(Angle, GhostR * ChannelScale[Channel], Blades, 0.0f);
            float Interior = saturate((Edge - Radius) / max(0.10f * GhostR, 1.0e-4f));
            Interior       = Interior * Interior * (3.0f - 2.0f * Interior);
            if (Appearance.w > 0.0f)
            {
                float D       = (Radius - Appearance.w * Edge) / max(0.10f * GhostR, 1.0e-4f);
                Form[Channel] = exp(-D * D) + 0.14f * Interior;
            }
            else
            {
                float Rim     = Radius / max(GhostR, 1.0e-4f);
                Form[Channel] = Interior * (0.55f + 0.45f * Rim * Rim);
            }
        }
        Result += 0.16f * Geometry.z * Appearance.xyz * Flux * Form;
    }

    float2 Offset = Pixel - Sun;
    float  Radius = length(Offset);
    if ((Flags & (1u << 14u)) != 0u)
    {
        uint   BladesU = uint(Blades);
        uint   Spikes  = (BladesU % 2u == 0u) ? BladesU : (2u * BladesU);
        float  Angle   = atan2(Offset.y, Offset.x);
        float  ReachX  = 0.55f;
        float  Radial  = pow(1.0f / (1.0f + Radius / (0.012f + 0.05f * ReachX)), 1.7f) * exp(-Radius / ReachX);
        float3 Angular = float3(0.0f);
        for (uint Spike = 0u; Spike < Spikes; ++Spike)
        {
            float D = Angle - 2.0f * π * float(Spike) / float(Spikes);
            D      -= 2.0f * π * floor(D / (2.0f * π) + 0.5f);
            float3 Scaled = D / (0.020f * float3(1.10f, 1.0f, 0.92f));
            Angular      += exp(-Scaled * Scaled);
        }
        Result += 0.85f * Flux * Angular * Radial;
    }

    if ((Flags & (1u << 13u)) != 0u)
    {
        float Thick = 0.006f;
        float Reach = 1.35f;
        float Wide  = exp(-pow(Offset.y / Thick, 2.0f)) * exp(-abs(Offset.x) / Reach);
        float Core  = exp(-pow(Offset.y / (0.35f * Thick), 2.0f)) * exp(-abs(Offset.x) / (0.42f * Reach));
        Result     += Flux * float3(0.34f, 0.54f, 1.0f) * 0.55f * (Wide + 0.85f * Core);
    }

    float Glow = 0.50f * exp(-pow(Radius / 0.035f, 2.0f)) + 0.025f * exp(-pow(Radius / 0.30f, 2.0f));
    float Veil = 0.004f + 0.008f * exp(-pow(Radius / 1.2f, 2.0f));
    Result    += Flux * (Glow + Veil);

    if (SunDist > 1.0e-6f)
    {
        float  HaloRadius = length(Pixel + Sun);
        float3 D          = (HaloRadius - SunDist - float3(0.004f, 0.0f, -0.004f) * DispScale) / 0.030f;
        Result           += Flux * exp(-D * D) * (0.035f * HaloScale);
    }
    return Result;
}

// --- Exact Selenographic Moon from 56059b39:{LunarDiscProjection,CelestialModel}.h ---

float3 SampleLunarSurfaceAlbedo5605(float2 EquirectUv)
{
    float Lon = (EquirectUv.x - 0.5f) * (2.0f * π);
    float Lat = (0.5f - EquirectUv.y) * π;
    float3 N  = float3(cos(Lat) * sin(Lon), sin(Lat), cos(Lat) * cos(Lon));

    static const float4 Maria[8] = {
        float4(-0.32f,  0.52f, 0.36f, 0.50f), // Mare Imbrium
        float4( 0.30f,  0.46f, 0.28f, 0.46f), // Mare Serenitatis
        float4( 0.52f,  0.15f, 0.32f, 0.48f), // Mare Tranquillitatis
        float4( 0.92f,  0.28f, 0.18f, 0.52f), // Mare Crisium
        float4( 0.82f, -0.10f, 0.26f, 0.40f), // Mare Foecunditatis
        float4( 0.56f, -0.28f, 0.20f, 0.36f), // Mare Nectaris
        float4(-0.68f,  0.12f, 0.48f, 0.44f), // Oceanus Procellarum
        float4(-0.62f, -0.40f, 0.22f, 0.38f)  // Mare Humorum
    };

    float MareMask = 0.0f;
    for (int I = 0; I < 8; ++I)
    {
        float3 Center = normalize(float3(
            cos(Maria[I].y) * sin(Maria[I].x),
            sin(Maria[I].y),
            cos(Maria[I].y) * cos(Maria[I].x)));
        float Angle = acos(clamp(dot(N, Center), -1.0f, 1.0f));
        float T     = max(0.0f, 1.0f - Angle / Maria[I].z);
        MareMask   += Maria[I].w * T * T * (3.0f - 2.0f * T);
    }
    MareMask = min(MareMask, 0.85f);

    static const float3 RayCraters[3] = {
        float3(-0.19f, -0.75f, 0.22f), // Tycho
        float3(-0.35f,  0.17f, 0.20f), // Copernicus
        float3(-0.66f,  0.14f, 0.14f)  // Kepler
    };
    float3 Highland = float3(0.142f, 0.136f, 0.126f);
    float3 Mare     = float3(0.068f, 0.066f, 0.064f);
    float3 Albedo   = lerp(Highland, Mare, MareMask);

    for (int C = 0; C < 3; ++C)
    {
        float3 CDir = normalize(float3(
            cos(RayCraters[C].y) * sin(RayCraters[C].x),
            sin(RayCraters[C].y),
            cos(RayCraters[C].y) * cos(RayCraters[C].x)));
        float Ang = acos(clamp(dot(N, CDir), -1.0f, 1.0f));
        if (Ang < RayCraters[C].z)
        {
            float Core  = exp(-pow(Ang / (RayCraters[C].z * 0.18f), 2.0f));
            float Azim  = atan2(N.y - CDir.y, N.x - CDir.x);
            float Spoke = 0.5f + 0.5f * cos(Azim * 11.0f + float(C) * 2.1f);
            float Rays  = pow(Spoke, 3.0f) * exp(-Ang / (RayCraters[C].z * 0.55f)) * (1.0f - Core);
            float Boost = 1.0f + 0.36f * Core + 0.16f * Rays;
            Albedo     *= Boost;
        }
    }

    float Detail = 1.0f + 0.10f * sin(17.0f * N.x + 23.0f * N.y - 19.0f * N.z)
                        + 0.06f * cos(41.0f * N.y - 37.0f * N.z + 29.0f * N.x);
    return max(Albedo * Detail, float3(0.02f));
}

bool EvaluateLunarDisc5605(float3 RayDir, float3 MoonDir, float Phase01, float AlbedoScale, float EarthshineScale, out float3 OutRadiance, out float OutCoverage)
{
    OutRadiance = float3(0.0f);
    OutCoverage = 0.0f;
    float AngularRadius = 0.0185f;
    float Feather       = AngularRadius * 0.06f;
    float CosOuter      = cos(AngularRadius + Feather);
    if (dot(RayDir, MoonDir) < CosOuter)
    {
        return false;
    }

    float3 WorldUp = abs(MoonDir.z) < 0.99f ? float3(0.0f, 0.0f, 1.0f) : float3(1.0f, 0.0f, 0.0f);
    float3 Right   = normalize(cross(WorldUp, MoonDir));
    float3 Up      = cross(MoonDir, Right);
    float  TanR    = tan(AngularRadius);
    float  Denom   = max(dot(RayDir, MoonDir), 1.0e-4f);
    float  U       = dot(RayDir, Right) / (Denom * TanR);
    float  V       = dot(RayDir, Up)    / (Denom * TanR);
    float  Rho2    = U * U + V * V;
    float  Rho     = sqrt(Rho2);
    float  FeatherNorm = Feather / max(AngularRadius, 1.0e-5f);
    if (Rho >= 1.0f + FeatherNorm)
    {
        return false;
    }

    float TEdge    = saturate((Rho - (1.0f - FeatherNorm)) / max(2.0f * FeatherNorm, 1.0e-5f));
    OutCoverage    = 1.0f - TEdge * TEdge * (3.0f - 2.0f * TEdge);
    float ClampedR = min(Rho, 0.9999f);
    float Scale    = (Rho > 1.0e-6f) ? (ClampedR / Rho) : 1.0f;
    float Us       = U * Scale;
    float Vs       = V * Scale;
    float Zs       = sqrt(max(0.0f, 1.0f - Us * Us - Vs * Vs));

    float3 NormalWorld = normalize(Right * Us + Up * Vs - MoonDir * Zs);
    float  Lon         = atan2(Us, Zs);
    float  Lat         = asin(clamp(Vs, -1.0f, 1.0f));
    float2 EquirectUv  = float2(0.5f + Lon / (2.0f * π), 0.5f - Lat / π);
    float3 Albedo      = SampleLunarSurfaceAlbedo5605(EquirectUv) * (AlbedoScale / 0.14f);

    float  PhaseAngle  = (1.0f - saturate(Phase01)) * π;
    float3 LunarSunDir = normalize(-MoonDir * cos(PhaseAngle) + Right * sin(PhaseAngle));
    float  Mu0         = max(0.0f, dot(NormalWorld, LunarSunDir));
    float  Mu          = max(1.0e-3f, Zs);
    float  Lommel      = (Mu0 > 0.0f) ? (Mu0 / (Mu0 + Mu)) : 0.0f;
    float  Surge       = 1.0f + 0.45f / (1.0f + PhaseAngle / 0.08f) + 0.25f * exp(-pow(PhaseAngle / 0.35f, 2.0f));
    float  Retro       = pow(1.0f - Mu, 0.35f) * 0.15f + 0.85f;
    float  Brdf        = (2.0f / π) * Lommel * Surge * Retro;

    float3 DirectMoon  = Albedo * (Brdf * 18.5f);
    float3 Earthshine  = Albedo * float3(0.18f, 0.24f, 0.36f) * (EarthshineScale * 1.45f * (0.4f + 0.6f * Mu));
    OutRadiance        = (DirectMoon + Earthshine) * OutCoverage;
    return true;
}

float3 SampleSkyViewLut(float3 RayDir, float3 SunDir)
{
    float Elevation = asin(clamp(RayDir.z, -1.0f, 1.0f));
    float HorizonEl = -0.00445f;
    float V;
    if (Elevation < HorizonEl)
    {
        float Ratio = (Elevation - HorizonEl) / (-0.5f * π - HorizonEl);
        V           = 0.5f - 0.5f * sqrt(saturate(Ratio));
    }
    else
    {
        float Ratio = (Elevation - HorizonEl) / (0.5f * π - HorizonEl);
        V           = 0.5f + 0.5f * sqrt(saturate(Ratio));
    }

    float2 ViewH  = RayDir.xy;
    float2 SunH   = SunDir.xy;
    float  ViewHL = length(ViewH);
    float  SunHL  = length(SunH);
    float  Azim   = 0.0f;
    if (ViewHL > 1.0e-5f && SunHL > 1.0e-5f)
    {
        Azim = acos(clamp(dot(ViewH / ViewHL, SunH / SunHL), -1.0f, 1.0f));
    }
    float U = saturate(Azim / π);

    float Fx = U * 95.0f;
    float Fy = saturate(V) * 53.0f;
    uint  X0 = min(uint(Fx), 95u);
    uint  Y0 = min(uint(Fy), 53u);
    uint  X1 = min(X0 + 1u, 95u);
    uint  Y1 = min(Y0 + 1u, 53u);
    float Tx = Fx - float(X0);
    float Ty = Fy - float(Y0);

    float3 C00 = SkyLutBuffer[Y0 * 96u + X0].rgb;
    float3 C10 = SkyLutBuffer[Y0 * 96u + X1].rgb;
    float3 C01 = SkyLutBuffer[Y1 * 96u + X0].rgb;
    float3 C11 = SkyLutBuffer[Y1 * 96u + X1].rgb;
    return lerp(lerp(C00, C10, Tx), lerp(C01, C11, Tx), Ty);
}

float3 EvaluateFastSkyRadiance(float3 RayDir)
{
    float4 SunDirRadius = UniformsAndLights[4];
    float4 SkyZenith    = UniformsAndLights[6];
    float4 SkyHorizon   = UniformsAndLights[7];
    uint   Flags        = uint(UniformsAndLights[15].w + 0.5f);

    if ((Flags & (1u << 2u)) != 0u)
    {
        return SampleSkyViewLut(RayDir, SunDirRadius.xyz) * 2.25f;
    }
    float UpT = saturate(RayDir.z);
    return lerp(SkyHorizon.xyz, SkyZenith.xyz, pow(UpT, 0.55f));
}

float3 EvaluateFullSkyAndClouds(float3 RayOrigin, float3 RayDir, bool IncludeSunDisc, uint2 PixelCoord)
{
    float4 CamEyeTan    = UniformsAndLights[0];
    float4 CamUpH       = UniformsAndLights[3];
    float4 SunDirRadius = UniformsAndLights[4];
    float4 SunRadDay    = UniformsAndLights[5];
    float4 SkyZenith    = UniformsAndLights[6];
    float4 SkyHorizon   = UniformsAndLights[7];
    float4 CloudU       = UniformsAndLights[8];
    float4 Flare0       = UniformsAndLights[10];
    float4 Flare1       = UniformsAndLights[11];
    float4 Moon1        = UniformsAndLights[12];
    float4 Moon2        = UniformsAndLights[13];
    float4 Stars        = UniformsAndLights[14];
    uint   Flags        = uint(UniformsAndLights[15].w + 0.5f);
    float  TimeSec      = UniformsAndLights[15].x * 0.016f;

    float3 SunDir   = SunDirRadius.xyz;
    float  Daylight = SunRadDay.w;
    float3 Sky;

    if ((Flags & (1u << 2u)) != 0u)
    {
        Sky = SampleSkyViewLut(RayDir, SunDir) * 2.25f;
    }
    else
    {
        float UpT = saturate(RayDir.z);
        Sky       = lerp(SkyHorizon.xyz, SkyZenith.xyz, pow(UpT, 0.55f));
    }

    if (RayDir.z > 0.0f)
    {
        if ((Flags & (1u << 8u)) != 0u)
        {
            float NightVis = saturate(1.0f - Daylight * 1.45f) + 0.08f * saturate(RayDir.z);
            if (NightVis > 1.0e-3f)
            {
                float3 GalNorth  = float3(-0.867666f, -0.198076f, 0.455984f);
                float3 GalCenter = float3(-0.054876f, -0.873437f, -0.483835f);
                float  SinBeta   = dot(RayDir, GalNorth);
                float  Band      = exp(-pow(SinBeta / 0.16f, 2.0f));
                if (Band > 1.0e-4f && Stars.z > 0.0f)
                {
                    float Bulge = 0.45f + 0.85f * pow(0.5f + 0.5f * dot(RayDir, GalCenter), 2.2f);
                    float Cloud = 0.65f + 0.70f * FbmRotated3D(RayDir * 6.5f, 3, 307u);
                    float Rift  = exp(-pow(SinBeta / 0.045f, 2.0f)) * smoothstep(0.42f, 0.78f, FbmRotated3D(RayDir * 11.0f, 3, 911u));
                    float MwLum = Stars.z * 0.18f * Band * Bulge * Cloud * (1.0f - 0.68f * Rift) * NightVis;
                    Sky        += float3(MwLum * 1.04f, MwLum * 0.99f, MwLum * 1.18f);
                }
                int3  StarCell = int3(floor(RayDir * 220.0f));
                float StarRng  = HashFloat3(StarCell, 701u);
                if (StarRng > 0.9945f)
                {
                    float  Scint = 1.0f + 0.25f * Stars.y * sin(TimeSec * 9.5f + StarRng * 62.8f);
                    float  B     = (StarRng - 0.9945f) * 480.0f * Stars.x * NightVis * Scint * RayDir.z;
                    float3 Tint  = lerp(float3(1.0f, 0.82f, 0.65f), float3(0.74f, 0.86f, 1.0f), frac(StarRng * 97.0f));
                    Sky         += Tint * B;
                }
            }
        }

        // Exact 56059b39 Selenographic Moon (Mare Imbrium/Serenitatis/Tranquillitatis/Crisium + Tycho/Copernicus/Kepler + Lommel-Seeliger)
        if ((Flags & (1u << 6u)) != 0u)
        {
            float  PackedMoon = Moon2.w;
            float  Earthshine = floor(PackedMoon) * 0.01f;
            float  MoonAlbedo = max(0.02f, PackedMoon - floor(PackedMoon));
            float3 MoonRad;
            float  MoonCov;
            if (EvaluateLunarDisc5605(RayDir, Moon1.xyz, Moon1.w, MoonAlbedo, Earthshine, MoonRad, MoonCov))
            {
                Sky = Sky * (1.0f - MoonCov * 0.82f) + MoonRad;
            }
        }

        if ((Flags & (1u << 7u)) != 0u)
        {
            float3 SecMoonRad;
            float  SecMoonCov;
            if (EvaluateLunarDisc5605(RayDir, Moon2.xyz, 0.45f, 0.12f, 0.15f, SecMoonRad, SecMoonCov))
            {
                Sky = Sky * (1.0f - SecMoonCov * 0.82f) + SecMoonRad * 0.65f;
            }
        }
    }

    // Exact 56059b39 SolarDiscPixel (Quadratic limb darkening + SolarErf Gaussian limb PSF + 16-sample supersampling)
    if (IncludeSunDisc && (Flags & (1u << 0u)) != 0u && SunDir.z > -0.05f)
    {
        float  PixelFootprintRad = (2.0f * CamEyeTan.w) / max(CamUpH.w, 64.0f);
        float3 ZenithTrans       = max(SunRadDay.xyz, float3(0.45f, 0.32f, 0.20f));
        Sky += SolarResolvedRadiance(RayDir, SunDir, PixelFootprintRad, max(0.0046524f, SunDirRadius.w), ZenithTrans);
    }

    // Exact 56059b39 CloudRay ([BaseM, TopM] slab + 64-bit CloudLattice/CloudNoise 4-octave FBM + 6-step sun optical depth + HG phase)
    if ((Flags & (1u << 3u)) != 0u && RayDir.z > 0.005f && CloudU.x > 0.005f)
    {
        float BaseM          = CloudU.y;
        float TopM           = CloudU.z;
        float ExtinctionPerM = CloudU.w;
        float T0             = (BaseM - RayOrigin.z) / RayDir.z;
        float T1             = (TopM  - RayOrigin.z) / RayDir.z;
        float TEnter         = max(0.0f, min(T0, T1));
        float TExit          = min(30000.0f, max(T0, T1));

        if (TExit > TEnter && TEnter < 30000.0f)
        {
            uint   Steps         = IncludeSunDisc ? 36u : 12u;
            uint   SunSteps      = IncludeSunDisc ? 6u  : 3u;
            float  Dt            = (TExit - TEnter) / float(Steps);
            float  Transmittance = 1.0f;
            float3 Scattered     = float3(0.0f);
            float  CosTheta      = clamp(dot(RayDir, SunDir), -1.0f, 1.0f);
            float  PhaseG        = clamp(Flare1.w, 0.0f, 0.85f);
            float  Phase         = HenyeyGreensteinPhase(CosTheta, PhaseG);
            float2 WindMps       = float2(Flare0.z * 0.7071f, Flare0.z * 0.7071f);
            float3 SunIrradiance = max(SunRadDay.xyz * 2.85f, float3(1.85f, 1.72f, 1.56f) * max(Daylight, 0.15f));
            float3 AmbientSky    = EvaluateFastSkyRadiance(float3(0.0f, 0.0f, 1.0f)) * 0.45f
                                 + float3(0.28f, 0.34f, 0.44f) * max(Daylight, 0.15f);

            for (uint I = 0u; I < Steps; ++I)
            {
                if (Transmittance <= 0.01f)
                {
                    break;
                }
                float  T       = TEnter + (float(I) + 0.5f) * Dt;
                float3 Pos     = RayOrigin + RayDir * T;
                float  Density = EvaluateCloudDensity5605(Pos, BaseM, TopM, CloudU.x, WindMps, TimeSec);
                if (Density <= 1.0e-5f)
                {
                    continue;
                }

                float SunOptical = 0.0f;
                if (SunDir.z > -0.05f)
                {
                    const float SunDt = 220.0f;
                    for (uint J = 0u; J < SunSteps; ++J)
                    {
                        float3 SunPos = Pos + SunDir * ((float(J) + 0.5f) * SunDt);
                        SunOptical   += EvaluateCloudDensity5605(SunPos, BaseM, TopM, CloudU.x, WindMps, TimeSec)
                                      * ExtinctionPerM * SunDt;
                    }
                }
                else
                {
                    SunOptical = 8.0f;
                }

                float  SunTrans  = exp(-SunOptical);
                float  HFrac     = saturate((Pos.z - BaseM) / max(TopM - BaseM, 1.0f));
                float3 InScatter = SunIrradiance * (SunTrans * Phase * 2.6f)
                                 + AmbientSky * (0.55f + 0.45f * HFrac);
                float  StepTrans = exp(-Density * ExtinctionPerM * Dt);
                float  Weight    = Transmittance * (1.0f - StepTrans);
                Scattered       += InScatter * Weight;
                Transmittance   *= StepTrans;
            }

            float HorizonFade = exp(-TEnter / 26000.0f);
            Scattered         = lerp(Sky * (1.0f - Transmittance), Scattered, HorizonFade);
            Sky               = Sky * Transmittance + Scattered;
        }
    }

    return Sky;
}

float3 EvaluateSceneLights(float3 WorldPos, float3 Normal, float3 ViewDir, SurfaceSample Surf)
{
    uint   LightCount = min(uint(UniformsAndLights[7].w + 0.5f), 32u);
    float3 Total      = float3(0.0f);

    for (uint I = 0u; I < LightCount; ++I)
    {
        float4 L0 = UniformsAndLights[20u + I * 2u + 0u];
        float4 L1 = UniformsAndLights[20u + I * 2u + 1u];

        float3 ToLight = L0.xyz - WorldPos;
        float  DistSq  = dot(ToLight, ToLight);
        float  Radius  = max(L0.w, 0.5f);
        if (DistSq >= Radius * Radius)
        {
            continue;
        }
        float  Dist  = sqrt(max(DistSq, 1.0e-4f));
        float3 LDir  = ToLight / Dist;
        float  NdotL = dot(Normal, LDir);
        if (NdotL <= 0.0f)
        {
            continue;
        }

        float Ratio = Dist / Radius;
        float Win   = saturate(1.0f - Ratio * Ratio);
        float Atten = (Win * Win) / (1.0f + 0.28f * DistSq);

        // Directional cone shaping for vehicle Low-Beam Headlights (when L1.w > -90.0f, L1.w is beam yaw rad)
        if (L1.w > -90.0f)
        {
            float3 BeamForward = normalize(float3(cos(L1.w), sin(L1.w), -0.14f));
            float  CosCone     = dot(-LDir, BeamForward);
            float  SpotMask    = smoothstep(0.52f, 0.88f, CosCone);
            Atten             *= SpotMask;
        }

        if (Atten > 1.0e-5f)
        {
            Total += L1.xyz * Atten * ResolveDirectReflectance(Surf, Normal, ViewDir, LDir);
        }
    }
    return Total;
}

float3 ApplyHeightFogAndAerial(float3 Radiance, float3 EyePos, float3 RayDir, float TravelDist, uint Flags)
{
    if ((Flags & (1u << 4u)) == 0u)
    {
        return Radiance;
    }
    float4 Fog0      = UniformsAndLights[9];
    float4 SkyHoriz  = UniformsAndLights[7];
    float4 SunDirRad = UniformsAndLights[4];
    float4 SunRadDay = UniformsAndLights[5];
    float4 Moon1     = UniformsAndLights[12];
    float  BaseDens  = Fog0.x;
    float  BaseAlt   = Fog0.y;
    float  ScaleH    = max(Fog0.z, 1.0f);
    float  StartDist = Fog0.w;

    float EffectiveDist = max(0.0f, min(TravelDist, 450.0f) - StartDist);
    if (EffectiveDist <= 0.0f || BaseDens <= 1.0e-6f)
    {
        return Radiance;
    }

    float3 HitPos     = EyePos + RayDir * min(TravelDist, 450.0f);
    float  MidZ       = 0.5f * (EyePos.z + HitPos.z);
    float  HeightFac  = exp(-max(0.0f, MidZ - BaseAlt) / ScaleH);
    float  Tau        = BaseDens * EffectiveDist * HeightFac;
    float  Trans      = exp(-Tau);
    float  CosSun     = max(0.0f, dot(RayDir, SunDirRad.xyz));
    float  MieForward = pow(CosSun, 6.0f) * 0.28f;
    float3 FogColor   = SkyHoriz.xyz + SunRadDay.xyz * MieForward * 0.08f + float3(0.04f, 0.06f, 0.10f) * Moon1.w;
    return Radiance * Trans + FogColor * (1.0f - Trans);
}

float3 ApplyOpticalLensFlare(float3 Radiance, float2 Uv, float Aspect, float3 EyePos, uint Flags)
{
    if ((Flags & (1u << 5u)) == 0u)
    {
        return Radiance;
    }
    float4 Flare1 = UniformsAndLights[11];
    float2 SunNdc = Flare1.xy;
    float2 SunUv  = float2(0.5f + 0.5f * SunNdc.x, 0.5f - 0.5f * SunNdc.y);
    float3 SunDir = UniformsAndLights[4].xyz;
    float  CloudVis = SampleCloudGroundShadow(EyePos, SunDir, Flags);
    return Radiance + EvaluateSolarLensFlare5605(Uv, SunUv, Aspect, Flags) * (0.25f + 0.75f * CloudVis);
}

float3 AcesFilmic(float3 X)
{
    return saturate((X * (2.51f * X + 0.03f)) / (X * (2.43f * X + 0.59f) + 0.14f));
}

float3 ClampFireflies(float3 Radiance, float MaxLuminance)
{
    float Lum = dot(Radiance, float3(0.2126f, 0.7152f, 0.0722f));
    if (Lum > MaxLuminance)
    {
        return Radiance * (MaxLuminance / max(Lum, 1.0e-4f));
    }
    return Radiance;
}

//------------------------------------------------------------------------------------------------------------------------
//                  PASS 0: PRIMARY VISIBILITY + DIRECT + INDIRECT GI/REFLECTION + MOTION REPROJECTION
//------------------------------------------------------------------------------------------------------------------------

void ExecutePass0Integrate(uint2 Pixel, uint Width, uint Height)
{
    uint   TotalPixels   = Width * Height;
    uint   PixelIdx      = Pixel.y * Width + Pixel.x;
    uint   HistBase      = TotalPixels * 2u;

    float4 CamEyeTan     = UniformsAndLights[0];
    float4 CamFwdAspect  = UniformsAndLights[1];
    float4 CamRightW     = UniformsAndLights[2];
    float4 CamUpH        = UniformsAndLights[3];
    float4 SunDirRadius  = UniformsAndLights[4];
    float4 SunRadDay     = UniformsAndLights[5];
    float4 Meta          = UniformsAndLights[15];
    float4 PrevEyeTan    = UniformsAndLights[16];
    float4 PrevFwdAspect = UniformsAndLights[17];
    float4 PrevRightMove = UniformsAndLights[18];
    float4 PrevUpPad     = UniformsAndLights[19];

    uint FrameIndex        = uint(Meta.x + 0.5f);
    uint AccumulatedFrames = uint(Meta.y + 0.5f);
    uint Flags             = uint(Meta.w + 0.5f);

    uint   Rng    = ConstructPixelSeed(Pixel, FrameIndex, 1u);
    float2 SubJit = ((Flags & (1u << 11u)) != 0u && AccumulatedFrames > 1u && PrevRightMove.w < 0.5f)
                  ? (float2(AdvanceUniform(Rng), AdvanceUniform(Rng)) - 0.5f) * 0.65f
                  : float2(0.0f, 0.0f);

    float  U      = (float(Pixel.x) + 0.5f + SubJit.x) / float(Width);
    float  V      = (float(Pixel.y) + 0.5f + SubJit.y) / float(Height);
    float  NdcX   = (2.0f * U - 1.0f) * CamFwdAspect.w * CamEyeTan.w;
    float  NdcY   = (1.0f - 2.0f * V) * CamEyeTan.w;
    float3 RayDir = normalize(CamFwdAspect.xyz + CamRightW.xyz * NdcX + CamUpH.xyz * NdcY);
    float3 EyePos = CamEyeTan.xyz;

    EverestRayHit Primary = TracePrimaryRay(EyePos, RayDir, 1.0e-2f, 2000.0f);
    if (!Primary.Hit)
    {
        ReservoirBuffer[PixelIdx * 2u + 0u]    = float4(0.0f, 0.0f, 0.0f, -1.0f);
        ReservoirBuffer[PixelIdx * 2u + 1u]    = float4(RayDir.x, RayDir.y, RayDir.z, -1.0f);
        AccumulationBuffer[PixelIdx * 2u + 0u] = float4(0.0f);
        AccumulationBuffer[PixelIdx * 2u + 1u] = float4(0.0f);
        return;
    }

    MaterialRecord Mat  = Materials[Primary.MaterialId];
    SurfaceSample  Surf = ProjectSurfaceSample(Mat);
    float3         View = -RayDir;
    float3         Norm = Primary.Normal;
    float3         HitP = Primary.Position + Norm * 2.5e-3f;

    float3 FlakeTiltData = float3(0.0f, 0.0f, 0.0f);
    ApplyMaterialWorkspaceAutomotivePaint(Primary.MaterialId, Primary.Position, EyePos, CamEyeTan.w, float(Height), View, Surf, FlakeTiltData);
    float3 ShadingNorm = PerturbNormalByFlake(Norm, FlakeTiltData);

    float3 SunDir = SunDirRadius.xyz;
    float3 Direct = float3(0.0f);
    if ((Flags & (1u << 0u)) != 0u && SunDir.z > 0.0f)
    {
        float NdotL = dot(Norm, SunDir);
        if (NdotL > 0.0f)
        {
            float ShadowVis = 1.0f;
            if ((Flags & (1u << 1u)) != 0u)
            {
                ShadowVis = TraceShadowRay(HitP, SunDir, 2.0e-3f, 220.0f) ? 1.0f : 0.0f;
            }
            ShadowVis *= SampleCloudGroundShadow(Primary.Position, SunDir, Flags);
            if (ShadowVis > 0.0f)
            {
                float3 Brdf = ResolveDirectReflectance(Surf, ShadingNorm, View, SunDir);
                Direct     += SunRadDay.xyz * ShadowVis * Brdf;
            }
        }
    }

    Direct += EvaluateSceneLights(Primary.Position, ShadingNorm, View, Surf);

    float3 Emissive = Surf.Emission;
    if (Primary.MaterialId == HeadlightFamily || Primary.MaterialId == TaillightFamily)
    {
        float LensFacing = 0.70f + 0.55f * saturate(dot(Norm, View));
        Emissive        *= LensFacing;
    }

    float3 IndirectIrradiance = float3(0.0f);
    if ((Flags & (1u << 9u)) != 0u)
    {
        float2        Xi    = SampleDiscrepancyPair(Pixel, FrameIndex + 13u);
        float3        Bounce = TransformLocalToWorld(Norm, ProjectCosineHemisphere(Xi));
        EverestRayHit GiHit = TracePrimaryRay(HitP, Bounce, 3.0e-3f, 85.0f);
        if (GiHit.Hit)
        {
            MaterialRecord GiMat  = Materials[GiHit.MaterialId];
            SurfaceSample  GiSurf = ProjectSurfaceSample(GiMat);
            float3         GiRad  = min(GiSurf.Emission, float3(6.0f));
            if ((Flags & (1u << 0u)) != 0u && SunDir.z > 0.0f)
            {
                float GiNdotL = max(0.0f, dot(GiHit.Normal, SunDir));
                if (GiNdotL > 0.0f && TraceShadowRay(GiHit.Position + GiHit.Normal * 4.0e-3f, SunDir, 3.0e-3f, 120.0f))
                {
                    GiRad += GiSurf.Albedo * SunRadDay.xyz * (GiNdotL * InversePi);
                }
            }
            GiRad              += GiSurf.Albedo * EvaluateFastSkyRadiance(GiHit.Normal) * 0.22f;
            IndirectIrradiance  = ClampFireflies(GiRad, 4.0f);
        }
        else
        {
            IndirectIrradiance = ClampFireflies(EvaluateFastSkyRadiance(Bounce) * 0.58f, 4.0f);
        }
    }
    else
    {
        IndirectIrradiance = EvaluateFastSkyRadiance(Norm) * 0.35f;
    }

    float  EffRoughness     = (Surf.CoatWeight > 0.0f) ? Surf.CoatRoughness : Surf.Roughness;
    float3 MirrorDir        = reflect(-View, Norm);
    float3 EnvFallback      = EvaluateFastSkyRadiance(MirrorDir) * 0.55f;
    float3 SpecularRadiance = EnvFallback;
    if ((Flags & (1u << 10u)) != 0u && EffRoughness < 0.28f)
    {
        float  SmoothWeight = 1.0f - smoothstep(0.06f, 0.28f, EffRoughness);
        float3 ReflDir      = MirrorDir;
        if (EffRoughness > 0.03f)
        {
            float2 DiskXi = SampleDiscrepancyPair(Pixel, FrameIndex + 29u);
            float2 Disk   = ProjectUniformDisk(DiskXi) * (EffRoughness * EffRoughness * 0.22f);
            ReflDir       = normalize(TransformLocalToWorld(MirrorDir, float3(Disk.x, Disk.y, 1.0f)));
            if (dot(ReflDir, Norm) <= 0.01f)
            {
                ReflDir = MirrorDir;
            }
        }
        EverestRayHit ReflHit = TracePrimaryRay(HitP, ReflDir, 3.0e-3f, 160.0f);
        float3        TracedS = float3(0.0f);
        if (ReflHit.Hit)
        {
            MaterialRecord RMat  = Materials[ReflHit.MaterialId];
            SurfaceSample  RSurf = ProjectSurfaceSample(RMat);
            float3         RFlake;
            ApplyMaterialWorkspaceAutomotivePaint(ReflHit.MaterialId, ReflHit.Position, EyePos, CamEyeTan.w, float(Height), -ReflDir, RSurf, RFlake);
            float3         RRad  = min(RSurf.Emission, float3(8.0f));
            if ((Flags & (1u << 0u)) != 0u && SunDir.z > 0.0f)
            {
                float RNdotL = max(0.0f, dot(ReflHit.Normal, SunDir));
                if (RNdotL > 0.0f && TraceShadowRay(ReflHit.Position + ReflHit.Normal * 4.0e-3f, SunDir, 3.0e-3f, 120.0f))
                {
                    RRad += ResolveDirectReflectance(RSurf, ReflHit.Normal, -ReflDir, SunDir) * SunRadDay.xyz;
                }
            }
            RRad    += RSurf.Albedo * EvaluateFastSkyRadiance(ReflHit.Normal) * 0.30f;
            TracedS  = ClampFireflies(RRad, 4.5f);
        }
        else
        {
            TracedS = ClampFireflies(EvaluateFullSkyAndClouds(HitP, ReflDir, false, Pixel), 4.5f);
        }
        SpecularRadiance = lerp(EnvFallback, TracedS, SmoothWeight);
    }

    if (Primary.GlassFresnel > 0.0f)
    {
        float3 GlassSky = EvaluateFullSkyAndClouds(Primary.GlassReflectionOrigin, Primary.GlassReflectionDir, false, Pixel);
        Direct          = Direct * Primary.GlassTint + GlassSky * Primary.GlassFresnel;
    }

    // Motion-Vector Reprojected Temporal Accumulation reading from the previous frame's denoised history bank (HistBase)
    float2 OctNorm  = EncodeOctahedral(Norm);
    float4 CurGuide = float4(OctNorm.x, OctNorm.y, Primary.Travel, float(Primary.MaterialId));

    float3 RelPrev   = Primary.Position - PrevEyeTan.xyz;
    float  PrevZ     = dot(RelPrev, PrevFwdAspect.xyz);
    bool   Reproject = (FrameIndex > 0u) && (PrevZ > 0.1f);
    uint   ReprojIdx = PixelIdx;

    if (Reproject)
    {
        float PrevNdcX = dot(RelPrev, PrevRightMove.xyz) / (PrevZ * PrevFwdAspect.w * PrevEyeTan.w);
        float PrevNdcY = dot(RelPrev, PrevUpPad.xyz)     / (PrevZ * PrevEyeTan.w);
        float PrevU    = 0.5f * (PrevNdcX + 1.0f);
        float PrevV    = 0.5f * (1.0f - PrevNdcY);
        if (PrevU >= 0.0f && PrevU < 1.0f && PrevV >= 0.0f && PrevV < 1.0f)
        {
            int2  RawPix  = int2(int(floor(PrevU * float(Width))), int(floor(PrevV * float(Height))));
            uint2 PrevPix = uint2(clamp(RawPix, int2(0, 0), int2(int(Width) - 1, int(Height) - 1)));
            ReprojIdx     = PrevPix.y * Width + PrevPix.x;
        }
        else
        {
            Reproject = false;
        }
    }

    if (Reproject)
    {
        float4 PrevGuide = ReservoirBuffer[HistBase + ReprojIdx];
        if (PrevGuide.w >= 0.0f)
        {
            float3 PrevNorm  = DecodeOctahedral(PrevGuide.xy);
            float  DepthDiff = abs(PrevGuide.z - PrevZ) / max(Primary.Travel, 0.25f);
            float  NormDot   = dot(PrevNorm, Norm);
            if (DepthDiff < 0.14f && NormDot > 0.80f)
            {
                float4 PrevInd  = AccumulationBuffer[HistBase + ReprojIdx * 2u + 0u];
                float4 PrevSpec = AccumulationBuffer[HistBase + ReprojIdx * 2u + 1u];
                float  MaxHist  = (PrevRightMove.w > 0.5f) ? 12.0f : 32.0f;
                float  HistoryN = min(PrevSpec.w + 1.0f, MaxHist);
                float  Alpha    = 1.0f / max(HistoryN, 1.0f);

                IndirectIrradiance = lerp(PrevInd.rgb,  IndirectIrradiance, Alpha);
                SpecularRadiance   = lerp(PrevSpec.rgb, SpecularRadiance,   Alpha);
                AccumulationBuffer[PixelIdx * 2u + 0u] = float4(IndirectIrradiance, 1.0f);
                AccumulationBuffer[PixelIdx * 2u + 1u] = float4(SpecularRadiance,   HistoryN);
                ReservoirBuffer[PixelIdx * 2u + 0u]    = float4(Direct + Emissive,  Primary.Travel);
                ReservoirBuffer[PixelIdx * 2u + 1u]    = CurGuide;
                return;
            }
        }
    }

    AccumulationBuffer[PixelIdx * 2u + 0u] = float4(IndirectIrradiance, 1.0f);
    AccumulationBuffer[PixelIdx * 2u + 1u] = float4(SpecularRadiance,   1.0f);
    ReservoirBuffer[PixelIdx * 2u + 0u]    = float4(Direct + Emissive,  Primary.Travel);
    ReservoirBuffer[PixelIdx * 2u + 1u]    = CurGuide;
}

//------------------------------------------------------------------------------------------------------------------------
//              PASS 1: SVGF 5x5 EDGE-STOPPING WAVELET DENOISER + RECOMBINATION + VOLUMETRIC SKY/FOG/FLARE
//------------------------------------------------------------------------------------------------------------------------

void ExecutePass1DenoiseAndPresent(uint2 Pixel, uint Width, uint Height)
{
    uint   TotalPixels  = Width * Height;
    uint   PixelIdx     = Pixel.y * Width + Pixel.x;
    uint   HistBase     = TotalPixels * 2u;

    float4 CamEyeTan    = UniformsAndLights[0];
    float4 CamFwdAspect = UniformsAndLights[1];
    float4 CamRightW    = UniformsAndLights[2];
    float4 CamUpH       = UniformsAndLights[3];
    float4 SkyZenith    = UniformsAndLights[6];
    float4 Meta         = UniformsAndLights[15];

    uint  InspectionMode = uint(Meta.z + 0.5f);
    uint  Flags          = uint(Meta.w + 0.5f);
    float Exposure       = SkyZenith.w;

    float2 Uv     = (float2(Pixel) + 0.5f) / float2(float(Width), float(Height));
    float  NdcX   = (2.0f * Uv.x - 1.0f) * CamFwdAspect.w * CamEyeTan.w;
    float  NdcY   = (1.0f - 2.0f * Uv.y) * CamEyeTan.w;
    float3 RayDir = normalize(CamFwdAspect.xyz + CamRightW.xyz * NdcX + CamUpH.xyz * NdcY);
    float3 EyePos = CamEyeTan.xyz;

    float4 DirectAndTravel = ReservoirBuffer[PixelIdx * 2u + 0u];
    float4 CentreGuide     = ReservoirBuffer[PixelIdx * 2u + 1u];

    float3 FinalHdr = float3(0.0f);

    if (CentreGuide.w < 0.0f)
    {
        ReservoirBuffer[HistBase + PixelIdx]           = CentreGuide;
        AccumulationBuffer[HistBase + PixelIdx * 2u + 0u] = float4(0.0f);
        AccumulationBuffer[HistBase + PixelIdx * 2u + 1u] = float4(0.0f);

        if (InspectionMode == 2u)
        {
            OutputTexture[Pixel] = float4(0.0f, 0.0f, 0.0f, 1.0f);
            return;
        }
        FinalHdr = EvaluateFullSkyAndClouds(EyePos, RayDir, true, Pixel);
        FinalHdr = ApplyHeightFogAndAerial(FinalHdr, EyePos, RayDir, 450.0f, Flags);
    }
    else
    {
        float3         CentreNorm  = DecodeOctahedral(CentreGuide.xy);
        float          CentreDepth = max(CentreGuide.z, 0.05f);
        uint           MatId       = min(uint(CentreGuide.w + 0.5f), 80u);
        MaterialRecord Mat         = Materials[MatId];
        SurfaceSample  Surf        = ProjectSurfaceSample(Mat);
        float3         View        = -RayDir;
        float          NdotV       = max(dot(CentreNorm, View), 1.0e-3f);
        float3         FlakeDummy;
        ApplyMaterialWorkspaceAutomotivePaint(MatId, EyePos + RayDir * CentreDepth, EyePos, CamEyeTan.w, float(Height), View, Surf, FlakeDummy);

        // SVGF 5x5 Edge-Stopping À-Trous Spatial Wavelet Filter (VarianceWavelet.slang)
        static const float kKernel[5] = { 1.0f / 16.0f, 1.0f / 4.0f, 3.0f / 8.0f, 1.0f / 4.0f, 1.0f / 16.0f };
        float4 CentreInd4  = AccumulationBuffer[PixelIdx * 2u + 0u];
        float4 CentreSpec4 = AccumulationBuffer[PixelIdx * 2u + 1u];
        float3 CentreInd   = CentreInd4.rgb;
        float3 CentreSpec  = CentreSpec4.rgb;
        float  CentreLumI  = dot(CentreInd,  float3(0.2126f, 0.7152f, 0.0722f));
        float  CentreLumS  = dot(CentreSpec, float3(0.2126f, 0.7152f, 0.0722f));

        float3 SumInd  = CentreInd  * (9.0f / 64.0f);
        float3 SumSpec = CentreSpec * (9.0f / 64.0f);
        float  WInd    = 9.0f / 64.0f;
        float  WSpec   = 9.0f / 64.0f;

        int2 Limit = int2(int(Width) - 1, int(Height) - 1);
        const int kStep = 2;
        for (int Dy = -2; Dy <= 2; ++Dy)
        {
            for (int Dx = -2; Dx <= 2; ++Dx)
            {
                if (Dx == 0 && Dy == 0)
                {
                    continue;
                }
                int2 TapPix = int2(Pixel) + int2(Dx * kStep, Dy * kStep);
                if (TapPix.x < 0 || TapPix.y < 0 || TapPix.x > Limit.x || TapPix.y > Limit.y)
                {
                    continue;
                }
                uint   TapIdx   = uint(TapPix.y) * Width + uint(TapPix.x);
                float4 TapGuide = ReservoirBuffer[TapIdx * 2u + 1u];
                if (TapGuide.w < 0.0f)
                {
                    continue;
                }

                float3 TapNorm = DecodeOctahedral(TapGuide.xy);
                float  NormDot = max(0.0f, dot(CentreNorm, TapNorm));
                float  NormW   = pow(NormDot, 24.0f);
                float  DepthW  = exp(-abs(CentreDepth - TapGuide.z) / max(0.06f * CentreDepth, 0.02f));
                float  MatW    = (abs(TapGuide.w - CentreGuide.w) < 0.5f) ? 1.0f : 0.25f;
                float  BaseW   = kKernel[Dx + 2] * kKernel[Dy + 2] * NormW * DepthW * MatW;
                if (BaseW <= 1.0e-5f)
                {
                    continue;
                }

                float3 TapInd  = AccumulationBuffer[TapIdx * 2u + 0u].rgb;
                float3 TapSpec = AccumulationBuffer[TapIdx * 2u + 1u].rgb;
                float  LumWI   = exp(-abs(CentreLumI - dot(TapInd,  float3(0.2126f, 0.7152f, 0.0722f))) / 0.95f);
                float  LumWS   = exp(-abs(CentreLumS - dot(TapSpec, float3(0.2126f, 0.7152f, 0.0722f))) / 1.25f);

                float  Wi = BaseW * LumWI;
                float  Ws = BaseW * LumWS;
                SumInd   += TapInd  * Wi;
                SumSpec  += TapSpec * Ws;
                WInd     += Wi;
                WSpec    += Ws;
            }
        }

        float3 FilteredIndirect = SumInd  / max(WInd,  1.0e-5f);
        float3 FilteredSpecular = SumSpec / max(WSpec, 1.0e-5f);

        // Save Wavelet-Denoised history into HistBase for next frame's motion reprojection!
        ReservoirBuffer[HistBase + PixelIdx]              = CentreGuide;
        AccumulationBuffer[HistBase + PixelIdx * 2u + 0u] = float4(FilteredIndirect, 1.0f);
        AccumulationBuffer[HistBase + PixelIdx * 2u + 1u] = float4(FilteredSpecular, CentreSpec4.w);

        if (InspectionMode == 1u)
        {
            OutputTexture[Pixel] = float4(CentreNorm * 0.5f + 0.5f, 1.0f);
            return;
        }
        else if (InspectionMode == 2u)
        {
            float D = saturate(1.0f - log2(1.0f + CentreDepth) / 9.0f);
            OutputTexture[Pixel] = float4(D, D, D, 1.0f);
            return;
        }
        else if (InspectionMode == 3u)
        {
            OutputTexture[Pixel] = float4(sqrt(saturate(Surf.Albedo)), 1.0f);
            return;
        }

        // DisplayRecombination.slang surface energy-conserving recombination
        // For clear-coated automotive paint, Snell refraction at the air->clearcoat (n=1.5) interface bounds the
        // internal cosine above cos(arcsin(1/1.5)) = 0.745, preventing buried metallic flakes from washing out to white at grazing angles.
        float  InternalNdotV   = (Surf.CoatWeight > 0.0f)
                               ? sqrt(max(0.55f, 1.0f - (1.0f - NdotV * NdotV) / 2.25f))
                               : NdotV;
        float3 DiffuseIndirect = ResolveDiffuseAlbedo(Surf) * FilteredIndirect;
        float2 EnvResp         = ResolveEnvironmentResponse(InternalNdotV, Surf.Roughness);
        float  WhiteGrazing    = (Surf.CoatWeight > 0.0f) ? (EnvResp.y * 0.12f) : EnvResp.y;
        float3 SpecColor       = ResolveSpecularColour(Surf);
        float3 SpecIndirect    = FilteredSpecular * (SpecColor * EnvResp.x + WhiteGrazing);

        if (Surf.CoatWeight > 0.0f)
        {
            float2 CoatResp = ResolveEnvironmentResponse(NdotV, Surf.CoatRoughness);
            float  CoatRefl = (0.04f * CoatResp.x + 0.28f * CoatResp.y) * Surf.CoatWeight;
            float3 CoatTint = lerp(float3(1.0f), Surf.Albedo / max(max(Surf.Albedo.r, max(Surf.Albedo.g, Surf.Albedo.b)), 0.1f), 0.45f);
            DiffuseIndirect *= (1.0f - CoatRefl * 0.5f);
            SpecIndirect     = SpecIndirect * (1.0f - CoatRefl * 0.5f) + FilteredSpecular * CoatTint * (CoatRefl * 0.42f);
        }

        if (InspectionMode == 4u)
        {
            FinalHdr = DiffuseIndirect;
        }
        else if (InspectionMode == 5u)
        {
            FinalHdr = SpecIndirect;
        }
        else
        {
            FinalHdr = DirectAndTravel.rgb + DiffuseIndirect + SpecIndirect;
            FinalHdr = ApplyHeightFogAndAerial(FinalHdr, EyePos, RayDir, CentreDepth, Flags);
        }
    }

    if (InspectionMode == 0u)
    {
        FinalHdr = ApplyOpticalLensFlare(FinalHdr, Uv, CamFwdAspect.w, EyePos, Flags);
    }

    float3 Exposed = FinalHdr * Exposure;
    float3 Mapped  = ((Flags & (1u << 12u)) != 0u) ? AcesFilmic(Exposed) : saturate(Exposed);
    float3 Srgb    = pow(saturate(Mapped), float3(1.0f / 2.2f));

    OutputTexture[Pixel] = float4(Srgb, 1.0f);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void EncodeEverestSceneMain(uint3 DispatchId : SV_DispatchThreadID)
{
    uint Width  = uint(UniformsAndLights[2].w + 0.5f);
    uint Height = uint(UniformsAndLights[3].w + 0.5f);
    if (DispatchId.x >= Width || DispatchId.y >= Height)
    {
        return;
    }

    uint PassIndex = uint(UniformsAndLights[14].w + 0.5f);
    if (PassIndex == 0u)
    {
        ExecutePass0Integrate(DispatchId.xy, Width, Height);
    }
    else
    {
        ExecutePass1DenoiseAndPresent(DispatchId.xy, Width, Height);
    }
}
