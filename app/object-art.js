// Code-native object layers share the room's 400 × 600 world coordinates.
// The original bitmap remains intact; clipped local texture covers its fixed open door.
const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
const mix = (a, b, p) => a + (b - a) * p;
const points = ps => ps.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ');
const escapeAttribute = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const purchasedArt = (purchase, art) => purchase ? `<g data-product="${escapeAttribute(purchase.catalogProductId||purchase.id)}" data-room-slot="${escapeAttribute(purchase.roomSlot)}">${art}</g>` : '';

function garment(x, blue, sway = 0) {
  const cloth = blue ? '#8daac0' : '#eee3c9';
  const edge = blue ? '#5c7486' : '#b9ac92';
  return `<g transform="translate(${x + sway} 66)"><path d="M-10 0 0-5 10 0" fill="none" stroke="#997853" stroke-width="1.8"/><path d="M0-5v-4q4-4 5 0" fill="none" stroke="#726650" stroke-width="1.2"/><path d="M-9 1-18 7-19 33-11 35-8 17-8 48H9V17l3 18 8-2-2-26-9-6-9 5Z" fill="${cloth}" stroke="${edge}" stroke-width="1.3"/><path d="M-7 41H8M-7 44H8" stroke="${edge}" opacity=".35"/>${blue ? '<path d="M0 7v38M3 13h5v6H3" stroke="#5c788c" fill="none" stroke-width="1"/>' : '<path d="M-6 3q6 8 12 0" fill="none" stroke="#b9ad94" stroke-width="2"/>'}</g>`;
}

function wardrobe(open, browse, purchases) {
  const width = mix(46, 4.5, open);
  const sway = browse == null ? 0 : Math.sin(clamp(browse) * Math.PI * 4) * 2;
  return `<g data-object-art="wardrobe" data-open="${open.toFixed(3)}">
    <path d="M40 43h104v113H40Z" fill="#504b40" stroke="#564b3b" stroke-width="2"/>
    <path d="M44 47h96v104H44Z" fill="#6b5b44"/>
    <path d="M48 51h88v73H48Z" fill="#514c3e"/>
    <path d="M47 53h91" stroke="#d3c4a7" stroke-width="2"/>
    ${purchases.filter(p=>p.category==='fashion'&&['wardrobe-1','wardrobe-2'].includes(p.roomSlot)).map(p=>purchasedArt(p,garment(p.roomSlot==='wardrobe-1'?70:111,p.illustrationKey==='shirt',p.roomSlot==='wardrobe-1'?sway:-sway))).join('')}
    <path d="M47 124h91v24H47Z" fill="#aa9070" stroke="#665944"/>
    <path d="M49 127h42v18H49Zm46 0h41v18H95Z" fill="#87745a"/>
    <path d="M63 135h14M109 135h14" stroke="#d2c8af" stroke-width="2.6"/>
    <path d="M38 40h108v7H38ZM39 150h106v8H39Z" fill="#8e7859" stroke="#5c5140" stroke-width="1.5"/>
    <g><rect x="44" y="48" width="${width}" height="102" fill="#c5b294" stroke="#70614c" stroke-width="1.5"/>
    <rect x="${140 - width}" y="48" width="${width}" height="102" fill="#b7a284" stroke="#70614c" stroke-width="1.5"/>
    <path d="M${48 + width * .18} 54v88M${48 + width * .56} 52v94M${140 - width * .8} 54v91M${140 - width * .32} 52v92" stroke="#ead9b9" opacity=".3"/>
    <path d="M${44 + width - 6} 92v17M${146 - width} 92v17" stroke="#625b49" stroke-width="2.5" stroke-linecap="round"/></g>
    <path d="M42 158v3M142 158v3" stroke="#494737" stroke-width="4"/>
  </g>`;
}

function foodIcon(id, x, y, selected) {
  const highlight = selected ? `<rect x="${x - 2}" y="${y - 3}" width="17" height="24" rx="3" fill="#ecdfac" stroke="#5b795d" stroke-width="1.1"/>` : '';
  const art = id === 'milk'
    ? '<path d="m2 4 3-4h6l2 4v16H2Z" fill="#f2ecda" stroke="#c4c0ab" stroke-width=".7"/><path d="M2 5h11v6H2Z" fill="#8b9f88"/><path d="M5 15h5M5 17h5" stroke="#91a091" stroke-width=".8"/>'
    : id === 'water'
    ? '<rect x="5" y="0" width="6" height="3" rx="1" fill="#738fa3"/><path d="M5 3 3 6v12q0 2 2 2h6q2 0 2-2V6l-2-3Z" fill="#a7c9dc" stroke="#809eae" stroke-width=".7"/><path d="M4 10h8v5H4Z" fill="#e8efdf"/><path d="M6 5v4" stroke="#fff" opacity=".6"/>'
    : '<rect x="3" y="2" width="10" height="4" rx="1" fill="#dbd3b8"/><rect x="2" y="6" width="12" height="15" rx="2" fill="#9f7951"/><path d="M3 10h10v7H3Z" fill="#f1e7cd"/><path d="M8 11v5M5 13.5h6" stroke="#7d9574"/>';
  return `${highlight}<g transform="translate(${x} ${y})">${art}</g>`;
}

function fridge(open, quantity, selected, purchases) {
  // Reuse a clean neighbouring floor texture in the same SVG, without changing the bitmap.
  const door = [[286,98],[mix(232,310,open),mix(98,119,open)],[mix(232,310,open),mix(155,181,open)],[286,155]];
  const outerTop = door[1], outerBottom = door[2];
  const handX = mix(239,305,open), handY = mix(119,139,open);
  const food = (id, slot, x, y) => {
    const purchase = purchases.find(p=>p.illustrationKey===id&&p.category==='food'&&p.roomSlot===slot);
    return quantity[id] > 0 ? purchasedArt(purchase, foodIcon(id,x,y,selected===id)) : '';
  };
  return `<g data-object-art="fridge" data-open="${open.toFixed(3)}">
    <defs><clipPath id="fixed-fridge-door-repair"><path d="M282 94 314 119V186H282Z"/></clipPath></defs>
    <g clip-path="url(#fixed-fridge-door-repair)"><image href="/assets/gather-room.png" x="82" y="-41" width="400" height="600"/></g>
    <path d="M300 94h8v62h-8Z" fill="#b79564"/><path d="M302 98v54" stroke="#8e704c"/>
    <path d="M229 96h60v62h-60Z" fill="#c9c9be" stroke="#696e67" stroke-width="1.5"/>
    <path d="M234 100h49v53h-49Z" fill="#d7e3df" stroke="#8c9a94"/>
    <path d="M238 103h41v47h-41Z" fill="#a5b9b4"/>
    <path d="M236 128h45M236 150h45" stroke="#f2f2de" stroke-width="2.2"/>
    ${food('milk','fridge-1',241,106)}
    ${food('water','fridge-2',263,106)}
    <path d="M241 133h34v13h-34Z" fill="#cad9cb" opacity=".7"/>
    <path d="M244 136h8M257 136h14M244 141h27" stroke="#f0eee0" opacity=".6"/>
    <polygon points="${points(door)}" fill="${open > .5 ? '#cdd9d4' : '#deddd3'}" stroke="#7f8980" stroke-width="1.8"/>
    <path d="M${outerTop[0]+2} ${outerTop[1]+1} ${outerBottom[0]+2} ${outerBottom[1]-1}" stroke="#f8f4e5" stroke-width="1.6"/>
    <path d="M${handX} ${handY}v13" stroke="#737e77" stroke-width="2.1" stroke-linecap="round"/>
    ${open > .55 ? `<path d="M291 126 ${mix(295,305,open)} ${mix(128,139,open)}M291 145 ${mix(295,305,open)} ${mix(147,158,open)}" stroke="#9baba2" stroke-width="2"/>` : ''}
    <path d="M230 158h59" stroke="#777e72" stroke-width="2"/>
    <g data-purchased-food="vitamin"><rect x="325" y="127" width="20" height="23" fill="#b39466"/>${food('vitamin','pantry-1',328,128) || '<path d="M326 148h18" stroke="#795f43"/>'}</g>
    <rect x="215" y="203" width="96" height="15" rx="4" fill="#f8f4e9" fill-opacity=".95"/>
    <text x="263" y="214" text-anchor="middle" font-size="8.4" font-weight="600" fill="#365947">우유 ${quantity.milk} · 물 ${quantity.water} · 영양제 ${quantity.vitamin}</text>
  </g>`;
}

function windowArt(open) {
  // The central pane alone slides vertically inside the original window frame.
  // The notch preserves the foreground plant at the pane's lower-left corner.
  const lift = 22 * open;
  return `<g data-object-art="window" data-open="${open.toFixed(3)}">
    <defs><clipPath id="scene-window-pane"><path d="M181 19H231V66H189V51H181Z"/></clipPath></defs>
    <g clip-path="url(#scene-window-pane)">
      <rect x="181" y="19" width="50" height="47" fill="#c7e2e9" fill-opacity=".08"/>
      <rect x="182" y="20" width="48" height="22" fill="#c7e3ed" fill-opacity=".16" stroke="#d3d7cc" stroke-width="1.5"/>
      <rect x="182" y="43" width="48" height="23" fill="#385b61" opacity="${open*.16}"/>
      <g transform="translate(0 ${-lift})">
        <rect x="182" y="42" width="48" height="23" fill="#bddce7" fill-opacity=".32" stroke="#e3ddcc" stroke-width="2.2"/>
        <path d="M184 44h44v19" fill="none" stroke="#8a9c99" stroke-width=".8"/>
        <path d="m187 48 8-4M189 55l16-10" stroke="#f8fff5" stroke-width="1.4" opacity=".48"/>
        <path d="M201 61h11" stroke="#61746e" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M181 19v47M231 19v47M181 66h50" fill="none" stroke="#e0d9c5" stroke-width="2"/>
    </g>
  </g>`;
}

export function objectArt({wardrobeOpen=0,fridgeOpen=0,windowOpen=0,browseProgress=null,foodQuantity={milk:3,water:3,vitamin:3},selectedFood=null,purchases=[]}={}) {
  const quantities = Object.fromEntries(['milk','water','vitamin'].map(id=>[id,Math.max(0,Number(foodQuantity[id])||0)]));
  return wardrobe(clamp(wardrobeOpen),browseProgress,purchases) + fridge(clamp(fridgeOpen),quantities,selectedFood,purchases) + windowArt(clamp(windowOpen));
}
