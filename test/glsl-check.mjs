// Frontier — static GLSL assembly check (no GPU needed).
// Builds every shader for every resolution tier and verifies:
//   • no unresolved template placeholders
//   • balanced braces/parens
//   • every `texture(...)`/sampler use has a declared uniform
//   • no sampler declared but never bound in the JS pass wiring (warn only)
//   • vertex/fragment varyings match for the splat program
// Run: node test/glsl-check.mjs

import { setTier, TIERS } from "../src/core/constants.js";
import * as S from "../src/gl/erosion-shaders.js";
import { fragmentGLSL, grainVertex, grainFragment } from "../src/gl/render-shaders.js";
import { fullscreenVertex, uniformsGLSL } from "../src/gl/common.js";

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
};

const shaders = {
  motion: ["", S.motionFragment()],
  event: ["", S.eventFragment()],
  splatV: [S.splatVertex(), ""],
  splatF: ["", S.splatFragment()],
  apply: ["", S.applyFragment()],
  cargo: ["", S.cargoFragment()],
  distance: ["", S.distanceFragment()],
  clamp: ["", S.clampFragment()],
  thermal: ["", S.thermalFragment()],
  sculpt: ["", S.sculptFragment()],
  pick: ["", S.pickFragment()],
  render: ["", fragmentGLSL()],
  grainsV: [grainVertex(), ""],
  grainsF: ["", grainFragment],
};

for (const tier of Object.keys(TIERS)) {
  setTier(tier);
  // regenerate (lazy functions bake the tier)
  shaders.motion[1] = S.motionFragment();
  shaders.event[1] = S.eventFragment();
  shaders.splatV[0] = S.splatVertex();
  shaders.splatF[1] = S.splatFragment();
  shaders.apply[1] = S.applyFragment();
  shaders.cargo[1] = S.cargoFragment();
  shaders.distance[1] = S.distanceFragment();
  shaders.clamp[1] = S.clampFragment();
  shaders.thermal[1] = S.thermalFragment();
  shaders.sculpt[1] = S.sculptFragment();
  shaders.pick[1] = S.pickFragment();
  shaders.render[1] = fragmentGLSL();
  shaders.grainsV[0] = grainVertex();

  for (const [name, [vs, fs]] of Object.entries(shaders)) {
    for (const [slot, code] of [["vs", vs], ["fs", fs]]) {
      if (!code) continue;
      const body = code.startsWith("#version") ? code : `#version 300 es\nprecision highp float;\n${code}`;
      const unresolved = body.includes("${");
      const braces = (body.split("{").length - 1) === (body.split("}").length - 1);
      const parens = (body.split("(").length - 1) === (body.split(")").length - 1);
      check(`${tier}/${name}/${slot} structure`, !unresolved && braces && parens,
        unresolved ? "unresolved ${} placeholder" : !braces ? "unbalanced braces" : !parens ? "unbalanced parens" : "ok");
    }
  }

  // varyings: splat vertex outs vs fragment ins (expand comma lists)
  {
    const expand = (decl, kw) => {
      const out = [];
      for (const m of decl.matchAll(new RegExp(`flat ${kw} (\\w+) ([\\w, ]+);`, "g"))) {
        for (const n of m[2].split(",").map(s => s.trim()).filter(Boolean)) out.push(`${n}:${m[1]}`);
      }
      return out.sort();
    };
    const vOuts = expand(shaders.splatV[0], "out");
    const fIns = expand(shaders.splatF[1], "in");
    check(`${tier}/splat varyings match`, JSON.stringify(vOuts) === JSON.stringify(fIns), `${vOuts.join(",")} vs ${fIns.join(",")}`);
  }

  // every sampler referenced in each fragment body must be declared
  for (const [name, [, fs]] of Object.entries(shaders)) {
    if (!fs) continue;
    // declared: expand multi-name uniform sampler declarations
    const declared = new Set();
    for (const m of fs.matchAll(/uniform\s+\w+\s+([\w, ]+);/g)) {
      for (const n of m[1].split(",").map(s => s.trim()).filter(Boolean)) declared.add(n);
    }
    if (!/texelFetch\(|texture\(/.test(fs)) continue;
    const used = new Set();
    for (const m of fs.matchAll(/texelFetch\(\s*(\w+)\s*,/g)) used.add(m[1]);
    for (const m of fs.matchAll(/texture\(\s*(\w+)\s*,/g)) used.add(m[1]);
    // helper-function parameters & non-sampler args that regex over-matches
    const notSamplers = new Set(["tex", "q", "i", "uv", "pix"]);
    const missing = [...used].filter(u => !declared.has(u) && !notSamplers.has(u));
    check(`${tier}/${name} samplers declared`, missing.length === 0, missing.length ? `missing: ${missing.join(",")}` : "ok");
  }
}

// uniformsGLSL cross-check against gpu.js bindings (warn-level): extract texs keys
import { readFileSync } from "node:fs";
const gpuSrc = readFileSync(new URL("../src/gl/gpu.js", import.meta.url), "utf8");
const preludeSamplers = [...uniformsGLSL.matchAll(/uniform sampler2D ([\w, ]+);/g)].flatMap(m => m[1].split(",").map(s => s.trim()));
const boundNames = new Set([...gpuSrc.matchAll(/\b(\w+):\s*(?:oldVol|this\.\w+)/g)].map(m => m[1]));
const neverBound = preludeSamplers.filter(s => !boundNames.has(s));
check("uniformsGLSL samplers bound in gpu.js", true, neverBound.length ? `warning — never bound: ${neverBound.join(",")} (stripped if unused)` : "all bound");

console.log(failures === 0 ? "\nGLSL assembly OK." : `\n${failures} GLSL CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
