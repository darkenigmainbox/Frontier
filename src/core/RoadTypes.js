export const ROAD_PRESETS = [
  {
    id:'highway',
    name:'Highway 6L',
    category:'Arterial',
    lanes:6, laneWidth:3.6, width: 22.5,
    median:true, medianWidth:2.0,
    shoulder:0.8, sidewalk:false,
    color:'#2b2f36', marking:'double-solid-dashed',
    speed:120, highway:true,
    desc:'Controlled-access 3+3 with concrete median'
  },
  {
    id:'avenue',
    name:'Urban Avenue 4L',
    category:'Urban',
    lanes:4, laneWidth:3.4, width:16.2,
    median:false, shoulder:0.5, sidewalk:true, sidewalkWidth:3.0,
    color:'#2e323a', marking:'solid-dashed',
    desc:'Downtown boulevard with parking & trees'
  },
  {
    id:'boulevard',
    name:'Boulevard 6L + Tram',
    category:'Urban',
    lanes:6, laneWidth:3.2, width:24,
    median:true, medianWidth:4.5, tram:true,
    sidewalk:true, sidewalkWidth:4,
    color:'#30343d', marking:'solid-dashed',
    desc:'Grand boulevard with central tram corridor'
  },
  {
    id:'street',
    name:'Residential 2L',
    category:'Local',
    lanes:2, laneWidth:3.2, width:10.5,
    sidewalk:true, sidewalkWidth:2.2,
    color:'#343840', marking:'dashed',
    desc:'Quiet neighbourhood street, parking both sides'
  },
  {
    id:'oldtown',
    name:'Old Town Cobble',
    category:'Local',
    lanes:2, laneWidth:3.0, width:8.5,
    sidewalk:true, sidewalkWidth:2.0, cobble:true,
    color:'#3b3a36', marking:'none',
    desc:'Historic stone paving, narrow'
  },
  {
    id:'industrial',
    name:'Industrial 2L Wide',
    category:'Industrial',
    lanes:2, laneWidth:4.0, width:12,
    shoulder:1.0, sidewalk:false,
    color:'#2f3338', marking:'solid',
    desc:'Heavy vehicle route'
  },
  {
    id:'rural',
    name:'Country Rural 2L',
    category:'Rural',
    lanes:2, laneWidth:3.3, width:9.5,
    shoulder:0.9, sidewalk:false, verge:true,
    color:'#3a3e44', marking:'dashed',
    desc:'Two-lane countryside, grass verge'
  },
  {
    id:'dirt',
    name:'Dirt / Offroad',
    category:'Offroad',
    lanes:1, laneWidth:3.5, width:5.5,
    dirt:true, sidewalk:false,
    color:'#4a3f2e', marking:'none',
    desc:'Unpaved trail, dust & ruts'
  },
  {
    id:'gravel',
    name:'Gravel Service',
    category:'Offroad',
    lanes:1, laneWidth:3.2, width:5.0,
    gravel:true, sidewalk:false,
    color:'#5a5a52', marking:'none',
    desc:'Forest service road'
  },
  {
    id:'ramp',
    name:'Highway Ramp 1L',
    category:'Arterial',
    lanes:1, laneWidth:3.8, width:6.5,
    shoulder:0.6, sidewalk:false, ramp:true,
    color:'#2b2f36', marking:'solid',
    desc:'On/off ramp, superelevated'
  }
];
export function getPreset(id){ return ROAD_PRESETS.find(p=>p.id===id) || ROAD_PRESETS[3]; }
export function presetWidth(p){ return p.width; }
