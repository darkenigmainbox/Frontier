//============================================================================================================================================
//                                                 CELESTIALFEEDSEQUENCE.CPP
//============================================================================================================================================
// 🧩 The celestial block's feed into the development outliner — icons, accents and metas as the reference
//    panel seats them, read live off the sequence the renderer reads.

#include "CelestialFeedSequence.h"

#include <cmath>
#include <cstdio>
#include <cstring>

namespace Frontier::ProjectZero {

namespace {

// The reference panel's icon and accent per entity, in CelestialEntity order. The cloud layer carries the
//    volumetric Clouds idiom: the engine's layer IS the reference's vclouds system (type/base/thickness),
//    not its ported fallback.
struct EntityIdiom
{
    const char* Icon;
    uint32_t    Accent;   // 0xRRGGBB
    uint32_t    Pills;
};

constexpr EntityIdiom kIdioms[kCelestialEntityCount] = {
    { "atmo",   0x5AA9FF, kCelestialPillSky },        // Atmosphere
    { "sun",    0xFFB454, kCelestialPillLight },      // Sun
    { "sky",    0x67E8F9, kCelestialPillSky },        // Sky
    { "stars",  0xC4B5FD, kCelestialPillSky },        // Stars
    { "moon",   0xDFE6F5, kCelestialPillBody },       // Moons
    { "fog",    0x9FB0C0, kCelestialPillSky },        // HeightFog
    { "afog",   0x8FB8D8, kCelestialPillSky },        // AtmosphericFog
    { "vclouds", 0xF1F5F9, kCelestialPillSky },       // CloudLayer
    { "lcloud", 0xE8EEF6, kCelestialPillSky },        // LocalCloud
    { "vfog",   0xC9D6E2, kCelestialPillSky },        // LocalFog
    { "wind",   0xA7F3D0, kCelestialPillSky },        // Wind
    { "rain",   0x7DD3FC, kCelestialPillSky },        // Precipitation
    { "rainbow", 0xE5D33A, kCelestialPillSky },       // Rainbow
    { "flare",  0xFF8A65, kCelestialPillCamera },     // LensFlare
};

const char* CloudTypeName(CloudTypeCategory Type) noexcept
{
    switch (Type)
    {
    case CloudTypeCategory::Stratus:       return "Stratus";
    case CloudTypeCategory::Stratocumulus: return "Stratocumulus";
    case CloudTypeCategory::Cumulus:       return "Cumulus";
    case CloudTypeCategory::Cumulonimbus:  return "Cumulonimbus";
    case CloudTypeCategory::Altostratus:   return "Altostratus";
    case CloudTypeCategory::Cirrus:        return "Cirrus";
    default:                               return "?";
    }
}

const char* PrecipName(PrecipitationCategory Category) noexcept
{
    switch (Category)
    {
    case PrecipitationCategory::Rain:    return "Rain";
    case PrecipitationCategory::Drizzle: return "Drizzle";
    case PrecipitationCategory::Hail:    return "Hail";
    case PrecipitationCategory::Snow:    return "Snow";
    case PrecipitationCategory::Sleet:   return "Sleet";
    default:                             return "?";
    }
}

const char* QualityName(FidelityCategory Quality) noexcept
{
    switch (Quality)
    {
    case FidelityCategory::MinimalFidelity:   return "Minimal";
    case FidelityCategory::EconomyFidelity:   return "Economy";
    case FidelityCategory::StandardFidelity:  return "Standard";
    case FidelityCategory::UltraFidelity:     return "Ultra";
    case FidelityCategory::ReferenceFidelity: return "Reference";
    default:                                  return "?";
    }
}

// Eight-wind compass off a TOWARD bearing, the engine's convention.
const char* CompassName(float BearingToward) noexcept
{
    static const char* const Winds[8] = { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
    float Turned = std::fmod(BearingToward, 360.0f);
    if (Turned < 0.0f)
        Turned += 360.0f;
    return Winds[static_cast<uint32_t>((Turned + 22.5f) / 45.0f) % 8u];
}

void AccentOf(float Accent[3], uint32_t Hex) noexcept
{
    Accent[0] = static_cast<float>((Hex >> 16) & 0xFFu) / 255.0f;
    Accent[1] = static_cast<float>((Hex >> 8) & 0xFFu) / 255.0f;
    Accent[2] = static_cast<float>(Hex & 0xFFu) / 255.0f;
}

} // namespace

void FillCelestialOutliner(RenderScheduler& Panel, const CelestialSequence& Celestial,
                           float FramesPerSecond, FidelityCategory Quality,
                           const float CameraStation[3]) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    Panel.AssignScenePillBit(kCelestialPillGeometry);

    constexpr const char* kPillIds[5]     = { "light", "sky", "body", "geo", "cam" };
    constexpr const char* kPillLabels[5]  = { "Lights", "Sky", "Bodies", "Geometry", "Camera" };
    constexpr uint32_t    kPillAccents[5] = { 0xFFB454, 0x5AA9FF, 0xDFE6F5, 0xE2E8F0, 0x34C759 };
    for (uint32_t P = 0u; P < 5u; ++P)
    {
        WorldEntryPill Pill{};
        std::snprintf(Pill.Id, sizeof(Pill.Id), "%s", kPillIds[P]);
        std::snprintf(Pill.Label, sizeof(Pill.Label), "%s", kPillLabels[P]);
        AccentOf(Pill.Accent, kPillAccents[P]);
        Pill.Bit = 1u << P;
        Panel.RegisterPill(Pill);
    }

    WorldEntry Folder{};
    std::snprintf(Folder.Id, sizeof(Folder.Id), "celworld");
    std::snprintf(Folder.Label, sizeof(Folder.Label), "World");
    std::snprintf(Folder.Icon, sizeof(Folder.Icon), "globe");
    AccentOf(Folder.Accent, 0x5AA9FF);
    Folder.Folder   = true;
    Folder.EyeShown = false;   // the reference's World hangs no eye and takes no drags
    Folder.Anchored = true;
    Folder.Visible  = Celestial.Enabled;
    Panel.RegisterWorldEntry(Folder);

    const CelestialFrame& Solved = Celestial.Frame();
    const uint32_t MoonsIndex = static_cast<uint32_t>(CelestialEntity::Moons);
    const uint32_t CloudsIndex = static_cast<uint32_t>(CelestialEntity::CloudLayer);
    for (uint32_t E = 0u; E < kCelestialEntityCount; ++E)
    {
        const CelestialEntity Entity = static_cast<CelestialEntity>(E);
        WorldEntry Row{};
        std::snprintf(Row.Id, sizeof(Row.Id), "cel#%u", E);
        std::snprintf(Row.Label, sizeof(Row.Label), "%s", CelestialEntityName(Entity));
        std::snprintf(Row.Icon, sizeof(Row.Icon), "%s", kIdioms[E].Icon);
        AccentOf(Row.Accent, kIdioms[E].Accent);
        Row.Standing = WorldEntryStanding::Seated;
        Row.Visible  = Celestial.Shown[E];
        Row.Folder   = Entity == CelestialEntity::Moons;
        Row.EyeShown = true;
        Row.Anchored = false;
        if (Entity == CelestialEntity::Precipitation)
            std::snprintf(Row.AboveId, sizeof(Row.AboveId), "cel#%u", CloudsIndex);
        else
            std::snprintf(Row.AboveId, sizeof(Row.AboveId), "celworld");
        Row.PillBits = kIdioms[E].Pills;

        char Meta[64] = {};
        switch (Entity)
        {
        case CelestialEntity::Atmosphere:
            std::snprintf(Meta, sizeof(Meta), "AM %.2f",
                          static_cast<double>(CelestialSolver::AirMass(Solved.Sun.Elevation)));
            break;
        case CelestialEntity::Sun:
            std::snprintf(Meta, sizeof(Meta), "%+.1f\xC2\xB0",
                          static_cast<double>(Solved.Sun.Elevation));
            if (Solved.Sun.Elevation < -0.8f)
                Row.Standing = WorldEntryStanding::Advisory;   // below the horizon
            break;
        case CelestialEntity::Moons:
        {
            uint32_t Lit = 0u;
            for (uint32_t S = 0u; S < kMoonDrawCount; ++S)
                if (Celestial.MoonSlots[S].Visible)
                    ++Lit;
            std::snprintf(Meta, sizeof(Meta), "%u/4", Lit);
            break;
        }
        case CelestialEntity::HeightFog:
            if (!Celestial.Fog.HeightEnabled)
                std::snprintf(Meta, sizeof(Meta), "off");
            else
                std::snprintf(Meta, sizeof(Meta), "%d m",
                              static_cast<int>(std::sqrt(-std::log(0.02))
                                               / std::max(1.0e-4f, Celestial.Fog.HeightDensity)));
            break;
        case CelestialEntity::CloudLayer:
            std::snprintf(Meta, sizeof(Meta), "%s \xC2\xB7 %d%%",
                          CloudTypeName(Celestial.Cloud.Type),
                          static_cast<int>(Celestial.Cloud.Coverage * 100.0f));
            break;
        case CelestialEntity::LocalCloud:
            std::snprintf(Meta, sizeof(Meta), "%.0f\xC3\x97%.0f m",
                          static_cast<double>(Celestial.LocalCloud.HalfSize[0] * 2.0f),
                          static_cast<double>(Celestial.LocalCloud.HalfSize[2] * 2.0f));
            break;
        case CelestialEntity::LocalFog:
            std::snprintf(Meta, sizeof(Meta), "%.0f\xC3\x97%.0f m",
                          static_cast<double>(Celestial.LocalFog.HalfSize[0] * 2.0f),
                          static_cast<double>(Celestial.LocalFog.HalfSize[2] * 2.0f));
            break;
        case CelestialEntity::Wind:
            std::snprintf(Meta, sizeof(Meta), "%.1f m/s %s",
                          static_cast<double>(Celestial.Wind.Speed), CompassName(Celestial.Wind.Bearing));
            break;
        case CelestialEntity::Precipitation:
            std::snprintf(Meta, sizeof(Meta), "%s %.0f mm/h", PrecipName(Celestial.Precip.Category),
                          static_cast<double>(Celestial.Precip.RateMillimetresPerHour));
            break;
        case CelestialEntity::Rainbow:
            std::snprintf(Meta, sizeof(Meta), "%.0f%%",
                          static_cast<double>(Celestial.Rainbow.Intensity * 100.0f));
            break;
        default:
            break;
        }
        std::snprintf(Row.Meta, sizeof(Row.Meta), "%s", Meta);
        Panel.RegisterWorldEntry(Row);
    }

    for (uint32_t S = 0u; S < kMoonDrawCount; ++S)
    {
        const MoonSlotState& Slot = Celestial.MoonSlots[S];
        const MoonAtlasPreset& Preset =
            kMoonAtlas[Slot.Preset < kMoonAtlasCount ? Slot.Preset : 0u];
        WorldEntry Moon{};
        std::snprintf(Moon.Id, sizeof(Moon.Id), "celmoon#%u", S);
        std::snprintf(Moon.Label, sizeof(Moon.Label), "%s", Preset.Name);
        std::snprintf(Moon.Icon, sizeof(Moon.Icon), "moon");
        AccentOf(Moon.Accent, 0xDFE6F5);
        const float Lit = (1.0f + std::cos(Slot.Phase * 6.283185307f)) * 0.5f;
        std::snprintf(Moon.Meta, sizeof(Moon.Meta), "%d%%", static_cast<int>(Lit * 100.0f));
        Moon.Standing = WorldEntryStanding::Seated;
        const float Risen = Slot.FollowSky ? Solved.Moon.Elevation : Slot.Elevation;
        if (Risen <= 0.0f)
            Moon.Standing = WorldEntryStanding::Advisory;   // set
        Moon.Visible  = Slot.Visible;
        Moon.Folder   = false;
        Moon.EyeShown = true;
        Moon.Anchored = false;
        std::snprintf(Moon.AboveId, sizeof(Moon.AboveId), "cel#%u", MoonsIndex);
        Moon.PillBits = kCelestialPillBody;
        Moon.Thumb    = static_cast<ImTextureID>(0);
        Panel.RegisterWorldEntry(Moon);
    }

    OutlinerFooterFigures Footer{};
    float Hours = std::fmod(Celestial.Observation.LocalHours, 24.0f);
    if (Hours < 0.0f)
        Hours += 24.0f;
    std::snprintf(Footer.Clock, sizeof(Footer.Clock), "%02u:%02u",
                  static_cast<uint32_t>(Hours),
                  static_cast<uint32_t>((Hours - std::floor(Hours)) * 60.0f));
    std::snprintf(Footer.Fps, sizeof(Footer.Fps), "%.0f", static_cast<double>(FramesPerSecond));
    std::snprintf(Footer.Quality, sizeof(Footer.Quality), "%s", QualityName(Quality));
    std::snprintf(Footer.Sun, sizeof(Footer.Sun), "%+.1f\xC2\xB0",
                  static_cast<double>(Solved.Sun.Elevation));
    uint32_t Risen = 0u;
    for (uint32_t S = 0u; S < kMoonDrawCount; ++S)
    {
        const MoonSlotState& Slot = Celestial.MoonSlots[S];
        const float High = Slot.FollowSky ? Solved.Moon.Elevation : Slot.Elevation;
        if (Slot.Visible && High > 0.0f)
            ++Risen;
    }
    std::snprintf(Footer.Moons, sizeof(Footer.Moons), "%u", Risen);
    if (CameraStation != nullptr)
        std::snprintf(Footer.Cam, sizeof(Footer.Cam), "%.0f, %.1f, %.0f",
                      static_cast<double>(CameraStation[0]), static_cast<double>(CameraStation[1]),
                      static_cast<double>(CameraStation[2]));
    Panel.AssignFooter(Footer);
#else
    (void)Panel;
    (void)Celestial;
    (void)FramesPerSecond;
    (void)Quality;
    (void)CameraStation;
#endif
}

void ApplyOutlinerToWorld(RenderScheduler& Panel, CelestialSequence& Celestial,
                          EditorInstance* Scene, uint32_t SceneRows) noexcept
{
#ifdef FRONTIER_DEVELOPMENT
    if (Scene == nullptr)
        return;
    const uint32_t Registered = Panel.QueryOutlineEntryCount();
    for (uint32_t I = 0u; I < Registered; ++I)
    {
        const WorldEntry* Row = Panel.QueryOutlineEntryAt(I);
        if (Row == nullptr)
            continue;
        if (std::strncmp(Row->Id, "scene#", 6) == 0)
        {
            unsigned int Ordinal = 0u;
            if (std::sscanf(Row->Id + 6, "%u", &Ordinal) == 1 && Ordinal < SceneRows)
                Scene[Ordinal].Visible = Row->Visible;
        }
        else if (std::strcmp(Row->Id, "celworld") == 0)
        {
            Celestial.Enabled = Row->Visible;
        }
        else if (std::strncmp(Row->Id, "celmoon#", 8) == 0)
        {
            unsigned int Slot = 0u;
            if (std::sscanf(Row->Id + 8, "%u", &Slot) == 1 && Slot < kMoonDrawCount)
                Celestial.MoonSlots[Slot].Visible = Row->Visible;
        }
        else if (std::strncmp(Row->Id, "cel#", 4) == 0)
        {
            unsigned int Entity = 0u;
            if (std::sscanf(Row->Id + 4, "%u", &Entity) == 1 && Entity < kCelestialEntityCount)
                Celestial.Shown[Entity] = Row->Visible;
        }
    }
#else
    (void)Panel;
    (void)Celestial;
    (void)Scene;
    (void)SceneRows;
#endif
}

} // namespace Frontier::ProjectZero
