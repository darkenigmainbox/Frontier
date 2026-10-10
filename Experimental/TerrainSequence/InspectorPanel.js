// InspectorPanel — the right-hand property sheet.
//
// Nothing here knows what a layer kind is. It walks the field table in HeightSpecification.js and
// draws whatever it finds, which is why adding a parameter to a kind needs no change in this file.

import { Icon } from "./ActionIcon.js";
import { Escape } from "./StackPanel.js";
import {
  BlendModes, MaskSources, PresetNames, TerrainFields, TerrainKinds, TextureFields, TextureKinds,
} from "./HeightSpecification.js";

const Resolutions = [256, 512, 1024, 2048];
const Qualities = ["Draft", "Balanced", "High", "Ultra"];

function Read(Root, Path) {
  return Path.split(".").reduce((O, K) => (O == null ? O : O[K]), Root);
}
function Write(Root, Path, Value) {
  const Keys = Path.split(".");
  const Last = Keys.pop();
  const Owner = Keys.reduce((O, K) => O[K], Root);
  Owner[Last] = Value;
}

function Pretty(Value, Field) {
  if (Field.Type === "select") return Value;
  const N = Number(Value);
  const Step = Field.Step || 0.01;
  const Places = Step >= 1 ? 0 : Math.min(3, String(Step).split(".")[1]?.length || 2);
  const Text = N.toLocaleString("en-GB", { minimumFractionDigits: Places, maximumFractionDigits: Places });
  return Field.Unit ? `${Text}${Field.Unit === "°" ? "" : " "}${Field.Unit}` : Text;
}

function Slider(Path, Field, Value) {
  const Fill = ((Value - Field.Min) / (Field.Max - Field.Min)) * 100;
  return `<label class="field">
    <span>${Escape(Field.Label)}<b data-read="${Path}">${Escape(Pretty(Value, Field))}</b></span>
    <span class="slider-pill"><input type="range" data-path="${Path}" data-kind="number"
      min="${Field.Min}" max="${Field.Max}" step="${Field.Step}" value="${Value}"
      style="--fill:${Fill}%"></span>
    ${Field.Hint ? `<small>${Escape(Field.Hint)}</small>` : ""}
  </label>`;
}

function Chooser(Path, Field, Value) {
  const Options = Field.Options.map(
    (O) => `<option value="${Escape(O)}" ${O === Value ? "selected" : ""}>${Escape(O)}</option>`).join("");
  return `<label class="field">
    <span>${Escape(Field.Label)}</span>
    <select data-path="${Path}" data-kind="text">${Options}</select>
    ${Field.Hint ? `<small>${Escape(Field.Hint)}</small>` : ""}
  </label>`;
}

function Switch(Path, Label, On) {
  return `<div class="switch-row"><span>${Escape(Label)}</span>
    <button class="toggle ${On ? "on" : ""}" data-path="${Path}" data-kind="flag"
      role="switch" aria-checked="${On}"><i></i></button></div>`;
}

function Text(Path, Label, Value) {
  return `<label class="field"><span>${Escape(Label)}</span>
    <input type="text" data-path="${Path}" data-kind="text" value="${Escape(Value)}"
      style="width:100%;height:32px;border-radius:16px;padding:0 13px;font-size:12px;background:#0d0d0d"></label>`;
}

function Swatch(Path, Label, Value) {
  return `<label class="field"><span>${Escape(Label)}</span>
    <span class="swatch-row">
      <input type="color" data-path="${Path}" data-kind="text" value="${Escape(Value)}">
      <input type="text" data-path="${Path}" data-kind="text" value="${Escape(Value)}" spellcheck="false">
    </span></label>`;
}

function Picker(Path, Label, Options, Value) {
  const Body = Options.map((O) =>
    `<option value="${O}" ${String(O) === String(Value) ? "selected" : ""}>${O}</option>`).join("");
  return `<label class="field"><span>${Escape(Label)}</span>
    <select data-path="${Path}" data-kind="${typeof Value === "number" ? "number" : "text"}">${Body}</select></label>`;
}

function Card(Title, Note, Body, Extra = "") {
  return `<section class="property-card">
    <h3>${Escape(Title)}${Extra ? `<em>${Escape(Extra)}</em>` : ""}</h3>
    ${Note ? `<p>${Escape(Note)}</p>` : ""}${Body}</section>`;
}

export class InspectorPanel {
  constructor(Root, Store) {
    this.Root = Root;
    this.Store = Store;
    Root.innerHTML = `<div class="inspector-scroll" data-body></div>
      <footer class="inspector-footer"><span data-left></span><span data-right></span></footer>`;
    this.Body = Root.querySelector("[data-body]");
    this.Left = Root.querySelector("[data-left]");
    this.Right = Root.querySelector("[data-right]");

    const Apply = (Element, Final) => {
      const Path = Element.dataset.path;
      if (!Path) return;
      let Value;
      if (Element.dataset.kind === "number") Value = Number(Element.value);
      else if (Element.dataset.kind === "flag") Value = !Read(this.Subject(), Path);
      else Value = Element.value;

      Write(this.Subject(), Path, Value);

      if (Element.type === "range") {
        const Fill = ((Value - Number(Element.min)) / (Number(Element.max) - Number(Element.min))) * 100;
        Element.style.setProperty("--fill", `${Fill}%`);
        const Mirror = this.Body.querySelector(`[data-read="${CSS.escape(Path)}"]`);
        if (Mirror) Mirror.textContent = Pretty(Value, this.FieldFor(Path));
      }
      if (Element.dataset.kind === "flag") {
        Element.classList.toggle("on", Value);
        Element.setAttribute("aria-checked", String(Value));
      }
      if (Element.type === "color" || (Element.type === "text" && Path.endsWith("Colour"))) {
        for (const Twin of this.Body.querySelectorAll(`[data-path="${CSS.escape(Path)}"]`)) {
          if (Twin !== Element) Twin.value = Value;
        }
      }
      this.Store.Edit(this.Scope(Path), !Final);
      if (Final && (Path === "Name" || Path.startsWith("Mask.Source") || Path === "Blend")) this.Render();
    };

    Root.addEventListener("input", (E) => {
      if (E.target.dataset && E.target.dataset.path) Apply(E.target, false);
    });
    Root.addEventListener("change", (E) => {
      if (E.target.dataset && E.target.dataset.path) Apply(E.target, true);
    });
    Root.addEventListener("click", (E) => {
      const Toggle = E.target.closest(".toggle");
      if (Toggle) { Apply(Toggle, true); return; }
      const Act = E.target.closest("[data-world-act]");
      if (Act) this.Store.WorldAct(Act.dataset.worldAct);
    });
    Root.addEventListener("pointerup", () => this.Store.Settle());
  }

  Subject() {
    return this.Store.Tab === "World" ? this.Store.Scene : (this.Store.Layer() || {});
  }

  Scope(Path) {
    if (this.Store.Tab === "Texture") return "Texture";
    if (this.Store.Tab === "Terrain") return "Terrain";
    if (Path.startsWith("World.Sun")) return "Light";
    if (Path.startsWith("World.Sky") || Path.startsWith("World.Water") || Path.startsWith("World.Render")) return "View";
    return "Terrain";
  }

  FieldFor(Path) {
    const Key = Path.split(".").pop();
    const Layer = this.Store.Layer();
    if (this.Store.Tab === "World") return WorldField(Path) || { Step: 0.01 };
    const List = this.Store.Tab === "Texture"
      ? TextureFields(Layer.Kind) : TerrainFields(Layer.Kind);
    return List.find((F) => F.Key === Key) || { Step: 0.01 };
  }

  Render() {
    const Store = this.Store;
    if (Store.Tab === "World") { this.World(); return; }
    const Layer = Store.Layer();
    if (!Layer) {
      this.Body.innerHTML = `<div class="inspector-heading"><h1>Nothing selected</h1>
        <p class="eyebrow">${Store.Tab} stack</p></div>
        <section class="property-card hint-card"><p>Pick a layer on the left of this panel, or add
        one with the plus button. Every parameter you change rebuilds only the part of the pipeline
        that depends on it.</p></section>`;
      this.Left.textContent = "";
      this.Right.textContent = "";
      return;
    }
    if (Store.Tab === "Terrain") this.Terrain(Layer); else this.Texture(Layer);
  }

  Terrain(Layer) {
    const Entry = TerrainKinds[Layer.Kind];
    const Fields = TerrainFields(Layer.Kind);
    const Body = Fields.map((F) => {
      const Path = `Values.${F.Key}`;
      const Value = Layer.Values[F.Key];
      return F.Type === "select" ? Chooser(Path, F, Value) : Slider(Path, F, Value);
    }).join("");

    const Blend = `<label class="field"><span>Blend mode</span>
      <select data-path="Blend" data-kind="text">${BlendModes.map((B) =>
        `<option ${B === Layer.Blend ? "selected" : ""}>${B}</option>`).join("")}</select></label>
      ${Slider("Opacity", { Label: "Strength", Min: 0, Max: 1, Step: 0.005 }, Layer.Opacity)}
      ${Slider("Seed", { Label: "Seed offset", Min: 0, Max: 9999, Step: 1 }, Layer.Seed)}`;

    const Source = Layer.Mask.Source;
    const Mask = `<label class="field"><span>Driven by</span>
      <select data-path="Mask.Source" data-kind="text">${MaskSources.map((M) =>
        `<option ${M === Source ? "selected" : ""}>${M}</option>`).join("")}</select></label>`
      + (Source === "None" ? "" : `
        ${Slider("Mask.Low", { Label: "From", Min: 0, Max: 1, Step: 0.002 }, Layer.Mask.Low)}
        ${Slider("Mask.High", { Label: "To", Min: 0, Max: 1, Step: 0.002 }, Layer.Mask.High)}
        ${Slider("Mask.Falloff", { Label: "Shoulder", Min: 0.002, Max: 0.4, Step: 0.002 }, Layer.Mask.Falloff)}
        ${Switch("Mask.Invert", "Invert", Layer.Mask.Invert)}`);

    this.Body.innerHTML = `
      <div class="inspector-heading">
        <h1>${Escape(Layer.Name)}</h1>
        <p class="eyebrow">${Escape(Entry.Label)} · ${Entry.Role.toLowerCase()}</p>
      </div>
      ${Card(Entry.Label, Entry.Blurb, Text("Name", "Layer name", Layer.Name) + Body, Entry.Role)}
      ${Card("Composite", "How this layer meets the one beneath it.", Blend)}
      ${Card("Mask", "Restrict the layer to ground that already satisfies a condition.", Mask,
             Source === "None" ? "off" : Source.toLowerCase())}`;
    this.Left.textContent = `${Entry.Role} · ${Fields.length} parameters`;
    this.Right.textContent = Layer.Enabled ? "Active" : "Hidden";
  }

  Texture(Layer) {
    const Entry = TextureKinds[Layer.Kind];
    const Fields = TextureFields(Layer.Kind);
    const Body = Fields.map((F) => {
      const Path = `Values.${F.Key}`;
      const Value = Layer.Values[F.Key];
      return F.Type === "select" ? Chooser(Path, F, Value) : Slider(Path, F, Value);
    }).join("");

    this.Body.innerHTML = `
      <div class="inspector-heading">
        <h1>${Escape(Layer.Name)}</h1>
        <p class="eyebrow">${Escape(Entry.Label)} · coat</p>
      </div>
      ${Card(Entry.Label, Entry.Blurb,
        Text("Name", "Layer name", Layer.Name) +
        Swatch("Colour", "Albedo", Layer.Colour) +
        Slider("Roughness", { Label: "Roughness", Min: 0.03, Max: 1, Step: 0.005 }, Layer.Roughness) +
        Slider("Opacity", { Label: "Strength", Min: 0, Max: 1, Step: 0.005 }, Layer.Opacity))}
      ${Fields.length ? Card("Coverage", "Where this coat appears.", Body) : ""}`;
    this.Left.textContent = `Coat · ${Fields.length} parameters`;
    this.Right.textContent = Layer.Enabled ? "Active" : "Hidden";
  }

  World() {
    const W = this.Store.Scene.World;
    const Scene = this.Store.Scene;

    const Ground = Picker("World.Resolution", "Resolution", Resolutions, W.Resolution)
      + Slider("World.WorldSize", { Label: "Terrain extent", Min: 1000, Max: 32000, Step: 100, Unit: "m" }, W.WorldSize)
      + Slider("World.HeightScale", { Label: "Vertical scale", Min: 100, Max: 6000, Step: 25, Unit: "m" }, W.HeightScale)
      + Slider("World.Seed", { Label: "Seed", Min: 1, Max: 99999, Step: 1 }, W.Seed)
      + `<div style="display:flex;gap:7px;margin-top:4px">
          <button data-world-act="reseed" style="flex:1">${Icon("reset", 13)} New seed</button>
          <button data-world-act="rebuild" style="flex:1">${Icon("layers", 13)} Rebuild</button>
        </div>`;

    const Sun = Slider("World.Sun.Azimuth", { Label: "Bearing", Min: 0, Max: 360, Step: 1, Unit: "°" }, W.Sun.Azimuth)
      + Slider("World.Sun.Elevation", { Label: "Elevation", Min: -4, Max: 88, Step: 0.25, Unit: "°" }, W.Sun.Elevation)
      + Slider("World.Sun.Intensity", { Label: "Intensity", Min: 0.2, Max: 12, Step: 0.05 }, W.Sun.Intensity)
      + Slider("World.Sun.Warmth", { Label: "Warmth", Min: 0, Max: 1, Step: 0.005 }, W.Sun.Warmth);

    const Sky = Slider("World.Sky.Turbidity", { Label: "Turbidity", Min: 1.6, Max: 9, Step: 0.05 }, W.Sky.Turbidity)
      + Slider("World.Sky.Ambient", { Label: "Sky light", Min: 0, Max: 3, Step: 0.01 }, W.Sky.Ambient)
      + Slider("World.Sky.Haze", { Label: "Aerial haze", Min: 0, Max: 2.5, Step: 0.01 }, W.Sky.Haze)
      + Slider("World.Sky.Exposure", { Label: "Exposure", Min: 0.2, Max: 8, Step: 0.01 }, W.Sky.Exposure);

    const Water = Switch("World.Water.Enabled", "Water surface", W.Water.Enabled)
      + (W.Water.Enabled
        ? Slider("World.Water.Level", { Label: "Level", Min: 0, Max: 1, Step: 0.002 }, W.Water.Level)
          + Slider("World.Water.Depth", { Label: "Shore width", Min: 0, Max: 2, Step: 0.01 }, W.Water.Depth)
          + Slider("World.Water.Clarity", { Label: "Clarity", Min: 0, Max: 1, Step: 0.005 }, W.Water.Clarity)
        : "");

    const View = Picker("World.Render.Quality", "Mesh quality", Qualities, W.Render.Quality)
      + Switch("World.Render.Contours", "Survey contours", W.Render.Contours);

    const Export = `<div style="display:grid;gap:7px">
      <button data-world-act="height16">${Icon("download", 13)} Heightmap · 16-bit PNG</button>
      <button data-world-act="albedo">${Icon("image", 13)} Albedo · PNG</button>
      <button data-world-act="normal">${Icon("image", 13)} Normal map · PNG</button>
      <button data-world-act="save">${Icon("download", 13)} Project · JSON</button>
      <button data-world-act="load">${Icon("folder", 13)} Open project…</button>
    </div>`;

    const Preset = `<label class="field"><span>Preset</span>
      <select data-world-act="none" id="PresetSelect">${PresetNames.map((P) =>
        `<option ${P === Scene.Name ? "selected" : ""}>${Escape(P)}</option>`).join("")}</select></label>
      <button data-world-act="preset" style="width:100%">${Icon("reset", 13)} Load this preset</button>`;

    this.Body.innerHTML = `
      <div class="inspector-heading">
        <h1>World</h1>
        <p class="eyebrow">${Escape(Scene.Name || "Untitled")} · ${W.Resolution}² field</p>
      </div>
      ${Card("Ground", "The field everything else is solved on.", Ground, `${W.Resolution}²`)}
      ${Card("Sun", "Bearing is clockwise from north, as a compass reads it.", Sun)}
      ${Card("Sky", "", Sky)}
      ${Card("Water", "", Water)}
      ${Card("Viewport", "", View)}
      ${Card("Preset", "Replaces both stacks.", Preset)}
      ${Card("Export", "", Export)}`;

    const Cells = W.Resolution * W.Resolution;
    this.Left.textContent = `${(Cells / 1e6).toFixed(2)} M cells`;
    this.Right.textContent = `${(W.WorldSize / W.Resolution).toFixed(1)} m per cell`;
  }
}

function WorldField(Path) {
  const Table = {
    "World.WorldSize": { Step: 100, Unit: "m" },
    "World.HeightScale": { Step: 25, Unit: "m" },
    "World.Seed": { Step: 1 },
    "World.Sun.Azimuth": { Step: 1, Unit: "°" },
    "World.Sun.Elevation": { Step: 0.25, Unit: "°" },
    "World.Sun.Intensity": { Step: 0.05 },
    "World.Sun.Warmth": { Step: 0.005 },
    "World.Sky.Turbidity": { Step: 0.05 },
    "World.Sky.Ambient": { Step: 0.01 },
    "World.Sky.Haze": { Step: 0.01 },
    "World.Sky.Exposure": { Step: 0.01 },
    "World.Water.Level": { Step: 0.002 },
    "World.Water.Depth": { Step: 0.01 },
    "World.Water.Clarity": { Step: 0.005 },
  };
  return Table[Path];
}
