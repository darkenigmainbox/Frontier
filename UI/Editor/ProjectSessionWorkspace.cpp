/*====================================================================================================================================
                                                    PROJECTSESSIONWORKSPACE.CPP
====================================================================================================================================*/
// 🧩 The opened project's editor interface: Control Centre notch over a dockspace holding Outliner, Viewport, Inspector and Log Stream.

#include "UI/Editor/ProjectSessionWorkspace.h"

#include "Engine/Diagnostics/LogCategories.h"
#include "Engine/Diagnostics/LogStream.h"
#include "Engine/Interface/LogStreamPanel.h"
#include "Engine/Interface/LogStreamPanelRegistration.h"
#include "Engine/Interface/SceneDirectoryPanel.h"
#include "Engine/Interface/SceneDirectoryPanelRegistration.h"
#include "Engine/Interface/SceneInspectorPanel.h"
#include "Engine/Scene/EnvironmentRecords.h"
#include "Engine/Scene/SceneDirectory.h"
#include "Engine/Scene/SceneRecord.h"
#include "Frontier/Applications/Editor/ProjectBrowserHost.h"

#include <imgui.h>
#include <toml++/toml.hpp>

#include <algorithm>
#include <cstdio>
#include <fstream>
#include <optional>
#include <system_error>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                    SCENE COMPOSITION
//------------------------------------------------------------------------------------------------------------------------

// 📝 The reusable environment components every project inherits. Each record's constructor registers it with the
//    Scene Directory and (editor profile) registers the Inspector description its own fields are bound to.
struct ProjectSessionWorkspace::SceneComposition
{
    SunRecord        Sun;
    AtmosphereRecord Atmosphere;
    CloudRecord      Clouds;
    FogRecord        Fog;
    WindRecord       Wind;
};

//------------------------------------------------------------------------------------------------------------------------
//                                                    PUBLIC FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

ProjectSessionWorkspace::ProjectSessionWorkspace(ControlCentrePanel &Centre)
    : Centre(Centre)
    , Scene(std::make_unique<SceneComposition>())
{
}

ProjectSessionWorkspace::~ProjectSessionWorkspace() = default;

uint32_t ProjectSessionWorkspace::EngineToken(const char *Name) const
{
    const LogCategory *Category = LogCategories().QueryByName(Name);
    return Category != nullptr ? Category->Token : 0;
}

void ProjectSessionWorkspace::ConfigureProject(const ProjectDescriptor &Descriptor)
{
    Summary.Name            = Descriptor.Name;
    Summary.Directory       = Descriptor.ProjectDirectory.string();
    Summary.OpeningScene    = Descriptor.OpeningScene;
    Summary.ContentLocation = Descriptor.ContentLocation;
    Summary.LogCategories   = static_cast<uint32_t>(Descriptor.LogCategories.size());
    ProjectDirectory        = Summary.Directory;
    LayoutPath              = Descriptor.ProjectDirectory / "Saved" / "WorkspaceLayout.toml";

    // 📝 The host registers the descriptor's declared categories before the session writes its first line, so the
    //    stream can filter by the project's own vocabulary from the opening entry onward.
    Summary.LogCategories      = static_cast<uint32_t>(Descriptor.LogCategories.size());
    NewlyRegisteredCategories  = RegisterDescriptorLogCategories(Descriptor);

    // 📝 Directory-side names only: the records themselves already registered on construction.
    (void)SceneDirectory::Instance().ConfigureName(Scene->Sun.Token(), "Sun");
    (void)SceneDirectory::Instance().ConfigureName(Scene->Atmosphere.Token(), "Atmosphere");
    (void)SceneDirectory::Instance().ConfigureName(Scene->Clouds.Token(), "Clouds");
    (void)SceneDirectory::Instance().ConfigureName(Scene->Fog.Token(), "Fog");
    (void)SceneDirectory::Instance().ConfigureName(Scene->Wind.Token(), "Wind");
    Outliner.ConfigureWorkspaceName(Summary.Name);
}

bool ProjectSessionWorkspace::PrepareSession()
{
    if (Prepared)
    {
        return true;
    }


    // ① Viewport: the panel the renderer will record into; honest placeholder until the Vulkan present path lands.
    DockPanelSpecification ViewportPanel;
    ViewportPanel.Key              = "Viewport";
    ViewportPanel.Caption          = "Viewport";
    ViewportPanel.ConstructContent = [this]() { ConstructViewport(); };
    (void)Panels.Register(ViewportPanel);

    // ② Outliner: production Scene Directory projection over the live record registry.
    (void)Panels.Register(MakeSceneDirectoryPanelSpecification(Outliner));

    // ③ Inspector: draws the description the selected record built for itself.
    DockPanelSpecification InspectorPanel;
    InspectorPanel.Key              = "Inspector";
    InspectorPanel.Caption          = "Inspector";
    InspectorPanel.ConstructContent = [this]() { ConstructSceneInspectorInterface(Outliner); };
    (void)Panels.Register(InspectorPanel);

    // ④ Log Stream: the production panel over the process-wide ring store.
    (void)Panels.Register(MakeLogStreamPanelSpecification(LogPanel));

    (void)Panels.ConfigureDockspaceKey("Frontier project panels");
    // 📝 VehicleHMI demo shell: Outliner | (Viewport over Log Stream) | Inspector. The dockspace builds the stack
    //    inside the column named by the *lower* panel, so the centre column is named by the stream.
    // 📝 Stack the pair first: ConfigureColumns counts the stacked upper panel as one of the columns it is told about,
    //    so a column set configured before the stack is refused and the dockspace falls back to a single tab group.
    (void)Panels.ConfigureStackedPanels("Viewport", "LogStream", 620.0f);   // [px] Viewport height above the stream
    (void)Panels.ConfigureColumns({{"Outliner", 0.24f}, {"LogStream", 0.54f}, {"Inspector", 0.22f}});
    Panels.ConfigureWorkspaceInsets(79.0f, 0.0f);                        // [px] Top band for the notch tab
    Panels.ConfigureTabExtent(140.0f, 26.0f);                            // [px]

    std::error_code Error;
    if (!LayoutPath.empty() && std::filesystem::is_regular_file(LayoutPath, Error))
    {
        try
        {
            const toml::table Saved = toml::parse_file(LayoutPath.string());
            std::string       Reason;
            Summary.LayoutRestored = Panels.ConfigureLayout(Saved, Reason);
        }
        catch (const toml::parse_error &)
        {
            Panels.ResetLayout();
        }
    }

    Prepared = true;
    return true;
}

bool ProjectSessionWorkspace::ConfigurePlatform() noexcept
{
    return Panels.ConfigurePlatform();
}

void ProjectSessionWorkspace::ConstructViewport()
{
    const ImGuiStyle &Style = ImGui::GetStyle();
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(28, 24));
    ImGui::TextColored(Style.Colors[ImGuiCol_TextDisabled], "SCENE CANVAS");
    ImGui::Spacing();
    ImGui::TextWrapped("The VehicleHMI viewport records here once the ReSTIR renderer port (Phase 3) is connected: "
                       "hardware ray-query ReSTIR GI on RTX class GPUs, signed-distance-field reflections with the "
                       "software BVH as the fallback. No frame is faked on this surface.");
    ImGui::Separator();
    const auto Row = [](const char *Label, const std::string &Text) {
        ImGui::TextDisabled("%s", Label);
        ImGui::SameLine(150);
        ImGui::TextWrapped("%s", Text.empty() ? "\u2014" : Text.c_str());
    };
    Row("Project", Summary.Name);
    Row("Location", Summary.Directory);
    Row("Opening scene", Summary.OpeningScene);
    ImGui::PopStyleVar();
}

void ProjectSessionWorkspace::ConstructInterface(double Δτ)
{
    if (!Prepared)
    {
        return;
    }

    LogPanel.Synchronize(LogStore(), LogCategories(), Δτ);

    // 📝 The Outliner asks, the host creates: a spawn request becomes a real record, whose constructor registers it
    //    in the same directory the panel just projected.
    while (const std::optional<RecordClassification> Spawn = Outliner.TakeSpawnRequest())
    {
        auto Record = std::make_unique<SceneRecord>(*Spawn);
        (void)SceneDirectory::Instance().ConfigureName(Record->Token(),
                                                      std::string(RecordClassificationName(*Spawn)) + " (spawned)");
        SpawnedRecords.push_back(std::move(Record));
    }
    Outliner.Synchronize(SceneDirectory::Instance());

    const float InterfacePercent = Centre.QueryAppearance().QueryApplied().InterfaceScale;   // [%]
    InterfaceScale               = std::clamp(InterfacePercent / 100.0f, 0.6f, 2.0f);       // [x]
    Panels.ConstructInterface(InterfaceScale);
}

bool ProjectSessionWorkspace::FinalizeLayout()
{
    if (LayoutPath.empty())
    {
        return false;
    }
    std::error_code Error;
    std::filesystem::create_directories(LayoutPath.parent_path(), Error);
    std::ofstream Output(LayoutPath, std::ios::trunc);
    if (!Output.is_open())
    {
        return false;
    }
    Output << Panels.EncodeLayout();
    return Output.good();
}

uint64_t ProjectSessionWorkspace::SpawnRecord(uint32_t Classification, const std::string &Name)
{
    const auto Value = static_cast<RecordClassification>(
        std::min<uint32_t>(Classification, static_cast<uint32_t>(RecordClassification::Count) - 1));
    auto Record = std::make_unique<SceneRecord>(Value);
    const uint64_t Token = Record->Token().Value;
    (void)SceneDirectory::Instance().ConfigureName(Record->Token(), Name);
    SpawnedRecords.push_back(std::move(Record));
    return Token;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    SESSION DIAGNOSTICS
//------------------------------------------------------------------------------------------------------------------------

void ProjectSessionWorkspace::EmitSessionDiagnostics()
{
    char Line[512] = {};
    std::snprintf(Line, sizeof(Line), "Session opened \u00b7 %s", Summary.Name.c_str());
    WriteLog(EngineToken("Interface"), LogSeverity::Info, LogVerbosity::Display, Line, "ProjectSessionWorkspace.cpp");

    std::snprintf(Line, sizeof(Line), "Content root \u00b7 %s", Summary.ContentLocation.c_str());
    WriteLog(EngineToken("Content"), LogSeverity::Info, LogVerbosity::Log, Line, "ProjectSessionWorkspace.cpp");

    std::snprintf(Line, sizeof(Line),
                  "Log categories registered \u00b7 %u declared by project (%u new) \u00b7 %u total",
                  Summary.LogCategories, NewlyRegisteredCategories,
                  static_cast<uint32_t>(LogCategories().QueryCount()));
    WriteLog(EngineToken("Interface"), LogSeverity::Info, LogVerbosity::Log, Line, "ProjectSessionWorkspace.cpp");

    std::snprintf(Line, sizeof(Line), "Workspace layout \u00b7 %s",
                  LayoutPath.empty() ? "no saved layout" : LayoutPath.string().c_str());
    WriteLog(EngineToken("Interface"), LogSeverity::Info, LogVerbosity::Log, Line, "ProjectSessionWorkspace.cpp");

    std::snprintf(Line, sizeof(Line), "Scene records \u00b7 %zu registered \u00b7 environment components provisioned",
                  SceneDirectory::Instance().QueryCount());
    WriteLog(EngineToken("Geometry"), LogSeverity::Info, LogVerbosity::Log, Line, "ProjectSessionWorkspace.cpp");

    WriteLog(EngineToken("Render"), LogSeverity::Warning, LogVerbosity::Display,
             "Renderer not connected \u00b7 viewport holds the scene-canvas placeholder", "ProjectSessionWorkspace.cpp");
}

void ProjectSessionWorkspace::EmitSampleTraffic()
{
    // 📝 Announced first, so nothing in the stream pretends to be a live renderer.
    WriteLog(EngineToken("Interface"), LogSeverity::Info, LogVerbosity::Display,
             "Headless validation session \u00b7 announced sample traffic follows", "ProjectSessionWorkspace.cpp");

    const struct
    {
        const char *Category;
        const char *Message;
        LogSeverity Severity;
    } Samples[] = {
        {"Render", "Cluster cull \u00b7 34% rejected by HiZ", LogSeverity::Info},
        {"Render", "Temporal reservoir reuse \u00b7 128 x 80 courtyard tile", LogSeverity::Info},
        {"Illumination", "Temporal resampling converged \u00b7 reservoirs valid 98.2%", LogSeverity::Info},
        {"Illumination", "Sky radiance payload rebuilt \u00b7 sun elevation 12.0 deg", LogSeverity::Info},
        {"Vehicle", "Powertrain \u00b7 gear 3 \u00b7 4120 rpm", LogSeverity::Info},
        {"Weather", "Hydrometeors \u00b7 rain 10.8 m/s \u00b7 grip 1.00 -> 0.48", LogSeverity::Info},
        {"Physics", "Jolt world stepped \u00b7 1204 bodies", LogSeverity::Info},
    };
    for (const auto &Sample : Samples)
    {
        WriteLog(EngineToken(Sample.Category), Sample.Severity, LogVerbosity::Log, Sample.Message,
                 "ProjectSessionWorkspace.cpp");
    }
    WriteLog(EngineToken("Illumination"), LogSeverity::Warning, LogVerbosity::Log,
             "Reservoir sample rejected \u00b7 zero-radiance donor \u00b7 weight 0", "ProjectSessionWorkspace.cpp");
}

} // namespace Frontier
