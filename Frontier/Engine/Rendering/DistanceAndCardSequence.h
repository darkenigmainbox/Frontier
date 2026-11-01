/*==========================================================================================================================================
                                                     DISTANCE AND CARD SEQUENCE
                                     ------------------------------------------------------------------
                 Per-occupant 8x8x8 signed-distance brick atlas (64^3 R16F), 4-cascade toroidal world SDF
                   (16 m / 48 m / 128 m / 384 m), and 6-direction 512x512 surface radiosity card depot
                      ported 1:1 from OccupantDistanceSpace.js, SceneDistanceSpace.js, and SurfaceCardDepot.js.
==========================================================================================================================================*/

// 🧩 1:1 port of OccupantDistanceSpace, SceneDistanceSpace, and SurfaceCardDepot for VehicleHMI GTX and multi-bounce tail GI.

#pragma once

#include "RayTracingSpace.h"

#include <array>
#include <cstdint>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                               OCCUPANT DISTANCE SPACE
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t BrickResolution    = 8u;
inline constexpr uint32_t AtlasBricksPerAxis = 8u;
inline constexpr uint32_t AtlasVoxelsPerAxis = BrickResolution * AtlasBricksPerAxis;
inline constexpr uint32_t BrickCapacity      = AtlasBricksPerAxis * AtlasBricksPerAxis * AtlasBricksPerAxis;
inline constexpr float    BrickSafetyMargin  = 1.5f;

struct OccupantBrickAllocation
{
    std::array<uint32_t, 3> AtlasBrick  = {0u, 0u, 0u};       // [brick] - brick coordinates in 8x8x8 brick grid
    std::array<uint32_t, 3> AtlasTexel  = {0u, 0u, 0u};       // [texel] - base texel in 64^3 atlas
    std::array<float, 3>    LocalOrigin = {0.0f, 0.0f, 0.0f}; // [m] - padded local-space brick origin
    std::array<float, 3>    LocalExtent = {1.0f, 1.0f, 1.0f}; // [m] - padded local-space brick span
    float                   MaxStep     = 1.0f;               // [m] - diagonal clamping distance
};

class OccupantDistanceSpace
{
  public:
    void ConstructResources(const SceneFacetCollection& Scene);

    [[nodiscard]] float SampleLocalDistanceCpu(uint32_t             OccupantIndex,
                                               std::array<float, 3> LocalPoint) const noexcept;

    [[nodiscard]] const std::vector<OccupantBrickAllocation>& OccupantBricks() const noexcept { return OccupantBricks_; }
    [[nodiscard]] const std::vector<float>&                   AtlasVoxels() const noexcept { return AtlasVoxels_; }

  private:
    std::vector<OccupantBrickAllocation> FacetBricks_;
    std::vector<OccupantBrickAllocation> OccupantBricks_;
    std::vector<float>                   AtlasVoxels_;
    uint32_t                             StaticBrickCount_ = 0u;
};

//------------------------------------------------------------------------------------------------------------------------
//                                                SCENE DISTANCE SPACE
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t               CascadeCount      = 4u;
inline constexpr uint32_t               CascadeVoxels     = 64u;
inline constexpr std::array<float, 4>   CascadeWidths     = {16.0f, 48.0f, 128.0f, 384.0f};
inline constexpr std::array<float, 4>   CascadeVoxelSizes = {0.25f, 0.75f, 2.0f, 6.0f};

struct CascadeToroidalState
{
    std::array<float, 3>   Center      = {0.0f, 0.0f, 0.0f};  // [m] - snapped world cascade centre
    float                  VoxelSize   = 0.25f;               // [m] - world size of 1 voxel
    float                  Extent      = 16.0f;               // [m] - world width of cascade
    std::array<int32_t, 3> TorusOffset = {0, 0, 0};           // [vox] - toroidal scroll offset
    std::array<int32_t, 3> DirtyMin    = {0, 0, 0};           // [vox] - dirty slab min
    std::array<int32_t, 3> DirtyMax    = {64, 64, 64};        // [vox] - dirty slab max
    bool                   Dirty       = true;                // [-] - true when cascade requires update
    std::vector<uint32_t>  ActiveOccupants;                   // [idx] - occupants overlapping cascade
};

class SceneDistanceSpace
{
  public:
    SceneDistanceSpace();

    void Reset() noexcept;

    void UpdateCascades(const SceneFacetCollection& Scene,
                        std::array<float, 3>        CameraPosition,
                        bool                        ForceFullRebuild = false);

    [[nodiscard]] const std::array<CascadeToroidalState, CascadeCount>& Cascades() const noexcept { return Cascades_; }

  private:
    bool                                           Initialised_ = false;
    std::array<CascadeToroidalState, CascadeCount> Cascades_{};
};

//------------------------------------------------------------------------------------------------------------------------
//                                                 SURFACE CARD DEPOT
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t CardPerOccupant = 6u;
inline constexpr uint32_t CardTileSize    = 16u;
inline constexpr uint32_t CardAtlasGrid   = 32u;
inline constexpr uint32_t CardAtlasSize   = CardTileSize * CardAtlasGrid;
inline constexpr uint32_t MaxCardGroups   = (CardAtlasGrid * CardAtlasGrid) / CardPerOccupant;

struct SurfaceCardMetadata
{
    std::array<float, 3>    AxisDirection = {1.0f, 0.0f, 0.0f}; // [-] - local card outward normal
    uint32_t                OccupantIndex = 0u;                 // [idx] - owning occupant
    std::array<float, 3>    LocalOrigin   = {0.0f, 0.0f, 0.0f}; // [m] - local face centre
    float                   HalfSpanU     = 0.5f;               // [m] - tangent half-extent U
    std::array<float, 3>    TangentU      = {0.0f, 1.0f, 0.0f}; // [-] - local tangent U
    float                   HalfSpanV     = 0.5f;               // [m] - tangent half-extent V
    std::array<float, 3>    TangentV      = {0.0f, 0.0f, 1.0f}; // [-] - local tangent V
    float                   DepthSpan     = 1.0f;               // [m] - orthographic capture thickness
    std::array<uint32_t, 2> AtlasTexel    = {0u, 0u};           // [px] - top-left texel in 512x512 atlas
    uint32_t                TileExtent    = CardTileSize;       // [px] - 16x16 tile size
    uint32_t                DirectionSlot = 0u;                 // [0..5] - +X,-X,+Y,-Y,+Z,-Z
};

class SurfaceCardDepot
{
  public:
    void ConstructResources(const SceneFacetCollection& Scene);

    [[nodiscard]] uint32_t                                  ActiveCardCount() const noexcept { return static_cast<uint32_t>(Cards_.size()); }
    [[nodiscard]] const std::vector<SurfaceCardMetadata>&   Cards() const noexcept { return Cards_; }
    [[nodiscard]] const std::vector<int32_t>&               OccupantCardBases() const noexcept { return OccupantCardBases_; }

  private:
    std::vector<SurfaceCardMetadata> Cards_;
    std::vector<int32_t>             OccupantCardBases_;
};

} // namespace Frontier
