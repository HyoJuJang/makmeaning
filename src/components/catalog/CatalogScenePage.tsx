'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CatalogCategory, DemoCatalog, DisplayProduct } from '../../types/catalog';
import { useRealCart } from '../commerce/useRealCart';
import { CommerceStatus, CartQuantity } from '../commerce/CommerceControls';
import {demoStateKey, readDemoState, type DemoState} from '../../../app/demo-state.js';
import { activePersonaId } from '../../../app/demo-persona.js';
import RoomAvatar from '../scene/RoomAvatar';
import { GameItemSprite } from '../GameItemSprite';
import ProductArtwork from '../ProductArtwork';
import { ProductImageModeProvider, ProductImageToggle, useProductImageMode } from '../ProductImageMode';
import { catalogRoomItems } from '../../lib/catalog-room';
import CategoryNav from '../navigation/CategoryNav';
import RecommendationPanel from '../recommendation/RecommendationPanel';
import '../scene/scene.css';
import './catalog.css';

const CONFIG = {
  food: { title: '내 주방', english: 'MY KITCHEN', number: '03', label: '식품', room: '/catalog-art/food-room.svg', roomAlt: '냉장고와 조리대, 팬트리가 있는 픽셀 주방', homeX: 57, targets: [22, 42, 77] },
  beauty: { title: '내 화장대', english: 'MY VANITY', number: '04', label: '뷰티', room: '/catalog-art/beauty-room.svg', roomAlt: '거울과 화장품 선반이 있는 픽셀 화장대', homeX: 25, targets: [47, 72] },
} as const;
type Panel = 'owned' | 'cart' | 'saved' | 'product' | null;
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;

function Icon({ name, size = 20 }: { name: 'back' | 'bag' | 'heart' | 'home' | 'arrow' | 'check' | 'close'; size?: number }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1C-.5 9 5.5 15 12 20c6.5-5 12.5-11 8.5-15.2Z" />,
    home: <path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function ProductVisual({ product }: { product: DisplayProduct }) {
  const { showProductPhotos } = useProductImageMode();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (showProductPhotos || product.gameAsset || product.catalogSource === 'shared-products') return <ProductArtwork asset={product.gameAsset} photoUrl={product.catalogSource === 'shared-products' && product.imageKind === 'product-photo' ? product.imageUrl : undefined} name={product.name} productId={product.id} />;
  if (failedUrl === product.imageUrl) return <span className="sc-product-visual" role="img" aria-label={`${product.name} 사진을 불러오지 못했어요`} style={{ display: 'grid', placeItems: 'center', fontSize: 11, color: '#68775e' }}>사진 준비 중</span>;
  return <img className="sc-product-visual" src={product.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(product.imageUrl)} />;
}
function CatalogDialog({ title, viewKey, onClose, children }: { title: string; viewKey: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = 0;
    ref.current.querySelector<HTMLElement>('#catalog-dialog-title')?.focus({ preventScroll: true });
  }, [viewKey]);
  return <dialog ref={ref} className="sc-dialog" aria-labelledby="catalog-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sc-dialog-inner"><div className="sc-dialog-head"><h2 id="catalog-dialog-title" tabIndex={-1}>{title}</h2><button className="sc-icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></div>{children}</div>
  </dialog>;
}

/** Food and beauty share room presentation and recommendations for the selected product. */
export default function CatalogScenePage({ category }: { category: CatalogCategory }) {
  return <ProductImageModeProvider key={category}><CatalogSceneContent category={category} /></ProductImageModeProvider>;
}

function CatalogSceneContent({ category }: { category: CatalogCategory }) {
  const { showProductPhotos } = useProductImageMode();
  const config = CONFIG[category];
  const [data, setData] = useState<DemoCatalog | null>(null);
  const [confirmed, setConfirmed] = useState<DemoState | null>(null);
  const commerce = useRealCart(category, data?.user.id);
  const state = commerce.state;
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'owned' | 'cart'>('owned');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [interaction, setInteraction] = useState({ x: config.homeX as number, key: 0 });
  const roomRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeFocus = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let mounted = true;
    setError(false); setData(null); setConfirmed(null); setSelectedId(null); setPanel(null); setTab('owned');
    fetch(`/api/demo/${category}`, { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then((catalog: DemoCatalog) => {
        if (!mounted) return;
        if (catalog.category !== category || !Array.isArray(catalog.products) || !Array.isArray(catalog.purchases) || !catalog.user?.id) throw new Error('Invalid catalog');
        setData(catalog); setConfirmed(readDemoState(catalog.home));
      }).catch(() => { if (mounted) setError(true); })
      .finally(() => clearTimeout(timer));
    return () => { mounted = false; controller.abort(); clearTimeout(timer); };
  }, [category, attempt]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (panel || !closeFocus.current) return;
    closeFocus.current = false;
    const frame = requestAnimationFrame(() => {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
      else roomRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [panel]);

  useEffect(() => {
    if (!data) return;
    const restore = () => {
      if (data.home.personas && activePersonaId() !== data.user.id) { window.location.reload(); return; }
      setConfirmed(readDemoState(data.home));
    };
    const storage = (event: StorageEvent) => { if (event.key === demoStateKey(data.home) || event.key === null) restore(); };
    window.addEventListener('pageshow', restore); window.addEventListener('focus', restore); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('pageshow', restore); window.removeEventListener('focus', restore); window.removeEventListener('storage', storage); };
  }, [data]);
  function ownedStatus(id: string) {
    if (!data?.home.purchases.some(item => item.id === id)) return '';
    return category === 'food' ? `데모 잔량 ${confirmed?.foodQuantity[id] ?? data.home.purchases.find(item => item.id === id)?.state.quantity ?? 0}회` : confirmed?.featuredBeautyId === id ? '화장대에 꺼내두었어요' : '화장대에 함께 있어요';
  }

  const purchases = data?.purchases.flatMap(purchase => {
    const product = data.products.find(item => item.id === purchase.productId);
    return product ? [product] : [];
  }) ?? [];
  const cartProducts = commerce.cartProducts;
  const saved = commerce.savedProducts;
  const rail = tab === 'owned' ? purchases : cartProducts;
  const anchor = rail.find(product => product.id === selectedId);
  const detail = commerce.products.find(product => product.id === detailId) ?? data?.products.find(product => product.id === detailId);
  const cartCount = commerce.count;
  const roomItems = data ? catalogRoomItems(data, confirmed) : [];

  function openPanel(next: Panel, productId?: string) {
    if (!panel) returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (productId) setDetailId(productId);
    setPanel(next);
  }
  function closePanel() { closeFocus.current = true; setPanel(null); }
  function moveTo(x: number) { setInteraction(previous => ({ x, key: previous.key + 1 })); }
  function choose(product: DisplayProduct, source: 'owned' | 'cart') {
    setTab(source); setSelectedId(product.id);
    const roomItem = roomItems.find(item => item.product.id === product.id);
    // Only purchase markers represent a place in the room. Cart selection never implies possession.
    moveTo(source === 'owned' && roomItem ? roomItem.placement.approachX : config.homeX);
    if (panel) { returnFocusRef.current = roomRef.current; closePanel(); }
  }
  function clearSelection() { setSelectedId(null); moveTo(config.homeX); }
  function changeTab(next: 'owned' | 'cart') { setTab(next); clearSelection(); }
  async function addCart(productId: string) {
    if (commerce.cartIds.includes(productId)) { openPanel('cart'); return; }
    if (await commerce.addCart(productId)) setNotice('장바구니에 담았어요.');
  }
  function updateQuantity(productId: string, quantity: number) {
    commerce.updateQuantity(productId, quantity);
    if (quantity === 0 && tab === 'cart' && selectedId === productId) clearSelection();
  }
  function toggleSaved(productId: string) { void commerce.toggleSaved(productId); }
  function focusDialogTitle() { requestAnimationFrame(() => document.getElementById('catalog-dialog-title')?.focus({ preventScroll: true })); }

  return <main className={`sc-page sc-${category} catalog-page`}>
    <header className="sc-header"><span className="sc-brand">G:Scene<span>.</span></span><div className="sc-header-actions"><button className="sc-icon-button" aria-label={`찜한 상품 ${saved.length}개`} onClick={() => openPanel('saved')}><Icon name="heart" /></button><button className="sc-icon-button sc-bag" aria-label={`장바구니 ${cartCount}개`} onClick={() => openPanel('cart')}><Icon name="bag" /><span>{cartCount}</span></button></div></header>
    {!data ? <section className="sc-load" role={error ? 'alert' : 'status'}><span className="sc-kicker">{config.english}</span><h1>{error ? '공간을 불러오지 못했어요' : '나의 공간을 준비하고 있어요'}</h1><p>{error ? '연결을 확인한 뒤 다시 시도해 주세요.' : '구매한 상품을 살펴보는 중이에요.'}</p>{error && <button className="sc-primary" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}</section> : <>
      <div className="sc-heading"><div><span className="sc-room-number">{config.number}</span><h1>{config.title}</h1></div><span className="sc-person">{data.user.name}의 작은 취향 공간</span></div>
      <ProductImageToggle />
      <section ref={roomRef} tabIndex={-1} className="sc-collection" aria-label={`${config.title}의 구매 상품`}>
        <div className="sc-room-hud"><span><i />{config.english}</span><div className="sc-room-controls"><button onClick={clearSelection} aria-label="캐릭터 제자리로">↶ 제자리로</button></div></div>
        <div className="sc-room catalog-room" data-hero-category={category} data-hero-source="category-collection" style={{ '--catalog-avatar-x': interaction.x, '--catalog-avatar-bottom': 4 } as CSSProperties}>
          <img className="sc-room-art" src={config.room} alt={config.roomAlt} width="900" height="300" />
          <svg className="catalog-owned-layer" viewBox="0 0 450 150" aria-hidden="true">
            {category === 'food' && <g><path d="M68 29h39v79H68Z" fill="#81917a" stroke="#64735b" /><path d="M71 32h33v73H71Z" fill="#c9d6bc" /><path d="M69 65h37v3H69ZM69 105h37v3H69Z" fill="#e9edda" /></g>}
            {roomItems.map(({ entry, product, placement, visible }) => <g key={entry.id} data-hero-product-id={entry.id} data-hero-status={entry.status}>
              {visible && <GameItemSprite asset={entry.product.gameAsset} photoUrl={product.imageKind === 'product-photo' ? product.imageUrl : undefined} name={product.name} x={placement.art.x} y={placement.art.y} width={placement.art.width} height={placement.art.height} productId={entry.id} />}
            </g>)}
          </svg>
          <RoomAvatar home={data.home} confirmedState={confirmed ?? undefined} fallbackAvatarId={data.user.avatarId} fallbackOutfitId={data.initialOutfitId} category="living" seated={false} interactionKey={interaction.key} />
          {roomItems.map(({ entry, product, placement }) => <button key={product.id} className="sc-room-pin catalog-owned-pin" style={{ left: `${placement.pin.x / 4.5}%`, top: `${placement.pin.y / 1.5}%` }} aria-label={`${product.name} 살펴보기`} aria-pressed={selectedId === product.id && tab === 'owned'} onClick={() => choose(product, 'owned')}><span>{purchases.findIndex(item => item.id === entry.id) + 1}</span></button>)}
          <span className="sc-room-footnote">구매 상품을 눌러 살펴보세요</span>
        </div>
        <div className="sc-inventory-head"><div className="sc-tabs" role="group" aria-label="내 상품 목록"><button aria-pressed={tab === 'owned'} onClick={() => changeTab('owned')}>구매한 상품 <span>{purchases.length}</span></button><button aria-pressed={tab === 'cart'} onClick={() => changeTab('cart')}>장바구니 <span>{cartProducts.length}</span></button></div><button className="sc-text-button" onClick={() => openPanel(tab)}>전체 보기 ↗</button></div>
        <div className="sc-inventory-rail">{rail.map((product, index) => <button key={product.id} className="sc-owned-item" title={product.name} aria-pressed={selectedId === product.id} onClick={() => choose(product, tab)}><span className="sc-owned-photo"><ProductVisual product={product} />{tab === 'owned' && <span className="sc-item-index">{index + 1}</span>}{selectedId === product.id && <span className="sc-selected-check"><Icon name="check" size={12} /></span>}</span><span className="sc-owned-name">{product.name}</span>{tab === 'owned' && <small className="catalog-owned-status">{ownedStatus(product.id)}</small>}</button>)}<button className="sc-owned-item sc-new-item" aria-pressed={!anchor} onClick={clearSelection}><span className="sc-owned-photo"><span>＋</span></span><span>새롭게 둘러보기</span></button></div>
        <div className="sc-anchor-caption" aria-live="polite"><span className="sc-small-star" aria-hidden="true">＋</span>{anchor ? <p><b>{anchor.name}</b><small>{tab === 'owned' ? `가상 보유 · ${ownedStatus(anchor.id)}` : '장바구니 상품 · 아직 구매 전이에요'}</small></p> : <p>{rail.length ? '상품을 골라 자세히 살펴보세요.' : tab === 'owned' ? '구매 기록이 없어도 상품을 둘러볼 수 있어요.' : '아직 장바구니에 담긴 상품이 없어요.'}</p>}{anchor && <button className="sc-text-button" onClick={() => openPanel('product', anchor.id)}>상품 보기 ↗</button>}</div>
      </section>
      <p className="sc-demo-note catalog-state-note">가상 보유 상태는 선택한 캐릭터의 내 공간과 연결돼요. 공간 배경은 연출 이미지예요.{category === 'food' && <><br />데모 잔량은 사용 횟수이며 상품의 포장 수량·재고와 달라요.</>}</p>
      <CommerceStatus loading={commerce.loading} error={commerce.error} storageError={commerce.storageError} retry={commerce.retry} />
      <RecommendationPanel domain={category} userId={data.user.id} anchorProductId={anchor?.id} anchorProductName={anchor?.name} purchasedProductIds={purchases.map(product => product.id)} cartProductIds={commerce.cartIds} onAddToCart={addCart} onViewCart={() => openPanel('cart')} pendingProductId={commerce.pendingProductId} cartReady={commerce.ready && !commerce.loading} />
      <p className="sc-demo-note">가상 고객의 구매·보유를 실상품에 연결한 데모예요. 실제 주문은 진행되지 않아요.</p>
    </>}
    {!data && error && <RecommendationPanel domain={category} />}
    <CategoryNav activeCategory={category} />
    {notice && !panel && <div className="sc-toast" role="status">{notice}</div>}
    {panel && data && <CatalogDialog title={panel === 'owned' ? `구매한 상품 ${purchases.length}` : panel === 'cart' ? `장바구니 ${cartCount}` : panel === 'saved' ? `찜한 상품 ${saved.length}` : '상품 자세히 보기'} viewKey={`${panel}:${detailId}`} onClose={closePanel}>
      <CommerceStatus loading={commerce.loading} error={commerce.error} storageError={commerce.storageError} retry={commerce.retry} />
      {notice && <p className="catalog-dialog-notice" role="status">{notice}</p>}
      {panel === 'product' && detail ? <><div className="sc-detail-image"><ProductVisual product={detail} /></div><div className="sc-detail-copy"><span className="sc-product-kind">{[detail.brd_mn, detail.cate3_nm || detail.cate2_nm].filter(Boolean).join(' · ')}</span><h3>{detail.name}</h3><strong className="sc-detail-price">{money(detail.price)}</strong>{data.purchases.some(item => item.productId === detail.id) && <p>{data.purchases.find(item => item.productId === detail.id)?.purchasedAt} 가상 구매 기록</p>}<p className="sc-demo-note">실상품 카탈로그 참고가<br />{showProductPhotos ? '실제 상품의 카탈로그 사진이에요. 표시된 옵션은 구매한 옵션과 다를 수 있어요.' : '공간의 무드에 맞춘 상품 이미지이며 실제 외형·옵션·가상 피팅을 보장하지 않아요.'}</p>{ownedStatus(detail.id) && <p className="catalog-owned-status">{ownedStatus(detail.id)}</p>}<button className="sc-primary" disabled={!commerce.ready || commerce.loading || !!commerce.pendingProductId} onClick={() => void addCart(detail.id)}><span>{commerce.pendingProductId === detail.id ? '상품 확인 중…' : state.cart.some(line => line.productId === detail.id) ? '담은 상품 보기' : '장바구니 담기'}</span><Icon name="bag" /></button><button className="sc-outline catalog-save" disabled={!commerce.ready || commerce.loading || !!commerce.pendingProductId} aria-pressed={state.savedProductIds.includes(detail.id)} onClick={() => toggleSaved(detail.id)}>{state.savedProductIds.includes(detail.id) ? '찜 해제' : '상품 찜하기'}</button></div></> : panel === 'product' ? <p>상품 정보를 찾을 수 없어요.</p> : <>
        <p className="sc-dialog-description">{panel === 'owned' ? '실상품에 연결한 가상 구매·보유예요. 상품을 선택하면 공간에서 살펴볼 수 있어요.' : panel === 'saved' ? '찜한 상품이에요. 장바구니와는 따로 보관해요.' : '담아둔 상품이에요. 수량을 직접 바꿀 수 있어요.'}</p>
        <div className="sc-dialog-list">{(panel === 'owned' ? purchases : panel === 'cart' ? cartProducts : saved).map(product => <article className="sc-dialog-item" key={product.id}><button className="sc-dialog-thumb" aria-label={`${product.name} ${panel === 'owned' ? '공간에서 살펴보기' : '상세 보기'}`} onClick={() => panel === 'owned' ? choose(product, 'owned') : openPanel('product', product.id)}><ProductVisual product={product} /></button><div><h3>{product.name}</h3><p>{money(product.price)}</p>{panel === 'cart' ? <CartQuantity disabled={!commerce.ready || commerce.loading} name={product.name} quantity={state.cart.find(line => line.productId === product.id)?.quantity ?? 1} onChange={quantity => updateQuantity(product.id, quantity)} /> : <button className="sc-text-button" onClick={() => panel === 'owned' ? choose(product, 'owned') : openPanel('product', product.id)}>{panel === 'owned' ? '공간에서 살펴보기' : '상품 보기'} ↗</button>}</div>{panel !== 'owned' && <button className="sc-icon-button" aria-label={`${product.shortName} ${panel === 'cart' ? '장바구니에서 삭제' : '찜 해제'}`} onClick={() => { if (panel === 'cart') updateQuantity(product.id, 0); else toggleSaved(product.id); focusDialogTitle(); }}><Icon name="close" size={16} /></button>}</article>)}</div>
        {(panel === 'owned' ? purchases : panel === 'cart' ? cartProducts : saved).length === 0 && <div className="sc-empty"><p>{panel === 'cart' ? '아직 담긴 상품이 없어요.' : panel === 'saved' ? '아직 찜한 상품이 없어요.' : '구매 기록이 아직 없어요.'}</p><button className="sc-outline" onClick={closePanel}>상품 둘러보기</button></div>}
        {panel === 'cart' && <div className="sc-cart-total"><span>상품금액 합계</span><strong>{money(commerce.total)}</strong><small>카탈로그 참고가 · 배송비 별도 · 실제 주문은 진행되지 않아요.</small></div>}
      </>}
    </CatalogDialog>}
  </main>;
}
