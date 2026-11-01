# Frontier & Project Everest — Windows x64 Binaries (Vulkan GPU Compute)

This directory contains native Windows x64 (`x86_64-windows-gnu`, PE32+ GUI) executables for **Frontier** and **Project Everest**, powered by real-time **Vulkan GPU compute** (`EverestSceneEncoding.spv`, `1280x720` hardware `VkImageView` presented directly via `ImGui_ImplVulkan_AddTexture`):

1. **`Frontier.exe`** — Full **Frontier Editor** (Project Browser + Docked Editor Workspace):
   - Launch `Frontier.exe` from the repository root (or from the extracted `Frontier-Everest-Windows-x64.zip` folder).
   - Open **Project Everest** (`Projects/Everest/Everest.projectspace`) to inspect the coupled **PlanetaryAtmosphere + ReSTIR GI** proving-grounds scene with **5 static automotive-flake `ControlVehicle` cars** (Green, Yellow, Blue, Red, Orange) in the docked Editor viewport.
   - Click **`Game Mode (F11)`** on the top toolbar (or press **`F11`**) at any time to switch between the docked **Editor Mode** and full-screen **Game Mode**.

2. **`EverestGame.exe`** — Standalone **Project Everest Game Mode** executable:
   - Launches directly into the full-screen **Game Mode** viewport across the entire window, rendered on the GPU via Vulkan compute.
   - Orbit the camera with **Right-Mouse Drag** (`RMB`), zoom with the **Mouse Wheel**, and toggle back to the docked **Editor Mode** at any time with **`F11`** or **`Esc`** (or the top-right **`Editor Mode (F11 / Esc)`** button).

## Runtime Content Search Path

When launched from either the repository root or `Binaries/Windows-x64/`, both executables automatically walk up their parent directories to locate:
- `EngineContent/Icons`
- `EngineContent/FontArchives`
- `EngineContent/GeometryArchives/ControlVehicle{Body,Rim,Tyre}.facet`
- `EngineContent/ShaderArchives`
- `Projects/Everest/Everest.projectspace`
