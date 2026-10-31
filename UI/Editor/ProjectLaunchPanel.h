/*====================================================================================================================================
                                                        PROJECTLAUNCHPANEL.H
====================================================================================================================================*/
// 🧩 Project browser step: real decoded projects on the left, the application that opens the chosen one on the right.

#pragma once

#include "Engine/Interface/ControlKit.h"
#include "UI/Editor/ProjectLaunchSelection.h"

#include <string>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                    LAUNCH PANEL
//------------------------------------------------------------------------------------------------------------------------

// 📝 The step between the project browser and the editor: every decodable project in the Projects directory is a
//    card, and the operator's second choice is the application that opens it. The panel owns no selection state —
//    it reads and writes the ProjectLaunchSelection the host owns, so the same two-step launch is exercised headlessly
//    by Exhibits/ProjectEverest without a second copy of the rules. Styling comes from the shared ControlKit palette.
class ProjectLaunchPanel
{
  public:
    explicit ProjectLaunchPanel(ProjectLaunchSelection &Selection);

    // Draws the whole step inside its own window; the host calls it once per frame instead of the browser.
    void ConstructInterface();

    void ConfigurePalette(const ControlKitPalette &Palette) noexcept { Colours = Palette; }

    // True for the single frame the operator accepted a complete selection; the host then consumes the request.
    [[nodiscard]] bool QueryLaunchAccepted() const noexcept { return LaunchAccepted; }

    // 📝 Validation hooks: the same transitions the pointer performs, without synthesising device input.
    bool DebugSelectProject(const std::string &ProjectName);
    bool DebugSelectApplication(const std::string &Key);
    bool DebugPressOpen();

  private:
    void ConstructProjectCard(size_t Index, float Width, float Height);
    void ConstructApplicationRow(size_t Index, float Width);
    void ConstructHeader(float Width);
    void ConstructFooter(float Width);

    ProjectLaunchSelection &Selection;
    ControlKitPalette       Colours;
    std::string             ProjectFilter;
    bool                    LaunchAccepted = false;
    int                     HoveredProject = -1;
};

} // namespace Frontier
