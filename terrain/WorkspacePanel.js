import {CreateDetailPainter} from './DetailPainter.js';
import {DetailPatterns} from './DetailMask.js';
import {RouteProfiles} from './FormationRoute.js';
import {CreateViewportEditor} from './ViewportEditor.js';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
//============================================================================================================================================
//                                                             WORKSPACEPANEL.JS
//============================================================================================================================================
// 📦 Static polygon cliff authoring workspace, clay viewport, stage inspection and triangle OBJ exchange.

import * as THREE from 'three';
import {SolidLabels,SolidPresets,SolidCountRanges} from './SolidFormation.js';
import {CreateGrainPanel} from './ParticlePanel.js';
import {CaptureGrainSource} from './GrainSequence.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CliffDefaults, ReadSpecification, EarliestStage, NoiseModes, FractureStyles, ReadRecipe} from './CliffSpecification.js';

const Element=Id=>document.getElementById(Id);
const StageOrder=[1,2,3,4,5,5.1,6];
const StageAt=(Result,Number)=>Number===5.1?Result?.Erosion:Result?.Stages[Number-1];
const StageDescriptions=[
    ['Cliff mass','3D masses · distinct footprints','Closed rock volumes assembled in three dimensions. Choose a formation, then inspect its footprint using Top and Side. No folded front/back sheet.'],
    ['Primary fractures','Joint sets, not just bedding','Geological orientation families with rough polygon cuts. New fractures terminate at existing boundaries; bedding is an optional preset.'],
    ['Bounded joints','Finite-depth rock blocks','Kinked joints split front, rear and end exposures, terminating against a retained interior core.'],
    ['Edge spalls','Local fracture cavities','Localized, asymmetric bites with four or six fracture facets. The original edge survives on both sides—not a full-edge bevel.'],
    ['Surface fissures','Shallow polygon incisions','Finite, kinked V-grooves cut into individual rock faces. Closed bottoms, bounded depth; no SDF erosion.'],
    ['Face erosion','5.1 · deform individual rocks','Push broad face regions inward toward each rock’s own centre, with seeded outward bulges. Shared vertices remain connected. Unsafe deformations are reduced or rejected.'],
    ['Mould detail','Noisy negative · triangle boolean','Stage 5.1 minus a noisy hollow mould made from the ORIGINAL stage-1 mass. Subtraction only: existing fracture voids are not filled. Low-resolution geometry prototype; no textures.']
];
const State={Specification:{...CliffDefaults,...SolidPresets.Headland},Result:null,Stage:StageOrder.includes(Number(new URLSearchParams(location.search).get('stage')))?Number(new URLSearchParams(location.search).get('stage')):1,Busy:false,DisplayStage:0,Revision:0,ReadyRevision:0,Worker:null,Dirty:false,
    DetailView:'Final',Mode:'Clay',Wire:false,Selected:null,Isolated:false,Exploded:false,Milliseconds:0,Error:null};
const Scene=new THREE.Scene();
Scene.background=new THREE.Color('#282e38');
const Camera=new THREE.PerspectiveCamera(38,1,.05,500);
const Renderer=new THREE.WebGLRenderer({canvas:Element('SceneCanvas'),antialias:true,preserveDrawingBuffer:true});
Renderer.setPixelRatio(Math.min(devicePixelRatio,2));
Renderer.shadowMap.enabled=true;
Renderer.localClippingEnabled=true;
Renderer.shadowMap.type=THREE.PCFSoftShadowMap;
Renderer.shadowMap.autoUpdate=false;
Renderer.toneMapping=THREE.ACESFilmicToneMapping;
Renderer.toneMappingExposure=1;
const Controls=new OrbitControls(Camera,Renderer.domElement);
Controls.enableDamping=true;
Controls.dampingFactor=.12;
Controls.minDistance=.5;
Controls.maxDistance=450;
Controls.maxPolarAngle=Math.PI*.49;
const Hemisphere=new THREE.HemisphereLight('#d7e5fc','#484952',1.25);
Scene.add(Hemisphere);
const Sun=new THREE.DirectionalLight('#fff4e5',3.2);
Sun.position.set(-26,37,24);
Sun.castShadow=true;
Sun.shadow.mapSize.set(2048,2048);
Object.assign(Sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:.5,far:150});
Sun.shadow.normalBias=.025;
Sun.shadow.bias=-.00004;
Sun.shadow.radius=2;
Scene.add(Sun,Sun.target);
const Fill=new THREE.DirectionalLight('#b5c9ea',.65);
Fill.position.set(22,16,-16);
Scene.add(Fill);
const Ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#333b48',roughness:1}));
Ground.rotation.x=-Math.PI/2;
Ground.position.y=-.12;
Ground.receiveShadow=true;
Scene.add(Ground);
const Grid=new THREE.GridHelper(100,20,'#424c5c','#384250');
Grid.position.y=-.105;
Grid.material.transparent=true;
Grid.material.opacity=.25;
Scene.add(Grid);
const BodyGroup=new THREE.Group();
Scene.add(BodyGroup);
const ClayMaterial=new THREE.MeshStandardMaterial({color:'#a9abad',roughness:1,metalness:0,flatShading:true,
    polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const CutMaterial=ClayMaterial.clone();
CutMaterial.color.set('#ffffff');
CutMaterial.vertexColors=true;
const WireMaterial=new THREE.LineBasicMaterial({color:'#111820',transparent:true,opacity:.35});
const SelectionMaterial=new THREE.LineBasicMaterial({color:'#efb063',transparent:true,opacity:.9,depthTest:true});
const CutColours={Cliff:'#929aa5',Crown:'#929aa5',Base:'#929aa5',End:'#929aa5',Back:'#929aa5',Bedding:'#8ca49d',
    Fracture:'#8ca49d',Joint:'#8ca49d',Termination:'#8ca49d',Spall:'#e0a570',Crack:'#d07969'};
let DetailPainter=null;
let MouldSection=null;
let ViewportEditor=null;
let SelectionOutline=null;
let ResizePending=true;
let RenderRequested=true;
const ResizeObserverHandle=new ResizeObserver(()=>{ResizePending=true;});
ResizeObserverHandle.observe(Element('Viewport'));

function SetStatus(Message, Warning=false)
{
    Element('Status').textContent=Message;
    Element('StatusDot').style.background=Warning?'#c59a61':'#88a483';
}

function SetPressed(Id, Value)
{
    RenderRequested=true;
    Element(Id).classList.toggle('Active',Value);
    Element(Id).setAttribute('aria-pressed',String(Value));
}

function DisposeBodies()
{
    State.SourceFace=null;
    ClearSelection();
    BodyGroup.children.forEach(Body=>Body.traverse(Object=>{if(Object.geometry) Object.geometry.dispose();}));
    BodyGroup.clear();
}

function BuildRenderBody(Mesh, Index)
{
    const Positions=new Float32Array(Mesh.Triangles.length*9);
    const Colours=new Float32Array(Positions.length);
    Mesh.Triangles.forEach((Triangle,TriangleIndex)=>
    {
        const Colour=new THREE.Color(CutColours[Mesh.Tags[TriangleIndex]]||'#929aa5');
        Triangle.forEach((Vertex,Corner)=>
        {
            Positions.set(Mesh.Vertices[Vertex],TriangleIndex*9+Corner*3);
            Colours.set([Colour.r,Colour.g,Colour.b],TriangleIndex*9+Corner*3);
        });
    });
    const Geometry=new THREE.BufferGeometry();
    Geometry.setAttribute('position',new THREE.BufferAttribute(Positions,3));
    Geometry.setAttribute('color',new THREE.BufferAttribute(Colours,3));
    Geometry.computeVertexNormals();
    Geometry.computeBoundingBox();
    Geometry.computeBoundingSphere();
    const Body=new THREE.Mesh(Geometry,State.Mode==='Scars'?CutMaterial:ClayMaterial);
    Body.name=Mesh.Name;
    Body.userData={Index,Mesh,Centre:Geometry.boundingBox.getCenter(new THREE.Vector3())};
    Body.castShadow=true;
    Body.receiveShadow=true;
    const Wire=new THREE.LineSegments(new THREE.WireframeGeometry(Geometry),WireMaterial);
    Wire.name='Triangle edges';
    Wire.visible=State.Wire;
    Body.add(Wire);
    return Body;
}

function ViewStage(StageNumber)
{
    RenderRequested=true;
    Renderer.shadowMap.needsUpdate=true;
    if(StageNumber!==6)DetailPainter?.stop();
    State.Stage=StageOrder.includes(Number(StageNumber))?Number(StageNumber):1;
    const [Title,,Description]=StageDescriptions[StageOrder.indexOf(State.Stage)];
    Element('StageTitle').textContent=State.Stage===1&&State.Specification.ShapeMode==='Solid'?SolidLabels[State.Specification.Profile]:Title;
    Element('StageDescription').textContent=State.Stage===1&&State.Specification.ShapeMode!=='Solid'?'Legacy generator retained for old recipes. Switch to 3D masses for genuinely different footprints.':Description;
    Element('StageNumber').textContent=`${State.Stage===5.1?'5.1':'0'+State.Stage} / 06`;
    Element('PreviousStage').disabled=State.Stage===1;
    Element('NextStage').disabled=State.Stage===6;
    document.querySelectorAll('.StageButton').forEach(Button=>
    {
        const Selected=Number(Button.dataset.stage)===State.Stage;
        Button.classList.toggle('Active',Selected);
        Button.setAttribute('aria-pressed',String(Selected));
    });
    document.querySelector('.StageButton.Active')?.scrollIntoView({block:'nearest'});
    State.Dirty=State.Busy || !StageAt(State.Result,State.Stage) || State.Stage>=EarliestStage(State.Result?.Specification,State.Specification);
    Element('ExportObj').disabled=State.Dirty;
    Element('Regenerate').textContent=State.Busy?'Cancel & rebuild':`Rebuild through ${State.Stage===5.1?'5.1':'0'+State.Stage}`;
    document.querySelectorAll('#ParameterControls details').forEach((Section,Index)=>{Section.open=Index===StageOrder.indexOf(State.Stage);});
    const Changed=EarliestStage(State.Result?.Specification,State.Specification);
    const Stage=StageOrder.filter(n=>n<=State.Stage&&n<Changed).map(n=>StageAt(State.Result,n)).filter(Boolean).at(-1);
    Element('PaintPanel').hidden=State.Stage!==6;
    Element('MouldStudy').hidden=Stage?.Number!==6||State.Dirty||State.Painting;
    MouldSection=null;ClayMaterial.clippingPlanes=[];CutMaterial.clippingPlanes=[];ClayMaterial.side=THREE.FrontSide;CutMaterial.side=THREE.FrontSide;
    State.DisplayStage=Stage?.Number||0;
    if (State.Dirty)
    {
        Element('StageDescription').textContent=`Stage ${State.Stage} needs rebuilding. ${Stage?`Showing stage ${Stage.Number} as input.`:'No current input mesh.'} ${Description}`;
        SetStatus(`Rebuild through stage ${State.Stage} · later stages will not run`,true);
    }
    const Name=State.Selected?.name;
    const Isolated=State.Isolated;
    DisposeBodies();
    if (!Stage)
    {
        Element('Metrics').textContent='No current mesh at this stage. Rebuild to continue.';
        Element('BodyCount').textContent='No current mesh';
        Element('TriangleCount').textContent='— triangles';
        DetailPainter?.refresh();
        return;
    }
    const Study=Stage.Number===6&&State.DetailView!=='Final';
    const Meshes=State.Painting?State.Result.Stages[0].Meshes:Study?Stage.Study[State.DetailView]:Stage.Meshes;
    Meshes.forEach((Mesh,Index)=>BodyGroup.add(BuildRenderBody(Mesh,Index)));
    if(Study&&['Hollow','Noisy'].includes(State.DetailView)){
        BodyGroup.updateWorldMatrix(true,false);
        MouldSection=new THREE.Plane(new THREE.Vector3(0,0,-1),-State.Specification.Depth*.45);
        ClayMaterial.clippingPlanes=[MouldSection.clone().applyMatrix4(BodyGroup.matrixWorld)];CutMaterial.clippingPlanes=ClayMaterial.clippingPlanes;
        ClayMaterial.side=THREE.DoubleSide;CutMaterial.side=THREE.DoubleSide;
        BodyGroup.children.forEach(Body=>{Body.castShadow=false;Body.receiveShadow=false;});
    }
    Element('ExportObj').textContent=State.Stage===6?'Export final OBJ':'Export OBJ';
    Element('Explode').disabled=State.Stage===6;
    if(Stage.Detail){const D=Stage.Detail;Element('MouldNumbers').textContent=`${D.refinedTriangles.toLocaleString()} mould triangles · ${D.affectedVertices??D.mouldVerticesMoved}/${D.mouldVerticesMoved} inner vertices influenced · signed offsets ${D.minimumOffset.toFixed(2)} to +${D.maximumOffset.toFixed(2)} m · ${D.removedVolume.toFixed(1)} m³ removed · ${(D.milliseconds/1000).toFixed(2)} s detail pass. ${Study?'Inspection only — export and diagnostics still describe the final rock.':D.affectedVertices===0?'All protected: stage-5.1 meshes retained exactly.':'One combined output mesh; source face tags consolidated.'}`;}
    if (Name)
    {
        const Match=BodyGroup.children.find(Body=>Body.name===Name);
        if (Match) SelectBody(Match,false);
        State.Isolated=Isolated && !!Match;
    }
    ApplyVisibility();
    UpdateMetrics();
    DetailPainter?.refresh();
    if(State.Painting){Element('BodyCount').textContent=(State.Specification.DetailMaskMode==='Auto'?'Auto mask':'Paint')+' preview · original stage 1';Element('TriangleCount').textContent=State.Result.Stages[0].Metrics.Triangles.toLocaleString()+' preview triangles';Element('QualityNote').textContent='Influence preview on source vertices, not output geometry. The refined mould can resolve finer falloff. Rebuild for final measurements.';Element('StageDescription').textContent=State.Specification.DetailMaskMode==='Auto'?'AUTO MASK PREVIEW on the original mass. Blue is protected; orange permits cutting. Orbit to inspect. Return to rock and rebuild stage 6 after changing settings.':'Paint on the ORIGINAL stage-1 mass. Blue is protected; orange permits cutting. This is the influence preview, not the final rock. Stop painting and rebuild stage 6 to apply.';Element('ExportObj').disabled=true;}
}

function UpdateMetrics()
{
    const Stage=StageAt(State.Result,State.DisplayStage);
    if (!Stage) return;
    const Metrics=Stage.Metrics;
    const Format=Value=>Value.toLocaleString('en');
    Element('Metrics').innerHTML=`<span>Closed mesh objects</span><b>${Metrics.Bodies}</b>
        <span>Vertices / triangles</span><b>${Format(Metrics.Vertices)} / ${Format(Metrics.Triangles)}</b>
        <span>Open / nonmanifold edges</span><b class="Pass">${Metrics.OpenEdges} / ${Metrics.NonmanifoldEdges}</b>
        <span>Nonmanifold vertices / duplicates</span><b class="Pass">${Metrics.NonmanifoldVertices} / ${Metrics.DuplicateTriangles}</b>
        <span>Degenerate / flipped winding</span><b class="Pass">${Metrics.ZeroArea} / ${Metrics.WindingErrors}</b>
        <span>${Stage.Detail?'Upstream spalls / fissures¹':'Local spalls / fissures'}</span><b>${Stage.Detail?.sourceSpalls??Metrics.Spalls} / ${Stage.Detail?.sourceCracks??Metrics.Cracks}</b>
        <span>Rejected spalls / fissures</span><b>${Metrics.RejectedSpalls} / ${Metrics.RejectedCracks}</b>
        <span>Triangles below 5°</span><b class="${Metrics.ThinTriangles?'Warn':'Pass'}">${Metrics.ThinTriangles}</b>
        <span>Minimum triangle angle</span><b>${Metrics.MinimumAngle.toFixed(2)}°</b>
        <span>Last requested rebuild</span><b>${(State.Milliseconds/1000).toFixed(2)} s</b>`;
    Element('QualityNote').textContent=State.Dirty ? `Showing stage ${State.DisplayStage} input, not the selected stage output. Export is disabled.` : Metrics.ThinTriangles ?
        'Narrow triangles remain at some clipped intersections; counted above, not hidden. Topology checks do not prove absence of all surface intersections.' :
        'Indexed export topology checked per body. No n-gons. Display wireframe includes every triangulation edge.';
    if(Stage.Detail&&Stage.Detail.affectedVertices!==0)Element('QualityNote').textContent+=' ¹Source-stage counts, not a recount after carving. Face tags and per-block selection are consolidated in this prototype.';
    if(Stage.Erosion){const E=Stage.Erosion;Element('QualityNote').textContent+=` Face erosion: ${E.changedRocks} rocks changed, ${E.limitedRocks} limited, ${E.rejectedRocks} rejected; max move ${E.maximumDisplacement.toFixed(3)} m; ${E.inwardVertices} inward / ${E.outwardVertices} outward vertices. ${(E.milliseconds/1000).toFixed(2)} s including intersection checks.`;}
    Element('BodyCount').textContent=`${Metrics.Bodies} closed mesh objects`;
    Element('TriangleCount').textContent=`${Format(Metrics.Triangles)} triangles`;
    if (!State.Dirty) SetStatus(`Stage ${State.Stage} · ${Metrics.ThinTriangles ? `${Metrics.ThinTriangles} narrow-triangle warnings` : 'Topology checked'} · seed ${State.Result.Specification.Seed}`,!!Metrics.ThinTriangles);
}

function ClearSelection()
{
    RenderRequested=true;
    if (SelectionOutline)
    {
        SelectionOutline.removeFromParent();
        SelectionOutline.geometry.dispose();
        SelectionOutline=null;
    }
    State.Selected=null;
    State.Isolated=false;
    Element('SelectionName').textContent='Cliff formation';
    Element('SelectionDetail').textContent='Double-click a rock to inspect it.';
    Element('Isolate').disabled=true;
    Element('Isolate').textContent='Isolate rock';
}

function SelectBody(Body, Focus=true)
{
    ClearSelection();
    State.Selected=Body;
    SelectionOutline=new THREE.LineSegments(new THREE.EdgesGeometry(Body.geometry,12),SelectionMaterial);
    Body.add(SelectionOutline);
    Element('SelectionName').textContent=Body.name;
    Element('SelectionDetail').textContent=`${Body.userData.Mesh.Triangles.length.toLocaleString()} triangles · ${Body.userData.Mesh.Spalls.length} spalls · ${Body.userData.Mesh.Cracks.length} fissures`;
    Element('Isolate').disabled=false;
    if (Focus) FrameView(Body);
}

function ApplyVisibility()
{
    RenderRequested=true;
    Renderer.shadowMap.needsUpdate=true;
    BodyGroup.children.forEach(Body=>
    {
        Body.visible=!State.Isolated || Body===State.Selected;
        const Centre=Body.userData.Centre;
        Body.position.set(State.Exploded&&State.Stage!==6?Centre.x*.15:0,State.Exploded&&State.Stage!==6?Centre.y*.14:0,State.Exploded&&State.Stage!==6?Centre.z*.13:0);
    });
    Element('Isolate').textContent=State.Isolated?'Restore cliff':'Isolate rock';
}

function FrameView(Body=null, Direction=null)
{
    RenderRequested=true;
    if (!BodyGroup.children.length) return;
    const View=Element('Viewport').getBoundingClientRect();
    Camera.aspect=View.width/Math.max(1,View.height);
    const Box=new THREE.Box3().setFromObject(Body||BodyGroup);
    const Middle=Box.getCenter(new THREE.Vector3());
    const Size=Box.getSize(new THREE.Vector3());
    const Offset=(Direction||new THREE.Vector3(.65,.48,.85)).clone().normalize();
    const Right=new THREE.Vector3().crossVectors(Offset,new THREE.Vector3(0,1,0)).normalize();
    if(Right.lengthSq()<.001)Right.set(1,0,0);
    const Up=new THREE.Vector3().crossVectors(Right,Offset).normalize();
    const Tangent=Math.tan(Camera.fov*Math.PI/360);
    let Distance=0;
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
        const P=new THREE.Vector3(Size.x*x,Size.y*y,Size.z*z);
        Distance=Math.max(Distance,P.dot(Offset)+Math.abs(P.dot(Right))/(Tangent*Camera.aspect),P.dot(Offset)+Math.abs(P.dot(Up))/Tangent);
    }
    Distance*=Body?1.1:1.13;
    Controls.target.copy(Middle);
    Camera.position.copy(Middle).addScaledVector(Offset,Distance);
    Camera.near=Math.max(.02,Distance/2000);
    Camera.far=Math.max(500,Distance*4);
    Controls.maxDistance=Math.max(450,Distance*3);
    Camera.updateProjectionMatrix();
    Controls.update();
}

let ShapePreviewTimer=null;
function MarkDirty()
{
    if (State.Busy)
    {
        State.Worker?.terminate();
        State.Worker=null;
        State.Busy=false;
        ++State.Revision;
        Element('Loading').hidden=true;
    }
    ViewStage(State.Stage);
    clearTimeout(ShapePreviewTimer);
    if(State.Stage===1) ShapePreviewTimer=setTimeout(()=>Generate(),350);
}

function Generate()
{
    DetailPainter?.stop();
    clearTimeout(ShapePreviewTimer);
    if (State.Busy)
    {
        State.Worker?.terminate();
        State.Worker=null;
    }
    const Revision=++State.Revision;
    const Initial=!State.Result;
    const Reframe=Initial || ['Profile','Width','Height','Depth','RoutePoints','RouteWidth','CanyonGap','TransformPosition','TransformRotation','TransformScale'].some(Name=>JSON.stringify(State.Result.Specification[Name])!==JSON.stringify(State.Specification[Name]));
    State.Error=null;
    State.Busy=true;
    State.Dirty=true;
    Element('ExportObj').disabled=true;
    Element('Failure').hidden=true;
    Element('Loading').hidden=false;
    Element('LoadingTitle').textContent=`Rebuilding through stage ${State.Stage}`;
    Element('LoadingDetail').textContent='Reusing valid upstream checkpoints…';
    Element('Regenerate').textContent='Cancel & rebuild';
    SetStatus(`Building through stage ${State.Stage} only`);
    try
    {
        Object.assign(State.Specification,ReadSpecification(State.Specification));
        ViewportEditor.sync();
        for (const [Name,Value] of Object.entries(State.Specification))
        {
            const Input=Element(Name);
            if (Input) {Input.value=Value;UpdateRange(Input);}
        }
        const GenerationWorker=State.Worker||new Worker(new URL('./GenerationQueue.js',import.meta.url),{type:'module'});
        State.Worker=GenerationWorker;
        GenerationWorker.onmessage=Event=>
        {
            const Message=Event.data;
            if (Message.Revision!==State.Revision) return;
            if (Message.Progress)
            {
                Element('LoadingDetail').textContent=`Stage ${Message.Progress} · ${Message.Message||StageDescriptions[StageOrder.indexOf(Message.Progress)][0]}`;
                return;
            }
            if (Message.Error) {FailGeneration(Message.Error);return;}
            State.Result=Message.Result;
            State.Milliseconds=Message.Milliseconds;
            State.ReadyRevision=Revision;
            State.Busy=false;
            Element('Loading').hidden=true;
            ViewStage(State.Stage);
            if (new URLSearchParams(location.search).has('particles')&&Initial) ViewDocument(true);
            if (Reframe) FrameView();
            if (!State.Dirty)
            {
                const Warnings=StageAt(Message.Result,State.Stage).Metrics.ThinTriangles;
                const Quality=Warnings?` · ${Warnings} narrow-triangle warnings`:'';
                SetStatus(`Stage ${State.Stage} ready · calculated ${Message.Result.ExecutedStages.join(', ')||'none'} · reused ${Message.Result.ReusedStages.join(', ')||'none'}${Quality}`,Warnings>0);
            }
        };
        GenerationWorker.onerror=Event=>
        {
            if (State.Revision===Revision) FailGeneration(Event.message||'Geometry worker failed to load.');
        };
        GenerationWorker.postMessage({Revision,Specification:State.Specification,Through:State.Stage});
    }
    catch (Error)
    {
        FailGeneration(Error.message);
    }
}

function FailGeneration(Message)
{
    State.Worker?.terminate();
    State.Worker=null;
    State.Result=null;
    State.Error=Message;
    State.Busy=false;
    State.Dirty=true;
    DisposeBodies();
    Renderer.shadowMap.needsUpdate=true;
    Element('ExportObj').disabled=true;
    Element('BodyCount').textContent='No generated mesh';
    Element('Metrics').textContent='No mesh available. Generation or rendering failed.';
    Element('Loading').hidden=true;
    Element('Failure').hidden=false;
    Element('Failure').textContent=`Generation failed: ${Message} No previous or prebaked geometry has been substituted. Change the recipe and rebuild.`;
    Element('Regenerate').textContent='Retry rebuild';
    SetStatus('Generation failed · export disabled',true);
}

function Download(Name, Content, Type)
{
    const Url=URL.createObjectURL(new Blob([Content],{type:Type}));
    const Link=document.createElement('a');
    Link.href=Url;
    Link.download=Name;
    Link.click();
    setTimeout(()=>URL.revokeObjectURL(Url),1000);
}

function ObjText()
{
    if (!State.Result || State.Dirty) throw new Error('Rebuild the current recipe before exporting.');
    const Stage=StageAt(State.Result,State.Stage);
    const Lines=[`# Frontier polygon cliff | stage ${State.Stage} | seed ${State.Result.Specification.Seed}`,
        '# metres; triangles only; formation placement applied; explosion view excluded; no textures or SDF','s off'];
    BodyGroup.updateWorldMatrix(true,false);
    let Offset=1;
    for (const Mesh of Stage.Meshes)
    {
        Lines.push(`o ${Mesh.Name.replace(/[^a-zA-Z0-9]+/g,'_')}`);
        Mesh.Vertices.forEach(Point=>Lines.push(`v ${new THREE.Vector3(...Point).applyMatrix4(BodyGroup.matrixWorld).toArray().map(Value=>Value.toFixed(8)).join(' ')}`));
        Mesh.Triangles.forEach(Triangle=>Lines.push(`f ${Triangle.map(Index=>Index+Offset).join(' ')}`));
        Offset+=Mesh.Vertices.length;
    }
    return Lines.join('\n')+'\n';
}

const Groups=[
    ['Cliff mass',true,[['Profile','Landform preset · applies size'],['Seed','Formation seed'],
        ['RouteSegments','Route segments',4,12,1,''],['RouteWidth','Rock thickness',3,10,.5,'m'],['RouteSmooth','Curve smoothing',0,1,.05,''],['ArchThickness','Arch band thickness',3,9,.5,'m'],['CanyonGap','Corridor width',5,16,.5,'m'],
        ['PeakCount','Major peaks · 0 = seeded',0,7,1,''],['PeakSpread','Peak / valley contrast',0,1,.05,''],['PeakSharpness','Peak sharpness',0,1,.05,''],['Lean','Formation lean',-1,1,.05,''],['Taper','Crown taper',0,.75,.05,''],['Terraces','Large shelves',0,1,.05,''],['BayDepth','Buttress / recess depth',0,1.5,.05,''],
        ['NoiseMode','Small surface relief'],['Variation','Small relief strength',0,1,.05,'×'],['NoiseScale','Small relief frequency',1,5,.1,'×'],
        ['Width','Width',10,80,.5,'m'],['Height','Height',10,56,.5,'m'],['Depth','Depth',8,24,.5,'m'],
        ['Relief','Buttress / bay relief',.35,1.3,.05,'×'],['Retreat','Crown retreat',.25,.65,.01,'×']]],
    ['Primary fractures',false,[['FractureStyle','Fracture preset'],['FractureSeed','Fracture seed'],
        ['Beds','Cut / bed count',4,10,1,''],['Dip','Family tilt',-8,8,.5,'°'],['Aperture','Fracture aperture',.035,.18,.005,'m'],
        ['FractureBend','Fracture roughness',0,1.5,.05,'×']]],
    ['Bounded joints',false,[['JointSpacing','Joint spacing',3,7,.2,'m'],['Penetration','Joint penetration',.55,.9,.01,'×'],['FaceRecess','Face recess scale',0,1.5,.05,'m']]],
    ['Edge spalls',true,[['SpallSize','Spall scale',.25,1.3,.05,'m'],['SpallDensity','Edge occupancy',0,1,.05,'×']]],
    ['Surface fissures',false,[['CrackLength','Maximum length',.5,2.2,.1,'m'],['CrackWidth','Mouth width',.07,.22,.01,'m'],
        ['CrackDepth','Maximum depth',.06,.3,.01,'m'],['CrackDensity','Face occupancy',0,1,.05,'×']]],
    ['Face erosion · 5.1',false,[['ErosionSeed','Face erosion seed'],['ErosionInward','Inward face depth',0,1.5,.05,'m'],['ErosionOutward','Outward bulge',0,.8,.025,'m'],['ErosionOutwardShare','Outward region share',0,.75,.05,''],['ErosionVariation','Face variation',0,1,.05,'']]],
    ['Mould detail · stage 6',false,[['DetailAutoCoverage','Auto coverage · threshold',0,1,.05,''],['DetailAutoSize','Auto patch size',2,20,.5,'m'],['DetailAutoFalloff','Auto gradient falloff',0,.8,.05,''],['DetailAutoSeed','Auto patch seed'],['DetailAutoHeightBias','Auto height bias · lower / upper',-1,1,.1,''],['DetailPattern','Noise shape'],['DetailCoverage','Paint trim · ignored in Auto',0,1,.05,''],['DetailSeed','Noise seed',0,999999,1,''],['DetailSpacing','Mould triangle spacing',.4,1.8,.05,'m'],['DetailAmplitude','Noise displacement',0,.8,.05,'m'],['DetailBias','Cut depth / penetration',-.15,1.5,.01,'m'],['DetailScale','Noise wavelength',1,6,.1,'m'],['DetailAnisotropy','Vertical frequency',1,3,.1,'×']]],
    ['Triangulation',false,[['TriangleSpan','Target edge span',.8,2.2,.1,'m']]]
];
function BuildControls()
{
    Element('AutoMaskControls').replaceChildren();
    const Solid=State.Specification.ShapeMode==='Solid',Profile=State.Specification.Profile;
    const Supports={RouteSegments:RouteProfiles,RouteWidth:RouteProfiles,RouteSmooth:RouteProfiles,ArchThickness:['RockArch'],CanyonGap:['Canyon'],PeakCount:['Headland','Escarpment','Needles','WideWall','Amphitheatre'],PeakSpread:['Headland','Needles','WideWall','Amphitheatre','RouteCliff','Canyon'],Taper:['Headland','Escarpment','Spire'],Terraces:['Headland','Escarpment','Spire','Needles'],BayDepth:['Headland','Needles','WideWall','Amphitheatre']};
    const Labels={PeakCount:Profile==='Escarpment'?'Terrace count':Profile==='Needles'?'Tower count':'Mass count',PeakSpread:'Mass height variation',PeakSharpness:'Crown bevel',Taper:'Upper mass narrowing',Terraces:Profile==='Needles'||Profile==='Spire'?'Pedestal height':'Shelf strength',BayDepth:Profile==='Amphitheatre'?'Cove opening':Profile==='WideWall'?'Ridge bend':'Mass spread'};
    const ControlGroups=Groups.map(([title,open,fields])=>[title,open,fields.filter(([name])=>!Solid||(!['NoiseMode','Variation','NoiseScale','Relief','Retreat'].includes(name)&&(!Supports[name]||Supports[name].includes(Profile)))).map(field=>Solid&&Labels[field[0]]?[field[0],Labels[field[0]],...field.slice(2)]:field)]);

    const Choices={DetailPattern:DetailPatterns,Profile:SolidLabels,NoiseMode:NoiseModes,FractureStyle:FractureStyles};
    if(Solid&&Profile!=='Spire'){const [a,b]=SolidCountRanges[Profile];Choices.PeakCount=Object.fromEntries([[0,'Seeded'],...Array.from({length:b-a+1},(_,i)=>[a+i,String(a+i)])]);}
    Element('ParameterControls').innerHTML=ControlGroups.map(([Title,Open,Fields])=>`<details ${Open?'open':''}><summary>${Title}</summary><div class="ControlGroup">${Fields.map(([Name,Label,Minimum,Maximum,Step,Unit])=>
    {
        if (Choices[Name]) return `<div class="Property"><label class="FieldLabel" for="${Name}">${Label}</label><select id="${Name}">${Object.entries(Choices[Name]).map(([Key,Title])=>`<option value="${Key}">${Title}</option>`).join('')}</select></div>`;
        if (Name.endsWith('Seed')) return `<div class="Property"><label class="FieldLabel" for="${Name}">${Label}<span class="Subtle">repeatable variation</span></label><div class="SeedRow"><input type="number" id="${Name}" min="0" max="999999" step="1"><button id="New${Name}">New seed</button></div></div>`;
        return `<div class="Property"><label class="FieldLabel" for="${Name}">${Label}<output id="${Name}Value"></output></label><input type="range" id="${Name}" min="${Minimum}" max="${Maximum}" step="${Step}" data-unit="${Unit}"></div>`;
    }).join('')}</div></details>`).join('');
    for(const Name of ['DetailAutoCoverage','DetailAutoSize','DetailAutoFalloff','DetailAutoSeed','DetailAutoHeightBias'])Element('AutoMaskControls').append(Element(Name).closest('.Property'));
    for (const [, ,Fields] of ControlGroups) for (const [Name] of Fields)
    {
        const Input=Element(Name);
        Input.value=State.Specification[Name];
        if(['PeakCount','PeakSpread','PeakSharpness','Lean','Taper','Terraces','BayDepth'].includes(Name))Input.disabled=State.Specification.ShapeMode==='Authored';
        UpdateRange(Input);
        Input.addEventListener('input',()=>
        {
            State.Specification[Name]=Choices[Name]?Input.value:Number(Input.value);
            if (Name==='Profile')
            {
                State.Specification.ShapeMode='Solid';
                Object.assign(State.Specification,structuredClone(SolidPresets[Input.value]));
                BuildControls();
            }
            UpdateRange(Input);
            MarkDirty();
        });
    }
    ViewportEditor?.sync();
    for (const Name of ['Seed','FractureSeed','DetailSeed','DetailAutoSeed','ErosionSeed']) Element(`New${Name}`).onclick=()=>
    {
        const Next=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;
        State.Specification[Name]=Next===State.Specification[Name]?(Next+1)%1000000:Next;
        Element(Name).value=State.Specification[Name];
        MarkDirty();
    };
}

function UpdateRange(Input)
{
    if (Input.type!=='range') return;
    Input.style.setProperty('--Fill',`${(Number(Input.value)-Number(Input.min))/(Number(Input.max)-Number(Input.min))*100}%`);
    const Output=Element(`${Input.id}Value`);
    if(Input.id==='PeakCount'&&Number(Input.value)===0){Output.textContent='Seeded';return;}
    if (Output) Output.textContent=`${Number(Input.value).toFixed(Number(Input.step)<.01?3:Number(Input.step)<1?2:0)} ${Input.dataset.unit||''}`;
}

Element('DetailView').onchange=Event=>{State.DetailView=Event.target.value;ViewStage(State.Stage);};
StageDescriptions.forEach(([Title,Subtitle],Index)=>
{
    const Button=document.createElement('button');
    Button.className='StageButton';
    const Number=StageOrder[Index];
    Button.dataset.stage=Number;
    Button.innerHTML=`<span class="Number">${Number===5.1?'5.1':'0'+Number}</span><span><strong>${Title}</strong><small>${Subtitle}</small></span>`;
    Button.onclick=()=>ViewStage(Number);
    Element('StageList').appendChild(Button);
});
ViewportEditor=CreateViewportEditor({scene:Scene,camera:Camera,renderer:Renderer,orbit:Controls,bodies:BodyGroup,getSpec:()=>State.Specification,onRouteChange:()=>MarkDirty(),onRender:()=>{RenderRequested=true;Renderer.shadowMap.needsUpdate=true;},onStatus:SetStatus});
BuildControls();
ViewStage(State.Stage);
Element('Regenerate').onclick=Generate;
Element('PreviousStage').onclick=()=>ViewStage(StageOrder[StageOrder.indexOf(State.Stage)-1]);
Element('NextStage').onclick=()=>ViewStage(StageOrder[StageOrder.indexOf(State.Stage)+1]);
Element('Frame').onclick=()=>FrameView();
Element('Front').onclick=()=>FrameView(null,new THREE.Vector3(0,.04,1));
Element('Top').onclick=()=>FrameView(null,new THREE.Vector3(0,1,.001));
Element('Side').onclick=()=>FrameView(null,new THREE.Vector3(1,.1,0));
Element('Rear').onclick=()=>FrameView(null,new THREE.Vector3(0,.18,-1));
Element('SelectCliff').onclick=()=>{ClearSelection();ApplyVisibility();};
Element('SelectCliff').ondblclick=()=>FrameView();
Element('ShowAll').onclick=()=>{ClearSelection();ApplyVisibility();FrameView();};
Element('Isolate').onclick=()=>{State.Isolated=!State.Isolated;ApplyVisibility();};
Element('Clay').onclick=()=>
{
    State.Mode='Clay';
    BodyGroup.children.forEach(Body=>{Body.material=ClayMaterial;});
    SetPressed('Clay',true);
    SetPressed('Scars',false);
};
Element('Scars').onclick=()=>
{
    State.Mode='Scars';
    BodyGroup.children.forEach(Body=>{Body.material=CutMaterial;});
    SetPressed('Clay',false);
    SetPressed('Scars',true);
};
Element('Wire').onclick=()=>
{
    State.Wire=!State.Wire;
    BodyGroup.children.forEach(Body=>{Body.children.find(Child=>Child.name==='Triangle edges').visible=State.Wire;});
    SetPressed('Wire',State.Wire);
};
Element('Explode').onchange=Event=>{State.Exploded=Event.target.checked;ApplyVisibility();};
Element('Ground').onchange=Event=>{Ground.visible=Grid.visible=Event.target.checked;RenderRequested=true;};
Element('Shadows').onchange=Event=>{Sun.castShadow=Event.target.checked;Renderer.shadowMap.needsUpdate=true;RenderRequested=true;};
Element('LightAngle').oninput=Event=>
{
    RenderRequested=true;
    Renderer.shadowMap.needsUpdate=true;
    const Angle=Number(Event.target.value)*Math.PI/180;
    Sun.position.set(Math.sin(Angle)*40,37,Math.cos(Angle)*40);
    Element('LightValue').textContent=`${Event.target.value}°`;
};
Element('ExportObj').onclick=()=>Download(`Cliff_${State.Specification.Profile}_${State.Specification.Seed}_Stage${State.Stage}.obj`,ObjText(),'text/plain');
Element('ExportRecipe').onclick=()=>Download(`Cliff_${State.Specification.Seed}.json`,JSON.stringify({Format:'Frontier.PolygonCliff',Version:12,Specification:State.Specification},null,2),'application/json');
Element('ImportRecipe').onclick=()=>Element('RecipeFile').click();
Element('RecipeFile').onchange=async Event=>
{
    try
    {
        const Recipe=JSON.parse(await Event.target.files[0].text());
        State.Specification=ReadRecipe(Recipe);
        DetailPainter?.resetHistory();
        BuildControls();
        Generate();
    }
    catch(Error)
    {
        SetStatus(`Recipe not loaded: ${Error.message}`,true);
    }
    Event.target.value='';
};
Renderer.domElement.addEventListener('dblclick',Event=>
{
    if (State.Painting || ViewportEditor.mode!=='View' || !State.Result || State.Dirty) return;
    const Rect=Renderer.domElement.getBoundingClientRect();
    const Ray=new THREE.Raycaster();
    Ray.setFromCamera(new THREE.Vector2((Event.clientX-Rect.left)/Rect.width*2-1,1-(Event.clientY-Rect.top)/Rect.height*2),Camera);
    const Hit=Ray.intersectObjects(BodyGroup.children.filter(Body=>Body.visible),false)[0];
    if (Hit)
    {
        SelectBody(Hit.object);
        const Content=Hit.object.userData.Mesh;
        State.SourceFace={Triangle:Content.Triangles[Hit.faceIndex].map(Index=>Content.Vertices[Index].slice()),BodyName:Content.Name,Stage:State.Stage,TriangleIndex:Hit.faceIndex};
    }
});
window.addEventListener('keydown',Event=>
{
    if (GrainStudy.Parameters.Active||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (Event.key.toLowerCase()==='f') FrameView(State.Selected);
    if (Event.key==='Escape') {ClearSelection();ApplyVisibility();}
});
Renderer.domElement.addEventListener('webglcontextlost',Event=>
{
    Event.preventDefault();
    FailGeneration('WebGL context lost. Reload the page to restore the viewport.');
    Element('Regenerate').disabled=true;
});
function Animate()
{
    requestAnimationFrame(Animate);
    if (GrainStudy.Parameters.Active) return;
    if (ResizePending)
    {
        ResizePending=false;
        RenderRequested=true;
        const Rect=Element('Viewport').getBoundingClientRect();
        Camera.aspect=Rect.width/Rect.height;
        Camera.updateProjectionMatrix();
        Renderer.setSize(Rect.width,Rect.height,false);
    }
    const Moved=Controls.update();
    if (Moved || RenderRequested)
    {
        RenderRequested=false;
        if(MouldSection){BodyGroup.updateWorldMatrix(true,false);ClayMaterial.clippingPlanes[0].copy(MouldSection).applyMatrix4(BodyGroup.matrixWorld);}
        Renderer.render(Scene,Camera);
        const Along=new THREE.Vector3(1,0,0).applyQuaternion(Camera.quaternion).multiplyScalar(5);
        const A=Controls.target.clone().project(Camera);
        const B=Controls.target.clone().add(Along).project(Camera);
        const PixelsPerMetre=Math.abs(B.x-A.x)*Renderer.domElement.clientWidth*.1;
        const ScaleLength=[.01,.02,.05,.1,.2,.5,1,2,5,10,20].filter(Length=>Length*PixelsPerMetre<=150).at(-1)||.01;
        document.querySelector('.ScaleBadge span').style.width=`${ScaleLength*PixelsPerMetre}px`;
        document.querySelector('.ScaleBadge b').textContent=`${ScaleLength} m`;
    }
}
function AcquireGrainSource()
{
    if (!State.Result||State.Dirty||State.Busy) throw new Error('Build the selected cliff stage before sampling its face.');
    let Source=State.SourceFace;
    if (!Source)
    {
        let Best=-Infinity;
        for (const Content of StageAt(State.Result,State.Stage).Meshes) for (let Index=0;Index<Content.Triangles.length;++Index)
        {
            if (State.Selected&&State.Selected.name!==Content.Name) continue;
            if (Content.Tags[Index]!=='Cliff') continue;
            const Triangle=Content.Triangles[Index].map(Vertex=>Content.Vertices[Vertex]);
            const A=new THREE.Vector3(...Triangle[1]).sub(new THREE.Vector3(...Triangle[0]));
            const B=new THREE.Vector3(...Triangle[2]).sub(new THREE.Vector3(...Triangle[0]));
            const Normal=A.cross(B),Area=Normal.length();
            if (Normal.z>0&&Area>Best) {Best=Area;Source={Triangle,BodyName:Content.Name,Stage:State.Stage,TriangleIndex:Index};}
        }
    }
    if (!Source) throw new Error('Select a larger exposed cliff face to sample.');
    return CaptureGrainSource(Source.Triangle,Source.BodyName,Source.Stage,Source.TriangleIndex);
}
const GrainStudy=CreateGrainPanel(Element('GrainWorkspace'),AcquireGrainSource,()=>StageAt(State.Result,State.Stage));
const DocumentNames={Geometry:'Cliff formation',Material:'Grain weathering'};
function ViewDocument(Material)
{
    if(Material&&State.Painting){DetailPainter.stop();ViewStage(State.Stage);}
    Element('GeometryWorkspace').hidden=Material;
    Controls.enabled=!Material;
    GrainStudy.SetActive(Material);
    for (const [Name,Active] of [['GeometryTab',!Material],['MaterialTab',Material]])
    {
        Element(Name).classList.toggle('active',Active);Element(Name).setAttribute('aria-selected',String(Active));
    }
    Element('DocumentName').value=DocumentNames[Material?'Material':'Geometry'];
    Element('DocumentExtension').textContent=Material?'.grain':'.cliff';
    Element('DocumentNote').textContent=Material?'Mineral particles · attached cliff patch · chemical weathering':'Stage 1 auto-preview · later stages rebuild on demand';
    Element('SaveActive').textContent=Material?'Save study':'Save recipe';
    Element('OpenActive').textContent=Material?'Open study':'Open recipe';
    Element('Status').textContent=Material?'Particle weathering · accelerated cycles, not geological years':'Cliff geometry · selected-stage rebuilds';
    Element('TriangleCount').hidden=Material;
    ResizePending=true;RenderRequested=true;
}
Element('GeometryTab').onclick=()=>ViewDocument(false);
Element('MaterialTab').onclick=()=>ViewDocument(true);
Element('DocumentName').oninput=Event=>
{
    const Name=GrainStudy.Parameters.Active?'Material':'Geometry';
    DocumentNames[Name]=Event.target.value;
    Element(`${Name}Tab`).querySelector('span').textContent=Event.target.value||'Untitled';
};
Element('SaveActive').onclick=()=>Element(GrainStudy.Parameters.Active?'GrainSave':'ExportRecipe').click();
Element('OpenActive').onclick=()=>Element(GrainStudy.Parameters.Active?'GrainLoad':'ImportRecipe').click();
Element('CliffSearch').oninput=Event=>document.querySelectorAll('.StageButton').forEach(Button=>{Button.hidden=!Button.textContent.toLowerCase().includes(Event.target.value.toLowerCase());});
window.GrainApp=GrainStudy;
DetailPainter=CreateDetailPainter({state:State,canvas:Renderer.domElement,camera:Camera,scene:Scene,bodies:BodyGroup,orbit:Controls,editor:()=>ViewportEditor,view:ViewStage,dirty:MarkDirty,render:()=>{RenderRequested=true;},status:SetStatus});
window.CliffApp={DetailPainter,State,Scene,Camera,Controls,Renderer,BodyGroup,ViewportEditor,Generate,ViewStage,FrameView,SelectBody,ObjText,
    SetSpecification:Specification=>{State.Specification=ReadSpecification({...State.Specification,...Specification});BuildControls();Generate();},
    FocusSpall:()=>
    {
        const Candidates=BodyGroup.children.flatMap(Body=>Body.userData.Mesh.Spalls.map(Spall=>({Body,Spall})));
        Candidates.sort((A,B)=>new THREE.Vector3(...A.Spall.Centre).distanceTo(new THREE.Vector3(0,8,0))-new THREE.Vector3(...B.Spall.Centre).distanceTo(new THREE.Vector3(0,8,0)));
        const Selected=Candidates.find(Candidate=>Candidate.Spall.Size>.45)||Candidates[0];
        if (!Selected) return false;
        SelectBody(Selected.Body,false);
        const Centre=Selected.Body.localToWorld(new THREE.Vector3(...Selected.Spall.Centre));
        Controls.target.copy(Centre);
        Camera.position.copy(Centre).add(new THREE.Vector3(2,1.3,4.8));
        Controls.update();
        return Selected.Body.name;
    }};
Animate();
Generate();
