import * as THREE from 'three';
import { buildMechanicalParts } from './components.js';

// A photograph-informed procedural study, not manufacturer CAD.
const profile = [
  [-2.49,.71,.66,.19],[-2.38,.82,.83,.20],[-2.12,.94,.94,.20],
  [-1.60,1.01,.982,.21],[-.85,1.02,.961,.22],[0,1.015,.956,.22],
  [.85,1.025,.977,.22],[1.6,1.015,.973,.22],[2.12,.97,.926,.22],
  [2.38,.90,.855,.24],[2.49,.79,.715,.29]
];
function sample(rows,x) {
  let i=0; while(i<rows.length-2 && x>rows[i+1][0])i++;
  const a=rows[i],b=rows[i+1],t=THREE.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1);
  const smooth=t*t*(3-2*t);
  return a.slice(1).map((v,j)=>THREE.MathUtils.lerp(v,b[j+1],smooth));
}
function bodyPoint(x,theta) {
  const [top,w,bottom]=sample(profile,x), center=(top+bottom)/2;
  const c=Math.cos(theta),s=Math.sin(theta);
  return new THREE.Vector3(x,center+Math.sign(c)*Math.pow(Math.abs(c),.55)*(top-bottom)/2,w*Math.sign(s)*Math.pow(Math.abs(s),.6));
}
function sideZ(x,y) {
  const [top,w,bottom]=sample(profile,x), c=THREE.MathUtils.clamp(Math.abs((y-(top+bottom)/2)/((top-bottom)/2)),0,1);
  return w*Math.pow(Math.sqrt(1-Math.pow(c,2/.55)),.6);
}
function upperY(x,z) {
  const [top,w,bottom]=sample(profile,x),s=THREE.MathUtils.clamp(Math.abs(z)/w,0,.999);
  return (top+bottom)/2+(top-bottom)/2*Math.pow(Math.sqrt(1-Math.pow(s,2/.6)),.55);
}
function meshGrid(fn,nu,nv,material,omit) {
  const positions=[],indices=[];
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const p=fn(i/nu,j/nv);positions.push(p.x,p.y,p.z);}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
    const a=i*(nv+1)+j,b=a+nv+1,c=b+1,d=a+1;
    if(omit && omit(fn((i+.5)/nu,(j+.5)/nv)))continue;
    indices.push(a,b,d,b,c,d);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function curve(points,material,r=.009,closed=false,segments=60){
  const c=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)),closed,'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(c,segments,r,6,closed),material);
}
function box(w,h,d,mat,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;return mesh;}
function ellipsoid(rx,ry,rz,mat,x,y,z){const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),mat);m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;return m;}
function wheelHole(p){return Math.abs(p.z)>.64 && [-1.51,1.49].some(x=>Math.hypot(p.x-x,p.y-.365)<.403);}

export function createCar() {
  const root=new THREE.Group(),parts=new Map();root.name='程序化 SU7 外观研究';
  const paint=new THREE.MeshPhysicalMaterial({color:'#16c5c5',metalness:.65,roughness:.25,clearcoat:.75,clearcoatRoughness:.16,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:'#10161b',metalness:.45,roughness:.36,side:THREE.DoubleSide});
  const seam=new THREE.MeshStandardMaterial({color:'#123335',metalness:.4,roughness:.4});
  const chrome=new THREE.MeshStandardMaterial({color:'#b0c3c9',metalness:.95,roughness:.2});
  const glass=new THREE.MeshPhysicalMaterial({color:'#091922',metalness:.12,roughness:.2,clearcoat:.75,envMapIntensity:.5,transparent:true,opacity:.93,side:THREE.DoubleSide});
  const mirrorGlass=new THREE.MeshStandardMaterial({color:'#3e5158',metalness:.8,roughness:.2,envMapIntensity:.45});
  const white=new THREE.MeshStandardMaterial({color:'#cefcff',emissive:'#9bdfff',emissiveIntensity:2.8,roughness:.18});
  const red=new THREE.MeshStandardMaterial({color:'#ec3651',emissive:'#ff193f',emissiveIntensity:2.8,roughness:.25});
  const offWhite=white.clone(),offRed=red.clone();
  function part(id,anchor,explode){const group=new THREE.Group();group.name=id;root.add(group);const record={id,group,anchor:new THREE.Vector3(...anchor),explode:new THREE.Vector3(...explode)};parts.set(id,record);return group;}
  const body=part('body',[-.6,.7,.95],[0,.05,0]);
  body.add(meshGrid((u,v)=>bodyPoint(THREE.MathUtils.lerp(-2.49,2.49,u),v*Math.PI*2),250,100,paint,wheelHole));
  // Close the nose and tail, retaining a continuous, rounded perimeter.
  for(const x of [-2.49,2.49])body.add(meshGrid((u,v)=>{
    const p=bodyPoint(x,v*Math.PI*2),center=(sample(profile,x)[0]+sample(profile,x)[2])/2;
    p.y=THREE.MathUtils.lerp(center,p.y,u);p.z*=u;return p;
  },12,80,paint));
  // Wheel arch finishers follow the actual opening and hide its tessellated edge.
  for(const x of [-1.51,1.49])for(const s of [-1,1]){
    const ps=[];for(let i=0;i<=50;i++){const a=THREE.MathUtils.lerp(-.22,Math.PI+.22,i/50),xx=x+.405*Math.cos(a),y=.365+.405*Math.sin(a);ps.push([xx,y,s*(sideZ(xx,y)+.009)]);}
    body.add(curve(ps,dark,.013,false,70));
  }
  for(const s of [-1,1]){
    body.add(curve([[-1.18,.255,s*.91],[-.5,.23,s*.95],[.5,.23,s*.95],[1.18,.27,s*.91]],dark,.035));
    body.add(curve([[-1.18,.27,s*.927],[0,.26,s*.962],[1.18,.28,s*.927]],chrome,.006));
    // Shallow sculpted shoulder crease.
    const points=[];for(let i=0;i<=50;i++){const x=-1.12+2.45*i/50,y=.83+.035*Math.sin(i/50*Math.PI);points.push([x,y,s*(sideZ(x,y)+.002)]);}
    body.add(curve(points,paint,.007));
    body.add(box(.25,.09,.012,dark,-1.16,.87,s*.866));
    for(let k=0;k<3;k++)body.add(box(.17,.008,.013,chrome,-1.15,.85+k*.019,s*.878));
  }
  const hood=part('hood',[-1.55,.97,0],[-.38,.45,0]);
  hood.add(meshGrid((u,v)=>{const x=-2.24+1.28*u,z=(v*2-1)*(.40+.21*Math.sin(u*Math.PI*.7));return new THREE.Vector3(x,upperY(x,z)+.004,z);},48,28,paint));
  for(const s of [-1,1]){const p=[];for(let i=0;i<=35;i++){const u=i/35,x=-2.24+1.28*u,z=s*(.40+.21*Math.sin(u*Math.PI*.7));p.push([x,upperY(x,z)+.009,z]);}hood.add(curve(p,seam,.005));}
  hood.add(box(.045,.007,.06,chrome,-2.07,upperY(-2.07,0)+.012,0));

  const cabinProfile=[[-1.08,1.005,.79],[-.84,1.15,.76],[-.45,1.365,.67],[-.03,1.43,.655],[.50,1.405,.67],[.97,1.27,.72],[1.47,1.055,.79],[1.65,1.00,.79]];
  function cabinPoint(u,v){const x=-1.08+2.73*u,[y,w]=sample(cabinProfile,x),angle=(v-.5)*Math.PI;return new THREE.Vector3(x,1.0+(y-1.0)*Math.pow(Math.max(0,Math.cos(angle)),.55),Math.sin(angle)*w);}
  const glazing=part('glazing',[-.65,1.2,.48],[0,.52,0]);
  glazing.add(meshGrid(cabinPoint,100,48,glass));
  const roof=part('roof',[.17,1.44,0],[0,.88,0]);
  const roofGlass=new THREE.MeshPhysicalMaterial({color:'#08151c',metalness:.5,roughness:.18,clearcoat:1,side:THREE.DoubleSide});
  roof.add(meshGrid((u,v)=>{const x=-.42+1.08*u;const p=cabinPoint((x+1.08)/2.73,.17+.66*v);p.y+=.007;return p;},40,24,roofGlass));
  for(const s of [-1,1]){
    roof.add(curve([[-1.07,1.007,s*.79],[-.80,1.15,s*.745],[-.43,1.35,s*.635],[-.02,1.415,s*.62],[.50,1.39,s*.635],[.98,1.25,s*.69],[1.54,1.015,s*.79]],paint,.027));
    glazing.add(curve([[-1.04,1.013,s*.80],[-.40,1.01,s*.808],[.48,1.01,s*.81],[1.52,1.017,s*.80]],dark,.015));
    glazing.add(curve([[.24,1.01,s*.80],[.22,1.18,s*.765],[.20,1.395,s*.64]],dark,.023));
    glazing.add(curve([[1.10,1.01,s*.80],[.90,1.25,s*.70]],dark,.013));
  }
  const doors=part('doors',[.25,.76,.93],[0,.15,1.0]);
  for(const s of [-1,1])for(const [a,b] of [[-.96,.18],[.20,1.27]]){
    const ymin=.32,ymax=.993;
    doors.add(meshGrid((u,v)=>{const x=a+(b-a)*u,y=ymin+(ymax-ymin)*v;return new THREE.Vector3(x,y,s*(sideZ(x,y)+.004));},32,20,paint,wheelHole));
    const outline=[];
    for(let i=0;i<=20;i++){let x=a+(b-a)*i/20;outline.push([x,ymax,s*(sideZ(x,ymax)+.009)]);}
    for(let i=0;i<=20;i++){let y=ymax-(ymax-ymin)*i/20;outline.push([b,y,s*(sideZ(b,y)+.009)]);}
    for(let i=0;i<=20;i++){let x=b-(b-a)*i/20;outline.push([x,ymin,s*(sideZ(x,ymin)+.009)]);}
    for(let i=0;i<=20;i++){let y=ymin+(ymax-ymin)*i/20;outline.push([a,y,s*(sideZ(a,y)+.009)]);}
    if(outline.some(p=>wheelHole(new THREE.Vector3(...p)))){
      let run=[];
      const flush=()=>{if(run.length>1)doors.add(curve(run,seam,.004,false,Math.max(12,run.length*2)));run=[];};
      for(const point of outline){if(wheelHole(new THREE.Vector3(...point)))flush();else run.push(point);}
      flush();
    }else doors.add(curve(outline,seam,.004,true,90));
    const hx=b-.28,hy=.91,hz=s*(sideZ(hx,hy)+.012);
    doors.add(box(.16,.027,.021,seam,hx,hy,hz));doors.add(box(.136,.016,.024,paint,hx,hy+.003,hz+s*.005));
  }
  const mirrors=part('mirrors',[-.76,1.05,1.0],[0,.24,.6]);
  for(const s of [-1,1]){
    mirrors.add(curve([[-.78,1.01,s*.80],[-.77,1.02,s*.99]],dark,.026));
    mirrors.add(ellipsoid(.145,.066,.105,paint,-.78,1.06,s*1.045));
    mirrors.add(ellipsoid(.008,.043,.079,mirrorGlass,-.645,1.059,s*1.046));
    mirrors.add(curve([[-.85,1.048,s*1.119],[-.76,1.046,s*1.14],[-.69,1.047,s*1.112]],white,.004));
  }
  const headlights=part('headlights',[-2.23,.86,.66],[-.62,.05,0]);
  for(const s of [-1,1]){
    const outline=[[-2.41,.80,s*.41],[-2.30,.83,s*.76],[-2.08,.92,s*.87],[-2.10,.95,s*.69],[-2.29,.86,s*.43]];
    const flatCurve=(points,closed)=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],0,p[2])),closed,'centripetal');
    const boundary=flatCurve(outline,true);
    headlights.add(meshGrid((u,v)=>{const edge=boundary.getPoint(v),x=THREE.MathUtils.lerp(-2.25,edge.x,u),z=THREE.MathUtils.lerp(s*.66,edge.z,u);return new THREE.Vector3(x,upperY(x,z)+.009,z);},12,70,dark));
    const surfaceLine=(points,mat,r,closed=false)=>{
      const ps=flatCurve(points,closed).getPoints(100).map(p=>new THREE.Vector3(p.x,upperY(p.x,p.z)+.014,p.z));
      headlights.add(curve(ps,mat,r,closed,100));
    };
    surfaceLine(outline,seam,.0035,true);
    surfaceLine([[-2.39,.806,s*.43],[-2.29,.847,s*.64],[-2.12,.928,s*.83]],white,.009);
    surfaceLine([[-2.33,.825,s*.45],[-2.24,.855,s*.65],[-2.095,.93,s*.84]],white,.006);
    for(let k=0;k<4;k++){const z=.55+k*.065,x=-2.28+k*.038;headlights.add(ellipsoid(.018,.013,.017,white,x,upperY(x,z)+.022,s*z));}
  }
  // Sculpted bumper openings and lower air dam.
  body.add(box(.035,.19,1.20,dark,-2.493,.39,0));
  for(let i=0;i<6;i++)body.add(box(.042,.008,1.15,seam,-2.516,.31+i*.032,0));
  body.add(curve([[-2.40,.24,-.72],[-2.52,.235,-.4],[-2.535,.23,0],[-2.52,.235,.4],[-2.40,.24,.72]],dark,.035));
  for(const s of [-1,1])body.add(ellipsoid(.025,.107,.068,dark,-2.35,.49,s*.73));
  // Front plate and small, code-rendered lettering.
  const plateMat=new THREE.MeshStandardMaterial({color:'#e4f0e9',roughness:.42});
  body.add(box(.016,.10,.32,plateMat,-2.519,.55,0));
  const plateCanvas=document.createElement('canvas');plateCanvas.width=256;plateCanvas.height=80;const pc=plateCanvas.getContext('2d');pc.fillStyle='#e4f0e9';pc.fillRect(0,0,256,80);pc.fillStyle='#253c42';pc.font='bold 36px system-ui';pc.textAlign='center';pc.fillText('SU7',128,55);
  const plateTexture=new THREE.CanvasTexture(plateCanvas);plateTexture.colorSpace=THREE.SRGBColorSpace;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.30,.09),new THREE.MeshBasicMaterial({map:plateTexture}));plate.position.set(-2.530,.55,0);plate.rotation.y=-Math.PI/2;body.add(plate);
  const tail=part('taillights',[2.42,.87,.4],[.58,.18,0]);
  tail.add(curve([[2.22,.94,-.85],[2.39,.879,-.67],[2.47,.84,0],[2.39,.879,.67],[2.22,.94,.85]],dark,.048));
  tail.add(curve([[2.23,.952,-.85],[2.395,.90,-.67],[2.485,.858,0],[2.395,.90,.67],[2.23,.952,.85]],red,.014));
  tail.add(curve([[2.255,.91,-.83],[2.42,.85,-.65],[2.49,.814,0],[2.42,.85,.65],[2.255,.91,.83]],red,.009));
  body.add(curve([[2.15,1.014,-.81],[2.26,1.006,0],[2.15,1.014,.81]],paint,.023));
  body.add(box(.035,.16,1.12,dark,2.49,.49,0));
  for(const z of [-.58,-.32,0,.32,.58])body.add(box(.30,.09,.025,dark,2.25,.245,z));
  body.add(box(.023,.11,.38,dark,2.51,.55,0));
  const lidar=part('lidar',[-.28,1.47,0],[0,1.18,0]);
  lidar.add(ellipsoid(.11,.04,.105,dark,-.25,1.445,0));lidar.add(box(.15,.035,.16,dark,-.25,1.47,0));
  lidar.add(box(.005,.02,.12,glass,-.328,1.473,0));
  for(const p of buildMechanicalParts()){root.add(p.group);parts.set(p.id,p);}
  const paintMaterials=new Set();
  root.traverse(obj=>{if(obj.isMesh){obj.userData.baseMaterial=obj.material;obj.castShadow=true;obj.receiveShadow=true;if(obj.material===paint)paintMaterials.add(obj.material);}});
  for(const [id,p] of parts)p.group.traverse(obj=>{if(obj.isMesh)obj.userData.partId=id;});
  return {root,parts,paintMaterials:[...paintMaterials],lightMaterials:[white,red,offWhite,offRed]};
}
