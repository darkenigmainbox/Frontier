/*====================================================================================================================================
                                                    PROJECTLAUNCHSELECTION.CPP
====================================================================================================================================*/
// 🧩 Project + application selection that revalidates the chosen container before it issues a launch request.

#include "UI/Editor/ProjectLaunchSelection.h"

#include <algorithm>
#include <system_error>

namespace Frontier
{

namespace
{

// 📝 A project folder carries exactly one descriptor beside the container the browser card grid opens; this finds
//    that descriptor for a container path the operator selected instead.
std::filesystem::path SiblingDescriptor(const std::filesystem::path &Container)
{
    std::error_code Error;
    const std::filesystem::path Folder = Container.has_parent_path() ? Container.parent_path()
                                                                     : std::filesystem::current_path(Error);
    for (const std::filesystem::directory_entry &Candidate : std::filesystem::directory_iterator(Folder, Error))
    {
        if (Error)
        {
            break;
        }
        if (Candidate.is_regular_file(Error) && Candidate.path().extension() == ".frontier")
        {
            return Candidate.path();
        }
    }
    return {};
}

bool SamePath(const std::filesystem::path &Left, const std::filesystem::path &Right)
{
    std::error_code Error;
    const bool Equivalent = std::filesystem::equivalent(Left, Right, Error);
    if (!Error)
    {
        return Equivalent;
    }
    return Left.lexically_normal() == Right.lexically_normal();
}

} // namespace

//------------------------------------------------------------------------------------------------------------------------
//                                                    PUBLIC FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

ProjectLaunchSelection::ProjectLaunchSelection(std::filesystem::path ProjectsDirectory)
    : Applications(QueryProjectApplications())
{
    SelectFirstBundledApplication();
    if (!ProjectsDirectory.empty())
    {
        (void)ConfigureProjectsDirectory(std::move(ProjectsDirectory));
    }
}

bool ProjectLaunchSelection::ConfigureProjectsDirectory(const std::filesystem::path &Directory)
{
    ProjectsDirectory = Directory;
    Listing           = EnumerateProjects(Directory);
    Diagnostic.clear();
    if (Listing.Entries.empty())
    {
        Diagnostic = "No decodable project descriptor in " + Directory.string();
        return false;
    }
    return true;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    STEP 2 - APPLICATION
//------------------------------------------------------------------------------------------------------------------------

bool ProjectLaunchSelection::SelectApplication(const std::string &Key)
{
    for (const ProjectApplication &Application : Applications)
    {
        if (Application.Key != Key)
        {
            continue;
        }
        if (!Application.ExecutableBundled)
        {
            Diagnostic                                                = Application.Name;
            Diagnostic                                               += " is not bundled with this package";
            PendingRequest.reset();
            return false;
        }
        SelectedApplication = &Application;
        Diagnostic.clear();
        PendingRequest.reset();
        return true;
    }
    Diagnostic = "Unknown application: " + Key;
    PendingRequest.reset();
    return false;
}

bool ProjectLaunchSelection::SelectFirstBundledApplication()
{
    for (const ProjectApplication &Application : Applications)
    {
        if (Application.ExecutableBundled)
        {
            SelectedApplication = &Application;
            return true;
        }
    }
    SelectedApplication = nullptr;
    return false;
}

std::string ProjectLaunchSelection::QuerySelectedApplicationKey() const
{
    return SelectedApplication != nullptr ? SelectedApplication->Key : std::string{};
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    STEP 1 - PROJECT
//------------------------------------------------------------------------------------------------------------------------

std::filesystem::path ProjectLaunchSelection::ResolveDescriptorPath(const std::filesystem::path &Path) const
{
    std::error_code Error;
    if (Path.extension() == ".frontier")
    {
        return Path;
    }
    if (!std::filesystem::is_directory(Path, Error) && std::filesystem::exists(Path, Error))
    {
        return SiblingDescriptor(Path);
    }
    return {};
}

const ProjectBrowserEntry *ProjectLaunchSelection::FindListedEntry(const std::filesystem::path &DescriptorPath) const
{
    for (const ProjectBrowserEntry &Entry : Listing.Entries)
    {
        if (SamePath(Entry.Descriptor.DescriptorPath, DescriptorPath))
        {
            return &Entry;
        }
    }
    return nullptr;
}

bool ProjectLaunchSelection::SelectProject(const std::filesystem::path &Path)
{
    const std::filesystem::path Descriptor = ResolveDescriptorPath(Path);
    if (Descriptor.empty())
    {
        Diagnostic = "No project descriptor for " + Path.string();
        PendingRequest.reset();
        return false;
    }

    // 📝 Revalidation is the point of the second decode: the operator may have moved or edited the container between
    //    the browser frame that showed it and this click, and the editor must never open a project it cannot describe.
    ProjectDescriptor Decoded;
    std::string       Reason;
    if (!DecodeProjectDescriptor(Descriptor, Decoded, Reason))
    {
        Diagnostic = Reason;
        PendingRequest.reset();
        return false;
    }
    if (const ProjectBrowserEntry *Listed = FindListedEntry(Descriptor); Listed != nullptr)
    {
        Decoded = Listed->Descriptor;
    }

    SelectedProject = Decoded;
    SelectedContainer.clear();
    if (Path.extension() == ".projectspace")
    {
        SelectedContainer = Path;
    }
    Diagnostic.clear();
    PendingRequest.reset();
    return true;
}

//------------------------------------------------------------------------------------------------------------------------
//                                                    HAND-OFF
//------------------------------------------------------------------------------------------------------------------------

bool ProjectLaunchSelection::RequestLaunch()
{
    if (!SelectedProject.has_value())
    {
        Diagnostic = "Select a project before launching";
        return false;
    }
    if (SelectedApplication == nullptr || !SelectedApplication->ExecutableBundled)
    {
        Diagnostic = "Select a bundled application before launching";
        return false;
    }

    // Revalidate the descriptor against the disk one last time; the issued request carries the decoded copy.
    ProjectDescriptor Revalidated;
    std::string       Reason;
    if (!DecodeProjectDescriptor(SelectedProject->DescriptorPath, Revalidated, Reason))
    {
        Diagnostic = Reason;
        return false;
    }
    (void)Revalidated;

    ++LaunchCount;
    PendingRequest = ProjectLaunchRequest{*SelectedProject, SelectedContainer, SelectedApplication->Key,
                                          SelectedApplication->Name, SelectedApplication->Executable, LaunchCount};
    Diagnostic.clear();
    return true;
}

std::optional<ProjectLaunchRequest> ProjectLaunchSelection::ConsumeLaunchRequest()
{
    std::optional<ProjectLaunchRequest> Issued;
    Issued.swap(PendingRequest);
    return Issued;
}

} // namespace Frontier
