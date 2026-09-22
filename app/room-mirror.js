// Geometry only. Category selectors decide which products and states exist.
import {gameItemArt} from './game-item-art.js';
export const escapeAttribute=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function mirrorAttributes(entry){
 return `data-product="${escapeAttribute(entry.productId)}" data-room-slot="${escapeAttribute(entry.product.roomSlot)}" data-room-mirror-product-id="${escapeAttribute(entry.productId)}" data-category="${entry.category}" data-source="category-hero" data-product-state="${entry.status}" data-remaining="${entry.remaining??''}" data-art-visible="${entry.artVisible}" data-display-index="${entry.displayIndex}" data-presentation-role="${entry.presentationRole}"`;
}

export function roomMirrorPlacement(entry,entries){
 const peers=entries.filter(item=>item.category===entry.category&&(entry.category==='food'&&entry.presentationRole!=='fridge'?item.presentationRole!=='fridge':item.presentationRole===entry.presentationRole));
 const i=Math.max(0,peers.findIndex(item=>item.productId===entry.productId));
 if(entry.presentationRole==='fridge')return {x:237+(i%2)*23,y:102+Math.floor(i/2)*23,w:21,h:23,label:'냉장고'};
 // Two independent cells per shelf keep broad food pouches and tall pasta
 // visible together. Empty quantities retain their cell, so nothing jumps.
 if(entry.category==='food'){
  const columns=peers.length>4?3:2;
  return {x:308+(i%columns)*(columns===3?15:23),y:86+Math.floor(i/columns)*30,w:columns===3?13:20,h:25,label:'팬트리'};
 }
 if(entry.presentationRole==='sofa')return {x:66+(i%2)*25,y:342+Math.floor(i/2)*24,w:42,h:42,label:'소파'};
 if(entry.presentationRole==='bed')return {x:44+(i%2)*25,y:176+Math.floor(i/2)*24,w:49,h:33,label:'침대 베개'};
 if(entry.presentationRole==='lamp'){
  const asset=entry.product.gameAsset;
  if(asset?.status==='ready'&&asset.domain==='living'&&asset.familyId==='floor_lamp')return {x:305-i*22,y:336,w:37,h:112,label:'거실 장스탠드'};
  return {x:332-i*18,y:400,w:44,h:50,label:'거실 스탠드'};
 }
 if(entry.category==='living'&&entry.presentationRole==='table'){
  const isPlant=entry.product.gameAsset?.familyId==='plant';
  return {x:147+(i%2)*3,y:344+(i%2)*32,w:isPlant?28:25,h:isPlant?29:27,label:'거실 테이블'};
 }
 if(entry.category==='living')return {x:134+(i%2)*20,y:386+Math.floor(i/2)*18,w:24,h:26,label:'거실 선반'};
 // Both vanity and shelf products use the category's representative order.
 const beauty=entries.filter(item=>item.category==='beauty');
 const b=Math.max(0,beauty.findIndex(item=>item.productId===entry.productId));
 return {x:316+(b%2)*24,y:224+Math.floor(b/2)*12,w:27,h:32,label:'화장대'};
}

export function mirrorImage(entry,placement){
 if(!entry.artVisible)return '';
 const mapped=gameItemArt(entry.product,placement);
 if(mapped)return mapped;
 const {x,y,w,h}=placement;
 if(entry.product.catalogSource==='shared-products'||entry.product.imageKind==='product-photo')return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 60" data-artwork-state="unavailable" data-artwork-product-id="${escapeAttribute(entry.productId)}" role="img" aria-label="${escapeAttribute(entry.product.name)} 공간 이미지 준비 중"><rect x="3" y="3" width="54" height="54" rx="4" fill="#edf0e4" stroke="#9ca990" stroke-dasharray="3 3"/><text x="30" y="28" text-anchor="middle" fill="#68775e" font-size="8">공간 이미지</text><text x="30" y="40" text-anchor="middle" fill="#68775e" font-size="8">준비 중</text></svg>`;
 const crop=entry.category==='food'&&entry.product.imageKind!=='product-photo'?{milk:'17 2 33 53',water:'17 3 29 52',vitamin:'15 8 33 47'}[entry.illustrationKey]:null;
 const image=`<image href="${escapeAttribute(entry.imageUrl)}" data-product-image="${escapeAttribute(entry.productId)}" x="${crop?0:x}" y="${crop?0:y}" width="${crop?60:w}" height="${crop?60:h}" preserveAspectRatio="xMidYMax meet"/>`;
 return crop?`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${crop}" overflow="hidden">${image}</svg>`:image;
}

export function placedMirrorProducts(entries){
 return entries.filter(entry=>['living','beauty'].includes(entry.category)).map(entry=>{
  const placement=roomMirrorPlacement(entry,entries);
  return `<g ${mirrorAttributes(entry)} data-room-product="${escapeAttribute(entry.productId)}" style="filter:${entry.on===false?'brightness(.66) saturate(.7)':'none'}" aria-label="${escapeAttribute(entry.product.name)} · ${placement.label}"><title>${escapeAttribute(entry.product.name)} · ${placement.label}</title>${entry.artVisible?`<ellipse cx="${placement.x+placement.w/2}" cy="${placement.y+placement.h-3}" rx="${placement.w*.28}" ry="2" fill="#554935" opacity=".13"/>`:''}${mirrorImage(entry,placement)}</g>`;
 }).join('');
}

// Remove merchandise baked into the original room bitmap. Furniture, plants,
// books and other background decor have no ownership IDs or shopping actions.
export function roomMerchandiseRepairs(){
 return `<g data-background="furniture-surfaces" aria-hidden="true">
 <path d="M307 57h27v24h-27ZM334 73h20v8h-20Z" fill="#af8753"/><path d="M308 61h25M308 77h25" stroke="#bd9662" opacity=".55"/>
 <path d="M306 85h48v28h-48ZM306 116h48v27h-48Z" fill="#98764f"/><path d="M308 88h44v20h-44ZM308 119h44v19h-44Z" fill="#ab885a"/>
 <path d="M305 82h50M305 113h50M305 143h50" stroke="#69583f" stroke-width="3"/>
 <path d="M325 220h10v7h-10ZM315 224h26v13h-26Z" fill="#a8bcc6"/><path d="M315 237h32v17h-32Z" fill="#bd935d"/><path d="M316 251h30" stroke="#a57d48"/>
 <path d="M51 331 94 325 103 360 62 374 51 357Z" fill="#e2d4bc"/><path d="M54 330 94 326M61 372l40-12" fill="none" stroke="#d2c2a7" stroke-width="1.5"/>
 <g data-background="coffee-table-surface">
 <path d="M145 340h19v3h10v6h4v42h-4v7h-27v-3h-10v-10h-2v-24h3v-12h7Z" fill="#c2965f"/>
 <path d="M147 343h17v1h-17ZM140 353h30v1h-30ZM139 366h35v1h-35ZM145 380h31v1h-31ZM141 390h23v1h-23" fill="#d3a771" opacity=".7"/>
 <path d="M153 350h18v1h-18ZM138 372h18v1h-18ZM157 385h17v1h-17ZM147 395h20v1h-20" fill="#ae814e" opacity=".6"/>
 </g>
 <g data-background="lamp-table-surface">
 <path d="M342 409h28v40h-28Z" fill="#b88c53"/>
 <path d="M343 410h26v2h-26ZM343 422h26v1h-26ZM343 436h26v1h-26" fill="#c79a60"/>
 <path d="M342 409v40h28M347 417h17M351 431h17M344 443h16" fill="none" stroke="#9e7746" stroke-width="1"/>
 <path d="M370 410v39" stroke="#6c583d" stroke-width="2"/>
 </g>
 </g>`;
}
