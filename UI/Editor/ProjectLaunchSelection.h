/*====================================================================================================================================
                                                    PROJECTLAUNCHSELECTION.H
====================================================================================================================================*/
// 🧩 Project + application selection that revalidates the chosen container before it issues a launch request.

#pragma once

#include "Engine/Interface/ProjectDescriptor.h"
#include "Frontier/Applications/Editor/ProjectBrowserHost.h"
#include "UI/Editor/ApplicationCatalogue.h"

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                        STRUCTS
//------------------------------------------------------------------------------------------------------------------------

// 📝 What the host receives once both steps are complete: which project, which application, and the paths the
//    application needs. Issued once per launch — ConsumeLaunchRequest clears it, so a hand-off cannot be performed twice.
struct ProjectLaunchRequest
{
    ProjectDescriptor     Descriptor;         // [-] - Revalidated descriptor (name, categories, directory)
    std::filesystem::path ContainerPath;      // [-] - The .projectspace the operator selected, when there was one
    std::string           ApplicationKey;     // [-] - Selected ProjectApplication::Key
    std::string           ApplicationName;    // [text] - Selected ProjectApplication::Name
    std::string           Executable;         // [text] - Package-relative executable the host starts
    uint32_t              Sequence = 0;       // [#] - 1-based launch ordinal of this host session
};

//------------------------------------------------------------------------------------------------------------------------
//                                                    LAUNCH SELECTION
//------------------------------------------------------------------------------------------------------------------------

// 📝 The two-step launch the project browser drives: (1) select a project container, (2) select the application
//    that opens it. Selection alone never launches: RequestLaunch revalidates the container on disk and issues
//    the request, and only ConsumeLaunchRequest hands it to the host. A refused step leaves the previous valid
//    selection untouched and records one human-readable diagnostic.
class ProjectLaunchSelection
{
  public:
    explicit ProjectLaunchSelection(std::filesystem::path ProjectsDirectory = {});

    bool ConfigureProjectsDirectory(const std::filesystem::path &Directory);
    [[nodiscard]] const std::filesystem::path &QueryProjectsDirectory() const noexcept { return ProjectsDirectory; }
    [[nodiscard]] const ProjectBrowserEnumeration &QueryListing() const noexcept { return Listing; }
    [[nodiscard]] const std::vector<ProjectApplication> &QueryApplications() const noexcept { return Applications; }

    // -- Step 2: application -------------------------------------------------------------------------------------------
    bool                                    SelectApplication(const std::string &Key);
    bool                                    SelectFirstBundledApplication();
    [[nodiscard]] const ProjectApplication *QuerySelectedApplication() const noexcept { return SelectedApplication; }
    [[nodiscard]] std::string               QuerySelectedApplicationKey() const;

    // -- Step 1: project -----------------------------------------------------------------------------------------------
    // Accepts a .frontier descriptor or the .projectspace container beside it; both revalidate inside.
    bool                                   SelectProject(const std::filesystem::path &Path);
    [[nodiscard]] const ProjectDescriptor *QuerySelectedProject() const noexcept { return SelectedProject ? &*SelectedProject : nullptr; }
    [[nodiscard]] const std::filesystem::path &QuerySelectedContainer() const noexcept { return SelectedContainer; }

    // -- Hand-off ------------------------------------------------------------------------------------------------------
    bool                                              RequestLaunch();
    [[nodiscard]] std::optional<ProjectLaunchRequest> ConsumeLaunchRequest();
    [[nodiscard]] uint32_t                            QueryLaunchSequence() const noexcept { return LaunchCount; }
    [[nodiscard]] const std::string                  &QueryDiagnostic() const noexcept { return Diagnostic; }

  private:
    [[nodiscard]] std::filesystem::path ResolveDescriptorPath(const std::filesystem::path &Path) const;
    [[nodiscard]] const ProjectBrowserEntry *FindListedEntry(const std::filesystem::path &DescriptorPath) const;

    std::filesystem::path               ProjectsDirectory;   // [-] - Folder enumerated for the browser list
    ProjectBrowserEnumeration           Listing;             // [-] - Decoded descriptors, name-sorted
    std::vector<ProjectApplication>     Applications;        // [-] - Step 2 rows (copy of the catalogue)
    const ProjectApplication           *SelectedApplication = nullptr;   // [-] - Into Applications
    std::optional<ProjectDescriptor>    SelectedProject;     // [-] - Last accepted descriptor
    std::filesystem::path               SelectedContainer;   // [-] - Last accepted .projectspace (may be empty)
    std::optional<ProjectLaunchRequest> PendingRequest;      // [-] - Issued, not yet consumed
    std::string                         Diagnostic;          // [text] - Why the last request was refused
    uint32_t                            LaunchCount = 0;     // [#] - Issued launches this session
};

} // namespace Frontier
