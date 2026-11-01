//==========================================================================================================================================
//                                                            RAY TRAVERSAL
//==========================================================================================================================================
// 🧩 Full RTX Raytracing & Multi-Bounce ReSTIR Path Tracer over a Two-Level BVH (TLAS over scene occupants + Binned-SAH BLAS
//    over exact triangle facets):
//    - Closest-hit (TraceSceneRay) and any-hit shadow rays (TraceSceneVisibility)
//    - Two-lobed BSDF importance sampling (Heitz 2018 GGX VNDF + cosine-weighted Lambertian diffuse)
//    - Next-Event Estimation (NEE) with Veach power-heuristic Multiple Importance Sampling (MIS) + Resampled Importance Sampling (RIS)
//    - Multi-bounce throughput integration with Russian Roulette termination and SurfaceCardDepot tail convergence

#pragma once

#include "CardSampling.slang"
#include "SurfaceReflectance.slang"
#include "PackingCodec.slang"
#include "DiscrepancySequence.slang"
#include "FireIllumination.slang"
#include "ClusteredLights.slang"
#include "ReservoirRecords.slang"

//------------------------------------------------------------------------------------------------------------------------
//                                             GROUP 3: RAY TRACING ACCELERATION
//------------------------------------------------------------------------------------------------------------------------

struct BvhNode
{
    float3 Minimum;
    uint   LeftOrFirst;
    float3 Maximum;
    uint   CountOrInstance;
};

[[vk::binding(0, 3)]] StructuredBuffer<BvhNode>              BvhNodes;
[[vk::binding(1, 3)]] StructuredBuffer<float4>               BlasTriangles;
[[vk::binding(2, 3)]] StructuredBuffer<MaterialRecord>       RtMaterials;
[[vk::binding(3, 3)]] ConstantBuffer<ClusteredLightBuffer>   RtSceneLights;
[[vk::binding(4, 3)]] Texture2D<float4>                      RtHmiTabletTexture;
[[vk::binding(5, 3)]] Texture2D<float4>                      RtHmiClusterTexture;

static const uint  TlasLeafBit          = 0x80000000u;
static const uint  EmptyTlasSentinel    = 0x7FFFFFFFu;
static const uint  VehicleGlassFamily   = 2u;
static const uint  TyreFamily           = 4u;
static const uint  HeadlightFamily      = 9u;
static const uint  TaillightFamily      = 10u;
static const uint  DisplayGlassFamily   = 65u;
static const float RayEpsilon           = 2.0e-3f;
static const float SunConeSinHalfAngle  = 0.00465f; // ~0.266 deg solar half-angle
static const float SunConeCosHalfAngle  = 0.999989f;

// Cabin HMI Display Screen Rectangles in Vehicle-Body Local Coordinates (matches CabinStructure.js)
static const float3 HmiTabletCenterLocal  = float3(0.49f,  0.00f, 0.56f);
static const float3 HmiTabletRightLocal   = float3(0.00f,  1.00f, 0.00f);
static const float3 HmiTabletUpLocal      = float3(0.1391731f, 0.00f, 0.9902681f);
static const float3 HmiTabletNormalLocal  = float3(-0.9902681f, 0.00f, 0.1391731f);
static const float2 HmiTabletHalfSize     = float2(0.17f, 0.105f);
static const float  HmiTabletArea         = 0.1428f; // 0.34 m x 0.21 m * 2.0
static const float3 HmiTabletTint         = float3(1.05f, 1.08f, 1.15f);

static const float3 HmiClusterCenterLocal = float3(0.55f,  0.38f, 0.58f);
static const float3 HmiClusterRightLocal  = float3(0.00f,  1.00f, 0.00f);
static const float3 HmiClusterUpLocal     = float3(0.1736482f, 0.00f, 0.9848077f);
static const float3 HmiClusterNormalLocal = float3(-0.9848077f, 0.00f, 0.1736482f);
static const float2 HmiClusterHalfSize    = float2(0.15f, 0.055f);
static const float  HmiClusterArea        = 0.066f; // 0.30 m x 0.11 m * 2.0
static const float3 HmiClusterTint        = float3(1.02f, 1.06f, 1.14f);

struct RayHitResult
{
    float3 Position; // [m]   exact world-space hit point
    float  Travel;   // [m]   parametric distance along the world ray
    float3 Normal;   // [-]   world-space shading normal (oriented against incoming ray)
    uint   Identity; // [-]   Occupant index, GroundIdentity, or SkyIdentity on miss
    uint   Family;   // [-]   MaterialRecord index
    bool   Hit;
};

//------------------------------------------------------------------------------------------------------------------------
//                                           EXACT TWO-LEVEL BVH RAY TRAVERSAL
//------------------------------------------------------------------------------------------------------------------------

float3 SafeInverseDirection(float3 Direction)
{
    float3 Sign = select(Direction >= float3(0.0f), float3(1.0f), float3(-1.0f));
    return 1.0f / select(abs(Direction) < float3(1.0e-8f), Sign * 1.0e-8f, Direction);
}

float2 IntersectRayAabb(float3 Origin, float3 InverseDir, float3 Minimum, float3 Maximum, float MaxT)
{
    float3 T0   = (Minimum - Origin) * InverseDir;
    float3 T1   = (Maximum - Origin) * InverseDir;
    float3 Near = min(T0, T1);
    float3 Far  = max(T0, T1);
    float  TMin = max(max(Near.x, Near.y), max(Near.z, 0.0f));
    float  TMax = min(min(Far.x, Far.y), min(Far.z, MaxT));
    return float2(TMin, TMax);
}

RayHitResult TraceSceneRay(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    RayHitResult Best;
    Best.Position = Origin + Direction * MaxT;
    Best.Travel   = MaxT;
    Best.Normal   = -Direction;
    Best.Identity = SkyIdentity;
    Best.Family   = 0u;
    Best.Hit      = false;

    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return Best;
    }

    float3 WorldInvDir = SafeInverseDirection(Direction);
    uint   Stack[32];
    uint   StackPtr    = 0u;
    Stack[0]           = 0u;
    StackPtr           = 1u;

    bool   InBlas      = false;
    uint   BlasBasePtr = 0u;
    uint   CurrentOcc  = 0u;
    uint   OccOverride = NoMaterialOverride;
    uint   OccRoles    = 0u;
    float3 LocalOrigin = Origin;
    float3 LocalDir    = Direction;
    float3 LocalInvDir = WorldInvDir;

    uint Iterations = 0u;
    while (StackPtr > 0u && Iterations < 320u)
    {
        Iterations++;
        if (InBlas && StackPtr == BlasBasePtr)
        {
            InBlas = false;
        }

        StackPtr--;
        uint    NodeIndex = Stack[StackPtr];
        BvhNode Node      = BvhNodes[NodeIndex];

        float3 RayOrig = InBlas ? LocalOrigin : Origin;
        float3 RayInv  = InBlas ? LocalInvDir : WorldInvDir;
        float2 Span    = IntersectRayAabb(RayOrig, RayInv, Node.Minimum, Node.Maximum, Best.Travel);
        if (Span.x > Span.y)
        {
            continue;
        }

        if (!InBlas)
        {
            if ((Node.CountOrInstance & TlasLeafBit) != 0u)
            {
                CurrentOcc             = Node.CountOrInstance & 0x7FFFFFFFu;
                OccupantRecord Occ     = Occupants[CurrentOcc];
                OccOverride            = Occ.MaterialOverride;
                OccRoles               = Occ.Roles;
                LocalOrigin            = MulMat4Point(Occ.WorldToLocal, Origin);
                LocalDir               = MulMat4Vec(Occ.WorldToLocal, Direction);
                LocalInvDir            = SafeInverseDirection(LocalDir);
                BlasBasePtr            = StackPtr;
                InBlas                 = true;
                if (StackPtr < 31u)
                {
                    Stack[StackPtr] = Node.LeftOrFirst;
                    StackPtr++;
                }
            }
            else
            {
                uint   Left   = Node.LeftOrFirst;
                uint   Right  = Node.CountOrInstance;
                float2 SpanL  = IntersectRayAabb(Origin, WorldInvDir, BvhNodes[Left].Minimum,  BvhNodes[Left].Maximum,  Best.Travel);
                float2 SpanR  = IntersectRayAabb(Origin, WorldInvDir, BvhNodes[Right].Minimum, BvhNodes[Right].Maximum, Best.Travel);
                bool   HitL   = SpanL.x <= SpanL.y;
                bool   HitR   = SpanR.x <= SpanR.y;
                if (HitL && HitR)
                {
                    if (SpanL.x < SpanR.x)
                    {
                        if (StackPtr < 30u) { Stack[StackPtr] = Right; Stack[StackPtr + 1u] = Left;  StackPtr += 2u; }
                    }
                    else
                    {
                        if (StackPtr < 30u) { Stack[StackPtr] = Left;  Stack[StackPtr + 1u] = Right; StackPtr += 2u; }
                    }
                }
                else if (HitL && StackPtr < 31u) { Stack[StackPtr] = Left;  StackPtr++; }
                else if (HitR && StackPtr < 31u) { Stack[StackPtr] = Right; StackPtr++; }
            }
        }
        else
        {
            if (Node.CountOrInstance > 0u)
            {
                uint FirstTri = Node.LeftOrFirst;
                uint TriCount = Node.CountOrInstance;
                for (uint I = 0u; I < TriCount; I++)
                {
                    uint   TriBase = (FirstTri + I) * 4u;
                    float4 V0      = BlasTriangles[TriBase + 0u];
                    uint   RawFam  = asuint(V0.w);
                    uint   Family  = (OccOverride == NoMaterialOverride) ? RawFam : OccOverride;
                    if (Family == VehicleGlassFamily)
                    {
                        continue;
                    }
                    if (Family == TyreFamily && (OccRoles & RoleShredded) != 0u)
                    {
                        continue;
                    }

                    float4 V1  = BlasTriangles[TriBase + 1u];
                    float4 V2  = BlasTriangles[TriBase + 2u];
                    float3 A   = V0.xyz;
                    float3 E1  = V1.xyz;
                    float3 E2  = V2.xyz;
                    float3 P   = cross(LocalDir, E2);
                    float  Det = dot(E1, P);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 T      = LocalOrigin - A;
                    float  U      = dot(T, P) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 Q = cross(T, E1);
                    float  V = dot(LocalDir, Q) * InvDet;
                    if (V < 0.0f || U + V > 1.0f)
                    {
                        continue;
                    }
                    float HitT = dot(E2, Q) * InvDet;
                    if (HitT > MinT && HitT < Best.Travel)
                    {
                        float4 V3     = BlasTriangles[TriBase + 3u];
                        float3 NA     = UnpackOctahedral(asuint(V1.w));
                        float3 NB     = UnpackOctahedral(asuint(V2.w));
                        float3 NC     = UnpackOctahedral(asuint(V3.w));
                        float3 LocalN = normalize(NA * (1.0f - U - V) + NB * U + NC * V);

                        OccupantRecord Occ    = Occupants[CurrentOcc];
                        float3         WorldN = normalize(MulMat4Vec(Occ.LocalToWorld, LocalN));
                        if (dot(WorldN, Direction) > 0.0f)
                        {
                            WorldN = -WorldN;
                        }

                        Best.Travel   = HitT;
                        Best.Position = Origin + Direction * HitT;
                        Best.Normal   = WorldN;
                        Best.Identity = (CurrentOcc == 1u) ? GroundIdentity : CurrentOcc;
                        Best.Family   = Family;
                        Best.Hit      = true;
                    }
                }
            }
            else
            {
                uint   Left  = Node.LeftOrFirst;
                uint   Right = Left + 1u;
                float2 SpanL = IntersectRayAabb(LocalOrigin, LocalInvDir, BvhNodes[Left].Minimum,  BvhNodes[Left].Maximum,  Best.Travel);
                float2 SpanR = IntersectRayAabb(LocalOrigin, LocalInvDir, BvhNodes[Right].Minimum, BvhNodes[Right].Maximum, Best.Travel);
                bool   HitL  = SpanL.x <= SpanL.y;
                bool   HitR  = SpanR.x <= SpanR.y;
                if (HitL && HitR)
                {
                    if (SpanL.x < SpanR.x)
                    {
                        if (StackPtr < 30u) { Stack[StackPtr] = Right; Stack[StackPtr + 1u] = Left;  StackPtr += 2u; }
                    }
                    else
                    {
                        if (StackPtr < 30u) { Stack[StackPtr] = Left;  Stack[StackPtr + 1u] = Right; StackPtr += 2u; }
                    }
                }
                else if (HitL && StackPtr < 31u) { Stack[StackPtr] = Left;  StackPtr++; }
                else if (HitR && StackPtr < 31u) { Stack[StackPtr] = Right; StackPtr++; }
            }
        }
    }

    return Best;
}

float TraceSceneVisibility(float3 Origin, float3 Direction, float MinT, float MaxT)
{
    if (BvhNodes[0].LeftOrFirst == EmptyTlasSentinel)
    {
        return 1.0f;
    }

    float3 WorldInvDir = SafeInverseDirection(Direction);
    uint   Stack[32];
    uint   StackPtr    = 0u;
    Stack[0]           = 0u;
    StackPtr           = 1u;

    bool   InBlas      = false;
    uint   BlasBasePtr = 0u;
    uint   CurrentOcc  = 0u;
    uint   OccOverride = NoMaterialOverride;
    uint   OccRoles    = 0u;
    float3 LocalOrigin = Origin;
    float3 LocalDir    = Direction;
    float3 LocalInvDir = WorldInvDir;

    uint Iterations = 0u;
    while (StackPtr > 0u && Iterations < 256u)
    {
        Iterations++;
        if (InBlas && StackPtr == BlasBasePtr)
        {
            InBlas = false;
        }

        StackPtr--;
        uint    NodeIndex = Stack[StackPtr];
        BvhNode Node      = BvhNodes[NodeIndex];

        float3 RayOrig = InBlas ? LocalOrigin : Origin;
        float3 RayInv  = InBlas ? LocalInvDir : WorldInvDir;
        float2 Span    = IntersectRayAabb(RayOrig, RayInv, Node.Minimum, Node.Maximum, MaxT);
        if (Span.x > Span.y)
        {
            continue;
        }

        if (!InBlas)
        {
            if ((Node.CountOrInstance & TlasLeafBit) != 0u)
            {
                CurrentOcc         = Node.CountOrInstance & 0x7FFFFFFFu;
                OccupantRecord Occ = Occupants[CurrentOcc];
                OccOverride        = Occ.MaterialOverride;
                OccRoles           = Occ.Roles;
                LocalOrigin        = MulMat4Point(Occ.WorldToLocal, Origin);
                LocalDir           = MulMat4Vec(Occ.WorldToLocal, Direction);
                LocalInvDir        = SafeInverseDirection(LocalDir);
                BlasBasePtr        = StackPtr;
                InBlas             = true;
                if (StackPtr < 31u)
                {
                    Stack[StackPtr] = Node.LeftOrFirst;
                    StackPtr++;
                }
            }
            else
            {
                uint   Left  = Node.LeftOrFirst;
                uint   Right = Node.CountOrInstance;
                float2 SpanL = IntersectRayAabb(Origin, WorldInvDir, BvhNodes[Left].Minimum,  BvhNodes[Left].Maximum,  MaxT);
                float2 SpanR = IntersectRayAabb(Origin, WorldInvDir, BvhNodes[Right].Minimum, BvhNodes[Right].Maximum, MaxT);
                if (SpanL.x <= SpanL.y && StackPtr < 31u) { Stack[StackPtr] = Left;  StackPtr++; }
                if (SpanR.x <= SpanR.y && StackPtr < 31u) { Stack[StackPtr] = Right; StackPtr++; }
            }
        }
        else
        {
            if (Node.CountOrInstance > 0u)
            {
                uint FirstTri = Node.LeftOrFirst;
                uint TriCount = Node.CountOrInstance;
                for (uint I = 0u; I < TriCount; I++)
                {
                    uint   TriBase = (FirstTri + I) * 4u;
                    float4 V0      = BlasTriangles[TriBase + 0u];
                    uint   RawFam  = asuint(V0.w);
                    uint   Family  = (OccOverride == NoMaterialOverride) ? RawFam : OccOverride;
                    if (Family == VehicleGlassFamily || Family == HeadlightFamily || Family == TaillightFamily)
                    {
                        continue;
                    }
                    if (Family == TyreFamily && (OccRoles & RoleShredded) != 0u)
                    {
                        continue;
                    }

                    float4 V1  = BlasTriangles[TriBase + 1u];
                    float4 V2  = BlasTriangles[TriBase + 2u];
                    float3 A   = V0.xyz;
                    float3 E1  = V1.xyz;
                    float3 E2  = V2.xyz;
                    float3 P   = cross(LocalDir, E2);
                    float  Det = dot(E1, P);
                    if (abs(Det) < 1.0e-8f)
                    {
                        continue;
                    }
                    float  InvDet = 1.0f / Det;
                    float3 T      = LocalOrigin - A;
                    float  U      = dot(T, P) * InvDet;
                    if (U < 0.0f || U > 1.0f)
                    {
                        continue;
                    }
                    float3 Q = cross(T, E1);
                    float  V = dot(LocalDir, Q) * InvDet;
                    if (V < 0.0f || U + V > 1.0f)
                    {
                        continue;
                    }
                    float HitT = dot(E2, Q) * InvDet;
                    if (HitT > MinT && HitT < MaxT)
                    {
                        return 0.0f;
                    }
                }
            }
            else
            {
                uint   Left  = Node.LeftOrFirst;
                uint   Right = Left + 1u;
                float2 SpanL = IntersectRayAabb(LocalOrigin, LocalInvDir, BvhNodes[Left].Minimum,  BvhNodes[Left].Maximum,  MaxT);
                float2 SpanR = IntersectRayAabb(LocalOrigin, LocalInvDir, BvhNodes[Right].Minimum, BvhNodes[Right].Maximum, MaxT);
                if (SpanL.x <= SpanL.y && StackPtr < 31u) { Stack[StackPtr] = Left;  StackPtr++; }
                if (SpanR.x <= SpanR.y && StackPtr < 31u) { Stack[StackPtr] = Right; StackPtr++; }
            }
        }
    }

    return 1.0f;
}

//------------------------------------------------------------------------------------------------------------------------
//                                      BSDF IMPORTANCE SAMPLING & MIS EVALUATION
//------------------------------------------------------------------------------------------------------------------------

float3 SampleSunConeDirection(float3 SunDirection, float2 Pair)
{
    float2 Disk = ProjectUniformDisk(Pair) * SunConeSinHalfAngle;
    return normalize(TransformLocalToWorld(SunDirection, float3(Disk.x, Disk.y, SunConeCosHalfAngle)));
}

float EvaluateMisWeight(float PdfA, float PdfB)
{
    float A2 = PdfA * PdfA;
    float B2 = PdfB * PdfB;
    return A2 / max(A2 + B2, 1.0e-12f);
}

// 📝 Heitz 2018: "Sampling the GGX Distribution of Visible Normals" in tangent space (+Z normal).
float3 SampleVisibleNormalGgx(float3 VeLocal, float Alpha, float2 Pair)
{
    float3 Vh      = normalize(float3(Alpha * VeLocal.x, Alpha * VeLocal.y, max(VeLocal.z, 1.0e-4f)));
    float  Lensq   = Vh.x * Vh.x + Vh.y * Vh.y;
    float3 T1      = (Lensq > 1.0e-7f) ? (float3(-Vh.y, Vh.x, 0.0f) * rsqrt(Lensq)) : float3(1.0f, 0.0f, 0.0f);
    float3 T2      = cross(Vh, T1);
    float  R       = sqrt(Pair.x);
    float  φ       = 6.28318530718f * Pair.y;
    float  T1Coord = R * cos(φ);
    float  S       = 0.5f * (1.0f + Vh.z);
    float  T2Coord = (1.0f - S) * sqrt(max(0.0f, 1.0f - T1Coord * T1Coord)) + S * (R * sin(φ));
    float3 Nh      = T1Coord * T1 + T2Coord * T2 + sqrt(max(0.0f, 1.0f - T1Coord * T1Coord - T2Coord * T2Coord)) * Vh;
    return normalize(float3(Alpha * Nh.x, Alpha * Nh.y, max(0.0f, Nh.z)));
}

struct BsdfSample
{
    float3 Direction; // [-]  sampled world-space outgoing ray direction
    float3 Weight;    // [-]  f(x, wi, wo) * |n.wi| / pdf(wi)
    float  Pdf;       // [1/sr]
    bool   Specular;  // [-]  true when the specular lobe was chosen
};

float EvaluateSurfaceBsdfPdf(SurfaceSample Surface, float3 Normal, float3 View, float3 Light)
{
    float NdotL = dot(Normal, Light);
    float NdotV = max(dot(Normal, View), 1.0e-4f);
    if (NdotL <= 0.0f)
    {
        return 0.0f;
    }
    float3 F0       = ResolveSpecularColour(Surface);
    float3 F        = ResolveFresnel(F0, NdotV);
    float  SpecLum  = ResolveLuminance(F);
    float  DiffLum  = ResolveLuminance(ResolveDiffuseAlbedo(Surface) * (float3(1.0f) - F));
    float  SpecProb = clamp(SpecLum / max(SpecLum + DiffLum, 1.0e-4f), 0.12f, 0.88f);

    float3 Half  = normalize(View + Light);
    float  NdotH = max(dot(Normal, Half), 0.0f);
    float  VdotH = max(dot(View, Half), 1.0e-4f);
    float  D     = ResolveGgxDistribution(NdotH, Surface.Roughness);
    float  SpecP = (D * NdotH) / max(4.0f * VdotH, 1.0e-5f);
    float  DiffP = NdotL * InversePi;
    return SpecProb * SpecP + (1.0f - SpecProb) * DiffP;
}

BsdfSample SampleSurfaceBsdf(SurfaceSample Surface, float3 Normal, float3 View, float3 UvAndChoice)
{
    BsdfSample Result;
    float  NdotV    = max(dot(Normal, View), 1.0e-4f);
    float3 F0       = ResolveSpecularColour(Surface);
    float3 F        = ResolveFresnel(F0, NdotV);
    float  SpecLum  = ResolveLuminance(F);
    float  DiffLum  = ResolveLuminance(ResolveDiffuseAlbedo(Surface) * (float3(1.0f) - F));
    float  SpecProb = clamp(SpecLum / max(SpecLum + DiffLum, 1.0e-4f), 0.12f, 0.88f);

    if (UvAndChoice.z < SpecProb)
    {
        float  Alpha   = max(Surface.Roughness * Surface.Roughness, 0.002f);
        float3 VeLocal = TransformWorldToLocal(Normal, View);
        float3 HLocal  = SampleVisibleNormalGgx(VeLocal, Alpha, UvAndChoice.xy);
        float3 Half    = normalize(TransformLocalToWorld(Normal, HLocal));
        float3 Light   = reflect(-View, Half);
        float  NdotL   = dot(Normal, Light);
        if (NdotL <= 1.0e-4f)
        {
            Result.Direction = Normal;
            Result.Weight    = float3(0.0f);
            Result.Pdf       = 0.0f;
            Result.Specular  = true;
            return Result;
        }
        float  Pdf   = max(EvaluateSurfaceBsdfPdf(Surface, Normal, View, Light), 1.0e-4f);
        float3 Value = ResolveDirectReflectance(Surface, Normal, View, Light);
        Result.Direction = Light;
        Result.Weight    = min(Value / Pdf, float3(12.0f));
        Result.Pdf       = Pdf;
        Result.Specular  = true;
        return Result;
    }

    float3 Light = normalize(TransformLocalToWorld(Normal, ProjectCosineHemisphere(UvAndChoice.xy)));
    float  NdotL = max(dot(Normal, Light), 1.0e-4f);
    float  Pdf   = max(EvaluateSurfaceBsdfPdf(Surface, Normal, View, Light), 1.0e-4f);
    float3 Value = ResolveDirectReflectance(Surface, Normal, View, Light);
    Result.Direction = Light;
    Result.Weight    = min(Value / Pdf, float3(12.0f));
    Result.Pdf       = Pdf;
    Result.Specular  = false;
    return Result;
}

//------------------------------------------------------------------------------------------------------------------------
//                                  CABIN HMI DISPLAY TEXTURED EMISSION & AREA-LIGHT NEE
//------------------------------------------------------------------------------------------------------------------------

float3 SampleDisplayTextureBilinear(Texture2D<float4> Tex, float2 Uv)
{
    uint2 DimsU;
    Tex.GetDimensions(DimsU.x, DimsU.y);
    float2 Dims = float2(max(DimsU, uint2(1u)));
    float2 Pos  = clamp(Uv, float2(0.0f), float2(1.0f)) * Dims - 0.5f;
    float2 Base = floor(Pos);
    float2 Frac = Pos - Base;
    int2   MaxC = int2(Dims) - int2(1);
    int2   P00  = clamp(int2(Base), int2(0), MaxC);
    int2   P10  = clamp(int2(Base) + int2(1, 0), int2(0), MaxC);
    int2   P01  = clamp(int2(Base) + int2(0, 1), int2(0), MaxC);
    int2   P11  = clamp(int2(Base) + int2(1, 1), int2(0), MaxC);
    float3 C00  = Tex.Load(int3(P00, 0)).rgb;
    float3 C10  = Tex.Load(int3(P10, 0)).rgb;
    float3 C01  = Tex.Load(int3(P01, 0)).rgb;
    float3 C11  = Tex.Load(int3(P11, 0)).rgb;
    return lerp(lerp(C00, C10, Frac.x), lerp(C01, C11, Frac.x), Frac.y);
}

float3 EvaluateDisplayScreenEmission(uint OccupantIdx, float3 WorldPos)
{
    float Brightness = ResolveHmiBrightness(Frame);
    if (OccupantIdx != 0u || Brightness <= 0.0f)
    {
        return float3(0.0f);
    }
    float3 LocalPos = MulMat4Point(Occupants[0].WorldToLocal, WorldPos);

    float3 RelTab = LocalPos - HmiTabletCenterLocal;
    float  TabX   = dot(RelTab, HmiTabletRightLocal);
    float  TabY   = dot(RelTab, HmiTabletUpLocal);
    if (abs(TabX) <= HmiTabletHalfSize.x * 1.15f && abs(TabY) <= HmiTabletHalfSize.y * 1.15f)
    {
        float2 Uv = float2(0.5f + 0.5f * (TabX / HmiTabletHalfSize.x), 0.5f - 0.5f * (TabY / HmiTabletHalfSize.y));
        return SampleDisplayTextureBilinear(RtHmiTabletTexture, Uv) * HmiTabletTint * (4.5f * Brightness * Frame.EmissionScale);
    }

    float3 RelClu = LocalPos - HmiClusterCenterLocal;
    float  CluX   = dot(RelClu, HmiClusterRightLocal);
    float  CluY   = dot(RelClu, HmiClusterUpLocal);
    if (abs(CluX) <= HmiClusterHalfSize.x * 1.15f && abs(CluY) <= HmiClusterHalfSize.y * 1.15f)
    {
        float2 Uv = float2(0.5f + 0.5f * (CluX / HmiClusterHalfSize.x), 0.5f - 0.5f * (CluY / HmiClusterHalfSize.y));
        return SampleDisplayTextureBilinear(RtHmiClusterTexture, Uv) * HmiClusterTint * (4.2f * Brightness * Frame.EmissionScale);
    }
    return float3(0.0f);
}

float3 EvaluateSingleScreenRectNee(float3            Position,
                                   float3            Normal,
                                   float3            View,
                                   SurfaceSample     Surface,
                                   float2            SampleUv,
                                   float3            CenterLocal,
                                   float3            RightLocal,
                                   float3            UpLocal,
                                   float3            NormalLocal,
                                   float2            HalfSize,
                                   float             Area,
                                   float3            Tint,
                                   float             Gain,
                                   Texture2D<float4> ScreenTex,
                                   bool              TraceVisibility,
                                   bool              DiffuseOnly)
{
    OccupantRecord BodyOcc   = Occupants[0];
    float2         SignedUv  = SampleUv * 2.0f - 1.0f;
    float3         SampleLoc = CenterLocal + RightLocal * (SignedUv.x * HalfSize.x) + UpLocal * (SignedUv.y * HalfSize.y);
    float3         LightPos  = MulMat4Point(BodyOcc.LocalToWorld, SampleLoc);
    float3         LightNorm = normalize(MulMat4Vec(BodyOcc.LocalToWorld, NormalLocal));

    float3 Offset = LightPos - Position;
    float  DistSq = dot(Offset, Offset);
    if (DistSq > 7.5f || DistSq < 1.0e-5f)
    {
        return float3(0.0f);
    }
    float  Dist  = sqrt(DistSq);
    float3 L     = Offset / Dist;
    float  NdotL = dot(Normal, L);
    float  LdotN = dot(LightNorm, -L);
    if (NdotL <= 0.0f || LdotN <= 0.0f)
    {
        return float3(0.0f);
    }

    float2 TexUv    = float2(SampleUv.x, 1.0f - SampleUv.y);
    float3 TexColor = SampleDisplayTextureBilinear(ScreenTex, TexUv);
    float3 Le       = TexColor * Tint * (Gain * Frame.EmissionScale);
    if (ResolveLuminance(Le) <= 1.0e-4f)
    {
        return float3(0.0f);
    }

    float Geom       = (NdotL * LdotN * Area) / max(DistSq, 0.025f);
    float Visibility = 1.0f;
    if (TraceVisibility && Dist > 0.05f)
    {
        Visibility = TraceSceneVisibility(Position + Normal * RayEpsilon, L, RayEpsilon, max(Dist - 0.025f, RayEpsilon));
        if (Visibility <= 0.0f)
        {
            return float3(0.0f);
        }
    }

    if (DiffuseOnly)
    {
        float  LightPdf = max(DistSq / max(LdotN * Area, 1.0e-5f), 1.0e-3f);
        float  BsdfPdf  = NdotL * InversePi;
        float  MisW     = EvaluateMisWeight(LightPdf, BsdfPdf);
        return Le * (Geom * Visibility * MisW);
    }

    float3 Brdf = ResolveDirectReflectance(Surface, Normal, View, L);
    return Le * ( Visibility * (LdotN * Area) / max(DistSq, 0.025f)) * Brdf * π;
}

float3 EvaluateHmiAreaLightNee(float3 Position, float3 Normal, float3 View, SurfaceSample Surface, float2 Pair, bool TraceVis)
{
    float Brightness = ResolveHmiBrightness(Frame);
    float Scale      = ResolveHmiScale(Frame);
    if (Brightness <= 0.0f || Scale <= 0.0f)
    {
        return float3(0.0f);
    }
    float3 PosLocal = MulMat4Point(Occupants[0].WorldToLocal, Position);
    if (any(PosLocal < float3(-2.3f, -1.35f, -0.4f)) || any(PosLocal > float3(1.8f, 1.35f, 1.45f)))
    {
        return float3(0.0f);
    }

    float Gain = Brightness * Scale;
    float3 TabIrr = EvaluateSingleScreenRectNee(
        Position, Normal, View, Surface, Pair,
        HmiTabletCenterLocal, HmiTabletRightLocal, HmiTabletUpLocal, HmiTabletNormalLocal,
        HmiTabletHalfSize, HmiTabletArea, HmiTabletTint, 4.8f * Gain, RtHmiTabletTexture, TraceVis, true);

    float2 CluPair = frac(Pair + float2(0.618034f, 0.381966f));
    float3 CluIrr = EvaluateSingleScreenRectNee(
        Position, Normal, View, Surface, CluPair,
        HmiClusterCenterLocal, HmiClusterRightLocal, HmiClusterUpLocal, HmiClusterNormalLocal,
        HmiClusterHalfSize, HmiClusterArea, HmiClusterTint, 4.4f * Gain, RtHmiClusterTexture, TraceVis, true);

    return TabIrr + CluIrr;
}

//------------------------------------------------------------------------------------------------------------------------
//                                  NEXT-EVENT ESTIMATION (NEE) WITH VEACH MIS & RIS
//------------------------------------------------------------------------------------------------------------------------

float3 EvaluateDirectNextEvent(float3        Position,
                               float3        Normal,
                               float3        View,
                               SurfaceSample Surface,
                               inout uint    Seed,
                               bool          DiffuseOnly,
                               bool          TraceLightShadow)
{
    float3 Total      = float3(0.0f);
    float3 RayOrigin  = Position + Normal * RayEpsilon;
    bool   RtShadows  = FeatureEnabled(Frame, FeatureRayTracedShadows);

    // 1. Directional Solar Cone NEE with MIS
    if (ResolveLuminance(Frame.SunIlluminance) > 1.0e-4f)
    {
        float  U0     = AdvanceUniform(Seed);
        float  U1     = AdvanceUniform(Seed);
        float3 SunDir = SampleSunConeDirection(Frame.SunDirection, float2(U0, U1));
        float  NdotL  = dot(Normal, SunDir);
        if (NdotL > 0.0f)
        {
            float Vis = 1.0f;
            if (FeatureEnabled(Frame, FeatureDirectShadow))
            {
                Vis = RtShadows
                    ? TraceSceneVisibility(RayOrigin, SunDir, RayEpsilon, 400.0f)
                    : TraverseSceneShadow(Position + Normal * ResolveSurfaceBias(Position), SunDir, 0.02f, 400.0f, 6.0f);
            }
            if (Vis > 0.0f)
            {
                if (DiffuseOnly)
                {
                    Total += Frame.SunIlluminance * NdotL * Vis;
                }
                else
                {
                    Total += Frame.SunIlluminance * Vis * ResolveDirectReflectance(Surface, Normal, View, SunDir);
                }
            }
        }
    }

    // 2. Tyre Fire Point Light NEE
    if (Frame.FireLightIntensity > 0.0f)
    {
        FireArrival Fire = ResolveFireArrival(Position, Normal);
        float       NdotF = max(dot(Normal, Fire.Direction), 0.0f);
        if (NdotF > 0.0f && any(Fire.Illuminance > float3(0.0f)))
        {
            if (DiffuseOnly)
            {
                Total += Fire.Illuminance * NdotF;
            }
            else
            {
                Total += Fire.Illuminance * ResolveDirectReflectance(Surface, Normal, View, Fire.Direction);
            }
        }
    }

    // 3. Cabin HMI Screens (Tablet + Cluster) Rectangular Area-Light NEE with Veach MIS
    float H0 = AdvanceUniform(Seed);
    float H1 = AdvanceUniform(Seed);
    float3 HmiIrr = EvaluateHmiAreaLightNee(Position, Normal, View, Surface, float2(H0, H1), RtShadows && TraceLightShadow);
    if (any(HmiIrr > float3(0.0f)))
    {
        if (DiffuseOnly)
        {
            Total += HmiIrr;
        }
        else
        {
            Total += ResolveDiffuseAlbedo(Surface) * InversePi * HmiIrr;
        }
    }

    // 4. Clustered Lights (Omni, IES StreetLamp, Automotive Headlights & Roof Floodlights) via inline RIS
    int CellIdx = ResolveClusterCellIndex(RtSceneLights.GridMinimum, RtSceneLights.GridScale, Position);
    if (CellIdx != -1)
    {
        uint4 Pair  = RtSceneLights.CellMasks[uint(max(CellIdx, 0)) >> 1u];
        uint2 Mask2 = ResolveClusterMaskFromPair(CellIdx, Pair, RtSceneLights.GridMinimum.w);
        if ((Mask2.x | Mask2.y) != 0u)
        {
            float3 ChosenContrib = float3(0.0f);
            float3 ChosenDir     = float3(0.0f, 0.0f, 1.0f);
            float  ChosenDist    = 0.0f;
            float  ChosenTarget  = 0.0f;
            float  WeightSum     = 0.0f;
            uint   LightCount    = 0u;

            for (uint Word = 0u; Word < 2u; Word++)
            {
                uint Mask = (Word == 1u) ? Mask2.y : Mask2.x;
                uint Base = Word * 32u;
                while (Mask != 0u && LightCount < 32u)
                {
                    uint Bit   = firstbitlow(Mask);
                    Mask      &= Mask - 1u;
                    LightRecord Light   = RtSceneLights.Lights[Base + Bit];
                    float3      Arrival = EvaluateLightArrival(Light, Position, Normal);
                    if (any(Arrival > float3(0.0f)))
                    {
                        float3 Offset = Light.PositionType.xyz - Position;
                        float  Dist   = length(Offset);
                        float3 L      = Offset / max(Dist, 1.0e-4f);
                        float  NdotL  = max(dot(Normal, L), 0.0f);
                        float3 Contrib = DiffuseOnly
                                       ? (Arrival * NdotL)
                                       : (Arrival * ResolveDirectReflectance(Surface, Normal, View, L));
                        float  Target = ResolveLuminance(Contrib);
                        if (Target > 1.0e-5f)
                        {
                            LightCount++;
                            WeightSum += Target;
                            if (AdvanceUniform(Seed) * WeightSum < Target)
                            {
                                ChosenContrib = Contrib;
                                ChosenDir     = L;
                                ChosenDist    = Dist;
                                ChosenTarget  = Target;
                            }
                        }
                    }
                }
            }

            if (ChosenTarget > 0.0f)
            {
                float Vis = 1.0f;
                if (TraceLightShadow && RtShadows && FeatureEnabled(Frame, FeatureDirectShadow))
                {
                    Vis = TraceSceneVisibility(RayOrigin, ChosenDir, RayEpsilon, max(ChosenDist - 0.60f, RayEpsilon));
                }
                Total += ChosenContrib * (WeightSum / ChosenTarget) * Vis;
            }
        }
    }

    return Total;
}

//------------------------------------------------------------------------------------------------------------------------
//                                      MULTI-BOUNCE PATH INTEGRATOR (GI & REFLECTIONS)
//------------------------------------------------------------------------------------------------------------------------

struct TracedPathSample
{
    float3 FirstPosition; // [m]   x_s of first bounce (for ReSTIR reconnection)
    float3 FirstNormal;   // [-]   n_s at first bounce
    float3 Radiance;      // [-]   accumulated multi-bounce outgoing radiance arriving along first bounce
    uint   FirstIdentity; // [-]   occupant identity of first bounce (or SkyIdentity)
    bool   Valid;
};

TracedPathSample TraceMultiBouncePath(float3 PrimaryPos,
                                      float3 PrimaryNormal,
                                      float3 PrimaryDirection,
                                      uint   MaxBounces,
                                      inout uint Seed)
{
    TracedPathSample Result;
    Result.FirstPosition = PrimaryPos + PrimaryDirection * SkyReach;
    Result.FirstNormal   = -PrimaryDirection;
    Result.Radiance      = float3(0.0f);
    Result.FirstIdentity = SkyIdentity;
    Result.Valid         = true;

    float3 Origin     = PrimaryPos + PrimaryNormal * RayEpsilon;
    float3 Direction  = PrimaryDirection;
    float3 Throughput = float3(1.0f);
    float  PrevPdf    = 1.0f;

    bool UseRR        = FeatureEnabled(Frame, FeatureRussianRoulette);
    bool UseSecondNee = FeatureEnabled(Frame, FeatureMultiBounceNEE);
    bool UseFirefly   = FeatureEnabled(Frame, FeatureFireflyFilter);
    uint BounceLimit  = clamp(MaxBounces, 1u, 6u);

    for (uint Bounce = 0u; Bounce < BounceLimit; Bounce++)
    {
        RayHitResult Hit = TraceSceneRay(Origin, Direction, RayEpsilon, 300.0f);
        if (!Hit.Hit)
        {
            float3 SkyRad = SampleSkyRadiance(Direction);
            if (Bounce > 0u && ResolveLuminance(Frame.SunIlluminance) > 0.0f)
            {
                float SunDot = dot(Direction, Frame.SunDirection);
                if (SunDot >= SunConeCosHalfAngle)
                {
                    float ConeSolidAngle = 6.28318530718f * (1.0f - SunConeCosHalfAngle);
                    float LightPdf       = 1.0f / max(ConeSolidAngle, 1.0e-6f);
                    float MisW           = EvaluateMisWeight(PrevPdf, LightPdf);
                    SkyRad              += (Frame.SunIlluminance / max(ConeSolidAngle, 1.0e-5f)) * MisW;
                }
            }
            Result.Radiance += Throughput * SkyRad;
            break;
        }

        if (Bounce == 0u)
        {
            Result.FirstPosition = Hit.Position;
            Result.FirstNormal   = Hit.Normal;
            Result.FirstIdentity = Hit.Identity;
        }

        MaterialRecord Mat     = RtMaterials[Hit.Family];
        SurfaceSample  Surface = ProjectSurfaceSample(Mat);
        float3         View    = -Direction;

        // 1. Authored surface emission & live HMI screen emission at hit vertex
        if (any(Surface.Emission > float3(0.0f)))
        {
            Result.Radiance += Throughput * Surface.Emission * Frame.EmissionScale;
        }
        if (Hit.Family == DisplayGlassFamily)
        {
            float3 ScreenEmit = EvaluateDisplayScreenEmission(Hit.Identity, Hit.Position);
            float  HmiScale   = ResolveHmiScale(Frame);
            if (any(ScreenEmit > float3(0.0f)))
            {
                float EmitMis = (Bounce == 0u) ? 0.35f : 0.25f;
                Result.Radiance += Throughput * ScreenEmit * HmiScale * EmitMis;
            }
        }

        // 2. Direct illumination (NEE) at this hit vertex
        bool DoNeeHere = (Bounce == 0u) || UseSecondNee;
        if (DoNeeHere)
        {
            bool   TraceLightVis = (Bounce == 0u);
            float3 DirectIrr     = EvaluateDirectNextEvent(Hit.Position, Hit.Normal, View, Surface, Seed, true, TraceLightVis);
            float3 DiffuseReflect = ResolveDiffuseAlbedo(Surface) * InversePi;
            Result.Radiance     += Throughput * DiffuseReflect * DirectIrr;
        }

        // 3. Last bounce: optionally fold multi-bounce SurfaceCardDepot radiosity tail for infinite-bounce convergence
        if (Bounce + 1u >= BounceLimit)
        {
            if (FeatureEnabled(Frame, FeatureCardRadiosity))
            {
                float4 CardSample = SampleCardRadiance(Hit.Position, Hit.Normal, Hit.Identity, 0.25f);
                if (CardSample.w > 0.0f)
                {
                    Result.Radiance += Throughput * CardSample.rgb * 0.25f;
                }
            }
            break;
        }

        // 4. Sample BSDF for next path segment
        float      R0   = AdvanceUniform(Seed);
        float      R1   = AdvanceUniform(Seed);
        float      R2   = AdvanceUniform(Seed);
        BsdfSample Bsdf = SampleSurfaceBsdf(Surface, Hit.Normal, View, float3(R0, R1, R2));
        if (Bsdf.Pdf <= 1.0e-5f || all(Bsdf.Weight <= float3(0.0f)))
        {
            break;
        }
        Throughput *= Bsdf.Weight;
        PrevPdf     = Bsdf.Pdf;

        // 5. Russian Roulette path termination
        if (UseRR && Bounce >= 1u)
        {
            float Survival = clamp( max(Throughput.x, max(Throughput.y, Throughput.z)), 0.10f, 0.95f);
            if (AdvanceUniform(Seed) > Survival)
            {
                break;
            }
            Throughput /= Survival;
        }

        Origin    = Hit.Position + Hit.Normal * RayEpsilon;
        Direction = Bsdf.Direction;
    }

    if (UseFirefly)
    {
        float Lum      = ResolveLuminance(Result.Radiance);
        float MaxClamp = 18.0f + 2.5f * ResolveLuminance(Frame.SunIlluminance);
        if (Lum > MaxClamp)
        {
            Result.Radiance *= MaxClamp / max(Lum, 1.0e-4f);
        }
    }

    return Result;
}

// 📝 Multi-bounce specular/glossy reflection path tracer for ReflectionTraversal.
float4 TraceMultiBounceReflection(float3 PrimaryPos,
                                  float3 PrimaryNormal,
                                  float3 PrimaryDirection,
                                  uint   MaxBounces,
                                  inout uint Seed)
{
    float3 Origin      = PrimaryPos + PrimaryNormal * RayEpsilon;
    float3 Direction   = PrimaryDirection;
    float3 Throughput  = float3(1.0f);
    float3 Radiance    = float3(0.0f);
    float  FirstTravel = SkyReach;
    uint   BounceLimit = clamp(MaxBounces, 1u, 4u);

    for (uint Bounce = 0u; Bounce < BounceLimit; Bounce++)
    {
        RayHitResult Hit = TraceSceneRay(Origin, Direction, RayEpsilon, 260.0f);
        if (!Hit.Hit)
        {
            float3 SkyRad = SampleSkyRadiance(Direction);
            float  SunDot = dot(Direction, Frame.SunDirection);
            if (SunDot > 0.9995f)
            {
                SkyRad += Frame.SunIlluminance * smoothstep(0.9995f, 0.99992f, SunDot) * 8.0f;
            }
            Radiance += Throughput * SkyRad;
            break;
        }

        if (Bounce == 0u)
        {
            FirstTravel = Hit.Travel;
        }

        MaterialRecord Mat     = RtMaterials[Hit.Family];
        SurfaceSample  Surface = ProjectSurfaceSample(Mat);
        float3         View    = -Direction;

        if (any(Surface.Emission > float3(0.0f)))
        {
            Radiance += Throughput * Surface.Emission * Frame.EmissionScale;
        }
        if (Hit.Family == DisplayGlassFamily)
        {
            Radiance += Throughput * EvaluateDisplayScreenEmission(Hit.Identity, Hit.Position) * ResolveHmiScale(Frame);
        }

        bool   TraceLightVis = (Bounce == 0u);
        float3 Direct        = EvaluateDirectNextEvent(Hit.Position, Hit.Normal, View, Surface, Seed, false, TraceLightVis);
        Radiance            += Throughput * Direct;

        if (FeatureEnabled(Frame, FeatureCardRadiosity))
        {
            float4 CardSample = SampleCardRadiance(Hit.Position, Hit.Normal, Hit.Identity, 0.25f);
            if (CardSample.w > 0.0f)
            {
                float RoughWeight = clamp(Surface.Roughness * 1.25f, 0.20f, 1.0f);
                Radiance += Throughput * CardSample.rgb * RoughWeight * 0.55f;
            }
        }

        if (Bounce + 1u >= BounceLimit || Surface.Roughness > 0.55f)
        {
            break;
        }

        float  NdotV   = max(dot(Hit.Normal, View), 1.0e-4f);
        float3 F0      = ResolveSpecularColour(Surface);
        float3 Fresnel = ResolveFresnel(F0, NdotV);
        if (Surface.CoatWeight > 0.0f)
        {
            float3 CoatF = ResolveFresnel(float3(0.04f), NdotV) * Surface.CoatWeight;
            Fresnel      = max(Fresnel, CoatF);
        }
        Throughput *= Fresnel;
        if (max(Throughput.x, max(Throughput.y, Throughput.z)) < 0.03f)
        {
            break;
        }

        float  Alpha   = max(Surface.Roughness * Surface.Roughness, 0.002f);
        float  U0      = AdvanceUniform(Seed);
        float  U1      = AdvanceUniform(Seed);
        float3 VeLocal = TransformWorldToLocal(Hit.Normal, View);
        float3 HLocal  = SampleVisibleNormalGgx(VeLocal, Alpha, float2(U0, U1));
        float3 Half    = normalize(TransformLocalToWorld(Hit.Normal, HLocal));
        float3 NextDir = reflect(-View, Half);
        if (dot(Hit.Normal, NextDir) <= 1.0e-4f)
        {
            break;
        }

        Origin    = Hit.Position + Hit.Normal * RayEpsilon;
        Direction = NextDir;
    }

    if (FeatureEnabled(Frame, FeatureFireflyFilter))
    {
        float Lum      = ResolveLuminance(Radiance);
        float MaxClamp = 24.0f + 3.0f * ResolveLuminance(Frame.SunIlluminance);
        if (Lum > MaxClamp)
        {
            Radiance *= MaxClamp / max(Lum, 1.0e-4f);
        }
    }

    return float4(Radiance, FirstTravel);
}
