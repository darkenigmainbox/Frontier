/*==========================================================================================================================================
                                                         WINDOWSEVERESTGAME.CPP
                                     ------------------------------------------------------------------
                 Standalone Windows Game Mode executable for Project Everest. Opens directly into the full-screen
                 Everest 3D viewport rendered on the GPU via Vulkan compute (EverestSceneEncoding: coupled
                 PlanetaryAtmosphere + ReSTIR GI + 5 automotive-flake ControlVehicle showcase cars).
                 Press F11 to toggle between Game Mode (full-screen viewport) and Editor Mode (docked viewport).
==========================================================================================================================================*/

#ifndef GLFW_INCLUDE_NONE
#define GLFW_INCLUDE_NONE
#endif
#define GLFW_EXPOSE_NATIVE_WIN32
#ifndef FRONTIER_BUILD_COMMIT
#define FRONTIER_BUILD_COMMIT "local"
#endif

#include "Engine/Diagnostics/DiagnosticJournal.h"
#include "Engine/Interface/IconPresentation.h"
#include "Engine/Interface/VulkanPresentation.h"
#include "Engine/Interface/WindowsApplication.h"
#include "EverestWorkspace.h"
#include "UI/Editor/ControlCentrePanel.h"

#include <windows.h>
#include <GLFW/glfw3.h>
#include <GLFW/glfw3native.h>
#include <imgui.h>
#include <imgui_impl_vulkan.h>

#include <filesystem>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>

int main()
{
    Frontier::DiagnosticJournal::Initialize("EverestGame");
    Frontier::DiagnosticJournal::Append("Startup", "Everest Game Mode (Full-Screen GPU Vulkan Viewport)");

    Frontier::ActivationOwnership               AppearanceOwnership;
    Frontier::ControlCentrePanel*               Appearance = nullptr;
    std::unique_ptr<Everest::EverestWorkspace>  EverestSpace;
    std::map<VkImageView, VkDescriptorSet>      ViewportDescriptors;
    GLFWwindow*                                 Window = nullptr;
    std::filesystem::path                       Preferences;

    const auto Describe = [&](VkImageView View) -> uint64_t
    {
        if (!View)
        {
            return 0u;
        }
        const auto Cached = ViewportDescriptors.find(View);
        if (Cached != ViewportDescriptors.end())
        {
            return reinterpret_cast<uint64_t>(Cached->second);
        }
        const VkDescriptorSet Descriptor = ImGui_ImplVulkan_AddTexture(View, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL);
        ViewportDescriptors.emplace(View, Descriptor);
        return reinterpret_cast<uint64_t>(Descriptor);
    };

    Frontier::ApplicationWindowCallbacks Callbacks;
    Callbacks.Title      = "Everest — Game Mode [" FRONTIER_BUILD_COMMIT "]";
    Callbacks.Initialize = [&](GLFWwindow* Current)
    {
        Window = Current;
        wchar_t Executable[MAX_PATH] = {};
        if (GetModuleFileNameW(nullptr, Executable, MAX_PATH))
        {
            const std::filesystem::path ExeDir = std::filesystem::path(Executable).parent_path();
            for (const auto& CandidateRoot : {
                     std::filesystem::current_path(),
                     ExeDir,
                     ExeDir.parent_path(),
                     ExeDir.parent_path().parent_path()})
            {
                std::error_code Ec;
                if (std::filesystem::exists(CandidateRoot / "EngineContent" / "Icons", Ec))
                {
                    std::filesystem::current_path(CandidateRoot, Ec);
                    break;
                }
            }
        }

        Frontier::IconPresentation::Attach("EngineContent/Icons");

        const auto* Local = _wgetenv(L"LOCALAPPDATA");
        Preferences       = Local ? std::filesystem::path(Local) / "Frontier/Personal.projectspace" : std::filesystem::path{};

        const std::filesystem::path EverestProjectPath = "Projects/Everest/Everest.projectspace";
        AppearanceOwnership.reset(new Frontier::ControlCentrePanel("EngineContent/FontArchives", Preferences, EverestProjectPath));
        Appearance = static_cast<Frontier::ControlCentrePanel*>(AppearanceOwnership.get());
        if (!Appearance->Initialize() || !Appearance->Activate())
        {
            throw std::runtime_error("Everest appearance initialization failed: " + Appearance->QueryDiagnostic());
        }

        EverestSpace = std::make_unique<Everest::EverestWorkspace>(*Appearance, EverestProjectPath.parent_path());
        // Launch directly into full-screen Game Mode viewport.
        EverestSpace->SetGameModeFullscreen(true);
    };

    Callbacks.InitializeVulkan = [&](Frontier::VulkanPresentation& Display)
    {
        if (EverestSpace)
        {
            (void)EverestSpace->InitializeGpu(Display.QueryRasterAccess(), Describe);
        }
        Display.ConfigureRendering(
            [&](VkCommandBuffer Commands, uint64_t /*Completed*/, uint64_t /*Serial*/)
            {
                if (EverestSpace)
                {
                    EverestSpace->ConstructGpuCommands(Commands);
                }
            },
            []() {});
    };

    Callbacks.PrepareInterface = [&]() { Appearance->PrepareInterface(); };
    Callbacks.RecoverWindows   = [&]()
    {
        if (EverestSpace)
        {
            EverestSpace->QueryDockspace().RecoverPlatformWindows();
        }
    };
    Callbacks.ConfigurePlatform = [&]()
    {
        if (EverestSpace)
        {
            (void)EverestSpace->ConfigurePlatform();
        }
    };
    Callbacks.ConstructInterface = [&](bool MainVisible)
    {
        if (!EverestSpace)
        {
            return;
        }
        (void)Appearance->Integrate(ImGui::GetIO().DeltaTime);
        EverestSpace->ConstructInterface(ImGui::GetIO().DeltaTime);
        if (MainVisible)
        {
            Appearance->ConstructInterface();
        }
    };
    Callbacks.Finalize = [&]()
    {
        for (const auto& Entry : ViewportDescriptors)
        {
            if (Entry.second)
            {
                ImGui_ImplVulkan_RemoveTexture(Entry.second);
            }
        }
        ViewportDescriptors.clear();
        EverestSpace.reset();
        AppearanceOwnership.reset();
        Frontier::DiagnosticJournal::Append("Shutdown", "EverestGame resources reclaimed");
    };

    return Frontier::RunWindowsApplication(Callbacks);
}
