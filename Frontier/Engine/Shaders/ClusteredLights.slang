//==========================================================================================================================================
//                                                          CLUSTERED LIGHTS
//==========================================================================================================================================
// 🧩 3D world-space clustered lighting evaluation (Omni, IES StreetLamp, Automotive LowBeam/HighBeam/Fog, and Roof Floodlight).

#pragma once

struct LightRecord
{
    float4 PositionType;    // .xyz = Position [m],  .w = Type (0:Omni, 1:StreetLamp, 2:LowBeam, 3:HighBeam, 4:Fog, 5:Floodlight)
    float4 DirectionReach;  // .xyz = Direction [-], .w = Reach [m]
    float4 ColourIntensity; // .xyz = Colour [-],    .w = Intensity [cd]
    float4 Params;          // .x   = InnerCos,      .y = OuterCos, .z = IESParam, .w = Active
};

struct ClusteredLightBuffer
{
    LightRecord Lights[64];
    float4      GridMinimum;    // .xyz = Minimum [m],     .w = ActiveLightCount
    float4      GridScale;      // .xyz = Res / Extent,    .w = CullEnabled (1.0 = clustered, 0.0 = brute force)
    uint4       CellMasks[512]; // 1024 cells * 2 u32 words packed as 512 uint4
};

static const uint LightTypeOmni       = 0u;
static const uint LightTypeStreetLamp = 1u;
static const uint LightTypeLowBeam    = 2u;
static const uint LightTypeHighBeam   = 3u;
static const uint LightTypeFog        = 4u;
static const uint LightTypeFloodlight = 5u;

// 📝 Evaluates the directional photometric distribution I(theta, phi) in [0, 1].
float EvaluateLightPhotometry(LightRecord Light, float3 LightToSurface)
{
    uint Type = uint(Light.PositionType.w + 0.5f);
    if (Type == LightTypeOmni)
    {
        return 1.0f;
    }

    float3 Forward  = Light.DirectionReach.xyz;
    float  CosTheta = dot(Forward, LightToSurface);

    // Type 1: IES StreetLamp (Type II / Type III roadway batwing distribution)
    if (Type == LightTypeStreetLamp)
    {
        if (CosTheta <= 0.0f)
        {
            return 0.0f;
        }
        float SinTheta = sqrt(max(0.0f, 1.0f - CosTheta * CosTheta));
        float Batwing  = 0.45f + 1.35f * SinTheta * SinTheta * pow(CosTheta, 0.45f);
        float Cutoff   = smoothstep(0.02f, 0.22f, CosTheta);
        return Batwing * Cutoff;
    }

    // Cone spot window shared by automotive beams and floodlights
    float InnerCos = Light.Params.x;
    float OuterCos = Light.Params.y;
    if (CosTheta <= OuterCos)
    {
        return 0.0f;
    }
    float Spot = clamp((CosTheta - OuterCos) / max(InnerCos - OuterCos, 1.0e-4f), 0.0f, 1.0f);
    Spot       = Spot * Spot * (3.0f - 2.0f * Spot);

    // Type 2: Automotive Low Beam (sharp horizontal ECE/SAE anti-glare cutoff)
    if (Type == LightTypeLowBeam)
    {
        float PitchZ          = LightToSurface.z - Forward.z;
        float Cutoff          = 1.0f - smoothstep(-0.02f, 0.035f, PitchZ);
        float HotSpot         = 1.0f + 0.65f * pow(max(0.0f, CosTheta), 24.0f);
        return Spot * Cutoff * HotSpot;
    }

    // Type 3: Automotive High Beam (tight long-range pencil hotspot)
    if (Type == LightTypeHighBeam)
    {
        float Pencil = pow(max(0.0f, CosTheta), max(Light.Params.z, 8.0f));
        return Spot * (0.4f + 1.6f * Pencil);
    }

    // Type 4: Fog Beam (wide fan with razor-sharp top cutoff)
    if (Type == LightTypeFog)
    {
        float PitchZ    = LightToSurface.z - Forward.z;
        float TopCutoff = 1.0f - smoothstep(-0.01f, 0.015f, PitchZ);
        float Band      = exp(-PitchZ * PitchZ * 45.0f);
        return Spot * TopCutoff * (0.6f + 0.8f * Band);
    }

    // Type 5: Roof Floodlight (broad multi-lens work bar / rally pod)
    float Exponent = max(Light.Params.z, 2.0f);
    return Spot * pow(max(0.0f, CosTheta), 0.35f * Exponent);
}

// 📝 Evaluates unshadowed arriving illuminance (irradiance perpendicular to light ray) at a surface point.
float3 EvaluateLightArrival(LightRecord Light, float3 Position, float3 Normal)
{
    if (Light.Params.w <= 0.0f || Light.ColourIntensity.w <= 0.0f)
    {
        return float3(0.0f);
    }
    float3 Toward  = Light.PositionType.xyz - Position;
    float  DistSq  = dot(Toward, Toward);
    float  Reach   = Light.DirectionReach.w;
    if (DistSq >= Reach * Reach)
    {
        return float3(0.0f);
    }
    float  Dist = sqrt(max(DistSq, 1.0e-6f));
    float3 L    = Toward / Dist;
    if (dot(Normal, L) <= 0.0f)
    {
        return float3(0.0f);
    }

    float Photometry = EvaluateLightPhotometry(Light, -L);
    if (Photometry <= 1.0e-5f)
    {
        return float3(0.0f);
    }

    // Smooth Karis windowed inverse-square attenuation: (1 - (d/R)^4)^2 / max(d^2, d_min^2)
    float Ratio2      = DistSq / (Reach * Reach);
    float WindowTerm  = max(0.0f, 1.0f - Ratio2 * Ratio2);
    float Attenuation = (WindowTerm * WindowTerm) / max(DistSq, 0.35f);

    return Light.ColourIntensity.xyz * (Light.ColourIntensity.w * Photometry * Attenuation);
}

// 📝 Resolves the 3D cluster cell index [0..1023] for a world position, or -1 if outside the cluster volume.
int ResolveClusterCellIndex(float4 GridMin, float4 GridScale, float3 Position)
{
    if (GridScale.w < 0.5f)
    {
        return -2; // Special sentinel: culling disabled, iterate all active lights
    }
    float3 Rel = (Position - GridMin.xyz) * GridScale.xyz;
    if (any(Rel < float3(0.0f)) || any(Rel >= float3(16.0f, 16.0f, 4.0f)))
    {
        return -1;
    }
    uint3 Coord = uint3(Rel);
    return int((Coord.z * 16u + Coord.y) * 16u + Coord.x);
}

// 📝 Unpacks the 64-bit light bitmask (uint2) for a given cell index from the packed uint4 array.
uint2 ResolveClusterMaskFromPair(int CellIndex, uint4 Pair, float ActiveCountF)
{
    if (CellIndex == -2)
    {
        uint ActiveCount = uint(ActiveCountF + 0.5f);
        uint Lo          = (ActiveCount >= 32u) ? 0xFFFFFFFFu : ((1u << ActiveCount) - 1u);
        uint Hi          = (ActiveCount >= 64u) ? 0xFFFFFFFFu : ((ActiveCount > 32u) ? ((1u << (ActiveCount - 32u)) - 1u) : 0u);
        return uint2(Lo, Hi);
    }
    if ((uint(CellIndex) & 1u) == 0u)
    {
        return Pair.xy;
    }
    return Pair.zw;
}
