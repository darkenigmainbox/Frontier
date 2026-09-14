//============================================================================================================================================
// Project-Zero/Proof/ProofCelestial.cpp — the flare and the clouds ARE the reference's, exercised end to end.
//
//    This is not a re-implementation to compare against (that would prove nothing — two copies of one idea
//    agree by construction). It drives the SHIPPING code — `CelestialIntegrator::AddLensFlare`,
//    `SampleSkyRadiance`, `ResolveDisplay` — through their real call paths and asserts the reference's own
//    laws, read off `Reference/celestial-fs.glsl` and quoted below:
//
//      A. THE FLARE. Ghost `i` peaks at `p = s*k`, `k = -1.35+i*0.42` (glsl `lensFlare`); the halo is a ring
//         of radius `uHalo` about `s*0.25`; only the Anamorphic variety carries the 2.2× horizontal streak;
//         only Cinematic/Starburst carry ghosts; only Cinematic/Halo carry the ring. Each law is sampled at
//         a point where every OTHER term is provably ~0, plus a control point where all terms are ~0.
//      B. THE CLOUDS. The volumetric layer (`cloudMarch`) and the local volume (`marchLocal`) must change
//         the sky frame structurally (mean abs diff vs. clouds-off) and add local texture (edges up).
//      C. THE HUE KERNEL. `hue(0)=red`, `hue(0.5)=cyan`, exactly — the chromatic ring's anchor points.
//
//    It also writes viewable frames: one per flare variety, and clouds-on / clouds-off sky pairs both
//    sunward (backlit clouds + flare) and anti-sunward (sunlit tops).
//    Build: `make -f Makefile.standalone proof` — run: `make -f Makefile.standalone proof-run`.
//============================================================================================================================================

#include "../Source/CelestialIntegrator.h"

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <string>
#include <thread>
#include <tuple>
#include <vector>

namespace {

using Frontier::Vector3;
using Frontier::ProjectZero::CelestialCriteria;
using Frontier::ProjectZero::CelestialFrame;
using Frontier::ProjectZero::CelestialIntegrator;
using Frontier::ProjectZero::ObserverFrame;
using Frontier::ProjectZero::Cross;
using Frontier::ProjectZero::Dot;
using Frontier::ProjectZero::LuminanceOf;

int Failures = 0;

void Check(bool Condition, const char* Label, float Got = 0.0f, float Want = 0.0f)
{
    if (Condition)
    {
        std::printf("[PASS] %s (got %.4f, want %.4f)\n", Label, Got, Want);
    }
    else
    {
        std::printf("[FAIL] %s (got %.4f, want %.4f)\n", Label, Got, Want);
        ++Failures;
    }
}

bool WritePpm(const std::string& Path, uint32_t W, uint32_t H, const std::vector<Vector3>& Pixels)
{
    std::ofstream Out(Path, std::ios::binary);
    if (!Out.is_open())
    {
        return false;
    }
    Out << "P6\n" << W << " " << H << "\n255\n";
    for (const Vector3& c : Pixels)
    {
        const auto Q = [](float v) -> char
        {
            return static_cast<char>(std::clamp(v * 255.0f, 0.0f, 255.0f));
        };
        Out.put(Q(c.x));
        Out.put(Q(c.y));
        Out.put(Q(c.z));
    }
    return true;
}

//----------------------------------------------------------------------------------------------------------------
// A camera tilted off the sun by fixed tangent offsets, so the sun lands off-centre and the ghosts spread.
// Basis handedness mirrors the reference panel: Right = Forward × Up.
//----------------------------------------------------------------------------------------------------------------
ObserverFrame ObserverTiltedFromSun(const Vector3& SunDirection, float TiltRight, float TiltUp, float TangentHalf,
                                    float Aspect)
{
    const Vector3 wUp = std::abs(SunDirection.y) > 0.9f ? Vector3{ 1.0f, 0.0f, 0.0f }
                                                        : Vector3{ 0.0f, 1.0f, 0.0f };
    const Vector3 R0 = Cross(SunDirection, wUp).Normalized();
    const Vector3 U0 = Cross(SunDirection, R0).Normalized();
    const Vector3 Fwd = (SunDirection - R0 * TiltRight - U0 * TiltUp).Normalized();
    const Vector3 R = Cross(Fwd, U0).Normalized();
    const Vector3 U = Cross(R, Fwd);

    ObserverFrame Obs{};
    Obs.Position    = Vector3{ 0.0f, 2.0f, 0.0f };
    Obs.Forward     = Fwd;
    Obs.Right       = R;
    Obs.Upward      = U;
    Obs.TangentHalf = TangentHalf;
    Obs.AspectRatio = Aspect;
    Obs.Height      = 2.0f;
    return Obs;
}

} // namespace

int main()
{
    std::printf("=== ProofCelestial: flare + clouds exactness ===\n");

    //------------------------------------------------------------------------------------------------------------
    // A. THE FLARE — through AddLensFlare (the reference main()'s call site), flare-only on black.
    //------------------------------------------------------------------------------------------------------------
    CelestialCriteria FlareCriteria{};
    FlareCriteria.Sun.LocalHours = 9.0f;                            // morning sun, well clear of the horizon gate
    CelestialIntegrator FlareSky(FlareCriteria);
    FlareSky.SolveFrame(0.0f);
    const CelestialFrame& Frame = FlareSky.QueryFrame();
    const Vector3 S = Frame.SunDirection;

    constexpr float kTanH = 0.72654253f;                            // tan(36°): the panel's default 72° FOV
    constexpr float kAspect = 16.0f / 9.0f;
    const ObserverFrame Obs = ObserverTiltedFromSun(S, 0.35f, 0.22f, kTanH, kAspect);

    Check(std::abs(Dot(Obs.Right, Obs.Forward)) < 1e-5f, "A0 camera basis orthonormal (R.F)", Dot(Obs.Right, Obs.Forward), 0.0f);
    Check(std::abs(Dot(Obs.Upward, Obs.Forward)) < 1e-5f, "A0 camera basis orthonormal (U.F)", Dot(Obs.Upward, Obs.Forward), 0.0f);

    const float cx = Dot(S, Obs.Right);
    const float cy = Dot(S, Obs.Upward);
    const float cz = Dot(S, Obs.Forward);
    Check(cz > 0.02f, "A0 sun in front (cz>.02)", cz, 0.02f);
    const float su = cx / cz / kTanH;                              // the reference JS's sunUV, recomputed
    const float sv = cy / cz / kTanH;
    std::printf("      sun NDC (%.3f, %.3f), elev %.2f deg\n", su, sv, Frame.SunElevationDeg);
    Check(su > -0.7f && su < -0.3f, "A0 sun off-centre left", su, -0.49f);
    Check(sv > 0.15f && sv < 0.45f, "A0 sun off-centre up", sv, 0.29f);
    Check(Frame.SunElevationDeg + 0.5f > 0.0f, "A0 elevation gate open", Frame.SunElevationDeg + 0.5f, 0.0f);

    const Vector3 Black{ 0.0f, 0.0f, 0.0f };
    const float SunLen = std::sqrt(su * su + sv * sv);
    const float perpX = -sv / SunLen;                              // 2D perpendicular to the sun axis
    const float perpY = su / SunLen;

    auto FlareOnly = [&](float u, float v) -> Vector3
    {
        return FlareSky.AddLensFlare(Black, u, v, Obs);            // input black ⇒ output IS the flare term
    };

    // A1. Ghost 2 peaks at p = s*(-1.35+2*0.42) = s*(-0.51). At that point the halo ring (centre s*0.25,
    //     radius 0.55), the streak (|Δv|≈0.44 ⇒ exp(-42)≈0) and the burst are all ~0; the ghost must dominate,
    //     and red must lead (hue(fract(2*.23+.5)) is red-heavy).
    constexpr float k2 = -1.35f + 2.0f * 0.42f;
    FlareSky.MutableCriteria().Post.FlareVariety = 0.0f;           // Cinematic: ghosts on
    const Vector3 Ghost2 = FlareOnly(su * k2, sv * k2);
    Check(Ghost2.x > 0.08f, "A1 ghost-2 red peak (cinematic)", Ghost2.x, 0.08f);
    Check(Ghost2.x > Ghost2.z, "A1 ghost-2 red leads blue (hue law)", Ghost2.x - Ghost2.z, 0.0f);

    // A2. Control point 1.2 off the sun axis: ghosts (nearest disc 1.2 from its centre, radius ≤0.105),
    //     halo (|1.27-0.55|≫0.045) and streak (exp(-98)≈0) are all ~0 there. What remains is the reference's
    //     own long tail — the starburst spikes (exp(-1.2*3.5)*0.35 ≈ 0.005 at a lobe) plus the ambient
    //     exp(-1.2*1.6)*0.04 ≈ 0.006 — legitimately ~0.01 after the ×1.98 output scale. So the control must be
    //     dark in absolute terms AND an order of magnitude below the ghost peak.
    const Vector3 Control = FlareOnly(su + perpX * 1.2f, sv + perpY * 1.2f);
    Check(LuminanceOf(Control) < 0.03f, "A2 control point dark (absolute)", LuminanceOf(Control), 0.0f);
    Check(LuminanceOf(Control) < LuminanceOf(Ghost2) * 0.1f, "A2 control ≪ ghost peak (relative)",
          LuminanceOf(Control), LuminanceOf(Ghost2) * 0.1f);

    // A3. Halo ring: the point s*0.25 + perp*0.55 sits exactly on the uHalo=0.55 ring, 0.55 off the ghost axis
    //     (no ghost), with |Δv|≈0.26 off the streak (streak ~0). Cinematic must light it; Anamorphic (ring
    //     weight 0) must not.
    const float qx = su * 0.25f + perpX * 0.55f;
    const float qy = sv * 0.25f + perpY * 0.55f;
    const Vector3 RingCine = FlareOnly(qx, qy);
    Check(RingCine.x > 0.08f, "A3 halo ring lit (cinematic)", RingCine.x, 0.08f);
    FlareSky.MutableCriteria().Post.FlareVariety = 1.0f;           // Anamorphic: ring off, streak 2.2×
    const Vector3 RingAna = FlareOnly(qx, qy);
    Check(RingAna.x < 0.05f, "A3 halo ring dark (anamorphic)", RingAna.x, 0.0f);

    // A4. Streak: s+(0.5,0) lies on the horizontal band, 0.25 off the ghost axis (no ghost), 0.295 off the
    //     halo ring (no ring). Anamorphic must blaze; and ghosts must be gone there (A5).
    const Vector3 StreakAna = FlareOnly(su + 0.5f, sv);
    Check(StreakAna.x > 0.30f, "A4 streak blazes (anamorphic)", StreakAna.x, 0.30f);
    const Vector3 Ghost2Ana = FlareOnly(su * k2, sv * k2);
    Check(Ghost2Ana.x < 0.06f, "A5 ghosts gone (anamorphic)", Ghost2Ana.x, 0.0f);

    // A6. Starburst carries ghosts at full weight but only half the ring; Halo carries the ring, no ghosts.
    FlareSky.MutableCriteria().Post.FlareVariety = 2.0f;
    const Vector3 Ghost2Burst = FlareOnly(su * k2, sv * k2);
    Check(Ghost2Burst.x > 0.08f, "A6 ghosts on (starburst)", Ghost2Burst.x, 0.08f);
    FlareSky.MutableCriteria().Post.FlareVariety = 3.0f;
    const Vector3 Ghost2Halo = FlareOnly(su * k2, sv * k2);
    Check(Ghost2Halo.x < 0.06f, "A6 ghosts off (halo)", Ghost2Halo.x, 0.0f);
    const Vector3 RingHalo = FlareOnly(qx, qy);
    Check(RingHalo.x > 0.08f, "A6 ring on (halo)", RingHalo.x, 0.08f);

    // A7. One frame per variety, flare-only on black through the display chain — the viewable proof.
    constexpr uint32_t FW = 480u, FH = 270u;
    const char* VarietyNames[4] = { "cinematic", "anamorphic", "starburst", "halo" };
    for (uint32_t Variety = 0u; Variety < 4u; ++Variety)
    {
        FlareSky.MutableCriteria().Post.FlareVariety = static_cast<float>(Variety);
        std::vector<Vector3> Pixels(static_cast<size_t>(FW) * FH);
        for (uint32_t y = 0u; y < FH; ++y)
        {
            for (uint32_t x = 0u; x < FW; ++x)
            {
                const float u = (static_cast<float>(x) + 0.5f) / static_cast<float>(FW);
                const float v = (static_cast<float>(y) + 0.5f) / static_cast<float>(FH);
                const float ndcU = (2.0f * u - 1.0f) * kAspect;    // aspect NDC: the shader's `uv`
                const float ndcV = 1.0f - 2.0f * v;
                Vector3 Radiance = FlareSky.AddLensFlare(Black, ndcU, ndcV, Obs);
                // Height-unit U into ResolveDisplay, exactly as CelestialStage::ExportPpmImage does —
                // that is what the reference's aspect-corrected vignette radius reduces to.
                Pixels[static_cast<size_t>(y) * FW + x] =
                    FlareSky.ResolveDisplay(Radiance, 2.0f * u - 1.0f, 1.0f - 2.0f * v, x, y);
            }
        }
        char Path[128];
        std::snprintf(Path, sizeof(Path), "Proof/proof_flare_%s.ppm", VarietyNames[Variety]);
        Check(WritePpm(Path, FW, FH, Pixels), "A7 wrote frame", static_cast<float>(Variety), 0.0f);
        std::printf("      wrote %s\n", Path);
    }

    //------------------------------------------------------------------------------------------------------------
    // B. THE CLOUDS — the sky toward the sun, clouds on vs. clouds off, through the real sky path.
    //------------------------------------------------------------------------------------------------------------
    constexpr uint32_t SW = 288u, SH = 180u;
    constexpr float kSunTanH = 0.57735027f;                        // tan(30°)

    // Framing 0 looks at the sun (backlit clouds + the flare over them); framing 1 looks 30° up away from
    // the sun's azimuth (sunlit cloud tops over darker blue). Both go through the identical sky path.
    auto RenderSky = [&](bool CloudsOn, int Framing) -> std::vector<Vector3>
    {
        CelestialCriteria SkyCriteria{};
        SkyCriteria.Sun.LocalHours = 12.0f;                        // noon: the stable lit case
        SkyCriteria.VolumetricCloud.Coverage = 0.52f;              // the shipped frame's coverage
        if (!CloudsOn)
        {
            SkyCriteria.VolumetricCloud.Visible = false;
            SkyCriteria.LocalCloud.Visible = false;                // CloudLayer already off, as in the reference
        }
        CelestialIntegrator Sky(SkyCriteria);
        Sky.SolveFrame(0.0f);
        const Vector3 Sun = Sky.QueryFrame().SunDirection;

        ObserverFrame SkyObs{};
        SkyObs.Position = Vector3{ 0.0f, 2.0f, 0.0f };
        const Vector3 wUp{ 0.0f, 1.0f, 0.0f };
        if (Framing == 0)
        {
            SkyObs.Forward = Sun;                                  // look straight at the sun
            const Vector3 wUpTilted = std::abs(Sun.y) > 0.9f ? Vector3{ 1.0f, 0.0f, 0.0f } : wUp;
            SkyObs.Right = Cross(Sun, wUpTilted).Normalized();
            SkyObs.Upward = Cross(Sun, SkyObs.Right).Normalized();
        }
        else
        {
            Vector3 Away = Vector3{ Sun.x, 0.0f, Sun.z } * -1.0f;  // anti-solar horizontal
            if (Away.Length() < 0.1f)
            {
                Away = Vector3{ 1.0f, 0.0f, 0.0f };
            }
            SkyObs.Forward = (Away.Normalized() * 0.85f + wUp * 0.5f).Normalized(); // ~30° up, away from sun
            SkyObs.Right = Cross(SkyObs.Forward, wUp).Normalized();
            SkyObs.Upward = Cross(SkyObs.Right, SkyObs.Forward);
        }
        SkyObs.TangentHalf = kSunTanH;
        SkyObs.AspectRatio = static_cast<float>(SW) / static_cast<float>(SH);
        SkyObs.Height = 2.0f;
        const float PixelAngle = 2.0f * kSunTanH / static_cast<float>(SH); // the reference's `pixAng`

        std::vector<Vector3> Pixels(static_cast<size_t>(SW) * SH);
        const uint32_t Threads = std::max(1u, std::thread::hardware_concurrency());
        std::vector<std::thread> Workers;
        Workers.reserve(Threads);
        for (uint32_t w = 0u; w < Threads; ++w)
        {
            Workers.emplace_back([&, w]()
            {
                for (uint32_t y = w; y < SH; y += Threads)
                {
                    for (uint32_t x = 0u; x < SW; ++x)
                    {
                        const float u = (static_cast<float>(x) + 0.5f) / static_cast<float>(SW);
                        const float v = (static_cast<float>(y) + 0.5f) / static_cast<float>(SH);
                        const float ndcU = (2.0f * u - 1.0f) * SkyObs.AspectRatio;
                        const float ndcV = 1.0f - 2.0f * v;
                        // The reference's own ray: dir = fwd + right*uv.x*tanH + up*uv.y*tanH.
                        const Vector3 Dir =
                            (SkyObs.Forward + SkyObs.Right * (ndcU * kSunTanH)
                                             + SkyObs.Upward * (ndcV * kSunTanH)).Normalized();
                        Vector3 Radiance = Sky.SampleSkyRadiance(Dir, SkyObs, PixelAngle, x, y);
                        Radiance = Sky.AddLensFlare(Radiance, ndcU, ndcV, SkyObs);
                        Pixels[static_cast<size_t>(y) * SW + x] =
                            Sky.ResolveDisplay(Radiance, 2.0f * u - 1.0f, 1.0f - 2.0f * v, x, y);
                    }
                }
            });
        }
        for (std::thread& Worker : Workers)
        {
            Worker.join();
        }
        return Pixels;
    };

    auto Stats = [&](const std::vector<Vector3>& A, const std::vector<Vector3>& B, const char* Tag)
    {
        double MeanA = 0.0, MeanB = 0.0, Diff = 0.0;
        for (size_t i = 0; i < A.size(); ++i)
        {
            MeanA += LuminanceOf(A[i]);
            MeanB += LuminanceOf(B[i]);
            Diff += std::abs(LuminanceOf(A[i]) - LuminanceOf(B[i]));
        }
        MeanA /= static_cast<double>(A.size());
        MeanB /= static_cast<double>(B.size());
        Diff /= static_cast<double>(A.size());
        double VarA = 0.0, VarB = 0.0;
        for (size_t i = 0; i < A.size(); ++i)
        {
            VarA += (LuminanceOf(A[i]) - MeanA) * (LuminanceOf(A[i]) - MeanA);
            VarB += (LuminanceOf(B[i]) - MeanB) * (LuminanceOf(B[i]) - MeanB);
        }
        VarA /= static_cast<double>(A.size());
        VarB /= static_cast<double>(B.size());
        std::printf("      %s: cloudy mean %.4f var %.5f | clear mean %.4f var %.5f | mean|diff| %.4f\n",
                    Tag, MeanA, VarA, MeanB, VarB, Diff);
        return std::tuple<double, double, double, double, double>{ MeanA, MeanB, VarA, VarB, Diff };
    };

    // Sunward pair: backlit clouds over the blazing disc — structural change only. (Clouds covering the sun
    // legitimately LOWER the mean and the variance here, so no directional assertion belongs to this pair.)
    std::printf("      rendering sunward pair...\n");
    const std::vector<Vector3> TowardCloudy = RenderSky(true, 0);
    const std::vector<Vector3> TowardClear = RenderSky(false, 0);
    const auto [TowardMean, TowardClearMean, TowardVar, TowardClearVar, TowardDiff] =
        Stats(TowardCloudy, TowardClear, "sunward");
    (void)TowardMean;
    (void)TowardClearMean;
    (void)TowardVar;
    (void)TowardClearVar;
    Check(TowardDiff > 0.03, "B1 backlit clouds change the sunward frame", static_cast<float>(TowardDiff),
          0.03f);
    Check(WritePpm("Proof/proof_sky_sunward_clouds.ppm", SW, SH, TowardCloudy), "B2 wrote sunward pair", 0.0f,
          0.0f);
    Check(WritePpm("Proof/proof_sky_sunward_clear.ppm", SW, SH, TowardClear), "B2 wrote sunward pair", 0.0f,
          0.0f);

    // Anti-sunward pair: sunlit tops over darker blue. The sun is behind the camera here, so the flare
    // is correctly absent from both runs and cannot skew the stats.
    //
    // NOTE on the texture metric, learned the hard way: GLOBAL variance is the wrong measure. The clear
    // frame is a full-range vertical gradient (deep zenith blue → bright horizon haze), which has HIGH
    // global variance while being perfectly smooth; the cloudy frame churns in the mid-range with lower
    // global spread. Texture is LOCAL contrast, so that is what is measured: the mean 4-neighbourhood
    // absolute luminance step — every billow edge and silver lining contributes, smooth gradients do not.
    auto LocalContrast = [&](const std::vector<Vector3>& P) -> double
    {
        double Acc = 0.0;
        size_t N = 0u;
        for (uint32_t y = 0u; y < SH; ++y)
        {
            for (uint32_t x = 0u; x < SW; ++x)
            {
                const size_t i = static_cast<size_t>(y) * SW + x;
                if (x + 1u < SW)
                {
                    Acc += std::abs(LuminanceOf(P[i]) - LuminanceOf(P[i + 1u]));
                    ++N;
                }
                if (y + 1u < SH)
                {
                    Acc += std::abs(LuminanceOf(P[i]) - LuminanceOf(P[i + SW]));
                    ++N;
                }
            }
        }
        return Acc / static_cast<double>(N);
    };
    std::printf("      rendering anti-sunward pair...\n");
    const std::vector<Vector3> AwayCloudy = RenderSky(true, 1);
    const std::vector<Vector3> AwayClear = RenderSky(false, 1);
    const auto [AwayMean, AwayClearMean, AwayVar, AwayClearVar, AwayDiff] =
        Stats(AwayCloudy, AwayClear, "anti-sunward");
    (void)AwayVar;
    (void)AwayClearVar;
    // The grain is deterministic per pixel, hence IDENTICAL in both runs: the local-contrast difference
    // isolates the cloud edges exactly (a ratio would be compressed by the shared grain floor, and an
    // absolute bright-fraction is meaningless under the noon auto-exposure, which caps both frames at
    // ~0.48 with the clear horizon haze the brightest thing in either).
    const double AwayLocal = LocalContrast(AwayCloudy);
    const double AwayClearLocal = LocalContrast(AwayClear);
    std::printf("      anti-sunward: cloudy local %.5f | clear local %.5f\n", AwayLocal, AwayClearLocal);
    Check(AwayDiff > 0.03, "B1 sunlit clouds change the anti-sunward frame", static_cast<float>(AwayDiff),
          0.03f);
    Check(AwayMean > AwayClearMean, "B1 clouds brighten the sky off-sun", static_cast<float>(AwayMean),
          static_cast<float>(AwayClearMean));
    Check(AwayLocal - AwayClearLocal > 0.001, "B1 clouds add local texture (edges above grain floor)",
          static_cast<float>(AwayLocal - AwayClearLocal), 0.001f);
    Check(WritePpm("Proof/proof_sky_awaysun_clouds.ppm", SW, SH, AwayCloudy), "B2 wrote anti-sunward pair",
          0.0f, 0.0f);
    Check(WritePpm("Proof/proof_sky_awaysun_clear.ppm", SW, SH, AwayClear), "B2 wrote anti-sunward pair", 0.0f,
          0.0f);

    //------------------------------------------------------------------------------------------------------------
    // C. THE HUE KERNEL — anchor points of the flare's chromatic ring.
    //------------------------------------------------------------------------------------------------------------
    const Vector3 HueRed = CelestialIntegrator::KernelHue(0.0f);
    Check(std::abs(HueRed.x - 1.0f) < 1e-5f && std::abs(HueRed.y) < 1e-5f && std::abs(HueRed.z) < 1e-5f,
          "C1 hue(0)=red", HueRed.x + HueRed.y + HueRed.z, 1.0f);
    const Vector3 HueCyan = CelestialIntegrator::KernelHue(0.5f);
    Check(std::abs(HueCyan.x) < 1e-5f && std::abs(HueCyan.y - 1.0f) < 1e-5f && std::abs(HueCyan.z - 1.0f) < 1e-5f,
          "C1 hue(0.5)=cyan", HueCyan.x + HueCyan.y + HueCyan.z, 2.0f);

    if (Failures == 0)
    {
        std::printf("=== ProofCelestial: ALL CHECKS PASSED ===\n");
        return 0;
    }
    std::printf("=== ProofCelestial: %d CHECK(S) FAILED ===\n", Failures);
    return 1;
}
