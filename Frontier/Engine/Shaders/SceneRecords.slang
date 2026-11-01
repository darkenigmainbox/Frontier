//==========================================================================================================================================
//                                                             SCENE RECORDS
//==========================================================================================================================================
// 🧩 Record layouts shared by every program — frame, occupant, surface card and material (extended with ScatteringSequence + AutomotivePaint).

#pragma once

//------------------------------------------------------------------------------------------------------------------------
//                                                     FRAME RECORD
//------------------------------------------------------------------------------------------------------------------------

struct MoonBodyRecord
{
    float4 Direction;
    float4 Params;
    float4 Surface;
    float4 Atlas;
};

struct FrameRecord
{
    column_major float4x4 ViewProjection;                   // [-]    jittered, this frame
    column_major float4x4 InverseViewProjection;            // [-]    inverse of the jittered projection
    column_major float4x4 UnjitteredViewProjection;         // [-]    this frame, no sub-pixel offset
    column_major float4x4 PreviousUnjitteredViewProjection; // [-]    previous frame, no sub-pixel offset
    column_major float4x4 View;                             // [-]    world -> view
    float3                CameraPosition;                   // [m]
    uint                  FrameIndex;                       // [-]    monotonic since bring-up
    float3                SunDirection;                     // [-]    unit, toward the light
    float                 ElapsedSeconds;                   // [s]
    float3                SunIlluminance;                   // [lx.k] after atmospheric transmittance
    float                 SkyScale;                         // [-]    multiplies the sky-view radiance
    float2                ScreenExtent;                     // [px]
    float2                InverseScreenExtent;              // [1/px]
    float2                TraceExtent;                      // [px]   resampling resolution
    float2                InverseTraceExtent;               // [1/px]
    float2                Jitter;                           // [ndc]  sub-pixel offset folded into ViewProjection
    uint                  TraceScale;                       // [-]    screen pixels per resampling pixel along one axis
    uint                  Features;                         // [-]    FeatureBit mask
    uint                  InspectionMode;                   // [-]    display inspection selector
    float                 TemporalTallyLimit;               // [-]    M clamp for temporal reuse
    float                 SpatialRadius;                    // [px]   resampling-space radius of spatial reuse
    uint                  SpatialCount;                     // [-]    spatial candidates per pixel
    float3                NightSkyRadiance;                 // [-]    floor radiance of the night sky
    float                 EmissionScale;                    // [-]    multiplies every authored emission
    float                 SliceHeight;                      // [m]    inspection slice through the distance field
    float                 ExposureCompensation;             // [EV]
    float                 IndirectScale;                    // [-]    multiplies the resolved indirect term
    uint                  DistanceInspection;               // [-]    distance inspection selector
    float3                FocusPosition;                    // [m]    centre of the scene distance field cascades
    uint                  InsetEnabled;                     // [-]    draw the distance slice inset
    float3                FireLightPosition;                // [m]    power-weighted centre of the burning tyres
    float                 FireLightIntensity;               // [-]    point intensity; 0 when nothing burns
    float3                FireLightColour;                  // [-]    chromaticity of the flame light
    float                 FireLightReach;                   // [m]    influence radius
    float4                SolarDisc;
    float4                Stars;
    float4                Night;
    float4                Moon;
    float4                MoonFog;
    float4                Aerial;
    float4                Flare;
    float4                FlareHalo;
    float4                FlareOptics;
    float4                SolarRadiance;
    float4                FlareLayers;
    float4                CelestialControl;
    MoonBodyRecord        MoonBodies[4];
    float4                Planets[4];
    float4                FogTint;
    float4                StarControl;
    float4                Twilight;
};

static const uint FeatureIndirect             = 1u;
static const uint FeatureTemporalReuse        = 2u;
static const uint FeatureSpatialReuse         = 4u;
static const uint FeatureVisibilityReuse      = 8u;
static const uint FeatureVarianceKernel       = 16u;
static const uint FeatureReflection           = 32u;
static const uint FeatureCardRadiosity        = 64u;
static const uint FeatureTemporalAntialias    = 128u;
static const uint FeatureDirectShadow         = 256u;
static const uint FeatureAutoExposure         = 512u;
static const uint FeatureRadianceRefresh      = 1024u;
static const uint FeatureTemporalRestart      = 2048u;
static const uint FeatureRayTracing           = 8192u;
static const uint FeatureRayTracedShadows     = 16384u;
static const uint FeatureRussianRoulette      = 32768u;
static const uint FeatureFireflyFilter        = 65536u;
static const uint FeatureMultiBounceNEE       = 131072u;
static const uint FeatureRayTracedReflections = 262144u;

bool FeatureEnabled(FrameRecord Frame, uint Bit)
{
    return (Frame.Features & Bit) != 0u;
}

uint ResolveMaxBounces(FrameRecord Frame)
{
    uint Encoded = (Frame.Features >> 20u) & 7u;
    return (Encoded == 0u) ? 3u : Encoded;
}

uint ResolveInitialCandidates(FrameRecord Frame)
{
    uint Encoded = (Frame.Features >> 24u) & 7u;
    return (Encoded == 0u) ? 2u : Encoded;
}

uint ResolveReflectionBounces(FrameRecord Frame)
{
    uint Encoded = (Frame.Features >> 28u) & 7u;
    return (Encoded == 0u) ? 2u : Encoded;
}

uint ResolveDistanceInspectionMode(FrameRecord Frame)
{
    return Frame.DistanceInspection & 15u;
}

float ResolveReflectionRoughness(FrameRecord Frame)
{
    uint Encoded = (Frame.DistanceInspection >> 8u) & 255u;
    return (Encoded > 0u) ? (float(Encoded) / 255.0f) : 0.80f;
}

float ResolveReflectionScale(FrameRecord Frame)
{
    uint Encoded = (Frame.DistanceInspection >> 16u) & 0xFFFFu;
    return (Encoded > 0u) ? (max(float(Encoded) - 1.0f, 0.0f) / 1000.0f) : 1.0f;
}

float ResolveHmiBrightness(FrameRecord Frame)
{
    uint Encoded = (Frame.InsetEnabled >> 8u) & 0xFFFu;
    return (Encoded > 0u) ? (max(float(Encoded) - 1.0f, 0.0f) / 1000.0f) : 1.0f;
}

float ResolveHmiScale(FrameRecord Frame)
{
    uint Encoded = (Frame.InsetEnabled >> 20u) & 0xFFFu;
    return (Encoded > 0u) ? (float(Encoded) / 1000.0f) : 1.0f;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                   OCCUPANT RECORD
//------------------------------------------------------------------------------------------------------------------------

struct OccupantRecord
{
    column_major float4x4 LocalToWorld;
    column_major float4x4 WorldToLocal;
    column_major float4x4 PreviousLocalToWorld;
    column_major float4x4 PreviousWorldToLocal;
    float3                WorldMinimum;
    uint                  Roles;
    float3                WorldMaximum;
    uint                  MaterialOverride;
    float3                VolumeMinimum;
    float                 VoxelExtent;
    float3                VolumeTexelOrigin;
    uint                  FirstCard;
    float3                VolumeTexelExtent;
    uint                  CardCount;
};

static const uint RoleRaster         = 1u;
static const uint RoleDistance       = 2u;
static const uint RoleCards          = 4u;
static const uint RoleDynamic        = 8u;
static const uint RoleFallback       = 16u;
static const uint RoleShredded       = 32u;
static const uint NoMaterialOverride = 0xFFFFFFFFu;

//------------------------------------------------------------------------------------------------------------------------
//                                                     CARD RECORD
//------------------------------------------------------------------------------------------------------------------------

struct CardRecord
{
    float3 LocalMinimum;
    uint   Axis;
    float3 LocalMaximum;
    uint   Occupant;
    uint2  TexelOrigin;
    uint2  TexelExtent;
};

//------------------------------------------------------------------------------------------------------------------------
//                                                   MATERIAL RECORD
//------------------------------------------------------------------------------------------------------------------------

// Extended with ScatteringSequence (Absorption, CoatingThickness, SheenTint, SheenRoughness) & AutomotivePaint (FlakeTint, FlakeCoverage).
struct MaterialRecord
{
    float3 Albedo;           // [-]   linear Rec.709 reflectance
    float  Roughness;        // [-]   perceptual
    float3 Emission;         // [-]   colour x luminance
    float  Metalness;        // [-]
    float  CoatWeight;       // [-]
    float  CoatRoughness;    // [-]
    float  SpecularLevel;    // [-]   dielectric F0
    float  Transmission;     // [-]
    float3 Absorption;       // [1/m] Beer-Lambert dielectric coating absorption (ScatteringSequence)
    float  CoatingThickness; // [m]   dielectric coating thickness (ScatteringSequence)
    float3 SheenTint;        // [-]   Charlie sheen tint x intensity (ScatteringSequence)
    float  SheenRoughness;   // [-]   Charlie sheen roughness (ScatteringSequence)
    float3 FlakeTint;        // [-]   AutomotivePaint metallic flake tint
    float  FlakeCoverage;    // [-]   AutomotivePaint metallic flake coverage [0..1]
};

//------------------------------------------------------------------------------------------------------------------------
//                                                   SHARED CONSTANTS
//------------------------------------------------------------------------------------------------------------------------

static const float  π               = 3.14159265358979f;
static const float  Pi              = 3.14159265358979f;
static const float  InversePi       = 0.31830988618379f;
static const float3 LuminanceRec709 = float3(0.2126f, 0.7152f, 0.0722f);

float ResolveLuminance(float3 Radiance)
{
    return dot(Radiance, LuminanceRec709);
}

float3x3 ConstructTangentFrame(float3 Normal)
{
    float  Sign      = (Normal.z >= 0.0f) ? 1.0f : -1.0f;
    float  a         = -1.0f / (Sign + Normal.z);
    float  b         = Normal.x * Normal.y * a;
    float3 Tangent   = float3(1.0f + Sign * Normal.x * Normal.x * a, Sign * b, -Sign * Normal.x);
    float3 Bitangent = float3(b, Sign + Normal.y * Normal.y * a, -Normal.y);
    return float3x3(Tangent, Bitangent, Normal);
}

float3 TransformLocalToWorld(float3 Normal, float3 LocalVec)
{
    float3x3 Frame = ConstructTangentFrame(Normal);
    return Frame[0] * LocalVec.x + Frame[1] * LocalVec.y + Frame[2] * LocalVec.z;
}

float3 TransformWorldToLocal(float3 Normal, float3 WorldVec)
{
    float3x3 Frame = ConstructTangentFrame(Normal);
    return float3(dot(WorldVec, Frame[0]), dot(WorldVec, Frame[1]), dot(WorldVec, Frame[2]));
}

float3 MulMat4Point(column_major float4x4 M, float3 P)
{
    return mul(M, float4(P, 1.0f)).xyz;
}

float3 MulMat4Vec(column_major float4x4 M, float3 V)
{
    return mul(M, float4(V, 0.0f)).xyz;
}
