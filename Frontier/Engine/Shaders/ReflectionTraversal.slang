//==========================================================================================================================================
//                                                        REFLECTION TRAVERSAL
//==========================================================================================================================================
// 🧩 Glossy reflection trace per resampling pixel: GGX microfacet perturbation with multi-bounce BVH raytracing or distance-field cone march.

#include "CardSampling.slang"
#include "SurfaceReflectance.slang"
#include "PackingCodec.slang"
#include "DiscrepancySequence.slang"
#include "RayTraversal.slang"

[[vk::binding(1, 0)]] StructuredBuffer<MaterialRecord>      Materials;
[[vk::binding(2, 0)]] Texture2D<float4>                     SurfaceAttributes;
[[vk::binding(3, 0)]] Texture2D<float>                      SurfaceDepth;
[[vk::binding(4, 0)]] [format("rgba16f")] RWTexture2D<float4> ReflectionTarget;

[shader("compute")]
[numthreads(8, 8, 1)]
void TraverseReflection(uint3 Invocation : SV_DispatchThreadID)
{
    uint2 TracePixel = Invocation.xy;
    if (any(float2(TracePixel) >= Frame.TraceExtent))
    {
        return;
    }
    if (!FeatureEnabled(Frame, FeatureReflection))
    {
        ReflectionTarget[TracePixel] = float4(0.0f);
        return;
    }

    uint  Scale       = Frame.TraceScale;
    uint2 ScreenLimit = uint2(Frame.ScreenExtent) - uint2(1u);
    uint2 ScreenPixel = min(TracePixel * Scale + uint2(Scale / 2u), ScreenLimit);
    float Depth       = SurfaceDepth.Load(int3(int2(ScreenPixel), 0));
    if (Depth <= 0.0f)
    {
        ReflectionTarget[TracePixel] = float4(0.0f);
        return;
    }

    float4         Attributes       = SurfaceAttributes.Load(int3(int2(ScreenPixel), 0));
    MaterialRecord Material         = Materials[uint(Attributes.z + 0.5f)];
    float          Roughness        = (Material.CoatWeight > 0.0f) ? Material.CoatRoughness : Material.Roughness;
    bool           UseRtReflections = FeatureEnabled(Frame, FeatureRayTracing) && FeatureEnabled(Frame, FeatureRayTracedReflections);
    float          MaxRoughness     = UseRtReflections ? ResolveReflectionRoughness(Frame) : 0.50f;
    if (Roughness >= MaxRoughness)
    {
        ReflectionTarget[TracePixel] = float4(0.0f);
        return;
    }

    float3 Position = ReconstructWorldPosition(float2(ScreenPixel) + 0.5f, Depth);
    float3 Normal   = DecodeOctahedral(Attributes.xy);
    float3 View     = normalize(Frame.CameraPosition - Position);
    float3 Mirror   = reflect(-View, Normal);

    float2 Pair      = SampleDiscrepancyPair(TracePixel, Frame.FrameIndex + 19u);
    float  α         = Roughness * Roughness;
    float2 Disk      = ProjectUniformDisk(Pair) * (α * 0.6f);
    float3 Direction = normalize(TransformLocalToWorld(Mirror, float3(Disk.x, Disk.y, 1.0f)));
    if (dot(Normal, Direction) <= 0.02f)
    {
        Direction = Mirror;
    }

    if (UseRtReflections)
    {
        uint   Seed    = ConstructPixelSeed(TracePixel, Frame.FrameIndex, 31u);
        uint   Bounces = ResolveReflectionBounces(Frame);
        float4 Traced  = TraceMultiBounceReflection(Position, Normal, Direction, Bounces, Seed);
        ReflectionTarget[TracePixel] = Traced;
    }
    else
    {
        float        Bias     = ResolveSurfaceBias(Position);
        TraversalHit Hit      = TraverseSceneDistance(Position + Normal * Bias, Direction, 0.5f * Bias, 260.0f, α * 0.5f);
        float3       Radiance = ResolveTraversalRadiance(Hit, Direction);
        ReflectionTarget[TracePixel] = float4(Radiance, Hit.Travel);
    }
}
