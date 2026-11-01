//==========================================================================================================================================
//                                                     EVEREST SCENE ENCODING (GPU)
//                                     ------------------------------------------------------------------
//                 GPU Vulkan compute encoder for Project Everest: Two-Level BVH raytracing, ReSTIR GI temporal +
//                 spatial reservoir reuse, SVGF variance filtering, ScatteringSequence + AutomotivePaint metallic
//                 flake BSDF evaluation, 16x16x4 clustered point/street lights, and coupled PlanetaryAtmosphere
//                 (Sky-View LUT, Twilight Arch, Solar Disc, Volumetric Clouds, Height Fog, Optical Flare, Moons, Stars).
//==========================================================================================================================================

#include "SceneRecords.slang"
#include "PackingCodec.slang"
#include "DiscrepancySequence.slang"
#include "SurfaceReflectance.slang"

struct BvhNode
{
    float3 Minimum;
    uint   LeftOrFirst;
    float3 Maximum;
    uint   CountOrInstance;
};

struct EverestGpuOccupant
{
    column_major float4x4 LocalToWorld;
    column_major float4x4 WorldToLocal;
    uint                  Roles;
    uint                  MaterialOverride;
    uint                  Pad0;
    uint                  Pad1;
};

[[vk::binding(0, 0)]] StructuredBuffer<BvhNode>            BvhNodes;
[[vk::binding(1, 0)]] StructuredBuffer<float4>             BlasTriangles;
[[vk::binding(2, 0)]] StructuredBuffer<EverestGpuOccupant> Occupants;
[[vk::binding(3, 0)]] StructuredBuffer<MaterialRecord>     Materials;
[[vk::binding(4, 0)]] StructuredBuffer<float4>             UniformsAndLights;
[[vk::binding(5, 0)]] StructuredBuffer<float4>             SkyLutBuffer;
[[vk::binding(6, 0)]] RWStructuredBuffer<float4>           ReservoirBuffer;
[[vk::binding(7, 0)]] RWStructuredBuffer<float4>           AccumulationBuffer;
[[vk::binding(8, 0)]] [[vk::image_format("rgba8")]] RWTexture2D<float4> OutputTexture;

static const uint TlasLeafBit        = 0x80000000u;
static const uint TlasIndexMask      = 0x7FFFFFFFu;
static const uint EmptyTlasSentinel  = 0x7FFFFFFFu;
static const uint VehicleGlassFamily = 2u;

static const uint FlagSolarEnabled      = 1u << 0u;
static const uint FlagRaytracedShadow   = 1u << 1u;
static const uint FlagAtmosphereEnabled = 1u << 2u;
static const uint FlagCloudsEnabled     = 1u << 3u;
static const uint FlagFogEnabled        = 1u << 4u;
static const uint FlagFlareEnabled      = 1u << 5u;
static const uint FlagMoonEnabled       = 1u << 6u;
static const uint FlagSecondaryMoon     = 1u << 7u;
static const uint FlagStarsEnabled      = 1u << 8u;
static const uint FlagGlobalIllum       = 1u << 9u;
static const uint FlagReflections       = 1u << 10u;
static const uint FlagTemporalReuse     = 1u << 11u;
static const uint FlagAcesTonemap       = 1u << 12u;

struct GpuRayHit
{
    float3 Position;
    float  Travel;
    float3 Normal;
    uint   Occupant;
    uint   Family;
    bool   Hit;
};

float3 SafeRecipDir(float3 D)
{
    return float3(
        abs(D.x) < 1.0e-8f ? 1.0e8f : (1.0f / D.x),
        abs(D.y) < 1.0e-8f ? 1.0e8f : (1.0f / D.y),
        abs(D.z) < 1.0e-8f ? 1.0e8f : (1.0f / D.z));
}

float IntersectNodeAabb(float3 Orig, float3 Recip, BvhNode Node, float Limit)
{
    float3 T0    = (Node.Minimum - Orig) * Recip;
    float3 T1    = (Node.Maximum - Orig) * Recip;
    float3 Near  = min(T0, T1);
    float3 Far   = max(T0, T1);
    float  Entry = max(max(Near.x, Near.y), max(Near.z, 0.0f));
    float  Exit  = min(min(Far.x, Far.y), min(Far.z, Limit));
    return (Entry <= Exit) ? Entry : 1.0e30f;
}

GpuRayHit TraceSceneRayGpu(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    GpuRayHit Result;
    Result.Position = Origin + Direction * MaxT;
    Result.Travel   = MaxT;
    Result.Normal   = -Direction;
    Result.Occupant = 0xFFFFFFFFu;
    Result.Family   = 0u;
    Result.Hit      = false;

    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return Result;
    }

    float3 WorldRecip = SafeRecipDir(Direction);
    uint   Stack[48];
    uint   Depth     = 1u;
    Stack[0]         = 0u;
    uint   BlasFloor = 0xFFFFFFFFu;

    uint   CurrentOcc  = 0u;
    uint   OccOverride = NoMaterialOverride;
    float3 LocalOrigin = Origin;
    float3 LocalDir    = Direction;
    float3 LocalRecip  = WorldRecip;

    uint Steps = 0u;
    while (Depth > 0u && Steps < 512u)
    {
        if (Depth <= BlasFloor)
        {
            BlasFloor = 0xFFFFFFFFu;
        }

        Depth--;
        uint    CellIdx     = Stack[Depth];
        BvhNode Node        = BvhNodes[CellIdx];
        uint    LeftOrFirst = Node.LeftOrFirst;
        uint    Count       = Node.CountOrInstance;
        Steps++;

        if (BlasFloor == 0xFFFFFFFFu)
        {
            if (IntersectNodeAabb(Origin, WorldRecip, Node, Result.Travel) >= Result.Travel)
            {
                continue;
            }
            if ((Count & TlasLeafBit) != 0u)
            {
                CurrentOcc             = Count & TlasIndexMask;
                EverestGpuOccupant Occ = Occupants[CurrentOcc];
                OccOverride            = Occ.MaterialOverride;
                LocalOrigin            = MulMat4Point(Occ.WorldToLocal, Origin);
                LocalDir               = MulMat4Vec(Occ.WorldToLocal, Direction);
                LocalRecip             = SafeRecipDir(LocalDir);
                BlasFloor              = Depth;
                if (Depth < 47u)
                {
                    Stack[Depth] = LeftOrFirst;
                    Depth++;
                }
            }
            else
            {
                uint  Left  = LeftOrFirst;
                uint  Right = LeftOrFirst + 1u;
                float LDist = IntersectNodeAabb(Origin, WorldRecip, BvhNodes[Left],  Result.Travel);
                float RDist = IntersectNodeAabb(Origin, WorldRecip, BvhNodes[Right], Result.Travel);
                if (LDist < RDist)
                {
                    if (RDist < Result.Travel && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                    if (LDist < Result.Travel && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
                }
                else
                {
                    if (LDist < Result.Travel && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
                    if (RDist < Result.Travel && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                }
            }
        }
        else
        {
            if (IntersectNodeAabb(LocalOrigin, LocalRecip, Node, Result.Travel) >= Result.Travel)
            {
                continue;
            }
            if (Count > 0u)
            {
                for (uint Tri = LeftOrFirst; Tri < LeftOrFirst + Count; Tri++)
                {
                    uint   TBase  = Tri * 4u;
                    float4 V0     = BlasTriangles[TBase + 0u];
                    uint   RawFam = asuint(V0.w);
                    if (RawFam == VehicleGlassFamily)
                    {
                        continue;
                    }
                    float4 V1  = BlasTriangles[TBase + 1u];
                    float4 V2  = BlasTriangles[TBase + 2u];
                    float3 A   = V0.xyz;
                    float3 E1  = V1.xyz;
                    float3 E2  = V2.xyz;
                    float3 H   = cross(LocalDir, E2);
                    float  Det = dot(E1, H);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 S      = LocalOrigin - A;
                    float  U      = dot(S, H) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 Q = cross(S, E1);
                    float  V = dot(LocalDir, Q) * InvDet;
                    if (V < 0.0f || U + V > 1.0f)
                    {
                        continue;
                    }
                    float HitT = dot(E2, Q) * InvDet;
                    if (HitT > MinT && HitT < Result.Travel)
                    {
                        float4 V3     = BlasTriangles[TBase + 3u];
                        float3 NA     = UnpackOctahedral(asuint(V1.w));
                        float3 NB     = UnpackOctahedral(asuint(V2.w));
                        float3 NC     = UnpackOctahedral(asuint(V3.w));
                        float3 LocalN = normalize(NA * (1.0f - U - V) + NB * U + NC * V);

                        EverestGpuOccupant Occ    = Occupants[CurrentOcc];
                        float3             WorldN = normalize(MulMat4Vec(Occ.LocalToWorld, LocalN));
                        if (dot(WorldN, Direction) > 0.0f)
                        {
                            WorldN = -WorldN;
                        }

                        Result.Travel   = HitT;
                        Result.Position = Origin + Direction * HitT;
                        Result.Normal   = WorldN;
                        Result.Occupant = CurrentOcc;
                        Result.Family   = (OccOverride == NoMaterialOverride) ? RawFam : OccOverride;
                        Result.Hit      = true;
                    }
                }
            }
            else
            {
                uint  Left  = LeftOrFirst;
                uint  Right = LeftOrFirst + 1u;
                float LDist = IntersectNodeAabb(LocalOrigin, LocalRecip, BvhNodes[Left],  Result.Travel);
                float RDist = IntersectNodeAabb(LocalOrigin, LocalRecip, BvhNodes[Right], Result.Travel);
                if (LDist < RDist)
                {
                    if (RDist < Result.Travel && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                    if (LDist < Result.Travel && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
                }
                else
                {
                    if (LDist < Result.Travel && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
                    if (RDist < Result.Travel && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                }
            }
        }
    }

    return Result;
}

bool TraceVisibilityRayGpu(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return false;
    }

    float3 WorldRecip = SafeRecipDir(Direction);
    uint   Stack[48];
    uint   Depth     = 1u;
    Stack[0]         = 0u;
    uint   BlasFloor = 0xFFFFFFFFu;

    uint   CurrentOcc  = 0u;
    float3 LocalOrigin = Origin;
    float3 LocalDir    = Direction;
    float3 LocalRecip  = WorldRecip;

    uint Steps = 0u;
    while (Depth > 0u && Steps < 320u)
    {
        if (Depth <= BlasFloor)
        {
            BlasFloor = 0xFFFFFFFFu;
        }

        Depth--;
        uint    CellIdx     = Stack[Depth];
        BvhNode Node        = BvhNodes[CellIdx];
        uint    LeftOrFirst = Node.LeftOrFirst;
        uint    Count       = Node.CountOrInstance;
        Steps++;

        if (BlasFloor == 0xFFFFFFFFu)
        {
            if (IntersectNodeAabb(Origin, WorldRecip, Node, MaxT) >= MaxT)
            {
                continue;
            }
            if ((Count & TlasLeafBit) != 0u)
            {
                CurrentOcc             = Count & TlasIndexMask;
                EverestGpuOccupant Occ = Occupants[CurrentOcc];
                LocalOrigin            = MulMat4Point(Occ.WorldToLocal, Origin);
                LocalDir               = MulMat4Vec(Occ.WorldToLocal, Direction);
                LocalRecip             = SafeRecipDir(LocalDir);
                BlasFloor              = Depth;
                if (Depth < 47u)
                {
                    Stack[Depth] = LeftOrFirst;
                    Depth++;
                }
            }
            else
            {
                uint Left  = LeftOrFirst;
                uint Right = LeftOrFirst + 1u;
                if (IntersectNodeAabb(Origin, WorldRecip, BvhNodes[Right], MaxT) < MaxT && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                if (IntersectNodeAabb(Origin, WorldRecip, BvhNodes[Left],  MaxT) < MaxT && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
            }
        }
        else
        {
            if (IntersectNodeAabb(LocalOrigin, LocalRecip, Node, MaxT) >= MaxT)
            {
                continue;
            }
            if (Count > 0u)
            {
                for (uint Tri = LeftOrFirst; Tri < LeftOrFirst + Count; Tri++)
                {
                    uint   TBase  = Tri * 4u;
                    float4 V0     = BlasTriangles[TBase + 0u];
                    uint   RawFam = asuint(V0.w);
                    if (RawFam == VehicleGlassFamily)
                    {
                        continue;
                    }
                    float4 V1  = BlasTriangles[TBase + 1u];
                    float4 V2  = BlasTriangles[TBase + 2u];
                    float3 A   = V0.xyz;
                    float3 E1  = V1.xyz;
                    float3 E2  = V2.xyz;
                    float3 H   = cross(LocalDir, E2);
                    float  Det = dot(E1, H);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 S      = LocalOrigin - A;
                    float  U      = dot(S, H) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 Q = cross(S, E1);
                    float  V = dot(LocalDir, Q) * InvDet;
                    if (V < 0.0f || U + V > 1.0f)
                    {
                        continue;
                    }
                    float HitT = dot(E2, Q) * InvDet;
                    if (HitT > MinT && HitT < MaxT)
                    {
                        return true;
                    }
                }
            }
            else
            {
                uint Left  = LeftOrFirst;
                uint Right = LeftOrFirst + 1u;
                if (IntersectNodeAabb(LocalOrigin, LocalRecip, BvhNodes[Right], MaxT) < MaxT && Depth < 47u) { Stack[Depth] = Right; Depth++; }
                if (IntersectNodeAabb(LocalOrigin, LocalRecip, BvhNodes[Left],  MaxT) < MaxT && Depth < 47u) { Stack[Depth] = Left;  Depth++; }
            }
        }
    }

    return false;
}

float3 SampleSkyLutGpu(float3 RayDir, float3 SunDir, float3 SunRadiance, uint Flags)
{
    if ((Flags & FlagAtmosphereEnabled) == 0u)
    {
        float Zenith = clamp(RayDir.z, 0.0f, 1.0f);
        return float3(
            0.52f * (1.0f - Zenith) + 0.12f * Zenith,
            0.64f * (1.0f - Zenith) + 0.26f * Zenith,
            0.82f * (1.0f - Zenith) + 0.58f * Zenith);
    }

    float Azimuth = atan2(RayDir.x, RayDir.y);
    if (Azimuth < 0.0f)
    {
        Azimuth += 2.0f * Pi;
    }
    float U              = clamp(Azimuth / (2.0f * Pi), 0.0f, 1.0f);
    float SinElev        = clamp(RayDir.z, -1.0f, 1.0f);
    float NormalizedElev = asin(SinElev) / (0.5f * Pi);
    float SignedSq       = (NormalizedElev >= 0.0f ? 1.0f : -1.0f) * sqrt(abs(NormalizedElev));
    float V              = clamp(0.5f + 0.5f * SignedSq, 0.0f, 1.0f);

    float ScaledX = U * 96.0f;
    float ScaledY = clamp(V * 54.0f - 0.5f, 0.0f, 53.0f);
    uint  X0      = uint(floor(ScaledX)) % 96u;
    uint  X1      = (X0 + 1u) % 96u;
    uint  Y0      = uint(ScaledY);
    uint  Y1      = min(Y0 + 1u, 53u);
    float Tx      = ScaledX - floor(ScaledX);
    float Ty      = ScaledY - float(Y0);

    float3 C00 = SkyLutBuffer[Y0 * 96u + X0].xyz;
    float3 C10 = SkyLutBuffer[Y0 * 96u + X1].xyz;
    float3 C01 = SkyLutBuffer[Y1 * 96u + X0].xyz;
    float3 C11 = SkyLutBuffer[Y1 * 96u + X1].xyz;
    return lerp(lerp(C00, C10, Tx), lerp(C01, C11, Tx), Ty);
}

float EvaluateProceduralCloudDensity(float3 WorldPos, float4 CloudParams)
{
    float Coverage = CloudParams.x;
    float LowerM   = CloudParams.y;
    float TopM     = CloudParams.z;
    if (WorldPos.z < LowerM || WorldPos.z > TopM || Coverage <= 0.01f)
    {
        return 0.0f;
    }
    float H        = clamp((WorldPos.z - LowerM) / max(1.0f, TopM - LowerM), 0.0f, 1.0f);
    float AltShape = 4.0f * H * (1.0f - H);
    float2 P       = WorldPos.xy * 0.00045f;
    float  N0      = 0.5f + 0.5f * sin(P.x * 3.1f + cos(P.y * 2.7f));
    float  N1      = 0.5f + 0.5f * cos(P.x * 6.3f - sin(P.y * 5.9f));
    float  N2      = 0.5f + 0.5f * sin((P.x + P.y) * 11.7f);
    float  Field   = 0.55f * N0 + 0.30f * N1 + 0.15f * N2;
    float  Thresh  = 1.0f - Coverage * 0.88f;
    return clamp((Field - Thresh) / max(1.0f - Thresh, 1.0e-3f), 0.0f, 1.0f) * AltShape * CloudParams.w;
}

uint HashCell3D(int3 C)
{
    uint H = uint(C.x * 73856093) ^ uint(C.y * 19349663) ^ uint(C.z * 83492791);
    H ^= H >> 16u;
    H *= 0x7feb352du;
    H ^= H >> 15u;
    H *= 0x846ca68bu;
    H ^= H >> 16u;
    return H;
}

float3 EvaluateDirectLightingAtPoint(float3 Pos, float3 Normal, float3 ViewDir, uint Family, float3 SunDir, float3 SunRad, uint Flags, uint LightCount)
{
    MaterialRecord RawMat  = Materials[min(Family, 80u)];
    SurfaceSample  Surface = ProjectSurfaceSample(RawMat);
    float3         Direct  = Surface.Emission;

    if ((Flags & FlagSolarEnabled) != 0u && SunDir.z > 0.0f && dot(Normal, SunDir) > 0.0f)
    {
        bool InShadow = false;
        if ((Flags & FlagRaytracedShadow) != 0u)
        {
            InShadow = TraceVisibilityRayGpu(Pos + Normal * 0.02f, SunDir, 0.01f, 300.0f);
        }
        if (!InShadow)
        {
            Direct += ResolveDirectReflectance(Surface, Normal, ViewDir, SunDir) * SunRad * 2.25f;
        }
    }

    for (uint L = 0u; L < LightCount; L++)
    {
        float4 PosRad  = UniformsAndLights[16u + L * 2u + 0u];
        float4 FluxPad = UniformsAndLights[16u + L * 2u + 1u];
        float3 ToLight = PosRad.xyz - Pos;
        float  DistSq  = dot(ToLight, ToLight);
        float  Radius  = max(0.5f, PosRad.w);
        if (DistSq < Radius * Radius)
        {
            float  Dist = sqrt(max(DistSq, 1.0e-4f));
            float3 LDir = ToLight / Dist;
            if (dot(Normal, LDir) > 0.0f)
            {
                float Ratio  = Dist / Radius;
                float Window = max(0.0f, 1.0f - Ratio * Ratio * Ratio * Ratio);
                float Atten  = (Window * Window) / (DistSq + 1.0f);
                Direct += ResolveDirectReflectance(Surface, Normal, ViewDir, LDir) * FluxPad.xyz * Atten;
            }
        }
    }

    return Direct;
}

[shader("compute")]
[numthreads(8, 8, 1)]
void EncodeEverestSceneMain(uint3 DispatchThreadId : SV_DispatchThreadID)
{
    float4 EyeAndTan      = UniformsAndLights[0u];
    float4 ForwardAndAsp  = UniformsAndLights[1u];
    float4 RightAndWidth  = UniformsAndLights[2u];
    float4 UpAndHeight    = UniformsAndLights[3u];

    uint Width  = uint(RightAndWidth.w);
    uint Height = uint(UpAndHeight.w);
    if (DispatchThreadId.x >= Width || DispatchThreadId.y >= Height)
    {
        return;
    }

    float4 SunDirAndRad   = UniformsAndLights[4u];
    float4 SunRadAndDay   = UniformsAndLights[5u];
    float4 SkyZenAndExp   = UniformsAndLights[6u];
    float4 SkyHorAndLts   = UniformsAndLights[7u];
    float4 CloudParams    = UniformsAndLights[8u];
    float4 FogParams      = UniformsAndLights[9u];
    float4 FogColAndFlare = UniformsAndLights[10u];
    float4 FlareScreen    = UniformsAndLights[11u];
    float4 MoonPrimary    = UniformsAndLights[12u];
    float4 MoonSecondary  = UniformsAndLights[13u];
    float4 StarParams     = UniformsAndLights[14u];
    float4 FrameAndFlags  = UniformsAndLights[15u];

    uint FrameIndex        = uint(FrameAndFlags.x);
    uint AccumulatedFrames = uint(FrameAndFlags.y);
    uint InspectionMode    = uint(FrameAndFlags.z);
    uint Flags             = uint(FrameAndFlags.w);
    uint LightCount        = uint(SkyHorAndLts.w);

    float3 EyePos     = EyeAndTan.xyz;
    float  TanHalf    = EyeAndTan.w;
    float3 Forward    = ForwardAndAsp.xyz;
    float  Aspect     = ForwardAndAsp.w;
    float3 Right      = RightAndWidth.xyz;
    float3 Up         = UpAndHeight.xyz;
    float3 SunDir     = SunDirAndRad.xyz;
    float  SunRadius  = SunDirAndRad.w;
    float3 SunRad     = SunRadAndDay.xyz;
    float  Daylight   = SunRadAndDay.w;

    uint   PixelIndex = DispatchThreadId.y * Width + DispatchThreadId.x;

    // Sub-pixel jitter after first frame when temporal accumulation is active
    float2 SubJitter = float2(0.5f, 0.5f);
    if ((Flags & FlagTemporalReuse) != 0u && AccumulatedFrames > 0u)
    {
        SubJitter = SampleDiscrepancyPair(DispatchThreadId.xy, AccumulatedFrames);
    }

    float NdcX = 2.0f * (float(DispatchThreadId.x) + SubJitter.x) / float(Width) - 1.0f;
    float NdcY = 1.0f - 2.0f * (float(DispatchThreadId.y) + SubJitter.y) / float(Height);
    float3 RayDir = normalize(Forward + Right * (NdcX * Aspect * TanHalf) + Up * (NdcY * TanHalf));

    GpuRayHit Hit = TraceSceneRayGpu(EyePos, RayDir, 0.01f, 320.0f);

    if (InspectionMode > 0u)
    {
        float3 DebugColor = float3(0.0f, 0.0f, 0.0f);
        if (Hit.Hit)
        {
            MaterialRecord Surface = Materials[min(Hit.Family, 80u)];
            if (InspectionMode == 1u)
            {
                DebugColor = Surface.Albedo;
            }
            else if (InspectionMode == 2u)
            {
                DebugColor = 0.5f + 0.5f * Hit.Normal;
            }
            else if (InspectionMode == 3u)
            {
                DebugColor = float3(Surface.Roughness, Surface.Metalness, Surface.CoatWeight);
            }
            else if (InspectionMode == 4u)
            {
                float D = clamp(Hit.Travel / 80.0f, 0.0f, 1.0f);
                DebugColor = float3(1.0f - D, 1.0f - D, 1.0f - D);
            }
        }
        OutputTexture[DispatchThreadId.xy] = float4(clamp(DebugColor, float3(0.0f), float3(1.0f)), 1.0f);
        return;
    }

    float3 PixelRadiance = float3(0.0f, 0.0f, 0.0f);

    if (!Hit.Hit)
    {
        PixelRadiance = SampleSkyLutGpu(RayDir, SunDir, SunRad, Flags);

        // Limb-darkened Solar Disc
        if ((Flags & FlagSolarEnabled) != 0u)
        {
            float CosSun = clamp(dot(RayDir, SunDir), -1.0f, 1.0f);
            float Theta  = acos(CosSun);
            if (Theta < SunRadius * 2.4f)
            {
                if (Theta <= SunRadius)
                {
                    float Mu   = sqrt(max(0.0f, 1.0f - (Theta / SunRadius) * (Theta / SunRadius)));
                    float Limb = 1.0f - 0.397f * (1.0f - Mu) - 0.196f * (1.0f - Mu) * (1.0f - Mu);
                    PixelRadiance += SunRad * float3(14.0f, 13.0f, 11.5f) * Limb;
                }
                else
                {
                    float Corona = exp(-(Theta - SunRadius) / max(SunRadius * 0.45f, 1.0e-4f));
                    PixelRadiance += SunRad * float3(2.2f, 1.9f, 1.5f) * Corona;
                }
            }
        }

        // Moons
        if ((Flags & FlagMoonEnabled) != 0u && RayDir.z > 0.0f)
        {
            float3 PrimDir   = MoonPrimary.xyz;
            float  AnglePrim = acos(clamp(dot(RayDir, PrimDir), -1.0f, 1.0f));
            if (AnglePrim < 0.014f)
            {
                float  Radial  = AnglePrim / 0.014f;
                float  SphereZ = sqrt(max(0.0f, 1.0f - Radial * Radial));
                float3 MNormal = normalize(RayDir - PrimDir * (1.0f - SphereZ));
                float  LitDot  = max(0.0f, dot(MNormal, SunDir));
                float  Lommel  = (LitDot > 0.0f) ? (2.0f * LitDot / (LitDot + SphereZ + 0.05f)) : 0.0f;
                float  Total   = Lommel * MoonPrimary.w * 8.5f + MoonSecondary.w * 0.08f * SphereZ;
                PixelRadiance += Total * float3(0.96f, 0.98f, 1.04f);
            }
            if ((Flags & FlagSecondaryMoon) != 0u)
            {
                float3 SecDir   = MoonSecondary.xyz;
                float  AngleSec = acos(clamp(dot(RayDir, SecDir), -1.0f, 1.0f));
                if (AngleSec < 0.0085f)
                {
                    float SphereZ = sqrt(max(0.0f, 1.0f - (AngleSec / 0.0085f) * (AngleSec / 0.0085f)));
                    PixelRadiance += (0.35f + 0.65f * SphereZ) * MoonPrimary.w * 4.5f * float3(0.88f, 0.92f, 1.06f);
                }
            }
        }

        // Stars & Milky Way
        if ((Flags & FlagStarsEnabled) != 0u && RayDir.z > 0.01f && Daylight < 0.99f)
        {
            float Vis  = (1.0f - Daylight) * clamp(RayDir.z * 3.5f, 0.0f, 1.0f);
            uint  Hash = HashCell3D(int3(floor(RayDir * 140.0f)));
            if ((Hash & 0xFFu) < 4u)
            {
                float Temp  = float((Hash >> 8u) & 0xFFu) / 255.0f;
                float Scint = 1.0f - 0.35f * StarParams.y * float((Hash >> 16u) & 0xFFu) / 255.0f;
                float Lum   = StarParams.x * Scint * Vis * (0.25f + 0.75f * Temp);
                PixelRadiance += Lum * float3(0.80f + 0.40f * (1.0f - Temp), 0.92f, 0.75f + 0.45f * Temp);
            }
            if (StarParams.z > 0.0f)
            {
                float GalPlane = RayDir.x * 0.45f - RayDir.y * 0.55f + RayDir.z * 0.70f;
                float Band     = exp(-GalPlane * GalPlane * 14.0f) * StarParams.z * 0.06f * Vis;
                PixelRadiance += Band * float3(0.78f, 0.86f, 1.12f);
            }
        }

        // Volumetric Clouds
        if ((Flags & FlagCloudsEnabled) != 0u && RayDir.z > 0.03f && CloudParams.x > 0.01f)
        {
            float TStart = max(0.0f, (CloudParams.y - EyePos.z) / RayDir.z);
            float TEnd   = min(16000.0f, (CloudParams.z - EyePos.z) / RayDir.z);
            if (TEnd > TStart)
            {
                float  Dt          = (TEnd - TStart) / 12.0f;
                float  Trans       = 1.0f;
                float3 CloudScat   = float3(0.0f, 0.0f, 0.0f);
                float  CosTheta    = dot(RayDir, SunDir);
                float  Phase       = lerp(0.08f, 0.32f, pow(clamp(0.5f + 0.5f * CosTheta, 0.0f, 1.0f), 3.0f));
                for (uint Step = 0u; Step < 12u; Step++)
                {
                    float  T       = TStart + (float(Step) + 0.5f) * Dt;
                    float3 SampleP = EyePos + RayDir * T;
                    float  SigmaT  = EvaluateProceduralCloudDensity(SampleP, CloudParams);
                    if (SigmaT > 1.0e-5f)
                    {
                        float  StepT   = exp(-SigmaT * Dt);
                        float  SunOptical = EvaluateProceduralCloudDensity(SampleP + SunDir * 120.0f, CloudParams) * 140.0f;
                        float  SunAttn = exp(-SunOptical) * (1.0f - exp(-SigmaT * Dt * 2.0f));
                        float3 Ambient = SkyZenAndExp.xyz * 0.45f + SkyHorAndLts.xyz * 0.35f;
                        float3 StepRad = SunRad * 1.4f * Phase * (0.35f + 0.65f * SunAttn) + Ambient;
                        CloudScat     += Trans * (1.0f - StepT) * StepRad;
                        Trans         *= StepT;
                        if (Trans < 0.02f)
                        {
                            break;
                        }
                    }
                }
                PixelRadiance = PixelRadiance * Trans + CloudScat;
            }
        }
    }
    else
    {
        MaterialRecord Surface = Materials[min(Hit.Family, 80u)];
        float3         ViewDir = -RayDir;
        uint           Rng     = ConstructPixelSeed(DispatchThreadId.xy, FrameIndex, 1u);

        // 1. Direct Sun + Clustered Lights with ScatteringSequence + AutomotivePaint BSDF
        float3 DirectLit = EvaluateDirectLightingAtPoint(Hit.Position, Hit.Normal, ViewDir, Hit.Family, SunDir, SunRad, Flags, LightCount);

        // 2. ReSTIR GI Indirect Path Trace + Temporal & Spatial Reservoir Reuse
        float3 IndirectIrradiance = SkyZenAndExp.xyz * (0.5f + 0.5f * Hit.Normal.z) + SkyHorAndLts.xyz * (1.0f - abs(Hit.Normal.z)) * 0.5f;
        if ((Flags & FlagGlobalIllum) != 0u)
        {
            float2 Xi        = float2(AdvanceUniform(Rng), AdvanceUniform(Rng));
            float3 BounceDir = normalize(TransformLocalToWorld(Hit.Normal, ProjectCosineHemisphere(Xi)));
            float3 CandidateIrradiance = float3(0.0f, 0.0f, 0.0f);

            GpuRayHit BounceHit = TraceSceneRayGpu(Hit.Position + Hit.Normal * 0.02f, BounceDir, 0.01f, 120.0f);
            if (!BounceHit.Hit)
            {
                CandidateIrradiance = SampleSkyLutGpu(BounceDir, SunDir, SunRad, Flags);
            }
            else
            {
                CandidateIrradiance = EvaluateDirectLightingAtPoint(
                    BounceHit.Position,
                    BounceHit.Normal,
                    -BounceDir,
                    BounceHit.Family,
                    SunDir,
                    SunRad,
                    Flags,
                    LightCount);
                float3 BounceSky = SkyZenAndExp.xyz * (0.5f + 0.5f * BounceHit.Normal.z);
                CandidateIrradiance += Materials[min(BounceHit.Family, 80u)].Albedo * BounceSky * 0.45f;
            }

            // Reservoir update (temporal + 4-tap spatial reuse)
            float4 PrevRes0 = ReservoirBuffer[PixelIndex * 2u + 0u];
            float4 PrevRes1 = ReservoirBuffer[PixelIndex * 2u + 1u];
            float3 AccumIrr = CandidateIrradiance;
            float  M        = 1.0f;

            if ((Flags & FlagTemporalReuse) != 0u && AccumulatedFrames > 0u)
            {
                float NormalSim = dot(PrevRes1.xyz, Hit.Normal);
                if (NormalSim > 0.85f)
                {
                    float PrevM = min(PrevRes1.w, 20.0f);
                    AccumIrr    = (PrevRes0.xyz * PrevM + CandidateIrradiance) / (PrevM + 1.0f);
                    M           = PrevM + 1.0f;
                }
            }

            // 4-tap spatial reservoir reuse with edge-stopping normal/depth weights
            static const int2 Offsets[4] = { int2(-2, 1), int2(2, -1), int2(-1, -2), int2(1, 2) };
            float3 SpatialSum = AccumIrr * 1.5f;
            float  SpatialW   = 1.5f;
            for (uint Tap = 0u; Tap < 4u; Tap++)
            {
                int2 NeighborPx = clamp(int2(DispatchThreadId.xy) + Offsets[Tap], int2(0, 0), int2(int(Width) - 1, int(Height) - 1));
                uint NeighborId = uint(NeighborPx.y) * Width + uint(NeighborPx.x);
                float4 NRes0    = ReservoirBuffer[NeighborId * 2u + 0u];
                float4 NRes1    = ReservoirBuffer[NeighborId * 2u + 1u];
                if (NRes1.w > 0.0f)
                {
                    float WNormal = pow(max(0.0f, dot(NRes1.xyz, Hit.Normal)), 16.0f);
                    if (WNormal > 0.2f)
                    {
                        SpatialSum += NRes0.xyz * WNormal;
                        SpatialW   += WNormal;
                    }
                }
            }
            IndirectIrradiance = SpatialSum / max(SpatialW, 1.0e-4f);

            ReservoirBuffer[PixelIndex * 2u + 0u] = float4(IndirectIrradiance, SpatialW);
            ReservoirBuffer[PixelIndex * 2u + 1u] = float4(Hit.Normal, M);
        }

        // 3. Glossy Raytraced Reflections & Automotive Flake + Clear-Coat Environment
        float  NdotV      = max(dot(Hit.Normal, ViewDir), 0.0f);
        float3 ReflectDir = normalize(RayDir + 2.0f * NdotV * Hit.Normal);
        float3 SkyRefl    = SampleSkyLutGpu(float3(ReflectDir.xy, max(0.02f, ReflectDir.z)), SunDir, SunRad, Flags);
        float3 TracedRefl = SkyRefl;

        if ((Flags & FlagReflections) != 0u && (Surface.CoatWeight > 0.1f || Surface.Metalness > 0.15f))
        {
            GpuRayHit ReflHit = TraceSceneRayGpu(Hit.Position + Hit.Normal * 0.02f, ReflectDir, 0.01f, 140.0f);
            if (ReflHit.Hit)
            {
                float3 ReflLit = EvaluateDirectLightingAtPoint(
                    ReflHit.Position,
                    ReflHit.Normal,
                    -ReflectDir,
                    ReflHit.Family,
                    SunDir,
                    SunRad,
                    Flags,
                    LightCount);
                TracedRefl = lerp(SkyRefl, ReflLit + Materials[min(ReflHit.Family, 80u)].Albedo * SkyZenAndExp.xyz * 0.35f, 0.65f);
            }
        }

        float3 SpecF0 = lerp(float3(0.16f * Surface.SpecularLevel * Surface.SpecularLevel), Surface.Albedo, Surface.Metalness);
        if (Surface.FlakeCoverage > 0.0f)
        {
            SpecF0 = lerp(SpecF0, Surface.FlakeTint, Surface.FlakeCoverage * 0.65f);
        }
        float  Schlick      = pow(clamp(1.0f - NdotV, 0.0f, 1.0f), 5.0f);
        float  CoatFresnel  = (0.04f + 0.96f * Schlick) * Surface.CoatWeight;
        float3 FlakeFresnel = SpecF0 + (float3(1.0f) - SpecF0) * Schlick;

        float3 DiffuseAlbedo = Surface.Albedo * (1.0f - Surface.Metalness * 0.5f);
        if (Surface.FlakeCoverage > 0.0f)
        {
            DiffuseAlbedo = lerp(DiffuseAlbedo, Surface.FlakeTint, 0.35f);
        }

        float3 ReSTIRTerm = IndirectIrradiance * DiffuseAlbedo * 0.72f;
        float3 FlakeEnv   = TracedRefl * FlakeFresnel * (Surface.FlakeCoverage > 0.0f ? 0.28f : 0.18f);
        float3 CoatEnv    = TracedRefl * CoatFresnel * 0.38f;
        PixelRadiance     = DirectLit + ReSTIRTerm + FlakeEnv + CoatEnv;

        // 4. Height-Exponential Volumetric Fog
        if ((Flags & FlagFogEnabled) != 0u && Hit.Travel > FogParams.w)
        {
            float FogDist  = Hit.Travel - FogParams.w;
            float HDelta   = (EyePos.z - FogParams.y) / max(1.0f, FogParams.z);
            float LocalRho = FogParams.x * exp(-clamp(HDelta, -10.0f, 10.0f));
            float FogTrans = exp(-LocalRho * FogDist);
            PixelRadiance  = PixelRadiance * FogTrans + FogColAndFlare.xyz * (1.0f - FogTrans);
        }
    }

    // 5. Optical Lens Flare
    if ((Flags & FlagFlareEnabled) != 0u)
    {
        float2 SunNdc  = FlareScreen.xy;
        float2 Delta   = float2(NdcX - SunNdc.x, NdcY - SunNdc.y);
        Delta.x       *= Aspect;
        float  Dist    = length(Delta);
        float  Angle   = atan2(Delta.y, Delta.x);
        float  Blades  = max(3.0f, FlareScreen.z);
        float  Spikes  = pow(0.5f + 0.5f * cos(Angle * Blades), 12.0f) * exp(-Dist * 4.5f);
        float  Halo    = exp(-abs(Dist - 0.28f) * 22.0f) * 0.35f;
        float  Streak  = exp(-abs(Delta.y) * 45.0f) * exp(-abs(Delta.x) * 2.5f) * 0.45f;
        PixelRadiance += SunRad * FogColAndFlare.w * 0.14f * (Spikes + Halo + Streak);
    }

    // 6. Temporal SVGF / Progressive Accumulation on GPU
    float3 FinalHdr = PixelRadiance;
    if ((Flags & FlagTemporalReuse) != 0u && AccumulatedFrames > 0u)
    {
        float4 PrevHdr = AccumulationBuffer[PixelIndex * 2u + 0u];
        float  Blend   = 1.0f / float(min(AccumulatedFrames + 1u, 24u));
        FinalHdr       = lerp(PrevHdr.xyz, PixelRadiance, Blend);
    }
    AccumulationBuffer[PixelIndex * 2u + 0u] = float4(FinalHdr, float(AccumulatedFrames + 1u));
    AccumulationBuffer[PixelIndex * 2u + 1u] = float4(Hit.Position, Hit.Hit ? Hit.Travel : 0.0f);

    // 7. Exposure + ACES Filmic Tonemap + sRGB OETF
    float3 Exposed = FinalHdr * SkyZenAndExp.w;
    float3 Mapped  = Exposed;
    if ((Flags & FlagAcesTonemap) != 0u)
    {
        float3 X = max(float3(0.0f), Exposed);
        Mapped   = clamp((X * (2.51f * X + 0.03f)) / max(X * (2.43f * X + 0.59f) + 0.14f, float3(1.0e-6f)), float3(0.0f), float3(1.0f));
    }
    float3 Srgb = pow(clamp(Mapped, float3(0.0f), float3(1.0f)), float3(1.0f / 2.2f));
    OutputTexture[DispatchThreadId.xy] = float4(Srgb, 1.0f);
}
