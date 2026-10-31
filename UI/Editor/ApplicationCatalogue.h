/*====================================================================================================================================
                                                        APPLICATIONCATALOGUE.H
====================================================================================================================================*/
// 🧩 The applications a decoded project descriptor can be handed to, in launch order.

#pragma once

#include <string>
#include <vector>

namespace Frontier
{

//------------------------------------------------------------------------------------------------------------------------
//                                                        STRUCTS
//------------------------------------------------------------------------------------------------------------------------

// 📝 One entry in the launch step that follows project selection: which binary takes the project container
//    and which editor surface it presents. The catalogue is data only — the host performs the hand-off.
struct ProjectApplication
{
    std::string Key;                  // [-] - Stable selection key ("frontier-editor"); persisted, never displayed
    std::string Name;                 // [text] - Displayed application name
    std::string Summary;              // [text] - One line describing the surface this application presents
    std::string Executable;           // [text] - Package-relative executable the host starts for this application
    bool        ExecutableBundled = true;   // [-] - False when the catalogue lists a surface this package does not ship
};

//------------------------------------------------------------------------------------------------------------------------
//                                                    PUBLIC FUNCTIONS
//------------------------------------------------------------------------------------------------------------------------

// Every application the launch step offers, most-specific-to-the-editor first. Order is presentation order.
[[nodiscard]] std::vector<ProjectApplication> QueryProjectApplications();

// Case-sensitive lookup by Key; returns nullptr for an unknown key.
[[nodiscard]] const ProjectApplication *FindProjectApplication(const std::string &Key) noexcept;

// The application a project opens with when the operator never leaves the default row.
[[nodiscard]] std::string QueryDefaultProjectApplicationKey();

} // namespace Frontier
