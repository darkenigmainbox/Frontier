//============================================================================================================================================
// 📦 Engine/DisplayPresentation/CelestialStructure.h — every celestial property, in one place, with its slider metadata
//============================================================================================================================================
// 🧩 The single source of truth for sun · sky · clouds · fog · moon · stars. Nothing else declares a celestial
//    default; the ephemeris reads this, the UBO packer reads this, the TOML loader writes this, and (P8) a slider
//    panel is a projection of the metadata below rather than a second list that can disagree with it.
//
//    ⚠️ WHY THE METADATA LIVES NEXT TO THE FIELD. A separate table of "here are the sliders" is a copy, and copies
//    drift: a field gets a new default and the slider keeps the old range, or a field is added and no control ever
//    appears. `CelestialProperty` below binds name · unit · range · default to the field's own address, so a
//    control cannot exist for a field that is gone, and a field cannot be added without declaring how it is edited.
//    CheckCelestialRecord.sh asserts every float field in the struct appears exactly once in the property table.
//
//    Units are stated on every field and are SI unless marked. Angles are degrees in the interface (that is what a
//    person types) and converted to radians at the point of use, never stored half-converted.
//
// Naming: `Structure` per CLAUDE.md §2 — this is a topology/settings representation, not an algorithm.

#pragma once

#include <cstddef>
#include <cstdint>

namespace Frontier {

//------------------------------------------------------------------------------------------------------------------------
//                                                  OBSERVATION (where and when)
//------------------------------------------------------------------------------------------------------------------------

// The clock and the place. Everything celestial is derived from these six numbers plus the wall clock — there is no
//    "sun direction" setting, because a hand-set sun direction and a date that disagree is a bug waiting to be filed.
struct CelestialObservation
{
    int32_t Year  = 2026;      // [y]
    int32_t Month = 9;         // [1-12]
    int32_t Day   = 13;        // [1-31]

    float LocalHours = 12.0f;  // [h]   local clock time, 0-24, fractional
    float UtcOffset  = 2.0f;   // [h]   +2 = SAST (the user's timezone)
    float Latitude   = -26.19f;// [deg] +N  (Benoni, Gauteng)
    float Longitude  = 28.32f; // [deg] +E
};

//------------------------------------------------------------------------------------------------------------------------
//                                                      THE SUN
//------------------------------------------------------------------------------------------------------------------------

struct CelestialSun
{
    // ⚠️ ANGULAR DIAMETER, not radius. The sun is 0.53° across as seen from Earth; the shader halves it. Stated in
    //    diameter because that is the number an astronomer or an artist quotes, and the halving is done once, in
    //    one place, where it can be checked.
    float AngularDiameterDegrees = 0.53f;   // [deg]
    float Intensity              = 22.0f;   // [x]   radiance multiplier for the disc and the light
    float TemperatureKelvin      = 5800.0f; // [K]   black-body tint; 5800 K is the photosphere
    float LimbDarkening          = 0.45f;   // [-]   0 = flat disc, 1 = fully dark limb (0.45 ≈ solar visible band)
};

//------------------------------------------------------------------------------------------------------------------------
//                                                   THE ATMOSPHERE
//------------------------------------------------------------------------------------------------------------------------

// Hillaire 2020 parameterisation. The Rayleigh triple is the 680/550/440 nm set — the ratio between the channels is
//    why the sky is blue and the sunset is red, so those are physics and the *Strength* multipliers are the taste.
struct CelestialAtmosphere
{
    float RayleighScattering[3] = { 5.8e-6f, 13.5e-6f, 33.1e-6f };  // [1/m] at sea level
    float MieScattering         = 21.0e-6f;                          // [1/m]
    float OzoneAbsorption[3]    = { 0.65e-6f, 1.881e-6f, 0.085e-6f };// [1/m] Chappuis band — keeps twilight blue

    float RayleighStrength = 1.0f;      // [x]
    float MieStrength      = 1.0f;      // [x]  haze
    float OzoneStrength    = 1.2f;      // [x]

    float RayleighScaleHeight = 8000.0f;  // [m]   molecular e-folding height
    float MieScaleHeight      = 1200.0f;  // [m]   aerosols hug the ground
    float MieAnisotropy       = 0.78f;    // [-]   Henyey-Greenstein g: the forward glow around the sun

    float PlanetRadius     = 6371000.0f;  // [m]   Earth mean radius
    float AtmosphereHeight = 100000.0f;   // [m]   Kármán line; top of the modelled shell

    float GroundAlbedo[3] = { 0.30f, 0.30f, 0.30f };   // [-] feeds the multiple-scattering LUT
};

//------------------------------------------------------------------------------------------------------------------------
//                                                     THE CLOUDS
//------------------------------------------------------------------------------------------------------------------------

struct CelestialClouds
{
    float Coverage   = 0.45f;    // [-]   0 = clear, 1 = overcast
    float Density    = 1.0f;     // [x]
    float BaseHeight = 1500.0f;  // [m]   above the ground plane
    float Thickness  = 900.0f;   // [m]
    // ⚠️ 1400 m put roughly one cloud across the whole visible sky at ground level, so the deck read as a few
    //    enormous smears rather than as weather. 600 m gives several distinct clouds in frame, which is what
    //    makes the sky look populated. Measured sky cover at coverage 0.5: 600 m -> 25%, 1100 m -> 42%,
    //    1800 m -> 16% (too few, too large to read as separate clouds). 1100 m gives distinct cumulus at a
    //    believable spacing. Still large relative to the 900 m slab, hence kMediaVerticalScale.
    float ShapeScale = 1100.0f;  // [m]   wavelength of the base shape
    float DetailScale = 0.6f;    // [-]   Worley erosion strength
    float Anvil      = 0.3f;     // [-]   upper-level shear/spread

    // Lighting (Schneider/Guerrilla): dual-lobe HG + Beer-powder. Defaults are the reference panel's.
    float ForwardLobe  = 0.80f;  // [-]   g1, forward scattering
    // 🔴 NEGATIVE, AND THE POSITIVE DEFAULT WAS A REAL BUG. Henyey-Greenstein's g is signed: positive scatters
    //    FORWARD, negative scatters BACK. A "backward lobe" of +0.30 is a second, weaker forward lobe, so the
    //    dual-lobe phase had no back-scatter at all — measured 0.47x the sideways value where it should exceed
    //    it. That kills the glow you see around your own shadow on a cloud (the heiligenschein / anti-solar
    //    brightening) and the silver lining on cloud edges facing away from the sun.
    float BackwardLobe = -0.30f; // [-]   g2, backscatter — MUST be negative to scatter backwards
    float LobeMix      = 0.30f;  // [-]   blend between the two lobes
    // 🔴 0.05 MADE EVERY CLOUD A HARD SILHOUETTE, AND THAT WAS THE "CHOPPED OUT" LOOK.
    //    Optical depth is density x this x path length. At 0.05, a 900 m column at only 15% density already
    //    reaches depth 6.75 — opacity 0.999. So the ENTIRE cloud, edges included, was fully opaque: measured
    //    opacity across the sky was 1.000 or 0.000 with nothing in between, i.e. a stencil rather than a volume.
    //
    //    The density field itself is smooth (measured: 0.001 -> 0.24 over 240 m of edge), so the fault was
    //    entirely here. Real cumulus extinction is 0.005-0.1 /m with a mean total optical depth near 5, and at
    //    0.012 the same edge now spans depth 0.5-1.6 — translucent, which is what gives clouds soft fringes and
    //    visible wisps instead of a cut-out silhouette.
    float Absorption   = 0.012f; // [1/m]
    float AmbientScale = 0.90f;  // [x]   sky contribution to the in-scatter
    float PowderScale  = 0.60f;  // [-]   dark-edge term
};

// A box-bounded local cloud volume — the "local clouds" of the brief. Sits in world space, independent of the layer.
struct CelestialLocalCloud
{
    bool  Enabled   = false;
    float Centre[3] = { 40.0f, -160.0f, 120.0f };   // [m]
    float Extent[3] = { 90.0f,   70.0f,  35.0f };   // [m] half-extents
    float Density   = 1.2f;                          // [x]
    float Coverage  = 0.30f;                         // [-]
};

//------------------------------------------------------------------------------------------------------------------------
//                                                       THE FOG
//------------------------------------------------------------------------------------------------------------------------

// Atmospheric (aerial-perspective) fog: the whole-world haze that makes distance readable.
struct CelestialAtmosphericFog
{
    bool  Enabled     = true;
    float Density     = 7.0e-5f;   // [1/m] extinction at the reference height
    float HeightScale = 1200.0f;   // [m]   e-folding height of the fog column
    float SunScatter  = 0.70f;     // [-]   how much sunlight forward-scatters into the fog
};

// Local fog: a box-bounded ground volume — valley mist, a fogged room.
struct CelestialLocalFog
{
    bool  Enabled   = false;
    float Centre[3] = {  6.0f,  -14.0f,  2.5f };   // [m]
    float Extent[3] = { 18.0f,   18.0f,  4.0f };   // [m] half-extents
    float Density   = 0.011f;                       // [1/m]
    float Anisotropy = 0.45f;                       // [-] HG g for the fog phase function
};

//------------------------------------------------------------------------------------------------------------------------
//                                                  THE MOON AND THE STARS
//------------------------------------------------------------------------------------------------------------------------

struct CelestialMoon
{
    bool  Enabled                = true;
    float AngularDiameterDegrees = 0.52f;   // [deg]
    float Brightness             = 1.6f;    // [x]
    float Albedo                 = 0.12f;   // [-]  the Moon is dark rock; 0.12 is the Bond albedo
    float Earthshine             = 0.02f;   // [x]  the ashen glow on the unlit limb
};

struct CelestialStars
{
    bool  Enabled    = true;
    float Brightness = 1.0f;    // [x]
    float Density    = 1.0f;    // [x]
    float SizeScale  = 1.0f;    // [x]
    float MilkyWay   = 1.0f;    // [x]
    // ⚠️ NOT a "hide in daylight" switch. Stars are always in the sky; they vanish at noon because the sky's own
    //    radiance is four orders of magnitude above them, which the physical model produces for free. A visibility
    //    flag here would be a lie that also breaks the "moon and stars can show during the day" requirement — a
    //    bright moon at 3pm is real, and it must come out of the radiance comparison, not out of a special case.
};

//------------------------------------------------------------------------------------------------------------------------
//                                                     LENS FLARE
//------------------------------------------------------------------------------------------------------------------------

// 🔴 THE FLARE IS A LENS ARTEFACT, NOT AN ATMOSPHERIC ONE, AND THAT DISTINCTION IS THE WHOLE DESIGN.
//
//    Everything else in this file describes light in the AIR — scattering, absorption, the sun's own disc. A lens
//    flare happens INSIDE the camera: light that has already arrived bounces between glass elements, diffracts at
//    the aperture blades, and lands somewhere it does not belong. Keeping the two separate matters because they
//    behave differently: the atmosphere's aureole grows as the air thickens, while a flare's ghosts move when the
//    CAMERA turns even though the air has not changed at all.
//
//    A halo is included as a controlled, soft optical ring. It is not the atmosphere's Mie aureole: its radius,
//    thickness and intensity are camera settings, and the full stack can be combined deliberately rather than
//    appearing accidentally from an oversized streak or a collapsed ghost chain.
// 🔴 A DROPDOWN OF LOOKS, NOT A QUALITY LADDER — AND THE LADDER WAS DISHONEST.
//
//    This was originally Off/Low/Medium/High, which implied each step cost more. Measured, it does not: the
//    starburst ("High") is a handful of trig ops with no loop, while the ghosts ("Medium") run a loop over
//    every ghost. The starburst is the CHEAPER of the two. The selector therefore picks a STYLE, while the element
//    mask remains freely combinable. Applying a style overwrites the shaping; Custom leaves it alone.
enum class LensFlareStyleCategory : uint32_t
{
    Off       = 0u,   // no flare at all: the sun is its disc and its tight glare, nothing more
    Cinematic = 1u,   // cool anamorphic streak + ghosts + a restrained halo
    Vintage   = 2u,   // warm ghosts + soft burst + halo + weak streak
    Clean     = 3u,   // a crisp 14-point starburst alone — a stopped-down modern prime
    Full      = 4u,   // complete optical stack: streak + ghosts + starburst + halo
    Custom    = 5u,   // touch nothing; whatever the settings below say is what you get
};

// The four elements are independent bits, so a style is a preset rather than a straitjacket. `--flare-elements`
//    can switch any combination on or off, including all four together.
enum LensFlareElementBits : uint32_t
{
    LensFlareElementStreak    = 1u << 0,   // anamorphic horizontal smear
    LensFlareElementGhosts    = 1u << 1,   // internal reflections, mirrored through the centre
    LensFlareElementStarburst = 1u << 2,   // aperture diffraction spikes
    LensFlareElementHalo      = 1u << 3,   // controlled soft optical ring
};

struct CelestialLensFlare
{
    bool                   Enabled = true;
    LensFlareStyleCategory Style   = LensFlareStyleCategory::Full;

    // The default is a visible, complete camera stack so Project Zero demonstrates the feature without an extra
    // command-line override. Custom settings can still replace the mask or any shaping below.
    uint32_t ElementMask = LensFlareElementStreak | LensFlareElementGhosts
                         | LensFlareElementStarburst | LensFlareElementHalo;   // = Full

    // 🔴 CALIBRATED AGAINST THE TONE MAP, NOT GUESSED. The flare lives in the brightest part of frame, where
    //    ACES is nearly flat — near the sun at 17:00 the sky already sits at 0.93 ACES, so lifting it takes far
    //    more linear light than intuition suggests. Measured lift above the bare sky, sweeping this multiplier:
    //
    //        1x  -> +0.039 peak     6x  -> +0.070      18x -> +0.117
    //        3x  -> +0.062         10x  -> +0.092      30x -> +0.137
    //
    //    The first defaults (1x) produced 38 changed pixels out of 128 000 — present in the numbers, invisible
    //    on screen. 6x is the knee: clearly readable, and past it the curve flattens so extra energy buys
    //    saturation rather than visibility.
    float Intensity = 1.0f;    // [x]   reference uFlareInt master multiplier

    // ── Anamorphic streak ───────────────────────────────────────────────────────────────────────────────────
    //    The horizontal blue smear of a cinema lens. Cheapest element and the most recognisable, which is why
    //    it is the one the Cinematic look emphasises.
    float StreakIntensity = 0.80f;   // [x]   reference uStreak
    float StreakLength    = 15.0f;   // [legacy] retained for settings compatibility; reference uses a fixed envelope
    float StreakThickness = 0.72f;   // [legacy] retained for settings compatibility; reference uses a fixed envelope
    float StreakTintR     = 0.68f;   // [-]   anamorphic streaks are classically blue
    float StreakTintG     = 0.82f;
    float StreakTintB     = 1.00f;

    // ── Ghosts ──────────────────────────────────────────────────────────────────────────────────────────────
    //    Internal reflections. Each ghost sits at -i x (sun position) through the frame centre, so they sweep
    //    ACROSS the frame as the camera turns — the behaviour that reads unmistakably as a lens rather than sky.
    int   GhostCount      = 5;       // [cnt]   reference default
    float GhostIntensity  = 1.0f;    // [x]   reference contribution scale
    float GhostDispersal  = 0.42f;   // [-]   reference spacing
    float GhostSize       = 1.0f;    // [-]   reference ghost-size scale
    float GhostChromatic  = 0.65f;   // [-]   reference uChroma

    // ── Starburst ───────────────────────────────────────────────────────────────────────────────────────────
    //    Aperture diffraction. The supplied reference shader fixes its two lobes (sin(4a)^24 and sin(7a)^40);
    //    the legacy blade field remains serialised for settings compatibility but does not replace those lobes.
    int   StarburstBlades    = 6;      // [cnt]
    // The reference contribution is intentionally low and spatially concentrated; keep the exact lobe formula
    //    rather than compensating with a new radial glow.
    float StarburstIntensity = 1.0f;   // [x]   reference burst contribution scale
    float StarburstLength    = 6.5f;   // [deg]
    float StarburstSharpness = 15.0f;  // [-]  higher = thinner, harder spikes

    // ── Halo ─────────────────────────────────────────────────────────────────────────────────────────────────
    //    A broad, low-energy annulus around the source. Radius and thickness are explicit so the halo remains a
    //    camera artefact rather than becoming an accidental second atmospheric sun. The shader uses the sun's
    //    spectral radiance as its base colour, keeping the four elements optically related.
    float HaloIntensity = 1.0f;  // [x]   reference halo contribution scale
    float HaloRadius    = 0.55f;  // [-] reference uHalo screen-space radius
    float HaloThickness = 0.045f;  // [-] reference ring width
    float HaloFalloff   = 1.80f;  // [legacy] reference uses a fixed ring profile

    // ⚠️ Occlusion. A flare is formed in the lens, so it must vanish when the sun goes behind something — but
    //    SOFTLY, because the sun has angular size and is progressively hidden. A hard on/off pops.
    float OcclusionFade = 1.0f;   // [-] 1 = fully fade when occluded, 0 = ignore occlusion entirely
};

// Apply a named style, overwriting the element set and the shaping that defines that look.
//
//    Presets select masks and the current project's presentation controls, while the optical profiles themselves
//    remain the exact deployed Celestial shader. The reference page has no blade-count uniform, so that legacy
//    setting is retained for file compatibility but cannot silently turn the copied starburst into another model.
//
//    ⚠️ Custom returns untouched. Without that there is nowhere to stand: any hand-tuned value would be
//    stamped over the moment the settings were re-applied, and live TOML editing would fight the preset.
inline void ApplyLensFlareStyle(CelestialLensFlare& Flare, LensFlareStyleCategory Style) noexcept
{
    Flare.Style = Style;
    if (Style == LensFlareStyleCategory::Custom) return;

    // Everything a style owns starts from a common baseline, so a preset never inherits a stray value from
    //    whichever preset happened to be selected before it.
    Flare.ElementMask       = 0u;
    Flare.Intensity         = 1.0f;
    Flare.StreakIntensity   = 0.80f;
    Flare.StreakLength      = 14.0f;
    Flare.StreakThickness   = 0.55f;
    Flare.StreakTintR       = 0.45f;
    Flare.StreakTintG       = 0.62f;
    Flare.StreakTintB       = 1.00f;
    Flare.GhostCount        = 5;
    Flare.GhostIntensity    = 1.0f;
    Flare.GhostDispersal    = 0.42f;
    Flare.GhostSize         = 1.0f;
    Flare.GhostChromatic    = 0.65f;
    Flare.StarburstBlades   = 6;
    Flare.StarburstIntensity= 1.0f;
    Flare.StarburstLength   = 7.0f;
    Flare.StarburstSharpness= 24.0f;
    Flare.HaloIntensity     = 1.0f;
    Flare.HaloRadius        = 0.55f;
    Flare.HaloThickness     = 0.045f;
    Flare.HaloFalloff       = 2.00f;

    switch (Style)
    {
        case LensFlareStyleCategory::Off:
            Flare.ElementMask = 0u;
            break;

        case LensFlareStyleCategory::Cinematic:
            // Modern coated anamorphic: a long, cool streak, restrained ghost chain, and a quiet source halo.
            Flare.ElementMask     = LensFlareElementStreak | LensFlareElementGhosts | LensFlareElementHalo;
            Flare.StreakLength    = 18.0f;
            Flare.StreakThickness = 0.45f;
            Flare.StreakTintR     = 0.35f;
            Flare.StreakTintG     = 0.55f;
            Flare.StreakTintB     = 1.00f;
            Flare.GhostCount      = 4;
            Flare.GhostIntensity  = 0.20f;
            Flare.GhostChromatic  = 0.30f;
            Flare.HaloIntensity   = 0.12f;
            Flare.HaloRadius      = 0.55f;
            Flare.HaloThickness   = 0.045f;
            Flare.HaloFalloff     = 2.20f;
            break;

        case LensFlareStyleCategory::Vintage:
            // Uncoated-glass presentation: many ghosts, warmer tint and a softer contribution to the same
            //    reference diffraction profile.
            Flare.ElementMask        = LensFlareElementStreak | LensFlareElementGhosts
                                      | LensFlareElementStarburst | LensFlareElementHalo;
            Flare.StreakIntensity    = 0.20f;
            Flare.StreakLength       = 8.0f;
            Flare.StreakThickness    = 0.90f;
            Flare.StreakTintR        = 1.00f;
            Flare.StreakTintG        = 0.82f;
            Flare.StreakTintB        = 0.55f;
            Flare.GhostCount         = 8;
            Flare.GhostIntensity     = 0.34f;
            Flare.GhostDispersal     = 0.30f;
            Flare.GhostSize          = 1.35f;
            Flare.GhostChromatic     = 0.55f;
            Flare.StarburstBlades    = 6;      // legacy setting; reference lobes remain fixed
            Flare.StarburstSharpness = 10.0f;  // legacy setting; reference lobes remain fixed
            Flare.StarburstLength    = 5.0f;
            Flare.StarburstIntensity = 3.5f;
            Flare.HaloIntensity      = 1.0f;
            Flare.HaloRadius         = 0.55f;
            Flare.HaloThickness      = 0.045f;
            Flare.HaloFalloff        = 1.70f;
            break;

        case LensFlareStyleCategory::Clean:
            // A clean presentation: the reference starburst alone, with no ghost/halo/streak mask bits.
            Flare.ElementMask        = LensFlareElementStarburst;
            Flare.StarburstBlades    = 7;      // legacy setting; reference lobes remain fixed
            Flare.StarburstSharpness = 40.0f;
            Flare.StarburstLength    = 11.0f;
            Flare.StarburstIntensity = 1.0f;
            break;

        case LensFlareStyleCategory::Full:
            // The reference camera: every optical response is present, but each is kept below the sun disc so
            // the composition reads as one lens rather than four equally loud mathematical primitives.
            Flare.ElementMask        = LensFlareElementStreak | LensFlareElementGhosts
                                      | LensFlareElementStarburst | LensFlareElementHalo;
            Flare.Intensity           = 1.0f;
            Flare.StreakIntensity     = 0.80f;
            Flare.StreakLength        = 15.0f;
            Flare.StreakThickness     = 0.72f;
            Flare.StreakTintR         = 0.68f;
            Flare.StreakTintG         = 0.82f;
            Flare.StreakTintB         = 1.00f;
            Flare.GhostCount          = 5;
            Flare.GhostIntensity      = 1.0f;
            Flare.GhostDispersal      = 0.42f;
            Flare.GhostSize           = 1.0f;
            Flare.GhostChromatic      = 0.65f;
            Flare.StarburstBlades     = 6;
            Flare.StarburstIntensity  = 1.0f;
            Flare.StarburstLength     = 6.5f;
            Flare.StarburstSharpness  = 15.0f;
            Flare.HaloIntensity       = 1.0f;
            Flare.HaloRadius          = 0.55f;
            Flare.HaloThickness       = 0.045f;
            Flare.HaloFalloff         = 1.80f;
            break;

        case LensFlareStyleCategory::Custom:
            break;   // unreachable: handled above
    }
}

//------------------------------------------------------------------------------------------------------------------------
//                                                       THE WIND
//------------------------------------------------------------------------------------------------------------------------

// ⚠️ The wind drives the cloud field on WALL time, never on time-of-day. Scrubbing the clock from 06:00 to 18:00
//    must not translate the clouds by twelve hours of drift — that was a real, reported bug in an earlier attempt
//    at this feature ("scrubbing the time slider teleports clouds kilometres per minute").
struct CelestialWind
{
    float SpeedMetresPerSecond = 4.2f;    // [m/s]
    float DirectionDegrees     = 214.0f;  // [deg] the direction the wind comes FROM (meteorological convention)
    float Shear                = 0.6f;    // [-]   speed gain with altitude
    float VeerDegrees          = 18.0f;   // [deg] direction rotation with altitude
    float Gust                 = 0.25f;   // [-]
    float Turbulence           = 0.2f;    // [-]
};

//------------------------------------------------------------------------------------------------------------------------
//                                                      EXPOSURE
//------------------------------------------------------------------------------------------------------------------------

// 🔴 THE RULE THAT KILLS THE OLDEST COMPLAINT. Celestial exposure is a function of the SUN'S ELEVATION and nothing
//    else. Not of what is on screen, not of where the camera points. Turning to face the bright horizon, or away to
//    the dark zenith, must not change the gain by one bit — otherwise the user sees "the exposure keeps changing
//    when the camera angle changes, even when the sun hasn't moved", which is exactly the report this design answers.
//    Frame metering still exists (ExposureIntegrator, --adaptive) for A/B, but it is NOT the celestial default.
struct CelestialExposure
{
    bool  SunElevationDriven = true;    // [-]   the default: gain from the sun's altitude alone
    float ExposureBias       = 0.4f;    // [EV]  artistic offset applied on top (the reference panel's pp_ev)
    float NightBias          = 0.0f;    // [EV]  extra lift below the horizon, for legibility
};

//------------------------------------------------------------------------------------------------------------------------
//                                                    THE WHOLE THING
//------------------------------------------------------------------------------------------------------------------------

struct CelestialStructure
{
    bool Enabled = true;   // [-] master switch: off = the pre-celestial black-miss renderer, byte for byte

    CelestialObservation    Observation{};
    CelestialSun            Sun{};
    CelestialAtmosphere     Atmosphere{};
    CelestialClouds         Clouds{};
    CelestialLocalCloud     LocalCloud{};
    CelestialAtmosphericFog AtmosphericFog{};
    CelestialLocalFog       LocalFog{};
    CelestialMoon           Moon{};
    CelestialLensFlare      LensFlare{};
    CelestialStars          Stars{};
    CelestialWind           Wind{};
    CelestialExposure       Exposure{};
};

//------------------------------------------------------------------------------------------------------------------------
//                                              THE PROPERTY TABLE (the "sliders")
//------------------------------------------------------------------------------------------------------------------------

// ⚠️ Integer was added for the lens flare (ghost count, aperture blades, style id). Storing those as floats
//    and rounding at the edit site would let 6.5 blades exist in the file and silently become 6 or 7 depending on
//    who rounded; an explicit kind means the codec refuses the bad value and says so by line number.
enum class CelestialPropertyKind : uint8_t { Real = 0u, Switch = 1u, Integer = 2u };

// One editable property: what it is called, what it means, and what a legal value looks like. `Offset` is the
//    field's byte offset inside CelestialStructure, so an editor reaches the field without a switch statement and
//    a renamed field breaks the build rather than silently editing the wrong thing.
struct CelestialProperty
{
    const char*           Path;      // "sun.intensity" — the TOML key and the panel label, one string
    const char*           Unit;      // "deg", "m", "x", "" …
    CelestialPropertyKind Kind;
    size_t                Offset;    // [B] offsetof into CelestialStructure
    float                 Minimum;   // slider bounds; advisory for TOML (out-of-range is clamped and warned)
    float                 Maximum;
    const char*           Summary;
};

#define FRONTIER_CELESTIAL_REAL(PathText, UnitText, Field, Lo, Hi, SummaryText) \
    CelestialProperty{ PathText, UnitText, CelestialPropertyKind::Real, offsetof(CelestialStructure, Field), Lo, Hi, SummaryText }
#define FRONTIER_CELESTIAL_SWITCH(PathText, Field, SummaryText) \
    CelestialProperty{ PathText, "", CelestialPropertyKind::Switch, offsetof(CelestialStructure, Field), 0.0f, 1.0f, SummaryText }
#define FRONTIER_CELESTIAL_INTEGER(PathText, UnitText, Field, Lo, Hi, SummaryText) \
    CelestialProperty{ PathText, UnitText, CelestialPropertyKind::Integer, offsetof(CelestialStructure, Field), Lo, Hi, SummaryText }

// The table. Order is the order a panel would present them; grouping follows the structs above.
inline constexpr CelestialProperty kCelestialProperties[] =
{
    FRONTIER_CELESTIAL_SWITCH("celestial.enabled", Enabled, "master switch for the whole celestial system"),

    FRONTIER_CELESTIAL_REAL("time.hours",     "h",   Observation.LocalHours, 0.0f, 24.0f, "local clock time"),
    FRONTIER_CELESTIAL_REAL("time.utcOffset", "h",   Observation.UtcOffset, -12.0f, 14.0f, "timezone offset from UTC"),
    FRONTIER_CELESTIAL_REAL("site.latitude",  "deg", Observation.Latitude,  -90.0f, 90.0f, "observer latitude, +N"),
    FRONTIER_CELESTIAL_REAL("site.longitude", "deg", Observation.Longitude,-180.0f, 180.0f, "observer longitude, +E"),

    FRONTIER_CELESTIAL_REAL("sun.angularDiameter", "deg", Sun.AngularDiameterDegrees, 0.05f, 5.0f,  "apparent size of the disc"),
    FRONTIER_CELESTIAL_REAL("sun.intensity",       "x",   Sun.Intensity,              0.0f, 200.0f, "radiance multiplier"),
    FRONTIER_CELESTIAL_REAL("sun.temperature",     "K",   Sun.TemperatureKelvin,   1000.0f, 12000.0f, "black-body tint"),
    FRONTIER_CELESTIAL_REAL("sun.limbDarkening",   "-",   Sun.LimbDarkening,          0.0f, 1.0f,   "edge falloff across the disc"),

    FRONTIER_CELESTIAL_REAL("atmosphere.rayleigh",    "x", Atmosphere.RayleighStrength, 0.0f, 4.0f,  "blue-sky scattering"),
    FRONTIER_CELESTIAL_REAL("atmosphere.mie",         "x", Atmosphere.MieStrength,      0.0f, 8.0f,  "haze"),
    FRONTIER_CELESTIAL_REAL("atmosphere.ozone",       "x", Atmosphere.OzoneStrength,    0.0f, 4.0f,  "keeps twilight blue"),
    FRONTIER_CELESTIAL_REAL("atmosphere.mieG",        "-", Atmosphere.MieAnisotropy,   -0.9f, 0.95f, "forward glow around the sun"),
    FRONTIER_CELESTIAL_REAL("atmosphere.planetRadius","m", Atmosphere.PlanetRadius, 1.0e5f, 2.0e7f,  "planet radius"),
    FRONTIER_CELESTIAL_REAL("atmosphere.height",      "m", Atmosphere.AtmosphereHeight, 1.0e4f, 2.0e5f, "top of the shell"),

    FRONTIER_CELESTIAL_REAL("clouds.coverage",   "-", Clouds.Coverage,    0.0f, 1.0f,    "clear to overcast"),
    FRONTIER_CELESTIAL_REAL("clouds.density",    "x", Clouds.Density,     0.0f, 4.0f,    "optical thickness"),
    FRONTIER_CELESTIAL_REAL("clouds.baseHeight", "m", Clouds.BaseHeight,  0.0f, 12000.0f,"cloud base above ground"),
    FRONTIER_CELESTIAL_REAL("clouds.thickness",  "m", Clouds.Thickness,  10.0f, 8000.0f, "vertical extent"),
    FRONTIER_CELESTIAL_REAL("clouds.shapeScale", "m", Clouds.ShapeScale, 50.0f, 10000.0f,"size of the puffs"),
    FRONTIER_CELESTIAL_REAL("clouds.detail",     "-", Clouds.DetailScale, 0.0f, 1.0f,    "edge erosion"),
    FRONTIER_CELESTIAL_REAL("clouds.anvil",      "-", Clouds.Anvil,       0.0f, 1.0f,    "upper-level spread"),
    FRONTIER_CELESTIAL_REAL("clouds.powder",     "-", Clouds.PowderScale, 0.0f, 1.0f,    "dark-edge term"),
    // ⚠️ THE CLOUD LIGHTING AND THE LOCAL VOLUMES HAD NO PROPERTIES AT ALL. Every one of these fields was
    //    packed into the GPU record and read by the shader, but none was reachable from TOML or the future
    //    panel — so "dynamic settings" was only half true for the media. Registered here, which also means the
    //    range checks in CheckCelestialSolver now police their defaults.
    FRONTIER_CELESTIAL_REAL("clouds.forwardLobe",  "-",   Clouds.ForwardLobe,  0.0f, 0.99f, "HG g1: forward scattering"),
    FRONTIER_CELESTIAL_REAL("clouds.backwardLobe", "-",   Clouds.BackwardLobe, -0.99f, 0.0f,
                            "HG g2: MUST be negative to scatter backwards"),
    FRONTIER_CELESTIAL_REAL("clouds.lobeMix",      "-",   Clouds.LobeMix,      0.0f, 1.0f,  "blend between the two lobes"),
    FRONTIER_CELESTIAL_REAL("clouds.absorption",   "1/m", Clouds.Absorption,   0.0f, 1.0f,  "extinction per unit density"),
    FRONTIER_CELESTIAL_REAL("clouds.ambient",      "x",   Clouds.AmbientScale, 0.0f, 4.0f,  "sky light into the cloud"),

    // ⚠️ The local volumes are registered further down as localCloud.* / localFog.* and were ALREADY there.
    //    An earlier version of this block added local.cloud.* duplicates pointing at the same fields, which the
    //    "no two properties share a field" gate caught — two sliders editing one value is a trap, because
    //    changing one silently contradicts the other in the same file.

    FRONTIER_CELESTIAL_SWITCH("localCloud.enabled",  LocalCloud.Enabled, "box-bounded local cloud volume"),
    FRONTIER_CELESTIAL_REAL("localCloud.centreX", "m", LocalCloud.Centre[0], -10000.0f, 10000.0f, "local cloud centre X"),
    FRONTIER_CELESTIAL_REAL("localCloud.centreY", "m", LocalCloud.Centre[1], -10000.0f, 10000.0f, "local cloud centre Y"),
    FRONTIER_CELESTIAL_REAL("localCloud.centreZ", "m", LocalCloud.Centre[2], -1000.0f, 12000.0f, "local cloud centre height"),
    FRONTIER_CELESTIAL_REAL("localCloud.extentX", "m", LocalCloud.Extent[0], 1.0f, 10000.0f, "local cloud half-width X"),
    FRONTIER_CELESTIAL_REAL("localCloud.extentY", "m", LocalCloud.Extent[1], 1.0f, 10000.0f, "local cloud half-width Y"),
    FRONTIER_CELESTIAL_REAL("localCloud.extentZ", "m", LocalCloud.Extent[2], 1.0f, 10000.0f, "local cloud half-height"),
    FRONTIER_CELESTIAL_REAL("localCloud.density", "x", LocalCloud.Density,  0.0f, 8.0f, "local volume density"),
    FRONTIER_CELESTIAL_REAL("localCloud.coverage","-", LocalCloud.Coverage, 0.0f, 1.0f, "local volume coverage"),

    FRONTIER_CELESTIAL_SWITCH("fog.enabled", AtmosphericFog.Enabled, "whole-world aerial perspective"),
    FRONTIER_CELESTIAL_REAL("fog.density",     "1/m", AtmosphericFog.Density,     0.0f, 0.01f,  "extinction per metre"),
    FRONTIER_CELESTIAL_REAL("fog.heightScale", "m",   AtmosphericFog.HeightScale, 1.0f, 20000.0f,"fog column e-folding height"),
    FRONTIER_CELESTIAL_REAL("fog.sunScatter",  "-",   AtmosphericFog.SunScatter,  0.0f, 1.0f,   "forward scatter of sunlight"),

    FRONTIER_CELESTIAL_SWITCH("localFog.enabled", LocalFog.Enabled, "box-bounded ground fog"),
    FRONTIER_CELESTIAL_REAL("localFog.density",    "1/m", LocalFog.Density,    0.0f, 1.0f,  "local fog extinction"),
    FRONTIER_CELESTIAL_REAL("localFog.anisotropy", "-",   LocalFog.Anisotropy,-0.9f, 0.9f,  "fog phase function g"),

    FRONTIER_CELESTIAL_SWITCH("moon.enabled", Moon.Enabled, "draw and light from the moon"),
    FRONTIER_CELESTIAL_REAL("moon.angularDiameter","deg", Moon.AngularDiameterDegrees, 0.05f, 5.0f, "apparent size"),
    FRONTIER_CELESTIAL_REAL("moon.brightness",     "x",   Moon.Brightness,   0.0f, 20.0f, "radiance multiplier"),
    FRONTIER_CELESTIAL_REAL("moon.albedo",         "-",   Moon.Albedo,       0.0f, 1.0f,  "surface reflectance"),
    FRONTIER_CELESTIAL_REAL("moon.earthshine",     "x",   Moon.Earthshine,   0.0f, 1.0f,  "ashen glow on the dark limb"),

    FRONTIER_CELESTIAL_SWITCH("stars.enabled", Stars.Enabled, "draw the star field"),
    // ── Lens flare ───────────────────────────────────────────────────────────────────────────────────────────
    FRONTIER_CELESTIAL_SWITCH("flare.enabled", LensFlare.Enabled, "lens flare master switch"),
    FRONTIER_CELESTIAL_INTEGER("flare.style", "", LensFlare.Style, 0.0f, 5.0f,
                               "0 off, 1 cinematic, 2 vintage, 3 clean, 4 full, 5 custom"),
    FRONTIER_CELESTIAL_INTEGER("flare.elements", "", LensFlare.ElementMask, 0.0f, 15.0f,
                               "bits 1 streak, 2 ghosts, 4 starburst, 8 halo (combinable)"),
    FRONTIER_CELESTIAL_REAL("flare.intensity", "x", LensFlare.Intensity, 0.0f, 30.0f, "master flare multiplier"),

    FRONTIER_CELESTIAL_REAL("flare.streak.intensity", "x",   LensFlare.StreakIntensity, 0.0f, 4.0f, "anamorphic streak strength"),
    FRONTIER_CELESTIAL_REAL("flare.streak.length",    "deg", LensFlare.StreakLength,    0.0f, 60.0f, "streak half-length"),
    FRONTIER_CELESTIAL_REAL("flare.streak.thickness", "deg", LensFlare.StreakThickness, 0.05f, 6.0f, "streak vertical falloff"),
    FRONTIER_CELESTIAL_REAL("flare.streak.tintR",     "-",   LensFlare.StreakTintR,     0.0f, 1.0f, "streak tint red"),
    FRONTIER_CELESTIAL_REAL("flare.streak.tintG",     "-",   LensFlare.StreakTintG,     0.0f, 1.0f, "streak tint green"),
    FRONTIER_CELESTIAL_REAL("flare.streak.tintB",     "-",   LensFlare.StreakTintB,     0.0f, 1.0f, "streak tint blue"),

    FRONTIER_CELESTIAL_INTEGER("flare.ghost.count",   "",    LensFlare.GhostCount,      0.0f, 12.0f, "how many internal reflections"),
    FRONTIER_CELESTIAL_REAL("flare.ghost.intensity",  "x",   LensFlare.GhostIntensity,  0.0f, 4.0f, "ghost strength"),
    FRONTIER_CELESTIAL_REAL("flare.ghost.dispersal",  "-",   LensFlare.GhostDispersal,  0.0f, 2.0f, "ghost spacing along the centre vector"),
    FRONTIER_CELESTIAL_REAL("flare.ghost.size",       "x",   LensFlare.GhostSize,       0.1f, 4.0f, "reference ghost-size scale"),
    FRONTIER_CELESTIAL_REAL("flare.ghost.chromatic",  "-",   LensFlare.GhostChromatic,  0.0f, 2.0f, "per-ghost colour separation"),

    FRONTIER_CELESTIAL_INTEGER("flare.starburst.blades", "", LensFlare.StarburstBlades, 3.0f, 16.0f, "legacy iris setting; reference diffraction lobes are fixed"),
    FRONTIER_CELESTIAL_REAL("flare.starburst.intensity", "x",   LensFlare.StarburstIntensity, 0.0f, 30.0f, "starburst strength"),
    FRONTIER_CELESTIAL_REAL("flare.starburst.length",    "deg", LensFlare.StarburstLength,    0.0f, 40.0f, "spike length"),
    FRONTIER_CELESTIAL_REAL("flare.starburst.sharpness", "-",   LensFlare.StarburstSharpness, 1.0f, 96.0f, "higher = thinner spikes"),

    FRONTIER_CELESTIAL_REAL("flare.halo.intensity", "x",   LensFlare.HaloIntensity, 0.0f, 4.0f, "soft annulus strength"),
    FRONTIER_CELESTIAL_REAL("flare.halo.radius",    "x",   LensFlare.HaloRadius,    0.1f, 1.2f, "reference screen-space annulus radius"),
    FRONTIER_CELESTIAL_REAL("flare.halo.thickness", "x",   LensFlare.HaloThickness, 0.005f, 0.25f, "reference screen-space annulus width"),
    FRONTIER_CELESTIAL_REAL("flare.halo.falloff",   "-",   LensFlare.HaloFalloff,   0.5f, 8.0f, "annulus profile"),

    FRONTIER_CELESTIAL_REAL("flare.occlusionFade", "-", LensFlare.OcclusionFade, 0.0f, 1.0f, "how much occlusion kills the flare"),

    FRONTIER_CELESTIAL_REAL("stars.brightness","x", Stars.Brightness, 0.0f, 20.0f, "radiance multiplier"),
    FRONTIER_CELESTIAL_REAL("stars.density",   "x", Stars.Density,    0.0f, 4.0f,  "how many are drawn"),
    FRONTIER_CELESTIAL_REAL("stars.size",      "x", Stars.SizeScale,  0.0f, 8.0f,  "point size"),
    FRONTIER_CELESTIAL_REAL("stars.milkyWay",  "x", Stars.MilkyWay,   0.0f, 4.0f,  "galactic band strength"),

    FRONTIER_CELESTIAL_REAL("wind.speed",      "m/s", Wind.SpeedMetresPerSecond, 0.0f, 60.0f,  "surface wind speed"),
    FRONTIER_CELESTIAL_REAL("wind.direction",  "deg", Wind.DirectionDegrees,     0.0f, 360.0f, "direction the wind comes FROM"),
    FRONTIER_CELESTIAL_REAL("wind.shear",      "-",   Wind.Shear,                0.0f, 4.0f,   "speed gain with altitude"),
    FRONTIER_CELESTIAL_REAL("wind.veer",       "deg", Wind.VeerDegrees,        -90.0f, 90.0f,  "direction rotation with altitude"),
    FRONTIER_CELESTIAL_REAL("wind.gust",       "-",   Wind.Gust,                 0.0f, 2.0f,   "gust amplitude"),
    FRONTIER_CELESTIAL_REAL("wind.turbulence", "-",   Wind.Turbulence,           0.0f, 2.0f,   "small-scale swirl"),

    FRONTIER_CELESTIAL_SWITCH("exposure.sunElevationDriven", Exposure.SunElevationDriven,
                              "gain from the sun's altitude alone, never from the framing"),
    FRONTIER_CELESTIAL_REAL("exposure.bias",      "EV", Exposure.ExposureBias, -8.0f, 8.0f, "artistic offset"),
    FRONTIER_CELESTIAL_REAL("exposure.nightBias", "EV", Exposure.NightBias,    -8.0f, 8.0f, "extra lift after dark"),
};

inline constexpr size_t kCelestialPropertyCount = sizeof(kCelestialProperties) / sizeof(kCelestialProperties[0]);

// Typed access. These are the ONLY way an editor or loader should touch a property, so bounds and kind are always
//    honoured; reaching into the struct by offset from elsewhere defeats the point of the table.
[[nodiscard]] inline float ReadCelestialReal(const CelestialStructure& S, const CelestialProperty& P) noexcept
{
    return *reinterpret_cast<const float*>(reinterpret_cast<const unsigned char*>(&S) + P.Offset);
}

[[nodiscard]] inline bool ReadCelestialSwitch(const CelestialStructure& S, const CelestialProperty& P) noexcept
{
    return *reinterpret_cast<const bool*>(reinterpret_cast<const unsigned char*>(&S) + P.Offset);
}

// Clamped on write, deliberately: a TOML file is hand-edited and a typo should produce a usable scene plus a
//    warning, not a NaN that propagates into the LUTs and blanks the sky.
inline void WriteCelestialReal(CelestialStructure& S, const CelestialProperty& P, float Value) noexcept
{
    const float Clamped = Value < P.Minimum ? P.Minimum : (Value > P.Maximum ? P.Maximum : Value);
    *reinterpret_cast<float*>(reinterpret_cast<unsigned char*>(&S) + P.Offset) = Clamped;
}

// 🔴 INTEGER FIELDS NEED THEIR OWN ACCESSORS, AND THIS IS NOT A STYLE PREFERENCE. Every integer property in the
//    table (the flare style, the element mask, ghost count, aperture blades) is a 4-byte int or uint32_t, not a
//    float. Writing through the float accessor would deposit an IEEE bit pattern into an integer field —
//    `6.0f` becomes 1086324736 — so a blade count of 6 would read back as garbage. The property Kind exists
//    precisely so the codec picks the right one, and the gate asserts every Integer property names a 4-byte field.
inline int32_t ReadCelestialInteger(const CelestialStructure& S, const CelestialProperty& P) noexcept
{
    int32_t Value = 0;
    const unsigned char* Address = reinterpret_cast<const unsigned char*>(&S) + P.Offset;
    __builtin_memcpy(&Value, Address, sizeof(Value));
    return Value;
}

inline void WriteCelestialInteger(CelestialStructure& S, const CelestialProperty& P, int32_t Value) noexcept
{
    const int32_t Low  = static_cast<int32_t>(P.Minimum);
    const int32_t High = static_cast<int32_t>(P.Maximum);
    const int32_t Clamped = Value < Low ? Low : (Value > High ? High : Value);
    unsigned char* Address = reinterpret_cast<unsigned char*>(&S) + P.Offset;
    __builtin_memcpy(Address, &Clamped, sizeof(Clamped));
}

inline void WriteCelestialSwitch(CelestialStructure& S, const CelestialProperty& P, bool Value) noexcept
{
    *reinterpret_cast<bool*>(reinterpret_cast<unsigned char*>(&S) + P.Offset) = Value;
}

} // namespace Frontier
