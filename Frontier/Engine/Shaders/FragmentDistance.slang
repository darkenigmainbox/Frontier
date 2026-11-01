//==========================================================================================================================================
//                                                          FRAGMENT DISTANCE
//==========================================================================================================================================
// 🧩 A fragment's signed distance volume, computed on the device the frame it is born — one workgroup per fragment.

struct FragmentJob
{
    uint3  TexelOrigin; // [texel] the pool slot in the occupant distance space
    uint   Counts;      // [-]     triangles | planes << 16
    float3 Minimum;     // [m]     local corner of texel (0, 0, 0)
    float  VoxelExtent; // [m]
};

[[vk::binding(0, 0)]] StructuredBuffer<FragmentJob>          Jobs;
[[vk::binding(1, 0)]] StructuredBuffer<float4>               Geometry; // per job: MaxTriangles.3 corners, then MaxPlanes planes
[[vk::binding(2, 0)]] [format("rgba16f")] RWTexture3D<float4> Target;

static const uint Edge         = 12u;
static const uint MaxTriangles = 48u;
static const uint MaxPlanes    = 40u;
static const uint Stride       = MaxTriangles * 3u + MaxPlanes;

groupshared float3 Corners[144];
groupshared float4 Planes[40];

// 📝 Ericson, Real-Time Collision Detection §5.1.5: the closest point of triangle ABC to P, by Voronoi region.
float MeasureTriangleDistanceSquared(float3 P, float3 A, float3 B, float3 C)
{
    float3 AB = B - A;
    float3 AC = C - A;
    float3 AP = P - A;
    float  D1 = dot(AB, AP);
    float  D2 = dot(AC, AP);
    if (D1 <= 0.0f && D2 <= 0.0f) { return dot(AP, AP); }
    float3 BP = P - B;
    float  D3 = dot(AB, BP);
    float  D4 = dot(AC, BP);
    if (D3 >= 0.0f && D4 <= D3) { return dot(BP, BP); }
    float VC = D1 * D4 - D3 * D2;
    if (VC <= 0.0f && D1 >= 0.0f && D3 <= 0.0f)
    {
        float  V = D1 / (D1 - D3);
        float3 Q = P - (A + V * AB);
        return dot(Q, Q);
    }
    float3 CP = P - C;
    float  D5 = dot(AB, CP);
    float  D6 = dot(AC, CP);
    if (D6 >= 0.0f && D5 <= D6) { return dot(CP, CP); }
    float VB = D5 * D2 - D1 * D6;
    if (VB <= 0.0f && D2 >= 0.0f && D6 <= 0.0f)
    {
        float  W = D2 / (D2 - D6);
        float3 Q = P - (A + W * AC);
        return dot(Q, Q);
    }
    float VA = D3 * D6 - D5 * D4;
    if (VA <= 0.0f && (D4 - D3) >= 0.0f && (D5 - D6) >= 0.0f)
    {
        float  W = (D4 - D3) / ((D4 - D3) + (D5 - D6));
        float3 Q = P - (B + W * (C - B));
        return dot(Q, Q);
    }
    float  Denominator = 1.0f / (VA + VB + VC);
    float  V           = VB * Denominator;
    float  W           = VC * Denominator;
    float3 Q           = P - (A + AB * V + AC * W);
    return dot(Q, Q);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void ComputeFragmentDistance(uint3 Group : SV_GroupID, uint Lane : SV_GroupIndex)
{
    FragmentJob Job           = Jobs[Group.x];
    uint        TriangleCount = min(Job.Counts & 0xFFFFu, MaxTriangles);
    uint        PlaneCount    = min(Job.Counts >> 16u, MaxPlanes);
    uint        Base          = Group.x * Stride;
    for (uint Index = Lane; Index < TriangleCount * 3u; Index += 64u)
    {
        Corners[Index] = Geometry[Base + Index].xyz;
    }
    for (uint Index = Lane; Index < PlaneCount; Index += 64u)
    {
        Planes[Index] = Geometry[Base + MaxTriangles * 3u + Index];
    }
    GroupMemoryBarrierWithGroupSync();

    for (uint Voxel = Lane; Voxel < Edge * Edge * Edge; Voxel += 64u)
    {
        uint3  Cell   = uint3(Voxel % Edge, (Voxel / Edge) % Edge, Voxel / (Edge * Edge));
        float3 Point  = Job.Minimum + (float3(Cell) + 0.5f) * Job.VoxelExtent;
        float  Inside = -1.0e9f;
        for (uint Index = 0u; Index < PlaneCount; Index++)
        {
            Inside = max(Inside, dot(Planes[Index].xyz, Point) - Planes[Index].w);
        }
        float Signed = Inside;
        if (Inside > 0.0f)
        {
            float Nearest = 1.0e18f;
            for (uint Triangle = 0u; Triangle < TriangleCount; Triangle++)
            {
                Nearest = min(Nearest,
                              MeasureTriangleDistanceSquared(
                                  Point, Corners[Triangle * 3u], Corners[Triangle * 3u + 1u], Corners[Triangle * 3u + 2u]));
            }
            Signed = sqrt(Nearest);
        }
        Target[int3(Job.TexelOrigin + Cell)] = float4(Signed, 0.0f, 0.0f, 1.0f);
    }
}
