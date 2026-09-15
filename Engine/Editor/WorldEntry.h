//============================================================================================================================================
//                                                       WORLDENTRY.H
//============================================================================================================================================
// 🧩 The development outliner's world-entry roster — every entry the world owns, registered for the outline.
//    The project registers one row per entry every tick (scene placements, celestial bodies, luminaires,
//    cameras, rigs); the panel stores them, nests them by their above-links, and draws the reference
//    outliner over them. The engine never learns what an entry IS: the icon name, the accent, the meta
//    line, the standing and the pill membership all arrive with the row, so any project can fill this
//    without the engine knowing a single game semantic.

#pragma once

#include <imgui.h>

#include <cstdint>

namespace Frontier {

//------------------------------------------------------------------------------------------------------------------------
//                                                     RECORD COMPASS
//------------------------------------------------------------------------------------------------------------------------

// The most entries one tick may carry, the most pills one tick may offer, and the index that means "none".
//    Fixed: the tick never allocates.
constexpr uint32_t kMaxWorldEntries = 192u;
constexpr uint32_t kMaxOutlinerPills  = 8u;
constexpr uint32_t kNoWorldEntry      = 0xFFFFFFFFu;

// How the row's standing pip reads. The reference computes these live per row; the project hands them in:
//    Seated reads the green check, Advisory the amber triangle, Retired the red triangle (a hidden row),
//    Lifted the quiet grey dot (a row with presence duties lifted).
enum class WorldEntryStanding : uint32_t
{
    Seated = 0u,
    Advisory,
    Retired,
    Lifted,
    Count
};

// One filter pill across the outline's second row: the Lights / Sky / Bodies / Geometry / Camera pills of
//    the reference. Bit is the membership bit rows carry in PillBits; an empty pill set shows every row.
struct WorldEntryPill
{
    char     Id[24]    = {};                        // pill id; rows name no pills, they carry bits
    char     Label[24] = {};                        // pill caption
    float    Accent[3] = { 1.0f, 1.0f, 1.0f };      // the pill's dot tint
    uint32_t Bit       = 0u;                        // 1u << slot; rows with none of the lit bits hide
};

// One row of the roster. AboveId names the row this hangs under (empty hangs at the root); the panel
//    walks the above-links every tick, so registration order never matters and a drag re-seats the link.
struct WorldEntry
{
    char     Id[40]    = {};                        // durable row id; picks, folds and drags key off this
    char     Label[48] = {};                        // display name
    char     Icon[24]  = {};                        // SVG icon name in Engine/Editor/Icons (no suffix)
    float    Accent[3] = { 1.0f, 1.0f, 1.0f };      // row glyph tint (the reference's --acc)
    char     Meta[64]  = {};                        // right-hand tabular line (elevation, air mass, …)
    char     Tag[16]   = {};                        // small capsule after the name (the reference's "Comp")
    WorldEntryStanding Standing = WorldEntryStanding::Seated;
    bool     Visible   = true;                      // the eye's figure; hidden rows dim
    bool     Folder    = false;                     // folders read uppercase and never dim
    bool     EyeShown  = true;                      // false hides the eye (the reference's World/Lights)
    bool     Anchored  = false;                     // true refuses the drag (the reference's World/Lights)
    char     AboveId[40] = {};                      // the row above; empty reads a root row
    uint32_t PillBits  = 0u;                        // membership bits, one per pill
    ImTextureID Thumb  = static_cast<ImTextureID>(0);   // optional square thumbnail (moon dots); 0 reads none
};

// The footer's five figures and the header clock, as text the project formats. The panel only places them.
struct OutlinerFooterFigures
{
    char Clock[12]   = {};   // header clock ("06:24")
    char Fps[12]     = {};   // Realtime numeral ("60")
    char Quality[24] = {};   // Quality rank ("Standard")
    char Sun[16]     = {};   // Sun elevation ("+8.3°")
    char Moons[12]   = {};   // risen moons ("1")
    char Cam[28]     = {};   // camera station ("0, 2, 0")
};

} // namespace Frontier
