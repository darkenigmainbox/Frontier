//============================================================================================================================================
//                                                    CELESTIALICONINDEX.H
//============================================================================================================================================
// 🧩 The development outliner's SVG icon index — the reference panel's whole icon idiom as one RGBA sheet.
//    Every icon in Engine/Editor/Icons is a verbatim SVG document from the reference page (the I() idiom at
//    stroke-width 1.6, the ported-panel supplements at 1.9); Seat rasterises each once through ThorVG at
//    bring-up and packs the rows into a single sheet the outline samples per icon. Icons rasterise WHITE:
//    the reference's currentColor becomes the draw tint, so one sheet serves every accent.
//
//    ThorVG has no CSS cascade, so currentColor (verbatim in the files, correct in a browser) is rewritten
//    to white on the way in — the only transform the loader applies. Seat runs once, never in a tick.

#pragma once

#include <imgui.h>

#include <cstdint>
#include <vector>

namespace Frontier {

class CelestialIconIndex final
{
public:
    CelestialIconIndex() noexcept = default;
    ~CelestialIconIndex() noexcept;

    CelestialIconIndex(const CelestialIconIndex&)            = delete;
    CelestialIconIndex& operator=(const CelestialIconIndex&) = delete;

    // Rasterises IconFolder/*.svg into the sheet (IconFolder reads "Engine/Editor/Icons" from the content
    //    root). False when the folder is absent or ThorVG refuses a document; the outline then draws no
    //    icons rather than drawing wrong ones. Idempotent: a second seating releases the first.
    [[nodiscard]] bool Seat(const char* IconFolder) noexcept;
    void Release() noexcept;

    [[nodiscard]] bool     Seated() const noexcept { return !Sheet_.empty(); }
    [[nodiscard]] uint32_t QueryIconCount() const noexcept { return IconCount_; }

    // The sheet's UV rect for icon Name (false when the name is unknown).
    [[nodiscard]] bool QueryIconUv(const char* Name, ImVec2* Uv0, ImVec2* Uv1) const noexcept;

    // The sheet's RGBA32 top-down rows for the headless proof's rasteriser; null until seated.
    [[nodiscard]] const unsigned char* QuerySheetRgba() const noexcept;
    [[nodiscard]] uint32_t QuerySheetWidth() const noexcept { return SheetWidth_; }
    [[nodiscard]] uint32_t QuerySheetHeight() const noexcept { return SheetHeight_; }

    // The ImGui texture id the sheet answers to: the headless proof's bare id, or the engine build's
    //    Vulkan descriptor set for the uploaded sheet. Assign once after uploading.
    void AssignSheetTexture(ImTextureID Id) noexcept { SheetTexture_ = Id; }
    [[nodiscard]] ImTextureID QuerySheetTexture() const noexcept { return SheetTexture_; }

    // Draws icon Name into the SizePx square at Min, tinted (white glyph × Tint reads currentColor).
    //    Silent when unseated, unbound, or the name is unknown.
    void DrawIcon(ImDrawList* Draw, const char* Name, const ImVec2& Min, float SizePx,
                  ImU32 Tint) const noexcept;

private:
    struct IconSlot
    {
        char     Name[24] = {};
        uint32_t Cell     = 0u;
    };

    static constexpr uint32_t kCellPx   = 96u;    // raster pixels per icon edge (3× the 32px draw size)
    static constexpr uint32_t kColumns  = 10u;    // sheet columns; rows follow from the icon count
    static constexpr uint32_t kMaxIcons = 128u;

    std::vector<unsigned char> Sheet_;            // RGBA32 top-down rows, seated once at bring-up
    uint32_t SheetWidth_  = 0u;
    uint32_t SheetHeight_ = 0u;
    IconSlot Icons_[kMaxIcons] = {};
    uint32_t IconCount_   = 0u;
    ImTextureID SheetTexture_ = static_cast<ImTextureID>(0);
};

} // namespace Frontier
