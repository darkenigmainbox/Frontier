//============================================================================================================================================
//                                                 CELESTIALOUTLINERPANEL.H
//============================================================================================================================================
// 🧩 The development editor's celestial outliner — the reference panel's outliner, spoke in ImGui: the glass
//    plate, the Outliner/Scene header with its clock, the Visible/Hidden tiles, the search pill, the filter
//    pills, the chevron/icon/name/meta/standing/eye rows, and the five-figure footer. Token figures below
//    are the reference's :root palette as bytes, and every icon is the reference's own SVG, so the two
//    outliners match by construction rather than by eye.
//
//    The panel OWNS the roster it draws: the project registers every world entry every tick (RegisterWorldEntry
//    refreshes the row in place, keyed by id), and the panel owns the eye figures, the above-links, the folds,
//    the pick, the search and the lit pills across ticks. Read the roster back (QueryRegisteredAt) to carry
//    eye flips and drag re-seats into the scene. Rows absent for a whole tick are swept at Record.

#pragma once

#include "WorldEntry.h"

#include <imgui.h>

#include <cstdint>

namespace Frontier {

class CelestialIconIndex;

// The ten faces the outline draws in. Outfit Light carries the reference's 300-weight voice (title, names,
//    pills, labels); JetBrains Mono carries the tabular numerals (clock, metas, stat and foot numerals),
//    stable across ticks the way the reference's tabular-nums are.
struct CelestialOutlinerFonts
{
    ImFont* Outfit9  = nullptr;   // tags, foot labels
    ImFont* Outfit11 = nullptr;   // pills, folder names
    ImFont* Outfit12 = nullptr;   // header sub, tile labels
    ImFont* Outfit13 = nullptr;   // row names, search
    ImFont* Outfit16 = nullptr;   // compact header title
    ImFont* Outfit20 = nullptr;   // header title
    ImFont* Mono10   = nullptr;   // clock suffix, foot qualifiers
    ImFont* Mono11   = nullptr;   // row metas
    ImFont* Mono14   = nullptr;   // foot numerals
    ImFont* Mono16   = nullptr;   // compact header clock
    ImFont* Mono22   = nullptr;   // header clock
    ImFont* Mono30   = nullptr;   // tile numerals
};

class CelestialOutlinerPanel final
{
public:
    void AssignFonts(const CelestialOutlinerFonts& Fonts) noexcept;
    void AssignIcons(CelestialIconIndex* Icons) noexcept;

    // The per-tick feed: refresh one pill / one entry (matched by id; first sight seats the row).
    void RegisterPill(const WorldEntryPill& Pill) noexcept;
    void RegisterWorldEntry(const WorldEntry& Entry) noexcept;

    void AssignFooter(const OutlinerFooterFigures& Footer) noexcept;

    // Draws the docked "Outliner" window over the roster. Sweeps rows and pills the tick never fed.
    void Record() noexcept;

    [[nodiscard]] const char* QueryPicked() const noexcept;   // the picked id, or "" when none
    [[nodiscard]] uint32_t QueryEntryCount() const noexcept;
    [[nodiscard]] uint32_t QueryRegisteredAt(uint32_t Slot, const WorldEntry** Entry) const noexcept;

    // The test seams; the proof drives the outline through these.
    void PickEntry(const char* Id) noexcept;
    void AssignSearch(const char* Text) noexcept;
    void TogglePill(const char* Id) noexcept;
    void ToggleCompact() noexcept;
    [[nodiscard]] bool QueryCompact() const noexcept { return Compact_; }
    void AssignScroll(float Y) noexcept;   // one-shot tree scroll, consumed at the next Record

private:
    void RecordHeader(float PlateW) noexcept;
    void RecordSceneStat(float PlateW) noexcept;
    void RecordSearch(float PlateW) noexcept;
    void RecordPills(float PlateW) noexcept;
    float RecordOutline(float PlateW, float OutlineH) noexcept;
    void RecordRow(const WorldEntry& Row, uint32_t Depth, bool HasBelow, bool AncestorHidden) noexcept;
    void RecordFooter(float PlateW) noexcept;

    [[nodiscard]] uint32_t DepthOf(uint32_t Slot) const noexcept;
    [[nodiscard]] bool     PassPills(uint32_t Slot) const noexcept;
    [[nodiscard]] bool     PassSearch(uint32_t Slot) const noexcept;
    [[nodiscard]] bool     IsShut(const char* Id) const noexcept;
    void SetShut(const char* Id, bool Shut) noexcept;
    [[nodiscard]] int FindEntry(const char* Id) const noexcept;
    [[nodiscard]] int FindPill(const char* Id) const noexcept;
    void OpenAbove(const char* Id) noexcept;
    [[nodiscard]] WorldEntryStanding EffectiveStanding(const WorldEntry& Row) const noexcept;

    struct ShutMark
    {
        uint32_t Hash = 0u;
        bool     Shut = false;
        bool     Seen = false;
    };

    CelestialOutlinerFonts Fonts_;
    CelestialIconIndex*    Icons_ = nullptr;

    WorldEntry     Entries_[kMaxWorldEntries] = {};
    uint32_t       EntryCount_ = 0u;
    bool           EntrySeen_[kMaxWorldEntries] = {};
    WorldEntryPill Pills_[kMaxOutlinerPills] = {};
    uint32_t       PillCount_ = 0u;
    bool           PillSeen_[kMaxOutlinerPills] = {};
    ShutMark       Shut_[kMaxWorldEntries] = {};
    uint32_t       ShutCount_ = 0u;

    OutlinerFooterFigures Footer_ = {};
    char     Picked_[40]  = {};
    char     Query_[64]   = {};
    uint32_t ActivePillBits_ = 0u;
    bool     Compact_     = false;
    bool     FocusSearch_ = false;
    float    PendingScroll_ = -1.0f;   // <0 reads none; >=0 scrolls the tree once, then rests   // Ctrl+Shift+F / the chord arms the search focus for this tick
};

} // namespace Frontier
