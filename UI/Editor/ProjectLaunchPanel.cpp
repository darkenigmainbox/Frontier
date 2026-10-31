/*====================================================================================================================================
                                                        PROJECTLAUNCHPANEL.CPP
====================================================================================================================================*/
// 🧩 Project browser step: real decoded projects on the left, the application that opens the chosen one on the right.

#include "UI/Editor/ProjectLaunchPanel.h"

#include <imgui.h>

#include <algorithm>
#include <array>
#include <cstdio>
#include <cstring>

namespace Frontier
{

namespace
{

ImVec4 Colour(ColorQuad Value)
{
    return ImVec4(Value.Red, Value.Green, Value.Blue, Value.Alpha);
}

ImU32 Packed(ColorQuad Value)
{
    return ImGui::ColorConvertFloat4ToU32(Colour(Value));
}

// 📝 Text rows the launch step shows per card: the descriptor facts a project owns, never a guessed summary.
void ProjectFacts(const ProjectDescriptor &Descriptor, char *Line, size_t Extent)
{
    std::snprintf(Line, Extent, "%s  ·  %zu log categories  ·  %s",
                  Descriptor.OpeningScene.empty() ? "blank workspace" : Descriptor.OpeningScene.c_str(),
                  Descriptor.LogCategories.size(), Descriptor.ContentLocation.c_str());
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                                    PUBLIC FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

ProjectLaunchPanel::ProjectLaunchPanel(ProjectLaunchSelection &Selection)
    : Selection(Selection)
    , Colours(ControlKit::Palette())
{
}

void ProjectLaunchPanel::ConstructInterface()
{
    const ImGuiViewport *Viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(Viewport->WorkPos);
    ImGui::SetNextWindowSize(Viewport->WorkSize);
    ImGui::SetNextWindowViewport(Viewport->ID);
    ImGui::PushStyleColor(ImGuiCol_WindowBg, Colour(Colours.Field));
    ImGui::PushStyleColor(ImGuiCol_ChildBg, Colour(Colours.Panel));
    ImGui::PushStyleColor(ImGuiCol_Text, Colour(Colours.Text));
    ImGui::PushStyleColor(ImGuiCol_TextDisabled, Colour(Colours.TextFaint));
    ImGui::PushStyleColor(ImGuiCol_Separator, Colour(Colours.Divider));
    ImGui::PushStyleColor(ImGuiCol_Button, Colour(Colours.Raised));
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, Colour(Colours.Selected));
    ImGui::PushStyleColor(ImGuiCol_ButtonActive, Colour(Colours.Selected));
    ImGui::PushStyleColor(ImGuiCol_Border, Colour(Colours.StrokeStrong));
    ImGui::PushStyleColor(ImGuiCol_FrameBg, Colour(Colours.Inset));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0);

    constexpr auto Options = ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                             ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoDocking;
    if (ImGui::Begin("Project browser", nullptr, Options))
    {
        const float Scale = ImGui::GetStyle().FontScaleDpi;
        const float Width = ImGui::GetContentRegionAvail().x / std::max(0.01f, Scale);
        ConstructHeader(Width);

        const float FooterHeight = 62.0f * Scale;
        const float BodyHeight   = ImGui::GetContentRegionAvail().y - FooterHeight;
        const float RailWidth    = 268.0f * Scale;   // [px] right application column
        const float Gutter       = 18.0f * Scale;    // [px] between the two columns

        // 📝 Both columns are sized from the live content region so the last one stops at the window edge; the
        //    application rail takes whatever the project column leaves rather than a guessed total width.
        ImGui::Indent(24.0f * Scale);
        const float Available = ImGui::GetContentRegionAvail().x;
        ImGui::BeginChild("##projects", ImVec2(std::max(240.0f * Scale, Available - RailWidth - Gutter), BodyHeight),
                          ImGuiChildFlags_None);
        const float CardWidth  = (ImGui::GetContentRegionAvail().x - 12.0f * Scale) * 0.5f;   // [px] two per row
        const float CardHeight = 96.0f * Scale;                                              // [px]
        for (size_t Index = 0; Index < Selection.QueryListing().Entries.size(); ++Index)
        {
            if (Index % 2 != 0)
            {
                ImGui::SameLine(0.0f, 12.0f * Scale);
            }
            ConstructProjectCard(Index, CardWidth, CardHeight);
        }
        if (Selection.QueryListing().Entries.empty())
        {
            ImGui::TextDisabled("No decodable project descriptor in %s",
                                Selection.QueryProjectsDirectory().string().c_str());
        }
        for (const std::string &Diagnostic : Selection.QueryListing().Diagnostics)
        {
            ImGui::TextColored(Colour(Colours.Warning), "skipped: %s", Diagnostic.c_str());
        }
        ImGui::EndChild();

        // ② Applications: the second choice the launch requires.
        ImGui::SameLine(0.0f, Gutter);
        ImGui::BeginChild("##applications", ImVec2(std::max(160.0f * Scale, RailWidth - 8.0f * Scale), BodyHeight),
                          ImGuiChildFlags_Borders);
        ImGui::Indent(10.0f * Scale);
        ImGui::TextDisabled("OPEN WITH");
        ImGui::Spacing();
        for (size_t Index = 0; Index < Selection.QueryApplications().size(); ++Index)
        {
            ConstructApplicationRow(Index, ImGui::GetContentRegionAvail().x);
        }
        ImGui::Unindent(10.0f * Scale);
        ImGui::EndChild();
        ImGui::Unindent(24.0f * Scale);

        ConstructFooter(Width);
    }
    ImGui::End();
    ImGui::PopStyleVar(2);
    ImGui::PopStyleColor(10);
}

bool ProjectLaunchPanel::DebugSelectProject(const std::string &ProjectName)
{
    for (const ProjectBrowserEntry &Entry : Selection.QueryListing().Entries)
    {
        if (Entry.Descriptor.Name == ProjectName)
        {
            return Selection.SelectProject(Entry.Descriptor.DescriptorPath);
        }
    }
    return false;
}

bool ProjectLaunchPanel::DebugSelectApplication(const std::string &Key)
{
    return Selection.SelectApplication(Key);
}

bool ProjectLaunchPanel::DebugPressOpen()
{
    const bool Issued = Selection.RequestLaunch();
    LaunchAccepted     = Issued;
    return Issued;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    INTERNAL FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

void ProjectLaunchPanel::ConstructHeader(float Width)
{
    const float Scale = ImGui::GetStyle().FontScaleDpi;
    ImGui::Dummy(ImVec2(0.0f, 26.0f * Scale));
    ImGui::Indent(32.0f * Scale);
    ImGui::TextDisabled("PROJECT BROWSER");
    ImGui::TextUnformatted("Open a project");
    char Line[256] = {};
    std::snprintf(Line, sizeof(Line), "%zu projects  ·  %s",
                  Selection.QueryListing().Entries.size(),
                  Selection.QueryProjectsDirectory().string().c_str());
    ImGui::TextDisabled("%s", Line);
    ImGui::Unindent(32.0f * Scale);
    ImGui::Dummy(ImVec2(0.0f, 14.0f * Scale));
    ImGui::Indent(32.0f * Scale);
    ImGui::Separator();
    ImGui::Unindent(32.0f * Scale);
    ImGui::Dummy(ImVec2(0.0f, 10.0f * Scale));
    ImGui::Indent(32.0f * Scale);
    (void)Width;
    const float RightWidth = ImGui::GetContentRegionAvail().x - 32.0f * Scale;
    ImGui::Unindent(32.0f * Scale);
    (void)RightWidth;
}

void ProjectLaunchPanel::ConstructProjectCard(size_t Index, float Width, float Height)
{
    const ProjectBrowserEntry &Entry     = Selection.QueryListing().Entries[Index];
    const ProjectDescriptor   &Descriptor = Entry.Descriptor;
    const bool                 Selected  = Selection.QuerySelectedProject() != nullptr &&
                             Selection.QuerySelectedProject()->DescriptorPath == Descriptor.DescriptorPath;
    const float Scale = ImGui::GetStyle().FontScaleDpi;

    ImGui::PushID(static_cast<int>(Index));
    const ImVec2 Origin = ImGui::GetCursorScreenPos();
    ImGui::InvisibleButton("##card", ImVec2(Width, Height));
    const bool Hovered = ImGui::IsItemHovered();
    if (ImGui::IsItemActivated())
    {
        HoveredProject = static_cast<int>(Index);
    }
    if (ImGui::IsItemDeactivated() && HoveredProject == static_cast<int>(Index))
    {
        // 📝 A card selects; it never launches. The application row and the footer button complete the hand-off.
        (void)Selection.SelectProject(Descriptor.DescriptorPath);
        HoveredProject = -1;
    }

    ImDrawList       *Draw   = ImGui::GetWindowDrawList();
    const ImVec2      Maximum(Origin.x + Width, Origin.y + Height);
    const ColorQuad   Surface = Selected ? Colours.Selected : (Hovered ? Colours.Raised : Colours.Card);
    Draw->AddRectFilled(Origin, Maximum, Packed(Surface), 10.0f * Scale);
    Draw->AddRect(Origin, Maximum, Packed(Selected ? Colours.Accent : Colours.StrokeStrong), 10.0f * Scale, 0,
                  std::max(1.0f, Scale));
    if (Selected)
    {
        Draw->AddRectFilled(ImVec2(Origin.x, Origin.y + 10.0f * Scale),
                            ImVec2(Origin.x + 3.0f * Scale, Maximum.y - 10.0f * Scale), Packed(Colours.Accent),
                            2.0f * Scale);
    }

    ImFont *Font = ImGui::GetFont();
    const ImVec2 Name(Origin.x + 18.0f * Scale, Origin.y + 18.0f * Scale);
    Draw->AddText(Font, 17.0f * Scale, Name, Packed(Colours.Text), Descriptor.Name.c_str());
    char Facts[256] = {};
    ProjectFacts(Descriptor, Facts, sizeof(Facts));
    Draw->AddText(Font, 11.5f * Scale, ImVec2(Name.x, Name.y + 26.0f * Scale), Packed(Colours.TextDim), Facts);
    Draw->AddText(Font, 10.5f * Scale, ImVec2(Name.x, Name.y + 46.0f * Scale), Packed(Colours.TextFaint),
                  Descriptor.DescriptorPath.string().c_str());

    ImGui::PopID();
}

void ProjectLaunchPanel::ConstructApplicationRow(size_t Index, float Width)
{
    const ProjectApplication &Application = Selection.QueryApplications()[Index];
    const bool                Selected    = Selection.QuerySelectedApplicationKey() == Application.Key;
    const float               Scale       = ImGui::GetStyle().FontScaleDpi;

    ImGui::PushID(static_cast<int>(Index));
    const ImVec2 Origin = ImGui::GetCursorScreenPos();
    const float  Height = 54.0f * Scale;   // [px]
    ImGui::InvisibleButton("##application", ImVec2(Width, Height));
    const bool Hovered = ImGui::IsItemHovered() && Application.ExecutableBundled;
    if (ImGui::IsItemDeactivated() && Hovered)
    {
        (void)Selection.SelectApplication(Application.Key);
    }

    ImDrawList  *Draw = ImGui::GetWindowDrawList();
    const ImVec2 Maximum(Origin.x + Width, Origin.y + Height);
    // 📝 The rail is narrow by design: clip each row so a long summary is cut at the card edge, never drawn over
    //    the neighbouring column.
    Draw->PushClipRect(Origin, Maximum, true);
    const ColorQuad Surface = Selected ? Colours.Selected : (Hovered ? Colours.Raised : Colours.Card);
    Draw->AddRectFilled(Origin, Maximum, Packed(Surface), 8.0f * Scale);
    Draw->AddRect(Origin, Maximum, Packed(Selected ? Colours.Accent : Colours.Stroke), 8.0f * Scale, 0,
                  std::max(1.0f, Scale));

    // 📝 Selection dot, drawn as a two-ring mark so it reads without any icon font.
    const ImVec2 Dot(Origin.x + 16.0f * Scale, Origin.y + Height * 0.5f);
    Draw->AddCircle(Dot, 6.0f * Scale, Packed(Selected ? Colours.Accent : Colours.TextFaint), 20, 1.5f * Scale);
    if (Selected)
    {
        Draw->AddCircleFilled(Dot, 3.0f * Scale, Packed(Colours.Accent), 16);
    }

    ImFont      *Font  = ImGui::GetFont();
    const ImU32  Ink   = Packed(Application.ExecutableBundled ? Colours.Text : Colours.TextFaint);
    Draw->AddText(Font, 14.0f * Scale, ImVec2(Dot.x + 16.0f * Scale, Origin.y + 10.0f * Scale), Ink,
                  Application.Name.c_str());
    Draw->AddText(Font, 10.5f * Scale, ImVec2(Dot.x + 16.0f * Scale, Origin.y + 29.0f * Scale),
                  Packed(Colours.TextFaint), Application.Summary.c_str());
    if (!Application.ExecutableBundled)
    {
        Draw->AddText(Font, 10.0f * Scale, ImVec2(Dot.x + 16.0f * Scale, Origin.y + 41.0f * Scale),
                      Packed(Colours.Warning), "not bundled with this package");
    }
    Draw->PopClipRect();
    ImGui::PopID();
    ImGui::Dummy(ImVec2(0.0f, 6.0f * Scale));
}

void ProjectLaunchPanel::ConstructFooter(float Width)
{
    const float Scale = ImGui::GetStyle().FontScaleDpi;
    (void)Width;
    ImGui::Indent(24.0f * Scale);
    const float Available = ImGui::GetContentRegionAvail().x;

    const ProjectDescriptor  *Chosen      = Selection.QuerySelectedProject();
    const ProjectApplication *Application = Selection.QuerySelectedApplication();
    const bool                Ready      = Chosen != nullptr && Application != nullptr && Application->ExecutableBundled;

    char Line[320] = {};
    std::snprintf(Line, sizeof(Line), "%s  \u00b7  %s",
                  Chosen != nullptr ? Chosen->Name.c_str() : "no project selected",
                  Application != nullptr ? Application->Name.c_str() : "no application selected");

    const float ButtonWidth = 168.0f * Scale;                     // [px]
    const float TextWidth   = std::max(120.0f, Available - ButtonWidth - 16.0f * Scale);
    ImGui::BeginGroup();
    ImGui::TextDisabled("%s", Line);
    if (!Selection.QueryDiagnostic().empty())
    {
        ImGui::TextColored(Colour(Colours.Warning), "%s", Selection.QueryDiagnostic().c_str());
    }
    ImGui::SameLine(std::max(0.0f, Available - ButtonWidth - 8.0f * Scale));
    ImGui::BeginDisabled(!Ready);
    if (ImGui::Button("Open project", ImVec2(ButtonWidth, 32.0f * Scale)))
    {
        LaunchAccepted = Selection.RequestLaunch();
    }
    ImGui::EndDisabled();
    ImGui::EndGroup();
    ImGui::Unindent(24.0f * Scale);
}

} // namespace Frontier
