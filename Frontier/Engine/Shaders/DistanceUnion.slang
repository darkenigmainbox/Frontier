//==========================================================================================================================================
//                                                            DISTANCE UNION
//==========================================================================================================================================
// 🧩 Unites the occupant distance volumes into the invalidated bricks of the four scene distance cascades.

#include "SceneRecords.slang"
#include "DistanceRecords.slang"

[[vk::binding(0, 0)]]  ConstantBuffer<DistanceRecord>         Distance;
[[vk::binding(1, 0)]]  StructuredBuffer<OccupantRecord>       Occupants;
[[vk::binding(2, 0)]]  StructuredBuffer<int4>                 Bricks;
[[vk::binding(3, 0)]]  Texture3D<float4>                      VolumeSpace;
[[vk::binding(4, 0)]]  SamplerState                           VolumeSampler;
[[vk::binding(5, 0)]]  [format("rgba16f")] RWTexture3D<float4> TargetClip0;
[[vk::binding(6, 0)]]  [format("rgba16f")] RWTexture3D<float4> TargetClip1;
[[vk::binding(7, 0)]]  [format("rgba16f")] RWTexture3D<float4> TargetClip2;
[[vk::binding(8, 0)]]  [format("rgba16f")] RWTexture3D<float4> TargetClip3;
[[vk::binding(9, 0)]]  RWStructuredBuffer<uint>               BrickEpochs;
[[vk::binding(10, 0)]] RWStructuredBuffer<uint>               CulledCounts;

static const uint PageSize = 64u;

groupshared uint           CandidateCount;
groupshared uint           CandidateIndices[64];
groupshared OccupantRecord StagedOccupants[64];

float MeasureBoxDistance(float3 Point, float3 Minimum, float3 Maximum)
{
    float3 Outside = max(max(Minimum - Point, Point - Maximum), float3(0.0f));
    return length(Outside);
}

float SampleOccupantDistance(OccupantRecord Occupant, float3 WorldPosition, float3 SpaceInverse)
{
    float3 Local         = MulMat4Point(Occupant.WorldToLocal, WorldPosition);
    float3 Maximum       = Occupant.VolumeMinimum + Occupant.VolumeTexelExtent * Occupant.VoxelExtent;
    float3 Clamped       = clamp(Local, Occupant.VolumeMinimum + 0.5f * Occupant.VoxelExtent, Maximum - 0.5f * Occupant.VoxelExtent);
    float3 Outside       = Local - Clamped;
    float  OutsideLength = length(Outside);
    float3 Texel         = Occupant.VolumeTexelOrigin + (Clamped - Occupant.VolumeMinimum) / Occupant.VoxelExtent;
    float  Sampled       = VolumeSpace.SampleLevel(VolumeSampler, Texel * SpaceInverse, 0.0f).x;
    return Sampled + OutsideLength;
}

void WriteClipTexel(uint Level, int3 Texel, float4 Value)
{
    if (Level == 0u)      { TargetClip0[Texel] = Value; }
    else if (Level == 1u) { TargetClip1[Texel] = Value; }
    else if (Level == 2u) { TargetClip2[Texel] = Value; }
    else                  { TargetClip3[Texel] = Value; }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void UniteDistance(uint3 Group : SV_GroupID, uint Lane : SV_GroupIndex)
{
    uint BrickIndex = Group.x + Group.y * 65535u;
    if (BrickIndex >= Distance.BrickCount)
    {
        return;
    }

    int4   Brick         = Bricks[BrickIndex];
    uint   Level         = uint(Brick.w & 3);
    bool   DynamicCause  = (Brick.w & 4) != 0;
    ClipRecord Clip      = Distance.Clips[Level];
    float  BrickWorld    = float(BrickEdge) * Clip.VoxelExtent;
    float3 BrickMinimum  = float3(Brick.xyz * int(BrickEdge)) * Clip.VoxelExtent;
    float3 BrickMaximum  = BrickMinimum + float3(BrickWorld);
    float3 BandPadding   = float3(Clip.Band);
    int    Resolution    = int(Clip.Resolution);

    uint3 SpaceDims;
    VolumeSpace.GetDimensions(SpaceDims.x, SpaceDims.y, SpaceDims.z);
    float3 SpaceInverse = 1.0f / float3(max(SpaceDims, uint3(1u)));

    float Nearest[8];
    uint  NearestId[8];
    for (uint Slice = 0u; Slice < 8u; Slice++)
    {
        Nearest[Slice]   = Clip.Band;
        NearestId[Slice] = VacantIdentity;
    }

    uint Total = Distance.DistanceOccupantCount;
    for (uint Base = 0u; Base < Total; Base += PageSize)
    {
        if (Lane == 0u)
        {
            CandidateCount = 0u;
        }
        GroupMemoryBarrierWithGroupSync();

        uint Index = Base + Lane;
        if (Index < Total)
        {
            OccupantRecord Occupant = Occupants[Index];
            if ((Occupant.Roles & RoleDistance) != 0u)
            {
                bool Disjoint = any(Occupant.WorldMaximum + BandPadding < BrickMinimum) ||
                                any(Occupant.WorldMinimum - BandPadding > BrickMaximum);
                if (!Disjoint)
                {
                    uint Slot = 0u;
                    InterlockedAdd(CandidateCount, 1u, Slot);
                    CandidateIndices[Slot] = Index;
                }
            }
        }
        GroupMemoryBarrierWithGroupSync();

        uint Count = CandidateCount;
        if (Lane < Count)
        {
            StagedOccupants[Lane] = Occupants[CandidateIndices[Lane]];
        }
        GroupMemoryBarrierWithGroupSync();

        if (Count > 0u)
        {
            int2 LocalXY = int2(int(Lane & 7u), int(Lane >> 3u));
            for (uint Slice = 0u; Slice < 8u; Slice++)
            {
                int3   WorldVoxel = Brick.xyz * int(BrickEdge) + int3(LocalXY.x, LocalXY.y, int(Slice));
                float3 Position   = (float3(WorldVoxel) + 0.5f) * Clip.VoxelExtent;
                float  Best       = Nearest[Slice];
                uint   BestId     = NearestId[Slice];
                for (uint Slot = 0u; Slot < Count; Slot++)
                {
                    OccupantRecord Occupant = StagedOccupants[Slot];
                    if (MeasureBoxDistance(Position, Occupant.WorldMinimum, Occupant.WorldMaximum) >= Best)
                    {
                        continue;
                    }
                    float Candidate = SampleOccupantDistance(Occupant, Position, SpaceInverse);
                    if (Candidate < Best)
                    {
                        Best   = Candidate;
                        BestId = CandidateIndices[Slot];
                    }
                }
                Nearest[Slice]   = Best;
                NearestId[Slice] = BestId;
            }
        }
        GroupMemoryBarrierWithGroupSync();
    }

    int2 LocalXY = int2(int(Lane & 7u), int(Lane >> 3u));
    for (uint Slice = 0u; Slice < 8u; Slice++)
    {
        int3   WorldVoxel     = Brick.xyz * int(BrickEdge) + int3(LocalXY.x, LocalXY.y, int(Slice));
        float3 Position       = (float3(WorldVoxel) + 0.5f) * Clip.VoxelExtent;
        float  Best           = Nearest[Slice];
        uint   BestId         = NearestId[Slice];
        float  GroundDistance = Position.z - Distance.GroundHeight;
        if (GroundDistance < Best)
        {
            Best   = GroundDistance;
            BestId = GroundIdentity;
        }
        int3 Texel = ((WorldVoxel % Resolution) + Resolution) % Resolution;
        WriteClipTexel(Level, Texel, float4(clamp(Best, -Clip.Band, Clip.Band), float(BestId), 0.0f, 1.0f));
    }

    if (Lane == 0u)
    {
        uint BrickSlot         = ResolveBrickSlot(Level, Brick.xyz, Distance.BricksPerAxis);
        BrickEpochs[BrickSlot] = ConstructBrickEpoch(Distance.FrameIndex, DynamicCause);
        CulledCounts[BrickIndex] = CandidateCount;
    }
}
