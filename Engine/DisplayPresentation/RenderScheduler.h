//============================================================================================================================================
//                                                       RENDERERPANEL.H
//============================================================================================================================================
// 🧩 Immediate-mode ImGui control centre overlay — presents ReSTIR parameters, camera telemetry and scene diagnostics.

#pragma once

#if defined(_MSC_VER)
    #pragma warning(disable: 4324)
#endif

#include "ReSTIRIntegrator.h"
#include "../Editor/CelestialEditorHost.h"
#include "../../Projects/Project-Zero/Source/FlyThroughSolver.h"
#include "../../Projects/Project-Zero/Source/RayTracingSolver.h"
#include <cstdint>
#include <functional>

namespace Frontier {

//------------------------------------------------------------------------------------------------------------------------
//                                                    RENDERER PANEL
//------------------------------------------------------------------------------------------------------------------------

class RenderScheduler
{
public:
    RenderScheduler() noexcept = default;
    ~RenderScheduler() noexcept = default;

    RenderScheduler(const RenderScheduler&)            = delete;
    RenderScheduler& operator=(const RenderScheduler&) = delete;

    // Call once after ImGui context exists — applies colour scheme and style
    void ApplyTheme() noexcept;

    // Call every frame between ImGui::NewFrame() and ImGui::Render()
    // Mutates integrator parameters directly via its public setters
    // OverlayHook runs between ImGui::NewFrame and ImGui::Render so engine overlays (Control Centre) can
    //    record onto the foreground draw list of the same tick. Pass nullptr / empty for none.
    using OverlayHook = std::function<void()>;

    void Present(ReSTIRIntegrator&                       Integrator,
                 const ProjectZero::FlyThroughSolver&    Camera,
                 const ProjectZero::RayTracingSolver&    Scene,
                 uint32_t                                ViewportWidth,
                 uint32_t                                ViewportHeight,
                 EditorInstance*                           Instances,
                 uint32_t                                InstanceCount,
                 EditorSheet*                            PickedSheet,
                 const OverlayHook&                      Overlay = {}) noexcept;

    template<typename TargetType>
    [[nodiscard]] TargetType Convert() const noexcept;

    // True while an ImGui window has captured the pointer / keyboard (one tick stale — the state is read
    //    from the previous tick, the same lag every overlay gate accepts).
    [[nodiscard]] bool QueryEditorCapturesPointer() const noexcept;
    [[nodiscard]] bool QueryEditorCapturesKeyboard() const noexcept;

    // The editor's primary pick — the instance PickedSheet must describe. kNoEditorInstance when nothing is
    //    picked, or when the build carries no editor at all.
    [[nodiscard]] uint32_t QueryPickedInstance() const noexcept;

    // The primary pick as an outline id — "" when nothing is picked.
    [[nodiscard]] const char* QueryPickedEntry() const noexcept;

    // Drives the pick from the game.
    void PickInstance(uint32_t Index) noexcept;
    void PickEntry(const char* Id) noexcept;

    // The per-tick project feed into the celestial outline: full-fidelity rows staged before Present,
    //    the filter pills, and the footer figures. Mute without the define.
    void RegisterWorldEntry(const WorldEntry& Entry) noexcept;
    void RegisterPill(const WorldEntryPill& Pill) noexcept;
    void AssignFooter(const OutlinerFooterFigures& Footer) noexcept;
    void AssignScenePillBit(uint32_t Bit) noexcept;

    // The outline's registered rows, read back after Present — the eye flips and drag re-seats land here.
    [[nodiscard]] uint32_t QueryOutlineEntryCount() const noexcept;
    [[nodiscard]] const WorldEntry* QueryOutlineEntryAt(uint32_t Slot) const noexcept;

    // The icon sheet's RGBA32 rows for the Vulkan upload, and the bound sheet id once uploaded.
    [[nodiscard]] const unsigned char* QueryIconSheetRgba() const noexcept;
    [[nodiscard]] uint32_t QueryIconSheetWidth() const noexcept;
    [[nodiscard]] uint32_t QueryIconSheetHeight() const noexcept;
    void AssignIconSheetTexture(ImTextureID Id) noexcept;

    // Seats the viewport's scene texture (the engine build's render target) and reads back the view rect.
    void AssignViewTexture(ImTextureID View, uint32_t Width, uint32_t Height) noexcept;
    [[nodiscard]] float QueryViewWidth() const noexcept;
    [[nodiscard]] float QueryViewHeight() const noexcept;


    // The viewport's orbit in and out: the game seats home from the fly camera, and reads the pose back to
    //    steer the camera from the views menu and the gizmo.
    void SeatViewportOrbit(const ViewportOrbit& Seated) noexcept;
    [[nodiscard]] const ViewportOrbit& QueryViewportOrbit() const noexcept;

private:
    bool QuitRequested = false;     // [-]  quit button pressed

#ifdef FRONTIER_DEVELOPMENT
    CelestialEditorHost Editor_;
#endif

    void SectionCamera  (const ProjectZero::FlyThroughSolver& Camera) noexcept;
    void SectionReSTIR  (ReSTIRIntegrator& Integrator, uint32_t ViewportWidth, uint32_t ViewportHeight) noexcept;
    void SectionScene   (const ProjectZero::RayTracingSolver& Scene) noexcept;
};

template<>
inline bool RenderScheduler::Convert<bool>() const noexcept
{
    return QuitRequested;
}

} // namespace Frontier
