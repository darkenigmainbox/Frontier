//==========================================================================================================================================
//                                                           FRAME DESCRIPTOR
//==========================================================================================================================================
// 🧩 The frame record at group 0, slot 0 — every program that reads the camera, the light or the toggles includes this.

#pragma once

#include "SceneRecords.slang"

[[vk::binding(0, 0)]] ConstantBuffer<FrameRecord> Frame;

// 📝 Reconstructs the world position of a screen pixel centre from reversed depth through the jittered inverse.
float3 ReconstructWorldPosition(float2 Pixel, float Depth)
{
    float2 Ndc  = float2(Pixel.x * Frame.InverseScreenExtent.x * 2.0f - 1.0f,
                         1.0f - Pixel.y * Frame.InverseScreenExtent.y * 2.0f);
    float4 Clip = mul(Frame.InverseViewProjection, float4(Ndc, Depth, 1.0f));
    return Clip.xyz / Clip.w;
}

// 📝 Linear view distance along -Z of a world position; used by the similarity tests of every reprojection.
float ResolveViewDepth(float3 Position)
{
    return -mul(Frame.View, float4(Position, 1.0f)).z;
}

// 📝 View distance the same world point had in the previous frame: w of its previous unjittered clip position.
float ResolvePriorViewDepth(float3 Position)
{
    return mul(Frame.PreviousUnjitteredViewProjection, float4(Position, 1.0f)).w;
}

// 📝 A prior guide depth agrees when it matches either where this point was last frame (a static surface under a
//    moving camera) or where it is now (a surface riding with the camera, such as the chased vehicle).
bool ClassifyPriorDepth(float PriorDepth, float ExpectedDepth, float ViewDepth)
{
    return abs(PriorDepth - ExpectedDepth) < 0.08f * ExpectedDepth + 0.03f ||
           abs(PriorDepth - ViewDepth) < 0.08f * ViewDepth + 0.03f;
}
