//==========================================================================================================================================
//                                                          RESERVOIR RECORDS
//==========================================================================================================================================
// 🧩 32-byte diffuse GI reservoir record and the unnormalised target density it resamples against.

#pragma once

#include "PackingCodec.slang"
#include "DistanceRecords.slang"

struct ReservoirRecord
{
    float3 SamplePosition; // [m]   hit point, or x_v + d.SkyReach on an escape
    uint   SampleNormal;   // [-]   octahedral surface normal at the sample
    uint2  Radiance;       // [-]   half RGB + occupant identity in the fourth half
    float  Weight;         // [-]   W before normalisation, or W after
    float  Tally;          // [-]   M: stream count
};

static const float SkyReach = 10000.0f;

ReservoirRecord ConstructEmptyReservoir()
{
    ReservoirRecord Reservoir;
    Reservoir.SamplePosition = float3(0.0f);
    Reservoir.SampleNormal   = 0u;
    Reservoir.Radiance       = PackHalfTriple(float3(0.0f), float(VacantIdentity));
    Reservoir.Weight         = 0.0f;
    Reservoir.Tally          = 0.0f;
    return Reservoir;
}

float3 UnpackReservoirRadiance(ReservoirRecord Reservoir)
{
    return UnpackHalfTriple(Reservoir.Radiance).xyz;
}

uint UnpackReservoirIdentity(ReservoirRecord Reservoir)
{
    return uint(UnpackHalfTriple(Reservoir.Radiance).w + 0.5f);
}

// 📝 Target density p_hat(y) at a receiver (x_v, n_v): luminance(L(y)) . max(0, n_v . omega), where omega points from x_v to y.
float ResolveReservoirTarget(float3 ReceiverPosition, float3 ReceiverNormal, float3 SamplePosition, float3 Radiance)
{
    float3 Direction = normalize(SamplePosition - ReceiverPosition);
    float  Cosine    = max(dot(ReceiverNormal, Direction), 0.0f);
    return dot(Radiance, float3(0.2126f, 0.7152f, 0.0722f)) * Cosine;
}
