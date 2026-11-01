//==========================================================================================================================================
//                                                          FIRE ILLUMINATION
//==========================================================================================================================================
// 🧩 A burning tyre as a point light on the scene: inverse-square, windowed to its reach, shadowed through the scene distance field.

#pragma once

#include "FrameDescriptor.slang"
#include "DistanceTraversal.slang"

struct FireArrival
{
    float3 Direction;   // [-]  toward the fire
    float3 Illuminance; // [-]  arriving at normal incidence, shadowed and windowed
};

FireArrival ResolveFireArrival(float3 Position, float3 Normal)
{
    FireArrival Arrival;
    Arrival.Direction   = float3(0.0f, 0.0f, 1.0f);
    Arrival.Illuminance = float3(0.0f);
    if (Frame.FireLightIntensity <= 0.0f)
    {
        return Arrival;
    }
    float3 Toward  = Frame.FireLightPosition - Position;
    float  Squared = dot(Toward, Toward);
    float  Reach   = Frame.FireLightReach;
    if (Squared >= Reach * Reach)
    {
        return Arrival;
    }
    float Range       = sqrt(Squared);
    Arrival.Direction = Toward / max(Range, 1.0e-4f);
    if (dot(Normal, Arrival.Direction) <= 0.0f)
    {
        return Arrival;
    }
    float Ratio      = Squared / (Reach * Reach);
    float Window     = (1.0f - Ratio * Ratio) * (1.0f - Ratio * Ratio);
    float Visibility = 1.0f;
    if (FeatureEnabled(Frame, FeatureDirectShadow))
    {
        float Bias = ResolveSurfaceBias(Position);
        Visibility = TraverseSceneShadow(Position + Normal * Bias, Arrival.Direction, 0.5f * Bias, max(Range - 0.6f, 0.0f), 4.0f);
    }
    Arrival.Illuminance = Frame.FireLightColour * Frame.FireLightIntensity * Window * Visibility / max(Squared, 0.25f);
    return Arrival;
}
