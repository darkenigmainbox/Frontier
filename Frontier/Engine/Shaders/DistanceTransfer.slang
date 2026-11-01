//==========================================================================================================================================
//                                                          DISTANCE TRANSFER
//==========================================================================================================================================
// 🧩 Signed distance from a facet set's bounding hierarchy into its slice of the 3D occupant distance space.

struct TransferRecord
{
    float3 Minimum;      // [m]     local corner of texel (0, 0, 0)
    float  VoxelExtent;  // [m]     edge of one voxel
    uint3  TexelOrigin;  // [texel] placement in the 3D distance space
    uint   NodeCount;    // [-]
    uint3  Resolution;   // [texel]
    uint   FacetCount;   // [-]
    uint   SlabZ;        // [texel] first local z slice of this dispatch
    uint   SlabExtentZ;  // [texel] slices in this dispatch
    uint   SignRayCount; // [-]
    uint   Pad;
};

struct BoundingNode
{
    float3 Minimum;
    uint   LeftOrFirst;
    float3 Maximum;
    uint   Count;
};

[[vk::binding(0, 0)]] ConstantBuffer<TransferRecord>              Transfer;
[[vk::binding(1, 0)]] StructuredBuffer<BoundingNode>              Nodes;
[[vk::binding(2, 0)]] StructuredBuffer<float4>                    Facets;
[[vk::binding(3, 0)]] [format("rgba16f")] RWTexture3D<float4>     Target;

// 📝 Ericson, Real-Time Collision Detection §5.1.5: closest point of triangle ABC to P, by Voronoi region.
float MeasureTriangleDistanceSquared(float3 P, float3 A, float3 B, float3 C)
{
    float3 AB = B - A;
    float3 AC = C - A;
    float3 AP = P - A;
    float  D1 = dot(AB, AP);
    float  D2 = dot(AC, AP);
    if (D1 <= 0.0f && D2 <= 0.0f)
    {
        return dot(AP, AP);
    }

    float3 BP = P - B;
    float  D3 = dot(AB, BP);
    float  D4 = dot(AC, BP);
    if (D3 >= 0.0f && D4 <= D3)
    {
        return dot(BP, BP);
    }

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
    if (D6 >= 0.0f && D5 <= D6)
    {
        return dot(CP, CP);
    }

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

float MeasureBoxDistanceSquared(float3 P, float3 Minimum, float3 Maximum)
{
    float3 Clamped = clamp(P, Minimum, Maximum);
    float3 Offset  = P - Clamped;
    return dot(Offset, Offset);
}

float QueryNearestTriangle(float3 Point)
{
    float BestSquared = 1.0e20f;
    uint  Stack[64];
    uint  Depth = 0u;
    Stack[0]    = 0u;
    Depth       = 1u;

    while (Depth > 0u)
    {
        Depth--;
        BoundingNode Node = Nodes[Stack[Depth]];
        if (MeasureBoxDistanceSquared(Point, Node.Minimum, Node.Maximum) >= BestSquared)
        {
            continue;
        }
        if (Node.Count > 0u)
        {
            for (uint Offset = 0u; Offset < Node.Count; Offset++)
            {
                uint   Base      = (Node.LeftOrFirst + Offset) * 3u;
                float  Candidate = MeasureTriangleDistanceSquared(Point, Facets[Base].xyz, Facets[Base + 1u].xyz, Facets[Base + 2u].xyz);
                BestSquared      = min(BestSquared, Candidate);
            }
        }
        else
        {
            uint  Left          = Node.LeftOrFirst;
            uint  Right         = Left + 1u;
            float LeftDistance  = MeasureBoxDistanceSquared(Point, Nodes[Left].Minimum, Nodes[Left].Maximum);
            float RightDistance = MeasureBoxDistanceSquared(Point, Nodes[Right].Minimum, Nodes[Right].Maximum);
            if (LeftDistance < RightDistance)
            {
                if (RightDistance < BestSquared && Depth < 63u) { Stack[Depth] = Right; Depth++; }
                if (LeftDistance < BestSquared && Depth < 63u)  { Stack[Depth] = Left;  Depth++; }
            }
            else
            {
                if (LeftDistance < BestSquared && Depth < 63u)  { Stack[Depth] = Left;  Depth++; }
                if (RightDistance < BestSquared && Depth < 63u) { Stack[Depth] = Right; Depth++; }
            }
        }
    }
    return sqrt(BestSquared);
}

float2 IntersectRayBox(float3 Origin, float3 InverseDirection, float3 Minimum, float3 Maximum)
{
    float3 Near = (Minimum - Origin) * InverseDirection;
    float3 Far  = (Maximum - Origin) * InverseDirection;
    float3 Low  = min(Near, Far);
    float3 High = max(Near, Far);
    return float2(max(max(Low.x, Low.y), max(Low.z, 0.0f)), min(min(High.x, High.y), High.z));
}

float2 IntersectRayTriangle(float3 Origin, float3 Direction, float3 A, float3 B, float3 C)
{
    float3 Edge1       = B - A;
    float3 Edge2       = C - A;
    float3 P           = cross(Direction, Edge2);
    float  Determinant = dot(Edge1, P);
    if (abs(Determinant) < 1.0e-8f)
    {
        return float2(-1.0f, 0.0f);
    }
    float  Inverse = 1.0f / Determinant;
    float3 T       = Origin - A;
    float  U       = dot(T, P) * Inverse;
    if (U < 0.0f || U > 1.0f)
    {
        return float2(-1.0f, 0.0f);
    }
    float3 Q = cross(T, Edge1);
    float  V = dot(Direction, Q) * Inverse;
    if (V < 0.0f || U + V > 1.0f)
    {
        return float2(-1.0f, 0.0f);
    }
    float Distance = dot(Edge2, Q) * Inverse;
    if (Distance <= 1.0e-5f)
    {
        return float2(-1.0f, 0.0f);
    }
    return float2(Distance, (Determinant < 0.0f) ? 1.0f : -1.0f);
}

float TraceBackFaceRatio(float3 Point)
{
    uint BackFaces = 0u;
    uint Hits      = 0u;
    uint Count     = Transfer.SignRayCount;
    for (uint Ray = 0u; Ray < Count; Ray++)
    {
        float  Z                = 1.0f - (2.0f * (float(Ray) + 0.5f)) / float(Count);
        float  Radius           = sqrt(max(0.0f, 1.0f - Z * Z));
        float  φ                = 2.399963229728653f * float(Ray);
        float3 Direction        = float3(Radius * cos(φ), Radius * sin(φ), Z);
        float3 InverseDirection = 1.0f / select(abs(Direction) < float3(1.0e-8f), float3(1.0e-8f), Direction);

        uint Stack[64];
        Stack[0]   = 0u;
        uint Depth = 1u;
        while (Depth > 0u)
        {
            Depth--;
            BoundingNode Node = Nodes[Stack[Depth]];
            float2       Span = IntersectRayBox(Point, InverseDirection, Node.Minimum, Node.Maximum);
            if (Span.x > Span.y)
            {
                continue;
            }
            if (Node.Count > 0u)
            {
                for (uint Offset = 0u; Offset < Node.Count; Offset++)
                {
                    uint   Base = (Node.LeftOrFirst + Offset) * 3u;
                    float2 Hit  = IntersectRayTriangle(Point, Direction, Facets[Base].xyz, Facets[Base + 1u].xyz, Facets[Base + 2u].xyz);
                    if (Hit.x > 0.0f)
                    {
                        Hits++;
                        if (Hit.y > 0.0f)
                        {
                            BackFaces++;
                        }
                    }
                }
            }
            else if (Depth < 62u)
            {
                Stack[Depth]      = Node.LeftOrFirst;
                Stack[Depth + 1u] = Node.LeftOrFirst + 1u;
                Depth += 2u;
            }
        }
    }
    if (Hits == 0u)
    {
        return 0.0f;
    }
    return float(BackFaces) / float(Hits);
}

[shader("compute")]
[numthreads(4, 4, 4)]
void TransferDistance(uint3 Invocation : SV_DispatchThreadID)
{
    uint3 Voxel = uint3(Invocation.x, Invocation.y, Invocation.z + Transfer.SlabZ);
    if (Voxel.x >= Transfer.Resolution.x || Voxel.y >= Transfer.Resolution.y || Invocation.z >= Transfer.SlabExtentZ)
    {
        return;
    }
    float3 Point     = Transfer.Minimum + (float3(Voxel) + 0.5f) * Transfer.VoxelExtent;
    float  UnsignedD = QueryNearestTriangle(Point);
    float  Sign      = (TraceBackFaceRatio(Point) > 0.5f) ? -1.0f : 1.0f;
    int3   Texel     = int3(Transfer.TexelOrigin + Voxel);
    Target[Texel]    = float4(Sign * UnsignedD, 0.0f, 0.0f, 1.0f);
}
