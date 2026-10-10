// CheckTerrain — what can be proved about this application without a GPU.
//
// No browser here can give us a WebGPU device, so the usual "run it and look" is not available.
// What is available is every contract that sits between the JavaScript and the WGSL: the slot
// numbers the inspector writes and the kernels read, the binding layouts declared twice, the
// uniform struct sizes, the entry point names, and the DOM hooks the host reaches for. Those are
// where WebGPU code actually breaks, and every one of them is checked below.
//
//   node Experimental/TerrainSequence/CheckTerrain.mjs
//
// If `wgsl_reflect` is installed the WGSL is parsed properly and struct sizes are compared too.
// Without it the structural checks still run.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const Here = dirname(fileURLToPath(import.meta.url));
let Passed = 0;
const Failures = [];

function Check(Condition, Describe) {
  if (Condition) { Passed += 1; return; }
  Failures.push(Describe);
}

function Read(Name) { return readFileSync(join(Here, Name), "utf8"); }

const Spec = await import("./HeightSpecification.js");
const Relief = await import("./ReliefSolver.js");
const Material = await import("./MaterialSolver.js");
const Surface = await import("./SurfaceProjection.js");

// ── 1. The field tables ───────────────────────────────────────────────────────────────────────────

for (const [Kind, Entry] of Object.entries(Spec.TerrainKinds)) {
  Check(["Generator", "Modifier"].includes(Entry.Role), `${Kind}: role is Generator or Modifier`);
  Check(typeof Entry.Blurb === "string" && Entry.Blurb.length > 30, `${Kind}: has a real description`);
  const Seen = new Set();
  for (const F of Entry.Fields) {
    Check(Number.isInteger(F.Slot) && F.Slot >= 0 && F.Slot < 24, `${Kind}.${F.Key}: slot in 0..23`);
    Check(!Seen.has(F.Slot), `${Kind}.${F.Key}: slot ${F.Slot} is not already taken`);
    Seen.add(F.Slot);
    if (F.Type === "select") {
      Check(F.Options.includes(F.Default), `${Kind}.${F.Key}: default is one of the options`);
    } else {
      Check(F.Default >= F.Min && F.Default <= F.Max, `${Kind}.${F.Key}: default inside min..max`);
      Check(F.Max > F.Min, `${Kind}.${F.Key}: max above min`);
    }
  }
}

for (const [Kind] of Object.entries(Spec.TextureKinds)) {
  const Seen = new Set();
  for (const F of Spec.TextureFields(Kind)) {
    Check(Number.isInteger(F.Slot) && F.Slot >= 0 && F.Slot < 24, `${Kind}.${F.Key}: slot in 0..23`);
    Check(!Seen.has(F.Slot), `${Kind}.${F.Key}: slot ${F.Slot} is not already taken`);
    Seen.add(F.Slot);
    Check(F.Default >= F.Min && F.Default <= F.Max, `${Kind}.${F.Key}: default inside min..max`);
  }
}

// ── 2. Presets ────────────────────────────────────────────────────────────────────────────────────

for (const Name of Spec.PresetNames) {
  const Scene = Spec.LoadPreset(Name);
  Check(Scene.Terrain.length > 0, `${Name}: has terrain layers`);
  Check(Scene.Texture.length > 0, `${Name}: has texture layers`);
  Check(Scene.Texture[0].Kind === "Fill", `${Name}: the bottom coat covers everything`);
  Check(Scene.World.Resolution > 0 && (Scene.World.Resolution & (Scene.World.Resolution - 1)) === 0,
    `${Name}: resolution is a power of two`);
  for (const L of Scene.Terrain) {
    Check(Boolean(Spec.TerrainKinds[L.Kind]), `${Name}: terrain kind ${L.Kind} exists`);
    Check(Spec.BlendModes.includes(L.Blend), `${Name}: blend ${L.Blend} exists`);
    Check(Spec.MaskSources.includes(L.Mask.Source), `${Name}: mask source ${L.Mask.Source} exists`);
    const Keys = new Set(Spec.TerrainFields(L.Kind).map((F) => F.Key));
    for (const K of Object.keys(L.Values)) Check(Keys.has(K), `${Name}/${L.Kind}: ${K} is a declared field`);
    for (const F of Spec.TerrainFields(L.Kind)) {
      const V = L.Values[F.Key];
      if (F.Type === "select") Check(F.Options.includes(V), `${Name}/${L.Kind}.${F.Key}: valid option`);
      else Check(V >= F.Min && V <= F.Max, `${Name}/${L.Kind}.${F.Key}: ${V} inside ${F.Min}..${F.Max}`);
    }
  }
  for (const L of Scene.Texture) {
    Check(Boolean(Spec.TextureKinds[L.Kind]), `${Name}: texture kind ${L.Kind} exists`);
    Check(/^#[0-9a-f]{6}$/i.test(L.Colour), `${Name}/${L.Name}: colour is a six-digit hex`);
    for (const F of Spec.TextureFields(L.Kind)) {
      const V = L.Values[F.Key];
      Check(V >= F.Min && V <= F.Max, `${Name}/${L.Kind}.${F.Key}: ${V} inside ${F.Min}..${F.Max}`);
    }
  }
}

// ── 3. Uniform packing ────────────────────────────────────────────────────────────────────────────

Check(Spec.LayerStride === 256, "layer stride is the 256-byte uniform dynamic-offset alignment");
{
  const Context = { Seed: 1000, WorldSize: 12000, HeightScale: 2400, Size: 1024 };
  const Buffer = new ArrayBuffer(Spec.LayerStride * 2);
  const Layer = Spec.MakeTerrainLayer("Mountain", { Blend: "Maximum", Seed: 7 });
  Layer.Mask = { Source: "Slope", Low: 0.2, High: 0.8, Falloff: 0.05, Invert: true };
  Spec.PackTerrainLayer(Layer, Buffer, Spec.LayerStride, Context);

  const Words = new Uint32Array(Buffer, Spec.LayerStride, 64);
  const Reals = new Float32Array(Buffer, Spec.LayerStride, 64);
  Check(Words[0] === Spec.TerrainOrdinal("Mountain"), "packed kind ordinal lands in word 0");
  Check(Words[1] === Spec.BlendModes.indexOf("Maximum"), "packed blend lands in word 1");
  Check(Words[2] === 1007, "packed seed is the world seed plus the layer offset");
  Check((Words[3] & 1) === 1, "invert flag is bit 0");
  Check(((Words[3] >> 1) & 7) === Spec.MaskSources.indexOf("Slope"), "mask source is bits 1..3");
  Check(((Words[3] >> 8) & 1) === 0, "a generator is not flagged as a modifier");
  Check(Math.abs(Reals[5] - 0.2) < 1e-6, "mask low lands in word 5");
  Check(Math.abs(Reals[7] - 0.05) < 1e-6, "mask falloff lands in word 7");
  for (const F of Spec.TerrainFields("Mountain")) {
    const Want = F.Type === "select" ? F.Options.indexOf(Layer.Values[F.Key]) : Layer.Values[F.Key];
    Check(Math.abs(Reals[12 + F.Slot] - Want) < 1e-4, `Mountain.${F.Key} lands at word ${12 + F.Slot}`);
  }

  const Modifier = Spec.MakeTerrainLayer("Hydraulic");
  Spec.PackTerrainLayer(Modifier, Buffer, 0, Context);
  Check(((new Uint32Array(Buffer, 0, 64)[3] >> 8) & 1) === 1, "a modifier sets the role bit");

  const Coat = Spec.MakeTextureLayer("Snow", { Colour: "#ffffff", Roughness: 0.5 });
  Spec.PackTextureLayer(Coat, Buffer, 0, Context);
  const CoatReals = new Float32Array(Buffer, 0, 64);
  Check(Math.abs(CoatReals[5] - 1) < 1e-6, "white packs as linear 1.0");
  Check(Math.abs(CoatReals[8] - 0.5) < 1e-6, "roughness lands in word 8");
  const Mid = Spec.ReadColour("#808080")[0];
  Check(Mid > 0.21 && Mid < 0.22, `mid grey converts to linear ${Mid.toFixed(4)}, not to 0.5`);
  Check(Spec.WriteColour(Spec.ReadColour("#9c6c46")) === "#9c6c46", "colour round-trips through linear");
}

// ── 4. The slot contract between the tables and the WGSL ──────────────────────────────────────────

const Kernel = Relief.ReliefKernelSource;
const Coats = Material.MaterialKernelSource;

function SlotComments(Source) {
  const Found = new Set();
  for (const Line of Source.split("\n")) {
    const Single = Line.match(/\/\/\s*slot\s+(\d+)\s+(\w+)/);
    if (Single) Found.add(`${Single[1]}:${Single[2]}`);
    const Many = Line.match(/\/\/\s*slots\s+([\d,\s]+)\s+([\w/]+)/);
    if (Many) {
      const Numbers = Many[1].split(",").map((N) => N.trim()).filter(Boolean);
      const Names = Many[2].split("/");
      // "slots 9,10 OffsetX/Y" names the pair by its common stem.
      Numbers.forEach((N, I) => Found.add(`${N}:${Names[0].replace(/[XY]$/, "")}${Names[I] ? Names[I].slice(-1) : ""}`));
    }
  }
  return Found;
}

const Documented = SlotComments(Kernel);
for (const [Kind, Entry] of Object.entries(Spec.TerrainKinds)) {
  for (const F of Entry.Fields) {
    if (F.Host) continue;   // read by the scheduler, never handed to a kernel
    Check(Documented.has(`${F.Slot}:${F.Key}`),
      `WGSL reads ${Kind}.${F.Key} from slot ${F.Slot} (expects a "// slot ${F.Slot}  ${F.Key}" comment)`);
  }
}
for (const Pair of Documented) {
  const [Slot, Key] = Pair.split(":");
  const Known = Object.values(Spec.TerrainKinds)
    .some((E) => E.Fields.some((F) => F.Key === Key && String(F.Slot) === Slot));
  Check(Known, `WGSL slot comment ${Pair} corresponds to a declared field`);
}

// The texture kernel indexes P[0] and P[1] directly; every texture slot must be inside that window.
for (const Kind of Object.keys(Spec.TextureKinds)) {
  for (const F of Spec.TextureFields(Kind)) {
    Check(F.Slot <= 6, `${Kind}.${F.Key}: slot ${F.Slot} is inside the window the coat kernel reads`);
  }
}

// The hydraulic layer reuses the slumping kernels, so it must flag which slot set applies.
{
  const Context = { Seed: 1, WorldSize: 1000, HeightScale: 100, Size: 256 };
  const Buffer = new ArrayBuffer(Spec.LayerStride);
  Spec.PackTerrainLayer(Spec.MakeTerrainLayer("Hydraulic"), Buffer, 0, Context);
  Check(((new Uint32Array(Buffer, 0, 64)[3] >> 9) & 1) === 1, "a hydraulic layer sets the coupling bit");
  Spec.PackTerrainLayer(Spec.MakeTerrainLayer("Thermal"), Buffer, 0, Context);
  Check(((new Uint32Array(Buffer, 0, 64)[3] >> 9) & 1) === 0, "a thermal layer does not");
  Check(Kernel.includes("fn Coupled() -> bool { return (Layer.Flags & 512u) != 0u; }"),
    "the relief kernel reads that bit");
  for (const Name of ["ThermalGather", "ThermalSettle"]) {
    const Start = Kernel.indexOf(`fn ${Name}(`);
    const Body = Kernel.slice(Start, Kernel.indexOf("@compute", Start + 10));
    Check(!/Par\((?:1u|2u|3u)\)/.test(Body),
      `${Name} reads its talus through the accessor, not from slots that mean rainfall on a hydraulic layer`);
  }
}

// ── 5. Kind ordinals must agree with the WGSL constants ───────────────────────────────────────────

for (const [Index, Kind] of Object.keys(Spec.TerrainKinds).entries()) {
  const Want = new RegExp(`const\\s+Kind${Kind}\\s*:\\s*u32\\s*=\\s*${Index}u\\s*;`);
  Check(Want.test(Kernel), `relief kernel declares Kind${Kind} = ${Index}`);
}
for (const [Index, Kind] of Object.keys(Spec.TextureKinds).entries()) {
  const Want = new RegExp(`const\\s+Coat${Kind}\\s*:\\s*u32\\s*=\\s*${Index}u\\s*;`);
  Check(Want.test(Coats), `coat kernel declares Coat${Kind} = ${Index}`);
}

// ── 6. Bindings declared twice must match ─────────────────────────────────────────────────────────

function Declared(Source) {
  const Out = [];
  const Pattern = /@group\((\d+)\)\s*@binding\((\d+)\)\s*var(?:<([^>]*)>)?\s+(\w+)/g;
  let M = Pattern.exec(Source);
  while (M) {
    Out.push({ Group: Number(M[1]), Binding: Number(M[2]), Space: (M[3] || "").trim(), Name: M[4] });
    M = Pattern.exec(Source);
  }
  return Out;
}

{
  const Bound = Declared(Kernel);
  const Fields = Bound.filter((B) => B.Group === 0);
  Check(Fields.length === 9, `relief kernel binds nine resources in group 0, found ${Fields.length}`);
  Check(Fields[0].Space === "uniform", "relief binding 0 is the frame uniform");
  Check(Fields.slice(1).every((B) => B.Space === "storage, read_write"),
    "relief bindings 1..8 are read_write storage");
  Check(Fields.filter((B) => B.Space !== "uniform").length <= 8,
    "relief kernel stays inside the eight storage buffers a shader stage is guaranteed");
  Check(Bound.some((B) => B.Group === 1 && B.Binding === 0 && B.Space === "uniform"),
    "relief kernel takes its layer parameters from group 1");
  const Numbers = Fields.map((B) => B.Binding).join(",");
  Check(Numbers === "0,1,2,3,4,5,6,7,8", `relief bindings are contiguous, got ${Numbers}`);
}

{
  const Bound = Declared(Coats);
  const Fields = Bound.filter((B) => B.Group === 0);
  Check(Fields.length === 6, `coat kernel binds six resources in group 0, found ${Fields.length}`);
  Check(Fields.filter((B) => B.Space.startsWith("storage")).length === 5,
    "coat kernel uses five storage buffers");
  Check(Bound.filter((B) => B.Group === 1).length === 3, "coat kernel writes three storage textures");
  Check((Coats.match(/texture_storage_2d<rgba16float, write>/g) || []).length === 3,
    "the three targets are write-only rgba16float, which is storage-capable in core WebGPU");
}

{
  const Bound = Declared(Surface.SurfaceShaderSource);
  Check(Bound.filter((B) => B.Group === 0).length === 2, "render shader binds the view and the heightfield");
  Check(Bound.filter((B) => B.Group === 1).length === 4, "render shader binds a sampler and three maps");
  Check(Surface.SurfaceShaderSource.includes("var<storage, read> Height"),
    "the vertex stage reads the heightfield as read-only storage, which is what core WebGPU allows");
}

// ── 7. Entry points ───────────────────────────────────────────────────────────────────────────────

for (const Name of Relief.ReliefEntryPoints) {
  Check(new RegExp(`fn\\s+${Name}\\s*\\(`).test(Kernel), `relief kernel defines ${Name}`);
}
for (const Name of ["OccludeMain", "ShadeMain", "ResolveMain"]) {
  Check(new RegExp(`fn\\s+${Name}\\s*\\(`).test(Coats), `coat kernel defines ${Name}`);
}
for (const Name of ["SkyVertex", "SkyFragment", "GroundVertex", "GroundFragment", "WaterVertex", "WaterFragment"]) {
  Check(new RegExp(`fn\\s+${Name}\\s*\\(`).test(Surface.SurfaceShaderSource), `render shader defines ${Name}`);
}

// Every compute entry point must guard against the tail of a partial workgroup.
for (const Source of [Kernel, Coats]) {
  const Bodies = Source.split("@compute").slice(1);
  for (const Body of Bodies) {
    const Name = (Body.match(/fn\s+(\w+)/) || [])[1];
    Check(/if\s*\(G\.x\s*>=\s*S\s*\|\|\s*G\.y\s*>=\s*S\)\s*\{\s*return;/.test(Body.slice(0, 420)),
      `${Name} rejects invocations past the edge of the field`);
    Check(/@workgroup_size\(8,\s*8\)/.test(Body.slice(0, 80)), `${Name} uses the 8×8 workgroup the host dispatches`);
  }
}

// ── 8. Structural WGSL sanity, and reflection if it is installed ──────────────────────────────────

for (const [Name, Source] of [["relief", Kernel], ["coat", Coats], ["render", Surface.SurfaceShaderSource]]) {
  const Opens = (Source.match(/\{/g) || []).length;
  const Shuts = (Source.match(/\}/g) || []).length;
  Check(Opens === Shuts, `${Name} shader has balanced braces (${Opens} vs ${Shuts})`);
  Check(!Source.includes("\t"), `${Name} shader has no tabs`);
  // A dynamically indexed array has to live in memory, not in a let.
  for (const M of Source.matchAll(/let\s+(\w+)\s*=\s*array</g)) {
    Check(false, `${Name}: ${M[1]} is a let-bound array; WGSL cannot index that dynamically`);
  }
}

let Reflected = false;
for (const Candidate of [
  "wgsl_reflect",
  join(Here, "../../_AgentScratch/tools/node_modules/wgsl_reflect/wgsl_reflect.module.js"),
]) {
  try {
    const { WgslReflect } = await import(Candidate);
    const Sizes = {};
    for (const [Name, Source] of [["relief", Kernel], ["coat", Coats], ["render", Surface.SurfaceShaderSource]]) {
      const R = new WgslReflect(Source);
      Check(true, `${Name} shader parses as WGSL`);
      for (const S of R.structs) Sizes[S.name] = S.size;
    }
    Check(Sizes.SceneUniform === 80, `SceneUniform is 80 bytes, matching the host buffer (got ${Sizes.SceneUniform})`);
    Check(Sizes.Coat === 256, `Coat is 256 bytes, matching the layer stride (got ${Sizes.Coat})`);
    Check(Sizes.ViewUniform === 256, `ViewUniform is 256 bytes, matching the host buffer (got ${Sizes.ViewUniform})`);
    Reflected = true;
    break;
  } catch (E) {
    if (!/Cannot find (module|package)/.test(String(E.message))) throw E;
  }
}

// ── 9. The host's DOM hooks must exist in the page ────────────────────────────────────────────────

const Page = Read("index.html");
const HostSource = Read("TerrainHost.js");
const StackSource = Read("StackPanel.js");
const Sheet = Read("TerrainSequence.css");

for (const M of HostSource.matchAll(/querySelector\((?:"|')([^"']+)(?:"|')\)/g)) {
  const Selector = M[1];
  if (Selector.startsWith(".console ") || Selector.includes(":")) continue;
  const Token = Selector.replace(/^[.[]/, "").replace(/[\]"']/g, "").split(/[ .[]/)[0];
  Check(Page.includes(Token) || Sheet.includes(Token) || StackSource.includes(Token),
    `index.html provides the hook the host looks for: ${Selector}`);
}
for (const Id of ["Viewport", "PresetBar"]) {
  Check(Page.includes(`id="${Id}"`), `index.html declares #${Id}`);
}
Check(Page.includes('<script type="module" src="TerrainHost.js">'), "index.html loads the host as a module");
Check(Page.includes('href="TerrainSequence.css"'), "index.html loads the stylesheet");
for (const Font of ["DMSans-Light.ttf", "DMSans-Regular.ttf"]) {
  Check(Sheet.includes(Font), `the stylesheet embeds ${Font}`);
}

// Panels must not reach for the DOM while they are being imported.
for (const [Name, Source] of [["StackPanel", StackSource], ["InspectorPanel", Read("InspectorPanel.js")]]) {
  const Top = Source.split(/^export class/m)[0];
  Check(!/\bdocument\./.test(Top), `${Name} touches no DOM at import time`);
}

// ── 10. Cross-module names ────────────────────────────────────────────────────────────────────────
//
// A named import that nothing exports is a blank page with one line in the console, and it is the
// single most likely way this application fails to start. Every one is resolved here instead.

const Modules = ["ActionIcon.js", "DaylightProjection.js", "HeightSpecification.js", "InspectorPanel.js",
  "MaterialSolver.js", "OrbitProjection.js", "ReliefSolver.js", "StackPanel.js", "SurfaceProjection.js",
  "TerrainHost.js"];
const Exported = {};
for (const Name of Modules) {
  const Source = Read(Name);
  const Out = new Set();
  for (const M of Source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/gm)) Out.add(M[1]);
  for (const M of Source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const Piece of M[1].split(",")) {
      const Named = Piece.trim().split(/\s+as\s+/).pop().trim();
      if (Named) Out.add(Named);
    }
  }
  Exported[Name] = Out;
}
for (const Name of Modules) {
  const Source = Read(Name);
  for (const M of Source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([\w.]+)"/g)) {
    const From = M[2];
    Check(Boolean(Exported[From]), `${Name} imports from ${From}, which is a module that exists`);
    if (!Exported[From]) continue;
    for (const Piece of M[1].split(",")) {
      const Wanted = Piece.trim().split(/\s+as\s+/)[0].trim();
      if (!Wanted) continue;
      Check(Exported[From].has(Wanted), `${From} exports ${Wanted}, which ${Name} imports`);
    }
  }
  // An import that is never used is dead weight the reader has to discount.
  for (const M of Source.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const Piece of M[1].split(",")) {
      const Wanted = Piece.trim().split(/\s+as\s+/).pop().trim();
      if (!Wanted) continue;
      const Uses = (Source.match(new RegExp(`\\b${Wanted}\\b`, "g")) || []).length;
      Check(Uses > 1, `${Name} actually uses the ${Wanted} it imports`);
    }
  }
}

// Every glyph asked for must exist, or the button renders as a warning triangle.
{
  const Glyphs = new Set();
  const Body = Read("ActionIcon.js").split("const Paths = {")[1].split("\n};")[0];
  for (const M of Body.matchAll(/^\s{2}"?([\w-]+)"?:\s*"/gm)) Glyphs.add(M[1]);
  Check(Glyphs.size > 12, `the icon set has ${Glyphs.size} glyphs`);
  for (const Name of ["StackPanel.js", "InspectorPanel.js", "TerrainHost.js"]) {
    for (const M of Read(Name).matchAll(/\bIcon\(\s*"([\w-]+)"/g)) {
      Check(Glyphs.has(M[1]), `${Name} asks for the "${M[1]}" glyph, which the icon set defines`);
    }
  }
  // A malformed path draws nothing at all and says nothing about it, so the syntax is parsed.
  const Counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const Table_ = Read("ActionIcon.js").split("const Paths = {")[1].split("\n};")[0];
  for (const M of Table_.matchAll(/^\s{2}"?([\w-]+)"?:\s*"([^"]*)"/gm)) {
    for (const Piece of M[2].split("|")) {
      Check(/^M/.test(Piece), `${M[1]}: every subpath starts with a move`);
      const Tokens = Piece.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
      let Command = "";
      let Pending = 0;
      let Clean = true;
      for (const T of Tokens) {
        if (/[A-Za-z]/.test(T)) {
          if (Pending !== 0) Clean = false;
          Command = T.toUpperCase();
          if (!(Command in Counts)) { Clean = false; break; }
          Pending = Counts[Command];
        } else {
          if (Pending === 0) { if (Command === "Z") { Clean = false; break; } Pending = Counts[Command]; }
          Pending -= 1;
        }
      }
      Check(Clean && Pending === 0, `${M[1]}: "${Piece.slice(0, 28)}…" is well formed path data`);
    }
  }
  for (const Table of ["TerrainKinds", "TextureKinds"]) {
    for (const [Kind, Entry] of Object.entries(Spec[Table])) {
      Check(Glyphs.has(Entry.Glyph), `${Kind} names the "${Entry.Glyph}" glyph, which the icon set defines`);
    }
  }
}

// ── 10. Lighting ──────────────────────────────────────────────────────────────────────────────────

const Light = await import("./DaylightProjection.js");
{
  const Low = Light.SunColour(0, 1);
  const High = Light.SunColour(70, 1);
  Check(Low[2] < Low[0], "the low sun is redder than it is blue");
  Check(High[2] > Low[2], "the high sun is less reddened than the low one");
  Check(High[0] > Low[0], "the low sun is dimmer overall, as air mass says it must be");
  const Dawn = Light.SkyColour(-3);
  const Noon = Light.SkyColour(60);
  Check(Noon[2] > Dawn[2], "the daytime sky is brighter than the twilight one");
  Check(Noon[2] > Noon[0], "the sky is blue");
}

// ── Report ────────────────────────────────────────────────────────────────────────────────────────

if (Failures.length) {
  console.error(`FAIL ${Failures.length} of ${Passed + Failures.length} checks`);
  for (const F of Failures) console.error(`  · ${F}`);
  process.exit(1);
}
console.log(`PASS ${Passed} checks: the terrain tables, the uniform packing, the slot contract, the`);
console.log(`bind layouts, the entry points${Reflected ? ", the parsed WGSL struct sizes" : ""} and the page wiring all agree.`);
