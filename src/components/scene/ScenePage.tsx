'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DemoHome, Purchase } from '../../types/home';
import { demoStateKey, applyOwnedOutfit, readDemoState, updateDemoState, type DemoState } from '../../../app/demo-state.js';
import { getOutfitAppearance } from '../../../app/outfit-rendering.js';
import type { AvatarOutfit } from '../../../app/avatar.js';
import { activePersonaId } from '../../../app/demo-persona.js';
import type { SceneCategory } from '../../types/scene';
import type { DisplayProduct } from '../../types/catalog';
import { useRealCart } from '../commerce/useRealCart';
import { CommerceStatus, CartQuantity } from '../commerce/CommerceControls';
import RoomAvatar from './RoomAvatar';
import LivingOwnedProducts from './LivingOwnedProducts';
import ProductArtwork from '../ProductArtwork';
import { ProductImageModeProvider, ProductImageToggle, useProductImageMode } from '../ProductImageMode';
import { getCategoryProducts, getHeroProducts } from '../../../app/category-products.js';
import CategoryNav from '../navigation/CategoryNav';
import RecommendationPanel from '../recommendation/RecommendationPanel';
import './scene.css';

const CONFIG = {
  fashion: {
    title: '내 옷장', english: 'MY WARDROBE',
    room: 'wardrobe-room.png',
  },
  living: {
    title: '내 거실', english: 'MY LIVING ROOM',
    room: 'living-room.png',
  },
} as const;
const money = (value: number) => value.toLocaleString('ko-KR');
const withParticle = (name: string) => (name.charCodeAt(name.length - 1) - 0xac00) % 28 ? '과' : '와';
type Item = Purchase | DisplayProduct;
type Dressing = { productId: string; art: AvatarOutfit; sequence: number; target: { x: number; bottom: number } };
type Panel = 'owned' | 'cart' | 'saved' | 'product' | null;

function Icon({ name, size = 20 }: { name: 'back' | 'bag' | 'heart' | 'home' | 'arrow' | 'sliders' | 'check' | 'close'; size?: number }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1C-.5 9 5.5 15 12 20c6.5-5 12.5-11 8.5-15.2Z" />,
    home: <><path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    sliders: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ProductVisual({ item }: { item: Item }) {
  return <ProductArtwork asset={item.gameAsset} name={item.name} productId={item.id} photoUrl={item.imageKind === 'product-photo' ? item.imageUrl : undefined} />;
}

function Dialog({ title, viewKey, onClose, children }: { title: string; viewKey: string; onClose: () => void; children: ReactNode }) {
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
    ref.current.querySelector<HTMLElement>('#sc-dialog-title')?.focus({ preventScroll: true });
  }, [viewKey]);
  return <dialog ref={ref} className="sc-dialog" aria-labelledby="sc-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sc-dialog-inner">
      <div className="sc-dialog-head"><h2 id="sc-dialog-title" tabIndex={-1}>{title}</h2><button className="sc-icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></div>
      {children}
    </div>
  </dialog>;
}

export default function ScenePage({ category }: { category: SceneCategory }) {
  return <ProductImageModeProvider key={category}><SceneContent category={category} /></ProductImageModeProvider>;
}

function SceneContent({ category }: { category: SceneCategory }) {
  const { showProductPhotos } = useProductImageMode();
  const config = CONFIG[category];
  const [home, setHome] = useState<DemoHome | null>(null);
  const commerce = useRealCart(category, home?.user.id);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'owned' | 'cart'>('owned');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [confirmedState, setConfirmedState] = useState<DemoState | null>(null);
  const [dressing, setDressing] = useState<Dressing | null>(null);
  const dressingRef = useRef<Dressing | null>(null);
  const outfitSequence = useRef(0);
  const roomRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const [interactionKey, setInteractionKey] = useState(0);
  const [seated, setSeated] = useState(false);
  const [lampPreview, setLampPreview] = useState<boolean | null>(null);
  const [previewSequence, setPreviewSequence] = useState(0);
  const collectionRef = useRef<HTMLElement>(null);
  const previewFocus = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10000);
    let mounted = true;
    setError(false);
    setHome(null); setConfirmedState(null);
    cancelDressing(); setLampPreview(null); setSeated(false);
    async function load() {
      try {
        const response = await fetch('/api/demo/home', { signal: abort.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Scene unavailable');
        const homeData: DemoHome = await response.json();
        if (!Array.isArray(homeData.purchases) || !homeData.user?.name) throw new Error('Invalid home');
        if (!mounted) return;
        setConfirmedState(readDemoState(homeData));
        setHome(homeData);
        setSelectedId(null);
      } catch { if (mounted) setError(true); }
      finally { clearTimeout(timeout); }
    }
    load();
    return () => { mounted = false; abort.abort(); clearTimeout(timeout); };
  }, [category, attempt]);

  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timeout); }, [notice]);

  useEffect(() => {
    if (!home) return;
    const restore = () => {
      if (home.personas && activePersonaId() !== home.user.id) { window.location.reload(); return; }
      cancelDressing();
      setConfirmedState(readDemoState(home));
    };
    const onStorage = (event: StorageEvent) => { if (event.key === demoStateKey(home) || event.key === null) restore(); };
    const onPageShow = () => { restore(); cancelDressing(); setLampPreview(null); setSeated(false); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow); window.addEventListener('focus', restore);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('pageshow', onPageShow); window.removeEventListener('focus', restore); };
  }, [home]);

  useEffect(() => {
    // The shared selector moves the applied garment first. Reveal that first
    // card after React has reordered it, rather than retaining the old offset.
    if (category === 'fashion' && tab === 'owned') inventoryRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [category, tab, confirmedState?.outfitId]);

  const collection = home?.categories?.[category];
  const purchases = getCategoryProducts(collection, confirmedState).map(entry => entry.product);
  const heroEntries = getHeroProducts(collection, confirmedState);
  const dressingProduct = purchases.find(product => product.id === dressing?.productId);
  const currentOutfit = purchases.find(product => product.id === confirmedState?.outfitId);
  const lampLit = lampPreview ?? confirmedState?.lampOn ?? false;
  const cart = commerce.cartProducts;
  const saved = commerce.savedProducts;
  const rail: Item[] = tab === 'owned' ? purchases : cart;
  const anchor: Item | null = rail.find(product => product.id === selectedId) || null;
  const detail = commerce.products.find(product => product.id === detailId);
  useEffect(() => {
    if (panel || !previewFocus.current) return;
    previewFocus.current = false;
    const frame = requestAnimationFrame(() => {
      collectionRef.current?.focus({ preventScroll: true });
      const roomBounds = roomRef.current?.getBoundingClientRect();
      // Keep an already-visible wardrobe still while changing. In a long product
      // list, bring the action into view once, without a competing smooth scroll.
      if (dressingRef.current) {
        if (roomBounds && (roomBounds.top < 0 || roomBounds.bottom > window.innerHeight - 88)) collectionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else collectionRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [previewSequence, panel]);

  function cancelDressing() {
    dressingRef.current = null;
    setDressing(null);
  }

  function finishDressing(sequence: number) {
    const command = dressingRef.current;
    if (!command || command.sequence !== sequence || !home || !confirmedState) return;
    if (home.personas && activePersonaId() !== home.user.id) { cancelDressing(); return; }
    // Only this completed, still-current explicit Wear action may commit a product ID.
    const { state: next, saved: stored } = updateDemoState(home, confirmedState, latest => applyOwnedOutfit(home, latest, command.productId));
    cancelDressing();
    if (!stored) {
      setNotice('착장을 저장하지 못했어요. 기존 착장으로 돌아가요.');
      return;
    }
    setConfirmedState(next);
    setNotice('갈아입었어요. 내 공간에서도 이 옷을 입고 있어요.');
  }

  useEffect(() => {
    const stop = () => { dressingRef.current = null; setDressing(null); };
    const hidden = () => { if (document.hidden) stop(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') stop(); };
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('keydown', escape);
    window.addEventListener('pagehide', stop);
    return () => {
      dressingRef.current = null;
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  function choose(item: Item, source: 'owned' | 'cart') {
    setSelectedId(item.id); setTab(source);
    cancelDressing();
    if (category !== 'fashion' || source !== 'owned' || !home || !confirmedState) return;
    const owned = purchases.find(product => product.id === item.id);
    const appearance = getOutfitAppearance(owned);
    if (!appearance) { setNotice('이 상품은 캐릭터 착장을 준비 중이에요. 함께 입을 상품은 살펴볼 수 있어요.'); return; }
    if (confirmedState.outfitId === item.id) { setNotice('지금 입고 있는 옷이에요.'); return; }
    const room = roomRef.current;
    const garment = [...(room?.querySelectorAll<HTMLElement>('[data-hero-product-id]') ?? [])].find(element => element.dataset.heroProductId === item.id);
    const roomBounds = room?.getBoundingClientRect(), itemBounds = garment?.getBoundingClientRect();
    const target = { x: roomBounds?.width && itemBounds ? (itemBounds.left + itemBounds.width / 2 - roomBounds.left) / roomBounds.width * 100 : 49, bottom: 3 };
    const command: Dressing = { productId: item.id, art: appearance.key, sequence: ++outfitSequence.current, target };
    dressingRef.current = command;
    setDressing(command); setInteractionKey(command.sequence);
    previewFocus.current = true; setPreviewSequence(value => value + 1);
  }
  function changeTab(next: 'owned' | 'cart') { setTab(next); setSelectedId(null); cancelDressing(); }
  function ownedActionLabel(product: Purchase) {
    return category !== 'fashion' ? '이 상품과 조합하기' : confirmedState?.outfitId === product.id ? '입고 있어요' : getOutfitAppearance(product) ? '입기' : '착장 준비 중 · 조합하기';
  }
  async function addCart(id: string) {
    if (commerce.cartIds.includes(id)) { setPanel('cart'); return; }
    if (await commerce.addCart(id)) setNotice('장바구니에 담았어요.');
  }
  function updateQuantity(id: string, quantity: number) {
    commerce.updateQuantity(id, quantity);
    if (!quantity && selectedId === id) setSelectedId(null);
  }
  function removeDialogItem(id: string) {
    if (panel === 'cart') updateQuantity(id, 0); else void commerce.toggleSaved(id);
    requestAnimationFrame(() => document.getElementById('sc-dialog-title')?.focus({ preventScroll: true }));
  }
  return <main className={`sc-page sc-${category}`}>
    <header className="sc-header">
      <span className="sc-brand">G:Scene<span>.</span></span>
      <div className="sc-header-actions">
        <button className="sc-icon-button" aria-label={`찜한 상품 ${saved.length}개`} onClick={() => setPanel('saved')}><Icon name="heart" /></button>
        <button className="sc-icon-button sc-bag" aria-label={`장바구니 ${commerce.count}개`} onClick={() => setPanel('cart')}><Icon name="bag" /><span>{commerce.count}</span></button>
      </div>
    </header>
    {!home ? <section className="sc-load" role="status"><span className="sc-kicker">YOUR NEXT SCENE</span><h1>{error ? '공간을 불러오지 못했어요' : '나의 공간을 준비하고 있어요'}</h1><p>{error ? '연결을 확인한 뒤 다시 시도해 주세요.' : '구매한 물건과 새로운 취향을 연결하는 중'}</p>{error && <button className="sc-primary" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}</section> : <>
      <div className="sc-heading"><div><span className="sc-room-number">{category === 'fashion' ? '01' : '02'}</span><h1>{config.title}</h1></div><span className="sc-person">{home.user.name}의 작은 취향 공간</span></div>
      <ProductImageToggle />
      <div className="sc-layout">
        <div className="sc-context">
          <section ref={collectionRef} tabIndex={-1} id="sc-room-preview" className="sc-collection" aria-label={`구매한 상품이 있는 ${config.title}`}>
            <div className="sc-room-hud"><span><i />{config.english}</span>{category === 'living' ? <div className="sc-room-controls"><button aria-pressed={lampLit} onClick={() => setLampPreview(!lampLit)}>{lampLit ? '조명 끄기 체험' : '조명 켜기 체험'}</button><button aria-pressed={seated} onClick={() => setSeated(value => !value)}>{seated ? '↟ 일어나기' : '⌑ 소파 앉기'}</button></div> : dressing ? <button className="sc-outfit-reset" onClick={cancelDressing}>갈아입기 취소</button> : <span>MY ITEMS <b>{String(purchases.length).padStart(2, '0')}</b></span>}</div>
            <div ref={roomRef} className={`sc-room ${lampLit ? 'sc-light-on' : ''}`} data-hero-category={category} data-hero-source="category-collection">
              <img className="sc-room-art" src={`/scene-art/${config.room}`} alt={category === 'fashion' ? '메인 공간과 이어지는 아늑한 픽셀 옷장' : '소파와 우드 가구가 있는 아늑한 픽셀 거실'} />
              {category === 'living' && <LivingOwnedProducts entries={heroEntries} selectedId={tab === 'owned' ? selectedId : null} lit={lampLit} onSelect={product => choose(product, 'owned')} />}
              {category === 'living' && heroEntries.some(entry => entry.presentationRole === 'lamp') && <span className="sc-room-light" aria-hidden="true" />}
              {category === 'fashion' && <div className="sc-wardrobe-owned" aria-label="내가 보유한 의류 옷걸이">
                {heroEntries.map(entry => <button key={entry.id} className="sc-wardrobe-garment" data-hero-product-id={entry.id} data-wearing={entry.status === 'applied'} aria-label={`${entry.product.name} ${ownedActionLabel(entry.product)}`} aria-pressed={selectedId === entry.id && tab === 'owned'} onClick={() => choose(entry.product, 'owned')}>
                  {entry.artVisible && <ProductArtwork asset={entry.product.gameAsset} name={entry.product.name} className="sc-wardrobe-asset" productId={entry.id} photoUrl={entry.imageUrl} />}
                  <span>{entry.displayIndex}{entry.status === 'applied' && <i aria-hidden="true">✓</i>}</span>
                </button>)}
              </div>}
              <RoomAvatar home={home} confirmedState={confirmedState ?? undefined} category={category} outfitPreview={dressing?.art ?? null} garmentTarget={dressing?.target} onOutfitComplete={finishDressing} seated={seated} interactionKey={interactionKey} />
              <span className="sc-room-footnote">{category === 'fashion' ? dressing ? '갈아입는 중 · 취소할 수 있어요' : '내 옷을 눌러 갈아입어요' : '번호를 눌러 조합해보세요'}</span>
            </div>
            {category === 'fashion' && <div className="sc-outfit-status" role="status" data-current-outfit-id={confirmedState?.outfitId ?? 'base'}><span><b>{dressing ? '갈아입는 중' : '현재 착장'}</b> {dressingProduct?.name ?? currentOutfit?.name ?? '기본 옷'}</span>{dressing && <button onClick={cancelDressing}>취소</button>}</div>}
            {category === 'living' && lampPreview !== null && <div className="sc-confirmed-preview" aria-live="polite"><span><b>조명 미리보기</b> 내 공간의 조명 상태는 유지돼요.</span><button onClick={() => setLampPreview(null)}>미리보기 취소</button></div>}
            <p className="sc-ownership-note">가상 고객의 구매 목록 · 실상품 카탈로그 참고가<br />{showProductPhotos ? '상품은 실제 사진이며, 공간 배경은 연출 이미지예요.' : '공간 그림은 상품의 정확한 외형이나 가상 피팅이 아니에요.'}</p>

            <div className="sc-inventory-head"><div className="sc-tabs" role="group" aria-label="추천 기준 상품 목록"><button aria-pressed={tab === 'owned'} onClick={() => changeTab('owned')}>구매한 상품 <span>{purchases.length}</span></button><button aria-pressed={tab === 'cart'} onClick={() => changeTab('cart')}>장바구니 <span>{cart.length}</span></button></div><button className="sc-text-button" onClick={() => setPanel(tab)}>전체 보기 ↗</button></div>
            <div ref={inventoryRef} className="sc-inventory-rail">
              {rail.map((product, index) => <button key={product.id} className="sc-owned-item" title={product.name} aria-label={tab === 'owned' ? `${product.name} ${ownedActionLabel(product as Purchase)}` : undefined} aria-pressed={selectedId === product.id} onClick={() => choose(product, tab)}><span className="sc-owned-photo"><ProductVisual item={product} />{tab === 'owned' && <span className="sc-item-index">{index + 1}</span>}{selectedId === product.id && <span className="sc-selected-check"><Icon name="check" size={12} /></span>}</span><span className="sc-owned-name">{product.name}</span>{tab === 'owned' && <small>{category === 'fashion' ? ownedActionLabel(product as Purchase) : `${money(product.price)}원 참고가`}</small>}</button>)}
              <button className="sc-owned-item sc-new-item" aria-pressed={!anchor} onClick={() => setSelectedId(null)}><span className="sc-owned-photo"><span>＋</span></span><span>새롭게 둘러보기</span></button>
            </div>
            <div className="sc-anchor-caption" aria-live="polite"><span className="sc-small-star" aria-hidden="true">＋</span>{anchor ? <p><b>{anchor.name}</b>{withParticle(anchor.name)} {category === 'fashion' ? '함께 입기' : '함께 놓기'}</p> : <p>내 물건과 상관없이 <b>새로운 취향 찾기</b></p>}<span className="sc-anchor-arrow" aria-hidden="true">↓</span></div>
          </section>
        </div>

        <div>
          <CommerceStatus loading={commerce.loading} error={commerce.error} storageError={commerce.storageError} retry={commerce.retry} />
          <RecommendationPanel domain={category} userId={home.user.id} anchorProductId={anchor?.id} anchorProductName={anchor?.name} purchasedProductIds={purchases.map(product => product.id)} cartProductIds={commerce.cartIds} onAddToCart={addCart} onViewCart={() => setPanel('cart')} pendingProductId={commerce.pendingProductId} cartReady={commerce.ready && !commerce.loading} />
        </div>
      </div>
    </>}
    {!home && error && <RecommendationPanel domain={category} />}
    <CategoryNav activeCategory={category} />
    {notice && <div className="sc-toast" role="status">{notice}</div>}
    {panel && <Dialog viewKey={`${panel}:${panel === 'product' ? detailId : ''}`} title={panel === 'product' ? '상품 자세히 보기' : panel === 'owned' ? `나의 구매 상품 ${purchases.length}` : panel === 'saved' ? `찜한 상품 ${saved.length}` : `장바구니 ${commerce.count}`} onClose={() => setPanel(null)}>
      <CommerceStatus loading={commerce.loading} error={commerce.error} storageError={commerce.storageError} retry={commerce.retry} />
      {panel === 'product' && detail ? <><div className="sc-detail-image"><ProductVisual item={detail} /></div><div className="sc-detail-copy"><span className="sc-kicker">{[detail.brd_mn, detail.cate2_nm].filter(Boolean).join(' · ')}</span><h3>{detail.name}</h3><strong className="sc-detail-price">{money(detail.price)}원</strong><p className="sc-demo-note">실상품 카탈로그 참고가 · 실제 주문은 진행되지 않아요.</p><button className="sc-primary" disabled={!commerce.ready || commerce.loading || !!commerce.pendingProductId} onClick={() => void addCart(detail.id)}>{commerce.pendingProductId === detail.id ? '상품 확인 중…' : commerce.cartIds.includes(detail.id) ? '담은 상품 보기' : '장바구니 담기'}<Icon name="bag" size={18} /></button><button className="sc-outline sc-cart-save" disabled={!commerce.ready || commerce.loading || !!commerce.pendingProductId} aria-pressed={commerce.state.savedProductIds.includes(detail.id)} onClick={() => void commerce.toggleSaved(detail.id)}>{commerce.state.savedProductIds.includes(detail.id) ? '찜 해제' : '상품 찜하기'}</button></div></> : panel === 'product' ? <p>상품 정보를 찾을 수 없어요.</p> : <>
        <p className="sc-dialog-description">{panel === 'owned' ? `선택한 캐릭터의 가상 구매 이력이에요. 이름·참고가는 실상품 기준이며 ${showProductPhotos ? '실제 상품 사진을 보고 있어요.' : '이미지는 공간의 무드에 맞춘 그림이에요.'}` : panel === 'cart' ? '아직 구매하지 않은 물건이에요. 함께 어울릴 상품도 찾아보세요.' : '마음에 든 상품을 모아뒀어요.'}</p>
        {(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).length === 0 && <div className="sc-empty"><Icon name={panel === 'saved' ? 'heart' : 'bag'} size={32} /><h3>{panel === 'saved' ? '마음에 드는 상품을 찜해보세요' : '아직 담아둔 상품이 없어요'}</h3><button className="sc-outline" onClick={() => setPanel(null)}>상품 둘러보기</button></div>}
        <div className="sc-dialog-list">{(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).map(product => <div className="sc-dialog-item" key={product.id}><div className="sc-dialog-thumb"><ProductVisual item={product} /></div><div><h3>{product.name}</h3><p>{'purchasedAt' in product ? `${product.purchasedAt} 가상 구매 · 카탈로그 참고가 ${money(product.price)}원` : `카탈로그 참고가 ${money(product.price)}원`}</p><button className="sc-text-button" onClick={() => { if (panel !== 'owned') { setDetailId(product.id); setPanel('product'); } else { choose(product, panel === 'owned' ? 'owned' : 'cart'); setPanel(null); } }}>{panel === 'owned' ? `${ownedActionLabel(product as Purchase)} ↗` : '상품 자세히 보기 ↗'}</button>{panel === 'cart' && <CartQuantity disabled={!commerce.ready || commerce.loading} name={product.name} quantity={commerce.state.cart.find(line => line.productId === product.id)?.quantity ?? 1} onChange={quantity => updateQuantity(product.id, quantity)} />}</div>{panel !== 'owned' && <button className="sc-icon-button" aria-label={`${product.name} ${panel === 'cart' ? '장바구니에서 삭제' : '찜 해제'}`} onClick={() => removeDialogItem(product.id)}><Icon name="close" size={16} /></button>}</div>)}</div>
        {panel === 'cart' && <div className="sc-cart-total"><span>상품금액 합계</span><strong>{money(commerce.total)}원</strong><small>카탈로그 참고가 · 배송비 별도 · 실제 주문은 진행되지 않아요.</small></div>}
      </>}
    </Dialog>}
  </main>;
}
