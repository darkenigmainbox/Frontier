# proof renders for Liger_Body_CAD.arc (kernel convention: `view front` looks along -Y,
# i.e. shows the XZ side elevation of the car; `view right` looks along -X = front elevation)
open /home/user/Frontier/Vehicles/Liger/Liger_Body_CAD.arc
show shading plastic
show cages off
show iso off
view iso
view fit
view dolly 2
render Liger_CAD_01_IsoFront --size=1920x1200
view orbit 145 18
view fit
view dolly 2
render Liger_CAD_02_IsoRear --size=1920x1200
view front
view fit
view dolly 2
render Liger_CAD_03_Side --size=1920x1200
view top
view fit
view dolly 2
render Liger_CAD_04_Top --size=1920x1200
view right
view fit
view dolly 2
render Liger_CAD_05_Front --size=1920x1200
view left
view fit
view dolly 2
render Liger_CAD_06_Rear --size=1920x1200
