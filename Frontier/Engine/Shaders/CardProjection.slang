//==========================================================================================================================================
//                                                           CARD PROJECTION
//==========================================================================================================================================
// 🧩 Projection between an occupant's local coordinates and its six axis-aligned surface cards.

#pragma once

#include "SceneRecords.slang"

static const float GroundPadMinimumX = -56.0f;
static const float GroundPadMinimumY = -56.0f;
static const float GroundTileExtent  = 32.0f;
static const uint  GroundTileCountX  = 6u;
static const uint  GroundTileCountY  = 4u;
static const uint  GroundFirstCard   = 0u;
static const uint  GroundStripCard   = 24u;

float3 ResolveCardAxis(uint Axis)
{
    if (Axis == 0u)      { return float3( 1.0f,  0.0f,  0.0f); }
    else if (Axis == 1u) { return float3(-1.0f,  0.0f,  0.0f); }
    else if (Axis == 2u) { return float3( 0.0f,  1.0f,  0.0f); }
    else if (Axis == 3u) { return float3( 0.0f, -1.0f,  0.0f); }
    else if (Axis == 4u) { return float3( 0.0f,  0.0f,  1.0f); }
    else                 { return float3( 0.0f,  0.0f, -1.0f); }
}

float3 ProjectCardCoordinates(CardRecord Card, float3 LocalPosition)
{
    float3 Span     = max(Card.LocalMaximum - Card.LocalMinimum, float3(1.0e-5f));
    float3 Fraction = (LocalPosition - Card.LocalMinimum) / Span;
    if (Card.Axis == 0u)      { return float3(Fraction.y, Fraction.z, 1.0f - Fraction.x); }
    else if (Card.Axis == 1u) { return float3(Fraction.y, Fraction.z, Fraction.x); }
    else if (Card.Axis == 2u) { return float3(Fraction.x, Fraction.z, 1.0f - Fraction.y); }
    else if (Card.Axis == 3u) { return float3(Fraction.x, Fraction.z, Fraction.y); }
    else if (Card.Axis == 4u) { return float3(Fraction.x, Fraction.y, 1.0f - Fraction.z); }
    else                      { return float3(Fraction.x, Fraction.y, Fraction.z); }
}

float3 ReconstructCardLocal(CardRecord Card, float3 Coordinates)
{
    float3 Fraction;
    if (Card.Axis == 0u)      { Fraction = float3(1.0f - Coordinates.z, Coordinates.x, Coordinates.y); }
    else if (Card.Axis == 1u) { Fraction = float3(Coordinates.z, Coordinates.x, Coordinates.y); }
    else if (Card.Axis == 2u) { Fraction = float3(Coordinates.x, 1.0f - Coordinates.z, Coordinates.y); }
    else if (Card.Axis == 3u) { Fraction = float3(Coordinates.x, Coordinates.z, Coordinates.y); }
    else if (Card.Axis == 4u) { Fraction = float3(Coordinates.x, Coordinates.y, 1.0f - Coordinates.z); }
    else                      { Fraction = float3(Coordinates.x, Coordinates.y, Coordinates.z); }
    return Card.LocalMinimum + Fraction * (Card.LocalMaximum - Card.LocalMinimum);
}

float ResolveCardDepthExtent(CardRecord Card)
{
    float3 Span = Card.LocalMaximum - Card.LocalMinimum;
    if (Card.Axis <= 1u)      { return max(Span.x, 1.0e-5f); }
    else if (Card.Axis <= 3u) { return max(Span.y, 1.0e-5f); }
    else                      { return max(Span.z, 1.0e-5f); }
}
