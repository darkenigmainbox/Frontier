//============================================================================================================================================
//                                                 CELESTIALOUTLINERPANEL.CPP
//============================================================================================================================================
// 🧩 The development editor's celestial outliner — the reference panel's outliner, spoke in ImGui. Token
//    figures below are the reference's :root palette as bytes; metrics are its CSS as pixels; icons are
//    its own SVG documents. Behaviour mirrors its renderTree: single pick, eye flips, chevron folds, search
//    narrowing, pill narrowing, and drag re-seating with into/before affordances.

#include "CelestialOutlinerPanel.h"

#include "CelestialIconIndex.h"

#include <imgui.h>
#include <imgui_internal.h>   // ImGuiWindow: the SkipItems early-out

#include <cctype>
#include <cstdio>
#include <cstring>

namespace Frontier {

namespace {

//------------------------------------------------------------------------------------------------------------------------
//                                                          TOKENS
//------------------------------------------------------------------------------------------------------------------------

constexpr ImU32 kGlass  = IM_COL32(15, 16, 18, 189);     // --glass .74
constexpr ImU32 kText   = IM_COL32(255, 255, 255, 240);   // --text .94
constexpr ImU32 kT2     = IM_COL32(255, 255, 255, 143);   // --t2 .56
constexpr ImU32 kT3     = IM_COL32(255, 255, 255, 82);    // --t3 .32
constexpr ImU32 kG2     = IM_COL32(255, 255, 255, 11);    // --g2 .045
constexpr ImU32 kG3     = IM_COL32(255, 255, 255, 20);    // --g3 .08
constexpr ImU32 kStroke = IM_COL32(255, 255, 255, 18);    // --stroke .07
constexpr ImU32 kStroke2 = IM_COL32(255, 255, 255, 33);   // --stroke2 .13
constexpr ImU32 kSelBg  = IM_COL32(255, 255, 255, 23);    // .node.sel .09
constexpr ImU32 kTileBg = IM_COL32(255, 255, 255, 9);     // .ss .035
constexpr ImU32 kRed    = IM_COL32(0xFF, 0x3B, 0x30, 255);
constexpr ImU32 kGreen  = IM_COL32(0x34, 0xC7, 0x59, 255);
constexpr ImU32 kOrange = IM_COL32(0xFF, 0xB4, 0x54, 255);
constexpr ImU32 kDarkOnGreen = IM_COL32(0x0B, 0x1A, 0x12, 255);

ImU32 WithAlpha(ImU32 Tint, uint8_t Alpha) noexcept
{
    return (Tint & ~IM_COL32_A_MASK) | (static_cast<ImU32>(Alpha) << IM_COL32_A_SHIFT);
}

ImU32 AccentOf(const WorldEntry& Row) noexcept
{
    return IM_COL32(static_cast<int>(Row.Accent[0] * 255.0f), static_cast<int>(Row.Accent[1] * 255.0f),
                    static_cast<int>(Row.Accent[2] * 255.0f), 255);
}

ImU32 PillAccentOf(const WorldEntryPill& Pill) noexcept
{
    return IM_COL32(static_cast<int>(Pill.Accent[0] * 255.0f), static_cast<int>(Pill.Accent[1] * 255.0f),
                    static_cast<int>(Pill.Accent[2] * 255.0f), 255);
}

bool ContainsFolded(const char* Hay, const char* Needle) noexcept
{
    if (Needle[0] == '\0')
        return true;
    for (; *Hay != '\0'; ++Hay)
    {
        const char* H = Hay;
        const char* N = Needle;
        while (*N != '\0' && *H != '\0'
            && std::tolower(static_cast<unsigned char>(*H)) == std::tolower(static_cast<unsigned char>(*N)))
        {
            ++H;
            ++N;
        }
        if (*N == '\0')
            return true;
    }
    return false;
}

void UpperCopy(char* Dst, uint32_t Cap, const char* Src) noexcept
{
    uint32_t i = 0u;
    for (; Src[i] != '\0' && i + 1u < Cap; ++i)
        Dst[i] = static_cast<char>(std::toupper(static_cast<unsigned char>(Src[i])));
    Dst[i] = '\0';
}

uint32_t HashId(const char* Text) noexcept
{
    uint32_t Hash = 2166136261u;
    for (; *Text != '\0'; ++Text)
    {
        Hash ^= static_cast<uint32_t>(static_cast<unsigned char>(*Text));
        Hash *= 16777619u;
    }
    return Hash;
}

// Letter-spaced text — ImGui has no tracking, so spaced captions walk codepoint by codepoint (UTF-8
//    aware). Returns the advance, so callers right-align off it.
float MeasureSpaced(ImFont* Font, const char* Text, float Spacing) noexcept
{
    float W = 0.0f;
    uint32_t N = 0u;
    for (const char* P = Text; *P != '\0';)
    {
        unsigned int C = 0u;
        const int Len = ImTextCharFromUtf8(&C, P, nullptr);
        if (Len <= 0)
            break;
        W += Font->CalcTextSizeA(Font->LegacySize, FLT_MAX, 0.0f, P, P + Len).x;
        P += Len;
        ++N;
    }
    return N > 0u ? W + Spacing * static_cast<float>(N - 1u) : 0.0f;
}

void DrawSpaced(ImDrawList* Draw, ImFont* Font, const ImVec2& Pos, ImU32 Tint, const char* Text,
                float Spacing) noexcept
{
    float X = Pos.x;
    for (const char* P = Text; *P != '\0';)
    {
        unsigned int C = 0u;
        const int Len = ImTextCharFromUtf8(&C, P, nullptr);
        if (Len <= 0)
            break;
        const ImVec2 G = Font->CalcTextSizeA(Font->LegacySize, FLT_MAX, 0.0f, P, P + Len);
        Draw->AddText(Font, Font->LegacySize, ImVec2(X, Pos.y), Tint, P, P + Len);
        X += G.x + Spacing;
        P += Len;
    }
}

// Ellipsized text — the reference's overflow:ellipsis, as a trimmed line with the ellipsis glyph.
void DrawEllipsized(ImDrawList* Draw, ImFont* Font, const ImVec2& Pos, ImU32 Tint, const char* Text,
                    float AvailW) noexcept
{
    const ImVec2 Full = Font->CalcTextSizeA(Font->LegacySize, FLT_MAX, 0.0f, Text);
    if (Full.x <= AvailW)
    {
        Draw->AddText(Font, Font->LegacySize, Pos, Tint, Text);
        return;
    }
    const float EllipsisW = Font->CalcTextSizeA(Font->LegacySize, FLT_MAX, 0.0f, "…").x;
    float W = 0.0f;
    const char* End = Text;
    for (const char* P = Text; *P != '\0';)
    {
        unsigned int C = 0u;
        const int Len = ImTextCharFromUtf8(&C, P, nullptr);
        if (Len <= 0)
            break;
        const float Gw = Font->CalcTextSizeA(Font->LegacySize, FLT_MAX, 0.0f, P, P + Len).x;
        if (W + Gw + EllipsisW > AvailW)
            break;
        W += Gw;
        End = P + Len;
        P += Len;
    }
    char Line[128] = {};
    const size_t Keep = static_cast<size_t>(End - Text) < sizeof(Line) - 4u
        ? static_cast<size_t>(End - Text) : sizeof(Line) - 4u;
    std::memcpy(Line, Text, Keep);
    std::memcpy(Line + Keep, "…", 3u);
    Draw->AddText(Font, Font->LegacySize, Pos, Tint, Line);
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                                           FEED
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::AssignFonts(const CelestialOutlinerFonts& Fonts) noexcept
{
    Fonts_ = Fonts;
}

void CelestialOutlinerPanel::AssignIcons(CelestialIconIndex* Icons) noexcept
{
    Icons_ = Icons;
}

void CelestialOutlinerPanel::RegisterPill(const WorldEntryPill& Pill) noexcept
{
    const int At = FindPill(Pill.Id);
    if (At >= 0)
    {
        Pills_[static_cast<uint32_t>(At)] = Pill;
        PillSeen_[static_cast<uint32_t>(At)] = true;
        return;
    }
    if (PillCount_ >= kMaxOutlinerPills)
        return;
    Pills_[PillCount_]    = Pill;
    PillSeen_[PillCount_] = true;
    ++PillCount_;
}

void CelestialOutlinerPanel::RegisterWorldEntry(const WorldEntry& Entry) noexcept
{
    const int At = FindEntry(Entry.Id);
    if (At >= 0)
    {
        // A refresh keeps the panel-owned figures (the eye, the above-link) and takes everything else
        //    fresh, so a drag re-seat and an eye flip survive the next tick's feed.
        WorldEntry& Row = Entries_[static_cast<uint32_t>(At)];
        const bool KeptVisible = Row.Visible;
        char KeptAbove[40] = {};
        std::memcpy(KeptAbove, Row.AboveId, sizeof(KeptAbove));
        Row = Entry;
        Row.Visible = KeptVisible;
        std::memcpy(Row.AboveId, KeptAbove, sizeof(Row.AboveId));
        EntrySeen_[static_cast<uint32_t>(At)] = true;
        return;
    }
    if (EntryCount_ >= kMaxWorldEntries)
        return;
    Entries_[EntryCount_]    = Entry;
    EntrySeen_[EntryCount_]  = true;
    ++EntryCount_;
}

void CelestialOutlinerPanel::AssignFooter(const OutlinerFooterFigures& Footer) noexcept
{
    Footer_ = Footer;
}

const char* CelestialOutlinerPanel::QueryPicked() const noexcept
{
    return Picked_;
}

uint32_t CelestialOutlinerPanel::QueryEntryCount() const noexcept
{
    return EntryCount_;
}

uint32_t CelestialOutlinerPanel::QueryRegisteredAt(uint32_t Slot, const WorldEntry** Entry) const noexcept
{
    if (Entry == nullptr || Slot >= EntryCount_)
        return kNoWorldEntry;
    *Entry = &Entries_[Slot];
    return Slot;
}

void CelestialOutlinerPanel::PickEntry(const char* Id) noexcept
{
    if (Id == nullptr)
        return;
    std::snprintf(Picked_, sizeof(Picked_), "%s", Id);
    OpenAbove(Id);
}

void CelestialOutlinerPanel::AssignSearch(const char* Text) noexcept
{
    if (Text == nullptr)
        return;
    std::snprintf(Query_, sizeof(Query_), "%s", Text);
}

void CelestialOutlinerPanel::TogglePill(const char* Id) noexcept
{
    const int At = FindPill(Id);
    if (At < 0)
        return;
    ActivePillBits_ ^= Pills_[static_cast<uint32_t>(At)].Bit;
}

void CelestialOutlinerPanel::ToggleCompact() noexcept
{
    Compact_ = !Compact_;
}

void CelestialOutlinerPanel::AssignScroll(float Y) noexcept
{
    PendingScroll_ = Y;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                          RECORD
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::Record() noexcept
{
    ImGui::PushStyleColor(ImGuiCol_WindowBg, kGlass);
    ImGui::PushStyleColor(ImGuiCol_Border, kStroke);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 28.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 1.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_ScrollbarSize, 0.0f);

    constexpr ImGuiWindowFlags Plate = ImGuiWindowFlags_NoTitleBar
                                     | ImGuiWindowFlags_NoScrollbar
                                     | ImGuiWindowFlags_NoScrollWithMouse;
    const bool Open = ImGui::Begin("Outliner", nullptr, Plate);
    ImGuiWindow* Self = ImGui::GetCurrentWindow();
    const bool Skip = Self->SkipItems;
    const float PlateW = Open && !Skip ? ImGui::GetContentRegionAvail().x : 0.0f;

    if (Open && !Skip)
    {
        // Rows and pills the tick never fed are swept, so a world that shrinks leaves no ghosts.
        for (uint32_t I = 0u; I < EntryCount_;)
        {
            if (EntrySeen_[I])
            {
                EntrySeen_[I] = false;
                ++I;
                continue;
            }
            for (uint32_t J = I + 1u; J < EntryCount_; ++J)
            {
                Entries_[J - 1u]   = Entries_[J];
                EntrySeen_[J - 1u] = EntrySeen_[J];
            }
            --EntryCount_;
        }
        for (uint32_t I = 0u; I < PillCount_;)
        {
            if (PillSeen_[I])
            {
                PillSeen_[I] = false;
                ++I;
                continue;
            }
            ActivePillBits_ &= ~Pills_[I].Bit;
            for (uint32_t J = I + 1u; J < PillCount_; ++J)
            {
                Pills_[J - 1u]   = Pills_[J];
                PillSeen_[J - 1u] = PillSeen_[J];
            }
            --PillCount_;
        }
        for (uint32_t I = 0u; I < ShutCount_;)
        {
            bool Alive = false;
            for (uint32_t J = 0u; J < EntryCount_; ++J)
            {
                if (HashId(Entries_[J].Id) == Shut_[I].Hash)
                {
                    Alive = true;
                    break;
                }
            }
            if (Alive)
            {
                ++I;
                continue;
            }
            for (uint32_t J = I + 1u; J < ShutCount_; ++J)
                Shut_[J - 1u] = Shut_[J];
            --ShutCount_;
        }
        if (FindEntry(Picked_) < 0)
            Picked_[0] = '\0';

        const ImGuiIO& IO = ImGui::GetIO();
        const bool Scoped = ImGui::IsWindowHovered(ImGuiHoveredFlags_RootAndChildWindows)
            || ImGui::IsWindowFocused(ImGuiFocusedFlags_RootAndChildWindows);
        if (Scoped && IO.KeyCtrl && IO.KeyShift && ImGui::IsKeyPressed(ImGuiKey_F, false))
            FocusSearch_ = true;
        if (Scoped && ImGui::IsKeyPressed(ImGuiKey_Tab, false) && ImGui::GetActiveID() == 0u)
            Compact_ = !Compact_;

        RecordHeader(PlateW);
        if (!Compact_)
            RecordSceneStat(PlateW);
        RecordSearch(PlateW);
        if (!Compact_)
            RecordPills(PlateW);

        // The footer draws last at a known height, so the outline takes exactly the rest.
        const uint32_t FootCols = Compact_ ? 2u : 4u;
        const uint32_t FootRows = (5u + FootCols - 1u) / FootCols;
        const float FootH = 1.0f + 10.0f + static_cast<float>(FootRows) * 48.0f
            + static_cast<float>(FootRows - 1u) * 4.0f + 12.0f;
        const float OutlineH = ImGui::GetContentRegionAvail().y - FootH;
        if (OutlineH > 0.0f)
            RecordOutline(PlateW, OutlineH);
        RecordFooter(PlateW);
    }
    ImGui::End();
    ImGui::PopStyleVar(4);
    ImGui::PopStyleColor(2);
}

//------------------------------------------------------------------------------------------------------------------------
//                                                          HEADER
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordHeader(float PlateW) noexcept
{
    const float PadX     = Compact_ ? 16.0f : 22.0f;
    const float PadTop   = Compact_ ? 16.0f : 22.0f;
    const float PadDown  = Compact_ ? 8.0f : 12.0f;
    const float BlockH   = PadTop + 28.0f + PadDown;
    const float X0       = ImGui::GetCursorScreenPos().x;
    const float Y0       = ImGui::GetCursorScreenPos().y;

    ImGui::Dummy(ImVec2(PlateW, BlockH));
    ImDrawList* Draw = ImGui::GetWindowDrawList();

    ImFont* Title = Compact_ ? Fonts_.Outfit16 : Fonts_.Outfit20;
    ImFont* Clock = Compact_ ? Fonts_.Mono16 : Fonts_.Mono22;
    if (Title == nullptr)
        Title = ImGui::GetFont();
    if (Clock == nullptr)
        Clock = ImGui::GetFont();
    ImFont* Sub = Fonts_.Outfit12 != nullptr ? Fonts_.Outfit12 : ImGui::GetFont();
    ImFont* Lst = Fonts_.Mono10 != nullptr ? Fonts_.Mono10 : ImGui::GetFont();

    uint32_t Nodes = 0u;
    for (uint32_t I = 0u; I < EntryCount_; ++I)
        if (!Entries_[I].Folder)
            ++Nodes;
    char SubLine[48] = {};
    std::snprintf(SubLine, sizeof(SubLine), "Scene · %u nodes", Nodes);

    const float MidY = Y0 + PadTop + 14.0f;
    const float BtnR = X0 + PlateW - PadX;
    const float BtnL = BtnR - 28.0f;
    const float BtnY = Y0 + PadTop;
    const float TitleW = Title->CalcTextSizeA(Title->LegacySize, FLT_MAX, 0.0f, "Outliner").x;
    Draw->AddText(Title, Title->LegacySize, ImVec2(X0 + PadX, MidY - Title->LegacySize * 0.5f), kText,
                  "Outliner");

    // The clock reads first (right-hung), so the sub line knows the room it may take: the compact
    //    plate is narrower than title + sub + clock, and the sub yields with an ellipsis.
    float ClockL = BtnL - 10.0f;
    if (Footer_.Clock[0] != '\0')
    {
        ImFont* ClockFace = Compact_ ? Fonts_.Mono16 : Fonts_.Mono22;
        if (ClockFace == nullptr)
            ClockFace = ImGui::GetFont();
        ImFont* LstFace = Fonts_.Mono10 != nullptr ? Fonts_.Mono10 : ImGui::GetFont();
        const ImVec2 ClockSize =
            ClockFace->CalcTextSizeA(ClockFace->LegacySize, FLT_MAX, 0.0f, Footer_.Clock);
        ClockL -= MeasureSpaced(LstFace, "LST", 1.0f) + 4.0f + ClockSize.x;
    }
    const ImVec2 SubSize = Sub->CalcTextSizeA(Sub->LegacySize, FLT_MAX, 0.0f, SubLine);
    const float SubAvail = ClockL - 8.0f - (X0 + PadX + TitleW + 4.0f);
    if (SubSize.x <= SubAvail)
        Draw->AddText(Sub, Sub->LegacySize, ImVec2(X0 + PadX + TitleW + 4.0f, MidY - SubSize.y * 0.5f),
                      kT3, SubLine);
    else if (SubAvail > 20.0f)
        DrawEllipsized(Draw, Sub, ImVec2(X0 + PadX + TitleW + 4.0f, MidY - SubSize.y * 0.5f), kT3,
                       SubLine, SubAvail);
    ImGui::SetCursorScreenPos(ImVec2(BtnL, BtnY));
    ImGui::PushID("##celcompact");
    ImGui::InvisibleButton("##disc", ImVec2(28.0f, 28.0f));
    const bool BtnHover = ImGui::IsItemHovered();
    if (ImGui::IsItemClicked(ImGuiMouseButton_Left))
        Compact_ = !Compact_;
    if (BtnHover)
        ImGui::SetMouseCursor(ImGuiMouseCursor_Hand);
    ImGui::PopID();
    ImGui::SetCursorScreenPos(ImVec2(X0, Y0 + BlockH));
    Draw->AddCircleFilled(ImVec2(BtnL + 14.0f, BtnY + 14.0f), 14.0f,
                          BtnHover || Compact_ ? kG3 : IM_COL32(0, 0, 0, 0));
    Draw->AddCircle(ImVec2(BtnL + 14.0f, BtnY + 14.0f), 13.5f, kStroke, 24);
    if (Icons_ != nullptr)
        Icons_->DrawIcon(Draw, "collapse", ImVec2(BtnL + 7.0f, BtnY + 7.0f), 14.0f,
                         BtnHover || Compact_ ? kText : kT3);

    if (Footer_.Clock[0] != '\0')
    {
        const ImVec2 ClockSize = Clock->CalcTextSizeA(Clock->LegacySize, FLT_MAX, 0.0f, Footer_.Clock);
        const float LstW = MeasureSpaced(Lst, "LST", 1.0f);
        const float ClockR = BtnL - 10.0f;
        const float ClockL = ClockR - LstW - 4.0f - ClockSize.x;
        Draw->AddText(Clock, Clock->LegacySize, ImVec2(ClockL, MidY - ClockSize.y * 0.5f), kText,
                      Footer_.Clock);
        DrawSpaced(Draw, Lst, ImVec2(ClockR - LstW, MidY - Lst->LegacySize * 0.5f), kT3, "LST", 1.0f);
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                        SCENE STAT
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordSceneStat(float PlateW) noexcept
{
    const float Gap   = 8.0f;
    const float TileW = (PlateW - 28.0f - Gap) * 0.5f;
    const float TileH = 12.0f + 30.0f + 4.0f + 15.0f + 10.0f;
    const float X0    = ImGui::GetCursorScreenPos().x;
    const float Y0    = ImGui::GetCursorScreenPos().y;

    ImGui::Dummy(ImVec2(PlateW, TileH + 10.0f));
    ImDrawList* Draw = ImGui::GetWindowDrawList();

    ImFont* Label = Fonts_.Outfit12 != nullptr ? Fonts_.Outfit12 : ImGui::GetFont();
    ImFont* Numeral = Fonts_.Mono30 != nullptr ? Fonts_.Mono30 : ImGui::GetFont();

    uint32_t Shown = 0u, Shut = 0u;
    for (uint32_t I = 0u; I < EntryCount_; ++I)
    {
        if (Entries_[I].Folder)
            continue;
        if (Entries_[I].Visible)
            ++Shown;
        else
            ++Shut;
    }

    const char* Captions[2] = { "Visible", "Hidden" };
    const uint32_t Figures[2] = { Shown, Shut };
    for (uint32_t T = 0u; T < 2u; ++T)
    {
        const float Tx = X0 + 14.0f + static_cast<float>(T) * (TileW + Gap);
        Draw->AddRectFilled(ImVec2(Tx, Y0), ImVec2(Tx + TileW, Y0 + TileH), kTileBg, 18.0f);
        Draw->AddRect(ImVec2(Tx, Y0), ImVec2(Tx + TileW, Y0 + TileH), kStroke, 18.0f);

        // The Visible tile always reads ok; the Hidden tile reads warn only past zero.
        const bool Warn = (T == 1u) && (Shut > 0u);
        const ImU32 PipBg = (T == 0u) ? kGreen
            : (Warn ? IM_COL32(255, 80, 80, 38) : IM_COL32(255, 255, 255, 15));
        const ImU32 GlyphTint = (T == 0u) ? kDarkOnGreen : (Warn ? kRed : kT3);
        const char* Glyph = (T == 0u) ? "check" : "warn";

        const ImVec2 PipC(Tx + 14.0f + 11.0f, Y0 + 12.0f + 11.0f);
        Draw->AddCircleFilled(PipC, 11.0f, PipBg);
        if (Icons_ != nullptr)
            Icons_->DrawIcon(Draw, Glyph, ImVec2(PipC.x - 7.0f, PipC.y - 7.0f), 14.0f, GlyphTint);

        char Figure[16] = {};
        std::snprintf(Figure, sizeof(Figure), "%u", Figures[T]);
        const ImVec2 NumSize = Numeral->CalcTextSizeA(Numeral->LegacySize, FLT_MAX, 0.0f, Figure);
        Draw->AddText(Numeral, Numeral->LegacySize,
                      ImVec2(Tx + TileW - 14.0f - NumSize.x, Y0 + 12.0f), kText, Figure);

        Draw->AddText(Label, Label->LegacySize, ImVec2(Tx + 14.0f, Y0 + 12.0f + 30.0f + 4.0f), kT2,
                      Captions[T]);
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                          SEARCH
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordSearch(float PlateW) noexcept
{
    const float H    = Compact_ ? 32.0f : 40.0f;
    const float Down = Compact_ ? 8.0f : 8.0f;
    const float X0   = ImGui::GetCursorScreenPos().x;
    const float Y0   = ImGui::GetCursorScreenPos().y;
    const float Fx   = X0 + 14.0f;
    const float Fw   = PlateW - 28.0f;

    ImGui::Dummy(ImVec2(PlateW, H + Down));

    ImDrawList* Draw = ImGui::GetWindowDrawList();
    Draw->AddRectFilled(ImVec2(Fx, Y0), ImVec2(Fx + Fw, Y0 + H), kG2, H * 0.5f);
    Draw->AddRect(ImVec2(Fx, Y0), ImVec2(Fx + Fw, Y0 + H), kStroke, H * 0.5f);
    if (Icons_ != nullptr)
        Icons_->DrawIcon(Draw, "search", ImVec2(Fx + 14.0f, Y0 + (H - 16.0f) * 0.5f), 16.0f, kT3);

    ImFont* Field = Fonts_.Outfit13 != nullptr ? Fonts_.Outfit13 : ImGui::GetFont();
    ImGui::PushFont(Field);
    ImGui::PushStyleColor(ImGuiCol_FrameBg, ImVec4(0.0f, 0.0f, 0.0f, 0.0f));
    ImGui::PushStyleColor(ImGuiCol_TextDisabled, kT3);
    ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_FramePadding,
                        ImVec2(0.0f, (H - Field->LegacySize) * 0.5f));
    ImGui::SetCursorScreenPos(ImVec2(Fx + 14.0f + 16.0f + 10.0f, Y0));
    ImGui::SetNextItemWidth(Fw - 14.0f - 16.0f - 10.0f - 14.0f);
    if (FocusSearch_)
    {
        ImGui::SetKeyboardFocusHere();
        FocusSearch_ = false;
    }
    ImGui::PushID("##celsearch");
    ImGui::InputTextWithHint("##field", "Search  Ctrl+Shift+F", Query_, sizeof(Query_),
                             ImGuiInputTextFlags_None);
    ImGui::PopID();
    ImGui::PopStyleVar(2);
    ImGui::PopStyleColor(2);
    ImGui::PopFont();
    ImGui::SetCursorScreenPos(ImVec2(X0, Y0 + H + Down));
}

//------------------------------------------------------------------------------------------------------------------------
//                                                           PILLS
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordPills(float PlateW) noexcept
{
    if (PillCount_ == 0u)
        return;
    ImFont* Pill = Fonts_.Outfit11 != nullptr ? Fonts_.Outfit11 : ImGui::GetFont();
    ImDrawList* Draw = ImGui::GetWindowDrawList();

    const float X0 = ImGui::GetCursorScreenPos().x;
    const float Y0 = ImGui::GetCursorScreenPos().y;
    const float L  = X0 + 14.0f;
    const float R  = X0 + PlateW - 14.0f;

    float X = L;
    float Y = Y0;
    for (uint32_t P = 0u; P < PillCount_; ++P)
    {
        const ImVec2 LabelSize =
            Pill->CalcTextSizeA(Pill->LegacySize, FLT_MAX, 0.0f, Pills_[P].Label);
        const float W = 10.0f + 6.0f + 6.0f + LabelSize.x + 10.0f;
        if (X + W > R + 0.5f && X > L + 0.5f)
        {
            X = L;
            Y += 26.0f + 5.0f;
        }
        const bool Lit = (ActivePillBits_ & Pills_[P].Bit) != 0u;
        ImGui::SetCursorScreenPos(ImVec2(X, Y));
        ImGui::PushID(static_cast<int>(0xC310 + P));
        ImGui::InvisibleButton("##pill", ImVec2(W, 26.0f));
        const bool Hover = ImGui::IsItemHovered();
        if (ImGui::IsItemClicked(ImGuiMouseButton_Left))
            ActivePillBits_ ^= Pills_[P].Bit;
        if (Hover)
            ImGui::SetMouseCursor(ImGuiMouseCursor_Hand);
        ImGui::PopID();

        Draw->AddRectFilled(ImVec2(X, Y), ImVec2(X + W, Y + 26.0f), Lit ? kG3 : IM_COL32(0, 0, 0, 0),
                            13.0f);
        Draw->AddRect(ImVec2(X, Y), ImVec2(X + W, Y + 26.0f), Lit ? kStroke2 : kStroke, 13.0f);
        Draw->AddCircleFilled(ImVec2(X + 10.0f + 3.0f, Y + 13.0f), 3.0f, PillAccentOf(Pills_[P]));
        Draw->AddText(Pill, Pill->LegacySize, ImVec2(X + 10.0f + 6.0f + 6.0f, Y + (26.0f - LabelSize.y) * 0.5f),
                      Lit ? kText : kT3, Pills_[P].Label);
        X += W + 5.0f;
    }
    ImGui::SetCursorScreenPos(ImVec2(X0, Y + 26.0f + 8.0f));
}

//------------------------------------------------------------------------------------------------------------------------
//                                                          OUTLINE
//------------------------------------------------------------------------------------------------------------------------

int CelestialOutlinerPanel::FindEntry(const char* Id) const noexcept
{
    if (Id == nullptr)
        return -1;
    for (uint32_t I = 0u; I < EntryCount_; ++I)
        if (std::strcmp(Entries_[I].Id, Id) == 0)
            return static_cast<int>(I);
    return -1;
}

int CelestialOutlinerPanel::FindPill(const char* Id) const noexcept
{
    if (Id == nullptr)
        return -1;
    for (uint32_t P = 0u; P < PillCount_; ++P)
        if (std::strcmp(Pills_[P].Id, Id) == 0)
            return static_cast<int>(P);
    return -1;
}

uint32_t CelestialOutlinerPanel::DepthOf(uint32_t Slot) const noexcept
{
    uint32_t Depth = 0u;
    const char* Above = Entries_[Slot].AboveId;
    for (uint32_t Guard = 0u; Guard < 32u && Above[0] != '\0'; ++Guard)
    {
        const int At = FindEntry(Above);
        if (At < 0)
            break;
        ++Depth;
        Above = Entries_[static_cast<uint32_t>(At)].AboveId;
    }
    return Depth;
}

bool CelestialOutlinerPanel::PassPills(uint32_t Slot) const noexcept
{
    if (ActivePillBits_ == 0u)
        return true;
    return (Entries_[Slot].PillBits & ActivePillBits_) != 0u;
}

bool CelestialOutlinerPanel::PassSearch(uint32_t Slot) const noexcept
{
    return ContainsFolded(Entries_[Slot].Label, Query_);
}

bool CelestialOutlinerPanel::IsShut(const char* Id) const noexcept
{
    const uint32_t Hash = HashId(Id);
    for (uint32_t I = 0u; I < ShutCount_; ++I)
        if (Shut_[I].Hash == Hash)
            return Shut_[I].Shut;
    return false;   // rows read open until folded, the reference's openF default
}

void CelestialOutlinerPanel::SetShut(const char* Id, bool Shut) noexcept
{
    const uint32_t Hash = HashId(Id);
    for (uint32_t I = 0u; I < ShutCount_; ++I)
    {
        if (Shut_[I].Hash == Hash)
        {
            Shut_[I].Shut = Shut;
            return;
        }
    }
    if (ShutCount_ < kMaxWorldEntries)
    {
        Shut_[ShutCount_].Hash = Hash;
        Shut_[ShutCount_].Shut = Shut;
        Shut_[ShutCount_].Seen = true;
        ++ShutCount_;
    }
}

void CelestialOutlinerPanel::OpenAbove(const char* Id) noexcept
{
    const char* Above = nullptr;
    const int At = FindEntry(Id);
    if (At >= 0)
        Above = Entries_[static_cast<uint32_t>(At)].AboveId;
    for (uint32_t Guard = 0u; Guard < 32u && Above != nullptr && Above[0] != '\0'; ++Guard)
    {
        SetShut(Above, false);
        const int Next = FindEntry(Above);
        Above = (Next >= 0) ? Entries_[static_cast<uint32_t>(Next)].AboveId : nullptr;
    }
}

WorldEntryStanding CelestialOutlinerPanel::EffectiveStanding(const WorldEntry& Row) const noexcept
{
    if (!Row.Visible)
        return WorldEntryStanding::Retired;   // hidden rows always read the red pip
    if (Row.Standing == WorldEntryStanding::Retired)
        return WorldEntryStanding::Seated;
    return Row.Standing;
}

float CelestialOutlinerPanel::RecordOutline(float PlateW, float OutlineH) noexcept
{
    const float X0 = ImGui::GetCursorScreenPos().x;
    const float Y0 = ImGui::GetCursorScreenPos().y;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::SetCursorScreenPos(ImVec2(X0, Y0));
    // The plate hides the scrollbars (zero-size style above); the wheel still travels.
    ImGui::BeginChild("##celtree", ImVec2(PlateW, OutlineH), false, ImGuiWindowFlags_NoBackground);
    if (PendingScroll_ >= 0.0f)
    {
        ImGui::SetScrollY(PendingScroll_);
        PendingScroll_ = -1.0f;
    }

    bool Shown[kMaxWorldEntries] = {};
    for (uint32_t I = 0u; I < EntryCount_; ++I)
    {
        if (!PassPills(I) || !PassSearch(I))
            continue;
        Shown[I] = true;
        const char* Above = Entries_[I].AboveId;
        for (uint32_t Guard = 0u; Guard < 32u && Above[0] != '\0'; ++Guard)
        {
            const int At = FindEntry(Above);
            if (At < 0)
                break;
            Shown[static_cast<uint32_t>(At)] = true;
            Above = Entries_[static_cast<uint32_t>(At)].AboveId;
        }
    }

    // The walk, in registration order: roots first, then each row's below-rows while open. A live
    //    query forces every above-row open, the reference's search behaviour.
    struct WalkFrame
    {
        uint32_t Slot;
        uint32_t Depth;
    };
    WalkFrame Stack[kMaxWorldEntries] = {};
    uint32_t StackTop = 0u;
    for (uint32_t I = EntryCount_; I > 0u; --I)
    {
        if (Entries_[I - 1u].AboveId[0] == '\0' && Shown[I - 1u])
        {
            Stack[StackTop].Slot  = I - 1u;
            Stack[StackTop].Depth = 0u;
            ++StackTop;
        }
    }
    const bool ForceOpen = Query_[0] != '\0';
    uint32_t Drawn = 0u;
    while (StackTop > 0u)
    {
        --StackTop;
        const uint32_t Slot  = Stack[StackTop].Slot;
        const uint32_t Depth = Stack[StackTop].Depth;
        bool HasBelow = false;
        for (uint32_t J = 0u; J < EntryCount_; ++J)
        {
            if (std::strcmp(Entries_[J].AboveId, Entries_[Slot].Id) == 0)
            {
                HasBelow = true;
                break;
            }
        }
        bool AncestorHidden = false;
        const char* Above = Entries_[Slot].AboveId;
        for (uint32_t Guard = 0u; Guard < 32u && Above[0] != '\0'; ++Guard)
        {
            const int At = FindEntry(Above);
            if (At < 0)
                break;
            if (!Entries_[static_cast<uint32_t>(At)].Visible)
                AncestorHidden = true;
            Above = Entries_[static_cast<uint32_t>(At)].AboveId;
        }
        RecordRow(Entries_[Slot], Depth, HasBelow, AncestorHidden);
        ++Drawn;
        if (HasBelow && (!IsShut(Entries_[Slot].Id) || ForceOpen))
        {
            for (uint32_t J = EntryCount_; J > 0u; --J)
            {
                if (std::strcmp(Entries_[J - 1u].AboveId, Entries_[Slot].Id) == 0 && Shown[J - 1u])
                {
                    Stack[StackTop].Slot  = J - 1u;
                    Stack[StackTop].Depth = Depth + 1u;
                    ++StackTop;
                }
            }
        }
    }

    if (Drawn == 0u)
    {
        ImFont* Empty = Fonts_.Outfit12 != nullptr ? Fonts_.Outfit12 : ImGui::GetFont();
        const ImVec2 Gap = Empty->CalcTextSizeA(Empty->LegacySize, FLT_MAX, 0.0f, "Nothing here.");
        ImDrawList* Draw = ImGui::GetWindowDrawList();
        const float Ex = X0 + (PlateW - Gap.x) * 0.5f;
        Draw->AddText(Empty, Empty->LegacySize, ImVec2(Ex, Y0 + 30.0f), kT3, "Nothing here.");
        ImGui::Dummy(ImVec2(PlateW, 30.0f + Gap.y + 10.0f));
    }

    // The root drop: what lands on the empty rest hangs at the root.
    const float RestY = ImGui::GetCursorScreenPos().y;
    if (RestY < Y0 + OutlineH - 4.0f)
    {
        ImGui::SetCursorScreenPos(ImVec2(X0 + 14.0f, RestY));
        ImGui::PushID("##celroot");
        ImGui::InvisibleButton("##drop", ImVec2(PlateW - 28.0f, Y0 + OutlineH - RestY));
        if (ImGui::BeginDragDropTarget())
        {
            if (const ImGuiPayload* Drop = ImGui::AcceptDragDropPayload("CELOUTLINE_ROW"))
            {
                const char* Dragged = static_cast<const char*>(Drop->Data);   // ImGuiPayload's own member
                const int At = FindEntry(Dragged);
                if (At >= 0)
                    Entries_[static_cast<uint32_t>(At)].AboveId[0] = '\0';
            }
            ImGui::EndDragDropTarget();
        }
        if (ImGui::GetDragDropPayload() != nullptr && ImGui::IsItemHovered())
        {
            ImDrawList* Draw = ImGui::GetWindowDrawList();
            Draw->AddRect(ImVec2(X0 + 14.0f, RestY), ImVec2(X0 + PlateW - 14.0f, Y0 + OutlineH - 10.0f),
                          kStroke2, 14.0f);
        }
        ImGui::PopID();
    }

    ImGui::EndChild();
    ImGui::PopStyleVar(1);
    ImGui::SetCursorScreenPos(ImVec2(X0, Y0 + OutlineH + 10.0f));
    return OutlineH;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                            ROW
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordRow(const WorldEntry& Row, uint32_t Depth, bool HasBelow,
                                       bool AncestorHidden) noexcept
{
    const float RowH = Compact_ ? 30.0f : 36.0f;
    const float X0   = ImGui::GetWindowPos().x + 14.0f;
    const float X1   = ImGui::GetWindowPos().x + ImGui::GetWindowWidth() - 14.0f;

    ImGui::SetCursorScreenPos(ImVec2(X0, ImGui::GetCursorScreenPos().y));
    ImGui::PushID(Row.Id);
    ImGui::InvisibleButton("##row", ImVec2(X1 - X0, RowH));
    const bool Hover = ImGui::IsItemHovered();
    const bool Picked = std::strcmp(Picked_, Row.Id) == 0;
    if (ImGui::IsItemClicked(ImGuiMouseButton_Left))
    {
        std::snprintf(Picked_, sizeof(Picked_), "%s", Row.Id);
        OpenAbove(Row.Id);
    }
    if (Hover)
        ImGui::SetMouseCursor(ImGuiMouseCursor_Hand);
    if (ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left) && Hover && HasBelow)
        SetShut(Row.Id, !IsShut(Row.Id));

    const bool Dragging = ImGui::GetDragDropPayload() != nullptr;
    if (!Row.Anchored && ImGui::BeginDragDropSource(ImGuiDragDropFlags_None))
    {
        ImGui::SetDragDropPayload("CELOUTLINE_ROW", Row.Id,
                                  static_cast<size_t>(std::strlen(Row.Id)) + 1u);
        ImGui::Text("%s", Row.Label);
        ImGui::EndDragDropSource();
    }
    if (ImGui::BeginDragDropTarget())
    {
        if (const ImGuiPayload* Drop = ImGui::AcceptDragDropPayload("CELOUTLINE_ROW"))
        {
            const char* Dragged = static_cast<const char*>(Drop->Data);   // ImGuiPayload's own member
            const float RowTop  = ImGui::GetItemRectMin().y;
            const bool Before   = (ImGui::GetIO().MousePos.y - RowTop) < RowH * 0.28f;
            const int At = FindEntry(Dragged);
            const int Under = FindEntry(Row.Id);
            if (At >= 0 && Under >= 0 && At != Under)
            {
                const char* NewAbove = Before ? Entries_[static_cast<uint32_t>(Under)].AboveId
                                              : Entries_[static_cast<uint32_t>(Under)].Id;
                // A row cannot hang under itself or anything hanging under it.
                bool Cycle = false;
                const char* Cursor = NewAbove;
                for (uint32_t Guard = 0u; Guard < 32u && Cursor[0] != '\0'; ++Guard)
                {
                    if (std::strcmp(Cursor, Dragged) == 0)
                    {
                        Cycle = true;
                        break;
                    }
                    const int Next = FindEntry(Cursor);
                    Cursor = (Next >= 0) ? Entries_[static_cast<uint32_t>(Next)].AboveId : "";
                }
                if (!Cycle)
                {
                    std::snprintf(Entries_[static_cast<uint32_t>(At)].AboveId,
                                  sizeof(Entries_[static_cast<uint32_t>(At)].AboveId), "%s", NewAbove);
                    if (!Before)
                        SetShut(Row.Id, false);
                }
            }
        }
        ImGui::EndDragDropTarget();
    }

    ImDrawList* Draw = ImGui::GetWindowDrawList();
    const ImVec2 Min(X0, ImGui::GetItemRectMin().y);
    const ImVec2 Max(X1, Min.y + RowH);
    const ImU32 Accent = AccentOf(Row);

    if (Picked)
    {
        Draw->AddRectFilled(Min, Max, kSelBg, 11.0f);
        Draw->AddRect(Min, Max, kStroke2, 11.0f);
        Draw->AddRectFilled(ImVec2(Min.x, Min.y + 8.0f), ImVec2(Min.x + 3.0f, Max.y - 8.0f), Accent,
                            3.0f);
    }
    else if (Hover)
    {
        Draw->AddRectFilled(Min, Max, kG2, 11.0f);
    }
    if (Dragging && Hover)
    {
        const bool Before = (ImGui::GetIO().MousePos.y - Min.y) < RowH * 0.28f;
        if (Before)
            Draw->AddRectFilled(ImVec2(Min.x + 12.0f, Min.y - 1.0f), ImVec2(Max.x - 12.0f, Min.y + 1.0f),
                                kText, 2.0f);
        else
        {
            Draw->AddRectFilled(Min, Max, WithAlpha(Accent, 31), 11.0f);
            Draw->AddRect(Min, Max, Accent, 11.0f);
        }
    }

    const bool Dim = !Row.Folder && (!Row.Visible || AncestorHidden);
    const ImU32 Dimmed = Dim ? 102u : 255u;
    const float MidY = Min.y + RowH * 0.5f;
    const float Indent = Min.x + 8.0f + static_cast<float>(Depth) * 16.0f;

    // The chevron keeps its slot even with no below-rows (the reference's visibility:hidden).
    if (HasBelow && Icons_ != nullptr)
    {
        const bool Shut = IsShut(Row.Id) && Query_[0] == '\0';
        Icons_->DrawIcon(Draw, Shut ? "chev" : "chevdown", ImVec2(Indent, MidY - 5.5f), 11.0f, kT3);
    }
    ImGui::SetCursorScreenPos(ImVec2(Indent, MidY - 7.0f));
    ImGui::PushID("##chev");
    ImGui::InvisibleButton("##hit", ImVec2(14.0f, 14.0f));
    if (HasBelow && ImGui::IsItemClicked(ImGuiMouseButton_Left))
        SetShut(Row.Id, !IsShut(Row.Id));
    ImGui::PopID();

    // The glyph: the row's SVG in its accent, or the square thumbnail read as a moon dot.
    const float NicoX = Indent + 14.0f + 8.0f;
    if (Row.Thumb != static_cast<ImTextureID>(0))
    {
        Draw->AddImageRounded(Row.Thumb, ImVec2(NicoX + 5.0f, MidY - 7.0f),
                              ImVec2(NicoX + 19.0f, MidY + 7.0f), ImVec2(0.0f, 0.0f), ImVec2(1.0f, 1.0f),
                              IM_COL32(255, 255, 255, Dimmed), 7.0f);
    }
    else if (Icons_ != nullptr && Row.Icon[0] != '\0')
    {
        Icons_->DrawIcon(Draw, Row.Icon, ImVec2(NicoX + 5.0f, MidY - 7.0f), 14.0f,
                         WithAlpha(Accent, static_cast<uint8_t>(Dimmed)));
    }

    // The right-hand cluster: eye, standing pip, and (past compact) the meta line.
    const float EyeR  = Max.x - 6.0f;
    const float EyeL  = EyeR - 24.0f;
    const float StatR = EyeL - 8.0f;
    const float StatL = StatR - 16.0f;
    ImFont* Meta = Fonts_.Mono11 != nullptr ? Fonts_.Mono11 : ImGui::GetFont();
    float MetaW = 0.0f;
    if (!Compact_ && Row.Meta[0] != '\0')
        MetaW = Meta->CalcTextSizeA(Meta->LegacySize, FLT_MAX, 0.0f, Row.Meta).x;
    const float MetaR = StatL - 8.0f;
    const float MetaL = MetaR - MetaW;

    ImFont* Name = Row.Folder
        ? (Fonts_.Outfit11 != nullptr ? Fonts_.Outfit11 : ImGui::GetFont())
        : (Fonts_.Outfit13 != nullptr ? Fonts_.Outfit13 : ImGui::GetFont());
    const float NameX = NicoX + 24.0f + 8.0f;
    float TagW = 0.0f;
    if (Row.Tag[0] != '\0')
    {
        ImFont* Tag = Fonts_.Outfit9 != nullptr ? Fonts_.Outfit9 : ImGui::GetFont();
        TagW = 8.0f + 6.0f + MeasureSpaced(Tag, Row.Tag, 0.7f) + 6.0f;
    }
    const float NameAvail = MetaL - 8.0f - TagW - NameX;
    float NameDrawnW = 0.0f;
    if (Row.Folder)
    {
        char Upper[48] = {};
        UpperCopy(Upper, sizeof(Upper), Row.Label);
        const float LabelW = MeasureSpaced(Name, Upper, 1.1f);
        if (LabelW <= NameAvail)
        {
            DrawSpaced(Draw, Name, ImVec2(NameX, MidY - Name->LegacySize * 0.5f), kT3, Upper, 1.1f);
            NameDrawnW = LabelW;
        }
        else
        {
            DrawEllipsized(Draw, Name, ImVec2(NameX, MidY - Name->LegacySize * 0.5f), kT3, Upper,
                           NameAvail);
            NameDrawnW = NameAvail > 0.0f ? NameAvail : 0.0f;
        }
    }
    else
    {
        const float FullW = Name->CalcTextSizeA(Name->LegacySize, FLT_MAX, 0.0f, Row.Label).x;
        DrawEllipsized(Draw, Name, ImVec2(NameX, MidY - Name->LegacySize * 0.5f),
                       WithAlpha(Hover || Picked ? kText : kT2, static_cast<uint8_t>(Dimmed)),
                       Row.Label, NameAvail > 0.0f ? NameAvail : 0.0f);
        NameDrawnW = FullW < NameAvail ? FullW : (NameAvail > 0.0f ? NameAvail : 0.0f);
    }
    if (Row.Tag[0] != '\0' && TagW > 0.0f)
    {
        ImFont* Tag = Fonts_.Outfit9 != nullptr ? Fonts_.Outfit9 : ImGui::GetFont();
        const float TagL = NameX + NameDrawnW + 8.0f;
        const float TagH = Tag->LegacySize + 2.0f;
        Draw->AddRect(ImVec2(TagL, MidY - TagH * 0.5f), ImVec2(TagL + TagW - 8.0f, MidY + TagH * 0.5f),
                      kStroke, TagH * 0.5f);
        DrawSpaced(Draw, Tag, ImVec2(TagL + 6.0f, MidY - Tag->LegacySize * 0.5f), kT3, Row.Tag, 0.7f);
    }
    if (MetaW > 0.0f)
        Draw->AddText(Meta, Meta->LegacySize, ImVec2(MetaL, MidY - Meta->LegacySize * 0.5f), kT3,
                      Row.Meta);

    const WorldEntryStanding Standing = EffectiveStanding(Row);
    const ImVec2 PipC(StatL + 8.0f, MidY);
    ImU32 PipBg = kG3;
    ImU32 GlyphTint = kT3;
    const char* Glyph = "dot";
    if (Standing == WorldEntryStanding::Seated)
    {
        PipBg = kGreen;
        GlyphTint = kDarkOnGreen;
        Glyph = "check";
    }
    else if (Standing == WorldEntryStanding::Advisory)
    {
        PipBg = IM_COL32(255, 180, 84, 41);
        GlyphTint = kOrange;
        Glyph = "warn";
    }
    else if (Standing == WorldEntryStanding::Retired)
    {
        PipBg = IM_COL32(255, 80, 80, 41);
        GlyphTint = kRed;
        Glyph = "warn";
    }
    else
    {
        PipBg = IM_COL32(255, 255, 255, 20);
        GlyphTint = kT3;
        Glyph = "dot";
    }
    Draw->AddCircleFilled(PipC, 8.0f, PipBg);
    if (Icons_ != nullptr)
        Icons_->DrawIcon(Draw, Glyph, ImVec2(PipC.x - 5.5f, PipC.y - 5.5f), 11.0f, GlyphTint);

    // The eye reads only on hover, on pick, or while off — but stays clickable throughout.
    if (Row.EyeShown)
    {
        ImGui::SetCursorScreenPos(ImVec2(EyeL, MidY - 12.0f));
        ImGui::PushID("##eye");
        ImGui::InvisibleButton("##hit", ImVec2(24.0f, 24.0f));
        if (ImGui::IsItemClicked(ImGuiMouseButton_Left))
        {
            const int At = FindEntry(Row.Id);
            if (At >= 0)
                Entries_[static_cast<uint32_t>(At)].Visible = !Entries_[static_cast<uint32_t>(At)].Visible;
        }
        ImGui::PopID();
        if ((Hover || Picked || !Row.Visible) && Icons_ != nullptr)
            Icons_->DrawIcon(Draw, Row.Visible ? "eye" : "eyeoff", ImVec2(EyeL + 5.5f, MidY - 6.5f),
                             13.0f, Row.Visible ? kT3 : kRed);
    }

    ImGui::PopID();
    ImGui::SetCursorScreenPos(ImVec2(X0, Max.y));
}

//------------------------------------------------------------------------------------------------------------------------
//                                                          FOOTER
//------------------------------------------------------------------------------------------------------------------------

void CelestialOutlinerPanel::RecordFooter(float PlateW) noexcept
{
    const float X0 = ImGui::GetCursorScreenPos().x;
    const float Y0 = ImGui::GetCursorScreenPos().y;
    const uint32_t Cols = Compact_ ? 2u : 4u;
    const uint32_t Rows = (5u + Cols - 1u) / Cols;
    const float FootH = 1.0f + 10.0f + static_cast<float>(Rows) * 48.0f
        + static_cast<float>(Rows - 1u) * 4.0f + 12.0f;

    ImGui::Dummy(ImVec2(PlateW, FootH));
    ImDrawList* Draw = ImGui::GetWindowDrawList();
    Draw->AddLine(ImVec2(X0, Y0 + 0.5f), ImVec2(X0 + PlateW, Y0 + 0.5f), kStroke);

    ImFont* Label = Fonts_.Outfit9 != nullptr ? Fonts_.Outfit9 : ImGui::GetFont();
    ImFont* Numeral = Fonts_.Mono14 != nullptr ? Fonts_.Mono14 : ImGui::GetFont();
    ImFont* Qualifier = Fonts_.Mono10 != nullptr ? Fonts_.Mono10 : ImGui::GetFont();

    const char* Captions[5] = { "Realtime", "Quality", "Sun", "Moons", "Cam" };
    const char* Figures[5]  = { Footer_.Fps, Footer_.Quality, Footer_.Sun, Footer_.Moons, Footer_.Cam };
    const char* Notes[5]    = { "fps", "", "", "/ 4", "" };
    const float ColW = (PlateW - 32.0f - static_cast<float>(Cols - 1u) * 4.0f) / static_cast<float>(Cols);

    for (uint32_t F = 0u; F < 5u; ++F)
    {
        const uint32_t C = F % Cols;
        const uint32_t R = F / Cols;
        const float Ix = X0 + 16.0f + static_cast<float>(C) * (ColW + 4.0f);
        const float Iy = Y0 + 1.0f + 10.0f + static_cast<float>(R) * (48.0f + 4.0f);
        char Upper[24] = {};
        UpperCopy(Upper, sizeof(Upper), Captions[F]);
        DrawSpaced(Draw, Label, ImVec2(Ix, Iy), kT3, Upper, 0.9f);
        DrawEllipsized(Draw, Numeral, ImVec2(Ix, Iy + 12.0f + 1.0f), kText, Figures[F], ColW);
        if (Notes[F][0] != '\0')
            Draw->AddText(Qualifier, Qualifier->LegacySize, ImVec2(Ix, Iy + 12.0f + 1.0f + 19.0f + 1.0f),
                          kT3, Notes[F]);
    }
}

} // namespace Frontier
