# claude.md — Project Everest session memory

> Read `CLAUDE.md` **first**. It holds the Frontier conventions (Vulkan + Slang primary, toml++ for every
> serialised format, GLFW without an OpenGL context, `ExternalPackages/` for dependencies, evidence lives in
> `Exhibits/`, skills live in `EngineDocs/AgenticInstuctions/`). This file does not repeat those rules; it records
> the *Project Everest* decisions and the source branches they came from, so a new session does not need them
> spelled out again.

## What is being built

Port of the **VehicleHMI** demo (WebGPU/WebGL, ReSTIR GI + ray tracing) to a native **Vulkan C++** engine inside
Frontier. Two renderer paths must both exist in the port:

| Path | Target hardware | Technique | Status in the sources |
| --- | --- | --- | --- |
| RTX / high-end | ray-tracing capable Vulkan GPU | `VK_KHR_acceleration_structure` + ray queries, ReSTIR GI | ray-query backend exists (`Engine/Rendering/PathReplayRayQuery.*`), verified for SPIR-V only |
| GTX / fallback | anything without RT cores | signed-distance-field scene with BVH-accelerated reflections | the shipped compute path, 11/11 offscreen ReSTIR CTests on SwiftShader |

**Current phase: UI only.** Nothing from the renderer is ported yet, and no binaries are produced. Correctness is
proven by rendered exhibits (`Exhibits/ProjectEverest/`), one PNG per claim, each reproducible from a command in
the exhibit README.

## Source branches

All three were read in full before any code was written. They cover the renderer/ray-tracing research; **none of
them contains a completed UI port**, which is why the UI branch below is the base.

| # | Branch | Tree | What it contributes |
| --- | --- | --- | --- |
| 1 | `streamlinkinbox/Frontier` | `arena/08e7de48-frontier` | inherited-engine work (5307 files): retained plans under `Documentation/Plans/References/InheritedEngine/`, `Exhibits/LightCompute/*`, physics/tyre experiments. Source of the ray-tracing problem statement; no `UI/Editor/` port. |
| 2 | `streamlinkinbox/Frontier` | `arena/5ec53579-frontier` | `Docs/VehicleHmiEnginePlan.md`, `Experimental/VehicleHmiReference/`, first LogStream exhibits, fluid / light / vehicle-physics exhibits (3146 files). Source of the VehicleHMI behaviour the port must reproduce. |
| 3 | `egoistm1inbox/Frontier` | `arena/9ce908bc-frontier` | most advanced renderer + ReSTIR evidence: `Exhibits/LightCompute/ProductionReSTIR.md`, `Exhibits/RecoveryAudit/RendererStatus.md`, `Exhibits/VehicleHmiShowcase/`, **`Exhibits/LogStream/`** (`README.md`, `PARITY.md`, `LogStreamValidation.cpp`, `PanelCapture.cpp`), `Frontier/Projects/Project-Drive/`. Source of the **LogStream** panel and the SceneDirectory / SceneInspector layer. |

Branch-of-record for the UI and reusable components (must be kept in sync, see below):

- `https://github.com/SultanAladin/Frontier/tree/arena/11f31835-frontier`

### How this working tree is composed

`main-ui` (branch of record) is the **base**: it is the only branch with a complete `Experimental/` + `UI/`
tree, a buildable `CMakeLists.txt`, and the ImGui PatchH docking fix. Onto it, the logstream tree was overlaid
for four directories only:

```
Frontier/ Documentation/ Docs/ Exhibits/
```

Conflicts were resolved as **strict supersets** — where main-ui has a newer version of a shared file it wins,
except where the logstream variant carries a panel the UI needs (`LogStreamPanel*`, `SceneDirectoryPanel*`,
`SceneInspectorPanel`, `EnvironmentRecords`). Do not wholesale-port main-ui's `FrontierMain.cpp` or
`SceneDirectoryPanel.cpp`: they dropped the inspector, the environment records, and the Sun / Atmosphere / Cloud /
Fog / Wind entities.

Superset patches carried over from main-ui that this tree depends on: `PatchH-*.patch` (registered in
`Automation/ApplyImGuiPatches.py`), `PanelDockspaceLayout.cpp` (accept saved layouts that contain unregistered
panel keys), `PanelDockspace.cpp` (`Visited` set + depth guard; without it a corrupt layout recurses forever),
`Engine/Interface/WindowsApplication.cpp` (try/catch around `ConstructInterface`), `ControlCentrePanel.{h,cpp}`
(drawer interactivity, focus transfer, FPS badge).

## Standing instructions from the user

1. **The UI comes first — before anything else.** No renderer, no binaries, no asset pipeline until the editor
   UI and its launch flow are proven by exhibits.
2. The project is named **Project Everest** everywhere (descriptor, window titles, outliner caption, docs).
3. The launch flow must match Frontier conventions: project browser → choose the application → open the project →
   editor UI with the LogStream docked. Reusable components, the docking system and the Control Centre come from
   the branch of record; LogStream comes from branch 3.
4. After **every** commit, sync the branch of record:

   ```bash
   git push origin arena/500c25b9-frontier
   git push sultan HEAD:arena/11f31835-frontier
   ```

5. Keep the record of all three branches above. Do not ask the user to restate these instructions — they are
   written down here on purpose.

## User-authored and pinned entities

Entities the user authors by hand are documented here and **pinned**: their stable IDs, record classifications and
editor descriptions must not be regenerated or renamed by a later session.

| Entity | Group | Record classification | Dedicated editor | Notes |
| --- | --- | --- | --- | --- |
| `ControlVehicle` | Vehicle | `Vehicle` (pink) | *Vehicle editor (planned)* | user-authored; the VehicleHMI asset the whole port reproduces. Pinned — never auto-create a second one. |
| `Sun` | Environment | `Illumination` (purple) | — (reusable component) | reusable; no per-project re-authoring |
| `Atmosphere` | Environment | `Illumination` | — (reusable) | reusable |
| `Clouds` | Environment | `Illumination` | — (reusable) | reusable |
| `Fog` | Environment | `Weather` (blue) | — (reusable) | reusable |
| `Wind` | Environment | `Weather` | — (reusable) | reusable |

Rule: reusable environment components are created once by the engine and need no re-creation per project. Anything
the *user* creates (vehicles, fractures, fluids, particle systems) is a hand-authored record: it registers itself in
the outliner and its inspector in its constructor, and unregisters in its destructor. See
`Documentation/Plans/ProjectEverestUiPortPlan.md`.

## Where things live

| Path | Purpose |
| --- | --- |
| `Frontier/Projects/Project-Everest/ProjectEverest.frontier` | project descriptor (`EverestBasecamp`, interface fingerprint `0xb6725f24d0869173`, log categories Vehicle/pink, Weather/blue, Illumination/purple) |
| `Frontier/Projects/Project-Everest/ProjectEverest.projectspace` | personal preferences, validated by `ProjectSpaceCodec` (`levels = []`, `startup_level = ""` are required; non-table `levels` rows hard-fail Control Centre init) |
| `Frontier/UI/Editor/ApplicationCatalogue.*`, `ProjectLaunchSelection.*`, `ProjectLaunchPanel.*` | the two-step launch (project then application) |
| `Frontier/UI/Editor/ProjectSessionWorkspace.*` | the launched editor session: dockspace, panels, log traffic, layout persistence |
| `Frontier/Exhibits/ProjectEverest/Code/ProjectEverestSessionValidation.cpp` | the exhibit that renders every claim below |
| `Frontier/Exhibits/ProjectEverest/Evidence/` | the eight captures |
| `Documentation/Plans/ProjectEverestUiPortPlan.md` | what is ported next, and the entity model |

## Build and evidence recipe (sandbox)

```bash
python3 Automation/PrepareUI.py && python3 Automation/PrepareFonts.py
cmake -S . -B Build/Verify -G Ninja -DFRONTIER_HOST_VERIFICATION=ON -DCMAKE_BUILD_TYPE=Release \
      -DGLFW_BUILD_WAYLAND=OFF -DGLFW_BUILD_X11=OFF
cmake --build Build/Verify --target ProjectEverestSessionValidation -j2
./Build/Verify/ProjectEverestSessionValidation EngineContent "$PWD" /tmp/pe-evidence   # exit 0, eight captures
```

Known traps: `pip` needs `--break-system-packages`; ImGui taps need hover → press → release spread over separate
frames; a footer **Apply** in the Control Centre only opens the confirmation dialogue — the preference is written
when the dialogue's primary button is pressed; extents read right after a page swap are stale (settle ≈90 frames
after Settings/Appearance, ≈30 after a tab switch, ≈12 after a tile edit). The exhibit never writes to tracked
project files: it copies `Frontier/Projects` into the evidence directory and works there.
