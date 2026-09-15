//============================================================================================================================================
//                                                  CELESTIALEDITORHOST.CPP
//============================================================================================================================================
// 🧩 The development editor's celestial host — the two-column dock over the outline and the view. Without
//    FRONTIER_DEVELOPMENT the whole host compiles to mute husks: Record draws nothing, the queries answer
//    idle figures, and the game renders fullscreen.

#include "CelestialEditorHost.h"

#include <imgui.h>
#include <imgui_internal.h>   // DockBuilder: the two-column seating

#include <cstdio>
#include <cstring>

namespace Frontier {

CelestialEditorHost::CelestialEditorHost() noexcept
{
    Outliner_.AssignIcons(&Icons_);
    Viewport_.AssignControls(&Controls_);
}

//============================================================================================================================================
//                                                        APPLY THEME
//============================================================================================================================================

void CelestialEditorHost::ApplyTheme() noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    ImGuiStyle& Applied = ImGui::GetStyle();

    // Trapezoid sheet (Patches A/B/C, the repo's dock idiom): the stacked-tab figures, so tabbed panels
    //    read like the rest of the engine's dockspace.
    Applied.TabSlant         = 14.0f;
    Applied.TabOverlap       = 24.0f;
    Applied.TabHeight        = 24.0f;
    Applied.TabStripPadTop   = 4.0f;
    Applied.TabMinWidthBase  = 170.0f;
    Applied.TabMinWidthShrink = 170.0f;
    Applied.TabRounding      = 0.0f;
    Applied.TabBorderSize    = 0.0f;
    Applied.TabBarBorderSize = 0.0f;
    Applied.TabButtonRounding = 1.0f;

    // Geometry tokens: the reference's glass plate (28px) for the outliner, pills for fields.
    Applied.WindowPadding      = ImVec2(14.0f, 12.0f);
    Applied.FramePadding       = ImVec2(13.0f, 9.0f);
    Applied.ItemSpacing        = ImVec2(10.0f, 8.0f);
    Applied.ItemInnerSpacing   = ImVec2(6.0f, 4.0f);
    Applied.ScrollbarSize      = 8.0f;
    Applied.WindowRounding     = 8.0f;
    Applied.ChildRounding      = 12.0f;
    Applied.FrameRounding      = 16.0f;
    Applied.PopupRounding      = 18.0f;
    Applied.ScrollbarRounding  = 9.0f;
    Applied.GrabRounding       = 12.0f;
    Applied.WindowBorderSize   = 1.0f;
    Applied.ChildBorderSize    = 0.0f;
    Applied.FrameBorderSize    = 1.0f;
    Applied.PopupBorderSize    = 1.0f;

    // Colour tokens: the reference's :root palette, spoken as style entries. The outliner window seats
    //    its own glass plate per-window; these carry the viewport, the dock strip, and every widget.
    ImVec4* Tints = Applied.Colors;
    Tints[ImGuiCol_Text]                  = ImVec4(1.00f, 1.00f, 1.00f, 0.94f);
    Tints[ImGuiCol_TextDisabled]          = ImVec4(1.00f, 1.00f, 1.00f, 0.32f);
    Tints[ImGuiCol_WindowBg]              = ImVec4(0.055f, 0.059f, 0.066f, 1.00f);   // #0e0f11, opaque
    Tints[ImGuiCol_ChildBg]               = ImVec4(0.000f, 0.000f, 0.000f, 0.00f);
    Tints[ImGuiCol_PopupBg]               = ImVec4(0.039f, 0.043f, 0.051f, 0.96f);   // the .96 menus
    Tints[ImGuiCol_Border]                = ImVec4(1.000f, 1.000f, 1.00f, 0.07f);
    Tints[ImGuiCol_BorderShadow]          = ImVec4(0.000f, 0.000f, 0.000f, 0.00f);
    Tints[ImGuiCol_FrameBg]               = ImVec4(1.000f, 1.000f, 1.000f, 0.045f);
    Tints[ImGuiCol_FrameBgHovered]        = ImVec4(1.000f, 1.000f, 1.000f, 0.08f);
    Tints[ImGuiCol_FrameBgActive]         = ImVec4(1.000f, 1.000f, 1.000f, 0.08f);
    Tints[ImGuiCol_TitleBg]               = ImVec4(0.055f, 0.059f, 0.066f, 1.00f);
    Tints[ImGuiCol_TitleBgActive]         = ImVec4(0.055f, 0.059f, 0.066f, 1.00f);
    Tints[ImGuiCol_TitleBgCollapsed]      = ImVec4(0.055f, 0.059f, 0.066f, 1.00f);
    Tints[ImGuiCol_MenuBarBg]             = ImVec4(0.055f, 0.059f, 0.066f, 1.00f);
    Tints[ImGuiCol_ScrollbarBg]           = ImVec4(0.000f, 0.000f, 0.000f, 0.00f);
    Tints[ImGuiCol_ScrollbarGrab]         = ImVec4(1.000f, 1.000f, 1.000f, 0.08f);
    Tints[ImGuiCol_ScrollbarGrabHovered]  = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_ScrollbarGrabActive]   = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_CheckMark]             = ImVec4(1.000f, 1.000f, 1.000f, 0.94f);
    Tints[ImGuiCol_SliderGrab]            = ImVec4(1.000f, 1.000f, 1.000f, 0.85f);
    Tints[ImGuiCol_SliderGrabActive]      = ImVec4(1.000f, 1.000f, 1.000f, 1.00f);
    Tints[ImGuiCol_Button]                = ImVec4(1.000f, 1.000f, 1.000f, 0.045f);
    Tints[ImGuiCol_ButtonHovered]         = ImVec4(1.000f, 1.000f, 1.000f, 0.08f);
    Tints[ImGuiCol_ButtonActive]          = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_Header]                = ImVec4(1.000f, 1.000f, 1.000f, 0.09f);
    Tints[ImGuiCol_HeaderHovered]         = ImVec4(1.000f, 1.000f, 1.000f, 0.045f);
    Tints[ImGuiCol_HeaderActive]          = ImVec4(1.000f, 1.000f, 1.000f, 0.09f);
    Tints[ImGuiCol_Separator]             = ImVec4(1.000f, 1.000f, 1.000f, 0.07f);
    Tints[ImGuiCol_SeparatorHovered]      = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_SeparatorActive]       = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_ResizeGrip]            = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_ResizeGripHovered]     = ImVec4(1.000f, 1.000f, 1.000f, 0.32f);
    Tints[ImGuiCol_ResizeGripActive]      = ImVec4(1.000f, 1.000f, 1.000f, 0.56f);
    Tints[ImGuiCol_Tab]                   = ImVec4(1.000f, 1.000f, 1.000f, 0.045f);
    Tints[ImGuiCol_TabHovered]            = ImVec4(1.000f, 1.000f, 1.000f, 0.08f);
    Tints[ImGuiCol_TabActive]             = ImVec4(1.000f, 1.000f, 1.000f, 0.09f);
    Tints[ImGuiCol_TabUnfocused]          = ImVec4(1.000f, 1.000f, 1.000f, 0.045f);
    Tints[ImGuiCol_TabUnfocusedActive]    = ImVec4(1.000f, 1.000f, 1.000f, 0.09f);
    Tints[ImGuiCol_DockingPreview]        = ImVec4(1.000f, 1.000f, 1.000f, 0.13f);
    Tints[ImGuiCol_DockingEmptyBg]        = ImVec4(0.000f, 0.000f, 0.000f, 0.00f);

    if (FontsSeated_)
        return;
    FontsSeated_ = true;

    // The twelve outline faces: Outfit Light in the reference's text sizes, JetBrains Mono in its
    //    numeral sizes. The ellipsis joins the Latin range for the trimmed names.
    ImGuiIO& IO = ImGui::GetIO();
    static const ImWchar kRanges[] = { 0x0020, 0x00FF, 0x2026, 0x2026, 0 };
    const char* kOutfit = "EngineContent/FontArchives/Outfit/Outfit-Light.ttf";
    const char* kMono   = "EngineContent/FontArchives/JetBrainsMono/JetBrainsMono-Regular.ttf";
    CelestialOutlinerFonts Seated{};
    Seated.Outfit9  = IO.Fonts->AddFontFromFileTTF(kOutfit, 9.0f, nullptr, kRanges);
    Seated.Outfit11 = IO.Fonts->AddFontFromFileTTF(kOutfit, 11.0f, nullptr, kRanges);
    Seated.Outfit12 = IO.Fonts->AddFontFromFileTTF(kOutfit, 12.0f, nullptr, kRanges);
    Seated.Outfit13 = IO.Fonts->AddFontFromFileTTF(kOutfit, 13.0f, nullptr, kRanges);
    Seated.Outfit16 = IO.Fonts->AddFontFromFileTTF(kOutfit, 16.0f, nullptr, kRanges);
    Seated.Outfit20 = IO.Fonts->AddFontFromFileTTF(kOutfit, 20.0f, nullptr, kRanges);
    Seated.Mono10   = IO.Fonts->AddFontFromFileTTF(kMono, 10.0f, nullptr, kRanges);
    Seated.Mono11   = IO.Fonts->AddFontFromFileTTF(kMono, 11.0f, nullptr, kRanges);
    Seated.Mono14   = IO.Fonts->AddFontFromFileTTF(kMono, 14.0f, nullptr, kRanges);
    Seated.Mono16   = IO.Fonts->AddFontFromFileTTF(kMono, 16.0f, nullptr, kRanges);
    Seated.Mono22   = IO.Fonts->AddFontFromFileTTF(kMono, 22.0f, nullptr, kRanges);
    Seated.Mono30   = IO.Fonts->AddFontFromFileTTF(kMono, 30.0f, nullptr, kRanges);
    FontCount_ = 0;
    const ImFont* Faces[12] = { Seated.Outfit9, Seated.Outfit11, Seated.Outfit12, Seated.Outfit13,
                                Seated.Outfit16, Seated.Outfit20, Seated.Mono10, Seated.Mono11,
                                Seated.Mono14, Seated.Mono16, Seated.Mono22, Seated.Mono30 };
    for (const ImFont* Face : Faces)
    {
        if (Face != nullptr)
            ++FontCount_;
    }
    if (FontCount_ < 12)
    {
        // A missing archive must read, not crash: the default face stands in for every absent one.
        ImFont* Fallback = IO.Fonts->AddFontDefault();
        if (Seated.Outfit9 == nullptr)
            Seated.Outfit9 = Fallback;
        if (Seated.Outfit11 == nullptr)
            Seated.Outfit11 = Fallback;
        if (Seated.Outfit12 == nullptr)
            Seated.Outfit12 = Fallback;
        if (Seated.Outfit13 == nullptr)
            Seated.Outfit13 = Fallback;
        if (Seated.Outfit16 == nullptr)
            Seated.Outfit16 = Fallback;
        if (Seated.Outfit20 == nullptr)
            Seated.Outfit20 = Fallback;
        if (Seated.Mono10 == nullptr)
            Seated.Mono10 = Fallback;
        if (Seated.Mono11 == nullptr)
            Seated.Mono11 = Fallback;
        if (Seated.Mono14 == nullptr)
            Seated.Mono14 = Fallback;
        if (Seated.Mono16 == nullptr)
            Seated.Mono16 = Fallback;
        if (Seated.Mono22 == nullptr)
            Seated.Mono22 = Fallback;
        if (Seated.Mono30 == nullptr)
            Seated.Mono30 = Fallback;
    }
    Outliner_.AssignFonts(Seated);
    Controls_.AssignFonts(Seated.Outfit13, Seated.Outfit11, Seated.Mono11, Seated.Mono10,
                          Seated.Outfit20, Seated.Mono30);

    if (!Icons_.Seat("Engine/Editor/Icons"))
    {
        // The outline draws iconless rather than wrong; the proof gates the seating instead.
    }
#else
    (void)0;
#endif
}

//============================================================================================================================================
//                                                           FEED
//============================================================================================================================================

void CelestialEditorHost::RegisterWorldEntry(const WorldEntry& Entry) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    if (StagedEntryCount_ < kMaxWorldEntries)
        StagedEntries_[StagedEntryCount_++] = Entry;
#else
    (void)Entry;
#endif
}

void CelestialEditorHost::RegisterPill(const WorldEntryPill& Pill) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    if (StagedPillCount_ < kMaxOutlinerPills)
        StagedPills_[StagedPillCount_++] = Pill;
#else
    (void)Pill;
#endif
}

void CelestialEditorHost::AssignFooter(const OutlinerFooterFigures& Footer) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    StagedFooter_       = Footer;
    StagedFooterSeated_ = true;
#else
    (void)Footer;
#endif
}

void CelestialEditorHost::AssignScenePillBit(uint32_t Bit) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    ScenePillBit_ = Bit;
#else
    (void)Bit;
#endif
}

void CelestialEditorHost::AdaptSceneRow(const EditorInstance* Instances, uint32_t Index) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    const EditorInstance& Row = Instances[Index];
    WorldEntry Entry{};
    std::snprintf(Entry.Id, sizeof(Entry.Id), "scene#%u", Index);
    std::snprintf(Entry.Label, sizeof(Entry.Label), "%s", Row.Label);
    const char* Icon = "cube";
    if (Row.Category == EditorInstanceCategory::Folder)
        Icon = "folder";
    else if (Row.Category == EditorInstanceCategory::Light)
        Icon = "light";
    else if (Row.Category == EditorInstanceCategory::Camera)
        Icon = "camera";
    std::snprintf(Entry.Icon, sizeof(Entry.Icon), "%s", Icon);
    Entry.Accent[0] = Row.Tint[0];
    Entry.Accent[1] = Row.Tint[1];
    Entry.Accent[2] = Row.Tint[2];
    if (Row.Dynamic)
        std::snprintf(Entry.Tag, sizeof(Entry.Tag), "DYN");
    else if (Row.Physics)
        std::snprintf(Entry.Tag, sizeof(Entry.Tag), "PHYS");
    Entry.Standing = WorldEntryStanding::Seated;
    if (Row.Locked)
        Entry.Standing = WorldEntryStanding::Lifted;
    else if (Row.Solo)
        Entry.Standing = WorldEntryStanding::Advisory;
    Entry.Visible  = Row.Visible;
    Entry.Folder   = Row.Category == EditorInstanceCategory::Folder;
    Entry.EyeShown = true;
    Entry.Anchored = false;
    Entry.AboveId[0] = '\0';
    for (uint32_t J = Index; J > 0u; --J)
    {
        if (Instances[J - 1u].Depth < Row.Depth)
        {
            std::snprintf(Entry.AboveId, sizeof(Entry.AboveId), "scene#%u", J - 1u);
            break;
        }
    }
    Entry.PillBits = ScenePillBit_;
    Entry.Thumb    = static_cast<ImTextureID>(0);
    Outliner_.RegisterWorldEntry(Entry);
#else
    (void)Instances;
    (void)Index;
#endif
}

//============================================================================================================================================
//                                                          RECORD
//============================================================================================================================================

void CelestialEditorHost::ConstructLayout() noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    const ImGuiID DockId = ImGui::GetID("CelestialDockSpace");
    if (ImGui::DockBuilderGetNode(DockId) != nullptr)
        return;

    ImGuiViewport* Main = ImGui::GetMainViewport();
    ImGui::DockBuilderRemoveNode(DockId);
    ImGui::DockBuilderAddNode(DockId, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(DockId, Main->Size);

    // The outliner reads the reference's plate width at any frame size (316px open, 236px
    //    compact); the view keeps the rest.
    SeatedCompact_ = Outliner_.QueryCompact();
    const float PlatePx = SeatedCompact_ ? 236.0f : 316.0f;
    float Share = Main->Size.x > 1.0f ? PlatePx / Main->Size.x : 0.23f;
    if (Share < 0.10f)
        Share = 0.10f;
    if (Share > 0.50f)
        Share = 0.50f;
    ImGuiID Left = 0u, Centre = 0u;
    ImGui::DockBuilderSplitNode(DockId, ImGuiDir_Left, Share, &Left, &Centre);

    ImGui::DockBuilderDockWindow("Outliner", Left);
    ImGui::DockBuilderDockWindow("Viewport", Centre);
    ImGui::DockBuilderFinish(DockId);
#endif
}

void CelestialEditorHost::RebuildLayoutForCompact(bool Compact) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    const ImGuiID DockId = ImGui::GetID("CelestialDockSpace");
    ImGuiViewport* Main = ImGui::GetMainViewport();
    ImGui::DockBuilderRemoveNode(DockId);
    ImGui::DockBuilderAddNode(DockId, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(DockId, Main->Size);

    const float PlatePx = Compact ? 236.0f : 316.0f;
    float Share = Main->Size.x > 1.0f ? PlatePx / Main->Size.x : 0.23f;
    if (Share < 0.10f)
        Share = 0.10f;
    if (Share > 0.50f)
        Share = 0.50f;
    ImGuiID Left = 0u, Centre = 0u;
    ImGui::DockBuilderSplitNode(DockId, ImGuiDir_Left, Share, &Left, &Centre);

    ImGui::DockBuilderDockWindow("Outliner", Left);
    ImGui::DockBuilderDockWindow("Viewport", Centre);
    ImGui::DockBuilderFinish(DockId);
    SeatedCompact_ = Compact;
#else
    (void)Compact;
#endif
}

void CelestialEditorHost::Record(EditorInstance* Instances, uint32_t InstanceCount,
                                 EditorSheet* PickedSheet) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    (void)PickedSheet;   // the two-panel editor seats no inspector; the pick still poses the sheet upstream
    ImGuiViewport* Main = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(Main->Pos);
    ImGui::SetNextWindowSize(Main->Size);

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0f);

    constexpr ImGuiWindowFlags Bare = ImGuiWindowFlags_NoTitleBar
                                    | ImGuiWindowFlags_NoResize
                                    | ImGuiWindowFlags_NoMove
                                    | ImGuiWindowFlags_NoScrollbar
                                    | ImGuiWindowFlags_NoScrollWithMouse
                                    | ImGuiWindowFlags_NoSavedSettings
                                    | ImGuiWindowFlags_NoBringToFrontOnFocus
                                    | ImGuiWindowFlags_NoNavFocus
                                    | ImGuiWindowFlags_NoBackground
                                    | ImGuiWindowFlags_NoDocking;

    if (ImGui::Begin("CelestialDockHost", nullptr, Bare))
    {
        const ImGuiDockNodeFlags NodeFlags =
              static_cast<ImGuiDockNodeFlags>(ImGuiDockNodeFlags_NoWindowMenuButton)
            | static_cast<ImGuiDockNodeFlags>(ImGuiDockNodeFlags_NoCloseButton);
        if (ImGui::DockBuilderGetNode(ImGui::GetID("CelestialDockSpace")) == nullptr)
            ConstructLayout();
        else if (Outliner_.QueryCompact() != SeatedCompact_)
            RebuildLayoutForCompact(Outliner_.QueryCompact());
        // Otherwise the seating rests, so a dragged rearrangement survives.
        ImGui::DockSpace(ImGui::GetID("CelestialDockSpace"), ImVec2(0.0f, 0.0f), NodeFlags);
    }
    ImGui::End();
    ImGui::PopStyleVar(3);

    // The outline's tick: the scene roster adapts first, the staged project rows join it, then the
    //    two panels draw. Staged rows empty every tick, so a feed that rests leaves no ghosts.
    if (InstanceCount > kMaxEditorInstances)
        InstanceCount = kMaxEditorInstances;
    if (Instances != nullptr)
    {
        for (uint32_t I = 0u; I < InstanceCount; ++I)
            AdaptSceneRow(Instances, I);
    }
    for (uint32_t P = 0u; P < StagedPillCount_; ++P)
        Outliner_.RegisterPill(StagedPills_[P]);
    for (uint32_t I = 0u; I < StagedEntryCount_; ++I)
        Outliner_.RegisterWorldEntry(StagedEntries_[I]);
    if (StagedFooterSeated_)
        Outliner_.AssignFooter(StagedFooter_);
    StagedEntryCount_   = 0u;
    StagedPillCount_    = 0u;
    StagedFooterSeated_ = false;

    Outliner_.Record();
    Viewport_.Record(Instances, InstanceCount);
#else
    (void)Instances;
    (void)InstanceCount;
    (void)PickedSheet;
#endif
}

//============================================================================================================================================
//                                                           SEAMS
//============================================================================================================================================

void CelestialEditorHost::AssignView(const unsigned char* Rgba, uint32_t Width,
                                     uint32_t Height) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Viewport_.AssignView(Rgba, Width, Height);
#else
    (void)Rgba;
    (void)Width;
    (void)Height;
#endif
}

void CelestialEditorHost::AssignViewTexture(ImTextureID View, uint32_t Width, uint32_t Height) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Viewport_.AssignViewTexture(View, Width, Height);
#else
    (void)View;
    (void)Width;
    (void)Height;
#endif
}

float CelestialEditorHost::QueryViewWidth() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Viewport_.QueryViewWidth();
#else
    return 0.0f;
#endif
}

float CelestialEditorHost::QueryViewHeight() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Viewport_.QueryViewHeight();
#else
    return 0.0f;
#endif
}

const unsigned char* CelestialEditorHost::QueryIconSheetRgba() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Icons_.QuerySheetRgba();
#else
    return nullptr;
#endif
}

uint32_t CelestialEditorHost::QueryIconSheetWidth() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Icons_.QuerySheetWidth();
#else
    return 0u;
#endif
}

uint32_t CelestialEditorHost::QueryIconSheetHeight() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Icons_.QuerySheetHeight();
#else
    return 0u;
#endif
}

void CelestialEditorHost::AssignIconSheetTexture(ImTextureID Id) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Icons_.AssignSheetTexture(Id);
#else
    (void)Id;
#endif
}

uint32_t CelestialEditorHost::QueryPickedInstance() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    const char* Picked = Outliner_.QueryPicked();
    if (std::strncmp(Picked, "scene#", 6) != 0)
        return kNoEditorInstance;
    unsigned int Index = 0u;
    if (std::sscanf(Picked + 6, "%u", &Index) != 1 || Index >= kMaxEditorInstances)
        return kNoEditorInstance;
    return static_cast<uint32_t>(Index);
#else
    return kNoEditorInstance;
#endif
}

const char* CelestialEditorHost::QueryPickedEntry() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Outliner_.QueryPicked();
#else
    return "";
#endif
}

void CelestialEditorHost::PickInstance(uint32_t Index) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    char Id[40] = {};
    std::snprintf(Id, sizeof(Id), "scene#%u", Index);
    Outliner_.PickEntry(Id);
#else
    (void)Index;
#endif
}

void CelestialEditorHost::PickEntry(const char* Id) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Outliner_.PickEntry(Id);
#else
    (void)Id;
#endif
}

void CelestialEditorHost::AssignSearch(const char* Text) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Outliner_.AssignSearch(Text);
#else
    (void)Text;
#endif
}

void CelestialEditorHost::TogglePill(const char* Id) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Outliner_.TogglePill(Id);
#else
    (void)Id;
#endif
}

void CelestialEditorHost::ToggleCompact() noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Outliner_.ToggleCompact();
#else
    (void)0;
#endif
}

bool CelestialEditorHost::QueryCompact() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Outliner_.QueryCompact();
#else
    return false;
#endif
}

void CelestialEditorHost::AssignOutlineScroll(float Y) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Outliner_.AssignScroll(Y);
#else
    (void)Y;
#endif
}

uint32_t CelestialEditorHost::QueryOutlineEntryCount() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Outliner_.QueryEntryCount();
#else
    return 0u;
#endif
}

uint32_t CelestialEditorHost::QueryOutlineEntryAt(uint32_t Slot, const WorldEntry** Entry) const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Outliner_.QueryRegisteredAt(Slot, Entry);
#else
    (void)Slot;
    if (Entry != nullptr)
        *Entry = nullptr;
    return kNoWorldEntry;
#endif
}

void CelestialEditorHost::SeatViewportOrbit(const ViewportOrbit& Seated) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Viewport_.SeatViewportOrbit(Seated);
#else
    (void)Seated;
#endif
}

const ViewportOrbit& CelestialEditorHost::QueryViewportOrbit() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return Viewport_.QueryViewportOrbit();
#else
    static const ViewportOrbit kIdle{};
    return kIdle;
#endif
}

int CelestialEditorHost::QueryFontCount() const noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    return FontCount_;
#else
    return 0;
#endif
}

} // namespace Frontier