export function cameraEye(cam){
  const cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
  const dir=[sy*cp, sp, -cy*cp];
  return cam.target.map((v,i)=>v - dir[i]*cam.distance);
}
export function flyLook(cam, dx, dy){
  cam.yaw -= dx*0.006;
  cam.pitch = Math.max(0.08, Math.min(1.35, cam.pitch + dy*0.005));
}
export function flyMove(cam, keys, dt, speed){
  if(!keys.size) return;
  const eye=cameraEye(cam);
  const forward=[eye[0]-cam.target[0], eye[1]-cam.target[1], eye[2]-cam.target[2]];
  const len=Math.hypot(...forward)||1;
  const fwd=forward.map(v=>-v/len);
  const right=[Math.cos(cam.yaw),0,-Math.sin(cam.yaw)];
  const up=[0,1,0];
  let move=[0,0,0];
  const add=(vec, s)=>{ move[0]+=vec[0]*s; move[1]+=vec[1]*s; move[2]+=vec[2]*s; };
  if(keys.has("KeyW")) add(fwd,1);
  if(keys.has("KeyS")) add(fwd,-1);
  if(keys.has("KeyA")) add(right,-1);
  if(keys.has("KeyD")) add(right,1);
  if(keys.has("KeyQ")) add(up,-1);
  if(keys.has("KeyE")) add(up,1);
  const ml=Math.hypot(...move);
  if(ml>0){
    move=move.map(v=>v/ml*dt*speed*(keys.has("ShiftLeft")||keys.has("ShiftRight")?4:1));
    cam.target[0]+=move[0]; cam.target[1]+=move[1]; cam.target[2]+=move[2];
  }
}
export const FLIGHT_KEYS=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","ShiftLeft","ShiftRight"]);
