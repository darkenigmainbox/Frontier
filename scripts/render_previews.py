"""Dependency-free OBJ preview renderer: projected, depth-sorted shaded polygons."""
import math
from pathlib import Path
import xml.sax.saxutils as xml


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def unit(v):
    l = math.sqrt(dot(v, v))
    return tuple(x/l for x in v)


CAM = unit((2.3, -3.5, 2.1))
RIGHT = unit(cross((0, 0, 1), CAM))
UP = cross(CAM, RIGHT)
LIGHT = unit((1, -0.8, 2))
W, H = 900, 900
SCALE = 315


def render(src, dst, label):
    verts, faces = [], []
    for line in src.read_text().splitlines():
        if line.startswith('v '):
            verts.append(tuple(map(float, line.split()[1:])))
        elif line.startswith('f '):
            faces.append([int(p)-1 for p in line.split()[1:]])
    projected = [(W/2 + SCALE*dot(v, RIGHT), H/2 - SCALE*dot(v, UP)) for v in verts]
    polygons = []
    for face in faces:
        pts = [verts[i] for i in face]
        a = tuple(pts[1][i]-pts[0][i] for i in range(3))
        b = tuple(pts[2][i]-pts[0][i] for i in range(3))
        normal = unit(cross(a, b))
        if dot(normal, CAM) <= 0:
            continue
        depth = sum(dot(p, CAM) for p in pts)/len(pts)
        diffuse = max(0, dot(normal, LIGHT))
        shade = min(190, int(47 + 124*diffuse + 12*max(0, dot(normal, CAM))))
        # Slate rubber with a warm studio light.
        color = '#%02x%02x%02x' % (shade, min(255, shade+5), min(255, shade+9))
        path = ' '.join(f'{projected[i][0]:.1f},{projected[i][1]:.1f}' for i in face)
        polygons.append((depth, path, color))
    polygons.sort(key=lambda x: x[0])
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
             '<defs><radialGradient id="bg"><stop stop-color="#34414b"/><stop offset="1" stop-color="#10191f"/></radialGradient></defs>',
             f'<rect width="{W}" height="{H}" fill="url(#bg)"/>',
             '<ellipse cx="450" cy="766" rx="310" ry="49" fill="#090e11" opacity=".55"/>']
    for _, path, color in polygons:
        lines.append(f'<polygon points="{path}" fill="{color}" stroke="#131b20" stroke-width=".6" stroke-linejoin="round"/>')
    lines += [f'<text x="45" y="73" fill="#f4f5ef" font-size="36" font-family="DejaVu Sans" font-weight="bold">{xml.escape(label)}</text>',
              '<text x="46" y="109" fill="#a9bbc4" font-size="17" font-family="DejaVu Sans">POLYGON MESH  /  NO HEIGHT MAP</text>', '</svg>']
    dst.write_text('\n'.join(lines))


if __name__ == '__main__':
    out = Path('renders')
    out.mkdir(exist_ok=True)
    for name in ('chevron', 'staggered', 'ribbed', 'offroad'):
        render(Path('meshes') / f'tire_{name}.obj', out / f'{name}.svg', name.upper())
        print(out / f'{name}.svg')
