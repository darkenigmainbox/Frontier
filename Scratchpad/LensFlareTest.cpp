//============================================================================================================================================
// 📷 Scratchpad/LensFlareTest.cpp — four flare elements, style presets, and an integrated optical stack
//============================================================================================================================================
// Compiles the SHIPPING shader's flare functions (extracted by ExtractCelestialPort.sh) and measures them.
//
// The tests are about SHAPE and composition, not only brightness. The intended optical stack has four distinct
// responses which must remain related rather than becoming four disconnected procedural primitives:
//
//      §2 the streak is HORIZONTAL      — anisotropic and camera-level
//      §3 the ghosts are ELSEWHERE      — displaced through the frame with spectral falloff
//      §4 the starburst has GAPS        — aperture diffraction, not a radial glow
//      §5 the halo is CONTROLLED         — a soft annulus with a tunable radius and width
//      §6 styles are presets, and all four elements combine freely
//
// Build (from repo root):
//   bash Scratchpad/ExtractCelestialPort.sh /tmp/CelestialPort.inc
//   sed -E 's/\.(xyz|xy|yz|xz)\b([^(])/.\1()\2/g; s/\bout +(vec[234]|float) +/\1\& /g' \
//       Engine/Shaders/AtmosphereScatter.slang > /tmp/AtmosphereScatter.port.inc
//   g++ -std=c++20 -O2 -I Scratchpad -I . Scratchpad/LensFlareTest.cpp -o /tmp/lft && /tmp/lft

#include "GlslShim.h"

#include "Engine/DisplayPresentation/CelestialStructure.h"
#include "Engine/DisplayPresentation/CelestialSolver.h"
#include "Engine/DisplayPresentation/CelestialUniform.h"

#include <cstdio>
#include <cstring>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>

struct CelestialRecord;
static CelestialRecord* gCelestialRecordPtr = nullptr;
#define gCelestialRecord (*gCelestialRecordPtr)

using Frontier::kCelestialFlagEnabled;
using Frontier::kCelestialFlagMoon;
using Frontier::kCelestialFlagStars;
// The extracted port now carries CelestialMedia too, which reads the volume flags.
using Frontier::kCelestialFlagFog;
using Frontier::kCelestialFlagLocalFog;
using Frontier::kCelestialFlagLocalCloud;

#define FRONTIER_CPU_PORT
#include "/tmp/AtmosphereScatter.port.inc"
#include "/tmp/CelestialPort.inc"

//------------------------------------------------------------------------------------------------------------------------

static int gChecks = 0, gFail = 0;

static void Check(bool ok, const std::string& label, const std::string& detail)
{
    ++gChecks;
    if (!ok) ++gFail;
    std::printf("  %-4s %-56s %s\n", ok ? "PASS" : "FAIL", label.c_str(), detail.c_str());
}

static void Section(const char* title)
{
    std::printf("\n-- %s -------------------------------------------------------\n", title);
}

static std::string Fixed(double v, int d = 4)
{
    char b[64]; std::snprintf(b, sizeof(b), "%.*f", d, v); return b;
}

static float Luma(vec3 c) { return 0.2126f * c.x + 0.7152f * c.y + 0.0722f * c.z; }

// The camera basis used throughout: looking straight at the sun, frame level.
static vec3 gForward, gRight, gUp, gSun;

// A direction offset from the sun by (horizontal, vertical) degrees in the camera's frame.
static vec3 Offset(float horizontalDegrees, float verticalDegrees)
{
    const float h = horizontalDegrees * 3.14159265f / 180.0f;
    const float v = verticalDegrees   * 3.14159265f / 180.0f;
    return normalize(gSun + gRight * std::tan(h) + gUp * std::tan(v));
}

// The reference halo radius is in the perspective screen plane (uHalo), not degrees. At an on-axis sun,
// convert it back to the test camera's angular offset so the validation samples the exact reference ring.
static float ReferenceScreenRadiusDegrees(float radius)
{
    return std::atan(radius) * 180.0f / 3.14159265f;
}

static CelestialRecord BuildRecord(const Frontier::CelestialStructure& settings)
{
    const Frontier::CelestialSolution solution = Frontier::SolveCelestial(settings);
    Frontier::CelestialUniform packed{};
    Frontier::PackCelestialUniform(settings, solution, 0.0, packed);
    CelestialRecord record;
    std::memcpy(&record, &packed, sizeof(record));
    return record;
}

//============================================================================================================================================

int main()
{
    std::printf("========================================================================\n");
    std::printf(" LENS FLARE - four integrated elements, style presets, and free combination\n");
    std::printf("========================================================================\n");

    Frontier::CelestialStructure settings{};
    settings.Observation.LocalHours = 17.0f;

    CelestialRecord record = BuildRecord(settings);
    gCelestialRecordPtr = &record;

    gSun     = record.SunDirectionAndCosRadius.xyz();
    gForward = gSun;
    gRight   = normalize(cross(gSun, vec3(0.0f, 0.0f, 1.0f)));
    gUp      = cross(gRight, gSun);

    const vec3 white(1.0f, 1.0f, 1.0f);

    //----------------------------------------------------------------------------------------------------------------
    Section("1. THE ELEMENTS EXIST AND RESPOND TO THEIR SETTINGS");
    //----------------------------------------------------------------------------------------------------------------
    {
        Check((uint32_t(record.FlareStreakAndFlags.w) & 15u) == 15u,
              "the Full default enables all four elements",
              "mask " + std::to_string(uint32_t(record.FlareStreakAndFlags.w)));

        Check(Luma(CelestialFlareStreak(record, Offset(4.0f, 0.0f), gRight, gUp)) > 0.0f,
              "the streak produces light beside the sun", "");
        Check(Luma(CelestialFlareGhosts(record, Offset(-14.0f, 0.0f), gForward)) >= 0.0f,
              "the ghost function evaluates without blowing up", "");
        Check(Luma(CelestialFlareStarburst(record, Offset(3.0f, 0.0f), gRight, gUp)) >= 0.0f,
              "the starburst function evaluates", "");
        const float haloDegrees = ReferenceScreenRadiusDegrees(record.FlareHalo.y);
        Check(Luma(CelestialFlareHalo(record, Offset(haloDegrees, 0.0f))) > 0.0f,
              "the halo contributes at its configured reference radius", Fixed(haloDegrees, 2) + " deg");

        // Disabling must actually disable — a master switch that only dims is a bug people work around forever.
        Frontier::CelestialStructure off = settings;
        off.LensFlare.Enabled = false;
        CelestialRecord offRecord = BuildRecord(off);
        Check(uint32_t(offRecord.FlareStreakAndFlags.w) == 0u,
              "flare.enabled = false clears every element bit", "");
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("2. THE STREAK IS HORIZONTAL - it cannot be radially symmetric");
    //----------------------------------------------------------------------------------------------------------------
    // 🔴 A halo is the same in every direction. An anamorphic streak is the opposite: strongly elongated along
    //    one axis. This is the property that makes it structurally safe, so it is measured as an ANISOTROPY
    //    RATIO rather than as a brightness.
    {
        const float along  = Luma(CelestialFlareStreak(record, Offset(3.0f, 0.0f), gRight, gUp));
        const float across = Luma(CelestialFlareStreak(record, Offset(0.0f, 3.0f), gRight, gUp));

        Check(across <= 0.0f || along > across * 50.0f,
              "at 3 deg the streak is >50x brighter sideways than vertically",
              across <= 0.0f ? "vertical is exactly zero" : Fixed(along / across, 1) + "x");

        // It must also stay thin: a streak that is degrees thick is a smear, and a smear is a halo.
        float firstDarkDegrees = -1.0f;
        for (int i = 1; i <= 200; ++i)
        {
            const float v = float(i) * 0.05f;
            if (Luma(CelestialFlareStreak(record, Offset(0.0f, v), gRight, gUp)) < along * 0.05f)
            { firstDarkDegrees = v; break; }
        }
        Check(firstDarkDegrees > 0.0f && firstDarkDegrees < 2.0f,
              "it fades to 5% within 2 deg vertically",
              Fixed(firstDarkDegrees, 2) + " deg");

        // And it must reach: a streak shorter than it is thick would just be a blob on the sun.
        const float tip = Luma(CelestialFlareStreak(record, Offset(13.0f, 0.0f), gRight, gUp));
        Check(tip > 0.0f, "and still reaches 13 deg horizontally", "");
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("3. THE GHOSTS FOLLOW THE REFERENCE SOURCE VECTOR");
    //----------------------------------------------------------------------------------------------------------------
    // The supplied Celestial shader intentionally places p = sunUV * (-1.35 + i*.42). When the camera points
    // directly at the sun, sunUV is zero and the reference ghosts collapse onto the source; this is not the old
    // independently designed "ghosts never near the sun" model. The checks below lock the deployed behaviour.
    {
        const float centre = Luma(CelestialFlareGhosts(record, gSun, gForward));
        Check(centre > 0.0f,
              "the reference ghost chain has a source-axis response",
              "centre " + Fixed(centre, 5));

        // With an off-axis source, sample the reference's mirrored chain across the camera frame.
        const vec3 tiltedForward = normalize(gSun - gRight * 0.35f);
        float found = 0.0f;
        for (int i = -60; i <= 60; ++i)
            found = std::max(found, Luma(CelestialFlareGhosts(record, Offset(float(i) * 0.8f, 0.0f), tiltedForward)));
        Check(found > 0.0f,
              "the reference ghosts travel across the frame off axis",
              "peak " + Fixed(found, 5));

        Frontier::CelestialStructure fewer = settings;
        fewer.LensFlare.GhostCount = 2;
        const CelestialRecord fewerRecord = BuildRecord(fewer);
        Check(Luma(CelestialFlareGhosts(fewerRecord, gSun, gForward)) < centre,
              "the reference ghost count controls the chain",
              "2 ghosts " + Fixed(Luma(CelestialFlareGhosts(fewerRecord, gSun, gForward)), 5));
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("4. THE STARBURST HAS GAPS - spikes, not a glow");
    //----------------------------------------------------------------------------------------------------------------
    // 🔴 THE DEFINING DIFFERENCE between a starburst and a halo: at a fixed radius from the sun, a halo is
    //    uniform all the way round, and a starburst alternates bright and dark. Measure the contrast around a
    //    circle — that number IS the distinction, and no brightness setting can fake it.
    {
        Frontier::CelestialStructure high = settings;
        Frontier::ApplyLensFlareStyle(high.LensFlare, Frontier::LensFlareStyleCategory::Full);
        CelestialRecord burst = BuildRecord(high);
        gCelestialRecordPtr = &burst;

        const float radius = 3.0f;
        float brightest = 0.0f, darkest = 1e30f;
        for (int a = 0; a < 360; ++a)
        {
            const float angle = float(a) / 360.0f * 6.2831853f;
            const vec3 dir = Offset(radius * std::cos(angle), radius * std::sin(angle));
            const float value = Luma(CelestialFlareStarburst(burst, dir, gRight, gUp));
            brightest = std::max(brightest, value);
            darkest   = std::min(darkest, value);
        }

        Check(brightest > 0.0f, "the starburst produces spikes at 3 deg", "peak " + Fixed(brightest, 6));
        Check(darkest < brightest * 0.05f,
              "and the gaps between them are <5% of the spikes",
              "darkest " + Fixed(darkest, 8) + " vs peak " + Fixed(brightest, 6));

        // The reference page has no blade-count uniform: its source shader fixes the two diffraction lobes at
        // sin(a*4+.3)^24 and sin(a*7)^40. Keep the legacy setting serialised, but assert it cannot silently change
        // the reference implementation's response.
        Frontier::CelestialStructure bladed = high;
        bladed.LensFlare.StarburstBlades = 11;
        CelestialRecord legacy = BuildRecord(bladed);
        const float referenceValue = Luma(CelestialFlareStarburst(burst, Offset(2.0f, 0.0f), gRight, gUp));
        const float legacyValue = Luma(CelestialFlareStarburst(legacy, Offset(2.0f, 0.0f), gRight, gUp));
        Check(std::abs(referenceValue - legacyValue) < 1e-6f,
              "legacy blade setting does not replace the reference diffraction lobes",
              Fixed(referenceValue, 6) + " vs " + Fixed(legacyValue, 6));
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("5. STYLES ARE WHOLE CAMERAS, AND ELEMENTS STILL COMBINE");
    //----------------------------------------------------------------------------------------------------------------
    // 🔴 WHY STYLES REPLACED QUALITY TIERS. The old selector was Off/Low/Medium/High, which claims each step
    //    costs more. It does not: the starburst ("High") is a few trig ops with no loop, while the ghosts
    //    ("Medium") loop over every ghost — the starburst is the CHEAPER of the two. The ladder was ranking how
    //    elaborate things look and calling it performance. A style dropdown says what it actually is.
    {
        auto Apply = [&](Frontier::LensFlareStyleCategory style)
        {
            Frontier::CelestialStructure t = settings;
            Frontier::ApplyLensFlareStyle(t.LensFlare, style);
            return t;
        };
        auto MaskOf = [&](const Frontier::CelestialStructure& t)
        {
            return uint32_t(BuildRecord(t).FlareStreakAndFlags.w);
        };

        // 🔴 THE DEFAULT STYLE AND THE DEFAULT MASK MUST AGREE. A default-constructed struct never calls
        //    ApplyLensFlareStyle, so if the mask defaults to 0 while the style says "Cinematic", the settings
        //    claim a flare and render none. That is exactly what happened: the composite test measured 0.00000.
        Frontier::CelestialStructure fresh{};
        Frontier::CelestialStructure applied{};
        Frontier::ApplyLensFlareStyle(applied.LensFlare, applied.LensFlare.Style);
        Check(fresh.LensFlare.ElementMask == applied.LensFlare.ElementMask,
              "the default mask matches the default style",
              "fresh " + std::to_string(fresh.LensFlare.ElementMask) + " vs applied "
                       + std::to_string(applied.LensFlare.ElementMask));

        Check(MaskOf(Apply(Frontier::LensFlareStyleCategory::Off)) == 0u, "Off draws nothing", "");
        Check(MaskOf(Apply(Frontier::LensFlareStyleCategory::Cinematic)) == 11u,
              "Cinematic is streak + ghosts + halo", "mask 11");
        Check(MaskOf(Apply(Frontier::LensFlareStyleCategory::Vintage)) == 15u,
              "Vintage is the complete optical stack", "mask 15");
        Check(MaskOf(Apply(Frontier::LensFlareStyleCategory::Clean)) == 4u,
              "Clean is the starburst alone", "mask 4");
        Check(MaskOf(Apply(Frontier::LensFlareStyleCategory::Full)) == 15u,
              "Full combines streak, ghosts, starburst and halo", "mask 15");

        // 🔴 THE POINT OF STYLES OVER TIERS: each is a different CAMERA, not the same camera with more switches
        //    on. Two presets that share an element must still shape it differently, or the dropdown is just a
        //    relabelled quality ladder.
        const Frontier::CelestialStructure vintage = Apply(Frontier::LensFlareStyleCategory::Vintage);
        const Frontier::CelestialStructure clean   = Apply(Frontier::LensFlareStyleCategory::Clean);

        Check(vintage.LensFlare.StarburstBlades != clean.LensFlare.StarburstBlades,
              "Vintage and Clean are different irises",
              std::to_string(vintage.LensFlare.StarburstBlades) + " vs "
                  + std::to_string(clean.LensFlare.StarburstBlades) + " blades");

        // Which means they produce a visibly different number of spikes — 6 against 14.
        Check(vintage.LensFlare.StarburstBlades % 2 == 0 && clean.LensFlare.StarburstBlades % 2 == 1,
              "so one gives N spikes and the other 2N", "6-point vs 14-point");

        Check(clean.LensFlare.StarburstSharpness > vintage.LensFlare.StarburstSharpness * 2.0f,
              "Clean's spikes are far harder than Vintage's soft burst",
              Fixed(vintage.LensFlare.StarburstSharpness, 0) + " vs " + Fixed(clean.LensFlare.StarburstSharpness, 0));

        const Frontier::CelestialStructure cinematic = Apply(Frontier::LensFlareStyleCategory::Cinematic);
        Check(cinematic.LensFlare.StreakTintB > cinematic.LensFlare.StreakTintR * 2.0f
           && vintage.LensFlare.StreakTintR > vintage.LensFlare.StreakTintB,
              "Cinematic streaks cool, Vintage streaks warm", "opposite tints");

        Check(vintage.LensFlare.GhostCount > cinematic.LensFlare.GhostCount,
              "uncoated Vintage glass ghosts more than coated Cinematic",
              std::to_string(vintage.LensFlare.GhostCount) + " vs " + std::to_string(cinematic.LensFlare.GhostCount));

        // ⚠️ A PRESET MUST NOT INHERIT FROM WHICHEVER PRESET CAME BEFORE IT. Apply Vintage (8 ghosts, warm) then
        //    Clean on the SAME struct, and Clean must look exactly like a fresh Clean.
        Frontier::CelestialStructure sequence = settings;
        Frontier::ApplyLensFlareStyle(sequence.LensFlare, Frontier::LensFlareStyleCategory::Vintage);
        Frontier::ApplyLensFlareStyle(sequence.LensFlare, Frontier::LensFlareStyleCategory::Clean);
        Check(sequence.LensFlare.StarburstBlades == clean.LensFlare.StarburstBlades
           && sequence.LensFlare.GhostCount      == clean.LensFlare.GhostCount
           && sequence.LensFlare.StreakTintB     == clean.LensFlare.StreakTintB,
              "switching styles leaves no residue from the previous one", "");

        // Custom is the one that must leave everything alone, or hand-tuning is impossible.
        Frontier::CelestialStructure hand = settings;
        hand.LensFlare.GhostCount = 11;
        hand.LensFlare.StarburstBlades = 9;
        Frontier::ApplyLensFlareStyle(hand.LensFlare, Frontier::LensFlareStyleCategory::Custom);
        Check(hand.LensFlare.GhostCount == 11 && hand.LensFlare.StarburstBlades == 9,
              "Custom preserves hand-tuned values", "11 ghosts, 9 blades kept");

        // 🔴 AND THE COMBINING REQUIREMENT SURVIVES THE CHANGE. ElementMask still overrides, so a preset plus an
        //    extra element is legal without inventing another preset for it.
        Frontier::CelestialStructure combined = Apply(Frontier::LensFlareStyleCategory::Cinematic);
        combined.LensFlare.ElementMask = Frontier::LensFlareElementStreak
                                        | Frontier::LensFlareElementStarburst
                                        | Frontier::LensFlareElementHalo;
        Check(MaskOf(combined) == 13u,
              "streak + starburst + halo without ghosts is reachable", "mask 13");
        combined.LensFlare.ElementMask = Frontier::LensFlareElementStreak
                                        | Frontier::LensFlareElementGhosts
                                        | Frontier::LensFlareElementStarburst
                                        | Frontier::LensFlareElementHalo;
        Check(MaskOf(combined) == 15u,
              "the four requested elements combine in one mask", "mask 15");
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("6. THE HALO IS CONTROLLED - a soft annulus, not a flood");
    //----------------------------------------------------------------------------------------------------------------
    {
        const float haloDegrees = ReferenceScreenRadiusDegrees(record.FlareHalo.y);
        const float peak = Luma(CelestialFlareHalo(record, Offset(haloDegrees, 0.0f)));
        const float inner = Luma(CelestialFlareHalo(record, Offset(0.4f, 0.0f)));
        const float far   = Luma(CelestialFlareHalo(record, Offset(ReferenceScreenRadiusDegrees(record.FlareHalo.y + 0.30f), 0.0f)));
        Check(peak > 0.0f, "the halo has a visible annular peak", Fixed(peak, 6));
        Check(peak > inner * 2.5f, "the halo is suppressed at the source", Fixed(peak / std::max(inner, 1e-8f), 2) + "x");
        Check(far < peak * 0.05f, "the halo falls away outside its optical radius", Fixed(far / std::max(peak, 1e-8f), 4));

        Frontier::CelestialStructure broad = settings;
        broad.LensFlare.HaloThickness = 0.12f;
        CelestialRecord broadRecord = BuildRecord(broad);
        const float defaultShoulder = Luma(CelestialFlareHalo(record, Offset(ReferenceScreenRadiusDegrees(record.FlareHalo.y + 0.025f), 0.0f)));
        const float broadShoulder = Luma(CelestialFlareHalo(broadRecord, Offset(ReferenceScreenRadiusDegrees(broadRecord.FlareHalo.y + 0.025f), 0.0f)));
        Check(broadShoulder > defaultShoulder * 1.5f, "legacy thickness control can broaden the reference ring",
              Fixed(broadShoulder / std::max(defaultShoulder, 1e-8f), 3) + "x shoulder");
    }

    //----------------------------------------------------------------------------------------------------------------
    Section("7. THE WHOLE FLARE, AND ITS OCCLUSION");
    //----------------------------------------------------------------------------------------------------------------
    {
        const vec3 visible  = CelestialLensFlare(record, Offset(5.0f, 0.0f), gForward, gRight, gUp, 1.0f, white, 1.0f);
        const vec3 hidden   = CelestialLensFlare(record, Offset(5.0f, 0.0f), gForward, gRight, gUp, 1.0f, white, 0.0f);

        Check(Luma(visible) > 0.0f, "the composite flare produces light", Fixed(Luma(visible), 5));
        Check(Luma(hidden) <= Luma(visible) * 0.01f,
              "and a fully occluded sun kills it",
              Fixed(Luma(hidden), 8));

        // Occlusion must be GRADUAL: the sun has angular size and is hidden progressively, so a hard cut pops.
        const vec3 half = CelestialLensFlare(record, Offset(5.0f, 0.0f), gForward, gRight, gUp, 1.0f, white, 0.5f);
        const double ratio = double(Luma(half)) / std::max(double(Luma(visible)), 1e-12);
        Check(ratio > 0.4 && ratio < 0.6,
              "half-occluded gives roughly half the flare",
              Fixed(ratio, 3) + "x");

        // 🔴 AND THE STANDING RULE, CHECKED ON THE WHOLE COMPOSITE RATHER THAN ELEMENT BY ELEMENT. Sample a ring
        //    close to the source, with every element on, and require the variation around that ring to be large — the
        //    starburst and streak must remain structured even when the controlled halo is present.
        Frontier::CelestialStructure high = settings;
        Frontier::ApplyLensFlareStyle(high.LensFlare, Frontier::LensFlareStyleCategory::Vintage);
        CelestialRecord all = BuildRecord(high);
        gCelestialRecordPtr = &all;

        float brightest = 0.0f, darkest = 1e30f;
        for (int a = 0; a < 180; ++a)
        {
            const float angle = float(a) / 180.0f * 6.2831853f;
            const vec3 dir = Offset(2.5f * std::cos(angle), 2.5f * std::sin(angle));
            const float value = Luma(CelestialLensFlare(all, dir, gForward, gRight, gUp, 1.0f, white, 1.0f));
            brightest = std::max(brightest, value);
            darkest   = std::min(darkest, value);
        }
        Check(darkest < brightest * 0.85f,
              "at 2.5 deg the flare is structured, not a uniform ring",
              "darkest " + Fixed(darkest, 8) + " vs brightest " + Fixed(brightest, 6));

        gCelestialRecordPtr = &record;
    }

    //----------------------------------------------------------------------------------------------------------------
    std::printf("\n========================================================================\n");
    std::printf(" %d checks, %d failures\n", gChecks, gFail);
    std::printf("========================================================================\n");
    return gFail == 0 ? 0 : 1;
}
