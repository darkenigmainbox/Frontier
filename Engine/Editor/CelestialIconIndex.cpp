//============================================================================================================================================
//                                                    CELESTIALICONINDEX.CPP
//============================================================================================================================================
// 🧩 The development outliner's SVG icon index — one ThorVG raster per icon at bring-up, one RGBA sheet.

#include "CelestialIconIndex.h"

#include <thorvg.h>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

namespace Frontier {

namespace {

// The loader's only rewrite: currentColor has no meaning without a CSS cascade, so it becomes white on
//    the way in. The files stay verbatim (correct in a browser); the tint arrives at draw time.
void WhitenCurrentColor(std::string& Document) noexcept
{
    constexpr char kNeedle[] = "currentColor";
    constexpr char kWhite[]  = "#ffffff";
    for (size_t At = 0u; (At = Document.find(kNeedle, At)) != std::string::npos;)
        Document.replace(At, sizeof(kNeedle) - 1u, kWhite);
}

bool SlurpFile(const std::filesystem::path& Path, std::string& Document) noexcept
{
    std::ifstream In(Path, std::ios::binary);
    if (!In)
        return false;
    std::stringstream Pour;
    Pour << In.rdbuf();
    Document = Pour.str();
    return !Document.empty();
}

} // namespace

CelestialIconIndex::~CelestialIconIndex() noexcept
{
    Release();
}

bool CelestialIconIndex::Seat(const char* IconFolder) noexcept
{
    Release();

    namespace fs = std::filesystem;
    std::error_code FsError;
    if (IconFolder == nullptr || !fs::is_directory(IconFolder, FsError))
        return false;

    // Deterministic seating: alphabetical, so the sheet is identical run to run.
    std::vector<fs::path> Documents;
    for (const fs::directory_entry& Entry : fs::directory_iterator(IconFolder, FsError))
    {
        if (FsError)
            break;
        if (Entry.is_regular_file() && Entry.path().extension() == ".svg")
            Documents.push_back(Entry.path());
    }
    if (FsError || Documents.empty())
        return false;
    std::sort(Documents.begin(), Documents.end());
    if (Documents.size() > kMaxIcons)
        Documents.resize(kMaxIcons);

    if (tvg::Initializer::init(0u) != tvg::Result::Success)
        return false;

    const uint32_t Rows = (static_cast<uint32_t>(Documents.size()) + kColumns - 1u) / kColumns;
    SheetWidth_         = kColumns * kCellPx;
    SheetHeight_        = Rows * kCellPx;
    std::vector<uint32_t> Sheet32(static_cast<size_t>(SheetWidth_) * SheetHeight_, 0u);

    bool Seated = true;
    IconCount_  = 0u;
    for (const fs::path& Path : Documents)
    {
        std::string Document;
        if (!SlurpFile(Path, Document))
        {
            Seated = false;
            break;
        }
        WhitenCurrentColor(Document);

        tvg::Picture* Glyph = tvg::Picture::gen();
        if (Glyph->load(Document.c_str(), static_cast<uint32_t>(Document.size()), "svg+xml")
            != tvg::Result::Success)
        {
            delete Glyph;
            Seated = false;
            break;
        }
        float NaturalW = 0.0f, NaturalH = 0.0f;
        Glyph->size(&NaturalW, &NaturalH);
        if (NaturalW <= 0.0f || NaturalH <= 0.0f)
        {
            delete Glyph;
            Seated = false;
            break;
        }
        // The 24-unit viewBox maps onto the cell edge; non-square documents centre on the long edge.
        const float Longest = NaturalW > NaturalH ? NaturalW : NaturalH;
        const float Scale   = static_cast<float>(kCellPx) / Longest;
        tvg::Matrix Pose{ Scale, 0.0f, (static_cast<float>(kCellPx) - NaturalW * Scale) * 0.5f,
                          0.0f, Scale, (static_cast<float>(kCellPx) - NaturalH * Scale) * 0.5f,
                          0.0f, 0.0f, 1.0f };
        Glyph->transform(Pose);

        std::vector<uint32_t> Cell32(static_cast<size_t>(kCellPx) * kCellPx, 0u);
        tvg::SwCanvas* Canvas = tvg::SwCanvas::gen();
        if (Canvas->target(Cell32.data(), kCellPx, kCellPx, kCellPx, tvg::ColorSpace::ABGR8888)
                != tvg::Result::Success
            || Canvas->add(Glyph) != tvg::Result::Success
            || Canvas->draw() != tvg::Result::Success || Canvas->sync() != tvg::Result::Success)
        {
            delete Canvas;
            Seated = false;
            break;
        }
        delete Canvas;   // the canvas owns the glyph past add(); deleting frees both

        const uint32_t Cell   = IconCount_;
        const uint32_t CellX  = (Cell % kColumns) * kCellPx;
        const uint32_t CellY  = (Cell / kColumns) * kCellPx;
        for (uint32_t Y = 0u; Y < kCellPx; ++Y)
        {
            const uint32_t* From = Cell32.data() + static_cast<size_t>(Y) * kCellPx;
            uint32_t*       To   = Sheet32.data() + static_cast<size_t>(CellY + Y) * SheetWidth_ + CellX;
            std::memcpy(To, From, static_cast<size_t>(kCellPx) * sizeof(uint32_t));
        }

        const std::string Stem = Path.stem().string();
        std::snprintf(Icons_[IconCount_].Name, sizeof(Icons_[IconCount_].Name), "%s", Stem.c_str());
        Icons_[IconCount_].Cell = Cell;
        ++IconCount_;
    }

    tvg::Initializer::term();

    if (!Seated || IconCount_ == 0u)
    {
        Release();
        return false;
    }

    // ABGR8888 packs R in the low byte on little-endian — the sheet's rows read RGBA32 as bytes.
    Sheet_.resize(static_cast<size_t>(SheetWidth_) * SheetHeight_ * 4u);
    std::memcpy(Sheet_.data(), Sheet32.data(), Sheet_.size());
    return true;
}

void CelestialIconIndex::Release() noexcept
{
    Sheet_.clear();
    Sheet_.shrink_to_fit();
    SheetWidth_  = 0u;
    SheetHeight_ = 0u;
    IconCount_   = 0u;
    SheetTexture_ = static_cast<ImTextureID>(0);
}

bool CelestialIconIndex::QueryIconUv(const char* Name, ImVec2* Uv0, ImVec2* Uv1) const noexcept
{
    if (Name == nullptr || Uv0 == nullptr || Uv1 == nullptr || SheetWidth_ == 0u || SheetHeight_ == 0u)
        return false;
    for (uint32_t I = 0u; I < IconCount_; ++I)
    {
        if (std::strcmp(Icons_[I].Name, Name) != 0)
            continue;
        const float CellX = static_cast<float>((Icons_[I].Cell % kColumns) * kCellPx);
        const float CellY = static_cast<float>((Icons_[I].Cell / kColumns) * kCellPx);
        Uv0->x = CellX / static_cast<float>(SheetWidth_);
        Uv0->y = CellY / static_cast<float>(SheetHeight_);
        Uv1->x = (CellX + static_cast<float>(kCellPx)) / static_cast<float>(SheetWidth_);
        Uv1->y = (CellY + static_cast<float>(kCellPx)) / static_cast<float>(SheetHeight_);
        return true;
    }
    return false;
}

const unsigned char* CelestialIconIndex::QuerySheetRgba() const noexcept
{
    return Sheet_.empty() ? nullptr : Sheet_.data();
}

void CelestialIconIndex::DrawIcon(ImDrawList* Draw, const char* Name, const ImVec2& Min, float SizePx,
                                  ImU32 Tint) const noexcept
{
    if (Draw == nullptr || SheetTexture_ == static_cast<ImTextureID>(0))
        return;
    ImVec2 Uv0, Uv1;
    if (!QueryIconUv(Name, &Uv0, &Uv1))
        return;
    Draw->AddImage(SheetTexture_, Min, ImVec2(Min.x + SizePx, Min.y + SizePx), Uv0, Uv1, Tint);
}

} // namespace Frontier
