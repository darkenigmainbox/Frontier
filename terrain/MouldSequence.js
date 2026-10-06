import {BuildFaceErosion} from './FaceErosion.js';
// Async extension: the original five-stage generator remains synchronous and unchanged.
import {CliffSequence} from './FractureSequence.js';
import {EarliestStage} from './CliffSpecification.js';
import {BuildMouldDetail} from './MouldDetail.js';
export class MouldSequence {
 constructor(loadKernel){this.sequence=new CliffSequence();this.loadKernel=loadKernel;this.detail=null;this.erosion=null;this.specification=null;}
 async Generate(input,progress=()=>{},through=6){
  through=Number(through)===5.1?5.1:Math.max(1,Math.min(6,Math.round(through)));
  const result=this.sequence.Generate(input,progress,Math.min(5,through));
  if(EarliestStage(this.specification,result.Specification)<=5.1)this.erosion=null;
  if(EarliestStage(this.specification,result.Specification)<=6)this.detail=null;
  this.specification=result.Specification;
  result.Stages=result.Stages.slice(0,Math.min(5,through));result.Through=through;
  if(through>=5.1){
   if(this.erosion)result.ReusedStages.push(5.1);
   else{progress(5.1,'Deforming individual rock faces');this.erosion=BuildFaceErosion(result.Stages[4],result.Specification,message=>progress(5.1,message));result.ExecutedStages.push(5.1);result.Timings[5.1]=this.erosion.Erosion.milliseconds;}
   result.Erosion=this.erosion;
  }
  if(through===6){
   if(this.detail)result.ReusedStages.push(6);
   else{
    progress(6,'Loading triangle boolean kernel');
    const lib=await this.loadKernel();
    this.detail=BuildMouldDetail(result.Stages[0],this.erosion,result.Specification,lib,message=>progress(6,message));
    this.detail.Study.Fractured=result.Stages[4].Meshes;
    result.ExecutedStages.push(6);result.Timings[6]=this.detail.Detail.milliseconds;
   }
   result.Stages.push(this.detail);
  }
  return result;
 }
}
