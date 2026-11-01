/*==========================================================================================================================================
                                                     EVEREST COURSE SCENE
==========================================================================================================================================*/

#include "EverestCourseScene.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <numbers>

namespace Everest
{

using namespace Frontier;

namespace
{

constexpr float Degrees = std::numbers::pi_v<float> / 180.0f;

[[nodiscard]] std::array<float, 3> ComputeFacetNormal(const std::array<float, 3>& A,
                                                      const std::array<float, 3>& B,
                                                      const std::array<float, 3>& C) noexcept
{
    const float Ux = B[0] - A[0];
    const float Uy = B[1] - A[1];
    const float Uz = B[2] - A[2];
    const float Vx = C[0] - A[0];
    const float Vy = C[1] - A[1];
    const float Vz = C[2] - A[2];
    const float Nx = Uy * Vz - Uz * Vy;
    const float Ny = Uz * Vx - Ux * Vz;
    const float Nz = Ux * Vy - Uy * Vx;
    const float L  = std::sqrt(Nx * Nx + Ny * Ny + Nz * Nz);
    if (L > 1.0e-7f)
    {
        return {Nx / L, Ny / L, Nz / L};
    }
    return {0.0f, 0.0f, 1.0f};
}

void AppendQuad(std::vector<TriangleFacetRecord>& Out,
                const std::array<float, 3>&       A,
                const std::array<float, 3>&       B,
                const std::array<float, 3>&       C,
                const std::array<float, 3>&       D,
                CourseMaterial                    Family)
{
    const std::array<float, 3> N0 = ComputeFacetNormal(A, B, C);
    const std::array<float, 3> N1 = ComputeFacetNormal(A, C, D);
    Out.push_back({{A, B, C}, {N0, N0, N0}, true, Family});
    Out.push_back({{A, C, D}, {N1, N1, N1}, true, Family});
}

void AppendBox(std::vector<TriangleFacetRecord>& Out,
               const std::array<float, 3>&       Min,
               const std::array<float, 3>&       Max,
               CourseMaterial                    Family)
{
    const float X0 = Min[0], Y0 = Min[1], Z0 = Min[2];
    const float X1 = Max[0], Y1 = Max[1], Z1 = Max[2];

    AppendQuad(Out, {X0, Y0, Z1}, {X1, Y0, Z1}, {X1, Y1, Z1}, {X0, Y1, Z1}, Family); // +Z top
    AppendQuad(Out, {X0, Y1, Z0}, {X1, Y1, Z0}, {X1, Y0, Z0}, {X0, Y0, Z0}, Family); // -Z bottom
    AppendQuad(Out, {X1, Y0, Z0}, {X1, Y1, Z0}, {X1, Y1, Z1}, {X1, Y0, Z1}, Family); // +X front
    AppendQuad(Out, {X0, Y1, Z0}, {X0, Y0, Z0}, {X0, Y0, Z1}, {X0, Y1, Z1}, Family); // -X back
    AppendQuad(Out, {X0, Y1, Z0}, {X1, Y1, Z0}, {X1, Y1, Z1}, {X0, Y1, Z1}, Family); // +Y left
    AppendQuad(Out, {X1, Y0, Z0}, {X0, Y0, Z0}, {X0, Y0, Z1}, {X1, Y0, Z1}, Family); // -Y right
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitBoxFacets(float          Length,
                                                             float          Width,
                                                             float          Height,
                                                             CourseMaterial Family,
                                                             float          BaseZ = 0.0f)
{
    std::vector<TriangleFacetRecord> Out;
    Out.reserve(12u);
    const float Hx = 0.5f * Length;
    const float Hy = 0.5f * Width;
    AppendBox(Out, {-Hx, -Hy, BaseZ}, {Hx, Hy, BaseZ + Height}, Family);
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitContainerFacets(float          Length,
                                                                   float          Width,
                                                                   float          Height,
                                                                   CourseMaterial Family)
{
    std::vector<TriangleFacetRecord> Out = EmitBoxFacets(Length, Width, Height, Family, 0.0f);
    AppendBox(Out, {-0.5f * Length - 0.04f, -0.5f * Width - 0.04f, 0.0f}, {-0.5f * Length + 0.14f, 0.5f * Width + 0.04f, Height}, CourseMaterial::SteelDark);
    AppendBox(Out, { 0.5f * Length - 0.14f, -0.5f * Width - 0.04f, 0.0f}, { 0.5f * Length + 0.04f, 0.5f * Width + 0.04f, Height}, CourseMaterial::SteelDark);
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitHangarFacets()
{
    std::vector<TriangleFacetRecord> Out;
    const float Hx = 18.0f, Hy = 12.0f, WallH = 9.0f, Thick = 0.6f;
    AppendBox(Out, {-Hx, -Hy, 0.0f}, {-Hx + Thick, Hy, WallH}, CourseMaterial::WallCrimson);
    AppendBox(Out, {-Hx,  Hy - Thick, 0.0f}, {Hx, Hy, WallH}, CourseMaterial::Cladding);
    AppendBox(Out, {-Hx, -Hy, 0.0f}, {Hx, -Hy + Thick, WallH}, CourseMaterial::Cladding);
    AppendBox(Out, {-Hx, -Hy, WallH}, {Hx, Hy, WallH + 0.8f}, CourseMaterial::Cladding);
    for (int I = -2; I <= 2; ++I)
    {
        const float X = static_cast<float>(I) * 7.0f;
        AppendBox(Out, {X - 0.25f, -Hy + Thick, WallH - 0.7f}, {X + 0.25f, Hy - Thick, WallH}, CourseMaterial::SteelDark);
    }
    AppendBox(Out, {-Hx + 1.2f, -3.5f, WallH - 0.85f}, {Hx - 2.0f, -2.7f, WallH - 0.72f}, CourseMaterial::LampWarm);
    AppendBox(Out, {-Hx + 1.2f,  2.7f, WallH - 0.85f}, {Hx - 2.0f,  3.5f, WallH - 0.72f}, CourseMaterial::LampWarm);
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitTunnelFacets()
{
    std::vector<TriangleFacetRecord> Out;
    const float Hx = 16.0f, Hy = 7.0f, WallH = 5.6f, Thick = 0.9f;
    AppendBox(Out, {-Hx, -Hy - Thick, 0.0f}, {Hx, -Hy, WallH}, CourseMaterial::TunnelConcrete);
    AppendBox(Out, {-Hx,  Hy,         0.0f}, {Hx,  Hy + Thick, WallH}, CourseMaterial::TunnelConcrete);
    AppendBox(Out, {-Hx, -Hy - Thick, WallH}, {Hx, Hy + Thick, WallH + 1.1f}, CourseMaterial::TunnelConcrete);
    for (int I = -2; I <= 2; ++I)
    {
        const float X = static_cast<float>(I) * 6.0f;
        AppendBox(Out, {X - 0.9f, -1.8f, WallH - 0.14f}, {X + 0.9f, 1.8f, WallH - 0.02f}, CourseMaterial::LampCool);
    }
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitGrandstandFacets()
{
    std::vector<TriangleFacetRecord> Out;
    const float Hx = 15.0f;
    for (int Step = 0; Step < 5; ++Step)
    {
        const float Y0 = -4.5f + static_cast<float>(Step) * 1.8f;
        const float Y1 = Y0 + 1.8f;
        const float Z1 = static_cast<float>(Step + 1) * 1.1f;
        AppendBox(Out, {-Hx, Y0, 0.0f}, {Hx, Y1, Z1}, CourseMaterial::ApronConcrete);
        AppendBox(Out, {-Hx + 0.4f, Y0 + 0.25f, Z1}, {Hx - 0.4f, Y0 + 1.05f, Z1 + 0.35f}, CourseMaterial::SeatBlue);
    }
    AppendBox(Out, {-Hx, 4.1f, 0.0f}, {Hx, 4.8f, 7.2f}, CourseMaterial::WallCobalt);
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitTrafficHeadFacets()
{
    std::vector<TriangleFacetRecord> Out = EmitBoxFacets(0.32f, 0.44f, 1.10f, CourseMaterial::SteelDark, 0.0f);
    AppendBox(Out, {-0.18f, -0.14f, 0.76f}, {0.18f, 0.14f, 0.98f}, CourseMaterial::GateLampRed);
    AppendBox(Out, {-0.18f, -0.14f, 0.44f}, {0.18f, 0.14f, 0.66f}, CourseMaterial::StressAmber);
    AppendBox(Out, {-0.18f, -0.14f, 0.12f}, {0.18f, 0.14f, 0.34f}, CourseMaterial::GateLamp);
    return Out;
}

[[nodiscard]] std::vector<TriangleFacetRecord> EmitGroundFacets()
{
    std::vector<TriangleFacetRecord> Out;
    AppendQuad(Out, {-220.0f, -220.0f, -0.04f}, {220.0f, -220.0f, -0.04f}, {220.0f, 220.0f, -0.04f}, {-220.0f, 220.0f, -0.04f}, CourseMaterial::Grass);
    AppendQuad(Out, {-75.0f, -65.0f, -0.01f}, {75.0f, -65.0f, -0.01f}, {75.0f, 65.0f, -0.01f}, {-75.0f, 65.0f, -0.01f}, CourseMaterial::ApronConcrete);
    AppendQuad(Out, {-58.0f, -48.0f, 0.0f}, {58.0f, -48.0f, 0.0f}, {58.0f, 48.0f, 0.0f}, {-58.0f, 48.0f, 0.0f}, CourseMaterial::Asphalt);
    AppendQuad(Out, {-14.0f, -11.5f, 0.004f}, {14.0f, -11.5f, 0.004f}, {14.0f, 11.5f, 0.004f}, {-14.0f, 11.5f, 0.004f}, CourseMaterial::AsphaltPatch);

    AppendQuad(Out, {-14.2f, -11.8f, 0.008f}, {14.2f, -11.8f, 0.008f}, {14.2f, -11.5f, 0.008f}, {-14.2f, -11.5f, 0.008f}, CourseMaterial::PaintWhite);
    AppendQuad(Out, {-14.2f,  11.5f, 0.008f}, {14.2f,  11.5f, 0.008f}, {14.2f,  11.8f, 0.008f}, {-14.2f,  11.8f, 0.008f}, CourseMaterial::PaintWhite);
    for (int Bay = -2; Bay <= 2; ++Bay)
    {
        const float YCenter = static_cast<float>(Bay) * 3.8f;
        AppendQuad(Out, {-3.4f, YCenter - 1.75f, 0.009f}, {3.8f, YCenter - 1.75f, 0.009f}, {3.8f, YCenter - 1.62f, 0.009f}, {-3.4f, YCenter - 1.62f, 0.009f}, CourseMaterial::PaintYellow);
        AppendQuad(Out, {-3.4f, YCenter + 1.62f, 0.009f}, {3.8f, YCenter + 1.62f, 0.009f}, {3.8f, YCenter + 1.75f, 0.009f}, {-3.4f, YCenter + 1.75f, 0.009f}, CourseMaterial::PaintYellow);
    }

    for (int Segment = 0; Segment < 16; ++Segment)
    {
        const float X0 = -24.0f + static_cast<float>(Segment) * 3.0f;
        const float X1 = X0 + 3.0f;
        const CourseMaterial Mat = (Segment % 2 == 0) ? CourseMaterial::KerbRed : CourseMaterial::PaintWhite;
        AppendBox(Out, {X0, -13.2f, 0.0f}, {X1, -12.4f, 0.08f}, Mat);
        AppendBox(Out, {X0,  12.4f, 0.0f}, {X1,  13.2f, 0.08f}, Mat);
    }

    return Out;
}

constexpr float VehicleCoMHeight          = 0.53f;
constexpr float VehicleTyreRimRadius      = 0.34460f;
constexpr float VehicleAuthoredRimRadius  = 0.344818f;
constexpr float VehicleCoMAuthoredRebaseZ = 0.11285f;

constexpr std::array<std::array<float, 3>, 4> ControlVehicleAxleMounts = {{
    { 1.7274f,  1.0475f, 0.0914f - VehicleCoMAuthoredRebaseZ},
    { 1.7274f, -1.0475f, 0.0914f - VehicleCoMAuthoredRebaseZ},
    {-1.6686f,  1.0475f, 0.0914f - VehicleCoMAuthoredRebaseZ},
    {-1.6686f, -1.0475f, 0.0914f - VehicleCoMAuthoredRebaseZ}
}};

struct DecodedFacetStream
{
    uint32_t              VertexCount = 0u;
    uint32_t              FacetCount  = 0u;
    uint32_t              Flags       = 0u;
    std::vector<float>    Positions{};
    std::vector<uint32_t> Facets{};
    std::vector<uint32_t> Families{};
    std::vector<float>    CornerNormals{};
    bool                  Valid       = false;
};

[[nodiscard]] std::filesystem::path LocateGeometryArchive(std::string_view FileName)
{
    const std::array<std::filesystem::path, 6> Candidates = {{
        std::filesystem::path("EngineContent/GeometryArchives") / FileName,
        std::filesystem::path("Projects/Everest/Content/GeometryArchives") / FileName,
        std::filesystem::path("Content/GeometryArchives") / FileName,
        std::filesystem::path("../EngineContent/GeometryArchives") / FileName,
        std::filesystem::path("../../EngineContent/GeometryArchives") / FileName,
        std::filesystem::path("/home/user/Frontier/EngineContent/GeometryArchives") / FileName
    }};
    for (const auto& Path : Candidates)
    {
        std::error_code Ec;
        if (std::filesystem::exists(Path, Ec))
        {
            return Path;
        }
    }
    return Candidates[0];
}

[[nodiscard]] DecodedFacetStream DecodeFacetArchive(std::string_view FileName)
{
    DecodedFacetStream Out{};
    const auto         Path = LocateGeometryArchive(FileName);
    std::ifstream      File(Path, std::ios::binary);
    if (!File.is_open())
    {
        return Out;
    }

    char Magic[4]{};
    File.read(Magic, 4);
    if (std::memcmp(Magic, "FCT1", 4) != 0)
    {
        return Out;
    }

    uint32_t Header[3]{};
    File.read(reinterpret_cast<char*>(Header), sizeof(Header));
    Out.VertexCount = Header[0];
    Out.FacetCount  = Header[1];
    Out.Flags       = Header[2];

    float    Bounds[6]{};
    uint32_t Reserved[2]{};
    File.read(reinterpret_cast<char*>(Bounds), sizeof(Bounds));
    File.read(reinterpret_cast<char*>(Reserved), sizeof(Reserved));

    Out.Positions.resize(static_cast<size_t>(Out.VertexCount) * 3u);
    Out.Facets.resize(static_cast<size_t>(Out.FacetCount) * 3u);
    Out.Families.resize(static_cast<size_t>(Out.FacetCount));
    File.read(reinterpret_cast<char*>(Out.Positions.data()), static_cast<std::streamsize>(Out.Positions.size() * sizeof(float)));
    File.read(reinterpret_cast<char*>(Out.Facets.data()), static_cast<std::streamsize>(Out.Facets.size() * sizeof(uint32_t)));
    File.read(reinterpret_cast<char*>(Out.Families.data()), static_cast<std::streamsize>(Out.Families.size() * sizeof(uint32_t)));

    if ((Out.Flags & 1u) != 0u)
    {
        Out.CornerNormals.resize(static_cast<size_t>(Out.FacetCount) * 9u);
        File.read(reinterpret_cast<char*>(Out.CornerNormals.data()), static_cast<std::streamsize>(Out.CornerNormals.size() * sizeof(float)));
    }

    Out.Valid = File.good();
    return Out;
}

[[nodiscard]] CourseMaterial MapArchiveFamilyToCourseMaterial(uint32_t       ArchiveFamily,
                                                              CourseMaterial PaintFamily) noexcept
{
    switch (ArchiveFamily)
    {
        case 6u:  return PaintFamily;
        case 7u:  return CourseMaterial::Glass;
        case 8u:  return CourseMaterial::VehiclePlastic;
        case 9u:  return CourseMaterial::Tyre;
        case 10u: return CourseMaterial::Hub;
        case 11u: return CourseMaterial::Brake;
        case 12u: return CourseMaterial::VehicleTrim;
        case 13u: return CourseMaterial::Headlight;
        case 14u: return CourseMaterial::Taillight;
        case 15u: return CourseMaterial::VehicleDefault;
        default:  return CourseMaterial::BodyTrim;
    }
}

[[nodiscard]] std::vector<TriangleFacetRecord> ProjectControlVehicleBody(const DecodedFacetStream& BodyStream,
                                                                         CourseMaterial            PaintFamily)
{
    std::vector<TriangleFacetRecord> Facets;
    if (!BodyStream.Valid)
    {
        return EmitBoxFacets(4.4f, 1.9f, 1.2f, PaintFamily, -0.4f);
    }

    Facets.reserve(BodyStream.FacetCount + 24u);
    for (uint32_t F = 0u; F < BodyStream.FacetCount; ++F)
    {
        std::array<std::array<float, 3>, 3> Corners{};
        for (size_t C = 0u; C < 3u; ++C)
        {
            const uint32_t V = BodyStream.Facets[static_cast<size_t>(F) * 3u + C];
            Corners[C]       = {
                BodyStream.Positions[static_cast<size_t>(V) * 3u + 0u],
                BodyStream.Positions[static_cast<size_t>(V) * 3u + 1u],
                BodyStream.Positions[static_cast<size_t>(V) * 3u + 2u] - VehicleCoMAuthoredRebaseZ
            };
        }
        const std::array<float, 3> N      = ComputeFacetNormal(Corners[0], Corners[1], Corners[2]);
        CourseMaterial             Family = MapArchiveFamilyToCourseMaterial(BodyStream.Families[F], PaintFamily);
        if (BodyStream.Families[F] == 13u)
        {
            const float AbsAvgY = std::abs((Corners[0][1] + Corners[1][1] + Corners[2][1]) / 3.0f);
            if (AbsAvgY < 0.22f)
            {
                Family = PaintFamily;
            }
        }
        Facets.push_back({Corners, {N, N, N}, true, Family});
    }

    const auto CabinTub = EmitBoxFacets(1.85f, 1.42f, 0.42f, CourseMaterial::CabinCarpet, -0.18f);
    Facets.insert(Facets.end(), CabinTub.begin(), CabinTub.end());
    const auto Seats = EmitBoxFacets(0.62f, 1.28f, 0.56f, CourseMaterial::SeatFabric, 0.04f);
    Facets.insert(Facets.end(), Seats.begin(), Seats.end());

    return Facets;
}

[[nodiscard]] std::vector<TriangleFacetRecord> ProjectControlVehicleWheel(const DecodedFacetStream& TyreStream,
                                                                          const DecodedFacetStream& RimStream,
                                                                          bool                      Mirrored)
{
    std::vector<TriangleFacetRecord> Facets;
    if (!TyreStream.Valid || !RimStream.Valid)
    {
        return EmitBoxFacets(0.70f, 0.32f, 0.70f, CourseMaterial::Tyre, -0.35f);
    }

    Facets.reserve(TyreStream.FacetCount + RimStream.FacetCount);
    const float RimScale = VehicleTyreRimRadius / VehicleAuthoredRimRadius;

    const auto AppendStream = [&](const DecodedFacetStream& Stream, float Scale, bool FlatShaded)
    {
        for (uint32_t F = 0u; F < Stream.FacetCount; ++F)
        {
            std::array<std::array<float, 3>, 3> Corners{};
            std::array<std::array<float, 3>, 3> Normals{};
            const float Sign = Mirrored ? -1.0f : 1.0f;
            for (size_t C = 0u; C < 3u; ++C)
            {
                const uint32_t UseC = Mirrored ? (2u - C) : C;
                const uint32_t V    = Stream.Facets[static_cast<size_t>(F) * 3u + UseC];
                Corners[C] = {
                    Stream.Positions[static_cast<size_t>(V) * 3u + 0u] * Scale,
                    Stream.Positions[static_cast<size_t>(V) * 3u + 1u] * Scale * Sign,
                    Stream.Positions[static_cast<size_t>(V) * 3u + 2u] * Scale
                };
                if (!FlatShaded && !Stream.CornerNormals.empty())
                {
                    const size_t BaseN = (static_cast<size_t>(F) * 3u + UseC) * 3u;
                    Normals[C] = {
                        Stream.CornerNormals[BaseN + 0u],
                        Stream.CornerNormals[BaseN + 1u] * Sign,
                        Stream.CornerNormals[BaseN + 2u]
                    };
                }
            }
            if (FlatShaded || Stream.CornerNormals.empty())
            {
                const std::array<float, 3> N = ComputeFacetNormal(Corners[0], Corners[1], Corners[2]);
                Normals = {N, N, N};
            }
            const CourseMaterial Family = MapArchiveFamilyToCourseMaterial(Stream.Families[F], CourseMaterial::BodyCoat);
            Facets.push_back({Corners, Normals, !FlatShaded, Family});
        }
    };

    AppendStream(TyreStream, 1.0f, false);
    AppendStream(RimStream, RimScale, true);
    return Facets;
}

[[nodiscard]] FacetSetRecord MakeFacetSet(std::string                       Name,
                                          std::vector<TriangleFacetRecord>  Facets,
                                          float                             DistanceVoxel = 0.25f)
{
    FacetSetRecord Record{};
    Record.Name          = std::move(Name);
    Record.DistanceVoxel = DistanceVoxel;
    Record.LocalMinimum  = { 1.0e9f,  1.0e9f,  1.0e9f};
    Record.LocalMaximum  = {-1.0e9f, -1.0e9f, -1.0e9f};
    for (const auto& F : Facets)
    {
        for (const auto& Corner : F.Corners)
        {
            for (size_t Axis = 0u; Axis < 3u; ++Axis)
            {
                Record.LocalMinimum[Axis] = std::min(Record.LocalMinimum[Axis], Corner[Axis]);
                Record.LocalMaximum[Axis] = std::max(Record.LocalMaximum[Axis], Corner[Axis]);
            }
        }
    }
    Record.Facets = std::move(Facets);
    return Record;
}

} // namespace

EverestCourseScene ConstructEverestCourseScene()
{
    EverestCourseScene Course{};
    Course.Materials = ConstructDefaultMaterials();

    const DecodedFacetStream BodyStream = DecodeFacetArchive("ControlVehicleBody.facet");
    const DecodedFacetStream TyreStream = DecodeFacetArchive("ControlVehicleTyre.facet");
    const DecodedFacetStream RimStream  = DecodeFacetArchive("ControlVehicleRim.facet");

    enum ShapeSlot : uint32_t
    {
        SlotGround = 0u,
        SlotHangar,
        SlotTunnel,
        SlotGrandstand,
        SlotCanopy,
        SlotControlTower,
        SlotTowerCabin,
        SlotBridgeDeck,
        SlotBridgePier,
        SlotGantryBeam,
        SlotGantryPost,
        SlotGantryBoard,
        SlotContainerLong,
        SlotContainerShort,
        SlotBarrier,
        SlotTyreStack,
        SlotPole,
        SlotPoleHead,
        SlotTrafficPost,
        SlotTrafficHead,
        SlotVehicleBodyRed,
        SlotVehicleBodyGreen,
        SlotVehicleBodyYellow,
        SlotVehicleBodyBlue,
        SlotVehicleBodyOrange,
        SlotVehicleWheelLeft,
        SlotVehicleWheelRight
    };

    Course.Scene.FacetSets = {
        MakeFacetSet("Ground",               EmitGroundFacets(),                                                        0.50f),
        MakeFacetSet("Hangar",               EmitHangarFacets(),                                                        0.35f),
        MakeFacetSet("Tunnel",               EmitTunnelFacets(),                                                        0.35f),
        MakeFacetSet("Grandstand",           EmitGrandstandFacets(),                                                    0.35f),
        MakeFacetSet("Canopy",               EmitBoxFacets(31.0f, 11.0f, 0.5f, CourseMaterial::ContainerWhite),         0.30f),
        MakeFacetSet("ControlTower",         EmitBoxFacets(8.0f, 8.0f, 16.0f, CourseMaterial::Cladding),                0.35f),
        MakeFacetSet("TowerCabin",           EmitBoxFacets(10.0f, 10.0f, 4.0f, CourseMaterial::Glass),                  0.30f),
        MakeFacetSet("BridgeDeck",           EmitBoxFacets(10.0f, 36.0f, 1.2f, CourseMaterial::ApronConcrete),          0.35f),
        MakeFacetSet("BridgePier",           EmitBoxFacets(2.2f, 2.2f, 6.2f, CourseMaterial::TunnelConcrete),           0.25f),
        MakeFacetSet("GantryBeam",           EmitBoxFacets(0.8f, 22.0f, 0.8f, CourseMaterial::SteelDark),               0.25f),
        MakeFacetSet("GantryPost",           EmitBoxFacets(0.7f, 0.7f, 7.2f, CourseMaterial::SteelDark),                0.20f),
        MakeFacetSet("GantryBoard",          EmitBoxFacets(0.35f, 8.5f, 2.2f, CourseMaterial::SignBoard),               0.20f),
        MakeFacetSet("ContainerLong",        EmitContainerFacets(12.0f, 2.4f, 2.6f, CourseMaterial::ContainerOrange),   0.20f),
        MakeFacetSet("ContainerShort",       EmitContainerFacets(6.0f, 2.4f, 2.6f, CourseMaterial::ContainerBlue),      0.20f),
        MakeFacetSet("Barrier",              EmitBoxFacets(3.0f, 0.6f, 0.9f, CourseMaterial::BarrierConcrete),          0.12f),
        MakeFacetSet("TyreStack",            EmitBoxFacets(0.66f, 0.66f, 1.2f, CourseMaterial::Tyre),                   0.06f),
        MakeFacetSet("Pole",                 EmitBoxFacets(0.3f, 0.3f, 11.0f, CourseMaterial::SteelDark),               0.25f),
        MakeFacetSet("PoleHead",             EmitBoxFacets(1.8f, 0.6f, 0.3f, CourseMaterial::LampWarm),                 0.05f),
        MakeFacetSet("TrafficPost",          EmitBoxFacets(0.16f, 0.16f, 3.8f, CourseMaterial::SteelDark),              0.10f),
        MakeFacetSet("TrafficHead",          EmitTrafficHeadFacets(),                                                   0.05f),
        MakeFacetSet("ControlVehicleRed",    ProjectControlVehicleBody(BodyStream, CourseMaterial::BodyCoat),           0.05f),
        MakeFacetSet("ControlVehicleGreen",  ProjectControlVehicleBody(BodyStream, CourseMaterial::BodyCoatGreen),      0.05f),
        MakeFacetSet("ControlVehicleYellow", ProjectControlVehicleBody(BodyStream, CourseMaterial::BodyCoatYellow),     0.05f),
        MakeFacetSet("ControlVehicleBlue",   ProjectControlVehicleBody(BodyStream, CourseMaterial::BodyCoatBlue),       0.05f),
        MakeFacetSet("ControlVehicleOrange", ProjectControlVehicleBody(BodyStream, CourseMaterial::BodyCoatOrange),     0.05f),
        MakeFacetSet("ControlVehicleWheelL", ProjectControlVehicleWheel(TyreStream, RimStream, false),                  0.025f),
        MakeFacetSet("ControlVehicleWheelR", ProjectControlVehicleWheel(TyreStream, RimStream, true),                   0.025f)
    };

    const auto PlaceOccupant = [&](uint32_t       ShapeIndex,
                                   float          X,
                                   float          Y,
                                   float          Z        = 0.0f,
                                   float          Yaw      = 0.0f,
                                   uint32_t       Override = NoMaterialOverrideSentinel,
                                   uint32_t       Roles    = OccupantAssignmentRaster | OccupantAssignmentDistance | OccupantAssignmentCards) -> uint32_t
    {
        const FacetSetRecord&       FSet  = Course.Scene.FacetSets[ShapeIndex];
        const float                 HalfY = 0.5f * Yaw;
        const std::array<float, 16> Mat   = ConstructRigidTransform({X, Y, Z}, {0.0f, 0.0f, std::sin(HalfY), std::cos(HalfY)});
        const uint32_t              Idx   = static_cast<uint32_t>(Course.Scene.Occupants.size());
        Course.Scene.Occupants.push_back({
            ShapeIndex,
            Roles,
            Override,
            false,
            false,
            Mat,
            Mat,
            FSet.LocalMinimum,
            FSet.LocalMaximum
        });
        return Idx;
    };

    Course.Scene.GroundOccupant = static_cast<int32_t>(PlaceOccupant(SlotGround, 0.0f, 0.0f, 0.0f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentRaster));

    struct CarPlacementSpec
    {
        const char*    Label;
        CourseMaterial Paint;
        uint32_t       BodySlot;
        float          X;
        float          Y;
        float          YawDeg;
    };
    static constexpr std::array<CarPlacementSpec, 5> ShowcaseSpecs = {{
        {"Crimson Red Metallic Flake",      CourseMaterial::BodyCoat,       SlotVehicleBodyRed,    3.2f,  0.0f, -152.0f},
        {"Emerald Green Metallic Flake",    CourseMaterial::BodyCoatGreen,  SlotVehicleBodyGreen,  1.8f,  3.1f, -132.0f},
        {"Solar Yellow Metallic Flake",     CourseMaterial::BodyCoatYellow, SlotVehicleBodyYellow, 1.8f, -3.1f,  168.0f},
        {"Cobalt Blue Metallic Flake",      CourseMaterial::BodyCoatBlue,   SlotVehicleBodyBlue,  -0.4f,  5.8f, -112.0f},
        {"Tangerine Orange Metallic Flake", CourseMaterial::BodyCoatOrange, SlotVehicleBodyOrange,-0.4f, -5.8f,  148.0f}
    }};

    for (size_t CarIdx = 0u; CarIdx < ShowcaseSpecs.size(); ++CarIdx)
    {
        const CarPlacementSpec& Spec   = ShowcaseSpecs[CarIdx];
        const float             YawRad = Spec.YawDeg * Degrees;
        const float             CosY   = std::cos(YawRad);
        const float             SinY   = std::sin(YawRad);

        const uint32_t BodyOcc = PlaceOccupant(
            Spec.BodySlot,
            Spec.X,
            Spec.Y,
            VehicleCoMHeight,
            YawRad,
            NoMaterialOverrideSentinel,
            OccupantAssignmentRaster | OccupantAssignmentDistance | OccupantAssignmentCards);

        std::array<uint32_t, 4> WheelOccs{};
        for (size_t WheelIdx = 0u; WheelIdx < 4u; ++WheelIdx)
        {
            const auto& Mount   = ControlVehicleAxleMounts[WheelIdx];
            const float WorldX  = Spec.X + Mount[0] * CosY - Mount[1] * SinY;
            const float WorldY  = Spec.Y + Mount[0] * SinY + Mount[1] * CosY;
            const float WorldZ  = VehicleCoMHeight + Mount[2];
            const bool  IsRight = (WheelIdx == 1u || WheelIdx == 3u);
            WheelOccs[WheelIdx] = PlaceOccupant(
                IsRight ? SlotVehicleWheelRight : SlotVehicleWheelLeft,
                WorldX,
                WorldY,
                WorldZ,
                YawRad,
                NoMaterialOverrideSentinel,
                OccupantAssignmentRaster | OccupantAssignmentDistance);
        }

        Course.ShowcaseVehicles.push_back({
            Spec.Label,
            Spec.Paint,
            {Spec.X, Spec.Y, VehicleCoMHeight},
            YawRad,
            BodyOcc,
            WheelOccs
        });
    }

    Course.Scene.BodyOccupant   = Course.ShowcaseVehicles[0].BodyOccupant;
    Course.Scene.WheelOccupants = Course.ShowcaseVehicles[0].WheelOccupants;

    PlaceOccupant(SlotHangar,        30.0f,  26.0f,  0.0f, 180.0f * Degrees);
    PlaceOccupant(SlotControlTower, -22.0f,  30.0f,  0.0f,   0.0f);
    PlaceOccupant(SlotTowerCabin,   -22.0f,  30.0f, 16.0f,   0.0f);
    PlaceOccupant(SlotGrandstand,    10.0f, -26.0f,  0.0f, 180.0f * Degrees);
    PlaceOccupant(SlotCanopy,        10.0f, -25.5f,  7.2f, 180.0f * Degrees);
    PlaceOccupant(SlotTunnel,       -52.0f,   0.0f,  0.0f,   0.0f);
    PlaceOccupant(SlotBridgeDeck,    56.0f,   0.0f,  6.2f,   0.0f);
    PlaceOccupant(SlotBridgePier,    56.0f, -15.5f,  0.0f,   0.0f);
    PlaceOccupant(SlotBridgePier,    56.0f,  15.5f,  0.0f,   0.0f);

    for (float GX : {-18.0f, 26.0f})
    {
        PlaceOccupant(SlotGantryPost,  GX, -11.0f, 0.0f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        PlaceOccupant(SlotGantryPost,  GX,  11.0f, 0.0f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        PlaceOccupant(SlotGantryBeam,  GX,   0.0f, 6.8f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        PlaceOccupant(SlotGantryBoard, GX + 0.45f, 0.0f, 5.8f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
    }

    PlaceOccupant(SlotContainerLong,  -12.0f, -24.0f, 0.0f, 12.0f * Degrees, static_cast<uint32_t>(CourseMaterial::ContainerOrange));
    PlaceOccupant(SlotContainerLong,  -12.0f, -24.0f, 2.6f, 12.0f * Degrees, static_cast<uint32_t>(CourseMaterial::ContainerBlue));
    PlaceOccupant(SlotContainerShort, -22.0f, -22.0f, 0.0f, -25.0f * Degrees, static_cast<uint32_t>(CourseMaterial::ContainerGreen));
    PlaceOccupant(SlotContainerLong,   38.0f, -24.0f, 0.0f, -8.0f * Degrees, static_cast<uint32_t>(CourseMaterial::ContainerRed));

    for (int B = -4; B <= 4; ++B)
    {
        PlaceOccupant(SlotBarrier, static_cast<float>(B) * 3.4f, -13.6f, 0.0f, 0.0f);
        PlaceOccupant(SlotBarrier, static_cast<float>(B) * 3.4f,  13.6f, 0.0f, 0.0f);
    }

    PlaceOccupant(SlotTyreStack,  8.5f, -9.8f, 0.0f, 0.0f);
    PlaceOccupant(SlotTyreStack,  8.5f,  9.8f, 0.0f, 0.0f);
    PlaceOccupant(SlotTyreStack, -6.5f, -9.8f, 0.0f, 0.0f);
    PlaceOccupant(SlotTyreStack, -6.5f,  9.8f, 0.0f, 0.0f);

    static constexpr std::array<std::array<float, 3>, 8> PoleSpecs = {{
        {-24.0f, -15.0f,  90.0f * Degrees},
        { -4.0f, -15.0f,  90.0f * Degrees},
        { 16.0f, -15.0f,  90.0f * Degrees},
        { 36.0f, -15.0f,  90.0f * Degrees},
        {-24.0f,  15.0f, -90.0f * Degrees},
        { -4.0f,  15.0f, -90.0f * Degrees},
        { 16.0f,  15.0f, -90.0f * Degrees},
        { 36.0f,  15.0f, -90.0f * Degrees}
    }};

    for (const auto& P : PoleSpecs)
    {
        const float ArmDx = 0.75f * std::cos(P[2]);
        const float ArmDy = 0.75f * std::sin(P[2]);
        PlaceOccupant(SlotPole, P[0], P[1], 0.0f, P[2], NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        PlaceOccupant(SlotPoleHead, P[0] + ArmDx, P[1] + ArmDy, 11.0f, P[2], NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        StreetPoleSpecification PoleSpec{};
        PoleSpec.BulbPosition = {P[0] + ArmDx, P[1] + ArmDy, 10.8f};
        PoleSpec.Colour       = {1.0f, 0.85f, 0.6f};
        PoleSpec.Intensity    = 18.0f;
        PoleSpec.Radius       = 26.0f;
        Course.StreetPoles.push_back(PoleSpec);
    }

    for (float SY : {-11.8f, 11.8f})
    {
        PlaceOccupant(SlotTrafficPost, 12.0f, SY, 0.0f, 180.0f * Degrees, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
        PlaceOccupant(SlotTrafficHead, 12.0f, SY, 3.6f, 180.0f * Degrees, NoMaterialOverrideSentinel, OccupantAssignmentRaster);
    }

    Course.PointLamps = {
        {{ 28.0f, 22.0f, 8.2f}, {1.0f, 0.85f, 0.65f}, 24.0f, 22.0f},
        {{ 32.0f, 29.0f, 8.2f}, {1.0f, 0.85f, 0.65f}, 24.0f, 22.0f},
        {{-50.0f,  0.0f, 5.2f}, {0.75f, 0.88f, 1.0f}, 20.0f, 18.0f}
    };

    for (int Row = 0; Row < 2; ++Row)
    {
        for (int Col = 0; Col < 2; ++Col)
        {
            const float MinX = -28.0f + static_cast<float>(Row) * 28.0f;
            const float MinY = -24.0f + static_cast<float>(Col) * 24.0f;
            const uint32_t TileOcc = PlaceOccupant(SlotGround, 0.0f, 0.0f, 0.0f, 0.0f, NoMaterialOverrideSentinel, OccupantAssignmentCards);
            Course.Scene.Occupants[TileOcc].LocalMinimum = {MinX, MinY, -0.05f};
            Course.Scene.Occupants[TileOcc].LocalMaximum = {MinX + 28.0f, MinY + 24.0f, 0.05f};
        }
    }

    return Course;
}

} // namespace Everest
