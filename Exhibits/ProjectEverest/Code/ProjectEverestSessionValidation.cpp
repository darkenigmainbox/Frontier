/*====================================================================================================================================
                                            PROJECTEVERESTSESSIONVALIDATION.CPP
====================================================================================================================================*/
// 🧩 Drives the production Project Everest launch and session through real ImGui frames and rasterizes the result.

#include "Engine/Interface/IconPresentation.h"
#include "Engine/Interface/LogStreamPanel.h"
#include "Engine/Interface/SceneDirectoryPanel.h"
#include "Engine/Lifecycle/ActivationSequence.h"
#include "Engine/Scene/SceneDirectory.h"
#include "Exhibits/ControlCentre/Code/CpuRasterization.h"
#include "UI/Editor/ControlCentrePanel.h"
#include "UI/Editor/ProjectLaunchPanel.h"
#include "UI/Editor/ProjectLaunchSelection.h"
#include "UI/Editor/ProjectSessionWorkspace.h"

#include <imgui.h>

#include <cstdio>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace
{

using namespace Frontier;

void Require(bool Condition, const char *Description)
{
    if (!Condition)
    {
        throw std::runtime_error(Description);
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                       CAPTURE
//------------------------------------------------------------------------------------------------------------------------

void Capture(const std::filesystem::path &Path)
{
    const ImGuiIO    &Exchange = ImGui::GetIO();
    const int         Width    = static_cast<int>(Exchange.DisplaySize.x);
    const int         Height   = static_cast<int>(Exchange.DisplaySize.y);
    std::vector<unsigned char> Pixels(static_cast<size_t>(Width) * static_cast<size_t>(Height) * 3, 12);
    const ImDrawData          *Commands = ImGui::GetDrawData();
    for (const ImDrawList *List : Commands->CmdLists)
    {
        FrontierExhibit::RasterizeCommands(List, Pixels.data(), Width, Height, Commands->DisplayPos,
                                           Commands->FramebufferScale);
    }
    std::ofstream Output(Path, std::ios::binary);
    Output << "P6\n" << Width << ' ' << Height << "\n255\n";
    Output.write(reinterpret_cast<const char *>(Pixels.data()), static_cast<std::streamsize>(Pixels.size()));
    Require(Output.good(), "Failed to write the captured frame");
    std::printf("captured %s (%dx%d)\n", Path.string().c_str(), Width, Height);
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                                        MAIN
//------------------------------------------------------------------------------------------------------------------------

int main(int ArgumentCount, char **Arguments)
{
    using namespace Frontier;
    try
    {
        Require(ArgumentCount == 4, "Expected EngineContent, repository root and disposable evidence directory");
        const std::filesystem::path Content      = std::filesystem::absolute(Arguments[1]);
        const std::filesystem::path Root         = std::filesystem::absolute(Arguments[2]);
        const std::filesystem::path Evidence     = std::filesystem::absolute(Arguments[3]);
        // 📝 The capture works on a disposable copy of the project tree: launching a session writes workspace layout
        //    and appearance preferences back into the project, and a validation run must never modify tracked files.
        std::filesystem::remove_all(Evidence);
        std::filesystem::create_directories(Evidence);
        const std::filesystem::path Projects = Evidence / "Projects";
        std::filesystem::copy(Root / "Frontier" / "Projects", Projects,
                              std::filesystem::copy_options::recursive | std::filesystem::copy_options::overwrite_existing);
        const std::filesystem::path ProjectSpace = Projects / "Project-Everest" / "ProjectEverest.projectspace";

        ImGui::CreateContext();
        ImGuiIO &Exchange    = ImGui::GetIO();
        Exchange.IniFilename = nullptr;
        Exchange.DisplaySize = ImVec2(1920, 1080);
        Exchange.DeltaTime   = 1.0f / 60.0f;
        Exchange.BackendFlags |= ImGuiBackendFlags_RendererHasTextures | ImGuiBackendFlags_RendererHasVtxOffset;
        ImGui::GetPlatformIO().Renderer_TextureMaxWidth  = 4096;
        ImGui::GetPlatformIO().Renderer_TextureMaxHeight = 4096;
        IconPresentation::Attach(Content / "Icons");

        // ① The Control Centre is host-owned in both surfaces below; opening Project Everest applies its own
        //    workspace appearance, exactly as the Windows host does for a selected project container.
        ActivationOwnership Ownership(new ControlCentrePanel(Content / "FontArchives", {},
                                                             ProjectSpace));
        auto               *Centre = static_cast<ControlCentrePanel *>(Ownership.get());
        const bool CentreInitialized = Centre->Initialize();
        std::printf("centre initialize: %d diagnostic: %s\n", CentreInitialized ? 1 : 0,
                    Centre->QueryDiagnostic().c_str());
        const bool CentreActivated = Centre->Activate();
        std::printf("centre activate: %d diagnostic: %s\n", CentreActivated ? 1 : 0,
                    Centre->QueryDiagnostic().empty() ? "(none)" : Centre->QueryDiagnostic().c_str());
        Require(CentreInitialized && CentreActivated, "Control Centre initialization failed");

        // 📝 Pointer steps are queued between frames, exactly as the platform adapter delivers them: hover first,
        //    then press, then release on the widget the frame reported.
        const auto HoverAt = [](const PlaneExtent &Extent) {
            ImGui::GetIO().AddMousePosEvent((Extent.MinimumX + Extent.MaximumX) * 0.5f,
                                            (Extent.MinimumY + Extent.MaximumY) * 0.5f);
        };
        const auto PressPointer = []() { ImGui::GetIO().AddMouseButtonEvent(0, true); };
        const auto ReleasePointer = []() { ImGui::GetIO().AddMouseButtonEvent(0, false); };

        //----------------------------------------------------------------------------------------------------------------
        //  STEP 1+2  Project browser: real decoded descriptors, then the application that opens the chosen one.
        //----------------------------------------------------------------------------------------------------------------
        ProjectLaunchSelection Selection(Projects);
        Require(!Selection.QueryListing().Entries.empty(), "No project descriptor decoded from the repository");
        ProjectLaunchPanel Launcher(Selection);
        Launcher.ConfigurePalette(ControlKit::Palette());

        const auto BrowserFrame = [&]() {
            Centre->PrepareInterface();
            ImGui::NewFrame();
            (void)Centre->Integrate(1.0 / 60.0);
            Launcher.ConstructInterface();
            Centre->ConstructInterface();
            ImGui::Render();
            FrontierExhibit::AcknowledgeTextures();
        };
        for (int Index = 0; Index < 12; ++Index)
        {
            BrowserFrame();
        }
        Capture(Evidence / "01-ProjectBrowser.ppm");

        // 📝 Step 1 and step 2 are the same production transitions the pointer performs on a card and a row.
        Require(Launcher.DebugSelectProject("Project Everest"), "Project Everest was not selectable");
        Require(Launcher.DebugSelectApplication("frontier-editor"), "Frontier Editor was not selectable");
        for (int Index = 0; Index < 6; ++Index)
        {
            BrowserFrame();
        }
        Capture(Evidence / "02-ApplicationSelection.ppm");

        // 📝 Refusal paths first: an application this package cannot start is offered by the catalogue but never
        //    accepted, and a refused step leaves the previously valid selection in place.
        Require(!Launcher.DebugSelectApplication("slate-drive"), "An unbundled application was accepted");
        Require(Selection.QuerySelectedApplicationKey() == "frontier-editor",
                "A refused step altered the valid selection");
        Require(!Selection.QueryDiagnostic().empty(), "A refused step recorded no diagnostic");

        Require(Launcher.DebugPressOpen(), "A complete selection refused to launch");
        std::optional<ProjectLaunchRequest> Request = Selection.ConsumeLaunchRequest();
        Require(Request.has_value(), "The launch request was not issued");
        Require(!Selection.ConsumeLaunchRequest().has_value(), "The launch request was issued twice");
        Require(Request->Descriptor.Name == "Project Everest", "The launch request carried the wrong project");
        Require(Request->ApplicationKey == "frontier-editor", "The launch request carried the wrong application");
        std::printf("launch %u: %s -> %s [%s]\n", Request->Sequence, Request->Descriptor.Name.c_str(),
                    Request->ApplicationName.c_str(), Request->Executable.c_str());

        //----------------------------------------------------------------------------------------------------------------
        //  STEP 3  The project session: notch over Outliner | Viewport | Inspector, Log Stream under the Outliner.
        //----------------------------------------------------------------------------------------------------------------
        ProjectSessionWorkspace Session(*Centre);
        Session.ConfigureProject(Request->Descriptor);
        Require(Session.PrepareSession(), "Session preparation failed");
        Session.EmitSessionDiagnostics();
        Session.EmitSampleTraffic();
        // 📝 A user-authored record: the project spawns it and its constructor registers it in the Outliner.
        (void)Session.SpawnRecord(static_cast<uint32_t>(RecordClassification::Vehicle), "ControlVehicle");

        const auto SessionFrame = [&]() {
            Centre->PrepareInterface();
            Session.ConfigurePlatform();
            ImGui::NewFrame();
            (void)Centre->Integrate(1.0 / 60.0);
            Session.ConstructInterface(1.0 / 60.0);
            Centre->ConstructInterface();
            ImGui::Render();
            FrontierExhibit::AcknowledgeTextures();
        };
        for (int Index = 0; Index < 90; ++Index)
        {
            SessionFrame();
        }
        Capture(Evidence / "03-ProjectSession.ppm");

        // ③ Inspector on a reusable environment record: the record described its own fields at construction.
        Require(Session.QueryOutliner().SelectByStableId("sun"), "The Sun record exposed no inspector description");
        for (int Index = 0; Index < 8; ++Index)
        {
            SessionFrame();
        }
        Capture(Evidence / "04-InspectorSun.ppm");

        // ④ The Control Centre drawer over the live session: the notch tab is tapped, not forced open.
        HoverAt(Centre->QueryExpansionTab().QueryTabExtent());
        SessionFrame();
        PressPointer();
        SessionFrame();
        ReleasePointer();
        SessionFrame();
        Require(Centre->QueryQuickOpen(), "Notch tap did not open the Control Centre drawer");
        for (int Index = 0; Index < 60; ++Index)
        {
            SessionFrame();
        }
        Capture(Evidence / "05-ControlCentreDrawer.ppm");

        // ⑤ The Control Centre owns the theme: Appearance -> Theme -> Dim tile -> Apply, then the drawer is dismissed
        //    and the same session is captured in the applied theme. Every step is the pointer path the validation
        //    for the Control Centre itself drives.
        const auto Tap = [&](const PlaneExtent &Extent) {
            HoverAt(Extent);
            SessionFrame();
            PressPointer();
            SessionFrame();
            SessionFrame();
            ReleasePointer();
            SessionFrame();
            SessionFrame();
        };
        // 📝 Page transitions move the rows under the pointer; every step settles before the next extent is read.
        const auto Settle = [&](int Frames) {
            for (int Index = 0; Index < Frames; ++Index)
            {
                SessionFrame();
            }
        };
        Tap(Centre->QuerySettingsExtent());
        Require(Centre->QueryPage() == ControlCentrePageCategory::Settings,
                "Settings gear did not open the category list");
        Settle(90);
        Tap(Centre->QueryCategoryExtent(0));   // Appearance
        Require(Centre->QueryPage() == ControlCentrePageCategory::Appearance,
                "Appearance category did not open the appearance page");
        Settle(90);
        Tap(Centre->QueryTabExtent(2));        // Theme page
        Require(Centre->QueryAppearancePage() == AppearancePageCategory::Theme,
                "Theme tab did not open the theme page");
        Settle(30);
        Tap(Centre->QueryAppearance().QueryThemeTileExtent(7));   // Dim (slate navy)
        Settle(12);
        Require(Centre->QueryAppearance().QueryDraft().Theme == ThemeCategory::Dim,
                "Theme tile did not respond to the captured pointer path");
        // 📝 Save is a two-step commit: the footer's Apply opens the confirmation dialogue and its primary button
        //    performs the write. Both steps go through the pointer, never by calling into the panel.
        Tap(Centre->QueryApplyExtent());
        Settle(24);
        Require(Centre->QueryConfirmation().QueryOpen(), "Apply did not open the preference confirmation");
        Capture(Evidence / "06-ControlCentreApplyConfirmation.ppm");
        Tap(Centre->QueryConfirmation().QueryPrimaryExtent());
        Settle(45);
        Require(Centre->QueryAppearance().QueryApplied().Theme == ThemeCategory::Dim,
                "Applied theme did not reach the workspace");
        Capture(Evidence / "07-ControlCentreAppliedTheme.ppm");

        // ⑥ Dismiss the sheet and show the session the Control Centre just re-themed.
        Centre->ActivatePage(AppearancePageCategory::Display);
        if (Centre->QueryQuickOpen())
        {
            Tap(Centre->QueryExpansionTab().QueryTabExtent());
        }
        for (int Index = 0; Index < 40; ++Index)
        {
            SessionFrame();
        }
        Capture(Evidence / "08-SessionAppliedTheme.ppm");

        //----------------------------------------------------------------------------------------------------------------
        //  REPORT
        //----------------------------------------------------------------------------------------------------------------
        const ProjectSessionSummary &Summary = Session.QuerySummary();
        std::printf("session: %s\n  directory %s\n  records %zu\n  declared log categories %u\n"
                    "  visible log rows %zu\n  layout restored %s\n",
                    Summary.Name.c_str(), Summary.Directory.c_str(), SceneDirectory::Instance().QueryCount(),
                    Summary.LogCategories, Session.QueryLogStream().QueryVisible().size(),
                    Summary.LayoutRestored ? "yes" : "no");
        std::printf("layout saved: %s\n", Session.FinalizeLayout() ? "yes" : "no");
        return 0;
    }
    catch (const std::exception &Failure)
    {
        std::fprintf(stderr, "ProjectEverestSessionValidation failed: %s\n", Failure.what());
        return 1;
    }
}
