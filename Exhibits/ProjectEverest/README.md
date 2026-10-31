# Project Everest — UI launch flow and session (exhibit)

This exhibit proves the first deliverable of the VehicleHMI → Vulkan port: **the editor UI and its launch flow**,
for the project **Project Everest**. Nothing in this exhibit is a mock-up — a real `ProjectBrowserHost` enumerates
the projects on disk, `ProjectLaunchSelection` performs the two-step choice, `ProjectSessionWorkspace` builds the
production dockspace out of the production panels, and the Control Centre is the same drawer the editor ships.

## Reproduce

```bash
python3 Automation/PrepareUI.py
python3 Automation/PrepareFonts.py
cmake -S . -B Build/Verify -G Ninja -DFRONTIER_HOST_VERIFICATION=ON -DCMAKE_BUILD_TYPE=Release \
      -DGLFW_BUILD_WAYLAND=OFF -DGLFW_BUILD_X11=OFF
cmake --build Build/Verify --target ProjectEverestSessionValidation -j2
./Build/Verify/ProjectEverestSessionValidation EngineContent "$PWD" /tmp/pe-evidence
```

Exit code is 0 only if every state assertion holds; the eight captures land in `/tmp/pe-evidence`. The run works on
a throwaway copy of `Frontier/Projects` (created inside the evidence directory) because a launched session writes its
layout and appearance preferences back into the project — a validation run must not touch tracked files.

The `.ppm` files are the exact framebuffer output of `FrontierExhibit::RasterizeCommands`; convert them with
`python3 -c "from PIL import Image; Image.open(f).save(f.replace('.ppm','.png'))"`.

## What each capture proves

| Capture | Claim |
| --- | --- |
| `01-ProjectBrowser.png` | The browser lists the eight real descriptors on disk, each card showing scene, log-category count, content presence and its own path. With nothing selected the commit button is disabled and the footer reads *no project selected*. |
| `02-ApplicationSelection.png` | The launch is two-step — a project **and** an application. `Project Everest` is selected (accent ring), `Frontier Editor` is the chosen application, `Slate Project Drive` is shown but disabled because it is not bundled with this package, and the footer commits the pair. |
| `03-ProjectSession.png` | The launched session: Outliner (captioned **Project Everest**, 6 records across Environment / TerrainField / Vehicle), Viewport stacked over the **Log Stream** (15 entries, 2 warnings, 0 errors, channels/filter/following controls, footer transfer counters), Inspector empty-state instructing the user to select a record. Three columns, one dockspace. |
| `04-InspectorSun.png` | Selecting a record builds the inspector from that record's `RecordEditorDescription` — the Sun page with its enable switches and scalar fields, i.e. inspectors are generated per record, not hard-coded pages. |
| `05-ControlCentreDrawer.png` | The Control Centre drawer opens over the live session and exposes its quick controls. |
| `06-ControlCentreApplyConfirmation.png` | Appearance → Theme shows the theme tile grid with **Dim** selected; the footer *Apply* raises the confirmation dialogue *“Apply changes?”* — a preference change is never committed by a single click. |
| `07-ControlCentreAppliedTheme.png` | Confirming the dialogue writes the preference and the Control Centre re-themes itself in the **Dim** palette. |
| `08-SessionAppliedTheme.png` | Closing the sheet shows the session itself in the Dim palette with the *Preferences saved · Saved to projectspace* toast — the theme is a live application preference, not a preview. |

The run summary printed on success:

```
session: Project Everest
  directory <evidence>/Projects/Project-Everest
  records 6
  declared log categories 3
  visible log rows 15
  layout restored no
layout saved: yes
```

`layout restored no` is expected on a fresh copy: the first launch writes
`Projects/Project-Everest/Saved/WorkspaceLayout.toml`, and a second run restores it.

## What is deliberately absent

No renderer, no shader, no fake frame. The viewport is a surface sheet that states the plan: hardware ray-query
ReSTIR GI on RTX-class GPUs, signed-distance-field geometry with BVH-accelerated reflections on the fallback path.
The renderer hand-off is the last phase of `Documentation/Plans/ProjectEverestUiPortPlan.md`.
