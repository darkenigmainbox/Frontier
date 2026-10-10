// StackPanel — the two layer stacks.
//
// A stack is read bottom of the list last: the topmost row is evaluated first and everything under
// it composites on top, which is the order a geologist would describe and the order the solver
// walks. Rows carry their own visibility, and dragging one re-orders the evaluation.

import { Icon, KindIcon } from "./ActionIcon.js";
import {
  MakeTerrainLayer, MakeTextureLayer, TerrainKinds, TextureKinds,
} from "./HeightSpecification.js";

export class StackPanel {
  constructor(Root, Store) {
    this.Root = Root;
    this.Store = Store;
    this.Drag = null;
    Root.innerHTML = `
      <div class="stack-heading">
        <h1>Layers</h1>
        <small data-count></small>
        <span class="spacer"></span>
        <button data-act="add" title="Add a layer">${Icon("plus", 16)}</button>
      </div>
      <div class="stack-tabs">
        <div class="viewport-modes" role="tablist">
          <button data-tab="Terrain">Terrain</button>
          <button data-tab="Texture">Texture</button>
          <button data-tab="World">World</button>
        </div>
      </div>
      <div class="stack-rows" data-rows></div>
      <div class="stack-footer">
        <button data-act="add">${Icon("plus", 13)} Add</button>
        <button class="icon" data-act="copy" title="Duplicate">${Icon("copy", 13)}</button>
        <button class="icon" data-act="up" title="Move up">${Icon("up", 13)}</button>
        <button class="icon" data-act="down" title="Move down">${Icon("down", 13)}</button>
        <span class="spacer"></span>
        <button class="icon" data-act="remove" title="Delete">${Icon("trash", 13)}</button>
      </div>`;

    this.Rows = Root.querySelector("[data-rows]");
    this.Count = Root.querySelector("[data-count]");

    Root.addEventListener("click", (E) => {
      const Tab = E.target.closest("[data-tab]");
      if (Tab) { Store.SetTab(Tab.dataset.tab); return; }
      const Act = E.target.closest("[data-act]");
      if (Act) { this.Act(Act.dataset.act); return; }
      const Eye = E.target.closest("[data-eye]");
      if (Eye) {
        const L = this.Current().find((X) => X.Id === Eye.dataset.eye);
        if (L) { L.Enabled = !L.Enabled; Store.Touch(Store.Tab); this.Render(); }
        return;
      }
      const Row = E.target.closest("[data-row]");
      if (Row) Store.Select(Row.dataset.row);
    });

    this.Rows.addEventListener("dragstart", (E) => {
      const Row = E.target.closest("[data-row]");
      if (!Row) return;
      this.Drag = Row.dataset.row;
      Row.classList.add("dragging");
      E.dataTransfer.effectAllowed = "move";
      E.dataTransfer.setData("text/plain", this.Drag);
    });
    this.Rows.addEventListener("dragover", (E) => {
      E.preventDefault();
      const Row = E.target.closest("[data-row]");
      for (const R of this.Rows.children) R.classList.remove("over");
      if (Row && Row.dataset.row !== this.Drag) Row.classList.add("over");
    });
    this.Rows.addEventListener("drop", (E) => {
      E.preventDefault();
      const Row = E.target.closest("[data-row]");
      if (Row && this.Drag) this.Move(this.Drag, Row.dataset.row);
      this.Drag = null;
      this.Render();
    });
    this.Rows.addEventListener("dragend", () => {
      this.Drag = null;
      this.Render();
    });
  }

  Current() {
    return this.Store.Tab === "Texture" ? this.Store.Scene.Texture : this.Store.Scene.Terrain;
  }

  Move(From, Onto) {
    const List = this.Current();
    const A = List.findIndex((L) => L.Id === From);
    const B = List.findIndex((L) => L.Id === Onto);
    if (A < 0 || B < 0 || A === B) return;
    const [Moved] = List.splice(A, 1);
    List.splice(B, 0, Moved);
    this.Store.Touch(this.Store.Tab);
  }

  Act(What) {
    const Store = this.Store;
    if (Store.Tab === "World") {
      if (What === "add") Store.SetTab("Terrain");
      return;
    }
    const List = this.Current();
    const Index = List.findIndex((L) => L.Id === Store.Selected[Store.Tab]);

    if (What === "add") { Store.OpenPicker(); return; }
    if (Index < 0 && What !== "add") return;

    if (What === "remove") {
      List.splice(Index, 1);
      Store.Select(List.length ? List[Math.min(Index, List.length - 1)].Id : null);
    } else if (What === "copy") {
      const Clone = JSON.parse(JSON.stringify(List[Index]));
      Clone.Id = `L${Math.random().toString(36).slice(2, 9)}`;
      Clone.Name = `${Clone.Name} copy`;
      List.splice(Index + 1, 0, Clone);
      Store.Select(Clone.Id);
    } else if (What === "up" && Index > 0) {
      List.splice(Index - 1, 0, List.splice(Index, 1)[0]);
    } else if (What === "down" && Index < List.length - 1) {
      List.splice(Index + 1, 0, List.splice(Index, 1)[0]);
    }
    Store.Touch(Store.Tab);
    this.Render();
  }

  Render() {
    const Store = this.Store;
    for (const B of this.Root.querySelectorAll("[data-tab]")) {
      B.classList.toggle("active", B.dataset.tab === Store.Tab);
    }
    const Footer = this.Root.querySelector(".stack-footer");
    Footer.style.visibility = Store.Tab === "World" ? "hidden" : "visible";

    if (Store.Tab === "World") {
      this.Count.textContent = "";
      this.Rows.innerHTML = `<div class="stack-empty">
        ${Icon("globe", 22)}
        <p>World settings are in the inspector below — extent, vertical scale, seed, sun, sky and
        water. Switch to <b>Terrain</b> or <b>Texture</b> to work on a stack.</p></div>`;
      return;
    }

    const List = this.Current();
    const Terrain = Store.Tab === "Terrain";
    this.Count.textContent = `${List.length} ${List.length === 1 ? "layer" : "layers"}`;

    if (!List.length) {
      this.Rows.innerHTML = `<div class="stack-empty">
        ${Icon("layers", 22)}
        <p>Nothing here yet. Add a ${Terrain ? "generator" : "coat"} to begin.</p></div>`;
      return;
    }

    this.Rows.innerHTML = List.map((L) => {
      const Entry = Terrain ? TerrainKinds[L.Kind] : TextureKinds[L.Kind];
      if (!Entry) return "";
      const Chosen = L.Id === Store.Selected[Store.Tab];
      const Role = Terrain ? Entry.Role : "Coat";
      const Tone = L.Kind === "Hydraulic" || L.Kind === "Thermal"
        ? "erosion" : (Role === "Modifier" ? "modifier" : "");
      const Under = Terrain
        ? `${Entry.Label} · ${L.Blend}${L.Mask.Source !== "None" ? ` · ${L.Mask.Source} mask` : ""}`
        : `${Entry.Label} · ${Math.round(L.Opacity * 100)}%`;
      return `<div class="stack-row ${Chosen ? "selected" : ""} ${L.Enabled ? "" : "muted"}"
                   data-row="${L.Id}" draggable="true" tabindex="0">
        <span class="grip">${Icon("grip", 12)}</span>
        <button class="eye" data-eye="${L.Id}" title="${L.Enabled ? "Hide" : "Show"}">
          ${Icon(L.Enabled ? "eye" : "eye-off", 14)}</button>
        ${Terrain ? "" : `<span class="dot" style="width:11px;height:11px;border-radius:50%;flex:none;
          background:${L.Colour};box-shadow:inset 0 0 0 1px #0006"></span>`}
        <span class="identity"><b>${Escape(L.Name)}</b><small>${Escape(Under)}</small></span>
        ${Terrain ? `<span class="chip ${Tone}">${Role}</span>` : KindIcon(Entry.Glyph, 13)}
      </div>`;
    }).join("");
  }
}

export function PickerContents(Tab) {
  const Table = Tab === "Texture" ? TextureKinds : TerrainKinds;
  return Object.entries(Table).map(([Key, Entry]) => ({
    Key,
    Label: Entry.Label,
    Role: Tab === "Texture" ? "Coat" : Entry.Role,
    Blurb: Entry.Blurb,
  }));
}

export function MakeLayer(Tab, Kind) {
  return Tab === "Texture" ? MakeTextureLayer(Kind) : MakeTerrainLayer(Kind);
}

export function Escape(Text) {
  return String(Text).replace(/[&<>"']/g, (C) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[C]));
}
