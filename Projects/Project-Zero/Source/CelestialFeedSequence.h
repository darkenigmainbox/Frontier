//============================================================================================================================================
//                                                 CELESTIALFEEDSEQUENCE.H
//============================================================================================================================================
// 🧩 The celestial block's feed into the development outliner — Project-Zero's side of the Engine ⇄ Project
//    seam. Every tick the world registers its celestial rows here with the reference panel's own icons,
//    accents and meta lines (the engine only stores and draws what arrives); after Present the eye flips
//    and drag re-seats are read back into the scene and the sequence, so hiding a row hides the thing.
//
//    Row ids are the seam's contract: "celworld" hangs the block, "cel#<entity>" the fourteen entities,
//    "celmoon#<slot>" the four moon slots, and "scene#<ordinal>" (seated by the host, not here) the scene's
//    own rows. The read-back parses the same ids it registered.

#pragma once

#include "../../../Engine/DisplayPresentation/RenderScheduler.h"
#include "../../../Engine/DisplayPresentation/FidelityClassifier.h"
#include "CelestialSequence.h"

#include <cstdint>

namespace Frontier::ProjectZero {

// The outline's pill bits, in the reference panel's FILTERS order. Scene rows carry the Geometry bit.
constexpr uint32_t kCelestialPillLight    = 1u << 0u;
constexpr uint32_t kCelestialPillSky      = 1u << 1u;
constexpr uint32_t kCelestialPillBody     = 1u << 2u;
constexpr uint32_t kCelestialPillGeometry = 1u << 3u;
constexpr uint32_t kCelestialPillCamera   = 1u << 4u;

// Registers the five pills, the World folder, the fourteen entities and the four moon slots, plus the
//    footer figures. Call every tick before Present; without FRONTIER_DEVELOPMENT this rests.
void FillCelestialOutliner(RenderScheduler& Panel, const CelestialSequence& Celestial,
                           float FramesPerSecond, FidelityCategory Quality,
                           const float CameraStation[3]) noexcept;

// Carries the outline's truth back into the world: scene rows into the roster's Visible figures,
//    celestial rows into Enabled / Shown / the moon slots' Visible figures. Call after Present.
void ApplyOutlinerToWorld(RenderScheduler& Panel, CelestialSequence& Celestial,
                          EditorInstance* Scene, uint32_t SceneRows) noexcept;

} // namespace Frontier::ProjectZero
