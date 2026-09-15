//============================================================================================================================================
//                                                   CELESTIALOUTLINERPROOF.CPP
//============================================================================================================================================
// 🧩 Headless visual proof — drives CelestialEditorHost through the engine's tick order over the reference
//    panel's own tree (every celestial row, pill, meta and footer figure as the page seats them), rasterises
//    each phase with a dependency-free CPU rasteriser, and gates the sheets: the twelve faces, the 84 SVG
//    icons, the 23 registered rows, the glass plate, the standing pips, and the four phases. No Vulkan,
//    no GLFW, no window.

#ifndef FRONTIER_DEVELOPMENT
#error "the proof must define FRONTIER_DEVELOPMENT, or the editor records nothing and every gate fails"
#endif

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <imgui.h>

#include "CelestialEditorHost.h"
#include "PngWriteShim.h"

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <vector>

static_assert(sizeof(ImDrawIdx) == 2u, "the rasteriser below walks 16-bit indices");

namespace {

constexpr int kWidth  = 1600;
constexpr int kHeight = 900;

struct Rgba
{
    float R, G, B, A;
};

Rgba UnpackColour(uint32_t Packed) noexcept
{
    return { static_cast<float>(Packed & 0xFFu) / 255.0f,
             static_cast<float>((Packed >> 8) & 0xFFu) / 255.0f,
             static_cast<float>((Packed >> 16) & 0xFFu) / 255.0f,
             static_cast<float>((Packed >> 24) & 0xFFu) / 255.0f };
}

void OverlayPixel(unsigned char* Pixel, Rgba Over) noexcept
{
    const float Keep = 1.0f - Over.A;
    Pixel[0] = static_cast<unsigned char>(Over.R * 255.0f * Over.A + static_cast<float>(Pixel[0]) * Keep + 0.5f);
    Pixel[1] = static_cast<unsigned char>(Over.G * 255.0f * Over.A + static_cast<float>(Pixel[1]) * Keep + 0.5f);
    Pixel[2] = static_cast<unsigned char>(Over.B * 255.0f * Over.A + static_cast<float>(Pixel[2]) * Keep + 0.5f);
}

Rgba SampleSheet(const unsigned char* Sheet, int SheetW, int SheetH, float U, float V) noexcept
{
    int X = static_cast<int>(U * static_cast<float>(SheetW));
    int Y = static_cast<int>(V * static_cast<float>(SheetH));
    if (X < 0)
        X = 0;
    if (X >= SheetW)
        X = SheetW - 1;
    if (Y < 0)
        Y = 0;
    if (Y >= SheetH)
        Y = SheetH - 1;
    const unsigned char* Texel =
        Sheet + (static_cast<size_t>(Y) * static_cast<size_t>(SheetW) + static_cast<size_t>(X)) * 4u;
    return { static_cast<float>(Texel[0]) / 255.0f, static_cast<float>(Texel[1]) / 255.0f,
             static_cast<float>(Texel[2]) / 255.0f, static_cast<float>(Texel[3]) / 255.0f };
}

float EdgeWeight(float Ax, float Ay, float Bx, float By, float Px, float Py) noexcept
{
    return (Px - Ax) * (By - Ay) - (Py - Ay) * (Bx - Ax);
}

struct SheetRef
{
    ImTextureID          Id;
    const unsigned char* Rows;
    int                  W;
    int                  H;
};

// Rasterises one draw list over the pixels. Either _TexData or _TexID is set, never both: bare ids
//    (the view rows, the icon sheet, the moon thumb) resolve through the sheet refs, everything else
//    through the glyph sheet. GetTexID() asserts headless (nothing was ever "uploaded").
void RasterizeList(const ImDrawList* List, const unsigned char* GlyphSheet, int GlyphSheetWidth,
                   int GlyphSheetHeight, const SheetRef* Sheets, int SheetCount, unsigned char* Pixels,
                   ImVec2 Origin, ImVec2 PixelScale) noexcept
{
    const ImDrawVert* Corners = List->VtxBuffer.Data;
    const ImDrawIdx*  Order   = List->IdxBuffer.Data;
    for (int Command = 0; Command < List->CmdBuffer.Size; ++Command)
    {
        const ImDrawCmd* Cmd = &List->CmdBuffer[Command];
        const unsigned char* Rows = GlyphSheet;
        int                  RowsW = GlyphSheetWidth;
        int                  RowsH = GlyphSheetHeight;
        if (Cmd->TexRef._TexData == nullptr)
        {
            for (int S = 0; S < SheetCount; ++S)
            {
                if (Cmd->TexRef._TexID == Sheets[S].Id && Sheets[S].Rows != nullptr)
                {
                    Rows  = Sheets[S].Rows;
                    RowsW = Sheets[S].W;
                    RowsH = Sheets[S].H;
                    break;
                }
            }
        }
        int ScissorLeft   = static_cast<int>((Cmd->ClipRect.x - Origin.x) * PixelScale.x);
        int ScissorTop    = static_cast<int>((Cmd->ClipRect.y - Origin.y) * PixelScale.y);
        int ScissorRight  = static_cast<int>((Cmd->ClipRect.z - Origin.x) * PixelScale.x);
        int ScissorBottom = static_cast<int>((Cmd->ClipRect.w - Origin.y) * PixelScale.y);
        if (ScissorLeft < 0)
            ScissorLeft = 0;
        if (ScissorRight > kWidth)
            ScissorRight = kWidth;
        if (ScissorTop < 0)
            ScissorTop = 0;
        if (ScissorBottom > kHeight)
            ScissorBottom = kHeight;

        for (unsigned int I = 0u; I < Cmd->ElemCount; I += 3u)
        {
            const ImDrawVert& A = Corners[Order[Cmd->IdxOffset + I] + Cmd->VtxOffset];
            const ImDrawVert& B = Corners[Order[Cmd->IdxOffset + I + 1u] + Cmd->VtxOffset];
            const ImDrawVert& C = Corners[Order[Cmd->IdxOffset + I + 2u] + Cmd->VtxOffset];
            const float SignedArea = EdgeWeight(A.pos.x, A.pos.y, B.pos.x, B.pos.y, C.pos.x, C.pos.y);
            if (SignedArea == 0.0f)
                continue;

            int LoX = static_cast<int>(std::floor(std::fmin(A.pos.x, std::fmin(B.pos.x, C.pos.x))));
            int HiX = static_cast<int>(std::ceil(std::fmax(A.pos.x, std::fmax(B.pos.x, C.pos.x))));
            int LoY = static_cast<int>(std::floor(std::fmin(A.pos.y, std::fmin(B.pos.y, C.pos.y))));
            int HiY = static_cast<int>(std::ceil(std::fmax(A.pos.y, std::fmax(B.pos.y, C.pos.y))));
            if (LoX < ScissorLeft)
                LoX = ScissorLeft;
            if (HiX > ScissorRight)
                HiX = ScissorRight;
            if (LoY < ScissorTop)
                LoY = ScissorTop;
            if (HiY > ScissorBottom)
                HiY = ScissorBottom;

            const Rgba TintedA = UnpackColour(A.col);
            const Rgba TintedB = UnpackColour(B.col);
            const Rgba TintedC = UnpackColour(C.col);
            const float InverseArea = 1.0f / SignedArea;
            for (int Y = LoY; Y < HiY; ++Y)
            {
                for (int X = LoX; X < HiX; ++X)
                {
                    const float Px = static_cast<float>(X) + 0.5f;
                    const float Py = static_cast<float>(Y) + 0.5f;
                    const float W0 = EdgeWeight(B.pos.x, B.pos.y, C.pos.x, C.pos.y, Px, Py) * InverseArea;
                    const float W1 = EdgeWeight(C.pos.x, C.pos.y, A.pos.x, A.pos.y, Px, Py) * InverseArea;
                    const float W2 = EdgeWeight(A.pos.x, A.pos.y, B.pos.x, B.pos.y, Px, Py) * InverseArea;
                    if (W0 < 0.0f || W1 < 0.0f || W2 < 0.0f)
                        continue;
                    const float U = W0 * A.uv.x + W1 * B.uv.x + W2 * C.uv.x;
                    const float V = W0 * A.uv.y + W1 * B.uv.y + W2 * C.uv.y;
                    const Rgba Glyph = SampleSheet(Rows, RowsW, RowsH, U, V);
                    const Rgba Tinted = { (W0 * TintedA.R + W1 * TintedB.R + W2 * TintedC.R) * Glyph.R,
                                          (W0 * TintedA.G + W1 * TintedB.G + W2 * TintedC.G) * Glyph.G,
                                          (W0 * TintedA.B + W1 * TintedB.B + W2 * TintedC.B) * Glyph.B,
                                          (W0 * TintedA.A + W1 * TintedB.A + W2 * TintedC.A) * Glyph.A };
                    OverlayPixel(Pixels + (static_cast<size_t>(Y) * kWidth + static_cast<size_t>(X)) * 3u,
                                 Tinted);
                }
            }
        }
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                        PROOF FEED
//------------------------------------------------------------------------------------------------------------------------

// The reference page's own tree: ids, captions, icons, accents, metas and above-links as its allNodes,
//    nodeInfo, metaShort and DEFAULT_PARENT seat them. Pill membership mirrors its FILTERS.
struct FeedRow
{
    const char* Id;
    const char* Label;
    const char* Icon;
    uint32_t    Accent;   // 0xRRGGBB
    const char* Meta;
    const char* Tag;
    const char* Above;
    uint32_t    Pills;    // bit 0 light, 1 sky, 2 body, 3 geo, 4 cam
    bool        Folder;
    bool        EyeShown;
    bool        Anchored;
    bool        Visible;
    Frontier::WorldEntryStanding Standing;
};

constexpr FeedRow kFeed[] = {
    { "world", "World", "globe", 0x5AA9FF, "", "", "", 0u, true, false, true, true,
      Frontier::WorldEntryStanding::Seated },
    { "atmosphere", "Atmosphere", "atmo", 0x5AA9FF, "AM 5.12", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "sun", "Sun", "sun", 0xFFB454, "+8.3\xC2\xB0", "", "world", 1u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "sky", "Sky", "sky", 0x67E8F9, "0.42 kcd", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "stars", "Stars", "stars", 0xC4B5FD, "mag -1.2", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Advisory },
    { "wind", "Wind", "wind", 0xA7F3D0, "4.2 m/s SW", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "fog", "Height Fog", "fog", 0x9FB0C0, "212 m", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "afog", "Atmospheric Fog", "afog", 0x8FB8D8, "56 km", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "vfog", "Local Volumetric Fog", "vfog", 0xC9D6E2, "36\xC3\x97" "36 m", "", "world", 2u, false, true,
      false, false, Frontier::WorldEntryStanding::Seated },
    { "clouds", "Cloud Layer", "cloud", 0xDFE6EE, "4/8", "", "world", 2u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "vclouds", "Clouds", "vclouds", 0xF1F5F9, "Cumuliform \xC2\xB7 60%", "", "world", 2u, false, true,
      false, true, Frontier::WorldEntryStanding::Seated },
    { "precip", "Precipitation", "rain", 0x7DD3FC, "Rain 12 mm/h", "", "vclouds", 2u, false, true, false,
      true, Frontier::WorldEntryStanding::Seated },
    { "lcloud", "Local Cloud", "lcloud", 0xE8EEF6, "180\xC3\x97" "140 m", "", "world", 2u, false, true,
      false, true, Frontier::WorldEntryStanding::Seated },
    { "moons", "Moons", "moon", 0xDFE6F5, "1/4", "", "world", 4u, true, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "moon#0", "Luna", "moon", 0xDFE6F5, "21%", "", "moons", 4u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "plane", "Ground Plane", "plane", 0xE2E8F0, "240 m", "", "", 8u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "terrain", "Height Field", "globe", 0x8FB36B, "12 m", "", "", 8u, false, true, false, true,
      Frontier::WorldEntryStanding::Lifted },
    { "lights", "Lights", "bulb", 0xFFD27A, "", "", "", 1u, true, false, true, true,
      Frontier::WorldEntryStanding::Seated },
    { "plight", "Point Light", "bulb", 0xFFD27A, "14 cd", "", "lights", 1u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "slight", "Spot Light", "flare", 0x9FD0FF, "26\xC2\xB0", "", "lights", 1u, false, true, false,
      true, Frontier::WorldEntryStanding::Seated },
    { "camera", "Camera", "camera", 0x34C759, "72\xC2\xB0", "", "", 16u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "cine", "Cine Camera", "aperture", 0x5EEAD4, "50 mm", "", "", 16u, false, true, false, true,
      Frontier::WorldEntryStanding::Seated },
    { "post", "Post Process", "fx", 0xFF8A65, "+0.0 EV", "Comp", "camera", 16u, false, true, false,
      true, Frontier::WorldEntryStanding::Seated },
};

constexpr const char* kPillIds[5]     = { "light", "sky", "body", "geo", "cam" };
constexpr const char* kPillLabels[5]  = { "Lights", "Sky", "Bodies", "Geometry", "Camera" };
constexpr uint32_t    kPillAccents[5] = { 0xFFB454, 0x5AA9FF, 0xDFE6F5, 0xE2E8F0, 0x34C759 };

void FeedTick(Frontier::CelestialEditorHost& Editor, ImTextureID MoonThumb) noexcept
{
    for (uint32_t P = 0u; P < 5u; ++P)
    {
        Frontier::WorldEntryPill Pill{};
        std::snprintf(Pill.Id, sizeof(Pill.Id), "%s", kPillIds[P]);
        std::snprintf(Pill.Label, sizeof(Pill.Label), "%s", kPillLabels[P]);
        Pill.Accent[0] = static_cast<float>((kPillAccents[P] >> 16) & 0xFFu) / 255.0f;
        Pill.Accent[1] = static_cast<float>((kPillAccents[P] >> 8) & 0xFFu) / 255.0f;
        Pill.Accent[2] = static_cast<float>(kPillAccents[P] & 0xFFu) / 255.0f;
        Pill.Bit       = 1u << P;
        Editor.RegisterPill(Pill);
    }
    for (const FeedRow& Row : kFeed)
    {
        Frontier::WorldEntry Entry{};
        std::snprintf(Entry.Id, sizeof(Entry.Id), "%s", Row.Id);
        std::snprintf(Entry.Label, sizeof(Entry.Label), "%s", Row.Label);
        std::snprintf(Entry.Icon, sizeof(Entry.Icon), "%s", Row.Icon);
        Entry.Accent[0] = static_cast<float>((Row.Accent >> 16) & 0xFFu) / 255.0f;
        Entry.Accent[1] = static_cast<float>((Row.Accent >> 8) & 0xFFu) / 255.0f;
        Entry.Accent[2] = static_cast<float>(Row.Accent & 0xFFu) / 255.0f;
        std::snprintf(Entry.Meta, sizeof(Entry.Meta), "%s", Row.Meta);
        std::snprintf(Entry.Tag, sizeof(Entry.Tag), "%s", Row.Tag);
        Entry.Standing = Row.Standing;
        Entry.Visible  = Row.Visible;
        Entry.Folder   = Row.Folder;
        Entry.EyeShown = Row.EyeShown;
        Entry.Anchored = Row.Anchored;
        std::snprintf(Entry.AboveId, sizeof(Entry.AboveId), "%s", Row.Above);
        Entry.PillBits = Row.Pills;
        Entry.Thumb    = std::strcmp(Row.Id, "moon#0") == 0 ? MoonThumb : static_cast<ImTextureID>(0);
        Editor.RegisterWorldEntry(Entry);
    }
    Frontier::OutlinerFooterFigures Footer{};
    std::snprintf(Footer.Clock, sizeof(Footer.Clock), "06:24");
    std::snprintf(Footer.Fps, sizeof(Footer.Fps), "60");
    std::snprintf(Footer.Quality, sizeof(Footer.Quality), "Standard");
    std::snprintf(Footer.Sun, sizeof(Footer.Sun), "+8.3\xC2\xB0");
    std::snprintf(Footer.Moons, sizeof(Footer.Moons), "1");
    std::snprintf(Footer.Cam, sizeof(Footer.Cam), "0, 2, 0");
    Editor.AssignFooter(Footer);
}

} // namespace

int main()
{
    ImGui::CreateContext();
    ImGuiIO& IO = ImGui::GetIO();
    IO.DisplaySize           = ImVec2(static_cast<float>(kWidth), static_cast<float>(kHeight));
    IO.DisplayFramebufferScale = ImVec2(1.0f, 1.0f);
    IO.IniFilename           = nullptr;
    IO.LogFilename           = nullptr;
    IO.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    IO.BackendFlags |= ImGuiBackendFlags_RendererHasTextures | ImGuiBackendFlags_RendererHasVtxOffset;

    Frontier::CelestialEditorHost Editor;
    Editor.ApplyTheme();   // seats the faces first: the glyph sheet below must carry them

    unsigned char* GlyphSheet = nullptr;
    int GlyphSheetWidth = 0, GlyphSheetHeight = 0;
    IO.Fonts->GetTexDataAsRGBA32(&GlyphSheet, &GlyphSheetWidth, &GlyphSheetHeight);

    int Fail = 0;
    auto Gate = [&](bool Passed, const char* Caption)
    {
        std::printf("[CelestialOutlinerProof] %s %s\n", Passed ? "[PASS]" : "[FAIL]", Caption);
        if (!Passed)
            Fail = 1;
    };

    Gate(Editor.QueryFontCount() == 12, "the twelve outline faces seat");
    Gate(Editor.QueryIconSheetRgba() != nullptr, "the SVG icon sheet seats");
    const uint32_t IconW = Editor.QueryIconSheetWidth();
    const uint32_t IconH = Editor.QueryIconSheetHeight();
    std::printf("[CelestialOutlinerProof] icon sheet %ux%u\n", IconW, IconH);

    // Every icon cell must carry lit texels: 84 SVGs over 10 columns of 96px cells.
    {
        const unsigned char* Sheet = Editor.QueryIconSheetRgba();
        uint32_t LitCells = 0u;
        if (Sheet != nullptr && IconW == 960u && IconH == 864u)
        {
            for (uint32_t Cell = 0u; Cell < 84u; ++Cell)
            {
                const uint32_t CellX = (Cell % 10u) * 96u;
                const uint32_t CellY = (Cell / 10u) * 96u;
                uint32_t Lit = 0u;
                for (uint32_t Y = 0u; Y < 96u; Y += 2u)
                {
                    for (uint32_t X = 0u; X < 96u; X += 2u)
                    {
                        const unsigned char* Texel =
                            Sheet + (static_cast<size_t>(CellY + Y) * IconW + CellX + X) * 4u;
                        if (Texel[3] > 8u)
                            ++Lit;
                    }
                }
                if (Lit > 10u)
                    ++LitCells;
            }
        }
        char Caption[96] = {};
        std::snprintf(Caption, sizeof(Caption), "all 84 icons rasterise (lit %u/84)", LitCells);
        Gate(LitCells == 84u, Caption);
    }

    // The bare ids alias the CPU rows headless, the AssignView idiom; the rasteriser resolves them.
    Editor.AssignIconSheetTexture(reinterpret_cast<ImTextureID>(Editor.QueryIconSheetRgba()));

    // The moon thumb: the reference reads the moon dot off the Luna texture, centre-half, unshaded.
    constexpr int kThumb = 28;
    std::vector<unsigned char> ThumbRows(static_cast<size_t>(kThumb) * kThumb * 4u, 0u);
    {
        int TW = 0, TH = 0, TC = 0;
        unsigned char* Luna =
            stbi_load("EngineContent/CelestialTextures/luna_2k.jpg", &TW, &TH, &TC, 4);
        if (Luna != nullptr && TW > 0 && TH > 0)
        {
            for (int Y = 0; Y < kThumb; ++Y)
            {
                for (int X = 0; X < kThumb; ++X)
                {
                    const float Dx = (static_cast<float>(X) + 0.5f) / kThumb - 0.5f;
                    const float Dy = (static_cast<float>(Y) + 0.5f) / kThumb - 0.5f;
                    unsigned char* Out =
                        ThumbRows.data() + (static_cast<size_t>(Y) * kThumb + X) * 4u;
                    if (Dx * Dx + Dy * Dy > 0.25f)
                        continue;
                    const int Sx = static_cast<int>((0.25f + 0.5f * (static_cast<float>(X) + 0.5f) / kThumb) * TW);
                    const int Sy = static_cast<int>((static_cast<float>(Y) + 0.5f) / kThumb * TH);
                    const unsigned char* In =
                        Luna + (static_cast<size_t>(Sy) * TW + Sx) * 4u;
                    Out[0] = In[0];
                    Out[1] = In[1];
                    Out[2] = In[2];
                    Out[3] = 255u;
                }
            }
            stbi_image_free(Luna);
            Gate(true, "the Luna thumb seats off luna_2k.jpg");
        }
        else
        {
            // Without the texture the dot still reads: a shaded disc, phase-lit from the right.
            for (int Y = 0; Y < kThumb; ++Y)
            {
                for (int X = 0; X < kThumb; ++X)
                {
                    const float Dx = (static_cast<float>(X) + 0.5f) / kThumb - 0.5f;
                    const float Dy = (static_cast<float>(Y) + 0.5f) / kThumb - 0.5f;
                    const float R2 = Dx * Dx + Dy * Dy;
                    unsigned char* Out =
                        ThumbRows.data() + (static_cast<size_t>(Y) * kThumb + X) * 4u;
                    if (R2 > 0.25f)
                        continue;
                    const float Shade = Dx > -0.18f * (1.0f - 4.0f * Dy * Dy) ? 232.0f : 27.0f;
                    Out[0] = Out[1] = Out[2] = static_cast<unsigned char>(Shade);
                    Out[3]           = 255u;
                }
            }
            Gate(false, "the Luna thumb seats off luna_2k.jpg");
        }
    }
    const ImTextureID MoonThumb = reinterpret_cast<ImTextureID>(ThumbRows.data());

    // The viewport's dawn: a gradient sky, a low sun glow, and a dark ground hem.
    constexpr int kViewW = 640, kViewH = 360;
    std::vector<unsigned char> ViewRows(static_cast<size_t>(kViewW) * kViewH * 4u);
    for (int Y = 0; Y < kViewH; ++Y)
    {
        const float V = static_cast<float>(Y) / static_cast<float>(kViewH - 1);
        for (int X = 0; X < kViewW; ++X)
        {
            const float U = static_cast<float>(X) / static_cast<float>(kViewW - 1);
            float R = 8.0f, G = 12.0f, B = 26.0f;
            if (V < 0.55f)
            {
                const float T = V / 0.55f;
                R = 8.0f + (214.0f - 8.0f) * T * T;
                G = 12.0f + (150.0f - 12.0f) * T * T;
                B = 26.0f + (110.0f - 26.0f) * T * T;
            }
            else
            {
                R = 14.0f;
                G = 16.0f;
                B = 18.0f;
            }
            const float Dx = U - 0.5f;
            const float Dy = (V - 0.55f) * 1.6f;
            const float Glow = std::exp(-(Dx * Dx + Dy * Dy) * 90.0f);
            R += 255.0f * Glow;
            G += 190.0f * Glow;
            B += 120.0f * Glow;
            unsigned char* Out = ViewRows.data() + (static_cast<size_t>(Y) * kViewW + X) * 4u;
            Out[0] = static_cast<unsigned char>(R > 255.0f ? 255.0f : R);
            Out[1] = static_cast<unsigned char>(G > 255.0f ? 255.0f : G);
            Out[2] = static_cast<unsigned char>(B > 255.0f ? 255.0f : B);
            Out[3] = 255u;
        }
    }
    Editor.AssignView(ViewRows.data(), kViewW, kViewH);

    SheetRef Sheets[3] = {
        { reinterpret_cast<ImTextureID>(ViewRows.data()), ViewRows.data(), kViewW, kViewH },
        { reinterpret_cast<ImTextureID>(const_cast<unsigned char*>(Editor.QueryIconSheetRgba())),
          Editor.QueryIconSheetRgba(), static_cast<int>(IconW), static_cast<int>(IconH) },
        { MoonThumb, ThumbRows.data(), kThumb, kThumb },
    };

    std::vector<unsigned char> Pixels(static_cast<size_t>(kWidth) * kHeight * 3u);

    auto Tick = [&]()
    {
        IO.DeltaTime = 1.0f / 60.0f;
        IO.AddMousePosEvent(-1.0f, -1.0f);
        IO.AddMouseButtonEvent(0, false);
        ImGui::NewFrame();
        FeedTick(Editor, MoonThumb);
        Editor.Record(nullptr, 0u, nullptr);
        ImGui::Render();
    };
    auto Rasterise = [&]()
    {
        // The backdrop: the night scene the glass floats over, so the .74 plate reads as glass.
        for (int Y = 0; Y < kHeight; ++Y)
        {
            const float V = static_cast<float>(Y) / static_cast<float>(kHeight - 1);
            const unsigned char R = static_cast<unsigned char>(5.0f + 9.0f * V);
            const unsigned char G = static_cast<unsigned char>(6.0f + 9.0f * V);
            const unsigned char B = static_cast<unsigned char>(10.0f + 12.0f * V);
            for (int X = 0; X < kWidth; ++X)
            {
                unsigned char* Pixel = Pixels.data() + (static_cast<size_t>(Y) * kWidth + X) * 3u;
                Pixel[0] = R;
                Pixel[1] = G;
                Pixel[2] = B;
            }
        }
        const ImDrawData* Drawings = ImGui::GetDrawData();
        for (int Index = 0; Index < Drawings->CmdListsCount; ++Index)
            RasterizeList(Drawings->CmdLists[Index], GlyphSheet, GlyphSheetWidth, GlyphSheetHeight,
                          Sheets, 3, Pixels.data(), Drawings->DisplayPos, Drawings->FramebufferScale);
    };

    Gate(Editor.QueryOutlineEntryCount() == 0u, "the outline rests empty before the first tick");

    // Phase one: the full outline, the Sun picked.
    Editor.PickEntry("sun");
    for (int i = 0; i < 10; ++i)
        Tick();
    Gate(Editor.QueryOutlineEntryCount() == 23u, "all 23 world rows register");
    Rasterise();
    Gate(PngWriteShim::WritePng("Diagnostics/CelestialOutlinerProof_Full.png", kWidth, kHeight, 3,
                                Pixels.data(), kWidth * 3)
             == 1,
         "the Full sheet writes");

    // The Full sheet's pixel gates: the glass plate, the seated greens, the sun's amber, the
    //    hidden row's red, and the reference's bright voice throughout.
    {
        auto Near = [&](size_t At, unsigned char R, unsigned char G, unsigned char B,
                        unsigned char Slop)
        {
            const int Dr = static_cast<int>(Pixels[At]) - R;
            const int Dg = static_cast<int>(Pixels[At + 1u]) - G;
            const int Db = static_cast<int>(Pixels[At + 2u]) - B;
            return Dr * Dr + Dg * Dg + Db * Db <= Slop * Slop * 3;
        };
        uint32_t Green = 0u, Amber = 0u, Red = 0u, Bright = 0u, Glass = 0u;
        for (int Y = 0; Y < kHeight; Y += 2)
        {
            for (int X = 0; X < 316; X += 2)
            {
                const size_t At = (static_cast<size_t>(Y) * kWidth + X) * 3u;
                if (Near(At, 52, 199, 89, 26))
                    ++Green;
                if (Near(At, 255, 180, 84, 30))
                    ++Amber;
                if (Near(At, 255, 59, 48, 30))
                    ++Red;
                if (Pixels[At] > 200 && Pixels[At + 1u] > 200 && Pixels[At + 2u] > 200)
                    ++Bright;
                if (Pixels[At] >= 12 && Pixels[At] <= 34 && Pixels[At + 2u] >= Pixels[At])
                    ++Glass;
            }
        }
        char Caption[128] = {};
        std::snprintf(Caption, sizeof(Caption),
                      "plate pips and voice (green %u, amber %u, red %u, bright %u, glass %u)", Green,
                      Amber, Red, Bright, Glass);
        std::printf("[CelestialOutlinerProof] %s\n", Caption);
        Gate(Green > 150 && Amber > 25 && Red > 20 && Bright > 100 && Glass > 20000, Caption);
    }

    // Phase two: the search narrows to the Moons.
    Editor.AssignSearch("moon");
    Editor.PickEntry("moon#0");
    for (int i = 0; i < 8; ++i)
        Tick();
    Rasterise();
    Gate(PngWriteShim::WritePng("Diagnostics/CelestialOutlinerProof_Search.png", kWidth, kHeight, 3,
                                Pixels.data(), kWidth * 3)
             == 1,
         "the Search sheet writes");

    // Phase three: the Lights pill narrows to the luminaires.
    Editor.AssignSearch("");
    Editor.TogglePill("light");
    Editor.PickEntry("plight");
    for (int i = 0; i < 8; ++i)
        Tick();
    Rasterise();
    Gate(PngWriteShim::WritePng("Diagnostics/CelestialOutlinerProof_Pills.png", kWidth, kHeight, 3,
                                Pixels.data(), kWidth * 3)
             == 1,
         "the Pills sheet writes");

    // Phase four: the compact plate.
    Editor.TogglePill("light");
    Editor.ToggleCompact();
    Editor.PickEntry("moons");
    for (int i = 0; i < 8; ++i)
        Tick();
    Gate(Editor.QueryCompact(), "the compact plate engages");
    Rasterise();
    Gate(PngWriteShim::WritePng("Diagnostics/CelestialOutlinerProof_Compact.png", kWidth, kHeight, 3,
                                Pixels.data(), kWidth * 3)
             == 1,
         "the Compact sheet writes");

    // Phase five: the tree foot — the scrolled rows, the moon thumb, the Comp tag.
    Editor.ToggleCompact();
    Editor.AssignOutlineScroll(100000.0f);
    Editor.PickEntry("post");
    for (int i = 0; i < 8; ++i)
        Tick();
    Rasterise();
    Gate(PngWriteShim::WritePng("Diagnostics/CelestialOutlinerProof_Foot.png", kWidth, kHeight, 3,
                                Pixels.data(), kWidth * 3)
             == 1,
         "the Foot sheet writes");

    if (Fail == 0)
        std::printf("[CelestialOutlinerProof] >>> the outline agrees with its reference\n");
    else
        std::printf("[CelestialOutlinerProof] >>> CELESTIAL OUTLINER PROOF FAILED\n");
    return Fail;
}
