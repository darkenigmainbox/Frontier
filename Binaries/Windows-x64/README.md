# Frontier & Project Everest — Windows x64 PC Binaries

## Included Executables
- **`Frontier.exe`** (Editor Mode + Project Browser):
  - Opens the Frontier Project Browser with **Everest** pre-attached.
  - Launching **Everest** opens the **Editor Mode** workspace with the docked 3D Scene Viewport (`EverestSceneEncoding`), Outliner (`22` records), Inspector, and Log Stream.
  - Click **`Game Mode (F11)`** in the top toolbar (or press **`F11`**) at any time to switch to full-screen Game Mode, and press **`F11`** or **`Esc`** (or click **`Editor Mode (F11 / Esc)`**) to return to the docked Editor layout.
- **`EverestGame.exe`** (Standalone Game Mode):
  - Launches **Project Everest** directly into the **full-screen Game Mode** 3D viewport (`EverestSceneEncoding` + `EverestCourseScene` with 5 metallic-flake `ControlVehicle` showcase cars, ReSTIR GI, and coupled `PlanetaryAtmosphere`).
  - Press **`F11`** or **`Esc`** at any time to toggle between full-screen Game Mode and the docked Editor Mode.

## Running on Windows x64
Requires a Vulkan-capable Windows 10/11 x64 GPU driver (`vulkan-1.dll`).
- You can run `Binaries\Windows-x64\Frontier.exe` or `Binaries\Windows-x64\EverestGame.exe` directly in-place from a checkout of this repository (they automatically locate the repository root containing `EngineContent/` and `Projects/Everest/`), or extract `Binaries/Frontier-Everest-Windows-x64.zip` to any folder and run `Frontier.exe` or `EverestGame.exe` from there.
