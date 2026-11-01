//==========================================================================================================================================
//                                                           DISTANCE RECORDS
//==========================================================================================================================================
// 🧩 Cascade records of the scene distance field, shared by the union pass that writes it and every pass that traverses it.

#pragma once

struct ClipRecord
{
    int3  OriginVoxel;        // [voxel] world voxel coordinate of the window's minimum corner
    uint  Resolution;         // [voxel] lattice edge
    float VoxelExtent;        // [m]
    float Band;               // [m]     truncation distance written by the union pass
    float InverseWorldExtent; // [1/m]   1 / (Resolution . VoxelExtent)
    float Pad;
};

struct DistanceRecord
{
    ClipRecord Clips[4];
    uint       ClipCount;             // [-]
    uint       DistanceOccupantCount; // [-]  occupants [0, count) own distance volumes
    float      GroundHeight;          // [m]  analytic course plane
    float      HitFraction;           // [-]  surface threshold as a fraction of the voxel edge
    uint       BrickCount;            // [-]  bricks the union pass rewrites this frame
    uint       FrameIndex;            // [-]  stamped into every rewritten brick
    uint       BricksPerAxis;         // [-]  Resolution / BrickEdge
    uint       Pad;
};

static const uint BrickEdge      = 8u;
static const uint SkyIdentity    = 2045u;
static const uint GroundIdentity = 2046u;
static const uint VacantIdentity = 2047u;

// 📝 Toroidal brick slot of a world brick in one cascade — the same wrap the voxels use, so an epoch follows its brick.
uint ResolveBrickSlot(uint Level, int3 WorldBrick, uint BricksPerAxis)
{
    int   Edge    = int(BricksPerAxis);
    uint3 Wrapped = uint3(((WorldBrick % Edge) + Edge) % Edge);
    return Level * BricksPerAxis * BricksPerAxis * BricksPerAxis +
           (Wrapped.z * BricksPerAxis + Wrapped.y) * BricksPerAxis + Wrapped.x;
}

static const uint OccupantEpochBit = 0x80000000u;
static const uint VacantEpoch      = 0xFFFFFFFFu;

uint ConstructBrickEpoch(uint FrameIndex, bool OccupantCaused)
{
    return (FrameIndex & 0x7FFFFFFFu) | (OccupantCaused ? OccupantEpochBit : 0u);
}

float2 ResolveBrickAge(uint Epoch, uint FrameIndex)
{
    if (Epoch == VacantEpoch)
    {
        return float2(1.0e9f, 0.0f);
    }
    uint Written = Epoch & 0x7FFFFFFFu;
    return float2(float((FrameIndex & 0x7FFFFFFFu) - Written), ((Epoch & OccupantEpochBit) != 0u) ? 1.0f : 0.0f);
}
