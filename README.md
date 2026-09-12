# Frontier

Frontier is the Vulkan-based rendering and simulation workspace used by Project Zero. The celestial/weather port
lives in the engine presentation layer and is assembled by `Projects/Project-Zero/Source/CelestialSequence.{h,cpp}`.

## Project Zero celestial port

The native sequence owns the solved sun and moon ephemeris, analytic atmosphere, stars, cloud and local-volume
marches, wind advection, precipitation, rainbows, lens flare, height fog, aerial perspective, terrain/camera/post
presentation state, and the editor write-back sheets. The same sky/weather record is sent to both the CPU visibility
raster and the ReSTIR shader.

The browser reference panel from SultanAladin/Frontier- is preserved at
`Projects/Project-Zero/Content/Celestial/CelestialPanel.html`; its asset path points at the single native moon atlas
under `EngineContent/CelestialTextures/`. See the adjacent `README.md` for a quick local preview command.

## Checks

From the repository root:

```bash
bash Scratchpad/CheckCelestialFog.sh
bash Scratchpad/CheckCelestialScene.sh
bash Scratchpad/CheckVolumetricMedia.sh
bash Scratchpad/CheckSkyKernel.sh
bash Scratchpad/CheckPostKernel.sh
```

A native build needs the external submodules, Vulkan SDK and the platform toolchain. On Linux, use
`bash Projects/Project-Zero/Build/ToolchainSequence.sh`; on Windows use the PowerShell toolchain script rather than
CMake, as documented in `CLAUDE.md`.
