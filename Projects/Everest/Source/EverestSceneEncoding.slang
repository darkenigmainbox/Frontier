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
//                      PLANETARY ATMOSPHERE, 3D VOLUMETRIC CLOUDS (CloudSynthesis), CELESTIALS & FOG
//                         Ported from arena/5ec53579-frontier (CloudSynthesis.slang / PlanetaryProjection.slang)
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

float3 HashJitter3(int3 Cell, uint Seed)
{
    return float3(
        HashFloat3(Cell, Seed + 11u),
        HashFloat3(Cell, Seed + 37u),
        HashFloat3(Cell, Seed + 79u));
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

    float NX00 = lerp(N000, N100, U.x);
    float NX10 = lerp(N010, N110, U.x);
    float NX01 = lerp(N001, N101, U.x);
    float NX11 = lerp(N011, N111, U.x);
    float NXY0 = lerp(NX00, NX10, U.y);
    float NXY1 = lerp(NX01, NX11, U.y);
    return lerp(NXY0, NXY1, U.z);
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

float WorleyInverted3D(float3 P, uint Seed)
{
    int3   Base = int3(floor(P));
    float  MinD = 4.0f;
    for (int Dz = -1; Dz <= 1; ++Dz)
    {
        for (int Dy = -1; Dy <= 1; ++Dy)
        {
            for (int Dx = -1; Dx <= 1; ++Dx)
            {
                int3   Cell = Base + int3(Dx, Dy, Dz);
                float3 Pos  = float3(Cell) + HashJitter3(Cell, Seed);
                float3 Diff = Pos - P;
                MinD        = min(MinD, dot(Diff, Diff));
            }
        }
    }
    return saturate(1.0f - sqrt(MinD));
}

float HenyeyGreensteinPhase(float CosTheta, float G)
{
    float G2    = G * G;
    float Denom = max(1.0f + G2 - 2.0f * G * CosTheta, 1.0e-4f);
    return (1.0f - G2) / (4.0f * π * Denom * sqrt(Denom));
}

float DualLobeCloudPhase(float CosTheta)
{
    return lerp(HenyeyGreensteinPhase(CosTheta, 0.76f), HenyeyGreensteinPhase(CosTheta, -0.28f), 0.28f);
}

float EvaluateCloudDensity3D(float3 WorldPosZUp, float BaseAltM, float TopAltM, float Coverage, float TimeSec)
{
    float Thickness = max(TopAltM - BaseAltM, 100.0f);
    float H         = saturate((WorldPosZUp.z - BaseAltM) / Thickness);
    float Envelope  = smoothstep(0.0f, 0.14f, H) * smoothstep(1.0f, 0.66f, H);
    if (Envelope <= 1.0e-4f)
    {
        return 0.0f;
    }

    float3 WindAdvected = float3(WorldPosZUp.x + TimeSec * 14.0f, WorldPosZUp.z, WorldPosZUp.y + TimeSec * 5.5f);
    float  SpatialFreq  = 4.2e-4f;
    float3 SampleCoord  = WindAdvected * float3(SpatialFreq, SpatialFreq * 1.35f, SpatialFreq);

    float MacroFbm    = FbmRotated3D(SampleCoord, 4, 17u);
    float MacroWorley = WorleyInverted3D(RotateOctave3D(SampleCoord) * 1.75f, 53u);
    float MacroShape  = 0.58f * MacroFbm + 0.42f * MacroWorley;

    float Threshold = 1.0f - clamp(Coverage * 0.78f + 0.16f, 0.10f, 0.92f);
    float Remapped  = saturate((MacroShape - Threshold) / max(1.0f - Threshold, 1.0e-3f)) * Envelope;
    if (Remapped <= 1.0e-4f)
    {
        return 0.0f;
    }

    float3 DetailCoord = RotateOctave3D(SampleCoord * 4.6f);
    float  DetailField = 0.65f * WorleyInverted3D(DetailCoord, 131u) +
                         0.35f * FbmRotated3D(DetailCoord * 2.0f, 2, 257u);
    float  Erosion     = 0.32f * (1.0f - DetailField) * (1.0f - 0.50f * H);
    return saturate((Remapped - Erosion) / 0.84f);
}

float SampleCloudGroundShadow(float3 WorldPos, float3 SunDir, uint Flags)
{
    if ((Flags & (1u << 3u)) == 0u || SunDir.z <= 0.05f)
    {
        return 1.0f;
    }
    float4 CloudU = UniformsAndLights[8];
    if (CloudU.x <= 0.01f)
    {
        return 1.0f;
    }
    float  T       = (CloudU.y + 0.35f * (CloudU.z - CloudU.y) - WorldPos.z) / max(SunDir.z, 0.05f);
    float3 CloudPt = WorldPos + SunDir * T;
    float  TimeSec = UniformsAndLights[11].w;
    float  Density = EvaluateCloudDensity3D(CloudPt, CloudU.y, CloudU.z, CloudU.x, TimeSec);
    return lerp(1.0f, exp(-Density * 1.35f), saturate(CloudU.x));
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
    float4 SunDirRadius = UniformsAndLights[4];
    float4 SunRadDay    = UniformsAndLights[5];
    float4 SkyZenith    = UniformsAndLights[6];
    float4 SkyHorizon   = UniformsAndLights[7];
    float4 CloudU       = UniformsAndLights[8];
    float4 Moon1        = UniformsAndLights[12];
    float4 Moon2        = UniformsAndLights[13];
    float4 Stars        = UniformsAndLights[14];
    uint   Flags        = uint(UniformsAndLights[15].w + 0.5f);
    float  TimeSec      = UniformsAndLights[11].w;

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

        if ((Flags & (1u << 6u)) != 0u)
        {
            float3 MoonDir    = Moon1.xyz;
            float  MoonRadius = 0.022f;
            float  CosMoon    = dot(RayDir, MoonDir);
            float  CosEdge    = cos(MoonRadius);
            if (CosMoon >= CosEdge)
            {
                float3 UpRef     = (abs(MoonDir.z) < 0.9f) ? float3(0.0f, 0.0f, 1.0f) : float3(1.0f, 0.0f, 0.0f);
                float3 MoonRight = normalize(cross(MoonDir, UpRef));
                float3 MoonUp    = cross(MoonRight, MoonDir);
                float  DiscX     = dot(RayDir, MoonRight) / sin(MoonRadius);
                float  DiscY     = dot(RayDir, MoonUp)    / sin(MoonRadius);
                float  R2        = DiscX * DiscX + DiscY * DiscY;
                if (R2 <= 1.0f)
                {
                    float  DiscZ      = sqrt(max(0.0f, 1.0f - R2));
                    float3 SphereNorm = normalize(MoonRight * DiscX + MoonUp * DiscY - MoonDir * DiscZ);
                    float  Mu         = max(DiscZ, 0.05f);
                    float  Mu0        = max(0.0f, dot(SphereNorm, SunDir));
                    float  Lommel     = (Mu0 > 0.0f) ? (2.0f * Mu0 / max(Mu0 + Mu, 1.0e-3f)) : 0.0f;
                    float  Maria      = FbmRotated3D(SphereNorm * 3.8f, 3, 503u);
                    float  Albedo     = lerp(0.52f, 0.94f, smoothstep(0.38f, 0.64f, Maria));
                    float  Lit        = max(Lommel, 0.08f + Moon2.w * 2.5f) * Albedo * max(0.35f, Moon1.w * 4.5f);
                    float  LimbEdge   = smoothstep(1.0f, 0.88f, sqrt(R2));
                    Sky               = lerp(Sky, float3(0.94f, 0.95f, 1.0f) * Lit, LimbEdge);
                }
            }
        }

        if ((Flags & (1u << 7u)) != 0u)
        {
            float3 PlanetDir = Moon2.xyz;
            float  CosP      = dot(RayDir, PlanetDir);
            if (CosP > cos(0.032f))
            {
                float3 UpRef  = (abs(PlanetDir.z) < 0.9f) ? float3(0.0f, 0.0f, 1.0f) : float3(1.0f, 0.0f, 0.0f);
                float3 PRight = normalize(cross(PlanetDir, UpRef));
                float3 PUp    = cross(PRight, PlanetDir);
                float  Px     = dot(RayDir, PRight) / 0.011f;
                float  Py     = dot(RayDir, PUp)    / 0.011f;
                float  PR2    = Px * Px + Py * Py;
                if (PR2 <= 1.0f)
                {
                    float  Pz   = sqrt(max(0.0f, 1.0f - PR2));
                    float3 PNor = normalize(PRight * Px + PUp * Py - PlanetDir * Pz);
                    float  PLit = max(0.12f, dot(PNor, SunDir));
                    Sky         = lerp(Sky, float3(0.68f, 0.84f, 1.0f) * PLit * 1.4f, smoothstep(1.0f, 0.86f, sqrt(PR2)));
                }
                else
                {
                    float RingR = sqrt(Px * Px + (Py * 2.4f) * (Py * 2.4f));
                    if (RingR >= 1.35f && RingR <= 2.35f)
                    {
                        float Band = 0.55f + 0.45f * sin(RingR * 18.0f);
                        Sky       += float3(0.72f, 0.82f, 0.96f) * Band * 0.38f;
                    }
                }
            }
        }
    }

    if (IncludeSunDisc && (Flags & (1u << 0u)) != 0u && SunDir.z > -0.05f)
    {
        float CosSun    = dot(RayDir, SunDir);
        float CosRadius = cos(max(0.00465f, SunDirRadius.w));
        if (CosSun >= CosRadius)
        {
            float Sin2 = max(0.0f, 1.0f - CosSun * CosSun);
            float SinR = sin(max(0.00465f, SunDirRadius.w));
            float Mu   = sqrt(max(0.0f, 1.0f - saturate(Sin2 / max(SinR * SinR, 1.0e-6f))));
            float Limb = 1.0f - 0.52f * (1.0f - pow(Mu, 0.65f));
            Sky       += SunRadDay.xyz * (24.0f * Limb);
        }
        else if (CosSun > 0.996f)
        {
            float Halo = pow(saturate((CosSun - 0.996f) / (1.0f - 0.996f)), 3.0f);
            Sky       += SunRadDay.xyz * (Halo * 2.6f);
        }
    }

    if ((Flags & (1u << 3u)) != 0u && RayDir.z > 0.015f && CloudU.x > 0.01f)
    {
        float BaseM     = CloudU.y;
        float TopM      = CloudU.z;
        float TStart    = max(0.0f, (BaseM - RayOrigin.z) / RayDir.z);
        float TEnd      = max(TStart, (TopM - RayOrigin.z) / RayDir.z);
        float MarchSpan = min(TEnd - TStart, 8500.0f);
        if (MarchSpan > 1.0f && TStart < 34000.0f)
        {
            const int kSteps     = 12;
            float     StepLen    = MarchSpan / float(kSteps);
            float     Trans      = 1.0f;
            float3    InScatter  = float3(0.0f);
            float     CosSunView = dot(RayDir, SunDir);
            float     Phase      = DualLobeCloudPhase(CosSunView);
            float3    SunColor   = max(SunRadDay.xyz * 2.4f, float3(1.65f, 1.58f, 1.48f));
            float3    AmbientTop = float3(0.76f, 0.86f, 1.02f) * max(0.35f, Daylight);
            float3    AmbientBot = float3(0.32f, 0.38f, 0.48f) * max(0.25f, Daylight);

            for (int S = 0; S < kSteps; ++S)
            {
                if (Trans < 0.02f)
                {
                    break;
                }
                float  CurT    = TStart + (float(S) + 0.5f) * StepLen;
                float3 SampleP = RayOrigin + RayDir * CurT;
                float  Dens    = EvaluateCloudDensity3D(SampleP, BaseM, TopM, CloudU.x, TimeSec);
                if (Dens > 1.0e-4f)
                {
                    float HFrac      = saturate((SampleP.z - BaseM) / max(TopM - BaseM, 100.0f));
                    float SunDens1   = EvaluateCloudDensity3D(SampleP + SunDir * 160.0f, BaseM, TopM, CloudU.x, TimeSec);
                    float SunDens2   = EvaluateCloudDensity3D(SampleP + SunDir * 420.0f, BaseM, TopM, CloudU.x, TimeSec);
                    float OpticalSun = (Dens * 0.35f + SunDens1 * 0.45f + SunDens2 * 0.55f) * 1.85f;

                    float  Beer      = exp(-OpticalSun) + 0.45f * exp(-0.30f * OpticalSun);
                    float  Powder    = 1.0f - 0.50f * exp(-Dens * 3.8f);
                    float3 Direct    = SunColor * (Beer * Powder * (0.65f + 1.45f * Phase));
                    float3 Amb       = lerp(AmbientBot, AmbientTop, HFrac);
                    float3 Lum       = Direct + Amb;

                    float SigmaE    = Dens * CloudU.w * 0.36f;
                    float StepTrans = exp(-SigmaE * StepLen);
                    InScatter      += Trans * (1.0f - StepTrans) * Lum;
                    Trans          *= StepTrans;
                }
            }
            float HorizonFade = smoothstep(0.015f, 0.12f, RayDir.z);
            InScatter         = lerp(Sky * (1.0f - Trans), InScatter, HorizonFade);
            Sky               = Sky * Trans + InScatter;
        }
    }

    return Sky;
}

float3 EvaluateAutomotiveFlakeGlint(float3 WorldPos, float3 Normal, float3 ViewDir, float3 LightDir, SurfaceSample Surf)
{
    if (Surf.FlakeCoverage <= 0.01f)
    {
        return float3(0.0f);
    }
    float3 HalfVec    = normalize(ViewDir + LightDir);
    float3 FlakeCoord = RotateOctave3D(WorldPos * 42.0f);
    float  CellA      = WorleyInverted3D(FlakeCoord, 313u);
    float  CellB      = WorleyInverted3D(RotateOctave3D(FlakeCoord * 2.15f), 619u);
    float  Sparkle    = smoothstep(1.0f - Surf.FlakeCoverage * 0.55f, 1.0f, 0.55f * CellA + 0.45f * CellB);
    float  NdotH      = max(0.0f, dot(Normal, HalfVec));
    float  SpecLobe   = pow(NdotH, 18.0f);
    return Surf.FlakeTint * (Sparkle * SpecLobe * 0.85f);
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
    float4 Fog1      = UniformsAndLights[10];
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
    float3 FogColor   = Fog1.xyz + SunRadDay.xyz * MieForward * 0.08f + float3(0.04f, 0.06f, 0.10f) * Moon1.w;
    return Radiance * Trans + FogColor * (1.0f - Trans);
}

float3 ApplyOpticalLensFlare(float3 Radiance, float2 Uv, float Aspect, uint Flags)
{
    if ((Flags & (1u << 5u)) == 0u)
    {
        return Radiance;
    }
    float4 Flare0    = UniformsAndLights[10];
    float4 Flare1    = UniformsAndLights[11];
    float  Intensity = Flare0.w;
    if (Intensity <= 1.0e-4f)
    {
        return Radiance;
    }

    float2 SunNdc    = Flare1.xy;
    float  Blades    = max(4.0f, Flare1.z);
    float2 PixelNdc  = float2(Uv.x * 2.0f - 1.0f, 1.0f - 2.0f * Uv.y);
    float2 Delta     = float2((PixelNdc.x - SunNdc.x) * Aspect, PixelNdc.y - SunNdc.y);
    float  Dist      = length(Delta);
    float  Angle     = atan2(Delta.y, Delta.x);
    float  Starburst = pow(max(0.0f, cos(Angle * Blades * 0.5f)), 10.0f) * exp(-Dist * 5.0f);
    float  HaloRing  = exp(-pow((Dist - 0.34f) / 0.045f, 2.0f)) * 0.25f;
    float  Glare     = (0.045f / (Dist * Dist + 0.020f)) + 0.35f * Starburst + HaloRing;

    static const float  kGhostScales[6] = { -0.35f, -0.78f, -1.22f, 0.48f, -1.68f, 0.22f };
    static const float  kGhostRadii[6]  = {  0.075f, 0.130f, 0.055f, 0.180f, 0.240f, 0.042f };
    static const float3 kGhostTints[6]  = {
        float3(1.00f, 0.52f, 0.28f),
        float3(0.32f, 0.86f, 1.00f),
        float3(0.75f, 0.42f, 1.00f),
        float3(0.38f, 1.00f, 0.62f),
        float3(1.00f, 0.80f, 0.36f),
        float3(0.48f, 0.66f, 1.00f)
    };

    float3 GhostSum = float3(0.0f);
    for (int G = 0; G < 6; ++G)
    {
        float2 GCenter = SunNdc * kGhostScales[G];
        float2 GDelta  = float2((PixelNdc.x - GCenter.x) * Aspect, PixelNdc.y - GCenter.y);
        float  GR      = length(GDelta) / kGhostRadii[G];
        if (GR < 1.0f)
        {
            float Ring = smoothstep(1.0f, 0.25f, GR) * (0.45f + 0.55f * smoothstep(0.45f, 0.92f, GR));
            GhostSum  += kGhostTints[G] * Ring * 0.16f;
        }
    }

    return Radiance + (float3(1.0f, 0.86f, 0.64f) * (Glare * 0.12f) + GhostSum) * Intensity;
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
                float3 Brdf  = ResolveDirectReflectance(Surf, Norm, View, SunDir);
                float3 Flake = EvaluateAutomotiveFlakeGlint(Primary.Position, Norm, View, SunDir, Surf);
                Direct      += SunRadDay.xyz * ShadowVis * (Brdf + Flake * NdotL);
            }
        }
    }

    Direct += EvaluateSceneLights(Primary.Position, Norm, View, Surf);

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
        float3 DiffuseIndirect = ResolveDiffuseAlbedo(Surf) * FilteredIndirect;
        float2 EnvResp         = ResolveEnvironmentResponse(NdotV, Surf.Roughness);
        float3 SpecColor       = ResolveSpecularColour(Surf);
        float3 SpecIndirect    = FilteredSpecular * (SpecColor * EnvResp.x + EnvResp.y);

        if (Surf.CoatWeight > 0.0f)
        {
            float2 CoatResp = ResolveEnvironmentResponse(NdotV, Surf.CoatRoughness);
            float  CoatRefl = (0.04f * CoatResp.x + CoatResp.y) * Surf.CoatWeight;
            DiffuseIndirect *= (1.0f - CoatRefl);
            SpecIndirect     = SpecIndirect * (1.0f - CoatRefl) + FilteredSpecular * CoatRefl;
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
        FinalHdr = ApplyOpticalLensFlare(FinalHdr, Uv, CamFwdAspect.w, Flags);
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
