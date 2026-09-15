//============================================================================================================================================
//                                                  CELESTIALEDITORHOST.H
//============================================================================================================================================
// 🧩 The development editor's celestial host — the fullscreen dock host with exactly two docked panels: the
//    celestial outliner over the world's registered entries, and the viewport over the live render. The
//    project registers its full-fidelity rows every tick (icons, accents, metas, pills, footer); the scene's
//    own roster arrives through Record and is adapted into rows alongside them, so every world entry reads
//    in one outline.
//
//    Development only: without FRONTIER_DEVELOPMENT every method below is a mute husk — no dockspace, no
//    panels — and the game renders fullscreen. Ship builds pass -Development:$false and never see this.

#pragma once

#include "CelestialIconIndex.h"
#include "CelestialOutlinerPanel.h"
#include "ControlPanel.h"
#include "ViewportPanel.h"
#include "WorldEntry.h"

#include <imgui.h>

#include <cstdint>

namespace Frontier {

class CelestialEditorHost
{
public:
    CelestialEditorHost() noexcept;
    ~CelestialEditorHost() noexcept = default;

    CelestialEditorHost(const CelestialEditorHost&)            = delete;
    CelestialEditorHost& operator=(const CelestialEditorHost&) = delete;

    // Call once after the ImGui context exists — seats the celestial style, the twelve outline faces,
    //    the viewport's six faces, and the SVG icon sheet. Idempotent. Runs last, over the scheduler's
    //    own seating, so the editor's tokens win everywhere.
    void ApplyTheme() noexcept;

    // The per-tick project feed: full-fidelity rows staged before Record (the celestial bodies, the
    //    luminaires, the cameras, the pills, the footer). Staged rows join the outline beside the
    //    adapted scene rows; the staging empties every Record.
    void RegisterWorldEntry(const WorldEntry& Entry) noexcept;
    void RegisterPill(const WorldEntryPill& Pill) noexcept;
    void AssignFooter(const OutlinerFooterFigures& Footer) noexcept;

    // Which pill bit adapted scene rows carry (the project's Geometry pill). 0 reads none: scene rows
    //    then hide while any pill is lit.
    void AssignScenePillBit(uint32_t Bit) noexcept;

    // Call every tick between ImGui::NewFrame() and ImGui::Render() — records the fullscreen dock host,
    //    the dockspace, and the two panels. The scene roster is borrowed and adapted in place; staged
    //    project rows join it for the tick.
    void Record(EditorInstance* Instances, uint32_t InstanceCount, EditorSheet* PickedSheet) noexcept;

    // Seats the viewport's scene view (see ViewportPanel::AssignView) and reads back the view rect.
    void AssignView(const unsigned char* Rgba, uint32_t Width, uint32_t Height) noexcept;
    void AssignViewTexture(ImTextureID View, uint32_t Width, uint32_t Height) noexcept;
    [[nodiscard]] float QueryViewWidth() const noexcept;
    [[nodiscard]] float QueryViewHeight() const noexcept;

    // The icon sheet's RGBA32 rows for the Vulkan upload, and the bound sheet id once uploaded.
    [[nodiscard]] const unsigned char* QueryIconSheetRgba() const noexcept;
    [[nodiscard]] uint32_t QueryIconSheetWidth() const noexcept;
    [[nodiscard]] uint32_t QueryIconSheetHeight() const noexcept;
    void AssignIconSheetTexture(ImTextureID Id) noexcept;

    // The primary pick as a scene ordinal — the instance PickedSheet must describe. kNoEditorInstance
    //    when the pick is a project row, when nothing is picked, or when the build carries no editor.
    [[nodiscard]] uint32_t QueryPickedInstance() const noexcept;

    // The primary pick as an outline id — "" when nothing is picked.
    [[nodiscard]] const char* QueryPickedEntry() const noexcept;

    // The test seams; the proof drives the outline through these.
    void PickInstance(uint32_t Index) noexcept;
    void PickEntry(const char* Id) noexcept;
    void AssignSearch(const char* Text) noexcept;
    void TogglePill(const char* Id) noexcept;
    void ToggleCompact() noexcept;
    [[nodiscard]] bool QueryCompact() const noexcept;
    void AssignOutlineScroll(float Y) noexcept;
    [[nodiscard]] uint32_t QueryOutlineEntryCount() const noexcept;
    // Reads back one registered row (the eye flips and drag re-seats land here). Returns
    //    kNoWorldEntry past the end; Entry reads null there too.
    [[nodiscard]] uint32_t QueryOutlineEntryAt(uint32_t Slot, const WorldEntry** Entry) const noexcept;

    // The viewport's orbit in and out: the harness seats home from its camera, and reads the pose back
    //    for its trace (the game poses the fly camera off the same figures).
    void SeatViewportOrbit(const ViewportOrbit& Seated) noexcept;
    [[nodiscard]] const ViewportOrbit& QueryViewportOrbit() const noexcept;

    // Faces seated by ApplyTheme (twelve when both archives resolve, zero without the define).
    [[nodiscard]] int QueryFontCount() const noexcept;

private:
    // Splits the dockspace into the outliner / viewport columns on the first tick, then rests.
    void ConstructLayout() noexcept;
    // Re-splits the dockspace at the plate width the compact figure calls for (316px open, 236px
    //    compact, the reference's own widths). Runs only on a compact edge, so a dragged
    //    rearrangement survives every other tick.
    void RebuildLayoutForCompact(bool Compact) noexcept;

    // Adapts one scene row into the outline's idiom (id scene#<i>, icon by category, above-link off
    //    the preorder depths).
    void AdaptSceneRow(const EditorInstance* Instances, uint32_t Index) noexcept;

    ControlPanel           Controls_;          // first: the panels borrow it
    CelestialOutlinerPanel Outliner_;
    ViewportPanel          Viewport_;
    CelestialIconIndex     Icons_;

    WorldEntry             StagedEntries_[kMaxWorldEntries] = {};
    uint32_t               StagedEntryCount_ = 0u;
    WorldEntryPill         StagedPills_[kMaxOutlinerPills] = {};
    uint32_t               StagedPillCount_ = 0u;
    OutlinerFooterFigures  StagedFooter_ = {};
    bool                   StagedFooterSeated_ = false;
    uint32_t               ScenePillBit_ = 0u;

    bool FontsSeated_ = false;
    int  FontCount_   = 0;
    bool SeatedCompact_ = false;   // the compact figure the dockspace was last split for
};

} // namespace Frontier
