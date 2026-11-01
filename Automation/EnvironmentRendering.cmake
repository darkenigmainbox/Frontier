#============================================================================================================================================
#                                                     ENVIRONMENTRENDERING.CMAKE
#============================================================================================================================================
# 🧩 Multi-instance PlanetaryAtmosphere + 8-Trigger ForceField + GeometryProcessing (QEM Cluster Refinement) + (#if FRONTIER_EDITOR)
#    PreviewRaster (Blinn-Phong with basic shadows) + 1:1 VehicleHMI ReSTIR GI, Two-Level BVH, 16x16x4 Clustered Lighting,
#    4-Cascade Toroidal SDF + 6-Card Surface Radiosity Depot, and SVGF Variance Wavelet Filter.

add_library(FrontierEnvironmentRendering STATIC
    Engine/ContentInterchange/VolumeDistanceField.cpp
    Frontier/Engine/DeviceExchange/VulkanComputeExchange.cpp
    Frontier/Engine/Geometry/PrimitiveGeometryGenerator.cpp
    Frontier/Engine/Geometry/GeometryProcessing/FacetTierBuild.cpp
    Frontier/Engine/Geometry/GeometryProcessing/QuadricTierBuild.cpp
    Frontier/Engine/Geometry/GeometryProcessing/ScreenSpaceClusterRefinement.cpp
    Frontier/Engine/GeometricRaster/VisibilityProjection.cpp
    Frontier/Engine/GeometricRaster/PreviewRaster.cpp
    Frontier/Engine/PhysicalDynamics/ForceField.cpp
    Frontier/Engine/PlanetaryAtmosphere/AtmosphereScattering.cpp
    Frontier/Engine/PlanetaryAtmosphere/AstronomicalEphemeris.cpp
    Frontier/Engine/PlanetaryAtmosphere/AtmosphereProjection.cpp
    Frontier/Engine/PlanetaryAtmosphere/PlanetaryProjection.cpp
    Frontier/Engine/PlanetaryAtmosphere/CloudSpace.cpp
    Frontier/Engine/PlanetaryAtmosphere/VolumetricClouds.cpp
    Frontier/Engine/PlanetaryAtmosphere/FogSpace.cpp
    Frontier/Engine/PlanetaryAtmosphere/OpticalLensFlare.cpp
    Frontier/Engine/PlanetaryAtmosphere/PlanetaryEnsemble.cpp
    Frontier/Engine/PlanetaryAtmosphere/WeatherEffects.cpp
    Frontier/Engine/Rendering/EnvironmentUnits.cpp
    Frontier/Engine/Rendering/SubmissionOrder.cpp
    Frontier/Engine/Rendering/TransientTargetAtlas.cpp
    Frontier/Engine/Rendering/BarrierDerivation.cpp
    Frontier/Engine/Rendering/RayTracingSpace.cpp
    Frontier/Engine/Rendering/ClusteredLightingSequence.cpp
    Frontier/Engine/Rendering/DistanceAndCardSequence.cpp
    Frontier/Engine/Rendering/ResamplingAndVarianceSequence.cpp)

target_include_directories(FrontierEnvironmentRendering PUBLIC
    "${CMAKE_SOURCE_DIR}"
    "${CMAKE_SOURCE_DIR}/Frontier"
    "${CMAKE_SOURCE_DIR}/Engine/Interface"
    "${CMAKE_SOURCE_DIR}/ExternalPackages/vulkan-headers/include")
target_include_directories(FrontierEnvironmentRendering PRIVATE
    "${CMAKE_SOURCE_DIR}/ExternalPackages/stb")
target_compile_definitions(FrontierEnvironmentRendering PUBLIC VK_NO_PROTOTYPES)
target_link_libraries(FrontierEnvironmentRendering PUBLIC ${CMAKE_DL_LIBS} Threads::Threads)
if(TARGET EverestProjectEditor)
    target_link_libraries(EverestProjectEditor PUBLIC FrontierEnvironmentRendering)
endif()
if(TARGET EverestProjectRuntime)
    target_link_libraries(EverestProjectRuntime PUBLIC FrontierEnvironmentRendering)
endif()

# Shipping-profile compile-time verification target: compiles PreviewRaster.cpp + DiagnosticShippingExclusionCheck.cpp
# strictly under FRONTIER_SHIPPING_PROFILE=1 / FRONTIER_EDITOR=0 so Shipping builds never include debug/preview rasterizers.
add_library(FrontierPreviewShippingCheck STATIC
    Frontier/Engine/GeometricRaster/PreviewRaster.cpp
    Exhibits/ClusterDiagnostic/Code/DiagnosticShippingExclusionCheck.cpp)
target_include_directories(FrontierPreviewShippingCheck PRIVATE
    "${CMAKE_SOURCE_DIR}"
    "${CMAKE_SOURCE_DIR}/Frontier"
    "${CMAKE_SOURCE_DIR}/Engine/Interface"
    "${CMAKE_SOURCE_DIR}/ExternalPackages/vulkan-headers/include")
target_compile_definitions(FrontierPreviewShippingCheck PRIVATE
    VK_NO_PROTOTYPES
    FRONTIER_SHIPPING_PROFILE=1
    FRONTIER_EDITOR=0)

find_program(FRONTIER_ENV_SLANGC
    NAMES slangc
    PATHS
        "${CMAKE_SOURCE_DIR}/ExternalPackages/VulkanCompute/Slang/slangtorch/bin"
        "/tmp/slang/slangpy")

set(FRONTIER_ENV_SHADER_SRC "${CMAKE_SOURCE_DIR}/Frontier/Engine/Shaders")
set(FRONTIER_ENV_SHADER_OUT "${CMAKE_BINARY_DIR}/ShaderArchives/Environment")
set(FRONTIER_ENV_COMMON_SLANG
    "${FRONTIER_ENV_SHADER_SRC}/PlanetaryRecords.slang"
    "${FRONTIER_ENV_SHADER_SRC}/ForceField.slang"
    "${FRONTIER_ENV_SHADER_SRC}/AtmosphereScattering.slang"
    "${FRONTIER_ENV_SHADER_SRC}/CloudSynthesis.slang"
    "${FRONTIER_ENV_SHADER_SRC}/SceneRecords.slang"
    "${FRONTIER_ENV_SHADER_SRC}/FrameDescriptor.slang"
    "${FRONTIER_ENV_SHADER_SRC}/PackingCodec.slang"
    "${FRONTIER_ENV_SHADER_SRC}/SurfaceReflectance.slang"
    "${FRONTIER_ENV_SHADER_SRC}/DiscrepancySequence.slang"
    "${FRONTIER_ENV_SHADER_SRC}/ReservoirRecords.slang"
    "${FRONTIER_ENV_SHADER_SRC}/ClusteredLights.slang"
    "${FRONTIER_ENV_SHADER_SRC}/DistanceRecords.slang"
    "${FRONTIER_ENV_SHADER_SRC}/DistanceTraversal.slang"
    "${FRONTIER_ENV_SHADER_SRC}/CardProjection.slang"
    "${FRONTIER_ENV_SHADER_SRC}/CardIrradiance.slang"
    "${FRONTIER_ENV_SHADER_SRC}/CardSampling.slang"
    "${FRONTIER_ENV_SHADER_SRC}/FireIllumination.slang"
    "${FRONTIER_ENV_SHADER_SRC}/RayTraversal.slang")

# Module:EntryPoint:OutputStem:ExtraDefineFlag
set(FRONTIER_ENV_SHADER_SPECS
    "AtmosphereScattering:BakeTransmittanceLutMain:BakeTransmittanceLut:-DATMOSPHERE_LUT_KERNEL=1"
    "AtmosphereScattering:BakeMultiScatterLutMain:BakeMultiScatterLut:-DATMOSPHERE_LUT_KERNEL=1"
    "AtmosphereProjection:BakeAtmosphereProjectionLutMain:BakeAtmosphereProjectionLut:"
    "VisibilityProjection:RasterizeVisibilityProjectionMain:RasterizeVisibilityProjection:"
    "PlanetaryProjection:RasterizePlanetaryProjectionMain:RasterizePlanetaryProjection:"
    "CloudShadowProjection:ProjectCloudShadowMain:ProjectCloudShadow:"
    "VolumetricClouds:TraceVolumetricCloudsMain:TraceVolumetricClouds:"
    "VolumetricClouds:ReconstructVolumetricCloudsMain:ReconstructVolumetricClouds:"
    "FogSpace:IntegrateFogSpaceMain:IntegrateFogSpace:"
    "OpticalLensFlare:EvaluateFlareVisibilityMain:EvaluateFlareVisibility:"
    "OpticalLensFlare:CompositeFlareApertureMain:CompositeFlareAperture:"
    "PreviewRaster:ClearPreviewShadowMain:ClearPreviewShadow:"
    "PreviewRaster:ProjectPreviewShadowMain:ProjectPreviewShadow:"
    "PreviewRaster:BinPreviewTilesMain:BinPreviewTiles:"
    "PreviewRaster:ResolvePreviewViewMain:ResolvePreviewView:"
    "DistanceTransfer:TransferDistance:TransferDistance:"
    "FragmentDistance:ComputeFragmentDistance:ComputeFragmentDistance:"
    "DistanceUnion:UniteDistance:UniteDistance:"
    "CardDirect:IntegrateCardDirect:IntegrateCardDirect:"
    "CardRadiosity:IntegrateCardRadiosity:IntegrateCardRadiosity:"
    "CardFinal:IntegrateCardFinal:IntegrateCardFinal:"
    "DirectRadiance:IntegrateDirectRadiance:IntegrateDirectRadiance:"
    "ReservoirTemporal:ResampleTemporal:ResampleTemporal:"
    "ReservoirSpatial:ResampleSpatial:ResampleSpatial:"
    "ReflectionTraversal:TraverseReflection:TraverseReflection:"
    "VarianceTemporal:IntegrateTemporal:IntegrateTemporal:"
    "VarianceWavelet:ConvolveWavelet:ConvolveWavelet:"
    "VarianceUpsample:ProjectScreenSignal:ProjectScreenSignal:"
    "DisplayRecombination:ResolveRecombination:ResolveRecombination:")

set(FRONTIER_ENV_SPV_OUTPUTS)
if(FRONTIER_ENV_SLANGC)
    foreach(SPEC IN LISTS FRONTIER_ENV_SHADER_SPECS)
        string(REPLACE ":" ";" SPEC_PARTS "${SPEC}")
        list(GET SPEC_PARTS 0 SLANG_MODULE)
        list(GET SPEC_PARTS 1 ENTRY_NAME)
        list(GET SPEC_PARTS 2 OUT_STEM)
        list(LENGTH SPEC_PARTS SPEC_LEN)
        set(EXTRA_SLANG_ARGS)
        if(SPEC_LEN GREATER 3)
            list(GET SPEC_PARTS 3 EXTRA_FLAG)
            if(NOT "${EXTRA_FLAG}" STREQUAL "")
                list(APPEND EXTRA_SLANG_ARGS "${EXTRA_FLAG}")
            endif()
        endif()
        set(SPV_PATH "${FRONTIER_ENV_SHADER_OUT}/${OUT_STEM}.spv")
        list(APPEND FRONTIER_ENV_SPV_OUTPUTS "${SPV_PATH}")
        add_custom_command(
            OUTPUT "${SPV_PATH}"
            COMMAND "${CMAKE_COMMAND}" -E make_directory "${FRONTIER_ENV_SHADER_OUT}"
            COMMAND "${FRONTIER_ENV_SLANGC}" "${FRONTIER_ENV_SHADER_SRC}/${SLANG_MODULE}.slang"
                -I "${FRONTIER_ENV_SHADER_SRC}"
                ${EXTRA_SLANG_ARGS}
                -entry "${ENTRY_NAME}"
                -stage compute
                -target spirv
                -profile spirv_1_3
                -emit-spirv-directly
                -O0
                -o "${SPV_PATH}"
            DEPENDS "${FRONTIER_ENV_SHADER_SRC}/${SLANG_MODULE}.slang" ${FRONTIER_ENV_COMMON_SLANG}
            VERBATIM)
    endforeach()
    add_custom_target(FrontierEnvironmentShaders ALL DEPENDS ${FRONTIER_ENV_SPV_OUTPUTS})
endif()

if(BUILD_TESTING)
    add_executable(EnvironmentRealmValidation
        Exhibits/EnvironmentRealm/Code/EnvironmentRealmValidation.cpp
        Engine/Render/StbImageWriteImplementation.cpp)
    target_include_directories(EnvironmentRealmValidation PRIVATE "${CMAKE_SOURCE_DIR}/ExternalPackages/stb")
    target_link_libraries(EnvironmentRealmValidation PRIVATE FrontierEnvironmentRendering)
    if(TARGET FrontierEnvironmentShaders)
        add_dependencies(EnvironmentRealmValidation FrontierEnvironmentShaders)
    endif()
    add_test(NAME EnvironmentRealmValidation COMMAND EnvironmentRealmValidation
        "${CMAKE_SOURCE_DIR}"
        "${FRONTIER_ENV_SHADER_OUT}"
        "${CMAKE_BINARY_DIR}/environment-realm-exhibits")
    set_tests_properties(EnvironmentRealmValidation PROPERTIES RUN_SERIAL TRUE)

    add_executable(ForceFieldTriggerValidation
        Exhibits/EnvironmentRealm/Code/ForceFieldTriggerValidation.cpp
        Engine/Render/StbImageWriteImplementation.cpp)
    target_include_directories(ForceFieldTriggerValidation PRIVATE "${CMAKE_SOURCE_DIR}/ExternalPackages/stb")
    target_link_libraries(ForceFieldTriggerValidation PRIVATE FrontierEnvironmentRendering)
    if(TARGET FrontierEnvironmentShaders)
        add_dependencies(ForceFieldTriggerValidation FrontierEnvironmentShaders)
    endif()
    add_test(NAME ForceFieldTriggerValidation COMMAND ForceFieldTriggerValidation
        "${CMAKE_SOURCE_DIR}"
        "${FRONTIER_ENV_SHADER_OUT}"
        "${CMAKE_BINARY_DIR}/environment-realm-exhibits")
    set_tests_properties(ForceFieldTriggerValidation PROPERTIES RUN_SERIAL TRUE)

    add_executable(ClusterDiagnosticValidation
        Exhibits/ClusterDiagnostic/Code/ClusterDiagnosticValidation.cpp
        Engine/Render/StbImageWriteImplementation.cpp)
    target_include_directories(ClusterDiagnosticValidation PRIVATE "${CMAKE_SOURCE_DIR}/ExternalPackages/stb")
    target_compile_definitions(ClusterDiagnosticValidation PRIVATE FRONTIER_EDITOR_PROFILE=1 FRONTIER_EDITOR=1)
    target_link_libraries(ClusterDiagnosticValidation PRIVATE
        FrontierEnvironmentRendering
        FrontierPreviewShippingCheck
        FrontierInterface)
    if(TARGET FrontierEnvironmentShaders)
        add_dependencies(ClusterDiagnosticValidation FrontierEnvironmentShaders)
    endif()
    add_test(NAME ClusterDiagnosticValidation COMMAND ClusterDiagnosticValidation
        "${CMAKE_SOURCE_DIR}"
        "${FRONTIER_ENV_SHADER_OUT}"
        "${CMAKE_BINARY_DIR}/cluster-diagnostic-exhibits")
    set_tests_properties(ClusterDiagnosticValidation PROPERTIES RUN_SERIAL TRUE)

    add_executable(VehicleHmiIlluminationValidation
        Exhibits/VehicleHmiIllumination/Code/VehicleHmiIlluminationValidation.cpp
        Engine/Render/StbImageWriteImplementation.cpp)
    target_include_directories(VehicleHmiIlluminationValidation PRIVATE "${CMAKE_SOURCE_DIR}/ExternalPackages/stb")
    target_link_libraries(VehicleHmiIlluminationValidation PRIVATE FrontierEnvironmentRendering EverestProjectRuntime)
    if(TARGET FrontierEnvironmentShaders)
        add_dependencies(VehicleHmiIlluminationValidation FrontierEnvironmentShaders)
    endif()
    add_test(NAME VehicleHmiIlluminationValidation COMMAND VehicleHmiIlluminationValidation
        "${CMAKE_SOURCE_DIR}"
        "${FRONTIER_ENV_SHADER_OUT}"
        "${CMAKE_BINARY_DIR}/vehicle-hmi-exhibits")
    set_tests_properties(VehicleHmiIlluminationValidation PROPERTIES RUN_SERIAL TRUE)

    add_executable(ProjectContentStagingValidation
        Exhibits/ProjectSpace/Code/ProjectContentStagingValidation.cpp)
    target_link_libraries(ProjectContentStagingValidation PRIVATE
        FrontierEnvironmentRendering
        FrontierSceneEditorUI)
    if(TARGET StageContent_Everest)
        add_dependencies(ProjectContentStagingValidation StageContent_Everest)
    endif()
    add_test(NAME ProjectContentStagingValidation COMMAND ProjectContentStagingValidation
        "${CMAKE_SOURCE_DIR}/Projects/Everest"
        "/tmp/frontier-standalone-everest-sandbox")
endif()
