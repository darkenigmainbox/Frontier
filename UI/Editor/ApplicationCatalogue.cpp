/*====================================================================================================================================
                                                        APPLICATIONCATALOGUE.CPP
====================================================================================================================================*/
// 🧩 The applications a decoded project descriptor can be handed to, in launch order.

#include "UI/Editor/ApplicationCatalogue.h"

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                    PUBLIC FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

std::vector<ProjectApplication> QueryProjectApplications()
{
    // 📝 Ordered by how much of the project they present. The Frontier editor owns the scene, the log stream and
    //    the outliner; Texture Workspace takes the same project content for material and pattern authoring; Slate
    //    is named because Project Drive targets it, but this package does not ship it — the row states that.
    return {
        {"frontier-editor", "Frontier Editor",
         "Scene viewport, outliner, inspector and log stream", "Frontier", true},
        {"texture-workspace", "Texture Workspace",
         "Material, pattern and surface authoring", "TextureWorkspace", true},
        {"slate-drive", "Slate Project Drive",
         "Project Drive vehicle authoring surface", "Slate", false},
    };
}

const ProjectApplication *FindProjectApplication(const std::string &Key) noexcept
{
    static const std::vector<ProjectApplication> Applications = QueryProjectApplications();
    for (const ProjectApplication &Application : Applications)
    {
        if (Application.Key == Key)
        {
            return &Application;
        }
    }
    return nullptr;
}

std::string QueryDefaultProjectApplicationKey()
{
    return "frontier-editor";
}

} // namespace Frontier
