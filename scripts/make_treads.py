"""Generate four actual polygonal tire tread meshes (Wavefront OBJ).

Coordinates: axle X, radius in YZ. Units are arbitrary; default outside
radius ~1.04, width 0.7. No texture, displacement or height map is used.
"""
import argparse
import math
from pathlib import Path

TAU = 2 * math.pi


class Mesh:
    def __init__(self):
        self.vertices = []
        self.faces = []

    def vertex(self, x, radius, angle):
        self.vertices.append((x, radius * math.cos(angle), radius * math.sin(angle)))
        return len(self.vertices)

    def face(self, *indices):
        self.faces.append(indices)

    def band(self, x0, x1, r0, r1, segments=192):
        # Closed annular tire carcass: outer rolling surface, sidewalls,
        # inner barrel. Faces are ordered with outward-facing normals.
        rings = [[self.vertex(x, r, TAU * i / segments)
                  for i in range(segments)] for x, r in
                 ((x0, r1), (x1, r1), (x0, r0), (x1, r0))]
        for i in range(segments):
            j = (i + 1) % segments
            self.face(rings[0][i], rings[0][j], rings[1][j], rings[1][i])
            self.face(rings[2][i], rings[3][i], rings[3][j], rings[2][j])
            self.face(rings[0][i], rings[0][j], rings[2][j], rings[2][i])
            self.face(rings[1][i], rings[3][i], rings[3][j], rings[1][j])

    def lug(self, outline, radius=1.0, lift=0.045):
        """Extrude an x/angular polygon into a real raised radial tread block."""
        bottom = [self.vertex(x, radius - 0.002, angle) for x, angle in outline]
        top = [self.vertex(x, radius + lift, angle) for x, angle in outline]
        # Outlines are clockwise in (x, angle) coordinates. Reverse top if needed.
        signed = sum(outline[i][0] * outline[(i + 1) % len(outline)][1] -
                     outline[(i + 1) % len(outline)][0] * outline[i][1]
                     for i in range(len(outline)))
        if signed > 0:
            top.reverse()
            bottom.reverse()
        self.face(*top)
        self.face(*reversed(bottom))
        for i in range(len(top)):
            j = (i + 1) % len(top)
            self.face(bottom[i], bottom[j], top[j], top[i])

    def save(self, filename):
        with open(filename, 'w') as stream:
            stream.write('# Procedural polygon tire; X is the wheel axle\n')
            for x, y, z in self.vertices:
                stream.write(f'v {x:.6f} {y:.6f} {z:.6f}\n')
            for face in self.faces:
                stream.write('f ' + ' '.join(map(str, face)) + '\n')


def rectangle(x0, x1, t0, t1):
    return [(x0, t0), (x1, t0), (x1, t1), (x0, t1)]


def pattern(style, count=32):
    mesh = Mesh()
    mesh.band(-0.35, 0.35, 0.72, 1.0)
    step = TAU / count
    for k in range(count):
        a = k * step
        if style == 'chevron':
            # Mirrored V-shaped directional lugs, with a central drainage gap.
            for side in (-1, 1):
                points = [(0.025, -0.35), (0.095, -0.33),
                          (0.34, -0.06), (0.34, 0.10),
                          (0.265, 0.10), (0.025, -0.17)]
                mesh.lug([(side * x, a + t * step) for x, t in points])
        elif style == 'staggered':
            # Three courses of interlocking offset rectangular road blocks.
            for row, (x0, x1) in enumerate(((-0.33, -0.13),
                                            (-0.105, 0.105), (0.13, 0.33))):
                offset = 0.5 if row == 1 else 0
                mesh.lug(rectangle(x0, x1, a + (offset + 0.07) * step,
                                   a + (offset + 0.88) * step), lift=0.032)
        elif style == 'ribbed':
            # Longitudinal ribs are interrupted by angled lateral sipes.
            for row, (x0, x1) in enumerate(((-0.33, -0.185),
                                            (-0.16, -0.018), (0.018, 0.16),
                                            (0.185, 0.33))):
                skew = 0.10 if row % 2 else -0.10
                mesh.lug([(x0, a + 0.04 * step),
                          (x1, a + (0.04 + skew) * step),
                          (x1, a + (0.94 + skew) * step),
                          (x0, a + 0.94 * step)], lift=0.024)
        elif style == 'offroad':
            # Large alternating shoulder lugs and central diamond blocks.
            side = -1 if k % 2 else 1
            mesh.lug([(side * x, a + t * step) for x, t in
                      ((0.07, 0.12), (0.33, 0.02), (0.33, 0.88),
                       (0.07, 0.68))], lift=0.065)
            mesh.lug([(0, a + 0.09 * step), (0.12, a + 0.47 * step),
                      (0, a + 0.85 * step), (-0.12, a + 0.47 * step)],
                     lift=0.05)
    return mesh


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('meshes'))
    parser.add_argument('--count', type=int, default=32,
                        help='repetitions around wheel (at least 12)')
    args = parser.parse_args()
    if args.count < 12:
        parser.error('--count must be at least 12')
    args.output.mkdir(parents=True, exist_ok=True)
    for style in ('chevron', 'staggered', 'ribbed', 'offroad'):
        path = args.output / f'tire_{style}.obj'
        mesh = pattern(style, args.count)
        mesh.save(path)
        print(f'{path}: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces')


if __name__ == '__main__':
    main()
