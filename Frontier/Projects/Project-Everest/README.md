# Project Everest

The project the VehicleHMI port lands in: one project folder the browser lists, opened by an application the
operator selects, presenting the editor shell the demo defined (Outliner · Viewport · Inspector) with the
production Log Stream under the Outliner.

| File | Role |
|---|---|
| `ProjectEverest.frontier` | Descriptor the host decodes: name, content location, opening scene, code image, declared log categories |
| `ProjectEverest.projectspace` | Container the project browser's card grid opens: workspace appearance, input, notifications, levels |
| `Contract/` | Interface contract the project's code image must satisfy |
| `Content/` | Project-owned user content (`ContentLocation`) |
| `Saved/` | Ignored: workspace layout and session logs written by the host |

## Why this project exists

The demo (`Frontier/Projects/Project-VehicleHmiDemo/Reference/index.html`) is the port source of truth for the
editor shell. Project Everest is the **opened** side of that shell in C++: the project browser selects it, the
application step decides which surface opens it, and the session workspace composes production panels only.

Three elements are reusable components every project inherits rather than authors:

- **Sun, Atmosphere, Clouds, Fog, Wind** — `Engine/Scene/EnvironmentRecords.h`. Constructing one registers it in
  the Outliner and registers the Inspector description its own fields are bound to.
- **Viewport, Outliner, Inspector, Log Stream** — production panels owned by the interface layer, not the project.

A vehicle, a tyre rig, a fracture set or a fluid emitter is **user-authored**: the project spawns those records
itself, and each record type supplies its own Inspector description (and, where one exists, its dedicated editor).

## Opening it

```text
Frontier (no arguments)      →  Project Browser
  select Project Everest     →  select application (Frontier Editor | Texture Workspace)
                             →  launch  →  Project Everest session
```

`Frontier --project=Frontier/Projects/Project-Everest/ProjectEverest.frontier` skips the browser and opens the
session directly; the headless route `--headless` prints the decoded descriptor and the session counts.
