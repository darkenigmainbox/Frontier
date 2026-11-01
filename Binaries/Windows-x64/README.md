# Frontier & Everest — Windows x64 PC Binaries (GPU Vulkan Compute)

## Download & Run Instructions

1. **Recommended Self-Contained Bundle (`Frontier-Everest-Windows-x64.zip`)**:
   - Download [`Binaries/Frontier-Everest-Windows-x64.zip`](../Frontier-Everest-Windows-x64.zip) (`7.2 MB`), extract it anywhere on your Windows 10/11 x64 PC, and double-click **`EverestGame.exe`** (or **`Frontier.exe`**).
2. **Running Directly From Your Cloned Repository**:
   - If you already cloned `darkenigmainbox/Frontier` on branch `arena/4db057b0-frontier`, ensure `EngineContent/FontArchives` is populated (`python Automation/PrepareFonts.py`), then launch either:
     - `Binaries\Windows-x64\EverestGame.exe` — launches directly into **Game Mode** (full-screen GPU Vulkan compute viewport).
     - `Binaries\Windows-x64\Frontier.exe` — launches into the **Frontier Editor** (docked viewport, Outliner, Inspector, LogStream, and Control Centre).

## Unreal Engine Viewport Camera Controls

- **Right-Mouse Button (RMB) Hold + Mouse Move** (or **Left-Mouse Drag**): Free-look yaw & pitch rotation.
- **W / A / S / D** (or **Arrow Keys**): Fly forward, strafe left, backward, strafe right.
- **E / Q** (or **Space / C**): Move vertically up (`+Z`) / down (`-Z`).
- **Left Shift / Right Shift**: `2.5x` Sprint speed multiplier.
- **Mouse Wheel while holding RMB**: Adjusts camera fly speed (`1.5 m/s` to `45 m/s`).
- **Mouse Wheel (without RMB)**: Dollies camera forward/backward along view direction.
- **Middle-Mouse Button (MMB) Drag**: Pans camera laterally and vertically.
- **F11**: Toggle between **Game Mode** (full-screen viewport) and **Editor Mode** (docked panels).
