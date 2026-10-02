# run after the journal:  SolidArc Liger_Rebuild.arc render_rebuild.arc --proofs DIR
show shading plastic
show cages off
show iso off
view iso
view fit
view dolly 3
render Liger_RB_01_Iso --size=1920x1200
view orbit 150 20
view fit
view dolly 3
render Liger_RB_02_RearQuarter --size=1920x1200
view front
view fit
view dolly 3
render Liger_RB_03_Side --size=1920x1200
view top
view fit
view dolly 3
render Liger_RB_04_Top --size=1920x1200
view right
view fit
view dolly 3
render Liger_RB_05_Front --size=1920x1200
view left
view fit
view dolly 3
render Liger_RB_06_Rear --size=1920x1200
