# Project Everest — UI port plan

Status: **UI first, renderer later.** This document is the plan for the rest of the editor UI port, and the
contract every editor entity follows. It is written against the tree described in `claude.md`
(base = `SultanAladin/Frontier@arena/11f31835-frontier`, LogStream + scene layer overlaid from
`egoistm1inbox/Frontier@arena/9ce908bc-frontier`).

## 1. What already exists

| Piece | Source | Proven by |
| --- | --- | --- |
| Project browser, two-column cards, application rail, footer commit | this tree (`UI/Editor/ProjectLaunchPanel.*`) | `01-ProjectBrowser.png`, `02-ApplicationSelection.png` |
| Launch hand-off (`ProjectLaunchRequest` → session) | this tree (`ProjectLaunchSelection.*`, `ApplicationCatalogue.*`) | launch line printed by the exhibit; `03` |
| Editor session: dockspace, Outliner, Viewport, Log Stream, Inspector | branch 3 (`PanelDockspace`, `LogStreamPanel*`, `SceneDirectoryPanel*`, `SceneInspectorPanel`) | `03-ProjectSession.png` |
| Layout persistence (`<Project>/Saved/WorkspaceLayout.toml`) | branch 3 | `layout saved: yes` in the run summary |
| Sun inspector (dedicated record editor) | branch 3 + `EnvironmentRecords` | `04-InspectorSun.png` |
| Control Centre drawer + quick controls (theme scope) | branch of record (`ControlCentrePanel`) | `05-ControlCentreDrawer.png` |
| Appearance → Theme tiles → confirmation → applied theme | branch of record | `06`, `07`, `08` |

Everything above is host-verified: `ProjectEverestSessionValidation` exits 0 and fails loudly if any claim in the
sequence stops being true (`Require(...)` on every state transition, not on pixels).

## 2. The entity model (the contract for everything below)

Every object the user can create in the editor is a **record**, not a UI special case. The panel layer never knows
about concrete entity types; it renders `RecordEditorDescription`s out of a `SceneDirectory`.

```
RecordEntry                       (Frontier/Engine/Scene/RecordEntry.h)
 ├─ StableId            : RecordToken (uint64)      // identity for save/load and selection
 ├─ Group / Category    : strings                   // outliner grouping, log colour category
 ├─ Glyph / Colour                                  // outliner row + log channel
 └─ RecordEditorDescription                         // what the inspector is allowed to draw
     ├─ Enabled*        : bool switches
     ├─ ScalarFields    : {label, value, min, max, step, unit}
     ├─ Switches        : {label, bool}
     └─ DedicatedEditorTitle                        // non-empty → a full editor, not just the inspector
```

Rules, in the order they matter:

1. **A record registers itself.** The constructor writes into the `RecordStore` *and* the `SceneDirectory`
   (outliner) and publishes its editor description; the destructor reverses exactly those three steps. No caller
   may add a record to the outliner by hand — that is how an object ends up in one panel and not the other.
2. **Inspectors are user-created.** An inspector is not a fixed page: it is constructed from the record's
   `RecordEditorDescription` at selection time and destroyed with the selection. Adding a field to an entity must
   never require touching `SceneInspectorPanel`.
3. **Reusable components are engine-owned.** Sun, Atmosphere, Clouds, Fog, Wind are created once by the session and
   are *not* re-created per project; they are selectable, inspectable, and pinned by stable ID (see `claude.md`
   §User-authored and pinned entities).
4. **Dedicated editors are records with `DedicatedEditorTitle`.** Fracture, fluid, particle and vehicle authoring are
   each a real editor that opens on double-click from the outliner, hosted as its own dock panel — never a modal and
   never a page inside the Control Centre.
5. **Every record logs.** Creation, destruction, deserialisation and validation failures go through the record's
   category so the Log Stream shows them with the entity's colour. A silent entity is a bug.

## 3. Port order

Dependencies run top to bottom; each phase ends with one new evidence capture and a `Require(...)` in the exhibit.

### Phase A — complete the launch surface (in progress)

- [x] project browser with real disk enumeration (`ProjectBrowserHost::EnumerateProjects`)
- [x] mandatory second choice (application) before the commit button enables
- [x] log-category registration brought forward from the descriptor (`{{LogCategories}}`)
- [ ] recent projects + last-used application persisted in the projectspace
- [ ] double-click a card to select-and-open; keyboard `Enter`/`Esc` parity with the footer

### Phase B — session shell parity

- [ ] Content Browser as a fifth dock panel (branch of record already has the panel; needs a session dock slot)
- [ ] Stack Rail (right edge) for per-column panel switching instead of only tab bars
- [ ] tab overflow menu, floating panels, "reset layout to declared default"
- [ ] layout versioning: a saved layout from an older panel set must load with unregistered keys dropped
      (the `PanelDockspaceLayout` superset already tolerates this; it needs a test)

### Phase C — scene authoring (the entity model in practice)

- [ ] `SpawnRecord` promoted from the exhibit into a real "Create" menu on the Outliner (group → entity type)
- [ ] record duplication, rename, delete with a confirmation dialogue (destructor must be exercised by the UI)
- [ ] environment records become user-editable: enabling/disabling Sun must re-illuminate and log
- [ ] selection sync in both directions (outliner ⇄ viewport pick ⇄ inspector)
- [ ] undo/redo over record mutation (the `RecordEntry` constructor/destructor pair is the natural transaction)

### Phase D — dedicated editors

| Editor | Record type | Opens from | Scope |
| --- | --- | --- | --- |
| Vehicle | `ControlVehicle` (user-authored, pinned) | outliner double-click | chassis/suspension/tyre params, HMI dashboard binding |
| Fracture | user-authored destructible | outliner double-click | pre-fracture pattern, impulse thresholds, piece budget |
| Fluid | user-authored fluid volume | outliner double-click | emitter shape, viscosity, solver budget |
| Particle | user-authored particle system | outliner double-click | emitter, curve editor, GPU/CPU evaluation |

Each editor is a dock panel, is created only when a record with that `DedicatedEditorTitle` is selected, and is
destroyed when the last such selection closes. None of them may block the main session (no modal editors).

### Phase E — Control Centre coverage

The Control Centre owns *interface* preferences only (branch-of-record rule: it excludes renderer/GI settings).
Still to wire:

- [ ] Appearance → Theme for every scope (Personal / Project) with per-scope confirmation copy
- [ ] Interface → Docking (FPS overlay, notifications) persisted in the projectspace
- [ ] Editor → grid/snapping/units
- [ ] A read-only "Project" page showing descriptor, fingerprint and registered log categories

### Phase F — renderer hand-off (not started, deliberately last)

Only after A–E: the viewport stops being a placeholder sheet and hosts the ReSTIR GI path (ray query on RTX,
SDF + BVH reflections on the fallback). The Log Stream already reserves the `Illumination` category for it.

## 4. Non-goals for this phase

- No shader, renderer, or asset-pipeline work — the viewport sheet states the plan, it does not fake a frame.
- No binaries shipped; the deliverable is the host-verified exhibit.
- No new dependency outside `ExternalPackages/`.

## 5. Definition of done for the UI phase

1. `ProjectEverestSessionValidation` exits 0 and every capture in `Exhibits/ProjectEverest/Evidence/` regenerates.
2. Launching Project Everest from a cold start never requires a hand-edited file.
3. Every dock panel in the session is registered through `PanelDockspace::Register` and survives a layout reload.
4. Creating and destroying each record type from the UI leaves the outliner, inspector and Log Stream consistent.
