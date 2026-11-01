//==========================================================================================================================================
//                                                          DISTANCE TRAVERSAL
//==========================================================================================================================================
// 🧩 Sphere traversal of the ONE scene distance field — four nested toroidal cascades, never a walk over occupants.

#pragma once

#include "DistanceRecords.slang"

static const uint MaximumTraversalSteps = 64u;

[[vk::binding(0, 1)]] ConstantBuffer<DistanceRecord> Distance;
[[vk::binding(1, 1)]] Texture3D<float4>              SceneClip0;
[[vk::binding(2, 1)]] Texture3D<float4>              SceneClip1;
[[vk::binding(3, 1)]] Texture3D<float4>              SceneClip2;
[[vk::binding(4, 1)]] Texture3D<float4>              SceneClip3;
[[vk::binding(5, 1)]] SamplerState                   SceneSampler;
[[vk::binding(6, 1)]] StructuredBuffer<uint>         BrickEpochs;

//------------------------------------------------------------------------------------------------------------------------
//                                                  CASCADE ADDRESSING
//------------------------------------------------------------------------------------------------------------------------

float4 SampleClipTexel(uint Level, float3 Uvw)
{
    if (Level == 0u)      { return SceneClip0.SampleLevel(SceneSampler, Uvw, 0.0f); }
    else if (Level == 1u) { return SceneClip1.SampleLevel(SceneSampler, Uvw, 0.0f); }
    else if (Level == 2u) { return SceneClip2.SampleLevel(SceneSampler, Uvw, 0.0f); }
    else                  { return SceneClip3.SampleLevel(SceneSampler, Uvw, 0.0f); }
}

float4 LoadClipTexel(uint Level, int3 Texel)
{
    if (Level == 0u)      { return SceneClip0.Load(int4(Texel, 0)); }
    else if (Level == 1u) { return SceneClip1.Load(int4(Texel, 0)); }
    else if (Level == 2u) { return SceneClip2.Load(int4(Texel, 0)); }
    else                  { return SceneClip3.Load(int4(Texel, 0)); }
}

bool ClipContains(uint Level, float3 Position, float MarginVoxels)
{
    ClipRecord Clip  = Distance.Clips[Level];
    float3     Voxel = Position / Clip.VoxelExtent;
    float3     Low   = float3(Clip.OriginVoxel) + float3(MarginVoxels);
    float3     High  = float3(Clip.OriginVoxel) + float3(float(Clip.Resolution) - MarginVoxels);
    return all(Voxel >= Low) && all(Voxel <= High);
}

uint ResolveFinestClip(float3 Position, float MarginVoxels)
{
    for (uint Level = 0u; Level < Distance.ClipCount; Level++)
    {
        if (ClipContains(Level, Position, MarginVoxels))
        {
            return Level;
        }
    }
    return Distance.ClipCount;
}

float SampleClipDistance(uint Level, float3 Position)
{
    return SampleClipTexel(Level, Position * Distance.Clips[Level].InverseWorldExtent).x;
}

uint ResolveClipIdentity(uint Level, float3 Position)
{
    ClipRecord Clip       = Distance.Clips[Level];
    int3       Voxel      = int3(floor(Position / Clip.VoxelExtent));
    int        Resolution = int(Clip.Resolution);
    int3       Texel      = ((Voxel % Resolution) + Resolution) % Resolution;
    return uint(LoadClipTexel(Level, Texel).y + 0.5f);
}

float3 ResolveClipNormal(uint Level, float3 Position)
{
    float  Step     = Distance.Clips[Level].VoxelExtent * 0.75f;
    float3 Gradient = float3(SampleClipDistance(Level, Position + float3(Step, 0.0f, 0.0f)) - SampleClipDistance(Level, Position - float3(Step, 0.0f, 0.0f)),
                             SampleClipDistance(Level, Position + float3(0.0f, Step, 0.0f)) - SampleClipDistance(Level, Position - float3(0.0f, Step, 0.0f)),
                             SampleClipDistance(Level, Position + float3(0.0f, 0.0f, Step)) - SampleClipDistance(Level, Position - float3(0.0f, 0.0f, Step)));
    float  Length   = length(Gradient);
    return (Length > 1.0e-6f) ? (Gradient / Length) : float3(0.0f, 0.0f, 1.0f);
}

float2 SampleSceneDistance(float3 Position)
{
    uint Level = ResolveFinestClip(Position, 1.0f);
    if (Level >= Distance.ClipCount)
    {
        return float2(Position.z - Distance.GroundHeight, float(Distance.ClipCount));
    }
    return float2(SampleClipDistance(Level, Position), float(Level));
}

float ResolveSurfaceBias(float3 Position)
{
    uint Level = min(ResolveFinestClip(Position, 2.0f), Distance.ClipCount - 1u);
    return Distance.Clips[Level].VoxelExtent;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                   SPHERE TRAVERSAL
//------------------------------------------------------------------------------------------------------------------------

struct TraversalHit
{
    float3 Position; // [m]
    float  Travel;   // [m]   ray parameter at the surface
    float3 Normal;   // [-]   distance gradient
    uint   Identity; // [-]   occupant, GroundIdentity, or SkyIdentity on a miss
    uint   Level;    // [-]   cascade that answered; ClipCount for the far-field plane
    uint   Steps;    // [-]
    bool   Hit;
};

TraversalHit TraverseSceneDistance(float3 Origin, float3 Direction, float MinimumTravel, float MaximumTravel, float ConeSlope)
{
    TraversalHit Result;
    Result.Hit      = false;
    Result.Identity = SkyIdentity;
    Result.Level    = Distance.ClipCount;
    Result.Steps    = 0u;
    Result.Normal   = -Direction;
    Result.Travel   = MaximumTravel;
    Result.Position = Origin + Direction * MaximumTravel;

    float Travel    = MinimumTravel;
    bool  Escaped   = false;
    bool  Exhausted = true;
    for (uint Step = 0u; Step < MaximumTraversalSteps; Step++)
    {
        float3 Position = Origin + Direction * Travel;
        uint   Level    = ResolveFinestClip(Position, 2.0f);
        if (Level >= Distance.ClipCount)
        {
            Escaped   = true;
            Exhausted = false;
            break;
        }
        ClipRecord Clip       = Distance.Clips[Level];
        float      Sampled    = SampleClipDistance(Level, Position);
        float      Saturation = Clip.Band * 0.9f;
        uint       Coarser    = Level + 1u;
        while (Sampled >= Saturation && Coarser < Distance.ClipCount)
        {
            if (!ClipContains(Coarser, Position, 2.0f))
            {
                break;
            }
            ClipRecord CoarseClip = Distance.Clips[Coarser];
            Sampled    = max(Sampled, SampleClipDistance(Coarser, Position) - 0.5f * CoarseClip.VoxelExtent);
            Saturation = CoarseClip.Band * 0.9f;
            Coarser++;
        }
        Result.Steps    = Step + 1u;
        float Threshold = max(Clip.VoxelExtent * Distance.HitFraction, Travel * ConeSlope);
        if (Sampled < Threshold)
        {
            Result.Hit      = true;
            Result.Travel   = Travel;
            Result.Position = Position;
            Result.Level    = Level;
            Exhausted       = false;
            break;
        }
        Travel += max(Sampled, Clip.VoxelExtent * 0.125f);
        if (Travel > MaximumTravel)
        {
            Exhausted = false;
            break;
        }
    }

    if (Result.Hit)
    {
        Result.Normal   = ResolveClipNormal(Result.Level, Result.Position);
        float3 Inward   = Result.Position - Result.Normal * (0.5f * Distance.Clips[Result.Level].VoxelExtent);
        Result.Identity = ResolveClipIdentity(Result.Level, Inward);
        return Result;
    }
    if (Exhausted)
    {
        float3 Position = Origin + Direction * Travel;
        uint   Level    = min(ResolveFinestClip(Position, 2.0f), Distance.ClipCount - 1u);
        Result.Hit      = true;
        Result.Travel   = Travel;
        Result.Position = Position;
        Result.Level    = Level;
        Result.Normal   = ResolveClipNormal(Level, Position);
        Result.Identity = ResolveClipIdentity(Level, Position);
        return Result;
    }
    if (Escaped && Direction.z < -1.0e-4f)
    {
        float GroundTravel = (Distance.GroundHeight - Origin.z) / Direction.z;
        if (GroundTravel >= MinimumTravel && GroundTravel <= MaximumTravel)
        {
            Result.Hit      = true;
            Result.Travel   = GroundTravel;
            Result.Position = Origin + Direction * GroundTravel;
            Result.Normal   = float3(0.0f, 0.0f, 1.0f);
            Result.Identity = GroundIdentity;
            Result.Level    = Distance.ClipCount;
        }
    }
    return Result;
}

float TraverseSceneVisibility(float3 Origin, float3 Direction, float MinimumTravel, float MaximumTravel)
{
    TraversalHit Hit = TraverseSceneDistance(Origin, Direction, MinimumTravel, MaximumTravel, 0.0f);
    return (Hit.Hit && Hit.Travel < MaximumTravel) ? 0.0f : 1.0f;
}

float TraverseSceneShadow(float3 Origin, float3 Direction, float MinimumTravel, float MaximumTravel, float Hardness)
{
    float Travel     = MinimumTravel;
    float Visibility = 1.0f;
    for (uint Step = 0u; Step < MaximumTraversalSteps; Step++)
    {
        float3 Position = Origin + Direction * Travel;
        uint   Level    = ResolveFinestClip(Position, 2.0f);
        if (Level >= Distance.ClipCount)
        {
            if (Direction.z < -1.0e-4f)
            {
                return 0.0f;
            }
            return Visibility;
        }
        ClipRecord Clip       = Distance.Clips[Level];
        float      Sampled    = SampleClipDistance(Level, Position);
        float      Saturation = Clip.Band * 0.9f;
        uint       Coarser    = Level + 1u;
        while (Sampled >= Saturation && Coarser < Distance.ClipCount)
        {
            if (!ClipContains(Coarser, Position, 2.0f))
            {
                break;
            }
            ClipRecord CoarseClip = Distance.Clips[Coarser];
            Sampled    = max(Sampled, SampleClipDistance(Coarser, Position) - 0.5f * CoarseClip.VoxelExtent);
            Saturation = CoarseClip.Band * 0.9f;
            Coarser++;
        }
        if (Sampled < Clip.VoxelExtent * Distance.HitFraction)
        {
            return 0.0f;
        }
        Visibility = min(Visibility, Hardness * Sampled / max(Travel, 1.0e-3f));
        Travel    += max(Sampled, Clip.VoxelExtent * 0.125f);
        if (Travel > MaximumTravel)
        {
            break;
        }
    }
    return clamp(Visibility, 0.0f, 1.0f);
}
