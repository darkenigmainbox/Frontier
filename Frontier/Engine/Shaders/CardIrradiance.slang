//==========================================================================================================================================
//                                                           CARD IRRADIANCE
//==========================================================================================================================================
// 🧩 The scheduled-tile record shared by the three card lighting passes (direct, radiosity, final).

#pragma once

struct CardWorkRecord
{
    uint  TileCount;     // [-]    scheduled tiles this frame
    uint  SiteStride;    // [site] sites per row of the card texel space
    float StaticWeight;  // [-]    minimum radiosity weight for static cards
    float DynamicWeight; // [-]    minimum radiosity weight for moving cards
};

uint2 ResolveTileTexel(uint2 Assignment, uint2 Local)
{
    return uint2(Assignment.y & 0xFFFFu, Assignment.y >> 16u) * 8u + Local;
}

uint ResolveWorkIndex(uint3 Group)
{
    return Group.x + Group.y * 65535u;
}
