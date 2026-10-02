# SolidArc native document v1
# Render the phase-4 CAD rebuild (Liger_CAD.arc) from five canonical views.
# Run from the repo root:
#   ~/.solidarc/build/SolidArc --proofs Vehicles/Liger/SolidArc Vehicles/Liger/SolidArc/render_cad.arc
open Vehicles/Liger/Liger_CAD.arc
show shading plastic
view iso
view fit
render Liger_CAD_01_Iso --size=1600x1000
view right
view fit
render Liger_CAD_02_Front --size=1600x1000
view top
view fit
render Liger_CAD_03_Top --size=1600x1000
view orbit 140 18
view fit
render Liger_CAD_04_RearQuarter --size=1600x1000
view orbit 40 20
view fit
render Liger_CAD_05_FrontQuarter --size=1600x1000
