// Approved A / Slouch raster artwork. Motion remains owned by InteractionController.
import {FRAMES} from './avatar-frames.js';
export const AVATARS=[
 {id:'m01',name:'M01 · 네이비',note:'헝클머리 · 남성',pants:'#353b43'},
 {id:'m02',name:'M02 · 세이지',note:'가르마 · 남성',pants:'#303944'},
 {id:'f01',name:'F01 · 오트',note:'단발 · 여성',pants:'#536980'},
 {id:'f02',name:'F02 · 슬레이트',note:'긴머리 · 여성',pants:'#494b43'}
];
const legacy={short:'m01',wave:'m02',bob:'f01'};
export const avatarById=id=>AVATARS.find(a=>a.id===(legacy[id]||id))||AVATARS[0];
const unit=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const fmt=n=>Number(n.toFixed(3));

export function avatarSVG(id,outfit='base',direction='down',frame=0,options={}){
 const a=avatarById(id),pose=options.pose||'idle',p=unit(options.progress),seat=unit(options.seatProgress),reduced=Boolean(options.reduced);
 const facing=['up','left','right','down'].includes(direction)?direction:'down';
 const index={down:0,up:1,left:2,right:3}[facing];
 const key=`avatar-${a.id}-${outfit}-${facing}-${pose}-${frame}`;
 const scale=60/FRAMES[a.id][0].box[3];
 const source=(i,{x=0,y=0,opacity=1,transform='',part='full'}={})=>{
  const data=FRAMES[a.id][i], [bx,by,bw,bh]=data.box;
  const px=20-(data.anchorX??bw/2)*scale+x,py=61-bh*scale+y;
  const uid=key+'-'+i+'-'+part;
  const href=`/assets/avatars/${a.id}-states.png`;
  const picture=`<svg x="${fmt(px)}" y="${fmt(py)}" width="${fmt(bw*scale)}" height="${fmt(bh*scale)}" viewBox="0 0 ${bw} ${bh}" overflow="visible"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated"/></svg>${outfit==='base'?'':tinted(data,uid,href)}</svg>`;
  return `<g opacity="${fmt(opacity)}" transform="${transform}" data-sprite-frame="${i}">${picture}</g>`;
 };
 const clip=(name,shape,content)=>`<defs><clipPath id="${key}-${name}">${shape}</clipPath></defs><g clip-path="url(#${key}-${name})">${content}</g>`;
 const standing=(i=index)=>source(i);
 const sofaSeat=()=>source(6);
 const vanitySeat=()=>{
  const legs=`<g fill="${a.pants}" stroke="#30353c" stroke-width=".5"><path d="M12 42h7l-1 7-5 8H7l4-11Z"/><path d="M22 42h7l1 5 4 10h-7l-4-9Z"/></g><path d="M7 56h7v4H5v-2Zm19 0h8l2 2v2H26Z" fill="#ece8db" stroke="#5a5c55" stroke-width=".5"/>`;
  return legs+clip('vanity-upper','<rect x="-20" y="-10" width="80" height="54"/>',source(1));
 };
 let body='';
 const isSeat=pose==='sit-down'||pose==='stand-up'||pose==='seated-idle'||pose==='use-cosmetic';
 if(isSeat){
  const seated=options.objectId==='sofa'?sofaSeat():vanitySeat();
  if(seat>=.99)body=seated;
  else if(seat<=.01)body=standing();
  else body=`<g opacity="${fmt(1-seat)}" transform="translate(0 ${fmt(seat*3)})">${standing()}</g><g opacity="${fmt(seat)}">${seated}</g>`;
  if(pose==='use-cosmetic'){
   const reach=Math.sin(p*Math.PI),handY=37-reach*7;
   body+=`<g transform="translate(0 ${fmt(-reach*1.1)})"><path d="M28 36 30 ${fmt(handY)} 29 ${fmt(handY-3)}" stroke="#d9ad8b" stroke-width="3" fill="none" stroke-linecap="square"/>${options.heldProductId&&p>.22&&p<.84?`<g class="avatar-held-product"><rect x="27" y="${fmt(handY-8)}" width="4" height="6" rx=".7" fill="${options.heldProductId==='cream'?'#eee5cf':'#c6aa60'}" stroke="#64705a" stroke-width=".6"/><rect x="27" y="${fmt(handY-9)}" width="4" height="2" fill="#4c6958"/></g>`:''}</g>`;
  }
 }else if(pose==='browse'||pose==='reach'){
  const amount=pose==='browse'?1:Math.sin(p*Math.PI);
  // Use the supplied raised-arm art, preserving its actual rear-three-quarter silhouette.
  body=amount>.4?source(7,{transform:!reduced&&pose==='browse'?`rotate(${fmt(Math.sin(p*Math.PI*6)*1.2)} 20 60)`:''}):standing();
 }else if(pose==='change-clothes'){
  const turn=p>.2&&p<.7?1:index;
  body=source(turn,{transform:reduced?'':`translate(20 40) scale(${fmt(1-Math.sin(p*Math.PI)*.12)} 1) translate(-20 -40)`});
  if(!reduced)body+=`<path d="M5 37q-5 8 3 12M34 34q6 8 1 12" stroke="#d3c39b" fill="none" stroke-width="1.2" opacity="${fmt(Math.sin(p*Math.PI))}"/>`;
 }else if(frame&&!reduced){
  if(facing==='down')body=source(frame===1?4:frame===3?5:0);
  else{
   const stride=frame===1?1.25:frame===3?-1.25:0;
   body=clip('walk-top','<rect x="-10" y="-10" width="60" height="53"/>',source(index,{y:-Math.abs(stride)*.22,part:'top'}));
   body+=clip('walk-leg-a','<rect x="-10" y="43" width="30" height="23"/>',source(index,{x:stride*.38,y:stride*.48,part:'leg-a'}));
   body+=clip('walk-leg-b','<rect x="20" y="43" width="30" height="23"/>',source(index,{x:-stride*.38,y:-stride*.48,part:'leg-b'}));
  }
 }else body=standing();
 const shadow=seat>.4?'':`<ellipse cx="20" cy="61" rx="10" ry="2.1" fill="#45483a" opacity=".18"/>`;
 return `${shadow}<g class="pixel-avatar" data-avatar-art="${a.id}" data-pose="${pose}">${body}</g>`;

 function tinted(data,uid,href){
  const [bx,by,bw,bh]=data.box;
  const color=outfit==='shirt'?[.56,.69,.77]:[.91,.875,.79];
  const bias=color.map(c=>fmt(c-data.luma*.65));
  return `<defs><clipPath id="${uid}-cloth"><path d="${data.shirtMask}"/></clipPath><filter id="${uid}-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".138 .465 .047 0 ${bias[0]} .138 .465 .047 0 ${bias[1]} .138 .465 .047 0 ${bias[2]} 0 0 0 1 0"/></filter></defs><g clip-path="url(#${uid}-cloth)"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated" filter="url(#${uid}-tint)"/></svg></g>`;
 }
}
