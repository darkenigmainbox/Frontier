/*==========================================================================================================================================
                                                     DISTANCE AND CARD SEQUENCE
                                     ------------------------------------------------------------------
                 Per-occupant 8x8x8 signed-distance brick atlas (64^3 R16F), 4-cascade toroidal world SDF
                   (16 m / 48 m / 128 m / 384 m), and 6-direction 512x512 surface radiosity card depot
                      ported 1:1 from OccupantDistanceSpace.js, SceneDistanceSpace.js, and SurfaceCardDepot.js.
==========================================================================================================================================*/

// 🧩 1:1 port of OccupantDistanceSpace, SceneDistanceSpace, and SurfaceCardDepot for VehicleHMI GTX and multi-bounce tail GI.

#include "DistanceAndCardSequence.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace Frontier
{

namespace
{

[[nodiscard]] inline float Dot3(std::array<float, 3> A, std::array<float, 3> B) noexcept
{
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

[[nodiscard]] inline std::array<float, 3> Sub3(std::array<float, 3> A, std::array<float, 3> B) noexcept
{
    return {A[0] - B[0], A[1] - B[1], A[2] - B[2]};
}

[[nodiscard]] inline std::array<float, 3> Cross3(std::array<float, 3> A, std::array<float, 3> B) noexcept
{
    return {
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    };
}

[[nodiscard]] std::array<float, 3> ClosestPointOnTriangleCpu(std::array<float, 3> P,
                                                             std::array<float, 3> A,
                                                             std::array<float, 3> B,
                                                             std::array<float, 3> C) noexcept
{
    const auto  Ab = Sub3(B, A);
    const auto  Ac = Sub3(C, A);
    const auto  Ap = Sub3(P, A);
    const float D1 = Dot3(Ab, Ap);
    const float D2 = Dot3(Ac, Ap);
    if (D1 <= 0.0f && D2 <= 0.0f)
    {
        return A;
    }

    const auto  Bp = Sub3(P, B);
    const float D3 = Dot3(Ab, Bp);
    const float D4 = Dot3(Ac, Bp);
    if (D3 >= 0.0f && D4 <= D3)
    {
        return B;
    }

    const float Vc = D1 * D4 - D3 * D2;
    if (Vc <= 0.0f && D1 >= 0.0f && D3 <= 0.0f)
    {
        const float V = D1 / (D1 - D3);
        return {A[0] + V * Ab[0], A[1] + V * Ab[1], A[2] + V * Ab[2]};
    }

    const auto  Cp = Sub3(P, C);
    const float D5 = Dot3(Ab, Cp);
    const float D6 = Dot3(Ac, Cp);
    if (D6 >= 0.0f && D5 <= D6)
    {
        return C;
    }

    const float Vb = D5 * D2 - D1 * D6;
    if (Vb <= 0.0f && D2 >= 0.0f && D6 <= 0.0f)
    {
        const float W = D2 / (D2 - D6);
        return {A[0] + W * Ac[0], A[1] + W * Ac[1], A[2] + W * Ac[2]};
    }

    const float Va = D3 * D6 - D5 * D4;
    if (Va <= 0.0f && (D4 - D3) >= 0.0f && (D5 - D6) >= 0.0f)
    {
        const float W = (D4 - D3) / ((D4 - D3) + (D5 - D6));
        return {B[0] + W * (C[0] - B[0]), B[1] + W * (C[1] - B[1]), B[2] + W * (C[2] - B[2])};
    }

    const float Denom = 1.0f / (Va + Vb + Vc);
    const float V     = Vb * Denom;
    const float W     = Vc * Denom;
    return {
        A[0] + Ab[0] * V + Ac[0] * W,
        A[1] + Ab[1] * V + Ac[1] * W,
        A[2] + Ab[2] * V + Ac[2] * W
    };
}

[[nodiscard]] float EvaluateFacetSignedDistanceCpu(const FacetSetRecord& FacetSet,
                                                   std::array<float, 3>  QueryPoint,
                                                   float                 ClampStep) noexcept
{
    if (FacetSet.Facets.empty())
    {
        return ClampStep;
    }

    float                BestDistSq = std::numeric_limits<float>::infinity();
    std::array<float, 3> BestDelta  = {0.0f, 0.0f, 1.0f};
    std::array<float, 3> BestNormal = {0.0f, 0.0f, 1.0f};

    for (const TriangleFacetRecord& Tri : FacetSet.Facets)
    {
        const auto& A       = Tri.Corners[0];
        const auto& B       = Tri.Corners[1];
        const auto& C       = Tri.Corners[2];
        const auto  Closest = ClosestPointOnTriangleCpu(QueryPoint, A, B, C);
        const auto  Delta   = Sub3(QueryPoint, Closest);
        const float DistSq  = Dot3(Delta, Delta);
        if (DistSq < BestDistSq)
        {
            BestDistSq = DistSq;
            BestDelta  = Delta;
            BestNormal = Cross3(Sub3(B, A), Sub3(C, A));
        }
    }

    const float Distance = std::sqrt(BestDistSq);
    const float Sign     = (Dot3(BestDelta, BestNormal) < 0.0f) ? -1.0f : 1.0f;
    return std::clamp(Sign * Distance, -ClampStep, ClampStep);
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                               OCCUPANT DISTANCE SPACE
//------------------------------------------------------------------------------------------------------------------------

void OccupantDistanceSpace::ConstructResources(const SceneFacetCollection& Scene)
{
    AtlasVoxels_.assign(static_cast<size_t>(AtlasVoxelsPerAxis * AtlasVoxelsPerAxis * AtlasVoxelsPerAxis), 16.0f);
    FacetBricks_.resize(Scene.FacetSets.size());

    for (size_t Index = 0u; Index < Scene.FacetSets.size(); ++Index)
    {
        const uint32_t             Slot  = static_cast<uint32_t>(Index);
        const uint32_t             Bx    = Slot % AtlasBricksPerAxis;
        const uint32_t             By    = (Slot / AtlasBricksPerAxis) % AtlasBricksPerAxis;
        const uint32_t             Bz    = Slot / (AtlasBricksPerAxis * AtlasBricksPerAxis);
        const FacetSetRecord&      FSet  = Scene.FacetSets[Index];
        const std::array<float, 3> RawSpan = {
            std::max(1.0e-3f, FSet.LocalMaximum[0] - FSet.LocalMinimum[0]),
            std::max(1.0e-3f, FSet.LocalMaximum[1] - FSet.LocalMinimum[1]),
            std::max(1.0e-3f, FSet.LocalMaximum[2] - FSet.LocalMinimum[2])
        };
        const float Pad = BrickSafetyMargin * std::max({RawSpan[0], RawSpan[1], RawSpan[2]}) / static_cast<float>(BrickResolution);
        const std::array<float, 3> Origin = {
            FSet.LocalMinimum[0] - Pad,
            FSet.LocalMinimum[1] - Pad,
            FSet.LocalMinimum[2] - Pad
        };
        const std::array<float, 3> Extent = {
            RawSpan[0] + 2.0f * Pad,
            RawSpan[1] + 2.0f * Pad,
            RawSpan[2] + 2.0f * Pad
        };
        const float MaxStep = std::sqrt(Dot3(Extent, Extent));

        OccupantBrickAllocation Allocation{};
        Allocation.AtlasBrick  = {Bx, By, Bz};
        Allocation.AtlasTexel  = {Bx * BrickResolution, By * BrickResolution, Bz * BrickResolution};
        Allocation.LocalOrigin = Origin;
        Allocation.LocalExtent = Extent;
        Allocation.MaxStep     = MaxStep;
        FacetBricks_[Index]    = Allocation;

        for (uint32_t K = 0u; K < BrickResolution; ++K)
        {
            for (uint32_t J = 0u; J < BrickResolution; ++J)
            {
                for (uint32_t I = 0u; I < BrickResolution; ++I)
                {
                    const std::array<float, 3> Sample = {
                        Origin[0] + ((static_cast<float>(I) + 0.5f) / static_cast<float>(BrickResolution)) * Extent[0],
                        Origin[1] + ((static_cast<float>(J) + 0.5f) / static_cast<float>(BrickResolution)) * Extent[1],
                        Origin[2] + ((static_cast<float>(K) + 0.5f) / static_cast<float>(BrickResolution)) * Extent[2]
                    };
                    const float    Sd = EvaluateFacetSignedDistanceCpu(FSet, Sample, MaxStep);
                    const uint32_t Tx = Allocation.AtlasTexel[0] + I;
                    const uint32_t Ty = Allocation.AtlasTexel[1] + J;
                    const uint32_t Tz = Allocation.AtlasTexel[2] + K;
                    const size_t   Linear = (static_cast<size_t>(Tz) * AtlasVoxelsPerAxis + Ty) * AtlasVoxelsPerAxis + Tx;
                    AtlasVoxels_[Linear]  = Sd;
                }
            }
        }
    }

    StaticBrickCount_ = static_cast<uint32_t>(Scene.FacetSets.size());
    OccupantBricks_.resize(Scene.Occupants.size());
    for (size_t Index = 0u; Index < Scene.Occupants.size(); ++Index)
    {
        const uint32_t FIdx = Scene.Occupants[Index].FacetSet;
        if (FIdx < FacetBricks_.size())
        {
            OccupantBricks_[Index] = FacetBricks_[FIdx];
        }
    }
}

float OccupantDistanceSpace::SampleLocalDistanceCpu(uint32_t             OccupantIndex,
                                                    std::array<float, 3> LocalPoint) const noexcept
{
    if (OccupantIndex >= OccupantBricks_.size() || AtlasVoxels_.empty())
    {
        return 16.0f;
    }
    const OccupantBrickAllocation& Brick = OccupantBricks_[OccupantIndex];
    const float U = std::clamp((LocalPoint[0] - Brick.LocalOrigin[0]) / Brick.LocalExtent[0], 0.0f, 0.999f);
    const float V = std::clamp((LocalPoint[1] - Brick.LocalOrigin[1]) / Brick.LocalExtent[1], 0.0f, 0.999f);
    const float W = std::clamp((LocalPoint[2] - Brick.LocalOrigin[2]) / Brick.LocalExtent[2], 0.0f, 0.999f);

    const uint32_t Ix = Brick.AtlasTexel[0] + static_cast<uint32_t>(U * static_cast<float>(BrickResolution));
    const uint32_t Iy = Brick.AtlasTexel[1] + static_cast<uint32_t>(V * static_cast<float>(BrickResolution));
    const uint32_t Iz = Brick.AtlasTexel[2] + static_cast<uint32_t>(W * static_cast<float>(BrickResolution));
    const size_t   Linear = (static_cast<size_t>(Iz) * AtlasVoxelsPerAxis + Iy) * AtlasVoxelsPerAxis + Ix;
    return AtlasVoxels_[Linear];
}

//------------------------------------------------------------------------------------------------------------------------
//                                                SCENE DISTANCE SPACE
//------------------------------------------------------------------------------------------------------------------------

SceneDistanceSpace::SceneDistanceSpace()
{
    Reset();
}

void SceneDistanceSpace::Reset() noexcept
{
    Initialised_ = false;
    for (size_t Index = 0u; Index < CascadeCount; ++Index)
    {
        Cascades_[Index].Center      = {0.0f, 0.0f, 0.0f};
        Cascades_[Index].VoxelSize   = CascadeVoxelSizes[Index];
        Cascades_[Index].Extent      = CascadeWidths[Index];
        Cascades_[Index].TorusOffset = {0, 0, 0};
        Cascades_[Index].DirtyMin    = {0, 0, 0};
        Cascades_[Index].DirtyMax    = {static_cast<int32_t>(CascadeVoxels), static_cast<int32_t>(CascadeVoxels), static_cast<int32_t>(CascadeVoxels)};
        Cascades_[Index].Dirty       = true;
        Cascades_[Index].ActiveOccupants.clear();
    }
}

void SceneDistanceSpace::UpdateCascades(const SceneFacetCollection& Scene,
                                        std::array<float, 3>        CameraPosition,
                                        bool                        ForceFullRebuild)
{
    const bool FirstTime = !Initialised_ || ForceFullRebuild;
    Initialised_         = true;

    for (size_t CascadeIdx = 0u; CascadeIdx < CascadeCount; ++CascadeIdx)
    {
        CascadeToroidalState& Cascade   = Cascades_[CascadeIdx];
        const float           VoxelSize = Cascade.VoxelSize;

        if (FirstTime)
        {
            Cascade.Center = {
                std::round(CameraPosition[0] / VoxelSize) * VoxelSize,
                std::round(CameraPosition[1] / VoxelSize) * VoxelSize,
                std::round(CameraPosition[2] / VoxelSize) * VoxelSize
            };
            Cascade.TorusOffset = {0, 0, 0};
            Cascade.DirtyMin    = {0, 0, 0};
            Cascade.DirtyMax    = {64, 64, 64};
            Cascade.Dirty       = true;
        }
        else
        {
            const std::array<int32_t, 3> SnapShift = {
                static_cast<int32_t>(std::round((CameraPosition[0] - Cascade.Center[0]) / VoxelSize)),
                static_cast<int32_t>(std::round((CameraPosition[1] - Cascade.Center[1]) / VoxelSize)),
                static_cast<int32_t>(std::round((CameraPosition[2] - Cascade.Center[2]) / VoxelSize))
            };
            const int32_t AbsMax = std::max({std::abs(SnapShift[0]), std::abs(SnapShift[1]), std::abs(SnapShift[2])});
            if (AbsMax == 0)
            {
                Cascade.Dirty = false;
            }
            else if (AbsMax >= 24)
            {
                Cascade.Center = {
                    std::round(CameraPosition[0] / VoxelSize) * VoxelSize,
                    std::round(CameraPosition[1] / VoxelSize) * VoxelSize,
                    std::round(CameraPosition[2] / VoxelSize) * VoxelSize
                };
                Cascade.TorusOffset = {0, 0, 0};
                Cascade.DirtyMin    = {0, 0, 0};
                Cascade.DirtyMax    = {64, 64, 64};
                Cascade.Dirty       = true;
            }
            else
            {
                for (size_t Axis = 0u; Axis < 3u; ++Axis)
                {
                    Cascade.Center[Axis] += static_cast<float>(SnapShift[Axis]) * VoxelSize;
                    Cascade.TorusOffset[Axis] = ((Cascade.TorusOffset[Axis] + SnapShift[Axis]) % 64 + 64) % 64;
                }
                Cascade.DirtyMin = {0, 0, 0};
                Cascade.DirtyMax = {64, 64, 64};
                Cascade.Dirty    = true;
            }
        }

        Cascade.ActiveOccupants.clear();
        const float Half = Cascade.Extent * 0.5f;
        const std::array<float, 3> CMin = {Cascade.Center[0] - Half, Cascade.Center[1] - Half, Cascade.Center[2] - Half};
        const std::array<float, 3> CMax = {Cascade.Center[0] + Half, Cascade.Center[1] + Half, Cascade.Center[2] + Half};

        for (uint32_t OccIdx = 0u; OccIdx < static_cast<uint32_t>(Scene.Occupants.size()); ++OccIdx)
        {
            const SceneOccupantInstance& Occ = Scene.Occupants[OccIdx];
            if ((Occ.Assignments & OccupantAssignmentDistance) == 0u || Occ.Inactive)
            {
                continue;
            }
            const WorldAxisAlignedBounds Bounds = Scene.QueryWorldBounds(OccIdx);
            if (Bounds.Maximum[0] < CMin[0] || Bounds.Minimum[0] > CMax[0] ||
                Bounds.Maximum[1] < CMin[1] || Bounds.Minimum[1] > CMax[1] ||
                Bounds.Maximum[2] < CMin[2] || Bounds.Minimum[2] > CMax[2])
            {
                continue;
            }
            Cascade.ActiveOccupants.push_back(OccIdx);
        }
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                 SURFACE CARD DEPOT
//------------------------------------------------------------------------------------------------------------------------

void SurfaceCardDepot::ConstructResources(const SceneFacetCollection& Scene)
{
    struct CardAxisBasis
    {
        std::array<float, 3> Normal;
        std::array<float, 3> TangentU;
        std::array<float, 3> TangentV;
    };

    static constexpr std::array<CardAxisBasis, 6> CardAxes = {{
        {{ 1.0f,  0.0f,  0.0f}, {0.0f,  1.0f, 0.0f}, {0.0f, 0.0f, 1.0f}},
        {{-1.0f,  0.0f,  0.0f}, {0.0f, -1.0f, 0.0f}, {0.0f, 0.0f, 1.0f}},
        {{ 0.0f,  1.0f,  0.0f}, {-1.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 1.0f}},
        {{ 0.0f, -1.0f,  0.0f}, { 1.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 1.0f}},
        {{ 0.0f,  0.0f,  1.0f}, { 1.0f, 0.0f, 0.0f}, {0.0f, 1.0f, 0.0f}},
        {{ 0.0f,  0.0f, -1.0f}, {-1.0f, 0.0f, 0.0f}, {0.0f, 1.0f, 0.0f}}
    }};

    Cards_.clear();
    OccupantCardBases_.assign(Scene.Occupants.size(), -1);
    uint32_t GroupSlot = 0u;

    for (uint32_t OccIdx = 0u; OccIdx < static_cast<uint32_t>(Scene.Occupants.size()); ++OccIdx)
    {
        const SceneOccupantInstance& Occ = Scene.Occupants[OccIdx];
        if ((Occ.Assignments & OccupantAssignmentCards) == 0u || GroupSlot >= MaxCardGroups)
        {
            continue;
        }

        const uint32_t CardBase   = GroupSlot * CardPerOccupant;
        OccupantCardBases_[OccIdx] = static_cast<int32_t>(CardBase);
        ++GroupSlot;

        const std::array<float, 3> Center = {
            0.5f * (Occ.LocalMinimum[0] + Occ.LocalMaximum[0]),
            0.5f * (Occ.LocalMinimum[1] + Occ.LocalMaximum[1]),
            0.5f * (Occ.LocalMinimum[2] + Occ.LocalMaximum[2])
        };
        const std::array<float, 3> HalfExtent = {
            std::max(0.05f, 0.5f * (Occ.LocalMaximum[0] - Occ.LocalMinimum[0])),
            std::max(0.05f, 0.5f * (Occ.LocalMaximum[1] - Occ.LocalMinimum[1])),
            std::max(0.05f, 0.5f * (Occ.LocalMaximum[2] - Occ.LocalMinimum[2]))
        };

        for (uint32_t Dir = 0u; Dir < CardPerOccupant; ++Dir)
        {
            const uint32_t       CardIndex = CardBase + Dir;
            const uint32_t       GridX     = CardIndex % CardAtlasGrid;
            const uint32_t       GridY     = CardIndex / CardAtlasGrid;
            const CardAxisBasis& Basis     = CardAxes[Dir];

            const float SpanU     = std::abs(Dot3(Basis.TangentU, HalfExtent));
            const float SpanV     = std::abs(Dot3(Basis.TangentV, HalfExtent));
            const float SpanDepth = std::abs(Dot3(Basis.Normal,   HalfExtent));

            SurfaceCardMetadata Card{};
            Card.AxisDirection = Basis.Normal;
            Card.OccupantIndex = OccIdx;
            Card.LocalOrigin   = {
                Center[0] + Basis.Normal[0] * SpanDepth,
                Center[1] + Basis.Normal[1] * SpanDepth,
                Center[2] + Basis.Normal[2] * SpanDepth
            };
            Card.HalfSpanU     = SpanU;
            Card.TangentU      = Basis.TangentU;
            Card.HalfSpanV     = SpanV;
            Card.TangentV      = Basis.TangentV;
            Card.DepthSpan     = 2.0f * SpanDepth;
            Card.AtlasTexel    = {GridX * CardTileSize, GridY * CardTileSize};
            Card.TileExtent    = CardTileSize;
            Card.DirectionSlot = Dir;
            Cards_.push_back(Card);
        }
    }
}

} // namespace Frontier
