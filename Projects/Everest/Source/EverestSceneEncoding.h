/*==========================================================================================================================================
                                                     EVEREST SCENE ENCODING
                                     ------------------------------------------------------------------
                 Couples the VehicleHMI ReSTIR GI + Two-Level BVH + 4-Cascade SDF + 6-Card Radiosity +
                  SVGF Variance pipeline and the 5 static AutomotivePaint flake showcase cars with the
                 PlanetaryAtmosphere (SkyViewLut, Sun, Moon, Stars, Planets, Volumetric Clouds, Cloud
                  Shadows, Height Fog, Aerial Perspective, Optical Lens Flare) driven by SceneWorld.
==========================================================================================================================================*/

// 🧩 Coupled ReSTIR + PlanetaryAtmosphere 3D frame encoder for Project Everest (Editor docked viewport & Game full-screen viewport).

#pragma once

#include "Engine/PlanetaryAtmosphere/AtmosphereScattering.h"
#include "Engine/Rendering/ClusteredLightingSequence.h"
#include "Engine/Rendering/DistanceAndCardSequence.h"
#include "Engine/Rendering/RayTracingSpace.h"
#include "Engine/Rendering/ResamplingAndVarianceSequence.h"
#include "Engine/Scene/EngineConfigurations.h"
#include "EverestCourseScene.h"

#include <array>
#include <cstdint>
#include <vector>

namespace Everest
{

struct EverestCameraSpecification
{
    std::array<float, 3> EyePosition        = {-8.4f, 0.0f, 2.45f}; // [m] - world-space camera position (+Z up)
    std::array<float, 3> LookAtTarget       = { 1.4f, 0.0f, 0.68f}; // [m] - world-space look-at target (+Z up)
    float                VerticalFovDegrees = 54.0f;                // [deg] - vertical field of view
};

struct EverestEnvironmentSettings
{
    Frontier::SolarConfiguration          Solar{};
    Frontier::AtmosphereConfiguration     Atmosphere{};
    Frontier::CloudConfiguration          Cloud{};
    Frontier::FogConfiguration            Fog{};
    Frontier::OpticalFlareConfiguration   OpticalFlare{};
    Frontier::MoonConfiguration           Moon{};
    Frontier::StarConfiguration           Star{};
    Frontier::RenderPipelineConfiguration Pipeline{};
};

class EverestSceneEncoding
{
  public:
    EverestSceneEncoding();

    void ResetAccumulation() noexcept;

    // Encodes the proving-grounds + 5 showcase cars + planetary atmosphere into an RGBA8 top-down pixel buffer.
    void EncodeFrame(uint32_t                            OutputWidth,
                     uint32_t                            OutputHeight,
                     const EverestCameraSpecification&   Camera,
                     const EverestEnvironmentSettings&   Environment,
                     std::vector<uint8_t>&               OutRgba8Pixels);

    [[nodiscard]] const EverestCourseScene&                   Course() const noexcept { return Course_; }
    [[nodiscard]] const Frontier::ResamplingAndVarianceSequence& Illumination() const noexcept { return Illumination_; }
    [[nodiscard]] uint32_t                                    AccumulatedFrames() const noexcept { return AccumulatedFrames_; }

  private:
    void EnsureAtmosphereBaked(const std::array<float, 3>& SunDirection,
                               const std::array<float, 3>& SunRadiance,
                               float                       RayleighScale,
                               float                       MieTurbidity,
                               float                       MieAnisotropyG,
                               float                       OzoneScale);

    EverestCourseScene                      Course_{};
    Frontier::RayTracingSpace               RaySpace_{};
    Frontier::ClusteredLightingSequence     ClusteredLights_{};
    Frontier::OccupantDistanceSpace         OccupantSdf_{};
    Frontier::SceneDistanceSpace            WorldSdf_{};
    Frontier::SurfaceCardDepot              CardDepot_{};
    Frontier::ResamplingAndVarianceSequence Illumination_{};

    std::vector<Frontier::TracePixelGuide>  PrimaryGuides_{};
    std::vector<std::array<float, 3>>       AccumulatedHdr_{};

    Frontier::AtmosphereParameters          AtmosphereParams_{};
    Frontier::TransmittanceLut              TransmittanceLut_{};
    Frontier::MultiScatteringLut            MultiScatteringLut_{};
    Frontier::SkyViewLut                    SkyViewLut_{};
    std::array<float, 3>                    LastBakedSunDir_    = {0.0f, 0.0f, 0.0f};
    float                                   LastBakedTurbidity_ = -1.0f;
    float                                   LastBakedRayleigh_  = -1.0f;

    uint32_t                                InternalWidth_      = 0u;
    uint32_t                                InternalHeight_     = 0u;
    uint32_t                                AccumulatedFrames_  = 0u;
    EverestCameraSpecification              LastCamera_{};
    uint64_t                                LastWorldSignature_ = 0u;
};

} // namespace Everest
