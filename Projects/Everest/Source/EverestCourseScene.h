/*==========================================================================================================================================
                                                     EVEREST COURSE SCENE
                                     ------------------------------------------------------------------
                 Static proving-grounds environment reconstructed 1:1 from VehicleHMI CourseStructure.js and
                 LevelStructure.js (Hangar, ControlTower, Grandstand, Bridge, Tunnel, Gantries, StreetPoles,
                 Containers, Barriers, Cones, and Asphalt Pad) plus 5 static sculpted ControlVehicle showcase
                 cars demonstrating AutomotivePaint metallic flake materials in Red, Green, Yellow, Blue, and Orange.
==========================================================================================================================================*/

// 🧩 Static Everest proving-grounds scene and 5 automotive-flake showcase vehicles (no vehicle physics or HUD).

#pragma once

#include "Engine/Rendering/ClusteredLightingSequence.h"
#include "Engine/Rendering/RayTracingSpace.h"

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace Everest
{

//==========================================================================================================================================
//                                                 SHOWCASE VEHICLE PLACEMENT
//==========================================================================================================================================
struct EverestShowcaseVehiclePlacement
{
    std::string                  Label{};
    Frontier::CourseMaterial     PaintMaterial  = Frontier::CourseMaterial::BodyCoat;
    std::array<float, 3>         WorldPosition  = {0.0f, 0.0f, 0.0f}; // [m] - chassis center of mass (+Z up)
    float                        YawRadians     = 0.0f;               // [rad] - heading around +Z
    uint32_t                     BodyOccupant   = 0u;
    std::array<uint32_t, 4>      WheelOccupants = {0u, 0u, 0u, 0u};
};

//==========================================================================================================================================
//                                                    EVEREST COURSE SCENE
//==========================================================================================================================================
struct EverestCourseScene
{
    Frontier::SceneFacetCollection                       Scene{};
    std::vector<Frontier::SurfaceMaterialSpecification>  Materials{};
    std::vector<Frontier::StreetPoleSpecification>       StreetPoles{};
    std::vector<Frontier::PointLampSpecification>        PointLamps{};
    std::vector<EverestShowcaseVehiclePlacement>         ShowcaseVehicles{};
};

//==========================================================================================================================================
//                                                    BUILDER ENTRY POINT
//==========================================================================================================================================
[[nodiscard]] EverestCourseScene ConstructEverestCourseScene();

} // namespace Everest
