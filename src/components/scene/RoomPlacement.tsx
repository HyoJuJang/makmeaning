import type { ReactNode } from 'react';
import './room-placement.css';

const ROOM_PLACEMENTS = {
  'living-cushion': 'cushion',
  'living-rug': 'rug',
  'living-table-lamp': 'table-lamp',
  'living-mushroom-lamp': 'mushroom-lamp',
} as const;

type PlaceableProductId = keyof typeof ROOM_PLACEMENTS;
type RoomPlacementProps = { productId: string; lit: boolean };

export function canPlaceInRoom(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ROOM_PLACEMENTS, id);
}

// Coordinates share the room artwork's 3:1 frame. A fixed frame also keeps the
// original-image foreground masks registered when the room changes size.
function RoomLayer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <svg className={`sc-placement__art ${className}`} viewBox="0 0 600 200" preserveAspectRatio="none" shapeRendering="crispEdges" focusable="false" aria-hidden="true">{children}</svg>;
}

function Cushion() {
  return <RoomLayer className="sc-placement__item"><g transform="translate(-22 0)">
    <path fill="#594e44" opacity=".24" d="M301 104h31v2h8v3h-5v2h-34v-2h-6v-3h6Z" />
    <path fill="#454c4d" d="M300 61h4v2h25v-2h6v5h-2v8h-1v17h1v10h2v5h-7v-2h-22v2h-8v-5h2V90h1V75h-1Z" />
    <path fill="#3e5b75" d="M302 65h4v1h22v-1h4v9h-1v20h1v8h-5v-1h-22v2h-4v-3h1V89h1V76h-1Z" />
    <path fill="#52708a" d="M304 68h4v1h18v-1h3v5h-1v21h1v5h-4v-1h-18v1h-3V88h1V76h-1Z" />
    <path fill="#45627d" d="M306 72h21v23h-21Z" />
    <path fill="#334d65" d="M303 87h2v12h22v-2h3v5h-5v-1h-20v2h-4v-3h2Z" />
    <path fill="#7a90a1" opacity=".65" d="M305 68h2v2h-2Zm6 1h2v1h-2Zm7 0h2v1h-2Zm8-1h2v2h-2Zm-21 8h1v2h-1Zm0 7h1v2h-1Zm22-9h1v2h-1Zm0 8h1v2h-1Z" />
    <path fill="#6b8196" opacity=".35" d="M309 76h1v1h-1Zm10-1h1v1h-1Zm-6 8h1v1h-1Zm11 6h1v1h-1Zm-15 3h1v1h-1Zm10 3h1v1h-1Z" />
  </g></RoomLayer>;
}

// Bilinear projection lays the checks along both receding floor edges.
function rugPoint(column: number, row: number): string {
  const u = column / 12;
  const v = row / 7;
  const left = { x: 155 + (99 - 155) * v, y: 120 + (172 - 120) * v };
  const right = { x: 405 + (357 - 405) * v, y: 134 + (195 - 134) * v };
  return `${Math.round(left.x + (right.x - left.x) * u)},${Math.round(left.y + (right.y - left.y) * u)}`;
}

function Rug() {
  return <>
    <RoomLayer className="sc-placement__item sc-placement__rug">
      <path fill="#6e5c44" opacity=".27" d="m149 121 265 13-54 66-269-25Z" />
      <path fill="#a99a7e" d="m149 118 264 14-54 67-268-24Z" />
      <path fill="#eee5d2" d="m151 119 259 14-52 65-264-24Z" />
      {Array.from({ length: 84 }, (_, index) => {
        const column = index % 12;
        const row = Math.floor(index / 12);
        return <polygon key={index} points={`${rugPoint(column, row)} ${rugPoint(column + 1, row)} ${rugPoint(column + 1, row + 1)} ${rugPoint(column, row + 1)}`} fill={(column + row) % 2 ? '#d6c7ab' : '#eee5d2'} />;
      })}
      <path fill="none" stroke="#b4a58b" strokeWidth=".6" strokeDasharray="2 3" d="m150 121-54 52 262 23 52-62Z" />
      <path fill="none" stroke="#f6efdf" strokeWidth=".6" strokeDasharray="1 2" d="m147 129 255 15m-265-6 258 15m-268-6 260 17m-270-8 263 18m-273-9 265 19" opacity=".65" />
    </RoomLayer>
    {/* These are registered copies of the original image, never cropped and
        stretched object cutouts: only the foreground silhouettes are exposed. */}
    <img className="sc-placement__restore sc-placement__restore--sofa" src="/scene-art/living-room.png" width="2172" height="724" alt="" draggable="false" aria-hidden="true" />
    <img className="sc-placement__restore sc-placement__restore--table" src="/scene-art/living-room.png" width="2172" height="724" alt="" draggable="false" aria-hidden="true" />
    <img className="sc-placement__restore sc-placement__restore--pouf" src="/scene-art/living-room.png" width="2172" height="724" alt="" draggable="false" aria-hidden="true" />
  </>;
}

function LampGlow({ mushroom = false }: { mushroom?: boolean }) {
  return <g className="sc-placement__glow">
    <path fill="#ffe1a4" opacity=".16" d={mushroom ? 'M273 98h17v3h8v6h5v8h3v16h-4v10h-9v4h-24v-4h-9v-10h-3v-16h3v-8h5v-6h8Z' : 'M272 84h18v4h9v8h5v12h3v15h-5v13h-10v8h-22v-8h-10v-13h-4v-15h3V96h5v-8h8Z'} />
    <path fill="#ffdf9b" opacity=".28" d="M267 137h27v2h7v3h-4v3h-32v-2h-6v-3h8Z" />
  </g>;
}

function TableLamp() {
  return <RoomLayer className="sc-placement__item">
    <LampGlow />
    <path fill="#674e35" opacity=".3" d="M269 142h21v1h7v3h-7v1h-24v-2h-3v-2h6Z" />
    <path fill="#72593a" d="M270 139h7v-21h5v21h7v2h3v3h-4v1h-17v-1h-4v-3h3Z" />
    <path fill="#b39352" d="M278 119h3v21h-3Z" />
    <path fill="#e2c481" d="M278 120h1v20h-1Z" />
    <path fill="#b18b45" d="M272 140h14v1h4v2h-20v-2h2Z" />
    <path fill="#dcc28a" d="M274 140h11v1h-11Z" />
    <path fill="#81694f" d="M272 96h15v3h2v5h2v5h2v5h2v5h2v3h-4v1h-25v-1h-5v-3h2v-5h2v-5h2v-5h2v-5h1Z" />
    <path className="sc-placement__shade" fill="#e8d7b7" d="M274 98h11v3h2v5h2v5h2v5h2v4h-5v1h-17v-1h-5v-4h2v-5h2v-5h2v-5h2Z" />
    <path fill="#fff3d9" opacity=".8" d="M275 99h1v6h-1v7h-1v8h-3v-5h1v-6h1v-6h2Zm5 0h1v21h-2V99Zm4 1h1v5h1v6h1v9h-2v-8h-1Z" />
    <path fill="#c3ab83" d="M277 100h1v10h-1v10h-1v-9h1Zm5 0h1v11h1v9h-1v-8h-1Z" />
    <path fill="#f5e5c7" d="M274 97h11v1h-11Z" />
    <path fill="#a68c66" d="M267 121h25v1h-25Z" />
  </RoomLayer>;
}

function MushroomLamp() {
  return <RoomLayer className="sc-placement__item">
    <LampGlow mushroom />
    <path fill="#674e35" opacity=".27" d="M270 142h20v1h7v3h-6v1h-22v-2h-5v-2h6Z" />
    <path fill="#8f8069" d="M274 123h14v3h2v15h-2v3h-14v-2h-2v-16h2Z" />
    <path className="sc-placement__glass" fill="#eee6d4" d="M276 124h9v3h2v14h-2v1h-9v-1h-2v-14h2Z" />
    <path fill="#fff8e9" d="M276 128h2v11h-2Zm3-3h5v2h-5Z" />
    <path fill="#c6bba6" d="M285 128h2v13h-3v1h-8v-1h8v-2h1Z" />
    <path fill="#8f8069" d="M276 103h11v2h5v3h4v4h2v5h2v8h-2v2h-33v-2h-2v-8h2v-5h3v-4h3v-3h5Z" />
    <path className="sc-placement__glass" fill="#f1e9d8" d="M277 105h9v2h5v3h3v4h2v5h2v5h-3v1h-27v-1h-3v-5h2v-5h3v-4h3v-3h4Z" />
    <path fill="#fff9e9" d="M277 107h7v2h-7Zm-5 3h5v2h-5Zm-3 5h3v4h-3Z" />
    <path fill="#d1c5af" d="M295 118h2v6h-3v1h-26v-1h24v-2h3Z" />
  </RoomLayer>;
}

/** Decorative, single-product preview. Unknown catalog IDs render nothing. */
export default function RoomPlacement({ productId, lit }: RoomPlacementProps) {
  if (!canPlaceInRoom(productId)) return null;
  const kind = ROOM_PLACEMENTS[productId as PlaceableProductId];
  return <span key={productId} className={`sc-placement sc-placement--${kind}${lit ? ' sc-placement--lit' : ''}`} aria-hidden="true" data-placement-product={productId}>
    {kind === 'cushion' && <Cushion />}
    {kind === 'rug' && <Rug />}
    {kind === 'table-lamp' && <TableLamp />}
    {kind === 'mushroom-lamp' && <MushroomLamp />}
  </span>;
}
