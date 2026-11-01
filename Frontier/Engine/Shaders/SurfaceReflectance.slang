//==========================================================================================================================================
//                                                          SURFACE REFLECTANCE
//==========================================================================================================================================
// 🧩 Unified VehicleHMI + TextureBakingWorkspace (ScatteringSequence + AutomotivePaint) reflectance model:
//    Lambert diffuse, GGX specular, Charlie sheen, Beer-Lambert absorbing clear-coat, and cellular metallic flakes.

#pragma once

#include "SceneRecords.slang"

struct SurfaceSample
{
    float3 Albedo;           // [-]
    float  Roughness;        // [-]   perceptual, clamped away from zero
    float  Metalness;        // [-]
    float  SpecularLevel;    // [-]   dielectric F0
    float  CoatWeight;       // [-]
    float  CoatRoughness;    // [-]
    float3 Emission;         // [-]
    float  Transmission;     // [-]
    float3 Absorption;       // [1/m] Beer-Lambert dielectric coating absorption (ScatteringSequence)
    float  CoatingThickness; // [m]   dielectric coating thickness (ScatteringSequence)
    float3 SheenTint;        // [-]   Charlie sheen tint x intensity (ScatteringSequence)
    float  SheenRoughness;   // [-]   Charlie sheen roughness (ScatteringSequence)
    float3 FlakeTint;        // [-]   AutomotivePaint metallic flake tint
    float  FlakeCoverage;    // [-]   AutomotivePaint metallic flake coverage [0..1]
};

SurfaceSample ProjectSurfaceSample(MaterialRecord Material)
{
    SurfaceSample Surface;
    float         FlakeCov = clamp(Material.FlakeCoverage, 0.0f, 1.0f);
    float3        BaseAlb  = Material.Albedo;
    if (FlakeCov > 0.0f)
    {
        float3 BinderBase = BaseAlb * exp(-0.18f);
        BaseAlb           = lerp(BinderBase, Material.FlakeTint, FlakeCov * 0.58f);
    }
    Surface.Albedo           = BaseAlb;
    Surface.Roughness        = clamp(Material.Roughness, 0.03f, 1.0f);
    Surface.Metalness        = clamp(max(Material.Metalness, FlakeCov * 0.78f), 0.0f, 1.0f);
    Surface.SpecularLevel    = Material.SpecularLevel;
    Surface.CoatWeight       = Material.CoatWeight;
    Surface.CoatRoughness    = clamp(Material.CoatRoughness, 0.03f, 1.0f);
    Surface.Emission         = Material.Emission;
    Surface.Transmission     = Material.Transmission;
    Surface.Absorption       = max(Material.Absorption, float3(0.0f));
    Surface.CoatingThickness = max(Material.CoatingThickness, 0.0f);
    Surface.SheenTint        = max(Material.SheenTint, float3(0.0f));
    Surface.SheenRoughness   = clamp(Material.SheenRoughness > 0.0f ? Material.SheenRoughness : 0.5f, 0.05f, 1.0f);
    Surface.FlakeTint        = max(Material.FlakeTint, float3(0.0f));
    Surface.FlakeCoverage    = FlakeCov;
    return Surface;
}

float3 ResolveDiffuseAlbedo(SurfaceSample Surface)
{
    return Surface.Albedo * (1.0f - Surface.Metalness);
}

float3 ResolveSpecularColour(SurfaceSample Surface)
{
    return lerp(float3(Surface.SpecularLevel), Surface.Albedo, Surface.Metalness);
}

float3 ResolveFresnel(float3 F0, float Cosine)
{
    float Complement = 1.0f - clamp(Cosine, 0.0f, 1.0f);
    float Fifth      = Complement * Complement * Complement * Complement * Complement;
    return F0 + (float3(1.0f) - F0) * Fifth;
}

float ResolveGgxDistribution(float NdotH, float Roughness)
{
    float α           = Roughness * Roughness;
    float α2          = α * α;
    float Denominator = NdotH * NdotH * (α2 - 1.0f) + 1.0f;
    return α2 / (π * Denominator * Denominator);
}

float ResolveSmithVisibility(float NdotL, float NdotV, float Roughness)
{
    float α        = Roughness * Roughness;
    float α2       = α * α;
    float Lambda_V = NdotL * sqrt(NdotV * NdotV * (1.0f - α2) + α2);
    float Lambda_L = NdotV * sqrt(NdotL * NdotL * (1.0f - α2) + α2);
    return 0.5f / max(Lambda_V + Lambda_L, 1.0e-6f);
}

// Estevez & Kulla Charlie sheen lobe from ScatteringSequence.h / ScatteringEvaluation.slang.
float EvaluateCharlieDistribution(float Roughness, float NdotH)
{
    float InvAlpha = 1.0f / max(Roughness * Roughness, 1.0e-3f);
    float SinSq    = max(1.0f - NdotH * NdotH, 0.0078125f);
    return (2.0f + InvAlpha) * pow(SinSq, InvAlpha * 0.5f) * (0.5f * InversePi);
}

float EvaluateAshikhminVisibility(float NdotV, float NdotL)
{
    return 1.0f / max(1.0e-4f, 4.0f * (NdotL + NdotV - NdotL * NdotV));
}

float2 ResolveEnvironmentResponse(float NdotV, float Roughness)
{
    const float4 c0   = float4(-1.0f, -0.0275f, -0.572f, 0.022f);
    const float4 c1   = float4( 1.0f,  0.0425f,  1.04f, -0.04f);
    float4       r    = Roughness * c0 + c1;
    float        a004 = min(r.x * r.x, exp2(-9.28f * NdotV)) * r.x + r.y;
    return float2(-1.04f, 1.04f) * a004 + r.zw;
}

float3 ResolveDirectReflectance(SurfaceSample Surface, float3 Normal, float3 View, float3 Light)
{
    float NdotL = dot(Normal, Light);
    if (NdotL <= 0.0f)
    {
        return float3(0.0f);
    }
    float  NdotV    = max(dot(Normal, View), 1.0e-4f);
    float3 Half     = normalize(Light + View);
    float  NdotH    = max(dot(Normal, Half), 0.0f);
    float  VdotH    = max(dot(View, Half), 0.0f);
    float3 F0       = ResolveSpecularColour(Surface);
    float3 Fresnel  = ResolveFresnel(F0, VdotH);
    float3 Specular = Fresnel * ResolveGgxDistribution(NdotH, Surface.Roughness) * ResolveSmithVisibility(NdotL, NdotV, Surface.Roughness);
    if (Surface.FlakeCoverage > 0.0f)
    {
        float  FlakeRough = max(0.06f, Surface.Roughness * 0.55f);
        float3 FlakeF     = ResolveFresnel(Surface.FlakeTint, VdotH);
        float3 FlakeSpec  = FlakeF * ResolveGgxDistribution(NdotH, FlakeRough) * ResolveSmithVisibility(NdotL, NdotV, FlakeRough);
        Specular          = lerp(Specular, FlakeSpec, Surface.FlakeCoverage * 0.65f);
    }
    float3 Diffuse = ResolveDiffuseAlbedo(Surface) * InversePi * (float3(1.0f) - Fresnel);
    if (any(Surface.SheenTint > float3(0.0f)))
    {
        Diffuse += Surface.SheenTint * (EvaluateCharlieDistribution(Surface.SheenRoughness, NdotH) * EvaluateAshikhminVisibility(NdotV, NdotL));
    }
    float3 Layer = (Diffuse + Specular) * NdotL;
    if (Surface.CoatWeight > 0.0f)
    {
        float  CoatFresnel = ResolveFresnel(float3(0.04f), VdotH).x * Surface.CoatWeight;
        float  Coat        = CoatFresnel * ResolveGgxDistribution(NdotH, Surface.CoatRoughness)
                           * ResolveSmithVisibility(NdotL, NdotV, Surface.CoatRoughness) * NdotL;
        float3 Absorption  = float3(1.0f);
        if (Surface.CoatingThickness > 0.0f)
        {
            float PathLength = (1.0f / max(0.001f, NdotV)) + (1.0f / max(0.001f, NdotL));
            Absorption       = exp(-Surface.Absorption * (Surface.CoatingThickness * PathLength));
        }
        Layer = Layer * (1.0f - CoatFresnel) * Absorption + float3(Coat);
    }
    return Layer;
}
