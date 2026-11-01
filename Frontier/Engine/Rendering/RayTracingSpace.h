/*==========================================================================================================================================
                                                            RAY TRACING SPACE
                                     ------------------------------------------------------------------
                 Two-Level BVH acceleration structure (per-frame 8-bin SAH TLAS over active occupants +
                      12-bin SAH BLAS per facet set) and 75-entry course material specification for
                           the VehicleHMI ReSTIR GI path tracer and multi-bounce reflections.
==========================================================================================================================================*/

// 🧩 Two-Level BVH (TLAS + Binned-SAH BLAS), octahedral normal codec, and material records ported 1:1 from RayTracingSpace.js.

#pragma once

#include "Engine/Render/SurfaceMaterial.h"

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                  COURSE MATERIAL PALETTE
//------------------------------------------------------------------------------------------------------------------------

enum class CourseMaterial : uint32_t
{
    BodyCoat          = 0u,
    BodyTrim          = 1u,
    VehicleGlass      = 2u,
    VehiclePlastic    = 3u,
    Tyre              = 4u,
    RimCarbon         = 5u,
    Hub               = 6u,
    Brake             = 7u,
    VehicleTrim       = 8u,
    Headlight         = 9u,
    Taillight         = 10u,
    VehicleDefault    = 11u,
    WallCrimson       = 12u,
    WallViridian      = 13u,
    WallChalk         = 14u,
    WallCobalt        = 15u,
    TunnelConcrete    = 16u,
    StressAmber       = 17u,
    StressTeal        = 18u,
    StressViolet      = 19u,
    StressIvory       = 20u,
    StressLamp        = 21u,
    Asphalt           = 22u,
    AsphaltPatch      = 23u,
    ApronConcrete     = 24u,
    PaintWhite        = 25u,
    PaintYellow       = 26u,
    KerbRed           = 27u,
    TyreRubber        = 28u,
    Grass             = 29u,
    Gravel            = 30u,
    Cladding          = 31u,
    ContainerOrange   = 32u,
    ContainerBlue     = 33u,
    ContainerGreen    = 34u,
    ContainerWhite    = 35u,
    ContainerRed      = 36u,
    SteelDark         = 37u,
    LampWarm          = 38u,
    LampCool          = 39u,
    BarrierConcrete   = 40u,
    SeatBlue          = 41u,
    Wood              = 42u,
    WoodInterior      = 43u,
    Glass             = 44u,
    GlassEdge         = 45u,
    Concrete          = 46u,
    ConcreteInterior  = 47u,
    Stone             = 48u,
    StoneInterior     = 49u,
    Plastic           = 50u,
    PlasticInterior   = 51u,
    Tempered          = 52u,
    TemperedEdge      = 53u,
    PaintGreen        = 54u,
    PaintBlue         = 55u,
    ConeOrange        = 56u,
    ConeBand          = 57u,
    ConeBase          = 58u,
    DerezGlow         = 59u,
    DerezHot          = 60u,
    DerezGlitch       = 61u,
    GateLamp          = 62u,
    GateLampRed       = 63u,
    SignBoard         = 64u,
    SignLetter        = 65u,
    CabinLeather      = 66u,
    CabinTrim         = 67u,
    CabinAccent       = 68u,
    SteeringWheel     = 69u,
    DisplayGlass      = 70u,
    TabletHousing     = 71u,
    MirrorGlass       = 72u,
    SeatFabric        = 73u,
    CabinCarpet       = 74u,
    MirrorTrim        = 75u,
    RimScrape         = 76u,
    BodyCoatGreen     = 77u,
    BodyCoatYellow    = 78u,
    BodyCoatBlue      = 79u,
    BodyCoatOrange    = 80u,
    Count             = 81u
};

struct SurfaceMaterialSpecification
{
    std::array<float, 3> Albedo           = {0.5f, 0.5f, 0.5f}; // [-] - linear Rec.709 reflectance
    float                Roughness        = 0.5f;               // [-] - perceptual roughness
    std::array<float, 3> RadiantExitance  = {0.0f, 0.0f, 0.0f}; // [cd/m^2] - authored self-luminance
    float                Metalness        = 0.0f;               // [-] - 0 dielectric, 1 conductor
    float                CoatWeight       = 0.0f;               // [-] - clear-coat weight
    float                CoatRoughness    = 0.06f;              // [-] - clear-coat perceptual roughness
    float                SpecularLevel    = 0.04f;              // [-] - dielectric F0
    float                Transmission     = 0.0f;               // [-] - glazing transmission factor
    std::array<float, 3> Absorption       = {0.0f, 0.0f, 0.0f}; // [1/m] - Beer-Lambert coating absorption (ScatteringSequence)
    float                CoatingThickness = 0.0f;               // [m] - dielectric coating thickness (ScatteringSequence)
    std::array<float, 3> SheenTint        = {0.0f, 0.0f, 0.0f}; // [-] - Charlie sheen tint * intensity (ScatteringSequence)
    float                SheenRoughness   = 0.5f;               // [-] - Charlie sheen roughness (ScatteringSequence)
    std::array<float, 3> FlakeTint        = {0.0f, 0.0f, 0.0f}; // [-] - AutomotivePaint metallic flake tint
    float                FlakeCoverage    = 0.0f;               // [-] - AutomotivePaint metallic flake coverage [0..1]
};

[[nodiscard]] std::vector<SurfaceMaterialSpecification> ConstructDefaultMaterials();
[[nodiscard]] std::vector<float>                        EncodeMaterialRecords(const std::vector<SurfaceMaterialSpecification>& Materials);
[[nodiscard]] SurfaceMaterialSpecification              ConvertMaterialScatteringToRestir(const MaterialScattering& Material) noexcept;
[[nodiscard]] SurfaceMaterialSpecification              ConstructAutomotiveFlakePreset(std::array<float, 3> BinderAlbedo,
                                                                                       std::array<float, 3> FlakeTint,
                                                                                       std::array<float, 3> CoatAbsorption,
                                                                                       float                FlakeCoverage = 0.72f) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                                 OCTAHEDRAL NORMAL CODEC
//------------------------------------------------------------------------------------------------------------------------

[[nodiscard]] uint32_t             PackOctahedralCpu(std::array<float, 3> Normal) noexcept;
[[nodiscard]] std::array<float, 3> UnpackOctahedralCpu(uint32_t Packed) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                               SCENE FACETS & OCCUPANTS
//------------------------------------------------------------------------------------------------------------------------

inline constexpr uint32_t OccupantAssignmentRaster   = 1u;
inline constexpr uint32_t OccupantAssignmentDistance = 2u;
inline constexpr uint32_t OccupantAssignmentCards    = 4u;
inline constexpr uint32_t OccupantAssignmentDynamic  = 8u;
inline constexpr uint32_t OccupantAssignmentFallback = 16u;
inline constexpr uint32_t OccupantAssignmentShredded = 32u;
inline constexpr uint32_t NoMaterialOverrideSentinel = 0xFFFFFFFFu;

inline constexpr uint32_t TlasCellCapacity        = 4608u;
inline constexpr uint32_t DynamicBlasCellCapacity = 256u;
inline constexpr uint32_t DynamicTriangleCapacity = 4096u;
inline constexpr uint32_t TlasLeafBit             = 0x80000000u;
inline constexpr uint32_t TlasIndexMask           = 0x7FFFFFFFu;
inline constexpr uint32_t EmptyTlasSentinel       = 0x7FFFFFFFu;

struct TriangleFacetRecord
{
    std::array<std::array<float, 3>, 3> Corners{};                                        // [m] - local triangle vertices
    std::array<std::array<float, 3>, 3> Normals{};                                        // [-] - per-corner shading normals
    bool                                HasCornerNormals = false;                         // [-] - true when Normals are populated
    CourseMaterial                      Family           = CourseMaterial::VehicleDefault; // [-] - material family index
};

struct FacetSetRecord
{
    std::string                      Name;                      // [-] - diagnostic label
    std::vector<TriangleFacetRecord> Facets;                    // [-] - local-space triangles
    std::array<float, 3>             LocalMinimum = {0, 0, 0};  // [m] - local AABB minimum
    std::array<float, 3>             LocalMaximum = {0, 0, 0};  // [m] - local AABB maximum
    float                            DistanceVoxel = 0.08f;     // [m] - local SDF voxel size
    int32_t                          BlasRoot      = -1;        // [idx] - root cell in RayTracingSpace
};

struct SceneOccupantInstance
{
    uint32_t              FacetSet         = 0u;                         // [idx] - index into SceneFacetCollection::FacetSets
    uint32_t              Assignments      = OccupantAssignmentRaster;   // [-] - bitmask of OccupantAssignment*
    uint32_t              MaterialOverride = NoMaterialOverrideSentinel; // [-] - optional material override
    bool                  Inactive         = false;                      // [-] - true when hidden/unspawned
    bool                  Fragment         = false;                      // [-] - true when active Voronoi debris piece
    std::array<float, 16> Transform        = {1, 0, 0, 0,
                                              0, 1, 0, 0,
                                              0, 0, 1, 0,
                                              0, 0, 0, 1};               // [-] - column-major local -> world
    std::array<float, 16> PreviousTransform = {1, 0, 0, 0,
                                               0, 1, 0, 0,
                                               0, 0, 1, 0,
                                               0, 0, 0, 1};              // [-] - previous step local -> world
    std::array<float, 3>  LocalMinimum     = {0, 0, 0};                  // [m] - local AABB min
    std::array<float, 3>  LocalMaximum     = {0, 0, 0};                  // [m] - local AABB max
};

struct WorldAxisAlignedBounds
{
    std::array<float, 3> Minimum = {0.0f, 0.0f, 0.0f}; // [m]
    std::array<float, 3> Maximum = {0.0f, 0.0f, 0.0f}; // [m]
};

struct SceneFacetCollection
{
    std::vector<FacetSetRecord>        FacetSets;                // [-] - unique triangle sets
    std::vector<SceneOccupantInstance> Occupants;                // [-] - placed scene instances
    int32_t                            GroundOccupant = -1;      // [idx] - course ground occupant index
    uint32_t                           BodyOccupant   = 0u;      // [idx] - ControlVehicle body occupant
    std::array<uint32_t, 4>            WheelOccupants = {1, 2, 3, 4}; // [idx] - 4 wheel occupants

    [[nodiscard]] WorldAxisAlignedBounds QueryWorldBounds(uint32_t OccupantIndex) const noexcept;
    void                                 AssignOccupantTransform(uint32_t OccupantIndex, const std::array<float, 16>& Matrix) noexcept;
};

[[nodiscard]] std::array<float, 16> ConstructRigidTransform(std::array<float, 3> Translation,
                                                            std::array<float, 4> QuaternionXyzw) noexcept;
[[nodiscard]] std::array<float, 16> InvertRigidOrAffineTransform(const std::array<float, 16>& Matrix) noexcept;

//------------------------------------------------------------------------------------------------------------------------
//                                               TWO-LEVEL BVH RAY TRACING SPACE
//------------------------------------------------------------------------------------------------------------------------

struct BlasBuildResult
{
    uint32_t              RootCell      = 0u; // [idx] - global cell index of BLAS root
    uint32_t              CellCount     = 0u; // [-] - number of 32-byte BVH cells emitted
    uint32_t              TriangleCount = 0u; // [-] - number of 64-byte triangles emitted
    std::vector<uint32_t> CellWords;          // [-] - 8 uint32 words (32B) per cell
    std::vector<uint32_t> TriangleWords;      // [-] - 16 uint32 words (64B) per triangle
};

[[nodiscard]] BlasBuildResult ConstructFacetBlas(const std::vector<TriangleFacetRecord>& Facets,
                                                 uint32_t                                GlobalCellOffset,
                                                 uint32_t                                GlobalTriangleOffset);

struct FracturePieceGeometry
{
    std::vector<TriangleFacetRecord> Triangles;                // [-] - convex fragment triangles
    std::array<float, 3>             Minimum = {0.0f, 0.0f, 0.0f}; // [m]
    std::array<float, 3>             Maximum = {0.0f, 0.0f, 0.0f}; // [m]
};

struct CpuRayIntersection
{
    bool                 Hit      = false;                      // [-] - true when a surface was hit
    float                Travel   = 0.0f;                       // [m] - ray parameter t at hit
    std::array<float, 3> Position = {0.0f, 0.0f, 0.0f};         // [m] - world hit point
    std::array<float, 3> Normal   = {0.0f, 0.0f, 1.0f};         // [-] - world shading normal
    uint32_t             Occupant = 0xFFFFFFFFu;                // [idx] - hit occupant index
    CourseMaterial       Family   = CourseMaterial::VehicleDefault; // [-] - hit material family
    uint32_t             Triangle = 0xFFFFFFFFu;                // [idx] - global BLAS triangle index
};

class RayTracingSpace
{
  public:
    void ConstructResources(SceneFacetCollection& Scene);

    void UpdateTlas(SceneFacetCollection& Scene, const std::array<bool, 4>* ShreddedWheels = nullptr);

    void RegisterPropFragments(uint32_t                                  BreakableIndex,
                               uint32_t                                  PieceFirst,
                               uint32_t                                  Capacity,
                               const std::vector<FracturePieceGeometry>& WrittenFragments);

    void ClearPropFragments(uint32_t PieceFirst, uint32_t Capacity) noexcept;

    [[nodiscard]] CpuRayIntersection TraceRayCpu(const SceneFacetCollection& Scene,
                                                 std::array<float, 3>        Origin,
                                                 std::array<float, 3>        Direction,
                                                 float                       MinimumTravel = 1.0e-3f,
                                                 float                       MaximumTravel = 500.0f) const noexcept;

    [[nodiscard]] float TraceVisibilityCpu(const SceneFacetCollection& Scene,
                                           std::array<float, 3>        Origin,
                                           std::array<float, 3>        Direction,
                                           float                       MinimumTravel = 1.0e-3f,
                                           float                       MaximumTravel = 500.0f) const noexcept;

    [[nodiscard]] uint32_t                     TotalTriangles() const noexcept { return TotalTriangles_; }
    [[nodiscard]] uint32_t                     ActiveInstances() const noexcept { return ActiveInstances_; }
    [[nodiscard]] uint32_t                     UsedTlasCells() const noexcept { return UsedTlasCells_; }
    [[nodiscard]] const std::vector<uint32_t>& AllCellWords() const noexcept { return AllCellWords_; }
    [[nodiscard]] const std::vector<uint32_t>& AllTriangleWords() const noexcept { return AllTriangleWords_; }

  private:
    std::vector<int32_t>  FacetBlasRoots_;
    std::vector<int32_t>  OccupantBlasRoot_;
    uint32_t              StaticCellCount_   = 0u;
    uint32_t              StaticTriCount_    = 0u;
    uint32_t              DynamicCellOffset_ = 0u;
    uint32_t              DynamicTriOffset_  = 0u;
    uint32_t              TotalCellCapacity_ = 0u;
    uint32_t              TotalTriCapacity_  = 0u;
    uint32_t              TotalTriangles_    = 0u;
    uint32_t              ActiveInstances_   = 0u;
    uint32_t              UsedTlasCells_     = 0u;
    std::vector<uint32_t> AllCellWords_;
    std::vector<uint32_t> AllTriangleWords_;
};

} // namespace Frontier
