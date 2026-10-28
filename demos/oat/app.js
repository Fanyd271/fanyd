'use strict';
const N=100, J=N/2, $=id=>document.getElementById(id);
const teal='#007f87', orange='#c46a25', ink='#142d36';
let tau=.025, phi=0, aligned=false, alpha=0, targetAlpha=0;
let playing=null, previous=0, yaw=-.78, pitch=.38;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function moments(t){
  const lc=x=>Math.log1p(-2*Math.sin(x/2)**2),l=lc(t),l2=lc(2*t);
  const mean=J*Math.exp((N-1)*l);
  const vx=Math.max(0,N*(N-1)/8*Math.expm1((N-2)*l2)-N*N/4*Math.expm1((2*N-2)*l));
  const vy=N/4-N*(N-1)/8*Math.expm1((N-2)*l2),vz=N/4;
  const c=N*(N-1)/4*Math.sin(t)*Math.exp((N-2)*l);
  const gap=Math.hypot(vy-vz,2*c),vp=(vy+vz+gap)/2,vm=(vy+vz-gap)/2;
  return {mean,vx,vy,vz,c,vp,vm,angle:t===0?0:.5*Math.atan2(2*c,vz-vy),xi:N*vm/(mean*mean)};
}
function preparedCov(m,a=alpha){
  const c=Math.cos(a),s=Math.sin(a);
  return {vx:m.vx,vy:c*c*m.vy+s*s*m.vz-2*c*s*m.c,
    vz:s*s*m.vy+c*c*m.vz+2*c*s*m.c,
    c:c*s*(m.vy-m.vz)+(c*c-s*s)*m.c};
}
function stateAt(m,p=phi,a=alpha){
  const v=preparedCov(m,a),c=Math.cos(p),s=Math.sin(p);
  const xx=v.vx*c*c+v.vy*s*s,yy=v.vx*s*s+v.vy*c*c,zz=v.vz;
  const xy=(v.vx-v.vy)*s*c,xz=-v.c*s,yz=v.c*c;
  return {xx,yy,zz,xy,xz,yz,vy:yy,vz:zz,c:yz,
    mean:[m.mean*c,m.mean*s,0],matrix:[[xx,xy,xz],[xy,yy,yz],[xz,yz,zz]]};
}
function current(m){return stateAt(m);}
function localPoint(m,t,u,a=alpha){
  const long=Math.sqrt(m.vp)*Math.cos(t)*Math.sin(u);
  const short=Math.sqrt(m.vm)*Math.sin(t)*Math.sin(u);
  const angle=Math.atan2(m.vp-m.vy,m.c||1e-30)+a;
  return [Math.sqrt(m.vx)*Math.cos(u),
    long*Math.cos(angle)-short*Math.sin(angle),
    long*Math.sin(angle)+short*Math.cos(angle)];
}
function worldPoint(m,t,u,p=phi,a=alpha){
  const q=localPoint(m,t,u,a),c=Math.cos(p),s=Math.sin(p);
  return [m.mean*c+c*q[0]-s*q[1],m.mean*s+s*q[0]+c*q[1],q[2]];
}
function setup(canvas){
  const d=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();
  canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);
  const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);
  return {ctx,w:r.width,h:r.height};
}
function text(ctx,s,x,y,size=11,col='#526971',align='center'){
  ctx.fillStyle=col;ctx.font=`${size}px "Microsoft YaHei", "PingFang SC", Arial`;
  ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);
}
function line(ctx,p,q,col,width=1,dash=[]){
  ctx.beginPath();ctx.setLineDash(dash);ctx.strokeStyle=col;ctx.lineWidth=width;
  ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.setLineDash([]);
}
function arrow(ctx,p,q,col,width=1){
  line(ctx,p,q,col,width);const a=Math.atan2(q[1]-p[1],q[0]-p[0]),r=5;
  ctx.beginPath();ctx.moveTo(q[0],q[1]);
  ctx.lineTo(q[0]-r*Math.cos(a-.42),q[1]-r*Math.sin(a-.42));
  ctx.lineTo(q[0]-r*Math.cos(a+.42),q[1]-r*Math.sin(a+.42));
  ctx.closePath();ctx.fillStyle=col;ctx.fill();
}
function trailOn(){return $('trail').checked;}
function plot3D(m,v){
  const {ctx,w,h}=setup($('ellipsoid')),scale=Math.min(w/190,h/180),cx=w*.50,cy=h*.49;
  function project([x,y,z]){
    const u=x*Math.cos(yaw)-y*Math.sin(yaw),d=x*Math.sin(yaw)+y*Math.cos(yaw);
    return [cx+scale*u,cy+scale*(d*Math.sin(pitch)-z*Math.cos(pitch)),d*Math.cos(pitch)+z*Math.sin(pitch)];
  }
  function path(points,col,width=1,dash=[]){
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=width;ctx.setLineDash(dash);
    points.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});
    ctx.stroke();ctx.setLineDash([]);
  }
  // Fixed laboratory axes: the mean is not subtracted from the coordinates.
  for(let q=-60;q<=60;q+=20){
    path([[-60,q,-40],[60,q,-40]],'#edf2f2');
    path([[q,-60,-40],[q,60,-40]],'#edf2f2');
  }
  const origin=project([0,0,0]);
  for(const [v,label,col] of [[[65,0,0],'Jx','#84959e'],[[0,65,0],'Jy',teal],[[0,0,44],'Jz',orange]]){
    path([v.map(x=>-x),v],col,.7);const end=project(v);
    arrow(ctx,origin,end,col,.9);const dx=end[0]-origin[0],dy=end[1]-origin[1],len=Math.hypot(dx,dy)||1;
    text(ctx,label,end[0]+12*dx/len,end[1]+12*dy/len,12,col,Math.abs(dx)<8?'center':dx>0?'left':'right');
  }
  const centerAt=p=>[m.mean*Math.cos(p),m.mean*Math.sin(p),0];
  function ghost(p,color){
    for(const t of [0,Math.PI/2]){
      const pts=[];for(let i=0;i<=52;i++)pts.push(worldPoint(m,t,2*Math.PI*i/52,p));path(pts,color,.8);
    }
    const eq=[];for(let i=0;i<=60;i++)eq.push(worldPoint(m,2*Math.PI*i/60,Math.PI/2,p));path(eq,color,.8);
  }
  if(trailOn()){
    const ring=[];for(let i=0;i<=120;i++)ring.push(centerAt(2*Math.PI*i/120));path(ring,'#c3d0d4',1,[4,4]);
    if(Math.abs(phi)>.003){
      ghost(0,'rgba(124,148,158,.55)');
      for(const f of [.25,.5,.75])ghost(phi*f,'rgba(124,148,158,.18)');
      const arc=[];for(let i=0;i<=100;i++)arc.push(centerAt(phi*i/100));path(arc,orange,2);
      const end=project(centerAt(phi)),before=project(centerAt(phi- Math.sign(phi)*.035));
      arrow(ctx,before,end,orange,1.7);
    }
  }
  const faces=[];
  for(let u=0;u<16;u++)for(let k=0;k<32;k++){
    const a=u*Math.PI/16,b=(u+1)*Math.PI/16,c=k*2*Math.PI/32,d=(k+1)*2*Math.PI/32;
    const pts=[worldPoint(m,c,a),worldPoint(m,d,a),worldPoint(m,d,b),worldPoint(m,c,b)].map(project);
    faces.push({pts,z:pts.reduce((r,p)=>r+p[2],0)/4});
  }
  faces.sort((a,b)=>b.z-a.z);
  for(const {pts} of faces){
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
    ctx.closePath();ctx.fillStyle='rgba(0,127,135,.075)';ctx.fill();
  }
  for(let k=1;k<8;k++){
    const pts=[];for(let i=0;i<=72;i++)pts.push(worldPoint(m,2*Math.PI*i/72,k*Math.PI/8));path(pts,'rgba(0,127,135,.38)',.75);
  }
  for(let k=0;k<10;k++){
    const pts=[];for(let i=0;i<=60;i++)pts.push(worldPoint(m,k*2*Math.PI/10,i*Math.PI/60));path(pts,'rgba(0,127,135,.32)',.7);
  }
  const center=project(v.mean);arrow(ctx,origin,center,'rgba(20,45,54,.65)',.9);
  ctx.beginPath();ctx.arc(center[0],center[1],3.2,0,2*Math.PI);ctx.fillStyle=ink;ctx.fill();
  text(ctx,'固定 Jx / Jy / Jz · 同一尺度',12,h-15,10,'#627780','left');
  text(ctx,`φ = ${(phi*180/Math.PI).toFixed(1)}°`,w-12,h-15,11,orange,'right');
}
function plot2D(m,v){
  const {ctx,w,h}=setup($('projection')),scale=Math.min((w-72)/130,(h-68)/88),cx=w/2,cy=h/2-2;
  const pt=(y,z)=>[cx+y*scale,cy-z*scale];
  for(let y=-60;y<=60;y+=20){line(ctx,pt(y,-40),pt(y,40),'#edf2f2');if(y)text(ctx,String(y),pt(y,0)[0],cy+14,9,'#90a3aa');}
  for(let z=-40;z<=40;z+=20){line(ctx,pt(-60,z),pt(60,z),'#edf2f2');if(z)text(ctx,String(z),cx-9,pt(0,z)[1],9,'#90a3aa','right');}
  arrow(ctx,pt(-65,0),pt(65,0),teal,.85);arrow(ctx,pt(0,-43),pt(0,43),orange,.85);
  text(ctx,'Jy',pt(65,0)[0]+13,cy,12,teal);text(ctx,'Jz',cx,pt(0,43)[1]-12,12,orange);
  function ellipse(s,col,fill=null,dash=[]){
    const gap=Math.hypot(s.yy-s.zz,2*s.yz),vp=Math.max(0,(s.yy+s.zz+gap)/2),vm=Math.max(0,(s.yy+s.zz-gap)/2);
    const angle=.5*Math.atan2(2*s.yz,s.yy-s.zz),ca=Math.cos(angle),sa=Math.sin(angle);
    ctx.beginPath();
    for(let i=0;i<=160;i++){
      const t=2*Math.PI*i/160,a=Math.sqrt(vp)*Math.cos(t),b=Math.sqrt(vm)*Math.sin(t);
      const p=pt(s.mean[1]+a*ca-b*sa,a*sa+b*ca);i?ctx.lineTo(...p):ctx.moveTo(...p);
    }
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
    ctx.strokeStyle=col;ctx.lineWidth=fill?1.8:.9;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
  }
  if(trailOn()){
    ellipse(stateAt(m,0),'#9eafb6',null,[4,4]);
    if(Math.abs(phi)>.003){
      for(const f of [.25,.5,.75])ellipse(stateAt(m,phi*f),'rgba(135,155,164,.25)');
      const points=[];for(let i=0;i<=100;i++)points.push(pt(m.mean*Math.sin(phi*i/100),0));
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=orange;ctx.lineWidth=2;ctx.stroke();
    }
  }
  ellipse(v,teal,'rgba(0,127,135,.12)');
  const center=pt(v.mean[1],0);ctx.beginPath();ctx.arc(...center,3.2,0,2*Math.PI);ctx.fillStyle=ink;ctx.fill();
  text(ctx,`σy = ${Math.sqrt(Math.max(0,v.yy)).toFixed(2)}`,12,20,11,teal,'left');
  text(ctx,`σz = ${Math.sqrt(Math.max(0,v.zz)).toFixed(2)}`,12,37,11,orange,'left');
  text(ctx,`⟨Jy⟩ = ${v.mean[1].toFixed(2)}`,w-12,h-15,11,'#627780','right');
}
function updatePlayButtons(){
  $('play').textContent=playing==='tau'?'Ⅱ':'▶';$('playPhi').textContent=playing==='phi'?'Ⅱ':'▶';
  $('play').setAttribute('aria-label',playing==='tau'?'暂停制备时间':'播放制备时间');
  $('playPhi').setAttribute('aria-label',playing==='phi'?'暂停相位编码':'播放相位编码');
}
function render(){
  const m=moments(tau),v=current(m);
  $('tauValue').value=tau.toFixed(4);$('phiValue').value=`${phi.toFixed(3)} rad · ${(phi*180/Math.PI).toFixed(1)}°`;
  $('center').textContent=`(${v.mean[0].toFixed(3)}, ${v.mean[1].toFixed(3)}, 0)`;
  $('mean').textContent=v.mean[1].toFixed(3);$('vy').textContent=v.yy.toFixed(3);
  $('qfi').textContent=(4*v.zz).toFixed(2);$('xi').textContent=m.xi.toFixed(4);
  $('state').textContent=aligned?'制备已对齐':'OAT 原始方向';
  $('align').textContent=aligned?'恢复 OAT 方向':'对齐长轴到 z';$('align').setAttribute('aria-pressed',String(aligned));
  $('alignmentText').textContent=Math.abs(phi)>.003?'三维形状保持不变；固定平面的投影宽度与中心可以改变。':
    (aligned?'φ = 0：制备短轴沿 y，长轴沿 z。':'尚未对齐：原始 OAT 态的 Var(Jz) = N/4。');
  plot3D(m,v);plot2D(m,v);
}
function setPreparation(t){tau=Math.max(0,Math.min(.16,t));alpha=targetAlpha=aligned?moments(tau).angle:0;}
$('tau').addEventListener('input',e=>{setPreparation(+e.target.value);render();});
$('phi').addEventListener('input',e=>{phi=+e.target.value;render();});
$('align').addEventListener('click',()=>{aligned=!aligned;targetAlpha=aligned?moments(tau).angle:0;if(reducedMotion)alpha=targetAlpha;render();});
$('zeroPhi').addEventListener('click',()=>{phi=0;$('phi').value=0;if(playing==='phi')playing=null;updatePlayButtons();render();});
$('reset').addEventListener('click',()=>{playing=null;tau=phi=0;aligned=false;alpha=targetAlpha=0;yaw=-.78;pitch=.38;$('tau').value=0;$('phi').value=0;updatePlayButtons();render();});
$('trail').addEventListener('change',render);
$('play').addEventListener('click',()=>{playing=playing==='tau'?null:'tau';if(playing==='tau'&&tau>=.16)setPreparation(0);updatePlayButtons();});
$('playPhi').addEventListener('click',()=>{playing=playing==='phi'?null:'phi';if(playing==='phi'&&phi>=Math.PI){phi=-Math.PI;$('phi').value=phi;}updatePlayButtons();});
function frame(t){
  const dt=Math.min((t-previous)/1000,.05);previous=t;let dirty=false;
  if(playing==='tau'){
    tau=Math.min(.16,tau+dt*.009);if(tau>=.16){playing=null;updatePlayButtons();}
    $('tau').value=tau;targetAlpha=aligned?moments(tau).angle:0;dirty=true;
  }else if(playing==='phi'){
    phi=Math.min(Math.PI,phi+dt*.35);if(phi>=Math.PI){playing=null;updatePlayButtons();}
    $('phi').value=phi;dirty=true;
  }
  if(Math.abs(alpha-targetAlpha)>1e-5){alpha+=(targetAlpha-alpha)*Math.min(1,dt*10);dirty=true;}
  else if(alpha!==targetAlpha){alpha=targetAlpha;dirty=true;}
  if(dirty)render();requestAnimationFrame(frame);
}
let drag=null;$('ellipsoid').style.touchAction='none';
$('ellipsoid').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};e.target.setPointerCapture(e.pointerId);});
$('ellipsoid').addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.008;pitch=Math.max(-.75,Math.min(.9,pitch+(e.clientY-drag.y)*.007));drag={x:e.clientX,y:e.clientY};render();});
$('ellipsoid').addEventListener('pointerup',()=>drag=null);$('ellipsoid').addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',render);
window.oatModel={moments,current,preparedCov,stateAt,worldPoint,localPoint,
  getState:()=>({tau,phi,aligned,alpha,playing,trail:trailOn()}),
  setState:(t,a,p=0)=>{playing=null;aligned=!!a;setPreparation(t);phi=Math.max(-Math.PI,Math.min(Math.PI,p));$('tau').value=tau;$('phi').value=phi;updatePlayButtons();render();}};
render();requestAnimationFrame(frame);
