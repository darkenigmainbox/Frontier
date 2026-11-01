//==========================================================================================================================================
//                                                            PACKING CODEC
//==========================================================================================================================================
// 🧩 Octahedral unit-vector encoding and half-precision packing for reservoirs and surface attributes.

#pragma once

// 📝 Octahedral projection (Cigolle et al. 2014): the unit sphere folded onto the [-1, 1]^2 square.
float2 EncodeOctahedral(float3 Normal)
{
    float2 Projected = Normal.xy / max(abs(Normal.x) + abs(Normal.y) + abs(Normal.z), 1.0e-12f);
    if (Normal.z >= 0.0f)
    {
        return Projected;
    }
    float2 SignVec = float2((Projected.x >= 0.0f) ? 1.0f : -1.0f,
                            (Projected.y >= 0.0f) ? 1.0f : -1.0f);
    return (1.0f - abs(Projected.yx)) * SignVec;
}

float3 DecodeOctahedral(float2 Encoded)
{
    float3 Normal = float3(Encoded.x, Encoded.y, 1.0f - abs(Encoded.x) - abs(Encoded.y));
    float  Fold   = max(-Normal.z, 0.0f);
    Normal.x     += (Normal.x >= 0.0f) ? -Fold : Fold;
    Normal.y     += (Normal.y >= 0.0f) ? -Fold : Fold;
    return normalize(Normal);
}

uint PackSnorm2x16(float2 Value)
{
    int2 Quantized = int2(round(clamp(Value, float2(-1.0f), float2(1.0f)) * 32767.0f));
    return (uint(Quantized.x) & 0xFFFFu) | ((uint(Quantized.y) & 0xFFFFu) << 16u);
}

float2 UnpackSnorm2x16(uint Packed)
{
    int Lo = int(Packed << 16u) >> 16;
    int Hi = int(Packed) >> 16;
    return clamp(float2(float(Lo), float(Hi)) / 32767.0f, float2(-1.0f), float2(1.0f));
}

uint PackOctahedral(float3 Normal)
{
    return PackSnorm2x16(EncodeOctahedral(Normal));
}

float3 UnpackOctahedral(uint Packed)
{
    return DecodeOctahedral(UnpackSnorm2x16(Packed));
}

uint PackFloat2x16(float2 Value)
{
    uint2 HalfBits = f32tof16(Value);
    return (HalfBits.x & 0xFFFFu) | ((HalfBits.y & 0xFFFFu) << 16u);
}

float2 UnpackFloat2x16(uint Packed)
{
    return f16tof32(uint2(Packed & 0xFFFFu, (Packed >> 16u) & 0xFFFFu));
}

uint2 PackHalfTriple(float3 Triple, float Fourth)
{
    return uint2(PackFloat2x16(Triple.xy), PackFloat2x16(float2(Triple.z, Fourth)));
}

float4 UnpackHalfTriple(uint2 Packed)
{
    return float4(UnpackFloat2x16(Packed.x), UnpackFloat2x16(Packed.y));
}

float4 UnpackUnorm4x8(uint Packed)
{
    return float4(float(Packed & 0xFFu),
                  float((Packed >> 8u) & 0xFFu),
                  float((Packed >> 16u) & 0xFFu),
                  float((Packed >> 24u) & 0xFFu)) / 255.0f;
}
