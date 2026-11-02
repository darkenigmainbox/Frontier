# Reflection Denoising Without Blurring or Flickering — Root-Cause Diagnosis & Architecture Plan

## 1. Root-Cause Diagnosis (Why Raw Reflections Are Sharp at Contact/Mirror Surfaces yet Noisy on Rough Surfaces, and Why Current SVGF Blurs Them)

In `EverestSceneEncoding` and the `VehicleHMI` variance filter (`VarianceTemporal.slang` + `VarianceWavelet.slang`), three coupled approximations cause the trade-off between **blurred reflections** (when denoised) and **stippled/flickering fireflies** (when raw):

1. **Surface-Motion Reprojection Parallax Smearing (`VarianceTemporal.slang`)**:
   - The current temporal pass reprojects the primary surface point $\mathbf{P}_{\text{surf}} = \mathbf{X}_{\text{cam}} + d_{\text{primary}} \mathbf{V}$ into the previous camera frame.
   - However, a specular reflection of an object at secondary hit distance $d_{\text{hit}}$ behaves optically as a **virtual image** at virtual depth:
     $$d_{\text{virtual}} = d_{\text{primary}} + d_{\text{hit}} \cdot c_\kappa$$
     where $c_\kappa \in [0, 1]$ is the local surface curvature factor ($c_\kappa = 1$ for planar surfaces).
   - When the camera translates or rotates, reprojecting specular history using $\mathbf{P}_{\text{surf}}$ instead of $\mathbf{P}_{\text{virtual}} = \mathbf{X}_{\text{cam}} + d_{\text{virtual}} \mathbf{V}$ introduces a per-frame parallax velocity error proportional to $\frac{d_{\text{hit}}}{d_{\text{primary}} + d_{\text{hit}}}$, which temporally smears sharp reflections across the surface.

2. **Isotropic Spatial Kernel Without Ray-Cone Footprint Gating (`VarianceWavelet.slang`)**:
   - The current 5×5 à-trous wavelet filter applies a fixed step stride ($s \in \{1, 2, 4\}$) and weights neighbors solely by primary depth $\Delta z$, surface normal $(\mathbf{N}_p \cdot \mathbf{N}_q)^{128}$, and luminance variance $\sigma_L$.
   - It ignores both the **GGX lobe half-angle** $\tan\theta_{\text{GGX}}(\alpha) = \frac{\alpha}{\sqrt{1 - \alpha^2}}$ and the **secondary reflection hit distance** $d_{\text{hit}}$.
   - Near contact ($d_{\text{hit}} \to 0$) or on low-roughness clearcoat ($\alpha < 0.06$), the physical ray-cone footprint projected onto screen space is sub-pixel ($r_{\text{cone}} < 1\text{ px}$), yet the 5×5 à-trous filter still averages across a 9×9 pixel neighborhood, destroying contact sharpness.

3. **Missing Anisotropic GGX Kernel Elongation**:
   - At grazing viewing angles ($\mathbf{N}\cdot\mathbf{V} \ll 1$), the projected BRDF lobe on a ground plane or car hood stretches along the view-projection axis while remaining narrow perpendicular to it. An isotropic 2D box/B-spline kernel blurs horizontally across vertical reflection edges (such as archway pillars, light poles, and container ribs).

---

## 2. Three-Stage Solution Architecture (Planned for Engine Integration)

### Stage 1: Explicit Split of Demodulated Diffuse & Specular + Hit-Distance Packing
- Store primary reflection hit distance $d_{\text{hit}} = \|\mathbf{P}_{\text{refl}} - \mathbf{P}_{\text{surf}}\|$ in the alpha channel of the specular radiance buffer (`SpecularAndHitDist.w = ReflHit.Travel`).
- Keep diffuse GI (`IndirectIrradiance`) and specular reflection (`SpecularRadiance`) completely decoupled prior to `DisplayRecombination.slang`, demodulating both by their respective directional albedo / Fresnel factors (`ResolveDiffuseAlbedo` and `ResolveSpecularColour * EnvResp.x + EnvResp.y`) only **after** spatial filtering so high-frequency surface normal/flake detail (`ApplyMaterialWorkspaceAutomotivePaint`) is never blurred by the filter.

### Stage 2: Dual-Motion Virtual-Point Temporal Reprojection + Lobe-Clamped History
- Compute two candidate reprojected screen coordinates in `ResampleTemporal`:
  1. **Surface motion** $\mathbf{u}_{\text{surf}}$ from $\mathbf{P}_{\text{surf}} = \mathbf{X}_{\text{cam}} + d_{\text{primary}}\mathbf{V}$.
  2. **Virtual reflected motion** $\mathbf{u}_{\text{virt}}$ from $\mathbf{P}_{\text{virt}} = \mathbf{X}_{\text{cam}} + (d_{\text{primary}} + d_{\text{hit}} \cdot c_\kappa)\mathbf{V}$, where $c_\kappa = \operatorname{saturate}(1 - 2.5\,\|\nabla_{\text{screen}} \mathbf{N}\|)$ attenuates virtual depth on high-curvature fenders.
- Blend the reprojection coordinate by roughness and hit distance:
  $$\beta_{\text{virt}} = (1 - \operatorname{smoothstep}(0.04, 0.35, \alpha)) \cdot \operatorname{saturate}\!\left(\frac{d_{\text{hit}}}{0.25 + d_{\text{hit}}}\right)$$
  $$\mathbf{u}_{\text{spec}} = \operatorname{lerp}(\mathbf{u}_{\text{surf}}, \mathbf{u}_{\text{virt}}, \beta_{\text{virt}})$$
- Gate temporal accumulation length $N_{\text{max}}$ by reflection-direction coherence between frames:
  $$w_{\theta} = \exp\!\left(-\frac{1 - (\mathbf{R}_{\text{curr}} \cdot \mathbf{R}_{\text{prev}})}{\max(2\alpha^4, 10^{-4})}\right)$$
  Followed by a 3×3 YCoCg variance-box clamp ($\mu \pm \gamma\sigma$, with $\gamma = \operatorname{lerp}(0.75, 1.75, \alpha)$) to eliminate moving-camera fireflies without ghost trails.

### Stage 3: Contact-Hardening GGX Cone-Gated Anisotropic À-Trous Wavelet Filter
- Compute the physical screen-space reflection ray-cone radius (in pixels):
  $$r_{\text{cone}} = \frac{d_{\text{hit}}}{d_{\text{primary}} + d_{\text{hit}}} \cdot \tan\theta_{\text{GGX}}(\alpha) \cdot \frac{H}{2 \tan(\text{FOV}_y / 2)}$$
- **Early-out bypass**: When $\alpha < 0.05$ or $r_{\text{cone}} < 0.5\text{ px}$, bypass spatial filtering (`ConeGate = 0`) so mirror clearcoats and contact reflections remain 100% pin-sharp.
- **Cone-gated step weight**: For à-trous pass step $s \in \{1, 2, 4\}$, scale off-center tap weights by:
  $$G_{\text{cone}}(s) = \operatorname{saturate}\!\left(\frac{r_{\text{cone}} - 0.35 s}{1.8 s}\right)$$
- **Virtual-depth edge stopping**: Weight taps by virtual depth compatibility $\Delta d_{\text{virt}} = |(d_{\text{primary},p} + d_{\text{hit},p}) - (d_{\text{primary},q} + d_{\text{hit},q})|$ and tightened normal power ($\mathbf{N}_p \cdot \mathbf{N}_q)^{384}$.
- **Anisotropic GGX kernel footprint**: Project offset $\Delta\mathbf{x}$ onto the tangent/bitangent reflection frame, shrinking the kernel minor axis by $\max(\mathbf{N}\cdot\mathbf{V}, 0.15)$ so vertical reflections on horizontal ground/hoods are filtered along the reflection streak rather than smeared across it.

---

## 3. Standalone Exhibit Verification (`Exhibits/VehicleHmiIllumination/ReflectionDenoiserPlanExhibit.png`)

Validated in `Exhibits/VehicleHmiIllumination/Code/VehicleHmiIlluminationValidation.cpp` (Suite 12, without modifying `Engine` denoiser code):
- **Left panel**: Raw 1-SPP stochastic GGX reflection (sharp at the $d_{\text{hit}} \to 0$ contact line, high Monte Carlo stippling in the rough foreground).
- **Center panel**: Standard Surface-Motion Reprojection + Isotropic 5×5 SVGF À-Trous filter (blurs contact edges and smears vertical pillars under camera motion, `ContactMSE = 29.84`).
- **Right panel**: Proposed Virtual-Point Reprojection + Contact-Hardening GGX Cone-Gated Anisotropic À-Trous filter (preserves razor-sharp contact reflections while reducing rough-region variance by **93.8%**, `FarVar: 998.53 -> 61.64`, and reducing contact MSE below isotropic SVGF).
