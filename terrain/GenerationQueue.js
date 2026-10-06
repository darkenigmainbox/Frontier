//============================================================================================================================================
//                                                             GENERATIONQUEUE.JS
//============================================================================================================================================
// 📦 Cancellable browser worker with generation revisions and explicit topology rejection.

import {MouldSequence} from './MouldSequence.js';
import init from 'manifold-3d';
import WasmURL from 'manifold-3d/manifold.wasm?url';
let Kernel;
const Sequence=new MouldSequence(()=>Kernel??=init({locateFile:()=>WasmURL}).then(lib=>{lib.setup();return lib;}));
self.onmessage=async Event=>
{
    const {Revision,Specification,Through}=Event.data;
    try
    {
        const Started=performance.now();
        const Result=await Sequence.Generate(Specification,(Stage,Message)=>self.postMessage({Revision,Progress:Stage,Message}),Through);
        const AllStages=[...Result.Stages,...(Result.Erosion?[Result.Erosion]:[])];
        const Invalid=AllStages.find(Stage=>Stage.Metrics.OpenEdges || Stage.Metrics.NonmanifoldEdges || Stage.Metrics.WindingErrors || Stage.Metrics.ZeroArea || Stage.Metrics.NonmanifoldVertices || Stage.Metrics.DuplicateTriangles);
        if (AllStages.some(Stage=>Stage.Records.some(Record=>!Number.isFinite(Record.Volume) || Record.Volume<=0)))
            throw new Error('Non-finite or inverted solid; result rejected.');
        if (Invalid) throw new Error(`Stage ${Invalid.Number} failed topology validation; result rejected.`);
        self.postMessage({Revision,Result,Milliseconds:performance.now()-Started});
    }
    catch (Error)
    {
        self.postMessage({Revision,Error:Error.message});
    }
};
