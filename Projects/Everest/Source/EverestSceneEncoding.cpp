/*==========================================================================================================================================
                                                     EVEREST SCENE ENCODING
==========================================================================================================================================*/

#include "EverestSceneEncoding.h"
#include "EverestSceneEncodingSpv.h"
#include "Engine/PlanetaryAtmosphere/FogSpace.h"
#include "Engine/PlanetaryAtmosphere/OpticalLensFlare.h"
#include "Engine/PlanetaryAtmosphere/VolumetricClouds.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <numbers>

namespace Everest
{

using namespace Frontier;

namespace
{

constexpr float    Degrees         = std::numbers::pi_v<float> / 180.0f;
constexpr uint32_t GpuRenderWidth  = 1280u;
constexpr uint32_t GpuRenderHeight = 720u;

[[nodiscard]] float Dot3(const std::array<float, 3>& A, const std::array<float, 3>& B) noexcept
{
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

[[nodiscard]] std::array<float, 3> Cross3(const std::array<float, 3>& A, const std::array<float, 3>& B) noexcept
{
    return {
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    };
}

[[nodiscard]] std::array<float, 3> Normalize3(const std::array<float, 3>& V) noexcept
{
    const float L = std::sqrt(Dot3(V, V));
    if (L > 1.0e-7f)
    {
        return {V[0] / L, V[1] / L, V[2] / L};
    }
    return {0.0f, 0.0f, 1.0f};
}

[[nodiscard]] std::array<float, 3> ApplyAcesFilmicLocal(const std::array<float, 3>& X) noexcept
{
    std::array<float, 3> Out{};
    for (size_t C = 0u; C < 3u; ++C)
    {
        const float V   = std::max(0.0f, X[C]);
        const float Num = V * (2.51f * V + 0.03f);
        const float Den = V * (2.43f * V + 0.59f) + 0.14f;
        Out[C]          = std::clamp(Num / std::max(Den, 1.0e-6f), 0.0f, 1.0f);
    }
    return Out;
}

[[nodiscard]] uint32_t HashDirectionCell(int32_t X, int32_t Y, int32_t Z) noexcept
{
    uint32_t H = static_cast<uint32_t>(X * 73856093) ^ static_cast<uint32_t>(Y * 19349663) ^ static_cast<uint32_t>(Z * 83492791);
    H ^= H >> 16u;
    H *= 0x7feb352du;
    H ^= H >> 15u;
    H *= 0x846ca68bu;
    H ^= H >> 16u;
    return H;
}

[[nodiscard]] std::array<float, 3> EvaluateStarAndPlanetField(const std::array<float, 3>& RayDir,
                                                              const StarConfiguration&    StarCfg,
                                                              float                       DaylightSuppression) noexcept
{
    if (!StarCfg.Enabled || RayDir[2] <= 0.01f || DaylightSuppression >= 0.99f)
    {
        return {0.0f, 0.0f, 0.0f};
    }

    const float    Visibility = (1.0f - DaylightSuppression) * std::clamp(RayDir[2] * 3.5f, 0.0f, 1.0f);
    const int32_t  CellX      = static_cast<int32_t>(std::floor(RayDir[0] * 140.0f));
    const int32_t  CellY      = static_cast<int32_t>(std::floor(RayDir[1] * 140.0f));
    const int32_t  CellZ      = static_cast<int32_t>(std::floor(RayDir[2] * 140.0f));
    const uint32_t H          = HashDirectionCell(CellX, CellY, CellZ);

    std::array<float, 3> Out = {0.0f, 0.0f, 0.0f};
    if ((H & 0xFFu) < 4u)
    {
        const float Temp  = static_cast<float>((H >> 8u) & 0xFFu) / 255.0f;
        const float Scint = 1.0f - 0.35f * StarCfg.AtmosphericScintillate * static_cast<float>((H >> 16u) & 0xFFu) / 255.0f;
        const float Lum   = StarCfg.MagnitudeGain * Scint * Visibility * (0.25f + 0.75f * Temp);
        Out[0] += Lum * (0.80f + 0.40f * (1.0f - Temp));
        Out[1] += Lum * 0.92f;
        Out[2] += Lum * (0.75f + 0.45f * Temp);
    }

    if (StarCfg.MilkyWayLuminance > 0.0f)
    {
        const float GalacticPlane = RayDir[0] * 0.45f - RayDir[1] * 0.55f + RayDir[2] * 0.70f;
        const float Band          = std::exp(-GalacticPlane * GalacticPlane * 14.0f) * StarCfg.MilkyWayLuminance * 0.06f * Visibility;
        Out[0] += Band * 0.78f;
        Out[1] += Band * 0.86f;
        Out[2] += Band * 1.12f;
    }

    static constexpr std::array<std::array<float, 3>, 2> PlanetDirs = {{
        {-0.42f,  0.68f, 0.60f},
        { 0.58f, -0.52f, 0.62f}
    }};
    for (size_t P = 0u; P < PlanetDirs.size(); ++P)
    {
        const auto  PDir = Normalize3(PlanetDirs[P]);
        const float CosA = Dot3(RayDir, PDir);
        if (CosA > 0.99975f)
        {
            const float Glow = StarCfg.MagnitudeGain * 1.8f * Visibility;
            Out[0] += Glow * (P == 0u ? 1.10f : 0.95f);
            Out[1] += Glow * (P == 0u ? 0.95f : 0.88f);
            Out[2] += Glow * (P == 0u ? 0.78f : 0.72f);
        }
    }

    return Out;
}

[[nodiscard]] std::array<float, 3> EvaluateMoonDiscs(const std::array<float, 3>& RayDir,
                                                     const std::array<float, 3>& SunDir,
                                                     const MoonConfiguration&    MoonCfg) noexcept
{
    if (!MoonCfg.Enabled || RayDir[2] <= 0.0f)
    {
        return {0.0f, 0.0f, 0.0f};
    }

    std::array<float, 3> Result = {0.0f, 0.0f, 0.0f};

    const float OrbitRad = MoonCfg.PrimaryOrbitDegrees * Degrees;
    const std::array<float, 3> PrimaryDir = Normalize3({
        std::cos(OrbitRad) * 0.78f,
        std::sin(OrbitRad) * 0.78f,
        0.62f
    });
    const float PrimRad      = 0.014f;
    const float CosPrimary   = Dot3(RayDir, PrimaryDir);
    const float AnglePrimary = std::acos(std::clamp(CosPrimary, -1.0f, 1.0f));
    if (AnglePrimary < PrimRad)
    {
        const float Radial  = AnglePrimary / PrimRad;
        const float SphereZ = std::sqrt(std::max(0.0f, 1.0f - Radial * Radial));
        const std::array<float, 3> Normal = Normalize3({
            RayDir[0] - PrimaryDir[0] * (1.0f - SphereZ),
            RayDir[1] - PrimaryDir[1] * (1.0f - SphereZ),
            RayDir[2] - PrimaryDir[2] * (1.0f - SphereZ)
        });
        const float LitDot     = std::max(0.0f, Dot3(Normal, SunDir));
        const float Lommel     = (LitDot > 0.0f) ? (2.0f * LitDot / (LitDot + SphereZ + 0.05f)) : 0.0f;
        const float PhaseLit   = Lommel * MoonCfg.PrimaryPhase * MoonCfg.PrimaryAlbedo * 8.5f;
        const float Earthshine = MoonCfg.EarthshineLuminance * 0.08f * SphereZ;
        const float Total      = PhaseLit + Earthshine;
        Result[0] += Total * 0.96f;
        Result[1] += Total * 0.98f;
        Result[2] += Total * 1.04f;
    }

    if (MoonCfg.SecondaryMoonEnabled)
    {
        const float SecRad = MoonCfg.SecondaryOrbitDegrees * Degrees;
        const std::array<float, 3> SecDir = Normalize3({
            std::cos(SecRad) * 0.84f,
            std::sin(SecRad) * 0.84f,
            0.54f
        });
        const float AngleSec = std::acos(std::clamp(Dot3(RayDir, SecDir), -1.0f, 1.0f));
        if (AngleSec < 0.0085f)
        {
            const float SphereZ = std::sqrt(std::max(0.0f, 1.0f - (AngleSec / 0.0085f) * (AngleSec / 0.0085f)));
            const float Glow    = (0.35f + 0.65f * SphereZ) * MoonCfg.PrimaryAlbedo * 4.5f;
            Result[0] += Glow * 0.88f;
            Result[1] += Glow * 0.92f;
            Result[2] += Glow * 1.06f;
        }
    }

    return Result;
}

} // namespace

//==========================================================================================================================================
//                                                 GPU VULKAN COMPUTE ALLOCATION
//==========================================================================================================================================
struct EverestSceneEncoding::GpuEncodingAllocation
{
    VulkanRasterAccess               Access{};
    VkPhysicalDeviceMemoryProperties MemoryProperties{};
    bool                             Ready            = false;
    bool                             ImageInitialized = false;
    bool                             PendingDispatch  = false;
    uint64_t                         UploadedSkyRev   = 0u;

#define EVEREST_VK_FUNCTIONS(Fn)                                                                   \
    Fn(CreateBuffer) Fn(DestroyBuffer) Fn(GetBufferMemoryRequirements)                             \
    Fn(AllocateMemory) Fn(FreeMemory) Fn(BindBufferMemory) Fn(MapMemory) Fn(UnmapMemory)           \
    Fn(CreateImage) Fn(DestroyImage) Fn(GetImageMemoryRequirements) Fn(BindImageMemory)            \
    Fn(CreateImageView) Fn(DestroyImageView) Fn(CreateShaderModule) Fn(DestroyShaderModule)        \
    Fn(CreateDescriptorSetLayout) Fn(DestroyDescriptorSetLayout)                                   \
    Fn(CreateDescriptorPool) Fn(DestroyDescriptorPool) Fn(AllocateDescriptorSets)                  \
    Fn(UpdateDescriptorSets) Fn(CreatePipelineLayout) Fn(DestroyPipelineLayout)                    \
    Fn(CreateComputePipelines) Fn(DestroyPipeline)                                                 \
    Fn(CmdBindPipeline) Fn(CmdBindDescriptorSets) Fn(CmdDispatch) Fn(CmdPipelineBarrier)
#define EVEREST_DECL_VK(Name) PFN_vk##Name Name = nullptr;
    EVEREST_VK_FUNCTIONS(EVEREST_DECL_VK)
#undef EVEREST_DECL_VK

    struct BufferSlot
    {
        VkBuffer       Buffer = VK_NULL_HANDLE;
        VkDeviceMemory Memory = VK_NULL_HANDLE;
        VkDeviceSize   Bytes  = 0u;
        void*          Mapped = nullptr;
    };

    BufferSlot            BvhNodes{};
    BufferSlot            BlasTriangles{};
    BufferSlot            Occupants{};
    BufferSlot            Materials{};
    BufferSlot            UniformsAndLightsPass0{};
    BufferSlot            UniformsAndLightsPass1{};
    BufferSlot            SkyLut{};
    BufferSlot            Reservoirs{};
    BufferSlot            Accumulation{};

    VkImage               OutputImage        = VK_NULL_HANDLE;
    VkDeviceMemory        OutputMemory       = VK_NULL_HANDLE;
    VkImageView           OutputView         = VK_NULL_HANDLE;

    VkShaderModule        ShaderModule       = VK_NULL_HANDLE;
    VkDescriptorSetLayout SetLayout          = VK_NULL_HANDLE;
    VkDescriptorPool      DescriptorPool     = VK_NULL_HANDLE;
    VkDescriptorSet       DescriptorSetPass0 = VK_NULL_HANDLE;
    VkDescriptorSet       DescriptorSetPass1 = VK_NULL_HANDLE;
    VkPipelineLayout      PipelineLayout     = VK_NULL_HANDLE;
    VkPipeline            Pipeline           = VK_NULL_HANDLE;

    [[nodiscard]] uint32_t SelectMemoryType(uint32_t TypeBits, VkMemoryPropertyFlags Flags) const noexcept
    {
        for (uint32_t I = 0u; I < MemoryProperties.memoryTypeCount; ++I)
        {
            if ((TypeBits & (1u << I)) != 0u && (MemoryProperties.memoryTypes[I].propertyFlags & Flags) == Flags)
            {
                return I;
            }
        }
        for (uint32_t I = 0u; I < MemoryProperties.memoryTypeCount; ++I)
        {
            if ((TypeBits & (1u << I)) != 0u)
            {
                return I;
            }
        }
        return 0u;
    }

    bool AllocateBuffer(VkDeviceSize Bytes, VkMemoryPropertyFlags MemFlags, const void* InitialData, BufferSlot& Out)
    {
        VkBufferCreateInfo Info{VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO};
        Info.size        = std::max<VkDeviceSize>(Bytes, 16u);
        Info.usage       = VK_BUFFER_USAGE_STORAGE_BUFFER_BIT;
        Info.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
        if (CreateBuffer(Access.Device, &Info, nullptr, &Out.Buffer) != VK_SUCCESS)
        {
            return false;
        }
        VkMemoryRequirements Req{};
        GetBufferMemoryRequirements(Access.Device, Out.Buffer, &Req);
        VkMemoryAllocateInfo Alloc{VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO};
        Alloc.allocationSize  = Req.size;
        Alloc.memoryTypeIndex = SelectMemoryType(Req.memoryTypeBits, MemFlags);
        if (AllocateMemory(Access.Device, &Alloc, nullptr, &Out.Memory) != VK_SUCCESS)
        {
            return false;
        }
        if (BindBufferMemory(Access.Device, Out.Buffer, Out.Memory, 0u) != VK_SUCCESS)
        {
            return false;
        }
        Out.Bytes = Info.size;
        if ((MemFlags & VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT) != 0u)
        {
            if (MapMemory(Access.Device, Out.Memory, 0u, Out.Bytes, 0u, &Out.Mapped) != VK_SUCCESS)
            {
                return false;
            }
            std::memset(Out.Mapped, 0, static_cast<size_t>(Out.Bytes));
            if (InitialData != nullptr && Bytes > 0u)
            {
                std::memcpy(Out.Mapped, InitialData, static_cast<size_t>(Bytes));
            }
        }
        return true;
    }

    void ReleaseBuffer(BufferSlot& Slot) noexcept
    {
        if (!Access.Device)
        {
            return;
        }
        if (Slot.Mapped && UnmapMemory)
        {
            UnmapMemory(Access.Device, Slot.Memory);
            Slot.Mapped = nullptr;
        }
        if (Slot.Buffer && DestroyBuffer)
        {
            DestroyBuffer(Access.Device, Slot.Buffer, nullptr);
            Slot.Buffer = VK_NULL_HANDLE;
        }
        if (Slot.Memory && FreeMemory)
        {
            FreeMemory(Access.Device, Slot.Memory, nullptr);
            Slot.Memory = VK_NULL_HANDLE;
        }
        Slot.Bytes = 0u;
    }

    void Finalize() noexcept
    {
        if (!Access.Device)
        {
            return;
        }
        if (Pipeline && DestroyPipeline)
        {
            DestroyPipeline(Access.Device, Pipeline, nullptr);
            Pipeline = VK_NULL_HANDLE;
        }
        if (PipelineLayout && DestroyPipelineLayout)
        {
            DestroyPipelineLayout(Access.Device, PipelineLayout, nullptr);
            PipelineLayout = VK_NULL_HANDLE;
        }
        if (DescriptorPool && DestroyDescriptorPool)
        {
            DestroyDescriptorPool(Access.Device, DescriptorPool, nullptr);
            DescriptorPool = VK_NULL_HANDLE;
        }
        if (SetLayout && DestroyDescriptorSetLayout)
        {
            DestroyDescriptorSetLayout(Access.Device, SetLayout, nullptr);
            SetLayout = VK_NULL_HANDLE;
        }
        if (ShaderModule && DestroyShaderModule)
        {
            DestroyShaderModule(Access.Device, ShaderModule, nullptr);
            ShaderModule = VK_NULL_HANDLE;
        }
        if (OutputView && DestroyImageView)
        {
            DestroyImageView(Access.Device, OutputView, nullptr);
            OutputView = VK_NULL_HANDLE;
        }
        if (OutputImage && DestroyImage)
        {
            DestroyImage(Access.Device, OutputImage, nullptr);
            OutputImage = VK_NULL_HANDLE;
        }
        if (OutputMemory && FreeMemory)
        {
            FreeMemory(Access.Device, OutputMemory, nullptr);
            OutputMemory = VK_NULL_HANDLE;
        }
        ReleaseBuffer(BvhNodes);
        ReleaseBuffer(BlasTriangles);
        ReleaseBuffer(Occupants);
        ReleaseBuffer(Materials);
        ReleaseBuffer(UniformsAndLightsPass0);
        ReleaseBuffer(UniformsAndLightsPass1);
        ReleaseBuffer(SkyLut);
        ReleaseBuffer(Reservoirs);
        ReleaseBuffer(Accumulation);
        Ready            = false;
        ImageInitialized = false;
        PendingDispatch  = false;
        Access           = {};
    }

    ~GpuEncodingAllocation()
    {
        Finalize();
    }
};

//==========================================================================================================================================
//                                                    EVEREST SCENE ENCODING
//==========================================================================================================================================
EverestSceneEncoding::EverestSceneEncoding()
    : Gpu_(std::make_unique<GpuEncodingAllocation>())
{
    Course_ = ConstructEverestCourseScene();
    RaySpace_.ConstructResources(Course_.Scene);
    OccupantSdf_.ConstructResources(Course_.Scene);
    WorldSdf_.UpdateCascades(Course_.Scene, {0.8f, 0.0f, 0.8f}, true);
    CardDepot_.ConstructResources(Course_.Scene);
    ClusteredLights_.HeadlightMode = AutomotiveBeamMode::LowBeam;
    ClusteredLights_.Update(
        Course_.Scene.Occupants[Course_.ShowcaseVehicles[0].BodyOccupant].Transform,
        Course_.StreetPoles,
        Course_.PointLamps,
        nullptr);
    AtmosphereParams_ = MakeEarthAtmosphere();
}

EverestSceneEncoding::~EverestSceneEncoding()
{
    FinalizeGpu();
}

bool EverestSceneEncoding::InitializeGpu(const VulkanRasterAccess& Access)
{
    FinalizeGpu();
    if (!Access.Device || !Access.PhysicalDevice || !Access.ResolveDevice || !Access.QueryMemory)
    {
        return false;
    }

    Gpu_->Access = Access;
    Access.QueryMemory(Access.PhysicalDevice, &Gpu_->MemoryProperties);

#define EVEREST_RESOLVE_VK(Name)                                                                       \
    Gpu_->Name = reinterpret_cast<PFN_vk##Name>(Access.ResolveDevice(Access.Device, "vk" #Name));      \
    if (!Gpu_->Name)                                                                                   \
    {                                                                                                  \
        FinalizeGpu();                                                                                 \
        return false;                                                                                  \
    }
    EVEREST_VK_FUNCTIONS(EVEREST_RESOLVE_VK)
#undef EVEREST_RESOLVE_VK

    constexpr VkMemoryPropertyFlags HostVisibleCoherent =
        VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;

    // 1. Upload BvhNodes & BlasTriangles
    const auto& CellWords = RaySpace_.AllCellWords();
    const auto& TriWords  = RaySpace_.AllTriangleWords();
    if (!Gpu_->AllocateBuffer(CellWords.size() * sizeof(uint32_t), HostVisibleCoherent, CellWords.data(), Gpu_->BvhNodes) ||
        !Gpu_->AllocateBuffer(TriWords.size() * sizeof(uint32_t),  HostVisibleCoherent, TriWords.data(),  Gpu_->BlasTriangles))
    {
        FinalizeGpu();
        return false;
    }

    // 2. Upload Occupants (36 uint32 words = 144 bytes per occupant)
    std::vector<uint32_t> OccupantWords(Course_.Scene.Occupants.size() * 36u, 0u);
    for (size_t I = 0u; I < Course_.Scene.Occupants.size(); ++I)
    {
        const SceneOccupantInstance& Occ = Course_.Scene.Occupants[I];
        const std::array<float, 16>  Inv = InvertRigidOrAffineTransform(Occ.Transform);
        uint32_t*                    Dst = &OccupantWords[I * 36u];
        std::memcpy(Dst +  0u, Occ.Transform.data(), 16u * sizeof(float));
        std::memcpy(Dst + 16u, Inv.data(),           16u * sizeof(float));
        Dst[32u] = Occ.Assignments;
        Dst[33u] = Occ.MaterialOverride;
        Dst[34u] = 0u;
        Dst[35u] = 0u;
    }
    if (!Gpu_->AllocateBuffer(OccupantWords.size() * sizeof(uint32_t), HostVisibleCoherent, OccupantWords.data(), Gpu_->Occupants))
    {
        FinalizeGpu();
        return false;
    }

    // 3. Upload Materials (24 floats = 96 bytes per material)
    const std::vector<float> MaterialFloats = Frontier::EncodeMaterialRecords(Course_.Materials);
    if (!Gpu_->AllocateBuffer(MaterialFloats.size() * sizeof(float), HostVisibleCoherent, MaterialFloats.data(), Gpu_->Materials))
    {
        FinalizeGpu();
        return false;
    }

    // 4. Allocate UniformsAndLights (96 float4s per pass), SkyLut (96*54 float4s), Reservoirs (4x for ping-pong history), and Accumulation (4x)
    const VkDeviceSize PixelCount     = static_cast<VkDeviceSize>(GpuRenderWidth) * GpuRenderHeight;
    const VkDeviceSize ReservoirBytes = PixelCount * 4u * 4u * sizeof(float);
    if (!Gpu_->AllocateBuffer(96u * 4u * sizeof(float),       HostVisibleCoherent,                nullptr, Gpu_->UniformsAndLightsPass0) ||
        !Gpu_->AllocateBuffer(96u * 4u * sizeof(float),       HostVisibleCoherent,                nullptr, Gpu_->UniformsAndLightsPass1) ||
        !Gpu_->AllocateBuffer(96u * 54u * 4u * sizeof(float), HostVisibleCoherent,                nullptr, Gpu_->SkyLut) ||
        !Gpu_->AllocateBuffer(ReservoirBytes,                 VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, nullptr, Gpu_->Reservoirs) ||
        !Gpu_->AllocateBuffer(ReservoirBytes,                 VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, nullptr, Gpu_->Accumulation))
    {
        FinalizeGpu();
        return false;
    }

    // 5. Allocate OutputImage (1280x720 RGBA8 storage + sampled image)
    VkImageCreateInfo ImageInfo{VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO};
    ImageInfo.imageType     = VK_IMAGE_TYPE_2D;
    ImageInfo.format        = VK_FORMAT_R8G8B8A8_UNORM;
    ImageInfo.extent        = {GpuRenderWidth, GpuRenderHeight, 1u};
    ImageInfo.mipLevels     = 1u;
    ImageInfo.arrayLayers   = 1u;
    ImageInfo.samples       = VK_SAMPLE_COUNT_1_BIT;
    ImageInfo.tiling        = VK_IMAGE_TILING_OPTIMAL;
    ImageInfo.usage         = VK_IMAGE_USAGE_STORAGE_BIT | VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT;
    ImageInfo.sharingMode   = VK_SHARING_MODE_EXCLUSIVE;
    ImageInfo.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    if (Gpu_->CreateImage(Access.Device, &ImageInfo, nullptr, &Gpu_->OutputImage) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    VkMemoryRequirements ImgReq{};
    Gpu_->GetImageMemoryRequirements(Access.Device, Gpu_->OutputImage, &ImgReq);
    VkMemoryAllocateInfo ImgAlloc{VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO};
    ImgAlloc.allocationSize  = ImgReq.size;
    ImgAlloc.memoryTypeIndex = Gpu_->SelectMemoryType(ImgReq.memoryTypeBits, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT);
    if (Gpu_->AllocateMemory(Access.Device, &ImgAlloc, nullptr, &Gpu_->OutputMemory) != VK_SUCCESS ||
        Gpu_->BindImageMemory(Access.Device, Gpu_->OutputImage, Gpu_->OutputMemory, 0u) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    VkImageViewCreateInfo ViewInfo{VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO};
    ViewInfo.image                           = Gpu_->OutputImage;
    ViewInfo.viewType                        = VK_IMAGE_VIEW_TYPE_2D;
    ViewInfo.format                          = VK_FORMAT_R8G8B8A8_UNORM;
    ViewInfo.subresourceRange.aspectMask     = VK_IMAGE_ASPECT_COLOR_BIT;
    ViewInfo.subresourceRange.baseMipLevel   = 0u;
    ViewInfo.subresourceRange.levelCount     = 1u;
    ViewInfo.subresourceRange.baseArrayLayer = 0u;
    ViewInfo.subresourceRange.layerCount     = 1u;
    if (Gpu_->CreateImageView(Access.Device, &ViewInfo, nullptr, &Gpu_->OutputView) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    // 6. Create ShaderModule, DescriptorSetLayout, PipelineLayout, ComputePipeline, and DescriptorSet
    VkShaderModuleCreateInfo ShaderInfo{VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO};
    ShaderInfo.codeSize = sizeof(EverestSceneEncodingSpvWords);
    ShaderInfo.pCode    = EverestSceneEncodingSpvWords;
    if (Gpu_->CreateShaderModule(Access.Device, &ShaderInfo, nullptr, &Gpu_->ShaderModule) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    std::array<VkDescriptorSetLayoutBinding, 9> Bindings{};
    for (uint32_t B = 0u; B < 9u; ++B)
    {
        Bindings[B].binding         = B;
        Bindings[B].descriptorType  = (B == 8u) ? VK_DESCRIPTOR_TYPE_STORAGE_IMAGE : VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        Bindings[B].descriptorCount = 1u;
        Bindings[B].stageFlags      = VK_SHADER_STAGE_COMPUTE_BIT;
    }
    VkDescriptorSetLayoutCreateInfo LayoutInfo{VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO};
    LayoutInfo.bindingCount = static_cast<uint32_t>(Bindings.size());
    LayoutInfo.pBindings    = Bindings.data();
    if (Gpu_->CreateDescriptorSetLayout(Access.Device, &LayoutInfo, nullptr, &Gpu_->SetLayout) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    VkPipelineLayoutCreateInfo PipeLayoutInfo{VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO};
    PipeLayoutInfo.setLayoutCount = 1u;
    PipeLayoutInfo.pSetLayouts    = &Gpu_->SetLayout;
    if (Gpu_->CreatePipelineLayout(Access.Device, &PipeLayoutInfo, nullptr, &Gpu_->PipelineLayout) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    VkComputePipelineCreateInfo PipeInfo{VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO};
    PipeInfo.stage.sType  = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    PipeInfo.stage.stage  = VK_SHADER_STAGE_COMPUTE_BIT;
    PipeInfo.stage.module = Gpu_->ShaderModule;
    PipeInfo.stage.pName  = "main";
    PipeInfo.layout       = Gpu_->PipelineLayout;
    if (Gpu_->CreateComputePipelines(Access.Device, VK_NULL_HANDLE, 1u, &PipeInfo, nullptr, &Gpu_->Pipeline) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    std::array<VkDescriptorPoolSize, 2> PoolSizes = {{
        {VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 16u},
        {VK_DESCRIPTOR_TYPE_STORAGE_IMAGE,  2u}
    }};
    VkDescriptorPoolCreateInfo PoolInfo{VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO};
    PoolInfo.maxSets       = 2u;
    PoolInfo.poolSizeCount = static_cast<uint32_t>(PoolSizes.size());
    PoolInfo.pPoolSizes    = PoolSizes.data();
    if (Gpu_->CreateDescriptorPool(Access.Device, &PoolInfo, nullptr, &Gpu_->DescriptorPool) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }

    std::array<VkDescriptorSetLayout, 2> SetLayouts = {Gpu_->SetLayout, Gpu_->SetLayout};
    std::array<VkDescriptorSet, 2>       AllocSets  = {VK_NULL_HANDLE, VK_NULL_HANDLE};
    VkDescriptorSetAllocateInfo SetAlloc{VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO};
    SetAlloc.descriptorPool     = Gpu_->DescriptorPool;
    SetAlloc.descriptorSetCount = 2u;
    SetAlloc.pSetLayouts        = SetLayouts.data();
    if (Gpu_->AllocateDescriptorSets(Access.Device, &SetAlloc, AllocSets.data()) != VK_SUCCESS)
    {
        FinalizeGpu();
        return false;
    }
    Gpu_->DescriptorSetPass0 = AllocSets[0];
    Gpu_->DescriptorSetPass1 = AllocSets[1];

    VkDescriptorImageInfo ImgDescInfo{};
    ImgDescInfo.imageView   = Gpu_->OutputView;
    ImgDescInfo.imageLayout = VK_IMAGE_LAYOUT_GENERAL;

    for (uint32_t Pass = 0u; Pass < 2u; ++Pass)
    {
        const GpuEncodingAllocation::BufferSlot* UboSlot =
            (Pass == 0u) ? &Gpu_->UniformsAndLightsPass0 : &Gpu_->UniformsAndLightsPass1;
        VkDescriptorSet TargetSet = (Pass == 0u) ? Gpu_->DescriptorSetPass0 : Gpu_->DescriptorSetPass1;

        const std::array<const GpuEncodingAllocation::BufferSlot*, 8> BufSlots = {{
            &Gpu_->BvhNodes,
            &Gpu_->BlasTriangles,
            &Gpu_->Occupants,
            &Gpu_->Materials,
            UboSlot,
            &Gpu_->SkyLut,
            &Gpu_->Reservoirs,
            &Gpu_->Accumulation
        }};
        std::array<VkDescriptorBufferInfo, 8> BufInfos{};
        std::array<VkWriteDescriptorSet, 9>   Writes{};
        for (uint32_t B = 0u; B < 8u; ++B)
        {
            BufInfos[B].buffer = BufSlots[B]->Buffer;
            BufInfos[B].offset = 0u;
            BufInfos[B].range  = BufSlots[B]->Bytes;

            Writes[B].sType           = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
            Writes[B].dstSet          = TargetSet;
            Writes[B].dstBinding      = B;
            Writes[B].descriptorCount = 1u;
            Writes[B].descriptorType  = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
            Writes[B].pBufferInfo     = &BufInfos[B];
        }
        Writes[8].sType           = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        Writes[8].dstSet          = TargetSet;
        Writes[8].dstBinding      = 8u;
        Writes[8].descriptorCount = 1u;
        Writes[8].descriptorType  = VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
        Writes[8].pImageInfo      = &ImgDescInfo;

        Gpu_->UpdateDescriptorSets(Access.Device, static_cast<uint32_t>(Writes.size()), Writes.data(), 0u, nullptr);
    }
    Gpu_->Ready = true;
    return true;
}

void EverestSceneEncoding::FinalizeGpu() noexcept
{
    if (Gpu_)
    {
        Gpu_->Finalize();
    }
}

bool EverestSceneEncoding::GpuReady() const noexcept
{
    return Gpu_ && Gpu_->Ready;
}

VkImage EverestSceneEncoding::QueryLiveImage() const noexcept
{
    return (Gpu_ && Gpu_->Ready) ? Gpu_->OutputImage : VK_NULL_HANDLE;
}

VkImageView EverestSceneEncoding::QueryLiveView() const noexcept
{
    return (Gpu_ && Gpu_->Ready) ? Gpu_->OutputView : VK_NULL_HANDLE;
}

void EverestSceneEncoding::ResetAccumulation() noexcept
{
    AccumulatedFrames_  = 0u;
    CachedOutputWidth_  = 0u;
    CachedOutputHeight_ = 0u;
    if (InternalWidth_ > 0u && InternalHeight_ > 0u)
    {
        Illumination_.ConfigureDimensions(InternalWidth_, InternalHeight_, 1u);
    }
}

void EverestSceneEncoding::EnsureAtmosphereBaked(const std::array<float, 3>& SunDirection,
                                                 const std::array<float, 3>& SunRadiance,
                                                 float                       RayleighScale,
                                                 float                       MieTurbidity,
                                                 float                       MieAnisotropyG,
                                                 float                       OzoneScale)
{
    const float DirDelta = std::abs(SunDirection[0] - LastBakedSunDir_[0])
                         + std::abs(SunDirection[1] - LastBakedSunDir_[1])
                         + std::abs(SunDirection[2] - LastBakedSunDir_[2]);
    const bool ParamsChanged = std::abs(MieTurbidity - LastBakedTurbidity_) > 1.0e-3f
                            || std::abs(RayleighScale - LastBakedRayleigh_) > 1.0e-3f;

    if (ParamsChanged || !TransmittanceLut_.Baked())
    {
        AtmosphereParams_ = MakeEarthAtmosphere();
        AtmosphereParams_.RayleighScattering.R *= RayleighScale;
        AtmosphereParams_.RayleighScattering.G *= RayleighScale;
        AtmosphereParams_.RayleighScattering.B *= RayleighScale;
        AtmosphereParams_.MieScattering        *= (MieTurbidity / 2.4);
        AtmosphereParams_.MieAbsorption        *= (MieTurbidity / 2.4);
        AtmosphereParams_.MiePhaseG             = std::clamp(static_cast<double>(MieAnisotropyG), 0.0, 0.95);
        AtmosphereParams_.OzoneAbsorption.R    *= OzoneScale;
        AtmosphereParams_.OzoneAbsorption.G    *= OzoneScale;
        AtmosphereParams_.OzoneAbsorption.B    *= OzoneScale;

        TransmittanceLut_.Bake(AtmosphereParams_, 64u, 16u, 24u);
        MultiScatteringLut_.Bake(AtmosphereParams_, TransmittanceLut_, 16u, 16u, 8u);
        LastBakedTurbidity_ = MieTurbidity;
        LastBakedRayleigh_  = RayleighScale;
    }

    if (ParamsChanged || DirDelta > 1.0e-3f || !SkyViewLut_.Baked())
    {
        AtmosphereSolarSource Solar{};
        Solar.Direction  = {SunDirection[0], SunDirection[1], SunDirection[2]};
        Solar.Irradiance = {
            std::max(0.5, static_cast<double>(SunRadiance[0]) * 4.8),
            std::max(0.5, static_cast<double>(SunRadiance[1]) * 4.8),
            std::max(0.5, static_cast<double>(SunRadiance[2]) * 4.8)
        };
        Solar.TwilightStrength = 1.0;
        const std::array<AtmosphereSolarSource, 1> Suns = {Solar};
        SkyViewLut_.Bake(AtmosphereParams_, TransmittanceLut_, MultiScatteringLut_, 0.05, Suns, 96u, 54u, 16u);
        LastBakedSunDir_ = SunDirection;
        ++SkyLutRevision_;
    }
}

void EverestSceneEncoding::ConfigureLiveGpu(float                             ViewportAspect,
                                            const EverestCameraSpecification& Camera,
                                            const EverestEnvironmentSettings& Environment)
{
    if (!GpuReady())
    {
        return;
    }

    const SolarConfiguration&          SolarCfg    = Environment.Solar;
    const AtmosphereConfiguration&     AtmosCfg    = Environment.Atmosphere;
    const CloudConfiguration&          CloudCfg    = Environment.Cloud;
    const FogConfiguration&            FogCfg      = Environment.Fog;
    const OpticalFlareConfiguration&   FlareCfg    = Environment.OpticalFlare;
    const MoonConfiguration&           MoonCfg     = Environment.Moon;
    const StarConfiguration&           StarCfg     = Environment.Star;
    const RenderPipelineConfiguration& PipelineCfg = Environment.Pipeline;

    const float ElevRad = SolarCfg.ElevationDegrees * Degrees;
    const float AzimRad = SolarCfg.AzimuthDegrees * Degrees;
    const std::array<float, 3> SunDirection = Normalize3({
        std::cos(ElevRad) * std::cos(AzimRad),
        std::cos(ElevRad) * std::sin(AzimRad),
        std::sin(ElevRad)
    });

    const float SunFluxScale   = SolarCfg.Enabled ? std::max(0.0f, SolarCfg.IlluminanceKilolux / 42.0f) : 0.0f;
    const float DaylightFactor = std::clamp((SunDirection[2] + 0.08f) / 0.35f, 0.0f, 1.0f);
    std::array<float, 3> SunRadiance = {
        SunFluxScale * (0.85f + 0.25f * DaylightFactor),
        SunFluxScale * (0.62f + 0.36f * DaylightFactor),
        SunFluxScale * (0.38f + 0.56f * DaylightFactor)
    };

    if (AtmosCfg.Enabled)
    {
        EnsureAtmosphereBaked(
            SunDirection,
            SunRadiance,
            AtmosCfg.RayleighScattering,
            AtmosCfg.MieTurbidity,
            AtmosCfg.MieAnisotropyG,
            AtmosCfg.OzoneAbsorptionScale);
    }

    if (Gpu_->UploadedSkyRev != SkyLutRevision_ && SkyViewLut_.Baked() && Gpu_->SkyLut.Mapped != nullptr)
    {
        const auto& Texels = SkyViewLut_.Texels();
        float*      Dst    = static_cast<float*>(Gpu_->SkyLut.Mapped);
        const size_t Count = std::min<size_t>(Texels.size(), 96u * 54u);
        for (size_t I = 0u; I < Count; ++I)
        {
            Dst[I * 4u + 0u] = static_cast<float>(Texels[I].R);
            Dst[I * 4u + 1u] = static_cast<float>(Texels[I].G);
            Dst[I * 4u + 2u] = static_cast<float>(Texels[I].B);
            Dst[I * 4u + 3u] = 1.0f;
        }
        Gpu_->UploadedSkyRev = SkyLutRevision_;
    }

    const uint64_t WorldSig = SolarCfg.Revision
                            ^ (AtmosCfg.Revision << 1)
                            ^ (CloudCfg.Revision << 2)
                            ^ (FogCfg.Revision << 3)
                            ^ (FlareCfg.Revision << 4)
                            ^ (MoonCfg.Revision << 5)
                            ^ (StarCfg.Revision << 6)
                            ^ (PipelineCfg.Revision << 7)
                            ^ static_cast<uint64_t>(PipelineCfg.InspectionModeIndex * 2654435761u);

    const float CamDelta = std::abs(Camera.EyePosition[0] - LastCamera_.EyePosition[0])
                         + std::abs(Camera.EyePosition[1] - LastCamera_.EyePosition[1])
                         + std::abs(Camera.EyePosition[2] - LastCamera_.EyePosition[2])
                         + std::abs(Camera.LookAtTarget[0] - LastCamera_.LookAtTarget[0])
                         + std::abs(Camera.LookAtTarget[1] - LastCamera_.LookAtTarget[1])
                         + std::abs(Camera.LookAtTarget[2] - LastCamera_.LookAtTarget[2])
                         + std::abs(Camera.VerticalFovDegrees - LastCamera_.VerticalFovDegrees);

    if (CamDelta > 1.0e-3f || WorldSig != LastWorldSignature_)
    {
        AccumulatedFrames_ = 0u;
    }
    LastCamera_         = Camera;
    LastWorldSignature_ = WorldSig;

    const std::array<float, 3> Forward = Normalize3({
        Camera.LookAtTarget[0] - Camera.EyePosition[0],
        Camera.LookAtTarget[1] - Camera.EyePosition[1],
        Camera.LookAtTarget[2] - Camera.EyePosition[2]
    });
    const std::array<float, 3> WorldUp = {0.0f, 0.0f, 1.0f};
    const std::array<float, 3> Right   = Normalize3(Cross3(Forward, WorldUp));
    const std::array<float, 3> Up      = Normalize3(Cross3(Right, Forward));

    const float Aspect  = std::clamp(ViewportAspect, 0.25f, 4.0f);
    const float TanHalf = std::tan(0.5f * Camera.VerticalFovDegrees * Degrees);

    const float SunViewDot   = Dot3(Forward, SunDirection);
    const bool  FlareVisible = FlareCfg.Enabled && SolarCfg.Enabled && SunDirection[2] > 0.0f && SunViewDot > 0.25f;
    float       SunNdcX      = 0.0f;
    float       SunNdcY      = 0.0f;
    if (FlareVisible)
    {
        SunNdcX = Dot3(SunDirection, Right) / (SunViewDot * Aspect * TanHalf);
        SunNdcY = Dot3(SunDirection, Up)    / (SunViewDot * TanHalf);
    }

    const float OrbitRad = MoonCfg.PrimaryOrbitDegrees * Degrees;
    const std::array<float, 3> PrimaryMoonDir = Normalize3({
        std::cos(OrbitRad) * 0.78f,
        std::sin(OrbitRad) * 0.78f,
        0.62f
    });
    const float SecRad = MoonCfg.SecondaryOrbitDegrees * Degrees;
    const std::array<float, 3> SecondaryMoonDir = Normalize3({
        std::cos(SecRad) * 0.84f,
        std::sin(SecRad) * 0.84f,
        0.54f
    });

    uint32_t Flags = 0u;
    if (SolarCfg.Enabled)                   Flags |= (1u << 0u);
    if (SolarCfg.CastRaytracedShadow)       Flags |= (1u << 1u);
    if (AtmosCfg.Enabled)                   Flags |= (1u << 2u);
    if (CloudCfg.Enabled)                   Flags |= (1u << 3u);
    if (FogCfg.Enabled)                     Flags |= (1u << 4u);
    if (FlareVisible)                       Flags |= (1u << 5u);
    if (MoonCfg.Enabled)                    Flags |= (1u << 6u);
    if (MoonCfg.SecondaryMoonEnabled)       Flags |= (1u << 7u);
    if (StarCfg.Enabled)                    Flags |= (1u << 8u);
    if (PipelineCfg.GlobalIllumination)     Flags |= (1u << 9u);
    if (PipelineCfg.ScreenSpaceReflections) Flags |= (1u << 10u);
    if (PipelineCfg.TemporalAntiAliasing)   Flags |= (1u << 11u);
    if (PipelineCfg.AcesFilmicTonemap)      Flags |= (1u << 12u);

    if (!HasPrevCamera_)
    {
        PrevEye_       = Camera.EyePosition;
        PrevForward_   = Forward;
        PrevRight_     = Right;
        PrevUp_        = Up;
        PrevTanHalf_   = TanHalf;
        PrevAspect_    = Aspect;
        HasPrevCamera_ = true;
    }

    std::array<std::array<float, 4>, 96> Ubo{};
    Ubo[ 0] = {Camera.EyePosition[0], Camera.EyePosition[1], Camera.EyePosition[2], TanHalf};
    Ubo[ 1] = {Forward[0], Forward[1], Forward[2], Aspect};
    Ubo[ 2] = {Right[0], Right[1], Right[2], static_cast<float>(GpuRenderWidth)};
    Ubo[ 3] = {Up[0], Up[1], Up[2], static_cast<float>(GpuRenderHeight)};
    Ubo[ 4] = {SunDirection[0], SunDirection[1], SunDirection[2], std::max(0.00465f, SolarCfg.AngularDiameterDeg * 0.5f * Degrees)};
    Ubo[ 5] = {SunRadiance[0], SunRadiance[1], SunRadiance[2], DaylightFactor};
    Ubo[ 6] = {0.18f * DaylightFactor + 0.015f, 0.36f * DaylightFactor + 0.025f, 0.72f * DaylightFactor + 0.055f, std::pow(2.0f, PipelineCfg.ExposureCompensationEv)};
    Ubo[ 7] = {0.58f * DaylightFactor + 0.04f,  0.52f * DaylightFactor + 0.04f,  0.48f * DaylightFactor + 0.06f,  0.0f};
    const float CloudBase = std::max(200.0f, CloudCfg.BaseAltitudeMetres);
    Ubo[ 8] = {
        std::clamp(CloudCfg.Coverage, 0.0f, 1.0f),
        CloudBase,
        CloudBase + std::max(200.0f, CloudCfg.LayerThicknessMetres),
        0.025f * std::max(0.1f, CloudCfg.ExtinctionDensity)
    };
    Ubo[ 9] = {
        0.0025f * std::max(0.0f, FogCfg.BaseDensity),
        FogCfg.BaseAltitudeMetres,
        std::max(1.0f, 1.0f / std::max(0.001f, FogCfg.HeightFalloff)),
        FogCfg.StartDistanceMetres
    };
    Ubo[10] = {
        0.58f * DaylightFactor + 0.05f,
        0.66f * DaylightFactor + 0.06f,
        0.78f * DaylightFactor + 0.09f,
        FlareCfg.Intensity
    };
    Ubo[11] = {SunNdcX, SunNdcY, static_cast<float>(std::max(3u, FlareCfg.ApertureBladeCount)), 1.0f};
    Ubo[12] = {PrimaryMoonDir[0], PrimaryMoonDir[1], PrimaryMoonDir[2], MoonCfg.PrimaryPhase * MoonCfg.PrimaryAlbedo};
    Ubo[13] = {SecondaryMoonDir[0], SecondaryMoonDir[1], SecondaryMoonDir[2], MoonCfg.EarthshineLuminance};
    Ubo[14] = {StarCfg.MagnitudeGain, StarCfg.AtmosphericScintillate, StarCfg.MilkyWayLuminance, 0.0f};
    Ubo[15] = {
        static_cast<float>(FrameCounter_),
        static_cast<float>(AccumulatedFrames_),
        static_cast<float>(std::max(0, PipelineCfg.InspectionModeIndex)),
        static_cast<float>(Flags)
    };
    Ubo[16] = {PrevEye_[0], PrevEye_[1], PrevEye_[2], PrevTanHalf_};
    Ubo[17] = {PrevForward_[0], PrevForward_[1], PrevForward_[2], PrevAspect_};
    Ubo[18] = {PrevRight_[0], PrevRight_[1], PrevRight_[2], (CamDelta > 1.0e-3f) ? 1.0f : 0.0f};
    Ubo[19] = {PrevUp_[0], PrevUp_[1], PrevUp_[2], 0.0f};

    PrevEye_     = Camera.EyePosition;
    PrevForward_ = Forward;
    PrevRight_   = Right;
    PrevUp_      = Up;
    PrevTanHalf_ = TanHalf;
    PrevAspect_  = Aspect;

    size_t LightCursor = 0u;
    // 1. Add VehicleHMI Low-Beam Headlight Spotlights + Rear Taillight Glow for each of the 5 Showcase Vehicles
    for (const auto& V : Course_.ShowcaseVehicles)
    {
        if (LightCursor + 2u > 32u) break;
        const float CosYaw = std::cos(V.YawRadians);
        const float SinYaw = std::sin(V.YawRadians);

        // Front Low-Beam Headlight Spotlight (local +2.48m forward, +0.22m up from CoM)
        const float HeadX = V.WorldPosition[0] + 2.48f * CosYaw;
        const float HeadY = V.WorldPosition[1] + 2.48f * SinYaw;
        const float HeadZ = V.WorldPosition[2] + 0.22f;
        Ubo[20u + LightCursor * 2u + 0u] = {HeadX, HeadY, HeadZ, 34.0f};
        Ubo[20u + LightCursor * 2u + 1u] = {0.92f * 26.0f, 0.96f * 26.0f, 1.00f * 26.0f, V.YawRadians};
        ++LightCursor;

        // Rear Taillight Red Ground-Glow Lamp (local -2.32m rear, +0.22m up from CoM)
        const float TailX = V.WorldPosition[0] - 2.32f * CosYaw;
        const float TailY = V.WorldPosition[1] - 2.32f * SinYaw;
        const float TailZ = V.WorldPosition[2] + 0.22f;
        Ubo[20u + LightCursor * 2u + 0u] = {TailX, TailY, TailZ, 6.2f};
        Ubo[20u + LightCursor * 2u + 1u] = {6.50f, 0.06f, 0.12f, -100.0f};
        ++LightCursor;
    }

    // 2. Add Street Poles & Hangar/Tunnel Point Lamps
    for (const auto& Pole : Course_.StreetPoles)
    {
        if (LightCursor >= 32u) break;
        Ubo[20u + LightCursor * 2u + 0u] = {Pole.BulbPosition[0], Pole.BulbPosition[1], Pole.BulbPosition[2], Pole.Radius};
        Ubo[20u + LightCursor * 2u + 1u] = {Pole.Colour[0] * Pole.Intensity, Pole.Colour[1] * Pole.Intensity, Pole.Colour[2] * Pole.Intensity, -100.0f};
        ++LightCursor;
    }
    for (const auto& Lamp : Course_.PointLamps)
    {
        if (LightCursor >= 32u) break;
        Ubo[20u + LightCursor * 2u + 0u] = {Lamp.Position[0], Lamp.Position[1], Lamp.Position[2], Lamp.Radius};
        Ubo[20u + LightCursor * 2u + 1u] = {Lamp.Colour[0] * Lamp.Intensity, Lamp.Colour[1] * Lamp.Intensity, Lamp.Colour[2] * Lamp.Intensity, -100.0f};
        ++LightCursor;
    }
    Ubo[7][3] = static_cast<float>(LightCursor);

    if (Gpu_->UniformsAndLightsPass0.Mapped != nullptr)
    {
        Ubo[14][3] = 0.0f; // Pass 0: Integrate + Motion Reproject
        std::memcpy(Gpu_->UniformsAndLightsPass0.Mapped, Ubo.data(), sizeof(Ubo));
    }
    if (Gpu_->UniformsAndLightsPass1.Mapped != nullptr)
    {
        Ubo[14][3] = 1.0f; // Pass 1: SVGF 5x5 Spatial Wavelet Denoise + Present
        std::memcpy(Gpu_->UniformsAndLightsPass1.Mapped, Ubo.data(), sizeof(Ubo));
    }
    Gpu_->PendingDispatch = true;
}

void EverestSceneEncoding::ConstructGpuCommands(VkCommandBuffer Commands)
{
    if (!GpuReady() || !Commands || !Gpu_->PendingDispatch)
    {
        return;
    }

    VkImageMemoryBarrier PreBarrier{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER};
    PreBarrier.srcAccessMask                   = Gpu_->ImageInitialized ? VK_ACCESS_SHADER_READ_BIT : 0u;
    PreBarrier.dstAccessMask                   = VK_ACCESS_SHADER_WRITE_BIT;
    PreBarrier.oldLayout                       = Gpu_->ImageInitialized ? VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL : VK_IMAGE_LAYOUT_UNDEFINED;
    PreBarrier.newLayout                       = VK_IMAGE_LAYOUT_GENERAL;
    PreBarrier.srcQueueFamilyIndex             = VK_QUEUE_FAMILY_IGNORED;
    PreBarrier.dstQueueFamilyIndex             = VK_QUEUE_FAMILY_IGNORED;
    PreBarrier.image                           = Gpu_->OutputImage;
    PreBarrier.subresourceRange.aspectMask     = VK_IMAGE_ASPECT_COLOR_BIT;
    PreBarrier.subresourceRange.baseMipLevel   = 0u;
    PreBarrier.subresourceRange.levelCount     = 1u;
    PreBarrier.subresourceRange.baseArrayLayer = 0u;
    PreBarrier.subresourceRange.layerCount     = 1u;

    Gpu_->CmdPipelineBarrier(
        Commands,
        Gpu_->ImageInitialized ? VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT : VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT,
        VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
        0u,
        0u, nullptr,
        0u, nullptr,
        1u, &PreBarrier);

    const uint32_t GroupsX = (GpuRenderWidth  + 7u) / 8u;
    const uint32_t GroupsY = (GpuRenderHeight + 7u) / 8u;

    // Pass 0: Primary Ray Trace + Direct Lighting + Indirect GI/Reflections + Motion-Vector Temporal Reprojection
    Gpu_->CmdBindPipeline(Commands, VK_PIPELINE_BIND_POINT_COMPUTE, Gpu_->Pipeline);
    Gpu_->CmdBindDescriptorSets(Commands, VK_PIPELINE_BIND_POINT_COMPUTE, Gpu_->PipelineLayout, 0u, 1u, &Gpu_->DescriptorSetPass0, 0u, nullptr);
    Gpu_->CmdDispatch(Commands, GroupsX, GroupsY, 1u);

    // Compute-to-Compute memory barrier so Pass 1 (SVGF 5x5 Wavelet Denoiser) sees all Pass 0 reservoir/accumulation writes
    VkMemoryBarrier ComputeBarrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
    ComputeBarrier.srcAccessMask = VK_ACCESS_SHADER_WRITE_BIT;
    ComputeBarrier.dstAccessMask = VK_ACCESS_SHADER_READ_BIT | VK_ACCESS_SHADER_WRITE_BIT;
    Gpu_->CmdPipelineBarrier(
        Commands,
        VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
        VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
        0u,
        1u, &ComputeBarrier,
        0u, nullptr,
        0u, nullptr);

    // Pass 1: SVGF 5x5 Edge-Stopping Spatial Wavelet Filter + Volumetric Clouds/Sky/Fog/LensFlare + ACES Present
    Gpu_->CmdBindDescriptorSets(Commands, VK_PIPELINE_BIND_POINT_COMPUTE, Gpu_->PipelineLayout, 0u, 1u, &Gpu_->DescriptorSetPass1, 0u, nullptr);
    Gpu_->CmdDispatch(Commands, GroupsX, GroupsY, 1u);

    VkImageMemoryBarrier PostBarrier = PreBarrier;
    PostBarrier.srcAccessMask = VK_ACCESS_SHADER_WRITE_BIT;
    PostBarrier.dstAccessMask = VK_ACCESS_SHADER_READ_BIT;
    PostBarrier.oldLayout     = VK_IMAGE_LAYOUT_GENERAL;
    PostBarrier.newLayout     = VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL;

    Gpu_->CmdPipelineBarrier(
        Commands,
        VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
        VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT,
        0u,
        0u, nullptr,
        0u, nullptr,
        1u, &PostBarrier);

    Gpu_->ImageInitialized = true;
    Gpu_->PendingDispatch  = false;
    ++FrameCounter_;
    if (AccumulatedFrames_ < 64u)
    {
        ++AccumulatedFrames_;
    }
}

void EverestSceneEncoding::EncodeFrame(uint32_t                          OutputWidth,
                                       uint32_t                          OutputHeight,
                                       const EverestCameraSpecification& Camera,
                                       const EverestEnvironmentSettings& Environment,
                                       std::vector<uint8_t>&             OutRgba8Pixels)
{
    if (OutputWidth == 0u || OutputHeight == 0u)
    {
        OutRgba8Pixels.clear();
        return;
    }

    const SolarConfiguration&          SolarCfg    = Environment.Solar;
    const AtmosphereConfiguration&     AtmosCfg    = Environment.Atmosphere;
    const CloudConfiguration&          CloudCfg    = Environment.Cloud;
    const FogConfiguration&            FogCfg      = Environment.Fog;
    const OpticalFlareConfiguration&   FlareCfg    = Environment.OpticalFlare;
    const MoonConfiguration&           MoonCfg     = Environment.Moon;
    const StarConfiguration&           StarCfg     = Environment.Star;
    const RenderPipelineConfiguration& PipelineCfg = Environment.Pipeline;

    const uint64_t WorldSig = SolarCfg.Revision
                            ^ (AtmosCfg.Revision << 1)
                            ^ (CloudCfg.Revision << 2)
                            ^ (FogCfg.Revision << 3)
                            ^ (FlareCfg.Revision << 4)
                            ^ (MoonCfg.Revision << 5)
                            ^ (StarCfg.Revision << 6)
                            ^ (PipelineCfg.Revision << 7)
                            ^ static_cast<uint64_t>(PipelineCfg.InspectionModeIndex * 2654435761u);

    const float CamDelta = std::abs(Camera.EyePosition[0] - LastCamera_.EyePosition[0])
                         + std::abs(Camera.EyePosition[1] - LastCamera_.EyePosition[1])
                         + std::abs(Camera.EyePosition[2] - LastCamera_.EyePosition[2])
                         + std::abs(Camera.LookAtTarget[0] - LastCamera_.LookAtTarget[0])
                         + std::abs(Camera.LookAtTarget[1] - LastCamera_.LookAtTarget[1])
                         + std::abs(Camera.LookAtTarget[2] - LastCamera_.LookAtTarget[2])
                         + std::abs(Camera.VerticalFovDegrees - LastCamera_.VerticalFovDegrees);

    if (AccumulatedFrames_ >= 6u &&
        CamDelta <= 1.0e-3f &&
        WorldSig == LastWorldSignature_ &&
        OutputWidth == CachedOutputWidth_ &&
        OutputHeight == CachedOutputHeight_ &&
        CachedRgba8Pixels_.size() == static_cast<size_t>(OutputWidth) * OutputHeight * 4u)
    {
        OutRgba8Pixels = CachedRgba8Pixels_;
        return;
    }

    const float ElevRad = SolarCfg.ElevationDegrees * Degrees;
    const float AzimRad = SolarCfg.AzimuthDegrees * Degrees;
    const std::array<float, 3> SunDirection = Normalize3({
        std::cos(ElevRad) * std::cos(AzimRad),
        std::cos(ElevRad) * std::sin(AzimRad),
        std::sin(ElevRad)
    });

    const float SunFluxScale   = SolarCfg.Enabled ? std::max(0.0f, SolarCfg.IlluminanceKilolux / 42.0f) : 0.0f;
    const float DaylightFactor = std::clamp((SunDirection[2] + 0.08f) / 0.35f, 0.0f, 1.0f);
    std::array<float, 3> SunRadiance = {
        SunFluxScale * (0.85f + 0.25f * DaylightFactor),
        SunFluxScale * (0.62f + 0.36f * DaylightFactor),
        SunFluxScale * (0.38f + 0.56f * DaylightFactor)
    };

    CloudParameters CloudParams{};
    CloudParams.LowerHeightM   = std::max(200.0, static_cast<double>(CloudCfg.BaseAltitudeMetres));
    CloudParams.TopHeightM     = CloudParams.LowerHeightM + std::max(200.0, static_cast<double>(CloudCfg.LayerThicknessMetres));
    CloudParams.Coverage       = std::clamp(static_cast<double>(CloudCfg.Coverage), 0.0, 1.0);
    CloudParams.ExtinctionPerM = 0.025 * std::max(0.1, static_cast<double>(CloudCfg.ExtinctionDensity));
    if (CloudCfg.Enabled && CloudCfg.CastGroundShadows && SunDirection[2] > 0.05f)
    {
        const double ShadowAltitude = 0.5 * (CloudParams.LowerHeightM + CloudParams.TopHeightM);
        const double TCloud         = ShadowAltitude / std::max(0.05, static_cast<double>(SunDirection[2]));
        const SpatialVector SampleP = {
            SunDirection[0] * TCloud,
            SunDirection[1] * TCloud,
            ShadowAltitude
        };
        const double LocalCloudD = CloudDensity(CloudParams, SampleP);
        const float  ShadowTrans = static_cast<float>(std::exp(-LocalCloudD * 1.4));
        for (float& C : SunRadiance)
        {
            C *= (0.35f + 0.65f * ShadowTrans);
        }
    }

    if (AtmosCfg.Enabled)
    {
        EnsureAtmosphereBaked(
            SunDirection,
            SunRadiance,
            AtmosCfg.RayleighScattering,
            AtmosCfg.MieTurbidity,
            AtmosCfg.MieAnisotropyG,
            AtmosCfg.OzoneAbsorptionScale);
    }

    const uint32_t MaxInternalWidth  = (PipelineCfg.QualityTier == 0) ? 256u : ((PipelineCfg.QualityTier == 1) ? 384u : 640u);
    const uint32_t MaxInternalHeight = (PipelineCfg.QualityTier == 0) ? 144u : ((PipelineCfg.QualityTier == 1) ? 216u : 360u);
    const uint32_t TraceWidth        = std::min(OutputWidth, MaxInternalWidth);
    const uint32_t TraceHeight       = std::min(OutputHeight, MaxInternalHeight);

    if (TraceWidth != InternalWidth_ || TraceHeight != InternalHeight_)
    {
        InternalWidth_     = TraceWidth;
        InternalHeight_    = TraceHeight;
        AccumulatedFrames_ = 0u;
        Illumination_.ConfigureDimensions(InternalWidth_, InternalHeight_, 1u);
        PrimaryGuides_.resize(static_cast<size_t>(InternalWidth_) * InternalHeight_);
        AccumulatedHdr_.assign(static_cast<size_t>(InternalWidth_) * InternalHeight_, {0.0f, 0.0f, 0.0f});
    }
    else if (CamDelta > 1.0e-3f || WorldSig != LastWorldSignature_)
    {
        ResetAccumulation();
    }

    LastCamera_         = Camera;
    LastWorldSignature_ = WorldSig;

    const std::array<float, 3> Forward = Normalize3({
        Camera.LookAtTarget[0] - Camera.EyePosition[0],
        Camera.LookAtTarget[1] - Camera.EyePosition[1],
        Camera.LookAtTarget[2] - Camera.EyePosition[2]
    });
    const std::array<float, 3> WorldUp = {0.0f, 0.0f, 1.0f};
    const std::array<float, 3> Right   = Normalize3(Cross3(Forward, WorldUp));
    const std::array<float, 3> Up      = Normalize3(Cross3(Right, Forward));

    const float Aspect  = static_cast<float>(TraceWidth) / std::max(1.0f, static_cast<float>(TraceHeight));
    const float TanHalf = std::tan(0.5f * Camera.VerticalFovDegrees * Degrees);

    for (uint32_t Y = 0u; Y < TraceHeight; ++Y)
    {
        const float NdcY = 1.0f - 2.0f * (static_cast<float>(Y) + 0.5f) / static_cast<float>(TraceHeight);
        for (uint32_t X = 0u; X < TraceWidth; ++X)
        {
            const float NdcX = 2.0f * (static_cast<float>(X) + 0.5f) / static_cast<float>(TraceWidth) - 1.0f;
            const std::array<float, 3> RayDir = Normalize3({
                Forward[0] + Right[0] * (NdcX * Aspect * TanHalf) + Up[0] * (NdcY * TanHalf),
                Forward[1] + Right[1] * (NdcX * Aspect * TanHalf) + Up[1] * (NdcY * TanHalf),
                Forward[2] + Right[2] * (NdcX * Aspect * TanHalf) + Up[2] * (NdcY * TanHalf)
            });

            TracePixelGuide& Guide = PrimaryGuides_[static_cast<size_t>(Y) * TraceWidth + X];
            const CpuRayIntersection Hit = RaySpace_.TraceRayCpu(Course_.Scene, Camera.EyePosition, RayDir, 0.01f, 320.0f);
            if (!Hit.Hit)
            {
                Guide.ViewDepth     = 0.0f;
                Guide.ExpectedDepth = 0.0f;
                Guide.WorldNormal   = {0.0f, 0.0f, 1.0f};
            }
            else
            {
                Guide.ViewDepth     = Hit.Travel;
                Guide.ExpectedDepth = Hit.Travel;
                Guide.WorldPosition = Hit.Position;
                Guide.WorldNormal   = Hit.Normal;
                Guide.Family        = Hit.Family;
            }
        }
    }

    PathTraceEnvironmentParameters PtEnv{};
    PtEnv.Features = FeatureRayTracing
                   | (PipelineCfg.ScreenSpaceReflections ? FeatureRayTracedReflections : 0u)
                   | (PipelineCfg.TemporalAntiAliasing ? FeatureTemporalAccumulation : 0u)
                   | FeatureSpatialResampling
                   | FeatureVarianceKernel
                   | FeatureSunShadows
                   | FeatureClusteredLights;
    PtEnv.BounceCount        = PipelineCfg.GlobalIllumination ? 2u : 1u;
    PtEnv.SolarDirection     = SunDirection;
    PtEnv.SolarAngularRadius = std::max(0.002f, SolarCfg.AngularDiameterDeg * 0.5f * Degrees);
    PtEnv.SunIlluminance     = {SunRadiance[0] * 1.15f, SunRadiance[1] * 1.15f, SunRadiance[2] * 1.15f};
    PtEnv.SkyZenithRadiance  = AtmosCfg.Enabled
                             ? std::array<float, 3>{0.18f * DaylightFactor + 0.015f, 0.36f * DaylightFactor + 0.025f, 0.72f * DaylightFactor + 0.055f}
                             : std::array<float, 3>{0.16f, 0.24f, 0.42f};
    PtEnv.SkyHorizonRadiance = AtmosCfg.Enabled
                             ? std::array<float, 3>{0.58f * DaylightFactor + 0.04f, 0.52f * DaylightFactor + 0.04f, 0.48f * DaylightFactor + 0.06f}
                             : std::array<float, 3>{0.36f, 0.42f, 0.50f};

    if (AccumulatedFrames_ < 6u)
    {
        Illumination_.StepTemporalAndSpatialReuseCpu(
            Course_.Scene,
            RaySpace_,
            Course_.Materials,
            &ClusteredLights_,
            PtEnv,
            PrimaryGuides_,
            AccumulatedFrames_);
        Illumination_.StepVarianceFilterCpu(PrimaryGuides_, AccumulatedFrames_, true);
        ++AccumulatedFrames_;
    }

    const auto& FilteredIrradiance = Illumination_.FilteredIrradiance();

    FogParameters FogMedium{};
    FogMedium.ReferenceDensity = 0.0025 * std::max(0.0, static_cast<double>(FogCfg.BaseDensity));
    FogMedium.ReferenceHeightM = static_cast<double>(FogCfg.BaseAltitudeMetres);
    FogMedium.FalloffHeightM   = std::max(1.0, 1.0 / std::max(0.001, static_cast<double>(FogCfg.HeightFalloff)));
    FogMedium.Colour           = {
        0.58 * DaylightFactor + 0.05,
        0.66 * DaylightFactor + 0.06,
        0.78 * DaylightFactor + 0.09
    };

    SunDiscProfile SunDisc{};
    SunDisc.AngularRadiusRad = std::max(0.002, static_cast<double>(SolarCfg.AngularDiameterDeg * 0.5f * Degrees));

    const float SunViewDot   = Dot3(Forward, SunDirection);
    const bool  FlareVisible = FlareCfg.Enabled && SolarCfg.Enabled && SunDirection[2] > 0.0f && SunViewDot > 0.25f;
    float       SunNdcX      = 0.0f;
    float       SunNdcY      = 0.0f;
    if (FlareVisible)
    {
        SunNdcX = Dot3(SunDirection, Right) / (SunViewDot * Aspect * TanHalf);
        SunNdcY = Dot3(SunDirection, Up)    / (SunViewDot * TanHalf);
    }

    FlareOpticsProfile FlareProfile{};
    FlareProfile.ApertureBlades     = std::max(3u, FlareCfg.ApertureBladeCount);
    FlareProfile.GhostStrength      = static_cast<double>(FlareCfg.Intensity);
    FlareProfile.StarburstStrength  = FlareCfg.DiffractionStarburst ? static_cast<double>(FlareCfg.Intensity) : 0.0;
    FlareProfile.AnamorphicStrength = FlareCfg.AnamorphicStreak ? static_cast<double>(FlareCfg.Intensity * 0.5f) : 0.0;

    for (uint32_t Y = 0u; Y < TraceHeight; ++Y)
    {
        const float NdcY = 1.0f - 2.0f * (static_cast<float>(Y) + 0.5f) / static_cast<float>(TraceHeight);
        for (uint32_t X = 0u; X < TraceWidth; ++X)
        {
            const size_t           PixelIndex = static_cast<size_t>(Y) * TraceWidth + X;
            const TracePixelGuide& Guide      = PrimaryGuides_[PixelIndex];
            const bool             IsSky      = (Guide.ViewDepth <= 0.0f);
            const float            NdcX       = 2.0f * (static_cast<float>(X) + 0.5f) / static_cast<float>(TraceWidth) - 1.0f;
            const std::array<float, 3> RayDir = Normalize3({
                Forward[0] + Right[0] * (NdcX * Aspect * TanHalf) + Up[0] * (NdcY * TanHalf),
                Forward[1] + Right[1] * (NdcX * Aspect * TanHalf) + Up[1] * (NdcY * TanHalf),
                Forward[2] + Right[2] * (NdcX * Aspect * TanHalf) + Up[2] * (NdcY * TanHalf)
            });

            std::array<float, 3> PixelRadiance = {0.0f, 0.0f, 0.0f};

            if (PipelineCfg.InspectionModeIndex > 0)
            {
                if (!IsSky)
                {
                    const SurfaceMaterialSpecification& Surface =
                        Course_.Materials[std::min(static_cast<size_t>(Guide.Family), Course_.Materials.size() - 1u)];
                    switch (PipelineCfg.InspectionModeIndex)
                    {
                        case 1:
                            PixelRadiance = Surface.Albedo;
                            break;
                        case 2:
                            PixelRadiance = {
                                0.5f + 0.5f * Guide.WorldNormal[0],
                                0.5f + 0.5f * Guide.WorldNormal[1],
                                0.5f + 0.5f * Guide.WorldNormal[2]
                            };
                            break;
                        case 3:
                            PixelRadiance = {Surface.Roughness, Surface.Metalness, Surface.CoatWeight};
                            break;
                        case 4:
                        {
                            const float D = std::clamp(Guide.ViewDepth / 80.0f, 0.0f, 1.0f);
                            PixelRadiance = {1.0f - D, 1.0f - D, 1.0f - D};
                            break;
                        }
                        default:
                            PixelRadiance = {
                                FilteredIrradiance[PixelIndex][0],
                                FilteredIrradiance[PixelIndex][1],
                                FilteredIrradiance[PixelIndex][2]
                            };
                            break;
                    }
                }
                AccumulatedHdr_[PixelIndex] = PixelRadiance;
                continue;
            }

            if (IsSky)
            {
                if (AtmosCfg.Enabled && SkyViewLut_.Baked())
                {
                    const SpectrumRgb SkySample = SkyViewLut_.Sample({RayDir[0], RayDir[1], RayDir[2]});
                    const SpectrumRgb Twilight  = EvaluateTwilightArchRadiance(
                        {RayDir[0], RayDir[1], RayDir[2]},
                        {SunDirection[0], SunDirection[1], SunDirection[2]},
                        {SunRadiance[0], SunRadiance[1], SunRadiance[2]},
                        0.25);
                    PixelRadiance = {
                        static_cast<float>(SkySample.R + Twilight.R),
                        static_cast<float>(SkySample.G + Twilight.G),
                        static_cast<float>(SkySample.B + Twilight.B)
                    };
                }
                else
                {
                    const float Zenith = std::clamp(RayDir[2], 0.0f, 1.0f);
                    PixelRadiance = {
                        0.52f * (1.0f - Zenith) + 0.12f * Zenith,
                        0.64f * (1.0f - Zenith) + 0.26f * Zenith,
                        0.82f * (1.0f - Zenith) + 0.58f * Zenith
                    };
                }

                if (SolarCfg.Enabled)
                {
                    const double CosSun = std::clamp(static_cast<double>(Dot3(RayDir, SunDirection)), -1.0, 1.0);
                    const double Theta  = std::acos(CosSun);
                    if (Theta < SunDisc.AngularRadiusRad * 2.4)
                    {
                        const SpectrumRgb Disc = EvaluateSunDiscRadiance(
                            Theta,
                            SunDisc,
                            {SunRadiance[0] * 14.0, SunRadiance[1] * 13.0, SunRadiance[2] * 11.5});
                        PixelRadiance[0] += static_cast<float>(Disc.R);
                        PixelRadiance[1] += static_cast<float>(Disc.G);
                        PixelRadiance[2] += static_cast<float>(Disc.B);
                    }
                }

                const auto MoonRad = EvaluateMoonDiscs(RayDir, SunDirection, MoonCfg);
                const auto StarRad = EvaluateStarAndPlanetField(RayDir, StarCfg, DaylightFactor);
                for (size_t C = 0u; C < 3u; ++C)
                {
                    PixelRadiance[C] += MoonRad[C] + StarRad[C];
                }

                if (CloudCfg.Enabled && RayDir[2] > 0.03f && CloudParams.Coverage > 0.01)
                {
                    const CloudMarchResult CloudRes = MarchClouds(
                        CloudParams,
                        {Camera.EyePosition[0], Camera.EyePosition[1], std::max(1.0f, Camera.EyePosition[2])},
                        {RayDir[0], RayDir[1], RayDir[2]},
                        {SunDirection[0], SunDirection[1], SunDirection[2]},
                        {std::max(0.2f, SunRadiance[0] * 1.4f), std::max(0.2f, SunRadiance[1] * 1.35f), std::max(0.2f, SunRadiance[2] * 1.3f)},
                        16000.0,
                        12u,
                        3u);
                    const float Trans = static_cast<float>(std::clamp(CloudRes.Transmittance, 0.0, 1.0));
                    PixelRadiance[0]  = PixelRadiance[0] * Trans + static_cast<float>(CloudRes.Radiance.R);
                    PixelRadiance[1]  = PixelRadiance[1] * Trans + static_cast<float>(CloudRes.Radiance.G);
                    PixelRadiance[2]  = PixelRadiance[2] * Trans + static_cast<float>(CloudRes.Radiance.B);
                }
            }
            else
            {
                const SurfaceMaterialSpecification& Surface =
                    Course_.Materials[std::min(static_cast<size_t>(Guide.Family), Course_.Materials.size() - 1u)];
                const std::array<float, 3> ViewDir = {-RayDir[0], -RayDir[1], -RayDir[2]};

                std::array<float, 3> DirectSun = {0.0f, 0.0f, 0.0f};
                if (SolarCfg.Enabled && SunDirection[2] > 0.0f && Dot3(Guide.WorldNormal, SunDirection) > 0.0f)
                {
                    const std::array<float, 3> ShadowOrigin = {
                        Guide.WorldPosition[0] + Guide.WorldNormal[0] * 0.02f,
                        Guide.WorldPosition[1] + Guide.WorldNormal[1] * 0.02f,
                        Guide.WorldPosition[2] + Guide.WorldNormal[2] * 0.02f
                    };
                    const bool InShadow = SolarCfg.CastRaytracedShadow &&
                        RaySpace_.TraceRayCpu(Course_.Scene, ShadowOrigin, SunDirection, 0.01f, 300.0f).Hit;
                    if (!InShadow)
                    {
                        const auto Bsdf = EvaluateSurfaceBsdfCpu(Surface, Guide.WorldNormal, ViewDir, SunDirection);
                        for (size_t C = 0u; C < 3u; ++C)
                        {
                            DirectSun[C] = Bsdf[C] * SunRadiance[C] * 2.25f;
                        }
                    }
                }

                std::array<float, 3> SkyRefl = {0.18f, 0.26f, 0.40f};
                const float          NdotV   = std::max(Dot3(Guide.WorldNormal, ViewDir), 0.0f);
                const std::array<float, 3> ReflectDir = Normalize3({
                    RayDir[0] + 2.0f * NdotV * Guide.WorldNormal[0],
                    RayDir[1] + 2.0f * NdotV * Guide.WorldNormal[1],
                    RayDir[2] + 2.0f * NdotV * Guide.WorldNormal[2]
                });
                if (AtmosCfg.Enabled && SkyViewLut_.Baked())
                {
                    const SpectrumRgb EnvSpec = SkyViewLut_.Sample({ReflectDir[0], ReflectDir[1], std::max(0.02f, ReflectDir[2])});
                    SkyRefl = {static_cast<float>(EnvSpec.R), static_cast<float>(EnvSpec.G), static_cast<float>(EnvSpec.B)};
                }

                std::array<float, 3> TracedRefl = SkyRefl;
                if (PipelineCfg.ScreenSpaceReflections && (Surface.CoatWeight > 0.1f || Surface.Metalness > 0.15f))
                {
                    StochasticGenerator ReflGen  = ConstructGeneratorCpu(X, Y, AccumulatedFrames_, 17u);
                    const float         EffRough = (Surface.CoatWeight > 0.1f) ? Surface.CoatRoughness : Surface.Roughness;
                    const ReflectionTraceSample ReflSample = TraceMultiBounceReflectionCpu(
                        Course_.Scene,
                        RaySpace_,
                        Course_.Materials,
                        &ClusteredLights_,
                        PtEnv,
                        Guide.WorldPosition,
                        Guide.WorldNormal,
                        ReflectDir,
                        EffRough,
                        ReflGen);
                    TracedRefl = {
                        ReflSample.Radiance[0] * 0.55f + SkyRefl[0] * 0.45f,
                        ReflSample.Radiance[1] * 0.55f + SkyRefl[1] * 0.45f,
                        ReflSample.Radiance[2] * 0.55f + SkyRefl[2] * 0.45f
                    };
                }

                std::array<float, 3> SpecF0 = {
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[0] * Surface.Metalness,
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[1] * Surface.Metalness,
                    0.16f * Surface.SpecularLevel * Surface.SpecularLevel * (1.0f - Surface.Metalness) + Surface.Albedo[2] * Surface.Metalness
                };
                if (Surface.FlakeCoverage > 0.0f)
                {
                    for (size_t C = 0u; C < 3u; ++C)
                    {
                        SpecF0[C] = SpecF0[C] * (1.0f - Surface.FlakeCoverage * 0.65f) + Surface.FlakeTint[C] * (Surface.FlakeCoverage * 0.65f);
                    }
                }
                const float Schlick     = std::pow(std::clamp(1.0f - NdotV, 0.0f, 1.0f), 5.0f);
                const float CoatFresnel = (0.04f + 0.96f * Schlick) * Surface.CoatWeight;
                const std::array<float, 3> FlakeFresnel = {
                    SpecF0[0] + (1.0f - SpecF0[0]) * Schlick,
                    SpecF0[1] + (1.0f - SpecF0[1]) * Schlick,
                    SpecF0[2] + (1.0f - SpecF0[2]) * Schlick
                };

                std::array<float, 3> DiffuseAlbedo = {
                    Surface.Albedo[0] * (1.0f - Surface.Metalness * 0.5f),
                    Surface.Albedo[1] * (1.0f - Surface.Metalness * 0.5f),
                    Surface.Albedo[2] * (1.0f - Surface.Metalness * 0.5f)
                };
                if (Surface.FlakeCoverage > 0.0f)
                {
                    for (size_t C = 0u; C < 3u; ++C)
                    {
                        DiffuseAlbedo[C] = DiffuseAlbedo[C] * 0.65f + Surface.FlakeTint[C] * 0.35f;
                    }
                }

                for (size_t C = 0u; C < 3u; ++C)
                {
                    const float ReSTIRTerm = FilteredIrradiance[PixelIndex][C] * DiffuseAlbedo[C] * 0.72f;
                    const float FlakeEnv   = TracedRefl[C] * FlakeFresnel[C] * (Surface.FlakeCoverage > 0.0f ? 0.28f : 0.18f);
                    const float CoatEnv    = TracedRefl[C] * CoatFresnel * 0.38f;
                    PixelRadiance[C]       = Surface.RadiantExitance[C] + DirectSun[C] + ReSTIRTerm + FlakeEnv + CoatEnv;
                }

                if (FogCfg.Enabled && Guide.ViewDepth > FogCfg.StartDistanceMetres)
                {
                    const double FogDist = static_cast<double>(Guide.ViewDepth - FogCfg.StartDistanceMetres);
                    const double FogT    = FogTransmittance(
                        FogMedium,
                        {Camera.EyePosition[0], Camera.EyePosition[1], Camera.EyePosition[2]},
                        {RayDir[0], RayDir[1], RayDir[2]},
                        FogDist);
                    const SpectrumRgb Fogged = ApplyFog(
                        FogMedium,
                        {PixelRadiance[0], PixelRadiance[1], PixelRadiance[2]},
                        FogT);
                    PixelRadiance = {
                        static_cast<float>(Fogged.R),
                        static_cast<float>(Fogged.G),
                        static_cast<float>(Fogged.B)
                    };
                }
            }

            if (FlareVisible)
            {
                const SpectrumRgb FlareRad = EvaluateLensFlareRadiance(
                    NdcX,
                    NdcY,
                    SunNdcX,
                    SunNdcY,
                    {SunRadiance[0] * 0.22, SunRadiance[1] * 0.20, SunRadiance[2] * 0.18},
                    1.0,
                    FlareProfile);
                PixelRadiance[0] += static_cast<float>(FlareRad.R);
                PixelRadiance[1] += static_cast<float>(FlareRad.G);
                PixelRadiance[2] += static_cast<float>(FlareRad.B);
            }

            AccumulatedHdr_[PixelIndex] = PixelRadiance;
        }
    }

    OutRgba8Pixels.resize(static_cast<size_t>(OutputWidth) * OutputHeight * 4u);
    const float Exposure = std::pow(2.0f, PipelineCfg.ExposureCompensationEv);
    for (uint32_t Oy = 0u; Oy < OutputHeight; ++Oy)
    {
        const float   SrcY = ((static_cast<float>(Oy) + 0.5f) / static_cast<float>(OutputHeight)) * static_cast<float>(TraceHeight) - 0.5f;
        const int32_t Y0   = std::clamp(static_cast<int32_t>(std::floor(SrcY)), 0, static_cast<int32_t>(TraceHeight) - 1);
        const int32_t Y1   = std::min(Y0 + 1, static_cast<int32_t>(TraceHeight) - 1);
        const float   Fy   = std::clamp(SrcY - static_cast<float>(Y0), 0.0f, 1.0f);

        for (uint32_t Ox = 0u; Ox < OutputWidth; ++Ox)
        {
            const float   SrcX = ((static_cast<float>(Ox) + 0.5f) / static_cast<float>(OutputWidth)) * static_cast<float>(TraceWidth) - 0.5f;
            const int32_t X0   = std::clamp(static_cast<int32_t>(std::floor(SrcX)), 0, static_cast<int32_t>(TraceWidth) - 1);
            const int32_t X1   = std::min(X0 + 1, static_cast<int32_t>(TraceWidth) - 1);
            const float   Fx   = std::clamp(SrcX - static_cast<float>(X0), 0.0f, 1.0f);

            const auto& C00 = AccumulatedHdr_[static_cast<size_t>(Y0) * TraceWidth + static_cast<size_t>(X0)];
            const auto& C10 = AccumulatedHdr_[static_cast<size_t>(Y0) * TraceWidth + static_cast<size_t>(X1)];
            const auto& C01 = AccumulatedHdr_[static_cast<size_t>(Y1) * TraceWidth + static_cast<size_t>(X0)];
            const auto& C11 = AccumulatedHdr_[static_cast<size_t>(Y1) * TraceWidth + static_cast<size_t>(X1)];

            std::array<float, 3> Sampled{};
            for (size_t C = 0u; C < 3u; ++C)
            {
                const float Top = C00[C] * (1.0f - Fx) + C10[C] * Fx;
                const float Bot = C01[C] * (1.0f - Fx) + C11[C] * Fx;
                Sampled[C]      = (Top * (1.0f - Fy) + Bot * Fy) * Exposure;
            }

            std::array<float, 3> Mapped = Sampled;
            if (PipelineCfg.InspectionModeIndex == 0 && PipelineCfg.AcesFilmicTonemap)
            {
                Mapped = ApplyAcesFilmicLocal(Sampled);
            }

            const size_t OutBase = (static_cast<size_t>(Oy) * OutputWidth + Ox) * 4u;
            for (size_t C = 0u; C < 3u; ++C)
            {
                const float Clamped = std::clamp(Mapped[C], 0.0f, 1.0f);
                const float Srgb    = (PipelineCfg.InspectionModeIndex == 0) ? std::pow(Clamped, 1.0f / 2.2f) : Clamped;
                OutRgba8Pixels[OutBase + C] = static_cast<uint8_t>(std::clamp(std::lround(Srgb * 255.0f), 0L, 255L));
            }
            OutRgba8Pixels[OutBase + 3u] = 255u;
        }
    }

    CachedOutputWidth_  = OutputWidth;
    CachedOutputHeight_ = OutputHeight;
    CachedRgba8Pixels_  = OutRgba8Pixels;
}

} // namespace Everest
