import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCar } from './model.js';
import { PARTS } from './parts.js';

const $ = selector => document.querySelector(selector);
const categoryNames={exterior:'外观与车身',chassis:'底盘与动力',interior:'座舱与内饰'};
const modeNames={exterior:'整车外观',xray:'透视结构',exploded:'部件分解',wireframe:'线框视图'};
const state={mode:'exterior',selectedId:null,labelsVisible:true,lightsOn:true};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,scene,camera,controls,car,frameId,environmentTarget,contextLost=false;
let cameraTransition=null,explosion=0,lastTime=performance.now(),down=null;
let selectionOutline=null,dirty=true;
const activePointers=new Set();let multiPointerGesture=false;
const materialCache=new Map(),edgeCache=new Map();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const viewport=$('#viewport'),labelLayer=$('#labels');
const presets={perspective:[-6.1,2.65,6.1],front:[-8.2,1.55,0],side:[0,1.7,8.3],rear:[7.4,2.15,3.9],top:[0,9,.01]};

function showError(message) {
  $('#loading').hidden=true;
  const error=$('#load-error');error.hidden=false;
  if(message)error.querySelector('p').textContent=message;
  $('#view-status').textContent='场景未连接';
}

function renderList() {
  const term=$('#part-search').value.trim().toLocaleLowerCase();
  const category=$('#category-filter').value;
  const filtered=PARTS.filter(p=>(category==='all'||p.category===category)&&`${p.name} ${p.id} ${p.description} ${p.specs.map(s=>`${s.label} ${s.value}`).join(' ')}`.toLocaleLowerCase().includes(term));
  $('#visible-count').textContent=`${filtered.length} / ${PARTS.length}`;
  const list=$('#part-list');list.replaceChildren();
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='没有匹配的部件，试试其他关键词或分类。';list.append(empty);return;}
  for(const part of filtered){
    const button=document.createElement('button');button.type='button';button.dataset.part=part.id;
    button.setAttribute('aria-pressed',String(state.selectedId===part.id));
    const num=document.createElement('span');num.className='part-number';num.textContent=String(PARTS.indexOf(part)+1).padStart(2,'0');
    const title=document.createElement('span');title.className='part-name';title.textContent=part.name;
    const arrow=document.createElement('span');arrow.className='part-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    button.append(num,title,arrow);button.addEventListener('click',()=>selectPart(part.id));list.append(button);
  }
}
function showDetails(id) {
  const part=PARTS.find(p=>p.id===id);
  $('#detail-name').textContent=part?part.name:'小米 SU7';
  $('#detail-category').textContent=part?categoryNames[part.category]:'整车概览';
  $('#detail-description').textContent=part?part.description:'从流畅的车身轮廓，到轮组、灯组和座舱，选择部件探索它的设计。模型以参考照片进行外观近似复原，内部采用通用教学示意。';
  $('#detail-note').textContent=part?part.note:'照片未确认的结构不作为官方工程数据。通过右上角说明查看建模边界。';
  const specs=part?part.specs:[{label:'部件数量',value:'17 个可选系统'},{label:'车身长度',value:'约 5 m · 建模比例'},{label:'内部布局',value:'通用示意'}];
  const dl=$('#detail-specs');dl.replaceChildren();
  specs.forEach(({label,value})=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);});
  $('#selection-clear').disabled=!part;
}

function variantFor(base,key) {
  let variants=materialCache.get(base);
  if(!variants){variants=new Map();materialCache.set(base,variants);}
  if(!variants.has(key))variants.set(key,base.clone());
  return variants.get(key);
}
function updateMaterials() {
  if(!car)return;
  dirty=true;
  const exteriorIds=new Set(PARTS.filter(p=>p.category==='exterior').map(p=>p.id));
  car.root.traverse(obj=>{
    if(!obj.isMesh || !obj.userData.baseMaterial)return;
    const base=obj.userData.baseMaterial,id=obj.userData.partId,selected=state.selectedId===id;
    const ext=exteriorIds.has(id);
    const key=`${state.mode}-${selected}-${ext}`;
    const mat=variantFor(base,key);
    if(base.color&&mat.color)mat.color.copy(base.color);
    if(base.emissive&&mat.emissive){mat.emissive.copy(base.emissive);mat.emissiveIntensity=base.emissiveIntensity;}
    mat.transparent=base.transparent;mat.opacity=base.opacity;mat.depthWrite=base.depthWrite;
    mat.wireframe=state.mode==='wireframe';
    if(state.mode==='xray'&&ext){mat.transparent=true;mat.opacity=selected?.64:(id==='glazing'?.09:.115);mat.depthWrite=false;obj.renderOrder=2;}
    else{obj.renderOrder=0;}
    if(state.mode==='wireframe'){mat.transparent=true;mat.opacity=selected?1:.50;}
    if(selected && mat.emissive){mat.emissive.set('#1dbbc9');mat.emissiveIntensity=.65;}
    obj.material=mat;
  });
  updateOutline();
}
function updateOutline(){
  if(selectionOutline){selectionOutline.parent?.remove(selectionOutline);selectionOutline=null;}
  if(!state.selectedId)return;
  const record=car.parts.get(state.selectedId);if(!record)return;
  const group=new THREE.Group();group.name='selection-outline';
  record.group.updateWorldMatrix(true,true);
  record.group.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh)return;
    let geo=edgeCache.get(mesh.geometry);
    if(!geo){geo=new THREE.EdgesGeometry(mesh.geometry,32);edgeCache.set(mesh.geometry,geo);}
    const line=new THREE.LineSegments(geo,outlineMaterial);line.matrixAutoUpdate=false;
    line.matrix.copy(mesh.matrixWorld).premultiply(record.group.matrixWorld.clone().invert());
    line.renderOrder=4;group.add(line);
  });
  record.group.add(group);selectionOutline=group;
}
const outlineMaterial=new THREE.LineBasicMaterial({color:'#7af5ff',transparent:true,opacity:.72,depthTest:true});

function setMode(mode) {
  if(!(mode in modeNames))return;
  state.mode=mode;
  $('#mode-buttons').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#view-status').textContent=modeNames[mode];
  updateMaterials();
  if(mode==='exploded'){setCamera('perspective',true);controls.maxDistance=19;}
  else controls.maxDistance=14;
  buildLabels();
}
function selectPart(id) {
  if(!car?.parts.has(id))return;
  const meta=PARTS.find(p=>p.id===id);
  // Reveal hidden teaching components before highlighting them.
  if(state.mode==='exterior'&&meta.category!=='exterior'&&id!=='wheels')setMode('xray');
  state.selectedId=id;
  renderList();showDetails(id);updateMaterials();buildLabels();
  $('#selection-announcement').textContent=`已选择${meta.name}，${meta.specs[0].label}：${meta.specs[0].value}。`;
  if(matchMedia('(max-width:760px)').matches){
    const content=$('.detail-content').cloneNode(true);
    content.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    content.querySelectorAll('button').forEach(node=>node.remove());
    $('#mobile-detail-content').replaceChildren(content);
    if(!$('#part-dialog').open)$('#part-dialog').showModal();
  }
}
function clearSelection(){state.selectedId=null;renderList();showDetails(null);updateMaterials();buildLabels();}

function setCamera(name,expanded=false) {
  dirty=true;
  const p=presets[name]||presets.perspective;
  const distanceScale=(expanded||state.mode==='exploded')?1.34:1;
  const target=new THREE.Vector3(0,state.mode==='exploded'?1.0:.72,0);
  const position=new THREE.Vector3(...p).multiplyScalar(distanceScale);
  if(reducedMotion){camera.position.copy(position);controls.target.copy(target);controls.update();}
  else cameraTransition={start:performance.now(),from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target};
  $('#camera-buttons').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===name)));
}

const labelNodes=[];
function buildLabels(){
  dirty=true;
  labelLayer.replaceChildren();labelNodes.length=0;
  if(!car||!state.labelsVisible)return;
  let ids=state.selectedId?[state.selectedId]:(state.mode==='xray'?['battery','rear-drive','seats']:state.mode==='exploded'?['hood','roof','wheels','battery']:['headlights','roof','wheels']);
  ids.forEach(id=>{
    const info=PARTS.find(p=>p.id===id),record=car.parts.get(id);if(!info||!record)return;
    const node=document.createElement('div');node.className='part-label';
    const title=document.createElement('strong');title.textContent=info.name;
    const small=document.createElement('small');small.textContent=info.specs[0].value;
    node.append(title,small);labelLayer.append(node);labelNodes.push({node,record});
  });
}
const projected=new THREE.Vector3();
function updateLabels(){
  const rect=viewport.getBoundingClientRect(),placed=[];
  for(const {node,record} of labelNodes){
    projected.copy(record.anchor).add(record.group.position).project(camera);
    const x=(projected.x*.5+.5)*rect.width,y=(-projected.y*.5+.5)*rect.height;
    const visible=projected.z>-1&&projected.z<1&&x>35&&x<rect.width-35&&y>70&&y<rect.height-62;
    node.hidden=!visible;if(!visible)continue;
    let yy=y-35;
    while(placed.some(p=>Math.abs(p.x-x)<155&&Math.abs(p.y-yy)<47))yy-=48;
    yy=Math.max(65,yy);
    node.style.left=`${THREE.MathUtils.clamp(x,85,rect.width-85)}px`;node.style.top=`${yy}px`;
    placed.push({x,y:yy});
  }
}

function refreshEnvironment(){
  environmentTarget?.dispose();
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  environmentTarget=pmrem.fromScene(room,.04);scene.environment=environmentTarget.texture;room.dispose();pmrem.dispose();
}
function buildStage(){
  scene.background=new THREE.Color('#0a141c');scene.fog=new THREE.Fog('#0a141c',12,30);
  refreshEnvironment();
  scene.environmentIntensity=.65;
  scene.add(new THREE.HemisphereLight('#a9e9ff','#17303e',.9));
  const key=new THREE.DirectionalLight('#e7f9ff',2.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key);
  const fill=new THREE.DirectionalLight('#39b9d4',1.2);fill.position.set(4,3,-5);scene.add(fill);
  const front=new THREE.DirectionalLight('#e2f0ff',.8);front.position.set(-6,1,-3);scene.add(front);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#0b151d',metalness:.1,roughness:.85,envMapIntensity:.25}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.014;scene.add(floor);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(3.65,3.7,.065,128),new THREE.MeshStandardMaterial({color:'#101f29',metalness:.2,roughness:.7,envMapIntensity:.3}));platform.position.y=-.045;platform.receiveShadow=true;scene.add(platform);
  const grid=new THREE.GridHelper(16,32,'#21434f','#18303d');grid.position.y=-.008;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  for(const radius of [3.12,3.61]){
    const pts=[];for(let i=0;i<=160;i++){const t=i/160*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*radius,.005,Math.sin(t)*radius));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:radius<3.5?'#264b57':'#2f8290',transparent:true,opacity:radius<3.5?.5:.7}));scene.add(line);
  }
  const textureCanvas=document.createElement('canvas');textureCanvas.width=128;textureCanvas.height=128;
  const ctx=textureCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,5,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(.5,'rgba(0,0,0,.3)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(6.3,3.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(textureCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;scene.add(shadow);
}

function resize(){
  if(!renderer)return;
  const w=viewport.clientWidth,h=viewport.clientHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;
  // A portrait stage needs a wider vertical frustum to preserve the entire car.
  camera.fov=w/h<.95?48:37;camera.updateProjectionMatrix();
  dirty=true;
}
function pick(event){
  if(contextLost)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const objects=[];car.root.traverse(o=>{if(o.isMesh&&o.userData.partId)objects.push(o);});
  const hits=raycaster.intersectObjects(objects,false);
  const hit=hits.find(h=>state.mode!=='xray'||PARTS.find(p=>p.id===h.object.userData.partId)?.category!=='exterior')||hits[0];
  if(hit)selectPart(hit.object.userData.partId);
}
function animate(now){
  frameId=requestAnimationFrame(animate);if(contextLost||document.hidden)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(cameraTransition){const t=THREE.MathUtils.clamp((now-cameraTransition.start)/750,0,1),k=t*t*(3-2*t);camera.position.lerpVectors(cameraTransition.from,cameraTransition.to,k);controls.target.lerpVectors(cameraTransition.targetFrom,cameraTransition.targetTo,k);if(t===1)cameraTransition=null;}
  const cameraChanged=controls.update(dt);
  const target=state.mode==='exploded'?1:0;
  const before=explosion;
  explosion=reducedMotion?target:THREE.MathUtils.damp(explosion,target,5,dt);
  const moving=Math.abs(before-explosion)>.0001;
  if(moving){for(const part of car.parts.values())part.group.position.copy(part.explode).multiplyScalar(explosion);renderer.shadowMap.needsUpdate=true;}
  if(dirty||cameraChanged||cameraTransition||moving){renderer.render(scene,camera);updateLabels();dirty=false;}
}

function wireUI(){
  $('#part-search').addEventListener('input',renderList);$('#category-filter').addEventListener('change',renderList);
  $('#selection-clear').addEventListener('click',clearSelection);
  $('#mode-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode);});
  $('#camera-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-camera]');if(b)setCamera(b.dataset.camera);});
  $('#paint-colors').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;car.paintMaterials.forEach(m=>m.color.set(b.dataset.color));$('#paint-colors').querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));updateMaterials();});
  $('#auto-rotate').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('#auto-rotate').setAttribute('aria-pressed',String(controls.autoRotate));});
  $('#labels-toggle').addEventListener('click',()=>{state.labelsVisible=!state.labelsVisible;$('#labels-toggle').setAttribute('aria-pressed',String(state.labelsVisible));buildLabels();});
  $('#light-toggle').addEventListener('click',()=>{state.lightsOn=!state.lightsOn;$('#light-toggle').setAttribute('aria-pressed',String(state.lightsOn));car.lightMaterials.forEach(m=>m.emissiveIntensity=state.lightsOn?2.8:0);updateMaterials();});
  $('#reset-view').addEventListener('click',()=>{controls.autoRotate=false;$('#auto-rotate').setAttribute('aria-pressed','false');controls.target.set(0,.72,0);setCamera('perspective');});
  for(const name of ['help','about'])$('#'+name+'-open').addEventListener('click',()=>$('#'+name+'-dialog').showModal());
  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeDialog).close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
}

try {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','可旋转缩放的 SU7 三维模型，亦可通过部件清单选择');canvas.tabIndex=0;viewport.prepend(canvas);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.05,100);camera.position.set(...presets.perspective);
  controls=new OrbitControls(camera,canvas);controls.target.set(0,.72,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=3.8;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.65;controls.update();
  buildStage();car=createCar();scene.add(car.root);
  controls.addEventListener('start',()=>{cameraTransition=null;});
  canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size>1){multiPointerGesture=true;down=null;}else down={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};});
  canvas.addEventListener('pointerup',e=>{if(!multiPointerGesture&&down&&down.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6&&performance.now()-down.time<650)pick(e);activePointers.delete(e.pointerId);down=null;if(!activePointers.size)multiPointerGesture=false;});
  canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;if(!activePointers.size)multiPointerGesture=false;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;showError('图形连接已中断。请关闭其他高负载页面，然后重新加载。');});
  canvas.addEventListener('webglcontextrestored',()=>{try{refreshEnvironment();contextLost=false;$('#load-error').hidden=true;$('#view-status').textContent=modeNames[state.mode];lastTime=performance.now();dirty=true;renderer.shadowMap.needsUpdate=true;}catch(error){console.error(error);showError('图形连接恢复失败，请重新加载页面。');}});
  new ResizeObserver(resize).observe(viewport);resize();wireUI();renderList();showDetails(null);updateMaterials();buildLabels();
  renderer.render(scene,camera);$('#loading').hidden=true;
  window.__SU7_DEBUG__={renderer,scene,camera,car,getState:()=>({...state,partCount:car.parts.size,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),projectPart(id){const p=car.parts.get(id);if(!p)return null;const v=p.anchor.clone().add(p.group.position).project(camera),r=canvas.getBoundingClientRect();return{x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};}};
  requestAnimationFrame(animate);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);});
  window.addEventListener('pageshow',e=>{if(e.persisted){lastTime=performance.now();requestAnimationFrame(animate);}});
} catch(error) {
  console.error('SU7 scene initialization failed:',error);
  showError('无法初始化三维场景。请通过 HTTP 服务打开页面，使用支持 WebGL 2 的浏览器并开启硬件加速。');
}
