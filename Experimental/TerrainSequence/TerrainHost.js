// TerrainHost — the application. Owns the device, the scene, the build schedule and the viewport.
//
// Builds are progressive. A terrain edit queues the whole stack, and each frame spends a fixed
// slice of work on it before drawing, so a 480-iteration erosion plays out in the viewport instead
// of freezing it. An edit that cannot change the heightfield — a colour, the sun, the exposure —
// never touches the solver at all.

import { LoadPreset, PresetNames } from "./HeightSpecification.js";
import { SkyColour, SunColour } from "./DaylightProjection.js";
import { MaterialSolver } from "./MaterialSolver.js";
import { OrbitProjection, SunVector } from "./OrbitProjection.js";
import { ReliefSolver } from "./ReliefSolver.js";
import { SurfaceProjection } from "./SurfaceProjection.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { Escape, MakeLayer, PickerContents, StackPanel } from "./StackPanel.js";

const Modes = ["Shaded", "Albedo", "Height", "Slope", "Flow", "Light", "Normal"];
const GridFor = { Draft: 256, Balanced: 512, High: 768, Ultra: 1024 };

// ── Diagnostics ───────────────────────────────────────────────────────────────────────────────────

const Console = {
  Node: null,
  Lines: null,
  Say(Text, Tone = "") {
    if (!this.Lines) return;
    const Line = document.createElement("div");
    Line.className = Tone;
    Line.textContent = `${new Date().toLocaleTimeString("en-GB", { hour12: false })}  ${Text}`;
    this.Lines.append(Line);
    this.Lines.scrollTop = this.Lines.scrollHeight;
    if (Tone === "bad") this.Node.classList.add("live");
  },
  Show(On) { this.Node.classList.toggle("live", On); },
};

function Fail(Title, Detail) {
  const Wrap = document.querySelector(".canvas-wrap");
  const Panel = document.createElement("div");
  Panel.className = "unsupported";
  Panel.innerHTML = `<div><h2>${Escape(Title)}</h2><p>${Detail}</p></div>`;
  Wrap.append(Panel);
}

// ── PNG writing ───────────────────────────────────────────────────────────────────────────────────

const CrcTable = (() => {
  const T = new Uint32Array(256);
  for (let N = 0; N < 256; N += 1) {
    let C = N;
    for (let K = 0; K < 8; K += 1) C = C & 1 ? 0xedb88320 ^ (C >>> 1) : C >>> 1;
    T[N] = C >>> 0;
  }
  return T;
})();

function Crc(Bytes) {
  let C = 0xffffffff;
  for (let I = 0; I < Bytes.length; I += 1) C = CrcTable[(C ^ Bytes[I]) & 0xff] ^ (C >>> 8);
  return (C ^ 0xffffffff) >>> 0;
}

function Chunk(Tag, Body) {
  const Out = new Uint8Array(12 + Body.length);
  const DataView_ = new DataView(Out.buffer);
  DataView_.setUint32(0, Body.length);
  for (let I = 0; I < 4; I += 1) Out[4 + I] = Tag.charCodeAt(I);
  Out.set(Body, 8);
  const Scope = Out.subarray(4, 8 + Body.length);
  DataView_.setUint32(8 + Body.length, Crc(Scope));
  return Out;
}

async function Deflate(Bytes) {
  const Stream = new Blob([Bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(Stream).arrayBuffer());
}

// ColourType 0 is greyscale, 6 is RGBA. Depth is 8 or 16.
async function WritePng(Width, Height, Rows, Depth, ColourType) {
  const Header = new Uint8Array(13);
  const H = new DataView(Header.buffer);
  H.setUint32(0, Width);
  H.setUint32(4, Height);
  Header[8] = Depth;
  Header[9] = ColourType;
  const Body = await Deflate(Rows);
  const Parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    Chunk("IHDR", Header),
    Chunk("IDAT", Body),
    Chunk("IEND", new Uint8Array(0)),
  ];
  return new Blob(Parts, { type: "image/png" });
}

function Keep(Blob_, Name) {
  const Url = URL.createObjectURL(Blob_);
  const Link = document.createElement("a");
  Link.href = Url;
  Link.download = Name;
  Link.click();
  setTimeout(() => URL.revokeObjectURL(Url), 4000);
}

// ── Host ──────────────────────────────────────────────────────────────────────────────────────────

class TerrainHost {
  constructor() {
    this.Scene = LoadPreset(PresetNames[0]);
    this.Tab = "Terrain";
    this.Selected = { Terrain: this.Scene.Terrain[0]?.Id || null, Texture: this.Scene.Texture[0]?.Id || null };
    this.Dirty = { Terrain: true, Texture: true, Light: true };
    this.Draft = false;
    this.Pending = null;
    this.Settling = false;
    this.Frames = 0;
    this.Rate = 0;
    this.Clock = performance.now();
    this.Started = 0;
    this.Mode = 0;
  }

  Layer() {
    if (this.Tab === "World") return null;
    const List = this.Tab === "Texture" ? this.Scene.Texture : this.Scene.Terrain;
    return List.find((L) => L.Id === this.Selected[this.Tab]) || List[0] || null;
  }

  SetTab(Tab) {
    this.Tab = Tab;
    this.Stack.Render();
    this.Inspector.Render();
  }

  Select(Id) {
    if (this.Tab === "World") return;
    this.Selected[this.Tab] = Id;
    this.Stack.Render();
    this.Inspector.Render();
  }

  Touch(Scope) {
    this.Edit(Scope === "Texture" ? "Texture" : "Terrain", false);
  }

  // Scope is the cheapest stage that has to be redone.
  Edit(Scope, Draft) {
    if (Scope === "Terrain") { this.Dirty.Terrain = true; this.Dirty.Texture = true; this.Dirty.Light = true; }
    else if (Scope === "Texture") this.Dirty.Texture = true;
    else if (Scope === "Light") { this.Dirty.Light = true; this.Dirty.Texture = true; }
    this.Draft = Boolean(Draft);
    this.Queued = true;
  }

  Settle() {
    if (this.Draft) {
      this.Draft = false;
      if (this.Dirty.Terrain || this.Dirty.Texture || this.Dirty.Light) this.Queued = true;
      this.Replay = true;
    }
  }

  async Boot() {
    const Canvas = document.getElementById("Viewport");
    Console.Node = document.querySelector(".console");
    Console.Lines = document.querySelector(".console .lines");

    if (!navigator.gpu) {
      Fail("This browser has no WebGPU",
        "TerrainSequence runs its generator, its erosion and its renderer entirely on the GPU through " +
        "WebGPU. Chrome or Edge 113 and later support it, as does Safari 18. In Firefox it is behind " +
        "<code>dom.webgpu.enabled</code>. The page is also served over https, which WebGPU requires.");
      return;
    }
    const Adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!Adapter) {
      Fail("No GPU adapter",
        "The browser has WebGPU but could not open an adapter. On Linux this is usually a missing " +
        "Vulkan driver; try launching with <code>--enable-unsafe-webgpu</code>.");
      return;
    }

    const Wanted = {
      maxStorageBufferBindingSize: Math.min(Adapter.limits.maxStorageBufferBindingSize, 2048 * 2048 * 16),
      maxBufferSize: Math.min(Adapter.limits.maxBufferSize, 2048 * 2048 * 16),
      maxComputeInvocationsPerWorkgroup: Adapter.limits.maxComputeInvocationsPerWorkgroup,
    };
    this.Device = await Adapter.requestDevice({ requiredLimits: Wanted });
    Console.Say(`Adapter ready — ${Adapter.info?.description || Adapter.info?.vendor || "unnamed"}`, "good");

    this.Device.addEventListener?.("uncapturederror", (E) => {
      Console.Say(`GPU error: ${E.error.message}`, "bad");
    });
    this.Device.lost.then((Info) => {
      if (Info.reason !== "destroyed") Console.Say(`Device lost: ${Info.message}`, "bad");
    });

    this.Context = Canvas.getContext("webgpu");
    this.Format = navigator.gpu.getPreferredCanvasFormat();
    this.Context.configure({ device: this.Device, format: this.Format, alphaMode: "opaque" });

    this.Device.pushErrorScope("validation");
    this.Relief = new ReliefSolver(this.Device);
    this.Material = new MaterialSolver(this.Device);
    this.Surface = new SurfaceProjection(this.Device, this.Format);
    const Broken = await this.Device.popErrorScope();
    if (Broken) {
      Console.Say(`Pipeline creation failed: ${Broken.message}`, "bad");
      Fail("A shader did not compile", `<code>${Escape(Broken.message.slice(0, 600))}</code>`);
      return;
    }
    for (const [Name, Module] of [["relief", this.Relief.Module], ["material", this.Material.Module],
      ["surface", this.Surface.Module]]) {
      const Info = await Module.getCompilationInfo();
      for (const M of Info.messages) {
        Console.Say(`${Name} ${M.type} ${M.lineNum}:${M.linePos} ${M.message}`, M.type === "error" ? "bad" : "");
      }
    }
    Console.Say("Shaders compiled", "good");

    this.Camera = new OrbitProjection(this.Scene.World.WorldSize);
    this.Camera.Frame(this.Scene.World.WorldSize, this.Scene.World.HeightScale);

    this.Stack = new StackPanel(document.querySelector(".stack"), this);
    this.Inspector = new InspectorPanel(document.querySelector(".inspector"), this);
    this.Stack.Render();
    this.Inspector.Render();
    this.Chrome();
    this.Input(Canvas);

    this.Queued = true;
    requestAnimationFrame(() => this.Tick());
  }

  // ── Chrome ──────────────────────────────────────────────────────────────────────────────────────

  Chrome() {
    const Bar = document.querySelector("[data-modes]");
    Bar.innerHTML = Modes.map((M, I) =>
      `<button data-mode="${I}" class="${I === 0 ? "active" : ""}">${M}</button>`).join("");
    Bar.addEventListener("click", (E) => {
      const B = E.target.closest("[data-mode]");
      if (!B) return;
      this.Mode = Number(B.dataset.mode);
      for (const X of Bar.children) X.classList.toggle("active", X === B);
    });

    const Presets = document.querySelector("[data-preset]");
    Presets.innerHTML = PresetNames.map((P) =>
      `<option ${P === this.Scene.Name ? "selected" : ""}>${Escape(P)}</option>`).join("");
    Presets.addEventListener("change", () => this.UsePreset(Presets.value));

    document.querySelector("[data-act='frame']").addEventListener("click", () => {
      this.Camera.Frame(this.Scene.World.WorldSize, this.Scene.World.HeightScale);
    });
    document.querySelector("[data-act='rebuild']").addEventListener("click", () => {
      this.Dirty.Terrain = true; this.Dirty.Texture = true; this.Dirty.Light = true; this.Queued = true;
    });
    const Logs = document.querySelector("[data-act='console']");
    Logs.addEventListener("click", () => {
      const On = !Console.Node.classList.contains("live");
      Console.Show(On);
      Logs.setAttribute("aria-pressed", String(On));
    });
    document.querySelector(".console header button").addEventListener("click", () => {
      Console.Show(false);
      Logs.setAttribute("aria-pressed", "false");
    });

    const Sheet = document.querySelector(".sheet");
    Sheet.addEventListener("click", (E) => {
      if (E.target === Sheet || E.target.closest("[data-close]")) Sheet.hidden = true;
      const Tile = E.target.closest("[data-kind]");
      if (!Tile) return;
      const List = this.Tab === "Texture" ? this.Scene.Texture : this.Scene.Terrain;
      const Made = MakeLayer(this.Tab, Tile.dataset.kind);
      const At = List.findIndex((L) => L.Id === this.Selected[this.Tab]);
      List.splice(At < 0 ? List.length : At + 1, 0, Made);
      this.Selected[this.Tab] = Made.Id;
      Sheet.hidden = true;
      this.Touch(this.Tab);
      this.Stack.Render();
      this.Inspector.Render();
    });

    const Split = document.querySelector(".splitter");
    let Dragging = false;
    Split.addEventListener("pointerdown", (E) => { Dragging = true; Split.setPointerCapture(E.pointerId); });
    Split.addEventListener("pointermove", (E) => {
      if (!Dragging) return;
      const Dock = document.querySelector(".dock.right");
      const Box = Dock.getBoundingClientRect();
      const Share = Math.min(0.82, Math.max(0.16, (E.clientY - Box.top) / Box.height));
      Dock.style.setProperty("--split", `${(Share * 100).toFixed(1)}%`);
    });
    Split.addEventListener("pointerup", (E) => { Dragging = false; Split.releasePointerCapture(E.pointerId); });
  }

  OpenPicker() {
    const Sheet = document.querySelector(".sheet");
    const Grid = Sheet.querySelector(".kind-grid");
    Sheet.querySelector("h2").textContent = this.Tab === "Texture" ? "Add a coat" : "Add a terrain layer";
    Sheet.querySelector("h2 + p").textContent = this.Tab === "Texture"
      ? "Coats are evaluated from the top down; each one paints over what is under it where its rule says so."
      : "Generators lay down elevation, modifiers rework what is already there.";
    Grid.innerHTML = PickerContents(this.Tab).map((K) =>
      `<button class="kind-tile" data-kind="${K.Key}">
        <em>${Escape(K.Role)}</em><b>${Escape(K.Label)}</b><span>${Escape(K.Blurb)}</span>
      </button>`).join("");
    Sheet.hidden = false;
  }

  UsePreset(Name) {
    this.Scene = LoadPreset(Name);
    this.Selected = { Terrain: this.Scene.Terrain[0]?.Id || null, Texture: this.Scene.Texture[0]?.Id || null };
    this.Camera.Frame(this.Scene.World.WorldSize, this.Scene.World.HeightScale);
    this.Dirty = { Terrain: true, Texture: true, Light: true };
    this.Queued = true;
    this.Stack.Render();
    this.Inspector.Render();
    Console.Say(`Preset loaded — ${Name}`);
  }

  WorldAct(What) {
    if (What === "reseed") {
      this.Scene.World.Seed = 1 + Math.floor(Math.random() * 99998);
      this.Edit("Terrain", false);
      this.Inspector.Render();
    } else if (What === "rebuild") {
      this.Edit("Terrain", false);
    } else if (What === "preset") {
      this.UsePreset(document.getElementById("PresetSelect").value);
    } else if (What === "save") {
      Keep(new Blob([JSON.stringify(this.Scene, null, 2)], { type: "application/json" }),
        `${(this.Scene.Name || "terrain").replace(/\W+/g, "-").toLowerCase()}.json`);
    } else if (What === "load") {
      const Input = document.createElement("input");
      Input.type = "file";
      Input.accept = "application/json";
      Input.addEventListener("change", async () => {
        try {
          this.Scene = JSON.parse(await Input.files[0].text());
          this.Selected = { Terrain: this.Scene.Terrain[0]?.Id, Texture: this.Scene.Texture[0]?.Id };
          this.Dirty = { Terrain: true, Texture: true, Light: true };
          this.Queued = true;
          this.Stack.Render();
          this.Inspector.Render();
          Console.Say("Project opened", "good");
        } catch (E) { Console.Say(`Could not read that project: ${E.message}`, "bad"); }
      });
      Input.click();
    } else {
      this.Export(What);
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────────────────────────

  async ReadBuffer(Buffer, Bytes) {
    const Staging = this.Device.createBuffer({ size: Bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const Encoder = this.Device.createCommandEncoder();
    Encoder.copyBufferToBuffer(Buffer, 0, Staging, 0, Bytes);
    this.Device.queue.submit([Encoder.finish()]);
    await Staging.mapAsync(GPUMapMode.READ);
    const Copy = Staging.getMappedRange().slice(0);
    Staging.unmap();
    Staging.destroy();
    return Copy;
  }

  async ReadTexture(Texture, Size) {
    const Stride = Math.ceil((Size * 8) / 256) * 256;   // rgba16float is 8 bytes a texel
    const Staging = this.Device.createBuffer({
      size: Stride * Size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const Encoder = this.Device.createCommandEncoder();
    Encoder.copyTextureToBuffer({ texture: Texture }, { buffer: Staging, bytesPerRow: Stride }, [Size, Size]);
    this.Device.queue.submit([Encoder.finish()]);
    await Staging.mapAsync(GPUMapMode.READ);
    const Copy = new Uint16Array(Staging.getMappedRange().slice(0));
    Staging.unmap();
    Staging.destroy();
    return { Data: Copy, Stride: Stride / 2 };
  }

  async Export(What) {
    const Size = this.Scene.World.Resolution;
    const Stem = (this.Scene.Name || "terrain").replace(/\W+/g, "-").toLowerCase();
    Console.Say(`Exporting ${What}…`);
    try {
      if (What === "height16") {
        const Raw = new Float32Array(await this.ReadBuffer(this.Relief.Buffers.Height, Size * Size * 4));
        const Rows = new Uint8Array(Size * (1 + Size * 2));
        let W = 0;
        for (let Y = 0; Y < Size; Y += 1) {
          Rows[W] = 0;
          W += 1;
          for (let X = 0; X < Size; X += 1) {
            const V = Math.max(0, Math.min(1, Raw[Y * Size + X]));
            const N = Math.round(V * 65535);
            Rows[W] = N >> 8;
            Rows[W + 1] = N & 255;
            W += 2;
          }
        }
        Keep(await WritePng(Size, Size, Rows, 16, 0), `${Stem}-height-16bit.png`);
      } else {
        const Source = What === "albedo" ? this.Material.Textures.Albedo : this.Material.Textures.Geometry;
        const { Data, Stride } = await this.ReadTexture(Source, Size);
        const Rows = new Uint8Array(Size * (1 + Size * 4));
        let W = 0;
        for (let Y = 0; Y < Size; Y += 1) {
          Rows[W] = 0;
          W += 1;
          for (let X = 0; X < Size; X += 1) {
            const At = Y * Stride + X * 4;
            let R = Half(Data[At]);
            let G = Half(Data[At + 1]);
            let B = Half(Data[At + 2]);
            if (What === "albedo") {
              R = Gamma(R); G = Gamma(G); B = Gamma(B);
            } else {
              // Tangent-space convention: +X right, +Y up the image, +Z out of it.
              const Nx = R; const Ny = G; const Nz = B;
              R = Nx * 0.5 + 0.5; G = -Nz * 0.5 + 0.5; B = Ny * 0.5 + 0.5;
            }
            Rows[W] = Math.round(Math.max(0, Math.min(1, R)) * 255);
            Rows[W + 1] = Math.round(Math.max(0, Math.min(1, G)) * 255);
            Rows[W + 2] = Math.round(Math.max(0, Math.min(1, B)) * 255);
            Rows[W + 3] = 255;
            W += 4;
          }
        }
        Keep(await WritePng(Size, Size, Rows, 8, 6), `${Stem}-${What}.png`);
      }
      Console.Say(`Exported ${What}`, "good");
    } catch (E) {
      Console.Say(`Export failed: ${E.message}`, "bad");
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────────────────────────────

  Input(Canvas) {
    let Last = null;
    let Button = 0;
    Canvas.addEventListener("pointerdown", (E) => {
      Last = [E.clientX, E.clientY];
      Button = E.button;
      Canvas.setPointerCapture(E.pointerId);
    });
    Canvas.addEventListener("pointermove", (E) => {
      if (!Last) return;
      const Dx = E.clientX - Last[0];
      const Dy = E.clientY - Last[1];
      Last = [E.clientX, E.clientY];
      if (Button === 0 && !E.shiftKey) this.Camera.Turn(Dx, Dy);
      else this.Camera.Pan(Dx, Dy);
    });
    const Release = (E) => {
      Last = null;
      if (Canvas.hasPointerCapture?.(E.pointerId)) Canvas.releasePointerCapture(E.pointerId);
    };
    Canvas.addEventListener("pointerup", Release);
    Canvas.addEventListener("pointercancel", Release);
    Canvas.addEventListener("contextmenu", (E) => E.preventDefault());
    Canvas.addEventListener("wheel", (E) => {
      E.preventDefault();
      this.Camera.Dolly(E.deltaY);
    }, { passive: false });
  }

  // ── Frame ───────────────────────────────────────────────────────────────────────────────────────

  Tick() {
    const Canvas = document.getElementById("Viewport");
    const Scale = Math.min(window.devicePixelRatio || 1, 2);
    const Width = Math.max(2, Math.floor(Canvas.clientWidth * Scale));
    const Height = Math.max(2, Math.floor(Canvas.clientHeight * Scale));
    if (Canvas.width !== Width || Canvas.height !== Height) {
      Canvas.width = Width;
      Canvas.height = Height;
      this.Surface.Resize(Width, Height);
    }

    const World = this.Scene.World;
    if (this.Queued) {
      this.Queued = false;
      if (this.Dirty.Terrain) {
        this.Relief.Begin(this.Scene, this.Draft);
        this.Material.Allocate(World.Resolution, this.Relief.Buffers.Height, this.Relief.Buffers.Accum);
        this.Surface.SetGrid(Math.min(GridFor[World.Render.Quality] || 512, World.Resolution));
        this.Surface.Attach(this.Relief.Buffers.Height, this.Material.Views);
        this.Started = performance.now();
        this.Dirty.Terrain = false;
        this.Pending = "terrain";
      } else {
        this.Pending = this.Pending || "material";
      }
    }

    if (this.Pending === "terrain") {
      const Cells = World.Resolution * World.Resolution;
      const Budget = Math.max(2, Math.min(160, Math.round((6 * 1024 * 1024) / Cells)));
      if (this.Relief.Advance(Budget)) {
        this.Pending = "settling";
        if (!this.Settling) {
          this.Settling = true;
          this.Relief.Settle().then(() => {
            this.Settling = false;
            this.Pending = "material";
            this.Elapsed = performance.now() - this.Started;
          }).catch((E) => {
            this.Settling = false;
            this.Pending = "material";
            Console.Say(`Normalise failed: ${E.message}`, "bad");
          });
        }
      }
    }

    const Sun = SunVector(World.Sun.Azimuth, World.Sun.Elevation);
    const Tint = SunColour(World.Sun.Elevation, World.Sun.Warmth);
    const Dome = SkyColour(World.Sun.Elevation);

    if (this.Pending === "material") {
      this.Material.WriteScene(this.Scene, Sun, Tint, Dome);
      this.Material.Run(["OccludeMain", "ShadeMain", "ResolveMain"]);
      this.Dirty.Texture = false;
      this.Dirty.Light = false;
      this.Pending = null;
      if (this.Replay) { this.Replay = false; this.Dirty.Terrain = true; this.Queued = true; }
    } else if (!this.Pending && (this.Dirty.Light || this.Dirty.Texture)) {
      this.Material.WriteScene(this.Scene, Sun, Tint, Dome);
      this.Material.Run(this.Dirty.Light ? ["ShadeMain", "ResolveMain"] : ["ResolveMain"]);
      this.Dirty.Light = false;
      this.Dirty.Texture = false;
    }

    if (this.Material.FieldGroup && this.Surface.ViewGroup) {
      const Aspect = Width / Height;
      const Time = (performance.now() - this.Clock) / 1000;
      this.Surface.WriteView(this.Camera, Aspect, this.Scene, Sun, Tint, Dome, Time, this.Mode);
      this.Surface.Draw(this.Context.getCurrentTexture().createView(), this.Scene);
    }

    this.Frames += 1;
    const Now = performance.now();
    if (Now - (this.Marked || 0) > 500) {
      this.Rate = (this.Frames * 1000) / (Now - (this.Marked || Now - 500));
      this.Marked = Now;
      this.Frames = 0;
      this.Status();
    }
    requestAnimationFrame(() => this.Tick());
  }

  Status() {
    const World = this.Scene.World;
    const Busy = Boolean(this.Pending);
    const Rail = document.querySelector(".progress-rail");
    Rail.classList.toggle("live", Busy);
    Rail.firstElementChild.style.width = `${(this.Relief.Progress * 100).toFixed(1)}%`;

    const Badge = document.querySelector(".badge-build");
    Badge.classList.toggle("live", Busy);
    Badge.lastElementChild.textContent = Busy
      ? `Solving — ${this.Relief.Stage} · ${(this.Relief.Progress * 100).toFixed(0)}%`
      : "Ready";

    const Grid = this.Surface.Grid || 0;
    const Faces = Math.max(0, (Grid - 1) * (Grid - 1) * 2);
    document.querySelector("[data-stats]").innerHTML = `
      <span><b>${Busy ? "Solving" : "Ready"}</b></span>
      <span>${World.Resolution}² field</span>
      <span>${(Faces / 1e6).toFixed(2)} M triangles</span>
      <span>${this.Elapsed ? `${(this.Elapsed / 1000).toFixed(2)} s build` : "—"}</span>
      <span><b>${this.Rate.toFixed(0)}</b> fps</span>`;
  }
}

function Half(Bits) {
  const Sign = (Bits & 0x8000) ? -1 : 1;
  const Exponent = (Bits >> 10) & 0x1f;
  const Fraction = Bits & 0x3ff;
  if (Exponent === 0) return Sign * Math.pow(2, -14) * (Fraction / 1024);
  if (Exponent === 31) return Fraction ? NaN : Sign * Infinity;
  return Sign * Math.pow(2, Exponent - 15) * (1 + Fraction / 1024);
}

function Gamma(Linear) {
  const C = Math.max(0, Math.min(1, Linear));
  return C <= 0.0031308 ? C * 12.92 : 1.055 * Math.pow(C, 1 / 2.4) - 0.055;
}

const Host = new TerrainHost();
Host.Boot().catch((E) => {
  Console.Say(`Startup failed: ${E.message}`, "bad");
  Fail("TerrainSequence could not start", `<code>${Escape(String(E && E.stack ? E.stack : E))}</code>`);
});

export { TerrainHost, WritePng, Half };
