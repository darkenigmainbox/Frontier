/*====================================================================================================================================
                                                    PROJECTSESSIONWORKSPACE.H
====================================================================================================================================*/
// 🧩 The opened project's editor interface: Control Centre notch over a dockspace holding Outliner, Viewport, Inspector and Log Stream.

#pragma once

#include "ControlCentrePanel.h"
#include "Engine/Interface/LogStreamPanel.h"
#include "Engine/Interface/PanelDockspace.h"
#include "Engine/Interface/SceneDirectoryPanel.h"
#include "Engine/Interface/ProjectDescriptor.h"

#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                    FORWARD DECLARATIONS
//------------------------------------------------------------------------------------------------------------------------

class LogStreamPanel;
class SceneDirectoryPanel;
class SceneRecord;

//------------------------------------------------------------------------------------------------------------------------
//                                                        STRUCTS
//------------------------------------------------------------------------------------------------------------------------

// 📝 What the notch, the status strip and the return-to-browser path read about the open project. Filled from the
//    descriptor the launch selection revalidated; never re-decoded here.
struct ProjectSessionSummary
{
    std::string Name;                    // [text] - Descriptor ProjectName, shown on the notch and the window title
    std::string Directory;               // [text] - UTF-8 project directory
    std::string OpeningScene;            // [text] - Descriptor OpeningScene (empty = blank workspace)
    std::string ContentLocation;         // [text] - Project-relative user content folder
    uint32_t    LogCategories  = 0;      // [entries] - Categories the descriptor declared
    bool        LayoutRestored = false;  // [-] - A saved workspace layout was accepted this session
};

//------------------------------------------------------------------------------------------------------------------------
//                                                    SESSION WORKSPACE
//------------------------------------------------------------------------------------------------------------------------

// 📝 Composition only: it owns no drawing code of its own. Panel content comes from the production LogStream and
//    SceneDirectory panels, the inspector draws whatever the selected record described for itself, and the
//    Control Centre is the host's panel (the notch is drawn last, over the dockspace).
//    Scene objects are records: constructing SunRecord/AtmosphereRecord/... registers them in the Outliner and
//    their editor-conditional constructors register their own Inspector descriptions — this workspace never
//    describes a record by hand.
class ProjectSessionWorkspace
{
  public:
    explicit ProjectSessionWorkspace(ControlCentrePanel &Centre);
    ~ProjectSessionWorkspace();

    ProjectSessionWorkspace(const ProjectSessionWorkspace &)              = delete;
    ProjectSessionWorkspace &operator=(const ProjectSessionWorkspace &) = delete;

    // Decodes nothing: takes the descriptor the launch selection already revalidated.
    void        ConfigureProject(const ProjectDescriptor &Descriptor);
    bool        PrepareSession();
    bool        ConfigurePlatform() noexcept;
    void        ConstructInterface(double Δτ);
    bool        FinalizeLayout();

    [[nodiscard]] PanelDockspace      &QueryPanels() noexcept { return Panels; }
    [[nodiscard]] LogStreamPanel      &QueryLogStream() noexcept { return LogPanel; }
    [[nodiscard]] SceneDirectoryPanel &QueryOutliner() noexcept { return Outliner; }
    [[nodiscard]] const ProjectSessionSummary &QuerySummary() const noexcept { return Summary; }

    // Writes the session's own opening diagnostics (project, content root, categories, layout) to the log stream.
    void EmitSessionDiagnostics();

    // 📝 Diagnostic stand-in for a headless capture: announces itself in the stream, then writes deterministic
    //    sample rows into the project's own declared categories so the panel's filters and collapse show real work.
    void EmitSampleTraffic();

    // Registers one editor-owned scene record of Classification and names it. Returns the issued token.
    uint64_t SpawnRecord(uint32_t Classification, const std::string &Name);

  private:
    void ConstructViewport();
    [[nodiscard]] uint32_t EngineToken(const char *Name) const;

    ControlCentrePanel &Centre;                                    // [-] - Host-owned appearance + notch
    PanelDockspace      Panels;                                    // [-] - Dockspace the host seats each frame
    LogStreamPanel      LogPanel;                                  // [-] - Production Log Stream over the ring store
    SceneDirectoryPanel Outliner;                                  // [-] - Production Outliner projection
    ProjectSessionSummary Summary;                                 // [-] - Descriptor facts
    std::filesystem::path LayoutPath;                              // [-] - Saved/WorkspaceLayout.toml
    std::string           ProjectDirectory;                        // [text] - UTF-8, for the viewport card

    // 📝 Reusable environment components, not user-authored: constructing them is the registration.
    struct SceneComposition;
    std::unique_ptr<SceneComposition> Scene;

    std::vector<std::unique_ptr<SceneRecord>> SpawnedRecords;      // [-] - Records this session created
    uint32_t                                  NewlyRegisteredCategories = 0;   // [entries] - Registered by this session
    bool                                      Prepared = false;    // [-] - Panels seated once
    float                                     InterfaceScale = 1.0f;   // [-] - From Control Centre appearance [x]
};

} // namespace Frontier
