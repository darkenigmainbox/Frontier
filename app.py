"""
Procedural Cliff Generator - Interactive Web App
Allows tweaking each stage and viewing as we go.

Endpoints:
- GET / -> interactive viewer
- POST /api/generate -> generate cliff with config, returns stage OBJs
- GET /api/default_config -> returns default config
- GET /obj/<filename> -> serve generated OBJ
"""

import os
import json
import time
import threading
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

from procedural_cliff import CliffConfig, generate_cliff_procedural
from cliff_generator import save_obj

app = Flask(__name__, static_folder='.')
CORS(app)

GENERATED_DIR = "generated"
os.makedirs(GENERATED_DIR, exist_ok=True)

# In-memory cache for latest generation
latest_result = None
latest_config = None

def save_stage_objs(stages, prefix):
    """Save each stage as OBJ, return dict stage->filename"""
    result = {}
    for stage_name, data in stages.items():
        # data is (verts, faces, blocks) or (verts,faces,blocks,extra)
        if not isinstance(data, (list, tuple)) or len(data) < 2:
            continue
        verts = data[0]
        faces = data[1]
        if verts is None or faces is None:
            continue
        filename = f"{prefix}_{stage_name}.obj"
        path = os.path.join(GENERATED_DIR, filename)
        save_obj(path, verts, faces)
        result[stage_name] = filename
    return result

STAGE_NAME_TO_NUM = {
    "stage1_macro": 1,
    "stage2_bedding": 2,
    "stage3_fractured": 3,
    "stage4_chipped": 4,
    "stage5_eroded": 5,
    "final": 6
}

@app.route('/')
def index():
    return send_from_directory('.', 'interactive_viewer.html')

@app.route('/viewer.html')
def viewer_old():
    return send_from_directory('.', 'viewer.html')

@app.route('/viewer_stages.html')
def viewer_stages_old():
    return send_from_directory('.', 'viewer_stages.html')

@app.route('/api/default_config')
def default_config():
    cfg = CliffConfig()
    return jsonify(cfg.to_dict())

@app.route('/api/generate', methods=['POST'])
def generate():
    global latest_result, latest_config
    try:
        data = request.get_json()
        if not data:
            data = {}
        print(f"[API] Generate request: {data}")
        # Extract up_to_stage if present
        up_to_stage = data.pop('up_to_stage', 6)
        if isinstance(up_to_stage, str):
            up_to_stage = STAGE_NAME_TO_NUM.get(up_to_stage, 6)
        up_to_stage = int(up_to_stage)
        cfg = CliffConfig.from_dict(data)
        # Validate
        cfg.W = max(5.0, min(100.0, cfg.W))
        cfg.H = max(5.0, min(50.0, cfg.H))
        cfg.D = max(3.0, min(30.0, cfg.D))
        cfg.voxel_size = max(0.04, min(0.2, cfg.voxel_size))

        start = time.time()
        result = generate_cliff_procedural(cfg, up_to_stage=up_to_stage)
        elapsed = time.time() - start

        # Save stage OBJs
        prefix = f"cliff_{cfg.seed}_{int(time.time())}"
        stage_files = save_stage_objs(result['stages'], prefix)

        # Save final separately
        final_path = os.path.join(GENERATED_DIR, f"{prefix}_final.obj")
        if result['final_verts'] is not None:
            save_obj(final_path, result['final_verts'], result['final_faces'])
            stage_files['final'] = f"{prefix}_final.obj"

        # Stats
        blocks = result['blocks']
        total_cracks = sum(len(b.cracks) for b in blocks)
        final_verts = len(result['final_verts']) if result['final_verts'] is not None else 0
        final_faces = len(result['final_faces']) if result['final_faces'] is not None else 0

        latest_result = result
        latest_config = cfg

        response = {
            "success": True,
            "elapsed": elapsed,
            "stage_files": stage_files,
            "stats": {
                "num_blocks": len(blocks),
                "total_cracks": total_cracks,
                "final_verts": final_verts,
                "final_faces": final_faces,
                "seed": cfg.seed,
                "W": cfg.W, "H": cfg.H, "D": cfg.D
            },
            "config": cfg.to_dict()
        }
        return jsonify(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/generated/<path:filename>')
def serve_generated(filename):
    return send_from_directory(GENERATED_DIR, filename)

@app.route('/obj/<path:filename>')
def serve_obj(filename):
    # Serve from root or generated
    if os.path.exists(os.path.join(GENERATED_DIR, filename)):
        return send_from_directory(GENERATED_DIR, filename)
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    return f"File not found: {filename}", 404

@app.route('/<path:filename>')
def serve_static_root(filename):
    # Serve any static file from root or generated (for .obj, .html, etc)
    # Avoid overriding API routes
    if filename.startswith('api/'):
        return "Not found", 404
    # Check root
    if os.path.exists(filename) and os.path.isfile(filename):
        return send_from_directory('.', filename)
    # Check generated
    gen_path = os.path.join(GENERATED_DIR, filename)
    if os.path.exists(gen_path) and os.path.isfile(gen_path):
        return send_from_directory(GENERATED_DIR, filename)
    # Also check if filename is like stage1_macro.obj without prefix, try in root
    # If not found, return 404 with helpful message
    return f"File not found: {filename}", 404

@app.route('/api/list_generated')
def list_generated():
    files = os.listdir(GENERATED_DIR)
    return jsonify(files)

if __name__ == '__main__':
    print("Starting Procedural Cliff Generator server on http://0.0.0.0:8000")
    print("Open http://localhost:8000/ for interactive viewer")
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
