/*==========================================================================================================================================
                                                     EVEREST SCENE ENCODING
                                     ------------------------------------------------------------------
                 Couples the VehicleHMI ReSTIR GI path tracer, Two-Level BVH, 16x16x4 Clustered Lighting,
                 4-Cascade Toroidal SDF + 6-Card Surface Radiosity Depot, and SVGF Variance Wavelet Filter
                 with the PlanetaryAtmosphere & Celestial suite (TransmittanceLut, MultiScatteringLut,
                 SkyViewLut, VolumetricClouds, FogSpace, OpticalLensFlare, Moon, and Stars) for Project
                 Everest's Editor Mode (docked viewport) and Game Mode (full-screen viewport).
                 Supports both real-time GPU Vulkan compute encoding (bound directly to ImGui via VkImageView)
                 and deterministic CPU fallback encoding for headless validation.
==========================================================================================================================================*/

// 🧩 Everest-specific 3D viewport scene encoder (GPU Vulkan compute + CPU fallback).

#pragma once

#include "EverestCourseScene.h"
#include "Engine/PlanetaryAtmosphere/AtmosphereScattering.h"
#include "Engine/Render/SurfaceRasterization.h"
#include "Engine/Rendering/ClusteredLightingSequence.h"
#include "Engine/Rendering/DistanceAndCardSequence.h"
#include "Engine/Rendering/RayTracingSpace.h"
#include "Engine/Rendering/ResamplingAndVarianceSequence.h"
#include "Engine/Scene/EngineConfigurations.h"

#include <array>
#include <cstdint>
#include <memory>
#include <vector>

namespace Everest
{

//==========================================================================================================================================
//                                                 CAMERA & ENVIRONMENT BUNDLES
//==========================================================================================================================================
struct EverestCameraSpecification
{
    std::array<float, 3> EyePosition        = {11.2f, 0.0f, 3.1f};
    std::array<float, 3> LookAtTarget       = { 0.8f, 0.0f, 0.72f};
    float                VerticalFovDegrees = 48.0f;
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

//==========================================================================================================================================
//                                                    EVEREST SCENE ENCODING
//==========================================================================================================================================
class EverestSceneEncoding
{
  public:
    EverestSceneEncoding();
    ~EverestSceneEncoding();

    EverestSceneEncoding(const EverestSceneEncoding&)            = delete;
    EverestSceneEncoding& operator=(const EverestSceneEncoding&) = delete;

    // Real-time GPU Vulkan compute path (used by Frontier.exe and EverestGame.exe)
    bool                      InitializeGpu(const Frontier::VulkanRasterAccess& Access);
    void                      FinalizeGpu() noexcept;
    [[nodiscard]] bool        GpuReady() const noexcept;
    [[nodiscard]] VkImage     QueryLiveImage() const noexcept;
    [[nodiscard]] VkImageView QueryLiveView() const noexcept;

    void ConfigureLiveGpu(float                             ViewportAspect,
                          const EverestCameraSpecification& Camera,
                          const EverestEnvironmentSettings& Environment);

    void ConstructGpuCommands(VkCommandBuffer Commands);

    // Headless / CPU fallback path (used when no Vulkan presentation swapchain is attached)
    void EncodeFrame(uint32_t                          OutputWidth,
                     uint32_t                          OutputHeight,
                     const EverestCameraSpecification& Camera,
                     const EverestEnvironmentSettings& Environment,
                     std::vector<uint8_t>&             OutRgba8Pixels);

    void ResetAccumulation() noexcept;

    [[nodiscard]] const EverestCourseScene& Course() const noexcept { return Course_; }
    [[nodiscard]] uint32_t                  AccumulatedFrames() const noexcept { return AccumulatedFrames_; }

  private:
    void EnsureAtmosphereBaked(const std::array<float, 3>& SunDirection,
                               const std::array<float, 3>& SunRadiance,
                               float                       RayleighScale,
                               float                       MieTurbidity,
                               float                       MieAnisotropyG,
                               float                       OzoneScale);

    EverestCourseScene                      Course_{};
    Frontier::RayTracingSpace               RaySpace_{};
    Frontier::OccupantDistanceSpace         OccupantSdf_{};
    Frontier::SceneDistanceSpace            WorldSdf_{};
    Frontier::SurfaceCardDepot              CardDepot_{};
    Frontier::ClusteredLightingSequence     ClusteredLights_{};
    Frontier::ResamplingAndVarianceSequence Illumination_{};

    Frontier::AtmosphereParameters          AtmosphereParams_{};
    Frontier::TransmittanceLut              TransmittanceLut_{};
    Frontier::MultiScatteringLut            MultiScatteringLut_{};
    Frontier::SkyViewLut                    SkyViewLut_{};
    std::array<float, 3>                    LastBakedSunDir_    = {0.0f, 0.0f, 0.0f};
    float                                   LastBakedTurbidity_ = -1.0f;
    float                                   LastBakedRayleigh_  = -1.0f;
    uint64_t                                SkyLutRevision_     = 0u;

    uint32_t                                InternalWidth_      = 0u;
    uint32_t                                InternalHeight_     = 0u;
    uint32_t                                AccumulatedFrames_  = 0u;
    uint32_t                                FrameCounter_       = 0u;
    EverestCameraSpecification              LastCamera_{};
    std::array<float, 3>                    PrevEye_            = {11.2f, 0.0f, 3.1f};
    std::array<float, 3>                    PrevForward_        = {-1.0f, 0.0f, 0.0f};
    std::array<float, 3>                    PrevRight_          = { 0.0f, 1.0f, 0.0f};
    std::array<float, 3>                    PrevUp_             = { 0.0f, 0.0f, 1.0f};
    float                                   PrevTanHalf_        = 0.445f;
    float                                   PrevAspect_         = 1.777f;
    bool                                    HasPrevCamera_      = false;
    uint64_t                                LastWorldSignature_ = 0u;
    std::vector<Frontier::TracePixelGuide>  PrimaryGuides_{};
    std::vector<std::array<float, 3>>       AccumulatedHdr_{};
    std::vector<uint8_t>                    CachedRgba8Pixels_{};
    uint32_t                                CachedOutputWidth_  = 0u;
    uint32_t                                CachedOutputHeight_ = 0u;

    struct GpuEncodingAllocation;
    std::unique_ptr<GpuEncodingAllocation>  Gpu_{};
};

} // namespace Everest
