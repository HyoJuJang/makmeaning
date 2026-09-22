'use client';

import { CATEGORY_ROUTES } from '../../../app/category-routes.js';
import './category-nav.css';

export type CategoryNavKey = keyof typeof CATEGORY_ROUTES;
type NavigationKey = CategoryNavKey | 'room';
const NAVIGATION_ORDER: NavigationKey[] = ['fashion', 'food', 'room', 'living', 'beauty'];

/** A shared 24px family, drawn around the everyday objects in the room. */
export function CategoryIcon({ category }: { category: CategoryNavKey }) {
  const shapes = {
    fashion: <>
      <path d="M10 6a2 2 0 1 1 3.7 1.05L12 8.8v1.45" />
      <path className="gs-category-icon-wash" d="m12 10.25 8 5.2a1.35 1.35 0 0 1-.75 2.5H4.75a1.35 1.35 0 0 1-.75-2.5l8-5.2Z" />
    </>,
    food: <>
      <path d="m9 4.5 8.8 4M6.5 7l11.3 1.5" />
      <path className="gs-category-icon-wash" d="M3.5 11.5h17c-.55 4.25-3.25 6.75-8.5 6.75s-7.95-2.5-8.5-6.75Z" />
      <path d="M8.5 20h7" />
    </>,
    living: <>
      <path className="gs-category-icon-wash" d="M6 11.5v-5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5v5M6 13h12v4.5H6Z" />
      <path d="M6 15v-3.5a1.5 1.5 0 0 0-3 0V16A2.5 2.5 0 0 0 5.5 18.5h13A2.5 2.5 0 0 0 21 16v-4.5a1.5 1.5 0 0 0-3 0V15M6 18.5V21m12-2.5V21" />
    </>,
    beauty: <>
      <rect className="gs-category-icon-wash" x="5" y="3" width="14" height="13.5" rx="6.5" />
      <path d="m8.5 7.5 3-2M12 16.5V21m-4 0h8" />
    </>,
  };
  return <svg className="gs-category-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[category]}</svg>;
}

/** A flat room outline with a small window and a doorway, without a roof. */
function RoomIcon() {
  return <svg className="gs-category-icon gs-room-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3.5 3.5h17v17h-17Z" />
    <path d="M14 20.5v-7h4v7" />
    <path fill="currentColor" stroke="none" d="M6.5 6.5h2v2h-2Zm3 0h2v2h-2Zm-3 3h2v2h-2Zm3 0h2v2h-2Z" />
  </svg>;
}

export default function CategoryNav({ activeCategory }: { activeCategory: NavigationKey }) {
  // Main Room uses its objects as navigation, never the category-only bar.
  if (activeCategory === 'room') return null;
  return <nav className="gs-category-nav" aria-label="카테고리와 내 공간">
    {NAVIGATION_ORDER.map(destination => {
      const route = destination === 'room' ? { href: '/', label: '내 공간' } : CATEGORY_ROUTES[destination];
      // Preserve current-page filters, selection and scroll on a repeated tap.
      // Other destinations retain native navigation and the room's normal lifecycle.
      return <a key={destination} href={route.href} className={`gs-category-nav-item${destination === 'room' ? ' gs-room-nav-item' : ''}`} data-destination={destination} aria-label={destination === 'room' ? '내 공간으로 돌아가기' : undefined} aria-current={activeCategory === destination ? 'page' : undefined} onClick={event => { if (destination === activeCategory) event.preventDefault(); }}>
        <span className="gs-category-nav-icon-slot">{destination === 'room' ? <span className="gs-room-nav-mark"><RoomIcon /></span> : <CategoryIcon category={destination} />}</span>
        <span className="gs-category-nav-label">{route.label}</span>
      </a>;
    })}
  </nav>;
}
