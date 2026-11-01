//==========================================================================================================================================
//                                                        DISCREPANCY SEQUENCE
//==========================================================================================================================================
// 🧩 Low-discrepancy R2 sequences and per-pixel PCG streams for hemisphere and spatial sampling.

#pragma once

// 📝 PCG-RXS-M-XS 32-bit permutation (O'Neill 2014).
uint PermuteUnsigned(uint Input)
{
    uint Word = ((Input >> ((Input >> 28u) + 4u)) ^ Input) * 277803737u;
    return (Word >> 22u) ^ Word;
}

uint ConstructPixelSeed(uint2 Pixel, uint FrameIndex, uint Salt)
{
    return PermuteUnsigned(Pixel.x + PermuteUnsigned(Pixel.y + PermuteUnsigned(FrameIndex * 747796405u + Salt)));
}

float AdvanceUniform(inout uint Seed)
{
    Seed = PermuteUnsigned(Seed + 2891336453u);
    return float(Seed) * (1.0f / 4294967296.0f);
}

// 📝 Roberts' R2 sequence (plastic constant p = 1.32471795724), Cranley-Patterson rotated per pixel.
float2 SampleDiscrepancyPair(uint2 Pixel, uint Index)
{
    uint   Hash   = PermuteUnsigned(Pixel.x ^ PermuteUnsigned(Pixel.y));
    float2 Offset = float2(float(Hash & 0xFFFFu), float(Hash >> 16u)) * (1.0f / 65536.0f);
    return frac(Offset + float(Index) * float2(0.7548776662f, 0.5698402910f));
}

// 📝 Malley's method: concentric disk -> unit hemisphere -> cosine-weighted direction in local +Z tangent space.
float3 ProjectCosineHemisphere(float2 Pair)
{
    float φ      = 6.28318530718f * Pair.x;
    float Radius = sqrt(Pair.y);
    return float3(Radius * cos(φ), Radius * sin(φ), sqrt(max(0.0f, 1.0f - Pair.y)));
}

float2 ProjectUniformDisk(float2 Pair)
{
    float φ      = 6.28318530718f * Pair.x;
    float Radius = sqrt(Pair.y);
    return float2(Radius * cos(φ), Radius * sin(φ));
}
