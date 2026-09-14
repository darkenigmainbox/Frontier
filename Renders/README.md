# Celestial renders — P1..P4

Every lighting value in these images is produced by the **shipping shader source**, evaluated on the CPU.
`Scratchpad/ExtractCelestialPort.sh` lifts the real text of `CelestialRecord`, `CelestialAtmosphereOf`,
`CelestialObserver`, `CelestialSunDisc`, `CelestialMoonDisc`, the integrated lens-flare functions and `CelestialSky` out of
`Engine/Shaders/ReSTIRViewport.slang` and compiles it as C++.

`Scratchpad/CheckShowcaseTracksShader.sh` proves that by falsification: it breaks the shader and requires the
render to change (zeroing the sun disc, halving sky radiance, removing the moon disc).

**Not a GPU screenshot.** Same source text, same inputs, same maths — but the Vulkan path is unproven until it
runs on hardware. The BVH and BSDF stack are also stand-ins here (three analytic spheres, Lambertian), because
the engine's traversal needs a GPU. The *lighting* is the engine's; the *geometry and materials* are not.

| file | what it shows |
|---|---|
| `00_day_cycle_contact_sheet.png` | all ten times of day on one sheet |
| `01`..`10` | 05:30 dawn through 22:00 night, in order |
| `11_morning_hero.png` | 07:12, large — blue sky-lit shadows |
| `12_golden_hour_hero.png` | 17:48, large — warm direct light, gold horizon |
| `13_sunrise_hero.png` | 06:18, large |
| `14_sun_shadows_four_elevations.png` | shadows lengthening and warming as the sun sets |
| `15_sky_only_four_elevations.png` | sky alone, no scene |
| `16_exposure_F3_adaptive_vs_celestial.png` | the F3 fix: a 105° pan, Adaptive (top) vs Celestial (bottom) |
| `17_sky_lit_ground.png` | ground lit only by the sky |

Scene: Benoni (−26.19°, +28.32°), 2026-09-13, UTC+2. Sun and moon positions come from the real almanac
ephemeris in `CelestialSolver.h`, not hand-placed angles — at noon the sun is at azimuth 1.33°, i.e. due
**north**, which is correct for the southern hemisphere.

Regenerate:

    bash Scratchpad/ExtractCelestialPort.sh /tmp/CelestialPort.inc
    g++ -std=c++20 -O2 -I Scratchpad -I . Scratchpad/CelestialShowcase.cpp \
        Engine/DisplayPresentation/ExposureIntegrator.cpp -o /tmp/showcase
    /tmp/showcase 17.8 /tmp/out.ppm 900 540 96


### Integrated lens-flare references

`40_project_zero_full_flare.png` is the Project Zero scene with the default Full style (streak, ghosts, starburst and halo).
`43_project_zero_full_flare_clear.png` is the same view with the cloud layer cleared so the optical stack can be inspected
against a clean sunset. `44_project_zero_full_flare_inspected.png` frames the sun against the clear blue sky so the halo,
colored diffraction edge, horizontal streak and displaced ghost chain can be inspected at once. These are CPU references
built from the extracted shipping shader and the exact 448-byte packed celestial record; they are not native Vulkan screenshots.

### Direct Celestial lens-flare port (2026-09-14)

`45_reference_flare_clear.png` is a regenerated clear-sky frame from the current CPU shader port using the default
Full mask and the exact 448-byte packed record. `46_reference_flare_inspected.png` uses the same scene and copied
reference profiles with an inspection-only intensity lift, so the halo, horizontal streak, source-axis ghosts and
dual starburst can be inspected without changing their shape. These are CPU renders; native Project Zero Vulkan
rendering remains unavailable in the local environment.

The older `40`, `43`, and `44` images predate the direct Celestial-source adaptation and are retained as historical
renders only; they are not parity evidence for the current lens-flare implementation.
